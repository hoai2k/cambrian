# Audio requests — Cambrian Explosion

Open sound and music requests. Image, glyph and prop requests live in
[image-requests.md](image-requests.md). How the audio system consumes what is
delivered — the sample library, the soundtrack director, the distance falloff
and the workbench — is in [audio.md](audio.md).

New requests should include the destination path, duration, loudness target,
size budget, a description of the sound, and the code that will consume it.

## Open

### Biome music themes — 2 loops (optional)

Optional: nothing in either era waits on these; the tags fall silent until the files exist.
The soundtrack (`src/audio/music.ts`) rotates tracks and cues a track when you
enter a biome it is tagged for. The two reef tracks exist (*Tide of First
Bones*, *First Tide*). Two more are wanted, same instrumentation family so the
crossfades feel like one score. **Both tags are already live in `MUSIC`, so
dropping the files into `public/music/` is the whole integration**; until then
each one fails to load and drops out of the rotation (`MISSING` in `music.ts`),
and the reef tracks play everywhere.

| File | Biomes | Brief |
| --- | --- | --- |
| `public/music/theme-calm.mp3` | Sunlit Shallows, Nursery Reef | The shallows and nurseries. 2–3 minutes, seamless loop, slow (60–70 bpm), major or lydian, warm pads, soft mallets, gentle water-like arpeggios, no percussion beyond a soft pulse. Should sit under sunlit caustics and let the player relax; it also plays over most of the early game. −16 LUFS integrated, under 6 MB. |
| `public/music/theme-danger.mp3` | The Channels, The Escarpment, Deep Basin | 2–3 minutes, seamless loop, slow and low (50–60 bpm), minor or phrygian, sub bass, bowed metal, distant slow drums, long dissonant swells; tense but not a chase (the giant drone and heartbeat layer on top when one is actually hunting you). −16 LUFS, under 6 MB. |

Both are optional: the rotation plays the reef tracks while a file is missing.
The danger scale that decides the tagging is `BIOME_DANGER` in `src/sim/world.ts`;
see [redesign/04-infinite-ocean.md](redesign/04-infinite-ocean.md) · *Danger, mood and
the art brief*.

## Delivered

- **Big-body and surface sounds — 11 files** (`hit-huge-1/-2`, `crunch-huge`, `surge-huge`,
  `sweep-huge`, `death-huge`, `breach-1/-2`, `splash-down-1/-2`, `surface-roll`) in the shared
  `public/assets/sfx/`, from `MANIFEST` in `tools/gen-sfx.mjs`. Two gaps the Devonian roster made
  obvious: nothing in the audio path knew how big a creature was, so a 11.5 m Titanichthys hit
  exactly as hard as a larva; and the surface clamp was silent, though air breathers meet it
  constantly. The consumers are `heavy()` and the `breach`/`splashDown` cases in
  `src/render/engine.ts`, `HUGE_LENGTH` in `src/audio/mix.ts` and `BREACH_SPEED` in
  `src/sim/game.ts`; see [audio.md](audio.md) · *Big bodies and the surface*. All eleven pass the
  midrange rule (mid-band peak −0.0 to −9.9 dBFS).

- **Devonian Tide** — `public/music/Devonian Tide.mp3`, second track in the Devonian rotation
  (`src/content/devonian/music.ts`), picked at random once the opener finishes.

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
