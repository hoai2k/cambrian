import type { MusicTrack } from '../../audio/music';

/**
 * The Devonian soundtrack. Until its own tracks are delivered it reuses the Cambrian reef tracks
 * (resolved through this era's music path, so the files must be copied or linked there), and tags
 * the two requested themes so dropping them in is the whole integration. A missing file drops out
 * of the rotation (see src/audio/music.ts).
 */
export const MUSIC: readonly MusicTrack[] = [
  { name: 'Tide of First Bones', opening: true },
  { name: 'First Tide' },
  { name: 'theme-rivermouth', biomes: ['nursery', 'shallows'] },
  { name: 'theme-opensea', biomes: ['channel', 'escarpment', 'basin'] },
];
