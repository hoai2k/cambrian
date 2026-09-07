// Extend these unions when another era ships; keep IDs globally unique.
import type { CambrianCreatureId, CambrianAbilityId } from './cambrian/ids';
import type { DevonianCreatureId, DevonianAbilityId } from './devonian/ids';
export type CreatureId = CambrianCreatureId | DevonianCreatureId;
export type AbilityId = CambrianAbilityId | DevonianAbilityId;
