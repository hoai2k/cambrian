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
  /**
   * The everyday group the animal belongs to — "Placoderm", "Trilobite", "Sea scorpion" — shown
   * beside the genus so a name nobody has heard of still lands somewhere familiar. Two or three
   * words, no rank names. `kindNote` is the one plain sentence that says what the group is, for
   * the places with room for it. Both are optional: an animal whose group name is less familiar
   * than its own carries neither. See docs/research/devonian-classification.md and
   * docs/research/cambrian-classification.md.
   */
  kind?: string;
  kindNote?: string;
  /**
   * This animal takes hold of things. Holding the heavy or ability button turns whatever it lands
   * into a grab rather than a strike: prey is held and eaten when the button comes up, and anything
   * bigger than the `rival` band is ridden — grabbed anywhere but the business end of its head and
   * carried along until it shakes you off. See `docs/redesign/05-hiding-and-combat.md`.
   */
  grasp?: boolean;
  tagline: string;     // energetic one-liner for the select screen
  role: string;
  ground: boolean;
  /**
   * What this animal actually eats, where that is something other than live prey it catches.
   *
   * A creature with a diet does not go hunting of its own accord (the simulation's AI reads this;
   * a human player is never gated by it). `grazer` and `deposit` rasp microbial mats and sift the
   * sediment, `filter` strains plankton blooms, and `scavenger` looks for the dead rather than
   * making its own. See docs/redesign/01-game-design.md · Feeding.
   */
  diet?: 'deposit' | 'grazer' | 'filter' | 'scavenger';
  /** Grazes only while held still, the way an animal that has to plant itself to rasp does. */
  grazeStill?: boolean;
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

  // ---- Devonian Domination (docs/redesign/08-devonian-domination.md). All optional; the Cambrian
  // roster sets none of them and the shared simulation ignores them unless the era's rules ask.
  /** Place in the food chain, 1 (floor) to 4 (giants). Fixed per creature: nothing changes rung. */
  rung?: 1 | 2 | 3 | 4;
  /** Fraction of the body, from the snout back, that is armoured (0 = none). */
  armour?: number;
  /** This creature's heavy cuts through armour: 1 ignores it entirely, 0.5 halves it. */
  armourPierce?: number;
  /**
   * How this animal gets its oxygen. `gill` is water and nothing else. `bimodal` is lungs *as well
   * as* gills — it can stay under indefinitely, and going up for a breath is worth something rather
   * than being the thing that keeps it alive.
   *
   * The three the Devonian roster marks bimodal are all bimodal in the literature: Acanthostega's
   * fish-like internal gills are the whole point of Coates & Clack 1991; Tiktaalik kept its gills
   * and ventilated them by buccal pumping after losing the bony operculum, with spiracles for
   * supplementary air; and Rhinodipterus is a *marine* Devonian dipnoan with the buccal-pump kit for
   * air breathing — obligate air breathing with reduced gills is a modern Protopterus trait, not a
   * Devonian marine one. So nothing on this roster is lung-only, and there is deliberately no value
   * for one: an obligate air breather would drown without the surface, which is a different mechanic
   * (a meter, a warning, a death) and should be added with that mechanic rather than in advance.
   */
  breathing?: 'gill' | 'bimodal';
  /** How far past the shore wall this creature may push (world units). 0 for swimmers. */
  shoreReach?: number;
  /** Chambered shell: backward jet sprint, free buoyancy, withdraw on block. */
  shell?: boolean;
  /** Arthropod that must moult to reach the next stage, leaving an exuvia. */
  moults?: boolean;
  /** Rung II fish that gains standing from conspecifics following it. */
  shoals?: boolean;
  /** Cannot bite anything above snack size (Titanichthys, Doryaspis). */
  noBite?: boolean;
  /** Locality label for the selection card (the roster mixes places and times, and says so). */
  locality?: string;
}

