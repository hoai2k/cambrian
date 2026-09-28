/**
 * The hold at the top of the ladder that wins Rise and Survival, in every era.
 *
 * Its own module, importing nothing but types, because the era rules read it and `ladder.ts`
 * imports the era rules: living there, it made an import cycle that only happened to resolve in
 * the order the game loads things.
 */
import type { Game } from './game';
import type { Actor } from './types';
/**
 * Seconds held on the top rung that win Rise and Survival, in every era — and the number the
 * scoreboard and the HUD's countdown count to. One clock, `PlayerProgress.apexT`, runs it.
 */
export const APEX_HOLD_SECONDS = 90;
/** Seconds of the hold this player still owes, or 0 while they are not holding the top at all. */
export const apexLeft = (g: Game, a: Actor): number => {
  const held = a.player >= 0 ? g.progress[a.player]?.apexT ?? 0 : 0;
  return held > 0 ? Math.max(0, APEX_HOLD_SECONDS - held) : 0;
};
