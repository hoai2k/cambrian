/**
 * Every `K.<name>` the shore builders reach for must exist in `shorekit.py`.
 *
 * This check exists because it did not. `shorekit.Albedo` — the class that samples the intake
 * body's painted texture — went missing from the kit while all three builders still called it, and
 * as committed none of Tanystropheus, Macrocnemus or Coelophysis would run: the first line of the
 * traceback is `module 'shorekit' has no attribute 'Albedo'`. Nothing caught it, because a
 * reproducible builder is only exercised when somebody rebuilds, and these three had already
 * shipped their artefacts. The whole promise of `docs/triassic/04-tripo-pipeline.md` is that the
 * builder is the source of truth for the body, and a builder that cannot import is not that.
 *
 * It is deliberately static — no Blender, no import, a second to run — so it can sit in
 * `npm run triassic` and be paid for on every change rather than on every rebuild. It cannot prove
 * a builder runs; it proves the one failure that actually happened cannot happen silently again.
 *
 *   node tools/triassic/shorekit-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'tools/triassic/creatures';
const KIT = path.join(DIR, 'shorekit.py');

const kit = fs.readFileSync(KIT, 'utf8');
/** Top-level defs and classes: what `import shorekit as K` actually exposes. */
const exported = new Set([...kit.matchAll(/^(?:def|class)\s+([A-Za-z_]\w*)/gm)].map((m) => m[1]));
/** Module-level constants assigned at column zero (EXPORT, and anything like it). */
for (const m of kit.matchAll(/^([A-Z][A-Z0-9_]*)\s*=/gm)) exported.add(m[1]);

const users = fs.readdirSync(DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(DIR, e.name, 'build.py'))
  // the builders carry a trailing `# noqa: E402` on this import, so match the statement, not the line
  .filter((p) => fs.existsSync(p) && /^\s*import shorekit as K\b/m.test(fs.readFileSync(p, 'utf8')));

// Shared helpers are deliberately re-exported from the marine kit. Resolve the
// imported symbol against that source rather than treating a valid import as a
// missing local def, or accepting a misspelled import as an exported function.
const marine = fs.readFileSync(path.join(DIR, '_pipeline/tripo.py'), 'utf8');
const marineExports = new Set([...marine.matchAll(/^(?:def|class)\s+([A-Za-z_]\w*)/gm)].map(m => m[1]));
const importFailures = [];
for (const match of kit.matchAll(/^from tripo import ([^#\n]+)/gm)) {
  for (const entry of match[1].split(',')) {
    const [name, alias] = entry.trim().split(/\s+as\s+/);
    if (!marineExports.has(name)) importFailures.push(`shorekit.py imports missing tripo.${name}`);
    else exported.add(alias || name);
  }
}
let checks = 0;
const missing = [...importFailures];
for (const p of users) {
  const src = fs.readFileSync(p, 'utf8');
  const wanted = new Set([...src.matchAll(/\bK\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
  for (const name of [...wanted].sort()) {
    checks++;
    if (!exported.has(name)) missing.push(`${path.relative(DIR, p)} calls K.${name}, which shorekit.py does not define`);
  }
}

if (!users.length) {
  console.error('FAIL  no builder imports shorekit — this check is looking in the wrong place');
  process.exit(1);
}
if (missing.length) {
  for (const m of missing) console.error('FAIL  ' + m);
  process.exit(1);
}
console.log(`PASS: ${checks} shorekit references across ${users.length} shore builders all resolve `
  + `(${exported.size} names exported)`);
