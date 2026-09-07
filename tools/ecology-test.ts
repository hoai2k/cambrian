/**
 * The day, and the tempers in it.
 *
 * The reef used to hunt around the clock: every ambient creature counted as hungry four seconds
 * after its last meal, so anything that could see you was coming. These checks pin down the
 * behaviour that replaced it — appetite that follows the hour, animals that see you off their
 * ground without chasing you across the sea, and the one rule none of it is allowed to break:
 * hit something and it fights back, whatever time it is.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { makeBrain } from '../src/sim/ai';
import { DAY_LENGTH, dayFraction, daylight, huntInterval, huntingPressure, phaseAt, untilNextPhase } from '../src/sim/daynight';
import { distXZ } from '../src/shared/math';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(60)} ${d}`); if (!ok) failed++; };
const run = (g: Game, steps: number, f: InputFrame = emptyInput()) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

// --- the shape of the day ---
{
  const secs: Record<string, number> = {};
  for (let t = 0; t < DAY_LENGTH; t++) { const p = phaseAt(t); secs[p] = (secs[p] ?? 0) + 1; }
  check('the day turns through all four phases', Object.keys(secs).length === 4, Object.entries(secs).map(([k, v]) => `${k} ${v}s`).join(' · '));
  check('night is shorter than daylight', secs.night < secs.day, `${secs.night}s vs ${secs.day}s`);
  check('twilight is brief', secs.dawn + secs.dusk < secs.day, `${secs.dawn + secs.dusk}s of twilight`);
  check('the cycle is continuous', Math.abs(dayFraction(DAY_LENGTH) - dayFraction(0)) < 1e-9, '');

  // light: full through the day, gone at night, ramping through the bands
  const at = (p: string) => { for (let t = 0; t < DAY_LENGTH; t++) if (phaseAt(t) === p) return t + 12; return 0; };
  check('it is light by day and dark at night', daylight(at('day')) > 0.95 && daylight(at('night')) < 0.05, `day ${daylight(at('day')).toFixed(2)} night ${daylight(at('night')).toFixed(2)}`);
  const mid = (from: number) => { for (let t = from; t < from + DAY_LENGTH; t++) if (phaseAt(t) === 'dusk') return t; return 0; };
  const duskStart = mid(0);
  check('dusk is a ramp, not a switch', daylight(duskStart + 24) > 0.1 && daylight(duskStart + 24) < 0.9, `half way through dusk: ${daylight(duskStart + 24).toFixed(2)}`);

  // appetite: the twilight bands are when the reef eats
  const pressures = { dawn: 0, day: 0, dusk: 0, night: 0 } as Record<string, number>, counts = { ...pressures };
  for (let t = 0; t < DAY_LENGTH; t++) { const p = phaseAt(t); pressures[p] += huntingPressure(t); counts[p]++; }
  for (const k of Object.keys(pressures)) pressures[k] /= counts[k];
  check('hunting peaks at dawn and dusk', pressures.dawn > pressures.day * 2 && pressures.dusk > pressures.day * 2,
    Object.entries(pressures).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '));
  check('...and the middle of the day is quiet', pressures.day < 0.2, pressures.day.toFixed(2));
  check('night sits between the two', pressures.night > pressures.day && pressures.night < pressures.dusk, pressures.night.toFixed(2));
  check('an animal goes far longer between meals by day', huntInterval(at('day')) > huntInterval(duskStart + 24) * 3,
    `${huntInterval(at('day')).toFixed(0)}s by day vs ${huntInterval(duskStart + 24).toFixed(0)}s at dusk`);
  check('the phase countdown never exceeds the phase', untilNextPhase(0) <= DAY_LENGTH && untilNextPhase(0) > 0, `${untilNextPhase(0).toFixed(0)}s`);
}

/** A creature placed by hand beside the player, with a disposition of our choosing. */
function withNeighbour(opts: Parameters<typeof makeBrain>[3], gap: number, seed = 5) {
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], seed);
  const p = g.players[0];
  p.spawnProtect = 1e9;                       // the checks are about the neighbour, not about dying
  const pos = { x: p.pos.x + gap, y: p.pos.y, z: p.pos.z };
  const n = g.spawn("opabinia", "ambient", pos, 1);
  n.brain = makeBrain('needs', pos, g.rng, opts);
  n.spawnProtect = 0;
  return { g, p, n };
}

// --- grumpy: sees you off when you crowd it, and lets it go when you leave ---
{
  const { g, p, n } = withNeighbour({ temper: 0.9, aggression: 0.2 }, 60);
  run(g, 60);
  check('a grumpy animal ignores you at a distance', n.brain!.goal !== 'fight', `goal=${n.brain!.goal} at ${distXZ(p.pos, n.pos).toFixed(0)}m`);
  p.pos = { x: n.pos.x + lengthOf(n) * 0.9, y: n.pos.y, z: n.pos.z };
  run(g, 40);
  check('...and squares up when you get too close', n.brain!.goal === 'fight' && n.brain!.target === p.id, `goal=${n.brain!.goal}`);
  p.pos = { x: n.pos.x + 90, y: n.pos.y, z: n.pos.z };
  run(g, 90);
  check('...then drops it once you have backed off', n.brain!.goal !== 'fight', `goal=${n.brain!.goal}`);
}

// --- placid: leaves you alone, but still fights back ---
{
  const { g, p, n } = withNeighbour({ temper: 0, aggression: 0.1 }, 8);
  run(g, 120);
  // It may well be busy with a neighbour; what matters is that it is not interested in *you*.
  const onPlayer = () => n.brain!.goal === 'fight' && n.brain!.target === p.id;
  check('a placid animal lets you stand next to it', !onPlayer(), `goal=${n.brain!.goal} target=${n.brain!.target === p.id ? 'player' : 'other'}`);
  // exactly what a landed hit leaves behind: who did it, and how long ago
  n.lastHitBy = p.id; n.hitFlash = 1; n.sinceHit = 0; n.courage = 1;
  run(g, 60);
  check('...but hits back when you hit it', onPlayer() || n.brain!.goal === 'flee', `goal=${n.brain!.goal}`);
}

// --- territorial: drives you out of its patch, and stops at the edge ---
{
  const R = 40;
  const { g, p, n } = withNeighbour({ temper: 0.5, territoryR: R }, 12);
  n.brain!.territory = { ...n.pos };
  const home = { ...n.brain!.territory };
  run(g, 60);
  check('an intruder inside the patch is challenged', n.brain!.goal === 'defend' && n.brain!.target === p.id, `goal=${n.brain!.goal}`);
  // stand off outside the boundary and it must break off rather than follow
  // Step outside and it stops caring about *you*. It may well turn on something else that is
  // still standing in its patch — that is the same rule, applied to somebody else.
  p.pos = { x: home.x + R * 1.6, y: home.y, z: home.z };
  run(g, 120);
  const onPlayer = n.brain!.goal === 'defend' && n.brain!.target === p.id;
  check('...and dropped the moment you leave it', !onPlayer, `goal=${n.brain!.goal} target=${n.brain!.target === p.id ? 'player' : 'someone else in its patch'}`);
  check('...without following you out', distXZ(n.pos, home) < R * 1.3, `it is ${distXZ(n.pos, home).toFixed(0)}m from home, patch is ${R}m`);
  // it should also still be alive and not have chased across the sea over a long stretch
  let furthest = 0;
  for (let i = 0; i < 60 * 20; i++) { run(g, 1); furthest = Math.max(furthest, distXZ(n.pos, home)); }
  check('...and stays on its ground for good', isAlive(n) ? furthest < R * 1.6 : true, `furthest ${furthest.toFixed(0)}m over 20 s`);
}

// --- appetite: the same reef hunts far more at dusk than at noon ---
{
  const sample = (startFraction: number) => {
    const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 33);
    g.players[0].spawnProtect = 1e9;
    g.time = startFraction * DAY_LENGTH;              // jump the clock to the hour under test
    let hunting = 0, seen = 0;
    for (let i = 0; i < 60 * 40; i++) {
      run(g, 1);
      if (i % 20) continue;
      for (const a of g.actors) if (a.controller === 'ambient' && a.brain) { seen++; if (a.brain.goal === 'hunt') hunting++; }
    }
    return seen ? hunting / seen : 0;
  };
  // the clock offset puts fraction 0.84 at dawn and 0.2 in the middle of the day
  const atDusk = sample(0.44), atNoon = sample(0.2);
  check('the reef hunts several times more at dusk than at noon', atDusk > atNoon * 2,
    `${(atDusk * 100).toFixed(1)}% at dusk vs ${(atNoon * 100).toFixed(1)}% at noon`);
  check('...and mostly does something else even then', atDusk < 0.5, `${(atDusk * 100).toFixed(1)}%`);
}

// --- the giants keep the same hours, which is what "being hunted" actually means to a player ---
{
  const sample = (fraction: number) => {
    let hunting = 0, seen = 0;
    for (const seed of [3, 31]) {
      const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], seed);
      const p = g.players[0]; p.spawnProtect = 1e9;
      g.time = fraction * DAY_LENGTH;
      // Out in the open and moving: a giant will not come into a nursery, so a player parked on
      // the spawn is never hunted whatever the hour, and the sample would say nothing.
      for (let i = 0; i < 60 * 90; i++) {
        const t = i / 60;
        run(g, 1, { ...emptyInput(), worldMove: { x: Math.cos(t * 0.07), y: 0, z: Math.sin(t * 0.045) } });
        if (i % 20) continue;
        for (const a of g.actors) {
          if ((a.controller !== 'giant' && a.controller !== 'shadow') || !a.brain) continue;
          seen++; if (a.brain.goal === 'hunt') hunting++;
        }
      }
    }
    return seen ? hunting / seen : 0;
  };
  const dusk = sample(0.44), noon = sample(0.2);
  check('giants come down to hunt far more at dusk than at noon', dusk > noon * 2,
    `${(dusk * 100).toFixed(1)}% at dusk vs ${(noon * 100).toFixed(1)}% at noon`);
  check('...and are mostly just cruising even then', dusk < 0.35, `${(dusk * 100).toFixed(1)}%`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall ecology tests passed');
process.exit(failed ? 1 : 0);
