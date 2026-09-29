# Specials audit (2026-09-29)

Two questions, for every playable animal in all three games:

- **Does its special look and behave like a distinct action?** Burrowing is the benchmark: you see
  the animal go into the sand, it is hidden, and it comes out striking.
- **Where would it sit on a controller under the proposed scheme?**
  1. **Y is overridden first.** If the animal does not naturally camouflage or burrow, Y is its
     special.
  2. **If it does camouflage or burrow in life,** Y stays camouflage/burrow and B (guard) becomes
     the special.
  3. **With two specials,** the more defensive goes on B and the other on Y.

This was measured off the live rosters (`PLAYABLE`, `def.ability`, `HEAVY_SPECIALS`,
`DEFENSIVE_SPECIALS`, `BURROWERS` after each era's install, `RULES.ySpecial`). Nothing was
changed; this is a proposal.

## How specials are reached today

- **RT (heavy)** fires a special when the animal's ability is in `HEAVY_SPECIALS`
  (`heavyAction`, `src/sim/game-moves.ts`). Otherwise it pounces.
- **B (guard)**:
  - A creature with `canGuard` gets parry and guard. `DEFENSIVE_SPECIALS` modify that guard
    (`game-actor.ts`, the parry/guard branch; effects in `combat.ts`).
  - A creature without `canGuard` dodges instead. A tail-flipper's dodge is its flip.
- **Y (ability)** calls the era's `RULES.useAbility`, which the Devonian and Triassic have and the
  Cambrian does not. Failing that, it hides: burrow for `BURROWERS`, otherwise camouflage.
- **Everything else:**
  - `ambushSurge` fires on a *sprint* press, and players no longer have sprint.
  - `tailFlick` and `ribbonSlip` ride on every dash.
  - `scavenge`, `armSpread` and `stiltWalk` are passive.
- **No animal has more than one special** (`def.ability` is a single field). So no animal has two
  specials, or two specials plus camouflage.

## Which specials are distinct

**Distinct** — each looks and behaves like its own act:

- `burrow` / `sandAmbush`
- `enroll` (rolls into a ball)
- `snatch` (a visible yank)
- `spineIntercept` (a committed ramming pass)
- `runThrough` (a long carry through the target; borderline)
- `ink` (a cloud that breaks locks)
- `podCall` (the pod converges and shields)
- `brushDisplay` (routs hunters; faint on screen)
- `coil` (instant about-turn; shelved animal)
- The feeding modes (`collectorWake`, `planktonComb`, `pharyngealPump`, `floorSweep`,
  `filterGulp`, `scrapeSieve`, `comb`). They have their own pose, but they are for feeding, not
  combat.

**Not distinct** — the same act as a bite, guard or burst, with different numbers:

- **Heavier or special-cased bites:** `tentacleSeize`, `basketRake`, `shellCrush`, `jawShear`,
  `tuskLunge`, `crushBite`, `armourFlank`, `tridentShove`, `shieldPush`, `neckSnap`,
  `cheliceraeGrab`, `exhaustionHold`, `fangTrap`, `neckStrike`, `whorlSaw`, `sideSwipe`,
  `suctionSnap`. All go through one `startAbility` path and a shared strike table.
  - `basketRake` does reveal hidden bodies, which is unique, but it looks like a normal heavy.
  - `crushBite` adds a spark.
- **Guard variants with no look of their own:** `bristleFlare` (thorns), `anchor`, `shellUp`,
  `bellCorral` (a ring with no visual), `bellyTurn` (invisible).
- **Invisible speed buffs:** `ambushSurge`, `shoalDart`, `limbHaul`, `shellJet` (its description
  says it jets backwards; the code does not), `powerStroke`.
- **Dash riders:** `tailFlick`, `ribbonSlip`.
- **Stealth that duplicates camouflage:** `shellHover`.
- **Passive stat changes with no button:** `scavenge`, `armSpread`, `stiltWalk`.

**Dead** — code exists, but nothing can reach it:

- `whipSearch` (Leanchoilia)
- `sedimentDive` (Ottoia)

Both are only entered through `startAbility`, which is gated on `HEAVY_SPECIALS`, and neither is in
that set.

**The clips exist but are not played.** Every shipped body carries bespoke clips (`NeckStrike`,
`CrushBite`, `SpineBrace`, `Gulp`, `Graze`, `Coil`, `Dart`, `Lunge`, `Pry`, …) and nothing in `src`
plays them.

- **Heavy specials** play the shared `Ability` clip.
- **Instant Y specials** play no clip. They get sparkles and a sound.

Wiring those clips up would make several of the "not distinct" strikes look like their own act at
no gameplay cost. That may be the cheaper answer than removing them.

## Proposed mapping

"Camo in life" is a judgement about the real animal. Rows where the scheme moves something are
marked ⚠.

| Game | Animal | Special | Camo in life | Y | B | Note |
|---|---|---|---|---|---|---|
| Cambrian | anomalocaris | ambushSurge | no | **special** | guard | ⚠ today on a sprint press nobody has |
| | opabinia | snatch | weak | **special** | guard | ⚠ from RT |
| | waptia | tailFlick | yes | camo | **special** | ⚠ today a dash rider |
| | canadia | bristleFlare | no | **special** | guard | ⚠ a guard modifier; see open question 3 |
| | hallucigenia | anchor | yes | camo | special | fits already |
| | wiwaxia | shellUp | weak | **special** | guard | ⚠ guard modifier |
| | marrella | burrow | — | burrow | guard | the burrow *is* the special |
| | olenoides | enroll | yes | camo | special | fits already |
| | pikaia | ribbonSlip | weak | **special** | guard | ⚠ today a parry/dash rider |
| | nectocaris | tentacleSeize | plausible | camo | **special** | ⚠ from RT |
| | burgessomedusa | bellCorral | yes | camo | special | fits already |
| | odaraia | collectorWake | weak | **special** | dodge | ⚠ from RT |
| | ottoia | sedimentDive | burrows | burrow | **special** | ⚠ dead today; needs an entry point |
| | cambroraster | basketRake | weak | **special** | guard | ⚠ from RT |
| | sidneyia | shellCrush | plausible | camo | **special** | ⚠ from RT |
| | leanchoilia | whipSearch | weak | **special** | guard | ⚠ dead today |
| | isoxys | spineIntercept | weak | **special** | guard | ⚠ from RT |
| | tamisiocaris | planktonComb | no | **special** | guard | ⚠ from RT |
| Devonian | dunkleosteus | jawShear | no | **special** | dodge | ⚠ from RT |
| | titanichthys | filterGulp | no | special | dodge | fits already |
| | cladoselache | runThrough | no | **special** | dodge | ⚠ from RT |
| | stethacanthus | brushDisplay | no | **special** | dodge | ⚠ guard modifier |
| | onychodus | tuskLunge | weak | **special** | dodge | ⚠ from RT |
| | tiktaalik | neckSnap | yes | camo | **special** | ⚠ from RT |
| | jaekelopterus | cheliceraeGrab | yes | camo | **special** | ⚠ from RT |
| | doryaspis | floorSweep | yes | camo | **special** | ⚠ from Y |
| | gemuendina | sandAmbush | burrows | burrow | guard | the burrow *is* the special |
| | coccosteus | armourFlank | weak | **special** | guard | ⚠ from RT |
| | michelinoceras | shellJet | plausible | camo | **special** | ⚠ from Y |
| | acanthostega | limbHaul | yes | camo | **special** | ⚠ from Y (B is a dodge today) |
| | eldredgeops | enroll | yes | camo | special | fits already |
| | walliserops | tridentShove | weak | **special** | guard | ⚠ from RT |
| | nahecaris | scavenge | plausible | camo | dodge | passive: no button |
| | furcaster | armSpread | yes | camo | dodge | passive: no button |
| | palaeoisopus | stiltWalk | yes | camo | dodge | passive: no button |
| | manticoceras | shellHover | plausible | camo | **special** | ⚠ from Y; duplicates camo |
| Triassic | dinocephalosaurus | neckStrike | weak | **special** | dodge | ⚠ from RT |
| | cymbospondylus | exhaustionHold | no | **special** | dodge | ⚠ from RT |
| | shonisaurus | podCall | no | special | dodge | fits already |
| | nothosaurus | fangTrap | weak | **special** | guard | ⚠ from RT |
| | helicoprion | whorlSaw | no | **special** | dodge | ⚠ from RT |
| | rhaeticosaurus | powerStroke | no | special | dodge | fits already |
| | atopodentatus | scrapeSieve | weak | special | guard | fits already |
| | placodus | crushBite | weak | **special** | guard | ⚠ from RT |
| | hybodus | bristleFlare | weak | **special** | guard | ⚠ guard modifier |
| | birgeria | runThrough | no | **special** | dodge | ⚠ from RT |
| | aphaneramma | sideSwipe | yes | camo | **special** | ⚠ from RT |
| | mixosaurus | shoalDart | no | special | dodge | fits already |
| | henodus | comb | plausible | camo | **special** | ⚠ from Y |
| | saurichthys | ambushSurge | yes (ambusher) | camo | **special** | ⚠ today on a sprint press |
| | hupehsuchus | filterGulp | no | special | dodge | fits already |
| | keichousaurus | shoalDart | weak | special | dodge | fits already |
| | odontochelys | bellyTurn | yes | camo | special | fits already |
| | phragmoteuthis | ink | **strong** | camo | **ink** | ⚠ from Y: two natural defences |

"Weak" is read as no. Most of the ⚠ rows are one consequence of the scheme: **RT stops being the
home of specials and becomes the pounce for everyone.**

## Animals that do not fit the scheme cleanly

- **Guard-modifier specials on an animal that does not camouflage:**
  - `bristleFlare` (Canadia, Hybodus), `shellUp` (Wiwaxia), `brushDisplay` (Stethacanthus).
  - These *are* a way of guarding, so putting them on Y means Y becomes a second guard button.
- **No button today:**
  - `ambushSurge` is fired by a sprint that players no longer have.
  - `tailFlick` and `ribbonSlip` ride on every dash.
  - `scavenge`, `armSpread` and `stiltWalk` are passive.
- **Dead:** `whipSearch` and `sedimentDive` need an entry point before they can go on any button.
- **Two specials in a sense:**
  - Phragmoteuthis: camouflage and ink. The scheme handles this: Y camo, B ink.
  - Canadia and Hybodus: always-on thorns *and* the guard brace. Both are one special today.
