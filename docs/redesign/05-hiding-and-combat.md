# Hiding and native combat

Implemented September 2026. This supersedes the original design's Y signature ability and combat button table. The input field `ability` and the internal animation state `ability` remain for compatibility; Y now exclusively toggles hiding.

## Controls and behavior

- **RT / keyboard G (player 2: apostrophe): heavy attack.** Offensive specials become the creature's native heavy. Existing pounce/charge attacks remain on creatures without a dedicated offensive special.
- **B: block/parry**, or evade for creatures without a guard. Defensive specials run through this action. Hallucigenia and Canadia have a 0.28-second parry window; sustained defense is not invulnerability.
- **Y / keyboard R (player 2: P): hide**, available at every growth tier. Press again to end hiding. Attacking, blocking, sprinting, dodging, taking damage, or being grabbed ends hiding.

### Burrowing

Marrella and Ottoia descend toward the sediment and bury once they reach it. Descent and burial have no stamina drain; burial persists until canceled. A creature blocked above sediment by a rock eventually cancels its descent. Buried creatures disappear after a short settling animation and are excluded from normal visual targeting. Revealing them allows damage; hiding does not grant invulnerability.

Y, light, or heavy while buried emerges with an immediate heavy strike costing zero stamina. The bonus cannot be saved after a defensive exit. This also gives Marrella its emergence attack.

### Camouflage

All other creatures sample the nearest available surface at activation: seafloor, plant, major rock/prop, or living creature (ally or opponent). Distance is measured against approximate surfaces rather than centers. Creature matches use their built-in palette, or sampled authored colors for the default palette. Environment colors share the renderer's biome and instance tint calculations. This matches dominant material colors, not screen pixels, shadows, or individual decorative fragments.

Color morphing takes about one second, preserving model shading and surface variation. Eyes remain dark for environmental matches. The source is named in the HUD. Ending camouflage smoothly returns the creature to its usual colors.

Activation requires 8 stamina and costs 3; maintenance costs 3.5 per second and disables normal stamina regeneration. Exhaustion ends camouflage. Ending hiding imposes a 2-second reactivation cooldown. Burrowing has no activation cost.

Idle camouflaged swimmers gently sink toward the bottom. Any explicit translation input—horizontal steering, rise, dive, or AI movement—cancels this additional sinking; normal currents and movement physics remain. Ground creatures already settle onto the seabed.

Camouflage reduces visual acquisition, particularly while still, and disrupts AI pursuit on activation. Copying the pursuing creature produces stronger initial confusion. Humans can still see and target a camouflaged opponent; teams and friendly-fire rules do not change.

## Native special mapping

| Creature | Former signature now used by |
| --- | --- |
| Anomalocaris | Sprint onset: ambush surge |
| Opabinia | Heavy: snatch/pull |
| Waptia, Pikaia | B defense and evade: tail flick / ribbon slip with silt escape |
| Canadia | Block/parry: bristle flare |
| Hallucigenia | Block/parry: anchored defense and counter |
| Wiwaxia | Hold block: shell defense; release after charging: shove |
| Olenoides | Hold block: enroll and rolling collision |
| Marrella, Ottoia | Y: burrow; free emergence heavy |
| Nectocaris | Heavy: tentacle seize |
| Burgessomedusa | Block: bell corral pulse |
| Odaraia | Heavy: collector wake |
| Cambroraster | Heavy: basket rake |
| Sidneyia | Heavy: shell crush |
| Leanchoilia | Sense: whip search and food collection |
| Isoxys | Heavy: spine intercept |
| Odontogriphus | Block: adhesive glide |
| Ctenorhabdotus | B defense and evade: comb burst |
| Vetulicola | Heavy: pharyngeal pump |
| Tamisiocaris | Heavy: plankton comb |

Dedicated offensive specials cost 18 stamina. Defensive pulses have their own cost/cooldown; ordinary sustained block continues draining stamina. These are gameplay mechanics, not claims about fossil behavior.

## Maintenance and verification

- `src/sim/concealment.ts`: hiding classification, nearest match, AI pursuit disruption.
- `src/sim/game.ts`, `combat.ts`, `ai.ts`: lifecycle, native combat dispatch, perception.
- `src/shared/environment-colors.ts`: shared dominant environment colors.
- `src/render/recolor.ts`, `creature.ts`: per-instance morphing and burial animation.
- After model/material updates, run `node tools/update-camouflage-colors.mjs` to regenerate `src/shared/authored-colors.json`. This only samples colors; it does not modify models.
- `npm run hiding` covers lifecycle, stamina, idle sinking, steering, emergence, native combat dispatch, source matching, and detection. Existing expansion, world, fight, controls, palette, and binding tests also apply.
- `QA_BASE_URL=http://127.0.0.1:4181 node tools/hiding-browser.mjs` checks real keyboard input, rendered camouflage, HUD and heavy dispatch in Chrome. Screenshots go to `../hiding-work/` (create that local directory first).

Status: implemented; tests and browser validation recorded in the delivery commit. No GLBs changed.
