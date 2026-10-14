import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type { SceneProps } from '../../film/progress';
import { ease } from '../../film/timeline';
import Stage, { aim, useLabel, type Rig } from '../Stage';
import { CampusSet, FarmSet, PodSet, SETS, WorkSet, type SetName } from '../kit/sets';

/**
 * A single building in its setting, for the Modular, Capsule and Prefab
 * pages. It assembles once when it comes into view, then turns a few
 * degrees with the pointer. `progress.target` is the pointer's x position,
 * 0–1. The modular house is the one exception: it is the opening card's
 * house, and it stands whole from the start, its lights coming on as it
 * comes into view (client, 2026-10-14: the whole building, never part by
 * part; how it is put together is on the home page, "Componentized
 * building").
 */

export type ShowcaseKind = 'house' | 'capsule' | 'workforce' | 'institutional';

const SET: Record<ShowcaseKind, SetName> = { house: 'farm', capsule: 'pods', workforce: 'work', institutional: 'campus' };
/**
 * The capsule page frames its three on their own (client, 2026-10-11: "too
 * small, like toy houses"): near and at about eye level, so that they read
 * at their real size, the row across most of the stage. The hero's capsule
 * set looks off to one side for its caption; this stage has none.
 */
const FRAME: Partial<Record<ShowcaseKind, Pick<(typeof SETS)[SetName], 'from' | 'to'>>> = {
  capsule: { from: { pos: [6.2, 1.95, 18.6], look: [0, 1.62, 0] }, to: { pos: [-6.2, 1.9, 18.6], look: [0, 1.6, 0] } },
  // The house from its steps' side, as the hero's sunset has it, but nearer: a 6 m shell across the middle of the stage.
  house: { from: { pos: [9.6, 2.1, 15.2], look: [0.6, 1.9, 0.4] }, to: { pos: [4.2, 1.95, 16.6], look: [0.6, 1.85, 0.4] } },
};
/** The modular house is drawn finished. */
const whole = () => 1;
const SECONDS: Record<ShowcaseKind, number> = { house: 1.6, capsule: 2.4, workforce: 3.2, institutional: 3.6 };

function Model({ kind, progress, place, reduced, rig }: SceneProps & { kind: ShowcaseKind; rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const label = useLabel(place);
  const state = useMemo(() => ({ t: reduced ? 1 : 0, yaw: 0.5 }), [reduced]);
  const set = FRAME[kind] ?? SETS[SET[kind]];
  const look = rig.look;

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    let more = false;
    if (state.t < 1) {
      state.t = Math.min(1, state.t + d / SECONDS[kind]);
      more = true;
    }
    const diff = progress.target - state.yaw;
    if (Math.abs(diff) > 0.0005 && !reduced) {
      state.yaw += diff * (1 - Math.exp(-d * 3.5));
      more = true;
    }
    // Swing around the set's own framing, between its two camera poses.
    const u = state.yaw;
    const pos = [0, 1, 2].map((k) => set.from.pos[k] + (set.to.pos[k] - set.from.pos[k]) * u);
    const at = [0, 1, 2].map((k) => set.from.look[k] + (set.to.look[k] - set.from.look[k]) * u);
    aim(camera, pos, at, size.width / size.height, 1.7, 0.8);
    rig.lightTarget.set(at[0], 0, at[2]);
    if (more) invalidate();
  });

  const getA = () => ease.linear(state.t);
  if (kind === 'house') return <FarmSet getA={whole} getLit={() => ease.inOut(state.t)} look={look} />;
  if (kind === 'capsule') return <PodSet getA={getA} label={label} look={look} />;
  if (kind === 'workforce') return <WorkSet getA={getA} look={look} />;
  return <CampusSet getA={getA} label={label} look={look} />;
}

export default function ShowcaseScene({ kind, ...props }: SceneProps & { kind: ShowcaseKind }) {
  const set = SETS[SET[kind]];
  return (
    <Stage {...props} look={set.look} ground="none" focus={[0.5, 0.52]} focusCompact={[0.5, 0.52]} shadowExtent={set.shadow}>
      {(rig) => <Model {...props} kind={kind} rig={rig} />}
    </Stage>
  );
}
