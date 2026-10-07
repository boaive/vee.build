import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MeshBasicMaterial, ShadowMaterial, type Group, type Mesh } from 'three';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { LOOKS } from '../kit/looks';
import { CampusSet, FARM_TAG, FarmSet, PodSet, SETS, WorkSet, type SetName } from '../kit/sets';

/**
 * Hero: the brief's four building types, each shot alone against a plain
 * sunset sky. Scrolling moves through them; a short dissolve covers each
 * change of set while the light is retuned. The first building assembles on load, the others as
 * their set arrives.
 *
 * The page opens on the first house alone: no land, no sky, the canvas
 * clear to the page behind it, the house's shadow on a floor that is not
 * there. Scrolling through the opening card opens a clearing in the land
 * (atmosphere.ts) that spreads from under the house to the horizon, and
 * brings the sky up behind it. At rest the land is not drawn at all.
 *
 * Only the first set is built before the first frame. The other three are
 * built one at a time as soon as the picture is up, while it still stands
 * unmoving on the opening card, and each is warmed (its light, its
 * geometry and its textures sent to the GPU) so that scrolling into it
 * costs nothing. The first house is put together after that, so its
 * assembly is not interrupted by the work; a visitor who scrolls at once
 * gets it at once.
 */

const ORDER: SetName[] = ['farm', 'pods', 'work', 'campus'];
/** Progress at which one set gives way to the next. */
const CUTS = [1 / 6, 1 / 2, 5 / 6];
const RANGE: [number, number][] = [
  [0, CUTS[0]],
  [CUTS[0], CUTS[1]],
  [CUTS[1], CUTS[2]],
  [CUTS[2], 1],
];
const VEIL = 0.035;
const INTRO_SECONDS = 2.6;
/** The first house waits this long at most for the other sets to be warmed. */
const INTRO_WAIT = 4000;
/** How far before a cut the next set must exist, in progress (about a third of a screen). */
const AHEAD = 0.07;
const COMPOSED = 1.55;
const PULL = 0.5;
/** The opening card's scroll (0–1) over which the land spreads out, and the sky comes up. */
const LAND_IN: [number, number] = [0.05, 0.84];
const SKY_IN: [number, number] = [0.3, 0.88];
/** The clearing's radius in metres as it opens (0–1): slow round the house, fast to the horizon, about 450 m at the end. */
const reach = (t: number) => 2.5 * (Math.exp(5.2 * t) - 1);
/** While it is alone the house stands this much nearer, and this many metres higher in the frame, clear of the mist at its feet. */
const NEAR = 0.9;
const LIFT = 0.62;
/** How dark the house's shadow lies on the bare floor. */
const FLOOR_SHADOW = LOOKS[SETS.farm.look].shadow.opacity;

const setAt = (p: number) => {
  let i = 0;
  while (i < CUTS.length && p >= CUTS[i]) i++;
  return i;
};
const localU = (p: number, i: number) => clamp01((p - RANGE[i][0]) / (RANGE[i][1] - RANGE[i][0]));

const idle = (fn: () => void, wait = 60) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 1200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, wait);
  return () => window.clearTimeout(id);
};

/**
 * The floor of the opening: nothing but the house's shadow, fading out a few
 * metres from it (the sun is low and the shadow would run on for fifty). It
 * lies just under the land, which covers it as it spreads, and it is gone
 * before the land has spread far.
 */
function shadowFloor(color: string, opacity: number) {
  const m = new ShadowMaterial({ color, opacity, transparent: true });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `#include <fog_fragment>
#ifdef USE_FOG
  gl_FragColor.a *= 1.0 - smoothstep( 3.0, 10.0, length( cameraPosition.xz + vAtmDir.xz ) );
#endif`,
    );
  };
  m.customProgramCacheKey = () => 'shadow-floor';
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

function Hero({ progress, place, reduced, rig }: SceneProps & { rig: Rig }) {
  const intro = useMemo(() => ({ t: reduced ? 1 : 0 }), [reduced]);
  const label = useLabel(place);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const groups = useRef<(Group | null)[]>([]);
  const land = useRef<Group>(null);
  const floor = useRef<Mesh>(null);
  const floorMat = useMemo(() => shadowFloor(LOOKS[SETS.farm.look].shadow.color, FLOOR_SHADOW), []);
  useEffect(() => () => floorMat.dispose(), [floorMat]);
  const current = useRef(-1);
  /** Sets built so far, in order. */
  const [built, setBuilt] = useState(1);
  const warmed = useRef(1);
  const landWarm = useRef(0);
  const aspect = size.width / size.height;

  // The first house is put together on the opening card, once the loading screen has lifted.
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

  useFrame((_, dt) => {
    if (!go.current && !booting.current) {
      started.current ||= performance.now();
      go.current = warmed.current >= ORDER.length || progress.pre > 0.02 || progress.value > 0 || performance.now() - started.current > INTRO_WAIT;
    }
    if (intro.t < 1 && go.current) {
      intro.t = Math.min(1, intro.t + Math.min(dt, 0.05) / INTRO_SECONDS);
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
    // The opening: how far the land has spread (1: all of it) and how much sky there is. Only the first set has one.
    const pre = i === 0 ? progress.pre : 1;
    const t = clamp01((pre - LAND_IN[0]) / (LAND_IN[1] - LAND_IN[0]));
    if (t < 1) {
      const r = reach(t);
      rig.clear[2] = r;
      rig.clear[3] = 1.2 + r * 0.55;
    } else rig.clear[3] = 0;
    rig.sky = ease.inOut(clamp01((pre - SKY_IN[0]) / (SKY_IN[1] - SKY_IN[0])));
    if (land.current) land.current.visible = t > 0;
    // The bare floor's shadow goes as the ground comes: once the trees are there, their long shadows would fall across it too.
    floorMat.opacity = FLOOR_SHADOW * (1 - clamp01((t - 0.02) / 0.12));
    if (floor.current) floor.current.visible = floorMat.opacity > 0.003;
    const alone = 1 - ease.inOut(pre);
    const near = lerp(1, NEAR, alone);
    const look = [0, 1, 2].map((k) => lerp(s.from.look[k], s.to.look[k], u) - (k === 1 ? LIFT * alone : 0));
    const pos = [0, 1, 2].map((k) => look[k] + (lerp(s.from.pos[k], s.to.pos[k], u) - look[k]) * near);
    aim(camera, pos, look, aspect, COMPOSED, PULL);
    rig.lightTarget.set(look[0], 0, look[2]);
    // The opening card names the house once it stands; the label goes as the card opens.
    label('home', FARM_TAG[0], FARM_TAG[1], FARM_TAG[2], i === 0 ? clamp01(intro.t * 5 - 4) * clamp01(1 - progress.pre * 3.2) : 0);
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
    // Quiet: the first picture is up and nothing is moving, the first house's assembly included.
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
      // Everything is warm: a frame, so that the first house starts.
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
    return i === k ? clamp01((localU(progress.value, k) - 0.04) / 0.45) : 0;
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
    () => ({
      first: () => ease.linear(intro.t),
      arrive: [1, 2, 3].map(arrive),
      show: [1, 2, 3].map(showIf),
    }),
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
        <FarmSet getA={getters.first} look={looks[0]} land={land} />
        <mesh ref={floor} material={floorMat} rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
          <planeGeometry args={[60, 60]} />
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
