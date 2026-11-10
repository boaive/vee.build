import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ShadowMaterial, type Group, type Mesh, type PerspectiveCamera } from 'three';
import type { SceneProps } from '../../film/progress';
import { ease } from '../../film/timeline';
import Stage, { aim, useWarmAll, type Rig } from '../Stage';
import { PrefabBuilding } from '../kit/prefab';
import { blend, cornersOf, newPose, placeOf, poseAt, posesAlong, type Pose, type Shot } from '../kit/frame';
import { LOOKS } from '../kit/looks';
import { useMirror } from '../kit/mirror';
import { PLAZA_Y, PlazaFloor, plazaMaterial } from '../kit/plaza';
import { FARM_YAW, HOUSE_BOX, blockBox } from '../kit/row';
import { PREFAB_ROW_BAYS } from '../kit/prefabPlan';
import { HouseAlone } from '../kit/sets';
import type { ShowcaseKind } from './ShowcaseScene';

/**
 * The product pages' picture on a phone or a tablet held upright (the
 * mobile and tablet round, 2026-10-14, after the developer's reference
 * screens for the capsule and the prefab building): the building alone on
 * the opening card's polished floor, large, with the page's shade behind
 * it (sections.css), no land and no sky. Desktop keeps ShowcaseScene, the
 * building in its set.
 *
 * It comes up out of the floor, whole, when it is first seen, and its
 * lights come on once it stands. A finger drawn across it turns the camera
 * round it (`progress.target`, 0–1, Showcase.tsx). The capsule's page has
 * its own opening since 2026-11-09 (PodHero).
 *
 * The materials are the kit's as they were: the refined finishes are the
 * opening card's alone (CLAUDE.md; notes Q3 for the modular house).
 */

const SHOTS: Record<ShowcaseKind, Shot> = {
  house: { box: HOUSE_BOX, base: 0, turn: [1.05, -0.15], el: 0.15, fill: [0.84, 0.7] },
  // The prefab building from the left, its staircase against that flank, its galleries along the front.
  prefab: { box: blockBox(PREFAB_ROW_BAYS), base: 0, turn: [-0.95, -0.35], el: 0.14, fill: [0.92, 0.7] },
};
/** How far under the floor each starts. */
const UNDER: Record<ShowcaseKind, number> = { house: 4.6, prefab: 11 };
/** Seconds to come up. */
const RISE = 1.5;
const GLOSS = 0.72;

const _pos = [0, 0, 0];
const _look = [0, 0, 0];

function Studio({ kind, progress, reduced, active, rig }: SceneProps & { kind: ShowcaseKind; rig: Rig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const all = useRef<Group>(null);
  const mirror = useRef<Group>(null);
  const floor = useRef<Mesh>(null);
  /** The building's group. */
  const refs = useMemo(() => [{ current: null as Group | null }], []);
  const plaza = useMemo(() => plazaMaterial(FARM_YAW), []);
  useEffect(() => () => plaza.material.dispose(), [plaza]);
  useMirror(rig, mirror, refs, () => GLOSS, plaza.grid);
  useWarmAll(rig, all);
  const shadow = useMemo(() => new ShadowMaterial({ color: LOOKS.card.shadow.color, opacity: LOOKS.card.shadow.opacity, transparent: true }), []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const probe = useMemo(() => camera.clone(), [camera]);

  const shots = useMemo(() => [SHOTS[kind]], [kind]);
  const corners = useMemo(() => shots.map(cornersOf), [shots]);
  const poses = useRef<{ key: string; list: Pose[][] }>({ key: '', list: [] });
  const chosen = 0;

  /** Each item's rise (0–1) and lights; the camera's framing as it goes from one to the next; the turn. */
  const state = useMemo(() => ({ rise: shots.map((): number => (reduced ? 1 : 0)), lit: shots.map((): number => (reduced ? 1 : 0)), yaw: 0.5, settled: false, placed: false, seen: reduced }), [shots, reduced]);
  /** The camera's framing now, and the one it is going to: this stage's own (a page can have two). */
  const [now, goal] = useMemo(() => [newPose(), newPose()], []);

  useEffect(() => {
    rig.sky = 0;
    rig.clear[3] = 0;
    plaza.near.set(0, 1, 1e5, 1e5 + 1);
  }, [rig, plaza]);
  // A new choice: the frame is drawn until the change has played.
  useEffect(() => {
    state.settled = false;
    invalidate();
  }, [chosen, state, invalidate]);
  useEffect(() => {
    if (active) {
      state.seen = true;
      invalidate();
    }
  }, [active, state, invalidate]);

  const lit = useMemo(() => shots.map((_, k) => () => state.lit[k]), [shots, state]);

  useFrame((_, dt) => {
    const step = reduced ? 1 : Math.min(dt, 0.05);
    let moving = false;
    // Up, or down: the chosen one comes up only once the other has gone, and only once the picture has been seen.
    const others = state.rise.some((r, k) => k !== chosen && r > 0);
    state.rise.forEach((r, k) => {
      const want = k === chosen && !others && state.seen ? 1 : 0;
      const next = want > r ? Math.min(1, r + step / RISE) : want < r ? Math.max(0, r - (step / RISE) * 1.6) : r;
      if (next !== r) moving = true;
      state.rise[k] = next;
      // Lights: on once it stands, out as soon as it starts to go.
      const l = next >= 1 && want === 1 ? Math.min(1, state.lit[k] + step / 0.8) : 0;
      if (l !== state.lit[k]) moving = true;
      state.lit[k] = l;
      const g = refs[k].current;
      if (g) {
        g.visible = next > 0.0005;
        g.position.y = shots[k].base - (1 - ease.out(next)) * UNDER[kind];
      }
    });

    // The turn follows the finger, damped.
    const d = progress.target - state.yaw;
    if (Math.abs(d) > 0.0005 && !reduced) {
      state.yaw += d * (1 - Math.exp(-step * 4));
      moving = true;
    } else state.yaw = progress.target;

    const aspect = (camera.userData.frameAspect as number | undefined) ?? size.width / size.height;
    const key = aspect.toFixed(3);
    if (poses.current.key !== key) {
      poses.current = { key, list: shots.map((s, k) => posesAlong(probe, s, corners[k], aspect)) };
      state.settled = false;
    }
    poseAt(poses.current.list[chosen], state.yaw, goal, false);
    if (!state.placed || state.settled) {
      blend(goal, goal, 0, now);
      state.placed = true;
    } else {
      // From where the camera was to the chosen one's framing.
      blend(now, goal, reduced ? 1 : 1 - Math.exp(-step * 3.2), now);
      if (Math.abs(now.d - goal.d) < 0.01 && now.look.distanceToSquared(goal.look) < 1e-4 && Math.abs(now.az - goal.az) < 1e-4) state.settled = true;
      else moving = true;
    }
    placeOf(now, _pos, _look);
    aim(camera, _pos, _look, 1, 1, 0);
    rig.lightTarget.set(_look[0], 0, _look[2]);

    const r = Math.max(14, now.d * 1.15);
    plaza.fade.set(_look[0], _look[2], r, r * 2.4);
    if (floor.current) floor.current.position.set(_look[0], PLAZA_Y + 0.01, _look[2]);
    if (moving) invalidate();
  });

  return (
    <group ref={all}>
      <PlazaFloor plaza={plaza} />
      {kind === 'house' && (
        <group ref={(g) => void (refs[0].current = g)}>
          <HouseAlone getLit={lit[0]} look={LOOKS.card} />
        </group>
      )}
      {kind === 'prefab' && (
        <group ref={(g) => void (refs[0].current = g)} rotation-y={FARM_YAW}>
          <PrefabBuilding getA={() => 1} getLit={lit[0]} look={LOOKS.card} bays={PREFAB_ROW_BAYS} />
        </group>
      )}
      <group ref={mirror} />
      <mesh ref={floor} material={shadow} rotation-x={-Math.PI / 2} position={[0, PLAZA_Y + 0.01, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
      </mesh>
    </group>
  );
}

export default function ShowcaseStudioScene({ kind, ...props }: SceneProps & { kind: ShowcaseKind }) {
  return (
    <Stage {...props} look="card" ground="none" focus={[0.5, 0.56]} focusCompact={[0.5, 0.56]} shadowExtent={kind === 'prefab' ? 22 : 14}>
      {(rig) => <Studio {...props} kind={kind} rig={rig} />}
    </Stage>
  );
}
