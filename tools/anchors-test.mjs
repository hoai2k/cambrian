// Run from repo root: node --experimental-transform-types tools/anchors-test.mjs
import fs from 'node:fs';import assert from 'node:assert/strict';import * as THREE from 'three';import{GLTFLoader}from 'three/addons/loaders/GLTFLoader.js';import{MeshoptDecoder}from 'three/addons/libs/meshopt_decoder.module.js';import{clone}from 'three/addons/utils/SkeletonUtils.js';
const {CreatureAnchors,feedingPhase}=await import('../src/render/anchors.ts');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
const records=JSON.parse(fs.readFileSync('docs/creature-anchors-manifest.json')),reports=[];
for(const record of records){const bytes=fs.readFileSync('public/assets/creatures/'+record.file);const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const model=clone(gltf.scene);const anchors=new CreatureAnchors(model);for(const a of record.anchors){const p=new THREE.Vector3();assert(anchors.world(a.name,p),a.name);assert(p.toArray().every(Number.isFinite));}let reachReport;
if(record.file.startsWith('opabinia')){
 const mixer=new THREE.AnimationMixer(model);const eat=gltf.animations.find(c=>c.name==='Eat');const action=mixer.clipAction(eat).play();mixer.setTime(.28);model.position.set(3,2,-4);model.scale.setScalar(2.3);model.rotation.set(.2,.7,-.1);model.updateWorldMatrix(true,true);
 const sourceRoot=model.getObjectByName('root'),rootQ=sourceRoot.quaternion.clone(),rootP=sourceRoot.position.clone();const p=new THREE.Vector3();anchors.world('anchor_grasp',p);const target=p.clone().add(new THREE.Vector3(.12,-.12,.1));const before=p.distanceTo(target);const error=anchors.solveGrasp(target,1,24);assert(error<before*.15,`IK ${record.file} residual ${error}/${before}`);assert(sourceRoot.position.equals(rootP)&&sourceRoot.quaternion.equals(rootQ));
 const unreachable=anchors.solveGrasp(new THREE.Vector3(1000,1000,1000));assert(Number.isFinite(unreachable));model.traverse(o=>{assert(o.position.toArray().every(Number.isFinite));assert(o.quaternion.toArray().every(Number.isFinite));});assert(sourceRoot.position.equals(rootP)&&sourceRoot.quaternion.equals(rootQ));
 const originalAnchor=gltf.scene.getObjectByName('anchor_grasp');assert(originalAnchor!==anchors.sockets.get('anchor_grasp'));reachReport={nearTargetResidual:error,unreachableFinite:true,rootUnchanged:true,cloneIsolated:true};
 action.stop();for(const name of record.changedClips){const c=gltf.animations.find(c=>c.name===name);assert(c);mixer.clipAction(c).play();for(let f=0;f<25;f++){mixer.setTime(c.duration*f/25);model.updateWorldMatrix(true,true);anchors.world('anchor_grasp',p);assert(p.toArray().every(Number.isFinite));}mixer.stopAllAction();}
}
// Every rig: attack contacts resolve to the nearest attack socket, and articulated ones steer toward a target without moving the root.
{const root=model.getObjectByName('root')??model.children[0];const rootQ=root.quaternion.clone(),rootP=root.position.clone();const p=new THREE.Vector3(),contact=new THREE.Vector3();assert(anchors.world('anchor_mouth',p));const target=p.clone().add(new THREE.Vector3(.3,-.1,.5));assert(anchors.nearestAttack(target,contact)===anchors.attackSockets.length>0);
 const articulated=record.anchors.filter(a=>a.role==='attack'&&a.chain?.length);assert.equal(anchors.canAim,articulated.length>0);assert.equal(anchors.canGrasp,record.anchors.some(a=>a.name==='anchor_grasp'&&a.chain?.length));
 if(anchors.canAim){const nearest=()=>Math.min(...articulated.map(a=>{anchors.world(a.name,p);return p.distanceTo(target)}));const before=nearest();const residual=anchors.solveAttack(target,1,2,12);assert(Number.isFinite(residual));const after=nearest();assert(after<before,`${record.file} aim ${after}/${before}`);assert(root.position.equals(rootP)&&root.quaternion.equals(rootQ));reachReport={...(reachReport||{}),aimBefore:+before.toFixed(3),aimAfter:+after.toFixed(3)};}
 else assert.equal(anchors.solveAttack(target),Infinity);
 model.traverse(o=>{assert(o.position.toArray().every(Number.isFinite));assert(o.quaternion.toArray().every(Number.isFinite));});}
reports.push({file:record.file,anchors:anchors.sockets.size,ik:reachReport});console.log(record.file,'PASS',anchors.sockets.size,'sockets',reachReport||'');}
assert(!feedingPhase(.1).attached&&feedingPhase(.3).attached);assert(feedingPhase(0).swallow===0&&feedingPhase(1).swallow===1);assert(feedingPhase(.78).carry===1);

// --- a grip lands on the animal, not on the capsule the simulation holds it against ---
//
// `rideHold` puts a grip `bodyRadius` out from the host's axis: about a fifth of its length. For a
// body anything like as round as it is long that is roughly the skin. For a long flat one it is
// open water beside the animal — Anomalocaris is 0.11 of its length thick against a capsule of
// 0.22 — and because the grip then follows a bone, that empty-water point is carried around
// faithfully for the whole ride. `surfaceToward` is what closes it: one ray in from outside, and
// what it finds is where the body actually is.
for (const name of ['anomalocaris', 'opabinia']) {
  const bytes = fs.readFileSync(`public/assets/creatures/${name}.glb`);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const model = clone(gltf.scene); model.updateWorldMatrix(true, true);
  const anchors = new CreatureAnchors(model);
  const box = new THREE.Box3().setFromObject(model), size = new THREE.Vector3();
  box.getSize(size);
  const L = Math.max(size.x, size.y, size.z), CAP = 0.22 * L;   // bodyRadius in src/sim/actors.ts
  const bounds = box.clone().expandByScalar(L * 0.1);
  let found = 0, tried = 0, worst = 0, closed = [];
  for (const bone of anchors.bones) {
    bone.updateWorldMatrix(true, false);
    const origin = bone.getWorldPosition(new THREE.Vector3());
    for (const axis of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]]) {
      const hold = origin.clone().addScaledVector(new THREE.Vector3(...axis), CAP), out = new THREE.Vector3();
      tried++;
      if (!anchors.surfaceToward(origin, hold, L, out)) continue;
      found++;
      const gap = hold.distanceTo(out);
      closed.push(gap);
      worst = Math.max(worst, gap);
      // Whatever it returns has to be *on the animal* — which is the whole point, and is not the
      // same as "inside the capsule". The capsule is a poor fit in both directions: Anomalocaris
      // is half the capsule's thickness through the body and wider than it across the swimming
      // flaps, so a grip is pulled in on the back and pushed out on the flank, and both are the
      // skin. The check is therefore the body's own bounds, not the capsule's.
      assert(out.toArray().every(Number.isFinite), `${name}: surface point is finite`);
      // ...and the bounds are the rig's own, which Box3 measures without skinning, so a posed
      // vertex can sit a little outside them. A tenth of a body length of slack keeps the check
      // about "on the animal rather than out in the water" instead of about that discrepancy.
      assert(bounds.containsPoint(out), `${name}: the grip lands on the animal, not beside it`);
    }
  }
  assert(found > tried * 0.8, `${name}: the ray finds the body from nearly everywhere (${found}/${tried})`);
  const median = closed.sort((a, b) => a - b)[Math.floor(closed.length / 2)];
  console.log(`${name} GRIP PASS  surface found ${found}/${tried}, capsule gap closed: median ${median.toFixed(2)} of ${L.toFixed(2)} units (${(median / L * 100).toFixed(0)}% of body length), worst ${worst.toFixed(2)}`);
  // The point of the exercise: on a long flat body the capsule really is well off the animal.
  if (name === 'anomalocaris') assert(median > L * 0.1, `anomalocaris: the capsule sat a long way off the body (${(median / L * 100).toFixed(0)}%)`);
}
