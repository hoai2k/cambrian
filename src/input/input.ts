/** Raw per-device controls, before camera-relative conversion. */
export interface RawControls {
  mx: number; my: number; lookX: number; lookY: number;
  /**
   * Camera movement that already happened, in radians, rather than a rate to integrate. A stick
   * reports how far it is pushed and the camera turns for as long as it is held, so `lookX`/`lookY`
   * are multiplied by the frame time; a mouse reports how far it has *moved* since the last frame,
   * which is an angle on its own and must not be scaled by dt as well.
   */
  lookDX: number; lookDY: number;
  /** Wheel zoom, as the exponent of the zoom multiplier for this frame. */
  zoomDelta: number;
  burst: number; rise: boolean; sink: boolean;
  light: boolean; heavy: boolean; ability: boolean; dodge: boolean; guard: boolean; lock: boolean; sense: boolean;
  dash: boolean; aim: boolean; rsClick: boolean;
  /** D-pad down: the in-game teleport menu. */
  teleport: boolean;
  menu: boolean;
  /** View / Back (pad button 8), Z and comma on the keyboards: hold for the scoreboard. */
  view: boolean;
  confirm: boolean; back: boolean;
  /** Raw shoulder buttons. Menus bind to these rather than to `dodge`/`rise`, which share them. */
  lb: boolean; rb: boolean;
  dleft: boolean; dright: boolean; dup: boolean; ddown: boolean;
  /** Any button or stick movement: used by the title screen, where anything at all starts. */
  any: boolean;
  /** Any button, ignoring the sticks. Joining uses this so stick drift cannot add a player. */
  anyButton: boolean;
}

export const emptyControls = (): RawControls => ({
  mx: 0, my: 0, lookX: 0, lookY: 0, lookDX: 0, lookDY: 0, zoomDelta: 0, burst: 0, rise: false, sink: false,
  light: false, heavy: false, ability: false, dodge: false, guard: false, lock: false, sense: false,
  dash: false, aim: false, rsClick: false, teleport: false,
  menu: false, view: false, confirm: false, back: false, lb: false, rb: false,
  dleft: false, dright: false, dup: false, ddown: false,
  any: false, anyButton: false,
});

export function deadzone(x: number, y: number, dz = 0.15): [number, number] {
  const r = Math.hypot(x, y);
  if (r <= dz) return [0, 0];
  const k = Math.min(1, (r - dz) / (1 - dz));
  return [(x / r) * k, (y / r) * k];
}

/** Standard-mapping Xbox layout. */
export function readGamepad(gp: Gamepad): RawControls {
  const [mx, my] = deadzone(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
  const [lx, ly] = deadzone(gp.axes[2] ?? 0, gp.axes[3] ?? 0, 0.12);
  const b = (i: number) => !!gp.buttons[i]?.pressed;
  const v = (i: number) => gp.buttons[i]?.value ?? 0;
  const c: RawControls = {
    mx, my: -my, lookX: lx, lookY: ly, lookDX: 0, lookDY: 0, zoomDelta: 0,
    // A dash · LB sprint · LS click sink · RB rise · X bite · Y hide · RT pounce · B guard · LT aim
    //
    // The two gears live on the left hand — hold LB to sprint, and the trigger above it aims — and
    // the four face buttons are the four things you do with the body in front of you: dash, bite,
    // guard, hide. Going up and down is the pair nothing else wants, RB and the left stick's own
    // click, so neither costs a face button. The D-pad is menus and modes only; nothing in play
    // hangs off it, which is what makes the cursor safe to move in every direction.
    //
    // Sharing a button with a menu is fine and always has been — A is dash and confirm, B is guard
    // and back — because they are different screens. What is not fine is two *menu* actions on one
    // button: `tools/menu-bindings-test.ts` holds that line.
    burst: b(4) ? 1 : 0, rise: b(5), sink: b(10),
    light: b(2), heavy: v(7) > 0.5, ability: b(3), dodge: b(0), guard: b(1), lock: v(6) > 0.4, sense: b(12),
    dash: b(0), aim: v(6) > 0.4, rsClick: b(11), teleport: b(13),
    menu: b(9), view: b(8), confirm: b(0), back: b(1), lb: b(4), rb: b(5),
    dleft: b(14), dright: b(15), dup: b(12), ddown: b(13),
    any: false, anyButton: false,
  };
  // Buttons are read straight off the device rather than through the named controls above, so a
  // pad that reports a non-standard mapping (where A is not button 0) can still join and start.
  c.anyButton = gp.buttons.some((x) => x.pressed);
  c.any = c.anyButton || Math.hypot(mx, my) > 0.5;
  return c;
}

export class KeyboardInput {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();
  anyPress = false;
  private onDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement | null)?.matches?.('input,textarea,select,button,a')) return;
    this.keys.add(e.code); this.pressedThisFrame.add(e.code); this.anyPress = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  };
  private onUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onBlur = () => this.keys.clear();
  constructor() {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }
  has(code: string) { return this.keys.has(code); }
  read(layout: 1 | 2): RawControls {
    const k = (c: string) => this.keys.has(c);
    const c = emptyControls();
    if (layout === 1) {
      // **A and D turn the animal, and the animal turns the camera.** They move the *body* — the
      // stick's own sideways axis — not the view: a swimmer turns into its travel (`turnRate` in
      // `game.ts`) and the follow camera comes round behind it, so the order is the one a player
      // feels, animal first and view after. Driving the camera instead put the view somewhere the
      // body had not been yet and left it to catch up, which reads as steering a boat by leaning.
      // It also keeps a creature's own agility in the answer: a Waptia whips round and a giant
      // does not, which is a thing the camera cannot say. The arrow keys still move the view
      // itself, for a hand that wants the old way.
      c.mx = Number(k('KeyD')) - Number(k('KeyA'));
      c.my = Number(k('KeyW')) - Number(k('KeyX'));
      c.lookX = Number(k('ArrowRight')) - Number(k('ArrowLeft'));
      c.lookY = Number(k('ArrowDown')) - Number(k('ArrowUp'));
      // Up and down are a pair on each hand: E or Q lifts, S or C drops. Every attack has a key as
      // well as a mouse button, because a hand already on the keys should not have to reach — J and
      // F bite, G and K are the heavy.
      c.burst = k('ShiftLeft') ? 1 : 0;
      c.rise = k('KeyE') || k('KeyQ'); c.sink = k('KeyS') || k('KeyC');
      c.light = k('KeyF') || k('KeyJ'); c.heavy = k('KeyG') || k('KeyK');
      c.ability = k('KeyZ'); c.dodge = k('Space'); c.dash = k('Space'); c.guard = k('KeyR'); c.lock = k('Tab'); c.aim = k('Tab'); c.sense = k('KeyI');
      if (k('PageUp') || k('PageDown')) { c.rsClick = true; c.lookY = k('PageUp') ? -1 : 1; }
      c.teleport = k('KeyT'); c.view = k('KeyV');
      c.menu = k('Escape'); c.confirm = k('Enter') || k('Space'); c.back = k('Backspace');
      c.dleft = k('ArrowLeft'); c.dright = k('ArrowRight'); c.dup = k('ArrowUp'); c.ddown = k('ArrowDown');
    } else {
      c.mx = Number(k('KeyL')) - Number(k('KeyJ')); c.my = Number(k('KeyI')) - Number(k('KeyK'));
      c.burst = k('ShiftRight') ? 1 : 0; c.rise = k('KeyN'); c.sink = k('KeyM');
      c.light = k('Semicolon'); c.heavy = k('Quote'); c.ability = k('KeyP'); c.dodge = k('Slash'); c.dash = k('Slash'); c.guard = k('KeyU'); c.lock = k('KeyO'); c.aim = k('KeyO'); c.sense = k('KeyY');
      c.teleport = k('KeyH'); c.view = k('Comma');
      c.confirm = k('Enter'); c.back = k('Backspace');
      c.dleft = k('KeyJ'); c.dright = k('KeyL'); c.dup = k('KeyI'); c.ddown = k('KeyK');
    }
    c.any = c.anyButton = this.keys.size > 0;
    return c;
  }
  endFrame() { this.pressedThisFrame.clear(); this.anyPress = false; }
  dispose() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}

export const gamepads = () => Array.from(navigator.getGamepads?.() ?? []).filter((g): g is Gamepad => !!g && g.connected);

export function rumble(index: number, strong: number, weak: number, ms: number) {
  const gp = navigator.getGamepads?.()[index];
  const act = (gp as any)?.vibrationActuator;
  if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
}

/**
 * Mouse and keyboard, for a session with no controller in it.
 *
 * **The pointer is not taken while it is pointing.** It used to be for the whole match: pointer
 * lock, the mouse turning the camera, the cursor gone. That is a shooter's scheme and the thing a
 * player wants to point at here is an *animal*, so the cursor stays, the camera follows the body by
 * itself (`followCam` in the engine), and the creature under the cursor is the one attacks go to.
 *
 * The left button is read by **what it was pressed on**, and acts at the press: open water is a
 * dash there, an animal is a bite, a pounce or a chase by how far off it is. Held past the move it
 * began, it is **steering** — the pointer is locked away and the mouse turns the body and the view
 * together until the button comes up. The decision is `stepStrike` in `src/shared/mouse-strike.ts`,
 * pure; this class only reports the button and the motion, and takes the pointer when told to
 * (`steer`).
 *
 * The right button dashes at whatever is under the cursor, for as long as it is held. The middle
 * button is aim mode's framing, and dragging with it turns the view.
 *
 * `ndc` is the cursor in normalised device coordinates (-1..1, y up), which is what a camera
 * unprojects; it is `undefined` until the mouse has been somewhere over the canvas. While the
 * pointer is locked it stays where the press was, which is where the cursor comes back.
 */
export class MousePlay {
  /** Radians of camera per pixel of drag. Multiplied by the player's camera-speed setting. */
  static readonly SENSITIVITY = 0.0042;
  /** Wheel notches to zoom exponent; a notch is ~100 in `deltaY` on most mice. */
  static readonly WHEEL = 0.0011;

  private el: HTMLElement | null = null;
  private buttons = new Set<number>();
  private dx = 0; private dy = 0; private wheel = 0;
  private wanted = false;
  /** Where the cursor is, in NDC. Undefined until it has been over the canvas. */
  private ndc: { x: number; y: number } | undefined;
  /** The left button went down since the last read. */
  private pressed = false;
  /** Whether the mouse is steering, as `steer` was last told. */
  private steering = false;
  /** Whether the cursor is over something worth attacking. Written by the engine each frame. */
  private overTarget = false;
  /** Whether the pointer is currently locked to the canvas for steering. */
  locked = false;
  onLost: (() => void) | null = null;

  private onMove = (e: MouseEvent) => {
    const el = this.el;
    if (el && !this.locked) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        this.ndc = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
      }
    }
    // Only steering and a middle-button drag turn the view. A bare move is the cursor going
    // somewhere, which is aiming rather than looking.
    if (this.steering || this.buttons.has(1)) { this.dx += e.movementX ?? 0; this.dy += e.movementY ?? 0; }
  };
  private onWheel = (e: WheelEvent) => {
    if (!this.wanted) return;
    e.preventDefault();
    // A trackpad reports pixels and a wheel reports lines; normalise before scaling.
    this.wheel += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  };
  private onDown = (e: MouseEvent) => {
    if (!this.wanted) return;
    e.preventDefault();
    this.buttons.add(e.button);
    if (e.button === 0) this.pressed = true;
  };
  private onUp = (e: MouseEvent) => {
    this.buttons.delete(e.button);
    if (e.button === 0) this.steer(false);
  };
  private onContext = (e: Event) => { if (this.wanted) e.preventDefault(); };
  private onBlur = () => { this.buttons.clear(); this.steer(false); };
  private onLockChange = () => {
    this.locked = !!this.el && document.pointerLockElement === this.el;
  };

  attach(el: HTMLElement) {
    this.el = el;
    el.addEventListener('mousedown', this.onDown);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onContext);
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('pointerlockchange', this.onLockChange);
  }

  /** Tell the mouse whether the cursor is over a creature. Cheap, and called every frame. */
  aimingAt(on: boolean) { this.overTarget = on; }
  /** Whether the cursor was over a creature when the engine last looked. */
  get over() { return this.overTarget; }

  /**
   * Put the pointer away for steering, or give it back. Locked, the mouse can turn the view as far
   * as the hand goes rather than stopping at the edge of the screen; where the browser will not
   * lock (no recent gesture, a harness) the cursor is hidden by the engine instead and steering
   * still works up to the screen's edge. Given back, the cursor reappears where the press was.
   */
  steer(on: boolean) {
    if (this.steering === on) return;
    this.steering = on;
    const el = this.el;
    if (!el) return;
    try {
      if (on && document.pointerLockElement !== el) {
        const r = el.requestPointerLock?.() as unknown;
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => { /* stays unlocked: hidden instead */ });
      } else if (!on && document.pointerLockElement === el) document.exitPointerLock?.();
    } catch { /* stays unlocked */ }
  }

  /** Whether the mouse is playing the game. */
  want(on: boolean) {
    if (this.wanted === on) return;
    this.wanted = on;
    if (!on) { this.buttons.clear(); this.pressed = false; this.steer(false); this.dx = this.dy = this.wheel = 0; }
  }

  /** Everything the mouse has done since the last frame. Drains the deltas and the press. */
  read() {
    const r = {
      dx: this.dx * MousePlay.SENSITIVITY, dy: this.dy * MousePlay.SENSITIVITY,
      zoom: this.wheel * MousePlay.WHEEL,
      /** The left button is down. */
      left: this.buttons.has(0),
      /** The left button went down since the last frame: a strike starts (`stepStrike`). */
      pressed: this.pressed,
      /** Turning the camera this frame (steering, or a middle drag), so the follow stands aside. */
      dragging: this.steering || this.buttons.has(1),
      steering: this.steering,
      middle: this.buttons.has(1), right: this.buttons.has(2),
      ndc: this.ndc,
    };
    this.dx = this.dy = this.wheel = 0; this.pressed = false;
    return r;
  }

  dispose() {
    this.want(false);
    const el = this.el;
    if (el) {
      el.removeEventListener('mousedown', this.onDown);
      el.removeEventListener('wheel', this.onWheel);
      el.removeEventListener('contextmenu', this.onContext);
    }
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    this.el = null;
  }
}

/**
 * Fold a frame of mouse into the controls. The left button is not here: what it does depends on
 * what it was pressed on and on the body, so `PlayerInput` decides it (`stepStrike`) with both in
 * hand. What is here is what never depends on either.
 */
export function applyMouse(c: RawControls, m: ReturnType<MousePlay['read']>): RawControls {
  c.lookDX = m.dx; c.lookDY = m.dy; c.zoomDelta = m.zoom;
  if (m.right) { c.dash = true; c.dodge = true; }
  if (m.middle) { c.aim = true; c.lock = true; }
  if (m.pressed || m.middle || m.right) c.any = c.anyButton = true;
  return c;
}
