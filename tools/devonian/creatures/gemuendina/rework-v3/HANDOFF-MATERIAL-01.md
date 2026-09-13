# Gemuendina first production group — authored materials

Astra high accepts clay-02 as the coarse production foundation, after inspecting
threequarter/front/side/dorsal actual renders. Its shorter upward gape, integrated
lip, differentiated cheek/cranial contours, cambered shoulders and continuous
axial taper are substantially improved. This is **not final rework approval**;
fine material, rig/action and post-rework eye/oral/export review remain pending.

Accepted source:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-02/gemuendina-clay-02.blend`
SHA `c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f`.
Reviewed four-image manifest SHA:
`acd93202eada543b4c44f7666c4ea8b040e7500fef63a879fc5dfecae76248e0`.

Frozen new source:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_01.py`
SHA `d4b242f6f5893612992eacaab5beb11916128b24347094b163d3d7b783e10fcd`.

Terra first verifies these input hashes. Then, from CWD
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, execute:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_01.py
```

The script opens the accepted blend, packs dedicated surface UVs, assigns
original authored three-dimensional material fields, and bakes game-compatible
albedo/normal/roughness maps. It hashes every body/eye vertex coordinate before
and after; geometry must remain identical. It uses no external image/paleoart
pixels and makes no geometry, rig, public, catalogue or status edits.

Three explicit scales are authored independently: broad restrained olive/ochre
clouds, small irregular tesserae with quieter fin ornament and a few understated
cranial fields, and fine granular relief/roughness. No regular colour bands,
uniform hexagons, large turtle plates or eye-pad objects. Pigment, cell spacing,
cranial field boundaries and eye colours remain artistic interpretations.

Outputs only under
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/material-01/`:

- Editable `gemuendina-procedural-material-01.blend` with original material nodes.
- `body-{albedo,normal,roughness}.png`, 2048²; `eye-{albedo,normal,roughness}.png`, 512².
- `gemuendina-material-01.blend` with packed baked maps and unchanged geometry.
- `material-oblique.png` and `material-cranial.png`, neutral 1200×1000 fixed views.
- `material-report.json`, source/blend/geometry/texture/render hashes and provenance.

Expected final marker: `GEMUENDINA_MATERIAL_GROUP_OK`. Per-map and per-view markers
report progress. CPU Cycles baking, two threads; rendered views use 32 samples.
Budget 20 minutes; report progress if exceeded before extending. Preserve output
and stop on any error, hash mismatch, geometry mismatch, existing-output refusal
or creative judgment. Do not edit settings/inputs to force completion.

Return the two actual rendered images and map/contact evidence for Astra review.
The parent will decide from this output whether ImageGen organic microtexture
would add value. No such call has been made or claimed. Rig/action scripting can
proceed separately while this group executes, but these textures are not yet
visually accepted for a finished candidate.
