# Odaraia V3 production plan03 — articulated legs, attack and oral carry

8 September 2026. Astra high creative plan only. No rig source, Blender execution, runtime implementation or new geometry is authorized by this document alone. Parent schedules a separately frozen implementation after review. The current M02 is a coarse production starting point, not final delivery approval.

## Reviewed basis

Read `root-review-material02.md`, `ATTACK_EAT_RIG_DIRECTION.md`, the actual `build_clay02.py`, material report and current anchor/attachment/runtime code. Independently inspected all six actual M02 images: dark oblique, dark side, dark front, light oblique, light side and light underside. Manifest SHA-256 `eabb28c993294e62c3bbdf47a122caf2116a56acd97ba59fc60e19848a5a3139`; accepted coarse geometry hash `b4086bbddf3bfb5a6551964df927f3a69fa8bbf79a2a1f405f23053a0df0023f`. Preserve these inputs and the original backups.

The upward endopods are prominent in side and front, the lower paddles remain distinguishable, and the translucent wrapping shell exposes the trunk. The conspicuous repetition is a motion/posture problem: rows of similarly bent shafts and aligned paddle faces read as a rigid fan. Do not shorten, hide or delete pairs to solve it. The lower corneal rim remains conspicuously white in front/underside views; retain it as a later focused material/eye interface review item. Do not add a fish iris or claim an old eye audit applies.

The geometry has exactly 32 bilateral limb pairs, 20 visible endopod intervals per limb, separately authored spinose endites and ovate exopods. The authoring coordinates are already game coordinates: +Y up/ventral, +Z forward. The shell is one continuous thick U-shaped valve surface, not two independently flapping cloth panels. Mouthparts include the hypostome/labrum, paired toothed mandibles, tentative maxillary brushes/lobes and small central tooth. Production rigging must load M02; it must not execute the clay builder or replace the approved mesh with a shared creature generator.

## Skeleton: approximately 406 bones, not 1,300

Use the same named skeleton, hierarchy, bind matrices, socket transforms and all eighteen actions on full and LOD. Four deform regions can articulate a 20-interval shaft without allocating a bone to every small interval. Keep the original interval geometry in both detail levels.

| Group | Layout | Count |
| --- | --- | ---: |
| Limb endopods | 4 serial bones × 64 limbs | 256 |
| Exopods | independent root pitch + restrained distal camber, 2 × 64 | 128 |
| Root/body/head | scene root, rigid body core, head | 3 |
| Exposed trunk | 3 serial posterior controls | 3 |
| Terminal tail segment | 1 continuation | 1 |
| Tail blades | root + distal control for each of 3 blades | 6 |
| Eyes | 1 for each complete peduncle/cup/globe unit | 2 |
| Mouth | labrum 1, mandibles 2, maxillary brush chains 2 × 2 | 7 |
| Total | includes the nondeforming root; socket nodes are additional ordinary nodes | **406** |

This is a proposed ceiling for the first authored candidate, not a measured runtime cost. Approximately 405 joints need skin matrices; a 406-matrix palette is about 26 KB before texture padding. Animation evaluation, vertex skinning, draw calls and crowds still require actual measurement. There is no benefit in creating 32 trunk bones merely to mirror visible tergite count inside an otherwise rigid valve.

Names: `root`, `body_core`, `head`, `trunk_free_01..03`, `tail_terminal`, `tail_L_01..02`, `tail_R_01..02`, `tail_dorsal_01..02`, `eye_L`, `eye_R`; `limb_01_L_prox/mid/dist/tip` through `limb_32_R_*`; `paddle_01_L_base/tip` through `paddle_32_R_*`; `labrum`, `mandible_L/R`, `maxilla_L/R_base/tip`. Avoid generic `body_01` / `segment_01` names for the limb rig: current runtime discovers those names for additive spine behavior. Check all other runtime name selectors before freezing.

The shell is 100% `body_core`; no shell flap, cloth weight or arbitrary shell scale animation. Covered trunk shares the core with only locally smooth junctions into exposed posterior tissue. Three free-trunk bones start near the posterior aperture and end at the terminal segment; exact roots come from actual surface/limb insertion coordinates. Pin the tissue around each limb insertion to its actual parent frame, with trunk blending between insertion bands, so a root never drifts off a differently weighted trunk. Shell/head articulation is tiny and checked at the anterior aperture. Head and mouth sockets inherit that real frame.

## Endopod and paddle construction/weights

Recover limb curves and interval provenance from the actual builder's formulas **without running its scene creation**. Verify the recovered landmarks against the loaded object coordinates and stored limb metadata. The visible interval boundaries are `u(q)=(q/20)^1.22`. Place the four serial endopod bones at q=0→6→13→17→20, approximately following proximal, knee, distal and curled terminal regions. q=13 is near the authored curve's u=.58 knee. This preserves the actual bent rest shaft rather than inserting a generic straight chain.

Blender bone local +Y follows each rest chord. Roll is derived from the local bending plane, with a continuous fallback frame where the curve is nearly straight. Verify the positive curl direction on each side by moving a test point: it must bend toward the intended filtering/feeding side. Mirror via anatomical frames and quaternion motion, never negative object scale or a blindly reused Euler sign.

Use controlled weights, not heat weights across neighboring limbs:

- Most podomere surfaces are rigid to their owner region. Blend only across narrow collar neighborhoods at the three controlled boundaries; keep the 20 modeled intervals legible. Two weights normally suffice; four is the hard export maximum.
- Each endite/spine keeps the same segment owner as its exact shaft attachment. Pin the attachment region to that owner; blend at collar rings between interval centers, away from the spine roots. Do not nearest-distance weight spines to the adjacent limb or independently bend every tiny spine.
- Each paddle starts at the same actual root as its endopod, but is a sibling branch. Its two bones follow stations u=0→.55→1. The base pitches independently; the tip contributes modest camber. The supporting rod and lamellae follow that local field. They do not become a flapping membrane.
- Tail blade weights similarly distribute camber along each actual rest loft, preserving thin margins. The downward dorsal blade in the inverted pose remains distinct from the lateral pair.
- Eye control moves the complete cup/support and globe together about the peduncle base, with only a few degrees of gaze. Do not rotate a detached globe inside a stationary cup to conceal the bright lower rim. Tentative sensory organs follow the head; posterior oral lobes follow their associated mouth frame.

Author FK/curve controls and optional reach handles in an editable control collection; export only the baked deform hierarchy and semantic sockets. No B-Bone segment evaluation, spline constraint or Blender driver is assumed to work in glTF. Use author-time constrained solving to generate the four actual bone rotations; never scale/stretch a chain to reach food.

## Motion language and timing

Swim begins from the accepted varied rest curves. Use a traveling limb phase `2π*time/period - .58*pairIndex + sideOffset`, with an approximately 1.05-radian side offset and small fixed per-pair asymmetry. The distal region follows the middle region after a perceptible delay, and the paddle power stroke has its own lag. Make cyclic endpoints and derivatives agree; randomness must be deterministic and not evaluated at runtime. No single identical root rotation on all 64 limbs.

Initial swim amplitudes for authoring: proximal sweep 8–12°, mid flexion 12–18°, distal flexion 15–22°, terminal curl 8–14°; paddle pitch 10–16°, paddle-tip camber 3–7°. These are starting controls, not proven anatomical joint limits. Reduce amplitudes where actual shaft/filter/valve clearance demands it, while keeping distal flexion visibly different from root rotation. During Attack/Eat, pairs 1–6 lead; 7–12 follow at roughly half reach; 13–32 sustain a smaller metachronal beat. Recovery restores each pair to its own gait phase rather than resetting a whole wall.

Use in-place clips. Tail braces or countersteers before limb acceleration; the rigid coat follows small whole-body pitch/yaw. The sim owns actor travel. Root translation remains zero, scales positive and generally constant. Timing uses normalized clip progress so runtime playback stretching preserves the intended contact beat.

| Clip | Proposed seconds / behavior |
| --- | --- |
| Idle | 2.4 loop: quiet phased filtering, small brush work and tail trim; clear limb motion at reduced amplitude. |
| Swim | 1.4 loop: rolling metachronal power/recovery, independent paddle pitch and distal curl. |
| TurnLeft | 1.2 loop/additive contract as current loader requires: left-side braking with opposite-side reach and tail rudder; no shell collapse. |
| TurnRight | 1.2: anatomically mirrored control intent, retaining each side's phase. |
| Rise | 1.3 loop: upward/forward channel-directed stroke and tail incidence, inverse body counter-pitch. |
| Dive | 1.3 loop: distinct paddle recovery/steering and opposite incidence, never invert the animal to legs-down. |
| Dodge | .8: compact bilateral limb withdrawal then asymmetric lateral release, tail snap/settle. |
| Guard | 1.6 loop: anterior limbs form a bent protective filtering basket above/in front of the head; posterior limbs still trim. |
| Parry | .85: one-sided anterior interception, opposite-side brace, distal-first withdrawal. |
| Attack | 1.3: sequence below; contact around .50 normalized progress. |
| Bite | .70: nearest two pairs present/brace while mandibles make a compact pulse; no giant head lunge. |
| Heavy | 1.8: .00–.30 loaded withdrawal; .30–.52 serial extension; .52–.64 stronger cupping sweep; staggered extended recovery. Distinct control curve from Attack. |
| Ability | 2.0: anterior-to-posterior filtering-basket expansion and coordinated tail brace, then rolling refold; avoid a synchronous entire fan. |
| Eat | 3.0 reference duration, **progress-driven**, staged pickup/carry/oral presentation below. |
| Hit | .65: localized recoil propagates from front to tail; limb curl lags the body response. |
| Stagger | 1.4: interrupted beat, alternating asymmetrical attempts to recover, eventual phase restoration. |
| Moult | 3.2: slow tension/relaxation with alternating distal release and a traveling trunk/limb shake. Keep rigid valve shape; no invented hinged opening or vanishing exuvia. |
| Death | 2.8 nonloop: progressively arrested beats, unequal limb curl and relaxed tail; final 25% is a held settled pose. No loop or immediate bind reset. |

Preserve exactly: Ability, Attack, Bite, Death, Dive, Dodge, Eat, Guard, Heavy, Hit, Idle, Moult, Parry, Rise, Stagger, Swim, TurnLeft, TurnRight. **All eighteen on full and LOD.** Moult is not renamed Growth; do not inherit the old documentation's locomotion-only LOD reduction.

Attack: .00–.18 withdraw front limbs and load their distal bends; .18–.42 proximal then middle extension, followed by terminal uncurl; .42–.60 offset inward/forward contact sweeps; .60–.83 distal-first elevated withdrawal; .83–1 staggered re-entry to swimming. Offset successive leading pairs by roughly .015–.025 progress and the opposite side by .025–.04; do not delay so much that actual contacts miss the active window. Freeze exact action markers against the current simulation active window during implementation. Filtering limbs remain finely spinose, never enlarged claws.

## Eat path and semantic contacts

Reachable choreography comes before socket coordinates. Establish a front-pair cupping pose around a small food proxy, then derive `anchor_grasp` from that actual contact. Pair 1L is the lead carrier, 1R provides counter-support; pairs 2–3 steady/present, pairs 4–6 open an elevated clearance lane. A socket is a fixed local child of a real effector, not an animated root-level point that makes the food move independently of the hands.

Use the current runtime attachment moments: food attaches at **.22**, carry interpolation runs .22–.78, ingestion .78–1. This refines the earlier direction document's .22–.36 secure phase: first valid contact must already exist at .22. Complete cupping/settling during .22–.36 while keeping the contact nearly stationary; carry .36–.67; present to the mouth .67–.78; feed/shrink/release .78–1.0. The tip follows an elevated arc, with distal curl leading middle and proximal recovery.

Candidate path for constrained authoring, not frozen sockets: food starts near (0,1.10,2.02), clears the head near (0,.70,1.92), moves posteriorly above the oral apparatus near (0,.47,1.69), then descends to the measured oral contact near (0,.30,1.69). The last descent occurs **behind the labrum**, not diagonally through its broad triangular plate. Start a small proxy around .06–.08 diameter; determine the final limit from the actual open mandibles/central tooth/brush clearance. No final reach or aperture claim follows from these draft coordinates. The sculpt contains mouthpart surfaces but no newly certified open pharynx; do not invent an inside socket far behind a sealed head and call the transit verified. Food must be sufficiently reduced at visible oral contact before its final concealment.

| Socket | Parent and meaning |
| --- | --- |
| `anchor_mouth` | `head`, at actual oral presentation center between moving mandibles; not head origin. |
| `anchor_mouth_inside` | `head`, shallow local concealment point behind the measured oral entrance; actual section/proxy proof required. |
| `anchor_attack_primary` | exact alias of the lead 1L contact, same parent/position/chain so runtime deduplication spends its two-contact budget on distinct tips. |
| `anchor_attack_01_L/R` through `anchor_attack_06_L/R` | actual anterior endopod terminal contact, child of each `tip`; chain excludes body/head/shell. Do not register all 64 limbs for per-frame target aiming. |
| `anchor_grasp` | lead `limb_01_L_tip`, local offset from its filtering pad to the food center in the verified secure pose. Companion limbs are authored around that same physical food center. |
| optional mouthpart debug contacts | child of corresponding mandible/maxillary tip; non-attack roles, only if helpful for measured presentation. |

Use v1 `cambrianAnchor` metadata with exact `parentBone`, role, effector and ordered chain. Every chain is actual ancestry; full/LOD expose identical records. Initial limb chain is prox→mid→dist→tip. Root/body/shell/eyes never enter a grasp or strike chain. Cup geometry must visibly support the grasp offset throughout carry; a long offset that magically transports a proxy is unacceptable.

## Current runtime finding and required proof

The earlier direction note's hard-coded species concern is now partly stale. `src/render/creature.ts` still lists only Opabinia in `FEEDING_PERFORMANCE`, **but** it also accepts root `cambrianFeeding` metadata: `{version:1, mode:'authored-grasp', clip:'Eat', apertureDiameter, pickupOffsetLimit}` with valid grasp and inside-mouth sockets. That path stops other actions/additives, pauses Eat at the requested consumption progress and follows the authored contact. Prefer this existing metadata path; do not add a species special case automatically.

The current `feedAuthored` path applies only the real pickup offset as CCD, transfers the common offset to companion attack chains, follows the authored grasp during carry, rejects unreachable/large food and uses the .22/.78 transfer schedule above. Set final `apertureDiameter` and `pickupOffsetLimit` from measurements; initially study a small offset around .02–.03 model units. Keep oversized carcasses stationary with a reach pose, not a stretched empty-handed carry.

**Current generic CCD has no per-joint anatomical angular limits.** Its .22-radian per-iteration cap is not a total joint limit. Therefore source FK limits alone do not certify runtime aiming. During the implementation handoff, either the parent provides actual bounded joint-limit support for these chains or the measured allowed target/offset domain must demonstrate acceptable poses under the existing solver. Do not silently publish unrestricted chains after checking only the baked clip. Review actual post-CCD poses, unreachable targets, nearly straight chains, and coupled two-contact corrections. If this cannot preserve shell/head/neighbor clearance, return the narrowly scoped runtime contract decision to the parent; do not change shared runtime in this plan.

## Bake, reduction and execution cost

1. Freeze rig/weight/action source on the exact M02 blend and material fields. First create a low-cost kinematic evidence stage: bones/limbs/shell and small food proxy, a few Attack/Eat extremes, numeric ownership/clearance checks. Do not bake high-resolution maps or export eighteen clips while a basic carry path is still wrong.
2. After those poses pass art review, bake anatomy-specific pigment, normals, roughness and shell alpha/coverage. The Cycles transparent mix is not an export material contract. Preserve olive shell pigment/opaque physical margins and visible internal silhouette; omit the hidden half-shell study from exports. Keep outer shell/inner shell treatment explicit and test Three.js sorting against light and dark water. Start with a standard baked alpha/PBR candidate, not an assumed transmission effect the runtime may discard.
3. Consolidate opaque objects by material/semantic ownership into a few skinned draws; keep the transparent shell separate. Preserve per-vertex part/limb/interval provenance before joining so weights, pigment, endite ownership and LOD transfer remain auditable. Avoid hundreds of independent draw objects. Bone indices above 255 require a valid supported accessor/component choice; never cast them to uint8.
4. Bake all constraints to quaternion rotations at an initial 24 fps, retain explicit anticipation/contact/recovery samples, then reduce redundant keys with measured end-effector and surface error. Retain exact Death hold and loop boundaries. Prefer shared time accessors and lossless packaging before any motion decimation. Record actual clip/track/sample bytes and skeleton costs.
5. LOD preserves 32 pairs and 20 shaft intervals. Reduce radial sides and redundant loft rings first, protect collars and tips; simplify paddle lamellae and individual tiny spine cross-sections without erasing their rooted silhouette. Retain every endopod/exopod and the three tail blades. Preserve final UVs/semantic pigment; sample accepted color after reduction rather than allowing decimation to extrapolate invalid albedo. No pair deletion or three-clip default.
6. Export full/LOD from the same evaluated deformation source and verify exact skeleton/action/socket parity. Initial planning targets are about 80–120k full and 30–50k LOD triangles, subject to actual topology/readability measurements, not permission to damage the filtering structures. Measure packed size and real browser crowds; do not claim a 406-joint rig is cheap merely because it is smaller than 1,300.

First production candidate must provide real GLB evidence for Attack .00/.18/.42/.50/.60/.83/1 and Eat .00/.22/.36/.52/.67/.78/.88/1, with matched full/LOD at decisive contact/carry poses. Use side/front/oblique and a shell cutaway diagnostic only alongside intact-shell views. Track local hard-shaft/filter-root/neighbor, shell/head and food-proxy clearance over sufficiently dense sweeps; tolerances derive from actual shaft radii and observed rest insertions, with intentional attachment regions explicitly identified. Do not hide failures in broad collision exclusions.

Then validate all eighteen clips, held Death, positive scales, normalized ≤4 weights, material/pigment ranges, alpha sorting, clone isolation, transformed anchors, post-CCD behavior and progress-driven Eat (pause/resume, consumption speed changes, interruption/release). Test both raw exports and final packaged assets in the current runtime. Run final actual eye support/volume and creature audits on the new completed candidate, followed by portraits/intake only after explicit art approval. Parent owns runtime integration, shared manifests, public assets and Git.

**Next action:** parent/Astra reviews this plan, then separately author a bounded kinematic rig source with frozen execution inputs. This document supplies no Blender execution command and does not authorize a production rebuild. Return attention to the waiting Bothriolepis M04 actual art review.
