import { SCHEMES, schemeForCreature } from './palettes';

/**
 * Telling two players apart when they have picked the same animal.
 *
 * Four seats and one roster means duplicates are ordinary — a lobby of four Anomalocaris is a
 * perfectly reasonable thing to want — and until now they were drawn identically, so the only way
 * to find yourself was the marker over your own head. The recolour hook already exists for
 * camouflage and for the era's authored per-creature palette, and it is per material instance, so
 * a second player costs nothing but a different scheme id.
 *
 * The rule is the one the request asks for and is worth stating exactly: the *first* seat on a
 * given creature keeps that creature's authored colours, so a player alone is never recoloured and
 * the animal the roster shows is the animal that swims. Only the duplicates move, and they move to
 * schemes drawn at random from the era's own pack.
 *
 * Assignment is sticky rather than recomputed: a seat that already holds a usable scheme keeps it,
 * so changing seat three's creature does not re-roll seat two's colours. It is only ever dropped
 * when it stops making sense — the seat became the first on its creature, or two seats landed on
 * the same scheme.
 */
export interface SeatLike {
  creature: string;
  /** The scheme this seat is drawn in; absent means the creature's own authored colours. */
  scheme?: string;
}

/** Schemes a duplicate may be given: anything in the pack that actually repaints the body. */
export const alternateSchemes = (creatureId: string): string[] => {
  const authored = schemeForCreature(creatureId);
  return SCHEMES.filter((s) => s.colors && s.id !== authored).map((s) => s.id);
};

/**
 * Settle every seat's scheme. Pure in `players` and `roll` — `roll()` returns 0..1 — so the same
 * lineup and the same rolls give the same colours, which is what makes this testable.
 */
export function assignSeatSchemes<T extends SeatLike>(players: readonly T[], roll: () => number): T[] {
  const usedFor = new Map<string, Set<string>>();     // creature id -> schemes already spoken for
  const seen = new Map<string, number>();             // creature id -> how many seats so far
  const out: T[] = [];
  for (const p of players) {
    const n = seen.get(p.creature) ?? 0;
    seen.set(p.creature, n + 1);
    // The first seat on a creature is the creature as the roster draws it, always.
    if (n === 0) { out.push(p.scheme === undefined ? p : { ...p, scheme: undefined }); continue; }
    const used = usedFor.get(p.creature) ?? new Set<string>();
    usedFor.set(p.creature, used);
    const pool = alternateSchemes(p.creature).filter((s) => !used.has(s));
    // Keep what this seat already has, if it is still a sensible answer.
    if (p.scheme && pool.includes(p.scheme)) { used.add(p.scheme); out.push(p); continue; }
    if (!pool.length) { out.push(p.scheme === undefined ? p : { ...p, scheme: undefined }); continue; }
    const pickIndex = Math.min(pool.length - 1, Math.max(0, Math.floor(roll() * pool.length)));
    const pick = pool[pickIndex];
    used.add(pick);
    out.push({ ...p, scheme: pick });
  }
  return out;
}
