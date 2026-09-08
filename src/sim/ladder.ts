import { RULES } from './era-rules';
import { creature, type CreatureId } from './creatures';
import { TIER_NAMES, TIER_SCALE, type Actor } from './types';
import type { Game } from './game';

/**
 * The growth ladder, as one thing both eras can be asked about.
 *
 * Every era grows a player through five rungs — the Cambrian moults Larva → Apex on nutrition,
 * the Devonian moults Hatchling → Prime on standing — but it does so in its own state: `tier` on
 * the actor, or `stage` in the era's side table. Anything that wants to talk about *how far along
 * a player is* without caring which era it is in asks here, and an era answers through the
 * `ladder*` hooks in EraRules.
 *
 * This is what lets the saved Rise record, its badge and the continue-at-a-higher-stage option be
 * written once instead of twice.
 */
export const LADDER_RUNGS = 5;
export const LADDER_TOP = LADDER_RUNGS - 1;

/** The five rung names, in this era's language. */
export const ladderNames = (): readonly string[] => RULES?.ladderNames ?? TIER_NAMES;
/** The name of one rung; out-of-range indices clamp, so stored records can never crash a screen. */
export const ladderName = (rung: number) => ladderNames()[clampRung(rung)];
export const clampRung = (r: number) => Math.max(0, Math.min(LADDER_TOP, Math.round(r) || 0));

/** How far up the ladder this body is right now. */
export const ladderRung = (g: Game, a: Actor): number => (RULES ? RULES.ladderRung(g, a) : a.tier);

/**
 * The body scale a creature has when it starts on `rung`. Both eras derive everything else from
 * the scale — the Cambrian's tier through `tierForScale`, the Devonian's stage through
 * `stageForScale` — so hatching a player part-grown is a matter of handing `spawn` this number.
 */
export const ladderScale = (id: CreatureId, rung: number): number => {
  const r = clampRung(rung);
  return RULES ? RULES.ladderScale(id, r) : TIER_SCALE[r];
};

/** Adult length is era content, not ladder logic; re-exported so callers need one import. */
export const adultLength = (id: CreatureId) => creature(id).adultLength;
