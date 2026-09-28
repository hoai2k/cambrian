/**
 * The lineup on the choice screen, as pure functions: who is seated, on which animal, where each
 * seat's cursor is, who has locked in. The shell (`App.tsx`) owns the state and does the side
 * effects — the sound, waking the audio, starting the match — and asks these what the lineup
 * becomes; `tools/lineup-test.ts` asks them the same questions with nothing on screen.
 *
 * Each returns the new lineup and the sound the change makes, or null where the press changes
 * nothing (and so makes no sound). Nothing here reads the era: the roster, the visitors and the
 * grid come in as arguments.
 */
import type { Visitor } from '../content/visitors';
import type { CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { depthStep, type DepthLayout } from './depth-layout';
import { gridStep, rosterGrid, sameSlot, type ExtraId, type Slot } from './roster-grid';

export type LineupSound = 'ui-move' | 'ui-confirm' | 'ui-back' | 'ui-join';
export interface LineupChange { players: PlayerSetup[]; sound: LineupSound }

/**
 * The size a visitor starts at.
 *
 * An **earned** visitor arrives full grown: that is the reward, and it has already been taken to
 * the top of its own game. A **standing guest** has earned nothing — it is admitted because it
 * exists — so it hatches and climbs this game's ladder like anything else on the roster, which is
 * also what lets it *be* earned: its rungs are saved (`recordableIds`) and reaching the top makes
 * it a visitor in the other two games. Handing one the apex scale for free skipped the whole game
 * and left nothing to record.
 */
export const startScale = (v: Visitor) => (v.standing ? undefined : v.scale);

/** What the cursor walks: the roster, the grid's buttons, the window's column cap and the view on screen. */
export interface PickGrid {
  ids: readonly CreatureId[];
  extras: readonly ExtraId[];
  cols: number;
  /** The Size view's layout while it is on screen, null in the list. */
  depth: DepthLayout | null;
  /** Whether the screen is showing one card at a time (`carouselView`). */
  carousel: boolean;
  visitors: readonly Visitor[];
}

/**
 * Move a seat's pick cursor. Left and right walk the grid itself and always move, wrapping at the
 * ends; up and down move by a row and land on the nearest occupied column (`roster-grid.ts`), or
 * walk the rectangles the Size view drew (`depth-layout.ts`). A locked seat does not move — except
 * one that has taken the Visitors button, whose left and right walk the animals it has earned.
 */
export function moveCursor(ps: readonly PlayerSetup[], index: number, dx: number, dy: number, grid: PickGrid): LineupChange | null {
  const p = ps[index]; if (!p) return null;
  const next = [...ps];
  // The carousel is the grid laid end to end, so up and down have no row to move to: they walk it
  // the same way left and right do, which is what a player on a pad or the arrow keys expects of a
  // list with one card on screen.
  if (grid.carousel && dy && !dx) { dx = dy; dy = 0; }
  // A seat that has taken the Visitors button is locked in on purpose, and left and right walk
  // the animals it has earned rather than the grid behind them. This is the one place a locked
  // seat still answers the stick.
  if (p.cursor === 'visitors' && p.ready) {
    const list = grid.visitors;
    if (!list.length || !dx) return null;
    const at = Math.max(0, list.findIndex((v) => v.id === p.creature));
    const v = list[(at + dx + list.length) % list.length];
    next[index] = { ...p, creature: v.id as CreatureId, visitorScale: startScale(v) };
    return { players: next, sound: 'ui-move' };
  }
  if (p.ready) return null;
  const from: Slot = p.cursor ? { kind: 'extra', id: p.cursor } : { kind: 'creature', id: p.creature };
  const to = grid.depth
    ? depthStep(grid.depth, from, dx, dy) as Slot
    : gridStep(rosterGrid(grid.ids, grid.extras, grid.cols), from, dx, dy);
  if (sameSlot(to, from)) return null;
  next[index] = to.kind === 'extra'
    ? { ...p, cursor: to.id }
    : { ...p, cursor: undefined, creature: to.id as CreatureId };
  return { players: next, sound: 'ui-move' };
}

/**
 * Put a seat on an animal. Choosing one with nobody seated *is* the local seat joining (`joined`):
 * a player who reached the roster without pressing start has no seat, and clicking a creature is
 * exactly the gesture that should open one — on the animal they clicked.
 */
export function setCreature(ps: readonly PlayerSetup[], index: number, c: CreatureId, hand: PlayerSetup['device']): (LineupChange & { joined?: boolean }) | null {
  if (!ps.length && index === 0) return { players: [{ creature: c, device: hand, ready: false }], sound: 'ui-join', joined: true };
  if (!ps[index] || ps[index].ready) return null;
  const next = [...ps];
  next[index] = { ...ps[index], creature: c };
  return { players: next, sound: 'ui-move' };
}

/**
 * Lock in, or let go. Letting go of a visitor hands the local roster back: the seat keeps an animal
 * this sea has (`fallback`, the era's default), rather than a foreign body it is no longer locked
 * in on.
 */
export function toggleReady(ps: readonly PlayerSetup[], index: number, fallback: CreatureId): LineupChange | null {
  const p = ps[index]; if (!p) return null;
  const ready = !p.ready;
  const next = [...ps];
  next[index] = ready || !p.visitorScale
    ? { ...p, ready }
    : { ...p, ready, visitorScale: undefined, cursor: undefined, creature: fallback };
  return { players: next, sound: ready ? 'ui-confirm' : 'ui-back' };
}

/**
 * Take whatever the cursor is on. On a grid button that is pressing it — Random hands you another
 * animal and leaves the cursor on it rather than locking in, because it answers "I don't mind" and
 * a player who dislikes the roll should be able to roll again; Visitors locks in on the first one.
 * Otherwise it is `'start'` for a seat already locked in and `'toggle'` (lock in) for one that is not.
 */
export function activate(ps: readonly PlayerSetup[], index: number, grid: Pick<PickGrid, 'ids' | 'visitors'>, random: () => number):
  LineupChange | 'start' | 'toggle' | null {
  const p = ps[index]; if (!p) return null;
  const next = [...ps];
  if (p.cursor === 'random' && !p.ready) {
    const pool = grid.ids.filter((id) => id !== p.creature);
    const pick = (pool.length ? pool : grid.ids)[Math.floor(random() * (pool.length || grid.ids.length))];
    next[index] = { ...p, cursor: undefined, creature: pick };
    return { players: next, sound: 'ui-confirm' };
  }
  if (p.cursor === 'visitors' && !p.ready) {
    const v = grid.visitors[0];
    if (v) {
      next[index] = { ...p, creature: v.id as CreatureId, visitorScale: startScale(v), ready: true };
      return { players: next, sound: 'ui-confirm' };
    }
  }
  return p.ready ? 'start' : 'toggle';
}

/** A pointer press on one of the grid's buttons puts that seat's cursor on it (and the caller then takes it). */
export function pointAtExtra(ps: readonly PlayerSetup[], index: number, id: ExtraId): PlayerSetup[] | null {
  const p = ps[index]; if (!p || p.ready) return null;
  const next = [...ps];
  next[index] = { ...p, cursor: id };
  return next;
}

/** A new seat on a device, on the next animal along; at most four, and one per device. */
export function addPlayer(ps: readonly PlayerSetup[], device: PlayerSetup['device'], ids: readonly CreatureId[]): LineupChange | null {
  if (ps.length >= 4 || ps.some((p) => p.device === device)) return null;
  return { players: [...ps, { creature: ids[ps.length % ids.length], device, ready: false }], sound: 'ui-join' };
}

/**
 * The local seat joins once and only once: two players never share the keyboard, and there is one
 * screen to put fingers on. `typeof device === 'string'` is what "local" means, and it covers the
 * glass as well as the two keyboard halves.
 */
export const hasLocalSeat = (ps: readonly PlayerSetup[]) => ps.some((p) => typeof p.device === 'string');

/** A seat leaves, and the per-seat carry choices shuffle down with the seats. Empty means back to the title. */
export function removePlayer(ps: readonly PlayerSetup[], carry: readonly boolean[], index: number): { players: PlayerSetup[]; carry: boolean[] } | 'empty' {
  const players = ps.filter((_, i) => i !== index);
  if (!players.length) return 'empty';
  return { players, carry: carry.filter((_, i) => i !== index) };
}

/** Everybody un-readies: a change of mode, or a return to the choice screen. */
export const unready = (ps: readonly PlayerSetup[]): PlayerSetup[] => ps.map((p) => ({ ...p, ready: false }));

/** Whether a mode keeps a record a seat can carry on from (the ladder modes). */
export const carriesRecord = (mode: Mode) => mode === 'rise' || mode === 'survival';

/**
 * Hatch, or carry on from the furthest this animal has been taken. Nothing outside the ladder
 * modes or for an animal with no record: a control that appeared to do something and did not would
 * be worse than one that is plainly unavailable.
 */
export function toggleCarry(ps: readonly PlayerSetup[], carry: readonly boolean[], index: number, mode: Mode, best: Partial<Record<CreatureId, number>>): boolean[] | null {
  const p = ps[index];
  if (!p || !carriesRecord(mode) || !(best[p.creature] ?? 0)) return null;
  const next = [...carry];
  next[index] = !next[index];
  return next;
}
