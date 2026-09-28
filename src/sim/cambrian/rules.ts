/**
 * The Cambrian's rules: the hooks where it has an answer of its own rather than the shared default.
 *
 * The Cambrian was the game before there were eras, so for a long time it had no rules object at
 * all — `RULES` was undefined and every hook site carried its Cambrian answer inline as the `else`
 * of a ternary. Those answers live here now, moved verbatim, and `RULES` is never undefined. The
 * optional hooks it leaves out are the ones where the shared default *is* what the Cambrian does.
 */
import type { EraRules } from '../era-rules';
import { creature } from '../creatures';
import { CAMBRIAN_LADDER } from '../survival';
import { tierForScale, tierScale } from '../tiers';
import { TIER_NAMES, TIER_NEED } from '../types';
import { isAlive } from '../actors';
import { distXZ, len3 } from '../../shared/math';
import { TEXT } from '../../shared/text';

export const CAMBRIAN_RULES: EraRules = {
  growthByNutrition: true,
  // A Rise or a Survival match hatches on the bottom tier; Reef hands you a grown body.
  startScale: (mode, id) => (mode === 'reef' ? tierScale(id, 2) : tierScale(id, 0)),

  // The ladder is the tier on the actor, and nutrition is the meter under it.
  ladderNames: TIER_NAMES,
  ladderRung: (_g, a) => a.tier,
  ladderScale: (id, rung) => tierScale(id, rung),
  ladderFill(_g, a, f) { a.nutrition = (TIER_NEED[a.tier] ?? 0) * f; },
  ladderFillOf: (_g, a) => a.nutrition / Math.max(1e-6, TIER_NEED[a.tier] ?? 1),
  onSwap(_g, a) { a.tier = tierForScale(a.creature, a.scale); },
  survivalGrow(g, a, fraction) { a.nutrition += fraction * CAMBRIAN_LADDER; g.checkTierUp(a); },

  // The rise and sink buttons are worth exactly the shared rate, and nothing is given for free.
  rise: (_g, _a, input, base) => (input.rise ? base : input.sink ? -base : 0),
  // A free-swimming body breaches on the Devonian's own terms: not a shell, not a drifter, not a
  // pulse swimmer, and not hidden.
  canBreach(a) {
    const def = creature(a.creature);
    return !def.shell && !def.drift && def.swimStyle !== 'pulse' && a.hideMode === 'none';
  },
  // Reef has no ladder to fall down, so a death costs half the meter instead.
  onRespawn(g, a) { if (g.mode === 'reef') a.nutrition *= 0.5; },

  /** The onboarding line: one lesson at a time, in the order a new player needs them. */
  hint(g, i) {
    const p = g.players[i]; const pr = g.progress[i];
    const f = pr.flags;
    if (!isAlive(p)) return undefined;
    const H = TEXT.sim.hints;
    if (p.hunted >= 0.5) return p.cover > 0.3 ? (len3(p.vel) < 0.3 ? H.huntedStill : H.huntedInCover) : H.huntedOpen;
    if (p.hunted > 0.2) return p.cover > 0.3 ? H.noticedInCover : H.noticedOpen;
    if (!f.has('moved')) return H.swim;
    if (!f.has('burst')) return H.sprint;
    if (!f.has('ate')) return H.eatSmallFry;
    if (!f.has('sense') && g.time > 20) return H.sense;
    if (p.tier === 0 && !f.has('tier')) return H.growRing;
    if (p.tier >= 1 && !f.has('light')) return H.biteAndPounce;
    if (p.tier >= 1 && !f.has('dodge')) return H.dashClear;
    if (p.tier >= 1 && !f.has('guard') && creature(p.creature).canGuard) return H.guardParry;
    if (!f.has('ability')) return H.hide;
    if (!f.has('lock') && g.time > 30) return H.aim;
    // Graspers have a second way to use the same buttons, and nothing else in the game teaches it.
    if (creature(p.creature).grasp && p.tier >= 1 && !f.has('ride')) return H.grip;
    if (!f.has('teleport') && g.time > 60 && (g.players.length > 1 || distXZ(p.pos, p.home) > 150)) return H.teleport;
    return undefined;
  },
};
