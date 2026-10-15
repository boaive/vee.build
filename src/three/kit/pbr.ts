/**
 * Physically based texture sets, drawn procedurally once and cached: colour,
 * normal and roughness for the materials that carry a scene's realism
 * (render, precast concrete, timber, gravel, grass, bark, leaves, asphalt,
 * soil, ribbed sheeting). Nothing is downloaded.
 *
 * Normal maps follow three's convention (OpenGL, +V up); canvases are drawn
 * y-down and flipped on upload, which the height-to-normal pass accounts for.
 */
import { RepeatWrapping, type Texture } from 'three';
import { canvasTexture, noiseField, prng } from './textures';

export interface PBRSet {
  map: Texture | null;
  normalMap: Texture | null;
  roughnessMap?: Texture | null;
}

/** Tileable height field → tangent-space normal map. */
function normalFromHeight(key: string, size: number, height: Float32Array, strength: number) {
  return canvasTexture(
    key,
    size,
    (g, s) => {
      const img = g.createImageData(s, s);
      const data = img.data;
      for (let y = 0; y < s; y++) {
        const row = y * s;
        const up = ((y + s - 1) % s) * s;
        const dn = ((y + 1) % s) * s;
        for (let x = 0; x < s; x++) {
          const xl = (x + s - 1) % s;
          const xr = (x + 1) % s;
          const nx = -(height[row + xr] - height[row + xl]) * strength;
          const ny = (height[dn + x] - height[up + x]) * strength;
          const l = Math.sqrt(nx * nx + ny * ny + 1);
          const i = (row + x) * 4;
          data[i] = (nx / l) * 127.5 + 127.5;
          data[i + 1] = (ny / l) * 127.5 + 127.5;
          data[i + 2] = (1 / l) * 127.5 + 127.5;
          data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    },
    false,
  );
}

/** Greyscale field → data texture on a canvas (roughness, masks). */
function greyFromField(key: string, size: number, field: Float32Array, lo: number, hi: number, color = false) {
  return canvasTexture(
    key,
    size,
    (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < field.length; i++) {
        const k = Math.round(255 * (lo + (hi - lo) * field[i]));
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = k;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    },
    color,
  );
}

/** Render height into a Float32Array by drawing on a scratch canvas (for stroke-based patterns). */
function drawnHeight(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): Float32Array {
  const out = new Float32Array(size * size);
  if (typeof document === 'undefined') return out;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return out;
  draw(g, size);
  const d = g.getImageData(0, 0, size, size).data;
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

const memo = new Map<string, PBRSet>();
function set(key: string, make: () => PBRSet): PBRSet {
  let s = memo.get(key);
  if (!s) {
    s = make();
    memo.set(key, s);
  }
  return s;
}

/** A copy of a texture with its own tiling (UVs in metres → `metres` per repeat). */
export function tile<T extends Texture | null | undefined>(t: T, metres: number): T {
  if (!t) return t;
  const c = t.clone();
  c.wrapS = c.wrapT = RepeatWrapping;
  c.repeat.set(1 / metres, 1 / metres);
  c.needsUpdate = true;
  return c as T;
}

/* ------------------------------------------------------------------ */

/** Render on precast walls: fine sand grain, soft trowel undulation, faint weathering. */
export function renderSet() {
  return set('render', () => {
    const S = 512;
    const fine = noiseField(S, 96, 11, 2);
    const mid = noiseField(S, 12, 5, 3);
    const soft = noiseField(S, 3, 9, 3);
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = fine[i] * 0.55 + mid[i] * 0.3 + soft[i] * 0.15;
    const map = canvasTexture('render-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const k = 226 + mid[i] * 18 + soft[i] * 14 - (fine[i] > 0.82 ? 14 : 0);
        img.data[i * 4] = k;
        img.data[i * 4 + 1] = k - 1;
        img.data[i * 4 + 2] = k - 3;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return {
      map,
      normalMap: normalFromHeight('render-n', S, h, 3.2),
      roughnessMap: greyFromField('render-r', S, mid, 0.78, 0.96),
    };
  });
}

/** Precast concrete: smooth with pores and faint mottling (footings, plinths, slabs). */
export function concreteSet() {
  return set('concrete', () => {
    const S = 512;
    const r = prng(77);
    const mott = noiseField(S, 6, 21, 4);
    const grain = noiseField(S, 128, 31, 1);
    const pores = drawnHeight(S, (g, s) => {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const rad = 0.4 + r() * r() * 2.4;
        g.fillStyle = `rgba(0,0,0,${0.35 + r() * 0.5})`;
        g.beginPath();
        g.arc(r() * s, r() * s, rad, 0, Math.PI * 2);
        g.fill();
      }
    });
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = pores[i] * 0.7 + grain[i] * 0.15 + mott[i] * 0.15;
    const map = canvasTexture('concrete-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const k = 200 + mott[i] * 40 + grain[i] * 10 - (1 - pores[i]) * 70;
        img.data[i * 4] = k;
        img.data[i * 4 + 1] = k - 1;
        img.data[i * 4 + 2] = k - 4;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return { map, normalMap: normalFromHeight('concrete-n', S, h, 2.4), roughnessMap: greyFromField('concrete-r', S, mott, 0.72, 0.92) };
  });
}

/** Timber decking along u: boards, grain, gaps. Neutral so the finish colour tints it. Tile = 1 m. */
export function timberSet() {
  return set('timber', () => {
    const S = 512;
    const r = prng(41);
    const boards = 7;
    const bh = S / boards;
    const tones = Array.from({ length: boards }, () => 0.78 + r() * 0.22);
    const seams = Array.from({ length: boards }, () => Math.round(r() * S));
    const grain = noiseField(S, 4, 13, 3);
    const h = new Float32Array(S * S);
    const map = canvasTexture('timber-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let y = 0; y < s; y++) {
        const b = Math.min(boards - 1, Math.floor(y / bh));
        const yb = y - b * bh;
        for (let x = 0; x < s; x++) {
          const i = y * s + x;
          const w = Math.sin((x / s) * Math.PI * 2 * (3 + b) + yb * 0.55 + grain[i] * 9) * 0.5 + 0.5;
          const ring = Math.pow(w, 6);
          const gap = yb < 3 || Math.abs(x - seams[b]) < 2;
          const k = gap ? 60 : 255 * tones[b] * (0.86 + 0.08 * w - 0.12 * ring);
          img.data[i * 4] = k;
          img.data[i * 4 + 1] = k;
          img.data[i * 4 + 2] = k;
          img.data[i * 4 + 3] = 255;
          h[i] = gap ? 0 : 0.75 + 0.15 * w - 0.1 * ring;
        }
      }
      g.putImageData(img, 0, 0);
    });
    return { map, normalMap: normalFromHeight('timber-n', S, h, 2.2), roughnessMap: greyFromField('timber-r', S, grain, 0.62, 0.86) };
  });
}

/** Gravel: packed stones of mixed size. Tile = 2 m. */
export function gravelSet() {
  return set('gravel', () => {
    const S = 512;
    const r = prng(5);
    const stones: [number, number, number, number, number][] = [];
    for (let i = 0; i < 5200; i++) stones.push([r() * S, r() * S, 1.4 + r() * 3.4, r() * 3, 0.55 + r() * 0.45]);
    const h = drawnHeight(S, (g, s) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, s, s);
      for (const [x, y, d, a, k] of stones) {
        const grd = g.createRadialGradient(x, y, 0, x, y, d);
        grd.addColorStop(0, `rgb(${255 * k},${255 * k},${255 * k})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x, y, d, d * 0.75, a, 0, Math.PI * 2);
        g.fill();
      }
    });
    const map = canvasTexture('gravel-map', S, (g, s) => {
      g.fillStyle = '#7d766b';
      g.fillRect(0, 0, s, s);
      for (const [x, y, d, a, k] of stones) {
        const t = 120 + k * 110;
        g.fillStyle = `rgb(${t},${t * 0.96},${t * 0.9})`;
        g.beginPath();
        g.ellipse(x, y, d * 0.9, d * 0.68, a, 0, Math.PI * 2);
        g.fill();
      }
    });
    return { map, normalMap: normalFromHeight('gravel-n', S, h, 3), roughnessMap: null };
  });
}

/** Grass seen from above: blades over soil, varied greens with dry straw. Tile ≈ 1.5 m. */
export function grassSet() {
  return set('grass', () => {
    const S = 512;
    const r = prng(19);
    const blades: [number, number, number, number, string, number][] = [];
    for (let i = 0; i < 9000; i++) {
      const dry = r() < 0.18;
      const k = r();
      // Near-neutral: the ground's vertex colour carries the hue.
      const v = 170 + k * 85;
      const col = dry ? `rgb(${v},${v * 0.97},${v * 0.86})` : `rgb(${v * 0.93},${v},${v * 0.9})`;
      blades.push([r() * S, r() * S, 4 + r() * 10, r() * Math.PI * 2, col, 0.5 + r() * 0.5]);
    }
    const map = canvasTexture('grass-map', S, (g, s) => {
      g.fillStyle = '#8f8f86';
      g.fillRect(0, 0, s, s);
      g.lineCap = 'round';
      for (const [x, y, l, a, col] of blades) {
        g.strokeStyle = col;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    });
    const h = drawnHeight(S, (g, s) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, s, s);
      g.lineCap = 'round';
      for (const [x, y, l, a, , k] of blades) {
        g.strokeStyle = `rgba(255,255,255,${k})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    });
    return { map, normalMap: normalFromHeight('grass-n', S, h, 2.5), roughnessMap: null };
  });
}

/** Bare and backfilled soil. Tile = 2 m. */
export function soilSet() {
  return set('soil', () => {
    const S = 512;
    const a = noiseField(S, 24, 3, 3);
    const b = noiseField(S, 96, 8, 2);
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.6 + b[i] * 0.4;
    const map = canvasTexture('soil-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const k = 0.75 + a[i] * 0.35 + (b[i] - 0.5) * 0.3;
        img.data[i * 4] = 128 * k;
        img.data[i * 4 + 1] = 98 * k;
        img.data[i * 4 + 2] = 70 * k;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return { map, normalMap: normalFromHeight('soil-n', S, h, 4), roughnessMap: null };
  });
}

/** Asphalt with aggregate and wear. Tile = 3 m. */
export function asphaltSet() {
  return set('asphalt', () => {
    const S = 512;
    const r = prng(91);
    const wear = noiseField(S, 5, 7, 4);
    const speck = drawnHeight(S, (g, s) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 16000; i++) {
        const k = r();
        g.fillStyle = `rgba(255,255,255,${0.2 + k * 0.8})`;
        g.fillRect(r() * s, r() * s, 1 + r() * 1.6, 1 + r() * 1.6);
      }
    });
    const map = canvasTexture('asphalt-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const k = 52 + wear[i] * 26 + speck[i] * 40;
        img.data[i * 4] = k;
        img.data[i * 4 + 1] = k;
        img.data[i * 4 + 2] = k * 1.02;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return { map, normalMap: normalFromHeight('asphalt-n', S, speck, 1.6), roughnessMap: greyFromField('asphalt-r', S, wear, 0.82, 0.95) };
  });
}

/** Bark: vertical fissures. Tile ≈ 0.6 m. */
export function barkSet() {
  return set('bark', () => {
    const S = 256;
    const h = new Float32Array(S * S);
    const n = noiseField(S, 8, 61, 3);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const v = Math.sin((x / S) * Math.PI * 2 * 9 + n[i] * 7) * 0.5 + 0.5;
        h[i] = Math.pow(v, 0.6) * 0.8 + n[i] * 0.2;
      }
    const map = canvasTexture('bark-map', S, (g, s) => {
      const img = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const k = 0.55 + h[i] * 0.5;
        img.data[i * 4] = 95 * k;
        img.data[i * 4 + 1] = 80 * k;
        img.data[i * 4 + 2] = 66 * k;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return { map, normalMap: normalFromHeight('bark-n', S, h, 4), roughnessMap: null };
  });
}

/** Ribbed metal sheeting (sheds): trapezoidal ribs along v. Tile = 1 m across the ribs. */
export function ribSet() {
  return set('rib', () => {
    const S = 256;
    const h = new Float32Array(S * S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = (x / S) * 5;
        const f = u - Math.floor(u);
        h[y * S + x] = f < 0.2 ? 1 : f < 0.3 ? 1 - (f - 0.2) * 10 : f < 0.9 ? 0 : (f - 0.9) * 10;
      }
    return { map: null, normalMap: normalFromHeight('rib-n', S, h, 6), roughnessMap: null };
  });
}

/**
 * Leaf cluster on transparent ground, for foliage cards. Greys are
 * neutral-green so the material colour sets the season.
 */
export function leafCard() {
  return canvasTexture('leaf-card', 256, (g, s) => {
    const r = prng(303);
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * s * 0.4;
      const x = s / 2 + Math.cos(a) * d;
      const y = s / 2 + Math.sin(a) * d;
      const len = 16 + r() * 16;
      const k = Math.min(1, 0.62 + r() * 0.42);
      g.save();
      g.translate(x, y);
      g.rotate(a + (r() - 0.5) * 1.2);
      g.fillStyle = `rgb(${Math.round(225 * k)},${Math.round(235 * k)},${Math.round(212 * k)})`;
      g.beginPath();
      g.ellipse(0, 0, len, len * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `rgba(40,55,25,0.35)`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-len, 0);
      g.lineTo(len, 0);
      g.stroke();
      g.restore();
    }
  });
}

/** Timber lattice for deck skirting (ref H6): diagonal slats on transparent ground. Tile ≈ 0.6 m. */
export function latticeCard() {
  return canvasTexture('lattice-card', 256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#ffffff';
    g.lineWidth = s * 0.075;
    g.lineCap = 'butt';
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * (s / 2), 0);
      g.lineTo(i * (s / 2) + s, s);
      g.stroke();
      g.beginPath();
      g.moveTo(i * (s / 2) + s, 0);
      g.lineTo(i * (s / 2), s);
      g.stroke();
    }
  });
}

/**
 * Every set, one an idle moment, once the opening card is up (film/prefetch.ts).
 * Each is drawn on the main thread the first time it is asked for; asked for by
 * a scene mounting as the page is scrolled to it, that was a stall of up to a
 * fifth of a second on a phone, in the middle of the scroll (2026-10-15).
 */
export const prepare: (() => void)[] = [concreteSet, renderSet, timberSet, gravelSet, asphaltSet, soilSet, ribSet, grassSet, barkSet, leafCard, latticeCard].map((make) => () => void make());
