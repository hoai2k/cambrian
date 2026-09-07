import { defineEra } from '../era';
import type { Slot } from '../../shared/palettes';
import { DEVONIAN_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, ATMOS, SAND_COLORS, FLORA_BASE } from './environment';
import { MUSIC } from './music';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';

/**
 * Placeholder model sizes: the Devonian models are pending. Era validation requires a positive size
 * per creature; the streaming loader only uses it for progress estimates. Replace with the real
 * byte counts from the intake tooling when the GLBs land.
 */
const modelBytes = Object.fromEntries(DEVONIAN_CREATURES.map((c) => [c.id, 1]));

/** Camouflage's fallback colours per creature: its default scheme's slots. */
const authoredCreatures = Object.fromEntries(DEVONIAN_CREATURES.map((c) => {
  const scheme = SCHEMES.find((s) => s.id === CREATURE_SCHEMES[c.id]) ?? SCHEMES.find((s) => s.colors);
  return [c.id, scheme?.colors ?? ({ body: c.color, eyes: '#101010', fins: c.accent, legs: c.color, accent: c.accent, underside: c.color } as Record<Slot, string>)];
}));

export const DEVONIAN = defineEra({
  id: 'devonian',
  title: 'Devonian Domination',
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
    creatures: 'assets/devonian/creatures/', defaultPortraits: 'assets/devonian/creatures/defaults/',
    props: 'assets/devonian/props/', biomes: 'assets/devonian/biomes/', ui: 'assets/ui/', sfx: 'assets/devonian/sfx/', music: 'assets/devonian/music/',
    logo: 'assets/devonian/brand/logo.webp', illustration: 'assets/devonian/brand/illustration.webp',
    emblem: 'assets/devonian/brand/emblem.webp', modelBytes,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits: {}, authoredColors: { creatures: authoredCreatures, props: {} } },
});
