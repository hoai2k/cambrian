/**
 * Swimming near the floor: what a sprint costs, how close to the sand you can get, and how a rock
 * behaves when you swim into it — over it, not into a wall — plus the radar's reading of height.
 */
import { Game, radarRange } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { applyScaleStats, bodyRadius, clearanceOf, climbHeight, climbRise, floorClearance, glideOver, lengthOf, speedFactor } from '../src/sim/actors';
import { boulderQ, boulderTop, groundHeight, resolveStatic, rockRadius, sampleHeight, type Boulder, type StaticContact, type WorldData } from '../src/sim/world';
import { creature } from '../src/sim/creatures';
import { floraSize } from '../src/sim/flora';
import { fitCameraArm, PITCH_DOWN, PITCH_UP } from '../src/render/engine';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };
let jumped = 0;
/** The climb only ever offers a height to rise to; nothing here may move a body in one go. */
const check_no_jump = (gap: number) => { if (gap > 12) jumped++; };
/** A world holding exactly the rocks given, for testing collision on its own. */
const rockWorld = (boulders: Boulder[]) => ({
  boulderHash: { query: (_x: number, _z: number, _r: number, out: Boulder[]) => { out.length = 0; for (const b of boulders) out.push(b); return out; } },
} as unknown as WorldData);

// --- a sprint is a crossing, not a two-second window ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  p.stamina = p.staminaMax;
  const start = p.stamina;
  run(g, { ...emptyInput(), my: 1, burst: 1, camYaw: Math.PI }, 60 * 5);
  const spent = start - p.stamina;
  // Five seconds of sprint against regeneration; the old drain (22/s) emptied the bar in that time.
  check('five seconds of sprint leaves most of the bar', p.stamina > p.staminaMax * 0.55, `${p.stamina.toFixed(0)}/${p.staminaMax} spent ${spent.toFixed(0)}`);
  let held = 0;
  p.stamina = p.staminaMax;
  const m = new Map([[0, { ...emptyInput(), my: 1, burst: 1, camYaw: Math.PI }]]);
  while (p.stamina > 0 && held < 60 * 90) { g.step(1 / 60, m); g.events.length = 0; held++; }
  // At the old drain a full bar was gone in five seconds; a sprint now lasts about three times that.
  check('...and a full bar sprints for three times as long as it did', held / 60 > 12, `${(held / 60).toFixed(1)}s before exhaustion`);
}

// --- a swimmer can put its belly on the sand ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; p.spawnProtect = 0;
  check('a swimmer may ride lower than its resting clearance', floorClearance(p) < clearanceOf(p) * 0.6, `floor=${floorClearance(p).toFixed(2)} rest=${clearanceOf(p).toFixed(2)}`);
  run(g, { ...emptyInput(), sink: true, camYaw: Math.PI }, 60 * 6);
  const gap = p.pos.y - groundHeight(g.world, p.pos.x, p.pos.z, []);
  check('holding sink puts it within grazing reach of the floor', gap < clearanceOf(p) * 0.75, `${gap.toFixed(2)} above the sand (body ${lengthOf(p).toFixed(1)})`);
  const crawler = new Game('reef', [{ creature: 'olenoides', device: 'keyboard', ready: true }], 5).players[0];
  check('a crawler still rides at its full clearance', Math.abs(floorClearance(crawler) - clearanceOf(crawler)) < 1e-9, `${floorClearance(crawler).toFixed(2)}`);
}

// --- a rock's collider is the rock you can see, not the circle around it ---
{
  const rock: Boulder = { pos: { x: 0, y: 0, z: 0 }, radius: 4 * 1.02, height: 2, sx: 4, sy: 1.5, sz: 1, rot: 0, shade: .7 };
  const world = rockWorld([rock]);
  const at = (x: number, z: number, y = 0) => { const p = { x, y, z }; const hit = resolveStatic(world, p, 0, [], 0, 0); return { hit, p }; };
  check('the long axis blocks out to the rock', at(3.9, 0).hit && !at(4.2, 0).hit, `blocked to ~${rock.sx * 1.02}`);
  check('...and the short axis clears just past it', at(0.9, 0).hit === true && !at(0, 1.2).hit, 'narrow side is open water');
  check('a body 2 units off the narrow side is in clear water', !at(0, 2).hit, 'no invisible wall where the rock is not');
  check('turning the rock turns its collider', (() => {
    const turned: Boulder = { ...rock, rot: Math.PI / 2 };
    const w = rockWorld([turned]);
    const side = { x: 0, y: 0, z: 3.5 }, along = { x: 3.5, y: 0, z: 0 };
    return resolveStatic(w, side, 0, [], 0, 0) && !resolveStatic(w, along, 0, [], 0, 0);
  })(), 'the ellipse follows the mesh rotation');
  check('the dome is only over the rock itself', boulderTop(rock, 0, 0) !== undefined && boulderTop(rock, 0, 2) === undefined,
    `top=${boulderTop(rock, 0, 0)?.toFixed(2)} at the centre, nothing 2 units off the narrow side`);
  check('q is 1 at the rim on both axes', Math.abs(boulderQ(rock, 4, 0) - 1) < 1e-6 && Math.abs(boulderQ(rock, 0, 1) - 1) < 1e-6,
    'the rim is where the mesh ends, on the long axis and the short one');
  // A carved prop collides as its own silhouette, not as a circle around it. A talus shard is close
  // to twice as long as it is wide; blocking a disc as wide as it is long put an arm's length of
  // invisible wall off each of its sides.
  const shard: Boulder = { variant: 'talus-shard', pos: { x: 0, y: 0, z: 0 }, radius: rockRadius('talus-shard', 2, 2), height: 1.6, sx: 2, sy: 2, sz: 2, rot: 0, shade: .7 };
  /** World distance from the centre to the footprint's edge in a direction. */
  const edge = (x: number, z: number) => Math.hypot(x, z) / boulderQ(shard, x, z);
  const along = edge(1, 0), across = edge(0, 1);
  check('a carved prop collides as its own silhouette', along > across * 1.4 && along <= shard.radius + 1e-6,
    `${along.toFixed(2)} along the shard, ${across.toFixed(2)} across it, radius ${shard.radius.toFixed(2)}`);
}

// --- swimming into a boulder rides over it ---
{
  const rock: Boulder = { pos: { x: 0, y: 0, z: 0 }, radius: 3 * 1.02, height: 2.6, sx: 3, sy: 2.2, sz: 3, rot: 0, shade: .7 };
  const world = rockWorld([rock]);
  const body = { radius: 0.86, glide: 2.45, climb: 7.8 };    // a body about 3.9 units long
  // Walk a body straight across the rock at the height it would be riding at, resolving each step.
  let blocked = 0, worstLift = 0, y = -0.6, x = -6;
  const stepsAcross = 240;
  for (let i = 0; i < stepsAcross; i++) {
    const p = { x, y, z: 0 };
    if (resolveStatic(world, p, body.radius, [], 0, body.glide, body.climb)) blocked++;
    x = p.x + 0.05;                                           // 3 units/s at 60 Hz
    const floor = Math.max(-1000, boulderTop(rock, p.x, 0) ?? -1000);
    const lift = Math.max(0, floor - y);
    worstLift = Math.max(worstLift, lift);
    if (lift > 0) y = floor;                                  // the floor clamp carries it up
  }
  check('a swimmer crosses a boulder instead of stopping at it', x > 5, `ended at x=${x.toFixed(1)} after ${stepsAcross} steps`);
  check('...and is never pushed back by it', blocked === 0, `${blocked} wall contacts`);
  check('...riding up in steps small enough to read as a swim', worstLift < body.glide, `worst single lift ${worstLift.toFixed(2)} (budget ${body.glide})`);
}

// --- a face too steep to glide up is climbed, if the top is within two bodies ---
{
  const out: StaticContact = { hit: false, climbTo: -Infinity };
  const body = { radius: 0.86, glide: 2.45, climb: 7.8, rise: 2.6 };
  // A narrow steep rock, shaped the way the world builds one (`y` a quarter up its own height,
  // top at `y + sy * 1.05`): its flanks are far too steep to be glided up.
  const wall = (tall: number): Boulder => {
    const sy = tall / 1.3, y = sy * 0.25;
    return { pos: { x: 0, y, z: 0 }, radius: 1.6 * 1.02, height: y + sy * 1.05, sx: 1.6, sy, sz: 1.6, rot: 0, shade: .7 };
  };
  const surmountable = wall(7), cliff = wall(20);   // 7 is just inside two bodies of a 3.9-unit swimmer
  const push = (b: Boulder, y: number) => { const p = { x: 1.2, y, z: 0 }; const hit = resolveStatic(rockWorld([b]), p, body.radius, [], 0, body.glide, body.climb, out); return { hit, moved: p.x - 1.2 }; };
  const a = push(surmountable, 0);
  check('a steep rock within two bodies still blocks the way through', a.hit && a.moved > 0, `pushed out ${a.moved.toFixed(2)}`);
  check('...and offers the height to get over it', out.climbTo > surmountable.height, `climb to ${out.climbTo.toFixed(2)} for a top at ${surmountable.height.toFixed(2)}`);
  const b = push(cliff, 0);
  check('a true wall blocks and offers nothing', b.hit && out.climbTo === -Infinity, `top ${cliff.height.toFixed(1)} is over the ${body.climb} budget`);
  // Climbing it: hold the body against the face and lift it at its swim-up rate. Partway up, the
  // flank has fallen away enough to be glided, and the floor takes over and carries it across —
  // the two behaviours are one movement, and at no point is the body moved more than a swim.
  let y = 0, steps = 0;
  for (; steps < 60 * 10; steps++) {
    const p = { x: 1.2, y, z: 0 };
    const blocked = resolveStatic(rockWorld([surmountable]), p, body.radius, [], 0, body.glide, body.climb, out);
    if (!blocked) break;
    check_no_jump(out.climbTo - y);
    y = Math.min(out.climbTo, y + body.rise / 60);
  }
  check('...and the way up is a steady swim that hands over to the glide', steps > 10 && steps < 60 * 5 && y > 0.5,
    `${(steps / 60).toFixed(1)}s and ${y.toFixed(1)} units up the face before it could be glided`);
  const over = { x: 1.2, y: surmountable.height + 0.6, z: 0 };
  check('...and above the top the rock is simply not there', !resolveStatic(rockWorld([surmountable]), over, body.radius, [], 0, body.glide, body.climb, out), 'clear of the top');
}

// --- and in the real sea, a rock is something the sim can carry you over ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  check('every body glides over what is gentle and climbs what is twice its size', glideOver(p) > 1 && Math.abs(climbHeight(p) - lengthOf(p) * 2) < 1e-9 && climbRise(p) > 1,
    `glide ${glideOver(p).toFixed(2)} · climb to ${climbHeight(p).toFixed(1)} above · at ${climbRise(p).toFixed(1)} u/s`);
  let worst = 0;
  const m = new Map([[0, { ...emptyInput(), my: 1, sink: true, burst: 1, camYaw: Math.PI }]]);
  for (let i = 0; i < 60 * 40; i++) {
    const y0 = p.pos.y;
    g.step(1 / 60, m); g.events.length = 0;
    worst = Math.max(worst, Math.abs(p.pos.y - y0));
  }
  check('skimming the seabed at a sprint never jolts the body', worst < Math.max(2, lengthOf(p) * 3), `worst single-step rise ${worst.toFixed(2)} (snap threshold ${Math.max(2, lengthOf(p) * 3).toFixed(1)})`);
  const gap = p.pos.y - groundHeight(g.world, p.pos.x, p.pos.z, []);
  check('...and it is still hugging the floor at the end of it', gap < clearanceOf(p) + 0.5, `${gap.toFixed(2)} above the ground`);
  void bodyRadius(p); void sampleHeight(0, 0);
}

// --- in the running sim, a steep rock is climbed and crossed rather than leaned on ---
{
  /** Swim straight at a sheer block of `tall` units and report how high the body got over it. */
  const intoAWall = (tall: number) => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0;
    const ground = sampleHeight(p.pos.x, p.pos.z);
    // A steep-sided block, built the way the world builds a rock so its top and its dome agree.
    const sy = tall / 1.3, y = ground + sy * 0.25;
    g.world.boulders.push({ pos: { x: p.pos.x, y, z: p.pos.z - 9 }, radius: 6 * 1.02, height: y + sy * 1.05, sx: 6, sy, sz: 6, rot: 0, shade: .7 });
    g.world.boulderHash.rebuild(g.world.boulders);
    p.pos = { x: p.pos.x, y: ground + floorClearance(p), z: p.pos.z };
    p.yaw = Math.PI;
    const start = { ...p.pos };
    let peak = 0;
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI }]]);   // camYaw π is -z, where the rock is
    // Height over the seabed under the body, not over where it started: the floor moves as it goes.
    for (let i = 0; i < 60 * 8; i++) { g.step(1 / 60, m); g.events.length = 0; peak = Math.max(peak, p.pos.y - sampleHeight(p.pos.x, p.pos.z)); }
    return { peak, forward: start.z - p.pos.z, tall };
  };
  // Two bodies tall, for the 3.9-unit body above: over the top and on.
  const over = intoAWall(7);
  check('a sheer rock inside two bodies is climbed and crossed', over.peak > over.tall && over.forward > 12,
    `rose ${over.peak.toFixed(1)} over a ${over.tall}-unit face and carried on ${over.forward.toFixed(0)} units`);
  // Four times that is a cliff: the body works along the foot of it and never gets up.
  const wall = intoAWall(28);
  check('a cliff is still a cliff', wall.peak < 6, `never got above ${wall.peak.toFixed(1)} on a ${wall.tall}-unit face`);
}

// --- and it is climbed at swimming pace, not jumped ---
{
  /**
   * A rock's dome is `sqrt(1 - q^2)` tall, so its flank is near-vertical at the rim: the floor
   * under a body crossing that rim used to rise a couple of the body's own lengths in a single
   * step while it moved a tenth of a unit forward, which read as jetting to the top of the rock
   * rather than swimming over it. The climb is paid for out of the travel now, so what changes is
   * the direction of the motion and not the speed of it.
   */
  // Heights are in the swimmer's own body lengths: "a cliff" means a cliff to *this* animal, and
  // the roster's lengths are real ones now (docs/research/cambrian-sizes.md), so a fixed number of
  // units stopped meaning the same thing to every body.
  const overARock = (bodies: number, seconds = 10) => {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0;
    const tall = bodies * lengthOf(p);
    const ground = sampleHeight(p.pos.x, p.pos.z);
    const sy = tall / 1.3, y = ground + sy * 0.25;
    g.world.boulders.push({ pos: { x: p.pos.x, y, z: p.pos.z - 12 }, radius: 8 * 1.02, height: y + sy * 1.05, sx: 8, sy, sz: 8, rot: 0, shade: .7 });
    g.world.boulderHash.rebuild(g.world.boulders);
    p.pos = { x: p.pos.x, y: ground + floorClearance(p), z: p.pos.z };
    p.yaw = Math.PI;
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI }]]);
    let rate = 0, peak = 0;
    for (let i = 0; i < 60 * seconds; i++) {
      const y0 = p.pos.y;
      g.step(1 / 60, m); g.events.length = 0;
      rate = Math.max(rate, (p.pos.y - y0) * 60);
      peak = Math.max(peak, p.pos.y - sampleHeight(p.pos.x, p.pos.z));
    }
    // Against the body's own swimming speed: a climb is allowed to be brisk — it is its travel
    // pointed upward, plus the rise it can swim — and nothing like the twentyfold it used to be.
    return { rate, peak, swim: creature(p.creature).speed * speedFactor(p.scale), tall };
  };
  const r = overARock(1.8);
  check('a rock is climbed at swimming pace, not jumped', r.rate < r.swim * 4,
    `rose at most ${r.rate.toFixed(0)} u/s against a ${r.swim.toFixed(1)} u/s swim (${(r.rate / r.swim).toFixed(1)}x)`);
  check('...and the body still gets over it', r.peak > r.tall, `reached ${r.peak.toFixed(1)} over a ${r.tall.toFixed(1)}-unit rock`);
  // A cliff is where the pacing matters most: there is no height a body may be handed for free.
  const c = overARock(3.1);
  check('...and a cliff is not vaulted either', c.rate < c.swim * 4 && c.peak < c.tall,
    `rose at most ${c.rate.toFixed(0)} u/s and reached ${c.peak.toFixed(1)} of ${c.tall.toFixed(1)}`);
}

// --- a crawler walks up and over what it is pushed into, whatever it is ---
{
  /** Put a rock `tall` units high in front of a crawler and walk into it for `seconds`. */
  const crawlAt = (tall: number, seconds: number) => {
    const g = new Game('reef', [{ creature: 'olenoides', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0;
    const ground = sampleHeight(p.pos.x, p.pos.z);
    const sy = tall / 1.3, y = ground + sy * 0.25;
    g.world.boulders.push({ pos: { x: p.pos.x, y, z: p.pos.z - 6 }, radius: 5 * 1.02, height: y + sy * 1.05, sx: 5, sy, sz: 5, rot: 0, shade: .7 });
    g.world.boulderHash.rebuild(g.world.boulders);
    p.pos = { x: p.pos.x, y: ground + floorClearance(p), z: p.pos.z };
    p.yaw = Math.PI;
    let peak = 0;
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI }]]);
    for (let i = 0; i < 60 * seconds; i++) { g.step(1 / 60, m); g.events.length = 0; peak = Math.max(peak, p.pos.y - sampleHeight(p.pos.x, p.pos.z)); }
    return { peak, tall, body: lengthOf(p) };
  };
  const low = crawlAt(3, 8);
  check('a crawler walks up and over a rock in its way', low.peak > low.tall * 0.8, `got ${low.peak.toFixed(1)} up a ${low.tall}-unit rock (body ${low.body.toFixed(1)})`);
  // A wall many times its own height: legs beat height, as long as it keeps pushing.
  const wall = crawlAt(14, 16);
  check('...and gets over a wall too, if it keeps pushing at it', wall.peak > wall.tall * 0.8, `got ${wall.peak.toFixed(1)} up a ${wall.tall}-unit wall`);
}

// --- a plant is something to go round; you only go over one you drive straight at ---
{
  /**
   * Walk a crawler at a plant, `off` units to the side of dead centre. A body that hauls itself
   * through weed has the leverage to bend the soft growth aside, but a sponge this size is still
   * something to get over — that a thicket carries the same animal along is in locomotion-test.
   */
  const atAPlant = (kind: 'sac' | 'spine', scale: number, off: number) => {
    const g = new Game('reef', [{ creature: 'olenoides', device: 'keyboard', ready: true }], 33);
    const p = g.players[0]; p.spawnProtect = 999; p.scale = 1; applyScaleStats(p, false);
    const ground = sampleHeight(p.pos.x, p.pos.z);
    p.pos = { x: p.pos.x, y: ground + floorClearance(p), z: p.pos.z };
    p.yaw = Math.PI;
    const at = { x: p.pos.x + off, z: p.pos.z - 5 };
    const f = { pos: { x: at.x, y: sampleHeight(at.x, at.z), z: at.z }, kind, scale, sy: scale, rot: 0, shade: .8, ...floraSize(kind, scale, scale), bx: 0, bz: 0, bvx: 0, bvz: 0, active: false };
    g.world.flora.push(f);
    g.world.floraHash.rebuild(g.world.flora);
    g.world.floraReach = Math.max(g.world.floraReach, 8);
    let peak = 0;
    const m = new Map([[0, { ...emptyInput(), my: 1, camYaw: Math.PI }]]);
    // Only what the plant itself does to the body counts: past it the walk is over open floor with
    // the whole reef on it, and whatever it climbs out there is a different question.
    for (let i = 0; i < 60 * 8; i++) {
      g.step(1 / 60, m); g.events.length = 0;
      if (Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z) < f.R + 3) peak = Math.max(peak, p.pos.y - sampleHeight(p.pos.x, p.pos.z));
    }
    return { peak, past: f.pos.z - p.pos.z, height: f.H };
  };
  // A sac sponge big enough to stand up to this body: a firm bulb, broad right down at the sand.
  const head = atAPlant('sac', 3, 0);
  const edge = atAPlant('sac', 3, 1.7);
  check('driving straight at a plant goes over it', head.peak > 2, `rose ${head.peak.toFixed(1)} against a plant ${head.height.toFixed(1)} tall`);
  check('...and aiming at its edge goes round it instead', edge.peak < 1 && edge.past > 3, `rose ${edge.peak.toFixed(2)} and carried on ${edge.past.toFixed(0)} units past it`);
  // A spine sponge is a tall stalk on a narrow foot. A body down on the sand meets the foot, so it
  // slips past rather than climbing a pillar that is not there — the collider is the mesh now.
  const stalk = atAPlant('spine', 2.4, 0);
  check('...and a plant on a thin stalk is passed at the floor, not climbed', stalk.peak < 1 && stalk.past > 3,
    `rose ${stalk.peak.toFixed(2)} and carried on ${stalk.past.toFixed(0)} units past a ${stalk.height.toFixed(1)}-unit sponge`);
}

// --- the camera can look up for what is hunting you and down for what you are hunting ---
{
  check('the view reaches well above the horizon', PITCH_UP < -0.9, `${(PITCH_UP * 180 / Math.PI).toFixed(0)}°`);
  check('...and nearly straight down', PITCH_DOWN > 1.25, `${(PITCH_DOWN * 180 / Math.PI).toFixed(0)}°`);
  // Fitting the arm with the seabed in the way: shorten first, lift only when that runs out, and
  // report the lift so the look point can go with it and keep the angle.
  const sand = (h: number) => () => h;
  const level = fitCameraArm(6, 0.2, 5, 1.2, sand(0.45), 39);
  check('in open water the arm is left alone', Math.abs(level.dist - 5) < 1e-9 && level.lift === 0, `arm ${level.dist.toFixed(2)}, lift ${level.lift}`);
  const shortened = fitCameraArm(2, -0.5, 5, 1.2, sand(0.45), 39);
  check('aiming up pulls the camera in rather than tipping it flat', shortened.dist < 4 && shortened.dist > 1.2 && Math.abs(shortened.lift) < 0.01,
    `arm 5 → ${shortened.dist.toFixed(2)}, lift ${shortened.lift.toFixed(3)}`);
  check('...and the camera ends up out of the sand', shortened.y >= 0.45 - 1e-9, `y=${shortened.y.toFixed(2)} against sand at 0.45`);
  const lifted = fitCameraArm(0.8, -0.95, 5, 1.2, sand(0.45), 39);   // 1.2 is the shortest arm for a 1.3-unit body
  check('aiming up from the floor lifts the rig once the arm runs out', lifted.dist <= 1.2 + 1e-9 && lifted.lift > 0.2,
    `arm ${lifted.dist.toFixed(2)}, lift ${lifted.lift.toFixed(2)}`);
  check('...by exactly what it took to clear the sand, which the look point follows', Math.abs(lifted.y - 0.45) < 1e-9 && Math.abs(lifted.lift - (0.45 - (0.8 + Math.sin(-0.95) * 1.2))) < 1e-9,
    `y=${lifted.y.toFixed(2)}, lift ${lifted.lift.toFixed(2)}`);
  const under = fitCameraArm(38.5, 1.3, 5, 1.2, sand(0), 39);
  check('and aiming down at the surface tips the same way, not through it', under.y <= 39 + 1e-9 && under.lift < 0, `y=${under.y.toFixed(2)}, lift ${under.lift.toFixed(2)}`);
}

// --- the radar says how far above or below a contact is ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 11);
  const p = g.players[0]; p.spawnProtect = 0;
  p.pos = { x: p.pos.x, y: sampleHeight(p.pos.x, p.pos.z) + 2, z: p.pos.z };
  g.world.loadAround(p.pos);
  // A shoal directly overhead, and one on the floor a little way off.
  for (const a of g.actors) if (a.controller === 'swarm' || a.controller === 'ambient') a.pos = { x: a.pos.x + 900, y: a.pos.y, z: a.pos.z };
  for (let i = 0; i < 6; i++) g.spawn('waptia', 'swarm', { x: p.pos.x + i * 0.6, y: p.pos.y + 26, z: p.pos.z + i * 0.4 }, 0.28);
  // The radar reads the spatial hash, which the step rebuilds; move a body and it has to be re-indexed.
  const reindex = () => g.hash.rebuild(g.actors);
  reindex();
  const range = radarRange(p);
  const above = g.radarFor(0, range).filter((b) => b.kind === 'food');
  check('a shoal overhead is reported as overhead', above.length === 1 && above[0].dy > 20, `${above.length} food contacts, dy=${above[0]?.dy.toFixed(1)}`);
  // The same shoal put out of reach vertically is not a mark on the sand any more.
  for (const a of g.actors) if (a.controller === 'swarm') a.pos = { ...a.pos, y: p.pos.y + range + 30 };
  reindex();
  check('...and one out of reach above is not shown at all', g.radarFor(0, range).every((b) => b.kind !== 'food'), `range ${range.toFixed(0)}`);
  for (const a of g.actors) if (a.controller === 'swarm') a.pos = { ...a.pos, y: p.pos.y - 1 };
  reindex();
  const level = g.radarFor(0, range).filter((b) => b.kind === 'food');
  check('a shoal at your own depth reads as level', level.length === 1 && Math.abs(level[0].dy) < 3, `dy=${level[0]?.dy.toFixed(1)}`);
}

check('no climb ever asked for a jump', jumped === 0, `${jumped} oversized lifts`);
console.log(failed ? `FAILED (${failed})` : 'PASS: sprint endurance, floor grazing, rock colliders, ride-over, camera reach, radar height');
process.exit(failed ? 1 : 0);
