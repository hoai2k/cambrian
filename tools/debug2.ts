import { Game } from '../src/sim/game';
import type { InputFrame } from '../src/sim/types';
import { makeBrain, think } from '../src/sim/ai';
const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'anomalocaris', device: 'keyboard2', ready: true }], 77);
const [pa, pb] = g.players;
pb.pos = { x: pa.pos.x + 6, y: pa.pos.y, z: pa.pos.z + 1 };
for (const p of g.players) p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 1, reaction: 0.15 });
for (let t = 0; t < 60 * 30; t++) {
  const inputs = new Map<number, InputFrame>();
  inputs.set(0, think(g, pa, 1 / 60)); inputs.set(1, think(g, pb, 1 / 60));
  for (const p of g.players) { const o = p === pa ? pb : pa; if (p.brain!.goal !== 'fight') { p.brain!.goal = 'fight'; p.brain!.target = o.id; } }
  g.step(1 / 60, inputs);
  for (const e of g.events) if (e.kind === 'ability' || e.kind === 'parry') { const a = g.byId(e.actor)!; console.log(`${(t/60).toFixed(2)} ${e.kind} by ${a.creature} ctrl=${a.controller} cd=${a.abilityCd.toFixed(2)} state=${a.state} stam=${a.stamina.toFixed(0)}`); }
  g.events.length = 0;
}
