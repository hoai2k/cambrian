import { MUSIC } from './music';
import { CAMBRIAN_CLIP_NOTES, CAMBRIAN_MODEL_NOTES, CAMBRIAN_MODEL_STATUS } from './model-status';
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
  title: 'Cambrian Conquest',
  copy: { tagline: 'Eat. Grow. Fight. Run.', taglineEm: '508 million years ago, everything was hungry.', loading: 'WAKING THE REEF…', lose: 'THE REEF WINS', settingsKey: 'cambrian-settings', sibling: { title: 'Devonian Domination', path: 'devonian/', blurb: '133 million years later' } },
  modes: [
    { id: 'rise', name: 'Rise', blurb: 'Hatch as a larva. Eat, grow, fight, hide. Reach Apex and hold it for ninety seconds. Share the feast with the others, or eat them.', players: '1–4' },
    { id: 'hunted', name: 'Hunter & Hunted', blurb: 'Everyone takes a turn as the giant. On yours, catch as many of the small ones as you can; on theirs, hide, bait and grow out of reach. Most caught wins.', players: '2–4 asymmetric' },
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
    emblem: 'assets/brand/emblem-engraved.webp', modelBytes, modelStatus: CAMBRIAN_MODEL_STATUS, modelNotes: CAMBRIAN_MODEL_NOTES, clipNotes: CAMBRIAN_CLIP_NOTES,
  },
  audio: { music: MUSIC },
  presentation: { schemes: SCHEMES, creatureSchemes: CREATURE_SCHEMES, portraits, authoredColors },
});
