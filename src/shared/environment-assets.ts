import { ACTIVE_ERA } from '../content';
import { BIOMES } from '../sim/world';
import { assetPaths } from '../content/asset-paths';
/** Assets for the nine-biome ocean. Some consumers are still planned on main. */
export const BIOME_ART = BIOMES.map(id => ({ id, name: ACTIVE_ERA.environment.biomeNames[id] }));
export type BiomeArtId = typeof BIOME_ART[number]['id'];
export const biomeArtPath = (id: BiomeArtId) => assetPaths.biome(id);
export const RADAR_GLYPHS = ['player', 'threat', 'giant', 'home', 'shore'] as const;
export const radarGlyphPath = (id: typeof RADAR_GLYPHS[number]) => assetPaths.ui(`radar-${id}.svg`);
