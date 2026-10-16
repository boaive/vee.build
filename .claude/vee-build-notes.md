# VEE.BUILD — notes, conflicts, decisions

## A. Needed from the client before launch

| # | Item | Why it blocks | Current handling |
| --- | --- | --- | --- |
| A1 | Contact email, phone, address, legal entity name | Footer, structured data, mailto fallback | `src/data/site.ts` → `contact` is null; footer shows nothing invented |
| A2 | Enquiry form destination | Settled 2026-10-16 | The site's own API, `/api/enquiries` (notes U); `PUBLIC_ENQUIRY_ENDPOINT` overrides |
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
  the deck (K8). Since 2026-10-11 the building of "08 On site" has them
  under its deck's posts and its steps too, at section 3's heights (O4);
  the configurator and the 3D tour show the same house without.
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
| Pricing | None | Earlier brand's price list | No pricing on the site until 2026-10-11; then the client asked for "tentative and reasonable prices" in the configurator: rates of our own, tagged CONFIRM (N5), none taken from that list. |
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

### F11. Ninth pass: the client's brief of 2026-10-11 (section N)

Method as F9 and F10: headless Edge on the Arc GPU, 1280 × 720 at DPR
1.5, the tree before this round (`git archive HEAD`) served beside the
working tree and visited in turn, GPU time of one moving frame by timer
query, 60 frames at the pose then 20 timed, medians of 3 or 4 alternating
rounds, range in brackets; and, for what is new, each addition switched
on and off inside one page, round-robin, 8 to 10 rounds, the median of
the rounds' differences (`toggle.mjs` in the session's scratchpad).

| Where | Before | Now | Draw calls |
| --- | --- | --- | --- |
| Hero, opening card at rest | 2.65 [2.18-5.02] | 3.07 [2.75-3.15] | 75 → 153 |
| Hero, card, the two lifted away (pre 0.17) | 2.12 [2.06-2.25] | 2.43 [2.35-2.43] | 83 → 153 |
| Hero, card, land half spread (pre 0.6) | 5.66 [5.40-8.25] | 5.65 [5.53-5.72] | 118 → 118 |
| Hero, the farm set | 5.20 [5.15-7.80] | 5.36 [5.16-8.39] | 110 → 110 |
| Hero, the capsule set | 4.97 [4.86-7.23] | 4.66 [4.52-4.66] | 104 → 98 |
| How it works, lift (0.2 / 0.232) | 2.97 / 3.89 | 2.83 / 2.84 | 46 / 54 → same |
| Installation, arrival (old 0.2, new 0.43) | 6.18 [4.79-8.38] | 5.00 [4.67-6.28] | 158 → 163 |
| Installation, placement (old 0.5, new 0.65) | 5.58 [4.82-7.87] | 5.99 [5.91-7.89] | 144 → 157 |
| Installation, the site made ready (0.1 / 0.24) | (none) | 4.96 / 4.83 | 106 / 115 |

| Switched on and off inside one page | Cost a frame | Draw calls |
| --- | --- | --- |
| The floor's reflection, card at rest | 0.26 ms | +62 |
| Rooms behind lit glass, card at rest (first version) | 0.85 ms | |
| The same, with one test round all the furniture first | 0.11 ms | |
| Rooms, the capsule set (the largest lit windows) | 0.39 ms | |
| Rooms, the installation's last frame, lights on | 0.05 ms | |

- **The card costs about 0.4 to 0.6 ms more at rest** (median and fast
  state), for what was asked: the reflection (0.26), the rooms (0.11)
  and three larger buildings in the frame. More than the half
  millisecond the rules allow without a reason: the reason is the
  request. It is still the cheapest frame of the hero. The lift-away is
  0.3 ms dearer for the same reasons; once the land is in, the
  reflection is not drawn and the frames cost what they did.
- **The rooms behind the glass first cost 0.85 ms** on the card; one test
  against a box round all the furniture, before the pieces, brought them
  to 0.11 (most rays never come near the furniture).
- **The capsule set is cheaper** (0.3 ms): nearer the capsules, less of the
  wood and the land is in shot.
- **The installation's last frame** read 4.0 before and 5.4 now in one
  run, then 14.2 and 14.7 when the laptop had dropped to its slow state;
  the rooms there cost 0.05 ms switched on and off. No difference that
  can be told from the spread.
- **Frame pacing**, a steady 1500 px/s scroll: the hero, three passes
  against one, one long frame each where the next film mounts (73 and
  84 ms now, 68 before; one pass of 283 ms that did not recur). The site
  film, three passes each: 1 or 2 frames over 25 ms before, 4 now, one
  of them 85 to 117 ms at the same place every pass. Profiled: the road
  film's canvas being released (`forceContextLoss`, R3F's teardown) as it
  leaves the viewport's neighbourhood. Before, the static section
  between the two films was on screen at that moment; now the site film's
  first screen is. A deferred release (in the next quiet moment) would
  take it out of the scroll; not done, as it changes how every film
  lets its stage go and holds more GPU memory meanwhile (F9).
- **Moving against still**: the card at rest, mean 0.52 of a grey level,
  largest shift of any twelfth of the picture 0.20; the site made ready
  (two poses, JPEG captures), 0.01. The reflection and the rooms are
  drawn the same in a moving and a settled frame (the reflection follows
  its buildings in `rig.beforeDraw`, which both run).
- **Not measured:** a phone; the production build's pages; the
  configurator's frame (nothing in its 3D changed: its windows are day
  glass).

### F12. Tenth pass: the client's second brief of 2026-10-11 (section O)

Method as F9 to F11. "Before" is the tree as it stood after section N
(that morning's round, not committed), copied and served beside the
working tree. The laptop changed power state inside most runs: where a
range is wide its low end is the fast state, and the two builds are
compared at their low ends as well as their medians.

| Where | Before, low end / median | Now, low end / median | Draw calls |
| --- | --- | --- | --- |
| Hero, opening card at rest | 2.80 / 5.28 | 3.30 / 5.85 | 145 → 148 |
| Hero, card, the two lifted away (pre 0.17) | 2.31 / 5.18 | 2.94 / 5.74 | 145 → 136 |
| Hero, card, the house on the floor, land starting (pre 0.45) | 3.65 / 3.89 | 4.04 / 4.19 | 109 → 112 |
| Hero, card, land half spread (pre 0.6) | 5.47 / 5.94 | 5.90 / 6.24 | 110 → 113 |
| Hero, the farm set | 5.16 / 5.36 | 5.18 / 5.41 | 110 → 118 |
| Installation, last frame (0.97), lights on | 3.59 / 3.72 | 3.58 / 3.81 | 98 → 102 |

| Switched on and off inside one page, card at rest | Cost a frame |
| --- | --- |
| The floor as a physically shaded surface with the sky's environment (first version) | 0.88 ms |
| The floor as built: plainly lit, its sheen worked out | 0.50 ms |
| The floor's depth alone (its third step) | 0.02 ms |
| The reflections (62 draw calls) | 0.25 to 0.5 ms |
| The jack piers, installation's last frame | 0.04 to 0.05 ms |

- **The card costs about 0.5 to 0.6 ms more than it did that morning,**
  for what was asked: a real floor under the three (0.5) where there was
  the page's own colour, and reflections that reach farther on larger
  buildings. More than the half millisecond the rules allow without a
  reason: the reason is the request. It is still the cheapest frame of
  the hero, and the film after it costs what it did.
- **The floor was 0.88 ms as first built** (a standard material, the
  sunset's environment in it, over half the picture). What that bought
  was a sheen that grows towards a grazing angle in one colour: worked
  out in the shader on a plainly lit surface it is 0.50 ms and the same
  picture (two captures side by side; the built one is a shade paler).
- **Fitting the camera** (`fitRow`): 15 to 50 ms once for a size of
  screen, 88 fits of 28 steps each, on the main thread. It runs on the
  first frame at a size and once more when the fonts are in; while a
  window is being dragged it runs for each size it passes through.
- **A reading that was not what it seemed.** The installation read 3.55
  ms before and 6.88 now in three alternating rounds, every round. With
  the order of the two builds reversed both read 3.6 to 3.8 (and 7.0
  each in the round the laptop was throttled). The second page load of
  each pair had fallen in the slow power state every time. Inside one
  page the piers cost 0.04 ms. **Reverse the order before believing a
  difference between two builds.**
- **Frame pacing**, a steady 1500 px/s scroll through the hero, two
  passes and one of the tree before: median 16.7 ms, 95th percentile
  16.8 to 16.9, one long frame each (100 ms, 233 once) at the very end,
  where the next film mounts, in both builds. None inside the card.
- **Moving against still**, five poses of the card and the farm set:
  mean difference 0.5 to 1.4 of a grey level (the grain), largest shift
  of any twelfth of the picture 0.14 to 0.21; 0.55 at pre 0.6, where the
  mist is up and drifting (it is DOM, it drifts in both captures, and it
  is no longer the colour of what is under it).
- **Not measured:** a phone; the production build's pages; GPU memory
  (one more plane and no new target: not expected to move).

### F13. The round of 2026-10-14 (section Q)

Test laptop, headless Edge, 1280 by 720 at 1.5, one timer query per
frame, medians of three interleaved rounds, both orders; the baseline is
the last commit (8e02642), which was the tree before the round.

| Pose | Before | After |
| --- | --- | --- |
| Card at rest (pre 0) | 4.12 to 4.17 ms, 156 calls | 4.11 ms (low 4.01), 121 calls |
| Card, the two going down (pre 0.15 / 0.3) | 3.56 to 3.89 / low 2.83 | 3.76 to 4.01 / low 2.85 |
| Sunset set (0.05) | low 5.30 | low 5.24 |

- The second order's medians were in the slow power state (ranges like
  4.0 to 9.0 for one pose); the low ends agree to a few hundredths. No
  difference can be claimed, except **35 fewer draw calls**: the
  reflection's copies are no longer drawn in the occlusion pass, where
  they were always under the floor and contributed nothing.
- **Moving against still:** the card 0.81, the card's scroll at 0.2 0.47,
  the sunset 1.26 grey levels mean, no region more than 0.26 (grain).
- **Steady scroll** through the hero at 1500 px/s: 58.4 fps against 58.7,
  the long frame at the hero's end (the next film mounting) in both
  (68 and 49 ms against 87).
- **The MOD page's stage** (the hero's meadow set, canvas 1744 by 712):
  4.35 to 5.0 ms in the fast state (one first reading of 9.8), against
  3.3 to 4.1 for the capsule page and 2.5 to 3.7 for the prefab page. It
  is the grass: the same set costs 5.2 to 5.4 at full screen in the
  hero.
- **Not measured:** a phone; GPU memory on the MOD page (one stage, as
  on the other two sub-pages).

### F14. The mobile and tablet round (section R)

GPU time of a moving frame on a phone-sized screen (390 × 844 at 2, touch
emulated), the tree before the round against the tree after, three rounds
in each order: the phone's hero 0.3 to 2 ms a frame cheaper at every pose
but one (the institutional building, within the laptop's noise), with a
third fewer draw calls or better; the factory's first station the same
(3.0 against 2.7 to 3.3 ms) with 76 draw calls where it had 105 to 113.
The table is in R. Desktop was not measured again: its code paths are
the old ones, number for number (R, item 9), and every film's computed
style and box at nineteen poses are the same.

### F15. The second phone round (section S)

A moving frame on a phone-sized screen, before against after, three rounds
in each order: the factory and On site, now drawn in a frame of about half
the screen with the occlusion pass and refined finishes, cost what they
did (within the laptop's noise: the two orders disagree by more than the
difference); the hero's glides add nothing at rest and draw only the
buildings the camera is between. The table is in S.

### F16. Smoothness on phones (section T)

A lean finish on phones and tablets (4x multisampled as it moves, nothing
drawn again when it stops; a budget device without bloom or occlusion, at
1.25 pixels to the CSS pixel): a budget phone's frame the same or cheaper
on the laptop, with fewer draw calls, at more pixels. No layout read in a
scroll handler, the texture sets drawn in idle time, no blur over a live
picture on a touch screen. The factory on a phone is recorded clips: no live
stage at all there. The table is in T.

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

## N. The client's brief of 2026-10-11 and how it was carried out

Six items, relayed by the developer with three pictures: an AI-generated
reference for the opening card (the three side by side in a bright studio
on a glossy floor, warm rooms behind the glass, "Powered by" and the logo
under the wordmark) and two photographs of the live site on a wider and a
taller screen than 16:9. "Use your creativity... preserving the existing
functionality and performance." And: "in landing page it really dont
matter if it is a rendered one or picture... the goal for the landing
page is to understand the website and vee.build, not just the
animations but the real product."

1. **Branding.** The card's right-hand "Powered by" with the logo is gone.
   Under the wordmark, wherever it stands (header, footer, loading
   screen), "Powered by" and the Hemisphere One logo: `Brand.astro`, one
   lockup for the header and the footer. The header is taller for it
   (`--hdr` 4.25rem, 3.75 on a phone). On paper the logo as supplied; on
   ink a reversed copy derived from it (`scripts/logo-reversed.mjs`: each
   pixel read as a mix of the logo's near-black and its yellow and
   written as the same mix of the page's paper and that yellow; the
   drawing and the yellow are the supplied file's). The band under the
   footer keeps its own "Powered by" and logo, as the client asked on
   2026-10-09.
   **CONFIRM (N1):** the reversed logo is ours; ask Hemisphere One for
   theirs. Until this round the logo was only ever shown on paper.
   *Superseded 2026-10-14 (Q4):* the developer did not want the logo
   turned light; it is now shown as supplied on every ground, on a pill
   of the paper where the ground is ink, and the reversed copy is unused.
   "Keep the Vee.build name only beneath the Vee.build logo" was read as:
   the powered-by line belongs under the wordmark only.
2. **The opening card.**
   - *Arrangement.* The three stand side by side, close together, as in
     the reference (`rowFor` in `kit/sets.tsx`), and the camera is fitted
     to the screen it is seen on (`frameRow` in `HeroScene.tsx`): it
     stands as near as it can while the row keeps inside the margins, no
     building stands over the headline (beside it, right of the words,
     the block may rise to the second line's middle), and the names stay
     above the foot of the screen; the row is centred across and the
     height left over is shared, a little more of it under the names.
     The headline, the names and the margins are measured from the page
     itself, and again once the fonts are in. On a squarer screen the
     capsule and the block step back behind the house and the camera
     rises (`rowStep`: 0 from 1.9 wide, 1 at 1.25), so the row fills the
     height instead of leaving it empty. On a phone, two tiers seen from
     above, the house and the capsule in front, the block behind; the
     card's words stand at the foot of the screen there and the picture
     has everything above them. The studio floor's faint line is drawn
     behind the farthest of the three, wherever that falls (it was a
     fixed height and cut through the headline on tall screens).
   - *The block on the card is four bays long* (two floors, eight
     shells), not six: at one scale a six-bay block is three times the
     house's length and the three could not stand side by side at a
     readable size. The workforce set and `/prefab/` keep six
     (`WorkforceBlock`'s `bays`). **CONFIRM (N2).**
   - *Realism.* A studio light for the card (look `card`: a large soft
     key high on the left, in front; a cool fill; the studio's room in
     every reflection), which turns into the farm's sunset while the land
     comes in and the mist is up (`rig.mixLook`, `LIGHT_IN`): lights,
     exposure and grade in between, the room's environment faded out and
     the sky's faded in round the middle, the key light swinging round
     in the middle of the change only. Rooms behind lit glass
     (`interiorGlass` in `kit/materials.ts`): a ray from each pixel of a
     lit pane into the building's room box (`withRoom`, given by the
     shell, the hero's house and the capsule) meets walls, floor boards,
     the ceiling, a sofa with a table and a floor lamp or a bed with a
     bedside lamp, a picture on the far wall, lit by a ceiling light and
     the lamp; each room picks its own from where it stands. Wherever lit
     glass is used (the hero's sets, the 3D tour, the installation), not
     only on the card; dark until the building's lights come on, as
     before. A glossy studio floor (`kit/mirror.tsx`): the three drawn
     again upside down under the floor, one small shader for all of them,
     written into the canvas's coverage so that the reflection lies over
     the page's own studio without any blending; it fades with depth and
     is stronger at a grazing angle, and goes with the floor's shadows as
     the land comes in. The porch lamp is softer (it read as a flash).
     **CONFIRM (N3):** the furniture is illustrative; nothing about the
     interiors was supplied.
   - *Not taken from the reference:* its house (French doors, another
     deck), its capsule (another maker's), its container-like block with
     steel corner posts. The buildings are VEE.BUILD's own models; the
     reference set the arrangement, the studio and the light. The card
     stays live 3D, not a picture: the scroll lifts two of them away and
     brings the house's land in, and a still picture could not do that
     without a change of picture the client ruled out (2026-10-07).
3. **Capsules at life size.** The hero's capsule set is seen near eye
   level from about 26 m, the row across the foot of the picture and
   under the caption, whose lower left was empty ground (`SETS.pods`).
   Before, the camera stood 36 m off, the row sat in the right half and
   the 20′ was cut by the edge. `/capsule/` frames its three on its own,
   near and at eye level, across most of the stage (`FRAME` in
   `ShowcaseScene.tsx`). The capsules' sizes are unchanged (3.0 m wide,
   3.15 m tall on their legs, 10′, 16′ and 20′ long): what read as
   toy-like was the camera's distance and height.
4. **2.2 Lift & shift.** Only the shell about to move was lifted; the
   6 × 3 stood still while its red hooks and the arrows over them rose
   without it. Now each shell is lifted by its own hooks, the hooks and
   arrows on it throughout: the 3 × 3 first, the 6 × 3 a moment after
   (`liftOf` in `film/systemTimeline.ts`). Each eases off the ground,
   hangs still a moment and is let down slowly onto its seat.
5. **Prices.** The configurator shows an estimated price beside the area,
   with what it is made of in a breakdown under the add-ons, and both
   figures count to their new values whenever the build changes. The
   estimate is counted from what is laid out (`build/price.ts`): each
   shell; every footing (a combined one costs more) and metre of L plinth
   at the chosen height; every square metre of deck, post, metre of
   spandrel and of handrail (beyond the galleries' own), flight of steps,
   shade, sloped roof and solar array; the upper floors' gallery and
   staircase; delivery and placing for each shell. Rates in
   `data/pricing.ts`, in rupees, ex-works, excluding GST, delivery within
   100 km, finishes included. The enquiry the configurator prepares
   carries the estimate. Examples: The Pod ₹6,60,000; The Homestead
   ₹16,82,000; Duplex Prime ₹20,87,000; the Mid-Rise Apartment
   ₹1,14,03,000 (₹2,800 to ₹3,500 a square foot, all in).
   **CONFIRM (N5): every rate is ours.** Neither the brief nor the client
   gave a price; the earlier brand's price list is not used (D,
   "Pricing", now superseded by this instruction).
6. **Site preparation and the installation, one film.** The section
   "Ready before the shells arrive" (`SitePrep.astro`, three drawings) is
   gone; the installation film ("On site") begins with it (`PREP` in
   `film/installTimeline.ts`). On the scroll: the plot is pegged out and a
   string line run round it a little outside the footprint; a pit is dug
   where each footing goes; the plug footings are lowered in one after
   another, front first, each with its jack; the L plinths are laid
   between them; the pits are backfilled and the strings and pegs taken
   up. Each part is named as it goes in ("Plot marked out", "Plug
   footing", "L plinth"). Then, without a cut, the camera stands back as
   the truck comes down the lane with the shell, and the film goes on as
   it was (the placement on its own clock). The first caption is the old
   section's: "Ready before the shell arrives." with "Off-site
   construction with absolute minimum site impact." The film is 6.4
   screens where it was 4.4 (5.8 on a phone). The jack pier is not set
   here: since 2026-10-10 it comes with the add-ons (C2).
   **CONFIRM (N6):** the order of the site work (pegs, pits, footings,
   plinths, backfill) follows the client's model's scenes (H3); the
   string line and the pegs are ours.

**Found on the way.**
- Headless Edge's PNG encoder can hang for good on some pictures (the
  site film's first screen): the page is fine, its frames are drawn and
  presented, only the capture never returns. The capture tooling now
  takes JPEGs with the fast encoder (progress file, QA aids).
- With the section between them gone, the road film's canvas is released
  (context loss: about 15 ms of main thread, a frame of 50 to 100 ms)
  while the site film's first screen scrolls by, where it used to happen
  while the static section did. Not new work; it moved (F11).

**Not verified in this round.** A real phone or tablet; Safari and
Firefox; the reflection and the interiors on a GPU slower than the test
laptop's; the price breakdown with a screen reader beyond its markup (a
disclosure with a table; the settled figures are read out once).

## O. The client's second brief of 2026-10-11 and how it was carried out

Relayed by the developer the same afternoon, after looking at section
N's opening card in three windows of their own (1267 × 713, 1267 × 427
and 1267 × 303 CSS pixels at 150%: a browser window dragged shorter),
with two AI-generated references: the three on a white studio floor, and
the same three at sunset on a wet paved floor with a sky and trees. In
their words: "we actually want building arranged back to one another in
diagonal form. and for different screen size it does not fit well";
"the building size can be adopted but it is reducing"; "the client
wants to have something realistic not like how we have now. for clr,
keep what ever is in hero sections not the white one"; "use actual
rendering or use image or any other files, but either way the
animations should be there, and the website should not lag"; "for
background use subtle and warm shade"; "do not change any other page,
only the landing page and its continued animation to the hero page";
"in 08-on site, add jack pier to the deck and steps"; "for landing page
you have your own whole freedom... premium, a little gen Z".

1. **The arrangement.** The three stand parallel, one behind another on
   a diagonal, back to back: the capsule 9 m behind the house and a slab
   to its right, the block 34.5 m behind and two slabs to the right
   (`rowFor` in `kit/row.ts`, on the house's own plan and on the floor's
   3 m joints). Seen on the diagonal too, they stand side by side across
   the screen, each showing its front and one end, the house nearest and
   largest: the reference's arrangement. Before, the capsule and the
   block were turned to face the camera and stood beside the house.
   - *Where the places come from.* Every place on the joints was tried
     for each of them, at several camera heights and screen shapes, for
     the largest house whose neighbours are not dwarfed (capsule at
     least 0.55 of it on the screen, block 0.72) with no building over
     another and every name clear (the session's `sweep2`, run in Node
     on the same fit the page uses). At eye level on a 16:9 screen the
     house is 33% of the screen's height where it was 27%.
   - *The camera's bearing* is 0.17 rad from the house's front
     (`ROW_AZ`). The house stands at the left of the picture and the
     stage's lens looks 73% of the way across (`focus`), so it is seen
     about 25° more from its side than the bearing says: near enough as
     the film's first shot sees it, which is why the way from the three
     to the house is a move round it and no turn of it. With the
     bearing the film has (0.44) the house showed more end than front.
2. **Fitting every screen** (`fitRow` in `kit/rowfit.ts`). The card's
   words are measured from the page (margins, header, the headline no
   building may stand over, each name's own box, the scroll cue) and
   every arrangement is fitted into what they leave, twice: under the
   headline across the whole width, and beside it, to its right, for a
   window too low to have anything under the words. That second place
   is what the short windows lacked: the row was centred across the
   screen, so on a low window it had to shrink until it cleared the
   headline (the house under 30 px tall in the 303 px window; about 130
   now). The
   arrangements differ in how high the camera stands (`s`): eye level
   (2 m) where the screen allows it, as in the reference, higher where
   that gives real size (a 4:3 or upright screen), with the block moved
   across behind the house so the three climb the screen. Of those whose
   names are clear the lowest is taken that is at least 0.84 of the
   largest. Names that would touch are moved apart. The camera is never
   raised or lowered to place the picture, only moved sideways and
   tilted: moved down, an eye-level camera was under the floor.
   On a phone the same, steeper, with the words under the picture.
   Checked at 1267 × 303, 1267 × 427, 1267 × 713, 1920 × 1080,
   2560 × 1080, 1024 × 768, 1024 × 1366, 820 × 1180 and 390 × 844, and
   by resizing a loaded page through four sizes.
3. **Realism, in the hero's colours.** Live 3D, not a picture: the
   scroll lifts two of them away and grows the meadow from under the
   third, which a picture could not do without the change of picture the
   client ruled out on 2026-10-07; and the references' buildings are not
   VEE.BUILD's (N, "Not taken from the reference").
   - *A floor* (`kit/plaza.tsx`): polished pale concrete in 3 m slabs,
     each a shade of its own, the joints laid from the house's walls. A
     real surface where the card had the page's colour: it takes the
     light and the sheen of a low sky at a grazing angle, hides what a
     footing has under the ground (the house now stands on its pedestals
     on the card as it does in the meadow), and gives the occlusion a
     ground to darken at every foot. Drawn in three steps so the
     buildings can be mirrored in it without a second view of the scene:
     its colour (no depth), the mirrored buildings laid over it
     (`kit/mirror.tsx`, now blended over the floor in the opaque pass),
     its depth alone. It ends by fading into the shade behind, its
     colour let down with its coverage as the screen will show it (a
     floor merely multiplied by its coverage came out as a bright rim
     where it faded: the finish develops the picture before the page is
     put behind it). On a phone it is an island under the three and
     stops over the card's words.
   - *Light* (look `card`): a warm key from in front and to the left,
     31° up, on the fronts; high enough that the house's shadow stops
     short of the capsule and the capsule's of the block (a lower sun
     laid each across the next); a soft fill from the right for the
     ends; the farmhouse's sunset in every reflection (`skySun`: a look
     may have its sky's sun where its key light is not). It becomes the
     sunset's as the land comes in, as before.
   - *Behind* (`.film__backdrop--studio`, film.css): a warm shade, ivory
     overhead, an apricot glow where the floor would meet the sky; the
     scene tells it where that is. No sky until the land comes.
     "Subtle and warm shade" was read as this, not as the reference's
     sky with clouds and trees.
   - *The way into the film.* The two behind are lifted away and the
     camera goes round to the house, as before. The floor's shadows go;
     the meadow grows from under the house over the floor (while a
     clearing is open the land is laid over what is under it, by its
     coverage: `atmosphere.ts`), and what the meadow has not reached
     goes into the shade (`FLOOR_OUT`) before the land comes to its own
     hills, which dip under a flat floor. Mist in the card's shade
     rises over the change.
   **CONFIRM (O1):** the floor and its slabs are ours (nothing about a
   show floor was supplied); the card's light is ours.
   **CONFIRM (O2):** eye level or raised. A low window gets eye level
   (2 m); the developer's 16:9 laptop a camera 3.8 m up; a larger or
   squarer screen 7 to 13 m, because the three stand a fifth to a third
   larger there that way. `NEAR_BEST` in `rowfit.ts` is the one number
   that decides it.
4. **Jack piers in "08 On site".** The building of the installation
   now stands its deck's posts on jack piers and carries the foot of its
   steps on two, as "Componentized building" and the hero's house do
   (`piers` on `House`; `PIER` in `kit/house.tsx`, section 3's heights:
   a head 260 mm up under a post, 160 mm under a stringer's level
   sole). They are set by the film's own clock just before the add-ons
   that land on them (`piers` in `installClock`), and the assembly's
   caption says so in 3.3's words where the build has posts or steps.
   The add-ons land 0.38 s later for it.
   **CONFIRM (O3):** in "08 On site" only, as asked. The configurator
   and the 3D tour show the same house without them (J's open question
   stands); it is one prop to switch on.

5. **The small line over the headline is gone** (developer, the same
   evening: "remove vee.build . mod . pod . fab from the landing page
   and place the one system many buildings a little bigger and upwards").
   The headline starts where that line stood and is a size larger (7.3vw
   against 6.7, 13.5svh against 12.4); the three are fitted to what it
   leaves, as before. The three codes are still on the card, over each
   building's name, and in the menu.

**Found on the way.**
- The block's gallery lay flat on the floor before the block was built
  (a slab scaled to nothing in height): a hairline in the white studio,
  a dark strip on a real floor. A speck now, on the card only.
- The land's trees and shrubs cast shadows from the moment the land is
  there, before the clearing has reached them: on a bare floor, marks
  with nothing to cast them. The floor's shadows now go before the land
  comes.
- Stains on the floor round the house, once the other two had gone
  (developer, the same evening, with a screenshot). The occlusion pass
  draws the whole scene, shown or not: the grass and shrubs the clearing
  had not reached darkened the floor where they stand. On the page's own
  colour that never showed; on a real floor it did. The land now keeps
  out of that pass while the floor is there (`userData.unoccluded`,
  read in `post.tsx`; set in `HeroScene`).
- The baseline copy's dev server answered some page loads with "The URL
  must be of scheme file" (its own error page) while it was bundling;
  the next load was fine.

**Not verified in this round.** A real phone or tablet; Safari and
Firefox (the backdrop's gradient stops are `calc()` on `svh`, as
before); a GPU slower than the
test laptop's; a window resized by dragging, which fits again at every
size it passes (15 to 50 ms each).

## P. The developer's brief of 2026-10-12 and how it was carried out

The opening card ("One system. Many buildings."): its three buildings
were to look like architectural photographs and not like models, with a
reference picture as the benchmark of realism (the card's own three,
repainted by an image service: plaster with a tooth, a seamed metal
roof, a wet floor mirroring lit windows, a sunset behind). Not of
design: no sky, mountains, plants or objects from it, and the picture
itself never used. Scope: the card only. A first pass the same day
(calmer maps, the same light) was refused in one line: "you are making
no actual changes". It was right; at the size the three are shown
(about 90 screen pixels to the metre) a better map alone does not read.

1. **Real time, as it is; not a pre-rendered picture.** Weighed as asked.
   A picture cannot be the card: the three are arranged and the camera
   fitted for every window (`rowfit.ts`), each is lowered in and lit, the
   scroll lifts two away and goes round to the house while the land
   grows under it, and the names are placed from the scene. A picture
   for each of those would be a second site, and a picture that hands
   over to the scene would be two pictures of one thing (the rule that a
   moving and a still picture are the same). And what the reference has
   that the card lacked is not costly in real time: a surface's response
   to light, a floor that gives the windows back, light and shade. So:
   the existing models, geometry untouched but for the roof's seams
   (30 by 44 mm, were 35 by 30).

2. **What changed, on the card.**
   - Walls: micro concrete, sprayed and floated. One grain all over
     (sand, and the float's stipple a finger's breadth across, which is
     what still reads at that size), each hollow a little darker, no
     blotches or stains; colour and relief on one tile of 1.9 m, the
     roughness on another of 3.1 m.
   - Roof: standing-seam metal with a factory coat, pans 0.5 m, the
     seam's turn-up and two stiffening ribs in its normal map, the
     sheet's slight waviness along the fall, its verges and eave plain.
     **CONFIRM (P2):** the brief names the sloped roof as an add-on and
     not what covers it. Ours, in the trim's colour; one entry to change
     (`roofing` in `src/data/build.ts`: `surface: 'plain'` is the coat
     alone).
   - Steel (rail, stair, fascia, trim, the capsule's frames): a powder
     coat, not a bare metal. As metals they had only a plain floor to
     show and went dead black.
   - The capsule: semi-gloss coated panels, a sheet not perfectly flat.
   - Glass: polished, and it gives back the sky it faces over the room
     behind it.
   - Photovoltaic panels: frame, ten cells by six, busbars. Seen from a
     phone's raised camera; from eye level only just.
   - The block: each shell a shade of its own (0.93 to 1.04), as shells
     cast on different days are (`varied` on `DropModules`).
   - The floor's reflection (`kit/mirror.tsx`): more of each building's
     height (3.3 m, was 2.1), stronger (0.72, was 0.46), lit glazing
     given back more strongly than a wall, and seen in the floor rather
     than over it: each slab its own polish, a joint matt.
   - Light (`card` in `kit/looks.ts`): the same directions and colours,
     more key and less fill (sun 2.7, was 2.3; sky light 0.5, was 0.7;
     fill 0.26, was 0.34; shadows on the floor 0.58, was 0.5). Fronts and
     floor come out as bright as before; ends and shadows are deeper.
     Raising the sky's light for the card instead (0.16 to 0.45) washed
     every wall out and was undone: the refined sheet metal, coat and
     glass ask for several times a plain material's share of it.

3. **Kept to the card.** The scene asks (`<Refined>`, `kit/refined.ts`);
   the kit's components pass `useRefined()` as the last argument of
   `kit`, `shellMat`, `trimMat`, `moduleMats`, `litGlass`. A material's
   own definition is as it was, to the character, and a refined scene
   never makes the old one (so it never draws the old maps). The hero's
   pods, workforce block and campus, the sub-pages and every other film
   have the kit as it was. When a scene is to take the finishes it is
   put inside `<Refined>`; when all have, each recipe becomes its
   material's definition and the argument goes.
   **CONFIRM (P3):** the house keeps its finishes through the slide that
   follows the card ("Modular house", the sunset): it is the same house,
   and the camera goes to it without a cut. Its roof gives back more
   there than on the card, the sky being three times as strong in that
   look. The capsule's hull has metre UVs now and the roof of the hero's
   house too: no picture changes for that anywhere else.

4. **The maps are files.** `scripts/textures.mjs` bakes eleven 512 px
   maps to `public/textures` from seeded noise (298 kB in all, the
   wall's normal map 135 of them). Nothing is downloaded and nothing
   scanned. `fileTexture` (`kit/textures.ts`) gives a material a
   one-pixel map of the file's mean at once, so it compiles once and
   looks nearly right, fetches and decodes the file off the main thread
   and swaps it in; the stages draw again on `vee:textures`. 512 px is
   already three times what the screen shows of a wall.
   **CONFIRM (P4):** scanned sets (ambientCG, Poly Haven: free for
   commercial use) would go into the same slots, if wanted; they are a
   download of someone else's files and were not fetched.

5. **Measured** (2026-10-12, test laptop, headless Edge, timer queries;
   the baseline is the tree before the round).
   - Two page loads could not be compared that day: one pose read 3.9 to
     12 ms in either build, in both orders. What settled it was swapping
     the materials inside one page, round-robin (the script builds the
     pairs from `kit(name, true)` and `kit(name, false)`).
   - The refined materials against the kit's, the card, moving frames:
     3.74 against 3.69 ms (+0.06, ten rounds, every round within 0.2);
     the house alone on the card 2.42 against 2.40 (+0.02). At a phone's
     size (390 by 844 at 3) 1.63 against 1.88, a noisy batch, low ends
     1.45 and 1.47: none that can be shown.
   - The floor's reflection, on against off: 0.34 ms now, 0.31 before.
   - So about a tenth of a millisecond on a card of 3.7. Draw calls and
     triangles as before (148 or 156 with the shadow pass, 168 725).
   - Moving against still, the card, the house alone, the sunset: 0.91,
     0.41 and 1.92 grey levels mean, no region more than 0.24 (grain).
   - A steady scroll through the hero at 1500 px/s: 56.0 fps twice,
     54.9 and 52.4 on the baseline; one long frame in each, at the hero's
     end where the next film is mounted, as before.
   - Startup, production builds, loads alternated, both orders (taken
     after the first pass; not again after the second, which added one
     9 kB map and no work at load): first picture 2.5 to 2.9 s median
     against 3.0 to 3.1, the same build ranging from 1.2 to 4.7 s. No
     difference can be claimed either way.
   - On a line of 200 kB/s with 150 ms latency: first picture at 4.9
     and 6.5 s (baseline 6.6); the maps were in between 4.2 and 6.8 s,
     all but the last one or two before the first picture. No long frame
     that the baseline did not also have after its first picture.

6. **Looked at.** The card at 1280 by 720 at 1.5, a phone (390 by 844),
   a tablet (820 by 1180), a short window (1267 by 427) and 4:3; the
   lowering-in; the lift-away, the house alone, the mist and the sunset;
   the hero's other three sets against the baseline (unchanged);
   "How it works" and "Componentized building" against the baseline
   (unchanged); `/capsule/`, `/prefab/` and `?still` for console errors
   (none). `npm run check`, `npm run build`, the legacy-name search.

7. **A canvas's pixels by the GPU** (developer, the same day, after the
   card: "when I zoom in I can see the pixels break; what if someone
   with a powerful GPU does?", then "can we keep it based on gpu").
   Every canvas had at most 1.5 pixels to the CSS pixel, whoever drew
   it: all there are on the test laptop at 100%, too few in a window
   zoomed in (200% leaves it a quarter of the CSS pixels: a 937 by 540
   canvas stretched over 1920 by 1080) and on any denser screen. A
   stronger GPU changed nothing. Now (`kit/gpu.ts`):
   - The GPU is measured once a visit, before the first stage's first
     frame: a fixed piece of shading (1024 by 1024, forty turns of
     arithmetic a pixel), each run waited for by reading a pixel back,
     the least of three. The laptop reads 3.3 to 3.5 ms; the whole
     measure holds the page 22 to 26 ms, once for the tab (kept in
     `sessionStorage`). A GPU well behind the laptop on a quarter of the
     piece is asked no more.
   - That gives a budget in pixels: the laptop's 1920 by 1080 times how
     much faster this GPU is, times 0.8 (0.6 where the pointer is coarse:
     a phone slows as it warms), never over 3840 by 2160. A canvas has
     the screen's own pixels as far as the budget goes, at most 3 to the
     CSS pixel, in eighths; and never fewer than it had.
   - One decision for the visit. Only the emergency step takes it back
     (`Monitor` in `post.tsx`): the extra pixels go first, then the step
     down as before.
   - `?px=<megapixels>` fixes the budget (0: as it was); `__veeGpu` in
     the dev build has the reading.

   **Measured** (the laptop, timer queries, budgets switched inside one
   page). A frame's cost follows its pixels: the card at 2.05, 3.64, 5.14
   and 8.20 megapixels is 3.84, 6.40, 9.52 and 14.86 ms, and the GPU
   process holds 1138, 1431, 1636 and 2091 MB (about 155 MB a megapixel
   for a mounted stage; two can be mounted, which is what the ceiling is
   for). The laptop itself: at 100% nothing changes (1897 by 1080, as
   before). At 200% the card's canvas is 1640 by 945 where it was 937 by
   540, 1.84 ms where it was 1.43; at 150% 1676 by 960 where it was 1257
   by 720: the factory 3.70 ms where it was 2.49 (6.30 unzoomed),
   "How it works" 2.69 where it was 1.89 (3.58 unzoomed). So a zoomed
   window still costs less than the same window unzoomed. The picture at
   four times the pixels is the same picture, finer (looked at side by
   side at one size: the glow, the shadows and the occlusion as wide as
   they were; floor joints and plaster finer). Moving against still in
   the zoomed window: 0.37 and 2.06 grey levels (grain). The emergency
   path, called by hand: 1640 by 945 back to 937 by 540.

   **CONFIRM (P7):** what a GPU faster than the laptop's is given rests
   on one synthetic measure and on the laptop as the standard (its own
   frame times, less a fifth). No such GPU was at hand: a discrete card,
   an Apple laptop, a 120 Hz screen (which would rather have its frames
   than its pixels) and any phone are unverified. `KEEP`, `KEEP_TOUCH`
   and `CEILING` at the top of `gpu.ts` are the three figures to move.

**How far it is from the reference.** Nearer, not there. The reference
is a repainting: its floor is wet and dark, its sky is a sunset, its
rooms have furniture and plants, its block has a lamp at every door.
The card keeps its pale floor and shade (asked for), adds nothing to a
building that the brief does not name, and is drawn in 4 ms.

**Found on the way.**
- The baseline copy's dev server answers with its own error page laid
  over a working page ("The URL must be of scheme file", from the fonts
  it cannot reach through the junction): a capture of it is a capture of
  the error. Remove `vite-error-overlay` before each capture.
- `sed -i` in Git Bash writes a CRLF file back with LF endings.
- A heredoc in Git Bash, quoted or not, loses backslashes, and fails on
  an apostrophe: a script or a text with either is written with the
  Write tool.

**Not verified in this round.** A real phone or tablet (sizes were
emulated on the laptop); Safari and Firefox; a GPU slower than the test
laptop's; the names on the floor against their buildings' reflections
at every window shape (they were read at five; the reflections are
stronger than they were, progress file, known issue 30).

## Q. The developer's round of 2026-10-14 and how it was carried out

Three items, relayed by the developer for the client, and two more that
came in during the work. "Make the ui/ux logical and make decisions your
self. Make the website easy for the user to understand, avoid confusion."

1. **The opening card: whole buildings, not parts.** The client did not
   want each element dropped separately ("he wants the whole building to
   be dropped at the same time. In simple terms, we do not say modular in
   here, we only say what we offer"). The developer: "instead of dropping
   we spawn them building by building, no separate element wise."
   Until then the house was put together on the card (its shell lowered
   onto its footings, roof and panels, piers, landing) and the block shell
   by shell.
   - Now each of the three **comes up out of the polished floor whole**,
     one after another in the menu's order (house 0 to 1.6 s, capsule 1
     to 2.6, block 2 to 3.7), slowing as it arrives, as on a showroom's
     lift; each is dark while it comes up and lit once it stands, then
     named (`INTRO`, `raise` in `HeroScene.tsx`). Scrolling takes the
     capsule and the block back down into the floor, whole, the block
     first, as the camera goes to the house (`LEAVE`).
   - Why up out of the floor and not a whole-building drop: it is what
     the developer asked for ("spawn"), it reads as presenting a product
     rather than installing one, and it needs no change to any material.
     A fade or a dissolve would have needed blended or discarding
     materials on every refined surface (CLAUDE.md: a faded object needs
     a blended material). The floor's depth is drawn before the
     buildings, so what is still under it is hidden; the reflection keeps
     only what stands over the floor; a caster under the floor cannot
     shade anything over it.
   - Found on the way: the occlusion pass drew the reflection's copies in
     a plain material, without the shader's cut at the floor, so a
     building still under the floor stood over it in that pass and laid
     faint stains on the floor. The copies are now kept out of it
     (`userData.unoccluded`, `kit/mirror.tsx`): nothing changes in a
     standing picture (they were always under the floor there) and the
     card draws 35 fewer calls.
   - The hero's later sets (capsules lowered in, the block with its
     crane, the panels gliding) are unchanged: the request was about the
     opening ("when opening the site").
   - **CONFIRM (Q1):** coming up out of the floor is our reading of
     "spawn"; a whole-building drop (the client's own words) is one
     change of the same function.
   - The headline "One system. Many buildings." and the chapter line
     "01 — Modular precast construction system" were left as they are:
     "we do not say modular in here" was read as being about the
     animation. **CONFIRM (Q2):** whether the client also wants the
     words changed.

2. **A Home tab; MOD a page of its own.** "Currently the whole website is
   displayed in the modular tab. Add a new tab 'home' and everything as
   of now in the mod is shown in home tab. In the mod tab we will have
   something similar to pod and fab."
   - Menu: Home | MOD | POD | FAB and Contact (`primaryNav`). Home is the
     main page as it was (`/`); MOD is `/modular/`. In the header the
     four are one row of codes (HOME set in capitals like the others); in
     the footer, Products lists only the three lines (`line` on a menu
     entry).
   - `/modular/` follows the capsule and prefab pages: the client's line
     and "Made from two standardized shells, fully finished in the
     factory" (2.1 and 2.2's own words); a real-time picture of the
     opening card's house in its meadow at sunset (`kind="house"` in
     `ShowcaseScene`, the hero's farm set), whole from the start, its
     lights coming on as it comes into view; "Single system. Multiple
     footprints.": Shell A and Shell B with their sizes and areas, the six
     footprints, the three layers; the enquiry form with Modular Home
     preset. Nothing on it that the brief does not state.
   - **CONFIRM (Q3):** the MOD page's house has the kit's materials as
     they were, not the opening card's refined finishes (CLAUDE.md: no
     other scene takes them without being asked). One argument
     (`<Refined value>`) to change.

3. **From MOD and FAB into the home page.** "In the bottom of the mod tab
   and fab tab, we will have click to view how it works or whatever is
   appropriate, and clicking upon it, will continue from [section] 2 in
   the home screen. We show [sections] 2 and 5, 6 for fab, and 3 and 6 for
   mod."
   - Read as: each of those two pages has links to those chapters of the
     home page, each opening the home page at its chapter, from where the
     visitor scrolls on. MOD: 03 Componentized building, 06 3D tour. FAB:
     02 How it works, 05 Build your own, 06 3D tour. The numbers are the
     home page's own (`sections`), so they follow the catalogue's flag.
   - "Continue on the home page", headed "See how VEE builds it." (MOD)
     and "See how the system works." (FAB), each link a row: the
     chapter's number, its name, a line in that chapter's own words, an
     arrow (`src/data/onward.ts`, `Onward.astro`).
   - The second button at the top of both pages is one and the same
     (developer, the same day: "keep it common ... redirect both to
     factory"): "See how VEE manufactures it", the factory tour's own
     title, opening the home page at 07 The factory (`/#factory`). It was
     "See how VEE builds it" (down to the links) on MOD and "See how it is
     made" on FAB.
   - Placed after the enquiry form at first; the developer moved it the
     same day: "enquire is in top of continue ... shift that alone". It
     now stands just before the form, which is the last section of both
     pages.
   - Checked: each link lands with its chapter's top under the header
     and the boot screen gone (headless Edge, the four chapters).
   - POD has none: the capsule is not made of the shells, and the
     request named MOD and FAB.
   - Tried and taken out again: a "More on the modular house" link in the
     home film's first caption; over the meadow's tree line it could not
     be read, and the menu has MOD.

4. **The Hemisphere One logo in its own colours.** "In some places the
   hemisphere one logo turns white and light coloured, fix that" (two
   screenshots: the header over the capsule set and over "Componentized
   building"). That was the reversed copy of N1, shown on every dark
   ground. Now the logo as supplied on every ground, never recoloured; on
   ink it stands on a small pill of the paper (`.brand__logo`, base.css),
   whose room is kept on paper too so that the lockup does not move when
   the header changes ground. The reversed file and its script are kept,
   unused. The band and the loading screen were always on paper.

5. **Measured:** F13. Nothing costs more; the card draws 35 fewer calls.

6. **Arriving at a chapter by a link.** The developer, with a screenshot
   of `/#factory` reached from the new button: the foot of the 3D tour
   (its turntable and view keys) stood above the factory's title, "there
   is a session from top page, fix it". Two causes. The page keeps the
   header's height free above any target (`scroll-padding-top`), right
   for a paper section with its own top padding, wrong for a full-screen
   film; and the browser jumps before the page has settled, after which
   the fonts, the films and the configurator change what stands above,
   so it came to rest short (more than the header's height in the
   developer's window). Now a film gives that room back
   (`scroll-margin-top` on `.film`) and stands at the top of the window,
   as it does when scrolled into; and a visitor who arrives by a link is
   set on the chapter again on load, when the fonts are in and when the
   loading screen goes, unless they have begun to scroll (wheel, touch,
   key or pointer), and never after four seconds (`arriveScript` in
   `Base.astro`). Checked from the MOD page: 07 The factory, 02 How it
   works and 06 3D tour land with their top at 0; 05 Build your own, a
   paper section, under the header as before. The rail's and the menus'
   links on the home page take the films to the top of the window too.

**Looked at.** The opening held at eight moments of its opening and at
eight poses of the card's scroll (dev server, 1280 by 720 at 1.5);
`/modular/` at 1280 by 720 and 390 by 844, with the mobile menu; the
foot of `/prefab/`; the logo on paper, over the capsule set, over the
components film, in the footer. Production build: the four product and
home pages opened with no console error. `npm run check`, `npm run
build` (6 pages), the legacy-name search.

**Not verified in this round.** A real phone; the short windows (1267 by
303 and 427) for the opening's rise (the fit was not touched); Safari
and Firefox; the MOD page's stage on a slower GPU.

## R. The mobile and tablet round of 2026-10-14 and how it was carried out

The developer, with seventeen reference screens (`D:\float you thrive\vee.build moblie ideas`, outside the repo): "focusing on mobile and tablet optimization ... follow the reference designs closely ... product-first ... premium, polished, and simple ... retain interactivity ... optimize for performance ... DO NOT CHANGE THE DESKTOP VERSION". And: "in mobile view we focus very less on background and more on the product itself. same for the tab, but tab horizontal view can share similar experience with desktop, but not completely, i pad and other premium tabs, it is okay but for budget tab we have fall back."

Two corrections came during the work. First: "there should be some layout changes in the mobile and tab version which is not done, including the landing hero section ... scroll horizontal to view those three, and vertical to move hero sections ... same goes for factory. in mobile who wants to view such a long process?? ... use card options to view other options". Then, after a first reading that put all four of the hero's steps on cards: "the landing page shows that 3 building in that card option. in hero section only capsule pod have that cards for 3 options, all that 4 hero tabs follows vertical scrolling". And of "On site" with cards: "the onside it perfect".

**The references, mapped.** Every screen is a phone at about 390 px wide: the lockup on the left (wordmark, Powered by, the logo), on the right a Contact pill and a three-bar menu; the chapter's line in the accent; a large heading; the building large under the words, on a polished or studio floor with little or no landscape; at the foot, the steps as dashes and a count ("2 / 4"), or cards. Screen by screen: "VEE.BUILD Modular Architecture Showcase" (two phones): the opening card, the three kinds as cards with arrows; "Modular House, Built in One Day", "Prefab Building Showcase", "Lean. Clean. Resilient.": the hero's steps; "Capsule Home: Future Living": the hero's capsule step (its 10/16/20 ft cards) and the capsule page; "Mid-Rise Modular Building Assembly": How it works 2.5; "Componentized Building System" (two), "Insulated Concrete Shell Module", "Neon Add-Ons": section 3; "Lime-Accented 3D House Tour UI": the 3D tour (figures under the picture, the five views as a cross, "drag to rotate"); "Precision-Built Modular Factory UI", "Built with Precision", "Craned Modular Dispatch": the factory as a short list of stations with a picture each; "Modular Build: Foundation to Delivery", "Prefab Construction: Before and During Delivery", "Your House on Its Site": "08 On site".

**What the references have that the site does not, and was not taken:** copy that is not the brief's ("Modular, scalable, and ready for real-world needs", "A compact space, designed for more", "Built with precision", "Faster build time · Higher quality", "Mid-rise, module by module", "Portable · Customisable · Quick setup", "Explore modular systems", the factory's four stations "Frame assembly, Floor & services, Wall installation, Finished module", the dispatch's "Lift, Position, Secure for transport"); photographs (the cards' pictures are the real-time model's own); a crane hook over the frame in the yard (the client's order has no crane until dispatch); vermilion call-outs on a dark ground (the accent follows its ground). CONFIRM (R1): whether any of that copy is wanted.

1. **Device classes, in one place** (`src/film/device.ts`). *Compact*: up to 860 px wide for any pointer, as before, and up to 1100 px for a touch screen held upright (an iPad Pro is 1024 wide that way). *Touch*: `(hover: none) and (pointer: coarse)`. *Sideways*: a compact screen up to 520 px tall, held sideways. The stylesheets write the same queries out in full. A desktop browser never matches the touch clauses, so a desktop window wider than 860 px is untouched; a desktop window narrower than 861 px was already on the phone layout and has the new one.

2. **The films on a compact screen** (film.css, the compact block; `Film.tsx`; `Stage.tsx`). The words at the top, the building under them, large; no fade or wash over the picture (a dark film keeps a shade in its own tone at the top); at the foot the step marks as dashes (the one on show in the accent) and a count. Before, it was the reverse: the picture on top, small, and the captions at the foot over a fade.
   - The building is framed in the band the words and the controls leave (`progress.band`, measured by Film from whatever marks itself `[data-band="words"|"foot"]`, again when a control mounts later): the stage composes the picture for the band as if it were the whole screen, the lens taking the scene's own angle across the band's height and the look target in its middle (`frame` in Stage), and `aim` pulls back for the band's shape (`camera.userData.frameAspect`). The captions are stacked in one place, so the band is the tallest of them and the picture does not move when the caption changes. Desktop never has a band: its path through `frame` and `aim` is the old one, number for number.
   - `zoomCompact` (a Stage option, compact only): how much nearer than the desktop's composition a scene's camera comes, so that the building fills the band. Components 1.45, the 3D tour 1.4, the factory 1.35, the rest 1.
   - On a phone held sideways the words are on the left and the building on the right (the band is the right part).
   - A short phone (720 px tall or less, upright): smaller headings, and a caption's note line is not shown (`.film__note`, not the hero's).
   - How it works keeps a longer fog on a compact screen (its camera stands farther back there; the mid-rise stood in the fog).

3. **Cards** (`pick` in `Film.tsx`, compact only). A film's steps as a row of cards under the picture (a picture and a name each), with a count and two arrows; a card, an arrow or a sideways swipe on the picture chooses a step; the caption changes at once and the scene goes to that step's pose as a short time-lapse (1.3 to 1.4 s); the page's own scroll moves on past the film. Used by **the factory** (eight cards: the seven stations and dispatch; 2.25 screens of scroll where it was ten) and **On site** (five: site preparation to handover; 1.5 screens where it was 5.8). The cards' pictures are the real-time scenes themselves, settled at each step, captured at 480 × 300 (`public/images/cards/*.webp`, 12 to 20 kB each, fetched only on a compact layout; how they were made: progress, QA aids). Desktop never renders them. Since 2026-10-15 (S8) such a film is laid out as a page of its own (its words, its picture in a frame, a reel, the strip of steps) and plays its steps by itself; a swipe no longer chooses.

4. **The hero on a compact screen** (`HeroMobileScene.tsx`; desktop keeps `HeroScene.tsx`, and only it is fetched on desktop: `Hero.tsx` picks the scene). *The opening card*: "One system. Many buildings." and under it one of the three kinds at a time, standing alone on the polished floor and named on it, with the three as cards at the foot (MOD Modular house, POD Capsule home, FAB Prefab building), arrows, a count and the scroll cue; a card, an arrow or a sideways swipe chooses (`heroChoice`, `film/heroChoice.ts`): the one on show goes back down into the floor and the chosen one comes up, whole, its lights on once it stands, the camera easing over to it. Its title card is 1.05 screens (no land comes in). *Scrolling down* opens the card: the kind on show goes down, the house comes up, and the four steps follow, scrolled through as on desktop: each kind alone on the same floor, in the card's light, on the page's warm shade; at each cut the one on show goes back down into the floor, the camera moves on, and the next comes up (since 2026-10-15, S2, the camera glides from one to the next through a showroom instead). *The capsule's step* has its three lengths as cards under it (10′, 16′, 20′): the chosen one comes up; the floor and the shade go to dusk with its caption, which is on ink. No land, no sky, no mist. The house, the capsules and the block are the card's, in its refined finishes; the institutional building is in its materials as they were (CLAUDE.md). CONFIRM (R2): the institutional building in the refined finishes too. Superseded the same day: the card's row of three fitted together (it was the desktop's), and a first reading in which all four steps were cards.

5. **The product pages on a compact screen** (`ShowcaseStudioScene.tsx`; desktop keeps `ShowcaseScene.tsx`). The name as a poster, the building under it from edge to edge on the polished floor in the warm shade, coming up out of the floor when it is first seen, lights on once it stands; a finger drawn across it turns it (up and down is still the page's scroll: `touch-action: pan-y`). The capsule is one length at a time, at dusk, on ink, with 10′, 16′ and 20′ to choose from under it. "Drag to turn" under each. The materials are the kit's as they were (notes Q3).

6. **The header on a compact screen**: the lockup, the Contact pill and three bars (the word "Menu" is read out, not shown). The menu itself is as it was.

7. **Per film**: How it works, the footprint counter at the foot on the right in place of the count. Section 3, the tags in the caption as they were, smaller. The 3D tour, the build's figures under the picture with rules between them, the five views as a cross under them, the hint under that (as the reference). The factory: the shed and its stock, the batching plant and the two part-made shells are not built on a compact screen (product first: the words stand on slab and sky, not on the back of the yard), its title card is 0.75 screens and opens from under its words, its labels wait for it to open. The configurator: its tool row, which was already a row to swipe, fades at its right edge.

8. **Tablets.** Held upright: the compact layout, at a tablet's size (card rows centred when they fit). Held sideways: the desktop's layout and films (the client's "can share similar experience with desktop"), with what a touch screen already had (the section rail needs a pointer that hovers and is not shown). **Budget fallback** (`src/film/tier.ts`): a touch device's GPU is measured once a visit before its first stage mounts, with the same piece of shading and under the same session key as `kit/gpu.ts` (plain WebGL, no three.js; the stage then does not measure again). Slower than four times the test laptop's: *lite*. A lite device draws one pixel to the CSS pixel, the compact finish (no ambient occlusion), a 1024 px shadow map; and the two films that build the most take their phone's version: the hero's showroom (beside the desktop's captions when held sideways) and the factory without the back of its yard. Decided once, before anything is drawn: a moving and a still picture stay the same picture. Desktop is never measured and never lite. `?lite=1` forces it, `?lite=0` rules it out (QA). CONFIRM (R3): the threshold (4× the laptop) is ours; no budget tablet was at hand.

9. **Desktop kept as it was.** Every change is inside the compact or touch queries, behind `compact` (false on desktop), behind the lite tier (never on desktop), or is a new element hidden on desktop (`.film__count`, zero size). Checked on production builds of the tree before the round (`git archive HEAD`) and after, served side by side: every element's computed style and box on the five pages at seven desktop sizes (1280 × 720 at 1.5, 1920 × 1080, 1440 × 900, 1267 × 303 and 427 at 1.5, 1024 × 768, 900 × 800), and every film's own elements at nineteen poses at three sizes. Result, on the morning's build: on the five pages at seven sizes nothing differs but the new counts (zero size) and the two scroll cues' endless animation; in the films, 1,019 elements at nineteen poses at three sizes, none. After the second round (item 16) the footer's list of chapters and the rail have one entry more (On site), which moves what stands under them; nothing else differs.

**The developer's second round on the same work (2026-10-14, late, and 2026-10-15):** "under hero, capsule home, make the size of the capsule reasonable. the user must understand the actual size by looking it not by viewing 10' or 16' same for prefabs and the green thing makes the house not visible ... for factory sequence, you can zoom in a little, we dont want so much background ... the delivery video, make it skippable or scrollable, and if it is marked as 08, then onsite should follow 09". Then: "i didn't meant the camera distance in hero section, it is better before. i meant the actual size of the model it self. if you can see 10' pod it is so small, looks like a cat home"; of the ways offered, "bigger proportions".

10. **The capsule, home-like** (`POD_HOME` in `kit/capsule.ts`, compact only: the phone's hero and the capsule page's stage). The brief's lengths, the same openings at the same heights, on a hull 3.05 m high where it was 2.75, on 0.42 m legs, with its corners rounded at 0.42 m where they were 0.8: the door, the windows and the room behind them read as a room's, and the 10′ is a small cabin, not a box. Desktop keeps `POD` (the geometry is built from a section passed in; the desktop's is the same object and the same cache key as before). CONFIRM (R4): width and height are ours either way (C5); whether the desktop should take the same section.
11. **The prefab block** on the phone's hero (its card and its step) is the workforce set's whole block of six bays, where it was the desktop card's four: it reads as accommodation, not a cabin.
12. **Tried and taken out the same day: one scale for all.** The house, the capsules and the block seen from one camera distance (the block's), so that sizes could be compared: the developer, "it is better before". Each building fills its picture again. `poseFor`, `poseInRect` and `posesAlong` keep the option (`fixed`, `scale`), unused.
13. **Call-outs on a compact screen** (`Film.tsx`, `place`; film.css): a green box stands at the edge of the screen on its point's side, at the point's height, its tick running in to the point; smaller (0.58 rem), and wrapped into two lines where it is long. The building is no longer under the boxes. The components film comes back a little to leave the edges for them (`zoomCompact` 1.25).
14. **The factory nearer on a compact screen** (`zoomCompact` 1.75): the shell is the subject; the cards' pictures were captured again (`scripts/cards.mjs`).
15. **Delivery on a compact screen follows the scroll** like every other film and never holds the page (`play` in `Film.tsx` is the desktop's only); 2.3 screens of scroll. Desktop keeps the self-playing drive and its hold, unchanged. Superseded on 2026-10-15 (S10): it plays by itself on every layout and holds nothing.
16. **On site is chapter 09** (`chapters` in `site.ts`): it had the delivery's 08. Photo gallery is 10 and Contact 11; On site has its own entry in the rail, the menus and the footer's list, and "Now design yours." (`build-yours`) counts as part of it on the rail. This is the one change of the round that shows on desktop, asked for in so many words.

**Measured (notes F14).** GPU time of a moving frame on a phone-sized screen (390 × 844 at 2, touch emulated, headless Edge on the test laptop), the tree before the round against the tree after, three rounds in each order, medians:

| Pose | Before (old first / new first) | After |
| --- | --- | --- |
| Opening card | 3.40 / 3.11 ms, 82 calls | 2.58 / 2.59 ms, 52 calls |
| House | 3.02 / 4.77 ms, 56 calls | 2.49 / 2.76 ms, 44 calls |
| Capsule | 2.87 / 4.43 ms, 54 calls | 2.11 / 2.40 ms, 12–20 calls |
| Prefab | 2.70 / 3.23 ms, 36–44 calls | 1.91 / 2.65 ms, 26–34 calls |
| Institutional | 2.51 / 2.78 ms, 33–41 calls | 2.23 / 3.15 ms, 30–38 calls (within the laptop's noise) |
| Factory, station 1 | 2.65 / 3.26 ms, 105–113 calls | 3.02 / 2.99 ms, 76 calls |

The phone's hero builds no land at all (no grass, trees or fields), which was most of its main-thread work on load; not timed.

**Checked.** Phone (390 × 844 at 2, touch), small phone (375 × 667), phone sideways (844 × 390), tablet upright (820 × 1180) and sideways (1180 × 820), the budget tier forced (`?lite=1`) on a sideways tablet: every film, the hero's card and its swipe (a touch drag dispatched to the page), the capsule's lengths, the factory's and On site's cards, the product pages and the capsule's picker, the menu. `npm run check` (0 errors, 0 warnings), `npm run build`, the legacy-name search (none). Desktop: production builds before and after, fingerprinted as in item 9: every film's elements at nineteen poses at three sizes the same; on the pages only the footer's chapter list and the rail (On site, item 16) and what stands under the list. The 3D pictures on desktop, before and after, at seven poses (the opening card, the capsules' set, How it works, section 3, the 3D tour, the factory, On site), at 1280 × 720 at 1.5: within the grain (a mean 0.2 to 1.4 grey levels, no 16 px block more than 7 off the rail), the rail's marks moved.

**Not verified.** A real phone or tablet (all emulated, on the laptop's GPU); Safari and Firefox (`safe center`, `:has`, `inert`, pointer events with `touch-action: pan-y`); a real budget tablet, and so the lite threshold; GPU memory on a phone; a steady scroll's pacing on a phone; a moving frame against a settled one for the new scenes (they use the stage's finish unchanged and add no effect of their own).

## S. The developer's round of 2026-10-15 (phones and tablets, second pass) and how it was carried out

The developer, with two AI-made layouts of the factory on a phone ("there are two option the choice is yours, think based on user preference") and photographs of a tablet held sideways: "in this time, you are going to keep a user in mind". The asks, in order: the header translucent and the same everywhere; the hero's four steps with "a proper professional animation" instead of going down into the floor and coming up ("the drowning and spanning animation is good in the page one system many building. no changes in that"); the capsule filling its picture ("not too small, not too big, it is what it is ... should not leave empty spaces. look 10'"); "600mm above the ground and plug footing overlaps"; "How VEE is different" as cards ("if the user views it he should reads it and remembers it"); the configurator on a phone reduced to what is needed, the presets as small cards with price and area under the view, everything else folded "like a drop down" with a chevron that says so, and "full screen option to customize well in desktop version"; the factory's title card ("too old ... less looking like a ai"); the factory as the screens have it, its cards all one size; better texture and realism on phones and tablets, "as a 3d video ... premium finish"; delivery "automatic video not scrollable type ... can be skipped by scrolling", on desktop too ("it is like a mandatory view"); On site laid out as the factory, nearer, "make sure the final viewing angle is good and focused"; a tablet held sideways showed one building on the opening card ("ensure this layout is only for low end tabs, if a tab like ipad, android tab with high gpu, uses desktop version"); "there is white bar in the bottom while scrolling ... because of the address bar in the chrome". During the work, of the first factory layout: "looks like a 3rd std student designed. i asked for premium. and there are also in some places text are out of box", and "we dont need to have drag to explore, it is more like a 3d video".

1. **The header on phones and tablets** (base.css; compact or touch): one translucent band of its ground, `rgb(var(--scrim) / 0.7)` with a 16 px blur and a hairline under it, over every section, films included, at the top of the page too. Desktop keeps the rule of 2026-10-07 (no frosted band over a picture). CONFIRM (S1): this reverses that rule on phones and tablets; asked for in so many words.
2. **The hero's four steps: a dolly through a showroom** (`HeroMobileScene.tsx`). The opening card is as it was. After it the buildings stand in a row on the one floor (the house; the capsule's 10′, 16′ and 20′; the block; the institutional building), each to the right of the one before as the camera sees that one when it leaves it, as near as it may be while out of that picture and with the one before out of its own (`showroom`: pure geometry on the band's shape, once a shape, a few directions tried and the shortest kept). At each cut the camera glides from one to the next (`glide`): eased, drawing back in the middle until both are in the picture, a little higher; the caption changes on the cut as before. Choosing the capsule's length glides along its three the same way; on the way from the house to the 20′ the three stand side by side in the picture. Only what the camera is on, or between, is drawn. Nothing goes down into the floor or comes up out of it between the steps.
3. **The capsule fills its picture** on phones (`fill` 0.96 × 0.84 where it was 0.9 × 0.62): the 10′ as large on the screen as the 20′, its size told by its door, its steps and the floor's 3 m slabs and, on the glide, by the other two beside it.
4. **Call-outs kept apart** (`place` in `Film.tsx`): on a compact screen the boxes, and a dimension in a film that has boxes, stand at the picture's edge; two on one side are set down the edge in the order of their points, each clear of the one above, the tick running at a slant to its point. The capsule's length stays on its point.
5. **"How VEE is different" as cards** on phones and tablets held upright (sections.css, `Difference.astro`): each point a card (its number of six, its mark, the word, the claim, the detail, and what it replaces, struck through, where the brief names it), each stopping under the header as the page scrolls and the next coming up over it, the edges of those before it showing: a stack of six. The comparison table is not repeated there. Desktop: the comparison line is in the markup and not shown.
6. **The configurator on phones** (`Configurator.tsx`, build.css): the view (56 % of the screen) with its tools on one row (A, B, Select; rotate, remove, undo as marks); under it the presets as small cards, each with its area and its estimated price, laid out and counted as choosing it lays it out (`presetLayout` in `store.ts`); the build's two figures, the rest folded under them ("In figures"); Plot, Foundation, Add-ons, Finish and "Your house, plan" folded shut, each with what it is set to and a chevron; the buttons last. **Full screen on desktop**, asked for: a button by the view's own controls; the configurator alone over the screen, the view as tall as it is, the panel scrolling beside it (the browser's own full screen, or over the page where it has none); Escape or the button brings it back.
7. **The factory's title card on a compact screen**: on paper (`toneCompact`), the title at the top; as the page scrolls the picture's frame rises into its place under it while the camera comes down into the bay from high over the yard and round from the side (`OPENING` in `FactoryScene.tsx`), and the first station's words take the title's place. Desktop keeps its window.
8. **The factory and On site as a short film in parts** (Film `pick`, film.css). Of the two layouts sent, the picture in a frame of its own: the words keep their room on the paper and nothing lies over the picture (the rule of 2026-10-07 holds there too). The chapter's line; the step's words, set and clamped (two lines of title; four of text on a tall phone, two under 780 px), so that nothing runs into the next block; the picture in a frame with a hairline, the canvas the frame itself (`--card-*`, measured by Film: about half the pixels of the screen); the reel; the count, a pause button and two arrows, in hairline rounds; the steps as a strip of pictures, all one size, the one playing ringed in the accent. **It plays by itself**, like a video: the time-lapse to a step, a hold of 3.4 to 7 s by the length of its words, then the next, while most of the frame is on the screen; the reel fills as it goes; a card, an arrow or a mark of the reel chooses a step and it plays on from there; it stops at the last step, and the button then plays it again. With reduced motion it never plays. **Tried and taken out the same day:** the frame put over the words on a short screen, call-out pills in the frame, and "Drag to explore" (a drag turned the camera round what it looked at). CONFIRM (S2): the hold times, and that the steps play by themselves.
9. **The finish on phones and tablets**: a film in a frame keeps the occlusion pass the other compact stages give up (`POST_CARD` in `Stage.tsx`; never on a budget device), and, on a device that is not a budget one, the factory's sprayed shell and its trim and On site's house are in the opening card's refined finishes. CONFIRM (S3): the refined finishes beyond the opening card (CLAUDE.md held them to it), asked for here as "improve the texture, realism and others for mobile/tab only".
10. **Delivery plays by itself on every layout and never holds the page**: it starts when its stage stands in the window (however it got there) and its picture is up, runs its 4 s, and is left by scrolling on; "Scroll to skip" under it while it plays, "Replay" after. `film/hold.ts` is gone: nothing on the site holds the page. On a phone it is 1.6 screens, as on desktop. **A change on desktop, asked for.**
11. **On site on a compact screen**: nearer all the way (`zoomCompact` 1.2; the preparation at 0.82 of its distance; the rest from 2.7 to 2.2 reaches where it was 3.6 to 3), and at the last the house seen further round its front (0.46 rad), where its deck and its steps are, a little above eye level.
12. **A tablet held sideways.** The budget fallback's opening card shows the three together, one behind another as on desktop, coming up one after another (`ROW`, `rowFor`). The tier is decided by the GPU's own name first (`gpuClass` in `tier.ts`): Apple (every iPad), Adreno 640 and up, Mali G71 to G78 and G610 and up, Immortalis, Xclipse and any desktop part are never lite; Adreno under 640, Mali G31 to G57 and T, PowerVR, VideoCore and Vivante always are; so is a device that reports 2 GB of memory or less. Only a GPU it does not know (a Mali G68, a name the browser keeps) is timed, and the time no longer counts the wait for the answer, which on a tablet can be longer than the drawing and was counted four times over; the reading is kept under a key of its own (`vee:tier`), so a tab's old reading is not reused. The developer's tablet was most likely made lite by that wait. CONFIRM (S4): the list of parts.
13. **The strip under the page while Chrome's bar hides** (film.css, touch): a pinned film is as tall as the window at its largest (`100lvh`), its words and controls as tall as the window at its smallest (`100svh`): the canvas covers the strip the bar leaves, no control goes under the bar, and nothing is resized as the bar comes and goes. Not seen on a real phone: an emulator has no bar.
14. **The cards' pictures** of the factory and On site captured again from the frame (`scripts/cards.mjs` crops the frame where it stands).

**Desktop.** Production builds of the tree before the round and after, served side by side, fingerprinted as in R, item 9: the four product pages identical at seven sizes; every film's own elements identical at nineteen poses at three sizes (1,057 each); on the home page the new Full screen button (the view's controls stand that much further left), the comparison lines of "How VEE is different" (in the markup, not shown), the scroll cue's endless animation (as before), and fourteen elements whose only difference is a compact-only custom property (the delivery's phone length). Delivery's behaviour is the one asked-for change that is not in a fingerprint.

**Measured** (F15). A moving frame on a phone-sized screen (390 × 844 at 2, touch emulated), the tree before the round against the tree after, three rounds in each order, medians (before first / after first):

| Pose | Before | After |
| --- | --- | --- |
| Factory, station 1 | 3.19 / 1.98 ms, 76 calls | 3.79 / 2.01 ms, 101 calls |
| On site, preparation | 3.27 / 1.89 ms, 90 calls | 3.95 / 1.82 ms, 107 calls |
| Hero, house | 2.34 / 2.14 ms, 52 calls | 2.57 / 1.82 ms, 44 calls |
| Hero, capsule | 2.32 / 2.23 ms, 12 calls | 2.62 / 2.49 ms, 12–20 calls |

The two orders disagree by more than the differences (the laptop's power state): within that, the films in a frame cost what they did, the smaller picture paying for the occlusion pass and the finishes.

**Checked.** Phone 390 × 844 and 425 × 707 (the developer's), touch emulated: the hero's card, the glide at each cut, the capsule's lengths; the components' call-outs at the developer's pose; the difference cards while scrolling; the configurator (presets, folds, overflow: none); the factory's opening, its stations, its reel playing by itself; delivery playing, skipped, replayed; On site. A tablet held sideways with the budget tier forced (`?lite=1`). Desktop full screen in and out. `npm run check` (0 errors), `npm run build`, the legacy-name search (none).

**Not verified.** A real phone or tablet; Chrome's address bar on a real phone (item 13); Safari's full screen on an iPad (it has the over-the-page fallback); the GPU names on real devices (item 12); a steady scroll's pacing through the hero's glides on a phone.

## T. The developer's round of 2026-10-15, evening (smoothness on phones, the factory as video) and how it was carried out

The developer: "currently on some phones, like even with sd 695, the frames are dropped, the corner of the buildings look pixelated. optimize based on standard techniques, and ensure smoothness. also in few mobile, the white bar below the screen is still visible, in some phone it is'nt." And: "the fab institutional building is not properly viewable in every phone size ... make sure there is always space in left side for that slide, rather than in the right." And: "since the factory scene is more like a 3d video, we can make it more realistic, improve texture and improve realism and add in there like a video or what ever the best format it supports??"

**Why a Snapdragon 695 looked pixelated.** Its GPU (Adreno 619) is a budget part by the list of S12, so it was *lite*: one canvas pixel to the CSS pixel on a screen of about 2.6, each canvas pixel stretched over 2.6 of the screen's, and moving frames multisampled only twice. And it dropped frames: profiled on the laptop with the CPU slowed four times, a scroll down the page spent about 1.5 s laying the page out in the films' scroll handlers, about a second drawing procedural textures for scenes mounting in the middle of the scroll, and the page's blurred header and the configurator's blurred controls were worked out again for every frame of the pictures under them.

1. **A lean finish on phones and tablets** (`lean` in `kit/post.tsx`; Stage: a compact layout or a budget device). Every frame is drawn as it will stand, 4x multisampled (a tiled mobile GPU multisamples in its own tile memory at little cost), and nothing is drawn again when the picture stops: the second drawing of the scene and the cross-fade after every stop are gone, and a moving picture and a still one are the same picture. A budget device also goes without bloom and occlusion and has 1.25 pixels to the CSS pixel where it had 1. Desktop: as it was.
2. **No layout read in a scroll handler** (`Film.tsx`). Each film reads where it stands in the document once a change of layout (`watchLayout`: the page's height, the window, the fonts, its own size), not on every scroll event; one scroll listener for the whole page reads the scroll position once an event and hands it to every film (`onPageScroll`); the window's height is kept from its resize events. The call-outs at the edges are kept apart without making anything new each frame.
3. **The procedural texture sets are drawn in idle time** once the opening card is up (`prepare` in `kit/pbr.ts`, `film/prefetch.ts`), one an idle moment, instead of by the scene that first needs them as it mounts mid-scroll.
4. **No blur over a live picture on a touch screen**: the header is a band of its ground at 0.9 (it was 0.7 over a 16 px blur), and the configurator's controls over its view are plain white at 0.93. Desktop keeps its blurs.
5. **Tried and put back the same evening:** the hero's plain materials on a budget phone (the plaster lost its tooth, the roof its seams); texture sampling is cheap on a phone's GPU beside what was taken out above.
6. **The strip under a film where the browser's bar hides** (film.css, Base.astro): a pinned film is `100vh` where a browser has no `lvh`, never shorter than the tallest the window has been (`--vh-max`, kept by a script on touch screens from the window's resize events, again when it is turned), and its background is its own ground, so a strip the canvas does not reach is the film's colour, not the page's paper. Checked by growing an emulated window 60 px (the bar hiding): the films grew with it and kept that height when it shrank back.
7. **The institutional building's left end** stands whole with a tenth of the picture's width beside it on every screen (`anchor: { side: -1, at: 0.8 }`, `HeroMobileScene.tsx`); its near end runs off the right. Checked at 360 × 740, 375 × 667, 390 × 844, 412 × 915, 425 × 707 and 820 × 1180.
8. **The factory on a compact layout is recorded clips** (`film/ClipScene.tsx`, `FactoryTour.tsx`): one a station, rendered from the film's own scene by `node scripts/factory-video.mjs` at a quality no phone could draw live (1440 px drawn and 900 kept, 4x multisampled, occlusion at the canvas's own size, 4096 px shadows, the refined finishes, the whole yard, no grain: `?hq` on the dev server, `?live` for the live scene on a phone), 24 frames a second, H.264 in MP4, 3.3 MB for the eight (300 to 640 kB each; a phone fetches the one playing and the next). A clip plays when its station is chosen, by a card, an arrow or the reel playing on (`progress.chosen`), and stands on its last frame; each begins where the one before ended; the first plays when the title card has opened, the camera coming down onto the bay. With reduced motion, a browser that will not play a muted video, or a clip that will not decode, each station is its last frame as a picture. The live factory is not fetched on a compact layout. The cards' pictures are the clips' last frames. VP9 in WebM was tried: half the size, and Edge on Windows would not decode it (`MediaError` 3) though ffmpeg reads it; dropped. CONFIRM (T1): the clips show the default shell finish; the finish chosen in the configurator is not in them (desktop's live factory still shows it).

**Measured.** GPU time of a frame on the laptop as a budget phone (412 × 915 at 2.625, `?lite=1`, three rounds in each order, medians before / after): the hero's house 1.40 / 1.27 and 6.96 / 1.51 ms; its capsule 4.65 / 1.43 and 4.08 / 1.50 ms (20 draw calls, 12 after); the institutional building 1.34 / 1.81 and 1.41 / 1.72 ms; section 3 5.53 / 1.81 and 1.71 / 1.75 ms; How it works 5.77 / 2.39 and 2.43 / 2.34 ms (45 calls, 37); On site 2.73 / 1.46 and 5.30 / 2.40 ms (80 calls, 72), with 56 % more pixels and 4x multisampling where it had 2x. The laptop's GPU is not a phone's: a tiled GPU's multisampling is cheaper still. The main thread, profiled over one scroll through six sections with the CPU slowed four times on production builds: the 1.4 to 1.7 s of layout read by the films' scroll handlers is gone as such; the texture sets are drawn in idle time. A steady scripted scroll's frame rate on this laptop under that slowdown swung from 5 to 56 fps between identical runs and ranks nothing.

**Desktop.** Production builds of the tree before the round (the commit "updated mobile layout v2") and after, fingerprinted as in R, item 9: the five pages at seven desktop sizes the same but for the two scroll cues' endless animation; every film's elements at nineteen poses at three sizes (1,057 each) the same.

**Not verified.** A Snapdragon 695 phone, or any real phone; Safari's autoplay of the clips (muted and inline, as it asks); the bar on a real phone.

## U. The admin panel and the backend (2026-10-16) and how it was carried out

The developer, 2026-10-16: merge the admin panel with the website, keep only the features that are needed, host it all on Cloudflare ("entire cloud flare set up including d1 and r2. no supabase"), one login and no roles ("only one login no others, so no rbac"), proper security ("rate limiting, bot attack protection, every other thing required"), and a simple UI ("simple, easy to use and understand").

**Where it lives.** `admin/` in this repo, with its own `package.json` and `node_modules`, so the site's dependency tree is untouched: `admin/api` (Hono on Cloudflare Workers), `admin/panel` (the panel: React, Vite, Tailwind, shadcn; it was `vee-admin/apps/web`), `admin/shared` (the rules both use: zod schemas, `priceBuild`, CSV), `admin/migrations` (D1), `admin/scripts/set-password.mjs`, `admin/wrangler.jsonc`, and the set-up guide `admin/README.md`. The separate `vee-admin` repo (stages 1 to 5, on mock data) is left as it was and is superseded by this folder; nothing of it is deployed.

**One Worker for everything.** `wrangler.jsonc` serves `../dist` as static assets (the site, with `not_found_handling: 404-page`), and runs the Worker first for `/api/*` and `/admin/*`. The panel builds into `dist/admin` after `astro build` (`npm run build:all` at the root). Same origin for the site, the panel and the API: no CORS anywhere. D1 database `vee`, R2 bucket `vee-build-files`, three edge rate limiters, a nightly cron (20:30 UTC, 02:00 in India).

**Kept and dropped.** Kept: Overview (who waits for a reply, quotes out), Enquiries (list, search, status tabs, CSV, detail with reply by email / call / WhatsApp, notes, files, delete for good), Quotes (from an enquiry's configurator build or a preset; draft priced at the published rates, sent fixes them; print / save as PDF), Prices (edit, preview on the presets, publish a version, load an old one), Settings (business details for quotes, quote defaults, email notifications, password, signed-in devices, activity, download everything). Dropped from the panel's first draft: customers as a directory (an enquiry shows the other enquiries from the same email), the pipeline board (the status tabs do it), follow-up tasks, email templates and sending from the panel (replies go from the owner's own mail app or WhatsApp; nothing to warm up, no deliverability to manage), in-panel notifications (an email per enquiry and per sign-in instead), website content editing (the site's copy stays in `src/data`, under this file's rules), the audit-log screen (an activity list in Settings), quote revisions (a sent quote goes back to draft to change; "Make a copy" for a second option), demo data and the demo clock.

**Statuses.** Enquiry: new, contacted, quoted, won, lost, spam. Sending a quote moves its enquiry to quoted; an accepted quote moves it to won. Quote: draft, sent, accepted, declined, expired (set by the nightly job when the validity date passes).

**The site, changed.** (1) The enquiry form posts to `/api/enquiries` by default (`PUBLIC_ENQUIRY_ENDPOINT` still overrides; the `mailto:` fallback is gone, it never worked with `site.contact` empty). It sends the honeypot to the server rather than dropping the submission in the browser, gets a Turnstile token (`src/components/forms/turnstile.ts`, loaded when the form island mounts, invisible unless Cloudflare asks for a tick: the box is out of the form's grid until then, so the form's layout is as it was) and shows the server's own message on a refusal. (2) The configurator prices with the published list (`src/build/rates.ts`: `GET /api/pricing` once a visit, the site's own `data/pricing.ts` until it arrives or if it never does) and sends the build's counts with "Request a quote" (`quantities()` split out of `estimate()` in `src/build/price.ts`; `prefill.ts` carries `build`). (3) `public/_headers` (HSTS, nosniff, frame options, referrer and permissions policies, immutable `_astro`), `robots.txt` disallows `/admin/` and `/api/`. (4) `astro dev` proxies `/api` to `wrangler dev` on :8787.

**Security as built.** See `admin/README.md`, "Security, in short". PBKDF2-SHA256 at 100,000 rounds (the Workers maximum), compared in constant time, a dummy hash when the email is wrong; lockout after 5 failures from one address or 30 from anywhere in 15 minutes; `__Host-` cookie, HttpOnly, Secure, SameSite=Strict, token stored as SHA-256, 24 h idle and 7 days absolute; Origin and Sec-Fetch-Site checked on every change; JSON only, size limits; Turnstile on the form and the sign-in, failing closed without a secret; edge rate limits (5 enquiries, 10 sign-ins a minute per address) and 10 enquiries a day per salted IP hash; the same message twice in 10 minutes kept once; a strict CSP on the panel (no inline script: the theme script is `panel/public/theme.js`), never framed or indexed; uploads by allow-list and file signature, downloads as attachments under a sandboxing CSP; parameterised SQL throughout; CSV cells defused against formulas; sign-in and password-change emails to the owner; a nightly JSON backup in R2 kept 30 days, on top of D1's Time Travel. The panel's UI components imported `cn` from an unrelated npm package named `cn`; they now use the panel's own `lib/utils`.

**Checked.** `npm test` in `admin/` (63: the panel's price rule against all 16 site presets, and the site's own `quantities()` + `estimate()` run against `priceBuild()` line for line; the first price list in the migration equal to `src/data/pricing.ts`; form and CSV rules), both typechecks, `npm run check` and `npm run build:all` at the root, no legacy brand in `src`, `public`, `dist` or `admin`. Against `wrangler dev` with local D1 and R2: every refusal (no Origin, another origin, form-encoded, bad fields, no Turnstile token, honeypot, burst limit, lockout with the right password, stale or invalid or unchanged prices, illegal quote moves, fake PDF, .exe), the happy paths, the cron and its R2 backup; in the browser: sign-in through Turnstile's test key, each panel screen, a quote from a configurator enquiry, publishing prices, the site's form on `/capsule/` (₹, ′ and Tamil intact) and the home page's configurator: "Request a quote" at price list v3 showed ₹20,97,000 and the panel prices the same counts to ₹20,97,000. The panel at 375 px: no sideways scroll.

**Not verified.** A real deployment (no Cloudflare account or domain yet: steps 1 to 8 of `admin/README.md`); Turnstile with a real key (an interactive challenge, the box appearing in the form); Email Routing's send binding delivering (`notifyOwner` builds plain MIME by hand, base64 body, RFC 2047 subject); the CPU time of a sign-in on Cloudflare (PBKDF2 at 100,000 rounds needs the Workers Paid plan; the free plan's 10 ms would refuse it); the desktop fingerprint of R for the form (one new element, `.form__check`, out of the layout).

**Open points.**

- U1. CONFIRM: the features dropped from the panel (list above). Any can come back; the data model leaves room.
- U2. CONFIRM: the session lengths (24 hours idle, 7 days), the lockout (5 / 30 in 15 minutes) and the enquiry caps (5 a minute, 10 a day per address).
- U3. CONFIRM: quotes are printed to PDF from the browser; no server-side PDF (Cloudflare's Browser Rendering would be a paid add-on).
- U4. Done the same day: the site has an enforced Content Security Policy (below).
- U5. Workers Paid ($5 a month) is assumed (README). On the free plan sign-in fails.
- U6. A2 is settled: the form's destination is the site's own API.

**U4, the site's Content Security Policy (2026-10-16).** Written at build time by `scripts/csp.mjs`, an Astro integration (`astro.config.mjs`). After `astro build` it reads every page in dist/ (not dist/admin, which has its own policy). It hashes every inline script that runs (SHA-256, after turning CRLF into LF as the browser's parser does: the sources mix the two). Then it adds one policy to the `/*` block of dist/_headers, so Cloudflare sends it as a header on every path, the 404 included. Today: 8 hashes, 834 characters; the line limit is 2,000, and the build stops past it. It also refuses to build a page with an inline event handler (`onclick=`) or a `javascript:` URL, which no hash can allow.

Astro's own `security.csp` was tried first and dropped, for three reasons: it leaves out the three `is:inline` scripts of Base.astro (no-js, boot, arrive), which it would then block; its `<meta>` comes after the first script; and its style hashes would void `'unsafe-inline'` and block the pages' style attributes (111 on the home page).

The policy:
- `default-src 'self'`;
- scripts from this origin, the hashes, and `https://challenges.cloudflare.com` (Turnstile);
- styles `'self' 'unsafe-inline'`;
- images `'self' data: blob:`;
- fonts, media (the factory clips), fetch and workers `'self'` only;
- frames only Turnstile's;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`;
- no `'unsafe-eval'`.

What the pages load was read from the build first: no workers, eval or WebAssembly, and no host but Turnstile's. Violations are reported to `POST /api/csp-report` (both report formats; rate-limited, 16 kB, nothing stored), which logs one line each into Workers Logs. `CSP_REPORT_ONLY=1` at build time sends the policy as report-only, should something need it.

Checked: in a headless Edge, on production builds served by `wrangler dev`, every route (/, /modular/, /capsule/, /prefab/, /partnership/, the 404) on desktop (1440 × 900) and on an emulated phone with touch (390 × 844 at 3). Each was scrolled top to bottom, and / was also loaded once with its boot screen.
- No violation, nothing blocked, no new error (only three.js deprecation warnings, there before).
- WebGL drawn, 11 texture files loaded, the factory's clips loaded on the phone, `/api/pricing` fetched, Turnstile loaded, and the form sent under the policy.
- An injected inline script, a script and an image from another host, and a fetch to another host are all refused.
- The build step's own rules, checked on made-up pages: CRLF normalised, JSON-LD skipped, no duplicate line, report-only, `onclick` and `javascript:` refused, admin/ skipped.

Not verified: a browser delivering its own reports (Chrome did not send them from 127.0.0.1 within a minute; the endpoint answers both formats when posted to), Safari and Firefox, a real deployment.

When the site loads something new from another host (fonts, analytics, a video service), add it to `policy()` in `scripts/csp.mjs`, build, and run the pages through again: scripts/csp-audit.mjs does it (every route, desktop and phone, exits 1 on a violation).
