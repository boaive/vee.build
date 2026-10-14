/**
 * The four building types from the hero, as models built from the kit.
 * Each takes `getA`, its assembly progress (0 = bare site, 1 = complete),
 * and is reused on the Capsule and Prefab pages.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, EdgesGeometry, ExtrudeGeometry, Object3D, Shape, type Group, type InstancedMesh, type Material, type Mesh } from 'three';
import { layoutAddOns, type Stair, type Unit } from '../../build/model';
import type { Turn } from '../../data/build';
import type { DoorFace, ModuleType, Placement } from '../../data/system';
import { clamp01, ease, stagger, win } from '../../film/timeline';
import { UNIT_BOX, box, memo, merge, planCentre, pose, setInst } from './geometry';
import type { Look } from './looks';
import { instanced, kit, litGlass, mat, moduleMats } from './materials';
import { POD, POD_STEPS, capsuleGeometry, type PodSection } from './capsule';
import { useRefined } from './refined';
import { stairGeometryOf } from './house';
import { moduleGeometry, railGeometry, stairGeometry, wallPanel36Geometry } from './parts';

export type Label = (id: string, x: number, y: number, z: number, opacity: number) => void;

export interface BuildingProps {
  x?: number;
  getA: () => number;
  label?: Label;
  /** 0–1 multiplier for this building's labels (1 when it is the one in shot). */
  getShow?: () => number;
  /**
   * 0–1: its lights. Dark while it is put together, on once it stands
   * (client, 2026-10-10). Not given: lit throughout, as the look has them.
   */
  getLit?: () => number;
  look: Look;
}

const SHADE = new Color();
const A = (x: number, z: number, y = 0, r: 0 | 1 = 0): Placement => ({ t: 'A', x, y, z, r });
const B = (x: number, z: number, y = 0): Placement => ({ t: 'B', x, y, z });

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

interface DropProps {
  type: ModuleType;
  list: Placement[];
  centre: [number, number];
  base?: number;
  getT: () => number;
  materials: Material[];
  /** Position of this pool's first module in the building-wide sequence. */
  first?: number;
  total?: number;
  drop?: number;
  overlap?: number;
  /** The face that carries each shell's door. */
  door?: DoorFace;
  /**
   * Each shell a shade of its own, a few hundredths either way: shells cast
   * on different days are never quite one colour, and a block of them that
   * is reads as one moulding. For a refined scene (kit/refined.ts).
   */
  varied?: boolean;
}

/** Modules lowered into place one after another, as they are on site. */
export function DropModules({ type, list, centre, base = 0, getT, materials, first = 0, total, drop = 7, overlap = 0.62, door = 'front', varied = false }: DropProps) {
  const ref = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || !varied) return;
    for (let i = 0; i < list.length; i++) {
      const h = Math.sin((first + i) * 12.9898 + 4.1) * 43758.5453;
      m.setColorAt(i, SHADE.setScalar(0.93 + 0.11 * (h - Math.floor(h))));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [varied, list, first]);
  const poses = useMemo(() => list.map((p) => pose(p, centre[0], centre[1])), [list, centre]);
  const n = total ?? list.length;

  useFrame(() => {
    const m = ref.current;
    const t = getT();
    if (!m || t === last.current) return;
    last.current = t;
    for (let i = 0; i < poses.length; i++) {
      const [x, y, z, ry] = poses[i];
      const ti = stagger(t, first + i, n, overlap);
      const s = ti <= 0 ? 0.0001 : Math.min(1, ti * 7);
      setInst(m, i, x, base + y + (1 - ease.outQuart(ti)) * drop, z, ry, s);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[moduleGeometry(type, door), instanced(materials), list.length]} castShadow receiveShadow frustumCulled={false} />;
}

/** A flat slab with rounded corners, lying on the ground with its underside at y = 0. Cached: clone before changing it. */
export function padGeometry(w: number, d: number, r = 1, thickness = 0.06) {
  return memo(`pad-${w}-${d}-${r}-${thickness}`, () => {
    const s = new Shape();
    const hw = w / 2;
    const hd = d / 2;
    s.moveTo(-hw + r, -hd);
    s.lineTo(hw - r, -hd);
    s.quadraticCurveTo(hw, -hd, hw, -hd + r);
    s.lineTo(hw, hd - r);
    s.quadraticCurveTo(hw, hd, hw - r, hd);
    s.lineTo(-hw + r, hd);
    s.quadraticCurveTo(-hw, hd, -hw, hd - r);
    s.lineTo(-hw, -hd + r);
    s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    const g = new ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 5 });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

/** A flat slab with rounded corners lying on the ground (lawn, gravel, paving). */
export function Pad({ w, d, r = 1, y = 0, x = 0, z = 0, rot = 0, material, thickness = 0.06 }: { w: number; d: number; r?: number; y?: number; x?: number; z?: number; rot?: number; material: Material; thickness?: number }) {
  const geo = useMemo(() => padGeometry(w, d, r, thickness), [w, d, r, thickness]);
  return <mesh geometry={geo} material={material} position={[x, y, z]} rotation-y={rot} receiveShadow />;
}

const GROUND = 0.06;

/* ------------------------------------------------------------------ */
/* 1. Modern farmhouse                                                 */
/* ------------------------------------------------------------------ */

const FARM = [A(0, 0), A(0, 1), B(2, 0)];
const FARM_C = planCentre(FARM);
const FARM_BASE = GROUND + 0.42;


export function Farmhouse({ x = 0, getA, look }: BuildingProps) {
  const extras = useRef<Group>(null);
  const mats = moduleMats(undefined, look.windows);
  const piers = useMemo(
    () =>
      memo('farm-piers', () => {
        const g = [];
        for (const p of FARM) {
          const [px, , pz, ry] = pose(p, FARM_C[0], FARM_C[1]);
          const hx = (p.t === 'A' ? 3 : 1.5) - 0.35;
          const hz = 1.5 - 0.35;
          for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
              const ox = ry ? sz * hz : sx * hx;
              const oz = ry ? sx * hx : sz * hz;
              g.push(box(0.36, 0.42, 0.36, px + ox, GROUND + 0.21, pz + oz));
            }
        }
        return merge(g);
      }),
    [],
  );
  const rail = railGeometry('farm-deck', [
    [2.95, 2.95],
    [4.45, 2.95],
    [4.45, 0.05],
  ]);
  const stair = stairGeometry('farm', 1.3, FARM_BASE + 0.12 - GROUND, 0.9, 3);
  const floor = FARM_BASE + 0.12;

  useFrame(() => {
    const g = extras.current;
    if (!g) return;
    const t = win(getA(), 0.72, 1, ease.out);
    g.position.y = (1 - t) * 3;
    g.scale.setScalar(Math.max(0.0001, Math.min(1, t * 5)));
  });

  return (
    <group position-x={x}>
      <mesh geometry={piers} material={mat.concrete} castShadow receiveShadow />
      <DropModules type="A" list={FARM.slice(0, 2)} centre={FARM_C} base={FARM_BASE} materials={mats} getT={() => win(getA(), 0, 0.8, ease.linear)} total={3} />
      <DropModules type="B" list={FARM.slice(2)} centre={FARM_C} base={FARM_BASE} materials={mats} getT={() => win(getA(), 0, 0.8, ease.linear)} first={2} total={3} />

      <group ref={extras}>
        <mesh geometry={UNIT_BOX} material={mat.deck} scale={[2.9, 0.1, 2.9]} position={[3, floor - 0.05, 1.5]} castShadow receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[2.94, 0.16, 0.04]} position={[3, floor - 0.13, 2.97]} castShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[0.04, 0.16, 2.94]} position={[4.47, floor - 0.13, 1.5]} castShadow />
        {[
          [1.7, 2.8],
          [4.3, 2.8],
          [4.3, 0.2],
        ].map(([px, pz]) => (
          <mesh key={`${px}-${pz}`} geometry={UNIT_BOX} material={mat.trim} scale={[0.1, floor - GROUND, 0.1]} position={[px, GROUND + (floor - GROUND) / 2, pz]} castShadow />
        ))}
        <mesh geometry={rail} material={mat.steel} position-y={floor} castShadow />
        <mesh geometry={stair} material={[mat.deck, mat.trim]} position={[2.25, GROUND, 3.87]} rotation-y={Math.PI / 2} castShadow receiveShadow />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Capsule pods — 10′, 16′, 20′ long                                */
/* ------------------------------------------------------------------ */

export const POD_FEET = [10, 16, 20] as const;
const FT = 0.3048;
const POD_GAP = 2.4;
const POD_LEN = POD_FEET.map((f) => f * FT);
const POD_SPAN = POD_LEN.reduce((s, l) => s + l, 0) + POD_GAP * 2;
const POD_X = POD_LEN.map((l, i) => -POD_SPAN / 2 + POD_LEN.slice(0, i).reduce((s, v) => s + v + POD_GAP, 0) + l / 2);
/** The dimension line runs along the ground in front of the steps. */
const POD_DIM_Z = POD.D / 2 + POD_STEPS + 0.3;

/** capsuleGeometry's groups: shell, dark metal, glazing (lit at dusk, with its light lines), timber steps. `fine`: the shell and the metal in their refined finishes. */
const capsuleMats = (look: Look, fine: boolean): Material[] => [kit('pod', fine), kit('fascia', fine), look.windows === 'dusk' ? mat.glassLit : mat.glass, mat.deck];

interface CapsuleProps {
  feet: number;
  /** 0–1: the capsule is lowered onto its legs. */
  getT: () => number;
  look: Look;
  position?: [number, number, number];
  rotation?: number;
  /** Height it comes down from. */
  drop?: number;
  /** 0–1: its lights, where the scene brings them up itself (BuildingProps). */
  getLit?: () => number;
  /** Its section (capsule.ts): the phone's home-like one, or, not given, the desktop's. */
  section?: PodSection;
}

/** One capsule home, set down in place. */
export function Capsule({ feet, getT, look, position = [0, 0, 0], rotation = 0, drop = 5, getLit, section }: CapsuleProps) {
  const ref = useRef<Mesh>(null);
  const last = useRef(-1);
  const fine = useRefined();
  const glow = useMemo(() => (getLit && look.windows === 'dusk' ? litGlass(fine) : null), [getLit, look, fine]);
  useEffect(() => () => glow?.dispose(), [glow]);
  const mats = useMemo(() => {
    const m = capsuleMats(look, fine);
    return glow ? [m[0], m[1], glow.material, m[3]] : m;
  }, [look, glow, fine]);
  const base = position[1];
  useFrame(() => {
    if (glow && getLit) glow.set(getLit());
    const m = ref.current;
    const t = getT();
    if (!m || t === last.current) return;
    last.current = t;
    // Never hidden, only made very small: a mesh first shown in mid-film would compile its shaders on that frame.
    m.position.y = base + (1 - ease.outQuart(t)) * drop;
    m.scale.setScalar(Math.max(0.0001, Math.min(1, t * 7)));
  });
  return <mesh ref={ref} geometry={capsuleGeometry(feet, section)} material={mats} position={position} rotation-y={rotation} castShadow receiveShadow />;
}

export function CapsulePods({ x = 0, getA, label, getShow, look }: BuildingProps) {
  const dims = useRef<Group>(null);
  const drops = useMemo(() => POD_FEET.map((_, i) => () => stagger(win(getA(), 0, 0.85, ease.linear), i, 3, 0.55)), [getA]);
  // The pods light up together once the last of them stands.
  const lit = useMemo(() => () => win(getA(), 0.86, 0.97, ease.inOut), [getA]);

  useFrame(() => {
    const d = win(getA(), 0.8, 1, ease.out);
    if (dims.current) dims.current.scale.set(Math.max(0.0001, d), 1, 1);
    const show = d * (getShow?.() ?? 1);
    if (label) POD_X.forEach((px, i) => label(`pod-${POD_FEET[i]}`, x + px, GROUND + 0.02, POD_DIM_Z, show));
  });

  return (
    <group position-x={x}>
      {POD_FEET.map((feet, i) => (
        <Capsule key={feet} feet={feet} look={look} position={[POD_X[i], GROUND, 0]} getT={drops[i]} getLit={lit} />
      ))}
      {/* The pods are only ever seen at blue hour, a dark picture: their dimension lines take the dark ground's accent. */}
      <group ref={dims}>
        {POD_LEN.map((len, i) => (
          <group key={len} position={[POD_X[i], GROUND + 0.03, POD_DIM_Z]}>
            <mesh geometry={UNIT_BOX} material={mat.accentInk} scale={[len, 0.025, 0.025]} />
            <mesh geometry={UNIT_BOX} material={mat.accentInk} scale={[0.025, 0.025, 0.36]} position-x={-len / 2} />
            <mesh geometry={UNIT_BOX} material={mat.accentInk} scale={[0.025, 0.025, 0.36]} position-x={len / 2} />
          </group>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Workforce housing — G+1, final module on the crane               */
/* ------------------------------------------------------------------ */

/** Bays along the block in the workforce set and on the Prefab page; the opening card's block is shorter (row.ts, ROW_BAYS). */
export const WORK_BAYS = 6;
const HOOK_Y = 16.5;
/** The gallery's floor above the block's own ground line. */
const WORK_GALLERY = 3;

/** A G+1 block of turned Shell As, `bays` long: its shells, its centre, its length. */
interface Work {
  all: Placement[];
  centre: [number, number];
  last: number;
  /** Every shell but the one the crane brings. */
  set: Placement[];
  w: number;
}
const works = new Map<number, Work>();
function workOf(bays: number): Work {
  let w = works.get(bays);
  if (!w) {
    const all = [0, 1].flatMap((y) => Array.from({ length: bays }, (_, i) => A(i, 0, y, 1)));
    w = { all, centre: planCentre(all), last: all.length - 1, set: all.slice(0, all.length - 1), w: bays * 3 };
    works.set(bays, w);
  }
  return w;
}

/**
 * The block's outer staircase: the dog-leg every stacked building has,
 * beside the building and against its flank (client, 2026-10-07), where the
 * access rule puts it for these shells (build/model.ts, layoutAccess): at
 * the end of the gallery, its landing at the front corner. A straight
 * flight stood out from that end before (developer, 2026-10-10: "side ways,
 * as in every place"). The rule's gallery lies where the block's own does,
 * so the landing is set at the block's level.
 */
const workStairs = new Map<number, Stair | null>();
function workStairOf(bays: number) {
  let stair = workStairs.get(bays);
  if (stair === undefined) {
    const units: Unit[] = workOf(bays).all.map((p, i) => ({ id: i + 1, t: p.t, x: p.x, z: p.z, y: p.y, r: (p.r ?? 0) as Turn }));
    const s = layoutAddOns(units, new Set(), 0, [], 0).stairs[0];
    stair = s ? { ...s, levels: [WORK_GALLERY] } : null;
    workStairs.set(bays, stair);
  }
  return stair;
}


function Crane({ tip, getHookY }: { tip: [number, number, number]; getHookY: () => number }) {
  const boom = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const block = useRef<Mesh>(null);
  const base: [number, number, number] = [tip[0] + 11, 0, tip[2] - 4.5];
  const pivot: [number, number, number] = [base[0], 2.3, base[2]];
  const len = Math.hypot(tip[0] - pivot[0], tip[1] - pivot[1], tip[2] - pivot[2]);
  const edges = useMemo(() => memo('unit-edges', () => new EdgesGeometry(UNIT_BOX)), []);

  useLayoutEffect(() => {
    const o = new Object3D();
    o.position.set(...pivot);
    o.lookAt(...tip);
    boom.current?.quaternion.copy(o.quaternion);
  });

  useFrame(() => {
    const y = getHookY();
    if (cable.current) {
      cable.current.scale.y = Math.max(0.01, tip[1] - y);
      cable.current.position.y = (tip[1] + y) / 2;
    }
    if (block.current) block.current.position.y = y + 0.2;
  });

  const ghostBox = (key: string, s: [number, number, number], p: [number, number, number]) => (
    <group key={key} position={p} scale={s}>
      <mesh geometry={UNIT_BOX} material={mat.ghost} />
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#9aa1a7" transparent opacity={0.8} />
      </lineSegments>
    </group>
  );

  return (
    <group>
      {ghostBox('chassis', [3, 1.1, 7.5], [base[0], 1.05, base[2] + 0.6])}
      {ghostBox('cab', [2.6, 1.5, 2.2], [base[0], 2.35, base[2] + 3.2])}
      {ghostBox('slew', [2.4, 1.3, 3.2], [base[0], 2.25, base[2] - 0.6])}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => ghostBox(`rig${sx}${sz}`, [0.5, 0.5, 0.5], [base[0] + sx * 2.6, 0.25, base[2] + 0.6 + sz * 2.8])),
      )}
      <group ref={boom} position={pivot}>
        <group position-z={len / 2} scale={[0.6, 0.7, len]}>
          <mesh geometry={UNIT_BOX} material={mat.ghost} />
          <lineSegments geometry={edges}>
            <lineBasicMaterial color="#9aa1a7" transparent opacity={0.8} />
          </lineSegments>
        </group>
      </group>
      <mesh ref={cable} geometry={UNIT_BOX} material={mat.steel} position={[tip[0], tip[1], tip[2]]} scale={[0.035, 1, 0.035]} />
      <mesh ref={block} geometry={UNIT_BOX} material={mat.steel} position={[tip[0], tip[1], tip[2]]} scale={[0.3, 0.4, 0.3]} />
    </group>
  );
}

/**
 * `crane`: the mobile crane stands by with the last shell on its hook (the
 * hero's set and the Prefab page). Without it the block is simply lowered
 * in, every shell and then its gallery. On the opening card it is drawn whole
 * (`getA` 1) and the scene moves it as one (HeroScene, `raise`).
 */
export function WorkforceBlock({ x = 0, getA, getLit, look, crane = true, bays = WORK_BAYS }: BuildingProps & { crane?: boolean; bays?: number }) {
  const { all: WORK, centre: WORK_C, last: WORK_LAST, set: WORK_SET, w: WORK_W } = workOf(bays);
  const last = useRef<Mesh>(null);
  const extras = useRef<Group>(null);
  const hookY = useRef(HOOK_Y);
  const fine = useRefined();
  const glow = useMemo(() => (getLit && look.windows === 'dusk' ? litGlass(fine) : null), [getLit, look, fine]);
  useEffect(() => () => glow?.dispose(), [glow]);
  const mats = useMemo(() => {
    const m = moduleMats(undefined, look.windows, undefined, fine);
    return glow ? [m[0], m[1], glow.material, m[3], m[4]] : m;
  }, [look, glow, fine]);
  const [lx, ly, lz, lry] = pose(WORK[WORK_LAST], WORK_C[0], WORK_C[1]);
  const front = 3;
  const rail = railGeometry(`work-gallery-${bays}`, [
    [-WORK_W / 2, front + 1.5],
    [WORK_W / 2, front + 1.5],
    [WORK_W / 2, front],
  ]);
  const stair = workStairOf(bays);
  // Landings and treads, frames and stringers, rails.
  const stairMats = useMemo(() => [kit('concrete', fine), kit('trim', fine), kit('steel', fine)], [fine]);
  // The gallery's posts, as one mesh.
  const posts = memo(`work-posts-${bays}`, () => merge(Array.from({ length: bays + 1 }, (_, i) => box(0.12, 2.86, 0.12, -WORK_W / 2 + i * 3, 1.43, front + 1.42))));

  useFrame(() => {
    const a = getA();
    if (glow && getLit) glow.set(getLit());
    // The crane holds the last module above its slot, then lowers it.
    const t = win(a, 0.66, 1, ease.inOut);
    const y = GROUND + ly + (1 - t) * 6.5;
    if (last.current) {
      last.current.position.y = y;
      last.current.visible = a > 0.3;
    }
    hookY.current = a > 0.3 ? y + 3.1 : HOOK_Y - 1.5;
    const g = extras.current;
    if (g) {
      const e = crane ? win(a, 0.42, 0.66, ease.out) : win(a, 0.7, 1, ease.out);
      // On the opening card it stands on a floor that shows everything: before its turn the gallery is a speck, not a slab lying flat.
      const flat = !crane && e <= 0 ? 0.0001 : 1;
      g.scale.set(flat, Math.max(0.0001, e), flat);
    }
  });

  return (
    <group position-x={x}>
      <DropModules type="A" door="left" list={crane ? WORK_SET : WORK} centre={WORK_C} base={GROUND} materials={mats} getT={() => win(getA(), 0, crane ? 0.6 : 0.78, ease.linear)} overlap={0.72} varied={fine} />
      {crane && <mesh ref={last} geometry={moduleGeometry('A', 'left')} material={mats} position={[lx, GROUND + ly, lz]} rotation-y={lry} castShadow receiveShadow />}

      <group ref={extras} position-y={GROUND}>
        <mesh geometry={UNIT_BOX} material={kit('concrete', fine)} scale={[WORK_W + 0.1, 0.14, 1.5]} position={[0, WORK_GALLERY - 0.07, front + 0.75]} castShadow receiveShadow />
        <mesh geometry={posts} material={kit('trim', fine)} castShadow />
        <mesh geometry={rail} material={kit('steel', fine)} position-y={WORK_GALLERY} castShadow />
        {/* The rule works in the plot's own coordinates: the block is drawn about its centre. */}
        {stair && <mesh geometry={stairGeometryOf(stair)} material={stairMats} position={[-WORK_C[0], 0, -WORK_C[1]]} castShadow receiveShadow />}
      </group>

      {crane && <Crane tip={[lx, HOOK_Y, lz]} getHookY={() => hookY.current} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Institutional — G+2, 36′ wall panels gliding into position       */
/* ------------------------------------------------------------------ */

const PANEL = 10.97;
const INST_W = PANEL * 3;
const INST_D = PANEL;
const FLOOR = 3.6;

interface PanelSpot {
  x: number;
  y: number;
  z: number;
  ry: number;
  glide?: 0 | 1;
}

const INST_PANELS: PanelSpot[] = (() => {
  const out: PanelSpot[] = [];
  for (let f = 0; f < 3; f++) {
    const y = f * FLOOR + 0.05;
    for (let c = 0; c < 3; c++) out.push({ x: (c - 1) * PANEL, y, z: -INST_D / 2, ry: Math.PI });
    out.push({ x: -INST_W / 2, y, z: 0, ry: -Math.PI / 2 });
    out.push({ x: INST_W / 2, y, z: 0, ry: Math.PI / 2 });
  }
  // Front last; the two that glide in are the brief's highlighted panels.
  for (let f = 0; f < 3; f++)
    for (let c = 0; c < 3; c++) {
      const glide = f === 2 && c === 1 ? 0 : f === 1 && c === 2 ? 1 : undefined;
      if (glide === undefined) out.push({ x: (c - 1) * PANEL, y: f * FLOOR + 0.05, z: INST_D / 2, ry: 0 });
    }
  out.push({ x: PANEL, y: FLOOR + 0.05, z: INST_D / 2, ry: 0, glide: 1 });
  out.push({ x: 0, y: 2 * FLOOR + 0.05, z: INST_D / 2, ry: 0, glide: 0 });
  return out;
})();


export function InstitutionalBlock({ x = 0, getA, label, getShow, look }: BuildingProps) {
  const frame = useRef<Group>(null);
  const panels = useRef<InstancedMesh>(null);
  const slabs = useRef<(Mesh | null)[]>([]);
  const panelMats = useMemo(() => [mat.panel, look.windows === 'dusk' ? mat.glassLit : mat.glass], [look]);
  const columns = useMemo(
    () =>
      memo('inst-columns', () => {
        const g = [];
        for (let i = 0; i < 4; i++)
          for (const sz of [-1, 1])
            g.push(box(0.45, FLOOR * 3, 0.45, -INST_W / 2 + 0.4 + (i * (INST_W - 0.8)) / 3, (FLOOR * 3) / 2, sz * (INST_D / 2 - 0.45)));
        return merge(g);
      }),
    [],
  );

  useFrame(() => {
    const a = getA();

    // Frame rises floor by floor.
    slabs.current.forEach((m, i) => {
      if (!m) return;
      const t = stagger(win(a, 0, 0.3, ease.linear), i, 4, 0.5);
      m.position.y = GROUND + i * FLOOR - 0.15 + (i === 0 ? 0.3 : 0) + (1 - ease.outQuart(t)) * 8;
      m.scale.set(INST_W + 0.3, 0.3, t <= 0 ? 0.0001 : INST_D + 0.3);
    });
    if (frame.current) frame.current.scale.y = Math.max(0.0001, win(a, 0.03, 0.3, ease.out));

    const m = panels.current;
    if (m) {
      const fixed = INST_PANELS.length - 2;
      INST_PANELS.forEach((s, i) => {
        if (s.glide === undefined) {
          // One wall panel after another: each has most of its own stretch of the scroll (client, 2026-10-09).
          const t = stagger(win(a, 0.22, 0.84, ease.linear), i, fixed, 0.66);
          const e = ease.outQuart(t);
          const out = (1 - e) * 5;
          setInst(m, i, s.x + Math.sin(s.ry) * out, GROUND + s.y, s.z + Math.cos(s.ry) * out, s.ry, 1, t <= 0 ? 0.0001 : 1, 1);
        } else {
          // Slow, deliberate glide for the two highlighted panels.
          const t = win(a, s.glide ? 0.7 : 0.8, s.glide ? 0.94 : 1, ease.inOut);
          const out = (1 - t) * 9;
          const lift = (1 - t) * 1.6;
          const shown = a > 0.5 ? 1 : 0.0001;
          setInst(m, i, s.x, GROUND + s.y + lift, s.z + out, s.ry, shown, shown, shown);
          label?.(`panel-${s.glide}`, x + s.x, GROUND + s.y + lift + 1.75, s.z + out + 0.2, clamp01((a - 0.55) * 6) * (getShow?.() ?? 1));
        }
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position-x={x}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            slabs.current[i] = m;
          }}
          geometry={UNIT_BOX}
          material={mat.concrete}
          castShadow
          receiveShadow
        />
      ))}
      <group ref={frame} position-y={GROUND}>
        <mesh geometry={columns} material={mat.concrete} castShadow receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[INST_W - 3, FLOOR * 3 - 0.4, INST_D - 3]} position-y={(FLOOR * 3) / 2} />
      </group>
      <instancedMesh ref={panels} args={[wallPanel36Geometry(), instanced(panelMats), INST_PANELS.length]} castShadow receiveShadow frustumCulled={false} />
      <mesh geometry={UNIT_BOX} material={mat.concrete} scale={[7, 0.2, 2.6]} position={[-PANEL, GROUND + 3.3, INST_D / 2 + 1.4]} castShadow />
    </group>
  );
}
