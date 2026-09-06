# Creature attachment anchors and Opabinia feeding

## Included

- All eight specimens have `anchor_mouth`, `anchor_mouth_inside`, `anchor_attack_primary`, plus per-appendage attack sockets where the rig has articulated attack parts. 90 named sockets per complete detail-level set, matched in LOD1.
- Opabinia's `anchor_grasp` is a non-deforming child of `proboscis_11`, at the center of the terminal claw, not at the joint origin. Its metadata lists the full 12-bone IK chain. Mouth sockets follow the head. A world-space target supplied by the game stays separate from the moving grasp point.
- Opabinia `Attack`, `Bite`, `Heavy`, `Ability`, `Eat`, and `Grab` now use the revised trunk performance. Attack winds upward/back into a pronounced curve and then unfolds forward as the jaws close. Feeding reaches out, grasps, curls beneath the head and presents food at the ventral mouth. `Grab` is added where absent. The two detail levels share this motion.
- The runtime uses actual consumption progress to pose the feeding clip, solve the grasp point toward prey, transfer the prey beneath the head and shrink it into `anchor_mouth_inside`. Cancelled sessions are cleared. Simulation positions, damage and nutrition rules are unchanged. For other creatures the existing grabbed/swallowed states now follow their available sockets.

## API

`CreatureView.anchors.world(name, outputVector)` returns an attachment's current world position, after animation and all instance transforms. Returns false if missing.

`CreatureView.anchors.solveGrasp(worldTarget, weight = 1, iterations = 14)` runs bounded iterative CCD on Opabinia's trunk (or a configured grasp chain). Call after animation, before rendering. The return value is remaining world-space error; unreachable targets stay finite and do not stretch bones or move the root.

`CreatureView.anchors.solveAnchor(name, worldTarget, weight = 1, iterations = 14)` operates on another articulated attack socket's chain. Non-articulated mouth/body contact points do not have a chain and return Infinity. Socket orientations inherit their parent bone; use world positions for the included positional solver.

Every socket stores `extras.cambrianAnchor` / Three.js `userData.cambrianAnchor` with version, role, parent bone and (when articulated) chain/effector information. Resolve sockets from each cloned instance, not the shared loaded asset. These are socket nodes, not additional skinned/deforming joints, so existing joint indices and weights remain intact.

## Fidelity and limits

Original meshes, skin weights, bind poses, materials and embedded texture bytes are preserved. Olenoides additionally has a continuous skinned ventral body under its armor, surrounding all 30 leg roots; its bounds and existing clips are unchanged. Other specimens' animations are unchanged. Opabinia's requested clips are intentionally revised; its unrelated clips remain. The broad spine-field sockets on Hallucigenia and Wiwaxia are approximate gameplay contacts (marked in metadata), not separate articulated spines. Other tip sockets use the source bones' exact distal endpoints. Mouth sites on Waptia, Marrella and Olenoides are functional anatomical placements on existing simplified mouth regions.

A GLB cannot bind itself to another actor or delete prey. The delivered TypeScript performs that interaction. Its corpse-feeding transfer is implemented for Opabinia; existing grab/swallow states use sockets for all species. This does not invent a new catch ability for every species or change hit detection to per-bone collision shapes. Interruption restores normal simulation-driven rendering; very large prey is scaled down during ingestion as a game abstraction. Live targets must be killed/consumed through the existing game rules before this corpse-feeding path runs.

## Validation

Run `npm run typecheck`, `npm run build`, `node --experimental-transform-types tools/anchors-test.mjs` and `node --experimental-transform-types tools/feeding-test.mjs` from the repository root (Node 22.7+). The headless tests stub texture decoding and exercise actual GLTF loading, cloned sockets, transformed-instance IK, and the production attachment pass. They do not test visual texture quality or physical controller input.

All 16 GLBs remain below 25 MB. Full-detail Olenoides adds 9,696 triangles; LOD1 adds 2,160. Authoring validation checked all 30 leg roots over nine samples of each of 18 clips and found them enclosed by the new tissue.
