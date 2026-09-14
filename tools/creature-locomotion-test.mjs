// Headless production CreatureView check for authored Swim/Sprint loop selection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { build } from 'esbuild';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]), close() {} });

const repo = process.cwd();
const bundleDir = path.join(repo, 'node_modules', '.cache', 'creature-locomotion-test');
const entry = path.join(bundleDir, 'entry.ts');
const bundle = path.join(bundleDir, 'bundle.mjs');
fs.mkdirSync(bundleDir, { recursive: true });
fs.writeFileSync(entry, [
  `import { selectEra } from '${repo}/src/content';`,
  `import { TRIASSIC } from '${repo}/src/content/triassic';`,
  'selectEra(TRIASSIC);',
  `const render = await import('${repo}/src/render/creature');`,
  `const creatures = await import('${repo}/src/sim/creatures');`,
  `const actors = await import('${repo}/src/sim/actors');`,
  'export const CreatureView = render.CreatureView;',
  'export const creature = creatures.creature;',
  'export const makeActor = actors.makeActor;',
].join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', external: ['three'], outfile: bundle, logLevel: 'silent' });
const { CreatureView, creature, makeActor } = await import(`${bundle}?t=${Date.now()}`);

async function load(id) {
  const bytes = fs.readFileSync(path.join(repo, 'public/assets/triassic/creatures', `${id}.glb`));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  return { gltf, size, center: box.getCenter(new THREE.Vector3()), unit: 1 / Math.max(size.z, size.x, 0.01), tris: 0 };
}

const shared = { shieldGeo: new THREE.SphereGeometry(1, 6, 4) };
const activeLoop = (view) => view.loco?.getClip().name;
const effectiveRate = (view) => view.loco?.getEffectiveTimeScale();

for (const id of ['nothosaurus', 'shonisaurus']) {
  const loaded = await load(id);
  const view = new CreatureView(id, loaded, shared);
  const actor = makeActor(1, id, 'ambient', { x: 0, y: 0, z: 0 }, 1);
  const cruise = creature(id).speed;

  actor.vel = { x: 0, y: 0, z: 0 };
  view.update(actor, 1 / 60, 0);
  assert.equal(activeLoop(view), 'Idle', `${id}: stopped body must idle`);

  actor.vel.z = cruise;
  view.update(actor, 1 / 60, 1 / 60);
  assert.equal(activeLoop(view), 'Swim', `${id}: cruise must use Swim`);

  actor.vel.z = cruise * 1.21;
  view.update(actor, 1 / 60, 2 / 60);
  assert.equal(activeLoop(view), 'Sprint', `${id}: speed above 1.2 cruise must use Sprint`);
  assert(effectiveRate(view) >= 0.8 && effectiveRate(view) <= 1.35, `${id}: authored Sprint cadence was over-scaled`);

  actor.vel.z = cruise * 1.15;
  view.update(actor, 1 / 60, 3 / 60);
  assert.equal(activeLoop(view), 'Sprint', `${id}: Sprint must not flicker off just below its entry threshold`);

  actor.vel.z = cruise * 1.1;
  view.update(actor, 1 / 60, 4 / 60);
  assert.equal(activeLoop(view), 'Swim', `${id}: Sprint must return to Swim at 1.1 cruise`);
  view.dispose();

  const withoutSprint = { ...loaded, gltf: { ...loaded.gltf, animations: loaded.gltf.animations.filter((clip) => clip.name !== 'Sprint') } };
  const fallback = new CreatureView(id, withoutSprint, shared);
  actor.vel.z = cruise * 1.5;
  fallback.update(actor, 1 / 60, 5 / 60);
  assert.equal(activeLoop(fallback), 'Swim', `${id}: rig without Sprint must fall back to Swim`);
  fallback.dispose();
  console.log(`${id}: Idle / Swim / Sprint / missing-Sprint fallback PASS`);
}

shared.shieldGeo.dispose();
console.log('PASS: production CreatureView selects authored sprint loops without over-scaling their cadence');
