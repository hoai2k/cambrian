import type { MusicTrack } from '../audio/music';
import type { CreatureDef, CreatureId } from './creature-types';
import type { Biome, FloraKind } from '../sim/world';
import type { Mode } from '../sim/types';
import type { Slot, Scheme } from '../shared/palettes';
import type { PortraitRecord } from '../shared/portrait-match';

/** Plain data only: safe to import from the deterministic simulation and Node tooling. */
/** A selectable mode and the copy the selection screen shows for it. */
export interface ModeInfo { readonly id: Mode; readonly name: string; readonly blurb: string; readonly players: string; }

/** The words the shell shows around a match; everything else in the UI is shared. */
export interface EraCopy {
  /** Title-screen tagline and its emphasised second half. */
  readonly tagline: string;
  readonly taglineEm: string;
  /** Title-screen "press start" placeholder while assets load. */
  readonly loading: string;
  /** Results eyebrow when nobody won. */
  readonly lose: string;
  /** localStorage key for the settings panel, so two eras on one origin keep separate settings. */
  readonly settingsKey: string;
  /** Portrait-orientation title art, when the era has one. */
  readonly mobileIllustration?: string;
  /**
   * The other era in this build, linked from the bottom of the title screen so the two are one
   * step apart. `path` is joined to the app base, so it is where that era's page sits relative to
   * this one's asset root: '' is the build root, 'devonian/' the page one level down.
   */
  readonly sibling?: { readonly title: string; readonly path: string; readonly blurb: string };
}

/** Render-only replacements for existing scenery placements; never changes world generation. */
export interface InstancedScenery {
  readonly props: Readonly<Record<string, {
    readonly path: string;
    readonly material: 'rock' | 'sponge' | 'algae';
    readonly sway?: boolean;
    readonly bend?: boolean;
    readonly doubleSided?: boolean;
  }>>;
  readonly flora: Readonly<Partial<Record<FloraKind, string>>>;
  /** Dense authored flora can opt into the existing high tier; rocks are independent. */
  readonly minimumFloraQuality?: 'high';
  readonly rocks?: Readonly<Partial<Record<'boulder' | 'blade-spire' | 'talus-shard' | 'pebble-cluster', string>>>;
}

export interface EraDefinition {
  readonly id: string;
  readonly title: string;
  readonly copy: EraCopy;
  /** The modes this era offers, in selection order. The simulation's win checks are keyed by id. */
  readonly modes: readonly ModeInfo[];
  readonly creatures: readonly CreatureDef[];
  readonly defaults: {
    readonly player: CreatureId;
    readonly boot: readonly CreatureId[];
    readonly title: readonly CreatureId[];
  };
  readonly ecology: {
    readonly schools: readonly { creature: CreatureId; scale: number; count: number }[];
    readonly giants: readonly { creature: CreatureId; scale: number; ground: boolean; biomes: readonly Biome[] }[];
    readonly shadow: { creature: CreatureId; scale: number };
  };
  readonly environment: {
    readonly atmosphere: Record<Biome, { fog: string; density: number; sky: number; sun: number; sand: string }>;
    readonly sandColors: Record<Biome, string>;
    readonly floraColors: Record<string, string>;
    /**
     * Plants per 144 square units of each biome, by kind. The kinds present here are the kinds the
     * world places; absent, the Cambrian's table in `src/sim/world.ts` is used.
     */
    readonly flora?: Record<Biome, Partial<Record<FloraKind, number>>>;
    /**
     * Height of the water surface in world units (the seabed sits around 0 on the shelf). Absent,
     * the Cambrian's 40. A pelagic roster wants more water over the floor than a benthic one.
     */
    readonly surfaceY?: number;
    readonly biomeNames: Record<Biome, string>;
    readonly biomeDanger: Record<Biome, number>;
  };
  /** App-root-relative paths; callers supply the game/viewer/workbench deployment base. */
  readonly assets: {
    readonly creatures: string;
    readonly defaultPortraits: string;
    readonly props: string;
    /** Optional cheap static meshes; rich specimen assets remain in their own catalogue. */
    readonly instancedScenery?: InstancedScenery;
    readonly biomes: string;
    readonly ui: string;
    readonly sfx: string;
    readonly music: string;
    readonly logo: string;
    readonly illustration: string;
    readonly emblem: string;
    /** Authored previews remain selectable while their art receives further refinement. */
    readonly modelStatus?: Readonly<Partial<Record<CreatureId, 'preview' | 'final'>>>;
    readonly modelBytes: Readonly<Partial<Record<CreatureId, number>>>;
    /**
     * Creatures whose own model is still in production borrow another roster member's GLB (and
     * its LOD), recoloured with their scheme. Removed entry by entry as deliveries land.
     */
    readonly standIns?: Readonly<Partial<Record<CreatureId, CreatureId>>>;
  };
  readonly audio: { readonly music: readonly MusicTrack[] };
  readonly presentation: {
    readonly schemes: readonly Scheme[];
    readonly creatureSchemes: Readonly<Record<string, string>>;
    readonly authoredColors: { creatures: Partial<Record<CreatureId, Record<Slot, string>>>; props: Record<string, string> };
    readonly portraits: Readonly<Record<string, PortraitRecord>>;
  };
}

/** Reject incomplete content at startup rather than failing halfway into a match. */
export function defineEra(def: EraDefinition): EraDefinition {
  const ids = new Set(def.creatures.map(c => c.id));
  if (!ids.size || ids.size !== def.creatures.length) throw new Error(`${def.id}: empty or duplicate creature roster`);
  const references = [def.defaults.player, ...def.defaults.boot, ...def.defaults.title,
    ...def.ecology.schools.map(s => s.creature), ...def.ecology.giants.map(g => g.creature), def.ecology.shadow.creature];
  for (const id of references) if (!ids.has(id)) throw new Error(`${def.id}: creature ${id} is outside the roster`);
  if (!def.ecology.giants.length) throw new Error(`${def.id}: a giant habitat is required for patrol placement`);
  for (const id of ids) if (!((def.assets.modelBytes[id] ?? 0) > 0)) throw new Error(`${def.id}: missing model size for ${id}`);
  for (const [id, standIn] of Object.entries(def.assets.standIns ?? {})) if (!ids.has(id as CreatureId) || !standIn || !ids.has(standIn) || def.assets.standIns?.[standIn]) throw new Error(`${def.id}: stand-in ${id} → ${standIn} must map a roster member to a delivered one`);
  for (const id of ids) if (!def.presentation.authoredColors.creatures[id]) throw new Error(`${def.id}: missing authored colours for ${id}`);
  if (!def.presentation.schemes.length) throw new Error(`${def.id}: a default colour scheme is required`);
  if (!def.audio.music.length) throw new Error(`${def.id}: a soundtrack is required`);
  if (!def.modes.length) throw new Error(`${def.id}: at least one mode is required`);
  return def;
}
