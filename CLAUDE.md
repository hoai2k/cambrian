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
- **What is in front of you is always drawn.** `syncViews` picks which bodies get a mesh by
  *apparent size* — body length over distance, with a floor at about eight screen pixels — and that
  is a good rule for the far field and a bad one up close, because the distance it divides by is the
  viewer's **own framing**: the camera sits about one and a half body lengths back, so a 19-unit
  Cymbospondylus watches from thirty units away and a prey fish five units off its nose is
  thirty-five from the camera, right on the floor, popping in and out. The bigger the animal you
  play, the nearer the things that vanish — which is why this showed up in the Triassic and not the
  Cambrian. So the floor is joined by a near field measured in the same unit the camera is placed
  in (`nearAlways`), and the *ranking* weights that near field up (`NEAR_RANK`) rather than letting
  it past the view cap: the cap is a frame-cost limit and must stay one, but what it cuts is the
  tail of the list, and a prey swarm is the tail — every member small on screen and most of them
  beside you. Weighting keeps a giant eighty units off ahead of the chaff and lifts what is within
  reach above the small and far.
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
- **The mouse plays the game without being taken.** It used to be pointer lock: the cursor gone for
  the match, the mouse turning the camera, the middle of the screen the only thing you could point
  at. That is a shooter's scheme and this is a game about pointing at an *animal*, so the cursor
  stays and the camera holds itself. `MousePlay` in `src/input/input.ts` reads one button three
  ways, the way every drawing program does: a **click** (down and up without travelling) is the
  bite and fires on the *release*, because until the button comes up it is not yet known to be a
  click; a **hold** past `HOLD` is the heavy — whatever that animal's heavy is, a pounce, a lunge
  or its own special; and a **drag** past `DRAG` is the camera and cancels the attack, because
  moving the mouse is how you look around. The right button dashes at the water under the cursor
  (the cursor's ray becomes the camera's forward for those frames, so the dash goes there and, held,
  keeps going), and the middle button is aim mode's framing.
  Two things follow from there. `cursorDir` unprojects the cursor into the world, and `updateAim`
  ranks targets along *that* rather than along the camera's centre — pointing at an animal is
  aiming at it — so the frame carries `aim: true` with the target under the cursor while the
  over-the-shoulder *framing* stays on the middle button: the simulation's idea of aiming is "this
  is the body I mean", which is exactly true here, and the camera's is a different question.
  A cursor also gets no snap, because easing the view onto a target would fight the hand holding
  the mouse. **The cursor is then the crosshair, so the on-screen reticle is off in mouse play** —
  two crosshairs on one screen, one of them nailed to the middle, is worse than either alone — and
  the cursor has to carry what the reticle used to say: `src/shared/cursors.ts` draws six states, a
  faint cross over nothing, a green ring over something you could eat, a red barbed ring over a
  fight, four inward arrows while a pounce winds up, a forward arrow while the right button dashes,
  and the browser's own grab hand while a drag turns the view. They are different *drawings* rather
  than recolours of one, so they read without relying on colour, and each carries a dark companion
  stroke because a pale cursor vanishes over a pale animal. `cursorState` puts what a held button is
  **doing** above what the cursor is **over**, since a press in progress is the more urgent fact.
  That also settles the one button: **a press with nothing under the cursor is the camera from the
  first pixel**, and a hold there is never the heavy — there is nothing out there to pounce at, so
  waiting `DRAG` pixels to discover that only costs the player the start of the movement. A *click*
  still bites wherever it lands, because biting at the water ahead of you is a real move and is how
  you attack something you have not pointed at. `npm run cursors` holds the mapping (it is pure) and
  `npm run mouse` holds the wiring. And with no second stick and no lock, nothing is steering the view frame to frame, so
  it steers itself: `FOLLOW_RATE` eases the camera round behind the body and back to the resting
  pitch, and `FOLLOW_HOLD` stands it aside after a drag so looking somewhere on purpose sticks.
  **The cursor's own height is the other half of the view.** Outside a dead zone either side of the
  middle (`edgePitch` in `src/render/engine.ts`, `EDGE_DEAD`), the cursor tilts the camera — up in
  the top of the screen, down in the bottom, squared past the edge so the first part of the push is
  gentle and the corner is quick — which is how a player angles the view so what they are swimming
  at arrives near the middle. The middle is left alone precisely because that is where the aiming
  happens, and a push is an *ask* like a drag is: it holds the follow off while it lasts, or the
  two would pull against each other and the pitch would sit wherever they balanced.
  The keyboard around it is the mouse's own layout: **A and D turn the animal, and the animal turns
  the camera** — they move the *body*, the stick's own sideways axis, not the view: a swimmer turns
  into its travel (`turnRate` in `game.ts`) and the follow camera comes round behind it, so the
  order is the one a player feels, animal first and view after. Driving the camera instead put the
  view somewhere the body had not been yet and left it to catch up, which reads as steering a boat
  by leaning; it also kept a creature's own agility out of the answer, and a Waptia whipping round
  where a giant does not is a thing the camera cannot say. The arrow keys still move the view
  itself. Turning composes with swimming (hold W, press D and the body swims forward along a
  curve) — W forward, X back, E or Q up, S or C down, R the
  shield, Z camouflage, I sense, space to dash, Shift to sprint. Every attack has a key as well as a
  mouse button, because a hand already on the keys should not have to reach: J and F bite, G and K
  are the heavy. `npm run mouse` drives the whole of it in a real browser, where every part of it is something a headless test cannot vouch for. That harness
  waits on the *game's own state and frames*, never on the clock: this page draws about a frame a
  second under the software renderer, so a wait in seconds measures the renderer.
- **A seat is a claim, and arriving at a screen claims nothing.** Reaching the roster from another
  game's picker (`deepLinkedToSelect`) used to open a keyboard seat on the era's default animal, so
  the screen showed somebody playing before anybody had pressed anything. The keyboard now takes its
  seat when it is *used to choose* — `setCreature` with nobody seated opens one, on the animal that
  was clicked rather than on a default somebody has to correct, which is the same thing Enter and a
  pad's A button have always done. That arrival also has to wake the audio: switching game is a page
  **load**, so the new document has had no gesture of its own and its context starts suspended — the
  title screen's press start is what normally wakes it, and a player who came in past the title
  skipped that. Arriving cannot itself resume a context (it is not a gesture), so the page arms
  `audio.init()`/`resume()` there and the first click or key does the rest.
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
  **The soundtrack is never allowed to end**, and it did: everything that moves the rotation on is
  an *event* on a media element (`ended`, `timeupdate`, `error`), so an element that never gets one
  leaves the music stopped for the rest of the match with nothing to restart it. `reviveMusic`
  checks it on the clock the game already runs — silent for `DEAD_AIR` while music is on means pick
  a track and start one. The cause of the original death is worth knowing too: `endVoice` recorded a
  resume position for *every* track, and the rotation hands over **near the end** — that is what the
  crossfade is — so one cycle parked every roaming track a second from finishing and the score
  became a string of one-second snippets and then nothing. Resuming belongs to an area theme, which
  is an excursion you come back from; a rotation track starts at the top.
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
  the beach by `src/sim/triassic/shore.ts` that telegraph and strike into the water. **They are off
  (`SHORE_ANIMALS` in that file) and the beach is empty**: the behaviour they are meant to have is
  designed and not built (`docs/triassic/06-shore-visitors.md`), and a hazard a player is supposed
  to learn should arrive finished rather than as a partial version that teaches the wrong lesson.
  The cycle that *is* built stays intact and checked — `setShoreAnimals(true)` is how the suite runs
  it — so turning them on is one line. A `shore: true` creature is also never an ambient swimmer:
  the sea is populated from `WILD`/`WILD_IDS` (the roster minus the shore animals) rather than from
  `CREATURES`, because the ambient draw took the whole roster and the Triassic was spawning
  hatchling Tanystropheus in open water with ordinary brains — walking animals swimming about
  biting people. No playable
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
- **A dash aimed up keeps its aim until the next dash is ready.** The pad's pitch drifts back to
  level whenever the right stick is let go, which is what makes it feel like it is swimming for
  you — and it is also what made a *series* of upward dashes unusable: a dash is 0.42 s and its
  cooldown 0.55 s, the drift ran through both on a 1.7-second time constant, and by the time the
  button came back the aim had flattened, so the second dash went along the surface rather than
  through it. Breaking the surface is what a chain of dashes is for. `climbAimHold` in
  `src/render/engine.ts` suspends the drift while a dash fired above the horizon is still on
  cooldown and for `DASH_AIM_GRACE` (reaction time) past it, reading the simulation's own
  `dashCd` rather than naming a number `src/sim` owns — so a tail flip's longer cooldown is
  followed for free. Only the *drift* is held, never the stick, so a player who wants to level off
  still does it the moment they ask; and only upward, because the drift on the downward side is
  doing its job — `FLAT_DOWN` exists so a resting view is not a dive into the seabed, and a held
  dive would be the camera swimming a body into the sand. It arms one frame late by construction
  (the renderer cannot know a dash fired until that step has run) and gives up that one frame of
  drift and no more. `npm run swim` closes the loop end to end — camera drift into the stick into
  the real cooldown — and measures the second dash's own rise against the first's.
- **The shore is somewhere a body can end up, and what the sand does to it depends on what it
  breathes** (`src/sim/beach.ts`, `docs/redesign/10-the-shore.md`, `npm run beach`, one process
  per era). Two ways there and they are deliberately unequal: a *leap* lands wherever its arc comes
  down, because nothing in the air is held by water — the shore wall in `resolveStatic` stands only
  for a body swimming at it, and the Cambrian breaches now too, on the Devonian's own terms — and an
  animal with legs *and* lungs (`amphibious` on its card: Tiktaalik, Acanthostega, Nothosaurus,
  Placodus, Aphaneramma, Henodus, Cartorhynchus, Odontochelys) walks up through it, its swim
  handing over to its walk along one ramp (`landSpeed`) and back the same way. **Nothing strands
  itself by swimming**: beside the fixed wall a second one is measured in the body's own draught
  (`WALL_WADE`), because the beach is a different slope in every era and on the Triassic's the
  fixed wall stands on dry sand for a hatchling; a swimmer becomes `ashore` on exactly one frame,
  the one its leap lands on, and both walls *ease* a body found inside them out at a bounded pace
  rather than snapping it. `wade` (0..1, continuous in position) is what the walk ramp, the clip
  handover and the camera's lift out of the water all read; `ashore` is the rule past `ASHORE_WADE`.
  Ashore, a water-breather has `STRAND_BREATH` (a minute, the gauge shown only there — under water a
  gill has nothing to count) and one move, the flop, which goes seaward whatever the stick says; an
  air-breather has no clock, walks along the shore at `LAND_WALK` of its cruise and no further
  inland than `LAND_REACH`, and a Triassic lung fills on the sand because the sand is the surface.
  The flop's hop, twist and nose-up are the simulation's own (`pos.y`, `bank`, `pitch` through
  `flopT`), so no clip is needed for it to read; the renderer throws the swim stroke on top. A
  brainless body ashore is handed the seaward stick (`ashoreInput`). The land is bare in every era
  by construction — `generateChunk` places nothing inland of `SHORE_WALL` — and the Triassic's
  beach becomes dangerous when its shore animals are switched on, not before.
- **A breach is a leap, not a launch.** The vertical a body carried through the surface used to be
  whatever it had, and a dash's launch speed is `L * 9.5 + 7` — so a five-unit animal that dashed
  straight up cleared a hundred units of air and a Cymbospondylus over a thousand. `breachSpeed` in
  `src/sim/game.ts` caps it at `BREACH_LEAP` body lengths of air, which is about what a breaching
  animal actually does. The *horizontal* is deliberately untouched, so a fast run still carries a
  long way forward through the air, and the splash is still sized on the speed the animal was
  travelling at rather than on the capped climb. `npm run swim` holds it at four sizes.
- **Aim mode is framed across the viewport, not across the world.** The over-the-shoulder shift that
  makes room for the crosshair is measured in body lengths, which is right, but the room it needs is
  measured across the *view* — and a split screen has half of one, so two players side by side put
  the animal off the edge. `aimRoom` in `src/render/engine.ts` scales the shift by the view's own
  aspect (`AIM_SHOULDER`), and `AIM_CLOSER` brings the camera in further than it did at every width.
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
  beat, and a player dropped into open midwater never sees the shell crack. `birth: 'live'` is now a fact on the animal's
  card and nothing the sea does to you. It briefly put a grown adult of the same kind beside the
  hatchling for its first minute — the parental care viviparity implies — and what that read as in
  the water was a giant of your own species turning up at the one moment the series gives you, the
  shell cracking on the sea floor, and swimming away. The Triassic hatches exactly as the other two
  games do. A reptile's egg is *leathery* (`eggShell: 'leathery'`): opaque, matte,
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
- **A playable Triassic animal swims; it does not walk.** Several generations arrive posed for land —
  the crocodilians most obviously, and the sprawling temnospondyl — because that is the pose that
  shows the animal best in a still. It is not the pose the game spends its time in: no playable
  Triassic animal ever leaves the water, so `Swim`, `Sprint`, `TurnLeft`/`TurnRight`, `Dive` and
  `Rise` are what carry the body, and a walk or a crawl is an *extra* clip beside them rather than
  the locomotion the rest is built on. Placodus is the pattern: its `validation.json` records
  `locomotion: 'Swim'` and its `Crawl` sits alongside the swim set. The exception is the animals that
  are not playable at all — the shore animals (`shore: true`), which stand on the beach and strike
  into the water, and for whom the land motion *is* the primary.
- A creature is merged the day it is finished, not the day its batch is. The "finish on `main`"
  policy at the top of this file is per *animal*: a body that is built, packaged and checked goes to
  `main` on its own rather than waiting on the three others being built beside it. Bodies are built
  several at a time in separate worktrees, and a batch that merges as a batch holds a finished animal
  hostage to whichever of its siblings turned out hardest.
- **Tripo is fed one view of one animal, never a contact sheet.** The input is a single clean
  three-quarter view on flat pale grey, with no text, labels, borders, cropping or extra animals —
  the `inputPrompt` in each `docs/triassic/canonical/model-inputs/<id>/metadata.json` is the exact
  wording, and the four-view `turnaround.png` beside it is a *human review* artefact that is
  deliberately never submitted. This is not a preference: a delivered six-panel modelling sheet for
  Archelon, fed whole, came back as **six turtles in one GLB**, each with a sixth of the triangle
  budget, because the generator read the panels as a scene. The same sheet's quarter-perspective
  panel, cropped out on its own and padded back onto the sheet's grey so nothing is cut, gave one
  turtle at 19,058 triangles. Reference art that arrives as a sheet is therefore *cropped to one
  panel* before it is submitted, and the panel used is preserved as `tripo-raw/input.png`.
- A subject whose **era is not settled** is not on the roster, and that is load-bearing rather than
  bookkeeping: being in `TRIASSIC_CREATURES` is what puts an animal in the sea, in
  `population.ts`'s tables and on the pick screen, so adding a Cretaceous animal there would answer
  the open question in `docs/triassic/05-mesozoic-expansion.md` by accident. `src/content/triassic/expansion.json`
  is the register for them — Archelon and Mosasaurus so far — and it reaches exactly two places:
  `preview-bodies.mjs` reads a length from it (an off-roster subject has no `adultLength` to scale a
  preview by, and without one the publisher refuses and blocks every other preview with it), and the
  viewer catalogue lists them in the Triassic collection marked `offRoster`. Such a body borrows
  nothing, because it is in no sea, so the *Model* control must not offer it a "borrowed body in
  play" stage and the downloads line must not call a raw generation the full model.
- **A mouth must read as a mouth, not as a hole in the model — and never as a mouthful of gum.**
  *Inside*, the rule is now the opposite of what it was, and the old form is the thing to watch for:
  a single **closed sac whose wall stretches between the jaws** was specified here for months, and
  the moment anyone looked at the animals it was obvious — the mouths were filled with gum. A mouth
  is not a bag. Do not rebuild that. **The top and the bottom are separate areas, filled
  separately if they are filled at all**: a *palate* closing the skull's own opening, rigid to the
  skull's bones, and a *floor* closing the mandible's, rigid to the jaw's, overlapping at the corner
  and behind the hinge rather than joined, so each half is closed on its own whatever the jaw does
  and there is no wall anywhere to stretch. The warning the old rule carried — that two separate
  tubes part when the jaw swings, which is how Placodus came to open onto transparency — was true of
  two *tubes* sharing a seam, and is answered by closing each half rather than by joining them.
  **And the first question is whether a mouth needs filling at all.** Several do not: Shonisaurus and
  Dinocephalosaurus among them. A generation that models no cavity, or whose head is closed behind
  the lip, needs an anchor and nothing else — and a beak inside an arm crown needs an anchor and
  nothing else in every case, which is why both cephalopods have none. Authored geometry in a mouth
  is a cost (it is invented shape on a Tripo body, against the simplicity bar), so it is justified
  per animal by a gape that actually shows through, never added as a matter of course.
  **None of it is drawn at present**: `src/shared/oral-geometry.ts` is the one classifier, the game
  hides everything it matches and the viewer's *Mouth geometry* switch starts off, so what is on
  screen is the mouth each generation arrived with. The simulation reaches a mouth through
  `anchor_mouth` and `anchor_mouth_inside`, which are bones, so none of this is load-bearing.
  Whatever fills a mouth, the proof is unchanged and proving it needs care: render at full gape against a
  saturated backdrop *with and without* a backface-cull shim and compare the two, because comparing
  against the plain background measures the backdrop rather than the gape and passes whatever the
  mesh does. **And the test for "this pixel is the backdrop" has been too loose twice, the same way
  both times**: a magenta world lights the animal too, so a half-space catches it. At
  `r > .5, g < .3, b > .5` it caught Rhaeticosaurus' own lit lining; tightened to
  `r > .75, g < .45, b > .75` it caught Saurichthys' pale silvery *skin*, which renders at about
  (0.78, 0.44, 0.76) and sat inside that window by one part in two hundred on green, while the
  backdrop itself comes back below 0.063 on green in every render this repository has made. It is
  now `r > .90, g < .20, b > .90`, measured against the backdrop rather than set by eye; across 33
  shots on 7 bodies nothing went up, Keichousaurus and Henodus went to 0 and Saurichthys 17 px to 3.
  The tell was the same both times and is worth watching for in any check whose number will not
  move: **a count that does not move under a correction is a count about something else**, and the
  way to find out what a failing pixel *is*, is to cast a ray through it and ask every surface on
  the line rather than keep changing geometry and re-reading renders.
  Two shapes close a mouth that a lining alone does not. `T.rim_flange` folds the open rim of a cut
  inwards, because a boundary edge is one polygon thick and at a grazing angle that edge *is* the
  silhouette — 19 px on Macrocnemus that four corrections to its lining and two to its hinge plug
  did not move; the fold has to run out before the snout, where the two rims meet round the front of
  the mouth and folding both of them inwards parts them instead of closing them. `T.cap_cut` closes
  the cross-section a plane cut leaves through a head, which is the back wall of the mouth and is
  otherwise simply absent — Coelophysis' `SnapRight` sees straight through it into the neck and is
  the era's one open gape failure. *The cut*: the jaw seam follows the model's own lip contour rather than running straight
  near it — cast head vertex normals back into the mesh and fit a curve to the hits where a slit is
  modelled (Placodus), and read the lip line off the albedo where none is (Dinocephalosaurus, where
  the first method finds zero vertices). There is a **third** case, found on Keichousaurus: the
  albedo method reads the *countershading* boundary, which on a long-necked swimmer runs from high
  on the neck downward and put the seam 0.82 of the local radius above the head axis. What that
  generation paints is a thin dark line on the pale lower flank, so the lip is the darkest row of
  each flank *within the pale zone* — a different feature in the same image. Check which feature a
  method has actually found before trusting it. A fish is often genuinely straight and is the easy case;
  reptiles and amphibians have subtle lips and are where a straight cut shows. *The anchors*:
  `anchor_mouth` (role mouth) on the jaw, `anchor_mouth_inside` (role swallow) on the skull, and
  `anchor_attack_primary` (role attack) on the bone that actually delivers the blow — which is **not**
  the skull for an animal whose attack is a neck, a tail or a tentacle rather than a bite.
  Where a generation was **authored with the mouth open**, the open mouth is a pose and not the
  animal: the jaw closes in the neutral pose, so `Idle`, `Swim`, `Sprint`, the turns, `Dive` and
  `Rise` all run with it shut, and only `Bite`, `Attack`, `Heavy` and `Eat` open it. The generation's
  own gaping pose stays exactly where a gaping pose belongs, which is the stills. This is not free,
  and is why a generation is still asked for with the mouth closed: teeth modelled apart tend to
  interpenetrate when they are first brought together, the oral cavity Tripo modelled has to fold
  rather than be built, and closing is a large jaw rotation, so the pose the animal spends almost
  all its time in becomes the most deformed one.
- **Ask what an oral part is doing by taking it out, before building anything in its place.** A
  named mesh can be stripped from the unpacked packaged GLB and `gape-solid.py` run on what is left
  in half a minute, with no rebuild; that is how Dinocephalosaurus' verdict was measured and it
  separated two things a builder had taken for one. The one-sac lining there closed **nothing** —
  0 px through the head shipped, 0–3 px with the sac gone — because what a plane cut through a
  closed head leaves open is the head's cross-section at the hinge, and the seated hinge tissue
  every jawed body carries was already filling it (98–113 px with that gone too). The verdicts, per
  body and with the measurement behind each, are `docs/triassic/throat-repairs/oral-verdicts.md`,
  and a body that carries no lining is a verdict rather than an omission: `oral-shell-audit.mjs`
  reports it cleanly (every variant must agree, and the hidden oral parts it does carry are listed)
  and `gape-crown.py` records itself moot on a crown with no mouth drawn, since a tool whose subject
  has been removed must say so and not fail on an empty `max()`. Expect the throat audit to count
  mixed `skull`/`jaw` vertices on a cephalopod's *body* — the lip band of the crown's own skin is
  weighted to both on purpose — and on every hinge plug; neither is a lining.
- **A beak inside an arm crown is a mouth, and almost nothing about a jawed head applies to it.**
  Neither cephalopod's generation models a mouth at all, and Placodus' method — cast head vertex
  normals back into the mesh and fit the hits — returns hundreds of them spread over the whole crown,
  because what a normal meets across a gap there is the *neighbouring arm*. That is a third way that
  method can lie, after Keichousaurus' countershading. So the peristome is authored on the crown's
  own axis, which is the mean direction of the arms rather than the surface normal at the dome (one
  facet's shape, and on Phragmoteuthis 0.34 forward and 0.94 ventral — a lining built back along it
  left the head after 0.022). **Neither cephalopod is given a modelled mouth at all now**: a beak and
  a peristome lining were built (`T.crown_lining` sewing a sac to the measured cut rim, `T.crown_beak`
  the two mandibles) and were retired with the rest of the sac work — a beak the size these arms hide
  is shape being invented rather than taken from the generation, and what the game needs there is the
  `anchor_mouth`/`anchor_attack_primary` anchors, which cost no geometry. Keep the crown-axis
  measurement (it is what places those anchors) and do not rebuild the sac.
  **And `gape-solid.py` can neither aim nor judge on this shape**: it frames off the
  `jaw` bone's side, which on a crown is outside a thicket of arms, and its verdict is opened
  backdrop the body *encloses* — a crown encloses background between every pair of arms, so a sliver
  at an arm's silhouette counts as if it were the mouth. `tools/triassic/gape-crown.py` keeps the
  method and changes the aim and the verdict: down the crown axis, with a third render painting the
  oral materials an emissive marker so "where the mouth is drawn" is a mask rather than a guess.
  Ceratites ran 168 px through the body, 27 after the sew, 7 after the flange, against 12.
- **A cephalopod's mantle cannot squeeze with a scale channel, and rotation is not a substitute.**
  The packaging contract forbids scale outright, and a bone on the body axis rotating about that axis
  carries a flank point round a circle of the same radius, which is not a contraction. Phragmoteuthis'
  jet is two bones seated inside the flanks with **translation** channels, and its audit measures the
  animal's own width rather than whether they were keyed: `Sprint` takes 0.207 off a 0.772 mantle,
  `Ability` 0.331, and the clips that are not about the jet exactly 0.
- **An appendage count is measured, and the highest settled count is the answer.** An arm crown fuses
  near the base, so how many arms a cut sphere finds depends on its radius, and that dependence is
  the measurement rather than a nuisance. Ceratites runs 6, 9, 11, 11, 12, 12, 12, 12, 13, 13, 13 from
  radius 0.10 to 0.22: the 12 that holds over four radii is **not** the answer, because one of those
  components is twice the size of its neighbours and is two arms still joined. The builders assert
  both — a count that settles over three radii, and no surviving component still 1.75x its
  neighbours. Phragmoteuthis settles on twelve where a decabrachian has ten, which is recorded as a
  generation defect in `docs/triassic/preview-mesh-defects.md` and **not** smoothed away: which two
  of twelve identical arms are the extra pair is not a question the geometry can answer, so choosing
  two would be sculpting the animal rather than repairing the generation.
- **A joint that owns no skin is a silent defect, and it makes other measurements lie.** Hybodus'
  `caudal_upper` and Saurichthys' `pelvic_L`, `pelvic_R` and `caudal_lower` each owned *zero*
  vertices: their clips swung joints that moved nothing, and the per-limb swept angles those
  builders recorded were measurements of nothing at all. Nothing caught it — the paired audits check
  parity, `skin-tears.mjs` checks edges that exist, and a weightless joint appears in neither. The
  causes are anatomical rather than careless, which is why reading the weight table would not have
  found them either: a heterocercal tail's long lobe carries the vertebral column and reads as
  trunk, and a pelvic bone at 0.63 of the body cannot claim a blade sitting at 0.50-0.60.
  `tools/triassic/idle-bones.mjs --all` now runs inside `npm run triassic` over every delivered
  body. The rig's `root` is excluded: it carries the body rather than skin and the clip contract
  forbids it moving, so it owns nothing by design on every body in every era.
- **The oral lining is not skin, and ranking it as skin hides the number that matters.**
  `skin-tears.mjs` names the *bone* an edge belongs to, and the lining is weighted to `skull` and
  `jaw` exactly like the face around it, so the two were indistinguishable: Cymbospondylus read
  9.98x on `skull` while its skin was 2.48x. Any oral surface has a roof riding the skull and a floor
  riding the jaw, so its rest length at a shut mouth is nearly nothing and its ratio
  at full gape says only that the mouth opened — Hupehsuchus' 50x is the lining working, not a torn
  head. Two builders split it locally before it was split centrally; the tool now reports both and
  ranks on skin, matching those builders' own figures exactly. True era-wide skin picture:
  Shonisaurus 1.44x, Keichousaurus 2.34x, Mosasaurus 2.54x, Cymbospondylus 2.48x, Rhaeticosaurus 2.81x, Macrocnemus
  2.94x, Nothosaurus 2.98x, Tanystropheus 3.00x, Birgeria 3.46x, Saurichthys 3.61x, Cartorhynchus 3.72x,
  Archelon 3.86x, Mixosaurus 3.62x, Aphaneramma 4.45x, Coelophysis 4.46x, Mystriosuchus 4.48x,
  Henodus 4.81x, Hupehsuchus 5.79x, Hybodus 5.93x, Dinocephalosaurus 7.00x,
  Helicoprion 11.68x, Placodus 12.36x. Placodus and Helicoprion are the outstanding repair work:
  Coelophysis came down from 25.25x, Macrocnemus from 23.31x, Tanystropheus from 6.09x and
  Cartorhynchus from 5.17x.
- **A skin weighting is three things, and the era has now paid for each of them separately.** The
  *relaxation* — diffusion over the mesh's own edge graph, coupled by inverse edge length, trimmed
  to four influences every pass, sliver runs welded into one weight set — is the one that stops a
  gate tearing a skin, and `shorekit` did not have it at all until Coelophysis was repaired, which
  is the whole reason the three shore animals sat at 25.3x, 23.3x and 6.1x while every body on the
  marine kit sat between 1.4x and 12x. It is imported into `shorekit` from `_pipeline/tripo.py`
  rather than copied, so there is one of it. The *radius* inside which a vertex is wholly a limb's
  is measured rather than authored (`K.measure_radii`), and how it is measured matters: the limb is
  flooded from its tip over the mesh's own edges and never allowed below an arc position past the
  knee, because "nearer this limb's polyline than the axial one" puts half the animal in the distal
  bin — a polyline ends at its last joint and everything past the foot clamps to it — and the belly
  in the thigh. And the *blend between a limb's joints* is a fraction of that limb's own segments,
  never a number: Rhaeticosaurus' 0.050 is a sixth of a flipper reaching 0.30 from the axis, and on
  a theropod's forelimb, whose segments are 0.087, 0.046 and 0.036, the same figure is a band wider
  than two whole segments — it hands every vertex all four joints at one weight and then has the
  relaxation trim a *different* four on its neighbours.
- **Which end is the head is the frame's first decision and its sign is arbitrary.**
  `T.measure_frame` takes the long axis from the first principal component and the *caller* supplies
  the sign; eleven of the Triassic's twelve builders pass `head_is_positive_pca=True` and it is
  right for all of them. It is wrong for Mosasaurus, and it is wrong **plausibly**, which is the
  expensive part: both ends of that body are thin and deep (snout 0.021 half-width against 0.115
  half-depth, caudal fluke 0.021 against 0.115), so every head measurement reads the tail and reports
  it confidently — `T.mouth_cavity` returned zero vertices at every gap out to 0.16 ("this generation
  models no mouth", which other bodies genuinely are), the fluke's fork measured as a 0.055-long
  notch, and `painted_line` on inverted luminance fitted the tail's pale ventral keel with a
  roughness of 0.022, *better* numbers than the read Rhaeticosaurus accepted. Four side renders of
  "the head" are a convincing pair of gaping jaws. What settles it is the **flippers**: the pair
  nearest the head is the larger pair on every tetrapod in these seas, so a builder asserts that
  (`FORE_REACH > HIND_REACH * 1.25`) rather than assuming it, and a reversed frame then fails loudly.
  Birgeria decides the same question off its caudal fin, for the same reason.
- **`depth()` cannot seat anything beside a modelled mouth**, and it looks as if it can.
  `T.depth_probe` returns distance to the nearest surface signed by that surface's normal, so next to
  a modelled slit or cavity `find_nearest` answers about the *lumen's own wall* rather than the skull
  — Archelon's hinge envelope read as outside the body at every size from 0.17 to 1.00 of its nominal
  radius and inside below that, a discontinuity that is the slit being found and not the head being
  small. Rhaeticosaurus' shrink-until-positive search is safe only because that generation paints its
  mouth on a closed head. Where a mouth is modelled, record the probe and assert against the head's
  own **measured section** instead, which uses no normals at all; Placodus and Henodus already record
  rather than assert for the same reason, and the thing that actually proves a mouth is
  `gape-solid.py`.
- **Closing a generation that was authored gaping is priced in two numbers, and only one of them is
  the answer.** Hybodus' `RESTING_GAPE` measures the rotation; the cost is then the mandible posed at
  it, against the skull. Measured with a `find_nearest` normal-sign test beside a *modelled* oral
  cavity that figure counts a mouth floor correctly inside the mouth as inside the skull, so it is an
  upper bound — Mosasaurus reads 27 % of the mandible and 4.5 % of a body length that way. What the
  question actually is, and what a reviewer should be shown, is how far the shut jaw pushes out
  through the head's **own measured section**, which uses no normals: 13 % of the mandible and 0.72 %
  of a body length. And the lining is where the real work is. At the snout the closing rotation is
  *defined* as the one that carries the mandible's dorsal margin exactly onto the palate's ventral
  one, so anything riding the jaw at weight 1 arrives exactly where the palate already is, the two
  surfaces are coincident at the shut pose, and rounding decides which side of the roof each vertex
  lands on — a pink shard through the top of the snout. That is the geometry argument against the
  one-sac lining restated, and it applies to a *floor* too: hold it at 0.93, set it a fourteenth of
  the local gape *below* the mouth line so it starts inside the jaw's flesh, and size it on the
  **measured gape** rather than on
  `cavity_profile` (a cast over the front quarter of a body whose forelimbs sit behind the skull
  mostly finds the gap between a paddle and a flank: x ±0.24 where the head is 0.08 across).
  And read the gape as the **largest** empty interval on a vertical line, not the first: six surface
  crossings turn up wherever a modelled tongue rises into the lumen, and the first interval there is
  the sliver between the mandible and the tongue.
- **A weighting scheme is shaped by the body it was written for.** Nothosaurus' is the era's
  cleanest at 2.98x and the obvious one to copy, and copied unchanged onto Henodus it tore to
  **64.9x** — its "outboard of |y| 0.09 means on the limb" test assumes a narrow trunk, and Henodus'
  carapace is half a body length wide, so 84% of a forelimb's weight landed in the top of the shell.
  Bounding the limb radially against its own bone chain, keeping the along-limb ramp, gave 4.81x.
  So a copied rig is a starting point to be re-measured on the new animal, never a transplant.
- **A part cut onto another bone's shell is out of reach of every weighting, and reads as a limb
  left behind.** The jaw cut on the shore kit was a band in `y` below the mouth line with no bound
  in `x`, and both Aphaneramma's and Mystriosuchus' generations stand with the right forelimb tucked
  forward under the snout — so the arm was cut into the lower-jaw shell, which is rigid on `jaw` at
  weight 1. 411 of the 637 vertices round Aphaneramma's `fore_foot_R` were in that shell, 64.5 % of
  the neighbourhood read as `jaw` against 0.2 % of trunk weight on the other side, and the foot's
  skin travelled 0.45 of the distance its own joint did where every other foot was 1.04 to 1.11.
  Nothing in `weights()` could reach it: the repair is that **the cut asks the question the skinning
  already asks** — a vertex is a limb's where it is nearer that limb's own polyline than the body's
  axial one — so the two cannot disagree about which vertices are an arm. A width bound is not
  enough on a long-snouted animal, whose snout is narrow and whose hand is broad. The tell is the
  cut shell's own bounding box: a mandible is not a body-length deep. `local`-side proof is a lag
  measurement — skin travel round a joint over that joint's own travel — because neither
  `skin-tears.mjs` nor `idle-bones.mjs` can see this at all.
- **A containment test written on `np.interp` cannot fail outside its own table**, because
  `np.interp` clamps rather than refusing. Hybodus' and Saurichthys' hinge plugs were "fitted" by
  asking whether each vertex was inside `head_half_width(y)` and between `head_z(y)` — both
  interpolations over the head's measured stations — so a vertex a quarter of a body length ahead of
  the snout was measured against the section at the snout tip and passed. They reported a clearance
  of +0.004 while standing 1.29 units clear of the nose with 126 of 207 vertices outside the animal,
  and that plug is the pale spike and bloated white shoulder those two shipped with. A head is also
  not a box: `|x| < halfWidth` and `bot < z < top` are both satisfied up in the open water at the
  corner. What answers exactly is **ray parity against the closed intake surface** — a point inside
  a closed surface crosses it an odd number of times on the way out, which uses no normals and no
  table — with a second parity test against the lining sac, because a modelled open mouth is an
  invagination and a point in the lumen is outside the solid by construction.

- **A limbed swimmer's dash has to paddle.** The Triassic's reptiles and amphibians did not scull
  along on a tail beat, and a Sprint clip that waggles the limbs while the body does the work reads
  as a fish with legs attached. The stroke runs from the limb stretched forward to flush with the
  body and back, and the builder records the total swept angle at each limb root per cycle in its
  `validation.json`, so "the limbs move" is a number rather than an impression. Attack clips are the
  same question asked of the weapon: a long neck, a tail or a pair of tentacles is what that animal
  attacks *with*, and a clip that leaves it hanging has not used the animal.
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
  lock — which is what the bell cases in `npm run locomotion` are there to catch. **A bell only
  pulses under power**: sprinting or dashing. It used to surge and coast at every speed, so a
  jellyfish never simply *swam* — every unhurried crossing was a stutter that read as broken rather
  than as a medusa. Off the beat `pulseT` is zero and `bell()` returns **false**, which hands the
  body back to the shared state machine to be animated like anything else: not "nothing to draw"
  but "nothing special about it". Which animal has what, and how well each is actually
  attested, is `docs/research/locomotion-ideas.md`.
- **A stick direction is an instruction, on every body.** The tail-flip (`tailFlip`, the caridoid
  escape) used to go straight back along the animal's own axis *whatever the stick asked*, so
  Odaraia swimming forward and dashing went backwards. It now defaults backwards — asked for
  nothing, the reflex throws the body away from whatever touched it, which is the whole point of it
  and is what a jetter does too — and a real stick direction wins, as it does everywhere else. The
  cost, the launch and the lack of steering mid-flip are unchanged; `npm run locomotion` holds both
  halves.
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
- The seabed is the hot path. A full world's step asks `sampleHeight` some four hundred and fifty
  times, and in an era with `floorDepth` each of those runs `depthProfile` → `biomeWeights` → a
  dozen noise samples, so a term added to a field function in `src/sim/world.ts` is paid thousands
  of times a second. The rule there is that **a weight of zero means the noise behind it is never
  read**: the shelf mosaic's three noises (one an fbm, so six samples) inshore of the 120 units
  where its band weight starts, the channel's ridge noise inside the 170 where its band starts, and
  the boulder fbm off the boulder fields were all being computed and then multiplied by zero, and
  between them they were a third of the step. `nurseryFactor` is the same lesson in allocation: it
  wants one number, and `nearestNursery` builds eight objects to hand it one, on every ground
  sample. Guard a new term by the weight that scales it — and prove the guard **exact** rather than
  nearly right, by hashing `sampleHeight`, `biomeWeights` and `channelFactor` over a grid in all
  three eras before and after. Anything else silently redraws the world under every saved seed.
- The `tools/*-test.ts` suites are the sim's own guards, and most of them now have an npm script:
  `npm run sim` is the whole sweep (about twenty minutes) and `npm run sim:gate` is the cheap half
  (about a minute), which is what the deploy workflow runs. Wire a new suite into both — a guard
  with no script is one nobody runs, which is how `tools/flora-test.ts`'s step-cost check came to be
  failing on `main` for a day unnoticed. That check is wall clock and so machine-dependent: the same
  commit has measured 6.6 ms on one quiet 4-core machine and 8.9 ms on another, so its 8 ms is a
  ceiling with room under it rather than a target, and tightening it towards whatever the fastest
  machine to hand reports makes it fail everywhere else. Read the note beside it before touching the
  number.
- **Sprint is gone, and the dash is as long as it is held.** A steered body has one way of putting
  its back into a move. `toInput` sends `burst: 0` for a player and LB — which used to hold the
  sprint — is a second dash button; the burst machinery stays because the AI drives it and a
  creature's own free surge (`ambushSurge`, `combCruise`, `burstT`) is that same code, so what was
  removed is a *player* holding a button to go faster, not the mechanic underneath it. The dash was
  one length whatever the press was, so the only way to move a little was to move a lot: it now
  pays `DASH_TAP`'s share of the cost up front and the rest per second while the button is held,
  and a release reins the body in (`DASH_BRAKE`) and never charges the remainder. A tap covers
  about a third of a full crossing for about a quarter of the stamina. `DASH_TAP` is a
  *commitment* window — the dash cannot be ended inside it, which is what keeps its invulnerability
  worth having — not a delay before braking. `a.dashCost` is what is still owed, and it is zero on
  a dash nobody is holding (a bot's, a tail-flip's reflex), which is how those stay untouched.
  `npm run locomotion` measures the travel and the price at three hold lengths.
- A giant hunts when it is hungry and not otherwise (`wantsToHunt` in `src/sim/ai.ts`): being seen
  used to be reason enough, so every giant that could see a player came down on them and there was
  no approaching one to ride it. A fed giant notices — the head comes round, which is the tell — and
  goes back to its route; how often one is hungry follows the hour and the water it is over
  (`appetiteAt`), which is where the rhythm of the day is set. `npm run hunt` covers both halves.
- **Being eaten is the end of the chase.** The hunt warning — the arrow, the eye, the line — is a
  reading of the *live* world, and `updateHunted` only ever runs on a body that can still act, so a
  corpse kept whatever score it died holding and went on saying something was hunting it. It is
  cleared where death is actually handled, in `kill` and `startSwallow` in `src/sim/combat.ts`
  (a body in something's mouth has stopped being chased too), rather than by a guard in
  `updateHunted` that nothing would reach. `npm run hunt` holds both.
- A warning is about intent, never about size. The colour of a band marker and of a radar contact is
  red only for a body that is actually coming for you (`comingFor` in `src/sim/actors.ts`: hunting,
  fighting or seeing you off its ground — and for a steered body, aiming at you); everything else is
  the one calm mark (`CALM_MARK`), and the glyph under it still says which size band it is. Drawn
  over every large animal in sight, red meant "something big is there", which the animal's own size
  had already said. The 3D highlight was already intent-based and is where the rule came from.
- A mouthful a *player* takes is taken in the mouth: `takeWhole` in `src/sim/game.ts` sends it
  through `startSwallow`, so the body is carried in front of the jaws and eaten over the next second
  rather than vanishing on contact, and swimming into an animal no longer eats it at all — a player
  has to bite or pounce. The reef's own predators, and anything out of a school, still go down in
  one gulp with no ceremony — but **one bite takes one mouthful**. `attackHits` called `takeWhole`
  for every snack inside the mouth, so a bite into a prey swarm made three or four animals vanish
  at once and none of them was seen taken. A steered body (player or bot) takes the *nearest* one,
  after the loop and through the swallow, and strikes whatever else is in the way; bulk feeding is
  untouched, because a filter feeder crossing a shoal has its own path and an unsteered reef
  predator eats the way it always did. And the mouth is sized on the body's **girth**, not on two
  fifths of its *length* (`mouthReach` in `actors.ts`): the old sphere was a head on a shark and
  half a neck on a plesiosaur, so a long-necked swimmer bit things a body width from its jaws and
  a big animal bit a whole shoal at once.
- What lives where is the place's own business, not the player's: `src/sim/population.ts` gives every
  210-unit area a size profile and a density from a hash bent by the biome (hatcheries inshore, grown
  animals in the deep), pure in the place and the world seed so an area is the same when you return.
  Size and number come off the one number, the biome's own danger: the deep is busier as well as
  bigger, and the hatchery is thin as well as small. The danger term only ever *adds*, because the
  floor of a third of the usual is a promise that no stretch of sea is empty.
  `spawnAmbient` draws from it; `spawnPreyFor` still keeps food of your own size within reach, and
  `PASSER_BY` sends a large animal through the upper water whatever the seabed holds. Ambient brains
  wander within ~32 units of where they spawned, so a population stays in its biome.
- **A death costs half the rung you are standing on, not the rung you had climbed.** `DEATH_COST`
  and `deathMark`/`placeOnLadder` in `src/sim/ladder.ts`, applied centrally in `respawn` so all
  three games price it the same way and an era hook only resets the rest of what a respawn resets.
  A whole-rung penalty made the same mistake cost five seconds or five minutes depending on where
  in a rung it landed — the moment after a moult was worth almost nothing and the moment before it
  everything. Half a rung is the same price wherever it lands, and it still demotes: a quarter of
  the way into adult puts you three quarters of the way through young, and anything past halfway
  keeps its rung. The rung is set by giving the body the scale that rung is worth and letting the
  era read it back (`onSwap`), because the Cambrian stores a `tier` and the other two a `stage`.
  `npm run respawn` prices it at four places on the ladder.
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
- Two seats on the same animal are drawn in different colours. The first seat on a creature keeps
  its authored palette — a player alone is never recoloured — and every seat after it is repainted
  from the era's own pack (`assignSeatSchemes` in `src/shared/seat-schemes.ts`, settled in
  `updatePlayers`, which is the one choke point every lineup change goes through). Assignment is
  sticky: a seat holding a usable scheme keeps it, so changing seat three's creature does not
  re-roll seat two's. `PlayerSetup.scheme` carries it and `src/sim` never reads it. The renderer
  takes it per frame (`seatScheme` on `CreatureView`), not at construction, because a view is
  rebuilt when the body or the LOD changes and camouflage re-derives the blend base every frame.
  `npm run seats` — one process per era, because these modules read `ACTIVE_ERA` at module top and
  a loop silently tests all three as the Cambrian.
- The pick grid holds buttons as well as creatures (Random, and Visitors where one has been
  earned), so its layout is a *model* both the screen and the cursor read
  (`src/app/roster-grid.ts`, `npm run roster`). Navigation used to be index arithmetic over the
  roster, safe only because the tiles were rendered from that same array in that same order; a
  button has a position and no index, and getting it wrong is silent — the cursor lands on one tile
  while another lights up. Buttons are right-aligned: the rightmost columns of the last row where
  it has room, a row of their own where it has not, so the roster's own alignment never moves.
  Nothing in the model touches the DOM, which is what makes the grid the test walks the grid that
  is drawn.
- **Visitors.** Take a creature to the top of its own game and it turns up in the other two, at the
  size it finishes at — a Prime Dunkleosteus in the Cambrian is five times longer than anything
  that sea holds, which is the reward rather than a balance problem. Three things make it cheap:
  every era's `creatures.ts` imports nothing but types, so reading another roster costs the array
  and no module graph; all three games are pages of one build on one origin, so the Cambrian can
  read `devonian-settings-codex` directly; and an asset path can already name another era's folder.
  It must **not** go through `loadCodex`, which filters ids against the *active* roster and would
  strip every foreign id. A visitor is admitted to `creature()` through its own map
  (`admitVisitors`/`isVisitor` in `src/sim/creatures.ts`) and deliberately never joins `CREATURES`
  or `PLAYABLE` — the roster is what the grid draws, what bots are drawn from and what the sea is
  populated with, and a visitor is none of that. `PlayerSetup.visitorScale` overrides every other
  answer about starting size and skips the egg. The one rule they get is that they must fit:
  `deepEnoughFor` in `game.ts` walks out from shore until the column holds the body, because
  distance from shore is what buys depth in every era. Anything with no queue entry must not crash
  the preloader — `prioritize` tolerates ids it has never heard of, and `addVisitor` gives them a
  real one. `npm run visitors` covers all three eras; the apex scales and asset folders are written
  out in `src/content` (which may not reach up into `src/sim`) and checked against the real
  constants there, so they cannot drift. Apex is *how* one is earned, so the results screen says so
  — a star on each apex card, the same mark the Visitors button carries, and one line under the
  strip. That line never **names** a game: which games there are, and how many, is a thing that
  changes — the trilogy has already gained one and one of them is not released yet — so it says
  *where* ("the other Ancient Seas games") rather than *which*, and stays true through all of it.
  The trilogy's own name is fine and so is the game's; a *sibling game's title* is the thing to
  keep out of a game. A visitor's crew card still says "Devonian", which is the period the animal
  is from and is already on every creature card as provenance, not a pointer at another game. **Nothing says so before it is earned.** Visitors are found, not
  promised: a player with an empty apex strip is told nothing, the other games are not named, and
  the word does not appear — the same secret the pick grid keeps by leaving the Visitors button out
  until there is something behind it. A line advertising the reward to somebody who has none spends
  the surprise for nothing, and `npm run results` checks the silence as carefully as the message. `npm run results` renders that panel on its own and reads the
  markup, because a results screen only exists after a match ends and a headless browser gets too
  few frames under the software renderer to finish one; its last check walks the promise end to
  end, from the record the screen draws to the visitor list the other games build out of it.
  There is a **second kind**, and the first two arrived with the Cretaceous bodies: a **standing
  guest**. Archelon and Mosasaurus belong to no game's roster at all, so `earnedVisitors` cannot
  reach them — there is nothing to take them to the top of — and `standingVisitors` admits them
  without their being earned, gated on two things: the body is actually shipped (an id with no entry
  in that era's `asset-sizes.json` never becomes pickable, because a tile with nothing to draw is
  worse than no tile), **and the game is the one whose folder holds them** — a guest visits its own
  game and no other. A Cretaceous marine reptile on the Cambrian's pick screen is not a reward
  anybody earned, it is an animal two hundred and fifty million years early; crossing between games
  is what an *earned* visitor is for. Everything else about them is a visitor: `admitVisitors`, never in `CREATURES` or
  `PLAYABLE`. But a guest **grows**: an earned visitor arrives full grown because that is the
  reward and it has already been taken to the top of its own game, where a guest has earned nothing
  and is admitted because it exists — so it hatches and climbs this game's ladder like anything on
  the roster (`startScale` in `App.tsx` gives a standing pick no `visitorScale`), which is also what
  lets it *be* earned. Two halves make that work: `recordableIds` is the roster **plus** that era's
  guests, so `loadCodex` stops throwing their rungs and their apex away — it cleans against the
  roster alone, and Archelon and Mosasaurus climbed the ladder and were forgotten the moment the
  record was read back — and `defOf` resolves a guest id, so an apex recorded against one becomes a
  visitor in the other two games with its own `origin` on it. `Visitor.era` stays the era whose **folder** holds
  their files, because that is what `'<era>/<id>'` resolves against; where the animal is actually
  *from* is `Visitor.origin`, a display string ("Late Cretaceous"), and anything that says where a
  visitor is from reads that rather than looking the era's name up. Nothing is rippled through
  `ERA_IDS`, `ROSTERS`, `SETTINGS_KEY` or `APEX_SCALE` — there is no fourth era id in the build — and
  the two kinds are joined only in `visitorsHere`, so a test that wants to know nothing has been
  earned does not have to subtract the guests first. The pick screen's Visitors label had to change
  with them: "animals you have taken to the top in the other games" is not true of an animal nobody
  earned. Their gameplay definitions are `src/content/triassic/guests.ts` and their ids are a union
  of their own (`TriassicGuestId`) joined to `CreatureId` beside `TriassicCreatureId`, because
  `BORROWED` and the palette tables are *total* records over that union and would otherwise start
  demanding entries for a sea these two are not in.
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
- A bare `?debug` on the site root (`/?debug`) opens the index of every one of these tools —
  `src/ancientseas/DebugIndex.tsx`, data in `src/ancientseas/debug-index.ts`, mounted by
  `src/ancientseas/main.tsx` the way `Root.tsx` mounts the state editor. It is the trilogy page's
  because what it lists spans all three games and five standalone pages, so no one game is their
  home. It takes the *valueless* parameter deliberately, so it can never collide with a named
  screen: every `?debug=<something>` is one specific tool and `?debug` alone is the list of them,
  and on a game page a bare `?debug` still opens nothing at all. Anything new reachable only by
  knowing a parameter belongs on it — that is the whole point, since knowing the parameter used to
  mean already knowing the tool existed. The data is pure so `npm run ancientseas` checks it
  headless: every page behind a link exists, every game parameter is still read by the module named
  in `reads`, no two rows claim one URL, and every row carries a sentence rather than only a name.
  `node tools/debug-index-smoke.mjs <outdir>` follows every link in a browser against a preview
  build, which is the half a headless test cannot vouch for.
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
- A grip is drawn on the host's *geometry*, not on the capsule the simulation holds it against.
  `rideHold` puts the grip `bodyRadius` out from the host's axis — about a fifth of its length —
  which is roughly the skin on a body as round as it is long and open water beside a long flat one:
  Anomalocaris is 0.11 of its length thick against a capsule of 0.22, so a rider sat a fifth of a
  body length off the animal, and because the grip then follows a bone that empty-water point was
  carried around faithfully for the whole ride. `CreatureAnchors.surfaceToward` closes it with one
  ray, cast once when the grip lands, in from outside along the line the simulation chose — inward
  because the mesh is front-side-only and a ray starting inside passes out through faces it cannot
  see. It corrects in both directions: a flank wider than the capsule pushes the grip out. The
  render-side correction bound has to pay for that, so it is the rider's own half-length *plus*
  `bodyRadius(host)` — at half the rider's length a hatchling's correction was clipped to a third
  of the gap and it stayed in the water however well the grip was placed. `src/sim` keeps its
  capsule and stays deterministic; `node --experimental-transform-types tools/anchors-test.mjs`
  measures the gap against the real meshes.
- Riding frames the *host*. A camera held on a hatchling clinging to a giant sits a body length off
  a very small animal with the giant filling the screen as a wall, and it is also pinned to the one
  body carrying the per-frame correction that seats the grip on moving geometry, so it inherits
  that animation's jitter. `rideBlend` in `updateCamera` eases the look point and the magnification
  onto the host while the ride lasts and back again when it ends, because letting go should not be
  a cut.
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
- **Every word the games say is config.** `src/content/strings.ts` is the shared table — the shell,
  the HUD, the menus, the help page, the settings panel, the feedback form — and
  `src/content/<era>/strings.ts` is what one game says for itself, laid over it by
  `src/shared/text.ts` (`TEXT`). The trilogy page has its own, `src/ancientseas/strings.ts`, and it
  must stay separate: that page is no game's, reads `ACTIVE_ERA` nowhere, and importing `TEXT`
  would pull a roster into the entry bundle. A component asks the table and never spells a sentence
  out, which is what makes the messaging editable without reading the code that draws it and makes
  a second language a second table. Keys are named for **where the player sees the words** —
  `pause.`, `results.`, `hud.grip.`, `select.crew.` — never for what they mean, and a line with a
  number or a name in it is a *function* of that value rather than a string with a placeholder, so
  the argument is typed and a translator can put it where the sentence needs it. An era overrides
  only what it says differently; `mergeStrings` walks plain objects and treats a function or an
  array as one whole value, so replacing the loading facts means *that era's* facts rather than its
  facts interleaved with the Cambrian's — which is what those lines were before, shared and about
  Hallucigenia in all three games. Button names are the one exception and stay in
  `src/shared/controls.ts`: that is the binding table, what the key *is* rather than what the game
  *says*, and `src/input/input.ts` and both diagrams read the same rows. `npm run eras` holds the split: an era
  may only *override* a key the shared table already has (a key it invents is a key nothing reads,
  which is how a renamed string quietly stops being drawn), every leaf of the merged table has to be
  a string, a function or a list of strings, and no two eras may show the same loading line.
- Nothing in a menu describes how to work the menu. The pause and results choices used to carry a
  line under them naming the D-pad and the confirm button; the cursor already answers left, right,
  up and down by where the buttons actually are (`src/app/spatial-nav.ts`), so the line was
  explaining something that needs no explaining and naming one input device out of four while doing
  it. The `pick` action went with it, since nothing else asked for its name.
- A burrower shows the sand it is moving. `Sand` in `src/render/fx.ts` and `burrowSand` in
  `src/render/engine.ts`: a steady shower while a body works itself down, one throw as the floor
  closes over it, and a harder one thrown clear as it surfaces — so both ends of the act are seen
  rather than only the disappearing. Presentation only, off the actors' own `hideMode`, so `src/sim`
  keeps its determinism and gains no event; the silt cloud it already pushes on burial is the
  *rule* (that is what hides the animal) and stays where it is. The grains take the biome's own
  floor colour per grain, because a burrow in the shelf mosaic and one in the black basin must not
  shower the same beige. The *decision* — which of the three moments a body's move between two
  hiding states is, and what that owes — is `sandThrow`, which is pure and held by `npm run sand`;
  the renderer keeps only the accumulator that turns a rate into whole grains, and
  `node tools/sand-browser.mjs` drives the whole of it in a real browser against a preview build.
  That harness is a worked example of the rule about this page's frame clock: the engine clamps
  `dt` to 0.08 s and the software renderer draws about a frame a second, so a wall-clock second is
  a twelfth of a second of particle life and a key held for a fraction of a second can fall
  entirely *between* two frames and never be sampled. Hold presses for seconds, arm the watchers
  before the press, and wait on the game's own state rather than on `waitForTimeout`.

- All docs live in `docs/`. Design docs are in `docs/redesign/`. Image, glyph and prop
  needs go in `docs/image-requests.md` and move to `docs/image-requests-history.md` once
  delivered and integrated; sound and music needs go in `docs/audio-requests.md`.
