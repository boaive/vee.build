import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ConeGeometry, MeshBasicMaterial, PlaneGeometry, type Group, type InstancedMesh } from 'three';
import { STOREY, doorFaces, doorSpot, floorDoors, layoutAddOns, mainDoor, streetEnds, type AddOnLayout, type Unit, type WallFace } from '../../build/model';
import type { AddOnId, ManualAddOn, Turn } from '../../data/build';
import { filmStacks, footprints, type DoorFace, type Placement } from '../../data/system';
import type { SceneProps } from '../../film/progress';
import { SETTLE, START, STATE, liftOf, locate } from '../../film/systemTimeline';
import { ease, hold, lerp, sampleCamera, stagger, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { UNIT_BOX, box, memo, merge, planCentre, pose, setInst } from '../kit/geometry';
import { AddOnParts, addOnMeshes } from '../kit/house';
import { instanced, mat, moduleMats } from '../kit/materials';
import { hookCleatGeometry, moduleGeometry } from '../kit/parts';

/**
 * How it works: two shells are drawn, lifted by the hooks at their corners
 * and set down again ("lift & shift"), then duplicated into six footprints
 * and stacked into two building types. One pool of modules morphs through
 * every configuration.
 * What makes each stack a building (galleries, the one staircase, roofs,
 * shades, rails) is laid out by the configurator's own rules.
 */

type Pose = [number, number, number, number] | null;
/** How a shell is drawn: the face its door is on, and `+` where its blank end to the street takes a window (model.ts, streetEnds). */
type Shell = DoorFace | `${DoorFace}+`;
interface Config {
  A: Pose[];
  B: Pose[];
  /** How each shell is drawn in this configuration, by slot. */
  doorA: Shell[];
  doorB: Shell[];
}
const shellGeometry = (type: 'A' | 'B', s: Shell) => moduleGeometry(type, s.replace('+', '') as DoorFace, s.endsWith('+'));

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

/**
 * A footprint is one home: the configurator's door rule (build/model.ts),
 * and of the doors it gives, the one main door (client, 2026-10-09). The
 * shells without it show windows to the street, not blank ends (client,
 * 2026-10-10).
 */
function doorsOf(list: Placement[]): Shell[] {
  const units: Unit[] = list.map((p, i) => ({ id: i + 1, t: p.t, x: p.x, z: p.z, y: p.y, r: (p.r ?? 0) as Turn }));
  const doors = mainDoor(units);
  const ends = streetEnds(units, doors);
  return units.map((u): Shell => `${doors.get(u.id) ?? 'front'}${ends.has(u.id) ? '+' : ''}`);
}

/** Rails round the open roofs; everything else in a stack is placed by hand (`dressing`). */
const RAILED: ReadonlySet<AddOnId> = new Set<AddOnId>(['handrail']);

/**
 * From the add-on list, for a stack: a sloped roof on each Shell A of the
 * top floor, and a shade over every street-side door that has no gallery
 * over it. `options` (the villa, "multiple roofing options", "net zero"):
 * the top shells take the roofs in turn, a sloped one with its solar array
 * and a flat one with the array on frames, beside the open terrace.
 */
function dressing(units: Unit[], doors: ReadonlyMap<number, DoorFace>, bare: AddOnLayout, options: boolean): ManualAddOn[] {
  const top = Math.max(...units.map((u) => u.y));
  const out: ManualAddOn[] = [];
  let roofs = 0;
  for (const u of units) {
    if (u.t === 'A' && u.y === top && top > 0) {
      if (!options || roofs++ % 2 === 0) out.push({ k: 'roof', u: u.id });
      if (options) out.push({ k: 'solar', u: u.id });
    }
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
  const out: Config[] = [{ A: fill<Pose>([[...PAIR_A, 0]], A_POOL, null), B: fill<Pose>([[...PAIR_B, 0]], B_POOL, null), doorA: fill<Shell>([], A_POOL, 'front'), doorB: fill<Shell>([], B_POOL, 'front') }];
  for (const f of footprints) {
    const present = f.slots.filter(Boolean) as Placement[];
    const [cx, cz] = planCentre(present).map(snap);
    const doors = doorsOf(present);
    const door = (p: Placement | null): Shell => (p ? doors[present.indexOf(p)] : 'front');
    out.push({
      A: fill<Pose>(
        f.slots.slice(0, 4).map((p) => (p ? pose(p, cx, cz) : null)),
        A_POOL,
        null,
      ),
      B: fill<Pose>([f.slots[4] ? pose(f.slots[4], cx, cz) : null], B_POOL, null),
      doorA: fill<Shell>(f.slots.slice(0, 4).map(door), A_POOL, 'front'),
      doorB: fill<Shell>([door(f.slots[4])], B_POOL, 'front'),
    });
  }
  for (const st of filmStacks) {
    const ground = st.modules.filter((m) => m.t === 'A' && m.y === 0);
    const [cx, cz] = planCentre(ground);
    const units: Unit[] = st.modules.map((p, i) => ({ id: i + 1, t: p.t, x: p.x, z: p.z, y: p.y, r: (p.r ?? 0) as Turn }));
    /*
     * The villa ("Net zero") has one main door a floor and a door of its own
     * onto the terrace (client, 2026-10-10); only its main doors have a
     * gallery and the staircase led to them. The mid-rise is as it was: a
     * door for each shell.
     */
    const villa = st.id === 'villa';
    const { doors, access } = villa ? floorDoors(units) : { doors: doorFaces(units), access: undefined };
    const ends = villa ? streetEnds(units, doors) : new Set<number>();
    const door = (p: Placement): Shell => {
      const id = st.modules.indexOf(p) + 1;
      return `${doors.get(id) ?? 'front'}${ends.has(id) ? '+' : ''}`;
    };
    const bare = layoutAddOns(units, RAILED, 0, [], 0, undefined, access);
    STACK_ADDS.push({ layout: layoutAddOns(units, RAILED, 0, dressing(units, doors, bare, villa), 0, undefined, access), at: [cx, cz] });
    const listA = st.modules.filter((m) => m.t === 'A');
    const listB = st.modules.filter((m) => m.t === 'B');
    out.push({
      A: fill<Pose>(listA.map((p) => pose(p, cx, cz)), A_POOL, null),
      B: fill<Pose>(listB.map((p) => pose(p, cx, cz)), B_POOL, null),
      doorA: fill<Shell>(listA.map(door), A_POOL, 'front'),
      doorB: fill<Shell>(listB.map(door), B_POOL, 'front'),
    });
  }
  return out;
})();

/** The ways each pool's shells are ever drawn: one instanced mesh for each. */
const FACES = {
  A: [...new Set(CONFIGS.flatMap((c) => c.doorA))],
  B: [...new Set(CONFIGS.flatMap((c) => c.doorB))],
};

/** One job per shell geometry and per stack's add-ons, for building them during idle time before the film mounts (film/prefetch.ts). */
export const prepare: (() => void)[] = [
  ...FACES.A.map((d) => () => void shellGeometry('A', d)),
  ...FACES.B.map((d) => () => void shellGeometry('B', d)),
  ...STACK_ADDS.map((a) => () => void addOnMeshes(a.layout)),
];

const CAM: CameraKey[] = [
  { p: 0, look: [0.4, 1.3, -1.2], pos: [14.5, 8.4, 27] },
  { p: 0.12, look: [0.4, 1.4, -1.2], pos: [13.5, 8.2, 25.5] },
  // Lift & shift: from the free end of Shell A, near enough to see the hooks, far enough to see it leave the ground.
  { p: 0.2, look: [-2.2, 2.3, -1.3], pos: [-16.2, 5.0, 12.6] },
  { p: 0.265, look: [-2.2, 2.4, -1.3], pos: [-15.6, 4.9, 12.2] },
  { p: 0.34, look: [0, 0.6, 0], pos: [17, 23, 25] },
  { p: 0.59, look: [0, 0.6, 0], pos: [20, 22, 23] },
  // The villa is seen from the side its terrace is on: the door onto the terrace is in the wall that faces that way
  // (client, 2026-10-10). Its staircase stands against the far flank; its foot and its landing show past the corner.
  { p: 0.72, look: [1, 2.6, 0], pos: [25.5, 14.5, 32] },
  { p: 0.8, look: [1, 2.8, 0], pos: [26.2, 14.7, 33.2] },
  // The mid-rise is seen from the other front corner, where its staircase stands. On the way across, square on to
  // the row, the camera stands back and high so the building keeps clear of the caption.
  { p: 0.9, look: [0.2, 5.6, 0], pos: [-4, 27, 58] },
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
    // Rise inside the drawn frame at the very start. Until then a shell is a speck, not a slab pressed flat on the
    // floor: flat, it lay in the plane of the floor's shadow and of the grid and flickered through them (developer,
    // 2026-10-10: "the bottom of the 2 cores is breaking until the block arises"). A speck is still drawn, so the
    // shells' shaders are compiled with the first frame.
    const birth = win(p, 0.075, 0.125, ease.out);
    const born = birth > 0.004;
    // Lift & shift: each finished shell goes up by its hooks and comes down again, before either is moved: Shell B
    // first, then Shell A (client, 2026-10-11). The one that is about to move and the one that stays alike.
    const lift = s === 1 ? liftOf(type, p) : 0;

    let moving = 0;
    for (let i = 0; i < n; i++) if ((from[i] || to[i]) && !same(from[i], to[i])) moving++;
    let k = 0;
    counts.fill(0);
    // Each shell is drawn by the mesh that carries its door on the right face; the door changes sides half-way through a move.
    const put = (door: Shell, x: number, y: number, z: number, ry: number, sx = 1, sy = sx, sz = sx) => {
      const v = faces.indexOf(door);
      const m = refs.current[v];
      if (m) setInst(m, counts[v]++, x, y, z, ry, sx, sy, sz);
    };

    for (let i = 0; i < n; i++) {
      const a = from[i];
      const b = to[i];
      if (!a && !b) continue;
      if (same(a, b) && a) {
        if (s === 1 && !born) put(doorFrom[i], a[0], a[1], a[2], a[3], 0.0001);
        else put(t >= 0.5 ? doorTo[i] : doorFrom[i], a[0], a[1] + lift, a[2], a[3], 1, s === 1 ? birth : 1, 1);
        continue;
      }
      const ti = stagger(t, k++, Math.max(1, moving), 0.6);
      if (a && b) {
        const e = ease.inOutCubic(ti);
        const hop = Math.sin(Math.PI * e) * 0.5;
        if (s === 1 && !born) put(doorFrom[i], a[0], a[1], a[2], a[3], 0.0001);
        else put(e >= 0.5 ? doorTo[i] : doorFrom[i], lerp(a[0], b[0], e), lerp(a[1], b[1], e) + hop + lift, lerp(a[2], b[2], e), lerp(a[3], b[3], e), 1, s === 1 ? birth : 1, 1);
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
          args={[shellGeometry(type, door), instanced(moduleMats()), n]}
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
/** Which shell each corner's hook is on: it goes up and comes down with that shell, never by itself. */
const CORNER_OF: ('A' | 'B')[] = SHELLS.flatMap((s) => Array<'A' | 'B'>(4).fill(s.id === 'a' ? 'A' : 'B'));
const STEEL = new Color('#2f3134');
const ACCENT = new Color('#d9431b');

function HookCleats({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<InstancedMesh>(null);
  const tint = useMemo(() => mat.steel.clone(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const v = hold(p, 0.14, 0.275, 0.03);
    CORNERS.forEach(([x, z, ry], i) => setInst(m, i, x, 3 + liftOf(CORNER_OF[i], p) + (1 - v) * 0.6, z, ry, Math.max(0.0001, v)));
    m.instanceMatrix.needsUpdate = true;
    tint.color.copy(STEEL).lerp(ACCENT, hold(p, 0.165, 0.265, 0.025));
  });
  return <instancedMesh ref={ref} args={[hookCleatGeometry(), tint, CORNERS.length]} castShadow frustumCulled={false} />;
}

/** An arrow pointing up, 0.8 m tall, its foot at the origin. */
function arrowGeometry() {
  return memo('lift-arrow', () => {
    const head = new ConeGeometry(0.1, 0.24, 14);
    head.translate(0, 0.68, 0);
    return merge([box(0.036, 0.56, 0.036, 0, 0.28, 0), head]);
  });
}

/**
 * Lift & shift: an arrow over each lifting hook (client, 2026-10-09: "an
 * arrow over the lifting hooks", in place of the call-out). The arrows go
 * up with the scroll and take the shells with them.
 */
function LiftArrows({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<InstancedMesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const p = progress.value;
    const v = hold(p, 0.168, 0.27, 0.02);
    m.visible = v > 0.001;
    if (!m.visible) return;
    // Over its own hook, and up and down with it.
    const y = 3.32 + win(p, 0.165, 0.27, ease.out) * 0.2;
    // The hook stands a little in from the corner, on the diagonal.
    CORNERS.forEach(([x, z, ry], i) => {
      const up = liftOf(CORNER_OF[i], p);
      setInst(m, i, x - Math.SQRT2 * 0.13 * Math.cos(ry + Math.PI / 4), y + up, z + Math.SQRT2 * 0.13 * Math.sin(ry + Math.PI / 4), 0, Math.max(0.0001, v));
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[arrowGeometry(), instanced(mat.accent), CORNERS.length]} frustumCulled={false} />;
}

/* ---------- Blueprint grid ---------- */

const GRID = { reach: 42, cell: 3 };

/**
 * The 3 m grid the shells stand on, drawn by one flat sheet whose shader
 * finds the lines: a hair's width on screen at any distance, as the line
 * segments it replaces were. Those cost 12 ms of a 19 ms frame on the test
 * laptop (found on 2026-10-09 by switching one thing off at a time, notes
 * F7): this film was the dearest on the page for its grid alone.
 */
function gridMaterial() {
  const m = new MeshBasicMaterial({ color: '#151617', transparent: true, opacity: 0.1, depthWrite: false });
  m.defines = { USE_UV: '' };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      `
  // Distance to the nearest grid line, in pixels: a line is one pixel wide wherever it is.
  vec2 gridAt = vUv * ${((GRID.reach * 2) / GRID.cell).toFixed(1)};
  vec2 gridPx = abs( fract( gridAt - 0.5 ) - 0.5 ) / max( fwidth( gridAt ), vec2( 1e-6 ) );
  diffuseColor.a *= 1.0 - min( min( gridPx.x, gridPx.y ), 1.0 );
  #include <alphatest_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'grid-3m-sheet';
  return m;
}

function Grid() {
  const geo = useMemo(
    () =>
      memo('grid-3m-sheet', () => {
        const g = new PlaneGeometry(GRID.reach * 2, GRID.reach * 2);
        g.rotateX(-Math.PI / 2);
        return g;
      }),
    [],
  );
  const material = useMemo(gridMaterial, []);
  useEffect(() => () => material.dispose(), [material]);
  // Drawn after the floor's shadow, always: the two are sheets a few millimetres apart, and sorted by distance they changed places.
  return <mesh geometry={geo} material={material} position-y={0.006} renderOrder={2} />;
}

/* ---------- Step 2.3: what makes each stack a building ---------- */

/** Boards on an open roof: [width, depth, x, y, z] about the stack's centre. */
const TERRACES: [number, number, number, number, number][][] = [[[5.9, 5.8, 3, 3.03, 0]], [[5.9, 5.8, 3, 12.03, 0]]];
const STACK_STATES = [STATE.villa, STATE.midrise];

function Extras({ progress }: Pick<SceneProps, 'progress'>) {
  const groups = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const p = progress.value;
    STACK_STATES.forEach((state, i) => {
      const g = groups.current[i];
      if (!g) return;
      // Each stack's add-ons come down as its last shell lands, and go as the next stack starts to move.
      const v = state === STATE.midrise ? win(p, SETTLE[state] - 0.02, SETTLE[state], ease.out) : hold(p, SETTLE[state] - 0.005, START[state + 1], 0.025);
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
      <HookCleats progress={progress} />
      <LiftArrows progress={progress} />
      <Extras progress={progress} />
    </>
  );
}

/** The studio's fog. On a compact layout the camera stands farther back for the band's shape (Stage, `frame`): the fog does too, or the mid-rise stood in it. */
const FOG: [number, number] = [60, 150];
const FOG_COMPACT: [number, number] = [95, 240];

export default function SystemScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioLight" focus={[0.66, 0.52]} focusCompact={[0.5, 0.36]} shadowExtent={34} fogRange={props.compact ? FOG_COMPACT : FOG}>
      {(rig) => <System {...props} rig={rig} />}
    </Stage>
  );
}
