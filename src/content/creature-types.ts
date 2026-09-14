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
   *
   * `air` is that mechanic, and it turned out not to need a meter or a death: the Triassic's
   * reptiles are obligate air-breathers, and what that costs them is *recovery*. Under water their
   * stamina drains at the ordinary rate and comes back not at all; breaking the surface refills
   * it with a blow. Nothing counts down and nothing drowns (docs/triassic/01-triassic-design.md).
   */
  breathing?: 'gill' | 'bimodal' | 'air';
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

  // ---- How this body gets about (docs/research/locomotion-ideas.md). Shared by both eras: a
  // creature that sets none of these swims, walks and dashes exactly as it always did.
  /**
   * `omnidirectional`: no front. A brittle star picks a lead arm and rows, and a ctenophore's comb
   * rows beat any way at all, so neither turns to travel — the heading is decoupled from the stick
   * and only aiming points the body. `pulse`: a medusa's bell. Thrust arrives in contractions with
   * a long free coast between them, so the animal surges rather than cruises; it is cheap to swim
   * and slow to answer the stick.
   */
  swimStyle?: 'omnidirectional' | 'pulse';
  /**
   * The caridoid escape reaction: the abdomen snaps under the body and throws it backwards, away
   * from whatever touched it, with no steering and a heavy stamina cost. Replaces this animal's
   * dash and dodge.
   */
  tailFlip?: boolean;
  /** Hauls through the plants rather than swimming past them: cover carries this body instead of dragging on it. */
  weedWalk?: boolean;
  /** Pushes off the bottom for a long glide. The dash only has its legs with the floor in reach. */
  punt?: boolean;
  /** Paddles in open water, walks on the floor: down there the current barely moves it. */
  rowWalk?: boolean;
  /** A rigid body with no paired fins behind the shield: the most it can change its pitch, rad/s. */
  pitchRate?: number;
  /** The mouth is a net, and a net only works with water going through it: filtering needs way on. */
  ramFeed?: boolean;
  /** Holds a depth and lets the sea carry it: full drift on a neutral stick, and it rises at night. */
  drift?: boolean;
  /** Holds onto rock. No face is a cliff to this body, however steep or however far above it. */
  cling?: boolean;
  /**
   * Its arms lie along what they are on: draped over a boulder, dipped into the hollow behind it,
   * curled round anything it takes hold of (`src/render/conform.ts`). Presentation only, and asked
   * for by name rather than read off the rig, because a nautiloid's tentacles carry the same bone
   * names and should not be laid out on the seabed.
   */
  conformArms?: boolean;

  // ---- Triassic Triumph (docs/triassic/01-triassic-design.md). All optional; the earlier rosters set
  // none of them and the shared simulation ignores them unless the era's rules ask.
  /**
   * Which side the `armour` fraction is on. `all` is the shell of a placodont or an ammonoid;
   * `dorsal` the plates down a hupehsuchian's back; `ventral` the plastron of a turtle with no
   * carapace yet. Absent, the Devonian's snout-to-tail fraction applies whichever way the hit comes.
   */
  armourFacing?: 'dorsal' | 'ventral' | 'all';
  /** Ichthyosaurs and the plesiosaur: immune to the cold of the deep biomes (a stamina-regen modifier). */
  warmBlooded?: boolean;
  /** Multiplier on the shared rise rate: flippers climb faster than paddles, a shell-cruncher slowest. */
  riseRate?: number;
  /**
   * A shore animal: modelled, placed on the beach by the world, and never played. It strikes into
   * the water from where it stands (src/sim/triassic/shore.ts) and is off every pick screen.
   */
  shore?: boolean;
  /**
   * How a new player of this species arrives. Everything hatches from an egg on the sand in cover;
   * `live` additionally puts a grown adult of its own kind beside the hatchling for the first
   * minute, which is the parental care the fossils' viviparity implies for these animals
   * (Keichousaurus and Dinocephalosaurus both preserve embryos).
   */
  birth?: 'live' | 'egg';
  /**
   * What the shell is made of, where that is not the Cambrian's calcareous capsule. A reptile's
   * egg is **leathery**: opaque, matte, dimpled, and duller — so a Triassic nest reads as reptile
   * rather than as the same cream shell in a different sea. Presentation only (`src/render/eggs.ts`),
   * and set on the animal rather than the era, because the Triassic also has sharks, fish, an
   * amphibian and two cephalopods that lay nothing of the kind.
   */
  eggShell?: 'leathery';
  /** Four-flipper underwater flight: fast acceleration and cruise, wide turns, no reverse. */
  flight?: boolean;
  /** A stiff body driven by the tail: the best sustained cruise, a long glide, a wide turn. */
  thunniform?: boolean;
  /** Negatively buoyant: settles when the stick is still and walks the floor with `punt`. */
  sink?: boolean;
  /** A head that strikes this many body lengths from a body that stays put (the neck's reach). */
  neckReach?: number;
  /** Two gears: rows along the bottom at a walk, and a tail burst in the column. */
  paddleRow?: boolean;
  /** A giant that keeps a pod: `shoals` for rung IV, with pod-mates that answer what attacks it. */
  pod?: boolean;
  /** A body the Cambrian's `peaceful()` reckoning leaves alone until it bites: nothing hunts a grazer. */
  peaceful?: boolean;
}
