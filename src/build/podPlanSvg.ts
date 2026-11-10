/**
 * The pod's floor plan as an SVG drawing, for a length and a layout: the
 * plans on the POD page (PodPlans) and the brochures
 * (scripts/pod-brochure.mjs) draw it from here, from the same plan as the
 * 3D rooms (kit/podPlan.ts, podInterior), so the drawing and the model
 * never disagree. In metres: x along the pod from its head end, y across
 * it with the front (the door) at the foot. Its colours are classes, set by
 * whoever shows it (sections.css `.plan`, the brochure's own styles).
 *
 * `detail`: the room names and the overall dimensions, for the drawing seen
 * large (View plan, the brochure); without, the plan alone, as the page
 * shows it small.
 */
import { podSection } from '../data/pod';
import { POD, POD_CORE, bayAt, isWindowBay, podBalcony, podBays, podInterior, podOutline, podZones, type PodLayout } from '../three/kit/podPlan';

const { W, end: E, door: D, bay: B, chamfer: C, jamb: JAMB, balcony: BAL } = POD;
const HW = W / 2;
/** Where an end module's flat side begins, past its rounded corner (kit/pod.tsx, ROUND_T). */
const XS = C + 0.45 * Math.tan(Math.PI / 8);
const WALL = 0.13;

const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
const poly = (pts: [number, number][]) => pts.map(([x, z]) => `${f(x)},${f(z)}`).join(' ');
const rect = (x0: number, z0: number, x1: number, z1: number, cls: string) =>
  `<rect class="${cls}" x="${f(Math.min(x0, x1))}" y="${f(Math.min(z0, z1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(z1 - z0))}"/>`;

const HEAD_NAME = { bed: 'Bedroom', office: 'Office', kitchen: 'Kitchen · dining' } as const;
const FAR_NAME = { lounge: 'Lounge', kitchen: 'Kitchen · lounge', bedLounge: 'Bedroom · lounge' } as const;

export function podPlanSvg(L: number, layout: PodLayout, detail = false, title = ''): string {
  const out: string[] = [];
  const balcony = podBalcony(L);
  // Walls: the outline, and the floor inside it.
  out.push(`<polygon class="pw" points="${poly(podOutline(L, 0))}"/>`);
  out.push(`<polygon class="pr" points="${poly(podOutline(L, WALL))}"/>`);
  // The glazed ends: the glass round each end (the far end of the 12 m is its balcony).
  const ring = podOutline(L, 0.05);
  // The ring runs round the head end first, then back along the far side and round the far end: each end's run is in order.
  out.push(`<polyline class="pg" points="${poly(ring.filter(([x]) => x <= XS))}"/>`);
  const tail = ring.filter(([x]) => x >= L - XS - 0.01);
  if (!balcony) out.push(`<polyline class="pg" points="${poly(tail)}"/>`);
  else {
    out.push(`<polyline class="pb" points="${poly(tail.filter(([x]) => x >= L - BAL))}"/>`);
    out.push(rect(L - BAL - 0.02, -HW + WALL, L - BAL + 0.02, HW - WALL, 'pg2'));
  }
  // The windows in the sides: each end module's, and the middle bays'.
  const { w } = POD.win;
  for (const s of [1, -1]) {
    const zo = s * HW;
    const zi = s * (HW - WALL);
    out.push(rect(XS, zo, E - JAMB, zi, 'pg2'));
    out.push(rect(L - (E - JAMB), zo, balcony ? L - BAL - 0.15 : L - XS, zi, 'pg2'));
    for (let k = 0; k < podBays(L); k++) if (isWindowBay(k)) out.push(rect(bayAt(k) + (B - w) / 2, zo, bayAt(k) + (B + w) / 2, zi, 'pg2'));
  }
  // The frosted window behind the door bay; the door, opening out onto its steps.
  const { w: qw } = POD.frost;
  out.push(rect(E + (D - qw) / 2, -HW, E + (D + qw) / 2, -HW + WALL, 'pf'));
  const d0 = E + 0.06;
  const dw = D - 0.12;
  out.push(rect(d0, HW - WALL - 0.01, d0 + dw, HW + 0.01, 'pr'));
  out.push(`<path class="pd" d="M ${f(d0)} ${f(HW)} L ${f(d0)} ${f(HW + dw)} A ${f(dw)} ${f(dw)} 0 0 0 ${f(d0 + dw)} ${f(HW)}"/>`);
  const { going, w: sw } = POD.steps;
  for (let i = 0; i < 3; i++) out.push(rect(E + D / 2 - sw / 2, HW + (i === 0 ? 0 : 0.52 + (i - 1) * going), E + D / 2 + sw / 2, HW + 0.52 + i * going, 'ps'));
  // The core's partitions: the bathroom at the back, the entry in front.
  const zb = -HW + WALL;
  const zEnd = HW - WALL - 0.95;
  const zf = -HW + 1.75;
  out.push(rect(E - 0.04, zb, E + 0.04, zEnd, 'pw'));
  out.push(rect(E + POD_CORE - 0.04, zb, E + POD_CORE + 0.04, zEnd, 'pw'));
  out.push(rect(E, zf - 0.04, E + 1.0, zf + 0.04, 'pw'));
  out.push(rect(E + 1.75, zf - 0.04, E + POD_CORE, zf + 0.04, 'pw'));
  // The furniture, as the rooms in 3D have it; the core's fixtures.
  for (const [x0, , z0, x1, , z1, finish] of podInterior(L, L, layout).pieces) {
    if (finish === 8 || finish === 9 || finish === 10) continue;
    if (Math.abs(z1 - z0) < 0.03 || Math.abs(x1 - x0) < 0.03) continue;
    out.push(rect(x0, z0, x1, z1, finish === 2 || finish === 3 ? 'pl' : 'pu'));
  }
  out.push(rect(E + 0.08, zb, E + 0.98, zb + 0.9, 'pu'));
  out.push(rect(E + 1.15, zb, E + 1.63, zb + 0.65, 'pu'));
  out.push(rect(E + 1.78, zb, E + 2.3, zb + 0.48, 'pu'));
  out.push(rect(E + 1.7, -HW + 1.87, E + 2.3, -HW + 2.57, 'pu'));

  let top = -HW - 0.2;
  let bottom = HW + 0.52 + 2 * going + 0.15;
  const left = -0.25;
  const right = L + 0.25;
  if (detail) {
    const [hz, fz] = podZones(L, layout);
    const label = (x: number, z: number, t: string) => out.push(`<text class="pt" x="${f(x)}" y="${f(z)}">${t}</text>`);
    label(E / 2 + 0.2, HW - 0.55, HEAD_NAME[hz]);
    label(E + 1.0, -0.15, 'Bath');
    label(E + 1.2, HW - 0.5, 'Entry');
    const farEnd = balcony ? L - BAL : L;
    label((E + POD_CORE + farEnd) / 2, HW - 0.55, FAR_NAME[fz]);
    if (balcony) label(L - BAL / 2, HW - 0.55, 'Balcony');
    // The overall dimensions, over it and to its left.
    const dz = -HW - 0.42;
    out.push(`<path class="pm" d="M 0 ${f(dz)} H ${f(L)} M 0 ${f(dz - 0.1)} V ${f(dz + 0.1)} M ${f(L)} ${f(dz - 0.1)} V ${f(dz + 0.1)}"/>`);
    out.push(`<text class="pt pt--dim" x="${f(L / 2)}" y="${f(dz - 0.12)}">${L} m</text>`);
    const dx = -0.42;
    out.push(`<path class="pm" d="M ${f(dx)} ${f(-HW)} V ${f(HW)} M ${f(dx - 0.1)} ${f(-HW)} H ${f(dx + 0.1)} M ${f(dx - 0.1)} ${f(HW)} H ${f(dx + 0.1)}"/>`);
    // The width as the plans state it (data/pod.ts, podSection), over the drawing's own.
    out.push(`<text class="pt pt--dim" x="${f(dx - 0.14)}" y="0" transform="rotate(-90 ${f(dx - 0.14)} 0)">${podSection.width} m</text>`);
    top = -HW - 0.75;
    bottom += 0.1;
  }
  const vb = detail ? `${f(-0.85)} ${f(top)} ${f(L + 1.1)} ${f(bottom - top)}` : `${f(left)} ${f(top)} ${f(right - left)} ${f(bottom - top)}`;
  const t = title ? `<title>${title}</title>` : '';
  return `<svg class="plan${detail ? ' plan--detail' : ''}" viewBox="${vb}" role="img" xmlns="http://www.w3.org/2000/svg">${t}${out.join('')}</svg>`;
}
