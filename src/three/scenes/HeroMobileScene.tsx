import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ShadowMaterial, Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { podLengths } from '../../data/narrative';
import { heroChoice } from '../../film/heroChoice';
import { HERO_CUTS } from '../../film/heroTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, useWarmAll, type Rig } from '../Stage';
import { Capsule, InstitutionalBlock, WORK_BAYS, WorkforceBlock } from '../kit/buildings';
import { POD_HOME } from '../kit/capsule';
import { INST_BOX, LENS, blend, cornersOf, dirOf, newPose, placeOf, poseAt, poseInRect, posesAlong, turned, type Pose, type Shot } from '../kit/frame';
import { LOOKS } from '../kit/looks';
import { useMirror } from '../kit/mirror';
import { PLAZA_Y, PlazaFloor, plazaMaterial } from '../kit/plaza';
import { Refined } from '../kit/refined';
import { FARM_YAW, HOUSE_BOX, blockBox, rowFor, type Box } from '../kit/row';
import { HouseAlone } from '../kit/sets';

/**
 * The hero on a phone or a tablet held upright (the mobile and tablet
 * round, 2026-10-14, after the developer's reference screens: the building
 * large, on a polished floor, "very less on background and more on the
 * product itself"), and on a budget tablet held sideways (film/tier.ts).
 * Desktop has HeroScene, which this does not touch.
 *
 * The opening card: "One system. Many buildings." over the three kinds of
 * building. On a phone one stands on the floor at a time; the visitor goes
 * from one to the next with the card's cards, its arrows or a sideways
 * swipe (developer: "the landing page shows that 3 building in that card
 * option"; Hero.tsx sets `heroChoice.kind`). The one on show goes back down
 * into the floor and the chosen one comes up, whole, its lights on once it
 * stands, and the camera eases over to it; each is named on the floor under
 * it. On a clock, a second or so: these are the visitor's own choices, not
 * the scroll's. On a tablet held sideways the three stand together, one
 * behind another as on desktop, and come up one after another (2026-10-15:
 * "in tab horizontal view it only shows one building in landing slide").
 *
 * Scrolling down then opens the card: the kind on show (on a tablet held
 * sideways, the two behind the house) goes down, the house comes up, and
 * the camera goes to it. The card is as it was: the developer, 2026-10-15,
 * "the drowning and spanning animation is good in the page one system many
 * building. no changes in that".
 *
 * After that the four steps are scrolled through, as on desktop ("vertical
 * to move hero sections"), and since 2026-10-15 nothing goes down into the
 * floor or comes up out of it between them ("for the next 4 hero slides, we
 * don't keep drowning and spanning, we will have a proper professional
 * animation"). The buildings stand in a row across one showroom floor, far
 * enough apart that none is in another's picture: the house, the capsule
 * in its three lengths, 10′, 16′ and 20′, the block, the institutional
 * building. At each cut the camera glides from one to the next, drawing
 * back as it goes so that what it leaves and what it comes to are both in
 * the picture on the way, and comes in to the next as the caption changes:
 * a dolly through the showroom. Choosing the capsule's length glides along
 * its three the same way; passing the smaller ones on the way to the 20′,
 * the eye has the three side by side (2026-10-15: "the user should
 * understand the size by looking at it"). Only what the camera is on, or
 * between, is drawn. The capsule is shown at dusk, and the floor and the
 * shade darken with its caption, which is set on ink.
 *
 * The house, the capsules and the block are the card's, in its refined
 * finishes; the institutional building is in its materials as they were
 * (CLAUDE.md: no other building takes the refined finishes without being
 * asked), its two 36′ panels gliding in. No land, no sky, no mist.
 *
 * In the steps each building fills the band its caption leaves under it
 * (Stage, `frame`); on the card, the room between the headline and the
 * cards (`poseInRect`).
 */

const CUTS = HERO_CUTS;
/** How far under the floor each kind starts on the card: house, capsule, block. */
const UNDER = [4.6, 3.6, 7.4] as const;
/** The block's and the institutional building's own ground line is their set's pad: on the floor they stand this much lower. */
const PAD_Y = -0.06;
/** The card's scroll (0–1): up to here the kind on show goes and the house comes, and the camera goes to it. */
const LINEUP = 0.34;
/** Around each cut, in film progress: the camera glides from one building to the next, this much before the cut and this much after it. */
const GLIDE = [0.045, 0.055] as const;
/** In the middle of a glide the camera stands back far enough to have both buildings in the picture, and a little higher. */
const DOLLY = { rise: 0.06, margin: 2.5 };
/**
 * The card's and the capsule's choices, in seconds: the one on show goes
 * down (DOWN_S), the chosen one comes up (UP_S; the first, on load, more
 * slowly: FIRST_S, after WAIT_S), its lights come on (LIT_S); the camera
 * eases over at EASE a second. On a tablet held sideways the three come up
 * one after another, each when the one before it is NEXT of the way up.
 */
const CLOCK = { DOWN_S: 0.55, UP_S: 1.05, FIRST_S: 1.6, WAIT_S: 0.35, LIT_S: 0.8, EASE: 3.4, NEXT: 0.55 } as const;
const GLOSS = 0.72;
const FLOOR_SHADOW = LOOKS.card.shadow.opacity;
const SHADOW_Y = PLAZA_Y + 0.01;
const FT = 0.3048;
/** The capsule's box, on its home-like section (capsule.ts, POD_HOME): steps in front, legs and hull up. */
const capsuleBox = (feet: number): Box => [-(feet * FT) / 2 - 0.03, (feet * FT) / 2 + 0.03, -POD_HOME.D / 2 - 0.05, POD_HOME.D / 2 + 0.7, POD_HOME.legs + POD_HOME.H + 0.05];
/** The prefab block here is the workforce set's whole block (developer: "same for prefabs"), not the opening card's shorter one of the desktop. */
const BAYS = WORK_BAYS;
const PODS = podLengths;

/**
 * The steps' framings (in the band), in the showroom's order: the house,
 * the capsule in each length, the block, the institutional building. Each
 * fills its picture; the capsule most of all, whatever its length
 * (2026-10-15: "in the screen it should cover the major areas, should not
 * leave empty spaces"), its size told by its door, its steps and the
 * floor's three-metre slabs.
 */
const SHOTS: Shot[] = [
  { box: HOUSE_BOX, base: 0, turn: [0.78, 0.46], el: 0.13, fill: [0.9, 0.78] },
  ...PODS.map((f): Shot => ({ box: capsuleBox(f), base: 0, turn: [0.62, 0.34], el: 0.12, fill: [0.96, 0.84], lift: 0.1 })),
  // From the left: its staircase stands against that flank (the developer's prefab screen).
  { box: blockBox(BAYS), base: PAD_Y, turn: [-0.66, -0.42], el: 0.15, fill: [0.9, 0.76] },
  { box: INST_BOX, base: PAD_Y, turn: [1.06, 0.86], el: 0.1, fill: [1.45, 0.74], anchor: { side: 1, at: 0.9 } },
];
const HOUSE = 0;
const POD = (j: number) => 1 + j;
const BLOCK = 1 + PODS.length;
const INST = BLOCK + 1;

/** The card's framings (in its room): the house, the capsule in each length, the block, each seen on the diagonal. */
const CARD: Shot[] = [
  { box: HOUSE_BOX, base: 0, turn: [0.64, 0.64], el: 0.15, fill: [0.9, 0.84] },
  ...PODS.map((f): Shot => ({ box: capsuleBox(f), base: 0, turn: [0.56, 0.56], el: 0.13, fill: [0.92, 0.72] })),
  { box: blockBox(BAYS), base: PAD_Y, turn: [-0.6, -0.6], el: 0.16, fill: [0.95, 0.84] },
];
/** Card shot for kind k (0 house, 1 capsule, 2 block) with the capsule at length j. */
const cardShot = (k: number, j: number) => (k === 0 ? 0 : k === 1 ? 1 + j : 1 + PODS.length);

/**
 * A tablet held sideways: the three on the card one behind another, as the
 * desktop's card has them (kit/row.ts), the capsule in its longest length
 * and the block as it is here. Seen together, from a little above eye level.
 */
const ROW = rowFor(0.3, 2);
const ROW_AT = [new Vector3(0, 0, 0), new Vector3(...ROW.capsule.at), new Vector3(...ROW.prefab.at)];
const ROW_SHOT: Shot = { box: HOUSE_BOX, base: 0, turn: [0.6, 0.6], el: 0.11, fill: [0.94, 0.86] };
const rowCorners = () => {
  const lift = (s: Shot, at: Vector3) => cornersOf(s).map((q) => q.add(at));
  return [...lift(SHOTS[HOUSE], ROW_AT[0]), ...lift(SHOTS[POD(PODS.length - 1)], ROW_AT[1]), ...lift(SHOTS[BLOCK], ROW_AT[2])];
};

/** How far in front of each kind's middle its name hangs on the card: its box's front, on its own plan. */
const NAME_Z = [HOUSE_BOX[3] + 1.3, POD_HOME.D / 2 + 1.4, blockBox(BAYS)[3] + 0.7];
const KIND_IDS = ['mod', 'pod', 'fab'] as const;

const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
const setAt = (p: number) => {
  let i = 0;
  while (i < CUTS.length && p >= CUTS[i]) i++;
  return i;
};
/** Where each step's own stretch begins and ends, its glides excluded. */
const STRETCH: [number, number][] = [0, 1, 2, 3].map((k) => [k === 0 ? 0 : CUTS[k - 1] + GLIDE[1], k === 3 ? 1 : CUTS[k] - GLIDE[0]]);

const _look = [0, 0, 0];
const _pos = [0, 0, 0];
const _P = newPose();
const _Q = newPose();
const _R = newPose();
const _S = newPose();
const _v = new Vector3();
const _d = new Vector3();
const _off = new Vector3();
const ZERO = new Vector3();

/** Floor tones: the card's pale slab, and the capsule's dusk. */
const FLOOR_DAY = new Color('#f2ede4');
const FLOOR_DUSK = new Color('#3c3646');

/**
 * The card's room for its building, in canvas pixels (left, top, right,
 * bottom): under the headline and over the cards, with the name's room
 * under the building. Sideways (`wide`), right of the headline.
 */
function cardRoom(canvas: HTMLCanvasElement, wide: boolean): [number, number, number, number] | null {
  const sticky = canvas.closest<HTMLElement>('.film__sticky');
  const line = sticky?.querySelector<HTMLElement>('.prelude__line');
  if (!sticky || !line) return null;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const box = canvas.getBoundingClientRect();
  const words = line.getBoundingClientRect();
  const pick = sticky.querySelector<HTMLElement>('.prelude__pick');
  const foot = pick && pick.offsetHeight ? pick.getBoundingClientRect().top - box.top : h - 1.2 * rem;
  const gutter = Math.min(4 * rem, Math.max(rem, 0.04 * window.innerWidth));
  const name = 3.4 * rem;
  if (wide) {
    let right = 0;
    const range = document.createRange();
    for (const ln of line.querySelectorAll<HTMLElement>('.prelude__ln > span')) {
      range.selectNodeContents(ln);
      right = Math.max(right, range.getBoundingClientRect().right - box.left);
    }
    const hdr = document.querySelector<HTMLElement>('[data-hdr]')?.offsetHeight ?? 60;
    return [Math.min(w * 0.5, right + 1.5 * rem), hdr + rem, w - gutter, foot - name];
  }
  return [gutter * 0.7, words.bottom - box.top + 1.1 * rem, w - gutter * 0.7, foot - name];
}

/** Is every corner of a box, moved by `off`, out of the picture a pose makes, on that side (1 right, -1 left), or behind the camera? */
function outside(probe: PerspectiveCamera, pose: Pose, corners: Vector3[], off: Vector3, aspect: number, side: 1 | -1) {
  probe.fov = LENS;
  probe.aspect = aspect;
  probe.clearViewOffset();
  probe.updateProjectionMatrix();
  dirOf(pose.az, pose.el, _d);
  probe.position.copy(pose.look).addScaledVector(_d, pose.d);
  probe.lookAt(pose.look);
  probe.updateMatrixWorld();
  for (const q of corners) {
    _v.copy(q).add(off).project(probe);
    if (_v.z > 1) continue;
    if (side > 0 ? _v.x < 1.04 : _v.x > -1.04) return false;
  }
  return true;
}

/**
 * The showroom for a picture of this shape: each building's framings, and
 * where it stands. Each stands to the right of the one before it as the
 * camera sees that one when it leaves it (on its line, or a little nearer
 * the camera or farther, whichever is shortest), as near as it may be
 * while out of that picture, with the one before it out of its own. For the
 * capsule's lengths, wherever along its turn the camera is.
 */
function showroom(probe: PerspectiveCamera, corners: Vector3[][], aspect: number, check: number) {
  const list = SHOTS.map((s, k) => posesAlong(probe, s, corners[k], aspect));
  const spots = SHOTS.map(() => new Vector3());
  const ends = (k: number): [number, number][] => (k >= POD(0) && k < POD(PODS.length - 1) ? [0, 0.5, 1].map((u) => [u, u]) : [[1, 0]]);
  for (let k = 1; k < SHOTS.length; k++) {
    const a = list[k - 1];
    const b = list[k];
    const at = (l: Pose[], u: number) => poseAt(l, u, newPose(), false);
    let best = Infinity;
    let bestDir = new Vector3(1, 0, 0);
    for (const tilt of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const leave = at(a, ends(k - 1)[0][0]);
      const az = leave.az - tilt;
      const dir = new Vector3(Math.cos(az), 0, -Math.sin(az));
      let s = 2;
      for (; s < 240; s += 0.5) {
        _off.copy(dir).multiplyScalar(s);
        const ok = ends(k - 1).every(([ua, ub]) => {
          const pa = at(a, ua);
          const pb = at(b, ub);
          pb.look.add(_off);
          return outside(probe, pa, corners[k], _off, check, 1) && outside(probe, pb, corners[k - 1], ZERO, check, -1);
        });
        if (ok) break;
      }
      if (s < best) {
        best = s;
        bestDir = dir;
      }
    }
    spots[k].copy(spots[k - 1]).addScaledVector(bestDir, best);
  }
  list.forEach((l, k) => l.forEach((p) => p.look.add(spots[k])));
  return { list, spots };
}

function Showroom({ progress, place, reduced, compact, rig }: SceneProps & { rig: Rig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const label = useLabel(place);
  const all = useRef<Group>(null);
  const house = useRef<Group>(null);
  const pods = useMemo(() => PODS.map(() => ({ current: null as Group | null })), []);
  const block = useRef<Group>(null);
  const campus = useRef<Group>(null);
  /** Its own plan, turned with the floor: what its labels are placed on. */
  const campusPlan = useRef<Group>(null);
  const mirror = useRef<Group>(null);
  const floor = useRef<Mesh>(null);
  const plaza = useMemo(() => plazaMaterial(FARM_YAW), []);
  useEffect(() => () => plaza.material.dispose(), [plaza]);
  useMirror(rig, mirror, [house, ...pods, block, campus], () => GLOSS, plaza.grid);
  useWarmAll(rig, all);
  const shadow = useMemo(() => new ShadowMaterial({ color: LOOKS.card.shadow.color, opacity: FLOOR_SHADOW, transparent: true }), []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const probe = useMemo(() => camera.clone(), [camera]);
  const corners = useMemo(() => SHOTS.map(cornersOf), []);
  const cardCorners = useMemo(() => CARD.map(cornersOf), []);
  const lineup = useMemo(rowCorners, []);
  /** A tablet held sideways (not a compact layout): the desktop's layout of the card, the three together. */
  const wide = !compact;

  // No land and no sky here, ever: the page's shade stands behind the canvas wherever the floor is not.
  useEffect(() => {
    rig.sky = 0;
    rig.clear[3] = 0;
    plaza.near.set(0, 1, 1e5, 1e5 + 1);
  }, [rig, plaza]);
  // The section says it has the showroom: its shade then stays behind the whole film and goes to dusk for the capsule (film.css). An attribute, which React leaves alone.
  useEffect(() => {
    const film = gl.domElement.closest<HTMLElement>('.film');
    film?.setAttribute('data-showroom', '');
    return () => film?.removeAttribute('data-showroom');
  }, [gl]);
  // A choice made on the card or under the capsule: draw.
  useEffect(() => {
    heroChoice.listeners.add(invalidate);
    return () => {
      heroChoice.listeners.delete(invalidate);
    };
  }, [invalidate]);

  /** The showroom for the band's shape, worked out once a shape. */
  const room = useRef<{ key: string; list: Pose[][]; spots: Vector3[] }>({ key: '', list: [], spots: [] });
  const showroomFor = (aspect: number, check: number) => {
    const key = `${aspect.toFixed(3)}:${check.toFixed(3)}`;
    if (room.current.key !== key) room.current = { key, ...showroom(probe, corners, aspect, check) };
    return room.current;
  };
  /** The card's framings, for its room on this screen, through the camera as it stands; again at each size and once the fonts are in. */
  const fonts = useRef(0);
  useEffect(() => {
    const again = () => {
      fonts.current++;
      invalidate();
    };
    document.fonts?.ready.then(again);
    window.addEventListener('vee:booted', again);
    return () => window.removeEventListener('vee:booted', again);
  }, [invalidate]);
  const cardPoses = useRef<{ key: string; list: Pose[] }>({ key: '', list: [] });
  const cardPosesNow = () => {
    const v = camera.view;
    // The card's cards come after the scene can draw: the room is measured again when they are there.
    const pick = gl.domElement.closest('.film__sticky')?.querySelector('.prelude__pick') ? 1 : 0;
    const key = `${size.width}x${size.height}-${fonts.current}-${camera.fov.toFixed(3)}-${v ? v.offsetY.toFixed(1) : 0}-${pick}-${wide}`;
    if (cardPoses.current.key === key) return cardPoses.current.list;
    const sideways = size.width > size.height * 1.2;
    const at = cardRoom(gl.domElement, sideways) ?? [12, size.height * 0.3, size.width - 12, size.height * 0.78];
    probe.fov = camera.fov;
    probe.aspect = camera.aspect;
    if (v) probe.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    else probe.clearViewOffset();
    probe.updateProjectionMatrix();
    let list: Pose[];
    if (wide) {
      const row = poseInRect(probe, ROW_SHOT, lineup, ROW_SHOT.turn[0], at, size.width, size.height);
      list = CARD.map(() => row);
    } else list = CARD.map((s, k) => poseInRect(probe, s, cardCorners[k], s.turn[0], at, size.width, size.height));
    cardPoses.current = { key, list };
    return list;
  };

  // The first kind comes up once the loading screen has lifted.
  const booting = useRef(typeof document !== 'undefined' && document.documentElement.classList.contains('is-booting'));
  useEffect(() => {
    if (!booting.current) return;
    const go = () => {
      booting.current = false;
      invalidate();
    };
    window.addEventListener('vee:booted', go, { once: true });
    return () => window.removeEventListener('vee:booted', go);
  }, [invalidate]);

  /**
   * The visitor's choices, on a clock: the card's three (house, capsule,
   * block) and the capsule's three lengths. The card's: how far up (0–1),
   * its lights (0–1), the card's camera, eased to the chosen one. The
   * capsule's: where along its three the camera is (0 the 10′, 2 the 20′).
   */
  const clock = useMemo(
    () => ({
      started: 0,
      first: !reduced,
      card: { rise: [0, 0, 0], lit: [0, 0, 0], cam: newPose(), placed: false },
      pod: { at: Math.max(0, PODS.indexOf(heroChoice.feet as (typeof PODS)[number])) },
    }),
    [reduced],
  );

  /** What the scroll and the clock make of it this frame: how far up each stands on the card, and whether the card is up. */
  const now = useMemo(() => ({ p: 0, i: 0, pre: 0, lead: 0, onCard: true, house: 0, capsule: 0, block: 0 }), []);
  const lights = useMemo(() => {
    return {
      house: () => {
        if (now.house < 0.999) return 0;
        if (!now.onCard) return 1;
        return heroChoice.kind === 0 || wide ? clock.card.lit[0] : span(now.lead, [0.9, 1]);
      },
      // In the steps every capsule stands, and is lit; on the card only the one on show, once it stands.
      pod: PODS.map((_, j) => () => {
        if (!now.onCard) return 1;
        const shown = wide ? PODS.length - 1 : Math.round(clock.pod.at);
        return j === shown && now.capsule >= 0.999 ? clock.card.lit[1] : 0;
      }),
      block: () => (!now.onCard ? 1 : now.block < 0.999 ? 0 : clock.card.lit[2]),
      // The institutional building is whole when the camera comes to it, but for its last wall panels, which come in with the scroll.
      campusA: () => 0.7 + 0.3 * span(now.p, [CUTS[2] + GLIDE[1] * 0.5, 0.95]),
      campusShow: () => (setAt(now.p) === 3 ? 1 : 0),
    };
  }, [now, clock, wide]);

  /** The institutional building's labels are placed on its own plan: put into the showroom as it stands. */
  const campusLabel = useMemo(
    () => (id: string, x: number, y: number, z: number, o: number) => {
      const g = campusPlan.current;
      if (!g) return;
      g.updateMatrixWorld();
      _v.set(x, y, z).applyMatrix4(g.matrixWorld);
      label(id, _v.x, _v.y, _v.z, o);
    },
    [label],
  );

  useFrame((_, dt) => {
    const step = reduced ? 100 : Math.min(dt, 0.05);
    let moving = false;

    /* The visitor's choices, on the clock (only once the loading screen has lifted, and the first picture has stood a moment). */
    const c = wide ? 0 : heroChoice.kind;
    const fj = Math.max(0, PODS.indexOf(heroChoice.feet as (typeof PODS)[number]));
    if (!booting.current) {
      clock.started ||= performance.now();
      if (reduced || performance.now() - clock.started > CLOCK.WAIT_S * 1000) {
        const r = clock.card.rise;
        const l = clock.card.lit;
        const up = clock.first ? CLOCK.FIRST_S : CLOCK.UP_S;
        for (let k = 0; k < r.length; k++) {
          // A phone: the chosen one comes up once the others are down. Sideways: all three, one after another.
          const want = wide ? (k === 0 || r[k - 1] >= CLOCK.NEXT ? 1 : 0) : k === c && !r.some((v, q) => q !== c && v > 0) ? 1 : 0;
          const was = r[k];
          const next = want > was ? Math.min(1, was + step / up) : want < was ? Math.max(0, was - step / CLOCK.DOWN_S) : was;
          const lit = next >= 1 && want === 1 ? Math.min(1, l[k] + step / CLOCK.LIT_S) : 0;
          if (next !== was || lit !== l[k]) moving = true;
          r[k] = next;
          l[k] = lit;
        }
        if (r[wide ? 2 : c] >= 1) clock.first = false;
        // The capsule's length: the camera glides along its three to the one chosen.
        const at = clock.pod.at + (fj - clock.pod.at) * (reduced ? 1 : 1 - Math.exp(-step * CLOCK.EASE * 0.8));
        if (Math.abs(at - fj) > 0.001) moving = true;
        clock.pod.at = Math.abs(at - fj) > 0.001 ? at : fj;
      } else moving = true;
    }

    /* The scroll: the card, then the four steps. */
    const p = progress.value;
    const i = setAt(p);
    const pre = i === 0 ? progress.pre : 1;
    const lead = i === 0 ? clamp01(pre / LINEUP) : 1;
    const goes = 1 - span(lead, [0, 0.45]);
    const onCard = i === 0 && lead < 1;
    now.p = p;
    now.i = i;
    now.pre = pre;
    now.lead = lead;
    now.onCard = onCard;
    now.house = onCard ? Math.max(clock.card.rise[0], c === 0 ? 0 : span(lead, [0.5, 0.95])) : 1;
    now.capsule = onCard ? clock.card.rise[1] * goes : 0;
    now.block = onCard ? clock.card.rise[2] * goes : 0;

    /* The showroom: its framings and places for this picture's shape. */
    const aspect = (camera.userData.frameAspect as number | undefined) ?? (compact ? size.width / size.height : (0.56 * size.width) / size.height);
    // What must be out of a picture is out of the whole canvas: sideways the picture stands right of the words, with the canvas running on behind them.
    const show = showroomFor(aspect, compact ? aspect : (1.4 * size.width) / size.height);
    const { list, spots } = show;

    /** Building k's framing in the steps (k: 0 house, 1 capsule, 2 block, 3 institutional), `u` along its turn. */
    const stepPose = (k: number, u: number, out: Pose) => {
      if (k !== 1) return poseAt(list[k === 0 ? HOUSE : k === 2 ? BLOCK : INST], u, out);
      // The capsule, between the framings of the lengths it is going between: a glide along them.
      const a = Math.min(PODS.length - 2, Math.floor(clock.pod.at));
      poseAt(list[POD(a)], u, _R);
      poseAt(list[POD(a + 1)], u, _S);
      return glide(_R, _S, clock.pod.at - a, out, aspect);
    };
    /** Where along the showroom's row the steps' camera is, as a range of buildings (what is drawn): one, or the ones a glide is between. */
    const indexOf = (k: number) => (k === 0 ? HOUSE : k === 1 ? POD(clock.pod.at) : k === 2 ? BLOCK : INST);
    let lo = 0;
    let hi = 0;
    const pose = _P;
    let gliding = false;
    if (onCard || (i === 0 && pre < 1)) {
      // On the card: eased over to the chosen kind in its room; as the card opens, to the house in the band.
      const target = cardPosesNow()[cardShot(c, wide ? PODS.length - 1 : fj)];
      if (!clock.card.placed) {
        blend(target, target, 0, clock.card.cam);
        clock.card.placed = true;
      } else {
        blend(clock.card.cam, target, reduced ? 1 : 1 - Math.exp(-step * CLOCK.EASE), clock.card.cam);
        if (Math.abs(clock.card.cam.d - target.d) > 0.002 || clock.card.cam.look.distanceToSquared(target.look) > 1e-5 || Math.abs(clock.card.cam.az - target.az) > 1e-5) moving = true;
        else blend(target, target, 0, clock.card.cam);
      }
      blend(clock.card.cam, stepPose(0, 0, _Q), ease.inOut(lead), pose);
    } else {
      let g = -1;
      for (let k = 0; k < CUTS.length; k++) if (p > CUTS[k] - GLIDE[0] && p < CUTS[k] + GLIDE[1]) g = k;
      if (g >= 0) {
        // Across a cut: from where the camera leaves one building to where it finds the next.
        gliding = true;
        stepPose(g, 1, _Q);
        stepPose(g + 1, 0, pose);
        glide(_Q, pose, span(p, [CUTS[g] - GLIDE[0], CUTS[g] + GLIDE[1]]), pose, aspect);
        lo = Math.min(indexOf(g), indexOf(g + 1));
        hi = Math.max(indexOf(g), indexOf(g + 1));
      } else {
        stepPose(i, span(p, STRETCH[i]), pose);
        lo = hi = indexOf(i);
      }
    }
    placeOf(pose, _pos, _look);
    aim(camera, _pos, _look, 1, 1, 0);
    rig.lightTarget.set(_look[0], 0, _look[2]);

    /* Each where it stands: on the card, where the card has it, coming up or going down; in the steps, standing in its place in the row, drawn while the camera is on it or passes it. */
    const drawn = (k: number) => !onCard && k >= Math.floor(lo + 1e-4) && k <= Math.ceil(hi - 1e-4);
    const put = (g: Group | null, at: Vector3, base: number, t: number, under: number, shown: boolean) => {
      if (!g) return;
      g.visible = shown && t > 0.0005;
      g.position.set(at.x, base - (1 - ease.out(t)) * under, at.z);
    };
    const card = (k: number) => (wide ? ROW_AT[k] : ROW_AT[0]);
    put(house.current, spots[HOUSE], 0, now.house, UNDER[0], onCard || drawn(HOUSE));
    const shownPod = wide ? PODS.length - 1 : Math.round(clock.pod.at);
    pods.forEach((ref, j) => {
      if (onCard) put(ref.current, card(1), 0, j === shownPod ? now.capsule : 0, UNDER[1], true);
      else put(ref.current, spots[POD(j)], 0, 1, 0, drawn(POD(j)));
    });
    if (onCard) put(block.current, card(2), PAD_Y, now.block, UNDER[2], true);
    else put(block.current, spots[BLOCK], PAD_Y, 1, 0, drawn(BLOCK));
    put(campus.current, spots[INST], PAD_Y, 1, 0, drawn(INST));

    /* The floor: an island round what is looked at, larger with the distance; at dusk for the capsule's step. */
    const r = Math.max(14, pose.d * 1.15);
    plaza.fade.set(_look[0], _look[2], r, r * 2.4);
    const dusk = span(p, [CUTS[0] - 0.012, CUTS[0] + 0.03]) * (1 - span(p, [CUTS[1] - 0.03, CUTS[1] + 0.012]));
    plaza.material.color.lerpColors(FLOOR_DAY, FLOOR_DUSK, dusk);
    shadow.opacity = lerp(FLOOR_SHADOW, 0.75, dusk);
    if (floor.current) floor.current.position.set(_look[0], SHADOW_Y, _look[2]);

    /* Names: on the card, each kind on show under it, once it stands; the capsule's length in its step. */
    const named = onCard ? clamp01(1 - pre * 9) : 0;
    KIND_IDS.forEach((id, k) => {
      const [x, z] = turned(0, NAME_Z[k]);
      const at = card(k);
      label(`kind-${id}`, at.x + x, 0, at.z + z, wide || k === c ? named * clock.card.lit[k] : 0);
    });
    const podShown = !onCard && i === 1 && !gliding ? 1 : 0;
    PODS.forEach((f, j) => {
      const [x, z] = turned(0, POD_HOME.D / 2 + 1.6);
      const settled = 1 - clamp01(Math.abs(clock.pod.at - j) * 4);
      label(`pod-${f}`, spots[POD(j)].x + x, 0.02, spots[POD(j)].z + z, podShown * settled);
    });

    if (moving) invalidate();
  });

  return (
    <group ref={all}>
      <PlazaFloor plaza={plaza} />
      <Refined value>
        <HouseAlone house={house} getLit={lights.house} look={LOOKS.card} />
        {PODS.map((f, j) => (
          <group key={f} ref={(g) => void (pods[j].current = g)}>
            <group rotation-y={FARM_YAW}>
              <Capsule feet={f} getT={() => 1} getLit={lights.pod[j]} look={LOOKS.card} section={POD_HOME} />
            </group>
          </group>
        ))}
        <group ref={block}>
          <group rotation-y={FARM_YAW}>
            <WorkforceBlock getA={() => 1} getLit={lights.block} look={LOOKS.card} crane={false} bays={BAYS} />
          </group>
        </group>
      </Refined>
      <group ref={campus}>
        <group ref={campusPlan} rotation-y={FARM_YAW}>
          <InstitutionalBlock getA={lights.campusA} label={campusLabel} getShow={lights.campusShow} look={LOOKS.card} />
        </group>
      </group>
      <group ref={mirror} />
      <mesh ref={floor} material={shadow} rotation-x={-Math.PI / 2} position={[0, SHADOW_Y, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
      </mesh>
    </group>
  );
}

/**
 * From one framing to another, as a dolly along the showroom: eased at both
 * ends, the camera standing back in the middle until what it leaves and what
 * it comes to are both in the picture, and a little higher.
 */
function glide(a: Pose, b: Pose, t: number, out: Pose, aspect: number) {
  const e = ease.inOutCubic(clamp01(t));
  const half = a.look.distanceTo(b.look) / 2;
  const da = a.d;
  const db = b.d;
  blend(a, b, e, out);
  const arc = Math.sin(Math.PI * e);
  const need = (half + DOLLY.margin) / (Math.tan((LENS * Math.PI) / 360) * Math.min(1, aspect));
  out.d += Math.max(0, need - Math.max(da, db)) * arc;
  out.el += DOLLY.rise * arc;
  return out;
}

export default function HeroMobileScene(props: SceneProps) {
  return (
    <Stage {...props} look="card" ground="none" focus={[0.7, 0.56]} focusCompact={[0.5, 0.6]} shadowExtent={22}>
      {(rig) => <Showroom {...props} rig={rig} />}
    </Stage>
  );
}
