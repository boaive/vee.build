/**
 * The photographic finish: multisampled HDR render, bloom on the sun and lit
 * glass, filmic tone mapping, then a display-space grade (split toning,
 * vignette, faint lens fringing, grain that doubles as dither so gradients
 * in the sky never band), with ambient occlusion once the picture is still.
 *
 * Built to be cheap while the picture moves:
 *
 * - A moving frame is the scene with light multisampling, a small bloom
 *   pyramid at quarter resolution, and ONE full-screen pass that does tone
 *   mapping, colour space, grade and grain together.
 * - If the device cannot hold the frame rate, moving frames drop to a lower
 *   internal resolution (`quality`). The final pass always runs at full
 *   resolution, so the grain and the edges of the frame stay crisp.
 * - When nothing has asked for a frame for a moment, the picture settles:
 *   it is redrawn once at full resolution with 4x multisampling, ambient
 *   occlusion is computed once, and both ease in. A still picture then costs
 *   nothing, exactly as before.
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
  HalfFloatType,
  Mesh,
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

export interface PostOptions {
  /** Ambient occlusion, eased in when the picture is still. */
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

/** Internal resolution of a moving frame, as a fraction of the canvas. */
const SCALES = [1, 0.8, 0.64, 0.5];
/** Multisampling of a moving frame per level; the still picture is always 4x. */
const MOVING_SAMPLES = [2, 2, 2, 0];
const STILL_SAMPLES = 4;

/**
 * One level for the whole page: what the hero learns about the device also
 * holds for the films below it. It only ever steps down during a visit; a
 * reload starts again from full resolution.
 */
export const quality = {
  level: 0,
  /** Fixed by `?q=<0-3>` (QA): the monitor leaves it alone. */
  locked: false,
};

if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search).get('q');
  if (q !== null && q !== '') {
    quality.level = Math.max(0, Math.min(SCALES.length - 1, Number(q) || 0));
    quality.locked = true;
  }
}

/** Slower than this on average and moving frames give up resolution (about 46 fps). */
const SLOW_MS = 21.5;
const WINDOW = 14;

/**
 * Watches the gaps between consecutive moving frames. Two slow windows in a
 * row step the level down; a stall (shader compile, a set being built) voids
 * the window instead of counting against the device.
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
    if (gap > 90) {
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
    if (++this.strikes < 2) return;
    this.strikes = 0;
    quality.level++;
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
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
vec3 bright( vec2 uv ) {
  vec3 c = max( texture2D( tMap, uv ).rgb, 0.0 );
  float l = dot( c, vec3( 0.2126729, 0.7151522, 0.0721750 ) );
  return c * smoothstep( uThreshold, uThreshold + 0.01, l );
}
void main() {
  vec3 s = bright( vUv + uTexel * vec2( -1.0, -1.0 ) ) + bright( vUv + uTexel * vec2( 1.0, -1.0 ) )
         + bright( vUv + uTexel * vec2( -1.0, 1.0 ) ) + bright( vUv + uTexel * vec2( 1.0, 1.0 ) );
  gl_FragColor = vec4( s * 0.25, 1.0 );
}`;

/** Dual-filter blur, down: five taps for a wide, stable kernel. */
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

/** Dual-filter blur, up: the wider level blurred again and added to this one. */
const UP = /* glsl */ `
precision highp float;
uniform sampler2D tLow;
uniform sampler2D tBase;
uniform vec2 uTexel;
uniform float uLow;
uniform float uBase;
varying vec2 vUv;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 s = texture2D( tLow, vUv + vec2( -2.0 * h.x, 0.0 ) ).rgb;
  s += texture2D( tLow, vUv + vec2( -h.x, h.y ) ).rgb * 2.0;
  s += texture2D( tLow, vUv + vec2( 0.0, 2.0 * h.y ) ).rgb;
  s += texture2D( tLow, vUv + vec2( h.x, h.y ) ).rgb * 2.0;
  s += texture2D( tLow, vUv + vec2( 2.0 * h.x, 0.0 ) ).rgb;
  s += texture2D( tLow, vUv + vec2( h.x, -h.y ) ).rgb * 2.0;
  s += texture2D( tLow, vUv + vec2( 0.0, -2.0 * h.y ) ).rgb;
  s += texture2D( tLow, vUv + vec2( -h.x, -h.y ) ).rgb * 2.0;
  gl_FragColor = vec4( texture2D( tBase, vUv ).rgb * uBase + s * ( uLow / 12.0 ), 1.0 );
}`;

/**
 * Everything between the HDR picture and the screen, in one pass. With
 * SETTLE it also cross-fades from the moving picture to the full-resolution
 * one and multiplies the ambient occlusion in.
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
#if SETTLE == 1
uniform sampler2D tSharp;
uniform sampler2D tAO;
uniform float uSharp;
uniform float uAO;
#endif
varying vec2 vUv;

#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>

float hash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}

vec4 picture( vec2 uv ) {
  vec4 a = texture2D( tScene, uv );
  #if SETTLE == 1
    vec4 b = texture2D( tSharp, uv );
    b.rgb *= mix( 1.0, texture2D( tAO, uv ).r, uAO );
    a = mix( a, b, uSharp );
  #endif
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

/**
 * Weight of each bloom level, tightest first (each level is half the size of
 * the one before, starting at a quarter of the canvas). Fitted by least
 * squares to the glow of three's UnrealBloomPass (radius 0.55), which this
 * replaces: sampled along lines through the sun and the porch lamp of the
 * hero, the two agree to about 3%. BLOOM_GAIN is that pass's built-in gain.
 */
const BLOOM_WEIGHTS = [0.26, 0.365, 0.306, 0.357, 0.392, 0.326, 0.466];
const BLOOM_GAIN = 3;

const SETTLE_AFTER = 130;
const SETTLE_FADE = 280;
const AO_FADE = 320;

/* ------------------------------------------------------------------ */
/* The pipeline                                                        */
/* ------------------------------------------------------------------ */

interface FinishOptions {
  ao: boolean;
  aoRadius: number;
  aoIntensity: number;
  bloom: number;
  bloomThreshold: number;
  /** Called before the scene is drawn outside R3F's loop (the settle). */
  before: () => void;
}

class Finish {
  /** What a moving frame is drawn into: lighter multisampling, and a lower resolution if the level asks. */
  readonly motion: WebGLRenderTarget;
  private motionLevel = -1;
  /** Full resolution, 4x multisampled: the still picture. Made the first time the picture settles. */
  private rest: WebGLRenderTarget | null = null;
  private down: WebGLRenderTarget[] = [];
  private up: WebGLRenderTarget[] = [];
  private readonly quad = new Mesh(triangle);
  private readonly mBright: RawShaderMaterial;
  private readonly mDown: RawShaderMaterial;
  private readonly mUp: RawShaderMaterial;
  private readonly mFinal: RawShaderMaterial;
  private readonly mSettle: RawShaderMaterial;
  private readonly shared: Record<string, { value: unknown }>;
  private gtao: GTAOPass | null = null;
  private gtaoLoading = false;
  private w = 2;
  private h = 2;
  private applied: Grade | null = null;
  private timer = 0;
  private lastMoving = 0;
  private raf = 0;
  private settledAt = 0;
  private aoAt = 0;
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
    this.motion = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: MOVING_SAMPLES[quality.level] });
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
    };
    this.mBright = raw(BRIGHT, { tMap: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: opts.bloomThreshold } });
    this.mDown = raw(DOWN, { tMap: { value: null }, uTexel: { value: new Vector2() } });
    this.mUp = raw(UP, { tLow: { value: null }, tBase: { value: null }, uTexel: { value: new Vector2() }, uLow: { value: 1 }, uBase: { value: 1 } });
    this.mFinal = raw(FINAL, this.shared, { SETTLE: 0 });
    this.mSettle = raw(FINAL, { ...this.shared, tSharp: { value: null }, tAO: { value: null }, uSharp: { value: 0 }, uAO: { value: 0 } }, { SETTLE: 1 });
    this.mFinal.toneMapped = false;
    this.mSettle.toneMapped = false;
  }

  /** Every material this pipeline draws with, for precompiling. */
  materials() {
    return [this.mBright, this.mDown, this.mUp, this.mFinal, this.mSettle];
  }

  setSize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.rest?.setSize(w, h);
    this.sizeMotion();
    (this.shared.uRes.value as Vector2).set(w, h);
    this.down.forEach((t) => t.dispose());
    this.up.forEach((t) => t.dispose());
    this.down = [];
    this.up = [];
    if (this.opts.bloom > 0) {
      let pw = Math.max(2, Math.ceil(w / 4));
      let ph = Math.max(2, Math.ceil(h / 4));
      const make = () => new WebGLRenderTarget(pw, ph, { type: HalfFloatType, depthBuffer: false });
      for (let i = 0; i < BLOOM_WEIGHTS.length; i++) {
        this.down.push(make());
        if (Math.min(pw, ph) < 8) break;
        pw = Math.max(2, Math.ceil(pw / 2));
        ph = Math.max(2, Math.ceil(ph / 2));
      }
      for (let i = 0; i < this.down.length - 1; i++) this.up.push(new WebGLRenderTarget(this.down[i].width, this.down[i].height, { type: HalfFloatType, depthBuffer: false }));
    }
    this.gtao?.setSize(w, h);
    this.monitor.hold();
    this.cancelSettle();
  }

  private sizeMotion() {
    const level = quality.level;
    const s = SCALES[level];
    this.motionLevel = level;
    const m = this.motion;
    if (m.samples !== MOVING_SAMPLES[level]) {
      // The sample count is fixed when the target is created on the GPU: release it and it is rebuilt.
      m.dispose();
      m.samples = MOVING_SAMPLES[level];
    }
    m.setSize(Math.max(2, Math.round(this.w * s)), Math.max(2, Math.round(this.h * s)));
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

  /** The bloom pyramid for `source`; returns the texture the final pass adds. */
  private bloomOf(source: WebGLRenderTarget): Texture | null {
    const n = this.down.length;
    if (!n) return null;
    const b = this.mBright.uniforms;
    b.tMap.value = source.texture;
    (b.uTexel.value as Vector2).set(1 / source.width, 1 / source.height);
    this.pass(this.mBright, this.down[0]);
    const d = this.mDown.uniforms;
    for (let i = 1; i < n; i++) {
      d.tMap.value = this.down[i - 1].texture;
      (d.uTexel.value as Vector2).set(1 / this.down[i - 1].width, 1 / this.down[i - 1].height);
      this.pass(this.mDown, this.down[i]);
    }
    const u = this.mUp.uniforms;
    let low: WebGLRenderTarget = this.down[n - 1];
    // A small canvas has fewer levels: the widest one carries the weight of those it lacks.
    let widest = 0;
    for (let i = n - 1; i < BLOOM_WEIGHTS.length; i++) widest += BLOOM_WEIGHTS[i];
    for (let i = n - 2; i >= 0; i--) {
      u.tLow.value = low.texture;
      u.tBase.value = this.down[i].texture;
      (u.uTexel.value as Vector2).set(1 / low.width, 1 / low.height);
      u.uLow.value = i === n - 2 ? widest : 1;
      u.uBase.value = BLOOM_WEIGHTS[i];
      this.pass(this.mUp, this.up[i]);
      low = this.up[i];
    }
    return n > 1 ? this.up[0].texture : this.down[0].texture;
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
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    this.shared.tScene.value = target.texture;
    const glow = this.bloomOf(target);
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
    this.aoAt = 0;
  }

  /** Nothing has moved for a moment: the full-quality picture, then ambient occlusion. */
  private settle = () => {
    this.timer = 0;
    if (this.disposed || !this.ready || !this.shared.tScene.value) return;
    const since = performance.now() - this.lastMoving;
    if (since < SETTLE_AFTER - 4) {
      this.timer = window.setTimeout(this.settle, SETTLE_AFTER - since);
      return;
    }
    const gl = this.gl;
    this.opts.before();
    const rest = (this.rest ??= new WebGLRenderTarget(this.w, this.h, { type: HalfFloatType, samples: STILL_SAMPLES }));
    // Same scene, same light: only the picture is redrawn, not the shadow map.
    const auto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(rest);
    gl.render(this.scene, this.camera);
    gl.shadowMap.autoUpdate = auto;
    const u = this.mSettle.uniforms;
    u.tSharp.value = rest.texture;
    u.tAO.value = rest.texture;
    u.uAO.value = 0;
    this.settledAt = performance.now();
    this.stats.settles++;
    if (this.opts.ao) this.occlude();
    this.raf = requestAnimationFrame(this.fade);
  };

  /** Ambient occlusion for the still picture. The pass is fetched on first use. */
  private occlude() {
    if (!this.gtao) {
      if (this.gtaoLoading) return;
      this.gtaoLoading = true;
      void import('three/examples/jsm/postprocessing/GTAOPass.js').then(({ GTAOPass: Pass }) => {
        if (this.disposed) return;
        const p = new Pass(this.scene, this.camera, this.w, this.h);
        p.output = Pass.OUTPUT.Off;
        p.updateGtaoMaterial({ radius: this.opts.aoRadius, distanceExponent: 1.6, thickness: 1.2, scale: 1, samples: 12, distanceFallOff: 1 });
        p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
        this.gtao = p;
        // Still at rest: bring the occlusion in now.
        if (this.settledAt && !this.aoAt) {
          this.opts.before();
          this.occlude();
          if (!this.raf) this.raf = requestAnimationFrame(this.fade);
        }
      });
      return;
    }
    const gl = this.gl;
    const auto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    // OUTPUT.Off: the pass only fills its own targets; the final pass composites.
    this.gtao.render(gl, this.motion, this.motion, 0, false);
    gl.shadowMap.autoUpdate = auto;
    this.mSettle.uniforms.tAO.value = this.gtao.pdRenderTarget.texture;
    this.aoAt = performance.now();
  }

  private fade = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.settledAt) return;
    const ease = (t: number) => t * t * (3 - 2 * t);
    const sharp = Math.min(1, (now - this.settledAt) / SETTLE_FADE);
    const ao = this.aoAt ? Math.min(1, (now - this.aoAt) / AO_FADE) : 0;
    const u = this.mSettle.uniforms;
    u.uSharp.value = ease(Math.max(0, sharp));
    u.uAO.value = ease(Math.max(0, ao)) * this.opts.aoIntensity;
    this.shared.uSeed.value = ((this.shared.uSeed.value as number) + 17.13) % 1000;
    this.pass(this.mSettle, null);
    // If the occlusion pass is still loading, it restarts this loop when it arrives.
    if (sharp < 1 || (this.aoAt && ao < 1)) this.raf = requestAnimationFrame(this.fade);
  };

  dispose() {
    this.disposed = true;
    this.cancelSettle();
    this.rest?.dispose();
    this.motion.dispose();
    this.down.forEach((t) => t.dispose());
    this.up.forEach((t) => t.dispose());
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
}: PostOptions & { getGrade?: () => Grade | undefined; onReady?: () => void; before?: () => void }) {
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

  const finish = useMemo(() => {
    const f = new Finish(gl, scene, camera, { ao, aoRadius, aoIntensity, bloom, bloomThreshold, before: () => prepare.current?.() });
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
    const jobs = [gl.compileAsync(scene, camera), ...passes.map((q) => gl.compileAsync(q, flat))];
    gl.setRenderTarget(null);
    Promise.all(jobs).then(go, go);
    // Never hold the picture back for long if the driver does not report.
    const cap = window.setTimeout(go, 6000);
    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, [finish, gl, scene, camera, invalidate]);

  useEffect(() => () => finish.dispose(), [finish]);

  useFrame(() => {
    finish.renderMoving(grade ?? getGrade?.() ?? NEUTRAL_GRADE);
  }, 1);

  return null;
}
