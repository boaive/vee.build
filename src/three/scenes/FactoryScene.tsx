import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, CatmullRomCurve3, MeshBasicMaterial, Object3D, Plane, TubeGeometry, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Material, type Mesh } from 'three';
import { shown, useBuild } from '../../build/store';
import { FACTORY as T } from '../../film/factoryTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, lerp, sampleCamera, stagger, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, useWarmAll, type Rig } from '../Stage';
import { UNIT_BOX, box, cyl, memo, merge, mergeGroups, setInst } from '../kit/geometry';
import { LIFT, MobileCrane, PUMP_OUTLET, Pump, TRUCK, Truck, prepareMachines } from '../kit/machines';
import { instanced, mat, moduleMats } from '../kit/materials';
import { jackBaseGeometry, jackScrewGeometry, moduleGeometry } from '../kit/parts';
import { HOOKS, SHELL, castRoofGeometry, castWallsGeometry, epsFloorGeometry, epsRoofGeometry, epsWallGeometry, frameGeometry, shellJoinery, wallBays, type FrameStage } from '../kit/shell';
import { boxUV } from '../kit/textures';

/**
 * The factory: one shell made in one bay, start to finish, then lifted
 * onto the truck. Redrawn on 2026-10-10 on the client's instruction; the
 * order is theirs (film/factoryTimeline.ts):
 *
 *   structural frame, with its four hooks → insulation panels, walls and
 *   top → formwork → concrete, cast as walls → de-shuttering, which leaves
 *   the openings empty → doors and windows → spray finish, in the same bay
 *   → the crane lifts it by its four hooks onto the truck, lets go once it
 *   is down, and the truck leaves.
 *
 * The shell is the one "Componentized building" takes apart (kit/shell.ts):
 * the same frame, the same panels, the same openings. Sprayed, it is the
 * finished module every other film shows (kit/parts.ts, moduleGeometry).
 *
 * The yard is seen from above and from the side, on the diagonal, with the
 * shell as its subject (the same instruction: "a more diagonal angle";
 * before it was seen from above throughout, from 2026-10-07). The shell's
 * front faces the camera's side of the yard; the picture's left, where the
 * captions stand as plain text, is open slab. The yard is about half the
 * size it was, and what stands in it besides the working bay stands still:
 * a second shell with its panels going on, a third cast and curing, the
 * finished ones in the shed. No gantry: parts are set as they are in
 * section 3.
 */

type V3 = [number, number, number];
type Prog = { progress: { value: number } };

/** The shell stands on four adjustable piers: its underside above the slab. */
const BASE = 0.5;
/** The slab runs on towards the viewer, out of the picture: the captions of a narrow screen stand on it. */
const YARD = { x0: -32, x1: 30, z0: -31, z1: 46 };
/** The truck's lane runs along the shell's front, to the gate in the right-hand wall. */
const LANE = 7.6;
const TRUCK_X = 5.2;
/** The crane stands behind the bay and to its right, out of the shell's way until it is wanted. */
const CRANE_AT: V3 = [3.5, 0, -12];
/** The pump stands by the shell's front corner, its hopper end towards it. */
const PUMP_AT: V3 = [3.9, 0, 4.1];
const PUMP_TURN = 2.9;
/** The spray gantry waits at the end of its rails, well past the shell's end. */
const GANTRY = { park: 13.5, from: 3.9, to: -3.9, z: 2.45, h: 4.5 };

/** One job per geometry, for building them in idle time before the film mounts (film/prefetch.ts). */
export const prepare: (() => void)[] = [
  ...prepareMachines,
  ...(['floor', 'columns', 'top', 'hooks'] as FrameStage[]).map((s) => () => void frameGeometry(s)),
  ...(['front', 'back', 'left', 'right'] as const).map((s) => () => void epsWallGeometry(s)),
  () => void epsFloorGeometry(),
  () => void epsRoofGeometry(),
  () => void castWallsGeometry(),
  () => void castRoofGeometry(),
  () => void shellJoinery(),
  () => void moduleGeometry('A'),
];

/* ---------- Camera ---------- */

/** A view: what it looks at, from how far, how high (degrees above the ground) and from which side (degrees from the front, towards the shell's right end). */
function shot(p: number, look: V3, distance: number, elevation: number, azimuth: number): CameraKey {
  const e = (elevation * Math.PI) / 180;
  const a = (azimuth * Math.PI) / 180;
  return { p, look, pos: [look[0] + distance * Math.cos(e) * Math.sin(a), look[1] + distance * Math.sin(e), look[2] + distance * Math.cos(e) * Math.cos(a)] };
}
/*
 * The whole yard first, then in to the bay, and round it a little from
 * stage to stage so that each is seen from where it shows best: the frame
 * and the panels from the corner, the doors from nearer the front, the
 * lift from farther back.
 */
const CAM: CameraKey[] = [
  shot(0, [1, 1.2, -4], 60, 28, 33),
  shot(0.075, [0, 1.5, 0], 31, 25, 41),
  shot(0.18, [0, 1.8, 0], 28, 24, 45),
  shot(0.32, [0, 1.9, 0], 27, 26, 36),
  shot(0.412, [0, 1.9, 0], 28.5, 27, 43),
  shot(0.545, [0.9, 1.9, 0.9], 31.5, 31, 46),
  shot(0.668, [0, 1.9, 0], 27, 25, 38),
  shot(0.742, [0.2, 1.8, 0.3], 23.5, 22, 29),
  shot(0.845, [0.6, 2.0, 0], 28.5, 25, 40),
  // The lift: back and up, so that the crane, the shell in the air and the trailer in front are all in the picture.
  shot(0.91, [3.2, 3.4, 3.6], 45, 27, 30),
  shot(0.972, [5.0, 2.6, 6.2], 41, 25, 33),
  shot(1, [10.5, 2.2, 7.2], 41, 23, 31),
];

/* ---------- Yard ---------- */

/** The slab, with its texture at true scale. */
function slab() {
  return memo('factory-slab-v2', () => {
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

/** Precast boundary wall in 4 m panels on three sides, with the gate's opening on the lane. The side the yard is seen from is open. */
function walls() {
  return memo('factory-walls-v2', () => {
    const g: BufferGeometry[] = [];
    const runX = (x0: number, x1: number, z: number) => {
      for (let x = x0; x < x1 - 0.1; x += 4) g.push(box(Math.min(4, x1 - x) - 0.06, 2.6, 0.3, x + Math.min(4, x1 - x) / 2, 1.3, z));
    };
    const runZ = (z0: number, z1: number, x: number) => {
      for (let z = z0; z < z1 - 0.1; z += 4) g.push(box(0.3, 2.6, Math.min(4, z1 - z) - 0.06, x, 1.3, z + Math.min(4, z1 - z) / 2));
    };
    runX(YARD.x0, YARD.x1, YARD.z0);
    runZ(YARD.z0, YARD.z1, YARD.x0);
    runZ(YARD.z0, LANE - 5, YARD.x1);
    runZ(LANE + 5, YARD.z1, YARD.x1);
    g.push(box(0.7, 3.4, 0.7, YARD.x1, 1.7, LANE - 5.2), box(0.7, 3.4, 0.7, YARD.x1, 1.7, LANE + 5.2));
    return merge(g);
  });
}

/** Painted on the slab: the working bay, the two behind it, the truck's lane. With the rails the spray gantry runs on. Groups: 0 paint, 1 steel. */
function markings() {
  return memo('factory-markings-v2', () => {
    const paint: BufferGeometry[] = [];
    const rect = (cx: number, cz: number, w: number, d: number) =>
      paint.push(box(w, 0.012, 0.1, cx, 0.02, cz - d / 2), box(w, 0.012, 0.1, cx, 0.02, cz + d / 2), box(0.1, 0.012, d, cx - w / 2, 0.02, cz), box(0.1, 0.012, d, cx + w / 2, 0.02, cz));
    rect(0, 0, 9.4, 6.2);
    for (const b of BACK) rect(b.at[0], b.at[2], 9.4, 6.2);
    // The lane's lines stop short of the picture's left, where the captions stand.
    for (const s of [-1, 1]) paint.push(box(YARD.x1 + 1.5, 0.012, 0.14, (YARD.x1 - 1.5) / 2, 0.02, LANE + s * 2.1));
    const rails = [-1, 1].map((s) => box(GANTRY.park - GANTRY.to + 2.4, 0.05, 0.07, (GANTRY.park + GANTRY.to) / 2, 0.025, s * GANTRY.z));
    return mergeGroups([paint, rails]);
  });
}

/** Open-fronted portal-frame shed, its open side to +z. Groups: 0 cladding, 1 steel. */
function shed(w: number, d: number, h: number) {
  return memo(`shed-${w}-${d}-${h}`, () => {
    const clad = [box(w, h, 0.2, 0, h / 2, -d / 2), box(0.2, h, d, -w / 2, h / 2, 0), box(0.2, h, d, w / 2, h / 2, 0)];
    const pitch = 0.16;
    for (const s of [-1, 1]) {
      const p = box(w + 0.8, 0.14, d / 2 / Math.cos(pitch) + 0.4, 0, 0, 0);
      p.rotateX(s * pitch);
      p.translate(0, h + Math.tan(pitch) * (d / 4) + 0.1, (-s * d) / 4);
      clad.push(p);
    }
    const steel = [box(w, 0.6, 0.4, 0, h - 0.3, d / 2)];
    const bays = Math.round(w / 6);
    for (let i = 0; i <= bays; i++) steel.push(box(0.4, h, 0.4, -w / 2 + (i * w) / bays, h / 2, d / 2));
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

const SHED = { x: -12, z: -25, w: 30, d: 11, h: 8 };
const shedMats = [mat.sheeting, mat.steel];
const plantMats = [mat.paint, mat.paintDark];
const markMats = [mat.marking, mat.galv];

/**
 * What else is going on in the yard, standing still (client, 2026-10-10:
 * "active rather than empty"; static, so it costs the picture nothing while
 * the working bay moves): a shell with its frame up and its panels going
 * on, and one cast and curing, waiting for its doors.
 */
const BACK: { at: V3; stage: 'panels' | 'cast' }[] = [
  { at: [-17, 0, -15], stage: 'panels' },
  { at: [-8, 0, -19], stage: 'cast' },
];

/** A shell part way through the line, as few pieces as it can be. Origin on the slab under its middle. */
function backShell(stage: 'panels' | 'cast') {
  const stand = memo('back-stand', () => merge([-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.5, BASE, 0.5, sx * 2.5, BASE / 2, sz * 1.15)))));
  const lift = (g: BufferGeometry) => {
    const c = g.clone();
    c.translate(0, BASE, 0);
    return c;
  };
  if (stage === 'panels')
    return {
      stand,
      steel: memo('back-frame', () => merge((['floor', 'columns', 'top', 'hooks'] as FrameStage[]).map((s) => lift(frameGeometry(s))))),
      // The floor, the back wall and one end are in; the rest of the panels wait in a stack beside the bay.
      panel: memo('back-panels', () => merge([lift(epsFloorGeometry()), lift(epsWallGeometry('back')), lift(epsWallGeometry('left')), box(2.8, 0.84, 1.0, 4.9, 0.5, 1.6), box(0.96, 0.24, 2.7, 4.9, 0.2, -1.4)])),
      cast: null,
    };
  return {
    stand,
    steel: memo('back-hooks', () => lift(frameGeometry('hooks'))),
    panel: memo('back-reveals', () => merge((['front', 'back', 'left', 'right'] as const).map((f) => lift(epsWallGeometry(f))))),
    cast: memo('back-cast', () => {
      const roof = castRoofGeometry().clone();
      roof.translate(0, SHELL.roofTop, 0);
      return merge([lift(castWallsGeometry()), lift(roof)]);
    }),
  };
}

function Yard({ progress }: Prog) {
  const leaves = useRef<(Mesh | null)[]>([]);
  const stock = useRef<InstancedMesh>(null);
  const stockMats = useMemo(() => moduleMats(), []);

  // Finished shells in the shed, two high: placed once.
  useLayoutEffect(() => {
    const s = stock.current;
    if (!s) return;
    let i = 0;
    for (let lvl = 0; lvl < 2; lvl++) for (let c = 0; c < 3; c++) setInst(s, i++, SHED.x - 7 + c * 7, 0.3 + lvl * 3.05, SHED.z - 0.5, 0);
    s.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    // The gate opens for the truck and stays open.
    const open = win(progress.value, T.truck.in[0] - 0.035, T.truck.in[0], ease.inOutCubic);
    leaves.current.forEach((m, i) => m && (m.position.z = LANE + (i ? 1 : -1) * (2.5 + open * 5.1)));
  });

  return (
    <>
      <mesh geometry={slab()} material={mat.yard} receiveShadow />
      <mesh geometry={walls()} material={mat.concrete} castShadow receiveShadow />
      <mesh geometry={markings()} material={markMats} receiveShadow />
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            leaves.current[i] = m;
          }}
          geometry={gateLeaf()}
          material={mat.steel}
          position={[YARD.x1 + 0.4, 0, LANE + (i ? 2.5 : -2.5)]}
          castShadow
        />
      ))}
      <mesh geometry={shed(SHED.w, SHED.d, SHED.h)} material={shedMats} position={[SHED.x, 0, SHED.z]} castShadow receiveShadow />
      <mesh geometry={batching()} material={plantMats} position={[19, 0, -25]} castShadow receiveShadow />
      <instancedMesh ref={stock} args={[moduleGeometry('A'), instanced(stockMats), 6]} castShadow receiveShadow frustumCulled={false} />
      {BACK.map((b) => {
        const g = backShell(b.stage);
        return (
          <group key={b.stage} position={b.at}>
            <mesh geometry={g.stand} material={mat.steel} castShadow />
            <mesh geometry={g.steel} material={mat.frameSteel} castShadow />
            <mesh geometry={g.panel} material={mat.panel} castShadow receiveShadow />
            {g.cast && <mesh geometry={g.cast} material={mat.cast} castShadow receiveShadow />}
          </group>
        );
      })}
    </>
  );
}

/* ---------- The bay: piers ---------- */

/**
 * Four adjustable piers. Brief: they "position dynamically": each one
 * travels out from the middle of the bay to its corner, then its head is
 * screwed up to a common level.
 */
function Piers({ progress }: Prog) {
  const bases = useRef<InstancedMesh>(null);
  const screws = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  useFrame(() => {
    const b = bases.current;
    const s = screws.current;
    const t = win(progress.value, T.piers[0], T.piers[1], ease.linear);
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
        setInst(s, i, x, BASE - (1 - adjust) * 0.14, z, adjust * Math.PI * 4, sc * 0.8, sc * 0.62, sc * 0.8);
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

/* ---------- The shell, stage by stage ---------- */

/** A piece that is set in place: where it comes from, and over which stretch of the film. */
interface Piece {
  key: string;
  geo: BufferGeometry;
  mat: Material | Material[];
  from: V3;
  win: readonly [number, number];
  /**
   * Gone from sight once it cannot be seen: `in`, what is inside the walls,
   * when the boards have closed round them; `under`, what lies under the
   * roof's concrete, when that has been laid.
   */
  hid?: 'in' | 'under';
  /** Fitted, not dropped: slides home at full size. */
  slide?: boolean;
}
const part = ([a, b]: readonly [number, number], from: number, to: number): [number, number] => [a + (b - a) * from, a + (b - a) * to];

/** The formwork's green boards: one a bay, standing just clear of where the concrete's face will be. */
const SHUTTERS = wallBays().map((w) => ({
  x: w.pos[0] + w.out[0] * (SHELL.eps / 2 + SHELL.coat + 0.012),
  z: w.pos[2] + w.out[2] * (SHELL.eps / 2 + SHELL.coat + 0.012),
  turn: Math.atan2(w.out[0], w.out[2]),
  width: w.width / SHELL.bay,
  nx: w.out[0],
  nz: w.out[2],
}));
/** The order they close in, and come off in: round the shell from the corner nearest the camera. */
const ROUND = SHUTTERS.map((s, i) => ({ i, a: (Math.atan2(s.z, s.x) - Math.atan2(1.5, 3) + Math.PI * 4) % (Math.PI * 2) }))
  .sort((p, q) => p.a - q.a)
  .map((o) => o.i);
const RANK = SHUTTERS.map((_, i) => ROUND.indexOf(i));

/**
 * One board of the formwork, a bay wide, standing on its foot with its
 * face at z = 0 and its back to +z: a green ply face on two steel
 * soldiers, with a push-pull prop down to the slab. Groups: 0 the green
 * face, 1 steel.
 */
function shutterGeometry() {
  return memo('shutter-v2', () => {
    const h = SHELL.roofTop + 0.16;
    const face = [box(SHELL.bay - 0.012, h, 0.02, 0, h / 2 - 0.04, 0.01)];
    const steel: BufferGeometry[] = [];
    for (const x of [-0.3, 0.3]) steel.push(box(0.06, h, 0.09, x, h / 2 - 0.04, 0.065));
    for (const y of [0.3, 1.5, 2.7]) steel.push(box(SHELL.bay - 0.05, 0.05, 0.04, 0, y, 0.04));
    const prop = box(0.045, 2.7, 0.045);
    prop.rotateX(-0.5);
    prop.translate(0, 1.18 - BASE, 0.11 + 0.65);
    steel.push(prop, box(0.22, 0.03, 0.22, 0, -BASE + 0.015, 0.11 + 1.3));
    return mergeGroups([face, steel]);
  });
}
const shutterMats = [mat.formwork, mat.steel];
const _o = new Object3D();

/**
 * The boards close on the panels from all round, two steel walers lock
 * round them, and after the pour the walers come off and each board is
 * eased back and lifted away, round the shell in turn.
 */
function Formwork({ progress }: Prog) {
  const ref = useRef<InstancedMesh>(null);
  const walers = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  const boards = useMemo(() => instanced(shutterMats), []);
  useFrame(() => {
    const m = ref.current;
    const wl = walers.current;
    const p = progress.value;
    if (!m || !wl) return;
    const here = p > T.form.close[0] - 0.002 && p < T.strip.off[1] + 0.002;
    m.visible = here;
    wl.visible = here;
    if (!here || p === last.current) return;
    last.current = p;
    const close = win(p, T.form.close[0], T.form.close[1], ease.linear);
    const off = win(p, T.strip.off[0], T.strip.off[1], ease.linear);
    SHUTTERS.forEach((s, i) => {
      const c = ease.outQuart(stagger(close, RANK[i], SHUTTERS.length, 0.72));
      const o = stagger(off, RANK[i], SHUTTERS.length, 0.68);
      // Coming off: eased back from the concrete and tipped, then lifted clear.
      const back = ease.out(clamp01(o / 0.35));
      const away = ease.in(clamp01((o - 0.3) / 0.7));
      const push = (1 - c) * 3.4 + back * 0.55 + away * 1.6;
      const size = c <= 0 || o >= 1 ? 0.0001 : 1 - clamp01((o - 0.78) / 0.22) * 0.999;
      _o.position.set(s.x + s.nx * push, BASE + away * 6.5, s.z + s.nz * push);
      _o.rotation.set(back * 0.16, s.turn, 0, 'YXZ');
      _o.scale.set(s.width * size, size, size);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    // The walers run on once the last board is home, and come off before the first one moves.
    const lock = win(p, T.form.lock[0], T.form.lock[1], ease.out) * (1 - win(p, T.strip.unlock[0], T.strip.unlock[1], ease.inOut));
    const ox = SHELL.outer.x + 0.16;
    const oz = SHELL.outer.z + 0.16;
    let k = 0;
    for (const y of [0.95, 2.45]) {
      for (const sz of [1, -1]) setInst(wl, k++, 0, BASE + y, sz * oz, 0, Math.max(0.0001, (ox * 2 + 0.3) * lock), 0.1, 0.07);
      for (const sx of [1, -1]) setInst(wl, k++, sx * ox, BASE + y, 0, 0, 0.07, 0.1, Math.max(0.0001, (oz * 2 + 0.3) * lock));
    }
    wl.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={ref} args={[shutterGeometry(), boards, SHUTTERS.length]} visible={false} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={walers} args={[UNIT_BOX, instanced(mat.steel), 8]} visible={false} castShadow frustumCulled={false} />
    </>
  );
}

/** The delivery line from the pump: along the slab, up the face of the formwork and over its edge onto the roof. */
const HOSE = (() => {
  const c = Math.cos(PUMP_TURN);
  const s = Math.sin(PUMP_TURN);
  const out = new Vector3(PUMP_AT[0] + PUMP_OUTLET[0] * c, PUMP_OUTLET[1], PUMP_AT[2] - PUMP_OUTLET[0] * s);
  const top = BASE + SHELL.roofTop;
  return new CatmullRomCurve3(
    [
      out,
      new Vector3(out.x - 0.3, 0.14, out.z - 0.4),
      new Vector3(1.94, 0.1, 2.6),
      new Vector3(1.92, BASE + 0.4, 1.8),
      new Vector3(1.92, BASE + 2.1, 1.71),
      new Vector3(1.92, top + 0.22, 1.66),
      new Vector3(1.82, top + 0.3, 1.25),
      new Vector3(1.45, top + 0.12, 0.7),
      new Vector3(0.9, top + 0.09, 0.35),
    ],
    false,
    'catmullrom',
    0.35,
  );
})();

/**
 * The inside of the shell, once its roof is on and the boards have closed
 * round it: a room in shadow. Seen through the openings when the boards
 * come off, it is what makes them read as empty, and the shell as hollow
 * (client, 2026-10-10: "do not make the entire interior a solid concrete
 * mass"). The white panels behind it, lit as if they stood in the open,
 * made each opening look filled in.
 */
const INSIDE = { size: [5.74, 2.74, 2.74] as V3, y: SHELL.floor + 1.37 };
const insideMat = new MeshBasicMaterial({ color: '#34363a', side: BackSide });

/**
 * The shell's parts. Raw, every one is drawn in front of the paint (a
 * plane that travels with the spray gantry); the finished module is drawn
 * behind it.
 */
function Shell({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const shellHex = useBuild((s) => shown(s).shellHex);
  const refs = useRef<(Mesh | null)[]>([]);
  const walls = useRef<Mesh>(null);
  const roof = useRef<Mesh>(null);
  const hose = useRef<Mesh>(null);
  const gantry = useRef<Group>(null);
  const done = useRef<Mesh>(null);
  const inside = useRef<Mesh>(null);
  const hoseGeo = useMemo(() => memo('factory-hose-v2', () => new TubeGeometry(HOSE, 72, 0.055, 8)), []);
  const hoseLen = hoseGeo.index?.count ?? 0;

  // The paint's front lies across the shell and travels along it: bare concrete ahead of it, the finish behind.
  const planes = useMemo(() => ({ raw: new Plane(new Vector3(-1, 0, 0), 1e4), painted: new Plane(new Vector3(1, 0, 0), -1e4) }), []);
  const mats = useMemo(() => {
    const cut = <M extends Material>(src: M, plane: Plane): M => {
      const m = src.clone();
      m.clippingPlanes = [plane];
      return m;
    };
    const raw = (m: Material) => cut(m, planes.raw);
    return {
      steel: mat.frameSteel,
      hooks: raw(mat.frameSteel),
      panel: mat.panel,
      reveal: raw(mat.panel),
      cast: raw(mat.cast),
      joinery: [raw(mat.fascia), raw(mat.glass), raw(mat.frame)],
      // Sprayed in the finish the visitor chose.
      painted: moduleMats(shellHex).map((m) => cut(m, planes.painted)),
    };
  }, [planes, shellHex]);
  useLayoutEffect(() => () => [mats.hooks, mats.reveal, mats.cast, ...mats.joinery, ...mats.painted].forEach((m) => m.dispose()), [mats]);

  const pieces = useMemo<Piece[]>(() => {
    const P: Piece[] = [];
    const up: V3 = [0, 4.2, 0];
    P.push({ key: 'floor', geo: frameGeometry('floor'), mat: mats.steel, from: up, win: T.frame.floor, hid: 'in' });
    P.push({ key: 'columns', geo: frameGeometry('columns'), mat: mats.steel, from: up, win: T.frame.columns, hid: 'in' });
    P.push({ key: 'top', geo: frameGeometry('top'), mat: mats.steel, from: [0, 3.4, 0], win: T.frame.top, hid: 'under' });
    // The hooks stay in sight to the end: they stand proud of the concrete, and the crane lifts by them.
    P.push({ key: 'hooks', geo: frameGeometry('hooks'), mat: mats.hooks, from: [0, 3, 0], win: T.frame.hooks });
    P.push({ key: 'eps-floor', geo: epsFloorGeometry(), mat: mats.panel, from: [0, 3.6, 0], win: T.panels.floor, hid: 'in' });
    // The walls go in from their own sides, the front last; a wall's panels show in its openings to the end.
    const order = ['back', 'left', 'right', 'front'] as const;
    order.forEach((f, k) => {
      const out: V3 = f === 'front' ? [0, 0, 1] : f === 'back' ? [0, 0, -1] : f === 'right' ? [1, 0, 0] : [-1, 0, 0];
      const [a, b] = T.panels.walls;
      const each = (b - a) * 0.52;
      const start = a + ((b - a - each) * k) / 3;
      P.push({ key: `eps-${f}`, geo: epsWallGeometry(f), mat: mats.reveal, from: [out[0] * 3.4, 0, out[2] * 3.4], win: [start, start + each] });
    });
    P.push({ key: 'eps-roof', geo: epsRoofGeometry(), mat: mats.panel, from: [0, 3.8, 0], win: T.panels.roof, hid: 'under' });
    // Doors and windows: the standard shell's, pushed home from outside, the front's last.
    const fit = shellJoinery().sort((p, q) => (p.face === 'front' ? 1 : 0) - (q.face === 'front' ? 1 : 0));
    fit.forEach((j, k) => P.push({ key: `fit-${j.face}`, geo: j.geo, mat: mats.joinery, from: [j.out[0] * 1.3, 0, j.out[2] * 1.3], win: part(T.fit, (k / fit.length) * 0.55, (k / fit.length) * 0.55 + 0.45), slide: true }));
    return P;
  }, [mats]);

  useFrame(() => {
    const p = progress.value;
    // Closed: the boards are round it, and what is inside can no longer be seen for what it is. Sprayed: it is the finished module.
    const closed = p >= T.form.lock[1];
    const spray = win(p, T.spray.pass[0], T.spray.pass[1], ease.inOut);
    const sprayed = spray >= 1;
    const roofed = p >= T.pour.roof[1];

    for (let i = 0; i < pieces.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const d = pieces[i];
      const raw = clamp01((p - d.win[0]) / (d.win[1] - d.win[0]));
      if (raw <= 0 || sprayed || (closed && d.hid === 'in') || (roofed && d.hid === 'under')) {
        m.visible = false;
        continue;
      }
      const t = ease.outQuart(raw);
      const s = d.slide ? 1 : Math.min(1, raw * 6);
      m.visible = true;
      m.position.set(d.from[0] * (1 - t), BASE + d.from[1] * (1 - t), d.from[2] * (1 - t));
      m.scale.setScalar(s);
    }

    if (inside.current) inside.current.visible = closed && p < T.fit[1] + 0.004 && !sprayed;

    // The concrete: up the walls between the boards and the panels, then over the roof from the hose's end.
    const level = win(p, T.pour.walls[0], T.pour.walls[1], ease.inOut);
    const over = win(p, T.pour.roof[0], T.pour.roof[1], ease.inOut);
    if (walls.current) {
      walls.current.visible = level > 0.001 && !sprayed;
      walls.current.scale.y = Math.max(0.001, level);
    }
    if (roof.current) {
      roof.current.visible = over > 0.001 && !sprayed;
      const len = SHELL.L + 0.1;
      roof.current.scale.x = Math.max(0.001, over);
      roof.current.position.x = (len / 2) * (1 - over);
    }
    // The hose is run out for the pour and taken back after it.
    const run = win(p, T.pour.hose[0], T.pour.hose[1], ease.inOut) * (1 - win(p, T.pour.away[0], T.pour.away[1], ease.inOut));
    if (hose.current) {
      hose.current.visible = run > 0.002;
      hoseGeo.setDrawRange(0, Math.floor((hoseLen * run) / 3) * 3);
    }

    // The spray gantry rolls up from its end of the rails, passes along the shell and goes back.
    const gx =
      p < T.spray.pass[0]
        ? lerp(GANTRY.park, GANTRY.from, win(p, T.spray.in[0], T.spray.in[1], ease.inOut))
        : p < T.spray.out[0]
          ? lerp(GANTRY.from, GANTRY.to, spray)
          : lerp(GANTRY.to, GANTRY.park, win(p, T.spray.out[0], T.spray.out[1], ease.inOut));
    if (gantry.current) gantry.current.position.x = gx;
    const front = spray <= 0 ? 1e4 : sprayed ? -1e4 : gx;
    planes.raw.constant = front;
    planes.painted.constant = -front;

    // Finished, it is one piece: on its piers, in the air under the crane's frame, on the truck.
    const m = done.current;
    if (m) {
      m.visible = spray > 0;
      const [x, y, z] = shellAt(p);
      m.position.set(x, y, z);
    }

    label('frame', -2.95, BASE + SHELL.roofTop, 1.45, hold(p, T.frame.columns[1], T.frame.hooks[1] + 0.012, 0.012));
    label('hook', HOOKS[3][0], BASE + SHELL.roofTop + 0.2, HOOKS[3][2], hold(p, T.frame.hooks[0] + 0.012, T.frame.hooks[1] + 0.012, 0.01));
    label('panels', -1.44, BASE + 2.3, 1.5, hold(p, T.panels.walls[0] + 0.03, T.panels.roof[1], 0.012));
    label('formwork', -1.9, BASE + 2.6, 1.62, hold(p, T.form.close[0] + 0.03, T.form.lock[1] + 0.006, 0.012));
    label('pour', 1.92, BASE + SHELL.roofTop + 0.25, 1.66, hold(p, T.pour.walls[0], T.pour.roof[1], 0.012));
    label('openings', -0.51, BASE + 1.5, 1.54, hold(p, T.strip.off[0] + 0.04, T.fit[0], 0.012));
    label('joinery', 1.72, BASE + 2.1, 1.56, hold(p, T.fit[0] + 0.02, T.fit[1] + 0.004, 0.012));
    label('spray', gx, GANTRY.h + 0.2, GANTRY.z, hold(p, T.spray.pass[0], T.spray.pass[1], 0.012));
  });

  return (
    <>
      {pieces.map((d, i) => (
        <mesh
          key={d.key}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={d.geo}
          material={d.mat}
          visible={false}
          castShadow
          receiveShadow
        />
      ))}
      <mesh ref={walls} geometry={castWallsGeometry()} material={mats.cast} position-y={BASE} visible={false} castShadow receiveShadow />
      <mesh ref={roof} geometry={castRoofGeometry()} material={mats.cast} position-y={BASE + SHELL.roofTop} visible={false} castShadow receiveShadow />
      <mesh ref={inside} geometry={UNIT_BOX} material={insideMat} scale={INSIDE.size} position-y={BASE + INSIDE.y} visible={false} />
      <mesh ref={hose} geometry={hoseGeo} material={mat.rubber} visible={false} castShadow />
      <group ref={gantry} position-x={GANTRY.park}>
        <mesh geometry={sprayGantry()} material={gantryMats} castShadow />
      </group>
      <mesh ref={done} geometry={moduleGeometry('A')} material={mats.painted} visible={false} castShadow receiveShadow />
    </>
  );
}

/**
 * The spray gantry: a portal on two bogies that straddles the shell, with a
 * bar of nozzles down each side and one across the top, and the paint pump
 * on one leg. Origin on the slab, the shell's length along x. Groups:
 * 0 frame, 1 dark.
 */
function sprayGantry() {
  return memo('spray-gantry', () => {
    const { z, h } = GANTRY;
    const frame: BufferGeometry[] = [box(0.22, 0.26, z * 2 + 0.22, 0, h, 0)];
    const dark: BufferGeometry[] = [box(0.05, 0.05, 3.2, 0, h - 0.36, 0), box(0.5, 0.72, 0.34, 0, 1.25, z + 0.28)];
    for (const s of [-1, 1]) {
      frame.push(box(0.2, h - 0.3, 0.2, 0, (h - 0.3) / 2 + 0.3, s * z), box(1.2, 0.24, 0.3, 0, 0.2, s * z));
      // Braces from the bogie up the leg, and the bar of nozzles facing the wall.
      for (const e of [-1, 1]) {
        const brace = box(0.07, 1.5, 0.07);
        brace.rotateZ(e * 0.34);
        brace.translate(e * 0.28, 0.98, s * z);
        frame.push(brace);
      }
      dark.push(box(0.05, 3.3, 0.05, 0, BASE + 1.7, s * (z - 0.5)));
      for (let k = 0; k < 7; k++) dark.push(box(0.04, 0.04, 0.16, 0, BASE + 0.25 + k * 0.48, s * (z - 0.58)));
      for (const e of [-1, 1]) dark.push(box(0.26, 0.2, 0.36, e * 0.42, 0.1, s * z));
    }
    for (let k = 0; k < 6; k++) dark.push(box(0.04, 0.14, 0.04, 0, h - 0.45, -1.4 + k * 0.56));
    return mergeGroups([frame, dark]);
  });
}
const gantryMats = [mat.galv, mat.paintDark];

/* ---------- Dispatch ---------- */

/** How high the shell's underside is carried across the yard. */
const CARRY = 5.4;
/** Where the truck stands along its lane: reversing in through the gate, then away through it. */
/** It is still in the picture when the film ends, on its way out of the gate: the next section takes it up on the road. */
const truckX = (p: number) => TRUCK_X + (1 - win(p, T.truck.in[0], T.truck.in[1], ease.out)) * 27 + win(p, T.truck.go[0], T.truck.go[1], ease.in) * 13;

/**
 * Where the finished shell's underside is: on its piers, lifted, carried
 * over to the trailer and set down on it, then away with the truck. It
 * keeps the way it lies throughout: the trailer stands along its length.
 */
function shellAt(p: number): V3 {
  if (p < T.lift.up[0]) return [0, BASE, 0];
  const up = win(p, T.lift.up[0], T.lift.up[1], ease.inOutCubic);
  const over = win(p, T.lift.over[0], T.lift.over[1], ease.inOutCubic);
  const down = win(p, T.lift.down[0], T.lift.down[1], ease.inOutCubic);
  const x = p >= T.lift.down[1] ? truckX(p) : lerp(0, TRUCK_X, over);
  return [x, lerp(BASE, CARRY, up) - down * (CARRY - TRUCK.deckY), lerp(0, LANE, over)];
}

/** The hook above a shell's underside: its hooks, and the lifting frame's drop to them. */
const HOOK_ABOVE = SHELL.roofTop - 0.04 + LIFT.drop;
/** Stood by: the lifting frame rests on the slab past the shell's end, the boom low over it. */
const REST = new Vector3(10.2, LIFT.drop + 0.06, -5.6);
const _hook = new Vector3();

function Dispatch({ progress, label }: Prog & { label: ReturnType<typeof useLabel> }) {
  const getHook = () => {
    const p = progress.value;
    // Let go: only once the shell is down on the trailer does the frame lift off it, and it stays where it is as the truck leaves.
    if (p >= T.lift.release[0]) {
      const clear = win(p, T.lift.release[0], T.lift.release[1], ease.inOutCubic);
      return _hook.set(TRUCK_X, TRUCK.deckY + HOOK_ABOVE + clear * 2.6, LANE);
    }
    if (p >= T.lift.up[0]) {
      const [x, y, z] = shellAt(p);
      return _hook.set(x, y + HOOK_ABOVE, z);
    }
    // The frame is brought over the shell and lowered until its four slings reach the hooks.
    const t = win(p, T.lift.reach[0], T.lift.reach[1], ease.inOutCubic);
    return _hook.set(lerp(REST.x, 0, t), lerp(REST.y, BASE + HOOK_ABOVE, t) + Math.sin(Math.PI * t) * 3.2, lerp(REST.z, 0, t));
  };
  useFrame(() => {
    const p = progress.value;
    const [x, y, z] = shellAt(p);
    label('rig', x + HOOKS[3][0], y + SHELL.roofTop + LIFT.hang * 0.6, z + HOOKS[3][2], hold(p, T.lift.reach[1], T.lift.over[1], 0.012));
  });
  return (
    <>
      <MobileCrane position={CRANE_AT} getHook={getHook} head={4.6} getTurn={() => 0} />
      <Truck getX={() => truckX(progress.value)} z={LANE} ry={Math.PI} />
    </>
  );
}

/* ---------- Scene ---------- */

/** On an upright screen the eye stands this much higher and nearer over what it looks at: the top of the picture, where the chapter's line is, is then slab and not what stands at the back of the yard. */
const UPRIGHT = { rise: 1.75, in: 0.8 };
const _eye: V3 = [0, 0, 0];

function Director({ progress, rig, compact }: Prog & { rig: Rig; compact: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const c = sampleCamera(CAM, progress.value);
    const up = compact && size.width < size.height;
    _eye[0] = c.look[0] + (c.pos[0] - c.look[0]) * (up ? UPRIGHT.in : 1);
    _eye[1] = c.look[1] + (c.pos[1] - c.look[1]) * (up ? UPRIGHT.rise : 1);
    _eye[2] = c.look[2] + (c.pos[2] - c.look[2]) * (up ? UPRIGHT.in : 1);
    aim(camera, _eye, c.look, size.width / size.height, 1.4, 0.7);
    rig.lightTarget.set(c.look[0], 0, c.look[2]);
    // Seen from above the horizon: there is no sky in the picture, and none is drawn.
    rig.sky = 0;
  });
  return null;
}

function Factory({ progress, place, rig, compact }: SceneProps & { rig: Rig }) {
  const label = useLabel(place);
  const all = useRef<Group>(null);
  // Most of this film is out of sight until its turn: all of it is on the GPU before the first scroll.
  useWarmAll(rig, all);
  return (
    <group ref={all}>
      <Director progress={progress} rig={rig} compact={compact} />
      <Yard progress={progress} />
      <Piers progress={progress} />
      <Shell progress={progress} label={label} />
      <Formwork progress={progress} />
      <Pump position={PUMP_AT} ry={PUMP_TURN} />
      <Dispatch progress={progress} label={label} />
    </group>
  );
}

export default function FactoryScene(props: SceneProps) {
  return (
    <Stage {...props} look="clear" ground="land" focus={[0.67, 0.56]} focusCompact={[0.5, 0.36]} shadowExtent={30} localClipping>
      {(rig) => <Factory {...props} rig={rig} />}
    </Stage>
  );
}
