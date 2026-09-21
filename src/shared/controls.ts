/**
 * One name per action, in the words of whatever the player is actually holding.
 *
 * The game grew up on a controller, so every prompt in it was written in Xbox: "RT · POUNCE", "Y
 * camouflage", "LB / RB switch modes". A player on a keyboard read those and had to translate,
 * and the help page showed them a controller they did not own. So the button names live here
 * instead of in the copy, and every prompt asks for the label rather than spelling one out.
 *
 * Five schemes, because there really are five ways to play:
 *   - `pad`  — an Xbox-style controller.
 *   - `kbm`  — keyboard 1 plus a locked mouse. This is what a solo player with no controller gets;
 *              see `MouseLook` in `src/input/input.ts`.
 *   - `key1` — keyboard 1 without the mouse: a keyboard player sharing a screen with controllers,
 *              where the pads own the game and the mouse stays a pointer.
 *   - `key2` — the second keyboard player's half of the board.
 *   - `touch` — a finger on a phone or a tablet. See `src/shared/touch-play.ts`; the names here are
 *              gestures and pads rather than buttons, because that is what a touch player has.
 *
 * The table is the single source of truth: `src/input/input.ts` binds the keys, `src/input/touch.ts`
 * binds the gestures, this names them, and `KeyboardDiagram.tsx` and `TouchDiagram.tsx` draw them.
 * Change a binding in one and change it in all of them.
 */
export type Scheme = 'pad' | 'kbm' | 'key1' | 'key2' | 'touch';

export type Action =
  | 'swim' | 'look' | 'zoom'
  | 'sprint' | 'rise' | 'sink'
  | 'light' | 'heavy' | 'ability' | 'dash' | 'guard' | 'aim'
  | 'sense' | 'teleport' | 'view' | 'menu'
  | 'confirm' | 'back' | 'modePrev' | 'modeNext';

interface Label { pad: string; kbm: string; key1: string; key2: string; touch: string; short?: Partial<Record<Scheme, string>>; }

/** Long names, for prose and for the diagrams. `short` overrides them inside a chip or a <kbd>. */
const LABELS: Record<Action, Label> = {
  swim:     { pad: 'Left stick', kbm: 'W forward, X back, A / D turn', key1: 'W / X, A / D turn', key2: 'IJKL', touch: 'Swim pad', short: { touch: 'Swim' } },
  look:     { pad: 'Right stick', kbm: 'Drag', key1: 'Arrow keys', key2: 'IJKL (no camera)', touch: 'Swipe' },
  zoom:     { pad: 'Right stick click + up/down', kbm: 'Mouse wheel', key1: 'PgUp / PgDn', key2: '—', touch: 'Pinch', short: { pad: 'RS + ▲▼', kbm: 'Wheel' } },
  sprint:   { pad: 'LB', kbm: 'Shift', key1: 'Shift', key2: 'Right Shift', touch: '—', short: { key2: 'R-Shift' } },
  rise:     { pad: 'RB', kbm: 'E or Q', key1: 'E or Q', key2: 'N', touch: 'Look up and swim', short: { touch: 'Look up' } },
  sink:     { pad: 'Left stick click', kbm: 'S or C', key1: 'S or C', key2: 'M', touch: 'Look down and swim', short: { touch: 'Look down', pad: 'LS click' } },
  light:    { pad: 'X', kbm: 'Click, or J', key1: 'J or F', key2: ';', touch: 'Tap', short: { kbm: 'LMB' } },
  heavy:    { pad: 'RT', kbm: 'Hold click, or G', key1: 'G or K', key2: '’', touch: 'Double-tap an animal', short: { touch: 'Double-tap', kbm: 'Hold LMB', key1: 'G' } },
  ability:  { pad: 'Y', kbm: 'Z', key1: 'Z', key2: 'P', touch: 'Pad set to hide', short: { touch: 'Pad · hide' } },
  dash:     { pad: 'A', kbm: 'Space or right click', key1: 'Space', key2: '/', touch: 'Double-tap the water', short: { touch: 'Double-tap', pad: 'A', kbm: 'Space / RMB' } },
  guard:    { pad: 'B', kbm: 'R', key1: 'R', key2: 'U', touch: 'Pad set to guard', short: { touch: 'Pad · guard' } },
  aim:      { pad: 'LT', kbm: 'Middle click', key1: 'Tab', key2: 'O', touch: 'Pad set to aim', short: { touch: 'Pad · aim', kbm: 'MMB' } },
  sense:    { pad: 'D-pad up', kbm: 'I', key1: 'I', key2: 'Y', touch: 'Pad set to sense', short: { touch: 'Pad · sense', pad: '▲' } },
  teleport: { pad: 'D-pad down', kbm: 'T', key1: 'T', key2: 'H', touch: 'Travel button', short: { touch: 'Travel', pad: '▼' } },
  view:     { pad: 'View', kbm: 'V', key1: 'V', key2: ',', touch: 'Scores button', short: { touch: 'Scores' } },
  menu:     { pad: 'Menu', kbm: 'Esc', key1: 'Esc', key2: 'Esc', touch: 'Pause button', short: { touch: 'Pause' } },
  confirm:  { pad: 'A', kbm: 'Enter', key1: 'Enter', key2: 'Enter', touch: 'Tap' },
  back:     { pad: 'B', kbm: 'Backspace', key1: 'Backspace', key2: 'Backspace', touch: 'Back button', short: { touch: 'Back', kbm: 'Bksp', key1: 'Bksp', key2: 'Bksp' } },
  modePrev: { pad: 'LB', kbm: 'Q', key1: 'Q', key2: 'Q', touch: 'Tap a mode', short: { touch: 'Tap' } },
  modeNext: { pad: 'RB', kbm: 'E', key1: 'E', key2: 'E', touch: 'Tap a mode', short: { touch: 'Tap' } },
};

/** The action's name in this scheme's words, as it reads in a sentence. */
export const btn = (a: Action, s: Scheme): string => LABELS[a][s];

/** The same, trimmed to fit a chip, a <kbd> or a crosshair label. */
export const key = (a: Action, s: Scheme): string => LABELS[a].short?.[s] ?? LABELS[a][s];

/**
 * Menus are shared by everyone at the screen, so they follow the device the screen is being worked
 * with. A pad in the session wins, because it is the thing furthest from the obvious — a player
 * holding one needs to be told which button confirms. Failing that a touch session says so, since
 * "Enter" is no use to somebody with no keyboard, and otherwise it is the mouse.
 */
export const menuScheme = (padCount: number, touch = false): Scheme =>
  (padCount > 0 ? 'pad' : touch ? 'touch' : 'kbm');

/**
 * A player's own scheme, from the device they joined on. A keyboard player only gets the mouse
 * when the mouse is actually theirs — that is, when no controller is in the session.
 */
export const schemeForDevice = (device: number | 'keyboard' | 'keyboard2' | 'touch', mouse: boolean): Scheme =>
  typeof device === 'number' ? 'pad'
    : device === 'touch' ? 'touch'
    : device === 'keyboard2' ? 'key2'
    : mouse ? 'kbm' : 'key1';

/**
 * Fill `{action}` placeholders in a string written by the simulation.
 *
 * Onboarding hints come out of `src/sim`, which must not know or care what anyone is holding, so
 * they name actions rather than buttons and the HUD resolves them here.
 */
export const fillControls = (text: string, s: Scheme): string =>
  text.replace(/\{(\w+)\}/g, (m, a: string) => (a in LABELS ? btn(a as Action, s) : m));
