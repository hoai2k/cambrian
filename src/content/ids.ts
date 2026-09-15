// Extend these unions when another era ships; keep IDs globally unique.
import type { CambrianCreatureId, CambrianAbilityId } from './cambrian/ids';
import type { DevonianCreatureId, DevonianAbilityId } from './devonian/ids';
import type { TriassicCreatureId, TriassicAbilityId } from './triassic/ids';
export type CreatureId = CambrianCreatureId | DevonianCreatureId | TriassicCreatureId;
export type AbilityId = CambrianAbilityId | DevonianAbilityId | TriassicAbilityId;
