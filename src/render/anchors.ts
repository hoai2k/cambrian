import * as THREE from 'three';

export interface AnchorInfo { version: number; role: string; parentBone: string; chain?: string[]; effectorBone?: string; }
/** Read sockets from the cloned instance, never from the cached GLTF scene. */
export class CreatureAnchors {
  readonly sockets = new Map<string, THREE.Object3D>();
  private chain: THREE.Object3D[] = [];
  private effector?: THREE.Object3D;
  private p = new THREE.Vector3(); private e = new THREE.Vector3(); private t = new THREE.Vector3();
  private inv = new THREE.Matrix4(); private q = new THREE.Quaternion(); private identity = new THREE.Quaternion();
  constructor(private model: THREE.Object3D) {
    model.traverse(o => { if (o.userData.cambrianAnchor) this.sockets.set(o.name, o); });
    this.effector = this.sockets.get('anchor_grasp');
    const data = this.effector?.userData.cambrianAnchor as AnchorInfo | undefined;
    this.chain = (data?.chain ?? []).map(n => model.getObjectByName(n)).filter((b): b is THREE.Object3D => !!b);
  }
  world(name: string, out: THREE.Vector3): boolean {
    const socket = this.sockets.get(name); if (!socket) return false;
    socket.updateWorldMatrix(true, false); socket.getWorldPosition(out); return true;
  }
  /** Other articulated attack sockets use the same chain metadata as the proboscis. */
  solveAnchor(name: string, targetWorld: THREE.Vector3, weight = 1, iterations = 14): number {
    const socket = this.sockets.get(name); if (!socket) return Infinity;
    const data = socket.userData.cambrianAnchor as AnchorInfo;
    const previousEffector = this.effector, previousChain = this.chain;
    this.effector = socket;
    this.chain = (data.chain ?? []).map(n => this.model.getObjectByName(n)).filter((b): b is THREE.Object3D => !!b);
    try { return this.solveGrasp(targetWorld, weight, iterations); }
    finally { this.effector = previousEffector; this.chain = previousChain; }
  }

  /** Post-animation CCD in parent space. Handles rotated/scaled instances without root motion. */
  solveGrasp(targetWorld: THREE.Vector3, weight = 1, iterations = 14): number {
    if (!this.effector || !this.chain.length || weight <= 0 || !Number.isFinite(weight) || !targetWorld.toArray().every(Number.isFinite)) return Infinity;
    const strength = THREE.MathUtils.clamp(weight, 0, 1);
    this.model.updateWorldMatrix(true, true);
    for (let pass = 0; pass < Math.min(32, Math.max(1, iterations)); pass++) {
      for (let i = this.chain.length - 1; i >= 0; i--) {
        const bone = this.chain[i]; if (!bone.parent) continue;
        this.inv.copy(bone.parent.matrixWorld).invert();
        this.effector.getWorldPosition(this.e).applyMatrix4(this.inv).sub(bone.position);
        this.t.copy(targetWorld).applyMatrix4(this.inv).sub(bone.position);
        if (this.e.lengthSq() < 1e-12 || this.t.lengthSq() < 1e-12) continue;
        this.q.setFromUnitVectors(this.e.normalize(), this.t.normalize());
        const angle = this.identity.angleTo(this.q);
        this.q.slerp(this.identity, 1 - strength * Math.min(1, .22 / Math.max(angle, 1e-9)));
        bone.quaternion.premultiply(this.q).normalize();
        bone.updateWorldMatrix(false, true);
      }
      this.effector.getWorldPosition(this.p); if (this.p.distanceToSquared(targetWorld) < 1e-8) break;
    }
    return this.effector.getWorldPosition(this.p).distanceTo(targetWorld);
  }
}

export function feedingPhase(progress: number) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const smooth = (a: number, b: number) => THREE.MathUtils.smoothstep(p, a, b);
  return { pickup: smooth(0, .22), carry: smooth(.22, .78), swallow: smooth(.78, 1), attached: p >= .22 };
}
