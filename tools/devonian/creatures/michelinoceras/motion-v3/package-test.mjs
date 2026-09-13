// Run the real packager on isolated copies, then inspect the installed derivative.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const repo = process.cwd(), root = path.resolve(repo, '../devonian-authoring/michelinoceras/motion-v3');
const sourceRoot = process.env.MIC_PACKAGE_SOURCE ?? path.join(root, 'runtime-candidate-01');
const output = process.env.MIC_PACKAGE_OUTPUT ?? path.join(root, 'runtime-packaged-01');
const evidence = process.env.MIC_PACKAGE_EVIDENCE ?? path.join(root, 'runtime-packaging-01');
const optOut = path.join(evidence, 'opt-out');
assert(!fs.existsSync(output) && !fs.existsSync(evidence), 'Preserve prior packaging candidates/evidence');
fs.mkdirSync(output); fs.mkdirSync(evidence); fs.mkdirSync(optOut);
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const publicFiles = ['', '.lod1'].map(suffix => path.join(repo, `public/assets/devonian/creatures/michelinoceras${suffix}.glb`));
const publicBefore = publicFiles.map(digest);
for (const suffix of ['glb', 'lod1.glb', 'json']) {
  fs.copyFileSync(path.join(sourceRoot, `michelinoceras.${suffix}`), path.join(output, `michelinoceras.${suffix}`));
  fs.copyFileSync(path.join(root, 'candidate-01', `michelinoceras.${suffix}`), path.join(optOut, `michelinoceras.${suffix}`));
}
for (const [label, assets] of [['opt-in', output], ['opt-out', optOut]]) {
  const log = execFileSync(process.execPath, [path.join(repo, 'tools/devonian/package.mjs'), 'michelinoceras'], {
    cwd: repo, encoding: 'utf8', maxBuffer: 8*1024*1024,
    env: { ...process.env, DEVONIAN_ASSETS: assets, DEVONIAN_PACKAGING: path.join(evidence, label+'-logs') },
  });
  fs.writeFileSync(path.join(evidence, label+'.log'), log); process.stdout.write(log);
}
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const results = [];
for (const suffix of ['', '.lod1']) {
  const name = `michelinoceras${suffix}.glb`;
  const source = await io.read(path.join(sourceRoot, name));
  const packed = await io.read(path.join(output, name));
  const legacy = await io.read(path.join(optOut, name));
  const clips = doc => doc.getRoot().listAnimations().map(a => a.getName()).sort();
  assert.deepEqual(clips(packed), clips(source), 'opted-in packaging discarded an authored action');
  if (suffix) {
    assert.deepEqual(clips(packed), ['Attack', 'Bite', 'Death', 'Eat', 'Heavy', 'Idle', 'Swim']);
    assert.deepEqual(clips(legacy), ['Death', 'Idle', 'Swim'], 'historical opt-out LOD policy changed');
    assert.equal(packed.getRoot().listTextures().length, 0);
  } else assert.equal(clips(packed).length, 19);
  const feeding = packed.getRoot().getDefaultScene().getExtras().cambrianFeeding;
  assert.deepEqual(feeding, source.getRoot().getDefaultScene().getExtras().cambrianFeeding);
  assert.equal(legacy.getRoot().getDefaultScene().getExtras().cambrianFeeding, undefined);
  const sockets = doc => doc.getRoot().listNodes().filter(n => n.getExtras().cambrianAnchor).map(n => [n.getName(), n.getExtras().cambrianAnchor]).sort();
  assert.deepEqual(sockets(packed), sockets(source)); assert.equal(sockets(packed).length, 13);
  results.push({ file: path.join(output, name), sha256: digest(path.join(output, name)), bytes: fs.statSync(path.join(output, name)).size,
    clips: clips(packed), sceneFeedingMetadata: feeding, sockets: 13, optOutClips: clips(legacy) });
}
assert.deepEqual(publicFiles.map(digest), publicBefore, 'public Michelinoceras files changed');
const report = { status: 'PASS', actualPackager: path.join(repo, 'tools/devonian/package.mjs'), packagerSha256: digest(path.join(repo, 'tools/devonian/package.mjs')),
  installedDerivatives: results, publicMichelinocerasUnchanged: true, limits: 'Package structure/exact semantic checks only; renderer and intake remain separate.' };
fs.writeFileSync(path.join(evidence, 'package-results.json'), JSON.stringify(report, null, 2)+'\n');
console.log('MICHELINOCERAS_PACKAGE_PASS: installed opt-in LOD keeps 7 clips; opt-out keeps 3; metadata and sockets preserved.');
