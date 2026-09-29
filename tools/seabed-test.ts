/**
 * What a body lying on the seabed rests on, and the one animal that buries itself by lying still.
 * Run: npm run seabed (all three eras), or node tools/test.mjs seabed:<era>
 *
 *  - **The floor a body is held above is the floor that is drawn.** The terrain's near tiles are
 *    straight-edged triangles over the field, and in a hollow a triangle stands above the field;
 *    a body held to the field alone was drawn under the sand (`drawnSeabed`). And a rock's top is
 *    its mesh's own measured top (`PropShape.top`), not a dome over its footprint, which the
 *    authored rocks stood a third to a half of their height above. Both are held here by driving a
 *    swimmer across the real seabed and every rock near it: its centre never goes under either.
 *  - **Only a walker is a seafloor animal.** A ray-shaped placoderm lies on the sand all day and
 *    swims like a fish; `ground` is for the trilobites and their like.
 *  - **Gemuendina buries itself by lying still** (`stillBurrow`): still on open sand for
 *    `STILL_BURY` it works itself under, a rock is not sand, and moving brings it back out.
 *
 * The era is selected before the simulation modules are imported, because those read ACTIVE_ERA at
 * module top (the same order the entry pages use).
 */
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';
import { checker, finish } from './lib/test';

const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
selectEra(which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN);

const { Game } = await import('../src/sim/game');
const { emptyInput } = await import('../src/sim/types');
const { applyScaleStats, floorClearance, lengthOf } = await import('../src/sim/actors');
const { creature, PLAYABLE } = await import('../src/sim/creatures');
const { boulderTop, drawnSeabed, groundHeight, sampleHeight, shoreDistance, SEABED_STEP } = await import('../src/sim/world');
const { STILL_BURY, STILL_SETTLE } = await import('../src/sim/concealment');
const { moundLevel } = await import('../src/render/shore-fx');
const { habitatBand } = await import('../src/app/depth-layout');
type Actor = import('../src/sim/types').Actor;
type InputFrame = import('../src/sim/types').InputFrame;
type Game = import('../src/sim/game').Game;
type CreatureId = import('../src/sim/creatures').CreatureId;

const check = checker(66);
const DT = 1 / 60;

/** One actor, alone, stepped as the game steps it (the travel `followFloor` trades is from `prevT`). */
function tick(g: Game, a: Actor, input: Partial<InputFrame> = {}, n = 1) {
  const f = { ...emptyInput(), ...input };
  for (let i = 0; i < n; i++) {
    a.prevT = { ...a.pos, yaw: a.yaw, pitch: a.pitch, bank: a.bank };
    g.updateActor(a, f, DT);
  }
}
function alone(id: CreatureId, scale: number, seed = 7) {
  const g = new Game('rise', [{ creature: id, device: 'keyboard', ready: true }], seed);
  g.skipHatch();
  const a = g.players[0];
  g.actors.splice(0, g.actors.length, a);
  a.scale = scale; applyScaleStats(a, false); a.stamina = a.staminaMax; a.state = 'free'; a.spawnProtect = 0;
  return { g, a };
}
const place = (g: Game, a: Actor, x: number, z: number) => {
  g.world.loadAround({ x, y: 0, z });
  a.pos = { x, y: groundHeight(g.world, x, z, []) + floorClearance(a), z };
  a.vel = { x: 0, y: 0, z: 0 }; a.hideMode = 'none'; a.hideT = 0; a.hideCd = 0; a.stillT = 0;
};

// ---- the drawn seabed is what the triangles say, and the floor is never under it ----
{
  let worstUnder = 0, above = 0, n = 0;
  for (let k = 0; k < 4000; k++) {
    const x = -900 + (k * 37.13) % 1800, z = -60 - ((k * 71.7) % 900);
    if (shoreDistance(x, z) < 10) continue;
    n++;
    // At a grid vertex the drawn surface is the field itself.
    const gx = Math.round(x / SEABED_STEP) * SEABED_STEP, gz = Math.round(z / SEABED_STEP) * SEABED_STEP;
    worstUnder = Math.max(worstUnder, Math.abs(drawnSeabed(gx, gz) - sampleHeight(gx, gz)));
    if (drawnSeabed(x, z) > sampleHeight(x, z) + 0.05) above++;
  }
  check('the drawn seabed meets the field at its vertices', worstUnder < 1e-9, `worst ${worstUnder.toExponential(1)}`);
  check('...and stands above it somewhere, which is the point of holding bodies to it', above > 0, `${above} of ${n} points more than 0.05 above`);
}

// ---- a swimmer driven across the seabed and at every rock is never under either ----
const swimmer = (which === 'devonian' ? 'gemuendina' : PLAYABLE.find((d) => !d.ground)!.id) as CreatureId;
for (const scale of [0.4, 1]) {
  const { g, a } = alone(swimmer, scale, 11);
  const origin = a.pos;
  g.world.loadAround(origin);
  const rocks = g.world.boulders.filter((b) => b.floor === undefined && Math.hypot(b.pos.x - origin.x, b.pos.z - origin.z) < 90).slice(0, 40);
  let steps = 0, worst = 0, over = 0, where = '';
  for (const b of rocks) {
    // Start a body length and a half out from the rock on the floor, and swim straight at it.
    const L = lengthOf(a), ang = (b.pos.x * 13.7 + b.pos.z * 7.1) % (Math.PI * 2);
    const start = b.radius + L * 1.5;
    place(g, a, b.pos.x + Math.sin(ang) * start, b.pos.z + Math.cos(ang) * start);
    a.yaw = ang + Math.PI;
    const toward = { x: -Math.sin(ang), y: 0, z: -Math.cos(ang) };
    for (let i = 0; i < 180; i++) {
      tick(g, a, { worldMove: toward });
      steps++;
      const floor = groundHeight(g.world, a.pos.x, a.pos.z, []);
      const under = floor - a.pos.y;
      if (under > worst) { worst = under; where = `${b.variant ?? 'boulder'} at (${b.pos.x.toFixed(0)}, ${b.pos.z.toFixed(0)})`; }
      if (boulderTop(b, a.pos.x, a.pos.z) !== undefined) over++;
    }
  }
  check(`${swimmer} at ${scale}: swims at ${rocks.length} rocks with its centre never under the floor`, rocks.length > 5 && worst < 0.02,
    `worst ${worst.toFixed(3)} under${where ? ' at a ' + where : ''}, ${steps} steps`);
  check(`${swimmer} at ${scale}: ...and some of that was across the rocks' tops`, over > 50, `${over} steps over a rock`);
}

// ---- only a walker lives on the seafloor ----
if (which === 'devonian') {
  for (const id of ['gemuendina', 'bothriolepis'] as const)
    check(`${id} is a swimmer, not a walker`, !creature(id).ground);
  check('Gemuendina still lives on the floor in the Size view', habitatBand(creature('gemuendina')) === 'floor');
  for (const id of ['eldredgeops', 'walliserops', 'furcaster', 'jaekelopterus'] as const)
    check(`${id} walks the floor`, creature(id).ground);
}

// ---- Gemuendina lies still, and the sand closes over it ----
if (which === 'devonian') {
  const { g, a } = alone('gemuendina', 1, 3);
  // Open sand: a point with no rock under it.
  let sand = { x: a.pos.x, z: a.pos.z };
  for (let k = 0; k < 400; k++) {
    const x = a.pos.x + ((k * 17.3) % 60) - 30, z = a.pos.z + ((k * 29.1) % 60) - 30;
    g.world.loadAround({ x, y: 0, z });
    if (groundHeight(g.world, x, z, []) <= sampleHeight(x, z) + 1e-6 && groundHeight(g.world, x + 2, z + 2, []) <= sampleHeight(x + 2, z + 2) + 1e-6) { sand = { x, z }; break; }
  }
  place(g, a, sand.x, sand.z);
  tick(g, a, {}, 30);                                     // settle onto the sand
  a.stillT = 0;
  tick(g, a, {}, Math.round((STILL_BURY - 0.2) / DT));
  check('not yet: lying still for a moment is only lying still', a.hideMode === 'none', a.hideMode);
  tick(g, a, {}, Math.round(0.4 / DT));
  check('still long enough, it works itself under', a.hideMode === 'descending', a.hideMode);
  check('...and the sand starts to heap over it', moundLevel(a.hideMode, a.hideT) > 0);
  tick(g, a, {}, Math.round((STILL_SETTLE + 0.3) / DT));
  check('and then the sand closes over it', a.hideMode === 'burrowed', a.hideMode);
  check('...under a full mound', moundLevel(a.hideMode, a.hideT) === 1);
  tick(g, a, {}, 600);
  check('it stays buried for as long as it keeps still', a.hideMode === 'burrowed', a.hideMode);
  tick(g, a, { worldMove: { x: 1, y: 0, z: 0 } }, 1);
  check('moving brings it out', a.hideMode === 'none', a.hideMode);
  check('...as itself, not as an ambush (that is the attack buttons\')', a.state !== 'attack', a.state);
  check('...and no mound is left over it', moundLevel(a.hideMode, a.hideT) === 0);

  place(g, a, sand.x, sand.z);
  tick(g, a, {}, Math.round((STILL_BURY + 0.2) / DT));
  tick(g, a, { worldMove: { x: 0, y: 0, z: 1 } }, 1);
  check('moving while it is still working itself under stops the burrow', a.hideMode === 'none', a.hideMode);

  place(g, a, sand.x, sand.z);
  let buried = false;
  for (let i = 0; i < 360; i++) { tick(g, a, { worldMove: { x: Math.sin(i * 0.05), y: 0, z: Math.cos(i * 0.05) } }); buried ||= a.hideMode !== 'none'; }
  check('a body that keeps moving never buries itself', !buried);

  // A rock is not sand: lying still on one does nothing.
  const rock = g.world.boulders.find((b) => b.floor === undefined && !b.variant && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 120 && b.sx > lengthOf(a));
  if (rock) {
    a.pos = { x: rock.pos.x, y: groundHeight(g.world, rock.pos.x, rock.pos.z, []) + floorClearance(a), z: rock.pos.z };
    a.vel = { x: 0, y: 0, z: 0 }; a.hideMode = 'none'; a.hideCd = 0; a.stillT = 0;
    tick(g, a, {}, Math.round((STILL_BURY + STILL_SETTLE + 1) / DT));
    check('lying still on a rock buries nothing', a.hideMode === 'none', a.hideMode);
  } else check('found a rock big enough to lie on', false);
}

finish(`seabed (${which}): all checks passed`);
