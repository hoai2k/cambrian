import { ACTIVE_ERA } from '../content';
import type { CreatureId } from '../sim/creatures';
import type { Biome, LandmarkKind } from '../sim/world';
import { clampMark } from '../sim/ladder';

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
  /**
   * Furthest mark on the growth ladder each creature has been taken to in Rise, by creature id
   * (see src/sim/ladder.ts). Rise is the mode about growing up, so it is the one worth a record:
   * the select screen badges it on the creature's card and offers to start there again.
   *
   * A mark is fractional: the whole part is the rung, the fraction is how far through it. The top
   * rung is only ever written by finishing a run, so reaching it and stopping stores 3.5 — the
   * rung below, half grown — and coming back leaves you a short swim from the top.
   *
   * Kept per era like everything else here, and in the era's own numbering — rung 3 is a Giant in
   * the Cambrian and an Adult in the Devonian — because the record is never read across eras.
   */
  best: Partial<Record<CreatureId, number>>;
}

/** Per-era, so the Cambrian and Devonian records on one device never mix. */
const key = () => `${ACTIVE_ERA.copy.settingsKey}-codex`;
const EMPTY: Codex = { biomes: [], landmarks: [], apex: [], best: {} };

const clean = <T extends string>(v: unknown, allowed?: readonly T[]): T[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<T>();
  for (const x of v) if (typeof x === 'string' && (!allowed || (allowed as readonly string[]).includes(x))) seen.add(x as T);
  return [...seen];
};

/**
 * A stored mark table, sanitised. Ids the roster no longer has are dropped and anything that is
 * not a mark is ignored: a hand-edited or stale record must not be able to hatch a body at an
 * impossible size, so this is the only door the numbers come through. Fractions are kept — they
 * are how a half-grown rung is written — but nothing below the first rung is worth storing.
 */
const cleanBest = (v: unknown): Partial<Record<CreatureId, number>> => {
  const out: Partial<Record<CreatureId, number>> = {};
  if (!v || typeof v !== 'object') return out;
  const ids = new Set<string>(ACTIVE_ERA.creatures.map((c) => c.id));
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    if (!ids.has(k) || typeof n !== 'number') continue;
    const m = clampMark(n);
    if (m >= 1) out[k as CreatureId] = m;
  }
  return out;
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
      best: cleanBest(v.best),
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
  // A record of high-water marks merges by taking the higher one, and "fresh" means beaten.
  const best = { ...before.best }, freshBest: Partial<Record<CreatureId, number>> = {};
  for (const [k, n] of Object.entries(found.best) as [CreatureId, number][]) {
    if (n > (best[k] ?? -1)) { best[k] = n; freshBest[k] = n; }
  }
  return {
    codex: { biomes: biomes.all, landmarks: landmarks.all, apex: apex.all, best },
    fresh: { biomes: biomes.fresh, landmarks: landmarks.fresh, apex: apex.fresh, best: freshBest },
  };
}

/**
 * Fold this match's Rise high-water marks into the stored record, and say whether anything moved.
 *
 * This runs *while the match is being played*, not when it ends, because a player who grows a
 * Dunkleosteus to Adult and then quits to the title has still grown one to Adult. It touches only
 * `best` for the same reason the results screen snapshots before it merges: writing the biomes and
 * landmarks live would mean the results screen loaded a record that already contained this match's
 * finds and could never mark any of them new.
 */
export function recordBest(found: Partial<Record<CreatureId, number>>): boolean {
  const stored = loadCodex();
  const best = { ...stored.best };
  let moved = false;
  for (const [k, n] of Object.entries(found) as [CreatureId, number][]) {
    if (n > (best[k] ?? -1)) { best[k] = n; moved = true; }
  }
  if (moved) saveCodex({ ...stored, best });
  return moved;
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
