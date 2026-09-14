import * as THREE from 'three';
import { damp, heading } from '../shared/math';
import { bodyRadius, isAlive, isHidden, lengthOf } from '../sim/actors';
import { rideHold } from '../sim/combat';
import type { Actor } from '../sim/types';
import { feedingPhase, type CreatureAnchors } from './anchors';

/** Asset opt-in dimensions, normalized to the view's unscaled body length. */
export interface AuthoredFeeding { apertureDiameter: number; pickupOffsetLimit: number; }

/** The slice of a CreatureView the attachment pass needs; kept narrow so it runs headless in tools/. */
export interface AttachView {
  group: THREE.Object3D;
  anchors: CreatureAnchors;
  /** Rendered body length in world units. */
  visibleLength: number;
  /** True when the Eat clip is an authored reach/grasp/carry performance that should be scrubbed by consumption progress. */
  feedingPerformance: boolean;
  /** Carry along the Eat clip's grasp path, with a short correction for actual pickup. */
  authoredFeeding?: AuthoredFeeding;
  poseFeeding(progress: number): void;
}
export interface AttachWorld { actors: Actor[]; byId(id: number): Actor | undefined; }
interface FeedingState {
  target: number; initialEaten: number; pickup: THREE.Vector3; startTip: THREE.Vector3; lastStateT: number;
  view: AttachView; authoredContact?: THREE.Vector3; carryAllowed?: boolean;
  correction?: THREE.Vector3; contactError?: THREE.Vector3;
}
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
  /** Which bone each rider has hold of, and where on it. See `gripOn`. */
  private grips = new Map<number, { host: number; bone: string; local: THREE.Vector3; rest: THREE.Quaternion }>();
  private bonePoint = new THREE.Vector3();
  private boneInv = new THREE.Matrix4();
  private boneQuat = new THREE.Quaternion();
  private swingQuat = new THREE.Quaternion();
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
      if (a.state === 'eating' && v.authoredFeeding) { this.aim.delete(id); continue; }
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
      if (!state || state.target !== food.id || predator.stateT < state.lastStateT || (pv.authoredFeeding && state.view !== pv)) {
        state = { target: food.id, initialEaten: food.eaten, pickup: fv.group.position.clone(), startTip: this.anchorPoint.clone(), lastStateT: predator.stateT, view: pv };
        this.feeding.set(predator.id, state);
      }
      state.lastStateT = predator.stateT;
      const progress = THREE.MathUtils.clamp((food.eaten - state.initialEaten) / Math.max(.001, 1 - state.initialEaten), 0, 1);
      const phase = feedingPhase(progress);
      if (pv.authoredFeeding && pv.feedingPerformance && grasp) {
        this.feedAuthored(state, pv, fv, food, progress);
        continue;
      }
      if (pv.feedingPerformance) pv.poseFeeding(progress);
      pv.anchors.world('anchor_mouth', this.mouthPoint);
      this.insidePoint.copy(this.mouthPoint); pv.anchors.world('anchor_mouth_inside', this.insidePoint);
      // Only a body that goes down whole is carried. Anything that takes real bites stays where
      // it fell and is torn into (see carcass.ts), whatever its size.
      const carry = phase.attached && food.eatBites <= 1 && fv.visibleLength <= pv.visibleLength * 1.5;
      const target = this.target.copy(state.startTip).lerp(state.pickup, phase.pickup);
      if (carry) {
        target.copy(state.pickup).lerp(this.mouthPoint, phase.carry);
        // Carry beneath the head rather than through the head mesh.
        const down = this.tmp.set(0, -pv.visibleLength * .13 * Math.sin(Math.PI * phase.carry), 0).applyQuaternion(pv.group.quaternion);
        target.add(down);
      }
      if (grasp) {
        pv.anchors.solveGrasp(target);
        if (carry && pv.anchors.world('anchor_grasp', this.anchorPoint)) fv.group.position.copy(this.anchorPoint);
      } else {
        if (carry) fv.group.position.copy(target);
        // No grasp chain: the nearest articulated limbs close on the food instead.
        pv.anchors.solveAttack(carry ? fv.group.position : target, 1, 2);
      }
      if (carry) {
        // Feeding IK can move the mouth itself (Ottoia's introvert). Read the
        // final solved socket before swallowing so prey follows its current pose.
        pv.anchors.world('anchor_mouth', this.mouthPoint);
        this.insidePoint.copy(this.mouthPoint); pv.anchors.world('anchor_mouth_inside', this.insidePoint);
        fv.group.position.lerp(this.insidePoint, phase.swallow);
        // A consumed corpse closes down to the aperture, then disappears inside it.
        const aperture = Math.min(1, pv.visibleLength * .04 / Math.max(.001, fv.visibleLength));
        fv.group.scale.multiplyScalar(THREE.MathUtils.lerp(1, aperture, phase.carry) * (1 - phase.swallow));
        fv.group.updateWorldMatrix(true, true);
      }
    }
    for (const id of this.feeding.keys()) if (!active.has(id)) this.feeding.delete(id);
    return claimed;
  }

  /** Preserve the authored basket/cupping; only the real pickup offset needs IK. */
  private feedAuthored(state: FeedingState, pv: AttachView, fv: AttachView, food: Actor, progress: number) {
    const config = pv.authoredFeeding!, phase = feedingPhase(progress);
    const scale = pv.group.getWorldScale(new THREE.Vector3());
    const unit = Math.min(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
    const limit = config.pickupOffsetLimit * unit;
    const fits = food.eatBites <= 1 && fv.visibleLength <= pv.visibleLength * 1.5;
    if (!state.authoredContact) {
      pv.poseFeeding(.22);
      pv.anchors.world('anchor_grasp', this.anchorPoint);
      state.authoredContact = pv.group.worldToLocal(this.anchorPoint.clone());
    }
    // Large carcasses and unreachable food stay where they fell, with a reach
    // pose rather than an empty-handed carry into the mouth.
    pv.poseFeeding(fits && state.carryAllowed !== false ? progress : Math.min(progress, .22));
    pv.anchors.world('anchor_grasp', this.anchorPoint);
    const contact = pv.group.localToWorld(state.authoredContact.clone());
    if (phase.attached && state.carryAllowed === undefined) {
      state.carryAllowed = fits && contact.distanceTo(state.pickup) <= limit;
      state.correction = pv.group.worldToLocal(state.pickup.clone()).sub(state.authoredContact);
    }
    const offset = new THREE.Vector3();
    if (phase.attached && state.carryAllowed) {
      // Capture the correction in the predator's frame at pickup. It follows
      // rotation/translation thereafter and disappears by the oral carry phase.
      offset.copy(state.correction!).multiplyScalar(1 - phase.carry);
      offset.applyMatrix3(new THREE.Matrix3().setFromMatrix4(pv.group.matrixWorld));
    } else offset.copy(state.pickup).sub(this.anchorPoint).multiplyScalar(phase.pickup).clampLength(0, limit);
    this.target.copy(this.anchorPoint).add(offset);
    if (offset.lengthSq() > 1e-14) {
      const grasp = pv.anchors.sockets.get('anchor_grasp')!;
      // Preserve each arm's authored relative contact instead of collapsing
      // every tip onto one target. Skip the attack alias on the grasp's chain.
      for (const socket of pv.anchors.attackSockets) {
        if (socket.parent === grasp.parent) continue;
        socket.getWorldPosition(this.target).add(offset);
        pv.anchors.solveAnchor(socket.name, this.target, 1, 10);
      }
      this.target.copy(this.anchorPoint).add(offset);
      pv.anchors.solveGrasp(this.target, 1, 24);
    }
    if (!phase.attached || !state.carryAllowed) return;
    pv.anchors.world('anchor_grasp', this.anchorPoint);
    if (!state.contactError) {
      // A small permitted offset can still point beyond a nearly extended arm.
      // Confirm actual contact before carrying; never teleport food to failed IK.
      if (this.anchorPoint.distanceTo(this.target) > config.apertureDiameter * unit * .25) {
        state.carryAllowed = false;
        return;
      }
      // Keep food continuous at attachment even when bounded IK leaves a tiny
      // residual, then settle that contact offset during the first carry frames.
      state.contactError = pv.group.worldToLocal(state.pickup.clone()).sub(pv.group.worldToLocal(this.anchorPoint.clone()));
    }
    this.tmp.copy(state.contactError).multiplyScalar(1 - THREE.MathUtils.smoothstep(progress, .22, .32));
    this.tmp.applyMatrix3(new THREE.Matrix3().setFromMatrix4(pv.group.matrixWorld));
    fv.group.position.copy(this.anchorPoint).add(this.tmp);
    pv.anchors.world('anchor_mouth_inside', this.insidePoint);
    fv.group.position.lerp(this.insidePoint, phase.swallow);
    const aperture = Math.min(1, config.apertureDiameter * unit / Math.max(.001, fv.visibleLength));
    fv.group.scale.multiplyScalar(THREE.MathUtils.lerp(1, aperture, phase.carry) * (1 - phase.swallow));
    fv.group.updateWorldMatrix(true, true);
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
    // Riders. The far side of the same idea: here it is the *rider* that has the grip, so the rider
    // is shifted until its own grasp socket sits on the hold point instead of its middle being near
    // it. Without this a ride was the only hold in the game with nothing joining the two bodies —
    // the rider was simply drawn at a position beside the host and read as floating alongside.
    //
    // And the hold point is on the host's *animation*, not on its rigid frame. `rideHold` gives a
    // point at a fixed offset from the host's centre, which is where a rigid capsule's surface
    // would be; a swimming animal's flank sweeps and its tail beats right past it, so a rider
    // pinned there holds still while the thing it is gripping moves. Whatever part the grip landed
    // on, the rider rides that part: the bone nearest the hold point at the moment of contact is
    // remembered, and from then on the hold follows that bone's own world transform, rotation
    // included. That is the whole of what makes a grip read as a grip rather than as two bodies
    // that happen to be near each other.
    for (const rider of world.actors) {
      if (rider.rideHost < 0 || claimed.has(rider.id)) continue;
      const host = world.byId(rider.rideHost);
      if (!host || host.riddenBy !== rider.id) continue;
      const rv = views.get(rider.id); if (!rv) continue;
      const hv = views.get(host.id);
      const hold = rideHold(rider, host);
      let holdX = hold.x, holdY = hold.y, holdZ = hold.z;
      let swing: THREE.Quaternion | undefined;
      // Only once the simulation says the two bodies have actually met. Before that the rider is
      // still closing, and the bone nearest it then is not the one it ends up against.
      if (hv && rider.gripSyncT >= 0) {
        const grip = this.gripOn(rider.id, host.id, hv, hold);
        if (grip) {
          const bone = hv.anchors.bone(grip.bone);
          if (bone) {
            bone.updateWorldMatrix(true, false);
            // The hold point, carried by the bone: where it sat in the bone's own frame at contact,
            // read back out of the bone wherever the animation has since put it.
            this.bonePoint.copy(grip.local).applyMatrix4(bone.matrixWorld);
            holdX = this.bonePoint.x; holdY = this.bonePoint.y; holdZ = this.bonePoint.z;
            // And carried by the bone's *turning*, so a rider on a beating tail leans with it.
            bone.getWorldQuaternion(this.boneQuat);
            swing = this.swingQuat.copy(this.boneQuat).multiply(grip.rest);
          }
        }
      }
      // The rider leans with the part it is holding, about the hold point rather than about its own
      // middle — so the grip stays put and the body swings from it.
      if (swing) rv.group.quaternion.premultiply(swing);
      if (!rv.anchors.world('anchor_grasp', this.anchorPoint) && !rv.anchors.world('anchor_attack_primary', this.anchorPoint)) {
        this.anchorPoint.copy(rv.group.position);
      }
      this.target.set(holdX, holdY, holdZ).sub(this.anchorPoint);
      // A correction, not a placement: the simulation already has the body against the host, and
      // this closes the last of the gap. Bounded so a rig whose socket is somewhere unexpected
      // cannot fling the animal across the sea.
      const limit = lengthOf(rider) * 0.5;
      if (this.target.length() > limit) this.target.setLength(limit);
      rv.group.position.add(this.target);
    }
    // Forget grips whose ride has ended, so a later one on the same host re-picks its bone.
    for (const id of this.grips.keys()) {
      const r = world.byId(id);
      if (!r || r.rideHost < 0) this.grips.delete(id);
    }
  }

  /**
   * The bone this rider is holding, captured once at contact and kept for the life of the ride.
   *
   * Captured at *contact* rather than when the grip closed: the grip closes at arm's length and the
   * bodies then come together, and the bone nearest the rider at the start of that is not
   * necessarily the one it ends up against. `gripSyncT` is the simulation saying the two have met.
   */
  private gripOn(riderId: number, hostId: number, hv: AttachView, hold: { x: number; y: number; z: number }) {
    const had = this.grips.get(riderId);
    if (had && had.host === hostId) return had;
    this.bonePoint.set(hold.x, hold.y, hold.z);
    const bone = hv.anchors.nearestBone(this.bonePoint);
    if (!bone) return undefined;
    bone.updateWorldMatrix(true, false);
    // The hold point in the bone's own frame, and the bone's rest rotation, so what is applied
    // later is the bone's *change* since contact rather than its absolute orientation.
    const local = this.bonePoint.clone().applyMatrix4(this.boneInv.copy(bone.matrixWorld).invert());
    const rest = new THREE.Quaternion();
    bone.getWorldQuaternion(rest);
    rest.invert();
    const grip = { host: hostId, bone: bone.name, local, rest };
    this.grips.set(riderId, grip);
    return grip;
  }

  /** World point where an attacker's strike visibly lands on `victimPos`, or false if the rig has no attack sockets. */
  contactPoint(pv: AttachView | undefined, victimPos: { x: number; y: number; z: number }, out: THREE.Vector3): boolean {
    if (!pv) return false;
    this.tmp.set(victimPos.x, victimPos.y, victimPos.z);
    return pv.anchors.nearestAttack(this.tmp, out);
  }
}
