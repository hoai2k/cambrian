import { ACTIVE_ERA } from './index';
import type { EraDefinition } from './era';
import type { EraId } from './visitors';

/**
 * Animals visiting from another game, and the folder their files are in.
 *
 * A visitor's model and portraits live where they were built — under the era that made them — and
 * nothing else about the active era knows the id at all, so the two resolvers consult this first.
 * Registered by the shell once it knows what the player has earned; empty otherwise, which is the
 * ordinary case and costs a Map miss.
 */
const guestEra = new Map<string, EraId>();
/**
 * Where each game keeps its creature files. Written out rather than read off the era definitions,
 * because importing another era's `index.ts` pulls its whole content graph — palettes, environment,
 * sounds — into this page for the sake of two strings. `npm run visitors` checks these against the
 * real definitions so they cannot drift.
 */
const GUEST_MODELS: Record<EraId, string> = {
  cambrian: 'assets/creatures/', devonian: 'assets/devonian/creatures/', triassic: 'assets/triassic/creatures/',
};
const GUEST_PORTRAITS: Record<EraId, string> = {
  cambrian: 'assets/creatures/defaults/', devonian: 'assets/devonian/creatures/', triassic: 'assets/triassic/creatures/',
};
export function registerVisitorAssets(entries: readonly { id: string; era: EraId }[]) {
  for (const e of entries) guestEra.set(e.id, e.era);
}
export const visitorAssetEra = (id: string) => guestEra.get(id);

/** Pure relative paths, usable from all entrypoints and asset validation scripts. */
export function createAssetPaths(era: EraDefinition) {
  const a = era.assets;
  return {
    model: (id: string, lod = 0) => {
      const guest = guestEra.get(id);
      if (guest) return `${GUEST_MODELS[guest]}${id}${lod ? '.lod1' : ''}.glb`;
      const standIn = a.standIns?.[id as keyof typeof a.standIns];
      // '<era>/<id>' borrows a body from another era's folder (the Triassic, until its own land).
      const slash = standIn?.indexOf('/') ?? -1;
      const folder = standIn && slash > 0 ? `assets/${standIn.slice(0, slash)}/creatures/` : a.creatures;
      const file = standIn && slash > 0 ? standIn.slice(slash + 1) : standIn ?? id;
      return `${folder}${file}${lod ? '.lod1' : ''}.glb`;
    },
    portrait: (id: string, kind: 'select' | 'card' | 'thumb') => {
      const guest = guestEra.get(id);
      if (guest) return `${GUEST_PORTRAITS[guest]}${id}.${kind}.png`;
      return `${a.defaultPortraits}${id}.${kind}.png`;
    },
    biome: (id: string) => `${a.biomes}${era.environment.biomePlates?.[id as keyof typeof era.environment.biomePlates] ?? id}.webp`,
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
