/**
 * One name per action, in the words of whatever the player is actually holding.
 *
 * The game grew up on a controller, so every prompt in it was written in Xbox: "RT · POUNCE", "Y
 * camouflage", "LB / RB switch modes". A player on a keyboard read those and had to translate,
 * and the help page showed them a controller they did not own. So the button names live here
 * instead of in the copy, and every prompt asks for the label rather than spelling one out.
 *
 * Four schemes, because there really are four ways to play:
 *   - `pad`  — an Xbox-style controller.
 *   - `kbm`  — keyboard 1 plus a locked mouse. This is what a solo player with no controller gets;
 *              see `MouseLook` in `src/input/input.ts`.
 *   - `key1` — keyboard 1 without the mouse: a keyboard player sharing a screen with controllers,
 *              where the pads own the game and the mouse stays a pointer.
 *   - `key2` — the second keyboard player's half of the board.
 *
 * The table is the single source of truth: `src/input/input.ts` binds the keys, this names them,
 * and `KeyboardDiagram.tsx` draws them. Change a binding in one and change it in all three.
 */
export type Scheme = 'pad' | 'kbm' | 'key1' | 'key2';

export type Action =
  | 'swim' | 'look' | 'zoom'
  | 'sprint' | 'rise' | 'sink'
  | 'light' | 'heavy' | 'ability' | 'dash' | 'guard' | 'aim'
  | 'sense' | 'teleport' | 'view' | 'menu'
  | 'confirm' | 'back' | 'modePrev' | 'modeNext' | 'pick';

interface Label { pad: string; kbm: string; key1: string; key2: string; short?: Partial<Record<Scheme, string>>; }

/** Long names, for prose and for the diagrams. `short` overrides them inside a chip or a <kbd>. */
const LABELS: Record<Action, Label> = {
  swim:     { pad: 'Left stick', kbm: 'WASD', key1: 'WASD', key2: 'IJKL' },
  look:     { pad: 'Right stick', kbm: 'Mouse', key1: 'Arrow keys', key2: 'IJKL (no camera)' },
  zoom:     { pad: 'Right stick click + up/down', kbm: 'Mouse wheel', key1: 'PgUp / PgDn', key2: '—', short: { pad: 'RS + ▲▼', kbm: 'Wheel' } },
  sprint:   { pad: 'A', kbm: 'Shift', key1: 'Shift', key2: 'Right Shift', short: { key2: 'R-Shift' } },
  rise:     { pad: 'RB', kbm: 'Space', key1: 'Space', key2: 'N' },
  sink:     { pad: 'Left stick click', kbm: 'C', key1: 'C', key2: 'M', short: { pad: 'LS' } },
  light:    { pad: 'X', kbm: 'F', key1: 'F', key2: ';' },
  heavy:    { pad: 'RT', kbm: 'Left click', key1: 'G', key2: '’', short: { kbm: 'LMB' } },
  ability:  { pad: 'Y', kbm: 'R', key1: 'R', key2: 'P' },
  dash:     { pad: 'LB', kbm: 'Right click', key1: 'V', key2: '/', short: { kbm: 'RMB' } },
  guard:    { pad: 'B', kbm: 'Q', key1: 'Q', key2: 'U' },
  aim:      { pad: 'LT', kbm: 'Middle click', key1: 'Tab', key2: 'O', short: { kbm: 'MMB' } },
  sense:    { pad: 'D-pad up', kbm: 'E', key1: 'E', key2: 'Y', short: { pad: '▲' } },
  teleport: { pad: 'D-pad down', kbm: 'T', key1: 'T', key2: 'H', short: { pad: '▼' } },
  view:     { pad: 'View', kbm: 'Z', key1: 'Z', key2: ',' },
  menu:     { pad: 'Menu', kbm: 'Esc', key1: 'Esc', key2: 'Esc' },
  confirm:  { pad: 'A', kbm: 'Enter', key1: 'Enter', key2: 'Enter' },
  back:     { pad: 'B', kbm: 'Backspace', key1: 'Backspace', key2: 'Backspace', short: { kbm: 'Bksp', key1: 'Bksp', key2: 'Bksp' } },
  modePrev: { pad: 'LB', kbm: 'Q', key1: 'Q', key2: 'Q' },
  modeNext: { pad: 'RB', kbm: 'E', key1: 'E', key2: 'E' },
  pick:     { pad: 'D-pad', kbm: 'Arrow keys', key1: 'Arrow keys', key2: 'Arrow keys', short: { pad: 'D-pad ◀▶', kbm: 'Arrows', key1: 'Arrows', key2: 'Arrows' } },
};

/** The action's name in this scheme's words, as it reads in a sentence. */
export const btn = (a: Action, s: Scheme): string => LABELS[a][s];

/** The same, trimmed to fit a chip, a <kbd> or a crosshair label. */
export const key = (a: Action, s: Scheme): string => LABELS[a].short?.[s] ?? LABELS[a][s];

/** Menus are shared by everyone at the screen, so they follow whether any pad is connected at all. */
export const menuScheme = (padCount: number): Scheme => (padCount > 0 ? 'pad' : 'kbm');

/**
 * A player's own scheme, from the device they joined on. A keyboard player only gets the mouse
 * when the mouse is actually theirs — that is, when no controller is in the session.
 */
export const schemeForDevice = (device: number | 'keyboard' | 'keyboard2', mouse: boolean): Scheme =>
  typeof device === 'number' ? 'pad' : device === 'keyboard2' ? 'key2' : mouse ? 'kbm' : 'key1';

/**
 * Fill `{action}` placeholders in a string written by the simulation.
 *
 * Onboarding hints come out of `src/sim`, which must not know or care what anyone is holding, so
 * they name actions rather than buttons and the HUD resolves them here.
 */
export const fillControls = (text: string, s: Scheme): string =>
  text.replace(/\{(\w+)\}/g, (m, a: string) => (a in LABELS ? btn(a as Action, s) : m));
