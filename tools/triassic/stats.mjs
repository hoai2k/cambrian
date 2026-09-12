// Derive the Triassic roster's movement stats from the swimming research and write them into
// src/content/triassic/creatures.ts. Idempotent; run `node tools/triassic/stats.mjs` after editing
// docs/research/triassic-swimming.json (or the formulas here) and commit both.
//
// Adapted from tools/devonian/stats.mjs — same PACE / floor / burst-cap / turn-radius / agility /
// glide logic, a different length curve (see below), and four roster-specific adaptations: (a)
// four-flipper "flight" bodies get a fixed high agility and a short glide; (b) bottom-walking
// "sink" placodonts/ichthyosauriforms get a fixed low agility and a long glide; (c) shore animals
// (never far from the bank) skip the screens/s cruise floor, since nothing about steering them in
// open water needs to be quick; (d) jet bodies (funnel cephalopods) follow the same jet rule as
// the Devonian's nautiloids.
//
// Length: game length = K · metres^EXP. K = 4.0, EXP = 0.55 puts the 17.6 m Cymbospondylus at
// ~19.4 units and the 0.3 m Keichousaurus at ~2.06, the spread the design was authored against
// (docs/triassic/01-triassic-design.md).
import fs from 'node:fs';

const research = JSON.parse(fs.readFileSync('docs/research/triassic-swimming.json', 'utf8'));
const path = 'src/content/triassic/creatures.ts';
let src = fs.readFileSync(path, 'utf8');

const K = 4.0, EXP = 0.55;                      // game units = K · m^EXP  (Cymbospondylus 17.6 m → 19.4)
const PACE = 1.5;                               // game speed = research BL/s · PACE · length
const FLOOR_SCREENS = 0.5, BURST_CAP_SCREENS = 2.4;
const BURST_MIN = 1.6, BURST_MAX = 4.0;
const TURN_RADIUS = { sharp: 0.12, moderate: 0.2, wide: 0.35 };
const FLIGHT = new Set(['rhaeticosaurus']);
const SINK = new Set(['placodus', 'henodus', 'atopodentatus', 'cartorhynchus']);
const SHORE = new Set(['tanystropheus', 'mystriosuchus', 'macrocnemus', 'coelophysis']);
const mag = (L) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;   // magnificationDistance, src/render/engine.ts
const r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10;

const rows = [];
for (const r of research) {
  const L = r2(K * Math.pow(r.lengthM, EXP));
  const crawler = /crawl|walk|podial/i.test(r.mode);
  const paddler = /paddl/i.test(r.mode);
  const jet = r.reverse === 'jet' && /jet/i.test(r.mode);
  const armoured = /rigid|box|benthic|shield|armour/i.test(r.mode);
  const shore = SHORE.has(r.id);
  let cruise = r.cruiseBLs * PACE * L;
  if (!shore) cruise = Math.max(cruise, FLOOR_SCREENS * mag(L));
  let burst = r.burstBLs * PACE * L;
  burst = Math.min(burst, BURST_CAP_SCREENS * mag(L));
  const burstMul = Math.min(BURST_MAX, Math.max(BURST_MIN, burst / cruise));
  const turn = Math.min(5.0, Math.max(1.6, cruise / (TURN_RADIUS[r.turning] * L)));
  let agility = jet ? 3.0 : crawler || paddler ? 3.5 : Math.min(6.5, Math.max(3.5, 6.5 - 0.25 * L));
  let glide = crawler ? 0.7 : jet ? 0.35 : armoured ? 0.5 : 0.25;
  if (FLIGHT.has(r.id)) { agility = 6.0; glide = 0.2; }
  if (SINK.has(r.id)) { agility = 3.5; glide = 0.6; }
  rows.push({ id: r.id, L, cruise: r1(cruise), burstMul: r2(burstMul), turn: r2(turn), agility: r2(agility), glide, screens: cruise / mag(L), burstScreens: cruise * burstMul / mag(L) });
}

for (const row of rows) {
  const re = new RegExp(`(id: '${row.id}',[\\s\\S]*?adultLength: )[0-9.]+([\\s\\S]*?speed: )[0-9.]+, burst: [0-9.]+, agility: [0-9.]+, turnRate: [0-9.]+, glide: [0-9.]+`);
  const next = src.replace(re, (_, a, b) => `${a}${row.L}${b}${row.cruise}, burst: ${row.burstMul}, agility: ${row.agility}, turnRate: ${row.turn}, glide: ${row.glide}`);
  if (next === src) throw new Error(`no stat block found for ${row.id}`);
  src = next;
}
fs.writeFileSync(path, src);

console.log('id                 L_game  L_m    cruise  burst×  turn  agil  glide  screens/s cruise→sprint');
for (const r of rows.sort((a, b) => b.L - a.L)) {
  const m = research.find((x) => x.id === r.id).lengthM;
  console.log(`${r.id.padEnd(18)} ${String(r.L).padStart(5)}  ${m.toFixed(2).padStart(5)}  ${String(r.cruise).padStart(5)}   ${r.burstMul.toFixed(2)}   ${r.turn.toFixed(1)}   ${r.agility.toFixed(1)}   ${r.glide}    ${r.screens.toFixed(2)} → ${r.burstScreens.toFixed(2)}`);
}
