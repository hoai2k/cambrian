/** Browser-side audit using the same loader, skinning and mixer as the game. */
import * as THREE from 'three';
import { ensureLoaded } from '../src/render/creature';
import { EXPANSION_CREATURES } from '../src/sim/expansion';

export async function auditAssets() {
  const reports = [];
  for (const def of EXPANSION_CREATURES) {
    const loaded = await ensureLoaded(def.id), lod = await ensureLoaded(def.id, undefined, 1);
    const model = loaded.gltf.scene, animations = loaded.gltf.animations;
    const names = animations.map(c => c.name);
    const require = ['Idle', def.ground ? 'Crawl' : 'Swim', 'Attack', 'Hit', 'Death', 'TurnLeft', 'TurnRight', 'Dive', 'Rise', 'Bite', 'Heavy', 'Guard', 'Parry', 'Dodge', 'Eat', 'Stagger', 'Ability', 'Moult'];
    if (def.id === 'nectocaris') require.push('Grab');
    for (const name of require) if (!names.includes(name)) throw Error(`${def.id} missing ${name}`);
    if (new Set(names).size !== names.length) throw Error(`${def.id} duplicate clips`);
    const meshes: THREE.SkinnedMesh[] = []; model.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
    if (!meshes.length) throw Error(`${def.id} not skinned`);
    const tris = (scene: THREE.Object3D) => { let n=0;scene.traverse(o=>{if((o as THREE.Mesh).isMesh){const g=(o as THREE.Mesh).geometry;n+=(g.index?.count??g.attributes.position.count)/3;}});return n; };
    const fullTris=tris(model),lodTris=tris(lod.gltf.scene);
    if (!(lodTris < fullTris * .9 && lodTris > 100)) throw Error(`${def.id} LOD not simplified`);
    const mixer = new THREE.AnimationMixer(model), p = new THREE.Vector3();
    const extent = Math.max(loaded.size.x, loaded.size.y, loaded.size.z);
    const clipReports = [];
    for (const clip of animations) {
      let maxRadius=0,animatedTracks=0,maxSeam=0;
      const loop = ['Idle','Swim','Crawl','Guard','Eat','Ability','Moult'].includes(clip.name);
      for(const track of clip.tracks){
        const n=track.getValueSize(),v=track.values;
        let varied=false;
        for(let k=n;k<v.length;k++) if(Math.abs(v[k]-v[k%n])>1e-6){varied=true;break;}
        if(varied) animatedTracks++;
        if(track.name.endsWith('.scale') && varied) throw Error(`${def.id} ${clip.name}: changing scale`);
        if(loop) for(let k=0;k<n;k++) maxSeam=Math.max(maxSeam,Math.abs(v[k]-v[v.length-n+k]));
      }
      if(!animatedTracks)throw Error(`${def.id} ${clip.name} is frozen`);
      if(maxSeam>.002)throw Error(`${def.id} ${clip.name} seam ${maxSeam}`);
      mixer.stopAllAction(); const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
      for(let phase=0;phase<=8;phase++) {
        mixer.setTime(clip.duration*phase/8);model.updateMatrixWorld(true);
        for(const mesh of meshes){mesh.skeleton.update();const count=mesh.geometry.attributes.position.count;const stride=Math.max(1,Math.floor(count/700));
          for(let i=0;i<count;i+=stride){mesh.getVertexPosition(i,p);mesh.localToWorld(p);if(![p.x,p.y,p.z].every(Number.isFinite))throw Error(`${def.id} ${clip.name} nonfinite skin`);maxRadius=Math.max(maxRadius,p.distanceTo(loaded.center));}
        }
      }
      if(maxRadius>extent*3)throw Error(`${def.id} ${clip.name} exploding skin ${maxRadius}/${extent}`);
      clipReports.push({name:clip.name,duration:clip.duration,animatedTracks,maxSeam,maxRadius});
    }
    mixer.stopAllAction();model.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)(o as THREE.SkinnedMesh).pose();});
    const textures=new Set<string>(); for(const m of meshes){for(const mat of (Array.isArray(m.material)?m.material:[m.material]) as THREE.MeshStandardMaterial[]){if(mat.map)textures.add(mat.map.uuid);if(mat.normalMap)textures.add(mat.normalMap.uuid);}}
    if(!textures.size)throw Error(`${def.id} no textures`);
    reports.push({id:def.id,fullTris,lodTris,bones:new Set(meshes.flatMap(m=>m.skeleton.bones)).size,textures:textures.size,clips:clipReports});
  }
  return reports;
}
