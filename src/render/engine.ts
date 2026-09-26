import { ACTIVE_ERA } from '../content';
import { BURROWERS, hideLabel } from '../sim/concealment';
import * as THREE from 'three';
import { audio, SAMPLES } from '../audio/audio';
import { distanceAtten, hugeLength } from '../audio/mix';
import { applyMouse, emptyControls, gamepads, KeyboardInput, MousePlay, readGamepad, rumble, type RawControls } from '../input/input';
import { applyTouch, TouchPlay } from '../input/touch';
import { splitAxis } from '../shared/small-screen';
import type { Secondary } from '../shared/touch-play';
import { cursorFor, cursorState } from '../shared/cursors';
import { clamp, damp, TAU, wrapAngle } from '../shared/math';
import { bandOf, comingFor, floorClearance, isAlive, isHidden, lengthOf } from '../sim/actors';
import { creature, type CreatureId } from '../sim/creatures';
import { CORPSE_WINDOW, DEATH_FADE, Game, radarRange as radarReach, type GripHud, type ScoreHeader, type ScoreRow, type TeleportDest } from '../sim/game';
import type { Phase } from '../sim/daynight';
import { BAND_COLOR, CALM_MARK, emptyInput, isCoop, TIER_NAMES, TIER_NEED, type Actor, type Band, type InputFrame, type Mode, type PlayerSetup } from '../sim/types';
import { recordStep, recordingPhase } from '../app/debug-record';
import { BIOME_NAMES, biomeAt, coverAt, groundHeight, LAND_REACH, nurseryAt, sampleHeight, shoreDistance, SURFACE_Y, type Biome, type Boulder, type LandmarkKind } from '../sim/world';
import { amphibious, breathesAir, STRAND_BREATH, STRAND_LOW } from '../sim/beach';
import { AssetQueue, type AssetProgress } from './assets';
import { fillOf, ladderName } from '../sim/ladder';
import { CreatureView, ensureLoaded, loadedSync, type Lod } from './creature';
import { mobileDevonian } from '../shared/mobile-memory';
import { Edges } from '../shared/edges';
import { SAND_COLORS } from '../shared/environment-colors';
import { Attachments } from './attachments';
import { Bubbles, Impacts, laysMark, printableSand, Sand, sandThrow, Silt, Splash, trackGait, Tracks, type BurrowPhase } from './fx';
import { Eggs } from './eggs';
import { Mouthfuls } from './carcass';
import { createSea, type Quality, type SeaEnvironment } from './sea';
import { RULES, type EraHud } from '../sim/era-rules';
import { key as controlKey, schemeForDevice, type Scheme } from '../shared/controls';
import { TEXT } from '../shared/text';

export interface Rect { x: number; y: number; w: number; h: number; }
export interface PlayerHud {
  index: number; creature: CreatureId; color: string; alive: boolean;
  /** What this player is holding, so every prompt on their half of the screen names their buttons. */
  scheme: Scheme;
  hp: number; hpMax: number; hunger?: number; stamina: number; staminaMax: number; exhausted: boolean;
  tier: number; tierName: string; progress: number; scale: number;
  abilityName: string; abilityReady: number; abilityActive: boolean; abilityUnlocked: boolean;
  lock?: { name: string; kind?: string; band: Band; hp: number; color: string };
  aim?: {
    hasTarget: boolean; inRange: boolean; name?: string; color: string; ready: boolean;
    /** What RT does for this creature: POUNCE, or the special's own name. */ action: string;
    /**
     * Where to draw it, in normalised device coordinates (-1..1, y up), when that is not the middle
     * of the screen. Only touch sets it: the reticle belongs dead centre for a pad, because the
     * centre of the camera *is* the aim axis, and it belongs under the finger for a touch player,
     * because there the last tap is the aim axis (`cursorDir`). Absent means the middle, which is
     * what every other scheme means.
     */
    at?: { x: number; y: number };
  };
  /** Sense is on: the band glyphs and the radar are drawn. */
  senseOn: boolean;
  hunted: number; hunterAngle: number | null; hunterName?: string; hunterState: 'none' | 'noticed' | 'hunting'; inCover: boolean; still: boolean;
  /**
   * Out of the water, on the shore (src/sim/beach.ts). `strandLeft` is a water-breather's minute
   * out of the water, 1 down to 0, and is set only while it is ashore — the gauge is for the sand
   * and nowhere else; `strandLow` is the last of it. An air-breather ashore carries neither.
   */
  ashore: boolean; strandLeft?: number; strandLow?: boolean;
  hint?: string; respawnIn: number; fade: number; state: string; modelReady: boolean; kills: number; eats: number; escapes: number; protect: boolean;
  /**
   * Co-op: seconds left for a team-mate to reach this downed player, and the downed team-mates
   * this player could go and pick up (with the direction to swim, in radar space).
   */
  downedFor: number;
  /** 0..1 of the rescue dwell, for the downed player and for whoever is standing over them. */
  reviveProgress: number;
  downedAllies: { index: number; name: string; color: string; seconds: number; distance: number; x: number; y: number; progress: number }[];
  /** Versus: whose viewport this one is borrowing while dead. */
  spectating?: { index: number; name: string; color: string; creature: CreatureId };
  /**
   * What happened, while this player is dead: whether they were swallowed or simply killed, and
   * who by, for the line of text that plays over the watch.
   */
  death?: { eaten: boolean; by?: string };
  bandMarkers: { x: number; y: number; band: Band; size: number; hot: boolean }[];
  /** Dominant biome under the player. */
  biome: string;
  /** The hour of the day, for the dial above the radar. */
  day: { phase: Phase; until: number; pressure: number };
  /** Radar contacts in radar space (x right, y down, unit circle = the radar's reach); `beyond` contacts are clamped to the rim. */
  radar: { range: number; blips: RadarBlipHud[] };
  /** The teleport menu, while open. */
  teleport?: { options: { label: string; detail: string; distance: number; dest: TeleportDest }[]; index: number; cooldown: number };
  /** The change-creature page of that menu, while it is open. */
  swap?: { name: string; kind?: string; creature: CreatureId; rung: string; fill: number; kept: boolean; grown: boolean; count: number; index: number };
  /** The scoreboard, while the View button is held. */
  board?: { header: ScoreHeader; rows: ScoreRow[] };
  /** A short line from the simulation: a hand-over, a rescue. Outlives one frame. */
  notice?: string;
  /** What this player has hold of, while they have hold of anything. */
  grip?: GripHud;
  /** The era's own meters (Devonian standing, air, range), when the era defines them. */
  era?: EraHud;
}
export interface RadarBlipHud {
  x: number; y: number; kind: 'player' | 'threat' | 'giant' | 'home' | 'shore' | 'deadzone' | 'food' | 'landmark' | 'territory';
  color: string; beyond: boolean; hunting: boolean; distance: number;
  /** Radius in radar units, for area contacts. */
  r?: number;
  /**
   * Whether the contact is well above or below the viewer, for contacts where that is a real
   * difference (creatures and shoals). A dial seen from overhead cannot show height, so the marks
   * carry it themselves: what is above you is what you look up for.
   */
  level?: 'above' | 'below';
}
export interface HudSnapshot {
  players: PlayerHud[]; rects: Rect[]; time: number; status: 'playing' | 'won' | 'lost'; message: string; mode: Mode; winner: number; fps: number;
  /** This match is over but its mode is co-op, so the results screen can offer to carry on. */
  canContinue: boolean;
  /** What this match turned up, for the results screen's record. */
  discovery: { biomes: Biome[]; landmarks: LandmarkKind[]; apex: CreatureId[]; best: Partial<Record<CreatureId, number>> };
  /** The hour of the day: what it is, how long until it turns, and how much the reef is hunting. */
  day: { phase: Phase; until: number; pressure: number };
}
export interface EngineCallbacks {
  onHud(s: HudSnapshot): void;
  onMenu(player: number): void;
  onError(msg: string): void;
  onLoaded(): void;
  onProgress?(p: AssetProgress): void;
  /** The pointer lock went away on its own (Escape, alt-tab). The match should pause. */
  onPointerLost?(): void;
  /**
   * A swipe on the secondary pad chose a different action. The shell remembers it, so the choice
   * outlives the match — a player who plays as a hider should not have to swipe back to it every
   * time they hatch.
   */
  onSecondary?(s: Secondary): void;
}

export const PLAYER_COLORS = ['#61f2d5', '#ffb457', '#c7a3ff', '#ff86a4'];

/**
 * How far from the camera a burrow still throws sand. Past this the grains are a pixel inside the
 * fog, so the work of emitting them buys nothing.
 */
const SAND_RANGE = 70;
/** How far a print is lifted off the sand it is pressed into, so it draws rather than z-fights. */
const TRACK_LIFT = 0.02;
/** The step the sand's own gradient is measured over, to lie a print along the beach's slope. */
const TRACK_SLOPE = 0.35;
const SAND_SWATCH = new THREE.Color();
const SAND_CACHE = new Map<Biome, THREE.Color>();
/**
 * The floor's own colour where a body is digging. A burrow in the shelf mosaic and one in the
 * black basin must not shower the same beige, and the biome under the animal is what decides.
 */
function sandColorAt(x: number, z: number): THREE.Color {
  const b = biomeAt(x, z);
  let c = SAND_CACHE.get(b);
  if (!c) { c = new THREE.Color(SAND_COLORS[b]); SAND_CACHE.set(b, c); }
  return SAND_SWATCH.copy(c);
}

interface CamState { showBoard: boolean; hatchShot: number; breathT: number; rideBlend: number; yaw: number; pitch: number; zoom: number; fade: number; aimBlend: number; aimTarget: number; aimSnapT: number; climbHold: number; followHold: number; pos: THREE.Vector3; look: THREE.Vector3; shake: number; camera: THREE.PerspectiveCamera; lockBlend: number; lastPos: THREE.Vector3; frustum: THREE.Frustum; projScreen: THREE.Matrix4; tele: TeleMenu; }
/** Per-player teleport menu state: opened with D-pad down, steered with the D-pad or stick, A confirms, B closes. */
/**
 * The D-pad-down menu. A list of places to go, plus one entry that opens a second page: the roster,
 * to change which animal you are. `swap` is that page — the index into `Game.swapOptions` and
 * whether a creature you have never worn would hatch grown or newborn.
 */
interface TeleMenu {
  open: boolean; index: number;
  swap: { open: boolean; index: number; grown: boolean };
  edges: Edges;
}
const freshTele = (): TeleMenu => ({ open: false, index: 0, swap: { open: false, index: 0, grown: false }, edges: new Edges() });

/** Magnification levels (see docs/redesign/01-game-design.md · Magnification). */
export const MAGNIFICATION = [
  { name: 'Micro', maxLength: 1.0 }, { name: 'Small', maxLength: 2.0 }, { name: 'Mid', maxLength: 4.5 }, { name: 'Large', maxLength: 8 }, { name: 'Colossal', maxLength: Infinity },
] as const;
export const magnificationLevel = (L: number) => MAGNIFICATION.find((m) => L < m.maxLength) ?? MAGNIFICATION[4];
/**
 * How much a body at `d` from the camera is washed toward the water colour, on top of the fog.
 * A far-off giant should read as pale background ambience and only resolve into a solid, dark,
 * obviously-present animal as it closes. Scaled by the viewport's far plane, which already tracks
 * magnification and the biome's fog, so a larva's short world and an apex's long one fade alike.
 */
export const distanceHaze = (d: number, far: number) => THREE.MathUtils.smoothstep(d, far * 0.12, far * 0.62) * 0.9;
/** Something hunting you keeps most of its presence, however far off: the warning has to read. */
export const HUNTER_HAZE = 0.4;

/** Radar colour for a shoal in the water above you, against the snack green of one on the floor. */
export const FOOD_ABOVE = '#9ec2ff';

/** Follow-camera distance for a body length: about two body lengths back plus a floor so larvae are still readable. */
export const magnificationDistance = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;

/**
 * How much of the camera's pitch the stick's forward should follow.
 *
 * A follow camera normally sits a little above the creature looking slightly down, and taking
 * that pitch literally means "forward" is partly "down" — hold forward from a resting view and
 * you swim into the seabed. Nothing is lost by ignoring it, because rising and sinking are their
 * own buttons: within FLAT_PITCH of level, forward is parallel to the seafloor. Past that the
 * camera is being aimed deliberately up or down, so its pitch eases in and takes over completely
 * by FULL_PITCH.
 */
/**
 * How far the camera may be aimed. Up is what matters for a swimmer: the water above you is where
 * the thing that eats you comes from, so the view has to reach it. Down goes almost overhead, which
 * is how you read the floor for prey while swimming over it.
 */
/**
 * How close to the sand the camera may sit, and the shortest arm it will pull in to, in body
 * lengths — short enough to clear the floor at a steep angle, long enough to stay outside the
 * animal rather than inside its own ribs.
 */
const CAMERA_SAND = 0.45, CAMERA_CLOSE = 0.9;

/**
 * Fit the camera onto its arm with the seabed in the way.
 *
 * Aiming up from the floor asks for a camera below the creature, which is under the sand. Two
 * answers, in order: shorten the arm, which clears the floor at the same angle and only brings the
 * creature closer; and, when even the shortest arm is still buried, lift the whole rig. `lift` is
 * how far it had to go, and the caller moves the look point by the same amount, so the view keeps
 * the angle the player gave it instead of being levelled off into the seabed.
 *
 * `sandAt` returns the height the camera may not go below for an arm of that length (it moves the
 * camera as a side effect in the renderer, which is why the fit is written against a callback).
 */
export function fitCameraArm(baseY: number, pitch: number, dist: number, minDist: number, sandAt: (d: number) => number, ceiling: number): { dist: number; y: number; lift: number } {
  const rise = -Math.sin(pitch);
  let d = dist, y = baseY + Math.sin(pitch) * d;
  if (rise > 0.05) for (let i = 0; i < 4; i++) {
    const floor = sandAt(d);
    if (y >= floor) break;
    d = Math.max(minDist, d - (floor - y) / rise);
    y = baseY + Math.sin(pitch) * d;
  }
  const clamped = clamp(y, sandAt(d), ceiling);
  return { dist: d, y: clamped, lift: clamped - y };
}
/**
 * How long the camera rides above the waterline after a blow. Long enough to see the spray land —
 * the droplets live about a second — and short enough that it reads as part of the breath rather
 * than the camera having changed its mind about where it lives.
 */
export const BREATH_PEEK = 1.1;
/**
 * Aim mode's framing: how far in the camera comes, and how far the specimen is pushed aside.
 *
 * The shoulder shift is what makes room for the crosshair at screen centre, and it is measured in
 * *body lengths*, which is right — but the room it needs is measured across the **viewport**, and
 * a split screen has half of one. Two players side by side gave a view about as tall as it is wide,
 * and three quarters of a body length shoved the animal off the edge of it. `aimRoom` scales the
 * shift by how wide the view actually is, so one player gets the framing it was drawn for and a
 * narrow view keeps the animal on screen; the camera also comes in a little further than it did,
 * which is what was asked for and helps at every width.
 */
export const AIM_CLOSER = 0.42, AIM_SHOULDER = 0.75;
/**
 * The follow camera, for mouse play: how fast it comes round behind the body, and how long it
 * stands aside after the player has moved it themselves.
 *
 * A pad has a second stick and the view is the player's the whole time. A mouse with no pointer
 * lock has nothing holding the camera, so it has to hold itself: it eases round behind the
 * creature and back to the resting pitch, which is what a follow camera is for. The hold is what
 * makes looking somewhere on purpose stick — without it, letting go of a drag would swing the view
 * straight back and the drag would have been pointless.
 */
const FOLLOW_RATE = 1.6, FOLLOW_HOLD = 1.2;
/**
 * The cursor's *height* nudges the camera's pitch, in mouse play.
 *
 * A mouse has one hand and two jobs — point at an animal, and look where you are going — and with
 * the pointer free the second one only happened on a drag. So the top and bottom of the screen
 * steer: carry the cursor up and the view tilts up with it, carry it down and it tilts down, and
 * the middle `EDGE_DEAD` of the screen does nothing at all, which is the band a player aims in.
 * That is the whole trade — the dead zone is what keeps pointing and looking from being the same
 * gesture — so it is generous, and the push ramps in from its edge rather than starting at full
 * rate, so there is no line the view jumps at.
 *
 * It is a *rate*, not a position: holding the cursor near the top keeps tilting, the way an
 * edge-scroll does, because a screen's top edge is not a camera angle and cannot be mapped to one.
 */
const EDGE_DEAD = 0.38, EDGE_RATE = 0.85;
/** Radians per second of pitch the cursor at `ndcY` is asking for. Positive tilts the view down. */
export function edgePitch(ndcY: number): number {
  const over = Math.abs(ndcY) - EDGE_DEAD;
  if (over <= 0) return 0;
  const k = Math.min(1, over / (1 - EDGE_DEAD));
  // Squared, so the first part of the push past the dead zone is gentle and the corner is quick.
  return -Math.sign(ndcY) * k * k * EDGE_RATE;
}
/** How much a body inside the near field outranks one the same apparent size further off. */
const NEAR_RANK = 3;
/** 1 at a full-width view, falling off for a narrow one; never less than a third of the shift. */
export const aimRoom = (aspect: number) => clamp(aspect / 1.6, 0.34, 1);
export const PITCH_UP = -0.95;   // ~54° above the horizon
export const PITCH_DOWN = 1.32;  // ~76° below it, near enough straight down at the seabed
/**
 * How much of the camera's tilt the body swims along.
 *
 * The camera is not a joystick. A follow camera at rest already sits 11-25° below the horizon, so
 * reading its pitch straight off would have every body drifting at the seabed whenever the player
 * did nothing but hold forward. That is what the flat slice around level is for.
 *
 * It only ever needed to be on the *downward* side, though: nobody's camera rests above the
 * horizon, so looking up is always deliberate. Ignoring 26° of it in both directions and then
 * squashing what was left through a smoothstep that clamped at 40° meant aiming up at something
 * and swimming went almost nowhere — 26° of camera bought 0°, 34° bought 6° — and the top of the
 * camera's own travel could not be reached at any tilt. Past its own slice each side is linear
 * onto the camera's real angle now, so the end of the camera's travel is the angle you are looking
 * along, and pointing at prey and swimming goes at it.
 */
const FLAT_DOWN = 0.45;   // ~26°, comfortably below a resting follow camera (which sits at ~11-25°)
const FLAT_UP = 0.10;     // ~6°: nothing rests above the horizon, so only the noise comes out

export function swimPitch(pitch: number): number {
  const up = pitch < 0;
  const flat = up ? FLAT_UP : FLAT_DOWN;
  const mag = Math.abs(pitch);
  if (mag <= flat) return 0;
  const limit = up ? -PITCH_UP : PITCH_DOWN;
  return Math.sign(pitch) * limit * Math.min(1, (mag - flat) / (limit - flat));
}

/**
 * How long a climbing aim outlives the dash it fired, past the dash's own cooldown.
 *
 * Reaction time and nothing more: the hold below already lasts as long as the simulation's
 * cooldown does, so this is only the gap between the button coming back and a player noticing
 * that it has.
 */
export const DASH_AIM_GRACE = 0.25;

/**
 * A dash aimed up holds its aim until the next dash is ready.
 *
 * The pad's pitch drifts back to level whenever the stick is let go, which is what makes it feel
 * like it is swimming for you — and it is also what made a *series* of upward dashes unusable. A
 * dash lasts 0.42 s and its cooldown 0.55 s, and the drift ran through both, so by the time the
 * button came back the aim had flattened and the second dash went along the surface rather than
 * through it. Climbing out of the water is what a chain of dashes is for, so the aim has to
 * outlast the wait: while a dash fired above the horizon is still on cooldown the drift is
 * suspended, and for `DASH_AIM_GRACE` past that. Only the drift is held — the stick is untouched,
 * so a player who wants to level off still does it the moment they ask.
 *
 * Upward only. Aiming down and drifting back to level is the drift doing its job: the flat slice
 * on the downward side (`FLAT_DOWN`) is there precisely so a resting view is not a dive into the
 * seabed, and a held dive would be the camera swimming a body into the sand.
 *
 * `dashCd` is the simulation's own countdown, so this follows whatever that cooldown is (a tail
 * flip's is longer) rather than naming a number `src/sim` owns.
 */
export function climbAimHold(hold: number, pitch: number, dashCd: number, dt: number): number {
  const armed = dashCd > 0 && pitch < -FLAT_UP ? dashCd + DASH_AIM_GRACE : 0;
  return Math.max(0, Math.max(hold, armed) - dt);
}

/**
 * Where each seat's view goes.
 *
 * Two players are halved across the **longer** axis rather than always left and right
 * (`splitAxis`): on a tablet held upright, two windows 400 across and 1100 down are two slots and
 * not two views, and every HUD panel in them hangs off a corner that is now a long way from the
 * middle. Four are a grid either way, and one takes the window, so two is the only case with a
 * choice to make. The HUD follows these rects by percentage, so it needs no telling.
 */
export function layoutRects(n: number, w: number, h: number): Rect[] {
  if (n <= 1) return [{ x: 0, y: 0, w, h }];
  if (n === 2) {
    return splitAxis(w, h) === 'down'
      ? [{ x: 0, y: 0, w, h: h / 2 }, { x: 0, y: h / 2, w, h: h / 2 }]
      : [{ x: 0, y: 0, w: w / 2, h }, { x: w / 2, y: 0, w: w / 2, h }];
  }
  return Array.from({ length: n }, (_, i) => ({ x: (i % 2) * w / 2, y: Math.floor(i / 2) * h / 2, w: w / 2, h: h / 2 }));
}

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private sea?: SeaEnvironment;
  game?: Game;
  private views = new Map<number, CreatureView>();
  private attachments = new Attachments();
  private contact = new THREE.Vector3();

  // forward-facing cap (the model's +Z is its nose)
  private shieldGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42).rotateX(Math.PI / 2);
  private cams: CamState[] = [];
  /** Where the local views hear from, refreshed each frame; see `hearing()`. */
  private listeners: { pos: THREE.Vector3; right: THREE.Vector3; ref: number }[] = [];
  private attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private bubbles = new Bubbles();
  private mouthfuls = new Mouthfuls();
  private sparkles = new Bubbles(400, [1.0, 0.86, 0.5], 0.25);
  private impacts = new Impacts();
  private splash = new Splash(SURFACE_Y);
  private silt = new Silt();
  private sand = new Sand();
  private tracks = new Tracks();
  private eggs = new Eggs();
  private keyboard = new KeyboardInput();
  private mouse = new MousePlay();
  private touch = new TouchPlay();
  /**
   * Whether the mouse is steering the camera. Decided once per match, at `startMatch`: with no
   * controller anywhere the game is a mouse-and-keyboard game, and with even one pad in the
   * session the pads own it and the mouse stays a pointer.
   */
  private mouseLook = false;
  /**
   * Whether the mouse is playing rather than pointing at menus. Distinct from `mouseLook`, which
   * only says the *match* is a mouse one: the mouse also has to stop being the controls while
   * paused, in a dialog and on the results screen, where its clicks belong to the buttons.
   *
   * Nothing is locked any more, so this takes the mouse's *meaning* rather than the cursor: the
   * pointer is always visible and always where the player put it.
   */
  private pointerWanted = false;
  /** What the mouse did this frame, kept between `controlsFor` and the camera. */
  private mouseFrame: ReturnType<MousePlay['read']> | undefined;
  /**
   * Whether a finger is playing this match: true when a seat joined on `'touch'`. Kept apart from
   * `mouseLook` rather than folded into it, because the two schemes want *different* halves of what
   * that flag gates. Both want the follow camera, since neither has a second stick to steer the view
   * with. Only the mouse wants the CSS cursor and the reticle switched off, because only the mouse
   * has a crosshair on screen at all times — a finger is usually not touching the glass, so touch
   * keeps the reticle and moves it to wherever the last tap was.
   */
  private touchPlay = false;
  /** What the fingers did this frame, kept between `controlsFor` and the camera, as the mouse's is. */
  private touchFrame: ReturnType<TouchPlay['read']> | undefined;
  /**
   * Body yaw a touch swipe has asked for and no simulation step has taken yet, per seat. A frame is
   * not a step — at 60 fps some frames run none — and a swipe's turn is a distance rather than a
   * rate, so what a frame with no step collected has to be carried to the next one that has, or the
   * body would fall behind the camera it is meant to turn with.
   */
  private pendingTurn = new Map<number, number>();
  /** Scratch for the ray from the camera through the cursor. */
  private tmpRay = new THREE.Vector3();
  /** The CSS cursor currently set, so the style is only written when it changes. */
  private cursorNow = '';
  private setups: PlayerSetup[] = [];
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private acc = 0;
  private disposed = false;
  private paused = false;
  private hudT = 0;
  /** The pause button, per device: `onMenu` fires on the press, never on the hold. */
  private menuEdges = new Map<string, Edges>();
  private fps = 60; private fpsFrames = 0; private fpsT = 0;
  private resize: ResizeObserver;
  private scratchBoulders: Boulder[] = [];
  private cullSphere = new THREE.Sphere();
  private tmpV = new THREE.Vector3(); private tmpLook = new THREE.Vector3(); private tmpRide = new THREE.Vector3(); private tmpDesired = new THREE.Vector3(); private tmpProj = new THREE.Vector3();
  private lookSpeed = 1; private invertY = false;
  private attract = true;
  private attractT = 0;
  private generation = 0;
  private lastFocus = new THREE.Vector3();
  private alpha = 1;
  private tmpPos = new THREE.Vector3(); private tmpPred = new THREE.Vector3();
  quality: Quality;
  private readonly conserveMemory = mobileDevonian();

  constructor(private container: HTMLElement, quality: Quality, private cb: EngineCallbacks) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Carcasses are eaten away with per-material clipping planes (see carcass.ts).
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Split-screen renders the scene once per player; without this the shadow map is rebuilt every time.
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);
    // The mouse is attached to the canvas host, not the canvas: the canvas is torn down and rebuilt
    // when quality changes, and the pointer lock has to survive that.
    this.mouse.attach(container);
    // Nothing to lose: without pointer lock there is no lock to be taken away.
    this.mouse.onLost = null;
    // The fingers listen on the window rather than on this element (see `TouchPlay.attach`), but the
    // element is still what a touch's position is measured against, so it is handed over the same way.
    this.touch.attach(container);
    this.touch.onSwap = (sec) => { this.cb.onSecondary?.(sec); audio.play('ui-move'); };
    this.scene.add(this.bubbles.points, this.sparkles.points, this.impacts.group, this.silt.group, this.sand.points, this.tracks.mesh, this.splash.group, this.mouthfuls.group, this.eggs.group);
    (window as any).__cambrian = this;
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(container);
    this.onResize();
    this.startAttract();
    this.raf = requestAnimationFrame(this.frame);
    // Stream assets by priority: the default pick first so the title can show, everything else on idle time.
    this.assets.onProgress((p) => {
      this.cb.onProgress?.(p);
      // The title never waits for 3D models; they stream during the title and pick screens.
      if (!this.bootDone && (this.assets.isCardReady(ACTIVE_ERA.defaults.player) || performance.now() - this.bootStart > 4000)) { this.bootDone = true; this.cb.onLoaded(); }
    });
    this.assets.prioritize([...ACTIVE_ERA.defaults.boot], 'boot');
  }
  readonly assets = new AssetQueue(this.conserveMemory);
  private bootDone = false; private bootStart = performance.now();
  /** Tell the loader which creatures are most likely to be needed next. */
  prioritize(creatures: CreatureId[], phase: 'boot' | 'title' | 'select' | 'playing', committed: CreatureId[] = []) { this.assets.prioritize(creatures, phase, committed); }

  private onResize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
  }

  setQuality(q: Quality) {
    if (q === this.quality) return;
    this.quality = q;
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.5 : 1));
    if (this.game) { this.sea?.dispose(); this.sea = createSea(this.scene, this.game.world, q); }
    this.onResize();
  }
  setLook(speed: number, invert: boolean) { this.lookSpeed = speed; this.invertY = invert; }
  setPaused(p: boolean) { this.paused = p; this.syncPointer(); }
  private syncPointer() {
    const playing = this.pointerWanted && !this.paused && !this.attract;
    this.mouse.want(playing);
    // The fingers stand down for exactly the same reasons the mouse does: paused, in a dialog, on
    // the results screen or back at the menus, a tap belongs to whatever button it landed on.
    this.touch.want(this.touchPlay && !this.paused && !this.attract);
    // Paused, in a dialog, on the results screen or back at the menus, the cursor belongs to the
    // buttons again: a targeting reticle over a *Quit to title* is a lie about what a click does.
    if (!playing) { this.cursorNow = ''; this.container.style.cursor = ''; }
  }
  /** The match is over but the sea keeps running behind the results: give the cursor back. */
  releasePointer() { this.pointerWanted = false; this.syncPointer(); }
  /** Whether this match is being played on mouse and keyboard, so the HUD can name the buttons. */
  get usingMouse() { return this.mouseLook; }
  /** Whether a finger is playing it, so the shell knows to draw the pads. */
  get usingTouch() { return this.touchPlay; }
  /** Put the secondary pad back where the player left it last time. */
  setSecondary(s: Secondary) { this.touch.setSecondary(s); }
  /** Touch menus use their visible choices directly; pad and keyboard edges still use updateTeleMenu. */
  openTouchTravel(i = 0): boolean {
    const p = this.game?.players[i], tele = this.cams[i]?.tele;
    if (!p || !tele || !isAlive(p) || (p.state !== 'free' && p.state !== 'guard')) return false;
    tele.open = true; tele.index = 0; tele.swap.open = false;
    audio.play('ui-confirm');
    return true;
  }
  closeTouchTravel(i = 0) {
    const tele = this.cams[i]?.tele;
    if (!tele?.open) return;
    tele.open = false; tele.swap.open = false;
    audio.play('ui-back');
  }
  touchTravelSelect(index: number, i = 0) {
    const game = this.game, tele = this.cams[i]?.tele;
    if (!game || !tele?.open || tele.swap.open) return;
    const options = game.teleportOptions(i);
    if (index === options.length) {
      tele.swap.open = true; tele.swap.index = 0; tele.swap.grown = false;
      audio.play('ui-confirm');
    } else if (index >= 0 && index < options.length) {
      tele.index = index;
      if (game.teleport(i, options[index].dest)) { tele.open = false; audio.play('ui-start'); }
      else audio.play('ui-back');
    }
  }
  touchSwapStep(dir: number, i = 0) {
    const game = this.game, swap = this.cams[i]?.tele.swap;
    if (!game || !swap?.open) return;
    const roster = game.swapOptions(i, swap.grown);
    if (!roster.length) return;
    swap.index = (swap.index + dir + roster.length) % roster.length;
    void ensureLoaded(roster[swap.index].id, undefined, 0);
    audio.play('ui-move');
  }
  touchSwapToggle(i = 0) {
    const swap = this.cams[i]?.tele.swap;
    if (!swap?.open) return;
    swap.grown = !swap.grown;
    swap.index = 0;
    audio.play('ui-move');
  }
  touchSwapBack(i = 0) {
    const swap = this.cams[i]?.tele.swap;
    if (!swap?.open) return;
    swap.open = false;
    audio.play('ui-back');
  }
  touchSwapConfirm(i = 0) {
    const game = this.game, tele = this.cams[i]?.tele;
    if (!game || !tele?.swap.open) return;
    const pick = game.swapOptions(i, tele.swap.grown)[tele.swap.index];
    if (pick && !pick.current && game.changeCreature(i, pick.id, tele.swap.grown)) {
      tele.open = false; tele.swap.open = false; audio.play('ui-start');
    } else audio.play('ui-back');
  }
  pauseScoreboard(i = 0) { return this.game?.scoreboard(i); }

  /**
   * Carry a finished co-op match on rather than restarting it: same world, same bodies, same
   * progress, with the mode's goal no longer watching. Returns whether the match resumed.
   */
  continueMatch(): boolean {
    const ok = this.game?.continueMatch() ?? false;
    // Back into the sea, so the pointer comes back with it (the results screen gave it up).
    if (ok) { this.pointerWanted = this.mouseLook; this.syncPointer(); }
    return ok;
  }
  get isAttract() { return this.attract; }

  /** Background ecosystem for the title / select screens. */
  startAttract() {
    this.generation++;
    this.clearMatch();
    this.attract = true;
    this.mouseLook = false;
    this.pointerWanted = false;
    this.mouse.want(false);
    this.setups = [];
    this.game = new Game('reef', []);
    this.sea?.dispose();
    this.sea = createSea(this.scene, this.game.world, this.quality);
    const n = nurseryAt(0);
    this.sea.prime(n.x, n.z);
    this.attractT = 0;
  }

  startMatch(mode: Mode, setups: PlayerSetup[]) {
    this.generation++;
    this.clearMatch();
    this.attract = false;
    this.setups = setups;
    this.game = new Game(mode, setups, 5052026 + Math.floor(Math.random() * 1000));
    this.sea?.dispose();
    this.sea = createSea(this.scene, this.game.world, this.quality);
    // Lay the seabed down before the first frame, or the match opens on a hole in the water.
    const start = this.game.players[0] ?? { pos: nurseryAt(0) };
    this.sea.prime(start.pos.x, start.pos.z);
    this.cams = setups.map((_, i) => {
      const p = this.game!.players[i];
      const cam = new THREE.PerspectiveCamera(60, 1, 0.08, 420);
      const cs: CamState = { showBoard: false, hatchShot: -1, breathT: 0, rideBlend: 0, yaw: p.yaw, pitch: 0.2, zoom: 1, fade: 0, aimBlend: 0, aimTarget: -1, aimSnapT: 0, climbHold: 0, followHold: 0, pos: new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y + 2.5, p.pos.z - Math.cos(p.yaw) * 6), look: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), shake: 0, camera: cam, lockBlend: 0, lastPos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), frustum: new THREE.Frustum(), projScreen: new THREE.Matrix4(), tele: freshTele() };
      cam.position.copy(cs.pos); cam.lookAt(cs.look);
      return cs;
    });
    this.paused = false;
    // Mouse and keyboard, or pads. Not both: a session with a controller in it is a controller
    // game, and stealing the pointer there would only take the cursor away from the other player.
    this.touchPlay = setups.some((s) => s.device === 'touch');
    // A finger and a mouse are not both playing: a session that joined on the glass is a touch
    // session, and leaving the mouse in charge as well would have two schemes fighting over the
    // camera. The mouse stays a perfectly good pointer for the menus either way.
    this.mouseLook = gamepads().length === 0 && !this.touchPlay && !setups.some((s) => typeof s.device === 'number');
    this.pointerWanted = this.mouseLook;
    this.syncPointer();
    // The button that started the match is almost certainly still held right now. Seed the menu
    // edge from what each device reads at this instant, or the first frame sees Start down with
    // no previous state, calls it a fresh press, and pauses the match the moment it begins.
    // Seed each device with whatever it is holding right now, so the button that started the match
    // is not read as a press to pause it.
    this.menuEdges.clear();
    for (const s of setups) { const e = new Edges(); e.step({ menu: this.controlsFor(s, 0).menu }); this.menuEdges.set(String(s.device), e); }
    audio.play('ui-start');
  }

  private clearMatch() {
    for (const v of this.views.values()) v.dispose();
    this.views.clear(); this.attachments.clear();
    this.tracks.clear(); this.printed.clear();
    this.eggs.dispose();
    this.cams = [];
    this.pendingTurn.clear();
    this.game = undefined;
  }

  private controlsFor(setup: PlayerSetup, index: number): RawControls {
    if (setup.device === 'touch') {
      // The keyboard is read underneath the fingers rather than instead of them. A tablet with a
      // keyboard case is still a tablet, and a player who has one should not have to choose. Sense
      // is the exception: it stays on for touch play even if the keyboard has a Sense key.
      const c = this.keyboard.read(1);
      // One read per frame, for the mouse's reason: `read()` drains the swipes and the taps, so the
      // frame holds on to them for the camera and the aim after the controls have been folded.
      // Unscaled by the camera-speed setting on purpose: the engine applies `lookSpeed` to
      // `lookDX`/`lookDY` below, exactly as it does for the mouse, and scaling here as well would
      // square it.
      this.touchFrame = this.touch.read();
      c.sense = false;
      return applyTouch(c, this.touchFrame);
    }
    if (setup.device === 'keyboard') {
      const c = this.keyboard.read(1);
      if (!this.mouseLook) return c;
      // One read per frame: `read()` drains the deltas and the click, so the frame keeps it for
      // the camera and the aim to use after the controls have been folded.
      this.mouseFrame = this.mouse.read();
      return applyMouse(c, this.mouseFrame);
    }
    if (setup.device === 'keyboard2') return this.keyboard.read(2);
    if (typeof setup.device !== 'number') return emptyControls();
    const gp = navigator.getGamepads?.()[setup.device];
    if (!gp || !gp.connected) return emptyControls();
    void index;
    return readGamepad(gp);
  }

  private toInput(c: RawControls, cs: CamState, a: Actor): InputFrame {
    const f = emptyInput();
    f.mx = c.mx; f.my = c.my; f.lookX = c.lookX; f.lookY = c.lookY;
    const fwd = this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    f.camYaw = Math.atan2(fwd.x, fwd.z);
    f.camPitch = swimPitch(-Math.asin(clamp(fwd.y, -1, 1)));
    f.burst = c.burst; f.dash = c.dash;
    f.rise = c.rise; f.sink = c.sink;
    f.light = c.light; f.heavy = c.heavy; f.ability = c.ability; f.dodge = c.dodge; f.guard = c.guard; f.lock = c.lock; f.sense = c.sense;
    f.aim = c.aim; f.aimTarget = c.aim ? cs.aimTarget : -1;
    // On a mouse the cursor is the crosshair, so the animal under it is the one the attacks go to.
    // `aim` is set on the *frame* and not on the camera: the simulation's idea of aiming is "this
    // is the body I mean", which is exactly true here, while the over-the-shoulder framing is a
    // separate thing the middle button asks for (`updateAim` still blends on `c.aim`).
    const cursor = this.cursorDir(cs);
    if (cursor) { f.aim = true; f.aimTarget = cs.aimTarget; }
    // The right button — or a double-tap on the water — dashes at what is being pointed at: the dash
    // takes its direction from the stick through the camera, so for those frames the camera's forward
    // *is* the pointing ray and a neutral stick is pushed forward along it. Held, the body keeps
    // going that way, which is what a dash as long as it is held should do. A finger is the same
    // gesture with the same answer, and re-aims as it moves.
    if (cursor && (this.mouseFrame?.right || this.touchFrame?.dash)) {
      f.camYaw = Math.atan2(cursor.x, cursor.z);
      f.camPitch = swimPitch(-Math.asin(clamp(cursor.y, -1, 1)));
      if (Math.hypot(f.mx, f.my) < 0.3) { f.mx = 0; f.my = 1; }
    }
    void a;
    return f;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dtReal = Math.max(0, Math.min((now - this.last) / 1000, 0.08));
    this.last = now;
    this.fpsFrames++; this.fpsT += dtReal; if (this.fpsT > 1) { this.fps = this.fpsFrames / this.fpsT; this.fpsFrames = 0; this.fpsT = 0; }
    const game = this.game;
    if (!game) return;
    const running = !this.paused;
    const dt = running ? dtReal : 0;
    this.time += dt;

    // Inputs
    const inputs = new Map<number, InputFrame>();
    if (!this.attract) {
      this.setups.forEach((s, i) => {
        const c = this.controlsFor(s, i);
        const key = String(s.device);
        let edges = this.menuEdges.get(key);
        if (!edges) this.menuEdges.set(key, (edges = new Edges()));
        if (edges.step({ menu: c.menu }).menu) this.cb.onMenu(i);
        const p = game.players[i];
        const menuOpen = running && p ? this.updateTeleMenu(game, i, c) : false;
        // While the teleport menu is up the creature drifts: A and B belong to the menu.
        if (p && running) inputs.set(i, menuOpen ? this.toInput(emptyControls(), this.cams[i], p) : this.toInput(c, this.cams[i], p));
        // A swipe turns the animal with the camera: the same angle the view is about to take below,
        // with the same sign convention (the follow camera eases `cs.yaw` onto the body's `yaw`), so
        // the two stay locked together rather than the view going round and the body being left.
        if (s.device === 'touch' && running && !menuOpen && c.lookDX) {
          this.pendingTurn.set(i, (this.pendingTurn.get(i) ?? 0) - c.lookDX * this.lookSpeed);
        }
        // Camera orbit. The right stick is the ONLY thing that turns the camera: yaw is absolute
        // and never follows the creature's heading, so swimming back does not swing the view.
        // Increasing yaw rotates the view left, so a rightward stick decreases it.
        if (running) this.cams[i].showBoard = c.view && !menuOpen;
        if (running && !menuOpen) {
          const cs = this.cams[i];
          this.updateAim(cs, game.players[i], c.aim, dt);
          // A dash aimed up keeps its aim until the dash is ready again (`climbAimHold`), so a
          // chain of them climbs instead of flattening out between presses.
          cs.climbHold = climbAimHold(cs.climbHold, cs.pitch, p?.dashCd ?? 0, dt);
          if (this.mouseLook && this.mouseFrame) this.showCursor(this.mouseFrame, game, p, cs);
          // The fingers need the same fact and draw no cursor with it: whether there is something
          // worth attacking where the player is pointing is what decides, at the *next* down, whether
          // a double-tap is a pounce or a dash.
          if (this.touchPlay) this.touch.aimingAt(this.pointingAt(game, p, cs) !== 'none');
          if (c.rsClick) {
            // Right stick pressed in: up/down zooms instead of pitching.
            cs.zoom = clamp(cs.zoom * Math.exp(c.lookY * dt * 1.6), 0.55, 2.2);
          } else {
            // A stick is a rate and the mouse is a distance, so the stick term is scaled by the
            // frame time and the mouse term is not; one of the two is always zero.
            cs.yaw = wrapAngle(cs.yaw - (c.lookX * dt * 2.6 + c.lookDX) * this.lookSpeed);
            cs.pitch = clamp(cs.pitch + (c.lookY * dt * 1.6 + c.lookDY) * this.lookSpeed * (this.invertY ? -1 : 1), PITCH_UP, PITCH_DOWN);
            // Pitch drifts back to level when a stick is let go, which is what makes a pad feel
            // like it is swimming for you. A mouse holds where it was put and so does a finger: the
            // same drift under either would fight the hand every frame. Both of them get the *follow*
            // camera's gentler return instead, just below.
            if (!this.mouseLook && !this.touchPlay && Math.abs(c.lookY) < 0.05 && cs.climbHold === 0) cs.pitch = damp(cs.pitch, 0.2, 0.6, dt);
            // On a mouse or a finger the camera *follows the body* unless a hand is on it. There is
            // no second stick and no pointer lock, so nothing is steering the view frame to frame:
            // left to itself it would stay pointing wherever the animal last turned away from. It
            // eases round behind the creature and back to the resting pitch, and stands aside for
            // `FOLLOW_HOLD` after a drag or a swipe so a player who has just looked somewhere on
            // purpose is not immediately turned away from it.
            if ((this.mouseLook || this.touchPlay) && p) {
              // The cursor's height is a second way of aiming the view, and it is *asking* for
              // something just as a drag is — so it holds the follow off while it pushes, or the
              // two would pull against each other and the pitch would sit wherever they balanced.
              //
              // Only the *mouse* gets it. A hovering cursor is otherwise idle information — it is
              // somewhere whether or not the player is doing anything with it — and a finger is the
              // opposite: it is only on the glass while it is being used, and while it is, its travel
              // is already the camera. Reading its height as a tilt as well would have one gesture
              // pulling the pitch two ways.
              const edge = this.mouseLook && this.mouseFrame?.ndc && !this.mouseFrame.dragging ? edgePitch(this.mouseFrame.ndc.y) : 0;
              if (edge !== 0) cs.pitch = clamp(cs.pitch + edge * dt, PITCH_UP, PITCH_DOWN);
              if (this.mouseFrame?.dragging || this.touchFrame?.dragging || Math.abs(c.lookX) > 0.05 || Math.abs(c.lookY) > 0.05) cs.followHold = FOLLOW_HOLD;
              else cs.followHold = Math.max(0, cs.followHold - dt);
              if (cs.followHold === 0 && cs.climbHold === 0) {
                cs.yaw = wrapAngle(cs.yaw + wrapAngle(p.yaw - cs.yaw) * (1 - Math.exp(-FOLLOW_RATE * dt)));
                // The pitch only settles back while the cursor is in the dead zone: the follow is
                // what a view does when nobody is asking, and the cursor up there is an ask.
                if (edge === 0) cs.pitch = damp(cs.pitch, 0.2, FOLLOW_RATE * 0.5, dt);
              }
            }
          }
          if (c.zoomDelta) cs.zoom = clamp(cs.zoom * Math.exp(c.zoomDelta), 0.55, 2.2);
        }
      });
    }

    // The sprint bed follows whichever local body is driving hardest, and only while it has the
    // stamina to be driving at all — an empty bar is a body labouring, not one surging.
    let sprint = 0, sprintDepth = 0;
    if (!this.attract && running) {
      for (const [i, f] of inputs) {
        const p = game.players[i];
        const drive = Math.min(1, f.burst);
        if (p && isAlive(p) && p.exhausted === 0 && p.stamina > 0 && drive > sprint) {
          sprint = drive;
          const column = ACTIVE_ERA.environment.floorDepth?.[biomeAt(p.pos.x, p.pos.z)] ?? 60;
          sprintDepth = clamp((SURFACE_Y - p.pos.y) / column, 0, 1);
        }
      }
    }
    audio.setSprint(sprint, sprintDepth);

    // Fixed step. Capped at 3 sub-steps so a slow frame cannot spiral into more simulation work.
    const tSim = performance.now();
    if (running) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 3) {
        // The banked swipe goes to the first step and only the first: the input map is reused for
        // every sub-step, and a turn left on the frame would be a turn three times over.
        if (steps === 0) for (const [i, t] of this.pendingTurn) { const f = inputs.get(i); if (f) f.turn = t; }
        game.step(1 / 60, inputs);
        if (steps === 0) { for (const f of inputs.values()) f.turn = undefined; this.pendingTurn.clear(); }
        // The match recorder (`?debug=game`), after the step so it sees what the step decided. It
        // is a no-op unless a recording is running, and it never writes to the simulation.
        if (recordingPhase() === 'recording') {
          const me = game.players[0];
          if (me) recordStep(game, me, inputs.get(0) ?? emptyInput(), game.events);
        }
        this.acc -= 1 / 60; steps++;
      }
      if (steps === 3) this.acc = 0;
      // How far this frame sits past the last completed step. The renderer interpolates across it,
      // so a display refreshing at 144 Hz shows smooth motion rather than each 60 Hz step held for
      // two or three frames.
      this.alpha = clamp(this.acc * 60, 0, 1);
    }
    this.simMs = this.simMs * 0.9 + (performance.now() - tSim) * 0.1;
    this.keyboard.endFrame();

    // Events → fx / audio / rumble
    this.handleEvents(game);

    // Cameras
    const camPositions: THREE.Vector3[] = [];
    if (this.attract) {
      this.attractT += dt;
      const n = nurseryAt(0);
      const a = this.attractT * 0.06;
      const r = 16 + Math.sin(this.attractT * 0.1) * 5;
      const x = n.x + Math.cos(a) * r, z = n.z + Math.sin(a) * r;
      const gy = groundHeight(game.world, x, z, this.scratchBoulders);
      this.attractCam.position.set(x, gy + 3.5 + Math.sin(this.attractT * 0.17) * 1.2, z);
      this.attractCam.lookAt(n.x, gy + 2 + Math.sin(this.attractT * 0.13), n.z);
      camPositions.push(this.attractCam.position);
    } else {
      this.cams.forEach((cs, i) => { this.updateCamera(cs, game.players[i], dt); camPositions.push(cs.camera.position); });
    }
    const focus = camPositions.length ? camPositions[0] : this.lastFocus;
    this.lastFocus.copy(focus);
    this.sea?.update(this.time, dt, focus, camPositions, this.attract ? undefined : game.time);
    // Tell the music where the first player is; a biome with a track of its own cues it.
    const listener = game.players[0];
    if (listener && !this.attract) audio.setBiome(biomeAt(listener.pos.x, listener.pos.z));

    // Views
    this.syncViews(game, camPositions, dt);
    this.burrowSand(game, dt);
    this.shoreTracks(game);
    this.bubbles.update(dt); this.sparkles.update(dt); this.splash.update(dt); this.mouthfuls.update(dt); this.sand.update(dt); this.tracks.update(dt);
    this.eggs.update(game.actors, dt);
    this.impacts.update(dt, focus);
    this.silt.sync(game.silt, this.time);

    // Render
    const tRender = performance.now();
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const r = this.renderer;
    r.setScissorTest(false); r.setViewport(0, 0, W, H); r.clear();
    if (this.quality === 'high') r.shadowMap.needsUpdate = true;   // rebuilt on the first render() below
    if (this.attract) {
      const density = this.sea?.setViewLength(1.2, this.attractCam.position.x, this.attractCam.position.z) ?? 0.0105;
      this.attractCam.far = clamp(2.1 / density, 110, 300);
      this.attractCam.aspect = W / H; this.attractCam.updateProjectionMatrix();
      this.prepareViewport(-1, undefined);
      r.render(this.scene, this.attractCam);
    } else {
      const rects = layoutRects(this.cams.length, W, H);
      r.setScissorTest(true);
      this.cams.forEach((cs, i) => {
        const rc = rects[i];
        const density = this.sea?.setViewLength(lengthOf(game.players[i]), cs.camera.position.x, cs.camera.position.z, cs.camera.position.y) ?? 0.0105;
        // Everything past ~98% fog is invisible: pulling the far plane in there lets the frustum
        // drop those scenery chunks entirely instead of rendering them into the murk.
        cs.camera.far = clamp(2.1 / density, 110, 300);
        cs.camera.aspect = rc.w / rc.h; cs.camera.updateProjectionMatrix();
        this.prepareViewport(i, game.players[i], cs);
        r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h); r.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h);
        r.render(this.scene, cs.camera);
      });
      r.setScissorTest(false);
      // HUD
      this.hudT += dtReal;
      if (this.hudT > 1 / 24) { this.hudT = 0; this.cb.onHud(this.snapshot(game, rects)); }
      // audio tension
      let tension = 0;
      for (const p of game.players) tension = Math.max(tension, p.hunted);
      audio.setTension(clamp(tension, 0, 1));
      audio.update(dtReal);
    }
    this.renderMs = this.renderMs * 0.9 + (performance.now() - tRender) * 0.1;
    this.frameMs = this.frameMs * 0.9 + dtReal * 1000 * 0.1;
  }

  /**
   * The teleport menu. D-pad down opens it (and closes it again); up/down or the left stick move
   * the cursor; A goes; B backs out. Returns whether the menu is open, in which case the player's
   * other controls are swallowed for the frame.
   */
  private updateTeleMenu(game: Game, i: number, c: RawControls): boolean {
    const cs = this.cams[i]; if (!cs) return false;
    const t = cs.tele, edges = t.edges;
    const p = game.players[i];
    // One list, not two: `Edges` remembers what it was handed, so a control cannot be added to the
    // reading and forgotten in the remembering — which used to leave that button held forever.
    const { teleport: justTele, up: justUp, down: justDown, left: justLeft, right: justRight,
            confirm: justConfirm, back: justBack, ability: justAbility } = edges.step({
      teleport: c.teleport,
      up: c.dup || c.my > 0.6, down: c.ddown || c.my < -0.6,
      left: c.dleft || c.mx < -0.6, right: c.dright || c.mx > 0.6,
      confirm: c.confirm, back: c.back, ability: c.ability,
    });
    if (justTele && !t.open) {
      // D-pad down opens it; once open the same button steps down the list
      if (isAlive(p) && (p.state === 'free' || p.state === 'guard')) { t.open = true; t.index = 0; t.swap.open = false; edges.hold('confirm', 'down'); audio.play('ui-confirm'); }
      return t.open;
    }
    if (!t.open) return false;
    if (!isAlive(p)) { t.open = false; t.swap.open = false; return false; }

    // ---- the change-creature page ----
    if (t.swap.open) {
      const roster = game.swapOptions(i, t.swap.grown);
      if (!roster.length) { t.swap.open = false; return true; }
      const step = (d: number) => { t.swap.index = (t.swap.index + d + roster.length) % roster.length; audio.play('ui-move'); };
      if (justRight) step(1);
      if (justLeft) step(-1);
      // Y flips how an animal you have never worn would arrive. One you have is handed back as you
      // left it either way, so the flip is a preview of a fresh start, not of your own progress.
      if (justAbility) { t.swap.grown = !t.swap.grown; audio.play('ui-move'); }
      if (justBack) { t.swap.open = false; audio.play('ui-back'); return true; }
      if (justConfirm) {
        const pick = roster[t.swap.index];
        if (pick && !pick.current && game.changeCreature(i, pick.id, t.swap.grown)) { t.open = false; t.swap.open = false; audio.play('ui-start'); return false; }
        audio.play('ui-back');
        return true;
      }
      // Browsing loads the body you are looking at, so committing to it is not a wait.
      const ahead = roster[t.swap.index];
      if (ahead) void ensureLoaded(ahead.id, undefined, 0);
      return true;
    }

    const options = game.teleportOptions(i);
    // One entry past the destinations opens the roster instead of going anywhere.
    const count = options.length + 1;
    if (justUp) { t.index = (t.index + count - 1) % count; audio.play('ui-move'); }
    if (justDown || justTele) { t.index = (t.index + 1) % count; audio.play('ui-move'); }
    if (justBack) { t.open = false; audio.play('ui-back'); return false; }
    if (justConfirm) {
      if (t.index >= options.length) {
        t.swap.open = true; t.swap.index = 0; t.swap.grown = false;
        audio.play('ui-confirm');
        return true;
      }
      const opt = options[t.index];
      if (opt && game.teleport(i, opt.dest)) { t.open = false; audio.play('ui-start'); }
      else audio.play('ui-back');
      return t.open;
    }
    return true;
  }

  /**
   * Aim mode. The crosshair is the screen centre; whatever prey it is over (nearest to the camera
   * forward ray, inside range) becomes the target. Entering aim snaps the camera onto the best
   * candidate once, the way a console aim-assist does; after that the right stick steers freely.
   */
  /**
   * Who the aim button is pointing at: whatever sits closest to the camera's forward axis, inside a
   * cone that is wide on entry (the snap) and tight afterwards.
   *
   * The axis *is* the middle of the viewport, and the crosshair is drawn there (`.aim`, at
   * left/top 50%). That equivalence is the contract that lets sense off take the crosshair away
   * with nothing lost: with no reticle drawn, the centre of the camera is the implied aim point,
   * and it is the real one. Anything that moves the crosshair off centre, or picks a target from
   * somewhere other than `fwd`, breaks the immersive view as well as the readout.
   */
  /**
   * The direction the cursor points, in the world: the camera's own ray through that pixel.
   *
   * This is what "aim with the mouse" means with no pointer lock — the crosshair is wherever the
   * cursor is, not the middle of the screen — so it is what the aim picks a target along and what
   * a right-button dash goes down. Undefined when the mouse is not playing or has not moved yet,
   * and every caller then falls back to the way it worked before.
   */
  private cursorDir(cs: CamState): THREE.Vector3 | undefined {
    // Either pointer will do, because the rule is about pointing rather than about hardware:
    // whatever the player has aimed at is what the attacks go to. The mouse's cursor is always
    // somewhere; a finger's aim point lapses a moment after the hand comes off the glass, and then
    // there is nothing pointing and aiming goes back to the middle of the screen.
    const ndc = this.mouseFrame?.ndc ?? this.touchFrame?.ndc;
    if ((!this.mouseLook && !this.touchPlay) || !ndc) return undefined;
    return this.tmpRay.set(ndc.x, ndc.y, 0.5).unproject(cs.camera).sub(cs.camera.position).normalize();
  }

  /**
   * Dress the cursor for what it is over and what the buttons are doing, and tell the mouse
   * whether there is anything there — which is what decides whether the next press is an attack or
   * a look (`MousePlay.onDown`). The engine is the only thing that knows both.
   *
   * Edible or a fight is the size band, the same one every other readout in the game uses: what you
   * could swallow or chase down is green, what would be a fight is red.
   */
  /**
   * What is where the player is pointing: nothing, something edible, or a fight.
   *
   * The size band, the same one every other readout in the game uses. Both pointing schemes want
   * this and want it for the same reason — it is what decides whether the *next* press or tap is an
   * attack or a look — so it is asked once here rather than twice in two places that could drift
   * apart.
   */
  private pointingAt(game: Game, p: Actor | undefined, cs: CamState): 'none' | 'edible' | 'attack' {
    const t = p && cs.aimTarget >= 0 ? game.byId(cs.aimTarget) : undefined;
    const band = t && p && isAlive(t) ? bandOf(p, t) : undefined;
    return !band ? 'none' : band === 'snack' || band === 'prey' ? 'edible' : 'attack';
  }

  private showCursor(m: ReturnType<MousePlay['read']>, game: Game, p: Actor | undefined, cs: CamState) {
    const over = this.pointingAt(game, p, cs);
    this.mouse.aimingAt(over !== 'none');
    const want = cursorFor(cursorState(m, over));
    if (want !== this.cursorNow) { this.cursorNow = want; this.container.style.cursor = want; }
  }

  private updateAim(cs: CamState, p: Actor | undefined, aiming: boolean, dt: number) {
    if (!p || !this.game) { cs.aimBlend = 0; cs.aimTarget = -1; return; }
    const wasAiming = cs.aimBlend > 0.5 || cs.aimSnapT > 0;
    cs.aimBlend = damp(cs.aimBlend, aiming ? 1 : 0, 9, dt);
    // On a mouse the crosshair is the cursor, so a target is picked every frame whether or not aim
    // mode's framing is on: pointing at an animal *is* aiming at it, and the camera shift is a
    // separate thing the middle button asks for.
    const cursor = this.cursorDir(cs);
    if (!aiming && !cursor) { cs.aimTarget = -1; cs.aimSnapT = 0; return; }
    const L = lengthOf(p);
    const range = this.game.pounceRange(p) * 2.4;
    const fwd = cursor ? this.tmpV.copy(cursor) : this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    let best: Actor | undefined; let bestAng = Infinity;
    for (const o of this.game.nearby(p.pos, range)) {
      if (o.id === p.id || !isAlive(o) || isHidden(o)) continue;
      const band = bandOf(p, o);
      // Anything the crosshair is over. The threat and giant bands used to be skipped outright,
      // which meant a player holding the crosshair squarely on something their own size or larger
      // was told there was nothing there — and what you do about a big animal (ride it, take hold
      // of it, pounce at it) is exactly what aiming is for.
      //
      // Another player can be aimed at, but never *handed* to you: the entry snap, which happens
      // on the frame aim mode comes on and picks a target without the player having pointed at
      // anything, ignores them. Once the crosshair is being held, it is being held on purpose.
      const rival = o.controller === 'player';
      const entrySnap = aiming && !wasAiming && !cursor;
      if (rival && entrySnap) continue;
      const to = this.tmpDesired.set(o.pos.x - cs.camera.position.x, o.pos.y - cs.camera.position.y, o.pos.z - cs.camera.position.z);
      const d = to.length(); if (d < 0.01) continue;
      to.divideScalar(d);
      // angular distance from the crosshair, widened slightly for close/large targets
      const ang = Math.acos(clamp(fwd.dot(to), -1, 1)) - Math.min(0.08, lengthOf(o) * 0.5 / d);
      // The entry snap is the game choosing for you, so it leans toward what you probably meant:
      // food ahead of a fight, and never another player. A crosshair being held is not choosing for
      // you at all, so it ranks on pure angle — whatever is nearest the point of the cursor.
      const bandW = entrySnap ? (rival ? 2.4 : band === 'prey' ? 0.85 : band === 'snack' ? 1 : 1.25) : 1;
      if (ang * bandW < bestAng) { bestAng = ang * bandW; best = o; }
    }
    // A cursor gets one cone and no snap: the player is already pointing, and easing the camera
    // onto a target would fight the hand that is holding the mouse.
    const cone = cursor ? 0.12 : cs.aimSnapT > 0 || !wasAiming ? 0.6 : 0.2;
    if (best && bestAng < cone) {
      cs.aimTarget = best.id;
      if (!wasAiming && !cursor) cs.aimSnapT = 0.25;
      if (cs.aimSnapT > 0 && !cursor) {
        // ease the camera onto the target
        const dx = best.pos.x - cs.camera.position.x, dy = best.pos.y - cs.camera.position.y, dz = best.pos.z - cs.camera.position.z;
        const ty = Math.atan2(dx, dz), tp = clamp(Math.atan2(-dy, Math.hypot(dx, dz)) + 0.12, PITCH_UP, PITCH_DOWN);
        const k = 1 - Math.exp(-14 * dt);
        cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * k);
        cs.pitch += (tp - cs.pitch) * k;
        cs.aimSnapT -= dt;
      }
    } else { cs.aimTarget = -1; if (!wasAiming) cs.aimSnapT = 0; }
  }

  /** The transform the renderer is drawing this actor at: interpolated across the current step. */
  private renderPos(a: Actor, out: THREE.Vector3) {
    const t = a.prevT;
    const k = Math.hypot(a.pos.x - t.x, a.pos.y - t.y, a.pos.z - t.z) > Math.max(2, lengthOf(a) * 3) ? 1 : this.alpha;
    return out.set(t.x + (a.pos.x - t.x) * k, t.y + (a.pos.y - t.y) * k, t.z + (a.pos.z - t.z) * k);
  }

  /**
   * Who a dead player's camera follows. Only in the versus modes, where there is a race to watch,
   * and never when you are inside something — being eaten is its own shot. The leader is whoever
   * is furthest along, so the viewport shows the thing you are about to respawn behind.
   */
  private spectatorTarget(game: Game, i: number): Actor | undefined {
    const p = game.players[i];
    if (!p || p.state !== 'dead' || p.swallowedBy >= 0) return undefined;
    if (game.mode === 'rise' || game.mode === 'reef') return undefined;      // co-op: stay on your own body to be revived
    let best: Actor | undefined, score = -Infinity;
    for (const a of game.actors) {
      if (a === p || a.player < 0 || !isAlive(a)) continue;
      if (a.controller !== 'player' && a.controller !== 'bot') continue;
      const s = a.tier + a.nutrition / Math.max(1, TIER_NEED[a.tier]);
      if (s > score) { score = s; best = a; }
    }
    return best;
  }

  private updateCamera(cs: CamState, p0: Actor, dt: number) {
    // While spectating, everything below frames the watched player instead. The dead player's own
    // camera state (yaw, zoom, shake) is reused, so the handover is a cut, not a new rig.
    const p = this.spectatorTarget(this.game!, p0.player) ?? p0;
    const L = lengthOf(p);
    // Follow where the creature is drawn, not where the simulation last put it.
    const pp = this.renderPos(p, this.tmpPos);
    const def = creature(p.creature);
    const target = p.lockTarget >= 0 ? this.game!.byId(p.lockTarget) : undefined;
    const locked = !!target && isAlive(target) && !p.aiming;
    cs.lockBlend = damp(cs.lockBlend, locked ? 1 : 0, 5, dt);
    // Magnification: camera distance and framing scale with body length so the world re-reads at every tier.
    let dist = magnificationDistance(L) * cs.zoom * (1 - AIM_CLOSER * cs.aimBlend);
    if (p.state === 'dead') dist *= 1.5;
    // In the egg the animal is a fraction of its hatched size and the camera would be pressed
    // against the shell. Frame the egg instead, and ease back in as the body comes out of it.
    if (p.hatching && p.state === 'moult' && p.stateDur > 1.5) dist *= 1 + 0.9 * (1 - Math.min(1, p.stateT / p.stateDur / 0.85));
    if (p.hunted > 0.5) dist *= 0.85;
    // Snap in behind the creature when it teleports (respawn), otherwise keep the player's framing.
    const jumped = cs.lastPos.distanceTo(pp) > 20;
    cs.lastPos.copy(pp);
    if (jumped) { cs.yaw = p.yaw; cs.fade = 1; }
    // The opening shot. A hatch is five seconds the player cannot act in, and it is the one thing
    // every match opens on — so the camera picks the side the shell can actually be seen from
    // rather than simply sitting behind the animal, which is as likely to be behind a log or a
    // Tanystropheus' flank as not. Chosen once, on the frame the egg appears, and then left alone:
    // a camera that kept re-deciding would swing about while the player watched.
    const inShell = p.hatching && p.state === 'moult' && p.stateDur > 1.5;
    if (inShell && cs.hatchShot !== p.id) {
      cs.hatchShot = p.id;
      let bestYaw = cs.yaw, bestSeen = -Infinity;
      for (let i = 0; i < 8; i++) {
        const yaw = (i / 8) * Math.PI * 2;
        // Where the arm would put the camera at this yaw, at the egg's own height.
        const cx = pp.x - Math.sin(yaw) * dist, cz = pp.z - Math.cos(yaw) * dist;
        const cy = Math.max(pp.y + L * 0.6, sampleHeight(cx, cz) + L * CAMERA_SAND);
        // Least covered camera spot wins: what hides a body there is what would stand in the way.
        const seen = -coverAt(this.game!.world, { x: cx, y: cy, z: cz }, L, []);
        if (seen > bestSeen) { bestSeen = seen; bestYaw = yaw; }
      }
      cs.yaw = bestYaw;
    } else if (!inShell && cs.hatchShot === p.id) cs.hatchShot = -1;
    // Eaten: ride along with the predator, from the same angle, until the respawn — you are inside
    // it, so it is where you are. Killed any other way, the shot stays on your own body drifting
    // up: whatever landed the blow has moved on, and following it would be a camera nobody asked
    // for. The line of text still names it either way.
    const pred = p.state === 'swallowed' || (p.state === 'dead' && p.swallowedBy >= 0) ? this.game!.byId(p.swallowedBy) : undefined;
    const lookAt = pred
      ? this.renderPos(pred, this.tmpLook).setY(this.tmpLook.y + lengthOf(pred) * 0.1)
      : this.tmpLook.set(pp.x, pp.y + L * 0.15, pp.z);
    if (pred) dist = magnificationDistance(lengthOf(pred)) * cs.zoom * 0.85;
    // Riding: the shot is the animal you are on, not the one you are.
    //
    // Framed on a hatchling clinging to a giant, the camera sits a body length or two off a very
    // small animal, and the giant is a wall filling the screen with no way to tell what you are
    // holding or where it is taking you. Framing the host puts both in shot at a distance that
    // suits the big one — and it takes the camera off the rider, which is the body carrying the
    // per-frame correction that seats the grip on moving geometry, so the shot stops inheriting
    // that animation's jitter. Eased in and out, because letting go should not be a cut.
    const host = p.rideHost >= 0 ? this.game!.byId(p.rideHost) : undefined;
    const riding = !!host && isAlive(host) && host.riddenBy === p.id && !pred;
    cs.rideBlend = damp(cs.rideBlend, riding ? 1 : 0, 3.5, dt);
    if (host && cs.rideBlend > 0.001) {
      const hl = lengthOf(host);
      this.renderPos(host, this.tmpRide).y += hl * 0.15;
      lookAt.lerp(this.tmpRide, cs.rideBlend);
      dist += (magnificationDistance(hl) * cs.zoom - dist) * cs.rideBlend;
    }
    // Fade to black just before the respawn, and in again just after. Always the real player's
    // own death, never the spectated one's: this viewport's owner is the one coming back.
    // Fade to black over the last moment before the respawn, and in again slowly on the new body:
    // the watch is the point, so the black is a curtain at the end of it rather than a cut. Always
    // the real player's own death, never the spectated one's: this viewport's owner is coming back.
    const dying = p0.state === 'dead' || p0.state === 'swallowed';
    const respawnAt = this.game!.reviveWindow(p0) ? Infinity : CORPSE_WINDOW - DEATH_FADE;   // a downed player waiting on an ally never fades out
    const fadeTarget = dying && (p0.state === 'dead' ? p0.respawnT : p0.stateT) > (p0.state === 'dead' ? respawnAt : 99) ? 1 : 0;
    cs.fade = damp(cs.fade, fadeTarget, fadeTarget > cs.fade ? 4 : 1.5, dt);
    if (locked && target) {
      const tp = this.renderPos(target, this.tmpPred);
      const dx = tp.x - pp.x, dz = tp.z - pp.z;
      const ty = Math.atan2(dx, dz);
      // Lock-on eases the camera behind the player relative to the target; the stick still works.
      cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * (1 - Math.exp(-2.5 * dt)));
      const d = Math.hypot(dx, dz, tp.y - pp.y);
      lookAt.lerp(tp, 0.42 * cs.lockBlend);
      dist += Math.min(d * 0.35, L * 3) * cs.lockBlend;
    }
    const yaw = cs.yaw;
    // Aim mode: over-the-shoulder. Shift both the camera and its look point sideways so the
    // specimen sits to the left and the crosshair (screen centre) is free to be steered onto prey.
    if (cs.aimBlend > 0.001) {
      const k = L * AIM_SHOULDER * aimRoom(cs.camera.aspect) * cs.aimBlend;  // right = (-cos yaw, 0, sin yaw)
      lookAt.x += -Math.cos(yaw) * k; lookAt.z += Math.sin(yaw) * k;
      lookAt.y += L * 0.1 * cs.aimBlend;
    }
    const pitch = cs.pitch + (locked ? 0.1 : 0) + (def.ground ? 0.12 : 0);
    const place = (d: number) => this.tmpDesired.set(
      lookAt.x - Math.sin(yaw) * Math.cos(pitch) * d,
      lookAt.y + Math.sin(pitch) * d + L * 0.18,
      lookAt.z - Math.cos(yaw) * Math.cos(pitch) * d,
    );
    const desired = place(dist);
    // The sand is the only thing the camera cannot be inside. A rock is not: shoving the camera
    // sideways out of a boulder, or lifting it onto one, throws the shot away for scenery, and a
    // camera *inside* a rock simply sees out of it — the far side of a closed mesh is not drawn —
    // so it passes through and keeps looking at the creature. Hence the sand itself here, and not
    // `groundHeight`, which counts boulder tops as floor.
    // The camera lives under the water: its ceiling is just below the waterline, and only a breach
    // lifts it. That is why a breath read as not having happened — the one moment the animal is at
    // the top, the view is still the water. So a blow lifts it too, briefly, on `breathT`: up over
    // the surface to see the spray and the animal's back in it, and back under. Eased both ways,
    // faster up than down, because a cut to the sky and back is a flinch rather than a breath.
    cs.breathT = Math.max(0, cs.breathT - dt);
    const peek = cs.breathT <= 0 ? 0 : Math.sin(Math.min(1, cs.breathT / BREATH_PEEK) * Math.PI) ** 0.6;
    // And the sand lifts it: a body wading up the beach takes the camera up out of the water with
    // it, by its wade, which is continuous in where it stands, so the view comes up as the animal
    // does rather than cutting to the sky when a rule says it is ashore.
    const ceiling = p.airborne ? SURFACE_Y + 40 : (SURFACE_Y - 0.4) + Math.max(peek * (L * 0.5 + 1.6), p.wade * (L * 0.8 + 6));
    const fit = fitCameraArm(lookAt.y + L * 0.18, pitch, dist, L * CAMERA_CLOSE,
      (d) => { place(d); return sampleHeight(desired.x, desired.z) + CAMERA_SAND; },
      ceiling);
    place(fit.dist);
    desired.y = fit.y;
    // The rig had to be lifted off its arm, so the look point goes with it rather than the view
    // tipping flat: you see *past* your own creature into the water above, which is the whole point
    // of aiming up from the floor. Not while locked on — there the target is the shot.
    if (!locked) lookAt.y += clamp(fit.lift, -L * 1.5, L * 1.5);
    const k = jumped ? 1 : p.state === 'dodge' ? 5 : 7;
    if (jumped) { cs.pos.copy(desired); cs.look.copy(lookAt); }
    else { cs.pos.lerp(desired, 1 - Math.exp(-k * dt)); cs.look.lerp(lookAt, 1 - Math.exp(-10 * dt)); }
    cs.shake = Math.max(0, cs.shake - dt * 2.2);
    const sh = cs.shake * cs.shake * 0.35;
    cs.camera.position.copy(cs.pos).add(this.tmpV.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    cs.camera.lookAt(cs.look);
    const baseFov = 64 - 9 * clamp(Math.log(L + 0.3) / Math.log(11), 0, 1);
    cs.camera.fov = damp(cs.camera.fov, baseFov + (p.burstT > 0 || (Math.hypot(p.vel.x, p.vel.z) > def.speed * Math.pow(p.scale, 0.45) * 1.25) ? 8 : 0) + p.hunted * 4, 4, dt);
    cs.camera.near = clamp(L * 0.06, 0.04, 0.5);
  }

  private syncViews(game: Game, cams: THREE.Vector3[], dt: number) {
    const players = Math.max(1, this.cams.length);
    const keep = new Set<number>();
    const nearDist = (a: Actor) => { let best = Infinity; for (const c of cams) { const d = Math.hypot(a.pos.x - c.x, a.pos.y - c.y, a.pos.z - c.z); if (d < best) best = d; } return best; };
    // Rank by apparent size (body length over distance), not distance alone: a giant 80 units away
    // matters far more than a 0.2-unit snack at 20. Anything under ~8 screen pixels is skipped.
    /**
     * Inside this, a body is drawn whatever its apparent size.
     *
     * The apparent-size floor below is a good rule for the far field and a bad one up close,
     * because the distance it divides by is *the viewer's own framing*: the camera sits about one
     * and a half body lengths back, so a nineteen-unit Cymbospondylus watches from thirty units
     * away and a prey fish swimming five units in front of its nose is thirty-five from the
     * camera — 0.011 apparent size, right on the floor, popping in and out. The bigger the animal
     * you are playing, the nearer the things that vanish. Hence the floor is joined by a plain
     * near field measured in the same unit the camera is placed in, so what is *in front of you*
     * is always drawn no matter how small it is or how large you are.
     */
    const nearAlways = game.players.reduce(
      (m, p) => Math.max(m, magnificationDistance(p ? lengthOf(p) : 1) * 1.8 + 10), 22);
    const candidates: { a: Actor; d: number; size: number }[] = [];
    for (const a of game.actors) {
      const d = Math.max(0.5, nearDist(a));
      const size = lengthOf(a) / d;
      if (a.controller === 'player' || d < nearAlways || (d < (players > 2 ? 90 : 130) && size > 0.011)) candidates.push({ a, d, size });
    }
    // Ranked by apparent size, with the near field weighted up rather than let past the cap: the
    // cap is a frame-cost limit and must stay one, but what it cuts is the *tail* of the list —
    // which is exactly a prey swarm, every member small on screen and most of them right beside
    // you. Weighting keeps a giant eighty units off (the thing that matters most at any moment)
    // ahead of the chaff while lifting what is within reach above the small and far.
    candidates.sort((x, y) => y.size * (y.d < nearAlways ? NEAR_RANK : 1) - x.size * (x.d < nearAlways ? NEAR_RANK : 1));
    const cap = Math.round((this.conserveMemory ? 32 : this.quality === 'high' ? 88 : 56) / (0.6 + 0.4 * players));
    // Full-detail bodies are the most expensive thing in the frame — they are skinned on the CPU
    // and drawn again into the shadow map, once per viewport — and how expensive depends entirely
    // on the era: a Devonian placoderm is 105k triangles where a Cambrian arthropod is 55k, and
    // one of its trilobites is 516k. Apparent size alone therefore buys wildly different frame
    // costs in the two eras, which is why the Devonian ran heavy. So spend a triangle budget
    // instead: biggest-on-screen first, everything past it takes the decimated copy.
    const budget = (this.quality === 'high' ? 700_000 : 320_000) / (0.6 + 0.4 * players);
    let spent = 0, count = 0;
    for (const { a, d } of candidates) {
      if (count >= cap && a.controller !== 'player') break;
      // Pick a detail level from apparent size, with hysteresis so it cannot flicker at the boundary.
      let v = this.views.get(a.id);
      const size = lengthOf(a) / d;
      let wantLod: Lod = a.controller === 'player' ? 0 : v ? (v.lod === 0 ? (size < 0.05 ? 1 : 0) : (size > 0.075 ? 0 : 1)) : (size < 0.06 ? 1 : 0);
      // On Devonian touch devices, keep the full skinned body for the player only. Streaming
      // full NPCs over a long match otherwise retains the entire 269 MB compressed roster.
      if (this.conserveMemory && a.controller !== 'player') wantLod = 1;
      // The budget only ever demotes: your own body, and anything already at full detail whose
      // share is still affordable, keep it.
      const full = loadedSync(a.creature, 0);
      if (wantLod === 0 && a.controller !== 'player') {
        if (full && spent + full.tris > budget) wantLod = 1;
      }
      if (wantLod === 0) spent += full?.tris ?? 0;
      if (wantLod === 1 && !loadedSync(a.creature, 1)) {
        void ensureLoaded(a.creature, undefined, 1);
        // Use an already resident full body while its LOD arrives, but do not start a second,
        // much larger download just because the small body has not finished loading yet.
        if (loadedSync(a.creature, 0)) wantLod = 0;
      }
      // A view is built for one creature at one detail level. Both can change under it: the level
      // with distance, and the creature itself when a player changes body mid-match.
      if (v && (v.lod !== wantLod || v.creatureId !== a.creature)) { v.dispose(); this.views.delete(a.id); v = undefined; }
      if (!v) {
        const loaded = loadedSync(a.creature, wantLod);
        if (!loaded) { void ensureLoaded(a.creature, undefined, wantLod); continue; }
        v = new CreatureView(a.creature, loaded, { shieldGeo: this.shieldGeo }, wantLod);
        this.scene.add(v.group);
        this.views.set(a.id, v);
        v.update(a, 0, this.time, true);
      }
      // A seat that is the second on its creature is drawn in another palette, so four players on
      // four Anomalocaris are four different animals to look at. Read every frame rather than set
      // once: a view is rebuilt when the body or the detail level changes, and the scheme has to
      // survive that without the rebuild knowing about seats.
      const seat = a.controller === 'player' && a.player >= 0 ? this.setups[a.player] : undefined;
      if (v.seatScheme !== seat?.scheme) { v.seatScheme = seat?.scheme; v.refreshScheme(); }
      keep.add(a.id); count++;
      // Only nearby creatures cast shadows: the shadow pass has no frustum culling for these
      // meshes, so every distant swimmer was being rasterised into the shadow map for nothing.
      v.setShadow(d < 32 && lengthOf(a) > 0.45);
      // Animate far views less often
      const far = d > 45;
      const continuous = a.state === 'eating' || a.holdT > 0;
      const animate = continuous || !far || ((a.id + Math.floor(this.time * 60)) % 3 === 0);
      v.update(a, animate && far && !continuous ? dt * 3 : dt, this.time, animate, this.alpha);
      // Arms that lie along what they are on. Near views only: it is a per-segment solve, and at
      // any distance the shape it makes is smaller than a pixel.
      if (v.conforms && d < 26 && animate) {
        const host = a.rideHost >= 0 ? game.byId(a.rideHost) : undefined;
        const L = lengthOf(a);
        const gap = a.pos.y - groundHeight(game.world, a.pos.x, a.pos.z, this.scratchBoulders);
        // Fade out as it leaves the floor: an arm in open water has nothing to lie on.
        const weight = host ? 1 : clamp(1 - (gap - L * 0.35) / Math.max(L, 0.4), 0, 1);
        v.conform({
          groundAt: (x, z) => groundHeight(game.world, x, z, this.scratchBoulders),
          clearance: L * 0.06,
          host: host ? { x: host.pos.x, y: host.pos.y, z: host.pos.z, radius: lengthOf(host) * 0.32 } : undefined,
        }, weight, dt);
      }
      // A carcass shows what has been taken out of it, and gets whole again when its owner
      // respawns into the same view.
      if (a.state === 'dead' && a.eatBites > 1 && a.eaten > 0) v.carcass.setEaten(a.eaten);
      else if (a.state !== 'dead' && a.eaten <= 0) v.restoreCarcass();
    }
    this.attachments.sync(game, this.views, dt);
    this.breathe(game, keep);
    for (const [id, v] of this.views) if (!keep.has(id)) { v.dispose(); this.views.delete(id); }
  }

  /**
   * Sand around a body going into the seabed, and again as it comes back out.
   *
   * The simulation already leaves a silt cloud at the moment a burrower is covered — that is the
   * haze that hides it, and it is part of the rules. This is the other half, and it is purely a
   * look: the grains the animal actually displaces. A steady shower while it works itself down,
   * one throw as the floor closes over it, and a harder one thrown clear when it surfaces, so
   * both ends of the act are seen rather than only the disappearing.
   *
   * Renderer-side, off the actors' own `hideMode`, because nothing here is a rule: `src/sim` keeps
   * its determinism and gains no event. What it costs is one map of the bodies that are currently
   * in the floor, which on any roster is a handful.
   */
  private burrowSand(game: Game, dt: number) {
    for (const a of game.actors) {
      const was = this.burrowing.get(a.id) ?? 'none';
      const now = a.hideMode === 'descending' || a.hideMode === 'burrowed' ? a.hideMode : 'none';
      if (was === 'none' && now === 'none') continue;
      if (now === 'none') { this.burrowing.delete(a.id); this.sandOwed.delete(a.id); }
      else this.burrowing.set(a.id, now);
      // Only what somebody could be looking at: a shower behind the fog is frames spent on nothing.
      const dx = a.pos.x - this.lastFocus.x, dz = a.pos.z - this.lastFocus.z;
      if (dx * dx + dz * dz > SAND_RANGE * SAND_RANGE) continue;
      const L = lengthOf(a);
      // The floor is where the sand is, so the shower is seated there rather than on a body that
      // has already sunk half its length past it.
      const at = { x: a.pos.x, y: Math.min(a.pos.y + L * 0.1, sampleHeight(a.pos.x, a.pos.z) + L * 0.3), z: a.pos.z };
      const col = sandColorAt(a.pos.x, a.pos.z);
      const th = sandThrow(was, now, L);
      if (!th) continue;
      if (th.perSecond === 0) { this.sand.emit(at, col, th.grains, th.spread, th.speed, th.up, th.size, th.life); this.sandOwed.delete(a.id); continue; }
      // A rate rather than a count per frame, so the shower is the same shower at any frame rate
      // and a slow frame does not round it away.
      const owed = (this.sandOwed.get(a.id) ?? 0) + th.perSecond * dt;
      const n = Math.floor(owed);
      this.sandOwed.set(a.id, owed - n);
      if (n > 0) this.sand.emit(at, col, n, th.spread, th.speed, th.up, th.size, th.life);
    }
    // Bodies that left the sea while in the floor: the map is only ever a few entries deep.
    for (const id of this.burrowing.keys()) if (!game.byId(id)) { this.burrowing.delete(id); this.sandOwed.delete(id); }
  }
  /** Which bodies are in the seabed, so both the going in and the coming up are seen. */
  private burrowing = new Map<number, Exclude<BurrowPhase, 'none'>>();
  /** Fractional grains carried between frames, so a trickle is a rate and not a per-frame count. */
  private sandOwed = new Map<number, number>();

  /**
   * Prints in the sand, wherever a player's body actually touches the shore.
   *
   * **The contacts are measured, never named.** A rig's bones are whatever its builder called them
   * — three eras, a dozen kits and no agreement on `fore_foot_L` — so asking for the feet by name
   * would work on one animal and silently do nothing on the next. What a print is, is the part of
   * the body that is *on the sand*, so that is what is asked: the lowest few bones of the rig, and
   * whether each is within `touch` of the ground under it. On a walker standing on the beach the
   * lowest bones are its feet, and when one lifts it stops being down; on a body lying in the sand
   * they are its belly, and the belly never lifts. The same test gives footprints for the one and
   * a drag for the other with nothing in it that knows which animal it is looking at.
   *
   * `laysMark` then decides, and one rule covers both: a contact marks when it comes down, and
   * again every `spacing` it travels while it stays down. A planted foot does not travel, so it
   * prints once; a belly does nothing else, so it draws a groove.
   *
   * Presentation only. Nothing here is a rule and `src/sim` gains no event — it is read off `wade`
   * and the drawn pose, like the burrow's sand above it. Players only, because these are the marks
   * the player is being shown that they made.
   */
  private shoreTracks(game: Game) {
    for (const a of game.players) {
      const gait = isAlive(a) ? trackGait({
        legs: amphibious(a.creature), lungs: breathesAir(a.creature),
        wade: a.wade, length: lengthOf(a), clearance: floorClearance(a),
      }) : null;
      const view = gait ? this.views.get(a.id) : undefined;
      if (!gait || !view) { this.printed.delete(a.id); continue; }
      const bones = view.anchors.bones;
      if (!bones.length) continue;
      // The lowest `contacts` bones, by world height. Their matrices are last frame's until the
      // renderer walks the scene, and a print has to land where the foot is *now*.
      const n = Math.min(gait.contacts, this.lowY.length);
      let have = 0;
      for (const b of bones) {
        b.updateWorldMatrix(true, false);
        const e = b.matrixWorld.elements, y = e[13];
        if (have === n && y >= this.lowY[have - 1]) continue;
        let i = have < n ? have++ : n - 1;
        for (; i > 0 && this.lowY[i - 1] > y; i--) {
          this.lowY[i] = this.lowY[i - 1]; this.lowX[i] = this.lowX[i - 1]; this.lowZ[i] = this.lowZ[i - 1]; this.lowName[i] = this.lowName[i - 1];
        }
        this.lowY[i] = y; this.lowX[i] = e[12]; this.lowZ[i] = e[14]; this.lowName[i] = b.name || `bone${b.id}`;
      }
      let st = this.printed.get(a.id);
      if (!st) { st = new Map(); this.printed.set(a.id, st); }
      this.printSeen.clear();
      for (let i = 0; i < have; i++) {
        const x = this.lowX[i], y = this.lowY[i], z = this.lowZ[i], name = this.lowName[i];
        this.printSeen.add(name);
        const sand = sampleHeight(x, z);
        let c = st.get(name);
        if (!c) { c = { down: false, mx: x, mz: z }; st.set(name, c); }
        if (y - sand > gait.touch) { c.down = false; continue; }   // this part is off the sand
        const lay = laysMark(gait, c.down, Math.hypot(x - c.mx, z - c.mz));
        c.down = true;
        if (!lay) continue;
        c.mx = x; c.mz = z;
        // Sand only, and the shore only. A boulder stands proud of the seabed it sits on and
        // presses into nothing, out past the strand the sand is under the sea, and past
        // `LAND_REACH` is not the shore; `printableSand` answers all three.
        if (!printableSand({
          sand, ground: groundHeight(game.world, x, z, this.scratchBoulders), surfaceY: SURFACE_Y,
          inland: -shoreDistance(x, z), reach: LAND_REACH,
        })) continue;
        const h = TRACK_SLOPE;
        const dhdx = (sampleHeight(x + h, z) - sampleHeight(x - h, z)) / (2 * h);
        const dhdz = (sampleHeight(x, z + h) - sampleHeight(x, z - h)) / (2 * h);
        this.tracks.lay(x, sand + TRACK_LIFT, z, dhdx, dhdz, a.yaw, gait);
      }
      // A rig whose lowest bones have changed leaves the old ones behind; the map is a handful.
      for (const name of st.keys()) if (!this.printSeen.has(name)) st.delete(name);
    }
    for (const id of this.printed.keys()) if (!game.byId(id)) this.printed.delete(id);
  }
  /** Per player, per contact: was it down last frame, and where did it last leave a mark. */
  private printed = new Map<number, Map<string, { down: boolean; mx: number; mz: number }>>();
  private printSeen = new Set<string>();
  /** The lowest bones of one rig this frame, kept as plain numbers so a frame allocates nothing. */
  private lowX = new Float64Array(6); private lowY = new Float64Array(6); private lowZ = new Float64Array(6);
  private lowName: string[] = new Array(6).fill('');

  /**
   * Lungs leak when they work. A bag of air inside a body under water shows every time the body
   * spends itself: what a bimodal animal lets go of the mouth is the effort it just made, so the
   * bubbles are the stamina bar draining, seen from outside. A sprint streams them, a dash coughs a
   * handful, and hanging still or climbing — which costs nothing — releases none at all.
   *
   * Purely a look, so it lives in the renderer with its own randomness and reads the one creature
   * flag it needs; nothing in the Cambrian roster breathes both ways, so nothing there emits. Run
   * after `attachments.sync` so the mouth socket is posed, and skipped at the surface, where the
   * animal is breathing rather than holding it.
   */
  private breathe(game: Game, keep: Set<number>) {
    for (const [id, v] of this.views) {
      const a = keep.has(id) ? game.byId(id) : undefined;
      const breathing = a ? creature(a.creature).breathing : undefined;
      if (!a || !isAlive(a) || isHidden(a) || (breathing !== 'bimodal' && breathing !== 'air')) { this.breath.delete(id); continue; }
      const L = lengthOf(a);
      const prev = this.breath.get(id);
      this.breath.set(id, { stamina: a.stamina, owed: prev?.owed ?? 0 });
      // First sight of a body, or a bar that went up (regen, a breath, a respawn): nothing was spent.
      if (prev == null || a.stamina >= prev.stamina) continue;
      if (a.pos.y > SURFACE_Y - 3 - L * 0.3) continue;
      const entry = this.breath.get(id)!;
      entry.owed = prev.owed + (prev.stamina - a.stamina);
      // One bubble per few points of effort, so a whole bar vented is a couple of dozen of them.
      const n = Math.floor(entry.owed / 3.5);
      if (n < 1) continue;
      entry.owed -= n * 3.5;
      const at = v.anchors.world('anchor_mouth', this.tmpV)
        ? { x: this.tmpV.x, y: this.tmpV.y, z: this.tmpV.z }
        : { x: a.pos.x + Math.sin(a.yaw) * L * 0.45, y: a.pos.y + L * 0.05, z: a.pos.z + Math.cos(a.yaw) * L * 0.45 };
      this.bubbles.emit(at, Math.min(12, n), L * 0.1, 0.35, Math.min(0.18, 0.035 + L * 0.03), 1.6 + L * 0.2);
    }
  }
  private breath = new Map<number, { stamina: number; owed: number }>();

  /**
   * A mouthful comes off the carcass: the eaten share stops being drawn on the body, and the
   * slice that just left it is baked out of the pose and flown into the eater's mouth.
   */
  private tearOff(corpse: Actor, eaterId: number | undefined, share: number) {
    const view = this.views.get(corpse.id); if (!view) return;
    const eater = eaterId != null ? this.views.get(eaterId) : undefined;
    // Which end goes first is decided by where the mouth was for the opening bite.
    if (eater?.anchors.world('anchor_mouth', this.tmpV)) view.carcass.faceEater(this.tmpV);
    const to = corpse.eaten, from = Math.max(0, to - share);
    const chunk = view.carcass.sliceChunk(from, to);
    view.carcass.setEaten(to);
    if (!chunk) return;
    const mouth = new THREE.Vector3();
    const id = eaterId;
    this.mouthfuls.add(chunk, () => {
      const ev = id != null ? this.views.get(id) : undefined;
      if (ev?.anchors.world('anchor_mouth', mouth)) return mouth;
      const a = id != null ? this.game?.byId(id) : undefined;
      return a ? mouth.set(a.pos.x, a.pos.y, a.pos.z) : undefined;
    });
  }

  /** Impact effects land where the attacker's nearest attack socket is, not at the victim's centre, when the rig has one. */
  private impactPos(attackerId: number | undefined, victimId: number | undefined, fallback: { x: number; y: number; z: number }) {
    const victim = victimId != null && victimId >= 0 ? this.game?.byId(victimId) : undefined;
    const pv = attackerId != null && attackerId >= 0 ? this.views.get(attackerId) : undefined;
    if (!pv || !this.attachments.contactPoint(pv, fallback, this.contact)) return fallback;
    // A socket far from the body it supposedly hit means the clip has not reached it: keep the sim's point.
    const limit = victim ? lengthOf(victim) * 0.9 + 0.3 : 1;
    const off = Math.hypot(this.contact.x - fallback.x, this.contact.y - fallback.y, this.contact.z - fallback.z);
    return off < limit ? { x: this.contact.x, y: this.contact.y, z: this.contact.z } : fallback;
  }

  /** Per-viewport pass: cull views outside this camera, then set the highlights for this viewer. */
  private prepareViewport(playerIndex: number, viewer?: Actor, cs?: CamState) {
    const game = this.game!;
    // This viewport's own camera and water colour: setViewLength has already applied the biome's
    // fog for it, so the haze washes distant bodies toward exactly the water they are seen through.
    const camPos = cs?.camera.position ?? this.attractCam.position;
    const camFar = cs?.camera.far ?? this.attractCam.far;
    if (cs) {
      cs.camera.updateMatrixWorld();
      cs.projScreen.multiplyMatrices(cs.camera.projectionMatrix, cs.camera.matrixWorldInverse);
      cs.frustum.setFromProjectionMatrix(cs.projScreen);
    }
    for (const [id, v] of this.views) {
      const a = game.byId(id);
      if (!a) continue;
      // Creature meshes have frustumCulled off (skinned bounds are unreliable), so cull the group here.
      if (cs) {
        this.cullSphere.center.copy(v.group.position);
        this.cullSphere.radius = lengthOf(a) * 0.9 + 0.5;
        v.group.visible = (!isHidden(a) || a.hideT <= 0.6) && cs.frustum.intersectsSphere(this.cullSphere);
        if (!v.group.visible) continue;
      }
      const haze = distanceHaze(Math.hypot(v.group.position.x - camPos.x, v.group.position.y - camPos.y, v.group.position.z - camPos.z), camFar);
      v.setHaze(haze);
      if (!viewer || a.state === 'dead' || a.state === 'swallowed') { v.setHighlight(0); continue; }
      if (a.id === viewer.id) { v.setHighlight(0); continue; }
      const band = bandOf(viewer, a);
      const d = Math.hypot(a.pos.x - viewer.pos.x, a.pos.y - viewer.pos.y, a.pos.z - viewer.pos.z);
      const L = lengthOf(viewer);
      const sensing = viewer.senseT > 0 && d < creature(viewer.creature).sense * L * 1.2;
      const locked = viewer.lockTarget === a.id;
      const huntingMe = a.brain?.target === viewer.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
      if (huntingMe) { v.setHaze(haze * HUNTER_HAZE); v.setHighlight(a.brain!.goal === 'hunt' ? 0.45 + 0.3 * Math.sin(this.time * 10) : 0.25 + 0.1 * Math.sin(this.time * 6), '#ff4b5c'); }
      else v.setHighlight(sensing ? 0.55 + 0.25 * Math.sin(this.time * 9) : locked ? 0.12 : 0, BAND_COLOR[band]);
    }
  }

  /**
   * Refresh the audio listeners from the cameras. One listener per split-screen view (or the
   * attract camera), each carrying the camera distance that view is framed at, which sets the
   * scale of the falloff in `hearing()`.
   */
  private syncListeners(game: Game) {
    const add = (i: number, cam: THREE.PerspectiveCamera, ref: number) => {
      let l = this.listeners[i];
      if (!l) l = this.listeners[i] = { pos: new THREE.Vector3(), right: new THREE.Vector3(), ref };
      cam.updateMatrixWorld();
      l.pos.copy(cam.position);
      l.right.setFromMatrixColumn(cam.matrixWorld, 0).normalize();   // camera-space +X, for panning
      l.ref = ref;
    };
    if (this.attract) {
      add(0, this.attractCam, 6);
      this.listeners.length = 1;
      return;
    }
    this.cams.forEach((cs, i) => {
      const p = game.players[i];
      add(i, cs.camera, magnificationDistance(p ? lengthOf(p) : 1) * cs.zoom);
    });
    this.listeners.length = this.cams.length;
  }

  /**
   * How loud, and how far to the side, a sound at `pos` is for the nearest local view.
   * `atten` is 1 at the camera and reaches 0 at the edge of earshot, so the reef's constant
   * chatter of distant grazers and scuffles fades out instead of piling up at full volume.
   */
  private hearing(pos: { x: number; y: number; z: number }): { atten: number; pan: number } {
    let atten = 0, pan = 0;
    for (const l of this.listeners) {
      const dx = pos.x - l.pos.x, dy = pos.y - l.pos.y, dz = pos.z - l.pos.z;
      const d = Math.hypot(dx, dy, dz);
      const a = distanceAtten(d, l.ref);
      if (a > atten) {
        atten = a;
        pan = d > 0.001 ? clamp((dx * l.right.x + dy * l.right.y + dz * l.right.z) / d, -1, 1) * 0.75 : 0;
      }
    }
    return { atten, pan };
  }

  private handleEvents(game: Game) {
    const evs = game.events;
    if (!evs.length) return;
    this.syncListeners(game);
    for (const e of evs) {
      const playerActor = e.player != null && e.player >= 0 ? game.players[e.player] : undefined;
      const padOf = (pi: number | undefined) => (pi != null && pi >= 0 ? this.setups[pi]?.device : undefined);
      /** A world sound: attenuated and panned by where it happened. */
      const world = (kind: string, at: { x: number; y: number; z: number }, strength = 1, scale = 1) => {
        const h = this.hearing(at);
        audio.play(kind, strength, h.pan, h.atten * scale);
      };
      /** A sting that is about *you* — only played for a local player, and never attenuated. */
      const personal = (kind: string, strength = 1) => { if (e.player != null && e.player >= 0) audio.play(kind, strength); };
      /**
       * Big bodies get their own take of a sound. The Devonian roster runs 4-11.5 m against the
       * Cambrian's 1-3.9 m, and without this a Titanichthys hits exactly as hard as a larva.
       */
      const heavy = (kind: string, id: number | undefined) => {
        const a = id != null ? game.byId(id) : undefined;
        const big = `${kind}-huge`;
        return a && lengthOf(a) >= hugeLength() && SAMPLES[big] ? big : kind;
      };
      switch (e.kind) {
        case 'hit': {
          const s = e.strength ?? 1;
          const at = this.impactPos(e.actor, e.other, e.pos);
          this.bubbles.emit(at, Math.round(6 + s * 10), 0.4, 2 + s * 2, 0.07);
          this.impacts.spawn(at, '#ffd0a0', 0.5 + s * 0.8, 0.28);
          world(heavy('hit', e.actor), at, s);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.4 + s * 0.4), 0.3, 120); this.shake(e.player, 0.5 + s * 0.5); }
          const attacker = game.byId(e.actor);
          if (attacker?.player != null && attacker.player >= 0) { const d = padOf(attacker.player); if (typeof d === 'number') rumble(d, 0.25, 0.5, 70); }
          break;
        }
        case 'kill': { this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.8); this.impacts.spawn(e.pos, '#ff8a6a', 1.5 + (e.strength ?? 1), 0.5); world('kill', e.pos); if (playerActor) this.shake(e.player!, 0.7); break; }
        case 'death': { const dk = heavy('death', e.actor); if (e.player != null && e.player >= 0) audio.play(dk); else world(dk, e.pos, 1, 0.7); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 400); this.shake(e.player, 1.4); } break; }
        case 'eat': {
          const s = e.strength ?? 0.5;
          const big = s > 0.5 && heavy('crunch', e.actor) === 'crunch-huge';
          this.bubbles.emit(e.pos, 5, 0.3, 1.2, 0.05, 0.8); world(big ? 'crunch-huge' : 'eat', e.pos, s);
          // A body eaten in bites loses that share of itself, and the mouthful flies to the mouth.
          const corpse = e.other != null ? game.byId(e.other) : undefined;
          if (corpse && corpse.eatBites > 1 && e.strength) this.tearOff(corpse, e.actor, e.strength);
          break;
        }
        case 'tierUp': { this.bubbles.emit(e.pos, 90, 2.5, 5, 0.14, 2.2); this.impacts.spawn(e.pos, '#fff0b0', 4 + (e.strength ?? 1) * 2, 0.9); if (e.player != null && e.player >= 0) audio.play('tierUp'); else world('tierUp', e.pos, 1, 0.6); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.8, 0.8, 600); this.shake(e.player, 0.8); } break; }
        case 'parry': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#9ff6ff', 2, 0.4); this.bubbles.emit(at, 20, 0.6, 5, 0.08); world(RULES && e.strength != null && e.strength < 1 ? (e.strength < 0.5 ? 'armour' : 'armourPierce') : 'parry', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.9, 0.2, 90); } break; }
        case 'guardBreak': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#ff6a5a', 1.8, 0.4); world('guardBreak', at); break; }
        case 'stagger': { world('stagger', e.pos); break; }
        case 'dodge': { this.bubbles.emit(e.pos, 14, 0.8, 2.5, 0.06, 0.7); world(heavy('dodge', e.actor), e.pos); break; }
        case 'silt': { this.bubbles.emit(e.pos, 30, 1.5, 2, 0.08, 1.2); world('silt', e.pos); break; }
        // A special is your own action, not something happening to you, so its tell is the quietest
        // in the game: a few sparkles close to the body that say "this one is not the ordinary
        // heavy". Deliberately under the shoal-join burst, and well under anything that means
        // damage — a flash here read as being hit or respawning, which is why it is gone.
        case 'ability': { const len = e.strength ?? 1; this.sparkles.emit(e.pos, Math.round(5 + len * 2), 0.25 + len * 0.18, 0.25 + len * 0.1, 0.035, 0.5); this.bubbles.emit(e.pos, 20, 1, 3, 0.08); const ab = game.byId(e.actor); const key = ab ? `ability:${creature(ab.creature).ability}` : 'ability'; world(SAMPLES[key] ? key : 'ability', e.pos); break; }
        case 'shellCrush': { this.impacts.spawn(e.pos, '#ffd9a0', 2.2, 0.5); this.bubbles.emit(e.pos, 28, 0.8, 4, 0.1, 1.4); world('shellCrush', e.pos); break; }
        case 'grab': { const at = this.impactPos(e.actor, e.other, e.pos); this.impacts.spawn(at, '#ffb070', 1.4, 0.35); world('grab', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 0.6, 300); } break; }
        case 'hunted': { personal('hunted'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.6, 0.9, 500); } break; }
        case 'escape': { personal('escape'); break; }
        case 'noticed': { personal('noticed', 0.5); break; }
        case 'sense': { if (e.player != null && e.player >= 0) audio.play('sense'); else world('sense', e.pos, 1, 0.5); break; }
        case 'swallow': { world('swallow', e.pos, 1.2); this.bubbles.emit(e.pos, 30, 1, 3, 0.09, 1.5); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 900); this.shake(e.player, 1.2); } break; }
        case 'disintegrate': { this.sparkles.emit(e.pos, Math.round(28 + (e.strength ?? 1) * 10), 0.5 + (e.strength ?? 1) * 0.25, 0.9, 0.06, 2.2); world('disintegrate', e.pos, 0.6); break; }
        case 'routed': { world('routed', e.pos, 0.8); this.impacts.spawn(e.pos, '#9ff6ff', 2.5, 0.6); break; }
        case 'pounce': { this.impacts.spawn(e.pos, '#ffe08a', 1.2 + (e.strength ?? 1) * 0.5, 0.35); this.bubbles.emit(e.pos, 24, 0.9, 4, 0.08); world('pounce', e.pos, 1.3); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.7, 0.4, 140); this.shake(e.player, 0.6); } break; }
        // A jet is a discrete shove — a nautiloid empties its funnel and stops — so it keeps its
        // sting. Ordinary sprinting is a bed instead (`audio.setSprint`, driven below from the
        // frame's own inputs): it is held down for minutes at a time, and one loud whoosh per press
        // was the single most repeated sound in the game.
        case 'burst': { const b = game.byId(e.actor); if (b && RULES?.jet(b)) { world('jet', e.pos); this.bubbles.emit(e.pos, 30, 0.9, 3, 0.1, 1.4); } break; }
        // Coming out of an egg: a wet tear as the soft shell opens.
        case 'eggPoke': { if (e.player != null && e.player >= 0) audio.play('eggPoke', 0.7); else world('eggPoke', e.pos, 0.7, 0.5); break; }
        case 'hatch': { if (e.player != null && e.player >= 0) audio.play('hatch'); else world('hatch', e.pos, 1, 0.5); break; }
        // Hatching out of a nursery after a respawn (the moult state is reused for the hatch-in).
        case 'moult': { if (e.player != null && e.player >= 0) audio.play(e.strength === 1 && RULES ? 'moult' : 'respawn'); else world('respawn', e.pos, 1, 0.5); break; }
        // Era events (Devonian). Their samples are registered by the era's entry page; an
        // unregistered kind is silent, so the Cambrian build never reaches for a missing file.
        case 'breach': {
          // a sheet of water dragged up with the body as it leaves the sea, and bubbles under it
          const b = game.byId(e.actor), bl = b ? lengthOf(b) : 1;
          this.splash.burst(e.pos, e.strength ?? 1, 'out', bl);
          this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.6);
          world('breach', e.pos, e.strength ?? 1);
          break;
        }
        case 'splash': {
          // the landing: a crown of droplets, a ring spreading on the surface, a cloud of bubbles below
          const s = e.strength ?? 1, b = game.byId(e.actor), bl = b ? lengthOf(b) : 1;
          this.splash.burst(e.pos, s, 'in', bl);
          this.bubbles.emit(e.pos, Math.round(70 * s), 1.6, 6, 0.12, 2.4);
          world('splash', e.pos, s);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.5 * s), 0.6, 220); this.shake(e.player, 0.6 * s); }
          break;
        }
        // The blow. The body itself never leaves the water for this — the swim ceiling holds it a
        // little under the surface — so with only bubbles under the camera a breath looked exactly
        // like not taking one, and a player who had surfaced could not tell that they had. The
        // surface says it instead: a head-sized crown of spray and a ring spreading off it, at
        // SURFACE_Y above the body rather than at the body, which is where the water is broken.
        case 'gulp': {
          const b = game.byId(e.actor), bl = b ? lengthOf(b) : 1, broken = e.strength ?? 1;
          // `strength` is how much water this breath breaks: a whole body, a neck sent up alone, or
          // nothing at all when the breath was taken on the sand and the sea is below the animal.
          if (broken > 0) this.splash.burst({ x: e.pos.x, y: SURFACE_Y, z: e.pos.z }, 0.3 + 0.5 * broken, 'out', bl * 0.5 * broken);
          this.bubbles.emit(e.pos, 24, 1.0, 3, 0.09, 1.4);
          // ...and the camera comes up with the animal to watch it happen. It is otherwise held
          // under the waterline at all times (see the ceiling in `updateCamera`), so a breath took
          // place just off the top of the screen and the player's own view of it was the water.
          if (broken > 0 && e.player != null && e.player >= 0) { const cs = this.cams[e.player]; if (cs) cs.breathT = BREATH_PEEK; }
          const sized = bl < 4 ? 'gulp-small' : bl >= hugeLength() ? 'gulp-giant' : 'gulp-mid';
          const gulp = SAMPLES[sized] ? sized : 'gulp';
          if (e.player != null && e.player >= 0) audio.play(gulp); else world(gulp, e.pos);
          break;
        }
        // The winded heartbeat, and a thin trickle of bubbles escaping with it: a body that
        // recovers badly under water, running low on stamina and a long way from the surface that
        // would hand it all back. `strength` is how spent it is.
        case 'winded': {
          const s = e.strength ?? 0;
          // Under the camera's nose a puff of bubbles every beat reads as a white flash, so the
          // spill is a thin one and the cue is quiet: this is a body running low, not an alarm.
          this.bubbles.emit(e.pos, 1 + Math.round(2 * s), 0.4, 1.4, 0.04, 0.8);
          personal('winded', 0.18 + 0.22 * s);
          break;
        }
        case 'shoreStrike': { world('shoreStrike', e.pos, 1, 1); break; }
        case 'anoxia': { personal('anoxia', 0.8); break; }
        case 'flop': { personal('flop', 0.75); break; }
        case 'beach': { if (e.strength) { this.bubbles.emit(e.pos, 12, 0.5, 2, 0.06, 1); personal('beach', 0.9); } break; }
        case 'shoalJoin': { this.sparkles.emit(e.pos, 16, 0.6, 1.2, 0.05, 1.2); personal('shoalJoin', 0.7); break; }
        case 'teleport': {
          // sparkles where they left and where they arrived; the camera snaps behind them on arrival
          this.sparkles.emit(e.pos, e.strength ? 50 : 30, 0.9, 1.4, 0.07, 1.8);
          this.bubbles.emit(e.pos, 20, 0.8, 3, 0.07, 1.2);
          if (e.strength) {
            personal('ability', 0.8);
            this.sea?.prime(e.pos.x, e.pos.z, 220);     // arrive on solid ground, not in a hole
            if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.5, 0.7, 250); }
          }
          break;
        }
      }
    }
    evs.length = 0;
  }

  private shake(player: number, amount: number) { const cs = this.cams[player]; if (cs) cs.shake = Math.min(1.6, cs.shake + amount * 0.6); }

  private snapshot(game: Game, rects: Rect[]): HudSnapshot {
    const players: PlayerHud[] = game.players.map((p, i) => {
      const def = creature(p.creature);
      const cs = this.cams[i];
      const lockA = p.lockTarget >= 0 ? game.byId(p.lockTarget) : undefined;
      const hunter = p.hunterId >= 0 ? game.byId(p.hunterId) : undefined;
      let hunterAngle: number | null = null;
      if (hunter && cs && p.hunted > 0.15) {
        const v = this.tmpProj.set(hunter.pos.x, hunter.pos.y, hunter.pos.z).project(cs.camera);
        const onScreen = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
        if (!onScreen) hunterAngle = Math.atan2(v.y * (v.z > 1 ? -1 : 1), v.x * (v.z > 1 ? -1 : 1));
      }
      const era = RULES?.hud(game, i);
      const scheme = schemeForDevice(this.setups[i]?.device ?? 'keyboard', this.mouseLook);
      // Sense off: nothing is drawn over the sea, so there is nothing to work out either.
      const markers: PlayerHud['bandMarkers'] = [];
      if (cs && p.senseMode) {
        const L = lengthOf(p);
        for (const a of game.actors) {
          if (a.id === p.id || !isAlive(a) || isHidden(a) || a.controller === 'swarm') continue;
          const d = Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y, a.pos.z - p.pos.z);
          const band = bandOf(p, a);
          if (band === 'snack' || band === 'prey') continue;
          if (d > 90 && band !== 'giant') continue;
          const v = this.tmpProj.set(a.pos.x, a.pos.y + lengthOf(a) * 0.4, a.pos.z).project(cs.camera);
          if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
          if (band === 'rival' && d > L * 12 + 10 && p.senseT <= 0) continue;
          // Red is for something that is actually coming for you. Everything else is a calm mark
          // whose glyph still says how big it is — a marker over every large animal in sight made
          // the warning mean "big", which is not what a warning is for.
          markers.push({ x: (v.x + 1) / 2, y: (1 - v.y) / 2, band, size: clamp(lengthOf(a) / Math.max(d, 1) * 8, 0.4, 1.6), hot: comingFor(a, p) });
        }
      }
      // Radar: reach grows with the creature, contacts rotate into the camera frame (up = camera forward).
      const radarRange = radarReach(p);
      const blips: RadarBlipHud[] = [];
      if (cs && p.senseMode) {
        const sy = Math.sin(cs.yaw), cy = Math.cos(cs.yaw);
        // Above or below counts once the gap is more than a body or two; inside that the contact is
        // level with you for all practical purposes and the mark should not keep changing colour.
        const levelBand = Math.max(2.5, lengthOf(p) * 1.5);
        for (const b of game.radarFor(i, radarRange)) {
          // forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
          const f = (b.dx * sy + b.dz * cy) / radarRange, r = (-b.dx * cy + b.dz * sy) / radarRange;
          let x = r, y = -f;
          const l = Math.hypot(x, y);
          const beyond = l > 1;
          if (beyond) { x /= l; y /= l; }
          const level = b.kind === 'home' || b.kind === 'shore' || b.kind === 'landmark' || b.kind === 'territory' || Math.abs(b.dy) < levelBand
            ? undefined : b.dy > 0 ? 'above' as const : 'below' as const;
          // A shoal overhead is a different decision from one on the sand — rise for it, or dive —
          // so it gets its own colour rather than sitting on the dial as the same green mark.
          // Same rule as the on-screen marks: the dial goes red for a contact that is hunting you,
          // and a big animal going about its business is a contact like any other.
          const color = b.kind === 'player' ? PLAYER_COLORS[b.id % 4] : b.hunting ? BAND_COLOR.giant : b.kind === 'giant' || b.kind === 'threat' ? CALM_MARK
            : b.kind === 'food' ? (level === 'above' ? FOOD_ABOVE : BAND_COLOR.snack) : b.kind === 'home' ? '#9be9ff' : b.kind === 'landmark' ? '#ffd9a0'
            : b.kind === 'territory' ? BAND_COLOR.rival : '#d9cfa4';
          blips.push({ x, y, kind: b.kind, color, beyond, hunting: b.hunting, distance: b.distance, r: b.radius != null ? b.radius / radarRange : undefined, level });
        }
        // Dead zones are areas, not contacts: drawn as rings, clamped to the rim like anything else.
        if (era) for (const z of era.deadZones) {
          const f = (z.dx * sy + z.dz * cy) / radarRange, r = (-z.dx * cy + z.dz * sy) / radarRange;
          let x = r, y = -f;
          const l = Math.hypot(x, y), beyond = l > 1;
          if (beyond) { x /= l; y /= l; }
          blips.push({ x, y, kind: 'deadzone', color: '#8fd66a', beyond, hunting: false, distance: Math.hypot(z.dx, z.dz), r: z.r / radarRange });
        }
      }
      const tele = cs?.tele.open && !cs.tele.swap.open
        ? { options: [...game.teleportOptions(i).map((o) => ({ label: o.label, detail: o.detail, distance: o.distance, dest: o.dest })),
                      { label: TEXT.hud.teleport.changeCreature, detail: TEXT.hud.teleport.changeCreatureDetail, distance: 0, dest: 'home' as TeleportDest }],
            index: cs.tele.index, cooldown: p.teleportCd }
        : undefined;
      let swap: PlayerHud['swap'];
      if (cs?.tele.open && cs.tele.swap.open) {
        const roster = game.swapOptions(i, cs.tele.swap.grown);
        const pick = roster[cs.tele.swap.index % Math.max(1, roster.length)];
        if (pick) {
          const def = creature(pick.id);
          swap = { name: def.name, kind: def.kind, creature: pick.id, rung: ladderName(pick.mark), fill: fillOf(pick.mark), kept: pick.kept, grown: cs.tele.swap.grown, count: roster.length, index: cs.tele.swap.index };
        }
      }
      const board = cs?.showBoard ? game.scoreboard(i) : undefined;
      // Co-op: team-mates on the floor waiting to be picked up, as a bearing this player can follow.
      const downed: PlayerHud['downedAllies'] = [];
      if (cs) for (let j = 0; j < game.players.length; j++) {
        const o = game.players[j];
        if (j === i || !o || o.state !== 'dead') continue;
        const seconds = game.reviveWindow(o);
        if (seconds <= 0) continue;
        const dx = o.pos.x - p.pos.x, dz = o.pos.z - p.pos.z;
        const sy = Math.sin(cs.yaw), cy = Math.cos(cs.yaw);
        const f = dx * sy + dz * cy, r = -dx * cy + dz * sy;
        const l = Math.max(1e-3, Math.hypot(f, r));
        downed.push({ index: j, name: creature(o.creature).name, color: PLAYER_COLORS[j % 4], seconds, distance: Math.hypot(dx, dz), x: r / l, y: -f / l, progress: game.reviveProgress(o) });
      }
      // Versus: a dead player watches the leader rather than their own sinking body.
      // Who killed this player, named the way the rest of the HUD names bodies: another player by
      // their seat, anything else by its species.
      const killerId = p.swallowedBy >= 0 ? p.swallowedBy : p.killer;
      const killer = killerId >= 0 ? game.byId(killerId) : undefined;
      const nameOf = (a: Actor | undefined) => (a ? (a.player >= 0 ? TEXT.common.playerChip(a.player + 1) : creature(a.creature).name) : undefined);
      const watched = this.spectatorTarget(game, i);
      const spectate = watched ? { index: watched.player, name: TEXT.common.playerChip(watched.player + 1), color: PLAYER_COLORS[watched.player % 4], creature: watched.creature } : undefined;
      let aim: PlayerHud['aim'];
      // On a mouse the *cursor* is the crosshair (`src/shared/cursors.ts`), so the reticle is off:
      // two crosshairs on one screen, one of them nailed to the middle, is worse than either alone.
      if (p.aiming && cs && !this.mouseLook) {
        const t = lockA && isAlive(lockA) ? lockA : undefined;
        const heavyMove = game.heavyMove(p);
        // A finger keeps the reticle and takes it *with* it. The mouse has a cursor doing this job
        // and so draws none; a pad has no pointer at all and so draws it in the middle, which is
        // where its aim axis is. Touch is the third case and needs both halves: a mark to aim by,
        // standing where the player last pointed, and back in the middle once that has lapsed.
        const at = this.touchPlay ? this.touchFrame?.ndc : undefined;
        aim = { hasTarget: !!t, inRange: !!t && p.aimInRange, name: t ? creature(t.creature).name : undefined, color: t ? BAND_COLOR[bandOf(p, t)] : '#eefaf6', ready: heavyMove.ready, action: heavyMove.name, at: at ? { x: at.x, y: at.y } : undefined };
      }
      return {
        index: i, creature: p.creature, color: PLAYER_COLORS[i % 4], alive: p.state !== 'dead', aim,
        scheme,
        hp: p.hp, hpMax: p.hpMax, hunger: game.mode === 'survival' ? p.hunger : undefined, stamina: p.stamina, staminaMax: p.staminaMax, exhausted: p.exhausted > 0,
        tier: p.tier, tierName: era ? `${era.stage} · ${era.rungName}` : TIER_NAMES[p.tier], // The ring means the same thing in both eras: how close the next moult is, full when it lands.
        progress: era ? era.stageProgress : p.tier >= 4 ? 1 : clamp(p.nutrition / TIER_NEED[p.tier], 0, 1), scale: p.scale,
        abilityName: p.hideMode === 'descending' ? TEXT.sim.hide.sinking : p.hideMode === 'burrowed' ? TEXT.sim.hide.buried(controlKey('ability', scheme)) : p.hideMode === 'camouflage' ? TEXT.sim.hide.camouflaged(p.camoLabel) : RULES?.ySpecial(p.creature)?.name ?? hideLabel(p.creature), abilityReady: p.hideMode === 'camouflage' ? p.stamina / p.staminaMax : RULES?.ySpecial(p.creature) ? 1 - clamp(p.abilityCd / Math.max(1, creature(p.creature).abilityCooldown), 0, 1) : 1 - clamp(p.hideCd / 2, 0, 1), abilityActive: p.hideMode !== 'none' || (p.state === 'ability' && !!RULES?.ySpecial(p.creature)), abilityUnlocked: true,
        senseOn: p.senseMode,
        lock: lockA && isAlive(lockA) ? { name: creature(lockA.creature).name, kind: creature(lockA.creature).kind, band: bandOf(p, lockA), hp: lockA.hp / lockA.hpMax, color: BAND_COLOR[bandOf(p, lockA)] } : undefined,
        hunted: p.hunted, hunterAngle, hunterName: hunter ? creature(hunter.creature).name : undefined,
        ashore: p.ashore, strandLeft: p.ashore && !breathesAir(p.creature) ? clamp(1 - p.strandT / STRAND_BREATH, 0, 1) : undefined,
        strandLow: p.ashore && !breathesAir(p.creature) && STRAND_BREATH - p.strandT < STRAND_LOW,
        hunterState: p.hunted >= 0.5 ? 'hunting' : p.hunted > 0.2 ? 'noticed' : 'none', inCover: p.cover > 0.3, still: Math.hypot(p.vel.x, p.vel.y, p.vel.z) < 0.3,
        hint: game.hintFor(i), respawnIn: p.state === 'dead' ? Math.max(0, (game.reviveWindow(p) || CORPSE_WINDOW) - (game.reviveWindow(p) ? 0 : p.respawnT)) : 0, fade: cs?.fade ?? 0, state: p.state, modelReady: !!loadedSync(p.creature),
        downedFor: game.reviveWindow(p), reviveProgress: game.reviveProgress(p), downedAllies: downed, spectating: spectate,
        death: p.state === 'dead' || p.state === 'swallowed' ? { eaten: p.swallowedBy >= 0 || p.eaten > 0, by: nameOf(killer) } : undefined,
        kills: p.kills, eats: p.eats, escapes: p.escapes, protect: p.spawnProtect > 0, bandMarkers: markers.slice(0, 24),
        grip: game.gripFor(i), biome: BIOME_NAMES[game.biomeOf(i) ?? 'shelf'], day: game.dayPhase(), radar: { range: radarRange, blips }, teleport: tele, swap, board, notice: game.noticeFor(i), era,
      };
    });
    return {
      players, rects, time: game.time, status: game.state.status, message: game.state.message, mode: game.mode, winner: game.state.winner, fps: this.fps,
      canContinue: game.state.status !== 'playing' && isCoop(game.mode),
      discovery: { biomes: [...game.discovery.biomes], landmarks: [...game.discovery.landmarks], apex: [...game.discovery.apex], best: Object.fromEntries(game.discovery.best) },
      day: game.dayPhase(),
    };
  }

  /** Live render/sim counters, for profiling. */
  stats() {
    const info = this.renderer.info;
    return {
      players: this.cams.length, views: this.views.size, actors: this.game?.actors.length ?? 0,
      calls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length ?? 0,
      sea: this.sea?.stats(), simChunks: this.game?.world.chunks.size ?? 0,
      frameMs: +this.frameMs.toFixed(2), simMs: +this.simMs.toFixed(2), renderMs: +this.renderMs.toFixed(2), fps: +this.fps.toFixed(1),
    };
  }
  private frameMs = 0; private simMs = 0; private renderMs = 0;

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.keyboard.dispose();
    this.mouse.dispose();
    this.touch.dispose();
    this.assets.dispose();
    this.clearMatch();
    this.sea?.dispose();
    this.bubbles.dispose(); this.splash.dispose(); this.sparkles.dispose(); this.impacts.dispose(); this.silt.dispose(); this.sand.dispose(); this.tracks.dispose();
    this.shieldGeo.dispose();
    this.mouthfuls.dispose(); this.eggs.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export { TAU };
