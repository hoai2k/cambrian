import type { CambrianCreatureId } from './ids';

/** Removing an entry requires completing and reviewing its queued model or animation refinement. */
export const CAMBRIAN_PENDING_REWORKS = ["anomalocaris", "opabinia", "waptia", "marrella", "olenoides", "odaraia", "cambroraster", "sidneyia", "leanchoilia", "isoxys", "tamisiocaris", "nectocaris"] as const satisfies readonly CambrianCreatureId[];
export const CAMBRIAN_MODEL_STATUS: Partial<Record<CambrianCreatureId, 'preview' | 'final'>> =
  Object.fromEntries(CAMBRIAN_PENDING_REWORKS.map(id => [id, 'preview' as const]));
