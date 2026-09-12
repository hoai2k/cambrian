/**
 * Crawlers off the seabed. RB lifts them off and they swim: out in open water a walker goes where
 * it is aimed, sprints and dashes like anything else, and holds its own depth for as long as it is
 * working at it. Stop asking for anything and it settles back to the bottom — the descent is a
 * settle, not a fall — which is what keeps it a walker that visits the water rather than a swimmer.
 * Height is the part that is paid for, at one price per second whether the button or the camera
 * asked for it — RB is the dedicated paddle and climbs faster for the same money.
 * The seafloor also has to keep enough small food on it for a crawler that never leaves the bottom.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { bandOf, isAlive, lengthOf } from '../src/sim/actors';
import { creature, type CreatureId } from '../src/sim/creatures';
import { groundHeight } from '../src/sim/world';

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${detail}`); if (!ok) failed++; };

function start(id: CreatureId) {
  const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 42);
  const p = g.players[0];
  return { g, p };
}

/** Runs `seconds` of one input frame and reports the height gained over the seabed. */
function run(g: Game, p: ReturnType<typeof start>['p'], f: Partial<InputFrame>, seconds: number) {
  const frame: InputFrame = { ...emptyInput(), ...f };
  const inputs = new Map<number, InputFrame>([[0, frame]]);
  const floor = () => groundHeight(g.world, p.pos.x, p.pos.z, []);
  const from = { pos: { ...p.pos }, above: p.pos.y - floor() };
  for (let i = 0; i < seconds * 60; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
  const above = p.pos.y - floor();
  return { above, climbed: above - from.above, travelled: Math.hypot(p.pos.x - from.pos.x, p.pos.z - from.pos.z) };
}

// --- leaving the floor is a gradual rise, not a jump ---------------------------------------
{
  const { g, p } = start('olenoides');
  const floor = () => groundHeight(g.world, p.pos.x, p.pos.z, []);
  const y0 = p.pos.y - floor();
  const first = run(g, p, { rise: true }, 0.25).above - y0;
  const later = run(g, p, { rise: true }, 0.25).climbed;
  // A kick off the floor would put most of its height on in the first quarter-second and then slow
  // down; easing up off the floor does the opposite — it is still gathering pace.
  check('leaving the floor eases up rather than kicking', first < later, `+${first.toFixed(2)} u in the first 0.25 s, +${later.toFixed(2)} u in the next`);
  check('...and the first moments are gentle', first < 0.5, `+${first.toFixed(2)} u`);
  const stamina = p.stamina;
  run(g, p, {}, 4);                                            // back on the floor
  check('...and lifting off costs no lump of stamina', p.stamina >= stamina - 1, `${stamina.toFixed(0)} -> ${p.stamina.toFixed(0)} on the way down`);
}

// --- a crawler climbs while RB is held, and stays up there swimming -------------------------
{
  const { g, p } = start('olenoides');
  const climb = run(g, p, { rise: true }, 3);
  check('crawler climbs while RB is held', climb.above > 3, `+${climb.climbed.toFixed(1)} u, ${climb.above.toFixed(1)} above the floor`);
  const swim = run(g, p, { rise: true, my: 1 }, 2);
  check('...and can swim along up there', swim.travelled > 2 && swim.above > 2, `${swim.travelled.toFixed(1)} u, ${swim.above.toFixed(1)} above`);
}

// --- released, it settles back to the seabed rather than dropping --------------------------
{
  const { g, p } = start('olenoides');
  run(g, p, { rise: true }, 3);
  const high = p.pos.y - groundHeight(g.world, p.pos.x, p.pos.z, []);
  // Over a second and a half rather than half of one: the settle eases in, so the first fraction
  // of a second is almost still — which is the whole difference between a body sinking and a body
  // dropping — and a window that short reads that as not sinking at all.
  const half = run(g, p, {}, 1.5);
  const sank = high - half.above;
  check('release sinks it gently', sank > 0.3 && sank < high * 0.75, `${sank.toFixed(2)} u in 1.5 s from ${high.toFixed(1)}`);
  const down = run(g, p, {}, 8);
  check('...and it reaches the floor', down.above < 1, `${down.above.toFixed(2)} above the floor`);
  check('...and is grounded again', p.grounded, `grounded=${p.grounded}`);
}

// --- out in the water a walker swims: sprint, dash, and depth of its own -------------------
{
  const flat = (rise: boolean, burst: number) => {
    const { g, p } = start('olenoides');
    if (rise) run(g, p, { rise: true }, 2.5);
    return run(g, p, { rise, my: 1, burst }, 1.5).travelled;
  };
  const groundCruise = flat(false, 0), groundSprint = flat(false, 1);
  const paddleCruise = flat(true, 0), paddleSprint = flat(true, 1);
  check('sprint speeds a crawler up on the floor', groundSprint > groundCruise * 1.15, `${groundCruise.toFixed(1)} -> ${groundSprint.toFixed(1)} u`);
  check('...and off it too', paddleSprint > paddleCruise * 1.15, `${paddleCruise.toFixed(1)} -> ${paddleSprint.toFixed(1)} u`);
  check('paddling is still slower than crawling', paddleCruise < groundCruise * 0.8, `${paddleCruise.toFixed(1)} vs ${groundCruise.toFixed(1)} u`);

  {
    const { g, p } = start('olenoides');
    run(g, p, { rise: true }, 2.5);
    const before = { ...p.pos };
    run(g, p, { rise: true, my: 1, dash: true }, 0.5);
    const moved = Math.hypot(p.pos.x - before.x, p.pos.z - before.z);
    check('a dash fires off the floor as well as on it', moved > 5, `moved ${moved.toFixed(1)} u`);
  }
  // Swimming holds its depth; only a body that has stopped asking for anything settles home.
  {
    const { g, p } = start('olenoides');
    run(g, p, { rise: true }, 3);
    const high = p.pos.y - groundHeight(g.world, p.pos.x, p.pos.z, []);
    const swum = run(g, p, { my: 1, camYaw: Math.PI }, 2);
    check('swimming forward holds its depth', swum.above > high * 0.75 && swum.travelled > 3,
      `${high.toFixed(1)} -> ${swum.above.toFixed(1)} above, ${swum.travelled.toFixed(1)} u along`);
    const let_go = run(g, p, {}, 2);
    check('...and letting go puts it back down', let_go.above < swum.above * 0.6, `${swum.above.toFixed(1)} -> ${let_go.above.toFixed(1)} above`);
  }
  // The camera's pitch is what a walker climbs with once it is up, and the climb is what costs.
  {
    const { g, p } = start('olenoides');
    run(g, p, { rise: true }, 2);
    const from = p.pos.y - groundHeight(g.world, p.pos.x, p.pos.z, []);
    const stamina = p.stamina;
    const up = run(g, p, { my: 1, camYaw: Math.PI, camPitch: -0.5 }, 2);
    check('aiming up climbs, without the button', up.above > from + 1, `${from.toFixed(1)} -> ${up.above.toFixed(1)} above the floor`);
    check('...and is paid for like the button', p.stamina < stamina - 5, `${stamina.toFixed(0)} -> ${p.stamina.toFixed(0)}`);
    // Both routes up cost the same per second, so aiming up is not a way round RB's price; the
    // button is still the stronger climb, which is what keeps it worth pressing.
    const { g: g2, p: p2 } = start('olenoides');
    run(g2, p2, { rise: true }, 2);
    const s2 = p2.stamina;
    const button = run(g2, p2, { my: 1, camYaw: Math.PI, rise: true }, 2);
    check('the button and the camera climb at one price', Math.abs((s2 - p2.stamina) - (stamina - p.stamina)) < 6,
      `RB ${(s2 - p2.stamina).toFixed(0)} stamina, camera ${(stamina - p.stamina).toFixed(0)}`);
    check('...and RB is still the stronger climb', button.climbed > up.climbed,
      `RB +${button.climbed.toFixed(1)} u, camera +${up.climbed.toFixed(1)} u`);
    // An empty bar climbs on whatever trickles back in and no more: a tired walker sinks home.
    p.stamina = 0;
    const empty = run(g, p, { my: 1, camYaw: Math.PI, camPitch: -0.5 }, 2);
    check('...and an empty bar buys far less of it', empty.climbed < up.climbed * 0.8, `${empty.climbed.toFixed(2)} u against ${up.climbed.toFixed(2)} on a full bar`);
  }
}

// --- a shove aimed up takes a walker off the bottom along the line it chose ---
// Only ever straight up by the button before this: the camera's pitch was thrown away while the
// legs were down, so there was no way to leave the floor going anywhere in particular.
{
  const { swimPitch } = await import('../src/render/engine');
  const up = swimPitch(-0.8);                        // camera aimed about 46 degrees above level
  const shove = (f: Partial<InputFrame>, holdSeconds: number, totalSeconds: number) => {
    const { g, p } = start('olenoides');
    const floor = () => groundHeight(g.world, p.pos.x, p.pos.z, []);
    run(g, p, {}, 1.5);                              // settle onto the bottom first
    const from = p.pos.y - floor();
    let peak = from;
    for (let i = 0; i < 60 * totalSeconds; i++) {
      const frame: InputFrame = i < 60 * holdSeconds ? { ...emptyInput(), ...f } : emptyInput();
      g.step(1 / 60, new Map([[0, frame]])); g.events.length = 0;
      peak = Math.max(peak, p.pos.y - floor());
    }
    return { from, peak, end: p.pos.y - floor(), grounded: p.grounded };
  };
  const aimed = { my: 1, camYaw: Math.PI, camPitch: up };
  const dashed = shove({ ...aimed, dash: true }, 0.5, 16);
  check('a dash aimed up carries a walker off the bottom', dashed.peak > dashed.from + 4, `${dashed.from.toFixed(1)} -> ${dashed.peak.toFixed(1)} above the floor`);
  check('...and it settles back down again', dashed.end < dashed.peak * 0.3 && dashed.grounded, `back to ${dashed.end.toFixed(1)}, grounded=${dashed.grounded}`);
  const sprinted = shove({ ...aimed, burst: 1 }, 2, 16);
  check('a sprint aimed up does the same', sprinted.peak > sprinted.from + 3, `${sprinted.from.toFixed(1)} -> ${sprinted.peak.toFixed(1)}`);
  const walked = shove(aimed, 4, 8);
  check('...but merely walking uphill does not', walked.peak < walked.from + 1, `${walked.from.toFixed(1)} -> ${walked.peak.toFixed(1)}: the legs stay down`);
}

// --- up and down is a labour, not a bob ---
{
  const { g, p } = start('olenoides');
  const floor = () => groundHeight(g.world, p.pos.x, p.pos.z, []);
  run(g, p, { rise: true }, 4);
  const high = p.pos.y - floor();
  // A walker is not built for the water column: it climbs at well under a swimmer's rise and comes
  // back down at a drift. Measured over the second after each begins, when both are at full pace.
  const climbed = run(g, p, { rise: true }, 1).climbed;
  run(g, p, {}, 0.8);                                          // let the settle take hold
  const sank = -run(g, p, {}, 1).climbed;
  check('a walker climbs at a labouring pace', climbed > 0.4 && climbed < 2.2, `${climbed.toFixed(1)} units in a second`);
  check('...and comes down slower still', sank > 0.2 && sank < climbed, `${sank.toFixed(1)} units in a second, from ${high.toFixed(1)} up`);
}

// --- the seabed keeps its food ---------------------------------------------------------------
for (const id of ['olenoides', 'marrella'] as CreatureId[]) {
  const { g, p } = start(id);
  const inputs = new Map<number, InputFrame>([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 45; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
  const L = lengthOf(p);
  const reach = 3 + L * 1.5;
  let low = 0;
  for (const o of g.actors) {
    if (o.id === p.id || !isAlive(o)) continue;
    if (Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) > 45 + L * 4) continue;
    if (o.pos.y - p.pos.y > reach) continue;
    const b = bandOf(p, o); if (b === 'snack' || b === 'prey') low++;
  }
  check(`${creature(id).name}: food within reach on the bottom`, low >= 10, `${low} snack/prey at or below its level`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall crawler paddle tests passed');
process.exit(failed ? 1 : 0);
