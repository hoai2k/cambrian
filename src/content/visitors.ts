import { CAMBRIAN_CREATURES } from './cambrian/creatures';
import { DEVONIAN_CREATURES } from './devonian/creatures';
import { TRIASSIC_CREATURES } from './triassic/creatures';
import { TRIASSIC_GUESTS } from './triassic/guests';
import TRIASSIC_SHIPPED_BYTES from './triassic/asset-sizes.json';
import NATURAL from './cambrian/natural-sizes.json';
import type { CreatureDef } from './creature-types';

/**
 * Animals from the other two games, for the ones you have earned — and the standing guests.
 *
 * Take a creature to the top of its own game and it turns up in the other two as a *visitor*: a
 * body you may pick instead of the local roster, at the size it finishes its own game at. A
 * Dunkleosteus in the Cambrian is far larger than anything that sea has ever held, and that is the
 * whole point — visitors are a reward for finishing, not a balanced addition to the roster.
 *
 * Three things make this cheap enough to be worth doing:
 *
 * - The rosters are pure data. Every `creatures.ts` imports nothing but types, so reading another
 *   era's animals costs the array and no module graph, which is why this can sit in the game's
 *   bundle rather than behind a fetch.
 * - The records are already on one origin. All three games are pages of one build, so the Cambrian
 *   page can read `devonian-settings-codex` directly. It must not go through `loadCodex`, which
 *   filters ids against the *active* era's roster and would strip every foreign id it was given.
 * - An asset path can already name another era's folder (`'<era>/<id>'`, built for the Triassic's
 *   borrowed bodies), so a visitor's model and portraits resolve with no new mechanism.
 *
 * There is a second kind, added when the first two Cretaceous bodies were built: a **standing
 * guest**. Archelon and Mosasaurus belong to no game's roster at all — where they belong is the
 * open question in `docs/triassic/05-mesozoic-expansion.md`, and putting them on the Triassic's
 * roster would answer it by accident — so there is nothing to take them to the top of and nothing
 * to earn. They are admitted unconditionally, gated only on their body having shipped, and they are
 * visitors in every other respect: through `admitVisitors`, never in `CREATURES` or `PLAYABLE`, and
 * arriving full grown at the ladder's top scale. See `standingVisitors` below.
 */
export type EraId = 'cambrian' | 'devonian' | 'triassic';
export const ERA_IDS: readonly EraId[] = ['cambrian', 'devonian', 'triassic'];

const ROSTERS: Record<EraId, readonly CreatureDef[]> = {
  cambrian: CAMBRIAN_CREATURES, devonian: DEVONIAN_CREATURES, triassic: TRIASSIC_CREATURES,
};
/** The localStorage prefix each game keeps its record under (`copy.settingsKey`). */
const SETTINGS_KEY: Record<EraId, string> = {
  cambrian: 'cambrian-settings', devonian: 'devonian-settings', triassic: 'triassic-settings',
};
export const ERA_NAME: Record<EraId, string> = {
  cambrian: 'Cambrian', devonian: 'Devonian', triassic: 'Triassic',
};
/**
 * The body scale the top of each game's ladder is worth, in that game's own terms: the Cambrian's
 * Apex tier and the five-stage Prime the other two share. Written here rather than imported because
 * `src/content` sits under `src/sim` and must not reach up into it; `npm run visitors` checks these
 * against `TIER_SCALE` and `PRIME_SCALE` so they cannot drift.
 */
export const APEX_SCALE: Record<EraId, number> = { cambrian: 2.6, devonian: 1.35, triassic: 1.35 };

export interface Visitor {
  id: string;
  /**
   * The game whose folder holds this animal's files, and whose ladder its scale comes from.
   *
   * For an earned visitor that is also the game it is a native of. For a **standing guest** it is
   * not: Archelon and Mosasaurus are Late Cretaceous and belong to no game at all yet, and `era`
   * stays `'triassic'` because that is where their files live and how `'<era>/<id>'` resolves.
   * What they are really from is `origin`, which is what anything that *says* where a visitor is
   * from must read.
   */
  era: EraId;
  def: CreatureDef;
  /** Body scale at the top of its own ladder. */
  scale: number;
  /** What it will actually measure in the water. */
  length: number;
  /** Where this animal is from, in words: the era's name, or a guest's own period. */
  origin: string;
  /**
   * True for a **standing guest**: admitted to every game unconditionally rather than earned in
   * one of them. Nothing else about a visitor changes — it is still admitted through
   * `admitVisitors`, still absent from `CREATURES` and `PLAYABLE`, and still arrives full grown.
   */
  standing?: true;
}

/** The Cambrian plays at its animals' real proportions, so a Cambrian visitor arrives at those. */
const naturalLength = (id: string): number | undefined =>
  (NATURAL as Record<string, { adultLength?: number } | undefined>)[id]?.adultLength;

const defOf = (era: EraId, id: string): CreatureDef | undefined => ROSTERS[era].find((c) => c.id === id);

/** Everything the given era could ever send abroad: its own animals, at the size they finish at. */
export function visitorsFrom(era: EraId): Visitor[] {
  return ROSTERS[era]
    // A shore animal never leaves the beach at home and would have nothing to do in another sea.
    .filter((c) => !c.shore)
    .map((c) => makeVisitor(era, c));
}

function makeVisitor(era: EraId, def: CreatureDef): Visitor {
  const scale = APEX_SCALE[era];
  const adult = (era === 'cambrian' ? naturalLength(def.id) : undefined) ?? def.adultLength;
  return { id: def.id, era, def, scale, length: adult * scale, origin: ERA_NAME[era] };
}

/**
 * The **standing guests**: animals built in one game's folder that belong to no game's roster.
 *
 * Archelon and Mosasaurus are Late Cretaceous (`src/content/triassic/expansion.json`), and the
 * question of where they belong is deliberately open. `earnedVisitors` cannot reach them — there is
 * no Cretaceous game to take them to the top of — so they are admitted **unconditionally**, and the
 * one condition they do get is that the body exists: an id with no entry in the Triassic's
 * `asset-sizes.json` has no model shipped, and a pickable animal with nothing to draw is worse than
 * an absent one. That gate is why this reads the shipped sizes rather than a hand-kept list.
 *
 * They are guests in the Triassic too. A guest is not on that roster either, so it visits the game
 * whose folder its files happen to sit in exactly as it visits the other two.
 */
const GUESTS: Record<EraId, readonly CreatureDef[]> = {
  cambrian: [], devonian: [], triassic: TRIASSIC_GUESTS,
};
const SHIPPED: Record<EraId, Readonly<Record<string, number>>> = {
  cambrian: {}, devonian: {}, triassic: TRIASSIC_SHIPPED_BYTES,
};
/** Where a standing guest is really from, for the one line that says so. */
const GUEST_ORIGIN: Record<string, string> = {
  archelon: 'Late Cretaceous', mosasaurus: 'Late Cretaceous',
};

export function standingVisitors(playing: EraId): Visitor[] {
  const out: Visitor[] = [];
  for (const era of ERA_IDS) {
    for (const def of GUESTS[era]) {
      if (!SHIPPED[era][def.id]) continue;      // no body has landed: not pickable anywhere
      const scale = APEX_SCALE[era];
      out.push({
        id: def.id, era, def, scale, length: def.adultLength * scale,
        origin: GUEST_ORIGIN[def.id] ?? ERA_NAME[era], standing: true,
      });
    }
  }
  void playing;   // a guest belongs to no roster, so it is a guest in every game including this one
  return out;
}

/** The visitor for one id, wherever it is from. Undefined for an id no game has. */
export function visitorFor(era: EraId, id: string): Visitor | undefined {
  const def = defOf(era, id);
  return def && !def.shore ? makeVisitor(era, def) : undefined;
}

/**
 * What this device has earned the right to bring into `playing`.
 *
 * Reads the other games' records straight out of storage, because the shared loader would throw
 * their ids away. Anything unreadable — never played, private browsing, a hand-edited record — is
 * simply an empty list: a visitor is a bonus on top of the game and can never be a reason it
 * fails to start.
 */
export function earnedVisitors(playing: EraId, read: (key: string) => string | null): Visitor[] {
  const out: Visitor[] = [];
  for (const era of ERA_IDS) {
    if (era === playing) continue;
    let apex: unknown;
    try { apex = JSON.parse(read(`${SETTINGS_KEY[era]}-codex`) ?? 'null')?.apex; } catch { continue; }
    if (!Array.isArray(apex)) continue;
    const seen = new Set<string>();
    for (const id of apex) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      const v = visitorFor(era, id);
      if (v) out.push(v);
    }
  }
  // Biggest first: the reason to bring one is that it does not belong here.
  return out.sort((a, b) => b.length - a.length || a.id.localeCompare(b.id));
}

/**
 * Everything this device may bring into `playing`: the standing guests, and whatever it has earned.
 *
 * The two are kept apart above and joined only here, because they answer different questions — one
 * is "what is built", the other "what has this player done" — and a test that wants to know nothing
 * has been earned should not have to subtract the guests first.
 */
export function visitorsHere(playing: EraId, read: (key: string) => string | null): Visitor[] {
  // Guests sort in with the rest rather than ahead of them: a visitor is a visitor however it
  // arrived, and the list has always been biggest first.
  return [...standingVisitors(playing), ...earnedVisitors(playing, read)]
    .sort((a, b) => b.length - a.length || a.id.localeCompare(b.id));
}

/** Read the visitor list out of the browser, where there is one. */
export const visitorsInBrowser = (playing: EraId): Visitor[] => {
  try { return visitorsHere(playing, (k) => localStorage.getItem(k)); } catch { return standingVisitors(playing); }
};
