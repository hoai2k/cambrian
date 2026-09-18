/**
 * What the mouse pointer looks like while a match is being played on one.
 *
 * With no pointer lock the cursor *is* the crosshair (`MousePlay` in `src/input/input.ts`), so it
 * has to say what it is over and what the buttons would do — the on-screen reticle is switched off
 * in mouse play precisely because this replaces it, and two crosshairs on one screen, one of them
 * stuck in the middle, is worse than either alone.
 *
 * Six states, each a different drawing rather than a recolour of one, so they are told apart at a
 * glance and without relying on colour:
 *
 *   - `idle`    a faint open cross. Over nothing in particular.
 *   - `edible`  a green ring on the cross: something you could eat.
 *   - `attack`  a red ring with barbs: something that is a fight.
 *   - `target`  four arrows pointing inwards, while the left button is held on a target. The
 *               pounce is winding up, and the arrows say the animal is being closed on.
 *   - `zoom`    a forward arrow with speed lines, while the right button dashes at the cursor.
 *   - `look`    a hand, while a drag is turning the camera.
 *
 * Each is one SVG data URI with its hotspot named, which is all a CSS `cursor` is. They are drawn
 * here rather than shipped as files because every one of them is a dozen lines of path data: a
 * build step and six more network requests would buy nothing, and a cursor that has not loaded is
 * a cursor that is not there.
 */
export type CursorState = 'idle' | 'edible' | 'attack' | 'target' | 'zoom' | 'look' | 'menu';

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
/** Four arrows closing inwards: the pounce is winding up on the animal under the cursor. */
const arrow = (c: string, w: number) =>
  `<g stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none">`
  + `<path d="M16 3.5l-4 5h8zM16 28.5l-4-5h8zM3.5 16l5-4v8zM28.5 16l-5-4v8z"/></g>`;
const TARGET = svg(32, shadow(arrow('#04141a', 5)) + arrow('#ffd08a', 2.2)
  + `<circle cx="16" cy="16" r="2.4" fill="#ffd08a"/>`);
/** Forward, fast: an arrow with the water streaming past it. */
const ZOOM_BODY = `<g stroke="#9ff6ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">`
  + `<path d="M16 5l7 9h-4.5v13h-5V14H9z"/></g>`
  + `<g stroke="#9ff6ff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"><path d="M5 22v6M27 22v6"/></g>`;
const ZOOM = svg(32, shadow(ZOOM_BODY.replace(/#9ff6ff/g, '#04141a').replace(/stroke-width="2.2"/, 'stroke-width="5"')) + ZOOM_BODY);
/** The browser's own grab hands: every player already knows what they mean. */
const LOOK = 'grabbing';

const CURSORS: Record<CursorState, string> = {
  idle: IDLE, edible: EDIBLE, attack: ATTACK, target: TARGET, zoom: ZOOM, look: LOOK, menu: '',
};

/** The CSS `cursor` value for this state. `menu` is the empty string: the page's own pointer. */
export const cursorFor = (s: CursorState): string => CURSORS[s];

/**
 * Which cursor the match wants, from what the mouse is doing and what it is over.
 *
 * Order matters and is the order a player reads it in: what a held button is *doing* beats what the
 * cursor is *over*, because a press in progress is the more urgent fact.
 */
export function cursorState(m: { dragging: boolean; right: boolean; pressing: boolean }, over: 'none' | 'edible' | 'attack'): CursorState {
  if (m.right) return 'zoom';
  if (m.dragging) return 'look';
  if (m.pressing && over !== 'none') return 'target';
  return over === 'edible' ? 'edible' : over === 'attack' ? 'attack' : 'idle';
}
