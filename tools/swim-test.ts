/**
 * Swimming near the floor: what a sprint costs, how close to the sand you can get, and how a rock
 * behaves when you swim into it — over it, not into a wall — plus the radar's reading of height.
 */
import { Game, radarRange } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { bodyRadius, clearanceOf, climbOver, floorClearance, lengthOf } from '../src/sim/actors';
import { boulderQ, boulderTop, groundHeight, resolveStatic, sampleHeight, type Boulder, type WorldData } from '../src/sim/world';
import { PITCH_DOWN, PITCH_UP } from '../src/render/engine';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };
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
  check('q is 1 at the rim on both axes', Math.abs(boulderQ(rock, 4.08, 0) - 1) < 1e-9 && Math.abs(boulderQ(rock, 0, 1.02) - 1) < 1e-9, '');
  // A carved prop (a spire, a talus shard) carries its own tuned radius; the ellipse must not widen it.
  const spire: Boulder = { variant: 'blade-spire', pos: { x: 0, y: 0, z: 0 }, radius: 0.624 * 2, height: 8, sx: 2, sy: 2, sz: 2, rot: 0.7, shade: .7 };
  check('a carved prop keeps the radius it was given', Math.abs(boulderQ(spire, spire.radius, 0) - 1) < 1e-9 && boulderQ(spire, spire.radius * 1.2, 0) > 1,
    `radius ${spire.radius.toFixed(2)} for a mesh scaled ${spire.sx}`);
}

// --- swimming into a boulder rides over it ---
{
  const rock: Boulder = { pos: { x: 0, y: 0, z: 0 }, radius: 3 * 1.02, height: 2.6, sx: 3, sy: 2.2, sz: 3, rot: 0, shade: .7 };
  const world = rockWorld([rock]);
  const body = { radius: 0.86, climb: 2.4 };                 // an adult Anomalocaris
  // Walk a body straight across the rock at the height it would be riding at, resolving each step.
  let blocked = 0, worstLift = 0, y = -0.6, x = -6;
  const stepsAcross = 240;
  for (let i = 0; i < stepsAcross; i++) {
    const p = { x, y, z: 0 };
    const before = p.x;
    if (resolveStatic(world, p, body.radius, [], 0, body.climb)) blocked++;
    x = p.x + 0.05;                                           // 3 units/s at 60 Hz
    const floor = Math.max(-1000, boulderTop(rock, p.x, 0) ?? -1000);
    const lift = Math.max(0, floor - y);
    worstLift = Math.max(worstLift, lift);
    if (lift > 0) y = floor;                                  // the floor clamp carries it up
    void before;
  }
  check('a swimmer crosses a boulder instead of stopping at it', x > 5, `ended at x=${x.toFixed(1)} after ${stepsAcross} steps`);
  check('...and is never pushed back by it', blocked === 0, `${blocked} wall contacts`);
  check('...riding up in steps small enough to read as a swim', worstLift < body.climb, `worst single lift ${worstLift.toFixed(2)} (budget ${body.climb})`);
  // A rock that genuinely towers over you is still a wall.
  const tower: Boulder = { pos: { x: 0, y: 0, z: 0 }, radius: 3, height: 14, sx: 3, sy: 12, sz: 3, rot: 0, shade: .7 };
  const p = { x: -2.5, y: -6, z: 0 };
  check('a rock standing far above you still stops you', resolveStatic(rockWorld([tower]), p, body.radius, [], 0, body.climb), `pushed to x=${p.x.toFixed(2)}`);
}

// --- and in the real sea, a rock is something the sim can carry you over ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0]; p.spawnProtect = 0;
  check('a swimmer has a climb budget, a crawler has none', climbOver(p) > 1 && climbOver(g.spawn('olenoides', 'ambient', { ...p.pos }, 1)) === 0, `${climbOver(p).toFixed(2)} units`);
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

// --- the camera can look up for what is hunting you and down for what you are hunting ---
{
  check('the view reaches well above the horizon', PITCH_UP < -0.9, `${(PITCH_UP * 180 / Math.PI).toFixed(0)}°`);
  check('...and nearly straight down', PITCH_DOWN > 1.25, `${(PITCH_DOWN * 180 / Math.PI).toFixed(0)}°`);
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

console.log(failed ? `FAILED (${failed})` : 'PASS: sprint endurance, floor grazing, rock colliders, ride-over, camera reach, radar height');
process.exit(failed ? 1 : 0);
