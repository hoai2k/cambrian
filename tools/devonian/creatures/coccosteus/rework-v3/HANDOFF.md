# Coccosteus clay-01 — frozen execution handoff

Owner: Astra high. Executor: Terra medium. Status: candidate-ready for execution, **not visually approved**.
This is the first clay gate only. Do not export GLB, package, alter public files, mutate git,
run old eye audits, create animations/material maps, or change shared status/catalogue files.
The old published animal and complete named backup remain the fallback.

## Frozen inputs

| Input (absolute) | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py` | `7e91fe87c5ae33c67aa4aa747cc74d59e65d31919ccf037e2f8c080011911e3d` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views.json` | `54c15132c6be7692b58a2e9bc777b4f8dcfdc02b50c46c8da8aa83aceedcb63f` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/blender/coccosteus-v2.blend` | `251e55dee4cb7f3047e1d25ab9d6979977a201a903a8e992ce7950a22c6da146` |

Before **each** command group verify these three hashes. A mismatch is a stop, not an invitation
to edit a hash, source or command. Also verify the generated blend hash against build-report.json
before rendering it. `render-new` performs its own source, views and blend hash check.

CWD for every command:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

## Group 1 — create editable sculpt

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py -- --stage build
```

Expected: zero exit, `COCCOSTEUS_CLAY_01_BUILD_COMPLETE`, saved editable blend and build report.
Record actual Blender version, elapsed time, command output, file bytes and hashes in
WORKING_STATE.md. No executor source edits. Do not repeat successful build.

## Group 2 — render new clay

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py -- --stage render-new
```

Expected: zero exit, `COCCOSTEUS_CLAY_01_NEW_RENDER_COMPLETE`, six PNGs and a complete new manifest.
The four body views use resting geometry. The two identical close cameras compare rest to a
24.6-degree lower-jaw rotation with 3.15-degree skull lift. These are study shape keys, not
finished motion clips or an approved rig. No adjustment for perceived visual problems.

## Group 3 — render old source in the same clay studio

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py -- --stage render-old
```

Expected: zero exit, `COCCOSTEUS_CLAY_01_OLD_RENDER_COMPLETE`, four PNGs and a complete old manifest.
This stage opens the backup read-only, clears animation in memory for neutral comparison,
applies the same unpatterned clay/oral/eye materials, and **never saves that file**. The
same four cameras, scale, light setup, CPU device and samples are used for old and new.
Recheck the original backup SHA after this group.

## Exclusive output directory

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-01/`

Expected files:

- `coccosteus-clay-01.blend`, `build-report.json`
- `new-side.png`, `new-front.png`, `new-dorsal.png`, `new-oblique.png`
- `new-mouth-rest.png`, `new-mouth-open.png`, `new-render-manifest.json`
- `old-side.png`, `old-front.png`, `old-dorsal.png`, `old-oblique.png`, `old-render-manifest.json`
- Optional captured command logs and a hash/size evidence list, within this same directory only.

The builder and render stages refuse existing deliverable paths. Never overwrite or delete
prior evidence to force a rerun. Return failure details to Astra for a new decision. Existing
log files alone do not block a build. Do not create a different candidate directory yourself.

## Acceptance evidence for Astra

Show all ten actual PNGs, preserving full resolution and filenames, along with source/blend
hashes and manifests. Astra must judge the following before further work:

1. A broad low muzzle, sloping cranial roof, recessed orbital transition and substantial cheek
   must read as integrated anatomy. Reject a spherical forehead or separate cheek stickers.
2. The thorax must have a visible dorsal ridge/roof, sloping dorsolateral plane, and lower side
   plane. The shaped rear shield edge should meet the full soft abdomen naturally. Since all
   external clay shares one material, this identity must survive without colour or drawn seams.
3. The abdomen should contract into a laterally compressed, deep, rising peduncle. The low long
   dorsal and asymmetric caudal with substantial lower lobe must improve the old silhouette.
   No periodic ridges, eel-like extension, or pinched/curling fin tips.
4. Pectorals need curved thickness at their roots and swept rounded margins. Pelvics are small
   and anterior. Reject detached fins, flat triangular membranes, or exaggerated paddles.
5. Resting lips should be almost closed. Open view must reveal continuous palate, slender jaw
   cup, flexible posterior cheek and recessed oral space rather than a punched oval or solid
   body cap. Report any clipping or attachment problem for Astra to author.
6. Compare the old model's appeal fairly. This gate does not approve a replacement merely
   because geometry is more complex. Eye/full audits follow a completed frozen rework later.

## Resource and stop rules

One command group per state entry. Allow at most 20 minutes per group, 60 minutes total; stop
on unexpected command error, timeout, changed frozen hash, missing output, incomplete manifest,
or need for a visual/anatomical/collision decision. Return exact evidence to Astra. No automatic
fixes, parameter reductions, alternate render engine/device, metadata edits or new source.
After all groups, stop for Astra review. No public integration is authorized in this handoff.

Static authoring validation already passed: Python AST parse; JSON parse; four fixed body view
names; positive axial widths; monotone bounded interpolation between every anatomical section.
Those checks did not run Blender and do not claim visual validity or final topology approval.
