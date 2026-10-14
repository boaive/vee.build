import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box3, MeshBasicMaterial, ShadowMaterial, Vector3, Vector4, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { HERO_CUTS } from '../../film/heroTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { useMirror } from '../kit/mirror';
import { LOOKS } from '../kit/looks';
import { PLAZA_Y, PlazaFloor, plazaMaterial } from '../kit/plaza';
import { Refined } from '../kit/refined';
import { FARM_YAW, ROW_BAYS } from '../kit/row';
import { fitRow, type Band, type RowFit } from '../kit/rowfit';
import { CampusSet, FarmSet, Lineup, PodSet, SETS, WorkSet, type SetName } from '../kit/sets';

/**
 * Hero: the kinds of building VEE.BUILD makes, each shot alone against a
 * plain sky. Scrolling moves through them; a short dissolve covers each
 * change of set while the light is retuned. The first building assembles on
 * load, the others as their set arrives.
 *
 * The page opens on the three kinds of building (client, 2026-10-09): the
 * modular house, a capsule home and a prefab building. Each comes up out of
 * the floor whole, one after another, never part by part (client,
 * 2026-10-14: the card says what VEE.BUILD offers, not how it is put
 * together; the developer: "spawn them building by building"). Since the
 * client's second brief of 2026-10-11 they stand one behind another and are
 * seen on the diagonal (kit/row.ts), on a polished floor that mirrors them
 * (kit/plaza.tsx, kit/mirror.tsx), in the last warm light of the day, with
 * the page's warm shade behind the canvas where the floor ends: no land and
 * no sky yet. The camera is fitted to whatever screen they are seen on
 * (kit/rowfit.ts). The opening card's scroll then has two parts. In the
 * first the capsule and the prefab block go back down into the floor, whole,
 * as they came, and the camera goes to the house. In the second a
 * clearing opens in the land (atmosphere.ts) and spreads from under the
 * house over the floor and on to the horizon, the floor goes, the light
 * becomes the sunset's and the sky comes up behind. At rest the land is
 * not drawn at all.
 *
 * Only the first set is built before the first frame. The other three are
 * built one at a time as soon as the picture is up, while it still stands
 * unmoving on the opening card, and each is warmed (its light, its
 * geometry and its textures sent to the GPU) so that scrolling into it
 * costs nothing. The three on the card come up after that, so their
 * entrance is not interrupted by the work; a visitor who scrolls at once
 * gets it at once.
 *
 * Coming up out of the floor needs nothing of the materials: the floor's
 * depth is drawn before the buildings (kit/plaza.tsx), so what is still under
 * it is hidden, its reflection keeps only what stands over the floor
 * (kit/mirror.tsx), and a caster under the floor can never shade anything
 * over it.
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
 * The opening, in seconds: when each of the three comes up out of the floor,
 * whole, in the menu's order (MOD, POD, FAB). Each one's lights come on once
 * it stands (client, 2026-10-10: placed, settled, then lit): `settle` after
 * it is up, over `glow`. The whole is as long as the last of them takes.
 */
const INTRO = { total: 5, house: [0, 1.6], capsule: [1, 2.6], prefab: [2, 3.7], settle: 0.3, glow: 0.95 } as const;
/**
 * How far under the floor each of the three starts, if its own height cannot
 * be measured: the house with its roof and panels, the capsule on its legs,
 * the block of two floors with its gallery rail.
 */
const UNDER = [4.6, 3.6, 7.4] as const;
/** The block's own ground line is its set's gravel pad: on the card it stands on the bare floor, this much lower. */
const BLOCK_Y = -0.06;
/** The first house waits this long at most for the other sets to be warmed. */
const INTRO_WAIT = 4000;
/** How far before a cut the next set must exist, in progress (about a third of a screen). */
const AHEAD = 0.07;
const COMPOSED = 1.55;
const PULL = 0.5;
/**
 * The opening card's scroll (0–1), first part: up to here the camera leaves
 * the three for the house and the other two go back down into the floor.
 * film.css takes the mist's rise from the same number (--lineup).
 */
const LINEUP = 0.34;
/** When the capsule and the block go, within that part: the block first, then the capsule, each whole, both before the camera is near. */
const LEAVE = { prefab: [0.02, 0.58], capsule: [0.12, 0.66] } as const;
/** The second part (0–1 of what is left): over which the land spreads out, and the sky comes up. */
const LAND_IN: [number, number] = [0.05, 0.84];
const SKY_IN: [number, number] = [0.3, 0.88];
/** The clearing's radius in metres as it opens (0–1): slow round the house, fast to the horizon, about 450 m at the end. */
const reach = (t: number) => 2.5 * (Math.exp(5.2 * t) - 1);
/** While it is alone the house stands this much nearer, and this many metres higher in the frame, clear of the mist at its feet. */
const NEAR = 0.9;
const LIFT = 0.62;
/** How dark the shadows lie on the floor: the card's. */
const FLOOR_SHADOW = LOOKS.card.shadow.opacity;
/** How strongly the floor mirrors what stands on it (kit/mirror.tsx), at a grazing angle. */
const GLOSS = 0.72;
/** Over this part of the card's second part (0–1) the card's light becomes the sunset's, while the mist is up. */
const LIGHT_IN: [number, number] = [0.04, 0.6];
/**
 * The floor goes while the land is still near the house (0–1 of the land's
 * spread): the meadow grows over it at first, and before the land reaches
 * its own hills, which dip under a flat floor, the rest of it has gone into
 * the shade behind.
 */
const FLOOR_OUT: [number, number] = [0.2, 0.48];
/** The shadow floor lies this far over the polished one. */
const SHADOW_Y = PLAZA_Y + 0.01;

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

/**
 * What the three are fitted into (kit/rowfit.ts, Band), measured from the
 * card's own words on this screen: its margins, the header, the headline
 * that no building may stand over, each name's own box under its building
 * and how low a name may hang. On a narrow screen the picture is the top of
 * the card, from under the header down to the words (film.css).
 */
function measureBand(canvas: HTMLCanvasElement, compact: boolean): Band | null {
  const sticky = canvas.closest<HTMLElement>('.film__sticky');
  const words = sticky?.querySelector<HTMLElement>('.prelude__top');
  const line = sticky?.querySelector<HTMLElement>('.prelude__line');
  if (!sticky || !words || !line) return null;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  const hdr = document.querySelector<HTMLElement>('[data-hdr]')?.offsetHeight ?? 64;
  const [cx, cy] = offsetIn(canvas, sticky);
  const [, wy] = offsetIn(words, sticky);
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const gutter = Math.min(4 * rem, Math.max(rem, 0.04 * window.innerWidth));
  // Each name as it is set: how wide, and where its top and foot hang under its point (film.css, .lbl--kind).
  const labels = ['mod', 'pod', 'fab'].map((id) => {
    const name = sticky.querySelector<HTMLElement>(`[data-label="kind-${id}"] > span`);
    return name ? { w: name.offsetWidth, top: name.offsetTop, bottom: name.offsetTop + name.offsetHeight } : { w: 10 * rem, top: 0.9 * rem, bottom: 4 * rem };
  });
  const top = hdr + 0.5 * rem - cy;
  if (compact) {
    const kicker = words.querySelector<HTMLElement>('.prelude__kicker') ?? words;
    const [, ky] = offsetIn(kicker, sticky);
    return { w, h, l: gutter * 0.6, r: w - gutter * 0.6, top, bottom: ky - cy - 1.2 * rem, textRight: -1, textBottom: 0, labels, cue: null };
  }
  // The words: how far right they reach (the headline's lines and the small line over them) and where their block ends.
  let right = 0;
  const range = document.createRange();
  const edge = sticky.getBoundingClientRect().left;
  for (const ln of [...line.querySelectorAll<HTMLElement>('.prelude__ln > span'), ...words.querySelectorAll<HTMLElement>('.prelude__kicker')]) {
    range.selectNodeContents(ln);
    right = Math.max(right, range.getBoundingClientRect().right - edge);
  }
  // The scroll cue, at the foot on the right: a name keeps out of its corner.
  const mark = sticky.querySelector<HTMLElement>('.film__prelude-cue');
  let cue: Band['cue'] = null;
  if (mark && mark.offsetWidth) {
    const [mx, my] = offsetIn(mark, sticky);
    cue = { x0: mx - cx, y0: my - cy };
  }
  const rail = 2.6 * rem;
  return {
    w,
    h,
    l: gutter,
    r: w - Math.max(gutter, rail),
    top,
    bottom: h - Math.max(1.1 * rem, h * 0.04),
    textRight: right - cx + 1.5 * rem,
    textBottom: wy + words.offsetHeight - cy + 0.9 * rem,
    labels,
    cue,
  };
}

/** Where nothing of the card can be measured: a band from the canvas alone. */
function plainBand(w: number, h: number): Band {
  const label = { w: 160, top: 14, bottom: 62 };
  return { w, h, l: 0.04 * w, r: 0.96 * w, top: 76, bottom: 0.95 * h, textRight: -1, textBottom: 0, labels: [label, label, label], cue: null };
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
 * The shadows of what stands on the card's floor, laid over it: each kept
 * for a few metres from its caster and then let go (the light is low; a
 * shadow left whole would lie across the next building's ground). It lies a
 * hair over the polished floor and under the land, which covers both as it
 * spreads, and it is gone before the land has spread far. `spots`: each
 * caster's place and the two distances between which its shadow goes (x, z,
 * from, to), written by the scene when it knows where the three stand.
 */
function shadowFloor(color: string, opacity: number, spots: Vector4[]) {
  const m = new ShadowMaterial({ color, opacity, transparent: true });
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
const _box = new Box3();

/** The three on the card as the scene has them: the fit for this screen, with the camera's pose made ready for `aim`. */
interface RowView {
  key: string;
  fit: RowFit;
  pos: number[];
  look: number[];
  /** On a narrow screen: how far towards the camera the floor reaches before the card's words (two distances from its centre, on plan). */
  near: [number, number] | null;
  /** Where the floor ends round the three: the two distances from its centre between which it goes. */
  ends: [number, number];
}

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
  const capsule = useRef<Group>(null);
  const prefab = useRef<Group>(null);
  const mirror = useRef<Group>(null);
  const plazaHold = useRef<Group>(null);
  /** How far under the floor each of the three (house, capsule, block) is while it waits: its own height over the floor, measured once. */
  const under = useRef([0, 0, 0]);
  /**
   * One of the three, `t` (0–1) of the way up out of the floor: whole, from wholly under it to standing on it,
   * slowing as it arrives. `base`: where it stands.
   */
  const raise = (k: number, g: Group | null, base: number, t: number) => {
    if (!g) return;
    if (!under.current[k]) {
      g.position.y = base;
      _box.setFromObject(g);
      under.current[k] = Math.max(UNDER[k], _box.isEmpty() ? 0 : _box.max.y - PLAZA_Y + 0.1);
    }
    g.position.y = base - (1 - ease.out(t)) * under.current[k];
  };
  /** How strongly the floor reflects, 0–1: full on the card, gone as the land comes in. */
  const gloss = useRef(0);
  // The floor's slabs lie square to the house; where it ends is set with the three (viewOfRow).
  const plaza = useMemo(() => plazaMaterial(FARM_YAW), []);
  useMirror(rig, mirror, [house, others], () => gloss.current, plaza.grid);
  const floor = useRef<Mesh>(null);
  const gl = useThree((s) => s.gl);
  const aspect = size.width / size.height;
  useEffect(() => () => plaza.material.dispose(), [plaza]);
  const spots = useMemo(() => [new Vector4(0, 0, 6, 13), new Vector4(0, 0, 6, 12), new Vector4(0, 0, 12, 22)], []);
  const floorMat = useMemo(() => shadowFloor(LOOKS.card.shadow.color, FLOOR_SHADOW, spots), [spots]);
  useEffect(() => () => floorMat.dispose(), [floorMat]);
  const current = useRef(-1);
  /** Sets built so far, in order. */
  const [built, setBuilt] = useState(1);
  const warmed = useRef(1);
  const landWarm = useRef(0);
  /**
   * The three and the camera on them, fitted to the card's words on this screen (rowfit.ts): worked out on the
   * first frame at a size, and again once the fonts are in, since the headline's measure changes with them.
   */
  const rowView = useRef<RowView | null>(null);
  /** A camera of the fit's own, with the stage's lens: the scene's is not moved about to try arrangements. */
  const probe = useMemo(() => (camera as PerspectiveCamera).clone(), [camera]);
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
   * Where the floor would meet the sky, seen from a camera pose, as a percentage of the screen's height: the
   * page's shade behind the canvas has its glow there (film.css, --floor).
   */
  const horizon = (pos: readonly number[], look: readonly number[]) => {
    aim(camera, pos, look, aspect, COMPOSED, PULL);
    _hz.set(look[0] - pos[0], 0, look[2] - pos[2]).normalize().multiplyScalar(4000).add(camera.position).setY(0).project(camera);
    return (-_hz.y * 0.5 + 0.5) * 100;
  };
  const viewOfRow = () => {
    const key = `${size.width}x${size.height}-${compact ? 'c' : 'w'}-${fonts.current}`;
    if (rowView.current?.key === key) return rowView.current;
    const cam = camera as PerspectiveCamera;
    // The fit's camera sees through the stage's lens as it is now: its field, its shape, its off-centre framing.
    probe.fov = cam.fov;
    probe.aspect = cam.aspect;
    if (cam.view) probe.setViewOffset(cam.view.fullWidth, cam.view.fullHeight, cam.view.offsetX, cam.view.offsetY, cam.view.width, cam.view.height);
    else probe.clearViewOffset();
    probe.updateProjectionMatrix();
    const only = import.meta.env.DEV ? (window as unknown as { __veeRow?: number }).__veeRow : undefined;
    const band = measureBand(gl.domElement, compact) ?? plainBand(size.width, size.height);
    const fit = fitRow(probe, band, compact, only);
    // `aim` stands every pose back by its own measure on a narrow screen: the fit's pose is given the difference.
    const back = aspect < COMPOSED ? 1 + (COMPOSED / aspect - 1) * PULL : 1;
    const pos = fit.look.map((q, k) => q + (fit.pos[k] - q) / back);
    rowView.current = { key, fit, pos, look: fit.look, near: null, ends: [80, 200] };
    if (import.meta.env.DEV) (rig as unknown as { row?: unknown }).row = rowView.current;
    // The two behind the house, where this arrangement has them (how high: `raise`, every frame).
    const { row } = fit;
    capsule.current?.position.set(...row.capsule.at);
    if (capsule.current) capsule.current.rotation.y = row.capsule.turn;
    prefab.current?.position.set(row.prefab.at[0], BLOCK_Y, row.prefab.at[2]);
    if (prefab.current) prefab.current.rotation.y = row.prefab.turn;
    row.spots.forEach((s, k) => spots[k].set(...s));
    // The floor ends well behind the three and under the camera's feet; on a narrow screen it is an island under them, clear of the words.
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const hull of row.hull)
      for (const q of hull) {
        cx += q[0];
        cz += q[2];
        n++;
      }
    cx /= n;
    cz /= n;
    let far = 0;
    for (const hull of row.hull) for (const q of hull) far = Math.max(far, Math.hypot(q[0] - cx, q[2] - cz));
    const eye = Math.hypot(fit.pos[0] - cx, fit.pos[2] - cz);
    if (compact) {
      rowView.current.ends = [far + 4, far + 22];
      plaza.fade.set(cx, cz, far + 4, far + 22);
      // The words stand under the picture, not on it: the floor ends over them. Where that is on the floor, seen from the fitted camera.
      probe.position.set(fit.pos[0], fit.pos[1], fit.pos[2]);
      probe.lookAt(fit.look[0], fit.look[1], fit.look[2]);
      probe.updateMatrixWorld();
      const nx = (fit.pos[0] - cx) / (eye || 1);
      const nz = (fit.pos[2] - cz) / (eye || 1);
      const along = (y: number) => {
        _hz.set(0, -((y / band.h) * 2 - 1), 0.5).unproject(probe).sub(probe.position);
        const t = _hz.y < -1e-6 ? -probe.position.y / _hz.y : 0;
        return (probe.position.x + _hz.x * t - cx) * nx + (probe.position.z + _hz.z * t - cz) * nz;
      };
      const foot = band.bottom + 4;
      rowView.current.near = [along(foot - Math.min(90, band.h * 0.1)), along(foot)];
      plaza.near.set(nx, nz, rowView.current.near[0], rowView.current.near[1]);
    } else {
      plaza.fade.set(cx, cz, Math.max(eye + 25, far + 30), Math.max(eye + 25, far + 30) + 130);
      plaza.near.set(0, 1, 1e5, 1e5 + 1);
    }
    // The shade's glow stands where the floor would meet the sky, here and once the camera is by the house.
    const backdrop = gl.domElement.closest('.film__sticky')?.querySelector<HTMLElement>('.film__backdrop--studio');
    if (backdrop) {
      const farm = SETS.farm;
      const at = farm.from.look.map((q, k) => q - (k === 1 ? LIFT : 0));
      const there = horizon(farm.from.pos.map((q, k) => at[k] + (q - at[k]) * NEAR), at);
      const here = horizon(pos, fit.look);
      backdrop.style.setProperty('--floor', here.toFixed(2));
      backdrop.style.setProperty('--floor-drop', `${(there - here).toFixed(2)}svh`);
    }
    return rowView.current;
  };
  /** The look last set for the first set's stretch: how far the card's light has gone over to the sunset. */
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
   * How far the card's first part has gone: 0 the three, 1 the camera is with the house and the other two are away.
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
    // Dev only: `window.__veeIntro = <seconds>` holds the opening at that moment, for captures (its clock runs slow under them).
    const hold = import.meta.env.DEV ? (window as unknown as { __veeIntro?: number }).__veeIntro : undefined;
    if (hold !== undefined) intro.t = clamp01(hold / INTRO.total);
    const p = progress.value;
    const i = setAt(p);
    groups.current.forEach((g, k) => g && (g.visible = k === i));
    // The opening card, in its two parts. Only the first set has one.
    const pre = i === 0 ? progress.pre : 1;
    const led = lead();
    const open = clamp01((pre - LINEUP) / (1 - LINEUP));
    if (i === 0) {
      // The card has a light of its own; as the land comes in it becomes the farm's sunset.
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
    // The floor's shadows go just before the ground comes: the land's trees and shrubs cast theirs as soon as it is there,
    // before the clearing has reached them, and on a bare floor those lay about the house as marks with nothing to cast them.
    floorMat.opacity = FLOOR_SHADOW * (1 - clamp01(open / LAND_IN[0]));
    // The floor's reflection goes with its shadows, and is not there once the other sets are.
    gloss.current = i === 0 ? GLOSS * (1 - clamp01((t - 0.02) / 0.1)) : 0;
    if (floor.current) floor.current.visible = floorMat.opacity > 0.003;
    // The floor itself: the meadow grows over it, and what the meadow has not reached goes into the shade behind.
    const paved = i === 0 ? 1 - ease.inOut(span(t, FLOOR_OUT)) : 0;
    plaza.cover.value = paved;
    if (plazaHold.current) plazaHold.current.visible = paved > 0.003;
    // While the floor is there the land keeps out of the occlusion's view: that pass draws all of it, shown or not,
    // and the grass and shrubs the clearing has not reached darkened the floor where they stand, as stains.
    if (land.current) land.current.userData.unoccluded = paved > 0.003;
    const alone = 1 - ease.inOut(open);
    const near = lerp(1, NEAR, alone);
    const inRow = 1 - ease.inOut(led);
    const view = inRow > 0 ? viewOfRow() : null;
    // On a narrow screen the floor's near edge is for the card's words: as the camera leaves the three it moves off, well before it could be seen.
    const edge = rowView.current?.near;
    if (edge && rowView.current) {
      plaza.near.z = edge[0] + (1 - inRow) * 240;
      plaza.near.w = edge[1] + (1 - inRow) * 240;
      // And the island the floor is there grows with it: from by the house its edge would lie across the foreground.
      plaza.fade.z = rowView.current.ends[0] + (1 - inRow) * 150;
      plaza.fade.w = rowView.current.ends[1] + (1 - inRow) * 150;
    }
    // The three come up out of the floor whole, in turn; the capsule and the block go back down into it, whole, as the
    // card's first part scrolls by.
    const a = intro.t * INTRO.total;
    raise(0, house.current, 0, span(a, INTRO.house));
    if (led < 1) {
      const row = rowView.current?.fit.row;
      raise(1, capsule.current, row ? row.capsule.at[1] : 0, Math.min(span(a, INTRO.capsule), 1 - span(led, LEAVE.capsule)));
      raise(2, prefab.current, BLOCK_Y, Math.min(span(a, INTRO.prefab), 1 - span(led, LEAVE.prefab)));
    }
    for (let k = 0; k < 3; k++) {
      const at = lerp(s.from.look[k], s.to.look[k], u) - (k === 1 ? LIFT * alone : 0);
      const from = at + (lerp(s.from.pos[k], s.to.pos[k], u) - at) * near;
      _look[k] = view ? lerp(at, view.look[k], inRow) : at;
      _pos[k] = view ? lerp(from, view.pos[k], inRow) : from;
    }
    aim(camera, _pos, _look, aspect, COMPOSED, PULL);
    rig.lightTarget.set(_look[0], 0, _look[2]);
    // Each of the three is named once it stands; the names go as the card starts to open.
    const named = i === 0 && view ? clamp01(1 - progress.pre * 9) : 0;
    const tags = (view ?? rowView.current)?.fit.tags;
    if (tags) {
      label('kind-mod', ...tags[0], named * clamp01((a - INTRO.house[1] + 0.5) * 2.5));
      label('kind-pod', ...tags[1], named * clamp01((a - INTRO.capsule[1] + 0.4) * 2.5));
      label('kind-fab', ...tags[2], named * clamp01((a - INTRO.prefab[1] + 0.5) * 2.5));
    }
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
      // The house is whole from the start: it comes up out of the floor as one (`raise`), never part by part.
      first: () => 1,
      firstLit: lit(INTRO.house[1]),
      capsuleLit: lit(INTRO.capsule[1], LEAVE.capsule),
      prefabLit: lit(INTRO.prefab[1], LEAVE.prefab),
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
        <PlazaFloor plaza={plaza} hold={plazaHold} />
        {/* The opening card's three are in the kit's refined finishes (kit/refined.ts): they alone, not the sets that follow. */}
        <Refined value>
          <FarmSet getA={getters.first} getLit={getters.firstLit} look={looks[0]} land={land} house={house} />
          <Lineup
            getCapsuleLit={getters.capsuleLit}
            getPrefabLit={getters.prefabLit}
            look={looks[0]}
            hold={others}
            capsule={capsule}
            prefab={prefab}
            feet={20}
            bays={ROW_BAYS}
          />
        </Refined>
        <group ref={mirror} />
        <mesh ref={floor} material={floorMat} rotation-x={-Math.PI / 2} position={[0, SHADOW_Y, -20]} receiveShadow>
          <planeGeometry args={[220, 220]} />
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
