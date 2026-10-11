/**
 * Lighting and atmosphere presets. A scene picks one look; Stage applies it
 * (sky, haze, lights, environment, grade) so every scene in a mood matches.
 *
 * Outdoor looks use the physical sky (kit/sky.ts): the sun's position sets
 * the sky, the light and the haze together. Studio looks have no sky and a
 * plain backdrop colour.
 */
import type { Grade } from './post';
import type { SkyParams } from './sky';

export type V3 = [number, number, number];

/** Unit vector toward the sun: azimuth in degrees from +z toward +x, elevation in degrees. */
export function sunAt(azimuth: number, elevation: number): V3 {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
}

export interface Look {
  sky: SkyParams | null;
  /** Linear haze distances. Outdoors its colour comes from the sky; studios use `color`. */
  fog: { color: string; near: number; far: number; thin?: number } | null;
  hemi: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number; dir: V3 };
  /**
   * Where the sun stands in the sky, where the key light is not the sun
   * itself: a set lit like a studio under a real sky's light and
   * reflections (the hero's opening card). Left out: `sun.dir`.
   */
  skySun?: V3;
  fill: { color: string; intensity: number; dir: V3 };
  /** Image-based light from the sky (or studio room). */
  env: number;
  exposure: number;
  /** For shadow-only grounds. */
  shadow: { color: string; opacity: number };
  /** Glazing: reflective by day, warm and lit at dusk. */
  windows: 'day' | 'dusk';
  /** Vegetation palette. */
  flora: 'day' | 'dusk' | 'pale' | 'gold';
  /** Colour of open ground, for stages that draw it. */
  land?: string;
  grade?: Grade;
  /** Warm lamps inside and at the doors (dusk). */
  lamps?: number;
}

const GRADE_WARM: Grade = {
  vignette: 0.26,
  saturation: 1.08,
  contrast: 1.06,
  shadows: [0.96, 0.97, 1.04],
  highlights: [1.05, 1.0, 0.92],
  grain: 0.022,
  aberration: 0.0018,
};

const GRADE_DAY: Grade = {
  vignette: 0.2,
  saturation: 1.05,
  contrast: 1.05,
  shadows: [0.97, 0.99, 1.03],
  highlights: [1.02, 1.0, 0.97],
  grain: 0.018,
  aberration: 0.0014,
};

const GRADE_DUSK: Grade = {
  vignette: 0.3,
  saturation: 1.1,
  contrast: 1.07,
  shadows: [0.94, 0.97, 1.08],
  highlights: [1.06, 0.99, 0.9],
  grain: 0.026,
  aberration: 0.002,
};

const GRADE_STUDIO: Grade = {
  vignette: 0.22,
  saturation: 1.02,
  contrast: 1.04,
  shadows: [1, 1, 1.02],
  highlights: [1.01, 1, 0.99],
  grain: 0.014,
  aberration: 0.0008,
};

/** The farmhouse's sky, and where its sun stands: shared with the opening card, which is lit by it before the land is there. */
const SUNSET_SKY: SkyParams = {
  turbidity: 3.4,
  rayleigh: 3.6,
  mie: 0.002,
  mieG: 0.96,
  intensity: 5,
  compress: 0.8,
  disc: 2.2,
  ground: '#3e3527',
  tint: [1.02, 0.86, 1.1],
  clouds: { coverage: 0.46, density: 0.8, scale: 1, elevation: 0.62, offset: [0.18, 0.4], light: 7 },
};
const SUNSET_SUN = sunAt(-132, 3.2);
const SUNSET_FOG = { color: '#e9a37a', near: 140, far: 2600, thin: 0.85 };

export const LOOKS = {
  /*
   * The farmhouse: a warm sunset. The sun sits low, left of the house as
   * the hero frames it (azimuth chosen against the hero camera).
   */
  sunset: {
    sky: SUNSET_SKY,
    fog: SUNSET_FOG,
    hemi: { sky: '#8f86a8', ground: '#5d4a32', intensity: 0.18 },
    sun: { color: '#ffb46e', intensity: 3.6, dir: SUNSET_SUN },
    fill: { color: '#ffc9a0', intensity: 0.32, dir: [0.55, 0.35, 0.76] },
    env: 0.55,
    exposure: 0.95,
    shadow: { color: '#2b1610', opacity: 0.36 },
    windows: 'dusk',
    flora: 'gold',
    land: '#7d7a4c',
    grade: GRADE_WARM,
    lamps: 1,
  },
  /* Capsule pods: blue hour, interiors lit. */
  blueHour: {
    sky: {
      turbidity: 2.5,
      rayleigh: 4,
      mie: 0.003,
      mieG: 0.9,
      intensity: 60,
      compress: 0.5,
      disc: 0,
      ground: '#141820',
      twilight: { amount: 0.92, zenith: [0.025, 0.05, 0.16], band: [0.11, 0.1, 0.2], glow: [0.95, 0.36, 0.12] },
      clouds: { coverage: 0.3, density: 0.45, scale: 0.9, elevation: 0.55, offset: [0.6, 0.1], light: 0.6 },
    },
    fog: { color: '#2c3148', near: 40, far: 520, thin: 0.8 },
    hemi: { sky: '#6a7bab', ground: '#1d2028', intensity: 0.32 },
    sun: { color: '#ff9f6a', intensity: 0.25, dir: sunAt(178, -1.8) },
    fill: { color: '#7d93cc', intensity: 0.35, dir: [0.5, 0.6, 0.62] },
    env: 1.25,
    exposure: 1.05,
    shadow: { color: '#05070b', opacity: 0.4 },
    windows: 'dusk',
    flora: 'dusk',
    land: '#2e3530',
    grade: GRADE_DUSK,
    lamps: 1.4,
  },
  /* Workforce housing: clean early morning. */
  morning: {
    sky: {
      turbidity: 4,
      rayleigh: 1.5,
      mie: 0.0045,
      mieG: 0.8,
      intensity: 0.85,
      compress: 0.05,
      disc: 0,
      ground: '#4e4a3a',
      clouds: { coverage: 0.3, density: 0.5, scale: 1.1, elevation: 0.5, offset: [2.1, 0.7] },
    },
    fog: { color: '#d9dfe2', near: 60, far: 700, thin: 0.8 },
    hemi: { sky: '#bcd2ea', ground: '#6b6450', intensity: 0.2 },
    sun: { color: '#ffe2bd', intensity: 3.2, dir: sunAt(32, 15) },
    fill: { color: '#cfe0f2', intensity: 0.2, dir: [-0.6, 0.4, -0.6] },
    env: 0.75,
    exposure: 0.95,
    shadow: { color: '#2b2620', opacity: 0.3 },
    windows: 'day',
    flora: 'day',
    land: '#80845a',
    grade: GRADE_DAY,
  },
  /* Institutional: bright day, a few clouds. */
  day: {
    sky: {
      turbidity: 3,
      rayleigh: 1.2,
      mie: 0.004,
      mieG: 0.8,
      intensity: 0.42,
      compress: 0.02,
      disc: 0,
      ground: '#55503f',
      clouds: { coverage: 0.34, density: 0.55, scale: 1.25, elevation: 0.45, offset: [5.3, 1.9] },
    },
    fog: { color: '#cfd9e2', near: 80, far: 900, thin: 0.8 },
    hemi: { sky: '#cfe0f0', ground: '#7a705a', intensity: 0.18 },
    sun: { color: '#fff3e2', intensity: 3.4, dir: sunAt(-38, 40) },
    fill: { color: '#d6e4f2', intensity: 0.16, dir: [0.7, 0.4, -0.6] },
    env: 0.8,
    exposure: 0.9,
    shadow: { color: '#2b2620', opacity: 0.28 },
    windows: 'day',
    flora: 'day',
    land: '#8b8a63',
    grade: GRADE_DAY,
  },
  /* The installation and delivery: a plot in a meadow at golden hour. */
  evening: {
    sky: {
      turbidity: 5.5,
      rayleigh: 1.9,
      mie: 0.005,
      mieG: 0.8,
      intensity: 0.42,
      compress: 0.08,
      disc: 0,
      ground: '#4a4231',
      clouds: { coverage: 0.32, density: 0.5, scale: 1, elevation: 0.55, offset: [3.4, 2.2] },
    },
    fog: { color: '#e8c39b', near: 60, far: 640, thin: 0.8 },
    hemi: { sky: '#b9c4d8', ground: '#5f5a3f', intensity: 0.18 },
    sun: { color: '#ffc58c', intensity: 3.4, dir: sunAt(-62, 9) },
    fill: { color: '#cfdcea', intensity: 0.2, dir: [0.6, 0.5, -0.6] },
    env: 0.7,
    exposure: 0.95,
    shadow: { color: '#3b2a1c', opacity: 0.32 },
    windows: 'dusk',
    flora: 'gold',
    land: '#7e7e52',
    grade: GRADE_WARM,
    lamps: 0.6,
  },
  /* The factory: an open yard under a clear sky (brief, 6). */
  clear: {
    sky: {
      turbidity: 3.2,
      rayleigh: 1.2,
      mie: 0.004,
      mieG: 0.8,
      intensity: 0.38,
      compress: 0.02,
      disc: 0,
      ground: '#5a5444',
      clouds: { coverage: 0.28, density: 0.5, scale: 1.2, elevation: 0.45, offset: [7.1, 3.3] },
    },
    fog: { color: '#d6dde2', near: 120, far: 900, thin: 0.8 },
    hemi: { sky: '#cfe0f0', ground: '#7a705a', intensity: 0.2 },
    sun: { color: '#fff1dc', intensity: 3.3, dir: sunAt(28, 48) },
    fill: { color: '#d6e4f2', intensity: 0.16, dir: [0.7, 0.4, -0.6] },
    env: 0.8,
    exposure: 0.9,
    shadow: { color: '#2b2620', opacity: 0.26 },
    windows: 'day',
    flora: 'day',
    land: '#8d8a68',
    grade: GRADE_DAY,
  },
  /* The configurator: soft morning on an open plot. */
  site: {
    sky: {
      turbidity: 3.6,
      rayleigh: 1.4,
      mie: 0.0045,
      mieG: 0.8,
      intensity: 0.5,
      compress: 0.03,
      disc: 0,
      ground: '#55503f',
      clouds: { coverage: 0.26, density: 0.45, scale: 1.2, elevation: 0.45, offset: [9.2, 4.4] },
    },
    fog: { color: '#d8dee2', near: 90, far: 700, thin: 0.8 },
    hemi: { sky: '#c2d6ea', ground: '#7a705a', intensity: 0.2 },
    sun: { color: '#fff0dc', intensity: 3.2, dir: sunAt(-40, 30) },
    fill: { color: '#d6e4f2', intensity: 0.2, dir: [0.7, 0.4, -0.6] },
    env: 0.8,
    exposure: 0.95,
    shadow: { color: '#3b2a1c', opacity: 0.28 },
    windows: 'day',
    flora: 'day',
    land: '#88875f',
    grade: GRADE_DAY,
  },
  /*
   * The hero's opening card (client, 2026-10-11, second brief: "realistic,
   * not like how we have now; for colour keep whatever is in the hero
   * sections, not the white one"). The three stand on a polished floor in
   * late, warm light: a key from in front and to the left, on their fronts,
   * high enough that the house's shadow stops short of the capsule behind
   * it and the capsule's short of the block; a soft fill from the right for
   * the ends they turn to the camera; and the farmhouse's own sunset in
   * every reflection (its sky is this look's too, the sun in it where the
   * farmhouse has it: `skySun`), let down so the floor stays pale and the
   * names on it can be read. The sky itself is not drawn until the land
   * comes in, when the scene goes over to the sunset (Stage, mixLook);
   * before that the page's warm shade stands behind (film.css).
   */
  card: {
    sky: SUNSET_SKY,
    skySun: SUNSET_SUN,
    fog: SUNSET_FOG,
    hemi: { sky: '#fff6e8', ground: '#eadcc6', intensity: 0.7 },
    sun: { color: '#ffd6a8', intensity: 2.3, dir: sunAt(-58, 31) },
    fill: { color: '#f0e8ee', intensity: 0.34, dir: [0.5, 0.36, 0.78] },
    env: 0.16,
    exposure: 1,
    shadow: { color: '#4a2c1a', opacity: 0.5 },
    windows: 'dusk',
    flora: 'gold',
    land: '#7d7a4c',
    grade: {
      vignette: 0.12,
      saturation: 1.06,
      contrast: 1.05,
      shadows: [0.98, 0.98, 1.03],
      highlights: [1.04, 1.0, 0.95],
      grain: 0.014,
      aberration: 0.0008,
    },
    lamps: 1,
  },
  studioDark: {
    sky: null,
    fog: { color: '#0a0b0d', near: 26, far: 70 },
    hemi: { sky: '#a8b2c0', ground: '#0a0b0d', intensity: 0.42 },
    sun: { color: '#fff4e6', intensity: 2.6, dir: [-0.45, 0.85, 0.5] },
    fill: { color: '#9fb6d6', intensity: 1.1, dir: [0.65, 0.35, -0.75] },
    env: 0.55,
    exposure: 1,
    shadow: { color: '#000000', opacity: 0.55 },
    windows: 'dusk',
    flora: 'dusk',
    grade: GRADE_STUDIO,
  },
  studioLight: {
    sky: null,
    fog: { color: '#f2f0eb', near: 45, far: 140 },
    hemi: { sky: '#ffffff', ground: '#c9c5bc', intensity: 0.5 },
    sun: { color: '#fffaf3', intensity: 2.3, dir: [-0.5, 0.8, 0.6] },
    fill: { color: '#dfe8f2', intensity: 0.35, dir: [0.7, 0.4, -0.6] },
    env: 0.38,
    exposure: 1,
    shadow: { color: '#2b2620', opacity: 0.22 },
    windows: 'day',
    flora: 'pale',
    grade: GRADE_STUDIO,
  },
} satisfies Record<string, Look>;

export type LookName = keyof typeof LOOKS;
