# Titanichthys eye-seating study 02

`eye-seating-study-02` is the successful `.030` inward-only eye POSITION derivative of immutable candidate-06. Its full GLB is `73cdb8d610d2f6cbdec750127d406d51dda4d288ac6218f616c4f6560b1e1bee`; its LOD GLB is `d19e670f2b2c2b8ff0c5a56709a020708bbee4c4f302c5670cae53f960ab1a1f`. The corresponding immutable inputs were `e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad` and `27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40`.

`patch_eye_positions_01.py` remains the successful recorded execution source. Study 01 is preserved as a failed bytearray-copy attempt: it changed zero BIN bytes. `patch_eye_positions_02.py` is the reusable successor: it requires a finite positive depth and a fresh output, verifies the frozen inputs, contiguous unshared float32 VEC3 POSITION accessors, nonzero allowed-byte changes, and JSON equality except targeted accessor min/max.

The completed float64 audit is independent of image rendering. Its conservative lower containment results range from 60.32021392351526% to 61.6838250550356% for both eyes, full/LOD, Bind/Ability; all four combinations passed the strict 50% gate with no uncertain/disagreement rays. This does not establish a 65% result.

The prior eight `orbit-render-manifest.json` images are invalid pose evidence and are preserved without overwrite. They imported at frame 15, did not fully clear Bind pose state, and used Ability frame 15 rather than frame 36. `render_orbits_03.py` corrected those errors but stopped after its two full-Bind images when it tried to serialize a nonexistent `ActionSlot.name`; its partial `orbit-renders03` output is preserved as failed evidence. `render_orbits_04.py` changes only that serialization to use the actual slot identifier and writes only to the fresh `eye-seating-study-02/orbit-renders04` directory. It asserts the exact full/LOD hashes and imported clip set, sets frame 0 before import, clears Bind action slot/action and all pose-bone matrix bases, and renders Ability at `round(30 * .5 * CLIPS['Ability']) == 36`. Its manifest records source hash, input hashes, action slot, strip, and frame for each of eight fixed Orbit-side/Orbit-oblique Bind/Ability views.

The clean CPU2 execution completed with eight views. `orbit-renders04/orbit-render-manifest.json` SHA-256 is `3d26f671a4b8a331df6dd4c620d1122c750b44b38371c435e53198b890606851`. Bind records frame 0 with null action/slot; Ability records frame 36 and the actual imported action/slot. The images await visual author review.

The completed command was:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_orbits_04.py
```

Do not regenerate GLBs, rerun the volume audit, overwrite invalid images, package, publish, or alter eye geometry/materials.
