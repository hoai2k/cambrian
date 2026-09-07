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
    // A sprint · RB rise · LS click sink · X bite · RT pounce · Y hide · LB dash · B guard · LT aim
    burst: b(0) ? 1 : 0, rise: b(5), sink: b(10),
    light: b(2), heavy: v(7) > 0.5, ability: b(3), dodge: b(4), guard: b(1), lock: v(6) > 0.4, sense: b(12),
    dash: b(4), aim: v(6) > 0.4, rsClick: b(11), teleport: b(13),
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
      c.mx = Number(k('KeyD')) - Number(k('KeyA')); c.my = Number(k('KeyW')) - Number(k('KeyS'));
      c.lookX = Number(k('ArrowRight')) - Number(k('ArrowLeft')); c.lookY = Number(k('ArrowDown')) - Number(k('ArrowUp'));
      c.burst = k('ShiftLeft') ? 1 : 0; c.rise = k('Space'); c.sink = k('KeyC');
      c.light = k('KeyF'); c.heavy = k('KeyG'); c.ability = k('KeyR'); c.dodge = k('KeyV'); c.dash = k('KeyV'); c.guard = k('KeyQ'); c.lock = k('Tab'); c.aim = k('Tab'); c.sense = k('KeyE');
      if (k('PageUp') || k('PageDown')) { c.rsClick = true; c.lookY = k('PageUp') ? -1 : 1; }
      c.teleport = k('KeyT'); c.view = k('KeyZ');
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
 * A pad is two thumbsticks: one swims, one looks. A keyboard has only one of those, so a solo
 * player without a pad has been steering the camera with the arrow keys — a rate, not a direction,
 * which is exactly as slow as it sounds. When nobody has plugged a controller in there is no
 * reason to keep the mouse as a pointer, so the game takes it: pointer lock, the mouse turns the
 * camera, the wheel zooms, and the three buttons carry the actions the triggers and bumpers do.
 *
 * Controllers win when there are any. `Engine.startMatch` decides once, at the dive, and the lock
 * follows the match from there: it is released while paused, in a dialog, and back at the menus.
 *
 * Two details the browser forces:
 *   - Pointer lock needs a user gesture, and a request too soon after an exit is rejected outright.
 *     So `want()` only marks the intent; a click on the canvas is what actually takes the lock, and
 *     every request is allowed to fail silently.
 *   - Losing the lock (the player pressed Escape, or alt-tabbed) has to reach the game, or it keeps
 *     playing behind a cursor the player cannot see. `onLost` is how the match learns to pause.
 */
export class MouseLook {
  /** Radians of camera per pixel of mouse. Multiplied by the player's camera-speed setting. */
  static readonly SENSITIVITY = 0.0022;
  /** Wheel notches to zoom exponent; a notch is ~100 in `deltaY` on most mice. */
  static readonly WHEEL = 0.0011;

  private el: HTMLElement | null = null;
  private buttons = new Set<number>();
  private dx = 0; private dy = 0; private wheel = 0;
  private wanted = false;
  /** Whether the pointer is locked right now. Buttons and motion only count while it is. */
  locked = false;
  /** Called when the lock goes away without the game asking. The match should pause. */
  onLost: (() => void) | null = null;

  private onMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.dx += e.movementX ?? 0; this.dy += e.movementY ?? 0;
  };
  private onWheel = (e: WheelEvent) => {
    if (!this.locked) return;
    e.preventDefault();
    // A trackpad reports pixels and a wheel reports lines; normalise before scaling.
    this.wheel += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  };
  private onDown = (e: MouseEvent) => {
    if (!this.wanted) return;
    e.preventDefault();
    // The first click is the gesture that takes the lock, not an attack: a player who clicked back
    // into the window would otherwise pounce at whatever the cursor happened to be over.
    if (!this.locked) { this.request(); return; }
    this.buttons.add(e.button);
  };
  private onUp = (e: MouseEvent) => this.buttons.delete(e.button);
  private onContext = (e: Event) => { if (this.wanted) e.preventDefault(); };
  private onLockChange = () => {
    const was = this.locked;
    this.locked = !!this.el && document.pointerLockElement === this.el;
    if (!this.locked) { this.buttons.clear(); this.dx = this.dy = this.wheel = 0; }
    if (was && !this.locked && this.wanted) this.onLost?.();
  };
  private onBlur = () => this.buttons.clear();

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

  /** Ask for (or give up) the pointer. Safe to call every frame; only edges do anything. */
  want(on: boolean) {
    if (this.wanted === on) return;
    this.wanted = on;
    if (on) this.request();
    else if (this.locked) { try { document.exitPointerLock(); } catch { /* already gone */ } }
  }

  private request() {
    const el = this.el;
    if (!el || this.locked || document.pointerLockElement) return;
    try { void (el.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* no gesture, or too soon after the last exit */ }
  }

  /** Everything the mouse has done since the last frame. Drains the deltas. */
  read() {
    const r = {
      dx: this.dx * MouseLook.SENSITIVITY, dy: this.dy * MouseLook.SENSITIVITY,
      zoom: this.wheel * MouseLook.WHEEL,
      left: this.buttons.has(0), middle: this.buttons.has(1), right: this.buttons.has(2),
    };
    this.dx = this.dy = this.wheel = 0;
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
 * Fold the mouse into keyboard 1's controls. Left click is the heavy (RT), right click dashes
 * (LB) and the middle button aims (LT), so the two actions that need to fire the instant they are
 * wanted sit under the fingers already on the mouse. The keys those actions also live on (G, V,
 * Tab) keep working: the mouse adds to the keyboard, it does not replace it.
 */
export function applyMouse(c: RawControls, m: ReturnType<MouseLook['read']>): RawControls {
  c.lookDX = m.dx; c.lookDY = m.dy; c.zoomDelta = m.zoom;
  if (m.left) c.heavy = true;
  if (m.right) { c.dash = true; c.dodge = true; }
  if (m.middle) { c.aim = true; c.lock = true; }
  if (m.left || m.middle || m.right) c.any = c.anyButton = true;
  return c;
}
