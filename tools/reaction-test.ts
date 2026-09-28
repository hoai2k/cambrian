/**
 * Fight or flight. Whatever bites an animal has its attention: it answers or it runs, and when
 * running has stopped working it turns and answers anyway. Nothing in the sea keeps grazing while
 * something eats it. Run: npm run reactions
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { applyScaleStats, bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { makeBrain } from '../src/sim/ai';
import { dist } from '../src/shared/math';
import { nurseryAt, nurseryFactor, sampleHeight, SURFACE_Y } from '../src/sim/world';
import { creature } from '../src/sim/creatures';
import type { CreatureId } from '../src/sim/creatures';
import { checker, finish } from './lib/test';

const check = checker(56);
const DT = 1 / 60;
const OPEN = { x: 12, z: -110 };

/** A player of `playerScale` and one neighbour, in open water, with nothing else in reach. */
function pair(preyId: CreatureId, preyScale: number, playerScale: number, seed = 4, tough = false,
              playerId: CreatureId = 'anomalocaris') {
  const g = new Game('reef', [{ creature: playerId, device: 'keyboard', ready: true }], seed);
  const p = g.players[0];
  // Just the two of them: this is a question about one animal's answer, not about whatever else
  // the reef happened to put within sight of it.
  for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
  p.scale = playerScale; applyScaleStats(p, false); p.spawnProtect = 0; p.hp = p.hpMax;
  p.pos = { x: OPEN.x, y: sampleHeight(OPEN.x, OPEN.z) + 9, z: OPEN.z }; p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0;
  const n = g.spawn(preyId, 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.55 }, preyScale);
  n.spawnProtect = 0;
  // Some of these ask what an animal does over ten seconds of being bitten by something that would
  // normally swallow it in one. Give it the health to live through the question; nothing else about
  // it changes.
  if (tough) { n.hpMax = 5000; n.hp = n.hpMax; }
  n.brain = makeBrain('needs', { ...n.pos }, g.rng, {});
  const step = (f: Partial<InputFrame> = {}, chase = false) => {
    // A crawler settles on the sand and the attacker has to come down to it, or the bites simply
    // pass overhead. Only the vertical is held, and only for a body that lives on the floor:
    // getting away is the animal's own business.
    if (creature(n.creature).ground) p.pos.y = n.pos.y;
    if (chase) {   // hold it within its own reach as well: this is what being cornered looks like
      p.pos.x = n.pos.x; p.pos.z = n.pos.z + lengthOf(p) * 0.42; p.pos.y = n.pos.y;
      p.yaw = Math.PI;
    }
    g.step(DT, new Map([[0, { ...emptyInput(), ...f } as InputFrame]]));
    g.events.length = 0; p.spawnProtect = 0;
  };
  return { g, p, n, step };
}
/** Bite once a second and report every goal the neighbour picked. */
function harass(preyId: CreatureId, preyScale: number, playerScale: number, seconds: number, chase = false,
                seed = 4, playerId: CreatureId = 'anomalocaris') {
  const { p, n, step } = pair(preyId, preyScale, playerScale, seed, true, playerId);
  const goals = new Set<string>();
  const from = { ...n.pos };
  for (let i = 0; i < 60 * seconds && isAlive(n); i++) {
    step({ light: i % 45 < 3, camYaw: chase ? Math.PI : 0, my: chase ? 0 : 0.3 }, chase);
    if (n.brain) goals.add(n.brain.goal);
  }
  return { goals, band: bandOf(n, p), moved: Math.hypot(n.pos.x - from.x, n.pos.z - from.z), hp: n.hp / n.hpMax, alive: isAlive(n) };
}

// --- bitten by something its own size: it answers ---
{
  const r = harass('olenoides', 1, 1, 6);
  check('an animal bitten by its own size fights back', r.goals.has('fight'), `${r.band}, goals ${[...r.goals].join(',')}`);
}

// --- bitten by something far bigger: it runs ---
// The giant here is a trilobite rather than Anomalocaris on purpose: anything with a grasp swallows
// a snack whole on the first hold, and a swallowed animal has no behaviour left to measure.
{
  const r = harass('waptia', 0.5, 2.6, 5, false, 4, 'olenoides');
  check('an animal bitten by a giant runs from it', r.goals.has('flee'), `${r.band}, goals ${[...r.goals].join(',')}`);
  check('...and actually goes somewhere', r.alive && r.moved > 2, `${r.moved.toFixed(1)} units`);
}

// --- cornered by that giant: running has stopped working, so it turns ---
// Big enough not to go down in one gulp (`consumeSnacks` swallows any wild thing under a third of
// the eater's length on contact), small enough that the trilobite is still a giant to it.
{
  const r = harass('waptia', 1.05, 2.6, 12, true, 4, 'olenoides');
  check('...and turns on it when running stops working', r.goals.has('fight'),
    `cornered by a giant: goals ${[...r.goals].join(',')}`);
}

// --- already beaten down: still an answer, never indifference ---
{
  const { p, n, step } = pair('opabinia', 0.8, 1, 4, true);
  n.hp = n.hpMax * 0.2;   // beaten down to a fifth, and with the health to be asked about it
  const goals = new Set<string>();
  for (let i = 0; i < 60 * 5 && isAlive(n); i++) { step({ light: i % 45 < 3, my: 0.3 }); if (n.brain) goals.add(n.brain.goal); }
  const answered = goals.has('flee') || goals.has('fight');
  check('a beaten animal still answers rather than grazing', answered, `goals ${[...goals].join(',')}`);
  check('...and does not go back to feeding while it is being bitten', !goals.has('graze') && !goals.has('hunt'),
    `${[...goals].join(',')} (player ${bandOf(n, p)})`);
}

// --- a school scatters from whatever bites it, however small that is ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 9);
  const p = g.players[0];
  p.scale = 0.5; applyScaleStats(p, false); p.spawnProtect = 0;
  p.pos = { x: OPEN.x, y: sampleHeight(OPEN.x, OPEN.z) + 9, z: OPEN.z }; p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0;
  const school = [];
  for (let i = 0; i < 6; i++) {
    const f = g.spawn('waptia', 'swarm', { x: p.pos.x + (i % 3) * 0.6 - 0.6, y: p.pos.y, z: p.pos.z + 1.2 + Math.floor(i / 3) * 0.6 }, 0.42);
    f.spawnProtect = 0;
    // Timid, so it runs: a bold fish bitten by its own size breaks ranks and fights (tested below).
    f.brain = makeBrain('swarm', { ...f.pos }, g.rng, { schoolId: 77, aggression: 0.02 });
    school.push(f);
  }
  const bitten = school[0];
  const gapBefore = dist(bitten.pos, p.pos);
  for (let i = 0; i < 60 * 3 && isAlive(bitten); i++) {
    // Bite the one nearest the player, then let them run.
    if (i < 20) { bitten.lastHitBy = p.id; bitten.sinceHit = 0; bitten.hitFlash = 1; }
    g.step(DT, new Map([[0, { ...emptyInput(), my: 0 } as InputFrame]]));
    g.events.length = 0; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
  }
  const gapAfter = dist(bitten.pos, p.pos);
  check('a timid school fish bitten by its own size scatters', gapAfter > gapBefore + 1.5,
    `${gapBefore.toFixed(1)} → ${gapAfter.toFixed(1)} units from what bit it`);
}

// --- and nothing reacts to a hit it never took ---
{
  const { n, step } = pair('marrella', 0.6, 1);
  const goals = new Set<string>();
  for (let i = 0; i < 60 * 5; i++) { step({ my: 0 }); if (n.brain) goals.add(n.brain.goal); }
  check('an animal nobody touched gets on with its life', !goals.has('fight'), `goals ${[...goals].join(',')}`);
}

// --- the sea has its own ages: a small player still meets full-grown animals ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 3);
  const scales: number[] = [];
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 60; i++) {
    g.step(DT, m); g.events.length = 0;
    for (const a of g.actors) if (a.controller === 'ambient' && isAlive(a)) scales.push(a.scale);
  }
  const big = scales.filter((v) => v >= 1.3).length / scales.length;
  const grown = scales.filter((v) => v >= 0.7).length / scales.length;
  check('a hatchling-sized player still meets full-grown animals', big > 0.04,
    `${(big * 100).toFixed(0)}% of ambient sightings were adults`);
  check('...and most of what it meets is still young', grown > 0.2 && grown < 0.7,
    `${(grown * 100).toFixed(0)}% half grown or better`);
}

// --- and the big ones are up in the water, not lying on the sand ---
{
  const { keepClear } = await import('../src/sim/locomotion');
  let low = 0, seen = 0, smallLow = 0, smallSeen = 0;
  // Three seas rather than one: at any moment there are only a handful of grown animals about, and
  // one of them in a squabble on the floor swings a single run either way.
  for (const seed of [3, 21, 57]) {
    const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], seed);
    const m = new Map([[0, emptyInput()]]);
    for (let i = 0; i < 60 * 90; i++) {
      g.step(DT, m); g.events.length = 0;
      if (i % 30) continue;
      for (const a of g.actors) {
        if (a.controller !== 'ambient' || !isAlive(a) || creature(a.creature).ground) continue;
        const floor = sampleHeight(a.pos.x, a.pos.z);
        if (SURFACE_Y - floor < 14) continue;      // no room to be up in: says nothing either way
        const up = a.pos.y - floor;
        const keep = keepClear(lengthOf(a));
        if (keep > 0) { seen++; if (up < keep * 0.6) low++; } else { smallSeen++; if (up < 4) smallLow++; }
      }
    }
  }
  check('a grown animal keeps water under it', seen > 60 && low / seen < 0.3,
    `${((low / Math.max(seen, 1)) * 100).toFixed(0)}% of ${seen} sightings were down on the floor`);
  check('...where the small ones are all over the bottom', smallLow / Math.max(smallSeen, 1) > 0.15,
    `${((smallLow / Math.max(smallSeen, 1)) * 100).toFixed(0)}% of ${smallSeen} small sightings within 4 units of the sand`);
}

// --- a nursery is safe because nothing in it starts anything, not because nothing big fits ---
{
  const at = nurseryAt(0);
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; p.spawnProtect = 1e9;
  p.pos = { x: at.x + 200, y: p.pos.y, z: at.z };            // out of the way of the observation
  for (const a of [...g.actors]) if (a.controller !== 'player') g.remove(a);
  const y = sampleHeight(at.x, at.z) + 6;
  const hunter = g.spawn('anomalocaris', 'ambient', { x: at.x, y, z: at.z }, 2.2);
  hunter.spawnProtect = 1e9; hunter.brain = makeBrain('needs', { ...hunter.pos }, g.rng, { hunger: 500 });
  const small = g.spawn('waptia', 'ambient', { x: at.x + 4, y, z: at.z + 2 }, 0.4);
  small.spawnProtect = 1e9; small.brain = makeBrain('needs', { ...small.pos }, g.rng, {});
  const held = { ...small.pos };   // it stays in the nursery: the question is about the ring, not about it
  check('a nursery holds animals of any size', nurseryFactor(hunter.pos.x, hunter.pos.z) > 0.35 && lengthOf(hunter) > 6,
    `${lengthOf(hunter).toFixed(1)} m predator inside one`);
  const goals = new Set<string>();
  let onSmall = false;
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 30 && isAlive(small); i++) {
    small.pos = { ...held }; small.vel = { x: 0, y: 0, z: 0 };
    g.step(DT, m); g.events.length = 0; goals.add(hunter.brain!.goal);
    if (hunter.brain!.target === small.id && (hunter.brain!.goal === 'hunt' || hunter.brain!.goal === 'fight')) onSmall = true;
  }
  // Other animals wander into the area over half a minute and it may well hunt one of those: what
  // it must never do is start on the hatchling standing in the ring beside it.
  check('...and the big one never starts on the small one there', !onSmall,
    `goals ${[...goals].join(',')}`);
  check('...so the small one lives', isAlive(small), `hp ${(small.hp / small.hpMax).toFixed(2)}`);
}

// --- a school answers an attacker its own size: the bold fight, the timid run, the social mob ---
{
  const { socialSchool, fierceSpecies, makeBrain: brain, boldness } = await import('../src/sim/ai');
  const { applyHit } = await import('../src/sim/combat');
  /**
   * A school of `id` round a player of the same length, the player biting one of them. The school's
   * tempers are set rather than rolled, because what is under test is what each temper does.
   */
  const school = (id: CreatureId, bittenTemper: number, schoolTemper: number, seed = 21, ratio = 1) => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], seed);
    const p = g.players[0];
    for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
    p.spawnProtect = 0; p.hp = p.hpMax;
    p.pos = { x: OPEN.x, y: sampleHeight(OPEN.x, OPEN.z) + 9, z: OPEN.z }; p.vel = { x: 0, y: 0, z: 0 };
    const s = lengthOf(p) / ratio / creature(id).adultLength;   // the attacker is `ratio` times the fish
    const home = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 1.2 };
    const fish = [0, 1, 2, 3, 4, 5].map((k) => {
      const f = g.spawn(id, 'swarm', { x: home.x + (k % 3 - 1) * lengthOf(p) * 0.9, y: home.y, z: home.z + Math.floor(k / 3) * lengthOf(p) * 0.9 }, s);
      f.brain = brain('swarm', home, g.rng, { schoolId: 900, aggression: k === 0 ? bittenTemper : schoolTemper });
      return f;
    });
    const [bitten, ...mates] = fish;
    applyHit(g.hitCtx, p, bitten, { ...creature('anomalocaris').light, damage: 1, knockback: 0 }, 0);
    const before = mates.map((m) => dist(m.pos, p.pos));
    const m = new Map([[0, emptyInput() as InputFrame]]);
    for (let i = 0; i < 60; i++) { g.step(DT, m); g.events.length = 0; }
    const fighting = (f: typeof bitten) => f.brain?.kind === 'needs' && f.brain.target === p.id && (f.brain.goal === 'fight' || f.brain.goal === 'defend');
    const fled = mates.filter((f, i) => !fighting(f) && dist(f.pos, p.pos) > before[i] + 0.5).length;
    return { bitten, mates, fighting, fled, p, alive: isAlive(bitten) };
  };
  const predator: CreatureId = 'canadia', grazer: CreatureId = 'marrella';
  check('a predator school is social, a deposit feeder\'s is not', socialSchool({ creature: predator } as never) && !socialSchool({ creature: grazer } as never));
  check('something your size or smaller is fought more readily than something bigger',
    boldness(1, true, true, true) < boldness(1.5, true, true, true) && boldness(0.8, false, false, true) < 1);
  check('...and something bigger is fought only by a fierce species', boldness(1.5, true, false, true) === Infinity && boldness(1.5, true, true, true) < 1);
  check('...and nothing faces twice its length', boldness(2, true, true, true) === Infinity);
  check('Anomalocaris is fierce and Canadia is not', fierceSpecies({ creature: 'anomalocaris' } as never) && !fierceSpecies({ creature: 'canadia' } as never));

  const bold = school(predator, 0.95, 0.95);
  check('a bitten fish survives one bite to answer it', bold.alive);
  check('a bold fish bitten by something its size breaks ranks and fights', bold.fighting(bold.bitten), `goal ${bold.bitten.brain?.goal}`);
  const mob = bold.mates.filter(bold.fighting).length;
  check('...and a social school mobs the biter', mob >= 3, `${mob} of ${bold.mates.length} joined`);

  const timid = school(predator, 0.05, 0.05);
  check('a timid fish runs instead', !timid.fighting(timid.bitten) && dist(timid.bitten.pos, timid.p.pos) > lengthOf(timid.p), `${dist(timid.bitten.pos, timid.p.pos).toFixed(1)} away`);

  const loners = school(grazer, 0.95, 0.95);
  const joined = loners.mates.filter(loners.fighting).length;
  check('an unsocial school does not mob, however bold its members', joined === 0, `${joined} joined`);
  check('...it scatters from the biter instead', loners.fled >= 3, `${loners.fled} of ${loners.mates.length} fled`);

  // Something half as big again as the school: an ordinary species runs, bold or not; a fierce one
  // stands, and its bold members mob.
  const outsized = school(predator, 0.95, 0.95, 21, 1.5);
  check('an ordinary school runs from something bigger, however bold', !outsized.fighting(outsized.bitten) && outsized.mates.filter(outsized.fighting).length === 0,
    `${outsized.mates.filter(outsized.fighting).length} fought`);
  const fierce = school('isoxys', 0.95, 0.95, 21, 1.5);
  check('a fierce school turns on something bigger', fierce.fighting(fierce.bitten) && fierce.mates.filter(fierce.fighting).length >= 3,
    `bitten ${fierce.bitten.brain?.goal}, ${fierce.mates.filter(fierce.fighting).length} of ${fierce.mates.length} joined`);

}

// --- the sea does not fill a player's water with shoals of their own kind ---
{
  for (const id of ['waptia', 'marrella', 'pikaia'] as CreatureId[]) {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 12);
    g.skipHatch();
    const m = new Map([[0, emptyInput() as InputFrame]]);
    for (let i = 0; i < 60 * 20; i++) { g.step(DT, m); g.events.length = 0; }
    const own = g.actors.filter((a) => a.controller === 'swarm' && a.creature === id).length;
    check(`no school of ${id} in a sea a ${id} is playing in`, own === 0, `${own} of ${g.actors.filter((a) => a.controller === 'swarm').length} school fish`);
  }
}
finish('all reaction tests passed');
