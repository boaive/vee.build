/**
 * A visitor's build as 3D: foundation, shells and add-ons, all derived from
 * the same model as the configurator's rules and plan. Used by the hero,
 * the configurator, "your house", the factory yard, delivery and the
 * installation.
 */
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  DoubleSide,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Material,
} from 'three';
import { DEFAULT_FOUNDATION, FOUNDATION_HEIGHTS, trimFinishes, type AddOnId, type DeckSide, type Foundation, type ManualAddOn, type Plot, type ShellType } from '../../data/build';
import type { DoorFace } from '../../data/system';
import { CELL, FRONT, JACK, STAIR, baseOf, doorFaces, foundationLayout, layoutAddOns, placeOf, stepRun, type AddOnLayout, type Seg, type Stair, type Unit } from '../../build/model';
import { UNIT_BOX, merge, mergeGroups } from './geometry';
import type { Look } from './looks';
import { deckMat, instanced, mat, moduleMats, trimMat } from './materials';
import { FOUNDATION, footingGeometry, footingReach, jackBaseGeometry, jackNutGeometry, jackScrewGeometry, moduleGeometry, plinthGeometry, slopedRoofGeometry } from './parts';
import { latticeCard, tile } from './pbr';
import { boxUV } from './textures';

/* ------------------------------------------------------------------ */
/* Geometry batching                                                   */
/* ------------------------------------------------------------------ */

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/** A box of size (w, h, d), centred at (x, y, z), turned ry about y then rx about its own x. */
function placedBox(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const g = UNIT_BOX.clone();
  _e.set(rx, ry, 0, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(w, h, d));
  g.applyMatrix4(_m);
  return g;
}

const mergeOr = (parts: BufferGeometry[]) => (parts.length ? merge(parts) : null);
/** A dog-leg turns half-way up a storey. */
const STOREY_HALF = 1.5;

/** Posts every ~1.5 m, a top rail, a bottom rail and slim balusters, as the render. */
function railParts(segs: readonly Seg[], height = 1) {
  const parts: BufferGeometry[] = [];
  for (const s of segs) {
    const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    if (len < 0.2) continue;
    const ry = -Math.atan2(s.z1 - s.z0, s.x1 - s.x0);
    const at = (t: number): [number, number] => [s.x0 + (s.x1 - s.x0) * t, s.z0 + (s.z1 - s.z0) * t];
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 0; k <= n; k++) {
      const [x, z] = at(k / n);
      parts.push(placedBox(0.055, height, 0.055, x, s.y + height / 2, z));
    }
    const b = Math.max(2, Math.round(len / 0.13));
    for (let k = 1; k < b; k++) {
      const [x, z] = at(k / b);
      parts.push(placedBox(0.018, height - 0.16, 0.018, x, s.y + 0.08 + (height - 0.16) / 2, z));
    }
    const [mx, mz] = at(0.5);
    parts.push(placedBox(len + 0.055, 0.045, 0.06, mx, s.y + height - 0.022, mz, ry), placedBox(len, 0.03, 0.03, mx, s.y + 0.08, mz, ry));
  }
  return parts;
}

/**
 * A straight flight from (x, y0, z) climbing along (ux, uz) to height y1
 * over `run` metres. Treads and stringers go to separate lists: they take
 * different materials.
 */
function flight(treads: BufferGeometry[], stringers: BufferGeometry[], x: number, y0: number, z: number, ux: number, uz: number, run: number, y1: number, width: number, risers: number) {
  const rise = y1 - y0;
  const dr = rise / risers;
  const dx = run / risers;
  // Local +z along the flight.
  const ry = Math.atan2(ux, uz);
  for (let i = 0; i < risers; i++) {
    const d = dx * (i + 0.5);
    treads.push(placedBox(width, 0.05, dx * 0.92, x + ux * d, y0 + dr * (i + 1) - 0.025, z + uz * d, ry));
  }
  const len = Math.hypot(rise, run);
  const pitch = -Math.atan2(rise, run);
  for (const side of [-1, 1]) {
    const o = (side * width) / 2;
    stringers.push(placedBox(0.05, 0.2, len, x + (ux * run) / 2 + uz * o, y0 + rise / 2 - 0.1, z + (uz * run) / 2 - ux * o, ry, pitch));
  }
}

/** A handrail that follows a flight: a top bar, a lower bar and three posts. */
function slopedRail(parts: BufferGeometry[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, height = 1) {
  const run = Math.hypot(x1 - x0, z1 - z0);
  const len = Math.hypot(run, y1 - y0);
  const ry = Math.atan2(x1 - x0, z1 - z0);
  const pitch = -Math.atan2(y1 - y0, run);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const mz = (z0 + z1) / 2;
  parts.push(placedBox(0.06, 0.045, len, mx, my + height - 0.022, mz, ry, pitch), placedBox(0.03, 0.03, len, mx, my + height * 0.5, mz, ry, pitch));
  for (const t of [0.02, 0.5, 0.98]) parts.push(placedBox(0.045, height, 0.045, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + height / 2, z0 + (z1 - z0) * t));
}

/**
 * The outer staircase (model.ts, Stair): for each floor a flight out along
 * one lane to a half landing, a turn, and a flight back along the other
 * lane to that floor's landing, all in one footprint between four posts.
 */
function stairParts(t: Stair, deck: BufferGeometry[], trim: BufferGeometry[], treads: BufferGeometry[], stringers: BufferGeometry[], rails: BufferGeometry[]) {
  const [lx, lz] = FRONT[t.u];
  const [wx, wz] = FRONT[t.v];
  /** l metres along its length from the landings' end, w metres across from the side the floor meets. */
  const at = (l: number, w: number): [number, number] => [t.x + lx * l + wx * w, t.z + lz * l + wz * w];
  // Local x of a slab onto the long axis.
  const ry = Math.atan2(-lz, lx);
  const { w, lane, land, half, run, len } = STAIR;
  const far = land + run;
  const seg = (l0: number, w0: number, l1: number, w1: number, y: number): Seg => {
    const [x0, z0] = at(l0, w0);
    const [x1, z1] = at(l1, w1);
    return { x0, z0, x1, z1, y };
  };
  const slab = (l0: number, length: number, y: number) => {
    const [x, z] = at(l0 + length / 2, w / 2);
    deck.push(placedBox(length, 0.08, w, x, y - 0.04, z, ry));
    trim.push(placedBox(length - 0.04, 0.12, w - 0.04, x, y - 0.14, z, ry));
  };
  const flat: Seg[] = [];
  const last = t.levels.length - 1;
  t.levels.forEach((yk, k) => {
    const y0 = k ? t.levels[k - 1] : 0;
    const mid = yk - STOREY_HALF;
    // Out along the outer lane. The first floor's flight starts on the ground and is longer.
    const nA = Math.max(2, Math.round((mid - y0) / 0.1875));
    const runA = Math.min(nA * 0.25, far - 0.05);
    const [sx, sz] = at(far - runA, w - lane / 2);
    flight(treads, stringers, sx, y0, sz, lx, lz, runA, mid, lane - 0.08, nA);
    slab(far, half, mid);
    // Back along the inner lane, up to the floor.
    const [bx, bz] = at(far, lane / 2);
    flight(treads, stringers, bx, mid, bz, -lx, -lz, run, yk, lane - 0.08, 8);
    slab(0, land, yk);

    const [r0x, r0z] = at(far - runA, w - 0.03);
    const [r1x, r1z] = at(far, w - 0.03);
    slopedRail(rails, r0x, y0, r0z, r1x, mid, r1z);
    const [q0x, q0z] = at(far, 0.03);
    const [q1x, q1z] = at(land, 0.03);
    slopedRail(rails, q0x, mid, q0z, q1x, yk, q1z);
    // The half landing: railed on its three free sides.
    flat.push(seg(len, 0, len, w, mid), seg(far, 0, len, 0, mid), seg(far, w, len, w, mid));
    // The floor's landing: railed across its end and along its far side, open where the floor meets it.
    flat.push(seg(0, 0, 0, w, yk), seg(0, w, land, w, yk));
    if (!t.open[k]) flat.push(seg(0, 0, land, 0, yk));
    // No flight leaves the top landing: its outer lane is closed.
    if (k === last) flat.push(seg(land, w - lane - 0.05, land, w, yk));
  });
  rails.push(...railParts(flat));
  const top = t.levels[last] + 1;
  for (const l of [0.05, len - 0.05])
    for (const ww of [0.05, w - 0.05]) {
      const [px, pz] = at(l, ww);
      trim.push(placedBox(0.09, top, 0.09, px, top / 2, pz));
    }
}

const stairsBuilt = new WeakMap<Stair, BufferGeometry>();
/**
 * The outer staircase by itself, as one piece, for a building that draws
 * its own gallery (the prefab block of the hero): the same dog-leg as
 * everywhere else, where the rule put it. Groups: 0 landings and treads,
 * 1 frames, posts and stringers, 2 rails.
 */
export function stairGeometryOf(t: Stair): BufferGeometry {
  let g = stairsBuilt.get(t);
  if (!g) {
    const deck: BufferGeometry[] = [];
    const trim: BufferGeometry[] = [];
    const treads: BufferGeometry[] = [];
    const stringers: BufferGeometry[] = [];
    const rails: BufferGeometry[] = [];
    stairParts(t, deck, trim, treads, stringers, rails);
    g = mergeGroups([
      [...deck, ...treads],
      [...trim, ...stringers],
      rails,
    ]);
    boxUV(g, 1);
    stairsBuilt.set(t, g);
  }
  return g;
}

interface AddOnMeshes {
  deck: BufferGeometry | null;
  trim: BufferGeometry | null;
  rails: BufferGeometry | null;
  steps: BufferGeometry | null;
  roofs: BufferGeometry | null;
  solar: BufferGeometry | null;
  shadePanels: BufferGeometry | null;
  lattice: BufferGeometry | null;
}

const PANEL = { w: 1.66, d: 1.02 };

function buildAddOns(l: AddOnLayout, skirting: boolean): AddOnMeshes {
  const deck: BufferGeometry[] = [];
  const trim: BufferGeometry[] = [];
  const lattice: BufferGeometry[] = [];
  for (const r of l.decks) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    deck.push(placedBox(w, 0.08, d, (r.x0 + r.x1) / 2, l.deckY - 0.04, (r.z0 + r.z1) / 2));
    // Joists under the boards read as the deck's underside.
    deck.push(placedBox(w - 0.1, 0.14, d - 0.1, (r.x0 + r.x1) / 2, l.deckY - 0.15, (r.z0 + r.z1) / 2));
  }
  for (const [x, z] of l.posts) trim.push(placedBox(0.11, l.deckY - 0.08, 0.11, x, (l.deckY - 0.08) / 2, z));
  // Upper floors: a walkway at each door, boards on a steel frame carried off the shells.
  for (const g of l.galleries) {
    const w = g.x1 - g.x0;
    const d = g.z1 - g.z0;
    const cx = (g.x0 + g.x1) / 2;
    const cz = (g.z0 + g.z1) / 2;
    deck.push(placedBox(w, 0.08, d, cx, g.y - 0.04, cz));
    trim.push(placedBox(w, 0.14, d, cx, g.y - 0.15, cz));
  }
  for (const s of l.spandrels) {
    const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    const ry = -Math.atan2(s.z1 - s.z0, s.x1 - s.x0);
    trim.push(placedBox(len + 0.04, 0.18, 0.035, (s.x0 + s.x1) / 2, l.deckY - 0.13, (s.z0 + s.z1) / 2, ry));
    // Lattice skirting from the spandrel to the ground (ref H6).
    if (skirting) {
      const h = l.deckY - 0.22;
      if (h > 0.12) lattice.push(placedBox(len, h, 0.02, (s.x0 + s.x1) / 2, h / 2, (s.z0 + s.z1) / 2, ry));
    }
  }
  const shadePanels: BufferGeometry[] = [];
  for (const s of l.shades) {
    // Door and window shade (ref H5): a light frame holding translucent panels, on two brackets.
    const tilt = 0.16;
    trim.push(placedBox(s.w, 0.05, 0.05, s.x, s.y, s.z, s.ry, tilt));
    const fx = Math.sin(s.ry);
    const fz = Math.cos(s.ry);
    trim.push(placedBox(s.w, 0.04, 0.04, s.x + fx * 0.3, s.y - 0.06, s.z + fz * 0.3, s.ry, tilt));
    const n = Math.max(1, Math.round(s.w / 0.9));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n - 0.5;
      const ox = Math.cos(s.ry) * t * s.w;
      const oz = -Math.sin(s.ry) * t * s.w;
      shadePanels.push(placedBox(s.w / n - 0.04, 0.012, 0.62, s.x + ox + fx * 0.15, s.y - 0.025, s.z + oz + fz * 0.15, s.ry, tilt));
    }
    for (const side of [-1, 1]) {
      const ox = Math.cos(s.ry) * side * (s.w / 2 - 0.05);
      const oz = -Math.sin(s.ry) * side * (s.w / 2 - 0.05);
      trim.push(placedBox(0.03, 0.03, 0.64, s.x + ox + fx * 0.15, s.y - 0.12, s.z + oz + fz * 0.15, s.ry, 0.55));
    }
  }

  const treads: BufferGeometry[] = [];
  const stringers: BufferGeometry[] = [];
  const railExtra: BufferGeometry[] = [];
  const { risers, run } = stepRun(l.deckY);
  for (const st of l.steps) {
    // From the ground, `run` out from the deck's edge, climbing towards the house.
    const [fx, fz] = FRONT[st.side];
    flight(treads, stringers, st.x + fx * run, 0, st.z + fz * run, -fx, -fz, run, l.deckY, st.w, risers);
  }
  for (const t of l.stairs) stairParts(t, deck, trim, treads, stringers, railExtra);

  const roofs: BufferGeometry[] = [];
  const RISE = 0.85;
  const EAVE = 0.22;
  const DEPTH = CELL + 0.34;
  for (const r of l.roofs) {
    const g = slopedRoofGeometry(r.w + 0.3, DEPTH, RISE, EAVE).clone();
    _q.setFromEuler(_e.set(0, r.ry, 0));
    _m.compose(_p.set(r.x, r.y + 0.005, r.z), _q, _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    roofs.push(g);
  }

  const solar: BufferGeometry[] = [];
  const pitch = Math.atan2(RISE - EAVE, DEPTH);
  for (const s of l.solar) {
    const cols = s.t === 'A' ? 3 : 1;
    const rows = 2;
    const cos = Math.cos(s.ry);
    const sin = Math.sin(s.ry);
    for (let c = 0; c < cols; c++)
      for (let k = 0; k < rows; k++) {
        // Local position on the roof (x along the shell, z towards its front).
        const lx = (c - (cols - 1) / 2) * (PANEL.w + 0.1);
        const lz = (k - (rows - 1) / 2) * (PANEL.d + 0.12);
        const wx = s.x + lx * cos + lz * sin;
        const wz = s.z - lx * sin + lz * cos;
        if (s.sloped) {
          const y = s.y + EAVE + (RISE - EAVE) * (0.5 - lz / DEPTH) + 0.06;
          solar.push(placedBox(PANEL.w, 0.04, PANEL.d, wx, y, wz, s.ry, pitch));
        } else {
          solar.push(placedBox(PANEL.w, 0.04, PANEL.d, wx, s.y + 0.32, wz, s.ry, 0.17));
          solar.push(placedBox(0.05, 0.3, 0.05, wx, s.y + 0.15, wz, s.ry));
        }
      }
  }

  const deckGeo = mergeOr(deck);
  if (deckGeo) boxUV(deckGeo, 1);
  // Two groups, treads then stringers: the mesh takes [deck, trim].
  const stepGeo = treads.length ? mergeGroups([treads, stringers]) : null;
  if (stepGeo) boxUV(stepGeo, 1);
  const latticeGeo = mergeOr(lattice);
  if (latticeGeo) boxUV(latticeGeo, 0.6);
  return {
    deck: deckGeo,
    trim: mergeOr(trim),
    rails: mergeOr([...railParts(l.rails), ...railExtra]),
    steps: stepGeo,
    roofs: mergeOr(roofs),
    solar: mergeOr(solar),
    shadePanels: mergeOr(shadePanels),
    lattice: latticeGeo,
  };
}

/** Deck boards, trim and rails are shared by decks, steps, shades and the upper-floor access. */
const ANY = ['deck', 'steps', 'shade', 'access'] as const;

const built = new WeakMap<AddOnLayout, { skirting: boolean; meshes: AddOnMeshes }>();
/** The geometry of a layout, built once for as long as the layout lives. A scene with fixed layouts can call this ahead of mounting. */
export function addOnMeshes(layout: AddOnLayout, skirting = false) {
  let b = built.get(layout);
  if (!b || b.skirting !== skirting) {
    b = { skirting, meshes: buildAddOns(layout, skirting) };
    built.set(layout, b);
  }
  return b.meshes;
}

/** The meshes of an add-on layout. Used by House, and on its own where a scene draws the shells itself (how it works). */
export function AddOnParts({ layout, skirting = false, deck, trim, deckHex }: { layout: AddOnLayout; skirting?: boolean; deck: Material; trim: Material; deckHex?: string }) {
  const meshes = useMemo(() => addOnMeshes(layout, skirting), [layout, skirting]);
  // Frees the GPU's copy; the geometry itself stays with its layout and is sent again if it is shown again.
  useLayoutEffect(() => () => Object.values(meshes).forEach((g) => g?.dispose()), [meshes]);
  return (
    <>
      {/* `addon`: which pieces a hit on this mesh can belong to (model.ts, pieceAt). */}
      {meshes.deck && <mesh geometry={meshes.deck} material={deck} userData={{ addon: ANY }} castShadow receiveShadow />}
      {meshes.trim && <mesh geometry={meshes.trim} material={trim} userData={{ addon: ANY }} castShadow receiveShadow />}
      {meshes.rails && <mesh geometry={meshes.rails} material={mat.steel} userData={{ addon: ANY }} castShadow />}
      {meshes.steps && <mesh geometry={meshes.steps} material={[deck, trim]} userData={{ addon: ['steps', 'access'] }} castShadow receiveShadow />}
      {meshes.roofs && <mesh geometry={meshes.roofs} material={trim} userData={{ addon: ['roof'] }} castShadow receiveShadow />}
      {meshes.solar && <mesh geometry={meshes.solar} material={mat.solar} userData={{ addon: ['solar'] }} castShadow />}
      {meshes.shadePanels && <mesh geometry={meshes.shadePanels} material={mat.polycarb} userData={{ addon: ['shade'] }} castShadow />}
      {meshes.lattice && deckHex && <mesh geometry={meshes.lattice} material={latticeMat(deckHex)} userData={{ addon: ['deck'] }} castShadow receiveShadow />}
    </>
  );
}

const latticeMats = new Map<string, MeshStandardMaterial>();
function latticeMat(hex: string) {
  let m = latticeMats.get(hex);
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, map: tile(latticeCard(), 1), alphaTest: 0.5, side: DoubleSide, roughness: 0.85 });
    m.map?.repeat.set(1, 1);
    latticeMats.set(hex, m);
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* Foundation                                                          */
/* ------------------------------------------------------------------ */

interface FoundationMeshes {
  footings: { geo: BufferGeometry; spots: [number, number][] }[];
  plinths: BufferGeometry | null;
  jacks: [number, number][];
  above: number;
}

function foundationMeshes(units: readonly Unit[], f: Foundation): FoundationMeshes {
  const above = FOUNDATION_HEIGHTS[f.h] / 1000;
  const layout = foundationLayout(units);
  const groups = new Map<string, { geo: BufferGeometry; spots: [number, number][] }>();
  for (const s of layout.footings) {
    const reach = footingReach(s.q);
    const k = `${reach.nx}-${reach.px}-${reach.nz}-${reach.pz}`;
    let g = groups.get(k);
    if (!g) {
      g = { geo: footingGeometry(above, reach), spots: [] };
      groups.set(k, g);
    }
    g.spots.push([s.x, s.z]);
  }
  let plinths: BufferGeometry | null = null;
  if (f.type === 'plinth') {
    const parts: BufferGeometry[] = [];
    for (const r of layout.plinths) {
      const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0) - FOUNDATION.pedestal;
      if (len < 0.3) continue;
      const g = plinthGeometry(len, above, r.piece, r.shared).clone();
      const alongX = Math.abs(r.z1 - r.z0) < 1e-6;
      // Local toe points +z; turn it to the run's inward side.
      const ry = alongX ? (r.inward === 2 ? Math.PI : 0) : r.inward === 3 ? -Math.PI / 2 : Math.PI / 2;
      _q.setFromEuler(_e.set(0, ry, 0));
      _m.compose(_p.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2), _q, _s.set(1, 1, 1));
      g.applyMatrix4(_m);
      parts.push(g);
    }
    plinths = mergeOr(parts);
    if (plinths) boxUV(plinths, 1.4);
  }
  return { footings: [...groups.values()], plinths, jacks: layout.footings.map((s) => [s.x, s.z]), above };
}

function Instances({ geo, material, spots, y = 0 }: { geo: BufferGeometry; material: Material; spots: [number, number][]; y?: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    spots.forEach(([x, z], i) => {
      _m.makeTranslation(x, y, z);
      m.setMatrixAt(i, _m);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots, y]);
  if (!spots.length) return null;
  return <instancedMesh key={spots.length} ref={ref} args={[geo, instanced(material), spots.length]} castShadow receiveShadow frustumCulled={false} />;
}

/** Footings, L plinths and jacks under the ground floor (client's model, notes H1–H2). */
export function FoundationParts({ units, foundation = DEFAULT_FOUNDATION, jacks = true }: { units: readonly Unit[]; foundation?: Foundation; jacks?: boolean }) {
  const m = useMemo(() => foundationMeshes(units, foundation), [units, foundation]);
  useLayoutEffect(() => () => m.plinths?.dispose(), [m]);
  return (
    <>
      {m.footings.map((f, i) => (
        <Instances key={i} geo={f.geo} material={mat.concrete} spots={f.spots} />
      ))}
      {m.plinths && <mesh geometry={m.plinths} material={mat.concrete} castShadow receiveShadow />}
      {jacks && (
        <>
          <Instances geo={jackBaseGeometry()} material={mat.galv} spots={m.jacks} y={m.above} />
          <Instances geo={jackScrewGeometry()} material={mat.galv} spots={m.jacks} y={m.above + JACK} />
          <Instances geo={jackNutGeometry()} material={mat.steel} spots={m.jacks} y={m.above + 0.055} />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface HouseProps {
  units: readonly Unit[];
  addOns: readonly AddOnId[];
  deckSide: DeckSide;
  /** Hand-placed add-ons; null lays them out automatically. */
  manual?: readonly ManualAddOn[] | null;
  shellHex: string;
  deckHex: string;
  trimHex?: string;
  look: Look;
  foundation?: Foundation;
  /** Draw the foundation. Off where a scene draws its own. */
  footings?: boolean;
  /**
   * Per-shell offset while animating: [dx, dy, dz, scale, turn?]. Called
   * every frame when given; return null to hide a shell. `turn` overrides the
   * shell's rotation (radians) while it is in the air.
   */
  pose?: (u: Unit, i: number) => [number, number, number, number, number?] | null;
  /** 0–1: how far the add-ons have arrived (they drop in from above). */
  addOnT?: () => number;
  /** The plot, where there is one: the outer staircase keeps inside it when it can. */
  plot?: Plot;
  /** Glazing of the scene's own, in place of the look's: for a house whose lights the scene brings up itself (materials.ts, litGlass). */
  glass?: Material;
}

function UnitsOf({ list, type, door, mats, pose, base }: { list: Unit[]; type: ShellType; door: DoorFace; mats: Material[]; pose?: HouseProps['pose']; base: number }) {
  const ref = useRef<InstancedMesh>(null);
  const places = useMemo(() => list.map((u) => placeOf(u, base)), [list, base]);

  const apply = () => {
    const m = ref.current;
    if (!m) return;
    list.forEach((u, i) => {
      const [x, y, z, ry] = places[i];
      const p = pose ? pose(u, i) : null;
      const off: [number, number, number, number, number?] | null = pose ? p : [0, 0, 0, 1];
      if (!off) {
        _m.makeScale(0.0001, 0.0001, 0.0001);
        m.setMatrixAt(i, _m);
        return;
      }
      _q.setFromEuler(_e.set(0, off[4] ?? ry, 0));
      _m.compose(_p.set(x + off[0], y + off[1], z + off[2]), _q, _s.setScalar(Math.max(0.0001, off[3])));
      m.setMatrixAt(i, _m);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(apply);
  useFrame(() => {
    if (pose) apply();
  });

  // `units`: the shell behind each instance, for picking.
  return <instancedMesh key={list.length} ref={ref} args={[moduleGeometry(type, door), instanced(mats), list.length]} userData={{ units: list }} castShadow receiveShadow frustumCulled={false} />;
}

/** The shells grouped by type and by the face their door is on: one instanced mesh each. */
export function shellPools(units: readonly Unit[]) {
  const doors = doorFaces(units);
  const pools = new Map<string, { key: string; type: ShellType; door: DoorFace; list: Unit[] }>();
  for (const u of units) {
    const door = doors.get(u.id) ?? 'front';
    const key = `${u.t}-${door}`;
    const pool = pools.get(key);
    if (pool) pool.list.push(u);
    else pools.set(key, { key, type: u.t, door, list: [u] });
  }
  return [...pools.values()];
}

export function House({
  units,
  addOns,
  deckSide,
  manual = null,
  shellHex,
  deckHex,
  trimHex = trimFinishes[0].hex,
  look,
  foundation = DEFAULT_FOUNDATION,
  footings = true,
  pose,
  addOnT,
  plot,
  glass,
}: HouseProps) {
  const base = baseOf(foundation);
  const mats = useMemo(() => {
    const m = moduleMats(shellHex, look.windows, trimHex);
    return glass ? [m[0], m[1], glass, m[3], m[4]] : m;
  }, [shellHex, look.windows, trimHex, glass]);
  const pools = useMemo(() => shellPools(units), [units]);
  const layout = useMemo(() => layoutAddOns(units, new Set(addOns), deckSide, manual, base, plot), [units, addOns, deckSide, manual, base, plot]);
  const skirting = addOns.includes('spandrel');
  const adds = useRef<Group>(null);

  useFrame(() => {
    const g = adds.current;
    if (!g || !addOnT) return;
    const t = addOnT();
    g.visible = t > 0.001;
    g.position.y = (1 - t) * 2.5;
  });

  const deck = deckMat(deckHex);
  const trim = trimMat(trimHex);
  return (
    <group>
      {footings && <FoundationParts units={units} foundation={foundation} />}
      {pools.map((p) => (
        <UnitsOf key={p.key} list={p.list} type={p.type} door={p.door} mats={mats} pose={pose} base={base} />
      ))}
      <group ref={adds}>
        <AddOnParts layout={layout} skirting={skirting} deck={deck} trim={trim} deckHex={deckHex} />
      </group>
    </group>
  );
}

/** A translucent preview of an add-on layout (configurator placement). */
export function AddOnGhost({ layout, material }: { layout: AddOnLayout | null; material: Material }) {
  const meshes = useMemo(() => (layout ? buildAddOns(layout, false) : null), [layout]);
  useLayoutEffect(
    () => () => {
      if (meshes) Object.values(meshes).forEach((g) => g?.dispose());
    },
    [meshes],
  );
  if (!meshes) return null;
  return (
    <group renderOrder={3}>
      {Object.values(meshes).map((g, i) => g && <mesh key={i} geometry={g} material={material} />)}
    </group>
  );
}

