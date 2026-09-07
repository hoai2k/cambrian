# Furcaster — initial preview specimen

**Preview model.** Independently authored Furcaster palaeozoicus from the Early Devonian Hunsrück Slate. Primary arm reference is specimen OKL96 in Clark, Hutchinson & Briggs2020, https://doi.org/10.1098/rsos.201380 . Figure3c and section3.5 were directly inspected. See research.md for interpretations and limits.

Five slender arms radiate from a small granular disc. Each arm has 36 rigid opposing ambulacral pairs, curved lateral ossicles, delicate lateral/groove spines and narrow flexible connecting tissue. No modern dorsal shield row is substituted for the fossil arm construction. The fivefold mouth-angle frame surrounds an actual lined underside chamber and blind soft oral pump. No eyes, fish jaws or moulting shell are added.

The selected fossil CT informs arm joints; exact disc plate pattern, spine counts/posture, soft podia, oral papillae and pigmentation remain comparative/illustrative. Opposed jointed ossicles support possible arm-driven motion, not a uniquely known gait. Swim is a compatibility sculling interpretation. A 12 cm representative overall span is illustrative, not species maximum.

## Source and rendering

Packed original Blender `../devonian-authoring/furcaster/v1/furcaster.blend`; candidates local under v1/candidate; original imagegen pigment and derived UV PBR maps in this source folder, full provenance in imagegen-provenance.md. Original clay is preserved separately. Full uses white COLOR_0 with actual UV maps; texture-free reduced model retains linear baked pigmentation. No downloaded model or fossil image is included in texture assets.

188 bones include five 36-joint arm chains, disc/root, five oral-angle bones and oral pump. Both levels have the same graph. Three nested v1 sockets: ventral mouth, internal swallow, leading-arm contact. glTF +Z forward/+Y up; stable root and no scale clips.

## Action intent

Nineteen full clips, four LOD Idle/Swim/Crawl/Death. Idle/Crawl/Swim/Guard/Eat loop; one-shots recover except Death. Each arm's role and joint phase differ. These are compatibility labels, not gameplay prescriptions.

| Clip | Seconds | Authored motion |
|---|---:|---|
| Idle |2.4|Restrained distal exploration and disc breathing motion|
| Crawl |2.4|Leading arm, driving lateral pair and delayed stabilizing pair|
| Swim |2.4|Arm sculling and vertical flexion interpretation|
| TurnLeft/TurnRight |1.6 each|Differential stroke effort and modest disc heading|
| Dive/Rise |1.6 each|Lower/raise stance through coordinated arm bend|
| Attack |1.0|Brace, anterior arm reach, recover|
| Bite |0.5|Fivefold oral processing gesture|
| Heavy |1.1|Stronger arm gathering/contact with anticipation and recovery|
| Eat |1.6|Repeated oral-frame and soft-pump motion with anterior gathering|
| Guard |1.0|Modest protective arm bend and brace|
| Parry |0.367|Asymmetric short brace|
| Dodge |0.4|Quick coordinated lateral stroke|
| Hit |0.6|Disc recoil and delayed arm response|
| Stagger |1.2|Uneven strokes and damped imbalance|
| Ability |2.4|Protective arm gathering with modest lift|
| Growth |1.5|Unscaled relaxed extension|
| Death |1.6|Fading distal motion, settling curled arms, held terminally|

## Reproduction

From expansion-repo, Blender 5.2, --threads 2; this host needs escalation to avoid sandbox Metal crash.

```
python3 tools/devonian/creatures/furcaster/materials.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/furcaster/build.py
python3 tools/devonian/creatures/furcaster/validate.py
FUR_IMPORT=full FUR_RENDER=preview /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/furcaster/render.py
FUR_IMPORT=lod FUR_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/furcaster/render.py
FUR_IMPORT=full FUR_RENDER=portrait /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/furcaster/render.py
FUR_IMPORT=full FUR_RENDER=sequence /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/furcaster/render.py
python3 tools/devonian/creatures/furcaster/finish.py
```

For reviewed clay only: FUR_CLAY=1 build.py, then texture_export.py attaches PBR and exports without regenerating anatomy. Basic shape helpers are adapted from our previous original assets; geometry, radial rig and action logic are newly authored for Furcaster.

Detailed disc/arm root sculpting, exact ossicle/spine comparison, fine arm collision clearance and exhaustive transition review remain future refinement. Initial review covers real exported dorsal/oral/arm detail, basic locomotor/feeding/defensive extremes and selected sequential poses; see validation.json and review-evidence.json for actual completed checks. Eyes are anatomically not applicable, rather than an omitted volume audit. Final counts and hashes are in delivery.json and WORKING_STATE.md.

Final review and portraits use Blender EEVEE with material textures and studio lights, matching real-time rendering more closely; set FUR_ENGINE=CYCLES for the slower optional path-traced renderer.
