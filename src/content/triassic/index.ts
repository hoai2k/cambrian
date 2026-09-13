import { defineEra } from '../era';
import type { TriassicCreatureId } from './ids';
import type { DevonianCreatureId } from '../devonian/ids';
import type { Slot } from '../../shared/palettes';
import { TRIASSIC_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, BIOME_PLATES, ATMOS, SAND_COLORS, FLORA_BASE, FLORA_DENSITY, FLORA_PROPS, SURFACE_Y, FLOOR_DEPTH } from './environment';
import { MUSIC } from './music';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';
import { TRIASSIC_SCENERY } from './scenery';
import { TRIASSIC_BRAND, TRIASSIC_BRAND_EXTRAS } from './brand';
import shippedBytes from './asset-sizes.json';
import devonianBytes from '../devonian/asset-sizes.json';
import pendingRefinements from './pending-refinements.json';
import { refinementTables, type PendingRefinement } from '../pending-refinements';

/** The badges, derived from the one refinement queue: every Triassic model is outstanding today. */
const { modelStatus, modelNotes, clipNotes } = refinementTables(pendingRefinements as PendingRefinement[]);

/**
 * Model sizes for the streaming loader. Delivered Triassic specimens (tools/triassic/shipped.json)
 * carry their real byte counts in asset-sizes.json; a creature still borrowing a Devonian body
 * reports that body's size so the progress bar is honest about what is actually fetched.
 */
const SHIPPED_BYTES: Record<string, number> = shippedBytes;
const DEVONIAN_BYTES: Record<string, number> = devonianBytes;
export const TRIASSIC_SHIPPED = Object.keys(SHIPPED_BYTES);

/**
 * Until a Triassic model lands, its animal borrows the closest delivered Devonian body of its habit
 * (`'devonian/<id>'`, resolved under assets/devonian/creatures/ by src/content/asset-paths.ts) and is
 * recoloured with its own scheme. Unlike the Devonian's own stand-ins these are *pickable*
 * (`standInsPlayable`), because the roster ships placeholder portraits from its canonical poses
 * and the point of the build is to play the era before its art exists. Each entry goes away the
 * day its own GLB is listed in tools/triassic/shipped.json; tools/triassic-test.ts checks both
 * halves.
 */
const BORROWED: Record<TriassicCreatureId, DevonianCreatureId> = {
  cymbospondylus: 'dunkleosteus', shonisaurus: 'titanichthys',
  nothosaurus: 'tiktaalik', dinocephalosaurus: 'acanthostega', helicoprion: 'stethacanthus', rhaeticosaurus: 'cladoselache', atopodentatus: 'acanthostega',
  askeptosaurus: 'acanthostega', placodus: 'bothriolepis', hybodus: 'cladoselache', birgeria: 'cheirolepis', aphaneramma: 'tiktaalik',
  mixosaurus: 'cladoselache', henodus: 'bothriolepis', saurichthys: 'cheirolepis', hupehsuchus: 'coccosteus',
  keichousaurus: 'acanthostega', cartorhynchus: 'rhinodipterus', odontochelys: 'bothriolepis', ceratites: 'manticoceras', phragmoteuthis: 'michelinoceras',
  tanystropheus: 'tiktaalik', mystriosuchus: 'tiktaalik', macrocnemus: 'acanthostega', coelophysis: 'acanthostega',
};
export const TRIASSIC_STAND_INS: Partial<Record<TriassicCreatureId, `devonian/${DevonianCreatureId}`>> = Object.fromEntries(
  (Object.entries(BORROWED) as [TriassicCreatureId, DevonianCreatureId][])
    .filter(([id]) => !SHIPPED_BYTES[id])
    .map(([id, body]) => [id, `devonian/${body}` as const]),
);
const modelBytes = Object.fromEntries(TRIASSIC_CREATURES.map((c) => [c.id, SHIPPED_BYTES[c.id] ?? DEVONIAN_BYTES[BORROWED[c.id as TriassicCreatureId]] ?? 1]));

/** Camouflage's fallback colours per creature: its default scheme's slots. */
const authoredCreatures = Object.fromEntries(TRIASSIC_CREATURES.map((c) => {
  const scheme = SCHEMES.find((s) => s.id === CREATURE_SCHEMES[c.id]);
  return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
}));

const CAMBRIAN_LINK = { title: 'Cambrian Conquest', path: '', blurb: '268 million years earlier', logo: 'assets/brand/logo-engraved.webp' };
const DEVONIAN_LINK = { title: 'Devonian Domination', path: 'devonian/', blurb: '135 million years earlier', logo: 'assets/devonian/brand/logo-engraved.webp' };

export const TRIASSIC = defineEra({
  id: 'triassic',
  title: 'Triassic Triumph',
  copy: {
    tagline: 'Breathe. Dive. Hunt. Surface.', taglineEm: '240 million years ago, the sea belonged to things that had to come up for air.',
    loading: 'FILLING THE LUNGS…', lose: 'THE TIDE WINS', settingsKey: 'triassic-settings', mobileIllustration: TRIASSIC_BRAND_EXTRAS.mobileIllustration,
    sibling: CAMBRIAN_LINK, siblings: [DEVONIAN_LINK],
  },
  modes: [
    // The same three modes as the other eras: the sea and the animals change, not what a match is.
    { id: 'rise', name: 'Rise', blurb: 'Be born at the surface. Feed, dive, come up for air, grow. Reach Prime and hold it for ninety seconds. Share the feast with the others, or eat them.', players: '1–4' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Everyone takes a turn as the big one, with the conifer shore as the small ones’ refuge — and the necks on it. On your turn, catch as many as you can; on theirs, grow out of reach. Most caught wins.', players: '2–4 asymmetric' },
    { id: 'reef', name: 'Reef', blurb: 'No goal. Any animal, fully grown, and the Triassic platform to swim in, from the gypsum flats to the black basin.', players: '1–4 sandbox' },
  ],

  creatures: TRIASSIC_CREATURES,
  defaults: {
    player: 'nothosaurus',
    boot: ['nothosaurus', 'mixosaurus', 'cymbospondylus', 'placodus', 'saurichthys'],
    title: ['cymbospondylus', 'nothosaurus', 'mixosaurus', 'rhaeticosaurus'],
  },
  ecology: { schools: SNACK_SCHOOLS, giants: GIANTS, shadow: { creature: 'shonisaurus', scale: 1.0 } },
  environment: { biomeNames: BIOME_NAMES, biomeDanger: BIOME_DANGER, atmosphere: ATMOS, sandColors: SAND_COLORS, floraColors: FLORA_BASE, flora: FLORA_DENSITY, floraProps: FLORA_PROPS, surfaceY: SURFACE_Y, floorDepth: FLOOR_DEPTH, biomePlates: BIOME_PLATES },
  assets: {
    // Portraits began as the placeholder set cut from docs/triassic/canonical/; undelivered models
    // remain borrowed (see TRIASSIC_STAND_INS) until this folder fills. The UI
    // glyphs and the shared sound library are the other eras'; the era's own samples are addressed
    // as 'triassic/<name>' and resolve under assets/triassic/sfx/ the day they exist (sfx.ts).
    creatures: 'assets/triassic/creatures/', defaultPortraits: 'assets/triassic/creatures/',
    props: 'assets/triassic/props/', instancedScenery: TRIASSIC_SCENERY, biomes: 'assets/triassic/biomes/', ui: 'assets/ui/', sfx: 'assets/sfx/', music: 'music/',
    ...TRIASSIC_BRAND, modelStatus, modelNotes, clipNotes, modelBytes, standIns: TRIASSIC_STAND_INS, standInsPlayable: true,
  },
  // No Triassic beds yet: the Devonian's open-water ambience and the shared drone stand in.
  audio: { music: MUSIC, loops: { ambient: 'devonian/ambient-open-sea', drone: 'giant-drone' } },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits: {}, authoredColors: { creatures: authoredCreatures, props: {} } },
});
