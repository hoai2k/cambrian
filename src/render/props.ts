import { ACTIVE_ERA } from '../content';
import { assetPaths } from '../content/asset-paths';
import type { InstancedScenery } from '../content/era';
import { BufferGeometry, Float32BufferAttribute, Mesh, SkinnedMesh, Material, Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { appBase } from '../shared/base';

/**
 * A file in the active era's props folder, without the extension. This is era data now, not a
 * closed set: the Cambrian names seven sponges, the Devonian names its instanced scenery exports.
 * `loadPropGeometry` is what validates one, and a prop that fails to load leaves the caller on
 * its procedural fallback.
 */
export type PropId = string;

/** Caller owns the returned geometry; source materials, textures and rig helpers are released. */
export async function loadPropGeometry(id: PropId, base = appBase(), scenery: InstancedScenery | undefined = ACTIVE_ERA.assets.instancedScenery): Promise<BufferGeometry> {
  const override = scenery?.props[id];
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${base}${override?.path ?? assetPaths.prop(id)}`);
  const meshes: Mesh[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o instanceof Mesh) meshes.push(o); });
  const parts: BufferGeometry[] = [];
  try {
    if (!meshes.length || meshes.some(m => !m.geometry.hasAttribute('color'))) throw new Error(`Missing vertex pigment on instanced prop: ${id}`);
    // Preserve the original Cambrian geometry convention byte-for-byte, including its pivot.
    if (!override) {
      if (meshes.length !== 1) throw new Error(`Invalid legacy instanced prop: ${id}`);
      return meshes[0].geometry.clone();
    }
    for (const mesh of meshes) {
      if (mesh instanceof SkinnedMesh || Object.keys(mesh.geometry.morphAttributes).length) throw new Error(`Instanced prop must be baked static: ${id}`);
      const g = mesh.geometry.clone(); parts.push(g);
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
      // Normalize accessor representations before merging, retaining indexed geometry.
      for (const name of ['position', 'normal', 'color']) {
        const a = g.getAttribute(name); if (!a) continue;
        const values = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) { values[i * 3] = a.getX(i); values[i * 3 + 1] = a.getY(i); values[i * 3 + 2] = a.getZ(i); }
        g.setAttribute(name, new Float32BufferAttribute(values, 3));
      }
      if (!g.index) g.setIndex(Array.from({ length: g.getAttribute('position').count }, (_, i) => i));
      g.applyMatrix4(mesh.matrixWorld);
      if (!g.hasAttribute('normal')) g.computeVertexNormals();
      g.clearGroups();
    }
    const geometry = mergeGeometries(parts, false);
    if (!geometry) throw new Error(`Cannot merge instanced prop: ${id}`);
    geometry.name = id;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  } finally {
    parts.forEach(g => g.dispose());
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
    const skeletons = new Set<SkinnedMesh['skeleton']>();
    for (const scene of gltf.scenes) scene.traverse(o => {
      if (!(o instanceof Mesh)) return;
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
      if (o instanceof SkinnedMesh) skeletons.add(o.skeleton);
    });
    materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof Texture) textures.add(v); }); m.dispose(); });
    textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose()); skeletons.forEach(s => s.dispose());
  }
}
