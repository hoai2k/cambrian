import type { Rect } from '../render/engine';

/** Where the icon buttons sit, or that they are not drawn at all. */
export type ToolbarPlace = 'right' | 'left' | 'hidden';

export interface ToolbarView { rect: Rect; senseOn: boolean }

/**
 * Which corner the icon buttons take, given who is looking at each corner.
 *
 * Sense off is a player asking for nothing over the sea but the water, and the toolbar sits in
 * *someone's* viewport whether they asked for it or not. So it moves out of the way: bottom right
 * normally, bottom left when the player who owns that corner has sense off, and nowhere at all when
 * both corners belong to players who do — which is every split, and the single-screen case too,
 * where one player owns both. It comes back the moment anyone turns sense on, and `menuOpen` brings
 * it back regardless, because a menu is already over the sea and the buttons belong with it.
 *
 * Split-screen only ever divides left/right and top/bottom, so the two bottom corners are found by
 * asking which rect contains each of them rather than by assuming an arrangement.
 */
export function toolbarPlace(views: readonly ToolbarView[], menuOpen = false): ToolbarPlace {
  if (!views.length) return 'right';
  const W = views.reduce((m, v) => Math.max(m, v.rect.x + v.rect.w), 1);
  const H = views.reduce((m, v) => Math.max(m, v.rect.y + v.rect.h), 1);
  // Half a unit inside the corner, so a rect that merely ends there does not claim it.
  const at = (x: number, y: number) => views.find((v) =>
    x >= v.rect.x && x < v.rect.x + v.rect.w && y >= v.rect.y && y < v.rect.y + v.rect.h);
  const right = at(W - 0.5, H - 0.5), left = at(0.5, H - 0.5);
  if (!right || right.senseOn) return 'right';
  if (!left || left.senseOn) return 'left';
  return menuOpen ? 'left' : 'hidden';
}
