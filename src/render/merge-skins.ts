import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapse a rig's skinned parts into one draw call per material.
 *
 * The Devonian bodies are authored part by part — every pleopod fringe, oral fold and seta is its
 * own node — so a single Nahecaris arrives as 415 skinned meshes against 415 draw calls, where a
 * Cambrian body is five. With fifty-odd animals on screen that is the difference between 150 draw
 * calls and five thousand, and draw calls are what the frame is actually spending its time on.
 *
 * Nothing about the model changes: every part is skinned to the same skeleton, sits at identity
 * under it, and no clip animates a mesh node (only bones), so the parts that share a material can
 * be merged into one geometry and drawn together. The merge is skipped for anything that would
 * make it lossy — an animated node, a morph target, a multi-material mesh, a non-identity
 * transform, or attributes that do not line up — so a rig that does not fit is simply left alone.
 *
 * Runs once per GLB, on the cached scene, before any instance is cloned from it.
 */
export function mergeSkinnedParts(root: THREE.Object3D, clips: THREE.AnimationClip[]): void {
  const animated = new Set<string>();
  for (const clip of clips) for (const track of clip.tracks) animated.add(track.name.split('.')[0]);

  // Every part that sits at identity under the root draws in the same space, so they can be
  // merged regardless of where in the graph they hang: a multi-primitive node arrives as a Group
  // of meshes, and grouping by parent would leave those unmerged.
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const candidates: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh) || !o.parent) return;
    if (animated.has(o.name) || Array.isArray(o.material)) return;
    if (Object.keys(o.geometry.morphAttributes).length) return;
    if (!isIdentity(rel.multiplyMatrices(inv, o.matrixWorld))) return;
    candidates.push(o);
  });

  const groups = new Map<string, THREE.SkinnedMesh[]>();
  for (const m of candidates) {
    const key = `${(m.material as THREE.Material).uuid}|${m.skeleton.uuid}|${m.bindMode}|${signature(m.geometry)}`;
    const list = groups.get(key);
    if (list) list.push(m); else groups.set(key, [m]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const first = group[0];
    if (!group.every((m) => m.bindMatrix.equals(first.bindMatrix))) continue;
    const merged = mergeGeometries(group.map((m) => m.geometry), false);
    if (!merged) continue;
    const mesh = new THREE.SkinnedMesh(merged, first.material);
    mesh.name = first.name;
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
    mesh.frustumCulled = first.frustumCulled;
    mesh.bindMode = first.bindMode;
    mesh.bind(first.skeleton, first.bindMatrix);
    for (const m of group) {
      // Sockets and bones hung off a part keep their place: the parts sit at identity, so
      // moving a child up to the root leaves it exactly where it was.
      for (const child of [...m.children]) if (!(child instanceof THREE.SkinnedMesh)) m.parent!.add(child);
      m.removeFromParent();
      m.geometry.dispose();
    }
    root.add(mesh);
  }
}

function isIdentity(m: THREE.Matrix4): boolean {
  const e = m.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(e[i] - (i % 5 === 0 ? 1 : 0)) > 1e-6) return false;
  return true;
}

/** Two geometries can only be merged if their attributes line up exactly. */
function signature(g: THREE.BufferGeometry): string {
  const parts = Object.keys(g.attributes).sort().map((name) => {
    const a = g.attributes[name] as THREE.BufferAttribute;
    return `${name}:${a.itemSize}:${a.array.constructor.name}:${a.normalized ? 1 : 0}`;
  });
  return `${g.index ? 'i' : 'n'}|${parts.join(',')}`;
}
