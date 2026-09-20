/** The two sides of a posterior mouth cut must stay together during every action. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
export async function auditCutAttachment(file, coordinate, axis=2) {
  const bytes=fs.readFileSync(file);
  const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const meshes=[];g.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
  const jaw=meshes.find(m=>/lower[ _]jaw/i.test(m.name+' '+m.parent?.name));
  const body=meshes.find(m=>m!==jaw && !/lining|hinge|oral/i.test(m.name+' '+m.parent?.name));
  assert(jaw&&body,'cut audit needs the body and lower jaw');
  const v=new THREE.Vector3(),w=new THREE.Vector3();
  const point=(m,i,p)=>m.getVertexPosition(i,p).applyMatrix4(m.matrixWorld);
  g.scene.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
  const a=body.geometry.attributes.position,b=jaw.geometry.attributes.position,pairs=[];
  for(let i=0;i<a.count;i++){
    point(body,i,v);if(Math.abs(v.getComponent(axis)-coordinate)>1e-4)continue;
    for(let j=0;j<b.count;j++){
      point(jaw,j,w);if(v.distanceTo(w)<1e-5){pairs.push([i,j]);break}
    }
  }
  assert(pairs.length>=4,`posterior cut rim has only ${pairs.length} paired vertices`);
  const mixer=new THREE.AnimationMixer(g.scene);let worstGap=0,worstAt=null;
  for(const clip of g.animations){
    mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    for(let k=0;k<=60;k++){
      mixer.setTime(clip.duration*k/60);g.scene.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
      for(const [i,j] of pairs){point(body,i,v);point(jaw,j,w);const gap=v.distanceTo(w);if(gap>worstGap){worstGap=gap;worstAt=`${clip.name}@${k}/60`}}
    }
  }
  const result={pairedRimVertices:pairs.length,clips:g.animations.length,phasesPerClip:61,worstGap,worstAt};
  assert(worstGap<2e-4,`${file}: posterior jaw detaches ${worstGap} at ${worstAt}`);
  return result;
}
