import * as THREE from 'three';

/**
 * A swimming animal holds its head still.
 *
 * The head is the one part of a swimmer that does not want to move: the eyes have to hold a line on
 * what is being chased, and the neck is what absorbs the body's beat so they can. A clip whose skull
 * yaws hardest of anything on the animal, and at a different rhythm from the tail, reads as a *land*
 * gait — the side-to-side head swing of something walking — or as a body being pushed from the front
 * rather than driven from the back. Nothosaurus shipped exactly that: at the stroke rate its jaw and
 * skull swung ±0.05 units while the neck's contribution fell away toward the shoulders, the mirror
 * image of the envelope a swimmer wants.
 *
 * This damps that out after the mixer has written the pose. The neck chain is counter-rotated about
 * the body's up axis so the head keeps the heading the shoulders have, and the correction is shared
 * out along the chain — most at the base, least at the skull — so the neck absorbs the beat the way
 * a real one does instead of the head snapping to centre on a stiff neck.
 *
 * Presentation only, and asked for by name (`steadyHead` on the creature) rather than applied to
 * everything with a neck: a Tanystropheus' whole point is a neck that swings, and an eel's head is
 * *supposed* to lead the wave.
 *
 * The clip itself is still what should be fixed — this is the same defect the builder should stop
 * authoring — so `docs/triassic/IMAGE-MODEL-HANDOFF.md` carries the measurement for whoever next
 * opens `tools/triassic/creatures/nothosaurus/build.py`.
 */

/** Bones a neck chain is made of, nearest the body first. The skull rides on the end of it. */
const NECK = /^(neck|head|skull|jaw)/i;
const IDENTITY = new THREE.Quaternion();

export class SteadyHead {
  private chain: THREE.Bone[] = [];
  private q = new THREE.Quaternion();
  private pw = new THREE.Quaternion();
  private axis = new THREE.Vector3();
  private twist = new THREE.Quaternion();

  constructor(model: THREE.Object3D) {
    const found: THREE.Bone[] = [];
    model.traverse((o) => { if ((o as THREE.Bone).isBone && NECK.test(o.name)) found.push(o as THREE.Bone); });
    // Base first: a bone whose parent is also in the set comes after it.
    const depth = (b: THREE.Object3D) => { let d = 0; for (let p = b.parent; p; p = p.parent) d++; return d; };
    this.chain = found.sort((a, b) => depth(a) - depth(b));
  }

  get active() { return this.chain.length >= 2; }

  /**
   * Take `amount` of the neck's yaw out of the pose, shared along the chain. `amount` is a fraction:
   * 1 holds the head as straight as the chain can, 0 leaves the clip alone.
   */
  apply(amount = 0.8) {
    if (!this.active || amount <= 0) return;
    // Scaling each joint's own yaw barely moves the head: the neck's joints are small and the swing
    // that matters has already accumulated by the time it reaches them. So take the head's yaw as
    // one quantity — how far the skull has turned off the line the shoulders hold — and give the
    // chain the opposite of a fraction of it, shared out along the neck. The head then ends up with
    // (1 − amount) of the swing the clip gave it, and the neck is what bent to take the rest.
    const head = this.chain[this.chain.length - 1];
    const base = this.chain[0].parent ?? head;
    head.getWorldQuaternion(this.q);
    base.getWorldQuaternion(this.pw);
    // The head's turn relative to the shoulders, about world up.
    this.pw.invert();
    this.q.premultiply(this.pw);
    // World up carried into the shoulders' frame. A bone's own axes are along the bone, so reading
    // the relative rotation's `y` directly measures nothing: on this rig the neck's side-to-side
    // bend lands almost entirely in `z`, and a yaw read off `y` came out as zero every frame.
    this.axis.set(0, 1, 0).applyQuaternion(this.pw).normalize();
    const d = this.q.x * this.axis.x + this.q.y * this.axis.y + this.q.z * this.axis.z;
    const yaw = 2 * Math.atan2(d, this.q.w);
    if (!Number.isFinite(yaw) || Math.abs(yaw) < 1e-4) return;
    const n = this.chain.length;
    // Weighted toward the base: that is where a neck absorbs a beat, and a correction taken at the
    // last joint alone reads as the head snapping rather than the neck giving.
    let total = 0;
    for (let i = 0; i < n; i++) total += n - i;
    for (let i = 0; i < n; i++) {
      const b = this.chain[i];
      const part = -yaw * amount * ((n - i) / total);
      b.parent?.getWorldQuaternion(this.pw);
      this.axis.set(0, 1, 0).applyQuaternion(this.pw.invert());
      if (this.axis.lengthSq() < 1e-8) continue;
      this.twist.setFromAxisAngle(this.axis.normalize(), part);
      // The axis is in the parent's frame, so the turn goes on *before* the bone's own rotation.
      // Post-multiplying would spin it about the bone's own axis, which is along the neck.
      b.quaternion.premultiply(this.twist);
    }
  }
}
