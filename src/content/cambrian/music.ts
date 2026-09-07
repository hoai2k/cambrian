import type { MusicTrack } from '../../audio/music';

export const MUSIC: MusicTrack[] = [
  { name: 'Tide of First Bones', opening: true },
  { name: 'First Tide' },
  // The biome themes (see docs/redesign/04-infinite-ocean.md · Danger, mood and the art brief).
  // Requested in docs/audio-requests.md; until the files land they fail to load and drop out.
  { name: 'theme-calm', biomes: ['shallows', 'nursery'] },
  { name: 'theme-danger', biomes: ['channel', 'escarpment', 'basin'] },
];

