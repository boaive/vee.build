/**
 * The polished floor's reflection, for the hero's opening card (client,
 * 2026-10-11, after the reference pictures: "realistic, premium").
 *
 * Each building is drawn a second time, upside down under the floor: the
 * same geometry (and, for an instanced mesh, the same instance matrices),
 * one small shader for all of it. That shader lights the surface as it is
 * above the floor (one key light and an even fill, its glazing glowing as
 * the building's does), and lays it over the floor's colour with a
 * coverage that falls off with depth under the floor and is stronger at a
 * grazing angle. It is drawn between the floor's colour and the floor's
 * depth (kit/plaza.tsx), in the opaque pass, premultiplied: where the floor
 * has faded to nothing it lies on the page's shade behind the canvas
 * instead, and either way the picture keeps its alpha as coverage (notes
 * F8). The floor's shadows are drawn over it afterwards.
 *
 * Nothing here casts or receives a shadow, and the copies follow their
 * originals just before each draw (rig.beforeDraw), from the world matrices
 * the stage has just brought up to date. When the land comes in the
 * reflection fades out with the bare floor's shadows and is not drawn.
 */
import { useEffect, useRef, type RefObject } from 'react';
import {
  Color,
  CustomBlending,
  InstancedMesh,
  Matrix4,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Vector3,
  Vector4,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { Rig } from '../Stage';
import { PLAZA_ORDER, PLAZA_Y } from './plaza';

const VERTEX = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 p = vec4( position, 1.0 );
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3( instanceMatrix ) * n;
  #endif
  vec4 w = modelMatrix * p;
  vW = w.xyz;
  vN = mat3( modelMatrix ) * n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform float uK;
uniform float uFade;
uniform float uPlane;
uniform vec3 uKeyDir;
uniform vec3 uKey;
uniform vec3 uFill;
uniform vec4 uGrid;
uniform float uLit;
varying vec3 vN;
varying vec3 vW;
void main() {
  // Only what stands above the floor is reflected (footings go into the ground), and only as deep as the reflection shows:
  // most of a tall building's is below that, and was shaded and laid down for nothing.
  if ( vW.y > uPlane + 0.002 || uPlane - vW.y > uFade ) discard;
  vec3 n = normalize( vN );
  n.y = - n.y;
  vec3 col = uColor * ( uFill * ( 0.65 + 0.35 * n.y ) + uKey * max( dot( n, uKeyDir ), 0.0 ) ) + uGlow;
  vec3 toP = vW - cameraPosition;
  vec3 v = - normalize( toP );
  float graze = pow( 1.0 - abs( v.y ), 3.0 );
  // A lamp behind glass is given back more strongly than a wall in the last light, and farther from its foot.
  float a = uK * mix( 0.3, 1.0, graze ) * ( 1.0 - smoothstep( 0.0, uFade, uPlane - vW.y ) ) * ( 1.0 + uLit );
  // It is seen in the floor, not over it: where the line of sight meets the floor, that slab's own polish, and a joint is matt (plaza.tsx).
  vec2 at = cameraPosition.xz + toP.xz * ( ( uPlane - cameraPosition.y ) / toP.y );
  vec2 q = vec2( dot( at, vec2( uGrid.x, - uGrid.y ) ), dot( at, uGrid.yx ) ) / uGrid.z + vec2( 0.0, 0.5 );
  vec2 w = max( fwidth( q ), vec2( 1e-6 ) );
  float tone = fract( sin( dot( floor( q ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  vec2 d = abs( fract( q - 0.5 ) - 0.5 );
  vec2 l = 1.0 - smoothstep( vec2( 0.0025 ), vec2( 0.0025 ) + w * 1.25, d );
  float joint = max( l.x, l.y ) * ( 1.0 - smoothstep( 0.05, 0.3, max( w.x, w.y ) ) );
  a = min( 1.0, a * ( 0.7 + 0.3 * tone ) * ( 1.0 - 0.85 * joint ) );
  gl_FragColor = vec4( col * a, a );
}`;

/** One set of light and coverage values, shared by every reflected surface. */
const shared = {
  uK: { value: 0 },
  uFade: { value: 3.3 },
  uGrid: { value: new Vector4(1, 0, 3, 0) },
  uPlane: { value: PLAZA_Y },
  uKeyDir: { value: new Vector3(0, 1, 0) },
  uKey: { value: new Color(1, 1, 1) },
  uFill: { value: new Color(0.5, 0.5, 0.5) },
};

interface Reflected {
  material: ShaderMaterial;
  source: Material;
  /** The source's own glow (lit glazing), followed as it comes up. */
  glow: boolean;
}
const reflections = new WeakMap<Material, Reflected>();

function reflectionOf(m: Material): Reflected {
  let r = reflections.get(m);
  if (!r) {
    const s = m as MeshStandardMaterial;
    const color = s.color ? s.color.clone() : new Color(0.5, 0.5, 0.5);
    // A texture darkens its surface a little on average.
    if (s.map) color.multiplyScalar(0.85);
    const glow = !!s.emissive && s.emissive.r + s.emissive.g + s.emissive.b > 0;
    // Laid over the floor's colour, which is already there: premultiplied, in the opaque pass (it is not sorted with what is see-through).
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { ...shared, uColor: { value: color }, uGlow: { value: new Color(0, 0, 0) }, uLit: { value: glow ? 1.3 : 0 } },
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
    });
    r = { material, source: m, glow };
    reflections.set(m, r);
  }
  return r;
}

/** Mirrored in the floor's own plane. */
const FLIP = new Matrix4().makeScale(1, -1, 1).setPosition(0, 2 * PLAZA_Y, 0);
const _dir = new Vector3();

interface Pair {
  src: Mesh;
  copy: Mesh;
  mats: Reflected[];
}

/** Every ancestor shown, up to the scene. */
function shownUp(o: Object3D) {
  for (let e: Object3D | null = o; e; e = e.parent) if (!e.visible) return false;
  return true;
}

/**
 * Reflections of what is under `sources`, in `into`. `getK`: how strong the
 * reflection is, 0 to 1 (0: not drawn). Lit by the stage's own key light
 * and its sky light as they are at the moment (the card's light changes).
 */
export function useMirror(rig: Rig, into: RefObject<Group | null>, sources: RefObject<Object3D | null>[], getK: () => number, grid?: Vector4) {
  const pairs = useRef<Pair[]>([]);
  useEffect(() => {
    const root = into.current;
    if (!root) return;
    // The floor's slabs, as the floor itself has them: one vector, read each frame.
    if (grid) shared.uGrid.value = grid;
    const list: Pair[] = [];
    for (const ref of sources) {
      ref.current?.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        const src = Array.isArray(m.material) ? m.material : [m.material];
        const mats = src.map(reflectionOf);
        const material = Array.isArray(m.material) ? mats.map((r) => r.material) : mats[0].material;
        let copy: Mesh;
        if ((m as InstancedMesh).isInstancedMesh) {
          const im = m as InstancedMesh;
          const c = new InstancedMesh(im.geometry, material, im.count);
          // The same matrices, the same buffer on the GPU.
          c.instanceMatrix = im.instanceMatrix;
          copy = c;
        } else copy = new Mesh(m.geometry, material);
        copy.matrixAutoUpdate = false;
        copy.matrixWorldAutoUpdate = false;
        copy.frustumCulled = false;
        copy.castShadow = false;
        copy.receiveShadow = false;
        copy.renderOrder = PLAZA_ORDER.mirror;
        copy.visible = false;
        root.add(copy);
        list.push({ src: m, copy, mats });
      });
    }
    pairs.current = list;
    const used = new Set(list.flatMap((p) => p.mats));
    let scene: Object3D = root;
    while (scene.parent) scene = scene.parent;
    let sun: DirectionalLight | null = null;
    let sky: HemisphereLight | null = null;
    scene.traverse((o) => {
      if ((o as DirectionalLight).isDirectionalLight && o.castShadow) sun = o as DirectionalLight;
      if ((o as HemisphereLight).isHemisphereLight) sky = o as HemisphereLight;
    });
    const key = sun as DirectionalLight | null;
    const fill = sky as HemisphereLight | null;
    const follow = () => {
      const k = getK();
      shared.uK.value = k;
      if (key) {
        shared.uKeyDir.value.copy(_dir.subVectors(key.position, key.target.position).normalize());
        shared.uKey.value.copy(key.color).multiplyScalar(key.intensity * 0.45);
      }
      if (fill) shared.uFill.value.copy(fill.color).multiplyScalar(fill.intensity * 1.4 + 0.25);
      for (const r of used) {
        if (!r.glow) continue;
        const s = r.source as MeshStandardMaterial;
        (r.material.uniforms.uGlow.value as Color).copy(s.emissive).multiplyScalar(s.emissiveIntensity * 0.7);
      }
      for (const p of pairs.current) {
        const on = k > 0.003 && shownUp(p.src);
        p.copy.visible = on;
        if (!on) continue;
        p.copy.matrixWorld.multiplyMatrices(FLIP, p.src.matrixWorld);
        if ((p.src as InstancedMesh).isInstancedMesh) (p.copy as InstancedMesh).count = (p.src as InstancedMesh).count;
      }
    };
    rig.beforeDraw.add(follow);
    return () => {
      rig.beforeDraw.delete(follow);
      for (const p of list) root.remove(p.copy);
      pairs.current = [];
    };
    // The sources are mounted once with the scene; the getters read mutable state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, into]);
}
