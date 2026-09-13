// Run from repo root: npm run conform
/**
 * A brittle star lies along what it is on. The arms are bent after the clip has played, so the
 * checks here are geometric: put the rig over a shape and see where the arms end up.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const { ArmConform } = await import('../src/render/conform.ts');
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });

let failed = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };

const bytes = fs.readFileSync('public/assets/devonian/creatures/furcaster.glb');
const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');

/** A fresh copy of the rig, posed by its Crawl clip so the arms start where the animation puts them. */
function rig() {
  const model = clone(gltf.scene);
  const mixer = new THREE.AnimationMixer(model);
  const crawl = gltf.animations.find((c) => c.name === 'Crawl') ?? gltf.animations[0];
  mixer.clipAction(crawl).play();
  mixer.setTime(0.4);
  model.updateWorldMatrix(true, true);
  return { model, conform: new ArmConform(model) };
}
/** Every arm's tip, in world space. */
const tips = (model) => {
  const out = [];
  model.traverse((o) => { if (/^arm_\d+_35$/.test(o.name)) out.push(o.getWorldPosition(new THREE.Vector3())); });
  return out;
};
const settle = (r, surface, frames = 240) => { for (let i = 0; i < frames; i++) r.conform.apply(r.model, surface, 1, 1 / 60); r.model.updateWorldMatrix(true, true); };

{
  const r = rig();
  check('the rig has arms to lay down', r.conform.active, `${tips(r.model).length} arm tips`);
}

// --- flat ground: every arm comes down onto it ---
{
  const r = rig();
  const before = tips(r.model).map((v) => v.y);
  const surface = { groundAt: () => 0, clearance: 0.02 };
  settle(r, surface);
  const after = tips(r.model).map((v) => v.y);
  const worst = Math.max(...after.map(Math.abs));
  check('arms come down onto flat ground', worst < 0.12, `worst tip ${worst.toFixed(3)} off the floor, from ${Math.max(...before.map(Math.abs)).toFixed(2)}`);
}

// --- a ridge: the arms follow the shape rather than averaging it ---
{
  const r = rig();
  const ridge = (x) => (x > 0 ? 0.35 : 0);
  settle(r, { groundAt: (x) => ridge(x), clearance: 0.02 });
  const t = tips(r.model);
  const high = t.filter((v) => v.x > 0.15), low = t.filter((v) => v.x < -0.15);
  const ok = high.length > 0 && low.length > 0 && Math.min(...high.map((v) => v.y)) > Math.max(...low.map((v) => v.y));
  check('an arm over a rise sits above one in the hollow', ok,
    `${high.length} up at ${high.length ? Math.min(...high.map((v) => v.y)).toFixed(2) : '-'}, ${low.length} down at ${low.length ? Math.max(...low.map((v) => v.y)).toFixed(2) : '-'}`);
}

// --- holding on: the arms wrap the body rather than hanging off it ---
{
  const r = rig();
  const host = { x: 0, y: 0.25, z: 0, radius: 0.5 };
  const offsets = (m) => tips(m).map((v) => Math.abs(Math.hypot(v.x - host.x, v.y - host.y, v.z - host.z) - host.radius));
  const before = offsets(r.model);
  settle(r, { groundAt: () => -99, clearance: 0, host }, 150);
  const off = offsets(r.model);
  const median = [...off].sort((a, b) => a - b)[Math.floor(off.length / 2)];
  check('arms wrap what the animal is holding', median < 0.06,
    `middle tip ${median.toFixed(3)} off a ${host.radius} radius, from ${[...before].sort((a, b) => a - b)[2].toFixed(2)}`);
  check('...every one of them closer than it started', off.every((v, i) => v < before[i]),
    `worst still ${Math.max(...off).toFixed(2)} out, was ${Math.max(...before).toFixed(2)}`);
}

// --- it flows, it does not snap ---
{
  const r = rig();
  const surface = { groundAt: () => 0, clearance: 0.02 };
  const start = tips(r.model).map((v) => v.y);
  r.conform.apply(r.model, surface, 1, 1 / 60);
  r.model.updateWorldMatrix(true, true);
  const one = tips(r.model).map((v) => v.y);
  const moved = Math.max(...one.map((y, i) => Math.abs(y - start[i])));
  const drop = Math.max(...start.map(Math.abs));
  check('one frame bends the arms without snapping them', moved > 1e-4 && moved < drop * 0.25,
    `${moved.toFixed(3)} of a ${drop.toFixed(2)} correction in the first frame`);
}

// --- weight nothing, change nothing: an arm with nothing to lie on keeps the clip's pose ---
{
  const r = rig();
  const held = tips(r.model).map((v) => v.clone());
  for (let i = 0; i < 30; i++) r.conform.apply(r.model, { groundAt: () => 0, clearance: 0.02 }, 0, 1 / 60);
  r.model.updateWorldMatrix(true, true);
  const after = tips(r.model);
  check('a weight of nothing leaves the pose alone', after.every((v, i) => v.distanceTo(held[i]) < 1e-9),
    `${after.length} tips unmoved`);
}

// --- the same bend whatever the frame rate ---
{
  const fast = rig(), slow = rig();
  const surface = { groundAt: () => 0, clearance: 0.02 };
  for (let i = 0; i < 120; i++) fast.conform.apply(fast.model, surface, 1, 1 / 120);
  for (let i = 0; i < 60; i++) slow.conform.apply(slow.model, surface, 1, 1 / 60);
  fast.model.updateWorldMatrix(true, true); slow.model.updateWorldMatrix(true, true);
  const a = tips(fast.model), b = tips(slow.model);
  const gap = Math.max(...a.map((v, i) => v.distanceTo(b[i])));
  check('one second of it is one second of it at any frame rate', gap < 0.05, `${gap.toFixed(3)} apart after a second`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall conform tests passed');
process.exit(failed ? 1 : 0);
