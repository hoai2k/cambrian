# Audio requests — Cambrian Explosion

Open sound and music requests. Image, glyph and prop requests live in
[image-requests.md](image-requests.md). How the audio system consumes what is
delivered — the sample library, the soundtrack director, the distance falloff
and the workbench — is in [audio.md](audio.md).

New requests should include the destination path, duration, loudness target,
size budget, a description of the sound, and the code that will consume it.

## Open

### Biome music themes — 2 loops

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

- **Reef soundtrack — 2 tracks.** *Tide of First Bones* (the session opener) and
  *First Tide*, in `public/music/`. Untagged, so they rotate in every biome.
- **The sound-effect library.** `public/assets/sfx/*.mp3`, generated from the
  prompts in the `MANIFEST` in `tools/gen-sfx.mjs`. Regenerating a sound, the
  midrange level rule that decides whether a take is audible, and the backup
  takes kept out of `SAMPLES` are all documented in [audio.md](audio.md).
  `node tools/workbench-smoke.mjs <outdir>` measures the whole library and
  flags anything missing or too quiet to read.
