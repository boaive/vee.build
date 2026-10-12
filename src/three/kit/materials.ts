import { CanvasTexture, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector2, type Material, type MeshStandardMaterialParameters } from 'three';
import { deckFinishes, roofing, shellFinishes, trimFinishes } from '../../data/build';
import { asphaltSet, concreteSet, gravelSet, renderSet, ribSet, soilSet, tile, timberSet } from './pbr';
import { fileTexture } from './textures';

const std = (color: string, roughness = 0.9, metalness = 0, extra: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** Interior glow for lit windows: bright under the ceiling, falling off to the sill. */
function glowMap() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.3, '#d8d2c8');
  grd.addColorStop(1, '#4a4642');
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/* Lit glazing with a room behind it                                   */
/* ------------------------------------------------------------------ */

const ROOM_PARS_VERTEX = /* glsl */ `
#ifdef VEE_ROOM
attribute vec3 roomLo;
attribute vec3 roomHi;
varying vec3 vRoomPos;
varying vec3 vRoomEye;
flat varying vec3 vRoomLo;
flat varying vec3 vRoomHi;
flat varying float vRoomSeed;
#endif
`;

const ROOM_VERTEX = /* glsl */ `
#ifdef VEE_ROOM
  vRoomPos = transformed;
  mat4 roomModel = modelMatrix;
  #ifdef USE_INSTANCING
    roomModel = modelMatrix * instanceMatrix;
  #endif
  vRoomEye = ( inverse( roomModel ) * vec4( cameraPosition, 1.0 ) ).xyz;
  vRoomLo = roomLo;
  vRoomHi = roomHi;
  vRoomSeed = fract( sin( dot( roomModel[ 3 ].xyz, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
#endif
`;

/*
 * The room: a box (the building's inside, in its own space), entered through
 * the glass. The ray from the eye through this point of the pane is followed
 * to whatever it meets first: a wall, the floor, the ceiling, or one of a few
 * pieces of furniture standing against the wall opposite the window. Each
 * room is a living room or a bedroom, its colours picked by a number of its
 * own (from where it stands), and lit by a light under the ceiling and a
 * lamp. What comes back is the room's light, which the glazing's own glow
 * colour and brightness scale (so it is dark until the building is lit).
 */
const ROOM_PARS_FRAGMENT = /* glsl */ `
#ifdef VEE_ROOM
varying vec3 vRoomPos;
varying vec3 vRoomEye;
flat varying vec3 vRoomLo;
flat varying vec3 vRoomHi;
flat varying float vRoomSeed;

void roomHit( vec3 ro, vec3 inv, vec3 bmin, vec3 bmax, float id, inout float t, inout vec3 n, inout float hid ) {
  vec3 t0 = ( bmin - ro ) * inv;
  vec3 t1 = ( bmax - ro ) * inv;
  vec3 tn = min( t0, t1 );
  vec3 tf = max( t0, t1 );
  float a = max( max( tn.x, tn.y ), tn.z );
  float b = min( min( tf.x, tf.y ), tf.z );
  if ( a < b && a > 0.0 && a < t ) {
    t = a;
    n = - sign( inv ) * step( tn.yzx, tn ) * step( tn.zxy, tn );
    hid = id;
  }
}

// A piece of furniture: across the room from its middle (l0, l1), up from the floor (u0, u1), out from the far wall (d0, d1).
void roomPiece( vec3 ro, vec3 inv, bool alongX, float into, float back, float mid, float floorY, vec4 lu, vec2 dd, float id, inout float t, inout vec3 n, inout float hid ) {
  float c0 = back - into * dd.y;
  float c1 = back - into * dd.x;
  vec3 bmin = alongX ? vec3( min( c0, c1 ), floorY + lu.z, mid + lu.x ) : vec3( mid + lu.x, floorY + lu.z, min( c0, c1 ) );
  vec3 bmax = alongX ? vec3( max( c0, c1 ), floorY + lu.w, mid + lu.y ) : vec3( mid + lu.y, floorY + lu.w, max( c0, c1 ) );
  roomHit( ro, inv, bmin, bmax, id, t, n, hid );
}

vec3 roomLight( vec3 p, vec3 rd, vec3 lo, vec3 hi, float seed ) {
  rd += vec3( 1e-5 ) * ( 1.0 - step( 1e-5, abs( rd ) ) );
  vec3 inv = 1.0 / rd;
  vec3 t0 = ( lo - p ) * inv;
  vec3 t1 = ( hi - p ) * inv;
  vec3 tn = min( t0, t1 );
  vec3 tf = max( t0, t1 );
  vec3 axisIn = step( tn.yzx, tn ) * step( tn.zxy, tn );
  float t = min( min( tf.x, tf.y ), tf.z );
  vec3 n = - sign( rd ) * step( tf, tf.yzx ) * step( tf, tf.zxy );
  float hid = 0.0;

  // The way into the room is the horizontal axis the glass faces; across is the other one.
  bool alongX = axisIn.x > 0.5 || ( axisIn.y > 0.5 && abs( rd.x ) > abs( rd.z ) );
  float into = alongX ? sign( rd.x ) : sign( rd.z );
  float back = alongX ? ( into > 0.0 ? hi.x : lo.x ) : ( into > 0.0 ? hi.z : lo.z );
  float a0 = alongX ? lo.z : lo.x;
  float a1 = alongX ? hi.z : hi.x;
  float depth = alongX ? hi.x - lo.x : hi.z - lo.z;
  float width = a1 - a0;
  float s2 = fract( seed * 7.13 );
  float s3 = fract( seed * 13.71 );
  float mid = 0.5 * ( a0 + a1 ) + ( s2 - 0.5 ) * max( 0.0, width - 3.0 ) * 0.8;
  float f = lo.y;
  bool bed = seed > 0.62;
  float side = s3 > 0.5 ? 1.0 : -1.0;
  // The lamp: beside the bed, or a floor lamp at the end of the sofa.
  float lampAt = bed ? 1.05 : 1.42;
  vec3 lamp = vec3( 0.0, f + ( bed ? 0.68 : 1.45 ), 0.0 );
  lamp += alongX ? vec3( back - into * ( bed ? 0.22 : 0.27 ), 0.0, mid + side * lampAt ) : vec3( mid + side * lampAt, 0.0, back - into * ( bed ? 0.22 : 0.27 ) );
  // One box round all of the furniture first: a ray that misses it misses every piece, and most do.
  float reach = bed ? min( 2.05, depth - 0.45 ) : min( 1.85, depth - 0.5 );
  float tb = t;
  vec3 nb = n;
  float hb = 0.0;
  roomPiece( p, inv, alongX, into, back, mid, f, bed ? vec4( -1.3, 1.3, 0.0, 1.0 ) : vec4( -1.65, 1.65, 0.0, 1.62 ), vec2( 0.0, reach ), 1.0, tb, nb, hb );
  if ( hb > 0.5 ) {
    if ( bed ) {
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -0.82, 0.82, 0.0, 0.5 ), vec2( 0.06, reach ), 5.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -0.86, 0.86, 0.0, 1.0 ), vec2( 0.0, 0.08 ), 6.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -0.7, 0.7, 0.5, 0.62 ), vec2( 0.12, 0.5 ), 7.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( side * 1.05 - 0.22, side * 1.05 + 0.22, 0.0, 0.52 ), vec2( 0.02, 0.42 ), 2.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( side * 1.05 - 0.13, side * 1.05 + 0.13, 0.52, 0.8 ), vec2( 0.09, 0.35 ), 4.0, t, n, hid );
    } else {
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -1.05, 1.05, 0.0, 0.44 ), vec2( 0.04, 0.96 ), 1.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -1.05, 1.05, 0.0, 0.86 ), vec2( 0.04, 0.28 ), 1.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -1.05, -0.86, 0.0, 0.6 ), vec2( 0.04, 0.96 ), 1.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( 0.86, 1.05, 0.0, 0.6 ), vec2( 0.04, 0.96 ), 1.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( -0.5, 0.5, 0.0, 0.4 ), vec2( 1.3, reach ), 2.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( side * 1.42 - 0.025, side * 1.42 + 0.025, 0.0, 1.38 ), vec2( 0.24, 0.29 ), 3.0, t, n, hid );
      roomPiece( p, inv, alongX, into, back, mid, f, vec4( side * 1.42 - 0.19, side * 1.42 + 0.19, 1.3, 1.6 ), vec2( 0.08, 0.45 ), 4.0, t, n, hid );
    }
  }

  vec3 h = p + rd * t;
  float across = alongX ? h.z : h.x;
  float away = ( back - ( alongX ? h.x : h.z ) ) * into;
  vec3 c = vec3( 0.0 );
  if ( hid < 0.5 ) {
    if ( n.y > 0.5 ) {
      // Floor: boards across the room, and a rug in front of the sofa or beside the bed.
      float board = fract( away / 0.19 );
      c = mix( vec3( 0.42, 0.29, 0.18 ), vec3( 0.5, 0.36, 0.23 ), fract( floor( away / 0.19 ) * 0.618 + seed ) ) * ( 0.82 + 0.18 * smoothstep( 0.0, 0.06, min( board, 1.0 - board ) ) );
      if ( abs( across - mid ) < 1.35 && away > 0.45 && away < 2.3 ) c = mix( vec3( 0.66, 0.62, 0.55 ), vec3( 0.52, 0.47, 0.42 ), s2 );
    } else if ( n.y < -0.5 ) c = vec3( 0.86, 0.83, 0.78 );
    else {
      c = mix( vec3( 0.8, 0.75, 0.67 ), vec3( 0.7, 0.67, 0.62 ), s3 );
      // A picture on the far wall, over the sofa or the bed.
      if ( abs( away ) < 0.02 && abs( across - mid ) < 0.55 && h.y > f + 1.15 && h.y < f + 1.85 ) c = abs( across - mid ) < 0.5 && h.y > f + 1.2 && h.y < f + 1.8 ? mix( vec3( 0.2, 0.28, 0.32 ), vec3( 0.55, 0.38, 0.24 ), s2 ) : vec3( 0.08 );
    }
    // The room's corners take less light.
    vec3 q = min( h - lo, hi - h );
    vec3 m = mix( q, vec3( 9.0 ), abs( n ) );
    c *= mix( 0.55, 1.0, smoothstep( 0.0, 0.5, min( min( m.x, m.y ), m.z ) ) );
  } else if ( hid < 1.5 ) c = seed < 0.2 ? vec3( 0.55, 0.5, 0.42 ) : seed < 0.4 ? vec3( 0.3, 0.35, 0.29 ) : vec3( 0.48, 0.27, 0.19 );
  else if ( hid < 2.5 ) c = vec3( 0.2, 0.13, 0.08 );
  else if ( hid < 3.5 ) c = vec3( 0.04 );
  else if ( hid < 4.5 ) c = vec3( 2.6, 2.2, 1.6 );
  else if ( hid < 5.5 ) c = vec3( 0.86, 0.85, 0.8 );
  else if ( hid < 6.5 ) c = vec3( 0.34, 0.23, 0.15 );
  else c = vec3( 0.95, 0.94, 0.9 );

  // A light under the middle of the ceiling and the lamp.
  vec3 top = vec3( 0.5 * ( lo.x + hi.x ), hi.y - 0.25, 0.5 * ( lo.z + hi.z ) );
  vec3 l1 = top - h;
  float d1 = length( l1 );
  vec3 l2 = lamp - h;
  float d2 = length( l2 );
  float e = 0.2 + 1.2 * max( dot( n, l1 / d1 ), 0.0 ) / ( 1.0 + 0.32 * d1 * d1 ) + 1.1 * max( dot( n, l2 / d2 ), 0.0 ) / ( 1.0 + 2.2 * d2 * d2 );
  // The lamp's shade glows by itself.
  return hid > 3.5 && hid < 4.5 ? c : c * e;
}
#endif
`;

const ROOM_FRAGMENT = /* glsl */ `
#include <emissivemap_fragment>
#ifdef VEE_ROOM
  if ( vRoomHi.x > vRoomLo.x + 0.05 ) totalEmissiveRadiance = emissive * roomLight( vRoomPos, normalize( vRoomPos - vRoomEye ), vRoomLo, vRoomHi, vRoomSeed );
#endif
`;

/**
 * Lit glazing with a room behind it (client, 2026-10-11: realistic,
 * premium). Where a building's geometry gives the box of its inside
 * (geometry.ts, withRoom), its lit windows show a room in it instead of a
 * flat glow, at the cost of a few box tests for each pixel of glass. Where
 * it does not, the glow is as it was. The material is changed in place;
 * a copy of it (litGlass, instanced) is given the same again.
 */
export function interiorGlass<M extends Material>(m: M): M {
  const d = m as unknown as { defines?: Record<string, string>; defaultAttributeValues?: Record<string, number[]> };
  d.defines = { ...(d.defines ?? {}), VEE_ROOM: '' };
  d.defaultAttributeValues = { roomLo: [0, 0, 0], roomHi: [0, 0, 0] };
  m.userData.interior = true;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${ROOM_PARS_VERTEX}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${ROOM_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${ROOM_PARS_FRAGMENT}`)
      .replace('#include <emissivemap_fragment>', ROOM_FRAGMENT);
  };
  m.customProgramCacheKey = () => 'vee-room-v1';
  return m;
}

/** Made on first use and kept. */
const once = <T>(make: () => T) => {
  let made: T | undefined;
  return () => (made === undefined ? (made = make()) : made);
};

/* ------------------------------------------------------------------ */
/* Refined finishes                                                    */
/* ------------------------------------------------------------------ */

/*
 * Some of the kit's materials have a refined finish: the same surface, in
 * the same colour, as it is when it comes out of a factory and is looked
 * at closely (developer, 2026-10-12: "photo realistic",
 * "precision-manufactured", not dirty, not weathered). A scene asks for it
 * with the last argument of `kit`, `shellMat`, `trimMat` and
 * `moduleMats`; the material as it was is made only where that is asked
 * for, so a refined scene never draws the old maps.
 *
 * For now only the hero asks (kit/refined.ts): the developer reviews it
 * there before the other scenes take it. When they do, each recipe below
 * becomes its material's own definition and the argument goes.
 *
 * Their maps are files (scripts/textures.mjs), not drawings: 512 px, which
 * is already more than a screen shows of a wall, and what they add is not
 * sharpness but what the light does on the surface. A wall's three maps
 * are laid at three sizes that share no measure, so no patch of it repeats.
 */

/** Micro concrete on a shell's walls (UVs: 1.5 m to the unit, as boxUV lays them on a shell). */
const fineShell = (hex: string) => () =>
  std(hex, 1, 0, {
    map: fileTexture('render-c', [236, 235, 234], 1.9 / 1.5, true),
    normalMap: fileTexture('render-n', [128, 128, 255], 1.9 / 1.5),
    roughnessMap: fileTexture('render-r', [228, 228, 228], 3.1 / 1.5),
    normalScale: new Vector2(0.68, 0.68),
  });

/** Precast concrete out of a steel mould (UVs in metres). */
const finePrecast = (hex: string) => () =>
  std(hex, 1, 0, {
    map: fileTexture('precast-c', [226, 225, 224], 1.4, true),
    normalMap: fileTexture('precast-n', [128, 128, 255], 1.4),
    roughnessMap: fileTexture('precast-r', [194, 194, 194], 2.3),
    normalScale: new Vector2(0.6, 0.6),
  });

/**
 * A factory coat on steel: powder coat is a paint, not a bare metal. As a
 * metal a dark member has only its surroundings to show and, where those
 * are plain, goes dead black; as a coat it takes a soft highlight from the
 * light itself.
 *
 * What a refined surface gives back of the sky is set for the opening
 * card, whose look lets the sky's light down to a third of the other
 * looks' (kit/looks.ts, card: env 0.16): the sheet metal, the capsule's
 * coat and the glass ask for several times a plain material's share. The
 * house keeps them into the sunset that follows, where its roof and panes
 * give back that much more of a sky that is then really there.
 */
const fineCoat = (hex: string, roughness: number) => () => std(hex, roughness, 0.1, { envMapIntensity: 1.2 });

/*
 * Materials that carry procedural textures. Drawing a texture set takes tens
 * of milliseconds on the main thread, so each is made the first time a scene
 * asks for it, not when this module loads (the hero never needs asphalt,
 * soil or sheeting).
 */
const textured = {
  concrete: once(() => {
    const c = concreteSet();
    return std('#c9c5bc', 0.86, 0, { map: tile(c.map, 1.4), normalMap: tile(c.normalMap, 1.4), roughnessMap: tile(c.roughnessMap, 1.4), normalScale: new Vector2(0.8, 0.8) });
  }),
  cast: once(() => {
    const c = concreteSet();
    return std('#b9b5ad', 0.86, 0, { map: tile(c.map, 1.4), normalMap: tile(c.normalMap, 1.4), normalScale: new Vector2(0.5, 0.5) });
  }),
  yard: once(() => {
    const c = concreteSet();
    return std('#cfcbc2', 0.92, 0, { map: tile(c.map, 3), normalMap: tile(c.normalMap, 3) });
  }),
  gravel: once(() => {
    const g = gravelSet();
    return std('#d9d1c4', 0.97, 0, { map: tile(g.map, 1.6), normalMap: tile(g.normalMap, 1.6), normalScale: new Vector2(1.2, 1.2) });
  }),
  paving: once(() => {
    const c = concreteSet();
    return std('#e2ddd3', 0.88, 0, { map: tile(c.map, 2.5), normalMap: tile(c.normalMap, 2.5), normalScale: new Vector2(0.5, 0.5) });
  }),
  asphalt: once(() => {
    const a = asphaltSet();
    return std('#8a8a8c', 0.9, 0, { map: tile(a.map, 3), normalMap: tile(a.normalMap, 3), roughnessMap: tile(a.roughnessMap, 3) });
  }),
  soil: once(() => {
    const s = soilSet();
    return std('#d9c2a4', 1, 0, { map: tile(s.map, 2), normalMap: tile(s.normalMap, 2) });
  }),
  sheeting: once(() => std('#c3c7c9', 0.45, 0.55, { side: DoubleSide, normalMap: tile(ribSet().normalMap, 1) })),
  glassLit: once(() => interiorGlass(std('#1d1915', 0.12, 0, { emissive: '#ffc887', emissiveIntensity: 2.1, emissiveMap: glowMap(), envMapIntensity: 1.4 }))),
};

/**
 * One material set for every scene. Shared instances; never mutate them in
 * a scene — clone first, or use the cached factories below. Textured
 * materials expect UVs in metres (boxUV) unless noted.
 */
export const mat = {
  /** Finished module body: the default finish (stone grey, as the client's render). */
  shell: std(shellFinishes[0].hex, 0.9),
  /** Precast concrete: footings, plinths, slabs (UVs in metres). */
  get concrete() {
    return textured.concrete();
  },
  /** Insulation / wall panel white (EPS cores in the factory). */
  panel: std('#f1efea', 0.82),
  /** The capsule's shell: the same white, a satin coat, so its rounded corners take a soft highlight. */
  pod: std('#f1efea', 0.6),
  /** Fascia, base recess, spandrels. */
  trim: std('#55585b', 0.7, 0.15),
  /** Module roof fascia: near-black painted metal, as the render. */
  fascia: std('#2f3236', 0.55, 0.35),
  /** Window and door frames. */
  frame: std('#f4f2ee', 0.42),
  /** Structural steel, handrails: dark powder coat. */
  steel: std('#2a2c2f', 0.42, 0.7),
  /**
   * The shell's structural frame: the kit's black, as a coat of paint rather
   * than bare metal. Standing alone, on a dark stage or a light one, a
   * metal has little to reflect and the frame all but vanished.
   */
  frameSteel: std('#2e3136', 0.55, 0.05),
  /** Galvanised fittings (hooks, cleats). */
  galv: std('#c9ccce', 0.38, 0.85),
  /** Glazing by day: clear, catching the sky. */
  glass: new MeshPhysicalMaterial({ color: '#6f7e88', roughness: 0.04, metalness: 0.1, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.02 }),
  /** Glazing at dusk: lit from inside. */
  get glassLit() {
    return textured.glassLit();
  },
  /** Timber deck (finish factories below carry the boards). */
  deck: std(deckFinishes[0].hex, 0.82),
  /** Model base the buildings sit on. */
  plate: std('#d8d5ce', 0.97),
  /** Pale maquette vegetation (light studio). */
  foliage: std('#d3d0c8', 1),
  /** Measurement and highlight on a light stage: the paper's accent, vermilion (tokens.css). */
  accent: std('#e2491d', 0.55),
  /** The same on a dark stage: the fluorescent green. The accent follows its ground. */
  accentInk: std('#c8f031', 0.55),
  /** Ghosted plant and options. */
  ghost: std('#c3c8cc', 1, 0, { transparent: true, opacity: 0.4, depthWrite: false }),
  /** Factory: bright green formwork boards (from the brief). */
  formwork: std('#2fa846', 0.55, 0.05),
  /** Factory: wet/cured concrete surfaces. */
  get cast() {
    return textured.cast();
  },
  /** Factory yard slab. */
  get yard() {
    return textured.yard();
  },
  /** Photovoltaic panels. */
  solar: new MeshPhysicalMaterial({ color: '#16202c', roughness: 0.18, metalness: 0.5, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.05 }),
  /** Yard markings. */
  marking: std('#f4f2ec', 0.8),
  /** Hose, tyres. */
  rubber: std('#151617', 0.88),
  /** Double-sided white for thin sheets. */
  sheet: std('#f1efea', 0.82, 0, { side: DoubleSide }),
  /** Landscape gravel (UVs in metres). */
  get gravel() {
    return textured.gravel();
  },
  /** Light concrete paving (UVs in metres). */
  get paving() {
    return textured.paving();
  },
  path: std('#d6cfc1', 0.95),
  /** Road surface (UVs in metres). */
  get asphalt() {
    return textured.asphalt();
  },
  /** Excavated and backfilled earth (UVs in metres). */
  get soil() {
    return textured.soil();
  },
  lawn: std('#8f9c6e', 1),
  /** Freshly dug earth, plain: a footing's pit before it is backfilled (no texture to draw on the main thread). */
  earth: std('#3e3127', 1),
  /** Vehicles and plant. */
  paint: std('#ecebe6', 0.32, 0.1),
  paintDark: std('#33363a', 0.4, 0.3),
  yellow: std('#e2a92b', 0.38, 0.15),
  /** Street lamp heads, porch lights. */
  lamp: std('#3a2a1c', 0.4, 0, { emissive: '#ffd9a6', emissiveIntensity: 3 }),
  /** Ribbed sheeting on the factory shed (UVs in metres). */
  get sheeting() {
    return textured.sheeting();
  },
  /** Translucent polycarbonate: roof lights, the door and window shade (ref H5). */
  polycarb: new MeshPhysicalMaterial({ color: '#7fb4dc', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false }),
  /** Steel wire mesh, as a dark translucent sheet. */
  mesh: std('#3b3d40', 0.5, 0.6, { transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false }),
  /** Red-oxide primer on structural steel in the factory. */
  primer: std('#8a3b28', 0.6, 0.3),
};

export type MatName = keyof typeof mat;

/** The kit's materials that have a refined finish (above), each made the first time it is asked for. */
const fineKit: Partial<Record<MatName, () => Material>> = {
  concrete: once(finePrecast('#c9c5bc')),
  // Coated panels, semi-gloss: the coat's own sheen (its map, let down), and a sheet that is not perfectly flat (UVs in metres round the hull).
  pod: once(() =>
    std('#f1efea', 0.62, 0, {
      normalMap: fileTexture('coat-n', [128, 128, 255], 1.7),
      roughnessMap: fileTexture('coat-r', [115, 115, 115], 2.9),
      normalScale: new Vector2(0.4, 0.4),
      envMapIntensity: 9,
    }),
  ),
  // Photovoltaic panels with their cells, frame and busbars (UVs: one panel to the face), under the same glass.
  solar: once(
    () =>
      new MeshPhysicalMaterial({
        color: '#ffffff',
        map: fileTexture('solar-c', [30, 40, 56], 1, true),
        roughness: 0.18,
        metalness: 0.5,
        envMapIntensity: 3.5,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
  ),
  trim: once(fineCoat('#55585b', 0.58)),
  fascia: once(fineCoat('#2f3236', 0.5)),
  steel: once(fineCoat('#2a2c2f', 0.46)),
};

/** A kit material by name. `fine`: in its refined finish, where it has one. */
export function kit(name: MatName, fine = false): Material {
  const make = fine ? fineKit[name] : undefined;
  return make ? make() : mat[name];
}

const instancedOf = new WeakMap<Material, Material>();
const instancedSets = new WeakMap<Material[], Material[]>();

/**
 * The same material, for an InstancedMesh. three keeps one compiled shader
 * per material and has to look it up again whenever consecutive draws differ
 * in instancing: a material shared by an instanced mesh and a plain one cost
 * that lookup on every draw of every frame. Instanced meshes take this copy
 * instead; it shares the original's textures and is made once.
 */
export function instanced<M extends Material>(m: M): M;
export function instanced(m: Material[]): Material[];
export function instanced(m: Material | Material[]): Material | Material[] {
  if (Array.isArray(m)) {
    let set = instancedSets.get(m);
    if (!set) instancedSets.set(m, (set = m.map((one) => instanced(one))));
    return set;
  }
  let copy = instancedOf.get(m);
  if (!copy) {
    copy = m.clone();
    // A clone keeps the material's settings but not what it does to its shader.
    if (m.userData.interior) interiorGlass(copy);
    instancedOf.set(m, copy);
  }
  return copy;
}

const cache = new Map<string, MeshStandardMaterial>();
function cached(key: string, make: () => MeshStandardMaterial) {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

/** Shell body material for a finish colour: render over precast, as the client's render. `fine`: its refined finish. */
export function shellMat(hex: string, fine = false) {
  if (fine) return cached(`fine-shell-${hex}`, fineShell(hex));
  return cached(`shell-${hex}`, () => {
    const r = renderSet();
    return std(hex, 0.9, 0, { map: r.map, normalMap: r.normalMap, roughnessMap: r.roughnessMap, normalScale: new Vector2(0.9, 0.9) });
  });
}

/** Decking in a finish colour, boards and gaps from the texture. */
export function deckMat(hex: string) {
  return cached(`deck-${hex}`, () => {
    const t = timberSet();
    return std(hex, 0.78, 0, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: new Vector2(0.9, 0.9) });
  });
}

/** Painted metal for fascia and frames in a trim finish. `fine`: its refined finish. */
export function trimMat(hex: string, fine = false) {
  if (fine) return cached(`fine-trim-${hex}`, fineCoat(hex, 0.5));
  return cached(`trim-${hex}`, () => std(hex, 0.5, 0.35));
}

/**
 * The sloped roof's covering, in a trim colour. What it is made of is one
 * entry in the data (`roofing`, data/build.ts; CONFIRM, notes P2): as
 * proposed, standing-seam metal with a factory coat, its pans `roofing.pan`
 * wide. Expects UVs in metres on plan, the seams along v, one at u = 0.
 * `plain`: the coat alone, for a covering that has no profile of its own.
 */
export function roofMat(hex: string) {
  return cached(`roof-${roofing.surface}-${hex}`, () => {
    if (roofing.surface === 'plain') return std(hex, 0.5, 0.1, { envMapIntensity: 1.2 });
    const n = fileTexture('seam-n', [128, 128, 255]);
    const r = fileTexture('seam-r', [110, 110, 110]);
    // One pan across the tile; along the fall the sheet's waviness is laid long.
    n?.repeat.set(1 / roofing.pan, 1 / 2.6);
    r?.repeat.set(1 / 1.9, 1 / 3.7);
    return std(hex, 0.8, 0.1, { normalMap: n, roughnessMap: r, normalScale: new Vector2(1, 1), envMapIntensity: 5.5 });
  });
}

/**
 * Material array for moduleGeometry(): shell, fascia, glass, frames, fittings.
 * `windows: 'dusk'` lights the glazing from inside. `fine`: the shell and
 * the fascia in their refined finishes.
 */
export function moduleMats(shellHex: string = shellFinishes[0].hex, windows: 'day' | 'dusk' = 'day', trimHex: string = trimFinishes[0].hex, fine = false): Material[] {
  const key = `${shellHex}-${windows}-${trimHex}${fine ? '-fine' : ''}`;
  let set = moduleSets.get(key);
  if (!set) {
    set = [shellMat(shellHex, fine), trimMat(trimHex, fine), windows === 'dusk' ? mat.glassLit : mat.glass, mat.frame, mat.galv];
    moduleSets.set(key, set);
  }
  return set;
}
const moduleSets = new Map<string, Material[]>();

/**
 * Glazing lit from inside whose light can be brought up: a copy of the
 * dusk glazing with a brightness of its own, for a building that is put
 * together in view. Its windows are dark while it is lowered in and come on
 * once it stands (client, 2026-10-10: "the lights turn on before the house
 * has been placed"). `set` takes 0 to 1; `material` goes where the dusk
 * glazing went, and its copy for instanced meshes follows it. `fine`: its
 * refined finish, for a refined scene (kit/refined.ts).
 */
export function litGlass(fine = false) {
  const material = interiorGlass(mat.glassLit.clone());
  // Refined: a pane is polished, and gives back the sky it faces over the room behind it, most at a glancing angle.
  if (fine) {
    material.roughness = 0.03;
    material.envMapIntensity = 3;
  }
  const full = material.emissiveIntensity;
  material.emissiveIntensity = 0;
  const twin = instanced(material);
  return {
    material,
    set(v: number) {
      material.emissiveIntensity = twin.emissiveIntensity = full * v;
    },
    dispose() {
      material.dispose();
      twin.dispose();
    },
  };
}

/** Translucent ghost for the configurator's placement preview. */
export const ghostMat = std('#ffffff', 0.6, 0, { transparent: true, opacity: 0.45, depthWrite: false });
export const ghostBad = std('#e2491d', 0.6, 0, { transparent: true, opacity: 0.35, depthWrite: false });
