// Run from repo root: node --experimental-transform-types tools/feeding-test.mjs
import fs from 'node:fs';import assert from 'node:assert/strict';import * as THREE from 'three';import{GLTFLoader}from 'three/addons/loaders/GLTFLoader.js';import{MeshoptDecoder}from 'three/addons/libs/meshopt_decoder.module.js';import{CreatureAnchors,feedingPhase}from '../src/render/anchors.ts';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
// Execute the production post-animation pass itself, without constructing a WebGL renderer.
const source=fs.readFileSync('src/render/engine.ts','utf8');const begin=source.indexOf('  private syncAttachments(game: Game) {')+'  private syncAttachments(game: Game) {'.length;const end=source.indexOf('\n  /** Per-viewport pass:',begin);let body=source.slice(begin,end).trim();body=body.slice(0,body.lastIndexOf('}')).replace(/new Set<number>\(\)/g,'new Set()');const pass=new Function('THREE','feedingPhase',`return function(game){${body}}`)(THREE,feedingPhase);
const bytes=fs.readFileSync('public/assets/creatures/opabinia.glb');const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const model=gltf.scene,anchors=new CreatureAnchors(model),group=new THREE.Group();group.add(model);const mixer=new THREE.AnimationMixer(model),eat=mixer.clipAction(gltf.animations.find(c=>c.name==='Eat')).play();
const pv={group,anchors,visibleLength:5,poseFeeding(p){eat.time=p*.8;mixer.update(0);group.updateMatrixWorld(true);}};const preyGroup=new THREE.Group(),fv={group:preyGroup,visibleLength:.5};pv.poseFeeding(0);anchors.world('anchor_grasp',preyGroup.position);const originalPos=preyGroup.position.clone();const predator={id:1,creature:'opabinia',state:'eating',eatingTarget:2,stateT:0},food={id:2,state:'dead',pos:{x:originalPos.x,y:originalPos.y,z:originalPos.z},eaten:0};const game={actors:[predator,food],byId(id){return this.actors.find(a=>a.id===id)}};const context={views:new Map([[1,pv],[2,fv]]),feeding:new Map(),anchorPoint:new THREE.Vector3(),mouthPoint:new THREE.Vector3(),insidePoint:new THREE.Vector3()};const initialSim=JSON.stringify(food.pos);let heldError=0,lastScale=1;
for(let i=0;i<=98;i++){food.eaten=i/100;predator.stateT=i/100;preyGroup.position.copy(originalPos);preyGroup.scale.setScalar(1);pv.poseFeeding(0);pass.call(context,game);assert.equal(JSON.stringify(food.pos),initialSim);assert(preyGroup.position.toArray().every(Number.isFinite));if(i===50){const grip=new THREE.Vector3();anchors.world('anchor_grasp',grip);heldError=grip.distanceTo(preyGroup.position);assert(heldError<1e-5)}if(i===98){lastScale=preyGroup.scale.x;assert(lastScale<.01);const mouth=new THREE.Vector3();anchors.world('anchor_mouth_inside',mouth);assert(mouth.distanceTo(preyGroup.position)<.03)}}
predator.state='free';pass.call(context,game);assert.equal(context.feeding.size,0);const result={productionAttachmentPass:true,heldError,finalVisibleScale:lastScale,simulationPositionUnchanged:true,cancelledSessionCleared:true};console.log(result);

// Generic grab/swallow consumers use the exact same production pass for every
// new species. Exercise real animated cloned rigs at both runtime detail levels.
const { clone } = await import('three/addons/utils/SkeletonUtils.js');
const expansionIds = ['pikaia','nectocaris','burgessomedusa','odaraia','ottoia','cambroraster','sidneyia','leanchoilia','isoxys','odontogriphus','ctenorhabdotus','vetulicola','tamisiocaris'];
const socketPoint = (view, name) => {
  const socket = view.anchors.sockets.get(name);
  assert(socket, `Missing required socket ${name}`);
  socket.updateWorldMatrix(true, false);
  return socket.getWorldPosition(new THREE.Vector3());
};
const localSnapshot = (object) => {
  const rows=[];
  object.traverse(o => rows.push([o.name,...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]));
  return JSON.stringify(rows);
};
const closePoint = (actual, expected, label) => {
  assert(actual.toArray().every(Number.isFinite), `${label}: nonfinite point`);
  assert(actual.distanceTo(expected)<1e-6, `${label}: attachment offset ${actual.distanceTo(expected)}`);
};
let fallbackCases=0, grabPoseCases=0;
const genericReports=[];
for (const id of expansionIds) for (const lod of [0,1]) {
  const file=`${id}${lod?'.lod1':''}.glb`;
  const raw=fs.readFileSync(`public/assets/creatures/${file}`);
  const loaded=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
  const templateSnapshot=localSnapshot(loaded.scene);
  const bounds=new THREE.Box3().setFromObject(loaded.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const unit=1/Math.max(size.x,size.z,.01);
  const createView=(position,rotation,scaleValue) => {
    const model=clone(loaded.scene),group=new THREE.Group();
    model.scale.setScalar(unit);model.position.copy(center).multiplyScalar(-unit);group.add(model);
    group.position.copy(position);group.rotation.set(...rotation);group.scale.setScalar(scaleValue);
    return {model,group,anchors:new CreatureAnchors(model),visibleLength:scaleValue,mixer:new THREE.AnimationMixer(model)};
  };
  const left=createView(new THREE.Vector3(7,4,-9),[.21,.8,-.17],2.3);
  const right=createView(new THREE.Vector3(-5,3,12),[-.13,-.6,.11],.65);
  for(const [name,node]of left.anchors.sockets){
    assert.notEqual(node,right.anchors.sockets.get(name),`${file}: sockets shared across clones`);
    assert.notEqual(node,loaded.scene.getObjectByName(name),`${file}: socket shared with template`);
  }
  left.model.traverse(node=>{if(node.isBone){assert.notEqual(node,right.model.getObjectByName(node.name));assert.notEqual(node,loaded.scene.getObjectByName(node.name));}});
  const desiredPose=id==='nectocaris'?'Grab':'Attack';
  // Distant assets intentionally ship locomotion only; full Nectocaris must have Grab.
  const poseName=lod ? (loaded.animations.some(c=>c.name===desiredPose) ? desiredPose : loaded.animations.some(c=>c.name==='Swim') ? 'Swim' : 'Crawl') : desiredPose;
  const pose=loaded.animations.find(c=>c.name===poseName);
  assert(pose,`${file}: missing ${poseName} pose`);
  const leftAction=left.mixer.clipAction(pose).play();
  const idle=loaded.animations.find(c=>c.name==='Idle');assert(idle);
  right.mixer.clipAction(idle).play();right.mixer.setTime(idle.duration*.37);right.group.updateWorldMatrix(true,true);
  const rightSnapshot=localSnapshot(right.model);
  const predatorA={id:100,creature:id,state:'grabbing',pos:{x:7,y:4,z:-9},grabbing:102};
  const predatorB={id:101,creature:id,state:'grabbing',pos:{x:-5,y:3,z:12},grabbing:103};
  const foodA={id:102,state:'grabbed',grabbedBy:100,swallowedBy:-1,pos:{x:40,y:20,z:50},stateT:0,stateDur:1.6,scale:.2};
  const foodB={id:103,state:'grabbed',grabbedBy:101,swallowedBy:-1,pos:{x:-40,y:30,z:-50},stateT:0,stateDur:1.6,scale:.3};
  const viewA={group:new THREE.Group(),visibleLength:.2},viewB={group:new THREE.Group(),visibleLength:.3};
  const actors=[predatorA,predatorB,foodA,foodB];
  const testGame={actors,byId(actorId){return actors.find(a=>a.id===actorId)}};
  const testContext={views:new Map([[100,left],[101,right],[102,viewA],[103,viewB]]),feeding:new Map(),anchorPoint:new THREE.Vector3(),mouthPoint:new THREE.Vector3(),insidePoint:new THREE.Vector3()};
  const contact=left.anchors.sockets.has('anchor_grasp')?'anchor_grasp':'anchor_attack_primary';
  if(contact==='anchor_attack_primary')fallbackCases++;
  for(const fraction of [0,.23,.57,.91]){
    leftAction.time=pose.duration*fraction;left.mixer.update(0);left.group.updateWorldMatrix(true,true);
    assert.equal(localSnapshot(right.model),rightSnapshot,`${file}: animation changed sibling clone`);
    const expectedA=socketPoint(left,contact),expectedB=socketPoint(right,contact);
    foodA.state=foodB.state='grabbed';foodA.grabbedBy=100;foodB.grabbedBy=101;
    viewA.group.position.set(50,70,90);viewB.group.position.set(-50,-70,-90);
    const simBefore=JSON.stringify(actors);pass.call(testContext,testGame);
    assert.equal(JSON.stringify(actors),simBefore,`${file}: grabbed attachment mutated simulation`);
    closePoint(viewA.group.position,expectedA,`${file} ${poseName}@${fraction}: grasp A`);
    closePoint(viewB.group.position,expectedB,`${file} ${poseName}@${fraction}: grasp B`);
    assert(viewA.group.position.distanceTo(viewB.group.position)>1,`${file}: independent instances collapsed to shared anchor`);
    if(id==='nectocaris' && poseName==='Grab')grabPoseCases++;
    for(const progress of [0,.5,1]){
      foodA.state=foodB.state='swallowed';foodA.swallowedBy=100;foodB.swallowedBy=101;
      foodA.stateT=foodA.stateDur*progress;foodB.stateT=foodB.stateDur*progress;
      const expectedMouthA=socketPoint(left,'anchor_mouth').lerp(socketPoint(left,'anchor_mouth_inside'),progress);
      const expectedMouthB=socketPoint(right,'anchor_mouth').lerp(socketPoint(right,'anchor_mouth_inside'),progress);
      const before=JSON.stringify(actors);pass.call(testContext,testGame);
      assert.equal(JSON.stringify(actors),before,`${file}: swallow attachment mutated simulation`);
      closePoint(viewA.group.position,expectedMouthA,`${file}: swallow A@${progress}`);
      closePoint(viewB.group.position,expectedMouthB,`${file}: swallow B@${progress}`);
    }
  }
  assert.equal(localSnapshot(loaded.scene),templateSnapshot,`${file}: animation/attachment mutated cached template`);
  assert.equal(localSnapshot(right.model),rightSnapshot,`${file}: attachment mutated sibling clone`);
  left.mixer.stopAllAction();right.mixer.stopAllAction();
  genericReports.push({file,contact,pose:poseName,animatedSamples:4,swallowSamplesPerPose:3,independentClones:true,simulationUnchanged:true});
}
assert.equal(genericReports.length,26);
assert(fallbackCases>0,'No attack-primary fallback assets exercised');
assert(grabPoseCases>=4,'Full Nectocaris Grab must be exercised at four poses');
console.log({genericProductionAttachmentPass:true,assets:genericReports.length,grabPoseCases,fallbackCases,grabbedSamples:genericReports.length*4*2,swallowSamples:genericReports.length*4*3*2,independentClones:true,simulationUnchanged:true});
