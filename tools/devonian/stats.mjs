// Derive the Devonian roster's movement stats from the swimming research and write them into
// src/content/devonian/creatures.ts. Idempotent; run `node tools/devonian/stats.mjs` after editing
// docs/research/devonian-swimming.json (or the formulas here) and commit both.
//
// Length: the real animals span 0.06–5 m, an 80:1 range the engine cannot play at (the smallest
// Cambrian body it handles is about 0.9 units, and the camera stops closing in below 0.8). Game
// length = K · metres^0.6 keeps every animal in the real order and close to real proportion —
// Dunkleosteus is 3.9 Coccosteus long here, 9.6 in life — with the whole roster inside 0.85–12 units.
//
// Speed: from the research's cruise and burst in body lengths per second, times a pace factor
// (the sim's clock runs a little quick, like any arcade sea, so a cruising fish reads as swimming
// rather than drifting), with a floor in screens per second so a giant is never sluggish to steer
// (the follow camera sits about 1.45 lengths back) and a ceiling on sprint so nothing is
// uncontrollable. Turn rate from cruise speed over a turning radius in body lengths (sharp 0.12,
// moderate 0.2, wide 0.35, after the fast-start literature), acceleration by size, coasting by
// build (streamlined bodies glide, armour stops).
import fs from 'node:fs';

const research = JSON.parse(fs.readFileSync('docs/research/devonian-swimming.json', 'utf8'));
const path = 'src/content/devonian/creatures.ts';
let src = fs.readFileSync(path, 'utf8');

const K = 4.6, EXP = 0.6;                       // game units = K · m^EXP  (Dunkleosteus 3.35 m → 9.5)
const PACE = 1.5;                               // game speed = research BL/s · PACE · length
const FLOOR_SCREENS = 0.5, BURST_CAP_SCREENS = 2.4;
const BURST_MIN = 1.6, BURST_MAX = 4.0;
const TURN_RADIUS = { sharp: 0.12, moderate: 0.2, wide: 0.35 };
const mag = (L) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;   // magnificationDistance, src/render/engine.ts
const r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10;

const rows = [];
for (const r of research) {
  const L = r2(K * Math.pow(r.lengthM, EXP));
  const crawler = /crawl|walk|podial/i.test(r.mode) && r.id !== 'jaekelopterus';
  const paddler = /paddl/i.test(r.mode);
  const jet = r.reverse === 'jet' && /jet/i.test(r.mode);
  const armoured = /rigid|box|benthic|shield|armour/i.test(r.mode) || ['dunkleosteus', 'titanichthys', 'coccosteus', 'bothriolepis'].includes(r.id);
  let cruise = r.cruiseBLs * PACE * L;
  cruise = Math.max(cruise, FLOOR_SCREENS * mag(L));
  let burst = r.burstBLs * PACE * L;
  burst = Math.min(burst, BURST_CAP_SCREENS * mag(L));
  const burstMul = Math.min(BURST_MAX, Math.max(BURST_MIN, burst / cruise));
  const turn = Math.min(5.0, Math.max(1.6, cruise / (TURN_RADIUS[r.turning] * L)));
  const agility = jet ? 3.0 : crawler || paddler ? 3.5 : Math.min(6.5, Math.max(3.5, 6.5 - 0.25 * L));
  const glide = crawler ? 0.7 : jet ? 0.35 : armoured ? 0.5 : 0.25;
  rows.push({ id: r.id, L, cruise: r1(cruise), burstMul: r2(burstMul), turn: r2(turn), agility: r2(agility), glide, screens: cruise / mag(L), burstScreens: cruise * burstMul / mag(L) });
}

for (const row of rows) {
  const re = new RegExp(`(id: '${row.id}',[\\s\\S]*?adultLength: )[0-9.]+([\\s\\S]*?speed: )[0-9.]+, burst: [0-9.]+, agility: [0-9.]+, turnRate: [0-9.]+, glide: [0-9.]+`);
  const next = src.replace(re, (_, a, b) => `${a}${row.L}${b}${row.cruise}, burst: ${row.burstMul}, agility: ${row.agility}, turnRate: ${row.turn}, glide: ${row.glide}`);
  if (next === src) throw new Error(`no stat block found for ${row.id}`);
  src = next;
}
fs.writeFileSync(path, src);

console.log('id              L_game  L_m   cruise  burst×  turn  agil  glide  screens/s cruise→sprint');
for (const r of rows.sort((a, b) => b.L - a.L)) {
  const m = research.find((x) => x.id === r.id).lengthM;
  console.log(`${r.id.padEnd(15)} ${String(r.L).padStart(5)}  ${m.toFixed(2)}  ${String(r.cruise).padStart(5)}   ${r.burstMul.toFixed(2)}   ${r.turn.toFixed(1)}   ${r.agility.toFixed(1)}   ${r.glide}    ${r.screens.toFixed(2)} → ${r.burstScreens.toFixed(2)}`);
}
