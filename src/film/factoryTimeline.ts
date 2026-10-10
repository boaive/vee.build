/**
 * Choreography of the factory film, as progress through it (0 to 1). Kept
 * apart from the scene so that the captions (data/narrative.ts) begin and
 * settle on the same numbers. No three.js in here.
 *
 * The order is the client's (2026-10-10): the structural frame, with its
 * hooks; the insulation panels, walls and top; the formwork; the concrete,
 * cast as walls; de-shuttering; doors and windows; the spray finish, in the
 * same bay; then the crane lifts the shell by its four hooks onto the
 * truck, lets go of it once it is down, and the truck leaves.
 */
type Span = readonly [number, number];

export const FACTORY = {
  /** The four adjustable piers take their places and are screwed level. */
  piers: [0.025, 0.07] as Span,
  frame: { floor: [0.06, 0.105] as Span, columns: [0.095, 0.14] as Span, top: [0.13, 0.162] as Span, hooks: [0.155, 0.18] as Span },
  panels: { floor: [0.195, 0.225] as Span, walls: [0.215, 0.285] as Span, roof: [0.285, 0.32] as Span },
  form: { close: [0.34, 0.398] as Span, lock: [0.394, 0.412] as Span },
  pour: { hose: [0.428, 0.456] as Span, walls: [0.456, 0.505] as Span, roof: [0.5, 0.545] as Span, away: [0.55, 0.57] as Span },
  strip: { unlock: [0.58, 0.592] as Span, off: [0.592, 0.668] as Span },
  fit: [0.684, 0.74] as Span,
  spray: { in: [0.75, 0.768] as Span, pass: [0.768, 0.826] as Span, out: [0.826, 0.844] as Span },
  truck: { in: [0.838, 0.872] as Span, go: [0.974, 1] as Span },
  lift: { reach: [0.848, 0.882] as Span, up: [0.886, 0.91] as Span, over: [0.91, 0.94] as Span, down: [0.94, 0.958] as Span, release: [0.96, 0.974] as Span },
} as const;

/** Where each caption begins, and where its picture is settled. */
export const FACTORY_STEPS = {
  frame: { at: 0, pose: 0.18 },
  panels: { at: 0.19, pose: 0.32 },
  formwork: { at: 0.332, pose: 0.412 },
  concreting: { at: 0.422, pose: 0.545 },
  deshutter: { at: 0.575, pose: 0.668 },
  joinery: { at: 0.678, pose: 0.742 },
  spray: { at: 0.747, pose: 0.845 },
  dispatch: { at: 0.85, pose: 0.972 },
} as const;
