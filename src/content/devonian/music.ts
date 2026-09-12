import type { MusicTrack } from '../../audio/music';

/**
 * The Devonian soundtrack. "Devonian Shells" is the era's own opener and the Cambrian reef tracks
 * fill the rotation (the era's music path is the shared music/ folder), with two area themes of its
 * own. A missing file drops out of the rotation (see src/audio/music.ts).
 */
export const MUSIC: readonly MusicTrack[] = [
  { name: 'Devonian Shells', opening: true },
  { name: 'Devonian Tide' },
  { name: 'Tide of First Bones' },
  { name: 'First Tide' },
  // The area themes. A track that names biomes is reserved for them: never shuffled into the
  // rotation, and crossfaded to while the player is in one of its biomes. Same two bands as the
  // Cambrian, under this era's names — the River Mouth and the Sandy Shallows against the Tidal
  // Channels, the Reef Front and the Open Sea.
  { name: 'Devonian Calm', biomes: ['shallows', 'nursery'] },
  { name: 'Devonian Ritual', biomes: ['channel', 'escarpment', 'basin'] },
];
