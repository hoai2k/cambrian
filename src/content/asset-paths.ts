import { ACTIVE_ERA } from './index';
import type { EraDefinition } from './era';

/** Pure relative paths, usable from all entrypoints and asset validation scripts. */
export function createAssetPaths(era: EraDefinition) {
  const a = era.assets;
  return {
    model: (id: string, lod = 0) => `${a.creatures}${id}${lod ? '.lod1' : ''}.glb`,
    portrait: (id: string, kind: 'select' | 'card' | 'thumb') => `${a.defaultPortraits}${id}.${kind}.png`,
    biome: (id: string) => `${a.biomes}${id}.webp`,
    prop: (id: string) => `${a.props}${id}.glb`,
    ui: (file: string) => `${a.ui}${file}`,
    sfx: (name: string) => `${a.sfx}${name}.mp3`,
    music: (name: string) => `${a.music}${encodeURIComponent(name)}.mp3`,
  };
}
export const assetPaths = createAssetPaths(ACTIVE_ERA);
