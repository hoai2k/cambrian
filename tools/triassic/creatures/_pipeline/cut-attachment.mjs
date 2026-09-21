/** The two sides of a posterior mouth cut must stay together during every action. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
/** `where` is the posterior cut, and it comes in two forms.
 *
 * A number is a coordinate on `axis`, which is what a body whose bind pose is the pose the jaw was
 * cut in can say: the rim lies on a plane square to the file's own axes. A body whose **bind has
 * been carried** since the cut cannot -- Askeptosaurus' front is straightened into its rest, which
 * rotates its whole head, so its rim is a plane with a general normal and an axis test selects no
 * vertices at all rather than failing. Such a builder records `{point, normal, tolerance}` in glTF
 * coordinates and the tolerance is loose on purpose: the rim's own vertices sit within a thousandth
 * of the plane, and the pairs that are *not* the posterior cut are the lip, which on this body is
 * a quarter of a unit away. There is nothing in between to catch.
 */
function onCut(v, where, axis) {
  if (typeof where === 'number') return Math.abs(v.getComponent(axis) - where) <= 1e-4;
  const [px, py, pz] = where.point, [nx, ny, nz] = where.normal;
  return Math.abs((v.x - px) * nx + (v.y - py) * ny + (v.z - pz) * nz) <= (where.tolerance ?? 1e-4);
}
export async function auditCutAttachment(file, where, axis=2) {
  const bytes=fs.readFileSync(file);
  const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const meshes=[];g.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
  const jaw=meshes.find(m=>/lower[ _]jaw/i.test(m.name+' '+m.parent?.name));
  // Node order is not anatomical: some exporters list the tooth rows first.
  const body=meshes.filter(m=>m!==jaw && !/lining|hinge|oral|tooth|teeth/i.test(m.name+' '+m.parent?.name))
    .sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count)[0];
  assert(jaw&&body,'cut audit needs the body and lower jaw');
  const v=new THREE.Vector3(),w=new THREE.Vector3();
  const point=(m,i,p)=>m.getVertexPosition(i,p).applyMatrix4(m.matrixWorld);
  g.scene.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
  const a=body.geometry.attributes.position,b=jaw.geometry.attributes.position,pairs=[];
  for(let i=0;i<a.count;i++){
    point(body,i,v);if(!onCut(v,where,axis))continue;
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
