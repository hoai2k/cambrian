/** Exercises the same Three.js loader, mixer, skinning and socket API as the game. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { auditAnchors, auditClips } from '../asset-audit';
import { DEVONIAN_SPECIMENS } from '../../src/content/devonian';

export async function auditDevonian(ids?: string[], category: 'creature' | 'prop' = 'creature') {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const results = [];
  for (const specimen of DEVONIAN_SPECIMENS.filter(s => s.category === category && (!ids || ids.includes(s.id)))) {
    const models = [];
    for (const [level, url] of [specimen.model, specimen.lod].entries()) {
      const gltf = await loader.loadAsync('/' + url);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const loaded = { gltf, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), unit: 1 };
      if (!loaded.size.toArray().every(Number.isFinite) || loaded.size.length() <= 0) throw Error(`${specimen.id}: invalid geometry bounds`);
      const clips = category === 'creature' || gltf.animations.length ? auditClips(specimen.id, loaded, level === 1, specimen.looping) : { clips: [] };
      const anchors = category === 'creature' ? auditAnchors(specimen.id, loaded) : undefined;
      models.push({ level, ...clips, anchors });
      const textures = new Set<THREE.Texture>();
      gltf.scene.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
          m.dispose();
        }
      });
      textures.forEach(t => t.dispose());
    }
    if (models[0].anchors?.metadata !== models[1].anchors?.metadata) throw Error(`${specimen.id}: full/LOD anchors differ`);
    results.push({ id: specimen.id, models });
  }
  return results;
}
