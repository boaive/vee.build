import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SceneProps } from '../film/progress';
import { ATMOS, patchAtmosphere, setClearing } from './kit/atmosphere';
import { SkyDome } from './kit/env';
import { memo } from './kit/geometry';
import { LOOKS, type Look, type LookName } from './kit/looks';
import Post, { NEUTRAL_GRADE, type Backdrop, type Grade, type PostOptions } from './kit/post';
import { createPhysicalSky, horizonHaze, paintPhysicalSky } from './kit/sky';
import { groundGrain } from './kit/textures';

patchAtmosphere();

export interface StageOptions {
  /** Lighting and atmosphere preset. Scenes can change it later with rig.setLook. */
  look?: LookName;
  /** Where the camera's look target lands on screen, 0–1 from top-left. */
  focus?: [number, number];
  focusCompact?: [number, number];
  /** Half-size of the area the key light shadows, in metres. */
  shadowExtent?: number;
  /**
   * shadow: shadow-only plane on a transparent canvas.
   * floor: a studio floor in the background colour that fades into it.
   * land: plain open ground under the sky.
   * none: the scene brings its own ground.
   */
  ground?: 'shadow' | 'floor' | 'land' | 'none';
  shadowOpacity?: number;
  /** Overrides the look's fog distances. */
  fogRange?: [number, number];
  sunIntensity?: number;
  envIntensity?: number;
  exposure?: number;
  localClipping?: boolean;
  /** Photographic finish (AO, bloom, grade). `false` renders straight to the screen. */
  post?: PostOptions | false;
  /** Lighter finish on small screens: no AO. */
  postCompact?: PostOptions | false;
}

/** Shared with the scene: where to shadow, and the current mood. */
export interface Rig {
  lightTarget: THREE.Vector3;
  look: Look;
  /** Retune sky, haze and lights in place (no rebuild). */
  setLook: (look: Look, fogRange?: [number, number]) => void;
  /**
   * Part way from one look to another, 0–1: lights, exposure and grade in
   * between, the environment of the first up to half-way and of the second
   * after it (each faded out and in round the change, so it does not jump),
   * and the second's sky, haze and fog throughout. For a studio that becomes
   * a place (the hero's opening card): `a` may be a studio look, `b` has
   * the sky. Cheap enough to call every frame; nothing is rebuilt.
   */
  mixLook: (a: Look, b: Look, t: number) => void;
  /** The grade in use when it is not the look's own (mixLook). */
  grade: Grade | null;
  /** Build a look's environment map ahead of time, so switching to it later is instant. */
  prepare: (look: Look) => void;
  /** Write this stage's values into the uniforms every stage shares, before it draws. */
  sync: () => void;
  /**
   * Called by the finish just before it draws the scene, moving or still:
   * brings matrices and the shadow map up to date and draws the sky.
   * Returns the sky to put behind the scene, if there is one.
   */
  begin: () => Backdrop | null;
  /** Compile what `begin` draws, ahead of the first frame. */
  compile: () => Promise<unknown>;
  /** Set by the finish: draws its own view of the scene (for ambient occlusion) into a target, so a warm covers that too. */
  alsoWarm: ((target: THREE.WebGLRenderTarget) => void) | null;
  /** The key light moved: redraw the shadow map on the next frame whatever the casters did. */
  shadowDirty: boolean;
  /**
   * Send what is about to come into shot to the GPU ahead of time. `arrange`
   * shows it (and may move the camera) and returns the undo; the scene is
   * drawn once into a tiny off-screen target, so buffers, textures and
   * shaders are in place before the visitor gets there. Call it when the
   * page is quiet: it is one long task.
   */
  warm: (arrange: () => () => void) => void;
  /** True while the finish is still compiling shaders: nothing has been drawn yet. */
  holding: boolean;
  /**
   * A clearing in the land (atmosphere.ts): centre x, centre z, radius and
   * the width of its soft edge, in metres. Width 0: none, all the land is
   * drawn. Set by the scene, written before each draw.
   */
  clear: [number, number, number, number];
  /** How much of the sky is behind the scene, 0–1. Below 1 the page shows through it; at 0 it is not drawn at all. */
  sky: number;
  /**
   * Run just before each draw, once the world matrices are current: for
   * what copies the scene as it stands (the opening card's reflections,
   * kit/mirror.tsx). Add and remove; nothing in them may allocate.
   */
  beforeDraw: Set<() => void>;
}

interface StageProps extends SceneProps, StageOptions {
  children: (rig: Rig) => ReactNode;
}

const _sun = new THREE.Vector3();
const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _da = new THREE.Vector3();
const _db = new THREE.Vector3();

const _ndc = new THREE.Vector3();
/**
 * The sky is drawn at this fraction of the canvas (each way). There is
 * nothing in it finer than that: a gradient, soft cloud, and a sun whose
 * edge the bloom rounds off. Measured against a full-size sky, the finished
 * picture differs by a twentieth of a grey level around the sun and by
 * nothing measurable elsewhere; its grain alone is twenty times that.
 */
const SKY_SCALE = 0.5;

/**
 * Sine of the elevation under which the sky is one flat colour. The sky's
 * shader blends to its ground colour between the horizon and -0.12 (sky.ts)
 * and is exactly that colour below; this sits a little under that.
 */
const SKY_FLAT = -0.125;

/**
 * The lowest part of the frame in which the sky still varies, 0 (bottom) to
 * 1 (top). Every row under it is the sky's flat ground colour from edge to
 * edge, so those rows are not drawn: the lowest drawn row stands in for
 * them, and the picture is the same. Checked at both edges and the middle:
 * along a row the line of sight is lowest in the middle and highest at an
 * edge.
 */
function skyFloor(camera: THREE.Camera) {
  let floor = 1;
  for (const x of [-1, 0, 1]) {
    const up = (y: number) => _ndc.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize().y;
    if (up(-1) >= SKY_FLAT) return 0;
    if (up(1) < SKY_FLAT) continue;
    let lo = -1;
    let hi = 1;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (up(mid) < SKY_FLAT) lo = mid;
      else hi = mid;
    }
    floor = Math.min(floor, lo * 0.5 + 0.5);
  }
  return floor;
}

/**
 * A number that changes when anything casting a shadow moves, appears or
 * goes: every visible caster's world matrix and, for instanced ones, every
 * instance's matrix. Two frames with the same number have the same shadow
 * map, so the map (4096 px square: about a millisecond to clear and redraw,
 * and a third of the frame's draw calls) is kept instead of redrawn. A few
 * thousand additions a frame.
 */
function castersSignature(scene: THREE.Scene) {
  let a = 0;
  let b = 0;
  let n = 0;
  const add = (v: number) => {
    n++;
    a += v * ((n % 61) + 1);
    b += v * v + n;
  };
  scene.traverseVisible((o) => {
    const m = o as THREE.InstancedMesh;
    if (!m.castShadow || !m.isMesh) return;
    add(m.id);
    add(m.geometry.id);
    const e = m.matrixWorld.elements;
    for (let i = 0; i < 16; i++) add(e[i]);
    if (m.isInstancedMesh) {
      const arr = m.instanceMatrix.array;
      const end = m.count * 16;
      add(end);
      for (let i = 0; i < end; i++) add(arr[i]);
    }
  });
  return a * 1.000001 + b;
}

type V4 = [number, number, number, number];
interface Haze {
  sun: V4;
  toward: V4;
  away: V4;
  /** Fog colour matched to the sky, or null for a flat studio fog. */
  color: THREE.Color | null;
}

/** Directional haze from the sky model (outdoors) or the flat studio colour. */
function hazeOf(l: Look): Haze {
  if (l.sky) {
    const h = horizonHaze(l.sun.dir, l.sky);
    _sun.set(l.sun.dir[0], 0, l.sun.dir[2]).normalize();
    return {
      sun: [_sun.x, 0, _sun.z, h.power],
      toward: [h.toward.r, h.toward.g, h.toward.b, l.fog?.thin ?? 0.8],
      away: [h.away.r, h.away.g, h.away.b, 1],
      color: h.away.clone(),
    };
  }
  return { sun: [0, 0, 1, 8], toward: [1, 1, 1, 0], away: [1, 1, 1, 0], color: null };
}

/**
 * The haze uniforms are one set of objects shared by every material on the
 * page (see atmosphere.ts), and several stages can be mounted at once. Each
 * stage writes its own values just before it draws.
 */
function writeHaze(h: Haze, clear: Rig['clear']) {
  const put = (t: { x: number; y: number; z: number; w: number }, v: V4) => {
    t.x = v[0];
    t.y = v[1];
    t.z = v[2];
    t.w = v[3];
  };
  put(ATMOS.sun, h.sun);
  put(ATMOS.toward, h.toward);
  put(ATMOS.away, h.away);
  put(ATMOS.clear, clear);
  setClearing(clear[3] > 0);
}

function Setup({
  progress,
  compact,
  active,
  onReady,
  focus = [0.5, 0.5],
  focusCompact = [0.5, 0.5],
  shadowExtent = 30,
  ground = 'shadow',
  shadowOpacity,
  fogRange,
  sunIntensity,
  envIntensity,
  exposure,
  localClipping = false,
  rig,
  finished,
}: StageProps & { rig: Rig; finished: boolean }) {
  const { gl, scene, camera, size, invalidate, advance, get } = useThree();
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const dome = useRef<THREE.Mesh>(null);
  const frames = useRef(0);
  const sunDir = useRef(new THREE.Vector3());
  const initial = useRef(rig.look).current;
  const sky = useMemo(() => createPhysicalSky((initial.sky ?? LOOKS.day.sky)!, initial.sun.dir), [initial]);
  /*
   * With a finish the sky is not drawn into the scene at all. It is drawn on
   * its own, into a small plain target (SKY_SCALE), and the finish puts it
   * behind the scene in its final pass. Inside the scene it was shaded at
   * full size into a multisampled target, for about a fifth of the frame's
   * time; here the same shader runs on a quarter of the pixels. It is the
   * same sky whether the picture is moving or still.
   */
  const backdrop = useMemo(() => {
    if (!finished) return null;
    const mesh = new THREE.Mesh(memo('sky-sphere', () => new THREE.SphereGeometry(1, 48, 24)), sky);
    mesh.scale.setScalar(500);
    mesh.frustumCulled = false;
    const only = new THREE.Scene();
    only.add(mesh);
    const target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
    target.scissorTest = true;
    return { mesh, only, target, px: new THREE.Vector2(), on: !!initial.sky };
  }, [sky, initial, finished]);
  const landMat = useMemo(() => {
    // Its texture is drawn on the main thread: only for the stages that show open ground.
    const map = ground === 'land' ? groundGrain() : null;
    const c = map?.clone() ?? null;
    if (c) {
      c.repeat.set(54, 54);
      c.needsUpdate = true;
    }
    return new THREE.MeshStandardMaterial({ color: '#7e7e52', roughness: 1, map: c });
  }, [ground]);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a0b0d', roughness: 0.42, metalness: 0 }), []);
  const shadowMat = useMemo(() => new THREE.ShadowMaterial({ transparent: true }), []);

  /*
   * Environment maps. Under a sky, light and reflections come from that sky
   * (sun disc hidden, the directional light carries the sun); studios use a
   * neutral room. One map per look, made once and kept, so a scene that
   * moves between looks (the hero) pays for each only the first time.
   */
  const envs = useRef<{ pmrem: THREE.PMREMGenerator | null; maps: Map<Look | 'room', THREE.WebGLRenderTarget>; warm: THREE.WebGLRenderTarget | null }>({
    pmrem: null,
    maps: new Map(),
    warm: null,
  });
  const haze = useRef<Haze>(hazeOf(initial));
  /** What mixLook last set: the two looks and how far between them. */
  const mixed = useRef<{ a: Look | null; b: Look | null; t: number }>({ a: null, b: null, t: -1 }).current;
  const envFor = (l: Look): THREE.Texture => {
    const store = envs.current;
    const key = l.sky ? l : 'room';
    const hit = store.maps.get(key);
    if (hit) return hit.texture;
    const pmrem = (store.pmrem ??= new THREE.PMREMGenerator(gl));
    let made: THREE.WebGLRenderTarget;
    if (l.sky) {
      const scene2 = new THREE.Scene();
      const skyMat = createPhysicalSky({ ...l.sky, disc: 0 }, l.sun.dir);
      const domeGeo = new THREE.SphereGeometry(10, 48, 24);
      scene2.add(new THREE.Mesh(domeGeo, skyMat));
      made = pmrem.fromScene(scene2, 0.025);
      domeGeo.dispose();
      skyMat.dispose();
    } else {
      const room = new RoomEnvironment();
      made = pmrem.fromScene(room, 0.04);
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    }
    store.maps.set(key, made);
    return made.texture;
  };

  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.localClippingEnabled = localClipping;
    // With a finish, rig.begin runs before every draw of the scene: it updates the world
    // matrices and decides whether the shadow map has to be redrawn.
    gl.shadowMap.autoUpdate = !finished;
    scene.matrixWorldAutoUpdate = !finished;
    // Reading back each shader's link log makes the page wait for the compiler. Development only.
    gl.debug.checkShaderErrors = import.meta.env.DEV;
    const held = envs.current;
    return () => {
      scene.environment = null;
      held.maps.forEach((t) => t.dispose());
      held.maps.clear();
      held.pmrem?.dispose();
      held.pmrem = null;
      held.warm?.dispose();
      held.warm = null;
    };
  }, [gl, scene, localClipping, finished]);

  /* Mood: everything a look controls, applied in place. */
  useLayoutEffect(() => {
    rig.sync = () => writeHaze(haze.current, rig.clear);
    rig.begin = () => {
      writeHaze(haze.current, rig.clear);
      // World matrices are brought up to date here, once, and not again inside the render (see below).
      scene.updateMatrixWorld();
      for (const fn of rig.beforeDraw) fn();
      /*
       * The shadow map is redrawn when the light has moved, when a caster has,
       * or when something else was drawn into it (rig.warm shows a set that is
       * not in shot). For a still picture too: one drawn straight after a warm
       * would otherwise be lit through the other set's shadows.
       */
      const sig = castersSignature(scene);
      gl.shadowMap.needsUpdate = rig.shadowDirty || sig !== casters.current;
      casters.current = sig;
      rig.shadowDirty = false;
      if (!backdrop?.on || rig.sky <= 0.002) return null;
      const { mesh, only, target, px } = backdrop;
      gl.getDrawingBufferSize(px);
      const w = Math.max(2, Math.ceil(px.x * SKY_SCALE));
      const h = Math.max(2, Math.ceil(px.y * SKY_SCALE));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      // Only the rows where the sky is more than its flat ground colour.
      const row = Math.min(h - 2, Math.max(0, Math.floor(skyFloor(camera) * h) - 1));
      target.scissor.set(0, row, w, h - row);
      mesh.position.copy(camera.position);
      const was = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.render(only, camera);
      gl.setRenderTarget(was);
      return { texture: target.texture, floor: (row + 0.5) / h, amount: rig.sky };
    };
    rig.compile = () => {
      if (!backdrop) return Promise.resolve();
      // Into its own target, so the shader is built for what it will be drawn into.
      const was = gl.getRenderTarget();
      gl.setRenderTarget(backdrop.target);
      const job = gl.compileAsync(backdrop.only, camera);
      gl.setRenderTarget(was);
      return job;
    };
    rig.prepare = (l: Look) => void envFor(l);
    rig.warm = (arrange) => {
      const store = envs.current;
      // Same kind of target as the finish draws into, so the same shader variants are used.
      const target = (store.warm ??= new THREE.WebGLRenderTarget(64, 36, { type: THREE.HalfFloatType }));
      const pos = camera.position.clone();
      const rot = camera.quaternion.clone();
      const undo = arrange();
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
      rig.sync();
      const before = gl.getRenderTarget();
      // With its shadows, so the depth shaders and the casters' buffers are warmed too.
      gl.shadowMap.needsUpdate = true;
      gl.setRenderTarget(target);
      gl.render(scene, camera);
      rig.alsoWarm?.(target);
      gl.setRenderTarget(before);
      rig.shadowDirty = true;
      undo();
      scene.updateMatrixWorld();
      camera.position.copy(pos);
      camera.quaternion.copy(rot);
      camera.updateMatrixWorld();
    };
    rig.setLook = (l: Look, range?: [number, number]) => {
      rig.look = l;
      scene.environment = envFor(l);
      const h = hazeOf(l);
      haze.current = h;
      writeHaze(h, rig.clear);
      gl.toneMappingExposure = exposure ?? l.exposure;
      scene.environmentIntensity = envIntensity ?? l.env;
      if (l.fog) {
        const [near, far] = range ?? fogRange ?? [l.fog.near, l.fog.far];
        if (scene.fog instanceof THREE.Fog) {
          scene.fog.near = near;
          scene.fog.far = far;
        } else scene.fog = new THREE.Fog(l.fog.color, near, far);
        if (h.color) scene.fog.color.copy(h.color);
        else scene.fog.color.set(l.fog.color);
      } else scene.fog = null;
      if (hemi.current) {
        hemi.current.color.set(l.hemi.sky);
        hemi.current.groundColor.set(l.hemi.ground);
        hemi.current.intensity = l.hemi.intensity;
      }
      if (light.current) {
        light.current.color.set(l.sun.color);
        light.current.intensity = sunIntensity ?? l.sun.intensity;
      }
      sunDir.current.set(...l.sun.dir).normalize().multiplyScalar(80);
      rig.shadowDirty = true;
      if (fill.current) {
        fill.current.color.set(l.fill.color);
        fill.current.intensity = l.fill.intensity;
        fill.current.position.set(...l.fill.dir).normalize().multiplyScalar(40);
      }
      // With a finish the sky goes behind the scene in the final pass (rig.begin); otherwise the dome draws it.
      if (backdrop) backdrop.on = !!l.sky;
      if (dome.current) dome.current.visible = !!l.sky;
      if (l.sky) paintPhysicalSky(sky, l.sky, l.sun.dir);
      landMat.color.set(l.land ?? '#7e7e52');
      floorMat.color.set(l.fog?.color ?? '#0a0b0d');
      shadowMat.color.set(l.shadow.color);
      shadowMat.opacity = shadowOpacity ?? l.shadow.opacity;
      rig.grade = null;
      mixed.b = null;
      invalidate();
    };
    rig.mixLook = (a: Look, b: Look, t: number) => {
      if (t >= 1) {
        if (rig.look !== b || mixed.b !== null) rig.setLook(b);
        return;
      }
      if (mixed.a === a && mixed.b === b && mixed.t === t && rig.look === b) return;
      if (rig.look !== b || mixed.b !== b) {
        // The second look's sky, haze and fog, set once.
        rig.setLook(b);
        mixed.b = b;
      }
      mixed.a = a;
      mixed.t = t;
      const k = (p: number, q: number) => p + (q - p) * t;
      const sm = (e0: number, e1: number) => {
        const x = Math.min(1, Math.max(0, (t - e0) / (e1 - e0)));
        return x * x * (3 - 2 * x);
      };
      // The environment: the first look's, out by half-way; the second's, in from there.
      const second = t >= 0.5;
      scene.environment = envFor(second ? b : a);
      scene.environmentIntensity = second ? (envIntensity ?? b.env) * sm(0.5, 0.7) : (envIntensity ?? a.env) * (1 - sm(0.3, 0.5));
      gl.toneMappingExposure = exposure ?? k(a.exposure, b.exposure);
      if (hemi.current) {
        hemi.current.color.lerpColors(_ca.set(a.hemi.sky), _cb.set(b.hemi.sky), t);
        hemi.current.groundColor.lerpColors(_ca.set(a.hemi.ground), _cb.set(b.hemi.ground), t);
        hemi.current.intensity = k(a.hemi.intensity, b.hemi.intensity);
      }
      if (light.current) {
        light.current.color.lerpColors(_ca.set(a.sun.color), _cb.set(b.sun.color), t);
        light.current.intensity = sunIntensity ?? k(a.sun.intensity, b.sun.intensity);
      }
      // The light swings round in the middle of the change only: each step of it redraws the shadow map.
      const d = sm(0.25, 0.75);
      _da.set(...a.sun.dir).normalize();
      _db.set(...b.sun.dir).normalize();
      sunDir.current.copy(_da).lerp(_db, d).normalize().multiplyScalar(80);
      if (fill.current) {
        fill.current.color.lerpColors(_ca.set(a.fill.color), _cb.set(b.fill.color), t);
        fill.current.intensity = k(a.fill.intensity, b.fill.intensity);
        _da.set(...a.fill.dir).normalize();
        _db.set(...b.fill.dir).normalize();
        fill.current.position.copy(_da).lerp(_db, t).normalize().multiplyScalar(40);
      }
      shadowMat.color.lerpColors(_ca.set(a.shadow.color), _cb.set(b.shadow.color), t);
      shadowMat.opacity = shadowOpacity ?? k(a.shadow.opacity, b.shadow.opacity);
      // A new object each time it changes: the finish applies a grade only when it is another object.
      const ga = a.grade ?? NEUTRAL_GRADE;
      const gb = b.grade ?? NEUTRAL_GRADE;
      rig.grade = {
        vignette: k(ga.vignette, gb.vignette),
        saturation: k(ga.saturation, gb.saturation),
        contrast: k(ga.contrast, gb.contrast),
        shadows: [k(ga.shadows[0], gb.shadows[0]), k(ga.shadows[1], gb.shadows[1]), k(ga.shadows[2], gb.shadows[2])],
        highlights: [k(ga.highlights[0], gb.highlights[0]), k(ga.highlights[1], gb.highlights[1]), k(ga.highlights[2], gb.highlights[2])],
        grain: k(ga.grain, gb.grain),
        aberration: k(ga.aberration, gb.aberration),
      };
    };
    rig.setLook(rig.look);
  }, [rig, gl, scene, camera, sky, backdrop, floorMat, shadowMat, landMat, exposure, envIntensity, sunIntensity, shadowOpacity, fogRange, invalidate]);

  /* Dev only: a handle on this stage for QA and frame timing (window.__vee, canvas.__vee). */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const probe = { rig, LOOKS, invalidate, advance, get, gl, scene, camera, progress, backdrop, sky };
    (window as unknown as { __vee?: unknown }).__vee = probe;
    (gl.domElement as unknown as { __vee?: unknown }).__vee = probe;
  }, [rig, invalidate, advance, get, gl, scene, camera, progress, backdrop, sky]);

  /* Scenes pull frames through this. */
  useEffect(() => {
    progress.invalidate = invalidate;
    invalidate();
    return () => {
      progress.invalidate = null;
    };
  }, [progress, invalidate]);

  /* Coming back on screen: draw the current state straight away. */
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  /* Off-centre framing: put the look target where the layout leaves room. */
  const [fx, fy] = compact ? focusCompact : focus;
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = size;
    cam.setViewOffset(w, h, (0.5 - fx) * w, (0.5 - fy) * h, w, h);
    invalidate();
    return () => cam.clearViewOffset();
  }, [camera, size, fx, fy, invalidate]);

  /*
   * Key light follows the action in steps of an eighth of the shadowed
   * area. A step is a whole number of shadow texels, so edges stay still,
   * and between steps the light does not move at all: a camera that drifts
   * a few centimetres no longer forces the shadow map to be redrawn.
   */
  const mapSize = compact ? 2048 : 4096;
  const lit = useRef({ x: NaN, z: NaN, sx: NaN, sy: NaN, sz: NaN });
  const casters = useRef(NaN);
  useFrame(() => {
    rig.sync();
    const l = light.current;
    if (l) {
      const step = shadowExtent / 8;
      const tx = Math.round(rig.lightTarget.x / step) * step;
      const tz = Math.round(rig.lightTarget.z / step) * step;
      const s = sunDir.current;
      const was = lit.current;
      if (tx !== was.x || tz !== was.z || s.x !== was.sx || s.y !== was.sy || s.z !== was.sz) {
        lit.current = { x: tx, z: tz, sx: s.x, sy: s.y, sz: s.z };
        l.target.position.set(tx, 0, tz);
        l.position.set(tx + s.x, s.y, tz + s.z);
        l.target.updateMatrixWorld();
        rig.shadowDirty = true;
      }
    }
    // The first frames can land before layout is known; draw a few, then report.
    if (!rig.holding && frames.current < 4) {
      frames.current++;
      invalidate();
      if (frames.current === 3) onReady();
    }
  });

  useLayoutEffect(() => () => backdrop?.target.dispose(), [backdrop]);

  useLayoutEffect(
    () => () => {
      sky.dispose();
      floorMat.dispose();
      shadowMat.dispose();
      landMat.dispose();
    },
    [sky, floorMat, shadowMat, landMat],
  );

  return (
    <>
      {!finished && <SkyDome material={sky} domeRef={dome} />}
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.035}
        shadow-radius={compact ? 2 : 2.6}
      >
        <orthographicCamera attach="shadow-camera" args={[-shadowExtent, shadowExtent, shadowExtent, -shadowExtent, 1, 220]} />
      </directionalLight>
      <directionalLight ref={fill} />
      {ground === 'shadow' && (
        <mesh rotation-x={-Math.PI / 2} receiveShadow material={shadowMat}>
          <planeGeometry args={[900, 900]} />
        </mesh>
      )}
      {/*
       * Open ground is drawn after everything else that is opaque. A scene lays its own surfacing over most of
       * it (a yard slab, a gravel pad); drawn first, the ground under that surfacing was shaded in full and
       * then covered: about 0.7 ms of a factory frame on the test laptop. Same picture either way.
       */}
      {ground === 'land' && (
        <mesh rotation-x={-Math.PI / 2} receiveShadow material={landMat} renderOrder={1}>
          <planeGeometry args={[1300, 1300]} />
        </mesh>
      )}
      {ground === 'floor' && (
        <mesh rotation-x={-Math.PI / 2} receiveShadow material={floorMat}>
          <planeGeometry args={[900, 900]} />
        </mesh>
      )}
    </>
  );
}

const DEFAULT_POST: PostOptions = { ao: true, bloom: 0.32, bloomThreshold: 1.6 };
const DEFAULT_POST_COMPACT: PostOptions = { ao: false, bloom: 0.25, bloomThreshold: 1.6 };

/**
 * The only <Canvas> component in the project. On-demand rendering, a
 * procedural physical sky (no HDR download), one shadow-casting key light
 * and an optional photographic finish.
 */
export default function Stage(props: StageProps) {
  const { active, compact, children, look = 'studioLight', post = DEFAULT_POST, postCompact = DEFAULT_POST_COMPACT } = props;
  const finish = compact ? postCompact : post;
  const rig = useMemo<Rig>(
    () => ({
      lightTarget: new THREE.Vector3(),
      look: LOOKS[look],
      setLook: () => {},
      mixLook: () => {},
      grade: null,
      prepare: () => {},
      sync: () => {},
      begin: () => null,
      compile: () => Promise.resolve(),
      alsoWarm: null,
      warm: () => {},
      holding: !!finish,
      shadowDirty: true,
      clear: [0, 0, 0, 0],
      sky: 1,
      beforeDraw: new Set(),
    }),
    // The finish only decides the first value of `holding`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [look],
  );

  return (
    <Canvas
      shadows="percentage"
      frameloop={active ? 'demand' : 'never'}
      dpr={compact ? [1, 1.5] : [1, finish ? 1.5 : 1.75]}
      // With a finish the scene is drawn into its own target; the canvas only receives the final pass.
      gl={{ antialias: !finish, alpha: true, powerPreference: 'high-performance', stencil: false, depth: !finish }}
      camera={{ fov: 28, near: 0.5, far: 1200, position: [20, 14, 26] }}
      /*
       * The stage's own box, not its painted bounds: the hero scales the
       * stage while its title card opens, and a canvas measured through that
       * transform was 14% larger than the screen and resized on every pause.
       */
      resize={{ scroll: false, offsetSize: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Setup {...props} rig={rig} finished={!!finish} />
      {children(rig)}
      {finish && (
        <Post
          {...finish}
          getGrade={() => rig.grade ?? rig.look.grade ?? NEUTRAL_GRADE}
          before={() => rig.begin()}
          compile={() => rig.compile()}
          onWarmer={(draw) => {
            rig.alsoWarm = draw;
          }}
          onReady={() => {
            rig.holding = false;
            /*
             * Mounted ahead of time, out of sight (Film.tsx): nothing asks it for a frame, so its geometry,
             * textures and shadow map would still be sent to the GPU on the first frame the visitor sees.
             * One draw into the warming target does that now, in idle time.
             */
            if (!active) {
              const warm = () => rig.warm(() => () => {});
              if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warm, { timeout: 1500 });
              else window.setTimeout(warm, 200);
            }
          }}
        />
      )}
    </Canvas>
  );
}

const _v = new THREE.Vector3();

/** Projects a world point to canvas pixels for DOM labels. */
export function project(
  camera: THREE.Camera,
  size: { width: number; height: number },
  x: number,
  y: number,
  z: number,
): [number, number, boolean] {
  _v.set(x, y, z).project(camera);
  return [(_v.x * 0.5 + 0.5) * size.width, (-_v.y * 0.5 + 0.5) * size.height, _v.z < 1];
}

/**
 * Sets the camera from a pose, pulling it back along its own line of sight
 * when the canvas is narrower than the scene was composed for.
 */
export function aim(
  camera: THREE.Camera,
  pos: readonly number[],
  look: readonly number[],
  aspect: number,
  composedAspect = 1.5,
  strength = 0.85,
) {
  const fit = aspect < composedAspect ? 1 + (composedAspect / aspect - 1) * strength : 1;
  camera.position.set(
    look[0] + (pos[0] - look[0]) * fit,
    look[1] + (pos[1] - look[1]) * fit,
    look[2] + (pos[2] - look[2]) * fit,
  );
  camera.lookAt(look[0], look[1], look[2]);
  camera.updateMatrixWorld();
}

/**
 * Sends everything under `root` to the GPU ahead of time, shown or not.
 * A film that keeps its parts out of sight until their turn (the factory's
 * boards, its concrete, its doors, the crane's load; the installation's
 * add-ons) would otherwise compile a shader and upload buffers in the frame
 * each first appears, in the middle of the scroll. Once, when the stage's
 * own shaders are in and the page is idle; drawn into the warming target,
 * so nothing of it is seen.
 */
export function useWarmAll(rig: Rig, root: RefObject<THREE.Object3D | null>) {
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const run = () => {
      const top = root.current;
      if (!alive || !top) return;
      rig.warm(() => {
        const hidden: THREE.Object3D[] = [];
        const culled: THREE.Object3D[] = [];
        top.traverse((o) => {
          if (!o.visible) {
            hidden.push(o);
            o.visible = true;
          }
          // Out of shot is not drawn either: for this one draw, everything is.
          if (o.frustumCulled) {
            culled.push(o);
            o.frustumCulled = false;
          }
        });
        return () => {
          for (const o of hidden) o.visible = false;
          for (const o of culled) o.frustumCulled = true;
        };
      });
    };
    const wait = () => {
      if (!alive) return;
      if (rig.holding) timer = window.setTimeout(wait, 200);
      else if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1500 });
      else timer = window.setTimeout(run, 200);
    };
    wait();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [rig, root]);
}

/** Returns a function that places a DOM label at a world position. */
export function useLabel(place: SceneProps['place']) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  return useMemo(
    () => (id: string, x: number, y: number, z: number, opacity: number) => {
      const [sx, sy, front] = project(camera, size, x, y, z);
      place(id, sx, sy, front ? opacity : 0);
    },
    [camera, size, place],
  );
}
