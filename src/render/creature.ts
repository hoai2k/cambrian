import * as THREE from 'three';
import { CreatureAnchors } from './anchors';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { clamp, damp } from '../shared/math';
import { creature, type CreatureId } from '../sim/creatures';
import { lengthOf } from '../sim/actors';
import type { Actor } from '../sim/types';

interface Loaded { gltf: GLTF; unit: number; center: THREE.Vector3; size: THREE.Vector3; }
export type Lod = 0 | 1;
const cache = new Map<string, Promise<Loaded>>();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export const creatureUrl = (id: CreatureId, lod: Lod = 0) =>
  `${import.meta.env.BASE_URL}assets/creatures/${id}${lod ? '.lod1' : ''}.glb`;

export function loadCreature(id: CreatureId, onProgress?: (loaded: number, total: number) => void, lod: Lod = 0): Promise<Loaded> {
  const key = `${id}:${lod}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<GLTF>((res, rej) => loader.load(creatureUrl(id, lod), res, (e) => onProgress?.(e.loaded, e.total), rej)).then((gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const unit = 1 / Math.max(size.z, size.x, 0.01);
      gltf.scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.frustumCulled = false; } });
      return { gltf, unit, center, size };
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
 * (see `changedClips` in docs/creature-anchors-manifest.json). Every other rig loops its Eat clip while
 * the attachment pass moves the food through its sockets.
 */
const FEEDING_PERFORMANCE: ReadonlySet<CreatureId> = new Set<CreatureId>(['opabinia']);

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
  private spine: THREE.Bone[] = [];
  private wasAttack = false; private wasHit = false; private wasDead = false; private wasStagger = false; private wasDodge = false; private wasParry = false;
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private shield: THREE.Mesh;
  private shieldMat: THREE.MeshBasicMaterial;
  private shieldA = 0;
  private highlight = 0;
  private highlightColor = new THREE.Color('#7ef0d8');
  private tmpQ = new THREE.Quaternion(); private tmpQ2 = new THREE.Quaternion(); private up = new THREE.Vector3(0, 1, 0);
  private sideAxis = new THREE.Vector3(1, 0, 0);
  private tmpE = new THREE.Euler(); private ringQ = new THREE.Quaternion(); private ringE = new THREE.Euler(-Math.PI / 2, 0, 0);
  public lastUpdate = 0;
  public visibleLength = 1;
  readonly def;
  readonly heightUnits: number;
  /** The Eat clip is a progress-driven performance rather than a loop. */
  readonly feedingPerformance: boolean;

  constructor(readonly creatureId: CreatureId, loaded: Loaded, private shared: { ringGeo: THREE.BufferGeometry; shieldGeo: THREE.BufferGeometry }, readonly lod: Lod = 0) {
    this.def = creature(creatureId);
    this.model = SkeletonUtils.clone(loaded.gltf.scene);
    this.model.scale.setScalar(loaded.unit);
    this.model.position.copy(loaded.center).multiplyScalar(-loaded.unit);
    this.heightUnits = loaded.size.y * loaded.unit;
    this.anchors = new CreatureAnchors(this.model);
    this.feedingPerformance = FEEDING_PERFORMANCE.has(creatureId) && loaded.gltf.animations.some((c) => c.name === 'Eat');
    this.inner.add(this.model);
    this.group.add(this.inner);
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const cloned = mats.map((m) => { const c = (m as THREE.MeshStandardMaterial).clone(); return c; });
        o.material = Array.isArray(o.material) ? cloned : cloned[0];
        for (const c of cloned) if (c instanceof THREE.MeshStandardMaterial) { this.materials.push(c); this.baseEmissive.push(c.emissive.clone()); }
      }
      if (o instanceof THREE.Bone) { const m = SPINE_RE.exec(o.name); if (m) this.spine.push(o); }
    });
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
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(shared.ringGeo, this.ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 3;
    this.group.add(this.ring);
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
    this.oneShot?.setEffectiveWeight(0);
    eat.setEffectiveWeight(1); eat.time = THREE.MathUtils.clamp(progress, 0, .99999) * eat.getClip().duration;
    this.mixer.update(0); this.group.updateWorldMatrix(true, true);
  }

  /** Distant creatures stop casting shadows; the shadow pass does not frustum-cull these meshes. */
  setShadow(on: boolean) {
    if (this.shadowOn === on) return;
    this.shadowOn = on;
    this.model.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = on; });
  }
  private shadowOn = true;

  /** Ring under the creature, coloured per viewer. */
  setRing(color: string | null, opacity: number) {
    if (color) this.ringMat.color.set(color);
    this.ringMat.opacity = opacity;
    this.ring.visible = opacity > 0.01;
  }
  setHighlight(intensity: number, color?: string) { this.highlight = intensity; if (color) this.highlightColor.set(color); }

  update(a: Actor, dt: number, time: number, animate = true) {
    const def = this.def;
    const L = lengthOf(a);
    this.visibleLength = L;
    const speed = Math.hypot(a.vel.x, a.vel.y, a.vel.z);
    const cruise = def.speed * Math.pow(a.scale, 0.45);

    if (animate) {
      // locomotion layer
      const held = a.state === 'ability' && a.abilityActive && ['burrow', 'enroll', 'shellUp', 'anchor', 'bristleFlare'].includes(def.ability);
      if (a.state === 'dead') { /* handled by one-shot */ }
      else if (a.state === 'eating' || a.holdT > 0) { this.playLoop(this.pick('Eat', 'Grab') ?? (def.ground ? 'Crawl' : 'Swim')); this.loco?.setEffectiveTimeScale(this.has('Eat') ? 1 : 0.55); }
      else if (a.state === 'swallowed') { this.playLoop(this.pick('Stagger', 'Hit') ?? 'Idle'); this.loco?.setEffectiveTimeScale(0.8); }
      else if ((a.state === 'guard') && this.has('Guard')) { this.playLoop('Guard'); this.loco?.setEffectiveTimeScale(1); }
      else if (held && this.has('Ability')) { this.playLoop('Ability'); this.loco?.setEffectiveTimeScale(1); }
      else if (a.state === 'moult' && this.has('Moult')) { this.playLoop('Moult'); this.loco?.setEffectiveTimeScale(1); }
      else {
        this.playLoop(speed > 0.35 ? (def.ground ? 'Crawl' : 'Swim') : 'Idle');
        // smaller creatures beat faster
        const rateScale = 1 / Math.pow(Math.max(a.scale, 0.1), 0.35);
        this.loco?.setEffectiveTimeScale(speed > 0.35 ? clamp((speed / cruise) * rateScale, 0.5, 2.6) : 0.75 * rateScale);
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
      if (a.state === 'dodge' && !this.wasDodge) this.playOnce(this.pick('Dodge') ?? '', a.stateDur + 0.1, false);
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
      const dodging = a.state === 'dodge' && !this.has('Dodge') ? 0.9 : 0;
      const guarding = (a.state === 'guard' || a.state === 'parry') && !this.has('Guard') ? 0.45 : 0;
      const lateral = dodging ? -a.dodgeDir.x * Math.cos(a.yaw) + a.dodgeDir.z * Math.sin(a.yaw) : 0; // + = to its right
      const targets = [
        Math.max(0, turning) * 0.45 + (dodging && lateral < 0 ? dodging : 0),
        Math.max(0, -turning) * 0.45 + (dodging && lateral >= 0 ? dodging : 0),
        Math.max(0, -a.vel.y) * 0.25 + guarding + (def.ground && a.state === 'guard' ? 0.3 : 0),
        Math.max(0, a.vel.y) * 0.25,
      ];
      this.additive.forEach((act, i) => {
        if (!act) return;
        const t = a.state === 'dead' ? 0 : Math.min(0.95, targets[i]) * (a.state === 'attack' ? 0.4 : 1);
        this.addW[i] = damp(this.addW[i], t, 8, dt);
        act.setEffectiveWeight(this.addW[i]);
      });
      if (a.state === 'dead') { this.loco?.setEffectiveWeight(Math.max(0, 1 - a.corpseT * 2)); this.oneShot?.setEffectiveWeight(Math.max(0.15, 1 - a.corpseT * 0.7)); }
      else this.loco?.setEffectiveWeight(this.oneShotT > 0.1 ? 0.15 : 1);
      this.mixer.update(a.hitStop > 0 ? dt * 0.1 : dt);

      // Limp "ragdoll": once dead the spine sags and sways with decaying wobble, and the animation
      // fades out underneath it, so the body hangs rather than holding a pose.
      if (this.spine.length > 2 && a.state === 'dead') {
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
      if (this.spine.length > 3 && !def.ground && a.state !== 'dead') {
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

    // Transform
    this.group.position.set(a.pos.x, a.pos.y, a.pos.z);
    this.group.quaternion.setFromEuler(this.tmpE.set(a.pitch, a.yaw, a.bank, 'YXZ'));
    let sx = L, sy = L, sz = L, oy = 0;
    if (a.state === 'ability' && a.abilityActive) {
      const t = clamp(a.stateT / 0.5, 0, 1);
      const tail = clamp((a.stateDur - a.stateT) / 0.5, 0, 1);
      const k = Math.min(t, tail);
      switch (def.ability) {
        case 'burrow': sy = L * (1 - 0.75 * k); oy = -L * 0.22 * k; break;
        case 'enroll': sz = L * (1 - 0.4 * k); sy = L * (1 + 0.35 * k); this.inner.rotation.x = a.roll; break;
        case 'shellUp': sy = L * (1 - 0.15 * k); break;
        case 'anchor': oy = -L * 0.06 * k; break;
        case 'bristleFlare': sx = L * (1 + 0.12 * k); break;
      }
    } else this.inner.rotation.x = damp(this.inner.rotation.x, 0, 8, dt);
    if (a.state === 'dead') { const e = a.eaten; sx *= 1 - e * 0.6; sy *= 1 - e * 0.6; sz *= 1 - e * 0.6; }
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
    this.inner.position.y = oy / Math.max(L, 1e-3);

    // ring under the creature (in group space, undo scale)
    this.ring.position.set(0, -(this.heightUnits * 0.5 + 0.08), 0);
    const rs = 0.75;
    this.ring.scale.set(rs, rs, rs);
    this.ring.quaternion.copy(this.group.quaternion).invert().multiply(this.ringQ.setFromEuler(this.ringE));

    // emissive: hit flash, highlight, ability glow
    const flash = a.hitFlash > 0 ? Math.min(1, a.hitFlash * 2.2) : 0;
    const glow = this.highlight;
    const abilityGlow = a.abilityActive ? 0.25 + 0.15 * Math.sin(time * 12) : 0;
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
      m.opacity = dead ? clamp(1 - Math.max(0, a.corpseT - 35) / 10, 0, 1) : 1;
      m.transparent = dead > 0 && m.opacity < 1;
    }
    this.lastUpdate = time;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.materials.forEach((m) => m.dispose());
    this.ringMat.dispose(); this.shieldMat.dispose();
    this.group.removeFromParent();
  }
}
