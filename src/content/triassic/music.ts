import type { MusicTrack } from '../../audio/music';

/**
 * The Triassic soundtrack. Three tracks of its own have landed, in the same shape the Devonian
 * takes: an opener that plays the era in, and two area themes reserved for the biomes they were
 * written for — never shuffled into the rotation, crossfaded to on a dwell and back again on a
 * longer one (`stepArea` in src/audio/audio.ts). The shared tide tracks fill the rotation between
 * them, because the era has no third and fourth track of its own yet.
 *
 * The two bands are the same ones both other eras split on: the water you are safe in against the
 * water you are not. *Calm* is the gypsum flats and the conifer shore; *Ritual* is the margin
 * channels, the reef front and the black basin.
 */
export const MUSIC: readonly MusicTrack[] = [
  { name: 'Triassic Horizon', opening: true },
  { name: 'First Tide' },
  { name: 'Tide of First Bones' },
  { name: 'Cambrian Drifting' },
  { name: 'Cambrian Abyss' },
  { name: 'Triassic Calm', biomes: ['shallows', 'nursery'] },
  { name: 'Triassic Ritual', biomes: ['channel', 'escarpment', 'basin'] },
];
