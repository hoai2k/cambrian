/**
 * Which button a player finds their animal's special on.
 *
 * RT is the pounce for every animal, and never a special: a special on RT meant the pounce — the one
 * attack every body has — was simply missing from the ones that had a special, and which ones those
 * were was nothing a player could guess. So the special goes where it costs least, and **Y is
 * overridden first**:
 *
 *   - an animal that does not hide in life has its special on **Y**, in place of a camouflage the
 *     real animal never had;
 *   - an animal that does (`hides` on its card, or a burrower) keeps the hide on Y and has its
 *     special on **B**, in place of the guard;
 *   - a special that *is* a way of guarding (`DEFENSIVE_SPECIALS`: the brace, the flare, the ball)
 *     stays what B already does, whatever the animal hides by — putting it on Y would make Y a
 *     second guard button;
 *   - a special that *is* the burrow is the hide itself, and needs no button of its own.
 *
 * No animal carries two specials (`def.ability` is one field), so the rule for two — the more
 * defensive on B and the other on Y — has nothing to split today; a second one would come in through
 * here. Bots are not routed by this: they reach specials the way they always have, so every seeded
 * replay that depends on their behaviour is unchanged.
 */
import { BURROWERS, DEFENSIVE_SPECIALS } from './concealment';
import type { CreatureDef } from './creatures';

export type SpecialSlot = 'none' | 'y' | 'b' | 'guard';

/** Specials that are the burrow itself: Y already is them. */
const IS_THE_HIDE = new Set(['burrow', 'sandAmbush']);

export function specialSlot(def: CreatureDef): SpecialSlot {
  if (def.ability === 'none' || IS_THE_HIDE.has(def.ability)) return 'none';
  if (DEFENSIVE_SPECIALS.has(def.ability)) return 'guard';
  return def.hides || BURROWERS.has(def.id) ? 'b' : 'y';
}
