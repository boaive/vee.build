/**
 * The prefab building (plan and the developer's words in prefabPlan.ts): a
 * G+2 block of storey-high precast wall panels with their openings cast in
 * and their doors and windows fitted, floor slabs, galleries on precast
 * columns, one outer staircase, a deck and steps at the front, its joints
 * showing.
 *
 * Its colours (developer, 2026-11-08: "polish and add some clrs to it", with
 * the earlier institutional block's white panels as the reference): warm
 * white panels on a frame of darker precast grey, so that each panel reads
 * against the frame; clay doors; charcoal window frames, rails and
 * stair; glass with a blue tint (`FINISH`).
 *
 * `getA`, 0 to 1, is the illustration of its going up, a few turns of the
 * wheel in the hero's third banner (developer, 2026-11-08: "we don't have
 * more scrolling animation, keep it simple ... only one is fixed by crane,
 * all others are fitted by itself. parallelly, with some delay for few
 * panels not all"). The frame, its slabs and its roof stand from the start.
 * The wall panels come in together and close on it, a few of them a little
 * after the rest (`LATE`); one alone, the middle of the top floor's front,
 * is brought by the mobile crane, lowered in front of the gallery and drawn
 * in (`crane`; without it that one comes in as the others do). Then the
 * staircase, the deck and steps and the rails. At 1 it stands whole, as on
 * the opening card and the FAB page, with no crane.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, Path, Shape, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Material, type Mesh } from 'three';
import { clamp01, ease, win } from '../../film/timeline';
import { box, memo, merge, mergeGroups, setInst } from './geometry';
import { stairGeometryOf } from './house';
import type { Look } from './looks';
import { MobileCrane, PANEL_RIG } from './machines';
import { instanced, kit, litGlass, mat, precastMat, tintedGlass, trimMat } from './materials';
import { railGeometry } from './parts';
import { BACK_OPENINGS, END_OPENINGS, FRONT_OPENINGS, PREFAB, PREFAB_ROOF, prefabLength, prefabStair, prefabStepsX, type Opening } from './prefabPlan';
import { useRefined } from './refined';
import { boxUV } from './textures';

const P = PREFAB;
const H = P.storey - P.joint;
const T = P.wall;
const FRONT_Z = P.depth / 2;
const GAL_Z = FRONT_Z + P.gallery;

/**
 * The building's colours. CONFIRM (notes V12): ours, after the developer's
 * reference; until 2026-11-08 it was raw precast grey throughout.
 */
const FINISH = {
  /** The wall panels: precast, warm white. */
  panel: '#f3eee4',
  /** The frame: columns, slabs, roof, parapet, plinth, deck and steps. */
  frame: '#9d9890',
  /** Door leaves: a soft clay (the terracotta first tried was too strong against the panels on the opening card; developer, 2026-11-08). */
  door: '#c49a7e',
  /** Window and door frames. */
  joinery: '#2e3135',
  /** Glass by day. */
  glass: '#5f8aa6',
} as const;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** What a panel is made of, one material group each, in this order where it has them. */
type Part = 'panel' | 'joinery' | 'glass' | 'door';

/**
 * A storey-high panel `len` long with its openings cast in and what the
 * factory fits into them: frames, glass, door leaves, and a precast sill
 * under each window. Origin at the foot of its middle, outer face towards
 * +z, UVs in metres. The doors and windows travel with their panel: a
 * panel comes to site finished, and the building is never seen through.
 */
function panelGeometry(key: string, len: number, height: number, openings: readonly Opening[]): { geometry: BufferGeometry; parts: Part[] } {
  const parts: Part[] = openings.some((o) => o.door) ? ['panel', 'joinery', 'glass', 'door'] : ['panel', 'joinery', 'glass'];
  const geometry = memo(`prefab-panel-${key}`, () => {
    const s = new Shape();
    s.moveTo(-len / 2, 0);
    s.lineTo(len / 2, 0);
    s.lineTo(len / 2, height);
    s.lineTo(-len / 2, height);
    s.closePath();
    for (const o of openings) {
      const h = new Path();
      h.moveTo(o.x - o.w / 2, o.sill);
      h.lineTo(o.x - o.w / 2, o.sill + o.h);
      h.lineTo(o.x + o.w / 2, o.sill + o.h);
      h.lineTo(o.x + o.w / 2, o.sill);
      h.closePath();
      s.holes.push(h);
    }
    const wall = new ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 1 });
    wall.translate(0, 0, -T / 2);
    const lists: Record<Part, BufferGeometry[]> = { panel: [wall], joinery: [], glass: [], door: [] };
    const f = 0.06;
    const z = 0.02;
    for (const o of openings) {
      const y0 = o.sill;
      const y1 = o.sill + o.h;
      lists.joinery.push(box(o.w, f, 0.09, o.x, y1 - f / 2, z));
      lists.joinery.push(box(f, o.h, 0.09, o.x - o.w / 2 + f / 2, (y0 + y1) / 2, z));
      lists.joinery.push(box(f, o.h, 0.09, o.x + o.w / 2 - f / 2, (y0 + y1) / 2, z));
      if (o.door) {
        // A painted leaf with a narrow vision panel, set in the reveal.
        const lw = o.w - 2 * f;
        const lh = o.h - f;
        lists.door.push(box(lw, lh, 0.05, o.x, y0 + lh / 2, z - 0.01));
        lists.glass.push(box(lw * 0.36, lh * 0.36, 0.02, o.x, y0 + lh * 0.7, z + 0.02));
      } else {
        lists.joinery.push(box(o.w, f, 0.09, o.x, y0 + f / 2, z));
        lists.joinery.push(box(f * 0.8, o.h - 2 * f, 0.08, o.x, (y0 + y1) / 2, z));
        lists.glass.push(box(o.w - 2 * f, o.h - 2 * f, 0.02, o.x, (y0 + y1) / 2, z - 0.01));
        // The sill: cast on, standing a little proud of the face, a line of shadow under each window.
        const sill = box(o.w + 0.16, 0.07, 0.15, o.x, y0 - 0.035, T / 2 - 0.01);
        boxUV(sill, 1);
        lists.panel.push(sill);
      }
    }
    return mergeGroups(parts.map((p) => lists[p]));
  });
  return { geometry, parts };
}

/** One wall panel's place: its kind, where its foot's middle stands, which way its face looks, and its floor. */
interface Spot {
  kind: Kind;
  x: number;
  y: number;
  z: number;
  ry: number;
  floor: number;
}

interface Layout {
  L: number;
  spots: Spot[];
  /** The gallery's columns along its edge, on plan (x). */
  columns: number[];
}

const layouts = new Map<number, Layout>();
function layoutOf(bays: number): Layout {
  let l = layouts.get(bays);
  if (l) return l;
  const L = prefabLength(bays);
  const spots: Spot[] = [];
  for (let f = 0; f < P.floors; f++) {
    const y = P.plinth + f * P.storey;
    const top = f === P.floors - 1;
    for (let i = 0; i < bays; i++) spots.push({ kind: top ? 'backTop' : 'back', x: -L / 2 + P.panel / 2 + i * P.panel, y, z: -FRONT_Z + T / 2, ry: Math.PI, floor: f });
    for (const s of [-1, 1]) spots.push({ kind: top ? 'endTop' : 'end', x: s * (L / 2 - T / 2), y, z: 0, ry: (s * Math.PI) / 2, floor: f });
    for (let i = 0; i < bays; i++) spots.push({ kind: 'front', x: -L / 2 + P.panel / 2 + i * P.panel, y, z: FRONT_Z - T / 2, ry: 0, floor: f });
  }
  // One column at each panel joint and at each end: a bay of the gallery is a panel long, and a front panel comes in between two.
  const columns: number[] = [];
  for (let i = 0; i <= bays; i++) columns.push(-L / 2 + i * P.panel);
  l = { L, spots, columns };
  layouts.set(bays, l);
  return l;
}

const PANEL_LEN = { front: P.panel - P.joint, back: P.panel - P.joint, backTop: P.panel - P.joint, end: P.depth - 2 * T - P.joint, endTop: P.depth - 2 * T - P.joint } as const;
const PANEL_H = { front: H, back: H, end: H, backTop: H + P.slab + P.parapet, endTop: H + P.slab + P.parapet } as const;
const OPENINGS = { front: FRONT_OPENINGS, back: BACK_OPENINGS, backTop: BACK_OPENINGS, end: END_OPENINGS, endTop: END_OPENINGS } as const;
const KINDS = ['front', 'back', 'backTop', 'end', 'endTop'] as const;
type Kind = (typeof KINDS)[number];
const panelOf = (k: Kind) => panelGeometry(`${k}-v2`, PANEL_LEN[k], PANEL_H[k], OPENINGS[k]);

/**
 * The frame the panels close round: a precast column at each joint of the
 * front and back walls and at each corner, inside the wall line, and the
 * gallery's columns along its edge, from the ground to the roof. One mesh.
 */
function frameGeometry(bays: number) {
  return memo(`prefab-frame-v2-${bays}`, () => {
    const L = prefabLength(bays);
    const top = PREFAB_ROOF;
    const c = 0.34;
    const g: BufferGeometry[] = [];
    for (let i = 0; i <= bays; i++) {
      const x = Math.max(-L / 2 + T + c / 2, Math.min(L / 2 - T - c / 2, -L / 2 + i * P.panel));
      for (const z of [-FRONT_Z + T + c / 2, FRONT_Z - T - c / 2]) g.push(box(c, top, c, x, top / 2, z));
    }
    for (const x of layoutOf(bays).columns) {
      const cx = Math.max(-L / 2 + 0.17, Math.min(L / 2 - 0.17, x));
      g.push(box(0.34, top, 0.3, cx, top / 2, GAL_Z - 0.15));
    }
    const m = merge(g);
    boxUV(m, 1);
    return m;
  });
}

/** The front's steps down from the deck: precast, solid to the ground. */
function stepsGeometry(bays: number) {
  return memo(`prefab-steps-${bays}`, () => {
    const x = prefabStepsX(bays);
    const n = Math.round(P.plinth / P.rise) - 1;
    const g = merge(Array.from({ length: n }, (_, k) => box(2.4, P.plinth - (k + 1) * P.rise, P.tread, x, (P.plinth - (k + 1) * P.rise) / 2, GAL_Z + P.tread * (k + 0.5))));
    boxUV(g, 1);
    return g;
  });
}

/** A precast slab: x0..x1 along the building, z0..z1 across it, its top at `top`. */
function slab(key: string, x0: number, x1: number, z0: number, z1: number, top: number, t: number = P.slab) {
  return memo(`prefab-slab-${key}`, () => {
    const g = box(x1 - x0, t, z1 - z0, (x0 + x1) / 2, top - t / 2, (z0 + z1) / 2);
    boxUV(g, 1);
    return g;
  });
}

/* ------------------------------------------------------------------ */
/* The building                                                        */
/* ------------------------------------------------------------------ */

export interface PrefabProps {
  /** 0 the frame standing, the walls open; 1 standing whole. */
  getA: () => number;
  /** 0 to 1: its lights, on once it stands. */
  getLit?: () => number;
  look: Look;
  bays?: number;
  /** The mobile crane and the panel stack: the middle of the top floor's front travels on the hook. */
  crane?: boolean;
}

/**
 * Where in `getA` each thing happens. The banner gives it about three turns
 * of the wheel, the first of them under the dissolve from the capsules.
 * `panels`: the wall panels that fit by themselves come in over this, all
 * together, from `out` metres away (an end panel from `outEnd`: the left
 * end's would stand out by the banner's words). `lower`, `slack`, `draw`, `away`: the
 * crane's one is lowered in front of the gallery to its floor, the hook
 * gives it slack, it is drawn in to its place, and the hook rises and goes
 * back behind the roof. `finish`: the staircase and the deck come in, and
 * the rails are put up half way through.
 */
const STEPS = {
  panels: [0.06, 0.46],
  out: 5,
  outEnd: 3,
  lower: [0.03, 0.52],
  slack: [0.52, 0.58],
  draw: [0.56, 0.7],
  away: [0.7, 0.94],
  finish: [0.62, 0.84],
} as const;

/**
 * The few panels that come in after the rest, and by how much (in `getA`):
 * which floor, which kind and which of that kind on the floor (-1 the last).
 * All on the front, which the banner's camera sees square enough for them to
 * be told apart; none on the left end, which would wait out by the words.
 */
const LATE: { floor: number; kind: Kind; at: number; by: number }[] = [
  { floor: 0, kind: 'front', at: -1, by: 0.13 },
  { floor: 1, kind: 'front', at: 0, by: 0.08 },
  { floor: 2, kind: 'front', at: -1, by: 0.16 },
];

const SHADE = new Color();
const _hook = new Vector3();
const _to = new Vector3();
/** A panel's foot as it stands in the stack. */
const STACK_Y = 0.25;

export function PrefabBuilding({ getA, getLit, look, bays = 3, crane = false }: PrefabProps) {
  const fine = useRefined();
  const lay = layoutOf(bays);
  const { L } = lay;
  const frameMat = precastMat(FINISH.frame, fine);
  const panelMat = precastMat(FINISH.panel, fine);
  const joineryMat = trimMat(FINISH.joinery, fine);
  const doorMat = trimMat(FINISH.door, fine);
  const glow = useMemo(() => (getLit && look.windows === 'dusk' ? litGlass(fine) : null), [getLit, look, fine]);
  useEffect(() => () => glow?.dispose(), [glow]);
  const glassMat = glow ? glow.material : look.windows === 'dusk' ? mat.glassLit : tintedGlass(FINISH.glass);
  /** Each kind's materials, in its groups' order, as copies for instanced meshes. */
  const panelMats = useMemo(() => {
    const by: Record<Part, Material> = { panel: panelMat, joinery: joineryMat, glass: glassMat, door: doorMat };
    return Object.fromEntries(KINDS.map((k) => [k, instanced(panelOf(k).parts.map((p) => by[p]))])) as Record<Kind, Material[]>;
  }, [panelMat, joineryMat, glassMat, doorMat]);
  const panels = useRef<Partial<Record<Kind, InstancedMesh | null>>>({});
  /** Each spot's index within its kind's instanced mesh. */
  const slots = useMemo(() => {
    const count: Record<string, number> = {};
    return lay.spots.map((s) => (count[s.kind] = (count[s.kind] ?? -1) + 1));
  }, [lay]);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, lay.spots.filter((s) => s.kind === k).length])) as Record<Kind, number>, [lay]);
  /** The crane's panel: the top floor's front panel nearest the middle, in the picture's right half, clear of the banner's words. */
  const lift = useMemo(() => {
    let best = -1;
    lay.spots.forEach((s, i) => {
      if (s.kind === 'front' && s.floor === P.floors - 1 && (best < 0 || Math.abs(s.x) < Math.abs(lay.spots[best].x))) best = i;
    });
    return best;
  }, [lay]);
  /** How much later than the rest each panel comes in (`LATE`). */
  const late = useMemo(
    () =>
      lay.spots.map((s, i) => {
        const same = lay.spots.map((t, j) => [t, j] as const).filter(([t]) => t.floor === s.floor && t.kind === s.kind);
        const k = same.findIndex(([, j]) => j === i);
        return LATE.find((d) => d.floor === s.floor && d.kind === s.kind && (d.at < 0 ? same.length + d.at : d.at) === k)?.by ?? 0;
      }),
    [lay],
  );

  const stair = useRef<Mesh>(null);
  const rails = useRef<Group>(null);
  const deck = useRef<Group>(null);

  const stairPlan = prefabStair(bays);
  const stairMats = useMemo(() => [frameMat, joineryMat, kit('steel', fine)], [frameMat, joineryMat, fine]);
  const rail = railGeometry(`prefab-gallery-${bays}`, [
    [-L / 2 + 0.2, GAL_Z - 0.06],
    [L / 2 - 0.06, GAL_Z - 0.06],
    [L / 2 - 0.06, FRONT_Z + 0.05],
  ]);

  // Each panel a shade of its own, a few hundredths either way: precast out of different pours.
  useEffect(() => {
    lay.spots.forEach((s, i) => {
      const m = panels.current[s.kind];
      if (!m) return;
      const v = 0.96 + ((((i * 2654435761) >>> 0) % 1000) / 1000) * 0.06;
      m.setColorAt(slots[i], SHADE.setRGB(v, v, v * 0.996));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [lay, slots]);

  // The crane works from behind the building's middle, over the roof to the front (in the picture's right half, clear of the
  // banner's words); the stack of panels stands behind the building. Once its panel is in, the hook goes back behind the roof.
  const hook = useRef(new Vector3());
  const turn = useRef(0);
  const stack: [number, number, number] = [6, 0, -FRONT_Z - 6];
  const cranePos: [number, number, number] = [-4, 0, -FRONT_Z - 15];
  const parked: [number, number, number] = [-2, PREFAB_ROOF + P.parapet + 6, -FRONT_Z - 5];

  useFrame(() => {
    const a = getA();
    if (glow && getLit) glow.set(getLit());

    // The panels that fit by themselves: all together, straight in to their places, slowing as they close on the frame.
    lay.spots.forEach((s, idx) => {
      if (crane && idx === lift) return;
      const m = panels.current[s.kind];
      if (!m) return;
      const u = win(a, STEPS.panels[0] + late[idx], STEPS.panels[1] + late[idx], ease.linear);
      if (u <= 0) {
        setInst(m, slots[idx], s.x, -50, s.z, s.ry, 0.0001);
        return;
      }
      const out = (1 - ease.outQuart(u)) * (s.kind === 'end' || s.kind === 'endTop' ? STEPS.outEnd : STEPS.out);
      setInst(m, slots[idx], s.x + Math.sin(s.ry) * out, s.y, s.z + Math.cos(s.ry) * out, s.ry, 1);
    });

    if (crane && lift >= 0) {
      // The crane's one: it hangs over the roof at first, is lowered in front of the gallery's edge to its floor, let go
      // and drawn in to its place, under the roof's edge.
      const s = lay.spots[lift];
      const m = panels.current[s.kind];
      const hang = PANEL_H[s.kind] + PANEL_RIG.drop;
      const outZ = GAL_Z + 1.05;
      const high = PREFAB_ROOF + P.parapet + 2.6;
      const down = win(a, STEPS.lower[0], STEPS.lower[1], ease.inOut);
      const foot = high + (s.y - high) * down;
      const z = outZ + (s.z - outZ) * win(a, STEPS.draw[0], STEPS.draw[1], ease.inOut);
      if (m) setInst(m, slots[lift], s.x, foot, z, s.ry, 1);
      _hook.set(s.x, foot + hang - 0.25 * win(a, STEPS.slack[0], STEPS.slack[1], ease.inOut), outZ);
      const away = win(a, STEPS.away[0], STEPS.away[1], ease.linear);
      if (away > 0) {
        // Up clear of the parapet, then back behind the roof.
        _hook.y += 3.2 * ease.inOut(clamp01(away * 2.2));
        _hook.lerp(_to.set(...parked), ease.inOut(clamp01((away - 0.3) / 0.7)));
      }
      hook.current.copy(_hook);
      turn.current = s.ry;
    }
    KINDS.forEach((k) => {
      const m = panels.current[k];
      if (m) m.instanceMatrix.needsUpdate = true;
    });

    // The staircase comes in to the left flank, the deck to the front; the rails go up once both are there.
    const fin = win(a, STEPS.finish[0], STEPS.finish[1], ease.out);
    if (stair.current) {
      stair.current.visible = fin > 0;
      stair.current.position.x = -L / 2 - (1 - fin) * 3.5;
    }
    if (deck.current) {
      deck.current.visible = fin > 0;
      deck.current.position.z = (1 - fin) * 3;
    }
    if (rails.current) rails.current.visible = a >= (STEPS.finish[0] + STEPS.finish[1]) / 2;
  });

  const floorSlab = (f: number) => slab(`floor-${bays}-${f}`, -L / 2 + T, L / 2 - T, -FRONT_Z + T, FRONT_Z - T, P.plinth + (f + 1) * P.storey);
  const gallerySlab = (f: number) => slab(`gallery-${bays}-${f}`, -L / 2, L / 2, FRONT_Z, GAL_Z, P.plinth + (f + 1) * P.storey);

  return (
    <group>
      {/* The frame, standing from the start: the plinth, the columns, the floor and gallery slabs, the roof and its parapet over the gallery. */}
      <mesh geometry={slab(`plinth-${bays}`, -L / 2 - 0.05, L / 2 + 0.05, -FRONT_Z - 0.05, FRONT_Z + 0.05, P.plinth, P.plinth)} material={frameMat} castShadow receiveShadow />
      <mesh geometry={frameGeometry(bays)} material={frameMat} castShadow receiveShadow />
      {[0, 1].map((f) => (
        <group key={f}>
          <mesh geometry={floorSlab(f)} material={frameMat} receiveShadow />
          <mesh geometry={gallerySlab(f)} material={frameMat} castShadow receiveShadow />
        </group>
      ))}
      <mesh geometry={slab(`roof-${bays}`, -L / 2 + T, L / 2 - T, -FRONT_Z + T, GAL_Z, PREFAB_ROOF)} material={frameMat} castShadow receiveShadow />
      <mesh geometry={slab(`parapet-front-${bays}`, -L / 2, L / 2, GAL_Z - T, GAL_Z, PREFAB_ROOF + P.parapet, P.parapet + P.slab)} material={frameMat} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={slab(`parapet-end-${bays}-${s}`, s * (L / 2) - (s > 0 ? T : 0), s * (L / 2) + (s < 0 ? T : 0), FRONT_Z, GAL_Z - T, PREFAB_ROOF + P.parapet, P.parapet + P.slab)} material={frameMat} castShadow receiveShadow />
      ))}

      {KINDS.map(
        (k) =>
          counts[k] > 0 && (
            <instancedMesh
              key={k}
              ref={(m) => {
                panels.current[k] = m;
              }}
              args={[panelOf(k).geometry, panelMats[k], counts[k]]}
              castShadow
              receiveShadow
              frustumCulled={false}
            />
          ),
      )}

      {/* The outer staircase where the access rule puts it, drawn in the plot's own metres. */}
      {stairPlan && <mesh ref={stair} geometry={stairGeometryOf(stairPlan)} material={stairMats} position={[-L / 2, 0, -FRONT_Z]} castShadow receiveShadow />}
      <group ref={rails}>
        {[0, 1].map((f) => (
          <mesh key={f} geometry={rail} material={kit('steel', fine)} position-y={P.plinth + (f + 1) * P.storey} castShadow />
        ))}
      </group>
      {/* The ground deck along the front, and one flight of steps at a door. */}
      <group ref={deck}>
        <mesh geometry={slab(`deck-${bays}`, -L / 2, L / 2, FRONT_Z, GAL_Z, P.plinth, P.plinth)} material={frameMat} castShadow receiveShadow />
        <mesh geometry={stepsGeometry(bays)} material={frameMat} castShadow receiveShadow />
      </group>

      {crane && (
        <>
          {/* The stack the panels come from, on its rack. */}
          <mesh geometry={stackGeometry()} material={panelMat} position={stack} castShadow receiveShadow />
          <MobileCrane position={cranePos} heading={0} getHook={() => hook.current} getTurn={() => turn.current} head={4.5} rig="panel" />
        </>
      )}
    </group>
  );
}

/** A few panels standing in their rack, as they come off the trailer. */
function stackGeometry() {
  return memo('prefab-stack', () => {
    const g: BufferGeometry[] = [box(7, STACK_Y, 2.4, 0, STACK_Y / 2, 0)];
    for (let i = 0; i < 3; i++) g.push(box(6.2, 2.8, 0.2, 0, STACK_Y + 1.4, -0.6 + i * 0.6));
    const m = merge(g);
    boxUV(m, 1);
    return m;
  });
}
