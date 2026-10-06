import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, Plane, TubeGeometry, Vector3, type Group, type InstancedMesh, type Material, type Mesh } from 'three';
import { presets } from '../../data/build';
import { centred, extent, type Unit } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, lerp, sampleCamera, stagger, track, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { Pad } from '../kit/buildings';
import { Paving } from '../kit/env';
import { UNIT_BOX, box, cyl, memo, merge, mergeGroups, setInst } from '../kit/geometry';
import { House } from '../kit/house';
import { MobileCrane, TRUCK, Truck } from '../kit/machines';
import { mat, moduleMats } from '../kit/materials';
import { jackBaseGeometry, jackScrewGeometry, moduleGeometry } from '../kit/parts';

/**
 * Open-air factory, following the brief's sequence: gates → assembly bays
 * and adjustable piers → core shell and insulation panels → green formwork →
 * concreting → de-shuttering → finishing line; then dispatch, where a mobile
 * crane lifts the finished shell onto a truck. Finished homes stand beside
 * the shed, the visitor's own build among them.
 *
 * "Core shell" is read as the inner casting core (notes C3). Production runs
 * over the first 80% of the scroll; dispatch over the rest.
 */

const PROD = 0.8;
/** Production progress (0–1) from film progress. */
const pp = (p: number) => Math.min(1, p / PROD);

const BAY: [number, number] = [0, 0];
const FINISH_X = 13;
const PIER_H = 0.5;
const SHELL = { L: 6, D: 3, H: 3 };
const GATE_Z = 35;
const TRUCK_Z = -14;
const TRUCK_X = 30;
const CRANE: [number, number, number] = [24.5, 0, -3.5];

const CAM: CameraKey[] = [
  { p: 0, look: [-6, 0, -4], pos: [72, 46, 106] },
  { p: 0.06, look: [0, 3, 20], pos: [0, 3, 62] },
  { p: 0.1, look: [0, 2.6, 0], pos: [0, 3.4, 38] },
  { p: 0.16, look: [0, 1.2, 0], pos: [15, 10.5, 25] },
  { p: 0.248, look: [0, 2.6, 0], pos: [13.5, 9, 21.5] },
  { p: 0.4, look: [0, 2, 0], pos: [11.5, 6.8, 18] },
  { p: 0.512, look: [1.6, 2.2, 0.6], pos: [14.5, 7.6, 18.5] },
  { p: 0.616, look: [0, 1.9, 0], pos: [10.5, 6.2, 19] },
  { p: 0.696, look: [7, 2.8, 0], pos: [21, 9.5, 27] },
  { p: 0.8, look: [FINISH_X, 2, 0], pos: [FINISH_X + 11, 6.6, 19] },
  { p: 0.9, look: [22, 4, -5], pos: [44, 13, 28] },
  { p: 1, look: [31, 3, -10], pos: [60, 13, 30] },
];

type Prog = { progress: { value: number } };

/* ---------- Yard ---------- */

function gateLeaf() {
  return memo('gate-leaf', () => {
    const parts = [box(5, 0.12, 0.1, 0, 2.4, 0), box(5, 0.12, 0.1, 0, 0.25, 0), box(0.12, 2.3, 0.1, -2.44, 1.3, 0), box(0.12, 2.3, 0.1, 2.44, 1.3, 0)];
    for (let i = 1; i < 16; i++) parts.push(box(0.05, 2.1, 0.05, -2.5 + i * 0.3125, 1.32, 0));
    return merge(parts);
  });
}

/** Precast boundary wall in 4 m panels, with a 10 m gate opening at the front. */
function walls() {
  return memo('yard-walls', () => {
    const g = [];
    const run = (x0: number, x1: number, z: number) => {
      for (let x = x0; x < x1 - 0.1; x += 4) g.push(box(Math.min(4, x1 - x) - 0.06, 2.6, 0.3, x + Math.min(4, x1 - x) / 2, 1.3, z));
    };
    const runZ = (z0: number, z1: number, x: number) => {
      for (let z = z0; z < z1 - 0.1; z += 4) g.push(box(0.3, 2.6, Math.min(4, z1 - z) - 0.06, x, 1.3, z + Math.min(4, z1 - z) / 2));
    };
    run(-56, -5, GATE_Z);
    run(5, 56, GATE_Z);
    run(-56, 56, -44);
    runZ(-44, GATE_Z, -56);
    runZ(-44, GATE_Z, 56);
    g.push(box(0.7, 3.4, 0.7, -5.2, 1.7, GATE_Z), box(0.7, 3.4, 0.7, 5.2, 1.7, GATE_Z));
    return merge(g);
  });
}

function markings() {
  return memo('yard-markings', () => {
    const g = [];
    const rect = (cx: number, cz: number, w: number, d: number) =>
      g.push(box(w, 0.012, 0.1, cx, 0.02, cz - d / 2), box(w, 0.012, 0.1, cx, 0.02, cz + d / 2), box(0.1, 0.012, d, cx - w / 2, 0.02, cz), box(0.1, 0.012, d, cx + w / 2, 0.02, cz));
    for (const x of [-13, 0, FINISH_X]) rect(x, 0, 8.4, 5.4);
    g.push(box(90, 0.012, 0.14, 0, 0.02, 12), box(0.14, 0.012, 22, -4.6, 0.02, 24), box(0.14, 0.012, 22, 4.6, 0.02, 24));
    return merge(g);
  });
}

/** Open-fronted portal-frame shed. Groups: 0 cladding, 1 steel. */
function warehouse(w: number, d: number, h: number) {
  return memo(`warehouse-${w}-${d}-${h}`, () => {
    const clad = [box(w, h, 0.2, 0, h / 2, -d / 2), box(0.2, h, d, -w / 2, h / 2, 0), box(0.2, h, d, w / 2, h / 2, 0)];
    const pitch = 0.16;
    for (const s of [-1, 1]) {
      const p = box(w + 0.8, 0.14, d / 2 / Math.cos(pitch) + 0.4, 0, 0, 0);
      p.rotateX(s * pitch);
      p.translate(0, h + Math.tan(pitch) * (d / 4) + 0.1, (-s * d) / 4);
      clad.push(p);
    }
    for (let i = 0; i <= Math.round(d / 1.2); i++) {
      const z = -d / 2 + i * 1.2;
      clad.push(box(0.08, h, 0.06, -w / 2 - 0.12, h / 2, z), box(0.08, h, 0.06, w / 2 + 0.12, h / 2, z));
    }
    const steel = [box(w, 0.7, 0.45, 0, h - 0.35, d / 2)];
    for (let i = 0; i <= Math.round(w / 6); i++) steel.push(box(0.45, h, 0.45, -w / 2 + (i * w) / Math.round(w / 6), h / 2, d / 2));
    return mergeGroups([clad, steel]);
  });
}

/** Batching plant: a cement silo on legs and a mixer house. Groups: 0 silo, 1 plant. */
function batching() {
  return memo('batching', () => {
    const silo = cyl(2.2, 2.2, 9, 24, 0, 9.5, 0);
    const cone = cyl(2.2, 0.35, 2.4, 24, 0, 3.8, 0);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.25, 5, 0.25, sx * 1.6, 2.5, sz * 1.6)));
    return mergeGroups([[silo, cone], [...legs, box(6, 4, 5, 6.5, 2, 3), box(0.4, 0.4, 7, 3, 6.5, 1.6)]]);
  });
}

const shedMats = [mat.sheeting, mat.steel];
const plantMats = [mat.paint, mat.paintDark];

function Yard({ progress }: Prog) {
  const leaves = useRef<(Mesh | null)[]>([]);
  const active = useRef<Group>(null);
  const stock = useRef<InstancedMesh>(null);
  const placed = useRef(false);
  const stockMats = useMemo(() => moduleMats(), []);

  useFrame(() => {
    const p = progress.value;
    const open = win(p, 0.035, 0.085, ease.inOutCubic);
    leaves.current.forEach((m, i) => m && (m.position.x = (i ? 1 : -1) * (2.5 + open * 5.1)));
    // Brief: "assembly bays activation" — the working bay is outlined.
    if (active.current) {
      const on = win(pp(p), 0.13, 0.185, ease.out);
      active.current.visible = on > 0.001;
      active.current.scale.set(on, 1, on);
    }
    const s = stock.current;
    if (s && !placed.current) {
      placed.current = true;
      let i = 0;
      for (let lvl = 0; lvl < 2; lvl++) for (let c = 0; c < 3; c++) setInst(s, i++, 18 + c * 6.6, lvl * 3, -30, 0);
      s.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <Paving w={112} d={80} z={-4.5} tile={4} y={0.01} material={mat.paving} line="#3b3e43" lineOpacity={0.12} />
      <mesh geometry={walls()} material={mat.concrete} castShadow receiveShadow />
      <mesh geometry={markings()} material={mat.marking} receiveShadow />
      <group ref={active} position-y={0.03} visible={false}>
        {[-1, 1].map((s) => (
          <mesh key={`x${s}`} geometry={UNIT_BOX} material={mat.accent} scale={[7.7, 0.012, 0.07]} position-z={s * 2.35} />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`z${s}`} geometry={UNIT_BOX} material={mat.accent} scale={[0.07, 0.012, 4.77]} position-x={s * 3.85} />
        ))}
      </group>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            leaves.current[i] = m;
          }}
          geometry={gateLeaf()}
          material={mat.steel}
          position={[i ? 2.5 : -2.5, 0, GATE_Z + 0.4]}
          castShadow
        />
      ))}
      <mesh geometry={warehouse(36, 22, 9)} material={shedMats} position={[-34, 0, -30]} castShadow receiveShadow />
      <mesh geometry={memo('shed-stock', () => merge([0, 1, 2, 3].map((i) => box(5.6, 0.25 + i * 0.2, 2.4, -40 + i * 7, 0.15 + i * 0.1, -30))))} material={mat.panel} castShadow receiveShadow />
      <mesh geometry={batching()} material={plantMats} position={[42, 0, -28]} castShadow receiveShadow />
      <instancedMesh ref={stock} args={[moduleGeometry('A'), stockMats, 6]} castShadow receiveShadow frustumCulled={false} />
      {/* A second unit already in formwork, for a sense of the line. */}
      <group position-x={-13}>
        <Boards getOut={() => 0} getDrop={() => 0} />
        <mesh geometry={UNIT_BOX} material={mat.cast} scale={[5.9, 0.1, 2.9]} position-y={PIER_H + SHELL.H - 0.05} />
      </group>
    </>
  );
}

/* ---------- Finished homes beside the shed ---------- */

const POD: Unit[] = centred(presets.find((p) => p.id === 'the-pod')!.units).map((s, i) => ({ ...s, id: i + 1 }));
const POD_FIT = extent(POD);
const SHOW: [number, number] = [-27, 2];

function ShowHomes({ progress, label, rig }: Prog & { label: ReturnType<typeof useLabel>; rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => extent(view.units), [view.units]);

  useFrame(() => {
    label('your-build', SHOW[0], fit.h + 1.4, SHOW[1], hold(progress.value, -0.1, 0.045, 0.02));
  });

  return (
    <>
      <Pad w={Math.max(12, fit.w + 6)} d={Math.max(10, fit.d + 6)} r={0.4} x={SHOW[0]} z={SHOW[1]} y={0.02} material={mat.gravel} />
      <group position={[SHOW[0] - fit.cx, 0.08, SHOW[1] - fit.cz]}>
        <House units={view.units} addOns={view.addOns} deckSide={view.deckSide} shellHex={view.shellHex} deckHex={view.deckHex} look={rig.look} />
      </group>
      <Pad w={12} d={9} r={0.4} x={-45} z={4} y={0.02} material={mat.gravel} />
      <group position={[-45 - POD_FIT.cx, 0.08, 4 - POD_FIT.cz]}>
        <House units={POD} addOns={['deck', 'posts', 'spandrel', 'handrail', 'steps', 'shades']} deckSide="auto" shellHex={view.shellHex} deckHex={view.deckHex} look={rig.look} />
      </group>
    </>
  );
}

/* ---------- The bay: piers, core, insulation, formwork, concrete ---------- */

function Piers({ at, getT }: { at: [number, number]; getT: () => number }) {
  const bases = useRef<InstancedMesh>(null);
  const screws = useRef<InstancedMesh>(null);
  useFrame(() => {
    const b = bases.current;
    const s = screws.current;
    if (!b || !s) return;
    const t = getT();
    let i = 0;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const ti = stagger(t, i, 4, 0.5);
        const arrive = ease.outQuart(clamp01(ti * 1.8));
        const adjust = ease.inOut(clamp01((ti - 0.5) * 2));
        const x = at[0] + sx * 2.5;
        const z = at[1] + sz * 1.15;
        const sc = ti <= 0 ? 0.0001 : 2.1;
        setInst(b, i, x, (1 - arrive) * 3, z, 0, sc);
        // Heads screw up to a common level.
        setInst(s, i, x, PIER_H - (1 - adjust) * 0.14 + (1 - arrive) * 3, z, adjust * Math.PI * 4, sc * 0.8, sc * 0.62, sc * 0.8);
        i++;
      }
    b.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bases} args={[jackBaseGeometry(), mat.steel, 4]} castShadow frustumCulled={false} />
      <instancedMesh ref={screws} args={[jackScrewGeometry(), mat.steel, 4]} castShadow frustumCulled={false} />
    </>
  );
}

/** Perimeter positions for sheet goods standing around the shell: [x, z, rotY, width]. */
function perimeter(offset: number, across: number, along: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const w = SHELL.L / along;
  for (const sz of [1, -1]) for (let i = 0; i < along; i++) out.push([-SHELL.L / 2 + w * (i + 0.5), sz * (SHELL.D / 2 + offset), sz > 0 ? 0 : Math.PI, w]);
  const d = SHELL.D / across;
  for (const sx of [1, -1]) for (let i = 0; i < across; i++) out.push([sx * (SHELL.L / 2 + offset), -SHELL.D / 2 + d * (i + 0.5), sx * (Math.PI / 2), d]);
  return out;
}

const INSULATION = perimeter(-0.11, 3, 6);
const BOARDS = perimeter(0.035, 3, 6);

function Insulation({ progress }: Prog) {
  const ref = useRef<InstancedMesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const q = pp(progress.value);
    const t = win(q, 0.345, 0.405, ease.linear);
    const cast = q > 0.672;
    INSULATION.forEach(([x, z, ry, w], i) => {
      const ti = stagger(t, i, INSULATION.length, 0.75);
      const sc = ti <= 0 || cast ? 0.0001 : 1;
      setInst(m, i, x, PIER_H + 0.12 + 1.36 + (1 - ease.outQuart(ti)) * 5, z, ry, (w - 0.03) * sc, 2.72 * sc, 0.06 * sc);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[UNIT_BOX, mat.panel, INSULATION.length]} castShadow receiveShadow frustumCulled={false} />;
}

/** Bright green formwork boards (brief). `getOut` 1→0 as they close in, `getDrop` 0→1 as they fall away. */
function Boards({ getOut, getDrop }: { getOut: () => number; getDrop: () => number }) {
  const ref = useRef<InstancedMesh>(null);
  const walers = useRef<InstancedMesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const out = getOut();
    const drop = getDrop();
    BOARDS.forEach(([x, z, ry, w], i) => {
      const o = stagger(1 - out, i, BOARDS.length, 0.8);
      const d = ease.in(stagger(drop, i, BOARDS.length, 0.7));
      const push = (1 - ease.outQuart(o)) * 3.2 + d * 1.5;
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      const sc = o <= 0 || d >= 1 ? 0.0001 : 1;
      setInst(m, i, x + nx * push, PIER_H + 1.55 - d * 1.6, z + nz * push, ry, (w - 0.02) * sc, 3.1 * sc * (1 - d * 0.5), 0.07 * sc);
    });
    m.instanceMatrix.needsUpdate = true;
    const wl = walers.current;
    if (wl) {
      const on = out < 0.02 && drop < 0.02 ? 1 : 0.0001;
      let i = 0;
      for (const y of [1.0, 2.6]) {
        for (const sz of [1, -1]) setInst(wl, i++, 0, PIER_H + y, sz * (SHELL.D / 2 + 0.11), 0, (SHELL.L + 0.4) * on, 0.09 * on, 0.07 * on);
        for (const sx of [1, -1]) setInst(wl, i++, sx * (SHELL.L / 2 + 0.11), PIER_H + y, 0, 0, 0.07 * on, 0.09 * on, (SHELL.D + 0.4) * on);
      }
      wl.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={ref} args={[UNIT_BOX, mat.formwork, BOARDS.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={walers} args={[UNIT_BOX, mat.steel, 8]} castShadow frustumCulled={false} />
    </>
  );
}

function pumpGeometry() {
  return memo('pump', () => {
    const hopper = cyl(0.62, 0.3, 0.55, 4, -0.55, 1.2, 0);
    hopper.rotateY(Math.PI / 4);
    const wheels = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => {
        const w = cyl(0.26, 0.26, 0.16, 14);
        w.rotateX(Math.PI / 2);
        w.translate(sx * 0.6, 0.26, sz * 0.52);
        return w;
      }),
    );
    return merge([box(1.9, 0.62, 0.9, 0, 0.66, 0), hopper, box(0.5, 0.5, 0.6, 0.6, 1.2, 0), box(0.06, 0.6, 0.06, -1.25, 0.5, 0), ...wheels]);
  });
}

const PUMP_AT = new Vector3(6.6, 0, 3.4);
const HOSE = new CatmullRomCurve3([
  new Vector3(PUMP_AT.x - 0.1, 1.4, PUMP_AT.z),
  new Vector3(PUMP_AT.x - 0.5, 3.2, PUMP_AT.z - 0.3),
  new Vector3(4.4, 4.7, 2.3),
  new Vector3(2.9, 4.6, 1.6),
  new Vector3(2.5, PIER_H + SHELL.H + 0.15, 1.38),
]);

function Concreting({ progress }: Prog) {
  const pump = useRef<Mesh>(null);
  const hose = useRef<Mesh>(null);
  const geo = useMemo(() => memo('hose', () => new TubeGeometry(HOSE, 48, 0.06, 8)), []);
  const total = geo.index?.count ?? 0;

  useFrame(() => {
    const q = pp(progress.value);
    const here = hold(q, 0.55, 0.7, 0.035);
    if (pump.current) {
      pump.current.visible = here > 0.001;
      pump.current.position.set(PUMP_AT.x + (1 - here) * 12, 0, PUMP_AT.z + (1 - here) * 5);
    }
    const reach = hold(q, 0.585, 0.672, 0.02);
    if (hose.current) {
      hose.current.visible = reach > 0.001;
      geo.setDrawRange(0, Math.floor((total * reach) / 3) * 3);
    }
  });

  return (
    <>
      <mesh ref={pump} geometry={pumpGeometry()} material={mat.yellow} rotation-y={0.35} castShadow receiveShadow />
      <mesh ref={hose} geometry={geo} material={mat.rubber} castShadow />
    </>
  );
}

/* ---------- Gantry: places the core, carries the cast shell to finishing ---------- */

const PARK = -24;
const GANTRY_X = [
  [0.16, PARK],
  [0.255, 0],
  [0.345, 0],
  [0.41, PARK],
  [0.76, PARK],
  [0.815, 0],
  [0.842, 0],
  [0.878, FINISH_X],
  [0.9, FINISH_X],
  [0.94, PARK],
] as const;
const LOAD_TOP = PIER_H + SHELL.H;
const CORE_LIFT = [
  [0.255, 6],
  [0.335, 0],
] as const;
const SHELL_LIFT = [
  [0.825, 0],
  [0.845, 2.6],
  [0.874, 2.6],
  [0.894, 0],
] as const;

function Gantry({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const group = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const block = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const frame = useMemo(
    () =>
      memo('gantry', () => {
        const g = [box(0.9, 1, 16, 0, 9.6, 0)];
        for (const sz of [-1, 1]) {
          g.push(box(3.4, 0.45, 0.45, 0, 0.5, sz * 7.4), box(3.2, 0.4, 0.4, 0, 9.3, sz * 7.4));
          for (const sx of [-1, 1]) {
            const leg = box(0.34, 9.2, 0.34);
            leg.rotateZ(sx * -0.13);
            leg.translate(sx * 0.9, 4.9, sz * 7.4);
            g.push(leg);
          }
        }
        return merge(g);
      }),
    [],
  );

  useFrame(() => {
    const q = pp(progress.value);
    const x = track(q, GANTRY_X);
    if (group.current) group.current.position.x = x;

    const carryingCore = q < 0.345;
    const coreLift = track(q, CORE_LIFT);
    const shellLift = track(q, SHELL_LIFT);
    const coreTop = PIER_H + 0.14 + 2.72;
    // Hook rides the load when attached, parks high otherwise.
    let hookY = 8;
    if (q > 0.23 && carryingCore) hookY = coreTop + coreLift;
    else if (q >= 0.345 && q < 0.37) hookY = coreTop + win(q, 0.345, 0.37) * (8 - coreTop);
    else if (q >= 0.8 && q < 0.825) hookY = 8 - win(q, 0.8, 0.825) * (8 - LOAD_TOP);
    else if (q >= 0.825 && q < 0.894) hookY = LOAD_TOP + shellLift;
    else if (q >= 0.894 && q < 0.92) hookY = LOAD_TOP + win(q, 0.894, 0.92) * (8 - LOAD_TOP);

    if (cable.current) {
      cable.current.scale.y = Math.max(0.01, 9.1 - hookY);
      cable.current.position.y = (9.1 + hookY) / 2;
    }
    if (block.current) block.current.position.y = hookY + 0.18;

    if (core.current) {
      core.current.visible = q > 0.23 && q < 0.69;
      core.current.position.set(carryingCore ? x : BAY[0], PIER_H + 0.14 + 1.36 + (carryingCore ? coreLift : 0), 0);
    }
    label('core', BAY[0] - 1.5, coreTop + (carryingCore ? coreLift : 0), 0.2, hold(q, 0.3, 0.352, 0.012));
  });

  return (
    <>
      <mesh geometry={UNIT_BOX} material={mat.steel} scale={[80, 0.1, 0.22]} position={[4, 0.06, 7.4]} receiveShadow />
      <mesh geometry={UNIT_BOX} material={mat.steel} scale={[80, 0.1, 0.22]} position={[4, 0.06, -7.4]} receiveShadow />
      <group ref={group}>
        <mesh geometry={frame} material={mat.yellow} castShadow receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.steel} scale={[1.3, 0.5, 1.3]} position={[0, 8.9, 0]} castShadow />
        <mesh ref={cable} geometry={UNIT_BOX} material={mat.steel} scale={[0.04, 1, 0.04]} />
        <mesh ref={block} geometry={UNIT_BOX} material={mat.steel} scale={[0.34, 0.36, 0.34]} />
      </group>
      <mesh ref={core} geometry={UNIT_BOX} material={mat.steel} scale={[5.56, 2.72, 2.56]} castShadow receiveShadow />
    </>
  );
}

/* ---------- The cast shell: rises with the pour, travels, is finished, is dispatched ---------- */

const ZF = SHELL.D / 2 - 0.01;
const XF = SHELL.L / 2 - 0.01;
/** Door leaf and glass set into the openings of the finished shell. */
const FILL: { s: [number, number, number]; at: [number, number, number]; m: 'frame' | 'glass' }[] = [
  { s: [0.92, 2.15, 0.05], at: [0.62, 1.28, ZF + 0.01], m: 'frame' },
  { s: [1.45, 1.25, 0.03], at: [-1.75, 1.58, ZF], m: 'glass' },
  { s: [0.34, 2.15, 0.03], at: [-0.08, 1.28, ZF], m: 'glass' },
  { s: [0.34, 2.15, 0.03], at: [1.32, 1.28, ZF], m: 'glass' },
  { s: [0.03, 0.5, 1.6], at: [XF, 2.2, 0], m: 'glass' },
];

/** Where the finished shell's base is during dispatch, by film progress. */
function dispatchPose(p: number, truckX: number): [number, number, number] | null {
  if (p < PROD) return null;
  const lift = win(p, 0.8, 0.84, ease.inOut);
  const travel = win(p, 0.84, 0.91, ease.inOut);
  const lower = win(p, 0.91, 0.95, ease.inOut);
  const x = lerp(FINISH_X, truckX, travel);
  const z = lerp(0, TRUCK_Z, travel);
  const y = lerp(PIER_H, 7, lift) - lower * (7 - TRUCK.deckY);
  return [x, y, z];
}

const truckXAt = (p: number) => TRUCK_X + win(p, 0.965, 1, ease.in) * 6;

function CastShell({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const group = useRef<Group>(null);
  const raw = useRef<Mesh>(null);
  const painted = useRef<Mesh>(null);
  const arch = useRef<Group>(null);
  const fills = useRef<(Mesh | null)[]>([]);
  const planes = useMemo(() => ({ raw: new Plane(new Vector3(1, 0, 0), 0), painted: new Plane(new Vector3(-1, 0, 0), 0) }), []);
  const mats = useMemo(() => {
    const opening = mat.rubber;
    const finished = moduleMats();
    const mk = (src: Material, plane: Plane) => {
      const m = src.clone();
      m.clippingPlanes = [plane];
      return m;
    };
    return {
      raw: [mk(mat.cast, planes.raw), mk(mat.cast, planes.raw), mk(opening, planes.raw), mk(mat.cast, planes.raw)],
      painted: [mk(finished[0], planes.painted), mk(mat.fascia, planes.painted), mk(opening, planes.painted), mk(mat.frame, planes.painted)],
    };
  }, [planes]);

  useFrame(() => {
    const p = progress.value;
    const q = pp(p);
    const pour = win(q, 0.6, 0.67, ease.linear);
    let x = track(q, [
      [0.845, BAY[0]],
      [0.874, FINISH_X],
    ]);
    let y = PIER_H + track(q, SHELL_LIFT);
    let z = 0;
    const d = dispatchPose(p, truckXAt(p));
    if (d) [x, y, z] = d;
    const spray = win(q, 0.9, 0.955, ease.inOut);
    // The paint front travels with the shell until the arch sweeps across it.
    const front = x - 3.6 + spray * 7.2;
    planes.raw.constant = -front;
    planes.painted.constant = front;

    if (group.current) group.current.position.set(x, y, z);
    for (const m of [raw.current, painted.current]) {
      if (!m) continue;
      m.visible = pour > 0.001;
      m.scale.set(1, Math.max(0.001, pour), 1);
    }
    if (arch.current) {
      arch.current.visible = q > 0.86 && p < PROD;
      arch.current.position.x = front;
    }
    const set = win(q, 0.955, 0.995, ease.linear);
    fills.current.forEach((m, i) => {
      if (!m) return;
      const t = ease.out(stagger(set, i, FILL.length, 0.5));
      m.visible = t > 0.001;
      const s = FILL[i].s;
      m.scale.set(s[0] * t, s[1] * t, s[2] * t);
    });

    label('pour', PUMP_AT.x - 0.5, 3.2, PUMP_AT.z - 0.3, hold(q, 0.61, 0.668, 0.012));
    label('smooth', BAY[0] + 1.2, PIER_H + 2.5, 1.5, hold(q, 0.775, 0.81, 0.012));
    label('spray', front, 4.3, 2.2, hold(q, 0.905, 0.95, 0.012));
  });

  const geo = moduleGeometry('A');

  return (
    <>
      <group ref={group}>
        <mesh ref={raw} geometry={geo} material={mats.raw} castShadow receiveShadow />
        <mesh ref={painted} geometry={geo} material={mats.painted} castShadow receiveShadow />
        {FILL.map((f, i) => (
          <mesh
            key={i}
            ref={(m) => {
              fills.current[i] = m;
            }}
            geometry={UNIT_BOX}
            material={mat[f.m]}
            position={f.at}
            scale={f.s}
            visible={false}
          />
        ))}
      </group>
      <group ref={arch} visible={false}>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={UNIT_BOX} material={mat.steel} scale={[0.16, 4.6, 0.16]} position={[0, 2.3, s * 2.3]} castShadow />
        ))}
        <mesh geometry={UNIT_BOX} material={mat.steel} scale={[0.16, 0.16, 4.76]} position={[0, 4.6, 0]} castShadow />
        {[-1.4, -0.7, 0, 0.7, 1.4].map((zz) => (
          <mesh key={zz} geometry={UNIT_BOX} material={mat.accent} scale={[0.08, 0.14, 0.08]} position={[0, 4.45, zz]} />
        ))}
      </group>
    </>
  );
}

/* ---------- Dispatch: crane and truck ---------- */

const _hook = new Vector3();

function Dispatch({ progress }: Prog) {
  const getHook = () => {
    const p = progress.value;
    const d = dispatchPose(p, truckXAt(p));
    if (d && p < 0.955) return _hook.set(d[0], d[1] + SHELL.H + 0.4, d[2]);
    // After setting the shell down the hook lifts clear; before the lift it waits over the finishing bay.
    if (p >= 0.955) {
      const after = win(p, 0.955, 0.99, ease.out);
      return _hook.set(lerp(TRUCK_X, CRANE[0] - 4, after), TRUCK.deckY + SHELL.H + 0.4 + after * 5, lerp(TRUCK_Z, CRANE[2] + 2, after));
    }
    return _hook.set(FINISH_X + 1, 9.5, 2);
  };
  return (
    <>
      <MobileCrane position={CRANE} getHook={getHook} head={5} />
      <Truck getX={() => truckXAt(progress.value)} z={TRUCK_Z} ry={Math.PI} />
    </>
  );
}

/* ---------- Scene ---------- */

function Director({ progress, rig }: Prog & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const c = sampleCamera(CAM, progress.value);
    aim(camera, c.pos, c.look, size.width / size.height, 1.4, 0.7);
    rig.lightTarget.set(c.look[0], 0, c.look[2]);
  });
  return null;
}

function Factory({ progress, place, rig }: SceneProps & { rig: Rig }) {
  const label = useLabel(place);
  useFrame(() => {
    const q = pp(progress.value);
    label('pier', 2.5, PIER_H, 1.15, hold(q, 0.2, 0.25, 0.012));
    label('insulation', -1.5, PIER_H + 2.9, 1.4, hold(q, 0.38, 0.432, 0.012));
    label('formwork', 0.5, PIER_H + 3.1, 1.55, hold(q, 0.475, 0.54, 0.012));
  });
  return (
    <>
      <Director progress={progress} rig={rig} />
      <Yard progress={progress} />
      <ShowHomes progress={progress} label={label} rig={rig} />
      <Piers at={BAY} getT={() => win(pp(progress.value), 0.165, 0.245, ease.linear)} />
      <Piers at={[FINISH_X, 0]} getT={() => 1} />
      <Piers at={[-13, 0]} getT={() => 1} />
      <Gantry progress={progress} label={label} />
      <Insulation progress={progress} />
      <Boards getOut={() => 1 - win(pp(progress.value), 0.44, 0.52, ease.linear)} getDrop={() => win(pp(progress.value), 0.71, 0.79, ease.linear)} />
      <Concreting progress={progress} />
      <CastShell progress={progress} label={label} />
      <Dispatch progress={progress} />
    </>
  );
}

export default function FactoryScene(props: SceneProps) {
  return (
    <Stage {...props} look="clear" ground="land" focus={[0.62, 0.56]} focusCompact={[0.5, 0.36]} shadowExtent={36} localClipping>
      {(rig) => <Factory {...props} rig={rig} />}
    </Stage>
  );
}
