/** Assets for the nine-biome ocean. Some consumers are still planned on main. */
export const BIOME_ART = [
  { id: 'shallows', name: 'Sunlit Shallows' }, { id: 'nursery', name: 'Nursery Reef' },
  { id: 'shelf', name: 'Open Shelf' }, { id: 'forest', name: 'Sponge Forest' },
  { id: 'boulders', name: 'Boulder Field' }, { id: 'flats', name: 'Microbial Flats' },
  { id: 'channel', name: 'The Channels' }, { id: 'escarpment', name: 'The Escarpment' },
  { id: 'basin', name: 'Deep Basin' },
] as const;
export type BiomeArtId = typeof BIOME_ART[number]['id'];
export const biomeArtPath = (id: BiomeArtId) => `assets/biomes/${id}.webp`;
export const RADAR_GLYPHS = ['player', 'threat', 'giant', 'home', 'shore'] as const;
export const radarGlyphPath = (id: typeof RADAR_GLYPHS[number]) => `assets/ui/radar-${id}.svg`;
