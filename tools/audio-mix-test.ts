/**
 * Headless audio-density check: runs the sim with a bot-driven player and reports, per event
 * kind, how many sounds fire and how many of them the player can actually hear once the
 * mix rules in `src/audio/mix.ts` are applied — the
 * distance falloff, and the retrigger gap that stops one kind machine-gunning.
 *
 * The reef is loud: every creature grazes, and grazing pushes an `eat` event up to twice a
 * second each. Without the falloff all of that played at full volume, panned dead centre — a
 * carpet of clicking from things 60 to 170 metres away. This test is the guard against that
 * coming back: `heard` should stay a small fraction of `fired`, and nothing that is heard at
 * all should be coming from far outside the player's own view.
 *
 * Usage: npx esbuild tools/audio-mix-test.ts --bundle --platform=node --format=esm --outfile=/tmp/t.mjs && node /tmp/t.mjs [seconds]
 */
import { AUDIBLE_FLOOR, distanceAtten, MIN_GAP } from '../src/audio/mix';
import { makeBrain, think } from '../src/sim/ai';
import { lengthOf } from '../src/sim/actors';
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';

/** Mirrors `magnificationDistance` in src/render/engine.ts — how far back the camera sits. */
const camDistance = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;

const SECONDS = Number(process.argv[2] ?? 90);
const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 4242);
const p = g.players[0];
// Drive the player with the bot brain so it hunts, eats and fights like a competent player.
p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 0.9, reaction: 0.18 });

const fired: Record<string, number> = {};
const heard: Record<string, number> = {};
const volume: Record<string, number> = {};
const lastPlayed: Record<string, { t: number; vol: number }> = {};
let farthestHeard = 0;

for (let t = 0; t < SECONDS * 60; t++) {
  const ms = (t / 60) * 1000;
  const inputs = new Map<number, InputFrame>();
  inputs.set(0, p.state === 'dead' ? emptyInput() : think(g, p, 1 / 60));
  g.step(1 / 60, inputs);
  const ref = camDistance(lengthOf(p));
  for (const e of g.events) {
    fired[e.kind] = (fired[e.kind] ?? 0) + 1;
    // The camera trails the player by about `ref`, so measuring from the player is within a
    // camera length of the real listener — close enough to characterise the mix.
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y, e.pos.z - p.pos.z);
    const a = distanceAtten(d, ref);
    if (a <= AUDIBLE_FLOOR) continue;
    // Same rule as `play()`: inside the window a kind only retriggers for a louder sound.
    const gap = MIN_GAP[e.kind] ?? 0;
    const prev = lastPlayed[e.kind];
    if (gap && prev && ms - prev.t < gap && a <= prev.vol * 1.15) continue;
    if (gap) lastPlayed[e.kind] = { t: ms, vol: a };
    heard[e.kind] = (heard[e.kind] ?? 0) + 1;
    volume[e.kind] = (volume[e.kind] ?? 0) + a;
    farthestHeard = Math.max(farthestHeard, d);
  }
  g.events.length = 0;
}

const kinds = Object.keys(fired).sort((a, b) => fired[b] - fired[a]);
let totalFired = 0, totalHeard = 0;
console.log(`${SECONDS}s, bot-driven Anomalocaris, finished at tier ${p.tier}\n`);
console.log('kind'.padEnd(14) + 'fired/s'.padStart(9) + 'heard/s'.padStart(9) + 'avg vol'.padStart(9));
for (const k of kinds) {
  totalFired += fired[k]; totalHeard += heard[k] ?? 0;
  console.log(k.padEnd(14)
    + (fired[k] / SECONDS).toFixed(2).padStart(9)
    + ((heard[k] ?? 0) / SECONDS).toFixed(2).padStart(9)
    + (heard[k] ? volume[k] / heard[k] : 0).toFixed(2).padStart(9));
}
console.log('-'.repeat(41));
console.log('TOTAL'.padEnd(14) + (totalFired / SECONDS).toFixed(2).padStart(9) + (totalHeard / SECONDS).toFixed(2).padStart(9));
console.log(`\n${((1 - totalHeard / totalFired) * 100).toFixed(0)}% of events are out of earshot; the farthest one heard was ${farthestHeard.toFixed(1)} m away.`);

// A player should not be hearing a steady stream of one-shots, and never from across the reef.
const perSecond = totalHeard / SECONDS;
const fail: string[] = [];
if (perSecond > 3) fail.push(`${perSecond.toFixed(1)} audible one-shots per second is a machine gun (expected 3 or fewer)`);
if (farthestHeard > 60) fail.push(`heard something ${farthestHeard.toFixed(0)} m away (expected 60 m or less)`);
if (fail.length) { console.error('\nFAIL: ' + fail.join('; ')); process.exit(1); }
console.log('OK');
