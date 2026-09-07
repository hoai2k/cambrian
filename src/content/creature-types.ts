import type { CreatureId, AbilityId } from './ids';
export type { CreatureId, AbilityId } from './ids';

export interface MoveDef {
  name: string;
  windup: number;   // seconds before the hit window opens
  active: number;   // seconds the hit window is open
  recovery: number; // seconds after the hit window before you can act
  damage: number;   // at adult, before size factor
  poise: number;    // poise damage
  knockback: number;
  stamina: number;
  lunge: number;    // body lengths carried forward during windup+active
  armorPierce?: number; // fraction of armor reduction bypassed
  guardBreak?: boolean;
  grab?: boolean;   // Anomalocaris: hold the victim
  sweep?: boolean;  // 360°, hits all around
}

export interface CreatureDef {
  id: CreatureId;
  name: string;
  species: string;
  tagline: string;     // energetic one-liner for the select screen
  role: string;
  ground: boolean;
  diet?: 'deposit' | 'grazer' | 'filter';
  provenance?: string;
  bodyRadius?: number; // collision radius in body lengths
  clearance?: number; // center height above terrain, in body lengths
  proceduralUndulation?: boolean; // false when authored locomotion owns deformation
  abilityDuration?: number;
  abilityLoop?: boolean;
  mobileAbility?: boolean;
  adultLength: number; // world units at scale 1
  speed: number;       // cruise, units/s at adult
  burst: number;       // multiplier while holding RT
  agility: number;     // velocity approach rate (higher = snappier)
  turnRate: number;    // rad/s
  glide: number;       // drag when stick released (lower = longer glide)
  hp: number;
  poise: number;
  stamina: number;
  defense: number;     // 0..1 flat damage reduction
  sense: number;       // body lengths of sense range
  color: string;
  accent: string;
  light: MoveDef;
  heavy: MoveDef;
  ability: AbilityId;
  abilityName: string;
  abilityCooldown: number;
  abilityDesc: string;
  passive: string;
  weakness: string;
  canGuard: boolean;
}

