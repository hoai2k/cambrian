/**
 * The shore, from the water's side (src/sim/beach.ts): a body can end up on the sand, and what
 * the sand does to it depends on what it breathes.
 *
 * One process per era — `node beach-test.mjs cambrian|devonian|triassic` — because the sim reads
 * ACTIVE_ERA at module top and a second `selectEra` in one process would test the wrong sea. The
 * Cambrian holds the shared half (a leap lands on the sand, a stranded swimmer flops and dies, the
 * wall still stands for a swimmer, the land is bare); the Devonian and the Triassic add their
 * air-breathers and amphibious walkers.
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';

const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
selectEra(which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN);
const { Game } = await import('../src/sim/game');
const { emptyInput } = await import('../src/sim/types');
const { isAlive, lengthOf, bodyRadius, swimCeiling } = await import('../src/sim/actors');
const { creature } = await import('../src/sim/creatures');
const { sampleHeight, shoreZ, shoreDistance, SURFACE_Y, SHORE_WALL, LAND_REACH, generateChunk, chunkCoord } = await import('../src/sim/world');
const beach = await import('../src/sim/beach');
const { STRAND_BREATH, ASHORE_WADE, wadeAt, landSpeed, breathesAir, amphibious, FLOP_PERIOD } = beach;
type CreatureId = import('../src/sim/creatures').CreatureId;
type InputFrame = import('../src/sim/types').InputFrame;
type G = InstanceType<typeof Game>;

const DT = 1 / 60;
let passes = 0;
const pass = (msg: string) => { passes++; console.log(`PASS  [${which}] ${msg}`); };

function fresh(id: CreatureId, seed = 7) {
  const g = new Game('rise', [{ creature: id, device: 'keyboard', ready: true }], seed);
  g.skipHatch();
  const p = g.players[0];
  p.spawnProtect = 0;
  // Nothing else in the sea has a say in these: the shore is the subject.
  for (const a of [...g.actors]) if (a !== p) (g as unknown as { remove(a: typeof p): void }).remove(a);
  return { g, p };
}
/** Put a body somewhere along the coast, `out` units off the waterline (negative is inland), sitting where the water or the sand has it. */
function place(g: G, p: G['players'][0], out: number, x = 0) {
  const z = shoreZ(x) - out;
  const sand = sampleHeight(x, z);
  const y = Math.min(swimCeiling(p), Math.max(sand + 0.5, (sand + SURFACE_Y) / 2));
  p.pos = { x, y, z }; p.prevT.x = x; p.prevT.y = y; p.prevT.z = z;
  p.vel = { x: 0, y: 0, z: 0 }; p.yaw = Math.PI; p.prevT.yaw = Math.PI; p.airborne = false;
}
function run(g: G, seconds: number, input: InputFrame = emptyInput(), each?: (t: number) => void) {
  const inputs = new Map([[0, input]]);
  for (let i = 0; i < Math.round(seconds * 60); i++) { g.step(DT, inputs); each?.(i * DT); g.events.length = 0; }
}
const drive = (mx: number, my: number, extra: Partial<InputFrame> = {}): InputFrame => ({ ...emptyInput(), mx, my, camYaw: 0, ...extra });
/** Toward the sea is -z: with camYaw 0 the stick's forward is +z, so the sea is my = -1. */
const seaward = drive(0, -1), shoreward = drive(0, 1), alongshore = drive(1, 0);
/** The largest single-step move over a run: a transition that teleports shows up here. */
function maxStep(g: G, p: G['players'][0], seconds: number, input: InputFrame) {
  let worst = 0;
  run(g, seconds, input, () => { worst = Math.max(worst, Math.hypot(p.pos.x - p.prevT.x, p.pos.y - p.prevT.y, p.pos.z - p.prevT.z)); });
  return worst;
}
/** A free-swimming water-breather of this era, for the stranding half. */
const swimmerId = (): CreatureId => which === 'devonian' ? 'coccosteus' : which === 'triassic' ? 'hybodus' : 'anomalocaris';

// ---- the measure: wade is 0 afloat, 1 with the sand at the waterline, and monotone between ----
{
  const { p } = fresh(swimmerId());
  const need = beach.swimDepth(p);
  assert.equal(wadeAt(p, SURFACE_Y - need - 5), 0, 'deep enough to swim is not wading');
  assert.equal(wadeAt(p, SURFACE_Y), 1, 'sand at the waterline is all the way out');
  let last = -1;
  for (let k = 0; k <= 20; k++) { const w = wadeAt(p, SURFACE_Y - need + (need * k) / 20); assert(w >= last, 'wade is monotone in the sand height'); last = w; }
  p.wade = 0; assert.equal(landSpeed(p), 1);
  p.wade = 0.25; p.ashore = false;
  assert.equal(landSpeed(p), 1, 'the shallows do not slow a swimmer: the water holds it there instead');
  p.wade = 1; p.ashore = true;
  assert.equal(landSpeed(p), breathesAir(p.creature) ? landSpeed(p) : 0, 'a stranded water-breather has no swim');
  pass(`wade measures the sand against a ${need.toFixed(2)}-unit swimming depth`);
}

// ---- a leap that comes down on the sand lands on it ----
{
  const { g, p } = fresh(swimmerId());
  place(g, p, -6);
  p.pos.y = SURFACE_Y + 6; p.prevT.y = p.pos.y; p.airborne = true; p.vel = { x: 0, y: 0, z: 0 };
  let landed = false;
  run(g, 3, emptyInput(), () => { for (const e of g.events) if (e.kind === 'beach' && e.actor === p.id && (e.strength ?? 0) > 0) landed = true; });
  assert(!p.airborne, 'the leap ends');
  assert(p.ashore, 'and ends on the sand');
  assert(landed, 'with the beach event, which is the sound and the sand thrown up');
  const sand = sampleHeight(p.pos.x, p.pos.z);
  assert(p.pos.y > SURFACE_Y - 1 && p.pos.y - sand < lengthOf(p) * 0.5, `it sits on the sand (y ${p.pos.y.toFixed(2)}, sand ${sand.toFixed(2)}, surface ${SURFACE_Y})`);
  pass(`a body coming down over the beach lands on it at y=${p.pos.y.toFixed(2)}`);

  if (!breathesAir(p.creature)) {
    // ---- stranded: the stick pointing inland moves nothing inland; the only way is the sea ----
    const z0 = p.pos.z;
    run(g, 4, shoreward);
    assert(p.pos.z <= z0 + 0.05, `pointing inland goes nowhere inland (${(p.pos.z - z0).toFixed(2)})`);
    assert(p.pos.z < z0 - 0.5, `but the ask still threw a flop, and every flop goes to the sea (${(z0 - p.pos.z).toFixed(2)} units seaward)`);
    assert(p.strandT > 3.9, `the minute is running (${p.strandT.toFixed(1)} s)`);
    pass('a stranded swimmer can only flop, and only toward the water');
    // ---- the flop is an arc, not a slide: it leaves the sand and comes back to it ----
    let top = 0; const floor = p.pos.y;
    run(g, FLOP_PERIOD * 1.5, seaward, () => { top = Math.max(top, p.pos.y - sampleHeight(p.pos.x, p.pos.z)); });
    assert(top > floor - sampleHeight(p.pos.x, p.pos.z) + lengthOf(p) * 0.05, `a flop lifts the body (${top.toFixed(2)} over the sand)`);
    pass('a flop hops');
    // ---- flopping toward the sea gets it back in, alive ----
    let t = 0;
    while (p.ashore && t < 50) { run(g, 1, seaward); t++; }
    assert(!p.ashore && isAlive(p), `it flops back into the water in ${t} s and lives`);
    assert.equal(p.strandT, 0, 'and the clock is gone with the sand');
    run(g, 3, seaward);
    assert(!p.ashore && p.wade === 0 && isAlive(p), 'it swims on out');
    pass(`flopped back in after ${t} s`);
  }
}

// ---- a water-breather that does nothing on the sand dies at the minute ----
if (!breathesAir(swimmerId())) {
  const { g, p } = fresh(swimmerId());
  place(g, p, -8);
  p.pos.y = SURFACE_Y + 4; p.prevT.y = p.pos.y; p.airborne = true;
  run(g, 3);
  assert(p.ashore, 'on the sand');
  run(g, STRAND_BREATH - 5);
  assert(isAlive(p) && p.strandT > STRAND_BREATH - 9, `still alive short of the minute (${p.strandT.toFixed(1)} s)`);
  run(g, 6);
  assert(!isAlive(p), 'dead at the minute');
  pass(`a stranded ${swimmerId()} dies after ${STRAND_BREATH} s out of the water`);
}

// ---- the wall still stands for a swimmer, and it is a wall rather than a snap ----
{
  const { g, p } = fresh(swimmerId());
  place(g, p, 30);
  const r = bodyRadius(p);
  const worst = maxStep(g, p, 12, shoreward);
  const s = shoreDistance(p.pos.x, p.pos.z);
  assert(s >= SHORE_WALL + r * 3 - 0.5, `a swimmer driving at the beach is held at the wall (s=${s.toFixed(1)}, wall ${(SHORE_WALL + r * 3).toFixed(1)})`);
  assert(!p.ashore && p.wade < ASHORE_WADE, `and never gets onto the sand that way (wade ${p.wade.toFixed(2)})`);
  assert(worst < lengthOf(p), `no step of it teleports (worst ${worst.toFixed(2)})`);
  pass('the shore wall holds a swimmer');
}

// ---- the land is bare: nothing grows or stands on the beach ----
{
  const cx = chunkCoord(0), cz = chunkCoord(shoreZ(0) + 10);
  let inland = 0, total = 0;
  for (const dz of [-1, 0, 1]) {
    const c = generateChunk(5052026, cx, cz + dz);
    for (const f of c.flora) { total++; if (shoreDistance(f.pos.x, f.pos.z) < SHORE_WALL) inland++; }
    for (const b of c.boulders) { total++; if (shoreDistance(b.pos.x, b.pos.z) < SHORE_WALL) inland++; }
  }
  assert.equal(inland, 0, `nothing is placed on the beach (${inland} of ${total})`);
  pass('the beach is a wasteland: sand, and whatever the sea throws onto it');
}

// ---- a real leap: a hard dash up at the surface near the shore carries a body onto the sand ----
{
  const { g, p } = fresh(swimmerId());
  const r = bodyRadius(p);
  place(g, p, SHORE_WALL + r * 3 + 1.5);
  p.pos.y = swimCeiling(p) - 1; p.prevT.y = p.pos.y;
  p.yaw = 0; p.prevT.yaw = 0;
  let breached = false, landed = false;
  const jump = drive(0, 1, { camPitch: -0.9, dash: true });
  run(g, 0.5, drive(0, 1, { camPitch: -0.9 }));
  run(g, 4, jump, () => { for (const e of g.events) { if (e.kind === 'breach' && e.actor === p.id) breached = true; if (e.kind === 'beach' && e.actor === p.id && (e.strength ?? 0) > 0) landed = true; } });
  assert(breached, 'a dash aimed up at the surface leaves the water');
  assert(landed && p.ashore, `and aimed at the beach it comes down on it (s=${shoreDistance(p.pos.x, p.pos.z).toFixed(1)})`);
  pass(`a ${swimmerId()} leapt out of the water and landed ${(-shoreDistance(p.pos.x, p.pos.z)).toFixed(1)} units up the beach`);
}

// ---- a brainless body ashore heads for the water ----
{
  const { g, p } = fresh(swimmerId());
  const { makeBrain } = await import('../src/sim/ai');
  const bot = g.spawn(swimmerId(), 'bot', { x: 20, y: SURFACE_Y + 4, z: shoreZ(20) + 6 }, p.scale);
  bot.brain = makeBrain('needs', { ...bot.pos }, g.rng);
  bot.airborne = true; bot.spawnProtect = 0;
  place(g, p, 60);
  run(g, 3);
  assert(bot.ashore, 'the bot came down on the sand');
  let t = 0;
  while (bot.ashore && t < 55) { run(g, 1); t++; }
  assert(!bot.ashore && isAlive(bot), `and got itself back into the water in ${t} s`);
  pass(`a bot ashore goes back to the sea (${t} s)`);
}

// ---- the era's own: air-breathers and walkers ----
const airIds = (creature as unknown as (id: CreatureId) => { breathing?: string; amphibious?: boolean; ground: boolean; shore?: boolean }) && (await import('../src/sim/creatures')).PLAYABLE_IDS
  .filter((id) => breathesAir(id) && !creature(id).ground && !creature(id).shore);
const walkers = airIds.filter((id) => amphibious(id));
const lungOnly = airIds.filter((id) => !amphibious(id));
console.log(`      [${which}] air-breathers: ${airIds.join(', ') || 'none'}; walkers: ${walkers.join(', ') || 'none'}`);

if (lungOnly.length) {
  const id = lungOnly.includes('keichousaurus' as CreatureId) ? ('keichousaurus' as CreatureId) : lungOnly[0];
  const { g, p } = fresh(id);
  place(g, p, -6);
  p.pos.y = SURFACE_Y + 4; p.prevT.y = p.pos.y; p.airborne = true;
  run(g, 3);
  assert(p.ashore, `${id} lands on the sand`);
  run(g, 20);
  assert.equal(p.strandT, 0, 'an air-breather has no clock on the sand');
  assert(isAlive(p), 'and is fine there');
  // it walks: along the shore, at a walk
  const x0 = p.pos.x;
  run(g, 6, alongshore);
  const walked = Math.abs(p.pos.x - x0);
  assert(walked > 2, `it walks along the shore (${walked.toFixed(1)} units in 6 s)`);
  assert(walked < creature(id).speed * Math.pow(p.scale, 0.45) * 6 * 0.6, `at a walk, not a swim (${walked.toFixed(1)} units)`);
  assert(p.ashore, 'and stays on the sand doing it');
  // not far inland
  run(g, 25, shoreward);
  const s = shoreDistance(p.pos.x, p.pos.z);
  assert(s >= -LAND_REACH - 0.5, `and no further inland than ${LAND_REACH} (s=${s.toFixed(1)})`);
  assert(s < -8, `though it did go inland to find that out (s=${s.toFixed(1)})`);
  // and back into the water, whole
  let t = 0;
  while (p.ashore && t < 150) { run(g, 1, seaward); t++; }
  assert(!p.ashore && isAlive(p), `it walks back into the sea (${t} s)`);
  run(g, 4, seaward);
  assert(p.wade === 0 && p.pos.y < swimCeiling(p) + 0.01, 'and swims off');
  pass(`${id} walks the shore with no clock, is kept off the country, and walks back in`);
}

for (const id of walkers) {
  const { g, p } = fresh(id);
  const L = lengthOf(p), cruise = creature(id).speed * Math.pow(p.scale, 0.45);
  place(g, p, 40);
  p.yaw = 0; p.prevT.yaw = 0;
  // Onto the sand from the water, at the stick: the wall does not stand for it, the speed comes
  // down over the wade, and nothing about it is a jump.
  let worst = 0, inWater = 0, onSand = 0, nWater = 0, nSand = 0;
  run(g, 40, shoreward, () => {
    worst = Math.max(worst, Math.hypot(p.pos.x - p.prevT.x, p.pos.z - p.prevT.z));
    const v = Math.hypot(p.vel.x, p.vel.z);
    if (p.wade === 0) { inWater += v; nWater++; } else if (p.ashore) { onSand += v; nSand++; }
  });
  assert(p.ashore, `${id} walked up onto the sand (s=${shoreDistance(p.pos.x, p.pos.z).toFixed(1)}, wade ${p.wade.toFixed(2)})`);
  assert(nSand > 60 && nWater > 60, `it spent time both swimming (${nWater}) and walking (${nSand})`);
  const vWater = inWater / nWater, vSand = onSand / nSand;
  assert(vSand < vWater * 0.8, `the walk is slower than the swim (${vSand.toFixed(2)} against ${vWater.toFixed(2)})`);
  assert(vSand > cruise * 0.15, `but it is a walk, not a crawl (${vSand.toFixed(2)} of cruise ${cruise.toFixed(2)})`);
  assert(worst < Math.max(0.5, L * 0.25), `no step of the transition jumps (worst ${worst.toFixed(3)})`);
  assert.equal(p.strandT, 0, 'no clock');
  const sHigh = shoreDistance(p.pos.x, p.pos.z);
  assert(sHigh > -LAND_REACH - 0.5, `and it is held at the inland limit (s=${sHigh.toFixed(1)})`);
  // And back down into the water: the same ramp the other way, smoothly, into a swim.
  worst = 0;
  run(g, 30, seaward, () => { worst = Math.max(worst, Math.hypot(p.pos.x - p.prevT.x, p.pos.y - p.prevT.y, p.pos.z - p.prevT.z)); });
  assert(!p.ashore && p.wade === 0, `it slid back into the water (s=${shoreDistance(p.pos.x, p.pos.z).toFixed(1)})`);
  assert(p.pos.y <= swimCeiling(p) + 0.01, 'and is under it');
  assert(worst < Math.max(0.5, L * 0.25), `without a jump on the way (worst ${worst.toFixed(3)})`);
  pass(`${id}: swim → walk up the beach (${vWater.toFixed(1)} → ${vSand.toFixed(1)} u/s) → slide back in`);
}

// ---- the Triassic lung fills on the sand, as it does at the surface ----
if (which === 'triassic' && walkers.length) {
  const id = walkers[0];
  const { g, p } = fresh(id);
  const { triActor, AIR_MAX } = await import('../src/sim/triassic/state');
  place(g, p, 40);
  p.pos.y = sampleHeight(p.pos.x, p.pos.z) + 1; p.prevT.y = p.pos.y;
  run(g, 20, drive(0, 0, { sink: true }));
  const t = triActor(g, p);
  assert(t.air < AIR_MAX - 10, `under water the breath is spent (${t.air.toFixed(0)})`);
  p.yaw = 0; p.prevT.yaw = 0;
  run(g, 40, shoreward);
  assert(p.ashore, 'up on the sand');
  assert.equal(t.air, AIR_MAX, 'and the lung is full there');
  pass(`${id}'s breath fills on the shore`);
}

// ---- same seed, same inputs, same shore: the sand is deterministic ----
{
  const twice = () => {
    const { g, p } = fresh(swimmerId(), 11);
    place(g, p, -5);
    p.pos.y = SURFACE_Y + 5; p.prevT.y = p.pos.y; p.airborne = true;
    run(g, 2); run(g, 5, seaward); run(g, 2, shoreward);
    return `${p.pos.x.toFixed(6)},${p.pos.y.toFixed(6)},${p.pos.z.toFixed(6)},${p.yaw.toFixed(6)},${p.strandT.toFixed(6)},${p.ashore}`;
  };
  assert.equal(twice(), twice(), 'a replay lands in the same place');
  pass('the shore replays');
}

// ---- the hint says what the sand is doing and the way off it ----
{
  const { g, p } = fresh(swimmerId());
  place(g, p, -5);
  p.pos.y = SURFACE_Y + 5; p.prevT.y = p.pos.y; p.airborne = true;
  run(g, 2);
  const hint = g.hintFor(0) ?? '';
  assert(/water|shore/i.test(hint), `the hint is about the shore: "${hint}"`);
  if (!breathesAir(p.creature)) assert(/flop/i.test(hint), `and tells a stranded swimmer to flop: "${hint}"`);
  pass(`hint: "${hint}"`);
}

console.log(`beach [${which}]: ${passes} checks passed (ASHORE_WADE ${ASHORE_WADE}, STRAND_BREATH ${STRAND_BREATH} s, LAND_REACH ${LAND_REACH})`);
