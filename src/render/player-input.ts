/**
 * What each seat is asking for, turned into the simulation's `InputFrame`.
 *
 * The devices are read here (keyboard, mouse, fingers, pads), folded into one `RawControls` per
 * seat, and translated against that seat's camera: forward is camera-relative, and on a mouse or a
 * finger the pointer is the crosshair, so the animal under it is the one the attacks go to
 * (`updateAim`). The travel menu that swallows a seat's controls while it is open lives here too.
 * The engine owns one of these and asks it once per seat per frame.
 */
import * as THREE from 'three';
import { audio } from '../audio/audio';
import { applyMouse, emptyControls, KeyboardInput, MousePlay, readGamepad, type RawControls } from '../input/input';
import { applyTouch, TouchPlay } from '../input/touch';
import { Edges } from '../shared/edges';
import { clamp, damp, wrapAngle } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from '../sim/actors';
import type { Game } from '../sim/game';
import { emptyInput, type Actor, type InputFrame, type PlayerSetup } from '../sim/types';
import { PITCH_DOWN, PITCH_UP, swimPitch, type CamState } from './camera';
import { ensureLoaded } from './creature';

/**
 * The D-pad-down menu. A list of places to go, plus one entry that opens a second page: the roster,
 * to change which animal you are. `swap` is that page — the index into `Game.swapOptions` and
 * whether a creature you have never worn would hatch grown or newborn.
 */
export interface TeleMenu {
  open: boolean; index: number;
  swap: { open: boolean; index: number; grown: boolean };
  edges: Edges;
}
export const freshTele = (): TeleMenu => ({ open: false, index: 0, swap: { open: false, index: 0, grown: false }, edges: new Edges() });

/**
 * The teleport menu. D-pad down opens it (and closes it again); up/down or the left stick move
 * the cursor; A goes; B backs out. Returns whether the menu is open, in which case the player's
 * other controls are swallowed for the frame.
 */
export function updateTeleMenu(game: Game, i: number, c: RawControls, t: TeleMenu | undefined): boolean {
  if (!t) return false;
  const edges = t.edges;
  const p = game.players[i];
  // One list, not two: `Edges` remembers what it was handed, so a control cannot be added to the
  // reading and forgotten in the remembering — which used to leave that button held forever.
  const { teleport: justTele, up: justUp, down: justDown, left: justLeft, right: justRight,
          confirm: justConfirm, back: justBack, ability: justAbility } = edges.step({
    teleport: c.teleport,
    up: c.dup || c.my > 0.6, down: c.ddown || c.my < -0.6,
    left: c.dleft || c.mx < -0.6, right: c.dright || c.mx > 0.6,
    confirm: c.confirm, back: c.back, ability: c.ability,
  });
  if (justTele && !t.open) {
    // D-pad down opens it; once open the same button steps down the list
    if (isAlive(p) && (p.state === 'free' || p.state === 'guard')) { t.open = true; t.index = 0; t.swap.open = false; edges.hold('confirm', 'down'); audio.play('ui-confirm'); }
    return t.open;
  }
  if (!t.open) return false;
  if (!isAlive(p)) { t.open = false; t.swap.open = false; return false; }

  // ---- the change-creature page ----
  if (t.swap.open) {
    const roster = game.swapOptions(i, t.swap.grown);
    if (!roster.length) { t.swap.open = false; return true; }
    const step = (d: number) => { t.swap.index = (t.swap.index + d + roster.length) % roster.length; audio.play('ui-move'); };
    if (justRight) step(1);
    if (justLeft) step(-1);
    // Y flips how an animal you have never worn would arrive. One you have is handed back as you
    // left it either way, so the flip is a preview of a fresh start, not of your own progress.
    if (justAbility) { t.swap.grown = !t.swap.grown; audio.play('ui-move'); }
    if (justBack) { t.swap.open = false; audio.play('ui-back'); return true; }
    if (justConfirm) {
      const pick = roster[t.swap.index];
      if (pick && !pick.current && game.changeCreature(i, pick.id, t.swap.grown)) { t.open = false; t.swap.open = false; audio.play('ui-start'); return false; }
      audio.play('ui-back');
      return true;
    }
    // Browsing loads the body you are looking at, so committing to it is not a wait.
    const ahead = roster[t.swap.index];
    if (ahead) void ensureLoaded(ahead.id, undefined, 0);
    return true;
  }

  const options = game.teleportOptions(i);
  // One entry past the destinations opens the roster instead of going anywhere.
  const count = options.length + 1;
  if (justUp) { t.index = (t.index + count - 1) % count; audio.play('ui-move'); }
  if (justDown || justTele) { t.index = (t.index + 1) % count; audio.play('ui-move'); }
  if (justBack) { t.open = false; audio.play('ui-back'); return false; }
  if (justConfirm) {
    if (t.index >= options.length) {
      t.swap.open = true; t.swap.index = 0; t.swap.grown = false;
      audio.play('ui-confirm');
      return true;
    }
    const opt = options[t.index];
    if (opt && game.teleport(i, opt.dest)) { t.open = false; audio.play('ui-start'); }
    else audio.play('ui-back');
    return t.open;
  }
  return true;
}

/** The devices, what they did this frame, and the translation into the simulation's input. */
export class PlayerInput {
  readonly keyboard = new KeyboardInput();
  readonly mouse = new MousePlay();
  readonly touch = new TouchPlay();
  /**
   * Whether the mouse is steering the camera. Decided once per match, at `startMatch`: with no
   * controller anywhere the game is a mouse-and-keyboard game, and with even one pad in the
   * session the pads own it and the mouse stays a pointer.
   */
  mouseLook = false;
  /** What the mouse did this frame, kept between `controlsFor` and the camera. */
  mouseFrame: ReturnType<MousePlay['read']> | undefined;
  /**
   * Whether a finger is playing this match: true when a seat joined on `'touch'`. Kept apart from
   * `mouseLook` rather than folded into it, because the two schemes want *different* halves of what
   * that flag gates. Both want the follow camera, since neither has a second stick to steer the view
   * with. Only the mouse wants the CSS cursor and the reticle switched off, because only the mouse
   * has a crosshair on screen at all times — a finger is usually not touching the glass, so touch
   * keeps the reticle and moves it to wherever the last tap was.
   */
  touchPlay = false;
  /** What the fingers did this frame, kept between `controlsFor` and the camera, as the mouse's is. */
  touchFrame: ReturnType<TouchPlay['read']> | undefined;
  /** A held double gesture keeps its original animal even after it leaves the pointer. */
  readonly pursuitTargets = new Map<number, number>();
  /** Scratch for the ray from the camera through the cursor. */
  private tmpRay = new THREE.Vector3();
  private tmpV = new THREE.Vector3(); private tmpDesired = new THREE.Vector3();

  controlsFor(setup: PlayerSetup, index: number): RawControls {
    if (setup.device === 'touch') {
      // The keyboard is read underneath the fingers rather than instead of them. A tablet with a
      // keyboard case is still a tablet, and a player who has one should not have to choose. Sense
      // is the exception: it stays on for touch play even if the keyboard has a Sense key.
      const c = this.keyboard.read(1);
      // One read per frame, for the mouse's reason: `read()` drains the swipes and the taps, so the
      // frame holds on to them for the camera and the aim after the controls have been folded.
      // Unscaled by the camera-speed setting on purpose: the engine applies `lookSpeed` to
      // `lookDX`/`lookDY` below, exactly as it does for the mouse, and scaling here as well would
      // square it.
      this.touchFrame = this.touch.read();
      c.sense = false;
      return applyTouch(c, this.touchFrame);
    }
    if (setup.device === 'keyboard') {
      const c = this.keyboard.read(1);
      if (!this.mouseLook) return c;
      // One read per frame: `read()` drains the deltas and the click, so the frame keeps it for
      // the camera and the aim to use after the controls have been folded.
      this.mouseFrame = this.mouse.read();
      return applyMouse(c, this.mouseFrame);
    }
    if (setup.device === 'keyboard2') return this.keyboard.read(2);
    if (typeof setup.device !== 'number') return emptyControls();
    const gp = navigator.getGamepads?.()[setup.device];
    if (!gp || !gp.connected) return emptyControls();
    void index;
    return readGamepad(gp);
  }

  toInput(c: RawControls, cs: CamState, a: Actor, game: Game | undefined, setups: readonly PlayerSetup[]): InputFrame {
    const f = emptyInput();
    f.mx = c.mx; f.my = c.my; f.lookX = c.lookX; f.lookY = c.lookY;
    const fwd = this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    f.camYaw = Math.atan2(fwd.x, fwd.z);
    f.camPitch = swimPitch(-Math.asin(clamp(fwd.y, -1, 1)));
    f.burst = c.burst; f.dash = c.dash; f.touchDash = setups[a.player]?.device === 'touch' && !!this.touchFrame?.dash;
    f.rise = c.rise; f.sink = c.sink;
    f.light = c.light; f.heavy = c.heavy; f.ability = c.ability; f.dodge = c.dodge; f.guard = c.guard; f.lock = c.lock; f.sense = c.sense;
    f.aim = c.aim; f.aimTarget = c.aim ? cs.aimTarget : -1;
    // On a mouse the cursor is the crosshair, so the animal under it is the one the attacks go to.
    // `aim` is set on the *frame* and not on the camera: the simulation's idea of aiming is "this
    // is the body I mean", which is exactly true here, while the over-the-shoulder framing is a
    // separate thing the middle button asks for (`updateAim` still blends on `c.aim`).
    const cursor = this.cursorDir(cs);
    if (cursor) { f.aim = true; f.aimTarget = cs.aimTarget; }
    const touchPursuit = setups[a.player]?.device === 'touch';
    if (touchPursuit) {
      if (this.touchFrame?.pursuitStart) { this.pursuitTargets.set(a.player, this.touchFrame.pursuitTargetId ?? cs.aimTarget); a.pursuit = undefined; }
      else if (this.pursuitTargets.get(a.player) === -1 && (this.touchFrame?.bites || !this.touchFrame?.ndc)) this.pursuitTargets.delete(a.player);
    } else if (this.mouseLook && this.mouseFrame?.pursue) {
      if (!this.pursuitTargets.has(a.player)) this.pursuitTargets.set(a.player, cs.aimTarget);
    } else this.pursuitTargets.delete(a.player);
    if (this.pursuitTargets.has(a.player)) {
      const target = this.pursuitTargets.get(a.player) ?? -1;
      const victim = target >= 0 ? game?.byId(target) : undefined;
      if ((a.pursuit?.target === target && a.pursuit.spent) || !isAlive(a) || !victim || !isAlive(victim) || isHidden(victim)) this.pursuitTargets.set(a.player, -1);
      else { f.pursueTarget = target; f.pursueDash = touchPursuit; f.aim = true; f.aimTarget = target; }
    }
    // The right button — or a double-tap on the water — dashes at what is being pointed at: the dash
    // takes its direction from the stick through the camera, so for those frames the camera's forward
    // *is* the pointing ray and a neutral stick is pushed forward along it. Held, the body keeps
    // going that way, which is what a dash as long as it is held should do. A finger is the same
    // gesture with the same answer, and re-aims as it moves.
    if (cursor && (this.mouseFrame?.right || this.touchFrame?.dash)) {
      f.camYaw = Math.atan2(cursor.x, cursor.z);
      f.camPitch = swimPitch(-Math.asin(clamp(cursor.y, -1, 1)));
      if (Math.hypot(f.mx, f.my) < 0.3) { f.mx = 0; f.my = 1; }
    }
    void a;
    return f;
  }

  /**
   * The direction the cursor points, in the world: the camera's own ray through that pixel.
   *
   * This is what "aim with the mouse" means with no pointer lock — the crosshair is wherever the
   * cursor is, not the middle of the screen — so it is what the aim picks a target along and what
   * a right-button dash goes down. Undefined when the mouse is not playing or has not moved yet,
   * and every caller then falls back to the way it worked before.
   */
  cursorDir(cs: CamState, point?: { x: number; y: number }): THREE.Vector3 | undefined {
    // Either pointer will do, because the rule is about pointing rather than about hardware:
    // whatever the player has aimed at is what the attacks go to. The mouse's cursor is always
    // somewhere; a finger's aim point lapses a moment after the hand comes off the glass, and then
    // there is nothing pointing and aiming goes back to the middle of the screen.
    const ndc = point ?? this.mouseFrame?.ndc ?? this.touchFrame?.ndc;
    if ((!this.mouseLook && !this.touchPlay) || !ndc) return undefined;
    return this.tmpRay.set(ndc.x, ndc.y, 0.5).unproject(cs.camera).sub(cs.camera.position).normalize();
  }

  /**
   * What is where the player is pointing: nothing, something edible, or a fight.
   *
   * The size band, the same one every other readout in the game uses. Both pointing schemes want
   * this and want it for the same reason — it is what decides whether the *next* press or tap is an
   * attack or a look — so it is asked once here rather than twice in two places that could drift
   * apart.
   */
  pointingAt(game: Game, p: Actor | undefined, cs: CamState): 'none' | 'edible' | 'attack' {
    const t = p && cs.aimTarget >= 0 ? game.byId(cs.aimTarget) : undefined;
    const band = t && p && isAlive(t) ? bandOf(p, t) : undefined;
    return !band ? 'none' : band === 'snack' || band === 'prey' ? 'edible' : 'attack';
  }

  /**
   * Aim mode. The crosshair is the screen centre; whatever prey it is over (nearest to the camera
   * forward ray, inside range) becomes the target. Entering aim snaps the camera onto the best
   * candidate once, the way a console aim-assist does; after that the right stick steers freely.
   */
  /**
   * Who the aim button is pointing at: whatever sits closest to the camera's forward axis, inside a
   * cone that is wide on entry (the snap) and tight afterwards.
   *
   * The axis *is* the middle of the viewport, and the crosshair is drawn there (`.aim`, at
   * left/top 50%). That equivalence is the contract that lets sense off take the crosshair away
   * with nothing lost: with no reticle drawn, the centre of the camera is the implied aim point,
   * and it is the real one. Anything that moves the crosshair off centre, or picks a target from
   * somewhere other than `fwd`, breaks the immersive view as well as the readout.
   */
  updateAim(cs: CamState, p: Actor | undefined, game: Game | undefined, aiming: boolean, dt: number, point?: { x: number; y: number }) {
    if (!p || !game) { cs.aimBlend = 0; cs.aimTarget = -1; return; }
    const wasAiming = cs.aimBlend > 0.5 || cs.aimSnapT > 0;
    cs.aimBlend = damp(cs.aimBlend, aiming ? 1 : 0, 9, dt);
    // On a mouse the crosshair is the cursor, so a target is picked every frame whether or not aim
    // mode's framing is on: pointing at an animal *is* aiming at it, and the camera shift is a
    // separate thing the middle button asks for.
    const cursor = this.cursorDir(cs, point);
    if (!aiming && !cursor) { cs.aimTarget = -1; cs.aimSnapT = 0; return; }
    const L = lengthOf(p);
    const range = game.pounceRange(p) * 2.4;
    const fwd = cursor ? this.tmpV.copy(cursor) : this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    let best: Actor | undefined; let bestAng = Infinity;
    for (const o of game.nearby(p.pos, range)) {
      if (o.id === p.id || !isAlive(o) || isHidden(o)) continue;
      const band = bandOf(p, o);
      // Anything the crosshair is over. The threat and giant bands used to be skipped outright,
      // which meant a player holding the crosshair squarely on something their own size or larger
      // was told there was nothing there — and what you do about a big animal (ride it, take hold
      // of it, pounce at it) is exactly what aiming is for.
      //
      // Another player can be aimed at, but never *handed* to you: the entry snap, which happens
      // on the frame aim mode comes on and picks a target without the player having pointed at
      // anything, ignores them. Once the crosshair is being held, it is being held on purpose.
      const rival = o.controller === 'player';
      const entrySnap = aiming && !wasAiming && !cursor;
      if (rival && entrySnap) continue;
      const to = this.tmpDesired.set(o.pos.x - cs.camera.position.x, o.pos.y - cs.camera.position.y, o.pos.z - cs.camera.position.z);
      const d = to.length(); if (d < 0.01) continue;
      to.divideScalar(d);
      // angular distance from the crosshair, widened slightly for close/large targets
      const ang = Math.acos(clamp(fwd.dot(to), -1, 1)) - Math.min(0.08, lengthOf(o) * 0.5 / d);
      // The entry snap is the game choosing for you, so it leans toward what you probably meant:
      // food ahead of a fight, and never another player. A crosshair being held is not choosing for
      // you at all, so it ranks on pure angle — whatever is nearest the point of the cursor.
      const bandW = entrySnap ? (rival ? 2.4 : band === 'prey' ? 0.85 : band === 'snack' ? 1 : 1.25) : 1;
      if (ang * bandW < bestAng) { bestAng = ang * bandW; best = o; }
    }
    // A cursor gets one cone and no snap: the player is already pointing, and easing the camera
    // onto a target would fight the hand that is holding the mouse.
    const cone = cursor ? 0.12 : cs.aimSnapT > 0 || !wasAiming ? 0.6 : 0.2;
    if (best && bestAng < cone) {
      cs.aimTarget = best.id;
      if (!wasAiming && !cursor) cs.aimSnapT = 0.25;
      if (cs.aimSnapT > 0 && !cursor) {
        // ease the camera onto the target
        const dx = best.pos.x - cs.camera.position.x, dy = best.pos.y - cs.camera.position.y, dz = best.pos.z - cs.camera.position.z;
        const ty = Math.atan2(dx, dz), tp = clamp(Math.atan2(-dy, Math.hypot(dx, dz)) + 0.12, PITCH_UP, PITCH_DOWN);
        const k = 1 - Math.exp(-14 * dt);
        cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * k);
        cs.pitch += (tp - cs.pitch) * k;
        cs.aimSnapT -= dt;
      }
    } else { cs.aimTarget = -1; if (!wasAiming) cs.aimSnapT = 0; }
  }
}
