/**
 * A tap of A or D is a nudge and a hold grows into a full turn. Run: npm run key-turn
 */
import { turnAxis, TURN_RAMP, TURN_TAP } from '../src/shared/key-turn';
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { sampleHeight } from '../src/sim/world';
import { wrapAngle } from '../src/shared/math';
import { checker, finish } from './lib/test';

const check = checker(60);
check('a key gives nothing until it is down', turnAxis(-1) === 0 && turnAxis(NaN) === 0);
check('a tap is a nudge', Math.abs(turnAxis(0) - TURN_TAP) < 1e-9 && turnAxis(0.05) < 0.3, `${turnAxis(0.05).toFixed(2)} at 50 ms`);
check('a hold reaches a full turn', turnAxis(TURN_RAMP) === 1 && turnAxis(5) === 1);
let rising = true;
for (let t = 0; t < TURN_RAMP; t += 0.01) if (turnAxis(t + 0.01) < turnAxis(t)) rising = false;
check('...and only ever grows on the way', rising);

/** Degrees the body turns for a key held `hold` seconds while swimming forward, the view held still. */
function turned(hold: number, axis: (t: number) => number, my = 1) {
  const OPEN = { x: 10, y: sampleHeight(10, -100) + 8, z: -100 };
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 7);
  const p = g.players[0]; g.skipHatch(); p.pos = { ...OPEN }; p.yaw = 0; p.spawnProtect = 1e9;
  const swim = (mx: number, f = my) => new Map([[0, { ...emptyInput(), my: f, mx, camYaw: 0 } as InputFrame]]);
  for (let i = 0; i < 30; i++) g.step(1 / 60, swim(0, 1));
  const from = p.yaw;
  for (let t = 0; t < hold; t += 1 / 60) g.step(1 / 60, swim(axis(t)));
  // Swimming forward, the turn is read when the key comes up: the camera here holds still, where in
  // play it follows the body round, so afterwards the body would only be steering back to it.
  if (my) return Math.abs(wrapAngle(p.yaw - from)) * 180 / Math.PI;
  // long enough for a coasting body's sideways travel to finish turning it
  for (let i = 0; i < 90; i++) g.step(1 / 60, swim(0));
  return Math.abs(wrapAngle(p.yaw - from)) * 180 / Math.PI;
}
const tap = turned(0.1, turnAxis), oldTap = turned(0.1, () => 1), hold = turned(0.8, turnAxis);
check('a tap turns the body a little', tap > 0.2 && tap < 6, `${tap.toFixed(1)}° for a tenth of a second`);
check('...much less than the same tap used to', tap < oldTap * 0.5, `${tap.toFixed(1)}° against ${oldTap.toFixed(1)}°`);
check('...and a hold still turns it hard', hold > tap * 4, `${hold.toFixed(1)}° for most of a second`);
// Coasting, a turn key is the whole stick, so the sideways travel it starts carries on turning the
// body after the key is up; that is where a tap used to overshoot the most.
const coast = turned(0.1, turnAxis, 0), oldCoast = turned(0.1, () => 1, 0);
check('a tap while coasting settles on a small turn', coast < 15 && coast < oldCoast * 0.5, `${coast.toFixed(1)}° against ${oldCoast.toFixed(1)}° before`);
finish('all key-turn tests passed');
