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
- **C3 "Core shell" in the factory.** Read as the inner casting core that the
  insulation panels and green formwork close around. Confirm.
- **C4 Stacked configurations** (Villa, Apartment, High-Rise) are massing
  studies built from the two modules to the brief's description, not designs.
- **C5 Capsule pod width/height** are not supplied; only lengths are labelled.

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
- **Hero:** the brief's four banners are four maquettes on one site line;
  scrolling trucks the camera from one to the next while each assembles from
  modules lowered into place. One proposition, not four adverts.

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
- **Still picture versus moving picture.** While frames are being asked for
  the picture is "moving": no ambient occlusion, lighter multisampling. About
  130 ms after the last frame it "settles": redrawn once at 4x MSAA, GTAO
  computed once, both eased in over about 0.3 s. A still frame is therefore
  the same picture as before; AO is absent only while things move. In the
  configurator this shows as AO easing back in after each interaction.
  Decided for speed; say if AO must be present during motion.
- **Adaptive resolution.** If moving frames average slower than about 46 fps
  for two windows in a row, moving frames drop to 0.8, 0.64, then 0.5 of the
  canvas resolution (one level for the whole page, never back up during a
  visit). The still picture is always full resolution. `?q=0..3` pins the
  level for QA.
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
- Not done, possible next steps: mount the next film during idle time so the
  remaining 100-180 ms stall on entering each film goes too; bake the sky to
  a texture (about 1 ms a frame); FXAA instead of MSAA on moving frames
  (about 2 ms a frame).

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
- H-d: The hero house (H8) is in the hero only, as instructed. Every other section still shows the earlier shell (door nearer the middle of the front, a second door on the left end for rows of turned shells) and the rule-based deck with a vertical-baluster rail. Confirm whether the H8 openings, landing and loop rail should become the standard shell everywhere.
- H-e: Opening positions and sizes in H8 are measured on the front elevation (page 1), not taken from dimensioned drawings. Over the frames: window 1.5 m wide from 1.74 m off the left corner, sidelights 0.4 m, door 0.93 m, the door group ending 0.29 m short of the right corner; all heads 0.9 m below the roof edge (2.1 m above the underside); landing 3.24 x 1.05 m in three bays, rail 0.95 m. The walls are rendered from foot to roof edge with a plain band top and bottom, as drawn (the kit's dark fascia is not used on this house). The model shows a flat roof; the sloped roof (slimmer edge) and the panels are kept on it at the client's request. Wall, timber and roof colours are ours. The hero camera looks at the front about 25 degrees off square so the 6 m front reads at close to its full length.
