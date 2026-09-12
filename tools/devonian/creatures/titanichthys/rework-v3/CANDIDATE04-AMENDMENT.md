# Candidate04 — full gameplay animation contract on LOD

Candidate03 is preserved and was never executed. Root requested this minimal amendment before export: full and LOD must both retain the18 authored dynamic gameplay actions. No geometry, material, rig, action trajectory, weights, pigment method, texture dimensions or LOD ratio changes.

`candidate_04.py` differs from03 only in candidate/version paths and use of `export_patch_02.py`. That utility retains every authored animation for both exports, still removing only verified constant root/scale channels and applying the same anchors. It no longer discards15 clips from LOD. All18 required names must occur exactly once.

`check_candidate_04.py` requires all18 dynamic distinct actions, durations, loop/recovery seams and held Death on both exports. It compares every full/LOD animation channel by bone/path, sample time, interpolation and sample value. Attack, Bite, Heavy, Eat and Ability must move jaw, skull and oral_floor on both. Existing pigment, palette, PBR, skeleton, anchors, bind, normalized weights and size reporting gates remain.

`render_candidate_04.py` retains the21 prior views and adds actual imported LOD Attack-oblique at phase.46 and Eat-oral at phase.5. It uses each imported NLA track's own action and layered action slot, with all stash tracks muted, rather than an old similarly named source action. It requires18 imported tracks and resets pose matrices for true bind comparison. The image manifest records action/slot binding. These two images are review evidence, not a substitute for actual runtime animation playback.

Astra checked local installed Blender5.2 importer stash/restore semantics, parsed all4 new sources, verified the builder differs only as declared and reverified all68 candidate03 frozen manifest entries. No Blender execution or actual export/render pass occurred. The candidate03 pigment correction/helper and every original failure remain frozen. Final eye/oral/general, runtime playback, raw-size packaging and visual approval gates remain outstanding.
