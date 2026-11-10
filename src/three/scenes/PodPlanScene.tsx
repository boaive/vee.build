/**
 * The POD page's plans in 3D (PodPlans): the pod of the chosen length and
 * layout seen from above with its top off, its rooms furnished as the plan
 * beside it draws them (kit/podLayers.ts, the same plan as the drawing,
 * build/podPlanSvg.ts). The skin is the pod's own walls (kit/pod.tsx,
 * `part`). Lit as the light studio stage, standing on the section's own
 * light with its shadow (since 2026-11-10; it had a floor of its own in a
 * grey box); it turns a little with the pointer, as the product pages'
 * stages do (Showcase), and renders on demand.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { MeshStandardMaterial } from 'three';
import { podChoice } from '../../film/podChoice';
import type { SceneProps } from '../../film/progress';
import Stage, { aim, type Rig } from '../Stage';
import { LOOKS } from '../kit/looks';
import { Pod } from '../kit/pod';
import { podReach } from '../kit/podPlan';
import { podFurniture, podLining } from '../kit/podLayers';

function Plan({ progress, reduced, rig }: SceneProps & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const [c, setC] = useState({ length: podChoice.length as number, layout: podChoice.layout });
  useEffect(() => {
    const go = () => {
      setC({ length: podChoice.length, layout: podChoice.layout });
      invalidate();
    };
    podChoice.listeners.add(go);
    return () => {
      podChoice.listeners.delete(go);
    };
  }, [invalidate]);
  const L = c.length;
  const colours = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.03 }), []);
  useEffect(() => () => colours.dispose(), [colours]);
  const state = useMemo(() => ({ yaw: 0.5 }), []);

  useFrame((_, dt) => {
    const diff = progress.target - state.yaw;
    if (Math.abs(diff) > 0.0005 && !reduced) {
      state.yaw += diff * (1 - Math.exp(-Math.min(dt, 0.05) * 3.5));
      invalidate();
    }
    // From above the front, a little to the side; the pointer swings it about twelve degrees either way.
    const k = podReach(L);
    const a = 0.32 + (state.yaw - 0.5) * 0.42;
    const r = 16.5 * k;
    const look = [0, 0.75, 0.35];
    const pos = [look[0] + Math.sin(a) * r * 0.62, look[1] + r * 0.86, look[2] + Math.cos(a) * r * 0.62];
    aim(camera, pos, look, size.width / size.height, 1.7, 0.8);
    rig.lightTarget.set(0, 0, 0);
  });

  return (
    <>
      <Pod length={L} part="walls" look={LOOKS.studioLight} />
      <group position-x={-L / 2}>
        <mesh geometry={podLining(L)} material={colours} castShadow receiveShadow />
        <mesh geometry={podFurniture(L, c.layout)} material={colours} castShadow receiveShadow />
      </group>
    </>
  );
}

/** On the section's warm light (sections.css `.plans`): the canvas draws the pod and its shadow, nothing round them. */
export default function PodPlanScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioLight" ground="shadow" focus={[0.5, 0.5]} focusCompact={[0.5, 0.5]} shadowExtent={12}>
      {(rig) => <Plan {...props} rig={rig} />}
    </Stage>
  );
}
