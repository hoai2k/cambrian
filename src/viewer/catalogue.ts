import { CREATURES } from '../sim/creatures';
import { CAMBRIAN_MODEL_NOTES, CAMBRIAN_MODEL_STATUS } from '../content/cambrian/model-status';
import type { CambrianCreatureId } from '../content/cambrian/ids';
import { SCHEMES as CAMBRIAN_SCHEMES, CREATURE_SCHEMES as CAMBRIAN_DEFAULTS } from '../content/cambrian/palettes';
import { SCHEMES as DEVONIAN_SCHEMES, CREATURE_SCHEMES as DEVONIAN_DEFAULTS } from '../content/devonian/palettes';
import type { Scheme } from '../shared/palettes';
import { assetPaths } from '../content/asset-paths';
import { DEVONIAN_SPECIMENS } from '../content/devonian/specimens';
import { DEVONIAN_CREATURES } from '../content/devonian/creatures';
import devonianPending from '../content/devonian/pending-refinements.json';

/** Both eras keep one queue of what is outstanding per model; the viewer shows its reason. */
const DEVONIAN_MODEL_NOTES: Record<string, string> = Object.fromEntries(devonianPending.map((p) => [p.id, p.reason]));

export type CollectionId = 'cambrian' | 'devonian' | 'devonian-props';
export interface ViewerSpecimen {
  key: string;
  id: string;
  collection: CollectionId;
  name: string;
  species: string;
  /** Everyday group ("Placoderm", "Trilobite"), and the sentence that says what that group is. */
  kind?: string;
  kindNote?: string;
  role: string;
  provenance: string;
  description: string;
  modelStatus?: 'preview' | 'final';
  /** What remains for a preview model — the badge shows it on hover. */
  modelNote?: string;
  model: string;
  lod?: string;
  image?: string;
  displayLength: number;
  lengthMeters?: number;
  looping: readonly string[];
}
const DEVONIAN_KIND = new Map(DEVONIAN_CREATURES.map(c => [c.id as string, { kind: c.kind, kindNote: c.kindNote }]));
export const COLLECTIONS: readonly { id: CollectionId; name: string }[] = [
  { id: 'cambrian', name: 'Cambrian creatures' },
  { id: 'devonian', name: 'Devonian creatures' },
  { id: 'devonian-props', name: 'Devonian plants & props' },
];
export const SPECIMENS: readonly ViewerSpecimen[] = [
  ...CREATURES.map(c => ({
    key: `cambrian:${c.id}`, id: c.id, collection: 'cambrian' as const,
    name: c.name, species: c.species, kind: c.kind, kindNote: c.kindNote, role: `${c.ground ? 'SEAFLOOR' : 'SWIMMER'} · ${c.role}`,
    provenance: c.provenance ?? 'Burgess Shale', description: '',
    modelStatus: CAMBRIAN_MODEL_STATUS[c.id as CambrianCreatureId], modelNote: CAMBRIAN_MODEL_NOTES[c.id as CambrianCreatureId],
    model: assetPaths.model(c.id), lod: assetPaths.model(c.id, 1), displayLength: c.adultLength,
    looping: ['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', 'Moult', ...(c.abilityLoop ? ['Ability'] : [])],
  })),
  ...DEVONIAN_SPECIMENS.map(c => ({
    key: `devonian:${c.category}:${c.id}`, id: c.id,
    collection: (c.category === 'prop' ? 'devonian-props' : 'devonian') as CollectionId,
    // A specimen is the same animal as the roster entry, so it borrows that entry's group.
    name: c.name, species: c.species, kind: DEVONIAN_KIND.get(c.id)?.kind, kindNote: DEVONIAN_KIND.get(c.id)?.kindNote,
    role: c.category === 'prop' ? 'DEVONIAN · SCENERY' : 'DEVONIAN · SPECIMEN',
    provenance: c.provenance, description: c.description,
    modelStatus: c.modelStatus, modelNote: DEVONIAN_MODEL_NOTES[c.id], model: c.model, lod: c.lod, image: c.image, displayLength: 4,
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
