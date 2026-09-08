/**
 * Crawlers off the seabed. RB lifts them off and paddles: a crawler can climb into open water and
 * keep swimming there, slowly, but it cannot sprint or dash until its legs are back down.
 * It also has to be able to get back — the descent is a settle, not a fall — and the seafloor
 * has to keep enough small food on it for a crawler that never leaves the bottom.
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
  const half = run(g, p, {}, 0.5);
  const sank = high - half.above;
  check('release sinks it gently', sank > 0.3 && sank < high * 0.75, `${sank.toFixed(2)} u in 0.5 s from ${high.toFixed(1)}`);
  const down = run(g, p, {}, 6);
  check('...and it reaches the floor', down.above < 1, `${down.above.toFixed(2)} above the floor`);
  check('...and is grounded again', p.grounded, `grounded=${p.grounded}`);
}

// --- no sprint and no dash while off the floor ---------------------------------------------
{
  const flat = (rise: boolean, burst: number) => {
    const { g, p } = start('olenoides');
    if (rise) run(g, p, { rise: true }, 2.5);
    return run(g, p, { rise, my: 1, burst }, 1.5).travelled;
  };
  const groundCruise = flat(false, 0), groundSprint = flat(false, 1);
  const paddleCruise = flat(true, 0), paddleSprint = flat(true, 1);
  check('sprint speeds a crawler up on the floor', groundSprint > groundCruise * 1.15, `${groundCruise.toFixed(1)} -> ${groundSprint.toFixed(1)} u`);
  check('sprint does nothing while paddling', paddleSprint < paddleCruise * 1.05, `${paddleCruise.toFixed(1)} -> ${paddleSprint.toFixed(1)} u`);
  check('paddling is slower than crawling', paddleCruise < groundCruise * 0.8, `${paddleCruise.toFixed(1)} vs ${groundCruise.toFixed(1)} u`);

  const { g, p } = start('olenoides');
  run(g, p, { rise: true }, 2.5);
  const before = { ...p.pos };
  run(g, p, { rise: true, my: 1, dash: true }, 0.5);
  const moved = Math.hypot(p.pos.x - before.x, p.pos.z - before.z);
  check('dash is refused while paddling', p.state !== 'dodge' && moved < 4, `state=${p.state} moved=${moved.toFixed(1)} u`);
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
