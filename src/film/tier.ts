/**
 * How much a touch device is asked to draw (the mobile and tablet round,
 * 2026-10-14: "i pad and other premium tabs, it is okay but for budget tab
 * we have fall back"). Desktop is never measured here and is never `lite`:
 * its pictures are not touched.
 *
 * A touch device's GPU is measured once a visit, before its first stage
 * mounts, with the same fixed piece of shading that kit/gpu.ts times on the
 * stage's own renderer (`gauge`), kept under the same key in the tab's
 * session storage, so that the two agree and the stage does not measure
 * again. Plain WebGL here, no three.js: this module is in the films' own
 * code, which is loaded before any 3D is.
 *
 * `lite`: a GPU well behind the test laptop's (REFERENCE in kit/gpu.ts; a
 * budget tablet or phone). Its stages draw one pixel to the CSS pixel, with
 * no ambient occlusion and a smaller shadow map (Stage), and the films that
 * build the most see their phone's version: the hero's showroom
 * (HeroMobileScene) and the factory without the back of its yard. The
 * desktop layout is kept on a tablet held sideways: only what is drawn is
 * lighter. A moving picture and a still one stay the same picture: this is
 * decided once, before anything is seen.
 *
 * Since 2026-10-15 (developer: a tablet held sideways showed the fallback,
 * "ensure this layout is only for low end tabs, if a tab like ipad, android
 * tab with high gpu, uses desktop version") the GPU's own name decides
 * first, where the browser gives it: an iPad's, a recent Adreno's, Mali's
 * or Xclipse's is never lite, a known budget one always is. Only a GPU it
 * does not know is timed, and the time no longer counts the wait for the
 * answer, which on a phone or a tablet can be longer than the drawing
 * itself and was counted four times over (`measure`).
 */
import { TOUCH_QUERY } from './device';

/** kit/gpu.ts, STORE and REFERENCE.ms: the same reading, the same test laptop. The tier's own reading is kept apart (TIER), so that one made by the measure before 2026-10-15 is not taken for it. */
const STORE = 'vee:gpu';
const TIER = 'vee:tier';
const REFERENCE_MS = 3.3;
/** Slower than this many times the laptop's GPU: lite. */
const LITE_AFTER = 4;

let reading: number | null = null;

/* The fixed piece of shading: kit/gpu.ts, FRAGMENT. Kept the same, so the readings are one. */
const VERTEX = `#version 300 es
in vec3 position;
void main() { gl_Position = vec4( position, 1.0 ); }`;
const FRAGMENT = `#version 300 es
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

/** The piece, timed to its last pixel, as kit/gpu.ts times it: the least of a few runs at 1024 px square. */
function measure(): number {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return Infinity;
  let best = Infinity;
  try {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(prog, 0, 'position');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return Infinity;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const seed = gl.getUniformLocation(prog, 'uSeed');
    const tex = gl.createTexture();
    const fb = gl.createFramebuffer();
    const pixel = new Uint8Array(4);
    const size = (side: number) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, side, side, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, side, side);
    };
    const run = (s: number) => {
      gl.uniform1f(seed, s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    };
    const timed = (s: number) => {
      const t = performance.now();
      run(s);
      return performance.now() - t;
    };
    size(16);
    run(0.1);
    // The wait for the answer, on a few pixels: taken off every reading, so that only the drawing is counted.
    let wait = Infinity;
    for (let i = 0; i < 3; i++) wait = Math.min(wait, timed(0.11 + i * 0.01));
    size(512);
    run(0.15);
    const quarter = Math.max(0, timed(0.2) - wait);
    // Well behind on a quarter of the piece: no need to ask it for the whole.
    if (quarter > REFERENCE_MS * LITE_AFTER * 0.6) best = quarter * 4;
    else {
      size(1024);
      run(0.25);
      for (let i = 0; i < 3; i++) best = Math.min(best, Math.max(0, timed(0.3 + i * 0.1) - wait));
    }
  } catch {
    best = Infinity;
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return best;
}

/**
 * What the GPU's own name says, where the browser gives it: 'high' (an
 * iPad's or a phone's of the last years, or any desktop part), 'low' (a
 * known budget part), or null (not given, or not known: timed instead).
 */
export function gpuClass(name: string): 'high' | 'low' | null {
  const n = name.toLowerCase();
  if (/apple|nvidia|geforce|radeon|amd|intel|xclipse|immortalis/.test(n)) return 'high';
  const adreno = /adreno[^0-9]*(\d{3})/.exec(n);
  if (adreno) {
    const v = +adreno[1];
    // 6xx from the 640 up, and every 7xx and 8xx: Snapdragon 855 and after, and the 7-series parts.
    return v >= 640 ? 'high' : 'low';
  }
  const mali = /mali-?([gt])(\d+)/.exec(n);
  if (mali) {
    if (mali[1] === 't') return 'low';
    const v = +mali[2];
    // G71 to G78, and the G610 and after (G710, G715, G720 ...); the G31 to G57 are budget parts; a G68 is timed.
    if ((v >= 71 && v <= 78) || v >= 610) return 'high';
    return v === 68 ? null : 'low';
  }
  if (/powervr|sgx|ge8\d{3}|videocore|vivante/.test(n)) return 'low';
  return null;
}

/** The GPU's name, from a context made for the purpose; '' where the browser keeps it. */
function gpuName(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** The GPU's reading on a touch device, in milliseconds; null elsewhere (desktop is not measured here). */
export function touchReading(): number | null {
  if (typeof window === 'undefined' || !window.matchMedia(TOUCH_QUERY).matches) return null;
  if (reading !== null) return reading;
  let ms = 0;
  try {
    ms = Number(window.sessionStorage.getItem(TIER)) || 0;
  } catch {
    // No storage: measured once for this page.
  }
  if (!(ms > 0)) {
    ms = measure();
    try {
      if (Number.isFinite(ms)) {
        window.sessionStorage.setItem(TIER, ms.toFixed(2));
        window.sessionStorage.setItem(STORE, Math.max(ms, 0.1).toFixed(2));
      }
    } catch {
      // As above.
    }
  }
  reading = ms;
  return ms;
}

let named: 'high' | 'low' | null | undefined;

/**
 * A budget touch device: draw lighter (above). `?lite=1` forces it and
 * `?lite=0` rules it out, for QA, on any device.
 */
export function isLite(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search).get('lite');
  if (q === '1') return true;
  if (q === '0') return false;
  if (typeof window === 'undefined' || !window.matchMedia(TOUCH_QUERY).matches) return false;
  if (named === undefined) named = gpuClass(gpuName());
  if (named) return named === 'low';
  // A device that says it has little memory is a budget one, whatever its GPU (Chrome gives it, rounded down).
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory <= 2) return true;
  const ms = touchReading();
  return ms !== null && ms > REFERENCE_MS * LITE_AFTER;
}
