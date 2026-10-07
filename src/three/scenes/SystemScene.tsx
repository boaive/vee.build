import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, type Group, type InstancedMesh } from 'three';
import { STOREY, doorFaces, doorSpot, layoutAddOns, type AddOnLayout, type Unit, type WallFace } from '../../build/model';
import type { AddOnId, ManualAddOn, Turn } from '../../data/build';
import { footprints, stacks, type DoorFace, type Placement } from '../../data/system';
import type { SceneProps } from '../../film/progress';
import { SETTLE, START, STATE, locate } from '../../film/systemTimeline';
import { ease, hold, lerp, sampleCamera, stagger, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { UNIT_BOX, memo, planCentre, pose, setInst } from '../kit/geometry';
import { AddOnParts, addOnMeshes } from '../kit/house';
import { instanced, mat, moduleMats } from '../kit/materials';
import { hookCleatGeometry, moduleGeometry } from '../kit/parts';

/**
 * How it works: two shells are drawn, shown to carry a hook & cleat at each
 * corner, then duplicated into six footprints and stacked into three
 * building types. One pool of modules morphs through every configuration.
 * What makes each stack a building (galleries, the one staircase, roofs,
 * shades, rails) is laid out by the configurator's own rules.
 */

type Pose = [number, number, number, number] | null;
interface Config {
  A: Pose[];
  B: Pose[];
  /** The face each shell's door is on in this configuration, by slot. */
  doorA: DoorFace[];
  doorB: DoorFace[];
}

const A_POOL = 18;
const B_POOL = 5;
/** Everything sits on the 3 m grid, so the shells start one cell apart. */
const Z0 = -1.5;
const PAIR_A: [number, number, number] = [-3, 0, Z0];
const PAIR_B: [number, number, number] = [4.5, 0, Z0];
const snap = (v: number) => Math.round(v / 3) * 3;
const same = (a: Pose, b: Pose) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

function fill<T>(list: T[], n: number, empty: T): T[] {
  return Array.from({ length: n }, (_, i) => list[i] ?? empty);
}

/** The same door rule as the configurator (build/model.ts), on a list of placements. */
function doorsOf(list: Placement[]): DoorFace[] {
  const units: Unit[] = list.map((p, i) => ({ id: i + 1, t: p.t, x: p.x, z: p.z, y: p.y, r: (p.r ?? 0) as Turn }));
  const doors = doorFaces(units);
  return units.map((u) => doors.get(u.id) ?? 'front');
}

/** Rails round the open roofs; everything else in a stack is placed by hand (`dressing`). */
const RAILED: ReadonlySet<AddOnId> = new Set<AddOnId>(['handrail']);

/**
 * From the add-on list, for a stack: a sloped roof on each Shell A of the
 * top floor, and a shade over every street-side door that has no gallery
 * over it.
 */
function dressing(units: Unit[], doors: ReadonlyMap<number, DoorFace>, bare: AddOnLayout): ManualAddOn[] {
  const top = Math.max(...units.map((u) => u.y));
  const out: ManualAddOn[] = [];
  for (const u of units) {
    if (u.t === 'A' && u.y === top && top > 0) out.push({ k: 'roof', u: u.id });
    const f = doors.get(u.id);
    if (!f || f === 'none') continue;
    const d = doorSpot(u, f as WallFace, 0);
    if (d.side !== 0) continue;
    const above = (u.y + 1) * STOREY + 0.12;
    const covered = bare.galleries.some((g) => Math.abs(g.y - above) < 0.01 && Math.abs(g.z0 - d.z) < 0.01 && d.x > g.x0 && d.x < g.x1);
    if (!covered) out.push({ k: 'shade', u: u.id, s: 0 });
  }
  return out;
}

/** The add-ons of each stack, and the plan centre they are drawn about. */
const STACK_ADDS: { layout: AddOnLayout; at: [number, number] }[] = [];

const CONFIGS: Config[] = (() => {
  const out: Config[] = [{ A: fill<Pose>([[...PAIR_A, 0]], A_POOL, null), B: fill<Pose>([[...PAIR_B, 0]], B_POOL, null), doorA: fill<DoorFace>([], A_POOL, 'front'), doorB: fill<DoorFace>([], B_POOL, 'front') }];
  for (const f of footprints) {
    const present = f.slots.filter(Boolean) as Placement[];
    const [cx, cz] = planCentre(present).map(snap);
    const doors = doorsOf(present);
    const door = (p: Placement | null): DoorFace => (p ? doors[present.indexOf(p)] : 'front');
    out.push({
      A: fill<Pose>(
        f.slots.slice(0, 4).map((p) => (p ? pose(p, cx, cz) : null)),
        A_POOL,
        null,
      ),
      B: fill<Pose>([f.slots[4] ? pose(f.slots[4], cx, cz) : null], B_POOL, null),
      doorA: fill<DoorFace>(f.slots.slice(0, 4).map(door), A_POOL, 'front'),
      doorB: fill<DoorFace>([door(f.slots[4])], B_POOL, 'front'),
    });
  }
  for (const st of stacks) {
    const ground = st.modules.filter((m) => m.t === 'A' && m.y === 0);
    const [cx, cz] = planCentre(ground);
    const units: Unit[] = st.modules.map((p, i) => ({ id: i + 1, t: p.t, x: p.x, z: p.z, y: p.y, r: (p.r ?? 0) as Turn }));
    const doors = doorFaces(units);
    const door = (p: Placement): DoorFace => doors.get(st.modules.indexOf(p) + 1) ?? 'front';
    const bare = layoutAddOns(units, RAILED, 0, [], 0);
    STACK_ADDS.push({ layout: layoutAddOns(units, RAILED, 0, dressing(units, doors, bare), 0), at: [cx, cz] });
    const listA = st.modules.filter((m) => m.t === 'A');
    const listB = st.modules.filter((m) => m.t === 'B');
    out.push({
      A: fill<Pose>(listA.map((p) => pose(p, cx, cz)), A_POOL, null),
      B: fill<Pose>(listB.map((p) => pose(p, cx, cz)), B_POOL, null),
      doorA: fill<DoorFace>(listA.map(door), A_POOL, 'front'),
      doorB: fill<DoorFace>(listB.map(door), B_POOL, 'front'),
    });
  }
  return out;
})();

/** The door faces each pool ever shows: one instanced mesh for each. */
const FACES = {
  A: [...new Set(CONFIGS.flatMap((c) => c.doorA))],
  B: [...new Set(CONFIGS.flatMap((c) => c.doorB))],
};

/** One job per shell geometry and per stack's add-ons, for building them during idle time before the film mounts (film/prefetch.ts). */
export const prepare: (() => void)[] = [
  ...FACES.A.map((d) => () => void moduleGeometry('A', d)),
  ...FACES.B.map((d) => () => void moduleGeometry('B', d)),
  ...STACK_ADDS.map((a) => () => void addOnMeshes(a.layout)),
];

const CAM: CameraKey[] = [
  { p: 0, look: [0.4, 1.3, -1.2], pos: [14.5, 8.4, 27] },
  { p: 0.12, look: [0.4, 1.4, -1.2], pos: [13.5, 8.2, 25.5] },
  { p: 0.2, look: [-4.5, 2.75, -0.2], pos: [-6.7, 4.6, 6.5] },
  { p: 0.265, look: [-4.5, 2.75, -0.2], pos: [-6.3, 4.5, 6.2] },
  { p: 0.34, look: [0, 0.6, 0], pos: [17, 23, 25] },
  { p: 0.59, look: [0, 0.6, 0], pos: [20, 22, 23] },
  // The stacks are seen from the other front corner: their staircase stands against the flank on that side.
  // On the way across, square on to the row, the camera stands back and high so the building keeps clear of the caption.
  { p: 0.648, look: [-0.5, 1.6, 0], pos: [-3, 25, 40] },
  { p: 0.7, look: [-1, 2.6, 0], pos: [-24.5, 15, 33] },
  { p: 0.83, look: [0.5, 3.4, 0], pos: [-26.3, 15.6, 38.9] },
  { p: 1, look: [0.5, 7.2, 0], pos: [-34, 18, 52] },
];

/* ---------- Module pool ---------- */

function Pool({ type, progress }: { type: 'A' | 'B'; progress: SceneProps['progress'] }) {
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const n = type === 'A' ? A_POOL : B_POOL;
  const faces = FACES[type];
  const counts = useMemo(() => faces.map(() => 0), [faces]);
  const doorKey = type === 'A' ? 'doorA' : 'doorB';

  useFrame(() => {
    const p = progress.value;
    const { s, t } = locate(p);
    const from = CONFIGS[s - 1][type];
    const to = CONFIGS[s][type];
    const doorFrom = CONFIGS[s - 1][doorKey];
    const doorTo = CONFIGS[s][doorKey];
    // Rise inside the drawn frame at the very start.
    const birth = win(p, 0.075, 0.125, ease.out);

    let moving = 0;
    for (let i = 0; i < n; i++) if ((from[i] || to[i]) && !same(from[i], to[i])) moving++;
    let k = 0;
    counts.fill(0);
    // Each shell is drawn by the mesh that carries its door on the right face; the door changes sides half-way through a move.
    const put = (door: DoorFace, x: number, y: number, z: number, ry: number, sx = 1, sy = sx, sz = sx) => {
      const v = faces.indexOf(door);
      const m = refs.current[v];
      if (m) setInst(m, counts[v]++, x, y, z, ry, sx, sy, sz);
    };

    for (let i = 0; i < n; i++) {
      const a = from[i];
      const b = to[i];
      if (!a && !b) continue;
      if (same(a, b) && a) {
        put(t >= 0.5 ? doorTo[i] : doorFrom[i], a[0], a[1], a[2], a[3], 1, s === 1 ? Math.max(0.0001, birth) : 1, 1);
        continue;
      }
      const ti = stagger(t, k++, Math.max(1, moving), 0.6);
      if (a && b) {
        const e = ease.inOutCubic(ti);
        const hop = Math.sin(Math.PI * e) * 0.5;
        put(e >= 0.5 ? doorTo[i] : doorFrom[i], lerp(a[0], b[0], e), lerp(a[1], b[1], e) + hop, lerp(a[2], b[2], e), lerp(a[3], b[3], e), 1, s === 1 ? Math.max(0.0001, birth) : 1, 1);
      } else if (b) {
        const sc = ti <= 0 ? 0.0001 : Math.min(1, ti * 7);
        put(doorTo[i], b[0], b[1] + (1 - ease.outQuart(ti)) * 9, b[2], b[3], sc);
      } else if (a) {
        const e = ease.in(ti);
        put(doorFrom[i], a[0], a[1] + e * 9, a[2], a[3], Math.max(0.0001, 1 - e));
      }
    }
    faces.forEach((_, v) => {
      const m = refs.current[v];
      if (!m) return;
      m.count = counts[v];
      m.visible = counts[v] > 0;
      m.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {faces.map((door, v) => (
        <instancedMesh
          key={door}
          ref={(m) => {
            refs.current[v] = m;
          }}
          args={[moduleGeometry(type, door), instanced(moduleMats()), n]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
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
    label('hook-cleat', CORNERS[1][0] + 0.13, 3.19, CORNERS[1][1] - 0.13, hold(p, 0.185, 0.255, 0.015));
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

/** Boards on an open roof: [width, depth, x, y, z] about the stack's centre. */
const TERRACES: [number, number, number, number, number][][] = [[[5.9, 5.8, 3, 3.03, 0]], [[11.8, 5.8, 0, 6.03, 0]], [[5.9, 5.8, 3, 12.03, 0]]];
const STACK_STATES = [STATE.villa, STATE.apartment, STATE.highrise];

function Extras({ progress }: Pick<SceneProps, 'progress'>) {
  const groups = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const p = progress.value;
    STACK_STATES.forEach((state, i) => {
      const g = groups.current[i];
      if (!g) return;
      // Each stack's add-ons come down as its last shell lands, and go as the next stack starts to move.
      const v = state === STATE.highrise ? win(p, SETTLE[state] - 0.02, SETTLE[state], ease.out) : hold(p, SETTLE[state] - 0.005, START[state + 1], 0.025);
      g.visible = v > 0.001;
      g.position.y = (1 - v) * 2.5;
      g.scale.setScalar(Math.max(0.0001, Math.min(1, v * 3)));
    });
  });

  return (
    <>
      {STACK_ADDS.map((a, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          <group position={[-a.at[0], 0, -a.at[1]]}>
            <AddOnParts layout={a.layout} deck={mat.deck} trim={mat.trim} />
          </group>
          {TERRACES[i].map(([w, d, x, y, z], k) => (
            <mesh key={k} geometry={UNIT_BOX} material={mat.deck} scale={[w, 0.05, d]} position={[x, y, z]} receiveShadow />
          ))}
        </group>
      ))}
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
