/**
 * Settings for the buildings: sky, ground, landscape and context. Clean,
 * architectural and seeded, so a scene looks the same on every visit.
 * Smooth shading throughout; vegetation is sparse and placed, never a
 * scattered forest.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  type ShaderMaterial,
  SphereGeometry,
  type InstancedMesh,
  type Material,
  type Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { clamp01, ease, stagger } from '../../film/timeline';
import { box, cyl, memo, merge, mergeGroups, setInst } from './geometry';
import type { Look } from './looks';

/* ------------------------------------------------------------------ */
/* Seeded noise                                                        */
/* ------------------------------------------------------------------ */

function hash(x: number, z: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x: number, z: number, seed: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi, seed);
  const b = hash(xi + 1, zi, seed);
  const c = hash(xi, zi + 1, seed);
  const d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise, roughly 0–1. */
export function fbm(x: number, z: number, seed = 1, octaves = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * freq, z * freq, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Sky material on a sphere that travels with the camera. It sits at the far
 * plane and is drawn after everything solid, so the sky shader only runs on
 * the pixels where sky is actually seen.
 */
export function SkyDome({ material, domeRef }: { material: ShaderMaterial; domeRef?: React.RefObject<Mesh | null> }) {
  const own = useRef<Mesh>(null);
  const ref = domeRef ?? own;
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    ref.current?.position.copy(camera.position);
  });
  const geo = useMemo(() => memo('sky-sphere', () => new SphereGeometry(1, 48, 24)), []);
  return <mesh ref={ref} geometry={geo} material={material} scale={500} renderOrder={10} frustumCulled={false} />;
}

/** A large pale disc low in the sky (moon, low sun). Unlit and unfogged. */
export function SkyDisc({ dir, size, color, opacity = 0.9 }: { dir: [number, number, number]; size: number; color: string; opacity?: number }) {
  const ref = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const m = useMemo(() => new MeshBasicMaterial({ color, fog: false, toneMapped: false, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  const d = useMemo(() => {
    const l = Math.hypot(...dir);
    return dir.map((v) => (v / l) * 420) as [number, number, number];
  }, [dir]);
  useFrame(() => {
    const me = ref.current;
    if (!me) return;
    me.position.set(camera.position.x + d[0], camera.position.y + d[1], camera.position.z + d[2]);
    me.lookAt(camera.position);
  });
  return (
    <mesh ref={ref} material={m} renderOrder={-9} frustumCulled={false}>
      <circleGeometry args={[size, 48]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Ground                                                              */
/* ------------------------------------------------------------------ */

export interface GroundPalette {
  a: string;
  b: string;
  dry: string;
}

export const GROUND = {
  meadow: { a: '#9ca46c', b: '#aca975', dry: '#c0ae7a' },
  lawn: { a: '#8d9c68', b: '#98a472', dry: '#a7a87a' },
  dusk: { a: '#2f3632', b: '#363d37', dry: '#3d3c36' },
  night: { a: '#171c25', b: '#1b2029', dry: '#20242d' },
  stone: { a: '#d9d5cc', b: '#d2cdc3', dry: '#cbc5ba' },
} satisfies Record<string, GroundPalette>;

interface TerrainProps {
  size: [number, number];
  center?: [number, number];
  step?: number;
  /** 0 where the ground must stay level, 1 where it may roll. */
  freedom?: (x: number, z: number) => number;
  relief?: number;
  palette: GroundPalette;
  seed?: number;
}

/** Ground with soft, low-contrast colour variation and gentle relief. */
export function Terrain({ size, center = [0, 0], step = 5, freedom = () => 1, relief = 3, palette, seed = 3 }: TerrainProps) {
  const geo = useMemo(() => {
    const [w, d] = size;
    const g = new PlaneGeometry(w, d, Math.max(1, Math.round(w / step)), Math.max(1, Math.round(d / step)));
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const ca = new Color(palette.a);
    const cb = new Color(palette.b);
    const cd = new Color(palette.dry);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const f = clamp01(freedom(x, z));
      pos.setY(i, (fbm(x / 90, z / 90, seed) - 0.45) * relief * f - 0.03);
      c.copy(ca).lerp(cb, fbm(x / 40, z / 40, seed + 9));
      c.lerp(cd, clamp01((fbm(x / 70, z / 70, seed + 31) - 0.55) * 3) * 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [size, center, step, freedom, relief, palette, seed]);
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 1 }), []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} receiveShadow />;
}

/* ------------------------------------------------------------------ */
/* Horizon                                                             */
/* ------------------------------------------------------------------ */

export interface RidgeLayer {
  /** Distance behind the subject (towards −z). */
  dist: number;
  height: number;
  color: string;
  seed: number;
  /** Feature size along the ridge, metres. */
  scale?: number;
}

/**
 * Layered ridge silhouettes standing behind the set, like cut paper.
 * Fog does the aerial perspective: farther layers melt into the sky.
 */
export function Ridges({ layers, width = 900, x = 0, z = 0 }: { layers: RidgeLayer[]; width?: number; x?: number; z?: number }) {
  const items = useMemo(
    () =>
      layers.map((l) => {
        const n = 180;
        const pos: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= n; i++) {
          const px = -width / 2 + (width * i) / n;
          const f = fbm(px / (l.scale ?? 120), 0.5, l.seed, 4);
          const top = l.height * (0.25 + 0.95 * Math.pow(f, 1.35));
          pos.push(px, -8, 0, px, top, 0);
          if (i < n) {
            const a = i * 2;
            idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        return { g, m: new MeshBasicMaterial({ color: l.color }), z: z - l.dist };
      }),
    [layers, width, z],
  );
  useLayoutEffect(
    () => () =>
      items.forEach((i) => {
        i.g.dispose();
        i.m.dispose();
      }),
    [items],
  );
  return (
    <>
      {items.map((i, k) => (
        <mesh key={k} geometry={i.g} material={i.m} position={[x, 0, i.z]} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Trees: smooth, sculptural, placed                                   */
/* ------------------------------------------------------------------ */

export type TreeKind = 'sphere' | 'column' | 'cloud' | 'shrub';

/** Tree geometry, roughly 1 unit wide. Groups: 0 trunk, 1 crown. */
function treeGeometry(kind: TreeKind): BufferGeometry {
  return memo(`tree-smooth-${kind}`, () => {
    if (kind === 'column') {
      const crown = new SphereGeometry(1, 20, 16);
      crown.scale(0.4, 1.6, 0.4);
      crown.translate(0, 1.95, 0);
      return mergeGroups([[cyl(0.05, 0.06, 0.6, 8, 0, 0.3, 0)], [crown]]);
    }
    if (kind === 'shrub') {
      const a = new SphereGeometry(0.6, 18, 12);
      a.scale(1, 0.62, 1);
      a.translate(0, 0.3, 0);
      return mergeGroups([[cyl(0.02, 0.02, 0.04, 4, 0, 0.02, 0)], [a]]);
    }
    if (kind === 'cloud') {
      const parts = [
        [0, 1.95, 0, 0.82],
        [0.55, 1.6, 0.15, 0.6],
        [-0.5, 1.7, -0.1, 0.58],
        [0.1, 2.45, -0.1, 0.5],
      ].map(([x, y, z, r]) => {
        const s = new SphereGeometry(r, 18, 12);
        s.translate(x, y, z);
        return s;
      });
      return mergeGroups([[cyl(0.06, 0.09, 1.4, 8, 0, 0.7, 0)], parts]);
    }
    const crown = new SphereGeometry(0.9, 22, 16);
    crown.translate(0, 2.05, 0);
    return mergeGroups([[cyl(0.05, 0.08, 1.4, 8, 0, 0.7, 0)], [crown]]);
  });
}

export type Flora = Look['flora'];

export const FLORA: Record<Flora, { trunk: string; crowns: Record<TreeKind, string> }> = {
  day: { trunk: '#6b5d50', crowns: { sphere: '#6f8150', column: '#4f6440', cloud: '#7a8a55', shrub: '#7f8e5c' } },
  dusk: { trunk: '#26231f', crowns: { sphere: '#2c3a2f', column: '#223026', cloud: '#2f3d31', shrub: '#334234' } },
  gold: { trunk: '#4b3b2c', crowns: { sphere: '#5c6a35', column: '#45552e', cloud: '#66713a', shrub: '#6f7840' } },
  pale: { trunk: '#bdb8ad', crowns: { sphere: '#dad6cd', column: '#d1cdc3', cloud: '#d6d2c8', shrub: '#dcd8cf' } },
};

const floraMats = new Map<string, MeshStandardMaterial[]>();
function treeMats(flora: Flora, kind: TreeKind) {
  const key = `${flora}-${kind}`;
  let m = floraMats.get(key);
  if (!m) {
    const f = FLORA[flora];
    m = [new MeshStandardMaterial({ color: f.trunk, roughness: 1 }), new MeshStandardMaterial({ color: f.crowns[kind], roughness: 0.95 })];
    floraMats.set(key, m);
  }
  return m;
}

export interface TreeSpot {
  x: number;
  z: number;
  /** Height scale: 1 ≈ 2.9 m for a sphere tree. */
  s: number;
  kind: TreeKind;
  rot?: number;
  y?: number;
}

const KINDS: TreeKind[] = ['sphere', 'column', 'cloud', 'shrub'];

function TreeKindMesh({ spots, kind, flora, grow }: { spots: TreeSpot[]; kind: TreeKind; flora: Flora; grow?: () => number }) {
  const ref = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  const tint = useMemo(() => {
    const r = rng(spots.length * 31 + kind.length);
    return spots.map(() => 0.9 + r() * 0.18);
  }, [spots, kind]);

  const apply = (t: number) => {
    const m = ref.current;
    if (!m) return;
    const c = new Color();
    spots.forEach((p, i) => {
      const g = grow ? ease.out(stagger(t, i, spots.length, 0.75)) : 1;
      setInst(m, i, p.x, p.y ?? 0, p.z, p.rot ?? i * 2.39, Math.max(0.0001, p.s * g));
      m.setColorAt(i, c.setScalar(tint[i]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => apply(grow ? grow() : 1));
  useFrame(() => {
    if (!grow) return;
    const t = grow();
    if (t === last.current) return;
    last.current = t;
    apply(t);
  });

  return <instancedMesh ref={ref} args={[treeGeometry(kind), treeMats(flora, kind), spots.length]} castShadow receiveShadow frustumCulled={false} />;
}

/** Instanced trees. `grow` (0–1) lets them rise in, staggered. */
export function Trees({ spots, flora, grow }: { spots: TreeSpot[]; flora: Flora; grow?: () => number }) {
  const byKind = useMemo(() => KINDS.map((k) => [k, spots.filter((s) => s.kind === k)] as const).filter(([, l]) => l.length), [spots]);
  return (
    <>
      {byKind.map(([k, list]) => (
        <TreeKindMesh key={k} kind={k} spots={list} flora={flora} grow={grow} />
      ))}
    </>
  );
}

/** Evenly spaced trees along a line, for avenues and windbreaks. */
export function row(x0: number, z0: number, x1: number, z1: number, n: number, kind: TreeKind, s: number, jitter = 0, seed = 1): TreeSpot[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, s: s * (1 - jitter / 2 + r() * jitter), kind, rot: r() * 6.28 };
  });
}

/* ------------------------------------------------------------------ */
/* Hardscape and context                                               */
/* ------------------------------------------------------------------ */

/** A paved rectangle with joint lines. */
export function Paving({
  w,
  d,
  x = 0,
  z = 0,
  y = 0.01,
  tile = 1.5,
  material,
  line = '#000000',
  lineOpacity = 0.1,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
  y?: number;
  tile?: number;
  material: Material;
  line?: string;
  lineOpacity?: number;
}) {
  const lines = useMemo(
    () =>
      memo(`paving-${w}-${d}-${tile}`, () => {
        const pts: number[] = [];
        for (let i = 0; i <= Math.round(w / tile); i++) {
          const px = -w / 2 + i * tile;
          pts.push(px, 0, -d / 2, px, 0, d / 2);
        }
        for (let j = 0; j <= Math.round(d / tile); j++) {
          const pz = -d / 2 + j * tile;
          pts.push(-w / 2, 0, pz, w / 2, 0, pz);
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pts, 3));
        return g;
      }),
    [w, d, tile],
  );
  const slab = useMemo(() => memo(`slab-${w}-${d}`, () => box(w, 0.06, d, 0, -0.03, 0)), [w, d]);
  return (
    <group position={[x, y, z]}>
      <mesh geometry={slab} material={material} receiveShadow />
      <lineSegments geometry={lines} position-y={0.002}>
        <lineBasicMaterial color={line} transparent opacity={lineOpacity} />
      </lineSegments>
    </group>
  );
}

/** Still water: a mirror tinted towards the sky. */
export function Water({ w, d, x = 0, z = 0, y = 0, tint = '#8a96a8', res = 1024 }: { w: number; d: number; x?: number; z?: number; y?: number; tint?: string; res?: number }) {
  const mirror = useMemo(() => {
    const r = new Reflector(new PlaneGeometry(w, d), { textureWidth: res, textureHeight: res, color: new Color(tint).getHex(), clipBias: 0.003 });
    r.rotation.x = -Math.PI / 2;
    return r;
  }, [w, d, tint, res]);
  useLayoutEffect(
    () => () => {
      mirror.geometry.dispose();
      (mirror.material as Material).dispose();
      mirror.getRenderTarget().dispose();
    },
    [mirror],
  );
  return <primitive object={mirror} position={[x, y, z]} />;
}

/** Rounded block, base at y = 0: hedges, planters, low walls, benches. */
export function rounded(w: number, h: number, d: number, r = 0.12) {
  return memo(`rounded-${w}-${h}-${d}-${r}`, () => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
    g.translate(0, h / 2, 0);
    return g;
  });
}

export interface BlockSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

/** Simple massing for context buildings, merged into one mesh. */
export function Blocks({ items, material }: { items: BlockSpec[]; material: Material }) {
  const geo = useMemo(() => merge(items.map((b) => box(b.w, b.h, b.d, b.x, b.h / 2, b.z))), [items]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}

/** A clad industrial shed: body, shallow two-plane roof, vertical ribs. */
export function shedGeometry(w: number, d: number, h: number) {
  return memo(`shed-${w}-${d}-${h}`, () => {
    const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0)];
    const pitch = 0.12;
    for (const s of [-1, 1]) {
      const p = box(w + 0.4, 0.12, d / 2 / Math.cos(pitch) + 0.2, 0, 0, 0);
      p.rotateX(s * -pitch);
      p.translate(0, h + Math.tan(pitch) * (d / 4) + 0.05, (s * d) / 4);
      parts.push(p);
    }
    for (let i = 0; i <= Math.floor(w / 1.2); i++) {
      const x = -w / 2 + i * 1.2;
      parts.push(box(0.06, h, 0.08, x, h / 2, d / 2 + 0.04), box(0.06, h, 0.08, x, h / 2, -d / 2 - 0.04));
    }
    return merge(parts);
  });
}

/** Site fence along a polyline: posts and a translucent mesh. Groups: 0 posts, 1 mesh. */
export function fenceGeometry(key: string, pts: [number, number][], h = 2.1) {
  return memo(`fence-${key}`, () => {
    const posts: BufferGeometry[] = [];
    const panels: BufferGeometry[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 3));
      for (let k = 0; k < n; k++) posts.push(cyl(0.035, 0.035, h, 6, x0 + ((x1 - x0) * k) / n, h / 2, z0 + ((z1 - z0) * k) / n));
      const p = box(len, h - 0.1, 0.02, 0, 0, 0);
      p.rotateY(-Math.atan2(z1 - z0, x1 - x0));
      p.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
      panels.push(p);
    }
    const [lx, lz] = pts[pts.length - 1];
    posts.push(cyl(0.035, 0.035, h, 6, lx, h / 2, lz));
    return mergeGroups([posts, panels]);
  });
}

/** Floodlight masts: pole and a lit head. Groups: 0 pole, 1 head. */
export function mastGeometry(key: string, spots: [number, number][], h = 9) {
  return memo(`mast-${key}`, () =>
    mergeGroups([spots.map(([x, z]) => cyl(0.09, 0.14, h, 8, x, h / 2, z)), spots.map(([x, z]) => box(1.2, 0.35, 0.5, x, h + 0.1, z))]),
  );
}

/** Farmland: alternating bands of crop colour, laid flat. */
export function Fields({ x, z, w, d, bands, colors, angle = 0 }: { x: number; z: number; w: number; d: number; bands: number; colors: string[]; angle?: number }) {
  const geos = useMemo(() => {
    const bw = w / bands;
    return Array.from({ length: bands }, (_, i) => memo(`field-${w}-${d}-${bands}-${i}`, () => box(bw - 0.8, 0.04, d, -w / 2 + bw * (i + 0.5), 0.02, 0)));
  }, [w, d, bands]);
  const mats = useMemo(() => colors.map((c) => new MeshStandardMaterial({ color: c, roughness: 1 })), [colors]);
  useLayoutEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <group position={[x, 0, z]} rotation-y={angle}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats[i % mats.length]} receiveShadow />
      ))}
    </group>
  );
}
