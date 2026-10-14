/**
 * The site's layouts by device (the mobile and tablet round, 2026-10-14).
 * Desktop is everything these do not match, and it is not touched by them.
 *
 * - compact: a phone, a narrow window, or a tablet held upright. The films
 *   put their words at the top of the screen and the building under them,
 *   large (film.css, the compact block; Stage, `band`). Up to 860 px wide
 *   for any pointer, as before; up to 1100 px for a touch screen held
 *   upright (an iPad Pro is 1024 wide that way).
 * - touch: a tablet on its side. The desktop's layout, with touch-sized
 *   controls and nothing that needs a pointer to hover.
 *
 * film.css, base.css, sections.css and build.css write the same queries out
 * in full: keep them the same as these.
 */
export const COMPACT_QUERY = '(max-width: 860px), (max-width: 1100px) and (orientation: portrait) and (hover: none) and (pointer: coarse)';
export const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';

/** A short screen held sideways (a phone on its side): the compact films put their words beside the picture. */
export const SIDEWAYS_QUERY = '(max-width: 860px) and (max-height: 520px) and (orientation: landscape)';
