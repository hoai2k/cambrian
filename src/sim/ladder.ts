import { RULES } from './era-rules';
import { tierScale } from './actors';
import { creature, type CreatureId } from './creatures';
import { TIER_NAMES, TIER_NEED, TIER_SCALE, type Actor } from './types';
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
 *
 * ## Marks are fractional
 *
 * A position on the ladder is a number, not an index: the whole part is the rung, the fraction is
 * how far through it the animal is. Rung 3.5 is a Giant with its growth meter half full. The
 * record uses this to say "you got to the top but did not finish" — see MARK_NEAR_TOP.
 */
export const LADDER_RUNGS = 5;
export const LADDER_TOP = LADDER_RUNGS - 1;

/**
 * The mark for having reached the top rung without completing the run.
 *
 * The top of the ladder is the one rung you cannot bank by standing on it: Rise asks you to reach
 * it *and hold it*, so the record only writes the top when the run is finished. Getting there and
 * dying, or quitting, is still worth something — it comes back as the rung below with its meter
 * half full, which is a short swim from the top rather than a start from the bottom.
 */
export const MARK_NEAR_TOP = LADDER_TOP - 0.5;

/** A mark, clamped into the ladder. Anything unusable — NaN, a string that survived JSON — is 0. */
export const clampMark = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(LADDER_TOP, v)) : 0);
/** The rung a mark stands on. */
export const rungOf = (v: number) => Math.floor(clampMark(v));
/** How far through that rung it is, 0..1. The top rung is never partial: there is nothing above it. */
export const fillOf = (v: number) => { const m = clampMark(v); return m >= LADDER_TOP ? 0 : m - Math.floor(m); };
/** Kept for callers that only want the rung; marks and rungs are the same number to them. */
export const clampRung = rungOf;

/** The five rung names, in this era's language. */
export const ladderNames = (): readonly string[] => RULES?.ladderNames ?? TIER_NAMES;
/** The name of one rung; out-of-range marks clamp, so a stored record can never crash a screen. */
export const ladderName = (mark: number) => ladderNames()[rungOf(mark)];

/** How far up the ladder this body is right now, as a whole rung. */
export const ladderRung = (g: Game, a: Actor): number => (RULES ? RULES.ladderRung(g, a) : a.tier);

/**
 * The body scale a creature has on the rung this mark stands on. Both eras derive everything else
 * from the scale — the Cambrian's tier through `tierForScale`, the Devonian's stage through
 * `stageForScale` — so hatching a player part-grown is a matter of handing `spawn` this number.
 * The fraction is not size: a half-grown Giant is Giant-sized with a half-full meter, because a
 * body between two rungs would be an animal the size rule has no name for.
 */
export const ladderScale = (id: CreatureId, mark: number): number => {
  const r = rungOf(mark);
  return RULES ? RULES.ladderScale(id, r) : tierScale(creature(id).adultLength, r);
};

/**
 * Put this body `fraction` of the way from the rung it is on to the next one.
 *
 * Each era keeps growth in its own currency — nutrition here, standing in the Devonian — so the
 * era fills its own meter and the shared code only says how full.
 */
export const ladderFill = (g: Game, a: Actor, fraction: number) => {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  if (RULES) { RULES.ladderFill(g, a, f); return; }
  a.nutrition = (TIER_NEED[a.tier] ?? 0) * f;
};

/**
 * Where this body stands on the ladder right now, as a mark: the rung plus how full its meter is.
 *
 * The inverse of `ladderScale` + `ladderFill`, so a body's position can be written down and handed
 * back later — which is what swapping creature mid-match does with the one you put away.
 */
export const ladderMark = (g: Game, a: Actor): number => {
  const rung = ladderRung(g, a);
  const fill = RULES ? RULES.ladderFillOf(g, a) : (a.nutrition / Math.max(1e-6, TIER_NEED[a.tier] ?? 1));
  return clampMark(rung + Math.max(0, Math.min(0.999, fill)));
};

/** Adult length is era content, not ladder logic; re-exported so callers need one import. */
export const adultLength = (id: CreatureId) => creature(id).adultLength;
