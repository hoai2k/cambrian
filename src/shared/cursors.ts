/**
 * What the mouse pointer looks like while a match is being played on one.
 *
 * With no pointer lock the cursor *is* the crosshair (`MousePlay` in `src/input/input.ts`), so it
 * has to say what it is over and what the buttons would do — the on-screen reticle is switched off
 * in mouse play precisely because this replaces it, and two crosshairs on one screen, one of them
 * stuck in the middle, is worse than either alone.
 *
 * The states, each a different drawing rather than a recolour of one, so they are told apart at a
 * glance and without relying on colour:
 *
 *   - `idle`    a faint open cross. Over nothing in particular.
 *   - `edible`  a green ring on the cross: something you could eat.
 *   - `attack`  a red ring with barbs: something that is a fight. Also the mark held on an animal a
 *               press is chasing or pouncing at, drawn by the HUD where that animal is.
 *   - `zoom`    the dash. Not a drawing of its own: it is the idle cross, drawn by the HUD rather
 *               than as the CSS cursor because a CSS cursor cannot move — it shrinks away as the
 *               dash is thrown, as though the mark had been flung into the distance, and grows back
 *               as the body arrives where it was (`.touch-cursor.dashing`). An arrow pointing up
 *               said "forward" on a screen where forward is into it.
 *   - `look`    a hand, while the middle button is dragging the view.
 *   - `hidden`  no pointer at all, while the left button is steering or a chase is holding the
 *               mark on an animal: the mouse is not pointing then, it is swimming.
 *
 * Each is one SVG data URI with its hotspot named, which is all a CSS `cursor` is. They are drawn
 * here rather than shipped as files because every one of them is a dozen lines of path data: a
 * build step and six more network requests would buy nothing, and a cursor that has not loaded is
 * a cursor that is not there.
 */
export type CursorState = 'idle' | 'edible' | 'attack' | 'zoom' | 'look' | 'hidden' | 'menu';

/** Wrap an SVG body as a cursor, with the hotspot at its centre. */
const svg = (size: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`,
  )}") ${size >> 1} ${size >> 1}, crosshair`;

/** A cross with a gap in the middle, so what is under it is never covered by it. */
const cross = (c: string, w: number, gap = 5, arm = 11, o = 0.9) =>
  `<g stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}">`
  + `<path d="M16 ${16 - arm}V${16 - gap}M16 ${16 + gap}V${16 + arm}M${16 - arm} 16H${16 - gap}M${16 + gap} 16H${16 + arm}"/></g>`;

/** A dark companion stroke under every mark: a pale cursor vanishes over a pale animal. */
const shadow = (body: string) => `<g opacity="0.55">${body}</g>`;

const IDLE = svg(32, shadow(cross('#04141a', 4)) + cross('#eefaf6', 1.8));
const EDIBLE = svg(32, shadow(cross('#04141a', 4)) + cross('#9ff6b0', 2)
  + `<circle cx="16" cy="16" r="7.5" fill="none" stroke="#04141a" stroke-width="3.4" opacity="0.55"/>`
  + `<circle cx="16" cy="16" r="7.5" fill="none" stroke="#9ff6b0" stroke-width="1.8"/>`);
const ATTACK = svg(32, shadow(cross('#04141a', 4)) + cross('#ff8a6a', 2)
  + `<circle cx="16" cy="16" r="7.5" fill="none" stroke="#04141a" stroke-width="3.4" opacity="0.55"/>`
  + `<circle cx="16" cy="16" r="7.5" fill="none" stroke="#ff8a6a" stroke-width="2"/>`
  + `<g stroke="#ff8a6a" stroke-width="2" stroke-linecap="round"><path d="M16 4.5V8M16 24V27.5M4.5 16H8M24 16H27.5"/></g>`);
/** The browser's own grab hands: every player already knows what they mean. */
const LOOK = 'grabbing';

/** The dash and the hidden states put the CSS pointer away: the HUD draws the dash itself. */
const CURSORS: Record<CursorState, string> = {
  idle: IDLE, edible: EDIBLE, attack: ATTACK, zoom: 'none', look: LOOK, hidden: 'none', menu: '',
};

/** The CSS `cursor` value for this state. `menu` is the empty string: the page's own pointer. */
export const cursorFor = (s: CursorState): string => CURSORS[s];

/** The artwork as an image, for the marks the HUD draws itself. The dash is the idle cross. */
export const cursorImageFor = (s: 'idle' | 'edible' | 'attack' | 'zoom'): string =>
  (s === 'zoom' ? IDLE : CURSORS[s]).match(/^url\("([^"]+)"\)/)?.[1] ?? '';

/**
 * Which cursor the match wants, from what the mouse is doing and what it is over.
 *
 * Order matters and is the order a player reads it in: what a held button is *doing* beats what the
 * cursor is *over*, because a press in progress is the more urgent fact.
 */
export function cursorState(m: { dragging: boolean; dashing: boolean; hidden: boolean }, over: 'none' | 'edible' | 'attack'): CursorState {
  if (m.hidden) return 'hidden';
  if (m.dashing) return 'zoom';
  if (m.dragging) return 'look';
  return over === 'edible' ? 'edible' : over === 'attack' ? 'attack' : 'idle';
}
