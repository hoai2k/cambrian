/**
 * Two things every shipped Triassic body owes, checked over the whole family rather than over
 * whichever file a process happened to open.
 *
 *   node tools/triassic/clip-contract.mjs            # report
 *   node tools/triassic/clip-contract.mjs --check    # fail on either fault
 *   node tools/triassic/clip-contract.mjs --check <dir>   # the same questions of another tree
 *
 * 1. **The root does not move.** `tools/creatures/motion/rig.mjs` has enforced it since the motion
 *    library was written and every builder honours it, but nothing checked the shipped file, and
 *    the one assertion that looked (`_pipeline/paired-audit.mjs`) tested that a root *channel* did
 *    not exist — which is a different question, and answered "no root motion" to a clip whose root
 *    keys were the rest transform restated 25 times. This measures the thing: a root channel fails
 *    only where its samples leave the node's own rest transform, at the 1e-6 the library uses.
 *    A scale channel is still refused outright, on any bone: the packaging contract forbids it.
 * 2. **A variant carries exactly the clips the era JSON declares.** The manifest is what the game
 *    asks for, and it is one file for the three bodies, so a clip present on the authored body and
 *    absent from the twin is the manifest promising the reduced model something it does not have.
 *    That is what a shore gait written to the authored file alone did to five animals: the era JSON
 *    listed `Flop` as looping, the twin and the LOD1 had never heard of it, and the pair's own
 *    audit — the pipeline's verification step — could not run at all.
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const check = process.argv.includes('--check');
const DIR = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'public/assets/triassic/creatures';
const TOL = 1e-6;                                  // rig.mjs' own root tolerance

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const ids = JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures;
const failures = [];
let clips = 0; let rootChannels = 0; let files = 0;

/** How far a channel's samples leave `rest`: radians-ish for a quaternion, units for a translation. */
function drift(path, values, rest) {
  let worst = 0;
  if (path === 'rotation') {
    for (let i = 0; i + 3 < values.length; i += 4) {
      let dot = 0; for (let k = 0; k < 4; k++) dot += values[i + k] * rest[k];
      worst = Math.max(worst, Math.abs(1 - Math.abs(dot)));
    }
  } else {
    for (let i = 0; i + 2 < values.length; i += 3) {
      let d = 0; for (let k = 0; k < 3; k++) d += (values[i + k] - rest[k]) ** 2;
      worst = Math.max(worst, Math.sqrt(d));
    }
  }
  return worst;
}

for (const id of ids) {
  const metaFile = `${DIR}/${id}.json`;
  if (!fs.existsSync(metaFile)) { failures.push(`${id}: no era JSON at ${metaFile}`); continue; }
  const declared = JSON.parse(fs.readFileSync(metaFile, 'utf8')).clips;
  for (const suffix of ['', '.puppet', '.lod1']) {
    const file = `${DIR}/${id}${suffix}.glb`;
    const who = `${id}${suffix || ' (authored)'}`;
    if (!fs.existsSync(file)) { failures.push(`${who}: missing`); continue; }
    files++;
    const doc = await io.read(file);
    const root = doc.getRoot();
    const anims = root.listAnimations();
    clips += anims.length;

    // 2. exactly the declared clips, once each.
    const names = anims.map((a) => a.getName());
    const missing = declared.filter((n) => !names.includes(n));
    const extra = names.filter((n) => !declared.includes(n));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (missing.length) failures.push(`${who}: the era JSON declares ${missing.join(', ')} and this file does not carry ${missing.length > 1 ? 'them' : 'it'}`);
    if (extra.length) failures.push(`${who}: carries ${extra.join(', ')}, which the era JSON does not declare`);
    if (dupes.length) failures.push(`${who}: two clips named ${[...new Set(dupes)].join(', ')}`);

    // 1. the root does not move, and nothing anywhere animates scale.
    const rootNode = root.listSkins()[0]?.listJoints()[0];
    if (!rootNode) { failures.push(`${who}: no skin`); continue; }
    const rest = { rotation: rootNode.getRotation(), translation: rootNode.getTranslation(), scale: rootNode.getScale() };
    for (const a of anims) {
      for (const c of a.listChannels()) {
        const path = c.getTargetPath();
        if (path === 'scale') { failures.push(`${who}: ${a.getName()} animates scale on ${c.getTargetNode().getName()}`); continue; }
        if (c.getTargetNode() !== rootNode) continue;
        rootChannels++;
        const values = Array.from(c.getSampler().getOutput().getArray());
        const d = drift(path, values, rest[path]);
        if (d > TOL) failures.push(`${who}: ${a.getName()} moves the root (${path} drifts ${d.toExponential(2)} from its rest transform)`);
        else if (!check) console.log(`${who.padEnd(28)} ${a.getName()}.${path} on the root, held at rest (drift ${d.toExponential(2)})`);
      }
    }
  }
}
console.log(`${files} files, ${clips} clips, ${rootChannels} root channels (all held at rest), across ${ids.length} bodies`);
if (failures.length) {
  for (const f of failures) console.error('FAIL ' + f);
  if (check) process.exit(1);
}
