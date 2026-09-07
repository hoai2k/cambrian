import { defineEra } from '../era';
import type { DevonianCreatureId } from './ids';
import type { Slot } from '../../shared/palettes';
import { DEVONIAN_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, ATMOS, SAND_COLORS, FLORA_BASE, FLORA_DENSITY, SURFACE_Y } from './environment';
import { MUSIC } from './music';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';
import { DEVONIAN_BRAND, DEVONIAN_BRAND_EXTRAS } from './brand';
import shippedBytes from './asset-sizes.json';
import modelStatus from './model-status.json';

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
    ['acanthostega', 'bothriolepis'], ['jaekelopterus', 'bothriolepis'],
    ['eldredgeops', 'bothriolepis'], ['walliserops', 'bothriolepis'], ['nahecaris', 'bothriolepis'], ['palaeoisopus', 'bothriolepis'],
    ['furcaster', 'gemuendina'], ['manticoceras', 'doryaspis'], ['michelinoceras', 'doryaspis'],
  ] as [DevonianCreatureId, DevonianCreatureId][]
).filter(([id]) => !SHIPPED_BYTES[id]));
const modelBytes = Object.fromEntries(DEVONIAN_CREATURES.map((c) => [c.id, SHIPPED_BYTES[c.id] ?? SHIPPED_BYTES[DEVONIAN_STAND_INS[c.id as DevonianCreatureId] ?? ''] ?? 1]));

/** Camouflage's fallback colours per creature: its default scheme's slots. */
const authoredCreatures = Object.fromEntries(DEVONIAN_CREATURES.map((c) => {
  const scheme = SCHEMES.find((s) => s.id === CREATURE_SCHEMES[c.id]) ?? SCHEMES.find((s) => s.colors);
  return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
}));

export const DEVONIAN = defineEra({
  id: 'devonian',
  title: 'Devonian Domination',
  copy: { tagline: 'Feed. Escape. Hold your range.', taglineEm: '375 million years ago, the sea had a pecking order.', loading: 'FILLING THE BASIN…', lose: 'THE SEA WINS', settingsKey: 'devonian-settings', mobileIllustration: DEVONIAN_BRAND_EXTRAS.mobileIllustration, sibling: { title: 'Cambrian Explosion', path: '', blurb: '133 million years earlier' } },
  modes: [
    { id: 'rise', name: 'Survival', blurb: 'Hatch small and stay alive. Feed, escape, moult through five stages and reach Prime, then hold it for ninety seconds. Allies share what they catch.', players: '1–4 co-op' },
    { id: 'domination', name: 'Domination', blurb: 'Pick any animal, own its rung. Feed, escape, drive off rivals, hold your range. First to Dominant standing held for ninety seconds wins. Allies pool standing.', players: '1–4 co-op' },
    { id: 'foodchain', name: 'Food Chain', blurb: 'Everyone picks from a different rung. The hunter needs the prey; the prey scores by surviving the hunter. One scoreboard.', players: '2–4 versus' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Everyone takes a turn as the big one, with the river mouth as the small ones\u2019 refuge. On your turn, catch as many as you can; on theirs, grow out of reach. Most caught wins.', players: '2–4 asymmetric' },
    { id: 'reef', name: 'Reef', blurb: 'No goal. Any animal, fully grown, and the Devonian coast to swim in.', players: '1–4 sandbox' },
  ],
  creatures: DEVONIAN_CREATURES,
  defaults: {
    player: 'coccosteus',
    // Delivered specimens only: these drive card and model preloading, and a creature that is still
    // borrowing a body has no portrait to load. Add each one here as its own model lands.
    boot: ['coccosteus', 'cladoselache', 'dunkleosteus', 'bothriolepis', 'gemuendina', 'doryaspis', 'stethacanthus', 'titanichthys', 'cheirolepis', 'onychodus', 'rhinodipterus', 'tiktaalik'],
    title: ['dunkleosteus', 'cladoselache', 'coccosteus', 'doryaspis'],
  },
  ecology: { schools: SNACK_SCHOOLS, giants: GIANTS, shadow: { creature: 'titanichthys', scale: 1.0 } },
  environment: { biomeNames: BIOME_NAMES, biomeDanger: BIOME_DANGER, atmosphere: ATMOS, sandColors: SAND_COLORS, floraColors: FLORA_BASE, flora: FLORA_DENSITY, surfaceY: SURFACE_Y },
  assets: {
    creatures: 'assets/devonian/creatures/', defaultPortraits: 'assets/devonian/creatures/',
    // Scenery and music are shared with the Cambrian until the Devonian sets are delivered
    // (docs/image-requests.md, docs/audio-requests.md); the biome plates are procedural stand-ins from
    // tools/devonian/biome-plates.mjs (`npm run devonian:plates`) until the painted ones land; the
    // creatures and brand are this era's own.
    // `sfx` names the SHARED library on purpose: bites, hits, parries and the UI are the same sounds
    // in both eras, and this era's own samples are addressed as 'devonian/<name>' (src/content/
    // devonian/sfx.ts), which sfxUrl resolves under assets/devonian/sfx/ whatever this path says.
    // Pointing it at the Devonian folder makes all 39 shared samples 404 and the sea goes silent.
    props: 'assets/props/', biomes: 'assets/devonian/biomes/', ui: 'assets/ui/', sfx: 'assets/sfx/', music: 'music/',
    ...DEVONIAN_BRAND, modelStatus: modelStatus as Record<DevonianCreatureId, 'preview' | 'final'>, modelBytes, standIns: DEVONIAN_STAND_INS,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits: {}, authoredColors: { creatures: authoredCreatures, props: {} } },
});
