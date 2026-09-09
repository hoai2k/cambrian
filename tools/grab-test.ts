/**
 * Taking hold. A grasping animal's held attack closes on what it lands instead of striking
 * through: prey is held and swallowed when the button comes up, a peer is crushed and thrown, and
 * anything bigger than a rival is *ridden* — grabbed anywhere but the head end and carried along
 * until it shakes you off. Riding does no damage by itself; biting while you cling does.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type Actor, type InputFrame } from '../src/sim/types';
import { bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { applyHit, endRide, takeRide, RIDE_MAX, type HitContext } from '../src/sim/combat';
import { creature, CREATURES } from '../src/sim/creatures';
import { heading } from '../src/shared/math';
import fs from 'node:fs';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
const ctxFor = (g: Game): HitContext => ({ events: g.events, byId: (id: number) => g.byId(id), time: 0, rng: g.rng });
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

/** A player of `id` at adult scale, with a body of `scale` beside it, and nothing else in reach. */
function pair(id: 'anomalocaris' | 'hallucigenia' | 'isoxys', otherScale: number, otherId = 'anomalocaris') {
  const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.spawnProtect = 1e6; p.state = 'free';
  // Clear the reef out of the way so only the pair matters.
  for (const a of g.actors) if (a !== p) a.pos = { x: a.pos.x + 2000, y: a.pos.y, z: a.pos.z };
  const o = g.spawn(otherId as never, 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) }, otherScale);
  o.spawnProtect = 0; o.brain = undefined;
  return { g, p, o, ctx: ctxFor(g) };
}
/** Put the rider behind the host, facing the same way. */
function behind(p: Actor, o: Actor) {
  const h = heading(o.yaw);
  p.pos = { x: o.pos.x - h.x * lengthOf(o) * 0.4, y: o.pos.y, z: o.pos.z - h.z * lengthOf(o) * 0.4 };
  p.prevT = { ...p.prevT, x: p.pos.x, y: p.pos.y, z: p.pos.z };
}
function inFront(p: Actor, o: Actor) {
  const h = heading(o.yaw);
  p.pos = { x: o.pos.x + h.x * lengthOf(o) * 0.6, y: o.pos.y, z: o.pos.z + h.z * lengthOf(o) * 0.6 };
  p.prevT = { ...p.prevT, x: p.pos.x, y: p.pos.y, z: p.pos.z };
}

// --- every animal the design calls a grasper is one ---
{
  const want = ['anomalocaris', 'opabinia', 'hallucigenia', 'nectocaris', 'ottoia', 'cambroraster', 'leanchoilia', 'isoxys', 'tamisiocaris'];
  const missing = want.filter((id) => !creature(id as never).grasp);
  check('the Cambrian graspers can grasp', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : want.join(', '));
  const graspers = CREATURES.filter((c) => c.grasp).map((c) => c.id);
  check('...and nothing else claims to', graspers.every((id) => want.includes(id as string)), graspers.join(', '));
}

// --- either attack button arms the grip, and only for an animal that has one ---
{
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 4);
  const p = g.players[0]; p.spawnProtect = 1e6;
  const step = (f: Partial<InputFrame>) => { g.step(1 / 60, new Map([[0, { ...emptyInput(), ...f }]])); g.events.length = 0; return p.graspHold; };
  check('the ability button arms the grip as well as the heavy', step({ ability: true }) && step({ heavy: true }), 'Y and RT both');
  check('...and letting both go disarms it', !step({}), `${p.graspHold}`);
  const w = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  const q = w.players[0]; q.spawnProtect = 1e6;
  w.step(1 / 60, new Map([[0, { ...emptyInput(), heavy: true, ability: true }]])); w.events.length = 0;
  check('an animal with no grip never arms one', !q.graspHold, `${q.graspHold}`);
}

// --- a held attack takes hold of prey, and letting go is a mouthful ---
{
  const { g, p, o, ctx } = pair('isoxys', 0.3);
  p.graspHold = true;
  const def = creature(p.creature);
  check('prey is in the mouthful bands', bandOf(p, o) === 'snack' || bandOf(p, o) === 'prey', `${bandOf(p, o)} (${lengthOf(o).toFixed(2)} against ${lengthOf(p).toFixed(2)})`);
  applyHit(ctx, p, o, def.light, 0);
  check('a held light attack takes hold rather than striking through', p.state === 'grabbing' && o.state === 'grabbed', `${p.state} / ${o.state}`);
  // Held: the grip does not time out while the button is down, and holding is not crushing.
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  p.prev = { ...p.prev, heavy: true };                   // already holding, so this is not a fresh press
  const preyHp = o.hp;
  for (let i = 0; i < 60 * 4; i++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; }
  check('...and holds for as long as the button is down', p.state === 'grabbing' && o.state === 'grabbed' && isAlive(o), `after 4 s: ${p.state} / ${o.state}`);
  check('...holding it, not crushing it', o.hp === preyHp, `${o.hp.toFixed(0)}/${o.hpMax}`);
  // Released: eaten.
  run(g, emptyInput(), 30);
  check('...then eaten when it comes up', !isAlive(o) || o.state === 'swallowed' || o.state === 'dead', `${o.state}`);
  check('...and the grip is let go with it', p.grabbing === -1 && p.state !== 'grabbing', `${p.state}`);
}

// --- a creature that cannot grasp still just hits ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.spawnProtect = 1e6;
  const o = g.spawn('marrella', 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + 2 }, 0.3);
  p.graspHold = true;                                    // the sim would never set this for it
  applyHit(ctxFor(g), p, o, creature(p.creature).light, 0);
  check('a creature with no grip cannot take hold', p.state !== 'grabbing' && o.state !== 'grabbed', `${p.state} / ${o.state}`);
}

// --- something bigger is ridden, and only away from its head ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 3.2);
  check('a body this size is over the rival band', bandOf(p, o) === 'threat' || bandOf(p, o) === 'giant', `${bandOf(p, o)} (${lengthOf(o).toFixed(1)} against ${lengthOf(p).toFixed(1)})`);
  inFront(p, o);
  check('there is no hold at the head end', !takeRide(ctx, p, o) && p.rideHost === -1, 'the jaws are not a handhold');
  behind(p, o);
  check('...but it can be ridden from anywhere else', takeRide(ctx, p, o) && p.rideHost === o.id && o.riddenBy === p.id, `off=(${p.rideOff.x.toFixed(2)},${p.rideOff.y.toFixed(2)},${p.rideOff.z.toFixed(2)})`);
  check('...and the grip is behind the mouth', p.rideOff.z < 0.3, `forward offset ${p.rideOff.z.toFixed(2)} body lengths`);
  // The host tows the rider: drive the host forward by hand and the rider comes with it.
  const hp0 = { ...o.pos };
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  const hostHp = o.hp;
  p.prev = { ...p.prev, heavy: true };                   // already holding: the ride is the test, not a swing
  for (let i = 0; i < 60 * 2; i++) {
    p.graspHold = true;
    o.vel = { x: 0, y: 0, z: -6 }; o.pos.z -= 6 / 60;
    g.step(1 / 60, held); g.events.length = 0;
  }
  const travelled = hp0.z - o.pos.z;
  check('the host tows its rider along', p.rideHost === o.id && Math.abs((hp0.z - p.pos.z) - travelled) < lengthOf(o), `host went ${travelled.toFixed(0)}, rider ${(hp0.z - p.pos.z).toFixed(0)}`);
  check('...and the ride itself does it no harm', o.hp === hostHp, `${o.hp}/${o.hpMax}`);
  // Biting while clinging is a separate decision, and it lands.
  applyHit(ctxFor(g), p, o, creature(p.creature).light, 0);
  check('biting the thing you are holding on to hurts it', o.hp < hostHp, `${o.hp.toFixed(0)}/${o.hpMax}`);
  check('...without letting go', p.rideHost === o.id, `still on after the bite`);
  // Letting go of the button ends it, and lets go of nothing else.
  run(g, emptyInput(), 60);
  check('letting go of the button ends the ride', p.rideHost === -1 && o.riddenBy === -1, `${p.rideHost} / ${o.riddenBy}`);
}

// --- the host's own answer: throw yourself sideways ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 3.2);
  behind(p, o);
  takeRide(ctx, p, o);
  o.state = 'dodge'; o.stateT = 0; o.stateDur = 0.4;
  p.graspHold = true;
  run(g, { ...emptyInput(), heavy: true }, 2);
  check('a dash shakes the rider off', p.rideHost === -1 && o.riddenBy === -1, `rider state ${p.state}`);
  check('...and it comes off badly', p.state === 'stagger', `${p.state}`);
}

// --- a ride cannot outlast its own grip ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 3.2);
  behind(p, o);
  takeRide(ctx, p, o);
  p.stamina = p.staminaMax;
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  p.prev = { ...p.prev, heavy: true };
  let longest = 0, steps = 0;
  for (; steps < 60 * 20 && p.rideHost >= 0; steps++) { p.graspHold = true; longest = Math.max(longest, p.rideT); g.step(1 / 60, held); g.events.length = 0; }
  check('the grip runs out on its own', p.rideHost === -1 && longest > 1 && longest <= RIDE_MAX + 0.1, `held ${longest.toFixed(1)} s of ${RIDE_MAX} before it gave`);
}

// --- one rider at a time, and no chains ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 3.2);
  behind(p, o);
  takeRide(ctx, p, o);
  const other = g.spawn('hallucigenia', 'bot', { x: o.pos.x, y: o.pos.y, z: o.pos.z - 1 }, 1);
  check('a host carries one rider', !takeRide(ctx, other, o) && other.rideHost === -1, 'the second grip finds no room');
  const wild = g.spawn('hallucigenia', 'ambient', { x: o.pos.x, y: o.pos.y, z: o.pos.z - 1 }, 1);
  const free = g.spawn('anomalocaris', 'ambient', { x: o.pos.x + 40, y: o.pos.y, z: o.pos.z }, 3.2);
  behind(wild, free);
  check('the reef itself does not hold on', !takeRide(ctx, wild, free) && wild.rideHost === -1, 'a wild predator has no use for a ride');
  check('...and a rider is not itself something to ride', !takeRide(ctx, other, p) && other.rideHost === -1, 'no chains');
  endRide(p, o);
  check('let go by hand and both sides are clear', p.rideHost === -1 && o.riddenBy === -1, '');
}

// --- the clips the grip needs are either delivered or queued, and the queue says so ---
{
  const queue = JSON.parse(fs.readFileSync('tools/attack-feeding-refinements.json', 'utf8')) as { id: string; reviewClips: string[]; grip?: string }[];
  const clipsOf = (id: string) => {
    const path = ['public/assets/creatures', 'public/assets/devonian/creatures'].map((d) => `${d}/${id}.glb`).find((f) => fs.existsSync(f));
    if (!path) return undefined;
    const buf = fs.readFileSync(path);
    const j = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as { animations?: { name: string }[] };
    return (j.animations ?? []).map((a) => a.name);
  };
  const graspers = [...CREATURES].filter((c) => c.grasp);
  const gaps = graspers.filter((c) => {
    const clips = clipsOf(c.id);
    if (!clips) return false;                                   // no model of its own: it borrows a body
    if (clips.includes('Grab')) return false;
    const q = queue.find((e) => e.id === c.id);
    return !(q && q.reviewClips.includes('Grab') && !!q.grip);
  });
  check('every grasper either has a grab clip or is queued for one, with its brief', gaps.length === 0,
    gaps.length ? `unaccounted: ${gaps.map((c) => c.id).join(', ')}` : `${graspers.length} graspers accounted for`);
  const dash = graspers.filter((c) => clipsOf(c.id)?.includes('Dash')).length;
  const queuedDash = queue.filter((e) => e.reviewClips.includes('Dash')).length;
  check('the dash clip is queued for the models that lack it', dash > 0 || queuedDash >= 20, `${dash} delivered, ${queuedDash} queued`);
}

console.log(failed ? `FAILED (${failed})` : 'PASS: grasp roster, held grabs, prey swallowed on release, riding, biting while ridden, shake-off, grip limits');
process.exit(failed ? 1 : 0);
