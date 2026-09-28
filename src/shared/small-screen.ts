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
 * Whether to gate play until a phone is turned sideways.
 *
 * Only for a touch session narrower than 600 CSS pixels. The width distinguishes phones from
 * tablets; every portrait phone is blocked, even when its viewport is nearly square.
 */
export const rotateHint = (w: number, h: number, touch: boolean): boolean =>
  touch && w < 600 && h > w;

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

/**
 * The narrowest a roster tile may be drawn, in CSS pixels.
 *
 * Not a tap target — the tile is a whole cell with a picture and a name in it, and below about this
 * the name is an ellipsis and the animal is a smudge. It is what the *cap* below is measured in.
 */
export const MIN_TILE = 86;

/**
 * How much of the picker's width the roster column gets when the two are side by side.
 *
 * `.pick-layout` is `1.45fr / 0.85fr` in a compact landscape window, so the roster has a little
 * under two thirds of it. Stacked — which is what a portrait window does — it has all of it.
 */
const ROSTER_SHARE = 0.62;

/**
 * The most columns the roster may use in this window, or `Infinity` where it should use as many as
 * the roster wants.
 *
 * `gridColumns` packs the whole roster into three rows, which is right on a laptop and absurd on a
 * phone: the Triassic's 26 animals come to nine columns, and nine columns of a 390-pixel window is a
 * 36-pixel tile — a smudge under an ellipsis. Capping the columns turns the overflow into *rows*
 * instead, which a phone can scroll and a three-row grid cannot.
 *
 * A cap and not a count: it never *adds* columns, so a short roster still lays out the way it always
 * did and a full window is untouched. And it is returned from here rather than worked out in the
 * pick screen because three places have to agree about the number — the screen that draws the grid,
 * the cursor that walks it, and the loader that guesses which portraits are wanted next.
 */
export const rosterCap = (w: number, h: number, layout: Layout): number => {
  if (layout === 'full') return Infinity;
  // Beside the crew card, or stacked above it. The 24 is the picker's own side padding.
  const room = w * (w > h ? ROSTER_SHARE : 1) - 24;
  return Math.max(3, Math.floor(room / MIN_TILE));
};

/** A width and a height, in CSS pixels. */
export interface Box { w: number; h: number }

/**
 * A roster tile's height over its width: the 4:3 picture, the name band and the tile's own padding.
 * Measured off the drawn tile rather than guessed — `.cell img` is `aspect-ratio: 4 / 3` at the
 * tile's width, and the name and padding add about a third of that again.
 */
const TILE_TALL = 1.05;
/** The gap `.roster-grid` puts between tiles, both ways. */
const GRID_GAP = 10;
/**
 * How much of a *stacked* picker the crew card keeps for itself. It is sticky at the bottom of the
 * scroll in portrait with `max-height: 38vh`, so that is the share of the height the roster cannot
 * have.
 */
const CREW_RESERVE = 0.38;

/**
 * The width at and below which the pick screen stacks its picker into one column (the stylesheet's
 * `max-width: 1000px`). Stated once here because the stylesheet restates it as a literal, and
 * `npm run breakpoints` holds the two together, as it does `COMPACT_W` and `COMPACT_H`.
 */
export const PICKER_WIDE = 1000;

/**
 * Whether the pick screen puts the roster *beside* the crew card or stacks the two.
 *
 * The stylesheet's own answer, restated so the arithmetic below asks about the same layout that is
 * drawn: side by side on anything wider than the 1000 where the picker has always gone to one
 * column, and on a short wide window — a phone on its side — where the aspect-ratio rule puts it
 * back into two columns because 360 pixels of height cannot hold a stack.
 */
export const pickerSideBySide = (w: number, h: number): boolean =>
  w > PICKER_WIDE || (h < COMPACT_H && w >= h);

/** The part of the picker the roster grid would be given. */
export const rosterArea = (picker: Box, sideBySide: boolean): Box => sideBySide
  ? { w: picker.w * ROSTER_SHARE, h: picker.h }
  : { w: picker.w, h: picker.h * (1 - CREW_RESERVE) };

/**
 * Whether a roster of `count` tiles fits the area it would be given without being cut off.
 *
 * This is the question the choice screen actually has, and it is asked of the space rather than of
 * a breakpoint: the same phone holds the Cambrian's eighteen and would not hold a roster of forty,
 * and a desktop window dragged down to a sliver runs out of room at a size no breakpoint names. The
 * grid is laid out the way the stylesheet lays it out — as many columns as fit at `MIN_TILE`, never
 * more than `gridColumns` would give, never fewer than three — and it fits when every row of it
 * does. Anything that does not is a grid a player would have to scroll to *find* an animal in,
 * which is the job the carousel does better.
 */
export function gridFits(count: number, area: Box, cap = Infinity): boolean {
  if (count <= 0) return true;
  const byWidth = Math.floor((area.w + GRID_GAP) / (MIN_TILE + GRID_GAP));
  const cols = Math.min(Math.max(4, Math.ceil(count / 3)), cap, byWidth);
  if (cols < 3) return false;
  const tile = (area.w - GRID_GAP * (cols - 1)) / cols;
  const rows = Math.ceil(count / cols);
  return rows * tile * TILE_TALL + GRID_GAP * (rows - 1) <= area.h;
}

/**
 * Whether the choice screen shows one hero card at a time instead of the grid.
 *
 * Three facts. The window is **compact** — a roomy window with a grid that does not fit is a bug in
 * the grid, not a reason to change the screen. At most **one seat** is taken: a phone is played by
 * one person (a pad on a phone is rare and a split view on one is worse), and a carousel shows one
 * choice, so a second player joining — which a pad still can — hands the screen back to the grid
 * where everybody's cursor can be seen at once. And the grid **would not fit**.
 */
export const carouselView = (layout: Layout, seats: number, fits: boolean): boolean =>
  layout === 'compact' && seats <= 1 && !fits;
