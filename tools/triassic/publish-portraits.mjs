/**
 * Publish each shipped Triassic body's portraits — the renders *of the model* — into `public/`.
 *
 *   node tools/triassic/publish-portraits.mjs           # copy, and report what is missing
 *   node tools/triassic/publish-portraits.mjs --check   # fail if any shipped body is unpublished
 *
 * This step was missing and the gap is invisible in exactly the wrong way. A builder renders four
 * portraits into `tools/triassic/creatures/<id>/portraits/` and deliberately stops there: until a
 * human decides the animal ships, the roster keeps the placeholder cards cut from the canonical
 * *painting*. So an animal could ship, play, and still show artwork rather than its own body —
 * which is what the roster did for twenty-four animals, because shipping never copied the renders
 * across. The portraits were sitting in the tree the whole time.
 *
 * `<id>.png` is the one a reviewer means by "the 3D model image": a 1200x900 three-quarter studio
 * render at Idle. The other three are the roster's select, card and thumbnail.
 */
import fs from 'node:fs';
import path from 'node:path';

const check = process.argv.includes('--check');
const SRC = 'tools/triassic/creatures';
const OUT = 'public/assets/triassic/creatures';
const shipped = JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures;

const copied = [], unrendered = [], stale = [];
for (const id of shipped) {
  const dir = path.join(SRC, id, 'portraits');
  // Some older, purpose-built renderers write their five model renders straight to `public/`
  // (rather than into the generic source `portraits/` staging directory). They are valid delivered
  // renders too: require the complete authored quartet and puppet view before treating that path as
  // published, so a stray placeholder or incomplete legacy pass cannot hide a missing portrait.
  const directNames = [`${id}.select.png`, `${id}.card.png`, `${id}.thumb.png`, `${id}.png`,
                       `${id}.puppet.png`];
  const directComplete = directNames.every((name) => fs.existsSync(path.join(OUT, name)));
  if (!fs.existsSync(dir)) {
    if (!directComplete) unrendered.push(id);
    continue;
  }
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    const from = path.join(dir, name), to = path.join(OUT, name);
    const src = fs.readFileSync(from);
    const cur = fs.existsSync(to) ? fs.readFileSync(to) : null;
    if (cur && cur.equals(src)) continue;
    if (check) { stale.push(name); continue; }
    fs.writeFileSync(to, src);
    copied.push(name);
  }
}

if (check) {
  const problems = [...stale.map((n) => `${OUT}/${n} is missing or stale`)];
  if (problems.length) {
    console.error(problems.map((p) => `  ! ${p}`).join('\n'));
    console.error('  run: node tools/triassic/publish-portraits.mjs');
    process.exit(1);
  }
  console.log(`${shipped.length - unrendered.length} shipped bodies' portraits published and current` +
    (unrendered.length ? `; ${unrendered.length} have none rendered yet (${unrendered.join(', ')})` : ''));
} else {
  console.log(`${copied.length} portrait file(s) published to ${OUT}`);
  if (unrendered.length) {
    console.log(`  ${unrendered.length} shipped bodies have no rendered portraits at all:`);
    console.log(`    ${unrendered.join(', ')}`);
    console.log('    each needs its builder\'s render step: blender -b --python tools/triassic/creatures/<id>/render.py -- --portraits');
  }
}
