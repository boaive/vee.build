/**
 * How many pixels a stage's canvas is given: by what this device's GPU can
 * draw, not by one figure for every device (developer, 2026-10-12: "when I
 * zoom in I can see the pixels break", then "can we keep it based on gpu").
 *
 * Until then a canvas had at most 1.5 pixels to the CSS pixel, whoever drew
 * it. On the test laptop, whose screen has exactly that many, it is every
 * pixel there is; on a denser screen, or in a window zoomed in (which has
 * fewer CSS pixels and more screen pixels to each), the picture was drawn
 * small and stretched. What a frame costs follows the number of pixels in
 * it, not their density, so that number is what is rationed here.
 *
 * The GPU is measured once a visit, before the first stage's first frame: a
 * short fixed piece of shading, timed to its last pixel (`gauge`). Set
 * against the same piece on the test laptop, which holds the whole page at
 * 1920 x 1080, it gives the pixels this GPU can be asked for (`budget`). A
 * canvas then has the screen's own pixels as far as that goes (`dprOf`).
 *
 * Never fewer than before: the old figure is still what a canvas has where
 * nothing was measured, where the GPU is no faster than the laptop's, and
 * wherever the screen has no more pixels to give. And it is one decision
 * for the visit, taken before anything is seen: a picture is not drawn
 * small while it moves and sharp when it stops (notes F8). Only the page's
 * one emergency step can take it back (post.tsx, Monitor), and it gives the
 * extra pixels up before it gives anything else.
 */
import { BufferGeometry, Float32BufferAttribute, GLSL3, Mesh, OrthographicCamera, RawShaderMaterial, Scene, WebGLRenderTarget, type WebGLRenderer } from 'three';

/**
 * The test laptop (Arc integrated graphics, notes F8): what `gauge` reads on
 * it in its fast state, and the canvas it draws every film on at that speed.
 */
const REFERENCE = { ms: 3.3, pixels: 1920 * 1080 };
/** Of what the measure allows, this much is asked for. A phone's GPU slows as it warms: less of it. */
const KEEP = 0.8;
const KEEP_TOUCH = 0.6;
/**
 * No canvas is given more than this, however fast the GPU: a stage's render
 * targets are memory as well as time, and two stages can be mounted at once
 * (notes P7 has what a stage holds at each size: about 155 MB a megapixel).
 */
const CEILING = 3840 * 2160;
/** Nor more than this many to the CSS pixel: past it the eye has nothing to gain. */
const MAX_DPR = 3;
const STORE = 'vee:gpu';

export const gpu = {
  /** What `gauge` read, in milliseconds; 0 until it has. */
  ms: 0,
  /** How long the measuring held the page, in milliseconds (QA). */
  took: 0,
  /** Pixels a canvas may have. 0: only what it had before. */
  budget: 0,
  /** Fixed by `?px=<megapixels>` (QA; 0 rules the measure out): the gauge and the monitor leave it alone. */
  fixed: false,
  /** Told when the budget changes. */
  listeners: new Set<() => void>(),
};

if (typeof window !== 'undefined') {
  const px = new URLSearchParams(window.location.search).get('px');
  if (px !== null && px !== '') {
    gpu.budget = Math.max(0, Number(px) || 0) * 1e6;
    gpu.fixed = true;
  }
  if (import.meta.env.DEV) (window as unknown as { __veeGpu?: unknown }).__veeGpu = gpu;
}

const VERTEX = /* glsl */ `
in vec3 position;
void main() {
  gl_Position = vec4( position, 1.0 );
}`;

/* Arithmetic for every pixel of the target, and nothing a driver can skip: each turn of the loop feeds the next. */
const FRAGMENT = /* glsl */ `
precision highp float;
uniform float uSeed;
out vec4 color;
void main() {
  vec2 p = gl_FragCoord.xy * 0.004 + uSeed;
  vec3 sum = vec3( 0.0 );
  for ( int i = 0; i < 40; i ++ ) {
    p = mat2( 0.8, -0.6, 0.6, 0.8 ) * p * 1.07 + vec2( 0.31, 0.17 );
    vec3 h = fract( sin( vec3( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ), dot( p, vec2( 419.2, 371.9 ) ) ) ) * 43758.5453 );
    sum += h * h / ( 1.0 + dot( h, h ) );
  }
  color = vec4( sum / 40.0, 1.0 );
}`;

const SIDE = 1024;

/**
 * The fixed piece of shading, timed: the least of a few runs, each one
 * waited for to its last pixel (a pixel is read back, which no browser can
 * answer before the drawing is done). That wait is counted too, so a fast
 * GPU reads a little slower than it is: the error is on the safe side.
 *
 * It is done before the first picture, so a slow device must not be kept at
 * it: the shader is compiled on a few pixels, then a quarter of the piece
 * is timed, and a GPU that is well behind the laptop on that is asked no
 * more (it has nothing to gain) and is told four times what it took. The
 * laptop reads 1.2 to 2.5 ms on the quarter, of which some 0.7 is the wait
 * itself, and 3.3 to 3.5 on the whole; all of it holds the page for 25 ms.
 */
function time(gl: WebGLRenderer): number {
  const target = new WebGLRenderTarget(16, 16, { depthBuffer: false });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const material = new RawShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, glslVersion: GLSL3, uniforms: { uSeed: { value: 0 } }, depthTest: false, depthWrite: false });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pixel = new Uint8Array(4);
  const was = gl.getRenderTarget();
  const run = (seed: number) => {
    material.uniforms.uSeed.value = seed;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);
  };
  const timed = (seed: number) => {
    const t = performance.now();
    run(seed);
    return performance.now() - t;
  };
  let best = Infinity;
  try {
    run(0.1);
    target.setSize(SIDE / 2, SIDE / 2);
    run(0.15);
    const quarter = timed(0.2);
    if (quarter > REFERENCE.ms * 1.2) best = quarter * 4;
    else {
      target.setSize(SIDE, SIDE);
      run(0.25);
      for (let i = 0; i < 3; i++) best = Math.min(best, timed(0.3 + i * 0.1));
    }
  } catch {
    best = Infinity;
  }
  gl.setRenderTarget(was);
  target.dispose();
  geometry.dispose();
  material.dispose();
  return best;
}

/** Measures this device's GPU, once a visit (kept for the tab), and sets the budget. Before a stage's first frame. */
export function gauge(gl: WebGLRenderer) {
  if (gpu.fixed || gpu.ms > 0 || typeof window === 'undefined') return;
  let ms = 0;
  try {
    ms = Number(window.sessionStorage.getItem(STORE)) || 0;
  } catch {
    // No storage: measured again on the next page.
  }
  if (!(ms > 0)) {
    const t = performance.now();
    ms = time(gl);
    gpu.took = performance.now() - t;
    try {
      if (Number.isFinite(ms)) window.sessionStorage.setItem(STORE, ms.toFixed(2));
    } catch {
      // As above.
    }
  }
  if (!Number.isFinite(ms) || ms <= 0) return;
  gpu.ms = ms;
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  gpu.budget = Math.min(CEILING, REFERENCE.pixels * (REFERENCE.ms / ms) * (touch ? KEEP_TOUCH : KEEP));
  for (const tell of gpu.listeners) tell();
}

/** What a canvas had before any of this: the screen's pixels to the CSS pixel, between 1 and `ceiling`. */
export function plainDpr(ceiling: number) {
  const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(Math.max(device, 1), ceiling);
}

/**
 * Pixels to the CSS pixel for a canvas of this size (CSS pixels). The
 * screen's own, as far as the budget goes; never fewer than `plainDpr`. In
 * eighths, so a window being dragged does not change it at every step.
 */
export function dprOf(width: number, height: number, ceiling: number) {
  const plain = plainDpr(ceiling);
  const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  if (gpu.budget <= 0 || device <= plain) return plain;
  const fit = Math.floor(Math.sqrt(gpu.budget / Math.max(1, width * height)) * 8) / 8;
  return Math.max(plain, Math.min(device, MAX_DPR, fit));
}

/**
 * The device is not coping (post.tsx, Monitor): the extra pixels are given
 * up for the rest of the visit. True if there were any to give.
 */
export function giveUp() {
  if (gpu.fixed || gpu.budget <= 0) return false;
  gpu.budget = 0;
  for (const tell of gpu.listeners) tell();
  return true;
}
