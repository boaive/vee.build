import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { extent } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { ease, lerp } from '../../film/timeline';
import Stage, { aim, type Rig } from '../Stage';
import { House } from '../kit/house';

/**
 * "Your house": the visitor's build alone on a plinth in a dark studio. The
 * camera turns slowly round it as the page scrolls.
 */

const plinthMat = new MeshStandardMaterial({ color: '#17191c', roughness: 0.32, metalness: 0.1 });

function Reveal({ progress, rig }: SceneProps & { rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => extent(view.units, view.base), [view.units, view.base]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const p = ease.inOut(progress.value);
    const az = lerp(0.95, -0.42, p);
    const el = lerp(0.34, 0.2, p);
    const dist = fit.reach * lerp(3.3, 2.75, p);
    const look = [0, fit.h * 0.42, 0];
    aim(camera, [Math.sin(az) * Math.cos(el) * dist, look[1] + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist], look, size.width / size.height, 1.5, 0.75);
    rig.lightTarget.set(0, 0, 0);
  });

  return (
    <>
      <mesh material={plinthMat} position-y={0.15} receiveShadow castShadow>
        <cylinderGeometry args={[fit.r + 3.2, fit.r + 3.4, 0.3, 96]} />
      </mesh>
      <group position={[-fit.cx, 0.3, -fit.cz]}>
        <House units={view.units} addOns={view.addOns} deckSide={view.deckSide} manual={view.manual} shellHex={view.shellHex} deckHex={view.deckHex} trimHex={view.trimHex} foundation={view.foundation} look={rig.look} />
      </group>
    </>
  );
}

export default function RevealScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioDark" ground="floor" focus={[0.64, 0.54]} focusCompact={[0.5, 0.36]} shadowExtent={22} fogRange={[60, 160]}>
      {(rig) => <Reveal {...props} rig={rig} />}
    </Stage>
  );
}
