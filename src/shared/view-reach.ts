/**
 * How far the camera can see a body, as numbers both the renderer and the simulation read.
 *
 * The renderer uses them to decide what to draw (`src/render/view-pick.ts`, `camera.ts`); the
 * simulation uses them to know what nobody can be looking at, so it can spare those bodies work
 * that only shows (`src/sim/sight.ts`). They live here so the two can never disagree about it.
 */

/** How far behind a body of length `L` the follow camera sits, before zoom. */
export const magnificationDistance = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;

/** The furthest the player may zoom the camera out (a multiple of `magnificationDistance`). */
export const ZOOM_MAX = 2.2;

/** Apparent size (length over distance) under which a body is not drawn: about eight pixels. */
export const SIZE_FLOOR = 0.011;

/** A body already drawn keeps being drawn down to this share of the floor, so it does not flicker. */
export const SHOWN_SLACK = 0.7;

/** Inside this of the camera a body is drawn whatever its apparent size (the near field). */
export const nearAlwaysFor = (L: number) => magnificationDistance(L) * 1.8 + 10;

/** The near field is never smaller than this, whoever is playing. */
export const NEAR_MIN = 22;
