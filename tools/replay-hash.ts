/**
 * A fingerprint of the simulation: the proof that a refactor changed nothing.
 *
 *   node tools/test.mjs replay-hash            one line per era, mode and seed, plus the seabed
 *   node tools/test.mjs replay-hash -- 3000    step longer (default 1500 steps, 25 s)
 *
 * Every era, every selectable mode, two seeds, two seats driven by the bot brain so combat, eating,
 * growth, hiding and the grip all run; the whole world's state is folded into one hash each step.
 * The seabed's field functions are hashed on a grid as well, since those are what a performance
 * change to `src/sim/world.ts` has to leave exactly alone (CLAUDE.md: "prove the guard exact").
 *
 * It asserts nothing. Run it before a change that is meant to be a pure refactor, run it after, and
 * the two outputs must be identical; a change that is *meant* to alter behaviour will alter them,
 * and says so. One process per era, because the simulation reads ACTIVE_ERA at module top.
 */
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';

const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
selectEra(which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN);
const STEPS = Number(process.argv[3] ?? 1500) || 1500;

const { Game } = await import('../src/sim/game');
const { makeBrain, think } = await import('../src/sim/ai');
const { MODE_IDS } = await import('../src/sim/types');
const { PLAYABLE_IDS } = await import('../src/sim/creatures');
const { sampleHeight, biomeWeights, BIOMES } = await import('../src/sim/world');
type InputFrame = import('../src/sim/types').InputFrame;

/** FNV-1a over the bytes of a float64 stream. */
const buf = new Float64Array(1), bytes = new Uint8Array(buf.buffer);
let h = 0;
const mix = (x: number) => { buf[0] = Number.isFinite(x) ? x : -12345.678; for (let i = 0; i < 8; i++) h = Math.imul(h ^ bytes[i], 16777619) >>> 0; };
const mixStr = (s: string) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; };
const hex = () => h.toString(16).padStart(8, '0');

for (const mode of MODE_IDS) {
  for (const seed of [7, 4242]) {
    h = 2166136261;
    const ids = [PLAYABLE_IDS[seed % PLAYABLE_IDS.length], PLAYABLE_IDS[(seed * 7 + 3) % PLAYABLE_IDS.length]];
    const g = new Game(mode, [
      { creature: ids[0], device: 'keyboard', ready: true },
      { creature: ids[1], device: 'keyboard2', ready: true },
    ], seed);
    g.skipHatch();
    for (const p of g.players) p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 0.9, reaction: 0.18 });
    for (let t = 0; t < STEPS; t++) {
      const inputs = new Map<number, InputFrame>();
      g.players.forEach((p, i) => inputs.set(i, think(g, p, 1 / 60)));
      g.step(1 / 60, inputs);
      for (const e of g.events) { mixStr(e.kind); mix(e.actor ?? -1); mix(e.other ?? -1); }
      g.events.length = 0;
      if (t % 10) continue;
      mix(g.actors.length); mix(g.time);
      for (const a of g.actors) {
        mix(a.id); mixStr(a.creature); mixStr(a.state); mixStr(a.controller);
        mix(a.pos.x); mix(a.pos.y); mix(a.pos.z); mix(a.vel.x); mix(a.vel.y); mix(a.vel.z);
        mix(a.yaw); mix(a.hp); mix(a.stamina); mix(a.scale); mix(a.nutrition); mix(a.tier);
      }
      mixStr(g.state.status);
    }
    console.log(`${which.padEnd(9)} ${mode.padEnd(9)} seed ${String(seed).padEnd(5)} ${hex()}  (${g.actors.length} actors)`);
  }
}

h = 2166136261;
for (let x = -2000; x <= 2000; x += 37) for (let z = -2400; z <= 400; z += 29) {
  mix(sampleHeight(x, z));
  const w = biomeWeights(x, z); for (const b of BIOMES) mix(w[b]);
}
console.log(`${which.padEnd(9)} seabed    grid       ${hex()}`);
