import { CanvasTexture, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector2, type Material, type MeshStandardMaterialParameters } from 'three';
import { deckFinishes, shellFinishes, trimFinishes } from '../../data/build';
import { asphaltSet, concreteSet, gravelSet, renderSet, ribSet, soilSet, tile, timberSet } from './pbr';

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

/** Made on first use and kept. */
const once = <T>(make: () => T) => {
  let made: T | undefined;
  return () => (made === undefined ? (made = make()) : made);
};

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
  glassLit: once(() => std('#1d1915', 0.12, 0, { emissive: '#ffc887', emissiveIntensity: 2.1, emissiveMap: glowMap(), envMapIntensity: 1.4 })),
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
  /** Fascia, base recess, spandrels. */
  trim: std('#55585b', 0.7, 0.15),
  /** Module roof fascia: near-black painted metal, as the render. */
  fascia: std('#2f3236', 0.55, 0.35),
  /** Window and door frames. */
  frame: std('#f4f2ee', 0.42),
  /** Structural steel, handrails: dark powder coat. */
  steel: std('#2a2c2f', 0.42, 0.7),
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
  /** Measurement and highlight. */
  accent: std('#e2491d', 0.55),
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

const cache = new Map<string, MeshStandardMaterial>();
function cached(key: string, make: () => MeshStandardMaterial) {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

/** Shell body material for a finish colour: render over precast, as the client's render. */
export function shellMat(hex: string) {
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

/** Painted metal for fascia and frames in a trim finish. */
export function trimMat(hex: string) {
  return cached(`trim-${hex}`, () => std(hex, 0.5, 0.35));
}

/**
 * Material array for moduleGeometry(): shell, fascia, glass, frames, fittings.
 * `windows: 'dusk'` lights the glazing from inside.
 */
export function moduleMats(shellHex: string = shellFinishes[0].hex, windows: 'day' | 'dusk' = 'day', trimHex: string = trimFinishes[0].hex): Material[] {
  const key = `${shellHex}-${windows}-${trimHex}`;
  let set = moduleSets.get(key);
  if (!set) {
    set = [shellMat(shellHex), trimMat(trimHex), windows === 'dusk' ? mat.glassLit : mat.glass, mat.frame, mat.galv];
    moduleSets.set(key, set);
  }
  return set;
}
const moduleSets = new Map<string, Material[]>();

/** Translucent ghost for the configurator's placement preview. */
export const ghostMat = std('#ffffff', 0.6, 0, { transparent: true, opacity: 0.45, depthWrite: false });
export const ghostBad = std('#e2491d', 0.6, 0, { transparent: true, opacity: 0.35, depthWrite: false });
