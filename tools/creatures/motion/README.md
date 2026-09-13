# Clip authoring straight into the shipped GLBs

The articulated attack and feeding pass (`docs/attack-feeding-refinement.md`) re-authors a few
clips on rigs whose bodies are finished. This directory does that without Blender and without
the local authoring sources: it reads the shipped `public/assets/creatures/<id>.glb`, samples a
performance written as code against the rig's real bones and sockets, and writes the clips back.

```sh
node tools/creatures/motion/apply.mjs <id>                 # replace the clips in the shipped GLB
node tools/creatures/motion/apply.mjs <id> --out DIR --review   # dry run + uncompressed copy for Blender
node tools/creatures/motion/pose-check.mjs <id> <Clip> [u ...]  # where the sockets are at clip times
<bpy python> tools/creatures/motion/review.py DIR/<id>.review.glb SHEETS Bite Heavy Attack Eat
```

## What `apply.mjs` guarantees

- **A clip the model never had is simply added.** `Grab` and `Dash` (see
  `docs/attack-feeding-refinement.md`) do not exist on most rigs, so there is nothing to keep
  beside them; the game falls back to `Heavy` and `Dodge` until they land, and picks them up the
  moment they do.
- **The old clip stays in the file as `replaced/<Name>`.** The game only ever asks for the
  canonical name, so it plays the new clip; the viewer lists the replaced ones in their own
  *Replaced* section so the two can be compared and the old one restored by renaming.
- **Re-runnable.** A second run keeps the original `replaced/<Name>` and only swaps the new clip,
  so the tool can be replayed on top of whatever else has landed in the GLB since (another
  agent adding `Grab`, an anchor pass). On a merge conflict in the binary, take theirs and re-run.
- **Everything else round-trips exactly.** Nodes, bind poses, skins, meshes, sockets, materials
  and embedded textures are snapshotted before and compared after the lossless meshopt re-encode
  (the same settings as `package-expansion.mjs`); the write is refused if anything but the
  replaced clips differs.
- **Contract checks** from `docs/animation-brief.md`: root never moves, loops close on
  themselves, one-shots start and end at rest, 30 fps linear keys, no animated scale.

Both eras: an id that is not in `public/assets/creatures/` is looked up in
`public/assets/devonian/creatures/`, and `tools/devonian/check.mjs <id>` validates the result
(it checks every clip in the file, the replaced ones included).

LODs are not touched: the distant models only carry Idle/Swim/Crawl/Death, none of which this
pass replaces. `npm run check` may still say the LOD is older than the model; that is the mtime
rule, not a stale LOD.

## Writing a performance

`performances/<id>.mjs` exports `clips`: `{ name, duration, loop, pose(u, P, t) }`. `u` is
normalized clip time, `P` a `Pose` (`rig.mjs`) that takes anatomical operations rather than
Euler angles, so a clip reads as what the limb does:

- `P.bend(bone, direction, angle)` — bend so the bone's tip moves toward a world direction seen
  in the rest pose (`UP`, `DOWN`, `FWD`, `BACK`, `side(s).in/out`). Children follow.
- `P.spin(bone, axis, angle)`, `P.twist(bone, angle)` (about its own axis), `P.shift(bone, v)`.

`lib.mjs` has the envelopes (`ss`, `arc`, `hold`, `lag`, `ring`). `lag(env, u, delay)` is what
makes a whip trail: the finite-difference velocity of the parent's envelope, delayed per segment,
so distal parts move after proximal ones and bend against the direction of motion.

Timing follows the engine, which retimes `Bite` to `windup + active + recovery * .6` and `Heavy`
likewise (`src/render/creature.ts`), so contact belongs around u ≈ .4 for Bite and u ≈ .5 for a
Heavy with a long readable wind-up. `Eat` for a rig in `FEEDING_PERFORMANCE` is scrubbed by
consumption progress (`feedingPhase` in `src/render/anchors.ts`: pickup 0–.22, carry .22–.78,
swallow .78–1), so author reach → grasp → carry → hold at the mouth on that timeline and return
to rest in the last tenth so the same clip also loops in the viewer. The game's grasp solver
closes the last stretch to `anchor_mouth`; `pose-check.mjs` prints how far the authored pose gets.

Review is by contact sheet: `review.py` renders the replaced and new clip from a three-quarter
view above and a view from below and ahead where the mouth is, eight frames each, in Cycles on
the CPU. Look at the whole path, not only the extremes — a fold that ends in the right place can
still pass over the head on the way.

## Bone directions

`P.bend` needs to know which way a bone runs. Cambrian rigs export each bone's local +Y along
the bone, but several Devonian rigs give every bone the same local axis, so `Rig.restDir` takes
the direction from the joint positions instead: toward the child of the same family (or the only
child), away from the parent for a leaf. For a hub bone with unrelated children (a cephalon, a
cephalopod head) that guess is meaningless — pitch those with `P.spin(name, [1, 0, 0], angle)`
(positive is nose down) rather than `bend`.

## Grab

Rigs whose kit has `grasp: true` (`docs/redesign/05-hiding-and-combat.md`) need a `Grab` clip: the
game plays it once as the grip closes and loops it while the animal clings to something bigger.
Author it as a **held loop** that starts in the held pose and breathes, never one that opens.

## Base poses

A performance may export `basePose(P)`: a resting shape the bind pose lacks (Opabinia's trunk
hanging down and curving up). `apply.mjs` then re-poses **every** other clip in the file onto it —
each rotation key of an affected joint is post-multiplied by the base delta, weighted down where
the clip's own pose already departs strongly from bind (`rebase.fade`, radians) so an authored
reach still arrives straight — and keeps each shipped clip as `replaced/<Name>`. Authored clips get
the base underneath them automatically; a clip that says `base: false` handles the shape itself
(Opabinia's attacks apply the curve scaled by `1 - straighten` so the trunk shoots out straight).

## Body motion is never spent to pay for appendage motion

Two rules, learned the hard way after the first pass damped the swimming wave during strikes and
made the attacks read as *less* alive than the clips they replaced:

- **A performance owns only the bones it names.** Export `authored(name)` and `apply.mjs` hands
  every other bone the shipped clip's own motion, composed with whatever the performance still
  does to it. An appendage rework then leaves the body's authored performance — the roll, the
  rear-up, the lunge, the fin waves — exactly intact, and adds to it. Only the bones a
  performance authors are held to the rest pose at the clip's ends, because a carried bone
  reproduces the shipped clip's endpoints, which sit at that rig's neutral idle rather than at
  bind. The root is never carried.
- **A strike adds to the locomotor wave; it never subtracts.** Use `alive(u)` (full amplitude
  across the clip, tapering only into the endpoints) rather than a sine hump, which is smallest
  exactly where an attack needs the body driving hardest. Then raise the stroke with `power` and
  push extra cycles through with `beats`/`ramp` (`beatPhase`), so a train of fins, flaps or legs
  visibly powers up into the contact and rides out the recovery.
