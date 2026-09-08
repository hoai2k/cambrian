// Strict identity-scale regression + real intake on the isolated package family.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { assertStaticIdentityScale } from '../../../static-scale.mjs';

const repo = process.cwd(), root = path.resolve(repo, '../devonian-authoring/michelinoceras/motion-v3');
const sourceRoot = process.env.MIC_INTAKE_SOURCE ?? path.join(root, 'runtime-packaged-01');
const output = process.env.MIC_INTAKE_OUTPUT ?? path.join(root, 'runtime-intake-01'); assert(!fs.existsSync(output), 'Preserve prior intake evidence'); fs.mkdirSync(output);
const family = path.join(output, 'family'); fs.mkdirSync(family);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const publicFiles = ['', '.lod1'].map(s => path.join(repo, `public/assets/devonian/creatures/michelinoceras${s}.glb`));
const publicBefore = publicFiles.map(hash);
for (const suffix of ['glb', 'lod1.glb', 'json']) fs.copyFileSync(path.join(sourceRoot, `michelinoceras.${suffix}`), path.join(family, `michelinoceras.${suffix}`));
const portraits = [];
for (const suffix of ['png', 'select.png', 'card.png', 'thumb.png']) {
  const source = path.resolve(root, '../v1/candidate', `michelinoceras.${suffix}`), target = path.join(family, `michelinoceras.${suffix}`);
  fs.copyFileSync(source, target); portraits.push({ source, sha256: hash(source), note: 'Preserved original Idle portrait; unchanged geometry/material/Idle action, not a newly rendered feeding image.' });
}
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
let actualIdentityChannels = 0;
for (const suffix of ['', '.lod1']) {
  const doc = await io.read(path.join(family, `michelinoceras${suffix}.glb`));
  for (const clip of doc.getRoot().listAnimations()) for (const channel of clip.listChannels()) if (channel.getTargetPath() === 'scale') {
    assertStaticIdentityScale(channel.getSampler(), channel.getTargetNode(), clip.getName()); actualIdentityChannels++;
  }
}
assert(actualIdentityChannels > 4000, 'Actual emitted scale channels were not audited');
function sample(values, interpolation = 'LINEAR', bind = [1, 1, 1]) {
  const doc = new Document(), buffer = doc.createBuffer();
  const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buffer);
  const output = doc.createAccessor().setType('VEC3').setArray(new Float32Array(values)).setBuffer(buffer);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(interpolation);
  const node = doc.createNode().setScale(bind); return () => assertStaticIdentityScale(sampler, node, 'adversarial');
}
const ones = [1, 1, 1, 1, 1, 1], cubic = [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0];
sample(ones)(); sample(ones, 'STEP')(); sample(cubic, 'CUBICSPLINE')();
const cases = [
  ['constant nonidentity', sample([1, .9, 1, 1, .9, 1])],
  ['animated endpoint', sample([1, 1, 1, 1, 1.01, 1])],
  ['tiny actual motion', sample([1, 1, 1, 1, 1.000001, 1])],
  ['nonfinite NaN', sample([1, 1, 1, 1, NaN, 1])],
  ['nonfinite Infinity', sample([1, 1, 1, 1, Infinity, 1])],
  ['nonidentity bind', sample(ones, 'LINEAR', [1, .9, 1])],
  ['cubic incoming tangent', sample(cubic.map((v, i) => i === 9 ? .01 : v), 'CUBICSPLINE')],
  ['cubic outgoing tangent', sample(cubic.map((v, i) => i === 6 ? -.01 : v), 'CUBICSPLINE')],
  ['cubic nonidentity value', sample(cubic.map((v, i) => i === 13 ? 1.01 : v), 'CUBICSPLINE')],
  ['cubic wrong key count', sample(cubic.slice(0, -3), 'CUBICSPLINE')],
];
for (const [name, run] of cases) assert.throws(run, assert.AssertionError, name);
const log = execFileSync(process.execPath, [path.join(repo, 'tools/devonian/check.mjs'), 'michelinoceras'], {
  cwd: repo, encoding: 'utf8', maxBuffer: 8*1024*1024,
  env: { ...process.env, DEVONIAN_ASSETS: family, DEVONIAN_INTAKE_REPORT: path.join(output, 'intake.json') },
});
fs.writeFileSync(path.join(output, 'intake.log'), log); process.stdout.write(log);
assert.deepEqual(publicFiles.map(hash), publicBefore);
fs.writeFileSync(path.join(output, 'scale-regression.json'), JSON.stringify({ status: 'PASS', actualIdentityChannels,
  validInterpolationCases: ['LINEAR', 'STEP', 'CUBICSPLINE with zero tangents'], rejected: cases.map(([name]) => name),
  checkSha256: hash(path.join(repo, 'tools/devonian/check.mjs')), helperSha256: hash(path.join(repo, 'tools/devonian/static-scale.mjs')),
  portraits, publicMichelinocerasUnchanged: true, limits: 'Structural intake and exact static-scale audit; browser gameplay visual review remains required.' }, null, 2)+'\n');
console.log('MICHELINOCERAS_INTAKE_PASS;', actualIdentityChannels, 'actual static identity channels;', cases.length, 'adversarial scale curves rejected.');
