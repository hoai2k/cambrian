import { CREATURES } from '../sim/creatures';
import { CAMBRIAN_CLIP_NOTES, CAMBRIAN_MODEL_NOTES, CAMBRIAN_MODEL_STATUS } from '../content/cambrian/model-status';
import type { CambrianCreatureId } from '../content/cambrian/ids';
import { SCHEMES as CAMBRIAN_SCHEMES, CREATURE_SCHEMES as CAMBRIAN_DEFAULTS } from '../content/cambrian/palettes';
import { SCHEMES as DEVONIAN_SCHEMES, CREATURE_SCHEMES as DEVONIAN_DEFAULTS } from '../content/devonian/palettes';
import type { Scheme } from '../shared/palettes';
import { assetPaths, createAssetPaths } from '../content/asset-paths';
import { TRIASSIC, TRIASSIC_SHIPPED } from '../content/triassic';
import { TRIASSIC_CREATURES } from '../content/triassic/creatures';
import { TRIASSIC_SPECIMENS } from '../content/triassic/specimens';
import { SCHEMES as TRIASSIC_SCHEMES, CREATURE_SCHEMES as TRIASSIC_DEFAULTS } from '../content/triassic/palettes';
import triassicPending from '../content/triassic/pending-refinements.json';
import previewBodies from '../content/triassic/preview-bodies.json';
import reviewBodies from '../content/triassic/review-bodies.json';
import expansion from '../content/triassic/expansion.json';
import basePoses from '../content/triassic/base-poses.json';
import backupModels from '../content/triassic/backup-models.json';
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
  /**
   * The procedurally rebuilt twin of this body, where one exists. The pipeline builds it to the
   * generated model's own volume on the same skeleton, and animating it is how the authored body
   * gets its clips (docs/triassic/04-tripo-pipeline.md), so the pair only means anything when a
   * human can see one become the other: the viewer swaps between them in place, same camera, same
   * scale, same clip at the same frame, and any drift between the two shows up as movement.
   */
  puppet?: string;
  puppetNote?: string;
  /**
   * The raw generated mesh an animal will be built from, where it has one and no body has shipped.
   * A static Tripo surface: no skeleton, no clips, and engine orientation and scale not yet
   * normalized, so it is a thing to look at rather than a thing to animate or play.
   */
  generated?: string;
  /**
   * Estimated degrees about +y to bring the generated mesh's head round to +z, where every shipped
   * body keeps it, and the length the roster gives the animal. Both are previewing estimates read
   * off fixed-axis renders, not the normalization the pipeline does when a body is rigged.
   */
  previewYaw?: number;
  previewLength?: number;
  /**
   * The generated mesh's hash from `preview-bodies.json`. A region marked on a body is a list of
   * vertex indices into one exact file, so the export carries the hash and `cut-region.py` refuses
   * a region whose mesh has been regenerated underneath it.
   */
  generatedSha256?: string;
  /**
   * The body's *original* pose — the untouched Tripo generation — where its builder unbent or
   * straightened the mesh before binding. The shipped body then rests in a shape the generation
   * never held, which is the right correction and is recorded in each `validation.json`, but there
   * was no way to look at what changed: the shipped body is all that is in `public/`, and a preview
   * is retired the day an animal ships. It carries no rig, so it sits still — a thing to compare
   * against, not to animate.
   */
  origPose?: string;
  /** Preserved previous model, including its rig, clips and corrections when available. */
  backup?: string;
  /** What the builder moved, in words, for the hint beside the control. */
  origPoseChanged?: readonly string[];
  /**
   * True for a subject that is being built but is on no era's roster — see
   * `src/content/triassic/expansion.json`. It borrows no body, because it is in no sea: where it
   * ends up is the open question, so the viewer must not offer a "borrowed body in play" stage
   * that would be a lie about a game it is not in.
   */
  offRoster?: boolean;
  /**
   * True while this animal's own body is built but not yet in tools/triassic/shipped.json. The
   * game still draws the body it borrows and the animal keeps its warning; the viewer shows the
   * real thing, because deciding whether it ships is what the viewer is for.
   */
  inReview?: boolean;
  image?: string;
  displayLength: number;
  lengthMeters?: number;
  looping: readonly string[];
}
const DEVONIAN_KIND = new Map(DEVONIAN_CREATURES.map(c => [c.id as string, { kind: c.kind, kindNote: c.kindNote }]));
/** The raw generated body of each animal still waiting for one, by id. */
const TRIASSIC_PREVIEW = new Map((previewBodies as { id: string; model: string; yaw: number; lengthUnits: number | null; sha256: string }[])
  .map(b => [b.id, b]));
/** The procedural twin of each animal that has one, by the animal's id. */
const TRIASSIC_PUPPETS = new Map(TRIASSIC_SPECIMENS.filter(c => c.category === 'creature').map(c => [c.id, c]));
/**
 * Bodies that are built and waiting on a human, by id. They are not in shipped.json, so every
 * runtime path still resolves them to the body they borrow in play; this is the one register that
 * points at the real files, and it exists because without it a finished animal is invisible to the
 * person whose job is to approve it. An entry retires itself when the animal ships.
 */
/** The untouched generation of each body whose builder moved the mesh before binding. */
const TRIASSIC_ORIG_POSE = new Map((basePoses as { id: string; model: string; changed: string[] }[])
  .map(b => [b.id, b]));
const TRIASSIC_BACKUPS = new Map((backupModels as { id: string; model: string }[])
  .map(b => [b.id, b.model]));
const TRIASSIC_REVIEW = new Map((reviewBodies as { id: string; model: string; puppet: string | null; lod: string | null; clips: string[] }[])
  .map(b => [b.id, b]));
/**
 * How many Triassic animals are still wearing somebody else's body. The label says so rather than
 * letting the collection look finished, and it clears itself: `standIns` empties an entry at a
 * time as ids are added to tools/triassic/shipped.json, and at zero this is simply *Triassic
 * creatures*, with no edit here needed the day the models land.
 */
const TRIASSIC_BORROWED = TRIASSIC_CREATURES.filter(c => TRIASSIC.assets.standIns?.[c.id]).length;
/** Every Triassic-folder id whose own body has shipped, guests included. */
const TRIASSIC_SHIPPED_IDS = new Set(TRIASSIC_SHIPPED);
export const COLLECTIONS: readonly { id: CollectionId; name: string }[] = [
  { id: 'cambrian', name: 'Cambrian creatures' },
  { id: 'devonian', name: 'Devonian creatures' },
  { id: 'devonian-props', name: 'Devonian plants & props' },
  { id: 'triassic', name: `Triassic creatures${TRIASSIC_BORROWED ? ` (${TRIASSIC_BORROWED} borrowed bodies)` : ''}` },
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
  // A Triassic roster entry resolves to its own delivered body or to the Devonian body it still
  // borrows in play. Both appear under the Triassic name and current preview status.
  ...TRIASSIC_CREATURES.map(c => ({
    key: `triassic:${c.id}`, id: c.id, collection: 'triassic' as const,
    name: c.name, species: c.species, kind: c.kind, kindNote: c.kindNote,
    role: `TRIASSIC · ${c.shore ? 'SHORE ANIMAL' : c.ground ? 'SEAFLOOR' : 'SWIMMER'} · ${c.role}`,
    provenance: c.locality ?? 'Triassic', description: TRIASSIC.assets.standIns?.[c.id] ? `Borrowed body: ${String(TRIASSIC.assets.standIns[c.id]).replace('devonian/', 'Devonian ')}. ${c.tagline}` : c.tagline,
    modelStatus: TRIASSIC_REFINEMENTS.modelStatus[c.id], modelNote: TRIASSIC_REFINEMENTS.modelNotes[c.id],
    clipNotes: TRIASSIC_REFINEMENTS.clipNotes[c.id],
    // A body in review is this animal's own; only without one does the roster path apply, and for
    // an unshipped animal that resolves to the body it borrows.
    model: TRIASSIC_REVIEW.get(c.id)?.model ?? TRIASSIC_PATHS.model(c.id),
    lod: TRIASSIC_REVIEW.get(c.id)?.lod ?? TRIASSIC_PATHS.model(c.id, 1),
    image: TRIASSIC_PATHS.portrait(c.id, 'card'), displayLength: Math.min(c.adultLength, 8),
    puppet: TRIASSIC_REVIEW.get(c.id)?.puppet ?? TRIASSIC_PUPPETS.get(c.id)?.model,
    puppetNote: TRIASSIC_PUPPETS.get(c.id)?.description,
    generated: TRIASSIC_PREVIEW.get(c.id)?.model,
    previewYaw: TRIASSIC_PREVIEW.get(c.id)?.yaw,
    previewLength: TRIASSIC_PREVIEW.get(c.id)?.lengthUnits ?? undefined,
    generatedSha256: TRIASSIC_PREVIEW.get(c.id)?.sha256,
    origPose: TRIASSIC_ORIG_POSE.get(c.id)?.model,
    backup: TRIASSIC_BACKUPS.get(c.id),
    origPoseChanged: TRIASSIC_ORIG_POSE.get(c.id)?.changed,
    inReview: TRIASSIC_REVIEW.has(c.id),
    looping: ['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', ...(c.abilityLoop ? ['Ability'] : [])],
  })),
  // Subjects whose era is undecided. They are deliberately absent from TRIASSIC_CREATURES —
  // roster membership is what puts an animal in the sea — so they are listed here instead, and
  // carry no borrowed body and no roster length.
  //
  // **Either state, not just the first.** This used to list only subjects with a published preview,
  // which was right while both of them were raw generations and wrong the day either was built: a
  // preview retires when its animal ships, so a shipped off-roster body would have vanished from
  // the viewer altogether — the one place whose job is to show it.
  ...(expansion.subjects as { id: string; name: string; species: string; kind: string; kindNote: string; role: string; provenance: string; tagline: string; lengthMeters: number; adultLength: number }[])
    .filter(s => TRIASSIC_PREVIEW.has(s.id) || TRIASSIC_REVIEW.has(s.id) || TRIASSIC_SHIPPED_IDS.has(s.id))
    .map(s => {
      const built = TRIASSIC_REVIEW.get(s.id);
      const shipped = TRIASSIC_SHIPPED_IDS.has(s.id);
      return {
        key: `triassic:${s.id}`, id: s.id, collection: 'triassic' as const,
        name: s.name, species: s.species, kind: s.kind, kindNote: s.kindNote,
        role: `OFF-ROSTER · ${s.role}`, provenance: s.provenance,
        description: shipped || built
          ? `On no roster, and a standing visitor in all three games: ${s.tagline}`
          : `Not on any roster yet: ${s.tagline}`,
        modelStatus: (shipped ? undefined : 'preview') as 'preview' | undefined,
        modelNote: shipped ? undefined
          : built
            ? 'Built and awaiting review. Which game this animal belongs to is still undecided (docs/triassic/05-mesozoic-expansion.md); until then it reaches play only as a standing visitor.'
            : 'Raw generation only — no rig, clips or anchors yet, and which game this animal belongs to is undecided (docs/triassic/05-mesozoic-expansion.md).',
        model: built?.model ?? (shipped ? TRIASSIC_PATHS.model(s.id) : TRIASSIC_PREVIEW.get(s.id)!.model),
        lod: built?.lod ?? (shipped ? TRIASSIC_PATHS.model(s.id, 1) : undefined),
        puppet: built?.puppet ?? (shipped ? TRIASSIC_PATHS.model(s.id, 1) : undefined),
        generated: TRIASSIC_PREVIEW.get(s.id)?.model,
        previewYaw: TRIASSIC_PREVIEW.get(s.id)?.yaw,
        previewLength: TRIASSIC_PREVIEW.get(s.id)?.lengthUnits ?? undefined,
        generatedSha256: TRIASSIC_PREVIEW.get(s.id)?.sha256,
        inReview: TRIASSIC_REVIEW.has(s.id),
        offRoster: true, displayLength: Math.min(s.adultLength, 8), lengthMeters: s.lengthMeters,
        // The loop set both guest builders declare. A preview has no clips at all and gets none.
        looping: (shipped || built
          ? ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe']
          : []) as readonly string[],
      };
    }),
  // Scenery only. A creature row in TRIASSIC_SPECIMENS is a procedural twin, and a twin is not a
  // second animal: it is the same animal drawn the other way, so it belongs behind a switch on
  // the roster entry it belongs to (`TRIASSIC_PUPPETS` above) rather than beside it in the list,
  // where a reviewer would have to click away and back and lose the pose they were judging.
  ...TRIASSIC_SPECIMENS.filter(c => c.category === 'prop').map(c => ({
    key: `triassic:prop:${c.id}`, id: c.id, collection: 'triassic-props' as CollectionId,
    name: c.name, species: c.species, role: 'TRIASSIC · SCENERY',
    provenance: c.provenance, description: c.description,
    // A prop is not in the creature refinement queue, so its badge takes the reason the catalogue
    // entry carries. Without it the warning showed with nothing behind it.
    modelStatus: TRIASSIC_REFINEMENTS.modelStatus[c.id] ?? c.modelStatus,
    modelNote: TRIASSIC_REFINEMENTS.modelNotes[c.id] ?? c.modelNote,
    clipNotes: TRIASSIC_REFINEMENTS.clipNotes[c.id], model: c.model, lod: c.lod, image: c.image,
    displayLength: 4, lengthMeters: c.lengthMeters, looping: c.looping,
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
