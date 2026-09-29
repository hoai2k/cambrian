import { ACTIVE_ERA } from '../content';
import { hideLabel } from '../sim/concealment';
import * as THREE from 'three';
import { drawable, drawDistance, OVERFLOW, viewRank } from './view-pick';
import { audio, SAMPLES } from '../audio/audio';
import { distanceAtten, hugeLength } from '../audio/mix';
import { emptyControls, gamepads, MousePlay, rumble } from '../input/input';
import type { Secondary } from '../shared/touch-play';
import { cursorFor, cursorState } from '../shared/cursors';
import { clamp, damp, wrapAngle } from '../shared/math';
import { bandOf, comingFor, isAlive, isHidden, lengthOf } from '../sim/actors';
import { creature, type CreatureId } from '../sim/creatures';
import { CORPSE_WINDOW, Game, radarRange as radarReach, type TeleportDest } from '../sim/game';
import { BAND_COLOR, CALM_MARK, emptyInput, TIER_NAMES, TIER_NEED, type Actor, type InputFrame, type Mode, type PlayerSetup } from '../sim/types';
import { recordStep, recordingPhase } from '../shared/debug-record';
import { BIOME_NAMES, biomeAt, groundHeight, nurseryAt, SURFACE_Y, type Boulder } from '../sim/world';
import { breathesAir, STRAND_BREATH, STRAND_LOW } from '../sim/beach';
import { AssetQueue, type AssetProgress } from './assets';
import { fillOf, ladderName } from '../sim/ladder';
import { CreatureView, ensureLoaded, evictIdleModels, loadedSync, type Lod } from './creature';
import { conserveCreatureMemory } from '../shared/mobile-memory';
import { Edges } from '../shared/edges';
import { Attachments } from './attachments';
import { Bubbles, Impacts, Sand, Silt, Splash, Tracks } from './fx';
import { Eggs } from './eggs';
import { Mouthfuls } from './carcass';
import { createSea, type Quality, type SeaEnvironment } from './sea';
import { RULES } from '../sim/era-rules';
import { key as controlKey, schemeForDevice } from '../shared/controls';
import { TEXT } from '../shared/text';
import { PLAYER_COLORS, type HudSnapshot, type PlayerHud, type RadarBlipHud, type ViewportRect } from '../shared/hud-types';
import { ViewRoot } from './view-root';
import { freshGovernor, governFrame, planFor, type GovernorPlan } from './frame-governor';
import { NEAR_MIN, nearAlwaysFor, ZOOM_MAX } from '../shared/view-reach';
import { BREATH_PEEK, climbAimHold, edgePitch, FOLLOW_HOLD, FOLLOW_RATE, inverted, layoutRects, magnificationDistance, PITCH_DOWN, PITCH_UP, RIGHT_AFTER, RIGHT_RATE, rightSideUp, spectatorTarget, updateCamera, type CamState } from './camera';
import { freshTele, PlayerInput, updateTeleMenu } from './player-input';
import { BurrowSand, ShoreTracks } from './shore-fx';

export interface EngineCallbacks {
  onHud(s: HudSnapshot): void;
  onMenu(player: number): void;
  onError(msg: string): void;
  onLoaded(): void;
  onProgress?(p: AssetProgress): void;
  /** The pointer lock went away on its own (Escape, alt-tab). The match should pause. */
  onPointerLost?(): void;
  /**
   * A swipe on the secondary pad chose a different action. The shell remembers it, so the choice
   * outlives the match — a player who plays as a hider should not have to swipe back to it every
   * time they hatch.
   */
  onSecondary?(s: Secondary): void;
  /** A finger has landed on one of the touch pads. */
  onTouchZone?(zone: 'swim' | 'secondary'): void;
}


/**
 * How much a body at `d` from the camera is washed toward the water colour, on top of the fog.
 * A far-off giant should read as pale background ambience and only resolve into a solid, dark,
 * obviously-present animal as it closes. Scaled by the viewport's far plane, which already tracks
 * magnification and the biome's fog, so a larva's short world and an apex's long one fade alike.
 */
const distanceHaze = (d: number, far: number) => THREE.MathUtils.smoothstep(d, far * 0.12, far * 0.62) * 0.9;
/**
 * The most animation time a view off screen banks. A clip picks up where it would have got to, but
 * past a few seconds that is a guess about a loop anyway, and a huge step through a mixer's damped
 * weights would show a pose change rather than hide one.
 */
const OWED_MAX = 4;

/** Something hunting you keeps most of its presence, however far off: the warning has to read. */
const HUNTER_HAZE = 0.4;

/** Radar colour for a shoal in the water above you, against the snack green of one on the floor. */
const FOOD_ABOVE = '#9ec2ff';

/**
 * Which way a sideways swipe turns this camera: the other way round when the picture is upside down —
 * through a loop, or still rolling back the right way up — so the view always turns the way the finger
 * moved across it.
 */
const lookFlip = (cs: CamState | undefined) => (cs && Math.cos(cs.pitch) * Math.cos(cs.roll) < 0 ? -1 : 1);

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  /** Every creature view hangs from this, which skips the ones frozen off screen (`view-root.ts`). */
  private viewRoot = new ViewRoot();
  /** The frustums views are animated against this frame: every viewport's camera, as it stood last frame. */
  private animFrustums: THREE.Frustum[] = [];
  private animMat = new THREE.Matrix4();
  private evictT = 0;
  /** Bodies another body's pose depends on this frame — a ride's host, a holder, a swallower. */
  private posed = new Set<number>();
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
  /** The devices, and the translation of what they did into each seat's `InputFrame`. */
  private input = new PlayerInput();
  /** Sand thrown by a burrow, and prints in the beach (`shore-fx.ts`). */
  private burrowSand = new BurrowSand();
  private shoreTracks = new ShoreTracks();
  private attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private bubbles = new Bubbles();
  private mouthfuls = new Mouthfuls();
  private sparkles = new Bubbles(400, [1.0, 0.86, 0.5], 0.25);
  private impacts = new Impacts();
  private splash = new Splash(SURFACE_Y);
  private silt = new Silt();
  private sand = new Sand();
  private tracks = new Tracks();
  private eggs = new Eggs();
  /**
   * Whether the mouse is playing rather than pointing at menus. Distinct from `mouseLook`, which
   * only says the *match* is a mouse one: the mouse also has to stop being the controls while
   * paused, in a dialog and on the results screen, where its clicks belong to the buttons.
   *
   * Nothing is locked any more, so this takes the mouse's *meaning* rather than the cursor: the
   * pointer is always visible and always where the player put it.
   */
  private pointerWanted = false;
  /**
   * Body yaw a touch swipe has asked for and no simulation step has taken yet, per seat. A frame is
   * not a step — at 60 fps some frames run none — and a swipe's turn is a distance rather than a
   * rate, so what a frame with no step collected has to be carried to the next one that has, or the
   * body would fall behind the camera it is meant to turn with.
   */
  private pendingTurn = new Map<number, number>();
  /** The CSS cursor currently set, so the style is only written when it changes. */
  private cursorNow = '';
  private setups: PlayerSetup[] = [];
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private acc = 0;
  private disposed = false;
  private paused = false;
  /**
   * The menus in front of the attract sea are opaque paper now (the title's painting, the choice
   * screen's plate), so drawing the sea behind them is a whole frame of GPU work nobody sees — and on a
   * phone it is the same GPU the page's own animations need, which is how the choice screen's card
   * slide came to stutter. While this is set the attract loop streams but neither steps nor draws.
   */
  private backdropHidden = false;
  private hudT = 0;
  /** The pause button, per device: `onMenu` fires on the press, never on the hold. */
  private menuEdges = new Map<string, Edges>();
  private fps = 60; private fpsFrames = 0; private fpsT = 0;
  private resize: ResizeObserver;
  /** The container's size as the last resize left it (`onResize`). */
  private viewW = 0; private viewH = 0;
  private scratchBoulders: Boulder[] = [];
  private cullSphere = new THREE.Sphere();
  private tmpV = new THREE.Vector3(); private tmpProj = new THREE.Vector3();
  private lookSpeed = 1; private invertY = false;
  private attract = true;
  private attractT = 0;
  private generation = 0;
  private lastFocus = new THREE.Vector3();
  private alpha = 1;
  quality: Quality;
  private conserveMemory: boolean;

  constructor(private container: HTMLElement, quality: Quality, private cb: EngineCallbacks) {
    this.conserveMemory = conserveCreatureMemory(quality);
    this.assets = new AssetQueue(this.conserveMemory);
    this.quality = quality;
    this.renderer = this.makeRenderer(true);
    container.appendChild(this.renderer.domElement);
    // The mouse is attached to the canvas host, not the canvas: the canvas is torn down and rebuilt
    // when quality changes, and the pointer lock has to survive that.
    this.input.mouse.attach(container);
    // Nothing to lose: without pointer lock there is no lock to be taken away.
    this.input.mouse.onLost = null;
    // The fingers listen on the window rather than on this element (see `TouchPlay.attach`), but the
    // element is still what a touch's position is measured against, so it is handed over the same way.
    this.input.touch.attach(container);
    this.input.touch.targetAt = (ndc) => {
      const game = this.game, cs = this.cams[0], p = game?.players[0];
      if (!game || !cs || !p) return -1;
      this.input.updateAim(cs, p, game, p.aiming, 0, ndc);
      return this.input.pointingAt(game, p, cs) !== 'none' ? cs.aimTarget : -1;
    };
    this.input.touch.onSwap = (sec) => { this.cb.onSecondary?.(sec); };
    this.input.touch.onZone = (zone) => { this.cb.onTouchZone?.(zone); };
    this.scene.add(this.viewRoot);
    // The whole graph is brought up to date once a frame before the viewports draw, not once per
    // `render()` call: with split screen that walk was paid again for every viewport.
    this.scene.matrixWorldAutoUpdate = false;
    this.scene.add(this.bubbles.points, this.sparkles.points, this.impacts.group, this.silt.group, this.sand.points, this.tracks.mesh, this.splash.group, this.mouthfuls.group, this.eggs.group);
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
  readonly assets: AssetQueue;
  private bootDone = false; private bootStart = performance.now();
  /** Tell the loader which creatures are most likely to be needed next. */
  prioritize(creatures: CreatureId[], phase: 'boot' | 'title' | 'select' | 'playing', committed: CreatureId[] = [], hovered: CreatureId[] = []) {
    this.likely = new Set(phase === 'select' ? [...committed, ...hovered] : phase === 'playing' ? creatures : []);
    this.assets.prioritize(creatures, phase, committed, hovered);
  }
  /** What the menus last said is likely to be needed next: never evicted (`evictIdleModels`). */
  private likely = new Set<CreatureId>();

  /** A renderer set up the way the game draws. Antialiasing is fixed for a renderer's life (`governed`). */
  private makeRenderer(antialias: boolean) {
    const r = new THREE.WebGLRenderer({ antialias, powerPreference: 'high-performance' });
    r.setPixelRatio(this.pixelRatio());
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Carcasses are eaten away with per-material clipping planes (see carcass.ts).
    r.localClippingEnabled = true;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.25;
    r.shadowMap.enabled = this.quality === 'high';
    r.shadowMap.type = THREE.PCFShadowMap;
    // Split-screen renders the scene once per player; without this the shadow map is rebuilt every time.
    r.shadowMap.autoUpdate = false;
    this.antialias = antialias;
    return r;
  }
  private antialias = true;
  /** The quality's own pixel ratio, scaled by what the frame governor has given up (`frame-governor.ts`). */
  private pixelRatio() { return Math.min(devicePixelRatio, this.quality === 'high' ? 1.5 : 1) * this.plan.resolution; }

  /**
   * Keep the frame rate by giving things up only while frames are actually long, and take them back
   * when they are not (src/render/frame-governor.ts). Browser automation keeps what it was given:
   * the harnesses run under a software renderer at a frame a second, and a check that measures pixels
   * must not have the resolution change under it.
   */
  private governed(frameMs: number, active: boolean) {
    if (navigator.webdriver) return;
    this.gov = governFrame(this.gov, frameMs, active, this.quality === 'low');
    const plan = planFor(this.gov, this.quality === 'low');
    if (plan.resolution === this.plan.resolution && plan.antialias === this.plan.antialias && plan.shadowEvery === this.plan.shadowEvery) return;
    const res = plan.resolution !== this.plan.resolution;
    this.plan = plan;
    if (plan.antialias !== this.antialias) this.swapRenderer(plan.antialias);
    else if (res) { this.renderer.setPixelRatio(this.pixelRatio()); this.onResize(); }
  }
  private gov = freshGovernor();
  private plan: GovernorPlan = planFor(this.gov, false);
  private frameNo = 0;

  /**
   * Replace the renderer with one that differs in antialiasing, which a live WebGL context cannot
   * change. Everything on the GPU is uploaded again to the new context as it is next drawn, so this
   * is a hitch, and the governor takes it once a session at most.
   */
  private swapRenderer(antialias: boolean) {
    const old = this.renderer;
    const next = this.makeRenderer(antialias);
    this.container.replaceChild(next.domElement, old.domElement);
    this.renderer = next;
    old.dispose(); old.forceContextLoss();
    this.onResize();
  }

  private onResize() {
    // Read here, when the size changes, and nowhere else: a frame that asked the container for its
    // size after the HUD had touched the page forced the browser to lay the whole page out again,
    // once a frame, to answer.
    this.viewW = this.container.clientWidth; this.viewH = this.container.clientHeight;
    const w = this.viewW || 1, h = this.viewH || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
  }

  setQuality(q: Quality) {
    const conserve = conserveCreatureMemory(q);
    if (conserve !== this.conserveMemory) {
      this.conserveMemory = conserve;
      this.assets.setConserveMemory(conserve);
    }
    if (q === this.quality) return;
    this.quality = q;
    this.renderer.shadowMap.enabled = q === 'high';
    // A new quality is a fresh start for the governor, and antialiasing comes back if it had gone.
    this.gov = freshGovernor(); this.plan = planFor(this.gov, q === 'low');
    if (!this.antialias) this.swapRenderer(true);
    this.renderer.setPixelRatio(this.pixelRatio());
    if (this.game) { this.sea?.dispose(); this.sea = createSea(this.scene, this.game.world, q); }
    this.onResize();
  }
  setLook(speed: number, invert: boolean) { this.lookSpeed = speed; this.invertY = invert; }
  setPaused(p: boolean) { this.paused = p; this.syncPointer(); }
  setBackdropHidden(hidden: boolean) { this.backdropHidden = hidden; }
  private syncPointer() {
    const playing = this.pointerWanted && !this.paused && !this.attract;
    if (this.paused || this.attract) this.input.pursuitTargets.clear();
    this.input.mouse.want(playing);
    // The fingers stand down for exactly the same reasons the mouse does: paused, in a dialog, on
    // the results screen or back at the menus, a tap belongs to whatever button it landed on.
    this.input.touch.want(this.input.touchPlay && !this.paused && !this.attract);
    // Paused, in a dialog, on the results screen or back at the menus, the cursor belongs to the
    // buttons again: a targeting reticle over a *Quit to title* is a lie about what a click does.
    if (!playing) { this.cursorNow = ''; this.container.style.cursor = ''; }
  }
  /** The match is over but the sea keeps running behind the results: give the cursor back. */
  releasePointer() { this.pointerWanted = false; this.syncPointer(); }
  /** Whether this match is being played on mouse and keyboard, so the HUD can name the buttons. */
  get usingMouse() { return this.input.mouseLook; }
  /** Whether a finger is playing it, so the shell knows to draw the pads. */
  get usingTouch() { return this.input.touchPlay; }
  /** Put the secondary pad back where the player left it last time. */
  setSecondary(s: Secondary) { this.input.touch.setSecondary(s); }
  /** Touch menus use their visible choices directly; pad and keyboard edges still use updateTeleMenu. */
  openTouchTravel(i = 0): boolean {
    const p = this.game?.players[i], tele = this.cams[i]?.tele;
    if (!p || !tele || !isAlive(p) || (p.state !== 'free' && p.state !== 'guard')) return false;
    tele.open = true; tele.index = 0; tele.swap.open = false;
    audio.play('ui-confirm');
    return true;
  }
  closeTouchTravel(i = 0) {
    const tele = this.cams[i]?.tele;
    if (!tele?.open) return;
    tele.open = false; tele.swap.open = false;
    audio.play('ui-back');
  }
  touchTravelSelect(index: number, i = 0) {
    const game = this.game, tele = this.cams[i]?.tele;
    if (!game || !tele?.open || tele.swap.open) return;
    const options = game.teleportOptions(i);
    if (index === options.length) {
      tele.swap.open = true; tele.swap.index = 0; tele.swap.grown = false;
      audio.play('ui-confirm');
    } else if (index >= 0 && index < options.length) {
      tele.index = index;
      if (game.teleport(i, options[index].dest)) { tele.open = false; audio.play('ui-start'); }
      else audio.play('ui-back');
    }
  }
  touchSwapStep(dir: number, i = 0) {
    const game = this.game, swap = this.cams[i]?.tele.swap;
    if (!game || !swap?.open) return;
    const roster = game.swapOptions(i, swap.grown);
    if (!roster.length) return;
    swap.index = (swap.index + dir + roster.length) % roster.length;
    void ensureLoaded(roster[swap.index].id, undefined, 0);
    audio.play('ui-move');
  }
  touchSwapToggle(i = 0) {
    const swap = this.cams[i]?.tele.swap;
    if (!swap?.open) return;
    swap.grown = !swap.grown;
    swap.index = 0;
    audio.play('ui-move');
  }
  touchSwapBack(i = 0) {
    const swap = this.cams[i]?.tele.swap;
    if (!swap?.open) return;
    swap.open = false;
    audio.play('ui-back');
  }
  touchSwapConfirm(i = 0) {
    const game = this.game, tele = this.cams[i]?.tele;
    if (!game || !tele?.swap.open) return;
    const pick = game.swapOptions(i, tele.swap.grown)[tele.swap.index];
    if (pick && !pick.current && game.changeCreature(i, pick.id, tele.swap.grown)) {
      tele.open = false; tele.swap.open = false; audio.play('ui-start');
    } else audio.play('ui-back');
  }
  pauseScoreboard(i = 0) { return this.game?.scoreboard(i); }

  /**
   * Carry a finished co-op match on rather than restarting it: same world, same bodies, same
   * progress, with the mode's goal no longer watching. Returns whether the match resumed.
   */
  continueMatch(): boolean {
    const ok = this.game?.continueMatch() ?? false;
    // Back into the sea, so the pointer comes back with it (the results screen gave it up).
    if (ok) { this.pointerWanted = this.input.mouseLook; this.syncPointer(); }
    return ok;
  }
  get isAttract() { return this.attract; }

  /** Background ecosystem for the title / select screens. */
  startAttract() {
    this.generation++;
    this.clearMatch();
    this.attract = true;
    this.input.mouseLook = false;
    this.pointerWanted = false;
    this.input.mouse.want(false);
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
      const cs: CamState = { showBoard: false, hatchShot: -1, breathT: 0, rideBlend: 0, yaw: p.yaw, pitch: 0.2, roll: 0, lookIdle: 0, zoom: 1, fade: 0, aimBlend: 0, aimTarget: -1, aimSnapT: 0, climbHold: 0, followHold: 0, floorCloseT: 0, floorCloseBlend: 0, pos: new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y + 2.5, p.pos.z - Math.cos(p.yaw) * 6), look: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), shake: 0, camera: cam, lockBlend: 0, lastPos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), frustum: new THREE.Frustum(), projScreen: new THREE.Matrix4(), tele: freshTele() };
      cam.position.copy(cs.pos); cam.lookAt(cs.look);
      return cs;
    });
    this.paused = false;
    // Mouse and keyboard, or pads. Not both: a session with a controller in it is a controller
    // game, and stealing the pointer there would only take the cursor away from the other player.
    this.input.touchPlay = setups.some((s) => s.device === 'touch');
    // A finger and a mouse are not both playing: a session that joined on the glass is a touch
    // session, and leaving the mouse in charge as well would have two schemes fighting over the
    // camera. The mouse stays a perfectly good pointer for the menus either way.
    this.input.mouseLook = gamepads().length === 0 && !this.input.touchPlay && !setups.some((s) => typeof s.device === 'number');
    this.pointerWanted = this.input.mouseLook;
    this.syncPointer();
    // The button that started the match is almost certainly still held right now. Seed the menu
    // edge from what each device reads at this instant, or the first frame sees Start down with
    // no previous state, calls it a fresh press, and pauses the match the moment it begins.
    // Seed each device with whatever it is holding right now, so the button that started the match
    // is not read as a press to pause it.
    this.menuEdges.clear();
    for (const s of setups) { const e = new Edges(); e.step({ menu: this.input.controlsFor(s, 0).menu }); this.menuEdges.set(String(s.device), e); }
    audio.play('ui-start');
  }

  private clearMatch() {
    for (const v of this.views.values()) v.dispose();
    this.views.clear(); this.attachments.clear();
    this.tracks.clear(); this.shoreTracks.clear();
    this.eggs.dispose();
    this.cams = [];
    this.pendingTurn.clear();
    this.game = undefined;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    // The frame's real length, and the length the game is allowed to advance by: a long stall is
    // clamped so the world does not leap, but the counters measure what actually happened — timed
    // off the clamped figure, the fps readout could never report below 12.5.
    const elapsed = Math.max(0, (now - this.last) / 1000);
    const dtReal = Math.min(elapsed, 0.08);
    this.last = now;
    this.fpsFrames++; this.fpsT += elapsed; if (this.fpsT > 1) { this.fps = this.fpsFrames / this.fpsT; this.fpsFrames = 0; this.fpsT = 0; }
    const game = this.game;
    if (!game) return;
    if (this.attract && this.backdropHidden) return;
    const running = !this.paused;
    const dt = running ? dtReal : 0;
    this.time += dt;
    this.frameNo++;
    this.governed(elapsed * 1000, running && !this.attract && document.visibilityState === 'visible');

    // Inputs
    const inputs = new Map<number, InputFrame>();
    if (!this.attract) {
      this.setups.forEach((s, i) => {
        const c = this.input.controlsFor(s, i);
        const key = String(s.device);
        let edges = this.menuEdges.get(key);
        if (!edges) this.menuEdges.set(key, (edges = new Edges()));
        if (edges.step({ menu: c.menu }).menu) this.cb.onMenu(i);
        const p = game.players[i];
        const menuOpen = running && p ? updateTeleMenu(game, i, c, this.cams[i]?.tele) : false;
        // While the teleport menu is up the creature drifts: A and B belong to the menu.
        if (p && running) inputs.set(i, menuOpen ? this.input.toInput(emptyControls(), this.cams[i], p, game, this.setups) : this.input.toInput(c, this.cams[i], p, game, this.setups));
        // A swipe turns the animal with the camera: the same angle the view is about to take below,
        // with the same sign convention (the follow camera eases `cs.yaw` onto the body's `yaw`), so
        // the two stay locked together rather than the view going round and the body being left.
        if (s.device === 'touch' && running && !menuOpen && c.lookDX) {
          this.pendingTurn.set(i, (this.pendingTurn.get(i) ?? 0) - c.lookDX * this.lookSpeed * lookFlip(this.cams[i]));
        }
        // Camera orbit. The right stick is the ONLY thing that turns the camera: yaw is absolute
        // and never follows the creature's heading, so swimming back does not swing the view.
        // Increasing yaw rotates the view left, so a rightward stick decreases it.
        if (running) this.cams[i].showBoard = c.view && !menuOpen;
        if (running && !menuOpen) {
          const cs = this.cams[i];
          this.input.updateAim(cs, game.players[i], game, c.aim, dt);
          // A dash aimed up keeps its aim until the dash is ready again (`climbAimHold`), so a
          // chain of them climbs instead of flattening out between presses.
          cs.climbHold = climbAimHold(cs.climbHold, cs.pitch, p?.dashCd ?? 0, dt);
          if (this.input.mouseLook && this.input.mouseFrame) this.showCursor(this.input.mouseFrame, game, p, cs);
          // The fingers need the same fact and draw no cursor with it: whether there is something
          // worth attacking where the player is pointing is what decides, at the *next* down, whether
          // a double-tap is a pounce or a dash.
          if (this.input.touchPlay) this.input.touch.aimingAt(this.input.pointingAt(game, p, cs) !== 'none');
          if (c.rsClick) {
            // Right stick pressed in: up/down zooms instead of pitching.
            cs.zoom = clamp(cs.zoom * Math.exp(c.lookY * dt * 1.6), 0.55, ZOOM_MAX);
          } else {
            // A stick is a rate and the mouse is a distance, so the stick term is scaled by the
            // frame time and the mouse term is not; one of the two is always zero.
            // A finger loops the camera (`inverted` in camera.ts); everything else keeps its clamp.
            // Upside down, a sideways swipe has to turn the view the way the finger went on the
            // picture, which is the other way round in yaw — and the animal turns with it.
            // The mouse loops too, now that holding the left button steers: the hand is flying the
            // animal then, and a flight that stops dead at straight up is not one.
            const loops = s.device === 'touch' || (this.input.mouseLook && s.device === 'keyboard');
            cs.yaw = wrapAngle(cs.yaw - (c.lookX * dt * 2.6 + c.lookDX * (loops ? lookFlip(cs) : 1)) * this.lookSpeed);
            const dPitch = (c.lookY * dt * 1.6 + c.lookDY) * this.lookSpeed * (this.invertY ? -1 : 1);
            cs.pitch = loops ? wrapAngle(cs.pitch + dPitch) : clamp(cs.pitch + dPitch, PITCH_UP, PITCH_DOWN);
            if (loops) {
              // Left upside down with nobody turning it, the camera rights itself: the same view
              // direction taken from the right way up, and the half turn of roll that makes the swap
              // invisible eased away, so the picture turns over about the middle of the screen.
              // The hand counts as busy while a finger is dragging or the left button is down, and
              // so does a dash or a pounce: the righting waits for the body to have stopped being
              // thrown about before it turns the picture over.
              const busy = c.lookDX || c.lookDY || this.input.touchFrame?.dragging || this.input.mouseFrame?.left
                || p?.state === 'dodge' || p?.state === 'pounce';
              cs.lookIdle = busy ? 0 : cs.lookIdle + dt;
              if (inverted(cs.pitch) && cs.lookIdle > RIGHT_AFTER) {
                const r = rightSideUp(cs.yaw, cs.pitch);
                cs.yaw = r.yaw; cs.pitch = r.pitch; cs.roll = wrapAngle(cs.roll + r.roll);
              }
            }
            cs.roll = Math.abs(cs.roll) < 1e-3 ? 0 : cs.roll * Math.exp(-RIGHT_RATE * dt);
            // Pitch drifts back to level when a stick is let go, which is what makes a pad feel
            // like it is swimming for you. A mouse holds where it was put and so does a finger: the
            // same drift under either would fight the hand every frame. Both of them get the *follow*
            // camera's gentler return instead, just below.
            if (!this.input.mouseLook && !this.input.touchPlay && Math.abs(c.lookY) < 0.05 && cs.climbHold === 0) cs.pitch = damp(cs.pitch, 0.2, 0.6, dt);
            // On a mouse or a finger the camera *follows the body* unless a hand is on it. There is
            // no second stick and no pointer lock, so nothing is steering the view frame to frame:
            // left to itself it would stay pointing wherever the animal last turned away from. It
            // eases round behind the creature and back to the resting pitch, and stands aside for
            // `FOLLOW_HOLD` after a drag or a swipe so a player who has just looked somewhere on
            // purpose is not immediately turned away from it.
            if ((this.input.mouseLook || this.input.touchPlay) && p) {
              // The cursor's height is a second way of aiming the view, and it is *asking* for
              // something just as a drag is — so it holds the follow off while it pushes, or the
              // two would pull against each other and the pitch would sit wherever they balanced.
              //
              // Only the *mouse* gets it. A hovering cursor is otherwise idle information — it is
              // somewhere whether or not the player is doing anything with it — and a finger is the
              // opposite: it is only on the glass while it is being used, and while it is, its travel
              // is already the camera. Reading its height as a tilt as well would have one gesture
              // pulling the pitch two ways.
              const edge = this.input.mouseLook && this.input.mouseFrame?.ndc && !this.input.mouseFrame.dragging ? edgePitch(this.input.mouseFrame.ndc.y) : 0;
              if (edge !== 0 && !inverted(cs.pitch)) cs.pitch = clamp(cs.pitch + edge * dt, PITCH_UP, PITCH_DOWN);
              if (this.input.mouseFrame?.dragging || this.input.touchFrame?.dragging || Math.abs(c.lookX) > 0.05 || Math.abs(c.lookY) > 0.05) cs.followHold = FOLLOW_HOLD;
              else cs.followHold = Math.max(0, cs.followHold - dt);
              // Not while the view is upside down or still turning the right way up: the follow
              // would pull it back the way it came, through the pole, fighting the righting.
              if (cs.followHold === 0 && cs.climbHold === 0 && !inverted(cs.pitch) && Math.abs(cs.roll) < 0.3) {
                cs.yaw = wrapAngle(cs.yaw + wrapAngle(p.yaw - cs.yaw) * (1 - Math.exp(-FOLLOW_RATE * dt)));
                // The pitch only settles back while the cursor is in the dead zone: the follow is
                // what a view does when nobody is asking, and the cursor up there is an ask.
                if (edge === 0) cs.pitch = damp(cs.pitch, 0.2, FOLLOW_RATE * 0.5, dt);
              }
            }
          }
          if (c.zoomDelta) cs.zoom = clamp(cs.zoom * Math.exp(c.zoomDelta), 0.55, ZOOM_MAX);
        }
      });
    }

    // The sprint bed follows whichever local body is driving hardest, and only while it has the
    // stamina to be driving at all — an empty bar is a body labouring, not one surging.
    let sprint = 0, sprintDepth = 0;
    if (!this.attract && running) {
      for (const [i, f] of inputs) {
        const p = game.players[i];
        const drive = Math.min(1, f.burst);
        if (p && isAlive(p) && p.exhausted === 0 && p.stamina > 0 && drive > sprint) {
          sprint = drive;
          const column = ACTIVE_ERA.environment.floorDepth?.[biomeAt(p.pos.x, p.pos.z)] ?? 60;
          sprintDepth = clamp((SURFACE_Y - p.pos.y) / column, 0, 1);
        }
      }
    }
    audio.setSprint(sprint, sprintDepth);

    // Fixed step. Capped at 3 sub-steps so a slow frame cannot spiral into more simulation work.
    const tSim = performance.now();
    if (running) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 3) {
        // The banked swipe goes to the first step and only the first: the input map is reused for
        // every sub-step, and a turn left on the frame would be a turn three times over.
        if (steps === 0) for (const [i, t] of this.pendingTurn) { const f = inputs.get(i); if (f) f.turn = t; }
        game.step(1 / 60, inputs);
        if (steps === 0) { for (const f of inputs.values()) f.turn = undefined; this.pendingTurn.clear(); }
        // The match recorder (`?debug=game`), after the step so it sees what the step decided. It
        // is a no-op unless a recording is running, and it never writes to the simulation.
        if (recordingPhase() === 'recording') {
          const me = game.players[0];
          if (me) recordStep(game, me, inputs.get(0) ?? emptyInput(), game.events);
        }
        this.acc -= 1 / 60; steps++;
      }
      if (steps === 3) this.acc = 0;
      // How far this frame sits past the last completed step. The renderer interpolates across it,
      // so a display refreshing at 144 Hz shows smooth motion rather than each 60 Hz step held for
      // two or three frames.
      this.alpha = clamp(this.acc * 60, 0, 1);
    }
    this.simMs = this.simMs * 0.9 + (performance.now() - tSim) * 0.1;
    this.input.keyboard.endFrame();

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
      this.cams.forEach((cs, i) => { updateCamera(cs, game.players[i], dt, game, this.renderPos); camPositions.push(cs.camera.position); });
    }
    const focus = camPositions.length ? camPositions[0] : this.lastFocus;
    this.lastFocus.copy(focus);
    this.sea?.update(this.time, dt, focus, camPositions, this.attract ? undefined : game.time);
    // Tell the music where the first player is; a biome with a track of its own cues it.
    const listener = game.players[0];
    if (listener && !this.attract) audio.setBiome(biomeAt(listener.pos.x, listener.pos.z));

    // Views
    this.syncViews(game, camPositions, dt);
    this.burrowSand.update(game, dt, this.lastFocus, this.sand);
    this.shoreTracks.update(game, this.views, this.tracks, this.scratchBoulders);
    this.bubbles.update(dt); this.sparkles.update(dt); this.splash.update(dt); this.mouthfuls.update(dt); this.sand.update(dt); this.tracks.update(dt);
    this.eggs.update(game.actors, dt);
    this.impacts.update(dt, focus);
    this.silt.sync(game.silt, this.time);

    // Render
    const tRender = performance.now();
    const W = this.viewW, H = this.viewH;
    const r = this.renderer;
    this.scene.updateMatrixWorld();
    r.setScissorTest(false); r.setViewport(0, 0, W, H); r.clear();
    if (this.quality === 'high' && this.frameNo % this.plan.shadowEvery === 0) r.shadowMap.needsUpdate = true;   // rebuilt on the first render() below
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
    this.frameMs = this.frameMs * 0.9 + Math.min(elapsed, 1) * 1000 * 0.1;
  }

  /**
   * Dress the cursor for what it is over and what the buttons are doing, and tell the mouse
   * whether there is anything there — which is what decides whether the next press is an attack or
   * a look (`MousePlay.onDown`). The engine is the only thing that knows both.
   *
   * Edible or a fight is the size band, the same one every other readout in the game uses: what you
   * could swallow or chase down is green, what would be a fight is red.
   */
  private showCursor(m: ReturnType<MousePlay['read']>, game: Game, p: Actor | undefined, cs: CamState) {
    const over = this.input.pointingAt(game, p, cs);
    this.input.mouse.aimingAt(over !== 'none');
    // The pointer is put away while the left button is steering or holding a mark on an animal,
    // and while a dash is running, whose mark the HUD draws so that it can move (`cursors.ts`).
    const out = this.input.strikeOut;
    const want = cursorFor(cursorState({ dragging: m.dragging, dashing: m.right || out?.mark === 'zoom', hidden: !!out && (out.steer || out.mark === 'target') }, over));
    if (want !== this.cursorNow) { this.cursorNow = want; this.container.style.cursor = want; }
  }

  /** The transform the renderer is drawing this actor at: interpolated across the current step. */
  private renderPos = (a: Actor, out: THREE.Vector3) => {
    const t = a.prevT;
    const k = Math.hypot(a.pos.x - t.x, a.pos.y - t.y, a.pos.z - t.z) > Math.max(2, lengthOf(a) * 3) ? 1 : this.alpha;
    return out.set(t.x + (a.pos.x - t.x) * k, t.y + (a.pos.y - t.y) * k, t.z + (a.pos.z - t.z) * k);
  };

  /**
   * Take this frame's animation frustums, and note which bodies another body's pose hangs on.
   *
   * A view is only worth animating if some viewport can see it, but the frustum a viewport culls
   * with is not settled until its far plane and aspect are, which is after the views are updated.
   * So this uses each camera where it stands now with the projection it drew with last frame, and
   * the test that reads it pads every body generously: a view the viewport then draws after all is
   * at worst one frame behind, and it is caught up the frame after.
   */
  private prepareAnimation(game: Game) {
    const cams = this.attract ? [this.attractCam] : this.cams.map((cs) => cs.camera);
    while (this.animFrustums.length < cams.length) this.animFrustums.push(new THREE.Frustum());
    this.animFrustums.length = cams.length;
    cams.forEach((cam, i) => {
      cam.updateMatrixWorld();
      this.animMat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      this.animFrustums[i].setFromProjectionMatrix(this.animMat);
    });
    // A rider is seated on its host's bones and a mouthful on its holder's jaws, so a host has to be
    // posed even when only what it carries is on screen.
    const posed = this.posed; posed.clear();
    for (const a of game.actors) {
      if (a.rideHost >= 0) posed.add(a.rideHost);
      if (a.grabbedBy >= 0) posed.add(a.grabbedBy);
      if (a.swallowedBy >= 0) posed.add(a.swallowedBy);
    }
  }

  /** Whether any viewport could be looking at this body (see `prepareAnimation`). */
  private onScreen(a: Actor) {
    const s = this.cullSphere;
    s.center.set(a.pos.x, a.pos.y, a.pos.z);
    s.radius = lengthOf(a) * 1.25 + 3;
    for (const f of this.animFrustums) if (f.intersectsSphere(s)) return true;
    return false;
  }

  private syncViews(game: Game, cams: THREE.Vector3[], dt: number) {
    const players = Math.max(1, this.cams.length);
    const keep = new Set<number>();
    this.prepareAnimation(game);
    const nearDist = (a: Actor) => { let best = Infinity; for (const c of cams) { const d = Math.hypot(a.pos.x - c.x, a.pos.y - c.y, a.pos.z - c.z); if (d < best) best = d; } return best; };
    // Rank by apparent size (body length over distance), not distance alone: a giant 80 units away
    // matters far more than a 0.2-unit snack at 20. Anything under ~8 screen pixels is skipped.
    /**
     * Inside this, a body is drawn whatever its apparent size.
     *
     * The apparent-size floor below is a good rule for the far field and a bad one up close,
     * because the distance it divides by is *the viewer's own framing*: the camera sits about one
     * and a half body lengths back, so a nineteen-unit Cymbospondylus watches from thirty units
     * away and a prey fish swimming five units in front of its nose is thirty-five from the
     * camera — 0.011 apparent size, right on the floor, popping in and out. The bigger the animal
     * you are playing, the nearer the things that vanish. Hence the floor is joined by a plain
     * near field measured in the same unit the camera is placed in, so what is *in front of you*
     * is always drawn no matter how small it is or how large you are.
     */
    const nearAlways = game.players.reduce(
      (m, p) => Math.max(m, nearAlwaysFor(p ? lengthOf(p) : 1)), NEAR_MIN);
    // How far a body can be drawn is how far the water lets you see, not a fixed number. The limit
    // was 130 units (90 with three or four players), and the fog thins as the animal you play grows:
    // playing a big Triassic reptile, a seventeen-unit ichthyosaur at 135 was still two thirds
    // through the haze and large on screen, and it popped out of existence as it crossed the line. Past `FOG_GONE` the exponential fog
    // has taken 95 % of it, which is where the eye has lost it anyway.
    const fog = this.scene.fog as THREE.FogExp2 | null;
    const seeTo = drawDistance(fog?.density ?? 0, players);
    const candidates: { a: Actor; d: number; size: number; shown: boolean }[] = [];
    for (const a of game.actors) {
      const d = Math.max(0.5, nearDist(a));
      const size = lengthOf(a) / d;
      const shown = this.views.has(a.id);
      if (drawable(d, size, seeTo, nearAlways, shown, a.controller === 'player')) candidates.push({ a, d, size, shown });
    }
    // Ranked by apparent size, with the near field weighted up rather than let past the cap: the
    // cap is a frame-cost limit and must stay one, but what it cuts is the *tail* of the list —
    // which is exactly a prey swarm, every member small on screen and most of them right beside
    // you. Weighting keeps a giant eighty units off (the thing that matters most at any moment)
    // ahead of the chaff while lifting what is within reach above the small and far.
    // ...and a body already drawn ranks a little higher than a new one of the same size, so two
    // near the cap do not trade places every frame.
    const rank = (c: typeof candidates[number]) => viewRank(c.size, c.d, nearAlways, c.shown);
    candidates.sort((x, y) => rank(y) - rank(x));
    const cap = Math.round((this.conserveMemory ? 32 : this.quality === 'high' ? 88 : 56) / (0.6 + 0.4 * players));
    // Full-detail bodies are the most expensive thing in the frame — they are skinned on the CPU
    // and drawn again into the shadow map, once per viewport — and how expensive depends entirely
    // on the era: a Devonian placoderm is 105k triangles where a Cambrian arthropod is 55k, and
    // one of its trilobites is 516k. Apparent size alone therefore buys wildly different frame
    // costs in the two eras, which is why the Devonian ran heavy. So spend a triangle budget
    // instead: biggest-on-screen first, everything past it takes the decimated copy.
    const budget = (this.quality === 'high' ? 700_000 : 320_000) / (0.6 + 0.4 * players);
    let spent = 0, count = 0;
    // Past the cap a body is drawn at reduced detail rather than not drawn: the cap was cutting the
    // tail of the list, which is a prey swarm right beside you. The decimated copy is what the far
    // field is drawn with anyway, and the overflow is bounded so the frame cost still is.
    const overflow = Math.round(cap * OVERFLOW);
    for (const { a, d } of candidates) {
      if (count >= overflow && a.controller !== 'player') break;
      const pastCap = count >= cap && a.controller !== 'player';
      // Pick a detail level from apparent size, with hysteresis so it cannot flicker at the boundary.
      let v = this.views.get(a.id);
      const size = lengthOf(a) / d;
      let wantLod: Lod = a.controller === 'player' ? 0 : v ? (v.lod === 0 ? (size < 0.05 ? 1 : 0) : (size > 0.075 ? 0 : 1)) : (size < 0.06 ? 1 : 0);
      // On low-quality touch play in the large-model eras, keep full skinned bodies for players
      // only. The NPCs use decimated copies so a long match does not retain the whole roster.
      if ((this.conserveMemory || pastCap) && a.controller !== 'player') wantLod = 1;
      // Behind the title and the pick screen, whose painting and plate cover the whole window, the
      // sea is drawn with decimated bodies only: a full one there was a download of up to 22 MB, and
      // a main-thread decode, for an animal nobody could see.
      if (this.attract) wantLod = 1;
      // The budget only ever demotes: your own body, and anything already at full detail whose
      // share is still affordable, keep it.
      const full = loadedSync(a.creature, 0);
      if (wantLod === 0 && a.controller !== 'player') {
        if (full && spent + full.tris > budget) wantLod = 1;
      }
      if (wantLod === 0) spent += full?.tris ?? 0;
      if (wantLod === 1 && !loadedSync(a.creature, 1)) {
        void ensureLoaded(a.creature, undefined, 1);
        // Use an already resident full body while its LOD arrives, but do not start a second,
        // much larger download just because the small body has not finished loading yet.
        if (loadedSync(a.creature, 0)) wantLod = 0;
      }
      // A view is built for one creature at one detail level. Both can change under it: the level
      // with distance, and the creature itself when a player changes body mid-match.
      // A change of detail waits for the new copy to be resident. It used to throw the old view
      // away first and build the new one only once it had loaded, so a body changing detail
      // before its other copy had arrived simply vanished until the download landed.
      if (v && v.creatureId === a.creature && v.lod !== wantLod && !loadedSync(a.creature, wantLod)) {
        void ensureLoaded(a.creature, undefined, wantLod);
        wantLod = v.lod;
      }
      if (v && (v.lod !== wantLod || v.creatureId !== a.creature)) { v.dispose(); this.views.delete(a.id); v = undefined; }
      if (!v) {
        const loaded = loadedSync(a.creature, wantLod);
        if (!loaded) { void ensureLoaded(a.creature, undefined, wantLod); continue; }
        v = new CreatureView(a.creature, loaded, { shieldGeo: this.shieldGeo }, wantLod);
        this.viewRoot.add(v.group);
        this.views.set(a.id, v);
        v.update(a, 0, this.time, true);
      }
      // A seat that is the second on its creature is drawn in another palette, so four players on
      // four Anomalocaris are four different animals to look at. Read every frame rather than set
      // once: a view is rebuilt when the body or the detail level changes, and the scheme has to
      // survive that without the rebuild knowing about seats.
      const seat = a.controller === 'player' && a.player >= 0 ? this.setups[a.player] : undefined;
      if (v.seatScheme !== seat?.scheme) { v.seatScheme = seat?.scheme; v.refreshScheme(); }
      keep.add(a.id); count++;
      // Only nearby creatures cast shadows: the shadow pass has no frustum culling for these
      // meshes, so every distant swimmer was being rasterised into the shadow map for nothing.
      v.setShadow(d < 32 && lengthOf(a) > 0.45);
      // Animate only what could be seen, and far views less often. A view that is skipped banks the
      // time it missed and spends it the next frame it is animated, so it comes back into view where
      // its clip would have got to rather than where it was left. What something else is seated on
      // or held in is posed whether it is seen or not, because what it carries may be.
      const far = d > 45;
      const hold = a.state === 'eating' || a.holdT > 0 || this.posed.has(a.id);
      const seen = this.onScreen(a);
      const animate = hold || (seen && (!far || ((a.id + Math.floor(this.time * 60)) % 3 === 0)));
      v.group.userData.frozen = !seen && !hold;
      if (animate) { v.update(a, dt + v.owed, this.time, true, this.alpha); v.owed = 0; }
      else { v.owed = Math.min(v.owed + dt, OWED_MAX); v.update(a, dt, this.time, false, this.alpha); }
      // Arms that lie along what they are on. Near views only: it is a per-segment solve, and at
      // any distance the shape it makes is smaller than a pixel.
      if (v.conforms && d < 26 && animate) {
        const host = a.rideHost >= 0 ? game.byId(a.rideHost) : undefined;
        const L = lengthOf(a);
        const gap = a.pos.y - groundHeight(game.world, a.pos.x, a.pos.z, this.scratchBoulders);
        // Fade out as it leaves the floor: an arm in open water has nothing to lie on.
        const weight = host ? 1 : clamp(1 - (gap - L * 0.35) / Math.max(L, 0.4), 0, 1);
        v.conform({
          groundAt: (x, z) => groundHeight(game.world, x, z, this.scratchBoulders),
          clearance: L * 0.06,
          host: host ? { x: host.pos.x, y: host.pos.y, z: host.pos.z, radius: lengthOf(host) * 0.32 } : undefined,
        }, weight, dt);
      }
      // A carcass shows what has been taken out of it, and gets whole again when its owner
      // respawns into the same view.
      if (a.state === 'dead' && a.eatBites > 1 && a.eaten > 0) v.carcass.setEaten(a.eaten);
      else if (a.state !== 'dead' && a.eaten <= 0) v.restoreCarcass();
    }
    this.attachments.sync(game, this.views, dt);
    this.breathe(game, keep);
    for (const [id, v] of this.views) if (!keep.has(id)) { v.dispose(); this.views.delete(id); }
    // Now and then, let go of full-detail bodies nothing is drawing (`evictIdleModels`). The
    // players' own are always kept; a handful of the most recent others are, too, since a body
    // that has just swum out of view is the likeliest to swim back.
    this.evictT += dt;
    if (this.evictT > 2) {
      this.evictT = 0;
      const keep = new Set<CreatureId>([...this.likely, ...this.setups.map((s) => s.creature)]);
      for (const p of game.players) keep.add(p.creature);
      evictIdleModels(keep, this.conserveMemory ? 1 : this.quality === 'high' ? 6 : 3);
    }
  }

  /**
   * Lungs leak when they work. A bag of air inside a body under water shows every time the body
   * spends itself: what a bimodal animal lets go of the mouth is the effort it just made, so the
   * bubbles are the stamina bar draining, seen from outside. A sprint streams them, a dash coughs a
   * handful, and hanging still or climbing — which costs nothing — releases none at all.
   *
   * Purely a look, so it lives in the renderer with its own randomness and reads the one creature
   * flag it needs; nothing in the Cambrian roster breathes both ways, so nothing there emits. Run
   * after `attachments.sync` so the mouth socket is posed, and skipped at the surface, where the
   * animal is breathing rather than holding it.
   */
  private breathe(game: Game, keep: Set<number>) {
    for (const [id, v] of this.views) {
      const a = keep.has(id) ? game.byId(id) : undefined;
      const breathing = a ? creature(a.creature).breathing : undefined;
      if (!a || !isAlive(a) || isHidden(a) || (breathing !== 'bimodal' && breathing !== 'air')) { this.breath.delete(id); continue; }
      const L = lengthOf(a);
      const prev = this.breath.get(id);
      this.breath.set(id, { stamina: a.stamina, owed: prev?.owed ?? 0 });
      // First sight of a body, or a bar that went up (regen, a breath, a respawn): nothing was spent.
      if (prev == null || a.stamina >= prev.stamina) continue;
      if (a.pos.y > SURFACE_Y - 3 - L * 0.3) continue;
      const entry = this.breath.get(id)!;
      entry.owed = prev.owed + (prev.stamina - a.stamina);
      // One bubble per few points of effort, so a whole bar vented is a couple of dozen of them.
      const n = Math.floor(entry.owed / 3.5);
      if (n < 1) continue;
      entry.owed -= n * 3.5;
      const at = v.anchors.world('anchor_mouth', this.tmpV)
        ? { x: this.tmpV.x, y: this.tmpV.y, z: this.tmpV.z }
        : { x: a.pos.x + Math.sin(a.yaw) * L * 0.45, y: a.pos.y + L * 0.05, z: a.pos.z + Math.cos(a.yaw) * L * 0.45 };
      this.bubbles.emit(at, Math.min(12, n), L * 0.1, 0.35, Math.min(0.18, 0.035 + L * 0.03), 1.6 + L * 0.2);
    }
  }
  private breath = new Map<number, { stamina: number; owed: number }>();

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
        v.group.visible = v.present && (!isHidden(a) || a.hideT <= 0.6) && cs.frustum.intersectsSphere(this.cullSphere);
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
        return a && lengthOf(a) >= hugeLength() && SAMPLES[big] ? big : kind;
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
        case 'parry': { const at = this.impactPos(e.other, e.actor, e.pos); this.impacts.spawn(at, '#9ff6ff', 2, 0.4); this.bubbles.emit(at, 20, 0.6, 5, 0.08); world(e.strength != null && e.strength < 1 ? (e.strength < 0.5 ? 'armour' : 'armourPierce') : 'parry', at); if (e.player != null && e.player >= 0) { const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.9, 0.2, 90); } break; }
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
        case 'pounce': { this.impacts.spawn(e.pos, '#ffe08a', 1.2 + (e.strength ?? 1) * 0.5, 0.35); this.bubbles.emit(e.pos, 24, 0.9, 4, 0.08); world('pounce', e.pos, 1.3); if (e.player != null && e.player >= 0) { if (this.input.pursuitTargets.get(e.player) === e.other) this.input.pursuitTargets.set(e.player, -1); const d = padOf(e.player); if (typeof d === 'number') rumble(d, 0.7, 0.4, 140); this.shake(e.player, 0.6); } break; }
        // A jet is a discrete shove — a nautiloid empties its funnel and stops — so it keeps its
        // sting. Ordinary sprinting is a bed instead (`audio.setSprint`, driven below from the
        // frame's own inputs): it is held down for minutes at a time, and one loud whoosh per press
        // was the single most repeated sound in the game.
        case 'burst': { const b = game.byId(e.actor); if (b && RULES.jet?.(b)) { world('jet', e.pos); this.bubbles.emit(e.pos, 30, 0.9, 3, 0.1, 1.4); } break; }
        // Coming out of an egg: a wet tear as the soft shell opens.
        case 'eggPoke': { if (e.player != null && e.player >= 0) audio.play('eggPoke', 0.7); else world('eggPoke', e.pos, 0.7, 0.5); break; }
        case 'hatch': { if (e.player != null && e.player >= 0) audio.play('hatch'); else world('hatch', e.pos, 1, 0.5); break; }
        // Hatching out of a nursery after a respawn (the moult state is reused for the hatch-in).
        case 'moult': { if (e.player != null && e.player >= 0) audio.play(e.strength === 1 ? 'moult' : 'respawn'); else world('respawn', e.pos, 1, 0.5); break; }
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
        // The blow. The body itself never leaves the water for this — the swim ceiling holds it a
        // little under the surface — so with only bubbles under the camera a breath looked exactly
        // like not taking one, and a player who had surfaced could not tell that they had. The
        // surface says it instead: a head-sized crown of spray and a ring spreading off it, at
        // SURFACE_Y above the body rather than at the body, which is where the water is broken.
        case 'gulp': {
          const b = game.byId(e.actor), bl = b ? lengthOf(b) : 1, broken = e.strength ?? 1;
          // `strength` is how much water this breath breaks: a whole body, a neck sent up alone, or
          // nothing at all when the breath was taken on the sand and the sea is below the animal.
          if (broken > 0) this.splash.burst({ x: e.pos.x, y: SURFACE_Y, z: e.pos.z }, 0.3 + 0.5 * broken, 'out', bl * 0.5 * broken);
          this.bubbles.emit(e.pos, 24, 1.0, 3, 0.09, 1.4);
          // ...and the camera comes up with the animal to watch it happen. It is otherwise held
          // under the waterline at all times (see the ceiling in `updateCamera`), so a breath took
          // place just off the top of the screen and the player's own view of it was the water.
          if (broken > 0 && e.player != null && e.player >= 0) { const cs = this.cams[e.player]; if (cs) cs.breathT = BREATH_PEEK; }
          const sized = bl < 4 ? 'gulp-small' : bl >= hugeLength() ? 'gulp-giant' : 'gulp-mid';
          const gulp = SAMPLES[sized] ? sized : 'gulp';
          if (e.player != null && e.player >= 0) audio.play(gulp); else world(gulp, e.pos);
          break;
        }
        // The winded heartbeat, and a thin trickle of bubbles escaping with it: a body that
        // recovers badly under water, running low on stamina and a long way from the surface that
        // would hand it all back. `strength` is how spent it is.
        case 'winded': {
          const s = e.strength ?? 0;
          // Under the camera's nose a puff of bubbles every beat reads as a white flash, so the
          // spill is a thin one and the cue is quiet: this is a body running low, not an alarm.
          this.bubbles.emit(e.pos, 1 + Math.round(2 * s), 0.4, 1.4, 0.04, 0.8);
          personal('winded', 0.18 + 0.22 * s);
          break;
        }
        case 'shoreStrike': { world('shoreStrike', e.pos, 1, 1); break; }
        case 'anoxia': { personal('anoxia', 0.8); break; }
        case 'flop': { personal('flop', 0.75); break; }
        case 'beach': { if (e.strength) { this.bubbles.emit(e.pos, 12, 0.5, 2, 0.06, 1); personal('beach', 0.9); } break; }
        case 'shoalJoin': { this.sparkles.emit(e.pos, 16, 0.6, 1.2, 0.05, 1.2); personal('shoalJoin', 0.7); break; }
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

  /**
   * Whether something edible is right in front of this player: within a few body lengths and near the
   * middle of their view, which is where the aim pad would put the crosshair on it. Asked at the HUD's
   * rate, for touch seats only.
   */
  private preyAhead(game: Game, p: Actor, cs: CamState): boolean {
    if (!isAlive(p)) return false;
    const L = lengthOf(p);
    for (const a of game.nearby(p.pos, L * 8 + 6)) {
      if (a.id === p.id || !isAlive(a) || isHidden(a)) continue;
      const band = bandOf(p, a);
      if (band !== 'snack' && band !== 'prey') continue;
      const v = this.tmpProj.set(a.pos.x, a.pos.y, a.pos.z).project(cs.camera);
      if (v.z < 1 && Math.abs(v.x) < 0.35 && Math.abs(v.y) < 0.45) return true;
    }
    return false;
  }

  private snapshot(game: Game, rects: ViewportRect[]): HudSnapshot {
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
      const era = RULES.hud?.(game, i);
      const scheme = schemeForDevice(this.setups[i]?.device ?? 'keyboard', this.input.mouseLook);
      // Sense off: nothing is drawn over the sea, so there is nothing to work out either.
      const markers: PlayerHud['bandMarkers'] = [];
      if (cs && p.senseMode) {
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
          // Red is for something that is actually coming for you. Everything else is a calm mark
          // whose glyph still says how big it is — a marker over every large animal in sight made
          // the warning mean "big", which is not what a warning is for.
          markers.push({ x: (v.x + 1) / 2, y: (1 - v.y) / 2, band, size: clamp(lengthOf(a) / Math.max(d, 1) * 8, 0.4, 1.6), hot: comingFor(a, p) });
        }
      }
      // Radar: reach grows with the creature, contacts rotate into the camera frame (up = camera forward).
      const radarRange = radarReach(p);
      const blips: RadarBlipHud[] = [];
      if (cs && p.senseMode) {
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
          // Same rule as the on-screen marks: the dial goes red for a contact that is hunting you,
          // and a big animal going about its business is a contact like any other.
          const color = b.kind === 'player' ? PLAYER_COLORS[b.id % 4] : b.hunting ? BAND_COLOR.giant : b.kind === 'giant' || b.kind === 'threat' ? CALM_MARK
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
      const tele = cs?.tele.open && !cs.tele.swap.open
        ? { options: [...game.teleportOptions(i).map((o) => ({ label: o.label, detail: o.detail, distance: o.distance, dest: o.dest })),
                      { label: TEXT.hud.teleport.changeCreature, detail: TEXT.hud.teleport.changeCreatureDetail, distance: 0, dest: 'home' as TeleportDest }],
            index: cs.tele.index, cooldown: p.teleportCd }
        : undefined;
      let swap: PlayerHud['swap'];
      if (cs?.tele.open && cs.tele.swap.open) {
        const roster = game.swapOptions(i, cs.tele.swap.grown);
        const pick = roster[cs.tele.swap.index % Math.max(1, roster.length)];
        if (pick) {
          const def = creature(pick.id);
          swap = { name: def.name, kind: def.kind, creature: pick.id, rung: ladderName(pick.mark), fill: fillOf(pick.mark), kept: pick.kept, grown: cs.tele.swap.grown, count: roster.length, index: cs.tele.swap.index };
        }
      }
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
      // Survival: a dead player watches the leader rather than their own sinking body.
      // Who killed this player, named the way the rest of the HUD names bodies: another player by
      // their seat, anything else by its species.
      const killerId = p.swallowedBy >= 0 ? p.swallowedBy : p.killer;
      const killer = killerId >= 0 ? game.byId(killerId) : undefined;
      const nameOf = (a: Actor | undefined) => (a ? (a.player >= 0 ? TEXT.common.playerChip(a.player + 1) : creature(a.creature).name) : undefined);
      const watched = spectatorTarget(game, i);
      const spectate = watched ? { index: watched.player, name: TEXT.common.playerChip(watched.player + 1), color: PLAYER_COLORS[watched.player % 4], creature: watched.creature } : undefined;
      let aim: PlayerHud['aim'];
      // On a mouse the *cursor* is the crosshair (`src/shared/cursors.ts`), so the reticle is off:
      // two crosshairs on one screen, one of them nailed to the middle, is worse than either alone.
      const mouseSeat = this.input.mouseLook && this.setups[i]?.device === 'keyboard';
      const strike = mouseSeat ? this.input.strikeOut : undefined;
      const chaseId = this.input.touchPlay ? this.input.pursuitTargets.get(i)
        : strike?.mark === 'target' ? strike.target : undefined;
      const chasing = chaseId != null && chaseId >= 0;
      if (p.aiming && cs && !this.input.mouseLook && !chasing && chaseId !== -1) {
        const t = lockA && isAlive(lockA) ? lockA : undefined;
        const heavyMove = game.heavyMove(p);
        // A finger keeps the reticle and takes it *with* it. The mouse has a cursor doing this job
        // and so draws none; a pad has no pointer at all and so draws it in the middle, which is
        // where its aim axis is. Touch is the third case and needs both halves: a mark to aim by,
        // standing where the player last pointed, and back in the middle once that has lapsed.
        const at = this.input.touchPlay && !this.input.touchFrame?.pursue ? this.input.touchFrame?.ndc : undefined;
        aim = { hasTarget: !!t, inRange: !!t && p.aimInRange, name: t ? creature(t.creature).name : undefined, color: t ? BAND_COLOR[bandOf(p, t)] : '#eefaf6', band: t ? bandOf(p, t) : undefined, ready: heavyMove.ready, action: heavyMove.name, at: at ? { x: at.x, y: at.y } : undefined };
      }
      let touchMark: PlayerHud['touchMark'];
      if (chasing && cs) {
        const victim = game.byId(chaseId);
        if (victim && isAlive(victim)) {
          const screen = new THREE.Vector3(victim.pos.x, victim.pos.y, victim.pos.z).project(cs.camera);
          if (screen.z >= -1 && screen.z <= 1 && Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1)
            touchMark = { kind: 'target', at: { x: screen.x, y: screen.y } };
        }
      } else if (strike?.mark === 'zoom' && this.input.strikeAt) {
        touchMark = { kind: 'zoom', at: this.input.strikeAt };
      } else if (mouseSeat && this.input.mouseFrame?.right && this.input.mouseFrame.ndc) {
        touchMark = { kind: 'zoom', at: this.input.mouseFrame.ndc };
      } else if (chaseId !== -1 && this.input.touchPlay && this.input.touchFrame?.marker && this.input.touchFrame.ndc) {
        touchMark = { kind: this.input.touchFrame.marker, at: this.input.touchFrame.ndc };
      }
      return {
        index: i, creature: p.creature, color: PLAYER_COLORS[i % 4], alive: p.state !== 'dead', aim, touchMark,
        scheme,
        hp: p.hp, hpMax: p.hpMax, hunger: game.mode === 'survival' ? p.hunger : undefined, stamina: p.stamina, staminaMax: p.staminaMax, exhausted: p.exhausted > 0,
        tier: p.tier, tierName: era ? `${era.stage} · ${era.rungName}` : TIER_NAMES[p.tier], // The ring means the same thing in both eras: how close the next moult is, full when it lands.
        progress: era ? era.stageProgress : p.tier >= 4 ? 1 : clamp(p.nutrition / TIER_NEED[p.tier], 0, 1), scale: p.scale,
        abilityName: p.hideMode === 'descending' ? TEXT.sim.hide.sinking : p.hideMode === 'burrowed' ? TEXT.sim.hide.buried(controlKey('ability', scheme)) : p.hideMode === 'camouflage' ? TEXT.sim.hide.camouflaged(p.camoLabel) : RULES.ySpecial?.(p.creature)?.name ?? hideLabel(p.creature), abilityReady: p.hideMode === 'camouflage' ? p.stamina / p.staminaMax : RULES.ySpecial?.(p.creature) ? 1 - clamp(p.abilityCd / Math.max(1, creature(p.creature).abilityCooldown), 0, 1) : 1 - clamp(p.hideCd / 2, 0, 1), abilityActive: p.hideMode !== 'none' || (p.state === 'ability' && !!RULES.ySpecial?.(p.creature)), abilityUnlocked: true,
        senseOn: p.senseMode,
        lock: lockA && isAlive(lockA) ? { name: creature(lockA.creature).name, kind: creature(lockA.creature).kind, band: bandOf(p, lockA), hp: lockA.hp / lockA.hpMax, color: BAND_COLOR[bandOf(p, lockA)] } : undefined,
        hunted: p.hunted, hunterAngle, hunterName: hunter ? creature(hunter.creature).name : undefined,
        ashore: p.ashore, strandLeft: p.ashore && !breathesAir(p.creature) ? clamp(1 - p.strandT / STRAND_BREATH, 0, 1) : undefined,
        strandLow: p.ashore && !breathesAir(p.creature) && STRAND_BREATH - p.strandT < STRAND_LOW,
        hunterState: p.hunted >= 0.5 ? 'hunting' : p.hunted > 0.2 ? 'noticed' : 'none', inCover: p.cover > 0.3, still: Math.hypot(p.vel.x, p.vel.y, p.vel.z) < 0.3,
        hint: game.hintFor(i), respawnIn: p.state === 'dead' ? Math.max(0, (game.reviveWindow(p) || CORPSE_WINDOW) - (game.reviveWindow(p) ? 0 : p.respawnT)) : 0, fade: cs?.fade ?? 0, state: p.state, modelReady: !!loadedSync(p.creature),
        downedFor: game.reviveWindow(p), reviveProgress: game.reviveProgress(p), downedAllies: downed, spectating: spectate,
        death: p.state === 'dead' || p.state === 'swallowed' ? { eaten: p.swallowedBy >= 0 || p.eaten > 0, by: nameOf(killer) } : undefined,
        kills: p.kills, eats: p.eats, escapes: p.escapes, protect: p.spawnProtect > 0, bandMarkers: markers.slice(0, 24), preyAhead: this.setups[i]?.device === 'touch' && cs ? this.preyAhead(game, p, cs) : undefined,
        grip: game.gripFor(i), biome: BIOME_NAMES[game.biomeOf(i) ?? 'shelf'], day: game.dayPhase(), radar: { range: radarRange, blips }, teleport: tele, swap, board, notice: game.noticeFor(i), era,
      };
    });
    return {
      players, rects, time: game.time, status: game.state.status, message: game.state.message, mode: game.mode, winner: game.state.winner, fps: this.fps,
      canContinue: game.state.status !== 'playing',
      discovery: { biomes: [...game.discovery.biomes], landmarks: [...game.discovery.landmarks], apex: [...game.discovery.apex], best: Object.fromEntries(game.discovery.best) },
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
    this.input.keyboard.dispose();
    this.input.mouse.dispose();
    this.input.touch.dispose();
    this.assets.dispose();
    this.clearMatch();
    this.sea?.dispose();
    this.bubbles.dispose(); this.splash.dispose(); this.sparkles.dispose(); this.impacts.dispose(); this.silt.dispose(); this.sand.dispose(); this.tracks.dispose();
    this.shieldGeo.dispose();
    this.mouthfuls.dispose(); this.eggs.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
