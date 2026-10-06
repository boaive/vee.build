import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CELL, STOREY, span, type Placement } from '../../data/system';

/** 1 × 1 × 1 box shared by every box-shaped part; size comes from scale. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1);

export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

export function cyl(rTop: number, rBottom: number, h: number, seg: number, x = 0, y = 0, z = 0): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return g;
}

/** Merge into one geometry. Mixed indexed / non-indexed input is normalised. */
export function merge(list: BufferGeometry[]): BufferGeometry {
  const mixed = list.some((g) => !g.index) && list.some((g) => g.index);
  const src = mixed ? list.map((g) => (g.index ? g.toNonIndexed() : g)) : list;
  const out = mergeGeometries(src, false);
  if (!out) throw new Error('merge failed');
  list.forEach((g) => g.dispose());
  return out;
}

/** Merge several lists into one geometry with one material group per list. */
export function mergeGroups(lists: BufferGeometry[][]): BufferGeometry {
  const parts = lists.map(merge);
  const mixed = parts.some((g) => !g.index) && parts.some((g) => g.index);
  const src = mixed ? parts.map((g) => (g.index ? g.toNonIndexed() : g)) : parts;
  const out = mergeGeometries(src, true);
  if (!out) throw new Error('mergeGroups failed');
  parts.forEach((g) => g.dispose());
  return out;
}

const cache = new Map<string, BufferGeometry>();
/** Geometry cache: scenes remount as the visitor scrolls, geometry is built once. */
export function memo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _e = new Euler();

export function setInst(
  mesh: InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
  sx = 1,
  sy = sx,
  sz = sx,
) {
  _e.set(0, ry, 0);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}

/** Centre of a set of placements on plan, in metres. */
export function planCentre(list: Placement[]): [number, number] {
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const p of list) {
    const [sx, sz] = span(p);
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x + sx);
    z0 = Math.min(z0, p.z);
    z1 = Math.max(z1, p.z + sz);
  }
  return [((x0 + x1) / 2) * CELL, ((z0 + z1) / 2) * CELL];
}

/** World pose of a placement: centre x, base y, centre z, rotation about y. */
export function pose(p: Placement, cx = 0, cz = 0): [number, number, number, number] {
  const [sx, sz] = span(p);
  return [(p.x + sx / 2) * CELL - cx, p.y * STOREY, (p.z + sz / 2) * CELL - cz, p.r ? Math.PI / 2 : 0];
}
