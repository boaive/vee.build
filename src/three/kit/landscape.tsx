/**
 * Landscape for the outdoor scenes: rolling ground that turns into hills
 * at the horizon, instanced grass tufts and wild flowers near the camera,
 * leaf-card trees that glow when the sun is behind them, distant tree
 * lines, and a rural fence. Everything is seeded and static: a scene looks
 * the same on every visit and costs nothing between frames.
 */
import { clearing } from './atmosphere';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, rng } from './env';
import { cyl, memo } from './geometry';
import { barkSet, grassSet, leafCard, tile } from './pbr';

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

export interface LandPalette {
  grass: string;
  grassDry: string;
  grassDark: string;
  leaves: string[];
  trunk: string;
  far: string;
  flowers: string[];
}

export const LAND: Record<'gold' | 'day' | 'dusk', LandPalette> = {
  gold: {
    grass: '#6f7a3a',
    grassDry: '#a99a55',
    grassDark: '#3f4a23',
    leaves: ['#5b6b2c', '#6c7a33', '#4c5c28', '#7a8338'],
    trunk: '#4a3b2d',
    far: '#4d5530',
    flowers: ['#f2e9d8', '#f0c75a', '#c98fb5'],
  },
  day: {
    grass: '#6a7f3c',
    grassDry: '#a59b62',
    grassDark: '#3d5226',
    leaves: ['#4f6a2e', '#5d7834', '#45602a', '#6a8238'],
    trunk: '#54463a',
    far: '#4a5a34',
    flowers: ['#f4f1ea', '#f2cf55', '#b98ccf'],
  },
  dusk: {
    grass: '#3d4630',
    grassDry: '#5c5a40',
    grassDark: '#232a1d',
    leaves: ['#2f3b29', '#38452e', '#29341f', '#404c31'],
    trunk: '#2a241f',
    far: '#232a24',
    flowers: ['#c9c6d6', '#c6b07a', '#8e7ca8'],
  },
};

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** The rectangle is turned by this angle about y (radians), about `pivot` (the origin by default). */
  turn?: number;
  pivot?: readonly [number, number];
}

const inside = (rects: readonly Rect[] | undefined, x: number, z: number, pad = 0) =>
  !!rects?.some((r) => {
    let px = x;
    let pz = z;
    if (r.turn) {
      // Into the rectangle's own frame: the inverse of a turn about y.
      const [ox, oz] = r.pivot ?? [0, 0];
      const c = Math.cos(r.turn);
      const sn = Math.sin(r.turn);
      px = ox + (x - ox) * c - (z - oz) * sn;
      pz = oz + (x - ox) * sn + (z - oz) * c;
    }
    return px > r.x0 - pad && px < r.x1 + pad && pz > r.z0 - pad && pz < r.z1 + pad;
  });

/** A strip of ground along a polyline, as turned rectangles: for keeping a path clear of grass. */
export function strip(pts: readonly (readonly [number, number])[], width: number): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0) + width * 0.5;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    out.push({ x0: mx - len / 2, x1: mx + len / 2, z0: mz - width / 2, z1: mz + width / 2, turn: Math.atan2(-(z1 - z0), x1 - x0), pivot: [mx, mz] });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ground                                                              */
/* ------------------------------------------------------------------ */

export interface GroundProps {
  palette: LandPalette;
  /** Level within this radius of the origin, rolling beyond. */
  flat?: number;
  /** Height of the far hills, metres. */
  hills?: number;
  size?: number;
  seed?: number;
  /** Areas kept bare (pads, roads): coloured as soil under their own surfacing. */
  bare?: Rect[];
  /** Cultivated patches painted into the ground colour: crops in rows. */
  fields?: FieldPatch[];
}

export interface FieldPatch {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Turn about y, radians. */
  angle?: number;
  /** Colours of alternating strips. */
  colors: string[];
  /** Strip width, metres. */
  strip?: number;
}

/** Height of the ground at (x, z) for a Ground with these settings. */
export function groundHeight(x: number, z: number, flat = 40, hills = 22, seed = 4) {
  const d = Math.hypot(x, z);
  const roll = Math.min(1, Math.max(0, (d - flat) / 160));
  const far = Math.min(1, Math.max(0, (d - 380) / 420));
  const n = fbm(x / 140, z / 140, seed) - 0.42;
  const m = fbm(x / 45, z / 45, seed + 5) - 0.5;
  return roll * (n * 7 + m * 1.6) + far * far * hills * (0.55 + fbm(x / 260, z / 260, seed + 9));
}

export function Ground({ palette, flat = 40, hills = 22, size = 3600, seed = 4, fields }: GroundProps) {
  const geo = useMemo(() => {
    // Denser near the middle: square rings of growing step.
    const g = new PlaneGeometry(size, size, 240, 240);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    // Pull vertices toward the centre so detail concentrates where the camera looks.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const k = Math.hypot(x, z) / (size / 2);
      const s = Math.pow(Math.min(1, k), 2.2) / Math.max(1e-6, Math.min(1, k));
      pos.setX(i, x * s);
      pos.setZ(i, z * s);
    }
    const colors = new Float32Array(pos.count * 3);
    const cg = new Color(palette.grass);
    const cd = new Color(palette.grassDry);
    const ck = new Color(palette.grassDark);
    const cf = new Color(palette.far);
    const c = new Color();
    const tmp = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z, flat, hills, seed) - 0.02);
      c.copy(cg).lerp(cd, Math.min(1, Math.max(0, (fbm(x / 38, z / 38, seed + 3) - 0.48) * 2.4)) * 0.85);
      c.lerp(ck, Math.min(1, Math.max(0, (fbm(x / 17, z / 17, seed + 7) - 0.55) * 2.2)) * 0.5);
      if (fields)
        for (const f of fields) {
          const ca = Math.cos(f.angle ?? 0);
          const sa = Math.sin(f.angle ?? 0);
          const lx = (x - f.x) * ca + (z - f.z) * sa;
          const lz = -(x - f.x) * sa + (z - f.z) * ca;
          if (Math.abs(lx) > f.w / 2 || Math.abs(lz) > f.d / 2) continue;
          const k = Math.floor((lx + f.w / 2) / (f.strip ?? 9));
          const edge = Math.min(1, (f.w / 2 - Math.abs(lx)) / 4, (f.d / 2 - Math.abs(lz)) / 4);
          c.lerp(tmp.set(f.colors[k % f.colors.length]), 0.85 * edge);
        }
      c.lerp(cf, Math.min(1, Math.max(0, (Math.hypot(x, z) - 160) / 400)) * 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    // UVs in metres for the detail textures.
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
    g.computeVertexNormals();
    return g;
  }, [palette, flat, hills, size, seed, fields]);

  const material = useMemo(() => {
    const s = grassSet();
    return clearing(
      new MeshStandardMaterial({
        vertexColors: true,
        map: tile(s.map, 1.7),
        normalMap: tile(s.normalMap, 1.7),
        roughness: 0.96,
        color: '#ffffff',
      }),
    );
  }, []);

  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => material.dispose(), [material]);
  // Drawn after everything that stands on it (and before the sky): the ground under the grass and the house is never shaded.
  return <mesh geometry={geo} material={material} receiveShadow renderOrder={4} />;
}

/* ------------------------------------------------------------------ */
/* Grass                                                               */
/* ------------------------------------------------------------------ */

/**
 * A tuft of bent blades, about 1 m tall at scale 1. Vertex colour darkens
 * toward the root. The same seed always gives the same blades; `segments`,
 * `every` (keep one blade in n) and `widen` thin the geometry out for tufts
 * far from the camera without changing where the blades stand.
 */
function tuftGeometry(blades: number, seed: number, segments = 4, every = 1, widen = 1) {
  return memo(`tuft-${blades}-${seed}-${segments}-${every}-${widen}`, () => {
    const r = rng(seed);
    const pos: number[] = [];
    const nor: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const SEG = segments;
    for (let b = 0; b < blades; b++) {
      const a = r() * Math.PI * 2;
      const off = r() * 0.11;
      const ox = Math.cos(a) * off;
      const oz = Math.sin(a) * off;
      const face = r() * Math.PI;
      const fx = Math.cos(face);
      const fz = Math.sin(face);
      const h = 0.55 + r() * 0.45;
      const lean = 0.12 + r() * 0.35;
      const la = a + (r() - 0.5) * 1.2;
      const lx = Math.cos(la);
      const lz = Math.sin(la);
      const w = (0.016 + r() * 0.012) * widen;
      if (b % every) continue;
      const base = pos.length / 3;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const bend = lean * t * t;
        const cx = ox + lx * bend * h;
        const cz = oz + lz * bend * h;
        const cy = t * h * (1 - bend * 0.3);
        const hw = (w / 2) * Math.pow(1 - t, 0.7);
        pos.push(cx - fx * hw, cy, cz - fz * hw, cx + fx * hw, cy, cz + fz * hw);
        // Normals mostly up so a field shades as one soft mass.
        const nx = -fz * 0.35;
        const nz = fx * 0.35;
        const l = Math.hypot(nx, 1, nz);
        nor.push(nx / l, 1 / l, nz / l, nx / l, 1 / l, nz / l);
        const k = 0.32 + 0.68 * Math.pow(t, 0.8);
        col.push(k, k, k, k, k, k);
        if (s < SEG) {
          const i = base + s * 2;
          idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  });
}

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _y = new Vector3(0, 1, 0);

export interface GrassProps {
  palette: LandPalette;
  /** Centre and half-size of the elliptical field. */
  center: [number, number];
  radius: [number, number];
  count: number;
  exclude?: Rect[];
  /** Blade height multiplier. */
  height?: number;
  seed?: number;
  flat?: number;
  hills?: number;
  /**
   * Where the camera stands on plan (x, z), one point or several along its
   * move. Tufts are drawn in full near these points and with fewer, simpler
   * blades farther off. Without it every tuft is drawn in full.
   */
  eye?: Eye;
}

/** Camera positions on plan, for choosing levels of detail. */
export type Eye = readonly (readonly [number, number])[];

const eyeDistance = (eye: Eye, x: number, z: number) => {
  let d = Infinity;
  for (const [ex, ez] of eye) d = Math.min(d, Math.hypot(x - ex, z - ez));
  return d;
};

interface Tuft {
  x: number;
  z: number;
  s: number;
  rot: number;
  c: Color;
}

/** Blade geometry by distance from the camera: [beyond metres, segments, one blade in, widen]. */
const TUFT_LEVELS: [number, number, number, number][] = [
  [0, 4, 1, 1],
  [12, 2, 1, 1],
  [28, 1, 2, 1.8],
];
/** The field is cut into squares this size, each culled on its own when it is out of shot. */
const GRASS_CELL = 12;

function GrassBatch({ geo, material, items, flat, hills }: { geo: BufferGeometry; material: MeshStandardMaterial; items: Tuft[]; flat: number; hills: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((p, i) => {
      _q.setFromAxisAngle(_y, p.rot);
      _m.compose(_p.set(p.x, groundHeight(p.x, p.z, flat, hills), p.z), _q, _s.set(p.s, p.s, p.s));
      m.setMatrixAt(i, _m);
      m.setColorAt(i, p.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, flat, hills]);
  return <instancedMesh ref={ref} args={[geo, material, items.length]} receiveShadow />;
}

export function Grass({ palette, center, radius, count, exclude, height = 0.55, seed = 11, flat = 40, hills = 22, eye }: GrassProps) {
  const material = useMemo(() => clearing(translucent(new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.88, metalness: 0 }), 0.9, 'grass')), []);
  // Callers write these props inline; the scatter is costly, so it follows their values, not their identity.
  const shape = JSON.stringify([center, radius, count, exclude, height, seed]);

  const placed = useMemo(() => {
    const r = rng(seed);
    const out: Tuft[] = [];
    const cg = new Color(palette.grass);
    const cd = new Color(palette.grassDry);
    const ck = new Color(palette.grassDark);
    let tries = 0;
    while (out.length < count && tries < count * 6) {
      tries++;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const x = center[0] + Math.cos(a) * d * radius[0];
      const z = center[1] + Math.sin(a) * d * radius[1];
      if (inside(exclude, x, z, 0.15)) continue;
      // Clumps and a soft edge.
      const clump = fbm(x / 6, z / 6, seed + 1);
      if (r() > Math.min(1, clump * 1.6) * Math.min(1, (1 - d) * 4)) continue;
      const c = cg.clone().lerp(cd, Math.min(1, Math.max(0, (fbm(x / 9, z / 9, seed + 2) - 0.45) * 2.2)) * 0.8);
      c.lerp(ck, r() * 0.35);
      c.multiplyScalar(0.85 + r() * 0.3);
      out.push({ x, z, s: height * (0.6 + r() * 0.8) * (0.7 + clump * 0.6), rot: r() * Math.PI * 2, c });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, shape]);

  /* By square of ground and by level of detail: one instanced mesh each. */
  const batches = useMemo(() => {
    const by = new Map<string, { level: number; items: Tuft[] }>();
    for (const p of placed) {
      let level = 0;
      if (eye?.length) {
        const d = eyeDistance(eye, p.x, p.z);
        while (level < TUFT_LEVELS.length - 1 && d >= TUFT_LEVELS[level + 1][0]) level++;
      }
      const key = `${level}:${Math.floor(p.x / GRASS_CELL)}:${Math.floor(p.z / GRASS_CELL)}`;
      let b = by.get(key);
      if (!b) by.set(key, (b = { level, items: [] }));
      b.items.push(p);
    }
    return [...by.entries()].map(([key, b]) => ({ key, ...b }));
  }, [placed, eye]);

  useLayoutEffect(() => () => material.dispose(), [material]);
  return (
    <>
      {batches.map((b) => {
        const [, segments, every, widen] = TUFT_LEVELS[b.level];
        return <GrassBatch key={b.key} geo={tuftGeometry(9, 5, segments, every, widen)} material={material} items={b.items} flat={flat} hills={hills} />;
      })}
    </>
  );
}

/** Wild flowers scattered through the grass: a small head on a stem. */
export function Flowers({ palette, center, radius, count, exclude, seed = 23, flat = 40, hills = 22 }: Omit<GrassProps, 'height'>) {
  const ref = useRef<InstancedMesh>(null);
  const geo = useMemo(
    () =>
      memo('flower', () => {
        const head = new IcosahedronGeometry(0.02, 0);
        head.translate(0, 0.46, 0);
        const stem = cyl(0.003, 0.004, 0.46, 4, 0, 0.23, 0);
        const g = mergeGeometries([head.toNonIndexed(), stem.toNonIndexed()]);
        return g!;
      }),
    [],
  );
  const material = useMemo(() => clearing(new MeshStandardMaterial({ roughness: 0.7 })), []);
  const shape = JSON.stringify([center, radius, count, exclude, seed]);
  const placed = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; z: number; s: number; c: Color }[] = [];
    const cols = palette.flowers.map((c) => new Color(c));
    let tries = 0;
    while (out.length < count && tries < count * 8) {
      tries++;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const x = center[0] + Math.cos(a) * d * radius[0];
      const z = center[1] + Math.sin(a) * d * radius[1];
      if (inside(exclude, x, z, 0.3)) continue;
      if (fbm(x / 4, z / 4, seed) < 0.52) continue;
      out.push({ x, z, s: 0.7 + r() * 0.6, c: cols[Math.floor(r() * cols.length)] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, shape]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    placed.forEach((p, i) => {
      _q.identity();
      _m.compose(_p.set(p.x, groundHeight(p.x, p.z, flat, hills), p.z), _q, _s.setScalar(p.s));
      m.setMatrixAt(i, _m);
      m.setColorAt(i, p.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.count = placed.length;
  }, [placed, flat, hills]);
  useLayoutEffect(() => () => material.dispose(), [material]);
  return <instancedMesh ref={ref} args={[geo, material, Math.max(1, placed.length)]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Trees                                                               */
/* ------------------------------------------------------------------ */

interface TreeParts {
  wood: BufferGeometry;
  leaves: BufferGeometry;
}

/**
 * A broadleaf tree about `h` metres tall: trunk, a few limbs, and leaf
 * cards clustered at the limb ends. Card normals point away from the
 * crown's centre so the crown shades as a volume.
 */
function treeParts(variant: number, level = 0): TreeParts {
  const key = `broadleaf-${variant}`;
  const wood = memo(`${key}-wood`, () => build(variant).wood);
  const leaves = memo(`${key}-leaves-${level}`, () => (level === 0 ? build(variant).leaves : thinned(build(variant).leaves, LEAF_LEVELS[level][1], LEAF_LEVELS[level][2])));
  return { wood, leaves };
}

/** Leaf cards by distance from the camera: [beyond metres, cards kept, card growth]. */
const LEAF_LEVELS: [number, number, number][] = [
  [0, 520, 1],
  [70, 260, 1.26],
];

/**
 * The first `cards` leaf cards of a crown, each grown about its centre so
 * the crown stays as full: for trees too far away to show the difference.
 */
function thinned(full: BufferGeometry, cards: number, grow: number) {
  const g = new BufferGeometry();
  const take = (name: string, size: number) => new Float32BufferAttribute((full.attributes[name].array as Float32Array).slice(0, cards * 4 * size), size);
  const pos = take('position', 3);
  for (let c = 0; c < cards; c++) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 4; k++) {
      cx += pos.getX(c * 4 + k) / 4;
      cy += pos.getY(c * 4 + k) / 4;
      cz += pos.getZ(c * 4 + k) / 4;
    }
    for (let k = 0; k < 4; k++) {
      const i = c * 4 + k;
      pos.setXYZ(i, cx + (pos.getX(i) - cx) * grow, cy + (pos.getY(i) - cy) * grow, cz + (pos.getZ(i) - cz) * grow);
    }
  }
  g.setAttribute('position', pos);
  g.setAttribute('normal', take('normal', 3));
  g.setAttribute('uv', take('uv', 2));
  g.setAttribute('color', take('color', 3));
  g.setIndex(Array.from(full.index!.array as ArrayLike<number>).slice(0, cards * 6));
  return g;
}

const built = new Map<number, TreeParts>();
function build(variant: number): TreeParts {
  const hit = built.get(variant);
  if (hit) return hit;
  const r = rng(100 + variant * 17);
  const H = 7 + variant * 1.4;
  const crownY = H * 0.62;
  const crownR = H * (0.36 + r() * 0.08);
  const wood: BufferGeometry[] = [];
  const trunkH = H * 0.55;
  wood.push(cyl(0.12, 0.22, trunkH, 9, 0, trunkH / 2, 0));
  const ends: Vector3[] = [];
  const limbs = 6 + Math.floor(r() * 3);
  const o = new Object3D();
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + r() * 0.5;
    const tilt = 0.5 + r() * 0.5;
    const len = crownR * (0.7 + r() * 0.5);
    const start = new Vector3(0, trunkH * (0.75 + r() * 0.3), 0);
    const dir = new Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).normalize();
    const end = start.clone().addScaledVector(dir, len);
    const g = cyl(0.03, 0.09, len, 6, 0, len / 2, 0);
    o.position.copy(start);
    o.quaternion.setFromUnitVectors(_y, dir);
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    wood.push(g);
    ends.push(end);
  }
  ends.push(new Vector3(0, H * 0.92, 0));
  const woodGeo = mergeGeometries(wood.map((g) => (g.index ? g.toNonIndexed() : g)))!;
  // UVs for bark: around × up, in metres.
  const p = woodGeo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) * 0.25;
    uv[i * 2 + 1] = p.getY(i);
  }
  woodGeo.setAttribute('uv', new Float32BufferAttribute(uv, 2));

  // Leaf cards.
  const pos: number[] = [];
  const nor: number[] = [];
  const tex: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const centre = new Vector3(0, crownY, 0);
  const cards = 520;
  const q = new Quaternion();
  const corner = new Vector3();
  for (let i = 0; i < cards; i++) {
    const e = ends[Math.floor(r() * ends.length)];
    const c = new Vector3(
      e.x + (r() - 0.5) * crownR * 1.1,
      e.y + (r() - 0.5) * crownR * 0.8,
      e.z + (r() - 0.5) * crownR * 1.1,
    );
    // Keep inside an ellipsoid crown.
    const rel = c.clone().sub(centre);
    const lim = rel.clone().multiply(new Vector3(1 / (crownR * 1.15), 1 / (crownR * 0.85), 1 / (crownR * 1.15)));
    if (lim.length() > 1) c.copy(centre).add(rel.divideScalar(lim.length()));
    const size = 0.9 + r() * 0.8;
    q.setFromAxisAngle(new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), r() * Math.PI * 2);
    const n = c.clone().sub(centre).normalize();
    const shade = 0.75 + 0.25 * Math.max(0, n.y) + r() * 0.15;
    const base = pos.length / 3;
    for (const [u, v] of [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ]) {
      corner.set(u * size, v * size, 0).applyQuaternion(q).add(c);
      pos.push(corner.x, corner.y, corner.z);
      nor.push(n.x, n.y, n.z);
      tex.push(u + 0.5, v + 0.5);
      col.push(shade, shade, shade);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const leaves = new BufferGeometry();
  leaves.setAttribute('position', new Float32BufferAttribute(pos, 3));
  leaves.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  leaves.setAttribute('uv', new Float32BufferAttribute(tex, 2));
  leaves.setAttribute('color', new Float32BufferAttribute(col, 3));
  leaves.setIndex(idx);
  const parts = { wood: woodGeo, leaves };
  built.set(variant, parts);
  return parts;
}

/**
 * Thin vegetation lets light through: brighter where the sun is behind it,
 * as seen from the camera. Vertex colour scales it, so blade tips glow most.
 */
export function translucent<M extends MeshStandardMaterial>(m: M, amount: number, key: string): M {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
  float vegTrans = pow( max( dot( -normalize( vViewPosition ), directionalLights[ 0 ].direction ), 0.0 ), 3.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[ 0 ].color * vegTrans * ${amount.toFixed(3)};
#endif`,
    );
  };
  m.customProgramCacheKey = () => `translucent-${key}-${amount}`;
  return m;
}

/** Leaves on transparent cards, letting light through. */
function leafMaterial(color: string) {
  return clearing(
    translucent(
      new MeshStandardMaterial({
        color,
        map: leafCard(),
        alphaTest: LEAF_CUT,
        side: DoubleSide,
        vertexColors: true,
        roughness: 0.82,
      }),
      0.55,
      'leaf',
    ),
  );
}

export interface TreeSpot {
  x: number;
  z: number;
  /** Height scale (1 ≈ 7–10 m depending on variant). */
  s: number;
  rot?: number;
  variant?: number;
}

const _o = new Object3D();

/**
 * Fixes each tree's rotation to what a Woodland of just this list would give
 * it, so lists can be drawn together in one Woodland and look the same.
 */
export function settled(spots: TreeSpot[]): TreeSpot[] {
  const nth = new Map<number, number>();
  return spots.map((s) => {
    const v = s.variant ?? 0;
    const i = nth.get(v) ?? 0;
    nth.set(v, i + 1);
    return s.rot === undefined ? { ...s, rot: i * 2.17 } : s;
  });
}

/** Trees along lines (hedgerows, field edges): [x0, z0, x1, z1, count]. */
export function along(lines: [number, number, number, number, number][], size: [number, number], seed = 5): TreeSpot[] {
  const r = rng(seed);
  const out: TreeSpot[] = [];
  for (const [x0, z0, x1, z1, n] of lines)
    for (let i = 0; i < n; i++) {
      const t = (i + r() * 0.7) / n;
      out.push({ x: x0 + (x1 - x0) * t + (r() - 0.5) * 3, z: z0 + (z1 - z0) * t + (r() - 0.5) * 3, s: size[0] + r() * (size[1] - size[0]), variant: Math.floor(r() * 3), rot: r() * 6.28 });
    }
  return out;
}

/**
 * Instanced broadleaf trees, grouped by variant. With `eye` (where the
 * camera stands on plan), trees far from it carry fewer, larger leaf cards.
 */
export function Woodland({ spots, palette, flat = 40, hills = 22, eye }: { spots: TreeSpot[]; palette: LandPalette; flat?: number; hills?: number; eye?: Eye }) {
  const groups = useMemo(() => {
    const by = new Map<string, { variant: number; level: number; list: TreeSpot[] }>();
    // A tree without a set rotation turns by its place among its variant, whatever its level of detail.
    const nth = new Map<number, number>();
    for (const spot of spots) {
      const variant = spot.variant ?? 0;
      const i = nth.get(variant) ?? 0;
      nth.set(variant, i + 1);
      const s = spot.rot === undefined ? { ...spot, rot: i * 2.17 } : spot;
      let level = 0;
      if (eye?.length) {
        const d = eyeDistance(eye, s.x, s.z);
        while (level < LEAF_LEVELS.length - 1 && d >= LEAF_LEVELS[level + 1][0]) level++;
      }
      const key = `${variant}:${level}`;
      let g = by.get(key);
      if (!g) by.set(key, (g = { variant, level, list: [] }));
      g.list.push(s);
    }
    return [...by.entries()];
  }, [spots, eye]);
  const mats = useMemo(() => {
    const b = barkSet();
    const bark = clearing(new MeshStandardMaterial({ color: palette.trunk, map: tile(b.map, 0.7), normalMap: tile(b.normalMap, 0.7), roughness: 0.95 }));
    return { bark, leaves: palette.leaves.map(leafMaterial) };
  }, [palette]);
  useLayoutEffect(
    () => () => {
      mats.bark.dispose();
      mats.leaves.forEach((m) => m.dispose());
    },
    [mats],
  );
  return (
    <>
      {groups.map(([key, g]) => (
        <TreeVariant key={key} variant={g.variant} level={g.level} list={g.list} bark={mats.bark} leaves={mats.leaves[g.variant % mats.leaves.length]} flat={flat} hills={hills} />
      ))}
    </>
  );
}

const LEAF_CUT = 0.42;

let leafMaskMaterial: MeshBasicMaterial | null = null;
/**
 * Depth only, for the same leaf cards, drawn before anything else. A crown
 * is hundreds of overlapping cards in no particular order, and each one that
 * happened to be drawn before the cards in front of it was lit in full and
 * then covered. With the nearest leaf's depth already in place, only that
 * leaf is lit: the same picture, about a third of the shading.
 *
 * Its cut-off is a little stricter than the leaves' own, and its depth is
 * pushed back by a hair, so a leaf can never be missing where the mask says
 * there is one (that would punch a hole through to the sky). For the same
 * reason it keeps inside a clearing exactly as the leaves do, which is the
 * only thing it uses the fog chunks for.
 */
function leafMask() {
  return (leafMaskMaterial ??= clearing(
    new MeshBasicMaterial({
      map: leafCard(),
      alphaTest: LEAF_CUT + 0.05,
      side: DoubleSide,
      colorWrite: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    }),
  ));
}

function TreeVariant({
  variant,
  level,
  list,
  bark,
  leaves,
  flat,
  hills,
}: {
  variant: number;
  level: number;
  list: TreeSpot[];
  bark: MeshStandardMaterial;
  leaves: MeshStandardMaterial;
  flat: number;
  hills: number;
}) {
  const wood = useRef<InstancedMesh>(null);
  const crown = useRef<InstancedMesh>(null);
  const mask = useRef<InstancedMesh>(null);
  const parts = treeParts(variant, level);
  useLayoutEffect(() => {
    list.forEach((t, i) => {
      _o.position.set(t.x, groundHeight(t.x, t.z, flat, hills) - 0.05, t.z);
      _o.rotation.set(0, t.rot ?? i * 2.17, 0);
      _o.scale.setScalar(t.s);
      _o.updateMatrix();
      wood.current?.setMatrixAt(i, _o.matrix);
      crown.current?.setMatrixAt(i, _o.matrix);
    });
    if (wood.current) wood.current.instanceMatrix.needsUpdate = true;
    if (crown.current) crown.current.instanceMatrix.needsUpdate = true;
    // The mask stands exactly where the leaves do: one set of instance matrices for both.
    if (mask.current && crown.current) mask.current.instanceMatrix = crown.current.instanceMatrix;
  }, [list, flat, hills]);
  return (
    <>
      <instancedMesh ref={wood} args={[parts.wood, bark, list.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={mask} args={[parts.leaves, leafMask(), list.length]} renderOrder={-1} frustumCulled={false} />
      <instancedMesh ref={crown} args={[parts.leaves, leaves, list.length]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Distant tree lines                                                  */
/* ------------------------------------------------------------------ */

function blobTree(seed: number) {
  return memo(`blob-tree-${seed}`, () => {
    const crown = new IcosahedronGeometry(1, 2);
    const p = crown.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const k = 1 + (fbm(v.x * 1.7 + seed, v.z * 1.7 + v.y, seed) - 0.5) * 0.7;
      v.multiplyScalar(k);
      p.setXYZ(i, v.x * 2.9, v.y * 2.3 + 3.4, v.z * 2.9);
    }
    crown.computeVertexNormals();
    const trunk = cyl(0.12, 0.2, 1.6, 5, 0, 0.8, 0);
    return mergeGeometries([crown.toNonIndexed(), trunk.toNonIndexed()])!;
  });
}

/** Many cheap trees along field edges far from the camera; the haze does the rest. */
export function TreeLine({ lines, palette, seed = 31, flat = 40, hills = 22, scale = 1 }: { lines: [number, number, number, number, number][]; palette: LandPalette; seed?: number; flat?: number; hills?: number; scale?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const geo = blobTree(3);
  const material = useMemo(() => clearing(new MeshStandardMaterial({ roughness: 1, color: '#ffffff' })), []);
  const spots = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; z: number; s: number; c: Color }[] = [];
    const base = new Color(palette.far);
    const leaf = palette.leaves.map((c) => new Color(c));
    for (const [x0, z0, x1, z1, n] of lines) {
      for (let i = 0; i < n; i++) {
        const t = (i + r() * 0.8) / n;
        const x = x0 + (x1 - x0) * t + (r() - 0.5) * 6;
        const z = z0 + (z1 - z0) * t + (r() - 0.5) * 6;
        const c = base.clone().lerp(leaf[Math.floor(r() * leaf.length)], 0.5).multiplyScalar(0.8 + r() * 0.35);
        out.push({ x, z, s: (0.8 + r() * 0.9) * scale, c });
      }
    }
    return out;
  }, [lines, palette, seed, scale]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    spots.forEach((s, i) => {
      _o.position.set(s.x, groundHeight(s.x, s.z, flat, hills) - 0.2, s.z);
      _o.rotation.set(0, i * 1.7, 0);
      _o.scale.set(s.s, s.s * (0.9 + (i % 5) * 0.06), s.s);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
      m.setColorAt(i, s.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spots, flat, hills]);
  useLayoutEffect(() => () => material.dispose(), [material]);
  // Far outside the area the key light shadows: drawing them into the shadow map was wasted work.
  return <instancedMesh ref={ref} args={[geo, material, Math.max(1, spots.length)]} receiveShadow frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Fence                                                               */
/* ------------------------------------------------------------------ */

/** Timber post-and-rail fence along a polyline. */
export function Fence({ pts, color = '#6b5a47', flat = 40, hills = 22 }: { pts: [number, number][]; color?: string; flat?: number; hills?: number }) {
  const geo = useMemo(() => {
    const parts: BufferGeometry[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 2.4));
      const ang = Math.atan2(z1 - z0, x1 - x0);
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n;
        const z = z0 + ((z1 - z0) * k) / n;
        const y = groundHeight(x, z, flat, hills);
        const post = cyl(0.055, 0.065, 1.25, 6, x, y + 0.6, z);
        parts.push(post.index ? post.toNonIndexed() : post);
        if (k < n) {
          const x2 = x0 + ((x1 - x0) * (k + 1)) / n;
          const z2 = z0 + ((z1 - z0) * (k + 1)) / n;
          const y2 = groundHeight(x2, z2, flat, hills);
          const seg = Math.hypot(x2 - x, z2 - z);
          for (const hgt of [0.55, 1.0]) {
            const rail = cyl(0.03, 0.03, seg, 5, 0, 0, 0);
            rail.rotateZ(Math.PI / 2);
            rail.rotateY(-ang);
            rail.translate((x + x2) / 2, (y + y2) / 2 + hgt, (z + z2) / 2);
            parts.push(rail.index ? rail.toNonIndexed() : rail);
          }
        }
      }
    }
    return mergeGeometries(parts)!;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pts), flat, hills]);
  const material = useMemo(() => clearing(new MeshStandardMaterial({ color, roughness: 0.92 })), [color]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}
