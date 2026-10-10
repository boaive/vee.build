/**
 * Site plant shared by the factory, the journey and the installation: a
 * tractor with a flatbed trailer, a mobile crane with a four-point lifting
 * frame, a trailer pump. Procedural, in metres; moved by the scene through
 * getters, never by clocks of their own.
 *
 * Redrawn on 2026-10-10 (client: the crane, the truck and the pouring
 * equipment "look cartoonish"). Each now has the proportions and the parts
 * of the real machine: a cab-over tractor on three axles under a trailer
 * the length of one shell, a carrier on outriggers with a telescopic boom
 * in four sections that slide, a hook block on two falls of rope. The
 * crane lifts a shell by its four hooks (client, same day, with a
 * photograph): from the hook block four slings spread to the corners of a
 * lifting frame the size of the shell's roof, and from each corner of the
 * frame a sling drops plumb to the hook on that corner of the shell.
 */
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion, TorusGeometry, Vector3, type BufferGeometry, type Group, type InstancedMesh, type Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { box, cyl, memo, merge, mergeGroups } from './geometry';
import { instanced, mat } from './materials';
import { HOOKS } from './shell';

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

/** Fleet white: the tractor's cab, the pump's cowl. */
const fleet = new MeshStandardMaterial({ color: '#e9e6df', roughness: 0.34, metalness: 0.2 });
/** Chassis, frames, bumpers. */
const chassis = new MeshStandardMaterial({ color: '#24272b', roughness: 0.62, metalness: 0.35 });
/** Wheel rims, tanks, raves, cylinder rods. */
const alloy = new MeshStandardMaterial({ color: '#b6babe', roughness: 0.34, metalness: 0.85 });
const cabGlass = new MeshPhysicalMaterial({ color: '#1d2730', roughness: 0.06, metalness: 0.2, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03 });
const headlamp = new MeshStandardMaterial({ color: '#fff6e0', roughness: 0.3, emissive: '#fff0cc', emissiveIntensity: 2.6 });
const tailLamp = new MeshStandardMaterial({ color: '#4a0d09', roughness: 0.4, emissive: '#ff2a12', emissiveIntensity: 1.1 });
/** The crane's carrier and superstructure. */
const cranePaint = new MeshStandardMaterial({ color: '#dba01e', roughness: 0.44, metalness: 0.22 });
/** Its boom, and the lifting frame. */
const boomPaint = new MeshStandardMaterial({ color: '#4d545d', roughness: 0.46, metalness: 0.35 });
const ballast = new MeshStandardMaterial({ color: '#2a2d31', roughness: 0.74 });
/** Webbing slings. */
const webbing = new MeshStandardMaterial({ color: '#e3b52c', roughness: 0.85 });

const _m = new Matrix4();
const _q = new Quaternion();
const _a = new Vector3();
const _b = new Vector3();
const _s = new Vector3();
const UP = new Vector3(0, 1, 0);

/** A round bar from a to b. */
function rod(a: [number, number, number], b: [number, number, number], r: number, seg = 8): BufferGeometry {
  _a.set(...a);
  _b.set(...b);
  const len = _a.distanceTo(_b);
  const g = new CylinderGeometry(r, r, len, seg);
  _q.setFromUnitVectors(UP, _b.clone().sub(_a).normalize());
  _m.compose(_a.clone().add(_b).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
  g.applyMatrix4(_m);
  return g;
}

/** A cylinder lying along x. */
function drum(r: number, len: number, x: number, y: number, z: number, seg = 18): BufferGeometry {
  const g = new CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function rounded(w: number, h: number, d: number, x: number, y: number, z: number, r = 0.14): BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, 3, r);
  g.translate(x, y, z);
  return g;
}

/* ------------------------------------------------------------------ */
/* Wheels                                                              */
/* ------------------------------------------------------------------ */

const WHEEL_R = 0.52;

/** The parts of a road wheel, its axle along z, at the origin: tyre; rim, hub and wheel nuts (which is what shows it turning). */
function wheelParts(r: number, w: number) {
  const across = (g: BufferGeometry) => {
    g.rotateX(Math.PI / 2);
    return g;
  };
  const tyre = [across(new CylinderGeometry(r, r, w, 28)), across(new CylinderGeometry(r - 0.035, r - 0.035, w + 0.03, 28))];
  const rim: BufferGeometry[] = [across(new CylinderGeometry(r * 0.6, r * 0.6, w + 0.036, 20)), across(new CylinderGeometry(r * 0.2, r * 0.2, w + 0.1, 10))];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const nut = across(new CylinderGeometry(0.022, 0.022, w + 0.07, 6));
    nut.translate(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, 0);
    rim.push(nut);
  }
  return { tyre, rim };
}

/** One wheel, for wheels that turn (an instance each). Groups: 0 rubber, 1 rim. */
function wheelGeometry(r = WHEEL_R, w = 0.32) {
  return memo(`wheel-${r}-${w}`, () => {
    const { tyre, rim } = wheelParts(r, w);
    return mergeGroups([tyre, rim]);
  });
}

/** The wheels of a machine that stands, [x, z] of each, as one piece with the same two groups. */
function standingWheels(key: string, at: [number, number][], r: number, w: number) {
  return memo(`standing-wheels-${key}`, () => {
    const rubber: BufferGeometry[] = [];
    const rims: BufferGeometry[] = [];
    for (const [x, z] of at) {
      const { tyre, rim } = wheelParts(r, w);
      for (const g of tyre) rubber.push(g.translate(x, r, z));
      for (const g of rim) rims.push(g.translate(x, r, z));
    }
    return mergeGroups([rubber, rims]);
  });
}

/* ------------------------------------------------------------------ */
/* Tractor and flatbed trailer                                         */
/* ------------------------------------------------------------------ */

/**
 * Origin on the ground under the middle of the trailer's deck, cab towards
 * −x. `deckY` is where a load stands: the top of the timber bearers on the
 * deck. The deck is a little longer than one shell and narrower than it,
 * as a shell travels.
 */
export const TRUCK = { deckY: 1.34, deckL: 8.6, deckW: 2.55, cabX: -8.6, length: 13.9 } as const;
const BEARER = 0.1;
/** Every road wheel: x, z, and how wide (twin wheels on the driven and trailer axles). */
const TRUCK_WHEELS: [number, number, number][] = [
  [-7.55, 1.07, 1],
  [-4.75, 0.93, 1.95],
  [-3.4, 0.93, 1.95],
  [2.15, 0.93, 1.95],
  [3.5, 0.93, 1.95],
].flatMap(([x, z, w]) => [
  [x, z, w],
  [x, -z, w],
]);

/** Groups: 0 fleet paint, 1 chassis and deck, 2 glass, 3 bright metal, 4 headlamps, 5 tail lamps. */
export function truckGeometry() {
  return memo('truck-v2', () => {
    const { deckL: DL, deckW: DW, cabX } = TRUCK;
    const top = TRUCK.deckY - BEARER;
    const half = DL / 2;

    /* --- Trailer --- */
    const dark: BufferGeometry[] = [box(DL, 0.12, DW, 0, top - 0.06, 0)];
    const bright: BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      // Main beams, and the rave along each edge of the deck.
      dark.push(box(DL - 0.7, 0.36, 0.16, 0.25, top - 0.3, s * 0.5));
      bright.push(box(DL, 0.15, 0.05, 0, top - 0.075, s * (DW / 2 + 0.01)));
      // Side guard rails between the axle groups.
      for (const y of [0.56, 0.86]) bright.push(box(3.6, 0.06, 0.04, -0.75, y, s * (DW / 2 - 0.04)));
      for (const x of [-2.4, -0.75, 0.9]) dark.push(box(0.05, 0.62, 0.05, x, 0.8, s * (DW / 2 - 0.04)));
      // Mudguards over the trailer's axles, landing legs.
      dark.push(box(2.75, 0.05, 0.74, 2.825, WHEEL_R * 2 + 0.07, s * 0.93));
      dark.push(box(0.14, 0.72, 0.14, -2.75, top - 0.62, s * 0.78), box(0.32, 0.04, 0.32, -2.75, top - 1.0, s * 0.78));
    }
    for (let k = 0; k < 8; k++) dark.push(box(0.09, 0.16, DW - 0.1, -half + 0.5 + k * ((DL - 1) / 7), top - 0.2, 0));
    // Timber bearers the load stands on, the headboard, the rear under-run bar and its lamp panel.
    for (const x of [-2.3, 0, 2.3]) dark.push(box(0.16, BEARER, DW - 0.1, x, top + BEARER / 2, 0));
    bright.push(box(0.07, 1.05, DW - 0.06, -half + 0.035, top + 0.525, 0));
    for (const s of [-1, 1]) bright.push(box(0.1, 1.12, 0.1, -half + 0.05, top + 0.56, s * (DW / 2 - 0.05)));
    dark.push(box(0.12, 0.14, DW - 0.1, half + 0.04, 0.58, 0), box(0.06, 0.26, DW - 0.1, half + 0.03, 0.9, 0));
    const tail = [-1, 1].flatMap((s) => [box(0.05, 0.16, 0.5, half + 0.07, 0.9, s * 0.88), box(0.04, 0.07, 0.07, half + 0.02, top - 0.07, s * (DW / 2 - 0.06))]);
    // Mud flaps behind the last axle.
    for (const s of [-1, 1]) dark.push(box(0.03, 0.62, 0.66, 4.24, 0.5, s * 0.93));

    /* --- Tractor: chassis, fifth wheel, tanks --- */
    dark.push(box(6.3, 0.28, 0.92, -5.65, 0.84, 0), box(1.0, 0.1, 1.0, -4.05, 1.08, 0));
    for (const s of [-1, 1]) {
      dark.push(box(2.9, 0.06, 0.72, -4.075, WHEEL_R * 2 + 0.08, s * 0.93));
      bright.push(drum(0.3, 1.25, -6.05, 0.74, s * 0.98));
      for (const x of [-6.5, -5.6]) dark.push(box(0.06, 0.66, 0.06, x, 0.74, s * 1.3));
    }
    bright.push(rod([-6.7, 1.1, 1.14], [-6.7, 3.5, 1.14], 0.085, 12));

    /* --- Cab --- */
    const front = cabX - 1.2;
    const paint: BufferGeometry[] = [rounded(2.4, 2.5, 2.5, cabX, 2.3, 0, 0.2)];
    // The air deflector on the roof, rising to the load behind it.
    const fairing = rounded(1.5, 0.5, 2.26, 0, 0, 0, 0.16);
    fairing.rotateZ(-0.2);
    fairing.translate(cabX + 0.4, 3.66, 0);
    paint.push(fairing);
    for (const s of [-1, 1]) paint.push(box(1.5, 0.46, 0.05, -6.25, 0.98, s * 1.24));
    dark.push(
      rounded(0.5, 0.5, 2.52, front + 0.14, 0.74, 0, 0.12),
      box(2.3, 0.3, 2.44, cabX, 1.0, 0),
      box(0.06, 0.84, 1.76, front - 0.005, 1.56, 0),
      box(0.36, 0.07, 2.36, front - 0.12, 3.36, 0),
    );
    for (let k = 0; k < 5; k++) bright.push(box(0.07, 0.03, 1.62, front - 0.012, 1.24 + k * 0.16, 0));
    for (const s of [-1, 1]) {
      dark.push(box(0.09, 0.56, 0.2, front + 0.18, 2.62, s * 1.5), box(0.06, 0.05, 0.3, front + 0.18, 2.86, s * 1.36));
      dark.push(box(0.6, 0.05, 0.3, cabX - 0.1, 0.62, s * 1.12));
    }
    for (const s of [-1, 1]) {
      // The door: its seams, its handle, the step under it, and the arch over the front wheel.
      const z = s * 1.256;
      for (const x of [cabX - 1.0, cabX + 0.28]) dark.push(box(0.018, 2.06, 0.012, x, 2.2, z));
      dark.push(box(1.3, 0.018, 0.012, cabX - 0.36, 3.22, z), box(1.3, 0.018, 0.012, cabX - 0.36, 1.18, z), box(0.2, 0.05, 0.03, cabX + 0.08, 2.08, z));
      dark.push(box(0.9, 0.06, 0.34, cabX - 0.36, 0.86, s * 1.14), box(1.42, 0.2, 0.1, -7.55, 1.16, s * 1.24), box(0.1, 0.5, 0.1, -8.26, 0.93, s * 1.24), box(0.1, 0.5, 0.1, -6.84, 0.93, s * 1.24));
      bright.push(box(0.5, 0.05, 0.02, cabX - 0.36, 1.62, z));
    }
    const glass = [box(0.06, 1.0, 2.16, front - 0.005, 2.78, 0), ...[-1, 1].map((s) => box(1.02, 0.82, 0.05, cabX - 0.38, 2.74, s * 1.255))];
    const lamps = [-1, 1].flatMap((s) => [box(0.07, 0.17, 0.42, front - 0.1, 0.78, s * 0.92), box(0.05, 0.05, 0.16, front - 0.3, 3.42, s * 0.8)]);

    return mergeGroups([paint, dark, glass, bright, lamps, tail]);
  });
}

const truckMats = [fleet, chassis, cabGlass, alloy, headlamp, tailLamp];
const wheelMats = [mat.rubber, alloy];
const _wheel = new Object3D();

/**
 * `getX`: where it is along its own line. `getRoll`: how far it has
 * travelled forwards, in metres, for the wheels (by default, what `getX`
 * says). Anything standing on it goes in as children.
 */
export function Truck({ getX, z = 0, ry = 0, getRoll, children }: { getX: () => number; z?: number; ry?: number; getRoll?: () => number; children?: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const wheels = useRef<InstancedMesh>(null);
  const last = useRef(NaN);
  const rim = useMemo(() => instanced(wheelMats), []);
  useFrame(() => {
    const x = getX();
    if (ref.current) ref.current.position.x = x;
    const w = wheels.current;
    // Forwards is towards the cab: −x on the truck's own line.
    const roll = getRoll ? getRoll() : -x * Math.cos(ry);
    if (!w || roll === last.current) return;
    last.current = roll;
    TRUCK_WHEELS.forEach(([wx, wz, wide], i) => {
      _wheel.position.set(wx, WHEEL_R, wz);
      _wheel.rotation.set(0, 0, roll / WHEEL_R);
      _wheel.scale.set(1, 1, wide);
      _wheel.updateMatrix();
      w.setMatrixAt(i, _wheel.matrix);
    });
    w.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={ref} position-z={z} rotation-y={ry}>
      <mesh geometry={truckGeometry()} material={truckMats} castShadow receiveShadow />
      <instancedMesh ref={wheels} args={[wheelGeometry(), rim, TRUCK_WHEELS.length]} castShadow frustumCulled={false} />
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The four-point lifting frame                                        */
/* ------------------------------------------------------------------ */

/**
 * What hangs from the crane's hook to lift a shell by its four hooks, after
 * the client's photograph: four slings from the hook down to the corners
 * of a frame the size of the shell's roof, cross members in the frame, and
 * from each corner a sling plumb down to the hook on that corner of the
 * shell. Origin at the crane's hook; the shell's hooks are `LIFT.drop`
 * below it. Groups: 0 the frame and the upper slings, 1 the webbing.
 */
export const LIFT = { spread: 2.7, hang: 1.25, drop: 3.95 } as const;

export function liftRigGeometry() {
  return memo('lift-rig-v1', () => {
    const hx = Math.abs(HOOKS[0][0]);
    const hz = Math.abs(HOOKS[0][2]);
    const y = -LIFT.spread;
    const steel: BufferGeometry[] = [];
    const web: BufferGeometry[] = [];
    // The frame: two long beams over the shell's long edges, an end beam and two cross members between them.
    for (const s of [-1, 1]) steel.push(box(hx * 2 + 0.5, 0.26, 0.16, 0, y, s * hz), box(hx * 2 + 0.5, 0.04, 0.24, 0, y + 0.13, s * hz), box(hx * 2 + 0.5, 0.04, 0.24, 0, y - 0.13, s * hz));
    for (const x of [-hx, -hx / 3, hx / 3, hx]) steel.push(box(0.14, 0.2, hz * 2, x, y, 0));
    const ring = new TorusGeometry(0.13, 0.03, 8, 18);
    ring.translate(0, -0.13, 0);
    steel.push(ring);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        // A lug on the frame's corner, the sling up to the hook, the webbing down to the shell.
        steel.push(box(0.05, 0.2, 0.16, sx * hx, y + 0.22, sz * hz));
        steel.push(rod([0, -0.26, 0], [sx * hx, y + 0.28, sz * hz], 0.026));
        web.push(box(0.075, LIFT.hang - 0.16, 0.022, sx * hx, y - 0.13 - (LIFT.hang - 0.16) / 2, sz * hz));
        const hook = new TorusGeometry(0.07, 0.022, 6, 12, Math.PI * 1.5);
        hook.rotateZ(Math.PI * 0.75);
        hook.rotateY(Math.atan2(sx, sz));
        hook.translate(sx * hx, -LIFT.drop + 0.1, sz * hz);
        steel.push(hook);
      }
    return mergeGroups([steel, web]);
  });
}

const rigMats = [boomPaint, webbing];

/* ------------------------------------------------------------------ */
/* Mobile crane                                                        */
/* ------------------------------------------------------------------ */

/** The carrier's deck, the slewing ring on it, and where the boom is pinned on the superstructure (behind the ring). */
const CRANE = { ring: 1.86, pivotY: 1.72, pivotBack: 1.7 } as const;
/** The boom: a base section and three that slide out of it. Nested, each stands this far out of the one before. */
const BOOM = { base: 10.2, sec: 9.6, lip: 0.5 } as const;
const NESTED = BOOM.base + 3 * BOOM.lip;
const AXLES = [-4.9, -2.0, 2.4, 3.9];
const RIGGERS = [-3.45, 4.95];

/** The carrier on its outriggers. Origin on the ground under the slewing ring, cab towards −x. Groups: 0 paint, 1 chassis, 2 glass, 3 pads and bright metal. */
function carrierGeometry() {
  return memo('crane-carrier-v2', () => {
    const paint = [box(11.6, 0.6, 2.7, -0.7, 1.5, 0), rounded(2.1, 1.36, 2.74, -6.2, 1.76, 0, 0.16), rounded(2.5, 0.62, 2.4, 3.5, 2.08, 0, 0.12)];
    const dark: BufferGeometry[] = [box(11, 0.44, 1.5, -0.7, 1.0, 0), box(0.3, 0.42, 2.7, -7.32, 0.92, 0), cyl(1.2, 1.2, 0.2, 28, 0, CRANE.ring - 0.1, 0)];
    const bright: BufferGeometry[] = [];
    for (const x of AXLES) for (const s of [-1, 1]) dark.push(box(1.5, 0.06, 0.56, x, 1.3, s * 1.1));
    for (const x of RIGGERS) {
      dark.push(box(0.44, 0.36, 7.3, x, 1.1, 0));
      for (const s of [-1, 1]) {
        dark.push(cyl(0.14, 0.14, 0.62, 14, x, 0.78, s * 3.5));
        bright.push(cyl(0.085, 0.085, 0.5, 12, x, 0.3, s * 3.5), box(0.95, 0.09, 0.95, x, 0.045, s * 3.5));
      }
    }
    const glass = [box(0.06, 0.72, 2.3, -7.26, 2.02, 0), ...[-1, 1].map((s) => box(1.15, 0.62, 0.05, -6.3, 2.04, s * 1.375))];
    for (const s of [-1, 1]) bright.push(box(0.07, 0.14, 0.36, -7.34, 1.1, s * 1.0));
    return mergeGroups([paint, dark, glass, bright]);
  });
}

/** What slews: the superstructure, its cab and its counterweight. Origin on the slewing ring, the boom towards +z. Groups: 0 paint, 1 ballast and winch, 2 glass. */
function upperGeometry() {
  return memo('crane-upper-v2', () => {
    const paint = [box(2.5, 1.1, 5.0, 0, 0.7, -1.2), box(0.5, 1.5, 1.6, -0.62, 1.2, -1.75), box(0.5, 1.5, 1.6, 0.62, 1.2, -1.75), rounded(1.2, 0.62, 1.95, 1.72, 0.5, 1.0, 0.1), box(1.26, 0.08, 2.0, 1.72, 1.98, 1.0)];
    const dark: BufferGeometry[] = [drum(0.42, 1.3, 0, 1.55, -2.85)];
    for (let i = 0; i < 3; i++) dark.push(box(2.95, 0.4, 1.3, 0, 0.36 + i * 0.43, -3.6));
    const glass = [box(1.12, 1.1, 1.88, 1.72, 1.4, 1.0)];
    return mergeGroups([paint, dark, glass]);
  });
}

/** One section of the boom, along +z from its foot. The last carries the head and its sheaves. */
function boomSection(i: number) {
  return memo(`crane-boom-v2-${i}`, () => {
    const w = [0.8, 0.68, 0.57, 0.47][i];
    const h = [0.94, 0.8, 0.67, 0.55][i];
    const len = i ? BOOM.sec : BOOM.base;
    const parts: BufferGeometry[] = [box(w, h, len, 0, 0, len / 2)];
    // A collar at the mouth of each section, where the next slides out.
    parts.push(box(w + 0.07, h + 0.07, 0.2, 0, 0, len - 0.1));
    if (i === 0) parts.push(box(1.1, 0.46, 0.9, 0, -0.2, 0.2));
    if (i === 3) parts.push(box(0.54, 0.76, 0.66, 0, -0.1, len + 0.28), drum(0.27, 0.44, 0, -0.26, len + 0.4));
    return merge(parts);
  });
}

/** The hook block on its two falls of rope: side plates, a sheave, the hook. Origin where the load hangs. Groups: 0 paint, 1 dark. */
function hookBlock() {
  return memo('crane-block-v2', () => {
    const paint = [-1, 1].map((s) => rounded(0.07, 0.7, 0.5, s * 0.14, 0.62, 0, 0.03));
    const hook = new TorusGeometry(0.15, 0.045, 8, 16, Math.PI * 1.45);
    hook.rotateZ(Math.PI * 0.8);
    hook.translate(0, 0.08, 0);
    const dark: BufferGeometry[] = [drum(0.2, 0.2, 0, 0.7, 0), cyl(0.06, 0.06, 0.26, 10, 0, 0.3, 0), hook];
    return mergeGroups([paint, dark]);
  });
}

const carrierMats = [cranePaint, chassis, cabGlass, alloy];
const upperMats = [cranePaint, ballast, cabGlass];
const blockMats = [cranePaint, chassis];
const _o = new Object3D();
const _tip = new Vector3();
const _pivot = new Vector3();
const _dir = new Vector3();

export interface CraneProps {
  position: [number, number, number];
  /** The way the carrier faces (its cab is at its own −x end). */
  heading?: number;
  /** World position of the hook, where the lifting frame hangs, read every frame. */
  getHook: () => Vector3;
  /** Height of the boom's head above the hook: the rope paid out. */
  head?: number;
  /** How the lifting frame is turned (the way the shell under it lies), read every frame. */
  getTurn?: () => number;
}

/**
 * Mobile crane with the four-point lifting frame on its hook. The
 * superstructure slews, the boom luffs and its sections slide out so that
 * its head stays `head` metres above the hook; the ram under the boom and
 * the two falls of rope follow.
 */
export function MobileCrane({ position, heading = 0, getHook, head = 4.5, getTurn }: CraneProps) {
  const upper = useRef<Group>(null);
  const boom = useRef<Group>(null);
  const sections = useRef<(Mesh | null)[]>([]);
  const ram = useRef<Mesh>(null);
  const piston = useRef<Mesh>(null);
  const rope = useRef<Mesh>(null);
  const block = useRef<Group>(null);
  const [px, py, pz] = position;

  useFrame(() => {
    const h = getHook();
    _tip.set(h.x, h.y + head, h.z);
    const yaw = Math.atan2(_tip.x - px, _tip.z - pz);
    if (upper.current) upper.current.rotation.y = yaw;
    // The boom's pin, behind the slewing ring on the superstructure.
    _pivot.set(px - Math.sin(yaw) * CRANE.pivotBack, py + CRANE.ring + CRANE.pivotY, pz - Math.cos(yaw) * CRANE.pivotBack);
    const reach = _pivot.distanceTo(_tip);
    const b = boom.current;
    if (b) {
      _o.position.copy(_pivot);
      _o.lookAt(_tip);
      b.position.copy(_pivot);
      b.quaternion.copy(_o.quaternion);
      // Each section slides out by the same amount; a reach shorter than the nested boom is not asked of it.
      const out = Math.max(0, (reach - NESTED) / 3);
      b.scale.z = reach < NESTED ? reach / NESTED : 1;
      sections.current.forEach((s, i) => s && i && (s.position.z = BOOM.base - BOOM.sec + (BOOM.lip + out) * i));
    }
    // The ram: from the front of the superstructure up to the underside of the base section.
    _dir.copy(_tip).sub(_pivot).normalize();
    _a.set(px + Math.sin(yaw) * 0.7, py + CRANE.ring + 0.95, pz + Math.cos(yaw) * 0.7);
    _b.copy(_pivot).addScaledVector(_dir, 5.2);
    _b.y -= 0.5;
    const len = _a.distanceTo(_b);
    for (const [m, from, to] of [
      [ram.current, 0, Math.min(len, 3.4)],
      [piston.current, Math.min(len, 3.4) - 0.2, len],
    ] as const) {
      if (!m) continue;
      _o.position.copy(_a).lerp(_b, (from + to) / 2 / len);
      _o.lookAt(_b);
      m.position.copy(_o.position);
      m.quaternion.copy(_o.quaternion);
      m.scale.z = Math.max(0.01, to - from);
    }
    if (rope.current) {
      rope.current.position.set(_tip.x, (_tip.y + h.y + 0.9) / 2, _tip.z);
      rope.current.scale.set(1, Math.max(0.01, _tip.y - h.y - 0.9), 1);
      rope.current.rotation.y = yaw;
    }
    const k = block.current;
    if (k) {
      k.position.copy(h);
      k.rotation.y = getTurn ? getTurn() : yaw;
    }
  });

  // Until the first frame the boom lies along the carrier.
  useLayoutEffect(() => {
    sections.current.forEach((s, i) => s && i && (s.position.z = BOOM.base - BOOM.sec + BOOM.lip * i));
  }, []);

  const unitBar = memo('unit-bar-z', () => {
    const g = new CylinderGeometry(1, 1, 1, 14);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const falls = memo('crane-falls', () => merge([-1, 1].map((s) => cyl(0.016, 0.016, 1, 6, s * 0.11, 0, 0))));

  return (
    <group>
      <group position={position} rotation-y={heading}>
        <mesh geometry={carrierGeometry()} material={carrierMats} castShadow receiveShadow />
        <mesh geometry={standingWheels('crane', AXLES.flatMap((x) => [[x, 1.1], [x, -1.1]] as [number, number][]), 0.6, 0.5)} material={wheelMats} castShadow />
      </group>
      <group ref={upper} position={[px, py + CRANE.ring, pz]}>
        <mesh geometry={upperGeometry()} material={upperMats} castShadow receiveShadow />
      </group>
      <group ref={boom}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              sections.current[i] = m;
            }}
            geometry={boomSection(i)}
            material={boomPaint}
            castShadow
          />
        ))}
      </group>
      <mesh ref={ram} geometry={unitBar} material={chassis} scale={[0.17, 0.17, 1]} castShadow />
      <mesh ref={piston} geometry={unitBar} material={alloy} scale={[0.1, 0.1, 1]} />
      <mesh ref={rope} geometry={falls} material={mat.steel} />
      <group ref={block}>
        <mesh geometry={hookBlock()} material={blockMats} castShadow />
        <mesh geometry={liftRigGeometry()} material={rigMats} castShadow />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Trailer pump                                                        */
/* ------------------------------------------------------------------ */

/** Where the delivery line leaves the pump, on its own plan: under the hopper, at its +x end. */
export const PUMP_OUTLET: [number, number, number] = [1.95, 0.62, 0];

/**
 * A trailer-mounted concrete pump: a single-axle chassis on four
 * stabiliser legs, the cowl over its engine and hydraulics, a control box,
 * and at the back the hopper with its grille, over the valve the delivery
 * line leaves from. Origin on the ground under the axle, drawbar towards
 * −x. Groups: 0 fleet paint, 1 chassis, 2 bright metal.
 */
export function pumpGeometry() {
  return memo('pump-v2', () => {
    const paint = [rounded(2.1, 0.98, 1.16, -0.45, 1.24, 0, 0.12), rounded(0.42, 0.62, 0.5, -0.9, 1.1, 0.72, 0.05)];
    const hopper = cyl(0.74, 0.4, 0.62, 4, 0, 0, 0);
    hopper.rotateY(Math.PI / 4);
    hopper.translate(1.25, 1.2, 0);
    const dark: BufferGeometry[] = [
      box(3.5, 0.16, 1.0, 0, 0.66, 0),
      rod([-1.75, 0.66, 0.4], [-3.0, 0.56, 0], 0.05),
      rod([-1.75, 0.66, -0.4], [-3.0, 0.56, 0], 0.05),
      cyl(0.05, 0.05, 0.5, 8, -2.95, 0.3, 0),
      box(0.26, 0.04, 0.26, -2.95, 0.02, 0),
      box(0.9, 0.5, 0.66, 1.25, 0.72, 0),
      box(0.7, 0.42, 0.03, -0.45, 1.3, 0.585),
      box(0.7, 0.42, 0.03, -0.45, 1.3, -0.585),
      cyl(0.05, 0.05, 0.4, 8, -1.3, 1.9, -0.3),
    ];
    const bright: BufferGeometry[] = [hopper, drum(0.075, 0.5, PUMP_OUTLET[0] - 0.25, PUMP_OUTLET[1], 0, 12)];
    for (let k = 0; k < 6; k++) bright.push(box(0.03, 0.03, 0.98, 0.78 + k * 0.19, 1.53, 0));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        dark.push(box(0.09, 0.09, 0.5, sx * 1.55, 0.62, sz * 0.72), cyl(0.045, 0.045, 0.6, 8, sx * 1.55, 0.32, sz * 0.94));
        bright.push(box(0.26, 0.04, 0.26, sx * 1.55, 0.02, sz * 0.94));
      }
    return mergeGroups([paint, dark, bright]);
  });
}

/** One job per machine's geometry, for building them in idle time before a film that uses them mounts (film/prefetch.ts). */
export const prepareMachines: (() => void)[] = [
  () => void truckGeometry(),
  () => void wheelGeometry(),
  () => void liftRigGeometry(),
  () => void carrierGeometry(),
  () => void upperGeometry(),
  () => [0, 1, 2, 3].forEach(boomSection),
  () => void hookBlock(),
  () => void pumpGeometry(),
];

const pumpMats = [fleet, chassis, alloy];
const PUMP_WHEELS: [number, number][] = [
  [0.1, 0.66],
  [0.1, -0.66],
];

/** The pump where it stands, turned `ry`. */
export function Pump({ position, ry = 0 }: { position: [number, number, number]; ry?: number }) {
  return (
    <group position={position} rotation-y={ry}>
      <mesh geometry={pumpGeometry()} material={pumpMats} castShadow receiveShadow />
      <mesh geometry={standingWheels('pump', PUMP_WHEELS, 0.36, 0.22)} material={wheelMats} castShadow />
    </group>
  );
}
