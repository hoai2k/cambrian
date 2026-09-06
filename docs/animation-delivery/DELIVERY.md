# Animation asset update

Copy the eight files in `public/assets/creatures/` into the same directory in your GitHub repository, replacing the existing GLBs. Keep the filenames unchanged. No game code changes are included or needed for clip-name discovery.

Based on repository commit `296a00146baa1ea713bfea27a3659b9e574902c6` and `docs/animation-brief.md`. The downloaded original models are preserved locally. If you have changed the rigs/models since that commit, compare the original hashes in `validation.json` before replacing them.

## Contents

- Eight updated GLBs, already losslessly Meshopt-compressed and each below 25,000,000 bytes.
- `notes/<creature>.txt`: exact names, frame counts, duration and loop/one-shot status.
- `validation.json`: original/new hashes, byte sizes, exact preservation checks and runtime playback evidence.

71 new clips total: Bite, Heavy, Dodge, Eat, Stagger, Ability and optional Moult for all eight; Guard and Parry for all except Waptia; Grab for Anomalocaris only. Every original clip remains unchanged.

## Timing and conventions

Frame counts in the brief take precedence over rounded seconds: Parry is 10/30 = 0.333333 s, Opabinia Ability is 17/30 = 0.566667 s, Waptia Ability is 14/30 = 0.466667 s. Ranges include both frame 0 and final frame N. The other timings match the brief exactly.

All new one-shots return to the original Idle start pose. This also applies to the Anomalocaris surge, following the brief's general cross-fade rule; the engine can transition to Swim afterwards. Loops close on matching poses. Root pose channels are constant, and scale never animates. The existing root's fixed glTF coordinate-conversion quaternion is preserved: identity is in the Blender pose basis, not an edit to the bind orientation.

## Preservation and verification

Animation-only data exported from Blender was appended to the repository originals. A complete Blender model re-export was deliberately not used as the replacement mesh. Existing nodes, mesh data, skinning/bind matrices, materials, embedded images, accessors and all original animation payloads were checked unchanged. The appended result was losslessly compressed, decoded and checked again. Khronos validation reports zero errors/warnings. All new clips were loaded through Three.js GLTFLoader and sampled for finite skeletal deformation, expected duration, matching endpoints, stationary root and constant scales.

Blender authoring files, uncompressed exports, downloaded repository snapshot, scripts and pose-review renders remain in `cambrian/local/update-work/`; they are not required for upload. `notes/` and `validation.json` are delivery records, also optional for the running game. Physical Xbox playtesting has not been performed.
