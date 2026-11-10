/**
 * The POD page's layers film: the pod taken apart, then built again in the
 * order it is made (film/podLayersTimeline.ts has the choreography and why).
 * On the dark studio stage, as MOD's components film is.
 *
 * Its skin is the pod itself (kit/pod.tsx), drawn as two parts: the walls'
 * cladding with the glazing, the door and the steps, and the top's
 * cladding, each hung a unit at a time in its chapter (`unitOffset`). Under
 * it, the layers of kit/podLayers.ts: the galvanised frame (and its welds'
 * sparks), the plumbing and the floor, the interior panels with their
 * wiring, the insulation (its rockwool unrolled from rolls). The rooms are
 * the glass's own, lit at the end. The pod is the length the visitor has
 * chosen on the page (podChoice).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoxGeometry, Color, CylinderGeometry, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Plane, Quaternion, Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { podChoice } from '../../film/podChoice';
import { BURST, FRAME, INSULATION, INTERIOR, LEVEL, SERVICES, SKIN, WELD, hung, weldAt } from '../../film/podLayersTimeline';
import type { SceneProps } from '../../film/progress';
import { ease, hold, sampleCamera, win, type CameraKey } from '../../film/timeline';
import Stage, { aim, useLabel, useWarmAll, type Rig } from '../Stage';
import { LOOKS } from '../kit/looks';
import { Pod } from '../kit/pod';
import { POD, bayAt, podReach } from '../kit/podPlan';
import { CEIL, PIPES, RING, ROOF_WOOL, podFrame, podInsulation, podPanels, podServices, podWelds, preparePodLayers, wiringPlan } from '../kit/podLayers';

const HW = POD.W / 2;
/** How far above the picture a lifted layer is out of it. */
const AWAY = 40;

/**
 * The camera, keyed on the film's scroll: the whole pod, the burst's tower
 * of layers, the chapters. In the chapters it stands back far enough that
 * the pod keeps clear of the caption's column (developer, 2026-11-09: "the
 * text is overlapping"). For the plumbing it looks down between the joists;
 * for the panels it comes level with their wiring.
 */
const CAM: CameraKey[] = [
  { p: 0, look: [0, 1.6, 0], pos: [8.6, 4.4, 14.6] },
  { p: 0.06, look: [0, 4.2, 0], pos: [12.5, 8.2, 21.5] },
  // The tower of layers, its top clear of the header with room for its call-out.
  { p: BURST.pose, look: [0, 7.9, 0], pos: [21.1, 12.6, 35.4] },
  { p: BURST.hold, look: [0, 7.9, 0], pos: [21.2, 12.6, 35.6] },
  { p: 0.27, look: [0, 1.5, 0], pos: [11.6, 7.2, 16.8] },
  { p: 0.365, look: [0, 1.6, 0], pos: [12.4, 7.4, 16.6] },
  { p: 0.415, look: [0, 0.7, 0], pos: [11.2, 9.6, 15.0] },
  { p: 0.45, look: [0, 0.8, 0], pos: [11.4, 9.2, 15.4] },
  { p: 0.53, look: [0, 1.5, 0], pos: [12.6, 6.2, 18.2] },
  { p: 0.67, look: [0, 1.7, 0], pos: [12.8, 7.4, 17.6] },
  { p: 0.82, look: [0, 1.7, 0], pos: [13.2, 6.6, 18.4] },
  { p: 0.95, look: [0, 1.5, 0], pos: [10.6, 4.8, 16.8] },
  { p: 1, look: [0, 1.5, 0], pos: [10.6, 4.8, 16.8] },
];

const FOG: [number, number] = [34, 90];

/**
 * The layers' own finishes: galvanised steel, the barrier; the services and
 * the panels in their vertex colours; the rockwool twice, the walls' and the
 * roof's, each cut off past where its roll has reached (a clipping plane in
 * the world's x); the panels put up in their chapter, the walls cut off over
 * a height that rises from the floor, the ceiling past a line that runs
 * along it. The sparks: unlit, bright enough for the bloom to take them.
 */
function useMaterials() {
  const m = useMemo(() => {
    const wallsCut = new Plane(new Vector3(-1, 0, 0), 1e6);
    const roofCut = new Plane(new Vector3(-1, 0, 0), 1e6);
    const panelsUp = new Plane(new Vector3(0, -1, 0), 1e6);
    const ceilingAlong = new Plane(new Vector3(-1, 0, 0), 1e6);
    return {
      frame: new MeshStandardMaterial({ color: '#b7bcc0', metalness: 0.7, roughness: 0.36 }),
      colours: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.04 }),
      panels: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.04, clippingPlanes: [panelsUp], clipShadows: true }),
      ceiling: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.04, clippingPlanes: [ceilingAlong], clipShadows: true }),
      rockwool: new MeshStandardMaterial({ color: '#c9b27a', roughness: 0.95 }),
      rockwoolWalls: new MeshStandardMaterial({ color: '#c9b27a', roughness: 0.95, clippingPlanes: [wallsCut] }),
      rockwoolRoof: new MeshStandardMaterial({ color: '#c9b27a', roughness: 0.95, clippingPlanes: [roofCut] }),
      barrier: new MeshStandardMaterial({ color: '#8d6c60', roughness: 0.75 }),
      spark: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false }),
      wallsCut,
      roofCut,
      panelsUp,
      ceilingAlong,
    };
  }, []);
  useEffect(
    () => () => {
      for (const x of [m.frame, m.colours, m.panels, m.ceiling, m.rockwool, m.rockwoolWalls, m.rockwoolRoof, m.barrier, m.spark]) x.dispose();
    },
    [m],
  );
  return m;
}

/** The page's choice of length, followed: the layers are built again for each. */
function useLength() {
  const [L, setL] = useState(podChoice.length as number);
  useEffect(() => {
    const go = () => setL(podChoice.length);
    podChoice.listeners.add(go);
    return () => {
      podChoice.listeners.delete(go);
    };
  }, []);
  return L;
}

const ROLL = new CylinderGeometry(1, 1, 1, 24);

/*
 * The sparks: at a weld alight, a flash and a few sparks thrown out and
 * falling, each a thin streak along its flight, white-hot to orange as it
 * cools. One instanced mesh for all of them; a pure function of the scroll.
 */
const SPARK_GEO = new BoxGeometry(1, 1, 1);
const PER_WELD = 8;
const MAX_WELDS = 10;
const SPARKS = PER_WELD * MAX_WELDS;
/** The seconds a weld's sparks fly, and their speeds and the fall. */
const FLIGHT = 0.42;
const GRAVITY = 9.8;
const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _v = new Vector3();
const _up = new Vector3(0, 1, 0);
const _c = new Color();
/** A fixed number from a weld and a spark, 0 to 1: the same spark flies the same way every time it is drawn. */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Layers({ progress, place, rig }: SceneProps & { rig: Rig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const L = useLength();
  const m = useMaterials();
  const label = useLabel(place);
  const frame = podFrame(L);
  const services = podServices(L);
  const insulation = podInsulation(L);
  const panels = podPanels(L);
  const welds = useMemo(() => podWelds(L), [L]);
  const plan = useMemo(() => wiringPlan(L), [L]);
  // The rockwool's rolls and the panels' rising cut them off where they have reached: clipping planes, which the renderer draws only when asked.
  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  const all = useRef<Group>(null);
  const g = {
    walls: useRef<Group>(null),
    top: useRef<Group>(null),
    chassis: useRef<Group>(null),
    posts: useRef<Group>(null),
    rails: useRef<Group>(null),
    roof: useRef<Group>(null),
    plumbing: useRef<Group>(null),
    inner: useRef<Group>(null),
    deck: useRef<Group>(null),
    panels: useRef<Group>(null),
    rockwool: useRef<Group>(null),
    barrier: useRef<Group>(null),
    rockwoolRoof: useRef<Group>(null),
    barrierRoof: useRef<Group>(null),
  };
  const rolls = { a: useRef<Mesh>(null), b: useRef<Mesh>(null), roof: useRef<Mesh>(null) };
  const panelMeshes = { walls: useRef<Mesh>(null), wallWiring: useRef<Mesh>(null), ceiling: useRef<Mesh>(null), ceilingWiring: useRef<Mesh>(null) };
  const sparks = useRef<InstancedMesh>(null);
  const roofMesh = useRef<Mesh>(null);
  const wool = { walls: useRef<Mesh>(null), roof: useRef<Mesh>(null) };
  // The sparks' colours exist from the start, so the program warmed is the one drawn.
  useLayoutEffect(() => {
    const s = sparks.current;
    if (!s) return;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < SPARKS; i++) {
      s.setMatrixAt(i, _m);
      s.setColorAt(i, _c.setRGB(1, 1, 1));
    }
  }, []);
  useWarmAll(rig, all);
  const last = useRef({ up: -1, along: -1 });

  // The skin's lights: on while the pod stands whole, out as it comes apart, on again once it stands finished.
  const getLit = useMemo(() => () => {
    const p = progress.value;
    return p < 0.5 ? 1 - win(p, 0.012, 0.03) : win(p, INTERIOR.lit[0], INTERIOR.lit[1], ease.inOut);
  }, [progress]);
  // The cladding's units, hung one after another in their chapter (in place at every other time).
  const wallUnits = useMemo(() => (i: number, n: number) => {
    const p = progress.value;
    return p >= BURST.clear[1] && p < SKIN.walls[1] + 0.02 ? hung(p, SKIN.walls, i, n) : 0;
  }, [progress]);
  const topUnits = useMemo(() => (i: number, n: number) => {
    const p = progress.value;
    return p >= BURST.clear[1] && p < SKIN.top[1] + 0.02 ? hung(p, SKIN.top, i, n, 1.2) : 0;
  }, [progress]);

  useFrame(() => {
    const p = progress.value;
    const k = podReach(L);
    const c = sampleCamera(CAM, p);
    // A wide, short window (the developer drags it short): the opening's tower stands back further, so that it and its
    // call-outs keep clear of the header. Up to 16:9 nothing changes.
    const tower = p < BURST.clear[1] ? win(p, 0.03, BURST.pose, ease.inOut) * (1 - win(p, BURST.clear[0], BURST.clear[1], ease.inOut)) : 0;
    const wide = 1 + (Math.min(1.6, Math.max(1, size.width / size.height / 1.9)) - 1) * tower;
    for (let i = 0; i < 3; i++) c.pos[i] = c.look[i] + (c.pos[i] - c.look[i]) * k * wide;
    aim(camera, c.pos, c.look, size.width / size.height, 1.45, 0.5);
    rig.lightTarget.set(0, 0, 0);

    const up = (w: readonly number[]) => win(p, w[0], w[1], ease.inOutCubic);
    const inn = (w: readonly number[]) => win(p, w[0], w[1], ease.out);
    const clear = p < BURST.clear[0] ? 0 : up(BURST.clear);
    const burst = p < BURST.clear[1];
    /** A layer's place: in the opening at its level, lifted away when it clears; then lowered in (from `from`) in its window, or not there yet. */
    const set = (ref: { current: Group | null }, level: number, w: readonly number[], from: number) => {
      const o = ref.current;
      if (!o) return;
      let y: number;
      let on = true;
      if (burst) y = level + clear * AWAY;
      else if (p < w[0]) {
        y = 0;
        on = false;
      } else y = (1 - inn(w)) * from;
      o.position.y = y;
      o.visible = on && y < AWAY - 1 && y > -4;
    };
    const bSkin = up(BURST.skin) * 3 * LEVEL;
    const bIns = up(BURST.insulation) * 2 * LEVEL;
    const bFrame = up(BURST.frame) * LEVEL;
    // The skin: its units hung in turn (the Pod places each, `unitOffset`); here only whether it is there yet.
    set(g.walls, bSkin, [SKIN.walls[0], SKIN.walls[0] + 1e-6], 0);
    set(g.top, bSkin, [SKIN.top[0], SKIN.top[0] + 1e-6], 0);
    set(g.chassis, bFrame, FRAME.chassis, 3);
    set(g.posts, bFrame, FRAME.posts, 3);
    set(g.rails, bFrame, FRAME.rails, 3);
    set(g.roof, bFrame, FRAME.roof, 3);
    // Once the ceiling is under them, the roof's bows and purlins keep out of the occlusion pass: 8 cm over a flat
    // ceiling, what the pass made of them lay on it as grit (developer, 2026-11-10: "what is this on the top").
    if (roofMesh.current) roofMesh.current.userData.unoccluded = !burst && p >= SERVICES.ceiling[0];
    // The plumbing comes up from under the ground, to where it is fixed under the floor.
    set(g.plumbing, bFrame, SERVICES.plumbing, -1.2);
    // The rockwool: in place in the opening; in its chapter unrolled, the walls' and then the roof's, from the head end.
    set(g.rockwool, bIns, [INSULATION.walls[0], INSULATION.walls[0] + 1e-6], 0);
    set(g.rockwoolRoof, bIns, [INSULATION.roof[0], INSULATION.roof[0] + 1e-6], 0);
    set(g.barrier, bIns, INSULATION.barrier, 3.5);
    set(g.barrierRoof, bIns, INSULATION.barrier, 3.5);
    const x0 = -L / 2;
    const unroll = (w: readonly number[]) => (burst || p >= w[1] ? 1 : win(p, w[0], w[1], ease.inOut));
    const uw = unroll(INSULATION.walls);
    const ur = unroll(INSULATION.roof);
    m.wallsCut.constant = uw >= 1 ? 1e6 : x0 + uw * L;
    m.roofCut.constant = ur >= 1 ? 1e6 : x0 + ur * L;
    // Cut only while its roll runs; then in the plain material, which keeps its fragments' early depth test.
    if (wool.walls.current) wool.walls.current.material = uw >= 1 ? m.rockwool : m.rockwoolWalls;
    if (wool.roof.current) wool.roof.current.material = ur >= 1 ? m.rockwool : m.rockwoolRoof;
    // The rolls: one along each wall, standing, and one over the ceiling, lying; thinner as they give out, gone at the end.
    const roll = (o: Mesh | null, u: number, on: boolean, put: (r: number) => void) => {
      if (!o) return;
      o.visible = on && u > 0 && u < 1;
      if (o.visible) put(0.07 + 0.22 * (1 - u));
    };
    const wallsOn = !burst && p >= INSULATION.walls[0];
    const tall = RING - POD.kick;
    roll(rolls.a.current, uw, wallsOn, (r) => {
      rolls.a.current!.position.set(x0 + uw * L + r, (POD.kick + RING) / 2, HW - 0.09);
      rolls.a.current!.scale.set(r, tall, r);
      rolls.a.current!.rotation.y = (-uw * L) / r;
    });
    roll(rolls.b.current, uw, wallsOn, (r) => {
      rolls.b.current!.position.set(x0 + uw * L + r, (POD.kick + RING) / 2, -(HW - 0.09));
      rolls.b.current!.scale.set(r, tall, r);
      rolls.b.current!.rotation.y = (uw * L) / r;
    });
    roll(rolls.roof.current, ur, !burst && p >= INSULATION.roof[0], (r) => {
      rolls.roof.current!.position.set(x0 + ur * L + r, ROOF_WOOL + r, 0);
      rolls.roof.current!.scale.set(r, POD.W - 0.3, r);
      rolls.roof.current!.rotation.set(Math.PI / 2, (-ur * L) / r, 0);
    });

    // The interior panels, the floor under them and the wiring on them: one layer in the opening, standing on the floor,
    // going back down into it as the rest is lifted away. In their chapter the boards are lowered on, then the walls rise
    // from the floor with their wiring and the ceiling is laid along, from the head end.
    const inner = g.inner.current;
    if (inner) {
      inner.position.y = burst ? -clear * 3.4 : 0;
      inner.visible = burst ? clear < 0.98 : p >= SERVICES.deck[0];
    }
    const deck = g.deck.current;
    if (deck) deck.position.y = burst ? 0 : (1 - inn(SERVICES.deck)) * 3;
    const pan = g.panels.current;
    if (pan) pan.visible = burst || p >= SERVICES.walls[0];
    const rise = burst || p >= SERVICES.walls[1] ? 1 : win(p, SERVICES.walls[0], SERVICES.walls[1], ease.inOut);
    const along = burst || p >= SERVICES.ceiling[1] ? 1 : p < SERVICES.ceiling[0] ? 0 : win(p, SERVICES.ceiling[0], SERVICES.ceiling[1], ease.inOut);
    m.panelsUp.constant = rise >= 1 ? 1e6 : POD.floor + rise * (CEIL + 0.06 - POD.floor);
    m.ceilingAlong.constant = along >= 1 ? 1e6 : along <= 0 ? -1e6 : x0 + along * L;
    // While they are put up: cut by their planes, out of the occlusion pass (which would draw them whole), their shadows
    // drawn again each step. Once up, in the plain material: a cut costs its fragments their early depth test.
    const busyUp = rise < 1;
    const busyAlong = along < 1;
    for (const [ref, busy, cutMat] of [
      [panelMeshes.walls, busyUp, m.panels],
      [panelMeshes.wallWiring, busyUp, m.panels],
      [panelMeshes.ceiling, busyAlong, m.ceiling],
      [panelMeshes.ceilingWiring, busyAlong, m.ceiling],
    ] as const) {
      const o = ref.current;
      if (!o) continue;
      o.userData.unoccluded = busy;
      o.material = busy ? cutMat : m.colours;
    }
    if (rise !== last.current.up || along !== last.current.along) rig.shadowDirty = true;
    last.current.up = rise;
    last.current.along = along;

    // The welds' sparks: each group's joints in turn, once the group stands.
    const s = sparks.current;
    if (s) {
      let n = 0;
      if (!burst && p > WELD.posts[0] && p < WELD.roof[1]) {
        const groups: [readonly number[], [number, number, number][], number][] = [
          [WELD.posts, welds.posts, 0],
          [WELD.rails, welds.rails, 1000],
          [WELD.roof, welds.roof, 2000],
        ];
        for (const [w, list, seed] of groups) {
          if (p < w[0] || p > w[1]) continue;
          for (let i = 0; i < list.length && n < SPARKS; i++) {
            const t = weldAt(p, w, i, list.length);
            if (t < 0) continue;
            const [jx, jy, jz] = list[i];
            const wx = jx + x0;
            // The flash: at once, then dying.
            const f = (t < 0.1 ? t / 0.1 : 1) * (1 - t) ** 1.6;
            _m.compose(_p.set(wx, jy, jz), _q.identity(), _s.setScalar(0.085 * f + 0.0001));
            s.setMatrixAt(n, _m);
            s.setColorAt(n, _c.setRGB(14, 11, 7).multiplyScalar(f));
            n++;
            // The sparks: thrown out from the joint, falling, cooling.
            const T = t * FLIGHT;
            const heat = (1 - t) ** 1.3;
            for (let k = 1; k < PER_WELD && n < SPARKS; k++) {
              const r0 = rand(seed + i * 13 + k);
              const r1 = rand(seed + i * 29 + k * 7 + 0.5);
              const r2 = rand(seed + i * 41 + k * 3 + 0.25);
              const a = r0 * Math.PI * 2;
              const speed = 1.3 + 1.4 * r1;
              const rise0 = 0.25 + 0.75 * r2;
              const vx = Math.cos(a) * speed * (1 - rise0 * 0.5);
              const vz = Math.sin(a) * speed * (1 - rise0 * 0.5);
              const vy = rise0 * speed;
              const px = wx + vx * T;
              const py = Math.max(jy - 0.6, jy + vy * T - 0.5 * GRAVITY * T * T);
              const pz = jz + vz * T;
              _v.set(vx, vy - GRAVITY * T, vz).normalize();
              _q.setFromUnitVectors(_up, _v);
              const len = (0.07 + 0.11 * r1) * (0.35 + 0.65 * heat);
              _m.compose(_p.set(px, py, pz), _q, _s.set(0.009, len, 0.009));
              s.setMatrixAt(n, _m);
              s.setColorAt(n, _c.setRGB(9, 5.2 - 1.6 * t, 1.6 - 1.2 * t).multiplyScalar(heat));
              n++;
            }
          }
        }
      }
      s.count = n;
      s.visible = n > 0;
      if (n > 0) {
        s.instanceMatrix.needsUpdate = true;
        if (s.instanceColor) s.instanceColor.needsUpdate = true;
      }
    }

    /*
     * The call-outs, each on a thing in the picture that the camera sees: in
     * the opening each layer as it is shown, in the chapters the parts.
     */
    const named = (at: number) => (burst ? hold(p, at, BURST.hold, 0.012) : 0);
    // The layers' heights: in the opening, where each stands in the tower; after it, on the ground.
    const lv = (b: number) => (burst ? b : 0);
    // A gap between the joists over the drain, near the far end, where it is seen from above.
    const gap = 0.6 + 0.5 * Math.round((L - 1.75) / 0.5);
    // The head room's panel over its window: the call-outs on the left stand on their layers there, each in the gap over it.
    label('pl-skin', x0 + 1.45, bSkin + 2.65, HW, named(BURST.words[3]));
    label('pl-insulation', x0 + 1.45, bIns + 2.65, HW - 0.024, named(BURST.words[2]));
    label('pl-frame', x0 + 1.45, bFrame + RING - 0.04, HW - 0.06, named(BURST.words[0]));
    label('pl-plumbing', x0 + gap, lv(bFrame) + PIPES.drain.y + PIPES.drain.r, PIPES.drain.z, named(BURST.words[1]) + hold(p, SERVICES.plumbing[1], SERVICES.deck[0] + 0.006, 0.01));
    // The panels and their wiring: in the opening one call-out, on the head room's switch drop near the layer's top
    // (six boxes do not fit round the tower in a short window); in their chapter, the panel over the head room's window
    // and the far room's switch drop, seen from the front.
    const yIn = burst ? -clear * 3.4 : 0;
    label('pl-panels', x0 + plan.drops.head, yIn + 2.7, HW - 0.138, named(BURST.words[4]));
    label('pl-interior', x0 + 1.0, 2.7, HW - 0.15, burst ? 0 : hold(p, SERVICES.walls[1] - 0.008, 0.548, 0.01));
    label('pl-wiring', x0 + plan.drops.far, 2.2, HW - 0.138, burst ? 0 : hold(p, SERVICES.walls[1] - 0.004, 0.548, 0.01));
    label('pl-rolls', x0 + uw * L, RING, HW - 0.09, wallsOn && uw < 1 ? 1 : 0);
    label('pl-walls', x0 + bayAt(0) + 0.5, 1.75, HW, hold(p, SKIN.walls[0] + 0.02, SKIN.top[0] + 0.01, 0.012));
    // On the top over the head room, not its middle: a point on the middle of a phone's picture has no side to stand on.
    label('pl-top', x0 + POD.end - 0.4, POD.top, 0, hold(p, SKIN.top[0] + 0.015, 0.84, 0.012));
  });

  const sh = { castShadow: true, receiveShadow: true } as const;
  /*
   * The rockwool is cut by its rolls: it casts no shadow. It is in the occlusion pass, drawn whole there: kept out,
   * the occlusion of what is under it (the ceiling's wiring, the bows' corners) lay on it as stains (developer,
   * 2026-11-10, a screenshot of the roof's rockwool); in, the part not yet unrolled darkens only what is behind a flat
   * sheet of it, which is next to nothing. The rolls cast no shadow either: a caster that moves has the shadow map
   * drawn again every frame, the cost that made this step the film's dearest (notes Y11).
   */
  const cut = { receiveShadow: true } as const;
  return (
    <group ref={all}>
      <group ref={g.walls}>
        <Pod length={L} part="walls" look={LOOKS.studioDark} getLit={getLit} unitOffset={wallUnits} />
      </group>
      <group ref={g.top}>
        <Pod length={L} part="top" look={LOOKS.studioDark} unitOffset={topUnits} />
      </group>
      <mesh ref={rolls.a} geometry={ROLL} material={m.rockwool} visible={false} receiveShadow />
      <mesh ref={rolls.b} geometry={ROLL} material={m.rockwool} visible={false} receiveShadow />
      <mesh ref={rolls.roof} geometry={ROLL} material={m.rockwool} visible={false} receiveShadow />
      {/* Never shown: here so that the warm-up compiles the rockwool's cut materials before the rolls run. */}
      <mesh geometry={ROLL} material={m.rockwoolWalls} visible={false} receiveShadow />
      <mesh geometry={ROLL} material={m.rockwoolRoof} visible={false} receiveShadow />
      <instancedMesh ref={sparks} args={[SPARK_GEO, m.spark, SPARKS]} frustumCulled={false} userData-unoccluded />
      <group position-x={-L / 2}>
        <group ref={g.chassis}>
          <mesh geometry={frame.chassis} material={m.frame} {...sh} />
        </group>
        <group ref={g.posts}>
          <mesh geometry={frame.posts} material={m.frame} {...sh} />
        </group>
        <group ref={g.rails}>
          <mesh geometry={frame.rails} material={m.frame} {...sh} />
        </group>
        <group ref={g.roof}>
          <mesh ref={roofMesh} geometry={frame.roof} material={m.frame} {...sh} />
        </group>
        <group ref={g.plumbing}>
          <mesh geometry={services.plumbing} material={m.colours} {...sh} />
        </group>
        <group ref={g.inner}>
          <group ref={g.deck}>
            <mesh geometry={services.deck} material={m.colours} {...sh} />
          </group>
          <group ref={g.panels}>
            <mesh ref={panelMeshes.walls} geometry={panels.walls} material={m.colours} {...sh} />
            <mesh ref={panelMeshes.wallWiring} geometry={panels.wallWiring} material={m.colours} {...sh} />
            <mesh ref={panelMeshes.ceiling} geometry={panels.ceiling} material={m.colours} {...sh} />
            <mesh ref={panelMeshes.ceilingWiring} geometry={panels.ceilingWiring} material={m.colours} {...sh} />
          </group>
          {/* Never shown: here so that the warm-up compiles the cut materials (and their shadows') before the panels go up. */}
          <mesh geometry={panels.ceilingWiring} material={m.panels} visible={false} {...sh} />
          <mesh geometry={panels.ceilingWiring} material={m.ceiling} visible={false} {...sh} />
        </group>
        <group ref={g.rockwool}>
          <mesh ref={wool.walls} geometry={insulation.rockwool} material={m.rockwool} {...cut} />
        </group>
        <group ref={g.barrier}>
          <mesh geometry={insulation.barrier} material={m.barrier} {...sh} />
        </group>
        <group ref={g.rockwoolRoof}>
          <mesh ref={wool.roof} geometry={insulation.rockwoolRoof} material={m.rockwool} {...cut} />
        </group>
        <group ref={g.barrierRoof}>
          <mesh geometry={insulation.barrierRoof} material={m.barrier} {...sh} />
        </group>
      </group>
    </group>
  );
}

/** Built in idle time before the film is reached (film/prefetch.ts): the first length. */
export const prepare = [() => preparePodLayers(podChoice.length)];

export default function PodLayersScene(props: SceneProps) {
  return (
    <Stage {...props} look="studioDark" ground="floor" focus={[0.65, 0.55]} focusCompact={[0.5, 0.38]} zoomCompact={0.9} shadowExtent={16} fogRange={FOG}>
      {(rig) => <Layers {...props} rig={rig} />}
    </Stage>
  );
}
