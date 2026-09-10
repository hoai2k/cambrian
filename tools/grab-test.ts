/**
 * Taking hold. A grasping animal closes its grip on what is in reach while the button is down —
 * a grip, not a blow, so nothing it takes hold of is hurt by the taking. Prey is held and
 * swallowed when the button comes up, a peer is crushed and thrown, and anything bigger than a
 * rival is *ridden*: grabbed anywhere but the head end and carried along until it shakes you off.
 * Riding does no damage by itself; biting while you cling does.
 *
 * A tap is still an attack. The grip button (RT, or the ability) skips the wait against a body too
 * big to be a mouthful and fires no strike when it does, because getting hold of something huge
 * without bothering it is the whole point of riding; the bite (Y) always bites and takes hold only
 * on a real hold.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type Actor, type InputFrame } from '../src/sim/types';
import { bandOf, bodyRadius, isAlive, lengthOf } from '../src/sim/actors';
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
  const step = (f: Partial<InputFrame>) => { g.step(1 / 60, new Map([[0, { ...emptyInput(), ...f }]])); g.events.length = 0; return p; };
  check('the grip button arms the grip, and the ability with it', step({ heavy: true }).graspHold && step({ ability: true }).graspHold, 'RT and the ability');
  check('...but the bite keeps its bite', !step({ light: true }).graspHold, `graspHold=${p.graspHold}`);
  check('...while still closing a grip if it is held', step({ light: true }).graspT > 0, `graspT=${p.graspT.toFixed(2)}`);
  check('...and letting them all go disarms it', !step({}).graspHold && p.graspT === 0, `${p.graspHold} / ${p.graspT}`);
  const w = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  const q = w.players[0]; q.spawnProtect = 1e6;
  w.step(1 / 60, new Map([[0, { ...emptyInput(), heavy: true, ability: true }]])); w.events.length = 0;
  check('an animal with no grip never arms one', !q.graspHold && q.graspT === 0, `${q.graspHold} / ${q.graspT}`);
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

// --- from the controls: hold the button, swim up to something, and you have hold of it ---
// The grip used to be a rider on damage — it closed only where an attack had already landed — so
// riding something big could not be done without first biting it, and a held button read as an
// attack that sometimes stuck. None of that was visible to the unit tests below, which call
// takeRide by hand; this drives the buttons.
{
  /** Hold `f` and swim at a body `scale` times your own for two seconds. */
  const approach = (f: Partial<InputFrame>, scale: number, seconds = 2) => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.pos = { x: 40, y: 8, z: -40 }; p.yaw = Math.PI; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('anomalocaris', scale > 1.2 ? 'giant' : 'ambient', { x: 40, y: 8, z: -40 - lengthOf(p) * 1.2 }, scale);
    o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI;
    g.hash.rebuild(g.actors);
    const hp0 = o.hp;
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI, ...f } as InputFrame]]);
    for (let i = 0; i < 60 * seconds; i++) {
      o.pos = { x: 40, y: 8, z: p.pos.z - lengthOf(p) * 0.8 }; o.vel = { x: 0, y: 0, z: 0 };
      g.step(1 / 60, m); g.events.length = 0;
    }
    return { g, p, o, hurt: hp0 - o.hp, band: bandOf(p, o) };
  };
  for (const [name, f] of [['the grip button', { heavy: true }], ['the ability', { ability: true }]] as [string, Partial<InputFrame>][]) {
    const r = approach(f, 3.5);
    check(`holding ${name} at a giant takes hold of it`, r.p.rideHost === r.o.id, `band ${r.band}, rideHost ${r.p.rideHost}`);
    check(`...without hurting it`, r.hurt === 0, `${r.hurt.toFixed(0)} damage done getting hold`);
  }
  const threat = approach({ heavy: true }, 1.8);
  check('a body over the rival band is ridden the same way', threat.p.rideHost === threat.o.id && threat.hurt === 0, `band ${threat.band}, ${threat.hurt.toFixed(0)} damage`);
  // A mouthful is held rather than ridden, and holding it does it no harm either. Half your length
  // is squarely in the prey band: 0.7 is the rival boundary, and a rival is thrown, not eaten.
  const mouthful = approach({ heavy: true }, 0.5);
  check('holding it at a mouthful takes hold instead', mouthful.p.state === 'grabbing' && mouthful.o.state === 'grabbed', `${mouthful.p.state} / ${mouthful.o.state}`);
  check('...and holding is not hurting', mouthful.hurt === 0, `${mouthful.hurt.toFixed(0)} damage while held`);
  // Let the button go and the mouthful is the meal.
  {
    const { g, p, o } = mouthful;
    const up = new Map([[0, { ...emptyInput(), camYaw: Math.PI } as InputFrame]]);
    for (let i = 0; i < 180; i++) { g.step(1 / 60, up); g.events.length = 0; }
    check('...eaten when the button comes up', !isAlive(o) && p.eats > 0, `${o.state}, ${p.eats} eaten`);
  }
  // A tap is still an attack: nothing latches on from one.
  const tap = (() => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.pos = { x: 40, y: 8, z: -40 }; p.yaw = Math.PI; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('waptia', 'ambient', { x: 40, y: 8, z: -40 - lengthOf(p) * 0.5 }, 0.8);
    o.brain = undefined; o.spawnProtect = 0; o.vel = { x: 0, y: 0, z: 0 };
    g.hash.rebuild(g.actors);
    for (let i = 0; i < 120; i++) {
      o.pos = { x: 40, y: 8, z: p.pos.z - lengthOf(p) * 0.5 }; o.vel = { x: 0, y: 0, z: 0 };
      g.step(1 / 60, new Map([[0, { ...emptyInput(), camYaw: Math.PI, light: i % 20 < 2 } as InputFrame]])); g.events.length = 0;
    }
    return { p, o };
  })();
  check('a tapped bite is still a bite, not a grab', tap.p.grabbing === -1 && tap.p.rideHost === -1, `state ${tap.p.state}`);
}

// --- a strike made with the grip down arrives as a grip, and the release settles what it was ---
// The lunge and the strike are unchanged; what they do on arrival is not. Nothing is decided on
// impact, so a pounce no longer kills what you were reaching for before the grip could shut, and
// nothing big can be taken hold of only by hurting it first.
{
  /** Lunge at a body `scale` times your own with the grip button down, hold `seconds`, then let go. */
  const pounceAt = (scale: number, seconds: number) => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.pos = { x: 40, y: 8, z: -40 }; p.yaw = Math.PI; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('anomalocaris', scale > 1.2 ? 'giant' : 'ambient', { x: 40, y: 8, z: -40 - lengthOf(p) * 2.2 }, scale);
    o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI; o.vel = { x: 0, y: 0, z: 0 };
    g.hash.rebuild(g.actors);
    const hp0 = o.hp;
    const down = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI, heavy: true } as InputFrame]]);
    for (let i = 0; i < 60 * seconds; i++) { g.step(1 / 60, down); g.events.length = 0; }
    const held = p.grabbing >= 0 || p.rideHost >= 0;
    const duringHold = hp0 - o.hp;
    const up = new Map([[0, { ...emptyInput(), camYaw: Math.PI } as InputFrame]]);
    for (let i = 0; i < 240; i++) { g.step(1 / 60, up); g.events.length = 0; }
    return { p, o, held, duringHold, onRelease: hp0 - o.hp - duringHold, band: bandOf(p, o) };
  };
  const prey = pounceAt(0.5, 1);
  check('a lunge with the grip down ends up holding the prey', prey.held, `band ${prey.band}`);
  check('...and holding it does it no harm', prey.duringHold === 0, `${prey.duringHold.toFixed(0)} damage while held`);
  check('...and the meal is what the release is for', !isAlive(prey.o) && prey.p.eats > 0, `${prey.o.state}, ${prey.p.eats} eaten`);
  const carried = pounceAt(0.5, 5);
  check('...however long it is carried first', !isAlive(carried.o) && carried.p.eats > 0 && carried.duringHold === 0, `5 s in the mouth, ${carried.duringHold.toFixed(0)} damage`);

  const quick = pounceAt(3.5, 0.5);
  check('the same lunge at a giant takes hold of it', quick.held && quick.duringHold === 0, `band ${quick.band}, ${quick.duringHold.toFixed(0)} damage while held`);
  check('...and letting go quickly is the blow that never landed', quick.onRelease > 0, `${quick.onRelease.toFixed(0)} damage on the release`);
  const ridden = pounceAt(3.5, 5);
  check('...while holding on is a ride it is never troubled by', ridden.duringHold === 0 && ridden.onRelease <= 0, `${ridden.duringHold.toFixed(0)} while held, ${Math.max(0, ridden.onRelease).toFixed(0)} on the release`);
}

// --- what is held stays joined to what is holding it ---
{
  const held = (() => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.pos = { x: 40, y: 8, z: -40 }; p.yaw = Math.PI; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('waptia', 'ambient', { x: 40, y: 8, z: -40 - lengthOf(p) * 0.5 }, 0.8);
    o.brain = undefined; o.spawnProtect = 0;
    g.hash.rebuild(g.actors);
    // Take hold, then swim about with it: turning is what a loose grip shows up under.
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI, heavy: true } as InputFrame]]);
    for (let i = 0; i < 40; i++) { g.step(1 / 60, m); g.events.length = 0; }
    let worst = 0;
    for (let i = 0; i < 180; i++) {
      g.step(1 / 60, new Map([[0, { ...emptyInput(), my: 1, mx: i < 90 ? 1 : -1, camYaw: Math.PI, heavy: true } as InputFrame]]));
      g.events.length = 0;
      if (o.state !== 'grabbed') break;
      // The grabber's grip point and the point on the victim the grip has: one place, or it is
      // not a hold. Measured against the victim's own size so it means the same for any body.
      const gh = heading(p.yaw), gl = lengthOf(p);
      const grip = { x: p.pos.x + gh.x * gl * 0.42, y: p.pos.y - Math.sin(p.pitch) * gl * 0.42, z: p.pos.z + gh.z * gl * 0.42 };
      const vh = heading(o.yaw), r = bodyRadius(o), off = o.grabOff;
      const hold = {
        x: o.pos.x + (-vh.z * off.x + vh.x * off.z) * r,
        y: o.pos.y + off.y * r,
        z: o.pos.z + (vh.z * 0 + vh.x * off.x + vh.z * off.z) * r,
      };
      worst = Math.max(worst, Math.hypot(grip.x - hold.x, grip.y - hold.y, grip.z - hold.z) / lengthOf(o));
    }
    return { p, o, worst };
  })();
  check('the grip and the hold point stay in one place', held.o.state === 'grabbed' && held.worst < 0.15,
    `worst gap ${(held.worst * 100).toFixed(0)}% of the held body's length`);
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
