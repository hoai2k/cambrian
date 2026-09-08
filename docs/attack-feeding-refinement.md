# Articulated attacks and feeding — 8 September 2026

User-requested separate animation pass across arthropods, cephalopods and sea stars/brittle
stars, in both eras. This is an active implementation queue, not a completed audit.
`tools/attack-feeding-refinements.json` tracks twenty affected specimens; each gets its own
review and source changes. Existing full reworks retain ownership and integrate this direction
into their new rigs. For pending body redesigns (notably Odaraia and Nahecaris), finish their
anatomical replacement before general/eye audits; avoid editing an obsolete motion rig twice.

## User direction and per-family delivery

- Nautiloids, first Michelinoceras: open/flared crown during anticipation, articulated
  proximal-to-distal lash with delayed tip motion, asymmetric reaching and curling, controlled
  follow-through and recovery. Distinguish Attack, Bite and Heavy by shape, timing and reach;
  do not simply increase whole-arm rotation. During Eat, several arms close around food, retain
  it while other arms adjust, and carry it toward the actual oral opening. Maintain realistic
  segmented curvature; no clipping through shell, face, neighboring arms or carried prey.
- Other cephalopods: adapt to their own anatomy and shell orientation. Manticoceras gets an
  independent interpretation rather than copying a nautiloid waveform. Nectocaris is included
  because the game uses grasping appendages, without asserting it is a cephalopod.
- Sea scorpions (Jaekelopterus): deliberate jointed preparation, directed reach/strike with
  pincers opening/closing at useful times, recoil and limb recovery like an articulated
  arthropod rather than rigid stick rotations. Coordinate separate joints and stabilize the
  rest of the animal. Feeding brings a grasp toward its anatomical mouth; avoid inventing a
  second mouth at the claw tip.
- Sea spiders (Palaeoisopus): articulated proximal/distal leg folding, bracing, reaching and
  recovery suited to the actual appendages; insect/spider attack timing is an animation
  analogy, not permission to add terrestrial spider fangs or anatomy absent from the model.
- Sea stars/brittle stars (Furcaster in the current roster): several arms cup/grasp a target,
  maintain a coherent hold and bring it to the **underside central mouth** while the remaining
  arms stabilize/adjust. Review from below and with an actual game prey, not just a blank
  viewer. Avoid a single arm poking forward or swallowing through the dorsal disc. Exact
  feeding mechanics and soft tissue are interpreted; keep the fossil taxon distinction.
- Other Cambrian/Devonian arthropods and stem arthropods: individually map Attack/Bite/Heavy/Eat
  to real appendage roles, joint chains and mouth placement. Filterers retain their feeding
  apparatus; do not add invented claws or convert filtering evidence into predation claims.

## Implementation and acceptance

1. Preserve current public full/LOD/portraits and editable sources before changes. Twenty
   public families are already hash-verified under each era's local authoring/backups directory,
   named `<id>-pre-motion-pass-2026-09-08`; source/Blend backups remain per-animal responsibility.
2. Inspect existing real bones, weights, clip channels and current export. Reuse sufficient
   segmentation (Michelinoceras already has ten arms with sixteen bones each). Add or correct
   deformation controls only where required for articulated curvature and proper attachment.
3. Author distinct anticipation/contact/hold/recovery and a reach–grasp–carry–mouth Eat
   performance. Keep non-target clips and era naming contracts. Final full/LOD render behavior
   must preserve the meaningful action at relevant game distances; a static/different LOD
   cannot silently replace the reviewed motion.
4. Bind physical grasp/contact, mouth and swallow sockets to appropriate moving effectors.
   Review existing `src/render/creature.ts` FEEDING_PERFORMANCE and `scrubFeeding`, plus actual
   consumption/prey placement in the engine, before integrating new performances. Currently
   only Opabinia is explicitly progress-driven. Add species only after its exact exported
   performance and socket paths pass; a blindly looping Eat clip cannot deliver a one-time carry.
5. Demonstrate Attack/Bite/Heavy in at least three phases and continuous runtime playback.
   Demonstrate Eat with real prey through grasp, transfer and final anatomical oral position.
   Synchronize prey movement to action progress; do not teleport a free target or change combat
   range just to hide animation errors. Test held target attachment during body turning/banking.
6. Inspect actual full/LOD default palette, viewer, game camera, underside/oral camera, and
   contact/interpolated poses. Preserve old reports; fresh checks apply only to frozen revised
   assets. Review eyes/general geometry after any structural rework is complete.
7. Retain preview cautions until each animal's queued tasks are complete. Commit/push accepted
   families to main individually, regenerate affected portraits/catalogues/sizes, and verify
   post-main viewer/game placement. Source or an attractive still does not complete this pass.

## Grip and dash clips — 8 September 2026

Two clips the pass now owes, both requested with the grip mechanic that shipped ahead of them
(`docs/redesign/05-hiding-and-combat.md` · Taking hold). The runtime already plays them the moment
they exist: nothing here needs a code change to land.

### `Grab`, for the eleven animals that grip

`grasp: true` in the content is the mechanic; the clip is the performance. A grip is *held* — the
button stays down, the animal keeps hold, and the same pose does double duty as the cling while
riding something bigger — so it wants a settled hold, not a snatch: close, take the load, and stay
closed with the body adjusting around it. The renderer plays it as a one-shot on the grab and as a
slow loop while clinging (`rideHost`), so the pose has to read from any angle and survive being
looped at 0.4 speed.

Per-animal direction is in `tools/attack-feeding-refinements.json` as `grip`, and it is
appendage-specific by design. The two that are *not* obvious:

- **Hallucigenia grabs with its feet.** The clawed lobopods clamp in pairs around the held body,
  or hook into a host's flank while the dorsal spine rows stay clear of it. Not a mouth grab, and
  not the spines.
- **Furcaster grabs with its whole body.** The arms wrap and the disc flattens onto the target so
  the animal *sticks* to it, oral surface against the host. Never one arm poking forward.

Anomalocaris, Nectocaris, Jaekelopterus, Manticoceras, Michelinoceras, Opabinia and Palaeoisopus
already carry a `Grab` clip; those get reviewed against the held-grip rules rather than authored
from nothing. Cambroraster, Leanchoilia, Isoxys, Tamisiocaris, Ottoia, Walliserops and Furcaster
need one. Until it lands the runtime falls back to `Heavy`/`Attack`, which reads as a swing where
a hold belongs — that is the visible gap this closes.

**Hallucigenia is done, as the first of them** (`performances/hallucigenia.mjs`, delivered
8 September): the feet clamp in pairs toward the midline under the trunk, the spines are not
touched at all, and the same held pose is what the animal wears while clinging. It also has the
first `Dash`. Both are new clip names, so nothing was replaced and the old fallbacks are one
deletion away; they are flagged on their own buttons in the viewer
(`src/content/cambrian/pending-refinements.json`) until they have been reviewed and played.

### `Dash`, for every model

Every delivered model has a `Dodge` and the code has been using it for both moves. They are not
the same thing: the dodge is a short jink out of a bite, 0.32 s, and the dash is a committed drive
that covers ground, 0.42 s, with a cancel into a charge at the end of it. One clip cannot be both,
and reusing the jink is why a dash reads as a wiggle.

Author `Dash` as the drive: a compression and a single strong extension along the line of travel,
the body straight and the appendages swept back rather than paddling, holding the streamlined
shape through the recovery. Length 0.45 s so it covers the state with a little to spare. Crawlers
included: their dash is a shove off the substrate, not a swim.

`src/render/creature.ts` already picks `Dash` for the long move and keeps `Dodge` for the short
one, and falls back either way, so clips can land one model at a time. Hallucigenia's is
authored; the amplitude lesson from it is worth carrying: a stubby limb swung by the angle a fin
would use folds over the animal's own back, and the socket check (`pose-check.mjs`, or a scratch
script printing tip positions) is what catches that before a render does.

Both clips are additive, so `apply.mjs` now allows a clip the rig never had — there is no
`replaced/<Name>` to keep beside it — and its round-trip guard normalizes triangle rotation,
which the meshopt index codec canonicalizes on the models that were packaged by the earlier
tool. Nothing else about that guard is relaxed.

## Assignment and current scope

Astra high authors/reviews each creature; Terra medium runs frozen Blender/export/check groups.
Michelinoceras has an individual Astra author active in `tools/devonian/creatures/michelinoceras/motion-v3`.
Next independent animation priorities are Jaekelopterus, Palaeoisopus and Furcaster; other queue
entries follow individually. Root owns shared runtime integration after per-creature evidence.
No revised animation asset or new runtime feeding behavior has shipped at this documentation point.

Cambrian queue: Anomalocaris, Opabinia, Waptia, Marrella, Olenoides, Odaraia, Cambroraster,
Sidneyia, Leanchoilia, Isoxys, Tamisiocaris, Nectocaris. The last is a motion-scope inclusion,
not a taxonomic claim. Devonian queue: Eldredgeops, Walliserops, Jaekelopterus, Nahecaris,
Palaeoisopus, Manticoceras, Michelinoceras, Furcaster. All remain or become preview pending review.

## Delivered — 8 September 2026

- **Leanchoilia** (Cambrian): Bite, Attack, Heavy and Eat re-authored as a preview with the
  code-authored pipeline in `tools/creatures/motion/` (its README explains the contract). The
  great appendages now lead proximal-to-distal, the three claws close on contact, the flagella lag
  and ring down, and Eat is a reach → grasp → fold-under → present-at-the-mouth performance that
  the engine scrubs by consumption progress (`FEEDING_PERFORMANCE`). The shipped clips are kept in
  the GLB as `replaced/<Name>` and shown under *Replaced* in the viewer so the two can be compared
  and the old one restored. Queue entry: `tools/attack-feeding-refinements.json` status `review`;
  its clip badge in `src/content/cambrian/pending-refinements.json` now says it awaits review.
  Not yet done: a controller playtest, and the LOD still carries no attack clips at all.

