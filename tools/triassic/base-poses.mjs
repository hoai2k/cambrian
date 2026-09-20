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

/**
 * Keys a builder writes when the body's *rest* is not the shape the generation held, and what each
 * one means. `applied` is how a builder says it actually did the thing rather than only measuring
 * it, and most of these carry that flag; `carry` does not, because it is not a mesh move but a
 * **rest-pose carry** — a chain posed and the pose taken as the new bind — so what says it happened
 * is that there are bones in `carriedBones` and some share of the aim was carried into them.
 *
 * It belongs on this list for exactly the reason the list exists. Askeptosaurus' head stood 67.7°
 * off its trunk and T3D-26 put the whole aim into the bind (`restHeadVsTrunkRunDegrees` 4.17), so
 * the shipped body rests in a shape the generation never held — and a reviewer aiming that
 * correction in the bend editor was aiming it on the body that already carries it.
 */
const MOVES = {
  neckUnbending: { why: 'the neck unbent onto its own measured axis', applied: (v) => v.applied === true },
  unbending: { why: 'the body unbent onto its own measured axis', applied: (v) => v.applied === true },
  tailStraightening: { why: 'the tail straightened out of its sweep', applied: (v) => v.applied === true },
  neckStretch: { why: 'the neck lengthened', applied: (v) => v.applied === true },
  carry: {
    why: 'the rest pose carried the front\u2019s aim into the bind',
    applied: (v) => Array.isArray(v.carriedBones) && v.carriedBones.length > 0 && Number(v.carriedAimFraction) > 0,
  },
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
    .filter(([k, m]) => v[k] && typeof v[k] === 'object' && m.applied(v[k]))
    .map(([, m]) => m.why);
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
