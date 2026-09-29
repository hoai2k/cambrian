/**
 * The HUD contract: what the engine hands the shell every few frames, and the one colour per seat
 * that both the HUD and the pick screen draw a player in. Types and one table, so `src/app` can
 * draw a match without importing the renderer.
 */
import type { CreatureId } from '../sim/creatures';
import type { GripHud, ScoreHeader, ScoreRow, TeleportDest } from '../sim/game';
import type { Phase } from '../sim/daynight';
import type { Band, Mode } from '../sim/types';
import type { Biome, LandmarkKind } from '../sim/world';
import type { EraHud } from '../sim/era-rules';
import type { Scheme } from './controls';

/** One seat's view, in CSS pixels of the game's container. */
export interface ViewportRect { x: number; y: number; w: number; h: number; }
export interface PlayerHud {
  index: number; creature: CreatureId; color: string; alive: boolean;
  /** What this player is holding, so every prompt on their half of the screen names their buttons. */
  scheme: Scheme;
  hp: number; hpMax: number; hunger?: number; stamina: number; staminaMax: number; exhausted: boolean;
  tier: number; tierName: string; progress: number; scale: number;
  abilityName: string; abilityReady: number; abilityActive: boolean; abilityUnlocked: boolean;
  lock?: { name: string; kind?: string; band: Band; hp: number; color: string };
  /**
   * Something this player could eat is right in front of them, near the middle of their view. Only
   * worked out for a touch seat, where it is what tells a new player the aim pad exists.
   */
  preyAhead?: boolean;
  aim?: {
    hasTarget: boolean; inRange: boolean; name?: string; color: string; band?: Band; ready: boolean;
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
  touchMark?: { kind: 'target' | 'zoom'; at: { x: number; y: number } };
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
  /** Survival: whose viewport this one is borrowing while dead. */
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
  players: PlayerHud[]; rects: ViewportRect[]; time: number; status: 'playing' | 'won' | 'lost'; message: string; mode: Mode; winner: number; fps: number;
  /** This match is over but its mode is co-op, so the results screen can offer to carry on. */
  canContinue: boolean;
  /** What this match turned up, for the results screen's record. */
  discovery: { biomes: Biome[]; landmarks: LandmarkKind[]; apex: CreatureId[]; best: Partial<Record<CreatureId, number>> };
  /** The hour of the day: what it is, how long until it turns, and how much the reef is hunting. */
  day: { phase: Phase; until: number; pressure: number };
}

/** One colour per seat, in seat order. */
export const PLAYER_COLORS = ['#61f2d5', '#ffb457', '#c7a3ff', '#ff86a4'];
