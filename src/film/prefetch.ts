/**
 * Hybrid loading. The hero loads eagerly (its island hydrates on load and
 * the boot screen waits for its first frame). The other films hydrate when
 * the page is idle, and each 3D scene mounts as its section nears the
 * viewport; once the hero is up, this fetches the scene modules during idle
 * time, in page order, so a section's code is ready before the visitor
 * reaches it. A scene module may export `prepare`, a list of small jobs
 * (building geometry it will need); each is run in an idle slot of its own.
 * Skipped when the visitor asks to save data.
 */

const queue: (() => Promise<unknown>)[] = [
  () => import('../three/kit/materials'),
  () => import('../components/sections/HowItWorks'),
  () => import('../three/scenes/SystemScene'),
  () => import('../components/sections/Components'),
  () => import('../three/scenes/ComponentsScene'),
  () => import('../components/build/Configurator'),
  () => import('../three/scenes/BuildScene'),
  () => import('../three/scenes/RevealScene'),
  () => import('../components/sections/FactoryTour'),
  () => import('../three/scenes/FactoryScene'),
  () => import('../components/sections/Installation'),
  () => import('../three/scenes/InstallScene'),
];

let started = false;

export function prefetchScenes() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return;
  const idle: (cb: () => void) => void =
    'requestIdleCallback' in window ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 }) : (cb) => window.setTimeout(cb, 300);
  let i = 0;
  const next = () => {
    if (i >= queue.length) return;
    const load = queue[i++];
    idle(() => {
      load()
        .then((m) => {
          const jobs = (m as { prepare?: (() => void)[] } | undefined)?.prepare;
          if (Array.isArray(jobs)) queue.splice(i, 0, ...jobs.map((job) => () => Promise.resolve().then(job)));
        })
        .catch(() => {})
        .finally(next);
    });
  };
  next();
}
