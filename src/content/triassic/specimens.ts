/**
 * Asset-only Triassic collection — procedural comparison bodies and the scenery and props that
 * will ship beside the animals, in the same shape the Devonian uses, so the specimen viewer can
 * list them without knowing which era they came from. Deliberately separate from the playable
 * `EraDefinition`.
 *
 * Creature rows expose procedural twins beside their playable textured bodies for paired review.
 * Prop rows will join them when the first generated Triassic scenery model lands. Until then the
 * game draws the era's scenery procedurally (`src/content/triassic/environment.ts`).
 */
import specimens from './specimens.json';

export interface TriassicSpecimen {
  id: string;
  name: string;
  species: string;
  category: 'creature' | 'prop';
  modelStatus: 'preview' | 'final';
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

export const TRIASSIC_SPECIMENS: readonly TriassicSpecimen[] = specimens as TriassicSpecimen[];
