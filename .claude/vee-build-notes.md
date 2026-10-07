# VEE.BUILD — notes, conflicts, decisions

## A. Needed from the client before launch

| # | Item | Why it blocks | Current handling |
| --- | --- | --- | --- |
| A1 | Contact email, phone, address, legal entity name | Footer, structured data, mailto fallback | `src/data/site.ts` → `contact` is null; footer shows nothing invented |
| A2 | Enquiry form destination | Forms cannot deliver | `PUBLIC_ENQUIRY_ENDPOINT` env var; unset = form reports it cannot send |
| A3 | Real photography: modules in transit, crane installs, handovers, factory | Section 7 is proof; cannot be faked | Gallery is manifest-driven (`src/data/gallery.ts`); empty slots render as labelled "awaiting photograph" frames |
| A4 | Clean export of the module render | Supplied JPEG carries a third-party "ReRender" watermark | Used once, uncropped, labelled "Visualisation"; replace file in `public/images/` |
| A5 | Capsule pod renders | Capsule page requirement | Page uses the real-time 3D maquette of the 10′/16′/20′ pods |
| A6 | Labour camp / prefab building renders | Prefab page requirement | Page uses the real-time 3D maquette |
| A7 | Logo files | Brand | Typeset wordmark + two-module mark (6×3 and 3×3 rectangles from the client sketch) |
| A8 | Production domain | Canonical URLs, sitemap, OG | Assumed `https://vee.build` in `astro.config.mjs` |
| A9 | Floor plans for The Homestead 500 and Duplex Prime 600 | Catalogue requires plans | Neutral module plan only (module outlines + overall dimensions) |
| A10 | Engineering references for Hook & Cleat, plug footing, L plinth, jack pier | 3D shows simplified stand-ins | See C1, C2 |

## B. Claims supplied by the client that need confirmation before public use

Tagged `CONFIRM:` in the data files.

1. **"Approved by BMPTC"** — the brief's spelling; the council is BMTPC
   (Building Materials & Technology Promotion Council). Site uses "BMTPC".
   Need the approval / PACS certificate reference.
2. **"Strongly promoted under MoHUA"** — needs the scheme or circular it refers to.
3. **"Patented"** structural principles — needs patent number or application status.
4. **"Get your house installed in one day!"** — on-site installation time;
   confirm the scope it applies to (single module? up to what size?).
5. **"Costs significantly less than traditional brick-and-mortar or
   structural bolt methods"** — comparative cost claim, no figure supplied.
6. **"Radically less water, minimal site energy"** — no figures supplied; none shown.
7. **"Built to the highest international structural metrics"** — which codes?

## C. Representation risks in 3D

- **C1 Hook & Cleat.** No drawing supplied. The render shows lifting hooks on
  the roof corners. The scene shows a simplified hook lug on an angle cleat at
  each top corner, labelled only "Hook & cleat". No mechanism is described in copy.
- **C2 Foundation.** Brief and sketch name three components but not how they
  relate. Scene shows plug footings at the corners, L plinth sections along
  the long edges and jack piers at mid-span, height set by a rotating thread.
  This arrangement is illustrative.
- **C3 "Core shell" in the factory.** Drawn since 2026-10-07 as the steel
  frame of the client's structure sequence (H7): corner columns, a ring beam
  top and bottom, a cross beam, floor joists. The insulation panels stand
  round it, the green formwork closes on them, and the concrete is cast
  between the two; the frame stays in the wall. Before that it was a plain
  steel box read as a casting core. Confirm that the frame is what the
  brief's "1 Core Shell Placed" means.
- **C4 Stacked configurations** (Villa, Apartment, High-Rise) are massing
  studies built from the two modules to the brief's description, not designs.
- **C5 Capsule pod width/height** are not supplied; only lengths are labelled.
- **C6 Upper-floor access.** In the configurator, in "How it works" 2.3 and
  wherever the visitor's build is shown, a shell on an upper floor gets a
  gallery outside its door and the building gets one outer staircase,
  placed by rule (I13). Nothing was supplied for either. As drawn: gallery
  1.5 m deep, boards on a steel frame carried off the shells, no posts; the
  staircase a dog-leg in a 2.0 × 4.5 m plan on four posts, flights 0.87 m
  wide, 187.5 mm risers and 250 mm goings, a landing 1.5 m deep at each
  floor and a half landing 1.0 m deep at the turn, the first flight longer
  to reach the ground. Illustrative, with no structural or code basis;
  confirm before it is presented as part of the product.
- **C7 Shell B openings.** No drawing of the 3 × 3 m shell was supplied. Its
  openings are ours: a window and the door on the front, a clerestory on the
  back and on one end.
- **C8 Factory yard.** The yard's plan (bays in one line, gantry on rails,
  shed at the far end, gate on the truck's lane, batching plant, stock) and
  the way each step is shown (piers travelling out to the corners, walers
  locking the formwork, the pump's hose over the top, a spray arch) are an
  illustration of the brief's seven lines, not a record of the real yard.

## D. Source conflicts and how they were resolved

| Topic | Brief (wins) | Other source | Resolution |
| --- | --- | --- | --- |
| 600 sq.ft. model | Duplex Prime, 2 floors | Wieldy: single-floor courtyard plan | Brief. Wieldy 600 plan not used. |
| 500 sq.ft. model | The Homestead, 2 bed 2 bath | Wieldy: no 500 layout | Brief specs, neutral module plan (A9). |
| Catalogue range | 200–600, five models | Sketch: 200 300 400 500 600 800 | Brief. 800 appears only in the footprint counter, where the brief also has it. |
| Differentiators | Six: end-to-end, insulated, sustainable, energy efficient, code compliant, affordable | Sketch adds "half the weight of others", "acoustic comforts"; Wieldy adds "4hr fire rated", "30–60% faster" | Brief's six. Acoustic comfort is inside "Insulated". Weight, fire rating and speed percentages are not published. |
| Module areas | Nominal 200 / 100 sq.ft. | Geometry: 18 m² = 193.8 sq.ft., 9 m² = 96.9 sq.ft. | Nominal sq.ft. as headline, true m² beside it. Confirm whether sq.ft. figures are external footprint or carpet area. |
| Pricing | None | Wieldy: ₹5L–₹25L | No pricing on the site. |
| Testimonials | None | Wieldy HTML has three unattributed quotes and calls itself a "design study" | Not used. |

## E. Copy edits made to brief text (meaning unchanged)

- "principals" → "principles".
- "advanced thermal and acoustic bridging" → "thermal and acoustic
  insulation". Thermal bridging is a defect, not a feature; publishing the
  original would read as an error to engineers. Confirm intended wording.
- "BMPTC" → "BMTPC" (see B1).
- Emoji bullets dropped from the six differentiators.

## F. Technical decisions

- **No legacy code.** The repository contained only `assets/`; there was no
  Wieldy codebase to evaluate. The pricing HTML is a single static file using
  Space Grotesk / Inter / IBM Plex Mono on navy — none of it is carried over.
- **Astro + React islands** rather than a client-rendered SPA: every route is
  static HTML (SEO, first paint), each section hydrates when it nears the
  viewport, and the three.js chunk is fetched after first paint.
- **No drei / GSAP / Lenis.** Scenes need boxes, a few extrusions, shadow
  mapping and a procedural environment; all available in three core and
  examples. Scroll smoothing is done by damping the progress value, not by
  taking over the scroll wheel.
- **Catalogue isometrics and plans are SVG**, generated from the same module
  data as the 3D scenes. Five WebGL viewers would cost a context each for no
  gain in understanding.
- **Pinned films use native `position: sticky`.** No scroll hijacking.
- **Hero:** the brief's four banners are four sets in one pinned film
  (modular home, capsule pods, workforce housing, institutional campus),
  each with its own landscape and light and a cut between them; the
  buildings arrive as the visitor scrolls. One proposition, not four
  adverts. (First built as four maquettes on one site line.)

### F2. Performance pass (2026-10-06)

Measured on the client's laptop (Intel Core Ultra 5 125H, Arc integrated
graphics, 1920 x 1200 at 150%, on battery) with a headless Edge on the same
GPU. Before: the hero cost 30-55 ms a frame (about 20 fps while scrolling)
and blocked the main thread for 4-5 s before the first picture.

- **Finish rebuilt (`src/three/kit/post.tsx`).** The EffectComposer chain
  (GTAO + UnrealBloom + OutputPass + grade pass, all at full resolution with
  4x MSAA half-float buffers) cost about 23 ms of a 32 ms frame. It is now:
  scene with 2x MSAA, a seven-level bloom pyramid starting at a quarter of
  the canvas, and one final pass (tone map, colour space, grade, grain).
  Bloom weights were fitted numerically to the old bloom (about 3% error).
- **Still picture versus moving picture, adaptive resolution.** As built on
  the first day, a moving frame had no ambient occlusion and dropped to 0.8,
  0.64 or 0.5 of the canvas when frames ran slow; both came back when the
  page stopped. The client saw exactly that ("quality drops while scrolling
  and comes back when it stops") and rejected it. Both are gone: see F3.
- **Hero sets.** Only the first set is built before the first frame. The
  other three are built and warmed (environment map, buffers, textures,
  shaders) once the boot screen has lifted, normally behind the title card.
- **Grass and trees thin out with distance** from each set's camera path
  (`eye` in `sets.tsx`): same placement, fewer segments or blades far away,
  fewer and larger leaf cards beyond 70 m. Grass is batched in 12 m squares
  so squares out of shot are culled. Distant tree lines no longer render
  into the shadow map (they were always outside the shadowed area).
- **Scene trees no longer re-render on a change of caption** (`Film.tsx`
  memoises the scene element). Before, each caption change re-ran the grass
  scatter for every set: a 100-500 ms stall at every hero cut.
- **Shaders compile before the first frame without blocking**
  (`compileAsync`), and the link-log read-back is development only.
- **Canvas measured by its own box** (`resize={{ offsetSize: true }}`): the
  hero scales its stage while the title card opens, and the canvas was being
  measured through that transform (14% more pixels, and a resize on pause).
- **Films below the hero hydrate on idle**, not on approach (`client:idle`).
  Each 3D scene still mounts only when its section nears the viewport.
- **Haze uniforms are written per stage before it draws.** They are shared
  by every material on the page; with two stages mounted the later one used
  to overwrite the earlier one's haze.
- **Boot screen** no longer waits 14 s when the page is reloaded part-way
  down (the hero is off screen there and never draws a first frame).
- Not done, possible next step: mount the next film during idle time so the
  remaining stall on entering each film (one frame of 50-180 ms) goes too.

### F3. Performance pass, second day (2026-10-07)

Client instruction: no visible change in quality between scrolling and
standing still, and a steady frame rate. So nothing below trades quality
for speed; each item removes work that did not show.

What a moving picture and a still picture now differ by: edges are drawn
with 2x multisampling while moving and 4x once still (cross-faded in over
0.28 s). Measured on the hero, the two differ by under half a grey level in
tone everywhere; grass blades, the thinnest things in shot, change by a few
levels pixel by pixel. Everything else is the same picture.

- **Ambient occlusion on every frame, at half resolution**, instead of only
  in the still picture at full resolution. With it only in the still, tree
  crowns went about a tenth darker and grass a twentieth each time scrolling
  stopped, and lighter again when it started: a large part of what the
  client saw. Half-size occlusion is within 0.7 of a grey level (mean) of the
  full-size result, less than the picture's own grain. It costs 0.75-1.0 ms
  of GPU and 0.4-0.9 ms of CPU a frame. It darkens the scene and no longer
  the sky behind an edge. The pass is fetched with the first stage rather
  than at the first pause.
- **A still picture drawn straight after a pre-warm had the wrong shadows.**
  Warming the hero's later sets draws them into the shadow map; the still
  picture that followed reused that map, so the first picture after load
  showed the farm with no shadows of its own (pale tree crowns, no long
  shadows), and the real ones arrived with the first scrolled frame. The
  stage now redraws the map whenever it has been used for something else.
  **This changes the hero as it first appears**: it opens with the shadows
  it always had while scrolling. If the unshadowed look was preferred, that
  is a lighting decision (sun height, which trees cast) to take on purpose.
- **Adaptive resolution removed.** One emergency step remains (three
  quarters of the canvas, below about 20 fps sustained for 2.5 s) so a
  device that cannot draw the page at all is not left with a slideshow.
  `?q=0` rules it out, `?q=1` shows it.
- **Sky drawn at half size behind the scene**, not inside the multisampled
  scene pass: about 1.1-1.4 ms a frame. The finished picture differs from a
  full-size sky by a twentieth of a grey level around the sun and nothing
  measurable elsewhere. Rows under the horizon where the sky is one flat
  colour are not drawn at all.
- **The multisampled depth buffer is no longer resolved** after every frame
  (three's default; nobody read it): 1.2-3.2 ms a frame on Direct3D.
- **Shadow map kept while nothing that casts has moved** and the light has
  not stepped (the key light now follows the action in steps of an eighth
  of the shadowed area, a whole number of shadow texels). About 1 ms and a
  third of the draw calls on those frames. In the hero something is being
  lowered into place for about two thirds of a steady scroll, so it applies
  to the rest.
- **Leaf cards get a depth-only pass first**, so only the nearest leaf at
  each pixel is lit instead of every card that happened to be drawn before
  it: about a third of the leaf shading, same picture.
- **Instanced meshes get their own copies of shared materials**
  (`instanced()` in `materials.ts`). A material used by both an instanced
  and a plain mesh made three re-derive its shader on every switch.
- **Bloom in 8 passes instead of 13** (one composite of all levels, weights
  fitted to the previous glow within 1% at the core), refreshed on alternate
  frames.

Left alone on purpose, because the picture would change: Lambert instead of
Standard shading on ground and foliage, a smaller-format colour buffer,
FXAA instead of multisampling, baking the sky to a texture, updating
shadows of moving parts at half rate.

### F4. Third pass: the cost of the changes of 2026-10-07 (section I)

Measured on the client laptop (Arc integrated graphics) with a headless Edge
on the same GPU, 1280 × 720 at DPR 1.5 (a 1920 × 1080 canvas). The last
commit and the working tree were served side by side as dev builds and
visited in turn. GPU time of one moving frame by timer query: one query per
frame, 24 frames per reading, the film's progress nudged on every frame so
that frames are being asked for. Medians of 3 to 5 alternating rounds,
range in brackets. The machine sat in its slower power state for most of
the session (the hero reads 9-11 ms here against 4-6 ms batched in the fast
state, F3), so read each row's two columns against each other, not against
the budget.

| Film, progress | Last commit | Now | Draw calls |
| --- | --- | --- | --- |
| Hero, farm (0.08) | 10.92 [10.89-11.01] | 11.28 [9.75-11.52] | 104 → 106-114 |
| Hero, pods (0.36) | 10.33 [10.23-11.32] | 10.32 [9.94-10.55] | 98 → 98 |
| Hero, workforce (0.7) | 8.45 [8.35-8.48] | 7.16 [6.67-7.43] | 108-116 → 82 |
| Hero, campus (0.95) | 8.50 [7.82-11.41] | 8.40 [8.03-9.40] | 85 → 59-67 |
| How it works, 600 sq.ft. (0.48) | 21.02 [20.51-21.08] | 19.86 [18.12-20.21] | 44 → 46-54 |
| How it works, apartment (0.84) | 12.66 [12.41-13.66] | 12.82 [12.21-14.49] | 50 → 52 |
| Your house (0.4) | 8.14 [7.81-9.14] | 7.79 [4.90-9.12] | 60-68 → 50-58 |
| Factory, the yard (0.02) | 9.38 [9.07-10.08] | 8.39 [6.69-8.92] | 185-193 → 174-182 |
| Factory, bays (0.18) | 23.25 [12.05-24.81] | 10.31 [9.85-11.24] | 226-234 → 207-215 |
| Factory, core shell (0.34) | 15.03 [10.91-21.93] | 9.34 [8.19-12.33] | 144-152 → 134-142 |
| Factory, concreting (0.53) | 13.04 [11.31-26.15] | 10.08 [9.30-10.57] | 251-259 → 235-243 |
| Factory, finishing (0.8) | 20.04 [11.60-22.78] | 11.18 [7.64-11.57] | 249-257 → 238-246 |
| Factory, dispatch (0.95) | 9.72 [8.50-12.13] | 9.07 [8.79-10.08] | 183-191 → 175-183 |
| Installation, mid-lift (0.5) | 9.62 [9.29-9.67] | 9.30 [8.64-9.43] | 106-114 → 80-88 |
| Installation, handover (1.0) | 9.20 [7.48-10.42] | 6.89 [5.28-8.63] | 88 → 70-78 |

- **One place got slower: the hero's farm set, by about 0.35 ms a frame
  (3%)**, in all three passes that measured it. The camera stands 8%
  farther back, as asked, so more of the meadow and its grass squares are
  in shot. Under the half millisecond that needs a decision, and the only
  way back is to show less meadow.
- **Factory tour: 9-11 ms where it was 13-23.** Seen from above there is no
  sky to draw (every row under the horizon is skipped, as before). Two
  things were found by switching one thing off at a time inside one page,
  round-robin: the open ground under the yard slab was shaded in full and
  then covered (the stage now draws open ground after everything else that
  is opaque, the same picture: about 0.7 ms, and it helps the installation
  too), and casting joints drawn as blended lines over the slab cost about
  0.7 ms and could hardly be seen (removed). Parts that stand still (the
  bay in formwork, set piers, stock) are no longer rewritten every frame.
- **Prefab sets of the hero: the grass is gone** and with it 26-34 draw
  calls; workforce 1.3 ms faster, campus the same within the spread.
- **How it works:** shells that are not part of the footprint on screen
  are no longer drawn (they used to be parked as zero-size instances), and
  there is one instanced mesh per door face in use instead of one per
  shell type: a millisecond less at the footprints, the same at the stacks,
  2-10 more draw calls.
- **Frame pacing**, a steady 1500 px/s scroll through each film, twice:
  hero 59 fps, longest frame 50 ms (last commit 33-50); how it works 59 fps,
  longest 51-52 ms (last commit 70-72: the shell geometries are now built
  in idle time before the film mounts); your house 57 fps, longest 67 ms
  (50-67); factory 60 fps, longest 17-33 ms (17); installation 60 fps,
  longest 17 ms (17). The one long frame in each is still the scene
  mounting (progress file, known issues).
- **Moving against still**, a frame captured while frames were being asked
  for against the settled frame at the same pose, on eight poses (hero farm
  and workforce, how it works, your house, three of the factory, the
  installation): the largest shift in tone over any twelfth of the picture
  is 0.27 of a grey level, and the mean difference pixel by pixel stays
  within 0.35 of a grey level of what two settled frames differ by (the
  grain). Nothing exists only at rest or only in motion.
- **Hero load.** The other three sets are now built and warmed as soon as
  the loading screen lifts, while the picture on the opening card
  stands still, and the first house is put together after that (at most
  4 s later, or at once if the visitor scrolls). Before, the assembly ran
  behind the closed card and the warming ran during it.
- **Not acted on, worth a look:** the same kind of blended line segments
  draw the blueprint grid of "How it works", the configurator's plot grid
  and the joints of every `Paving`. "How it works" is now the dearest film
  (about 20 ms a frame at the footprints in the slow power state, as it was).

### F5. Fourth pass: the cost of the second round of 2026-10-07 (I6, I8, I12-I15)

Same machine and method as F4; "before" is the tree as it stood before
this round (the opening card in mist included), served beside the working
tree and visited in turn. GPU time of one moving frame, medians of 4
alternating rounds, range in brackets.

| Film, progress | Before | Now | Draw calls |
| --- | --- | --- | --- |
| How it works, 600 sq.ft. (0.48) | 20.22 [19.91-20.66] | 20.21 [18.96-21.51] | 46-54 → 32-40 |
| How it works, 700 sq.ft. (0.53) | 21.04 [19.05-21.20] | 18.13 [17.38-20.77] | 46-54 → 32-40 |
| How it works, villa (0.71) | 16.50 [16.23-16.83] | 16.52 [16.06-16.90] | 52-60 → 59-67 |
| How it works, apartment (0.84) | 12.55 [12.15-12.95] | 11.51 [11.25-11.87] | 52-60 → 57-65 |
| How it works, high-rise (0.995) | 7.57 [7.36-7.79] | 7.33 [6.89-7.36] | 54-62 → 59-67 |
| Your house (0.14) | 8.06 [7.96-8.11] | 7.97 [7.50-7.98] | 64 → 72 |
| Your house (0.86) | 7.31 [7.18-7.33] | 7.36 [7.31-7.37] | 64 → 72 |

- **Nothing got slower.** The stacks carry more geometry than before
  (galleries, a staircase, rails with balusters, roofs, shades) in five
  more draw calls, and cost the same or less: the villa and the apartment
  are framed from the other front corner, and the high-rise's twelve
  instanced balconies are gone. The rows of 600 and 700 sq.ft. use fewer
  door faces than the U did, so fewer instanced meshes are drawn.
- "Your house" was first read as 1.1 ms slower. That was a different house:
  the two servers are different origins, and the working tree's had the
  High-Rise preset in its saved build from an earlier check. With the saved
  builds cleared on both, the numbers above. **When comparing two servers,
  clear `localStorage` on both first.**
- **Frame pacing**, a steady 1500 px/s scroll: how it works 59 fps in both
  (longest frame 66 ms now, 83 before); your house 51-54 fps over its 0.7 s
  in both (longest 117 ms in both, the scene mounting); "How are we
  different?" 60 fps, no frame over 20 ms.
- **Moving against still**, five poses: the 700 sq.ft. row 0.09 of a grey
  level at most over any twelfth of the picture; the villa 0.30, the
  apartment 0.59, the high-rise 0.98, your house 0.32. The shift is in the
  one region the building stands in and grows with the length of railing
  in shot. A moving frame is 2x multisampled and a still one 4x (the one
  difference the rule allows), and the rails' balusters are about a pixel
  wide. Not separated from other causes by a test of its own.
- **The layout rule** (`layoutAccess`) takes 2-6 ms for a preset, run
  outside the browser. Each stack's add-on geometry in "How it works" is
  built at idle before the film mounts (`prepare`), and kept with its
  layout, so it is built once.
- **Not acted on, still true:** "How it works" at the footprints is the
  dearest film (about 20 ms a frame in the slow power state).
- **Decks at the doors (I16)**, measured on its own afterwards against a
  copy of the tree with only that rule put back: your house (the sample,
  which gains a back porch) 7.75 → 7.92 and 7.13 → 7.21 ms, the
  installation's handover 8.50 → 7.35 ms, 4 rounds each, the ranges of
  before and after overlapping throughout (the machine changed power state
  during the run). No difference that can be told from the spread; draw
  calls the same.

### F6. The studio opening of the hero (I18)

Same machine and method. "Before" is the tree with the opening in mist over
the full picture, served beside the working tree. GPU time of one moving
frame, medians of 4 alternating rounds, range in brackets; the machine
changed power state during the runs, which is the width of the ranges.

| Hero, where in the opening card's scroll | Before | Now | Draw calls |
| --- | --- | --- | --- |
| At rest (0) | 11.48 [5.58-25.65] | 3.96 [3.78-4.01] | 108-116 → 41-49 |
| A quarter through | 11.37 [5.50-11.48] | 11.29 [5.47-11.30] | same |
| Half-way | 11.36 [6.12-11.50] | 12.29 [6.53-12.85] | same |
| 0.7 | 11.37 [5.72-11.48] | 12.65 [6.97-13.09] | same |
| The film itself, farm (0.08) | 11.19 [6.70-11.31] | 11.13 [5.70-11.24] | same |

- **At rest the frame costs a third of what it did**: the land and the sky
  are not drawn.
- **Half-way and later in the opening's scroll a frame costs about 1 ms
  more** (0.9-1.3). While the clearing is open the land's shaders can
  discard a fragment, and a shader that can discard gives up part of early
  depth rejection; the land (grass above all) is where the overdraw is.
  It lasts for the opening's scroll and no longer.
- **The film itself is unchanged**, but only because the test is compiled
  in while a clearing is open and not otherwise. With it always in the
  shader (the first version) the farm set read 12.48 against 11.16 with no
  clearing open at all, and the opening 14-15 ms: found by this
  measurement, and by having first timed the wrong scroll positions (the
  film's travel is its length less the pinned screen less the card).
- **Frame pacing**, 1500 px/s through the whole hero, three passes each:
  no frame over 30 ms inside the opening in either build; the one long
  frame is where the next film mounts (50-68 ms, 183 ms once on a first
  pass of the new build, as seen on first passes before).
- **Mist**, scrolled with it shown and hidden in turn inside one page,
  eight rounds each: no frame over 20 ms in 640 either way.
- **Moving against still**, four poses (at rest, 0.3, 0.6, the farm set):
  the largest shift in tone over any twelfth of the picture 0.30 of a grey
  level, against 0.22-0.26 between two settled frames (the mist drifts).
- **Not measured**: what the browser spends compositing a canvas that is
  mostly transparent over the page (the timer sees only the 3D).

## G. Decisions made during the build

- **Project category is a four-option radio group, not a dropdown.** Same
  values as the brief; all four are visible at once and easier on touch.
  Swap for a `<select>` if the client wants the literal dropdown.
- **Hero captions scroll with the camera** (pinned for about 4.4 screens)
  rather than auto-rotating on a timer. The brief asks for scroll-driven
  transitions; a timer would move content the visitor did not ask to move.
- **Gallery placeholders are visible.** Five frames marked "Photograph to be
  added" sit beside the one supplied render. Remove the `awaiting` entries in
  `src/data/gallery.ts` to hide them; do not fill them with stock or
  generated images.
- **The supplied render is shown uncropped**, watermark included, labelled
  "Visualisation". Cropping the watermark out was not done on purpose.
- **Catalogue plans.** 01–03 use the room zoning of the supplied reference
  layouts (rooms only; no doors or furniture, because the render and the
  reference plan disagree on where the entrance is). 04–05 show module
  outlines only.
- **Capsule and Prefab pages** carry only what the brief states (lengths,
  G+1, G+2, 36 ft panels, the four hero lines). The line "will be published
  on this page at launch" is the only forward-looking statement; confirm.
- **Partnership page copy** ("what you bring", the four-step sequence) is
  drafted from the system description. No commercial terms were supplied
  and none are stated. Needs client review.
- **"Insulation panels are cast into the wall, not fixed on afterwards"**
  (Difference, row 2) is inferred from the factory sequence in the brief
  (panels inserted before concreting). Confirm.
- **Open Graph image** is drawn with system fonts by `scripts/og-image.mjs`,
  not the brand typeface. Replace with a designed image if wanted.
- **Section rail** (right edge, desktop only) shows ticks; labels appear on
  hover and focus so it never sits on top of content.

## H. New client references (2026-10-06, assets/new assets)

Received as images of the client's SketchUp model "Manufacturing house".
Used for reference only; nothing in assets/ is shipped.

| Ref | What it shows | Used for |
| --- | --- | --- |
| H1 `footing 3.jpg`, Scenario 1 screenshots | Precast footing: square pad, sloped top, collar, square pedestal set at one corner of the pad (eccentric). Pedestal 520 / 820 / 1120 mm for 300 / 600 / 900 mm above ground (so 220 mm sits below ground). A 720 mm figure appears on the 300 mm variant, meaning not stated. | Footing geometry everywhere; three heights in the configurator. |
| H2 `L PLINTH.jpg`, Scenario 2 screenshots | Footings plus precast L plinth segments between them: 1425 mm pieces on the 6 m side, 1350 mm pieces on the 3 m side, upstand 520 / 820 / 1120 mm. 4 x 1425 + 300 = 6000 and 2 x 1350 + 300 = 3000, which implies a 300 mm pedestal at each corner. | L plinth geometry and layout. |
| H3 Foundation sequence (scenes 1-5) | Site marked, four corner pits dug with sloped sides, footings set in the pits with the pedestal at the module corner, pits backfilled, pedestal tops left exposed. | Site preparation beat in the delivery film. |
| H4 Hook & cleat close-ups | Each top corner: a tapered steel lug with an oblong eye, set diagonally, with two pins beside it. Along each 6 m roof edge: about five small cleats, each a block with two small eyes, roughly 1 m apart. Roof is flat exposed-aggregate concrete. | Module geometry (replaces the torus loops), components film. |
| H5 Add-on board | Deck platform (dark timber) on posts with handrail on two sides and steps at one end; straight stair units with side stringers in three lengths; a door and window shade as three translucent blue panels in a frame on brackets; a single sloped roof panel; gridded French door and windows. | Add-on models in the configurator and films. |
| H6 Finished module views | Front: two-pane window, glazed door with gridded sidelights; clerestory on the short side; small entrance landing with black balusters and steps; lattice skirting under the deck. | Module openings, landing detail. |
| H7 Structure sequence | Steel frame: square-section corner columns, top ring beam with a mid cross beam, bottom ring frame with about nine floor joists, anchor bars projecting; then wire-mesh wall panels with white insulation cores, openings framed for door and window. | Factory stations (core shell, insulation panels) and the components film. Colours in the model are layer colours, not finishes. |
| H8 `CAPSULE HOUSE.pdf` (9 views, received 17:52) | The finished single shell, 6 x 3 m: rendered walls; on the front a two-pane sliding window left of centre and, on the right third, a door (glazed above, letterbox, two panels below) between two gridded sidelights, all in white surrounds; a clerestory on the right end, the left end blank; on the back a sliding window and a small high window. A low landing in front of the door, three bays about 1 m square: timber frame, open black lattice deck, black rail of rectangular loops under a heavy handrail on the front of two bays and on both ends, timber steps down from the third bay. A precast block under each corner on a backfilled patch, lawn up to the walls. Flat roof with hooks and cleats. | The hero's house only (`src/three/kit/modelhome.tsx`). Client instruction 2026-10-06: make the hero building like this, keep the sloped roof and the solar panels, colours left to us. |
| H9 `WhatsApp Image 2026-10-06 at 17.51.11.jpeg` | Solar panels in two arrays of three on aluminium rails over a ribbed, sloped metal roof. | The hero house's roof: standing seams on the mono-pitch roof, the six panels carried on rails. |

Open questions from H:
- H-a: Is the jack pier still part of the system, or do the pedestals replace it? The new model shows no jack. Kept as a levelling head on the pedestal (illustrative) until confirmed.
- H-b: Where two shells sit side by side, the site shows one combined footing at shared corners and one plinth run on the shared edge (the client asked whether this is possible). Shown as illustrative; engineer to confirm the combined footing size and the shared plinth section.
- H-c: The 720 mm dimension on the 300 mm footing.
- H-d: **Resolved for the openings, 2026-10-07** (client: one door per block, as the original house; see I3). The H8 openings are now the kit's shell everywhere. Still open: whether H8's low landing with the loop rail should replace the rule-based deck with its vertical-baluster rail outside the hero. The hero's house keeps its own model (`modelhome.tsx`): rendered walls to the roof edge, no dark fascia.
- H-e: Opening positions and sizes in H8 are measured on the front elevation (page 1), not taken from dimensioned drawings. Over the frames: window 1.5 m wide from 1.74 m off the left corner, sidelights 0.4 m, door 0.93 m, the door group ending 0.29 m short of the right corner; all heads 0.9 m below the roof edge (2.1 m above the underside); landing 3.24 x 1.05 m in three bays, rail 0.95 m. The walls are rendered from foot to roof edge with a plain band top and bottom, as drawn (the kit's dark fascia is not used on this house). The model shows a flat roof; the sloped roof (slimmer edge) and the panels are kept on it at the client's request. Wall, timber and roof colours are ours. The hero camera looked at the front about 25 degrees off square; since the house was turned towards the sun on 2026-10-07 it is about 39 (I1).

## I. Client instructions of 2026-10-07 and how they were carried out

Relayed by the developer (Jana) in two messages the same day, with
screenshots and one forwarded message from the client (Trinath, 2026-10-06
17:41). The second message corrected two things built from the first
(I4, I9); what stands below is the result.

1. **Hero house turned towards the sun, a longer path, a touch farther
   back.** The house and everything that belongs to it (footings, backfill,
   porch lamp) are turned 0.24 rad (about 14°) about its centre, front
   towards the low sun. The stepping stones leave the steps into the
   meadow and come round to the camera, nine points instead of five, and
   the grass stands back from them. The camera is 8% farther from its
   target. H-e's "about 25 degrees off square" is now about 39.
2. **Prefab sets (workforce, institutional) without grass.** The tufts only
   ever covered a patch in front of the camera. Both sets, in the hero and
   on `/prefab/`, now stand on plain ground. The capsule set keeps its
   grass: it was not named, and there it covers the whole foreground.
3. **One door per shell.** The complaint was the second door on the end of
   every Shell A. The kit's shell now has the H8 openings (window, door
   between two sidelights, clerestory on one end, window and small high
   window on the back, the other end blank) and exactly one door. Where a
   shell's front is built against, the door cannot stay there, so one rule
   places it (`doorFaces`, `src/build/model.ts`): the front if it is
   free; otherwise a free face, the street side first; a turned shell at
   the end of a row of turned shells follows its row; between equal faces
   an upper shell takes one that opens onto a roof. A shell with every face
   built against has no door (`none`). This keeps rows of turned shells
   (workforce housing, the 800 sq.ft. footprint, the three stacks) opening
   onto the street as before, with one door each instead of two. An end
   that takes the door also takes a small window; a shell whose door has
   left the front has two windows there. Those two details are ours.
   Shell B: C7. In "How it works" a shell's door changes face half-way
   through a move between footprints; an upper lobby module of a stack is
   drawn without a door (reached from the floor it serves).
4. **"White background reflecting": captions are plain text on the
   picture.** Two things produced the haze: a veil in the page colour laid
   over the left of every film to keep captions legible, and the frosted
   header band. Neither is laid over a picture any more. A first answer,
   captions and header on ink plates, was rejected the same day ("dont
   keep black boxes, keep only the text"), so legibility now comes from the
   scenes: the factory tour is seen from above with clear slab under the
   caption column and the header (I9); the installation, in evening light
   on dark ground, takes light text; "How it works" 2.1 is framed from the
   shell's free end; dark stages keep a vignette in their own tone. On
   narrow screens studio films still fade their lower part to the page
   under the caption; the factory does not. The small callouts placed from
   3D keep their pills, as before. Not touched: the hero on narrow screens,
   where the caption still stands over the meadow (progress file, issue 9).
5. **Green instead of orange** (client: "I strongly recommend that we use
   the fluorescent green color instead of orange. As the page moves into
   darker color the green will elevate or if you think we should wait and
   see the overall effect then I am game"). Developer's instruction: use it
   where it suits, do not let it look generated, no large decision without
   asking. Done: the accent follows its ground. On paper it stays
   vermilion (a fluorescent green has almost no contrast on warm paper);
   on ink it is hi-vis yellow-green `#c8f031`, the colour of site safety
   wear, used flat. That covers the capsule step of the hero, "Building
   components", "How are we different?", "Your house", the factory tour's
   title screen, the installation's captions, delivery, the close, contact,
   the footer and the mobile menu. In 3D only the jack nuts of "Building
   components" follow (`mat.accentInk`).
   **CONFIRM with the client: green on ink only (as built), or green
   everywhere.** The second needs a darker green for text on paper and is a
   one-file change (`src/styles/tokens.css`), plus `mat.accent` and the
   configurator's highlight colours in 3D.
6. **"How are we different?"**, built three times. The pinned index of
   that morning (six words down the left, one point at a time) was
   rejected in the evening ("not satisfied at all"), with a reference: a
   comparison page with a row of large figures, a two-column table with the
   alternative struck through, and six numbered cards. As it stands: on
   paper, in the document's flow, everything on show. A large head; a
   ledger of six cells divided by hairlines (number, word, claim, detail,
   referenced bodies); then the three comparisons the brief draws, the
   claim on the left and what it replaces on the right, struck through.
   Each part comes in once as it is scrolled to (the head's lines rise out
   of a mask, each cell's rule is drawn, the strike runs through); a point
   and its comparison light up together under the pointer. Without script,
   with reduced motion or `?still` nothing is hidden and nothing moves.
   Content: every word is the brief's. The reference's figures (a faster
   build in per cent, a weight ratio, a fire rating in hours) and its
   headline are the earlier brand's and are not in the VEE.BUILD brief:
   none of them is used. The three struck phrases are lifted from the
   brief's own sentences ("No fragmented subcontractors." → "Fragmented
   subcontractors"; "Others rely on lightweight metal or composite sheets."
   → "Lightweight metal or composite sheets"; "Compared with brick-and-mortar
   and structural bolt construction." → "Brick-and-mortar and structural
   bolt construction"); the full sentences are no longer shown. **CONFIRM
   if the client wants figures in this section: they need a source.**
7. **Configurator.**
   - *Steps could not be added.* They were being placed but never drawn: the
     steps were merged into a geometry without material groups and given
     two materials, which draws nothing. They are drawn now, in the
     configurator and in every scene that shows the build. Steps stand at
     the shell's door when it opens onto that deck.
   - *Placing by hand* starts from what the automatic layout has standing
     (it used to clear the house). The steps tool works on a deck or on a
     bare wall, where it places the deck with them. Walls are picked by
     where the hit lies on the shell, not by the triangle's normal (a click
     on a window jamb read as a click on the end wall).
   - *Select and remove.* With Select, a click on a deck, steps, a shade, a
     sloped roof or solar panels selects that piece (outlined, with a Remove
     button; Delete works). Removing one from an automatic layout turns the
     rest into hand placements first. A deck takes its steps with it. A
     shell is refused only when another shell depends on it: one resting on
     it, or the house splitting in two.
   - *Upper floors.* Every upper shell has its one door and a way to it,
     added on their own and not removable while the shell stands (C6). The
     rule was rewritten the same evening: I13.
   - The plan drawing marks each shell's door, the galleries of the floor
     shown and the staircases.
8. **"Your house".** Two captions now (the third became the factory tour's
   title, I9). Dragging turns the house by hand (sideways on touch, so the
   page still scrolls), and the hand's turn is let go as the page scrolls
   on. The camera moves, not the house, so its shadow map is still drawn
   once. The scroll's own turn was half-way round at first, which left the
   house showing its back for the whole second caption ("rotates for
   longer and leaves at backside position"). Now the camera goes from the
   front corner round to square on the front, about 45 degrees, and the
   film is 2.2 screens long instead of 2.8. It stays on the near side of
   the front: past it the camera looks into the key light and the studio
   floor glares (a hand can still turn it there). The framing is centred
   on the whole build, staircase and decks included, and stands further
   back, so a wide house seen square on keeps clear of the caption.
9. **Factory tour: a full-screen title, then the whole tour from above.**
   The tour stays on the main page, after "Your house". (It was first
   moved to a page of its own, from a sentence read too literally; the
   client corrected that the same day and the page is gone.) What was the
   last caption of "Your house" is now the tour's title screen: ink from
   edge to edge with "See how we manufacture it.", which opens from the
   middle of the picture onto the yard seen from above. The film then keeps
   that angle to the end: the camera comes in over the gate and moves from
   bay to bay, never down to the ground. The yard was laid out again for
   that view (C8): the camera looks up the line, shells stand across it
   with their fronts to the camera, the side of the line under the captions
   is clear slab, the gate is in the near wall on the truck's lane, and the
   finished homes stand beside the shed at the far end.
   Each of the brief's steps was gone through. Changed: the four piers now
   travel out from the middle of the bay to their corners before their
   heads are screwed level ("position dynamically"); the core shell is the
   steel frame (C3) instead of a box; the walers run on round the formwork
   and come off before the boards fall; the pump stands on the lane side
   with its hose over the formwork; the spray arch travels along the shell,
   across the picture, and sprays the visitor's chosen finish; the mobile
   crane lies stowed until the shell is finished, then lifts it, turns it a
   quarter to lie along the trailer and sets it down; the truck leaves
   through the gate. The visitor's build in the yard now shows its
   hand-placed add-ons, trim and foundation (they were dropped before).
   Unchanged: the order, the timings and all caption text.
10. **Opening card (hero).** Built three times on 2026-10-07; the third, as it stands, is I18. First: the card
    closed from top and bottom like a shutter, and was replaced by a window
    onto the running film that grew to fill the screen. The client found
    that too plain ("instead of a box") and sent a reference picture: a
    full picture of the house dissolving into the page through mist, the
    headline fixed on the left, the shells called out. Second, as it
    stands: the whole first set is on screen from the start and stands in
    mist in the page colour on the left and at the foot (the lower half on
    narrow screens), where the words are. The headline rises out of a mask
    line by line when the loading screen lifts while the mist, thicker
    behind that screen, draws back off the house. Scrolling draws the mist
    off to the side and thins it, the words drift up and go, and the film's
    first caption arrives on the clear picture. The house carries a label
    placed from 3D, "Shell A · 6 m × 3 m × 3 m" (it is one Shell A), and
    under the sentence the two shells are drawn to one scale as outline
    boxes with their names and sizes from `src/data/system.ts`.
    Not taken from the reference: its headline ("Endless possibilities",
    against the copy rule; ours is unchanged), its buttons on the card (the
    film's first caption has them one screen on) and its second leader to a
    Shell B, which is not in this picture.
    This is the one place where the page colour is laid over a picture, by
    the client's own request, against I4; the rule in `.claude/CLAUDE.md`
    names it as the exception.
    Cost: the WebGL frame is the same frame (the camera and the set are
    untouched; one label is projected). The mist is three DOM layers moved
    by the compositor. Scrolling the card at 700 px/s, mist shown and
    hidden in turn inside one page, ten rounds each: 1 frame over 20 ms in
    799 with it, 1 in 798 without. A first version that put one opacity on
    the three layers together dropped frames (23 in 456 against 8 in 472)
    and was changed to one opacity per layer. The mist drifts slowly while
    the card is up, which keeps the compositor (not the 3D) drawing at
    rest; it stops under reduced motion and `?still`, and the layers are
    removed once the card has opened.
11. **Found on the way: the hero went blank** after scrolling far down the
    page and back up. The hero's scene stays mounted and reports "ready"
    once; its stage was hidden when it left the neighbourhood of the
    viewport and never shown again. Fixed in `Film.tsx`.

12. **"How it works" 2.2: the 600 and 700 sq.ft. footprints** (client, the
    same evening: "not looking good"). They were a U (two turned shells
    with one across the back) and the U with a Shell B in its court. Now
    three shells stand side by side, short end to the street, and the
    700 adds the Shell B at the end of the row, flush with the front: the
    row grows by a shell at a time into the 800, which is the ground floor
    of every stack. Recipes and areas are unchanged.
13. **One staircase, beside the building.** Two instructions the same
    evening. First: "fewer turns, only one way, no building has two-side
    steps"; a straight flight for each floor was built. Then, while that
    was being checked: "always keep the steps placed side (more like
    having a U bend) to the building, not taking much space". As it
    stands, for the configurator and every scene that shows a stacked
    building:
    - A building has **one** outer staircase: a dog-leg in a 2.0 × 4.5 m
      plan (C6), its long side against the building's flank, its landings
      at the front corner where the gallery ends (or at the edge of an open
      roof, where the door opens onto one).
    - Each upper floor is walked on a 1.5 m grid. The open roof of the
      floor below is already a floor; a gallery can hang just outside it.
      The galleries built are the shortest that join every door of the
      floor to the staircase, round corners and across set-backs if they
      must. They are carried off the shells: no posts.
    - Every place a landing can meet a floor is tried, turned every way.
      The one that needs the least gallery wins; standing against the
      flank is preferred to standing free; in front of a door, across a
      deck or its steps, or outside the plot only if nothing else is left.
    - The upper part of a **stair lobby** has no door of its own: Shell B
      standing on Shell B beside the building is the brief's "stair lobby
      module", the way up inside. (Before, each got a balcony and, in the
      High-Rise preset, a second staircase.) This is the one case besides
      a fully enclosed shell where a shell is drawn without a door.
    - A layout with an upper floor asks for a plot one cell wider on each
      side than its footprint, so the staircase has somewhere to stand.
    Limits: a building whose tallest part can be reached from no floor
    square that exists at every floor (a tower set back on all sides) gets
    galleries and no staircase; doors cut off from the rest of their floor
    keep a balcony of their own.
14. **"How it works" 2.3: the stacks.** (a) *"Something randomly
    floating"*: a canopy slab meant for the lobby door hung 3 m in front of
    it, because the lobby is recessed. Gone. (b) *"The top is not in our
    add-ons"*: the villa's roof was a flat slab of our own. It and the same
    slab on the high-rise's penthouse are replaced by the brief's sloped
    roof on each top Shell A, and shades stand over every street-side door
    that has no gallery over it (the lobby's included, where the canopy
    was). (c) *"Add steps"*: each stack now has the galleries and the one
    staircase of I13, laid out by the same rule as the configurator, and
    rails round its open roofs from the handrail add-on. The high-rise's
    twelve separate balconies became those galleries (they are carried off
    the shells, so the caption's "cantilevered balconies" still holds).
    The three stacks are seen from the other front corner, where the
    staircase stands; the camera crosses the front between the last
    footprint and the villa, standing back as it passes square on. From
    there the lobby's lower floors are behind the row; its top floor shows.
15. **Add-ons only.** Following (b): nothing is drawn on a building beyond
    its shells but the brief's add-ons and the access of I13
    (`.claude/CLAUDE.md`, brand rules).
16. **Decks and steps follow the doors** (client, late on 2026-10-07:
    "check the staircase placement for Studio Max and Urban Suite, it is
    not right"). The deck used to run along one side of the house, the
    side most doors opened to, with one flight of steps there. That left
    doors on other sides opening onto a 0.7 m drop (Studio Max's street
    door), decks where no door opened (the same house's nook), and, where
    a preset forced the deck's side, steps on a side with no door at all
    (Urban Suite). Now, with the deck add-on on: a deck outside every
    ground-floor door, along that side of its shell; one flight of steps
    for each stretch of deck, at a door (the street side first, Shell A
    before Shell B); and the deck-side control adds a deck along the side
    asked for, on top of those. Consequences:
    - *Studio Max* has a deck and steps at its street door (Shell B) and at
      its end door (Shell A, whose front door position is built against by
      Shell B): two short decks, two flights. Gathering both doors on one
      side would need a rule that moves a free street-facing door to a
      side; not done, and worth asking the client.
    - *Urban Suite* is laid out as the catalogue has it, two shells side by
      side with their short ends to the street (the preset had turned them
      back to back for the old two-door shell), so both doors open onto one
      street deck with one flight.
    - *The Homestead and Duplex Prime* gain a back porch: their back shell
      faces the garden and its door had nothing outside it. The Homestead
      is the sample house, so this shows in "Your house", the factory yard
      and the installation.
    - Presets stand in the middle of their plot's depth, with a row to
      spare behind as well as in front, so the back porch is inside it.
    Limit: a shell the visitor sets against the plot's edge with its door
    facing out gets a deck beyond the plot.
17. **"How are we different?" and "Build your own" read as one section**
    (same message): both were large black headings on the same paper. The
    first now stands on the deeper paper tone (`--bg-2`) and ends on a
    rule; the page returns to its own colour for "Build your own".
18. **The hero opens on the house alone** (client, 2026-10-07, last
    message of the day, his own idea, with the mist kept at his wish: "we
    show that text, and the house alone; the background comes with the
    animation while scrolling"; "keeping the mist adds an impression").
    - *At rest:* the headline, the two shells and, beside them, the house
      by itself on a studio backdrop: the page colour with a pool of light
      and the faintest line where floor meets wall, the house's shadow on
      a floor that is not there, mist lying low at its feet. No land, no
      sky. It stands a little nearer and higher than in the film. It is
      still put together on load, and still carries its label.
    - *On scroll:* the land spreads out from under the house to the
      horizon (slowly round the house, fast to the horizon), the sky comes
      up behind it, and a veil of mist rises over the change and clears.
      The camera eases back to the film's framing. Then the first caption.
    - *How:* the stage's canvas is clear wherever the scene has drawn
      nothing, so the studio is CSS behind it. The sky had a blend amount
      already. The land keeps inside a clearing through the haze shader
      every material shares (`kit/atmosphere.ts`), so it is properly behind
      and in front of the house as it arrives; a fragment outside is
      discarded before it is shaded. The mist is the DOM layers of I10,
      rearranged.
    - *Light:* the house keeps the sunset light throughout, so nothing
      jumps when the world appears. It is lit from behind and reads warm
      and a little dark against the pale studio.
    - The bare floor's shadow is cut short a few metres from the house (the
      sun is at 3 degrees: it would run for fifty) and goes as the ground
      comes, because the trees' long shadows would fall across it first.
    - Cost: F6.
