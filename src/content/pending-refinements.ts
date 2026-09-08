import type { CreatureId } from '../sim/creatures';

/**
 * One entry in an era's refinement queue: a creature whose art is not finished, and what is
 * outstanding for it.
 *
 * The queue is the single source for the preview badges. It distinguishes the two kinds of work
 * because they mean different things to somebody looking at the animal:
 *
 * - `model` is the 3D body itself — geometry, materials, rig, LOD art. This is what the ⚠ badge on
 *   a creature means, in the game and in the viewer. A creature the player can see is unfinished.
 * - `clips` are animation clips queued for rework on a body that is already right. Flagging the
 *   whole creature for those said the wrong thing — Anomalocaris' model is done — so the warning
 *   goes on the individual clip buttons in the viewer instead, where it is actionable, and the
 *   creature carries no badge at all.
 *
 * An entry must claim at least one of the two, and whichever it claims must carry its reason.
 * `npm run eras` enforces that, so nothing can be flagged without saying why.
 */
export interface PendingRefinement {
  id: CreatureId;
  status: 'pending';
  /** The kind of work outstanding, for the queue's own bookkeeping. */
  scope: string;
  /** The 3D model itself still needs work: this is what shows the creature's preview badge. */
  model: boolean;
  /** Why the model is a preview, in a sentence a player can read on the badge. */
  reason?: string;
  /** Animation clips queued for rework, by their clip name ('Bite', 'Attack', …). */
  clips?: string[];
  /** Why those clips are queued, shown on each of their buttons. */
  clipReason?: string;
}

/** What the shell and the viewer need: which creatures are flagged, and the sentence for each. */
export interface RefinementTables {
  modelStatus: Partial<Record<CreatureId, 'preview' | 'final'>>;
  modelNotes: Partial<Record<CreatureId, string>>;
  clipNotes: Partial<Record<CreatureId, Partial<Record<string, string>>>>;
}

export function refinementTables(pending: readonly PendingRefinement[]): RefinementTables {
  const modelStatus: RefinementTables['modelStatus'] = {};
  const modelNotes: RefinementTables['modelNotes'] = {};
  const clipNotes: RefinementTables['clipNotes'] = {};
  for (const p of pending) {
    // Only outstanding *model* work makes a creature a preview. Animation work is carried by the
    // clips it actually affects.
    if (p.model) { modelStatus[p.id] = 'preview'; if (p.reason) modelNotes[p.id] = p.reason; }
    if (p.clips?.length && p.clipReason) {
      clipNotes[p.id] = Object.fromEntries(p.clips.map((c) => [c, p.clipReason!]));
    }
  }
  return { modelStatus, modelNotes, clipNotes };
}
