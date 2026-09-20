/**
 * Publish the *original* pose of every body whose builder changed it, so a reviewer can see both.
 *
 *   node tools/triassic/base-poses.mjs           # copy, and write the manifest
 *   node tools/triassic/base-poses.mjs --check   # fail if either is stale
 *
 * Several generations arrive too strongly posed to rig — Dinocephalosaurus' neck turns 283 degrees,
 * Placodus' tail is swept out of the midline — so their builders unbend the *mesh* before binding,
 * and the body that ships rests in a shape the generation never held. That correction is the right
 * one and it is recorded in each `validation.json`, but until now there was no way to look at what
 * was changed: the shipped body is the only thing in `public/`, and a preview is retired the day an
 * animal ships.
 *
 * So each such body publishes its untouched generation as `<id>.origpose.glb`, and the viewer's
 * Model control offers it beside the body. Two poses, one control: **base pose** is the shipped rig
 * at rest, which is what every clip is authored from, and **original pose** is what Tripo made.
 *
 * The generation carries no rig, so it sits still — it is a thing to compare, not to animate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const check = process.argv.includes('--check');
const SRC = 'tools/triassic/creatures';
const OUT = 'public/assets/triassic/creatures';
const MANIFEST = 'src/content/triassic/base-poses.json';
const shipped = new Set(JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures);
const sha = (b) => createHash('sha256').update(b).digest('hex');

/** Keys a builder writes when it moved the mesh before binding, and what each one means. */
const MOVES = {
  neckUnbending: 'the neck unbent onto its own measured axis',
  unbending: 'the body unbent onto its own measured axis',
  tailStraightening: 'the tail straightened out of its sweep',
  neckStretch: 'the neck lengthened',
};

const rows = [], problems = [];
for (const id of [...shipped].sort()) {
  const vpath = path.join(SRC, id, 'validation.json');
  const raw = path.join(SRC, id, 'tripo-raw', `${id}.raw.glb`);
  if (!fs.existsSync(vpath) || !fs.existsSync(raw)) continue;
  let v; try { v = JSON.parse(fs.readFileSync(vpath, 'utf8')); } catch { continue; }
  // Only a move that was actually *applied* counts. A builder that measured a curve and left it
  // alone records the measurement too, and that body's base pose is the generation's own.
  const applied = Object.entries(MOVES)
    .filter(([k]) => v[k] && typeof v[k] === 'object' && v[k].applied === true)
    .map(([, why]) => why);
  if (!applied.length) continue;
  const bytes = fs.readFileSync(raw);
  const dest = path.join(OUT, `${id}.origpose.glb`);
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!cur || !cur.equals(bytes)) {
    if (check) problems.push(`${dest} is missing or stale`);
    else fs.writeFileSync(dest, bytes);
  }
  rows.push({ id, model: `assets/triassic/creatures/${id}.origpose.glb`, bytes: bytes.length, sha256: sha(bytes), changed: applied });
}

const output = JSON.stringify(rows, null, 2) + '\n';
const have = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
if (check) {
  if (have !== output) problems.push(`${MANIFEST} is stale`);
  if (problems.length) {
    console.error(problems.map((p) => `  ! ${p}`).join('\n'));
    console.error('  run: node tools/triassic/base-poses.mjs');
    process.exit(1);
  }
  console.log(`${rows.length} original poses published and current`);
} else {
  fs.writeFileSync(MANIFEST, output);
  console.log(`${rows.length} original pose(s) published to ${OUT}`);
  for (const r of rows) console.log(`  ${r.id}: ${r.changed.join('; ')}`);
}
