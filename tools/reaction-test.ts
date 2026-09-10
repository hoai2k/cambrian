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
import { nurseryAt, nurseryFactor, sampleHeight } from '../src/sim/world';
import { creature } from '../src/sim/creatures';
import type { CreatureId } from '../src/sim/creatures';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };
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
    f.brain = makeBrain('swarm', { ...f.pos }, g.rng, { schoolId: 77 });
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
  check('a school fish bitten by its own size scatters', gapAfter > gapBefore + 1.5,
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
  for (let i = 0; i < 60 * 120; i++) {
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
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 3);
  const m = new Map([[0, emptyInput()]]);
  let bigLow = 0, bigSeen = 0, smallLow = 0, smallSeen = 0;
  for (let i = 0; i < 60 * 150; i++) {
    g.step(DT, m); g.events.length = 0;
    if (i % 30) continue;
    for (const a of g.actors) {
      if (a.controller !== 'ambient' || !isAlive(a) || creature(a.creature).ground) continue;
      const up = a.pos.y - sampleHeight(a.pos.x, a.pos.z);
      if (lengthOf(a) > 4) { bigSeen++; if (up < 3) bigLow++; } else { smallSeen++; if (up < 3) smallLow++; }
    }
  }
  check('the big swimmers are up in the water', bigSeen > 40 && bigLow / bigSeen < 0.3,
    `${((bigLow / Math.max(bigSeen, 1)) * 100).toFixed(0)}% of ${bigSeen} sightings on the bottom`);
  check('...where the small ones are all over it', smallLow / smallSeen > bigLow / bigSeen,
    `${((smallLow / Math.max(smallSeen, 1)) * 100).toFixed(0)}% of ${smallSeen} small sightings on the bottom`);
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
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 30 && isAlive(small); i++) {
    small.pos = { ...held }; small.vel = { x: 0, y: 0, z: 0 };
    g.step(DT, m); g.events.length = 0; goals.add(hunter.brain!.goal);
  }
  check('...and the big one never starts on the small one there', !goals.has('hunt') && !goals.has('fight'),
    `goals ${[...goals].join(',')}`);
  check('...so the small one lives', isAlive(small), `hp ${(small.hp / small.hpMax).toFixed(2)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall reaction tests passed');
process.exit(failed ? 1 : 0);
