import type { MusicTrack } from '../../audio/music';

/**
 * The Devonian soundtrack. "Devonian Shells" is the era's own opener; the Cambrian reef tracks
 * fill the rotation until more arrive (the era's music path is the shared music/ folder), and the
 * two requested biome themes are tagged so dropping them in is the whole integration. A missing file drops out
 * of the rotation (see src/audio/music.ts).
 */
export const MUSIC: readonly MusicTrack[] = [
  { name: 'Devonian Shells', opening: true },
  { name: 'Tide of First Bones' },
  { name: 'First Tide' },
  // Biome themes are optional and not written yet. A track belongs in this list only once its file
  // is in public/music/: a name with no file is fetched, 404s, and then drops out of the rotation.
  // To add one, drop the mp3 in and add { name: 'theme-rivermouth', biomes: ['nursery', 'shallows'] }
  // (or theme-opensea for ['channel', 'escarpment', 'basin']).
];
