/**
 * Holding the page still while a short film plays by itself.
 *
 * Asked for by the client (2026-10-10) for the truck's drive: it "should
 * behave like a short loading animation rather than a conventional
 * scroll-driven sequence: temporarily control scrolling while the animation
 * plays, restore normal scrolling automatically when it finishes". It is
 * the one place on the site where a visitor's scroll is taken, so it is
 * taken for as short a time as can be, and it cannot be kept:
 *
 * - while it holds, the wheel, a finger and the scrolling keys do nothing,
 *   and the page is put back if anything else moves it (a scrollbar, the
 *   momentum of a flick that began before);
 * - it lets go by itself after `ms`, however the film fared (a tab put in
 *   the background, a frame loop that never ran), and at once on Escape,
 *   when the page is hidden, and when it is left;
 * - only one hold exists at a time, and letting go twice is harmless.
 */

const KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
let current: (() => void) | null = null;

/** Holds the page at scroll position `y` for at most `ms`. Returns the function that lets it go; `onEnd` is called once, whoever lets go. */
export function holdPage(y: number, ms: number, onEnd?: () => void): () => void {
  current?.();
  const root = document.documentElement;
  let held = true;

  const stop = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return release();
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (KEYS.has(e.key)) e.preventDefault();
  };
  const back = () => {
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: 'instant' });
  };
  const hidden = () => {
    if (document.visibilityState === 'hidden') release();
  };

  // Where scrollbars take no room (touch screens, overlay scrollbars) the page itself is stopped too: that is what ends a flick's momentum.
  const overlay = window.innerWidth - root.clientWidth === 0;
  const was = root.style.overflow;
  if (overlay) root.style.overflow = 'hidden';

  window.addEventListener('wheel', stop, { passive: false, capture: true });
  window.addEventListener('touchmove', stop, { passive: false, capture: true });
  window.addEventListener('keydown', key, { capture: true });
  window.addEventListener('scroll', back, { passive: true });
  window.addEventListener('pagehide', release);
  document.addEventListener('visibilitychange', hidden);
  const timer = window.setTimeout(release, ms);

  function release() {
    if (!held) return;
    held = false;
    window.clearTimeout(timer);
    window.removeEventListener('wheel', stop, { capture: true });
    window.removeEventListener('touchmove', stop, { capture: true });
    window.removeEventListener('keydown', key, { capture: true });
    window.removeEventListener('scroll', back);
    window.removeEventListener('pagehide', release);
    document.removeEventListener('visibilitychange', hidden);
    if (overlay) root.style.overflow = was;
    if (current === release) current = null;
    onEnd?.();
  }
  current = release;
  return release;
}
