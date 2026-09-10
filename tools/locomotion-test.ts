/**
 * The ways of getting about that are not swimming forward (docs/research/locomotion-ideas.md).
 * Cambrian bodies here, because selecting an era is global; the Devonian's own traits — punting,
 * the row/walk gait and a rigid body's pitch — are checked in tools/devonian-test.ts.
 *
 * Run: npm run locomotion
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { creature, type CreatureId } from '../src/sim/creatures';
import { climbHeight, lengthOf } from '../src/sim/actors';
import { heading, wrapAngle } from '../src/shared/math';
import { BELL_TILT, bellPhase, bellTilt, columnY, DIP_CHANCE, PULSE_CYCLE, pulseThrust } from '../src/sim/locomotion';
import { floraSize } from '../src/sim/flora';
import { chunkCoord, chunkKey, sampleHeight } from '../src/sim/world';
import { CREATURE_IDS } from '../src/sim/creatures';
import fs from 'node:fs';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(52)} ${d}`); if (!ok) failed++; };
const DT = 1 / 60;

/** One player, alone and unbothered, somewhere with water above and below. */
function solo(id: CreatureId, seed = 11) {
  const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], seed);
  const p = g.players[0];
  // Alone means alone: the reef's own animals are cleared so a measurement is about the body being
  // measured and not about whatever swam past it.
  for (const o of [...g.actors]) if (o.controller !== 'player') g.remove(o);
  p.pos = { x: 12, y: sampleHeight(12, -90) + 9, z: -90 };
  p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0; p.spawnProtect = 999;
  const step = (f: Partial<InputFrame> = {}) => {
    g.step(DT, new Map<number, InputFrame>([[0, { ...emptyInput(), ...f } as InputFrame]]));
    g.events.length = 0; p.spawnProtect = 999;
  };
  /**
   * Hand-placed scenery goes into the chunk it stands in, not into the flat array: streaming
   * rebuilds that array from the chunks whenever the loaded set changes, and would drop it.
   */
  const into = (pos: { x: number; z: number }) => g.world.chunks.get(chunkKey(chunkCoord(pos.x), chunkCoord(pos.z)))!;
  return { g, p, step, into };
}
const flat = (v: { x: number; z: number }) => Math.hypot(v.x, v.z);

// --- the tail-flip: straight back, whatever the stick asked, and weaker as the tail runs down ---
{
  /** Push the stick forward and hit dash: a flipper goes the other way. */
  const flip = (id: CreatureId) => {
    const { p, step } = solo(id);
    for (let i = 0; i < 20; i++) step();
    const from = { ...p.pos }, yaw0 = p.yaw;
    step({ my: 1, dash: true });
    for (let i = 0; i < 24; i++) step({ my: 1 });
    const h = heading(yaw0), dx = p.pos.x - from.x, dz = p.pos.z - from.z;
    return { along: h.x * dx + h.z * dz, moved: Math.hypot(dx, dz), turn: Math.abs(wrapAngle(p.yaw - yaw0)) };
  };
  const shrimp = flip('waptia'), fish = flip('anomalocaris');
  check('a tail-flip throws the body backwards', shrimp.along < -2, `${shrimp.along.toFixed(1)} units along its own heading`);
  check('...even with the stick pushed forward', shrimp.moved > 2, `${shrimp.moved.toFixed(1)} units travelled`);
  check('...without turning to do it', shrimp.turn < 0.5, `${shrimp.turn.toFixed(2)} rad`);
  check('a finned body dashes where it is pointed', fish.along > 2, `${fish.along.toFixed(1)} units along its heading`);

  // The reflex is the whole abdomen, so it costs the tail: flip on empty and it barely clears.
  const { p, step } = solo('waptia');
  for (let i = 0; i < 20; i++) step();
  const flipped = () => { const at = { ...p.pos }; step({ dash: true }); for (let i = 0; i < 24; i++) step(); return Math.hypot(p.pos.x - at.x, p.pos.z - at.z); };
  const full = flipped();
  for (let i = 0; i < 90; i++) step();                            // let the reflex come round again
  p.stamina = 14;   // enough to fire it, not enough to put anything into it
  const empty = flipped();
  check('...and a flip on an empty tail is a weaker one', empty < full * 0.75, `${empty.toFixed(1)} against ${full.toFixed(1)} units`);
}

// --- no front: a body that translates without turning ---
{
  const sideways = (id: CreatureId) => {
    const { p, step } = solo(id);
    for (let i = 0; i < 10; i++) step();
    const yaw0 = p.yaw, from = { ...p.pos };
    for (let i = 0; i < 90; i++) step({ mx: 1 });                 // hard right, camera unmoved
    return { turn: Math.abs(wrapAngle(p.yaw - yaw0)), moved: Math.hypot(p.pos.x - from.x, p.pos.z - from.z) };
  };
  const comb = sideways('ctenorhabdotus'), fish = sideways('anomalocaris');
  check('a body with no front never turns to travel', comb.turn < 0.2, `${comb.turn.toFixed(2)} rad after a second and a half sideways`);
  check('...and still goes where the stick points', comb.moved > 2, `${comb.moved.toFixed(1)} units`);
  check('a finned body turns into its travel', fish.turn > 1, `${fish.turn.toFixed(2)} rad`);
}

// --- the bell: thrust in contractions, with a coast between them ---
{
  const trace = (id: CreatureId) => {
    const { p, step } = solo(id);
    for (let i = 0; i < 30; i++) step({ my: 1 });
    const speeds: number[] = [];
    for (let i = 0; i < 70; i++) { step({ my: 1 }); speeds.push(flat(p.vel)); }
    const hi = Math.max(...speeds), lo = Math.min(...speeds);
    return { hi, lo, swing: (hi - lo) / Math.max(hi, 1e-3), mean: speeds.reduce((s, v) => s + v, 0) / speeds.length };
  };
  const bell = trace('burgessomedusa'), steady = trace('anomalocaris');
  check('a bell surges and coasts', bell.swing > 0.35, `speed swings ${(bell.swing * 100).toFixed(0)}% within a cycle`);
  check('...where a swimmer holds its speed', steady.swing < bell.swing * 0.4, `${(steady.swing * 100).toFixed(0)}%`);
  check('...and it still gets somewhere', bell.mean > 0.5, `${bell.mean.toFixed(1)} units/s average`);
}

// --- hauling through weed: cover carries a limbed body and drags on a swimmer ---
{
  /**
   * Cross a bed of soft weed — the growth this is actually about — and see what it cost.
   *
   * Unheld, the swimmer finished four units clear of plants 1.8 tall and came out with exactly the
   * distance it went in with, which read as the drag being broken when it had never been asked
   * for. The same input goes to both bodies and to both runs of each, so what is compared is still
   * only the weed.
   */
  const cross = (id: CreatureId, planted: boolean) => {
    const { g, p, step, into } = solo(id, 5);
    const ground = sampleHeight(p.pos.x, p.pos.z);
    p.pos = { x: p.pos.x, y: ground + lengthOf(p) * 0.2, z: p.pos.z };
    if (planted) {
      for (let i = 0; i < 90; i++) {
        const x = p.pos.x - 6 + (i % 9) * 1.5, z = p.pos.z - 2 - Math.floor(i / 9) * 1.5;
        into({ x, z }).flora.push({ pos: { x, y: sampleHeight(x, z), z }, kind: 'thalli', scale: 1.3, sy: 1.3, rot: 0, shade: .8, ...floraSize('thalli', 1.3, 1.3), bx: 0, bz: 0, bvx: 0, bvz: 0, active: false });
      }
      g.world.rebuild();
    }
    const from = { ...p.pos };
    // Held down into the growth: a body that can swim simply rises over a weed bed given the
    // chance (and does, in play), and the question here is what crossing *through* one costs.
    for (let i = 0; i < 150; i++) step({ my: -1, camYaw: 0, sink: true });     // straight into the bed
    return Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
  };
  const trilobiteOpen = cross('olenoides', false), trilobiteWeed = cross('olenoides', true);
  const swimmerOpen = cross('anomalocaris', false), swimmerWeed = cross('anomalocaris', true);
  check('weed carries a body with legs to pull on', trilobiteWeed > trilobiteOpen * 1.05,
    `${trilobiteWeed.toFixed(1)} units through the bed against ${trilobiteOpen.toFixed(1)} in the open`);
  check('...and drags on one that has to swim past it', swimmerWeed < swimmerOpen * 0.95,
    `${swimmerWeed.toFixed(1)} against ${swimmerOpen.toFixed(1)}`);
}

// --- clinging: no rock face is a cliff ---
{
  const { p } = solo('odontogriphus');
  const { p: other } = solo('olenoides');
  check('a clinging body treats no face as a cliff', climbHeight(p) === Infinity, `${creature(p.creature).name} climbs anything`);
  check('...and everything else still meets cliffs', Number.isFinite(climbHeight(other)), `${climbHeight(other).toFixed(1)} units of climb`);
}

// --- ram feeding: the net only works with water going through it ---
{
  const fed = (id: CreatureId, moving: boolean) => {
    const { g, p, step, into } = solo(id);
    into(p.pos).blooms.push({ pos: { ...p.pos }, radius: 20, drift: 0 });
    g.world.rebuild();
    const before = p.nutrition;
    for (let i = 0; i < 120; i++) step(moving ? { my: 1 } : {});
    return p.nutrition - before;
  };
  const still = fed('tamisiocaris', false), way = fed('tamisiocaris', true);
  check('a ram feeder strains nothing while stopped', still === 0, `${still.toFixed(2)} nutrition`);
  check('...and feeds once it has way on', way > 0, `${way.toFixed(1)} nutrition`);
}

// --- drifting: give up steering, take the whole current, and ride the day ---
{
  const carried = (id: CreatureId) => {
    const { p, step } = solo(id);
    const from = { ...p.pos };
    for (let i = 0; i < 600; i++) step();                          // neutral stick throughout
    return Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
  };
  const drifter = carried('ctenorhabdotus'), swimmer = carried('anomalocaris');
  check('a drifter is carried by the sea', drifter > swimmer * 1.4, `${drifter.toFixed(1)} units against a swimmer's ${swimmer.toFixed(1)}`);
  // 480 s to the day; the offset puts the middle of the night around 0.84 of the way through it.
  const climb = (time: number) => {
    const { g, p, step } = solo('ctenorhabdotus');
    g.time = time;
    const y0 = p.pos.y;
    for (let i = 0; i < 180; i++) { step(); g.time = time; }
    return p.pos.y - y0;
  };
  const night = climb(480 * 0.84), day = climb(480 * 0.34);
  check('...and rises through the night, sinks through the day', night > day, `night ${night.toFixed(2)}, day ${day.toFixed(2)}`);
}

// --- how high in the water a body keeps itself ---
{
  const seq = (n: number) => { let i = 0; return () => ((i = (i * 1103515245 + 12345) % 2147483648), (i + n) % 2147483648 / 2147483648); };
  const heights = (L: number, dip = false) => {
    const rng = seq(7);
    const hs: number[] = [];
    for (let i = 0; i < 400; i++) hs.push(columnY(-30, 0, L, rng, dip) + 30);
    return { mean: hs.reduce((s, v) => s + v, 0) / hs.length, min: Math.min(...hs), max: Math.max(...hs) };
  };
  const small = heights(1), big = heights(9);
  check('a small body uses the whole column, sand included', small.min < 3 && small.max > 15,
    `${small.min.toFixed(1)}–${small.max.toFixed(1)} above the floor`);
  check('a big one keeps to the higher water', big.min > 10 && big.mean > small.mean * 1.35,
    `${big.min.toFixed(1)}–${big.max.toFixed(1)}, mean ${big.mean.toFixed(1)} against ${small.mean.toFixed(1)}`);
  const swept = heights(9, true);
  check('...but comes down over the floor when it does', swept.min < 4, `${swept.min.toFixed(1)} above the floor on a dip`);
  check('...which is a minority of the time', DIP_CHANCE > 0.05 && DIP_CHANCE < 0.3, `${(DIP_CHANCE * 100).toFixed(0)}% of wanders`);
  // Shallow water has no higher water to keep to, and nothing may end up in the air over it.
  const shallow = columnY(-4, 0, 9, seq(3), false);
  check('...and shallow water is still water', shallow > -4 && shallow < -2, `${shallow.toFixed(2)} in 4 units of depth`);
}

// ---- a bell's clip is the simulation's beat ----
// src/render/creature.ts scrubs Swim by the actor's pulseT, so the squeeze the player watches is
// the water actually being thrown. That only holds while the clip is exactly one cycle long: a
// re-timed Swim would slide out of step with the thrust and nothing would say so.
{
  const clipSeconds = (file: string, name: string) => {
    const buf = fs.readFileSync(file);
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
    const anim = (json.animations ?? []).find((a: any) => a.name === name);
    if (!anim) return 0;
    return Math.max(...anim.samplers.map((sm: any) => json.accessors[sm.input].max?.[0] ?? 0));
  };
  for (const id of CREATURE_IDS) {
    if (creature(id).swimStyle !== 'pulse') continue;
    const swim = clipSeconds(`public/assets/creatures/${id}.glb`, 'Swim');
    // The scrub is proportional, so a frame of rounding at 30 fps costs nothing; two cycles in
    // one clip would give two contractions per beat, which is what this is here to catch.
    check(`${id}'s bell beats once per pulse cycle`, Math.abs(swim - PULSE_CYCLE) < 1 / 30 + 0.01,
      `${swim.toFixed(3)}s against a ${PULSE_CYCLE}s cycle`);
  }
}

// ---- and how a bell carries itself ----
// What the player is promised: the apex turns into the direction of travel while the animal is
// beating, and it hangs upright the rest of the time — sinking, drifting, or holding station.
{
  const cruise = creature('burgessomedusa').speed;
  check('a bell hangs upright when it is asking for nothing', bellTilt(cruise, cruise, 0) === 0);
  check('...and while it sinks, which it does by not swimming', bellTilt(0, cruise, 0) === 0);
  check('...and while it climbs, because upright already points up', bellTilt(0, cruise, 0.2) === 0);
  check('...but tips its apex over when it drives across the sea',
    Math.abs(bellTilt(cruise, cruise, 0.2) - BELL_TILT) < 1e-9, `${BELL_TILT} rad at cruise`);
  check('...by however much of its cruise it is actually making',
    Math.abs(bellTilt(cruise / 2, cruise, 0.2) - BELL_TILT / 2) < 1e-9);
  // The squeeze the player watches is the water being thrown: the clip's contraction fills the
  // thrust window and nothing else, so the whole of the bell's closing happens while it pushes.
  const thrustEnd = bellPhase(PULSE_CYCLE * 0.38);
  check('a bell finishes closing exactly as its thrust runs out',
    pulseThrust(PULSE_CYCLE * 0.379) > 0 && pulseThrust(PULSE_CYCLE * 0.381) === 0 && Math.abs(thrustEnd - 0.38) < 1e-9,
    `${(thrustEnd * 100).toFixed(0)}% of the clip`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall locomotion tests passed');
process.exit(failed ? 1 : 0);
