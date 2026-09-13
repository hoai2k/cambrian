/**
 * The day, and what it does to appetite.
 *
 * The sea used to be lit the same way for ever and every animal in it was permanently hungry, so
 * an ambient creature that could see you was always coming for you. That made the reef exhausting
 * and, oddly, boring: if everything hunts all the time then nothing hunting is information.
 *
 * So the day turns. It is mostly daylight, with a shorter night and two narrow bands of twilight
 * between them, and it is the twilight that the predators wait for. Between those bands an animal
 * that has eaten recently has no reason to chase anything, and mostly does not. The player's day
 * is therefore long stretches of hunting and being left alone, punctuated twice a cycle by
 * everything around them becoming interested at once.
 *
 * Everything here is a pure function of simulation time: no state, safe to call from the
 * simulation, the renderer and the tools, and identical for both split-screen players.
 */

/** One full turn of the day, in seconds. Long enough that dusk is an event, short enough to see two. */
export const DAY_LENGTH = 480;

/**
 * Where each phase begins, as a fraction of the cycle. Dawn opens the day at 0. Night is
 * deliberately shorter than daylight — this is a sunlit shelf sea, not a cave.
 *
 *   dawn  0.00 – 0.10   48 s
 *   day   0.10 – 0.58  230 s
 *   dusk  0.58 – 0.68   48 s
 *   night 0.68 – 1.00  154 s
 */
const DAWN_END = 0.10, DAY_END = 0.58, DUSK_END = 0.68;

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export const PHASE_NAMES: Record<Phase, string> = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };

/** Position in the cycle, 0..1. `offset` lets a match start somewhere other than first light. */
export function dayFraction(time: number, offset = 0.16): number {
  const f = (time / DAY_LENGTH + offset) % 1;
  return f < 0 ? f + 1 : f;
}

export function phaseAt(time: number, offset?: number): Phase {
  const f = dayFraction(time, offset);
  return f < DAWN_END ? 'dawn' : f < DAY_END ? 'day' : f < DUSK_END ? 'dusk' : 'night';
}

/** Seconds until the phase changes. The HUD counts dusk down; the player learns to read it. */
export function untilNextPhase(time: number, offset?: number): number {
  const f = dayFraction(time, offset);
  const next = f < DAWN_END ? DAWN_END : f < DAY_END ? DAY_END : f < DUSK_END ? DUSK_END : 1;
  return (next - f) * DAY_LENGTH;
}

const smoothstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * How light it is, 0 (deepest night) to 1 (noon). Ramps through the twilight bands rather than
 * switching, so the renderer can lerp fog, sun and sky straight off this number.
 */
export function daylight(time: number, offset?: number): number {
  const f = dayFraction(time, offset);
  if (f < DAWN_END) return smoothstep(0, DAWN_END, f);                    // night → full light
  if (f < DAY_END) return 1;
  if (f < DUSK_END) return 1 - smoothstep(DAY_END, DUSK_END, f);          // full light → night
  return 0;
}

/**
 * How much the reef wants to hunt, 0..1.
 *
 * Peaks through both twilight bands — the half-light is when a predator can see its prey and its
 * prey cannot see it — sits low through the middle of the day, and rests a little above that at
 * night. It scales how long an animal will go between meals before it looks for another (see
 * `huntInterval`), so it changes how *often* things hunt rather than switching hunting on and off:
 * a hungry enough animal will always eventually go looking, whatever the hour.
 *
 * The middle of the day is quiet, not empty. At the old floor an animal went well over two minutes
 * between meals, which over any stretch a player actually watched came to no hunting at all — and
 * nothing ever hunting is as uninformative as everything always hunting. It is a low rate now
 * rather than an absent one, and dawn and dusk are still five times it.
 */
export const DAY_PRESSURE = 0.2, NIGHT_PRESSURE = 0.3, TWILIGHT_PRESSURE = 1;
export function huntingPressure(time: number, offset?: number): number {
  const f = dayFraction(time, offset);
  // A raised cosine across each twilight band, so pressure builds and falls rather than stepping.
  const band = (from: number, to: number) => {
    if (f < from || f > to) return 0;
    return 0.5 - 0.5 * Math.cos(((f - from) / (to - from)) * Math.PI * 2);
  };
  const twilight = Math.max(band(0, DAWN_END), band(DAY_END, DUSK_END));
  const base = f < DAY_END ? DAY_PRESSURE : NIGHT_PRESSURE;
  return base + (TWILIGHT_PRESSURE - base) * twilight;
}

/**
 * What the water itself adds to the hour's appetite, as a multiplier on it.
 *
 * The clock says when the reef hunts; where you are says how much. A nursery or a sunlit flat is
 * somewhere to be left alone even at dusk, and the channel and the basin are somewhere to be eaten
 * even at noon — which is the whole argument for the deep being worth the swim and the shallows
 * being worth retreating to. Keyed off `BIOME_DANGER`, the same table that already decides how a
 * place looks and sounds, so a biome cannot say one thing to the music and another to the animals.
 */
export const SAFE_APPETITE = 0.45, WILD_APPETITE = 1.7;
export function placeAppetite(danger: number): number {
  const d = Math.max(0, Math.min(1, danger));
  return SAFE_APPETITE + (WILD_APPETITE - SAFE_APPETITE) * d;
}

/** How much an animal at `danger` wants to hunt at this hour: the clock and the place together. */
export function appetiteAt(time: number, danger: number, offset?: number): number {
  return huntingPressure(time, offset) * placeAppetite(danger);
}

/** Seconds an animal will go after a meal before it hunts again, at this hour and in this water. */
export const BASE_HUNT_INTERVAL = 16;
export function huntInterval(time: number, danger: number, offset?: number): number {
  return BASE_HUNT_INTERVAL / Math.max(0.06, appetiteAt(time, danger, offset));
}
