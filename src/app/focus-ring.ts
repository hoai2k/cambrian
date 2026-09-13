import type { Screen } from './App';

/**
 * What the shoulder buttons cycle through on a screen.
 *
 * A pad can only point at one thing at a time, and most screens have more than one thing worth
 * pointing at: the era link, the choice the screen is actually about, the mode chips, the icon
 * buttons in the corner. The sticks and D-pad belong to whichever of those is in hand, and LB/RB
 * hand them to the next one along — the same gesture that already switched modes, generalised, so
 * there is one thing to learn rather than a different rule per screen.
 *
 * They are listed in the order they sit on screen, left to right, so the ring matches what the eye
 * would do. `main` is always present and is what the screen is for; the rest come and go.
 */
export type FocusGroup = 'era' | 'main' | 'modes' | 'icons';

export interface FocusOpts {
  /** The title screen offers the other era, bottom left — but only when there is one. */
  sibling: boolean;
  /** The icon buttons hide themselves when a player has asked for a bare sea. */
  icons: boolean;
}

/** The ring for a screen, in screen order. Always contains `main`. */
export function groupsFor(screen: Screen, menuOpen: boolean, o: FocusOpts): FocusGroup[] {
  const ring: FocusGroup[] = [];
  if (screen === 'title' && o.sibling) ring.push('era');
  ring.push('main');
  if (screen === 'select') ring.push('modes');
  if (o.icons) ring.push('icons');
  // A menu over the sea owns the pad while it is up: its own choices and the icons, nothing else.
  if (menuOpen) return ring.filter((g) => g === 'main' || g === 'icons');
  return ring;
}

/** One place the ring can stop: a group, and which button within it. */
export interface Stop { group: FocusGroup; index: number }

/**
 * Every stop on a screen, in screen order, one per button.
 *
 * The shoulders walk buttons rather than groups, which is what the mode chips already did — a
 * press moved to the next mode, not to "the modes" — so extending the same gesture to the era link
 * and the icons means one press, one button, all the way round and back to the screen's own
 * business. `main` is a single stop however much it contains: the roster and a menu's choices have
 * their own cursor, steered with the stick.
 */
export function stops(ring: readonly FocusGroup[], counts: Partial<Record<FocusGroup, number>>): Stop[] {
  const out: Stop[] = [];
  for (const group of ring) {
    const n = group === 'main' ? 1 : Math.max(0, counts[group] ?? 0);
    for (let i = 0; i < n; i++) out.push({ group, index: i });
  }
  return out.length ? out : [{ group: 'main', index: 0 }];
}

/** The stop `dir` (-1 left, +1 right) leads to, wrapping. */
export function cycle(all: readonly Stop[], from: Stop, dir: number): Stop {
  if (!all.length) return { group: 'main', index: 0 };
  const at = all.findIndex((s) => s.group === from.group && s.index === from.index);
  // A stop the screen no longer has drops the ring back onto the screen itself.
  if (at < 0) return all.find((s) => s.group === 'main') ?? all[0];
  return all[(at + dir + all.length) % all.length];
}

export interface Focus {
  group: FocusGroup;
  /** Which item within the group, for the groups that have several. */
  index: number;
  /**
   * Which pad took the ring, or null while nobody has. The choice screen seats up to four players
   * with a pad each: one of them reaching for the icon buttons must not take the roster away from
   * the other three, so only that pad follows the ring and the rest keep steering their own pick.
   */
  owner: number | 'keyboard' | null;
}

export const atMain = (): Focus => ({ group: 'main', index: 0, owner: null });
