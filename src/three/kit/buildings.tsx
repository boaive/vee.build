/**
 * The modular house's pieces, as models built from the kit. The capsule
 * home is kit/pod.tsx (2026-11-09). Each takes `getA`, its assembly progress (0 = bare site, 1 =
 * complete). The prefab building is kit/prefab.tsx (2026-11-07; the G+1
 * workforce block and the institutional block that stood here are gone).
 */
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, Shape, type Group, type InstancedMesh, type Material } from 'three';
import type { DoorFace, ModuleType, Placement } from '../../data/system';
import { ease, stagger, win } from '../../film/timeline';
import { UNIT_BOX, box, memo, merge, planCentre, pose, setInst } from './geometry';
import type { Look } from './looks';
import { instanced, mat, moduleMats } from './materials';
import { moduleGeometry, railGeometry, stairGeometry } from './parts';

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
