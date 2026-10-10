/**
 * One set per building type for the hero, each a real place at its own
 * hour: the farmhouse in a meadow at sunset, capsule pods at the edge of a
 * wood at blue hour, workforce housing on a site yard in the morning, the
 * institutional block on a paved forecourt by day. Reused on the sub-pages.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import type { Group, Material, Mesh, PointLight } from 'three';
import { deckFinishes, shellFinishes, trimFinishes } from '../../data/build';
import type { CameraKey } from '../../film/timeline';
import { clearing } from './atmosphere';
import { Paving } from './env';
import { Capsule, CapsulePods, InstitutionalBlock, Pad, WorkforceBlock, padGeometry, type BuildingProps } from './buildings';
import { merge } from './geometry';
import { Flowers, Fence, Grass, Ground, LAND, TreeLine, Woodland, along, strip, settled, type Eye, type FieldPatch, type LandPalette, type Rect, type TreeSpot } from './landscape';
import type { Look, LookName } from './looks';
import { mat } from './materials';
import { HOME_FOOTPRINT, HOME_LAMP, HOME_LANDING, HOME_STEP_FOOT, ModelHome } from './modelhome';

export type SetName = 'farm' | 'pods' | 'work' | 'campus';

export interface SetInfo {
  look: LookName;
  /** Camera at the start and end of the set's time on screen. */
  from: Omit<CameraKey, 'p'>;
  to: Omit<CameraKey, 'p'>;
  shadow: number;
}

export const SETS: Record<SetName, SetInfo> = {
  farm: {
    look: 'sunset',
    from: { pos: [11.2, 2.1, 23.5], look: [0.5, 2.6, 0.6] },
    to: { pos: [8.1, 1.94, 19.7], look: [0.75, 2.46, 0.6] },
    shadow: 26,
  },
  /*
   * The three capsules seen near eye level and near enough to read at their
   * real size (client, 2026-10-11: "too small, like toy houses"), the row
   * across the foot of the picture and under the caption on the left, which
   * leaves that ground free. The camera looks a little right of the row's
   * middle: the hero puts its target three quarters across (focus).
   */
  pods: {
    look: 'blueHour',
    from: { pos: [8.4, 1.78, 26.6], look: [5.5, 2.3, 0] },
    to: { pos: [-1.6, 1.72, 25.8], look: [5, 2.24, 0] },
    shadow: 26,
  },
  work: {
    look: 'morning',
    from: { pos: [31, 2.6, 45], look: [0, 4.2, 0] },
    to: { pos: [19, 2.3, 39], look: [1.5, 4, 0] },
    shadow: 34,
  },
  campus: {
    look: 'day',
    from: { pos: [55, 3, 81], look: [0, 6.8, 0] },
    to: { pos: [43, 2.6, 73], look: [0, 6.4, 0] },
    shadow: 46,
  },
};

/**
 * Where each set's camera stands on plan, start to end of its move. Grass
 * and trees keep full detail near it and thin out with distance. A narrow
 * screen only ever pulls the camera farther back along the same line.
 */
const eyeOf = (s: SetInfo): Eye => [0, 0.5, 1].map((u) => [s.from.pos[0] + (s.to.pos[0] - s.from.pos[0]) * u, s.from.pos[2] + (s.to.pos[2] - s.from.pos[2]) * u] as const);
const EYE: Record<SetName, Eye> = { farm: eyeOf(SETS.farm), pods: eyeOf(SETS.pods), work: eyeOf(SETS.work), campus: eyeOf(SETS.campus) };

/**
 * A warm lamp: one point light per set, so the light count never changes
 * between sets. `getOn` 0–1: brought up by the scene, for a house that is
 * put together in view; its light and its fitting are dark until then.
 */
function Lamp({ at, intensity, color = '#ffc98a', distance = 9, getOn }: { at: [number, number, number]; intensity: number; color?: string; distance?: number; getOn?: () => number }) {
  const light = useRef<PointLight>(null);
  const bulb = useRef<Mesh>(null);
  const glow = useMemo(() => (getOn ? mat.lamp.clone() : null), [getOn]);
  useEffect(() => () => glow?.dispose(), [glow]);
  useFrame(() => {
    if (!getOn || !glow) return;
    const v = getOn();
    if (light.current) light.current.intensity = intensity * v;
    glow.emissiveIntensity = mat.lamp.emissiveIntensity * v;
    if (bulb.current) bulb.current.visible = v > 0.004;
  });
  return (
    <group position={at}>
      <pointLight ref={light} intensity={getOn ? 0 : intensity} color={color} distance={distance} decay={2} />
      {intensity > 0 && (
        <mesh ref={bulb} material={glow ?? mat.lamp} visible={!getOn}>
          <boxGeometry args={[0.12, 0.18, 0.08]} />
        </mesh>
      )}
    </group>
  );
}

/** The path's stones and the backfill are land: copies of the kit's materials that keep inside a clearing (atmosphere.ts). */
const landMats = new Map<string, Material>();
function landMat(name: 'paving' | 'gravel') {
  let m = landMats.get(name);
  if (!m) landMats.set(name, (m = clearing(mat[name].clone())));
  return m;
}

/** Flat stepping stones along a polyline, as one mesh. */
function Stones({ pts, every = 0.85, size = 0.62 }: { pts: [number, number][]; every?: number; size?: number }) {
  const geo = useMemo(() => {
    const stones = [];
    let i = 0;
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, z0] = pts[s];
      const [x1, z1] = pts[s + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / every));
      for (let k = 0; k < n; k++, i++) {
        const g = padGeometry(size * (0.9 + ((i * 37) % 10) / 40), size * 0.72, 0.18, 0.07).clone();
        g.rotateY((s * 7 + k) * 0.7);
        g.translate(x0 + ((x1 - x0) * k) / n, 0, z0 + ((z1 - z0) * k) / n);
        stones.push(g);
      }
    }
    return merge(stones);
  }, [pts, every, size]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={landMat('paving')} receiveShadow />;
}

/** Gravel patches where footing pits were backfilled, as one mesh. */
function Pits({ at, size = 1.5 }: { at: [number, number][]; size?: number }) {
  const geo = useMemo(
    () =>
      merge(
        at.map(([x, z]) => {
          const g = padGeometry(size, size, 0.22, 0.05).clone();
          g.translate(x, -0.012, z);
          return g;
        }),
      ),
    [at, size],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={landMat('gravel')} receiveShadow />;
}

/* ------------------------------------------------------------------ */
/* Farmhouse at sunset                                                 */
/* ------------------------------------------------------------------ */

/*
 * The house is the client's single-shell model (modelhome.tsx, notes H8),
 * in the hero only. Finishes are ours: the client left the colours open.
 */
const HOME_FINISH = { shell: shellFinishes[1].hex, deck: deckFinishes[2].hex, trim: trimFinishes[0].hex };

const FARM_FLAT = 46;
const FARM_HILLS = 18;
const FARM_FIELDS: FieldPatch[] = [
  { x: -70, z: -95, w: 120, d: 60, angle: 0.12, colors: ['#b39a4f', '#a58e48', '#9a8a4a'], strip: 7 },
  { x: 60, z: -110, w: 110, d: 56, angle: -0.08, colors: ['#7d8040', '#86884a'], strip: 9 },
  { x: -140, z: -40, w: 70, d: 90, angle: 0.3, colors: ['#8a6f4a', '#7d6443'], strip: 5 },
  { x: 110, z: -40, w: 70, d: 60, angle: -0.2, colors: ['#a99652', '#b5a05a'], strip: 8 },
];
const FARM_HEDGE_TREES: TreeSpot[] = along(
  [
    [-130, -64, -10, -50, 16],
    [0, -82, 115, -80, 16],
    [-126, -127, -14, -112, 12],
    [-176, -2, -104, -86, 10],
  ],
  [0.45, 0.85],
  77,
);
const FARM_TREES: TreeSpot[] = [
  { x: -3.5, z: -15, s: 0.95, variant: 1 },
  { x: 7, z: -13, s: 1.05, variant: 2 },
  { x: 15, z: -6, s: 0.9, variant: 0 },
  { x: 24, z: -16, s: 1.15, variant: 1 },
  { x: 31, z: 1, s: 0.85, variant: 2 },
  { x: 12, z: -28, s: 1.2, variant: 0 },
  { x: 40, z: -22, s: 1.1, variant: 2 },
  { x: -10, z: -42, s: 1.0, variant: 1 },
];
const FARM_SHRUBS: TreeSpot[] = [
  { x: -6.8, z: 1.6, s: 0.22, variant: 0 },
  { x: -6.2, z: -2.4, s: 0.26, variant: 1 },
  { x: 6.6, z: 2.4, s: 0.2, variant: 2 },
  { x: 5.9, z: -3.1, s: 0.24, variant: 0 },
];
// Tree lines behind and right of the house only: the sun's side of the horizon stays clean.
const FARM_LINES: [number, number, number, number, number][] = [
  [-60, -260, 300, -240, 90],
  [260, -120, 360, 160, 42],
  [60, -420, 380, -380, 50],
];
// One woodland for the set: the trees by the house, the hedgerows and the shrubs at the deck.
const FARM_WOOD: TreeSpot[] = [...settled(FARM_TREES), ...FARM_HEDGE_TREES, ...settled(FARM_SHRUBS)];
/*
 * The house stands a little turned towards the low sun (client, 2026-10-07),
 * so its steps point out into the meadow and the path has to come round to
 * them. Everything that belongs to the house turns with it.
 */
const FARM_YAW = -0.24;
const YAW_COS = Math.cos(FARM_YAW);
const YAW_SIN = Math.sin(FARM_YAW);
/** A point on the house's own plan, as it lies in the set. */
const turned = (x: number, z: number): [number, number] => [x * YAW_COS + z * YAW_SIN, -x * YAW_SIN + z * YAW_COS];

/** Stepping stones from the foot of the steps, out and round to where the camera stands. */
const FARM_PATH: [number, number][] = [
  turned(HOME_STEP_FOOT[0], HOME_STEP_FOOT[1] + 0.5),
  turned(HOME_STEP_FOOT[0] + 0.1, HOME_STEP_FOOT[1] + 2.4),
  [0.9, 8.4],
  [1.6, 10.6],
  [3.0, 12.6],
  [4.9, 14.5],
  [6.9, 16.4],
  [8.6, 18.6],
  [10.2, 21.4],
];
// The meadow runs up to the walls, as the lawn does in the client's model, and stands back from the path.
const FARM_EXCLUDE: Rect[] = [
  { x0: HOME_FOOTPRINT.x0 - 0.45, z0: HOME_FOOTPRINT.z0 - 0.45, x1: HOME_FOOTPRINT.x1 + 0.45, z1: HOME_FOOTPRINT.z1 + 0.3, turn: FARM_YAW },
  { x0: HOME_LANDING.x0 - 0.3, z0: HOME_LANDING.z0, x1: HOME_LANDING.x1 + 0.3, z1: HOME_LANDING.z1 + 0.35, turn: FARM_YAW },
  ...strip(FARM_PATH, 1.15),
];
/** Backfilled pits round the four footings. */
const FARM_PITS: [number, number][] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (HOME_FOOTPRINT.x1 - 0.28), sz * (HOME_FOOTPRINT.z1 - 0.28)] as [number, number]));

/** land: a ref to the group that holds everything but the house, for the scene to hide until it is wanted. house: the house's own. */
export function FarmSet({ getA, getLit, look, land, house }: Omit<BuildingProps, 'x'> & { land?: Ref<Group>; house?: Ref<Group> }) {
  const palette = LAND.gold;
  return (
    <group>
      <group ref={land}>
        <Landscape
          palette={palette}
          flat={FARM_FLAT}
          hills={FARM_HILLS}
          seed={4}
          trees={FARM_WOOD}
          lines={FARM_LINES}
          fields={FARM_FIELDS}
          grass={{ center: [5, 13], radius: [27, 17], count: 10000, exclude: FARM_EXCLUDE, height: 0.62, flowers: true }}
          eye={EYE.farm}
        />
        <Fence
          pts={[
            [36, 20],
            [44, -6],
            [40, -34],
          ]}
          flat={FARM_FLAT}
          hills={FARM_HILLS}
        />
        <Stones pts={FARM_PATH} />
        <group rotation-y={FARM_YAW}>
          <Pits at={FARM_PITS} />
        </group>
      </group>
      <group rotation-y={FARM_YAW} ref={house}>
        <ModelHome getA={getA} getLit={getLit} look={look} shellHex={HOME_FINISH.shell} deckHex={HOME_FINISH.deck} trimHex={HOME_FINISH.trim} />
        {/* A soft porch light: the door and its sidelights stay readable under it. It comes on with the windows. */}
        <Lamp at={HOME_LAMP} intensity={(look.lamps ?? 0) * 0.55} distance={6} getOn={getLit} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The opening card: the three kinds of building in a row              */
/* ------------------------------------------------------------------ */

type P3 = [number, number, number];

/**
 * Where the capsule and the prefab block stand beside the farm set's house
 * while the opening card is up (client, 2026-10-09: "one system, many
 * buildings" is shown by three objects, a modular home, a capsule home and
 * a prefab building, and not by the two shells, which belong to the
 * modular line only). The house is the set's own, at the origin. All three
 * are to one scale.
 *
 * Since 2026-10-11 the three stand side by side along the foot of the
 * picture, close together, as in the client's reference picture ("back to
 * back as shown"), and the row is fitted to the screen it is seen on
 * (HeroScene, frameRow): on a wide screen a straight row seen nearly level;
 * on a squarer one the capsule and the block step back behind the house
 * and the camera rises, so the row grows into the height the screen has
 * instead of leaving it empty. `s` is that step, 0 to 1.
 */
export interface Row {
  capsule: { at: P3; turn: number; feet: number };
  prefab: { at: P3; turn: number; bays: number };
  /** Where each one's name hangs from: a point on the floor in front of it (the label stands under that point, film.css). */
  tags: Record<'mod' | 'pod' | 'fab', P3>;
  /** Each one's place on the floor and how far its shadow is kept (x, z, from, to), for the bare floor of the opening. */
  spots: [number, number, number, number][];
  /** The corners of each one's box, in the set's metres: what the camera frames. House, capsule, block. */
  hull: P3[][];
  /** The camera's bearing on the row: azimuth from +z towards +x and elevation, radians. */
  view: { az: number; el: number };
}

/** The card's block: two floors of four bays, the brief's G+1 at a length that sits in a row with the other two. */
export const ROW_BAYS = 4;

/** Corners of a box given on a building's own plan (x0, x1, z0, z1, height), turned by `turn` and set at `at`. */
function hullOf(at: P3, turn: number, [x0, x1, z0, z1, h]: [number, number, number, number, number]): P3[] {
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  const out: P3[] = [];
  for (const x of [x0, x1])
    for (const z of [z0, z1])
      for (const y of [0, h]) out.push([at[0] + x * c + z * sn, at[1] + y, at[2] - x * sn + z * c]);
  return out;
}
const placed = (at: P3, turn: number, x: number, z: number): P3 => [at[0] + x * Math.cos(turn) + z * Math.sin(turn), 0, at[2] - x * Math.sin(turn) + z * Math.cos(turn)];

/** The house's box on its own plan: roof overhang, landing and steps included, up to the ridge. */
const HOUSE_BOX: [number, number, number, number, number] = [-3.2, 3.25, -1.7, 3.25, 4.2];
/** The 20′ capsule's, steps included. */
const CAPSULE_BOX: [number, number, number, number, number] = [-3.08, 3.08, -1.55, 2.2, 3.2];
/** The block's: its staircase stands against its left flank, its gallery along the front. */
const blockBox = (bays: number): [number, number, number, number, number] => [-bays * 1.5 - 2.15, bays * 1.5 + 0.1, -3.05, 4.65, 6.2];

const mix = (p: number, q: number, t: number) => p + (q - p) * t;

/**
 * The row for a screen: `s` 0 on a wide one, 1 on a squarish one. Along the
 * row the gaps stay alike as the two behind the house step back; seen from
 * in front, each is turned a little towards the camera.
 */
export function rowFor(s: number): Row {
  const az = mix(0.02, 0.2, s);
  const el = mix(0.085, 0.27, s);
  // Along the row (u) and away from the camera (w), on plan.
  const u: [number, number] = [Math.cos(az), -Math.sin(az)];
  const w: [number, number] = [-Math.sin(az), -Math.cos(az)];
  const at = (along: number, back: number): P3 => [u[0] * along + w[0] * back, 0, u[1] * along + w[1] * back];
  const bays = ROW_BAYS;
  const capsule = at(mix(8.15, 6.6, s), mix(0.4, 6.2, s));
  const prefab = at(mix(22.6, 16.2, s), mix(9, 20, s));
  const capTurn = az - 0.1;
  const fabTurn = az - mix(0.26, 0.2, s);
  const [, bx1] = blockBox(bays);
  return {
    capsule: { at: capsule, turn: capTurn, feet: 20 },
    prefab: { at: prefab, turn: fabTurn, bays },
    tags: {
      mod: placed([0, 0, 0], FARM_YAW, 0.35, 3.9),
      pod: placed(capsule, capTurn, 0, 2.75),
      fab: placed(prefab, fabTurn, -1.05, 5.35),
    },
    spots: [
      [0, 0, 3.5, 10],
      [capsule[0], capsule[2], 3.6, 9],
      [prefab[0], prefab[2], bx1 + 2.5, bx1 + 10],
    ],
    hull: [hullOf([0, 0, 0], FARM_YAW, HOUSE_BOX), hullOf(capsule, capTurn, CAPSULE_BOX), hullOf(prefab, fabTurn, blockBox(bays))],
    view: { az, el },
  };
}

/** How far a screen of this shape steps the row back: 0 from 1.9 wide to 1, 1 at 1.25 and squarer. */
export const rowStep = (aspect: number) => Math.min(1, Math.max(0, (1.9 - aspect) / 0.65));

/**
 * On a narrow screen the picture is the top of an upright card: two tiers
 * seen from above, the house and the capsule side by side in front, the
 * block behind them, each named under itself.
 */
export function rowCompact(): Row {
  const capsule: P3 = [7.7, 0, 0.9];
  const prefab: P3 = [4.4, 0, -22];
  const capTurn = 0.02;
  const fabTurn = 0.02;
  const bays = ROW_BAYS;
  const [, bx1] = blockBox(bays);
  return {
    capsule: { at: capsule, turn: capTurn, feet: 20 },
    prefab: { at: prefab, turn: fabTurn, bays },
    tags: {
      mod: placed([0, 0, 0], FARM_YAW, 0.35, 3.9),
      pod: placed(capsule, capTurn, 0, 2.75),
      fab: placed(prefab, fabTurn, -1.05, 5.35),
    },
    spots: [
      [0, 0, 3.5, 10],
      [capsule[0], capsule[2], 3.6, 9],
      [prefab[0], prefab[2], bx1 + 2.5, bx1 + 10],
    ],
    hull: [hullOf([0, 0, 0], FARM_YAW, HOUSE_BOX), hullOf(capsule, capTurn, CAPSULE_BOX), hullOf(prefab, fabTurn, blockBox(bays))],
    view: { az: 0.1, el: 0.5 },
  };
}

/** The other two of the three: lowered in beside the house on the opening card, lifted away as the page scrolls on. */
export function Lineup({
  row,
  getCapsule,
  getPrefab,
  getCapsuleLit,
  getPrefabLit,
  look,
  hold,
}: {
  row: Row;
  getCapsule: () => number;
  getPrefab: () => number;
  /** 0–1: each one's lights, on once it stands. */
  getCapsuleLit?: () => number;
  getPrefabLit?: () => number;
  look: Look;
  hold?: Ref<Group>;
}) {
  return (
    <group ref={hold}>
      <Capsule feet={row.capsule.feet} position={row.capsule.at} rotation={row.capsule.turn} getT={getCapsule} getLit={getCapsuleLit} look={look} drop={11} />
      {/* The block's own ground line is the top of its set's gravel pad: here it stands on the bare floor. */}
      <group position={[row.prefab.at[0], -0.06, row.prefab.at[2]]} rotation-y={row.prefab.turn}>
        <WorkforceBlock getA={getPrefab} getLit={getPrefabLit} look={look} crane={false} bays={row.prefab.bays} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Shared landscape                                                    */
/* ------------------------------------------------------------------ */

function Landscape({
  palette,
  flat,
  hills,
  seed,
  trees,
  lines,
  fields,
  grass,
  eye,
}: {
  palette: LandPalette;
  flat: number;
  hills: number;
  seed: number;
  trees: TreeSpot[];
  lines: [number, number, number, number, number][];
  fields?: FieldPatch[];
  grass?: { center: [number, number]; radius: [number, number]; count: number; exclude: Rect[]; height?: number; flowers?: boolean };
  eye: Eye;
}) {
  return (
    <>
      <Ground palette={palette} flat={flat} hills={hills} seed={seed} fields={fields} />
      <Woodland spots={trees} palette={palette} flat={flat} hills={hills} eye={eye} />
      <TreeLine lines={lines} palette={palette} flat={flat} hills={hills} seed={seed + 30} />
      {grass && (
        <>
          <Grass palette={palette} center={grass.center} radius={grass.radius} count={grass.count} exclude={grass.exclude} height={grass.height} flat={flat} hills={hills} seed={seed + 7} eye={eye} />
          {grass.flowers && <Flowers palette={palette} center={grass.center} radius={grass.radius} count={Math.round(grass.count / 30)} exclude={grass.exclude} flat={flat} hills={hills} seed={seed + 9} />}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Capsule pods at blue hour                                           */
/* ------------------------------------------------------------------ */

// A low wood edge well behind the pods: silhouettes against the twilight, below the headline.
const POD_TREES: TreeSpot[] = along(
  [
    [-60, -34, 60, -40, 26],
    [-40, -52, 70, -58, 18],
  ],
  [0.6, 0.95],
  41,
);
const POD_LINES: [number, number, number, number, number][] = [
  [-300, -150, 300, -210, 110],
  [-340, -40, -260, 180, 40],
];

export function PodSet({ getA, label, getShow, look }: Omit<BuildingProps, 'x'>) {
  const palette = LAND.dusk;
  return (
    <group>
      <Landscape
        palette={palette}
        flat={40}
        hills={22}
        seed={12}
        trees={POD_TREES}
        lines={POD_LINES}
        grass={{ center: [2, 12], radius: [32, 17], count: 6500, exclude: [{ x0: -14.5, z0: -4.5, x1: 14.5, z1: 4.6 }], height: 0.5 }}
        eye={EYE.pods}
      />
      <Pad w={27} d={8.5} r={0.4} y={-0.02} material={mat.gravel} thickness={0.06} />
      <CapsulePods getA={getA} label={label} getShow={getShow} look={look} />
      <Lamp at={[0, 0.5, 3.6]} intensity={(look.lamps ?? 0) * 2.4} distance={12} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Workforce housing, morning                                          */
/* ------------------------------------------------------------------ */

const WORK_TREES: TreeSpot[] = [
  { x: -24, z: -18, s: 0.9, variant: 0 },
  { x: 24, z: -20, s: 1.25, variant: 2 },
  { x: 36, z: -6, s: 1.0, variant: 1 },
  { x: 30, z: -32, s: 1.1, variant: 0 },
];
const WORK_LINES: [number, number, number, number, number][] = [
  [-320, -180, 300, -220, 100],
  [280, -100, 360, 200, 40],
];

export function WorkSet({ getA, look }: Omit<BuildingProps, 'x'>) {
  const palette = LAND.day;
  return (
    <group>
      <Landscape
        palette={palette}
        flat={50}
        hills={26}
        seed={21}
        trees={WORK_TREES}
        lines={WORK_LINES}
        eye={EYE.work}
      />
      <Pad w={36} d={18} r={0.6} y={-0.02} material={mat.gravel} thickness={0.06} />
      <WorkforceBlock getA={getA} look={look} />
      <Lamp at={[0, 3, 5]} intensity={0} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Institutional, by day                                               */
/* ------------------------------------------------------------------ */

const CAMPUS_TREES: TreeSpot[] = [
  ...[-30, -20, -10, 10, 20, 30].map((x, i) => ({ x, z: 17, s: 0.95, variant: i % 3 })),
  { x: -32, z: -10, s: 1.2, variant: 1 },
  { x: 34, z: -12, s: 1.25, variant: 2 },
  { x: -8, z: -24, s: 1.3, variant: 0 },
  { x: 14, z: -26, s: 1.2, variant: 1 },
];
const CAMPUS_LINES: [number, number, number, number, number][] = [
  [-360, -200, 340, -240, 110],
  [-380, -80, -320, 220, 40],
  [320, -120, 400, 200, 40],
];

export function CampusSet({ getA, label, getShow, look }: Omit<BuildingProps, 'x'>) {
  const palette = LAND.day;
  return (
    <group>
      <Landscape
        palette={palette}
        flat={60}
        hills={34}
        seed={33}
        trees={CAMPUS_TREES}
        lines={CAMPUS_LINES}
        eye={EYE.campus}
      />
      <Paving w={52} d={28} tile={2} y={0.012} material={mat.paving} line="#3b3e43" lineOpacity={0.09} />
      <InstitutionalBlock getA={getA} label={label} getShow={getShow} look={look} />
      <Lamp at={[0, 3, 7]} intensity={0} />
    </group>
  );
}
