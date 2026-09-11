/**
 * Taking hold. An animal closes its grip on what is in reach while the button is down — a grip, not
 * a blow, so nothing it takes hold of is hurt by the taking, by the keeping, or by the letting go.
 * What it could swallow is held in the jaws and eaten when the button comes up; anything from its
 * own size upwards is *ridden*, grabbed anywhere but the head end and carried along until it lets
 * go or the host shakes it off. Riding costs nothing and has no clock: biting the thing you are
 * clinging to is a separate press, and that is the only thing here that does damage.
 *
 * A tap is still an attack. The grip button (RT, or the ability) skips the wait against a body too
 * big to be a mouthful and fires no strike when it does, because getting hold of something huge
 * without bothering it is the whole point of riding; the bite (Y) always bites and takes hold only
 * on a real hold.
 */
import { Game, GRASP_AT, graspPoint, gripHold, gripReach } from '../src/sim/game';
import { emptyInput, type Actor, type InputFrame } from '../src/sim/types';
import { bandOf, bodyRadius, isAlive, lengthOf, surfaceGap } from '../src/sim/actors';
import { applyHit, endRide, GRIP_MEAL, GRIP_STRIKE, takeHold, takeRide, type HitContext } from '../src/sim/combat';
import { creature, CREATURES } from '../src/sim/creatures';
import { heading } from '../src/shared/math';
import fs from 'node:fs';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
const ctxFor = (g: Game): HitContext => ({ events: g.events, byId: (id: number) => g.byId(id), time: 0, rng: g.rng });
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

/**
 * A player of `id` at adult scale, with a body beside it `times` its length, and nothing else in
 * reach. The size is asked for as a *ratio* rather than a scale because the bands these tests are
 * about are ratios: the roster's real lengths (docs/research/cambrian-sizes.md) mean a fixed scale
 * on one animal is prey beside one player and a giant beside another.
 */
function pair(id: 'anomalocaris' | 'hallucigenia' | 'isoxys', times: number, otherId = 'anomalocaris') {
  const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 9);
  const p = g.players[0]; p.spawnProtect = 1e6; p.state = 'free';
  // Clear the reef out of the way so only the pair matters.
  for (const a of g.actors) if (a !== p) a.pos = { x: a.pos.x + 2000, y: a.pos.y, z: a.pos.z };
  const otherScale = times * lengthOf(p) / creature(otherId as never).adultLength;
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
  // Everything can take hold of something; `grasp` decides how easily, not whether. An animal
  // without arms for it reaches about as far as its bite and has to work at it for longer.
  const w = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 4);
  const q = w.players[0]; q.spawnProtect = 1e6;
  w.step(1 / 60, new Map([[0, { ...emptyInput(), heavy: true, ability: true }]])); w.events.length = 0;
  check('an animal with no arms for it still arms a grip', q.graspHold && q.graspT > 0, `${q.graspHold} / ${q.graspT.toFixed(2)}`);
  check('...but reaches less far for it', gripReach(creature('waptia'), 1) < gripReach(creature('opabinia'), 1),
    `mouth ${gripReach(creature('waptia'), 1).toFixed(2)} body lengths against arms ${gripReach(creature('opabinia'), 1).toFixed(2)}`);
  check('...and has to work at it for longer', gripHold(creature('waptia')) > gripHold(creature('opabinia')),
    `${gripHold(creature('waptia')).toFixed(2)}s against ${gripHold(creature('opabinia')).toFixed(2)}s`);
}

// --- a held attack takes hold of prey, and letting go is a mouthful ---
{
  const { g, p, o, ctx } = pair('isoxys', 0.39);
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

  // Grab a giant and let go and it is the blow the grip stood in for. Hold on past GRIP_STRIKE and
  // the grip has stopped being an attack entirely: the animal carrying you never learns you are
  // there. Both windows run from *contact*, not from the press.
  const quick = pounceAt(3.5, 0.5);
  check('the same lunge at a giant takes hold of it', quick.held && quick.duringHold === 0, `band ${quick.band}, ${quick.duringHold.toFixed(0)} damage while held`);
  check('...and letting go straight away is the blow the grip stood in for', quick.onRelease > 0, `${quick.onRelease.toFixed(0)} damage on the release`);
  const ridden = pounceAt(3.5, 5);
  check('...while holding on is a ride it is never troubled by', ridden.duringHold === 0 && ridden.onRelease <= 0, `${ridden.duringHold.toFixed(0)} while held, ${Math.max(0, ridden.onRelease).toFixed(0)} on the release`);
}

// --- reach is to the animal, not to a ball drawn round its middle ---
// An adult Anomalocaris is twenty units nose to tail and four and a half across. Every reach test
// measured `bodyRadius` from its centre, so the far half of it was not there: pressed against its
// tail you were ten units from a centre whose grasp reach allowed six, and holding the button did
// nothing at all. This is the bug as reported — an Opabinia beside a giant, unable to take hold.
{
  const atGiant = (creatureId: CreatureId, angDeg: number) => {
    const g = new Game('reef', [{ creature: creatureId, device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 14, z: -70 }, 3.5);
    o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI; o.vel = { x: 0, y: 0, z: 0 };
    const ang = (angDeg * Math.PI) / 180, start = lengthOf(o) * 0.9;
    p.pos = { x: o.pos.x + Math.sin(ang) * start, y: 14, z: o.pos.z + Math.cos(ang) * start };
    const camYaw = Math.atan2(o.pos.x - p.pos.x, o.pos.z - p.pos.z);
    p.yaw = camYaw;
    g.hash.rebuild(g.actors);
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw, heavy: true } as InputFrame]]);
    for (let i = 0; i < 60 * 10; i++) {
      o.pos = { x: 40, y: 14, z: -70 }; o.vel = { x: 0, y: 0, z: 0 }; o.spawnProtect = 0;
      g.step(1 / 60, m); g.events.length = 0;
      if (p.rideHost === o.id) return true;
    }
    return false;
  };
  const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  const arms = ANGLES.filter((d) => atGiant('opabinia' as CreatureId, d));
  check('a grasper takes hold of a giant from any side of it', arms.length === ANGLES.length,
    `${arms.length}/${ANGLES.length} approaches`);
  const jaws = ANGLES.filter((d) => atGiant('waptia' as CreatureId, d));
  check('...and so does an animal with only its mouth', jaws.length === ANGLES.length,
    `${jaws.length}/${ANGLES.length} approaches`);
  // The measurement itself: a point beside the tail is against the body, however far it is from
  // the middle of it.
  const g = new Game('reef', [{ creature: 'opabinia', device: 'keyboard', ready: true }], 21);
  const giant = g.spawn('anomalocaris', 'giant', { x: 0, y: 10, z: 0 }, 3.5);
  giant.yaw = 0;                                            // faces +z, so the tail is at -z
  const gl = lengthOf(giant), r = bodyRadius(giant);
  const beside = (z: number) => surfaceGap(giant, { x: r + 0.2, y: 10, z });
  // Down the straight of the body the surface is exactly where it is drawn; round the tail the
  // capsule's own curve takes it gently away, which is the shape of the animal and not an error.
  // What matters is that neither is the several body-lengths a ball round the middle reported.
  check('the surface of a long body is where the body is', Math.abs(beside(0) - 0.2) < 0.01 && beside(-gl * 0.4) < 1,
    `beside the middle ${beside(0).toFixed(2)}, beside the tail ${beside(-gl * 0.4).toFixed(2)} (body ${gl.toFixed(1)} long)`);
  check('...where a ball round its middle put it body-lengths away',
    Math.hypot(r + 0.2, gl * 0.4) - r > beside(-gl * 0.4) * 4,
    `${(Math.hypot(r + 0.2, gl * 0.4) - r).toFixed(1)} as a ball against ${beside(-gl * 0.4).toFixed(1)} as the animal`);
  check('...and open water past the end of it is not', surfaceGap(giant, { x: 0, y: 10, z: -gl }) > gl * 0.3,
    `${surfaceGap(giant, { x: 0, y: 10, z: -gl }).toFixed(1)} clear of the tail`);
}

// --- holding the grip button swims you into what you are reaching for ---
{
  const reach = (creatureId: CreatureId, dist: number) => {
    const g = new Game('reef', [{ creature: creatureId, device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 14, z: -70 }, 3.5);
    o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI; o.vel = { x: 0, y: 0, z: 0 };
    p.pos = { x: 40, y: 14, z: -70 + dist }; p.yaw = Math.PI;
    g.hash.rebuild(g.actors);
    // The button and nothing else: no stick, no steering.
    const m = new Map([[0, { ...emptyInput(), camYaw: Math.PI, heavy: true } as InputFrame]]);
    for (let i = 0; i < 60 * 8; i++) {
      o.pos = { x: 40, y: 14, z: -70 }; o.vel = { x: 0, y: 0, z: 0 }; o.spawnProtect = 0;
      g.step(1 / 60, m); g.events.length = 0;
      if (p.rideHost === o.id) return i / 60;
    }
    return -1;
  };
  for (const c of ['opabinia', 'waptia'] as CreatureId[]) {
    const times = [14, 22, 30].map((d) => reach(c, d));
    check(`${creature(c).name} holds RT and swims to a giant until it has it`, times.every((t) => t > 0),
      times.map((t, i) => `${[14, 22, 30][i]}u ${t < 0 ? 'never' : t.toFixed(1) + 's'}`).join(' · '));
  }

  // Across open water, after something that is going somewhere. A giant is patrolling and turning
  // while you close on it, and its tail — the end you can actually hold — is another body length
  // past its middle again. The pursuit re-aims every frame and keeps its target however far the
  // swim turns out to be; it is paid for when it sets out, not by the second.
  const chase = (creatureId: CreatureId, dist: number, moving: boolean) => {
    const g = new Game('reef', [{ creature: creatureId, device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.vel = { x: 0, y: 0, z: 0 };
    const o = g.spawn('anomalocaris', 'giant', { x: 40, y: 20, z: -70 }, 3.5);
    o.brain = undefined; o.spawnProtect = 0; o.yaw = Math.PI;
    p.pos = { x: 40, y: 20, z: -70 + dist }; p.yaw = Math.PI;
    g.hash.rebuild(g.actors);
    const m = new Map([[0, { ...emptyInput(), camYaw: Math.PI, heavy: true } as InputFrame]]);
    let held = -1, stamina = 0;
    for (let i = 0; i < 60 * 14; i++) {
      if (moving) { o.yaw += 0.012; o.pos.x += Math.sin(o.yaw) * 0.09; o.pos.z += Math.cos(o.yaw) * 0.09; }
      o.spawnProtect = 0;
      g.step(1 / 60, m); g.events.length = 0;
      if (held < 0 && p.rideHost === o.id) { held = i / 60; stamina = p.stamina; }
      if (held >= 0 && p.rideHost < 0) return { held, ran: i / 60 - held, stamina, endStamina: p.stamina };
    }
    return { held, ran: held < 0 ? 0 : 14 - held, stamina, endStamina: p.stamina };
  };
  for (const c of ['opabinia', 'waptia'] as CreatureId[]) {
    const far = [20, 40, 60].map((d) => chase(c, d, false));
    check(`${creature(c).name} crosses open water to reach one`, far.every((r) => r.held > 0),
      far.map((r, i) => `${[20, 40, 60][i]}u ${r.held < 0 ? 'never' : r.held.toFixed(1) + 's'}`).join(' · '));
    const swimming = chase(c, 40, true);
    check('...and catches one that is swimming and turning', swimming.held > 0, `caught at ${swimming.held < 0 ? 'never' : swimming.held.toFixed(1) + 's'}`);
    // Holding on is free: the bar you spent getting there is not also the bar you hang on with.
    check('...and hanging on costs it nothing', swimming.held > 0 && swimming.endStamina >= swimming.stamina - 1,
      `${swimming.stamina.toFixed(0)} on grabbing, ${swimming.endStamina.toFixed(0)} on letting go`);
  }
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
      // Both points from the simulation's own definitions, so the check cannot quietly measure
      // something the game does not do. What is under test is that they stay in one place while
      // both animals swim and turn, which is the pinning, not the arithmetic.
      const gh = heading(p.yaw), gl = lengthOf(p);
      const grip = { x: p.pos.x + gh.x * gl * GRASP_AT, y: p.pos.y - Math.sin(p.pitch) * gl * GRASP_AT, z: p.pos.z + gh.z * gl * GRASP_AT };
      const g0 = graspPoint(o);
      const hold = { x: o.pos.x + g0.x, y: o.pos.y + g0.y, z: o.pos.z + g0.z };
      worst = Math.max(worst, Math.hypot(grip.x - hold.x, grip.y - hold.y, grip.z - hold.z) / lengthOf(o));
    }
    return { p, o, worst };
  })();
  check('the grip and the hold point stay in one place', held.o.state === 'grabbed' && held.worst < 0.15,
    `worst gap ${(held.worst * 100).toFixed(0)}% of the held body's length`);
}

// --- something bigger is ridden, and only away from its head ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
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
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
  behind(p, o);
  takeRide(ctx, p, o);
  o.state = 'dodge'; o.stateT = 0; o.stateDur = 0.4;
  p.graspHold = true;
  run(g, { ...emptyInput(), heavy: true }, 2);
  check('a dash shakes the rider off', p.rideHost === -1 && o.riddenBy === -1, `rider state ${p.state}`);
  check('...and it comes off badly', p.state === 'stagger', `${p.state}`);
}

// --- a ride outlasts anything that used to be counting it ---
// It ran nine seconds and then dropped you, and it drained the bar while you hung there. Both are
// gone: holding on is a thing the animal is doing, not a thing it is spending. Twenty seconds here
// is well past the old limit and past any stamina it could have had to give.
{
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
  behind(p, o);
  takeRide(ctx, p, o);
  p.stamina = 0;                                            // nothing left to spend, and none needed
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  p.prev = { ...p.prev, heavy: true };
  const hp0 = o.hp;
  for (let steps = 0; steps < 60 * 20; steps++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; }
  check('the grip has no clock of its own', p.rideHost === o.id && p.rideT > 19, `held ${p.rideT.toFixed(1)} s and still on`);
  check('...and costs no stamina to keep', p.rideHost === o.id, `stamina ${p.stamina.toFixed(0)}`);
  check('...and never hurt what it was holding', o.hp === hp0, `host hp ${o.hp.toFixed(1)} of ${hp0.toFixed(1)}`);
  // Long past the strike window, so letting go is only letting go — and the animal never knew.
  p.graspHold = false;
  for (let steps = 0; steps < 60; steps++) { g.step(1 / 60, new Map([[0, emptyInput()]])); g.events.length = 0; }
  check('a ride let go of late leaves it unhurt', p.rideHost === -1 && o.hp === hp0, `host hp ${o.hp.toFixed(1)}`);
  check('...and it never noticed the passenger', o.lastHitBy !== p.id && (!o.brain || o.brain.target !== p.id),
    `lastHitBy ${o.lastHitBy}, brain target ${o.brain?.target ?? 'none'}`);
}

// --- the windows run from contact, not from the button ---
// A grip closes at arm's length and the two bodies then come together over a fraction of a second.
// Timing from the press charged the player for the approach: a grab-and-release could fall outside
// its own strike window because the clock had been running while the animal was still travelling.
{
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
  behind(p, o);
  // Take hold from a body's length out, so the grip has real distance to close.
  const away = heading(o.yaw);
  p.pos = { x: p.pos.x - away.x * lengthOf(p), y: p.pos.y + lengthOf(p) * 0.6, z: p.pos.z - away.z * lengthOf(p) };
  takeRide(ctx, p, o);
  check('a grip that has not met the body yet has no clock', p.gripSyncT < 0, `gripSyncT=${p.gripSyncT}`);
  p.prev = { ...p.prev, heavy: true };
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  let met = -1;
  for (let i = 0; i < 120 && met < 0; i++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; if (p.gripSyncT >= 0) met = i; }
  check('...and starts one the frame the bodies meet', met >= 0 && p.gripSyncT >= 0, `met on step ${met}`);
  check('...which is after the grip closed, not when it closed', met > 0, `${met} steps of closing first`);
}

// --- a release inside the strike window is the blow, from contact ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
  behind(p, o);
  takeRide(ctx, p, o);
  const hp0 = o.hp;
  p.prev = { ...p.prev, heavy: true };
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  // Hold until contact, then a moment longer — still well inside the two seconds.
  for (let i = 0; i < 120 && (p.gripSyncT < 0 || p.gripSyncT < 0.5); i++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; }
  check('the grip met the body', p.gripSyncT >= 0.5 && p.gripSyncT < GRIP_STRIKE, `${p.gripSyncT.toFixed(2)}s since contact`);
  check('...and hurt nothing on the way', o.hp === hp0, `host hp ${o.hp.toFixed(1)}`);
  p.graspHold = false;
  run(g, emptyInput(), 60);
  check('let go inside the strike window and it lands', p.rideHost === -1 && o.hp < hp0, `host hp ${o.hp.toFixed(1)} of ${hp0.toFixed(1)}`);
  check('...and something that size comes looking for you', o.lastHitBy === p.id, `lastHitBy ${o.lastHitBy}, player ${p.id}`);
}

// --- something your own size is ridden, not crushed ---
// A rival used to be taken into the jaws and squeezed, which made the one animal most worth
// clinging to — something that can fight back and is going somewhere — the one thing a grip could
// not hold on to.
{
  const { g, p, o } = pair('hallucigenia', 1);
  o.brain = undefined; o.vel = { x: 0, y: 0, z: 0 };
  behind(p, o);
  p.yaw = o.yaw;                                            // facing the flank it is reaching for
  p.prevT = { ...p.prevT, yaw: p.yaw };
  const hp0 = o.hp;
  // The button already down, so the grip closes on its own clock rather than a press firing a blow.
  p.prev = { ...p.prev, heavy: true };
  const held = new Map([[0, { ...emptyInput(), heavy: true, camYaw: p.yaw }]]);
  for (let i = 0; i < 60 && p.rideHost < 0; i++) { g.step(1 / 60, held); g.events.length = 0; }
  check('a rival is ridden', bandOf(p, o) === 'rival' && p.rideHost === o.id, `band ${bandOf(p, o)}, rideHost ${p.rideHost}`);
  check('...and is not crushed while it is held', o.hp === hp0, `hp ${o.hp.toFixed(1)} of ${hp0.toFixed(1)}`);
}

// --- one rider at a time, and no chains ---
{
  const { g, p, o, ctx } = pair('hallucigenia', 4.6);
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

// --- carry prey too long and it works loose ---
// A mouthful is a meal you are having, not a thing you are keeping. Held past GRIP_MEAL from
// contact, it gets away — unhurt, because nothing a grip holds is hurt by the holding.
{
  const { g, p, o, ctx } = pair('isoxys', 0.39);
  const hp0 = o.hp;
  takeHold(ctx, p, o);
  check('prey is in the jaws', p.state === 'grabbing' && o.state === 'grabbed', `${p.state} / ${o.state}`);
  p.prev = { ...p.prev, heavy: true };
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  for (let i = 0; i < 60 * (GRIP_MEAL + 1); i++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; }
  check('...and is still held after the meal window', p.state === 'grabbing' && isAlive(o), `${p.state}, ${o.state}`);
  check('...unhurt by the carrying', o.hp === hp0, `${o.hp.toFixed(1)} of ${hp0.toFixed(1)}`);
  p.graspHold = false;
  run(g, emptyInput(), 60);
  check('let go that late and it swims off instead of being eaten',
    isAlive(o) && o.state !== 'swallowed' && o.state !== 'dead' && o.grabbedBy === -1 && p.grabbing === -1,
    `${o.state}, grabbedBy ${o.grabbedBy}`);
  check('...and it is not eaten', p.eats === 0, `${p.eats} eaten`);
}

// --- but inside the window it is still the meal the grip was for ---
{
  const { g, p, o, ctx } = pair('isoxys', 0.39);
  takeHold(ctx, p, o);
  p.prev = { ...p.prev, heavy: true };
  const held = new Map([[0, { ...emptyInput(), heavy: true }]]);
  for (let i = 0; i < 60 * 2; i++) { p.graspHold = true; g.step(1 / 60, held); g.events.length = 0; }
  p.graspHold = false;
  run(g, emptyInput(), 60);
  check('two seconds in the jaws and it is eaten', !isAlive(o) || o.state === 'swallowed' || o.state === 'dead', `${o.state}`);
}

// --- the grip says it has hold: the readout the HUD draws ---
// The mechanic worked and the player could not tell. A real recording had the grip closing three
// times on a giant and carrying the player thirteen seconds, while the player reported in good
// faith that grabbing did not work — because nothing on the screen changed when it closed, nothing
// counted the seconds it had left, and nothing named the button that turns a hold into damage.
{
  const { g, p, o, ctx } = pair('opabinia', 4);
  check('nothing in the grip, nothing to say', g.gripFor(0) === undefined, '');
  o.pos = { x: p.pos.x + bodyRadius(o) * 0.9, y: p.pos.y, z: p.pos.z };
  takeRide(ctx, p, o);
  p.gripSyncT = 0.2;                                        // met the body a moment ago
  const held = g.gripFor(0);
  check('a ride is reported as a ride, naming what is under you',
    held?.kind === 'ride' && held.name === 'Anomalocaris' && held.band === 'giant', `${held?.kind} ${held?.name} ${held?.band}`);
  check('...and says letting go now would be a blow', held?.release === 'strike', `${held?.release}`);
  check('...with the window it is true for drawn as a bar', !!held && held.left !== undefined && held.left > 0.85, `left=${held?.left}`);
  // Past the window the grip has stopped being an attack, and the readout stops offering one — and
  // stops drawing a bar, because from here nothing is running down at all.
  p.gripSyncT = GRIP_STRIKE + 1;
  const settled = g.gripFor(0);
  check('past the window it offers nothing and counts nothing', settled?.release === 'nothing' && settled.left === undefined, `${settled?.release}, left=${settled?.left}`);
  p.gripSyncT = 120;
  check('...still, two minutes in', g.gripFor(0)?.kind === 'ride' && g.gripFor(0)?.left === undefined, '');
  // A mouthful counts the window in which it is still a meal.
  endRide(p, o);
  const { g: g2, p: p2, o: o2, ctx: ctx2 } = pair('hallucigenia', 0.3);
  takeHold(ctx2, p2, o2);
  p2.gripSyncT = 0.1;
  const jaws = g2.gripFor(0);
  check('a mouthful says what is in the jaws, and that letting go eats it',
    jaws?.kind === 'hold' && jaws.release === 'eat', `${jaws?.kind} release=${jaws?.release}`);
  check('...with the meal window drawn as the bar it is',
    !!jaws && jaws.left !== undefined && jaws.left > 0.95, `left=${jaws?.left}`);
  p2.gripSyncT = GRIP_MEAL + 1;
  const lost = g2.gripFor(0);
  check('...and says when it has been carried past being a meal', lost?.release === 'escape' && lost.left === 0, `${lost?.release}, left=${lost?.left}`);
  // Something struggled out of the jaws and the button is still down.
  p.graspSpent = true; p.graspHold = true;
  const spent = g.gripFor(0);
  check('a grip that has been struggled out of says so while the button is still held',
    spent?.kind === 'spent', `${spent?.kind}`);
  p.graspHold = false;
  check('...and says nothing once the button comes up', g.gripFor(0) === undefined, '');
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
