import { CREATURES } from '../sim/creatures';
import { SCHEMES as CAMBRIAN_SCHEMES, CREATURE_SCHEMES as CAMBRIAN_DEFAULTS } from '../content/cambrian/palettes';
import { SCHEMES as DEVONIAN_SCHEMES, CREATURE_SCHEMES as DEVONIAN_DEFAULTS } from '../content/devonian/palettes';
import type { Scheme } from '../shared/palettes';
import { assetPaths } from '../content/asset-paths';
import { DEVONIAN_SPECIMENS } from '../content/devonian/specimens';

export type CollectionId = 'cambrian' | 'devonian' | 'devonian-props';
export interface ViewerSpecimen {
  key: string;
  id: string;
  collection: CollectionId;
  name: string;
  species: string;
  role: string;
  provenance: string;
  description: string;
  model: string;
  lod?: string;
  image?: string;
  displayLength: number;
  lengthMeters?: number;
  looping: readonly string[];
}
export const COLLECTIONS: readonly { id: CollectionId; name: string }[] = [
  { id: 'cambrian', name: 'Cambrian creatures' },
  { id: 'devonian', name: 'Devonian creatures' },
  { id: 'devonian-props', name: 'Devonian plants & props' },
];
export const SPECIMENS: readonly ViewerSpecimen[] = [
  ...CREATURES.map(c => ({
    key: `cambrian:${c.id}`, id: c.id, collection: 'cambrian' as const,
    name: c.name, species: c.species, role: `${c.ground ? 'SEAFLOOR' : 'SWIMMER'} · ${c.role}`,
    provenance: c.provenance ?? 'Burgess Shale', description: '',
    model: assetPaths.model(c.id), lod: assetPaths.model(c.id, 1), displayLength: c.adultLength,
    looping: ['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', 'Moult', ...(c.abilityLoop ? ['Ability'] : [])],
  })),
  ...DEVONIAN_SPECIMENS.map(c => ({
    key: `devonian:${c.category}:${c.id}`, id: c.id,
    collection: (c.category === 'prop' ? 'devonian-props' : 'devonian') as CollectionId,
    name: c.name, species: c.species, role: c.category === 'prop' ? 'DEVONIAN · SCENERY' : 'DEVONIAN · SPECIMEN',
    provenance: c.provenance, description: c.description,
    model: c.model, lod: c.lod, image: c.image, displayLength: 4,
    lengthMeters: c.lengthMeters, looping: c.looping,
  })),
];
export const specimenByKey = new Map(SPECIMENS.map(c => [c.key, c]));


/**
 * The viewer is the one page that shows both eras at once, so a specimen's schemes come from its
 * own pack rather than from ACTIVE_ERA — which, on this page, is always the Cambrian. Without
 * this every Devonian creature was offered the Burgess Shale palette and defaulted to the
 * untouched model, so the Devonian schemes looked as though they had never landed.
 */
export interface Palette { schemes: readonly Scheme[]; defaults: Record<string, string> }
const CAMBRIAN: Palette = { schemes: CAMBRIAN_SCHEMES, defaults: CAMBRIAN_DEFAULTS };
const DEVONIAN: Palette = { schemes: DEVONIAN_SCHEMES, defaults: DEVONIAN_DEFAULTS };

export const paletteFor = (collection: CollectionId): Palette =>
  collection === 'cambrian' ? CAMBRIAN : DEVONIAN;

/** Every scheme in either pack, for `registerSchemes` so a pick from either resolves. */
export const ALL_SCHEMES: readonly Scheme[] = [...CAMBRIAN_SCHEMES, ...DEVONIAN_SCHEMES];
