# Cladoselache V2

An individually authored Cleveland Shale early chondrichthyan, rebuilt from the V1 silhouette and anatomical requirements. This is a genus-level reconstruction of a representative 1.5 m animal, not a fossil scan. See [anatomy-notes-v2.md](anatomy-notes-v2.md) for evidence and uncertainty and [material-provenance.md](material-provenance.md) for the original imagegen art.

## Anatomy and appearance

The continuous body has a blunt compound nasal roof, a narrow V-shaped lower-jaw plan, dark lateral globes seated in the actual head, incised and softly curved gills, broad based paired fins, a narrow keeled peduncle, and a high aspect crescent tail. No orbital hoops, external gill cords, raised lateral cord or exposed fin spokes are used. The head surface and oral lining weld at their common aperture. A weighted palate, cheeks, floor and gradually narrowing deep passage form the interior. Cladodont central cusps have small accessory cusplets; each tooth uses the same weights as its gum attachment, including the mouth corners.

One stout curved anterior dorsal spine is modeled. A posterior spine and anal fin are omitted. The broad fin roots lie within the body surface; skin-covered fin supports are represented by subtle camber and surface variation. The peduncular keels taper into the body and caudal root. Soft-tissue contours, pigmentation and animation are inferred. No modern shark scale coat or cutting dentition is asserted.

Klug, Coates, Frey et al. (2023), [DOI 10.1186/s13358-023-00266-6](https://link.springer.com/article/10.1186/s13358-023-00266-6), is the accessible primary comparative source. Much of that paper concerns Maghriboselache; its specialized nasal architecture and posterior spine are not imported. Harris (1938) and Dean (1909) are original Cleveland studies cited through that comparison; original plate access was unavailable. The 2024 publisher correction concerns ZooBank registration only.

## Authoring and exports

Owned production files are `build.py`, `anatomy_v2.py`, `materials_v2.py`, `actions_v2.py`, the original `skin-source.png`, generated PBR maps, anchor manifest and review helpers/reports. `build.py` always writes locally to `../devonian-authoring/cladoselache/v2-candidate`; it does not publish assets.

The editable Blender source is `../devonian-authoring/cladoselache/cladoselache-v2.blend`, with packed textures, named anatomical bone chains and individually authored actions. V1 source, Blender files and all seven published assets are preserved in `../devonian-authoring/cladoselache/v1/`, including published hashes. Candidate output consists of full and reduced GLBs, JSON metadata and four matching PNG portraits. Parent task packages and publishes after independent review.

Run from the repo root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/cladoselache/build.py
```

`CLADOSELACHE_QUICK=1` produces the same local GLBs plus two quick silhouette renders. `DEVONIAN_AUTHORING` can choose an alternative local authoring directory. No network or imagegen call is required to reproduce the source and runtime model from the committed material swatch.

The full model uses UV albedo, normal and roughness maps and neutral white `COLOR_0`. The original art contributes variation to mapped blue-gray dorsal pigment, warmer pale underside, soft fin color, dark eyes and recessed oral tissue. The reduced model retains atlas-sampled linear vertex pigment and removes all texture inputs. This avoids multiplying baked pigment twice in Three.js and keeps the reduced model colored after packaging.

## Motion

All 18 required actions are separate: Idle, Swim, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability and Growth. Six sequential tail bones propagate a traveling wave into a distinct caudal fin bone. Pectoral tips follow with a delay; fins bank asymmetrically during turns, parry and dodge. Jaw and throat actions use different preparation, closure and recovery envelopes. Gills move subtly with oral/breathing motion. These are compatibility animations, not a Devonian gameplay specification.

Idle, Swim, Guard and Eat loop. One-shots return to their start transform; Death settles into a terminal pose and holds its final fifth. No scale tracks or animated root are exported. Parry's runtime duration is exactly 0.35 seconds; its 30 fps source samples are normalized during export because the endpoint falls between frames. The reduced GLB includes Idle, Swim and Death on the same 22-bone skeleton.

The exact three version-1 nested anchor roles are retained: `anchor_mouth` on jaw, `anchor_mouth_inside` on skull, and `anchor_attack_primary` on skull. World bind locations in `anchors.json` are converted to actual exported parent-local socket transforms.

## Verification

`validation.json` records finite deformation bounds at every authored frame, action motion and loop seams, terminal Death hold, geometry reduction and asset sizes. `check-export.py` validates actual full/LOD GLB materials, vertex colors, normalized skin weights, distinct actions and root/scale policy. `audit-candidate.mjs` decodes the actual local GLBs for the shared independent `tools/devonian/eye-audit.py`; the head envelope excludes ornamental geometry. Fresh full and reduced eye-volume reports and hashes are included in the final handoff.

`review-viewer.mjs` loads the actual candidate bytes in Three.js while routing only this creature's asset requests locally. It tests independent cloned rigs and sockets using the shared runtime auditor, renders all 18 actions and extreme phases, neutral front/side/dorsal/eye views, a full-gape mouth view, and reduced Idle. It also records sequential all-action WebM playback. `review-source.py` renders matching close inspections from the Blender source. Static passes are accompanied by visual review; remaining reconstruction uncertainty is not a structural test failure.

```sh
node tools/devonian/creatures/cladoselache/audit-candidate.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/cladoselache/eye-audit-full
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/cladoselache/eye-audit-lod
python3 tools/devonian/creatures/cladoselache/check-export.py
node tools/devonian/creatures/cladoselache/review-viewer.mjs
```

The viewer helper expects the repo's Vite server on port 5173, overridable with `QA_BASE_URL`. Set `CLADOSELACHE_QA_QUICK=1` to omit only the playback recording.

## Published package review

The independently reviewed package is 9,644,796 bytes full and 1,171,792 bytes reduced. Lossless compression preserves every decoded position, skin weight and animation sample. Fresh packaged eye-volume measurements are about 77% in both detail levels, with conservative lower confidence bounds above 76%. See `eye-packaged-review.json` for exact hashes and topology checks. The built viewer loaded all 18 actions; paused selection and one-frame stepping passed for each, the feeding gape was visually inspected, and no browser errors were reported (`main-viewer-review.json`). The Devonian suite passed all 410 checks.
