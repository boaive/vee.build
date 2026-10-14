# VEE.BUILD — project rules

Production website for VEE.BUILD, a modular / precast construction business.
Read `vee-build-context.md` (business + narrative), `vee-build-notes.md`
(open questions, source conflicts, decisions) and `vee-build-progress.md`
(state of the build) before changing anything substantial.

## Commands

```bash
npm run dev       # Astro dev server on :4321
npm run build     # static build to dist/
npm run preview   # serve dist/
npm run check     # astro check (types)
```

## Source priority

Latest client instruction > `assets/VEE.BUILD.pdf` (brief) > new client visual
references (sketch, render) > Wieldy catalogue / pricing HTML > anything else.
When sources conflict, record it in `vee-build-notes.md` and follow the higher
source. Never resolve a conflict by inventing a third value.

## Brand rules

- Public brand is **VEE.BUILD**. "Wieldy", "Wieldly", its logo, tagline,
  email, phone, pricing and testimonials must never appear in `src/` or
  `public/`. `assets/` is client source material and is not shipped.
- The top menu is **Home | MOD | POD | FAB** and **Contact**, nothing else
  (client, 2026-10-09; Home added 2026-10-14, notes Q). **Home** is the
  main page (`/`), everything that used to be under MOD; **MOD** is a page
  of its own (`/modular/`), as POD and FAB are. Partnership, Investors and
  Technology are in the bottom band under the footer, with "Powered by"
  and the Hemisphere One logo as supplied
  (`src/assets/brand/hemisphere-one.png`; it is dark on clear, so the band
  is on paper: do not recolour it or redraw it).
  Menu and band are `primaryNav` and `bandNav` in `src/data/site.ts`.
  CONFIRM: Investors and Technology have no pages; they lead to the
  enquiry form and to "How it works" (notes J2).
- The MOD and FAB pages lead on into the home page (developer,
  2026-10-14): just before the enquiry form, "Continue on the home page"
  with one link for each chapter that shows that line, MOD 03
  Componentized building and 06 3D tour, FAB 02 How it works, 05 Build
  your own and 06 3D tour (`src/data/onward.ts`, `Onward.astro`). Each
  opens the home page at that chapter. The enquiry form is the last
  section of a product page (the developer moved it back there the same
  day). POD has none: the capsule is not made of the shells.
- The three kinds of building are **Modular house**, **Capsule home** and
  **Prefab building**, with the client's line for each (`kinds` in
  `src/data/narrative.ts`). The two shells belong to the modular line
  only: they are not shown or named on the opening card. The capsule and
  the prefab building are not on sale yet and carry a **Coming soon** tag
  wherever they are shown (`soon` in `kinds`; client, 2026-10-10).
- Where the company is the subject it is named: **VEE** or **VEE.BUILD**,
  not "we" ("How is VEE different?", "See how VEE manufactures it.";
  client, 2026-10-10). An ordinary "we" or "us" in a sentence spoken to
  the visitor ("Tell us what you want to build") stays.
- **Powered by Hemisphere One**, with the Hemisphere One logo, stands
  under the wordmark wherever the wordmark does (header, footer, loading
  screen) and nowhere else on the opening card (client, 2026-10-11,
  morning; `Brand.astro`, one lockup). The logo as supplied on every
  ground, never recoloured (developer, 2026-10-14: "the hemisphere one
  logo turns white ... fix that"): on ink it stands on a small pill of the
  paper (`.brand__logo`, base.css), whose room is kept on paper too so the
  lockup does not move when the header changes ground. The reversed copy
  of 2026-10-11 (`scripts/logo-reversed.mjs`) is no longer used (notes N1,
  Q4).
- The capsule's form follows the client's three reference renders of
  2026-10-09 (`src/three/kit/capsule.ts`). Its lengths are the brief's
  10′, 16′ and 20′; nothing else about it is supplied (notes C5, C9). No
  mark, name or figure from those renders.
- No invented projects, customers, testimonials, certifications, prices,
  timelines or engineering specifications. Missing facts get a neutral
  presentation plus an entry in `vee-build-notes.md`.
- Client-supplied claims that need documentary confirmation are tagged
  `CONFIRM:` in `src/data/*.ts` and listed in the notes file.
- No generic inspirational copy. Use dimensions, component names and
  construction logic from the brief.
- A shell has one door (client instruction, 2026-10-07; openings after the
  client's single-shell model, notes H8). Which face carries it is decided
  in one place, `doorFaces` in `src/build/model.ts`, and every scene draws
  the shell through `moduleGeometry(type, door)`. Never add a second door to
  a shell to make a row or a stack read better.
- A footprint of "How it works" is one home and has one main door (client,
  2026-10-09): `mainDoor` in the same file keeps one of the doors that
  `doorFaces` gives and makes the other shells `none`. It stays on one
  shell as the row grows (a Shell A before a Shell B). The villa ("Net
  zero") has one main door a floor and, on the shell beside its terrace,
  a door onto the terrace (`floorDoors`). A shell that stands end-on to
  the street without the door shows a window there, never a blank end
  (`streetEnds`; client, 2026-10-10). CONFIRM: the configurator, the
  catalogue and the mid-rise still have a door for each shell (notes J7).
- The module is made of three parts, named and coloured as the client
  names them (2026-10-09): **structural frame** (steel, black: a ring at
  the floor with its joists, a column at each corner with a lifting hook
  on its head, and a ring round the top on the four sides with nothing
  across the middle; developer, 2026-10-10), **insulated panels** (EPS,
  white, in segments: walls, floor and roof), **micro concrete** (grey,
  over them: a wall's thickness round the shell, never a solid inside).
  Its door, windows and sidelights are the standard shell's
  (`joineryGeometry`, `moduleOpenings` in `kit/parts.ts`): never a set of
  openings of the film's own. The shell in its three parts is described
  once, in `kit/shell.ts`: "Componentized building" and the factory both
  draw from it (client, 2026-10-10: sections 3.2 and 3.3 are the source of
  truth for the frame). Do not give either a frame of its own.
- A jack pier stands where a deck post or the steps come down to the
  ground, not under the shell, and it is set with the add-on that lands on
  it, not with the foundation (developer, 2026-10-10). It carries what
  stands on it: the steps do not run on into the ground, their frame ends
  in a level sole on the pier's head (`carriedStairGeometry`). The hero's
  house has them too, under its landing and its steps (client, the same
  day), and so does the building of "08 On site", under its deck's posts
  and its steps (client, 2026-10-11; `piers` on `House`, heights in
  `PIER`, `kit/house.tsx`; set by the film's clock just before the
  add-ons, `installClock`). CONFIRM: the configurator and the 3D tour
  show the same house without them (notes O3).
- The deck, the steps and the sloped roof are add-ons, not standard parts,
  and are tagged "Add-on" in the picture when they land in section 3
  (client, 2026-10-10).
- A shell is lifted by its four hooks: from the crane's hook four slings
  to the corners of a lifting frame the size of its roof, and a sling
  plumb down from each corner to a hook (client's photograph, 2026-10-10;
  `liftRigGeometry` in `kit/machines.tsx`). In the factory and on site
  alike. It keeps the way it lies while it is in the air where the trailer
  can stand along it.
- A building's lights come on when it stands, never while it is being
  lowered in, brought up, carried or put together (client, 2026-10-10):
  the hero's three, the capsule homes, the installation, the MOD page's
  house. `litGlass()` in `kit/materials.ts`.
- "How it works" shows two stacks, the villa and the five-floor
  **Mid-Rise Apartment** ("high-rise" is not used anywhere). The two-floor
  apartment is a preset of the configurator only (`film` in
  `src/data/system.ts`).
- A building with an upper floor has one outer staircase, never two: a
  dog-leg (one U-bend a floor) standing beside the building, against its
  flank, not across its front (client, 2026-10-07). Where it stands and the
  galleries that lead to it are decided in one place, `layoutAccess` in
  `src/build/model.ts`, for the configurator and for every scene that shows
  a stacked building ("How it works" included, and the prefab block of the
  hero). Do not place stairs, galleries or balconies by hand in a scene.
- No door opens onto a drop. With the deck add-on on, every ground-floor
  door has a deck outside it, along that side of its shell, and each
  stretch of deck has one flight of steps, at a door (`layoutAddOns`). A
  deck or steps where no door opens is a fault, not a style.
- What is drawn on a building beyond its shells comes from the brief's
  add-on list (deck, post, spandrel, handrail, steps, shades, sloped roof,
  solar) or from that access rule. Nothing else: no canopies, slab roofs or
  balconies of our own.

## Architecture

Astro (static HTML per route) + React islands + React Three Fiber.

| Layer | Location | Rule |
| --- | --- | --- |
| Data | `src/data/` | All copy, specs, nav, catalogue, claims. No copy in scene code. |
| Website | `src/layouts`, `src/components/site`, `src/components/sections`, `src/pages` | Semantic HTML first. Sections work with JS disabled. |
| Animation | `src/film/` | Scroll progress, damping, timeline helpers, sticky film shell, DOM labels. |
| 3D | `src/three/` | `kit/` reusable geometry, `scenes/` one file per scene, `Stage.tsx` the only `<Canvas>`. |

- A scene is a pure function of one damped progress value (0–1). No scene
  owns scroll listeners; `src/film/Film.tsx` does. Two films also run on
  time, both on the client's instruction of 2026-10-10. The truck's drive
  (`Transit.tsx`) plays by itself, once: its progress is seconds, and the
  page is held while it plays (`play` in `Film.tsx`, `film/hold.ts`).
  The installation has a clock of its own that the scroll starts and runs
  back (`film/installTimeline.ts`). Each is still drawn by one function
  of its numbers, and with reduced motion each shows settled poses and
  holds nothing. Do not hold the page anywhere else.
- Text never lives in WebGL. Captions and callouts are DOM, positioned by
  projecting anchors (`src/film/labels.ts`).
- All dimensions in scenes are metres. Module A = 6 × 3 × 3, Module B = 3 × 3 × 3.
- A film's `<Canvas>` is mounted while the film is within a screen of
  the viewport, and unmounts (context released) when it is not. It may be
  mounted ahead of time, in a quiet moment, while the film is still up to
  `REACH` screens below the viewport, so the work of mounting is not done
  in the middle of the scroll that reaches it (`src/film/Film.tsx`; the
  factory film reaches farther, `reach`). Do not widen that: a mounted
  stage holds 300 to 500 MB of GPU memory (notes F9). Frameloop is
  `demand`; a stage out of sight draws nothing.
- How many pixels a canvas has is decided in one place, by the GPU
  (`kit/gpu.ts`; developer, 2026-10-12; notes P7): it is measured once a
  visit before the first frame, against the test laptop, and a canvas
  gets the screen's own pixels as far as that budget goes. Never fewer
  than the 1.5 to the CSS pixel it had, never more than 3840 by 2160,
  and one decision for the visit: not a resolution that changes with the
  scroll. Do not give a `<Canvas>` a `dpr` of its own, and do not raise
  `KEEP` or `CEILING` without measuring frame time and GPU memory at the
  size they allow (about 155 MB a megapixel for each mounted stage).
- What is drawn besides the scene belongs to the stage and the finish, not
  to scenes: the sky (drawn on its own and put behind the scene), the shadow
  map (redrawn only when the light or a caster has moved, or after
  `rig.warm`), ambient occlusion, bloom and the grade (`kit/post.tsx`).
- The scene's picture is premultiplied and its alpha is its coverage: what
  fades out lets the page or the sky through. The finish develops the
  picture before the page is put behind it, so a surface that fades must
  let its colour down with its coverage as the screen will show it
  (`pow(k, 2.2)`, as the opening card's floor does); merely multiplied,
  it comes out as a bright rim where it fades.
- A look may have its sky's sun where its key light is not (`skySun` in
  `kit/looks.ts`): the opening card is lit like a studio under the
  farmhouse's sunset. Looks with one sky and one sun in it share one
  environment map.
- A scene can ask the stage for less than the whole world: `rig.sky`
  (0-1, how much sky is behind the scene; at 0 it is not drawn) and
  `rig.clear` (a clearing: land is drawn only out to a radius from a
  point, fading into what is behind the canvas). Land materials take part
  by being made through `clearing()` (`kit/atmosphere.ts`); a new material
  for ground, grass, trees or anything else that belongs to the land has to
  be, or it will stand there before the land does. The clearing's test is
  compiled in only while one is open (a shader that can discard gives up
  early depth rejection), so every land material has two programs: warm
  both. While one is open the land is also laid over what is under it by
  its coverage (the opening card's floor), not written in its place.
  The occlusion pass draws everything in the scene, shown through a
  clearing or not: what is there but not yet shown keeps out of it
  (`userData.unoccluded`), or it darkens the floor under it as stains.
- A film that keeps parts out of sight until their turn sends all of them
  to the GPU when it mounts (`useWarmAll` in `Stage.tsx`), and builds its
  geometry in idle time before that (a `prepare` list exported by the
  scene, `film/prefetch.ts`). Otherwise each part costs a long frame the
  first time it shows.
- No drei, no GSAP, no smooth-scroll library. Add a dependency only if it
  materially improves the product; note why in `vee-build-notes.md`.

## Design rules

- Type: Archivo (variable, width axis) for display and text, DM Mono for
  dimensions and labels. Nothing else.
- Palette: warm concrete paper and charcoal ink. One accent, for measurement
  and interaction only, and it follows its ground: vermilion on paper,
  hi-vis green (`#c8f031`) on ink (`.theme-dark`, `.on-ink`; tokens.css).
  The two are never mixed on one ground. The green is used flat: no glow,
  no gradient. Formwork green exists only inside the factory scene.
  The small titles are in the accent of their ground, the whole line
  (developer, 2026-10-10): a chapter's line ("01 — Modular precast
  construction system"), the small line over a caption ("2.1 — The 2 core
  shells", "MOD"), the codes of the opening card, and with them the rail's
  marker and a film's step ticks (`--title`). A colour of text. Never a
  black label, plate or background behind a title, and never ink where
  the accent was: both were tried that day and refused. On paper the
  green itself cannot be read as text (1.2 to 1), which is why paper keeps
  the vermilion (the developer: "if the white background doesn't support
  the green, use orange only there").
  As a fill with ink text on it (`--mark`) the green is used on the dark
  films only, for a thing in play: the add-on that has just landed, a key
  or tag under the pointer, and every call-out box of "Componentized
  building". Never white text on it (1.3 to 1).
  In 3D the same: `mat.accent` (vermilion) on a light stage,
  `mat.accentInk` (green) on a dark one.
  CONFIRM: the client suggested (2026-10-06, again 2026-10-09) green
  instead of orange throughout; it is the accent on dark surfaces only
  (notes I5, J8, K2, L3).
- Captions over a 3D picture are plain text (client, 2026-10-07): no wash
  in the page colour over the picture (it reads as haze), no box behind the
  text, no frosted header band over a film. Legibility comes from the
  scene: frame it so the caption column (the left two fifths) and the
  header band stand on calm ground (the factory's yard slab, a studio
  floor), or give the film the caption theme its picture needs (the
  installation, in evening light, takes the dark theme's light text). A
  dark stage keeps a vignette in its own tone. Small callouts placed from
  3D stay on their ink pills.
  One exception, asked for by the client (2026-10-07): the hero's opening
  card, where mist lies at the house's feet and rises over the moment the
  land and sky arrive (`.film__mist`, film.css; since 2026-10-11 in the
  card's warm shade, not the page colour). It is
  DOM over the canvas, transforms and opacity only, each layer with its
  own opacity; it never lies on the house at rest, and it is gone
  (`display: none`) once the card has opened, so the film itself is never
  under it. Do not use it anywhere else without asking.
- The hero opens on the three kinds of building (client, 2026-10-09): the
  modular house, a capsule home and a prefab building, to one scale, each
  named on the floor under it, no land and no sky. Since the client's
  second brief of 2026-10-11 (with two reference pictures; notes O) they
  stand parallel, one behind another on a diagonal, and are seen on the
  diagonal, each showing its front and one end (`rowFor` in
  `kit/row.ts`); on a polished floor of 3 m slabs that mirrors them
  (`kit/plaza.tsx`, `kit/mirror.tsx`); in warm light (look `card`); on a
  warm shade, which is CSS behind the canvas (`.film__backdrop--studio`;
  the canvas is clear wherever the scene has drawn nothing). Not the
  white studio, and not the references' own buildings. The camera is
  fitted to the screen (`fitRow` in `kit/rowfit.ts`): as near as the
  card's words, margins and names allow, under the headline or beside it,
  from eye level where the screen allows it and from higher up where that
  gives the three real size; it is moved sideways and tilted to place
  the picture, never raised or lowered. Do not place the three, the
  camera or the names by hand for a screen size: change the fit. A
  change to the card is looked at in a low window too (1267 × 303 and
  1267 × 427 at 150%: the developer drags the window short), on a phone
  and at 4:3. Each of the three comes up out of the polished floor
  whole, one after another in the menu's order (house, capsule, block),
  never part by part (client, 2026-10-14: the card says what VEE offers,
  not how it is put together; the developer: "spawn them building by
  building"; `raise` and `INTRO` in `HeroScene.tsx`). Scrolling takes the
  capsule and the prefab block back down into the floor, whole, as they
  came, goes round to the house, and then grows its land from under it
  over the floor and brings the sky in (client, 2026-10-07). Each of the
  three is dark while it comes up, and its lights come on once it
  stands. At rest the land is not drawn at all. Things leave a picture by
  being lifted, by going back down into the floor they came out of, or by
  the camera moving on, never by fading: a faded object needs a blended
  material. Coming up out of the floor asks nothing of the materials:
  the floor's depth is drawn before the buildings, the reflection keeps
  only what stands over the floor, and the reflection's copies are kept
  out of the occlusion pass (`userData.unoccluded`, `kit/mirror.tsx`),
  where a building still under the floor stood over it as stains.
- "Componentized building" opens on the finished house, whole, which
  comes apart twice (developer, 2026-10-10: "easy to understand for very
  common people", then "after fully bursting, we can burst further").
  First into the three things it is made of, each still whole: lifted off
  its foundation, then its add-ons off it. Then each of the three into
  its own parts, in turn: the footings and plinth stand apart; the module
  is drawn apart upwards into three whole boxes, the steel frame, the
  white panels over it and the concrete over them, with the door and the
  glass in front (opened outwards, the near walls hid the frame); the
  add-ons piece by piece. Each is named as it is shown, by a green box in
  the picture and by its word of the heading ("Foundation. Module.
  Add-ons."), which arrive one at a time with the picture; in the second
  burst the green goes to the word whose thing is coming apart. No
  outlines round the groups. The film's times are on a clock of its own
  (`film/componentsClock.ts`): the opening has more scroll than its share.
- A film's cut and its caption go together: the hero's captions change on
  the cut between sets itself (`film/heroTimeline.ts`), in one move with
  the step's mark, nothing delayed (client, 2026-10-10).
- The factory makes one shell in one bay, start to finish, in the
  client's order (2026-10-10; `film/factoryTimeline.ts`): structural
  frame with its hooks ("Structural frame – core shell"), insulation
  panels (walls, then the top), formwork, concrete cast as walls (the
  inside stays clear), de-shuttering that leaves the openings empty, doors
  and windows, spray finish in the same bay, then the crane lifts it by
  its four hooks onto the truck, lets go only once it is down, and the
  truck leaves. No green box standing by, no gate sequence. It is seen on
  the diagonal, from above and from the side, with the shell as the
  subject (the same instruction; from 2026-10-07 until then it was seen
  from above throughout); the picture's left, under the captions, is open
  slab. What else stands in the yard stands still (a shell with its
  panels going on, one cast, the finished ones in the shed). The plant is
  drawn as the real machines are (`kit/machines.tsx`): no toy trucks or
  cranes.
- The journey is one shot of a few seconds: the truck comes down the road
  at the viewer and passes out of the picture (client, 2026-10-10, with a
  photograph for the angle). It plays once, by itself, and holds the page
  while it does; it can never keep it (`film/hold.ts` lets go on a timer,
  on Escape, when the page is hidden). It only ever holds a scroll the
  visitor is making: a link gliding past does not start it.
- The installation ("08 On site") begins with the site made ready, on
  the scroll: the plot pegged out, pits dug, plug footings lowered in, L
  plinths laid, backfilled (client, 2026-10-11, morning: the section
  "Ready before the shells arrive" and the installation as one film;
  `PREP` in `film/installTimeline.ts`). Then the truck arrives with one
  shell; scrolling on places it on the foundation ("Placed on the
  foundation"); the rest of the building then comes together by itself,
  jack piers are set where its deck's posts and its steps come down, its
  add-ons land on them, and its lights come on last (client, 2026-10-10
  and 2026-10-11).
- The configurator shows an estimated price, counted from what is laid
  out (`build/price.ts`, rates in `data/pricing.ts`; client, 2026-10-11).
  CONFIRM: every rate is ours (notes N5); do not quote them elsewhere.
- The opening card's three are in refined finishes, and they alone
  (developer, 2026-10-12, with a reference picture as the benchmark of
  realism, not of design; notes P): floated micro concrete with a tooth,
  standing-seam roofing, coated steel, the capsule's semi-gloss panels,
  polished panes, photovoltaic cells, each shell of the block a shade of
  its own, a floor that gives the lit windows back. The scene asks for
  them (`<Refined>` in `HeroScene`, `kit/refined.ts`); the kit's
  components hand `useRefined()` to `kit`, `shellMat`, `trimMat`,
  `moduleMats` and `litGlass` (`kit/materials.ts`). Every other scene,
  the hero's own later sets included, has the materials as they were: do
  not put another scene inside `<Refined>`, or change a material's own
  definition to its refined recipe, without being asked. The house keeps
  its finishes into the sunset that follows the card: it is the same
  house. CONFIRM: the same house on the MOD page (`/modular/`, the
  showcase's `house`) has the materials as they were, by this rule
  (notes Q3). No plants, furniture outside, lamps, sky or mountains from
  the reference, and never the reference itself.
  CONFIRM: the sloped roof's covering is ours, one entry (`roofing` in
  `src/data/build.ts`; notes P2).
- The refined finishes' maps are files in `public/textures/`, baked by
  `node scripts/textures.mjs` from seeded noise (nothing downloaded,
  nothing scanned), 512 px, fetched and decoded off the main thread
  (`fileTexture`, `kit/textures.ts`). Change a map in the script and
  bake again; do not edit the files, and do not draw a refined map on a
  canvas at page load.
- 3D look, as built: every stage goes through one photographic finish (sun
  shadows, ambient occlusion, bloom on the sun and lit glass, filmic tone
  mapping, a light grade). Studio stages stand on the page colour with a
  soft shadow; outdoor stages have a procedural sky and haze. No particles.
  CONFIRM: this replaced the original rule ("maquette look: matte monochrome
  blocks, no bloom, no glow"); no decision between the two is on record in
  these files.
- A moving picture and a still picture are the same picture (client
  instruction, 2026-10-07). No resolution drop while scrolling and no effect
  that exists only at rest; speed comes from removing work that does not
  show. Compare a frame captured while scrolling with the settled one.
- Mobile is designed, not shrunk: canvas on top, caption below, never text
  over canvas. No horizontal page scroll.
- Respect `prefers-reduced-motion`: films snap between settled poses.

## Checking work

- `?still` on any page settles every film at its step poses (also what
  reduced motion gets), and shows "How are we different?" standing still,
  nothing hidden. `?go=<section-id>:<0-1>` jumps a film to a progress value on the
  dev server (the value counts a title card's scroll too).
- A change to anything 3D is not finished until it has been measured:
  GPU time of a moving frame against the tree before the change, a
  moving frame against the settled one at the same pose, and a steady
  scroll. The rules of the pipeline and how to measure are in
  `vee-build-notes.md`, F8; the last numbers are in F7. More than about
  half a millisecond a frame needs a reason, stated.
- A grid on the ground is one flat sheet whose shader finds the lines, not
  line segments: line segments cost 12 ms a frame in "How it works"
  (notes F7).
- A film reached by a link (`/#factory`, the rail, the menus) stands at
  the top of the window, as it does once scrolled into: `.film` gives
  back the header's room that the page keeps for every other target
  (`scroll-margin-top`, film.css; `scroll-padding-top`, base.css). A
  visitor arriving from another page by a link is set on the chapter
  again once the page has settled, unless they have begun to scroll
  (`arriveScript`, `Base.astro`; developer, 2026-10-14: the foot of the
  3D tour showed above the factory's title).
- Routes: `/` (Home, the main page, the factory tour included),
  `/modular/` (MOD, since 2026-10-14, asked for), `/capsule/`, `/prefab/`,
  `/partnership/`, `404`. Do not move a section to a route of its own, or
  add or remove one, without asking first.
- The catalogue is built but not shown (client, 2026-10-10: "hide without
  removing"): `shown` in `src/data/site.ts`. The chapters' numbers, the
  rail, the menus and the links to it follow that flag; do not delete the
  section or its components.
- A film with a clock of its own reads it before anything in the frame
  that depends on it (`useFrame(..., -1)`): children are drawn from their
  own places in the frame, ahead of the parent's.
- After changing copy or data, run `npm run check` and `npm run build`, then
  search `src/`, `public/` and `dist/` for the legacy brand name. After
  changing CSS too: the dev server serves a stylesheet with a broken rule
  in it without a word, and the build stops on it (2026-10-10).
- `?noboot` skips the boot screen. `?q=1` shows the one emergency
  resolution step, `?q=0` rules it out. `?px=<megapixels>` fixes the
  canvas's pixel budget (`?px=0`: as before the GPU was measured; `?px=8.3`
  with the screen emulated at 3: what a fast GPU on a dense screen
  gets). In the dev build `window.__veeGpu` has the reading. To see a
  zoomed window in a script, emulate it: 640 by 360 at 3 is this laptop's
  1280 by 720 at 200%.
- The opening card's fit runs without a browser (`kit/rowfit.ts` is pure
  geometry on a camera; `vee-build-progress.md`, QA aids). In the dev
  build `window.__veeRow = <s>` holds the card to one arrangement, and
  `window.__veeIntro = <seconds>` holds its opening at that moment (the
  three coming up; its clock runs slow under a capture loop).
- Two builds timed in turn: reverse their order before believing a
  difference. The laptop's power state has put the second load of every
  pair in its slow half (notes F12).
- Frame timing and 3D screenshots: a headless Edge on the same GPU (the
  app's browser pane does not draw frames while hidden). Details in
  `vee-build-progress.md`, QA aids.
- `node scripts/og-image.mjs` regenerates `public/og.png`.
- `node scripts/textures.mjs` bakes `public/textures/*.webp` again (the
  same files from the same seeds) and prints their sizes.
- To time a set of materials against another, swap them inside one page
  and time round-robin: two page loads cannot be told apart to half a
  millisecond on this laptop, and often not to five (notes P5).
- In a scripted edit, a replacement passed as a function does not expand
  `$1`: it is written into the file as text. Eight CSS rules lost their
  heads that way on 2026-10-10.
- Scripted multi-line edits: write a script file and run it. Inline shell
  heredocs containing an apostrophe fail in this environment. Files in
  `src/` are a mix of CRLF and LF: match on LF and write back in the file's
  own line endings.
- The dev server can serve a stale server render of an island after its
  file was rewritten by a script (a hydration mismatch in the console,
  nothing wrong in a build): re-save the file, or check against `npm run
  build` + `npm run preview`.
