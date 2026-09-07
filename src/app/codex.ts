import { ACTIVE_ERA } from '../content';
import type { CreatureId } from '../sim/creatures';
import type { Biome, LandmarkKind } from '../sim/world';

/**
 * The record of everything the player has found in this era, kept across sessions on this device.
 *
 * The sea is endless and procedurally generated, so no two matches visit the same places. What
 * carries over between them is what you have *seen*: the biomes you have swum through, the
 * landmarks you have found, and the species you have taken all the way to Apex. The results
 * screen reads this and highlights whatever the match just added to it.
 */
export interface Codex {
  biomes: Biome[];
  landmarks: LandmarkKind[];
  apex: CreatureId[];
}

/** Per-era, so the Cambrian and Devonian records on one device never mix. */
const key = () => `${ACTIVE_ERA.copy.settingsKey}-codex`;
const EMPTY: Codex = { biomes: [], landmarks: [], apex: [] };

const clean = <T extends string>(v: unknown, allowed?: readonly T[]): T[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<T>();
  for (const x of v) if (typeof x === 'string' && (!allowed || (allowed as readonly string[]).includes(x))) seen.add(x as T);
  return [...seen];
};

export function loadCodex(): Codex {
  try {
    const raw = localStorage.getItem(key());
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<Codex>;
    // Stored ids outlive the code that wrote them: a renamed creature or a dropped biome must not
    // crash a results screen, so anything unrecognised is simply forgotten.
    return {
      biomes: clean<Biome>(v.biomes),
      landmarks: clean<LandmarkKind>(v.landmarks, ['arch', 'stack', 'bones']),
      apex: clean<CreatureId>(v.apex, ACTIVE_ERA.creatures.map((c) => c.id)),
    };
  } catch { return EMPTY; }
}

/**
 * Fold a match's finds into a record, purely: what the record becomes, and what in it is new.
 *
 * Reading, merging and writing are deliberately three steps. The results screen renders more than
 * once for the same match — React re-renders, and StrictMode mounts twice in development — and a
 * merge that wrote as it computed would see its own writes on the second pass and report nothing
 * as new. So the caller snapshots the stored record once, merges against that snapshot however
 * often it likes, and saves in an effect, where writing the same value twice changes nothing.
 */
export function mergeCodex(before: Codex, found: Codex): { codex: Codex; fresh: Codex } {
  const merge = <T extends string>(old: T[], now: T[]) => {
    const set = new Set(old);
    const fresh = now.filter((x, i) => !set.has(x) && now.indexOf(x) === i);
    return { all: [...old, ...fresh], fresh };
  };
  const biomes = merge(before.biomes, found.biomes);
  const landmarks = merge(before.landmarks, found.landmarks);
  const apex = merge(before.apex, found.apex);
  return {
    codex: { biomes: biomes.all, landmarks: landmarks.all, apex: apex.all },
    fresh: { biomes: biomes.fresh, landmarks: landmarks.fresh, apex: apex.fresh },
  };
}

export function saveCodex(codex: Codex) {
  // Private browsing and a full quota both throw here. The record is a bonus on top of the match,
  // never a thing the match depends on, so a failure to store it is silent.
  try { localStorage.setItem(key(), JSON.stringify(codex)); } catch { /* nothing to do about it */ }
}

export const LANDMARK_NAMES: Record<LandmarkKind, string> = {
  arch: 'The Arch',
  stack: 'The Stack',
  bones: 'A Giant’s Bones',
};
export const LANDMARK_BLURBS: Record<LandmarkKind, string> = {
  arch: 'A span of rock with the sea running under it.',
  stack: 'Boulders piled into a tower you can climb.',
  bones: 'A dead giant on the floor. Food — and something comes back for it.',
};
