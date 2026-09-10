import { assetPaths } from '../content/asset-paths';
import * as THREE from 'three';
import { CreatureAnchors } from './anchors';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { clamp, damp, wrapAngle } from '../shared/math';
import { makeRecolor, type Recolor } from './recolor';
import { settleTranslucency } from './translucency';
import { mergeSkinnedParts } from './merge-skins';
import { Carcass } from './carcass';
import { ArmConform, type Surface } from './conform';
import { schemeForCreature } from '../shared/palettes';
import { creature, type CreatureId } from '../sim/creatures';
import { lengthOf } from '../sim/actors';
import { bellPhase, bellTilt } from '../sim/locomotion';
import type { Actor } from '../sim/types';
import { appBase } from '../shared/base';
import type { AuthoredFeeding } from './attachments';

interface Loaded { gltf: GLTF; unit: number; center: THREE.Vector3; size: THREE.Vector3; /** Triangles in one instance of this body, for the renderer's detail budget. */ tris: number; }
export type Lod = 0 | 1;
const cache = new Map<string, Promise<Loaded>>();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export const creatureUrl = (id: CreatureId, lod: Lod = 0) =>
  `${appBase()}${assetPaths.model(id, lod)}`;

export function loadCreature(id: CreatureId, onProgress?: (loaded: number, total: number) => void, lod: Lod = 0): Promise<Loaded> {
  const key = `${id}:${lod}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<GLTF>((res, rej) => loader.load(creatureUrl(id, lod), res, (e) => onProgress?.(e.loaded, e.total), rej)).then((gltf) => {
      // Part-by-part rigs cost one draw call per part; merge what shares a material before the
      // first instance is cloned from this scene.
      mergeSkinnedParts(gltf.scene, gltf.animations);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const unit = 1 / Math.max(size.z, size.x, 0.01);
      let tris = 0;
      gltf.scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.frustumCulled = false;
        const g = o.geometry;
        tris += (g.index ? g.index.count : g.getAttribute('position')?.count ?? 0) / 3;
      });
      return { gltf, unit, center, size, tris: Math.round(tris) };
    }).catch((e) => { cache.delete(key); throw new Error(`Could not load ${creature(id).name}: ${e?.message ?? e}`); });
    cache.set(key, p);
  }
  return p;
}
export function loadedSync(id: CreatureId, lod: Lod = 0): Loaded | undefined { return loadedMap.get(`${id}:${lod}`); }
const loadedMap = new Map<string, Loaded>();
export async function ensureLoaded(id: CreatureId, onProgress?: (loaded: number, total: number) => void, lod: Lod = 0) {
  const l = await loadCreature(id, onProgress, lod);
  loadedMap.set(`${id}:${lod}`, l);
  return l;
}

const SPINE_RE = /^(body|segment)_(\d+)$/;
/**
 * Rigs whose Eat clip is an authored reach/grasp/carry performance, scrubbed by consumption progress
 * (the articulated attack and feeding pass, tools/creatures/motion, authors Eat on the feedingPhase
 * timeline: reach, grasp, carry, hold at the mouth). Every other rig loops its Eat clip while
 * the attachment pass moves the food through its sockets.
 */
const FEEDING_PERFORMANCE: ReadonlySet<CreatureId> = new Set<CreatureId>([
  'opabinia', 'leanchoilia', 'anomalocaris', 'nectocaris', 'cambroraster', 'tamisiocaris', 'isoxys', 'waptia', 'sidneyia', 'marrella', 'olenoides',
]);

export class CreatureView {
  readonly group = new THREE.Group();
  private inner = new THREE.Group();
  private model: THREE.Object3D;
  readonly anchors: CreatureAnchors;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private loco?: THREE.AnimationAction;
  private oneShot?: THREE.AnimationAction;
  private oneShotT = 0;
  private additive: (THREE.AnimationAction | undefined)[] = [];
  private addW = [0, 0, 0, 0];
  private materials: THREE.MeshStandardMaterial[] = [];
  private baseEmissive: THREE.Color[] = [];
  private hazeU: { value: number }[] = [];
  private haze = 0;
  private baseOpacity: number[] = [];
  private baseTransparent: boolean[] = [];
  private spine: THREE.Bone[] = [];
  private wasAttack = false; private wasHit = false; private wasDead = false; private wasStagger = false; private wasDodge = false; private wasParry = false;
  private shield: THREE.Mesh;
  private shieldMat: THREE.MeshBasicMaterial;
  private shieldA = 0;
  private highlight = 0;
  private highlightColor = new THREE.Color('#7ef0d8');
  private tmpQ = new THREE.Quaternion(); private tmpQ2 = new THREE.Quaternion(); private up = new THREE.Vector3(0, 1, 0);
  private sideAxis = new THREE.Vector3(1, 0, 0);
  private tmpE = new THREE.Euler();
  private recolor: Recolor;
  public lastUpdate = 0;
  public visibleLength = 1;
  readonly def;
  readonly heightUnits: number;
  /** Arms that lie along what they are on, where the creature asks for it. */
  private armConform?: ArmConform;
  /** The Eat clip is a progress-driven performance rather than a loop. */
  readonly feedingPerformance: boolean;
  readonly authoredFeeding?: AuthoredFeeding;

  constructor(readonly creatureId: CreatureId, loaded: Loaded, private shared: { shieldGeo: THREE.BufferGeometry }, readonly lod: Lod = 0) {
    this.def = creature(creatureId);
    this.model = SkeletonUtils.clone(loaded.gltf.scene);
    this.model.scale.setScalar(loaded.unit);
    this.model.position.copy(loaded.center).multiplyScalar(-loaded.unit);
    this.heightUnits = loaded.size.y * loaded.unit;
    this.anchors = new CreatureAnchors(this.model);
    const feeding = this.model.userData.cambrianFeeding;
    const hasEat = loaded.gltf.animations.some((c) => c.name === 'Eat');
    if (hasEat && this.anchors.canGrasp && this.anchors.has('anchor_mouth_inside') &&
        feeding?.version === 1 && feeding.mode === 'authored-grasp' && feeding.clip === 'Eat' &&
        Number.isFinite(feeding.apertureDiameter) && feeding.apertureDiameter > 0 &&
        Number.isFinite(feeding.pickupOffsetLimit) && feeding.pickupOffsetLimit > 0) {
      this.authoredFeeding = { apertureDiameter: feeding.apertureDiameter * loaded.unit, pickupOffsetLimit: feeding.pickupOffsetLimit * loaded.unit };
    }
    this.feedingPerformance = hasEat && (FEEDING_PERFORMANCE.has(creatureId) || !!this.authoredFeeding);
    this.inner.add(this.model);
    this.group.add(this.inner);
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const cloned = mats.map((m) => { const c = (m as THREE.MeshStandardMaterial).clone(); return c; });
        o.material = Array.isArray(o.material) ? cloned : cloned[0];
        for (const c of cloned) if (c instanceof THREE.MeshStandardMaterial) this.materials.push(c);
      }
      if (o instanceof THREE.Bone) { const m = SPINE_RE.exec(o.name); if (m) this.spine.push(o); }
    });
    // Translucent bodies (the jellies) are settled before their base state is recorded, so the
    // hit flash and the corpse fade restore what is actually drawn.
    this.extraMats = settleTranslucency(this.model);
    for (const m of this.materials) { this.baseEmissive.push(m.emissive.clone()); this.baseOpacity.push(m.opacity); this.baseTransparent.push(m.transparent); }
    // All of a creature's colour lives in its vertex colours, so its palette is a shader hook on
    // the materials cloned just above rather than a second set of models. Both LODs share the
    // material names the slots are read from, so a distant creature keeps its colours.
    if (this.def.conformArms) { const c = new ArmConform(this.model); if (c.active) this.armConform = c; }
    this.recolor = makeRecolor(this.model); this.recolor.setScheme(schemeForCreature(creatureId));
    // Distance haze, chained after the palette hook (which owns onBeforeCompile). Mixing the
    // finished pixel toward the water it is seen through is the only correct way to fade a body
    // into the background: tinting the albedo would darken it instead, since a creature's colour
    // lives in its vertex colours and material.color is a white multiplier.
    for (const m of this.materials) {
      const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
      const u = { value: 0 };
      this.hazeU.push(u);
      m.onBeforeCompile = function (shader, renderer) {
        prev?.call(this, shader, renderer);
        shader.uniforms.uHaze = u;
        shader.fragmentShader = 'uniform float uHaze;\n' + shader.fragmentShader.replace(
          '#include <fog_fragment>',
          '#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, uHaze);\n#endif');
      };
      m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '-haze'; };
      m.needsUpdate = true;
    }
    this.spine.sort((a, b) => Number(SPINE_RE.exec(a.name)![2]) - Number(SPINE_RE.exec(b.name)![2]));
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of loaded.gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.playLoop('Idle');
    this.additive = ['TurnLeft', 'TurnRight', 'Dive', 'Rise'].map((n) => {
      const clip = loaded.gltf.animations.find((c) => c.name === n);
      if (!clip) return undefined;
      const add = THREE.AnimationUtils.makeClipAdditive(clip.clone());
      const act = this.mixer.clipAction(add);
      act.setEffectiveWeight(0).play(); act.time = clip.duration * 0.5; act.paused = true;
      return act;
    });
    // Guard shield: a translucent cap in front of the body so a block reads instantly.
    this.shieldMat = new THREE.MeshBasicMaterial({ color: '#7ff0ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.shield = new THREE.Mesh(shared.shieldGeo, this.shieldMat);
    this.shield.renderOrder = 4; this.shield.visible = false;
    this.inner.add(this.shield);
  }

  /** First clip name that exists on this rig. Lets hand-authored clips replace the stand-ins by name alone. */
  private pick(...names: string[]) { return names.find((n) => this.actions.has(n)); }
  has(name: string) { return this.actions.has(name); }

  private playLoop(name: string) {
    const act = this.actions.get(name);
    if (!act || act === this.loco) return;
    const prev = this.loco;
    act.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    prev?.crossFadeTo(act, 0.2, false);
    this.loco = act;
  }
  private playOnce(name: string, duration?: number, clamp = true) {
    const act = name ? this.actions.get(name) : undefined;
    if (!act) return;
    this.oneShot?.fadeOut(0.08);
    act.reset().setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = clamp;
    const d = duration ?? act.getClip().duration;
    act.setEffectiveTimeScale(act.getClip().duration / d).setEffectiveWeight(1).fadeIn(0.06).play();
    this.oneShot = act; this.oneShotT = d;
  }

  /** Synchronize the authored pickup/carry pose with actual consumption progress. */
  poseFeeding(progress: number) {
    const eat = this.actions.get('Eat'); if (!eat) return;
    this.playLoop('Eat');
    if (this.authoredFeeding) {
      // This asset owns the whole cupping pose. A fading locomotion/attack or
      // additive turn must not flatten its arms while the clip is scrubbed.
      for (const action of this.actions.values()) if (action !== eat) action.stop();
      this.oneShot = undefined; this.oneShotT = 0;
      this.additive.forEach(a => a?.setEffectiveWeight(0)); this.addW.fill(0);
      eat.stopFading().stopWarping().setEffectiveWeight(1).setLoop(THREE.LoopOnce, 1).play();
      eat.clampWhenFinished = true; eat.paused = true;
      eat.time = THREE.MathUtils.clamp(progress, 0, 1) * eat.getClip().duration;
      this.mixer.update(0); this.group.updateWorldMatrix(true, true);
      return;
    }
    this.oneShot?.setEffectiveWeight(0);
    eat.setEffectiveWeight(1); eat.time = THREE.MathUtils.clamp(progress, 0, .99999) * eat.getClip().duration;
    this.mixer.update(0); this.group.updateWorldMatrix(true, true);
  }

  /** Where the bell is in its beat, and how far it is tipped over. Pulse swimmers only. */
  private bellPulsing = false;
  private bellTilt = 0;

  /**
   * A medusa swims in surges, and the surge *is* the animation. `pulseT` is the simulation's own
   * place in the contraction (`src/sim/locomotion.ts`): the bell throws water over the first
   * `PULSE_THRUST` of a `PULSE_CYCLE` and coasts through the refill. The `Swim` clip is exactly one
   * cycle long with its squeeze filling exactly that window, so scrubbing the clip to `pulseT`
   * makes the bell you watch close the water actually being thrown, rather than a loop running
   * near it. Asking for nothing pins `pulseT` at zero, and the animal falls back to `Idle`, which
   * is the same beat at a third of the size and half the rate.
   *
   * Returns true when it has taken charge of the locomotion layer.
   */
  private bell(a: Actor) {
    if (this.def.swimStyle !== 'pulse') return false;
    const swim = this.actions.get('Swim');
    if (!swim) return false;
    this.bellPulsing = a.pulseT > 0;
    if (this.bellPulsing) {
      this.playLoop('Swim');
      if (this.loco === swim) { swim.paused = true; swim.time = bellPhase(a.pulseT) * swim.getClip().duration; }
    } else {
      swim.paused = false;
      this.playLoop('Idle');
    }
    return true;
  }

  /** Eases toward `bellTilt`, which is the drift back to upright when nothing is being asked. */
  private bellAim(a: Actor, cruise: number, dt: number) {
    this.bellTilt = damp(this.bellTilt, bellTilt(Math.hypot(a.vel.x, a.vel.z), cruise, a.pulseT), 3.2, dt);
    return this.bellTilt;
  }

  /** Distant creatures stop casting shadows; the shadow pass does not frustum-cull these meshes. */
  setShadow(on: boolean) {
    if (this.shadowOn === on) return;
    this.shadowOn = on;
    this.model.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.depthPrepass) (o as THREE.Mesh).castShadow = on; });
  }
  private shadowOn = true;
  /** Takes the body apart as it is eaten; built lazily on the first bite. */
  private carcassParts?: Carcass;
  /** Depth pre-pass materials made for translucent bodies; owned here so they are disposed. */
  private extraMats: THREE.Material[] = [];

  /** The eaten share of this body, cut out of the model itself. See `carcass.ts`. */
  get carcass(): Carcass { return (this.carcassParts ??= new Carcass(this.model, [...this.materials, ...this.extraMats])); }
  /** Whole again — and nothing is built for a body that was never bitten. */
  restoreCarcass() { this.carcassParts?.reset(); }
  /**
   * Lay the arms along the ground under them, or around whatever the animal is holding. Called
   * after `update`, because it bends the pose the mixer has just written.
   */
  conform(surface: Surface, weight = 1, dt = 1 / 60) { this.armConform?.apply(this.model, surface, weight, dt); }
  /** This body shapes itself to what it is on. */
  get conforms() { return !!this.armConform; }

  setHighlight(intensity: number, color?: string) { this.highlight = intensity; if (color) this.highlightColor.set(color); }

  /**
   * Distance haze. Fog alone leaves a far-off giant reading as a solid dark shape; this washes the
   * body toward the water colour on top of it, so something across the reef is pale background
   * ambience and only resolves into a dark, obviously-there animal as it closes. Set per viewport
   * immediately before that viewport renders, so split-screen players each get their own distance.
   * The colour mixed toward is the viewport's own fog colour, so it matches whatever water the
   * viewer is in.
   */
  setHaze(amount: number) {
    const a = clamp(amount, 0, 1);
    if (a === this.haze) return;
    this.haze = a;
    for (const u of this.hazeU) u.value = a;
  }

  /**
   * `alpha` is how far this frame sits between the last two simulation steps (0 = the previous
   * step, 1 = the current one). The body's transform is interpolated across it so motion is smooth
   * on displays that do not happen to refresh at exactly the simulation's 60 Hz. A jump larger
   * than the creature could have made in one step is a teleport or a respawn, and snaps instead.
   */
  update(a: Actor, dt: number, time: number, animate = true, alpha = 1) {
    const def = this.def;
    const L = lengthOf(a);
    this.visibleLength = L;
    const speed = Math.hypot(a.vel.x, a.vel.y, a.vel.z);
    const cruise = def.speed * Math.pow(a.scale, 0.45);
    // Crawlers carry their vertical motion in `hopVel` (hop and paddle), not in `vel.y`.
    const paddling = def.ground && !a.grounded && a.state !== 'dead';
    const vy = def.ground ? (paddling ? a.hopVel : 0) : a.vel.y;

    if (animate) {
      // locomotion layer
      const held = a.state === 'ability' && a.abilityActive && ['collectorWake','pharyngealPump','planktonComb','whipSearch'].includes(def.ability);
      if (a.state === 'dead') { /* handled by one-shot */ }
      else if (a.state === 'eating' || a.holdT > 0) { this.playLoop((this.authoredFeeding && a.state !== 'eating' ? this.pick('Grab', 'Idle') : this.pick('Eat', 'Grab')) ?? (def.ground ? 'Crawl' : 'Swim')); this.loco?.setEffectiveTimeScale(this.has('Eat') ? 1 : 0.55); }
      else if (a.state === 'swallowed') { this.playLoop(this.pick('Stagger', 'Hit') ?? 'Idle'); this.loco?.setEffectiveTimeScale(0.8); }
      else if ((a.hideMode === 'burrowed' || ((a.state === 'guard' || a.state === 'parry') && ['anchor','enroll','shellUp','bristleFlare'].includes(def.ability))) && this.has('Ability')) { this.playLoop('Ability'); this.loco?.setEffectiveTimeScale(.55); }
      else if ((a.state === 'guard') && this.has('Guard')) { this.playLoop('Guard'); this.loco?.setEffectiveTimeScale(1); }
      // Clinging to something bigger: the grip is held, so the grab pose is the locomotion.
      else if (a.rideHost >= 0 && a.state === 'free' && this.has('Grab')) { this.playLoop('Grab'); this.loco?.setEffectiveTimeScale(0.4); }
      else if (held && this.has('Ability')) { this.playLoop('Ability'); this.loco?.setEffectiveTimeScale(1); }
      else if (a.state === 'moult' && this.has('Moult')) { this.playLoop('Moult'); this.loco?.setEffectiveTimeScale(1); }
      else {
        // A crawler off the seabed is paddling: keep its leg cycle running even when it is
        // barely translating, so the climb reads as swimming rather than hovering.
        const moving = speed > 0.35 || paddling;
        if (this.bell(a)) { /* a bell picks its own clip and its own place in it */ }
        else this.playLoop(moving ? (def.ground ? 'Crawl' : 'Swim') : 'Idle');
        // smaller creatures beat faster
        const rateScale = 1 / Math.pow(Math.max(a.scale, 0.1), 0.35);
        const beat = Math.max(speed, paddling ? cruise * 0.85 : 0);
        if (!this.bellPulsing) this.loco?.setEffectiveTimeScale(moving ? clamp((beat / cruise) * rateScale, 0.5, 2.6) : 0.75 * rateScale);
      }
      // one-shots
      const inAttack = a.state === 'attack' || a.state === 'grabbing' || a.state === 'pounce' || (a.state === 'ability' && !held);
      if (inAttack && !this.wasAttack) {
        if (a.state === 'attack' && a.move) {
          const clip = a.moveKind === 'heavy' ? this.pick('Heavy', 'Attack')! : this.pick('Bite', 'Attack')!;
          this.playOnce(clip, Math.max(0.35, a.move.windup + a.move.active + a.move.recovery * 0.6), false);
        } else if (a.state === 'grabbing') this.playOnce(this.pick('Grab', 'Heavy', 'Attack')!, 0.9, false);
        else if (a.state === 'pounce') this.playOnce(this.pick('Heavy', 'Attack')!, Math.max(0.4, a.stateDur + 0.2), false);
        else this.playOnce(this.pick('Ability', 'Attack')!, Math.max(0.4, a.stateDur), false);
      }
      if (a.state === 'grabbing' && this.wasAttack && this.oneShotT <= 0) this.playOnce(this.pick('Grab', 'Attack')!, 0.9, false);
      // A dash and a dodge are different moves — one drives, one jinks — so a model that has been
      // given its own Dash clip uses it for the long one and keeps Dodge for the short jink. Until
      // that clip lands (see docs/cambrian/refinement-queue.md) both read as the dodge.
      if (a.state === 'dodge' && !this.wasDodge) this.playOnce((a.stateDur > 0.36 ? this.pick('Dash', 'Dodge') : this.pick('Dodge', 'Dash')) ?? '', a.stateDur + 0.1, false);
      if (a.state === 'parry' && !this.wasParry && this.has('Parry')) this.playOnce('Parry', 0.35, false);
      const hurt = a.hitFlash > 0.3 && a.state !== 'dead' && a.state !== 'stagger';
      if (hurt && !this.wasHit) this.playOnce('Hit', 0.5, false);
      if (a.state === 'stagger' && !this.wasStagger) this.playOnce(this.pick('Stagger', 'Hit')!, a.stateDur, true);
      this.wasDodge = a.state === 'dodge'; this.wasParry = a.state === 'parry';
      if (a.state === 'dead' && !this.wasDead) this.playOnce('Death', undefined, true);
      if (a.state !== 'dead' && this.wasDead) { this.oneShot?.stop(); this.oneShot = undefined; this.oneShotT = 0; this.playLoop('Idle'); }
      this.wasAttack = inAttack; this.wasHit = hurt; this.wasDead = a.state === 'dead'; this.wasStagger = a.state === 'stagger';
      if (this.oneShotT > 0) { this.oneShotT -= dt; if (this.oneShotT < 0.12 && a.state !== 'dead' && a.state !== 'stagger') this.oneShot?.fadeOut(0.12); }

      // additive layers: turn / dive / rise, dodge & guard reuse them
      // Increasing yaw turns the creature to its LEFT, and right = (-cos yaw, 0, sin yaw).
      const turning = a.bank * -6;                                    // > 0 while turning left
      const dodging = a.state === 'dodge' && !this.has('Dodge') && !this.has('Dash') ? 0.9 : 0;
      const guarding = (a.state === 'guard' || a.state === 'parry') && !this.has('Guard') ? 0.45 : 0;
      const lateral = dodging ? -a.dodgeDir.x * Math.cos(a.yaw) + a.dodgeDir.z * Math.sin(a.yaw) : 0; // + = to its right
      const targets = [
        Math.max(0, turning) * 0.45 + (dodging && lateral < 0 ? dodging : 0),
        Math.max(0, -turning) * 0.45 + (dodging && lateral >= 0 ? dodging : 0),
        Math.max(0, -vy) * 0.25 + guarding + (def.ground && a.state === 'guard' ? 0.3 : 0),
        Math.max(0, vy) * 0.25,
      ];
      this.additive.forEach((act, i) => {
        if (!act) return;
        const t = a.state === 'dead' ? 0 : Math.min(0.95, targets[i]) * (a.state === 'attack' ? 0.4 : 1);
        this.addW[i] = damp(this.addW[i], t, 8, dt);
        act.setEffectiveWeight(this.addW[i]);
      });
      if (a.state === 'dead') { this.loco?.setEffectiveWeight(Math.max(0, 1 - a.corpseT * 2)); this.oneShot?.setEffectiveWeight(def.proceduralUndulation === false ? 1 : Math.max(0.15, 1 - a.corpseT * 0.7)); }
      else this.loco?.setEffectiveWeight(this.oneShotT > 0.1 ? 0.15 : 1);
      this.mixer.update(a.hitStop > 0 ? dt * 0.1 : dt);

      // Limp "ragdoll": once dead the spine sags and sways with decaying wobble, and the animation
      // fades out underneath it, so the body hangs rather than holding a pose.
      // New anatomical rigs own their death deformation as well as locomotion.
      if (this.spine.length > 2 && def.proceduralUndulation !== false && a.state === 'dead') {
        const k = Math.exp(-a.corpseT * 0.5);
        for (let i = 0; i < this.spine.length; i++) {
          const f = i / this.spine.length;
          const sag = (0.12 + 0.35 * k) * f * Math.sin(time * 2.1 + i * 0.8 + a.id);
          const droop = 0.18 * f * (1 - k * 0.5);
          this.tmpQ2.setFromAxisAngle(this.up, sag * 0.6);
          this.spine[i].quaternion.multiply(this.tmpQ2);
          this.tmpQ2.setFromAxisAngle(this.sideAxis, droop + sag * 0.4);
          this.spine[i].quaternion.multiply(this.tmpQ2);
        }
      }
      // procedural undulation along the spine for swimmers
      if (this.spine.length > 3 && def.proceduralUndulation !== false && !def.ground && a.state !== 'dead') {
        const amp = clamp(speed / Math.max(cruise, 0.1), 0, 1.6) * 0.045 + Math.abs(a.bank) * 0.02;
        const freq = 5.5 / Math.pow(Math.max(a.scale, 0.1), 0.35);
        // Local-space bend: each spine bone yaws slightly about its own up axis. Cheaper than
        // resolving world quaternions per bone (which walks the whole ancestor chain every time).
        for (let i = 0; i < this.spine.length; i++) {
          const bone = this.spine[i];
          const ang = Math.sin(time * freq - i * 0.55) * amp * (0.3 + i / this.spine.length);
          bone.quaternion.multiply(this.tmpQ2.setFromAxisAngle(this.up, ang));
        }
      }
    }

    this.recolor.blend(schemeForCreature(this.creatureId), a.camoColors, a.camoStrength);
    // Transform
    const t = a.prevT;
    const jump = Math.hypot(a.pos.x - t.x, a.pos.y - t.y, a.pos.z - t.z) > Math.max(2, L * 3);
    const k = jump ? 1 : clamp(alpha, 0, 1);
    this.group.position.set(t.x + (a.pos.x - t.x) * k, t.y + (a.pos.y - t.y) * k, t.z + (a.pos.z - t.z) * k);
    this.group.quaternion.setFromEuler(this.tmpE.set(
      t.pitch + wrapAngle(a.pitch - t.pitch) * k,
      t.yaw + wrapAngle(a.yaw - t.yaw) * k,
      t.bank + wrapAngle(a.bank - t.bank) * k, 'YXZ'));
    let sx = L, sy = L, sz = L, oy = 0;
    if ((a.state === 'guard' || a.state === 'parry') && a.abilityActive) {
      const t = clamp(a.stateT / 0.5, 0, 1);
      const tail = 1;
      const k = Math.min(t, tail);
      switch (def.ability) {
        case 'sedimentDive': oy = -L * .20 * k; break;
        case 'burrow': sy = L * (1 - 0.75 * k); oy = -L * 0.22 * k; break;
        case 'enroll': sz = L * (1 - 0.4 * k); sy = L * (1 + 0.35 * k); this.inner.rotation.x = a.roll; break;
        case 'shellUp': sy = L * (1 - 0.15 * k); break;
        case 'anchor': oy = -L * 0.06 * k; break;
        case 'bristleFlare': sx = L * (1 + 0.12 * k); break;
      }
    } else if (def.swimStyle === 'pulse') this.inner.rotation.x = this.bellAim(a, cruise, dt);
    else this.inner.rotation.x = damp(this.inner.rotation.x, 0, 8, dt);
    if (a.hideMode === 'burrowed') { const k = clamp(a.hideT / .6, 0, 1); oy -= L * .5 * k; sy *= 1 - .35*k; }
    // A body eaten in bites loses the meat itself, so it must not also shrink; one swallowed
    // whole has no bites to show and still closes down as it goes in.
    if (a.state === 'dead' && a.eatBites <= 1) { const e = a.eaten; sx *= 1 - e * 0.6; sy *= 1 - e * 0.6; sz *= 1 - e * 0.6; }
    this.group.visible = !(a.state === 'dead' && a.eaten >= 1 && (a.controller === 'player' || a.controller === 'bot' || a.swallowedBy >= 0));
    if (a.state === 'swallowed') { const t = clamp(a.stateT / a.stateDur, 0, 1); const k = 1 - t * 0.9; sx *= k; sy *= k * (1 - t * 0.3); sz *= k; }
    // shield
    const guarding = a.state === 'guard' || a.state === 'parry' || (a.abilityActive && (def.ability === 'shellUp' || def.ability === 'anchor'));
    this.shieldA = damp(this.shieldA, guarding ? (a.state === 'parry' ? 1 : 0.55) + (a.hitFlash > 0.25 ? 0.5 : 0) : 0, guarding ? 18 : 10, dt);
    this.shield.visible = this.shieldA > 0.02;
    if (this.shield.visible) {
      this.shieldMat.opacity = this.shieldA * 0.36;
      this.shieldMat.color.set(a.state === 'parry' ? '#ffffff' : a.hitFlash > 0.25 ? '#dfffff' : '#7ff0ff');
      const r = 0.36;                            // group is scaled by L; shield is in unit (body-length) space
      this.shield.scale.setScalar(r * (1 + (1 - this.shieldA) * 0.25));
      this.shield.position.set(0, 0.04, 0.36);
    }
    if (a.state === 'moult') { const p = Math.sin(a.stateT * 9) * 0.06; sx *= 1 + p; sz *= 1 - p; }
    this.group.scale.set(sx, sy, sz);
    // The eaten-away plane is in world space; a corpse drifts and rolls under it.
    if (this.carcassParts?.active) { this.group.updateWorldMatrix(true, true); this.carcassParts.sync(); }
    this.inner.position.y = oy / Math.max(L, 1e-3);

    // emissive: hit flash, highlight, ability glow
    const flash = a.hitFlash > 0 ? Math.min(1, a.hitFlash * 2.2) : 0;
    const glow = this.highlight;
    const abilityGlow = a.hideMode === 'none' && a.abilityActive ? 0.25 + 0.15 * Math.sin(time * 12) : 0;
    const moult = a.state === 'moult' ? 0.6 : 0;
    const protect = a.spawnProtect > 0 ? 0.08 + 0.06 * Math.sin(time * 10) : 0;
    const dead = a.state === 'dead' ? 1 : 0;
    for (let i = 0; i < this.materials.length; i++) {
      const m = this.materials[i];
      m.emissive.copy(this.baseEmissive[i]);
      if (flash > 0) m.emissive.lerp(new THREE.Color('#ff6a5a'), flash * 0.85);
      if (glow > 0) m.emissive.lerp(this.highlightColor, glow * 0.7);
      if (abilityGlow > 0) m.emissive.lerp(new THREE.Color(this.def.accent), abilityGlow);
      if (moult > 0) m.emissive.lerp(new THREE.Color('#fff2c2'), moult);
      if (protect > 0) m.emissive.lerp(new THREE.Color('#9be9ff'), protect);
      if (dead) m.emissive.multiplyScalar(0.3);
      m.emissiveIntensity = 1;
      m.opacity = this.baseOpacity[i] * (dead ? clamp(1 - Math.max(0, a.corpseT - 35) / 10, 0, 1) : 1);
      m.transparent = this.baseTransparent[i] || (dead > 0 && m.opacity < 1);
    }
    this.lastUpdate = time;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.materials.forEach((m) => m.dispose());
    this.extraMats.forEach((m) => m.dispose());
    this.shieldMat.dispose();
    this.group.removeFromParent();
  }
}
