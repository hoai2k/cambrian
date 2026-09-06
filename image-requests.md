# Image, prop and music requests — Cambrian Explosion

Only music remains outstanding. All requested environment images, radar glyphs and prop models were delivered on 2026-09-06. Completed briefs and paths are in [image-requests-history.md](image-requests-history.md); current versus future game placements are documented in [docs/environment-assets.md](docs/environment-assets.md).

Keep this document limited to current asset requests. Move completed briefs to history. New requests should include destination path, dimensions, visual brief and intended consumer; prefer text-free art.

## Music themes — 2 loops

The soundtrack (`src/audio/music.ts`) rotates tracks and cues a track when you enter a biome it is tagged for. The reef tracks exist (*Tide of First Bones*, *First Tide*). Two more, same instrumentation family so the crossfades feel like one score; each is tagged for its biomes so entering them cues it (tags are already in `music.ts`, so dropping the files in is the whole integration):

| File | Brief |
| --- | --- |
| `public/music/theme-calm.mp3` | The shallows and nurseries. 2–3 minutes, seamless loop, slow (60–70 bpm), major or lydian, warm pads, soft mallets, gentle water-like arpeggios, no percussion beyond a soft pulse. Should sit under sunlit caustics and let the player relax; it also plays over most of the early game. −16 LUFS integrated, under 6 MB. |
| `public/music/theme-danger.mp3` | Channels, escarpment, basin. 2–3 minutes, seamless loop, slow and low (50–60 bpm), minor or phrygian, sub bass, bowed metal, distant slow drums, long dissonant swells; tense but not a chase (the giant drone and heartbeat layer on top when one is actually hunting you). −16 LUFS, under 6 MB. |

Both are optional: the rotation plays the reef tracks while a file is missing.
