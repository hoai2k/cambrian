import * as THREE from 'three';

/**
 * Eating a body, seen rather than inferred.
 *
 * The simulation takes a carcass apart in whole bites — a body a third of your length goes down
 * in one, a giant takes twelve — and this is the other half of it: the meat that leaves the
 * carcass has to leave the *model*. The eaten share is cut away with a clipping plane that sweeps
 * down the body's long axis, so a half-eaten body is half a body rather than a small whole one,
 * and the slice that just came off is baked out of the current skinned pose into a loose chunk
 * (`sliceChunk`) for the caller to fly into the eater's mouth.
 *
 * A clipping plane rather than geometry surgery for one blunt reason: every creature of a species
 * shares its geometry with every other, so cutting the buffers would carve the same hole in every
 * living one. The plane rides on this corpse's own cloned materials and touches nothing else.
 *
 * Everything here is lazy: nothing is measured or assigned until something takes a bite.
 */
export class Carcass {
  private plane = new THREE.Plane();
  private axis: 0 | 1 | 2 = 0;
  private min = 0; private max = 0;
  private measured = false;
  private applied = -1;
  /** Eating runs from whichever end the first mouth was at. */
  private fromMax = true;
  private cut = 0;
  private n = new THREE.Vector3(); private p = new THREE.Vector3();
  private normalMatrix = new THREE.Matrix3();

  constructor(private model: THREE.Object3D, private materials: THREE.Material[]) {}

  /** True once the body has had a bite taken out of it. */
  get active() { return this.applied > 0; }

  private measure(): boolean {
    if (this.measured) return this.max > this.min;
    this.measured = true;
    const box = new THREE.Box3();
    this.model.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.depthPrepass) return;
      o.geometry.computeBoundingBox();
      if (o.geometry.boundingBox) box.union(o.geometry.boundingBox);
    });
    if (box.isEmpty()) return false;
    const size = new THREE.Vector3(); box.getSize(size);
    this.axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
    this.min = box.min.getComponent(this.axis); this.max = box.max.getComponent(this.axis);
    return this.max > this.min;
  }

  /** Which end goes first — decided by where the eater's mouth was for the opening bite. */
  faceEater(worldPoint: THREE.Vector3) {
    if (this.applied > 0 || !this.measure()) return;
    this.p.copy(worldPoint);
    this.model.worldToLocal(this.p);
    this.fromMax = this.p.getComponent(this.axis) >= (this.min + this.max) / 2;
  }

  /** Model-space plane position for a consumed fraction. */
  private threshold(fraction: number) {
    return this.fromMax ? this.max - (this.max - this.min) * fraction : this.min + (this.max - this.min) * fraction;
  }

  /** Cut the eaten share away. Cheap to call every frame; only a change reassigns anything. */
  setEaten(fraction: number) {
    const f = THREE.MathUtils.clamp(fraction, 0, 1);
    if (Math.abs(f - this.applied) < 1e-4 || !this.measure()) return;
    const first = this.applied <= 0;
    this.applied = f;
    this.cut = this.threshold(f);
    if (first) for (const m of this.materials) { m.clippingPlanes = [this.plane]; m.clipShadows = true; m.needsUpdate = true; }
    this.sync();
  }

  /** Follow the body: the plane is in world space, and a corpse drifts and rolls. */
  sync() {
    if (this.applied <= 0) return;
    this.model.updateWorldMatrix(true, false);
    this.n.set(0, 0, 0).setComponent(this.axis, this.fromMax ? -1 : 1);
    this.n.applyMatrix3(this.normalMatrix.getNormalMatrix(this.model.matrixWorld)).normalize();
    this.p.set(0, 0, 0).setComponent(this.axis, this.cut).applyMatrix4(this.model.matrixWorld);
    this.plane.setFromNormalAndCoplanarPoint(this.n, this.p);
  }

  /**
   * The slice between two consumed fractions, baked out of the current skinned pose into a loose
   * world-space chunk. The caller owns it: add it to the scene, animate it, dispose it.
   */
  sliceChunk(from: number, to: number): THREE.Mesh | undefined {
    if (!this.measure()) return undefined;
    const a = this.threshold(from), b = this.threshold(to);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    // The mesh with the most of this slice in it: one mouthful, not a shower of shards.
    let best: THREE.Mesh | undefined, bestTris: number[] = [];
    this.model.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.depthPrepass || !o.geometry.index) return;
      const index = o.geometry.index, pos = o.geometry.getAttribute('position');
      const tris: number[] = [];
      for (let t = 0; t < index.count / 3; t++) {
        const i0 = index.getX(t * 3), i1 = index.getX(t * 3 + 1), i2 = index.getX(t * 3 + 2);
        const k = (pos.getComponent(i0, this.axis) + pos.getComponent(i1, this.axis) + pos.getComponent(i2, this.axis)) / 3;
        if (k >= lo && k <= hi) tris.push(t);
      }
      if (tris.length > bestTris.length) { best = o; bestTris = tris; }
    });
    if (!best || bestTris.length < 2) return undefined;
    // A contiguous run of the slice, not every Nth triangle: index order out of the exporter is
    // spatially coherent, so a run is a solid piece of flesh where a stride is confetti.
    const take = Math.min(bestTris.length, 700);
    const first = Math.max(0, Math.floor((bestTris.length - take) / 2));
    const index = best.geometry.index!, pos = best.geometry.getAttribute('position');
    const col = best.geometry.getAttribute('color');
    const skinned = best as THREE.SkinnedMesh;
    const isSkinned = !!skinned.isSkinnedMesh;
    const v = new THREE.Vector3(); const verts: number[] = []; const colors: number[] = [];
    best.updateWorldMatrix(true, false);
    for (let i = first; i < first + take; i++) {
      const t = bestTris[i];
      for (let k = 0; k < 3; k++) {
        const vi = index.getX(t * 3 + k);
        v.fromBufferAttribute(pos, vi);
        if (isSkinned) skinned.applyBoneTransform(vi, v);
        v.applyMatrix4(best.matrixWorld);
        verts.push(v.x, v.y, v.z);
        if (col) colors.push(col.getX(vi), col.getY(vi), col.getZ(vi));
      }
    }
    if (verts.length < 9) return undefined;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    if (colors.length === verts.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const source = Array.isArray(best.material) ? best.material[0] : best.material;
    const tint = (source as THREE.MeshStandardMaterial).color;
    const mat = new THREE.MeshStandardMaterial({
      color: tint ? tint.clone() : new THREE.Color('#c98b7a'),
      vertexColors: colors.length === verts.length,
      roughness: 0.8, metalness: 0, side: THREE.DoubleSide,
      emissive: new THREE.Color('#5a1418'), emissiveIntensity: 0.4,
    });
    const chunk = new THREE.Mesh(geo, mat);
    chunk.frustumCulled = false;
    // The baked vertices are already in world space: re-centre the geometry on the slice's middle
    // so the chunk has a position to be carried from.
    const centre = geo.boundingSphere?.center.clone() ?? new THREE.Vector3();
    geo.translate(-centre.x, -centre.y, -centre.z);
    chunk.position.copy(centre);
    return chunk;
  }

  /** Whole again: a view is reused when its player respawns. */
  reset() {
    if (this.applied <= 0) { this.applied = -1; return; }
    this.applied = -1;
    for (const m of this.materials) { m.clippingPlanes = null; m.needsUpdate = true; }
  }
}

interface Flying {
  mesh: THREE.Mesh; from: THREE.Vector3; t: number; dur: number;
  spin: THREE.Vector3; target: () => THREE.Vector3 | undefined;
}

/** Torn-off mouthfuls on their way into a mouth. */
export class Mouthfuls {
  readonly group = new THREE.Group();
  private live: Flying[] = [];
  private to = new THREE.Vector3();
  constructor() { this.group.name = 'mouthfuls'; }

  /** `target` is read every frame, so a mouthful follows a mouth that is still moving. */
  add(chunk: THREE.Mesh, target: () => THREE.Vector3 | undefined) {
    this.group.add(chunk);
    this.live.push({
      mesh: chunk, from: chunk.position.clone(), t: 0, dur: 0.5,
      spin: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
      target,
    });
    // A few of them at once is a feast; a hundred is a leak.
    while (this.live.length > 24) this.retire(0);
  }

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const f = this.live[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const to = f.target();
      if (to) {
        this.to.copy(to);
        const ease = k * k * (3 - 2 * k);
        f.mesh.position.lerpVectors(f.from, this.to, ease);
        f.mesh.position.y += Math.sin(Math.PI * k) * f.from.distanceTo(this.to) * 0.12;
      }
      f.mesh.rotation.x += f.spin.x * dt; f.mesh.rotation.y += f.spin.y * dt; f.mesh.rotation.z += f.spin.z * dt;
      f.mesh.scale.setScalar(Math.max(0.001, 1 - k * k));
      if (k >= 1) this.retire(i);
    }
  }

  private retire(i: number) {
    const f = this.live[i];
    this.group.remove(f.mesh);
    f.mesh.geometry.dispose();
    (f.mesh.material as THREE.Material).dispose();
    this.live.splice(i, 1);
  }

  dispose() { while (this.live.length) this.retire(0); }
}
