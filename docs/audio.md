# Audio

How the game makes noise, where the sounds come from, and how to work on them.

## The pieces

| Where | What |
| --- | --- |
| `src/audio/audio.ts` | The whole WebAudio graph: master → sfx bus, ambience and tension beds, music, the sample library, and the synthesized fallbacks used before a file has loaded. |
| `src/audio/music.ts` | The soundtrack: the track list, the opener, and what plays next. |
| `src/audio/mix.ts` | The mix rules: the distance curve for world sounds and the retrigger gaps, shared by the audio module, the renderer, the workbench and the density test. |
| `src/render/engine.ts` | Turns sim events into sounds: `syncListeners()` and `hearing()` decide how loud and how far to the side each one is, `handleEvents()` picks the sound. |
| `public/assets/sfx/*.mp3` | The sample library. |
| `tools/gen-sfx.mjs` | Generates the library from the prompts in its MANIFEST, via the ElevenLabs sound-generation API. |
| `src/workbench/` | The audio workbench at `/workbench/?edit=audio`. |

## Event kinds and files

The sim pushes events; `handleEvents()` plays a **kind** for each, and
`SAMPLES` in `audio.ts` maps that kind to one or more files (variants are
picked at random). Two kinds are escalations rather than events of their own:
a `hit` above strength 1.1 plays `hit-heavy`, and an `eat` above strength 0.5
plays `crunch`.

`src/workbench/audio-catalogue.ts` describes what every kind is for. Keep it in
step with `SAMPLES` — the workbench lists anything the audio module can play
but the catalogue does not describe.

## Distance

World sounds — everything that happens at a place on the reef: hits, bites,
parries, dodges, deaths — are attenuated and panned by where they happened
relative to the nearest local camera. Player stings — hunted, escape, noticed,
tier-up, your own death — are flat, and are only played for a local player at
all.

Distance is measured in units of the listening view's **camera distance**, so a
sound reads the same at every magnification tier: a larva framed at 2.5 m and a
colossal predator framed at 20 m both hear "one screen away" as the same
volume. Inside 1.25 camera distances a sound is at full volume; past 9 of those
it is not played at all. In between, volume falls off inversely and the highs
are rolled off with it, so a distant snap arrives as a soft thud rather than a
click — water eats high frequencies over distance, and clicks are what a reef
full of grazers produces most of.

On top of that, `MIN_GAP` in `mix.ts` sets a shortest gap between two plays of
the same kind, so a burst re-triggering on every stick flick or a mouthful
chewed frame by frame does not machine-gun. A louder — that is, nearer — sound
still gets through the window, so a fight next to you is never masked by
grazing across the reef.

This matters more than it sounds. `tools/audio-mix-test.ts` runs the sim with a
bot-driven player and counts what fires against what is in earshot: the reef
pushes 11–16 events a second, most of them `eat`, and 89–94% of them happen far
enough away to be silent. Before the falloff existed, every one of those played
at full volume, panned dead centre — a probe of an *idle* player found events
firing 5–6 times a second from between 65 m and 172 m away. That is the
clicking.

```sh
npx esbuild tools/audio-mix-test.ts --bundle --platform=node --format=esm --outfile=/tmp/t.mjs && node /tmp/t.mjs 90
```

It fails if a player would hear more than three one-shots a second, or hears
anything from more than 60 m away.

## Music

`src/audio/music.ts` holds the track list. One track is the **opener** and plays first every
session; when a track runs out the game crossfades into a random pick from the rest, never
repeating the one just played while there is another choice. To add a track, drop
`<name>.mp3` into `public/music` and add a line to `MUSIC` — nothing else.

A track may also name the biomes it was written for:

```ts
{ name: 'Channel Deep', biomes: ['channel'] },
```

Entering a biome that has a track of its own cues that track, rate-limited by `BIOME_HOLD` so a
player weaving across an edge does not flip the score back and forth. `src/render/engine.ts`
reports the first player's biome every frame via `audio.setBiome()`. No track names a biome
today, so the rotation is purely random — but the wiring is live, and tagging a track is all it
takes to switch a location on.

Tracks are streamed through media elements rather than decoded into AudioBuffers: they run for
minutes, and a decoded three-minute track costs around 80 MB where a stream costs nothing. The
hand-over is driven by the element's own clock, so it stays correct in a backgrounded tab where
timers are throttled.

The workbench's "Soundtrack" row drives the real director — now playing, skip to next, and
"hear the hand-over", which jumps to six seconds before the end of the current track so a
transition can be heard without waiting a whole track out.

## Regenerating a sound

Each entry in the `MANIFEST` in `tools/gen-sfx.mjs` is
`[name, prompt, seconds, variants, loop]`. The script skips files that already
exist, so to replace one, name it:

```
ELEVENLABS_API_KEY=... node tools/gen-sfx.mjs parry
```

Edit the prompt in the MANIFEST at the same time, so the file on disk and the
prompt that produced it stay in step. Generation is a lottery — ask for several
takes and pick one. A spectrogram is a fast way to tell them apart without an
audio player: a metallic ring shows up as sustained horizontal partials in the
high frequencies, a dry shell knock as a broadband transient that decays fast.

## The workbench

`/workbench/?edit=audio` lists every sound in the game with the files behind it,
plays each one through the real audio module, and has sliders for strength,
distance and pan so the falloff can be auditioned. Hover a sound to read where
in the game it fires from. It starts the audio graph with `ambience: false`, so
the music and the reef bed stay off and single sounds can be heard clean; play
them from the "Beds & music" section to hear them.

`node tools/workbench-smoke.mjs <outdir>` drives it headlessly against
`npm run preview`, and reports any sample file the catalogue lists but the
library does not have.
