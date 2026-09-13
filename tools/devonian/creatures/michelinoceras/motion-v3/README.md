# Michelinoceras — separate motion-v3 candidate

This bounded pass changes `Attack`, `Bite`, `Heavy`, and `Eat` on the preserved
original Blender asset. It adds real segmented arm contact metadata. It does
not change the shell, body mesh, materials, arm count, arm sections, skinning,
rest pose, or the other 15 full actions. No public asset is approved or replaced
by these scripts.

## Actual source findings

`source-audit.json` records hashes from both the original local candidates and
the actual shipped files. The shipped full has 19 actions and 166 joints; the
shipped LOD has only Idle/Swim/Death. Both already contain ten separately skinned
16-section arm chains. The existing primary arm anchor has no IK chain and
there is no grasp socket. The old Eat is a repeating jaw/inward-arm loop. The
old Attack/Heavy vary a largely shared curl value across all arm sections.

Therefore, a new topology/rig build is unnecessary for this pass. The preserved
ten-arm comparative reconstruction is sufficient. No suckers, clubs, additional
tentacles or new shell detail are introduced. Arm number, soft-part anatomy and
behaviour remain uncertain comparative artistic interpretations, as documented
by the original Michelinoceras research; the new motion is not fossil evidence.

## Authored performance

- Attack, 1 second: a crown flare near 18% precedes a curvature crest travelling
  through proximal, middle and distal arm sections. Arms have unequal timing
  and lateral deflection. Distal hooks close after the advancing middle arm,
  followed by an outward recoil and settled recovery.
- Heavy, 1.1 seconds: stronger sectional flare/whip and delayed hook/recoil.
  The shell remains rigid and stationary within the action.
- Bite, 0.5 seconds: distinct paired corneous opening and closure supported by
  a short inward collecting gesture in the distal arms.
- Eat, 1.4 seconds, **non-looping**: pickup 0–22%, contact and curved carry
  22–78%, oral transfer/held cupping 78–100%. The curve ends just outside
  `anchor_mouth`; the runtime can shrink food into `anchor_mouth_inside`.
  The last pose stays cupped and is released through the runtime crossfade.

Eat uses existing sections 0–12 for bounded contact solving. Independent
sectional arcs seed the solver, and sections 13–15 remain available for tip
wrapping. The solve rotates bones only; it cannot stretch a limb or move the
head/body/root to reach. Every new action begins at the original neutral pose.

The new `anchor_grasp` is slightly inside the oral face of arm 0 section 12.
Ten attack contacts use their own arm chains. Mouth and swallow anchors remain
on the original head. Full and LOD share all 13 sockets and the unchanged
166-joint graph. LOD preserves its previous three actions and adds the four
new performances, making seven; full keeps the same 19 names.

`preflight-contact-probe.json` is a non-Blender numerical reach check against
the actual original GLB rest transforms. It is not visual approval. The probe
reported a 0.001847 maximum lead-grasp residual after pickup and 0.019857 maximum
across all arms. Only actual new exported geometry/poses can establish whether
the basket shape, contacts, speed and silhouette look convincing.

## Frozen execution handoff

All commands run from:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Before execution, verify every entry in `frozen-inputs.json`. The builder repeats
the hash check and refuses any existing `candidate-01` directory. Terra runs
only these frozen command groups, with CPU / two threads, then returns to Astra
for review. No retries with changed source, output version, thresholds or
selectors are permitted without a new author decision. Preserve error output.

1. Build/save/full and LOD export:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras/motion-v3/build_candidate.py
```

2. Read-only exported contract validation:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras/motion-v3/validate_candidate.py
```

3. Actual full exported sequence renders (45 images, 720×540, Cycles CPU):

```sh
MIC_DETAIL=full /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras/motion-v3/render_candidate.py
```

4. Actual LOD exported sequence renders (15 images, same views and settings):

```sh
MIC_DETAIL=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras/motion-v3/render_candidate.py
```

Outputs are confined to
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/motion-v3/candidate-01/`.
The saved full blend is written before reduction. Each render directory records
its exact exported asset hash. The cyan sphere is a review-only food contact
proxy attached to the actual grasp socket, not gameplay proof.

## Acceptance and follow-on work

Astra must inspect changed **actual full and LOD exports** before acceptance:
visible flare before the strike, travelling sectional bend (not a single rigid
arm swing), unequal arm timing, readable whip/hook/recovery, preserved whole
silhouette/material, and food carried to the oral opening rather than shell or
head surface. Review crown side and oblique views for sharp kinks, arms crossing
through the head, tight self-intersections, and abandoned food contact. Return
for authoring if any fail; a numerical PASS is not art acceptance.

Only after that review may the parent integrate Michelinoceras into the runtime
progress-driven feeding set and manifest, validate real prey attachment on full
and LOD, regenerate required portraits, perform the appropriate changed-model
audits/intake and publish. The generic current runtime carry arc descends by
0.13 of total body length; on a long orthocone that can exceed soft-arm reach.
The parent should assess that real runtime path using this rig's reachable
mouth/arm region, rather than treating a local proxy render as verification.

Current status: source frozen for first candidate export; no Blender execution,
rendered candidate, art acceptance, runtime integration or public replacement.
