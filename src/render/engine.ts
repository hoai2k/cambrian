import { ACTIVE_ERA } from '../content';
import { BURROWERS, hideLabel } from '../sim/concealment';
import * as THREE from 'three';
import { audio, SAMPLES } from '../audio/audio';
import { distanceAtten, HUGE_LENGTH } from '../audio/mix';
import { emptyControls, gamepads, KeyboardInput, readGamepad, rumble, type RawControls } from '../input/input';
import { clamp, damp, TAU, wrapAngle } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from '../sim/actors';
import { creature, type CreatureId } from '../sim/creatures';
import { Game, radarRange as radarReach, type ScoreHeader, type ScoreRow, type TeleportDest } from '../sim/game';
import type { Phase } from '../sim/daynight';
import { BAND_COLOR, emptyInput, isCoop, TIER_NAMES, TIER_NEED, type Actor, type Band, type InputFrame, type Mode, type PlayerSetup } from '../sim/types';
import { BIOME_NAMES, biomeAt, groundHeight, nurseryAt, resolveStatic, SURFACE_Y, type Biome, type Boulder, type LandmarkKind } from '../sim/world';
import { AssetQueue, type AssetProgress } from './assets';
import { CreatureView, ensureLoaded, loadedSync, type Lod } from './creature';
import { Attachments } from './attachments';
import { Bubbles, Impacts, Silt, Splash } from './fx';
import { Mouthfuls } from './carcass';
import { createSea, type Quality, type SeaEnvironment } from './sea';
import { RULES, type EraHud } from '../sim/era-rules';

export interface Rect { x: number; y: number; w: number; h: number; }
export interface PlayerHud {
  index: number; creature: CreatureId; color: string; alive: boolean;
  hp: number; hpMax: number; stamina: number; staminaMax: number; exhausted: boolean;
  tier: number; tierName: string; progress: number; scale: number;
  abilityName: string; abilityReady: number; abilityActive: boolean; abilityUnlocked: boolean;
  senseReady: number;
  lock?: { name: string; kind?: string; band: Band; hp: number; color: string };
  aim?: { hasTarget: boolean; inRange: boolean; name?: string; color: string; ready: boolean; /** What RT does for this creature: POUNCE, or the special's own name. */ action: string };
  hunted: number; hunterAngle: number | null; hunterName?: string; hunterState: 'none' | 'noticed' | 'hunting'; inCover: boolean; still: boolean;
  hint?: string; respawnIn: number; fade: number; state: string; modelReady: boolean; kills: number; eats: number; escapes: number; protect: boolean;
  /**
   * Co-op: seconds left for a team-mate to reach this downed player, and the downed team-mates
   * this player could go and pick up (with the direction to swim, in radar space).
   */
  downedFor: number;
  /** 0..1 of the rescue dwell, for the downed player and for whoever is standing over them. */
  reviveProgress: number;
  downedAllies: { index: number; name: string; color: string; seconds: number; distance: number; x: number; y: number; progress: number }[];
  /** Versus: whose viewport this one is borrowing while dead. */
  spectating?: { index: number; name: string; color: string; creature: CreatureId };
  bandMarkers: { x: number; y: number; band: Band; size: number }[];
  /** Dominant biome under the player. */
  biome: string;
  /** The hour of the day, for the dial above the radar. */
  day: { phase: Phase; until: number; pressure: number };
  /** Radar contacts in radar space (x right, y down, unit circle = the radar's reach); `beyond` contacts are clamped to the rim. */
  radar: { range: number; blips: RadarBlipHud[] };
  /** The teleport menu, while open. */
  teleport?: { options: { label: string; detail: string; distance: number; dest: TeleportDest }[]; index: number; cooldown: number };
  /** The scoreboard, while the View button is held. */
  board?: { header: ScoreHeader; rows: ScoreRow[] };
  /** A short line from the simulation: a hand-over, a rescue. Outlives one frame. */
  notice?: string;
  /** The era's own meters (Devonian standing, air, range), when the era defines them. */
  era?: EraHud;
}
export interface RadarBlipHud {
  x: number; y: number; kind: 'player' | 'threat' | 'giant' | 'home' | 'shore' | 'deadzone' | 'food' | 'landmark' | 'territory';
  color: string; beyond: boolean; hunting: boolean; distance: number;
  /** Radius in radar units, for area contacts. */
  r?: number;
  /**
   * Whether the contact is well above or below the viewer, for contacts where that is a real
   * difference (creatures and shoals). A dial seen from overhead cannot show height, so the marks
   * carry it themselves: what is above you is what you look up for.
   */
  level?: 'above' | 'below';
}
export interface HudSnapshot {
  players: PlayerHud[]; rects: Rect[]; time: number; status: 'playing' | 'won' | 'lost'; message: string; mode: Mode; winner: number; fps: number;
  /** This match is over but its mode is co-op, so the results screen can offer to carry on. */
  canContinue: boolean;
  /** What this match turned up, for the results screen's record. */
  discovery: { biomes: Biome[]; landmarks: LandmarkKind[]; apex: CreatureId[] };
  /** The hour of the day: what it is, how long until it turns, and how much the reef is hunting. */
  day: { phase: Phase; until: number; pressure: number };
}
export interface EngineCallbacks {
  onHud(s: HudSnapshot): void;
  onMenu(player: number): void;
  onError(msg: string): void;
  onLoaded(): void;
  onProgress?(p: AssetProgress): void;
}

export const PLAYER_COLORS = ['#61f2d5', '#ffb457', '#c7a3ff', '#ff86a4'];

interface CamState { showBoard: boolean; yaw: number; pitch: number; zoom: number; fade: number; aimBlend: number; aimTarget: number; aimSnapT: number; pos: THREE.Vector3; look: THREE.Vector3; shake: number; camera: THREE.PerspectiveCamera; lockBlend: number; lastPos: THREE.Vector3; frustum: THREE.Frustum; projScreen: THREE.Matrix4; tele: TeleMenu; }
/** Per-player teleport menu state: opened with D-pad down, steered with the D-pad or stick, A confirms, B closes. */
interface TeleMenu { open: boolean; index: number; prev: { teleport: boolean; up: boolean; down: boolean; confirm: boolean; back: boolean }; }
const freshTele = (): TeleMenu => ({ open: false, index: 0, prev: { teleport: false, up: false, down: false, confirm: false, back: false } });

/** Magnification levels (see docs/redesign/01-game-design.md · Magnification). */
export const MAGNIFICATION = [
  { name: 'Micro', maxLength: 1.0 }, { name: 'Small', maxLength: 2.0 }, { name: 'Mid', maxLength: 4.5 }, { name: 'Large', maxLength: 8 }, { name: 'Colossal', maxLength: Infinity },
] as const;
export const magnificationLevel = (L: number) => MAGNIFICATION.find((m) => L < m.maxLength) ?? MAGNIFICATION[4];
/**
 * How much a body at `d` from the camera is washed toward the water colour, on top of the fog.
 * A far-off giant should read as pale background ambience and only resolve into a solid, dark,
 * obviously-present animal as it closes. Scaled by the viewport's far plane, which already tracks
 * magnification and the biome's fog, so a larva's short world and an apex's long one fade alike.
 */
export const distanceHaze = (d: number, far: number) => THREE.MathUtils.smoothstep(d, far * 0.12, far * 0.62) * 0.9;
/** Something hunting you keeps most of its presence, however far off: the warning has to read. */
export const HUNTER_HAZE = 0.4;

/** Radar colour for a shoal in the water above you, against the snack green of one on the floor. */
export const FOOD_ABOVE = '#9ec2ff';

/** Follow-camera distance for a body length: about two body lengths back plus a floor so larvae are still readable. */
export const magnificationDistance = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;

/**
 * How much of the camera's pitch the stick's forward should follow.
 *
 * A follow camera normally sits a little above the creature looking slightly down, and taking
 * that pitch literally means "forward" is partly "down" — hold forward from a resting view and
 * you swim into the seabed. Nothing is lost by ignoring it, because rising and sinking are their
 * own buttons: within FLAT_PITCH of level, forward is parallel to the seafloor. Past that the
 * camera is being aimed deliberately up or down, so its pitch eases in and takes over completely
 * by FULL_PITCH.
 */
/**
 * How far the camera may be aimed. Up is what matters for a swimmer: the water above you is where
 * the thing that eats you comes from, so the view has to reach it. Down goes almost overhead, which
 * is how you read the floor for prey while swimming over it.
 */
export const PITCH_UP = -0.95;   // ~54° above the horizon
export const PITCH_DOWN = 1.32;  // ~76° below it, near enough straight down at the seabed
const FLAT_PITCH = 0.45;   // ~26°, comfortably above a resting follow camera (which sits at ~11-25°)
const FULL_PITCH = 1.0;    // ~57°, by which the camera is clearly being pointed somewhere

export function swimPitch(pitch: number): number {
  const mag = Math.abs(pitch);
  const t = clamp((mag - FLAT_PITCH) / (FULL_PITCH - FLAT_PITCH), 0, 1);
  return clamp(Math.sign(pitch) * mag * (t * t * (3 - 2 * t)), -0.7, 0.7);
}

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

  // forward-facing cap (the model's +Z is its nose)
  private shieldGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42).rotateX(Math.PI / 2);
  private cams: CamState[] = [];
  /** Where the local views hear from, refreshed each frame; see `hearing()`. */
  private listeners: { pos: THREE.Vector3; right: THREE.Vector3; ref: number }[] = [];
  private attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private bubbles = new Bubbles();
  private mouthfuls = new Mouthfuls();
  private sparkles = new Bubbles(400, [1.0, 0.86, 0.5], 0.25);
  private impacts = new Impacts();
  private splash = new Splash(SURFACE_Y);
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
  private alpha = 1;
  private tmpPos = new THREE.Vector3(); private tmpPred = new THREE.Vector3();
  quality: Quality;

  constructor(private container: HTMLElement, quality: Quality, private cb: EngineCallbacks) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Carcasses are eaten away with per-material clipping planes (see carcass.ts).
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Split-screen renders the scene once per player; without this the shadow map is rebuilt every time.
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);
    this.scene.add(this.bubbles.points, this.sparkles.points, this.impacts.group, this.silt.group, this.splash.group, this.mouthfuls.group);
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
      if (!this.bootDone && (this.assets.isCardReady(ACTIVE_ERA.defaults.player) || performance.now() - this.bootStart > 4000)) { this.bootDone = true; this.cb.onLoaded(); }
    });
    this.assets.prioritize([...ACTIVE_ERA.defaults.boot], 'boot');
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

  /**
   * Carry a finished co-op match on rather than restarting it: same world, same bodies, same
   * progress, with the mode's goal no longer watching. Returns whether the match resumed.
   */
  continueMatch(): boolean { return this.game?.continueMatch() ?? false; }
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
    const n = nurseryAt(0);
    this.sea.prime(n.x, n.z);
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
    // Lay the seabed down before the first frame, or the match opens on a hole in the water.
    const start = this.game.players[0] ?? { pos: nurseryAt(0) };
    this.sea.prime(start.pos.x, start.pos.z);
    this.cams = setups.map((_, i) => {
      const p = this.game!.players[i];
      const cam = new THREE.PerspectiveCamera(60, 1, 0.08, 420);
      const cs: CamState = { showBoard: false, yaw: p.yaw, pitch: 0.2, zoom: 1, fade: 0, aimBlend: 0, aimTarget: -1, aimSnapT: 0, pos: new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y + 2.5, p.pos.z - Math.cos(p.yaw) * 6), look: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), shake: 0, camera: cam, lockBlend: 0, lastPos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), frustum: new THREE.Frustum(), projScreen: new THREE.Matrix4(), tele: freshTele() };
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
    f.camPitch = swimPitch(-Math.asin(clamp(fwd.y, -1, 1)));
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
        if (running) this.cams[i].showBoard = c.view && !menuOpen;
        if (running && !menuOpen) {
          const cs = this.cams[i];
          this.updateAim(cs, game.players[i], c.aim, dt);
          if (c.rsClick) {
            // Right stick pressed in: up/down zooms instead of pitching.
            cs.zoom = clamp(cs.zoom * Math.exp(c.lookY * dt * 1.6), 0.55, 2.2);
          } else {
            cs.yaw = wrapAngle(cs.yaw - c.lookX * dt * 2.6 * this.lookSpeed);
            cs.pitch = clamp(cs.pitch + c.lookY * dt * 1.6 * this.lookSpeed * (this.invertY ? -1 : 1), PITCH_UP, PITCH_DOWN);
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
      // How far this frame sits past the last completed step. The renderer interpolates across it,
      // so a display refreshing at 144 Hz shows smooth motion rather than each 60 Hz step held for
      // two or three frames.
      this.alpha = clamp(this.acc * 60, 0, 1);
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
    this.sea?.update(this.time, dt, focus, camPositions, this.attract ? undefined : game.time);
    // Tell the music where the first player is; a biome with a track of its own cues it.
    const listener = game.players[0];
    if (listener && !this.attract) audio.setBiome(biomeAt(listener.pos.x, listener.pos.z));

    // Views
    this.syncViews(game, camPositions, dt);
    this.bubbles.update(dt); this.sparkles.update(dt); this.splash.update(dt); this.mouthfuls.update(dt);
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
        const density = this.sea?.setViewLength(lengthOf(game.players[i]), cs.camera.position.x, cs.camera.position.z, cs.camera.position.y) ?? 0.0105;
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
      // Another player can be aimed at, but never handed to you: the entry snap ignores them and
      // the crosshair has to be genuinely on one for it to take.
      const rival = o.controller === 'player';
      if (rival && !wasAiming) continue;
      const to = this.tmpDesired.set(o.pos.x - cs.camera.position.x, o.pos.y - cs.camera.position.y, o.pos.z - cs.camera.position.z);
      const d = to.length(); if (d < 0.01) continue;
      to.divideScalar(d);
      // angular distance from the crosshair, widened slightly for close/large targets
      const ang = Math.acos(clamp(fwd.dot(to), -1, 1)) - Math.min(0.08, lengthOf(o) * 0.5 / d);
      const bandW = rival ? 2.4 : band === 'prey' ? 0.85 : band === 'snack' ? 1 : 1.25;
      if (ang * bandW < bestAng) { bestAng = ang * bandW; best = o; }
    }
    const cone = cs.aimSnapT > 0 || !wasAiming ? 0.6 : 0.2;   // wide on entry (snap), tight afterwards
    if (best && bestAng < cone) {
      cs.aimTarget = best.id;
      if (!wasAiming) cs.aimSnapT = 0.25;
      if (cs.aimSnapT > 0) {
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

  /** The transform the renderer is drawing this actor at: interpolated across the current step. */
  private renderPos(a: Actor, out: THREE.Vector3) {
    const t = a.prevT;
    const k = Math.hypot(a.pos.x - t.x, a.pos.y - t.y, a.pos.z - t.z) > Math.max(2, lengthOf(a) * 3) ? 1 : this.alpha;
    return out.set(t.x + (a.pos.x - t.x) * k, t.y + (a.pos.y - t.y) * k, t.z + (a.pos.z - t.z) * k);
  }

  /**
   * Who a dead player's camera follows. Only in the versus modes, where there is a race to watch,
   * and never when you are inside something — being eaten is its own shot. The leader is whoever
   * is furthest along, so the viewport shows the thing you are about to respawn behind.
   */
  private spectatorTarget(game: Game, i: number): Actor | undefined {
    const p = game.players[i];
    if (!p || p.state !== 'dead' || p.swallowedBy >= 0) return undefined;
    if (game.mode === 'rise' || game.mode === 'reef') return undefined;      // co-op: stay on your own body to be revived
    let best: Actor | undefined, score = -Infinity;
    for (const a of game.actors) {
      if (a === p || a.player < 0 || !isAlive(a)) continue;
      if (a.controller !== 'player' && a.controller !== 'bot') continue;
      const s = a.tier + a.nutrition / Math.max(1, TIER_NEED[a.tier]);
      if (s > score) { score = s; best = a; }
    }
    return best;
  }

  private updateCamera(cs: CamState, p0: Actor, dt: number) {
    // While spectating, everything below frames the watched player instead. The dead player's own
    // camera state (yaw, zoom, shake) is reused, so the handover is a cut, not a new rig.
    const p = this.spectatorTarget(this.game!, p0.player) ?? p0;
    const L = lengthOf(p);
    // Follow where the creature is drawn, not where the simulation last put it.
    const pp = this.renderPos(p, this.tmpPos);
    const def = creature(p.creature);
    const target = p.lockTarget >= 0 ? this.game!.byId(p.lockTarget) : undefined;
    const locked = !!target && isAlive(target) && !p.aiming;
    cs.lockBlend = damp(cs.lockBlend, locked ? 1 : 0, 5, dt);
    // Magnification: camera distance and framing scale with body length so the world re-reads at every tier.
    let dist = magnificationDistance(L) * cs.zoom * (1 - 0.3 * cs.aimBlend);
    if (p.state === 'dead') dist *= 1.5;
    if (p.hunted > 0.5) dist *= 0.85;
    // Snap in behind the creature when it teleports (respawn), otherwise keep the player's framing.
    const jumped = cs.lastPos.distanceTo(pp) > 20;
    cs.lastPos.copy(pp);
    if (jumped) { cs.yaw = p.yaw; cs.fade = 1; }
    // Eaten: ride along with the predator from the same angle until the respawn.
    const pred = (p.state === 'swallowed' || (p.state === 'dead' && p.swallowedBy >= 0)) ? this.game!.byId(p.swallowedBy) : undefined;
    const lookAt = pred
      ? this.renderPos(pred, this.tmpLook).setY(this.tmpLook.y + lengthOf(pred) * 0.1)
      : this.tmpLook.set(pp.x, pp.y + L * 0.15, pp.z);
    if (pred) dist = magnificationDistance(lengthOf(pred)) * cs.zoom * 0.85;
    // Fade to black just before the respawn, and in again just after. Always the real player's
    // own death, never the spectated one's: this viewport's owner is the one coming back.
    const dying = p0.state === 'dead' || p0.state === 'swallowed';
    const respawnAt = this.game!.reviveWindow(p0) ? Infinity : 2.6;   // a downed player waiting on an ally never fades out
    const fadeTarget = dying && (p0.state === 'dead' ? p0.respawnT : p0.stateT) > (p0.state === 'dead' ? respawnAt : 99) ? 1 : 0;
    cs.fade = damp(cs.fade, fadeTarget, fadeTarget > cs.fade ? 6 : 4, dt);
    if (locked && target) {
      const tp = this.renderPos(target, this.tmpPred);
      const dx = tp.x - pp.x, dz = tp.z - pp.z;
      const ty = Math.atan2(dx, dz);
      // Lock-on eases the camera behind the player relative to the target; the stick still works.
      cs.yaw = wrapAngle(cs.yaw + wrapAngle(ty - cs.yaw) * (1 - Math.exp(-2.5 * dt)));
      const d = Math.hypot(dx, dz, tp.y - pp.y);
      lookAt.lerp(tp, 0.42 * cs.lockBlend);
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
    const place = (d: number) => this.tmpDesired.set(
      lookAt.x - Math.sin(yaw) * Math.cos(pitch) * d,
      lookAt.y + Math.sin(pitch) * d + L * 0.18,
      lookAt.z - Math.cos(yaw) * Math.cos(pitch) * d,
    );
    const desired = place(dist);
    // Looking up from the seabed puts the camera under the sand, and simply lifting it back out
    // flattens the view — exactly when the player is trying to see what is above them. Pull the
    // camera in instead: a shorter arm at the same angle clears the floor and keeps the aim.
    const floorFor = (v: THREE.Vector3) => groundHeight(this.game!.world, v.x, v.z, this.scratchBoulders) + 0.7;
    const rise = -Math.sin(pitch);
    if (rise > 0.05) for (let it = 0; it < 3 && desired.y < floorFor(desired); it++) {
      dist = Math.max(L * 0.55, dist - (floorFor(desired) - desired.y) / rise);
      place(dist);
    }
    // keep camera out of the ground and boulders, and below the surface unless the player has left the water
    const g = groundHeight(this.game!.world, desired.x, desired.z, this.scratchBoulders);
    desired.y = clamp(desired.y, g + 0.7, p.airborne ? SURFACE_Y + 40 : SURFACE_Y - 0.4);
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
        v = new CreatureView(a.creature, loaded, { shieldGeo: this.shieldGeo }, wantLod);
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
      v.update(a, animate && far && !continuous ? dt * 3 : dt, this.time, animate, this.alpha);
      // A carcass shows what has been taken out of it, and gets whole again when its owner
      // respawns into the same view.
      if (a.state === 'dead' && a.eatBites > 1 && a.eaten > 0) v.carcass.setEaten(a.eaten);
      else if (a.state !== 'dead' && a.eaten <= 0) v.restoreCarcass();
    }
    this.attachments.sync(game, this.views, dt);
    for (const [id, v] of this.views) if (!keep.has(id)) { v.dispose(); this.views.delete(id); }
  }

  /**
   * A mouthful comes off the carcass: the eaten share stops being drawn on the body, and the
   * slice that just left it is baked out of the pose and flown into the eater's mouth.
   */
  private tearOff(corpse: Actor, eaterId: number | undefined, share: number) {
    const view = this.views.get(corpse.id); if (!view) return;
    const eater = eaterId != null ? this.views.get(eaterId) : undefined;
    // Which end goes first is decided by where the mouth was for the opening bite.
    if (eater?.anchors.world('anchor_mouth', this.tmpV)) view.carcass.faceEater(this.tmpV);
    const to = corpse.eaten, from = Math.max(0, to - share);
    const chunk = view.carcass.sliceChunk(from, to);
    view.carcass.setEaten(to);
    if (!chunk) return;
    const mouth = new THREE.Vector3();
    const id = eaterId;
    this.mouthfuls.add(chunk, () => {
      const ev = id != null ? this.views.get(id) : undefined;
      if (ev?.anchors.world('anchor_mouth', mouth)) return mouth;
      const a = id != null ? this.game?.byId(id) : undefined;
      return a ? mouth.set(a.pos.x, a.pos.y, a.pos.z) : undefined;
    });
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

  /** Per-viewport pass: cull views outside this camera, then set the highlights for this viewer. */
  private prepareViewport(playerIndex: number, viewer?: Actor, cs?: CamState) {
    const game = this.game!;
    // This viewport's own camera and water colour: setViewLength has already applied the biome's
    // fog for it, so the haze washes distant bodies toward exactly the water they are seen through.
    const camPos = cs?.camera.position ?? this.attractCam.position;
    const camFar = cs?.camera.far ?? this.attractCam.far;
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
        v.group.visible = (!isHidden(a) || a.hideT <= 0.6) && cs.frustum.intersectsSphere(this.cullSphere);
        if (!v.group.visible) continue;
      }
      const haze = distanceHaze(Math.hypot(v.group.position.x - camPos.x, v.group.position.y - camPos.y, v.group.position.z - camPos.z), camFar);
      v.setHaze(haze);
      if (!viewer || a.state === 'dead' || a.state === 'swallowed') { v.setHighlight(0); continue; }
      if (a.id === viewer.id) { v.setHighlight(0); continue; }
      const band = bandOf(viewer, a);
      const d = Math.hypot(a.pos.x - viewer.pos.x, a.pos.y - viewer.pos.y, a.pos.z - viewer.pos.z);
      const L = lengthOf(viewer);
      const sensing = viewer.senseT > 0 && d < creature(viewer.creature).sense * L * 1.2;
      const locked = viewer.lockTarget === a.id;
      const huntingMe = a.brain?.target === viewer.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
      if (huntingMe) { v.setHaze(haze * HUNTER_HAZE); v.setHighlight(a.brain!.goal === 'hunt' ? 0.45 + 0.3 * Math.sin(this.time * 10) : 0.25 + 0.1 * Math.sin(this.time * 6), '#ff4b5c'); }
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
      /**
       * Big bodies get their own take of a sound. The Devonian roster runs 4-11.5 m against the
       * Cambrian's 1-3.9 m, and without this a Titanichthys hits exactly as hard as a larva.
       */
      const heavy = (kind: string, id: number | undefined) => {
        const a = id != null ? game.byId(id) : undefined;
        const big = `${kind}-huge`;
        return a && lengthOf(a) >= HUGE_LENGTH && SAMPLES[big] ? big : kind;
      };
      switch (e.kind) {
        case 'hit': {
          const s = e.strength ?? 1;
          const at = this.impactPos(e.actor, e.other, e.pos);
          this.bubbles.emit(at, Math.round(6 + s * 10), 0.4, 2 + s * 2, 0.07);
          this.impacts.spawn(at, '#ffd0a0', 0.5 + s * 0.8, 0.28);
          world(heavy('hit', e.actor), at, s);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.4 + s * 0.4), 0.3, 120); this.shake(e.player, 0.5 + s * 0.5); }
          const attacker = game.byId(e.actor);
          if (attacker?.player != null && attacker.player >= 0) { const d = padOf(attacker.player); if (typeof d === 'number') rumble(d, 0.25, 0.5, 70); }
          break;
        }
        case 'kill': { this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.8); this.impacts.spawn(e.pos, '#ff8a6a', 1.5 + (e.strength ?? 1), 0.5); world('kill', e.pos); if (playerActor) this.shake(e.player!, 0.7); break; }
        case 'death': { const dk = heavy('death', e.actor); if (e.player != null && e.player >= 0) audio.play(dk); else world(dk, e.pos, 1, 0.7); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 400); this.shake(e.player, 1.4); } break; }
        case 'eat': {
          const s = e.strength ?? 0.5;
          const big = s > 0.5 && heavy('crunch', e.actor) === 'crunch-huge';
          this.bubbles.emit(e.pos, 5, 0.3, 1.2, 0.05, 0.8); world(big ? 'crunch-huge' : 'eat', e.pos, s);
          // A body eaten in bites loses that share of itself, and the mouthful flies to the mouth.
          const corpse = e.other != null ? game.byId(e.other) : undefined;
          if (corpse && corpse.eatBites > 1 && e.strength) this.tearOff(corpse, e.actor, e.strength);
          break;
        }
        case 'tierUp': { this.bubbles.emit(e.pos, 90, 2.5, 5, 0.14, 2.2); this.impacts.spawn(e.pos, '#fff0b0', 4 + (e.strength ?? 1) * 2, 0.9); if (e.player != null && e.player >= 0) audio.play('tierUp'); else world('tierUp', e.pos, 1, 0.6); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.8, 0.8, 600); this.shake(e.player, 0.8); } break; }
        case 'parry': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#9ff6ff', 2, 0.4); this.bubbles.emit(at, 20, 0.6, 5, 0.08); world(RULES && e.strength != null && e.strength < 1 ? (e.strength < 0.5 ? 'armour' : 'armourPierce') : 'parry', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.9, 0.2, 90); } break; }
        case 'guardBreak': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#ff6a5a', 1.8, 0.4); world('guardBreak', at); break; }
        case 'stagger': { world('stagger', e.pos); break; }
        case 'dodge': { this.bubbles.emit(e.pos, 14, 0.8, 2.5, 0.06, 0.7); world(heavy('dodge', e.actor), e.pos); break; }
        case 'silt': { this.bubbles.emit(e.pos, 30, 1.5, 2, 0.08, 1.2); world('silt', e.pos); break; }
        // A special is your own action, not something happening to you, so its tell is the quietest
        // in the game: a few sparkles close to the body that say "this one is not the ordinary
        // heavy". Deliberately under the shoal-join burst, and well under anything that means
        // damage — a flash here read as being hit or respawning, which is why it is gone.
        case 'ability': { const len = e.strength ?? 1; this.sparkles.emit(e.pos, Math.round(5 + len * 2), 0.25 + len * 0.18, 0.25 + len * 0.1, 0.035, 0.5); this.bubbles.emit(e.pos, 20, 1, 3, 0.08); const ab = game.byId(e.actor); const key = ab ? `ability:${creature(ab.creature).ability}` : 'ability'; world(SAMPLES[key] ? key : 'ability', e.pos); break; }
        case 'shellCrush': { this.impacts.spawn(e.pos, '#ffd9a0', 2.2, 0.5); this.bubbles.emit(e.pos, 28, 0.8, 4, 0.1, 1.4); world('shellCrush', e.pos); break; }
        case 'grab': { const at = this.impactPos(e.actor, e.other, e.pos); this.impacts.spawn(at, '#ffb070', 1.4, 0.35); world('grab', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 0.6, 300); } break; }
        case 'hunted': { personal('hunted'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.6, 0.9, 500); } break; }
        case 'escape': { personal('escape'); break; }
        case 'noticed': { personal('noticed', 0.5); break; }
        case 'sense': { if (e.player != null && e.player >= 0) audio.play('sense'); else world('sense', e.pos, 1, 0.5); break; }
        case 'swallow': { world('swallow', e.pos, 1.2); this.bubbles.emit(e.pos, 30, 1, 3, 0.09, 1.5); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 1, 1, 900); this.shake(e.player, 1.2); } break; }
        case 'disintegrate': { this.sparkles.emit(e.pos, Math.round(28 + (e.strength ?? 1) * 10), 0.5 + (e.strength ?? 1) * 0.25, 0.9, 0.06, 2.2); world('disintegrate', e.pos, 0.6); break; }
        case 'routed': { world('routed', e.pos, 0.8); this.impacts.spawn(e.pos, '#9ff6ff', 2.5, 0.6); break; }
        case 'pounce': { this.impacts.spawn(e.pos, '#ffe08a', 1.2 + (e.strength ?? 1) * 0.5, 0.35); this.bubbles.emit(e.pos, 24, 0.9, 4, 0.08); world('pounce', e.pos, 1.3); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.7, 0.4, 140); this.shake(e.player, 0.6); } break; }
        case 'burst': { const b = game.byId(e.actor); world(b && RULES?.jet(b) ? 'jet' : heavy('burst', e.actor), e.pos); if (b && RULES?.jet(b)) this.bubbles.emit(e.pos, 30, 0.9, 3, 0.1, 1.4); break; }
        // Hatching out of a nursery after a respawn (the moult state is reused for the hatch-in).
        case 'moult': { if (e.player != null && e.player >= 0) audio.play(e.strength === 1 && RULES ? 'moult' : 'respawn'); else world('respawn', e.pos, 1, 0.5); break; }
        // Era events (Devonian). Their samples are registered by the era's entry page; an
        // unregistered kind is silent, so the Cambrian build never reaches for a missing file.
        case 'breach': {
          // a sheet of water dragged up with the body as it leaves the sea, and bubbles under it
          const b = game.byId(e.actor), bl = b ? lengthOf(b) : 1;
          this.splash.burst(e.pos, e.strength ?? 1, 'out', bl);
          this.bubbles.emit(e.pos, 30, 1.2, 4, 0.1, 1.6);
          world('breach', e.pos, e.strength ?? 1);
          break;
        }
        case 'splash': {
          // the landing: a crown of droplets, a ring spreading on the surface, a cloud of bubbles below
          const s = e.strength ?? 1, b = game.byId(e.actor), bl = b ? lengthOf(b) : 1;
          this.splash.burst(e.pos, s, 'in', bl);
          this.bubbles.emit(e.pos, Math.round(70 * s), 1.6, 6, 0.12, 2.4);
          world('splash', e.pos, s);
          if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, Math.min(1, 0.5 * s), 0.6, 220); this.shake(e.player, 0.6 * s); }
          break;
        }
        case 'gulp': { this.bubbles.emit(e.pos, 24, 1.0, 3, 0.09, 1.4); personal('gulp'); break; }
        case 'anoxia': { personal('anoxia', 0.8); break; }
        case 'beach': { if (e.strength) { this.bubbles.emit(e.pos, 12, 0.5, 2, 0.06, 1); personal('beach', 0.9); } break; }
        case 'shoalJoin': { this.sparkles.emit(e.pos, 16, 0.6, 1.2, 0.05, 1.2); personal('shoalJoin', 0.7); break; }
        case 'rangeClaim': { personal('rangeClaim'); break; }
        case 'rangeLost': { personal('rangeLost'); break; }
        case 'dominant': { this.sparkles.emit(e.pos, 60, 1.2, 1.8, 0.08, 2.2); personal('dominant'); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.6, 0.6, 500); } break; }
        case 'teleport': {
          // sparkles where they left and where they arrived; the camera snaps behind them on arrival
          this.sparkles.emit(e.pos, e.strength ? 50 : 30, 0.9, 1.4, 0.07, 1.8);
          this.bubbles.emit(e.pos, 20, 0.8, 3, 0.07, 1.2);
          if (e.strength) {
            personal('ability', 0.8);
            this.sea?.prime(e.pos.x, e.pos.z, 220);     // arrive on solid ground, not in a hole
            if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.5, 0.7, 250); }
          }
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
      const era = RULES?.hud(game, i);
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
      const radarRange = radarReach(p);
      const blips: RadarBlipHud[] = [];
      if (cs) {
        const sy = Math.sin(cs.yaw), cy = Math.cos(cs.yaw);
        // Above or below counts once the gap is more than a body or two; inside that the contact is
        // level with you for all practical purposes and the mark should not keep changing colour.
        const levelBand = Math.max(2.5, lengthOf(p) * 1.5);
        for (const b of game.radarFor(i, radarRange)) {
          // forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
          const f = (b.dx * sy + b.dz * cy) / radarRange, r = (-b.dx * cy + b.dz * sy) / radarRange;
          let x = r, y = -f;
          const l = Math.hypot(x, y);
          const beyond = l > 1;
          if (beyond) { x /= l; y /= l; }
          const level = b.kind === 'home' || b.kind === 'shore' || b.kind === 'landmark' || b.kind === 'territory' || Math.abs(b.dy) < levelBand
            ? undefined : b.dy > 0 ? 'above' as const : 'below' as const;
          // A shoal overhead is a different decision from one on the sand — rise for it, or dive —
          // so it gets its own colour rather than sitting on the dial as the same green mark.
          const color = b.kind === 'player' ? PLAYER_COLORS[b.id % 4] : b.kind === 'giant' ? BAND_COLOR.giant : b.kind === 'threat' ? BAND_COLOR.threat
            : b.kind === 'food' ? (level === 'above' ? FOOD_ABOVE : BAND_COLOR.snack) : b.kind === 'home' ? '#9be9ff' : b.kind === 'landmark' ? '#ffd9a0'
            : b.kind === 'territory' ? BAND_COLOR.rival : '#d9cfa4';
          blips.push({ x, y, kind: b.kind, color, beyond, hunting: b.hunting, distance: b.distance, r: b.radius != null ? b.radius / radarRange : undefined, level });
        }
        // Dead zones are areas, not contacts: drawn as rings, clamped to the rim like anything else.
        if (era) for (const z of era.deadZones) {
          const f = (z.dx * sy + z.dz * cy) / radarRange, r = (-z.dx * cy + z.dz * sy) / radarRange;
          let x = r, y = -f;
          const l = Math.hypot(x, y), beyond = l > 1;
          if (beyond) { x /= l; y /= l; }
          blips.push({ x, y, kind: 'deadzone', color: '#8fd66a', beyond, hunting: false, distance: Math.hypot(z.dx, z.dz), r: z.r / radarRange });
        }
      }
      const tele = cs?.tele.open ? { options: game.teleportOptions(i).map((o) => ({ label: o.label, detail: o.detail, distance: o.distance, dest: o.dest })), index: cs.tele.index, cooldown: p.teleportCd } : undefined;
      const board = cs?.showBoard ? game.scoreboard(i) : undefined;
      // Co-op: team-mates on the floor waiting to be picked up, as a bearing this player can follow.
      const downed: PlayerHud['downedAllies'] = [];
      if (cs) for (let j = 0; j < game.players.length; j++) {
        const o = game.players[j];
        if (j === i || !o || o.state !== 'dead') continue;
        const seconds = game.reviveWindow(o);
        if (seconds <= 0) continue;
        const dx = o.pos.x - p.pos.x, dz = o.pos.z - p.pos.z;
        const sy = Math.sin(cs.yaw), cy = Math.cos(cs.yaw);
        const f = dx * sy + dz * cy, r = -dx * cy + dz * sy;
        const l = Math.max(1e-3, Math.hypot(f, r));
        downed.push({ index: j, name: creature(o.creature).name, color: PLAYER_COLORS[j % 4], seconds, distance: Math.hypot(dx, dz), x: r / l, y: -f / l, progress: game.reviveProgress(o) });
      }
      // Versus: a dead player watches the leader rather than their own sinking body.
      const watched = this.spectatorTarget(game, i);
      const spectate = watched ? { index: watched.player, name: `P${watched.player + 1}`, color: PLAYER_COLORS[watched.player % 4], creature: watched.creature } : undefined;
      let aim: PlayerHud['aim'];
      if (p.aiming && cs) {
        const t = lockA && isAlive(lockA) ? lockA : undefined;
        const heavyMove = game.heavyMove(p);
        aim = { hasTarget: !!t, inRange: !!t && p.aimInRange, name: t ? creature(t.creature).name : undefined, color: t ? BAND_COLOR[bandOf(p, t)] : '#eefaf6', ready: heavyMove.ready, action: heavyMove.name };
      }
      return {
        index: i, creature: p.creature, color: PLAYER_COLORS[i % 4], alive: p.state !== 'dead', aim,
        hp: p.hp, hpMax: p.hpMax, stamina: p.stamina, staminaMax: p.staminaMax, exhausted: p.exhausted > 0,
        tier: p.tier, tierName: era ? `${era.stage} · ${era.rungName}` : TIER_NAMES[p.tier], progress: era ? era.standing / 100 : p.tier >= 4 ? 1 : clamp(p.nutrition / TIER_NEED[p.tier], 0, 1), scale: p.scale,
        abilityName: p.hideMode === 'descending' ? 'Sinking to burrow' : p.hideMode === 'burrowed' ? 'Buried · Y emerge' : p.hideMode === 'camouflage' ? `Camo: ${p.camoLabel}` : RULES?.ySpecial(p.creature)?.name ?? hideLabel(p.creature), abilityReady: p.hideMode === 'camouflage' ? p.stamina / p.staminaMax : RULES?.ySpecial(p.creature) ? 1 - clamp(p.abilityCd / Math.max(1, creature(p.creature).abilityCooldown), 0, 1) : 1 - clamp(p.hideCd / 2, 0, 1), abilityActive: p.hideMode !== 'none' || (p.state === 'ability' && !!RULES?.ySpecial(p.creature)), abilityUnlocked: true,
        senseReady: 1 - clamp(p.senseCd / 6, 0, 1),
        lock: lockA && isAlive(lockA) ? { name: creature(lockA.creature).name, kind: creature(lockA.creature).kind, band: bandOf(p, lockA), hp: lockA.hp / lockA.hpMax, color: BAND_COLOR[bandOf(p, lockA)] } : undefined,
        hunted: p.hunted, hunterAngle, hunterName: hunter ? creature(hunter.creature).name : undefined,
        hunterState: p.hunted >= 0.5 ? 'hunting' : p.hunted > 0.2 ? 'noticed' : 'none', inCover: p.cover > 0.3, still: Math.hypot(p.vel.x, p.vel.y, p.vel.z) < 0.3,
        hint: game.hintFor(i), respawnIn: p.state === 'dead' ? Math.max(0, (game.reviveWindow(p) || 3) - (game.reviveWindow(p) ? 0 : p.respawnT)) : 0, fade: cs?.fade ?? 0, state: p.state, modelReady: !!loadedSync(p.creature),
        downedFor: game.reviveWindow(p), reviveProgress: game.reviveProgress(p), downedAllies: downed, spectating: spectate,
        kills: p.kills, eats: p.eats, escapes: p.escapes, protect: p.spawnProtect > 0, bandMarkers: markers.slice(0, 24),
        biome: BIOME_NAMES[game.biomeOf(i) ?? 'shelf'], day: game.dayPhase(), radar: { range: radarRange, blips }, teleport: tele, board, notice: game.noticeFor(i), era,
      };
    });
    return {
      players, rects, time: game.time, status: game.state.status, message: game.state.message, mode: game.mode, winner: game.state.winner, fps: this.fps,
      canContinue: game.state.status !== 'playing' && isCoop(game.mode),
      discovery: { biomes: [...game.discovery.biomes], landmarks: [...game.discovery.landmarks], apex: [...game.discovery.apex] },
      day: game.dayPhase(),
    };
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
    this.bubbles.dispose(); this.splash.dispose(); this.sparkles.dispose(); this.impacts.dispose(); this.silt.dispose();
    this.shieldGeo.dispose();
    this.mouthfuls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export { TAU };
