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

## Architecture

Astro (static HTML per route) + React islands + React Three Fiber.

| Layer | Location | Rule |
| --- | --- | --- |
| Data | `src/data/` | All copy, specs, nav, catalogue, claims. No copy in scene code. |
| Website | `src/layouts`, `src/components/site`, `src/components/sections`, `src/pages` | Semantic HTML first. Sections work with JS disabled. |
| Animation | `src/film/` | Scroll progress, damping, timeline helpers, sticky film shell, DOM labels. |
| 3D | `src/three/` | `kit/` reusable geometry, `scenes/` one file per scene, `Stage.tsx` the only `<Canvas>`. |

- A scene is a pure function of one damped progress value (0–1). No scene
  owns scroll listeners; `src/film/Film.tsx` does.
- Text never lives in WebGL. Captions and callouts are DOM, positioned by
  projecting anchors (`src/film/labels.ts`).
- All dimensions in scenes are metres. Module A = 6 × 3 × 3, Module B = 3 × 3 × 3.
- Only one `<Canvas>` is mounted near the viewport at a time; off-screen
  canvases unmount (context released). Frameloop is `demand`.
- What is drawn besides the scene belongs to the stage and the finish, not
  to scenes: the sky (drawn on its own and put behind the scene), the shadow
  map (redrawn only when the light or a caster has moved, or after
  `rig.warm`), ambient occlusion, bloom and the grade (`kit/post.tsx`).
- No drei, no GSAP, no smooth-scroll library. Add a dependency only if it
  materially improves the product; note why in `vee-build-notes.md`.

## Design rules

- Type: Archivo (variable, width axis) for display and text, DM Mono for
  dimensions and labels. Nothing else.
- Palette: warm concrete paper and charcoal ink. One accent, for measurement
  and interaction only, and it follows its ground: vermilion on paper,
  hi-vis green (`#c8f031`) on ink (`.theme-dark`, `.on-ink`; tokens.css).
  The green is used flat: no glow, no gradient. Formwork green exists only
  inside the factory scene.
  CONFIRM: the client suggested (2026-10-06) fluorescent green instead of
  orange throughout; it is applied on dark surfaces only (notes I5).
- Captions over a 3D picture are plain text (client, 2026-10-07): no wash
  in the page colour over the picture (it reads as haze), no box behind the
  text, no frosted header band over a film. Legibility comes from the
  scene: frame it so the caption column (the left two fifths) and the
  header band stand on calm ground (the factory's yard slab, a studio
  floor), or give the film the caption theme its picture needs (the
  installation, in evening light, takes the dark theme's light text). A
  dark stage keeps a vignette in its own tone. Small callouts placed from
  3D stay on their ink pills.
- The factory tour is seen from above throughout, at the angle it opens on
  (client, 2026-10-07): the camera moves between stations, it does not come
  down to the ground. Lay the yard out for that view: the side of the line
  under the captions stays clear.
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
  reduced motion gets), and shows "How are we different?" as its plain
  list. `?go=<section-id>:<0-1>` jumps a film to a progress value on the
  dev server (the value counts a title card's scroll too).
- Routes: `/` (main page, the factory tour included), `/capsule/`,
  `/prefab/`, `/partnership/`, `404`. Do not move a section to a route of
  its own, or add or remove one, without asking first.
- After changing copy or data, run `npm run check` and `npm run build`, then
  search `src/`, `public/` and `dist/` for the legacy brand name.
- `?noboot` skips the boot screen. `?q=1` shows the one emergency
  resolution step, `?q=0` rules it out.
- Frame timing and 3D screenshots: a headless Edge on the same GPU (the
  app's browser pane does not draw frames while hidden). Details in
  `vee-build-progress.md`, QA aids.
- `node scripts/og-image.mjs` regenerates `public/og.png`.
- Scripted multi-line edits: write a script file and run it. Inline shell
  heredocs containing an apostrophe fail in this environment. Files in
  `src/` are a mix of CRLF and LF: match on LF and write back in the file's
  own line endings.
- The dev server can serve a stale server render of an island after its
  file was rewritten by a script (a hydration mismatch in the console,
  nothing wrong in a build): re-save the file, or check against `npm run
  build` + `npm run preview`.
