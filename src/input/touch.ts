import { emptyControls, type RawControls } from './input';
import {
  SECONDARY, clear, down, freshTouch, meterEdge, move, read, secondaryOf, up,
  toNdc, type Secondary, type TouchFrame, type TouchState, type Zone,
} from '../shared/touch-play';

/**
 * The touchscreen, wired to a real element.
 *
 * This is to `src/shared/touch-play.ts` what `MousePlay`'s event handlers are to the rest of it: the
 * part that knows about the DOM, and nothing else. Every decision — what a tap means, when a swipe
 * becomes the camera, which action the secondary pad is holding — is in the pure module, so the
 * whole scheme can be driven by `npm run touch` with no browser anywhere near it. What is left here
 * is genuinely browser business: which element a finger landed on, whose event to swallow, and how
 * a `Touch.identifier` maps onto a state machine.
 *
 * ## Which touches are ours
 *
 * The zone a finger is in is read off the DOM at the **down**, from the nearest
 * `[data-touch-zone]` ancestor — which is how the swim and secondary pads declare themselves, as
 * plain divs with an attribute rather than event handlers. Anything inside the engine's own
 * container that is not a control is the water.
 *
 * Anything else is **not ours and is left entirely alone**: a tap on the toolbar, a menu choice, a
 * dialog or a link is that element's, and swallowing it would make the game unplayable in the only
 * way that actually matters, which is not being able to get out of it. A touch that is not ours is
 * never entered into the state machine, so its move and end events are ignored too — which is why
 * the identifiers we own are kept in a set rather than inferred again from each event's target: a
 * finger that went down on the swim pad and slid off it is still the swim pad's.
 *
 * ## Why the listeners are on the window, in the capture phase
 *
 * The pads sit in the HUD layer, which is *above* the canvas, so a touch on one of them never
 * reaches the container at all; and a finger that leaves the element it started on still sends its
 * moves to that element, not to whatever it is over now. Listening high and early is the one
 * arrangement that sees every touch exactly once.
 *
 * `touchstart` and `touchmove` are non-passive for the touches we own, because the default action is
 * scrolling, rubber-banding and double-tap-to-zoom — and double-tap is a move in this game, so a
 * browser that zooms on it takes the pounce away.
 */
export class TouchPlay {
  private el: HTMLElement | null = null;
  private state: TouchState = freshTouch();
  private wanted = false;
  /** The identifiers this scheme owns, so a finger keeps its job after it leaves its element. */
  private mine = new Set<number>();
  /** Whether there is something worth attacking where the player is pointing. Written each frame. */
  private overTarget = false;
  /** Test the actual new touch point; the previous frame's target may be somewhere else. */
  targetAt: ((ndc: { x: number; y: number }) => boolean) | null = null;
  /** Edges the simulation has not been handed yet: see `read`. */
  private owedBites = 0;
  private owedHeavies = 0;
  /** Called when a swipe changes the secondary pad, so the shell can remember and make a noise. */
  onSwap: ((s: Secondary) => void) | null = null;
  /** Whether any finger has touched the game yet. The shell uses it to decide the scheme is live. */
  used = false;

  /** Seconds, on the same clock `MousePlay` uses, so the two schemes measure holds the same way. */
  private now() { return performance.now() / 1000; }

  /**
   * When a touch event actually *happened*, rather than when this handler got round to it.
   *
   * This matters more than it looks. The scheme measures a tap against `TAP_TIME` and a double-tap
   * against `DOUBLE`, and both are a few hundred milliseconds — so if the time is read when the
   * listener runs, a frame that took longer than that is a frame in which the player's taps are
   * silently reclassified as fingers resting. The main thread stalling for half a second is not
   * hypothetical on a phone (a chunk streaming in, a shader compiling), and under a software
   * renderer it is the normal case: a tap dispatched into one of those frames measured **2.4
   * seconds** long and was thrown away.
   *
   * `timeStamp` is a `DOMHighResTimeStamp` on the same origin as `performance.now()`, so the two are
   * directly comparable and `read` can keep using the clock for the aim point's own lapse. Some
   * engines have reported it as an epoch millisecond value instead, which would be a vast number
   * here, so it is sanity-checked against the clock and falls back rather than trusted blindly.
   */
  private at_(e: TouchEvent) {
    const now = this.now();
    const t = e.timeStamp / 1000;
    return Number.isFinite(t) && t > 0 && t <= now + 1 ? t : now;
  }

  private size() {
    const r = this.el?.getBoundingClientRect();
    return { w: Math.max(1, r?.width ?? 1), h: Math.max(1, r?.height ?? 1) };
  }

  /** Where a touch is, relative to the surface, in CSS pixels. */
  private at(t: Touch) {
    const r = this.el?.getBoundingClientRect();
    return { x: t.clientX - (r?.left ?? 0), y: t.clientY - (r?.top ?? 0) };
  }

  /**
   * Which zone a fresh touch is in, or `undefined` if it is not the game's at all.
   *
   * A declared zone wins outright. Failing that, a touch inside the engine's container that is not
   * on something interactive is the water — and *interactive* is asked of the element rather than of
   * a list of our own components, so a button added later is handled without this knowing about it.
   */
  private zoneOf(target: EventTarget | null): Zone | undefined {
    const el = target instanceof Element ? target : null;
    if (!el) return undefined;
    const declared = el.closest('[data-touch-zone]')?.getAttribute('data-touch-zone');
    if (declared === 'swim' || declared === 'secondary' || declared === 'water') return declared;
    if (el.closest('button,a,dialog,input,select,textarea,[role="button"],[role="option"]')) return undefined;
    return this.el && (el === this.el || this.el.contains(el)) ? 'water' : undefined;
  }

  private onStart = (e: TouchEvent) => {
    if (!this.wanted) return;
    const t = this.at_(e), size = this.size();
    let took = false;
    for (const touch of Array.from(e.changedTouches)) {
      const zone = this.zoneOf(touch.target ?? e.target);
      if (!zone) continue;
      const p = this.at(touch);
      const onTarget = zone === 'water' && this.targetAt
        ? this.targetAt(toNdc(p.x, p.y, size.w, size.h)) : this.overTarget;
      down(this.state, touch.identifier, zone, p.x, p.y, t, onTarget, size);
      this.mine.add(touch.identifier);
      took = true;
    }
    if (took) {
      this.used = true;
      // Swallow the browser's own gestures — scroll, rubber-band, and above all double-tap zoom,
      // which would otherwise eat the pounce. Only for touches that are ours: a tap on a menu
      // button has to keep working.
      if (e.cancelable) e.preventDefault();
    }
  };

  private onMove = (e: TouchEvent) => {
    if (!this.wanted) return;
    const t = this.at_(e), size = this.size();
    let took = false;
    for (const touch of Array.from(e.changedTouches)) {
      if (!this.mine.has(touch.identifier)) continue;
      const p = this.at(touch);
      move(this.state, touch.identifier, p.x, p.y, size, t);
      took = true;
    }
    if (took) {
      if (e.cancelable) e.preventDefault();
      const s = secondaryOf(this.state);
      if (this.lastSlot !== s) { this.lastSlot = s; this.onSwap?.(s); }
    }
  };

  /** The pad's action as the shell last heard it, so `onSwap` fires on the change and not per move. */
  private lastSlot: Secondary = secondaryOf(freshTouch());

  private onEnd = (e: TouchEvent) => {
    const t = this.at_(e);
    for (const touch of Array.from(e.changedTouches)) {
      if (!this.mine.delete(touch.identifier)) continue;
      up(this.state, touch.identifier, t);
    }
  };

  private onCancel = (e: TouchEvent) => {
    for (const touch of Array.from(e.changedTouches)) this.mine.delete(touch.identifier);
    // A cancel is the browser taking the gesture away — a call arriving, a system edge swipe. What
    // it is not is a lift, so nothing it was carrying may fire.
    if (this.mine.size === 0) clear(this.state);
  };

  private onBlur = () => { this.mine.clear(); clear(this.state); };

  attach(el: HTMLElement) {
    this.el = el;
    // High and early: the pads sit above the canvas and a finger that wanders off an element keeps
    // reporting to it, so nothing lower down sees every touch.
    window.addEventListener('touchstart', this.onStart, { passive: false, capture: true });
    window.addEventListener('touchmove', this.onMove, { passive: false, capture: true });
    window.addEventListener('touchend', this.onEnd, { capture: true });
    window.addEventListener('touchcancel', this.onCancel, { capture: true });
    window.addEventListener('blur', this.onBlur);
  }

  /** Tell the scheme whether the player is pointing at something. Called every frame. */
  aimingAt(on: boolean) { this.overTarget = on; }

  /** Whether the finger is playing the game rather than working the menus. */
  want(on: boolean) {
    if (this.wanted === on) return;
    this.wanted = on;
    if (!on) { this.mine.clear(); clear(this.state); this.owedBites = 0; this.owedHeavies = 0; }
  }

  /** What the secondary pad is set to, for the HUD to label it with. */
  get secondary(): Secondary { return secondaryOf(this.state); }

  /** Put the pad back where the player last left it, across matches and across sessions. */
  setSecondary(s: Secondary) {
    const i = SECONDARY.indexOf(s);
    if (i >= 0) { this.state.slot = i; this.lastSlot = s; }
  }

  /**
   * Everything the fingers have done since the last frame.
   *
   * Bites and heavies arrive as *counts* and leave as at most one of each, with the remainder owed
   * to the next frame. Two taps inside one frame are two bites and the second must not be dropped:
   * `RawControls` carries a boolean, and a frame is 16 ms on a phone but can be a whole second under
   * a software renderer, which is exactly where a headless harness taps twice.
   */
  read(lookSpeed = 1): TouchFrame & { light: boolean; heavy: boolean } {
    const f = read(this.state, this.now(), lookSpeed);
    const bite = meterEdge(this.owedBites, f.bites);
    const heavy = meterEdge(this.owedHeavies, f.heavies);
    this.owedBites = bite.owed; this.owedHeavies = heavy.owed;
    return { ...f, light: bite.fire, heavy: heavy.fire };
  }

  dispose() {
    this.want(false);
    window.removeEventListener('touchstart', this.onStart, { capture: true } as EventListenerOptions);
    window.removeEventListener('touchmove', this.onMove, { capture: true } as EventListenerOptions);
    window.removeEventListener('touchend', this.onEnd, { capture: true } as EventListenerOptions);
    window.removeEventListener('touchcancel', this.onCancel, { capture: true } as EventListenerOptions);
    window.removeEventListener('blur', this.onBlur);
    this.el = null;
  }
}

/**
 * Fold a frame of touch into a device's controls, as `applyMouse` folds a frame of mouse.
 *
 * The one place the two schemes differ in what they are *allowed* to reach: the mouse may not set
 * `ability` or `guard`, because a mouse plays beside a keyboard and those have keys. A
 * finger has no keyboard to fall back on, so the secondary pad reaches both — one at a time,
 * which is what the ring is. Menu actions are reached through React's pause and travel menus,
 * while `rise` and `sink` are the camera's job here (pitch the view and hold swim).
 */
export function applyTouch(c: RawControls, t: ReturnType<TouchPlay['read']>): RawControls {
  c.lookDX = t.dx; c.lookDY = t.dy; c.zoomDelta = t.zoom;
  // Forward is a button, not a stick: `my` is camera-relative, so where the view looks is where the
  // body goes, and a swipe that lifts the view turns a held swim pad into a climb.
  if (t.swim) c.my = 1;
  if (t.light) c.light = true;
  if (t.heavy) c.heavy = true;
  if (t.dash) { c.dash = true; c.dodge = true; }
  if (t.secondary === 'aim') { c.aim = true; c.lock = true; }
  else if (t.secondary === 'guard') c.guard = true;
  else if (t.secondary === 'ability') c.ability = true;
  if (t.swim || t.light || t.heavy || t.dash || t.secondary) c.any = c.anyButton = true;
  return c;
}

/** A neutral frame of touch, for a seat whose fingers are nowhere. */
export const emptyTouchControls = (): RawControls => emptyControls();
