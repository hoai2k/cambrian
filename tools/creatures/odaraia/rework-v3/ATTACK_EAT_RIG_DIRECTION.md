# Odaraia articulated Attack and Eat — next rig design constraints

8 September 2026. User explicitly requests jointed appendage sequences for attacks and eating.
This file coordinates the later rig; it is not an implemented/validated action handoff.
Keep anatomical suspension filtering distinct from the game's attack choreography.

## Skeleton and deformation

Keep 32 paired biramous limbs and all 20 visible endopod intervals. Limb animation must bend
at successive locations along the shaft, including a distal curl, rather than rotating a rigid
comb at its root. Initial rig design should use independently controlled proximal, middle and
distal flexion regions, aligned with actual podomere boundaries. Resolve the final bone count
and skin performance when freezing the rig; do not silently delete limb pairs for LOD.
Full and reduced models must keep identical skeleton names, hierarchy and bind/rest transforms.
Paddle bases receive independent restrained rotation while endopods flex; filtering spines
follow the segment they grow from. Preserve the rigid valve and independently steerable tail.

Front pairs 1–6 lead gestures with staggered left/right timing. Pairs 7–12 follow with reduced
reach; posterior pairs retain a low-amplitude metachronal swim. Motion must avoid a synchronized
whole-wall sweep. No claw enlargement or generic shrimp antennae. World-up remains +Y and
forward +Z in both geometry and animation; attack targets and anchors use these coordinates.

## Attack sequence (normalized clip time)

| Phase | Time | Visible performance |
| --- | --- | --- |
| Anticipate | 0.00–0.18 | Front limbs withdraw and bend distally; tail braces and body gives a small counter-pitch. |
| Open/reach | 0.18–0.42 | Proximal extension leads middle extension, then distal uncurl; front pairs reach forward/up through the channel. |
| Sweep/contact | 0.42–0.60 | Offset left/right inward-forward sweeps create a clear game contact beat; no invented grasping pincers. |
| Withdraw | 0.60–0.83 | Distal curl begins before proximal recovery; appendages retract along an elevated clearance arc. |
| Recover | 0.83–1.00 | Successive pairs rejoin swimming rhythm, without a hard reset to the same phase. |

Bite uses a compact mouth/nearest-limb pulse. Heavy gets longer anticipation and a stronger
front-limb sweep, not a time-stretched copy of Attack. Keep hit timing tied to actual contact
frames and runtime playback stretching. No full-body translation baked into attacks.

## Eat sequence (consumption-progress performance)

| Phase | Progress | Visible performance |
| --- | --- | --- |
| Orient/reach | 0.00–0.22 | Front pair extends above the shell margin toward the food; successive joints open. |
| Secure | 0.22–0.36 | Adjacent limbs converge around the food with filtering branches; do not turn them into claws. |
| Carry | 0.36–0.67 | Distal curl then middle/proximal flexion brings the food along an elevated arc toward the mouth. |
| Present/feed | 0.67–0.88 | Small anterior limbs and maxillary brushes present food; mandibles work at the oral contact point. |
| Release/recover | 0.88–1.00 | Tips release, mouth settles, limbs reopen and phase back into swimming. |

Use actual reachable poses to place pickup, grip/carry and mouth anchors. The mouth lies near
(0,+0.30,+1.69) in clay units; this is an anatomical design reference, not a final socket.
Transport must follow the moving secure/grip pose and then the mouth, rather than dragging
food on a straight line through the head, limbs or shell. Show food-proxy evidence at each phase.
Scale food/proxy limits to reachable limb span; never stretch bones to reach a far target.

Runtime dependency found by read-only inspection: `src/render/creature.ts` currently includes
only `opabinia` in FEEDING_PERFORMANCE. Odaraia presently loops Eat. After rig acceptance,
parent/integrator must opt Odaraia into progress-driven poseFeeding behavior with matching
attachment/socket records. Otherwise a correct staged clip will replay instead of following
consumption. Review pause/resume, fast/slow consumption and interruption/release behavior.
No shared runtime or anchor manifest was edited in this author pass.

## Delivery and review

Original GLB was read to confirm the exact existing 18 clip names:
Ability, Attack, Bite, Death, Dive, Dodge, Eat, Guard, Heavy, Hit, Idle, **Moult**, Parry,
Rise, Stagger, Swim, TurnLeft, TurnRight. Preserve these names; no Growth replacement.
All clips require distinct motion and fresh evidence. At minimum review Attack and Eat from
side/front/oblique with joint, shell/head, inter-limb and food-proxy clearances at all extreme
poses. Confirm full/LOD skeleton parity and in-game scrubbing before final portraits/audits.
