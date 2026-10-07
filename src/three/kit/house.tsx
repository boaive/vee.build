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
import { DEFAULT_FOUNDATION, FOUNDATION_HEIGHTS, trimFinishes, type AddOnId, type DeckSide, type Foundation, type ManualAddOn, type ShellType } from '../../data/build';
import { CELL, JACK, baseOf, foundationLayout, layoutAddOns, placeOf, type AddOnLayout, type Seg, type Unit } from '../../build/model';
import { UNIT_BOX, merge } from './geometry';
import type { Look } from './looks';
import { deckMat, instanced, mat, moduleMats, trimMat } from './materials';
import { FOUNDATION, footingGeometry, footingReach, jackBaseGeometry, jackNutGeometry, jackScrewGeometry, moduleGeometry, plinthGeometry, slopedRoofGeometry, stairGeometry } from './parts';
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

  const steps: BufferGeometry[] = [];
  for (const st of l.steps) {
    const risers = Math.max(2, Math.round(l.deckY / 0.18));
    const run = risers * 0.28;
    const g = stairGeometry(`house-steps-${risers}`, st.w, l.deckY, run, risers).clone();
    // Climb towards the house: local +x turned onto the inward direction.
    const ry = Math.PI / 2 + (st.side * Math.PI) / 2;
    const fx = Math.sin(st.ry);
    const fz = Math.cos(st.ry);
    _q.setFromEuler(_e.set(0, ry, 0));
    _m.compose(_p.set(st.x + fx * run, 0, st.z + fz * run), _q, _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    steps.push(g);
  }

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
  const stepGeo = steps.length ? merge(steps) : null;
  if (stepGeo) boxUV(stepGeo, 1);
  const latticeGeo = mergeOr(lattice);
  if (latticeGeo) boxUV(latticeGeo, 0.6);
  return {
    deck: deckGeo,
    trim: mergeOr(trim),
    rails: mergeOr(railParts(l.rails)),
    steps: stepGeo,
    roofs: mergeOr(roofs),
    solar: mergeOr(solar),
    shadePanels: mergeOr(shadePanels),
    lattice: latticeGeo,
  };
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
}

function UnitsOf({ list, type, mats, pose, base }: { list: Unit[]; type: ShellType; mats: Material[]; pose?: HouseProps['pose']; base: number }) {
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

  if (!list.length) return null;
  return <instancedMesh key={list.length} ref={ref} args={[moduleGeometry(type), instanced(mats), list.length]} userData={{ type }} castShadow receiveShadow frustumCulled={false} />;
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
}: HouseProps) {
  const base = baseOf(foundation);
  const mats = moduleMats(shellHex, look.windows, trimHex);
  const listA = useMemo(() => units.filter((u) => u.t === 'A'), [units]);
  const listB = useMemo(() => units.filter((u) => u.t === 'B'), [units]);
  const layout = useMemo(() => layoutAddOns(units, new Set(addOns), deckSide, manual, base), [units, addOns, deckSide, manual, base]);
  const skirting = addOns.includes('spandrel');
  const meshes = useMemo(() => buildAddOns(layout, skirting), [layout, skirting]);
  const adds = useRef<Group>(null);

  useLayoutEffect(() => () => Object.values(meshes).forEach((g) => g?.dispose()), [meshes]);

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
      <UnitsOf list={listA} type="A" mats={mats} pose={pose} base={base} />
      <UnitsOf list={listB} type="B" mats={mats} pose={pose} base={base} />
      <group ref={adds}>
        {meshes.deck && <mesh geometry={meshes.deck} material={deck} castShadow receiveShadow />}
        {meshes.trim && <mesh geometry={meshes.trim} material={trim} castShadow receiveShadow />}
        {meshes.rails && <mesh geometry={meshes.rails} material={mat.steel} castShadow />}
        {meshes.steps && <mesh geometry={meshes.steps} material={[deck, trim]} castShadow receiveShadow />}
        {meshes.roofs && <mesh geometry={meshes.roofs} material={trim} castShadow receiveShadow />}
        {meshes.solar && <mesh geometry={meshes.solar} material={mat.solar} castShadow />}
        {meshes.shadePanels && <mesh geometry={meshes.shadePanels} material={mat.polycarb} castShadow />}
        {meshes.lattice && <mesh geometry={meshes.lattice} material={latticeMat(deckHex)} castShadow receiveShadow />}
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

