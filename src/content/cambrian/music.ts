import type { MusicTrack } from '../../audio/music';

export const MUSIC: MusicTrack[] = [
  { name: 'Tide of First Bones', opening: true },
  { name: 'First Tide' },
  // The area themes (see docs/redesign/04-infinite-ocean.md · Danger, mood and the art brief).
  // A track that names biomes is reserved for them: it is never shuffled into the rotation, and
  // the score crossfades to it while the player is in one of its biomes. The split follows
  // BIOME_DANGER — the two safest bands and the three worst.
  { name: 'Cambrian Drifting', biomes: ['shallows', 'nursery'] },
  { name: 'Cambrian Abyss', biomes: ['channel', 'escarpment', 'basin'] },
];

