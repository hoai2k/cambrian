// Headless production CreatureView + Attachments on the actual candidate rigs and prey.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]), close() {} });
const repo = process.cwd(), root = path.resolve(repo, '../devonian-authoring/michelinoceras/motion-v3');
const assetRoot = process.env.MIC_RUNTIME_ASSETS ?? path.join(root, 'runtime-candidate-01');
const output = process.env.MIC_RUNTIME_REPORT ?? path.join(root, 'runtime-review-01'); fs.mkdirSync(output, { recursive: true });
const cache = path.join(repo, 'node_modules/.cache/michelinoceras-motion-v3'); fs.mkdirSync(cache, { recursive: true });
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function api(era) {
  const entry = path.join(cache, `${era}.ts`), bundle = path.join(cache, `${era}.mjs`);
  const prelude = era === 'devonian' ? `import { selectEra } from '${repo}/src/content'; import { DEVONIAN } from '${repo}/src/content/devonian'; selectEra(DEVONIAN);` : '';
  fs.writeFileSync(entry, `${prelude}\nexport const api = {...await import('${repo}/src/render/creature'), ...await import('${repo}/src/render/attachments'), ...await import('${repo}/src/sim/actors'), ...await import('${repo}/src/sim/creatures')};`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', external: ['three', 'three/*'], outfile: bundle, logLevel: 'silent' });
  return (await import(bundle)).api;
}
const dev = await api('devonian'), camb = await api('cambrian');
async function load(file) {
  const bytes = fs.readFileSync(file);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), '');
  const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3());
  return { gltf, size, center: box.getCenter(new THREE.Vector3()), unit: 1 / Math.max(size.z, size.x, .01), tris: 0 };
}
const shared = { shieldGeo: new THREE.SphereGeometry(1, 8, 6) };
const preyLoaded = await load(path.join(repo, 'public/assets/devonian/creatures/furcaster.lod1.glb'));
const point = (v, name) => { const p = new THREE.Vector3(); assert(v.anchors.world(name, p)); return p; };
const world = actors => ({ actors, byId(id) { return actors.find(a => a.id === id); } });
const poses = v => { const rows = {}; v.group.traverse(o => { if (o.isBone) rows[o.name] = [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()]; }); return rows; };
const close = (a, b, e, message) => assert(a.distanceTo(b) <= e, `${message}: ${a.distanceTo(b)} > ${e}`);
function actor(api, id, species, length) { return api.makeActor(id, species, 'ambient', { x: 3, y: 5, z: -7 }, length / api.creature(species).adultLength); }
function setAngles(a, angles) { [a.pitch, a.yaw, a.bank] = angles; a.prevT = { x: a.pos.x, y: a.pos.y, z: a.pos.z, pitch: a.pitch, yaw: a.yaw, bank: a.bank }; }
function finiteSkin(v) {
  let samples = 0;
  v.group.traverse(o => {
    assert([...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].every(Number.isFinite), `${o.name}: nonfinite transform`);
    if (o.isSkinnedMesh && o.name.includes('arm_') && o.name.includes('continuous')) {
      o.skeleton.update(); const count = o.geometry.attributes.position.count;
      for (let i = 0; i < count; i += Math.max(1, Math.floor(count/12))) {
        const p = o.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(o.matrixWorld);
        assert(p.toArray().every(Number.isFinite), `${o.name}: nonfinite skinned vertex`); samples++;
      }
    }
  });
  return samples;
}
const reports = []; let skinSamples = 0;
for (const detail of ['full', 'lod']) {
  const file = path.join(assetRoot, detail === 'full' ? 'michelinoceras.glb' : 'michelinoceras.lod1.glb');
  const loaded = await load(file);
  const alternate = await load(path.join(assetRoot, detail === 'full' ? 'michelinoceras.lod1.glb' : 'michelinoceras.glb'));
  assert(loaded.gltf.scene.userData.cambrianFeeding);
  const template = JSON.stringify(loaded.gltf.scene.toJSON().object);
  for (const length of [.6, 2.5, 8]) for (const angles of [[0, 0, 0], [.31, 1.27, -.22]]) {
    const predator = actor(dev, 1, 'michelinoceras', length); predator.state = 'eating'; predator.eatingTarget = 2; setAngles(predator, angles);
    const food = actor(dev, 2, 'furcaster', length*.055); food.state = 'dead'; food.eatBites = 1;
    const pv = new dev.CreatureView('michelinoceras', loaded, shared, detail === 'lod' ? 1 : 0);
    // Independent raw GLTF mixer: a bug in CreatureView.poseFeeding cannot
    // hide by affecting both the expected and actual pose in the same way.
    const reference = clone(loaded.gltf.scene), referenceMixer = new THREE.AnimationMixer(reference);
    const referenceEat = referenceMixer.clipAction(loaded.gltf.animations.find(c => c.name === 'Eat')).setLoop(THREE.LoopOnce, 1).play();
    referenceEat.paused = true;
    const fv = new dev.CreatureView('furcaster', preyLoaded, shared, 1);
    assert(pv.feedingPerformance && pv.authoredFeeding && pv.anchors.canGrasp);
    pv.update(predator, 1/60, 0); pv.poseFeeding(.22);
    const pickup = point(pv, 'anchor_grasp').add(new THREE.Vector3(.012*length, -.006*length, .004*length).applyQuaternion(pv.group.quaternion));
    food.pos = { x: pickup.x, y: pickup.y, z: pickup.z }; setAngles(food, [0, 0, 0]);
    const pass = new dev.Attachments(), w = world([predator, food]), views = new Map([[1, pv], [2, fv]]);
    let boundary, finalScale, pickupContactError, maximumHoldError = 0;
    for (const progress of [0, .12, .2199, .22, .2201, .32, .48, .78, .9, 1]) {
      food.eaten = progress; predator.stateT = progress;
      // Include a moving and turning predator after contact; correction belongs
      // to its frame rather than the world location where food originally lay.
      if (progress >= .32) { predator.pos.x = 3+length*.04*progress; setAngles(predator, [angles[0], angles[1]+.15*progress, angles[2]]); }
      pv.update(predator, 1/60, progress); fv.update(food, 1/60, progress);
      referenceEat.time = referenceEat.getClip().duration*progress; referenceMixer.update(0);
      const expectedPose = poses({ group: reference }), rootBefore = poses(pv).root;
      const sim = JSON.stringify(w.actors);
      pass.sync(w, views, 1/60);
      assert.equal(JSON.stringify(w.actors), sim, 'attachments changed simulation');
      assert.deepEqual(poses(pv).root, rootBefore, 'feeding moved root');
      skinSamples += finiteSkin(pv);
      if (progress < .22) close(fv.group.position, pickup, 1e-8, 'pre-contact prey moved');
      if (progress === .22) {
        close(fv.group.position, pickup, 1e-8, 'pickup discontinuity'); boundary = fv.group.position.clone();
        pickupContactError = point(pv, 'anchor_grasp').distanceTo(pickup);
        assert(pickupContactError < length*.006, 'pickup has a visibly detached grasp');
      }
      if (progress === .2201) close(fv.group.position, boundary, length*.001, 'attachment-boundary jump');
      if (progress >= .32 && progress <= .78) {
        const error = fv.group.position.distanceTo(point(pv, 'anchor_grasp')); maximumHoldError = Math.max(maximumHoldError, error);
        assert(error < 1e-7, 'carried prey detached from grasp');
      }
      if (progress >= .78) {
        const actual = poses(pv);
        for (const name in expectedPose) for (let i = 0; i < expectedPose[name].length; i++) assert(Math.abs(expectedPose[name][i]-actual[name][i]) < 1e-7, `late authored pose overridden: ${name}`);
        assert(fv.group.scale.x <= pv.authoredFeeding.apertureDiameter*length+1e-8, 'food uses shell-scaled aperture');
      }
      if (progress === 1) { close(fv.group.position, point(pv, 'anchor_mouth_inside'), 1e-8, 'swallow misses mouth interior'); finalScale = fv.group.scale.length(); assert.equal(finalScale, 0); }
    }
    // Cancellation releases transforms to the regular per-frame actor update;
    // the paused progress clip must crossfade out and allow the next attack.
    predator.state = 'free'; predator.holdT = 0; food.eaten = .4;
    for (let i = 0; i < 30; i++) { pv.update(predator, 1/60, i/60); fv.update(food, 1/60, i/60); pass.sync(w, views, 1/60); }
    assert.equal(pass.feeding.size, 0); close(fv.group.position, pickup, 1e-8, 'canceled food retained attachment');
    assert.equal(pv.loco.getClip().name, 'Idle'); assert(pv.actions.get('Eat').getEffectiveWeight() < .001, 'paused Eat failed to fade out');
    predator.state = 'attack'; predator.move = pv.def.light; predator.moveKind = 'light'; predator.stateT = 0;
    pv.update(predator, 1/60, 1); assert.equal(pv.oneShot.getClip().name, 'Bite'); assert(pv.oneShot.time > 0);
    // A fresh/replaced target starts at its present consumed share, not at the
    // old session's late oral phase. A LOD/view replacement also resets state.
    predator.state = 'eating'; predator.stateT = 0; food.eaten = .4;
    pv.update(predator, 1/60, 0); pv.poseFeeding(.22);
    const freshPickup = point(pv, 'anchor_grasp').add(new THREE.Vector3(.004*length, 0, 0));
    food.pos = { x: freshPickup.x, y: freshPickup.y, z: freshPickup.z }; setAngles(food, [0, 0, 0]);
    fv.update(food, 1/60, 0); pass.sync(w, views, 1/60);
    assert.equal(pass.feeding.get(1).initialEaten, .4);
    food.eaten = .4+.48*.6; predator.stateT = .5;
    pv.update(predator, 1/60, .5); fv.update(food, 1/60, .5); pass.sync(w, views, 1/60);
    assert(fv.group.position.distanceTo(freshPickup) > length*.002, 'mid-feed interruption fixture never carried food');
    predator.state = 'stagger'; predator.stateDur = 1;
    for (let i = 0; i < 20; i++) { pv.update(predator, 1/60, .5+i/60); fv.update(food, 1/60, .5+i/60); pass.sync(w, views, 1/60); }
    assert.equal(pass.feeding.size, 0); close(fv.group.position, freshPickup, 1e-8, 'mid-feed interruption left prey attached');
    assert(pv.actions.get('Eat').getEffectiveWeight() < .001, 'mid-feed interrupted Eat stayed frozen');
    predator.state = 'eating'; predator.stateT = .8;
    const replacementFood = actor(dev, 3, 'furcaster', length*.055); replacementFood.state = 'dead'; replacementFood.eatBites = 1; replacementFood.eaten = .6;
    replacementFood.pos = { x: freshPickup.x+.003*length, y: freshPickup.y, z: freshPickup.z }; setAngles(replacementFood, [0, 0, 0]);
    const replacementPrey = new dev.CreatureView('furcaster', preyLoaded, shared, 1);
    w.actors.push(replacementFood); views.set(3, replacementPrey); predator.eatingTarget = 3;
    pv.update(predator, 1/60, .8); replacementPrey.update(replacementFood, 1/60, .8); pass.sync(w, views, 1/60);
    assert.equal(pass.feeding.get(1).target, 3); assert.equal(pass.feeding.get(1).initialEaten, .6);
    const replacementView = new dev.CreatureView('michelinoceras', alternate, shared, detail === 'full' ? 1 : 0);
    views.set(1, replacementView); replacementFood.eaten = .7; predator.stateT = .9;
    replacementView.update(predator, 1/60, .9); replacementPrey.update(replacementFood, 1/60, .9); pass.sync(w, views, 1/60);
    assert.equal(pass.feeding.get(1).view, replacementView); assert.equal(pass.feeding.get(1).initialEaten, .7);
    replacementView.dispose(); replacementPrey.dispose(); w.actors.pop(); views.delete(3); views.set(1, pv); predator.eatingTarget = 2;
    pass.clear();
    // Out-of-reach food and multi-bite/large carcasses remain in simulation
    // position; the bounded reaching arms remain finite and never drag a body.
    for (const test of ['unreachable', 'extension-limit', 'multi-bite', 'oversize']) {
      pass.clear(); predator.stateT = 0; food.eaten = 0; food.eatBites = test === 'multi-bite' ? 3 : 1;
      food.scale = (test === 'oversize' ? length*2 : length*.055)/dev.creature('furcaster').adultLength;
      pv.update(predator, 1/60, 0); pv.poseFeeding(.22);
      const origin = test === 'unreachable' ? pickup.clone().add(new THREE.Vector3(length*2, 0, 0)) :
        test === 'extension-limit' ? point(pv, 'anchor_grasp').add(new THREE.Vector3(0, 0, length*.034).applyQuaternion(pv.group.quaternion)) : pickup;
      food.pos = { x: origin.x, y: origin.y, z: origin.z }; setAngles(food, [0, 0, 0]);
      for (const progress of [0, .22, .48, .9]) {
        predator.stateT = progress; food.eaten = progress; pv.update(predator, 1/60, progress); fv.update(food, 1/60, progress);
        pass.sync(w, views, 1/60); close(fv.group.position, origin, 1e-8, `${test} food was dragged`); skinSamples += finiteSkin(pv);
      }
    }
    assert.equal(JSON.stringify(loaded.gltf.scene.toJSON().object), template, 'shared source model mutated');
    reports.push({ detail, length, angles, pickupContactError, maximumHoldError, finalScale, cancellation: true, midFeedInterruption: true, targetAndLodReplacement: true, boundedUnreachableAndCarcass: true, lateAuthoredPoseUnchanged: true });
    pv.dispose(); referenceMixer.stopAllAction(); referenceMixer.uncacheRoot(reference); fv.dispose();
  }
}
// Asset-version gate: neither the shipped old Michelin nor the approved but
// unannotated art candidate accidentally acquires the new path.
for (const location of ['public/assets/devonian/creatures', '../devonian-authoring/michelinoceras/motion-v3/candidate-01']) for (const suffix of ['', '.lod1']) {
  const loaded = await load(path.resolve(repo, location, `michelinoceras${suffix}.glb`));
  const view = new dev.CreatureView('michelinoceras', loaded, shared);
  assert.equal(view.authoredFeeding, undefined); assert.equal(view.feedingPerformance, false); view.dispose();
}
// Existing Opabinia uses its existing progress/IK route without opting into
// Michelinoceras's asset-owned contact path or aperture dimensions.
const op = await load(path.join(repo, 'public/assets/creatures/opabinia.glb'));
const opView = new camb.CreatureView('opabinia', op, shared);
assert(opView.feedingPerformance); assert.equal(opView.authoredFeeding, undefined);
const opPred = actor(camb, 1, 'opabinia', 2); opPred.state = 'eating'; opPred.eatingTarget = 2;
const opFood = actor(camb, 2, 'marrella', .2); opFood.state = 'dead'; opFood.eatBites = 1;
const opPrey = new camb.CreatureView('marrella', await load(path.join(repo, 'public/assets/creatures/marrella.glb')), shared);
opView.update(opPred, 1/60, 0); const opOrigin = point(opView, 'anchor_mouth').add(new THREE.Vector3(.05, -.1, .3));
opFood.pos = { x: opOrigin.x, y: opOrigin.y, z: opOrigin.z }; setAngles(opFood, [0, 0, 0]);
const opWorld = world([opPred, opFood]), opViews = new Map([[1, opView], [2, opPrey]]), opPass = new camb.Attachments();
for (const p of [0, .22, .5, 1]) {
  opPred.stateT = p; opFood.eaten = p; opView.update(opPred, 1/60, p); opPrey.update(opFood, 1/60, p); opPass.sync(opWorld, opViews, 1/60);
  if (p === .5) close(opPrey.group.position, point(opView, 'anchor_grasp'), 1e-8, 'legacy Opabinia lost grasp carry');
  if (p === 1) { close(opPrey.group.position, point(opView, 'anchor_mouth_inside'), 1e-8, 'legacy Opabinia swallow'); assert.equal(opPrey.group.scale.length(), 0); }
}
opPred.state = 'free'; opPass.sync(opWorld, opViews, 1/60); assert.equal(opPass.feeding.size, 0);
opView.dispose(); opPrey.dispose(); shared.shieldGeo.dispose();
assert(skinSamples > 0);
const report = { status: 'PASS', scenarios: reports, skinnedVertexSamples: skinSamples, legacyMichelinAndOpabinia: 'PASS',
  inputs: ['michelinoceras.glb', 'michelinoceras.lod1.glb'].map(p => ({ path: path.join(assetRoot, p), sha256: hash(path.join(assetRoot, p)) })),
  code: ['src/render/creature.ts', 'src/render/attachments.ts'].map(p => ({ path: path.join(repo, p), sha256: hash(path.join(repo, p)) })),
  limits: 'Headless actual rig/prey tests. No GPU image review or physical controller input; continuous in-game visual acceptance remains required.' };
fs.writeFileSync(path.join(output, 'runtime-results.json'), JSON.stringify(report, null, 2)+'\n');
console.log('MICHELINOCERAS_RUNTIME_PASS', reports.length, 'actual full/LOD scenarios;', skinSamples, 'skinned vertex samples; legacy regression PASS');
