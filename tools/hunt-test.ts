import { Game } from '../src/sim/game';
import { kill, startSwallow } from '../src/sim/combat';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { applyScaleStats, bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { dist } from '../src/shared/math';
import { sampleHeight } from '../src/sim/world';
/** A spot on the open shelf, well clear of the seabed whatever the terrain there does. */
const OPEN = { x: 10, y: sampleHeight(10, -100) + 8, z: -100 };
const DEEP = { x: 60, y: sampleHeight(60, -130) + 6, z: -130 };
let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(44)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

// --- LB dashes: the stick direction if there is one, the body's own axis if there is not ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const p = g.players[0]; p.pos = { ...OPEN }; p.spawnProtect = 0;
  run(g, emptyInput(), 5);
  run(g, { ...emptyInput(), dash: true, mx: 1, camYaw: 0 }, 2);
  check('LB + stick right dashes at once', p.state === 'dodge', `state=${p.state} iframes=${p.iframes.toFixed(2)}`);
  // a neutral stick has no direction to give, so the dash takes the body's own axis
  const g3 = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const r = g3.players[0]; r.pos = { ...OPEN }; r.spawnProtect = 0; r.yaw = 0;
  const from = { ...r.pos };
  run(g3, { ...emptyInput(), dash: true }, 2);
  check('LB with a neutral stick dashes along the body axis', r.state === 'dodge', `state=${r.state}`);
  run(g3, { ...emptyInput(), dash: true }, 20);
  check('...the way it was facing', r.pos.z - from.z > 1, `${(r.pos.z - from.z).toFixed(1)} units along its own +z`);
  run(g3, { ...emptyInput(), dash: true, my: 1 }, 90);
  check('...and does not dash again while still held', r.state === 'free' && r.dashUsed, `state=${r.state}`);
  const g2 = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const q = g2.players[0]; q.pos = { ...OPEN }; q.spawnProtect = 0;
  run(g2, { ...emptyInput(), my: 1 }, 60);
  const cruise = Math.hypot(q.vel.x, q.vel.z);
  run(g2, { ...emptyInput(), my: 1, burst: 1 }, 60);
  const sprint = Math.hypot(q.vel.x, q.vel.z);
  check('A held sprints (faster than cruise)', sprint > cruise * 1.3 && q.state === 'free', `cruise=${cruise.toFixed(1)} sprint=${sprint.toFixed(1)}`);
  // dash distance: must clear a body length or three quickly
  const g4 = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const w = g4.players[0]; w.pos = { ...OPEN }; w.spawnProtect = 0; run(g4, emptyInput(), 5);
  const x0 = { ...w.pos };
  run(g4, { ...emptyInput(), dash: true, mx: 1, camYaw: 0 }, 27);
  const dashed = Math.hypot(w.pos.x - x0.x, w.pos.z - x0.z) / lengthOf(w);
  check('dash covers 2.5+ body lengths in 0.45 s', dashed > 2.5, `${dashed.toFixed(2)} body lengths`);
}
// --- LT aims at prey; X pounces when in range and eats it ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.pos = { ...OPEN }; p.yaw = 0; p.spawnProtect = 0;
  const prey = g.spawn('waptia', 'ambient', { x: OPEN.x, y: OPEN.y, z: OPEN.z + 6 }, 0.3);
  prey.brain = undefined as never; (prey as any).controller = 'swarm';
  // the renderer decides what the centred crosshair is over and passes the id in aimTarget
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id }, 3);
  check('LT hold takes the crosshair target', p.lockTarget === prey.id && p.aiming, `target=${p.lockTarget} prey=${prey.id} band=${bandOf(p, prey)}`);
  check('crosshair in range at 6 units', p.aimInRange, `range=${g.pounceRange(p).toFixed(1)}`);
  const eatsBefore = p.eats;
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id, heavy: true }, 2);
  check('X while aiming starts a pounce', p.state === 'pounce', `state=${p.state}`);
  run(g, { ...emptyInput(), aim: true, aimTarget: prey.id }, 90);
  check('pounce reaches and eats the prey', p.eats > eatsBefore || !isAlive(prey), `eats ${eatsBefore}->${p.eats} preyAlive=${isAlive(prey)} d=${dist(p.pos, prey.pos).toFixed(1)}`);
}
// --- prey abundance at two very different sizes ---
for (const [creatureId, mode, scale] of [['waptia', 'rise', 0.25], ['anomalocaris', 'reef', 2.6]] as const) {
  const g = new Game(mode, [{ creature: creatureId, device: 'keyboard', ready: true }], 3);
  const p = g.players[0]; if (mode === 'reef') { p.scale = scale; p.tier = 4; } p.pos = { ...DEEP }; p.state = 'free';
  run(g, emptyInput(), 60 * 12);
  const L = lengthOf(p);
  let small = 0; for (const o of g.actors) if (o.id !== p.id && isAlive(o) && dist(o.pos, p.pos) < 45 + L * 4) { const b = bandOf(p, o); if (b === 'snack' || b === 'prey') small++; }
  check(`${creatureId} at scale ${scale} has prey nearby`, small >= 14, `${small} snack/prey within ${(45 + L * 4).toFixed(0)}u (L=${L.toFixed(1)})`);
}
// --- a giant hunts when it is hungry, and only then: a fed one lets you swim right up to it ---
{
  const { makeBrain } = await import('../src/sim/ai');
  /** A player hanging in plain sight of one giant, close enough to be seen and swimming at it. */
  const seen = (hunger: number, seconds = 12) => {
    const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 6);
    // Grown, because that is the player who goes looking for a giant to ride — and because a body
    // this size is one a giant can hardly miss: its detection saturates in a second or two, which
    // is what made "seen" a hunt on its own before.
    const p = g.players[0]; p.scale = 2.6; applyScaleStats(p, false);
    p.pos = { ...OPEN }; p.spawnProtect = 1e9; p.yaw = 0; p.hp = p.hpMax;
    for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
    const L = lengthOf(p);
    const giant = g.spawn('anomalocaris', 'giant', { x: OPEN.x, y: OPEN.y + 3, z: OPEN.z + L * 5 }, 3.2);
    const lair = { ...giant.pos };
    giant.brain = makeBrain('giant', lair, g.rng, {});
    giant.brain.hunger = hunger;
    // One waypoint it can never reach, and the body held on station: a giant that finishes its
    // route dozes for twenty-five seconds and a dozing giant is not looking at anything, which
    // would prove nothing either way. This one is awake, in place, and facing the player.
    giant.brain.patrol = [{ x: lair.x, y: lair.y, z: lair.z + 400 }];
    const goals = new Set<string>();
    for (let i = 0; i < 60 * seconds; i++) {
      giant.pos = { ...lair }; giant.yaw = Math.PI;     // facing back down its route, at the player
      // swimming straight at it, in the open, at full tilt: the loudest a body can be
      g.step(1 / 60, new Map([[0, { ...emptyInput(), my: 1, burst: 1, camYaw: 0 }]])); g.events.length = 0;
      p.spawnProtect = 1e9; goals.add(giant.brain!.goal);
    }
    return { goals, hunted: p.hunted, giant };
  };
  const fed = seen(0);
  check('a fed giant never hunts what swims up to it', !fed.goals.has('hunt'), `goals ${[...fed.goals].join(',')}`);
  check('...though it does look at it', fed.goals.has('notice'), `goals ${[...fed.goals].join(',')}`);
  check('...so nothing tells the player they are hunted', fed.hunted < 0.5, `hunted ${fed.hunted.toFixed(2)}`);
  const hungry = seen(600);
  check('a hungry one comes down for it', hungry.goals.has('hunt'), `goals ${[...hungry.goals].join(',')}`);
}

// --- a mouthful is taken in the mouth, not made to vanish ---
{
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 4);
  const p = g.players[0]; p.pos = { ...OPEN }; p.yaw = 0; p.spawnProtect = 1e9;
  for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
  const L = lengthOf(p);
  // right under the mouth, small enough to go down whole
  const snack = g.spawn('waptia', 'ambient', { x: OPEN.x, y: OPEN.y, z: OPEN.z + L * 0.35 }, 0.1);
  snack.spawnProtect = 0; snack.brain = undefined;
  const there = g.actors.includes(snack);
  run(g, { ...emptyInput(), my: 1, camYaw: 0 }, 30);
  check('swimming into an animal does not make it disappear', there && g.actors.includes(snack) && isAlive(snack),
    `alive=${isAlive(snack)} inWorld=${g.actors.includes(snack)} gap=${dist(p.pos, snack.pos).toFixed(2)}`);
  // now take it: the bite that lands carries it into the mouth and eats it there
  snack.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.35 };
  run(g, { ...emptyInput(), light: true, camYaw: 0 }, 6);
  check('a bite that lands puts it in the mouth', snack.state === 'swallowed' && snack.swallowedBy === p.id,
    `state=${snack.state} by=${snack.swallowedBy}`);
  const eats = p.eats;
  run(g, emptyInput(), 150);
  check('...and it is eaten there, a moment later', p.eats > eats && !g.actors.includes(snack),
    `eats ${eats}->${p.eats}`);
}

// --- the warning is about intent, not about size ---
{
  const { comingFor, applyScaleStats: scaleStats } = await import('../src/sim/actors');
  const { makeBrain } = await import('../src/sim/ai');
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; p.scale = 1; scaleStats(p, false); p.pos = { ...OPEN }; p.spawnProtect = 1e9;
  for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
  const big = g.spawn('anomalocaris', 'giant', { x: OPEN.x, y: OPEN.y + 2, z: OPEN.z + 14 }, 3.2);
  big.brain = makeBrain('giant', { ...big.pos }, g.rng, {});
  run(g, emptyInput(), 2);
  big.brain.goal = 'patrol'; big.brain.target = -1;
  check('a giant going about its business is not a warning', !comingFor(big, p) && bandOf(p, big) === 'giant',
    `band ${bandOf(p, big)} goal ${big.brain.goal}`);
  const quiet = g.radarFor(0, 400).find((b) => b.id === big.id);
  check('...and its radar contact is not marked hunting', !!quiet && !quiet.hunting, `blip ${quiet ? quiet.kind : 'none'}`);
  // Set and read without stepping: a giant's own brain would think again in between, and what is
  // under test is what the marks make of the state, not how the state was arrived at.
  big.brain.goal = 'hunt'; big.brain.target = p.id;
  check('one that has picked you out is', comingFor(big, p), `goal ${big.brain.goal} target ${big.brain.target}`);
  const hot = g.radarFor(0, 400).find((b) => b.id === big.id);
  check('...and so is its contact', !!hot && hot.hunting, `hunting=${hot?.hunting}`);
  // Something its own size that has squared up to it counts too: aggression is not about being big.
  const rival = g.spawn('opabinia', 'ambient', { x: OPEN.x + 4, y: OPEN.y, z: OPEN.z + 4 }, 1);
  rival.brain = makeBrain('needs', { ...rival.pos }, g.rng, {});
  rival.brain.goal = 'fight'; rival.brain.target = p.id;
  check('a neighbour picking a fight is a warning at any size', comingFor(rival, p) && bandOf(p, rival) === 'rival',
    `band ${bandOf(p, rival)}`);
}

// --- a giant is a giant to you whatever brain it is carrying ---
{
  const { makeBrain } = await import('../src/sim/ai');
  // The warning ramp used to be chosen by `brain.kind`, which is the *patrol* brain only the
  // handful of named giants are given. Every other big animal in the sea is an ambient spawn with
  // an ordinary `needs` brain, so a seventeen-unit ichthyosaur bearing down on a hatchling was
  // scored like a small predator: capped at forty units of range and no floor while hunting, which
  // works out at about a second of warning before a body that size arrives. What decides the ramp
  // is the band — what the animal is to the body it is chasing.
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; p.scale = 1; applyScaleStats(p, false); p.pos = { ...OPEN }; p.spawnProtect = 1e9;
  for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
  const big = g.spawn('anomalocaris', 'ambient', { x: OPEN.x, y: OPEN.y + 2, z: OPEN.z + 34 }, 3.2);
  big.brain = makeBrain('needs', { ...big.pos }, g.rng, {});
  big.brain.goal = 'hunt'; big.brain.target = p.id; big.brain.detection.set(p.id, 3);
  run(g, emptyInput(), 1);
  const far = p.hunted;
  check('a hunting giant is a warning from a long way off', bandOf(p, big) === 'giant' && far >= 0.5,
    `band ${bandOf(p, big)} hunted ${far.toFixed(2)} at ${dist(p.pos, big.pos).toFixed(0)} units`);
  // ...and it still tightens as the thing closes, which is what the eye fills with.
  big.pos = { x: OPEN.x, y: OPEN.y + 2, z: OPEN.z + 10 };
  big.brain.goal = 'hunt'; big.brain.target = p.id;
  run(g, emptyInput(), 1);
  check('...and a warning that tightens as it arrives', p.hunted > far, `${far.toFixed(2)} -> ${p.hunted.toFixed(2)}`);
  // A body its own size gets the small-predator ramp it always had: this is about giants.
  const g2 = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 5);
  const q = g2.players[0]; q.scale = 1; applyScaleStats(q, false); q.pos = { ...OPEN }; q.spawnProtect = 1e9;
  for (const o of [...g2.actors]) if (o.controller !== 'player') g2.remove(o);
  const peer = g2.spawn('opabinia', 'ambient', { x: OPEN.x, y: OPEN.y, z: OPEN.z + 34 }, 1);
  peer.brain = makeBrain('needs', { ...peer.pos }, g2.rng, {});
  peer.brain.goal = 'hunt'; peer.brain.target = q.id; peer.brain.detection.set(q.id, 3);
  run(g2, emptyInput(), 1);
  check('something your own size is not a giant warning', bandOf(q, peer) === 'rival' && q.hunted < 0.5,
    `band ${bandOf(q, peer)} hunted ${q.hunted.toFixed(2)}`);
}

// --- nothing in the sea swallows a player whole ---
{
  // Taking a mouthful on contact is the player's own act and nobody else's: wildlife eats a swarm
  // fish and a small ambient body that way, and anything steered has to be bitten for. A giant
  // swimming over a hatchling, and one biting it, must both leave a body to fight for.
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 12);
  const p = g.players[0]; g.skipHatch(); p.pos = { ...OPEN }; p.spawnProtect = 0; p.hp = p.hpMax;
  const big = g.spawn('anomalocaris', 'ambient', { x: OPEN.x, y: OPEN.y, z: OPEN.z + 1 }, 3.2);
  big.brain = undefined;
  const m = new Map([[0, { ...emptyInput() } as InputFrame]]);
  for (let i = 0; i < 120; i++) {
    big.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + 0.4 };   // mouth to nose, every frame
    big.vel = { x: 0, y: 0, z: 0 };
    g.step(1 / 60, m); g.events.length = 0;
  }
  check('a giant does not swallow a player it swims into', isAlive(p) && p.state !== 'swallowed',
    `state ${p.state} hp ${p.hp.toFixed(0)}/${p.hpMax.toFixed(0)}`);
}

// --- being eaten is the end of the chase ---
{
  // The warning used to keep the last score it had, because the scan only ever *raises* `best` and
  // nothing hunts a corpse. So the arrow, the eye and the line stayed up over a dead body, saying
  // a thing that had stopped being true at the moment it stopped mattering. The hunt is written
  // straight onto the body here rather than staged with a predator: what is under test is that a
  // body which is no longer alive reports no hunt, whatever it was reporting a moment earlier.
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; g.skipHatch(); p.spawnProtect = 0;
  const m = new Map([[0, { ...emptyInput() } as InputFrame]]);
  p.hunted = 0.9; p.hunterId = 7; p.wasHunted = true;
  kill(g.hitCtx, p);
  for (let i = 0; i < 4; i++) { g.step(1 / 60, m); g.events.length = 0; }
  check('being eaten ends the hunt', p.hunted === 0 && p.hunterId < 0 && !p.wasHunted, `${p.hunted.toFixed(2)} from ${p.hunterId}`);
  // Swallowed is the same answer before the body is even dead: it is in something's mouth.
  const g2 = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 5);
  const q = g2.players[0]; g2.skipHatch(); q.spawnProtect = 0;
  const eater = g2.spawn('anomalocaris', 'ambient', { x: q.pos.x + 2, y: q.pos.y, z: q.pos.z }, 2);
  q.hunted = 0.9; q.hunterId = 7; q.wasHunted = true;
  startSwallow(g2.hitCtx, eater, q);
  check('...and so does being swallowed', q.hunted === 0 && q.hunterId < 0, `${q.hunted.toFixed(2)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall hunt tests passed'); process.exit(failed ? 1 : 0);
