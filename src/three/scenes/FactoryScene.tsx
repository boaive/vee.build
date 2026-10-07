import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CatmullRomCurve3, Plane, TubeGeometry, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Material, type Mesh } from 'three';
import { presets } from '../../data/build';
import { centred, extent, type Unit } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, lerp, sampleCamera, stagger, track, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { Pad } from '../kit/buildings';
import { UNIT_BOX, box, cyl, memo, merge, mergeGroups, setInst } from '../kit/geometry';
import { House } from '../kit/house';
import { MobileCrane, TRUCK, Truck } from '../kit/machines';
import { instanced, mat, moduleMats } from '../kit/materials';
import { jackBaseGeometry, jackScrewGeometry, moduleGeometry, moduleOpenings } from '../kit/parts';
import { boxUV } from '../kit/textures';

/**
 * Open-air factory, following the brief's sequence: gates → assembly bays
 * and adjustable piers → core shell and insulation panels → green formwork →
 * concreting → de-shuttering → finishing line; then dispatch, where a mobile
 * crane lifts the finished shell onto a truck that leaves by the gate.
 * Finished homes stand beside the shed, the visitor's own build among them.
 *
 * The whole tour is seen from above, at the angle it opens on (client,
 * 2026-10-07): the camera comes in over the gate and moves from station to
 * station without coming down to the ground. It looks up the production
 * line, so far is −x, near is +x and the right of the picture is −z. The
 * yard on the +z side of the line is kept clear: the captions stand there,
 * as plain text on the slab.
 *
 * "Core shell" is the steel frame of the client's structure sequence (notes
 * H7, C3): the insulation panels stand round it, the formwork closes on
 * them and the concrete is cast between the two. Production runs over the
 * first 80% of the scroll; dispatch over the rest.
 */

const PROD = 0.8;
/** Production progress (0–1) from film progress. */
const pp = (p: number) => Math.min(1, p / PROD);

const SHELL = { L: 6, D: 3, H: 3 };
const PIER_H = 0.5;
/** The line's bays along x: one already in formwork, the working bay, the finishing bay. */
const QUEUE_X = -13;
const BAY_X = 0;
const FINISH_X = 13;
/** A shell stands across the line: its 6 m front faces down the yard, to the gate and the camera. */
const TURN = Math.PI / 2;

const YARD = { x0: -52, x1: 46, z0: -40, z1: 36 };
/** The gate is in the near wall, on the truck's lane. */
const GATE_Z = -14;
const TRUCK_Z = GATE_Z;
const TRUCK_X = 30;
/** The mobile crane stands clear of the gantry's rails, between the finishing bay and the lane. */
const CRANE: [number, number, number] = [21.5, 0, -8.6];

/** One viewing angle for the whole tour: where the camera stands from what it looks at. */
const AZIMUTH = (78 * Math.PI) / 180;
function shot(p: number, look: [number, number, number], distance: number, elevation = 36): CameraKey {
  const e = (elevation * Math.PI) / 180;
  return { p, look, pos: [look[0] + distance * Math.cos(e) * Math.sin(AZIMUTH), look[1] + distance * Math.sin(e), look[2] + distance * Math.cos(e) * Math.cos(AZIMUTH)] };
}
/*
 * The yard, then in over the gate, then bay by bay. At a station the
 * camera stands far enough back for the gantry, 9.6 m high over the bay,
 * to stay under the header.
 */
const CAM: CameraKey[] = [
  shot(0, [0, 0, -8], 150, 34),
  shot(0.09, [8, 0, -9], 138, 34),
  shot(0.16, [BAY_X, 1, 0], 44),
  shot(0.248, [BAY_X, 2, 0], 48),
  shot(0.4, [BAY_X, 2, 0], 44),
  shot(0.512, [BAY_X + 1.5, 2, -1.5], 47),
  shot(0.616, [BAY_X, 2, 0], 44),
  shot(0.696, [6.5, 2.5, 0], 52),
  shot(0.8, [FINISH_X, 2, -1], 46),
  shot(0.9, [21, 3, -7], 58),
  shot(1, [34, 2, -13], 70),
];

type Prog = { progress: { value: number } };
const one = () => 1;
const zero = () => 0;

/* ---------- Yard ---------- */

/**
 * The slab, with its texture at true scale. Plain: casting joints drawn as
 * blended lines over it cost about 0.7 ms of every frame on the test
 * laptop and could hardly be seen from this height.
 */
function slab() {
  return memo('factory-slab', () => {
    const g = box(YARD.x1 - YARD.x0, 0.06, YARD.z1 - YARD.z0, (YARD.x0 + YARD.x1) / 2, -0.02, (YARD.z0 + YARD.z1) / 2);
    boxUV(g, 1);
    return g;
  });
}

/** A gate leaf, 5 m wide, sliding along z. */
function gateLeaf() {
  return memo('gate-leaf-z', () => {
    const parts = [box(0.1, 0.12, 5, 0, 2.4, 0), box(0.1, 0.12, 5, 0, 0.25, 0), box(0.1, 2.3, 0.12, 0, 1.3, -2.44), box(0.1, 2.3, 0.12, 0, 1.3, 2.44)];
    for (let i = 1; i < 16; i++) parts.push(box(0.05, 2.1, 0.05, 0, 1.32, -2.5 + i * 0.3125));
    return merge(parts);
  });
}

/** Precast boundary wall in 4 m panels, with a 10 m gate opening in the near wall. */
function walls() {
  return memo('factory-walls', () => {
    const g: BufferGeometry[] = [];
    const runX = (x0: number, x1: number, z: number) => {
      for (let x = x0; x < x1 - 0.1; x += 4) g.push(box(Math.min(4, x1 - x) - 0.06, 2.6, 0.3, x + Math.min(4, x1 - x) / 2, 1.3, z));
    };
    const runZ = (z0: number, z1: number, x: number) => {
      for (let z = z0; z < z1 - 0.1; z += 4) g.push(box(0.3, 2.6, Math.min(4, z1 - z) - 0.06, x, 1.3, z + Math.min(4, z1 - z) / 2));
    };
    runX(YARD.x0, YARD.x1, YARD.z0);
    runX(YARD.x0, YARD.x1, YARD.z1);
    runZ(YARD.z0, YARD.z1, YARD.x0);
    runZ(YARD.z0, GATE_Z - 5, YARD.x1);
    runZ(GATE_Z + 5, YARD.z1, YARD.x1);
    g.push(box(0.7, 3.4, 0.7, YARD.x1, 1.7, GATE_Z - 5.2), box(0.7, 3.4, 0.7, YARD.x1, 1.7, GATE_Z + 5.2));
    return merge(g);
  });
}

/** Bay outlines and the truck's lane, painted on the slab. */
function markings() {
  return memo('factory-markings', () => {
    const g: BufferGeometry[] = [];
    const rect = (cx: number, cz: number, w: number, d: number) =>
      g.push(box(w, 0.012, 0.1, cx, 0.02, cz - d / 2), box(w, 0.012, 0.1, cx, 0.02, cz + d / 2), box(0.1, 0.012, d, cx - w / 2, 0.02, cz), box(0.1, 0.012, d, cx + w / 2, 0.02, cz));
    for (const x of [QUEUE_X, BAY_X, FINISH_X]) rect(x, 0, 5.4, 8.4);
    for (const s of [-1, 1]) g.push(box(YARD.x1 - 19, 0.012, 0.14, (YARD.x1 + 19) / 2, 0.02, GATE_Z + s * 3.6));
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

const SHED = { x: -40, z: -4, w: 36, d: 22, h: 9 };
const shedMats = [mat.sheeting, mat.steel];
const plantMats = [mat.paint, mat.paintDark];

function Yard({ progress }: Prog) {
  const leaves = useRef<(Mesh | null)[]>([]);
  const active = useRef<Group>(null);
  const stock = useRef<InstancedMesh>(null);
  const stockMats = useMemo(() => moduleMats(), []);

  // Finished shells in stock, stacked two high: placed once.
  useLayoutEffect(() => {
    const s = stock.current;
    if (!s) return;
    let i = 0;
    for (let lvl = 0; lvl < 2; lvl++) for (let c = 0; c < 3; c++) setInst(s, i++, -6 + c * 4.4, lvl * 3, -33, TURN);
    s.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const p = progress.value;
    const open = win(p, 0.035, 0.085, ease.inOutCubic);
    leaves.current.forEach((m, i) => m && (m.position.z = GATE_Z + (i ? 1 : -1) * (2.5 + open * 5.1)));
    // Brief: "assembly bays activation" — the working bay is outlined.
    if (active.current) {
      const on = win(pp(p), 0.13, 0.185, ease.out);
      active.current.visible = on > 0.001;
      active.current.scale.set(on, 1, on);
    }
  });

  return (
    <>
      <mesh geometry={slab()} material={mat.yard} receiveShadow />
      <mesh geometry={walls()} material={mat.concrete} castShadow receiveShadow />
      <mesh geometry={markings()} material={mat.marking} receiveShadow />
      <group ref={active} position={[BAY_X, 0.03, 0]} visible={false}>
        {[-1, 1].map((s) => (
          <mesh key={`z${s}`} geometry={UNIT_BOX} material={mat.accent} scale={[0.07, 0.012, 7.7]} position-x={s * 2.35} />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`x${s}`} geometry={UNIT_BOX} material={mat.accent} scale={[4.77, 0.012, 0.07]} position-z={s * 3.85} />
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
          position={[YARD.x1 + 0.4, 0, GATE_Z + (i ? 2.5 : -2.5)]}
          castShadow
        />
      ))}
      {/* The shed stands at the far end, open towards the yard. */}
      <group position={[SHED.x, 0, SHED.z]} rotation-y={TURN}>
        <mesh geometry={warehouse(SHED.w, SHED.d, SHED.h)} material={shedMats} castShadow receiveShadow />
        <mesh geometry={memo('shed-stock', () => merge([0, 1, 2, 3].map((i) => box(5.6, 0.25 + i * 0.2, 2.4, -10.5 + i * 7, 0.15 + i * 0.1, 0))))} material={mat.panel} castShadow receiveShadow />
      </group>
      <mesh geometry={batching()} material={plantMats} position={[26, 0, -34]} castShadow receiveShadow />
      <instancedMesh ref={stock} args={[moduleGeometry('A'), instanced(stockMats), 6]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}

/* ---------- Finished homes beside the shed ---------- */

const POD_PRESET = presets.find((p) => p.id === 'the-pod')!;
const POD: Unit[] = centred(POD_PRESET.units).map((s, i) => ({ ...s, id: i + 1 }));
const POD_FIT = extent(POD);
/** Beside the shed, at the far end: in the opening picture, and out of the way of the stations after it. */
const SHOW: [number, number] = [-38, -31];
const SHOW_POD: [number, number] = [-24, -33];

function ShowHomes({ progress, label, rig }: Prog & { label: ReturnType<typeof useLabel>; rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => extent(view.units, view.base), [view.units, view.base]);

  useFrame(() => {
    label('your-build', SHOW[0], fit.h + 1.4, SHOW[1], hold(progress.value, -0.1, 0.045, 0.02));
  });

  return (
    <>
      {/* Fronts to the yard, like the shells on the line. */}
      <Pad w={Math.max(12, fit.w + 6)} d={Math.max(10, fit.d + 6)} r={0.4} x={SHOW[0]} z={SHOW[1]} y={0.02} rot={TURN} material={mat.gravel} />
      <group position={[SHOW[0], 0.08, SHOW[1]]} rotation-y={TURN}>
        <group position={[-fit.cx, 0, -fit.cz]}>
          <House units={view.units} addOns={view.addOns} deckSide={view.deckSide} manual={view.manual} shellHex={view.shellHex} deckHex={view.deckHex} trimHex={view.trimHex} foundation={view.foundation} look={rig.look} plot={view.plot} />
        </group>
      </group>
      <Pad w={12} d={9} r={0.4} x={SHOW_POD[0]} z={SHOW_POD[1]} y={0.02} rot={TURN} material={mat.gravel} />
      <group position={[SHOW_POD[0], 0.08, SHOW_POD[1]]} rotation-y={TURN}>
        <group position={[-POD_FIT.cx, 0, -POD_FIT.cz]}>
          <House units={POD} addOns={POD_PRESET.addOns} deckSide="auto" shellHex={view.shellHex} deckHex={view.deckHex} trimHex={view.trimHex} look={rig.look} />
        </group>
      </group>
    </>
  );
}

/* ---------- A bay: piers, insulation, formwork (on the bay's own plan: x along the shell) ---------- */

/**
 * Four adjustable piers. Brief: they "position dynamically": each one
 * travels out from the middle of the bay to its corner, then its head is
 * screwed up to a common level.
 */
function Piers({ getT }: { getT: () => number }) {
  const bases = useRef<InstancedMesh>(null);
  const screws = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  useFrame(() => {
    const b = bases.current;
    const s = screws.current;
    const t = getT();
    if (!b || !s || t === last.current) return;
    last.current = t;
    let i = 0;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const ti = stagger(t, i, 4, 0.5);
        const out = ease.inOut(clamp01(ti * 2));
        const adjust = ease.inOut(clamp01((ti - 0.5) * 2));
        const x = sx * lerp(0.5, 2.5, out);
        const z = sz * lerp(0.35, 1.15, out);
        const sc = ti <= 0 ? 0.0001 : 2.1 * Math.min(1, ti * 8);
        setInst(b, i, x, 0, z, 0, sc);
        setInst(s, i, x, PIER_H - (1 - adjust) * 0.14, z, adjust * Math.PI * 4, sc * 0.8, sc * 0.62, sc * 0.8);
        i++;
      }
    b.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bases} args={[jackBaseGeometry(), instanced(mat.steel), 4]} castShadow frustumCulled={false} />
      <instancedMesh ref={screws} args={[jackScrewGeometry(), instanced(mat.steel), 4]} castShadow frustumCulled={false} />
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

/** White insulation panels drop into the slots round the core shell; the concrete then closes over them. */
function Insulation({ progress }: Prog) {
  const ref = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const q = pp(progress.value);
    const cast = q > 0.672;
    const t = cast ? -2 : win(q, 0.345, 0.405, ease.linear);
    if (t === last.current) return;
    last.current = t;
    m.visible = !cast && t > 0;
    INSULATION.forEach(([x, z, ry, w], i) => {
      const ti = stagger(t, i, INSULATION.length, 0.75);
      const sc = ti <= 0 ? 0.0001 : 1;
      setInst(m, i, x, PIER_H + 0.12 + 1.36 + (1 - ease.outQuart(ti)) * 5, z, ry, (w - 0.03) * sc, 2.72 * sc, 0.06 * sc);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[UNIT_BOX, instanced(mat.panel), INSULATION.length]} visible={false} castShadow receiveShadow frustumCulled={false} />;
}

/**
 * Bright green formwork boards (brief). `getOut` 1→0 as they close in from
 * all four sides, and two steel walers then lock round them; `getDrop` 0→1
 * as the walers come off and the boards fall away.
 */
function Boards({ getOut, getDrop }: { getOut: () => number; getDrop: () => number }) {
  const ref = useRef<InstancedMesh>(null);
  const walers = useRef<InstancedMesh>(null);
  const last = useRef({ out: -1, drop: -1 });
  useFrame(() => {
    const m = ref.current;
    const wl = walers.current;
    if (!m || !wl) return;
    const out = getOut();
    const drop = getDrop();
    if (out === last.current.out && drop === last.current.drop) return;
    last.current.out = out;
    last.current.drop = drop;
    m.visible = out < 1 && drop < 1;
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
    // The walers run on once the last board is home, and come off before the first one falls.
    const lock = ease.out(clamp01((0.1 - out) / 0.1)) * (1 - clamp01(drop / 0.05));
    wl.visible = lock > 0.001;
    let i = 0;
    for (const y of [1.0, 2.6]) {
      for (const sz of [1, -1]) setInst(wl, i++, 0, PIER_H + y, sz * (SHELL.D / 2 + 0.11), 0, Math.max(0.0001, (SHELL.L + 0.4) * lock), 0.09, 0.07);
      for (const sx of [1, -1]) setInst(wl, i++, sx * (SHELL.L / 2 + 0.11), PIER_H + y, 0, 0, 0.07, 0.09, Math.max(0.0001, (SHELL.D + 0.4) * lock));
    }
    wl.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={ref} args={[UNIT_BOX, instanced(mat.formwork), BOARDS.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={walers} args={[UNIT_BOX, instanced(mat.steel), 8]} castShadow frustumCulled={false} />
    </>
  );
}

/* ---------- Concreting: the pump and its hose ---------- */

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

/** The pump stands in front of the bay, on the lane side; its hose goes up and over the formwork. */
const PUMP_AT = new Vector3(BAY_X + 6.4, 0, -5);
const POUR_TOP = PIER_H + SHELL.H + 0.15;
const HOSE = new CatmullRomCurve3([
  new Vector3(PUMP_AT.x - 0.1, 1.4, PUMP_AT.z),
  new Vector3(PUMP_AT.x - 0.5, 3.3, PUMP_AT.z + 0.2),
  new Vector3(BAY_X + 4.1, 4.9, -3.9),
  new Vector3(BAY_X + 2.3, 4.7, -2.9),
  new Vector3(BAY_X + 1.3, POUR_TOP, -2.4),
]);

function Concreting({ progress }: Prog) {
  const pump = useRef<Mesh>(null);
  const hose = useRef<Mesh>(null);
  const geo = useMemo(() => memo('factory-hose', () => new TubeGeometry(HOSE, 48, 0.06, 8)), []);
  const total = geo.index?.count ?? 0;

  useFrame(() => {
    const q = pp(progress.value);
    // It drives in from the lane, pumps, and drives off again.
    const here = hold(q, 0.55, 0.7, 0.035);
    if (pump.current) {
      pump.current.visible = here > 0.001;
      pump.current.position.set(PUMP_AT.x + (1 - here) * 14, 0, PUMP_AT.z - (1 - here) * 5);
    }
    const reach = hold(q, 0.585, 0.672, 0.02);
    if (hose.current) {
      hose.current.visible = reach > 0.001;
      geo.setDrawRange(0, Math.floor((total * reach) / 3) * 3);
    }
  });

  return (
    <>
      <mesh ref={pump} geometry={pumpGeometry()} material={mat.yellow} rotation-y={-0.35} visible={false} castShadow receiveShadow />
      <mesh ref={hose} geometry={geo} material={mat.rubber} visible={false} castShadow />
    </>
  );
}

/* ---------- Gantry: places the core shell, carries the cast shell to finishing ---------- */

const PARK = -27;
const RAIL_Z = 7.4;
const GANTRY_X = [
  [0.16, PARK],
  [0.255, BAY_X],
  [0.345, BAY_X],
  [0.41, PARK],
  [0.76, PARK],
  [0.815, BAY_X],
  [0.842, BAY_X],
  [0.878, FINISH_X],
  [0.9, FINISH_X],
  [0.94, PARK],
] as const;
const LOAD_TOP = PIER_H + SHELL.H;
const CORE = { L: 5.56, D: 2.56, H: 2.72, base: PIER_H + 0.14 };
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

/**
 * The core shell (notes H7): a steel frame of square corner columns, a ring
 * beam top and bottom, a cross beam at mid-span and the floor joists. On
 * the bay's own plan, standing on its underside.
 */
function coreFrame() {
  return memo('core-frame', () => {
    const { L, D, H } = CORE;
    const c = 0.12;
    const g: BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.push(box(c, H, c, sx * (L / 2 - c / 2), H / 2, sz * (D / 2 - c / 2)));
    for (const y of [c / 2, H - c / 2]) {
      for (const sz of [-1, 1]) g.push(box(L - c * 2, c, c, 0, y, sz * (D / 2 - c / 2)));
      for (const sx of [-1, 1]) g.push(box(c, c, D - c * 2, sx * (L / 2 - c / 2), y, 0));
    }
    g.push(box(c, c, D - c * 2, 0, H - c / 2, 0));
    for (let i = 1; i < 10; i++) g.push(box(0.07, 0.1, D - c * 2, -L / 2 + (i * L) / 10, 0.05, 0));
    return merge(g);
  });
}

function gantryFrame() {
  return memo('gantry', () => {
    const g = [box(0.9, 1, 16, 0, 9.6, 0)];
    for (const sz of [-1, 1]) {
      g.push(box(3.4, 0.45, 0.45, 0, 0.5, sz * RAIL_Z), box(3.2, 0.4, 0.4, 0, 9.3, sz * RAIL_Z));
      for (const sx of [-1, 1]) {
        const leg = box(0.34, 9.2, 0.34);
        leg.rotateZ(sx * -0.13);
        leg.translate(sx * 0.9, 4.9, sz * RAIL_Z);
        g.push(leg);
      }
    }
    return merge(g);
  });
}

/** The two rails the gantry runs on, as one mesh. */
function rails() {
  return memo('gantry-rails-v2', () => merge([-1, 1].map((s) => box(FINISH_X + 3.5 - (PARK - 5), 0.1, 0.22, (FINISH_X + 3.5 + PARK - 5) / 2, 0.06, s * RAIL_Z))));
}

function Gantry({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const group = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const block = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);

  useFrame(() => {
    const q = pp(progress.value);
    const x = track(q, GANTRY_X);
    if (group.current) group.current.position.x = x;

    const carryingCore = q < 0.345;
    const coreLift = track(q, CORE_LIFT);
    const shellLift = track(q, SHELL_LIFT);
    const coreTop = CORE.base + CORE.H;
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

    // The frame stays in the wall: once the concrete has closed over it, it is no longer drawn.
    if (core.current) {
      core.current.visible = q > 0.23 && q < 0.69;
      core.current.position.set(carryingCore ? x : BAY_X, CORE.base + (carryingCore ? coreLift : 0), 0);
    }
    label('core', BAY_X + 0.2, coreTop + (carryingCore ? coreLift : 0), -1.5, hold(q, 0.3, 0.352, 0.012));
  });

  return (
    <>
      <mesh geometry={rails()} material={mat.steel} receiveShadow />
      <group ref={group} position-x={PARK}>
        <mesh geometry={gantryFrame()} material={mat.yellow} castShadow receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.steel} scale={[1.3, 0.5, 1.3]} position={[0, 8.9, 0]} castShadow />
        <mesh ref={cable} geometry={UNIT_BOX} material={mat.steel} scale={[0.04, 1, 0.04]} />
        <mesh ref={block} geometry={UNIT_BOX} material={mat.steel} scale={[0.34, 0.36, 0.34]} />
      </group>
      <mesh ref={core} geometry={coreFrame()} material={mat.steel} rotation-y={TURN} visible={false} castShadow receiveShadow />
    </>
  );
}

/* ---------- The cast shell: rises with the pour, travels, is finished, is dispatched ---------- */

const ZF = SHELL.D / 2 - 0.01;
const XF = SHELL.L / 2 - 0.01;
/** Door leaf and glass set into the openings of the finished shell: its front, which faces the camera, and the end beside it. */
const FILL: { s: [number, number, number]; at: [number, number, number]; m: 'frame' | 'glass' }[] = moduleOpenings('A')
  .filter((o) => o.face === 'front' || o.face === 'right')
  .map((o): { s: [number, number, number]; at: [number, number, number]; m: 'frame' | 'glass' } => {
    const y = o.sill + o.h / 2;
    const t = o.door ? 0.05 : 0.03;
    return o.face === 'front'
      ? { s: [o.w, o.h, t], at: [o.u, y, ZF + (o.door ? 0.01 : 0)], m: o.door ? 'frame' : 'glass' }
      : { s: [t, o.h, o.w], at: [XF, y, o.u], m: 'glass' };
  });

const truckXAt = (p: number) => TRUCK_X + win(p, 0.962, 1, ease.in) * 30;

/** Dispatch, by film progress: the crane's hook comes over, lifts, slews to the trailer, sets down. */
const LIFT = { reach: [0.79, 0.815], up: [0.815, 0.85], across: [0.85, 0.915], down: [0.915, 0.95] } as const;

/**
 * Where the finished shell's base is during dispatch, and how it is turned:
 * lifted off the finishing bay, slewed round to lie along the trailer, and
 * set down on it.
 */
function dispatchPose(p: number): [number, number, number, number] | null {
  if (p < LIFT.up[0]) return null;
  const lift = win(p, LIFT.up[0], LIFT.up[1], ease.inOut);
  const travel = win(p, LIFT.across[0], LIFT.across[1], ease.inOut);
  const lower = win(p, LIFT.down[0], LIFT.down[1], ease.inOut);
  const x = lerp(FINISH_X, truckXAt(p), travel);
  const z = lerp(0, TRUCK_Z, travel);
  const y = lerp(PIER_H, 7, lift) - lower * (7 - TRUCK.deckY);
  return [x, y, z, TURN * (1 - travel)];
}

function CastShell({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const shellHex = useBuild((s) => shown(s).shellHex);
  const group = useRef<Group>(null);
  const raw = useRef<Mesh>(null);
  const painted = useRef<Mesh>(null);
  const arch = useRef<Group>(null);
  const fills = useRef<(Mesh | null)[]>([]);
  // The paint front runs along the shell, across the picture: bare concrete ahead of it, the finish behind.
  const planes = useMemo(() => ({ raw: new Plane(new Vector3(0, 0, 1), 0), painted: new Plane(new Vector3(0, 0, -1), 0) }), []);
  const mats = useMemo(() => {
    const opening = mat.rubber;
    // Sprayed in the finish the visitor chose.
    const finished = moduleMats(shellHex);
    const mk = (src: Material, plane: Plane) => {
      const m = src.clone();
      m.clippingPlanes = [plane];
      return m;
    };
    return {
      raw: [mk(mat.cast, planes.raw), mk(mat.cast, planes.raw), mk(opening, planes.raw), mk(mat.cast, planes.raw)],
      painted: [mk(finished[0], planes.painted), mk(mat.fascia, planes.painted), mk(opening, planes.painted), mk(mat.frame, planes.painted)],
    };
  }, [planes, shellHex]);
  useLayoutEffect(() => () => [...mats.raw, ...mats.painted].forEach((m) => m.dispose()), [mats]);

  useFrame(() => {
    const p = progress.value;
    const q = pp(p);
    const pour = win(q, 0.6, 0.67, ease.linear);
    let x = track(q, [
      [0.845, BAY_X],
      [0.874, FINISH_X],
    ]);
    let y = PIER_H + track(q, SHELL_LIFT);
    let z = 0;
    let turn = TURN;
    const d = dispatchPose(p);
    if (d) [x, y, z, turn] = d;
    const spray = win(q, 0.9, 0.955, ease.inOut);
    // The paint front travels with the shell until the arch sweeps along it.
    const front = z - 3.6 + spray * 7.2;
    planes.raw.constant = -front;
    planes.painted.constant = front;

    const g = group.current;
    if (g) {
      g.visible = pour > 0.001;
      g.position.set(x, y, z);
      g.rotation.y = turn;
    }
    for (const m of [raw.current, painted.current]) if (m) m.scale.set(1, Math.max(0.001, pour), 1);
    // All bare before the spray, all finished after it: only one of the two is drawn then.
    if (raw.current) raw.current.visible = spray < 1;
    if (painted.current) painted.current.visible = spray > 0;
    if (arch.current) {
      arch.current.visible = q > 0.86 && p < LIFT.reach[0];
      arch.current.position.z = front;
    }
    const set = win(q, 0.955, 0.995, ease.linear);
    fills.current.forEach((m, i) => {
      if (!m) return;
      const t = ease.out(stagger(set, i, FILL.length, 0.5));
      m.visible = t > 0.001;
      const s = FILL[i].s;
      m.scale.set(s[0] * t, s[1] * t, s[2] * t);
    });

    label('pour', PUMP_AT.x - 0.5, 3.3, PUMP_AT.z + 0.2, hold(q, 0.61, 0.668, 0.012));
    label('smooth', BAY_X + 1.5, PIER_H + 2.5, -1.2, hold(q, 0.775, 0.81, 0.012));
    label('spray', FINISH_X + 1.6, 4.4, front, hold(q, 0.905, 0.95, 0.012));
  });

  const geo = moduleGeometry('A');

  return (
    <>
      <group ref={group} visible={false}>
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
      {/* The spray arch straddles the shell and travels along it. */}
      <group ref={arch} position-x={FINISH_X} visible={false}>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={UNIT_BOX} material={mat.steel} scale={[0.16, 4.6, 0.16]} position={[s * 2.3, 2.3, 0]} castShadow />
        ))}
        <mesh geometry={UNIT_BOX} material={mat.steel} scale={[4.76, 0.16, 0.16]} position={[0, 4.6, 0]} castShadow />
        {[-1.4, -0.7, 0, 0.7, 1.4].map((xx) => (
          <mesh key={xx} geometry={UNIT_BOX} material={mat.accent} scale={[0.08, 0.14, 0.08]} position={[xx, 4.45, 0]} />
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
    const d = dispatchPose(p);
    if (d && p < 0.955) return _hook.set(d[0], d[1] + SHELL.H + 0.4, d[2]);
    // After setting the shell down the hook lifts clear.
    if (p >= 0.955) {
      const after = win(p, 0.955, 0.99, ease.out);
      return _hook.set(lerp(TRUCK_X, CRANE[0] + 5, after), TRUCK.deckY + SHELL.H + 0.4 + after * 4, lerp(TRUCK_Z, CRANE[2], after));
    }
    // Until the shell is finished the boom lies stowed along its carrier, out of the picture's way; then it comes over.
    const reach = win(p, LIFT.reach[0], LIFT.reach[1], ease.inOut);
    return _hook.set(lerp(CRANE[0] + 7, FINISH_X, reach), lerp(3.2, PIER_H + SHELL.H + 0.4, reach), lerp(CRANE[2], 0, reach));
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
    label('pier', BAY_X + 1.15, PIER_H, -2.5, hold(q, 0.2, 0.25, 0.012));
    label('insulation', BAY_X + 1.45, PIER_H + 2.9, 1.5, hold(q, 0.38, 0.432, 0.012));
    label('formwork', BAY_X + 1.55, PIER_H + 3.1, -0.5, hold(q, 0.475, 0.54, 0.012));
  });
  return (
    <>
      <Director progress={progress} rig={rig} />
      <Yard progress={progress} />
      <ShowHomes progress={progress} label={label} rig={rig} />
      {/* The working bay. */}
      <group position-x={BAY_X} rotation-y={TURN}>
        <Piers getT={() => win(pp(progress.value), 0.165, 0.245, ease.linear)} />
        <Insulation progress={progress} />
        <Boards getOut={() => 1 - win(pp(progress.value), 0.44, 0.52, ease.linear)} getDrop={() => win(pp(progress.value), 0.71, 0.79, ease.linear)} />
      </group>
      <group position-x={FINISH_X} rotation-y={TURN}>
        <Piers getT={one} />
      </group>
      {/* A second unit already in formwork, for a sense of the line. */}
      <group position-x={QUEUE_X} rotation-y={TURN}>
        <Piers getT={one} />
        <Boards getOut={zero} getDrop={zero} />
        <mesh geometry={UNIT_BOX} material={mat.cast} scale={[5.9, 0.1, 2.9]} position-y={PIER_H + SHELL.H - 0.05} />
      </group>
      <Gantry progress={progress} label={label} />
      <Concreting progress={progress} />
      <CastShell progress={progress} label={label} />
      <Dispatch progress={progress} />
    </>
  );
}

export default function FactoryScene(props: SceneProps) {
  return (
    <Stage {...props} look="clear" ground="land" focus={[0.67, 0.56]} focusCompact={[0.5, 0.36]} shadowExtent={44} localClipping>
      {(rig) => <Factory {...props} rig={rig} />}
    </Stage>
  );
}
