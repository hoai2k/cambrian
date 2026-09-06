// Run from repo root: node tools/feeding-test.mjs
// Runs the production attachment pass headlessly on every rig: feeding through the grasp chain (Opabinia,
// Anomalocaris), through the nearest articulated limbs (Waptia, Canadia, Marrella, Hallucigenia) or with the
// mouth alone (Olenoides, Wiwaxia), plus attack aiming toward a victim for every rig that can aim.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({ width: 512, height: 512, close() {} });
// The render and sim modules use extensionless imports, so bundle them for Node with the repo's esbuild.
import path from 'node:path'; import { build } from 'esbuild';
const bundleDir = path.join(process.cwd(), 'node_modules', '.cache', 'cambrian-tests'); fs.mkdirSync(bundleDir, { recursive: true });
const entry = path.join(bundleDir, 'feeding-entry.ts'), bundle = path.join(bundleDir, 'feeding-bundle.mjs');
fs.writeFileSync(entry, `export { CreatureAnchors } from '${process.cwd()}/src/render/anchors';\nexport { Attachments } from '${process.cwd()}/src/render/attachments';\nexport { creature, CREATURE_IDS } from '${process.cwd()}/src/sim/creatures';\nexport { lengthOf } from '${process.cwd()}/src/sim/actors';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', external: ['three'], outfile: bundle, logLevel: 'silent' });
const { CreatureAnchors, Attachments, creature, CREATURE_IDS, lengthOf } = await import(bundle);

async function load(id) {
  const bytes = fs.readFileSync(`public/assets/creatures/${id}.glb`);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
function view(gltf, scale, performance = false) {
  const model = clone(gltf.scene), group = new THREE.Group(); group.add(model);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  const unit = 1 / Math.max(size.z, size.x, .01); model.scale.setScalar(unit); model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-unit);
  group.scale.setScalar(scale);
  const mixer = new THREE.AnimationMixer(model), eatClip = gltf.animations.find(c => c.name === 'Eat') ?? gltf.animations.find(c => ['Swim', 'Crawl', 'Idle'].includes(c.name));
  assert(eatClip, 'Feeding fixture requires Eat or a locomotion clip');
  const eat = mixer.clipAction(eatClip).play();
  const v = { group, model, mixer, anchors: new CreatureAnchors(model), visibleLength: scale, feedingPerformance: performance,
    poseFeeding(p) { eat.time = p * eatClip.duration * .99; mixer.update(0); group.updateWorldMatrix(true, true); },
    tick(dt) { mixer.update(dt); group.updateWorldMatrix(true, true); } };
  group.updateWorldMatrix(true, true);
  return v;
}
const actor = (id, cid, scale, o = {}) => ({ id, creature: cid, scale, state: 'free', stateT: 0, stateDur: 1, pos: { x: 0, y: 0, z: 0 }, yaw: 0, eaten: 0,
  eatingTarget: -1, lockTarget: -1, grabbedBy: -1, swallowedBy: -1, abilityActive: false, ...o });
const results = {};
const originalIds = ['anomalocaris','opabinia','waptia','canadia','hallucigenia','wiwaxia','marrella','olenoides'];
for (const id of originalIds) {
  const def = creature(id), gltf = await load(id);
  const predScale = 1, pred = actor(1, id, predScale / def.adultLength, { state: 'eating', eatingTarget: 2 });
  const L = lengthOf(pred); assert(Math.abs(L - predScale) < 1e-9);
  const pv = view(gltf, L, id === 'opabinia');
  const foodDef = creature('marrella'), food = actor(2, 'marrella', L * .35 / foodDef.adultLength, { state: 'dead' });
  const foodGltf = await load('marrella'), fv = view(foodGltf, lengthOf(food));
  // Food dropped just ahead of the mouth, where the sim allows eating to start.
  const mouth = new THREE.Vector3(); assert(pv.anchors.world('anchor_mouth', mouth));
  const origin = mouth.clone().add(new THREE.Vector3(.05 * L, -.1 * L, .3 * L)); food.pos = { x: origin.x, y: origin.y, z: origin.z };
  const world = { actors: [pred, food], byId(i) { return this.actors.find(a => a.id === i); } };
  const views = new Map([[1, pv], [2, fv]]), pass = new Attachments();
  const simPos = JSON.stringify(food.pos); let heldError = null, midDist = null, finalScale = null, inside = null;
  for (let i = 0; i <= 98; i++) {
    food.eaten = i / 100; pred.stateT = i / 100;
    fv.group.position.copy(origin); fv.group.scale.setScalar(lengthOf(food)); pv.tick(1 / 60); fv.group.updateWorldMatrix(true, true);
    pass.sync(world, views, 1 / 60);
    assert.equal(JSON.stringify(food.pos), simPos);
    pv.model.traverse(o => { assert(o.position.toArray().every(Number.isFinite) && o.quaternion.toArray().every(Number.isFinite)); });
    assert(fv.group.position.toArray().every(Number.isFinite));
    if (i === 50) {
      const grip = new THREE.Vector3();
      if (pv.anchors.canGrasp) { pv.anchors.world('anchor_grasp', grip); heldError = grip.distanceTo(fv.group.position); assert(heldError < 1e-5, `${id} grasp holds food`); }
      pv.anchors.world('anchor_mouth', mouth); midDist = mouth.distanceTo(fv.group.position);
      assert(midDist < origin.distanceTo(mouth), `${id} food is on its way to the mouth`);
      if (!pv.anchors.canGrasp && pv.anchors.canAim) { const tip = new THREE.Vector3(); pv.anchors.nearestAttack(fv.group.position, tip); assert(tip.distanceTo(fv.group.position) < origin.distanceTo(mouth), `${id} limbs close on the food`); }
    }
    if (i === 98) {
      finalScale = fv.group.scale.x / lengthOf(food); assert(finalScale < .01, `${id} food vanished`);
      const mi = new THREE.Vector3(); pv.anchors.world('anchor_mouth_inside', mi); inside = mi.distanceTo(fv.group.position); assert(inside < .03 * L, `${id} food ends inside the mouth`);
    }
  }
  pred.state = 'free'; pass.sync(world, views, 1 / 60); assert.equal(pass['feeding'].size, 0);

  // Attack aiming: a victim ahead and slightly to one side; the nearest articulated socket should move toward it.
  let aim = null;
  if (pv.anchors.canAim) {
    const victim = actor(3, 'marrella', L * .6 / foodDef.adultLength, { pos: { x: .2 * L, y: 0, z: .55 * L } });
    const vv = view(foodGltf, lengthOf(victim)); vv.group.position.set(victim.pos.x, victim.pos.y, victim.pos.z); vv.group.updateWorldMatrix(true, true);
    const w2 = { actors: [pred, victim], byId(i) { return this.actors.find(a => a.id === i); } }, v2 = new Map([[1, pv], [3, vv]]);
    pred.state = 'attack'; pred.move = def.light; pred.stateT = .05; pred.lockTarget = 3;
    const target = vv.group.position, tip = new THREE.Vector3(), p = new THREE.Vector3();
    // Distance from the nearest steerable socket, measured against the same animation frame with and without the pass.
    const nearestLimb = () => { let best = Infinity; for (const s of pv.anchors.sockets.values()) { if (!s.userData.cambrianAnchor.chain?.length || s.userData.cambrianAnchor.role !== 'attack') continue; s.updateWorldMatrix(true, false); best = Math.min(best, s.getWorldPosition(p).distanceTo(target)); } return best; };
    const pass2 = new Attachments(); let before = 0, after = 0;
    for (let f = 0; f < 30; f++) { pv.tick(1 / 60); before = nearestLimb(); pass2.sync(w2, v2, 1 / 60); after = nearestLimb(); }
    // Short single-bone limbs (Canadia parapodia) can only point at the victim; long chains close most of the gap.
    assert(after < before - 1e-3, `${id} strike moves toward the victim (${after} vs ${before})`);
    // Out of the strike window the pass releases the limb and forgets the aim.
    pred.state = 'free'; for (let f = 0; f < 60; f++) { pv.tick(1 / 60); pass2.sync(w2, v2, 1 / 60); }
    assert.equal(pass2['aim'].size, 0);
    aim = { before: +before.toFixed(3), after: +after.toFixed(3) };
  }
  results[id] = { grasp: pv.anchors.canGrasp, articulated: pv.anchors.canAim, heldError, midDist: +midDist.toFixed(3), finalScale: +finalScale.toFixed(4), inside: +inside.toFixed(4), aim };
  console.log(id, 'PASS', results[id]);
}

// Expansion regression: the production Attachments class on both full and
// intentionally locomotion-only distant rigs, including gelatinous mouth-only
// feeders. Each is independently translated, rotated, and scaled like game views.
const expansionIds = ['pikaia','nectocaris','burgessomedusa','odaraia','ottoia','cambroraster','sidneyia','leanchoilia','isoxys','odontogriphus','ctenorhabdotus','vetulicola','tamisiocaris'];
assert.deepEqual([...CREATURE_IDS].sort(), [...originalIds,...expansionIds].sort());
const poseValues=o=>[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()];
const localSnapshot = object => {const rows=[];object.traverse(o=>rows.push([o.name,...poseValues(o)]));return JSON.stringify(rows);};
const socketPoint = (v,name) => {const socket=v.anchors.sockets.get(name);assert(socket,`Missing ${name}`);socket.updateWorldMatrix(true,false);return socket.getWorldPosition(new THREE.Vector3());};
const closePoint = (actual,expected,label) => {assert(actual.toArray().every(Number.isFinite),`${label}: nonfinite`);assert(actual.distanceTo(expected)<1e-6,`${label}: offset ${actual.distanceTo(expected)}`);};
const finiteView = (v,label) => v.model.traverse(o=>assert(poseValues(o).every(Number.isFinite),`${label}: nonfinite ${o.name}`));
let fallbackCases=0,grabPoseCases=0,noGraspFeeders=0,mouthOnlyFeeders=0;
const expansionReports=[];
// A primary attack alias must not consume both of solveAttack's two slots.
// Both Nectocaris tentacles should reach toward a shared target, while all six
// socket names remain discoverable and root/body transforms remain fixed.
for(const suffix of ['', '.lod1']){
  const gltf=await load('nectocaris'+suffix),v=view(gltf,1.7);
  v.group.position.set(3,2,-4);v.group.rotation.set(.12,.55,-.09);v.group.updateWorldMatrix(true,true);
  assert.equal(v.anchors.sockets.size,6,'Nectocaris metadata sockets must remain six');
  const l=socketPoint(v,'anchor_attack_tentacle_L'),r=socketPoint(v,'anchor_attack_tentacle_R');
  const target=l.clone().lerp(r,.48).add(new THREE.Vector3(0,-.025,.035).applyQuaternion(v.group.quaternion));
  const chains=['anchor_attack_tentacle_L','anchor_attack_tentacle_R'].map(name=>v.anchors.sockets.get(name).userData.cambrianAnchor.chain.map(n=>v.model.getObjectByName(n)));
  const before=chains.map(chain=>chain.map(b=>b.quaternion.clone()));
  const root=v.model.getObjectByName('root'),body=v.model.getObjectByName('body'),rootPose=poseValues(root),bodyPose=poseValues(body);
  const residual=v.anchors.solveAttack(target,1,2,14);assert(Number.isFinite(residual));
  for(let side=0;side<2;side++)assert(chains[side].some((b,i)=>b.quaternion.angleTo(before[side][i])>1e-6),`Nectocaris${suffix}: solveAttack left an entire tentacle unchanged`);
  assert.deepEqual(poseValues(root),rootPose);assert.deepEqual(poseValues(body),bodyPose);
  assert.equal(v.anchors.sockets.size,6);finiteView(v,'Nectocaris bilateral solve');
}
for(const id of expansionIds) for(const lod of [0,1]){
  const file=`${id}${lod?'.lod1':''}`,gltf=await load(file),templateSnapshot=localSnapshot(gltf.scene);
  const left=view(gltf,2.3),right=view(gltf,.65);
  left.group.position.set(7,4,-9);left.group.rotation.set(.21,.8,-.17);
  right.group.position.set(-5,3,12);right.group.rotation.set(-.13,-.6,.11);
  left.group.updateWorldMatrix(true,true);right.group.updateWorldMatrix(true,true);
  for(const[name,node]of left.anchors.sockets){assert.notEqual(node,right.anchors.sockets.get(name));assert.notEqual(node,gltf.scene.getObjectByName(name));}
  left.model.traverse(o=>{if(o.isBone){assert.notEqual(o,right.model.getObjectByName(o.name));assert.notEqual(o,gltf.scene.getObjectByName(o.name));}});
  const rightSnapshot=localSnapshot(right.model);
  const def=creature(id);
  const predatorA=actor(100,id,2.3/def.adultLength,{state:'grabbing',pos:{x:7,y:4,z:-9},grabbing:102});
  const predatorB=actor(101,id,.65/def.adultLength,{state:'grabbing',pos:{x:-5,y:3,z:12},grabbing:103});
  const foodA=actor(102,'marrella',.2/creature('marrella').adultLength,{state:'grabbed',grabbedBy:100,pos:{x:40,y:20,z:50},stateDur:1.6});
  const foodB=actor(103,'marrella',.15/creature('marrella').adultLength,{state:'grabbed',grabbedBy:101,pos:{x:-40,y:30,z:-50},stateDur:1.6});
  const fvA={group:new THREE.Group(),visibleLength:.2,anchors:{canAim:false}},fvB={group:new THREE.Group(),visibleLength:.15,anchors:{canAim:false}};
  const actors=[predatorA,predatorB,foodA,foodB],world={actors,byId(i){return actors.find(a=>a.id===i)}};
  const views=new Map([[100,left],[101,right],[102,fvA],[103,fvB]]),attachments=new Attachments();
  const desired=id==='nectocaris'?'Grab':'Attack';
  const clip=gltf.animations.find(c=>c.name===desired)??(lod?gltf.animations.find(c=>['Swim','Crawl'].includes(c.name)):undefined);
  assert(clip,`${file}: missing ${desired}/LOD locomotion`);
  left.mixer.stopAllAction();const action=left.mixer.clipAction(clip).play();
  const contact=left.anchors.has('anchor_grasp')?'anchor_grasp':'anchor_attack_primary';if(contact==='anchor_attack_primary')fallbackCases++;
  for(const fraction of [0,.23,.57,.91]){
    action.time=clip.duration*fraction;left.mixer.update(0);left.group.updateWorldMatrix(true,true);
    assert.equal(localSnapshot(right.model),rightSnapshot,`${file}: animation changes sibling`);
    foodA.state=foodB.state='grabbed';foodA.grabbedBy=100;foodB.grabbedBy=101;
    fvA.group.position.set(50,70,90);fvB.group.position.set(-50,-70,-90);
    const expectedA=socketPoint(left,contact),expectedB=socketPoint(right,contact),before=JSON.stringify(actors);
    const rootPose=poseValues(left.model.getObjectByName('root'));
    attachments.sync(world,views,1/60);
    assert.equal(JSON.stringify(actors),before,`${file}: grab mutates simulation`);
    closePoint(fvA.group.position,expectedA,`${file}: grab A`);closePoint(fvB.group.position,expectedB,`${file}: grab B`);
    assert.deepEqual(poseValues(left.model.getObjectByName('root')),rootPose,`${file}: grab moves root`);
    if(id==='nectocaris'&&clip.name==='Grab')grabPoseCases++;
    for(const progress of [0,.5,1]){
      foodA.state=foodB.state='swallowed';foodA.swallowedBy=100;foodB.swallowedBy=101;foodA.stateT=foodB.stateT=1.6*progress;
      const a=socketPoint(left,'anchor_mouth').lerp(socketPoint(left,'anchor_mouth_inside'),progress),b=socketPoint(right,'anchor_mouth').lerp(socketPoint(right,'anchor_mouth_inside'),progress);
      const sim=JSON.stringify(actors);attachments.sync(world,views,1/60);
      assert.equal(JSON.stringify(actors),sim,`${file}: swallow mutates simulation`);
      closePoint(fvA.group.position,a,`${file}: swallow A@${progress}`);closePoint(fvB.group.position,b,`${file}: swallow B@${progress}`);
    }
  }
  // Actual generalized feeding. Put the food near a usable contact, not at an
  // unreachable fixture position: a medusa's short marginal tentacles cannot
  // reach a generic target near the center of its bell.
  attachments.clear();left.mixer.stopAllAction();
  const feedingClip=gltf.animations.find(c=>c.name==='Eat')??gltf.animations.find(c=>['Swim','Crawl','Idle'].includes(c.name));assert(feedingClip);
  const feedAction=left.mixer.clipAction(feedingClip).play();
  predatorA.state='eating';predatorA.eatingTarget=102;predatorA.stateT=0;foodA.state='dead';foodA.eaten=0;
  predatorB.state='free';foodB.state='free';foodB.grabbedBy=foodB.swallowedBy=-1;
  left.group.updateWorldMatrix(true,true);
  const mouth=socketPoint(left,'anchor_mouth');
  const origin=(left.anchors.canGrasp?socketPoint(left,'anchor_grasp'):mouth.clone()).add(new THREE.Vector3(.06,-.06,.12).applyQuaternion(left.group.quaternion));
  foodA.pos={x:origin.x,y:origin.y,z:origin.z};
  let heldError=null,finalInside=null,finalScale=null;
  if(!left.anchors.canGrasp)noGraspFeeders++;if(!left.anchors.canGrasp&&!left.anchors.canAim)mouthOnlyFeeders++;
  for(let frame=0;frame<=100;frame++){
    const progress=frame/100;foodA.eaten=progress;predatorA.stateT=progress;
    feedAction.time=feedingClip.duration*((frame*.013)%1);left.mixer.update(0);left.group.updateWorldMatrix(true,true);
    fvA.group.position.copy(origin);fvA.group.scale.setScalar(fvA.visibleLength);
    const rootBefore=poseValues(left.model.getObjectByName('root')),sim=JSON.stringify(actors),other=localSnapshot(right.model),mouthBefore=socketPoint(left,'anchor_mouth');
    attachments.sync(world,views,1/60);
    assert.equal(JSON.stringify(actors),sim,`${file}: feeding mutates simulation`);
    assert.deepEqual(poseValues(left.model.getObjectByName('root')),rootBefore,`${file}: CCD moves root`);
    assert.equal(localSnapshot(right.model),other,`${file}: CCD changes sibling`);
    finiteView(left,file);assert([...fvA.group.position.toArray(),...fvA.group.scale.toArray()].every(Number.isFinite));
    if(frame===0)closePoint(fvA.group.position,origin,`${file}: pickup begins at corpse`);
    if(frame===50){
      if(left.anchors.canGrasp){heldError=socketPoint(left,'anchor_grasp').distanceTo(fvA.group.position);assert(heldError<1e-6,`${file}: grasp carry is detached`);}
      else {
        // At p=.5, carry interpolation is halfway; additive down-arc is .13L.
        const target=origin.clone().lerp(mouthBefore,.5).add(new THREE.Vector3(0,-left.visibleLength*.13,0).applyQuaternion(left.group.quaternion));
        closePoint(fvA.group.position,target,`${file}: no-chain carry midpoint`);
      }
      assert(fvA.group.scale.x<fvA.visibleLength,`${file}: carry does not approach aperture size`);
    }
    if(frame===100){finalInside=socketPoint(left,'anchor_mouth_inside').distanceTo(fvA.group.position);finalScale=fvA.group.scale.x;assert(finalInside<1e-6,`${file}: food misses inside socket by ${finalInside}`);assert.equal(finalScale,0,`${file}: completed swallow remains visible`);}
  }
  predatorA.state='free';attachments.sync(world,views,1/60);assert.equal(attachments['feeding'].size,0,`${file}: cancelled/finished session leaked`);
  assert.equal(localSnapshot(gltf.scene),templateSnapshot,`${file}: cached template changed`);
  assert.equal(localSnapshot(right.model),rightSnapshot,`${file}: sibling pose changed`);
  expansionReports.push({file,contact,pose:clip.name,grasp:left.anchors.canGrasp,aim:left.anchors.canAim,heldError,finalInside,finalScale});
  console.log(file,'PASS eating/carry, grab/swallow, clone isolation, finite/root-safe');
}
assert.equal(expansionReports.length,26);assert(fallbackCases>0);assert(grabPoseCases>=4);assert(noGraspFeeders>0);assert(mouthOnlyFeeders>0);
console.log({expansionProductionAttachments:true,assets:26,grabPoseCases,fallbackCases,noGraspFeeders,mouthOnlyFeeders,feedingFrames:26*101,grabbedSamples:26*4*2,swallowSamples:26*4*3*2,clonesIndependent:true,simulationUnchanged:true,rootSafe:true});
