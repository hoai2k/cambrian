/**
 * What one press of a mouse button comes to, as a state machine over the press and the body.
 *
 * **The left button swims unless it is clicked.** Pressed and held — or pressed and moved — it is
 * *steering*: the pointer is put away and the mouse turns the animal and the view together until
 * the button comes up. Pressed and let go quickly, it is a *click*, and a click is the attack the
 * place it was on calls for: open water is a **dash** there, down the cursor's own ray; an animal
 * within a bite is a **bite**; an animal further off is a **pounce**, which homes on it. A click is
 * decided on its *release*, because until the button comes up it is not known whether it is a click
 * or the start of a steer — and that is exactly the wait a double-click skips: the **second press
 * of a double-click acts at once**, and held, the dash it threw runs for as long as it is held (the
 * dash is as long as it is held) and then steers.
 *
 * **The right button is aim.** Held, it is aim mode's framing with the cursor as the crosshair; let
 * go with the crosshair on an animal it pounces there, and let go on anything else it simply ends.
 *
 * Pure, no clock of its own and nothing of the simulation's: `src/render/player-input.ts` hands it
 * what the body is doing and what is in reach, and turns what comes back into the frame. Held by
 * `npm run mouse:strike`.
 */

export type StrikeKind = 'pending' | 'dash' | 'bite' | 'pounce' | 'steer';

export interface Strike {
  kind: StrikeKind;
  /** The animal the press was on, or -1. Kept for the whole press. */
  target: number;
  /** When the current kind began, in seconds. */
  t: number;
  /** When the button went down. */
  down: number;
  /** The move this kind asked for has been seen to start in the body. */
  began: boolean;
  /** The one-frame asks (the bite, the dash's throw) have been made. */
  fired: boolean;
  /** The left button is still down for this press. */
  held: boolean;
}

/** The left button's memory between presses: the press in progress, and when the last click was. */
export interface StrikeState { strike?: Strike; lastClick: number }
export const freshStrike = (): StrikeState => ({ lastClick: -Infinity });

export interface StrikeFacts {
  now: number;
  /** The left button is down this frame. */
  left: boolean;
  /** It went down since the last frame. */
  pressed: boolean;
  /** Pixels the pointer has travelled since the left button went down. */
  moved: number;
  /** The animal under the cursor, or -1. */
  over: number;
  /** The right button was let go this frame with the crosshair on this animal (-1: on nothing). */
  aimRelease?: number;
  /** Surface gap from the body to an animal, or undefined when it is gone, dead or hidden. */
  gapTo: (id: number) => number | undefined;
  biteReach: number;
  /** The body's state machine, which is how the move being asked for is seen to have started. */
  state: string;
}

export interface StrikeOut {
  /** Hold the dash; `aimRay` is set on the frames the dash is still to be thrown down the cursor. */
  dash: boolean; aimRay: boolean;
  /** One bite, at `target`. */
  bite: boolean;
  /** Pounce at this animal (and keep homing while the press holds), or -1. */
  pounce: number;
  /** The mouse is steering: pointer away, motion turns the body and the view. */
  steer: boolean;
  target: number;
  /** What to draw: the dash's mark, a target held on an animal a pounce is going at, or nothing. */
  mark: 'none' | 'zoom' | 'target';
}

/** Seconds a press has to last to be a hold rather than a click. */
export const STRIKE_HOLD = 0.2;
/** Pixels a press may travel and still be a click. */
export const STRIKE_DRAG = 6;
/** Seconds between a click and the next press for the two to be a double-click. */
export const STRIKE_DOUBLE = 0.32;
/** Seconds a move is given to show up in the body before the press stops asking for it. */
export const STRIKE_GRACE = 0.25;

const none = (): StrikeOut => ({ dash: false, aimRay: false, bite: false, pounce: -1, steer: false, target: -1, mark: 'none' });

/** The state the body is in while each move runs. */
const RUNS: Record<'dash' | 'bite' | 'pounce', string> = { dash: 'dodge', bite: 'attack', pounce: 'pounce' };

/** What a click on this animal (or on nothing) is, by how far away it is. */
export function clickKind(over: number, gap: number | undefined, biteReach: number): 'dash' | 'bite' | 'pounce' {
  if (over < 0 || gap === undefined) return 'dash';
  return gap <= biteReach ? 'bite' : 'pounce';
}

export function stepStrike(prev: StrikeState, f: StrikeFacts): { state: StrikeState; out: StrikeOut } {
  const st: StrikeState = { lastClick: prev.lastClick, strike: prev.strike ? { ...prev.strike } : undefined };
  const act = (target: number, held: boolean): Strike => {
    const kind = clickKind(target, target >= 0 ? f.gapTo(target) : undefined, f.biteReach);
    return { kind, target: kind === 'dash' ? -1 : target, t: f.now, down: f.now, began: false, fired: false, held };
  };
  if (f.pressed) {
    // The second press of a double-click does not wait to find out what it is: it is the attack.
    st.strike = f.now - prev.lastClick <= STRIKE_DOUBLE
      ? act(f.over, true)
      : { kind: 'pending', target: f.over, t: f.now, down: f.now, began: false, fired: false, held: true };
    if (f.now - prev.lastClick <= STRIKE_DOUBLE) st.lastClick = -Infinity;
  } else if (f.aimRelease !== undefined && f.aimRelease >= 0 && !st.strike?.held) {
    // Letting go of aim with the crosshair on an animal springs at it.
    st.strike = { kind: 'pounce', target: f.aimRelease, t: f.now, down: f.now, began: false, fired: false, held: false };
  }
  const out = none();
  let s = st.strike;
  if (!s) return { state: st, out };
  const become = (kind: StrikeKind) => { s = { ...s!, kind, t: f.now, began: false, fired: false }; };
  const finish = () => { if (s!.held) become('steer'); else s = undefined; };

  if (s.held && !f.left) {
    s.held = false;
    if (s.kind === 'pending') {
      // A click: the press came up before it was a hold. It is the attack, decided now.
      const clicked = act(s.target, false);
      s = clicked;
      st.lastClick = f.now;
    } else if (s.kind === 'steer') {
      st.strike = undefined;
      return { state: st, out };
    }
  }
  if (s.kind === 'pending' && (f.moved > STRIKE_DRAG || f.now - s.down >= STRIKE_HOLD)) become('steer');

  const gap = s.target >= 0 ? f.gapTo(s.target) : undefined;
  if (s.target >= 0 && gap === undefined && (s.kind === 'pounce' || s.kind === 'bite')) {
    // What it was on has gone — eaten, dead, hidden. There is nothing left to go at.
    s.target = -1;
    finish();
  }
  if (s && (s.kind === 'dash' || s.kind === 'bite' || s.kind === 'pounce')) {
    const running = f.state === RUNS[s.kind];
    if (running) s.began = true;
    if ((s.began && !running) || (!s.began && f.now - s.t > STRIKE_GRACE)) finish();
  }
  st.strike = s;
  if (!s) return { state: st, out };
  const k: StrikeKind = s.kind;
  out.target = k === 'pending' ? -1 : s.target;
  if (k === 'dash') {
    out.dash = true; out.aimRay = !s.began; out.mark = 'zoom';
  } else if (k === 'bite') {
    out.bite = !s.fired; s.fired = true;
  } else if (k === 'pounce') {
    // Asked for until it starts; kept on while it runs only for as long as the press is held,
    // which is what lets a held double-click keep homing on a body that is getting away.
    if (!s.began || s.held) out.pounce = s.target;
    out.mark = 'target';
  } else if (k === 'steer') {
    out.steer = true;
  }
  return { state: st, out };
}
