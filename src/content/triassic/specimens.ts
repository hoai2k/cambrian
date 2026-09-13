/**
 * Asset-only Triassic collection — the scenery and props that will ship beside the animals, in the
 * same shape the Devonian uses, so the specimen viewer can list them without knowing which era
 * they came from. Deliberately separate from the playable `EraDefinition`.
 *
 * Empty on purpose: the era has no props of its own yet. Its four organic subjects — Voltzia, the
 * coral head, the sponge mound and the log raft — have their canonical poses and modelling sheets
 * in `docs/triassic/canonical/` and are waiting on generation. When one lands, its GLB goes in
 * `public/assets/triassic/props/`, its row goes here, and the viewer's *Triassic plants & props*
 * collection stops being empty on its own. Until then the game draws the era's scenery
 * procedurally (`src/content/triassic/environment.ts`).
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
