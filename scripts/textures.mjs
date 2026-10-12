/**
 * Bakes the refined surface maps to public/textures/ (node scripts/textures.mjs).
 *
 * Drawn here, once, and shipped as files, not on the visitor's main thread
 * (kit/pbr.ts draws its sets at page load). Nothing is downloaded and
 * nothing is scanned: every map is made from seeded noise, so a run gives
 * the same files again. Each tiles in both directions.
 *
 * Normal maps follow three's convention (+V up) for an image that is
 * flipped on upload, as kit/pbr.ts has it: the files are read with
 * `imageOrientation: 'flipY'` (kit/textures.ts, fileTexture).
 *
 *   render-c/n/r    micro concrete on a shell's walls
 *   precast-c/n/r   precast concrete: footings, piers, slabs
 *   coat-n/r        a factory coat on sheet metal: the capsule's panels
 *   seam-n/r        standing-seam roofing, one pan (0.5 m) across the tile
 *   solar-c         a photovoltaic panel, one panel to the tile
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'textures');
mkdirSync(OUT, { recursive: true });
const S = 512;

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable gradient-free noise, 0-1: `cx` by `cy` cells in the first octave, each octave twice as fine and half as strong. */
function noise(cx, cy, seed, octaves = 4) {
  const out = new Float32Array(S * S);
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const nx = cx << o;
    const ny = cy << o;
    const r = prng(seed + o * 101);
    const grid = new Float32Array(nx * ny);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < S; y++) {
      const fy = (y / S) * ny;
      const j = Math.floor(fy);
      const ty = fy - j;
      const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
      const r0 = (j % ny) * nx;
      const r1 = ((j + 1) % ny) * nx;
      for (let x = 0; x < S; x++) {
        const fx = (x / S) * nx;
        const i = Math.floor(fx);
        const tx = fx - i;
        const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
        const i0 = i % nx;
        const i1 = (i + 1) % nx;
        out[y * S + x] += amp * (grid[r0 + i0] * (1 - sx) * (1 - sy) + grid[r0 + i1] * sx * (1 - sy) + grid[r1 + i0] * (1 - sx) * sy + grid[r1 + i1] * sx * sy);
      }
    }
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** A box blur that wraps, run three times: near enough a Gaussian of radius `r` pixels. */
function blur(src, r) {
  let a = src;
  for (let pass = 0; pass < 3; pass++) {
    for (const horizontal of [true, false]) {
      const b = new Float32Array(S * S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          let sum = 0;
          for (let k = -r; k <= r; k++) sum += horizontal ? a[y * S + ((x + k + S) % S)] : a[((y + k + S) % S) * S + x];
          b[y * S + x] = sum / (2 * r + 1);
        }
      a = b;
    }
  }
  return a;
}

/** Stretched to 0-1 between its own least and greatest. */
function level(f) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of f) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const out = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = (f[i] - lo) / (hi - lo || 1);
  return out;
}

/** Sand: every pixel its own grain, softened by a pixel. */
function grain(seed) {
  const r = prng(seed);
  const f = new Float32Array(S * S);
  for (let i = 0; i < f.length; i++) f[i] = r();
  return level(blur(f, 1));
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** A height field (0-1) as a tangent-space normal map; `strength` is the slope a full step between neighbours gives. */
function normalOf(height, strength) {
  const px = Buffer.alloc(S * S * 3);
  for (let y = 0; y < S; y++) {
    const up = ((y + S - 1) % S) * S;
    const dn = ((y + 1) % S) * S;
    for (let x = 0; x < S; x++) {
      const xl = (x + S - 1) % S;
      const xr = (x + 1) % S;
      const nx = -(height[y * S + xr] - height[y * S + xl]) * strength;
      const ny = (height[dn + x] - height[up + x]) * strength;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * S + x) * 3;
      px[i] = clamp((nx / l) * 127.5 + 127.5);
      px[i + 1] = clamp((ny / l) * 127.5 + 127.5);
      px[i + 2] = clamp((1 / l) * 127.5 + 127.5);
    }
  }
  return px;
}

/** A field as grey, `lo` to `hi` (0-1). */
function greyOf(field, lo, hi) {
  const px = Buffer.alloc(S * S * 3);
  for (let i = 0; i < field.length; i++) px[i * 3] = px[i * 3 + 1] = px[i * 3 + 2] = clamp(255 * (lo + (hi - lo) * field[i]));
  return px;
}

const sizes = [];
async function write(name, px, normal = false) {
  const file = path.join(OUT, `${name}.webp`);
  const info = await sharp(px, { raw: { width: S, height: S, channels: 3 } })
    .webp(normal ? { quality: 94, effort: 6, smartSubsample: true } : { quality: 88, effort: 6 })
    .toFile(file);
  sizes.push([name, info.size]);
}

/* ------------------------------------------------------------------ */

/**
 * Micro concrete, sprayed and floated: an even coat with a tooth. Its
 * colour barely moves (a cloud of two or three grey levels, no stains).
 * What the light finds is its grain, of one size all over and not in
 * blotches (the sand, and the float's fine stipple, a finger's breadth
 * across, which is what still reads from where the buildings are looked
 * at), and under it the float's shallow undulation. Each hollow of the
 * grain is a little darker, as a hollow is. The three maps are laid at
 * three different sizes (materials.ts), so no patch of wall is the same
 * as the next.
 */
async function render() {
  const cloud = level(noise(3, 3, 11, 5));
  const sand = grain(23);
  const stipple = level(noise(56, 56, 29, 2));
  const trowel = level(noise(5, 3, 37, 3));
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = stipple[i] * 0.5 + sand[i] * 0.22 + trowel[i] * 0.28;
  const c = Buffer.alloc(S * S * 3);
  for (let i = 0; i < S * S; i++) {
    const tooth = stipple[i] * 0.7 + sand[i] * 0.3;
    const k = 240 + (cloud[i] - 0.5) * 8 - Math.max(0, 0.5 - tooth) * 46;
    c[i * 3] = clamp(k);
    c[i * 3 + 1] = clamp(k - 0.5);
    c[i * 3 + 2] = clamp(k - 1.5);
  }
  await write('render-c', c, true);
  await write('render-n', normalOf(h, 7), true);
  await write('render-r', greyOf(level(noise(4, 4, 53, 4)), 0.84, 0.95));
}

/**
 * Precast concrete out of a steel mould: smooth and even, a few pinholes
 * where air stood against the form, a faint cloud. No speckle.
 */
async function precast() {
  const cloud = level(noise(4, 4, 61, 4));
  const fine = grain(67);
  const r = prng(71);
  const holes = new Float32Array(S * S);
  for (let n = 0; n < 140; n++) {
    const cx = r() * S;
    const cy = r() * S;
    const rad = 0.8 + r() * r() * 2.2;
    const depth = 0.4 + r() * 0.6;
    const reach = Math.ceil(rad * 2);
    for (let dy = -reach; dy <= reach; dy++)
      for (let dx = -reach; dx <= reach; dx++) {
        const d = Math.hypot(dx, dy) / rad;
        if (d >= 1.6) continue;
        const i = ((Math.round(cy) + dy + S) % S) * S + ((Math.round(cx) + dx + S) % S);
        holes[i] = Math.max(holes[i], depth * Math.exp(-d * d * 1.6));
      }
  }
  const h = new Float32Array(S * S);
  const c = Buffer.alloc(S * S * 3);
  for (let i = 0; i < S * S; i++) {
    h[i] = 1 - holes[i] * 0.85 + (fine[i] - 0.5) * 0.05 + (cloud[i] - 0.5) * 0.1;
    const k = 226 + (cloud[i] - 0.5) * 14 + (fine[i] - 0.5) * 4 - holes[i] * 46;
    c[i * 3] = clamp(k);
    c[i * 3 + 1] = clamp(k - 0.5);
    c[i * 3 + 2] = clamp(k - 2);
  }
  await write('precast-c', c);
  await write('precast-n', normalOf(h, 2.2), true);
  await write('precast-r', greyOf(level(noise(5, 5, 79, 3)), 0.68, 0.84));
}

/**
 * A factory coat on sheet metal: the faint orange peel of a baked coat,
 * and a sheet that is not perfectly flat, so that a highlight on it is not
 * a ruled line.
 */
async function coat() {
  const peel = level(noise(72, 72, 83, 2));
  const sheet = level(noise(2, 2, 89, 3));
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = sheet[i] * 0.86 + peel[i] * 0.14;
  await write('coat-n', normalOf(h, 7), true);
  await write('coat-r', greyOf(level(noise(3, 3, 97, 3)), 0.4, 0.5));
}

/**
 * Standing-seam roofing: one pan across the tile, the seam at its edge
 * (u = 0). Across the pan two shallow stiffening ribs; along it the slight
 * waviness a long flat pan of thin sheet has.
 */
async function seam() {
  const wave = level(noise(1, 5, 101, 2));
  const peel = level(noise(64, 64, 103, 2));
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S;
      // The pan turns up into the seam at each edge.
      const edge = Math.min(u, 1 - u);
      const up = Math.exp(-(edge * edge) / (2 * 0.022 * 0.022));
      const rib = Math.exp(-((u - 1 / 3) ** 2) / (2 * 0.014 * 0.014)) + Math.exp(-((u - 2 / 3) ** 2) / (2 * 0.014 * 0.014));
      h[y * S + x] = up * 0.5 + rib * 0.1 + (wave[y * S + x] - 0.5) * 0.16 * Math.sin(Math.PI * u) + (peel[y * S + x] - 0.5) * 0.012;
    }
  await write('seam-n', normalOf(h, 14), true);
  // A coat a little duller in streaks down the fall.
  await write('seam-r', greyOf(level(noise(6, 1, 107, 3)), 0.38, 0.48));
}

/**
 * A photovoltaic panel, the whole of it on the tile: an aluminium frame,
 * ten cells by six with the backsheet showing as a hair between them, and
 * the busbars across each cell. Dark and quiet: from where a roof is seen
 * it is a grid one can only just make out.
 */
async function solar() {
  const c = Buffer.alloc(S * S * 3);
  const r = prng(113);
  const cols = 10;
  const rows = 6;
  const tones = Array.from({ length: cols * rows }, () => (r() - 0.5) * 5);
  const fx = 0.016;
  const fy = 0.026;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const v = (y + 0.5) / S;
      let k = [172, 176, 181];
      if (u > fx && u < 1 - fx && v > fy && v < 1 - fy) {
        const cu = ((u - fx) / (1 - 2 * fx)) * cols;
        const cv = ((v - fy) / (1 - 2 * fy)) * rows;
        const gu = Math.min(cu % 1, 1 - (cu % 1));
        const gv = Math.min(cv % 1, 1 - (cv % 1));
        const t = tones[Math.min(rows - 1, Math.floor(cv)) * cols + Math.min(cols - 1, Math.floor(cu))];
        // The gap between two cells, then a busbar every third of a cell.
        if (gu < 0.05 || gv < 0.03) k = [64, 74, 90];
        else if (Math.abs(((cv % 1) * 3) % 1 - 0.5) < 0.035) k = [46, 56, 74];
        else k = [22 + t, 31 + t, 47 + t];
      }
      const i = (y * S + x) * 3;
      c[i] = clamp(k[0]);
      c[i + 1] = clamp(k[1]);
      c[i + 2] = clamp(k[2]);
    }
  await write('solar-c', c, true);
}

await render();
await precast();
await coat();
await seam();
await solar();
let total = 0;
for (const [name, size] of sizes) {
  total += size;
  console.log(`${name.padEnd(12)} ${(size / 1024).toFixed(1)} kB`);
}
console.log(`total        ${(total / 1024).toFixed(1)} kB`);
