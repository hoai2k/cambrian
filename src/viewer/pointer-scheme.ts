/**
 * Which mouse button does what on the viewer's stage.
 *
 * It is a **named scheme** rather than a flag, because the three editing modes want two different
 * answers for a reason that is about *buttons* and not about what they edit: mark mode's brush
 * paints with the left button and so cannot share it with the orbit, while the mouth and bend
 * handles claim the left button only when the pointer is actually on a handle and leave it free
 * the rest of the time.
 *
 * Both schemes bind a rotate *and* a pan, which is the whole point of them: the editors ran for
 * months with `LEFT: null, MIDDLE: DOLLY, RIGHT: ROTATE` — no pan on any button at all — so a
 * zoomed-in view could not be aimed at the part of the animal it was zoomed in on.
 *
 * Pure: the scene turns these roles into `OrbitControls.mouseButtons`, and nothing here knows
 * that Three.js exists.
 */

/** `view` is the default and what the mouth and bend editors use; `paint` is mark mode's. */
export type PointerScheme = 'view' | 'paint';

/** What a button does, in OrbitControls' own vocabulary. `null` is a button the orbit ignores. */
export type ButtonRole = 'rotate' | 'pan' | 'dolly' | null;

export interface ButtonRoles {
  readonly left: ButtonRole;
  readonly middle: ButtonRole;
  readonly right: ButtonRole;
}

export function buttonRoles(scheme: PointerScheme): ButtonRoles {
  // `paint` gives the left button up to the brush, so the orbit moves to the right and the pan to
  // the middle. The wheel dollies in either scheme, so the middle button is the one that is free
  // to be spent here — a mode with no pan at all is worse than a mode with no middle-drag dolly.
  return scheme === 'paint'
    ? { left: null, middle: 'pan', right: 'rotate' }
    : { left: 'rotate', middle: 'dolly', right: 'pan' };
}

/** Every scheme has to answer both of the camera's questions, and no button may answer two. */
export function schemeIsUsable(scheme: PointerScheme): boolean {
  const r = buttonRoles(scheme);
  const bound = [r.left, r.middle, r.right].filter((x): x is Exclude<ButtonRole, null> => x !== null);
  return bound.includes('rotate') && bound.includes('pan') && new Set(bound).size === bound.length;
}
