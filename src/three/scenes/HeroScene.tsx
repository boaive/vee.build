import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MeshBasicMaterial, type Group, type Mesh } from 'three';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { LOOKS } from '../kit/looks';
import { CampusSet, FarmSet, PodSet, SETS, WorkSet, type SetName } from '../kit/sets';

/**
 * Hero: the brief's four building types, each shot alone against a plain
 * sunset sky. Scrolling moves through them; a short dissolve covers each
 * change of set while the light is retuned. The first building assembles on load, the others as
 * their set arrives.
 *
 * Only the first set is built before the first frame. The other three are
 * built one at a time once the picture is up (normally while the opening
 * card still covers it), and each is warmed (its light, its geometry and
 * its textures sent to the GPU) so that scrolling into it costs nothing.
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
/** How far before a cut the next set must exist, in progress (about a third of a screen). */
const AHEAD = 0.07;
const COMPOSED = 1.55;
const PULL = 0.5;

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
  const current = useRef(-1);
  /** Sets built so far, in order. */
  const [built, setBuilt] = useState(1);
  const warmed = useRef(1);
  const aspect = size.width / size.height;

  useFrame((_, dt) => {
    // The first house assembles as the opening card opens, not behind it.
    if (intro.t < 1 && progress.pre > 0.3) {
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
    const pos = [0, 1, 2].map((k) => lerp(s.from.pos[k], s.to.pos[k], u));
    const look = [0, 1, 2].map((k) => lerp(s.from.look[k], s.to.look[k], u));
    aim(camera, pos, look, aspect, COMPOSED, PULL);
    rig.lightTarget.set(look[0], 0, look[2]);
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
    // Quiet: the first picture is up and the boot screen has lifted, and nothing is moving.
    const quiet = () =>
      !rig.holding &&
      !document.documentElement.classList.contains('is-booting') &&
      Math.abs(progress.target - progress.value) < 1e-4 &&
      (intro.t >= 1 || progress.pre <= 0.3);
    const step = () => {
      if (!alive) return;
      if (!quiet()) {
        const id = window.setTimeout(() => (cancel = idle(step)), 250);
        cancel = () => window.clearTimeout(id);
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
          return () => groups.current.forEach((g, j) => g && (g.visible = was[j]));
        });
        cancel = idle(step);
        return;
      }
      if (built < ORDER.length) setBuilt(built + 1);
    };
    cancel = idle(step, 200);
    return () => {
      alive = false;
      cancel();
    };
  }, [built, rig, progress, intro, camera, aspect]);

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
        <FarmSet getA={getters.first} look={looks[0]} />
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
