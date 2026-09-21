/**
 * How small the window is, and what that changes.
 *
 * The games were laid out on a laptop and it shows: the stylesheet's breakpoints are almost all
 * `max-height`, because the thing that kept going wrong was a short window rather than a narrow one.
 * A phone is the other axis, and past a point it is both — a landscape phone is 780×360 CSS pixels,
 * which is shorter than every height breakpoint in the file and narrower than every width one.
 *
 * The decision is here rather than only in CSS for two reasons. The HUD is drawn from a snapshot in
 * React and positioned in percentages, so a class has to be *put on* it; and the same threshold
 * decides things that are not styling at all — whether the on-screen pads are drawn, whether a
 * split screen is cut across or down. One rule, read by everything, so the layout cannot disagree
 * with itself about how big the window is.
 *
 * Pure: no DOM, no `window`. The caller measures and passes the numbers in, which is what lets
 * `npm run touch` check the thresholds without a browser.
 */

/**
 * How much room there is.
 *
 *   - `full`    the layout the game was drawn for.
 *   - `compact` a phone, a small tablet, or a desktop window pulled down to that size. Panels lose
 *               their padding and the copy that is not load-bearing, and the HUD shrinks bodily.
 */
export type Layout = 'full' | 'compact';

/**
 * The window is compact below this many CSS pixels on either axis.
 *
 * 760 across and 540 down, and each axis catches a different shape. A phone **held up** is caught by
 * its width (390 or 430 across). A phone **on its side** is 780 across, which is over the line — it
 * is caught by its *height* instead, at 360. Between them that is every phone, without the width
 * having to creep up past a small tablet.
 *
 * Both sit clear of the breakpoints the stylesheet already uses, so the two reflows never fight: the
 * width is under the 900 the pick screen's header collapses at and the 1000 its columns do, so by
 * the time this fires those have long since happened; the height is under the 640 the roster
 * tightens at, for the same reason.
 *
 * Deliberately not a device test. A desktop window dragged to this size wants the same layout for
 * the same reason, and asking about the window rather than the hardware is what makes it checkable.
 */
export const COMPACT_W = 760;
export const COMPACT_H = 540;

/** How much room this window has. */
export const layoutFor = (w: number, h: number): Layout =>
  (w < COMPACT_W || h < COMPACT_H ? 'compact' : 'full');

/**
 * Whether this is a touch-first session: the pads are drawn and the finger scheme plays the game.
 *
 * Three facts, and all three have to hold. The device's primary pointer must be **coarse** — that
 * is a finger and not a mouse, and it is the browser's own answer rather than a guess from the user
 * agent. It must not **hover**, which is what tells a touchscreen apart from a touch-capable laptop
 * whose owner is using the trackpad: a laptop with a touchscreen reports a coarse pointer available
 * but a fine primary one, and drawing thumb pads over that player's game would be absurd. And there
 * must be no **pad** connected, for the reason the mouse already stands down for one: a session with
 * a controller in it is a controller session, and the on-screen buttons would be covering the sea
 * for nothing.
 *
 * The keyboard is deliberately *not* consulted. A tablet with a keyboard case is still a tablet, and
 * a player who has one can still reach for it — every key binding stays live either way, because
 * touch is added beside the other schemes and never instead of them.
 */
export const touchFirst = (coarse: boolean, hover: boolean, pads: number): boolean =>
  coarse && !hover && pads === 0;

/**
 * Whether to ask the player to turn the device round.
 *
 * The sea is a wide thing to look at and the HUD hangs off the corners of a wide frame, so portrait
 * is the worse way to hold a phone for this — but it is *playable*, and a screen that refuses to
 * draw until it is rotated is worse than a narrow one. So this is a hint and never a gate: the game
 * runs, and a line says it would be better the other way up.
 *
 * Only for a touch session, and only when the window is properly tall rather than merely upright.
 * The ratio is 3:2 on purpose: a phone held up is 2.16 (390×844) or thereabouts and every tablet in
 * portrait is 1.33, so this catches the shape that is actually a problem and leaves alone the one
 * that is merely taller than it is wide. A 4:3 tablet upright has plenty of room for this game and
 * being nagged about it would be wrong.
 */
export const ROTATE_RATIO = 1.5;
export const rotateHint = (w: number, h: number, touch: boolean): boolean =>
  touch && h > w * ROTATE_RATIO;

/**
 * Which way to cut a two-player split.
 *
 * `layoutRects` has always halved left and right, which is right on every screen the game was
 * played on and wrong on a tablet held upright: two windows 400 wide and 1100 tall are two slots,
 * not two views. The cut goes across the *longer* axis, so each half comes out as square as the
 * screen allows — the same rule a four-way split already follows by being a grid.
 *
 * Only the two-player case has a choice to make; one player takes the window and four take
 * quadrants whatever its shape.
 */
export const splitAxis = (w: number, h: number): 'across' | 'down' => (h > w ? 'down' : 'across');
