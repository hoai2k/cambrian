# Cambrian roster: how big these animals actually were

Research brief, September 2026. Companion data: `cambrian-sizes.json`, one object per roster id,
every field filled. Companion to `devonian-swimming.md`, which did the same job for the other sea
and whose §1 method this follows. Nothing in this file is game tuning; it is the biological envelope
the numbers in `src/content/cambrian/` should be checked against.

**The roster does not use these lengths yet.** `npm run cambrian:sizes` prints the mapping and
changes nothing. §4 says what adopting it would cost, and why that is a decision rather than a
patch.

## 1. What the fossils say

Lengths are the animal's body: the part that scales. Several of these animals carry something that
makes them look far larger than they measure — Hallucigenia's spines stand about as tall as its body
is long, Opabinia's proboscis adds a third again to its reach, Isoxys' cardinal spines half again to
its outline, Leanchoilia's whips roughly double it, Canadia's chaetae are longer than it is wide —
and `basis` in the JSON says, for each animal, what is being measured and what is left out.

| Animal | Typical | Max | Basis / source |
| --- | --- | --- | --- |
| Anomalocaris | 37.8 cm | 50 cm | Trunk only. Daley & Edgecombe 2014; 38.7 cm max in Lerosey-Aubril & Pates 2018. Still "the largest Cambrian animal" of Whittington & Briggs 1985's title. |
| Tamisiocaris | 28 cm | 33.6 cm | Reconstructed from appendages and head shield. Lerosey-Aubril & Pates 2018. **Not** the 2 m filter feeder of the 2014 press cycle. |
| Cambroraster | 25 cm | 30 cm | Moysiuk & Caron 2019. |
| Burgessomedusa | 20 cm | 24 cm | Bell height, tentacles excluded. Moon, Caron & Moysiuk 2023, from 182 specimens. |
| Odaraia | 15 cm | 20 cm | Briggs 1981; Izquierdo-López & Caron 2024 work from specimens near 20 cm. |
| Sidneyia | 12 cm | 16 cm | Bruton 1981. One of the largest arthropods in the Walcott Quarry. |
| Odontogriphus | 8 cm | 12.5 cm | Caron et al. 2006, from 189 specimens. |
| Ottoia | 8 cm | 15 cm | Conway Morris 1977; Smith et al. 2015. Proboscis retracted. |
| Olenoides | 7 cm | 10 cm | Adults commonly 5–7 cm. |
| Vetulicola | 7 cm | 9 cm | Hou 1987; Shu et al. 2001. Chengjiang, not Burgess. |
| Waptia | 6.5 cm | 8 cm | Vannier et al. 2018. |
| Opabinia | 5.5 cm | 7 cm | Whittington 1975, range 4–7 cm, proboscis excluded. |
| Pikaia | 5 cm | 6 cm | Conway Morris & Caron 2012, 114 specimens, range 1.5–6 cm. |
| Leanchoilia | 5 cm | 6.8 cm | Bruton & Whittington 1983; Haug et al. 2012. Body, not the whips. |
| Nectocaris | 4 cm | 7.2 cm | Smith & Caron 2010. Two size morphs, anatomically identical. |
| Ctenorhabdotus | 3.4 cm | 7 cm | Conway Morris & Collins 1996. 24 comb rows to a modern ctenophore's eight. |
| Wiwaxia | 3 cm | 5.5 cm | Conway Morris 1985; Smith 2014. Sclerites in, dorsal spines out. |
| Canadia | 3 cm | 4.5 cm | Conway Morris 1979; Parry & Caron 2019. Chaetae excluded. |
| Isoxys | 2.5 cm | 4 cm | Vannier et al. 2009. Carapace, cardinal spines excluded. |
| Hallucigenia | 2.5 cm | 5.5 cm | Smith & Caron 2015; range 0.5–5.5 cm. Body, spines excluded. |
| Marrella | 1.55 cm | 2.45 cm | García-Bellido & Collins 2006, range 2.4–24.5 mm over 25 000 specimens. The commonest animal in the shale, and the smallest here. |

**The span is 24:1** — Marrella to Anomalocaris — against a roster that currently spans 1.5:1.

## 2. What the game has

Every Cambrian animal is between 2.6 and 3.9 units long at Adult, and the growth ladder is one set
of multipliers for all of them (`TIER_SCALE`, 0.25 → 2.6). So a Larva is a quarter of *its own*
adult size, whatever that is, and an Apex Marrella — an animal you could rest on a fingernail —
finishes a match seven units long, within a third of an Apex Anomalocaris. Size is the one thing
that decides who eats whom in this game, and on this roster it decides almost nothing.

The Devonian does not work this way. There, `docs/research/devonian-swimming.json` → `npm run
devonian:stats` sets each animal's length from its real one, and `stageScale` (`src/sim/devonian/
state.ts`) hatches everything at the same *length* rather than the same fraction of itself. A
newborn Dunkleosteus is three quarters of a unit long and a meal for a grown trilobite; the same
trilobite is a snack to it three moults later. That is the design this brief is asking whether the
Cambrian can have.

## 3. The mapping

`game units = K · metres^EXP`, with `EXP = 0.6` — the Devonian's exponent, so the two seas compress
size the same way — and `K = 11.2`, set so the largest body the Cambrian could put in the water (an
Apex Anomalocaris at 2.6× adult) lands on the largest the Devonian already does (a Prime
Titanichthys at 16.3 units), which is the biggest animal the engine is known to handle.

The Cambrian's real span is narrower than the Devonian's 80:1, so at the same exponent it stays
closer to life: Anomalocaris is 6.8 Marrella long in game, 24 in life, where Dunkleosteus is 3.9
Coccosteus here against 9.6 in life.

Everything hatches at the same length (0.75 units, the Devonian's `MAX_HATCH_LENGTH`), and growth to
Adult is geometric from there, so the animals with further to go grow faster per moult. Run
`npm run cambrian:sizes` for the full table with the derived speed, health and poise; the shape of
it:

| | real | adult | larva | apex | was (adult) |
| --- | --- | --- | --- | --- | --- |
| Anomalocaris | 37.8 cm | 6.25 | 0.75 | 16.3 | 3.9 |
| Cambroraster | 25 cm | 4.88 | 0.75 | 12.7 | 3.8 |
| Olenoides | 7 cm | 2.27 | 0.75 | 5.9 | 3.0 |
| Opabinia | 5.5 cm | 1.97 | 0.75 | 5.1 | 3.0 |
| Hallucigenia | 2.5 cm | 1.22 | 0.75 | 3.2 | 2.7 |
| Marrella | 1.55 cm | 0.92 | 0.74 | 2.4 | 2.7 |

Speed, health and poise come along with the length so the simulation is unchanged *at any given
body size* — nothing here is new tuning, it is the old tuning re-expressed for a body that is now a
different number of units long. Speed scales with length (holding body lengths per second, and with
it the on-screen pace, since the follow camera also sits a fixed number of body lengths back);
health and poise scale with length^1.1, the power `applyScaleStats` already grows them by, so a body
of a given *length* has exactly the health it has today. Damage, knockback and reach need nothing:
combat's `sizeFactor` is a ratio of lengths, and lunge, sense, clearance and body radius are counted
in body lengths already.

## 4. What adopting it costs

This was prototyped end to end, and it is not a table swap. Four things move with it, and the fourth
is why this brief stops here rather than landing the change.

1. **The ladder has to become per-creature.** `TIER_SCALE` is indexed in eight places across
   `game.ts`, `ladder.ts` and `actors.ts`; the Larva and Juvenile rungs become a function of the
   creature, the way the Devonian's `stageScale` is. `tierForScale` needs the creature id.
   Mechanical, and it works.
2. **Stats have to be regenerated, not hand-kept.** `adultLength`, `speed`, `hp` and `poise` become
   generated fields with the research as their source — the same arrangement the Devonian has, and
   the same obligation: no hand-editing, and a `--check` in `npm run eras`.
3. **The selection card stops comparing like with like.** Its four bars read raw `speed` and `hp`,
   which on a real-scaled roster draws the animal's size twice and leaves every small animal looking
   unplayable — and a player never meets anything as an adult anyway, but at whatever size they have
   grown to. The bars want normalising per body size (a one-line change, and one the Devonian's
   cards need just as much: Titanichthys' 1100 health against Eldredgeops' 45 is size, not armour).
4. **The scenery was authored for a three-unit roster, and does not move.** A sac sponge is 3.4
   units tall. Today every animal is about that size and drives over it; at real scale two thirds of
   the roster is shorter than the sponge and goes *round* it instead. That is arguably the better
   game — a Marrella threading between sponges is exactly right, and small bodies already live under
   the scenery at Larva — but it changes how most of the roster reads against the reef at every
   tier, and it is a world-design call rather than a stats one. `tools/swim-test.ts` catches it:
   "driving straight at a plant goes over it" stops holding for Olenoides at 7 cm.

Three test files encode the flat roster in their fixtures (absolute rock heights, absolute spawn
scales) and want rewriting in body lengths — a good change on its own terms, since a fixed number of
units stopped asking the same question of every animal.

**Recommendation.** Take it, with §4.4 understood: the roster is more interesting when size means
something, and the Devonian already proves the engine and the design hold up at 16 units and at
0.85. But land it as its own change with the scenery question answered — either the reef's flora
scales with the animal looking at it, or the small half of the roster lives under the sponges on
purpose.

## 5. Sources

Daley & Edgecombe 2014, *J. Paleontol.* 88:68. Lerosey-Aubril & Pates 2018, *Nat. Commun.* 9:3774.
Moysiuk & Caron 2019, *Proc. R. Soc. B* 286:20191079. Moon, Caron & Moysiuk 2023, *Proc. R. Soc. B*
290:20222490. Briggs 1981, *Phil. Trans. R. Soc. B* 291:541. Izquierdo-López & Caron 2024, *Proc. R.
Soc. B* 291:20240622. Bruton 1981, *Phil. Trans. R. Soc. B* 295:619. Caron, Scheltema, Schander &
Rudkin 2006, *Nature* 442:159. Conway Morris 1977, *Spec. Pap. Palaeontol.* 20. Smith, Harvey &
Butterfield 2015, *Palaeontology* 58:705. Hou 1987; Shu et al. 2001, *Nature* 414:419. Vannier,
Aria, Taylor & Caron 2018, *R. Soc. Open Sci.* 5:172206. Whittington 1975, *Phil. Trans. R. Soc. B*
271:1. Conway Morris & Caron 2012, *Biol. Rev.* 87:480. Bruton & Whittington 1983, *Phil. Trans. R.
Soc. B* 300:553. Haug, Briggs & Haug 2012, *BMC Evol. Biol.* 12:162. Smith & Caron 2010, *Nature*
465:469. Conway Morris & Collins 1996, *Phil. Trans. R. Soc. B* 351:279. Conway Morris 1985, *Phil.
Trans. R. Soc. B* 307:507. Smith 2014, *Palaeontology* 57:215. Conway Morris 1979, *Phil. Trans. R.
Soc. B* 285:227. Parry & Caron 2019, *Proc. R. Soc. B* 286:20191247. Vannier, García-Bellido, Hu &
Chen 2009, *Proc. R. Soc. B* 276:2567. Smith & Caron 2015, *Nature* 523:75. García-Bellido & Collins
2006, *Can. J. Earth Sci.* 43:721. Whittington & Briggs 1985, *Phil. Trans. R. Soc. B* 309:569.
