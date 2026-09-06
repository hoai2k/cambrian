import * as THREE from 'three';
import { audio } from '../audio/audio';
import { emptyControls, gamepads, KeyboardInput, readGamepad, rumble, type RawControls } from '../input/input';
import { clamp, damp, TAU, wrapAngle } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from '../sim/actors';
import { creature, type CreatureId } from '../sim/creatures';
import { Game } from '../sim/game';
import { BAND_COLOR, emptyInput, TIER_NAMES, TIER_NEED, type Actor, type Band, type InputFrame, type Mode, type PlayerSetup } from '../sim/types';
import { groundHeight, NURSERIES, resolveStatic, SURFACE_Y, type Boulder } from '../sim/world';
import { AssetQueue, type AssetProgress } from './assets';
import { CreatureView, ensureLoaded, loadedSync } from './creature';
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
  hunted: number; hunterAngle: number | null; hunterName?: string;
  hint?: string; respawnIn: number; state: string; kills: number; eats: number; escapes: number; protect: boolean;
  bandMarkers: { x: number; y: number; band: Band; size: number }[];
}
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

interface CamState { yawOff: number; pitch: number; pos: THREE.Vector3; look: THREE.Vector3; shake: number; camera: THREE.PerspectiveCamera; lockBlend: number; }

/** Magnification levels (see docs/redesign/01-game-design.md · Magnification). */
export const MAGNIFICATION = [
  { name: 'Micro', maxLength: 1.0 }, { name: 'Small', maxLength: 2.0 }, { name: 'Mid', maxLength: 4.5 }, { name: 'Large', maxLength: 8 }, { name: 'Colossal', maxLength: Infinity },
] as const;
export const magnificationLevel = (L: number) => MAGNIFICATION.find((m) => L < m.maxLength) ?? MAGNIFICATION[4];
/** Follow-camera distance for a body length: about two body lengths back plus a floor so larvae are still readable. */
export const magnificationDistance = (L: number) => L * 2.0 + 2.0 + Math.max(0, 0.8 - L) * 1.5;

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
  private ringGeo = new THREE.RingGeometry(0.72, 0.85, 40);
  private cams: CamState[] = [];
  private attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private bubbles = new Bubbles();
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
  private tmpV = new THREE.Vector3();
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
    container.appendChild(this.renderer.domElement);
    this.scene.add(this.bubbles.points, this.impacts.group, this.silt.group);
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(container);
    this.onResize();
    this.startAttract();
    this.raf = requestAnimationFrame(this.frame);
    // Stream assets by priority: the default pick first so the title can show, everything else on idle time.
    this.assets.onProgress((p) => {
      this.cb.onProgress?.(p);
      if (!this.bootDone && p.ready.has('anomalocaris') && p.ready.has('waptia')) { this.bootDone = true; this.cb.onLoaded(); }
    });
    this.assets.prioritize(['anomalocaris', 'waptia', 'marrella', 'opabinia', 'canadia', 'olenoides', 'hallucigenia', 'wiwaxia'], 'boot');
  }
  readonly assets = new AssetQueue();
  private bootDone = false;
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
      const cs: CamState = { yawOff: 0, pitch: 0.22, pos: new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y + 2.5, p.pos.z - Math.cos(p.yaw) * 6), look: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), shake: 0, camera: cam, lockBlend: 0 };
      cam.position.copy(cs.pos); cam.lookAt(cs.look);
      return cs;
    });
    this.paused = false;
    audio.play('ui-start');
  }

  private clearMatch() {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
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
    void a;
    return f;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dtReal = Math.min((now - this.last) / 1000, 0.08);
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
        if (p && running) inputs.set(i, this.toInput(c, this.cams[i], p));
        // camera orbit
        if (running) {
          const cs = this.cams[i];
          cs.yawOff = wrapAngle(cs.yawOff + c.lookX * dt * 2.6 * this.lookSpeed);
          cs.pitch = clamp(cs.pitch + c.lookY * dt * 1.6 * this.lookSpeed * (this.invertY ? -1 : 1), -0.55, 1.15);
          if (Math.abs(c.lookX) < 0.05 && Math.hypot(c.mx, c.my) > 0.3) cs.yawOff = damp(cs.yawOff, 0, 1.6, dt);
          if (Math.abs(c.lookY) < 0.05) cs.pitch = damp(cs.pitch, 0.22, 0.6, dt);
        }
      });
    }

    // Fixed step
    if (running) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 5) { game.step(1 / 60, inputs); this.acc -= 1 / 60; steps++; }
      if (steps === 5) this.acc = 0;
    }
    this.keyboard.endFrame();

    // Events → fx / audio / rumble
    this.handleEvents(game);

    // Cameras
    const camPositions: THREE.Vector3[] = [];
    if (this.attract) {
      this.attractT += dt;
      const n = NURSERIES[Math.floor(this.attractT / 40) % NURSERIES.length];
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
    this.sea?.update(this.time, dt, focus);

    // Views
    this.syncViews(game, camPositions, dt);
    this.bubbles.update(dt);
    this.impacts.update(dt, focus);
    this.silt.sync(game.silt, this.time);

    // Render
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const r = this.renderer;
    r.setScissorTest(false); r.setViewport(0, 0, W, H); r.clear();
    if (this.attract) {
      this.applyRings(-1, undefined);
      this.sea?.setViewLength(1.2);
      this.attractCam.aspect = W / H; this.attractCam.updateProjectionMatrix();
      r.render(this.scene, this.attractCam);
    } else {
      const rects = layoutRects(this.cams.length, W, H);
      r.setScissorTest(true);
      this.cams.forEach((cs, i) => {
        const rc = rects[i];
        this.applyRings(i, game.players[i]);
        this.sea?.setViewLength(lengthOf(game.players[i]));
        cs.camera.aspect = rc.w / rc.h; cs.camera.updateProjectionMatrix();
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
  }

  private updateCamera(cs: CamState, p: Actor, dt: number) {
    const L = lengthOf(p);
    const def = creature(p.creature);
    const target = p.lockTarget >= 0 ? this.game!.byId(p.lockTarget) : undefined;
    const locked = !!target && isAlive(target);
    cs.lockBlend = damp(cs.lockBlend, locked ? 1 : 0, 5, dt);
    // Magnification: camera distance and framing scale with body length so the world re-reads at every tier.
    let dist = magnificationDistance(L);
    if (p.state === 'dead') dist *= 1.5;
    if (p.hunted > 0.5) dist *= 0.85;
    let yaw = p.yaw + cs.yawOff;
    const lookAt = new THREE.Vector3(p.pos.x, p.pos.y + L * 0.15, p.pos.z);
    if (locked && target) {
      const dx = target.pos.x - p.pos.x, dz = target.pos.z - p.pos.z;
      const ty = Math.atan2(dx, dz);
      yaw = wrapAngle(ty + cs.yawOff * 0.35);
      const d = Math.hypot(dx, dz, target.pos.y - p.pos.y);
      lookAt.lerp(new THREE.Vector3(target.pos.x, target.pos.y, target.pos.z), 0.42 * cs.lockBlend);
      dist += Math.min(d * 0.35, L * 3) * cs.lockBlend;
    }
    const pitch = cs.pitch + (locked ? 0.1 : 0) + (def.ground ? 0.12 : 0);
    const desired = new THREE.Vector3(
      lookAt.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      lookAt.y + Math.sin(pitch) * dist + L * 0.25,
      lookAt.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    // keep camera out of the ground and boulders, below the surface
    const g = groundHeight(this.game!.world, desired.x, desired.z, this.scratchBoulders);
    desired.y = clamp(desired.y, g + 0.7, SURFACE_Y - 0.4);
    const pos = { x: desired.x, y: desired.y, z: desired.z };
    resolveStatic(this.game!.world, pos, 0.7, this.scratchBoulders);
    desired.set(pos.x, pos.y, pos.z);
    const k = p.state === 'dodge' ? 5 : 7;
    cs.pos.lerp(desired, 1 - Math.exp(-k * dt));
    cs.look.lerp(lookAt, 1 - Math.exp(-10 * dt));
    cs.shake = Math.max(0, cs.shake - dt * 2.2);
    const sh = cs.shake * cs.shake * 0.35;
    cs.camera.position.copy(cs.pos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    cs.camera.lookAt(cs.look);
    const baseFov = 64 - 9 * clamp(Math.log(L + 0.3) / Math.log(11), 0, 1);
    cs.camera.fov = damp(cs.camera.fov, baseFov + (p.burstT > 0 || (Math.hypot(p.vel.x, p.vel.z) > def.speed * Math.pow(p.scale, 0.45) * 1.25) ? 8 : 0) + p.hunted * 4, 4, dt);
    cs.camera.near = clamp(L * 0.06, 0.04, 0.5);
  }

  private syncViews(game: Game, cams: THREE.Vector3[], dt: number) {
    const keep = new Set<number>();
    const nearDist = (a: Actor) => { let best = Infinity; for (const c of cams) { const d = Math.hypot(a.pos.x - c.x, a.pos.y - c.y, a.pos.z - c.z); if (d < best) best = d; } return best; };
    const candidates: { a: Actor; d: number }[] = [];
    for (const a of game.actors) {
      const d = nearDist(a);
      if (d < 105 || a.controller === 'player') candidates.push({ a, d });
    }
    candidates.sort((x, y) => x.d - y.d);
    const cap = this.quality === 'high' ? 88 : 56;
    let count = 0;
    for (const { a, d } of candidates) {
      if (count >= cap && a.controller !== 'player') break;
      let v = this.views.get(a.id);
      if (!v) {
        const loaded = loadedSync(a.creature);
        if (!loaded) { void ensureLoaded(a.creature); continue; }
        v = new CreatureView(a.creature, loaded, { ringGeo: this.ringGeo });
        this.scene.add(v.group);
        this.views.set(a.id, v);
        v.update(a, 0, this.time, true);
      }
      keep.add(a.id); count++;
      // Animate far views less often
      const far = d > 45;
      const animate = !far || ((a.id + Math.floor(this.time * 60)) % 3 === 0);
      v.update(a, animate ? (far ? dt * 3 : dt) : dt, this.time, animate);
      v.group.visible = !(isHidden(a) && a.stateT > 0.6);
    }
    for (const [id, v] of this.views) if (!keep.has(id)) { v.dispose(); this.views.delete(id); }
  }

  /** Colour the rings for a given viewer before rendering their viewport. */
  private applyRings(playerIndex: number, viewer?: Actor) {
    const game = this.game!;
    for (const [id, v] of this.views) {
      const a = game.byId(id);
      if (!a) continue;
      if (!viewer || a.state === 'dead') { v.setRing(null, a && a.controller === 'player' && a.state !== 'dead' ? 0.5 : 0); v.setHighlight(0); continue; }
      if (a.id === viewer.id) { v.setRing(PLAYER_COLORS[playerIndex % 4], 0.28); v.setHighlight(0); continue; }
      const band = bandOf(viewer, a);
      const d = Math.hypot(a.pos.x - viewer.pos.x, a.pos.y - viewer.pos.y, a.pos.z - viewer.pos.z);
      const L = lengthOf(viewer);
      const sensing = viewer.senseT > 0 && d < creature(viewer.creature).sense * L * 1.2;
      const locked = viewer.lockTarget === a.id;
      const near = d < L * 7 + 4;
      const opacity = locked ? 0.95 : sensing ? 0.8 : near ? (band === 'snack' ? 0.18 : 0.42) : 0;
      v.setRing(BAND_COLOR[band], opacity * (a.controller === 'swarm' ? 0.5 : 1));
      v.setHighlight(sensing ? 0.55 + 0.25 * Math.sin(this.time * 9) : locked ? 0.12 : 0, BAND_COLOR[band]);
    }
  }

  private handleEvents(game: Game) {
    const evs = game.events;
    if (!evs.length) return;
    for (const e of evs) {
      const pan = 0;
      const playerActor = e.player != null && e.player >= 0 ? game.players[e.player] : undefined;
      const padOf = (pi: number | undefined) => (pi != null && pi >= 0 ? this.setups[pi]?.device : undefined);
      switch (e.kind) {
        case 'hit': {
          const s = e.strength ?? 1;
          this.bubbles.emit(e.pos, Math.round(6 + s * 10), 0.4, 2 + s * 2, 0.07);
          this.impacts.spawn(e.pos, '#ffd0a0', 0.5 + s * 0.8, 0.28);
          audio.play('hit', s, pan);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.4 + s * 0.4), 0.3, 120); this.shake(e.player, 0.5 + s * 0.5); }
          const attacker = game.byId(e.actor);
          if (attacker?.player != null && attacker.player >= 0) { const d = padOf(attacker.player); if (typeof d === 'number') rumble(d, 0.25, 0.5, 70); }
          break;
        }
        case 'kill': { this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.8); this.impacts.spawn(e.pos, '#ff8a6a', 1.5 + (e.strength ?? 1), 0.5); audio.play('kill', 1, pan); if (playerActor) this.shake(e.player!, 0.7); break; }
        case 'death': { audio.play('death'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 400); this.shake(e.player, 1.4); } break; }
        case 'eat': { this.bubbles.emit(e.pos, 5, 0.3, 1.2, 0.05, 0.8); audio.play('eat', e.strength ?? 0.5, pan); break; }
        case 'tierUp': { this.bubbles.emit(e.pos, 90, 2.5, 5, 0.14, 2.2); this.impacts.spawn(e.pos, '#fff0b0', 4 + (e.strength ?? 1) * 2, 0.9); audio.play('tierUp'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.8, 0.8, 600); this.shake(e.player, 0.8); } break; }
        case 'parry': { this.impacts.spawn(e.pos, '#9ff6ff', 2, 0.4); this.bubbles.emit(e.pos, 20, 0.6, 5, 0.08); audio.play('parry'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.9, 0.2, 90); } break; }
        case 'guardBreak': { this.impacts.spawn(e.pos, '#ff6a5a', 1.8, 0.4); audio.play('guardBreak'); break; }
        case 'stagger': { audio.play('stagger'); break; }
        case 'dodge': { this.bubbles.emit(e.pos, 14, 0.8, 2.5, 0.06, 0.7); audio.play('dodge'); break; }
        case 'silt': { this.bubbles.emit(e.pos, 30, 1.5, 2, 0.08, 1.2); audio.play('silt'); break; }
        case 'ability': { this.impacts.spawn(e.pos, '#c8fff0', 1.2 + (e.strength ?? 1) * 0.4, 0.45); this.bubbles.emit(e.pos, 20, 1, 3, 0.08); audio.play('ability'); break; }
        case 'grab': { this.impacts.spawn(e.pos, '#ffb070', 1.4, 0.35); audio.play('grab'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 0.6, 300); } break; }
        case 'hunted': { audio.play('hunted'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.6, 0.9, 500); } break; }
        case 'escape': { audio.play('escape'); break; }
        case 'noticed': { audio.play('noticed'); break; }
        case 'sense': { audio.play('sense'); break; }
        case 'burst': { audio.play('burst'); break; }
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
        const v = new THREE.Vector3(hunter.pos.x, hunter.pos.y, hunter.pos.z).project(cs.camera);
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
          const v = new THREE.Vector3(a.pos.x, a.pos.y + lengthOf(a) * 0.4, a.pos.z).project(cs.camera);
          if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
          if (band === 'rival' && d > L * 12 + 10 && p.senseT <= 0) continue;
          markers.push({ x: (v.x + 1) / 2, y: (1 - v.y) / 2, band, size: clamp(lengthOf(a) / Math.max(d, 1) * 8, 0.4, 1.6) });
        }
      }
      return {
        index: i, creature: p.creature, color: PLAYER_COLORS[i % 4], alive: p.state !== 'dead',
        hp: p.hp, hpMax: p.hpMax, stamina: p.stamina, staminaMax: p.staminaMax, exhausted: p.exhausted > 0,
        tier: p.tier, tierName: TIER_NAMES[p.tier], progress: p.tier >= 4 ? 1 : clamp(p.nutrition / TIER_NEED[p.tier], 0, 1), scale: p.scale,
        abilityName: def.abilityName, abilityReady: 1 - clamp(p.abilityCd / def.abilityCooldown, 0, 1), abilityActive: p.abilityActive, abilityUnlocked: p.tier >= 2 || game.mode === 'reef' || game.mode === 'hunted',
        senseReady: 1 - clamp(p.senseCd / 6, 0, 1),
        lock: lockA && isAlive(lockA) ? { name: creature(lockA.creature).name, band: bandOf(p, lockA), hp: lockA.hp / lockA.hpMax, color: BAND_COLOR[bandOf(p, lockA)] } : undefined,
        hunted: p.hunted, hunterAngle, hunterName: hunter ? creature(hunter.creature).name : undefined,
        hint: game.hintFor(i), respawnIn: p.state === 'dead' ? Math.max(0, 4.5 - p.respawnT) : 0, state: p.state,
        kills: p.kills, eats: p.eats, escapes: p.escapes, protect: p.spawnProtect > 0, bandMarkers: markers.slice(0, 24),
      };
    });
    return { players, rects, time: game.time, status: game.state.status, message: game.state.message, mode: game.mode, winner: game.state.winner, fps: this.fps };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.keyboard.dispose();
    this.assets.dispose();
    this.clearMatch();
    this.sea?.dispose();
    this.bubbles.dispose(); this.impacts.dispose(); this.silt.dispose();
    this.ringGeo.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export { TAU };
