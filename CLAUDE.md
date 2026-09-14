# Cambrian Conquest — project notes for Claude

## Policy: finish on `main`

When a task is done, merge the work into `main` and push `main`. Do not leave
finished work sitting only on a feature branch or waiting for a pull request
unless the user explicitly asks for a PR. Steps:

1. Make sure the build passes (`npm run build`) and the type check is clean
   (`npm run typecheck`).
2. Commit on the working branch with a clear message.
3. `git fetch origin main && git merge origin/main` on the working branch and
   resolve conflicts if any.
4. `git checkout main && git merge --no-ff <branch> && git push origin main`.
5. Push the working branch as well so the session history is preserved.

## Project shape

- Vite + TypeScript + React (menus, HUD) + Three.js (rendering).
- `src/sim` is pure TypeScript with no Three.js imports: a deterministic
  fixed-step simulation. `src/render` draws it. `src/app` is the React shell.
- Creature GLBs and card renders live in `public/assets/creatures/` and must
  not be modified in place; new animation clips are added, never replaced. The one sanctioned way
  to re-author a clip is `tools/creatures/motion/apply.mjs`, which keeps the shipped clip in the
  file as `replaced/<Name>` (shown under *Replaced* in the viewer) and is re-runnable on top of
  whatever else lands in the GLB; the performance is code in `performances/<id>.mjs`.
- Any change to a creature's model, colours or textures must go through
  `docs/creature-intake.md`: re-render, `npm run cards`, `npm run lods`, and
  `npm run check` must pass. The check flags stale images automatically.
- A fin is part of the body it grows from, and the builders check it. Every fin's origin and both
  base controls must sit *inside* the trunk's cross-section (Cheirolepis' `build_v3.py` is the
  pattern: `depth()` is the section-ellipse metric at the point's station, `seat()` pulls a root
  radially inside to a margin, and an assertion refuses any fin whose base edges leave the trunk),
  and the root's weights blend onto the body bones under it — radially, and for paired fins as much
  as median ones — so a seated root follows the flank when the tail bends. Cheirolepis V2 shipped
  every fin root at or outside the surface (pectoral +0.07, pelvic +0.31, dorsal and anal trailing
  bases +0.17/+0.26) and read as fins floating beside the body; the reference's mottling hid it.
- The creature builders are Blender 5.2 Python and the version is not a detail: the glTF
  exporter's `export_vertex_color='NAME'` is a 5.x option that 4.x does not have at all, so a 4.x
  Blender will sculpt, shade and rig a creature and then fail on the export. `npm run blender`
  installs the pinned 5.2.1 to `/opt/blender` (idempotent, upstream checksum, about half a minute
  from cold), which is what a session should run before touching a builder. Doing this in the
  environment's own setup script keeps it out of the session's way. The Linux build reproduces the
  macOS one exactly: rebuilding Cheirolepis there gave byte-identical vertex positions across all
  98,012 vertices, identical textures, accessors and clips, and passed packaging and
  `tools/devonian/check.mjs`; only the meshopt-compressed byte stream differs, which the packager
  verifies by value rather than by byte.
- The sea is endless and streamed: `src/sim/world.ts` generates 64-unit chunks from the seed
  around every player, banded into nine biomes by distance from the one shoreline. Nothing may
  assume a world bound; anything that places things in the world must go through the biome
  weights and `shoreDistance`. Design and contract: `docs/redesign/04-infinite-ocean.md`;
  `tools/world-test.ts` must pass.
- `src/sim` must be reproducible: given the same seed and inputs a match replays exactly.
  Nothing there may call `Math.random` — take randomness from the game's `rng` (combat gets it
  through `HitContext.rng`). `tools/` tests rely on this; without it failures do not reproduce.
- The renderer interpolates between fixed simulation steps using each actor's `prevT` snapshot,
  so anything that moves an actor by more than it could swim in one step (teleport, respawn)
  must read as a jump. `tools/motion-test.ts` guards this.
- Three eras, one engine, and the site root is none of them: it is the trilogy's page, with
  `/cambrian/` (entry `src/cambrian/main.tsx`), `/devonian/` and `/triassic/` below it. Each entry
  calls `selectEra(...)` and `setAppBase(nestedBase())` *before* dynamically importing the app, because
  many modules read `ACTIVE_ERA` at module top. Anything new that reads the era at import time must
  stay behind that import (or resolve lazily like `assetPaths` and `music()`); the entry page itself
  must not statically import the audio library or the sim for the same reason. Headless tests that
  need the Devonian do the same: select the era, then `await import(...)` (`tools/devonian-test.ts`).
- The site root is the trilogy's page (entry `src/ancientseas/main.tsx`, data in
  `src/ancientseas/page.ts`); `/ancientseas/`, the address it was first published at, is a redirect
  up to it in `public/`. Every game's title screen offers it, bottom left, in place of the card per
  other era that used to sit there — three games made two of somebody else's titles on a screen
  meant to say press start, and the page they pointed towards holds all three. The pick screen
  keeps its own menu of the other games (`copy.sibling`/`siblings`), because mid-flow a player who
  wants another roster is saved a screen. The page itself: one plate in the three games' own engraved style, filling the window,
  with the three titles on it as links. It is `SLOTS` — pieces placed by centre and width on a
  16:10 desktop stage and a 9:27 phone one — and the plate is built the same way three times over,
  one big animal arching above each era's title with two bottom-dwellers gathered under it, because
  an animal half behind another or a row spread evenly across all three eras reads as a mistake.
  Titles clear the animals above them and carry a faint sepia halo drawn by the page (one custom
  property used by the resting *and* hover states, because `filter` replaces rather than adds),
  so a delivered title is flat ink on transparency. The paper is the window's and the plate is
  the composition's — parchment and seabed span the full width while the 16:10 arrangement is
  centred in it — so a wide screen is filled rather than letterboxed, and a game's title and the
  animal arching over it light together, because between them they are the link — the animal comes
  up in size where it stands rather than moving, since a drawing that slides has come loose from
  the page. `?version=1` still reaches the first draft (the three title
  paintings whole on a dark ground) but neither version draws a switch between them: the parameter
  is for comparing drafts, not something a visitor is offered. Every piece has a brief in
  `docs/image-requests.md` (delivered ones move to the history) and lands in
  `public/assets/ancientseas/`; the page only ever loads what `src/ancientseas/delivered.json`
  lists (`npm run ancientseas:delivered` regenerates it from the folder) and draws a shipped
  stand-in or a named wash for the rest, so nothing asks the network for art that has not arrived.
  A game is its title *and* the animal arching over it: both carry the link and light together,
  with the picture kept out of the keyboard's way so a game is one stop rather than two. A game
  that is not out yet (`comingSoon` on its `GameLink`; the Triassic, for now) keeps its title, its
  animal and its place on the plate and gives up the link, the lighting and the pointer, with a
  *Coming soon* badge under the title — the plate is the trilogy, and a gap where the third game
  goes says less than the third game does. `OPEN_GAMES` is what the pad and the arrow keys walk,
  so nothing can steer into it. Its own page is untouched: this is what the trilogy page offers,
  not whether the game runs, and `/triassic/` still opens by address. **That one line is the whole
  switch**: deleting `comingSoon: true` opens the game in every sense at once, and both checks read
  the flag rather than naming a game, so nothing else needs editing — which is checked by flipping
  it, not by assertion. A game's title and the animal over it also grow together, by one amount
  from one rule (`.as-slot-title.as-lit, .as-slot-animal.as-lit`), because they are one link: the
  growth was split across the lit state and a title-only hover once, and a pad then lifted the
  animal alone while a pointer lifted the two by different steps.
  `npm run ancientseas` checks all of it; `node tools/ancientseas-smoke.mjs <outdir>` screenshots
  the page against a preview build and follows the three links.
- The wordmark the interface draws is derived, not delivered: `npm run logos`
  (`tools/art/header-logos.mjs`) reads each era's delivered `logo-engraved.webp` and writes
  `logo-header.webp` beside it, which is what `assets.logo` and the pick screen's era menu point
  at. The three were drawn at different times and did not read alike at the 190 pixels the pick
  screen gives them — the Triassic's letters are a thin gold rim around a black face, mean ink
  luminance 55 against 107 and 98 — so each mark's ink keeps its own *rank* (stipple, rim and
  shading stay where they are) while the luminance that rank is worth comes from one reference
  mark's distribution, and the result is coloured through one gold ramp. Each is then trimmed to
  its own lettering and re-seated on one canvas at one height, because the delivered marks sit in
  their canvases differently and drew at three different sizes from one CSS rule. Re-run it after
  any brand wordmark is redelivered; the delivered files are never touched.
- The trilogy page answers a controller (`src/ancientseas/picker.ts`): the pad walks the three
  games in the order they stand on the plate, lights the one it is on with the same lighting the
  pointer gives, and A or Start opens it — not any button, because B on a picker means back. The
  arrow keys do the same. It polls on the frame clock only while a pad is actually connected. A
  headless check has to give the page a pad to read *and* a browser with a working frame clock:
  under the software renderer the game pages need, a page that draws no WebGL barely gets frames.
- A game's title screen is drawn from the first frame, before the creatures have streamed in: it
  used to wait for them, and until then the page was the sea the engine had already started
  drawing, so arriving from a link showed the water and then cut to the title. It says it is
  loading where PRESS START goes, and once the wait outlasts `WAIT_HINT` (700 ms, `useSlow` in
  `src/app/Loading.tsx`) it grows a progress bar under that line. The full boot screen is for a
  boot nobody is looking at a screen for — deep-linked to the roster — because over the title it
  would be the title's own painting a second time.
- Fullscreen rides across a change of game rather than surviving it, because it cannot survive it:
  it belongs to the document, switching game is a page load, and the new document may only enter
  on a user gesture of its own. (A query parameter would change nothing — `/cambrian/?game=devonian`
  reached by a link is still a new document. Only a same-document navigation keeps it, and the
  content layer reads `ACTIVE_ERA` at import time, so a second era cannot be booted into a document
  that has already loaded one.) So `src/shared/fullscreen.ts` writes down every entry and exit in
  `sessionStorage`, and each page puts itself back on the first click or key it sees — on a title
  screen that is the press that starts the game anyway. `enterFullscreen` is deliberately not a
  toggle: the toolbar button is the one control that toggles, and a start that toggled would take
  a player who arrived fullscreen straight back out. `npm run fullscreen` covers the decision and
  `tools/ancientseas-smoke.mjs` the whole trip, on the roster screen where a stray click starts
  nothing and so shows the restore on its own.
- An era's `assets.sfx` names the shared sound library (`assets/sfx/`): bites, hits and the UI are the
  same files in both eras. Era-specific samples are addressed as `<era>/<name>` and resolve under
  `assets/<era>/sfx/` regardless. The two always-on beds are named per era in `audio.loops`, and a
  music track that names biomes is an *area theme*: reserved for them, never shuffled into the
  rotation, crossfaded to on a dwell and back again on a longer one, resuming where it left off
  (`stepArea` in `src/audio/audio.ts`, the constants in `src/audio/music.ts`, `npm run music`).
  Nothing synthesises a stand-in for a sound that has not loaded — it stays quiet and the file is
  fetched; anything genuinely missing goes in `docs/audio-requests.md`. Only creatures with their own delivered model are pickable
  (`PLAYABLE` in `src/sim/creatures.ts`); the rest borrow a body in the world but stay off the roster.
- Devonian gameplay lives in `src/sim/devonian/` and Triassic gameplay in `src/sim/triassic/`; both
  reach the shared simulation only through the `RULES?.` hooks in `src/sim/era-rules.ts`. Do not
  branch on the era inside `game.ts`/`combat.ts`; add a hook. With `RULES` undefined the Cambrian
  takes exactly its old paths. The Triassic reuses the Devonian's five-stage ladder, feeding
  weights and fish swim model by importing them — none of that is Devonian — and adds its own:
  `breathing: 'air'` is a gauge *and* a stamina economy (`AIR_MAX`, five minutes, in
  `src/sim/triassic/state.ts`), armour has a facing (`armourFacing`), the sea floor sinks
  by biome (`environment.floorDepth` → `depthProfile` in `src/sim/world.ts`; the other eras leave
  it out and keep their flat floor), and shore animals (`shore: true`, never pickable) are brainless actors pinned on
  the beach by `src/sim/triassic/shore.ts` that telegraph and strike into the water. No playable
  Triassic animal ever leaves the water; `shoreReach` is deliberately unused there.
  `npm run triassic` guards all of it.
- A lungful is a gauge, and running it out is what the old flat rule now means. `AIR_MAX` seconds
  of breath is filled whole by a blow at the surface and spent a second a second under water; while
  it lasts an air-breather recovers stamina like anything else, so the deep is somewhere to hunt
  rather than somewhere to visit on the bar you arrived with. Empty, the era's original rule bites:
  no recovery at all. Drowning is what *that* costs and only in company — air gone **and** the bar
  gone, over `DROWN_TIME`, which is seconds of visibly going under rather than a death on the frame
  the two met, because the gauge has flashed for its last minute (`AIR_LOW`) by then and the climb
  for air costs an air-breather nothing, so it is always escapable. Being held under is its own
  case and has to be said outright now: nothing comes back while something has you, whatever is in
  your chest, which is the promise the HUD was already making. An exhaustion hold eats the gauge
  (`HELD_AIR_DRAIN`) as well as the bar — priced off `GRIP_BREAK`, so a hold carried to the end
  costs about half a lungful — because a hold that only drained stamina stopped doing anything at
  all once stamina came back under water. `npm run triassic` holds the lot.
- The surface is the surface, not a band near it. Both eras' idea of being up for air is
  `brokeSurface` in `src/sim/actors.ts`: the body is pressed against `swimCeiling` — the same
  ceiling `game.ts` clamps a swimmer to, so its back is *at* the waterline — or it is airborne. It
  used to be the top three units plus more for a long body, which meant a Cymbospondylus counted as
  breathing nearly nine units down: the blow had nothing to break at the waterline, and the climb
  ended before it reached the top. The ceiling lives in `actors.ts` precisely because three places
  have to agree about it. And the camera has to come up too — it is pinned under the waterline at
  all times (the ceiling passed to `fitCameraArm`; only a breach lifted it), so the one moment the
  animal is at the top the view was still the water. A blow raises that ceiling for `BREATH_PEEK`,
  eased in and out, and the player sees the spray and their own back in it. `npm run swim` holds the
  camera half and `npm run triassic` the rule.
- The climb for air is the era's central act and must stay usable at every size. The shared rise
  rate is scaled by the body, but the water is not — the surface is the same twelve units above the
  shelf whether you hatched this minute or own the sea — so an air-breather's climb has a floor
  under it (`AIR_CLIMB_FLOOR` in `src/sim/triassic/rules.ts`), which *replaces* rather than
  multiplies a slow body's own rate. And rise and sink are asks like any other: leaving them out of
  the "asked for nothing" test put a body holding the climb button into its glide rate, its slowest
  acceleration. Together those two made a hatchling take nineteen seconds to reach air from the
  shelf floor, which reads as the button not working. `npm run triassic` holds both, and the
  winded heartbeat to a heartbeat — it fired every second for as long as a player stayed down.
- Every Triassic animal hatches from an egg on the sea floor, as in the other two eras. The
  live-bearers were briefly born at the surface instead — which is what the fossils say, and
  Keichousaurus and Dinocephalosaurus preserve the embryos — but it cost the series its one opening
  beat, and a player dropped into open midwater never sees the shell crack. `birth: 'live'` now only
  puts a grown adult of the animal's own kind beside it for the first minute, which is the parental
  care viviparity implies. A reptile's egg is *leathery* (`eggShell: 'leathery'`): opaque, matte,
  dimpled, longer and narrower than the Cambrian's calcareous capsule, and set on the animal rather
  than the era, because the roster also has two sharks, two fish, an amphibian and two cephalopods
  that lay nothing of the kind (`src/render/eggs.ts`). The hatch has to be *seen*: `spawnInCover`
  picks the spot that hides a body best, which is right for the minute after and wrong for the five
  seconds of the shell, so the Triassic steps the egg out of the thickest cover and away from
  anything big enough to stand in front of it (`clearTheView`), and the camera picks the side it
  can be seen from on the frame the egg appears rather than simply sitting behind the animal.
- Triassic art is greenlit before it is built from. Each subject has one **canonical pose** in
  `docs/triassic/canonical/`, and the four-view modelling sheet, the Tripo generation and the
  shipped body are all derived from that one image — so a body that no longer matches its pose is
  the body that is wrong, and a shape change goes back to the pose and a fresh greenlight rather
  than into a later artefact. The review is the reference viewer
  (`docs/research/triassic/viewer/`, live at `<site>/research/triassic/`, regenerated by
  `npm run triassic:viewer`, which also writes the deployed copy in `public/research/triassic/`
  because `docs/` is never published). A human picks the image per subject there and exports the
  decisions; `node tools/triassic/apply-selections.mjs <file>` writes them into
  `docs/triassic/canonical/manifest.json`, regenerates `docs/triassic/canonical/review.md` from the
  whole manifest (not from the export, so a partial pass never drops the decisions it is not
  carrying) and rewrites the preview-badge reasons in
  `src/content/triassic/pending-refinements.json` from where each pose actually stands. The viewer
  keeps **nothing** in the browser: it starts every load from the manifest that `npm run
  triassic:viewer` bundles into `data.js`, so the page always shows what has been applied, and a
  reviewer's clicks are unsaved until they are exported and applied. A decision is one of three —
  greenlight one of ours, redraw one of ours (the reading is right, the picture is not), or
  regenerate toward a reference that beat it.
- Triassic scenery is arriving before the animals: the substrate families in
  `tools/triassic/props/` (stromatolite, salt crust, mud ripple, two authored variants each) are
  placed by `src/content/triassic/scenery.ts` and carpet the biomes the design gives them —
  the gypsum flats and the black basin, where almost nothing grows. The era's *growth* is still
  the Devonian's procedural stand-ins. Never point a Triassic kind at a Devonian mesh in the
  scenery pack: a wrong genus placed by the thousand is worse than an honestly generic shape, and
  which stand-in the game plays with is `environment.ts`'s business.
- On a Tripo-sourced body, **what may be authored is decided by how simple the shape is**, not by a
  list of parts. The generations carry a level of surface detail our own modelling does not match,
  so a *complicated* part built by hand reads as built by hand: smooth where the neighbourhood is
  pored, even where it is irregular. A simple one does not. Closing a hole is simple and is always
  fair game; webbing between the digits of a foot has some shape to it but not much, and is within
  reach; a spiral of a hundred and fifty tooth crowns is not, and the authored one was rejected on
  sight. So the question to ask is how much shape is being invented, and the first move is still to
  reshape what the generation already carries — stretch it, squish it, fuse it, copy it — because
  geometry taken from the body always matches the body.
  Whatever is authored must **wear the creature's own texture**: it takes its UVs from the
  surrounding surface and samples the same albedo, so a patch is not a smooth flat-shaded island in
  a pored hide. A remesh that drops the UVs in its region has not finished the job.
  When a fault is past that bar, the answer is to say so and show what it costs, not to quietly
  model the missing part: the routes out are a regeneration or, where the pose is what is wrong, a
  redraw. None of this binds the Cambrian or the Devonian, whose bodies are procedural in the first
  place and may be changed however their builders like.

- A delivered Triassic body arrives **paired**: the authored (Tripo-derived) model and a procedural
  twin rebuilt to its own volume on the same skeleton, sharing inverse binds, clips and anchors.
  That pairing is the pipeline's verification step, so the specimen viewer swaps between them in
  place — same camera, same scale, same clip at the same frame (`puppet` on `ViewerSpecimen`,
  the one *Model* control in `src/viewer/Viewer.tsx`) — and a twin is never a second row in the roster.
  That control lists what a specimen actually has rather than crossing two axes: a paired body's LOD1
  **is** its twin, the same file byte for byte, so *Reduced model* and *Procedural twin* were two
  names for one thing under two dropdowns until they were merged. An animal whose own body is not
  built has no full model to offer — `model` resolves for it to the body it borrows in play — so its
  raw generation heads the list.
  Sculpt is off on the twin: a sculpt is the hand-off into a builder's profile rows for the body
  that ships. A model landing also moves its canonical state to `delivered`, which
  `tools/triassic/apply-selections.mjs` derives from `tools/triassic/shipped.json`; a regenerated
  pose (a `candidate-awaiting-human-greenlight` in any `docs/triassic/canonical/prompts*.json`)
  clears whatever was decided about the old one and sends the subject back to the undecided pile —
  unless a human has already ruled on that candidate (`reviewedCandidate`), or the reopen would
  undo the decision it was meant to prompt. A **greenlit candidate becomes the pose**: the tool
  renames it over `<id>.png`, **deletes** the loser and every other candidate for that subject, and
  marks the prompt record answered, because everything downstream reads `<id>.png` and nothing else — leaving the
  winner beside the picture it beat would send the loser to be built. Run the tool with no
  arguments to reconcile the manifest with the tree.
- An era's scenery pack must **name** every prop it draws with. An id it does not name falls back to
  the bare id under that era's own props folder, and an era whose folder is empty then asks the
  network for a GLB that was never there — silent everywhere but the network tab, which is how the
  Triassic requested three rock meshes on every seabed. Borrow explicitly instead (the Triassic's
  rocks come from the shared `assets/props/`), and `npm run props` checks both halves: every mapping
  has a file behind it, and nothing is left to the fallback.
- The Triassic's creature models are arriving. Every animal that has not had one yet borrows a
  Devonian body through a cross-era stand-in (`'devonian/<id>'` in `TRIASSIC_STAND_INS`, resolved into that era's folder
  by `src/content/asset-paths.ts`) and is still pickable (`assets.standInsPlayable`), because the
  roster ships placeholder portraits cut from `docs/triassic/canonical/`
  (`tools/triassic/placeholder-portraits.mjs`). When a model lands: files into
  `public/assets/triassic/creatures/`, the id into `tools/triassic/shipped.json`,
  `node tools/update-asset-sizes.mjs`, and the stand-in and preview badge clear themselves. Its
  movement fields are generated like the Devonian's: `docs/research/triassic-swimming.json` →
  `npm run triassic:stats`; never hand-edit them.
- Devonian specimens land in batches (`tools/devonian/shipped.json`). When one lands: run
  `node tools/update-asset-sizes.mjs` (refreshes `src/content/devonian/asset-sizes.json`), remove its
  entry from `DEVONIAN_STAND_INS` in `src/content/devonian/index.ts`, and run `npm run devonian`.
- The Cambrian roster plays at the animals' natural lengths — `docs/research/cambrian-sizes.json` →
  `npm run cambrian:sizes` → `src/content/cambrian/natural-sizes.json`, which `npm run eras` checks.
  The flat lengths it was authored with, every animal within a third of every other, are kept behind
  *Equivalent sizing* (Settings, off by default) for comparison. K is set so the
  roster's *average* adult is the average it is today, so the animals spread either side of the size
  the sea already holds and the biggest one gets to be bigger than anything in it; speed, health and
  poise come with the length so a body of a given length fights as it always did, and the growth
  ladder becomes per-creature (`tierScale` in `src/sim/tiers.ts`) so everything hatches the same
  length. Every consumer goes through `creature()`, which is where the swap happens, and the option
  is fixed when a match starts because `src/sim` has to replay the same way from the same inputs.
  `npm run sizing` checks both that the roster does what the brief says and that the option puts the
  authored roster back exactly, ladder and mass included. Test fixtures ask for size in rungs, ratios
  and body lengths rather than absolute units, because an absolute number stopped meaning the same
  thing to every animal.
- Devonian sizes and swimming stats are generated: `docs/research/devonian-swimming.json` (sourced lengths
  and body-lengths-per-second) → `npm run devonian:stats` → the six movement fields in
  `src/content/devonian/creatures.ts`. Edit the research or the formulas in `tools/devonian/stats.mjs`,
  never those fields by hand; `npm run devonian` checks they match. The water surface is per era
  (`environment.surfaceY`), fish leave the water through it (`airborne`), and the swim model (reverse
  slow, turn sharp when slow, fast-start on sprint) is the `swim` hook in `src/sim/devonian/swim.ts`.
  Devonian growth is five geometric stages per creature (`stageScale` in `src/sim/devonian/state.ts`,
  hatchlings no shorter than 0.6 units); hatchlings are placed inside plant cover (`spawnInCover`).
- How a body gets about, where that is something other than swimming forward, is a set of traits on
  `CreatureDef` — the tail-flip, a body with no front, a medusa's pulse, hauling through weed,
  punting, the row/walk gait, a rate-limited pitch, ram feeding, drifting and clinging. The
  mechanics live in `src/sim/locomotion.ts` and are keyed off the creature, never the era, because
  the same trait turns up in both: `npm run locomotion` covers the Cambrian bodies and
  `npm run devonian` the Devonian ones. A pulse swimmer's animation is that model rather than a
  loop beside it: its `Swim` clip is one `PULSE_CYCLE` long with the squeeze filling the thrust
  window, and the renderer scrubs the clip to the actor's `pulseT` (`bellPhase`) and turns the
  apex into the direction of travel while it beats (`bellTilt`), so re-timing that clip breaks the
  lock — which is what the bell cases in `npm run locomotion` are there to catch. Which animal has what, and how well each is actually
  attested, is `docs/research/locomotion-ideas.md`.
- Nothosaurus now holds its head still in its authored `Swim` and `Sprint` clips. The earlier
  renderer-side `steadyHead` counter-rotation was removed when those clips were corrected; do not
  reintroduce a runtime pose patch for motion that belongs in the reproducible Blender builder.
- A body may shape itself to what it is on: `conformArms` bends a radial rig's arms onto the ground
  under them, or around a creature it is holding, after the mixer has written the pose
  (`src/render/conform.ts`, `npm run conform`). Presentation only, and asked for by name rather than
  read off the rig, because a nautiloid's tentacles carry the same `arm_<i>_<nn>` bone names.
- Seabed scenery collides as the shape it is drawn with: `src/content/prop-shapes.json` is measured
  off the prop GLBs by `npm run shapes` and is what `src/sim` collides against (footprints in
  `src/sim/footprint.ts`). Any new or changed instanced prop must re-run `npm run shapes`, and
  `npm run props` checks the table against the meshes and audits collider against geometry, for
  every era's mapping rather than the one the process happens to have selected. A flora kind may
  name **several** props and is then a family with that many authored shapes (the design's prop
  table asks for this throughout — "three variants by size", "four variants"): the renderer picks
  one per instance from a hash of where it stands, and `src/sim` collides against the family's
  *union* envelope (`propShapeFor`), so a variant is presentation and the collider is never
  smaller than what was drawn. A mineral kind sets `maxLean: 0` and genuinely never bends.
- A plant yields by *its own girth*, not by the size of what hits it (`stout` in `src/sim/flora.ts`,
  measured against the plant's widest section). `give` already weighs body against plant, so weighing
  girth on the body's radius too double-counts size and leaves an adult treating a sponge as thin
  air. A slender stalk flattens — that flattening is how it yields, and is load-bearing — while
  something as thick through as the animal keeps a lever under it and pushes back. Going over and
  going round are exclusive: a dead-on contact (`straightOn`, the `HEAD_ON` cosine) suppresses the
  sideways slide, because a slide that runs during the approach steals the climb it was meant to be
  an alternative to. `npm run swim` holds the three outcomes — over the top, round the edge, and past
  a thin stalk at the floor — and `tools/flora-test.ts` the physics under them.
- Devonian scenery and biome plates are procedural stand-ins: flora kinds and their density table in
  `src/content/devonian/environment.ts` + `src/render/sea.ts`, plates from `npm run devonian:plates`.
  Authored sets replace them without touching placement; see `docs/redesign/09-devonian-remaining.md`.
- Every animal answers what bites it: `thinkNeeds` in `src/sim/ai.ts` turns any hit into fight or
  flight whatever the attacker's size and however hurt the animal is, and an animal that has been
  fleeing the same attacker for two seconds and is still in its reach turns and fights (cornered).
  Nurseries are safe by non-aggression, not by size — `peaceful()` drops prey and rivals inside the
  ring from an animal's reckoning (a mouthful taken in passing included) but never its answer to
  being bitten — and ambient size is rolled from the sea's own ages rather than the biggest player's
  tier, so something full grown passes by from the first minute. Where in the water a swimmer keeps
  itself follows its length: `columnY` in `src/sim/locomotion.ts` raises the floor of a big body's
  range and pulls small ones down towards the sand, and `keepOffTheFloor` in `src/sim/ai.ts` bends a
  large body's travel up whatever its goal asked for (`keepClear`), so the largest animals pass
  overhead rather than lying on the bottom — with about one wander in six (`DIP_CHANCE`) a run down
  over it. `npm run reactions` and `npm run locomotion` guard
  all of it.
- How deep the sea is, is the biome's business. An era that declares `environment.floorDepth` gets a
  floor at the surface less the biome-weighted depth (`depthProfile` in `src/sim/world.ts`), so the
  way out to the open water is a slope rather than a step; an era that declares none keeps the old
  flat-ish floor. The Triassic and the Devonian both do: the Devonian runs 34 units of water at the
  shore, near the Cambrian's 40, to 111 in the open sea, and the tidal channels carve down from
  about 170 out so deep water is a short swim. The stromatoporoid reef is the one thing offshore
  that rises, which is what a reef does. Depth is what the lungs are for — recovery is bad under
  water and complete at the surface — so distance out costs the climb for air. A body placed at an
  *absolute* y is a bug in a sea like this: ask the seabed where the water is (`openWater` in
  `tools/devonian-test.ts` is the pattern).
- A giant hunts when it is hungry and not otherwise (`wantsToHunt` in `src/sim/ai.ts`): being seen
  used to be reason enough, so every giant that could see a player came down on them and there was
  no approaching one to ride it. A fed giant notices — the head comes round, which is the tell — and
  goes back to its route; how often one is hungry follows the hour and the water it is over
  (`appetiteAt`), which is where the rhythm of the day is set. `npm run hunt` covers both halves.
- A mouthful a *player* takes is taken in the mouth: `takeWhole` in `src/sim/game.ts` sends it
  through `startSwallow`, so the body is carried in front of the jaws and eaten over the next second
  rather than vanishing on contact, and swimming into an animal no longer eats it at all — a player
  has to bite or pounce. The reef's own predators, and anything out of a school, still go down in
  one gulp with no ceremony.
- What lives where is the place's own business, not the player's: `src/sim/population.ts` gives every
  210-unit area a size profile and a density from a hash bent by the biome (hatcheries inshore, grown
  animals in the deep), pure in the place and the world seed so an area is the same when you return.
  Size and number come off the one number, the biome's own danger: the deep is busier as well as
  bigger, and the hatchery is thin as well as small. The danger term only ever *adds*, because the
  floor of a third of the usual is a promise that no stretch of sea is empty.
  `spawnAmbient` draws from it; `spawnPreyFor` still keeps food of your own size within reach, and
  `PASSER_BY` sends a large animal through the upper water whatever the seabed holds. Ambient brains
  wander within ~32 units of where they spawned, so a population stays in its biome.
- A death costs a rung, not the swim back. `respawnAt` in `src/sim/game.ts` returns a body to the
  distance from shore it died at — the same biome, the same depth — and away from any giant;
  inshore that is still the nursery, which is the hatchery and in the shore band anyway. Every
  nursery sits a fixed 88 units off the beach, so sending a death to the nearest one returned a
  player who had spent the match working out to the open sea to the shallows every time. `home` is
  still the nursery, because that is what the teleport means. `tools/respawn-test.ts` covers it.
- Every player hatches out of an egg on the bottom rung: `src/sim/game.ts` holds the body still,
  pinned where the egg was laid, until the shell cracks (`HATCH_HOLD`, which is `HATCH_FREE` of
  `HATCH_TIME`) and hands control back there rather than at the end of the performance — the shell
  goes on falling open behind the swimming animal on the renderer's own clock, the only one that
  runs the whole `HATCH_TIME`. `skipHatch()` ends a hatch for headless harnesses. `layEgg` puts the
  Cambrian egg on the sand nose-to the nearest rock or plant (the Devonian's `spawnInCover` has
  already chosen, on the sand in the growth), and `src/render/eggs.ts` draws the shell — small,
  opaque, filled by the body, settled part-buried in the sand, taking pokes from inside, and split
  down its length by the body growing into it: the cut is the vertical plane through the long axis
  and the two halves hinge along the seam's floor and fall open to either side. A moult above that rung is the old
  one-second swell.
- What a player has found — biomes, landmarks, species taken to the top, the Rise record — is
  written to `localStorage` as the match finds it (`recordFinds` in `src/app/codex.ts`), never at
  the results screen: a player who quits mid-match keeps what they found. The results screen marks
  finds new from a list the shell accumulates, because the store already holds them by then.
  `npm run codex` guards both halves.
- `src/content/<era>/pending-refinements.json` is the one queue of outstanding creature art, and it
  separates the two kinds: `model: true` (geometry, materials, rig, LOD art) is what shows the
  creature's ⚠ preview badge in the specimen viewer, with `reason` on hover (the game itself shows
  no badge for now — see `src/shared/ModelStatusBadge.tsx`); `clips` are
  animation clips queued for rework on a body that is already right, flagged on those clip buttons
  in the viewer with `clipReason` and never on the creature. `src/content/pending-refinements.ts`
  derives both eras' tables and `npm run eras` enforces the split — an entry must claim model or
  clip work, whichever it claims must carry its reason, and animation-only work must not badge the
  animal.
- Menu cursors move by where the buttons are, not by list order: `src/app/spatial-nav.ts` resolves a
  direction against the buttons' own rectangles, so the pause and results rows answer left and
  right, a column answers up and down, and the unused axis falls back to list order so no press is
  ever swallowed (`npm run spatial`). On a pad, LB/RB step through every button a screen holds that
  is not the screen's own business — the era link, the mode chips, the icons — one at a time and
  round again, with A taking one and B giving the sticks back; landing on a mode chip picks it, as
  the shoulders always did there. The ring is `src/app/focus-ring.ts` (`npm run focus`), and it is
  owned by the pad that reached for it so the other seats on a shared choice screen keep picking.
- The specimen viewer (`/viewer/`) keeps which creature is open in the URL (`?specimen=<key>`) and
  has a sculpt mode (`&mode=sculpt`, the *Edit sculpt* button): side and top drawings of the body's
  silhouette as the builders' own kind of profile table — twenty stations, dorsal/ventral/width,
  a spline with pullable tangents — grouped into head-to-tail regions, plus the eyes (a mirrored
  pair that slides along the flank or across the crown and keeps its seat in the skin, resizable
  with the socket following) and the mouth (a jaw that opens along the head's outline about a
  hinge behind the socket: drag a corner and the mouth stretches from the front round the sides
  and back along the flanks, everything inside riding with it) as features, warping the loaded model live and following it into view mode and the
  reduced model, with an Edited/Original toggle for the preview. Undo/redo, in-memory only (a reload
  returns to what ships). *Export sculpt* writes `<id>-sculpt.json`, which is the hand-off for a
  builder port: the change goes into the builder's profile rows, never into the GLB
  (`docs/viewer-sculpt.md`). Sculpt is offered only where a builder authors a profile table by hand — the Cambrian and the
  Devonian. A Triassic body is Tripo-derived and its builder *measures* its profile off the intake
  surface rather than authoring one, so a sculpt exported there would describe a table nobody
  writes; that era's editors are *Stretch* (lengthen a run of the raw generation) and *Mark region*
  (say what to cut off it), and `?mode=sculpt` on a Triassic animal opens the view instead.
  `src/viewer/sculpt/profile.ts` is pure and `npm run sculpt` guards it;
  `tools/sculpt-browser.mjs` drives the mode in a browser; `npm run sculpt:measure -- <glb> [sculpt.json]`
  measures a model the same way and reports how far a rebuilt candidate is from a sculpt's target,
  which is how a port is checked.
- The viewer also has a **mark mode** (`&mode=mark`, the *Mark region* button), which is the answer
  to geometry that is welded to the body and should not be there — the extra fins and spare tails on
  the raw generated meshes, where 19 of the 21 bodies are one connected surface and only a human can
  say which fin is wanted (`docs/triassic/preview-mesh-defects.md`). Left-drag paints a world-space
  brush over the vertices and right-drag orbits; *Export region* writes `<id>-region.json`: vertex
  indices into one exact file, with that file's sha256 and the box the marked vertices occupy, so
  `tools/triassic/cut-region.py` can refuse a region marked on a mesh that has since changed rather
  than delete geometry at random. It marks on **whatever body is on stage**, the generated mesh
  included — which is the whole point of it, and where sculpt mode refuses. The cut lands in the
  gitignored workbench (`local/triassic/cuts/`) and never over the source, and never in `public/`
  either: a stray `.glb` in the creature folder reads to `review-bodies.mjs` as an animal's own body
  awaiting review. Installing a cut mesh is a separate human decision.
  `src/viewer/mark/region.ts` is pure and `npm run mark` guards it, `tools/mark-browser.mjs` drives
  the mode in a browser, and `docs/viewer-mark.md` is the schema and the whole workflow.
- Sculpt reshapes a body; the **neck stretcher** lengthens one. A Tripo generation's commonest
  fault is the one a profile table cannot reach — a run of body that is the wrong *length*, a
  Dinocephalosaurus with a lizard's neck — so the viewer offers exactly one of the two at a time:
  sculpt on a shipped rigged body, stretch (`&mode=stretch`) on a raw generated one, because a
  sculpt exported off an unrigged mesh would name a model nobody ships. The edit is two cuts across
  the body, one direction and a factor (`src/viewer/stretch/stretch.ts`): behind the first cut
  nothing moves at all, past the second the head is carried rigidly, and between them the body is
  scaled uniformly along the direction — linear, because easing would pile the new length into the
  middle of the neck and pinch it at both ends. Both cuts are square to that one direction rather
  than each carrying their own: what is wanted is to *aim* the lengthening, and sharing it makes
  the map an exact uniform scale. The seam is real and is why the cuts are placed by hand — put
  them where the body already changes. It is offered on a *built* body too, and there it means
  something else: the editor holds the rig at rest and the export is a measurement (`appliesTo`),
  because every clip these files carry re-specifies each joint's translation on every frame — a
  warped bind pose would show at rest and then flail — so the numbers go to the animal's builder,
  where the rig and the clips are generated downstream of the mesh and follow it by themselves.
  Which way a body lies is never taken from its bounding box if anything better exists: the mouth
  socket, then the generation's authored `previewYaw`, then the box, and the panel says which and
  lets a human override it — because Rhaeticosaurus' flippers span further than it is long, so its
  box says the animal runs across itself. `npm run stretch` and
  `node tools/stretch-browser.mjs` check it; `npm run triassic:stretch -- <file> --write` bakes a
  *generation's* stretch into `tools/triassic/creatures/<id>/<id>.preview.glb` (never into
  `tripo-raw/`, and it refuses a rigged body by name), importing the viewer's own `warp()` so the
  file is what was previewed and reading the result back to prove it. `docs/viewer-stretch.md` is
  the whole of it; Blender work it implies goes in `docs/triassic/builder-requests.md`.
- `?debug=local` on any game page (`/cambrian/?debug=local`, `/devonian/?debug=local`) opens an editor for that
  era's saved state — `src/app/DebugLocal.tsx`, gated by `src/shared/debug.ts`, mounted by
  `src/app/Root.tsx` so both entry points get it without knowing about it. A new thing kept in
  `localStorage` should get a control there; `npm run debug` checks the gate.
- `?debug=game` arms the match recorder instead of replacing the game: the pause menu grows one
  button that walks Start → End → Export and hands a JSON file to the player's machine
  (`src/app/debug-record.ts`, sampled from the engine's step loop). It is for answering "why did
  that not work" with the match's own numbers. Each sample carries the input, the body, the bodies
  near it — with the *surface* gap every reach test actually uses — and the simulation's own account
  of the frame, written from inside the gates that decide (`Game.graspReason`) rather than
  reconstructed beside them, so a recording can never disagree with what the game did. Anything that
  gains a gate a player can fall foul of should say so there. Which bodies count as near is decided
  by that surface gap too, not by a radius round the player's centre: a hatchling clinging to a
  giant is a hand's breadth from its flank and ten units from its middle, and the first recording
  measured the wrong one and so listed no neighbours at all in eleven hundred samples. `npm run
  record` checks that a recording distinguishes a grab that worked from one that could not, names
  the reason, and lists the animal it is about however big that animal is.
- Taking hold is not an attack. Holding costs nothing — no clock, no stamina — and hurts nothing: a
  player's grip never crushes, button down or up. Anything from the animal's own size upwards is
  *ridden* (`takeRide`) until the player lets go or the host shakes them off with a dash; anything
  it could swallow is held in the jaws (`takeHold`). Both decisions are made in one place per path
  — `closeGrip` for a grip that arrives on a lunge or a landing blow, `tryGrasp` for one reached
  for directly — and they must agree. Biting what you are clinging to is a separate press.
  The grasping appendages (`def.grasp`) only make a grip easier to close and further to reach with,
  never a different outcome.
- What a grip *comes to* is decided by the release, and every window runs from `gripSyncT`: -1 while
  the grip is still closing, counting from the frame the two bodies actually meet. Timing from the
  button charged the player for the approach. A ride let go of inside `GRIP_STRIKE` (2 s) lands the
  blow the grip stood in for and something big comes looking for you; held longer it does nothing
  and the host never learns it has a passenger. A mouthful let go of inside `GRIP_MEAL` (5 s) is
  eaten; carried longer it works loose; and at `GRIP_BREAK` (15 s) it is out whatever the holder
  wants — holding costs the holder nothing, so without that it would cost the held animal
  everything. All three ways of getting away are one `breakLoose`. Constants in `src/sim/combat.ts`.
- A grip is a tug of war, not a container. `Actor.drive` is what a body is *asking* for each step,
  kept apart from `desired` because the state machine takes the wish away from anything grabbed. A
  holder moves by both wishes summed and shared by mass, so a heavy catch that wants nothing drags
  on it and one pulling the other way cancels it out; what wears the hold (`GRIP_STRAIN`) is how
  *opposed* the two are, so a holder that goes slack and drifts along is the hardest to escape. A
  dash decides between the two: against a holder that is pulling it tears the grip open, against a
  slack one it shoves the holder instead, scaled by an *uncapped* mass share so hauling something
  six times your length is very nearly futile. `npm run grab` covers all of it.
- A grip is drawn on the host's *animation*, not on its rigid frame. `rideHold` is a point offset
  from the host's centre — where a rigid capsule's surface would be — and a swimming animal's flank
  sweeps and its tail beats right past it, so a rider pinned there holds still while the thing it is
  gripping moves, which reads as floating alongside. At contact `Attachments` takes the host bone
  nearest the hold point (`CreatureAnchors.nearestBone`), keeps the hold point in that bone's frame,
  and each frame reads it back out of the bone's live world matrix and applies the bone's *rotation
  change* to the rider about the hold point. Presentation only — `src/sim` stays rigid and
  deterministic, and the correction is bounded by half the rider's length.
- A player must be able to see the state the simulation is in. The grip is the worked example: it
  closed and held in complete silence, so a recording of it working read to the player as it not
  working. `Game.gripFor` is the readout — what is in the grip and the button that bites it —
  drawn by `GripPanel` in `src/app/Hud.tsx`, and it survives sense-off because it is the player's
  own act rather than a readout of the world. A ride carries no bar, because nothing about it runs
  down; only a mouthful does, and that bar is the mouthful's own struggle to get free.
- The two typefaces are served from `public/fonts/`, not from fonts.googleapis.com: four
  variable WOFF2 files (one per family per Latin subset) declared over a weight range in
  `public/fonts/fonts.css`, which each entry page links. Both are OFL, and the licences ship
  beside them. Going through Google cost a render-blocking third-party request and failed outright
  on any network that does not allow it, our own headless browser included.
- Delivered brand art lands in `intake/` as the original PNG and is converted by `npm run brand`
  (`tools/brand-intake.mjs`) into `public/assets/brand/`. The wordmark's white page is knocked out
  by how *colourless* a bright pixel is, not how bright — the gold has highlights as bright as the
  paper — and edge pixels are un-blended from that white so no pale fringe shows over the sea.
  `intake/` is a handoff inbox, not an archive: convert, check the result where it is actually used,
  then delete the sources from it in the same commit, so anything left sitting there means art has
  been handed over and not yet integrated. Nothing is lost — the originals stay in git history and
  the conversion is deterministic, so a recovered source reproduces the shipped asset exactly.
  See `intake/README.md`.
- Who visits is counted, and nothing else is. `/stats/` reads one GoatCounter site whose code is
  the single editable value in `src/shared/config-stats.ts` (`hoai`; empty is a supported state and
  the page then prints the setup steps rather than an empty dashboard, because "nobody ever played
  it" and "we were never counting" look identical otherwise). `installStats()` in
  `src/shared/stats.ts` is called from each public entry — the trilogy page, the three games and
  the viewer, never the workbench — and attaches one async script and no storage of our own.
  Drilling into a game is a `?filter=` on the dashboard, and what that filter means is not the
  obvious thing: GoatCounter wraps it in `%` at both ends and matches the path *or the title*, so
  every view goes through `pathFilter()`, which adds the `at:start in:path` their parser strips back
  out (`at:end` too for a view that is one page). That is what gives the trilogy page a chip of its
  own despite sitting at the directory the games are nested in — and why *All of it* is
  `/cambrian/` rather than an unfiltered dashboard, since one GoatCounter site counts a whole domain
  and `hoai` also holds other games. `npm run stats` models the matching and checks every view
  counts what it claims; `node tools/stats-smoke.mjs <outdir>` drives both states in a browser with
  `gc.zgo.at` intercepted; `docs/stats.md` is the whole of it. Every *other* browser tool answers
  that request with an empty script (`silenceCounter` in `tools/qa-counter.mjs`, called on each
  page it opens): a network that blocks the counter makes the browser log a console error, and
  these tools fail on console errors — one blocked counter would otherwise fail a check about
  creature meshes.
- All docs live in `docs/`. Design docs are in `docs/redesign/`. Image, glyph and prop
  needs go in `docs/image-requests.md` and move to `docs/image-requests-history.md` once
  delivered and integrated; sound and music needs go in `docs/audio-requests.md`.
