import { ACTIVE_ERA } from '../content';
import { RULES } from './era-rules';
import { BURROWERS, HEAVY_SPECIALS, DEFENSIVE_SPECIALS, CAMOUFLAGE_DRAIN, camouflageMatch, clearPursuit, stopHiding } from './concealment';
import { abilitySpeed, beginExpansionAbility, beginHeavyStrike, heavyStrikeReach, specialHit, stepExpansionAbility, stepHeavyStrike, bloomRate, grazeRate } from './expansion-abilities';
import { add, clamp, damp, dist, distXZ, dot, heading, len3, lerp, makeRng, norm, scale as vscale, sub, TAU, v3, wrapAngle, yawOf, type Rng, type Vec3 } from '../shared/math';
import { applyScaleStats, bandOf, bodyGap, bodyRadius, canAct, clearanceOf, climbHeight, climbRise, floorClearance, glideOver, isAlive, isHidden, isInvulnerable, lengthOf, makeActor, massOf, speedFactor, staminaCost, surfaceGap } from './actors';
import { tierForScale, tierScale } from './tiers';
import { makeBrain, peaceful, think, type AiWorld } from './ai';
import { huntingPressure, phaseAt, untilNextPhase, type Phase } from './daynight';
import { applyHit, endRide, GRIP_BREAK, GRIP_MEAL, GRIP_STRAIN, GRIP_STRIKE, kill, rideHold, startSwallow, takeHold, takeRide, type HitContext } from './combat';
import { creature, CREATURE_IDS, PLAYABLE_IDS, type CreatureId, type MoveDef } from './creatures';
import { resolveFlora, stepFlora, type FloraContact } from './flora';
import { SpatialHash } from './spatial';
import { clampMark, fillOf, ladderFill, ladderMark, ladderRung, ladderScale, LADDER_TOP, MARK_NEAR_TOP } from './ladder';
import { emptyInput, isCoop, TIER_NAMES, TIER_NEED, type Actor, type Band, type BrainState, type InputFrame, type Mode, type PlayerSetup, type Prompt, type SiltCloud, type Tier, type WorldEvent } from './types';
import { BIOME_NAMES, biomeAt, biomeWeights, coverAt, groundHeight, LIGHT_WINDOW_Y, type Landmark, type LandmarkKind, microbialAt, nearestNursery, nurseryAt, nurseryFactor, resolveStatic, RISE_RATE, sampleCurrent, sampleHeight, shoreDistance, shoreZ, type StaticContact, SURFACE_Y, World, type Biome, type Boulder, type Cover, type Flora, type WorldData } from './world';
import { areaProfile, bandScale, drawBand, headroom, PASSER_BY } from './population';
import { columnY, DIP_CHANCE, DRIFT_CURRENT, driftRise, flipLaunch, FLIP_STAMINA, PULSE_CYCLE, pulseRefilling, pulseThrust, punting, rowWalkCurrent } from './locomotion';

export interface PlayerProgress {
  prompts: Prompt[];
  flags: Set<string>;
  deaths: number;
  apexT: number;
  message: string;
}

/**
 * What this match turned up: the biomes anybody swam through, the landmarks they found, and the
 * species that reached Apex. The shell keeps a running record of these across sessions and shows
 * it on the results screen, so an endless procedural sea accumulates something.
 */
export interface Discovery {
  biomes: Set<Biome>;
  landmarks: Set<LandmarkKind>;
  apex: Set<CreatureId>;
  /**
   * The furthest rung of the growth ladder each creature has been taken to in Rise this match
   * (see src/sim/ladder.ts). Rise is the mode that is *about* growing up, so it is the one whose
   * high-water mark is worth keeping: the shell folds this into its stored record, shows it on
   * the creature's card, and offers to start there next time instead of as a hatchling.
   */
  best: Map<CreatureId, number>;
}

export interface GameState {
  status: 'playing' | 'won' | 'lost';
  winner: number;
  message: string;
}

/**
 * One line on the scoreboard (hold View). Everyone who is in the running — the local players and
 * the bots filling the empty seats — with what they have done and where they are.
 */
export interface ScoreRow {
  /** Player index, or -1 for a bot. */
  player: number;
  creature: CreatureId;
  name: string;
  /** Tier name, or the era's own stage label. */
  rank: string;
  tier: number;
  /** Progress toward the next rank, 0..1. */
  progress: number;
  kills: number;
  eats: number;
  escapes: number;
  deaths: number;
  alive: boolean;
  biome: string;
  /** Metres from this row's creature to the viewer, or 0 for the viewer's own row. */
  distance: number;
  /** The mode's own number for this player: catch in Hunter & Hunted, otherwise absent. */
  score?: number;
  /** This row is the giant right now. */
  hunting?: boolean;
}

/** The heading above the scoreboard: what this mode is asking of everyone. */
export interface ScoreHeader { title: string; detail: string; clock?: number; }

/** Where a player may teleport: home nursery, or alongside another player. */
export type TeleportDest = 'home' | number;
export interface TeleportOption { dest: TeleportDest; label: string; detail: string; distance: number; }
/**
 * One creature a player could change into, and what they would be if they did.
 *
 * `mark` is where they would arrive on the growth ladder; `kept` says that mark is theirs from an
 * earlier turn in this body rather than a fresh start, which is what makes it worth going back to.
 */
export interface SwapOption { id: CreatureId; name: string; mark: number; kept: boolean; current: boolean }
/** What a body that has been put away keeps until its owner comes back to it. */
interface KeptBody { scale: number; mark: number }
/** One radar contact, in world offsets from the viewer (the renderer rotates it into the camera frame). */
export interface RadarBlip {
  kind: 'player' | 'threat' | 'giant' | 'home' | 'shore' | 'food' | 'landmark' | 'territory';
  dx: number; dz: number; distance: number;
  /**
   * Height of the contact above (positive) or below (negative) the viewer. The dial is read from
   * overhead, so without this a shoal thirty metres up sits on the same spot as one on the sand and
   * you swim to the mark and find nothing. Bearings (home, the shore, landmarks) leave it at 0.
   */
  dy: number;
  /** Player index for `player` blips, actor id otherwise. */
  id: number;
  /** This contact is currently after the viewer. */
  hunting: boolean;
  /** World radius for area contacts (food shoals); point contacts leave it undefined. */
  radius?: number;
  /** How much there is to eat, for area contacts. */
  strength?: number;
}

/**
 * How far the radar reaches, in metres, for a body of this length.
 *
 * Reach is mostly the animal's own size rather than a fixed sweep, because size is how far it
 * travels: a hatchling lives inside a few plants and a prime Dunkleosteus crosses biomes, so a
 * dial that covered the same water for both would be a map for one and a blur for the other.
 * Across the two eras `lengthOf` runs about 0.6 to 16, giving 30 m to 200 m of reach.
 */
export const radarRange = (a: Actor) => RADAR_NEAR + lengthOf(a) * RADAR_PER_LENGTH;
const RADAR_NEAR = 24;
const RADAR_PER_LENGTH = 11;

const { schools: SNACK_SCHOOLS, giants: GIANTS } = ACTIVE_ERA.ecology;

// Feeding on a body. How many bites it takes is the body's length against the eater's, so a
// snack goes down whole and a giant is a meal you have to stay for; each bite tears off its
// share of the carcass.
const BITE_TIME = 0.62;                  // seconds a single bite takes to chew
const MAX_BITES = 12;
export const bitesFor = (eater: Actor, food: Actor) => clamp(Math.ceil(3 * lengthOf(food) / Math.max(lengthOf(eater), 1e-3)), 1, MAX_BITES);

// Crawlers off the seabed. Up there they swim: they go where they are aimed, sprint and dash like
// anything else, and hold their own depth for as long as they are working at it. What separates a
// walker from a swimmer is the two ends of that — height costs stamina (more than they regenerate,
// so open water stays a crossing rather than a second way to live), and a body that stops asking
// for anything settles back to the bottom, where it belongs.
/** A leap out of the water: the pull back down, and the least upward speed that gets a fish through the surface. */
const BREACH_GRAVITY = 14;
/** The least upward speed that gets a fish through the surface, at scale 1: bigger bodies need more. */
const BREACH_MIN_RISE = 3.2;
const PADDLE_SPEED = 0.7;     // fraction of the crawler's cruise while off the floor: a swim, if a laboured one
/**
 * How a walker moves through the water column: gently, both ways. It is not built for this — the
 * whole point of the animal is that the floor is where it belongs — so it climbs at well under a
 * swimmer's rise and settles back at a drift rather than a drop. The old rates were brisk enough
 * that leaving the bottom and returning to it read as bobbing rather than as labouring.
 */
const PADDLE_RISE = 1.5;      // climb speed, units/s at scale 1 (a swimmer's rise is RISE_RATE, and far faster)
const PADDLE_SINK = 1.2;      // terminal sink once the body stops asking to go anywhere — a settle, not a fall
/** How fast the settle reaches its terminal speed. Low: the fall eases in rather than switching on. */
const PADDLE_SINK_EASE = 5;
/**
 * Per second while a walker is gaining height, however the height was asked for. Above the 14/s a
 * moving body regenerates, so a climb is a real cost and not a rounding error — which is what
 * keeps open water somewhere a walker crosses rather than somewhere it lives.
 */
const PADDLE_STAMINA = 24;
/**
 * Sprint cost, per second at full trigger. A sprint is meant to be how you cross water and close a
 * gap, not a two-second window: at this rate a full bar runs for most of a minute, and the swim
 * back is still paid for out of the same bar.
 */
const BURST_STAMINA = 7.5;
/**
 * How long a body has to keep pushing into an obstacle before it starts climbing it. Long enough
 * that brushing a rock on the way past is not a climb, short enough that meaning to go over one
 * never feels like an argument with the controls.
 */
const CLIMB_PUSH = 0.35;
/**
 * How little of a step's travel has to survive the climb (see `followFloor`) before the face
 * counts as something to be climbed rather than walked up: at a twentieth, the body has stopped
 * making headway and is going straight up the side of it.
 */
const STALL = 0.05;

/**
 * Co-op revive. A downed player in Rise lies on the floor for this long instead of dissolving
 * after the usual three seconds, and any living team-mate who swims into them brings them back
 * where they fell with no tier lost. Solo, and in every versus mode, death is unchanged: the
 * window only opens when there is somebody who could actually reach you.
 */
const DOWNED_WINDOW = 10;
/**
 * How long a killed player stays dead before hatching again, and so how long they spend watching.
 *
 * Death used to cut to a dialog after three seconds, which is barely long enough to register what
 * ate you. The camera rides with whatever killed you for this window instead — you watch it finish
 * the meal, told what happened by a line of text rather than a panel over the action — and only
 * then does the screen fade out and slowly back in on the new body. The renderer takes its fade
 * times from this constant (`CORPSE_WINDOW`), so the two never drift apart.
 */
export const CORPSE_WINDOW = 7;
/**
 * The heavy button pressed while sprinting or mid-dash is a **charge**: the same move RT always
 * plays, but thrown at whatever is nearest the line the body is actually travelling along rather
 * than at what it happens to be pointing at, and paid for with this much stamina on top of the
 * move's own cost. Committing your momentum should cost more than standing still and swinging.
 */
const CHARGE_STAMINA = 8;
/**
 * How far off the line of travel a charge will reach to find something, in body lengths plus a
 * fixed margin so a larva is not left threading a needle, and how much further along that line it
 * looks than a standing pounce would.
 */
const CHARGE_LATERAL = 1.2, CHARGE_REACH = 1.3;
/**
 * Close attacks turn onto what they are nearly pointing at. A bite that misses by five degrees is
 * the player's aim being read too literally, not a decision they made — but the turn is capped so
 * it stays a nudge and never swings the body round onto something behind you.
 */
const AIM_NUDGE = 0.4, AIM_NUDGE_CONE = 0.45;
/** How far down its own body a grabber's grip sits, in body lengths: the mouth end, as the bite uses. */
export const GRASP_AT = 0.42;
/**
 * How far an animal can reach to take hold, in its own body lengths, measured to the far body's
 * surface. An animal built to grasp closes arms and gets the longer reach; everything else has
 * only its jaws, so its grip is its bite's reach — every creature can take hold of something, and
 * the ones with claws for it find it easier, which is what `grasp` is for.
 */
const GRASP_REACH = 0.85, BITE_GRASP_REACH = 0.45;
/** How far off dead ahead a grip may close, in the yaw plane: roughly the same arc as the bite's aim. */
const GRASP_CONE = 0.35;
/**
 * How long a button has to be down before a grip closes. A tap is an attack and a hold is a grab,
 * which is the only honest way one button can mean both — and it is every attack button, so
 * whatever an animal hits with, holding it down is how it holds on.
 *
 * An animal with arms for it closes in `GRASP_HOLD`; one taking hold with its mouth alone works at
 * it for longer. The grip button (RT, or the ability) skips the wait for a grasper against
 * something too big to be a mouthful, and fires no strike when it does: there is no useful heavy
 * blow on a body four times your length, so the only thing that press can sensibly mean is "take
 * hold", and taking hold without bothering the animal is the whole point of riding it.
 */
const GRASP_HOLD = 0.18, BITE_GRASP_HOLD = 0.45;
/** What this animal's grip costs it: how far it reaches and how long it must hold, by build. */
export const gripReach = (def: ReturnType<typeof creature>, L: number) => L * (def.grasp ? GRASP_REACH : BITE_GRASP_REACH);
export const gripHold = (def: ReturnType<typeof creature>) => (def.grasp ? GRASP_HOLD : BITE_GRASP_HOLD);
/** What a player has hold of, as the HUD needs to show it. See `Game.gripFor`. */
export interface GripHud {
  /** Clinging to something its own size or bigger, carrying a mouthful, held in something else's jaws, or holding a spent button. */
  kind: 'ride' | 'hold' | 'held' | 'spent';
  /** What is in the grip. Empty for `spent`, which has nothing in it. */
  name: string; band: Band;
  /**
   * What letting go *right now* would do — the only thing about a grip a player needs decided in
   * the moment. A grip has two windows and they both run from contact: release a ride inside
   * `GRIP_STRIKE` and it is the blow the grip stood in for, past it the animal never knew you were
   * there; release a mouthful inside `GRIP_MEAL` and you eat it, past it it has worked loose.
   */
  release: 'strike' | 'eat' | 'escape' | 'nothing';
  /**
   * How much of that window is left, 1 → 0, or absent when nothing is running down — which a ride
   * settles into once it has stopped being an attack, and is the honest thing to show then.
   */
  left?: number;
}
/**
 * How far past its own pounce range an animal will look for something to take hold of. Wide enough
 * to find a full-grown giant across open water — they are the reason the pursuit exists — and it
 * is only the *search*: the range test that follows still scales with how big what it found is.
 */
const GRAB_SWEEP = 90;
/** What a frame's reach for a grip came to: nothing there, still closing, or closed. */
type GraspResult = 'none' | 'closing' | 'took';

/**
 * The world point where a held body's grip sits, offset from its centre. `grabOff` is a unit
 * direction in the body's own frame; the length of it is the body's own half-width, so it is a
 * point on the surface of the animal and not somewhere inside it.
 */
export function graspPoint(v: Actor): Vec3 {
  const vh = heading(v.yaw), r = bodyRadius(v);
  // On the animal, not on a ball drawn round its middle. `grabOff` is a direction in the victim's
  // own frame; this is where that direction leaves the body, taken as a capsule down its axis —
  // so far along the spine, then out from it by the body's half-width. On anything long the two
  // differ by most of its length: a grip on the tail of a body twenty units from nose to tail sat
  // four units from its centre, which is up by the shoulder, and the hold visibly did not touch.
  const half = Math.max(0, lengthOf(v) * 0.5 - r);
  const o = v.grabOff;
  const outX = -vh.z * o.x, outZ = vh.x * o.x, outY = o.y;
  const ol = Math.hypot(outX, outY, outZ);
  if (ol < 1e-6) {
    // Straight up the axis: one of the two round ends.
    const end = clamp(o.z, -1, 1) * (half + r);
    return { x: vh.x * end, y: 0, z: vh.z * end };
  }
  const along = clamp(o.z * (half + r), -half, half), k = r / ol;
  return { x: vh.x * along + outX * k, y: outY * k, z: vh.z * along + outZ * k };
}
/**
 * How far the same nudge may tip the nose up or down. Larger than the yaw allowance because the
 * two are not aimed with the same instrument: yaw is the stick, which a player points precisely,
 * while elevation comes off the camera's pitch, which is coarse and spends part of its travel on
 * the follow angle. Prey a body length above you sat forty-five degrees off the aim even after
 * the nudge had lined the bite up perfectly in the horizontal.
 */
const AIM_NUDGE_PITCH = 0.7;
/** Seconds of that window spent fading out at the end of it. */
export const DEATH_FADE = 1.2;
/**
 * How close a team-mate has to be when you go down for the window to open at all. Roughly what a
 * sprint covers in the window itself, so a rescue is always a real race and never a formality —
 * and so a partner on the far side of an endless sea does not leave you lying there for ten
 * seconds waiting for somebody who was never coming.
 */
const REVIVE_REACH = 90;
/** Seconds a rescuer must hold station beside a downed team-mate. */
const REVIVE_HOLD = 0.6;

/**
 * Hunter & Hunted takes turns. Every human player gets one stint as the giant, of at most this
 * long, and is scored on the same job: how many of the small ones they caught. Playing prey is
 * how you set the others' score down, not a role you are stuck in for the match.
 */
const HUNT_TURN = 100;
/** The pause between turns, so the hand-over reads as a hand-over. */
const HUNT_BREAK = 3.5;

/**
 * What one pass over one actor has worked out about this frame, handed from each step of
 * `Game.updateActor` to the next.
 *
 * `updateActor` used to be a single five-hundred-line run covering timers, hiding, stamina,
 * swimming, collision, climbing, orientation and every action — one subject after another with
 * nothing but local variables tying them together, and ordering rules that were only implicit in
 * how far down the page a thing sat. These are the values that genuinely cross those boundaries,
 * named once so a step can say what it needs.
 */
interface Step {
  def: ReturnType<typeof creature>;
  /** Body length and the speed factor for this scale, wanted by nearly everything. */
  L: number; sf: number;
  /** Rising edges on the buttons, read once at the top of the frame. */
  justLight: boolean; justHeavy: boolean; justAbility: boolean; justDodge: boolean;
  justGuard: boolean; justLock: boolean; justSense: boolean; justDash: boolean;
  /** A crawler off the seabed: it paddles, and can neither sprint nor dash. */
  paddling: boolean;
  /** Sprinting on stamina this frame (`freeBurst` is a special's free one, which does not drain). */
  bursting: boolean;
  /** Where the stick is pointing in world space, and how hard. */
  dir: Vec3; mag: number;
  /** The lock target, if it is still alive, and whether this body jets rather than swims. */
  locked: Actor | undefined; jets: boolean;
  /**
   * How much of this frame's sprint or dash is climb, and so given to the body for nothing (0..1),
   * and whether that is enough that an empty bar cannot refuse it. Always 0 without era rules.
   */
  relief: number; freeClimb: boolean;
}

/**
 * How long a hatchling spends coming out of its egg. The bottom rung only: everything above it is
 * a moult, which is the same second-long swell it always was. Five seconds is a long time to hold
 * a player still, and it is the point — you hatch once a life, and the first thing the sea shows
 * you is that you are the smallest thing in it.
 */
export const HATCH_TIME = 5;
/** How far through the hatch the body is out of the shell and free to swim. */
export const HATCH_FREE = 0.72;


export class Game implements AiWorld {
  world: WorldData;
  actors: Actor[] = [];
  private idMap = new Map<number, Actor>();
  hash = new SpatialHash<Actor>(10);
  /** Scratch for `resolveStatic` / `resolveFlora`: what the last body pushed out of the scenery ran into. */
  private contact: StaticContact = { hit: false, climbTo: -Infinity, wallTop: -Infinity };
  private floraContact: FloraContact = { blocked: false, headOn: false, top: -Infinity };
  events: WorldEvent[] = [];
  silt: SiltCloud[] = [];
  time = 0;
  rng: Rng;
  nextId = 1;
  mode: Mode;
  players: Actor[] = [];
  /**
   * Every creature each player has worn this match, and how far it had grown when they left it.
   *
   * Changing body is not a restart: the animal you put down keeps its size and its meter, and is
   * exactly where you left it when you pick it up again. That is what lets one session raise
   * several creatures instead of one — the sea is the same sea, and the growing is per animal.
   */
  private kept: Map<CreatureId, KeptBody>[] = [];
  progress: PlayerProgress[] = [];
  state: GameState = { status: 'playing', winner: -1, message: '' };
  /**
   * Set once a finished co-op match is carried on past its goal (`continueMatch`). The mode's win
   * check never fires again, so the sea stays open; nothing else about the match is touched.
   */
  endless = false;
  /**
   * Hunter & Hunted: whose turn it is to be the giant, which turn this is, and how many each
   * player has caught on their own turn. `hunterIndex` is -1 during the hand-over pause, when
   * nobody is the giant.
   */
  hunterIndex = 0;
  huntTurn = 0;
  huntTurns = 1;
  huntScore: number[] = [];
  huntTurnT = 0;
  huntBreakT = 0;
  readonly discovery: Discovery = { biomes: new Set(), landmarks: new Set(), apex: new Set(), best: new Map() };
  private scratchActors: Actor[] = [];
  private scratchBoulders: Boulder[] = [];
  /** Last grip decision per player, for the match recorder. Written only for players; never read by the sim. */
  private graspReasons = new Map<number, string>();
  private scratchCover: Cover[] = [];
  private scratchFlora: Flora[] = [];
  private ambientTimer = 0;
  /**
   * How much is left on each `bones` landmark, 0..1 by landmark id. A dead giant is the biggest
   * meal in the sea and it does not last: it feeds whoever finds it, runs out, and slowly becomes
   * worth visiting again as the deep delivers another body to the same spot.
   *
   * Not to be confused with `render/carcass.ts`, which cuts an eaten body out of its own model.
   * This is the standing skeleton the world generator places, not a creature that just died.
   */
  private bonesMeat = new Map<number, number>();
  private stepIndex = 0;
  private schoolCount = 0;
  private hitCtx: HitContext;
  setups: PlayerSetup[];

  constructor(mode: Mode, setups: PlayerSetup[], seed = 5052026) {
    this.mode = mode;
    this.setups = setups;
    this.rng = makeRng(seed ^ 0x9e37);
    // Everyone hatches in the origin nursery, just off the shore: the one fixed point in an endless sea.
    this.world = new World(seed);
    const nursery = nurseryAt(0);
    this.world.loadAround(nursery);
    this.hitCtx = { events: this.events, byId: (id) => this.idMap.get(id), time: 0, rng: this.rng, armour: RULES ? (att, vic, dir) => RULES!.armour(att, vic, dir) : undefined };
    // One turn as the giant each. A single human plays the mode exactly as it was before.
    this.huntTurns = mode === 'hunted' ? Math.max(1, setups.length) : 1;
    this.huntScore = setups.map(() => 0);
    const hatchers: Actor[] = [];
    setups.forEach((s, i) => {
      // Rise can start you part-grown, at the furthest rung you have taken this creature to before.
      // Both eras derive everything else from the body scale — the Cambrian's tier through
      // `tierForScale`, the Devonian's stage through `stageForScale` — so one number does it.
      const carry = mode === 'rise' ? clampMark(s.startRung ?? 0) : 0;
      const startScale = carry > 0 ? ladderScale(s.creature, carry)
        : RULES ? RULES.startScale(mode, this.eraRoleIndex(i), s.creature) : mode === 'rise' ? tierScale(s.creature, 0) : mode === 'hunted' ? (this.isHunter(i) ? 3.0 : tierScale(s.creature, 1)) : mode === 'reef' ? tierScale(s.creature, 2) : tierScale(s.creature, 1);
      const a = this.spawn(s.creature, 'player', this.spawnPoint(nursery, s.creature, startScale, i), startScale, i);
      // Arriving on the top rung means the goal is already behind you: no clock, just the sea.
      a.carriedTop = carry >= LADDER_TOP;
      a.home = { ...nursery };
      a.yaw = Math.PI;                                   // facing out to sea
      this.players.push(a);
      this.kept.push(new Map());
      this.progress.push({ prompts: [], flags: new Set(), deaths: 0, apexT: 0, message: '' });
      // Carrying a creature on part-grown skips the egg: that animal has already been through this.
      if (carry === 0) hatchers.push(a);
    });
    if (mode === 'hunted') {
      // Fill to 4 with bots
      for (let i = setups.length; i < 4; i++) {
        const c = this.pickBot(setups.map((s) => s.creature), i);
        // Bots are never the giant: the loop starts past the human seats, so `i` is never 0.
        const botScale = RULES ? RULES.startScale(mode, i, c) : tierScale(c, 1);
        // an era may hatch its bots in a different nursery, so the players' one is a quiet start
        const botHome = RULES?.botNursery(i) ?? nursery;
        // keep every hatching ground loaded: streaming around one point alone would drop the others
        if (botHome !== nursery) this.world.stream([nursery, ...this.actors.filter((a) => a.controller === 'bot').map((b) => b.home), botHome], 1e6);
        const bot = this.spawn(c, 'bot', this.spawnPoint(botHome, c, botScale, i), botScale);
        bot.home = { ...botHome };
        bot.brain = makeBrain('needs', botHome, this.rng, { aggression: 0.9, reaction: 0.2, parrySkill: 0.55 });
      }
    }
    this.populate();
    RULES?.init(this);
    // A run that starts on the bottom rung starts in an egg, the same as every hatch after it.
    // After the era's init, because the rung a body stands on is the era's own bookkeeping and
    // does not read right until that has run — before it, every Devonian player looked like a
    // hatchling and a grown one was buried in an egg on the seabed.
    for (const a of hatchers) if (ladderRung(this, a) === 0) this.beginHatch(a);
    // Last, because an era's init sets its own growth state from the body it finds: a mark that
    // carries a part-filled meter has to be applied on top of that, not before it.
    setups.forEach((s, i) => {
      const fill = mode === 'rise' ? fillOf(s.startRung ?? 0) : 0;
      if (fill > 0) ladderFill(this, this.players[i], fill);
    });
  }

  /** Whether this player index is the giant right now. Only ever true in Hunter & Hunted. */
  isHunter(index: number) { return this.mode === 'hunted' && index >= 0 && index === this.hunterIndex; }

  /**
   * Both eras write their Hunter & Hunted rule as "player index 0 is the giant". Turns move that
   * role around, so the current giant is presented to the era as index 0 and everybody else as
   * index 1; nothing in the era packs has to know that the role rotates.
   */
  private eraRoleIndex(index: number) { return this.mode === 'hunted' ? (this.isHunter(index) ? 0 : 1) : index; }

  /** A bot's species: anything a player might pick. */
  private pickBot(taken: CreatureId[], i: number): CreatureId {
    // Bots pick from the same list the player chose from, so a rival is always an animal the
    // player could have been (and always has its own model rather than a borrowed one).
    const from = PLAYABLE_IDS;
    void i;
    return from[Math.floor(this.rng() * from.length)];
  }

  /** The points the world streams around and the ecosystem is kept alive near: every player and bot. */
  anchors(): Vec3[] {
    const out: Vec3[] = [];
    for (const a of this.actors) if (a.controller === 'player' || a.controller === 'bot') out.push(a.pos);
    if (!out.length) out.push(nurseryAt(0));
    return out;
  }
  private randomAnchor() { const an = this.anchors(); return an[Math.floor(this.rng() * an.length)]; }
  /** Distance from the closest player or bot. */
  private anchorDistance(p: Vec3) { let d = Infinity; for (const a of this.anchors()) d = Math.min(d, distXZ(a, p)); return d; }

  byId(id: number) { return this.idMap.get(id); }
  nearby(pos: Vec3, r: number) {
    const out = this.hash.query(pos.x, pos.z, r, this.scratchActors);
    return out.filter((a) => dist(a.pos, pos) <= r);
  }
  nearestCover(pos: Vec3, length: number, r: number) {
    let best: Cover | undefined, bd = Infinity;
    for (const c of this.world.coverHash.query(pos.x, pos.z, r, this.scratchCover)) {
      if (c.maxLength < length) continue;
      const d = dist(pos, c.pos);
      if (d < bd && d < r) { bd = d; best = c; }
    }
    return best;
  }

  private spawnPoint(center: Vec3, c: CreatureId, s: number, index = 0): Vec3 {
    const inCover = RULES?.spawnPoint(this, center, c, s, index);
    if (inCover) return inCover;
    const def = creature(c);
    const ang = index * 1.7 + this.rng() * 0.8, d = 3 + this.rng() * 6;
    const x = center.x + Math.cos(ang) * d, z = center.z + Math.sin(ang) * d;
    const g = groundHeight(this.world, x, z, this.scratchBoulders);
    const L = def.adultLength * s;
    return { x, y: RULES ? RULES.spawnY(g, L, !!def.ground) : def.ground ? g + L * 0.13 : g + 1.2 + L * 0.5, z };
  }

  spawn(c: CreatureId, controller: Actor['controller'], pos: Vec3, scale: number, player = -1): Actor {
    const a = makeActor(this.nextId++, c, controller, pos, scale, player);
    if (controller === 'player' && RULES) a.spawnProtect = RULES.spawnProtect(a);   // an era may shelter its hatchlings longer
    a.yaw = this.rng() * TAU; a.prevT.yaw = a.yaw;
    this.actors.push(a);
    this.idMap.set(a.id, a);
    return a;
  }

  private remove(a: Actor) {
    const i = this.actors.indexOf(a);
    if (i >= 0) this.actors.splice(i, 1);
    this.idMap.delete(a.id);
  }

  /** Initial ecosystem. */
  private populate() {
    // Snack schools
    SNACK_SCHOOLS.forEach((s, i) => this.spawnSchool(s.creature, s.scale, s.count, i));
    // Ambient adults
    for (let i = 0; i < 26; i++) this.spawnAmbient(true);
    // Giants: one of each kind lives in the region around the players and moves with them.
    for (const c of GIANTS) this.placeGiant(this.spawn(c.creature, 'giant', { ...nurseryAt(0) }, c.scale));
    const shadow = this.spawn(ACTIVE_ERA.ecology.shadow.creature, 'shadow', { ...nurseryAt(0) }, ACTIVE_ERA.ecology.shadow.scale);
    this.placeGiant(shadow);
  }

  /**
   * Give a giant a home and patrol loop 130–210 units from a player, in the biome it belongs to
   * (channels and deep water for Anomalocaris, boulders for Olenoides, sponge forest for
   * Opabinia), never in a nursery and never on the beach. Used at start and whenever a giant has
   * been left far behind by every player.
   */
  private placeGiant(g: Actor) {
    // Not while somebody is holding on to it: moving it to a new lair would take the rider with it,
    // across the sea, in one step.
    if (g.riddenBy >= 0) return;
    const def = GIANTS.find((c) => c.creature === g.creature) ?? GIANTS[0];
    const shadow = g.controller === 'shadow';
    const anchor = this.randomAnchor();
    let best: Vec3 = { x: anchor.x, y: 0, z: anchor.z - 160 }, bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const ang = this.rng() * TAU, d = shadow ? 60 + this.rng() * 40 : 130 + this.rng() * 80;
      const x = anchor.x + Math.cos(ang) * d, z = anchor.z + Math.sin(ang) * d;
      if (shoreDistance(x, z) < 45 || nurseryFactor(x, z) > 0.1) continue;
      const w = biomeWeights(x, z);
      let score = this.rng() * 0.3;
      for (const b of def.biomes) score += w[b];
      if (score > bestScore) { bestScore = score; best = { x, y: 0, z }; }
    }
    const r = shadow ? 70 : 35 + this.rng() * 15;
    const y = shadow ? SURFACE_Y - 3 : def.ground ? 0 : 22;
    const n = shadow ? 10 : 6;
    const route = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      const x = best.x + Math.cos(a) * r, z = best.z + Math.sin(a) * r;
      return { x, y: def.ground ? sampleHeight(x, z) + 1.5 : y + Math.abs(Math.sin(i * 1.7)) * 5, z };
    });
    g.pos = { ...route[0] };
    g.vel = v3();
    g.brain = makeBrain('giant', route[0], this.rng, { patrol: route });
  }

  /**
   * A school sized to be prey for this player, spawned just out of sight. A crawler is fed on
   * its own level: seafloor species by preference, and anything else planted just above the
   * sediment rather than left drifting overhead where it cannot be reached.
   */
  private spawnPreyFor(p: Actor) {
    const L = lengthOf(p);
    const def = creature(p.creature);
    const crawlers = CREATURE_IDS.filter((id) => creature(id).ground);
    const pool = def.ground
      ? (this.rng() < 0.8 && crawlers.length ? crawlers : CREATURE_IDS.slice())
      : CREATURE_IDS.filter((id) => !creature(id).ground);
    const c = pool[Math.floor(this.rng() * pool.length)];
    const cd = creature(c);
    const ratio = 0.28 + this.rng() * 0.32;            // snack to small prey relative to the player
    const s = clamp((L * ratio) / cd.adultLength, 0.06, 2.2);
    const count = (s < 0.2 ? 12 : s < 0.6 ? 8 : 5) + (def.ground ? 4 : 0);
    const ang = this.rng() * TAU, d = 24 + this.rng() * 18 + L * 2;
    const home = this.offshore({ x: p.pos.x + Math.cos(ang) * d, y: 0, z: p.pos.z + Math.sin(ang) * d });
    const g = sampleHeight(home.x, home.z);
    const onFloor = cd.ground || def.ground;
    home.y = onFloor ? g : clamp(p.pos.y + (this.rng() - 0.5) * 6, g + 1.5, SURFACE_Y - 3);
    const schoolId = this.schoolCount++;
    for (let k = 0; k < count; k++) {
      const pos = { x: home.x + (this.rng() - 0.5) * 5, y: home.y + (this.rng() - 0.5) * 2, z: home.z + (this.rng() - 0.5) * 5 };
      if (onFloor) pos.y = groundHeight(this.world, pos.x, pos.z, this.scratchBoulders) + (cd.ground ? cd.adultLength * s * 0.13 : 0.6 + this.rng() * 1.2);
      const a = this.spawn(c, 'swarm', pos, s);
      a.brain = makeBrain('swarm', home, this.rng, { schoolId });
    }
  }

  /** Keep a point in swimmable water: at least 20 units off the beach. */
  private offshore(p: Vec3): Vec3 {
    const s = shoreDistance(p.x, p.z);
    if (s < 20) p.z -= 20 - s;
    return p;
  }

  private spawnSchool(c: CreatureId, s: number, count: number, i: number) {
    const def = creature(c);
    const anchor = this.randomAnchor();
    let home: Vec3;
    if (i < 8) { const n = nearestNursery(anchor.x, anchor.z).pos; const a = i * 0.8; home = { x: n.x + Math.cos(a) * 8, y: 0, z: n.z + Math.sin(a) * 8 }; }
    else {
      const a = this.rng() * TAU, d = 30 + Math.sqrt(this.rng()) * 90;
      home = this.offshore({ x: anchor.x + Math.cos(a) * d, y: 0, z: anchor.z + Math.sin(a) * d });
    }
    const g = sampleHeight(home.x, home.z);
    home.y = def.ground ? g : (i % 4 === 1 ? LIGHT_WINDOW_Y : g + 2.5 + this.rng() * 5);
    const schoolId = this.schoolCount++;
    for (let k = 0; k < count; k++) {
      const p = { x: home.x + (this.rng() - 0.5) * 6, y: home.y + (this.rng() - 0.5) * 2, z: home.z + (this.rng() - 0.5) * 6 };
      if (def.ground) p.y = groundHeight(this.world, p.x, p.z, this.scratchBoulders) + 0.1;
      const a = this.spawn(c, 'swarm', p, s);
      a.brain = makeBrain('swarm', home, this.rng, { schoolId });
    }
  }

  private maxPlayerTier(): Tier {
    let t: Tier = 0;
    for (const p of this.players) if (p.tier > t) t = p.tier;
    return t;
  }

  private spawnAmbient(initial = false, near?: Vec3) {
    const c = CREATURE_IDS[Math.floor(this.rng() * CREATURE_IDS.length)];
    const def = creature(c);
    const anchor = near ?? this.randomAnchor();
    // One spawn in five is simply something big going past, up in the water and regardless of what
    // the seabed under it holds: swimming up is always a way to find a larger animal, whatever
    // shelf of fingerlings you happen to be over.
    const passing = !initial && !def.ground && this.rng() < PASSER_BY;
    let pos: Vec3 | undefined;
    let s = 0.5;
    for (let tries = 0; tries < 20 && !pos; tries++) {
      const a = this.rng() * TAU, d = initial ? 20 + Math.sqrt(this.rng()) * 110 : 60 + Math.sqrt(this.rng()) * 90;
      const x = anchor.x + Math.cos(a) * d, z = anchor.z + Math.sin(a) * d;
      if (shoreDistance(x, z) < 20) continue;
      if (!initial && this.players.some((p) => distXZ(p.pos, { x, y: 0, z }) < 55)) continue;
      // Nothing here turns big animals away from the nurseries any more: they are safe because
      // nothing in one picks a fight (`peaceful` in ai.ts), not because only small things fit.
      const g = groundHeight(this.world, x, z, this.scratchBoulders);
      // What lives *here*: the area's own character rather than one distribution for the whole
      // sea (`src/sim/population.ts`). A shelf of fingerlings and a channel of grown animals are
      // both places you can end up in, which is what makes moving on worth doing.
      let band = passing && headroom(g) > 0.35 ? 'large' : drawBand(this.rng, areaProfile(x, z, this.world.seed));
      // A grown animal needs water over it. In the shallows there is nowhere for one to be except
      // lying on the sand, which is exactly what a big fish does not do, so the area's adults are
      // out where the bottom drops away and what is inshore is half grown at most.
      if (band === 'large' && headroom(g) < 0.45) band = 'mid';
      s = bandScale(this.rng, band);
      // A crawler goes on the sand. A swimmer goes where a body its size belongs: small animals
      // anywhere in the column including the bottom, a big one up in the water where it can be
      // seen passing (`columnY`), with the occasional pass down over the floor.
      const bodyL = def.adultLength * s;
      pos = { x, y: RULES ? RULES.spawnY(g, bodyL, !!def.ground)
        : def.ground ? g + bodyL * 0.13
        : columnY(g, SURFACE_Y, bodyL, this.rng, !passing && bodyL > 2.5 && this.rng() < DIP_CHANCE), z };
    }
    if (!pos) return;
    const a = this.spawn(c, 'ambient', pos, s);
    a.brain = makeBrain('needs', pos, this.rng, this.temperament(a, pos));
  }


  /**
   * What kind of neighbour this animal is.
   *
   * Most of the reef is indifferent: it feeds when it is hungry and otherwise leaves you alone.
   * On top of that two dispositions are dealt out, because a sea where the only question is
   * "can it eat me" runs out of questions:
   *
   * - **Grumpy** ones have a personal space and see off anything their own size that enters it,
   *   whatever the hour. They are the reason you do not swim straight through a crowd.
   * - **Territorial** ones hold a patch and drive intruders out of it, then go home. They never
   *   follow past the edge, so they are a decision rather than a threat: the ground they are
   *   sitting on is often worth crossing, and you can always choose not to.
   *
   * Bigger, better-armed animals hold ground more often — a larva has nothing to hold — and
   * grazers and filter feeders mostly do not, having somewhere to be rather than something to
   * defend.
   */
  private temperament(a: Actor, pos: Vec3): Partial<BrainState> {
    const def = creature(a.creature);
    const grown = a.scale >= tierScale(a.creature, 2) * 0.8;
    // Filter feeders, grazers and deposit feeders have somewhere to be rather than something to
    // defend. A scavenger sitting on a body very much has something to defend.
    const settled = (!def.diet || def.diet === 'scavenger') && grown;
    const roll = this.rng();
    // A third of the grown, armed animals hold a patch; a fifth of everything grown is just grumpy.
    if (settled && roll < 0.34) {
      const L = lengthOf(a);
      return { temper: 0.35 + this.rng() * 0.4, territory: { ...pos }, territoryR: 26 + L * 4 + this.rng() * 18 };
    }
    if (grown && roll < 0.55) return { temper: 0.4 + this.rng() * 0.5 };
    return {};
  }

  /** Cover (0..1) for an actor including temporary silt. Plants are queried every fourth step (staggered) since cover changes slowly. */
  coverFor(a: Actor): number {
    let c = ((a.id + this.stepIndex) & 3) === 0 || a.controller === 'player' ? coverAt(this.world, a.pos, lengthOf(a), this.scratchCover) : a.cover;
    for (const s of this.silt) if (dist(s.pos, a.pos) < s.radius) c = Math.max(c, 0.75);
    if (isHidden(a)) c = 1;
    return c;
  }

  /**
   * Carry a finished co-op match on instead of ending it. The goal has been met and recorded; this
   * puts the sea back the way it was and stops the mode asking for it again, so the reef stays
   * playable as a free swim. Versus modes refuse: their result is a verdict between players.
   * Returns whether the match resumed.
   */
  continueMatch(): boolean {
    if (this.state.status === 'playing' || !isCoop(this.mode)) return false;
    this.endless = true;
    this.state = { status: 'playing', winner: -1, message: '' };
    for (const pr of this.progress) pr.apexT = 0;
    RULES?.continueMatch(this);
    return true;
  }

  /** Main fixed step. `inputs` maps player index → InputFrame. */
  step(dt: number, inputs: Map<number, InputFrame>) {
    if (this.state.status !== 'playing') return;
    this.time += dt; this.hitCtx.time = this.time;
    this.stepIndex++;
    // Snapshot every transform so the renderer can interpolate across this step.
    for (const a of this.actors) {
      const t = a.prevT;
      t.x = a.pos.x; t.y = a.pos.y; t.z = a.pos.z; t.yaw = a.yaw; t.pitch = a.pitch; t.bank = a.bank;
    }
    // The sea streams in around whoever is in it, a couple of chunks a step so nothing hitches.
    this.world.stream(this.anchors(), 2);
    this.hash.rebuild(this.actors);

    for (const a of this.actors) {
      if (a.state === 'dead') { this.updateCorpse(a, dt); continue; }
      if (a.state === 'swallowed') { this.updateSwallowed(a, dt); continue; }
      const input = a.controller === 'player' ? (inputs.get(a.player) ?? emptyInput()) : a.brain ? think(this, a, dt) : emptyInput();
      this.updateActor(a, input, dt);
    }
    this.resolveActorOverlap();
    stepFlora(this.world, dt);
    this.updateSilt(dt);
    this.updatePopulation(dt);
    this.restockBones(dt);
    this.stepPrompts(dt);
    this.updateDiscovery();
    RULES?.step(this, dt);
    this.updateModes(dt);
    for (const a of this.actors) if (a.state === 'dead' && a.corpseT > 45 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
    for (const a of this.actors) if (a.state === 'dead' && a.eaten >= 1 && a.controller !== 'player' && a.controller !== 'bot') this.remove(a);
  }

  /** In a predator's mouth: slide in, shrink, and after the gulp become a consumed corpse. */
  private updateSwallowed(a: Actor, dt: number) {
    a.stateT += dt;
    const pred = a.swallowedBy >= 0 ? this.idMap.get(a.swallowedBy) : undefined;
    if (!pred || !isAlive(pred)) { kill(this.hitCtx, a, pred); a.swallowedBy = -1; return; }
    const h = heading(pred.yaw); const PL = lengthOf(pred);
    const t = clamp(a.stateT / a.stateDur, 0, 1);
    const depth = 0.42 - t * 0.25;                         // slides from the mouth toward the gut
    const tx = pred.pos.x + h.x * PL * depth, ty = pred.pos.y - Math.sin(pred.pitch) * PL * depth * 0.6, tz = pred.pos.z + h.z * PL * depth;
    a.pos.x = damp(a.pos.x, tx, 16, dt); a.pos.y = damp(a.pos.y, ty, 16, dt); a.pos.z = damp(a.pos.z, tz, 16, dt);
    a.yaw = pred.yaw; a.pitch = pred.pitch; a.bank = damp(a.bank, Math.PI * 0.5, 4, dt);
    a.hitFlash = 0.2;
    if (a.stateT >= a.stateDur) {
      kill(this.hitCtx, a, pred);
      a.eaten = 1;                                        // nothing left to scavenge
      const val = this.nutritionValue(pred, a);
      this.gainNutrition(pred, a, val); pred.eats++; pred.hp = Math.min(pred.hpMax, pred.hp + val * 0.5);
      if (a.controller === 'player' || a.controller === 'bot') a.respawnT = a.stateDur; else this.remove(a);
    }
  }

  /**
   * Corpses go limp, roll belly-up and drift slowly upward with the current, so a dead thing reads as
   * dead at a glance. Players and bots dissolve into sparkles after three seconds and respawn.
   */
  private updateCorpse(a: Actor, dt: number) {
    a.corpseT += dt; a.stateT += dt;
    const def = creature(a.creature);
    const inMouth = a.eaten >= 1 && a.swallowedBy >= 0;
    // A downed team-mate is not a corpse yet: they settle where they fell and stay there. A body
    // that drifted up with the current the way a dead one does would float out of reach of the
    // ally swimming down to it, and the rescue would be a matter of luck rather than of speed.
    const downed = this.revivable(a);
    if (downed) {
      const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a) * 0.6;
      a.vel.x = damp(a.vel.x, 0, 3, dt); a.vel.z = damp(a.vel.z, 0, 3, dt);
      a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt;
      a.pos.y = Math.max(floor, damp(a.pos.y, floor, 2.5, dt));
      a.vel.y = 0;
      a.bank = damp(a.bank, Math.PI * 0.75, 1.6, dt);       // rolled over, but not adrift
      a.pitch = damp(a.pitch, 0, 2, dt);
    } else if (!inMouth) {
      const floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a) * 0.6;
      const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, this.time);
      const ceiling = Math.min(SURFACE_Y - 2, a.deathY + 4 + lengthOf(a));
      a.vel.x = damp(a.vel.x, cur.x * 0.8, 1.2, dt); a.vel.z = damp(a.vel.z, cur.z * 0.8, 1.2, dt);
      a.vel.y = damp(a.vel.y, a.pos.y < ceiling ? 0.45 : 0, 0.9, dt);
      a.pos.x += a.vel.x * dt; a.pos.y = Math.max(floor, a.pos.y + a.vel.y * dt); a.pos.z += a.vel.z * dt;
      // roll over, then keep a lazy tumble that dies away
      const k = Math.exp(-a.corpseT * 0.6);
      a.bank = damp(a.bank, Math.PI + a.tumble.z * 0.5 * k, 2.2, dt);
      a.pitch = damp(a.pitch, a.tumble.x * 0.45 * k, 2, dt);
      a.yaw = wrapAngle(a.yaw + a.tumble.y * k * dt);
      void def;
    }
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    if (a.controller === 'player' || a.controller === 'bot') {
      a.respawnT += dt;
      // three seconds of corpse (or of being digested), a puff of sparkles, then back in — or, for
      // a downed team-mate somebody could still reach, ten, and a revive ends it early.
      const total = downed ? DOWNED_WINDOW : CORPSE_WINDOW;
      if (downed && this.tryRevive(a, dt)) return;
      if (!a.sparkled && a.respawnT > total - 0.4) {
        a.sparkled = true;
        const pred = inMouth ? this.idMap.get(a.swallowedBy) : undefined;
        const at = pred ? { x: pred.pos.x - Math.sin(pred.yaw) * lengthOf(pred) * 0.1, y: pred.pos.y - lengthOf(pred) * 0.05, z: pred.pos.z - Math.cos(pred.yaw) * lengthOf(pred) * 0.1 } : { ...a.pos };
        this.events.push({ kind: 'disintegrate', pos: at, actor: a.id, other: pred?.id, player: a.player, strength: lengthOf(a) });
        if (!inMouth) a.eaten = 1;     // body dissolves
      }
      if (a.respawnT > total) this.respawn(a);
    }
  }

  /**
   * Whether this body is a downed team-mate rather than a corpse: co-op only, with at least one
   * other player alive to come and get them, and still lying where they fell (not in a mouth).
   */
  revivable(a: Actor): boolean {
    if (this.mode !== 'rise' || a.controller !== 'player' || a.swallowedBy >= 0 || a.eaten >= 1) return false;
    return this.players.some((o) => o !== a && isAlive(o) && distXZ(o.pos, a.pos) < REVIVE_REACH);
  }

  /** Seconds a downed player has left to be reached, or 0 when they are not revivable. */
  /** How far through the rescue dwell a downed player is, 0..1, for the HUD. */
  reviveProgress(a: Actor): number { return a.state === 'dead' ? clamp(a.reviveT / REVIVE_HOLD, 0, 1) : 0; }

  reviveWindow(a: Actor): number {
    return a.state === 'dead' && this.revivable(a) ? Math.max(0, DOWNED_WINDOW - a.respawnT) : 0;
  }

  /**
   * A downed team-mate is brought back by a rescuer who holds station beside them for
   * `REVIVE_HOLD` seconds. The dwell is what makes it a choice: a body on the floor is also a
   * meal, and biting it feeds you instead. Swim up and wait and you get your ally back; press the
   * attack and you get their nutrition. The button you press decides which, and the pause is what
   * costs you — half a second stationary over a corpse, in the open, is the price of the rescue.
   */
  private tryRevive(a: Actor, dt: number): boolean {
    const L = lengthOf(a);
    let helper: Actor | undefined;
    for (const o of this.players) {
      if (o === a || !isAlive(o) || o.state === 'moult') continue;
      if (dist(o.pos, a.pos) > lengthOf(o) * 0.8 + L * 0.6 + 2) continue;
      // Somebody eating this body has made the other choice; the dwell does not run for them.
      if (o.state === 'eating' && o.eatingTarget === a.id) continue;
      helper = o; break;
    }
    if (!helper) { a.reviveT = 0; return false; }
    a.reviveT += dt;
    if (a.reviveT < REVIVE_HOLD) return false;
    // Back up, where you fell, with the tier you had. The cost of dying in co-op is the time your
    // ally spent coming to get you, and the pair of you standing still in the open to do it.
    a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0; a.sparkled = false; a.reviveT = 0;
    a.hp = a.hpMax * 0.45; a.stamina = a.staminaMax * 0.5; a.poise = a.poiseMax;
    a.vel = v3(); a.bank = 0; a.pitch = 0; a.hitFlash = 0; a.tumble = v3(); a.climbTo = -Infinity; a.climbPush = 0; this.clearRide(a);
    a.spawnProtect = RULES?.spawnProtect(a) ?? 2.5; a.hunted = 0; a.hunterId = -1; a.lastHitBy = -1; a.killer = -1;
    a.pos.y = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clearanceOf(a) + 0.2;
    this.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0.7 });
    this.progress[a.player]?.prompts.push({ text: `${creature(helper.creature).name} got you up.`, t: 3 });
    this.flag(helper, 'revive');
    return true;
  }

  private respawn(a: Actor) {
    const def = creature(a.creature);
    // death penalty: lose a tier, keep half progress (an era may own this instead)
    if (RULES) RULES.onRespawn(this, a);
    else if (a.tier > 0 && this.mode !== 'reef') {
      const frac = a.nutrition / TIER_NEED[a.tier];
      a.tier = (a.tier - 1) as Tier; a.scale = tierScale(a.creature, a.tier);
      a.nutrition = TIER_NEED[a.tier] * clamp(frac * 0.5 + 0.35, 0, 0.9);
    } else a.nutrition *= 0.5;
    if (this.mode === 'hunted' && this.isHunter(a.player) && !RULES) { a.scale = 3.0; a.tier = 3; }
    applyScaleStats(a, false);
    a.eaten = 0;
    a.stamina = a.staminaMax; a.poise = a.poiseMax;
    // Back to a nursery near another player (the party stays together in an endless sea), or
    // failing that the nearest one to where you died; never one a giant is loitering in.
    let ref = a.pos, refD = Infinity;
    for (const o of this.players) if (o !== a && isAlive(o)) { const d = distXZ(o.pos, a.pos); if (d < refD) { refD = d; ref = o.pos; } }
    const near = nearestNursery(ref.x, ref.z);
    let nursery = near.pos, bd = Infinity;
    for (let i = near.index - 1; i <= near.index + 1; i++) {
      const n = nurseryAt(i);
      let danger = 0;
      for (const g of this.actors) if ((g.controller === 'giant') && isAlive(g) && distXZ(g.pos, n) < 60) danger += 1;
      const score = danger * 100 + distXZ(ref, n) * 0.2;
      if (score < bd) { bd = score; nursery = n; }
    }
    a.home = { ...nursery };
    this.world.loadAround(nursery);
    a.pos = this.spawnPoint(nursery, a.creature, a.scale, a.player);
    a.vel = v3(); a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0; a.eatBites = 0;
    stopHiding(a); a.camoStrength = 0; a.hideCd = 0; a.emergenceHeavy = false; a.spawnProtect = RULES?.spawnProtect(a) ?? 3.5; a.hitFlash = 0; a.abilityActive = false; a.abilityCd = 0; a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.swallowedBy = -1; a.bank = 0; a.pitch = 0; a.climbTo = -Infinity; a.climbPush = 0; this.clearRide(a);
    a.yaw = Math.PI;
    this.beginHatch(a);
    void def;
  }

  /**
   * Hatch this body in. On the bottom rung that is the egg: five seconds of the shell taking a
   * poke from inside, splitting, and the animal wriggling out of it (the shell itself is drawn by
   * `src/render/eggs.ts`, which reads `hatching` and the state clock). Anything already grown is
   * the old second-long swell out of nothing, because it did not come from an egg.
   */
  private beginHatch(a: Actor) {
    const egg = ladderRung(this, a) === 0;
    a.hatching = true; a.state = 'moult'; a.stateT = 0; a.stateDur = egg ? HATCH_TIME : 1.0;
    a.vel = v3();
    if (egg) this.layEgg(a);
    // Nothing may eat a body that cannot yet move: the shell is protection until it is out of it.
    if (egg) a.spawnProtect = Math.max(a.spawnProtect, HATCH_TIME + 1.5);
    this.events.push({ kind: egg ? 'hatch' : 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: egg ? 1 : 0.5 });
  }

  /**
   * End any hatch in progress, as if the shell had already been left behind. Headless harnesses
   * that set up a situation and drive it use this: five seconds of egg at the top of every match
   * is the experience, not something each test wants to sit through.
   */
  skipHatch() {
    for (const a of this.players) {
      if (!a.hatching || a.state !== 'moult') continue;
      const era = RULES?.moultScale(this, a);
      a.scale = era ? era.to : tierScale(a.creature, a.tier);
      a.state = 'free'; a.stateT = 0; a.stateDur = 0; a.hatching = false;
      applyScaleStats(a, true); a.hp = a.hpMax;
    }
  }

  /**
   * Where an egg is: on the sand, tucked against the nearest rock or plant. An egg does not float
   * in open water, and the spawn point the body was handed is a point in the water, so the body
   * is moved to the foot of the closest cover before the hatch starts (a jump, but the shell has
   * not been drawn yet). With nothing to lean on it still goes down onto the floor.
   */
  private layEgg(a: Actor) {
    const L = lengthOf(a);                              // full hatched length: the moult has not started
    let best: Cover | undefined, bd = Infinity;
    for (const c of this.world.coverHash.query(a.pos.x, a.pos.z, 16, this.scratchCover)) {
      const d = distXZ(a.pos, c.pos);
      if (d < bd) { bd = d; best = c; }
    }
    let x = a.pos.x, z = a.pos.z;
    // An era that picks the patch itself (the Devonian hatches inside plant cover, `spawnInCover`)
    // has already chosen better than this can: keep where it put the body and only settle it onto
    // the sand. Everything else is handed a point in open water and has to be laid against
    // something.
    const hidden = coverAt(this.world, a.pos, L, this.scratchCover) > 0.2;
    if (best && !hidden) {
      // On the open side of it — the clearing at the heart of the nursery, where nothing grows —
      // rather than the side that happens to face the spawn point, which in a ring of sponges is
      // usually deeper into the ring.
      let dx = a.home.x - best.pos.x, dz = a.home.z - best.pos.z;
      if (Math.hypot(dx, dz) < 0.5) { dx = a.pos.x - best.pos.x; dz = a.pos.z - best.pos.z; }
      const d = Math.max(Math.hypot(dx, dz), 1e-3);
      const off = best.radius + L * 0.7;                // beside it, clear of the growth itself
      x = best.pos.x + (dx / d) * off; z = best.pos.z + (dz / d) * off;
      // Nose to the rock: the camera hangs behind the body, so the growth stands behind the egg
      // and the camera has the clearing to sit in.
      a.yaw = Math.atan2(-dx, -dz);
    }
    const g = groundHeight(this.world, x, z, this.scratchBoulders);
    // Down *into* the sand — an egg is not balanced on the seabed, it is settled into it, so the
    // shell stands a little under half buried and the body inside sits at the same height. Never so
    // far down that it drops out of the patch that was hiding it, though: a plant's cover is a ball
    // centred over its own base, and the last few inches to the floor can cost a hatchling the
    // growth it was laid in.
    const rest = g + L * 0.13;                          // the shell's radius is about 0.22 of this
    a.pos = { x, y: best && hidden ? Math.max(rest, best.pos.y - best.radius * 0.75) : rest, z };
    a.prevT = { ...a.pos, yaw: a.yaw, pitch: a.pitch, bank: a.bank };
  }

  /** True while the body is still inside its shell: it cannot swim and nothing it presses counts. */
  private inShell(a: Actor) { return a.hatching && a.state === 'moult' && a.stateDur > 2 && a.stateT < a.stateDur * HATCH_FREE; }

  private updateActor(a: Actor, input: InputFrame, dt: number) {
    // Inside the egg nothing the player presses reaches the water: the body is held where it
    // hatched until it has wriggled out of the shell.
    if (this.inShell(a)) input = { ...emptyInput(), camYaw: input.camYaw, camPitch: input.camPitch };
    const def = creature(a.creature);
    const L = lengthOf(a);
    const sf = speedFactor(a.scale);
    const giantish = a.controller === 'giant' || a.controller === 'shadow';
    const justLight = input.light && !a.prev.light, justHeavy = input.heavy && !a.prev.heavy, justAbility = input.ability && !a.prev.ability;
    const justDodge = input.dodge && !a.prev.dodge, justGuard = input.guard && !a.prev.guard, justLock = input.lock && !a.prev.lock;
    const justSense = input.sense && !a.prev.sense;
    // A grasping animal takes hold with whatever it lands while the button is down. Bots keep to
    // the moves that grab on their own, so nothing about the reef's behaviour changes with this.
    // Every animal can take hold of something: an attack held down is a grip, whatever it attacks
    // with. `grasp` no longer decides *whether* — it decides how easily, through the reach and the
    // hold the grip costs (`gripReach`, `gripHold`), because an animal with arms for it closes on
    // something sooner and from further off than one working with its mouth alone.
    //
    // The grip button — RT, or the ability — is what turns a landed attack into a hold instead of
    // a blow. The bite (Y) never gives its bite up, because that is what you hurt something with
    // while you are hanging off it; held down it still closes a grip on what is already in reach,
    // which is the deliberate hold `graspT` is timing, but it is never a way to stop biting.
    const holder = a.controller === 'player';
    a.graspHold = holder && (input.heavy || input.ability);
    const gripArmed = holder && (input.light || input.heavy || input.ability);
    a.graspT = gripArmed ? a.graspT + dt : 0;
    if (!gripArmed) a.graspSpent = false;
    const justDash = input.dash && !a.prev.dash;
    if (input.dash) a.dashHoldT += dt; else { a.dashHoldT = 0; a.dashUsed = false; }
    a.pounceCd = Math.max(0, a.pounceCd - dt);
    a.dashCd = Math.max(0, a.dashCd - dt);
    a.teleportCd = Math.max(0, a.teleportCd - dt);
    a.holdT = Math.max(0, a.holdT - dt);
    a.sinceHit += dt;
    // Out of the fight for a few seconds and health comes back: run, hide, recover, return.
    if (a.sinceHit > 6 && a.hp < a.hpMax && a.state !== 'dead') a.hp = Math.min(a.hpMax, a.hp + a.hpMax * (a.controller === 'player' || a.controller === 'bot' ? 0.035 : 0.02) * dt);
    if (a.brain) a.brain.courage = Math.min(1, a.brain.courage + 0.05 * dt);

    if (a.state !== 'ability') a.abilityActive = (a.state === 'guard' || a.state === 'parry') && DEFENSIVE_SPECIALS.has(def.ability);

    // Movement: desired direction
    //
    // A walker with its legs on the floor swims flat, unless it is putting its back into it: a
    // sprint or a dash takes the camera's aim, which is the push that gets a bottom-dweller off
    // the bottom along the line it chose rather than only ever straight up by the button.
    const shoving = input.burst > 0.1 || input.dash || a.state === 'dodge';
    const flatOnFloor = def.ground && a.grounded && !shoving;
    let dir: Vec3 = v3();
    let mag = 0;
    const locked = a.lockTarget >= 0 ? this.idMap.get(a.lockTarget) : undefined;
    if (input.worldMove) { dir = { ...input.worldMove }; mag = clamp(len3(dir), 0, 1); if (mag > 0) dir = vscale(dir, 1 / mag); }
    else {
      const sx = input.mx, sy = input.my;
      mag = clamp(Math.hypot(sx, sy), 0, 1);
      if (mag > 0) {
        let fwd: Vec3, right: Vec3;
        // right = forward × up. With heading(yaw) = (sin, 0, cos) that is (-cos, 0, sin):
        // getting this backwards makes the strafe axis mirror-image (verified against the camera).
        if (locked && isAlive(locked) && !a.aiming) {
          const to = norm(sub(locked.pos, a.pos));
          fwd = flatOnFloor ? norm({ x: to.x, y: 0, z: to.z }) : to;
          right = norm({ x: -fwd.z, y: 0, z: fwd.x });
        } else {
          const cy = input.camYaw, cp = flatOnFloor ? 0 : input.camPitch;
          fwd = { x: Math.sin(cy) * Math.cos(cp), y: -Math.sin(cp), z: Math.cos(cy) * Math.cos(cp) };
          right = { x: -Math.cos(cy), y: 0, z: Math.sin(cy) };
        }
        dir = norm({ x: fwd.x * sy + right.x * sx, y: fwd.y * sy, z: fwd.z * sy + right.z * sx });
      }
    }
    // A walker's stick is flat while its legs are on the floor — except when it is putting its
    // back into it. Aim up and sprint or dash and the aim is taken: that is the push that gets a
    // bottom-dweller off the bottom along the line it chose, rather than only ever straight up by
    // the button. Off the floor the camera's pitch steers it like any swimmer's, which is what
    // makes the water somewhere it can go rather than only somewhere it can bob. Height is bought
    // with stamina below, so an empty bar keeps the level and the descent and loses only the climb.
    if (def.ground && (flatOnFloor || (dir.y > 0 && a.stamina <= 0))) dir.y = 0;

    // Cooldowns, healing, hiding and the stamina bar: everything that ticks whether or not the
    // animal does anything this frame. It settles what the rest of the frame can afford. The
    // direction is settled first because the bar's price depends on it: an era may give a body the
    // climb for nothing, and what counts as climb is where this frame is pointed.
    const { speed, burstIn, paddling, bursting, freeBurst, relief, emptyClimb, freeClimb } = this.stepUpkeep(a, input, dt, def, L, dir, mag, justLight, justHeavy, justAbility, justDash);

    const controllable = a.holdT === 0 && (a.state === 'free' || a.state === 'guard' || (a.state === 'ability' && (def.mobileAbility || def.ability === 'shellUp' || def.ability === 'bristleFlare' || def.ability === 'ambushSurge')));
    const slowMult = abilitySpeed(a) * (a.state === 'guard' ? (def.ability === 'anchor' ? 0 : def.ability === 'enroll' ? .8 : .45) : (a.abilityActive && def.ability === 'shellUp') ? 0.35 : a.exhausted > 0 ? 0.7 : 1);
    const burstMult = controllable && (bursting || freeBurst) ? (1 + (def.burst - 1) * (freeBurst ? 1.25 : burstIn) * (a.controller === 'swarm' ? 0.55 : giantish ? 0.35 : 1)) : 1;
    const baseCruise = def.speed * sf * slowMult * (a.controller === 'swarm' ? 0.62 : giantish ? 0.55 : 1) * (paddling ? PADDLE_SPEED : 1);
    const sw = RULES && controllable ? RULES.swim(this, a, dir, mag, baseCruise, burstIn > 0.1 && !a.prev.burst) : undefined;
    const cruise = baseCruise * (sw?.speed ?? 1);
    // What this body is asking for, whatever its state lets it do about it. Everything below takes
    // the wish away again for a body that is staggered, grabbed or mid-lunge; the tug of war needs
    // the wish itself, from both ends of a grip.
    a.drive = mag > 0
      ? { x: dir.x * mag * cruise, y: dir.y * mag * cruise, z: dir.z * mag * cruise }
      : v3();
    if (!def.ground) a.drive.y += input.rise ? RISE_RATE * sf : input.sink ? -RISE_RATE * sf : 0;
    const cur = sampleCurrent(v3(), a.pos.x, a.pos.y, a.pos.z, this.time);
    // A drifter on a neutral stick gives up steering and takes the whole current; a walking body
    // down on the floor holds station against it. Everything else feels the usual fraction.
    const drifting = !!def.drift && mag < 0.08 && !input.rise && !input.sink;
    const curK = drifting ? DRIFT_CURRENT : rowWalkCurrent(a, a.grounded) ?? (def.ground ? 0.08 : 0.55);
    let desired: Vec3 = v3(cur.x * curK, cur.y * curK, cur.z * curK);
    if (drifting) desired.y += driftRise(this.time) * sf;   // up through the night, down through the day
    // A shelled jetter's funnel is what makes it fast and what makes rising and sinking free, but
    // the stick is the direction of travel for every body in the sea: swimming, sprinting and
    // dashing all go where they are aimed, and the nose goes with them. The funnel shows up in
    // the free hover and in the backward dash, not in a sprint that turns the animal round.
    const jets = RULES?.jet(a) ?? false;
    // A bell contracts and then coasts. The cycle runs whenever the animal is asking to move, and a
    // sprint pressed while the bell refills throws more water than one held down through the beat.
    let pulse = 1;
    if (def.swimStyle === 'pulse') {
      if (controllable && mag > 0) {
        if (bursting && !a.prev.burst && pulseRefilling(a.pulseT)) a.pulseT = 0;   // contract now
        a.pulseT = (a.pulseT + dt) % PULSE_CYCLE;
        pulse = pulseThrust(a.pulseT);
      } else a.pulseT = 0;
    }
    if (controllable && mag > 0) {
      // On an empty bar a sprint that is only running because the climb is free must buy the climb
      // and nothing else: the vertical takes the sprint, the horizontal swims at its own pace.
      const along = emptyClimb ? 1 : burstMult;
      desired.x += dir.x * mag * cruise * along * pulse;
      desired.y += dir.y * mag * cruise * (emptyClimb && dir.y <= 0 ? 1 : burstMult) * pulse;
      desired.z += dir.z * mag * cruise * along * pulse;
    }
    if (controllable && !def.ground) {
      const hover = jets ? 1.6 : 1;
      const base = RISE_RATE * sf * hover;
      // What the rise and sink buttons are worth here, and anything the body does for itself: an
      // era may climb faster than the shared rate, carry a sprint into the climb, or head for the
      // surface unasked (a lung that needs air). Holding sink is always the way to stay down.
      desired.y += RULES ? RULES.rise(this, a, input, base, burstMult) : input.rise ? base : input.sink ? -base : 0;
    }
    // A mouthful is not cargo: it is pulling too. What the pair does is both wishes summed and
    // shared out by weight, so a heavy animal that wants nothing still drags on whatever is
    // carrying it, one that pulls the same way helps, and one that pulls the other way cancels it
    // out. This is the whole of push-and-pull; what it wears out is decided where `grabT` lives.
    if (a.grabbing >= 0) {
      const v = this.idMap.get(a.grabbing);
      if (v && v.state === 'grabbed') {
        const share = clamp(massOf(v) / (massOf(a) + massOf(v)), 0, 0.85);
        desired.x = desired.x * (1 - share) + v.drive.x * share;
        desired.y = desired.y * (1 - share) + v.drive.y * share;
        desired.z = desired.z * (1 - share) + v.drive.z * share;
      }
    }
    let rate = def.agility;
    if (mag === 0 && controllable) rate = def.glide; // glide out
    if (a.state === 'stagger' || a.state === 'grabbed') { desired = v3(); rate = 2.5; }
    // A tail-flip is ballistic: the reflex has fired and there is nothing to steer with until it lands.
    if (a.state === 'dodge' || a.state === 'attack' || a.state === 'eating' || a.state === 'moult' || a.state === 'grabbing' || a.state === 'parry') rate = a.state === 'dodge' ? (def.tailFlip ? 0.25 : 1.4) : 3;
    if (a.state === 'pounce') rate = 0;
    if (a.airborne) rate = 0;                          // in the air nothing steers; gravity does
    if (a.holdT > 0) { desired = v3(); rate = 5; }
    if (a.state === 'ability' && (def.ability === 'burrow' || def.ability === 'anchor')) { desired = v3(); rate = 8; }
    if (a.hitStop > 0) rate = 0;
    a.vel.x = damp(a.vel.x, desired.x, rate, dt);
    a.vel.y = damp(a.vel.y, desired.y, rate, dt);
    a.vel.z = damp(a.vel.z, desired.z, rate, dt);
    // The fast-start, thrown along the body's heading — except for a shell, whose heading is its
    // funnel: it goes where it is steered, not where it happens to be pointing.
    if (sw && sw.impulse > 0) {
      const h0 = jets && mag > 0 ? dir : heading(a.yaw);
      a.vel.x += h0.x * sw.impulse; a.vel.z += h0.z * sw.impulse;
    }
    if (a.airborne) { a.vel.y -= BREACH_GRAVITY * dt; a.vel.x *= 1 - 0.15 * dt; a.vel.z *= 1 - 0.15 * dt; }

    // Lunge during attacks
    if (a.state === 'attack' && a.move) {
      const m = a.move; const wa = m.windup + m.active;
      if (a.stateT < wa && a.hitStop === 0) {
        const lungeSpeed = (m.lunge * L) / wa;
        const h = heading(a.yaw);
        const pitchDir = def.ground ? 0 : -Math.sin(a.pitch);
        a.pos.x += h.x * lungeSpeed * dt; a.pos.z += h.z * lungeSpeed * dt; a.pos.y += pitchDir * lungeSpeed * dt * 0.6;
      }
    }
    if (a.state === 'guard' && def.ability === 'enroll' && def.ground) {
      // roll downhill and with the current
      const gx = sampleHeight(a.pos.x + 0.5, a.pos.z) - sampleHeight(a.pos.x - 0.5, a.pos.z);
      const gz = sampleHeight(a.pos.x, a.pos.z + 0.5) - sampleHeight(a.pos.x, a.pos.z - 0.5);
      a.vel.x += (-gx * 6 + cur.x * 2 + dir.x * 3 * mag) * dt; a.vel.z += (-gz * 6 + cur.z * 2 + dir.z * 3 * mag) * dt;
      a.roll += len3(a.vel) * dt / (L * 0.25);
      if (len3(a.vel)>3) for(const o of this.nearby(a.pos,L*.9)) {
        if(o.id===a.id || !isAlive(o) || a.hitDone.has(o.id) || this.expansionContext().allies(a,o)) continue;
        a.hitDone.add(o.id); applyHit(this.hitCtx,a,o,{...def.light,damage:10,poise:40,knockback:4},.5);
      }
    } else a.roll = damp(a.roll, 0, 6, dt);

    // Idle camouflage sinks gently; any explicit translation cancels that extra descent.
    const explicitMotion = Math.abs(input.mx) + Math.abs(input.my) > .08 || !!input.rise || !!input.sink || !!(input.worldMove && len3(input.worldMove) > .08);
    if (a.hideMode === 'camouflage' && !explicitMotion && !def.ground) a.vel.y = damp(a.vel.y, -.32, 2, dt);
    if (a.hideMode === 'descending') { a.vel.x *= Math.exp(-6*dt); a.vel.z *= Math.exp(-6*dt); a.vel.y = -Math.max(.8, L*.5); a.hopVel = Math.min(a.hopVel, -1); }
    if (a.hideMode === 'burrowed') { a.vel = v3(); a.pos.y = sampleHeight(a.pos.x,a.pos.z) + clearanceOf(a); a.hopVel = 0; }
    // Integrate
    if (a.hitStop === 0) {
      a.pos.x += a.vel.x * dt; a.pos.y += a.vel.y * dt; a.pos.z += a.vel.z * dt;
    }

    // Hop and paddle (crawlers). RB kicks off the floor, and holding it keeps the crawler
    // climbing at a paddle's pace for as long as its stamina lasts; letting go sinks it back
    // down at a gentle terminal speed rather than dropping it like a stone.
    if (def.ground) {
      const canPaddle = a.hideMode === 'none' && controllable;
      // A climb rides the same channel as the paddle, so going up a rock is one steady rise rather
      // than a fight between the lift and the settle.
      const climbing = a.climbTo > a.pos.y;
      const paddleUp = canPaddle && input.rise && a.stamina > 0;
      const holdingRise = paddleUp || climbing;
      // A walker swims while it is working at it, and comes home when it stops. Off the floor and
      // still asking to go somewhere, the settle is switched off and the body holds its own depth:
      // the stick, through the camera's pitch, is what takes it up or down from there, exactly as
      // it does for anything else in the sea. Ask for nothing and the sink comes back and puts it
      // on the bottom, which is the whole character of the animal — at home down there, a visitor
      // up here. Height is the part that is paid for, at the same price per second however it was
      // asked for, so aiming up is not a way round the button's price — RB is still the dedicated
      // paddle and climbs faster for it, the camera is a steer that happens to point upward.
      const swimming = canPaddle && !a.grounded && mag > 0.08 && !input.sink;
      const lifting = swimming && dir.y > 0.1 && a.stamina > 0;
      // Lifting off is a swim, not a jump. Holding RB eases the body up off the floor and it keeps
      // accelerating to a paddle's pace — the same gradual rise a swimmer gets from the same button
      // — rather than kicking it into a ballistic arc it has no control over.
      // A walker aiming up and putting its back into it leaves the floor along the line it is
      // aimed, rather than only ever going up by the button. It is thrown, not lifted: `vel.y`
      // carries it and nothing holds it there, so it arcs and settles again unless it keeps
      // swimming — which is the whole shape of a bottom-dweller's excursion into open water.
      const launching = canPaddle && a.grounded && dir.y > 0.1 && mag > 0.2
        && (a.state === 'dodge' || (input.burst > 0.1 && a.stamina > 0));
      if ((holdingRise || launching) && a.grounded) { a.grounded = false; a.hopVel = Math.max(a.hopVel, 0); }
      if (holdingRise && !a.grounded) {
        a.hopVel = damp(a.hopVel, Math.max(climbing ? climbRise(a) : 0, PADDLE_RISE * Math.sqrt(sf)), 3, dt);
      } else if (!a.grounded) {
        const sink = swimming ? 0 : -PADDLE_SINK * Math.sqrt(sf) * (input.sink ? 2.4 : 1);
        a.hopVel = Math.max(damp(a.hopVel, sink, PADDLE_SINK_EASE, dt), sink);
      }
      if (paddleUp || lifting) a.stamina = Math.max(0, a.stamina - PADDLE_STAMINA * dt);
      if (!a.grounded) { a.pos.y += a.hopVel * dt; }
    }

    // The seabed and everything standing on it: rocks, plants, what is climbed, what is ridden.
    this.stepScenery(a, input, dt, { def, sf, speed, paddling, mag, controllable });

    // Orientation. Most bodies face where they are going. A shell is the exception, because it
    // jets its funnel either side of itself and so has no wrong end to lead with: it keeps
    // whichever end it is already pointing and turns through the shorter of the two arcs, so
    // travel more behind it than ahead leaves it going shell-first with its head trailing — the
    // escape jet — and it never spins round to chase its own heading. Aiming and striking are the
    // exception to the exception: those face what they are aimed at. Heading only; the stick is
    // the direction of travel for every body, in every gear.
    //
    // A dash with no direction fires along the body's own axis — out behind a jetting shell (see
    // the dash above) — and `backingOff` holds the heading through it for every body, so nothing
    // spins through 180° at the worst possible moment.
    const hv = Math.hypot(a.vel.x, a.vel.z);
    const h = heading(a.yaw);
    const backward = jets && hv > 0.35 && a.state !== 'attack' && !a.aiming
      && h.x * a.vel.x + h.z * a.vel.z < 0;
    const facing = backward ? v3(-a.vel.x, -a.vel.y, -a.vel.z) : a.vel;
    const backingOff = a.state === 'dodge' && dot(a.dodgeDir, h) < -0.3;
    let targetYaw = a.yaw;
    if (backingOff) { /* hold the heading through a backward dash */ }
    else if (a.aiming && a.controller === 'player' && (a.state === 'free' || a.state === 'guard')) targetYaw = hv > 0.35 ? yawOf(facing) : input.camYaw;
    else if (locked && isAlive(locked) && (a.state === 'free' || a.state === 'guard' || a.state === 'attack')) targetYaw = yawOf(sub(locked.pos, a.pos));
    else if (a.rideHost >= 0) targetYaw = this.idMap.get(a.rideHost)?.yaw ?? a.yaw;   // clinging: lie along the host
    // A body with no front never turns to travel: a brittle star rows with whichever arm is
    // leading and a ctenophore's combs beat any way at all, so the stick moves them without
    // pointing them. Aiming still does, which is the branch above.
    else if (hv > 0.35 && a.state !== 'grabbed' && def.swimStyle !== 'omnidirectional') targetYaw = yawOf(facing);
    const dy = wrapAngle(targetYaw - a.yaw);
    const tr = def.turnRate * (a.state === 'attack' ? 0.5 : 1) * (1 + hv * 0.05) * (giantish ? 0.45 : 1) * (sw?.turn ?? 1);
    const turn = clamp(dy * 6, -tr, tr);
    const prevYaw = a.yaw;
    a.yaw = wrapAngle(a.yaw + turn * dt);
    const turnRate = wrapAngle(a.yaw - prevYaw) / Math.max(dt, 1e-4);
    if (a.state === 'ability' && def.ability === 'spineIntercept') a.yaw = yawOf(a.dodgeDir);
    a.bank = damp(a.bank, def.ground ? 0 : clamp(-turnRate * 0.16, -0.7, 0.7), 4, dt);
    if (def.ground) {
      const ahead = groundHeight(this.world, a.pos.x + Math.sin(a.yaw) * L * 0.4, a.pos.z + Math.cos(a.yaw) * L * 0.4, this.scratchBoulders);
      const behind = groundHeight(this.world, a.pos.x - Math.sin(a.yaw) * L * 0.4, a.pos.z - Math.cos(a.yaw) * L * 0.4, this.scratchBoulders);
      a.pitch = damp(a.pitch, -Math.atan2(ahead - behind, L * 0.8), 8, dt);
    } else {
      // Pitch follows the travel too, except through a backward dash, where the body holds the
      // attitude it had rather than tipping to point down its own wake. A rigid shield with no
      // paired fins behind it changes its pitch slowly, so climbing and diving are a commitment.
      const sp = Math.max(len3(a.vel), 0.5);
      const want = clamp(-Math.asin(clamp(facing.y / sp, -1, 1)) * 0.8, -0.9, 0.9);
      if (!backingOff) {
        if (def.pitchRate === undefined) a.pitch = damp(a.pitch, want, 4, dt);
        else a.pitch += clamp(want - a.pitch, -def.pitchRate * dt, def.pitchRate * dt);
      }
    }

    // Noise / stillness
    a.noise = a.hideMode !== 'none' ? .1 : a.state === 'attack' ? 1.5 : (bursting && !freeBurst) ? 2.5 : speed > 0.4 ? 1 : 0.5;
    a.stillness = speed < 0.3 ? Math.min(3, a.stillness + dt) : 0;

    // Everything the animal *decides* — aim, sense, the heavy button, the dash, the guard, the
    // attacks, and the state machine that runs each of them to its end.
    this.stepActions(a, input, dt, { def, L, sf, justLight, justHeavy, justAbility, justDodge, justGuard, justLock, justSense, justDash, paddling, bursting, dir, mag, locked, jets, relief, freeClimb });
  }

  /**
   * Everything that ticks: cooldowns, the out-of-the-fight heal, hiding and camouflage, and the
   * stamina bar. Runs before anything else in the frame because it settles what the rest of it can
   * afford — whether this body is sprinting, paddling, or out of breath altogether.
   */
  private stepUpkeep(a: Actor, input: InputFrame, dt: number, def: ReturnType<typeof creature>, L: number, dir: Vec3, mag: number, justLight: boolean, justHeavy: boolean, justAbility: boolean, justDash: boolean) {
    // Timers
    a.stateT += dt;
    a.iframes = Math.max(0, a.iframes - dt);
    a.spawnProtect = Math.max(0, a.spawnProtect - dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.hitStop = Math.max(0, a.hitStop - dt);
    a.abilityCd = Math.max(0, a.abilityCd - dt);
    a.senseT = Math.max(0, a.senseT - dt);
    if (def.ability === 'whipSearch' && a.senseT > 0) stepExpansionAbility(this.expansionContext(), a, def, dt);
    a.burstT = Math.max(0, a.burstT - dt);
    a.comboT = Math.max(0, a.comboT - dt);
    a.dodgeTapT = Math.max(0, a.dodgeTapT - dt);
    a.exhausted = Math.max(0, a.exhausted - dt);
    if (a.comboT === 0) a.combo = 0;
    a.seen = Math.max(0, a.seen - dt);
    if (a.poise < a.poiseMax && a.state !== 'stagger') a.poise = Math.min(a.poiseMax, a.poise + a.poiseMax * dt / 3);
    a.cover = this.coverFor(a);

    // Hiding is independent of defensive/combat states and available at every growth tier.
    a.hideCd = Math.max(0, a.hideCd - dt);
    if (a.hideMode !== 'none' && (!isAlive(a) || ['grabbed', 'grabbing', 'stagger', 'swallowed', 'moult'].includes(a.state))) stopHiding(a);
    if (justAbility && (a.state === 'free' || a.state === 'guard')) {
      if (a.hideMode !== 'none') {
        const buried = a.hideMode === 'burrowed'; stopHiding(a);
        if (buried) { a.emergenceHeavy = true; this.emergeStrike(a, def); }
      } else if (RULES && RULES.useAbility(this, a, this.expansionContext())) {
        this.flag(a, 'ability');                       // the era's own Y special took the press
      } else if (a.hideCd === 0 && (BURROWERS.has(a.creature) || a.stamina >= 8)) {
        a.state = 'free'; a.abilityActive = false; a.hideT = 0; a.seen = 0;
        if (BURROWERS.has(a.creature)) a.hideMode = 'descending';
        else {
          a.hideMode = 'camouflage'; a.stamina -= 3;
          const match = camouflageMatch(a, this.world, this.nearby(a.pos, 80));
          a.camoColors = match.colors; a.camoScheme = match.scheme; a.camoLabel = match.label; a.camoSource = match.actor;
        }
        clearPursuit(a, this.actors); this.flag(a, 'ability');
      }
    }
    if (a.hideMode !== 'none' && (justLight || justHeavy || input.guard || input.burst > .1 || justDash)) {
      const buried = a.hideMode === 'burrowed'; stopHiding(a);
      a.emergenceHeavy = false;
      if (buried && (justLight || justHeavy)) this.emergeStrike(a, def);
    }
    if (a.hideMode !== 'none') a.hideT += dt;
    if (a.hideMode === 'descending' && a.hideT > 10 && a.grounded && a.pos.y > sampleHeight(a.pos.x,a.pos.z) + clearanceOf(a) + .3) stopHiding(a);
    if (a.hideMode === 'descending' && a.pos.y <= sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .15) {
      a.hideMode = 'burrowed'; a.hideT = 0; a.seen = 0; a.vel = v3();
      clearPursuit(a, this.actors);
      this.silt.push({pos:{...a.pos}, radius:L*.7, t:1.5});
    }
    a.camoStrength = damp(a.camoStrength, a.hideMode === 'camouflage' ? 1 : 0, 3, dt);
    if (a.hideMode === 'camouflage') {
      a.stamina = Math.max(0, a.stamina - CAMOUFLAGE_DRAIN * (RULES?.camoDrain(a) ?? 1) * dt);
      if (a.stamina === 0) stopHiding(a);
    }
    if (a.state === 'guard' || a.state === 'parry') a.guardHeld += dt;
    else a.guardHeld = 0;
    // Stamina
    const speed = len3(a.vel);
    const burstIn = input.burst;
    // A crawler off the seabed is doggy-paddling: it keeps swimming slowly, but it cannot
    // sprint or dash until its legs are back on the floor.
    // A rower is not doggy-paddling when it leaves the floor: the paddles are what it swims with,
    // so it keeps its sprint and its dash out in the water and only the walkers lose them.
    const paddling = def.ground && !a.grounded && !def.rowWalk;
    // How much of this effort is climb, and so given away: an era may hand a body the vertical for
    // nothing. At full relief an empty bar is no longer a reason not to drive — see `emptyClimb`,
    // which keeps that sprint out of the horizontal, where it was never paid for.
    const relief = RULES ? RULES.climbRelief(a, input, dir, mag) : 0;
    const freeClimb = relief > 0.5;
    const bursting = burstIn > 0.1 && (a.stamina > 0 || freeClimb) && a.state !== 'guard' && (a.exhausted === 0 || freeClimb);
    const emptyClimb = bursting && a.stamina <= 0;
    if (def.ability === 'ambushSurge' && input.burst > .1 && !a.prev.burst && a.abilityCd <= 0) { a.burstT = 2.2; a.abilityCd = 10; }
    const freeBurst = a.burstT > 0;
    if (bursting && !freeBurst) a.stamina = Math.max(0, a.stamina - BURST_STAMINA * burstIn * dt * (1 - relief));
    else if (a.state === 'guard') a.stamina -= 3 * dt;
    else if (a.hideMode !== 'camouflage') a.stamina = Math.min(a.staminaMax, a.stamina + (speed < 0.4 ? 24 : 14) * dt * (a.state === 'free' ? 1 : 0.5) * (RULES?.staminaRegen(this, a) ?? 1));
    if (a.stamina <= 0) { a.stamina = 0; if (a.exhausted === 0 && !freeClimb) a.exhausted = 1.6; }
    return { speed, burstIn, paddling, bursting, freeBurst, relief, emptyClimb, freeClimb };
  }

  /**
   * Follow the floor up instead of being snapped to the top of it.
   *
   * A rock the body is allowed to be carried over (`glideOver`) does not block, and the floor under
   * the body simply takes it up. That is right for the pace of it and wrong for the shape: a dome
   * is `sqrt(1 - q^2)` tall, so its flank is near-vertical at the rim. A body crossing that rim
   * gained a couple of its own lengths of height in one step while it moved a tenth of a unit
   * forward — an anomalocaris pressing toward a boulder went up its side at twenty times its own
   * swimming speed and arrived on top, which reads as jetting rather than as swimming over.
   *
   * So the climb is paid for out of the travel. The body may rise what it could swim up in this
   * step for nothing (`climbRise`); beyond that it gives back the horizontal it was going to cover,
   * one for one along the hypotenuse, so what it actually travels is the distance it was always
   * going to travel and only the direction of it tilts up the face. A gentle dome barely slows
   * anything; a steep one turns most of the step into height and the body climbs it on the diagonal
   * at its own pace. Nothing here moves a body further or faster than it was already moving.
   *
   * The trade is solved by bisection along this step's own path, and only when there is a rise to
   * pay for — the common cases (open water, resting on the sand, going downhill) return at once.
   * `face` is the floor where the body ended up and `clear` how far above it the body rides, both
   * measured by the caller, which needs them anyway. Returns the face if the body is pressed
   * against one rather than walking up it, and -Infinity otherwise.
   */
  private followFloor(a: Actor, dt: number, face: number, clear: number): number {
    const free = climbRise(a) * dt;
    if (face - a.pos.y <= free) return -Infinity;
    const dx = a.pos.x - a.prevT.x, dz = a.pos.z - a.prevT.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return -Infinity;   // standing still: there is no travel to trade for the height
    const at = (x: number, z: number) => groundHeight(this.world, x, z, this.scratchBoulders) + clear;
    // How much rise a fraction `t` of the step may buy: the free swim up, plus the horizontal
    // given back, taken as the other side of a right angle so the total stays this step's own.
    const budget = (t: number) => free + Math.sqrt(Math.max(0, d * d - (t * d) ** 2));
    let lo = 0, hi = 1;
    for (let i = 0; i < 6; i++) {
      const t = (lo + hi) / 2;
      if (at(a.prevT.x + dx * t, a.prevT.z + dz * t) - a.pos.y <= budget(t)) lo = t; else hi = t;
    }
    a.pos.x = a.prevT.x + dx * lo;
    a.pos.z = a.prevT.z + dz * lo;
    // The travel that was not spent going forward is spent going up the face instead, as far as
    // the face itself. On a gentle slope almost all of it is still forward; on a sheer one almost
    // none is, and the body comes up the side at the speed it was swimming at. Either way the
    // floor it now stands on is under it, so the clamp below has nothing left to snap.
    a.pos.y = Math.min(face, a.pos.y + budget(lo));
    // Almost none of it left over means the body is pressed against a face rather than walking up
    // a slope, which is a contact like any other: report it, and the climb the caller already
    // knows how to do takes the body up the side of it.
    return lo < STALL ? face : -Infinity;
  }

  /**
   * The body against the world: the seabed, boulders, plants, what is worth climbing, and the ride
   * that outranks all of it. Runs after the body has moved and before it is turned, because what
   * it is standing on decides where it can point.
   */
  private stepScenery(a: Actor, input: InputFrame, dt: number, s: Pick<Step, 'def' | 'sf' | 'paddling' | 'mag'> & { speed: number; controllable: boolean }) {
    const { def, sf, speed, paddling, mag, controllable } = s;
    // Static collision. A rock you could get over is not a wall: gentle ones are glided across, and
    // a face too steep for that is climbed — held out of the rock and lifted up its side until the
    // top is clear, at the pace the body would swim up. Only what stands more than two bodies above
    // you stops you.
    const contact = this.contact, floraHit = this.floraContact;
    const hitWall = resolveStatic(this.world, a.pos, bodyRadius(a), this.scratchBoulders, RULES?.shoreReach(a) ?? 0, glideOver(a), climbHeight(a), contact);
    if (hitWall && !def.ground) { a.vel.x *= 0.6; a.vel.z *= 0.6; }
    // Plants: swarm snacks are numerous and tiny, so they take turns on alternate steps.
    floraHit.blocked = false; floraHit.headOn = false; floraHit.top = -Infinity;
    if (!isHidden(a) && a.state !== 'grabbed') {
      resolveFlora(this.world, a, dt, this.scratchFlora, floraHit);
    }
    // What is worth climbing, and what has to be asked for. A rock inside two bodies is taken on
    // sight. Everything else waits for the body to lean on it: a crawler has legs and gets over
    // whatever it keeps pushing into, however tall, and a plant is a thin thing to go round unless
    // the body is aimed straight at the middle of it.
    // A rock is a slope, not a step: come up its flank at the speed the body is actually going.
    // A face too steep to make any headway on is a contact as much as a wall is, and is climbed.
    const clear = floorClearance(a), px = a.pos.x, pz = a.pos.z;
    let floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clear;
    const stalled = this.followFloor(a, dt, floor, clear);
    if (a.pos.x !== px || a.pos.z !== pz) floor = groundHeight(this.world, a.pos.x, a.pos.z, this.scratchBoulders) + clear;
    const leaning = controllable && mag > 0.35 && (contact.hit || floraHit.blocked || Number.isFinite(stalled));
    a.climbPush = leaning ? Math.min(1, a.climbPush + dt) : Math.max(0, a.climbPush - dt * 2);
    let offer = Math.max(contact.climbTo, stalled);
    if (a.climbPush > CLIMB_PUSH) {
      if (def.ground) offer = Math.max(offer, contact.wallTop);
      if (floraHit.headOn) offer = Math.max(offer, floraHit.top);
    }
    if (offer > a.pos.y) a.climbTo = Math.max(a.climbTo, offer);
    if (a.climbTo <= a.pos.y || a.climbPush === 0 || !controllable || a.hitStop > 0 || a.state === 'grabbed' || isHidden(a)) a.climbTo = -Infinity;
    else if (!def.ground) a.vel.y = Math.max(a.vel.y, climbRise(a));
    if (def.ground) {
      if (a.grounded || a.pos.y <= floor) { a.pos.y = a.grounded ? damp(a.pos.y, floor, 18, dt) : floor; if (!a.grounded && a.hopVel < 0) { a.grounded = true; a.hopVel = 0; } }
      if (a.pos.y < floor) a.pos.y = floor;
      // a paddling crawler still cannot climb out of the sea
      const ceiling = SURFACE_Y - 0.8 - clearanceOf(a);
      if (a.pos.y > ceiling) { a.pos.y = ceiling; if (a.vel.y > 0) a.vel.y = 0; if (a.hopVel > 0) a.hopVel = 0; }
    } else {
      // Riding the floor: a swimmer skims the sand and is carried up and over rocks rather than
      // stopped by them, so the climb reads as a swim rather than a step.
      if (a.pos.y < floor) { a.pos.y = floor; if (a.vel.y < 0) a.vel.y *= -0.2; }
      const ceiling = SURFACE_Y - 0.8 - clearanceOf(a);
      if (a.airborne) {
        // back through the surface: the splash, and the water takes most of the fall out of it
        if (a.pos.y <= ceiling && a.vel.y < 0) {
          a.airborne = false;
          this.events.push({ kind: 'splash', pos: { x: a.pos.x, y: SURFACE_Y, z: a.pos.z }, actor: a.id, player: a.player, strength: clamp(-a.vel.y / 9, 0.3, 1.6) });
          a.vel.y *= 0.45;
        }
      } else if (a.pos.y > ceiling) {
        // Driving hard at the surface, a fish leaves the water; anything else meets the ceiling.
        //
        // What counts as "hard" is relative to the body. BREACH_MIN_RISE was an absolute speed, so
        // a hatchling — which cannot reach it by any means available to it — met a hard, invisible
        // wall a body's length under the surface however it came at it. It scales with size now, as
        // the speeds it is being compared against already do. A dash is allowed through for the
        // same reason: it is the hardest a body can drive at anything, and excluding every state
        // but `free` shut out the one move most likely to launch a fish clear of the water.
        const sp = len3(a.vel);
        const launching = a.state === 'free' || a.state === 'dodge';
        if (RULES?.canBreach(a) && isAlive(a) && a.vel.y > BREACH_MIN_RISE * sf && sp > def.speed * sf * 0.85 && launching) {
          a.airborne = true;
          this.events.push({ kind: 'breach', pos: { x: a.pos.x, y: SURFACE_Y, z: a.pos.z }, actor: a.id, player: a.player, strength: clamp(sp / 12, 0.4, 1.5) });
        } else { a.pos.y = ceiling; if (a.vel.y > 0) a.vel.y = 0; }
      }
    }

    // Riding: the grip wins over swimming. Pinned after the collision so the host carries the rider
    // through the scenery with it rather than the rider being resolved out of the host.
    if (a.rideHost >= 0) this.updateRide(a, def, input, dt);
  }

  /**
   * What the animal does: the aim, the sense pulse, the heavy button, the dash, the guard and the
   * attacks, and the state machine that carries each of them through to its end.
   *
   * Split out of `updateActor`, which had grown to five hundred lines covering timers, stamina,
   * swimming, collision, climbing, orientation and this. Every gameplay change lands in here, and
   * finding it meant scrolling past four other subjects that share nothing with it but a body.
   * `Step` is what the earlier passes worked out about this frame; nothing here writes back to it.
   */
  private stepActions(a: Actor, input: InputFrame, dt: number, s: Step) {
    const { def, L, sf, justLight, justHeavy, justAbility, justDodge, justGuard, justLock, justSense, justDash, paddling, bursting, dir, mag, locked, jets, relief, freeClimb } = s;
    // The grip is only ever asked about below, inside the block a free body reaches. Say so first,
    // so a recording of a frame that never got there reads as the reason it did not rather than as
    // whatever the last frame that did happened to say.
    if (a.controller === 'player') {
      this.graspReasons.set(a.id, a.rideHost >= 0 ? 'riding' : a.grabbing >= 0 ? 'holding something'
        : a.state === 'free' || a.state === 'guard' ? 'not asked yet this frame' : `busy: state=${a.state}`);
    }
    // --- Actions ---
    if ((a.state === 'free' || a.state === 'guard') && a.hideMode !== 'burrowed' && a.hideMode !== 'descending') {
      // Aim (LT held): the camera owns the crosshair; whatever it reports is the target. Bots toggle lock.
      if (a.controller === 'player') {
        a.aiming = input.aim;
        a.lockTarget = input.aim ? input.aimTarget : -1;
        if (input.aim) this.flag(a, 'lock');
      } else if (justLock) {
        if (a.lockTarget >= 0) a.lockTarget = -1;
        else a.lockTarget = this.pickLockTarget(a)?.id ?? -1;
      }
      if (a.lockTarget >= 0 && Math.abs(input.lookX) > 0.75 && a.comboT === 0) {
        const nt = this.pickLockTarget(a, input.lookX > 0 ? 1 : -1, a.lockTarget);
        if (nt) { a.lockTarget = nt.id; a.comboT = 0.4; }
      }
      // Sense: a display mode, held on or off. On, the whole panel is drawn — the gauges, the band
      // glyphs, the radar; off, nothing is drawn over that player's sea at all but a faint line
      // naming this button (`PlayerPanel` in src/app/Hud.tsx). It costs nothing and never runs out:
      // turning it off is for the look of the thing, not a trade.
      if (justSense) {
        a.senseMode = !a.senseMode;
        // The ping is the toggle's own sound, both ways: it is how you know the button took.
        this.flag(a, 'sense');
        this.events.push({ kind: 'sense', pos: { ...a.pos }, actor: a.id, player: a.player });
      }
      // Taking hold. A grasp is arms closing on something, not a blow that happens to stick, so it
      // is tried before the attack buttons and takes them when it lands: hold the button, swim up
      // to an animal, and you have hold of it without having hurt it. It used to be a rider on
      // damage — the grip closed only where an attack had already landed — which made riding
      // something big impossible to do without first biting it, and made a held button read as an
      // attack that sometimes stuck. Nothing in reach and the button does what it always did.
      // A grip that closed takes the button; one still closing does not, because the pounce is the
      // other way of arriving at the same hold — it lunges, and what it lands on it takes hold of.
      const grasped = this.tryGrasp(a, def, L, input.heavy || input.ability) === 'took';
      // Heavy (RT): the emergence strike, the creature's special, or the pounce — all of it in one
      // place, so a charge out of a sprint (below) or out of a dash reaches exactly the same move.
      // Sprinting makes it a charge: it aims along the line of travel and costs extra stamina.
      if (grasped) { /* the grip took the button */ }
      else if (justHeavy && this.heavyAction(a, def, L, sf, locked, bursting)) { /* the button was taken */ }
      // Holding the grip button at something too big to bite keeps swimming at it until it has
      // hold of it. A lunge is one press and lasts about a second, which on a body that size is
      // often not enough to arrive — and the button being held meant no second press ever came, so
      // the animal stopped short of the one thing it was reaching for and simply hung there.
      else if (this.keepReaching(a, def, L, sf)) { /* still going for it */ }
      // Dash (LB): fast and long enough to clear a predator's bite. A stick direction fires it that
      // way. A neutral stick fires it along the body's own axis — ahead of a finned body, and out
      // behind a jetting shell, which is the way a nautiloid escapes and the way it is already
      // pointing while it does, so it leaves without turning first.
      // A dash that is mostly climb is on the same terms as a sprint that is: it costs what is
      // left of it after the relief, and an empty bar does not refuse it — the body just goes up
      // rather than along (see `startDash`). There is always a way back to the surface.
      else if (justDash && (a.stamina >= 10 || freeClimb) && (a.exhausted === 0 || freeClimb) && a.dashCd === 0 && !a.dashUsed) {
        a.dashUsed = true;
        this.startDash(a, def, mag > 0.3 ? dir : vscale(heading(a.yaw), jets ? -1 : 1), L, sf, relief);
      }
      // Dodge (B for creatures that cannot guard, bots)
      else if (justDodge && a.controller !== 'player' && a.stamina >= 10 && a.exhausted === 0) this.startDodge(a, def, dir, mag, L, sf);
      // Guard / parry
      else if (justGuard && def.canGuard && a.stamina > 5) { a.state = 'parry'; a.stateT = 0; a.hitDone.clear(); a.stateDur = def.ability === 'anchor' || def.ability === 'bristleFlare' ? .28 : .15; a.abilityActive = DEFENSIVE_SPECIALS.has(def.ability); this.blockPulse(a, def); if (['ribbonSlip','combCruise'].includes(def.ability) && a.abilityCd <= 0 && a.stamina >= 10) { a.stamina -= 8; a.abilityCd = 4; this.evadeSpecial(a, def, L); } this.flag(a, 'guard'); }
      else if (justGuard && !def.canGuard && a.stamina >= 10 && a.exhausted === 0) this.startDodge(a, def, dir, mag, L, sf);
      else if (input.guard && def.canGuard && a.state === 'free' && a.stamina > 0 && a.stateT > 0.05) { a.state = 'guard'; a.stateT = 0; }
      else if (!input.guard && a.state === 'guard') { if (def.ability === 'shellUp' && a.guardHeld > .6) this.blockPulse(a, def); a.state = 'free'; a.stateT = 0; a.abilityActive = false; }
      // Attacks (also start eating on corpses)
      // Bots keep the old split: RT is their special and nothing else, so their behaviour (and every
      // seeded replay that depends on it) is unchanged by the player-side fallback above.
      else if (justLight || (justHeavy && a.controller !== 'player' && !HEAVY_SPECIALS.has(def.ability))) {
        const corpse = justLight ? this.corpseInReach(a) : undefined;
        if (corpse) this.startEating(a, corpse);
        else {
          const m = justHeavy ? def.heavy : (a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light);
          if (a.stamina >= staminaCost(a, m.stamina) * 0.5 && a.exhausted === 0) {
            if (a.controller === 'player') this.aimNudge(a, L * 1.8 + 2);
            a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = justHeavy ? 'heavy' : 'light'; a.hitDone.clear();
            a.stamina -= staminaCost(a, m.stamina);
            if (!justHeavy) { a.combo = (a.combo + 1) % 3; a.comboT = 0.9; } else a.combo = 0;
            this.flag(a, justHeavy ? 'heavy' : 'light');
          }
        }
      }
    } else if (a.state === 'parry') {
      if (a.stateT >= a.stateDur) { a.state = input.guard && def.canGuard ? 'guard' : 'free'; a.stateT = 0; }
    } else if (a.state === 'attack' && a.move) {
      const m = a.move;
      const total = m.windup + m.active + m.recovery;
      if (a.stateT >= m.windup && a.stateT < m.windup + m.active) this.attackHits(a, m, L);
      // cancel recovery into dodge, or chain lights
      if (a.stateT > m.windup + m.active + m.recovery * 0.45 && (justDodge || (justDash && mag > 0.3)) && a.stamina >= 10) { a.dashUsed = true; this.startDodge(a, def, dir, mag, L, sf); }
      else if (a.stateT >= total) { a.state = 'free'; a.stateT = 0; a.move = undefined; }
      else if (a.moveKind === 'light' && justLight && a.stateT > m.windup + m.active + m.recovery * 0.35 && a.stamina >= 6) {
        const nm = a.combo === 2 ? { ...def.light, damage: def.light.damage * 1.6, poise: def.light.poise * 1.8, knockback: def.light.knockback * 2, recovery: def.light.recovery + 0.12 } : def.light;
        a.stateT = 0; a.move = nm; a.hitDone.clear(); a.stamina -= staminaCost(a, nm.stamina); a.combo = (a.combo + 1) % 3; a.comboT = 0.9;
      }
    } else if (a.state === 'pounce') {
      const t = a.lockTarget >= 0 ? this.idMap.get(a.lockTarget) : undefined;
      // Reaching for a hold on something too big to bite is a pursuit, not a single spring. A
      // lunge lasts about a second, and a body twenty units long can be further off than that
      // covers — and it is patrolling, so the tail a rider is aiming for is being carried away and
      // turned as they close on it. While the button is down the lunge keeps its legs: it re-aims
      // at wherever the animal is now, every frame, until it arrives. Paid for once when it
      // started, because it is one act however long the swim to it takes.
      if (t && isAlive(t) && a.graspHold && !a.graspSpent && a.grabbing < 0 && a.rideHost < 0
        && (bandOf(a, t) === 'threat' || bandOf(a, t) === 'giant')) a.stateDur = a.stateT + 0.2;
      if (t && isAlive(t) && a.stateT < a.stateDur) {
        // home in hard on the target; impact when the mouth reaches it
        const to = sub(t.pos, a.pos); const d = len3(to);
        const speed = Math.max(def.speed * sf * 3.2, 9 * Math.sqrt(sf));
        const dirTo = norm(to);
        a.vel = vscale(dirTo, speed);
        a.yaw = yawOf(dirTo); a.pitch = def.ground ? a.pitch : clamp(-Math.asin(clamp(dirTo.y, -1, 1)) * 0.8, -0.9, 0.9);
        if (bodyGap(t, a) < L * 0.45) {
          const band = bandOf(a, t);
          const bigger = band === 'threat' || band === 'giant';
          // A pounce made with the grip armed arrives as a grip. Nothing is settled on impact:
          // what it lands is carried, and what happens to it is decided by when the button comes
          // up. A mouthful is held ready and eaten on release; something too big to be a mouthful
          // is held on to, and letting go quickly is the bite that never landed while a longer
          // hold is a ride the animal is never troubled by. The lunge is unchanged — this is only
          // what it does when it gets there.
          const gripped = a.graspHold && this.closeGrip(a, t);
          if (gripped) { /* the pounce closed a grip; the release settles it */ }
          else if (band === 'snack' && (t.controller === 'swarm' || (t.controller === 'ambient' && lengthOf(t) < L * 0.3))) this.consume(a, t);
          else { const m = { ...def.heavy, name: 'Pounce', damage: def.heavy.damage * 1.35, poise: def.heavy.poise * 1.2, knockback: def.heavy.knockback * 0.8, lunge: 0 }; applyHit(this.hitCtx, a, t, m, 1.2); }
          this.events.push({ kind: 'pounce', pos: { ...a.pos }, actor: a.id, other: t.id, player: a.player, strength: L });
          a.vel = vscale(a.vel, 0.25); a.iframes = 0.1;
          // A grip took over the body's state machine; only a pounce that ended in a blow is free.
          if (!gripped) { a.state = 'free'; a.stateT = 0; }
        }
      } else { a.state = 'free'; a.stateT = 0; a.vel = vscale(a.vel, 0.3); }
    } else if (a.state === 'dodge') {
      // A charge out of a dash: RT cancels the dash into the creature's heavy, thrown at whatever
      // is nearest the line it was travelling along. It costs the dash's remaining invulnerability
      // as well as the extra stamina — you have chosen to commit instead of to escape. It costs
      // the rest of the dash's travel too, since the cancel is immediate: a charge that finds
      // something halfway through leaves the dash covering only the ground it had crossed by then.
      // That is the trade, not a dash cut short by accident.
      if (justHeavy && this.heavyAction(a, def, L, sf, locked, true)) a.iframes = 0;
      else if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; }
    } else if (a.state === 'stagger') {
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.poise = a.poiseMax * 0.6; }
    } else if (a.state === 'grabbed') {
      const g = a.grabbedBy >= 0 ? this.idMap.get(a.grabbedBy) : undefined;
      if (!g || g.state !== 'grabbing' || g.grabbing !== a.id) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; }
      else {
        if (justLight || justHeavy) a.grabT -= 0.28;
        // Pulling against the grip wears it, and only pulling *against* it does. A holder that
        // lets itself drift along with what it has hold of is the hardest to get out of — that is
        // the price of not going anywhere while you hold something — and one that is hauling its
        // catch somewhere is fighting the catch for every unit of it.
        const pull = len3(g.drive), heave = len3(a.drive);
        const opposed = pull > 0.15 && heave > 0.15
          ? Math.max(0, -dot(g.drive, a.drive) / (pull * heave)) * Math.min(1, heave / Math.max(0.3, lengthOf(a)))
          : 0;
        a.grabT -= opposed * GRIP_STRAIN * dt;
        // A dash is the way out, and what it does depends on what the holder is doing. Against one
        // that is pulling, the two forces tear the grip open and the dash is the escape. Against
        // one that has gone slack there is nothing to tear against, so the dash takes the holder
        // with it: you get away with your captor rather than from it, slower by what it weighs.
        if ((justDodge || justDash) && a.stamina >= 10 && a.exhausted === 0) {
          const share = clamp(massOf(g) / (massOf(a) + massOf(g)), 0, 0.85);
          if (pull > 0.15) {
            this.breakLoose(g, a);
            g.graspSpent = true;                          // torn open: the button has to come up
            this.startDodge(a, def, dir, mag, L, sf);
          } else {
            // Towing. The shove goes on the holder, because the holder is what carries the pair —
            // this body is pinned to it — and it is scaled down by the holder's share of the
            // weight, so hauling something big off with you barely moves.
            const d = mag > 0.2 ? dir : vscale(heading(a.yaw), -1);
            const power = 7.5 * Math.sqrt(sf) * (1 - share);
            g.vel.x += d.x * power; g.vel.z += d.z * power;
            if (!creature(g.creature).ground) g.vel.y += d.y * power * 0.7;
            a.stamina -= 10; a.dodgeTapT = 0.35;
            this.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
          }
        }
        // Held at the point the grip actually has. `grabOff` is that point in this body's own
        // frame, so it turns with the body; the grabber's end of it is its mouth. Sized by both
        // animals rather than only the grabber, a mouthful of any size ends up mouth-to-body
        // instead of half inside its captor or hanging in the water in front of it.
        const gh = heading(g.yaw), gl = lengthOf(g);
        const hold = graspPoint(a);
        const target = {
          x: g.pos.x + gh.x * gl * GRASP_AT - hold.x,
          y: g.pos.y - Math.sin(g.pitch) * gl * GRASP_AT - hold.y,
          z: g.pos.z + gh.z * gl * GRASP_AT - hold.z,
        };
        // Fast enough to read as being carried rather than towed, and snapped once it is there so
        // the pair are rigidly joined and the grip does not visibly slip while the grabber turns.
        a.pos.x = damp(a.pos.x, target.x, 22, dt); a.pos.y = damp(a.pos.y, target.y, 22, dt); a.pos.z = damp(a.pos.z, target.z, 22, dt);
        // Contact, from the mouthful's side: the grip has finished closing and the two are joined.
        // The clock belongs to the grabber, because it is the grabber's release it decides, and it
        // is set here because this is where the coming-together actually happens.
        if (Math.hypot(a.pos.x - target.x, a.pos.y - target.y, a.pos.z - target.z) < lengthOf(a) * 0.05) {
          a.pos = { ...target };
          if (g.gripSyncT < 0) g.gripSyncT = 0;
        }
        a.vel = v3();
        if (a.grabT <= 0) { a.state = 'free'; a.stateT = 0; a.grabbedBy = -1; g.state = 'free'; g.stateT = 0; g.grabbing = -1; g.graspSpent = true; a.iframes = 0.4; }
      }
    } else if (a.state === 'grabbing') {
      const v = a.grabbing >= 0 ? this.idMap.get(a.grabbing) : undefined;
      if (!v || v.state !== 'grabbed') { a.state = 'free'; a.stateT = 0; a.grabbing = -1; }
      else {
        // A player holding the button is *holding*, not crushing: the grip keeps what it caught for
        // as long as the button is down — the grip's own clock stops, though what is in it can
        // still struggle out — and the meal is what happens when the button comes up. Nothing a
        // grip has hold of is hurt by the holding, whatever the body doing it: the grasping
        // appendages make a grip easier to close and further to reach with, and that is the whole
        // of what they change. Everything else, a bot's grasp or a move that grabs on its own,
        // squeezes as it always did — that is an attack, not a grip.
        const holdingOn = a.graspHold && a.controller === 'player';
        if (!holdingOn) v.grabT -= dt;
        if (a.gripSyncT >= 0) a.gripSyncT += dt;
        // Crush ticks — and a player's grip never has them, button down or up.
        //
        // Gating this on the button alone meant the squeeze landed on the *release* frame: the
        // grip spends a moment winding down after the button comes up, and a mouthful was crushed
        // to death in it. Something held harmlessly for five seconds then died as it was let go,
        // which is the one thing a grip is not supposed to be able to do. What is left here is what
        // it was always for: a bot's grasp, and a move that grabs on its own. Those are attacks.
        const crushes = a.controller !== 'player';
        if (crushes && Math.floor(a.stateT * 2.5) !== Math.floor((a.stateT - dt) * 2.5)) {
          v.hp -= 6 * clamp(Math.pow(L / lengthOf(v), 1.6), 0.2, 4); v.hitFlash = 0.3;
          this.events.push({ kind: 'hit', pos: { ...v.pos }, actor: a.id, other: v.id, strength: 0.4, player: v.player });
          if (v.hp <= 0) { a.state = 'free'; a.grabbing = -1; if (lengthOf(a) >= lengthOf(v) * 1.35) startSwallow(this.hitCtx, a, v); else kill(this.hitCtx, v, a); }
        }
        // Nothing stays in a grip it did not agree to for ever. Holding costs the holder nothing,
        // so without this it would cost the held animal everything — carried around indefinitely by
        // something that need not even be paying attention. Past `GRIP_BREAK` from contact it is
        // out, whatever the button is doing.
        if (a.gripSyncT >= GRIP_BREAK && v.state === 'grabbed') {
          this.breakLoose(a, v);
        }
        // A player holds on for as long as the button is down. Letting go of something small is a
        // mouthful — that is what the grip was for — and letting go of a peer is just letting go.
        const holding = a.graspHold && a.state === 'grabbing' && v.state === 'grabbed';
        if (holding) a.stateDur = a.stateT + 0.4;
        else if (a.stateT >= a.stateDur && v.state === 'grabbed') {
          // What you held and could swallow, you eat — if you eat it while it is still worth
          // eating. Past `GRIP_MEAL` the animal has had every chance: carrying prey around in your
          // jaws for five seconds is not a meal you are having, and it works itself loose and goes.
          // Timed from contact, like everything else a grip comes to.
          const swallowable = bandOf(a, v) === 'snack' || bandOf(a, v) === 'prey';
          const inTime = a.gripSyncT >= 0 && a.gripSyncT < GRIP_MEAL;
          if (swallowable && a.controller === 'player' && inTime) {
            v.grabbedBy = -1; a.grabbing = -1;
            startSwallow(this.hitCtx, a, v);
          } else if (swallowable && a.controller === 'player') {
            this.breakLoose(a, v);
          } else {
            // throw
            const h = heading(a.yaw);
            v.state = 'free'; v.grabbedBy = -1; v.stateT = 0; v.vel = { x: h.x * 9, y: 2, z: h.z * 9 };
            v.state = 'stagger'; v.stateDur = 0.7;
            a.state = 'free'; a.stateT = 0; a.grabbing = -1;
          }
        }
      }
    } else if (a.state === 'eating') {
      const c = a.eatingTarget >= 0 ? this.idMap.get(a.eatingTarget) : undefined;
      if (!c || c.state !== 'dead' || c.eaten >= 1 || dist(a.pos, c.pos) > L * 0.8 + lengthOf(c) * 0.6 || (a.controller === 'player' && !input.light && a.stateT > 0.3)) {
        a.state = 'free'; a.stateT = 0; a.eatingTarget = -1;
      } else {
        const ratio = lengthOf(c) / L;
        const before = c.eaten;
        if (c.eatBites <= 1) {
          // Small enough to go down whole: one bite, but let it run so the reach-and-swallow
          // performance has something to scrub against.
          c.eaten = Math.min(1, c.eaten + dt / clamp(6 * ratio * ratio, 0.5, 4.5));
        } else {
          // Torn off in whole mouthfuls, on the chew beat. The first lands a little sooner than
          // a full beat so biting something reads as immediate.
          const phase = a.stateT + BITE_TIME * 0.6;
          if (Math.floor(phase / BITE_TIME) !== Math.floor((phase - dt) / BITE_TIME)) {
            const step = 1 / c.eatBites;
            c.eaten = Math.min(1, Math.round((c.eaten + step) / step) * step);
          }
        }
        const taken = c.eaten - before;
        if (taken > 0) {
          this.gainNutrition(a, c, taken * this.nutritionValue(a, c));
          a.hp = Math.min(a.hpMax, a.hp + a.hpMax * taken * 0.35 * Math.min(1, ratio * 2));
        }
        // One event per mouthful for a torn body; a steady chewing beat for one swallowed whole.
        // `strength` is the share of the body that just came off, which is what the renderer tears.
        if (c.eatBites > 1) { if (taken > 0) this.events.push({ kind: 'eat', pos: { ...c.pos }, actor: a.id, other: c.id, strength: taken, player: a.player }); }
        else if (Math.floor(a.stateT * 3) !== Math.floor((a.stateT - dt) * 3)) this.events.push({ kind: 'eat', pos: { ...c.pos }, actor: a.id, other: c.id, strength: ratio, player: a.player });
        if (c.eaten >= 1) { a.eats++; a.state = 'free'; a.stateT = 0; a.eatingTarget = -1; this.flag(a, 'ate'); }
      }
    } else if (a.state === 'ability') {
      this.updateAbility(a, def, dt, input, L, sf);
    } else if (a.state === 'moult') {
      const t = clamp(a.stateT / a.stateDur, 0, 1);
      const era = RULES?.moultScale(this, a);
      const to = era ? era.to : this.mode === 'hunted' && this.isHunter(a.player) ? a.scale : tierScale(a.creature, a.tier);
      // In an egg the animal is already most of the size it will be when it comes out — an egg is
      // not a seed. A moult out of nothing (a respawn above the bottom rung) still swells from a
      // speck, which is what that second was always for.
      const inEgg = a.hatching && a.stateDur > 2;
      const from = a.hatching ? to * (inEgg ? 0.62 : 0.3) : era ? era.from : tierScale(a.creature, Math.max(0, a.tier - 1));
      // Coming out of an egg, the animal is the size of what was in the egg until it is out: the
      // growth is the last third of the hatch, not the whole of it.
      const k = inEgg ? clamp((t - 0.45) / 0.5, 0, 1) : t;
      if (!(this.mode === 'hunted' && this.isHunter(a.player))) a.scale = lerp(from, to, k * k * (3 - 2 * k));
      // Held where it hatched, working at the shell: the wriggle is the animal, not the water.
      if (this.inShell(a)) { a.vel = v3(); a.yaw += Math.sin(a.stateT * 11) * 0.9 * dt; a.pitch = Math.sin(a.stateT * 7) * 0.12; }
      if (a.stateT >= a.stateDur) { a.state = 'free'; a.stateT = 0; a.scale = to; applyScaleStats(a, true); a.hp = a.hpMax; a.hatching = false; }
    }

    // Snacks: swim-through consume
    if (a.state !== 'moult' && a.state !== 'grabbed' && a.controller !== 'swarm') this.consumeSnacks(a, L, def);
    // Mobile suspension feeders can grow in blooms at every tier. Depositors must be near the bottom.
    if (isAlive(a) && a.state !== 'moult' && a.controller !== 'swarm') {
      for (const b of this.world.blooms) if (dist(a.pos, b.pos) < b.radius) {
        const food = bloomRate(a, def) * dt;
        if (food > 0) this.gainNutrition(a, undefined, food);
        if (food > 0 && this.rng() < dt * 2) this.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: .1, player: a.player });
        break;
      }
      const rate = grazeRate(a, def);
      if (rate > 0 && a.pos.y < sampleHeight(a.pos.x, a.pos.z) + clearanceOf(a) + .8) {
        const m = microbialAt(a.pos.x, a.pos.z);
        if (m > .2) this.gainNutrition(a, undefined, dt * rate * m);
      }
      this.feedOnBones(a, L, dt);
    }

    // Aim range: the crosshair fills when whatever RT does for this creature would connect
    a.aimInRange = false;
    if (a.lockTarget >= 0) { const t = this.idMap.get(a.lockTarget); if (t && isAlive(t)) a.aimInRange = dist(a.pos, t.pos) < this.heavyMove(a).reach; }
    // Lock target validity. An unaimed lock is dropped once whatever it is on has got well away —
    // except while the animal is crossing open water to take hold of it. That swim is the whole
    // move, and the distance it covers is the point of it: dropping the lock on range mid-pursuit
    // wiped the target on the first frame and left the animal stopped where it started.
    if (a.lockTarget >= 0) {
      const t = this.idMap.get(a.lockTarget);
      const reaching = a.state === 'pounce' && a.graspHold && !!t
        && (bandOf(a, t) === 'threat' || bandOf(a, t) === 'giant');
      if (!t || !isAlive(t) || isHidden(t) || (!a.aiming && !reaching && dist(a.pos, t.pos) > 16 + L * 8)) a.lockTarget = -1;
    }
    // Hunted meter (for players)
    if (a.controller === 'player' || a.controller === 'bot') this.updateHunted(a);

    if (bursting && !a.prev.burst && a.controller === 'player') this.events.push({ kind: 'burst', pos: { ...a.pos }, actor: a.id, player: a.player });
    a.prev = { light: input.light, heavy: input.heavy, ability: input.ability, dodge: input.dodge, guard: input.guard, lock: input.lock, sense: input.sense, rise: input.rise, burst: bursting, dash: input.dash, aim: input.aim };
    // onboarding flags
    if (a.controller === 'player') {
      if (mag > 0.2) this.flag(a, 'moved');
      if (bursting) this.flag(a, 'burst');
    }
  }

  /** Both ends of a ride, dropped: whoever this actor was holding on to, and whoever was holding on to it. */
  private clearRide(a: Actor) {
    if (a.rideHost >= 0) endRide(a, this.idMap.get(a.rideHost));
    if (a.riddenBy >= 0) { const r = this.idMap.get(a.riddenBy); if (r) endRide(r, a, true); else a.riddenBy = -1; }
  }

  /**
   * Hold on to something your own size or bigger. The rider is pinned to the spot it took hold of,
   * in the host's own frame, so the host tows it around and through whatever it swims through.
   *
   * The grip does no damage and costs nothing to keep. Not a blow that lingers, not a clock the
   * player is spending, not a bar draining while they hang there: taking hold of an animal is one
   * of the things a body can simply be doing, and it goes on until they let go. It used to end
   * itself after nine seconds and land a strike if it was released inside the first fraction of a
   * second, which made the whole thing an attack wearing a grip's clothes — you could not ride
   * anything without hurting it, and you could not ride it for long. Biting what you are holding on
   * to is a separate decision, and the light attack still works while clinging, which is what makes
   * that possible.
   *
   * It ends when the player lets go, when the host throws itself sideways — a dash or a dodge
   * shakes a rider off, which is the host's own answer to being ridden and the only thing that is
   * not the rider's choice — or when either animal stops being in a state to hold on: dead,
   * grabbed, staggered, hidden or swallowed.
   */
  private updateRide(a: Actor, def: ReturnType<typeof creature>, input: InputFrame, dt: number) {
    const host = this.idMap.get(a.rideHost);
    const player = a.controller === 'player';
    if (!host || host.riddenBy !== a.id || !isAlive(host) || !isAlive(a) || isHidden(a) || isHidden(host)
      || a.state === 'grabbed' || a.state === 'swallowed' || a.state === 'stagger' || a.state === 'moult'
      || host.state === 'grabbed' || host.state === 'swallowed') { endRide(a, host); return; }
    if (host.state === 'dodge') { endRide(a, host, true); return; }                 // shaken off
    a.rideT += dt;
    if (a.gripSyncT >= 0) a.gripSyncT += dt;
    // Holding on is free and has no end of its own. `rideT` is the time since the grip closed, and
    // the only thing it is for is the short grace below.
    //
    // That grace is the frame the grip was closed in: a pounce that arrives as a grip does so while
    // the button is still travelling, and without it a hold could be dropped before the player had
    // any chance to keep it.
    if (player && !a.graspHold && a.rideT > 0.35) {
      // Grab and let go and it is the blow the grip stood in for — and the animal comes looking for
      // whoever did it. Hold on past `GRIP_STRIKE` and the grip has stopped being an attack: it
      // does nothing at all, and the host never learns it has a passenger.
      //
      // Judged from contact, so the fraction of a second the bodies spend coming together is not
      // charged to the player as time spent holding on.
      if (a.gripSyncT >= 0 && a.gripSyncT <= GRIP_STRIKE && isAlive(host)) {
        applyHit(this.hitCtx, a, host, { ...def.heavy, name: 'Grip', lunge: 0 }, 1);
      }
      endRide(a, host); return;
    }
    const h = heading(host.yaw);
    // The hold point on the host, then out along the host's surface by the rider's own half-width,
    // so the rider lies *on* the host rather than with its middle buried in it.
    const hold = rideHold(a, host);
    const outX = -h.z * a.rideOff.x, outY = a.rideOff.y, outZ = h.x * a.rideOff.x;
    const ol = Math.hypot(outX, outY, outZ), rr = bodyRadius(a);
    const target = ol > 1e-6
      ? { x: hold.x + (outX / ol) * rr, y: hold.y + (outY / ol) * rr, z: hold.z + (outZ / ol) * rr }
      : { x: hold.x, y: hold.y + rr, z: hold.z };
    a.pos.x = damp(a.pos.x, target.x, 22, dt);
    a.pos.y = damp(a.pos.y, target.y, 22, dt);
    a.pos.z = damp(a.pos.z, target.z, 22, dt);
    // Contact: the grip has stopped closing and the two bodies are together. Everything a grip
    // comes to is timed from this frame, and the renderer takes its bone hold from here too.
    if (Math.hypot(a.pos.x - target.x, a.pos.y - target.y, a.pos.z - target.z) < lengthOf(a) * 0.05) {
      a.pos = { ...target };
      if (a.gripSyncT < 0) a.gripSyncT = 0;
    }
    a.vel = { x: host.vel.x, y: host.vel.y, z: host.vel.z };
    a.grounded = false; a.hopVel = 0; a.climbTo = -Infinity;
    if (player) this.flag(a, 'ride');
    void def; void input;
  }

  private startDodge(a: Actor, def: ReturnType<typeof creature>, dir: Vec3, mag: number, L: number, sf: number) {
    // An animal that escapes by flipping its tail has only that one evasion, whichever button asked.
    if (def.tailFlip) { this.startDash(a, def, dir, L, sf); return; }
    const retreat = a.dodgeTapT > 0;
    let d: Vec3 = mag > 0.2 ? { ...dir } : vscale(heading(a.yaw), -1);
    if (def.ground) d.y = 0;
    d = norm(d);
    a.state = 'dodge'; a.stateT = 0; a.stateDur = retreat ? 0.5 : 0.32;
    a.iframes = retreat ? 0 : 0.28;
    a.stamina -= retreat ? 14 : 10;
    const power = (retreat ? 9 : 7.5) * Math.sqrt(sf) * (def.id === 'waptia' ? 1.25 : 1);
    a.vel.x = d.x * power; a.vel.y = def.ground ? a.vel.y : d.y * power * 0.7; a.vel.z = d.z * power;
    a.dodgeDir = d; a.dodgeTapT = retreat ? 0 : 0.35;
    this.evadeSpecial(a, def, L);
    if (retreat) this.silt.push({ pos: { ...a.pos }, radius: 2.2 + L * 0.7, t: 4 });
    if (a.state === 'dodge') this.events.push({ kind: retreat ? 'silt' : 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'dodge');
  }

  pounceRange(a: Actor) { return lengthOf(a) * 3.6 + 3; }

  /**
   * What the heavy button (RT) actually does for this creature right now: its name for the prompt,
   * how far it reaches, and whether pressing it would do anything at all.
   *
   * The HUD used to announce "RT · POUNCE" over any aimed target inside the pounce's reach, for
   * every creature. That is only true of a creature with no special. A creature with a heavy
   * special gets the special instead, on its own cooldown and its own much shorter reach, and the
   * three filter-feeding specials never strike a target at all — so the prompt lit for a button
   * that would either do nothing or swing at water a body length short. `ready` mirrors the gates
   * in the action cascade above exactly, `reach` is the move's own reach, and `name` is the move's
   * own name, the way the choice screen already lists it.
   */
  heavyMove(a: Actor): { name: string; reach: number; ready: boolean } {
    const def = creature(a.creature);
    // A burrowed ambusher's emergence strike takes the button ahead of everything else.
    if (a.emergenceHeavy) return { name: 'AMBUSH', reach: this.pounceRange(a), ready: true };
    const pounce = { name: 'POUNCE', reach: this.pounceRange(a), ready: a.pounceCd === 0 && a.stamina >= 12 && a.exhausted === 0 };
    if (HEAVY_SPECIALS.has(def.ability)) {
      if (a.abilityCd <= 0 && a.stamina >= 18) return { name: def.abilityName.toUpperCase(), reach: heavyStrikeReach(a, def), ready: true };
      // The special is down. A player's press falls through to the pounce rather than being
      // swallowed, so the prompt follows the button instead of greying out on a move it will not
      // play. Bots have no fallback, so for them the special is still the whole answer.
      if (a.controller === 'player') return pounce;
      return { name: def.abilityName.toUpperCase(), reach: heavyStrikeReach(a, def), ready: false };
    }
    return pounce;
  }

  /**
   * The heavy button, wherever it is pressed from: standing, sprinting, or out of a dash.
   *
   * Returns whether the press was taken, so the action cascade can fall through to the dash and
   * the plain attacks when it was not — a bot without a special, or a move on cooldown. `charge`
   * is a press made with the body already committed to a direction: it aims along the line of
   * travel rather than the nose, reaches a little further along it, and costs `CHARGE_STAMINA`
   * on top of the move's own price.
   */
  private heavyAction(a: Actor, def: ReturnType<typeof creature>, L: number, sf: number, locked: Actor | undefined, charge: boolean): boolean {
    const extra = charge ? CHARGE_STAMINA : 0;
    // A burrowed ambusher's emergence strike takes the button ahead of everything else, and is free.
    if (a.emergenceHeavy) { this.emergeStrike(a, def); return true; }
    // Reaching for a hold on something too big to bite comes before the creature's own special —
    // but only once the button has been *held*, which is the rule everywhere else too. A tap is an
    // attack, and a special is one of the attacks a tap can be; holding is what means "get hold of
    // it". Without the wait this took the press outright and a creature whose special is a crush
    // or a rake simply stopped being able to use it on anything large, which is most of what those
    // moves are for. Held, it is why an Opabinia beside a giant now does something: the button was
    // being spent on a claw strike aimed at an animal it cannot hurt.
    if (a.graspHold && a.graspT >= gripHold(def) && this.keepReaching(a, def, L, sf)) return true;
    if (HEAVY_SPECIALS.has(def.ability) && a.abilityCd <= 0 && a.stamina >= 18 + extra) {
      a.stamina -= 18 + extra; this.startAbility(a, def); a.abilityCd = Math.max(2, a.stateDur + .6); this.flag(a, 'heavy');
      return true;
    }
    // The pounce. Creatures whose special sits on RT reach it too, but only once the special has
    // been ruled out just above (cooling down, or too little stamina): RT is never a dead button.
    // Bots keep the old split — RT is their special and nothing else — so every seeded replay that
    // depends on their behaviour is unchanged.
    if (a.controller !== 'player' || a.pounceCd !== 0 || a.stamina < 12 + extra || a.exhausted > 0) return false;
    a.stamina -= extra;
    // Holding the grip button turns the lunge into a way of getting hold of something: it will
    // pick a body far too big to bite and swim at it until it arrives, where an ordinary pounce
    // would have refused the target and left the button doing nothing at all in front of the one
    // animal a player most wants to grab.
    const grabbing = a.graspHold;
    // A crosshair on something too big to bite, with the grip held, is a target however far off it
    // is: the swim to it is the move. Everything else still has to be in range to be sprung at.
    const bigLock = grabbing && locked && isAlive(locked) && (bandOf(a, locked) === 'threat' || bandOf(a, locked) === 'giant');
    const t = a.aiming && locked && isAlive(locked) ? (a.aimInRange || bigLock ? locked : undefined)
      : charge ? this.chargeTarget(a) ?? this.pounceTargetAhead(a, grabbing) : this.pounceTargetAhead(a, grabbing);
    if (t) this.startPounce(a, t, L, sf);
    else { const m = { ...def.heavy, lunge: def.heavy.lunge + 1.0 }; a.state = 'attack'; a.stateT = 0; a.move = m; a.moveKind = 'heavy'; a.hitDone.clear(); a.stamina -= staminaCost(a, m.stamina); a.combo = 0; a.pounceCd = 0.8; this.flag(a, 'heavy'); }
    return true;
  }

  /**
   * What a charge snaps onto: the body nearest the line the creature is actually travelling along.
   *
   * A sprint or a dash has already chosen a direction, and at that speed the nose swings around
   * far more slowly than the body crosses ground — so a cone measured off the heading, which is
   * what the standing pounce uses, misses the animal you are about to swim straight past. This
   * measures how far along the line a body sits and how far off it, and takes the nearest thing
   * inside a corridor rather than a wedge.
   */
  private chargeTarget(a: Actor): Actor | undefined {
    const L = lengthOf(a);
    const line = len3(a.vel) > 1 ? norm(a.vel) : heading(a.yaw);
    const reach = this.pounceRange(a) * CHARGE_REACH, lateral = L * CHARGE_LATERAL + 2;
    let best: Actor | undefined, bd = Infinity;
    for (const o of this.nearby(a.pos, reach)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      // Another player is never chosen for you, charging or not: turning on one stays deliberate.
      if (o.controller === 'player' && a.controller === 'player') continue;
      if (bandOf(a, o) === 'giant') continue;
      const to = sub(o.pos, a.pos), along = dot(to, line);
      if (along < 0 || along > reach) continue;
      const off = len3(sub(to, vscale(line, along)));
      if (off > lateral + bodyRadius(o)) continue;
      // Prefer what is straight ahead over what is off to the side at the same distance.
      const score = along + off * 2;
      if (score < bd) { bd = score; best = o; }
    }
    return best;
  }

  /**
   * Turn a close attack onto what it is nearly pointing at, by at most `AIM_NUDGE`.
   *
   * A bite whose mouth reaches four tenths of a body length has no tolerance at all: missing by a
   * few degrees at that range reads as the game ignoring the press rather than as the player's
   * mistake. The cap is what keeps it honest — it will not turn you round, and it never picks
   * another player, so who you attack is still your decision.
   */
  /**
   * Close a grip on whatever is in reach, while the button is held.
   *
   * Two different things depending on what is caught, which is the whole point of one button doing
   * it: something small enough to be a mouthful is *held*, and letting go of the button eats it;
   * anything over the rival band is not a mouthful but is something to hold on *to*, so the grip
   * becomes a ride and the animal being ridden is never touched. Neither costs the far body any
   * health — a grasp is a grip, not a blow — and neither picks another player, who is grabbed only
   * by a deliberate attack that lands.
   *
   * Returns true when it took hold this frame, which is the caller's signal to leave the attack
   * buttons alone: the press bought the grip rather than the strike.
   */
  private tryGrasp(a: Actor, def: ReturnType<typeof creature>, L: number, gripButton: boolean): GraspResult {
    // `why` is the recorder's window onto this decision (`?debug=game`). It is written from inside
    // the real gates rather than reconstructed alongside them, so a recording can never disagree
    // with what the game actually did — which is the only way a diagnosis is worth having.
    const why = (r: string) => { if (a.controller === 'player') this.graspReasons.set(a.id, r); };
    if (a.graspT <= 0) { why('no attack button held'); return 'none'; }
    if (a.graspSpent) { why('grip spent — let go of the button before trying again'); return 'none'; }
    if (a.grabbing >= 0 || a.rideHost >= 0 || a.riddenBy >= 0) { why('already holding or held'); return 'none'; }
    if (a.state !== 'free' && a.state !== 'guard') { why(`busy: state=${a.state}`); return 'none'; }
    if (a.hitStop > 0) { why('hit-stopped'); return 'none'; }
    if (isHidden(a) || !isAlive(a)) { why('hidden or dead'); return 'none'; }
    const h = heading(a.yaw), reach = gripReach(def, L);
    let best: Actor | undefined, bd = Infinity;
    let nearestGap = Infinity, nearestWhy = '';
    for (const o of this.nearby(a.pos, reach + L * 2)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o) || isInvulnerable(o)) continue;
      if (o.state === 'grabbed' || o.state === 'swallowed' || o.riddenBy >= 0 || o.rideHost >= 0) continue;
      // Whoever you take hold of stays your decision, exactly as it is for the bite's own aim.
      if (o.controller === 'player' && a.controller === 'player') continue;
      // To the body, not to a ball around its middle: pressed against a giant's tail you are ten
      // units from its centre and touching it, and the old test called that out of reach.
      const gap = bodyGap(o, a);
      // In front, measured in the yaw plane so something above or below is still in front of you.
      const to = sub(o.pos, a.pos);
      const flat = Math.hypot(to.x, to.z);
      const ahead = flat <= 1e-6 || (to.x * h.x + to.z * h.z) / flat >= GRASP_CONE;
      if (gap < nearestGap) {
        nearestGap = gap;
        nearestWhy = gap > reach ? `nearest ${creature(o.creature).name} is ${gap.toFixed(2)} from its surface, reach is ${reach.toFixed(2)}`
          : !ahead ? `nearest ${creature(o.creature).name} is in reach but not ahead of you`
          : '';
      }
      if (gap > reach || !ahead) continue;
      if (gap < bd) { bd = gap; best = o; }
    }
    if (!best) { why(nearestWhy || 'nothing within reach to take hold of'); return 'none'; }
    const band = bandOf(a, best);
    // Ridden, or taken into the jaws? Only what this body could actually swallow is a mouthful;
    // its own size and up is something to hold on to. Same rule as `closeGrip`, which is where a
    // grip closed by a lunge or a landing blow decides it.
    const bigger = band !== 'snack' && band !== 'prey';
    const name = `${creature(best.creature).name} (${band}, gap ${bd.toFixed(2)})`;
    if (bigger && gripButton && def.grasp) {
      const took = takeRide(this.hitCtx, a, best);
      why(took ? `took hold of ${name}` : `${name} refused the grip — the head end, or it is already ridden`);
      return took ? 'took' : 'none';
    }
    // Still closing. Reported so the grip button can hold its own strike while it does: pressing it
    // against something already within arm's reach means taking hold of it, and a pounce that fired
    // on the press frame settled the matter before the grip ever shut — on prey the lunge simply
    // swallowed what the player was reaching for. Further off than this the button still pounces,
    // which is where a pounce was always for.
    if (a.graspT < gripHold(def)) {
      why(`closing on ${name}: held ${a.graspT.toFixed(2)}s of ${gripHold(def).toFixed(2)}s`);
      return 'closing';
    }
    const took = bigger ? takeRide(this.hitCtx, a, best) : takeHold(this.hitCtx, a, best);
    why(took ? `took hold of ${name}` : `${name} refused the grip — the head end, or it is already held`);
    return took ? 'took' : 'closing';
  }

  /**
   * A grip ends with what it was holding simply getting away: not thrown, not hurt, not eaten.
   *
   * Three things arrive here — a release that came too late to be a meal, the grip's own time
   * running out, and (from the other side) a dash that tore it open — and they are the same event
   * from the held animal's point of view, so they are one piece of code. Nothing a grip holds is
   * ever hurt by the holding, and that has to include the moment it stops.
   */
  private breakLoose(holder: Actor, held: Actor) {
    held.state = 'free'; held.stateT = 0; held.grabbedBy = -1; held.iframes = 0.4;
    holder.state = 'free'; holder.stateT = 0; holder.grabbing = -1; holder.gripSyncT = -1;
    held.escapes++;
    if (held.brain) { held.brain.goal = 'flee'; held.brain.target = holder.id; held.brain.goalT = 0; }
    this.events.push({ kind: 'escape', pos: { ...held.pos }, actor: held.id, other: holder.id, player: held.player });
  }

  /** Why this player's grip did or did not close, last time the question was asked. */
  graspReason(id: number): string { return this.graspReasons.get(id) ?? ''; }

  /**
   * Close whatever grip suits the far body's size, and say whether one closed. A mouthful is held
   * in the mouth; anything from the animal's own size upwards is held on to. Neither costs it any
   * health — what the grip comes to is settled when the button comes up, not when it shuts, and for
   * anything too big to swallow it comes to nothing at all.
   */
  private closeGrip(a: Actor, o: Actor): boolean {
    const band = bandOf(a, o);
    // A grip is for holding on to. Only what this body could actually swallow is taken into the
    // jaws as a mouthful; everything from its own size upwards is ridden. A rival used to be
    // crushed and thrown, which meant the one animal most worth clinging to — something that can
    // fight back and is going somewhere — was the one thing a grip could not hold on to.
    const took = band === 'snack' || band === 'prey' ? takeHold(this.hitCtx, a, o) : takeRide(this.hitCtx, a, o);
    // The other way a grip closes — a lunge or a strike arriving — reports itself to the recorder
    // as the direct reach does, so a recording accounts for every hold however it was got.
    if (a.controller === 'player') {
      const name = `${creature(o.creature).name} (${band})`;
      this.graspReasons.set(a.id, took ? `took hold of ${name} on arriving` : `${name} refused the grip on arriving — the head end, or already held`);
    }
    return took;
  }

  private aimNudge(a: Actor, reach: number): void {
    const h = heading(a.yaw);
    let best: Actor | undefined, bd = Infinity;
    for (const o of this.nearby(a.pos, reach)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      if (o.controller === 'player' && a.controller === 'player') continue;
      const to = sub(o.pos, a.pos), d = len3(to);
      if (d > reach) continue;
      // The cone is measured in the yaw plane. Against the full 3-D heading it narrowed with
      // height — a fish directly above the mouth scored zero and was rejected as "behind" — when
      // something overhead is as much in front of you as something level with you is. What it
      // takes to reach up at it is the pitch below, not a wider cone.
      const flat = Math.hypot(to.x, to.z);
      if (flat > 1e-6 && (to.x * h.x + to.z * h.z) / flat < AIM_NUDGE_CONE) continue;
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    const to = sub(best.pos, a.pos);
    const turn = clamp(wrapAngle(yawOf(to) - a.yaw), -AIM_NUDGE, AIM_NUDGE);
    a.yaw = wrapAngle(a.yaw + turn); a.prevT.yaw = a.yaw;
    // A walker's pitch is the slope it is standing on and is rewritten from the ground every step,
    // so there is nothing to aim with; a swimmer tips its nose at what it is biting.
    if (!creature(a.creature).ground) {
      const want = clamp(-Math.atan2(to.y, Math.hypot(to.x, to.z)), -0.9, 0.9);
      a.pitch += clamp(want - a.pitch, -AIM_NUDGE_PITCH, AIM_NUDGE_PITCH);
      a.prevT.pitch = a.pitch;
    }
  }

  /** Nearest thing in front worth pouncing on when RT is pressed without aiming. */
  private pounceTargetAhead(a: Actor, grabbing = false): Actor | undefined {
    const L = lengthOf(a); const h = heading(a.yaw);
    let best: Actor | undefined, bd = Infinity;
    // The sweep has to be wide enough to see what the range test will accept: a grab pursuit may
    // set out from `lengthOf(target) * 2` past the ordinary pounce range, and a target that is
    // never handed to the loop is never considered however generous the test after it.
    const sweep = this.pounceRange(a) + lengthOf(a) * 4 + (grabbing ? GRAB_SWEEP : 0);
    for (const o of this.nearby(a.pos, sweep)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      // Another player is never chosen for you. Turning on one is deliberate: lock onto them
      // with the right stick, or simply bite what is in front of your mouth.
      if (o.controller === 'player' && a.controller === 'player') continue;
      const band = bandOf(a, o);
      // A lunge that means to take hold is allowed to pick something enormous — that is the only
      // thing it *can* usefully do with one — where a lunge that means to bite is not.
      if (band === 'giant' && !grabbing) continue;
      if (o.riddenBy >= 0 || o.rideHost >= 0 || o.state === 'grabbed') continue;
      const to = sub(o.pos, a.pos);
      // To the far body's surface, so a twenty-unit animal is as reachable as it looks.
      const gap = bodyGap(o, a);
      // How far off you may set out from. A bite has to be sprung from close; setting out to take
      // hold of something is a swim, and how far a swim is worth starting scales with how big the
      // thing is — a giant is visible and worth crossing open water for from a long way off, and
      // its tail is another whole body length past its middle.
      if (gap > this.pounceRange(a) + (grabbing ? lengthOf(o) * 2 : 0)) continue;
      if (dot(norm(to), h) < 0.6) continue;
      const score = Math.max(0, gap) * (band === 'threat' && !grabbing ? 1.6 : 1);
      if (score < bd) { bd = score; best = o; }
    }
    void L;
    return best;
  }

  /** LB: a burst of speed in the stick direction with invulnerability, covering a few body lengths. */
  private emergeStrike(a: Actor, def: ReturnType<typeof creature>) {
    a.emergenceHeavy = false; a.state = 'attack'; a.stateT = 0;
    a.move = { ...def.heavy, name: 'Emergence strike', stamina: 0, poise: def.heavy.poise + 12 };
    a.moveKind = 'heavy'; a.hitDone.clear(); a.seen = 1;
    this.silt.push({pos:{...a.pos}, radius:lengthOf(a)*.7, t:1.5});
    this.flag(a, 'heavy');
  }

  private blockPulse(a: Actor, def: ReturnType<typeof creature>) {
    if (!['bellCorral', 'shellUp'].includes(def.ability) || a.abilityCd > 0 || a.stamina < 10) return;
    if (def.ability === 'shellUp' && a.guardHeld < .6) return;
    a.stamina -= 10; a.abilityCd = 4;
    for (const o of this.nearby(a.pos, lengthOf(a)*1.15)) {
      if (o.id === a.id || !isAlive(o) || this.expansionContext().allies(a,o)) continue;
      applyHit(this.hitCtx,a,o,{...def.light,damage:def.ability==='bellCorral'?7:0,poise:35,knockback:5,sweep:true},0);
    }
  }

  private evadeSpecial(a: Actor, def: ReturnType<typeof creature>, L: number) {
    if (['tailFlick','ribbonSlip'].includes(def.ability)) {
      this.silt.push({pos:{...a.pos},radius:L,t:2}); clearPursuit(a,this.actors);
    }
    if (def.ability === 'combCruise') { a.burstT = 1; a.stamina = Math.min(a.staminaMax,a.stamina+4); }
  }

  private startDash(a: Actor, def: ReturnType<typeof creature>, dir: Vec3, L: number, sf: number, relief = 0) {
    // The tail-flip fires before the animal has decided anything: it goes straight back along its
    // own axis whatever the stick was asking for, and it costs the tail rather than a fin beat.
    const flip = !!def.tailFlip;
    let d: Vec3 = flip ? vscale(heading(a.yaw), -1) : { ...dir };
    // A walker dashes along what it is aimed at, up out of the sand included. It keeps the
    // vertical it was given — the dash is a shove, and where it goes afterwards is the settle's
    // business — but it never dashes *into* the floor, which is only a way to waste the stamina.
    if (def.ground && d.y < 0) d.y = 0;
    d = norm(d);
    a.state = 'dodge'; a.stateT = 0; a.stateDur = flip ? 0.5 : 0.42;
    // A body dashing on nothing but free climb gets the climb and not the ground: the horizontal
    // half of the burst is what the stamina was for, and it has none. A flip is the exception —
    // the reflex fires whatever is left, it just fires weakly (`flipLaunch`).
    const cost = (flip ? FLIP_STAMINA : 12) * (1 - relief);
    const empty = a.stamina < cost;
    a.iframes = flip ? 0.5 : 0.42; a.stamina = Math.max(0, a.stamina - cost); a.dashCd = flip ? 0.7 : 0.55;
    // A punt needs the floor under it; out in the water there is nothing to push off.
    const gap = a.pos.y - groundHeight(this.world, a.pos.x, a.pos.z, []);   // own scratch: called mid-update
    const power = flip ? flipLaunch(a) : (L * 9.5 + 7) * (def.id === 'waptia' ? 1.2 : 1) * punting(a, gap);
    const along = empty && !flip ? 0 : 1;
    // The vertical used to be cut to seven tenths, which tipped every aimed dash flatter than it
    // was pointed — about ten degrees of it — and made lining one up on prey above or below you
    // harder than lining it up on prey alongside. A dash goes where it was aimed, in all three.
    a.vel.x = d.x * power * along; a.vel.y = def.ground ? Math.max(a.vel.y, d.y * power) : d.y * power; a.vel.z = d.z * power * along;
    if (def.ground && d.y > 0.1) { a.grounded = false; a.hopVel = Math.max(a.hopVel, 0); }
    a.dodgeDir = d;
    this.evadeSpecial(a, def, L);
    this.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'dodge');
  }

  /**
   * Keep going for a hold on something bigger than you, for as long as the grip button is down.
   *
   * Only ever a re-entry into the lunge that the press already started: same target rules, same
   * cost, same cooldown. What it removes is the requirement to let go and press again, which on a
   * body twenty units long is the difference between reaching it and hanging a body's length off
   * it wondering why nothing happened.
   */
  private keepReaching(a: Actor, def: ReturnType<typeof creature>, L: number, sf: number): boolean {
    if (!a.graspHold || a.graspSpent || a.controller !== 'player') return false;
    if (a.grabbing >= 0 || a.rideHost >= 0 || a.riddenBy >= 0) return false;
    if (a.state !== 'free' || a.exhausted > 0) return false;
    // Whatever it set out for, it keeps. Re-acquiring through the facing cone every time meant a
    // pursuit that drifted a few degrees off — which it does, with no stick input, once the lunge
    // has spent itself — could never pick its own target up again, and the animal simply stopped
    // in open water halfway to the thing it was reaching for.
    const held = a.lockTarget >= 0 ? this.idMap.get(a.lockTarget) : undefined;
    const usable = (o: Actor | undefined): o is Actor => !!o && isAlive(o) && !isHidden(o)
      && o.riddenBy < 0 && o.rideHost < 0 && o.state !== 'grabbed'
      && (bandOf(a, o) === 'threat' || bandOf(a, o) === 'giant')
      && !(o.controller === 'player' && a.controller === 'player');
    const t = usable(held) ? held : this.pounceTargetAhead(a, true);
    if (!usable(t)) return false;
    // Setting out costs; carrying on does not. The swim is one act however far it turns out to be,
    // and charging for every re-entry made a long crossing cost more than the animal ever had.
    if (a.pounceCd > 0) return false;
    const fresh = a.lockTarget !== t.id;
    if (fresh && (a.stamina < 12 || a.pounceCd > 0)) return false;
    if (a.controller === 'player') {
      this.graspReasons.set(a.id, `reaching for ${creature(t.creature).name} (${bandOf(a, t)}), ${bodyGap(t, a).toFixed(1)} away`);
    }
    this.startPounce(a, t, L, sf, !fresh);
    return true;
  }

  private startPounce(a: Actor, target: Actor, L: number, sf: number, free = false) {
    // The pounce homes on `lockTarget`, so a pounce that picked its own target has to record it.
    // Without this an unaimed press — the common case, since it means not holding LT — entered the
    // state, found nothing to home on and dropped straight back out, having spent the stamina and
    // the cooldown on nothing at all. Safe to write: the block that clears a player's lock runs
    // only while free or guarding, so it cannot reach in and clear this mid-pounce.
    a.lockTarget = target.id;
    a.state = 'pounce'; a.stateT = 0; a.stateDur = clamp(dist(a.pos, target.pos) / Math.max(6, L * 3), 0.25, 0.9) + 0.15;
    if (!free) { a.stamina -= 12; a.pounceCd = 1.4; }
    a.combo = 0;
    a.move = { ...creature(a.creature).heavy, name: 'Pounce' }; a.moveKind = 'heavy';
    this.events.push({ kind: 'dodge', pos: { ...a.pos }, actor: a.id, player: a.player, strength: L });
    this.flag(a, 'heavy');
    void sf;
  }

  private expansionContext() {
    return { hit: this.hitCtx, nearby: (pos: Vec3, radius: number) => this.nearby(pos, radius), silt: this.silt,
      allies: (a: Actor, b: Actor) => this.mode === 'rise' && a.controller === 'player' && b.controller === 'player' };
  }

  /** Internal animation state for native heavy specials; Y never calls this. */
  private startAbility(a: Actor, def: ReturnType<typeof creature>) {
    if (!HEAVY_SPECIALS.has(def.ability)) return;
    a.abilityCd = Math.max(2, (def.abilityDuration ?? .55) + .6);
    a.abilityT = 0; a.abilityActive = true; a.state = 'ability'; a.stateT = 0;
    a.stateDur = def.abilityDuration ?? .55; a.hitDone.clear();
    beginHeavyStrike(this.expansionContext(), a, def);
    beginExpansionAbility(this.expansionContext(), a, def);
    RULES?.beginAbility?.(this, a, this.expansionContext());
    this.events.push({kind:'ability',pos:{...a.pos},actor:a.id,player:a.player,strength:lengthOf(a)});
    this.flag(a, 'heavy');
  }

  private updateAbility(a: Actor, def: ReturnType<typeof creature>, dt: number, input: InputFrame, L: number, sf: number) {
    a.abilityT += dt;
    const done = a.stateT >= a.stateDur;
    stepHeavyStrike(this.expansionContext(), a, def);
    stepExpansionAbility(this.expansionContext(), a, def, dt);
    RULES?.stepAbility(this, a, this.expansionContext(), dt);
    if (a.state !== 'ability') return;
    switch (def.ability) {
      case 'snatch': {
        if (a.stateT >= 0.2 && a.stateT < 0.35 && a.hitDone.size === 0) {
          const h = heading(a.yaw);
          let best: Actor | undefined, bd = Infinity;
          for (const o of this.nearby(a.pos, L * 2.4)) {
            if (o.id === a.id || !isAlive(o) || isHidden(o) || this.expansionContext().allies(a,o)) continue;
            const to = sub(o.pos, a.pos); const d = len3(to);
            if (d > L * 2.4 || dot(norm(to), h) < 0.72) continue;
            if (d < bd) { bd = d; best = o; }
          }
          if (best) {
            a.hitDone.add(best.id);
            const heavier = massOf(best) > massOf(a) * 1.3;
            const pull = norm(sub(heavier ? best.pos : a.pos, heavier ? a.pos : best.pos));
            if (heavier) { a.vel = vscale(pull, 14); }
            else { best.vel = vscale(pull, 16); best.iframes = 0; }
            applyHit(this.hitCtx, a, best, specialHit(def, { damage: 12, poise: 30, knockback: 0 }), 0);
            this.events.push({ kind: 'grab', pos: { ...best.pos }, actor: a.id, other: best.id, player: a.player });
          }
        }
        break;
      }
    }
    if (done) {
      a.abilityActive = false; a.state = 'free'; a.stateT = 0; a.hitDone.clear();
    }
  }

  private attackHits(a: Actor, m: MoveDef, L: number) {
    const h = heading(a.yaw);
    const mouth = m.sweep ? a.pos : { x: a.pos.x + h.x * L * 0.42, y: a.pos.y - Math.sin(a.pitch) * L * 0.3, z: a.pos.z + h.z * L * 0.42 };
    const reach = m.sweep ? L * 0.85 : L * 0.4;
    for (const o of this.nearby(a.pos, L * 1.5 + 4)) {
      if (o.id === a.id || !isAlive(o) || a.hitDone.has(o.id) || isHidden(o)) continue;
      if (o.controller === 'swarm' && a.controller === 'swarm') continue;
      const d = dist(mouth, o.pos);
      if (d < reach + bodyRadius(o) * 1.1) {
        a.hitDone.add(o.id);
        // A strike made with the grip button down arrives as a grip rather than a blow: the whole
        // point of holding it is to end up holding something, and a strike that damaged on the way
        // in settled the matter before the grip ever shut — on prey the blow simply killed what
        // was being reached for, and on anything big it meant you could not get hold of it without
        // hurting it first. What the hold comes to is decided when the button comes up.
        if (a.graspHold && a.grabbing < 0 && a.rideHost < 0 && this.closeGrip(a, o)) continue;
        const closing = clamp(dot(sub(a.vel, o.vel), norm(sub(o.pos, a.pos))) / (creature(a.creature).speed * speedFactor(a.scale) * 1.8), 0, 1.5);
        const band = bandOf(a, o);
        if (band === 'snack' && (o.controller === 'swarm' || (o.controller === 'ambient' && lengthOf(o) < lengthOf(a) * 0.3))) { this.consume(a, o); continue; }
        const r = applyHit(this.hitCtx, a, o, m, closing);
        if (o.controller === 'player' && (band === 'rival')) this.flag(o, 'fought');
        void r;
      }
    }
  }

  private corpseInReach(a: Actor): Actor | undefined {
    const L = lengthOf(a);
    let best: Actor | undefined, bd = Infinity;
    for (const o of this.nearby(a.pos, L * 1.2 + 3)) {
      if (o.state !== 'dead' || o.eaten >= 1 || o.id === a.id) continue;
      const d = dist(a.pos, o.pos);
      if (d < L * 0.7 + lengthOf(o) * 0.5 && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  private startEating(a: Actor, c: Actor) {
    a.state = 'eating'; a.stateT = 0; a.eatingTarget = c.id;
    a.lockTarget = -1;
    // The body's own bite count: whoever takes the first bite sizes it, and a carcass already
    // half eaten keeps the count it was opened with.
    if (c.eatBites < 1 || c.eaten <= 0) c.eatBites = bitesFor(a, c);
  }

  private consumeSnacks(a: Actor, L: number, def: ReturnType<typeof creature>) {
    if (a.state === 'dead') return;
    const moving = len3(a.vel) > 0.5 || def.id === 'waptia';
    for (const o of this.nearby(a.pos, L * 0.6 + 1)) {
      if (o.id === a.id || !isAlive(o)) continue;
      if (bandOf(a, o) !== 'snack') continue;
      // Only small wild things go down in one gulp. Players and bots always get a fight (three bites from a giant).
      if (o.controller !== 'swarm' && o.controller !== 'ambient') continue;
      if (o.controller === 'ambient' && lengthOf(o) > lengthOf(a) * 0.3) continue;
      // A nursery is a peace, and a mouthful taken in passing breaks it as surely as a hunt does.
      if (peaceful(o.pos) && a.lastHitBy !== o.id) continue;
      if (dist(a.pos, o.pos) < L * 0.4 + bodyRadius(o) && (moving || a.state === 'attack')) this.consume(a, o);
    }
  }

  private consume(a: Actor, o: Actor) {
    kill(this.hitCtx, o, a);
    o.eaten = 1;
    const val = this.nutritionValue(a, o);
    this.gainNutrition(a, o, val);
    a.eats++;
    a.hp = Math.min(a.hpMax, a.hp + val * 0.4);
    this.events.push({ kind: 'eat', pos: { ...o.pos }, actor: a.id, other: o.id, strength: lengthOf(o) / lengthOf(a), player: a.player });
    this.flag(a, 'ate');
    if (o.controller === 'player' || o.controller === 'bot') { o.respawnT = 1.2; return; } // swallowed: corpse logic respawns them
    this.remove(o);
  }

  nutritionValue(eater: Actor, food: Actor) {
    const ratio = lengthOf(food) / lengthOf(eater);
    let v = 20 * ratio * ratio;
    if (ratio >= 0.7 && ratio < 1.4) v *= 2.5;
    else if (ratio >= 1.4) v *= 3.5;
    else if (ratio < 0.2) v *= 0.3;
    return clamp(v, 0.3, 120);
  }

  private gainNutrition(a: Actor, food: Actor | undefined, amount: number) {
    if (a.controller !== 'player' && a.controller !== 'bot') { a.hp = Math.min(a.hpMax, a.hp + amount * 0.5); return; }
    if (this.mode === 'reef' && a.tier >= 4) return;
    a.nutrition += amount;
    // co-op share
    if (this.mode === 'rise' && food && amount > 2) for (const p of this.players) if (p !== a && isAlive(p) && dist(p.pos, a.pos) < 25) p.nutrition += amount * 0.3;
    RULES?.onNutrition(this, a, amount, food);
    if (RULES && !RULES.growthByNutrition) return;
    this.checkTierUp(a);
    for (const p of this.players) if (p !== a) this.checkTierUp(p);
  }

  private checkTierUp(a: Actor) {
    if (a.tier >= 4 || a.state === 'moult' || a.state === 'dead') return;
    if (a.nutrition >= TIER_NEED[a.tier]) {
      a.nutrition -= TIER_NEED[a.tier];
      a.tier = (a.tier + 1) as Tier;
      a.state = 'moult'; a.stateT = 0; a.stateDur = 1.5; a.lockTarget = -1; a.abilityActive = false;
      if (a.grabbing >= 0) { const v = this.idMap.get(a.grabbing); if (v) { v.state = 'free'; v.grabbedBy = -1; } a.grabbing = -1; }
      this.events.push({ kind: 'tierUp', pos: { ...a.pos }, actor: a.id, strength: a.tier, player: a.player });
      this.flag(a, 'tier');
      // scatter small creatures
      for (const o of this.nearby(a.pos, 20)) if (o.brain && o.controller !== 'giant') { o.brain.goalT = 0; if (o.brain.kind === 'needs') { o.brain.goal = 'flee'; o.brain.target = a.id; } }
    }
  }

  private pickLockTarget(a: Actor, cycle = 0, currentId = -1, aim = false): Actor | undefined {
    const L = lengthOf(a);
    const h = heading(a.yaw);
    const cands: { a: Actor; score: number }[] = [];
    for (const o of this.nearby(a.pos, aim ? 10 + L * 6 : 14 + L * 7)) {
      if (o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      // Another player is only ever picked up by cycling the stick onto them, never by the snap.
      if (o.controller === 'player' && a.controller === 'player' && cycle === 0) continue;
      const to = sub(o.pos, a.pos); const d = len3(to);
      const facing = dot(norm(to), h);
      const band = bandOf(a, o);
      if (!aim && (band === 'snack' || o.controller === 'swarm')) continue;
      if (aim && (band === 'giant' || band === 'threat')) continue;
      // Aiming is for hunting: prey and snacks in front of you come first, rivals after.
      const bandW = aim ? (band === 'prey' ? 0.55 : band === 'snack' ? 0.8 : 1.1) : (band === 'rival' ? 0.6 : 1);
      const score = d * (1.6 - facing) * bandW;
      cands.push({ a: o, score });
    }
    if (!cands.length) return undefined;
    cands.sort((x, y) => x.score - y.score);
    if (cycle === 0 || currentId < 0) return cands[0].a;
    const idx = cands.findIndex((c) => c.a.id === currentId);
    if (idx < 0) return cands[0].a;
    // cycle by side
    const cur = cands[idx].a;
    const side = (o: Actor) => { const to = norm(sub(o.pos, a.pos)); return to.x * h.z - to.z * h.x; };
    const sorted = cands.filter((c) => c.a.id !== currentId).sort((x, y) => (side(x.a) - side(cur)) * cycle - (side(y.a) - side(cur)) * cycle);
    return sorted.find((c) => (side(c.a) - side(cur)) * cycle > 0)?.a ?? cands[(idx + 1) % cands.length].a;
  }

  private updateHunted(a: Actor) {
    let best = 0, hunter = -1;
    for (const o of this.actors) {
      if (!o.brain || !isAlive(o)) continue;
      const band = bandOf(a, o);
      if (band !== 'giant' && band !== 'threat') continue;
      const v = o.brain.detection.get(a.id) ?? 0;
      const hunting = o.brain.target === a.id && o.brain.goal === 'hunt';
      const d = dist(a.pos, o.pos);
      const range = Math.min(creature(o.creature).sense * lengthOf(o) + 6, o.brain.kind === 'giant' ? 70 : 40);
      // giants ramp with their detection score; smaller predators ramp with distance while actively chasing
      const noticing = o.brain.target === a.id && o.brain.goal === 'notice';
      const score = clamp(o.brain.kind === 'giant' ? Math.max(noticing ? 0.35 : 0, hunting ? Math.max(0.6, clamp(1.3 - d / range, 0.5, 1)) : Math.min(v / 4, 0.45)) : hunting ? clamp(1.1 - d / (range * 0.8), 0, 1) : 0, 0, 1);
      if (score > best) { best = score; hunter = o.id; }
    }
    const wasHunted = a.hunted >= 0.98 || a.wasHunted;
    if (best >= 0.98 && !a.wasHunted) { a.wasHunted = true; this.events.push({ kind: 'hunted', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); this.flag(a, 'hunted'); }
    if (wasHunted && best < 0.25 && a.wasHunted) { a.wasHunted = false; a.escapes++; this.events.push({ kind: 'escape', pos: { ...a.pos }, actor: a.id, other: hunter, player: a.player }); this.flag(a, 'escaped'); }
    a.hunted = best; a.hunterId = hunter;
  }

  private resolveActorOverlap() {
    for (const a of this.actors) {
      if (!isAlive(a)) continue;
      const ra = bodyRadius(a);
      for (const o of this.hash.query(a.pos.x, a.pos.z, ra + 6, this.scratchActors)) {
        if (o.id <= a.id || !isAlive(o)) continue;
        if (a.state === 'grabbed' || o.state === 'grabbed' || a.state === 'swallowed' || o.state === 'swallowed') continue;
        const min = ra + bodyRadius(o);
        const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y, dz = o.pos.z - a.pos.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < min && d > 1e-4) {
          const ma = massOf(a), mo = massOf(o);
          const push = (min - d) * 0.5;
          const wa = mo / (ma + mo), wo = ma / (ma + mo);
          const nx = dx / d, ny = dy / d, nz = dz / d;
          a.pos.x -= nx * push * wa; a.pos.y -= ny * push * wa * 0.5; a.pos.z -= nz * push * wa;
          o.pos.x += nx * push * wo; o.pos.y += ny * push * wo * 0.5; o.pos.z += nz * push * wo;
        }
      }
    }
  }

  private updateSilt(dt: number) {
    for (const s of this.silt) s.t -= dt;
    this.silt = this.silt.filter((s) => s.t > 0);
  }

  private updatePopulation(dt: number) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 2.2;
    let ambient = 0, swarm = 0;
    const schools = new Map<number, number>();
    for (const a of this.actors) {
      if (!isAlive(a)) continue;
      if (a.controller === 'ambient') ambient++;
      if (a.controller === 'swarm') { swarm++; if (a.brain?.schoolId != null) schools.set(a.brain.schoolId, (schools.get(a.brain.schoolId) ?? 0) + 1); }
    }
    // The ecosystem lives around the players. Wild things left far behind are dropped, and every
    // player keeps a local population of adults, prey and something big enough to fear.
    const anchors = this.anchors();
    for (const a of this.actors) {
      if (a.controller !== 'ambient' && a.controller !== 'swarm') continue;
      let d = Infinity;
      for (const p of anchors) d = Math.min(d, distXZ(a.pos, p));
      if (d > (a.controller === 'swarm' ? 240 : 290)) this.remove(a);
    }
    // How many wild animals an area carries is the area's own business (`areaProfile`): a rich
    // shelf holds half again what a thin one does, and the thin one is never empty. Refilling is
    // deliberately unhurried — a stretch you have eaten through stays eaten through for a while,
    // which is what makes swimming somewhere else the answer rather than waiting where you are.
    for (const p of anchors) {
      let local = 0;
      for (const a of this.nearby(p, 170)) if (a.controller === 'ambient' && isAlive(a)) local++;
      const want = clamp(Math.round((15 + this.maxPlayerTier() * 2) * areaProfile(p.x, p.z, this.world.seed).density), 9, 34);
      if (local >= want) continue;
      // One at a time when it is nearly full, a few at once when a whole area is bare — arriving
      // one animal every two seconds forever reads as a trickle following the player about.
      for (let k = 0; k < (local < want * 0.5 ? 3 : 1); k++) this.spawnAmbient(false, p);
      break;
    }
    void ambient;
    // Every player, at every size, should have plenty of things smaller than them within reach.
    // For a crawler "within reach" means near the seabed: food hanging in open water above it
    // does not count, so the seafloor keeps being restocked.
    for (const p of this.players) {
      if (!isAlive(p)) continue;
      const L = lengthOf(p);
      const crawler = creature(p.creature).ground;
      const reachY = 3 + L * 1.5;
      let small = 0;
      for (const o of this.nearby(p.pos, 45 + L * 4)) {
        if (o.id === p.id || !isAlive(o)) continue;
        if (crawler && o.pos.y - p.pos.y > reachY) continue;
        const b = bandOf(p, o); if (b === 'snack' || b === 'prey') small++;
      }
      if (small < (crawler ? 18 : 14)) this.spawnPreyFor(p);
    }
    if (swarm < 200) {
      const i = Math.floor(this.rng() * SNACK_SCHOOLS.length);
      const s = SNACK_SCHOOLS[i];
      this.spawnSchool(s.creature, s.scale, s.count, i + Math.floor(this.time));
    }
    // Giants follow the players across the sea: one left far behind is moved to a new lair ahead
    // of them (out of sight), and one that somehow died is replaced.
    for (const c of GIANTS) {
      const g = this.actors.find((a) => a.controller === 'giant' && a.creature === c.creature);
      if (!g) { this.placeGiant(this.spawn(c.creature, 'giant', { ...anchors[0] }, c.scale)); continue; }
      if (isAlive(g) && g.brain?.goal !== 'hunt' && this.anchorDistance(g.pos) > 420) this.placeGiant(g);
    }
    const shadow = this.actors.find((a) => a.controller === 'shadow');
    if (shadow && isAlive(shadow) && shadow.brain?.goal !== 'hunt' && this.anchorDistance(shadow.pos) > 300) this.placeGiant(shadow);
  }

  /**
   * The `bones` landmark whose ribcage `pos` is inside, if any. Cheap: there is at most one
   * landmark per 320-unit cell and only loaded chunks are in the list.
   */
  bonesNear(pos: Vec3, range = 0): Landmark | undefined {
    let best: Landmark | undefined, bd = Infinity;
    for (const m of this.world.landmarks) {
      if (m.kind !== 'bones') continue;
      const d = distXZ(pos, m.pos);
      if (d < m.radius + range && d < bd) { bd = d; best = m; }
    }
    return best;
  }

  /** How much of a skeleton is left to strip, 0..1. Unvisited ones are whole. */
  bonesLeft(id: number) { return this.bonesMeat.get(id) ?? 1; }

  /**
   * Eating at a dead giant's bones. Anything that can reach the body gets fed — this is
   * scavenging, not a kill — at a rate that scales with the eater, so it is a real meal at every
   * tier rather than a trickle for a giant and a banquet for a larva. It depletes as it is eaten.
   */
  private feedOnBones(a: Actor, L: number, dt: number) {
    if (a.controller === 'swarm' || a.pos.y > sampleHeight(a.pos.x, a.pos.z) + L * 2.5 + 4) return;
    const m = this.bonesNear(a.pos);
    if (!m) return;
    const left = this.bonesLeft(m.id);
    if (left <= 0.02) return;
    // A whole giant is worth roughly a tier to an adult; the eater's own mass sets the rate.
    const food = Math.min(left, dt * 0.055) * 240 * Math.pow(a.scale, 1.2) * m.scale;
    this.bonesMeat.set(m.id, Math.max(0, left - dt * 0.055));
    this.gainNutrition(a, undefined, food);
    if (a.controller === 'player' && this.rng() < dt * 3) this.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: 0.35, player: a.player });
  }

  /** Bones restock slowly, so a stripped one is worth coming back to rather than dead forever. */
  private restockBones(dt: number) {
    for (const [id, left] of this.bonesMeat) if (left < 1) this.bonesMeat.set(id, Math.min(1, left + dt / 210));
  }

  /**
   * The scoreboard for one viewport (hold View). Sorted by the thing the mode is about, so the
   * top line is whoever is winning it: catch in Hunter & Hunted, size everywhere else.
   */
  scoreboard(viewer: number): { header: ScoreHeader; rows: ScoreRow[] } {
    const me = this.players[viewer];
    const contenders = this.actors.filter((a) => a.controller === 'player' || a.controller === 'bot');
    const rows: ScoreRow[] = contenders.map((a) => {
      const era = RULES?.scoreLine?.(this, a);
      return {
        player: a.player, creature: a.creature, name: creature(a.creature).name,
        rank: era?.rank ?? TIER_NAMES[a.tier], tier: a.tier,
        progress: era?.progress ?? (a.tier >= 4 ? 1 : clamp(a.nutrition / TIER_NEED[a.tier], 0, 1)),
        kills: a.kills, eats: a.eats, escapes: a.escapes,
        deaths: a.player >= 0 ? (this.progress[a.player]?.deaths ?? 0) : 0,
        alive: isAlive(a),
        biome: BIOME_NAMES[biomeAt(a.pos.x, a.pos.z)],
        distance: me && a !== me ? distXZ(me.pos, a.pos) : 0,
        score: this.mode === 'hunted' && a.player >= 0 ? (this.huntScore[a.player] ?? 0) : undefined,
        hunting: this.isHunter(a.player) || undefined,
      };
    });
    const by = this.mode === 'hunted'
      ? (r: ScoreRow) => (r.score ?? -1)
      : (r: ScoreRow) => r.tier + r.progress;
    rows.sort((x, y) => by(y) - by(x));
    return { header: this.scoreHeader(), rows };
  }

  private scoreHeader(): ScoreHeader {
    switch (this.mode) {
      case 'hunted': {
        const giant = this.hunterIndex >= 0 ? this.players[this.hunterIndex] : undefined;
        return {
          title: `Turn ${Math.min(this.huntTurn + 1, this.huntTurns)} of ${this.huntTurns}`,
          detail: giant ? `Player ${this.hunterIndex + 1} is hunting · most caught wins` : 'Changing over…',
          clock: this.huntBreakT > 0 ? this.huntBreakT : this.huntTurnLeft(),
        };
      }
      case 'rise': {
        // Nobody left with a clock running — everyone here carried a finished run in — reads the
        // same as carrying on after a win, because that is exactly what it is.
        const chasing = this.players.filter((p) => !p.carriedTop);
        if (this.endless || !chasing.length) return { title: 'Rise', detail: 'The reef is yours. Swim on.' };
        const held = Math.max(0, ...this.players.map((p, i) => (p.carriedTop ? 0 : this.progress[i].apexT)));
        return { title: 'Rise', detail: held > 0 ? `Apex held ${Math.floor(held)} s of 90` : 'Reach Apex and hold it for ninety seconds' };
      }
      case 'reef': return { title: 'Reef', detail: 'No goal. Just the sea.' };
      default: return { title: ACTIVE_ERA.modes.find((m) => m.id === this.mode)?.name ?? this.mode, detail: '' };
    }
  }

  /** Where this player could teleport right now. */
  teleportOptions(i: number): TeleportOption[] {
    const p = this.players[i]; if (!p) return [];
    const out: TeleportOption[] = [{ dest: 'home', label: 'Your nursery', detail: 'Back to where you hatched', distance: distXZ(p.pos, p.home) }];
    this.players.forEach((o, j) => {
      if (j === i) return;
      out.push({ dest: j, label: `Player ${j + 1} · ${creature(o.creature).name}`, detail: isAlive(o) ? TIER_NAMES[o.tier] : 'respawning', distance: distXZ(p.pos, o.pos) });
    });
    return out;
  }

  /**
   * Every creature this player could change into, in roster order, starting on the one they are.
   *
   * A creature they have worn before comes back at the mark it was left on; anything new starts at
   * whichever end of the ladder they asked for. Nothing is filtered out — the point is to be able
   * to raise the whole roster in one session if that is what you want to do.
   */
  swapOptions(i: number, grown: boolean): SwapOption[] {
    const p = this.players[i]; if (!p) return [];
    const mine = this.kept[i] ?? new Map<CreatureId, KeptBody>();
    const order = [...PLAYABLE_IDS];
    const at = order.indexOf(p.creature);
    // Start the cycle on the body they are in, so left and right walk away from where they are.
    const cycle = at >= 0 ? [...order.slice(at), ...order.slice(0, at)] : order;
    return cycle.map((id) => {
      const current = id === p.creature;
      const kept = mine.get(id);
      const mark = current ? ladderMark(this, p) : kept ? kept.mark : grown ? LADDER_TOP : 0;
      return { id, name: creature(id).name, mark, kept: current || !!kept, current };
    });
  }

  /**
   * Change a player's body for another creature's, without moving them or restarting anything.
   *
   * The body they leave is written down at the size and mark it had, and the one they take up is
   * either handed back exactly as they left it or hatched fresh — grown or newborn, as asked. The
   * animal is the only thing that changes: the sea, the hour, the mode's clock and everything
   * anyone else has grown carry straight on.
   */
  changeCreature(i: number, id: CreatureId, grown: boolean): boolean {
    const a = this.players[i];
    if (!a || !isAlive(a) || (a.state !== 'free' && a.state !== 'guard') || a.teleportCd > 0 || a.grabbedBy >= 0) return false;
    if (!PLAYABLE_IDS.includes(id)) return false;
    const mine = this.kept[i] ?? (this.kept[i] = new Map());
    if (id !== a.creature) mine.set(a.creature, { scale: a.scale, mark: ladderMark(this, a) });
    const back = mine.get(id);
    const mark = back ? back.mark : grown ? LADDER_TOP : 0;
    const scale = back ? back.scale : ladderScale(id, mark);

    this.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 0 });
    // Nothing may keep hunting the body that just stopped existing.
    stopHiding(a); clearPursuit(a, this.actors);
    a.creature = id; a.scale = scale;
    applyScaleStats(a, false);
    a.tier = tierForScale(a.creature, a.scale);
    // The era resyncs whatever it keeps outside the actor before the meter is filled, or the fill
    // would be measured against the stage the *old* animal was on.
    RULES?.onSwap?.(this, a);
    ladderFill(this, a, fillOf(mark));
    a.state = 'free'; a.stateT = 0; a.move = undefined; a.hitDone.clear();
    a.combo = 0; a.comboT = 0; a.abilityCd = 0; a.abilityActive = false; a.emergenceHeavy = false;
    a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.grabbing = -1;
    a.vel = v3(); a.bank = 0; a.hitFlash = 0;
    a.spawnProtect = Math.max(a.spawnProtect, 2.5); a.teleportCd = 20;
    // The body it is drawn with changed, so the step it is interpolated from has to be this one.
    a.prevT = { x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, pitch: a.pitch, bank: a.bank };
    this.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 1 });
    this.flag(a, 'teleport');
    return true;
  }

  /**
   * Move a player home or alongside another player. The sea is endless, so this is how a party
   * regroups. Not while dead, mid-move or on cooldown; arrival comes with a few seconds of
   * protection and a burst of sparkles at both ends.
   */
  teleport(i: number, dest: TeleportDest): boolean {
    const a = this.players[i];
    if (!a || !isAlive(a) || (a.state !== 'free' && a.state !== 'guard') || a.teleportCd > 0 || a.grabbedBy >= 0) return false;
    let pos: Vec3, yaw: number;
    if (dest === 'home') { pos = this.spawnPoint(a.home, a.creature, a.scale, i); yaw = Math.PI; }
    else {
      const o = this.players[dest];
      if (!o || o === a) return false;
      const h = heading(o.yaw), L = lengthOf(o);
      pos = { x: o.pos.x - h.x * (L * 2 + 3), y: o.pos.y, z: o.pos.z - h.z * (L * 2 + 3) };
      yaw = o.yaw;
    }
    this.world.loadAround(pos);
    const g = groundHeight(this.world, pos.x, pos.z, this.scratchBoulders);
    pos.y = clamp(pos.y, g + clearanceOf(a) + 0.2, SURFACE_Y - 1 - clearanceOf(a));
    this.events.push({ kind: 'teleport', pos: { ...a.pos }, actor: a.id, player: i, strength: 0 });
    stopHiding(a); a.camoStrength = 0; a.emergenceHeavy = false; a.pos = pos; a.vel = v3(); a.yaw = yaw; a.pitch = 0; a.bank = 0; a.climbTo = -Infinity; a.climbPush = 0; this.clearRide(a);
    a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.aiming = false;
    a.spawnProtect = Math.max(a.spawnProtect, 2.5); a.teleportCd = 20; a.hitFlash = 0;
    this.events.push({ kind: 'teleport', pos: { ...pos }, actor: a.id, player: i, strength: 1 });
    this.flag(a, 'teleport');
    return true;
  }

  /**
   * Radar contacts for a player: the other players wherever they are, the nearest predator big
   * enough to be dangerous, anything actually hunting them however big it is, the nearest patch
   * worth eating, plus home, the shore and landmarks as bearings.
   *
   * The dial deliberately does not show every animal in reach. A reef holds dozens, and a small
   * creature is outsized by most of them, so listing them all turned the radar into noise exactly
   * when it mattered most — a hatchling's read as a solid ring of threats. One predator arrow and
   * one food patch is a decision; twenty of each is wallpaper. Same-size rivals (the `rival` band)
   * never show at all unless they are already coming for you.
   */
  radarFor(i: number, range: number): RadarBlip[] {
    const p = this.players[i]; if (!p) return [];
    const out: RadarBlip[] = [];
    // Only the other players carry off the edge of the dial: they are who you are trying to find.
    // Everything alive is a contact or nothing — a creature outside the reach is simply not there.
    this.players.forEach((o, j) => { if (j !== i) out.push({ kind: 'player', dx: o.pos.x - p.pos.x, dy: o.pos.y - p.pos.y, dz: o.pos.z - p.pos.z, distance: distXZ(o.pos, p.pos), id: j, hunting: false }); });
    // Anything on your tail is always shown; of the rest, only the closest one that could eat you.
    let nearest: RadarBlip | undefined;
    for (const a of this.actors) {
      if (a.controller === 'player' || !isAlive(a) || isHidden(a)) continue;
      const d = distXZ(a.pos, p.pos);
      if (d > range) continue;
      const hunting = !!a.brain && a.brain.target === p.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
      const band = bandOf(p, a);
      const dangerous = band === 'threat' || band === 'giant';
      if (!dangerous && !hunting) continue;
      const blip: RadarBlip = { kind: band === 'giant' ? 'giant' : 'threat', dx: a.pos.x - p.pos.x, dy: a.pos.y - p.pos.y, dz: a.pos.z - p.pos.z, distance: d, id: a.id, hunting };
      if (hunting) out.push(blip);
      else if (!nearest || d < nearest.distance) nearest = blip;
    }
    if (nearest) out.push(nearest);
    for (const f of this.foodClusters(p, range)) out.push(f);
    // Landmarks are the other thing the radar is for in an endless sea: with the shore and your
    // nursery they are the only fixed points in it. Only within reach — a bearing, not a map.
    for (const m of this.world.landmarks) {
      const d = distXZ(m.pos, p.pos);
      if (d < range * 1.4) out.push({ kind: 'landmark', dx: m.pos.x - p.pos.x, dy: 0, dz: m.pos.z - p.pos.z, distance: d, id: m.id, hunting: false });
    }
    // Held ground, as an area rather than a contact. Only patches big enough to matter to this
    // player and close enough to walk into: the point is to let them decide before they are in it.
    for (const o of this.nearby(p.pos, range * 1.6)) {
      const b = o.brain;
      if (!b?.territory || b.territoryR <= 0 || !isAlive(o) || o.id === p.id) continue;
      if (lengthOf(o) < lengthOf(p) * 0.55) continue;                    // nothing you could not simply eat
      const d = distXZ(b.territory, p.pos);
      if (d > range * 1.6 + b.territoryR) continue;
      out.push({ kind: 'territory', dx: b.territory.x - p.pos.x, dy: 0, dz: b.territory.z - p.pos.z, distance: d, id: o.id, hunting: false, radius: b.territoryR });
    }
    out.push({ kind: 'home', dx: p.home.x - p.pos.x, dy: 0, dz: p.home.z - p.pos.z, distance: distXZ(p.home, p.pos), id: -1, hunting: false });
    const sz = shoreZ(p.pos.x);
    out.push({ kind: 'shore', dx: 0, dy: 0, dz: sz - p.pos.z, distance: Math.abs(sz - p.pos.z), id: -1, hunting: false });
    return out;
  }

  /**
   * Note where the players have been. Biomes are credited to whoever is standing in one; a
   * landmark has to be swum up to, close enough that you have actually seen the thing.
   */
  private updateDiscovery() {
    for (const p of this.players) {
      if (!isAlive(p)) continue;
      this.discovery.biomes.add(biomeAt(p.pos.x, p.pos.z));
      for (const m of this.world.landmarks) if (distXZ(p.pos, m.pos) < m.radius + 14) this.discovery.landmarks.add(m.kind);
      // Ask the ladder rather than reading `tier`, so an era that owns its own growth records the
      // same way. The Devonian never advances `tier` — it moults through stages — so reading the
      // field directly meant no Devonian animal was ever credited with reaching the top.
      const rung = ladderRung(this, p);
      if (rung >= LADDER_TOP) this.discovery.apex.add(p.creature);
      // Rise only: the other modes hand you a body rather than growing you one, so their rung
      // says nothing about how far you got. Rung 0 is where everyone starts, so it is not a mark
      // worth keeping — recording it would put a row in every player's record that says nothing.
      //
      // The top rung is the exception: Rise asks you to reach it *and hold it*, so standing on it
      // banks the rung below with a half-full meter and nothing more. The top itself is written
      // by `bankLadderTop`, when the run is actually finished.
      // A victory lap banks nothing. Somebody who came in on the top rung is revisiting a run they
      // already finished, not making progress, and their record already says so.
      if (this.mode === 'rise' && !p.carriedTop) this.markLadder(p, rung >= LADDER_TOP ? MARK_NEAR_TOP : rung);
    }
  }

  /** Raise this creature's Rise record to `mark`, if it is worth more than what is already there. */
  private markLadder(p: Actor, mark: number) {
    if (mark > 0 && mark > (this.discovery.best.get(p.creature) ?? 0)) this.discovery.best.set(p.creature, mark);
  }

  /**
   * The Rise goal has been met by this player: bank the top of the ladder for their creature.
   *
   * This is the only door the top rung comes through, which is why both eras call it from their
   * own win check — the Cambrian holds Apex, the Devonian holds Prime, and neither is something
   * the shared code can see for itself.
   */
  bankLadderTop(p: Actor) {
    if (this.mode !== 'rise') return;
    this.discovery.best.set(p.creature, LADDER_TOP);
  }

  /**
   * The nearest shoal worth eating, as an area rather than a contact: wild snack and prey band
   * creatures within reach, bucketed into cells so a school reads as one patch of food instead of
   * a dozen dots, and only the closest patch is offered. Other players never appear here — hunting
   * one is a decision, not a suggestion.
   */
  private foodClusters(p: Actor, range: number, max = 1): RadarBlip[] {
    const CELL = 14;
    const cells = new Map<string, { dx: number; dy: number; dz: number; n: number; food: number; r: number }>();
    for (const a of this.nearby(p.pos, range)) {
      if (a.id === p.id || !isAlive(a) || isHidden(a)) continue;
      if (a.controller === 'player' || a.controller === 'bot') continue;
      const band = bandOf(p, a);
      if (band !== 'snack' && band !== 'prey') continue;
      const dx = a.pos.x - p.pos.x, dy = a.pos.y - p.pos.y, dz = a.pos.z - p.pos.z;
      // Reach is a sphere, not a column: a shoal a long way overhead is not food within reach of a
      // body on the floor, and showing it as a mark on the sand is how you send someone nowhere.
      if (Math.hypot(dx, dy, dz) > range) continue;
      const key = `${Math.floor(a.pos.x / CELL)},${Math.floor(a.pos.z / CELL)}`;
      const c = cells.get(key) ?? { dx: 0, dy: 0, dz: 0, n: 0, food: 0, r: 0 };
      c.dx += dx; c.dy += dy; c.dz += dz; c.n++; c.food += this.nutritionValue(p, a);
      cells.set(key, c);
    }
    const out: RadarBlip[] = [];
    for (const c of cells.values()) {
      c.dx /= c.n; c.dy /= c.n; c.dz /= c.n;
      // One lone snack is not a meal worth steering for; one prey-sized body is.
      if (c.n < 2 && c.food < 6) continue;
      c.r = Math.min(CELL, 3 + Math.sqrt(c.n) * 2.2);
      out.push({ kind: 'food', dx: c.dx, dy: c.dy, dz: c.dz, distance: Math.hypot(c.dx, c.dz), id: -1, hunting: false, radius: c.r, strength: c.food });
    }
    // Nearest by the swim it actually takes to get there, which includes the climb or the dive.
    return out.sort((a, b) => Math.hypot(a.distance, a.dy) - Math.hypot(b.distance, b.dy)).slice(0, max);
  }

  /**
   * The hour of the day, and how much the reef wants to hunt at it. The renderer lights the sea
   * from this and the HUD shows it, because a player who cannot see dusk coming cannot plan
   * around it.
   */
  dayPhase(): { phase: Phase; until: number; pressure: number } {
    return { phase: phaseAt(this.time), until: untilNextPhase(this.time), pressure: huntingPressure(this.time) };
  }

  /** The dominant biome under a player, for the HUD banner. */
  biomeOf(i: number): Biome | undefined { const p = this.players[i]; return p ? biomeAt(p.pos.x, p.pos.z) : undefined; }

  private updateModes(dt: number) {
    RULES?.updateModes(this, dt);
    switch (this.mode) {
      case 'rise': {
        this.players.forEach((p, i) => {
          const pr = this.progress[i];
          // Somebody who came in on the top rung has already done this; the clock is not theirs to
          // run. Everyone else in the same sea keeps theirs and can still win it.
          if (p.carriedTop) { pr.apexT = 0; return; }
          if (p.tier >= 4 && isAlive(p)) {
            pr.apexT += dt;
            if (pr.apexT > 90 && this.state.status === 'playing' && !this.endless) {
              this.bankLadderTop(p);
              this.state = { status: 'won', winner: i, message: `${creature(p.creature).name} rules the reef.` };
            }
          } else pr.apexT = 0;
        });
        break;
      }
      case 'hunted': {
        this.creditHunt();
        // Between turns nobody is the giant: everyone drifts while the hand-over is announced.
        if (this.huntBreakT > 0) {
          this.huntBreakT -= dt;
          if (this.huntBreakT <= 0) this.beginHuntTurn();
          break;
        }
        this.huntTurnT += dt;
        const smalls = this.actors.filter((a) => (a.controller === 'player' || a.controller === 'bot') && !this.isHunter(a.player));
        // The turn ends when its time is up, or early when every small one has grown out of reach.
        const grownUp = smalls.length > 0 && smalls.every((s) => s.tier >= 2);
        if (grownUp || this.huntTurnT >= HUNT_TURN) this.endHuntTurn(grownUp);
        break;
      }
    }
  }

  /**
   * Score the giant's catch as it happens. Every contender the giant kills on its turn is a
   * point — including one it has already eaten once, because a small one that keeps getting
   * caught is exactly what the score is measuring.
   */
  private creditHunt() {
    if (this.hunterIndex < 0) return;
    const giant = this.players[this.hunterIndex];
    if (!giant) return;
    for (const e of this.events) {
      if (e.kind !== 'kill' || e.actor !== giant.id || e.other == null) continue;
      const victim = this.idMap.get(e.other);
      if (!victim || (victim.controller !== 'player' && victim.controller !== 'bot')) continue;
      this.huntScore[this.hunterIndex] = (this.huntScore[this.hunterIndex] ?? 0) + 1;
    }
  }

  /** Seconds left in the current giant's turn, for the HUD. */
  huntTurnLeft() { return this.mode === 'hunted' ? Math.max(0, HUNT_TURN - this.huntTurnT) : 0; }

  /**
   * A turn is over. The giant's catch is already on the board (`huntScore`, credited as it
   * happened), so this only has to hand the role on — or, on the last turn, decide the match.
   */
  private endHuntTurn(grownUp: boolean) {
    const giant = this.players[this.hunterIndex];
    const caught = this.huntScore[this.hunterIndex] ?? 0;
    const name = giant ? creature(giant.creature).name : 'The giant';
    this.announce(grownUp
      ? `The small ones grew up. ${name} caught ${caught}.`
      : `Time. ${name} caught ${caught}.`);
    if (this.huntTurn + 1 >= this.huntTurns) { this.finishHunt(); return; }
    this.huntTurn++;
    // Nobody is the giant during the pause. The old one keeps its body until the changeover —
    // popping it down a tier mid-sentence reads as a glitch — but everyone is made invulnerable
    // for the whole break, so nothing it does in those seconds can count.
    this.hunterIndex = -1;
    this.huntBreakT = HUNT_BREAK;
    for (const p of this.players) if (isAlive(p)) { p.state = 'free'; p.stateT = 0; p.spawnProtect = HUNT_BREAK + 2; }
  }

  /** Put everyone back where they belong for the next turn and hand the giant's body over. */
  private beginHuntTurn() {
    this.hunterIndex = this.huntTurn % Math.max(1, this.players.length);
    this.huntTurnT = 0;
    const nursery = nurseryAt(0);
    this.world.loadAround(nursery);
    const giant = this.players[this.hunterIndex];
    this.announce(`Turn ${this.huntTurn + 1} of ${this.huntTurns} — ${giant ? `Player ${this.hunterIndex + 1}` : 'nobody'} hunts.`);
    // Contenders are re-seated: the new giant at giant size, everybody else back to a juvenile in
    // a nursery. Scores stay; only the bodies are reset.
    for (const a of this.actors) {
      if (a.controller !== 'player' && a.controller !== 'bot') continue;
      const hunter = this.isHunter(a.player);
      a.tier = hunter ? 3 : 1;
      a.scale = RULES ? RULES.startScale('hunted', hunter ? 0 : 1, a.creature) : hunter ? 3.0 : tierScale(a.creature, 1);
      a.nutrition = 0;
      applyScaleStats(a, true);
      a.hp = a.hpMax; a.stamina = a.staminaMax; a.poise = a.poiseMax;
      a.pos = this.spawnPoint(nursery, a.creature, a.scale, Math.max(0, a.player) + (hunter ? 4 : 0));
      if (hunter) a.pos.z -= 70;                       // the giant starts out to sea, not on top of the nursery
      a.home = { ...nursery };
      a.vel = v3(); a.state = 'free'; a.stateT = 0; a.respawnT = 0; a.corpseT = 0; a.eaten = 0; a.reviveT = 0;
      stopHiding(a); a.camoStrength = 0; a.hideCd = 0; a.emergenceHeavy = false; a.abilityActive = false; a.abilityCd = 0;
      a.lockTarget = -1; a.hunted = 0; a.hunterId = -1; a.wasHunted = false; a.swallowedBy = -1;
      a.bank = 0; a.pitch = 0; a.yaw = Math.PI; a.spawnProtect = 3.5; a.hitFlash = 0;
      this.events.push({ kind: 'moult', pos: { ...a.pos }, actor: a.id, player: a.player, strength: 0.6 });
    }
  }

  /** Every turn played: the best hunter takes it. */
  private finishHunt() {
    let best = -1, bestScore = -1, tied = false;
    this.huntScore.forEach((n, i) => {
      if (n > bestScore) { bestScore = n; best = i; tied = false; }
      else if (n === bestScore) tied = true;
    });
    const line = this.huntScore.map((n, i) => `P${i + 1} ${n}`).join(' · ');
    if (bestScore <= 0) this.state = { status: 'lost', winner: -2, message: `Nobody caught anything. ${line}` };
    else if (tied) this.state = { status: 'won', winner: -2, message: `A tie at ${bestScore}. ${line}` };
    else this.state = { status: 'won', winner: best, message: `Player ${best + 1} hunted best: ${bestScore} caught. ${line}` };
  }

  /** A short line in every player's viewport. */
  private announce(text: string, t = 3.5) {
    for (const pr of this.progress) pr.prompts.push({ text, t });
  }

  /**
   * What this player has hold of, for the HUD.
   *
   * A grip was the one thing the game did that it never said it was doing. A recording of a player
   * trying to grab a giant showed the grip closing three times, carrying them for thirteen seconds
   * between them — and the player reporting, in good faith, that grabbing did not work. Nothing on
   * the screen changed when the grip closed, nothing named the button that bites what you are
   * clinging to, and nothing said a mouthful had struggled out and the button had to come up before
   * the grip would close again. All of that is knowable; none of it was shown. So the simulation
   * says it, here, where the struggle clock and the spent flag already live, rather than leaving
   * the HUD to guess at them.
   */
  gripFor(i: number): GripHud | undefined {
    const p = this.players[i];
    if (!p || !isAlive(p)) return undefined;
    if (p.rideHost >= 0) {
      const host = this.idMap.get(p.rideHost);
      if (!host) return undefined;
      const name = creature(host.creature).name, band = bandOf(p, host);
      // Inside the strike window there is something running down and it matters: let go now and it
      // is a blow. Once it has passed, nothing is running — the ride lasts as long as the player
      // wants it to — so there is no bar, because a bar there would be a promise the grip does not
      // make.
      const held = p.gripSyncT;
      if (held >= 0 && held <= GRIP_STRIKE) {
        return { kind: 'ride', name, band, release: 'strike', left: clamp(1 - held / GRIP_STRIKE, 0, 1) };
      }
      return { kind: 'ride', name, band, release: 'nothing' };
    }
    if (p.state === 'grabbing' && p.grabbing >= 0) {
      const v = this.idMap.get(p.grabbing);
      if (!v) return undefined;
      const band = bandOf(p, v);
      // A mouthful is eaten when the button comes up, and until then it is only held — the crush
      // went with everything else that hurt what a grip had hold of. What the bar counts is the
      // window in which it is still a meal: carry it around past `GRIP_MEAL` and it gets away.
      const held = p.gripSyncT;
      const inTime = held >= 0 && held < GRIP_MEAL;
      // Two windows, one after the other: while it is still a meal the bar counts that down, and
      // after it the bar counts what is left before the animal works itself out on its own.
      return {
        kind: 'hold', name: creature(v.creature).name, band,
        release: inTime || held < 0 ? 'eat' : 'escape',
        left: held < 0 ? 1
          : inTime ? clamp(1 - held / GRIP_MEAL, 0, 1)
          : clamp(1 - (held - GRIP_MEAL) / (GRIP_BREAK - GRIP_MEAL), 0, 1),
      };
    }
    // Being held is the other half of a grip, and the half nobody was told anything about. A player
    // in something's jaws could see their own health going and no way out of it; there is a way out
    // of it, and it is one button.
    if (p.state === 'grabbed' && p.grabbedBy >= 0) {
      const by = this.idMap.get(p.grabbedBy);
      if (by) return { kind: 'held', name: creature(by.creature).name, band: bandOf(p, by), release: 'nothing', left: clamp(p.grabT / 1.6, 0, 1) };
    }
    // The arms have given out and the button is still down. Two and a half seconds of pressing
    // harder and nothing happening reads as a broken mechanic; one line saying so reads as a rule.
    if (p.graspSpent && p.graspHold) return { kind: 'spent', name: '', band: 'rival', release: 'nothing' };
    return undefined;
  }

  /** The line to show this player right now, if any. Prompts expire; the newest wins. */
  noticeFor(i: number): string | undefined {
    const pr = this.progress[i];
    return pr && pr.prompts.length ? pr.prompts[pr.prompts.length - 1].text : undefined;
  }

  private stepPrompts(dt: number) {
    for (const pr of this.progress) {
      for (const p of pr.prompts) p.t -= dt;
      if (pr.prompts.some((p) => p.t <= 0)) pr.prompts = pr.prompts.filter((p) => p.t > 0);
    }
  }

  private flag(a: Actor, f: string) {
    if (a.controller !== 'player') return;
    const pr = this.progress[a.player];
    if (!pr || pr.flags.has(f)) return;
    pr.flags.add(f);
  }

  /**
   * Onboarding: returns the current hint for a player, if any.
   *
   * Hints name actions, not buttons: `{heavy}`, `{dash}`, `{sense}`. The simulation has no idea
   * what anyone is holding and must not — the HUD fills them in for that player's own device
   * (`fillControls` in `src/shared/controls.ts`).
   */
  hintFor(i: number): string | undefined {
    const p = this.players[i]; const pr = this.progress[i];
    if (!p || !pr || this.mode === 'reef') return undefined;
    if (RULES) return RULES.hint(this, i);
    const f = pr.flags;
    if (!isAlive(p)) return undefined;
    if (p.hunted >= 0.5) return p.cover > 0.3 ? (len3(p.vel) < 0.3 ? 'Hold still. It is losing you.' : 'You are in cover. Now hold still.') : 'It is coming for you. Get under the sponges, then hold still.';
    if (p.hunted > 0.2) return p.cover > 0.3 ? 'It is looking your way. Stay in cover and freeze.' : 'Something big is looking your way. Stop moving or slip into cover.';
    if (!f.has('moved')) return '{swim} to swim.';
    if (!f.has('burst')) return 'Hold {sprint} to sprint. Catch the school.';
    if (!f.has('ate')) return 'Swim through the small fry to eat them.';
    if (!f.has('sense') && this.time > 20) return 'Tap {sense}: the sense pulse shows what is near.';
    if (p.tier === 0 && !f.has('tier')) return 'Eat. Grow. The ring fills toward your next moult.';
    if (p.tier >= 1 && !f.has('light')) return '{light} bites. {heavy} pounces. Hunt something your own size.';
    if (p.tier >= 1 && !f.has('dodge')) return '{dash} while you are moving dashes clear of a bite. {sprint} sprints.';
    if (p.tier >= 1 && !f.has('guard') && creature(p.creature).canGuard) return 'Hold {guard} to guard. Tap it as a hit lands to parry.';
    if (!f.has('ability')) return '{ability}: hide. Burrowers bury for free; camouflage copies nearby colours and uses stamina.';
    if (!f.has('lock') && this.time > 30) return 'Hold {aim} to aim at prey. When the crosshair fills, {heavy} pounces.';
    // Graspers have a second way to use the same buttons, and nothing else in the game teaches it.
    if (creature(p.creature).grasp && p.tier >= 1 && !f.has('ride')) return 'Hold {heavy} and you take hold — it costs nothing and hurts nothing. Let go of prey to eat it; hold on to anything your own size or bigger and ride it, then {light} to bite.';
    if (!f.has('teleport') && this.time > 60 && (this.players.length > 1 || distXZ(p.pos, p.home) > 150)) return '{teleport}: teleport home, or to another player.';
    return undefined;
  }
}

export { biomeAt };
