# veedo.space (formerly VEE.BUILD) — project rules

Production website for veedo.space, a modular / precast construction
business. It was VEE.BUILD until 2026-11-07 (notes V); file names, the
Worker, the bucket, `vee:` events and `__vee` dev hooks keep the old name.
Read `vee-build-context.md` (business + narrative), `vee-build-notes.md`
(open questions, source conflicts, decisions) and `vee-build-progress.md`
(state of the build) before changing anything substantial.

## Commands

```bash
npm run dev       # Astro dev server on :4321
npm run build     # static build to dist/
npm run preview   # serve dist/
npm run check     # astro check (types)
npm run build:all # the site, then the admin panel into dist/admin
npm run deploy    # build:all, then wrangler deploy (admin/README.md first)
```

In `admin/` (its own `npm install`): `npm run dev` (`wrangler dev`: site,
panel and API on :8787 with local D1 and R2), `npm run dev:panel` (the
panel with reloads on :5174), `npm run typecheck`, `npm test`,
`npm run db:migrate:local|remote`, `npm run password:local|remote`.

## Source priority

Latest client instruction > `assets/VEE.BUILD.pdf` (brief) > new client visual
references (sketch, render) > Wieldy catalogue / pricing HTML > anything else.
When sources conflict, record it in `vee-build-notes.md` and follow the higher
source. Never resolve a conflict by inventing a third value.

## Brand rules

- Public brand is **veedo.space** (developer, 2026-11-07; VEE.BUILD
  before). "VEE.BUILD", "VEE" and "Vee" no longer appear in what is shipped;
  neither may "Wieldy", "Wieldly", its logo, tagline, email, phone, pricing
  and testimonials, in `src/`, `public/` or `admin/`. `assets/` is client
  source material and is not shipped. `site.name` and `site.short` in
  `src/data/site.ts`.
- The logo is the developer's own artwork of 2026-11-07: the concrete
  mark as supplied, and the wordmark ("veedo" heavy, an orange dot, "space"
  light) set in concrete grey `#7a7873` instead of the artwork's black
  (`src/assets/brand/veedo-mark.png`, `veedo-word.png`, `veedo-logo.png`,
  cut and recoloured from it; favicons in `public/`). One logo on every
  ground, its colours fixed ("it dont change the clr ... it is fixed") and
  nothing behind it ("do not add white background to it"): the concrete
  reads on paper and on ink alike. In the header and footer the mark and
  the wordmark stand on one line, small, and "Powered by" with the
  Hemisphere One logo under them, no wider (`.brand`, base.css). Do not
  recolour it per ground, put a plate behind it, or swap it for another
  mark. Two of ours were replaced the same day (an ink tile with a green v;
  the artwork on a paper plate on dark grounds).
- The top menu is **Home | MOD | POD | FAB** and **Contact**, nothing else
  (client, 2026-10-09; Home added 2026-10-14, notes Q). Since 2026-11-07
  (developer, notes V): **Home** (`/`) is the banners (three, numbered 01
  to 03), "What Vee builds." (MOD, POD, FAB as three cards that lift a
  little under the pointer: the picture with the code and "Coming soon" on
  it, the name, one line, one link; no eyebrow, no numbers; `Lines.astro`,
  `src/data/lines.ts`, pictures in `public/images/range` at 960 × 600; since
  2026-11-09 the section is the opening card's warm studio light and each
  picture fades into its card, a quiet glass surface, the three seen at one
  angle: "the background and 3d object background are not in sync")
  and the enquiry form, nothing else;
  **MOD** (`/modular/`) tells the whole story: its own opening (the
  modular house alone, then its land, with Build your own and Enquire
  now; `ModHero.tsx`), then every chapter that Home had, numbered from 01
  (`sections`, `story` in `src/data/site.ts`), the rail, and its own
  enquiry form last. Old links into Home's chapters (`/#factory`,
  `/?build=…#configure`) are sent on to MOD (`index.astro`). Partnership, Investors and
  Technology are in the bottom band under the footer, with "Powered by"
  and the Hemisphere One logo as supplied
  (`src/assets/brand/hemisphere-one.png`; it is dark on clear, so the band
  is on paper: do not recolour it or redraw it).
  Menu and band are `primaryNav` and `bandNav` in `src/data/site.ts`.
  CONFIRM: Investors and Technology have no pages; they lead to the
  enquiry form and to "How it works" (notes J2).
- The FAB page leads on into the system's chapters (developer,
  2026-10-14): just before the enquiry form, "Continue on the MOD page"
  with one link each for 02 How it works, 05 Build your own and 06 3D tour
  (`src/data/onward.ts`, `Onward.astro`). MOD's own links went when the
  chapters moved onto it (2026-11-07). The enquiry form is the last
  section of a product page. POD has none: the capsule is not made of the
  shells.
- The three kinds of building are **Modular house**, **Capsule home** and
  **Prefab building**, with the client's line for each (`kinds` in
  `src/data/narrative.ts`). The two shells belong to the modular line
  only: they are not shown or named on the opening card. The prefab
  building is not on sale yet and carries a **Coming soon** tag wherever
  it is shown (`soon` in `kinds`; client, 2026-10-10). The capsule carried
  one too until the developer took it off (2026-11-09: "remove the coming
  soon from the pod, have similar actions as like in mod").
- Where the company is the subject it is named: **Vee** (the wordmark
  is veedo.space), not "we" ("How is Vee different?", "See how Vee builds
  it."; client, 2026-10-10; developer, 2026-11-07: "you can use vee in the
  places where you need to use we"). An ordinary "we" or "us" in a sentence
  spoken to the visitor ("Tell us what you would like to build") stays.
  `site.short` in `src/data/site.ts`.
- Copy is short (developer, 2026-11-07: "keep minimal as possible, as no
  one is going to read paras ... short and sweet"): a title, one line,
  at most two. No exclamation marks. Facts and CONFIRM tags stay; flourish
  goes.
- **Powered by Hemisphere One**, with the Hemisphere One logo, stands
  under the wordmark wherever the wordmark does (header, footer, loading
  screen) and nowhere else on the opening card (client, 2026-10-11,
  morning; `Brand.astro`, one lockup). The logo as supplied on every
  ground, never recoloured (developer, 2026-10-14: "the hemisphere one
  logo turns white ... fix that"): on ink it alone stands on a small pill
  of the paper (`.brand__logo`, base.css), whose room is kept on paper too
  so the lockup does not move when the header changes ground. It is
  always larger than the words "Powered by" before it (developer,
  2026-11-07: "the powered by is bigger then hemisphere one. fix that"). The reversed copy
  of 2026-10-11 (`scripts/logo-reversed.mjs`) is no longer used (notes N1,
  Q4).
- The capsule (POD) is one model wherever it is shown, built on
  2026-11-09 after the draft (`.claude/pod-draft.md`, notes W; developer:
  "redesign the pod as per the plan, make it realistic"): 8, 10 and 12 m
  long, 10 m first, 3.05 m wide, 3.2 m to the top of its band (CONFIRM).
  The market's usual capsule (galvanised steel frame, rockwool, lining,
  fit-out) whose one innovation is its skin: 20 mm TRC panels made with
  RTARIUM by HEMISPHERE ONE, fixed as stud-frame cladding, the top band's
  and the skirt's joints over the wall panels' (the developer's marked
  elevation, 2026-11-09). Two end modules of 3 m, the same mirrored (the
  far one glazed, or on the 12 m its balcony), a door bay of 1 m with
  precast steps, and 1 m bays between: a length grows or shrinks by bays
  in the middle only. The electrics run in the band at the top. The
  kicker at the base is open, not a dark face (developer, 2026-11-09: "it
  does not have to be black. it is just the place has nothing there. that
  gives workers to repair things ... so we can show the land in there"):
  the land is seen under the pod, past its chassis rail, cross members and
  the plumbing fixed under the floor (`openBase`). It runs under the end
  modules too, from the joint under each window to the middle; the ends
  close down to the feet only round the end (the skirt, with its return).
  The pod stands on precast feet, a pair under each end, the door bay and
  the middle bays 1 and 4 (`FOOT_BAYS`, one instanced mesh). Its edges
  are rounded as the MOD house's are (developer, the same day: "the pod
  edges is also not good. make it look smooth ... does not cost any more
  extra gpu"): the cut corners in plan to `ROUND` (0.45 m), the roof band's
  top edge and the skirt's foot to a quarter round, shaded smooth (`sweep`,
  `fillet`); the 45° cut stays. The door reads as a door ("make it look like
  a door"): a frame standing proud, the leaf set back in a quiet bronze, a
  frosted vision strip that lights with the rooms, a long steel pull, a
  kick plate, an aluminium sill. Behind its glass is one interior after the draft's plans, in the
  pod's own space, the same room through every window, the end glazing
  included (`podInterior` in `kit/podPlan.ts`, `roomPlan` in
  `kit/materials.ts`, the pod's glass made with `VEE_PLAN`): the bedroom
  behind the head end, the far room by length (8 m lounge; 10 m kitchen
  and lounge; 12 m second bed and lounge before the balcony), the bathroom
  behind the frosted window; each length has the draft's two layouts, A and
  B (`podZones`; 8 m A one bed, B work; 10 m A one bed and kitchen, B two
  beds; 12 m A kitchen at the head, one bed, balcony, B two beds and
  balcony), the one shown is the page's choice (`podChoice.layout`, A first). Nothing in it is picked at random or by where
  the pod stands (developer, 2026-11-09: rooms that changed as the pod
  moved, and side windows that disagreed, were reported as bugs: "why it
  is different when interior just follows the floor plan"). `kit/pod.tsx` (parts, `FINISH`, CONFIRM), `kit/podPlan.ts`
  (sizes), `src/data/pod.ts` (lengths, words). No mark, name, figure or
  text of the reference pages; the GLB was a mood reference only. Its
  geometry keeps the top's cladding, the chassis and the plumbing in slots
  of their own (`S.top`, `S.topDark`, `S.chassis`, `S.pipe`), merged into
  their materials' slots when the pod is drawn whole, so the layers film can
  draw its walls and its top apart (`part`) at no cost to the pod
  elsewhere. `kit/capsule.ts`, `POD_HOME` and 10′, 16′ and 20′ are gone.
- One pod stands; the other two lengths are a click away (developer,
  2026-11-09: "we only have one pod in there, other 2 will be options to
  live, on clicking that the pod changes. by default it will be in 10m"):
  `film/podChoice.ts` holds the page's choice, `PodPick` the buttons
  (in the caption on desktop, at the picture's foot on a compact layout).
  The pod goes from one length to another on a clock of its own
  (`MORPH`): the far end slides, the bays it gains come down into the gap
  or those it loses go up out of it, one after another; nothing fades. A
  camera that shows one pod stands back for the 12 m (`podReach`, read
  through `track` before the frame), never nearer for the 8 m: it is to
  look shorter. The hero's second banner and the POD page alike; on a
  phone the hero's capsule step keeps its three pods side by side
  (`showroom`), the buttons choosing which is in the picture.
- The POD page (`/capsule/`) opens as the MOD page does (`PodHero.tsx`,
  `HeroScene` `solo` with `subject="pod"`; developer, 2026-11-09: "mimic
  the mod page, start with the pod in plain background ... after that ...
  the animated background"): the pod alone on the studio floor, then its
  land at blue hour spreads from under it and the sky comes, the words
  changing with it. The lengths can be chosen all the while: on a phone
  the buttons are docked at the foot over the opening too (Film `dock`,
  outside the HUD the opening keeps back) and take the steps' dark ground
  at `DOCK_TURN`, as the land comes under them. Its actions are the MOD
  page's kind: Enquire now and See the plans. The land's step says what it
  is made of, short (developer: "grow by the panel, that is not
  professional ... a high professional and economical tone, and also
  smaller"): "Steel frame. Concrete skin." Then, in this order:
  **02 Built in layers** (`PodLayers.tsx`, `PodLayersScene.tsx`,
  `film/podLayersTimeline.ts`, `kit/podLayers.ts`; developer, 2026-11-09:
  "burst first, like MOD"): on the dark studio, the finished pod comes
  apart upwards into its layers, each whole and named as it is shown, each
  call-out on a part the camera sees (the TRC skin; rockwool and fire
  barrier; the galvanised frame with the plumbing under its floor; the
  interior panels with their wiring), the heading's words arriving with
  them; then it is built again in the order it is made (since 2026-11-10,
  notes Y): the frame, each group lowered on and then welded, a few sparks
  at each joint in turn ("not the welding process itself, but a minute
  spark"; `WELD`, `podWelds`; the one exception to "No particles"); the
  services: the plumbing up under the floor, seen between the joists, the
  floor's boards, then the interior panels with their wiring, the walls
  rising from the floor and the ceiling laid along. The wiring is never in
  the air ("we dont need to show wires hanging, no one does like that";
  "the wiring follows only the interior panels, not on random places"): it
  runs on the backs of the panels and over the ceiling to the plan's
  points, a light a room, a switch by each way in, sockets under the
  windows, the board in the entry (`wiringPlan`, `podPanels`); the
  ceiling is at the plan's 2.9 m (the roof's bows and purlins over it keep
  out of the occlusion pass, which laid grit on it: "what is this on the
  top"), the frame's ring and the roof's bows
  over it under the band. Then the rockwool unrolled from rolls along the
  walls and over the ceiling ("it comes rolled in market"; a clipping plane
  follows each roll, the plain material once it has run; the rolls cast no
  shadow, as a moving caster has the shadow map drawn again every frame,
  and the rockwool stays in the occlusion pass, out of which the ceiling's
  occlusion lay on it as blotches; notes Y11: "fps is dropping in here"),
  the fire barrier; the TRC cladding hung a unit at a
  time and locked, the walls' then the top's ("cladding by cladding that
  is getting attached/locked"; `unitOffset`, `hung`); and the fit-out: the
  lights come on, and the rooms are there behind the glass as the plan
  has them ("you don't have to show adding bed and other things from the
  top, just skip that. once the light turns on it comes there
  automatically"): no roof is lifted, no furniture lowered; the layers film
  has no furniture of its own. Things come in by being lowered, coming up
  or being put up or unrolled in place, and leave by being lifted. The
  camera keeps the pod clear of the caption's column ("the text is
  overlapping"). **03 Plans** (`PodPlans.tsx`, `PodPlanScene.tsx`,
  `build/podPlanSvg.ts`; redesigned 2026-11-10: "too much out of phase
  with the website. make it little modern"): in the Home range's warm
  studio light with a glass card, as the range is; the chapter line "03 —
  Plans"; the three lengths drawn as their panels to one scale (end
  modules, door bay, middle bays) with their areas; its size stated 3 × 3 m
  (developer, 2026-11-10: "just change the numbers in 03"; `podSection`;
  the model stays 3.05 × 3.2, notes Y12); the two layouts as the
  enquiry form's options; the pod in 3D on the section's light (the canvas
  clear, `ground="shadow"`) with its top off and its rooms furnished
  (`podFurniture`), its floor plan from the same plan under it with its
  length dimensioned in the accent; size and area; View plan opens it
  large, dimensioned and named; Download brochure (`public/downloads`,
  `scripts/pod-brochure.mjs`); Enquire. On a phone the choices come first.
  Then the form, last. The opening, the layers and the plans share one
  choice of length and layout. The three lengths' section of 2026-11-09
  morning is gone ("remove the 3 length page").
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
  day), and so does the building of "09 On site", under its deck's posts
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
  the hero's three, the capsule, the installation, the MOD page's
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
| Backend | `admin/api` | Hono on one Cloudflare Worker that also serves the site's `dist/` and the panel. D1, R2. |
| Admin panel | `admin/panel` | React + Vite SPA at `/admin`, built into `dist/admin`. |
| Shared rules | `admin/shared` | Zod schemas, `priceBuild`, CSV. The API and the panel import them; the site does not (no zod in the site's bundle). |

The admin panel and backend (developer, 2026-10-16; notes U; set-up and
security in `admin/README.md`):

- Everything is on Cloudflare: one Worker (`admin/wrangler.jsonc`), D1, R2,
  Turnstile, Email Routing. No other host or database ("no supabase").
- **One login, no roles.** The owner's password is set from the command
  line only (`admin/scripts/set-password.mjs`); there is no sign-up,
  no reset by email, no second account. Do not add staff accounts or RBAC.
- The panel has five sections: Overview, Enquiries, Quotes, Prices,
  Settings (`admin/panel/src/lib/nav.ts`). The rest of the first draft was
  dropped on purpose (notes U, U1); do not bring a section back unasked.
- Every API change goes through the same locks: `sameOrigin`, JSON bodies
  read with `readJson` against a zod schema, size limits, parameterised SQL.
  A public endpoint also gets an edge rate limiter and Turnstile, failing
  closed. Never put a secret in `wrangler.jsonc`, `.env` or a `VITE_` /
  `PUBLIC_` variable: `wrangler secret put`.
- The panel's Content Security Policy runs no inline script (`panel.ts`):
  keep scripts in files.
- Prices: the panel publishes versions to D1; the site reads
  `GET /api/pricing` (`src/build/rates.ts`) and falls back to
  `src/data/pricing.ts`. The site's `quantities()` + `estimate()` and the
  panel's `priceBuild()` are one rule in two places, held together by
  `admin/shared/site.test.ts`: change both, and run `npm test` in `admin/`.
- A database change is a new numbered file in `admin/migrations`; an
  applied migration is never edited.
- The site has an enforced Content Security Policy, written into
  dist/_headers at build time by `scripts/csp.mjs` (an Astro integration)
  with a hash for every inline script (notes U4). No inline event handlers
  (`onclick=`) and no `javascript:` URLs: the build stops on them. A new
  host the site loads from (fonts, analytics, video) is added to `policy()`
  there, and the pages are run through again (`node scripts/csp-audit.mjs`
  against `wrangler dev`: every route, desktop and phone, scrolled through;
  it exits 1 on any violation). Do not write a policy in
  `public/_headers` by hand, and do not use Astro's `security.csp` (it
  misses the `is:inline` scripts).

- The pace of the scroll is set in one place (`PACE` and `DAMPING` in
  `Film.tsx`; developer, 2026-11-10: "decrease the scroll speed a little,
  that matches standard 3d website speed", "the scroll should not look
  like ppt, i.e push the screen or pull"; notes Y15): a film's travel and
  its title card take 1.25 times the screens its `length` gives (the
  pinned screen itself not), and the picture catches up with the scroll
  in about half a second (it was 0.7 s, and went on after the hand had
  stopped). A film that plays by itself and the compact layout's card
  films are not paced. Change the pace there, not film by film; every
  choreography is in fractions of its film and does not move. Nothing
  scrolls the page for the visitor but a click (a step's tick, Replay, a
  link).
- A scene is a pure function of one damped progress value (0–1). No scene
  owns scroll listeners; `src/film/Film.tsx` does. Two films also run on
  time, both on the client's instruction of 2026-10-10. The truck's drive
  (`Transit.tsx`) plays by itself, once, like a video, on every layout:
  its progress is seconds, it starts when its stage stands in the window,
  and it never holds the page (developer, 2026-10-15: "can be skipped by
  scrolling"; `play` in `Film.tsx`). The installation has a clock of its
  own that the scroll starts and runs back (`film/installTimeline.ts`).
  A film with cards on a compact layout plays its steps by itself (below).
  Each is still drawn by one function of its numbers, and with reduced
  motion each shows settled poses and plays nothing. Nothing holds the
  page: `film/hold.ts` was removed on 2026-10-15; do not bring a hold back.
- No layout is read in a scroll handler (developer, 2026-10-15: frames
  dropped on a Snapdragon 695). A film keeps where it stands in the
  document and reads it again only when the layout has changed
  (`watchLayout`, `where` in `Film.tsx`); the page has one scroll
  listener, which reads the scroll position once an event and hands it to
  every film (`onPageScroll`). Do not add a scroll listener that reads a
  rect, `offsetHeight`, `innerHeight` or `scrollY` for itself: add a
  handler to `onPageScroll`. Nothing new is made every frame in `place`.
- On a compact layout the factory is recorded clips, not a live stage
  (`film/ClipScene.tsx`, `FactoryTour.tsx`; developer, 2026-10-15: "add in
  there like a video"): one H.264 MP4 a station in `public/video/factory`,
  rendered from the film's own scene by `node scripts/factory-video.mjs`
  (`?live` shows the live scene on a phone, `?hq` is the recording's
  quality). When the factory scene changes, render them again. Desktop and
  a tablet held sideways keep the live scene. VP9 is not used: Edge on
  Windows would not decode it.
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
- Devices are told apart in one place, `src/film/device.ts` (the mobile
  and tablet round, 2026-10-14; notes R). *Compact*: up to 860 px wide,
  or a touch screen up to 1100 px held upright; *touch*: `(hover: none)
  and (pointer: coarse)`; *sideways*: a compact screen up to 520 px tall
  held sideways. The stylesheets write the same queries out in full: keep
  them the same. Everything for phones and tablets sits inside those
  queries, behind `compact` (false on desktop) or behind the budget tier
  (never on desktop). **The desktop is not to change**: a desktop window
  wider than 860 px must render the same, element for element (notes R
  has how that is checked).
- On a compact layout a film's building is framed in the band its words
  and controls leave (`progress.band`, measured by `Film.tsx` from
  `[data-band="words"|"foot"]`): the stage composes the picture for the
  band (`frame` in `Stage.tsx`; `camera.userData.frameAspect`, read by
  `aim`), and a scene may come nearer there (`zoomCompact`). Desktop has
  no band. A control placed under the picture marks itself
  `data-band="foot"`.
- A phone or a tablet held upright has a hero of its own
  (`HeroMobileScene.tsx`) and so have the product pages
  (`ShowcaseStudioScene.tsx`): each building alone on the polished floor,
  framed by `kit/frame.ts`. The desktop's scenes are fetched only on
  desktop; do not merge the two. The phone's hero (developer,
  2026-10-14, twice): the opening card shows the three kinds one at a
  time, chosen with cards, arrows or a sideways swipe
  (`film/heroChoice.ts`); the steps after it (three since 2026-11-07:
  the workforce banner was deleted) are scrolled through, vertically, as
  on desktop; only the capsule's step has cards of its own (its three
  lengths). Do not put the steps on cards. Between the
  steps nothing goes down into the floor or comes up (developer,
  2026-10-15: "a proper professional animation"): the buildings stand in
  a row on one floor, out of each other's pictures (`showroom`), and the
  camera glides from one to the next, drawing back on the way (`glide`);
  the capsule's lengths are three capsules side by side, each filling its
  picture. A budget tablet held sideways shows the three together on the
  card, as desktop does. The institutional building keeps its left end
  whole with room beside it on every screen (`anchor` side -1).
- Cards (`pick` on a film, compact only, `Film.tsx`): the factory and "On
  site" are a step at a time on a phone, a short film in parts (developer,
  2026-10-15: "it is more like a 3d video", "i asked for premium"). Laid
  out as a page: the chapter's line, the step's words set and clamped
  (never under the picture), the picture in a frame of its own (the canvas
  is the frame, `--card-*`; band `[0,0,1,1]`), the reel, the count with
  pause and arrows, the steps as a strip of pictures all one size. It plays
  its steps by itself (time-lapse, a hold by the length of the words, the
  next) while the frame is on screen; a card, an arrow or a mark chooses
  and it plays on. Nothing over the picture: no labels, no hints, no drag
  (tried and refused). The pictures are the scenes' own
  (`public/images/cards`): when a step's picture changes, capture them
  again (vee-build-progress.md, QA aids). Such a film keeps the occlusion
  pass on a compact layout (`POST_CARD`).
- Phones and tablets have a lean finish (`lean`, `kit/post.tsx`): every
  frame 4x multisampled as it will stand, nothing drawn again when the
  picture stops (developer, 2026-10-15: "the corner of the buildings look
  pixelated"). A budget touch device (`src/film/tier.ts`) is *lite*: 1.25
  pixels to the CSS pixel, no ambient occlusion, no bloom, a 1024 px shadow
  map, the hero's showroom and the factory without the back of its yard.
  It keeps the refined materials (tried without: the plaster went flat). The GPU's own
  name decides first (`gpuClass`: an iPad, a recent Adreno, Mali or
  Xclipse is never lite; known budget parts always are; 2 GB of memory or
  less is); only an unknown GPU is timed, without the wait for the answer,
  and lite if slower than four times the test laptop (developer,
  2026-10-15: "only for low end tabs"). Decided before anything is drawn,
  never changed in a visit.
- A touch screen's pinned film is `100lvh` tall (`100vh` where a browser
  has no `lvh`), never shorter than the tallest the window has been
  (`--vh-max`, kept by `Base.astro` from resize events), on its own ground;
  its words and controls `100svh` (film.css): no strip of the page shows
  when the browser's bar hides, no control goes under it, and it is resized
  at most once as the bar comes and goes.

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
  building". Never white text on it (1.3 to 1). On a compact layout a
  call-out box stands at the screen's edge on its point's side, its tick
  running in to the point, so that the building is not under it (Film,
  `place`; developer, 2026-10-14), and so does a dimension in a film with
  boxes; two on one side are kept apart down the edge (2026-10-15).
  In 3D the same: `mat.accent` (vermilion) on a light stage,
  `mat.accentInk` (green) on a dark one.
  CONFIRM: the client suggested (2026-10-06, again 2026-10-09) green
  instead of orange throughout; it is the accent on dark surfaces only
  (notes I5, J8, K2, L3).
- Captions over a 3D picture are plain text (client, 2026-10-07): no wash
  in the page colour over the picture (it reads as haze), no box behind the
  text, no frosted header band over a film (on desktop: on phones and
  tablets the header is one band of its ground at 0.9 everywhere, with no
  blur behind it: a blur over a live picture is worked out again every
  frame; base.css; developer, 2026-10-15). Legibility comes from the
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
  `kit/row.ts`), the house in front, the pod 15 m behind it and the block
  87 m back, both more nearly behind the house than to its right, so that
  the camera can come near (developer, 2026-11-09: "the modular house ...
  can come little to the front, followed by pod, and followed by precast";
  2026-11-10, with a picture of the card as it was in October: "the hero
  page should be from this angle and modular should be a priority"; notes
  Y13): the house is the largest of the three on every desktop screen; on a polished floor of 3 m slabs that mirrors them
  (`kit/plaza.tsx`, `kit/mirror.tsx`); in warm light (look `card`); on a
  warm shade, which is CSS behind the canvas (`.film__backdrop--studio`;
  the canvas is clear wherever the scene has drawn nothing). Not the
  white studio, and not the references' own buildings. The camera is
  fitted to the screen (`fitRow` in `kit/rowfit.ts`): as near as the
  card's words, margins and names allow, under the headline or beside it,
  from eye level (since 2026-11-10 every desktop screen tried, 4:3
  included: `NEAR_BEST`; a raised view had the house in a corner, leaning
  at the viewer), and from higher up only where eye level would leave the
  three small; it is moved sideways and tilted to place
  the picture, never raised or lowered. Do not place the three, the
  camera or the names by hand for a screen size: change the fit. A
  change to the card is looked at in a low window too (1267 × 303 and
  1267 × 427 at 150%: the developer drags the window short), on a phone
  and at 4:3. Each of the three comes up out of the polished floor
  whole, one after another in the menu's order (house, capsule, block),
  never part by part (client, 2026-10-14: the card says what the company offers,
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
  where a building still under the floor stood over it as stains. So is
  the floor itself (`PlazaFloor`, 2026-11-10): seen from eye level, its
  occlusion round a building's foot came out as a grainy fringe, the
  pod's like grass at its feet ("the grass is not properly hidden"); the
  sun's shadow sets them on it.
- After the card the hero has three banners since 2026-11-07 (developer:
  the workforce housing banner deleted): the modular house, the capsule
  home (one pod, its lengths to choose), the prefab building, each numbered over its caption, 01, 02, 03
  (`index` on a `FilmStep`; Film shows a step's own number where it has
  one). Each keeps the scroll it had among four (`film/heroTimeline.ts`,
  `HERO_STRETCH`).
- The prefab building (FAB) is one model everywhere it is shown, since
  2026-11-07 (developer: "our current prefab i.e g+1 should not exist ...
  it is shared object"): a G+2 block of storey-high precast wall panels
  with their doors and windows fitted (a panel carries them as it comes
  in: the building is never seen through), on a precast frame (columns,
  floor slabs, roof; the gallery's columns at the panel joints only),
  with an open gallery along the front of each upper floor,
  one outer staircase at the left flank from the access rule
  (`prefabStair`, never by hand), a deck along the ground floor's front
  with one flight of steps at a door (`PrefabBuilding` in
  `kit/prefab.tsx`, plan and sizes in `kit/prefabPlan.ts`). Its colours
  since 2026-11-08 (developer: "polish and add some clrs to it"; `FINISH`):
  warm white panels on a darker precast-grey frame, the joints showing,
  soft clay doors (a terracotta was refused the same day: "the red clr
  doors in hero is too much contrast"; keep the doors quiet), charcoal
  frames, rails and stair, blue-tinted glass by day. CONFIRM (notes V12).
  Two panels long on the opening card,
  three in the third banner and on phones, two on the FAB page's phone
  picture; whole and with no crane on the card and the FAB page ("keep the
  3d object clear"). In the third banner it is a short illustration, not
  the construction, over about three turns of the wheel (2026-11-08: "we
  don't have more scrolling animation, keep it simple ... only one is
  fixed by crane, all others are fitted by itself. parallelly, with some
  delay for few panels not all"): the frame stands from the start; every
  wall panel but one comes in at once and closes on it, three of them a
  beat later (`LATE`, on the front, never by the words); the one, the
  middle of the top floor's front, hangs from the mobile crane's
  spreader beam over the roof (`PANEL_RIG`, `kit/machines.tsx`), is
  lowered in front of the gallery and drawn in; then the staircase, the
  deck and the rails (`STEPS` in `kit/prefab.tsx`, `BUILD[2]` in
  `HeroScene.tsx`). Do not go back to a lift a floor. The panels' real length is
  never stated on the site, in words or labels (the developer: "don't
  mention that any where"). For schools, health centres and
  institutions. The G+1 workforce block, the institutional block and the
  workforce set are gone.
- The MOD page opens on the hero's own scene with the house alone
  (`HeroScene`, `solo`; `ModHero.tsx`): it comes up out of the polished
  floor on load, and the card's scroll spreads its land from under it and
  brings the sky up, the words changing with the picture (developer,
  2026-11-07). No mist: a Film opening `studio` is the card's warm shade
  without it. A budget device keeps the floor and has no land (`bare`).
  The film's `length` counts the pinned screen itself: a step needs more
  than 1, or it has no scroll at all.
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
  photograph for the angle). It plays once, by itself, like a video, when
  its stage stands in the window, on every layout, and never holds the
  page: scrolling on skips it ("Scroll to skip" while it plays, "Replay"
  after; developer, 2026-10-15, desktop included). Until that day it held
  the page on desktop and was scrolled through on a phone (notes R, S).
- The installation ("09 On site", a chapter of its own since 2026-10-14:
  "if it is marked as 08, then onsite should follow 09") begins with the site made ready, on
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
  On a compact layout it shows only what a phone needs (developer,
  2026-10-15): the view with one row of tools, the presets as small cards
  with their area and price (`presetLayout`), the two figures, and every
  setting folded shut with a chevron (`group`, `.cfg__fold`); desktop's
  markup is unchanged. Desktop has a Full screen button by the view's
  controls (`.cfg.is-full`; the browser's full screen where it has one).
- The opening card's three are in refined finishes, and they alone
  (developer, 2026-10-12, with a reference picture as the benchmark of
  realism, not of design; notes P): floated micro concrete with a tooth,
  standing-seam roofing, coated steel, the pod's TRC panels,
  polished panes, photovoltaic cells, each shell of the block a shade of
  its own, a floor that gives the lit windows back. The scene asks for
  them (`<Refined>` in `HeroScene`, `kit/refined.ts`); the kit's
  components hand `useRefined()` to `kit`, `shellMat`, `trimMat`,
  `moduleMats` and `litGlass` (`kit/materials.ts`). Every other scene,
  the hero's own later sets included, has the materials as they were: do
  not put another scene inside `<Refined>`, or change a material's own
  definition to its refined recipe, without being asked. Asked once
  since (developer, 2026-10-15, "improve the texture, realism ... for
  mobile/tab only"): on a compact layout and not a budget device, the
  factory's sprayed shell and its trim and On site's house are refined
  too; desktop as it was (notes S9). Asked again (developer, 2026-11-09:
  "use the same level of detailing texture, render method"): the pod is
  refined wherever it stands, the second banner and the POD page
  included; its land is not (notes W13). The house keeps
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
  soft shadow; outdoor stages have a procedural sky and haze. No particles,
  but for the weld sparks of the POD's layers film (developer, 2026-11-10;
  a pure function of the scroll, one instanced mesh, notes Y).
  CONFIRM: this replaced the original rule ("maquette look: matte monochrome
  blocks, no bloom, no glow"); no decision between the two is on record in
  these files.
- A moving picture and a still picture are the same picture (client
  instruction, 2026-10-07). No resolution drop while scrolling and no effect
  that exists only at rest; speed comes from removing work that does not
  show. Compare a frame captured while scrolling with the settled one.
- Mobile is designed, not shrunk (the developer's reference screens of
  2026-10-14, notes R): on a compact layout a film's words stand at the
  top and the building under them, large, framed in the band the words
  leave, never under them; at the foot the steps as dashes and a count,
  or cards where a long process is better chosen than scrolled (the
  factory, "On site").
  Product first: no fade or wash over the picture, and little or no
  landscape (the hero and the product pages have none there). On a phone
  held sideways the words are on the left, the building on the right. The
  header there: the lockup, the Contact pill, three bars, on one
  translucent band. No horizontal page scroll. "How Vee is different" is
  six cards that stack as the page scrolls, each point with what it
  replaces (2026-10-15). (Until 2026-10-14 the rule was the reverse:
  canvas on top, caption below.)
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
- A film reached by a link (`/modular/#factory`, the rail, the menus) stands at
  the top of the window, as it does once scrolled into: `.film` gives
  back the header's room that the page keeps for every other target
  (`scroll-margin-top`, film.css; `scroll-padding-top`, base.css). A
  visitor arriving from another page by a link is set on the chapter
  again once the page has settled, unless they have begun to scroll
  (`arriveScript`, `Base.astro`; developer, 2026-10-14: the foot of the
  3D tour showed above the factory's title).
- Routes: `/` (Home: banners, the range, the enquiry form),
  `/modular/` (MOD, since 2026-10-14, asked for; the whole story and the
  factory tour since 2026-11-07), `/capsule/` (POD: the pod's own
  opening since 2026-11-09), `/prefab/`,
  `/partnership/`, `404`. Do not move a section to a route of its own, or
  add or remove one, without asking first. Besides the site: `/admin/*`
  (the panel, noindex, disallowed in `robots.txt`) and `/api/*` (2026-10-16).
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
- After changing `admin/` or the site's form, prices or configurator: in
  `admin/`, `npm run typecheck` and `npm test`; then `npm run build:all` at
  the root and try it end to end on `wrangler dev` (:8787; the local login
  is in `admin/.dev.vars`, which is never committed). The legacy brand
  search covers `admin/` too.
- Phones and tablets are emulated in the headless Edge with touch on
  (`Emulation.setTouchEmulationEnabled` and the pointer and hover media
  features: the touch clauses of `device.ts` match only then). `?lite=1`
  forces the budget tier on any device, `?lite=0` rules it out. Desktop
  regressions are found by fingerprinting every element's computed style
  and box on the production builds before and after, at desktop sizes
  (notes R).
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
- `node scripts/pod-brochure.mjs` makes the capsule's brochures again (one
  PDF a length, both layouts, into `public/downloads`) from the same plan
  drawing as the POD page's plans (headless Edge, the repo's esbuild): run
  it whenever a plan, a size or those words change.
- `node scripts/cards.mjs [base] [film]` captures the compact cards'
  pictures from the running dev server's own scenes into
  `public/images/cards` (the hero's three, the factory's stations, On
  site's stages; `film` limits it to one). Run it again whenever one of
  those pictures changes. A dev server on IPv6 only needs
  `http://[::1]:4321` as the base.
- `node scripts/factory-video.mjs [base] [step]` renders the factory's
  clips for compact layouts from the running dev server (headless Edge,
  `?live&hq`, frame by frame) and encodes them with ffmpeg (on the PATH, or
  $FFMPEG) into `public/video/factory`; it also writes the factory's card
  pictures. About four minutes for the eight.
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
