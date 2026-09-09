/** Headless balance harness: runs the sim with scripted players and prints what happened. */
import { Game } from '../src/sim/game';
import { emptyInput, TIER_NAMES, type InputFrame } from '../src/sim/types';
import { creature, CREATURE_IDS, type CreatureId } from '../src/sim/creatures';
import { bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { makeBrain, think } from '../src/sim/ai';

function run(creatureId: CreatureId, seconds: number, seed: number) {
  const g = new Game('rise', [{ creature: creatureId, device: 'keyboard', ready: true }], seed);
  const p = g.players[0];
  // Drive the player with the bot brain so it hunts and fights like a competent player.
  p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 0.9, reaction: 0.18 });
  const counts = { hits: 0, kills: 0, eats: 0, tierUps: 0, deaths: 0, parries: 0, escapes: 0, hunted: 0 };
  let maxTier = 0;
  for (let t = 0; t < seconds * 60; t++) {
    const inputs = new Map<number, InputFrame>();
    const f = think(g, p, 1 / 60);
    inputs.set(0, f);
    g.step(1 / 60, inputs);
    for (const e of g.events) {
      if (e.kind === 'hit' && e.actor === p.id) counts.hits++;
      if (e.kind === 'kill' && e.actor === p.id) counts.kills++;
      if (e.kind === 'eat' && e.actor === p.id) counts.eats++;
      if (e.kind === 'tierUp' && e.actor === p.id) counts.tierUps++;
      if (e.kind === 'death' && e.actor === p.id) counts.deaths++;
      if (e.kind === 'parry' && e.actor === p.id) counts.parries++;
      if (e.kind === 'escape' && e.actor === p.id) counts.escapes++;
      if (e.kind === 'hunted' && e.actor === p.id) counts.hunted++;
    }
    g.events.length = 0;
    maxTier = Math.max(maxTier, p.tier);
    if (t % (60 * 60) === 0 && t > 0) {
      const alive = g.actors.filter(isAlive);
      console.log(`  t=${t / 60}s tier=${TIER_NAMES[p.tier]} nut=${p.nutrition.toFixed(0)} hp=${p.hp.toFixed(0)}/${p.hpMax} actors=${alive.length} swarm=${alive.filter(a=>a.controller==='swarm').length} ambient=${alive.filter(a=>a.controller==='ambient').length} pos=(${p.pos.x.toFixed(0)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(0)}) goal=${p.brain?.goal}`);
    }
  }
  console.log(`${creature(creatureId).name}: maxTier=${TIER_NAMES[maxTier]} ${JSON.stringify(counts)} state=${p.state}`);
  return { maxTier, counts };
}

function duel(a: CreatureId, b: CreatureId, seconds: number) {
  const g = new Game('reef', [{ creature: a, device: 'keyboard', ready: true }, { creature: b, device: 'keyboard2', ready: true }], 77);
  const [pa, pb] = g.players;
  pb.pos = { x: pa.pos.x + 6, y: pa.pos.y, z: pa.pos.z + 1 };
  for (const p of g.players) p.brain = makeBrain('needs', { ...p.pos }, g.rng, { aggression: 1, reaction: 0.15 });
  pa.brain!.goal = 'fight'; pa.brain!.target = pb.id; pb.brain!.goal = 'fight'; pb.brain!.target = pa.id;
  const c = { hitsA: 0, hitsB: 0, parries: 0, blocks: 0, guardBreaks: 0, staggers: 0, dodges: 0, abilities: 0, grabs: 0, kills: '' };
  const t0 = performance.now();
  let steps = 0;
  for (let t = 0; t < seconds * 60; t++) {
    const inputs = new Map<number, InputFrame>();
    inputs.set(0, think(g, pa, 1 / 60)); inputs.set(1, think(g, pb, 1 / 60));
    // keep them interested in each other
    if (pa.brain!.goal !== 'fight' && isAlive(pb)) { pa.brain!.goal = 'fight'; pa.brain!.target = pb.id; }
    if (pb.brain!.goal !== 'fight' && isAlive(pa)) { pb.brain!.goal = 'fight'; pb.brain!.target = pa.id; }
    g.step(1 / 60, inputs); steps++;
    for (const e of g.events) {
      if (e.actor !== pa.id && e.actor !== pb.id && e.other !== pa.id && e.other !== pb.id) continue;
      if (e.kind === 'hit' && e.actor === pa.id) c.hitsA++;
      if (e.kind === 'hit' && e.actor === pb.id) c.hitsB++;
      if (e.kind === 'parry') c.parries++;
      if (e.kind === 'guardBreak') c.guardBreaks++;
      if (e.kind === 'stagger') c.staggers++;
      if (e.kind === 'dodge') c.dodges++;
      if (e.kind === 'ability') c.abilities++;
      if (e.kind === 'grab') c.grabs++;
      if (e.kind === 'kill' && (e.other === pa.id || e.other === pb.id)) { c.kills += `${g.byId(e.actor!)?.creature ?? '?'} killed ${g.byId(e.other!)?.creature} at ${(t / 60).toFixed(1)}s; `; }
    }
    g.events.length = 0;
    if (!isAlive(pa) || !isAlive(pb)) break;
  }
  const ms = (performance.now() - t0) / steps;
  console.log(`DUEL ${a} vs ${b}: ${JSON.stringify(c)} hpA=${pa.hp.toFixed(0)}/${pa.hpMax} hpB=${pb.hp.toFixed(0)}/${pb.hpMax} dist=${Math.hypot(pa.pos.x-pb.pos.x,pa.pos.z-pb.pos.z).toFixed(1)} stepMs=${ms.toFixed(2)}`);
}

const which = (process.argv[2] as CreatureId | 'all' | 'duel') ?? 'all';
if (which === 'duel') {
  duel('waptia', 'anomalocaris', 90); duel('wiwaxia', 'opabinia', 90); duel('olenoides', 'canadia', 90); duel('hallucigenia', 'marrella', 90);
  process.exit(0);
}
const secs = Number(process.argv[3] ?? 240);
for (const id of which === 'all' ? CREATURE_IDS : [which]) run(id, secs, 11 + CREATURE_IDS.indexOf(id));

// Sanity: band symmetry and size factor
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'anomalocaris', device: 'keyboard2', ready: true }], 3);
  const [a, b] = g.players;
  console.log('bands: waptia sees anomalocaris as', bandOf(a, b), '| anomalocaris sees waptia as', bandOf(b, a), 'lengths', lengthOf(a).toFixed(2), lengthOf(b).toFixed(2));
}
