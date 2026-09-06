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
  const mixer = new THREE.AnimationMixer(model), eatClip = gltf.animations.find(c => c.name === 'Eat'), eat = mixer.clipAction(eatClip).play();
  const v = { group, model, mixer, anchors: new CreatureAnchors(model), visibleLength: scale, feedingPerformance: performance,
    poseFeeding(p) { eat.time = p * eatClip.duration * .99; mixer.update(0); group.updateWorldMatrix(true, true); },
    tick(dt) { mixer.update(dt); group.updateWorldMatrix(true, true); } };
  group.updateWorldMatrix(true, true);
  return v;
}
const actor = (id, cid, scale, o = {}) => ({ id, creature: cid, scale, state: 'free', stateT: 0, stateDur: 1, pos: { x: 0, y: 0, z: 0 }, yaw: 0, eaten: 0,
  eatingTarget: -1, lockTarget: -1, grabbedBy: -1, swallowedBy: -1, abilityActive: false, ...o });
const results = {};
for (const id of CREATURE_IDS) {
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
