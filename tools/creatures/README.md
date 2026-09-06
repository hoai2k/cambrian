# Expansion creature asset pipeline

The expansion consists of Pikaia, Nectocaris, Burgessomedusa, Odaraia, Ottoia,
Cambroraster, Sidneyia, Leanchoilia, Isoxys, Odontogriphus, Ctenorhabdotus,
Vetulicola and Tamisiocaris. The shared packaging and socket tools accept only
these IDs and verify that the original eight creatures' files remain unchanged.

Run the pipeline in this order:

1. **Build.** Follow the authoring instructions in `soft/README.md`,
   `jellies/README.md`, and `arthropods/README.md`. Generate the full and actual
   reduced LOD meshes, all animations, cards and editable Blender sources.
   Inspect geometry and action poses, and run the group's raw-export checks.
2. **Package.** Run `node tools/creatures/package-expansion.mjs`. This applies
   lossless meshopt buffer compression without geometry quantization. Full
   files retain all animations/textures; LODs retain their reduced geometry,
   vertex colors and Idle/Swim/Crawl/Death, with textures removed. Numerical
   attributes, oriented triangles, node/skin graphs and retained animation
   samples must round-trip exactly. Existing uncompressed input backups remain
   under `cambrian/local/expansion-authoring/`.
3. **Add anatomical anchors.** Run `node tools/creatures/add-anchors.mjs`.
   It consumes all three groups' `anchors.json` manifests and appends sockets
   to full and LOD files by editing GLB JSON directly. The BIN chunk, existing
   node indexes/properties, animation data, skins and mesh data are unchanged.
   Only new nodes and corresponding additions to parent `children` arrays are
   permitted. A second application must return byte-identical files.
4. **Render selection portraits.** Run `node tools/art/decode-models.mjs` with
   the expansion IDs, then Blender with `tools/art/render-creatures.py -- <ids>`.
   This creates matching 1600×1200 transparent `.select.png` images for the
   merged picker. Use `CAMBRIAN_ART_MODELS` to keep render inputs locally.
5. **Create thumbnails.** Run `node tools/make-cards.mjs` with the 13 expansion
   IDs above. Authored alpha is preserved; this also creates 256×192 grid
   thumbnails and records appearance fingerprints. Do not omit IDs when
   preserving the original roster artwork.
6. **Update byte sizes and registry.** Run `node tools/update-asset-sizes.mjs` after the
   anchor pass, since the added JSON changes file sizes. Then run the normal
   integration build/typecheck and game verification.

Both shared tools accept an optional list of expansion IDs for a partial
rebuild. For example:

```sh
node tools/creatures/package-expansion.mjs odaraia sidneyia
node tools/creatures/add-anchors.mjs odaraia sidneyia
node tools/update-asset-sizes.mjs
```

`node tools/creatures/add-anchors.mjs --check` validates the full expansion
without writing any files. Do not rebuild or repackage assets after adding
anchors without repeating the anchor validation and final sizes step.

## Anchor source and exported runtime contract

Each group manifest is a map from species ID to records containing
`name`, `bone`, `point`, `role`, and optional CCD information. `point` is the
source Blender **world bind-pose** location. The socket tool converts
`[x,y,z]` to glTF `[x,z,-y]` and then applies the inverse world bind matrix of
the named parent bone. The resulting translation is parent-local. Model
position, rotation, and scale remain under runtime control.

Every specimen must provide:

- `anchor_mouth`, role `mouth`, on the actual anatomical feeding surface.
- `anchor_mouth_inside`, role `swallow`, just inside the feeding passage.
- `anchor_attack_primary`, role `attack`, at the actual active contact region.

Legacy source role `mouth_inside` is normalized to `swallow`. Additional paired
attack and grasp sockets support concurrent contacts. Color/behavioral
interpretations and anatomical placement decisions are documented in each
model group's README.

Each exported socket node has exactly the shared runtime metadata form:

```json
{
  "extras": {
    "cambrianAnchor": {
      "version": 1,
      "role": "attack",
      "parentBone": "raptor_1_4",
      "chain": ["raptor_1_0", "raptor_1_1", "raptor_1_2", "raptor_1_3", "raptor_1_4"],
      "effectorBone": "raptor_1_4",
      "solver": "CCD"
    }
  }
}
```

`chain`, `effectorBone`, and `solver` are omitted for ordinary sockets.
CCD chains must be ordered, directly connected, and contain feeding appendage
bones only. They cannot include root, body or segment locomotor bones. The
final chain member and effector must be the socket's parent. Single-joint
coxa contacts are meaningful when their contact lies away from that joint's
origin. Source `contactType` is anatomical authoring guidance, not additional
runtime metadata.

## Audit artifacts

Shared tools save immutable inputs and JSON audits under
`cambrian/local/expansion-authoring/packaging/` (or `CAMBRIAN_PACKAGING`):

- `packaging.json`: compressed sizes and exact decoded-data preservation.
- `anchor-validation.json`: final post-anchor sizes, socket coordinates,
  chain metadata, world-position reconstruction errors, exact BIN hashes,
  append-only graph validation, idempotence, and original-roster file hashes.

The anchor tool prepares and validates the entire chosen batch before writing
any files. Missing anatomy records, invalid parents/chains, conflicting existing
sockets or mismatched required roles fail before a batch can replace assets.
