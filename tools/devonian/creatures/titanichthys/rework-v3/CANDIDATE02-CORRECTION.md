# Candidate01 pigment failure and bounded candidate02 correction

Astra high independently decoded the actual full/LOD GLBs after Terra's group2 failure. Parent reported the stopped assertion at check_candidate_01.py line72; group3 was not run. Full and LOD hashes match the returned evidence. This is an actual export defect, not a legitimate constant material and not grounds to weaken the check.

All11 LOD primitives—including both eyes—have exactly white COLOR_0. Full white colour is expected because it multiplies PBR albedo; texture-free LOD white colour is wrong. The six candidate albedo files are byte-identical to the accepted material02 files and contain the authored nonwhite pigment. Extra COLOR_1 fields instead hold TitanFin/TitanEye/TitanAnatomy construction metadata, with values unrelated to albedo. Full decoded primitive records are preserved in candidate01-pigment-diagnosis.json.

The original bake guard only checked finite values and a positive maximum, so white passed. No dense/pre-decimation/post-decimation pigment statistics were saved; the production source resets Color to white before saving. Thus the evidence does not establish the exact first whitening stage. In addition, inspected installed Blender5.2 exporter source contains a material-colour masking hazard: the subsequent-material branch stores a colour-name key where the later masking branch compares a glTF semantic such as COLOR_0. No installed code is changed.

## Correction scope

Candidate02 rebuilds from the same accepted material02. Geometry, rig_actions_01.py, all25 bones/18actions/5anchors, source PBR maps, export texture resolutions and decimation ratios are unchanged. Candidate01 and every previously frozen source remain immutable.

- Replace the unverified Cycles vertex bake with direct bilinear sampling of each actual mapped albedo at the existing corner UV. Read a dedicated Non-Color image to obtain normalized sRGB code values, validate against96 independently decoded frozen PNG samples across six atlases, then explicitly convert sRGB to linear. This catches decoder, orientation and colour-space errors before any LOD export.
- Preserve the same area/normal/region-aware dense body filtering. Assert intended nonwhite linear pigment and record statistics after dense sampling, filtering, before decimation and after decimation. White values can no longer pass the initial gate.
- Link Color explicitly in the LOD shader so the Blender material also displays its intended pigment. Export only Color; construction attributes are removed from export duplicates and export_all_vertex_colors=False prevents leakage. Source anatomical attributes remain intact.
- After LOD serialization, match every exported POSITION+TEXCOORD_0 against the actual post-decimation source corner data with2e-6 coordinate/UV tolerance and an ambiguity guard. Write only existing COLOR_0 bytes to their intended quantized linear colour. Verify read-back values and prove every non-colour byte is unchanged. Geometry, normals, UVs, weights, joints, animations, graph and material data are not repaired or approximated by this operation. This specifically avoids relying on exporter material-colour masking.
- Preserve the original >.005 LOD variation check. Additionally reject unwanted COLOR_n attributes, values outside the authored linear range and loss of dark eye pigment. The existing root/action/anchor/skeleton/LOD tests remain.
- Correct the LOD roughness branch to test the exact oral-accent role: the substring 'oral' also occurs in 'pectoral', which gave the candidate01 pectorals the oral0.36 roughness. Pectorals now use their intended0.48 LOD membrane roughness. No full PBR material changes.

No source-albedo resolution or geometry reduction is added. The44,564,348-byte raw full candidate01 remains prepackaging evidence; final lossless packaged size is still an outstanding gate. All actual full/LOD rendering, runtime playback and completed-candidate eye/oral/general audits remain required. No final audit or Blender execution was performed by Astra.

## Source-side validation

New Python ASTs pass. A synthetic GLB/corner fixture exercises the transfer utility: Blender/glTF axes and UV conversion, matching, quantization error within half a16-bit step, read-back correctness and unchanged non-colour bytes. The PNG reference values were decoded independently with Pillow from the immutable actual albedo files. These tests do not substitute for the frozen Terra build/structural/render groups.
