import { Game } from '../src/sim/game';
import type { InputFrame } from '../src/sim/types';
import { makeBrain, think } from '../src/sim/ai';
import { bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { dist } from '../src/shared/math';
const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }], 11);
const p = g.players[0];
p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 0.9, reaction: 0.18 });
let lastGoal = '';
for (let t = 0; t < 60 * 90; t++) {
  const inputs = new Map<number, InputFrame>();
  const f = think(g, p, 1 / 60);
  inputs.set(0, f);
  g.step(1 / 60, inputs);
  const b = p.brain!;
  const key = b.goal + ':' + b.target;
  if (key !== lastGoal) {
    lastGoal = key;
    const tgt = b.target >= 0 ? g.byId(b.target) : undefined;
    console.log(`t=${(t / 60).toFixed(1)} goal=${b.goal} target=${tgt ? `${tgt.creature}@${tgt.scale} ${tgt.controller} band=${bandOf(p, tgt)} d=${dist(p.pos, tgt.pos).toFixed(1)}` : '-'} move=${f.worldMove ? `${f.worldMove.x.toFixed(2)},${f.worldMove.y.toFixed(2)},${f.worldMove.z.toFixed(2)}` : '-'} burst=${f.burst} pos=(${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)}) speed=${Math.hypot(p.vel.x,p.vel.y,p.vel.z).toFixed(2)} state=${p.state}`);
  }
  if (t % 600 === 0) {
    const near = g.actors.filter(a => a.id !== p.id && isAlive(a) && dist(a.pos, p.pos) < 14).map(a => `${a.creature.slice(0,4)}/${a.controller.slice(0,3)}/${bandOf(p,a)}/${dist(a.pos,p.pos).toFixed(0)}`);
    console.log(`  near(${near.length}):`, near.slice(0, 12).join(' '), 'myLen', lengthOf(p).toFixed(2), 'hunted', p.hunted.toFixed(2), 'wanderTo', JSON.stringify(b.wanderTo));
  }
  g.events.length = 0;
}
