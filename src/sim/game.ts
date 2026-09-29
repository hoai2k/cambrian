import { ACTIVE_ERA } from '../content';
import { RULES } from './era-rules';
import { HEAVY_SPECIALS } from './concealment';
import { heavyStrikeReach } from './expansion-abilities';
import { clamp, dist, distXZ, heading, makeRng, TAU, type Rng, type Vec3 } from '../shared/math';
import { bodyRadius, isAlive, isHidden, lengthOf, makeActor, massOf } from './actors';
import { think, type AiWorld } from './ai';
import { huntingPressure, phaseAt, untilNextPhase, type Phase } from './daynight';
import { kill, type HitContext } from './combat';
import { creature, isVisitor, type CreatureDef, type CreatureId, type MoveDef } from './creatures';
import { stepFlora, type FloraContact } from './flora';
import { SpatialHash } from './spatial';
import { clampMark, fillOf, ladderFill, ladderRung, ladderScale, LADDER_TOP } from './ladder';
import { emptyInput, type Actor, type Band, type InputFrame, type Mode, type PlayerSetup, type Prompt, type SiltCloud, type WorldEvent } from './types';
import { biomeAt, coverAt, groundHeight, type Landmark, type LandmarkKind, nurseryAt, type StaticContact, SURFACE_Y, World, type Biome, type Boulder, type Cover, type Flora, type WorldData } from './world';
import { punting } from './locomotion';
import { ashoreInput, type BeachContext } from './beach';
import { TEXT } from '../shared/text';
import { hitSeconds, HUNGER_DRAIN, STARVE_TIME, SURVIVAL_TOP_SECONDS } from './survival';
import { updateActor } from './game-actor';
import { attackHits, canEat, checkTierUp, gainNutrition, gainSurvivalXp, nutritionValue } from './game-feeding';
import { graspReason, gripFor } from './game-grip';
import { beginHatch, respawn, revivable, reviveProgress, reviveWindow, skipHatch, updateCorpse, updateSwallowed } from './game-life';
import { pounceRange, startDodge } from './game-moves';
import { bonesLeft, bonesNear, populate, restockBones, updatePopulation } from './game-population';
import { bankLadderTop, changeCreature, continueMatch, teleport, updateDiscovery, updateModes } from './game-progress';
import { updateEyes, withinSight, type Eye } from './sight';
import { biomeOf, hintFor, noticeFor, radarFor, scoreboard, swapOptions, teleportOptions } from './game-readouts';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;
export { APEX_HOLD_SECONDS } from './ladder';

export interface PlayerProgress {
  prompts: Prompt[];
  flags: Set<string>;
  deaths: number;
  apexT: number;
  /**
   * The creatures this *seat* has already taken to Apex in this match, so a win is per player and
   * per animal rather than per match. It used to be one latch on the whole game (`endless`), and
   * that latch is why a second seat could never finish and why a player who carried on and grew a
   * second animal to the top was never told. A seat standing at Apex on an animal already in here
   * simply goes on swimming.
   */
  apexDone: CreatureId[];
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
   * The furthest rung of the growth ladder each creature has been taken to in Rise or Survival
   * (see src/sim/ladder.ts). These modes grow the player, so their shared
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
 * One line on the scoreboard (hold View). Every player, with what they have done and where they are.
 */
export interface ScoreRow {
  /** Player index. */
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
}

/** The heading above the scoreboard: what this mode is asking of everyone. */
export interface ScoreHeader { title: string; detail: string; }

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
export interface KeptBody { scale: number; mark: number }
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

export const { schools: SNACK_SCHOOLS, giants: GIANTS } = ACTIVE_ERA.ecology;

                 // seconds a single bite takes to chew
const MAX_BITES = 12;
export const bitesFor = (eater: Actor, food: Actor) => clamp(Math.ceil(3 * lengthOf(food) / Math.max(lengthOf(eater), 1e-3)), 1, MAX_BITES);

// Crawlers off the seabed. Up there they swim: they go where they are aimed, sprint and dash like
// anything else, and hold their own depth for as long as they are working at it. What separates a
// walker from a swimmer is the two ends of that — height costs stamina (more than they regenerate,
// so open water stays a crossing rather than a second way to live), and a body that stops asking
// for anything settles back to the bottom, where it belongs.
/** A leap out of the water: the pull back down, and the least upward speed that gets a fish through the surface. */
/**
 * A dash lasts as long as it is held, between these.
 *
 * A tap is a short shove and a held button is the full crossing, with the stamina to match — the
 * dash used to be one length whatever the press was, so the only way to move a little was to move
 * a lot. `DASH_TAP` is the shortest a dash can be (a press is a commitment: it cannot be taken back
 * inside its own first moments, which is also what keeps the invulnerability honest), and the full
 * length is the `stateDur` the move already had. Letting go between them cuts the travel — the body
 * is pulled up out of the burst — and refunds the part of the cost that was not spent, so a tap is
 * cheap and a crossing is not.
 */
export const DASH_TAP = 0.12;
/** How long a dash lasts, and its cooldown; a tail-flip (the caridoid escape) runs longer and rests longer. */
export const DASH_TIME = 0.42, DASH_COOLDOWN = 0.55;
export const FLIP_TIME = 0.5, FLIP_COOLDOWN = 0.7;
/** How much harder a `darter`'s dash and dodge launch (Waptia). */
export const DARTER_DASH = 1.2, DARTER_DODGE = 1.25;
/** A dash's launch speed (a tail-flip has its own, `flipLaunch`): the body's size, a darter's extra, and a punt's floor. */
export const dashLaunch = (a: Actor, def: CreatureDef, L: number, gap: number) => (L * 9.5 + 7) * (def.darter ? DARTER_DASH : 1) * punting(a, gap);
export const BREACH_GRAVITY = 14;
/**
 * How high, in body lengths, a breach may carry a body above the waterline.
 *
 * The vertical a body left the water with used to be whatever it had, and a dash's launch speed is
 * `L * 9.5 + 7` — so a five-unit animal that dashed straight up cleared a hundred units of air and
 * a Cymbospondylus over a thousand. A breaching animal leaps about its own length, which is the
 * figure this is set near; the *horizontal* is deliberately untouched, so a fast run still carries
 * you a long way forward through the air, which is the part that is fun.
 */
const BREACH_LEAP = 1.25;
/** The most vertical speed a body of this length may take through the surface. */
export const breachSpeed = (L: number) => Math.sqrt(2 * BREACH_GRAVITY * BREACH_LEAP * Math.max(0.3, L));
    // fraction of the crawler's cruise while off the floor: a swim, if a laboured one
     // climb speed, units/s at scale 1 (a swimmer's rise is RISE_RATE, and far faster)
     // terminal sink once the body stops asking to go anywhere — a settle, not a fall

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
export const CHARGE_STAMINA = 8;
/** How far down its own body a grabber's grip sits, in body lengths: the mouth end, as the bite uses. */
export const GRASP_AT = 0.42;
/**
 * How far an animal can reach to take hold, in its own body lengths, measured to the far body's
 * surface. An animal built to grasp closes arms and gets the longer reach; everything else has
 * only its jaws, so its grip is its bite's reach — every creature can take hold of something, and
 * the ones with claws for it find it easier, which is what `grasp` is for.
 */
const GRASP_REACH = 0.85, BITE_GRASP_REACH = 0.45;
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
export const gripReach = (def: CreatureDef, L: number) => L * (def.grasp ? GRASP_REACH : BITE_GRASP_REACH);
export const gripHold = (def: CreatureDef) => (def.grasp ? GRASP_HOLD : BITE_GRASP_HOLD);
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
/** What a frame's reach for a grip came to: nothing there, still closing, or closed. */
export type GraspResult = 'none' | 'closing' | 'took';

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
/** Seconds of that window spent fading out at the end of it. */
export const DEATH_FADE = 1.2;

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
export interface Step {
  def: CreatureDef;
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
/**
 * Where in that performance the seam gives, and with it the body: the player has their animal back
 * the moment the shell cracks, not when the halves have finished falling away. Waiting for the
 * shell to settle held them still through two and a half seconds of an animation whose point they
 * had already taken. `src/render/eggs.ts` starts the split here, so the two cannot drift.
 */
export const HATCH_FREE = 0.48;
/**
 * How long the simulation holds a hatchling: up to the crack and no further. The shell goes on
 * falling open behind the animal on the renderer's own clock, which is why that is the only clock
 * that runs the full `HATCH_TIME`.
 */
export const HATCH_HOLD = HATCH_TIME * HATCH_FREE;

export class Game implements AiWorld {
  world: WorldData;
  actors: Actor[] = [];
  idMap = new Map<number, Actor>();
  hash = new SpatialHash<Actor>(10);
  /** Scratch for `resolveStatic` / `resolveFlora`: what the last body pushed out of the scenery ran into. */
  contact: StaticContact = { hit: false, climbTo: -Infinity, wallTop: -Infinity };
  floraContact: FloraContact = { blocked: false, headOn: false, top: -Infinity };
  events: WorldEvent[] = [];
  silt: SiltCloud[] = [];
  time = 0;
  rng: Rng;
  nextId = 1;
  mode: Mode;
  players: Actor[] = [];
  /** Every seat's camera as the simulation can know it, for what is out of sight (src/sim/sight.ts). */
  private eyes: Eye[] = [];
  private byIdFn = (id: number) => this.idMap.get(id);
  /**
   * Every creature each player has worn this match, and how far it had grown when they left it.
   *
   * Changing body is not a restart: the animal you put down keeps its size and its meter, and is
   * exactly where you left it when you pick it up again. That is what lets one session raise
   * several creatures instead of one — the sea is the same sea, and the growing is per animal.
   */
  kept: Map<CreatureId, KeptBody>[] = [];
  progress: PlayerProgress[] = [];
  state: GameState = { status: 'playing', winner: -1, message: '' };
  /**
   * Set once a finished co-op match is carried on past its goal (`continueMatch`). The mode's win
   * check never fires again, so the sea stays open; nothing else about the match is touched.
   */
  endless = false;
  readonly discovery: Discovery = { biomes: new Set(), landmarks: new Set(), apex: new Set(), best: new Map() };
  private scratchActors: Actor[] = [];
  scratchBoulders: Boulder[] = [];
  /** Last grip decision per player, for the match recorder. Written only for players; never read by the sim. */
  graspReasons = new Map<number, string>();
  scratchCover: Cover[] = [];
  /** Where each hatching body's egg was laid: it is held there until the shell gives. */
  eggAt = new Map<number, Vec3>();
  scratchFlora: Flora[] = [];
  ambientTimer = 0;
  /**
   * How much is left on each `bones` landmark, 0..1 by landmark id. A dead giant is the biggest
   * meal in the sea and it does not last: it feeds whoever finds it, runs out, and slowly becomes
   * worth visiting again as the deep delivers another body to the same spot.
   *
   * Not to be confused with `render/carcass.ts`, which cuts an eaten body out of its own model.
   * This is the standing skeleton the world generator places, not a creature that just died.
   */
  bonesMeat = new Map<number, number>();
  private stepIndex = 0;
  schoolCount = 0;
  hitCtx: HitContext;
  beachCtx: BeachContext;
  setups: PlayerSetup[];

  constructor(mode: Mode, setups: PlayerSetup[], seed = 5052026) {
    this.mode = mode;
    this.setups = setups;
    this.rng = makeRng(seed ^ 0x9e37);
    // Everyone hatches in the origin nursery, just off the shore: the one fixed point in an endless sea.
    this.world = new World(seed);
    const nursery = nurseryAt(0);
    this.world.loadAround(nursery);
    this.hitCtx = { events: this.events, byId: (id) => this.idMap.get(id), time: 0, rng: this.rng, armour: RULES.armour ? (att, vic, dir) => RULES.armour!(att, vic, dir) : undefined, shield: RULES.shield ? (att, vic) => RULES.shield!(this, att, vic) : undefined, canEat: (pred, food) => canEat(this, pred, food) };
    this.beachCtx = { events: this.events, hitCtx: this.hitCtx };
    const hatchers: Actor[] = [];
    setups.forEach((s, i) => {
      // Rise can start you part-grown, at the furthest rung you have taken this creature to before.
      // Both eras derive everything else from the body scale — the Cambrian's tier through
      // `tierForScale`, the Devonian's stage through `stageForScale` — so one number does it.
      const carry = mode === 'rise' || mode === 'survival' ? clampMark(s.startRung ?? 0) : 0;
      // A visitor arrives at the size it finishes its own game at, whatever this one's ladder or
      // mode would have said. That is the reward, and it is deliberately not balanced.
      const startScale = s.visitorScale ?? (carry > 0 ? ladderScale(s.creature, carry)
        : RULES.startScale(mode === 'survival' ? 'rise' : mode, s.creature));
      const a = this.spawn(s.creature, 'player', this.spawnPoint(nursery, s.creature, startScale, i), startScale, i);
      // Arriving on the top rung means the goal is already behind you: no clock, just the sea.
      a.carriedTop = carry >= LADDER_TOP;
      a.home = { ...nursery };
      a.yaw = Math.PI;                                   // facing out to sea
      this.players.push(a);
      this.kept.push(new Map());
      this.progress.push({ prompts: [], flags: new Set(), deaths: 0, apexT: 0, apexDone: [], message: '' });
      // Carrying a creature on part-grown skips the egg: that animal has already been through this.
      // So does a visitor, which did its growing up in another sea.
      if (carry === 0 && !s.visitorScale) hatchers.push(a);
    });
    populate(this);
    RULES.init?.(this);
    // A run that starts on the bottom rung starts in an egg, the same as every hatch after it.
    // After the era's init, because the rung a body stands on is the era's own bookkeeping and
    // does not read right until that has run — before it, every Devonian player looked like a
    // hatchling and a grown one was buried in an egg on the seabed.
    for (const a of hatchers) if (ladderRung(this, a) === 0) beginHatch(this, a);
    // Last, because an era's init sets its own growth state from the body it finds: a mark that
    // carries a part-filled meter has to be applied on top of that, not before it.
    setups.forEach((s, i) => {
      const fill = mode === 'rise' || mode === 'survival' ? fillOf(s.startRung ?? 0) : 0;
      if (fill > 0) ladderFill(this, this.players[i], fill);
    });
  }

  /** The points the world streams around and the ecosystem is kept alive near: every player. */
  anchors(): Vec3[] {
    const out: Vec3[] = [];
    for (const a of this.actors) if (a.controller === 'player') out.push(a.pos);
    if (!out.length) out.push(nurseryAt(0));
    return out;
  }
  randomAnchor() { const an = this.anchors(); return an[Math.floor(this.rng() * an.length)]; }
  /** Distance from the closest player. */
  anchorDistance(p: Vec3) { let d = Infinity; for (const a of this.anchors()) d = Math.min(d, distXZ(a, p)); return d; }

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

  /**
   * Water deep enough to hold a body of this length, starting from `center` and going out.
   *
   * A visitor is the size it finishes its *own* game at, which in this one can be far bigger than
   * anything the sea was built for — a Prime Dunkleosteus is longer than the Cambrian's shallows
   * are deep. That is the point of visitors and is not a thing to balance away, but a body that
   * hatches into a seabed it does not fit in is stuck rather than impressive, so the one rule they
   * get is this: go out until there is room. Distance from shore is what buys depth in every era
   * (see `depthProfile`), so the search walks outward along that axis and gives up on the deepest
   * thing it found rather than on nothing.
   */
  private deepEnoughFor(center: Vec3, L: number): Vec3 {
    const want = L * 1.35 + 6;                                  // room to swim, not just to fit
    let best = center, bestRoom = -Infinity;
    for (let step = 0; step <= 24; step++) {
      const out = step * 90;
      const ang = this.rng() * TAU, jitter = this.rng() * 40;
      const x = center.x + Math.cos(ang) * jitter;
      const z = center.z - out - jitter;                        // away from the beach
      const room = SURFACE_Y - groundHeight(this.world, x, z, this.scratchBoulders);
      if (room > bestRoom) { bestRoom = room; best = { x, y: 0, z }; }
      if (room >= want) return best;
    }
    return best;
  }

  spawnPoint(center: Vec3, c: CreatureId, s: number, index = 0): Vec3 {
    // A visitor is placed by how much water it needs, before anything else gets a say: an era's
    // own placement looks for cover to hide a hatchling in, and there is no cover in this sea big
    // enough to mean anything to a body this size.
    const vdef = creature(c);
    if (isVisitor(c)) {
      const L = vdef.adultLength * s;
      const at = this.deepEnoughFor(center, L);
      this.world.loadAround(at);
      const g = groundHeight(this.world, at.x, at.z, this.scratchBoulders);
      return { x: at.x, y: Math.min(SURFACE_Y - 1.5 - L * 0.1, g + Math.max(1.2 + L * 0.5, (SURFACE_Y - g) * 0.45)), z: at.z };
    }
    const inCover = RULES.spawnPoint?.(this, center, c, s, index);
    if (inCover) return inCover;
    const def = creature(c);
    const ang = index * 1.7 + this.rng() * 0.8, d = 3 + this.rng() * 6;
    const x = center.x + Math.cos(ang) * d, z = center.z + Math.sin(ang) * d;
    const g = groundHeight(this.world, x, z, this.scratchBoulders);
    const L = def.adultLength * s;
    return { x, y: RULES.spawnY?.(g, L, !!def.ground) ?? (def.ground ? g + L * 0.13 : g + 1.2 + L * 0.5), z };
  }

  spawn(c: CreatureId, controller: Actor['controller'], pos: Vec3, scale: number, player = -1): Actor {
    const a = makeActor(this.nextId++, c, controller, pos, scale, player);
    if (controller === 'player' && RULES.spawnProtect) a.spawnProtect = RULES.spawnProtect(a);   // an era may shelter its hatchlings longer
    a.yaw = this.rng() * TAU; a.prevT.yaw = a.yaw;
    this.actors.push(a);
    this.idMap.set(a.id, a);
    return a;
  }

  /** A body leaves the world: for an era whose scripted animals come and go (the Triassic's shore). */
  despawn(a: Actor) { this.remove(a); }

  remove(a: Actor) {
    const i = this.actors.indexOf(a);
    if (i >= 0) this.actors.splice(i, 1);
    this.idMap.delete(a.id);
  }

  /** Cover (0..1) for an actor including temporary silt. Plants are queried every fourth step (staggered) since cover changes slowly. */
  coverFor(a: Actor): number {
    let c = ((a.id + this.stepIndex) & 3) === 0 || a.controller === 'player' ? coverAt(this.world, a.pos, lengthOf(a), this.scratchCover) : a.cover;
    for (const s of this.silt) if (dist(s.pos, a.pos) < s.radius) c = Math.max(c, 0.75);
    if (isHidden(a)) c = 1;
    return c;
  }

  /**
   * Carry a finished match on instead of ending it. Every mode is co-op, so its goal is a milestone
   * rather than a verdict: it has been met and recorded, and this puts the sea back the way it was
   * and stops the mode asking for it again, so the reef stays playable as a free swim. Returns
   * whether the match resumed (it refuses one that is still playing).
   */
  continueMatch(): boolean { return continueMatch(this); }

  /** Main fixed step. `inputs` maps player index → InputFrame. */
  step(dt: number, inputs: Map<number, InputFrame>) {
    if (this.state.status !== 'playing') return;
    this.time += dt; this.hitCtx.time = this.time;
    this.stepIndex++;
    // Snapshot every transform so the renderer can interpolate across this step.
    const eventStart = this.events.length;
    for (const a of this.actors) {
      const t = a.prevT;
      t.x = a.pos.x; t.y = a.pos.y; t.z = a.pos.z; t.yaw = a.yaw; t.pitch = a.pitch; t.bank = a.bank;
    }
    // The sea streams in around whoever is in it, a couple of chunks a step so nothing hitches.
    this.world.stream(this.anchors(), 2);
    this.hash.rebuild(this.actors);
    // Which school fish nobody could be looking at: they swim on without the collision only a
    // camera would notice (src/sim/sight.ts). Only schools — anything a player might meet, fight,
    // ride or be hunted by keeps every contact wherever it is.
    updateEyes(this.players, this.byIdFn, dt, this.eyes);
    for (const a of this.actors) a.unseen = a.controller === 'swarm' && !withinSight(this.players, this.eyes, a);

    for (const a of this.actors) {
      if (a.state === 'dead') { updateCorpse(this, a, dt); continue; }
      if (a.state === 'swallowed') { updateSwallowed(this, a, dt); continue; }
      // Nothing with a brain plans to be on the sand, so a body that is has one idea: the sea.
      const input = a.controller === 'player' ? (inputs.get(a.player) ?? emptyInput()) : ashoreInput(a, a.brain ? think(this, a, dt) : emptyInput());
      updateActor(this, a, input, dt);
    }
    if (this.mode === 'survival') {
      for (const a of this.actors) if ((a.controller === 'player') && isAlive(a)) {
        a.hunger = Math.max(0, a.hunger - dt * HUNGER_DRAIN);
        // An empty stomach eats the body rather than ending it on the frame the bar meets zero:
        // seconds of visibly going under, the way drowning is, and a meal in time stops it.
        if (a.hunger === 0) {
          a.hp -= (a.hpMax / STARVE_TIME) * dt;
          if (a.hp <= 0) { a.hp = 0; kill(this.hitCtx, a); continue; }
        }
        gainSurvivalXp(this, a, dt / SURVIVAL_TOP_SECONDS);
      }
      for (const e of this.events.slice(eventStart)) if (e.kind === 'hit' && e.other != null) {
        const attacker = this.idMap.get(e.actor), victim = this.idMap.get(e.other);
        if (!attacker || !victim || (attacker.controller !== 'player')) continue;
        const ratio = lengthOf(victim) / Math.max(lengthOf(attacker), 1e-3);
        const secs = hitSeconds(e.strength ?? 0, ratio, attacker.controller === 'player' && victim.controller === 'player');
        gainSurvivalXp(this, attacker, secs / SURVIVAL_TOP_SECONDS);
      }
    }
    this.resolveActorOverlap();
    stepFlora(this.world, dt);
    this.updateSilt(dt);
    updatePopulation(this, dt);
    restockBones(this, dt);
    this.stepPrompts(dt);
    updateDiscovery(this);
    RULES.step?.(this, dt);
    updateModes(this, dt);
    for (const a of this.actors) if (a.state === 'dead' && a.corpseT > 45 && a.controller !== 'player') this.remove(a);
    for (const a of this.actors) if (a.state === 'dead' && a.eaten >= 1 && a.controller !== 'player') this.remove(a);
  }

  /**
   * Whether this body is a downed team-mate rather than a corpse: co-op only, with at least one
   * other player alive to come and get them, and still lying where they fell (not in a mouth).
   */
  revivable(a: Actor): boolean { return revivable(this, a); }

  /** How far through the rescue dwell a downed player is, 0..1, for the HUD. */
  reviveProgress(a: Actor): number { return reviveProgress(this, a); }

  /** Seconds a downed player has left to be reached, or 0 when they are not revivable. */
  reviveWindow(a: Actor): number { return reviveWindow(this, a); }

  respawn(a: Actor) { return respawn(this, a); }

  /**
   * End any hatch in progress, as if the shell had already been left behind. Headless harnesses
   * that set up a situation and drive it use this: five seconds of egg at the top of every match
   * is the experience, not something each test wants to sit through.
   */
  skipHatch() { return skipHatch(this); }

  updateActor(a: Actor, input: InputFrame, dt: number) { return updateActor(this, a, input, dt); }

  startDodge(a: Actor, def: CreatureDef, dir: Vec3, mag: number, L: number, sf: number) { return startDodge(this, a, def, dir, mag, L, sf); }

  pounceRange(a: Actor) { return pounceRange(this, a); }

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
    if (a.emergenceHeavy) return { name: 'AMBUSH', reach: pounceRange(this, a), ready: true };
    // `bursting` costs `CHARGE_STAMINA` on top, and leaving it out of `ready` is how the prompt
    // came to promise a pounce the action would refuse — the exact window a player hunts in.
    const need = 12 + (a.state === 'dodge' || a.prev.burst ? CHARGE_STAMINA : 0);
    const pounce = { name: 'POUNCE', reach: pounceRange(this, a), ready: a.pounceCd === 0 && a.stamina >= need && a.exhausted === 0 };
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

  /** Why this player's grip did or did not close, last time the question was asked. */
  graspReason(id: number): string { return graspReason(this, id); }

  attackHits(a: Actor, m: MoveDef, L: number) { return attackHits(this, a, m, L); }

  /**
   * Whether a Survival body has room to eat. Any room at all: the meal tops the bar up to full and
   * the rest is left. It used to ask whether the *whole* meal fitted, and a kill half again your
   * own length is worth the full bar, so it could only be eaten at exactly zero hunger — which is
   * starving — and a peer-sized kill waited until you were half empty.
   */
  canEat(a: Actor, food: Actor): boolean { return canEat(this, a, food); }

  nutritionValue(eater: Actor, food: Actor) { return nutritionValue(this, eater, food); }

  gainNutrition(a: Actor, food: Actor | undefined, amount: number) { return gainNutrition(this, a, food, amount); }

  /** The Cambrian's moult: nutrition past this tier's need grows the body a tier. */
  checkTierUp(a: Actor) { return checkTierUp(this, a); }

  private resolveActorOverlap() {
    for (const a of this.actors) {
      if (!isAlive(a) || a.state === 'grabbed' || a.state === 'swallowed' || a.unseen) continue;
      const ra = bodyRadius(a);
      for (const o of this.hash.query(a.pos.x, a.pos.z, ra + 6, this.scratchActors)) {
        if (o.id <= a.id || !isAlive(o)) continue;
        if (o.state === 'grabbed' || o.state === 'swallowed' || o.unseen) continue;
        const min = ra + bodyRadius(o);
        const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y, dz = o.pos.z - a.pos.z;
        // Most pairs are well clear, and `Math.hypot` is slow: the margin is far wider than the few
        // ulps between it and the plain root, so this never turns away a pair it would have pushed.
        if (dx * dx + dy * dy + dz * dz > min * min * (1 + 1e-9)) continue;
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

  /**
   * The `bones` landmark whose ribcage `pos` is inside, if any. Cheap: there is at most one
   * landmark per 320-unit cell and only loaded chunks are in the list.
   */
  bonesNear(pos: Vec3, range = 0): Landmark | undefined { return bonesNear(this, pos, range); }

  /** How much of a skeleton is left to strip, 0..1. Unvisited ones are whole. */
  bonesLeft(id: number) { return bonesLeft(this, id); }

  /**
   * The scoreboard for one viewport (hold View). Sorted by the thing the mode is about, so the
   * top line is whoever is furthest up the ladder.
   */
  scoreboard(viewer: number): { header: ScoreHeader; rows: ScoreRow[] } { return scoreboard(this, viewer); }

  /** Where this player could teleport right now. */
  teleportOptions(i: number): TeleportOption[] { return teleportOptions(this, i); }

  /**
   * Every creature this player could change into, in roster order, starting on the one they are.
   *
   * A creature they have worn before comes back at the mark it was left on; anything new starts at
   * whichever end of the ladder they asked for. Nothing is filtered out — the point is to be able
   * to raise the whole roster in one session if that is what you want to do.
   */
  swapOptions(i: number, grown: boolean): SwapOption[] { return swapOptions(this, i, grown); }

  /**
   * Change a player's body for another creature's, without moving them or restarting anything.
   *
   * The body they leave is written down at the size and mark it had, and the one they take up is
   * either handed back exactly as they left it or hatched fresh — grown or newborn, as asked. The
   * animal is the only thing that changes: the sea, the hour, the mode's clock and everything
   * anyone else has grown carry straight on.
   */
  changeCreature(i: number, id: CreatureId, grown: boolean): boolean { return changeCreature(this, i, id, grown); }

  /**
   * Move a player home or alongside another player. The sea is endless, so this is how a party
   * regroups. Not while dead, mid-move or on cooldown; arrival comes with a few seconds of
   * protection and a burst of sparkles at both ends.
   */
  teleport(i: number, dest: TeleportDest): boolean { return teleport(this, i, dest); }

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
  radarFor(i: number, range: number): RadarBlip[] { return radarFor(this, i, range); }

  /**
   * The Rise goal has been met by this player: bank the top of the ladder for their creature.
   *
   * This is the only door the top rung comes through, which is why both eras call it from their
   * own win check — the Cambrian holds Apex, the Devonian holds Prime, and neither is something
   * the shared code can see for itself.
   */
  bankLadderTop(p: Actor) { return bankLadderTop(this, p); }

  /**
   * The hour of the day, and how much the reef wants to hunt at it. The renderer lights the sea
   * from this and the HUD shows it, because a player who cannot see dusk coming cannot plan
   * around it.
   */
  dayPhase(): { phase: Phase; until: number; pressure: number } {
    return { phase: phaseAt(this.time), until: untilNextPhase(this.time), pressure: huntingPressure(this.time) };
  }

  /** The dominant biome under a player, for the HUD banner. */
  biomeOf(i: number): Biome | undefined { return biomeOf(this, i); }

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
  gripFor(i: number): GripHud | undefined { return gripFor(this, i); }

  /** The line to show this player right now, if any. Prompts expire; the newest wins. */
  noticeFor(i: number): string | undefined { return noticeFor(this, i); }

  private stepPrompts(dt: number) {
    for (const pr of this.progress) {
      for (const p of pr.prompts) p.t -= dt;
      if (pr.prompts.some((p) => p.t <= 0)) pr.prompts = pr.prompts.filter((p) => p.t > 0);
    }
  }

  flag(a: Actor, f: string) {
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
  hintFor(i: number): string | undefined { return hintFor(this, i); }
}

export { biomeAt };
