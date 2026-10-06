import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Mesh } from 'three';
import { STOREY, extent, placeOf, type Unit } from '../../build/model';
import { shown, useBuild } from '../../build/store';
import type { SceneProps } from '../../film/progress';
import { clamp01, ease, lerp, win } from '../../film/timeline';
import Stage, { aim, type Rig } from '../Stage';
import { Pad } from '../kit/buildings';
import { Paving } from '../kit/env';
import { box, memo, merge } from '../kit/geometry';
import { FoundationParts, House } from '../kit/house';
import { MobileCrane, TRUCK, Truck } from '../kit/machines';
import { mat, moduleMats } from '../kit/materials';
import { moduleGeometry } from '../kit/parts';

/**
 * Installation: the visitor's build (or the sample) arrives on a truck and a
 * mobile crane sets each shell on its foundation, ground floor first, then
 * the add-ons arrive. Pure function of progress, like every film.
 */

export const LIFT = { from: 0.12, to: 0.72 } as const;
const ADDONS = { from: 0.74, to: 0.88 };

/** Order of lifting: by floor, then along the street. */
export function liftOrder(units: readonly Unit[]) {
  return [...units].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
}

/** Lifting window of the k-th shell of n. */
const windowOf = (k: number, n: number): [number, number] => {
  const d = (LIFT.to - LIFT.from) / Math.max(1, n);
  return [LIFT.from + k * d, LIFT.from + (k + 1) * d];
};

const _hook = new Vector3();

function Install({ progress, rig }: SceneProps & { rig: Rig }) {
  const state = useBuild((s) => s);
  const view = useMemo(() => shown(state), [state]);
  const fit = useMemo(() => extent(view.units, view.base), [view.units, view.base]);
  const order = useMemo(() => liftOrder(view.units), [view.units]);
  const rank = useMemo(() => new Map(order.map((u, k) => [u.id, k])), [order]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const cargo = useRef<Mesh>(null);
  const cargoB = useRef<Mesh>(null);

  // Scene layout around the build's footprint (house coordinates are offset by -cx, -cz).
  const off = useMemo(() => new Vector3(-fit.cx, 0, -fit.cz), [fit]);
  // The lane runs behind the plot, so nothing stands between the camera and the house.
  const truckZ = -(fit.d / 2 + 8);
  const crane: [number, number, number] = [fit.w / 2 + 6, 0, -fit.d / 2 - 1.5];
  const safeY = (Math.max(...view.units.map((u) => u.y)) + 1) * STOREY + view.base + 2.5;
  const truckX = (p: number) => lerp(70, 0, ease.outQuart(win(p, 0, 0.1, ease.linear))) - ease.in(win(p, 0.86, 1, ease.linear)) * 80;

  /** World position (base centre) and turn of unit u at progress p, or null before its lift. */
  const where = (u: Unit, p: number): [number, number, number, number] | null => {
    const k = rank.get(u.id) ?? 0;
    const [a, b] = windowOf(k, order.length);
    const [fx, fy, fz, fry] = placeOf(u, view.base);
    const final: [number, number, number] = [fx + off.x, fy, fz + off.z];
    if (p >= b) return [final[0], final[1], final[2], fry];
    if (p < a) return null;
    const t = (p - a) / (b - a);
    const start: [number, number, number] = [truckX(p), TRUCK.deckY, truckZ];
    const up = ease.inOut(clamp01(t / 0.3));
    const across = ease.inOut(clamp01((t - 0.3) / 0.45));
    const down = ease.inOut(clamp01((t - 0.75) / 0.25));
    return [lerp(start[0], final[0], across), lerp(start[1], safeY, up) - down * (safeY - final[1]), lerp(start[2], final[2], across), lerp(0, fry, across)];
  };

  const pose = (u: Unit): [number, number, number, number, number] | null => {
    const w = where(u, progress.value);
    if (!w) return null;
    const [fx, fy, fz] = placeOf(u, view.base);
    return [w[0] - off.x - fx, w[1] - fy, w[2] - off.z - fz, 1, w[3]];
  };

  const getHook = () => {
    const p = progress.value;
    const k = order.findIndex((_, i) => {
      const [a, b] = windowOf(i, order.length);
      return p >= a && p < b;
    });
    if (k >= 0) {
      const w = where(order[k], p);
      if (w) return _hook.set(w[0], w[1] + STOREY + 0.4, w[2]);
    }
    // After the last lift the boom is stowed low along the carrier; before the first it waits over the trailer.
    if (p >= LIFT.to) {
      const stow = ease.inOut(win(p, LIFT.to, LIFT.to + 0.08));
      return _hook.set(lerp(crane[0] - 3, crane[0] - 9, stow), lerp(safeY + 2, 1.2, stow), lerp(truckZ, crane[2], stow));
    }
    return _hook.set(lerp(truckX(p), crane[0] - 3, 0.5), safeY + 2, truckZ);
  };

  useFrame(() => {
    const p = progress.value;
    // The next shell waits on the trailer until the crane takes it.
    const next = order.find((_, i) => p < windowOf(i, order.length)[0]);
    const lifting = order.some((_, i) => {
      const [a, b] = windowOf(i, order.length);
      return p >= a && p < b;
    });
    const show = !!next && !lifting;
    for (const [m, t] of [
      [cargo.current, 'A'],
      [cargoB.current, 'B'],
    ] as const) {
      if (!m) continue;
      m.visible = show && next?.t === t;
      m.position.set(truckX(p), TRUCK.deckY, truckZ);
    }

    // Camera: wide on arrival, raised over the lifts, then down to eye level in front.
    const e = ease.inOut(p);
    const az = lerp(0.78, 0.18, e);
    const el = lerp(0.24, 0.08, ease.inOut(win(p, 0.6, 1))) + 0.16 * Math.sin(Math.PI * clamp01(p / 0.8));
    const dist = fit.reach * lerp(3.6, 3, e);
    const look = [lerp(6, 0, ease.inOut(win(p, 0, 0.3))), fit.h * lerp(0.3, 0.42, e), lerp(-3, 0, e)];
    aim(camera, [look[0] + Math.sin(az) * Math.cos(el) * dist, look[1] + Math.sin(el) * dist, look[2] + Math.cos(az) * Math.cos(el) * dist], look, size.width / size.height, 1.5, 0.7);
    rig.lightTarget.set(look[0], 0, look[2]);
  });

  const lane = useMemo(() => memo(`lane-${truckZ}`, () => merge([box(140, 0.04, 4.2, 40, 0.02, truckZ)])), [truckZ]);
  const mats = moduleMats(view.shellHex, rig.look.windows);

  return (
    <>
      <Pad w={fit.w + 10} d={fit.d + 9} r={0.5} y={0.01} material={mat.gravel} />
      <mesh geometry={lane} material={mat.paving} receiveShadow />
      <Paving w={2} d={6} x={-fit.w / 2 + 2} z={fit.d / 2 + 4} tile={1} y={0.015} material={mat.paving} lineOpacity={0.08} />
      <group position={off.toArray()}>
        <FoundationParts units={view.units} foundation={view.foundation} />
        <House units={view.units} addOns={view.addOns} deckSide={view.deckSide} manual={view.manual} shellHex={view.shellHex} deckHex={view.deckHex} trimHex={view.trimHex} foundation={view.foundation} look={rig.look} footings={false} pose={pose} addOnT={() => win(progress.value, ADDONS.from, ADDONS.to, ease.out)} />
      </group>
      <Truck getX={() => truckX(progress.value)} z={truckZ} ry={Math.PI} />
      <mesh ref={cargo} geometry={moduleGeometry('A')} material={mats} castShadow visible={false} />
      <mesh ref={cargoB} geometry={moduleGeometry('B')} material={mats} castShadow visible={false} />
      <MobileCrane position={crane} getHook={getHook} head={5.5} />
    </>
  );
}

export default function InstallScene(props: SceneProps) {
  return (
    <Stage {...props} look="evening" ground="land" focus={[0.64, 0.56]} focusCompact={[0.5, 0.36]} shadowExtent={30}>
      {(rig) => <Install {...props} rig={rig} />}
    </Stage>
  );
}
