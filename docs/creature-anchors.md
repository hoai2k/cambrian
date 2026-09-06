# Creature attachment anchors and Opabinia feeding

## Included

- All 21 specimens have `anchor_mouth`, `anchor_mouth_inside`, `anchor_attack_primary`, plus per-appendage attack sockets where the rig has articulated attack parts. 240 named sockets per complete detail-level set, matched in LOD1 (90 original, 150 expansion).
- Opabinia's `anchor_grasp` is a non-deforming child of `proboscis_11`, at the center of the terminal claw, not at the joint origin. Its metadata lists the full 12-bone IK chain. Mouth sockets follow the head. A world-space target supplied by the game stays separate from the moving grasp point.
- Opabinia `Attack`, `Bite`, `Heavy`, `Ability`, `Eat`, and `Grab` now use the revised trunk performance. Attack winds upward/back into a pronounced curve and then unfolds forward as the jaws close. Feeding reaches out, grasps, curls beneath the head and presents food at the ventral mouth. `Grab` is added where absent. The two detail levels share this motion.
- The runtime uses actual consumption progress to pose the feeding clip, solve the grasp point toward prey, transfer the prey beneath the head and shrink it into `anchor_mouth_inside`. Cancelled sessions are cleared. Simulation positions, damage and nutrition rules are unchanged. For other creatures the existing grabbed/swallowed states now follow their available sockets.
- Every rig is driven from whatever sockets it actually has (`src/render/attachments.ts`), nothing is keyed on a species name except which Eat clip is a scrubbed performance (`FEEDING_PERFORMANCE` in `src/render/creature.ts`, from `changedClips` in the manifest):
  - Attacking: while a strike is in its windup/active window (or a pounce), the two articulated attack sockets nearest the victim are solved toward the victim's near surface with a weight that eases in and out, so claws, jaws, raptorial limbs, tentacles, paddles and parapodia visibly land on what the sim is hitting. The victim is the lock target when it is in reach, otherwise the nearest live body ahead of the mouth. Rigs without articulated sockets (Olenoides, Wiwaxia) are left to their clips.
  - Eating: a grasp chain (Opabinia, Anomalocaris) picks the corpse up and carries it under the head to `anchor_mouth`, then into `anchor_mouth_inside`. Without a grasp the corpse travels the same pickup/carry/swallow path from where it fell to the mouth while the nearest articulated limbs close on it (Waptia, Canadia, Marrella, Hallucigenia); a rig with only mouth sockets carries with the mouth alone. A corpse over 1.5x the eater's length stays where it fell and is reached into instead.
  - Impact effects for hits, grabs, parries and guard breaks spawn at the attacker's attack socket nearest the victim when that socket is close to the body it hit, otherwise at the sim's contact point.

## API

`CreatureView.anchors.world(name, outputVector)` returns an attachment's current world position, after animation and all instance transforms. Returns false if missing.

`CreatureView.anchors.solveGrasp(worldTarget, weight = 1, iterations = 14)` runs bounded iterative CCD on Opabinia's trunk (or a configured grasp chain). Call after animation, before rendering. The return value is remaining world-space error; unreachable targets stay finite and do not stretch bones or move the root.

`CreatureView.anchors.solveAnchor(name, worldTarget, weight = 1, iterations = 14)` operates on another articulated attack socket's chain. Non-articulated mouth/body contact points do not have a chain and return Infinity. Socket orientations inherit their parent bone; use world positions for the included positional solver.

`CreatureView.anchors.solveAttack(worldTarget, weight = 1, count = 2, iterations = 8)` ranks the articulated attack sockets by distance to the target and solves the nearest `count` toward it, returning the smallest remaining error (Infinity when the rig has none). `nearestAttack(worldTarget, out)` returns the closest attack contact of any kind, articulated or not. `canGrasp` and `canAim` report what the rig supports; `has(name)` checks one socket.

`Attachments.sync(world, views, dt)` (`src/render/attachments.ts`) is the per-frame pass the engine runs after animation: attack aiming, feeding transfer, grabbed and swallowed placement. It only needs `group`, `anchors`, `visibleLength`, `feedingPerformance` and `poseFeeding` from each view, which is how the headless tests drive it.

Every socket stores `extras.cambrianAnchor` / Three.js `userData.cambrianAnchor` with version, role, parent bone and (when articulated) chain/effector information. Resolve sockets from each cloned instance, not the shared loaded asset. These are socket nodes, not additional skinned/deforming joints, so existing joint indices and weights remain intact.

## Fidelity and limits

Original meshes, skin weights, bind poses, materials and embedded texture bytes are preserved. Olenoides additionally has a continuous skinned ventral body under its armor, surrounding all 30 leg roots; its bounds and existing clips are unchanged. Other specimens' animations are unchanged. Opabinia's requested clips are intentionally revised; its unrelated clips remain. The broad spine-field sockets on Hallucigenia and Wiwaxia are approximate gameplay contacts (marked in metadata), not separate articulated spines. Other tip sockets use the source bones' exact distal endpoints. Mouth sites on Waptia, Marrella and Olenoides are functional anatomical placements on existing simplified mouth regions.

A GLB cannot bind itself to another actor or delete prey. The delivered TypeScript performs that interaction. Corpse feeding and existing grab/swallow states use the sockets available on every species. This does not invent a new catch ability for every species or change hit detection to per-bone collision shapes. Interruption restores normal simulation-driven rendering; carried prey is scaled down during ingestion as a game abstraction; corpses over 1.5 times the eater's length remain where they fell. Live targets must be killed/consumed through the existing game rules before this corpse-feeding path runs.

## Validation

Run `npm run typecheck`, `npm run build`, `node --experimental-transform-types tools/anchors-test.mjs` and `node tools/feeding-test.mjs` from the repository root (Node 22.7+). The headless tests stub texture decoding and exercise actual GLTF loading, cloned sockets, transformed-instance IK, attack aiming on every rig and LOD, and the production attachment pass for all 21 species (grasp, limb and mouth-only feeding, strike aiming and release). They do not test visual texture quality or physical controller input.

All 42 GLBs remain below 25 MB. The 26 expansion files retain 150 anatomical sockets per detail level. Full-detail Olenoides adds 9,696 triangles; LOD1 adds 2,160. Authoring validation checked all 30 leg roots over nine samples of each of 18 clips and found them enclosed by the new tissue.

## Expansion anatomy and authoring

The 13 new species use the identical v1 socket contract in both full and reduced
models. [Expansion authoring](../tools/creatures/README.md) documents exact
Blender-to-parent coordinate conversion, source manifests, append-only
packaging, and validation. Every full model has at least 18 action clips;
LOD models retain locomotion/death plus the same skeleton and sockets.

Nectocaris tentacles, Ottoia's introvert, articulated arthropod feeding limbs,
Burgessomedusa's fringe and radiodont feeding appendages provide bounded CCD
chains. The chains exclude root/body/locomotor bones. Pikaia, Odaraia,
Odontogriphus, Ctenorhabdotus and Vetulicola use animated anatomical contact
points without inventing articulated jaws or prehensile limbs. Optional paired
and individual sockets expose additional contacts through `solveAnchor`.

The generic grabbed/swallowed pass attaches prey to these new sockets;
Nectocaris's new capture ability uses it directly. The merged attachment pass also adapts attack contacts and corpse pickup/carry
to every rig's available sockets. New species retain their authored Eat
performances while feeding-only CCD guides the limbs; species without grasp
chains use mouth transfer. Large corpses remain in place while being consumed.

The registry in `creature-anchors-manifest.json` includes all 42 files.
`tools/update-asset-sizes.mjs` refreshes expansion registry entries and sizes
after packaging. `tools/asset-audit.ts` tests real browser texture decoding,
full/LOD animation and skinning, all articulated socket solves, transformed
instances, clone isolation, and unchanged root/unrelated bones.
