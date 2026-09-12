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
- Two eras, one engine. `/` is the Cambrian; `/devonian/` (entry `src/devonian/main.tsx`) calls
  `selectEra(DEVONIAN)` and `setAppBase(nestedBase())` *before* dynamically importing the app, because
  many modules read `ACTIVE_ERA` at module top. Anything new that reads the era at import time must
  stay behind that import (or resolve lazily like `assetPaths` and `music()`); the entry page itself
  must not statically import the audio library or the sim for the same reason. Headless tests that
  need the Devonian do the same: select the era, then `await import(...)` (`tools/devonian-test.ts`).
- An era's `assets.sfx` names the shared sound library (`assets/sfx/`): bites, hits and the UI are the
  same files in both eras. Era-specific samples are addressed as `<era>/<name>` and resolve under
  `assets/<era>/sfx/` regardless. The two always-on beds are named per era in `audio.loops`, and a
  music track that names biomes is an *area theme*: reserved for them, never shuffled into the
  rotation, crossfaded to on a dwell and back again on a longer one, resuming where it left off
  (`stepArea` in `src/audio/audio.ts`, the constants in `src/audio/music.ts`, `npm run music`).
  Nothing synthesises a stand-in for a sound that has not loaded — it stays quiet and the file is
  fetched; anything genuinely missing goes in `docs/audio-requests.md`. Only creatures with their own delivered model are pickable
  (`PLAYABLE` in `src/sim/creatures.ts`); the rest borrow a body in the world but stay off the roster.
- Devonian gameplay lives in `src/sim/devonian/` and reaches the shared simulation only through the
  `RULES?.` hooks in `src/sim/era-rules.ts`. Do not branch on the era inside `game.ts`/`combat.ts`;
  add a hook. With `RULES` undefined the Cambrian takes exactly its old paths.
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
- A body may shape itself to what it is on: `conformArms` bends a radial rig's arms onto the ground
  under them, or around a creature it is holding, after the mixer has written the pose
  (`src/render/conform.ts`, `npm run conform`). Presentation only, and asked for by name rather than
  read off the rig, because a nautiloid's tentacles carry the same `arm_<i>_<nn>` bone names.
- Seabed scenery collides as the shape it is drawn with: `src/content/prop-shapes.json` is measured
  off the prop GLBs by `npm run shapes` and is what `src/sim` collides against (footprints in
  `src/sim/footprint.ts`). Any new or changed instanced prop must re-run `npm run shapes`, and
  `npm run props` checks the table against the meshes and audits collider against geometry.
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
- What lives where is the place's own business, not the player's: `src/sim/population.ts` gives every
  210-unit area a size profile and a density from a hash bent by the biome (hatcheries inshore, grown
  animals in the deep), pure in the place and the world seed so an area is the same when you return.
  `spawnAmbient` draws from it; `spawnPreyFor` still keeps food of your own size within reach, and
  `PASSER_BY` sends a large animal through the upper water whatever the seabed holds. Ambient brains
  wander within ~32 units of where they spawned, so a population stays in its biome.
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
  with the socket following) and the mouth (a region round the socket that widens, deepens or
  moves) as features, warping the loaded model live and following it into view mode and the
  reduced model, with an Edited/Original toggle for the preview. Undo/redo, in-memory only (a reload
  returns to what ships). *Export sculpt* writes `<id>-sculpt.json`, which is the hand-off for a
  builder port: the change goes into the builder's profile rows, never into the GLB
  (`docs/viewer-sculpt.md`). `src/viewer/sculpt/profile.ts` is pure and `npm run sculpt` guards it;
  `tools/sculpt-browser.mjs` drives the mode in a browser; `npm run sculpt:measure -- <glb> [sculpt.json]`
  measures a model the same way and reports how far a rebuilt candidate is from a sculpt's target,
  which is how a port is checked.
- `?debug=local` on either page (`/?debug=local`, `/devonian/?debug=local`) opens an editor for that
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
- All docs live in `docs/`. Design docs are in `docs/redesign/`. Image, glyph and prop
  needs go in `docs/image-requests.md` and move to `docs/image-requests-history.md` once
  delivered and integrated; sound and music needs go in `docs/audio-requests.md`.
