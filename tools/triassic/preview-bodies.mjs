/**
 * Publishes the raw Tripo body of every Triassic animal that has one, so the specimen viewer can
 * show the mesh long before it is rigged.
 *
 *   node tools/triassic/preview-bodies.mjs            # copy and refresh the manifest
 *   node tools/triassic/preview-bodies.mjs --check    # fail if either is stale
 *
 * These are **not** game specimens. `tools/triassic/creatures/TRIPO-RAW.md` is explicit about what
 * they still lack: no authored skeleton, no anchor contract, no clips, and engine orientation and
 * scale not yet normalized. An animal with a shipped body has no entry here — it has the real
 * thing, and its procedural twin is the comparison that matters (`puppet` in the viewer).
 *
 * They are published rather than read out of `tools/` because the viewer loads from `public/`, and
 * a reviewer looking at a preview body is doing it in the browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const check = process.argv.includes('--check');
const SRC = 'tools/triassic/creatures';
const OUT = 'public/assets/triassic/creatures';
const MANIFEST = 'src/content/triassic/preview-bodies.json';

const shipped = new Set(JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const { yaw: YAW } = JSON.parse(fs.readFileSync('tools/triassic/preview-orientation.json', 'utf8'));

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

/** The roster's adult length for an id, so a preview can be shown at the size it will really be. */
const lengths = new Map();
{
  const src = fs.readFileSync('src/content/triassic/creatures.ts', 'utf8');
  for (const m of src.matchAll(/id:\s*'([a-z]+)'[\s\S]{0,1200}?adultLength:\s*([\d.]+)/g)) lengths.set(m[1], Number(m[2]));
  // A subject whose era is not settled has no roster entry to read a length from, on purpose:
  // being on the roster is what puts an animal in the sea. It carries its own length instead, so a
  // body under construction can still be previewed at the size it would be.
  for (const s of JSON.parse(fs.readFileSync('src/content/triassic/expansion.json', 'utf8')).subjects)
    if (!lengths.has(s.id)) lengths.set(s.id, s.adultLength);
}

/** Longest horizontal extent of the mesh, which is what the roster length is a length of. */
async function span(file) {
  const doc = await io.read(file);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const scene of doc.getRoot().listScenes()) scene.traverse((node) => {
    const mesh = node.getMesh(); if (!mesh) return;
    const w = node.getWorldMatrix(); const v = [0, 0, 0];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        for (let c = 0; c < 3; c++) {
          const p = w[c] * v[0] + w[4 + c] * v[1] + w[8 + c] * v[2] + w[12 + c];
          lo[c] = Math.min(lo[c], p); hi[c] = Math.max(hi[c], p);
        }
      }
    }
  });
  return Math.max(hi[0] - lo[0], hi[2] - lo[2]);
}

const rows = [];
const problems = [];
const retired = [];
for (const id of fs.readdirSync(SRC).sort()) {
  const src = path.join(SRC, id, `${id}.preview.glb`);
  if (!fs.existsSync(src)) continue;
  if (shipped.has(id)) {
    // The real body has landed. Every scrap of preview data for this animal goes with it — the
    // published mesh, its row in the manifest, and its estimated yaw — because a preview that
    // outlives its replacement is a second, worse answer to what the animal looks like, and the
    // estimates in it were never meant to survive contact with a built model.
    retired.push(id);
    const dest = path.join(OUT, `${id}.preview.glb`);
    if (fs.existsSync(dest)) {
      if (check) problems.push(`${id} has shipped but its preview body is still published at ${dest}`);
      else fs.unlinkSync(dest);
    }
    if (id in YAW) {
      if (check) problems.push(`${id} has shipped but still has an estimated yaw in preview-orientation.json`);
      else {
        const orient = JSON.parse(fs.readFileSync('tools/triassic/preview-orientation.json', 'utf8'));
        delete orient.yaw[id];
        fs.writeFileSync('tools/triassic/preview-orientation.json', `${JSON.stringify(orient, null, 2)}\n`);
      }
    }
    continue;
  }
  if (!(id in YAW)) { problems.push(`${id} has no estimated yaw — add it to tools/triassic/preview-orientation.json`); continue; }
  const bytes = fs.readFileSync(src);
  const dest = path.join(OUT, `${id}.preview.glb`);
  const current = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!current || !current.equals(bytes)) {
    if (check) problems.push(`${dest} is missing or stale`);
    else fs.writeFileSync(dest, bytes);
  }
  const extent = await span(src);
  const adult = lengths.get(id);
  if (!adult) problems.push(`${id}: no adultLength in the roster, cannot estimate a preview scale`);
  rows.push({
    id, model: `assets/triassic/creatures/${id}.preview.glb`, bytes: bytes.length, sha256: sha(bytes),
    // Estimates, both of them. The mesh comes out of Tripo normalized to 1.0 on its longest side and
    // pointing wherever the generation pointed it; these bring it round to the engine's own
    // convention (head at +z, up at +y) and up to the length the roster gives the animal.
    yaw: YAW[id], scale: adult ? Number((adult / extent).toFixed(4)) : 1, lengthUnits: adult ?? null,
  });
}

const output = JSON.stringify(rows, null, 2) + '\n';
if (check) {
  const have = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
  if (have !== output) problems.push(`${MANIFEST} is stale: run npm run triassic:previews`);
  if (problems.length) { console.error(problems.map((p) => `  ! ${p}`).join('\n')); process.exit(1); }
  console.log(`${rows.length} Triassic preview bodies published and current`);
} else {
  if (problems.length) { console.error(problems.map((p) => `  ! ${p}`).join('\n')); process.exit(1); }
  fs.writeFileSync(MANIFEST, output);
  console.log(`${rows.length} Triassic preview bodies published to ${OUT}`);
  for (const id of retired) console.log(`  retired ${id}: its own body has shipped, preview data removed`);
}
