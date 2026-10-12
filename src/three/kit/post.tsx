/**
 * The photographic finish: multisampled HDR render, ambient occlusion, bloom
 * on the sun and lit glass, filmic tone mapping, then a display-space grade
 * (split toning, vignette, faint lens fringing, grain that doubles as dither
 * so gradients in the sky never band).
 *
 * Built to be cheap while the picture moves, without the picture changing
 * when it stops:
 *
 * - A moving frame is the scene at full resolution with 2x multisampling,
 *   ambient occlusion, the bloom (a few small passes from quarter resolution
 *   down, refreshed every other frame: a glow that wide does not show one
 *   frame of lag), and ONE full-screen pass that does tone mapping, colour
 *   space, grade and grain.
 * - The sky is not in the scene's target: the stage draws it on its own
 *   (rig.begin), at half size, and the final pass puts it behind the scene.
 *   Half the frame is sky, it has no edges to anti-alias and nothing in it
 *   as fine as a pixel.
 * - Ambient occlusion is worked out on every frame, at half the canvas's
 *   resolution. It used to exist only in the still picture, at full
 *   resolution, and tree crowns went a tenth darker (grass a twentieth) each
 *   time the page stopped scrolling. At half size it is within a grey level
 *   of the full-size result, and a moving picture and a still one now have
 *   the same.
 * - When nothing has asked for a frame for a moment, the picture settles: it
 *   is redrawn once with 4x multisampling and cross-faded in. Only edges
 *   change. A still picture then costs nothing.
 * - Resolution is never traded for speed on a machine that can draw at all.
 *   Only below about 20 frames a second, sustained, do moving frames step
 *   down once to three quarters of the canvas (`quality`). `?q=1` shows
 *   that step for QA; `?q=0` rules it out.
 *
 * Mounted by Stage when a scene asks for it; it takes over R3F's render
 * (useFrame priority 1), so it still only draws on demand. Frames that R3F
 * asks for are "moving" frames; the settle runs on its own timer and never
 * goes through R3F, so anything that invalidates the scene cancels it.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  GLSL3,
  HalfFloatType,
  Mesh,
  type Material,
  type Object3D,
  OrthographicCamera,
  RawShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { giveUp } from './gpu';

export interface Grade {
  /** Darkening toward the corners, 0–1. */
  vignette: number;
  saturation: number;
  contrast: number;
  /** Multipliers for the shadows and highlights (split toning), linear-ish rgb. */
  shadows: [number, number, number];
  highlights: [number, number, number];
  /** Film grain amplitude in display units (also dithers). */
  grain: number;
  /** Lens fringing at the edges, in uv units at the corner. */
  aberration: number;
}

export const NEUTRAL_GRADE: Grade = {
  vignette: 0.18,
  saturation: 1.04,
  contrast: 1.04,
  shadows: [1, 1, 1],
  highlights: [1, 1, 1],
  grain: 0.018,
  aberration: 0.0016,
};

/**
 * A sky to put behind the scene: its picture, and the lowest row (0–1 from
 * the bottom) that was drawn. Below that row the sky is one flat colour, so
 * the row stands in for everything under it.
 */
export interface Backdrop {
  texture: Texture;
  floor: number;
  /** How much of it is there, 0–1 (1 when left out). Less than 1 lets the page behind the canvas through. */
  amount?: number;
}

export interface PostOptions {
  /** Ambient occlusion. */
  ao?: boolean;
  /** AO radius in metres. */
  aoRadius?: number;
  aoIntensity?: number;
  bloom?: number;
  bloomThreshold?: number;
  grade?: Grade;
}

/* ------------------------------------------------------------------ */
/* Shared quality level                                                */
/* ------------------------------------------------------------------ */

/**
 * Internal resolution of a moving frame, as a fraction of the canvas. Level 0
 * is the picture as designed and is what every capable device stays on; level
 * 1 exists only so a device that cannot reach 20 fps is not left unusable.
 */
const SCALES = [1, 0.75];
/** Multisampling of a moving frame; the still picture is always 4x. */
const MOVING_SAMPLES = 2;
const STILL_SAMPLES = 4;

/**
 * One level for the whole page: what the hero learns about the device also
 * holds for the films below it. It only ever steps down during a visit; a
 * reload starts again from full resolution.
 */
export const quality = {
  level: 0,
  /** Fixed by `?q=<0-1>` (QA): the monitor leaves it alone. */
  locked: false,
};

if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search).get('q');
  if (q !== null && q !== '') {
    quality.level = Math.max(0, Math.min(SCALES.length - 1, Number(q) || 0));
    quality.locked = true;
  }
}

/** Slower than this on average (20 fps) and the device is not coping at full resolution. */
const SLOW_MS = 50;
const WINDOW = 16;
/** Slow windows in a row before stepping down: about two and a half seconds of sustained struggle. */
const STRIKES = 3;

/**
 * Watches the gaps between consecutive moving frames. Three slow windows in
 * a row step the level down; a stall (shader compile, a set being built)
 * voids the window instead of counting against the device.
 */
class Monitor {
  private last = 0;
  private sum = 0;
  private n = 0;
  private strikes = 0;
  private skip = 12;

  /** Ignore the next frames (after a mount, a resize or a change of look). */
  hold(frames = 10) {
    this.skip = Math.max(this.skip, frames);
    this.n = 0;
    this.sum = 0;
  }

  frame(now: number) {
    const gap = now - this.last;
    this.last = now;
    if (quality.locked || quality.level >= SCALES.length - 1) return;
    if (this.skip > 0) {
      this.skip--;
      return;
    }
    // Not consecutive (the picture had stopped), or a stall: start the window again.
    if (gap > 160) {
      this.n = 0;
      this.sum = 0;
      return;
    }
    this.sum += gap;
    if (++this.n < WINDOW) return;
    const mean = this.sum / this.n;
    this.n = 0;
    this.sum = 0;
    if (mean <= SLOW_MS) {
      this.strikes = 0;
      return;
    }
    if (++this.strikes < STRIKES) return;
    this.strikes = 0;
    // Pixels the GPU was given over the plain canvas go first (gpu.ts): then, if it still cannot cope, the step down.
    if (!giveUp()) quality.level++;
    this.hold(16);
  }
}

/* ------------------------------------------------------------------ */
/* Full-screen passes                                                  */
/* ------------------------------------------------------------------ */

const triangle = new BufferGeometry();
triangle.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
triangle.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
const flat = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

const VERT = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}`;

const raw = (fragmentShader: string, uniforms: Record<string, { value: unknown }>, defines: Record<string, number> = {}) =>
  new RawShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, defines, depthTest: false, depthWrite: false });

/** Bright parts of the picture, averaged down to a quarter of the canvas. */
const BRIGHT = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tSky;
uniform float uSky;
uniform float uSkyFloor;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
vec3 bright( vec2 uv ) {
  vec4 s = texture2D( tMap, uv );
  // The sky is not in the scene's picture; the sun is in the sky.
  vec3 c = max( s.rgb + ( 1.0 - s.a ) * uSky * texture2D( tSky, vec2( uv.x, max( uv.y, uSkyFloor ) ) ).rgb, 0.0 );
  float l = dot( c, vec3( 0.2126729, 0.7151522, 0.0721750 ) );
  return c * smoothstep( uThreshold, uThreshold + 0.01, l );
}
void main() {
  vec3 s = bright( vUv + uTexel * vec2( -1.0, -1.0 ) ) + bright( vUv + uTexel * vec2( 1.0, -1.0 ) )
         + bright( vUv + uTexel * vec2( -1.0, 1.0 ) ) + bright( vUv + uTexel * vec2( 1.0, 1.0 ) );
  gl_FragColor = vec4( s * 0.25, 1.0 );
}`;

/** Dual-filter blur, down: five overlapping taps, so a moving highlight glides from texel to texel. */
const DOWN = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 s = texture2D( tMap, vUv ).rgb * 4.0;
  s += texture2D( tMap, vUv + uTexel * vec2( -1.0, -1.0 ) ).rgb;
  s += texture2D( tMap, vUv + uTexel * vec2( 1.0, -1.0 ) ).rgb;
  s += texture2D( tMap, vUv + uTexel * vec2( -1.0, 1.0 ) ).rgb;
  s += texture2D( tMap, vUv + uTexel * vec2( 1.0, 1.0 ) ).rgb;
  gl_FragColor = vec4( s * 0.125, 1.0 );
}`;

/** How many levels the glow is built from: a quarter of the canvas, then halves. */
const BLOOM_LEVELS = 7;

/**
 * What the glow is made of: [level, tent width in that level's texels,
 * weight]. Width 0 reads the level as it is. Fitted by least squares, over
 * three of the hero's sets, to the glow this pipeline had as a chain of
 * upsampling passes (bright core within 1%, the rest within a few percent),
 * itself fitted to three's UnrealBloomPass at radius 0.55: the look is that
 * pass's.
 */
const BLOOM_TERMS: [number, number, number][] = [
  [0, 0, 0.255],
  [1, 0, 0.147],
  [1, 0.75, 0.19],
  [2, 0, 0.142],
  [2, 0.75, 0.135],
  [3, 0, 0.165],
  [3, 0.75, 0.157],
  [4, 0, 0.207],
  [4, 0.75, 0.175],
  [5, 0, 0.201],
  [5, 0.75, 0.112],
  [6, 0, 0.243],
  [6, 0.75, 0.318],
  [6, 1.5, 0.025],
];
const BLOOM_WEIGHTS = BLOOM_TERMS.map((t) => t[2]);
/** The built-in gain of the bloom pass this replaces. */
const BLOOM_GAIN = 3;

/**
 * The glow: a weighted sum of the levels, each read through a tent so its
 * texels do not show, composed in one pass. (As a chain of passes that
 * upsampled level by level this was six passes, and on integrated graphics
 * the passes cost more than the blurring.) GLSL ES 3.00, for textureSize and
 * samplers as arguments.
 */
const GLOW_VERT = /* glsl */ `
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}`;
const GLOW = /* glsl */ `
precision highp float;
precision highp sampler2D;
${Array.from({ length: BLOOM_LEVELS }, (_, k) => `uniform sampler2D tL${k};`).join('\n')}
uniform float uWeights[ ${BLOOM_TERMS.length} ];
in vec2 vUv;
out vec4 outColor;
vec3 tent( sampler2D level, float spread ) {
  vec2 d = spread / vec2( textureSize( level, 0 ) );
  return 0.25 * ( textureLod( level, vUv + vec2( -d.x, -d.y ), 0.0 ).rgb + textureLod( level, vUv + vec2( d.x, -d.y ), 0.0 ).rgb
                + textureLod( level, vUv + vec2( -d.x, d.y ), 0.0 ).rgb + textureLod( level, vUv + vec2( d.x, d.y ), 0.0 ).rgb );
}
void main() {
  vec3 s = vec3( 0.0 );
${BLOOM_TERMS.map(([level, spread], i) =>
  spread > 0 ? `  s += uWeights[ ${i} ] * tent( tL${level}, ${spread.toFixed(2)} );` : `  s += uWeights[ ${i} ] * textureLod( tL${level}, vUv, 0.0 ).rgb;`,
).join('\n')}
  outColor = vec4( s, 1.0 );
}`;

/**
 * Everything between the HDR picture and the screen, in one pass: ambient
 * occlusion, the sky behind the scene, bloom, tone mapping, grade. With
 * SETTLE it also cross-fades from the moving picture to the still one.
 */
const FINAL = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform vec2 uRes;
uniform float uVignette;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uShadows;
uniform vec3 uHighlights;
uniform float uGrain;
uniform float uAberration;
uniform float uSeed;
uniform sampler2D tSky;
uniform float uSky;
uniform float uSkyFloor;
uniform sampler2D tAO;
uniform float uAO;
#if SETTLE == 1
uniform sampler2D tSharp;
uniform float uSharp;
#endif
varying vec2 vUv;

#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>

float hash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}

// The scene, occluded, over the sky. The scene's picture is premultiplied and its alpha is its
// coverage, so an edge anti-aliased against nothing comes out anti-aliased against the sky; and
// the occlusion, which is coarser than the picture, darkens the scene and never the sky beside it.
vec4 picture( vec2 uv ) {
  vec4 a = texture2D( tScene, uv );
  #if SETTLE == 1
    a = mix( a, texture2D( tSharp, uv ), uSharp );
  #endif
  a.rgb *= mix( 1.0, texture2D( tAO, uv ).r, uAO );
  a.rgb += ( 1.0 - a.a ) * uSky * texture2D( tSky, vec2( uv.x, max( uv.y, uSkyFloor ) ) ).rgb;
  a.a = max( a.a, uSky );
  return a;
}

// Linear HDR to display: bloom, tone mapping, transfer curve.
vec3 develop( vec3 hdr, vec3 glow ) {
  return sRGBTransferOETF( vec4( ACESFilmicToneMapping( hdr + glow ), 1.0 ) ).rgb;
}

void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot( c, c );
  vec2 off = c * r2 * uAberration * 4.0;
  vec3 glow = texture2D( tBloom, vUv ).rgb * uBloom;
  vec4 base = picture( vUv );
  vec3 mid = develop( base.rgb, glow );
  vec3 col = vec3( develop( picture( vUv + off ).rgb, glow ).r, mid.g, develop( picture( vUv - off ).rgb, glow ).b );

  float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
  col = mix( vec3( l ), col, uSaturation );
  col = ( col - 0.5 ) * uContrast + 0.5;
  col *= mix( uShadows, uHighlights, smoothstep( 0.05, 0.85, l ) );

  float v = smoothstep( 0.12, 0.9, r2 * 2.2 );
  col *= 1.0 - uVignette * v;

  float n = hash( vUv * uRes + uSeed ) + hash( vUv * uRes * 1.37 - uSeed ) - 1.0;
  col += n * uGrain * ( 0.6 + 0.4 * ( 1.0 - l ) );

  gl_FragColor = vec4( clamp( col, 0.0, 1.0 ), base.a );
}`;

const SETTLE_AFTER = 130;
const SETTLE_FADE = 280;
/** Ambient occlusion is worked out at this fraction of the canvas (each way). */
const AO_SCALE = 0.5;

/* ------------------------------------------------------------------ */
/* The pipeline                                                        */
/* ------------------------------------------------------------------ */

/**
 * A multisampled HDR target for the scene. Only its colour is ever read:
 * left at the defaults, three also resolves the multisampled DEPTH buffer
 * after every frame, which on Direct3D is a slow copy (2-3 ms here on
 * integrated graphics) of something nobody looks at.
 */
const sceneTarget = (samples: number) =>
  new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples, resolveDepthBuffer: false, resolveStencilBuffer: false, storeMultisampledDepthBuffer: false });

interface FinishOptions {
  ao: boolean;
  aoRadius: number;
  aoIntensity: number;
  bloom: number;
  bloomThreshold: number;
  /**
   * Called before the scene is drawn, for a frame R3F asked for and for the settle (outside R3F's loop) alike.
   * Returns the sky to put behind the scene, or null when there is none (a studio on the page's own colour).
   */
  before: () => Backdrop | null;
}

class Finish {
  /** What a moving frame is drawn into: lighter multisampling, and a lower resolution if the level asks. */
  readonly motion: WebGLRenderTarget;
  private motionLevel = -1;
  /** Full resolution, 4x multisampled: the still picture. Made the first time the picture settles. */
  private rest: WebGLRenderTarget | null = null;
  /** Bright parts at a quarter of the canvas, then halved level by level; and the glow composed from them. */
  private down: WebGLRenderTarget[] = [];
  private glowTarget: WebGLRenderTarget | null = null;
  private readonly quad = new Mesh(triangle);
  private readonly mBright: RawShaderMaterial;
  private readonly mDown: RawShaderMaterial;
  private readonly mGlow: RawShaderMaterial;
  private readonly mFinal: RawShaderMaterial;
  private readonly mSettle: RawShaderMaterial;
  private readonly shared: Record<string, { value: unknown }>;
  private gtao: GTAOPass | null = null;
  /** Resolves once the occlusion pass is here, with its materials (for precompiling); empty without occlusion. */
  readonly occlusion: Promise<Material[]>;
  private readonly hidden: Object3D[] = [];
  private w = 2;
  private h = 2;
  private applied: Grade | null = null;
  private timer = 0;
  private lastMoving = 0;
  private glow: Texture | null = null;
  /** The last moving frame reused the glow of the frame before it. */
  private glowStale = false;
  private tick = 0;
  private raf = 0;
  private settledAt = 0;
  private disposed = false;
  readonly monitor = new Monitor();
  /** False until the scene's shaders are compiled; nothing is drawn before. */
  ready = false;
  /** Dev: frames drawn, for the probe. */
  stats = { moving: 0, settles: 0 };

  constructor(
    private readonly gl: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly opts: FinishOptions,
  ) {
    this.quad.frustumCulled = false;
    this.motion = sceneTarget(MOVING_SAMPLES);
    this.shared = {
      tScene: { value: null },
      tBloom: { value: null },
      uBloom: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uVignette: { value: 0.2 },
      uSaturation: { value: 1 },
      uContrast: { value: 1 },
      uShadows: { value: new Vector3(1, 1, 1) },
      uHighlights: { value: new Vector3(1, 1, 1) },
      uGrain: { value: 0.02 },
      uAberration: { value: 0.002 },
      uSeed: { value: 0 },
      toneMappingExposure: { value: 1 },
      tSky: { value: null },
      uSky: { value: 0 },
      uSkyFloor: { value: 0 },
      tAO: { value: null },
      uAO: { value: 0 },
    };
    this.mBright = raw(BRIGHT, {
      tMap: { value: null },
      tSky: this.shared.tSky,
      uSky: this.shared.uSky,
      uSkyFloor: this.shared.uSkyFloor,
      uTexel: { value: new Vector2() },
      uThreshold: { value: opts.bloomThreshold },
    });
    this.mDown = raw(DOWN, { tMap: { value: null }, uTexel: { value: new Vector2() } });
    const levels: Record<string, { value: unknown }> = { uWeights: { value: BLOOM_WEIGHTS } };
    for (let k = 0; k < BLOOM_LEVELS; k++) levels[`tL${k}`] = { value: null };
    this.mGlow = new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: GLOW_VERT, fragmentShader: GLOW, uniforms: levels, depthTest: false, depthWrite: false });
    this.mFinal = raw(FINAL, this.shared, { SETTLE: 0 });
    this.mSettle = raw(FINAL, { ...this.shared, tSharp: { value: null }, uSharp: { value: 0 } }, { SETTLE: 1 });
    this.mFinal.toneMapped = false;
    this.mSettle.toneMapped = false;
    // Three's GTAO pass, fetched alongside the first shaders: every frame uses it, the first included.
    this.occlusion = opts.ao
      ? import('three/examples/jsm/postprocessing/GTAOPass.js').then(
          ({ GTAOPass: Pass }) => {
            if (this.disposed) return [];
            const p = new Pass(scene, camera, ...this.occlusionSize());
            // Off: the pass only fills its own targets; the final pass does the compositing.
            p.output = Pass.OUTPUT.Off;
            p.updateGtaoMaterial({ radius: opts.aoRadius, distanceExponent: 1.6, thickness: 1.2, scale: 1, samples: 12, distanceFallOff: 1 });
            // The denoise radius is in the pass's own pixels: 6 on a full-size picture.
            p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * AO_SCALE, rings: 2, samples: 12 });
            this.gtao = p;
            return [p.gtaoMaterial, p.pdMaterial];
          },
          () => [],
        )
      : Promise.resolve([]);
  }

  private occlusionSize(): [number, number] {
    return [Math.max(2, Math.ceil(this.w * AO_SCALE)), Math.max(2, Math.ceil(this.h * AO_SCALE))];
  }

  /** Every material this pipeline draws with, for precompiling. */
  materials() {
    return [this.mBright, this.mDown, this.mGlow, this.mFinal, this.mSettle];
  }

  setSize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.rest?.setSize(w, h);
    this.sizeMotion();
    (this.shared.uRes.value as Vector2).set(w, h);
    this.glow = null;
    if (this.opts.bloom > 0) {
      let pw = Math.max(2, Math.ceil(w / 4));
      let ph = Math.max(2, Math.ceil(h / 4));
      const small = { type: HalfFloatType, depthBuffer: false } as const;
      (this.glowTarget ??= new WebGLRenderTarget(pw, ph, small)).setSize(pw, ph);
      for (let k = 0; k < BLOOM_LEVELS; k++) {
        (this.down[k] ??= new WebGLRenderTarget(pw, ph, small)).setSize(pw, ph);
        pw = Math.max(1, Math.ceil(pw / 2));
        ph = Math.max(1, Math.ceil(ph / 2));
      }
    }
    this.gtao?.setSize(...this.occlusionSize());
    this.monitor.hold();
    this.cancelSettle();
  }

  private sizeMotion() {
    const level = quality.level;
    const s = SCALES[level];
    this.motionLevel = level;
    this.motion.setSize(Math.max(2, Math.round(this.w * s)), Math.max(2, Math.round(this.h * s)));
    this.glow = null;
  }

  private pass(material: RawShaderMaterial, target: WebGLRenderTarget | null) {
    this.quad.material = material;
    material.uniformsNeedUpdate = true;
    this.gl.setRenderTarget(target);
    this.gl.render(this.quad, flat);
  }

  private grade(g: Grade) {
    const u = this.shared;
    u.uSeed.value = ((u.uSeed.value as number) + 17.13) % 1000;
    u.toneMappingExposure.value = this.gl.toneMappingExposure;
    if (this.applied === g) return;
    this.applied = g;
    u.uVignette.value = g.vignette;
    u.uSaturation.value = g.saturation;
    u.uContrast.value = g.contrast;
    (u.uShadows.value as Vector3).set(...g.shadows);
    (u.uHighlights.value as Vector3).set(...g.highlights);
    u.uGrain.value = g.grain;
    u.uAberration.value = g.aberration;
  }

  /** What goes behind the scene in the passes that read it. */
  private behind(sky: Backdrop | null, fallback: Texture) {
    this.shared.tSky.value = sky?.texture ?? fallback;
    this.shared.uSky.value = sky ? (sky.amount ?? 1) : 0;
    this.shared.uSkyFloor.value = sky?.floor ?? 0;
  }

  /** The glow of `source`: the texture the final pass adds. */
  private bloomOf(source: WebGLRenderTarget): Texture | null {
    const { down, glowTarget } = this;
    if (!glowTarget || down.length < BLOOM_LEVELS) return null;
    const b = this.mBright.uniforms;
    b.tMap.value = source.texture;
    (b.uTexel.value as Vector2).set(1 / source.width, 1 / source.height);
    this.pass(this.mBright, down[0]);
    const d = this.mDown.uniforms;
    for (let k = 1; k < BLOOM_LEVELS; k++) {
      d.tMap.value = down[k - 1].texture;
      (d.uTexel.value as Vector2).set(1 / down[k - 1].width, 1 / down[k - 1].height);
      this.pass(this.mDown, down[k]);
    }
    const g = this.mGlow.uniforms;
    for (let k = 0; k < BLOOM_LEVELS; k++) g[`tL${k}`].value = down[k].texture;
    this.pass(this.mGlow, glowTarget);
    return glowTarget.texture;
  }

  /** A frame R3F asked for: the scene has changed. */
  renderMoving(g: Grade) {
    if (this.raf || this.settledAt) this.cancelSettle();
    if (!this.ready || this.disposed) return;
    if (quality.level !== this.motionLevel) {
      this.sizeMotion();
      this.monitor.hold();
    }
    const gl = this.gl;
    const target = this.motion;
    const sky = this.opts.before();
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    this.shared.tScene.value = target.texture;
    this.behind(sky, target.texture);
    this.occlude(target.texture);
    // The glow is several pixels wide at its tightest: refreshed on alternate frames, reused in between.
    const fresh = !this.glow || this.tick++ % 2 === 0;
    if (fresh) this.glow = this.bloomOf(target);
    this.glowStale = !fresh;
    const glow = this.glow;
    this.shared.tBloom.value = glow ?? target.texture;
    this.shared.uBloom.value = glow ? this.opts.bloom * BLOOM_GAIN : 0;
    this.grade(g);
    this.pass(this.mFinal, null);
    this.stats.moving++;
    this.lastMoving = performance.now();
    this.monitor.frame(this.lastMoving);
    // One timer while the picture moves; it re-arms itself until the frames stop.
    if (!this.timer) this.timer = window.setTimeout(this.settle, SETTLE_AFTER);
  }

  private cancelSettle() {
    if (this.timer) window.clearTimeout(this.timer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.timer = 0;
    this.raf = 0;
    this.settledAt = 0;
  }

  /** Nothing has moved for a moment: the same picture with finer edges, cross-faded in. */
  private settle = () => {
    this.timer = 0;
    if (this.disposed || !this.ready || !this.shared.tScene.value) return;
    const since = performance.now() - this.lastMoving;
    if (since < SETTLE_AFTER - 4) {
      this.timer = window.setTimeout(this.settle, SETTLE_AFTER - since);
      return;
    }
    const gl = this.gl;
    const sky = this.opts.before();
    let rest = this.rest;
    if (!rest) {
      rest = this.rest = sceneTarget(STILL_SAMPLES);
      rest.setSize(this.w, this.h);
    }
    // Same scene, same light: the shadow map is only redrawn if `before` asked for it (shadowMap.needsUpdate).
    const auto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(rest);
    gl.render(this.scene, this.camera);
    gl.shadowMap.autoUpdate = auto;
    // The glow is the last moving frame's own. If that frame reused the one before's, it is made now: after a
    // jump of the page (a link, a key, reduced motion's snap) the frame before was another pose altogether,
    // and its glow stood in this picture as a ghost of the lamps and windows of that one.
    if (this.glowStale && this.glow) {
      this.glow = this.bloomOf(this.motion);
      this.shared.tBloom.value = this.glow ?? this.motion.texture;
      this.glowStale = false;
    }
    // The same sky and the same occlusion as the last moving frame had. Both are drawn again
    // rather than trusted to still be that frame's: it is a millisecond, once.
    this.behind(sky, rest.texture);
    this.occlude(rest.texture);
    const u = this.mSettle.uniforms;
    u.tSharp.value = rest.texture;
    u.uSharp.value = 0;
    this.settledAt = performance.now();
    this.stats.settles++;
    this.raf = requestAnimationFrame(this.fade);
  };

  /**
   * Ambient occlusion for the scene as it stands, into the pass's own targets.
   * The pass draws the scene once more (normals and depth), at its own size.
   */
  private occlude(fallback: Texture) {
    const g = this.gtao;
    const u = this.shared;
    if (!g) {
      u.tAO.value = fallback;
      u.uAO.value = 0;
      return;
    }
    const gl = this.gl;
    // Not part of the depth picture: overlays that ignore depth (a cut's card would flatten
    // everything behind it), depth-only helpers, which repeat what is already there, and what a
    // scene keeps out of it (userData.unoccluded: land that is there but not yet shown, whose
    // occlusion would lie on the floor it has not reached as stains).
    const hidden = this.hidden;
    this.scene.traverseVisible((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      const first = Array.isArray(m) ? m[0] : m;
      if (o.userData.unoccluded || (first && (first.depthTest === false || first.colorWrite === false))) {
        o.visible = false;
        hidden.push(o);
      }
    });
    const auto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    g.render(gl, this.motion, this.motion, 0, false);
    gl.shadowMap.autoUpdate = auto;
    for (const o of hidden) o.visible = true;
    hidden.length = 0;
    u.tAO.value = g.pdRenderTarget.texture;
    u.uAO.value = this.opts.aoIntensity;
  }

  /**
   * Draws the occlusion pass's view of the scene (normals) once into `target`,
   * so the shaders it needs for what is showing now are compiled. For rig.warm.
   */
  warmOcclusion(target: WebGLRenderTarget) {
    const g = this.gtao;
    if (!g || this.disposed) return;
    const { gl, scene } = this;
    const was = gl.getRenderTarget();
    scene.overrideMaterial = g.normalMaterial;
    gl.setRenderTarget(target);
    gl.render(scene, this.camera);
    scene.overrideMaterial = null;
    gl.setRenderTarget(was);
  }

  private fade = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.settledAt) return;
    const t = Math.min(1, Math.max(0, (now - this.settledAt) / SETTLE_FADE));
    this.mSettle.uniforms.uSharp.value = t * t * (3 - 2 * t);
    this.shared.uSeed.value = ((this.shared.uSeed.value as number) + 17.13) % 1000;
    this.pass(this.mSettle, null);
    if (t < 1) this.raf = requestAnimationFrame(this.fade);
  };

  dispose() {
    this.disposed = true;
    this.cancelSettle();
    this.rest?.dispose();
    this.motion.dispose();
    this.down.forEach((t) => t.dispose());
    this.glowTarget?.dispose();
    this.materials().forEach((m) => m.dispose());
    this.gtao?.dispose();
  }
}

export default function Post({
  ao = true,
  aoRadius = 0.9,
  aoIntensity = 1,
  bloom = 0.35,
  bloomThreshold = 1.4,
  grade,
  getGrade,
  onReady,
  before,
  compile,
  onWarmer,
}: PostOptions & {
  getGrade?: () => Grade | undefined;
  onReady?: () => void;
  before?: () => Backdrop | null;
  /** Compiles whatever `before` draws; the first frame waits for it too. */
  compile?: () => Promise<unknown>;
  /** Receives a function that draws this finish's own view of the scene into a target (for rig.warm), or null when it goes. */
  onWarmer?: (draw: ((target: WebGLRenderTarget) => void) | null) => void;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);
  const ready = useRef(onReady);
  ready.current = onReady;
  const prepare = useRef(before);
  prepare.current = before;
  const also = useRef(compile);
  also.current = compile;
  const warmer = useRef(onWarmer);
  warmer.current = onWarmer;

  const finish = useMemo(() => {
    const f = new Finish(gl, scene, camera, { ao, aoRadius, aoIntensity, bloom, bloomThreshold, before: () => prepare.current?.() ?? null });
    if (import.meta.env.DEV) (gl.domElement as unknown as { __veePost?: unknown }).__veePost = { finish: f, quality, SCALES, BLOOM_WEIGHTS };
    return f;
  }, [gl, scene, camera, ao, aoRadius, aoIntensity, bloom, bloomThreshold]);

  useLayoutEffect(() => {
    finish.setSize(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
    invalidate();
  }, [finish, size, dpr, invalidate]);

  /*
   * Compile every shader the scene needs before the first frame, off the
   * main thread where the browser allows it: the page stays responsive (and
   * the boot screen keeps moving) instead of freezing on the first draw.
   */
  useEffect(() => {
    let alive = true;
    const go = () => {
      if (!alive || finish.ready) return;
      finish.ready = true;
      finish.monitor.hold();
      ready.current?.();
      invalidate();
    };
    const passes = finish.materials().map((m) => {
      const q = new Mesh(triangle, m);
      q.frustumCulled = false;
      return q;
    });
    gl.setRenderTarget(finish.motion);
    const jobs: Promise<unknown>[] = [gl.compileAsync(scene, camera), ...passes.map((q) => gl.compileAsync(q, flat))];
    gl.setRenderTarget(null);
    if (also.current) jobs.push(also.current());
    jobs.push(
      finish.occlusion.then((materials) => {
        if (!alive || !materials.length) return;
        const was = gl.getRenderTarget();
        gl.setRenderTarget(finish.motion);
        const compiled = materials.map((m) => {
          const q = new Mesh(triangle, m);
          q.frustumCulled = false;
          return gl.compileAsync(q, flat);
        });
        gl.setRenderTarget(was);
        return Promise.all(compiled);
      }),
    );
    Promise.all(jobs).then(go, go);
    // Never hold the picture back for long if the driver does not report.
    const cap = window.setTimeout(go, 6000);
    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, [finish, gl, scene, camera, invalidate]);

  useEffect(() => () => finish.dispose(), [finish]);

  useEffect(() => {
    warmer.current?.((target) => finish.warmOcclusion(target));
    return () => warmer.current?.(null);
  }, [finish]);

  useFrame(() => {
    finish.renderMoving(grade ?? getGrade?.() ?? NEUTRAL_GRADE);
  }, 1);

  return null;
}
