# The shore comes and goes — Tanystropheus fishing, and the runners

*Design and implementation plan. Triassic only. Nothing here is built yet; this is the brief the
build will work from, written against what `src/sim/triassic/shore.ts` already does so the work
is a delta and not a rewrite.*

## What is asked for

1. **Tanystropheus sometimes stands at the shore** with its neck curved down over the water,
   looking in. If a small enough animal **stays still too long** beneath it, the head reaches in
   and eats it.
2. **Other shore animals wait a little way back** from the water. Now and then one comes down to
   the edge and looks in. If an animal stays still too long, it **runs into the water, tries to
   bite or eat it, and runs back onto the land** — whether it got anything or not.
3. **The shore animals come and go** over time. A bank that had one may be empty later, and an
   empty bank may gain one.

## What already exists, and what does not

`shore.ts` already has most of the skeleton, and the four bodies already carry more clips than
the mechanic uses. The honest gap is three behaviours, not a system.

| | today | wanted |
| --- | --- | --- |
| Where a shore animal is | pinned at one **post** per 170 units, chosen once from the seed, for the whole match | the same posts, but **occupied in windows** — arrivals and departures |
| What sets it off | any live player or bot in the top four units within reach, **moving or not**, **any size** | an animal that has been **still** within reach for long enough, and for the boom, **small enough** |
| What it does | telegraph 1.5 s → one strike from the bank (heavy + shove, a second bite for a snack) → 6 s rest | the boom: the same, gated on stillness and size. The runners: **an excursion** — down to the edge, look, dash into the shallows, bite, retreat |
| Macrocnemus | present on the bank and **never strikes** (`reachOf` returns 0) | the runner: the excursion is its whole job |
| Coelophysis | strikes from the bank like the boom, reach 0.6 L | a runner too, with a longer dash than Macrocnemus |
| Mystriosuchus | strikes from the bank, reach 1.5 L | unchanged in shape; gains comings-and-goings only (it is a lurker, not a runner) |
| Clips used | Lower, SnapLeft/Right, Retract, Severed | + Run, Charge, Snatch, Retreat — **already in the files** for both runners (`validation.json`), unused |

So: the art for the excursion has been built ahead of the mechanic. The neck-boom needs no new
clip. What is new in code is a stillness detector, an occupancy schedule, and a five-phase
excursion state machine for the runners.

## Design

### The stillness trigger

*"Stays still too long"* is the whole difference between a shore that is a wall and a shore
that is a trap. Today a swimmer *passing* the bank is struck; that reads as a fence. Wanted is a
shore that only takes what lingers — which is also what a real ambush predator does, and it turns
stillness near the shore into a decision rather than an accident.

**Definition.** An animal is *still* at a post when, for `STILL_TIME` consecutive seconds, it is
within the post's reach, in the top `SURFACE_BAND` units, and its horizontal speed is under
`STILL_SPEED × cruise`, where cruise is `def.speed × speedFactor(scale)` — so a hatchling drifting
and an adult hovering are judged against their own pace. Leaving reach, diving under the band, or
moving faster than that resets the clock to zero. There is no partial credit for slowness.

- `STILL_TIME`: **3.0 s** for the boom, **2.2 s** for a runner. The boom is a lurker and can
  afford to be sure; a runner is opportunistic. Both are longer than the old 1.5 s telegraph
  because the telegraph is now *on top of* the wait (see the phases below), and a player must be
  able to notice they have stopped and move before anything is committed.
- `STILL_SPEED`: **0.15**. Camouflage, guarding, aiming, and the natural drift of a body that
  has let go of the stick all fall under it. That is deliberate and worth saying out loud in the
  design: *hiding near the shore is now the wrong place to hide*. The one ability that rewards
  stillness becomes the one that draws the shore, which is a real trade-off rather than a free
  bonus. `sink: true` animals (Placodus, Henodus) settle when they stop and will trip this on the
  floor only if the floor is inside the surface band — which at the beach it is, so the shell
  animals are exactly the ones a runner catches. Good: they are also the armoured ones.
- **Bots count**, as they do now. A shore that only bites players is a tell.

The detector is per `(post, actor)`: a small map on the post of `actorId → stillT`, pruned each
step to actors currently inside reach. It is the only new per-step cost and is bounded by
`g.nearby(post.pos, reach + 4)`, which the step already calls.

### Size gates

*"Small enough creatures"* — for the boom, the victim must be **snack** or **prey** band relative
to the Tanystropheus (`bandOf(shore, target)`). A snack is **one gulp**: the snap lands on it,
`startSwallow` carries it in the jaws and it is eaten as the neck comes back up, with no escape
window — small enough to be swallowed is small enough to be swallowed, and the two seconds of
`Drag` the design doc once described are now the swallow itself. A player taken this way keeps
their camera: it follows the **boom's head** through the swallow (the same `rideBlend` framing a
ride uses, aimed at the shore animal's mouth anchor rather than its centre), so the last thing
they see is the water dropping away under them and then the beach, and the death is understood
rather than a cut to black. Prey is bitten and released with the shove. Anything larger is **ignored** — the neck
does not lower at all — because a boom that reaches for something that bites it back is how the
neck gets severed, and the animal should not volunteer for it. This is a change: today it strikes
anything.

For the runners the gate is looser: a runner will go for **snack, prey or rival**, because a
running bite-and-retreat is a hit-and-run and not a commitment. It never enters the water for
something in the *giant* band. Macrocnemus (3.77 L) will therefore only ever go for hatchlings
and small juveniles; Coelophysis (7.32 L) for most of the young roster. That is the right
spread: the little runner is a hatchery hazard, the dinosaur a shelf one.

### The boom — Tanystropheus fishing

The existing cycle, re-triggered and re-gated:

```
watch ──(still ≥ 3.0 s, small enough)──▶ lower ──(1.5 s telegraph)──▶ strike ──▶ rest ──(6 s)──▶ watch
   ▲                                      │ target moves or leaves reach
   └──────────────────────────────────────┘
```

- **watch** is now the "neck curved down over the water, looking in" pose the request describes.
  Today the watch phase plays no clip and the body idles. It should play a new **`Fish`** clip: a
  slow loop, neck out and down over the water, head just above the surface, the smallest of
  sways so it reads as alive. This is the one **new clip** the plan needs (see *Animations*).
- **lower** is the telegraph exactly as built: 1.5 s, the head drops a hand's breadth, the neck
  stiffens, the HUD warns. Unchanged. During it the target's stillness is *not* re-checked — it
  was still long enough to be chosen; a player who bolts on the warning escapes because `lower`
  already returns to `watch` when the target leaves reach.
- **strike / rest** unchanged, except that a snack is now *held and dragged* (the `Drag` clip is
  in the file and unused) rather than bitten twice.
- The **sever** is unchanged and is still the reason a big animal can clear a bank.

### The runners — Macrocnemus and Coelophysis

A new five-phase excursion, on the same `Post` record with a new set of phase names so the boom's
switch and the runners' switch stay separate and readable:

```
inland ──(schedule)──▶ approach ──(reach edge)──▶ peer ──(still ≥ 2.2 s, band ok)──▶ charge ──▶ snatch ──▶ retreat ──▶ inland
                                                    │ nothing after PEER_MAX (8–14 s)                 (hit or miss)
                                                    └──────────────────────────────────────────────▶ retreat
```

- **inland.** The runner is **not in the world**: the phase is a timer on the post, no actor. All
  of the play area is under water and a waiting runner fourteen units up the beach is behind the
  sand's own slope from every submerged sightline, so a body there would be simulated, streamed
  and drawn for nobody. (A player mid-breach looking shoreward for half a second is the one case
  this cheats, and it cheats it in the player's favour.) A runner is therefore seen exactly when it
  is a threat — at the edge, in the water, or carrying you — and the first excursion at a bank is
  a surprise, which is wanted.
- **approach.** The actor is spawned at `INLAND_OFF` and **runs** down to the water's edge on
  `Run` at its run pace: there is no walk clip and none is wanted, a runner runs everywhere it
  goes. Duration is distance over a fixed ground speed, so it is deterministic. Ends at the post
  position.
- **peer.** Head over the water, watching: the runner's version of the boom's `Fish`. It plays
  `Lower` (which both runners have) and holds the last frame. Stillness is measured here. If
  nothing is still within `PEER_MAX` seconds it gives up and retreats — so a runner at the edge
  is a *window*, not a permanent post, which is the second half of "come and go".
- **charge.** The dash into the water. The runner moves along a straight line from the post
  toward the victim's position **at the moment of commit**, not tracking — a runner that
  homed would be unescapable, and a straight dash is what a lizard does. It runs `CHARGE_REACH`
  units at most: **3 L** for Macrocnemus, **2 L** for Coelophysis (the dinosaur is heavier and
  goes less far in). It is in the water, so it may be attacked; it has no breathing and no air,
  so the dash is time-boxed (`CHARGE_TIME` 0.7 s) and it never goes deeper than
  `SURFACE_Y - 1.5`. Plays `Charge`.
- **snatch.** One frame of resolution at the end of the charge: if the victim is within
  `bodyRadius(runner) + bodyRadius(victim) + 0.6` of the runner's head, `applyHit` with the
  runner's heavy; a snack-band victim is `takeHold` and **carried in the mouth back onto land**.
  The ordinary grip rules run during the carry — a dash-out inside `GRIP_STRIKE` tears free and
  leaves the runner retreating empty-mouthed — but a victim still in the jaws when the runner
  reaches its inland spot is eaten there. A miss is simply a miss. Plays `Snatch` (Macrocnemus) or `SnapLeft/Right` (Coelophysis, which
  has no Snatch).
- **retreat.** Back along the same line to the post, then up to the inland spot, on `Retreat`
  then `Run`. If it is carrying, the victim rides the mouth anchor as any held animal does, and a
  carried *player's* camera goes with it — framed on the runner's head, as with the boom — up the
  sand and out of the water, which is the one time a player sees the beach. At the inland spot it
  eats what it caught (`Eat` clip, the victim consumed, the camera released to the respawn) and
  then the body leaves the world (below). Cooldown `RUNNER_REST` (20–40 s, hashed) before the
  next approach.

A runner's body exists from `approach` to the end of `retreat` and not otherwise, and is
**never in the water for more than ~1.5 s** end to end. It cannot be lured out into
depth and cannot drown, because it is scripted rather than steered — the same reason the shore
animals are brainless today. That is a constraint to keep: the moment a runner gets a brain, it
gets stuck on a rock.

**Being bitten during the excursion.** A runner in the water is an ordinary target for a player
that is big enough. Damage lands (it has hp), and if it dies in the water it dies there, a corpse
that drifts — carrion, as the severed boom is. It cannot die inland, because it is only a body on
the way to or from the water; a corpse on the sand would be one more thing drawn where nobody
looks. Neither case has a special clip; `Death` is in every file.

### Mystriosuchus — the lurker, unchanged in shape

The phytosaur keeps its strike-from-the-bank, because that is what the animal is (a lurker at the
surface with only its crest showing), and its 1.5 L lunge already *is* a short excursion. It
gains the stillness gate — it should not be lunging at everything that surfaces to breathe, only
at what lingers there — and the occupancy schedule. Its `Breathe` clip is the one to use for
`watch` (the crest breaking the surface), which the file has and the mechanic does not use.

### Comings and goings

Today `kindAt(k, seed)` decides once per post, forever. Replace with a schedule that is a pure
function of the post, the seed and **time**, so a replay is exact:

```
occupied(k, seed, t):  window = floor(t / OCCUPANCY_WINDOW)
                       r = hash(k, seed, 100 + window)
                       r < PRESENCE_P[kindAt(k, seed)]  →  present for this window
```

- `OCCUPANCY_WINDOW` **150 s**, with the post's own phase offset `hash(k, seed, 3) × 150` so
  every bank does not change over on the same beat.
- `PRESENCE_P`: boom 0.7, phytosaur 0.6, runners 0.5. An empty bank is now the ordinary state a
  third of the time rather than a 22 % roll at spawn.
- **Arrival**: the boom and the phytosaur spawn at `INLAND_OFF` (14 units up the beach — past the
  ramp, below a submerged player's sightline in almost every case), walk down on `Crawl` to the
  post and take up `Fish`/`Breathe`. A runner's window simply starts its `inland` timer: its body
  is spawned per excursion, not per window.
- **Departure**: at the end of a window in which the next window is not occupied, the animal
  finishes whatever phase it is in (never mid-strike), walks back up the beach and is removed
  at `INLAND_OFF`; a runner's window simply does not start another excursion. A carcass (severed
  boom, runner killed in the water) does not depart; it lasts as long as a corpse does and the
  post is empty until then.
- A post that has been **cleared** by a sever stays clear for the match, as now. That is the
  reward for the sever and the schedule must not undo it.

The one subtlety: arrivals and departures must not *teleport*. `tools/motion-test.ts` guards that
anything moving more than it could swim in a step reads as a jump; a walking shore animal moves at
a walking pace along a line and must clear that check like any other body.

## Animations

Everything a shore body needs is listed against what its file carries today.

| Clip | Tanystropheus | Mystriosuchus | Macrocnemus | Coelophysis | Purpose |
| --- | --- | --- | --- | --- | --- |
| `Fish` | **new** | — | — | — | the watch: neck curved down over the water, head just above it, a slow sway. ~4 s loop. |
| `Breathe` | — | have | — | — | the watch: crest at the surface. |
| `Lower` | have | have | — | have | telegraph (boom, phytosaur) / peer (runners). Macrocnemus lacks it — use `Idle` with the head pitched by the renderer, or **author `Peer`**. |
| `SnapLeft/Right` | have | have | — | have | the strike / snatch. |
| `Snatch` | — | — | have | — | Macrocnemus' snatch. |
| `Drag` | have | — | — | — | the swallow: the neck coming up with the snack in the jaws, over `SWALLOW_TIME`. Runners carry on `Retreat`. |
| `Retract` | have | have | — | have | recovery after a strike. |
| `Run` | — | — | have | have | approach and the run back inland — a runner only ever runs; no `Walk` is authored. |
| `Charge` | — | — | have | have | the dash into the water. |
| `Retreat` | — | — | have | have | back out of the water. |
| `Crawl` | have | have | have | have | arrivals and departures for the boom and the phytosaur (a walk; they do not run). |
| `Eat` | have | have | have | have | a runner eating its catch inland. |
| `Severed` | have | — | — | — | unchanged. |
| `Death` | have | have | have | have | a runner killed in the water or on the sand. |

So the authoring list is short: **`Fish` for Tanystropheus** (essential — it is the picture the
request opens with), and **`Peer` for Macrocnemus** (or accept `Idle` + a renderer head pitch as
a first pass). Both go through the builder, never as runtime pose patches (see the Nothosaurus
`steadyHead` note in CLAUDE.md), and both are one new clip appended to the file, never a
replacement.

Clip timing must equal phase timing, as it does today: `Lower` is exactly `TELEGRAPH`, `Charge`
exactly `CHARGE_TIME`, and so on, so the performance and the mechanic are one clock. `shoreClip`
is where the two meet and stays the only place the renderer asks.

**The neck curve.** Tanystropheus' neck was a stiff beam swung from its base with little
up-and-down (research, S02 in the design doc). "Curved down looking in" therefore means the whole
neck pitched down from the shoulders a little and the head angled at the water, not a swan's
S-bend — the `Fish` loop should respect that, and it is the same constraint the existing `Lower`
already obeys.

## What the player sees

- **HUD.** `shoreWarn` already drives *SOMETHING ON THE SHORE · it is reaching for you* during the
  telegraph. Add a softer, earlier line while the stillness clock is running past half —
  *SOMETHING ON THE SHORE · it is watching you* — so the first thing a player learns is that
  stopping here is noticed, before it is punished. Both survive sense-off (they are the player's
  own situation). The runners' peer phase raises the same flag.
- **Camera.** Being taken is *seen*: a swallowed or carried player's camera frames the shore
  animal's head (`rideBlend` onto the host, look point at its mouth anchor) until the eat resolves,
  then eases to the respawn. This is the one place a Triassic camera goes up the beach, and it
  goes there attached to something.
- **Radar.** The design doc's hatched reach arc for an occupied post; nothing for an empty one, so
  the radar is also how you learn a bank has emptied.
- **Recorder.** `?debug=game` samples should carry the nearest post's phase and this player's
  stillness clock, so "why did that lizard get me" is answerable from the numbers.

## Implementation plan

In order, each step leaving `npm run triassic` green.

1. **Stillness detector.** `Post.still: Map<number, number>`; `stillest(g, post, a)` returns the
   actor that has been still longest past the threshold and inside the band gate, or undefined.
   Replace `reachable()` in the boom's `watch` with it. Tests: a swimmer passing the post at
   cruise is never struck; one that stops for 3 s is; one that stops for 2.5 s and moves is not;
   a giant that stops is ignored by the boom; a bot counts.
2. **Boom size gate and the gulp.** `bandOf` gate in `watch`; snack → `startSwallow` + `Drag`
   clip in `strike`/`rest`, no escape; prey → heavy + shove; else ignore. Tests: each band's
   outcome; a snack is dead at the end of the swallow whatever it pressed; the sever still clears
   the bank.
3. **Occupancy schedule.** `occupied(k, seed, t)` with the phase offset; arrival and departure
   phases (`arrive`, `leave`) with pinned straight-line motion at walk pace; despawn at
   `INLAND_OFF`. Tests: the same seed gives the same occupancy at the same time; a post empties
   and refills within one window's worth of time; a cleared post never refills; no step moves a
   shore animal further than a walk (`motion-test`'s jump rule); nothing departs mid-strike.
4. **Runner excursion.** The five phases on Macrocnemus and Coelophysis, the body spawned on
   `approach` and removed at the end of `retreat`; `reachOf` gives Macrocnemus a real reach;
   `CHARGE_REACH` per kind; the straight-line dash committed at trigger time; snatch resolution;
   carry-back and the inland eat. Tests: a still hatchling at the edge is charged and bitten; one
   that moves after the commit is missed and the runner still retreats; the runner never goes
   below `SURFACE_Y - 1.5` or beyond `CHARGE_REACH`; a runner bitten in the water dies there as a
   corpse; the excursion is never longer than 1.5 s in the water; a giant is never charged; a
   carried snack that does not tear free is dead when the runner reaches `INLAND_OFF`; no runner
   actor exists while its post is in `inland`.
5. **Mystriosuchus.** Stillness gate on the lunge; `Breathe` for watch.
6. **`Fish` clip** for Tanystropheus through its builder; `Peer` for Macrocnemus (or the
   `Idle` + head-pitch first pass, decided when step 4 is playable and can be looked at).
7. **HUD, radar and camera.** The "watching you" line; the arc only for occupied posts; recorder
   fields; the taken player's camera on the shore animal's head (`rideBlend` with the look point
   on the mouth anchor), checked in `npm run swim` beside the ride framing.
8. **Docs.** Fold the outcome into `01-triassic-design.md`'s shore section (which still describes
   the phytosaur's `Float`/`Lunge`/`Bask` clips that were never built — update to what exists) and
   add the CLAUDE.md note.

Steps 1–3 are pure `src/sim` and can be finished and merged before any art. Step 4 is playable
on the existing `Run`/`Charge`/`Snatch`/`Retreat` clips. Only step 6 waits on Blender.

## Constants to start from

| | value | why |
| --- | --- | --- |
| `STILL_TIME` boom / runner | 3.0 s / 2.2 s | long enough to notice you have stopped; the telegraph is on top |
| `STILL_SPEED` | 0.15 × cruise | camouflage, guard, aim and drift all fall under it — on purpose |
| `TELEGRAPH` | 1.5 s | unchanged |
| `PEER_MAX` | 8–14 s, hashed | a runner at the edge is a window, not a post |
| `CHARGE_REACH` Macrocnemus / Coelophysis | 3 L / 2 L | the little one goes further for less |
| `CHARGE_TIME` | 0.7 s | never more than ~1.5 s in the water round trip |
| `RUNNER_REST` | 20–40 s, hashed | |
| `INLAND_OFF` | 14 units up the beach | where a body appears for its approach and vanishes after its retreat: below every submerged sightline |
| `SWALLOW_TIME` | ≈ `Drag`'s length | the boom's gulp, one clock with the clip |
| `OCCUPANCY_WINDOW` | 150 s, per-post phase offset | banks do not all change on one beat |
| `PRESENCE_P` boom / lurker / runners | 0.7 / 0.6 / 0.5 | an empty bank is ordinary |

All of them tunable; the tests should assert the *relations* (a passer is never struck, a runner
never exceeds its reach) and not the numbers, so tuning does not churn the suite.

## Things this deliberately does not do

- **No brain.** Shore animals stay scripted. The moment one is steered it is a body that can get
  stuck on a rock, drown, or wander into the deep, and the whole point of the shore is that it is
  a fixed hazard the player can learn.
- **No pursuit.** A runner's dash is a committed straight line; the boom cannot turn its neck to
  follow. Both are escapable by moving, which is the design: *stillness* is the crime.
- **No mid-strike departure.** The schedule waits for the cycle.
- **No playable shore animal.** Unchanged; `shoreReach` stays unused in the Triassic.
- **No change to the other eras.** Everything above is behind `TRIASSIC_RULES` and `shore.ts`.

## Decisions taken

The four questions the first draft left open, answered:

1. **What the boom eats whole.** Anything small enough — the snack band — is one gulp, no escape
   window, and the taken player's camera follows the boom's head through it. Prey is bitten and
   shoved; larger is left alone.
2. **What a runner does with a catch.** Carries it in its mouth onto land and eats it there, the
   player's camera going with it. The standard grip escape during the carry stays; reaching the
   inland spot still in the jaws is the death.
3. **No `Walk` clip.** A runner only ever runs. `Run` carries the approach, the return and both
   ends of an excursion, and nothing is scrubbed.
4. **An inland runner is not drawn, because it is not there.** The waiting phase is a timer on the
   post with no body behind it; the actor exists from the top of the ramp to the top of the ramp.
   Everything a player can be is under water, so the only time one could be seen inland is a
   breach aimed at the beach, and that case is accepted rather than paid for on every frame at
   every bank.
