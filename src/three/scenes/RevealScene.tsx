import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshStandardMaterial } from 'three';
import { extent, layoutAddOns } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { ease, lerp, track } from '../../film/timeline';
import Stage, { aim, type Rig } from '../Stage';
import { House } from '../kit/house';

/**
 * "Your house": the visitor's build alone on a plinth in a dark studio. The
 * scroll walks the camera from its front corner round to its front, so it
 * arrives and leaves showing its doors; the visitor can take hold of it and
 * turn it right round by hand.
 * A turn made by hand is added to the scroll's and let go as the page
 * scrolls on, so each caption still arrives on its own view.
 *
 * The camera goes round a house that stands still: nothing that casts a
 * shadow moves, so the shadow map is drawn once.
 */

const plinthMat = new MeshStandardMaterial({ color: '#17191c', roughness: 0.32, metalness: 0.1 });

/**
 * Camera azimuth by progress (0 looks square at the street front): one view
 * for each caption (narrative.ts, revealSteps). It stays on the near side of
 * the front: past it the camera looks into the key light and the studio
 * floor glares.
 */
const AZ = [
  [0, 1.12],
  [0.14, 0.92],
  [0.86, 0.16],
  [1, 0.06],
] as const;

function Reveal({ progress, rig, reduced }: SceneProps & { rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => {
    const e = extent(view.units, view.base);
    // The plinth and the framing take in what stands outside the shells too (decks, steps, the outer staircase), and are centred on the whole of it.
    let x0 = e.cx - e.w / 2;
    let x1 = e.cx + e.w / 2;
    let z0 = e.cz - e.d / 2;
    let z1 = e.cz + e.d / 2;
    for (const p of layoutAddOns(view.units, new Set(view.addOns), view.deckSide, view.manual, view.base, view.plot).pieces) {
      x0 = Math.min(x0, p.box[0]);
      x1 = Math.max(x1, p.box[3]);
      z0 = Math.min(z0, p.box[2]);
      z1 = Math.max(z1, p.box[5]);
    }
    const r = Math.hypot(x1 - x0, z1 - z0) / 2;
    return { ...e, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r, reach: e.reach * Math.max(1, Math.min(1.5, r / Math.max(e.r, 1) / 1.25)) };
  }, [view]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  /** The visitor's own turn, in radians, and where the scroll stood when it was last applied. */
  const hand = useRef({ az: 0, el: 0, at: -1, drag: null as { x: number; y: number; id: number } | null }).current;

  useEffect(() => {
    const el = gl.domElement;
    // Sideways turns the house; up and down stays the page's scroll on a touch screen.
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      hand.drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      const d = hand.drag;
      if (!d || d.id !== e.pointerId) return;
      hand.az -= (e.clientX - d.x) * 0.0062;
      if (e.pointerType !== 'touch') hand.el = Math.min(0.85, Math.max(-0.14, hand.el + (e.clientY - d.y) * 0.004));
      d.x = e.clientX;
      d.y = e.clientY;
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (hand.drag?.id !== e.pointerId) return;
      hand.drag = null;
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.style.cursor = '';
    };
  }, [gl, invalidate, hand]);

  useFrame(() => {
    const raw = progress.value;
    // Scrolling on hands the house back to the film.
    if (hand.at >= 0 && raw !== hand.at && !hand.drag) {
      const keep = reduced ? 0 : Math.exp(-Math.abs(raw - hand.at) * 16);
      hand.az *= keep;
      hand.el *= keep;
    }
    hand.at = raw;
    const p = ease.inOut(raw);
    const az = track(raw, AZ) + hand.az;
    const el = lerp(0.34, 0.2, p) + hand.el;
    // Square on, a wide house is at its widest: it stays far enough back to keep clear of the caption.
    const dist = fit.reach * lerp(3.45, 3.25, p);
    const look = [0, fit.h * 0.42, 0];
    aim(camera, [Math.sin(az) * Math.cos(el) * dist, look[1] + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist], look, size.width / size.height, 1.5, 0.75);
    rig.lightTarget.set(0, 0, 0);
  });

  return (
    <>
      <mesh material={plinthMat} position-y={0.15} receiveShadow castShadow>
        <cylinderGeometry args={[fit.r + 2.4, fit.r + 2.6, 0.3, 96]} />
      </mesh>
      <group position={[-fit.cx, 0.3, -fit.cz]}>
        <House units={view.units} addOns={view.addOns} deckSide={view.deckSide} manual={view.manual} shellHex={view.shellHex} deckHex={view.deckHex} trimHex={view.trimHex} foundation={view.foundation} look={rig.look} plot={view.plot} />
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
