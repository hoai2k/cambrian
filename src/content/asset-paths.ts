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
/**
 * Paths for the active era. Resolved per call rather than at import, because an era entry page
 * (see src/devonian/main.tsx) selects its era after modules like the audio library have loaded.
 */
type AssetPaths = ReturnType<typeof createAssetPaths>;
let cachedFor: EraDefinition | undefined, cached: AssetPaths | undefined;
const current = (): AssetPaths => { if (cachedFor !== ACTIVE_ERA || !cached) { cachedFor = ACTIVE_ERA; cached = createAssetPaths(ACTIVE_ERA); } return cached; };
export const assetPaths: AssetPaths = {
  model: (id, lod) => current().model(id, lod),
  portrait: (id, kind) => current().portrait(id, kind),
  biome: (id) => current().biome(id),
  prop: (id) => current().prop(id),
  ui: (file) => current().ui(file),
  sfx: (name) => current().sfx(name),
  music: (name) => current().music(name),
};
