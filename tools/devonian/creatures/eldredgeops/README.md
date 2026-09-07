# Eldredgeops — initial preview specimen

**Status: Preview model.** This is the complete initial asset set under the user's preview-first roster priority, not a finished anatomical/art refinement. Exact enrollment closure, detailed limb/shell collision refinement and exhaustive sequential playback remain outstanding.

## Identity and reconstruction

Eldredgeops rana, Middle Devonian/Givetian Hamilton Group of northeastern North America. The shell follows E. rana sensu Eldredge1972, with a rounded cephalon and genal angles, inflated tuberculate glabella, narrowing preoccipital/occipital region, seventeen dorsoventral lens files per side, eleven independently rigid thoracic tergites, and a compact ribbed pygidium. Eight axial rings and six pleural ribs are represented on the pygidium; their detailed relief remains a refinement topic.

Schizochroal eyes consist of 82 individual closed calcite lens solids per side, rather than fish globes. The ocular platforms belong to the continuous cephalon. Paired underlying closed ocular volumes lie beneath the cuticular sclera; separate lens caps are inset in that surface. No ornamental rim is used to satisfy embedding. Every lens is independently tested against actual exported cephalon triangles, including the reduced mesh.

The underside is comparative reconstruction: three post-antennal cephalic limb pairs, one pair per thoracic tergite, and four pygidial pairs; seven articulated podomeres per walking branch, small terminal claws, gnathobases, and lamellar respiratory branches. The exact E. rana soft-part arrangement is uncertain. Antennae are articulated flagella. A fixed hypostome protects a posterior-facing oral aperture with modeled internal lining and a small soft-tissue pump; the feeding clips move gnathobases and oral tissues, not an invented vertebrate jaw.

Sources and qualifications are in [research.md](research.md). Directly inspected primary figures are retained locally in `v2/references/`: Clarkson et al.2006 Fig.4C/D for E. rana lens arrays and Esteve et al.2010 for comparative coaptation. The original Eldredge1972 diagnosis was accessed through the museum-curated Devonian Atlas; do not claim its original plates were personally inspected.

## Model and materials

Original Blender authoring, with shaped shell surfaces, low glabellar tubercles, supported shell subdivision, rigid segment weights and separately articulated limb chains. The high-detail editable source is `../devonian-authoring/eldredgeops/v2/eldredgeops-v2.blend`; early clay sources/renders are preserved in `v2/development/`.

Original generated cuticle art and the exact prompt are preserved in [imagegen-provenance.md](imagegen-provenance.md). Full-model albedo/normal/roughness maps are UV-mapped, with neutral white COLOR_0. Distant geometry has linear-light baked vertex pigmentation and no texture maps. No museum reference image or downloaded model is incorporated into the asset.

Full and reduced GLBs share 313 bones and the same three nested version1 anchor roles: mouth, swallow and primary contact. Blender -Y forward/+Z up exports to glTF +Z forward/+Y up. The root is stable, and no scale animation is used. Individual shells remain rigid; oral lining receives narrowly scoped soft-tissue weights.

## Actions

Twenty full clips; LOD retains Idle, Swim, Crawl and Death. Idle/Crawl/Swim/Guard/Eat loop seamlessly. One-shots return to neutral except Death.

| Clip | Seconds | Authored intent |
|---|---:|---|
| Idle | 2.4 | Antennal exploration and restrained respiratory branch motion |
| Crawl | 2.4 | Metachronal foot placement with alternating sides and minor body elevation |
| Swim | 2.4 | Faster limb-powered strokes beneath rigid dorsal shell |
| TurnLeft / TurnRight | 1.6 each | Differential stepping and modest whole-body heading change |
| Dive / Rise | 1.6 each | Lowering/raising benthic stance with coordinated leg flexion |
| Attack | 1.0 | Anticipation and short forward contact/feeding reach, then recovery |
| Bite | 0.5 | Brief gnathobase processing and oral pumping |
| Heavy | 1.1 | Braced preparation and stronger forward contact gesture |
| Hit | 0.6 | Short recoil with planted appendages |
| Death | 1.6 | Fading leg movement, lowered body and partial curl held terminally |
| Guard | 1.0 | Repeated partial defensive flexion |
| Parry | 0.367 | Quick asymmetric brace and recovery |
| Dodge | 0.4 | Lateral stepping displacement with anticipatory leg changes |
| Eat | 1.6 | Repeated alternating anterior gnathobase processing |
| Stagger | 1.2 | Uneven stepping and damped imbalance |
| Ability | 2.4 | Coordinated defensive head/thoracic flexion with appendage tuck |
| Growth | 1.5 | Unscaled relaxation/extension compatibility posture |
| Moult | 1.5 | Distinct loosening/withdrawal preparation; no detached shell appears |

Names are shared animation compatibility, not claims about gameplay mechanics or measured fossil behavior. Swim does not establish habitual pelagic swimming.

## Reproduction

From the repository root, using Blender5.2:

```
python3 tools/devonian/creatures/eldredgeops/materials.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/build.py
python3 tools/devonian/creatures/eldredgeops/validate.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/eldredgeops/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/audit.py
ELD_IMPORT=full ELD_RENDER=preview /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
ELD_IMPORT=full ELD_RENDER=portrait /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
ELD_IMPORT=lod ELD_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
python3 tools/devonian/creatures/eldredgeops/finish.py
```

These write local candidates only, under `../devonian-authoring/eldredgeops/v2/candidate/`. Blender may require host escalation to avoid the sandbox Metal initialization crash. Parent handles lossless web packaging, public assets, catalogue/viewer checks and git integration.

## Verification and limits

`validation.json` records finite geometry, normalized weights, stable roots, removal of exporter-created identity-scale tracks, distinct nonzero actions, seamless loops, socket alignment, actual LOD reduction and SHA256. `skeleton-graph.json` checks exact full/LOD bone-parent identity. `eye-evidence.json` summarizes hash-bound ocular and per-lens reports. Actual GLB imports were rendered for front, side, dorsal, three-quarter, eye and ventral oral inspection, plus locomotion, feeding, heavy contact, guard, dodge, defensive flexion and death.

Outstanding refinement:

- Ability/Guard show defensive curling, but exact closed enrollment coaptation, vincular notches and complete antenna enclosure are not verified. Some antenna tips remain outside at the rolled peak.
- Fine shell margin/facet fit and limb/branchial clearance in extreme poses need additional refinement. The first-ring/occipital joint can open visibly during deep flexion.
- Full sequential playback and all transition combinations are deferred. Initial static action checks and structural action checks do not certify every intermediate contact.
- Facial sutures, cuticular microstructure, glabellar relief and pigment/roughness balance can be improved. Pigmentation is interpretive; this is a living-animal model rather than a fossil cast.
- Exact soft-part pair counts beneath the pygidium, lens size distribution, feeding soft tissues and antennal proportions remain comparative choices.
