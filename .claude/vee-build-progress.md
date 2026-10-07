# VEE.BUILD — progress

Last updated: 2026-10-07 (second day of the performance pass, notes F3; "What exists" brought up to the page as it stands)

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
| 9 Performance pass | done 2026-10-06 and 2026-10-07 on the client laptop, see "Performance" below and notes F2, F3 |
| 10 Quality pass | first pass done, see "Not yet verified" |

`npm run check` → 0 errors. `npm run build` → 5 routes, sitemap, optimised images.

## What exists

- **Routes:** `/`, `/capsule/`, `/prefab/`, `/partnership/`, `404`.
- **Main page, 14 sections, in this order:** `overview` (hero film, four
  sets: modular home, capsule pods, workforce housing, institutional campus),
  `how-it-works` (film, 6 steps + footprint counter), `components` (film,
  4 steps + interactive add-on tags), `difference`, `configure` (the
  configurator, `src/components/build/Configurator.tsx`), `your-house`
  (film), `factory` (film, 7 stations), `delivery`, `site`,
  `installation` (film), `build-yours`, `catalogue` (5 models, SVG
  isometric + plan), `gallery`, `contact`. Six films and the configurator
  have a 3D stage; so do the capsule and prefab pages (`Showcase.tsx`).
- **3D:** `src/three/Stage.tsx` (the one Canvas: lights, the sky drawn
  behind the scene, shadow-map bookkeeping), `kit/` (materials, geometry,
  parts, buildings, house, modelhome, landscape, sets, env, sky, looks,
  atmosphere, textures, pbr, machines, and `post.tsx`, the finish),
  `scenes/` (Hero, System, Components, Reveal, Factory, Install, Build,
  Showcase).
- **Animation:** `src/film/` — `Film.tsx` (sticky shell, damped scroll
  progress, captions, DOM labels), `progress.ts`, `prefetch.ts`,
  `timeline.ts`, `systemTimeline.ts`, `componentsTimeline.ts`.
- **Forms:** `EnquiryForm.tsx` (contact + partnership variants), `prefill.ts`
  (catalogue → contact hand-off).
- **SEO:** per-page title/description/canonical, Open Graph, Organization
  JSON-LD, sitemap, robots.txt, `public/og.png` (`node scripts/og-image.mjs`).

## QA aids

- `?still` on any page: films snap to each step's settled pose, no fades,
  intro skipped. Same code path as `prefers-reduced-motion`.
- `?go=<section-id>:<0–1>` (dev server only): jump a film to a progress.
- `?q=1` shows the one emergency resolution step (moving frames at three
  quarters of the canvas); `?q=0` rules it out. Normally nothing triggers it.
- `?noboot` skips the boot screen.
- Dev server only: every stage canvas carries `canvas.__vee` (renderer,
  scene, camera, progress, `advance`, the sky backdrop) and
  `canvas.__veePost` (finish, quality level) for frame timing from the
  console.
- To check that scrolling and standing still look the same, compare a frame
  captured while frames are being asked for with one captured after the
  pause. Comparing two still pictures does not show it: that is how the
  occlusion and shadow differences of 2026-10-06 went unnoticed.
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

The table is the first day (2026-10-06). Second day (2026-10-07), GPU time
of one moving hero frame by timer query, 1897 x 1080 canvas, one query per
frame, the last commit and the working tree measured minutes apart in the
same power state:

| Hero set | 2026-10-06 (no occlusion while moving) | 2026-10-07 (occlusion in every frame) | Change |
| --- | --- | --- | --- |
| Farm | 14.3 ms | 10.8 ms | -25% |
| Pods | 13.3 ms | 9.7 ms | -27% |
| Workforce | 10.1 ms | 8.5 ms | -17% |
| Campus | 12.5 ms | 8.2 ms | -34% |

Timed in batches of six frames in the fast power state the same frames read
8.0-8.3, 7.9-8.0, 6.2-6.6 and 7.2-7.9 ms before, and 5.4-6.0, 5.3-6.6,
4.4-4.6 and 4.2-6.1 ms after; Workforce and Campus also gave single readings
of 6.5-8.8 ms while the machine's power state was shifting, which a
per-frame run did not reproduce. Inside one page, switching one thing at a
time: occlusion costs 0.75-1.0 ms a frame, the half-size sky saves 1.1-1.4.

Resolution is no longer reduced while scrolling, and a moving picture has
the same occlusion, sky and shadows as a still one (notes F3). A steady
hero scroll holds 59 fps in both builds in the fast power state (the
display's limit), so the gain is headroom for the throttled state, where
the same frames take two to three times as long. The one slow frame left in
that scroll (about 50 ms near the end of the hero, in both builds) is most
likely the next film's scene mounting; not traced on the second day.

| Asset | Raw | Gzip | Loaded |
| --- | --- | --- | --- |
| three + R3F (two shared chunks) | 983 kB | 264 kB | async, after first paint |
| react-dom client | 209 kB | 64 kB | with first island |
| ambient occlusion pass | 31 kB | 8 kB | with the first 3D stage (desktop only) |
| each scene | 1-15 kB | 1-6 kB | when its section nears the viewport |
| CSS | 56 kB | — | render-blocking, one file |

No GLB, HDR or texture downloads: all geometry is procedural, the
environment is generated at runtime. One canvas mounts near the viewport at
a time; the others unmount. Frameloop is on demand.

## Not yet verified

- Real phones and tablets (only emulated viewports were checked).
- Safari and Firefox.
- Frame rate on GPUs slower than Intel Arc integrated, and on real phones.
  There is no adaptive resolution any more, only one emergency step below
  about 20 fps. Shadow map is 2048 on compact, 4096 otherwise; small screens
  have no ambient occlusion.
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
7. Entering each film still stalls once (one frame of 50-180 ms) while its
   scene mounts (new WebGL context, geometry, environment map). Mounting the
   next film during idle time would remove it; not done.
8. About 1.7-2.0 s of main-thread work remains before the first picture,
   most of it drawing the procedural textures. A worker, or shipping them
   as image files, would remove it.
9. On small screens the hero's caption sits over the lower half of its
   canvas, while `.claude/CLAUDE.md` says text never goes over the canvas on
   mobile (the other films do follow it). The layout or the rule needs
   deciding; not touched in the performance pass.
10. The 3D look rule in `.claude/CLAUDE.md` was rewritten on 2026-10-07 to
   describe the look as built (photographic finish) and is marked CONFIRM:
   it replaced the original "maquette, no bloom" rule and no decision
   between the two is on record.
3. Tablet portrait hero has loose spacing between caption and button.
4. Shadow edge on the model base plates shows slight stippling at grazing
   angles.
5. Hero step captions are `<p>`, not headings, by design (h1 is the
   proposition line). Revisit if SEO wants the slogans as headings.
6. No git repository was initialised.
