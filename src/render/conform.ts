import * as THREE from 'three';

/**
 * Arms that lie along whatever they are on.
 *
 * A brittle star is not a body that swims over the ground, it is five arms in contact with it: they
 * drape over a boulder, dip into the hollow behind it and curl round anything they take hold of. The
 * authored clips move the arms through their own gait; this bends the result to the surface
 * underneath, after the mixer has run, so the animation still reads and the shape still fits.
 *
 * One pass of CCD per segment, base to tip, damped and rate limited: each joint is nudged toward
 * where the surface says the next joint should be, never snapped to it, so an arm flows onto a rock
 * over a few frames and flows off it again. Rigs are radial chains named `arm_<i>_<nn>`; a creature
 * asks for this with `conformArms`, because a nautiloid's tentacles carry the same names and very
 * much should not be laid out on the seabed.
 */

/**
 * How fast an arm finds the surface, per second, measured at the tip. Every joint in the chain
 * pulls the same way and their corrections add up, so each one takes its share of this rather than
 * all of it: what looks gentle at a single joint is a snap by the time thirty of them have done it.
 */
const GAIN_RATE = 9;
/** The most the tip may swing, radians per second, shared out the same way. Not a whip. */
const MAX_RATE = 4;
/** Curling round something it has grabbed happens faster than settling onto the floor. */
const HOLD_ON = 3;
/** Joints nearest the disc stay where the clip put them, so the animal keeps its own posture. */
const ROOTED = 2;

export interface Surface {
  /** Height of the ground — terrain and rock — under a world point. */
  groundAt(x: number, z: number): number;
  /** How far above it the arm should lie. */
  clearance: number;
  /** When the animal is holding onto something: wrap the arms round this instead of the floor. */
  host?: { x: number; y: number; z: number; radius: number };
}

export class ArmConform {
  private arms: THREE.Object3D[][] = [];
  private p = new THREE.Vector3(); private next = new THREE.Vector3(); private target = new THREE.Vector3();
  private from = new THREE.Vector3(); private to = new THREE.Vector3();
  private inv = new THREE.Matrix4(); private q = new THREE.Quaternion(); private identity = new THREE.Quaternion();

  constructor(model: THREE.Object3D) {
    const byArm = new Map<string, { index: number; bone: THREE.Object3D }[]>();
    model.traverse((o) => {
      const m = /^arm_(\d+)_(\d+)$/.exec(o.name);
      if (!m) return;
      const list = byArm.get(m[1]) ?? [];
      list.push({ index: Number(m[2]), bone: o });
      byArm.set(m[1], list);
    });
    for (const list of byArm.values()) {
      list.sort((a, b) => a.index - b.index);
      if (list.length > ROOTED + 2) this.arms.push(list.map((x) => x.bone));
    }
  }

  /** This rig has arms to lay down. */
  get active() { return this.arms.length > 0; }

  /**
   * Bend every arm toward the surface under it. `weight` fades the whole effect in and out — off
   * the floor and away from a host there is nothing to lie on, and the clips should be left alone.
   * Rate is per second, so the arms flow at the same speed whatever the frame rate is doing.
   */
  apply(model: THREE.Object3D, s: Surface, weight = 1, dt = 1 / 60): void {
    if (!this.arms.length || weight <= 0.01) return;
    model.updateWorldMatrix(true, true);
    const w = Math.min(1, weight);
    // Taking hold of something is an act; lying down on the seabed is a drift. The wrap is worth
    // being quicker, and it has further to travel — an arm has to curl right round a body.
    const urgency = s.host ? HOLD_ON : 1;
    const gainAll = (1 - Math.exp(-GAIN_RATE * urgency * Math.max(dt, 1e-4))) * w;
    const stepAll = MAX_RATE * urgency * Math.max(dt, 1e-4) * w;
    for (const arm of this.arms) {
      const share = 1 / Math.max(1, arm.length - ROOTED - 1);
      const gain = gainAll * share, step = stepAll * share;
      for (let i = ROOTED; i < arm.length - 1; i++) {
        const bone = arm[i], child = arm[i + 1];
        if (!bone.parent) continue;
        bone.getWorldPosition(this.p);
        child.getWorldPosition(this.next);
        // Where this joint's tip belongs: on the host's surface if it is holding one, else the
        // height of the ground under it, so an arm follows a boulder up and the hollow back down.
        if (s.host) {
          // Straight out from the host's middle to its surface: the arm lies on the body it holds.
          this.target.set(this.next.x - s.host.x, this.next.y - s.host.y, this.next.z - s.host.z);
          const d = this.target.length();
          if (d < 1e-6) continue;
          this.target.multiplyScalar(s.host.radius / d).add(this.to.set(s.host.x, s.host.y, s.host.z));
        } else {
          this.target.set(this.next.x, s.groundAt(this.next.x, this.next.z) + s.clearance, this.next.z);
        }
        this.inv.copy(bone.parent.matrixWorld).invert();
        this.from.copy(this.next).applyMatrix4(this.inv).sub(bone.position);
        this.to.copy(this.target).applyMatrix4(this.inv).sub(bone.position);
        if (this.from.lengthSq() < 1e-12 || this.to.lengthSq() < 1e-12) continue;
        this.q.setFromUnitVectors(this.from.normalize(), this.to.normalize());
        // Damped, and never more than a segment's worth in one frame.
        const angle = this.identity.angleTo(this.q);
        if (angle < 1e-6) continue;
        this.q.slerp(this.identity, 1 - Math.min(gain, step / angle));
        bone.quaternion.premultiply(this.q).normalize();
        // Only this joint and the next need a fresh world matrix: the loop walks base to tip and
        // reads no further than one segment ahead, and the renderer rebuilds the rest from the
        // local rotations before it draws. Refreshing the whole subtree here made the pass
        // quadratic in the length of the arm, which on a thirty-six-joint chain is most of it.
        bone.updateMatrix();
        bone.matrixWorld.multiplyMatrices(bone.parent.matrixWorld, bone.matrix);
        child.updateMatrix();
        child.matrixWorld.multiplyMatrices(bone.matrixWorld, child.matrix);
      }
    }
  }
}
