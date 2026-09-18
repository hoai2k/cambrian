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
      // **A and D turn; they do not strafe.** The left hand steers the animal the way the right
      // stick would, so the camera's yaw is what they move — which means turning composes with
      // swimming rather than replacing it: hold W and press D and the body swims forward along a
      // curve, because `mx`/`my` are camera-relative and the camera is what turned. The arrow keys
      // still do it too, for a hand that wants them.
      c.my = Number(k('KeyW')) - Number(k('KeyX'));
      c.lookX = Number(k('KeyD')) - Number(k('KeyA')) + Number(k('ArrowRight')) - Number(k('ArrowLeft'));
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
 * **The pointer is not taken.** It used to be: pointer lock, the mouse turning the camera, and the
 * cursor gone for the match. That is the right scheme for a shooter and the wrong one for this —
 * the thing a player wants to point at here is an *animal*, and a locked pointer can only ever
 * point at the middle of the screen. So the cursor stays, the camera follows the body by itself
 * (`followCam` in the engine), and the mouse is what aims: the creature under it is the one your
 * attacks go to, and the water under it is where a dash goes.
 *
 * One button, three meanings, told apart the way every drawing program tells them apart:
 *   - a **click** — pressed and released without travelling — is a bite, and it fires on the
 *     *release*, because until the button comes up it is not yet known to be a click;
 *   - a **hold** past `HOLD` is the heavy: the pounce, the special, whatever that animal's RT does;
 *   - a **drag** past `DRAG` is the camera, and it cancels the attack. Moving the mouse is how you
 *     look around, so a press that turned into a movement was never an attack.
 *
 * The right button dashes at whatever is under the cursor, for as long as it is held (the dash is
 * as long as it is held). The middle button is aim mode, as it was.
 *
 * `ndc` is the cursor in normalised device coordinates (-1..1, y up), which is what a camera
 * unprojects; it is `undefined` until the mouse has been somewhere over the canvas.
 */
export class MousePlay {
  /** Radians of camera per pixel of drag. Multiplied by the player's camera-speed setting. */
  static readonly SENSITIVITY = 0.0042;
  /** Wheel notches to zoom exponent; a notch is ~100 in `deltaY` on most mice. */
  static readonly WHEEL = 0.0011;
  /** Pixels of travel that turn a press into a camera drag rather than an attack. */
  static readonly DRAG = 6;
  /** Seconds a press must be held to be the heavy rather than a bite. */
  static readonly HOLD = 0.18;

  private el: HTMLElement | null = null;
  private buttons = new Set<number>();
  private dx = 0; private dy = 0; private wheel = 0;
  private wanted = false;
  /** Where the cursor is, in NDC. Undefined until it has been over the canvas. */
  private ndc: { x: number; y: number } | undefined;
  /** The left press in progress: when it started, how far it has travelled, what it became. */
  private press: { t: number; moved: number; dragging: boolean; targeted: boolean } | undefined;
  /** A completed click, waiting to be read as one bite. */
  private clicked = false;
  /**
   * Whether the cursor is over something worth attacking. Written by the engine each frame (it is
   * the only thing that knows), and read on the next press: see `onDown`.
   */
  private overTarget = false;
  /** Kept for the engine's benefit: nothing is locked, so nothing is ever lost. */
  locked = false;
  onLost: (() => void) | null = null;

  private onMove = (e: MouseEvent) => {
    const el = this.el;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        this.ndc = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
      }
    }
    const mx = e.movementX ?? 0, my = e.movementY ?? 0;
    const p = this.press;
    if (p) {
      p.moved += Math.hypot(mx, my);
      // Past the threshold the press is a camera drag, and stays one until the button comes up.
      if (!p.dragging && p.moved > MousePlay.DRAG) p.dragging = true;
    }
    // Only a drag turns the camera. A bare mouse move is the cursor going somewhere, which is
    // aiming rather than looking — that is the whole difference between this and pointer lock.
    if (p?.dragging || this.buttons.has(1)) { this.dx += mx; this.dy += my; }
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
    // A press with **nothing under the cursor** is the camera from the first pixel. There is no
    // attack to make out there, so waiting `DRAG` pixels to find that out only costs the player the
    // start of the movement — and the whole point of a left button that both attacks and looks is
    // that it is never ambiguous about which. Over an animal, it is the attack until it travels.
    if (e.button === 0) this.press = { t: performance.now() / 1000, moved: 0, dragging: !this.overTarget, targeted: this.overTarget };
  };
  private onUp = (e: MouseEvent) => {
    this.buttons.delete(e.button);
    if (e.button !== 0) return;
    const p = this.press; this.press = undefined;
    // A click is a click wherever it lands: pressed and let go without *travelling*, which is the
    // test whether or not there was anything under it. Biting at the water ahead of you is a real
    // move — it is how you attack something you have not pointed at — so the bite is never taken
    // away, only the heavy is. It is read once, on the frame after the release, because a bite is
    // an edge and not a state.
    if (p && p.moved <= MousePlay.DRAG && performance.now() / 1000 - p.t < MousePlay.HOLD) this.clicked = true;
  };
  private onContext = (e: Event) => { if (this.wanted) e.preventDefault(); };
  private onBlur = () => { this.buttons.clear(); this.press = undefined; };

  attach(el: HTMLElement) {
    this.el = el;
    el.addEventListener('mousedown', this.onDown);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onContext);
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Tell the mouse whether the cursor is over a creature. Cheap, and called every frame. */
  aimingAt(on: boolean) { this.overTarget = on; }

  /** Whether the mouse is playing the game. Nothing is locked either way. */
  want(on: boolean) {
    if (this.wanted === on) return;
    this.wanted = on;
    if (!on) { this.buttons.clear(); this.press = undefined; this.clicked = false; this.dx = this.dy = this.wheel = 0; }
  }

  /** Everything the mouse has done since the last frame. Drains the deltas and the click. */
  read() {
    const p = this.press;
    // A **hold is the heavy only over something**. With nothing under the cursor there is nothing
    // to pounce at, so holding the button there is the camera and only the camera — which is what
    // makes the one button unambiguous: what it does is decided by what you pointed it at.
    const held = !!p && p.targeted && p.moved <= MousePlay.DRAG && performance.now() / 1000 - p.t >= MousePlay.HOLD;
    const r = {
      dx: this.dx * MousePlay.SENSITIVITY, dy: this.dy * MousePlay.SENSITIVITY,
      zoom: this.wheel * MousePlay.WHEEL,
      /** The heavy: the left button held still past `HOLD`. */
      hold: held,
      /** One bite, on the frame after a click was completed. */
      click: this.clicked,
      /** Turning the camera this frame, so the follow camera knows to stand aside. */
      dragging: !!p?.dragging || this.buttons.has(1),
      /** The left button is down on a target and has not travelled: a pounce is winding up. */
      pressing: !!p && p.targeted && p.moved <= MousePlay.DRAG,
      middle: this.buttons.has(1), right: this.buttons.has(2),
      ndc: this.ndc,
    };
    this.dx = this.dy = this.wheel = 0; this.clicked = false;
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
    this.el = null;
  }
}

export function applyMouse(c: RawControls, m: ReturnType<MousePlay['read']>): RawControls {
  c.lookDX = m.dx; c.lookDY = m.dy; c.zoomDelta = m.zoom;
  if (m.click) c.light = true;
  if (m.hold) c.heavy = true;
  if (m.right) { c.dash = true; c.dodge = true; }
  if (m.middle) { c.aim = true; c.lock = true; }
  if (m.click || m.hold || m.middle || m.right) c.any = c.anyButton = true;
  return c;
}
