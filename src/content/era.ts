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
  /**
   * The other era's page. `logo` is its wordmark, so a switcher can *show* the other game rather
   * than spell it: a plain path, because reaching into the other era's content module would pull
   * its whole roster into this page's bundle and read ACTIVE_ERA at import time.
   */
  readonly sibling?: { readonly title: string; readonly path: string; readonly blurb: string; readonly logo: string };
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
  /**
   * This roster's body lengths taken from what the animals actually measured, which is what the era
   * plays at. `Settings → Equivalent sizing` puts the flat authored lengths in `creatures` back.
   *
   * The Cambrian roster was authored at one size — every animal growing to within a third of every
   * other — which is no use in a game where size decides who eats whom, so it now plays at the
   * lengths in `docs/research/cambrian-sizes.md`. `speed`, `hp` and `poise` come with the length so
   * the simulation is unchanged at any given body size; everything else on the def is already
   * counted in body lengths. `realCm` is the animal itself, for the selection card.
   *
   * An era that leaves this out — the Devonian, whose roster is already generated from real
   * lengths — plays at the lengths in `creatures` and has nothing for the setting to do.
   */
  readonly naturalSizes?: Readonly<Record<string, { adultLength: number; speed: number; hp: number; poise: number; realCm: number }>>;
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
     * Authored geometry for a flora kind, by prop id under `assets.props`. A kind without one — or
     * whose file fails to load — keeps the procedural stand-in `src/render/sea.ts` builds for it,
     * so this can be filled in a kind at a time as art lands.
     */
    readonly floraProps?: Partial<Record<FloraKind, string>>;
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
    /**
     * What remains for each preview model, in a sentence: the badge shows it on hover, so a player
     * who wonders why a finished-looking animal is flagged can find out. Both eras derive this and
     * `modelStatus` from the same pending-refinements queue, so a model cannot be a preview
     * without saying why.
     */
    readonly modelNotes?: Readonly<Partial<Record<CreatureId, string>>>;
    /**
     * Animation clips still queued for rework, per creature and clip name, with the reason. A body
     * that is already right does not get a preview badge for pending motion work — the warning goes
     * on the clip buttons that will actually change.
     */
    readonly clipNotes?: Readonly<Partial<Record<CreatureId, Partial<Record<string, string>>>>>;
    readonly modelBytes: Readonly<Partial<Record<CreatureId, number>>>;
    /**
     * Creatures whose own model is still in production borrow another roster member's GLB (and
     * its LOD), recoloured with their scheme. Removed entry by entry as deliveries land.
     */
    readonly standIns?: Readonly<Partial<Record<CreatureId, CreatureId>>>;
  };
  readonly audio: {
    readonly music: readonly MusicTrack[];
    /**
     * The two always-on loops, by sample name: the ambient bed and the drone a giant brings with
     * it. Era-specific ones are addressed like any other era sample (`<era>/<name>`). These used
     * to be one shared constant, which is why the Devonian played the Cambrian reef.
     */
    readonly loops: { readonly ambient: string; readonly drone: string };
  };
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
  if (!def.audio.loops.ambient || !def.audio.loops.drone) throw new Error(`${def.id}: both loops are required`);
  if (!def.modes.length) throw new Error(`${def.id}: at least one mode is required`);
  return def;
}
