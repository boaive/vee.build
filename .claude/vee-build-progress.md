# VEE.BUILD — progress

Last updated: 2026-10-15 (the mobile and tablet round of 2026-10-14 and 15, notes R and F14: phones and tablets held upright have layouts of their own (the words at the top and the building under them, large, framed in the band they leave; dashes and a count at the foot; a header of the lockup, a Contact pill and three bars); the phone's hero is a showroom on the polished floor, its opening card the three kinds as cards to swipe between, its four steps scrolled, the capsule's step with its three lengths; the factory and On site a step at a time, chosen with cards that carry the scene's own picture; the product pages' buildings alone on the polished floor, the capsule's length chosen; the capsule home-like on phones; call-outs at the screen's edge; delivery scrolled on phones; On site is chapter 09; a budget touch device draws lighter; the desktop checked element for element against the tree before). Before that: 2026-10-14 (the developer's round of that day, notes Q and F13: the opening card's three come up out of the floor whole, one after another, and the two that leave go back down into it whole; a Home tab for the main page and MOD a page of its own, `/modular/`; on MOD and FAB, links into the home page's chapters before the enquiry form; the Hemisphere One logo in its own colours on every ground; one "See how VEE manufactures it" button on MOD and FAB, to the factory; a film reached by a link stands at the top of the window). Before that: 2026-10-12 (the developer's brief of that day, notes P: the opening card's three in refined finishes, on the real-time 3D as it is: plaster, standing-seam roof, coated steel, the capsule's coat, polished glass, a floor that mirrors the lit windows, more light and shade; the card only). Before that: 2026-10-11, evening (the client's second brief of that day, notes O and F12: the opening card made again: the three one behind another on a diagonal, on a polished floor that mirrors them, in warm light on a warm shade, fitted to any screen; jack piers under the deck and steps of "08 On site". That morning, notes N and F11: Powered by with the logo under the wordmark, rooms behind lit glass, the capsules at life size, each shell lifted by its own hooks in 2.2, prices in the configurator, the site's preparation as the first part of the installation film). Before that: 2026-10-10, evening (the client's brief of that day, notes M and F10: the factory made again as one shell in one bay, seen on the diagonal, lifted by four hooks; the journey as a short film that holds the page; the installation placing one shell and assembling the rest by itself, lights last; doors and windows of 2.3; "Add-on" tags; jack piers on the hero's house; Powered by Hemisphere One under the wordmark; the catalogue hidden; "VEE" for "we"). Earlier the same day: the developer's two rounds (notes K and F9; notes L: the second burst, the accent settled as vermilion on paper and green on ink, the build in figures under the configurator's view). Before that: 2026-10-09 (the client's corrections sheet, notes J and F7).

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
| 8 Responsive pass | done at 390, 820 and 1440 wide (headless Edge); the sections changed on 2026-10-07 re-checked at 390 and 1280 only. Superseded on phones and tablets by row 20 |
| 9 Performance pass | done 2026-10-06 and 2026-10-07 on the client laptop, see "Performance" below and notes F2, F3, F4 |
| 10 Quality pass | first pass done, see "Not yet verified" |
| 11 Client round of 2026-10-07 | done, notes I; open decisions listed under "Waiting for an answer" |
| 12 Client corrections of 2026-10-09 | items 1 to 6 done and measured, notes J and F7; items 7 (the factory) and 8 (delivery) done on 2026-10-10 by the client's later brief, notes M |
| 13 Developer's round of 2026-10-10 | done and measured, notes K and F9 |
| 14 Developer's second round of 2026-10-10 | done, notes L; its measurements with M's in F10 (the second burst's cost not settled) |
| 15 Client's brief of 2026-10-10 (evening) | all fifteen items done and looked at on the dev server at two sizes, notes M; measured, F10; open points under "Waiting for an answer" and "Not yet verified" |
| 16 Client's brief of 2026-10-11 (morning) | six items done and measured, notes N and F11 |
| 17 Client's second brief of 2026-10-11 | the opening card and the jack piers of "On site": done, looked at in nine window shapes and measured, notes O and F12 |
| 18 Developer's brief of 2026-10-12 | the opening card's three in refined finishes: done, looked at in five window shapes and measured, notes P; waiting for the developer's review before any other scene takes them. The same day: a canvas's pixels by the GPU (zoomed windows and dense screens no longer stretched), every stage, measured on the laptop only, notes P7 |
| 19 Developer's round of 2026-10-14 | done, looked at and measured, notes Q and F13; open points under "Waiting for an answer" |
| 20 Mobile and tablet round (2026-10-14 and 15) | done on emulated phones and tablets, measured on a phone-sized screen, desktop fingerprinted before and after on production builds; notes R and F14; open points R1 to R4 |

`npm run check` → 0 errors. `npm run build` → 6 routes, sitemap, optimised images.

## What exists

- **Routes:** `/` (Home), `/modular/` (MOD, since 2026-10-14), `/capsule/`, `/prefab/`, `/partnership/`, `404`.
- **Menu:** Home | MOD | POD | FAB and Contact (`primaryNav`). **Bottom band**
  under the footer, on paper: Partnership, Investors, Technology, and
  "Powered by" with the Hemisphere One logo (`bandNav`, `Footer.astro`).
- **Product pages** (MOD, POD, FAB): a head with the client's line, a
  real-time picture of the building (`Showcase.tsx`; MOD shows the
  opening card's house in its meadow, whole), what the brief states about
  it, and the enquiry form last. MOD and FAB have "Continue on the home
  page" just before the form: MOD 03 and 06, FAB 02, 05 and 06
  (`src/data/onward.ts`, `Onward.astro`).
- **Home page, 13 sections shown, in this order** (numbered from the list
  in `src/data/site.ts`; the number is the chapter's; the catalogue is
  built and hidden, `shown.catalogue`): 01 `overview` (an
  opening card: the headline over the three kinds of building, a modular
  house, a 20′ capsule home and a G+1 prefab block of four bays, standing
  one behind another on a diagonal and seen on the diagonal, on a
  polished floor of 3 m slabs that mirrors them, in warm light, on the
  page's warm shade; each named on the floor and lit once it stands; the
  camera fitted to the screen; each comes up out of the floor whole, one
  after another; scrolling takes the other two back down into it, goes
  round to the house, grows its land from under it over the floor and
  brings the sky up; then the hero film: modular house, capsule homes,
  workforce housing, institutional building, each caption changing on its
  cut, the last three tagged "Coming soon"), 02 `how-it-works` (film, 5
  steps: the 2 core shells, lift & shift with an arrow over each hook,
  six footprints with one main door each, windows on every street end and
  a footprint counter, the villa with one main door a floor and a door
  onto its terrace, the mid-rise apartment), 03
  `components` (film "Componentized building", 4 steps, 9 screens: the
  finished house coming apart into foundation, module and add-ons and then
  each of those into its parts, its heading arriving a word at a time; the
  foundation, plug footings and L plinths; the module in three parts,
  then the standard door and windows; the add-ons with their interactive
  tags, the jack piers set with them, the deck, steps and roof tagged
  "Add-on"), 04
  `difference` ("Key differences": six
  points on a deeper tone of the paper, all on show, each with a drawn
  mark; then the brief's three comparisons with the alternative struck
  through; each part comes in once as it is scrolled to), 05 `configure`
  (the configurator, `src/components/build/Configurator.tsx`), 06
  `your-house` (film "3D tour", 2 steps, the camera going from the front
  corner to square on; it can be turned and tilted by hand, and has five
  view keys), 07 `factory` (a full-screen title, "See how VEE
  manufactures it.", then the film, seen on the diagonal: one shell made
  in one bay in 7 stations, structural frame, insulation panels, formwork,
  concreting, de-shuttering, doors and windows, spray finish, and its
  dispatch by a crane's four-point lifting frame onto the truck), 08
  `delivery` (film "Delivery": the truck's drive down the road, 4 s, plays
  by itself and holds the page on desktop; scrolled through on a compact
  layout), 09 `installation` (film "On site", 5 steps:
  the plot made ready, pegs, pits, plug footings, L plinths; then one
  shell placed on the foundation, the rest assembling by itself, jack
  piers set under the deck's posts and the steps, the add-ons landing on
  them, lights last), `build-yours` (on the rail, part of 09), [`catalogue`, hidden: 5 models, SVG isometric + plan],
  10 `gallery`, 11 `contact`. Seven films and the configurator have a 3D
  stage; so do the capsule and prefab pages (`Showcase.tsx`).
- **Phones and tablets** (notes R; `src/film/device.ts`): *compact* (up to
  860 px wide, or a touch screen up to 1100 px held upright) has a layout
  of its own on every film: the words at the top, the building under them
  in the band they leave (`progress.band`, Stage `frame`, `zoomCompact`),
  dashes and a count at the foot, no fade over the picture; sideways
  phones have the words on the left. The phone's hero is
  `HeroMobileScene.tsx` (the card's three as cards to swipe between, the
  four steps scrolled, the capsule's lengths as cards; `film/heroChoice.ts`),
  the product pages' stage `ShowcaseStudioScene.tsx` (the building alone
  on the polished floor, a finger turns it, the capsule's lengths to choose),
  both framed by `kit/frame.ts`. The factory and On site are cards on a
  phone (`pick` in `Film.tsx`, pictures in `public/images/cards`, made by
  `node scripts/cards.mjs`). The capsule on a phone is home-like
  (`POD_HOME`). A touch device's GPU is measured once a visit
  (`film/tier.ts`); a slow one is *lite*. Tablets held sideways keep the
  desktop's layout.
- **The capsule:** `kit/capsule.ts`, a hull rounded with two radii drawn
  as a skin over two parameters, so that glazing, frames, seams and light
  lines are patches of the same surface; one geometry of four material
  groups for each length (notes C9). `Capsule` in `kit/buildings.tsx`.
- **The three on the opening card:** where they stand for a shape of
  picture, `rowFor` in `kit/row.ts`; the camera fitted to the screen and
  the names' places, `fitRow` in `kit/rowfit.ts` (pure geometry, runs in
  Node too); the floor, `kit/plaza.tsx`; its reflections,
  `kit/mirror.tsx`; the light, look `card`; the shade behind,
  `.film__backdrop--studio` in film.css; the two that leave, `Lineup` in
  `kit/sets.tsx`; the card's two parts in `scenes/HeroScene.tsx`
  (`LINEUP`, the same number as `--lineup` in film.css).
- **The shell:** one door per shell, openings after the client's model
  (notes H8, I3); a footprint of "How it works" keeps one main door of
  those (`mainDoor`, notes J7). `doorFaces` in `src/build/model.ts` decides the face,
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
  behind the scene, shadow-map bookkeeping, open ground drawn last,
  `useWarmAll`), `kit/` (materials, geometry, parts, shell, capsule,
  buildings, house, modelhome, landscape, sets, env, sky, looks,
  atmosphere, textures, pbr, machines, and `post.tsx`, the finish),
  `scenes/` (Hero, System, Components, Reveal, Factory, Transit, Install,
  Build, Showcase).
- **The shell in three parts:** `kit/shell.ts` (frame members, wall bays
  with the standard openings, panels, concrete, joinery), read by
  `ComponentsScene` and `FactoryScene`.
- **Plant:** `kit/machines.tsx` (tractor and flatbed with turning wheels,
  mobile crane with a sliding boom, the four-point lifting frame, the
  trailer pump; `prepareMachines`).
- **Animation:** `src/film/` — `Film.tsx` (sticky shell, damped scroll
  progress, captions, DOM labels, the title card: a window or mist, and
  `play`: a film that plays by itself), `hold.ts` (holding the page for
  such a film), `progress.ts`, `prefetch.ts` (scene code fetched at idle;
  a scene may export `prepare`, small jobs run at idle before it mounts),
  `timeline.ts`, `heroTimeline.ts`, `systemTimeline.ts`,
  `componentsClock.ts`, `componentsTimeline.ts`, `factoryTimeline.ts`,
  `installTimeline.ts`.
- **Forms:** `EnquiryForm.tsx` (contact + partnership variants), `prefill.ts`
  (catalogue → contact hand-off).
- **SEO:** per-page title/description/canonical, Open Graph, Organization
  JSON-LD, sitemap, robots.txt, `public/og.png` (`node scripts/og-image.mjs`).
- **Accent:** vermilion on paper, hi-vis green `#c8f031` on ink
  (`src/styles/tokens.css`; notes I5, L3). The small titles (a chapter's
  whole line, the line over a caption, the rail's marker, the step ticks)
  are in the accent of their ground (`--title`), as text, nothing behind
  them. As a fill under ink text (`--mark`) the green is on the dark
  films only.
- **Hidden sections:** `shown` in `src/data/site.ts` (the catalogue).
- **Mounting:** a film's scene mounts within a screen of the viewport, or
  ahead of time in a quiet moment while up to 1.75 screens below it (the
  factory 2.8), and is warmed out of sight (`Film.tsx`, `Stage.tsx`;
  notes F9).

## QA aids

- Phones and tablets (2026-10-14): in the headless Edge, emulate the size
  with `mobile: true` and turn touch on (`Emulation.setTouchEmulationEnabled`
  and `Emulation.setEmulatedMedia` with `pointer: coarse`, `hover: none`
  and their `any-` twins): the touch clauses of `device.ts` match only
  then. A swipe is `Input.dispatchTouchEvent` (start, a few moves, end).
  Sizes looked at: 390 × 844 and 375 × 667 at 2, 844 × 390 at 3, 820 ×
  1180 and 1180 × 820 at 2; `?lite=1` forces the budget tier.
- The cards' pictures: `node scripts/cards.mjs [base] [film]` with the dev
  server running (it starts its own headless Edge, `BROWSER` to change
  it; JPEG captures, the PNG encoder hangs). Run it again whenever a
  step's picture changes (the factory's zoom, the capsule's section).
- The dev server may listen on IPv6 only (`[::1]:4321`): a headless Edge
  given `localhost` then tries IPv4 and is refused. Use `http://[::1]:4321`.
- Desktop regressions (2026-10-14): production builds of the tree before
  (`git archive`) and after, served side by side (`astro preview`), and
  every element's computed style (custom properties hashed apart) and box
  fingerprinted on every page at seven desktop sizes, and each film's own
  elements at nineteen poses at three sizes; new elements hidden on desktop
  are set aside by name. The scripts are in the session's scratchpad
  (stylesnap, snappair, filmsnap, filmpair, cmpsnap, cmpfilm).

- `?still` on any page: films snap to each step's settled pose, no fades,
  intro skipped. Same code path as `prefers-reduced-motion`.
- `?go=<section-id>:<0–1>` (dev server only): jump a film to a progress.
  The value counts a title card's scroll as well (the hero and the factory
  tour each start with one screen of it; `data-pre` on the section).
- The opening card's fit, without a browser: `fitRow` (`kit/rowfit.ts`)
  takes a camera and a band of numbers. Bundled with the repo's esbuild
  (`--alias:three=…/three/build/three.module.js`) it runs in Node: one
  script printed the arrangement, the camera's height and each
  building's box for a dozen screen shapes, another tried every place on
  the floor's joints (notes O1). In the dev build `window.__veeRow = 0.4`
  before a resize holds the card to one arrangement, and the stage's
  `rig.row` is the fit in use. `window.__veeIntro = <seconds>` holds the
  opening (the three coming up) at that moment, for captures.
- Captures are JPEG, with the fast encoder: headless Edge's PNG encoder
  hung for good on some pictures (2026-10-11).
- Two builds timed in turn can read 2× apart for the order alone (the
  second load of each pair in the laptop's slow state, every round):
  reverse the order before believing it (notes F12).
- To time or capture inside a title card with a script that takes a film
  progress: a film's travel is its height less the pinned screen less the
  card, so the card's scroll q (0-1) is progress (q - 1) × card ÷ travel
  (the hero since 2026-10-09: card 1.7 screens, travel 3.9, so
  (q - 1) × 1.7 / 3.9). Getting this wrong times the wrong frames. The
  hero's card has two parts: the row and the lift-away up to q = 0.34, the
  land and sky after it.
- A scripted jump of the page draws one frame. Anything that reads a value
  kept from the frame before shows the state before the jump: read the
  scroll itself (the row's lift-away did this at first).
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
  to time anything. Keep one protocol session for the whole run: a new
  session resets the emulated screen, the canvas is resized, and the first
  capture after it can catch the canvas half drawn (a building "missing"
  from a crop on 2026-10-09 was that, not the page).
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
- A film that plays by itself (the road) does not follow the scroll: to
  look at a frame of it, scroll its section to the top and set
  `canvas.__vee.progress.value` and `.target` to the same number, call
  its listeners and `invalidate()`. To test the hold, dispatch a `wheel`
  event on `window` and then `scrollBy`: the hold only starts for a
  scroll that follows an input.
- The installation runs on a clock after its trigger (0.3): a scripted
  jump shows it starting, not finished. `?still` shows each caption's
  stage finished. In a slow capture loop the clock runs slow too (its
  step is capped at 50 ms a frame).
- A baseline copy served beside the working tree needs
  `vite.server.fs.strict: false` in its config, or every island fails to
  load through the `node_modules` junction (no stage, a 404 in its log).

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

No GLB or HDR downloads: all geometry is procedural, the environment is
generated at runtime. Since 2026-10-12 the hero fetches eleven small maps
for its refined finishes (`public/textures`, 298 kB in all, baked by
`scripts/textures.mjs`; notes P4); every other texture is still drawn
at runtime. One canvas mounts near the viewport at
a time; the others unmount. Frameloop is on demand.

Sixth round, 2026-10-09 (notes F7 has the method and every row): the
client's corrections of that day, last commit against working tree, GPU
time of one moving frame, medians of 3 or 4 alternating rounds, the
laptop mostly in its slower power state.

| Film | Last commit | Now |
| --- | --- | --- |
| Hero, opening card at rest | 4.2 ms | 4.9 ms (two more buildings in the picture) |
| Hero, farm / capsules / workforce / institutional | 11.5 / 10.5 / 7.3 / 8.0 ms | 11.5 / 10.5 / 7.2 / 8.0 ms |
| How it works, shells / lift & shift / 600 / 800 / villa | 21.4 / 16.7 / 20.1 / 18.3 / 16.3 ms | 8.6 / 8.3 / 7.9 / 8.9 / 8.1 ms |
| How it works, top of the mid-rise | 7.9 ms | 8.2 ms |
| Components, exploded / foundation / frame / panels | 6.9 / 21.0 / 8.9 / 8.1 ms | 7.2 / 17.2 / 8.1 / 8.3 ms |
| Components, concrete going on / closed shell / all add-ons | 8.3 / 7.9 / 7.3 ms | 8.8 / 8.3 / 7.7 ms |
| 3D tour (your house) | 8.6 ms | 8.6 ms |

"How it works" was the dearest film for its grid alone: 58 blended line
segments cost 12 ms of every frame. The grid is now one shaded sheet and
looks the same. A steady 1500 px/s scroll holds 55 to 57 fps through the
hero, "How it works" and the components film in both builds; the one long
frame in each is still where the next film mounts. Time to the first
picture is not longer (2.3 to 2.9 s against 2.7 to 4.3 s, dev builds).
Moving against still at thirteen poses: 0.39 of a grey level at most.

Seventh round, 2026-10-10 (notes F9): the components film costs what it
did within 0.2 ms at eight poses (6.8 to 12.5 ms) with a third fewer draw
calls. Scrolling on into "Your build" after a pause at the configurator:
longest frame 17 ms where it was 83 to 233. One more stage is mounted at
the foot of the configurator for that: about 0.4 GB more GPU memory there
(2.0 GB against 1.6), the same elsewhere.

Eighth round, 2026-10-10 evening (notes F10): against the tree before
the developer's second round, nothing costs more than about 0.4 ms a
frame. Hero card 2.4 ms (2.6), farm set 5.5 (5.3), the villa 3.25 (3.0),
components' last frame 4.2 (4.3), the new factory 4.9 to 5.7 in the fast
state (the old one 5.3 to 5.4) with a third fewer draw calls, the
installation 4.8 (4.7), the road 4.1 to 4.6. A steady scroll through the
factory: one long frame (34 to 52 ms, at its end) where there were 5 to
14, after everything hidden is warmed at mount. The second burst of the
components film was not separated from the laptop's power-state noise.

Ninth and tenth rounds, 2026-10-11 (notes F11, F12): the opening card
at rest 3.3 ms in the fast state, where it was 2.8 that morning and 2.4
the day before, for rooms behind the glass, a real floor (0.5 ms) and
its reflections (0.25 to 0.5); the film after it unchanged (5.2). The
jack piers of "On site": 0.04 ms. A steady scroll through the hero: one
long frame, at its end, in every build.

## Not yet verified

- The mobile and tablet round (notes R): a real phone or tablet; Safari
  and Firefox (`safe center`, `:has`, `inert`, pointer events under
  `touch-action: pan-y`); a real budget tablet and so the lite threshold;
  GPU memory and a steady scroll's pacing on a phone; a moving frame
  against a settled one for the two new scenes.

- The round of 2026-10-14 (notes Q): a real phone; Safari and Firefox;
  the MOD page's stage on a GPU slower than the test laptop's; the
  opening's rise in a window dragged through several sizes.

- The two rounds of 2026-10-11 (notes N, O): a real phone or tablet;
  Safari and Firefox; the floor, the reflections and the rooms behind
  the glass on a GPU slower than the test laptop's; a window resized by
  dragging (the card is fitted again at every size it passes, 15 to 50
  ms each); the production build's pages (it builds; they were not
  opened); the price breakdown with a screen reader.
- The rounds of 2026-10-10 afternoon and evening (notes L, M): the hold of
  the road film on a real touch screen and in Safari or Firefox (it was
  driven in headless Edge only); real phones; tablet widths; GPU memory
  with one more stage in the page; the cost of the components film's
  second burst; the configurator, the 3D tour and the catalogue (switched
  back on) after the kit's changes; the production build's pages (it
  builds; they were not opened).
- Real phones and tablets (only emulated viewports were checked).
- The round of 2026-10-10: looked at on the dev server at 1280 × 720 and
  390 × 844; the production build runs but its pages were not opened; the
  early mount on a machine with less GPU memory than the test laptop; the
  catalogue tabs and plan drawings after their CSS was restored (the
  build passes and the rules match the copy taken before the round, but
  they were not looked at again).
- The round of 2026-10-09: everything was looked at and timed on the dev
  server (the production build was run and passes, but its pages were not
  opened); at 1280 × 720 and 390 × 844 only, so not at tablet widths and
  not on a short or very wide desktop window, where the row of three on
  the opening card has the least room; the capsule and prefab pages'
  frame time; the 3D tour's view keys by keyboard and by touch; the
  mobile menu with its four entries.
- New CSS that leans on recent browsers (2026-10-09): `svh` lengths inside
  a gradient and `calc()` on a custom property inside a transform (the
  studio floor's line), `transform-box: fill-box` and `pathLength` dashes
  (the six marks of "Key differences"), `fwidth` in the grid's shader.
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

## Next

Nothing is waiting to be built. The client's sheet of 2026-10-09, items 7
(the factory) and 8 (delivery), was superseded and carried out by the
brief of 2026-10-10 (notes M8, M9). Still open from it: the client's wish
for real drone video behind the journey (needs the video; the journey is
now a 3D shot).

## Waiting for an answer

From the mobile and tablet round of 2026-10-14 and 15 (notes R):
- **Copy in the reference screens** that is not the brief's ("Modular,
  scalable, and ready for real-world needs", "Portable · Customisable ·
  Quick setup", "Built with precision", the factory's four stations of its
  own, and so on) was not used (R1).
- **The institutional building** on the phone's hero is in the kit's
  materials as they were, beside the card's three in their refined
  finishes (R2).
- **The budget tier's threshold** (a GPU four times slower than the test
  laptop's) is ours; no budget tablet was at hand (R3).
- **The capsule's home-like section** on phones (taller hull, less
  rounding) is ours, as its width and height always were; whether the
  desktop should take it too (R4).

From the developer's round of 2026-10-14 (notes Q):
- **Coming up out of the floor** is our reading of "spawn them building
  by building"; a whole-building drop, the client's own words, is one
  change (Q1).
- **The card's words** ("One system. Many buildings.", "01 — Modular
  precast construction system") are unchanged: "we do not say modular in
  here" was read as being about the animation (Q2).
- **The MOD page's house** has the kit's materials, not the card's
  refined finishes (Q3).
- **The Hemisphere One logo** on a pill of the paper where the ground is
  dark: ours, so that it can keep its own colours there (Q4).

From the developer's brief of 2026-10-12 (notes P):
- **Pixels by the GPU**: what a GPU faster than the test laptop's is
  given rests on one synthetic measure; no such machine, no 120 Hz
  screen and no phone was at hand (P7).
- **The opening card as it now looks**, for review. Only then do the
  other scenes take the refined finishes (one argument each: P3).
- **The sloped roof's covering**: standing-seam metal in the trim's
  colour is ours (P2).
- **The house keeps its refined finishes into the sunset slide** that
  follows the card (it is the same house); the brief's scope was the
  card (P3).
- **Scanned textures**, if wanted in place of the baked ones: a download
  of third-party files, which needs a yes (P4).

From the two briefs of 2026-10-11 (notes N, O):
- **The opening card: eye level or raised.** A low window and a very
  wide screen see the three from eye level, as the reference does; a
  16:9 laptop from 3.8 m; a larger or squarer screen from 7 to 13 m,
  because they stand a fifth to a third larger that way (O2).
- **The floor and the light** of the card are ours; "subtle and warm
  shade" was read as a plain warm backdrop, not the reference's sky and
  trees (O1).
- **Jack piers in "On site" only**, as asked: the configurator and the
  3D tour show the same house without them (O3).
- **The reversed Hemisphere One logo** of N1 is no longer shown (Q4); **the card's block is four bays**, not six (N2); **the rooms'
  furniture** is illustrative (N3); **every price** is ours (N5); **the
  order of the site work** follows the client's model, the pegs and
  string are ours (N6).

From the client's brief of 2026-10-10 (notes M):
- **"Tab"** in the hero was read as the step's mark and its caption; the
  top menu's MOD | POD | FAB does not follow the film. Should it?
- **Net zero:** "balcony" read as the open terrace; its door is in the
  wall that faces it, and the villa is now seen from that side.
- **Jack piers on the hero's house** stand under its landing and steps,
  as in section 3, not under the shell.
- **Concrete:** 35 mm round the shell, section 3's coat; in the factory a
  cast wall would be thicker.
- **The road:** 4 seconds, the page held; the truck at about 110 km/h for
  the look of it.
- **Installation:** the truck brings a ground-floor Shell A; the further
  shells are lowered in without the crane.
- **Wording:** "VEE delivers" (singular) beside the client's own "VEE
  have componentized" in 2.2.
- **Coming soon** was also put on the capsule's caption and on the
  opening card's two names.

From the developer's rounds of 2026-10-10 (notes K, L):
- The accent is vermilion on paper and the green on ink (settled by the
  developer; the client had suggested green throughout).
- Sizes of the steps' riser, sole and pier pad in section 3 are ours.

From the round of 2026-10-09 (notes J, end):
- Where **Investors** and **Technology** lead (now: the enquiry form and
  "How it works"), and whether the Hemisphere One logo links anywhere.
- **One main door**: the footprints of "How it works" only, as built, or
  every home in the configurator and the catalogue too.
- **Ink on green**, as built, or white on green as the client proposed
  (it cannot be read).
- The copy decisions: "Add-ons" for "ADD-ON's", "Cast in concrete" for
  "casted with concrete", "Net zero." as the heading of 2.4, the
  institutional line as "Lean. Clean. Resilient.", -ize throughout.
- The new claims: notes B8 to B11.
- Jack piers under the deck posts and steps are shown in section 3 only:
  should the configurator's foundation follow?

From earlier rounds:

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
7. (Mostly answered on 2026-10-10: films are mounted ahead of time in a
   quiet moment, notes F9. What follows still holds for a visitor who
   never stops scrolling.) Entering each film still stalls once (one frame of 50-70 ms on the test
   laptop on the afternoon of 2026-10-07; 200-270 ms that evening in every
   film, touched or not, with the GPU timings unchanged, so most likely
   the machine's CPU state) while its scene mounts (new WebGL context, geometry, environment
   map). "How it works" now builds its shell geometries at idle before it
   mounts; mounting the whole next film during idle time would remove the
   rest; not done.
8. About 1.7-2.0 s of main-thread work remains before the first picture,
   most of it drawing the procedural textures. A worker, or shipping them
   as image files, would remove it.
9. (Still open after 2026-10-09: the opening card is laid out for a phone,
   the film after it is not.) On small screens the hero's caption stands over the lower half of its
   canvas, on a fade to the page colour: the one place left where text is
   laid over a picture with a wash under it, against both the mobile rule
   and the plain-text rule in `.claude/CLAUDE.md`. Needs its own layout
   (canvas on top, caption below, as the opening card already does).
29. The opening card is fitted again at every size a dragged window
   passes through (15 to 50 ms each, main thread): the picture follows
   the drag in steps. Fitting once the drag has paused would smooth it.
30. On the card a name can stand on its building's reflection (the
   house's deck is red under "MOD"): readable, not calm ground.
31. The mist over the card's opening is now a colour of its own over a
   floor of another, so its drifting shapes can be made out where they
   were paper on paper; and a still picture taken while it is up differs
   from the next by half a grey level for the drift alone (F12).
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
   footprints, as a cut. Since 2026-10-09 a footprint has one main door,
   and it can pass from one shell to another the same way.
13. While the header passes over a film it has no backing; where the top of
   a picture is busy (the hero's trees; on a phone the back of the
   factory's yard, which stands under the chapter's line there even with
   the steeper view an upright screen is given) its links are harder to
   read.
25. The road film holds the page once per visit. A visitor who reaches it
   by a link or the scrollbar sees its first frame, the truck far off,
   and never the drive unless they press Replay (shown only after it has
   played). A "Play" for that case is not built.
26. The installation's captions follow the scroll while its picture runs
   on a clock: a visitor who stops at "Placed on the foundation." sees the
   whole building go up and light under that caption.
27. On the hero's meadow the grass hides the landing's jack piers; they
   are in full view on the opening card.
28. The factory's concrete is a 35 mm rim behind the boards while it is
   poured: what shows is the roof slab being laid and, at de-shuttering,
   the walls with their openings.
14. `Farmhouse` in `src/three/kit/buildings.tsx` is no longer used by
   anything (the hero has had its own house since 2026-10-06). Left in
   place; remove with its pier geometry when convenient.
15. Blended line segments. The blueprint grid of "How it works" was timed
   on 2026-10-09: 12 ms of a 19 ms frame, now a shaded sheet (notes F7),
   and the film is at about 8 ms. Still line segments, and still worth
   the same test: the configurator's plot grid, the joints of every
   `Paving`, the components film's 1 m grid (which does not show the
   cost), and the outlines of the exploded view's boxes added that day.
   The dearest frames on the page are now the components film's
   foundation step (17 ms) and the opening card while the land spreads
   (13 ms).
19. (Answered on 2026-10-11, notes O2: the card's three are fitted to
   the screen they are seen on, whatever its shape.)
20. The 3D tour's "Left" view looks towards the studio's fill light and
   the floor glares, as the scroll's own turn was kept from doing (I8).
   The keys keep a backing so they can be read there.
21. On a phone the footprint counter's scale is hidden (as before), so the
   green mark on the footprint on show is not seen there.
22. The capsule's lit glazing is a glow on the glass: no interior is
   modelled, which shows on `/capsule/` more than in the hero.
23. `Farmhouse` (issue 14) is still unused; so is the brief's "sci-fi"
   line and the workforce lines, which the client replaced.
3. Tablet portrait hero has loose spacing between caption and button.
4. Shadow edge on the model base plates shows slight stippling at grazing
   angles.
5. Hero step captions are `<p>`, not headings, by design (h1 is the
   proposition line). Revisit if SEO wants the slogans as headings.
24. A mounted stage holds 300 to 500 MB of GPU memory and the hero's is
   mounted for the whole page: the page's GPU process stands at 1.0 to
   2.0 GB (notes F9). Not new, measured for the first time on 2026-10-10.
   Worth a look before the site goes to phones: the 4x still target and
   the 4096 shadow map are the large parts.
6. A git repository exists since 2026-10-06; the developer commits between rounds (the last before this round: 8e02642, "refined the landing hero page"). The round of 2026-10-14 is fdd8b86 on main, pushed to origin.
