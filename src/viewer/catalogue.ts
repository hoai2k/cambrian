import { CREATURES } from '../sim/creatures';
import { CAMBRIAN_CLIP_NOTES, CAMBRIAN_MODEL_NOTES, CAMBRIAN_MODEL_STATUS } from '../content/cambrian/model-status';
import type { CambrianCreatureId } from '../content/cambrian/ids';
import { SCHEMES as CAMBRIAN_SCHEMES, CREATURE_SCHEMES as CAMBRIAN_DEFAULTS } from '../content/cambrian/palettes';
import { SCHEMES as DEVONIAN_SCHEMES, CREATURE_SCHEMES as DEVONIAN_DEFAULTS } from '../content/devonian/palettes';
import type { Scheme } from '../shared/palettes';
import { assetPaths, createAssetPaths } from '../content/asset-paths';
import { TRIASSIC } from '../content/triassic';
import { TRIASSIC_CREATURES } from '../content/triassic/creatures';
import { TRIASSIC_SPECIMENS } from '../content/triassic/specimens';
import { SCHEMES as TRIASSIC_SCHEMES, CREATURE_SCHEMES as TRIASSIC_DEFAULTS } from '../content/triassic/palettes';
import triassicPending from '../content/triassic/pending-refinements.json';
import { DEVONIAN_SPECIMENS } from '../content/devonian/specimens';
import { DEVONIAN_CREATURES } from '../content/devonian/creatures';
import devonianPending from '../content/devonian/pending-refinements.json';
import { refinementTables, type PendingRefinement } from '../content/pending-refinements';

/**
 * Both eras keep one queue of what is outstanding, and the viewer shows it in two places: a
 * preview badge on a creature whose *model* is unfinished, and a warning on the individual
 * animation buttons whose clips are queued for rework.
 */
const DEVONIAN_REFINEMENTS = refinementTables(devonianPending as PendingRefinement[]) as {
  modelStatus: Record<string, 'preview' | 'final' | undefined>;
  modelNotes: Record<string, string | undefined>;
  clipNotes: Record<string, Partial<Record<string, string>> | undefined>;
};

const TRIASSIC_REFINEMENTS = refinementTables(triassicPending as PendingRefinement[]) as {
  modelStatus: Record<string, 'preview' | 'final' | undefined>;
  modelNotes: Record<string, string | undefined>;
  clipNotes: Record<string, Partial<Record<string, string>> | undefined>;
};
/** The Triassic's paths resolve its borrowed bodies into the Devonian folder; the viewer runs as the Cambrian, so ask its pack directly. */
const TRIASSIC_PATHS = createAssetPaths(TRIASSIC);

export type CollectionId = 'cambrian' | 'devonian' | 'devonian-props' | 'triassic' | 'triassic-props';
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
  /** Animation clips queued for rework, by clip name, with the reason each button shows. */
  clipNotes?: Partial<Record<string, string>>;
  model: string;
  lod?: string;
  image?: string;
  displayLength: number;
  lengthMeters?: number;
  looping: readonly string[];
}
const DEVONIAN_KIND = new Map(DEVONIAN_CREATURES.map(c => [c.id as string, { kind: c.kind, kindNote: c.kindNote }]));
/**
 * How many Triassic animals are still wearing somebody else's body. The label says so rather than
 * letting the collection look finished, and it clears itself: `standIns` empties an entry at a
 * time as ids are added to tools/triassic/shipped.json, and at zero this is simply *Triassic
 * creatures*, with no edit here needed the day the models land.
 */
const TRIASSIC_BORROWED = TRIASSIC_CREATURES.filter(c => TRIASSIC.assets.standIns?.[c.id]).length;
export const COLLECTIONS: readonly { id: CollectionId; name: string }[] = [
  { id: 'cambrian', name: 'Cambrian creatures' },
  { id: 'devonian', name: 'Devonian creatures' },
  { id: 'devonian-props', name: 'Devonian plants & props' },
  { id: 'triassic', name: `Triassic creatures${TRIASSIC_BORROWED ? ` (${TRIASSIC_BORROWED} borrowed bodies)` : ''}` },
  // Empty until the first Triassic prop is generated, which the picker shows as a disabled option:
  // the slot is visible, so a delivery has somewhere to go rather than somewhere to be invented.
  { id: 'triassic-props', name: 'Triassic plants & props' },
];
/**
 * A scenery collection rather than an animal one. Props have no colour schemes and nothing to
 * sculpt, and the page used to ask that question as "is this the Devonian's props?" — which was
 * the same answer only for as long as the Devonian was the one era with any.
 */
export const isPropCollection = (c: CollectionId | undefined): boolean => c === 'devonian-props' || c === 'triassic-props';

export const SPECIMENS: readonly ViewerSpecimen[] = [
  ...CREATURES.map(c => ({
    key: `cambrian:${c.id}`, id: c.id, collection: 'cambrian' as const,
    name: c.name, species: c.species, kind: c.kind, kindNote: c.kindNote, role: `${c.ground ? 'SEAFLOOR' : 'SWIMMER'} · ${c.role}`,
    provenance: c.provenance ?? 'Burgess Shale', description: '',
    modelStatus: CAMBRIAN_MODEL_STATUS[c.id as CambrianCreatureId], modelNote: CAMBRIAN_MODEL_NOTES[c.id as CambrianCreatureId],
    clipNotes: CAMBRIAN_CLIP_NOTES[c.id as CambrianCreatureId],
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
    modelStatus: DEVONIAN_REFINEMENTS.modelStatus[c.id], modelNote: DEVONIAN_REFINEMENTS.modelNotes[c.id],
    clipNotes: DEVONIAN_REFINEMENTS.clipNotes[c.id], model: c.model, lod: c.lod, image: c.image, displayLength: 4,
    lengthMeters: c.lengthMeters, looping: c.looping,
  })),
  // The Triassic has no models of its own yet: each entry is the Devonian body it borrows in
  // play, recoloured with its scheme, under its own name and preview badge — which is what a
  // reviewer wants to see while judging the recolour and the size against the canonical pose.
  ...TRIASSIC_CREATURES.map(c => ({
    key: `triassic:${c.id}`, id: c.id, collection: 'triassic' as const,
    name: c.name, species: c.species, kind: c.kind, kindNote: c.kindNote,
    role: `TRIASSIC · ${c.shore ? 'SHORE ANIMAL' : c.ground ? 'SEAFLOOR' : 'SWIMMER'} · ${c.role}`,
    provenance: c.locality ?? 'Triassic', description: TRIASSIC.assets.standIns?.[c.id] ? `Borrowed body: ${String(TRIASSIC.assets.standIns[c.id]).replace('devonian/', 'Devonian ')}. ${c.tagline}` : c.tagline,
    modelStatus: TRIASSIC_REFINEMENTS.modelStatus[c.id], modelNote: TRIASSIC_REFINEMENTS.modelNotes[c.id],
    clipNotes: TRIASSIC_REFINEMENTS.clipNotes[c.id],
    model: TRIASSIC_PATHS.model(c.id), lod: TRIASSIC_PATHS.model(c.id, 1), image: TRIASSIC_PATHS.portrait(c.id, 'card'), displayLength: Math.min(c.adultLength, 8),
    looping: ['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', ...(c.abilityLoop ? ['Ability'] : [])],
  })),
  ...TRIASSIC_SPECIMENS.map(c => ({
    key: `triassic:${c.category}:${c.id}`, id: c.id,
    collection: (c.category === 'prop' ? 'triassic-props' : 'triassic') as CollectionId,
    name: c.name, species: c.species,
    role: c.category === 'prop' ? 'TRIASSIC · SCENERY' : 'TRIASSIC · SPECIMEN',
    provenance: c.provenance, description: c.description,
    modelStatus: TRIASSIC_REFINEMENTS.modelStatus[c.id], modelNote: TRIASSIC_REFINEMENTS.modelNotes[c.id],
    clipNotes: TRIASSIC_REFINEMENTS.clipNotes[c.id], model: c.model, lod: c.lod, image: c.image, displayLength: 4,
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
const TRIASSIC_PALETTE: Palette = { schemes: TRIASSIC_SCHEMES, defaults: TRIASSIC_DEFAULTS };

export const paletteFor = (collection: CollectionId): Palette =>
  collection === 'cambrian' ? CAMBRIAN : collection === 'triassic' ? TRIASSIC_PALETTE : DEVONIAN;

/** Every scheme in either pack, for `registerSchemes` so a pick from either resolves. */
export const ALL_SCHEMES: readonly Scheme[] = [...CAMBRIAN_SCHEMES, ...DEVONIAN_SCHEMES, ...TRIASSIC_SCHEMES];
