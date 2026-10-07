import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, type LineBasicMaterial, type LineSegments, type Material, type Mesh } from 'three';
import { ADDONS, EXPLODE, FOUNDATION, addOnWindow } from '../../film/componentsTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, hold, sampleCamera, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { UNIT_BOX, memo } from '../kit/geometry';
import { mat } from '../kit/materials';
import {
  FOUNDATION as PRECAST,
  cleatGeometry,
  footingGeometry,
  footingReach,
  hookCleatGeometry,
  jackBaseGeometry,
  jackNutGeometry,
  jackScrewGeometry,
  panelGeometry,
  plinthGeometry,
  railGeometry,
  slopedRoofGeometry,
  stairGeometry,
} from '../kit/parts';

/**
 * Building components: one 6 m × 3 m shell, modelled on the supplied render,
 * taken apart into foundation, insulated shell and add-ons, then put back
 * together in the brief's three steps. Each part is a mesh with a home
 * position, an exploded offset and an arrival move.
 *
 * Foundation and corner fittings are simplified stand-ins (notes C1, C2).
 */

type V3 = [number, number, number];

interface Part {
  key: string;
  geo?: BufferGeometry;
  mat: Material | Material[];
  size?: V3;
  pos: V3;
  rotY?: number;
  rotX?: number;
  explode: V3;
  from: V3;
  win: [number, number];
  kind?: 'screw' | 'plug' | 'pop';
  tag?: number;
}

/* ---------- Dimensions (metres) ---------- */

const L = 6;
/** Ground level: the footing pads stand on the studio floor, 620 mm below it. */
const GL = 0.62;
/** Pedestal and plinth tops above ground (600 mm, notes H1–H2). */
const ABOVE = 0.6;
const FB = GL + ABOVE + PRECAST.jack; // floor slab underside, on the jack heads
const FT = FB + 0.14; // floor top
const WH = 2.72; // wall height
const RB = FT + WH; // roof underside
const RT = RB + 0.2; // roof top
const PANEL_H = WH - 0.16;
const PANEL_Y = FT + 0.08;
const BAY = 0.96;
const ROOF = { len: 6.3, depth: 3.3, rise: 0.92, eave: 0.27 };

const seq = (from: number, to: number, i: number, n: number, span = 0.5): [number, number] => {
  const w = (to - from) * span;
  const a = from + ((to - from - w) * i) / Math.max(1, n - 1);
  return [a, a + w];
};

function buildParts(): Part[] {
  const P: Part[] = [];
  const F = FOUNDATION;

  /* --- 3.1 Foundation: footings, L plinth pieces, jacks (client's model, notes H1–H2) --- */
  let i = 0;
  const corners: [number, number][] = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  for (const [sx, sz] of corners) {
    // The shell lies away from each corner: the pad reaches under it.
    const q: [boolean, boolean, boolean, boolean] = [sx < 0 && sz < 0, sx > 0 && sz < 0, sx > 0 && sz > 0, sx < 0 && sz > 0];
    P.push({
      key: `footing${sx}${sz}`,
      geo: footingGeometry(ABOVE, footingReach(q)),
      mat: mat.concrete,
      pos: [sx * 3, GL, sz * 1.5],
      explode: [0, 0, 0],
      from: [0, 2.2, 0],
      win: seq(F.from, F.from + 0.055, i++, 4, 0.6),
    });
  }
  // Plinth pieces between the pedestals: 4 × 1425 on each long side, 2 × 1350 on each end.
  const pieces: { key: string; len: number; pos: V3; rotY: number }[] = [];
  const run6 = (L - PRECAST.pedestal) / 4;
  const run3 = (3 - PRECAST.pedestal) / 2;
  for (const sz of [1, -1])
    for (let k = 0; k < 4; k++)
      pieces.push({ key: `pl6${sz}${k}`, len: run6, pos: [-L / 2 + PRECAST.pedestal / 2 + run6 * (k + 0.5), GL, sz * 1.5], rotY: sz > 0 ? Math.PI : 0 });
  for (const sx of [1, -1])
    for (let k = 0; k < 2; k++)
      pieces.push({ key: `pl3${sx}${k}`, len: run3, pos: [sx * 3, GL, -1.5 + PRECAST.pedestal / 2 + run3 * (k + 0.5)], rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2 });
  pieces.forEach((pc, k) =>
    P.push({
      key: pc.key,
      geo: plinthGeometry(pc.len, ABOVE, pc.len),
      mat: mat.concrete,
      pos: pc.pos,
      rotY: pc.rotY,
      explode: [0, 0, 0],
      from: [0, 1.6, 0],
      win: seq(F.from + 0.045, F.from + 0.1, k, pieces.length, 0.35),
    }),
  );
  i = 0;
  for (const [sx, sz] of corners) {
    const at: V3 = [sx * 3, GL + ABOVE, sz * 1.5];
    const w = seq(F.from + 0.095, F.from + 0.13, i++, 4, 0.6);
    P.push({ key: `jackb${sx}${sz}`, geo: jackBaseGeometry(), mat: mat.galv, pos: at, explode: [0, 0, 0], from: [0, 1.4, 0], win: w });
    P.push({ key: `jackn${sx}${sz}`, geo: jackNutGeometry(), mat: mat.accentInk, pos: [at[0], GL + ABOVE + 0.055, at[2]], explode: [0, 0, 0], from: [0, 1.4, 0], win: w, kind: 'screw' });
    P.push({ key: `jacks${sx}${sz}`, geo: jackScrewGeometry(), mat: mat.galv, pos: [at[0], FB, at[2]], explode: [0, 0, 0], from: [0, 1.4, 0], win: w, kind: 'screw' });
  }

  /* --- 3.2 Insulated shell --- */
  const S0 = 0.44;
  P.push({ key: 'floor', mat: mat.concrete, size: [L, 0.14, 3], pos: [0, FB + 0.07, 0], explode: [0, 0.75, 0], from: [0, 4.5, 0], win: [S0, S0 + 0.05] });
  for (let k = 0; k < 9; k++)
    P.push({ key: `joist${k}`, mat: mat.steel, size: [0.08, 0.1, 2.9], pos: [-2.8 + k * 0.7, FB - 0.05, 0], explode: [0, 0.75, 0], from: [0, 4.5, 0], win: [S0, S0 + 0.05] });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      P.push({
        key: `post${sx}${sz}`,
        mat: mat.concrete,
        size: [0.12, WH, 0.12],
        pos: [sx * 2.94, FT + WH / 2, sz * 1.44],
        explode: [0, 1.35, 0],
        from: [0, 4.5, 0],
        win: [S0 + 0.012, S0 + 0.06],
      });

  // Perimeter metal frame: clamps in from outside, bottom then top.
  for (const [y, k] of [
    [FT + 0.04, 0],
    [RB - 0.04, 1],
  ] as const) {
    const w: [number, number] = [0.495 + k * 0.012, 0.535 + k * 0.012];
    for (const sz of [-1, 1])
      P.push({ key: `frame-l${k}${sz}`, mat: mat.steel, size: [5.76, 0.08, 0.1], pos: [0, y, sz * 1.45], explode: [0, 1.35, 0], from: [0, 0, sz * 1.5], win: w });
    for (const sx of [-1, 1])
      P.push({ key: `frame-s${k}${sx}`, mat: mat.steel, size: [0.1, 0.08, 2.8], pos: [sx * 2.95, y, 0], explode: [0, 1.35, 0], from: [sx * 1.5, 0, 0], win: w });
  }

  // Exterior panels (thicker). Openings: main door, windows.
  type Opening = { w: number; h: number; sill: number };
  const WINDOW: Opening = { w: 0.66, h: 1.15, sill: 0.85 };
  const DOOR: Opening = { w: 0.74, h: 2.04, sill: 0 };
  const CLERESTORY: Opening = { w: 0.7, h: 0.5, sill: 1.72 };
  const T = 0.12;
  const X0 = 0.55;
  const X1 = 0.615;

  const exterior = (key: string, pos: V3, rotY: number, dir: V3, order: number, total: number, o?: Opening) => {
    const w = seq(X0, X1, order, total, 0.45);
    const explode: V3 = [dir[0] * 1.7, 1.35, dir[2] * 1.7];
    const slide: V3 = rotY ? [0, 0, 5.5] : [7.5, 0, 0];
    P.push({ key, geo: panelGeometry(BAY - 0.012, PANEL_H, T, o), mat: mat.panel, pos, rotY, explode, from: slide, win: w });
    if (!o) return;
    const c: V3 = [pos[0], pos[1] + o.sill + o.h / 2, pos[2]];
    const depth: V3 = rotY ? [T, o.h, o.w] : [o.w, o.h, T];
    // The cut-out that leaves, then what fills it.
    P.push({ key: `${key}-plug`, mat: mat.panel, size: depth, pos: c, explode, from: slide, win: w, kind: 'plug' });
    const isDoor = o.sill === 0;
    const pane: V3 = rotY ? [0.035, o.h - 0.05, o.w - 0.05] : [o.w - 0.05, o.h - 0.05, 0.035];
    P.push({
      key: `${key}-fill`,
      mat: isDoor ? mat.shell : mat.glass,
      size: pane,
      pos: [c[0] + dir[0] * 0.02, c[1], c[2] + dir[2] * 0.02],
      explode,
      from: [dir[0] * 0.9, 0, dir[2] * 0.9],
      win: [0.655, 0.7],
      kind: 'pop',
    });
  };

  const bayX = (b: number) => -2.4 + b * BAY;
  const frontOpenings: Record<number, Opening> = { 1: WINDOW, 3: DOOR, 4: WINDOW };
  for (let b = 0; b < 6; b++) exterior(`ext-f${b}`, [bayX(b), PANEL_Y, 1.44], 0, [0, 0, 1], b, 18, frontOpenings[b]);
  for (let b = 0; b < 6; b++) exterior(`ext-b${b}`, [bayX(b), PANEL_Y, -1.44], 0, [0, 0, -1], 6 + b, 18, b === 2 ? WINDOW : undefined);
  for (let b = 0; b < 3; b++) {
    const z = -0.92 + b * 0.92;
    exterior(`ext-r${b}`, [2.94, PANEL_Y, z], Math.PI / 2, [1, 0, 0], 12 + b, 18, b === 1 ? CLERESTORY : undefined);
    exterior(`ext-l${b}`, [-2.94, PANEL_Y, z], Math.PI / 2, [-1, 0, 0], 15 + b, 18);
  }

  // Interior panels (thinner): drop in from above, with internal access openings.
  [
    { x: -1.8, o: 0.72 },
    { x: 1.3, o: -0.6 },
  ].forEach(({ x, o }, k) =>
    P.push({
      key: `int${k}`,
      geo: panelGeometry(2.74, PANEL_H, 0.06, { w: 0.78, h: 2.04, sill: 0, x: o }),
      mat: mat.panel,
      pos: [x, PANEL_Y, 0],
      rotY: Math.PI / 2,
      explode: [0, 1.35, 0],
      from: [0, 4.2, 0],
      win: [0.6 + k * 0.02, 0.648 + k * 0.02],
    }),
  );

  // Roof closes the shell; lifting hooks at its corners, as on the render.
  const roofWin: [number, number] = [0.668, 0.715];
  P.push({ key: 'roof', mat: mat.fascia, size: [L + 0.08, 0.2, 3.08], pos: [0, RB + 0.1, 0], explode: [0, 2.9, 0], from: [0, 3.6, 0], win: roofWin });
  [
    [1, 1, 0],
    [-1, 1, -Math.PI / 2],
    [-1, -1, Math.PI],
    [1, -1, Math.PI / 2],
  ].forEach(([sx, sz, ry]) =>
    P.push({
      key: `hook${sx}${sz}`,
      geo: hookCleatGeometry(),
      mat: mat.steel,
      pos: [sx * 3.04, RT, sz * 1.54],
      rotY: ry,
      explode: [0, 2.9, 0],
      from: [0, 3.6, 0],
      win: roofWin,
    }),
  );

  for (const sz of [-1, 1])
    for (const x of [-2, -1, 0, 1, 2])
      P.push({ key: `cleat${sz}${x}`, geo: cleatGeometry(), mat: mat.galv, pos: [x, RT, sz * 1.47], explode: [0, 2.9, 0], from: [0, 3.6, 0], win: roofWin });

  /* --- 3.3 Add-ons: drop from the top, in the brief's order --- */
  const drop: V3 = [0, 7, 0];
  const deckOut: V3 = [0, 0, 1.9];
  const add = (tag: number, part: Omit<Part, 'win' | 'from' | 'tag'> & { from?: V3 }) =>
    P.push({ from: drop, ...part, tag, win: addOnWindow(tag) });

  add(0, { key: 'deck', mat: mat.deck, size: [2.7, 0.1, 1.36], pos: [1.45, FT - 0.05, 2.2], explode: deckOut });
  for (const x of [0.2, 2.7]) for (const z of [1.66, 2.78]) add(1, { key: `dpost${x}${z}`, mat: mat.trim, size: [0.09, FT - 0.1 - GL, 0.09], pos: [x, GL + (FT - 0.1 - GL) / 2, z], explode: deckOut });
  add(2, { key: 'span-f', mat: mat.trim, size: [2.74, 0.18, 0.04], pos: [1.45, FT - 0.11, 2.9], explode: deckOut });
  for (const x of [0.08, 2.82]) add(2, { key: `span-s${x}`, mat: mat.trim, size: [0.04, 0.18, 1.36], pos: [x, FT - 0.11, 2.2], explode: deckOut });
  add(3, {
    key: 'rail',
    geo: railGeometry('home-deck', [[0.12, 2.84], [2.78, 2.84], [2.78, 1.56]], 0.95, 0.9),
    mat: mat.steel,
    pos: [0, FT, 0],
    explode: [0, 0.7, 1.9],
  });
  add(4, { key: 'steps', geo: stairGeometry('home-5', 1.2, FT - GL, 1.4, 5), mat: [mat.deck, mat.trim], pos: [-1.3, GL, 2.2], explode: [-1.1, 0, 1.9] });
  for (const b of [1, 3, 4])
    add(5, { key: `shade${b}`, mat: mat.polycarb, size: [0.98, 0.03, 0.55], pos: [bayX(b), FT + 2.3, 1.74], rotX: 0.2, explode: [0, 1.35, 2.5] });
  add(6, {
    key: 'sloped-roof',
    geo: slopedRoofGeometry(ROOF.len, ROOF.depth, ROOF.rise, ROOF.eave),
    mat: mat.plate,
    pos: [0, RT, 0],
    explode: [0, 4.3, 0],
  });
  const pitch = Math.atan2(ROOF.rise - ROOF.eave, ROOF.depth);
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 2; r++) {
      const z = -0.72 + r * 1.3;
      const y = RT + ROOF.eave + (ROOF.rise - ROOF.eave) * (0.5 - z / ROOF.depth) + 0.035;
      add(7, { key: `solar${c}${r}`, mat: mat.solar, size: [1.72, 0.035, 1.16], pos: [-1.85 + c * 1.85, y, z], rotX: pitch, explode: [0, 5.3, 0] });
    }

  return P;
}

let PARTS: Part[] | null = null;
const parts = () => (PARTS ??= buildParts());

/** Where the pointer-highlight lands for each add-on tag. */
const TAG_ANCHOR: V3[] = [
  [1.45, FT, 2.2],
  [2.7, GL + 0.4, 2.78],
  [1.45, FT - 0.11, 2.92],
  [2.78, FT + 0.95, 2.2],
  [-0.8, GL + 0.4, 2.2],
  [bayXStatic(3), FT + 2.3, 1.9],
  [0, RT + 0.6, 0.4],
  [0, RT + 0.75, -0.1],
];
function bayXStatic(b: number) {
  return -2.4 + b * BAY;
}

const CAM: CameraKey[] = [
  { p: 0, look: [0.3, 2.75, 0.4], pos: [11.5, 7.4, 15] },
  { p: EXPLODE.to, look: [0.3, 4.9, 0.6], pos: [18, 11.8, 24] },
  { p: EXPLODE.holdTo, look: [0.3, 4.9, 0.6], pos: [18.6, 11.6, 23.4] },
  { p: 0.3, look: [0, 0.9, 0.3], pos: [7.4, 4.9, 10.2] },
  { p: 0.42, look: [0, 1.0, 0.3], pos: [8.2, 4.6, 9.6] },
  { p: 0.52, look: [0, 2.7, 0], pos: [11, 8.2, 14] },
  { p: 0.7, look: [0, 2.8, 0.2], pos: [9.6, 8.6, 15] },
  { p: 0.8, look: [0.5, 2.9, 0.8], pos: [12, 7.6, 16.5] },
  { p: 1, look: [0.5, 3.1, 0.8], pos: [13.5, 8.4, 17] },
];

function Director({ progress, rig }: Pick<SceneProps, 'progress'> & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const c = sampleCamera(CAM, progress.value);
    aim(camera, c.pos, c.look, size.width / size.height, 1.45, 0.5);
    rig.lightTarget.set(0, 0, 0);
  });
  return null;
}

function TerrainGrid({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<LineSegments<BufferGeometry, LineBasicMaterial>>(null);
  const geo = useMemo(
    () =>
      memo('grid-1m', () => {
        const pts: number[] = [];
        const R = 14;
        for (let i = -R; i <= R; i++) pts.push(-R, 0, i, R, 0, i, i, 0, -R, i, 0, R);
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pts, 3));
        return g;
      }),
    [],
  );
  useFrame(() => {
    const m = ref.current;
    if (m) m.material.opacity = 0.04 + 0.1 * hold(progress.value, FOUNDATION.from - 0.02, 0.5, 0.04);
  });
  return (
    <lineSegments ref={ref} geometry={geo} position-y={GL + 0.004}>
      <lineBasicMaterial color="#f2f0eb" transparent opacity={0.03} />
    </lineSegments>
  );
}

function Home({ progress, place }: SceneProps) {
  const refs = useRef<(Mesh | null)[]>([]);
  const list = parts();
  const label = useLabel(place);

  useFrame(() => {
    const p = progress.value;
    const exploded = win(p, EXPLODE.from, EXPLODE.to, ease.inOutCubic);
    const leave = win(p, EXPLODE.holdTo, EXPLODE.clearTo, ease.in);
    const overview = p < EXPLODE.clearTo;
    const screw = win(p, FOUNDATION.from + 0.11, FOUNDATION.to - 0.015, ease.inOut);
    const open = win(p, 0.622, 0.66, ease.inOut);

    for (let i = 0; i < list.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const d = list[i];
      const base = d.size ?? ONE;
      let x = d.pos[0];
      let y = d.pos[1];
      let z = d.pos[2];
      let s = 1;

      if (overview) {
        x += d.explode[0] * exploded;
        y += d.explode[1] * exploded + leave * 9;
        z += d.explode[2] * exploded;
        s = 1 - leave;
        if (d.kind === 'plug') s = 0;
      } else {
        const raw = clamp01((p - d.win[0]) / (d.win[1] - d.win[0]));
        const t = ease.outQuart(raw);
        x += d.from[0] * (1 - t);
        y += d.from[1] * (1 - t);
        z += d.from[2] * (1 - t);
        s = raw <= 0 ? 0 : Math.min(1, raw * 6);
        if (d.kind === 'pop') s = ease.out(raw);
        if (d.kind === 'plug') {
          // The cut-out retreats into the wall and is gone.
          s *= 1 - open;
          x -= Math.sign(d.explode[0]) * open * 0.35;
          z -= Math.sign(d.explode[2]) * open * 0.35;
        }
        if (d.kind === 'screw') {
          // Height is set on the jack thread.
          if (d.geo === SCREW) y -= (1 - screw) * 0.06;
          m.rotation.y = screw * Math.PI * 6;
        }
      }

      m.visible = s > 0.001;
      m.position.set(x, y, z);
      m.scale.set(base[0] * s, base[1] * s, base[2] * s);
    }

    /* Callouts */
    const layers = hold(p, EXPLODE.to - 0.01, EXPLODE.holdTo, 0.02);
    label('layer-addons', -3.6, RT + 5.2, 0, layers);
    label('layer-shell', -4.9, FT + 2.6, 0, layers);
    label('layer-foundation', -3.4, GL + 0.4, 1.6, layers);

    const f = (a: number) => hold(p, a, FOUNDATION.to + 0.005, 0.015);
    label('plug-footing', 3, GL + 0.15, 1.5, f(FOUNDATION.from + 0.06));
    label('l-plinth', -1.2, GL + ABOVE, 1.5, f(FOUNDATION.from + 0.105));
    label('jack-pier', -3, FB, -1.5, f(FOUNDATION.from + 0.135));
    label('above-ground', 3.55, GL + ABOVE / 2, 1.5, f(FOUNDATION.from + 0.1));

    label('frame', -1.4, RB, 1.5, hold(p, 0.535, 0.59, 0.012));
    label('ext-panel', bayXStatic(0), FT + 1.9, 1.52, hold(p, 0.575, 0.625, 0.012));
    label('int-panel', -1.8, RB + 0.1, 0.4, hold(p, 0.625, 0.672, 0.012));

    const tag = progress.focus;
    const anchor = tag >= 0 ? TAG_ANCHOR[tag] : null;
    label('addon', anchor?.[0] ?? 0, anchor?.[1] ?? 0, anchor?.[2] ?? 0, anchor && p > ADDONS.from ? 1 : 0);
  });

  return (
    <>
      {list.map((d, i) => (
        <mesh
          key={d.key}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={d.geo ?? UNIT_BOX}
          material={d.mat}
          rotation={[d.rotX ?? 0, d.rotY ?? 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

const ONE: V3 = [1, 1, 1];
const SCREW = jackScrewGeometry();

/** The ground the foundation sits in: a see-through block so the buried 220 mm reads. */
function GroundBlock({ progress }: Pick<SceneProps, 'progress'>) {
  const ref = useRef<Mesh>(null);
  const material = useMemo(() => new MeshStandardMaterial({ color: '#6b5440', roughness: 1, transparent: true, opacity: 0, depthWrite: false }), []);
  useFrame(() => {
    const o = hold(progress.value, FOUNDATION.from - 0.01, 0.56, 0.04) * 0.42;
    material.opacity = o;
    if (ref.current) ref.current.visible = o > 0.005;
  });
  return (
    <mesh ref={ref} material={material} position={[0, GL / 2, 0]} renderOrder={5}>
      <boxGeometry args={[9.2, GL, 5.6]} />
    </mesh>
  );
}

function Components(props: SceneProps & { rig: Rig }) {
  return (
    <>
      <Director progress={props.progress} rig={props.rig} />
      <TerrainGrid progress={props.progress} />
      <Home {...props} />
      <GroundBlock progress={props.progress} />
    </>
  );
}

export default function ComponentsScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioDark" ground="floor" focus={[0.65, 0.55]} focusCompact={[0.5, 0.38]} shadowExtent={13} fogRange={[30, 80]}>
      {(rig) => <Components {...props} rig={rig} />}
    </Stage>
  );
}
