import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ShadowMaterial, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { podLengths } from '../../data/narrative';
import { heroChoice } from '../../film/heroChoice';
import { HERO_CUTS } from '../../film/heroTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, useWarmAll, type Rig } from '../Stage';
import { Capsule, InstitutionalBlock, WORK_BAYS, WorkforceBlock } from '../kit/buildings';
import { POD_HOME } from '../kit/capsule';
import { INST_BOX, blend, cornersOf, newPose, placeOf, poseAt, poseInRect, posesAlong, turned, type Pose, type Shot } from '../kit/frame';
import { LOOKS } from '../kit/looks';
import { useMirror } from '../kit/mirror';
import { PLAZA_Y, PlazaFloor, plazaMaterial } from '../kit/plaza';
import { Refined } from '../kit/refined';
import { FARM_YAW, HOUSE_BOX, ROW_BAYS, blockBox, type Box } from '../kit/row';
import { HouseAlone } from '../kit/sets';

/**
 * The hero on a phone or a tablet held upright (the mobile and tablet
 * round, 2026-10-14, after the developer's reference screens: the building
 * large, on a polished floor, "very less on background and more on the
 * product itself"). Desktop has HeroScene, which this does not touch.
 *
 * The opening card: "One system. Many buildings." over the three kinds of
 * building, one standing on the floor at a time; the visitor goes from one
 * to the next with the card's cards, its arrows or a sideways swipe
 * (developer: "the landing page shows that 3 building in that card
 * option"; Hero.tsx sets `heroChoice.kind`). The one on show goes back
 * down into the floor and the chosen one comes up, whole, its lights on
 * once it stands, and the camera eases over to it; each is named on the
 * floor under it. On a clock, a second or so: these are the visitor's own
 * choices, not the scroll's.
 *
 * Scrolling down then opens the card: the kind on show goes down, the
 * house comes up, and the camera goes to it. After that the four steps are
 * scrolled through, as on desktop ("vertical to move hero sections"): each
 * kind alone on the same floor, in the card's own light, on the page's
 * shade (film.css), and at each cut the one on show goes down into the
 * floor and the next comes up out of it, whole. Its lights come on once it
 * stands. The capsule is shown at dusk, in the length chosen under it (10′,
 * 16′ or 20′: the developer's capsule screen; `heroChoice.feet`), and the
 * floor and the shade darken with its caption, which is set on ink.
 *
 * The house, the capsules and the block are the card's, in its refined
 * finishes; the institutional building is in its materials as they were
 * (CLAUDE.md: no other building takes the refined finishes without being
 * asked), its two 36′ panels gliding in. No land, no sky, no mist.
 *
 * In the steps each building is framed in the band its caption leaves under
 * it (Stage, `frame`); on the card, in the room between the headline and
 * the cards (`poseInRect`).
 */

const CUTS = HERO_CUTS;
/** How far under the floor each one starts: house, capsule, block, institutional building. */
const UNDER = [4.6, 3.6, 7.4, 11.6] as const;
/** The block's and the institutional building's own ground line is their set's pad: on the floor they stand this much lower. */
const PAD_Y = -0.06;
/** The card's scroll (0–1): up to here the kind on show goes and the house comes, and the camera goes to it. */
const LINEUP = 0.34;
/**
 * Around each cut, in film progress: the one on show goes down over DOWN
 * before it, the next comes up over UP after it. The camera moves on while
 * the first goes down and is there, or all but there, when the next starts
 * up (MOVE after the cut), so no frame of the change is a close crop of a
 * building half out of the floor.
 */
const DOWN = 0.034;
const UP = 0.06;
const MOVE = 0.01;
/**
 * The card's and the capsule's choices, in seconds: the one on show goes
 * down (DOWN_S), the chosen one comes up (UP_S; the first, on load, more
 * slowly: FIRST_S, after WAIT_S), its lights come on (LIT_S); the camera
 * eases over at EASE a second.
 */
const CLOCK = { DOWN_S: 0.55, UP_S: 1.05, FIRST_S: 1.6, WAIT_S: 0.35, LIT_S: 0.8, EASE: 3.4 } as const;
const GLOSS = 0.72;
const FLOOR_SHADOW = LOOKS.card.shadow.opacity;
const SHADOW_Y = PLAZA_Y + 0.01;
const FT = 0.3048;
/** The capsule's box, on its home-like section (capsule.ts, POD_HOME): steps in front, legs and hull up. */
const capsuleBox = (feet: number): Box => [-(feet * FT) / 2 - 0.03, (feet * FT) / 2 + 0.03, -POD_HOME.D / 2 - 0.05, POD_HOME.D / 2 + 0.7, POD_HOME.legs + POD_HOME.H + 0.05];
/** The prefab block here is the workforce set's whole block (developer: "same for prefabs"), not the opening card's shorter one of the desktop. */
const BAYS = WORK_BAYS;
const PODS = podLengths;

/** The steps' framings (in the band): the house, the capsule in each length, the block, the institutional building. */
const SHOTS: Shot[] = [
  { box: HOUSE_BOX, base: 0, turn: [0.78, 0.46], el: 0.13, fill: [0.9, 0.78] },
  ...PODS.map((f): Shot => ({ box: capsuleBox(f), base: 0, turn: [0.62, 0.34], el: 0.11, fill: [0.9, 0.62], lift: 0.16 })),
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

/** How far in front of each kind's middle its name hangs on the card: its box's front, on its own plan. */
const NAME_Z = [HOUSE_BOX[3] + 1.3, POD_HOME.D / 2 + 1.4, blockBox(BAYS)[3] + 0.7];
const KIND_IDS = ['mod', 'pod', 'fab'] as const;

const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
const setAt = (p: number) => {
  let i = 0;
  while (i < CUTS.length && p >= CUTS[i]) i++;
  return i;
};
/** Where each step's own stretch begins and ends, transitions excluded. */
const STRETCH: [number, number][] = [0, 1, 2, 3].map((k) => [k === 0 ? 0 : CUTS[k - 1] + MOVE, k === 3 ? 1 : CUTS[k] - DOWN]);

const _look = [0, 0, 0];
const _pos = [0, 0, 0];
const _P = newPose();
const _Q = newPose();
const _R = newPose();

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

  /** The steps' framings for the band's shape, worked out once a shape. */
  const poses = useRef<{ key: string; list: Pose[][] }>({ key: '', list: [] });
  const posesFor = (aspect: number) => {
    const key = aspect.toFixed(3);
    if (poses.current.key !== key) poses.current = { key, list: SHOTS.map((s, k) => posesAlong(probe, s, corners[k], aspect)) };
    return poses.current.list;
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
    const key = `${size.width}x${size.height}-${fonts.current}-${camera.fov.toFixed(3)}-${v ? v.offsetY.toFixed(1) : 0}-${pick}`;
    if (cardPoses.current.key === key) return cardPoses.current.list;
    const wide = size.width > size.height * 1.2;
    const room = cardRoom(gl.domElement, wide) ?? [12, size.height * 0.3, size.width - 12, size.height * 0.78];
    probe.fov = camera.fov;
    probe.aspect = camera.aspect;
    if (v) probe.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    else probe.clearViewOffset();
    probe.updateProjectionMatrix();
    const list = CARD.map((s, k) => poseInRect(probe, s, cardCorners[k], s.turn[0], room, size.width, size.height));
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
   * block) and the capsule's three lengths. Each: how far up (0–1), its
   * lights (0–1); the card's camera, eased to the chosen one; the capsule's
   * framing between its lengths.
   */
  const clock = useMemo(
    () => ({
      started: 0,
      first: !reduced,
      card: { rise: [0, 0, 0], lit: [0, 0, 0], cam: newPose(), placed: false },
      pod: { rise: PODS.map((f) => (f === heroChoice.feet ? 1 : 0)), lit: PODS.map(() => 0), at: Math.max(0, PODS.indexOf(heroChoice.feet as (typeof PODS)[number])) },
    }),
    [reduced],
  );

  /** What the scroll and the clock make of it this frame: how far up each stands, and their lights. */
  const now = useMemo(() => ({ p: 0, i: 0, pre: 0, lead: 0, house: 0, capsule: 0, block: 0, campus: 0 }), []);
  const lights = useMemo(() => {
    const stood = (k: number) => span(now.p, [CUTS[k - 1] + UP, CUTS[k - 1] + UP + 0.025]);
    const onCard = () => now.i === 0 && now.lead < 1;
    return {
      house: () => {
        if (now.house < 0.999) return 0;
        if (!onCard()) return 1;
        return heroChoice.kind === 0 ? clock.card.lit[0] : span(now.lead, [0.9, 1]);
      },
      pod: PODS.map((_, j) => () => {
        if (now.capsule < 0.999 || clock.pod.rise[j] < 0.999) return 0;
        return Math.min(clock.pod.lit[j], onCard() ? clock.card.lit[1] : stood(1));
      }),
      block: () => (now.block < 0.999 ? 0 : onCard() ? clock.card.lit[2] : stood(2)),
      campus: () => (now.p < CUTS[2] ? 0 : clamp01((now.p - CUTS[2] - UP) / 0.06)),
      // The institutional building is whole when it comes up, but for its last wall panels, which come in with the scroll.
      campusA: () => 0.7 + 0.3 * span(now.p, [CUTS[2] + UP * 0.5, 0.95]),
      campusShow: () => (setAt(now.p) === 3 ? 1 : 0),
    };
  }, [now, clock]);

  useFrame((_, dt) => {
    const step = reduced ? 100 : Math.min(dt, 0.05);
    let moving = false;

    /* The visitor's choices, on the clock (only once the loading screen has lifted, and the first picture has stood a moment). */
    const c = heroChoice.kind;
    const fj = Math.max(0, PODS.indexOf(heroChoice.feet as (typeof PODS)[number]));
    if (!booting.current) {
      clock.started ||= performance.now();
      if (reduced || performance.now() - clock.started > CLOCK.WAIT_S * 1000) {
        const swap = (rise: number[], lit: number[], chosen: number, up: number) => {
          const others = rise.some((r, k) => k !== chosen && r > 0);
          for (let k = 0; k < rise.length; k++) {
            const r = rise[k];
            const want = k === chosen && !others ? 1 : 0;
            const next = want > r ? Math.min(1, r + step / up) : want < r ? Math.max(0, r - step / CLOCK.DOWN_S) : r;
            const l = next >= 1 && want === 1 ? Math.min(1, lit[k] + step / CLOCK.LIT_S) : 0;
            if (next !== r || l !== lit[k]) moving = true;
            rise[k] = next;
            lit[k] = l;
          }
        };
        swap(clock.card.rise, clock.card.lit, c, clock.first ? CLOCK.FIRST_S : CLOCK.UP_S);
        if (clock.card.rise[c] >= 1) clock.first = false;
        swap(clock.pod.rise, clock.pod.lit, fj, CLOCK.UP_S);
        const at = clock.pod.at + (fj - clock.pod.at) * (reduced ? 1 : 1 - Math.exp(-step * CLOCK.EASE));
        if (Math.abs(at - fj) > 0.001) moving = true;
        clock.pod.at = Math.abs(at - fj) > 0.001 ? at : fj;
      } else moving = true;
    }

    /* The scroll: the card, then the four steps. */
    const p = progress.value;
    const i = setAt(p);
    const pre = i === 0 ? progress.pre : 1;
    const lead = i === 0 ? clamp01(pre / LINEUP) : 1;
    const down = (k: number) => (k < 3 ? 1 - span(p, [CUTS[k] - DOWN, CUTS[k]]) : 1);
    const up = (k: number) => (k === 0 ? 1 : span(p, [CUTS[k - 1], CUTS[k - 1] + UP]));
    const goes = 1 - span(lead, [0, 0.45]);
    const onCard = i === 0 && lead < 1;
    now.p = p;
    now.i = i;
    now.pre = pre;
    now.lead = lead;
    now.house = (onCard ? Math.max(clock.card.rise[0], c === 0 ? 0 : span(lead, [0.5, 0.95])) : 1) * down(0);
    now.capsule = onCard ? clock.card.rise[1] * goes : i === 0 ? 0 : up(1) * down(1);
    now.block = onCard ? clock.card.rise[2] * goes : i === 0 ? 0 : up(2) * down(2);
    now.campus = i === 0 ? 0 : up(3);

    const place = (g: Group | null, base: number, t: number, under: number) => {
      if (!g) return;
      g.visible = t > 0.0005;
      g.position.y = base - (1 - ease.out(t)) * under;
    };
    place(house.current, 0, now.house, UNDER[0]);
    pods.forEach((ref, j) => place(ref.current, 0, now.capsule * clock.pod.rise[j], UNDER[1]));
    place(block.current, PAD_Y, now.block, UNDER[2]);
    place(campus.current, PAD_Y, now.campus, UNDER[3]);

    /* The camera. */
    const aspect = (camera.userData.frameAspect as number | undefined) ?? (compact ? size.width / size.height : (0.56 * size.width) / size.height);
    const shots = posesFor(aspect);
    /** Building k's framing in the steps (k: 0 house, 1 capsule, 2 block, 3 institutional), `u` along its turn. */
    const stepPose = (k: number, u: number, out: Pose) => {
      if (k !== 1) return poseAt(shots[k === 0 ? HOUSE : k === 2 ? BLOCK : INST], u, out);
      // The capsule, between the framings of the lengths it is going between.
      const a = Math.min(PODS.length - 2, Math.floor(clock.pod.at));
      poseAt(shots[POD(a)], u, _R);
      poseAt(shots[POD(a + 1)], u, out);
      return blend(_R, out, clock.pod.at - a, out);
    };
    const pose = _P;
    if (onCard || (i === 0 && pre < 1)) {
      // On the card: eased over to the chosen kind in its room; as the card opens, to the house in the band.
      const target = cardPosesNow()[cardShot(c, fj)];
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
      const k = i;
      stepPose(k, span(p, STRETCH[k]), pose);
      // Crossing a cut: from the last building's end to this one's start, while one goes down and the other comes up.
      if (k > 0 && p < CUTS[k - 1] + MOVE) blend(stepPose(k - 1, 1, _Q), pose, ease.inOut(span(p, [CUTS[k - 1] - DOWN, CUTS[k - 1] + MOVE])), pose);
      else if (k < 3 && p > CUTS[k] - DOWN) blend(pose, stepPose(k + 1, 0, _Q), ease.inOut(span(p, [CUTS[k] - DOWN, CUTS[k] + MOVE])), pose);
    }
    placeOf(pose, _pos, _look);
    aim(camera, _pos, _look, 1, 1, 0);
    rig.lightTarget.set(_look[0], 0, _look[2]);

    /* The floor: an island round what stands on it, larger with the building; at dusk for the capsule's step. */
    const r = Math.max(14, pose.d * 1.15);
    plaza.fade.set(_look[0], _look[2], r, r * 2.4);
    const dusk = span(p, [CUTS[0] - 0.012, CUTS[0] + 0.03]) * (1 - span(p, [CUTS[1] - 0.03, CUTS[1] + 0.012]));
    plaza.material.color.lerpColors(FLOOR_DAY, FLOOR_DUSK, dusk);
    shadow.opacity = lerp(FLOOR_SHADOW, 0.75, dusk);
    if (floor.current) floor.current.position.set(_look[0], SHADOW_Y, _look[2]);

    /* Names: the card's kind on show, under it, once it stands; the capsule's length in its step. */
    const named = onCard ? clamp01(1 - pre * 9) : 0;
    KIND_IDS.forEach((id, k) => {
      const [x, z] = turned(0, NAME_Z[k]);
      label(`kind-${id}`, x, 0, z, k === c ? named * clock.card.lit[k] : 0);
    });
    const podShown = !onCard && i === 1 ? clamp01((now.capsule - 0.9) * 10) : 0;
    PODS.forEach((f, j) => {
      const [x, z] = turned(0, POD_HOME.D / 2 + 1.6);
      label(`pod-${f}`, x, 0.02, z, j === fj ? podShown * clock.pod.lit[j] : 0);
    });

    if (moving) invalidate();
  });

  return (
    <group ref={all}>
      <PlazaFloor plaza={plaza} />
      <Refined value>
        <HouseAlone house={house} getLit={lights.house} look={LOOKS.card} />
        {PODS.map((f, j) => (
          <group key={f} ref={(g) => void (pods[j].current = g)} rotation-y={FARM_YAW}>
            <Capsule feet={f} getT={() => 1} getLit={lights.pod[j]} look={LOOKS.card} section={POD_HOME} />
          </group>
        ))}
        <group ref={block} rotation-y={FARM_YAW}>
          <WorkforceBlock getA={() => 1} getLit={lights.block} look={LOOKS.card} crane={false} bays={BAYS} />
        </group>
      </Refined>
      <group ref={campus} rotation-y={FARM_YAW}>
        <InstitutionalBlock getA={lights.campusA} label={label} getShow={lights.campusShow} look={LOOKS.card} />
      </group>
      <group ref={mirror} />
      <mesh ref={floor} material={shadow} rotation-x={-Math.PI / 2} position={[0, SHADOW_Y, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
      </mesh>
    </group>
  );
}

export default function HeroMobileScene(props: SceneProps) {
  return (
    <Stage {...props} look="card" ground="none" focus={[0.7, 0.56]} focusCompact={[0.5, 0.6]} shadowExtent={22}>
      {(rig) => <Showroom {...props} rig={rig} />}
    </Stage>
  );
}
