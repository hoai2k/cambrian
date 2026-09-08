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
