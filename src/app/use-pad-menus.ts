import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { gamepads, readGamepad, type RawControls } from '../input/input';
import type { Mode, PlayerSetup } from '../sim/types';
import { atMain, type Focus } from './focus-ring';
import { MENU_LOCKOUT, type MenuCursor, type MenuEvent } from './menu-cursor';
import type { Dir } from './spatial-nav';
import type { DialogKind, Screen } from './App';

/**
 * What the menus' input may read and do, handed over by the shell (`App.tsx`). The pad loop and the
 * key handler both run outside any render — a timer and a window listener — so everything they
 * read is a ref, and everything they do is one of the shell's own actions.
 */
export interface MenuWiring {
  screenRef: MutableRefObject<Screen>;
  dialogRef: MutableRefObject<DialogKind>;
  pausedRef: MutableRefObject<boolean>;
  playersRef: MutableRefObject<PlayerSetup[]>;
  focusRef: MutableRefObject<Focus>;
  menuCursorRef: MutableRefObject<MenuCursor>;
  /** When the open menu opened: presses inside `MENU_LOCKOUT` of it are the tail of the fight. */
  menuAtRef: MutableRefObject<number>;
  /** When the player last touched anything, for the loader's idle gate. */
  lastInputRef: MutableRefObject<number>;
  /** Which device the local seat joins on. */
  handRef: MutableRefObject<PlayerSetup['device']>;
  modeRef: MutableRefObject<Mode>;
  modes: readonly Mode[];
  setPadIndices: Dispatch<SetStateAction<number[]>>;
  openDialog(d: DialogKind): void;
  cycleFocus(dir: number, owner: number | 'keyboard'): void;
  moveFocus(dir: Dir): void;
  runFocused(): boolean;
  setFocusBoth(f: Focus): void;
  startFromTitle(device: PlayerSetup['device']): void;
  addPlayer(device: PlayerSetup['device']): void;
  addKeyboard(): void;
  moveCursor(index: number, dx: number, dy: number): void;
  activate(index: number): void;
  toggleReady(index: number): void;
  removePlayer(index: number): void;
  startMatch(): void;
  toggleCarry(index: number): void;
  menuInput(ev: MenuEvent): void;
  menuStep(dir: Dir): number;
  setPausedBoth(p: boolean): void;
  backToTitle(): void;
  changeMode(m: Mode): void;
}

/**
 * One direction out of a pad, for steering a group of buttons.
 *
 * The D-pad answers on the press; the stick repeats on a timer, so holding it walks along a row
 * rather than firing once or running away. `repeat` is the same per-pad map the rest of the loop
 * uses, so a stick cannot drive two things at two rates in one frame.
 */
function padDir(
  c: RawControls,
  just: (k: keyof RawControls) => boolean,
  index: number,
  now: number,
  repeat: Map<number, number>,
): Dir | null {
  if (just('dright')) return 'right';
  if (just('dleft')) return 'left';
  if (just('ddown')) return 'down';
  if (just('dup')) return 'up';
  const x = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0;
  const y = Math.abs(c.my) > 0.6 ? -Math.sign(c.my) : 0;
  if ((x || y) && now - (repeat.get(index) ?? 0) > 240) {
    repeat.set(index, now);
    // A stick pushed on the diagonal answers on whichever axis it is further along.
    if (Math.abs(c.mx) >= Math.abs(c.my)) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'up' : 'down';
  }
  return null;
}

/**
 * Gamepad menu navigation: the title, the choice screen, the pause menu and the results, for every
 * pad at once. Polled on a timer rather than on animation frames — see the note on the interval.
 * Re-subscribes on exactly the actions it always did; the rest of `w` is refs and actions that
 * change with them.
 */
export function usePadMenus(w: MenuWiring) {
  useEffect(() => {
    const prev = new Map<number, RawControls>();
    const repeat = new Map<number, number>();
    const loop = () => {
      const pads = gamepads();
      const live = pads.map((g) => g.index);
      w.setPadIndices((old) => (old.length === live.length && old.every((v, i) => v === live[i]) ? old : live));
      for (const gp of pads) {
        // Re-read the screen for every pad. One pad starting the game moves everyone to the
        // select screen immediately, and the pads after it in this same frame must see that —
        // otherwise a second pad pressing at the same moment restarts from the title and throws
        // the first player away.
        const s = w.screenRef.current;
        const c = readGamepad(gp);
        const p = prev.get(gp.index);
        const just = (k: keyof RawControls) => !!c[k] && !p?.[k];
        const now = performance.now();
        // A pad counts as input too, so the loader holds off while somebody is steering a menu.
        if (c.anyButton || Math.hypot(c.mx, c.my) > 0.3) w.lastInputRef.current = now;
        if (w.dialogRef.current) {
          if (just('back') || just('menu')) w.openDialog(null);
        } else if (s === 'title') {
          // The shoulders reach the era link and the icon buttons; everything else is "press start"
          // until the ring has moved off the screen's own business.
          if (just('lb')) w.cycleFocus(-1, gp.index);
          else if (just('rb')) w.cycleFocus(1, gp.index);
          else if (w.focusRef.current.group !== 'main') {
            const d = padDir(c, just, gp.index, now, repeat);
            if (d) w.moveFocus(d);
            else if (just('confirm')) w.runFocused();
            else if (just('back')) w.setFocusBoth(atMain());
          }
          else if (c.any && !(p?.any)) w.startFromTitle(gp.index);
        } else if (s === 'select') {
          const ps = w.playersRef.current;
          const idx = ps.findIndex((x) => x.device === gp.index);
          // Any button joins, not just A. The title says PRESS START, so Start has to work here
          // too, and a pad that reports a non-standard mapping still gets its player in.
          if (idx < 0) { if (just('anyButton')) w.addPlayer(gp.index); }
          else if (w.focusRef.current.owner === gp.index && w.focusRef.current.group !== 'main') {
            // This pad has taken the ring off the roster. The others carry on picking.
            if (just('lb')) w.cycleFocus(-1, gp.index);
            else if (just('rb')) w.cycleFocus(1, gp.index);
            else {
              const d = padDir(c, just, gp.index, now, repeat);
              if (d) w.moveFocus(d);
              else if (just('confirm')) w.runFocused();
              else if (just('back')) w.setFocusBoth(atMain());
            }
          }
          else {
            const stickX = Math.abs(c.mx) > 0.6 ? Math.sign(c.mx) : 0, stickY = Math.abs(c.my) > 0.6 ? -Math.sign(c.my) : 0;
            const dx = just('dright') ? 1 : just('dleft') ? -1 : 0, dy = just('ddown') ? 1 : just('dup') ? -1 : 0;
            const lastRep = repeat.get(gp.index) ?? 0;
            if (dx || dy) { w.moveCursor(idx, dx, dy); repeat.set(gp.index, now); }
            else if ((stickX || stickY) && now - lastRep > 240) { w.moveCursor(idx, stickX, stickY); repeat.set(gp.index, now); }
            if (just('confirm')) w.activate(idx);
            if (just('back')) { if (ps[idx].ready) w.toggleReady(idx); else w.removePlayer(idx); }
            if (just('menu')) w.startMatch();
            // Hatch, or carry on from your record. On `light` — X — because it is the one attack
            // control no other menu action wants; `ability` would be worse rather than better,
            // since two menu actions on one button is the collision that matters here.
            if (just('light')) w.toggleCarry(idx);
            // LB and RB hand the sticks to the next group along — the roster, the mode chips, the
            // icon buttons. Bind to the raw shoulder buttons, never to a gameplay control: this
            // used to read `burst`, which is button 0 — the same button as confirm — so every A
            // press locked the player in and then changed mode, and changeMode un-readies
            // everyone, which meant nobody could ever lock in or start a match.
            if (just('lb')) w.cycleFocus(-1, gp.index);
            else if (just('rb')) w.cycleFocus(1, gp.index);
          }
        } else if ((s === 'playing' && w.pausedRef.current) || s === 'results') {
          // Deaf for a moment after the menu opens. The results screen arrives on its own, with a
          // hand still working the pad, and a button that was part of the fight must not answer a
          // question it never saw. A button held across the lockout is not an edge afterwards
          // either, so it stays silent until it is released and pressed again.
          const awake = w.menuCursorRef.current.shown;
          const dir = padDir(c, just, gp.index, now, repeat);
          // The shoulders reach the icon buttons from a menu too, so a pause is a way to the
          // settings without a mouse.
          if (just('lb')) w.cycleFocus(-1, gp.index);
          else if (just('rb')) w.cycleFocus(1, gp.index);
          else if (w.focusRef.current.group !== 'main') {
            if (dir) w.moveFocus(dir);
            else if (just('confirm')) w.runFocused();
            else if (just('back')) w.setFocusBoth(atMain());
          }
          // The choices are a row, so left and right walk them; `spatial-nav` reads where they
          // actually are, which is what makes up and down keep working on a row that wrapped.
          else if (dir) { w.menuInput({ step: w.menuStep(dir) }); }
          else if (just('confirm')) w.menuInput({ confirm: true });
          // Any other button wakes a sleeping cursor, and only that.
          else if (!awake && just('anyButton')) w.menuInput({ other: true });
          // The pause menu was opened deliberately, so the button that opened it closes it —
          // but never during the lockout, and never before the cursor is awake.
          else if (awake && s === 'playing' && (just('menu') || just('back')) && now - w.menuAtRef.current >= MENU_LOCKOUT) w.setPausedBoth(false);
        }
        prev.set(gp.index, c);
      }
      // Forget pads that have gone, so a reconnect starts from a clean edge rather than
      // inheriting the buttons that were held when it vanished.
      for (const index of prev.keys()) if (!live.includes(index)) { prev.delete(index); repeat.delete(index); }
    };
    // Deliberately a timer and not requestAnimationFrame. The Gamepad API is a snapshot: a button
    // that goes down and up between two polls is never seen at all. Polling on animation frames
    // ties menu input to how fast the sea happens to be rendering, and a frame that runs long —
    // parsing a creature model, building chunk geometry — swallows a whole press. At 120 Hz here
    // a tap has to be shorter than 8 ms to be missed.
    const id = setInterval(loop, 1000 / 120);
    return () => clearInterval(id);
    // padIndices is deliberately not a dependency: it is written from inside this loop, and
    // listing it would tear the loop down and rebuild it every time a pad connects, losing the
    // button edges held in `prev`.
  }, [w.activate, w.addPlayer, w.changeMode, w.menuInput, w.moveCursor, w.openDialog, w.removePlayer, w.setPausedBoth, w.startFromTitle, w.startMatch, w.toggleCarry, w.toggleReady]);
}
