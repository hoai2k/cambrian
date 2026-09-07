import { MUSIC } from './music';
import { defineEra } from '../era';
import { CAMBRIAN_CREATURES } from './creatures';
import { SNACK_SCHOOLS, GIANTS } from './ecology';
import { BIOME_NAMES, BIOME_DANGER, ATMOS, SAND_COLORS, FLORA_BASE } from './environment';
import { SCHEMES, CREATURE_SCHEMES } from './palettes';
import modelBytes from '../../render/asset-sizes.json';
import authoredColors from '../../shared/authored-colors.json';
import portraits from '../../../public/assets/creatures/schemes/manifest.json';

export const CAMBRIAN = defineEra({
  id: 'cambrian',
  title: 'Cambrian Explosion',
  modes: [
    { id: 'rise', name: 'Rise', blurb: 'Hatch as a larva. Eat, grow, fight, hide. Reach Apex and hold it for ninety seconds. Allies share the feast.', players: '1–4 co-op' },
    { id: 'frenzy', name: 'Feeding Frenzy', blurb: 'Growth race. First to Apex wins. Eating a rival steals their progress. Bots fill the empty seats.', players: '1–4 versus' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Player one is a giant. Everyone else is small, hungry, and trying to grow up before they get eaten.', players: '2–4 asymmetric' },
    { id: 'reef', name: 'Reef', blurb: 'No goal. Start as an adult with every move unlocked and just be an animal in the Cambrian.', players: '1–4 sandbox' },
  ],
  creatures: CAMBRIAN_CREATURES,
  defaults: {
    player: 'anomalocaris',
    boot: ['anomalocaris', 'waptia', 'marrella', 'opabinia', 'canadia', 'olenoides', 'hallucigenia', 'wiwaxia'],
    title: ['anomalocaris', 'waptia', 'opabinia', 'marrella'],
  },
  ecology: { schools: SNACK_SCHOOLS, giants: GIANTS, shadow: { creature: 'anomalocaris', scale: 6.0 } },
  environment: { biomeNames: BIOME_NAMES, biomeDanger: BIOME_DANGER, atmosphere: ATMOS, sandColors: SAND_COLORS, floraColors: FLORA_BASE },
  assets: {
    creatures: 'assets/creatures/', defaultPortraits: 'assets/creatures/defaults/',
    props: 'assets/props/', biomes: 'assets/biomes/', ui: 'assets/ui/', sfx: 'assets/sfx/', music: 'music/',
    logo: 'assets/brand/logo-engraved.webp', illustration: 'assets/brand/logo-illustrated.webp',
    emblem: 'assets/brand/emblem-engraved.webp', modelBytes,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits, authoredColors },
});
