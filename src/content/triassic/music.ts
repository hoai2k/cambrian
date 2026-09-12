import type { MusicTrack } from '../../audio/music';

/**
 * The Triassic soundtrack. Nothing of its own has been delivered (docs/audio-requests.md), so the
 * shared tide tracks fill the rotation with 'First Tide' opening; the two area themes are named
 * here so the files are picked up from public/music/ the day they land and are silent until then.
 */
export const MUSIC: readonly MusicTrack[] = [
  { name: 'First Tide', opening: true },
  { name: 'Tide of First Bones' },
  { name: 'Cambrian Drifting' },
  { name: 'Cambrian Abyss' },
  { name: 'Triassic Flats', biomes: ['shallows', 'nursery'] },
  { name: 'Triassic Deep', biomes: ['channel', 'escarpment', 'basin'] },
];
