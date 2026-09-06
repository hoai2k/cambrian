# Animation brief — new clips for Cambrian Explosion

This document is for the agent or animator producing new animation clips in
Blender for the eight creature rigs in `public/assets/creatures/*.glb`. It
lists every clip the game will use, exactly how it must be named and timed,
how the game plays it, and a prompt-style description of the motion for each
creature. The game already picks these clips up **by name**; nothing in the
code needs to change when they land.

## Delivery rules (read first)

1. **Add, never replace.** Open the existing GLB, keep every existing clip
   (`Idle`, `Swim`/`Crawl`, `Attack`, `Hit`, `Death`, `Dive`, `Rise`,
   `TurnLeft`, `TurnRight`) untouched, add the new actions, export to the
   same filename. Meshes, materials, textures, bone names and bind pose must
   stay identical. If anything about the rig has to change, stop and say so.
2. **Export settings (glTF 2.0 Binary `.glb`):** include all actions (NLA
   tracks or "Animation mode: Actions", every action pushed down / stashed on
   the armature), sampling on, 30 fps, "Always sample animations" on,
   "Group by NLA track" **off**, "Optimize animation size" on, Y-up, apply
   modifiers off. Compression: the originals use `EXT_meshopt_compression`;
   export **uncompressed** and we will re-compress with
   `gltf-transform meshopt` in the repo (or run it yourself:
   `npx @gltf-transform/cli meshopt in.glb out.glb`).
3. **Clip names are case-sensitive and exact.** They are listed per clip
   below. One action per clip, no suffixes (`Bite`, not `Bite.001` or
   `Armature|Bite`). Strip the `Armature|` prefix Blender adds when exporting
   with "Group by NLA track" on.
4. **No root motion.** The `root` bone stays at the origin with identity
   rotation in every clip. The game moves the body; clips only pose it. A
   lunge is expressed as the body reaching forward and recoiling, not as
   translation of `root`.
5. **Loop clips must loop seamlessly** (last frame equals first frame, same
   velocities). One-shot clips start from and return to the neutral `Idle`
   pose at frame 0 and the final frame, so any cross-fade is clean.
6. **Facing convention:** the creature faces `+Z` in its local space, `+Y` is
   up, `+X` is the creature's left. "Forward" below always means `+Z`.
7. **Frame counts** are at 30 fps. Durations are what the game expects; the
   engine can time-scale a clip ±30% but not more without it looking wrong.
8. **Do not animate scale.** Only rotations (and translation on non-root
   bones where the existing clips already do, e.g. jaw/proboscis).
9. **Deliverable:** the eight updated `.glb` files plus a short text note per
   creature listing the clip names and frame counts. A Blender file per
   creature is welcome but not required.

## How the game uses each clip

| Clip | Type | Duration | Played when | Replaces (current stand-in) |
| --- | --- | --- | --- | --- |
| `Bite` | one-shot | 0.5 s (15 f) | Light attack (RB). Hit window is frames 4–9. Retimed by the engine to 0.35–0.6 s depending on creature. | `Attack` sped up |
| `Heavy` | one-shot | 1.1 s (33 f) | Heavy attack (X). Wind-up frames 0–12 (the player can read it and dodge), strike frames 12–18, recovery 18–33. | `Attack` slowed down |
| `Grab` | one-shot | 0.9 s (27 f) | Anomalocaris only: after a successful `Heavy`, holding and crushing a victim, then throwing it forward. Other creatures: not needed. | `Attack` |
| `Guard` | loop | 1.0 s (30 f) | Held while LB is down. Braced, defensive, slight breathing motion so it isn't a freeze. | `Hit` frozen at 30% |
| `Parry` | one-shot | 0.35 s (10 f) | Tap LB as a hit lands: a sharp deflecting twist or clash, then snap back to neutral. | turn clip burst |
| `Dodge` | one-shot | 0.4 s (12 f) | B: a fast full-body flick. Direction is applied by the engine (it mirrors/banks the whole model), so animate a generic sideways evasion to the creature's left with a bank. | additive dive/turn |
| `Eat` | loop | 0.8 s (24 f) | Feeding on a corpse: head down, rhythmic bite and tear. Loops until the corpse is gone. | `Attack` at half speed |
| `Stagger` | one-shot | 1.2 s (36 f) | Poise broken or guard broken: reeling, appendages splayed, slow recovery. Frames 0–6 are the impact, 6–30 the reel, 30–36 recovery. | `Hit` slowed |
| `Ability` | see per creature | see per creature | Y. Either a one-shot (surge, snatch, flick, sweep) or a **held loop** (burrow, enroll, shell-up, anchor, flare). Which one is stated per creature. | `Attack` / procedural squash |
| `Moult` | loop | 1.5 s (45 f) | Tier-up. A shudder and stretch while the engine scales the model up. Optional; the engine has a procedural wobble. | procedural |

The engine still owns: banking on turns, pitch when diving, procedural
spine undulation for swimmers at speed, hit flash, and all scaling. Clips
should not fight those: keep the spine chain roughly neutral in `Guard`,
`Eat` and `Ability` loops, and let the engine add the bank.

## Rig reference (bone names to drive)

All rigs share `root` at the origin. Chains are zero-indexed from the head
end. `_L`/`_R` or `_1`/`_-1` denote left/right.

| Creature | Bones | Spine / body chain | Appendages | Head parts |
| --- | --- | --- | --- | --- |
| Anomalocaris | 115 | `body_00`–`body_07` (head → tail) | `flap_L_NN`, `flap_R_NN` (16 pairs of lateral swim flaps, each 2 bones), `tail_L_N`, `tail_R_N` (3 fan blades each + tips) | `claw_L_*`, `claw_R_*` (7-segment frontal raptorial appendages), `eye`, `eye_-` (stalked eyes) |
| Opabinia | 72 | `body` (single hub) + `segment_00`–`segment_14` | `flap_NN`, `flap_-NN` (15 pairs of lateral lobes), `tail_N`, `tail_-N` (3 pairs of tail fans) | `proboscis_00`–`proboscis_11` (12-segment trunk), `jaw`, `jaw_-` (terminal claw halves), `eye_0`–`eye_4` |
| Waptia | 88 | `body` + `segment_00`–`segment_11` | `raptor_1_*`, `raptor_-1_*` (3 raptorial legs per side, 9 segments each), `swimmer_N`, `swimmer_-N` (6 swimming appendages per side), `tail`, `tail_-` (tail fan) | `antenna_1`, `antenna_-1` (+ tips), `eye_1`, `eye_-1` |
| Canadia | 70 | `body` + `segment_00`–`segment_20` | `parapodium_1_NN`, `parapodium_-1_NN` (21 pairs of bristled paddles) | `proboscis`, `tentacle_1`, `tentacle_-1` (+ tips) |
| Hallucigenia | 50 | `body_00`–`body_08` | `leg_NN_L`, `leg_NN_R` (7 pairs, each with tip) | `tentacle_N_1`, `tentacle_N_-1` (6 pairs of front feeding tentacles, with tips). Dorsal spines are mesh only, no bones. |
| Marrella | 120 | `body_00`–`body_08` | `leg_NN_L`, `leg_NN_R` (26 pairs, each with tip) | `antenna_1`, `antenna_-1` (+ tips), `paddle_1`, `paddle_-1` (the two long sweeping head appendages) |
| Olenoides | 78 | `body_00`–`body_08` (cephalon `body_00`, pygidium `body_08`) | `leg_NN_L`, `leg_NN_R` (15 pairs with tips), `cercus_1`, `cercus_-1` (+ tips) | `antenna_1`, `antenna_-1` (+ tips) |
| Wiwaxia | 10 | `body_00`–`body_08` only | none | none. Sclerites and blades are mesh. Everything must be told through the 9-bone body. |

Existing clip timings for reference: swimmers' `Idle`/`Swim` are 2.4 s loops,
crawlers' `Idle`/`Crawl` 2.0 s, `Attack` 0.87–1.33 s, `Hit` 0.6–0.83 s,
`Death` 1.2–2.0 s. Match their energy level: the new clips should feel like
they belong to the same performance.

## Per-creature prompts

Each entry gives the creature's fighting character, then a description per
clip. Write these as if directing an animator; they are the acceptance
criteria.

### Anomalocaris — pursuit predator (swimmer)

Character: a torpedo with hands. Heavy, committed, terrifying from the front.
All power comes from the two frontal appendages (`claw_L_*`, `claw_R_*`); the
flaps ripple constantly and the tail fan flares on any hard move.

- `Bite`: both appendages snap from a loose cocked position to closed in
  front of the mouth in 4 frames, flaps pause for the strike, then open again.
  Small forward reach of `body_00`–`body_02`.
- `Heavy`: the appendages draw back and up over 12 frames (unmistakable
  wind-up, eyes track forward), then slam down and inward, body arching
  forward, tail fan fully flared. Long recovery with the appendages slowly
  reopening.
- `Grab`: appendages closed and pulsing (crushing) for 18 frames with a
  slight body shake, then a violent open-and-fling forward.
- `Guard`: appendages crossed in front of the head like a shield, body
  slightly curled, flaps holding position with a low-amplitude ripple.
- `Parry`: a quick outward slap of both appendages with a body twist to the
  left, tail fan flick, back to neutral.
- `Dodge`: body snaps into a C-curve to the left, all flaps on one side beat
  once hard, tail fan flares, recovers straight.
- `Eat`: head tilted down, appendages tearing alternately toward the mouth,
  body swaying gently.
- `Stagger`: appendages splayed wide and limp, body rolling back and to one
  side, flaps out of phase, slow re-gathering.
- `Ability` (Ambush surge, **one-shot, 0.6 s / 18 f**): appendages tuck flat
  against the body, flaps switch to a fast tight ripple, body straightens
  like a dart. Ends in a streamlined pose (the engine keeps speed high for
  2 s afterwards using `Swim`).

### Opabinia — reach specialist (swimmer)

Character: precise, curious, slightly comic. The proboscis (`proboscis_00`–
`proboscis_11` + `jaw`, `jaw_-`) does the fighting; the five eyes swivel a
lot; the lobes flutter.

- `Bite`: proboscis whips forward and the jaw halves snap shut, then retracts
  in an S-curve.
- `Heavy`: proboscis coils back over the head for 12 frames (the eyes all
  point forward), lashes down and forward at full extension, jaw clamps,
  recovers slowly in a wave from base to tip.
- `Guard`: proboscis curled tight under the head, lobes pulled in, eyes
  swept back, small breathing motion.
- `Parry`: proboscis swipes across the front from right to left, jaw open,
  body tilts left.
- `Dodge`: sharp left roll, lobes on the left side snap down, proboscis
  trails.
- `Eat`: proboscis alternately reaching down and delivering to the mouth
  under the head; a small jaw chew each cycle.
- `Stagger`: proboscis flops limp, eyes splay in all directions, body rolls.
- `Ability` (Snatch, **one-shot, 0.55 s / 17 f**): proboscis fires to full
  length straight ahead in 5 frames, jaw open, then yanks back hard with the
  jaw closed, body recoiling. Frames 6–10 should hold at full extension
  (that is when the engine hooks the target).

### Waptia — skirmisher (swimmer)

Character: nervous speed. The raptorial legs (`raptor_1_*`, `raptor_-1_*`)
strike fast and small; the tail fan is the exclamation mark; the antennae
never stop moving.

- `Bite`: one raptorial leg pair snaps forward and back in 4 frames (alternate
  pairs across the chain would be nice but not required), swimmerets pause.
- `Heavy`: all three raptorial pairs cock back (12 f), then a full-body
  forward thrust with the raptorial legs extended together, tail fan snapped
  shut for the lunge, then a shaky recovery.
- `Guard`: not used by Waptia (it cannot guard). Skip.
- `Parry`: skip (Waptia parries by dodging).
- `Dodge`: the signature: body folds into a tight curl to the left, tail fan
  flares fully, then whips open straight; the fastest clip in the set.
- `Eat`: quick nibbling with the raptorial legs, head down, antennae
  sweeping the food.
- `Stagger`: legs splayed, tail fan drooping, body wobbling.
- `Ability` (Tail flick, **one-shot, 0.45 s / 14 f**): an explosive tail
  snap with the body pitching nose-up and the swimmerets flaring, as if
  kicking backwards. The engine moves the creature backwards; animate the
  kick, not the travel.

### Canadia — controller (swimmer)

Character: a ribbon of bristles. Everything is a wave travelling along the
21 segments; the parapodia (`parapodium_*`) flare outward like blades.

- `Bite`: the front third of the body snaps sideways and back, front
  parapodia flare on the strike side.
- `Heavy`: the whole body coils into a spiral over 12 frames, then unwinds in
  a full 360° sweep with every parapodium flared (the engine hits all
  around). Recovery is the body settling back to straight.
- `Guard`: body in a gentle arc, all parapodia raised and rigid, slow pulse.
- `Parry`: a sharp bristle flare along the whole body with a quick twist.
- `Dodge`: an S-wave travelling head to tail that displaces the body left.
- `Eat`: front segments arching down and rasping in short rhythmic strokes,
  proboscis extended.
- `Stagger`: the wave breaks up into out-of-phase wobbling, parapodia limp.
- `Ability` (Bristle flare, **held loop, 1.0 s / 30 f**): every parapodium
  splayed fully outward and vibrating at high frequency, body held straight
  and rigid. Must loop cleanly; it plays for 3 s.

### Hallucigenia — fortress (crawler)

Character: a slow, spiny fortress. Legs (`leg_*`) plant and hold; the front
tentacles (`tentacle_*`) probe and jab; the spines are mesh so the body arch
has to sell the threat.

- `Bite`: the front tentacles jab forward and up together, body dips.
- `Heavy`: body arches high (spines forward) over 12 frames, then whips the
  arch down and back over its own back in a sweep; legs brace wide.
- `Guard`: body hunched low, legs spread and planted, tentacles tucked,
  slow breathing.
- `Parry`: a sharp arch-and-snap of the spine with a body twist.
- `Dodge`: a quick sideways scuttle motion of the legs with the body leaning
  left (the engine moves it).
- `Eat`: head down, tentacles pulling food in alternately, body rocking.
- `Stagger`: legs buckle on one side, body tilts, tentacles limp, slow
  righting.
- `Ability` (Anchor, **held loop, 1.0 s / 30 f**): legs dug in and splayed
  wide, body pressed low and arched, tentacles retracted, spines presented
  forward; minimal motion, a slow tense pulse. Plays for 4 s.

### Wiwaxia — tank (crawler)

Character: a walking wall. With only nine body bones, motion is squash,
tilt, and heave of the whole armoured body. Keep it heavy: nothing moves
fast except the shove.

- `Bite`: a short sideways head-jerk (front three bones) as a blade nudge.
- `Heavy`: the body rears up slowly over 12 frames (front rising, rear
  compressing), then slams forward and down with the front dipping below
  neutral, then a slow lumbering recovery.
- `Guard`: body pressed flat and slightly widened (tilt bones outward),
  slow breathing.
- `Parry`: a quick body clank: sharp compression and release with a twist.
- `Dodge`: a heavy lurch to the left with a slow return.
- `Eat`: front of the body lowered, rhythmic rasping heave (grazing).
- `Stagger`: rocks back onto its rear, wobbles, slowly settles.
- `Ability` (Shell up, **held loop, 1.0 s / 30 f**): body hunched into the
  tightest dome the mesh allows, tiny tense pulse. Plays for 3 s; the engine
  adds the ending burst.

### Marrella — scout (crawler)

Character: fidgety, fast, lightweight. The two long head paddles
(`paddle_1`, `paddle_-1`) and antennae read every move; the 26 leg pairs are
a constant blur.

- `Bite`: a quick sweep of both paddles forward and inward.
- `Heavy`: the body drops low and coils back (12 f), then three rapid
  forward surges of the legs with the paddles thrusting each time (the
  engine dashes three times; make the clip three pulses).
- `Guard`: body low, paddles crossed forward, legs still.
- `Parry`: a paddle swipe with a body twist.
- `Dodge`: an explosive sideways scuttle, legs on one side fully extended,
  body tilted left.
- `Eat`: head down, paddles raking food toward the mouth, antennae twitching.
- `Stagger`: paddles and antennae flop, legs stutter out of rhythm.
- `Ability` (Burrow, **held loop, 1.0 s / 30 f**): body pressed flat, legs
  in a slow digging rhythm, paddles laid back along the body, antennae just
  barely peeking. The engine sinks the model into the sediment; the loop
  should read as "settled in and hiding". Plays up to 8 s.

### Olenoides — bruiser (crawler)

Character: armoured momentum. The cephalon (`body_00`) leads every hit; the
legs (`leg_*`) drive; the cerci and antennae are the follow-through.

- `Bite`: a short forward head-butt with the cephalon, legs bracing.
- `Heavy`: the body lowers and the legs coil (12 f), then a full-body ramming
  thrust with the cephalon tilted down and forward, legs driving in unison;
  recovery is a skid with the antennae trailing.
- `Guard`: body pressed flat, cephalon tilted down as a shield, legs braced
  wide, slow pulse.
- `Parry`: a sharp cephalon clank upward with a twist.
- `Dodge`: a quick sideways leg scramble with a body tilt left.
- `Eat`: head down, front legs working food toward the mouth, cephalon
  bobbing.
- `Stagger`: knocked partway onto its side, legs kicking, slowly rolling back
  onto its feet.
- `Ability` (Enroll, **held loop, 1.0 s / 30 f**): the whole body curls into a
  ball (each `body_NN` pitching forward until the pygidium meets the
  cephalon, as far as the mesh allows without intersecting), legs tucked in,
  antennae and cerci wrapped. The loop is a slow rotation-free breathing so
  the engine can spin it. Plays up to 5 s. This is the hero clip of the set.

## Priority

If time is limited, deliver in this order across all eight creatures:

1. `Heavy` and `Bite` (combat readability depends on the wind-up),
2. `Ability` (creature identity),
3. `Dodge`, `Guard`, `Parry`,
4. `Eat`, `Stagger`,
5. `Grab` (Anomalocaris only), `Moult`.

## Checking the result

- Run `node tools/glb-info.mjs public/assets/creatures/<id>.glb`: every new
  clip should appear in the `clips=` line with the expected duration and the
  same channel count as the existing clips.
- Run the game (`npm run dev`), pick the creature in Reef mode, and try each
  input; the engine now prefers these clip names automatically.
- If a clip is missing, the game silently falls back to the old stand-in, so
  a wrong name looks like "nothing changed". Check the name first.
