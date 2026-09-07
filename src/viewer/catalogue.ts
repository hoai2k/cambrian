import { CREATURES } from '../sim/creatures';
import { assetPaths } from '../content/asset-paths';
import { DEVONIAN_SPECIMENS } from '../content/devonian';

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
