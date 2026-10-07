# VEE.BUILD — progress

Last updated: 2026-10-07, evening (the client's instructions of that day, notes I: one door per shell, plain-text captions, the factory tour seen from above, the configurator, the opening card in mist; then the second round that evening, notes I12-I15: the 600 and 700 footprints, one staircase beside the building, the stacks' add-ons, "Your house" ending on its front, "How are we different?" as a ledger; then the hero opening on the house alone in a studio, notes I18; cost measured, notes F4, F5, F6 and I10)

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
| 8 Responsive pass | done at 390, 820 and 1440 wide (headless Edge); the sections changed on 2026-10-07 re-checked at 390 and 1280 only |
| 9 Performance pass | done 2026-10-06 and 2026-10-07 on the client laptop, see "Performance" below and notes F2, F3, F4 |
| 10 Quality pass | first pass done, see "Not yet verified" |
| 11 Client round of 2026-10-07 | done, notes I; open decisions listed under "Waiting for an answer" |

`npm run check` → 0 errors. `npm run build` → 5 routes, sitemap, optimised images.

## What exists

- **Routes:** `/`, `/capsule/`, `/prefab/`, `/partnership/`, `404`.
- **Main page, 14 sections, in this order:** `overview` (an opening card: the headline and the
  two shells beside the house alone in a studio, mist at its feet; scrolling
  spreads its land out from under it and brings the sky up; then the hero film: modular home, capsule pods, workforce
  housing, institutional campus), `how-it-works` (film,
  6 steps + footprint counter), `components` (film, 4 steps + interactive
  add-on tags), `difference` (six points on a deeper tone of the
  paper, all on show: a ledger of six cells, then the brief's three comparisons with the
  alternative struck through; each part comes in once as it is scrolled to), `configure` (the configurator,
  `src/components/build/Configurator.tsx`), `your-house` (film, 2 steps, the
  camera going from the front corner to square on; can be turned by hand), `factory` (a full-screen title, "See how we
  manufacture it.", then the film: 7 stations and dispatch, seen from
  above throughout), `delivery`, `site`, `installation` (film),
  `build-yours`, `catalogue` (5 models, SVG isometric + plan), `gallery`,
  `contact`. Six films and the configurator have a 3D stage; so do the
  capsule and prefab pages (`Showcase.tsx`).
- **The shell:** one door per shell, openings after the client's model
  (notes H8, I3). `doorFaces` in `src/build/model.ts` decides the face,
  `moduleGeometry(type, door)` in `kit/parts.ts` draws it, and every
  scene draws shells in one instanced mesh per type and door face
  (`shellPools` in `kit/house.tsx`; `Pool` in `SystemScene.tsx`).
- **The configurator:** shells on a 3 m grid with stacking; add-ons laid
  out by rule or placed by hand (`layoutAddOns`); every piece of the
  layout is listed with the box it fills (`pieces`), which is how a click
  finds it and how it is selected and removed; with the deck add-on every
  ground-floor door has a deck outside it and each stretch of deck a
  flight of steps (notes I16); upper floors get galleries
  and the building one outer staircase beside it, on their own
  (`layoutAccess`, notes C6, I13). "How it works" lays its three stacks
  out with the same rule (`AddOnParts` in `kit/house.tsx`).
- **3D:** `src/three/Stage.tsx` (the one Canvas: lights, the sky drawn
  behind the scene, shadow-map bookkeeping, open ground drawn last),
  `kit/` (materials, geometry, parts, buildings, house, modelhome,
  landscape, sets, env, sky, looks, atmosphere, textures, pbr, machines,
  and `post.tsx`, the finish), `scenes/` (Hero, System, Components,
  Reveal, Factory, Install, Build, Showcase).
- **Animation:** `src/film/` — `Film.tsx` (sticky shell, damped scroll
  progress, captions, DOM labels, the title card: a window or mist),
  `progress.ts`, `prefetch.ts` (scene code fetched at idle; a scene may
  export `prepare`, small jobs run at idle before it mounts),
  `timeline.ts`, `systemTimeline.ts`, `componentsTimeline.ts`.
- **Forms:** `EnquiryForm.tsx` (contact + partnership variants), `prefill.ts`
  (catalogue → contact hand-off).
- **SEO:** per-page title/description/canonical, Open Graph, Organization
  JSON-LD, sitemap, robots.txt, `public/og.png` (`node scripts/og-image.mjs`).
- **Accent:** vermilion on paper, hi-vis green `#c8f031` on ink
  (`src/styles/tokens.css`; notes I5).

## QA aids

- `?still` on any page: films snap to each step's settled pose, no fades,
  intro skipped. Same code path as `prefers-reduced-motion`.
- `?go=<section-id>:<0–1>` (dev server only): jump a film to a progress.
  The value counts a title card's scroll as well (the hero and the factory
  tour each start with one screen of it; `data-pre` on the section).
- To time or capture inside a title card with a script that takes a film
  progress: a film's travel is its height less the pinned screen less the
  card, so the card's scroll q (0-1) is progress (q - 1) × card ÷ travel
  (the hero: (q - 1) / 3.4). Getting this wrong times the wrong frames.
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
- To compare with the last commit: `git archive HEAD` into a scratch
  folder, a junction to this repo's `node_modules`, `vite.server.fs.strict:
  false` in that copy's Astro config, and `npx astro dev --port 4322` beside
  the working tree's server. Visit the two in turn.
- To find what a frame is spent on: inside one page, switch one object off
  (or change its draw order) at a time, round-robin with untouched control
  runs, and time each with the timer query. This is how the two wasted
  passes of the factory were found (notes F4).
- The dev server can serve a stale server render of an island after its
  file was rewritten by a script: a hydration mismatch in the console that
  a build does not have. Re-save the file.

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

Third round, 2026-10-07 evening (notes F4 has the method and every row):
the client's changes of that day, last commit against working tree, GPU
time of one moving frame, one query per frame, medians of 3-5 alternating
rounds in the laptop's slower power state.

| Film | Last commit | Now |
| --- | --- | --- |
| Hero, farm | 10.9 ms | 11.3 ms (camera 8% farther back, more meadow in shot) |
| Hero, pods | 10.3 ms | 10.3 ms |
| Hero, workforce | 8.5 ms | 7.2 ms (no grass) |
| Hero, campus | 8.5 ms | 8.4 ms |
| How it works, footprints / stacks | 21.0 / 12.7 ms | 19.9 / 12.8 ms |
| Your house | 8.1 ms | 7.8 ms |
| Factory, six stations | 9.4-23.3 ms | 8.4-11.2 ms |
| Installation, mid-lift / handover | 9.6 / 9.2 ms | 9.3 / 6.9 ms |

A steady 1500 px/s scroll holds 57-60 fps through every film in both
builds; the longest single frame is 50 ms in the hero, 52 ms in "How it
works" (it was 70), 67 ms in "Your house", 17-33 ms in the factory and
17 ms in the installation.

Fifth, the hero's studio opening (notes F6): at rest a frame is 4.0 ms
where it was 11.5 (the land and sky are not drawn); half-way and later in
the opening's scroll it is about 1 ms more than it was (12.3-12.7 against
11.4), for that scroll only; the film itself is unchanged (11.1 against
11.2).

Fourth round, 2026-10-07 late evening (notes F5): the second set of
changes that day, the tree before them against the tree after.

| Film | Before | Now |
| --- | --- | --- |
| How it works, 600 / 700 sq.ft. | 20.2 / 21.0 ms | 20.2 / 18.1 ms |
| How it works, villa / apartment / high-rise | 16.5 / 12.6 / 7.6 ms | 16.5 / 11.5 / 7.3 ms |
| Your house, two poses | 8.1 / 7.3 ms | 8.0 / 7.4 ms |

"How are we different?" has no 3D: it scrolls at 60 fps with no frame over
20 ms.

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
- Safari and Firefox. Things added on 2026-10-07 that lean on newer CSS:
  the factory title's window is a `clip-path: inset(... round ...)` driven
  by `calc()` on a custom property, the hero's mist moves and thins by
  `calc()` on the same property, and "How are we different?" lays its
  list out with `display: contents`.
- Frame rate on GPUs slower than Intel Arc integrated, and on real phones.
  There is no adaptive resolution any more, only one emergency step below
  about 20 fps. Shadow map is 2048 on compact, 4096 otherwise; small screens
  have no ambient occlusion.
- A real, visible browser window on the client laptop: timings above are
  from headless Edge on the same GPU.
- A screen-reader pass. Structure is in place (one h1 per page, labelled
  sections, labelled form fields, focus styles, skip link) but untested
  with NVDA / VoiceOver. New on 2026-10-07 and untested there: the index
  form of "How are we different?" (every point stays in the document;
  five of the six are only made transparent), and selecting an add-on in
  the configurator's 3D view, which has no keyboard path yet (shells have
  one, through the plan).
- Lighthouse / Core Web Vitals on a deployed build.
- Enquiry delivery: no endpoint is configured (notes A2), so only the
  validation and "cannot send yet" paths have been exercised.
- The configurator's new behaviour was exercised on the presets and by a
  dozen scripted clicks (select and remove steps and a deck, the steps tool
  on a bare wall, a shell stacked on a roof). Not exercised: touch, very
  large builds, every combination of rotated shells.
- Tablet widths (820) for the sections changed on 2026-10-07.
- The staircase rule on anything but the presets: it was run on all eight
  and looked at on five; odd shapes (L and U plans, towers, set-backs) only
  by reasoning.
- The moving-against-still shift in the stacks of "How it works" (up to one
  grey level where the rails are) is put down to 2x against 4x
  multisampling on thin balusters, without a test that isolates it.

## Waiting for an answer

1. **Green accent:** on ink only, as built, or everywhere (notes I5).
2. **Outer staircase and galleries** in the configurator: the idea and its
   dimensions are ours (notes C6).
3. **"Core shell" drawn as the steel frame** of the client's structure
   sequence (notes C3), and the yard's layout (C8).
4. **Shell B's openings** (notes C7).
5. Whether the low landing with the loop rail of the client's model should
   replace the deck and its rail everywhere (notes H-d).

## Known issues / next tasks

1. Launch blockers are client inputs: notes section A (contact details,
   form endpoint, photography, clean render, logo, domain).
2. Three.js chunks are 264 kB gzip because R3F registers the whole namespace.
   A hand-picked `extend()` catalogue would cut it; not done.
7. Entering each film still stalls once (one frame of 50-70 ms on the test
   laptop on the afternoon of 2026-10-07; 200-270 ms that evening in every
   film, touched or not, with the GPU timings unchanged, so most likely
   the machine's CPU state) while its scene mounts (new WebGL context, geometry, environment
   map). "How it works" now builds its shell geometries at idle before it
   mounts; mounting the whole next film during idle time would remove the
   rest; not done.
8. About 1.7-2.0 s of main-thread work remains before the first picture,
   most of it drawing the procedural textures. A worker, or shipping them
   as image files, would remove it.
9. On small screens the hero's caption stands over the lower half of its
   canvas, on a fade to the page colour: the one place left where text is
   laid over a picture with a wash under it, against both the mobile rule
   and the plain-text rule in `.claude/CLAUDE.md`. Needs its own layout
   (canvas on top, caption below, as the opening card already does).
16. The opening card has no button of its own: "Build your own" and "How it
   works" arrive with the film's first caption, one screen on.
10. The 3D look rule in `.claude/CLAUDE.md` was rewritten on 2026-10-07 to
   describe the look as built (photographic finish) and is marked CONFIRM:
   it replaced the original "maquette, no bloom" rule and no decision
   between the two is on record.
18. The hero's opening (notes I18, F6): frames in the second half of its
   scroll cost about 1 ms more than the film's own, while the land's
   shaders can discard. A new land material that is not made through
   `clearing()` would stand in the studio before the land arrives.
17. Decks at the doors (notes I16): Studio Max has two short decks and two
   flights of steps, one at each of its doors, which are on different
   sides; a door the visitor points at the plot's edge gets a deck beyond
   the plot.
11. Upper-floor access (notes I13): a building whose tallest part is set
   back on every side gets galleries and no staircase; a door cut off from
   the rest of its floor keeps a balcony nobody can reach; where the plot
   has no room beside the building the staircase stands free in front of
   it, and outside the plot only if nothing else is left. In the
   configurator's first view the staircase is on the far flank, partly
   behind the building, until the view is turned.
12. "How it works": a shell's door changes face in mid-move between two
   footprints, as a cut.
13. While the header passes over a film it has no backing; where the top of
   a picture is busy (the gantry passing in the factory, the hero's trees)
   its links are harder to read for a moment.
14. `Farmhouse` in `src/three/kit/buildings.tsx` is no longer used by
   anything (the hero has had its own house since 2026-10-06). Left in
   place; remove with its pier geometry when convenient.
15. Blended line segments (the blueprint grid of "How it works", the
   configurator's plot grid, the joints of every `Paving`) are worth
   timing: the same kind of lines cost about 0.7 ms a frame in the factory
   before they were taken out (notes F4). "How it works" is the dearest
   film now, about 20 ms a frame at the footprints in the slow power state.
3. Tablet portrait hero has loose spacing between caption and button.
4. Shadow edge on the model base plates shows slight stippling at grazing
   angles.
5. Hero step captions are `<p>`, not headings, by design (h1 is the
   proposition line). Revisit if SEO wants the slogans as headings.
6. A git repository exists since 2026-10-06 (two commits). The work of 2026-10-07 is in the working tree, not committed.
