// Map the Cambrian size research onto game lengths, and the roster's stats onto the result.
//
// `npm run cambrian:sizes` prints the table and changes nothing — the roster has NOT adopted these
// lengths yet, and `docs/research/cambrian-sizes.md` sets out what adopting them costs. `--write`
// applies them to src/content/cambrian/creatures.ts and expansion.ts (idempotent, so it can be run
// again after editing the research or the constants here); `--check` verifies committed values
// against the research, for the day this is wired into `npm run eras`.
//
// Length. The real animals span 1.55–37.8 cm, a 24:1 range that the flat roster it replaces threw
// away entirely: every Cambrian animal used to grow to within a third of every other, so a Marrella
// ended a match the size of an Anomalocaris. Game length = K · metres^EXP keeps them in the real
// order and close to real proportion — Anomalocaris is 6.8 Marrella long here, 24 in life — with
// the whole roster inside 0.9–6.3 units at adult. EXP is the Devonian's exponent (tools/devonian/
// stats.mjs) so the two seas compress size the same way; K is set so the largest body in the game,
// an Apex Anomalocaris at 2.6× adult, lands on the largest Devonian body (a Prime Titanichthys at
// 16.3), which is the biggest animal the engine is known to handle.
//
// Speed, health and poise come along with the length so that the *sim is unchanged at any given
// body size*. Nothing here is new tuning: it is the old tuning re-expressed for a body that is now
// a different number of units long.
//
//   speed  × r        a velocity, so it holds the animal's body lengths per second. The follow
//                     camera also sits a fixed number of body lengths back, so the on-screen pace
//                     barely moves either (the screens/s column).
//   hp     × r^1.1    `applyScaleStats` grows health as scale^1.1 of the adult figure, so lifting
//   poise  × r^1.1    the adult figure by the same power leaves health at a given *length* exactly
//                     where it was. Two bodies the same size still trade the same blows.
//
// Damage, knockback and reach need nothing: combat's `sizeFactor` is a ratio of lengths, and lunge,
// sense, clearance and body radius are all counted in body lengths already.
import fs from 'node:fs';

const K = 11.2, EXP = 0.6;
/** Everything hatches about this long: src/sim/tiers.ts owns the same number. */
const LARVA_LENGTH = 0.75, APEX = 2.6;
const mag = (L) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;   // magnificationDistance, src/render/engine.ts
const r2 = (v) => Math.round(v * 100) / 100;

const research = JSON.parse(fs.readFileSync('docs/research/cambrian-sizes.json', 'utf8'));
const files = ['src/content/cambrian/creatures.ts', 'src/content/cambrian/expansion.ts'];
const check = process.argv.includes('--check');
const write = process.argv.includes('--write');

/** The animal's own object literal: from its id to the next one, or the end of the file. */
function segment(src, id) {
  const start = src.indexOf(`id: '${id}',`);
  if (start < 0) return null;
  const next = src.indexOf("id: '", start + 6);
  return { start, end: next < 0 ? src.length : next };
}
function readField(seg, field) {
  const m = seg.match(new RegExp(`\\b${field}: ([0-9.]+)`));
  return m ? Number(m[1]) : null;
}
function writeField(seg, field, value) {
  const re = new RegExp(`\\b${field}: [0-9.]+`);
  if (re.test(seg)) return seg.replace(re, `${field}: ${value}`);
  // Not declared yet (the expansion animals take defaults): put it with the other numbers, right
  // after the role, which every animal has.
  return seg.replace(/(role: '[^']*',)/, `$1 ${field}: ${value},`);
}

const rows = [];
let failures = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  for (const r of research) {
    const at = segment(src, r.id);
    if (!at) continue;
    const seg = src.slice(at.start, at.end);
    const L = r2(K * Math.pow(r.lengthM, EXP));
    const was = readField(seg, 'adultLength') ?? 3;          // the expansion helper's default
    const wasSpeed = readField(seg, 'speed') ?? 4.8;
    // The generated speed is derived from whatever is committed *for the committed length*, so a
    // hand-tuned speed survives a re-run: it is only ever rescaled when the length actually moves.
    const ratio = L / was;
    const speed = r2(wasSpeed * ratio);
    const hp = Math.round((readField(seg, 'hp') ?? 90) * Math.pow(ratio, 1.1));
    const poise = Math.round((readField(seg, 'poise') ?? 45) * Math.pow(ratio, 1.1));
    rows.push({ id: r.id, m: r.lengthM, L, was, speed, wasSpeed, hp, poise, screens: speed / mag(L), wasScreens: wasSpeed / mag(was) });
    if (check || !write) {
      if (check && Math.abs(was - L) > 0.005) { console.error(`FAIL ${r.id}: adultLength ${was}, research says ${L}`); failures++; }
      continue;
    }
    let next = writeField(seg, 'adultLength', L);
    next = writeField(next, 'speed', speed);
    next = writeField(next, 'hp', hp);
    next = writeField(next, 'poise', poise);
    src = src.slice(0, at.start) + next + src.slice(at.end);
  }
  if (write && !check) fs.writeFileSync(file, src);
}

if (check) {
  console.log(failures ? `\n${failures} length(s) out of step with docs/research/cambrian-sizes.json — run npm run cambrian:sizes`
    : `PASS: ${rows.length} Cambrian body lengths match the size research`);
  process.exit(failures ? 1 : 0);
}

console.log('id                 real_m  adult   larva    apex  |    was   speed  (was)     hp  poise   screens/s (was)');
console.log(write ? '(written to src/content/cambrian/)' : '(report only — pass --write to apply; see docs/research/cambrian-sizes.md)');
for (const r of rows.sort((a, b) => b.L - a.L)) {
  const larva = r2(Math.min(r.L * 0.8, LARVA_LENGTH));
  console.log(`${r.id.padEnd(16)} ${r.m.toFixed(4)}  ${String(r.L).padStart(5)}   ${larva.toFixed(2)}  ${(r.L * APEX).toFixed(1).padStart(5)}  | ${String(r.was).padStart(5)}  ${String(r.speed).padStart(5)}  ${String(r.wasSpeed).padStart(5)}  ${String(r.hp).padStart(5)}  ${String(r.poise).padStart(5)}   ${r.screens.toFixed(2)}  (${r.wasScreens.toFixed(2)})`);
}
