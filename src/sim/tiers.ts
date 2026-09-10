import { creature, naturalSizing, type CreatureId } from './creatures';
import { TIER_SCALE, type Tier } from './types';

/**
 * The growth ladder's *sizes*, per creature.
 *
 * `TIER_SCALE` alone is one set of multipliers for the whole roster: a Larva is a quarter of *its
 * own* adult size, whatever that is. That only reads as growth while the roster is all one size to
 * begin with, which is what *Equivalent sizing* turns it back into.
 *
 * At the roster's natural sizes the adults spread out over the real animals' proportions, and the
 * ladder has to spread with them or an Anomalocaris would hatch four times the length of a Marrella
 * and the level start would be gone. So the bottom of the ladder is a *length* rather than a
 * fraction: everything is `LARVA_LENGTH` long at Larva whatever it will grow into, and growth to
 * Adult is geometric from there, which means the animals with further to go grow faster per moult.
 * Giant and Apex keep their old multiples of the adult body, because those two rungs were never
 * biology in the first place.
 *
 * This is the Devonian's rule (`stageScale` in ./devonian/state.ts) on the Cambrian's five rungs.
 * The one difference is where adulthood sits: the Devonian moults three times to reach it with
 * Prime above, the Cambrian twice with Giant and Apex above.
 */
export const ADULT_TIER = 2;
/** The length everything hatches at, and about the shortest body the engine draws well. */
export const LARVA_LENGTH = 0.75;
/** Larva length for a creature that grows to `adultLength` — the smallest animals hatch smaller. */
export const larvaLength = (adultLength: number) => Math.min(adultLength * 0.8, LARVA_LENGTH);

/** Body scale (of adult length) at `tier`, for the creature that has to do the growing. */
export function tierScale(id: CreatureId, tier: number): number {
  const t = Math.max(0, Math.min(TIER_SCALE.length - 1, Math.round(tier))) as Tier;
  // Flattened back, or an era with no lengths of its own (the Devonian, which has its own ladder in
  // `stageScale`): the authored multipliers, for every rung.
  if (!naturalSizing() || t >= ADULT_TIER) return TIER_SCALE[t];
  const adult = creature(id).adultLength;
  const s0 = larvaLength(adult) / adult;
  return Math.pow(s0, 1 - t / ADULT_TIER);          // s0 → 1 over the two moults to adult
}

/** The tier a body of `scale` stands on: the largest whose scale it has reached. */
export function tierForScale(id: CreatureId, scale: number): Tier {
  let best: Tier = 0;
  for (let i = 0; i < TIER_SCALE.length; i++) if (scale >= tierScale(id, i) * 0.98) best = i as Tier;
  return best;
}
