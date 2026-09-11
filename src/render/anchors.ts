import * as THREE from 'three';

export interface AnchorInfo { version: number; role: string; parentBone: string; chain?: string[]; effectorBone?: string; contactType?: string; approximate?: boolean; }
interface Articulated { socket: THREE.Object3D; chain: THREE.Object3D[]; }

/** Read sockets from the cloned instance, never from the cached GLTF scene. */
export class CreatureAnchors {
  readonly sockets = new Map<string, THREE.Object3D>();
  /** Every `role: attack` socket, articulated or not: the points a strike can visually land from. */
  readonly attackSockets: THREE.Object3D[] = [];
  /** Attack sockets that carry an IK chain (claws, jaws, raptorial limbs, tentacles, paddles). */
  private articulated: Articulated[] = [];
  private chain: THREE.Object3D[] = [];
  private effector?: THREE.Object3D;
  private p = new THREE.Vector3(); private e = new THREE.Vector3(); private t = new THREE.Vector3();
  private inv = new THREE.Matrix4(); private q = new THREE.Quaternion(); private identity = new THREE.Quaternion();
  private ranked: { a: Articulated; d: number }[] = [];
  constructor(private model: THREE.Object3D) {
    model.traverse(o => { if (o.userData.cambrianAnchor) this.sockets.set(o.name, o); });
    for (const socket of this.sockets.values()) {
      const data = socket.userData.cambrianAnchor as AnchorInfo;
      if (data.role !== 'attack') continue;
      this.attackSockets.push(socket);
      const chain = this.resolveChain(data);
      // The required primary contact may alias a named left/right tip. Keep both
      // public sockets, but spend the two-contact IK budget on distinct tips.
      const alias = this.articulated.some(a => a.socket.parent === socket.parent &&
        a.socket.position.distanceToSquared(socket.position) < 1e-12 &&
        a.chain.length === chain.length && a.chain.every((bone, i) => bone === chain[i]));
      if (chain.length && !alias) this.articulated.push({ socket, chain });
    }
    this.effector = this.sockets.get('anchor_grasp');
    this.chain = this.resolveChain(this.effector?.userData.cambrianAnchor as AnchorInfo | undefined);
  }
  private resolveChain(data?: AnchorInfo) {
    return (data?.chain ?? []).map(n => this.model.getObjectByName(n)).filter((b): b is THREE.Object3D => !!b);
  }
  has(name: string) { return this.sockets.has(name); }
  /**
   * The rig's bones, for anything that has to follow a *part* of an animal rather than the animal.
   *
   * A grip is the case that needs it. A rider pinned to an offset from the host's rigid centre sits
   * where the host's body would be if the host were a rigid capsule, and a swimming animal is not:
   * its flank sweeps, its tail beats, its body flexes, and the rider holds still through all of it.
   * That reads as floating alongside, which is exactly what a player who has taken hold of a giant
   * reports as the grip not working. Following the nearest bone instead means the hold point is on
   * the animation, so the rider goes where the part it is holding goes.
   */
  get bones(): THREE.Object3D[] {
    if (!this.boneList) {
      this.boneList = [];
      this.model.traverse((o) => { if ((o as THREE.Bone).isBone) this.boneList!.push(o); });
    }
    return this.boneList;
  }
  private boneList?: THREE.Object3D[];
  bone(name: string): THREE.Object3D | undefined {
    return this.bones.find((b) => b.name === name);
  }
  /** The bone whose own origin is nearest `target` in world space. */
  nearestBone(target: THREE.Vector3): THREE.Object3D | undefined {
    let best: THREE.Object3D | undefined, bd = Infinity;
    for (const b of this.bones) {
      b.updateWorldMatrix(true, false); b.getWorldPosition(this.p);
      const d = this.p.distanceToSquared(target);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  /** A grasp chain exists: this rig can pick food up and carry it to the mouth. */
  get canGrasp() { return !!this.effector && this.chain.length > 0; }
  /** At least one attack socket can be steered toward a target. */
  get canAim() { return this.articulated.length > 0; }
  world(name: string, out: THREE.Vector3): boolean {
    const socket = this.sockets.get(name); if (!socket) return false;
    socket.updateWorldMatrix(true, false); socket.getWorldPosition(out); return true;
  }
  /** World position of the attack contact closest to `target`, for placing impact effects. Falls back to `anchor_attack_primary`. */
  nearestAttack(target: THREE.Vector3, out: THREE.Vector3): boolean {
    let best = Infinity;
    for (const socket of this.attackSockets) {
      socket.updateWorldMatrix(true, false); socket.getWorldPosition(this.p);
      const d = this.p.distanceToSquared(target);
      if (d < best) { best = d; out.copy(this.p); }
    }
    return best < Infinity;
  }
  /** Other articulated attack sockets use the same chain metadata as the proboscis. */
  solveAnchor(name: string, targetWorld: THREE.Vector3, weight = 1, iterations = 14): number {
    const socket = this.sockets.get(name); if (!socket) return Infinity;
    const data = socket.userData.cambrianAnchor as AnchorInfo;
    return this.solveChain(socket, this.resolveChain(data), targetWorld, weight, iterations);
  }
  /**
   * Steer the `count` articulated attack sockets currently nearest to `target` toward it, so a strike
   * visibly lands on the victim rather than on the authored clip's empty air. Solving only the nearest
   * few keeps a many-limbed rig (Canadia's parapodia, Waptia's raptorial limbs) from twisting whole-body.
   * Returns the smallest remaining error, or Infinity when the rig has nothing to steer.
   */
  solveAttack(targetWorld: THREE.Vector3, weight = 1, count = 2, iterations = 8): number {
    if (!this.articulated.length || weight <= 0) return Infinity;
    this.model.updateWorldMatrix(true, true);
    this.ranked.length = 0;
    for (const a of this.articulated) { a.socket.getWorldPosition(this.p); this.ranked.push({ a, d: this.p.distanceToSquared(targetWorld) }); }
    this.ranked.sort((x, y) => x.d - y.d);
    let best = Infinity;
    for (let i = 0; i < Math.min(count, this.ranked.length); i++) {
      const { a } = this.ranked[i];
      best = Math.min(best, this.solveChain(a.socket, a.chain, targetWorld, weight, iterations));
    }
    return best;
  }

  /** Post-animation CCD in parent space. Handles rotated/scaled instances without root motion. */
  solveGrasp(targetWorld: THREE.Vector3, weight = 1, iterations = 14): number {
    if (!this.effector) return Infinity;
    return this.solveChain(this.effector, this.chain, targetWorld, weight, iterations);
  }
  private solveChain(effector: THREE.Object3D, chain: THREE.Object3D[], targetWorld: THREE.Vector3, weight: number, iterations: number): number {
    if (!chain.length || weight <= 0 || !Number.isFinite(weight) || !targetWorld.toArray().every(Number.isFinite)) return Infinity;
    const strength = THREE.MathUtils.clamp(weight, 0, 1);
    this.model.updateWorldMatrix(true, true);
    for (let pass = 0; pass < Math.min(32, Math.max(1, iterations)); pass++) {
      for (let i = chain.length - 1; i >= 0; i--) {
        const bone = chain[i]; if (!bone.parent) continue;
        this.inv.copy(bone.parent.matrixWorld).invert();
        effector.getWorldPosition(this.e).applyMatrix4(this.inv).sub(bone.position);
        this.t.copy(targetWorld).applyMatrix4(this.inv).sub(bone.position);
        if (this.e.lengthSq() < 1e-12 || this.t.lengthSq() < 1e-12) continue;
        this.q.setFromUnitVectors(this.e.normalize(), this.t.normalize());
        const angle = this.identity.angleTo(this.q);
        this.q.slerp(this.identity, 1 - strength * Math.min(1, .22 / Math.max(angle, 1e-9)));
        bone.quaternion.premultiply(this.q).normalize();
        bone.updateWorldMatrix(false, true);
      }
      effector.getWorldPosition(this.p); if (this.p.distanceToSquared(targetWorld) < 1e-8) break;
    }
    return effector.getWorldPosition(this.p).distanceTo(targetWorld);
  }
}

export function feedingPhase(progress: number) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const smooth = (a: number, b: number) => THREE.MathUtils.smoothstep(p, a, b);
  return { pickup: smooth(0, .22), carry: smooth(.22, .78), swallow: smooth(.78, 1), attached: p >= .22 };
}
