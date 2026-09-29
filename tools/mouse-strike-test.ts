/**
 * The left mouse button: what a press is by what it was on, and what holding it becomes.
 * Run: npm run mouse:strike
 */
import { CHASE_COMMIT, STRIKE_GRACE, STRIKE_HOLD, stepStrike, strikeKind, type Strike, type StrikeFacts, type StrikeOut } from '../src/shared/mouse-strike';
import { checker, finish } from './lib/test';

const check = checker(62);
const BITE = 1, POUNCE = 6;

/** A small driver: a body, a clock, one animal (id 7) at some gap, and the body's state. */
function rig(gap0: number | undefined) {
  let s: Strike | undefined;
  let now = 10, left = false, pressed = false, over = -1, state = 'free', canPounce = true;
  let gap = gap0;
  const step = (dt = 1 / 60): StrikeOut => {
    now += dt;
    const f: StrikeFacts = {
      now, left, pressed, over, gapTo: (id) => (id === 7 ? gap : undefined),
      biteReach: BITE, pounceReach: POUNCE, canPounce, state,
    };
    const r = stepStrike(s, f); s = r.strike; pressed = false;
    return r.out;
  };
  return {
    down(on: number) { left = true; pressed = true; over = on; },
    up() { left = false; },
    step, get s() { return s; },
    set state(v: string) { state = v; }, set gap(v: number | undefined) { gap = v; }, set canPounce(v: boolean) { canPounce = v; },
    run(sec: number) { let o = step(); for (let t = 1 / 60; t < sec; t += 1 / 60) o = step(); return o; },
  };
}

// What a press is decided by what it was pressed on, and how far off that is.
check('open water is a dash', strikeKind(-1, undefined, BITE, POUNCE) === 'dash');
check('an animal in reach is a bite', strikeKind(7, 0.5, BITE, POUNCE) === 'bite');
check('one further off is a pounce', strikeKind(7, 4, BITE, POUNCE) === 'pounce');
check('one out of reach is a chase', strikeKind(7, 20, BITE, POUNCE) === 'chase');

// A click on the water: the dash is thrown down the cursor's ray on its first frame, runs, and a
// button let go before it ends leaves nothing behind it.
{
  const r = rig(undefined);
  r.down(-1);
  let o = r.step();
  check('a click on the water dashes, down the cursor', o.dash && o.aimRay && o.mark === 'zoom');
  r.state = 'dodge'; r.up();
  o = r.step();
  check('...the ray is only for the throw', o.dash && !o.aimRay);
  r.state = 'free';
  o = r.step();
  check('...and a released dash ends when the dash does', !r.s && !o.dash && !o.steer);
}
// Held, the dash hands over to steering once it is over.
{
  const r = rig(undefined);
  r.down(-1); r.step(); r.state = 'dodge'; r.run(0.4); r.state = 'free';
  const o = r.step();
  check('a held dash becomes steering when it ends', o.steer && !o.dash && o.mark === 'none');
  r.up();
  check('...and letting go gives the pointer back', !r.step().steer && !r.s);
}
// A dash the body refuses (no stamina) does not leave the button asking forever.
{
  const r = rig(undefined);
  r.down(-1); r.run(STRIKE_GRACE + 0.05);
  check('a dash that never starts gives up to steering', !!r.s && r.s.kind === 'steer');
}
// An animal in reach: one bite, locked on it, then steering if held.
{
  const r = rig(0.4);
  r.down(7);
  let o = r.step();
  check('a click on an animal in reach bites it', o.bite && o.target === 7);
  r.state = 'attack';
  o = r.step();
  check('...once: the bite is an edge', !o.bite && o.target === 7);
  r.state = 'free';
  check('...and held, it steers after', r.step().steer);
}
// Further off: a pounce, asked for until it starts and kept on while held.
{
  const r = rig(4);
  r.down(7);
  let o = r.step();
  check('a click on an animal further off pounces at it', o.pounce === 7 && o.mark === 'target');
  r.state = 'pounce';
  o = r.step();
  check('...held, the pounce keeps homing', o.pounce === 7);
  r.up();
  o = r.step();
  check('...let go, it runs out on its own', o.pounce === -1 && r.s?.kind === 'pounce');
  r.state = 'free';
  check('...and is over when it lands', !r.step() .steer && !r.s);
}
// Out of reach and held: chase, locked on, until it is in reach — then pounce.
{
  const r = rig(20);
  r.down(7);
  let o = r.step();
  check('held on an animal out of reach, it chases', o.chase === 7 && o.pounce === -1 && o.mark === 'target');
  o = r.run(1);
  check('...and keeps chasing while it is out of reach', o.chase === 7);
  r.gap = POUNCE * CHASE_COMMIT + 0.1;
  check('...not at the very edge of the reach', r.step().chase === 7);
  r.gap = POUNCE * CHASE_COMMIT - 0.1;
  o = r.step();
  check('...and pounces once it is in reach', o.pounce === 7 && o.chase === -1);
}
// A chase that reaches range while the pounce is cooling down keeps chasing and tries again.
{
  const r = rig(3);
  r.down(7); r.step();
  // The body refuses it (a cooldown the press could not see coming, say) and it stays refused.
  r.canPounce = false;
  r.run(STRIKE_GRACE + 0.05);
  check('a pounce the body will not start goes back to the chase', r.s?.kind === 'chase');
  check('...and stays there while the pounce cannot be had', r.run(0.5).chase === 7);
  r.canPounce = true;
  check('...and pounces when it can', r.step().pounce === 7);
}
// A quick click on something out of reach is a pounce tried anyway.
{
  const r = rig(20);
  r.down(7); r.step(); r.up();
  const o = r.step();
  check('a click out of reach tries the pounce', o.pounce === 7);
}
// A held chase let go after the click window is simply over.
{
  const r = rig(20);
  r.down(7); r.run(STRIKE_HOLD + 0.1); r.up();
  const o = r.step();
  check('letting go of a chase ends it', !r.s && o.chase === -1 && o.pounce === -1);
}
// The animal going away ends the chase, and held, the button steers.
{
  const r = rig(20);
  r.down(7); r.step(); r.gap = undefined;
  const o = r.step();
  check('a chase whose animal is gone steers instead', o.steer && o.target === -1);
}
// Nothing happens without a press.
{
  const r = rig(4);
  const o = r.run(1);
  check('no press, no strike', !o.dash && !o.bite && o.pounce === -1 && o.chase === -1 && !o.steer && !r.s);
}
finish('PASS: a left press dashes, bites, pounces or chases by what it is on, and a hold steers');
