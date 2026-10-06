/** Small, dependency-free helpers for scroll-driven choreography. */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => t * t * (3 - 2 * t),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  in: (t: number) => t * t * t,
  /** Settles with a very small overshoot, like a part seating. */
  seat: (t: number) => {
    const c = 1.2;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

export type Ease = (t: number) => number;

/** Progress of p through the window [a, b], eased. 0 before, 1 after. */
export function win(p: number, a: number, b: number, e: Ease = ease.inOut): number {
  return e(clamp01((p - a) / (b - a)));
}

/** 1 while p is inside [a, b], with eased edges of width `edge`. */
export function hold(p: number, a: number, b: number, edge = 0.02): number {
  return win(p, a - edge, a) * (1 - win(p, b, b + edge));
}

/**
 * Local progress for item i of n when a sequence of overlapping moves is
 * driven by one t. overlap 0 = strictly one after another, 1 = all together.
 */
export function stagger(t: number, i: number, n: number, overlap = 0.5): number {
  if (n <= 1) return clamp01(t);
  const step = 1 - overlap;
  const w = 1 / (1 + (n - 1) * step);
  return clamp01((t - i * step * w) / w);
}

export interface CameraKey {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

const _out = { pos: [0, 0, 0] as [number, number, number], look: [0, 0, 0] as [number, number, number] };

/** Interpolates a camera through keys with an ease in and out of each key. */
export function sampleCamera(keys: CameraKey[], p: number) {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t = b.p === a.p ? 0 : ease.inOutCubic(clamp01((p - a.p) / (b.p - a.p)));
  for (let k = 0; k < 3; k++) {
    _out.pos[k] = lerp(a.pos[k], b.pos[k], t);
    _out.look[k] = lerp(a.look[k], b.look[k], t);
  }
  return _out;
}

/** Piecewise scalar track: [[p, value], …], eased between keys, held outside. */
export function track(p: number, keys: readonly (readonly [number, number])[], e: Ease = ease.inOut): number {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb] = keys[i + 1];
    if (p <= b) return lerp(va, vb, e(clamp01((p - a) / (b - a))));
  }
  return keys[keys.length - 1][1];
}
