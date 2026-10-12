/**
 * Procedural textures, drawn once on a canvas at runtime: stucco for the
 * shells (as the client's render), timber decking, gravel, ground grain.
 * Server-side (no document) they resolve to null. The refined finishes'
 * maps are not drawn here: they are baked to files (fileTexture, below).
 */
import { CanvasTexture, Float32BufferAttribute, RepeatWrapping, SRGBColorSpace, Texture, type BufferGeometry } from 'three';

export type Draw = (g: CanvasRenderingContext2D, size: number) => void;

const cache = new Map<string, Texture | null>();

export function canvasTexture(key: string, size: number, draw: Draw, color = true): Texture | null {
  if (cache.has(key)) return cache.get(key)!;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return null;
  draw(g, size);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/* ------------------------------------------------------------------ */
/* Baked maps                                                          */
/* ------------------------------------------------------------------ */

interface Sheet {
  /** The one texture that holds the file; every use is a clone of it, and three keeps one copy on the GPU for all of them. */
  base: Texture;
  users: Texture[];
}
const sheets = new Map<string, Sheet>();

/** Asked for by the stages: a baked map has arrived, draw again. */
export const TEXTURES_EVENT = 'vee:textures';

/**
 * A map baked to public/textures (scripts/textures.mjs), laid `per` UV
 * units to the tile. Nothing of it is drawn on the main thread: the file is
 * fetched and decoded off it, and until it is in the surface carries one
 * pixel of the map's own mean (`flat`, 0-255), so a material has its maps
 * from its first frame, compiles once, and looks nearly as it will. Each
 * call returns a texture of its own with its own tiling.
 */
export function fileTexture(name: string, flat: [number, number, number], per = 1, color = false): Texture | null {
  if (typeof document === 'undefined') return null;
  let sheet = sheets.get(name);
  if (!sheet) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = `rgb(${flat[0]},${flat[1]},${flat[2]})`;
    g.fillRect(0, 0, 1, 1);
    const base: Texture = new Texture(c);
    base.wrapS = base.wrapT = RepeatWrapping;
    base.anisotropy = 8;
    // The file is turned over as it is decoded (below): three does not flip a bitmap.
    base.flipY = false;
    if (color) base.colorSpace = SRGBColorSpace;
    const made: Sheet = (sheet = { base, users: [] });
    sheets.set(name, made);
    fetch(`${import.meta.env.BASE_URL}textures/${name}.webp`)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then((bitmap) => {
        // A texture's size cannot change once it is on the GPU: each use lets go of the pixel and takes the file.
        for (const t of made.users) t.dispose();
        base.image = bitmap;
        base.source.needsUpdate = true;
        for (const t of made.users) t.needsUpdate = true;
        window.dispatchEvent(new Event(TEXTURES_EVENT));
      })
      // Without the file the surface keeps its mean: plainer, not wrong.
      .catch(() => {});
  }
  const t = sheet.base.clone();
  t.repeat.set(1 / per, 1 / per);
  t.needsUpdate = true;
  sheet.users.push(t);
  return t;
}

/** Seeded PRNG so textures are identical on every visit. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tileable value noise into an ImageData buffer, 0–1 per pixel. This runs on
 * the main thread before the first picture, so the inner loop is kept bare:
 * the lattice lookups along x are the same on every row and are worked out
 * once per octave.
 */
export function noiseField(size: number, cells: number, seed: number, octaves = 4) {
  const out = new Float32Array(size * size);
  const x0 = new Int32Array(size);
  const x1 = new Int32Array(size);
  const sx = new Float64Array(size);
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const r = prng(seed + o * 101);
    const grid = new Float64Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * n;
      const i = Math.floor(fx);
      const t = fx - i;
      x0[x] = i % n;
      x1[x] = (i + 1) % n;
      sx[x] = t * t * (3 - 2 * t);
    }
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const j = Math.floor(fy);
      const ty = fy - j;
      const sy = ty * ty * (3 - 2 * ty);
      const r0 = (j % n) * n;
      const r1 = ((j + 1) % n) * n;
      const row = y * size;
      for (let x = 0; x < size; x++) {
        const s = sx[x];
        const v = grid[r0 + x0[x]] * (1 - s) * (1 - sy) + grid[r0 + x1[x]] * s * (1 - sy) + grid[r1 + x0[x]] * (1 - s) * sy + grid[r1 + x1[x]] * s * sy;
        out[row + x] += v * amp;
      }
    }
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

export function paintField(g: CanvasRenderingContext2D, size: number, field: Float32Array, map: (v: number, i: number) => [number, number, number]) {
  const img = g.createImageData(size, size);
  for (let i = 0; i < field.length; i++) {
    const [r, gg, b] = map(field[i], i);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = gg;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/** Stucco: fine grain over soft mottling. Use as a bump map; tile every ~1.5 m. */
export function stuccoBump() {
  return canvasTexture(
    'stucco-bump',
    512,
    (g, s) => {
      const fine = noiseField(s, 64, 7, 2);
      const soft = noiseField(s, 4, 3, 3);
      paintField(g, s, fine, (v, i) => {
        const k = Math.round(255 * Math.min(1, Math.max(0, v * 0.8 + soft[i] * 0.2)));
        return [k, k, k];
      });
    },
    false,
  );
}

/** A faint colour variation for render-like walls (multiplies the finish colour). */
export function stuccoTint() {
  return canvasTexture('stucco-tint', 256, (g, s) => {
    const soft = noiseField(s, 3, 19, 4);
    paintField(g, s, soft, (v) => {
      const k = Math.round(232 + v * 23);
      return [k, k, k];
    });
  });
}

/**
 * Timber decking: boards along u, each its own tone, with grain and gaps.
 * Neutral grey, so the deck finish colour sets the wood. Tile = 1 m.
 */
export function deckBoards() {
  return canvasTexture('deck-boards', 512, (g, s) => {
    const r = prng(41);
    const boards = 7;
    const bh = s / boards;
    for (let b = 0; b < boards; b++) {
      const tone = 0.82 + r() * 0.18;
      const y0 = Math.round(b * bh);
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < s; x += 2) {
          const grain = 0.9 + 0.1 * Math.sin((x / s) * Math.PI * 2 * (3 + b) + y * 0.9 + Math.sin(x * 0.05 + b) * 2);
          const k = Math.round(255 * tone * grain);
          g.fillStyle = `rgb(${k},${k},${k})`;
          g.fillRect(x, y0 + y, 2, 1);
        }
      }
      g.fillStyle = 'rgb(70,70,70)';
      g.fillRect(0, y0, s, 3);
      g.fillRect(Math.round(r() * s), y0, 2, bh);
    }
  });
}

/** Gravel: dense speckle in warm greys. Tile = 2 m. */
export function gravel() {
  return canvasTexture('gravel', 512, (g, s) => {
    const r = prng(5);
    g.fillStyle = '#b9b2a6';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 14000; i++) {
      const x = r() * s;
      const y = r() * s;
      const k = 120 + r() * 120;
      g.fillStyle = `rgb(${k},${k * 0.96},${k * 0.9})`;
      const d = 1 + r() * 2.6;
      g.beginPath();
      g.ellipse(x, y, d, d * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Ground grain: soft mottling with fine texture, near-white so it tints. Tile = 24 m. */
export function groundGrain() {
  return canvasTexture('ground-grain', 512, (g, s) => {
    const fine = noiseField(s, 48, 23, 2);
    const soft = noiseField(s, 3, 29, 3);
    paintField(g, s, fine, (v, i) => {
      const k = Math.round(212 + v * 22 + soft[i] * 21);
      return [k, k, k];
    });
  });
}

/** Concrete: finer and flatter than stucco. Tile = 2 m. */
export function concreteGrain() {
  return canvasTexture('concrete', 256, (g, s) => {
    const fine = noiseField(s, 32, 13, 3);
    paintField(g, s, fine, (v) => {
      const k = Math.round(222 + v * 33);
      return [k, k, k];
    });
  });
}

/**
 * Box-projected UVs in metres: each vertex takes the two coordinates of the
 * plane its normal faces, so textures keep their real scale on any part.
 */
export function boxUV(geo: BufferGeometry, scale = 1) {
  const p = geo.attributes.position;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nn = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nn.getX(i));
    const ay = Math.abs(nn.getY(i));
    const az = Math.abs(nn.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = p.getX(i);
      v = p.getZ(i);
    } else if (ax >= az) {
      u = p.getZ(i);
      v = p.getY(i);
    } else {
      u = p.getX(i);
      v = p.getY(i);
    }
    uv[i * 2] = u / scale;
    uv[i * 2 + 1] = v / scale;
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geo;
}
