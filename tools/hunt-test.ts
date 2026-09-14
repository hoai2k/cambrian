import { Game } from '../src/sim/game';
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

console.log(failed ? `\n${failed} FAILED` : '\nall hunt tests passed'); process.exit(failed ? 1 : 0);
