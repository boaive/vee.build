/**
 * The floor of the hero's opening card: polished concrete in slabs of the
 * system's own 3 m module, under the three buildings (client, 2026-10-11,
 * second brief: "realistic, not like how we have now", after a reference
 * with a glossy paved floor). A real surface in the scene, where the card
 * had the page's own colour before: it takes the light, the sky's sheen at
 * a grazing angle and the occlusion at every foot, and it hides what a
 * footing has under the ground.
 *
 * It is drawn in three steps, by render order, so that the buildings can be
 * mirrored in it without a second view of the scene (kit/mirror.tsx):
 *
 *   1. the floor's colour, writing no depth;
 *   2. the mirrored buildings, which lie under it, laid over that colour;
 *   3. the floor's depth alone, so that everything drawn after it stands on
 *      a floor it cannot be seen through.
 *
 * It ends by fading: its coverage falls to nothing between two distances
 * from a point (`fade`), so the page's warm shade behind the canvas shows
 * where it stops, and there is no horizon to match (the scene's picture is
 * premultiplied, alpha as coverage: notes F8). The land, when it comes,
 * lies just over it and is laid on it (atmosphere.ts).
 *
 * No shadow is drawn on it here: the card's shadows are the scene's own
 * shadow floor, laid over this one, which keeps each shadow near its caster.
 *
 * Its shine is worked out, not looked up. As a physically shaded surface
 * with the sky's environment in it the floor cost 0.85 ms of a frame on the
 * test laptop (it is half the picture); what that gave was a sheen that
 * grows towards a grazing angle, in one colour, and that is what is drawn
 * here on a plainly lit surface, for about half the cost (notes F12).
 */
import { useEffect, useMemo, type Ref } from 'react';
import { Color, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, Vector4, type Group } from 'three';
import { memo } from './geometry';

/** The floor's height: a hair under the ground line, where the card's shadow floor is, so the land covers both. */
export const PLAZA_Y = -0.04;
/** Render order of its three steps; the mirrored buildings come between the first two. */
export const PLAZA_ORDER = { colour: -30, mirror: -20, depth: -10 } as const;

export interface Plaza {
  material: MeshLambertMaterial;
  /** What it mirrors at a grazing angle: the light low in the sky, as a colour (linear, before the finish). */
  sheen: Color;
  /** Where it ends: centre (x, z), and the two distances from it between which its coverage goes from all to none. */
  fade: Vector4;
  /** Its slabs: the direction of one joint (cos, sin of its turn about y), the slab's size in metres, and how dark a joint is. */
  grid: Vector4;
  /** How much of it is there at all, 0 to 1: the scene takes it away as the land comes. */
  cover: { value: number };
  /**
   * A near edge, for a narrow screen, where the card's words stand under the
   * picture and not on it: a direction on plan from the centre (x, z) and
   * the two distances along it between which the floor goes. Far off by
   * default: none.
   */
  near: Vector4;
}

/** `turn`: the slabs lie square to a building turned this far about y. */
export function plazaMaterial(turn: number): Plaza {
  const fade = new Vector4(0, 0, 80, 200);
  const grid = new Vector4(Math.cos(turn), Math.sin(turn), 3, 0.34);
  const cover = { value: 1 };
  const near = new Vector4(0, 1, 1e5, 1e5 + 1);
  const sheen = new Color(1.02, 0.8, 0.58);
  const material = new MeshLambertMaterial({ color: '#f2ede4' });
  material.depthWrite = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlazaFade = { value: fade };
    shader.uniforms.uPlazaGrid = { value: grid };
    shader.uniforms.uPlazaCover = cover;
    shader.uniforms.uPlazaNear = { value: near };
    shader.uniforms.uPlazaSheen = { value: sheen };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec4 uPlazaFade;
uniform vec4 uPlazaGrid;
uniform float uPlazaCover;
uniform vec4 uPlazaNear;
uniform vec3 uPlazaSheen;
float plazaK = 1.0;
float plazaJoint = 0.0;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
#ifdef USE_FOG
  // vAtmDir is the fragment's place in the world, from the camera (atmosphere.ts).
  vec2 plazaAt = cameraPosition.xz + vAtmDir.xz;
  plazaK = uPlazaCover * ( 1.0 - smoothstep( uPlazaFade.z, uPlazaFade.w, length( plazaAt - uPlazaFade.xy ) ) );
  plazaK *= 1.0 - smoothstep( uPlazaNear.z, uPlazaNear.w, dot( plazaAt - uPlazaFade.xy, uPlazaNear.xy ) );
  if ( plazaK < 0.004 ) discard;
  // Slabs: each a shade of its own, and a joint between them a hair wide on screen at any distance.
  // On the building's own plan; the joints across it are laid from its walls, half a slab from its middle.
  vec2 plazaQ = vec2( dot( plazaAt, vec2( uPlazaGrid.x, - uPlazaGrid.y ) ), dot( plazaAt, uPlazaGrid.yx ) ) / uPlazaGrid.z + vec2( 0.0, 0.5 );
  vec2 plazaW = max( fwidth( plazaQ ), vec2( 1e-6 ) );
  float plazaTone = fract( sin( dot( floor( plazaQ ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  vec2 plazaD = abs( fract( plazaQ - 0.5 ) - 0.5 );
  vec2 plazaL = 1.0 - smoothstep( vec2( 0.0025 ), vec2( 0.0025 ) + plazaW * 1.25, plazaD );
  // Far off, where a slab is a few pixels, the joints go: they would only shimmer.
  plazaJoint = max( plazaL.x, plazaL.y ) * ( 1.0 - smoothstep( 0.05, 0.3, max( plazaW.x, plazaW.y ) ) );
  diffuseColor.rgb *= ( 0.965 + 0.06 * plazaTone ) * ( 1.0 - uPlazaGrid.w * plazaJoint );
#endif`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#ifdef USE_FOG
  // Polished: the nearer the line of sight lies to the floor, the more of what is low in the sky it gives back. A joint is matt.
  float plazaF = 0.04 + 0.96 * pow( 1.0 - clamp( normalize( - vAtmDir ).y, 0.0, 1.0 ), 5.0 );
  plazaF *= 0.6 * ( 1.0 - 0.7 * plazaJoint );
  outgoingLight = outgoingLight * ( 1.0 - plazaF ) + uPlazaSheen * plazaF;
#endif
#include <opaque_fragment>`,
      )
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
  // Its coverage, and its colour let down with it as the screen will show it: the finish develops what is in the
  // picture before the page is put behind it (post.tsx), and a floor merely multiplied by its coverage came out
  // lighter than either the floor or the page where it fades, as a bright rim.
  gl_FragColor = vec4( gl_FragColor.rgb * pow( plazaK, 2.2 ), plazaK );`,
      );
  };
  material.customProgramCacheKey = () => 'plaza-v1';
  return { material, fade, grid, cover, near, sheen };
}

/** The floor's colour and, over the mirrored buildings, its depth. `hold`: a ref to both, for the scene to hide once the land has covered them. */
export function PlazaFloor({ plaza, hold }: { plaza: Plaza; hold?: Ref<Group> }) {
  const geo = useMemo(
    () =>
      memo('plaza-sheet', () => {
        const g = new PlaneGeometry(900, 900);
        g.rotateX(-Math.PI / 2);
        return g;
      }),
    [],
  );
  const depth = useMemo(() => new MeshBasicMaterial({ colorWrite: false }), []);
  useEffect(() => () => depth.dispose(), [depth]);
  return (
    <group ref={hold} position-y={PLAZA_Y}>
      <mesh geometry={geo} material={plaza.material} renderOrder={PLAZA_ORDER.colour} frustumCulled={false} />
      <mesh geometry={geo} material={depth} renderOrder={PLAZA_ORDER.depth} frustumCulled={false} />
    </group>
  );
}
