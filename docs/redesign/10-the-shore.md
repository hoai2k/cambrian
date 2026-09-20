# 10 · The shore

*Built. `src/sim/beach.ts` is the rule, `npm run beach` is the guard.*

The beach was always there: the seabed climbs to a unit above the waterline over the last 48
units of `shoreDistance`, and inland of the waterline it is a flat plateau of sand. What kept
every animal off it was a wall in `resolveStatic` at `SHORE_WALL` plus three body radii, which
held a swimmer where the water was still deep enough to swim. This document is what changed:
a body can now end up on the sand, and what the sand does to it depends on what it breathes.

## Getting there

There are two ways onto the shore and they are deliberately not equal.

**A leap.** A breach is a jump, and a jump is not held by water. A body that leaves the surface
near the beach with its horizontal pointed at the shore comes down wherever the arc puts it, and
if that is on the sand it lands there — the `beach` event, the sand thrown up, the body at rest
with its back in the air. This is *possible* and not encouraged: the launch has to be near the
wall, aimed up and at the shore, and hard. A leap that comes down short, in water too shallow to
swim in, lands in the shallows and the water takes the body back. Every era can do it now: the
Cambrian never breached because it has no rules object, and it does now, on the Devonian's own
terms (a free-swimming body, not a shell, not a drifter or a bell, not hidden), because the shore
is somewhere a leap can land in every sea and nothing else in that sea can reach it.

**A walk.** An animal with legs *and* lungs (`amphibious` on its card) does not meet the wall at
all. It swims into the shallows, its speed comes down over the wade, and it is walking up the
sand before anything has switched — the swim and the walk are one ramp (`landSpeed`), and the
renderer picks the walking clip over the swim at the same point the rule calls the body ashore.
Going back is the same ramp run the other way: the body slides in and is swimming. The seven
that do it are Tiktaalik and Acanthostega in the Devonian and Nothosaurus, Placodus,
Aphaneramma, Henodus, Cartorhynchus and Odontochelys in the Triassic. Placodus, Aphaneramma,
Henodus and Odontochelys carry an authored `Crawl`, which is what they walk with; the others
walk on a slowed swim stroke until a clip lands.

Nothing gets there by swimming. The old wall still stands for a swimmer, and beside it a second
wall measured in the body's own draught (`WALL_WADE`): past 30 % of its swimming depth gone the
water eases a swimmer back out to sea at a bounded pace, whatever the fixed wall's distance means
on this era's beach. The two are needed together because the beach is a different slope in each
era — on the Triassic's the fixed wall stands on dry sand for a hatchling — and a swimmer that
could wade up the beach would strand itself by swimming, which is the one way onto the sand this
must never be. A swimmer becomes `ashore` on exactly one frame: the one its leap comes down on.

## Being there

Two numbers on the actor say where a body is in all this. `wade` is 0..1, how much of the depth
it needs to swim the water under it is short by — continuous in position, which is what lets the
walk hand over without a seam and lets the camera come up out of the water as the animal does.
`ashore` is the rule, past `ASHORE_WADE` (half its draught gone).

- **A water-breather is stranded.** It has `STRAND_BREATH` (a minute), and one way of moving: the
  flop. The stick or the dash asks for one and the body throws itself down the beach at the sea —
  a hop of about a third of its length, a twist of the body and the nose coming up, and stillness
  between. Nothing steers it: every flop goes seaward, whatever the stick says. The HUD shows the
  minute as the thin gauge under the stamina bar, and shows it *only here* — under water a gill
  has nothing to count. Do nothing and the minute ends the animal.
- **An air-breather walks.** No clock. It goes where it likes along the shore at a walk
  (`LAND_WALK` of its cruise for a body without legs, `LAND_WALK_LEGS` for one with them) and
  turns to face where it is going however slowly it is going, since a walk is under the speed at
  which a swimmer's heading follows its travel. It cannot go far inland: `LAND_REACH` (36 units)
  is the same wall facing the other way. A Triassic lung fills on the sand as it does at the
  surface, because the sand *is* the surface for that purpose — `brokeSurface` was already true
  for a body with its back out of the water.
- **Everything is pinned to the sand.** Rise and sink do nothing, the current is not there, a
  dash is not there (a stranded body's dash is its flop; a walker has no water to dash through),
  and the body lies along the slope as a crawler does.
- **The AI has one idea:** the sea. Nothing with a brain plans to be here, so a bot or an ambient
  animal ashore is given the seaward stick (`ashoreInput`) and flops or walks back in.

Every rule is in `src/sim` and deterministic: no clock but `dt`, no randomness. A replay lands
in the same place.

## The eras

The shore is every era's, so the rule is shared and the era hooks are untouched. What differs is
who can be there and what the beach holds.

- **Cambrian.** No lungs on the roster: anything that lands is stranded and flops. The beach is
  bare sand.
- **Devonian.** Tiktaalik and Acanthostega walk; Rhinodipterus, the lungfish, lands and walks back
  legless and slow. The era's old `beached` state — the limbed animals' push past the fixed wall
  into the shallows, where nothing with gills can follow — is unchanged and now also true of a
  body that is `ashore`. The beach is bare sand.
- **Triassic.** Six walkers and nine other air-breathers. The beach is bare *for now*: the shore
  animals (`docs/triassic/06-shore-visitors.md`) are designed and switched off, and when they are
  switched on the beach becomes the dangerous place the design wants — a body walking up it is
  walking into their reach. Nothing here needs changing for that: they are pinned and brainless
  and the strike already targets bodies in the water in front of them.

The land is a wasteland in every era by construction — `generateChunk` places no flora inland of
`SHORE_WALL` and no boulders either — so what is on the beach is sand and whatever the sea threw
onto it.

## What is drawn

- The camera lifts with the wade: its ceiling, pinned under the waterline at all times, rises by
  the body's wade, so the view comes up as the animal does rather than cutting to the sky when a
  rule says it is ashore. Above the waterline the renderer already knows the air (it did for a
  breach).
- The clip: a walker plays `Walk` or `Crawl` where the model has one; a legless air-breather
  swims slowly through the air, which is what a paddle-limbed body dragging itself down a beach
  looks like; a stranded water-breather throws its `Sprint` or `Swim` stroke at the sand on each
  flop and lies still between. The twist and the hop are the simulation's own (`bank`, `pitch`
  and `pos.y` through the flop), so no new clip is needed for the flop to read. The spine
  undulation is off on land.
- The HUD: the strand gauge (a water-breather's minute, only while ashore) and a status line
  under the ring for every era — *OUT OF THE WATER · flop back to the sea* or *ON THE SHORE · the
  sea is behind you* — plus the era hint.

## Not done, and where it would go

- **A `Flop` clip** would be better than the swim stroke thrown at the sand. The hop and the
  twist are in the sim, so a clip that is only the body's own writhe would layer on them; it goes
  through each era's builder (`tools/<era>/creatures/<id>/`), never into a shipped GLB, and the
  renderer would pick it over `Sprint` in `src/render/creature.ts`.
- **A `Walk` clip** for Tiktaalik, Acanthostega, Nothosaurus and Cartorhynchus, which walk on a
  slowed swim today. The four with `Crawl` are fine.
- **A landing sound** for the Cambrian and the Triassic: the `beach` event plays `devonian/beach`
  and the other two eras have no sample under that name yet (see `docs/audio-requests.md`).
- **Shore animals** on the Triassic beach, per their own document.
