/**
 * Site plant shared by the factory and the installation: a flatbed truck and
 * a mobile crane. Procedural, in metres; animated by the scene through refs
 * and getters, never by their own clocks.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MeshStandardMaterial, Object3D, Vector3, type Group, type Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { box, cyl, memo, merge, mergeGroups } from './geometry';
import { mat } from './materials';

const truckPaint = new MeshStandardMaterial({ color: '#e7e4dd', roughness: 0.42, metalness: 0.15 });
const cranePaint = new MeshStandardMaterial({ color: '#e3a92f', roughness: 0.5, metalness: 0.15 });
const cabGlass = new MeshStandardMaterial({ color: '#8d99a3', roughness: 0.05, metalness: 0.8 });

function wheels(xs: number[], track: number, r = 0.52) {
  return xs.flatMap((x) =>
    [-1, 1].map((s) => {
      const w = cyl(r, r, 0.38, 18);
      w.rotateX(Math.PI / 2);
      w.translate(x, r, s * track);
      return w;
    }),
  );
}

/**
 * Flatbed truck, cab towards −x, deck top at TRUCK.deckY. Origin on the
 * ground under the middle of the deck. Groups: 0 paint, 1 dark, 2 glass, 3 deck.
 */
export const TRUCK = { deckY: 1.42, deckL: 13.2, deckW: 2.55 } as const;

export function truckGeometry() {
  return memo('truck', () => {
    const cabX = -TRUCK.deckL / 2 - 1.5;
    const cab = new RoundedBoxGeometry(2.3, 2.6, 2.5, 3, 0.18);
    cab.translate(cabX, 2.35, 0);
    const paint = [cab, box(2.2, 0.5, 2.5, cabX, 0.95, 0)];
    const dark = [
      box(TRUCK.deckL + 3.6, 0.36, 1.1, -1.4, 0.95, 0),
      box(0.25, 0.6, 2.4, cabX - 1.2, 0.85, 0),
      ...wheels([cabX + 0.2, -2.2, -0.9, 3.6, 4.9], 1.05),
    ];
    const glass = [box(0.06, 1.1, 2.2, cabX - 1.16, 2.85, 0), box(1.5, 0.9, 0.04, cabX + 0.1, 2.85, 1.26), box(1.5, 0.9, 0.04, cabX + 0.1, 2.85, -1.26)];
    const deck = [box(TRUCK.deckL, 0.16, TRUCK.deckW, 0, TRUCK.deckY - 0.08, 0), box(0.12, 1.1, TRUCK.deckW, -TRUCK.deckL / 2 + 0.06, TRUCK.deckY + 0.5, 0)];
    return mergeGroups([paint, dark, glass, deck]);
  });
}

export function Truck({ getX, z = 0, ry = 0, children }: { getX: () => number; z?: number; ry?: number; children?: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = getX();
  });
  const mats = useMemo(() => [truckPaint, mat.rubber, cabGlass, mat.steel], []);
  return (
    <group ref={ref} position-z={z} rotation-y={ry}>
      <mesh geometry={truckGeometry()} material={mats} castShadow receiveShadow />
      {children}
    </group>
  );
}

/** Crane carrier on four outriggers. Origin under the slewing ring. Groups: 0 paint, 1 dark. */
function carrierGeometry() {
  return memo('crane-carrier', () => {
    const paint = [box(9.5, 1.1, 2.6, -0.6, 1.35, 0), box(2.2, 1.6, 2.5, -4.8, 2.2, 0)];
    const dark = [...wheels([-4, -2.6, 1.6, 3], 1.05, 0.55)];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        dark.push(box(0.25, 0.25, 2.4, sx * 3.4, 1.0, sz * 2.4), box(0.22, 1.0, 0.22, sx * 3.4, 0.5, sz * 3.6), box(0.7, 0.08, 0.7, sx * 3.4, 0.04, sz * 3.6));
      }
    return mergeGroups([paint, dark]);
  });
}

function boomGeometry() {
  // Unit length along +z from the pivot; tapers to a head sheave.
  return memo('crane-boom', () => merge([box(0.75, 0.85, 1, 0, 0, 0.5), box(0.5, 0.5, 0.18, 0, -0.05, 1.02)]));
}

const _o = new Object3D();
const _tip = new Vector3();

export interface CraneProps {
  position: [number, number, number];
  /** World position of the hook block, read every frame. */
  getHook: () => Vector3;
  /** Height of the boom tip above the hook (cable length when slack is taken up). */
  head?: number;
}

/**
 * Mobile crane. The upper body slews and the boom luffs and telescopes so
 * its tip stays `head` metres above the hook; the cable hangs between them.
 */
export function MobileCrane({ position, getHook, head = 4.5 }: CraneProps) {
  const upper = useRef<Group>(null);
  const boom = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const hook = useRef<Mesh>(null);
  const pivot = useMemo(() => new Vector3(position[0], position[1] + 2.6, position[2]), [position]);
  const carrierMats = useMemo(() => [cranePaint, mat.rubber], []);

  useFrame(() => {
    const h = getHook();
    _tip.set(h.x, h.y + head, h.z);
    if (upper.current) upper.current.rotation.y = Math.atan2(_tip.x - pivot.x, _tip.z - pivot.z);
    const b = boom.current;
    if (b) {
      _o.position.copy(pivot);
      _o.lookAt(_tip);
      b.position.copy(pivot);
      b.quaternion.copy(_o.quaternion);
      b.scale.set(1, 1, pivot.distanceTo(_tip));
    }
    const c = cable.current;
    if (c) {
      c.position.set(_tip.x, (_tip.y + h.y) / 2 + 0.2, _tip.z);
      c.scale.set(1, Math.max(0.01, _tip.y - h.y - 0.4), 1);
    }
    hook.current?.position.copy(h);
  });

  return (
    <group>
      <mesh geometry={carrierGeometry()} material={carrierMats} position={position} castShadow receiveShadow />
      <group ref={upper} position={[position[0], position[1] + 2.05, position[2]]}>
        <mesh geometry={memo('crane-upper', () => box(2.6, 1.1, 4.6, 0, 0.5, -0.8))} material={cranePaint} castShadow />
        <mesh geometry={memo('crane-cab', () => box(1.3, 1.5, 1.5, 1.3, 0.75, 1.1))} material={cabGlass} castShadow />
      </group>
      <group ref={boom}>
        <mesh geometry={boomGeometry()} material={cranePaint} castShadow />
      </group>
      <mesh ref={cable} geometry={memo('unit-cyl', () => cyl(0.02, 0.02, 1, 6))} material={mat.steel} />
      <mesh ref={hook} geometry={memo('hook-block', () => merge([box(0.45, 0.6, 0.35, 0, 0.3, 0), cyl(0.05, 0.05, 0.4, 6, 0, -0.1, 0)]))} material={cranePaint} castShadow />
    </group>
  );
}
