import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { EraId } from './page';

/**
 * Choosing a game with a controller.
 *
 * The plate is three links, and a link is a thing for a pointer or a Tab key; a player who arrives
 * with a pad in their hands and no keyboard would otherwise have nothing to press. The pad walks
 * the three games in the order they stand on the plate, lights the one it is on — the same
 * lighting the pointer gives, so there is one idea of "this one" rather than two — and opens it.
 *
 * The stepping is here and pure so `npm run ancientseas` can check it: a direction with nothing
 * chosen yet starts at the end the player pushed from, and the row wraps rather than stopping,
 * because three is short enough that a wall is only an annoyance.
 */
export type Dir = 'left' | 'right';

export function step(current: EraId | null, dir: Dir, order: readonly EraId[]): EraId {
  if (order.length === 0) throw new Error('nothing to choose between');
  if (current === null) return dir === 'right' ? order[0] : order[order.length - 1];
  const i = order.indexOf(current);
  if (i < 0) return order[0];
  return order[(i + (dir === 'right' ? 1 : -1) + order.length) % order.length];
}

/** Which way a pad is asking to go, if it is asking at all. The stick only counts when pushed. */
export function padDir(c: RawControls): Dir | null {
  if (c.dright) return 'right';
  if (c.dleft) return 'left';
  // Up and down answer too: on a page that is a row on a desktop and a column on a phone, a player
  // pushing the way the games are stacked should not find the stick dead.
  if (c.ddown) return 'right';
  if (c.dup) return 'left';
  if (Math.abs(c.mx) > 0.55 && Math.abs(c.mx) >= Math.abs(c.my)) return c.mx > 0 ? 'right' : 'left';
  if (Math.abs(c.my) > 0.55) return c.my > 0 ? 'right' : 'left';
  return null;
}

/** A pad press this frame that was not held last frame: the same edge the game's menus use. */
interface Held { dir: Dir | null; confirm: boolean }

export interface PadPoll {
  /** Move the choice, if a direction was pushed this frame. */
  readonly dir: Dir | null;
  /** Take what is chosen. */
  readonly confirm: boolean;
}

/**
 * Read every connected pad and reduce them to one answer, edge-triggered against `held`, which the
 * caller keeps between frames (one entry per pad index). Any pad can steer: this screen is one
 * choice, not four seats, so the first pad to say something is answered and the rest agree.
 */
export function poll(held: Map<number, Held>): PadPoll {
  let dir: Dir | null = null, confirm = false;
  for (const gp of gamepads()) {
    const c = readGamepad(gp);
    const was = held.get(gp.index) ?? { dir: null, confirm: false };
    // A and Start take the choice. Not *any* button, as the title screen does: there the only
    // thing to do is start, here a player pressing B expecting to go back would launch a game.
    const now: Held = { dir: padDir(c), confirm: c.confirm || c.menu };
    if (now.dir && now.dir !== was.dir) dir ??= now.dir;
    if (now.confirm && !was.confirm) confirm = true;
    held.set(gp.index, now);
  }
  return { dir, confirm };
}
