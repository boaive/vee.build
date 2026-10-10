import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MeshBasicMaterial, ShadowMaterial, Vector3, Vector4, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { HERO_CUTS } from '../../film/heroTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { useMirror } from '../kit/mirror';
import { LOOKS } from '../kit/looks';
import { CampusSet, FarmSet, Lineup, PodSet, SETS, WorkSet, rowCompact, rowFor, rowStep, type Row, type SetName } from '../kit/sets';

/**
 * Hero: the kinds of building VEE.BUILD makes, each shot alone against a
 * plain sky. Scrolling moves through them; a short dissolve covers each
 * change of set while the light is retuned. The first building assembles on
 * load, the others as their set arrives.
 *
 * The page opens on the three kinds in a row (client, 2026-10-09): the
 * modular house, a capsule home and a prefab building, lowered in one after
 * another on a bare studio floor, no land and no sky, the canvas clear to
 * the page behind them. The opening card's scroll then has two parts. In
 * the first the capsule and the prefab block are lifted away, as they came,
 * and the camera goes to the house. In the second a clearing opens in the
 * land (atmosphere.ts) and spreads from under the house to the horizon, and
 * the sky comes up behind it. At rest the land is not drawn at all.
 *
 * Only the first set is built before the first frame. The other three are
 * built one at a time as soon as the picture is up, while it still stands
 * unmoving on the opening card, and each is warmed (its light, its
 * geometry and its textures sent to the GPU) so that scrolling into it
 * costs nothing. The three on the card are put together after that, so
 * their assembly is not interrupted by the work; a visitor who scrolls at
 * once gets it at once.
 */

const ORDER: SetName[] = ['farm', 'pods', 'work', 'campus'];
/** Progress at which one set gives way to the next: the captions change on the same numbers (film/heroTimeline.ts). */
const CUTS = HERO_CUTS;
const RANGE: [number, number][] = [
  [0, CUTS[0]],
  [CUTS[0], CUTS[1]],
  [CUTS[1], CUTS[2]],
  [CUTS[2], 1],
];
/** How much of its stretch each set's building takes to go up. */
const BUILD = [0.45, 0.45, 0.45, 0.6];
const VEIL = 0.03;
/**
 * The opening's assembly, in seconds: when each of the three is lowered in.
 * Each one's lights come on once it stands (client, 2026-10-10: placed,
 * settled, then lit): `settle` after it is down, over `glow`. The whole is
 * as long as the last of them takes.
 */
const INTRO = { total: 6, house: [0, 2.6], capsule: [1.25, 2.9], prefab: [1.9, 4.7], settle: 0.35, glow: 0.95 } as const;
/** The first house waits this long at most for the other sets to be warmed. */
const INTRO_WAIT = 4000;
/** How far before a cut the next set must exist, in progress (about a third of a screen). */
const AHEAD = 0.07;
const COMPOSED = 1.55;
const PULL = 0.5;
/**
 * The opening card's scroll (0–1), first part: up to here the camera leaves
 * the row for the house and the other two are lifted away. film.css takes
 * the mist's rise from the same number (--lineup).
 */
const LINEUP = 0.34;
/** When the capsule and the block go, within that part: the block first, shell by shell, then the capsule, both before the camera is near. */
const LEAVE = { prefab: [0.02, 0.58], capsule: [0.12, 0.66] } as const;
/** The second part (0–1 of what is left): over which the land spreads out, and the sky comes up. */
const LAND_IN: [number, number] = [0.05, 0.84];
const SKY_IN: [number, number] = [0.3, 0.88];
/** The clearing's radius in metres as it opens (0–1): slow round the house, fast to the horizon, about 450 m at the end. */
const reach = (t: number) => 2.5 * (Math.exp(5.2 * t) - 1);
/** While it is alone the house stands this much nearer, and this many metres higher in the frame, clear of the mist at its feet. */
const NEAR = 0.9;
const LIFT = 0.62;
/** How dark the shadows lie on the bare floor: the studio's. */
const FLOOR_SHADOW = LOOKS.card.shadow.opacity;
/** How strongly the studio's floor reflects what stands on it (kit/mirror.tsx), at a grazing angle. */
const GLOSS = 0.3;
/** Over this part of the card's second part (0–1) the studio's light becomes the sunset's, while the mist is up. */
const LIGHT_IN: [number, number] = [0.04, 0.6];

/**
 * What the row is fitted into, in the canvas's pixels, measured from the
 * card's own words: its left and right margins; how low the names may hang
 * (a name stands under its point on the floor); and the headline, which no
 * building may stand over: under it a building's top stays below
 * `textBottom`, beside it (right of `textRight`) below `besideTop`.
 */
interface Band {
  w: number;
  h: number;
  l: number;
  r: number;
  textRight: number;
  textBottom: number;
  besideTop: number;
  bottom: number;
}

/** An element's offset inside an ancestor, through its offset parents (transforms ignored: they move with the scroll). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return [x, y];
}

function measureBand(canvas: HTMLCanvasElement, compact: boolean): Band | null {
  const sticky = canvas.closest<HTMLElement>('.film__sticky');
  const words = sticky?.querySelector<HTMLElement>('.prelude__top');
  const line = sticky?.querySelector<HTMLElement>('.prelude__line');
  const name = sticky?.querySelector<HTMLElement>('.lbl--kind > span');
  const hdr = document.querySelector<HTMLElement>('[data-hdr]')?.offsetHeight ?? 64;
  if (!sticky || !words || !line) return null;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  const [cx, cy] = offsetIn(canvas, sticky);
  const [, wy] = offsetIn(words, sticky);
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const gutter = Math.min(4 * rem, Math.max(rem, 0.04 * window.innerWidth));
  // A name hangs this far under its point (film.css, .lbl--kind).
  const hang = name ? name.offsetTop + name.offsetHeight : 4.6 * rem;
  if (compact) {
    // The picture is the top of the card: from under the header down to the words, which start under it (film.css).
    const kicker = words.querySelector<HTMLElement>('.prelude__kicker') ?? words;
    const [, ky] = offsetIn(kicker, sticky);
    return { w, h, l: gutter * 0.6, r: w - gutter * 0.6, textRight: -1, textBottom: 0, besideTop: hdr + 0.5 * rem - cy, bottom: ky - cy - hang - 1.4 * rem };
  }
  // The headline's lines: how far right their words reach, where the second one starts and where the block ends.
  let right = 0;
  const range = document.createRange();
  for (const ln of line.querySelectorAll<HTMLElement>('.prelude__ln > span')) {
    range.selectNodeContents(ln);
    right = Math.max(right, range.getBoundingClientRect().right - sticky.getBoundingClientRect().left);
  }
  const second = line.querySelectorAll<HTMLElement>('.prelude__ln')[1];
  const [, ly] = offsetIn(line, sticky);
  const textBottom = wy + words.offsetHeight - cy + 0.9 * rem;
  const besideTop = second ? offsetIn(second, sticky)[1] - cy + second.offsetHeight * 0.3 : ly - cy;
  const rail = 2.6 * rem;
  return {
    w,
    h,
    l: gutter,
    r: w - Math.max(gutter, rail),
    textRight: right - cx + 1.2 * rem,
    textBottom,
    besideTop,
    bottom: h - hang - Math.max(1.1 * rem, h * 0.04),
  };
}

const _p = new Vector3();
const _c = new Vector3();
const _dir = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/**
 * The camera on the row of three, fitted to the screen it is seen on
 * (client, 2026-10-11: the same arrangement, balanced, on every shape of
 * screen). From the row's own bearing, the camera stands as near as it can
 * while the row keeps inside the margins, no building stands over the
 * headline and the names stay above the foot of the screen; the row is
 * centred across, and what height is left over is shared above and below it.
 * Projected through the camera itself, view offset included. Once per size.
 */
function frameRow(cam: PerspectiveCamera, row: Row, band: Band) {
  const { az, el } = row.view;
  _dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  let cx = 0;
  let cz = 0;
  let n = 0;
  for (const hull of row.hull)
    for (const q of hull) {
      cx += q[0];
      cz += q[2];
      n++;
    }
  const tags = [row.tags.mod, row.tags.pod, row.tags.fab];
  const boxes = row.hull.map(() => ({ x0: 0, x1: 0, y0: 0, y1: 0 }));
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  const px = (q: readonly number[]) => {
    _p.set(q[0], q[1], q[2]).project(cam);
    return [(_p.x * 0.5 + 0.5) * band.w, (-_p.y * 0.5 + 0.5) * band.h];
  };
  const place = (d: number) => {
    cam.position.copy(_c).addScaledVector(_dir, d);
    cam.lookAt(_c);
    cam.updateMatrixWorld();
  };
  const measure = () => {
    let x0 = Infinity;
    let x1 = -Infinity;
    row.hull.forEach((hull, b) => {
      const box = boxes[b];
      box.x0 = box.y0 = Infinity;
      box.x1 = box.y1 = -Infinity;
      for (const q of hull) {
        const [x, y] = px(q);
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
      x0 = Math.min(x0, box.x0);
      x1 = Math.max(x1, box.x1);
    });
    let ty = -Infinity;
    for (const t of tags) ty = Math.max(ty, px(t)[1]);
    return { x0, x1, ty };
  };
  /** How far each building's top stands below where it may reach (negative: over the headline). */
  const room = () => Math.min(...boxes.map((b) => b.y0 - (b.x0 < band.textRight ? band.textBottom : band.besideTop)));
  /** Centred across, the names on the bottom line. */
  const settle = (d: number) => {
    _c.set(cx / n, 2.2, cz / n);
    for (let it = 0; it < 5; it++) {
      place(d);
      const m = measure();
      const ppm = band.h / (2 * d * tan);
      _right.setFromMatrixColumn(cam.matrixWorld, 0);
      _up.setFromMatrixColumn(cam.matrixWorld, 1);
      _c.addScaledVector(_right, -((band.l + band.r) / 2 - (m.x0 + m.x1) / 2) / ppm).addScaledVector(_up, (band.bottom - m.ty) / ppm);
    }
    place(d);
    const m = measure();
    return m.x1 - m.x0 <= band.r - band.l + 0.5 && room() >= -0.5;
  };
  let lo = 4;
  let hi = 420;
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) / 2;
    if (settle(mid)) hi = mid;
    else lo = mid;
  }
  settle(hi);
  // What height is left over: shared, a little more of it under the names.
  const spare = room();
  if (spare > 1) {
    const ppm = band.h / (2 * hi * tan);
    _c.addScaledVector(_up, -(spare * 0.42) / ppm);
    place(hi);
  }
  return { pos: cam.position.toArray(), look: _c.toArray() };
}

const setAt = (p: number) => {
  let i = 0;
  while (i < CUTS.length && p >= CUTS[i]) i++;
  return i;
};
const localU = (p: number, i: number) => clamp01((p - RANGE[i][0]) / (RANGE[i][1] - RANGE[i][0]));
const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));

const idle = (fn: () => void, wait = 60) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 1200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, wait);
  return () => window.clearTimeout(id);
};

/**
 * The floor of the opening: nothing but the shadows of what stands on it,
 * each fading out a few metres from its caster (the sun is low and a shadow
 * would run on for fifty). It lies just under the land, which covers it as
 * it spreads, and it is gone before the land has spread far.
 */
function shadowFloor(color: string, opacity: number, row: Row) {
  const m = new ShadowMaterial({ color, opacity, transparent: true });
  const spots = row.spots.map((s) => new Vector4(...s));
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSpots = { value: spots };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', `#include <fog_pars_fragment>\nuniform vec4 uSpots[ ${spots.length} ];`)
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
#ifdef USE_FOG
  vec2 floorAt = cameraPosition.xz + vAtmDir.xz;
  float floorKeep = 0.0;
  for ( int k = 0; k < ${spots.length}; k ++ ) floorKeep = max( floorKeep, 1.0 - smoothstep( uSpots[ k ].z, uSpots[ k ].w, length( floorAt - uSpots[ k ].xy ) ) );
  gl_FragColor.a *= floorKeep;
#endif`,
      );
  };
  m.customProgramCacheKey = () => 'shadow-floor-row';
  return m;
}

/** Full-screen colour in front of the camera, for the dissolve between sets. */
function Veil({ getOpacity }: { getOpacity: () => number }) {
  const ref = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: '#120f0d', transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }),
    [],
  );
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const o = getOpacity();
    m.visible = o > 0.002;
    material.opacity = o;
    m.position.copy(camera.position);
    m.quaternion.copy(camera.quaternion);
    m.translateZ(-1);
  });
  return (
    <mesh ref={ref} material={material} renderOrder={1000} frustumCulled={false}>
      <planeGeometry args={[30, 30]} />
    </mesh>
  );
}

const _look = [0, 0, 0];
const _pos = [0, 0, 0];
const _hz = new Vector3();

function Hero({ progress, place, reduced, compact, rig }: SceneProps & { rig: Rig }) {
  const intro = useMemo(() => ({ t: reduced ? 1 : 0 }), [reduced]);
  const label = useLabel(place);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const groups = useRef<(Group | null)[]>([]);
  const land = useRef<Group>(null);
  const others = useRef<Group>(null);
  const house = useRef<Group>(null);
  const mirror = useRef<Group>(null);
  /** How strongly the studio floor reflects, 0–1: full on the card, gone as the land comes in. */
  const gloss = useRef(0);
  useMirror(rig, mirror, [house, others], () => gloss.current);
  const floor = useRef<Mesh>(null);
  const gl = useThree((s) => s.gl);
  const aspect = size.width / size.height;
  // The row for this shape of screen, in tenths of its step so that a small resize keeps it.
  const step = compact ? -1 : Math.round(rowStep(aspect) * 10) / 10;
  const row = useMemo(() => (step < 0 ? rowCompact() : rowFor(step)), [step]);
  const floorMat = useMemo(() => shadowFloor(LOOKS.card.shadow.color, FLOOR_SHADOW, row), [row]);
  useEffect(() => () => floorMat.dispose(), [floorMat]);
  const current = useRef(-1);
  /** Sets built so far, in order. */
  const [built, setBuilt] = useState(1);
  const warmed = useRef(1);
  const landWarm = useRef(0);
  /**
   * The camera on the row, fitted to the card's words on this screen (frameRow): measured on the first frame
   * at a size, and again once the fonts are in, since the headline's measure changes with them.
   */
  const rowView = useRef<{ key: string; pos: number[]; look: number[] } | null>(null);
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
  /**
   * The studio's floor ends a few metres behind the row: its faint line (film.css, --floor) is drawn where
   * that place on the floor is seen from a camera pose, as a percentage of the screen's height.
   */
  const floorLine = (pos: readonly number[], look: readonly number[], at: Vector3) => {
    aim(camera, pos, look, aspect, COMPOSED, PULL);
    _hz.copy(at).project(camera);
    return (-_hz.y * 0.5 + 0.5) * 100;
  };
  const viewOfRow = () => {
    const key = `${size.width}x${size.height}-${step}-${fonts.current}`;
    if (rowView.current?.key === key) return rowView.current;
    const band = measureBand(gl.domElement, compact);
    const cam = camera as PerspectiveCamera;
    const v = band ? frameRow(cam, row, band) : { pos: [29.5, 2.5, 24.6], look: [14.7, 2.0, -7.2] };
    // `aim` stands every pose back by its own measure on a narrow screen: the row's pose is given the difference.
    const fit = aspect < COMPOSED ? 1 + (COMPOSED / aspect - 1) * PULL : 1;
    const pos = v.look.map((q, k) => q + (v.pos[k] - q) / fit);
    rowView.current = { key, pos, look: v.look };
    // The studio's floor line: behind the farthest of the three, and where that is once the camera is by the house.
    const backdrop = gl.domElement.closest('.film__sticky')?.querySelector<HTMLElement>('.film__backdrop--studio');
    if (backdrop) {
      const fx = v.pos[0] - v.look[0];
      const fz = v.pos[2] - v.look[2];
      const fl = Math.hypot(fx, fz) || 1;
      let far = -Infinity;
      for (const hull of row.hull) for (const q of hull) far = Math.max(far, -((q[0] - v.look[0]) * fx + (q[2] - v.look[2]) * fz) / fl);
      const back = new Vector3(v.look[0] - (fx / fl) * (far + 7), 0, v.look[2] - (fz / fl) * (far + 7));
      const farm = SETS.farm;
      const at = farm.from.look.map((q, k) => q - (k === 1 ? LIFT : 0));
      const house = floorLine(farm.from.pos.map((q, k) => at[k] + (q - at[k]) * NEAR), at, back);
      const here = floorLine(pos, v.look, back);
      backdrop.style.setProperty('--floor', here.toFixed(2));
      backdrop.style.setProperty('--floor-drop', `${(house - here).toFixed(2)}svh`);
    }
    return rowView.current;
  };
  /** The look last set for the first set's stretch: how far the studio has gone over to the sunset. */
  const lit = useRef(-1);

  // The three are put together on the opening card, once the loading screen has lifted.
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

  // The assembly starts when the other sets are ready, when the visitor starts to scroll, or after INTRO_WAIT.
  const go = useRef(false);
  const started = useRef(0);
  /**
   * How far the card's first part has gone: 0 the row, 1 the camera is with the house and the other two are away.
   * Read from the scroll itself wherever it is needed, not kept from one frame to the next: the parts of the
   * scene draw in an order of their own, and one frame may be all a jump of the page gets.
   */
  const lead = () => (setAt(progress.value) === 0 ? clamp01(progress.pre / LINEUP) : 1);

  useFrame((_, dt) => {
    if (!go.current && !booting.current) {
      started.current ||= performance.now();
      go.current = warmed.current >= ORDER.length || progress.pre > 0.02 || progress.value > 0 || performance.now() - started.current > INTRO_WAIT;
    }
    if (intro.t < 1 && go.current) {
      intro.t = Math.min(1, intro.t + Math.min(dt, 0.05) / INTRO.total);
      invalidate();
    }
    const p = progress.value;
    const i = setAt(p);
    groups.current.forEach((g, k) => g && (g.visible = k === i));
    // The opening card, in its two parts. Only the first set has one.
    const pre = i === 0 ? progress.pre : 1;
    const led = lead();
    const open = clamp01((pre - LINEUP) / (1 - LINEUP));
    if (i === 0) {
      // The card is a studio; as the land comes in its light becomes the farm's sunset (client, 2026-10-11: realistic, premium).
      const m = ease.inOut(span(open, LIGHT_IN));
      if (m !== lit.current || current.current !== 0) rig.mixLook(LOOKS.card, LOOKS.sunset, m);
      lit.current = m;
    } else if (i !== current.current) rig.setLook(LOOKS[SETS[ORDER[i]].look]);
    current.current = i;
    const s = SETS[ORDER[i]];
    const u = ease.inOut(localU(p, i));
    // How far the land has spread (1: all of it) and how much sky there is.
    const t = span(open, LAND_IN);
    if (t < 1) {
      const r = reach(t);
      rig.clear[2] = r;
      rig.clear[3] = 1.2 + r * 0.55;
    } else rig.clear[3] = 0;
    rig.sky = ease.inOut(span(open, SKY_IN));
    if (land.current) land.current.visible = t > 0;
    // The other two of the three are there for the first part only.
    if (others.current) others.current.visible = led < 1;
    // The bare floor's shadows go as the ground comes: once the trees are there, their long shadows would fall across it too.
    floorMat.opacity = FLOOR_SHADOW * (1 - clamp01((t - 0.02) / 0.12));
    // The floor's reflection goes with its shadows, and is not there once the other sets are.
    gloss.current = i === 0 ? GLOSS * (1 - clamp01((t - 0.02) / 0.1)) : 0;
    if (floor.current) floor.current.visible = floorMat.opacity > 0.003;
    const alone = 1 - ease.inOut(open);
    const near = lerp(1, NEAR, alone);
    const inRow = 1 - ease.inOut(led);
    const view = inRow > 0 ? viewOfRow() : null;
    for (let k = 0; k < 3; k++) {
      const at = lerp(s.from.look[k], s.to.look[k], u) - (k === 1 ? LIFT * alone : 0);
      const from = at + (lerp(s.from.pos[k], s.to.pos[k], u) - at) * near;
      _look[k] = view ? lerp(at, view.look[k], inRow) : at;
      _pos[k] = view ? lerp(from, view.pos[k], inRow) : from;
    }
    aim(camera, _pos, _look, aspect, COMPOSED, PULL);
    rig.lightTarget.set(_look[0], 0, _look[2]);
    // Each of the three is named once it stands; the names go as the card starts to open.
    const named = i === 0 ? clamp01(1 - progress.pre * 9) : 0;
    const a = intro.t * INTRO.total;
    label('kind-mod', ...row.tags.mod, named * clamp01((a - INTRO.house[1] + 0.5) * 2.5));
    label('kind-pod', ...row.tags.pod, named * clamp01((a - INTRO.capsule[1] + 0.4) * 2.5));
    label('kind-fab', ...row.tags.fab, named * clamp01((a - INTRO.prefab[1] + 0.5) * 2.5));
    // A visitor who scrolls straight through: have the next set ready before its cut.
    const next = setAt(Math.min(1, p + AHEAD)) + 1;
    if (next > built) setBuilt(Math.min(ORDER.length, next));
  });

  /*
   * Build the remaining sets one at a time when the page is quiet, then
   * warm each. Nothing here runs while the picture is moving.
   */
  useEffect(() => {
    let cancel = () => {};
    let alive = true;
    if (import.meta.env.DEV) (rig as unknown as { hero?: unknown }).hero = { built, warmed };
    // Quiet: the first picture is up and nothing is moving, the opening's assembly included.
    const quiet = () => !rig.holding && !booting.current && Math.abs(progress.target - progress.value) < 1e-4 && (intro.t <= 0 || intro.t >= 1);
    const step = () => {
      if (!alive) return;
      if (!quiet()) {
        const id = window.setTimeout(() => (cancel = idle(step)), 250);
        cancel = () => window.clearTimeout(id);
        return;
      }
      if (landWarm.current < 2) {
        // The first set's own land, not drawn while the house stands alone: shown off screen so it is on the GPU
        // before the scroll asks for it. Twice, for its two programs: inside a clearing, and with none.
        const pass = landWarm.current++;
        rig.warm(() => {
          const g = land.current;
          const was = g?.visible ?? false;
          const clear: [number, number] = [rig.clear[2], rig.clear[3]];
          if (g) g.visible = true;
          rig.clear[2] = 1000;
          rig.clear[3] = pass ? 0 : 1;
          return () => {
            if (g) g.visible = was;
            [rig.clear[2], rig.clear[3]] = clear;
          };
        });
        cancel = idle(step);
        return;
      }
      if (warmed.current < built) {
        // Warm the most recently built set: its environment map, then its buffers and textures.
        const k = warmed.current++;
        const set = SETS[ORDER[k]];
        rig.prepare(LOOKS[set.look]);
        rig.warm(() => {
          const was = groups.current.map((g) => g?.visible ?? false);
          groups.current.forEach((g, j) => g && (g.visible = j === k));
          aim(camera, set.from.pos, set.from.look, aspect, COMPOSED, PULL);
          // The later sets are never seen through a clearing: warmed in the program they will be drawn with.
          const clear = rig.clear[3];
          rig.clear[3] = 0;
          return () => {
            groups.current.forEach((g, j) => g && (g.visible = was[j]));
            rig.clear[3] = clear;
          };
        });
        cancel = idle(step);
        return;
      }
      if (built < ORDER.length) setBuilt(built + 1);
      // Everything is warm: a frame, so that the assembly starts.
      else invalidate();
    };
    cancel = idle(step, 200);
    // And one after the longest it may wait.
    const late = window.setTimeout(() => invalidate(), INTRO_WAIT + 300);
    return () => {
      alive = false;
      cancel();
      window.clearTimeout(late);
    };
  }, [built, rig, progress, intro, camera, aspect, invalidate]);

  /** Building k assembles as its set arrives. */
  const arrive = (k: number) => () => {
    const i = setAt(progress.value);
    if (i > k) return 1;
    return i === k ? clamp01((localU(progress.value, k) - 0.04) / BUILD[k]) : 0;
  };
  const showIf = (k: number) => () => (setAt(progress.value) === k ? 1 : 0);
  const veil = () => {
    if (reduced) return 0;
    const p = progress.value;
    let o = 0;
    for (const c of CUTS) o = Math.max(o, 1 - Math.abs(p - c) / VEIL);
    return clamp01(o);
  };

  const looks = ORDER.map((n) => LOOKS[SETS[n].look]);
  const getters = useMemo(
    () => {
      /** A building's lights: up once it has stood for a moment; for the two that leave, out as they start to go. */
      const lit = (down: number, leave?: readonly [number, number]) => () =>
        Math.min(span(intro.t * INTRO.total, [down + INTRO.settle, down + INTRO.settle + INTRO.glow]), leave ? 1 - clamp01(span(lead(), leave) * 10) : 1);
      return {
      first: () => span(intro.t * INTRO.total, INTRO.house),
      firstLit: lit(INTRO.house[1]),
      capsuleLit: lit(INTRO.capsule[1], LEAVE.capsule),
      prefabLit: lit(INTRO.prefab[1], LEAVE.prefab),
      // Lowered in on load; lifted away again, the same way, as the card's first part scrolls by.
      capsule: () => Math.min(span(intro.t * INTRO.total, INTRO.capsule), 1 - span(lead(), LEAVE.capsule)),
      prefab: () => Math.min(span(intro.t * INTRO.total, INTRO.prefab), 1 - span(lead(), LEAVE.prefab)),
      arrive: [1, 2, 3].map(arrive),
      show: [1, 2, 3].map(showIf),
      };
    },
    // The getters only read mutable state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intro, progress],
  );
  const slot = (k: number) => (g: Group | null) => {
    groups.current[k] = g;
    if (g) g.visible = k === current.current || (current.current < 0 && k === 0);
  };
  return (
    <>
      <group ref={slot(0)}>
        <FarmSet getA={getters.first} getLit={getters.firstLit} look={looks[0]} land={land} house={house} />
        <Lineup row={row} getCapsule={getters.capsule} getPrefab={getters.prefab} getCapsuleLit={getters.capsuleLit} getPrefabLit={getters.prefabLit} look={looks[0]} hold={others} />
        <group ref={mirror} />
        <mesh ref={floor} material={floorMat} rotation-x={-Math.PI / 2} position={[0, -0.03, -20]} receiveShadow>
          <planeGeometry args={[150, 150]} />
        </mesh>
      </group>
      {built > 1 && (
        <group ref={slot(1)} visible={false}>
          <PodSet getA={getters.arrive[0]} label={label} getShow={getters.show[0]} look={looks[1]} />
        </group>
      )}
      {built > 2 && (
        <group ref={slot(2)} visible={false}>
          <WorkSet getA={getters.arrive[1]} look={looks[2]} />
        </group>
      )}
      {built > 3 && (
        <group ref={slot(3)} visible={false}>
          <CampusSet getA={getters.arrive[2]} label={label} getShow={getters.show[2]} look={looks[3]} />
        </group>
      )}
      <Veil getOpacity={veil} />
    </>
  );
}

export default function HeroScene(props: SceneProps) {
  return (
    <Stage {...props} look="sunset" ground="none" focus={[0.73, 0.7]} focusCompact={[0.5, 0.36]} shadowExtent={40}>
      {(rig) => <Hero {...props} rig={rig} />}
    </Stage>
  );
}
