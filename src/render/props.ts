import { BufferGeometry, Mesh, Material } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type PropId = 'cushion-sponge' | 'lettuce-tuft' | 'pebble-cluster' | 'blade-spire' | 'talus-shard' | 'spine-sponge' | 'glass-fan';

/** Caller owns the returned geometry; materials are supplied by the sea shader. */
export async function loadPropGeometry(id: PropId, base = import.meta.env.BASE_URL): Promise<BufferGeometry> {
  const gltf = await new GLTFLoader().loadAsync(`${base}assets/props/${id}.glb`);
  const meshes: Mesh[] = [];
  gltf.scene.traverse(o => { if (o instanceof Mesh) meshes.push(o); });
  const mesh = meshes[0];
  if (meshes.length !== 1 || !mesh.geometry.hasAttribute('color')) throw new Error(`Invalid instanced prop: ${id}`);
  const geometry = mesh.geometry;
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: Material) => m.dispose());
  return geometry;
}
