/**
 * Aerial perspective for every material. three's fog is one flat colour;
 * a real horizon is warm toward the sun and cool away from it, so terrain
 * dissolving into a flat fog never meets the sky cleanly. This patches the
 * fog chunks once, globally: the fog colour now depends on the view
 * direction (sun side vs. away side, matched to the sky model) and thins as
 * the eye looks up.
 *
 * Land can also be drawn only out to a distance from a point on the ground
 * (ATMOS.clear), fading to nothing beyond it: the opening of the hero,
 * where the land spreads out from under the house. The scene's picture is
 * premultiplied and its alpha is its coverage (post.tsx), so a faded
 * fragment lets through what is behind the scene, the sky or the page.
 * Materials marked with `clearing()` take part. They have two programs:
 * the test (a `discard`, at the top of the shader so that what is outside
 * is not shaded first) is compiled in only while a clearing is open,
 * because a shader that can discard gives up early depth rejection and the
 * land is where the overdraw is. While it is open the land is also laid
 * over what has been drawn before it (the opening card's floor, kit/
 * plaza.tsx), premultiplied, instead of replacing it: at the clearing's
 * soft edge the meadow then fades into the floor it grows over, and where
 * nothing is under it, into the page, as before.
 *
 * The extra uniforms are plain {x,y,z,w} objects. UniformsUtils.clone keeps
 * plain objects by reference, so every material shares them and a look
 * change is one write here.
 */
import { CustomBlending, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, ShaderChunk, ShaderLib, UniformsLib, type Blending, type Material } from 'three';

type V4 = { x: number; y: number; z: number; w: number };

export const ATMOS: { sun: V4; toward: V4; away: V4; clear: V4 } = {
  /** Horizontal sun direction (xyz) and the falloff power of its glow (w). */
  sun: { x: 0, y: 0, z: 1, w: 8 },
  /** Haze colour toward the sun (linear rgb); w: how much the haze thins looking up. */
  toward: { x: 1, y: 1, z: 1, w: 0 },
  /** Haze colour away from the sun; w: 1 enables the directional haze, 0 uses plain fogColor. */
  away: { x: 1, y: 1, z: 1, w: 0 },
  /** The clearing: its centre on the ground (x, z in xy), its radius (z) and the width of its soft edge (w). */
  clear: { x: 0, y: 0, z: 0, w: 0 },
};

let patched = false;

export function patchAtmosphere() {
  if (patched) return;
  patched = true;

  ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vAtmDir;
#endif`;

  ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vAtmDir = ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz;
#endif`;

  ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform vec4 uAtmSun;
  uniform vec4 uAtmToward;
  uniform vec4 uAtmAway;
  varying float vFogDepth;
  varying vec3 vAtmDir;
  #ifdef ATM_CLEARING
    uniform vec4 uAtmClear;
    float atmClearK = 1.0;
  #endif
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;

  // The first thing every built-in material's fragment shader does: outside the clearing, nothing else is.
  ShaderChunk.clipping_planes_fragment =
    /* glsl */ `
#if defined( USE_FOG ) && defined( ATM_CLEARING )
  // vAtmDir is the fragment's place in the world, from the camera.
  atmClearK = 1.0 - smoothstep( uAtmClear.z, uAtmClear.z + uAtmClear.w, length( cameraPosition.xz + vAtmDir.xz - uAtmClear.xy ) );
  if ( atmClearK < 0.004 ) discard;
#endif
` + ShaderChunk.clipping_planes_fragment;

  ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  vec3 atmFog = fogColor;
  if ( uAtmAway.w > 0.5 ) {
    vec3 atmD = normalize( vAtmDir );
    vec2 atmH = atmD.xz / max( length( atmD.xz ), 1e-4 );
    float atmS = pow( max( dot( atmH, uAtmSun.xz ), 0.0 ), uAtmSun.w );
    atmFog = mix( uAtmAway.rgb, uAtmToward.rgb, atmS );
    fogFactor *= 1.0 - smoothstep( 0.02, 0.45, atmD.y ) * uAtmToward.w;
  }
  gl_FragColor.rgb = mix( gl_FragColor.rgb, atmFog, fogFactor );
  #ifdef ATM_CLEARING
    // Premultiplied, its coverage the clearing's own: so it can be laid over what is under it (dress, below).
    gl_FragColor = vec4( gl_FragColor.rgb * atmClearK, atmClearK );
  #endif
#endif`;

  const extra = {
    uAtmSun: { value: ATMOS.sun },
    uAtmToward: { value: ATMOS.toward },
    uAtmAway: { value: ATMOS.away },
    uAtmClear: { value: ATMOS.clear },
  };
  Object.assign(UniformsLib.fog, extra);
  for (const key of Object.keys(ShaderLib) as (keyof typeof ShaderLib)[]) {
    const lib = ShaderLib[key];
    if (lib.uniforms && 'fogColor' in lib.uniforms) Object.assign(lib.uniforms, extra);
  }
}

/** Uniform entries for a custom ShaderMaterial that uses the fog chunks. */
export function atmosphereUniforms() {
  return {
    uAtmSun: { value: ATMOS.sun },
    uAtmToward: { value: ATMOS.toward },
    uAtmAway: { value: ATMOS.away },
    uAtmClear: { value: ATMOS.clear },
  };
}

/** Land materials, with what each has when no clearing is open: whether it uses fog (the test needs the fog chunks), and how it is laid down. */
const land = new Map<Material, { fog: boolean; blending: Blending }>();
let open = false;

const dress = (m: Material, was: { fog: boolean; blending: Blending }, on: boolean) => {
  const f = m as Material & { fog: boolean };
  const defines = { ...(m.defines ?? {}) };
  if (on) defines.ATM_CLEARING = '';
  else delete defines.ATM_CLEARING;
  m.defines = defines;
  f.fog = on || was.fog;
  // Over what is already there, by its own coverage (the shader has multiplied its colour by it). Not what is see-through already.
  if (!m.transparent && was.blending === NormalBlending) {
    m.blending = on ? CustomBlending : NormalBlending;
    if (on) {
      m.blendSrc = m.blendSrcAlpha = OneFactor;
      m.blendDst = m.blendDstAlpha = OneMinusSrcAlphaFactor;
    }
  }
  m.needsUpdate = true;
};

/** Marks a material as land: it keeps inside the clearing while one is open. */
export function clearing<M extends Material>(m: M): M {
  const was = { fog: (m as Material & { fog?: boolean }).fog !== false, blending: m.blending };
  land.set(m, was);
  m.addEventListener('dispose', () => land.delete(m));
  if (open) dress(m, was, true);
  return m;
}

/** Opens or closes the clearing for every land material: each changes program, once. Called by the stage before it draws. */
export function setClearing(on: boolean) {
  if (on === open) return;
  open = on;
  land.forEach((was, m) => dress(m, was, on));
}
