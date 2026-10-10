import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MeshBasicMaterial, ShadowMaterial, Vector4, type Group, type Mesh } from 'three';
import { HERO_CUTS } from '../../film/heroTimeline';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { LOOKS } from '../kit/looks';
import { CampusSet, FarmSet, Lineup, PodSet, ROW, ROW_COMPACT, SETS, WorkSet, type Row, type SetName } from '../kit/sets';

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
/**
 * The camera on the row of three, and the shape of screen each view is
 * composed for: on a narrower one it stands back in proportion, so the row
 * keeps its place between the edges. Wide: from the same side as the farm
 * set's own camera, farther back and level with the eye, the three along
 * the foot of the picture with the words above them. Narrow: the picture
 * is the upper half of an upright screen, so the three stand one behind
 * another and are seen from above.
 */
const ROW_VIEW = { pos: [29.5, 2.5, 24.6], look: [14.7, 2.0, -7.2], aspect: 1.72 };
const ROW_VIEW_COMPACT = { pos: [23.6, 14, 46.4], look: [-8.1, -0.5, -21.6], aspect: 0.462 };
/** How dark the shadows lie on the bare floor. */
const FLOOR_SHADOW = LOOKS[SETS.farm.look].shadow.opacity;

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

function Hero({ progress, place, reduced, compact, rig }: SceneProps & { rig: Rig }) {
  const intro = useMemo(() => ({ t: reduced ? 1 : 0 }), [reduced]);
  const label = useLabel(place);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const groups = useRef<(Group | null)[]>([]);
  const land = useRef<Group>(null);
  const others = useRef<Group>(null);
  const floor = useRef<Mesh>(null);
  const row = compact ? ROW_COMPACT : ROW;
  const floorMat = useMemo(() => shadowFloor(LOOKS[SETS.farm.look].shadow.color, FLOOR_SHADOW, row), [row]);
  useEffect(() => () => floorMat.dispose(), [floorMat]);
  const current = useRef(-1);
  /** Sets built so far, in order. */
  const [built, setBuilt] = useState(1);
  const warmed = useRef(1);
  const landWarm = useRef(0);
  const aspect = size.width / size.height;
  const view = compact ? ROW_VIEW_COMPACT : ROW_VIEW;
  // `aim` stands every pose back by its own measure on a narrow screen; the row's pose is given the difference.
  const stand = Math.max(1, view.aspect / aspect) / (aspect < COMPOSED ? 1 + (COMPOSED / aspect - 1) * PULL : 1);

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
    if (i !== current.current) {
      current.current = i;
      rig.setLook(LOOKS[SETS[ORDER[i]].look]);
    }
    const s = SETS[ORDER[i]];
    const u = ease.inOut(localU(p, i));
    // The opening card, in its two parts. Only the first set has one.
    const pre = i === 0 ? progress.pre : 1;
    const led = lead();
    const open = clamp01((pre - LINEUP) / (1 - LINEUP));
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
    if (floor.current) floor.current.visible = floorMat.opacity > 0.003;
    const alone = 1 - ease.inOut(open);
    const near = lerp(1, NEAR, alone);
    const inRow = 1 - ease.inOut(led);
    for (let k = 0; k < 3; k++) {
      const at = lerp(s.from.look[k], s.to.look[k], u) - (k === 1 ? LIFT * alone : 0);
      const from = at + (lerp(s.from.pos[k], s.to.pos[k], u) - at) * near;
      _look[k] = lerp(at, view.look[k], inRow);
      _pos[k] = lerp(from, view.look[k] + (view.pos[k] - view.look[k]) * stand, inRow);
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
        <FarmSet getA={getters.first} getLit={getters.firstLit} look={looks[0]} land={land} />
        <Lineup row={row} getCapsule={getters.capsule} getPrefab={getters.prefab} getCapsuleLit={getters.capsuleLit} getPrefabLit={getters.prefabLit} look={looks[0]} hold={others} />
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
