import { defineEra } from '../era';
import type { DevonianCreatureId } from './ids';
import type { Slot } from '../../shared/palettes';
import { DEVONIAN_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, ATMOS, SAND_COLORS, FLORA_BASE, FLORA_DENSITY, FLORA_PROPS, SURFACE_Y } from './environment';
import { MUSIC } from './music';
import { DEVONIAN_SCENERY } from './scenery';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';
import { DEVONIAN_BRAND, DEVONIAN_BRAND_EXTRAS } from './brand';
import shippedBytes from './asset-sizes.json';
import pendingRefinements from './pending-refinements.json';
import { refinementTables, type PendingRefinement } from '../pending-refinements';

/**
 * The badges, derived from the one refinement queue: a creature is a preview when its *model* is
 * outstanding, and queued animation work is carried by the clips it affects instead.
 * `model-status.json` is no longer read here — it duplicated this and could disagree with it.
 */
const { modelStatus, modelNotes, clipNotes } = refinementTables(pendingRefinements as PendingRefinement[]);

/**
 * Model sizes for the streaming loader's progress estimate. Delivered specimens (tools/devonian/
 * shipped.json) carry their real byte counts in asset-sizes.json; the rest of the roster is pending
 * and gets a placeholder so era validation passes. tools/devonian-test.ts checks the shipped sizes.
 */
const SHIPPED_BYTES: Record<string, number> = shippedBytes;
export const DEVONIAN_SHIPPED = Object.keys(SHIPPED_BYTES);

/**
 * Until every specimen is delivered, a pending creature borrows the closest delivered body of its
 * habit (recoloured with its own scheme), so every rung is playable and visible. Each entry goes
 * away when its own GLB lands; tools/devonian-test.ts fails if a stand-in points at a pending model.
 */
export const DEVONIAN_STAND_INS: Partial<Record<DevonianCreatureId, DevonianCreatureId>> = Object.fromEntries((
  [

    
  ] as [DevonianCreatureId, DevonianCreatureId][]
).filter(([id]) => !SHIPPED_BYTES[id]));
const modelBytes = Object.fromEntries(DEVONIAN_CREATURES.map((c) => [c.id, SHIPPED_BYTES[c.id] ?? SHIPPED_BYTES[DEVONIAN_STAND_INS[c.id as DevonianCreatureId] ?? ''] ?? 1]));

/** Camouflage's fallback colours per creature: its default scheme's slots. */
const authoredCreatures = Object.fromEntries(DEVONIAN_CREATURES.map((c) => {
  // No scheme in play means the authored colours, so camouflage falls back to the creature's own.
  const scheme = SCHEMES.find((s) => s.id === CREATURE_SCHEMES[c.id]);
  return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
}));

export const DEVONIAN = defineEra({
  id: 'devonian',
  title: 'Devonian Domination',
  copy: { tagline: 'Feed. Grow. Fight. Escape.', taglineEm: '375 million years ago, the sea had a pecking order.', loading: 'FILLING THE BASIN…', lose: 'THE SEA WINS', settingsKey: 'devonian-settings', mobileIllustration: DEVONIAN_BRAND_EXTRAS.mobileIllustration, sibling: { title: 'Cambrian Conquest', path: '', blurb: '133 million years earlier' } },
  modes: [
    // The same three modes as the Cambrian, in the same order: this era changes the sea and the
    // animals in it, not what a match is.
    { id: 'rise', name: 'Rise', blurb: 'Hatch as a hatchling. Eat, grow, fight, hide. Reach Prime and hold it for ninety seconds. Share the feast with the others, or eat them.', players: '1–4' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Everyone takes a turn as the big one, with the river mouth as the small ones\u2019 refuge. On your turn, catch as many as you can; on theirs, grow out of reach. Most caught wins.', players: '2–4 asymmetric' },
    { id: 'reef', name: 'Reef', blurb: 'No goal. Any animal, fully grown, and the Devonian coast to swim in.', players: '1–4 sandbox' },
  ],

  creatures: DEVONIAN_CREATURES,
  defaults: {
    player: 'coccosteus',
    // Delivered specimens only: these drive card and model preloading, and a creature that is still
    // borrowing a body has no portrait to load. Add each one here as its own model lands.
    // What the title screen swims and what the player is most likely to pick. The rest of the
    // roster streams its decimated copy and only fetches a full body when one is needed: these
    // models are three times the size of the Cambrian's, and the whole set is 302 MB.
    boot: ['coccosteus', 'dunkleosteus', 'cladoselache', 'doryaspis', 'bothriolepis'],
    title: ['dunkleosteus', 'cladoselache', 'coccosteus', 'doryaspis'],
  },
  ecology: { schools: SNACK_SCHOOLS, giants: GIANTS, shadow: { creature: 'titanichthys', scale: 1.0 } },
  environment: { biomeNames: BIOME_NAMES, biomeDanger: BIOME_DANGER, atmosphere: ATMOS, sandColors: SAND_COLORS, floraColors: FLORA_BASE, flora: FLORA_DENSITY, floraProps: FLORA_PROPS, surfaceY: SURFACE_Y },
  assets: {
    creatures: 'assets/devonian/creatures/', defaultPortraits: 'assets/devonian/creatures/',
    // Scenery is this era's own: the instanced exports built by tools/devonian/props/instance.mjs
    // from the authored preview library. Music is shared with the Cambrian until more lands
    // (docs/audio-requests.md). The biome plates are the delivered paintings, one per biome;
    // `npm run devonian:plates` still regenerates procedural ones if a painting is ever missing.
    // The creatures and brand are this era's own.
    // `sfx` names the SHARED library on purpose: bites, hits, parries and the UI are the same sounds
    // in both eras, and this era's own samples are addressed as 'devonian/<name>' (src/content/
    // devonian/sfx.ts), which sfxUrl resolves under assets/devonian/sfx/ whatever this path says.
    // Pointing it at the Devonian folder makes all 39 shared samples 404 and the sea goes silent.
    props: 'assets/devonian/scenery/', instancedScenery: DEVONIAN_SCENERY, biomes: 'assets/devonian/biomes/', ui: 'assets/ui/', sfx: 'assets/sfx/', music: 'music/',
    ...DEVONIAN_BRAND, modelStatus, modelNotes, clipNotes, modelBytes, standIns: DEVONIAN_STAND_INS,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits: {}, authoredColors: { creatures: authoredCreatures, props: {} } },
});
