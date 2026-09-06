import * as THREE from 'three';
import { audio } from '../audio/audio';
import { distanceAtten } from '../audio/mix';
import { emptyControls, gamepads, KeyboardInput, readGamepad, rumble, type RawControls } from '../input/input';
import { clamp, damp, TAU, wrapAngle } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from '../sim/actors';
import { creature, type CreatureId } from '../sim/creatures';
import { Game, type TeleportDest } from '../sim/game';
import { BAND_COLOR, emptyInput, TIER_NAMES, TIER_NEED, type Actor, type Band, type InputFrame, type Mode, type PlayerSetup } from '../sim/types';
import { BIOME_NAMES, biomeAt, groundHeight, nurseryAt, resolveStatic, SURFACE_Y, type Boulder } from '../sim/world';
import { AssetQueue, type AssetProgress } from './assets';
import { CreatureView, ensureLoaded, loadedSync, type Lod } from './creature';
import { Attachments } from './attachments';
import { Bubbles, Impacts, Silt } from './fx';
import { createSea, type Quality, type SeaEnvironment } from './sea';

export interface Rect { x: number; y: number; w: number; h: number; }
export interface PlayerHud {
  index: number; creature: CreatureId; color: string; alive: boolean;
  hp: number; hpMax: number; stamina: number; staminaMax: number; exhausted: boolean;
  tier: number; tierName: string; progress: number; scale: number;
  abilityName: string; abilityReady: number; abilityActive: boolean; abilityUnlocked: boolean;
  senseReady: number;
  lock?: { name: string; band: Band; hp: number; color: string };
  aim?: { hasTarget: boolean; inRange: boolean; name?: string; color: string; ready: boolean };
  hunted: number; hunterAngle: number | null; hunterName?: string; hunterState: 'none' | 'noticed' | 'hunting'; inCover: boolean; still: boolean;
  hint?: string; respawnIn: number; fade: number; state: string; modelReady: boolean; kills: number; eats: number; escapes: number; protect: boolean;
  bandMarkers: { x: number; y: number; band: Band; size: number }[];
  /** Dominant biome under the player. */
  biome: string;
  /** Radar contacts in radar space (x right, y down, unit circle = the radar's reach); `beyond` contacts are clamped to the rim. */
  radar: { range: number; blips: RadarBlipHud[] };
  /** The teleport menu, while open. */
  teleport?: { options: { label: string; detail: string; distance: number; dest: TeleportDest }[]; index: number; cooldown: number };
}
export interface RadarBlipHud { x: number; y: number; kind: 'player' | 'threat' | 'giant' | 'home' | 'shore'; color: string; beyond: boolean; hunting: boolean; distance: number; }
export interface HudSnapshot {
  players: PlayerHud[]; rects: Rect[]; time: number; status: 'playing' | 'won' | 'lost'; message: string; mode: Mode; winner: number; fps: number;
}
export interface EngineCallbacks {
  onHud(s: HudSnapshot): void;
  onMenu(player: number): void;
  onError(msg: string): void;
  onLoaded(): void;
  onProgress?(p: AssetProgress): void;
}

export const PLAYER_COLORS = ['#61f2d5', '#ffb457', '#c7a3ff', '#ff86a4'];

interface CamState { yaw: number; pitch: number; zoom: number; fade: number; aimBlend: number; aimTarget: number; aimSnapT: number; pos: THREE.Vector3; look: THREE.Vector3; shake: number; camera: THREE.PerspectiveCamera; lockBlend: number; lastPos: THREE.Vector3; frustum: THREE.Frustum; projScreen: THREE.Matrix4; tele: TeleMenu; }
/** Per-player teleport menu state: opened with D-pad down, steered with the D-pad or stick, A confirms, B closes. */
interface TeleMenu { open: boolean; index: number; prev: { teleport: boolean; up: boolean; down: boolean; confirm: boolean; back: boolean }; }
const freshTele = (): TeleMenu => ({ open: false, index: 0, prev: { teleport: false, up: false, down: false, confirm: false, back: false } });

/** Magnification levels (see docs/redesign/01-game-design.md · Magnification). */
export const MAGNIFICATION = [
  { name: 'Micro', maxLength: 1.0 }, { name: 'Small', maxLength: 2.0 }, { name: 'Mid', maxLength: 4.5 }, { name: 'Large', maxLength: 8 }, { name: 'Colossal', maxLength: Infinity },
] as const;
export const magnificationLevel = (L: number) => MAGNIFICATION.find((m) => L < m.maxLength) ?? MAGNIFICATION[4];
/** Follow-camera distance for a body length: about two body lengths back plus a floor so larvae are still readable. */
export const magnificationDistance = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;

export function layoutRects(n: number, w: number, h: number): Rect[] {
  if (n <= 1) return [{ x: 0, y: 0, w, h }];
  if (n === 2) return [{ x: 0, y: 0, w: w / 2, h }, { x: w / 2, y: 0, w: w / 2, h }];
  return Array.from({ length: n }, (_, i) => ({ x: (i % 2) * w / 2, y: Math.floor(i / 2) * h / 2, w: w / 2, h: h / 2 }));
}

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private sea?: SeaEnvironment;
  game?: Game;
  private views = new Map<number, CreatureView>();
  private attachments = new Attachments();
  private contact = new THREE.Vector3();

  private ringGeo = new THREE.RingGeometry(0.72, 0.85, 40);
  // forward-facing cap (the model's +Z is its nose)
  private shieldGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42).rotateX(Math.PI / 2);
  private cams: CamState[] = [];
  /** Where the local views hear from, refreshed each frame; see `hearing()`. */
  private listeners: { pos: THREE.Vector3; right: THREE.Vector3; ref: number }[] = [];
  private attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private bubbles = new Bubbles();
  private sparkles = new Bubbles(400, [1.0, 0.86, 0.5], 0.25);
  private impacts = new Impacts();
  private silt = new Silt();
  private keyboard = new KeyboardInput();
  private setups: PlayerSetup[] = [];
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private acc = 0;
  private disposed = false;
  private paused = false;
  private hudT = 0;
  private prevMenu = new Map<string, boolean>();
  private fps = 60; private fpsFrames = 0; private fpsT = 0;
  private resize: ResizeObserver;
  private scratchBoulders: Boulder[] = [];
  private cullSphere = new THREE.Sphere();
  private tmpV = new THREE.Vector3(); private tmpLook = new THREE.Vector3(); private tmpDesired = new THREE.Vector3(); private tmpProj = new THREE.Vector3();
  private lookSpeed = 1; private invertY = false;
  private attract = true;
  private attractT = 0;
  private generation = 0;
  private lastFocus = new THREE.Vector3();
  quality: Quality;

  constructor(private container: HTMLElement, quality: Quality, private cb: EngineCallbacks) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Split-screen renders the scene once per player; without this the shadow map is rebuilt every time.
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);
    this.scene.add(this.bubbles.points, this.sparkles.points, this.impacts.group, this.silt.group);
    (window as any).__cambrian = this;
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(container);
    this.onResize();
    this.startAttract();
    this.raf = requestAnimationFrame(this.frame);
    // Stream assets by priority: the default pick first so the title can show, everything else on idle time.
    this.assets.onProgress((p) => {
      this.cb.onProgress?.(p);
      // The title never waits for 3D models; they stream during the title and pick screens.
      if (!this.bootDone && (this.assets.isCardReady('anomalocaris') || performance.now() - this.bootStart > 4000)) { this.bootDone = true; this.cb.onLoaded(); }
    });
    this.assets.prioritize(['anomalocaris', 'waptia', 'marrella', 'opabinia', 'canadia', 'olenoides', 'hallucigenia', 'wiwaxia'], 'boot');
  }
  readonly assets = new AssetQueue();
  private bootDone = false; private bootStart = performance.now();
  /** Tell the loader which creatures are most likely to be needed next. */
  prioritize(creatures: CreatureId[], phase: 'boot' | 'title' | 'select' | 'playing') { this.assets.prioritize(creatures, phase); }

  private onResize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
  }

  setQuality(q: Quality) {
    if (q === this.quality) return;
    this.quality = q;
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.5 : 1));
    if (this.game) { this.sea?.dispose(); this.sea = createSea(this.scene, this.game.world, q); }
    this.onResize();
  }
  setLook(speed: number, invert: boolean) { this.lookSpeed = speed; this.invertY = invert; }
  setPaused(p: boolean) { this.paused = p; }
  get isAttract() { return this.attract; }

  /** Background ecosystem for the title / select screens. */
  startAttract() {
    this.generation++;
    this.clearMatch();
    this.attract = true;
    this.setups = [];
    this.game = new Game('reef', []);
    this.sea?.dispose();
    this.sea = createSea(this.scene, this.game.world, this.quality);
    this.attractT = 0;
  }

  startMatch(mode: Mode, setups: PlayerSetup[]) {
    this.generation++;
    this.clearMatch();
    this.attract = false;
    this.setups = setups;
    this.game = new Game(mode, setups, 5052026 + Math.floor(Math.random() * 1000));
    this.sea?.dispose();
    this.sea = createSea(this.scene, this.game.world, this.quality);
    this.cams = setups.map((_, i) => {
      const p = this.game!.players[i];
      const cam = new THREE.PerspectiveCamera(60, 1, 0.08, 420);
      const cs: CamState = { yaw: p.yaw, pitch: 0.2, zoom: 1, fade: 0, aimBlend: 0, aimTarget: -1, aimSnapT: 0, pos: new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y + 2.5, p.pos.z - Math.cos(p.yaw) * 6), look: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), shake: 0, camera: cam, lockBlend: 0, lastPos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), frustum: new THREE.Frustum(), projScreen: new THREE.Matrix4(), tele: freshTele() };
      cam.position.copy(cs.pos); cam.lookAt(cs.look);
      return cs;
    });
    this.paused = false;
    // The button that started the match is almost certainly still held right now. Seed the menu
    // edge from what each device reads at this instant, or the first frame sees Start down with
    // no previous state, calls it a fresh press, and pauses the match the moment it begins.
    this.prevMenu.clear();
    for (const s of setups) this.prevMenu.set(String(s.device), this.controlsFor(s, 0).menu);
    audio.play('ui-start');
  }

  private clearMatch() {
    for (const v of this.views.values()) v.dispose();
    this.views.clear(); this.attachments.clear();
    this.cams = [];
    this.game = undefined;
  }

  private controlsFor(setup: PlayerSetup, index: number): RawControls {
    if (setup.device === 'keyboard') return this.keyboard.read(1);
    if (setup.device === 'keyboard2') return this.keyboard.read(2);
    const gp = navigator.getGamepads?.()[setup.device];
    if (!gp || !gp.connected) return emptyControls();
    void index;
    return readGamepad(gp);
  }

  private toInput(c: RawControls, cs: CamState, a: Actor): InputFrame {
    const f = emptyInput();
    f.mx = c.mx; f.my = c.my; f.lookX = c.lookX; f.lookY = c.lookY;
    const fwd = this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    f.camYaw = Math.atan2(fwd.x, fwd.z);
    f.camPitch = clamp(-Math.asin(clamp(fwd.y, -1, 1)) * 0.75, -0.7, 0.7);
    f.burst = c.burst; f.rise = c.rise; f.sink = c.sink;
    f.light = c.light; f.heavy = c.heavy; f.ability = c.ability; f.dodge = c.dodge; f.guard = c.guard; f.lock = c.lock; f.sense = c.sense;
    f.dash = c.dash; f.aim = c.aim; f.aimTarget = c.aim ? cs.aimTarget : -1;
    void a;
    return f;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dtReal = Math.max(0, Math.min((now - this.last) / 1000, 0.08));
    this.last = now;
    this.fpsFrames++; this.fpsT += dtReal; if (this.fpsT > 1) { this.fps = this.fpsFrames / this.fpsT; this.fpsFrames = 0; this.fpsT = 0; }
    const game = this.game;
    if (!game) return;
    const running = !this.paused;
    const dt = running ? dtReal : 0;
    this.time += dt;

    // Inputs
    const inputs = new Map<number, InputFrame>();
    if (!this.attract) {
      this.setups.forEach((s, i) => {
        const c = this.controlsFor(s, i);
        const key = String(s.device);
        const prevMenu = this.prevMenu.get(key) ?? false;
        if (c.menu && !prevMenu) this.cb.onMenu(i);
        this.prevMenu.set(key, c.menu);
        const p = game.players[i];
        const menuOpen = running && p ? this.updateTeleMenu(game, i, c) : false;
        // While the teleport menu is up the creature drifts: A and B belong to the menu.
        if (p && running) inputs.set(i, menuOpen ? this.toInput(emptyControls(), this.cams[i], p) : this.toInput(c, this.cams[i], p));
        // Camera orbit. The right stick is the ONLY thing that turns the camera: yaw is absolute
        // and never follows the creature's heading, so swimming back does not swing the view.
        // Increasing yaw rotates the view left, so a rightward stick decreases it.
        if (running && !menuOpen) {
          const cs = this.cams[i];
          this.updateAim(cs, game.players[i], c.aim, dt);
          if (c.rsClick) {
            // Right stick pressed in: up/down zooms instead of pitching.
            cs.zoom = clamp(cs.zoom * Math.exp(c.lookY * dt * 1.6), 0.55, 2.2);
          } else {
            cs.yaw = wrapAngle(cs.yaw - c.lookX * dt * 2.6 * this.lookSpeed);
            cs.pitch = clamp(cs.pitch + c.lookY * dt * 1.6 * this.lookSpeed * (this.invertY ? -1 : 1), -0.55, 1.15);
            if (Math.abs(c.lookY) < 0.05) cs.pitch = damp(cs.pitch, 0.2, 0.6, dt);
          }
        }
      });
    }

    // Fixed step. Capped at 3 sub-steps so a slow frame cannot spiral into more simulation work.
    const tSim = performance.now();
    if (running) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 3) { game.step(1 / 60, inputs); this.acc -= 1 / 60; steps++; }
      if (steps === 3) this.acc = 0;
    }
    this.simMs = this.simMs * 0.9 + (performance.now() - tSim) * 0.1;
    this.keyboard.endFrame();

    // Events → fx / audio / rumble
    this.handleEvents(game);

    // Cameras
    const camPositions: THREE.Vector3[] = [];
    if (this.attract) {
      this.attractT += dt;
      const n = nurseryAt(0);
      const a = this.attractT * 0.06;
      const r = 16 + Math.sin(this.attractT * 0.1) * 5;
      const x = n.x + Math.cos(a) * r, z = n.z + Math.sin(a) * r;
      const gy = groundHeight(game.world, x, z, this.scratchBoulders);
      this.attractCam.position.set(x, gy + 3.5 + Math.sin(this.attractT * 0.17) * 1.2, z);
      this.attractCam.lookAt(n.x, gy + 2 + Math.sin(this.attractT * 0.13), n.z);
      camPositions.push(this.attractCam.position);
    } else {
      this.cams.forEach((cs, i) => { this.updateCamera(cs, game.players[i], dt); camPositions.push(cs.camera.position); });
    }
    const focus = camPositions.length ? camPositions[0] : this.lastFocus;
    this.lastFocus.copy(focus);
    this.sea?.update(this.time, dt, focus, camPositions);
    // Tell the music where the first player is; a biome with a track of its own cues it.
    const listener = game.players[0];
    if (listener && !this.attract) audio.setBiome(biomeAt(listener.pos.x, listener.pos.z));

    // Views
    this.syncViews(game, camPositions, dt);
    this.bubbles.update(dt); this.sparkles.update(dt);
    this.impacts.update(dt, focus);
    this.silt.sync(game.silt, this.time);

    // Render
    const tRender = performance.now();
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const r = this.renderer;
    r.setScissorTest(false); r.setViewport(0, 0, W, H); r.clear();
    if (this.quality === 'high') r.shadowMap.needsUpdate = true;   // rebuilt on the first render() below
    if (this.attract) {
      const density = this.sea?.setViewLength(1.2, this.attractCam.position.x, this.attractCam.position.z) ?? 0.0105;
      this.attractCam.far = clamp(2.1 / density, 110, 300);
      this.attractCam.aspect = W / H; this.attractCam.updateProjectionMatrix();
      this.prepareViewport(-1, undefined);
      r.render(this.scene, this.attractCam);
    } else {
      const rects = layoutRects(this.cams.length, W, H);
      r.setScissorTest(true);
      this.cams.forEach((cs, i) => {
        const rc = rects[i];
        const density = this.sea?.setViewLength(lengthOf(game.players[i]), cs.camera.position.x, cs.camera.position.z) ?? 0.0105;
        // Everything past ~98% fog is invisible: pulling the far plane in there lets the frustum
        // drop those scenery chunks entirely instead of rendering them into the murk.
        cs.camera.far = clamp(2.1 / density, 110, 300);
        cs.camera.aspect = rc.w / rc.h; cs.camera.updateProjectionMatrix();
        this.prepareViewport(i, game.players[i], cs);
        r.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h); r.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h);
        r.render(this.scene, cs.camera);
      });
      r.setScissorTest(false);
      // HUD
      this.hudT += dtReal;
      if (this.hudT > 1 / 24) { this.hudT = 0; this.cb.onHud(this.snapshot(game, rects)); }
      // audio tension
      let tension = 0;
      for (const p of game.players) tension = Math.max(tension, p.hunted);
      audio.setTension(clamp(tension, 0, 1));
      audio.update(dtReal);
    }
    this.renderMs = this.renderMs * 0.9 + (performance.now() - tRender) * 0.1;
    this.frameMs = this.frameMs * 0.9 + dtReal * 1000 * 0.1;
  }

  /**
   * The teleport menu. D-pad down opens it (and closes it again); up/down or the left stick move
   * the cursor; A goes; B backs out. Returns whether the menu is open, in which case the player's
   * other controls are swallowed for the frame.
   */
  private updateTeleMenu(game: Game, i: number, c: RawControls): boolean {
    const cs = this.cams[i]; if (!cs) return false;
    const t = cs.tele, prev = t.prev;
    const p = game.players[i];
    const justTele = c.teleport && !prev.teleport;
    const up = c.dup || c.my > 0.6, down = c.ddown || c.my < -0.6;
    const justUp = up && !prev.up, justDown = down && !prev.down;
    const justConfirm = c.confirm && !prev.confirm, justBack = c.back && !prev.back;
    prev.teleport = c.teleport; prev.up = up; prev.down = down; prev.confirm = c.confirm; prev.back = c.back;
    if (justTele && !t.open) {
      // D-pad down opens it; once open the same button steps down the list
      if (isAlive(p) && (p.state === 'free' || p.state === 'guard')) { t.open = true; t.index = 0; prev.confirm = true; prev.down = true; audio.play('ui-confirm'); }
      return t.open;
    }
    if (!t.open) return false;
    if (!isAlive(p)) { t.open = false; return false; }
    const options = game.teleportOptions(i);
    if (justUp) { t.index = (t.index + options.length - 1) % options.length; audio.play('ui-move'); }
    if (justDown || justTele) { t.index = (t.index + 1) % options.length; audio.play('ui-move'); }
    if (justBack) { t.open = false; audio.play('ui-back'); return false; }
    if (justConfirm) {
      const opt = options[t.index];
      if (opt && game.teleport(i, opt.dest)) { t.open = false; audio.play('ui-start'); }
      else audio.play('ui-back');
      return t.open;
    }
    return true;
  }

  /**
   * Aim mode. The crosshair is the screen centre; whatever prey it is over (nearest to the camera
   * forward ray, inside range) becomes the target. Entering aim snaps the camera onto the best
   * candidate once, the way a console aim-assist does; after that the right stick steers freely.
   */
  private updateAim(cs: CamState, p: Actor | undefined, aiming: boolean, dt: number) {
    if (!p || !this.game) { cs.aimBlend = 0; cs.aimTarget = -1; return; }
    const wasAiming = cs.aimBlend > 0.5 || cs.aimSnapT > 0;
    cs.aimBlend = damp(cs.aimBlend, aiming ? 1 : 0, 9, dt);
    if (!aiming) { cs.aimTarget = -1; cs.aimSnapT = 0; return; }
    const L = lengthOf(p);
    const range = this.game.pounceRange(p) * 2.4;
    const fwd = this.tmpV.copy(cs.look).sub(cs.camera.position).normalize();
    let best: Actor | undefined; let bestAng = Infinity;
    for (const o of this.game.nearby(p.pos, range)) {
      if (o.id === p.id || !isAlive(o) || isHidden(o)) continue;
      const band = bandOf(p, o);
      if (band === 'giant' || band === 'threat') continue;
      if (this.game.mode === 'rise' && o.controller === 'player') continue;
      const to = this.tmpDesired.set(o.pos.x - cs.camera.position.x, o.pos.y - cs.camera.position.y, o.pos.z - cs.camera.position.z);
      const d = to.length(); if (d < 0.01) continue;
      to.divideScalar(d);
      // angular distance from the crosshair, widened slightly for close/large targets
      const ang = Math.acos(clamp(fwd.dot(to), -1, 1)) - Math.min(0.08, lengthOf(o) * 0.5 / d);
      const bandW = band === 'prey' ? 0.85 : band === 'snack' ? 1 : 1.25;
      if (ang * bandW < bestAng) { bestAng = ang * bandW; best = o; }
    }
    const cone = cs.aimSnapT > 0 || !wasAiming ? 0.6 : 0.2;   // wide on entry (snap), tight afterwards
    if (best && bestAng < cone) {
      cs.aimTarget = best.id;
      if (!wasAiming) cs.aimSnapT = 0.25;
      if (cs.aimSnapT > 0) {
        // ease the camera onto the target
        const dx = best.pos.x - cs.camera.position.x, dy = best.pos.y - cs.camera.position.y, dz = best.pos.z - cs.camera.position.z;
        const ty = Math.atan2(dx, dz), tp = clamp(Math.atan2(-dy, Math.hypot(dx, dz)) + 0.12, -0.55, 1.15);
        const k = 1 - Math.exp(-14 * dt);
        cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * k);
        cs.pitch += (tp - cs.pitch) * k;
        cs.aimSnapT -= dt;
      }
    } else { cs.aimTarget = -1; if (!wasAiming) cs.aimSnapT = 0; }
  }

  private updateCamera(cs: CamState, p: Actor, dt: number) {
    const L = lengthOf(p);
    const def = creature(p.creature);
    const target = p.lockTarget >= 0 ? this.game!.byId(p.lockTarget) : undefined;
    const locked = !!target && isAlive(target) && !p.aiming;
    cs.lockBlend = damp(cs.lockBlend, locked ? 1 : 0, 5, dt);
    // Magnification: camera distance and framing scale with body length so the world re-reads at every tier.
    let dist = magnificationDistance(L) * cs.zoom * (1 - 0.3 * cs.aimBlend);
    if (p.state === 'dead') dist *= 1.5;
    if (p.hunted > 0.5) dist *= 0.85;
    // Snap in behind the creature when it teleports (respawn), otherwise keep the player's framing.
    const jumped = cs.lastPos.distanceTo(this.tmpV.set(p.pos.x, p.pos.y, p.pos.z)) > 20;
    cs.lastPos.set(p.pos.x, p.pos.y, p.pos.z);
    if (jumped) { cs.yaw = p.yaw; cs.fade = 1; }
    // Eaten: ride along with the predator from the same angle until the respawn.
    const pred = (p.state === 'swallowed' || (p.state === 'dead' && p.swallowedBy >= 0)) ? this.game!.byId(p.swallowedBy) : undefined;
    const lookAt = pred
      ? this.tmpLook.set(pred.pos.x, pred.pos.y + lengthOf(pred) * 0.1, pred.pos.z)
      : this.tmpLook.set(p.pos.x, p.pos.y + L * 0.15, p.pos.z);
    if (pred) dist = magnificationDistance(lengthOf(pred)) * cs.zoom * 0.85;
    // Fade to black just before the respawn, and in again just after.
    const dying = p.state === 'dead' || p.state === 'swallowed';
    const fadeTarget = dying && (p.state === 'dead' ? p.respawnT : p.stateT) > (p.state === 'dead' ? 2.6 : 99) ? 1 : 0;
    cs.fade = damp(cs.fade, fadeTarget, fadeTarget > cs.fade ? 6 : 4, dt);
    if (locked && target) {
      const dx = target.pos.x - p.pos.x, dz = target.pos.z - p.pos.z;
      const ty = Math.atan2(dx, dz);
      // Lock-on eases the camera behind the player relative to the target; the stick still works.
      cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * (1 - Math.exp(-2.5 * dt)));
      const d = Math.hypot(dx, dz, target.pos.y - p.pos.y);
      lookAt.lerp(this.tmpV.set(target.pos.x, target.pos.y, target.pos.z), 0.42 * cs.lockBlend);
      dist += Math.min(d * 0.35, L * 3) * cs.lockBlend;
    }
    const yaw = cs.yaw;
    // Aim mode: over-the-shoulder. Shift both the camera and its look point sideways so the
    // specimen sits to the left and the crosshair (screen centre) is free to be steered onto prey.
    if (cs.aimBlend > 0.001) {
      const k = L * 0.75 * cs.aimBlend;                  // right = (-cos yaw, 0, sin yaw)
      lookAt.x += -Math.cos(yaw) * k; lookAt.z += Math.sin(yaw) * k;
      lookAt.y += L * 0.1 * cs.aimBlend;
    }
    const pitch = cs.pitch + (locked ? 0.1 : 0) + (def.ground ? 0.12 : 0);
    const desired = this.tmpDesired.set(
      lookAt.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      lookAt.y + Math.sin(pitch) * dist + L * 0.18,
      lookAt.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    // keep camera out of the ground and boulders, below the surface
    const g = groundHeight(this.game!.world, desired.x, desired.z, this.scratchBoulders);
    desired.y = clamp(desired.y, g + 0.7, SURFACE_Y - 0.4);
    const pos = { x: desired.x, y: desired.y, z: desired.z };
    resolveStatic(this.game!.world, pos, 0.7, this.scratchBoulders);
    desired.set(pos.x, pos.y, pos.z);
    const k = jumped ? 1 : p.state === 'dodge' ? 5 : 7;
    if (jumped) { cs.pos.copy(desired); cs.look.copy(lookAt); }
    else { cs.pos.lerp(desired, 1 - Math.exp(-k * dt)); cs.look.lerp(lookAt, 1 - Math.exp(-10 * dt)); }
    cs.shake = Math.max(0, cs.shake - dt * 2.2);
    const sh = cs.shake * cs.shake * 0.35;
    cs.camera.position.copy(cs.pos).add(this.tmpV.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    cs.camera.lookAt(cs.look);
    const baseFov = 64 - 9 * clamp(Math.log(L + 0.3) / Math.log(11), 0, 1);
    cs.camera.fov = damp(cs.camera.fov, baseFov + (p.burstT > 0 || (Math.hypot(p.vel.x, p.vel.z) > def.speed * Math.pow(p.scale, 0.45) * 1.25) ? 8 : 0) + p.hunted * 4, 4, dt);
    cs.camera.near = clamp(L * 0.06, 0.04, 0.5);
  }

  private syncViews(game: Game, cams: THREE.Vector3[], dt: number) {
    const players = Math.max(1, this.cams.length);
    const keep = new Set<number>();
    const nearDist = (a: Actor) => { let best = Infinity; for (const c of cams) { const d = Math.hypot(a.pos.x - c.x, a.pos.y - c.y, a.pos.z - c.z); if (d < best) best = d; } return best; };
    // Rank by apparent size (body length over distance), not distance alone: a giant 80 units away
    // matters far more than a 0.2-unit snack at 20. Anything under ~8 screen pixels is skipped.
    const candidates: { a: Actor; d: number; size: number }[] = [];
    for (const a of game.actors) {
      const d = Math.max(0.5, nearDist(a));
      const size = lengthOf(a) / d;
      if (a.controller === 'player' || (d < (players > 2 ? 90 : 130) && size > 0.011)) candidates.push({ a, d, size });
    }
    candidates.sort((x, y) => y.size - x.size);
    const cap = Math.round((this.quality === 'high' ? 88 : 56) / (0.6 + 0.4 * players));
    let count = 0;
    for (const { a, d } of candidates) {
      if (count >= cap && a.controller !== 'player') break;
      // Pick a detail level from apparent size, with hysteresis so it cannot flicker at the boundary.
      let v = this.views.get(a.id);
      const size = lengthOf(a) / d;
      let wantLod: Lod = a.controller === 'player' ? 0 : v ? (v.lod === 0 ? (size < 0.05 ? 1 : 0) : (size > 0.075 ? 0 : 1)) : (size < 0.06 ? 1 : 0);
      if (wantLod === 1 && !loadedSync(a.creature, 1)) { void ensureLoaded(a.creature, undefined, 1); wantLod = 0; }
      if (v && v.lod !== wantLod) { v.dispose(); this.views.delete(a.id); v = undefined; }
      if (!v) {
        const loaded = loadedSync(a.creature, wantLod);
        if (!loaded) { void ensureLoaded(a.creature, undefined, wantLod); continue; }
        v = new CreatureView(a.creature, loaded, { ringGeo: this.ringGeo, shieldGeo: this.shieldGeo }, wantLod);
        this.scene.add(v.group);
        this.views.set(a.id, v);
        v.update(a, 0, this.time, true);
      }
      keep.add(a.id); count++;
      // Only nearby creatures cast shadows: the shadow pass has no frustum culling for these
      // meshes, so every distant swimmer was being rasterised into the shadow map for nothing.
      v.setShadow(d < 32 && lengthOf(a) > 0.45);
      // Animate far views less often
      const far = d > 45;
      const continuous = a.state === 'eating' || a.holdT > 0;
      const animate = continuous || !far || ((a.id + Math.floor(this.time * 60)) % 3 === 0);
      v.update(a, animate && far && !continuous ? dt * 3 : dt, this.time, animate);
    }
    this.attachments.sync(game, this.views, dt);
    for (const [id, v] of this.views) if (!keep.has(id)) { v.dispose(); this.views.delete(id); }
  }

  /** Impact effects land where the attacker's nearest attack socket is, not at the victim's centre, when the rig has one. */
  private impactPos(attackerId: number | undefined, victimId: number | undefined, fallback: { x: number; y: number; z: number }) {
    const victim = victimId != null && victimId >= 0 ? this.game?.byId(victimId) : undefined;
    const pv = attackerId != null && attackerId >= 0 ? this.views.get(attackerId) : undefined;
    if (!pv || !this.attachments.contactPoint(pv, fallback, this.contact)) return fallback;
    // A socket far from the body it supposedly hit means the clip has not reached it: keep the sim's point.
    const limit = victim ? lengthOf(victim) * 0.9 + 0.3 : 1;
    const off = Math.hypot(this.contact.x - fallback.x, this.contact.y - fallback.y, this.contact.z - fallback.z);
    return off < limit ? { x: this.contact.x, y: this.contact.y, z: this.contact.z } : fallback;
  }

  /** Per-viewport pass: cull views outside this camera, then colour the rings for this viewer. */
  private prepareViewport(playerIndex: number, viewer?: Actor, cs?: CamState) {
    const game = this.game!;
    if (cs) {
      cs.camera.updateMatrixWorld();
      cs.projScreen.multiplyMatrices(cs.camera.projectionMatrix, cs.camera.matrixWorldInverse);
      cs.frustum.setFromProjectionMatrix(cs.projScreen);
    }
    for (const [id, v] of this.views) {
      const a = game.byId(id);
      if (!a) continue;
      // Creature meshes have frustumCulled off (skinned bounds are unreliable), so cull the group here.
      if (cs) {
        this.cullSphere.center.copy(v.group.position);
        this.cullSphere.radius = lengthOf(a) * 0.9 + 0.5;
        v.group.visible = (!isHidden(a) || a.stateT <= 0.6) && cs.frustum.intersectsSphere(this.cullSphere);
        if (!v.group.visible) continue;
      }
      if (!viewer || a.state === 'dead' || a.state === 'swallowed') { v.setRing(null, 0); v.setHighlight(0); continue; }
      if (a.id === viewer.id) { v.setRing(null, 0); v.setHighlight(0); continue; }
      const band = bandOf(viewer, a);
      const d = Math.hypot(a.pos.x - viewer.pos.x, a.pos.y - viewer.pos.y, a.pos.z - viewer.pos.z);
      const L = lengthOf(viewer);
      const sensing = viewer.senseT > 0 && d < creature(viewer.creature).sense * L * 1.2;
      const locked = viewer.lockTarget === a.id;
      const near = d < L * 7 + 4;
      const opacity = locked ? 0.95 : sensing ? 0.8 : near ? (band === 'snack' ? 0.18 : 0.42) : 0;
      v.setRing(BAND_COLOR[band], opacity * (a.controller === 'swarm' ? 0.5 : 1));
      const huntingMe = a.brain?.target === viewer.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
      if (huntingMe) { v.setRing(BAND_COLOR[band], 0.95); v.setHighlight(a.brain!.goal === 'hunt' ? 0.45 + 0.3 * Math.sin(this.time * 10) : 0.25 + 0.1 * Math.sin(this.time * 6), '#ff4b5c'); }
      else v.setHighlight(sensing ? 0.55 + 0.25 * Math.sin(this.time * 9) : locked ? 0.12 : 0, BAND_COLOR[band]);
    }
  }

  /**
   * Refresh the audio listeners from the cameras. One listener per split-screen view (or the
   * attract camera), each carrying the camera distance that view is framed at, which sets the
   * scale of the falloff in `hearing()`.
   */
  private syncListeners(game: Game) {
    const add = (i: number, cam: THREE.PerspectiveCamera, ref: number) => {
      let l = this.listeners[i];
      if (!l) l = this.listeners[i] = { pos: new THREE.Vector3(), right: new THREE.Vector3(), ref };
      cam.updateMatrixWorld();
      l.pos.copy(cam.position);
      l.right.setFromMatrixColumn(cam.matrixWorld, 0).normalize();   // camera-space +X, for panning
      l.ref = ref;
    };
    if (this.attract) {
      add(0, this.attractCam, 6);
      this.listeners.length = 1;
      return;
    }
    this.cams.forEach((cs, i) => {
      const p = game.players[i];
      add(i, cs.camera, magnificationDistance(p ? lengthOf(p) : 1) * cs.zoom);
    });
    this.listeners.length = this.cams.length;
  }

  /**
   * How loud, and how far to the side, a sound at `pos` is for the nearest local view.
   * `atten` is 1 at the camera and reaches 0 at the edge of earshot, so the reef's constant
   * chatter of distant grazers and scuffles fades out instead of piling up at full volume.
   */
  private hearing(pos: { x: number; y: number; z: number }): { atten: number; pan: number } {
    let atten = 0, pan = 0;
    for (const l of this.listeners) {
      const dx = pos.x - l.pos.x, dy = pos.y - l.pos.y, dz = pos.z - l.pos.z;
      const d = Math.hypot(dx, dy, dz);
      const a = distanceAtten(d, l.ref);
      if (a > atten) {
        atten = a;
        pan = d > 0.001 ? clamp((dx * l.right.x + dy * l.right.y + dz * l.right.z) / d, -1, 1) * 0.75 : 0;
      }
    }
    return { atten, pan };
  }

  private handleEvents(game: Game) {
    const evs = game.events;
    if (!evs.length) return;
    this.syncListeners(game);
    for (const e of evs) {
      const playerActor = e.player != null && e.player >= 0 ? game.players[e.player] : undefined;
      const padOf = (pi: number | undefined) => (pi != null && pi >= 0 ? this.setups[pi]?.device : undefined);
      /** A world sound: attenuated and panned by where it happened. */
      const world = (kind: string, at: { x: number; y: number; z: number }, strength = 1, scale = 1) => {
        const h = this.hearing(at);
        audio.play(kind, strength, h.pan, h.atten * scale);
      };
      /** A sting that is about *you* — only played for a local player, and never attenuated. */
      const personal = (kind: string, strength = 1) => { if (e.player != null && e.player >= 0) audio.play(kind, strength); };
      switch (e.kind) {
        case 'hit': {
          const s = e.strength ?? 1;
          const at = this.impactPos(e.actor, e.other, e.pos);
          this.bubbles.emit(at, Math.round(6 + s * 10), 0.4, 2 + s * 2, 0.07);
          this.impacts.spawn(at, '#ffd0a0', 0.5 + s * 0.8, 0.28);
          world('hit', at, s);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.4 + s * 0.4), 0.3, 120); this.shake(e.player, 0.5 + s * 0.5); }
          const attacker = game.byId(e.actor);
          if (attacker?.player != null && attacker.player >= 0) { const d = padOf(attacker.player); if (typeof d === 'number') rumble(d, 0.25, 0.5, 70); }
          break;
        }
        case 'kill': { this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.8); this.impacts.spawn(e.pos, '#ff8a6a', 1.5 + (e.strength ?? 1), 0.5); world('kill', e.pos); if (playerActor) this.shake(e.player!, 0.7); break; }
        case 'death': { if (e.player != null && e.player >= 0) audio.play('death'); else world('death', e.pos, 1, 0.7); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 400); this.shake(e.player, 1.4); } break; }
        case 'eat': { this.bubbles.emit(e.pos, 5, 0.3, 1.2, 0.05, 0.8); world('eat', e.pos, e.strength ?? 0.5); break; }
        case 'tierUp': { this.bubbles.emit(e.pos, 90, 2.5, 5, 0.14, 2.2); this.impacts.spawn(e.pos, '#fff0b0', 4 + (e.strength ?? 1) * 2, 0.9); if (e.player != null && e.player >= 0) audio.play('tierUp'); else world('tierUp', e.pos, 1, 0.6); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.8, 0.8, 600); this.shake(e.player, 0.8); } break; }
        case 'parry': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#9ff6ff', 2, 0.4); this.bubbles.emit(at, 20, 0.6, 5, 0.08); world('parry', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.9, 0.2, 90); } break; }
        case 'guardBreak': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#ff6a5a', 1.8, 0.4); world('guardBreak', at); break; }
        case 'stagger': { world('stagger', e.pos); break; }
        case 'dodge': { this.bubbles.emit(e.pos, 14, 0.8, 2.5, 0.06, 0.7); world('dodge', e.pos); break; }
        case 'silt': { this.bubbles.emit(e.pos, 30, 1.5, 2, 0.08, 1.2); world('silt', e.pos); break; }
        case 'ability': { this.impacts.spawn(e.pos, '#c8fff0', 1.2 + (e.strength ?? 1) * 0.4, 0.45); this.bubbles.emit(e.pos, 20, 1, 3, 0.08); world('ability', e.pos); break; }
        case 'grab': { const at = this.impactPos(e.actor, e.other, e.pos); this.impacts.spawn(at, '#ffb070', 1.4, 0.35); world('grab', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 0.6, 300); } break; }
        case 'hunted': { personal('hunted'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.6, 0.9, 500); } break; }
        case 'escape': { personal('escape'); break; }
        case 'noticed': { personal('noticed', 0.5); break; }
        case 'sense': { if (e.player != null && e.player >= 0) audio.play('sense'); else world('sense', e.pos, 1, 0.5); break; }
        case 'swallow': { world('swallow', e.pos, 1.2); this.bubbles.emit(e.pos, 30, 1, 3, 0.09, 1.5); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 900); this.shake(e.player, 1.2); } break; }
        case 'disintegrate': { this.sparkles.emit(e.pos, Math.round(28 + (e.strength ?? 1) * 10), 0.5 + (e.strength ?? 1) * 0.25, 0.9, 0.06, 2.2); world('disintegrate', e.pos, 0.6); break; }
        case 'routed': { world('routed', e.pos, 0.8); this.impacts.spawn(e.pos, '#9ff6ff', 2.5, 0.6); break; }
        case 'pounce': { this.impacts.spawn(e.pos, '#ffe08a', 1.2 + (e.strength ?? 1) * 0.5, 0.35); this.bubbles.emit(e.pos, 24, 0.9, 4, 0.08); world('pounce', e.pos, 1.3); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.7, 0.4, 140); this.shake(e.player, 0.6); } break; }
        case 'burst': { world('burst', e.pos); break; }
        // Hatching out of a nursery after a respawn (the moult state is reused for the hatch-in).
        case 'moult': { if (e.player != null && e.player >= 0) audio.play('respawn'); else world('respawn', e.pos, 1, 0.5); break; }
        case 'teleport': {
          // sparkles where they left and where they arrived; the camera snaps behind them on arrival
          this.sparkles.emit(e.pos, e.strength ? 50 : 30, 0.9, 1.4, 0.07, 1.8);
          this.bubbles.emit(e.pos, 20, 0.8, 3, 0.07, 1.2);
          if (e.strength) { personal('ability', 0.8); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.5, 0.7, 250); } }
          break;
        }
      }
    }
    evs.length = 0;
  }

  private shake(player: number, amount: number) { const cs = this.cams[player]; if (cs) cs.shake = Math.min(1.6, cs.shake + amount * 0.6); }

  private snapshot(game: Game, rects: Rect[]): HudSnapshot {
    const players: PlayerHud[] = game.players.map((p, i) => {
      const def = creature(p.creature);
      const cs = this.cams[i];
      const lockA = p.lockTarget >= 0 ? game.byId(p.lockTarget) : undefined;
      const hunter = p.hunterId >= 0 ? game.byId(p.hunterId) : undefined;
      let hunterAngle: number | null = null;
      if (hunter && cs && p.hunted > 0.15) {
        const v = this.tmpProj.set(hunter.pos.x, hunter.pos.y, hunter.pos.z).project(cs.camera);
        const onScreen = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
        if (!onScreen) hunterAngle = Math.atan2(v.y * (v.z > 1 ? -1 : 1), v.x * (v.z > 1 ? -1 : 1));
      }
      const markers: PlayerHud['bandMarkers'] = [];
      if (cs) {
        const L = lengthOf(p);
        for (const a of game.actors) {
          if (a.id === p.id || !isAlive(a) || isHidden(a) || a.controller === 'swarm') continue;
          const d = Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y, a.pos.z - p.pos.z);
          const band = bandOf(p, a);
          if (band === 'snack' || band === 'prey') continue;
          if (d > 90 && band !== 'giant') continue;
          const v = this.tmpProj.set(a.pos.x, a.pos.y + lengthOf(a) * 0.4, a.pos.z).project(cs.camera);
          if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
          if (band === 'rival' && d > L * 12 + 10 && p.senseT <= 0) continue;
          markers.push({ x: (v.x + 1) / 2, y: (1 - v.y) / 2, band, size: clamp(lengthOf(a) / Math.max(d, 1) * 8, 0.4, 1.6) });
        }
      }
      // Radar: reach grows with the creature, contacts rotate into the camera frame (up = camera forward).
      const radarRange = 55 + lengthOf(p) * 12;
      const blips: RadarBlipHud[] = [];
      if (cs) {
        const sy = Math.sin(cs.yaw), cy = Math.cos(cs.yaw);
        for (const b of game.radarFor(i, radarRange)) {
          // forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
          const f = (b.dx * sy + b.dz * cy) / radarRange, r = (-b.dx * cy + b.dz * sy) / radarRange;
          let x = r, y = -f;
          const l = Math.hypot(x, y);
          const beyond = l > 1;
          if (beyond) { x /= l; y /= l; }
          const color = b.kind === 'player' ? PLAYER_COLORS[b.id % 4] : b.kind === 'giant' ? BAND_COLOR.giant : b.kind === 'threat' ? BAND_COLOR.threat : b.kind === 'home' ? '#9be9ff' : '#d9cfa4';
          blips.push({ x, y, kind: b.kind, color, beyond, hunting: b.hunting, distance: b.distance });
        }
      }
      const tele = cs?.tele.open ? { options: game.teleportOptions(i).map((o) => ({ label: o.label, detail: o.detail, distance: o.distance, dest: o.dest })), index: cs.tele.index, cooldown: p.teleportCd } : undefined;
      let aim: PlayerHud['aim'];
      if (p.aiming && cs) {
        const t = lockA && isAlive(lockA) ? lockA : undefined;
        aim = { hasTarget: !!t, inRange: !!t && p.aimInRange, name: t ? creature(t.creature).name : undefined, color: t ? BAND_COLOR[bandOf(p, t)] : '#eefaf6', ready: p.pounceCd === 0 && p.stamina >= 12 };
      }
      return {
        index: i, creature: p.creature, color: PLAYER_COLORS[i % 4], alive: p.state !== 'dead', aim,
        hp: p.hp, hpMax: p.hpMax, stamina: p.stamina, staminaMax: p.staminaMax, exhausted: p.exhausted > 0,
        tier: p.tier, tierName: TIER_NAMES[p.tier], progress: p.tier >= 4 ? 1 : clamp(p.nutrition / TIER_NEED[p.tier], 0, 1), scale: p.scale,
        abilityName: def.abilityName, abilityReady: 1 - clamp(p.abilityCd / def.abilityCooldown, 0, 1), abilityActive: p.abilityActive, abilityUnlocked: p.tier >= 2 || game.mode === 'reef' || game.mode === 'hunted',
        senseReady: 1 - clamp(p.senseCd / 6, 0, 1),
        lock: lockA && isAlive(lockA) ? { name: creature(lockA.creature).name, band: bandOf(p, lockA), hp: lockA.hp / lockA.hpMax, color: BAND_COLOR[bandOf(p, lockA)] } : undefined,
        hunted: p.hunted, hunterAngle, hunterName: hunter ? creature(hunter.creature).name : undefined,
        hunterState: p.hunted >= 0.5 ? 'hunting' : p.hunted > 0.2 ? 'noticed' : 'none', inCover: p.cover > 0.3, still: Math.hypot(p.vel.x, p.vel.y, p.vel.z) < 0.3,
        hint: game.hintFor(i), respawnIn: p.state === 'dead' ? Math.max(0, 3 - p.respawnT) : 0, fade: cs?.fade ?? 0, state: p.state, modelReady: !!loadedSync(p.creature),
        kills: p.kills, eats: p.eats, escapes: p.escapes, protect: p.spawnProtect > 0, bandMarkers: markers.slice(0, 24),
        biome: BIOME_NAMES[game.biomeOf(i) ?? 'shelf'], radar: { range: radarRange, blips }, teleport: tele,
      };
    });
    return { players, rects, time: game.time, status: game.state.status, message: game.state.message, mode: game.mode, winner: game.state.winner, fps: this.fps };
  }

  /** Live render/sim counters, for profiling. */
  stats() {
    const info = this.renderer.info;
    return {
      players: this.cams.length, views: this.views.size, actors: this.game?.actors.length ?? 0,
      calls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length ?? 0,
      sea: this.sea?.stats(), simChunks: this.game?.world.chunks.size ?? 0,
      frameMs: +this.frameMs.toFixed(2), simMs: +this.simMs.toFixed(2), renderMs: +this.renderMs.toFixed(2), fps: +this.fps.toFixed(1),
    };
  }
  private frameMs = 0; private simMs = 0; private renderMs = 0;

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.keyboard.dispose();
    this.assets.dispose();
    this.clearMatch();
    this.sea?.dispose();
    this.bubbles.dispose(); this.sparkles.dispose(); this.impacts.dispose(); this.silt.dispose();
    this.ringGeo.dispose(); this.shieldGeo.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export { TAU };
