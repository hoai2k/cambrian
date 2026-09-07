/** Asset-only Devonian collection. Deliberately separate from playable EraDefinition. */
import specimens from './specimens.json';
export interface DevonianSpecimen {
  id: string;
  name: string;
  species: string;
  category: 'creature' | 'prop';
  provenance: string;
  description: string;
  model: string;
  lod: string;
  image: string;
  lengthMeters: number;
  looping: string[];
  sources: string[];
  notes: string[];
}
export const DEVONIAN_SPECIMENS: readonly DevonianSpecimen[] = specimens as DevonianSpecimen[];
