# Audio

How the game makes noise, where the sounds come from, and how to work on them.

## The pieces

| Where | What |
| --- | --- |
| `src/audio/audio.ts` | The whole WebAudio graph: master → sfx bus, ambience and tension beds, music, and the sample library. Samples only — a cue whose file has not decoded yet asks for it and stays quiet rather than playing a synthesised stand-in. |
| `src/audio/music.ts` | The soundtrack: the track list, the opener, and what plays next. |
| `src/audio/mix.ts` | The mix rules: the distance curve for world sounds and the retrigger gaps, shared by the audio module, the renderer, the workbench and the density test. |
| `src/render/engine.ts` | Turns sim events into sounds: `syncListeners()` and `hearing()` decide how loud and how far to the side each one is, `handleEvents()` picks the sound. |
| `public/assets/sfx/*.mp3` | The sample library. |
| `tools/gen-sfx.mjs` | Generates the library from the prompts in its MANIFEST, via the ElevenLabs sound-generation API. |
| `public/music/*.mp3` | The soundtrack. Open music requests are in [audio-requests.md](audio-requests.md). |
| `src/workbench/` | The audio workbench at `/workbench/?edit=audio`. |

## The two beds

The ambient loop and the giant's drone are named by the era (`audio.loops` in its content pack),
not by a shared constant: the Cambrian's bed is `ambient-reef`, the Devonian's is its own
`devonian/ambient-open-sea`. Both go through the preload queue like any other sound.

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

## Big bodies

`heavy()` in `src/render/engine.ts` swaps in a `-huge` sample when the body making the sound is
over `HUGE_LENGTH` (6 m, in `mix.ts`). The Devonian roster runs 4–11.5 m against the Cambrian's
1–3.9 m, and giants in either era are scaled well past it, so without this a Titanichthys lands
exactly like a larva. It covers `hit`, `crunch`, `burst`, `dodge` and `death`; add a sample named
`<kind>-huge` and the rule picks it up, since `heavy()` only swaps when the library has one.

The surface is a separate mechanic: a fish that `canBreach` and is driving hard at the waterline
leaves the water altogether and flies on gravity until it lands (`airborne` in `src/sim/game.ts`,
the `breach` and `splash` events). That is Devonian-only — `RULES` is undefined in the Cambrian —
and its samples live in the era's own library.

## Levels

A sample can measure loud and still be inaudible in play. `ui-start` was: almost all of its
energy sat below 150 Hz, where laptop and phone speakers do not reproduce, so it read as
silence at any volume. Its peak above 150 Hz was −26.7 dBFS, sixteen decibels under the UI
sounds either side of it.

So the workbench measures every sample twice — as it is, and again through a 150 Hz high-pass —
and it is the second number, shown on each file chip, that says whether a player will hear it.
"Measure levels" decodes the whole library and flags anything whose mid-band peak is under
−18 dBFS (`QUIET_MID_PEAK` in `src/workbench/levels.ts`). Run it after regenerating a sound.

This is worth knowing when writing prompts: asking for "deep", "muffled", "dull" or "low"
reliably produces a sub-bass rumble that meters loud and plays silent. Name something with a
midrange instead — a squelch, a wet crack, a wooden knock, bubbles — and say "close and
present".

## Music

`src/audio/music.ts` holds the track list. One track is the **opener** and plays first every
session; when a track runs out the game crossfades into a random pick from the rest, never
repeating the one just played while there is another choice. To add a track, drop
`<name>.mp3` into `public/music` and add a line to `MUSIC` — nothing else.

A track may also name the biomes it was written for, which reserves it for them:

```ts
{ name: 'Cambrian Abyss', biomes: ['channel', 'escarpment', 'basin'] },
```

### The area score

An **area theme** is never shuffled into the rotation — the rotation is the tracks that belong
nowhere in particular. Instead the score follows the player: `src/render/engine.ts` reports the
first player's biome every frame through `audio.setBiome()`, and `stepArea` decides what that
should mean. This is horizontal re-sequencing with hysteresis, the ordinary approach when the music
is finished tracks rather than stems.

| | | |
| --- | --- | --- |
| `AREA_FADE` | 7 s | The crossfade, long enough that the change reads as the water changing rather than as a track ending. |
| `AREA_ENTER` | 3 s | How long you must be somewhere before it counts. Biome edges are jagged and a player can cross one several times a minute; without this, clipping a corner of the basin starts a fade nobody asked for. |
| `AREA_LEAVE` | 5 s | And how long you must be *away* before the score gives the area up. Longer than the entry on purpose: that asymmetry is what stops the music oscillating along a boundary you happen to be working. |

Two things make a short excursion sound like part of the piece rather than a mistake. The fade
**reverses** — turn round while it is still running and the same two voices ramp back the other way
instead of restarting — and every track **remembers where it had got to** (`resumeAt`), so coming
back to one resumes it rather than replaying its opening. An area theme also loops while it is the
one playing, since the rotation is not where it goes next.

`npm run music` drives the real state machine headlessly against a stubbed WebAudio: entering,
dipping out under the dwell, coming back, staying away, and turning round inside a fade.

Four themes are tagged: `Cambrian Drifting` and `Devonian Calm` for the shallows and the nursery,
`Cambrian Abyss` and `Devonian Ritual` for the channels, escarpment and basin — the two safest
bands of `BIOME_DANGER` against the three worst.

A track whose file is not there — one tagged in `MUSIC` but not yet delivered — leaves the rotation
on its first load error (`MISSING`) and stops cueing its biomes. Because that is only discovered
once the track is *chosen*, the next pick is made against the last track the player actually heard
rather than the current one: two undelivered tracks in a row would otherwise let the rotation land
straight back on the track that had just finished.

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
takes and pick one. Sounds listed in `LOW_INFLUENCE` are generated at a lower
`prompt_influence`, which leaves the model room to make a real recording rather
than reciting the adjectives back; that is what got the organic takes.

Two measurements tell most takes apart without an audio player: the level above
150 Hz (see **Levels**), and the share of energy above about 2.5 kHz — the old
`ability` had 78% of its energy up there, which is what "metallic" sounded like.
Trust those over a spectrogram picture; the log-frequency plots that
`ffmpeg -lavfi showspectrumpic` draws carry a bright horizontal line that is an
artifact of the rendering, not a tone in the file.

## The workbench

`/workbench/?edit=audio` lists every sound in the game with the files behind it,
plays each one through the real audio module, and has sliders for strength,
distance and pan so the falloff can be auditioned. Hover a sound to read where
in the game it fires from. It starts the audio graph with `ambience: false`, so
the music and the reef bed stay off and single sounds can be heard clean; play
them from the "Beds & music" section to hear them.

The **Devonian** sounds are listed too, in their own two categories. The game registers an era's
samples when that era's entry loads; the workbench is neither era, so it calls `registerSamples`
for the Devonian table up front and lists both libraries. Their names carry the era prefix
(`devonian/jet-1`), which is what `sfxUrl` uses to resolve them under `assets/devonian/sfx/`.

A sound can also carry **backup takes** — earlier versions kept in the library but not wired
into `SAMPLES`, listed in the catalogue's `alts` and shown as dashed chips. `escape` has one.
Swapping one in is a rename.

`node tools/workbench-smoke.mjs <outdir>` drives it headlessly against
`npm run preview`, measures the library, and reports any sample the catalogue lists that is
missing or too quiet to read.
