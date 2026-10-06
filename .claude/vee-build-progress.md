# VEE.BUILD — progress

Last updated: 2026-10-06 (performance pass; the "What exists" list below predates the 2026-10-06 sections: configurator, delivery, site preparation, installation)

## Status

| Phase | State |
| --- | --- |
| 1 Audit | done |
| 2 Architecture | done |
| 3 Design system | done |
| 4 3D kit | done |
| 5 Hero · How it works · Building components | done |
| 6 Difference · Catalogue · Factory tour · Gallery · Contact | done |
| 7 Capsule · Prefab · Partnership · 404 | done |
| 8 Responsive pass | done at 390, 820 and 1440 wide (headless Edge) |
| 9 Performance pass | second pass done 2026-10-06 on the client laptop, see below and notes F2 |
| 10 Quality pass | first pass done, see "Not yet verified" |

`npm run check` → 0 errors. `npm run build` → 5 routes, sitemap, optimised images.

## What exists

- **Routes:** `/`, `/capsule/`, `/prefab/`, `/partnership/`, `404`.
- **Main page, 8 sections:** `overview` (hero film, 4 beats), `how-it-works`
  (film, 6 steps + footprint counter), `components` (film, 4 steps +
  interactive add-on tags), `difference`, `catalogue` (5 models, SVG
  isometric + plan), `factory` (film, 7 stations), `gallery`, `contact`.
- **3D:** `src/three/Stage.tsx` (the one Canvas), `kit/` (materials, geometry
  helpers, parts, four building types), `scenes/` (Hero, System, Components,
  Factory, Showcase).
- **Animation:** `src/film/` — `Film.tsx` (sticky shell, damped scroll
  progress, captions, DOM labels), `timeline.ts`, `systemTimeline.ts`,
  `componentsTimeline.ts`.
- **Forms:** `EnquiryForm.tsx` (contact + partnership variants), `prefill.ts`
  (catalogue → contact hand-off).
- **SEO:** per-page title/description/canonical, Open Graph, Organization
  JSON-LD, sitemap, robots.txt, `public/og.png` (`node scripts/og-image.mjs`).

## QA aids

- `?still` on any page: films snap to each step's settled pose, no fades,
  intro skipped. Same code path as `prefers-reduced-motion`.
- `?go=<section-id>:<0–1>` (dev server only): jump a film to a progress.
- `?q=0..3` pins the moving-frame resolution level (1, 0.8, 0.64, 0.5 of
  the canvas) so the adaptive fallback can be looked at on a fast machine.
- `?noboot` skips the boot screen.
- Dev server only: every stage canvas carries `canvas.__vee` (renderer,
  scene, camera, progress, `advance`) and `canvas.__veePost` (finish,
  quality level) for frame timing from the console.
- Screenshots and timings were taken with the installed Edge, headless, over
  the DevTools protocol; the scripts live outside the repo. The Claude
  browser pane does not draw frames while it is hidden, so it cannot be used
  to time anything.

## Performance (production build)

Measured 2026-10-06 on the client laptop: Core Ultra 5 125H, Intel Arc
integrated graphics, 1920 x 1200 at 150% scaling, on battery (the machine
swings between a fast and a throttled power state, roughly 3x apart), Edge
headless on the same GPU, 1280 x 720 CSS viewport at DPR 1.5. "Before" is
the tree as it stood that morning, built and measured the same way,
alternating runs.

| Measure | Before | After |
| --- | --- | --- |
| Hero, one moving frame (CPU + GPU) | 30-55 ms | 11-16 ms at full resolution |
| Hero, steady scroll at 1500 px/s | 21-23 fps, 58-69% of frames over 20 ms | 56 fps, 1-4% over 20 ms |
| How it works, same scroll | 45-48 fps | 55-58 fps |
| Main thread blocked during that scroll (three films) | 1.8-2.0 s | 0.45-0.5 s |
| Boot screen lifts | 5.0-6.1 s | 2.9-4.2 s |
| Longest single task before first picture | 2.2-2.3 s | 0.5-1.5 s |

What a moving hero frame costs now (about 12 ms at full resolution): 2x
multisampling 3.3, grass 1.7, sky 1.2, trees 1.0, ground 0.9, bloom 0.9,
shadow pass 0.5, everything else about 2.5. If a device cannot hold about
46 fps the moving picture drops resolution (notes F2); at four times the
pixels (3840 x 2160 canvas) the same laptop settled at level 2 and held
59 fps.

| Asset | Raw | Gzip | Loaded |
| --- | --- | --- | --- |
| three + R3F (two shared chunks) | 983 kB | 264 kB | async, after first paint |
| react-dom client | 209 kB | 64 kB | with first island |
| ambient occlusion pass | 31 kB | 8 kB | the first time a picture settles |
| each scene | 1-15 kB | 1-6 kB | when its section nears the viewport |
| CSS | 56 kB | — | render-blocking, one file |

No GLB, HDR or texture downloads: all geometry is procedural, the
environment is generated at runtime. One canvas mounts near the viewport at
a time; the others unmount. Frameloop is on demand.

## Not yet verified

- Real phones and tablets (only emulated viewports were checked).
- Safari and Firefox.
- Frame rate on GPUs slower than Intel Arc integrated, and on real phones.
  The adaptive resolution is there for them but has only been exercised by
  enlarging the canvas. Shadow map is 2048 on compact, 4096 otherwise.
- A real, visible browser window on the client laptop: timings above are
  from headless Edge on the same GPU.
- A screen-reader pass. Structure is in place (one h1 per page, labelled
  sections, labelled form fields, focus styles, skip link) but untested
  with NVDA / VoiceOver.
- Lighthouse / Core Web Vitals on a deployed build.
- Enquiry delivery: no endpoint is configured (notes A2), so only the
  validation and "cannot send yet" paths have been exercised.

## Known issues / next tasks

1. Launch blockers are client inputs: notes section A (contact details,
   form endpoint, photography, clean render, logo, domain).
2. Three.js chunks are 264 kB gzip because R3F registers the whole namespace.
   A hand-picked `extend()` catalogue would cut it; not done.
7. Entering each film still stalls for 100-180 ms once, while its scene
   mounts (new WebGL context, geometry, environment map). Mounting the next
   film during idle time would remove it; not done.
8. About 1.7-2.0 s of main-thread work remains before the first picture,
   most of it drawing the procedural textures. A worker, or shipping them
   as image files, would remove it.
9. `.claude/CLAUDE.md` "Design rules" still describe the first-day maquette
   look (no bloom, matte monochrome). The scenes have been photographic since
   2026-10-06; the rules file was not changed in the performance pass.
3. Tablet portrait hero has loose spacing between caption and button.
4. Shadow edge on the model base plates shows slight stippling at grazing
   angles.
5. Hero step captions are `<p>`, not headings, by design (h1 is the
   proposition line). Revisit if SEO wants the slogans as headings.
6. No git repository was initialised.
