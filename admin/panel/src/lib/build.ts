import { ADD_ON_NAMES, FOUNDATION_HEIGHTS, SHELL_SQFT, type BuildQuantities } from '@shared';

/** "2 × Shell A, 1 × Shell B · 500 sq.ft. · 2 floors". */
export function buildHeadline(q: BuildQuantities) {
  const shells = [q.shells.A && `${q.shells.A} × Shell A`, q.shells.B && `${q.shells.B} × Shell B`].filter(Boolean).join(', ') || 'No shells';
  const sqft = q.shells.A * SHELL_SQFT.A + q.shells.B * SHELL_SQFT.B;
  const floors = q.stairFloors + 1;
  return `${shells} · ${sqft} sq.ft. · ${floors === 1 ? 'one floor' : `${floors} floors`}`;
}

export const foundationLine = (q: BuildQuantities) => `${FOUNDATION_HEIGHTS[q.foundation.h]} mm, ${q.foundation.type === 'plinth' ? 'footings and L plinth' : 'footings only'}`;

/** The add-ons the build has, by the site's names. */
export function addOnList(q: BuildQuantities): string[] {
  const out: string[] = [];
  if (q.deckM2 > 0) out.push(`${ADD_ON_NAMES.deck} ${q.deckM2.toFixed(1)} m²`);
  if (q.posts > 0) out.push(`${q.posts} deck posts`);
  if (q.spandrelMetres > 0) out.push(ADD_ON_NAMES.spandrel);
  if (q.handrailMetres > 0) out.push(ADD_ON_NAMES.handrail);
  if (q.steps > 0) out.push(`${q.steps} × steps`);
  if (q.shades > 0) out.push(`${q.shades} shades`);
  if (q.roof.A + q.roof.B > 0) out.push(ADD_ON_NAMES.roof);
  if (q.solar.A + q.solar.B > 0) out.push(ADD_ON_NAMES.solar);
  return out;
}

/** A phone number as WhatsApp wants it: digits only, India's code added to a ten-digit number. */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) return `91${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
