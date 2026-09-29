/**
 * What one press of the left mouse button comes to, as a state machine over the press and the body.
 *
 * The button used to be read three ways by how it moved — a click bit, a hold was the heavy, a drag
 * was the camera — which made the one button that matters most ask the player to know which of
 * three gestures they were making. It is read by **what it was pressed on** now, and does it at the
 * press:
 *
 *   - on open water it **dashes** there, down the cursor's own ray;
 *   - on an animal within a bite it **bites**, within a pounce it **pounces**, and further off it
 *     **chases**: swims flat out at the animal, the target held on it however it moves, and pounces
 *     the moment it is in reach. A chase lasts as long as the button; a quick click on something out
 *     of reach is a pounce *tried* anyway, because a click is a request for the attack and not for
 *     a swim.
 *
 * And whatever the press began, the button still down once it is over is **steering**: the pointer
 * is put away and the mouse turns the animal and the camera together, in every direction, until the
 * button comes up and the cursor is a pointer again. That is the whole hand-off between aiming and
 * swimming, on one button, without a keyboard.
 *
 * Pure, no clock of its own and nothing of the simulation's: `src/render/player-input.ts` hands it
 * what the body is doing and what is in reach, and turns what comes back into the frame. Held by
 * `npm run mouse:strike`.
 */

export type StrikeKind = 'dash' | 'bite' | 'pounce' | 'chase' | 'steer';

export interface Strike {
  kind: StrikeKind;
  /** The animal the press was on, or -1. Kept for the whole press: the target stays where it was put. */
  target: number;
  /** When the current kind began, in seconds. */
  t: number;
  /** When the button went down. */
  down: number;
  /** The move this kind asked for has been seen to start in the body. */
  began: boolean;
  /** The one-frame asks (the bite, the dash's first frame) have been made. */
  fired: boolean;
  /** The button is still down. */
  held: boolean;
}

export interface StrikeFacts {
  now: number;
  /** The left button is down this frame. */
  left: boolean;
  /** It went down since the last frame. */
  pressed: boolean;
  /** The animal under the cursor, or -1. Read only on the frame of the press. */
  over: number;
  /** Surface gap from the body to an animal, or undefined when it is gone, dead or hidden. */
  gapTo: (id: number) => number | undefined;
  biteReach: number;
  pounceReach: number;
  /** A pounce started now would be taken (cooldown, stamina, winded). */
  canPounce: boolean;
  /** The body's state machine, which is how the move being asked for is seen to have started. */
  state: string;
}

export interface StrikeOut {
  /** Hold the dash; `aimRay` is set on the frames the dash is still to be thrown down the cursor. */
  dash: boolean; aimRay: boolean;
  /** One bite, at `target`. */
  bite: boolean;
  /** Pounce at this animal (and keep homing while it is held), or -1. */
  pounce: number;
  /** Swim flat out at this animal, or -1. */
  chase: number;
  /** The mouse is steering: pointer away, motion turns the body and the view. */
  steer: boolean;
  target: number;
  /** What to draw where the cursor was: the dash mark, a target held on an animal, or nothing. */
  mark: 'none' | 'zoom' | 'target';
}

/** Seconds a press has to last to be a hold rather than a click. */
export const STRIKE_HOLD = 0.18;
/** Seconds a move is given to show up in the body before the press stops asking for it. */
export const STRIKE_GRACE = 0.25;
/** How far inside the pounce's reach a chase commits, so it does not spring at the very edge. */
export const CHASE_COMMIT = 0.92;

const none = (): StrikeOut => ({ dash: false, aimRay: false, bite: false, pounce: -1, chase: -1, steer: false, target: -1, mark: 'none' });

/** The state the body is in while each move runs. */
const RUNS: Record<'dash' | 'bite' | 'pounce', string> = { dash: 'dodge', bite: 'attack', pounce: 'pounce' };

/** What a press on this animal (or on nothing) should be, by how far away it is. */
export function strikeKind(over: number, gap: number | undefined, biteReach: number, pounceReach: number): StrikeKind {
  if (over < 0 || gap === undefined) return 'dash';
  if (gap <= biteReach) return 'bite';
  if (gap <= pounceReach) return 'pounce';
  return 'chase';
}

export function stepStrike(prev: Strike | undefined, f: StrikeFacts): { strike: Strike | undefined; out: StrikeOut } {
  let s = prev ? { ...prev } : undefined;
  if (f.pressed) {
    const gap = f.over >= 0 ? f.gapTo(f.over) : undefined;
    const kind = strikeKind(f.over, gap, f.biteReach, f.pounceReach);
    s = { kind, target: kind === 'dash' ? -1 : f.over, t: f.now, down: f.now, began: false, fired: false, held: true };
  }
  const out = none();
  if (!s) return { strike: s, out };
  const become = (kind: StrikeKind) => { s = { ...s!, kind, t: f.now, began: false, fired: false }; };
  // Whatever the press began, a button still down once it is over is the steering.
  const finish = () => { if (s!.held) become('steer'); else s = undefined; };

  if (s.held && !f.left) {
    s.held = false;
    // A click on something out of reach is a pounce tried anyway: the click asked for the attack.
    if (s.kind === 'chase' && f.now - s.down < STRIKE_HOLD) become('pounce');
    else if (s.kind === 'steer' || s.kind === 'chase') return { strike: undefined, out };
  }
  const gap = s.target >= 0 ? f.gapTo(s.target) : undefined;
  if (s.target >= 0 && gap === undefined && (s.kind === 'pounce' || s.kind === 'chase' || s.kind === 'bite')) {
    // What it was on has gone — eaten, dead, hidden. There is nothing left to go at.
    s.target = -1;
    finish();
  }
  if (!s) return { strike: s, out };

  if (s.kind === 'chase' && gap !== undefined && gap <= f.pounceReach * CHASE_COMMIT && f.canPounce) become('pounce');

  if (s.kind === 'dash' || s.kind === 'bite' || s.kind === 'pounce') {
    const running = f.state === RUNS[s.kind];
    if (running) s.began = true;
    if ((s.began && !running) || (!s.began && f.now - s.t > STRIKE_GRACE)) {
      // A pounce that could not start (cooling down, out of breath) goes back to the chase while
      // the button is down, and tries again when the body can.
      if (s.kind === 'pounce' && !s.began && s.held) become('chase');
      else finish();
    }
  }
  if (!s) return { strike: s, out };
  const k: StrikeKind = s.kind;
  out.target = s.target;
  if (k === 'dash') {
    out.dash = true; out.aimRay = !s.began; out.mark = 'zoom';
  } else if (k === 'bite') {
    out.bite = !s.fired; s.fired = true;
  } else if (k === 'pounce') {
    // Asked for until it starts; kept on while it runs only for as long as the button is held,
    // which is what lets a held pounce keep homing on a body that is getting away.
    if (!s.began || s.held) out.pounce = s.target;
    out.mark = 'target';
  } else if (k === 'chase') {
    out.chase = s.target; out.mark = 'target';
  } else {
    out.steer = true;
  }
  return { strike: s, out };
}
