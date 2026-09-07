import { defineEra } from '../era';
import type { Slot } from '../../shared/palettes';
import { DEVONIAN_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, ATMOS, SAND_COLORS, FLORA_BASE } from './environment';
import { MUSIC } from './music';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';
import { DEVONIAN_BRAND, DEVONIAN_BRAND_EXTRAS } from './brand';

/**
 * Model sizes for the streaming loader's progress estimate. Delivered specimens (tools/devonian/
 * shipped.json) carry their real byte counts; the rest of the roster is pending and gets a
 * placeholder so era validation passes. tools/devonian-test.ts checks the shipped sizes.
 */
const SHIPPED_BYTES: Record<string, number> = {
  dunkleosteus: 1350428, titanichthys: 2448352, coccosteus: 2332324, bothriolepis: 1779500, gemuendina: 3199632, doryaspis: 2900876,
};
export const DEVONIAN_SHIPPED = Object.keys(SHIPPED_BYTES);
const modelBytes = Object.fromEntries(DEVONIAN_CREATURES.map((c) => [c.id, SHIPPED_BYTES[c.id] ?? 1]));

/** Camouflage's fallback colours per creature: its default scheme's slots. */
const authoredCreatures = Object.fromEntries(DEVONIAN_CREATURES.map((c) => {
  const scheme = SCHEMES.find((s) => s.id === CREATURE_SCHEMES[c.id]) ?? SCHEMES.find((s) => s.colors);
  return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
}));

export const DEVONIAN = defineEra({
  id: 'devonian',
  title: 'Devonian Domination',
  copy: { tagline: 'Feed. Escape. Hold your range.', taglineEm: '375 million years ago, the sea had a pecking order.', loading: 'FILLING THE BASIN…', lose: 'THE SEA WINS', settingsKey: 'devonian-settings', mobileIllustration: DEVONIAN_BRAND_EXTRAS.mobileIllustration },
  modes: [
    { id: 'domination', name: 'Domination', blurb: 'Pick any animal, own its rung. Feed, escape, drive off rivals, hold your range. First to Dominant standing held for ninety seconds wins. Allies pool standing.', players: '1–4 co-op' },
    { id: 'foodchain', name: 'Food Chain', blurb: 'Everyone picks from a different rung. The hunter needs the prey; the prey scores by surviving the hunter. One scoreboard.', players: '2–4 versus' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Player one is Dunkleosteus. Everyone else is small, with the river mouth as a refuge, trying to grow up before they get eaten.', players: '2–4 asymmetric' },
    { id: 'reef', name: 'Reef', blurb: 'No goal. Any animal, fully grown, and the Devonian coast to swim in.', players: '1–4 sandbox' },
  ],
  creatures: DEVONIAN_CREATURES,
  defaults: {
    player: 'coccosteus',
    boot: ['coccosteus', 'cheirolepis', 'cladoselache', 'eldredgeops', 'tiktaalik', 'dunkleosteus', 'bothriolepis', 'manticoceras'],
    title: ['dunkleosteus', 'cladoselache', 'tiktaalik', 'eldredgeops'],
  },
  ecology: { schools: SNACK_SCHOOLS, giants: GIANTS, shadow: { creature: 'titanichthys', scale: 1.0 } },
  environment: { biomeNames: BIOME_NAMES, biomeDanger: BIOME_DANGER, atmosphere: ATMOS, sandColors: SAND_COLORS, floraColors: FLORA_BASE },
  assets: {
    creatures: 'assets/devonian/creatures/', defaultPortraits: 'assets/devonian/creatures/',
    // Scenery, biome plates and music are shared with the Cambrian until the Devonian sets are delivered
    // (docs/image-requests.md, docs/audio-requests.md); the creatures, SFX and brand are this era's own.
    props: 'assets/props/', biomes: 'assets/biomes/', ui: 'assets/ui/', sfx: 'assets/devonian/sfx/', music: 'music/',
    ...DEVONIAN_BRAND, modelBytes,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits: {}, authoredColors: { creatures: authoredCreatures, props: {} } },
});
