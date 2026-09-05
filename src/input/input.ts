/** Raw per-device controls, before camera-relative conversion. */
export interface RawControls {
  mx: number; my: number; lookX: number; lookY: number;
  burst: number; rise: boolean; sink: boolean;
  light: boolean; heavy: boolean; ability: boolean; dodge: boolean; guard: boolean; lock: boolean; sense: boolean;
  menu: boolean; view: boolean; confirm: boolean; back: boolean;
  dleft: boolean; dright: boolean; dup: boolean; ddown: boolean;
  any: boolean;
}

export const emptyControls = (): RawControls => ({
  mx: 0, my: 0, lookX: 0, lookY: 0, burst: 0, rise: false, sink: false,
  light: false, heavy: false, ability: false, dodge: false, guard: false, lock: false, sense: false,
  menu: false, view: false, confirm: false, back: false, dleft: false, dright: false, dup: false, ddown: false, any: false,
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
    mx, my: -my, lookX: lx, lookY: ly,
    burst: v(7), rise: b(0), sink: b(10),
    light: b(5), heavy: b(2), ability: b(3), dodge: b(1), guard: b(4), lock: v(6) > 0.4, sense: b(12),
    menu: b(9), view: b(8), confirm: b(0), back: b(1),
    dleft: b(14), dright: b(15), dup: b(12), ddown: b(13),
    any: false,
  };
  c.any = gp.buttons.some((x) => x.pressed) || Math.hypot(mx, my) > 0.5;
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
      c.light = k('KeyF'); c.heavy = k('KeyG'); c.ability = k('KeyR'); c.dodge = k('KeyV'); c.guard = k('KeyQ'); c.lock = k('Tab'); c.sense = k('KeyE');
      c.menu = k('Escape'); c.confirm = k('Enter') || k('Space'); c.back = k('Backspace');
      c.dleft = k('ArrowLeft'); c.dright = k('ArrowRight'); c.dup = k('ArrowUp'); c.ddown = k('ArrowDown');
    } else {
      c.mx = Number(k('KeyL')) - Number(k('KeyJ')); c.my = Number(k('KeyI')) - Number(k('KeyK'));
      c.burst = k('ShiftRight') ? 1 : 0; c.rise = k('KeyN'); c.sink = k('KeyM');
      c.light = k('Semicolon'); c.heavy = k('Quote'); c.ability = k('KeyP'); c.dodge = k('Slash'); c.guard = k('KeyU'); c.lock = k('KeyO'); c.sense = k('KeyY');
      c.confirm = k('Enter'); c.back = k('Backspace');
      c.dleft = k('KeyJ'); c.dright = k('KeyL'); c.dup = k('KeyI'); c.ddown = k('KeyK');
    }
    c.any = this.keys.size > 0;
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
