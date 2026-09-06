import * as THREE from 'three';
import { damp, heading } from '../shared/math';
import { bodyRadius, isAlive, isHidden, lengthOf } from '../sim/actors';
import type { Actor } from '../sim/types';
import { feedingPhase, type CreatureAnchors } from './anchors';

/** The slice of a CreatureView the attachment pass needs; kept narrow so it runs headless in tools/. */
export interface AttachView {
  group: THREE.Object3D;
  anchors: CreatureAnchors;
  /** Rendered body length in world units. */
  visibleLength: number;
  /** True when the Eat clip is an authored reach/grasp/carry performance that should be scrubbed by consumption progress. */
  feedingPerformance: boolean;
  poseFeeding(progress: number): void;
}
export interface AttachWorld { actors: Actor[]; byId(id: number): Actor | undefined; }
interface FeedingState { target: number; initialEaten: number; pickup: THREE.Vector3; startTip: THREE.Vector3; lastStateT: number; }
interface AimState { weight: number; target: THREE.Vector3; }

/**
 * Post-animation pass, run after every actor transform and mixer update and before rendering.
 * It never touches simulation state: it steers rigs' articulated attack sockets at whatever they are
 * striking, carries food to the mouth during eating, holds grabbed prey at the grasp socket and draws
 * swallowed prey into the mouth. Every step keys off the sockets a rig actually has, so a creature
 * without a grasp chain still eats with its mouth and one without articulated limbs still swallows.
 */
export class Attachments {
  private feeding = new Map<number, FeedingState>();
  private aim = new Map<number, AimState>();
  private anchorPoint = new THREE.Vector3(); private mouthPoint = new THREE.Vector3(); private insidePoint = new THREE.Vector3();
  private target = new THREE.Vector3(); private tmp = new THREE.Vector3();

  clear() { this.feeding.clear(); this.aim.clear(); }

  sync(world: AttachWorld, views: Map<number, AttachView>, dt: number) {
    this.aimAttacks(world, views, dt);
    const claimed = this.feed(world, views);
    this.hold(world, views, claimed);
  }

  /** The actor an attacker is visibly striking at, or undefined outside the strike window. */
  strikeTarget(a: Actor, world: AttachWorld, views: Map<number, AttachView>): Actor | undefined {
    const striking = (a.state === 'attack' && !!a.move && a.stateT < a.move.windup + a.move.active + a.move.recovery * .5) || a.state === 'pounce';
    if (!striking) return undefined;
    const L = lengthOf(a);
    const locked = a.lockTarget >= 0 ? world.byId(a.lockTarget) : undefined;
    if (locked && isAlive(locked) && Math.hypot(locked.pos.x - a.pos.x, locked.pos.y - a.pos.y, locked.pos.z - a.pos.z) < L * 2.5 + lengthOf(locked)) return locked;
    // Otherwise the nearest rendered body ahead of the mouth, roughly what the sim's hit test will reach.
    const h = heading(a.yaw);
    let best: Actor | undefined, bd = Infinity;
    for (const id of views.keys()) {
      const o = world.byId(id);
      if (!o || o.id === a.id || !isAlive(o) || isHidden(o)) continue;
      const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y, dz = o.pos.z - a.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d >= bd || d > L * 1.3 + bodyRadius(o)) continue;
      if ((dx * h.x + dz * h.z) / Math.max(d, 1e-6) < .2) continue;
      bd = d; best = o;
    }
    return best;
  }

  /** Point on the victim a strike should land on: its near surface, not the centre of a large body. */
  private aimPoint(a: Actor, victim: Actor, fv: AttachView | undefined, out: THREE.Vector3) {
    if (fv) out.copy(fv.group.position); else out.set(victim.pos.x, victim.pos.y, victim.pos.z);
    this.tmp.set(a.pos.x, a.pos.y, a.pos.z).sub(out);
    const d = this.tmp.length();
    if (d > 1e-6) out.addScaledVector(this.tmp, Math.min(bodyRadius(victim) * .8, d * .5) / d);
  }

  private aimAttacks(world: AttachWorld, views: Map<number, AttachView>, dt: number) {
    for (const [id, v] of views) {
      const a = world.byId(id);
      if (!a || !v.anchors.canAim) continue;
      const victim = this.strikeTarget(a, world, views);
      let s = this.aim.get(id);
      if (!s) { if (!victim) continue; s = { weight: 0, target: new THREE.Vector3() }; this.aim.set(id, s); }
      if (victim) this.aimPoint(a, victim, views.get(victim.id), s.target);
      // Ease in fast enough to catch a light attack's windup, ease out so the limb settles back into the clip.
      s.weight = damp(s.weight, victim ? 1 : 0, victim ? 16 : 9, dt);
      if (s.weight < .02) { this.aim.delete(id); continue; }
      v.anchors.solveAttack(s.target, s.weight);
    }
    for (const id of this.aim.keys()) if (!views.has(id)) this.aim.delete(id);
  }

  /** Eating: the grasp chain (or the nearest limbs, or just the mouth) collects the corpse and takes it inside. */
  private feed(world: AttachWorld, views: Map<number, AttachView>): Set<number> {
    const active = new Set<number>(), claimed = new Set<number>();
    for (const predator of world.actors) {
      if (predator.state !== 'eating') continue;
      const food = world.byId(predator.eatingTarget), pv = views.get(predator.id);
      const fv = food && views.get(food.id);
      if (!food || !pv || !fv || claimed.has(food.id) || !pv.anchors.world('anchor_mouth', this.mouthPoint)) continue;
      const grasp = pv.anchors.canGrasp && pv.anchors.world('anchor_grasp', this.anchorPoint);
      if (!grasp && !pv.anchors.nearestAttack(fv.group.position, this.anchorPoint)) this.anchorPoint.copy(this.mouthPoint);
      active.add(predator.id); claimed.add(food.id);
      let state = this.feeding.get(predator.id);
      if (!state || state.target !== food.id || predator.stateT < state.lastStateT) {
        state = { target: food.id, initialEaten: food.eaten, pickup: fv.group.position.clone(), startTip: this.anchorPoint.clone(), lastStateT: predator.stateT };
        this.feeding.set(predator.id, state);
      }
      state.lastStateT = predator.stateT;
      const progress = THREE.MathUtils.clamp((food.eaten - state.initialEaten) / Math.max(.001, 1 - state.initialEaten), 0, 1);
      const phase = feedingPhase(progress);
      if (pv.feedingPerformance) pv.poseFeeding(progress);
      pv.anchors.world('anchor_mouth', this.mouthPoint);
      this.insidePoint.copy(this.mouthPoint); pv.anchors.world('anchor_mouth_inside', this.insidePoint);
      // A corpse much larger than its eater stays where it fell and is reached into rather than carried.
      const carry = phase.attached && fv.visibleLength <= pv.visibleLength * 1.5;
      const target = this.target.copy(state.startTip).lerp(state.pickup, phase.pickup);
      if (carry) {
        target.copy(state.pickup).lerp(this.mouthPoint, phase.carry);
        // Carry beneath the head rather than through the head mesh.
        const down = this.tmp.set(0, -pv.visibleLength * .13 * Math.sin(Math.PI * phase.carry), 0).applyQuaternion(pv.group.quaternion);
        target.add(down);
      }
      if (grasp) {
        pv.anchors.solveGrasp(target);
        if (carry && pv.anchors.world('anchor_grasp', this.anchorPoint)) fv.group.position.copy(this.anchorPoint).lerp(this.insidePoint, phase.swallow);
      } else {
        if (carry) fv.group.position.copy(target).lerp(this.insidePoint, phase.swallow);
        // No grasp chain: the nearest articulated limbs close on the food instead.
        pv.anchors.solveAttack(carry ? fv.group.position : target, 1, 2);
      }
      if (carry) {
        // A consumed corpse closes down to the aperture, then disappears inside it.
        const aperture = Math.min(1, pv.visibleLength * .04 / Math.max(.001, fv.visibleLength));
        fv.group.scale.multiplyScalar(THREE.MathUtils.lerp(1, aperture, phase.carry) * (1 - phase.swallow));
        fv.group.updateWorldMatrix(true, true);
      }
    }
    for (const id of this.feeding.keys()) if (!active.has(id)) this.feeding.delete(id);
    return claimed;
  }

  /** Grabbed prey rides the grasp (or primary attack) socket; swallowed prey sinks from the mouth to the inside socket. */
  private hold(world: AttachWorld, views: Map<number, AttachView>, claimed: Set<number>) {
    for (const food of world.actors) {
      if (claimed.has(food.id)) continue;
      const predatorId = food.state === 'grabbed' ? food.grabbedBy : food.state === 'swallowed' ? food.swallowedBy : -1;
      if (predatorId < 0) continue;
      const pv = views.get(predatorId), fv = views.get(food.id); if (!pv || !fv) continue;
      if (food.state === 'grabbed') {
        if (pv.anchors.world('anchor_grasp', this.anchorPoint) || pv.anchors.world('anchor_attack_primary', this.anchorPoint)) fv.group.position.copy(this.anchorPoint);
      } else if (pv.anchors.world('anchor_mouth', this.anchorPoint)) {
        this.insidePoint.copy(this.anchorPoint); pv.anchors.world('anchor_mouth_inside', this.insidePoint);
        fv.group.position.copy(this.anchorPoint).lerp(this.insidePoint, THREE.MathUtils.clamp(food.stateT / Math.max(.001, food.stateDur), 0, 1));
      }
    }
  }

  /** World point where an attacker's strike visibly lands on `victimPos`, or false if the rig has no attack sockets. */
  contactPoint(pv: AttachView | undefined, victimPos: { x: number; y: number; z: number }, out: THREE.Vector3): boolean {
    if (!pv) return false;
    this.tmp.set(victimPos.x, victimPos.y, victimPos.z);
    return pv.anchors.nearestAttack(this.tmp, out);
  }
}
