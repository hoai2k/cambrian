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

const check = process.argv.includes('--check');
const SRC = 'tools/triassic/creatures';
const OUT = 'public/assets/triassic/creatures';
const MANIFEST = 'src/content/triassic/preview-bodies.json';

const shipped = new Set(JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures);
const sha = (b) => createHash('sha256').update(b).digest('hex');

const rows = [];
const problems = [];
for (const id of fs.readdirSync(SRC).sort()) {
  const src = path.join(SRC, id, `${id}.preview.glb`);
  if (!fs.existsSync(src)) continue;
  if (shipped.has(id)) {
    // A delivered animal must not also offer its raw generation as a body: the shipped model is
    // what the game draws and what a reviewer should be judging.
    problems.push(`${id} has shipped but still carries a preview body — delete ${src}`);
    continue;
  }
  const bytes = fs.readFileSync(src);
  const dest = path.join(OUT, `${id}.preview.glb`);
  const current = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!current || !current.equals(bytes)) {
    if (check) problems.push(`${dest} is missing or stale`);
    else fs.writeFileSync(dest, bytes);
  }
  rows.push({ id, model: `assets/triassic/creatures/${id}.preview.glb`, bytes: bytes.length, sha256: sha(bytes) });
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
}
