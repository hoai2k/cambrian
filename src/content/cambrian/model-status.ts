import type { CambrianCreatureId } from './ids';
import pending from './pending-refinements.json';

/**
 * Which Cambrian models are still previews, and what remains for each.
 *
 * `pending-refinements.json` is the single source: an entry there *is* the preview status, and its
 * reason is what the badge shows when you hover it. Removing an entry means the queued work and
 * its review are actually complete — there is deliberately no way to drop the badge without also
 * deleting the sentence that says why it was there, and `npm run eras` checks both directions.
 */
export interface PendingRefinement {
  id: CambrianCreatureId;
  status: 'pending';
  /** The kind of work outstanding: a whole new model, or the queued motion pass. */
  scope: string;
  /** What remains, in a sentence a player can read on the badge. */
  reason: string;
}

export const CAMBRIAN_PENDING: readonly PendingRefinement[] = pending as PendingRefinement[];
export const CAMBRIAN_PENDING_REWORKS = CAMBRIAN_PENDING.map((p) => p.id);
export const CAMBRIAN_MODEL_STATUS: Partial<Record<CambrianCreatureId, 'preview' | 'final'>> =
  Object.fromEntries(CAMBRIAN_PENDING.map((p) => [p.id, 'preview' as const]));
export const CAMBRIAN_MODEL_NOTES: Partial<Record<CambrianCreatureId, string>> =
  Object.fromEntries(CAMBRIAN_PENDING.map((p) => [p.id, p.reason]));
