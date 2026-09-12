import type { CambrianCreatureId } from './ids';
import pending from './pending-refinements.json';
import { refinementTables, type PendingRefinement } from '../pending-refinements';

/**
 * What remains for the Cambrian models, and the badges derived from it.
 *
 * `pending-refinements.json` is the single source: an entry there is the outstanding work, and its
 * reasons are what the badges show when hovered. Removing an entry means the work and its review
 * are actually complete — there is deliberately no way to drop a badge without also deleting the
 * sentence that says why it was there, and `npm run eras` checks both directions.
 */
export const CAMBRIAN_PENDING = pending as PendingRefinement[];
export const CAMBRIAN_PENDING_REWORKS = CAMBRIAN_PENDING.map((p) => p.id as CambrianCreatureId);
const tables = refinementTables(CAMBRIAN_PENDING);
export const CAMBRIAN_MODEL_STATUS = tables.modelStatus;
export const CAMBRIAN_MODEL_NOTES = tables.modelNotes;
export const CAMBRIAN_CLIP_NOTES = tables.clipNotes;
