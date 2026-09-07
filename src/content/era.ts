import type { MusicTrack } from '../audio/music';
import type { CreatureDef, CreatureId } from './creature-types';
import type { Biome } from '../sim/world';
import type { Mode } from '../sim/types';
import type { Slot, Scheme } from '../shared/palettes';
import type { PortraitRecord } from '../shared/portrait-match';

/** Plain data only: safe to import from the deterministic simulation and Node tooling. */
/** A selectable mode and the copy the selection screen shows for it. */
export interface ModeInfo { readonly id: Mode; readonly name: string; readonly blurb: string; readonly players: string; }

export interface EraDefinition {
  readonly id: string;
  readonly title: string;
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
    readonly biomeNames: Record<Biome, string>;
    readonly biomeDanger: Record<Biome, number>;
  };
  /** App-root-relative paths; callers supply the game/viewer/workbench deployment base. */
  readonly assets: {
    readonly creatures: string;
    readonly defaultPortraits: string;
    readonly props: string;
    readonly biomes: string;
    readonly ui: string;
    readonly sfx: string;
    readonly music: string;
    readonly logo: string;
    readonly illustration: string;
    readonly emblem: string;
    readonly modelBytes: Readonly<Partial<Record<CreatureId, number>>>;
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
  for (const id of ids) if (!def.presentation.authoredColors.creatures[id]) throw new Error(`${def.id}: missing authored colours for ${id}`);
  if (!def.presentation.schemes.length) throw new Error(`${def.id}: a default colour scheme is required`);
  if (!def.audio.music.length) throw new Error(`${def.id}: a soundtrack is required`);
  if (!def.modes.length) throw new Error(`${def.id}: at least one mode is required`);
  return def;
}
