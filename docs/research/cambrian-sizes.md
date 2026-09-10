# Cambrian roster: how big these animals actually were

Research brief, September 2026. Companion data: `cambrian-sizes.json`, one object per roster id,
every field filled. Companion to `devonian-swimming.md`, which did the same job for the other sea
and whose §1 method this follows. Nothing in this file is game tuning; it is the biological envelope
the numbers in `src/content/cambrian/` should be checked against.

**The roster ships as it always did.** These lengths are an option — Settings → *Equivalent sizing*,
off by default — so the two can be played against each other. §3 is the mapping, §4 what turning it
on actually does.

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
trilobite is a snack to it three moults later. That sea is built at its own scale, though — its
roster runs 0.85 to 12 units for an 80:1 range of real animals — so what the Cambrian borrows is the
*idea* that adults differ, not the numbers.

## 3. The mapping

`game units = K · metres^EXP`, with `K = 8.4` and `EXP = 0.4`. `npm run cambrian:sizes` writes
`src/content/cambrian/equivalent-sizing.json` from it; nothing else is generated, and the shipped
roster in `creatures.ts` is untouched.

**K is set so the roster's *average* adult comes out at the average it has today** — 3.05 units —
rather than so its largest matches today's largest. The average is what says how big this sea's
animals are; pinning the top instead would have meant the only way to give Anomalocaris its lead was
to shrink everything else underneath it, and the point is that the biggest animal in the Cambrian
should read as the biggest animal in the Cambrian. So it grows: 5.69 units at Adult and **14.8 at
Apex**, against 3.9 and 10.1. That is still inside what the engine is known to carry — the Devonian
puts a 16.3-unit Prime Titanichthys in the water.

**EXP is set so the smallest animal still has a body worth swimming.** The roster comes out
1.59–5.69 against today's 2.6–3.9. This is deliberately *not* the Devonian's exponent: that sea is
built at a different scale for an 80:1 roster, and the thing worth sharing between the two is that
adults differ at all, not the number they differ by.

| | real | adult | larva | apex | shipped |
| --- | --- | --- | --- | --- | --- |
| Anomalocaris | 37.8 cm | 5.69 | 0.75 | 14.8 | 3.9 |
| Cambroraster | 25 cm | 4.82 | 0.75 | 12.5 | 3.8 |
| Odaraia | 15 cm | 3.93 | 0.75 | 10.2 | 3.0 |
| Olenoides | 7 cm | 2.90 | 0.75 | 7.5 | 3.0 |
| Opabinia | 5.5 cm | 2.63 | 0.75 | 6.8 | 3.0 |
| Hallucigenia | 2.5 cm | 1.92 | 0.75 | 5.0 | 2.7 |
| Marrella | 1.55 cm | 1.59 | 0.75 | 4.1 | 2.7 |

**Everything hatches at the same length** (0.75 units), and growth to Adult is geometric from there,
so the animals with further to go grow faster per moult — Anomalocaris nearly triples at each of its
two moults, Marrella gains half again. Giant and Apex keep their old multiples of the adult body, because
those two rungs were never biology in the first place. That is `tierScale` in `src/sim/tiers.ts`,
the Devonian's `stageScale` rule on the Cambrian's five rungs.

**Speed, health and poise come along with the length**, so the simulation is unchanged at any given
body size. Nothing there is new tuning: it is the shipped tuning re-expressed for a body that is now
a different number of units long. Speed scales with length, holding body lengths per second — and
with it the on-screen pace, since the follow camera also sits a fixed number of body lengths back.
Health and poise scale with length^1.1, the power `applyScaleStats` already grows them by, so a body
of a given *length* has exactly the health it has today; `npm run sizing` checks that a two-unit
body of every animal on the roster comes out within 2% either way. Damage, knockback and reach need
nothing: combat's `sizeFactor` is a ratio of lengths, and lunge, sense, clearance and body radius are
counted in body lengths already.

## 4. What turning it on does

Four things move with the lengths, and the fourth is why this is a setting rather than the roster.

1. **The growth ladder becomes per-creature.** Everything hatches at one length instead of one
   fraction of itself, so the roster starts level and size is earned rather than picked. Off, the
   ladder is the shipped `TIER_SCALE` for every animal, unchanged.
2. **Mass becomes cubed length rather than cubed scale.** Every use of it is a ratio between two
   animals; scale stands in for mass only while the roster is all one size. Off, it is cubed scale,
   exactly as shipped.
3. **The selection card gains the animal's real length** beside its locality, and nothing else: the
   four stat bars are drawn from the shipped numbers in both modes, deliberately. The option changes
   how big an animal is, not how it fights at a given size, so a bar drawn from the resized figures
   would report the size a second time and say Marrella had become slow, when what it has become is
   small.
4. **The reef does not resize with it.** A sac sponge is 3.4 units tall and stays there. Today every
   animal is about that size and drives over it; with the option on the roster straddles it — the
   big half drives over it as before and the small half goes *round* it instead, an adult Marrella
   living among the stalks with the reef standing over it. That may well be the better game, and it is certainly the more honest one,
   but it changes how most of the roster reads against the scenery at every tier, and it is the
   thing to actually look at before deciding whether this becomes the default.

`npm run sizing` covers both halves: that off is the shipped game exactly, and that on does what §3
says. Every other test in the suite runs with the option off and is untouched by it.

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
