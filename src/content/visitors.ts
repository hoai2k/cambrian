import { CAMBRIAN_CREATURES } from './cambrian/creatures';
import { DEVONIAN_CREATURES } from './devonian/creatures';
import { TRIASSIC_CREATURES } from './triassic/creatures';
import NATURAL from './cambrian/natural-sizes.json';
import type { CreatureDef } from './creature-types';

/**
 * Animals from the other two games, for the ones you have earned.
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
  /** The game it is a native of, and finished. */
  era: EraId;
  def: CreatureDef;
  /** Body scale at the top of its own ladder. */
  scale: number;
  /** What it will actually measure in the water. */
  length: number;
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
  return { id: def.id, era, def, scale, length: adult * scale };
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

/** Read a visitor list out of the browser, where there is one. */
export const earnedVisitorsHere = (playing: EraId): Visitor[] => {
  try { return earnedVisitors(playing, (k) => localStorage.getItem(k)); } catch { return []; }
};
