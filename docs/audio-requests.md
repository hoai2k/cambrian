# Audio requests — Cambrian Conquest

Open sound and music requests. Image, glyph and prop requests live in
[image-requests.md](image-requests.md). How the audio system consumes what is
delivered — the sample library, the soundtrack director, the distance falloff
and the workbench — is in [audio.md](audio.md).

New requests should include the destination path, duration, loudness target,
size budget, a description of the sound, and the code that will consume it.

## Open

Nothing outstanding: every sound and track the game asks for is delivered.

## Delivered

- **Area music themes — 4 tracks** (`Cambrian Drifting`, `Cambrian Abyss`, `Devonian Calm`,
  `Devonian Ritual`) in `public/music/`, replacing the placeholder `theme-calm` / `theme-danger`
  tags. Calm for the shallows and the nursery, dangerous for the channels, escarpment and basin —
  the two safest bands of `BIOME_DANGER` against the three worst, one pair per era. Consumed by the
  area score in `src/audio/audio.ts` (`stepArea`) and tagged in each era's `music.ts`; see
  [audio.md](audio.md) · *The area score* for the crossfade and dwell rules, and `npm run music`
  for the test that drives them.

- **Big-body sounds — 6 files** (`hit-huge-1/-2`, `crunch-huge`, `surge-huge`, `sweep-huge`,
  `death-huge`) in the shared `public/assets/sfx/`, from `MANIFEST` in `tools/gen-sfx.mjs`.
  Nothing in the audio path knew how big a creature was: the one escalation (`hit` to
  `hit-heavy`) keys off damage-relative strength, not size, so an 11.5 m Titanichthys hit exactly
  as hard as a larva. The consumers are `heavy()` in `src/render/engine.ts` and `HUGE_LENGTH` in
  `src/audio/mix.ts`; see [audio.md](audio.md) · *Big bodies*. All six pass the midrange rule
  (mid-band peak 0.0 to −9.9 dBFS).

- **Devonian Shells** — `public/music/Devonian Shells.mp3`, the opening track of Devonian
  Domination (`src/content/devonian/music.ts`). The Cambrian reef tracks fill the rest of the
  rotation until more Devonian music arrives; the two biome themes above are tagged in that file
  too, so dropping them in is the whole integration.

- **Devonian special sounds — 15 files** (`jaw-shear`, `run-through`, `tusk-lunge`, `crush-bite`,
  `neck-snap`, `chelicerae-grab`, `trident-shove`, `shield-push`, `armour-flank`, `brush-display`,
  `shoal-dart`, `limb-haul`, `shell-hover`, `floor-sweep`, `filter-gulp`), one per creature special in
  `src/sim/devonian/specials.ts`, generated with `node tools/gen-sfx.mjs --set devonian` from the same
  manifest and registered under `ability:<abilityId>` in `src/content/devonian/sfx.ts`.
- **Devonian Domination sound effects — 19 files.** `public/assets/devonian/sfx/*.mp3`,
  generated from `DEVONIAN_MANIFEST` in `tools/gen-sfx.mjs` with
  `node tools/gen-sfx.mjs --set devonian` (the Cambrian `MANIFEST` and default output are
  untouched). For the mechanics in
  [redesign/08-devonian-domination.md](redesign/08-devonian-domination.md); the consumer is the
  sample table `src/content/devonian/sfx.ts`, registered by the `/devonian/` entry. Files: `armour-clang-1/-2`,
  `armour-pierce`, `air-gulp`, `air-low`, `anoxia-warning`, `anoxia-drone` (12 s loop),
  `jet-1/-2`, `withdraw`, `moult-crack`, `shoal-join`, `range-claim`, `range-lost`,
  `standing-up`, `dominant`, `beach`, `shell-crush`, `ambient-open-sea` (22 s loop). Every file
  passes the midrange rule in [audio.md](audio.md) (peak above 150 Hz over −18 dBFS, measured
  with the same decode-and-high-pass as `src/workbench/levels.ts`); the first takes of
  `anoxia-warning`, `anoxia-drone`, `range-lost`, `moult-crack` and `ambient-open-sea` failed
  it and were re-prompted with named midrange content, as the doc advises. Loops in this set
  are encoded at 64 kbps so each file stays under 200 KB (largest: `ambient-open-sea`, 177 KB).
  Two takes are worth a listen before they are wired in: `withdraw` is audible but splashy
  (three quarters of its energy above 2.5 kHz), and `ambient-open-sea` sits about 15 dB below
  `ambient-reef` in RMS — right for cold empty water, but the bed gain may want lifting.
- **Reef soundtrack — 2 tracks.** *Tide of First Bones* (the session opener) and
  *First Tide*, in `public/music/`. Untagged, so they rotate in every biome.
- **The sound-effect library.** `public/assets/sfx/*.mp3`, generated from the
  prompts in the `MANIFEST` in `tools/gen-sfx.mjs`. Regenerating a sound, the
  midrange level rule that decides whether a take is audible, and the backup
  takes kept out of `SAMPLES` are all documented in [audio.md](audio.md).
  `node tools/workbench-smoke.mjs <outdir>` measures the whole library and
  flags anything missing or too quiet to read.
