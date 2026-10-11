/**
 * Indicative prices for the configurator (client, 2026-10-11: "introduce
 * tentative and reasonable prices for the houses, add-ons and other
 * components", shown with the area and kept up to date as the build
 * changes).
 *
 * CONFIRM: every figure below is VEE.BUILD's to set. None was supplied; they
 * are our estimates for a precast insulated concrete system in India in
 * 2026, set so that a finished single-shell home lands at about ₹2,100 to
 * ₹2,500 a square foot before delivery, in line with factory-built homes of
 * this kind. No figure from any other maker's price list is used (notes D,
 * "Pricing"; N5). Indian rupees, ex-works, excluding GST.
 */
export const pricing = {
  currency: 'INR',
  locale: 'en-IN',
  /** A finished shell: steel frame, insulated panels, micro concrete, the standard door and windows, the chosen finish. */
  shell: { A: 420_000, B: 245_000 },
  /** One precast plug footing, by height (300, 600, 900 mm). A combined footing under two or more shells costs this much more. */
  footing: [7_500, 9_500, 12_000],
  combined: 0.6,
  /** L plinth, a metre of it, by height. */
  plinth: [1_600, 2_100, 2_700],
  /** Deck platform, a square metre: frame and boards. */
  deck: 4_500,
  /** A deck post with its jack pier. */
  post: 1_900,
  /** Spandrel, a metre. */
  spandrel: 1_400,
  /** Handrail, a metre: on the deck's edges and round open roofs. */
  handrail: 3_200,
  /** A flight of steps with its jack piers. */
  steps: 16_000,
  /** A window or door shade. */
  shade: 12_500,
  /** A sloped roof over one shell. */
  roof: { A: 48_000, B: 27_000 },
  /** A roof solar array over one shell: about 3.3 kWp on a Shell A, 1.6 on a Shell B, inverter included. */
  solar: { A: 165_000, B: 90_000 },
  /** Upper floors: a square metre of gallery with its rail, and the outer staircase, for each floor it serves. */
  gallery: 6_000,
  stair: 120_000,
  /** Delivery within 100 km, the crane and placing, for each shell. */
  delivery: 38_000,
} as const;

export const pricingNote = 'Indicative estimate in Indian rupees, ex-works, excluding GST. Delivery within 100 km. Confirm with VEE.BUILD.';
