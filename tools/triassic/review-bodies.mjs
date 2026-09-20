/**
 * Registers a Triassic body that has been BUILT but not yet SHIPPED, so the specimen viewer can
 * show it while a human decides whether it ships.
 *
 *   node tools/triassic/review-bodies.mjs            # refresh the manifest
 *   node tools/triassic/review-bodies.mjs --check    # fail if it is stale
 *
 * There was a hole between the two states this era already had. A raw Tripo mesh is published by
 * `preview-bodies.mjs` and shows in the viewer with no rig and no clips; a finished animal goes
 * into `tools/triassic/shipped.json` and is drawn by the game itself. But the pipeline's whole
 * point is the step between them — the body, its procedural twin and its clips all exist, and a
 * reviewer has to look at them *before* the id is added to shipped.json. Until this manifest there
 * was nothing pointing at those files, so a finished Placodus and Helicoprion sat on disk and the
 * viewer went on showing the Devonian fish they borrow in play.
 *
 * This is a VIEWER-only register. It deliberately does not touch `shipped.json`, the stand-ins or
 * the preview badge: the game keeps borrowing a body and the animal keeps its warning until a
 * human says otherwise. That is the same separation `specimens.json` already draws — a procedural
 * twin is a review artefact, never a roster entry.
 *
 * An entry retires itself the day the animal ships, exactly as a preview does, so the manifest can
 * never outlive what it describes.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const check = process.argv.includes('--check');
const DIR = 'public/assets/triassic/creatures';
const MANIFEST = 'src/content/triassic/review-bodies.json';

const shipped = new Set(JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures);
const sha = (b) => createHash('sha256').update(b).digest('hex');

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

/** Every id with an authored body on disk, shipped or not. `<id>.preview.glb` is not one of these. */
const built = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.glb') && !f.includes('.preview.') && !f.includes('.puppet.') && !f.includes('.backup.') && !f.includes('.lod'))
  .map(f => f.replace(/\.glb$/, ''))
  .sort();

const rows = [];
for (const id of built) {
  // A shipped animal is the game's, not the review queue's: it retires from here the day it lands.
  if (shipped.has(id)) continue;
  const model = `${DIR}/${id}.glb`;
  const puppet = `${DIR}/${id}.puppet.glb`;
  const lod = `${DIR}/${id}.lod1.glb`;
  const bytes = fs.readFileSync(model);
  // The clip list is read out of the file rather than declared beside it, so a manifest can never
  // promise an animation the body does not carry.
  const doc = await io.readBinary(bytes);
  const clips = doc.getRoot().listAnimations().map(a => a.getName()).sort();
  rows.push({
    id,
    model: model.replace(/^public\//, ''),
    puppet: fs.existsSync(puppet) ? puppet.replace(/^public\//, '') : null,
    lod: fs.existsSync(lod) ? lod.replace(/^public\//, '') : null,
    bytes: bytes.length,
    sha256: sha(bytes),
    clips,
  });
}

const output = `${JSON.stringify(rows, null, 2)}\n`;
const current = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
if (check) {
  if (current !== output) {
    console.error(`${MANIFEST} is stale — run: npm run triassic:review`);
    process.exit(1);
  }
  console.log(`review bodies: ${rows.length} awaiting review, manifest current`);
} else {
  fs.writeFileSync(MANIFEST, output);
  for (const r of rows) console.log(`  ${r.id}: ${r.clips.length} clips, twin ${r.puppet ? 'yes' : 'MISSING'}, ${(r.bytes / 1e6).toFixed(2)} MB`);
  console.log(`${rows.length} body/bodies awaiting review — written to ${MANIFEST}`);
}
