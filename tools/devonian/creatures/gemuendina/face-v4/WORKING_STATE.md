# Gemuendina face V4 — candidate02 delivery checkpoint, 8 September 2026

Root completed the requested front-mouth/anterior-eye refinement in Blender5.2.
The accepted V3 posterior body (Y >= -1.04), material textures, topology and UVs
are preserved. Only two actual eye meshes exist, positioned above the leading
mouth. Dorsal eye-like motifs are skin markings. Jaw/throat pivots, denticles and
three nested anchors follow the continuous anterior deformation.

Study01 was rejected for oversized globes; study02 accepted. Candidate01 met the
user's 50% containment requirement but missed the additional65% safety margin
in Heavy. Candidate02 moves the globes another .010 inward. All prior versions
and the94-file original backup are preserved under local devonian-authoring.

Actual full/LOD candidate02 exports:16,412,444/2,862,364bytes,184,612/47,044triangles,
28bones,3anchors,18actions on BOTH detail levels. No default LOD clip stripping.
check_candidate_02.py passed. audit-candidate-02-03/audit.json independently
sampled Bind, Heavy.45, Bite.45, Eat.25 and Swim.25 in full AND LOD. Closed body,
no boundary caps; minimum measured eye interior77.7953%, conservative95% lower
bound77.0443%, exceeding50%. This is bounded pose evidence, not every frame.

Root inspected all11 actual exported pose renders: front, oblique, side, Heavy
front/side, Bite front, Eat oblique, oral-low, LODfront/Heavy/Eat. Front mouth
and supported eyes read clearly, oral tissue follows opening. Full/LOD shape
is coherent; far LOD loses fine pigment and a diagonal cheek crease remains.
Four actual exported-model portraits regenerated; select and thumbnail inspected.
Keep PREVIEW: broad final art/LOD cleanup and controller playtest still remain.

release_02.py copies the six unchanged binary/image assets and writes a metadata
copy that removes obsolete upward-orientation text and duplicate notes. It binds
itself to the actual eye-audited GLB hashes. Local release-02.json records hashes.
Selected Devonian intake PASS. Catalogue/sizes regenerated. Build/typecheck PASS.
Built viewer4176 loaded the new face, all18clips and preview badge; root observed
Idle and Heavy.495s jaw opening. No interactive prey/controller test claimed.
Main publication is the next step; consult docs/devonian/current-state.md / Git.

Restart paths: local ../devonian-authoring/gemuendina/face-v4/candidate-02 has the
editable production Blend, exported family, reports and pose-evidence/. Audit is
sibling audit-candidate-02-03. release-{intake,build,typecheck}-02 logs prove checks.
Frozen candidate builder reads old metadata SHA27ad05fc...9cb3 from public;
for a clean reproduction restore that INPUT from the preserved backup public/
to a separate reproduction checkout (never overwrite current production).
The original immutable candidate02 directory must not be reused for a new run.
