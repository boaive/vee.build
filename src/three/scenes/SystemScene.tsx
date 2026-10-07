import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, type Group, type InstancedMesh } from 'three';
import { footprints, stacks, type Placement } from '../../data/system';
import type { SceneProps } from '../../film/progress';
import { SETTLE, START, STATE, locate } from '../../film/systemTimeline';
import { ease, hold, lerp, sampleCamera, stagger, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { UNIT_BOX, box, memo, mergeGroups, planCentre, pose, setInst } from '../kit/geometry';
import { instanced, mat, moduleMats } from '../kit/materials';
import { hookCleatGeometry, moduleGeometry, railGeometry } from '../kit/parts';

/**
 * How it works: two shells are drawn, shown to carry a hook & cleat at each
 * corner, then duplicated into six footprints and stacked into three
 * building types. One pool of modules morphs through every configuration.
 */

type Pose = [number, number, number, number] | null;
interface Config {
  A: Pose[];
  B: Pose[];
}

const A_POOL = 18;
const B_POOL = 5;
/** Everything sits on the 3 m grid, so the shells start one cell apart. */
const Z0 = -1.5;
const PAIR_A: [number, number, number] = [-3, 0, Z0];
const PAIR_B: [number, number, number] = [4.5, 0, Z0];
const snap = (v: number) => Math.round(v / 3) * 3;
const same = (a: Pose, b: Pose) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

function fill(list: Pose[], n: number): Pose[] {
  return Array.from({ length: n }, (_, i) => list[i] ?? null);
}

const CONFIGS: Config[] = (() => {
  const out: Config[] = [{ A: fill([[...PAIR_A, 0]], A_POOL), B: fill([[...PAIR_B, 0]], B_POOL) }];
  for (const f of footprints) {
    const present = f.slots.filter(Boolean) as Placement[];
    const [cx, cz] = planCentre(present).map(snap);
    out.push({
      A: fill(
        f.slots.slice(0, 4).map((p) => (p ? pose(p, cx, cz) : null)),
        A_POOL,
      ),
      B: fill([f.slots[4] ? pose(f.slots[4], cx, cz) : null], B_POOL),
    });
  }
  for (const st of stacks) {
    const ground = st.modules.filter((m) => m.t === 'A' && m.y === 0);
    const [cx, cz] = planCentre(ground);
    out.push({
      A: fill(st.modules.filter((m) => m.t === 'A').map((p) => pose(p, cx, cz)), A_POOL),
      B: fill(st.modules.filter((m) => m.t === 'B').map((p) => pose(p, cx, cz)), B_POOL),
    });
  }
  return out;
})();

const CAM: CameraKey[] = [
  { p: 0, look: [0.4, 1.3, -1.2], pos: [14.5, 8.4, 27] },
  { p: 0.12, look: [0.4, 1.4, -1.2], pos: [13.5, 8.2, 25.5] },
  { p: 0.2, look: [-0.4, 2.7, -0.35], pos: [3.1, 4.5, 5.4] },
  { p: 0.265, look: [-0.4, 2.7, -0.35], pos: [3.5, 4.4, 5.1] },
  { p: 0.34, look: [0, 0.6, 0], pos: [17, 23, 25] },
  { p: 0.59, look: [0, 0.6, 0], pos: [20, 22, 23] },
  { p: 0.7, look: [0.5, 2.6, 0], pos: [24, 15, 33] },
  { p: 0.83, look: [1.5, 3.4, 0], pos: [27, 15, 37] },
  { p: 1, look: [1.5, 7.2, 0], pos: [36, 18, 52] },
];

/* ---------- Module pool ---------- */

function Pool({ type, progress }: { type: 'A' | 'B'; progress: SceneProps['progress'] }) {
  const ref = useRef<InstancedMesh>(null);
  const n = type === 'A' ? A_POOL : B_POOL;

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const { s, t } = locate(p);
    const from = CONFIGS[s - 1][type];
    const to = CONFIGS[s][type];
    // Rise inside the drawn frame at the very start.
    const birth = win(p, 0.075, 0.125, ease.out);

    let moving = 0;
    for (let i = 0; i < n; i++) if ((from[i] || to[i]) && !same(from[i], to[i])) moving++;
    let k = 0;

    for (let i = 0; i < n; i++) {
      const a = from[i];
      const b = to[i];
      if (!a && !b) {
        setInst(m, i, 0, -50, 0, 0, 0.0001);
        continue;
      }
      if (same(a, b) && a) {
        setInst(m, i, a[0], a[1], a[2], a[3], 1, s === 1 ? Math.max(0.0001, birth) : 1, 1);
        continue;
      }
      const ti = stagger(t, k++, Math.max(1, moving), 0.6);
      if (a && b) {
        const e = ease.inOutCubic(ti);
        const hop = Math.sin(Math.PI * e) * 0.5;
        setInst(m, i, lerp(a[0], b[0], e), lerp(a[1], b[1], e) + hop, lerp(a[2], b[2], e), lerp(a[3], b[3], e), 1, s === 1 ? Math.max(0.0001, birth) : 1, 1);
      } else if (b) {
        const sc = ti <= 0 ? 0.0001 : Math.min(1, ti * 7);
        setInst(m, i, b[0], b[1] + (1 - ease.outQuart(ti)) * 9, b[2], b[3], sc);
      } else if (a) {
        const e = ease.in(ti);
        setInst(m, i, a[0], a[1] + e * 9, a[2], a[3], Math.max(0.0001, 1 - e));
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[moduleGeometry(type), instanced(moduleMats()), n]} castShadow receiveShadow frustumCulled={false} />;
}

/* ---------- Step 2.1: frames, dimensions, hook & cleat ---------- */

const SHELLS = [
  { at: PAIR_A, L: 6, id: 'a' },
  { at: PAIR_B, L: 3, id: 'b' },
];

/** The 12 edges of a box as [centre, axis, length], bottom ring first. */
function edges(cx: number, L: number): [number, number, number, 0 | 1 | 2, number][] {
  const hx = L / 2;
  const out: [number, number, number, 0 | 1 | 2, number][] = [];
  for (const y of [0.05, 2.95]) {
    if (y > 1) for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push([cx + sx * hx, 1.5, Z0 + sz * 1.5, 1, 3]);
    for (const sz of [-1, 1]) out.push([cx, y, Z0 + sz * 1.5, 0, L]);
    for (const sx of [-1, 1]) out.push([cx + sx * hx, y, Z0, 2, 3]);
  }
  return out;
}
const EDGES = SHELLS.flatMap((s) => edges(s.at[0], s.L));

function Frames({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<InstancedMesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const draw = win(p, -0.035, 0.07, ease.linear);
    const gone = win(p, 0.125, 0.155, ease.inOut);
    const T = 0.055 * (1 - gone);
    EDGES.forEach(([x, y, z, axis, len], i) => {
      const t = ease.out(stagger(draw, i % 12, 12, 0.72));
      const l = Math.max(0.0001, len * t);
      const w = Math.max(0.0001, T);
      setInst(m, i, x, y, z, 0, axis === 0 ? l : w, axis === 1 ? l : w, axis === 2 ? l : w);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[UNIT_BOX, instanced(mat.steel), EDGES.length]} frustumCulled={false} />;
}

/** Dimension lines: [x, y, z, axis, length, label id]. */
const DIMS: [number, number, number, 0 | 1 | 2, number, string][] = SHELLS.flatMap((s) => {
  const cx = s.at[0];
  const hx = s.L / 2;
  return [
    [cx, 0.02, Z0 + 2.3, 0, s.L, `dim-${s.id}-l`],
    [cx + hx + 0.8, 0.02, Z0, 2, 3, `dim-${s.id}-d`],
    [cx - hx - 0.45, 1.5, Z0 + 1.95, 1, 3, `dim-${s.id}-h`],
  ] as [number, number, number, 0 | 1 | 2, number, string][];
});

function Dimensions({ progress, label }: Pick<SceneProps, 'progress'> & { label: ReturnType<typeof useLabel> }) {
  const ref = useRef<InstancedMesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const v = hold(p, 0.055, 0.13, 0.025);
    const T = 0.022;
    DIMS.forEach(([x, y, z, axis, len, id], i) => {
      const l = Math.max(0.0001, len * v);
      setInst(m, i * 3, x, y, z, 0, axis === 0 ? l : T, axis === 1 ? l : T, axis === 2 ? l : T);
      for (const side of [-1, 1]) {
        const o = (side * len * v) / 2;
        const tick = v > 0.02 ? 0.34 : 0.0001;
        setInst(
          m,
          i * 3 + (side < 0 ? 1 : 2),
          x + (axis === 0 ? o : 0),
          y + (axis === 1 ? o : 0),
          z + (axis === 2 ? o : 0),
          0,
          axis === 2 ? tick : T,
          T,
          axis === 2 ? T : tick,
        );
      }
      label(id, x, y, z, v > 0.9 ? (v - 0.9) * 10 : 0);
    });
    SHELLS.forEach((s) => label(`name-${s.id}`, s.at[0], 3.9, Z0, hold(p, 0.02, 0.13, 0.02)));
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[UNIT_BOX, instanced(mat.accent), DIMS.length * 3]} frustumCulled={false} />;
}

const CORNERS = SHELLS.flatMap((s) => {
  const hx = s.L / 2;
  return [
    [s.at[0] + hx, Z0 + 1.5, 0],
    [s.at[0] - hx, Z0 + 1.5, -Math.PI / 2],
    [s.at[0] - hx, Z0 - 1.5, Math.PI],
    [s.at[0] + hx, Z0 - 1.5, Math.PI / 2],
  ];
});
const STEEL = new Color('#2f3134');
const ACCENT = new Color('#d9431b');

function HookCleats({ progress, label }: Pick<SceneProps, 'progress'> & { label: ReturnType<typeof useLabel> }) {
  const ref = useRef<InstancedMesh>(null);
  const tint = useMemo(() => mat.steel.clone(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const v = hold(p, 0.14, 0.275, 0.03);
    CORNERS.forEach(([x, z, ry], i) => setInst(m, i, x, 3 + (1 - v) * 0.6, z, ry, Math.max(0.0001, v)));
    m.instanceMatrix.needsUpdate = true;
    tint.color.copy(STEEL).lerp(ACCENT, hold(p, 0.165, 0.265, 0.025));
    label('hook-cleat', CORNERS[0][0] - 0.13, 3.19, CORNERS[0][1] - 0.13, hold(p, 0.185, 0.255, 0.015));
  });
  return <instancedMesh ref={ref} args={[hookCleatGeometry(), tint, CORNERS.length]} castShadow frustumCulled={false} />;
}

/* ---------- Blueprint grid ---------- */

function Grid() {
  const geo = useMemo(
    () =>
      memo('grid-3m', () => {
        const pts: number[] = [];
        const R = 42;
        for (let i = -R; i <= R; i += 3) pts.push(-R, 0, i, R, 0, i, i, 0, -R, i, 0, R);
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pts, 3));
        return g;
      }),
    [],
  );
  return (
    <lineSegments geometry={geo} position-y={0.006}>
      <lineBasicMaterial color="#151617" transparent opacity={0.1} />
    </lineSegments>
  );
}

/* ---------- Step 2.3: what makes each stack a building ---------- */

function balconyGeometry() {
  return memo('balcony', () => {
    const rail = railGeometry('balcony-rail', [
      [-1.25, 3],
      [-1.25, 4.3],
      [1.25, 4.3],
      [1.25, 3],
    ]).clone();
    rail.translate(0, 0.07, 0);
    return mergeGroups([[box(2.6, 0.14, 1.36, 0, 0, 3.65)], [rail]]);
  });
}
const BALCONIES: [number, number][] = [1, 2, 3].flatMap((lvl) => [0, 1, 2, 3].map((bay) => [-4.5 + bay * 3, lvl * 3] as [number, number]));

function Extras({ progress }: Pick<SceneProps, 'progress'>) {
  const villa = useRef<Group>(null);
  const apartment = useRef<Group>(null);
  const highrise = useRef<Group>(null);
  const balconies = useRef<InstancedMesh>(null);
  const terrace = railGeometry('terrace-6', [
    [0, 2.9],
    [5.9, 2.9],
    [5.9, -2.9],
    [0, -2.9],
  ]);
  const roofRail = railGeometry('terrace-12', [
    [5.9, 2.9],
    [-5.9, 2.9],
    [-5.9, -2.9],
    [5.9, -2.9],
  ]);

  useFrame(() => {
    const p = progress.value;
    const show = (g: Group | null, v: number) => {
      if (!g) return;
      g.visible = v > 0.001;
      g.position.y = (1 - v) * 2.5;
      g.scale.setScalar(Math.max(0.0001, Math.min(1, v * 3)));
    };
    show(villa.current, hold(p, SETTLE[STATE.villa] - 0.005, START[STATE.apartment], 0.025));
    show(apartment.current, hold(p, SETTLE[STATE.apartment] - 0.005, START[STATE.highrise], 0.025));
    const hr = win(p, SETTLE[STATE.highrise] - 0.035, SETTLE[STATE.highrise], ease.linear);
    show(highrise.current, win(hr, 0.6, 1, ease.out));
    const m = balconies.current;
    if (m) {
      BALCONIES.forEach(([x, y], i) => {
        const t = ease.out(stagger(hr, i, BALCONIES.length, 0.8));
        setInst(m, i, x, y + 0.02, -1.4 * (1 - t), 0, t <= 0 ? 0.0001 : 1);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={villa}>
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[7.4, 0.16, 6.9]} position={[-2.5, 6.1, 0]} castShadow receiveShadow />
        <mesh geometry={terrace} material={mat.steel} position-y={3} castShadow />
        <mesh geometry={UNIT_BOX} material={mat.deck} scale={[5.9, 0.05, 5.8]} position={[3, 3.03, 0]} receiveShadow />
      </group>
      <group ref={apartment}>
        <mesh geometry={roofRail} material={mat.steel} position-y={6} castShadow />
        <mesh geometry={UNIT_BOX} material={mat.deck} scale={[11.8, 0.05, 5.8]} position={[0, 6.03, 0]} receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[3.4, 0.14, 1.5]} position={[7.5, 2.7, 3.7]} castShadow />
      </group>
      <group ref={highrise}>
        <mesh geometry={terrace} material={mat.steel} position-y={12} castShadow />
        <mesh geometry={UNIT_BOX} material={mat.deck} scale={[5.9, 0.05, 5.8]} position={[3, 12.03, 0]} receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[7.4, 0.16, 6.9]} position={[-2.5, 15.1, 0]} castShadow receiveShadow />
        <mesh geometry={UNIT_BOX} material={mat.trim} scale={[3.4, 0.14, 1.5]} position={[7.5, 2.7, 3.7]} castShadow />
      </group>
      <instancedMesh ref={balconies} args={[balconyGeometry(), [instanced(mat.concrete), instanced(mat.steel)], BALCONIES.length]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}

/* ---------- Scene ---------- */

function Director({ progress, rig }: Pick<SceneProps, 'progress'> & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const c = sampleCamera(CAM, progress.value);
    aim(camera, c.pos, c.look, size.width / size.height, 1.45, 0.55);
    rig.lightTarget.set(c.look[0], 0, c.look[2]);
  });
  return null;
}

function System({ progress, place, rig }: SceneProps & { rig: Rig }) {
  const label = useLabel(place);
  return (
    <>
      <Director progress={progress} rig={rig} />
      <Grid />
      <Frames progress={progress} />
      <Pool type="A" progress={progress} />
      <Pool type="B" progress={progress} />
      <Dimensions progress={progress} label={label} />
      <HookCleats progress={progress} label={label} />
      <Extras progress={progress} />
    </>
  );
}

export default function SystemScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioLight" focus={[0.66, 0.52]} focusCompact={[0.5, 0.36]} shadowExtent={34} fogRange={[60, 150]}>
      {(rig) => <System {...props} rig={rig} />}
    </Stage>
  );
}
