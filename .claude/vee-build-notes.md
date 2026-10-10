# VEE.BUILD — notes, conflicts, decisions

## A. Needed from the client before launch

| # | Item | Why it blocks | Current handling |
| --- | --- | --- | --- |
| A1 | Contact email, phone, address, legal entity name | Footer, structured data, mailto fallback | `src/data/site.ts` → `contact` is null; footer shows nothing invented |
| A2 | Enquiry form destination | Forms cannot deliver | `PUBLIC_ENQUIRY_ENDPOINT` env var; unset = form reports it cannot send |
| A3 | Real photography: modules in transit, crane installs, handovers, factory | Section 7 is proof; cannot be faked | Gallery is manifest-driven (`src/data/gallery.ts`); empty slots render as labelled "awaiting photograph" frames |
| A4 | Clean export of the module render | Supplied JPEG carries a third-party "ReRender" watermark | Used once, uncropped, labelled "Visualisation"; replace file in `public/images/` |
| A5 | Capsule home renders of VEE.BUILD's own | Capsule page requirement | Three reference renders came on 2026-10-09 (another maker's product, one with its watermark): used for form only (C9). The page shows the real-time model built after them, in 10′/16′/20′ |
| A6 | Labour camp / prefab building renders | Prefab page requirement | Page uses the real-time 3D maquette |
| A7 | Logo files | Brand | Typeset wordmark + two-module mark (6×3 and 3×3 rectangles from the client sketch) |
| A8 | Production domain | Canonical URLs, sitemap, OG | Assumed `https://vee.build` in `astro.config.mjs` |
| A9 | Floor plans for The Homestead 500 and Duplex Prime 600 | Catalogue requires plans | Neutral module plan only (module outlines + overall dimensions) |
| A10 | Engineering references for Hook & Cleat, plug footing, L plinth, jack pier | 3D shows simplified stand-ins | See C1, C2 |
| A11 | Where "Investors" and "Technology" lead; a link for Hemisphere One | Bottom band (J2) | Investors opens the enquiry form, Technology the "How it works" film; the logo is not a link |

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
8. **"Enveloped in concrete!"** (capsule home, client 2026-10-09) — that the
   capsule's shell is concrete. Nothing about its construction is supplied.
9. **"Built in days!"** (prefab building, same) — for what size of building,
   and counted from what.
10. **"Net zero"** and **"off-grid capability"** (How it works 2.4, same) —
    no energy figures supplied; the picture shows solar arrays on two roofs.
11. **"High-grade steel, 3D EPS insulation, and advanced micro-concrete"**,
    **"eco-friendly concrete shells"** (Componentized building 3.2, same) —
    grades, the panel product and the mix are not supplied.
12. **"Installed in one day!"** replaces "Get your house installed in one
    day!" in the hero: the same claim as B4.
13. The word **"patented"** is no longer on the site: the sentence that
    carried it (2.1, hook & cleat) was replaced by the client's 2.2 (B3
    stands for when it comes back).

## C. Representation risks in 3D

- **C1 Hook & Cleat.** No drawing supplied. The render shows lifting hooks on
  the roof corners. The scene shows a simplified hook lug on an angle cleat at
  each top corner, labelled only "Hook & cleat". No mechanism is described in copy.
- **C2 Foundation.** Brief and sketch name three components but not how they
  relate. As shown in "Componentized building" since 2026-10-10: plug
  footings at the corners and L plinth pieces between them, the shell
  sitting on both, set first; a jack pier (a precast pad with a screw jack
  on it) under each deck post and under each stringer of the steps, set
  when the add-on that lands on it is (client, 2026-10-09: "the jack pier
  has to come where deck post, stair frame land"; developer, 2026-10-10:
  "we don't install the jack pier in the starting, we include that when
  adding add-ons"). Under the steps each pier stands 0.7 m along from the
  foot, where the stringer's underside is 157 mm off the ground, and its
  head carries the stringer. Pad sizes, jack heights and that position are
  ours. The ground is drawn see-through while the footings and plinth go
  in and closes round them afterwards. The configurator's foundation
  (`kit/house.tsx`) still has a jack head on each pedestal and none under
  the deck (K8).
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
- **C9 Capsule home.** Drawn after three reference renders of another
  maker's capsule (client, 2026-10-09): a white hull with rounded corners
  in segments with dark joints, black-framed glazing wrapped round each
  end, a door bay in the long side with light lines beside it, a line of
  light at the foot, jack legs, two fold-down timber steps. The 10′ pod
  has glazing round one end only and a square light in the other; the
  back has a ribbon of high glazing. Width 3.0 m, hull 2.75 m on 0.4 m
  legs, corner radius 0.8 m: all ours, as is every opening. The lit
  glazing is a glow, not a room: nothing is modelled inside.
- **C10 The module's three parts** (Componentized building 3.2). Steel
  frame: a ring beam at the floor with nine joists, a column at each
  corner carrying a lifting lug, and a ring round the top on the four
  sides with nothing across the middle (developer, 2026-10-10, twice:
  D, L6). Described once, in `kit/shell.ts`, which the factory draws
  from too (M8). EPS as 18 wall
  panels, six floor segments and six roof segments, the roof's lying on
  the walls. The concrete as a 35 mm coat over walls and roof and a
  topping on the floor, put on by a travelling portal with spray bars.
  Door, panes, sidelights and frames are the standard shell's (H8), fitted
  last, with the cleats along the roof's long edges. Thicknesses, segment
  sizes and the portal are illustrations of the client's three sentences,
  not a record of the process.
- **C8 Factory yard.** Since 2026-10-10 (M8): one working bay, the truck's
  lane along its front to a gate, a mobile crane behind it, a trailer
  pump, a spray gantry on rails, a shed with finished shells and two
  shells standing part-made behind. The plan, and the way each step is
  shown (piers travelling out to the corners, boards on soldiers with
  props, walers locking them, the pump's line over the top, the gantry,
  the four-point lifting frame) are an illustration of the client's order
  of work, not a record of the real yard. The lifting frame follows the
  client's photograph; its sizes, and every machine's, are ours.

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
| Hero lines | "Get your house installed in one day!", "Live a sci-fi life.", "Insulated and comfortable living for your workforce.", "Lean, clean, resilient…" | Client, 2026-10-09: a heading and a line for each of three kinds | Latest instruction. The brief's first three lines are gone; the institutional line stays, set as statements (E). |
| Stacked buildings | Three: The Villa, The Apartment, High-Rise Block | Client, 2026-10-09: remove The Apartment, "mid-rise" for "high-rise" | "How it works" shows two. The configurator keeps all three as presets (the client found it "just great" bar the name). |
| Section 3 | "Building components", "Three simple steps", "Insulation" | Client, 2026-10-09: "Componentized building", "Foundation. Module. Add-on's.", "Module" | Latest instruction. |
| Steel frame | H7: a ring beam at the roof with a cross beam, as well as the one at the floor | Developer, 2026-10-10: "we don't have side bars in top, only in bottom" | Latest instruction, twice that day: first "no bars in top" (K4), then "top steel bar only 4 sides, not in centre" (L6). A ring round the top, no beam across. The factory draws the same frame from the same file (M8). |
| Factory view | Client, 2026-10-07: seen from above throughout, at the angle it opens on | Client, 2026-10-10: "a more diagonal angle, from above and from the side", the factory smaller, the opening redesigned | Latest instruction (M8). |
| Factory order | Brief: gates, assembly bays, core shell, insulation, formwork, concreting, de-shuttering, finishing line | Client, 2026-10-10: begins with "Structural frame – core shell"; doors, windows and spray in the same bay; lifted by four hooks | Latest instruction. The gates and the bays' activation are not shown. |
| Small titles on paper | Developer, 2026-10-10 morning: green everywhere as a text colour (a deep tone on paper) | The same day, afternoon: "if the white background doesn't support the green, use orange only there" | Latest instruction: vermilion on paper, green on ink (L3). |
| Installation's wording | "Lifted onto the piers." | Client, 2026-10-10: "Placed on the foundation" | Latest instruction (M10). |
| "How are we different?" | Client, 2026-10-09: the heading stays | Client, 2026-10-10: "We → VEE" where it stands for the company | Latest instruction: "How is VEE different?" (M13). |
| Call-outs of section 3 | Client, 2026-10-09: "different colour boxes for foundation, module and add-ons" | Developer, 2026-10-10: "change the colour to green… difficult to view" | Latest instruction: every call-out there is a green box; the three colours and the outlines round the groups are gone. |
| Capsule | "Capsule pods", lengths only | Client, 2026-10-09: "Capsule home", reference renders | Name and form from the latest; the three lengths from the brief. The renders show a longer capsule than 20′: not followed. |

## E. Copy edits made to brief text (meaning unchanged)

- "principals" → "principles".
- "advanced thermal and acoustic bridging" → "thermal and acoustic
  insulation". Thermal bridging is a defect, not a feature; publishing the
  original would read as an error to engineers. Confirm intended wording.
- "BMPTC" → "BMTPC" (see B1).
- Emoji bullets dropped from the six differentiators.
- From the client's notes of 2026-10-09, which are written in capitals:
  set in sentence case throughout.
- "ADD-ON's" → "Add-ons" (the brief's spelling; the apostrophe marks a
  plural after capitals).
- "VEE.BUILD Modules from these 2 shell frames" → "VEE.BUILD modules are
  made from these 2 shell frames."
- "Further adjustments can be done with jack" → "…with the jack."
- "Casted with concrete with its insulation panels in place" → "Cast in
  concrete with its insulation panels in place".
- "VEE have componentized the modules" kept as written.
- "standardised" → "standardized" as asked, and every other -ise on the
  site with it ("optimized", "minimized", "componentized").
- Institutional line: "Lean, clean, resilient, environmentally friendly
  buildings for future generations." → heading "Lean. Clean. Resilient.",
  text "Environmentally friendly buildings for future generations." The
  client asked for statement headings on all four; the words are the
  brief's.
- "This is just like car manufacturing – See how they all connect
  together." → two sentences.

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

### F7. Sixth pass: the client's corrections of 2026-10-09 (section J)

Same machine and method as F4 (headless Edge on the Arc GPU, 1280 × 720 at
DPR 1.5, last commit and working tree served side by side as dev builds and
visited in turn, one timer query per frame, 20 frames a reading, medians of
3 or 4 alternating rounds, range in brackets). The machine was in its
slower power state for most of it and changed state several times.

| Film, where | Last commit | Now | Draw calls |
| --- | --- | --- | --- |
| Hero, opening card at rest | 4.23 [4.19-4.27] | 4.91 [4.91-4.95] | 41 → 69 |
| Hero, card, the two being lifted away | (no such part) | 4.81 [4.79-4.83] | 77 |
| Hero, card, land half spread | 14.25 [13.91-14.37] | 13.18 [12.56-13.32] | 106 → 106 |
| Hero, farm | 11.54 [11.49-11.61] | 11.45 [11.37-11.51] | 106 → 106 |
| Hero, capsules | 10.48 [10.41-10.62] | 10.50 [10.43-10.55] | 106 → 112 |
| Hero, workforce | 7.32 [7.15-7.35] | 7.18 [7.14-7.37] | 74 → 82 |
| Hero, institutional | 8.00 [6.62-8.03] | 8.02 [7.97-8.10] | 67 → 67 |
| How it works, the two shells | 21.37 [19.40-22.19] | 8.57 [8.08-8.60] | 51 → 44 |
| How it works, lift & shift (was hook & cleat) | 16.68 [15.82-17.38] | 8.29 [7.44-8.70] | 32 → 46 |
| How it works, 600 sq.ft. | 20.07 [18.95-20.19] | 7.85 [7.83-8.19] | 40 → 51 |
| How it works, 800 sq.ft. | 18.28 [18.03-18.90] | 8.88 [8.19-9.73] | 30 → 41 |
| How it works, villa | 16.33 [16.17-16.93] | 8.11 [7.23-8.27] | 67 → 62 |
| How it works, top of the mid-rise | 7.92 [7.19-7.92] | 8.22 [7.54-9.03] | 67 → 60 |
| Components, exploded view | 6.93 [6.90-9.77] | 7.20 [6.79-10.82] | 231 → 351 |
| Components, foundation | 20.97 [19.91-38.11] | 17.15 [16.05-27.28] | 92 → 128 |
| Components, frame | 8.86 [8.34-10.29] | 8.12 [8.02-8.43] | 146 → 200 |
| Components, panels | 8.14 [7.66-8.23] | 8.32 [8.31-8.79] | 231 → 345 |
| Components, concrete going on | 8.34 [8.34-11.91] | 8.83 [6.35-8.89] | 284 → 410 |
| Components, shell closed | 7.91 [7.17-11.19] | 8.34 [8.14-12.80] | 194 → 192 |
| Components, all add-ons on | 7.29 [7.25-9.10] | 7.68 [7.32-10.46] | 231 → 237 |
| 3D tour (your house) | 8.55 [8.50-8.69] | 8.56 [8.21-8.57] | 64 → 72 |

- **"How it works" costs less than half of what it did: 8 ms where it was
  16 to 21.** Not from this round's changes: the blueprint grid was 58
  blended line segments, and they were 12 ms of every frame (switching
  one thing off at a time inside one page, four rounds: 19.6, 19.8, 19.5,
  19.0 ms with everything on; 7.9, 7.2, 7.7, 7.5 with the lines off; the
  shadow ground, the shells and the rest each within a millisecond of
  "everything on"). The progress file had listed them as worth timing
  since 2026-10-07 (issue 15). The grid is now one flat sheet whose
  fragment shader finds the lines with screen-space derivatives, a pixel
  wide at any distance, as the lines were: 7.0, 7.2, 6.4 ms. A crop at
  1:1 before and after shows the same hairlines in the same places. Why
  line segments cost that much on this GPU was not found (the components
  film's 1 m grid is the same kind of object and does not); the other
  grids are untouched and worth the same test: the configurator's plot
  grid and the joints of every `Paving`.
  At the very top of the mid-rise the sheet costs about 0.3 ms more than
  the lines did (they were far away and cheap there).
- **The opening card at rest: 0.68 ms more** (4.91 against 4.23), for two
  more buildings in the picture, which is what was asked for. It is still
  the cheapest frame of the hero. The prefab block's seven gallery posts
  became one mesh on the way (89 draw calls → 69; it helps the workforce
  set too). The film's four sets are unchanged within the spread: the new
  capsule costs nothing that can be measured.
- **Components: within half a millisecond everywhere, after one fix.**
  With every part of the three-part module drawn, a closed shell cost
  10.03 ms against 8.14 (450 draw calls against 186). What the concrete
  seals in (steel frame, floor and roof segments, plain wall panels,
  partitions: fifty meshes, each drawn three times a frame) is no longer
  drawn once the door and the glass are in; the glazing is not see-through,
  so the picture is the same. What is left of the difference (+0.4 ms with
  the same draw calls) is the walls being textured concrete where they
  were plain white. The foundation step is 3.8 ms cheaper: its camera
  stands a little farther back to take the jack piers in.
- **Lift & shift** was first read as 2.5 ms dearer than the hook close-up
  it replaced. Not the shells' shadows being redrawn as they move (a
  moving and a still frame at that pose: 12.31 and 12.12 against 12.25 and
  12.13 ms, in one power state); it was the same grid, more of it in shot.
- **Load.** Time to the hero's first picture, dev builds, four alternating
  rounds: 2.3 to 2.9 s now, 2.7 to 4.3 s for the last commit; longest
  single task before it 1.1 to 1.3 s against 1.2 to 2.6 s. Not slower with
  two more buildings to build; the spread is the machine's.
- **Frame pacing**, a steady 1500 px/s scroll, two passes each: hero 54.6
  and 55.9 fps (last commit 55.4 and 54.8), longest frame 76 and 75 ms at
  its end (89 and 62); how it works 55.9 and 55.0 (55.3 and 54.9), longest
  71 and 72 ms (71 and 111); components 56.1 and 57.0 (56.0 and 55.7),
  longest 35 and 19 ms (36 and 36); the 3D tour 39 and 48 fps over its
  thirty frames (42 and 47), longest 258 and 101 ms (215 and 114). The
  long frames are where the next film mounts, in both builds.
- **Moving against still**, thirteen poses (the row, the lift-away, farm,
  capsules, institutional; lift & shift, 600 sq.ft., villa; exploded view,
  frame, concrete going on, closed shell; the 3D tour): the largest shift
  in tone over any twelfth of the picture is 0.39 of a grey level (the
  villa, where the railings are, as in F5), 0.27 or less elsewhere; the
  mean difference pixel by pixel is 0.15 to 1.98 grey levels, which is
  the grain.
- **Found on the way: the settled picture could carry the glow of another
  pose.** The glow is refreshed on alternate moving frames. If the last
  moving frame was one that reused it, the settle kept that glow: after a
  jump of the page (a link, a key, reduced motion's snap, `?go`) the
  lamps and lit windows of the pose before stood in the new picture as
  soft ghosts until the next frame. The settle now makes the glow itself
  when the last frame reused one (`post.tsx`): one glow pass, once, on
  about half the pauses.
- **Not measured:** a production build (all of the above are dev builds
  of both trees); the capsule and prefab pages' showcases; anything on a
  phone.

### F8. The rules the 3D pipeline is held to

Set down on 2026-10-09 from the developer's brief for any change to the
3D. They describe the pipeline as built (F2, F3); follow them, and say so
where a change cannot.

**The standard.**
1. A moving picture and a still picture are the same picture (client).
   Never lower resolution while scrolling, never an effect only at rest or
   only in motion. The one difference allowed: edges are multisampled 2x
   moving and 4x at rest.
2. Speed comes from removing work that does not show, never from trading
   quality. If something is slow, find the wasted work.
3. Budget, on the client's laptop (Arc integrated, 1920 × 1200 at 150%): a
   moving hero frame is 4 to 6 ms of GPU in the fast power state, two to
   three times that throttled. More than about 0.5 ms a frame needs a
   reason and a measurement. Do not make a film slower without saying so.

**The pipeline.**
- `Stage.tsx` is the only `<Canvas>`. Scenes are pure functions of one
  damped progress value: no render passes, render targets, scroll
  listeners or animation loops of their own. Frameloop stays `demand`.
- The stage and the finish (`kit/post.tsx`) own everything drawn besides
  the scene: the sky (drawn on its own at half size, put behind the
  scene), the shadow map, occlusion (every frame, half resolution), bloom,
  tone mapping, the grade. No sky dome, second shadow light or post effect
  inside a scene.
- The shadow map is redrawn only when the light or a caster moves. A
  caster that changes every frame forces a 4096 px redraw every frame:
  `castShadow` only where the shadow shows, and casters move by progress,
  not by time.
- The scene's picture stays premultiplied, alpha as coverage (the sky is
  put behind it). No additive or custom blending over open sky without
  checking against the sky.

**Geometry and materials.**
- Repeated objects are one `InstancedMesh`; static pieces sharing a
  material are merged. An `InstancedMesh` takes `instanced()` copies of
  shared materials.
- Reuse the kit's materials and memoised geometry: a new material variant
  is a shader to compile, a new texture is main-thread time before the
  first picture.
- Dense things follow the distance levels of `kit/landscape.tsx`;
  overlapping alpha-tested cards need the depth-only pass the leaves have.
- Memoise on values. Allocate nothing inside `useFrame`.
- What the camera reaches later is built and warmed in idle time
  (`rig.prepare`, `rig.warm`), and a mesh is made very small rather than
  hidden if it must be compiled with the first frame.
- Text is never in WebGL. No new dependency without a note here.
- What cannot be seen is not drawn (F7: the inside of a closed shell).
- Lines on the ground are a shaded sheet, not line segments (F7).
- When something is removed, its geometry, materials and textures go too.

**Before saying it is done.**
1. `npm run check`, `npm run build`, the legacy-name search.
2. Look at every film touched at several progress values, `/capsule/`,
   `/prefab/`, the configurator, 390 px wide and `?still`. No console errors.
3. A frame captured while frames are being asked for against the settled
   one at the same pose (region means and 1:1 crops). Two settled pictures
   do not show what this project has got wrong before.
4. Against the tree before the change at the same poses: a picture that
   changed without being the task is a regression.
5. Measure: headless Edge on the same GPU over the DevTools protocol, GPU
   time by `EXT_disjoint_timer_query_webgl2`, old and new interleaved,
   medians. One reading means nothing on this laptop.
6. A steady scroll through each film touched: pacing and any long frame.
7. Report the cost before and after, draw calls if they moved, and what
   was not verified. If a request cannot meet these rules, stop, give the
   numbers and offer the cheapest version that keeps moving and still
   pictures the same.

### F9. Seventh pass: the developer's round of 2026-10-10 (section K)

Method as F7, with two changes found necessary that day. A reading is now
taken after a second of frames at the pose (60 before the 20 that are
timed): the page has just been idle while it settled, the GPU with it, and
the first batch after that read up to three times high (the "17 ms"
foundation step of F7 was mostly this). And the capture browser is started
with `--disable-features=BackForwardCache` and restarted between long
runs: its GPU process grew by some 200 MB a page load and hung at about
2.5 GB, three times that day.
"Before" is the tree as it stood before this round (the round of
2026-10-09, not yet committed), copied and served beside the working tree.

| Components film, where | Before | Now | Draw calls |
| --- | --- | --- | --- |
| The house whole (0.02) | 8.08 [8.07-8.10] | 7.87 [7.62-7.88] | 339 → 234 |
| Come apart (0.17) | 7.06 [7.04-7.07] | 6.75 [6.72-6.87] | 351 → 234 |
| Foundation (0.4) | 12.91 [11.47-13.10] | 12.54 [11.80-12.67] | 136 → 48 |
| Frame (0.5) | 7.91 [7.87-8.03] | 7.94 [7.89-8.07] | 208 → 125 |
| Panels (0.62) | 8.35 [8.13-8.69] | 8.30 [8.28-8.41] | 353 → 217 |
| Concrete going on (0.68) | 8.74 [8.71-8.77] | 8.87 [8.87-9.04] | 402 → 281 |
| Shell closed (0.74) | 8.19 [8.18-8.24] | 8.37 [4.65-8.58] | 200 → 156 |
| All add-ons on (0.98) | 7.43 [7.42-7.44] | 7.45 [7.44-7.49] | 245 → 236 |

- **The components film costs what it did, within 0.2 ms, with a third
  fewer draw calls.** In the opening nothing inside the shell is drawn;
  the solar panels, the cleats and each pier's pad and jack are one mesh
  each; the cut-outs of the openings are gone.
- **The ground under the house.** See-through, the block of ground costs
  about a millisecond of a frame (switching it off inside one page, five
  rounds in the fast power state: 4.65 ms with it, 3.54 without). It is
  see-through only while the footings and plinth go in; then it closes
  and is a solid block drawn with everything else, which is why it can
  stay to the end, under the steps and the piers.
- **Entering a film** ("while scrolling to your build I can feel a little
  lag"). A film's scene was mounted when the film came within a screen of
  the viewport, in the middle of the scroll towards it: geometry, a WebGL
  context, the environment map, shaders; and its first visible frame then
  sent its buffers, textures and shadow map to the GPU. Now a film within
  1.75 screens below the viewport (the factory: 2.8) is mounted in the
  first quiet moment (the page still for 0.28 s, no pointer or key), and
  a stage mounted out of sight draws itself once into the warming target
  as soon as its shaders are in. Test: stand 1.3 screens above "Your
  build" for 3.5 s, then scroll on at 1500 px/s for 2.4 screens.
  Longest frame before: 233 and 83 ms (earlier runs 106 to 160). Now: 17
  and 17 ms, no frame over 20. With the factory reaching only 1.75 it was
  34 to 67 ms, the long frame falling 0.6 to 0.77 of a screen into "Your
  build", where the factory mounted: hence its longer reach. Into "How it
  works" the same test read 71 ms before and 19 after. A visitor who
  never stops still gets the mount in mid-scroll, as before.
- **What that costs: GPU memory at one place.** Working set of the
  browser's GPU process, one fresh page visit each, read at seven places:

  | Where | Before | Now |
  | --- | --- | --- |
  | Hero at rest | 1,141 MB | 952 to 1,115 MB |
  | In "How it works" | 1,657 | 1,479 to 1,622 |
  | In the components film | 1,681 | 1,519 to 1,679 |
  | Foot of the configurator, after 7 s | 1,624 (3 canvases) | 1,997 (4 canvases) |
  | In "Your build", after 6 s | 1,841 (3) | 1,900 to 2,031 (3) |
  | In the factory film | 1,727 (2) | 1,570 to 1,706 (2) |
  | In the installation film | 1,718 (2) | 1,573 to 1,717 (2) |

  One more stage is mounted while the visitor is at the foot of the
  configurator (the factory's, ahead of time): about 0.4 GB there, nothing
  elsewhere beyond the spread between visits. A mounted stage is 300 to
  500 MB (shadow map, the finish's targets, textures); the hero's stays
  mounted for the whole page. A first version reached three screens both
  ways and had five canvases and 2.6 GB at that spot: withdrawn. Not
  measured on a machine with less memory or on a phone, where a stage is
  smaller (no occlusion, a 2048 shadow map).
- **Moving against still**, eight poses (the row, 2.1 before the shells
  rise, and six of the components film): the largest shift in tone over
  any twelfth of the picture 0.20 of a grey level, mean difference 0.14
  to 0.86.
- **Broken in passing and found by the build:** eight CSS rules lost
  their selectors to a scripted replacement (catalogue tabs, the
  drawings' dimension lines, the badge, the plan's lines). The dev server
  showed nothing; `npm run build` stopped on "invalid empty selector".
  Restored from the copy of the tree taken before the round.
- **Not measured:** the production build's pages; a phone.

### F10. Eighth pass: the two later rounds of 2026-10-10 (sections L and M)

Method as F9. "Before" is the tree as it stood before the developer's
second round that day (after K), copied and served beside the working
tree. The laptop changed power state inside almost every run that
evening: where a range is wide the fast-state reading is its low end, and
the two builds are compared at their low ends and at their medians.

| Where | Before | Now | Draw calls |
| --- | --- | --- | --- |
| Hero, opening card at rest | 2.63 [2.52-3.05] | 2.44 [2.39-2.49] | 100 → 117 |
| Hero, the farm set | 5.31 [5.19-5.43] | 5.52 [5.28-5.84] | 106 → 118 |
| How it works, 500 sq.ft. | 3.26 [3.15-3.39] | 3.15 [3.10-3.66] | 59 → 59 |
| How it works, the villa | 3.04 [2.91-3.36] | 3.25 [3.16-3.25] | 62 → 82 |
| Components, all add-ons on | 4.30 [4.30-4.32] | 4.23 [4.16-4.23] | 228 → 228 |
| Factory, five stages (low ends) | 5.3, 5.4, 5.3, 5.4, 5.3 | 5.6, 5.7, 5.7, 4.9, 5.5 | 235-281 → 121-198 |
| Installation, arrival / placement | 4.7 / 4.7 | 4.8 / 4.8 | 131 / 112 → 158 / 144 |
| The road (new), three frames | none | 4.1 to 4.6 | 104 to 112 |

- **Nothing costs more than about 0.4 ms a frame over what it did.** The
  hero has the jack piers and three lit-glass copies more (0.2 ms on the
  farm set, inside the spread). The villa of "How it works" is drawn by
  more instanced meshes (a shell with a window in its end is another
  geometry): 0.2 ms. The factory is a different film: nearer its subject,
  with fewer things drawn (a third fewer draw calls), about 0.3 ms dearer
  in the fast state at four stages of five. The components film's second
  burst was not separated from the power-state noise that evening (its
  medians ran 8.6 to 11.5 ms where the first burst's ran 6.6 to 9.5, both
  in mixed states): the module's inner parts are drawn there, as they are
  in 3.2. **Not settled; to be timed again in one power state.**
- **Parts that first show in mid-film.** The new factory keeps most of
  itself out of sight until its turn. A steady 1500 px/s scroll through
  it had 6 to 12 frames over 25 ms (33 to 50 ms, at the moments a part
  first appeared: its shader compiled and its buffers went up in that
  frame). `useWarmAll` draws everything once into the warming target when
  the stage mounts: after it, one long frame in the whole film (34 to
  52 ms, at its very end, where the road's stage mounts), median 16.7 ms,
  95th percentile 17.1 to 17.3. The tree before had 5 to 14 such frames.
- **The road's stage.** With the kit's rolling terrain it took a third of
  a second to mount, in the middle of the scroll that arrives from the
  factory (a 300 ms frame). On the stage's own level ground, with the
  machines' geometry built in idle time (`prepare`), that frame is 34 to
  52 ms.
- **Installation**, the same scroll: 3 frames over 25 ms (33 to 35) where
  the tree before had 29.
- **Moving against still**, seven poses (the farm set, the villa, the
  components film's last frame and four of the factory): mean difference
  0.35 to 1.37 of a grey level (the grain), largest shift in tone of any
  twelfth of the picture 0.09 to 0.27.
- **The hold** (M9), driven as a visitor's wheel: the page stopped 48 px
  into the pinned stage, the film ran 0 to 1 in 4.0 s while every attempt
  to scroll was put back, the page moved again on the first scroll after
  it, and a second pass over the section was not held.
- **Not measured:** GPU memory with the new stage in the page (one more
  canvas can be mounted between the factory and the installation); a
  phone; a real touch screen for the hold (emulated only); the production
  build's pages.

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

## J. Client corrections of 2026-10-09 and how they were carried out

A two-column sheet from the client ("VEE.BUILD website – corrections",
observations and corrections, read as text: any screenshots in it were
not seen), relayed by the developer (Jana) with three reference renders of
a capsule home and, later the same day, the Hemisphere One logo. The
developer's instructions: do items 1 to 6; leave the factory tour (7) and
delivery (8) for a later round; decide the open points and note them; the
texts may be matched with picture and movement of our own.

1. **Menu.** "MOD | POD | FAB  CONTACT. These are the only menu items."
   Done: three short names in mono, divided by hairlines, and the Contact
   button. Each link is read out with what it stands for ("MOD: Modular
   house"), and the mobile menu shows it beside the name. Partnership left
   the top menu.
2. **Bottom band.** "Rest we will have at the bottom band. PARTNERSHIP.
   INVESTORS. TECHNOLOGY. Important: add powered by HEMISPHERE ONE." Done:
   a band on paper under the ink footer, the three on the left, "Powered
   by" and the supplied logo on the right. The logo is dark lettering on a
   clear ground, which is why the band is on paper; it is used as
   supplied, at 1.9 rem high.
   **CONFIRM:** Investors and Technology have no page and no content. So
   as not to add routes unasked, Investors opens the enquiry form and
   Technology goes to "How it works". Say where they should lead, and
   whether the logo should link anywhere.
3. **Opening card.** "One system. Many buildings. is correct. However, the
   shell plan 1 and 2 is specific only to Modular. Here, we should have 3
   objects; Modular home, Capsule Home & Prefab Buildings. Make enough
   space to place all 3 objects." Done: the two shell drawings, the
   sentence about two precast shells and the "Shell A · 6 m × 3 m × 3 m"
   label are gone. The house, a 20′ capsule and the G+1 prefab block stand
   in a row in the studio, to one scale (the block is three times as long
   as the other two, so it stands 39 m behind them and reads as the
   third). They are lowered in one after another on load. Each is named
   on the floor in front of it, under the menu's short name: "MOD /
   Modular.", "POD / Capsule.", "FAB / Prefab building." (the client's
   "MODULAR. CAPSULE. PREFAB BUILDING."). The headline stands top left
   and the three have the foot of the screen from edge to edge.
   On scroll the card has two parts (it is 1.7 screens long, was 1). In
   the first third the block's shells are lifted away one by one, then
   the capsule, as they came, while the camera goes to the house. Then
   the house's land spreads and its sky comes up exactly as before (I18).
   Lifting rather than fading: a fade needs every material of the two to
   be blended, and the sets later show the same buildings being lowered
   in.
   On a narrow screen the three stand one behind another, seen from above,
   the house nearest; the words start lower (63% of the height).
   For a reader that cannot see the picture, and where there is no
   script, the card carries the three in words with their lines.
4. **Headings and texts of the four banners.** "Use statement text for all
   the headings. We can remove the numerical from heading. We are anyway
   showing them through objects." and a text for each of the three. Done:
   "Modular house." / "Factory made insulated concrete homes." /
   "Installed in one day!"; "Capsule home." / "Luxury spaceship pod." /
   "Enveloped in concrete!"; "Prefab building." / "Comfort accommodation."
   / "Built in days!". The second statement of each text is set as the
   point of the caption, in the accent. The small line over each heading
   is the menu's name for the line (MOD, POD, FAB · Workforce housing,
   FAB · Institutional): no lengths, floors or panel sizes there any
   more; the pods keep their length labels and the panels theirs.
   The institutional banner had no new text: its brief line is set the
   same way (E). The claims are in B8, B9, B12.
5. **"The institutional banner is a bit fast. The 36′ long panels needs to
   come per scroll. Now we have 3 scrolls, it can be made 6."** Done: the
   set has 1.25 screens of scroll (was 0.73) and its building goes up
   over 60% of that (was 45%), about twice the travel; inside it the wall
   panels follow one another instead of arriving nearly together (each
   has two thirds of its stretch to itself, was a fifth). The hero is 4.9
   screens long (was 4.4).
6. **Capsule.** "Change capsule house to something like the attached
   image; colouring and texture should match the theme and background we
   already have" (developer). Done: C9. White hull, charcoal frames, warm
   lit glazing; used in the hero's capsule set, on the opening card and on
   `/capsule/`. The page's words are the client's line. The old pod
   geometry is removed.
7. **How it works.**
   - 2.1 "The 2 core shells", "Two standardized shells.", "VEE.BUILD
     modules are made from these 2 shell frames."
   - 2.2 (the number was 2.1 twice): "Building as a product.", "VEE have
     componentized the modules while maintaining complete architectural
     freedom.", "VEE.BUILD fully finished “LIFT & SHIFT” modules." The
     small line over it reads "Lift & shift". "You can show an arrow over
     lifting hooks. We can avoid any call out there": the hook & cleat
     call-out is gone; an arrow stands over each lifting hook, and as the
     page scrolls the arrows go up and the two finished shells go up with
     them, 0.6 m, and are set down again. The lift is ours: it is what the
     words say. The camera shows the whole of Shell A from its free end.
   - 2.3 "Single system. Multiple footprints." "Change the colour of
     number to green as floor config moves close to respective number":
     the footprint on show is marked in green on the counter's scale; the
     ones passed are in ink. As a mark with ink text, because the green
     as text has no contrast on paper (J8).
     "In multiple modules it is better we maintain one main door": each
     footprint has one door, on one shell, and the others have windows
     where their doors were (`mainDoor`).
     **CONFIRM:** read as one front door for one home. Applied to the six
     footprints of "How it works" only. The configurator, the catalogue
     drawings and the stacks (homes of several households) still have a
     door for each shell, as instructed on 2026-10-07. Say if a home in
     the configurator should have one too: it changes the decks and steps
     rule (I16) with it.
   - 2.4 "Multi-floor. Multiple roofing options." over "Net zero." and "A
     multi-family house with off-grid capability."; the "Ideal for" line
     is gone. The picture now shows what the words say: of the villa's two
     upper shells one has the sloped roof with its solar array, the other
     a flat roof with the array on frames, beside the open terrace. All
     from the add-on list. "The Villa" as a name is no longer in the film
     (it is still the preset's name).
   - 2.5 "Stack up to 5 floors" over "Mid-rise apartment." with the
     five-floor block's text and its "Ideal for" line kept ("retain rest
     of the text"). The two-floor apartment is not shown. The film is 8
     screens long (was 8.5); the villa has the time the apartment had.
8. **Green.** The client asked for green twice more (the counter, and
   "check if white text over green BG will grab attention" on the add-on
   tags). White on this green measures 1.3 to 1 and cannot be read; ink
   on it measures about 15 to 1. So: on paper the green is used as a
   mark, a flat fill under ink text (`--mark`), on the footprint on show,
   on the add-on that has just come down, and on a key or tag under the
   pointer. On ink it is still the accent. **CONFIRM** if white on green
   is wanted regardless.
9. **Componentized building.**
   - Heading "Componentized building"; over the first caption
     "Building-kit-as-parts"; "Foundation. Module. Add-ons."; "This is
     just like car manufacturing. See how they all connect together."
   - "A different call-out to show – different colour boxes for
     foundation, module & add-ons": each layer of the exploded view
     stands in an outlined box of its own colour and is named on a box of
     the same colour: concrete grey, panel white, the green. The add-ons
     are in two places (on the roof and at the door) and have two boxes.
     The exploded view itself shows more than it did: frame, panels and
     concrete coat come apart as three layers.
   - 3.1 "Further adjustments can be done with the jack." "The jack pier
     has to come where deck post, stair frame land": C2. Six jack piers,
     four under the deck posts and two under the steps; the posts stand
     on their heads. The shell sits on the pedestals and the plinth.
   - 3.2 "Module" / "Insulated concrete shell" and the client's paragraph.
     The three tags and the three old call-outs are gone. Three parts,
     each named on a box of its own colour while it goes up: "Structural
     frame" (black), "Insulated panels" (white; the floor and the roof in
     segments, as asked for the top), "Micro concrete" (grey): the coat
     is sprayed on from one end to the other by a portal that travels the
     length of the shell (C10). No particles. The door and the glass are
     fitted last.
   - 3.3 unchanged, but for the tag of the add-on that has just come
     down (J8).
10. **Key differences.** "Key differences" over the heading, which stays;
    "Six points separate a VEE.BUILD building from traditional and other
    off-site models."; "an animated icon for mouse over, in addition to
    the colour line": each of the six has a mark drawn in the page's
    hairline in its cell's corner (a house on its footing, a wall in
    section, a loop with a leaf, the sun and an array, a shield with a
    tick, bars coming down). It draws itself as the cell comes in and
    moves again under the pointer with the accent rule. "Increase the
    size of text heading in comparison table": "VEE.BUILD" and "Others"
    are as large as the lines under them.
11. **Build your own.** "Replace HIGH-RISE with MID-RISE": the preset is
    "Mid-Rise Apartment", and "high-rise" is nowhere on the site.
12. **3D tour.** The film after the configurator is headed "3D tour" and
    numbered 6. "Drag to check top, down, left, right & centre": the hint
    says so, a hand can tilt the view from ground level to nearly
    overhead as well as turn it, and the five views are keys too (a
    cross: top, left, centre, right, down), because on a touch screen a
    drag up or down is the page's scroll. A key's view is let go when the
    house is taken hold of or the page scrolls on. The second caption has
    the client's sentence (E).
13. **Numbers.** The sheet numbers the sections 5 Build your own, 6 3D
    tour, 7 The factory, 8 Delivery. The page follows: the rail and the
    menus list eleven chapters (3D tour and Delivery are chapters of
    their own; site preparation, the installation and the close belong to
    Delivery), and the catalogue, gallery and contact are 09, 10 and 11.
    No section was moved, added or removed.
14. **Spelling.** -ize throughout (E).

**Not done, by instruction: items 7 and 8 of the sheet.**
- 7 The factory: "At this point we need to show segment 3D panels at slab
  level as well" (at the panels); "This is showing concrete filled inside
  module. It should fill walls and slab."; "We can leave the windows and
  door as black cut out. The rest of the detailing can come in finishing
  line." The module's three parts as built for section 3 (C10) are the
  model to follow there.
- 8 Delivery: "No changes" to the text. "There is no animation on this
  screen. It will be nice to see a ride. We can match this with real time
  drone video masked in the background." Needs the video from the client.
- Its last line, on the installation or the close, was not matched to a
  section: ask which screen it means.

**Decisions taken for the client to confirm:** J2 (where Investors and
Technology lead), J3 (the prefab on the card is the G+1 block; the
capsule is the 20′), J4 (the institutional line as statements), J7 (one
main door: footprints only; "Net zero." as the heading of 2.4; the lift
in 2.2), J8 (ink on green, not white), J9 (the three part colours; jack
piers in section 3 only, the configurator's foundation unchanged), E
("Add-ons", "Cast in concrete").

## K. The developer's round of 2026-10-10 and how it was carried out

From the developer (Jana), one message and a correction to it while the
work was under way.

1. **Componentized building, the opening** ("the current layout is
   difficult to view, make it easy to view and understand for very common
   people… the cubes around them making it look complicated… improve the
   burst mechanism"). The exploded view of 2026-10-09 (every part of the
   house flying apart, three coloured outlines round the groups) is gone.
   The film opens on the finished house, whole. It is lifted off its
   foundation; then its add-ons come off it, the roof and its solar array
   upwards, the shades forwards, the deck with its steps and jack piers to
   the side. Three things, each still whole, each named by a green box as
   it is shown. Nothing inside the shell is drawn there.
   "The text foundation module add-ons occurs one by one… when we show
   what is foundation in the burst, we show foundation text": the heading
   "Foundation. Module. Add-ons." arrives a word at a time with the
   picture, the word that has just come in the green. Without script the
   heading stands whole.
2. **Green.** First read as "green everywhere instead of orange" and
   built that way (chips behind the numbers, a marker stroke under the
   hero's headline, green buttons and dimension lines); the developer
   stopped it: "not as background, a text colour, and not everywhere,
   only in titles like 01, 1.1, 2.2 (those small texts)". As it stands:
   the small titles are green text (`--title`): the chapter's number, the
   small line over each caption, the three codes on the opening card, the
   footprint on show on the counter, and with them the rail's marker
   ("side scroll bar") and a film's step ticks. On ink that is the green
   itself. On paper the green itself cannot be read as text (1.2 to 1
   against the page), so there it is a deep tone of the same hue
   (`#4f7000`, 5 to 1). Everything else is as it was: vermilion on paper,
   the green on ink. **CONFIRM:** the deep tone on light sections; the
   bright green there would be the same colour to the letter and could
   not be read.
   "In 3, change the colour to green": every call-out box of that film is
   the green with ink on it (they had three colours since 2026-10-09: D).
3. **3.1 Foundation, the jack piers** ("we don't install jack pier in the
   starting, we include that when adding add-ons"; "the jack pier for
   steps is not properly arranged"). C2. The foundation step sets plug
   footings and L plinths only and its caption says the jack comes with
   the add-ons. In 3.3 a pier is set under each deck post just before the
   posts come down, and one under each stringer of the steps just before
   the steps; then each jack is turned up to its load. The steps' piers
   stand under the stringers where their heads meet them, not at the
   foot, where they came through the timber. The ground stays to the end
   so that all of it stands on something.
4. **3.2 Structural frame** ("we don't have side bars in top, we have it
   in only bottom"). C10, D.
5. **3.2 Door and windows** ("make the door and windows as same as in the
   common design"). The module had openings of its own (two small windows,
   a plain door). It now has the standard shell's, cut through panels and
   concrete, and the standard joinery (`joineryGeometry`, shared with
   `moduleGeometry`).
6. **Build your own** ("foundation adjustment option after setting the
   plot"; "2 column for the available designs"). The panel reads Start
   from, Plot, Foundation, Add-ons, Finish; the eight designs are two to
   a row.
7. **Opening card** ("move the capsule pod a little right, giving
   uniform spaces"). The capsule stands 1.25 m farther along the row; the
   gaps either side of it now look alike (the block's light staircase
   reads as part of the gap on its side).
8. **"While scrolling to your build I can feel a little lag."** F9: films
   are mounted ahead of time in a quiet moment. Left as it was: the
   configurator's foundation (jack heads on the pedestals), which the
   round did not ask about.
9. **"Fix the 2.1 two core shells, where the bottom of the 2 cores is
   breaking until the block arises."** Before they rise, the two shells
   were drawn pressed flat on the floor, in the plane of the floor's
   shadow and of the grid, and flickered through them. Until they rise
   they are now a speck (still drawn, so their shaders are compiled with
   the first frame), and the grid is always drawn after the shadow.

## L. The developer's second round of 2026-10-10 and how it was carried out

"Quick fixes", one message with a screenshot of the earlier exploded view,
and two corrections on colour while the work was under way.

1. **Opening card, the capsule** ("a little to the right, make it look
   uniform"). The three stand in three columns: seen from the card's
   camera the capsule's middle is half-way between the house's and the
   block's, and each name hangs under the middle of its own building
   (`rowOf` in `kit/sets.tsx`). On a phone the capsule was cut by the
   screen's edge: moved in.
2. **The prefab building's steps** ("side ways as in every place"). The
   block's staircase is the dog-leg every stacked building has, against
   its flank, taken from the access rule itself (`layoutAddOns(...).stairs`,
   drawn by `stairGeometryOf`), not a straight flight placed by hand.
   The block keeps its own gallery on posts; the rule's lies in the same
   place.
3. **Colour**, in three tries.
   - Asked: "use fluorescent green, replace the normal one… the whole
     title like 01 — Modular precast construction system… unique and
     uniform… the oranges can be green (only if it makes sense), don't
     mix orange and green". First built as ink labels behind the small
     titles on paper, with what had been vermilion turned to ink there.
     Refused at once: "why does the black come? why background colour?
     why the oranges are black? I asked you to make it green".
   - Second: the bright green as plain text on paper too. It measures
     1.2 to 1 against the page and could hardly be seen; said so.
   - Settled: "if the white background doesn't support the green, use
     orange only there… which should uniquely identify the text". So:
     **vermilion on paper, the fluorescent green on ink, one accent to a
     ground, the whole small title in it, nothing ever put behind it.**
     The deep green of K2 (`#4f7000`) is gone. The favicon's small square
     is the green, on its ink square. tokens.css has the rule.
4. **Componentized building, a second burst** ("after fully bursting, we
   can burst further, like module, add-ons, foundation, like it is in
   previously but easy for normal people to see"). After the three have
   come apart, each comes apart into its own parts in turn. The module is
   drawn apart upwards into three whole boxes: frame, panels, concrete.
   Opened outwards first, the near walls hid the frame. The film is a
   screen longer (9, phone 8) and its times are on a clock of its own
   (`componentsClock.ts`), the opening having more scroll than its share.
   On a phone the second burst was drawn black: the camera stands twice as
   far there, beyond the studio's fog. The fog now stands back with the
   camera.
5. **Jack piers** ("should hold the staircase, not let it down"). The
   steps hang from the deck at their head and their frame ends in a level
   sole on a jack pier's head at the foot; before, the stringers ran into
   the ground and the piers stood under their middle. Riser, sole and pad
   sizes are ours (C2).
6. **The frame's top** ("top steel bar in structural frame, only 4 sides,
   not in centre"). A ring round the top between the columns' heads,
   nothing across. That morning's "no bars in top" (K4) had taken the
   ring away with the cross beam (D).
7. **Build your own** ("show current sq feet, add-ons and other details
   separately in below space"). Under the 3D view: the area large, then
   shells, floors, footprint, plot, foundation, the finishes as swatches,
   and the add-ons as chips. The view keeps its height.
8. **Found in passing.** The configurator's "Rotate" was ink on ink (a
   rule in the wrong order). The frame's steel all but vanished on the
   dark stage: it is a painted black now (`mat.frameSteel`).

## M. The client's brief of 2026-10-10 (evening) and how it was carried out

Fifteen items, with two photographs (a truck seen from its front corner
on a road; a shell hanging from a crane by a four-point lifting frame).
"Follow the requirements precisely; use your own judgment where creative
freedom is given."

1. **Hero: tab and text together.** A caption came a ninth of a screen
   after the cut to its set and then took a second to arrive, while the
   step's mark changed at once. The captions now change on the cut itself
   (`film/heroTimeline.ts`, one number for the scene and the copy), and
   the words that go, the words that come and the mark move together:
   0.38 s, one curve, no delay. Read back from the page: the step, its
   mark and the header's theme change in the same frame at 0.153, 0.449
   and 0.745. **CONFIRM:** "tab" was read as the step's mark and its
   caption; the top menu's MOD | POD | FAB does not follow the film.
2. **Prefab: Coming soon.** The prefab page had the tag; the main page's
   two prefab captions did not. A tag beside the kicker (the pill and dot
   of the sub-pages' badge, in the kicker's colour), "Prefab — coming
   soon" on their link, and "FAB · Coming soon" under the block on the
   opening card. The capsule, which said so only in its link, has the
   same.
3. **2.3, doors and windows.**
   - One main door, kept on one shell: it used to pass to the Shell B
     that joins the row at 700 sq.ft. and back at 800 (`mainDoor`: a
     Shell A before a Shell B).
   - Windows: with one door to the home, a row of shells turned end-on
     showed blank ends to the street. Such an end now has the shell's own
     two-pane window (`streetEnds`; `moduleGeometry(type, door, true)`).
     The single shell is as the client's model has it.
   - Net zero: one main door a floor (ground, and the upper floor's from
     its gallery), and on the upper shell beside the terrace a door onto
     the terrace (`floorDoors`). That shell's one door is the terrace
     door, so no shell has two. Only main doors have a gallery and the
     staircase led to them. The villa is now seen from its terrace side,
     where that door is; its staircase stands against the far flank and
     shows its foot and landing past the corner. **CONFIRM:** "balcony"
     was read as the open terrace; and that the terrace door needs no way
     to the staircase.
   - Mid-rise: unchanged.
4. **Section 3: add-on tags.** "Add-on" over the name, in the film's green
   box, on the deck, the steps and the sloped roof as each lands, staying
   to the end. The caption says they are chosen for each building.
5. **Jack piers on the hero's house.** One under each joist of the
   landing near its front, the joist in the jack's head, and one under
   the sole of each stringer of the steps (`modelhome.tsx`), set just
   before the landing comes down. On the opening card they stand in full
   view; in the meadow the grass stands in front of the landing's.
   **CONFIRM:** where they stand (under what comes down beside the shell,
   as in section 3, not under the shell, which has its footings).
6. **Powered by Hemisphere One.** Under the wordmark, the width of the
   lockup, in the header, the footer and the loading screen (text: the
   logo is dark on clear and the header stands on both grounds). On the
   opening card with the logo, opposite the card's small title; under the
   statement on a phone.
7. **Affordable.** The bars getting shorter under a falling line are a
   price tag with its price coming down ("keeps the cost down").
8. **The factory.** C8, D. One bay; the order of film/factoryTimeline.ts.
   - 8.1: the yard is 62 m by 55 on three walls where it was 98 by 76,
     and what is seen of it is about a third: the camera stands 24 to
     31 m from the shell, 22 to 31 degrees up, 29 to 47 round from its
     front. The title card opens onto the whole yard, then the film goes
     in. The gates, the bay that lit up and the second shell in its
     formwork (the green box) are gone.
   - 8.2: "Structural frame – core shell". The frame is section 3's
     (`kit/shell.ts`): floor ring and joists, columns, top ring on four
     sides, a hook on each column, named in the picture.
   - 8.3: floor, four walls with their openings, then the roof panel.
   - 8.4: the concrete is the walls (and the roof slab): it rises between
     the boards and the panels and is laid over the roof from the hose's
     end. What shows of the walls' pour is little (a 35 mm rim behind the
     boards); the proof that the inside is clear is the next stage.
     The pump is a trailer pump standing by the bay, its line run up the
     boards and over. **CONFIRM:** 35 mm is section 3's coat; a cast wall
     would be thicker.
   - 8.5: the walers come off, each board is eased back and lifted away,
     round the shell in turn. The openings are empty: the inside is drawn
     as a room in shadow, the panels' reveal white round each opening.
   - 8.6: doors and windows pushed home; then a spray gantry rolls along
     the shell in the same bay and the finish follows it (the visitor's
     own colour). Sprayed, it is the finished module of every other film.
   - 8.7, 8.8: `kit/machines.tsx`, redrawn: a carrier on outriggers with
     a slewing superstructure, counterweight, ram and a boom in four
     sections that slide; a hook block on two falls; the four-point
     lifting frame after the photograph. A cab-over tractor on three
     axles with a flatbed the length of one shell, wheels that turn. The
     shell is lifted straight up, carried to the trailer without turning
     (the trailer stands along it) and set down; the frame lifts off it
     only then; the truck pulls away and is still in the picture, at the
     gate, when the film ends.
   - 8.9: three things standing still: a shell with its frame up and
     panels going on, one cast, six finished in the shed.
   - Not done: figures, a second moving line, sound.
9. **The journey.** `Transit.tsx`, `TransitScene.tsx`, in place of the
   drawn truck on a line. One shot of 4 s: the truck comes down the road
   with the shell, is seen as in the photograph at about a third, passes
   an arm's length from the eye and drives off towards the evening sky.
   A wider lens than the other films (46 degrees, 60 upright). It plays
   by itself, once, when a visitor scrolls down onto it, and the page is
   held meanwhile (`film/hold.ts`): wheel, touch and keys do nothing, the
   page is put back if anything else moves it, and the hold ends by the
   film's clock, by its own timer 1.2 s later whatever happened, on
   Escape, and when the page is hidden. It starts only for a scroll the
   visitor is making (a link's glide and the scrollbar do not start it)
   and only if its picture is up; reduced motion never holds. "Replay"
   afterwards. F10 has the test. **CONFIRM:** 4 s; and the truck at about
   110 km/h for the look of it.
10. **Installation.** `film/installTimeline.ts`.
    - "Placed on the foundation." in place of "Lifted onto the piers."
    - The truck comes in with one shell (the scroll). Past 0.3 of the
      film the rest runs on a clock: the lifting frame comes down on the
      four hooks, the shell is carried just clear of the trailer and set
      on its footings (2.8 s), the frame lets go, the truck leaves, the
      remaining shells come down by themselves one after another (at
      most 2.6 s apart from first to last), the add-ons land, and the
      lights come up (1.3 s). Two shells: 7 s in all. Scrolling back
      above the trigger runs it back at three times the speed.
    - The windows are dark on the trailer, in the air and while the
      building goes up. The film is 4.4 screens where it was 6.
    - With reduced motion each caption shows its own stage finished.
    - **CONFIRM:** the truck brings a ground-floor Shell A where there is
      one (the lifting frame is A's length); the further shells are
      lowered in without the crane.
11. **Opening card, lights.** Each of the three is dark while it is
    lowered in and lights up 0.35 s after it stands, over about a second;
    the porch lamp with the house. The capsule homes of the hero's second
    set and of `/capsule/` the same.
12. **Catalogue.** Hidden by `shown.catalogue` in `src/data/site.ts`:
    not rendered, its code and data untouched, the numbers counted from
    the list (Photo gallery is 09, Contact 10), the rail, the menus, the
    footer and the three sentences that pointed at it following the flag.
13. **We → VEE.** "How is VEE different?", "VEE delivers everything…",
    "See how VEE manufactures it.", "VEE.BUILD is looking for
    partners…", "Partner with VEE". Left: "Tell us…" and "so we can
    respond", which are spoken to the visitor. **CONFIRM:** singular
    ("VEE delivers"); the client's own sentence in 2.2 reads "VEE have
    componentized" and was left as written.
14. **Performance.** F10.
15. **Verification.** Each of the brief's fifteen checks was looked at in
    captures at 1280 × 720 and 390 × 844 on the dev server; the build
    passes; no console errors. Not verified: below.

**Not verified in this round.** A real phone or touch screen (the hold
above all); Safari and Firefox; tablet widths; the catalogue switched
back on; the configurator and the 3D tour after the kit's changes (looked
at only in passing); the second burst's cost (F10); the header's links
over the new factory picture on a phone, where the back of the yard is
under the chapter's line.
