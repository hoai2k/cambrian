/**
 * Eating a body, and turning on each other.
 *
 * A carcass is finished in whole bites, and how many depends on its size against the eater's:
 * a snack goes down in one, something your own size takes a few, a giant takes a dozen — and
 * anything can feed on anything, however much bigger it was. Each bite reports the share of the
 * body that just came off, which is what the renderer tears away.
 *
 * Players can also fight and eat each other now, in every mode, but nothing aims at another
 * player on its own.
 */
import { Game, bitesFor } from '../src/sim/game';
import { tierScale } from '../src/sim/tiers';
import { emptyInput, TIER_NEED, type InputFrame, type WorldEvent } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { creature, type CreatureId } from '../src/sim/creatures';

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${detail}`); if (!ok) failed++; };

function twoPlayers(a: CreatureId, b: CreatureId, seed = 9) {
  const g = new Game('rise', [{ creature: a, device: 'keyboard', ready: true }, { creature: b, device: 'keyboard2', ready: true }], seed);
  g.skipHatch();   // these are questions about grown animals, not about the five seconds in the egg
  const [p, q] = g.players;
  p.spawnProtect = 0; q.spawnProtect = 0;
  return { g, p, q };
}

/** Puts a fresh corpse of `scale` right in front of the eater and eats it, reporting every bite. */
function feast(eaterId: CreatureId, foodId: CreatureId, foodScale: number, seconds = 20) {
  const g = new Game('reef', [{ creature: eaterId, device: 'keyboard', ready: true }], 5);
  const p = g.players[0];
  p.spawnProtect = 0;
  const food = g.spawn(foodId, 'ambient', { ...p.pos }, foodScale);
  food.state = 'dead'; food.hp = 0; food.corpseT = 0; food.vel = { x: 0, y: 0, z: 0 };
  const expected = bitesFor(p, food);
  const frame: InputFrame = { ...emptyInput(), light: true };
  const inputs = new Map<number, InputFrame>([[0, frame]]);
  const shares: number[] = [];
  let eating = 0;
  for (let i = 0; i < seconds * 60 && food.eaten < 1; i++) {
    // Keep the corpse in reach: a body drifts, and this test is about the eating, not the chase.
    food.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    g.step(1 / 60, inputs);
    for (const e of g.events as WorldEvent[]) if (e.kind === 'eat' && e.other === food.id) shares.push(e.strength ?? 0);
    g.events.length = 0;
    if (p.state === 'eating') eating++;
    // Hold to keep chewing; a meal interrupted (growing a tier mid-carcass, say) is bitten into
    // again, the way a player would.
    frame.light = p.state === 'eating' || i % 8 < 4;
  }
  return { expected, shares, eaten: food.eaten, seconds: eating / 60, ratio: lengthOf(food) / lengthOf(p), bites: food.eatBites };
}

// --- bite counts come from relative size ------------------------------------------------------
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 3);
  const p = g.players[0];
  const at = { ...p.pos };
  const small = g.spawn('waptia', 'ambient', at, 0.2);
  const same = g.spawn('waptia', 'ambient', at, p.scale);
  const huge = g.spawn('anomalocaris', 'ambient', at, 4);
  const r = (o: typeof small) => (lengthOf(o) / lengthOf(p)).toFixed(2);
  check('a snack goes down in one bite', bitesFor(p, small) === 1, `ratio ${r(small)} -> ${bitesFor(p, small)}`);
  check('your own size takes several', bitesFor(p, same) >= 3 && bitesFor(p, same) <= 4, `ratio ${r(same)} -> ${bitesFor(p, same)}`);
  check('a giant takes a mouthful at a time', bitesFor(p, huge) >= 8, `ratio ${r(huge)} -> ${bitesFor(p, huge)}`);
  check('bite count rises with the body', bitesFor(p, small) < bitesFor(p, same) && bitesFor(p, same) < bitesFor(p, huge), `${bitesFor(p, small)} < ${bitesFor(p, same)} < ${bitesFor(p, huge)}`);
}

// --- a small creature can finish a much larger body, in whole bites ----------------------------
{
  const big = feast('waptia', 'anomalocaris', 3.4);
  check('a small creature can eat a giant carcass', big.eaten >= 1, `ratio ${big.ratio.toFixed(1)}, finished in ${big.seconds.toFixed(1)} s`);
  check('...in the bites its size calls for', big.shares.length === big.expected, `${big.shares.length} mouthfuls, expected ${big.expected}`);
  const share = 1 / big.expected;
  check('...each one an equal share of the body', big.shares.every((s) => Math.abs(s - share) < 1e-3), `shares ${big.shares.map((s) => s.toFixed(2)).join(' ')}`);
  const nibble = feast('anomalocaris', 'waptia', 0.22);
  check('a snack still goes down whole', nibble.bites === 1 && nibble.eaten >= 1, `bites=${nibble.bites} eaten=${nibble.eaten.toFixed(2)}`);
}

// --- players can fight and eat each other -----------------------------------------------------
{
  const { g, p, q } = twoPlayers('anomalocaris', 'waptia');
  q.pos = { x: p.pos.x + lengthOf(p) * 0.3, y: p.pos.y, z: p.pos.z };
  q.hp = 12;
  const before = q.hp;
  const frame: InputFrame = { ...emptyInput(), light: true };
  const inputs = new Map<number, InputFrame>([[0, frame]]);
  for (let i = 0; i < 90; i++) {
    q.pos = { x: p.pos.x + Math.sin(p.yaw) * lengthOf(p) * 0.4, y: p.pos.y, z: p.pos.z + Math.cos(p.yaw) * lengthOf(p) * 0.4 };
    g.step(1 / 60, inputs); g.events.length = 0;
    frame.light = !(i % 20);
  }
  check('a player can hurt another player', q.hp < before || !isAlive(q), `hp ${before} -> ${q.hp.toFixed(0)} state=${q.state}`);
}
{
  const { g, p, q } = twoPlayers('anomalocaris', 'waptia');
  q.state = 'dead'; q.hp = 0; q.corpseT = 0; q.eaten = 0;
  const frame: InputFrame = { ...emptyInput(), light: true };
  const inputs = new Map<number, InputFrame>([[0, frame]]);
  let ate = false;
  for (let i = 0; i < 150 && !ate; i++) {
    q.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    g.step(1 / 60, inputs); g.events.length = 0;
    if (q.eaten > 0) ate = true;
  }
  check('a dead player can be fed on', ate, `eaten=${q.eaten.toFixed(2)}`);
}
{
  // Nothing picks another player for you. RT with a wild creature ahead pounces on it; with only
  // another player ahead it is a plain forward lunge, because the auto-target skips players.
  const pounceAt = (kind: 'wild' | 'player') => {
    const { g, p, q } = twoPlayers('waptia', 'waptia');
    const ahead = { x: p.pos.x + Math.sin(p.yaw) * 3, y: p.pos.y, z: p.pos.z + Math.cos(p.yaw) * 3 };
    if (kind === 'wild') { g.spawn('waptia', 'ambient', ahead, p.scale * 0.8); q.pos = { x: p.pos.x, y: p.pos.y - 60, z: p.pos.z }; }
    else q.pos = ahead;
    const inputs = new Map<number, InputFrame>([[0, { ...emptyInput(), heavy: true }]]);
    for (let i = 0; i < 4 && p.state !== 'pounce'; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
    return p.state;
  };
  check('RT pounces on a wild creature ahead', pounceAt('wild') === 'pounce', `state=${pounceAt('wild')}`);
  check('RT does not pounce on a player ahead', pounceAt('player') !== 'pounce', `state=${pounceAt('player')}`);
}
{
  // Deliberately aiming at one, though, is honoured: the crosshair's pick becomes the target and
  // the pounce goes in. (The renderer's aim never *snaps* onto a player — see engine.updateAim.)
  const { g, p, q } = twoPlayers('anomalocaris', 'waptia');
  q.pos = { x: p.pos.x + Math.sin(p.yaw) * 4, y: p.pos.y, z: p.pos.z + Math.cos(p.yaw) * 4 };
  const inputs = new Map<number, InputFrame>([[0, { ...emptyInput(), aim: true, aimTarget: q.id }]]);
  g.step(1 / 60, inputs); g.events.length = 0;
  check('aiming at another player takes', p.lockTarget === q.id, `lockTarget=${p.lockTarget} other=${q.id}`);
  const strike = new Map<number, InputFrame>([[0, { ...emptyInput(), aim: true, aimTarget: q.id, heavy: true }]]);
  for (let i = 0; i < 4 && p.state !== 'pounce'; i++) { g.step(1 / 60, strike); g.events.length = 0; }
  check('...and RT pounces at them', p.state === 'pounce', `state=${p.state} inRange=${p.aimInRange}`);
}

// --- a bigger animal needs bigger prey to fill up ---
{
  const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 12);
  const p = g.players[0];
  const at = { ...p.pos };
  // Sizes are asked for as rungs rather than as raw scales: what a mouthful is worth is a question
  // about the two bodies' lengths, and the roster's animals are their own lengths now
  // (docs/research/cambrian-sizes.md), so scale 0.25 stopped meaning "a hatchling" to all of them.
  const meal = (eaterRung: number, preyRung: number, preyId: 'waptia' | 'anomalocaris' = 'waptia') => {
    p.scale = tierScale(p.creature, eaterRung);
    const food = g.spawn(preyId, 'ambient', at, tierScale(preyId, preyRung));
    const v = g.nutritionValue(p, food);
    g.remove(food);
    return v;
  };
  // The same mouthful, to two sizes of animal.
  const toSmall = meal(0, 0), toBig = meal(4, 0);
  check('a hatchling is fed by a hatchling-sized meal', toSmall > TIER_NEED[0] * 0.25,
    `${toSmall.toFixed(1)} nutrition, against ${TIER_NEED[0]} to grow`);
  check('...and the same meal is nothing to a giant', toBig < toSmall * 0.1, `${toBig.toFixed(1)} against ${toSmall.toFixed(1)}`);
  // What the giant does need is something its own size — and with the roster at its natural sizes
  // (docs/research/cambrian-sizes.md) a grown Waptia is not that however far it grows: it is a 7 cm
  // shrimp beside a 38 cm radiodont. Only one of its own is the same body.
  const toBigProper = meal(4, 4, 'anomalocaris');
  check('...which has to eat its own size to gain the same', toBigProper > toSmall * 0.8,
    `${toBigProper.toFixed(1)} nutrition from a meal its own size`);
  // And the ladder asks for more at every rung, so growth is never a matter of more small bites.
  const need = TIER_NEED.slice(0, 4);
  check('...and each rung of the ladder costs more than the last', need.every((v, i) => i === 0 || v > need[i - 1]),
    need.join(' → '));
}

console.log(failed ? `\n${failed} FAILED` : '\nall feast tests passed');
process.exit(failed ? 1 : 0);
