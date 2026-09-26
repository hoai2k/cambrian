/**
 * Playing with a finger: the whole scheme, as a state machine over touch events.
 *
 * This is the third way to play, after the pad and the mouse, and it is written the way the mouse
 * scheme is written rather than invented from nothing — because the mouse scheme already answered
 * the hard question. `MousePlay` reads *one* button three ways (a click is the bite, a hold is the
 * heavy, a travel is the camera) and it tells them apart by what the press *did*, not by where a
 * separate button was. A finger is the same problem with better hands: there are several of them,
 * they arrive and leave, and none of them hovers.
 *
 * ## Where a touch starts is what it is for
 *
 * A touch is classified at its **down**, from the zone it landed in, and it keeps that job until it
 * lifts — exactly as `MousePlay.onDown` decides then and there whether a press is an attack or a
 * look. Three zones:
 *
 *   - **`swim`** — the forward pad, bottom left. Held, the animal swims forward. That is all it is:
 *     a button, not a stick. Forward is wherever the camera is looking (`my` is camera-relative and
 *     the camera's pitch is the swim pitch), so a swipe that lifts the view and a held swim pad is
 *     a climb, and nothing needs a second stick to say so.
 *   - **`secondary`** — the pad beside it, whose *action* the player chooses by swiping the pad
 *     itself sideways. See `SECONDARY` below.
 *   - **`water`** — everything else, which is the game. Tap to bite, double-tap to pounce or dash,
 *     swipe to look.
 *
 * Because the job is per touch, holding both pads while swiping with the other hand and tapping
 * with a third finger all compose for free, which is the whole reason to do it this way.
 *
 * ## Tap, double-tap, swipe
 *
 * A **tap** is a touch that lifts without travelling, and it is the bite. It fires on the **lift**,
 * for the mouse's own reason: until the finger comes up it is not yet known to have stayed still.
 *
 * A **double-tap** is a second touch going down within `DOUBLE` of a tap lifting, and what it means
 * depends on what the first tap was over — which is the mouse's rule for its own held button, that
 * a pounce needs something to pounce *at*:
 *
 *   - over an animal it is the **heavy**: the pounce, the lunge, whatever that animal's heavy is;
 *   - over open water it is the **dash**, aimed at that water. A double-tap commits to the full
 *     crossing even if the second finger lifts before the next frame; holding still works too.
 *
 * The first tap of a double-tap still bites, and that is deliberate rather than a concession. The
 * alternative is to sit on every bite for `DOUBLE` seconds to find out whether a second tap is
 * coming, which taxes the common move to pay for the rare one; a bite that is a quarter of a second
 * late is a bite that missed. So a double-tap is strictly *additive* — bite, then pounce — which is
 * a combination a player would want anyway. A dash takes over a bite that is still winding up.
 *
 * A **swipe** — past `DRAG` of travel — is the camera, and from then on that touch is only the
 * camera. Same threshold in spirit as `MousePlay.DRAG`, coarser in pixels because a fingertip is.
 *
 * There is deliberately **no hold-to-heavy here**, though the mouse has one. The mouse needs it:
 * it has no double-click in its vocabulary and a cursor sits exactly still when nobody is moving
 * it. A finger has neither property — it always drifts, and a slow deliberate swipe begins as a
 * press that has not travelled yet — so `HOLD` on touch would turn the start of every careful look
 * into a pounce. Touch gets its heavy from the double-tap instead.
 *
 * ## Two fingers on the water
 *
 * A **pinch** is the one gesture here that is about a *pair* of fingers rather than either of them,
 * and it exists because zoom is otherwise unreachable: the mouse has a wheel and the pad has a
 * stick click, and a finger has neither. Two fingers on the water with at least one of them moving
 * are a pinch — their separation is the zoom and their **centroid** is the camera, so a pair moving
 * together pans the view once rather than twice as fast as one finger would. Two fingers merely
 * resting are not a pinch; they are two taps that have not happened yet.
 *
 * Everything else still composes around it, because the pads and the taps were never part of this
 * pair: a third finger tapping still bites while two are pinching.
 *
 * ## Where a touch is aiming
 *
 * There is no cursor, so there is nothing hovering to aim along — but a *live* finger is a
 * perfectly good crosshair, and "whatever the crosshair is on is the target" is the rule the game
 * already plays by. So the last water touch's position is the aim point, and it **outlives the
 * finger** by `AIM_HOLD`: the bite fires on the lift, when the finger is already gone, so a point
 * that vanished with it would aim every tap at nothing. Past `AIM_HOLD` it lapses and aiming goes
 * back to the middle of the screen while aim mode is held. The HUD only draws a touch mark for a
 * creature tap, a dash, or aim mode. A cursor is always somewhere; a finger usually is not.
 *
 * Pure: no DOM, no clock of its own, no `Math.random`. Times are passed in, positions are passed
 * in, and `src/input/touch.ts` is the adapter that reads the events off an element. That split is
 * what lets `npm run touch` drive the whole scheme without a browser.
 */

/** A secondary action the swappable pad can be set to. */
export type Secondary = 'aim' | 'guard' | 'ability';

/**
 * The ring the secondary pad walks, in the order a swipe steps through it.
 *
 * Three, and the same three on every animal. Sense is permanently on for touch play, so it has no
 * slot to toggle. The ring stays stable as the player changes creatures.
 *
 * `aim` leads because it is the one the pad starts on and the one a player reaches for first.
 */
export const SECONDARY: readonly Secondary[] = ['aim', 'guard', 'ability'];

/** Which zone a touch went down in. Decided by the adapter from the element it hit. */
export type Zone = 'water' | 'swim' | 'secondary';

/**
 * What a touch turned out to be. Assigned at the down where the zone alone decides it, and
 * otherwise on the first event that settles it; never reassigned after that.
 *
 *   - `pending`   a water touch that has neither travelled nor lifted: it could still be either.
 *   - `drag`      it travelled. The camera, for the rest of its life.
 *   - `dash`      it is the second half of a double-tap over open water. A dash, aimed at itself.
 *   - `heavy`     it is the second half of a double-tap over an animal. One edge, then inert.
 *   - `swim`      it is on the forward pad.
 *   - `secondary` it is on the secondary pad, holding that pad's action.
 *   - `swap`      it is on the secondary pad and has travelled sideways: it changed the pad's
 *                 action and fires nothing.
 */
export type Role = 'pending' | 'drag' | 'dash' | 'heavy' | 'swim' | 'secondary' | 'swap';

/**
 * One finger, from its down to its lift.
 *
 * Named for the finger rather than for the event because the DOM already has a `Touch` and this is
 * not it: that one is a position, and this is a position with a job and a history.
 */
export interface Finger {
  id: number;
  zone: Zone;
  role: Role;
  /** When it went down, in seconds. */
  t0: number;
  /** Where it went down, in CSS pixels relative to the surface. */
  x0: number; y0: number;
  /** Where it is now. */
  x: number; y: number;
  /** Total path length travelled, in pixels. Compared against `DRAG`, as the mouse compares its own. */
  moved: number;
  /** Travel since the last `read`, in pixels: what a drag hands the camera. Drained by `read`. */
  dx: number; dy: number;
  /**
   * Whether there was something worth attacking under it when it went down. Supplied by the caller,
   * which is the only thing that knows — the same fact `MousePlay.aimingAt` is told each frame.
   */
  onTarget: boolean;
  /** Pixels of sideways travel banked on the secondary pad since the last step of the ring. */
  swiped: number;
}

/** Everything the scheme remembers between events. Make one with `freshTouch()`. */
export interface TouchState {
  /** Live fingers by identifier, in arrival order. */
  touches: Map<number, Finger>;
  /** The last completed tap: when it lifted, and whether it was over something. */
  lastTap: { t: number; onTarget: boolean } | undefined;
  /** Index into `SECONDARY`: which action the secondary pad is currently holding. */
  slot: number;
  /** Bites banked since the last `read`, as a count so two taps in one frame are two bites. */
  bites: number;
  /** Heavies banked since the last `read`. */
  heavies: number;
  /** A double-tap commits to a full dash even if the second finger lifts before a render frame. */
  dashPulse: number;
  dashReadAt: number | undefined;
  /** The aim point, in normalised device coordinates (-1..1, y up), and when it was last touched. */
  aim: { x: number; y: number; t: number; marker?: 'target' | 'zoom' } | undefined;
  /** How many times the ring has been stepped, so a caller can notice and make a noise about it. */
  swaps: number;
  /**
   * The distance between the two fingers of a live pinch, in pixels, as `read` last saw it.
   * `undefined` when nothing is pinching — which is also how a pinch that has just begun is told
   * from one in progress, since the first frame of one has no previous distance to compare against
   * and so must move the zoom by nothing at all.
   */
  pinchSep: number | undefined;
}

export const freshTouch = (slot = 0): TouchState => ({
  touches: new Map(), lastTap: undefined, slot, bites: 0, heavies: 0, dashPulse: 0, dashReadAt: undefined, aim: undefined, swaps: 0,
  pinchSep: undefined,
});

/** Pixels of travel that turn a touch into a camera swipe rather than a tap. */
export const DRAG = 10;
/** Seconds between a tap lifting and the next touch going down for the two to be a double-tap. */
export const DOUBLE = 0.28;
/** Seconds a touch may last and still be a tap. Longer than that it is a finger resting, not a tap. */
export const TAP_TIME = 0.45;
/** Pixels of sideways travel on the secondary pad that step the ring by one. */
export const SWAP = 40;
/** Seconds the aim point outlives the finger that set it. */
export const AIM_HOLD = 0.6;
/**
 * Radians of camera per pixel of swipe, before the player's camera-speed setting.
 *
 * Higher than `MousePlay.SENSITIVITY` (0.0042) because the surface is smaller and the hand cannot
 * be picked up and put back down: a mouse can turn all day across a mousepad, and a thumb has the
 * width of a phone. At this rate a swipe across half of a 780-point landscape phone is about 80°,
 * which is a look over the shoulder in one gesture.
 */
export const SENSITIVITY = 0.0068;
/**
 * Pinch travel to zoom exponent. One is the natural rate — the ratio the fingers moved *is* the
 * ratio the view should change by — and this is the fraction of it the camera actually takes,
 * because the arm is clamped to a narrow band (0.55..2.2) and a raw pinch crosses the whole of it
 * in one gesture.
 */
export const PINCH = 0.55;
/**
 * Pixels the two fingers of a pinch must be apart before their separation is believed.
 *
 * Two fingers landing almost on top of each other have a separation dominated by noise, and the
 * zoom is a *ratio* of it, so a wobble of two pixels at a separation of six is a 30 % zoom. Below
 * this the pinch carries the camera and leaves the zoom alone.
 */
export const PINCH_MIN = 40;

/** Step the ring. Wraps both ways; `dir` is which way the finger went. */
export const stepSlot = (slot: number, dir: 1 | -1): number =>
  (slot + dir + SECONDARY.length) % SECONDARY.length;

/** What the secondary pad is set to. */
export const secondaryOf = (s: TouchState): Secondary => SECONDARY[s.slot] ?? SECONDARY[0];

/** Screen pixels to normalised device coordinates over a surface of this size. */
export const toNdc = (x: number, y: number, w: number, h: number) =>
  ({ x: (x / w) * 2 - 1, y: -((y / h) * 2 - 1) });

/**
 * A touch went down.
 *
 * `onTarget` is whether the caller thinks there is something worth attacking under it, and it is
 * read here rather than on the release for the mouse's reason: the press is classified at the down
 * and what it is pointed at is part of that classification.
 */
export function down(
  s: TouchState,
  id: number,
  zone: Zone,
  x: number, y: number,
  t: number,
  onTarget: boolean,
  size: { w: number; h: number },
): void {
  // A duplicate identifier means the previous touch with it was never released — a lost `touchend`,
  // which happens. Drop the stale one rather than keeping two of it.
  s.touches.delete(id);
  const touch: Finger = { id, zone, role: 'pending', t0: t, x0: x, y0: y, x, y, moved: 0, dx: 0, dy: 0, onTarget, swiped: 0 };
  if (zone === 'swim') touch.role = 'swim';
  else if (zone === 'secondary') touch.role = 'secondary';
  else {
    // Water. The aim point follows the newest finger on the water, because that is the one the
    // player is pointing with.
    s.aim = { ...toNdc(x, y, size.w, size.h), t, marker: onTarget ? 'target' : undefined };
    const tap = s.lastTap;
    if (tap && t - tap.t <= DOUBLE) {
      // The second half of a double-tap. Which of the two it is was settled by the *first* tap: the
      // question "is there something to pounce at" was asked where the player aimed, and the second
      // tap is a confirmation rather than a new aim.
      touch.role = tap.onTarget ? 'heavy' : 'dash';
      s.aim.marker = touch.role === 'dash' ? 'zoom' : 'target';
      if (tap.onTarget) s.heavies++;
      else { s.dashPulse = 0.42; s.dashReadAt = undefined; }
      // A double-tap is consumed: three taps are a double-tap and then a fresh single, not two
      // overlapping doubles.
      s.lastTap = undefined;
    }
  }
  s.touches.set(id, touch);
}

/** A touch moved. `x`/`y` are where it is now. */
export function move(s: TouchState, id: number, x: number, y: number, size: { w: number; h: number }, t: number): void {
  const p = s.touches.get(id);
  if (!p) return;
  const mx = x - p.x, my = y - p.y;
  p.x = x; p.y = y;
  p.moved += Math.hypot(mx, my);
  if (p.role === 'pending' && p.moved > DRAG) p.role = 'drag';
  if (p.role === 'drag') { p.dx += mx; p.dy += my; }
  // A dash aims at its own finger: moving it re-aims the dash, which is the mouse's right-button
  // rule verbatim and is better than letting the same finger also turn the camera.
  if (p.role === 'dash' || p.role === 'drag' || p.role === 'pending') {
    s.aim = { ...toNdc(p.x, p.y, size.w, size.h), t,
      marker: p.role === 'dash' ? 'zoom' : p.role === 'pending' && p.onTarget ? 'target' : undefined };
  }
  if (p.zone === 'secondary') {
    // Sideways on the pad steps the ring, and that touch stops being the action: travel changes
    // what a touch means here exactly as it does on the water.
    p.swiped += mx;
    while (Math.abs(p.swiped) >= SWAP) {
      const dir: 1 | -1 = p.swiped > 0 ? 1 : -1;
      s.slot = stepSlot(s.slot, dir);
      s.swaps++;
      p.swiped -= dir * SWAP;
      p.role = 'swap';
    }
  }
}

/** A touch lifted. */
export function up(s: TouchState, id: number, t: number): void {
  const p = s.touches.get(id);
  if (!p) return;
  s.touches.delete(id);
  if (p.zone !== 'water') return;
  // A tap: it never travelled and it did not linger. The bite is banked here rather than at the
  // down because staying still is only known once the finger is gone.
  if (p.role === 'pending' && p.moved <= DRAG && t - p.t0 <= TAP_TIME) {
    s.bites++;
    s.lastTap = { t, onTarget: p.onTarget };
  }
}

/** Every touch is gone: a cancel, a blur, or the scheme being switched off. */
export function clear(s: TouchState): void {
  s.touches.clear();
  s.lastTap = undefined;
  s.bites = 0; s.heavies = 0;
  s.dashPulse = 0; s.dashReadAt = undefined;
  s.aim = undefined;
  s.pinchSep = undefined;
}

/** What one frame of touch input comes to. Mirrors `MousePlay['read']`'s shape where it overlaps. */
export interface TouchFrame {
  /** Camera movement already made, in radians: the sum of every swipe this frame. */
  dx: number; dy: number;
  /** Zoom for this frame, as the exponent of the multiplier, exactly as a wheel notch is. */
  zoom: number;
  /** Bites to fire this frame. Zero or more. */
  bites: number;
  /** Heavies to fire this frame. */
  heavies: number;
  /** The forward pad is held. */
  swim: boolean;
  /** The secondary pad is held, and what it is set to. `undefined` when nothing holds it. */
  secondary: Secondary | undefined;
  /** A dash is running: a committed double-tap on water, or its second finger still held. */
  dash: boolean;
  /** A swipe is turning the camera, so the follow camera stands aside. */
  dragging: boolean;
  /** Where the player is pointing, in NDC, while it has not lapsed. */
  ndc: { x: number; y: number } | undefined;
  /** Gesture feedback. An ordinary tap on water never draws a mark. */
  marker: 'target' | 'zoom' | undefined;
  /** The ring stepped this frame: worth a click and a label. */
  swapped: boolean;
  /** Two fingers are working the view together, so the zoom is theirs and the reticle stands down. */
  pinching: boolean;
}

/**
 * Drain a frame's worth of input.
 *
 * Draining rather than sampling, for the reason every edge in this codebase is drained: a bite is
 * an edge and a frame that did not run is not a frame that should lose it.
 */
export function read(s: TouchState, t: number, lookSpeed = 1): TouchFrame {
  let dx = 0, dy = 0, dragging = false, swim = false, dash = false;
  if (s.dashPulse > 0) {
    // The simulation caps a slow rendered frame at 80 ms. Spend the gesture on the same clock so
    // a quick double-tap still crosses the full distance when the phone misses several frames.
    if (s.dashReadAt !== undefined) s.dashPulse = Math.max(0, s.dashPulse - Math.min(0.08, Math.max(0, t - s.dashReadAt)));
    s.dashReadAt = t;
    if (s.dashPulse > 0 && s.aim?.marker === 'zoom') s.aim.t = t;
  }
  dash = s.dashPulse > 0;
  let secondary: Secondary | undefined;
  /**
   * The fingers that are working the view: on the water, and not spoken for as a dash, a tap that
   * has already fired or a pad. Two of those at once is a pinch, which is the one gesture in the
   * scheme that is about the pair rather than about either finger.
   */
  const viewing: Finger[] = [];
  for (const p of s.touches.values()) {
    if (p.role === 'drag' || p.role === 'pending') { if (p.zone === 'water') viewing.push(p); }
    else if (p.role === 'swim') swim = true;
    else if (p.role === 'secondary') secondary = secondaryOf(s);
    else if (p.role === 'dash') dash = true;
    if ((p.role === 'dash' || (p.role === 'pending' && p.onTarget)) && s.aim?.marker) s.aim.t = t;
  }
  // A pinch needs two fingers on the water and at least one of them actually moving: two fingers
  // resting are two taps waiting to happen, and calling that a pinch would zoom the view every time
  // somebody put a hand down.
  const pinching = viewing.length >= 2 && viewing.some((p) => p.role === 'drag');
  let zoom = 0;
  if (pinching) {
    const [a, b] = viewing;
    const sep = Math.hypot(a.x - b.x, a.y - b.y);
    if (s.pinchSep !== undefined && s.pinchSep >= PINCH_MIN && sep >= PINCH_MIN) {
      // Spreading the fingers zooms *in*, which is a shorter camera arm and so a smaller `zoom`:
      // hence the sign. The exponent is the log of the ratio, because that is what makes a pinch
      // and its reverse cancel exactly.
      zoom = -Math.log(sep / s.pinchSep) * PINCH;
    }
    s.pinchSep = sep;
    // The camera follows the *centroid*, so two fingers moving together pan the view once rather
    // than twice as fast as one would. Their deltas are drained either way: a delta kept back is a
    // delta that arrives later as a jump.
    for (const p of viewing) { dx += p.dx / viewing.length; dy += p.dy / viewing.length; p.dx = 0; p.dy = 0; }
    dragging = true;
  } else {
    s.pinchSep = undefined;
    for (const p of viewing) {
      if (p.role === 'drag') { dx += p.dx; dy += p.dy; dragging = true; }
      p.dx = 0; p.dy = 0;
    }
  }
  const f: TouchFrame = {
    dx: dx * SENSITIVITY * lookSpeed, dy: dy * SENSITIVITY * lookSpeed,
    zoom,
    bites: s.bites, heavies: s.heavies,
    swim, secondary, dash, dragging,
    // The aim point lapses on its own clock, so a bite fired on a lift still aims where the finger
    // was and a hand taken off the glass hands aiming back to the middle of the screen.
    ndc: s.aim && t - s.aim.t <= AIM_HOLD ? { x: s.aim.x, y: s.aim.y } : undefined,
    marker: s.aim && t - s.aim.t <= AIM_HOLD ? s.aim.marker : undefined,
    swapped: s.swaps > 0,
    pinching,
  };
  s.bites = 0; s.heavies = 0; s.swaps = 0;
  // A tap that nothing followed is spent: it cannot pair with a touch that arrives much later.
  if (s.lastTap && t - s.lastTap.t > DOUBLE) s.lastTap = undefined;
  return f;
}

/**
 * Hand out one edge per frame from a queue of them.
 *
 * `read` reports bites and heavies as counts, because two taps can land inside one frame and the
 * second is a real press a player made. `RawControls` carries a boolean, so the surplus has to be
 * *owed* rather than collapsed — the same reasoning that makes every edge in this codebase drained
 * rather than sampled. It matters most where frames are scarcest: a phone runs at 16 ms a frame, and
 * a headless harness under the software renderer runs at nearly a second, which is precisely where a
 * test taps twice in a row.
 */
export const meterEdge = (owed: number, arrived: number): { fire: boolean; owed: number } => {
  const n = owed + arrived;
  return { fire: n > 0, owed: Math.max(0, n - 1) };
};
