# Hiding and native combat

Implemented September 2026. This supersedes the original design's Y signature ability and combat button table. The input field `ability` and the internal animation state `ability` remain for compatibility; Y now exclusively toggles hiding.

## Controls and behavior

- **RT / keyboard G (player 2: apostrophe): heavy attack.** Offensive specials become the creature's native heavy. Existing pounce/charge attacks remain on creatures without a dedicated offensive special.

  A heavy special is a strike that *travels*: at the windup it turns onto the aimed target (or the
  nearest body ahead) and carries the body forward through its hit window, stopping once it is
  inside its own reach so it lands on the target rather than through it. `HEAVY_STRIKE` in
  `src/sim/expansion-abilities.ts` holds the reach and the carry for every one of them, in body
  lengths, and both eras register into it. Without the carry the button played an animation on the
  spot and the hit windows, all of them inside a body length or two, never reached what the player
  aimed at.

  A special is never a downgrade of the button it took. Because it *replaces* the heavy rather
  than adding to it, `specialHit` (same file) floors its damage and poise against the creature's
  own heavy and keeps the heavy's armour piercing and guard break, so the special's own numbers
  only ever raise them. Every heavy special on both rosters was under that floor before it existed
  — Dunkleosteus' jaw shear landed 40 where its plain bite lands 70 — which made owning a special
  a straight downgrade of RT. The three Cambrian filter-feeding sweeps were the extreme case: they
  did no damage at all, so RT on those three was an attack button that could not attack. They now
  land the creature's own heavy through the same floor while they feed.

  Specials on a button whose action still happens are deliberately *not* floored: the guard
  specials parry and then do their extra (`bellCorral`, `shellUp`, `anchor`, `bristleFlare`,
  `enroll`, `adhesiveGlide`, `brushDisplay`), and the hide specials hide and then do theirs. Those
  are bonuses, so their own smaller numbers are the point.

  The aim prompt reads the same table. It announces the move's own name — "RT · SNATCH", not
  "RT · POUNCE" — lights only inside the reach of *that* move rather than the pounce's much longer
  one, and greys out on the gate the button actually checks (`Game.heavyMove`). The three
  filter-feeding specials (`collectorWake`, `pharyngealPump`, `planktonComb`) never strike a target
  at all, so they never offer one.

  Since September 2026 the button also has a fallback, so it is never dead. A player's RT takes the
  special while the special is up; once it is not — cooling down, or too little stamina — the press
  falls through to the ordinary heavy or pounce instead of being swallowed. `Game.heavyMove` follows
  it, so the prompt names whichever of the two the button would actually do. Bots keep the plain
  split, which leaves their behaviour and every seeded replay unchanged. This matters most to the
  filter feeders, whose special never strikes anything: before the fallback a player Tamisiocaris
  had no attack on RT at all, and the `Heavy` clip in its model never played.
- **The charge.** RT pressed while sprinting or mid-dash is the same move, thrown along the line
  the body is actually travelling rather than along the nose, for `CHARGE_STAMINA` on top of the
  move's own cost. A sprint has already chosen a direction and the nose swings round far more
  slowly than the body crosses ground, so the standing pounce's cone off the heading misses the
  animal you are about to swim straight past; `chargeTarget` measures how far along the line a body
  sits and how far off it instead, and takes the nearest thing inside that corridor. Out of a dash
  it cancels the dash, which costs the invulnerability that was left — you have chosen to commit
  rather than to escape. It costs the rest of the dash's travel too: a charge that finds something
  halfway through leaves the dash covering only the ground it had crossed by then, and if that
  lands on a body the creature stops there and eats. That is the trade working, not the dash being
  cut short by a bug — the distance is what you spend to turn the escape into an attack. The whole heavy button lives in one place (`Game.heavyAction`), so the
  charge reaches the creature's special, its pounce and the burrow emergence exactly as a standing
  press does.
- **Close attacks nudge onto their target.** A light attack turns up to `AIM_NUDGE` (23°) onto the
  nearest body inside a 63° cone within about two body lengths. A bite whose mouth reaches four
  tenths of a body length has no tolerance at all otherwise, and missing by a few degrees at that
  range reads as the game ignoring the press. The cap is what keeps it a nudge rather than an
  auto-aim, and it never picks another player: who you attack stays your decision.
- **A shell faces where it is going.** The nautiloids' funnel makes them fast and makes rising
  and sinking free, but it does not turn them round: swimming, sprinting and an aimed dash all go
  where the stick points with the nose leading, because travelling shell-first under power read as
  the animal spinning rather than as a jet. The funnel shows up in two places instead — the free
  hover, and a dash with **no stick direction**, which fires out behind the body. Through that one
  the body holds the heading it already had, so the shell leaves backwards with its head still
  pointed at whatever it is backing away from. Turning to follow that velocity would spin the
  animal, and the camera with it, through 180° at the one moment it wants to keep its eyes on the
  thing it is escaping.
- **B: block/parry**, or evade for creatures without a guard. Defensive specials run through this action. Hallucigenia and Canadia have a 0.28-second parry window; sustained defense is not invulnerability.
- **D-pad right / keyboard R (player 2: P): hide**, available at every growth tier. Press again to end hiding. Attacking, blocking, sprinting, dodging, taking damage, or being grabbed ends hiding.

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
