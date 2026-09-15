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
to the Tanystropheus (`bandOf(shore, target)`). A snack is taken whole (`takeHold`/`startSwallow`
as the design doc always intended: dragged up the beach, death unless a dash-out inside two
seconds); prey is bitten and released with the shove. Anything larger is **ignored** — the neck
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

- **inland.** The runner stands at a *waiting spot* `INLAND_OFF` (≈ 14 units) up the beach from
  its post, idle, out of the water's reach and mostly out of a submerged player's sight. It is
  present in the world (rendered, pinned) so a player who surfaces sees something on the sand.
- **approach.** It walks down to the water's edge on the `Run` clip at a walk rate (the clip
  scrubbed slower, or a `Walk` clip if one is ever added). Duration is distance over a fixed
  ground speed, so it is deterministic. Ends at the post position.
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
  runner's heavy; a snack-band victim is `takeHold` and carried back (the runner's retreat then
  becomes a drag, and the victim's own dash-out rule applies exactly as it does against the boom).
  A miss is simply a miss. Plays `Snatch` (Macrocnemus) or `SnapLeft/Right` (Coelophysis, which
  has no Snatch).
- **retreat.** Back along the same line to the post, then up to the inland spot, on `Retreat`
  then `Run`. If it is carrying, the victim rides the mouth anchor as any held animal does. At
  the inland spot it eats what it caught (`Eat` clip, the victim consumed) or simply idles.
  Cooldown `RUNNER_REST` (20–40 s, hashed) before the next approach.

A runner is **never in the water for more than ~1.5 s** end to end. It cannot be lured out into
depth and cannot drown, because it is scripted rather than steered — the same reason the shore
animals are brainless today. That is a constraint to keep: the moment a runner gets a brain, it
gets stuck on a rock.

**Being bitten during the excursion.** A runner in the water is an ordinary target for a player
that is big enough. Damage lands (it has hp), and if it dies in the water it dies there, a corpse
that drifts — carrion, as the severed boom is. If it dies inland it is a corpse on the sand until
the next occupancy window replaces it. Neither has a special clip; `Death` is in every file.

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
- **Arrival**: the animal spawns at the inland spot (14 units up the beach — past the ramp, below
  a submerged player's sightline in almost every case) and walks down on `Run`/`Crawl`. The boom
  and the phytosaur walk to the post and take up `Fish`/`Breathe`; a runner goes to its inland
  spot and waits.
- **Departure**: at the end of a window in which the next window is not occupied, the animal
  finishes whatever phase it is in (never mid-strike), walks back up the beach and is removed
  once it is `DESPAWN_OFF` (≈ 24 units) up. A carcass (severed boom, killed runner) does not
  depart; it lasts as long as a corpse does and the post is empty until then.
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
| `Drag` | have | — | — | — | carrying a snack up the beach. Runners carry on `Retreat`. |
| `Retract` | have | have | — | have | recovery after a strike. |
| `Run` | — | — | have | have | approach and the walk back inland; also arrivals and departures for the runners. |
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
2. **Boom size gate and the drag.** `bandOf` gate in `watch`; snack → `takeHold` + `Drag` clip in
   `strike`/`rest`; prey → heavy + shove; else ignore. Tests: each band's outcome; the sever still
   clears the bank; a held snack's dash-out still frees it inside two seconds.
3. **Occupancy schedule.** `occupied(k, seed, t)` with the phase offset; arrival and departure
   phases (`arrive`, `leave`) with pinned straight-line motion at walk pace; despawn past
   `DESPAWN_OFF`. Tests: the same seed gives the same occupancy at the same time; a post empties
   and refills within one window's worth of time; a cleared post never refills; no step moves a
   shore animal further than a walk (`motion-test`'s jump rule); nothing departs mid-strike.
4. **Runner excursion.** The five phases on Macrocnemus and Coelophysis; `reachOf` gives
   Macrocnemus a real reach; `CHARGE_REACH` per kind; the straight-line dash committed at trigger
   time; snatch resolution; carry-back. Tests: a still hatchling at the edge is charged and bitten;
   one that moves after the commit is missed and the runner still retreats; the runner never goes
   below `SURFACE_Y - 1.5` or beyond `CHARGE_REACH`; a runner bitten in the water dies there as a
   corpse; the excursion is never longer than 1.5 s in the water; a giant is never charged.
5. **Mystriosuchus.** Stillness gate on the lunge; `Breathe` for watch.
6. **`Fish` clip** for Tanystropheus through its builder; `Peer` for Macrocnemus (or the
   `Idle` + head-pitch first pass, decided when step 4 is playable and can be looked at).
7. **HUD and radar.** The "watching you" line; the arc only for occupied posts; recorder fields.
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
| `INLAND_OFF` / `DESPAWN_OFF` | 14 / 24 units up the beach | below a submerged sightline / out of any |
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

## Open questions for the user

1. Should the boom take **prey**-band animals whole as well, or only snacks? (Plan: snacks whole,
   prey bitten and released — it keeps the sever a live threat, since a prey-band victim is
   exactly the size that can bite the neck.)
2. Does a runner that catches something **eat it inland** (the victim dies) or just carry it up
   and drop it? (Plan: eats it, so a runner is a real predator and not a nuisance.)
3. Is a **`Walk`** clip for the runners worth authoring, or is `Run` scrubbed slow acceptable for
   the approach and the departures? (Plan: scrub first, author if it reads badly.)
4. How visible should an **inland** runner be to a submerged player? At 14 units up the beach it
   is mostly not — which makes the first excursion a surprise. Is that wanted, or should the
   waiting runner be glimpsable so a careful player can see it coming?
