/**
 * Asset-only Triassic collection — procedural comparison bodies and the scenery and props that
 * will ship beside the animals, in the same shape the Devonian uses, so the specimen viewer can
 * list them without knowing which era they came from. Deliberately separate from the playable
 * `EraDefinition`.
 *
 * Creature rows expose procedural twins beside their playable textured bodies for paired review.
 * Prop rows are the authored scenery library: static meshes with no rig and no clips, which the
 * viewer lists so they can be inspected long before anything animates. The rest of the era's
 * scenery is still drawn procedurally (`src/content/triassic/environment.ts`).
 */
import specimens from './specimens.json';

export interface TriassicSpecimen {
  id: string;
  name: string;
  species: string;
  category: 'creature' | 'prop';
  modelStatus: 'preview' | 'final';
  /** Why the preview badge is showing, where the refinement queue has nothing to say. */
  modelNote?: string;
  provenance: string;
  description: string;
  model: string;
  /** Absent where a prop has no reduced model: scenery this small is drawn at one detail. */
  lod?: string;
  image: string;
  lengthMeters: number;
  looping: string[];
  sources: string[];
  notes: string[];
}

export const TRIASSIC_SPECIMENS: readonly TriassicSpecimen[] = specimens as TriassicSpecimen[];
