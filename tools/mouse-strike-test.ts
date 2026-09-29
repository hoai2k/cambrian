/**
 * The mouse's buttons: a left click is the attack its place calls for, decided on the release; a
 * double-click's second press acts at once; a left hold or a left drag steers; a right hold aims and
 * its release on an animal pounces. Run: npm run mouse:strike
 */
import { clickKind, freshStrike, STRIKE_DOUBLE, STRIKE_DRAG, STRIKE_GRACE, STRIKE_HOLD, stepStrike, type StrikeFacts, type StrikeOut, type StrikeState } from '../src/shared/mouse-strike';
import { checker, finish } from './lib/test';

const check = checker(62);
const BITE = 1;

/** A small driver: a body, a clock, one animal (id 7) at some gap, and the body's state. */
function rig(gap0: number | undefined) {
  let st: StrikeState = freshStrike();
  let now = 10, left = false, pressed = false, over = -1, state = 'free', moved = 0;
  let aimRelease: number | undefined;
  let gap = gap0;
  const step = (dt = 1 / 60): StrikeOut => {
    now += dt;
    const f: StrikeFacts = {
      now, left, pressed, moved, over, aimRelease, gapTo: (id) => (id === 7 ? gap : undefined), biteReach: BITE, state,
    };
    const r = stepStrike(st, f); st = r.state; pressed = false; aimRelease = undefined;
    return r.out;
  };
  const run = (sec: number) => { let o = step(); for (let t = 1 / 60; t < sec; t += 1 / 60) o = step(); return o; };
  return {
    down(on: number) { left = true; pressed = true; over = on; moved = 0; },
    up() { left = false; },
    move(px: number) { moved += px; },
    letGoOfAim(on: number) { aimRelease = on; },
    step, run, get s() { return st.strike; },
    set state(v: string) { state = v; }, set gap(v: number | undefined) { gap = v; },
  };
}

// What a click is decided by what it was on, and how far off that is.
check('a click on open water is a dash', clickKind(-1, undefined, BITE) === 'dash');
check('on an animal in reach, a bite', clickKind(7, 0.5, BITE) === 'bite');
check('on one further off, a pounce', clickKind(7, 4, BITE) === 'pounce');
check('...however far', clickKind(7, 40, BITE) === 'pounce');

// A press waits: until it comes up it is not known to be a click.
{
  const r = rig(undefined);
  r.down(-1);
  const o = r.step();
  check('a press does nothing until it is known what it is', !o.dash && !o.steer && o.pounce === -1 && o.mark === 'none');
  r.up();
  const c = r.step();
  check('...and let go quickly, it dashes at the water', c.dash && c.aimRay && c.mark === 'zoom');
  r.state = 'dodge'; r.step(); r.state = 'free';
  check('...and the dash ends when the dash does', !r.step().dash && !r.s);
}
// Held, the press steers — and a press that travels steers at once.
{
  const r = rig(undefined);
  r.down(-1);
  const o = r.run(STRIKE_HOLD + 0.05);
  check('a held press steers', o.steer && !o.dash);
  r.up();
  const u = r.step();
  check('...and letting go gives the pointer back, and throws nothing', !u.steer && !u.dash && !r.s);
  r.down(-1); r.step(); r.move(STRIKE_DRAG + 2);
  check('a press that travels steers before the hold is up', r.step().steer);
  r.up(); r.step();
}
// A held press on an animal steers too: holding is swimming, whatever is under it.
{
  const r = rig(20);
  r.down(7);
  const o = r.run(STRIKE_HOLD + 0.05);
  check('a hold on an animal steers rather than attacking', o.steer && o.pounce === -1 && !o.bite);
}
// Clicks on animals: a bite in reach, a pounce further off, both on the animal clicked.
{
  const r = rig(0.4);
  r.down(7); r.step(); r.up();
  const o = r.step();
  check('a click on an animal in reach bites it', o.bite && o.target === 7);
  r.state = 'attack';
  check('...once: the bite is an edge', !r.step().bite);
}
{
  const r = rig(20);
  r.down(7); r.step(); r.up();
  const o = r.step();
  check('a click on an animal further off pounces at it', o.pounce === 7 && o.mark === 'target');
  r.state = 'pounce';
  check('...released, the pounce runs out on its own', r.step().pounce === -1 && r.s?.kind === 'pounce');
  r.state = 'free';
  check('...and is over when it lands', !r.step().steer && !r.s);
}
// A double-click's second press acts at once, and held, keeps going and then steers.
{
  const r = rig(undefined);
  r.down(-1); r.step(); r.up(); r.step(); r.state = 'dodge'; r.step(); r.state = 'free'; r.step();
  r.down(-1);
  const o = r.step();
  check('the second press of a double-click dashes at once', o.dash && o.aimRay);
  r.state = 'dodge'; r.run(0.3); r.state = 'free';
  check('...held, the dash hands over to steering', r.step().steer);
  r.up(); r.step();
}
{
  const r = rig(20);
  r.down(7); r.step(); r.up(); r.step(); r.state = 'pounce'; r.step(); r.state = 'free'; r.step();
  r.down(7);
  const o = r.step();
  check('a double-click on an animal pounces at once', o.pounce === 7);
  r.state = 'pounce';
  check('...and held, keeps homing', r.step().pounce === 7);
  r.up(); r.step(); r.state = 'free'; r.step();
}
// Two clicks further apart than a double are two clicks, each waiting for its release.
{
  const r = rig(undefined);
  r.down(-1); r.step(); r.up(); r.step(); r.state = 'dodge'; r.step(); r.state = 'free'; r.step();
  r.run(STRIKE_DOUBLE + 0.1);
  r.down(-1);
  check('a press long after a click waits again', !r.step().dash);
  r.up(); r.step();
}
// A dash the body refuses (no stamina) does not leave the button asking forever.
{
  const r = rig(undefined);
  r.down(-1); r.step(); r.up(); r.run(STRIKE_GRACE + 0.05);
  check('a dash that never starts gives up', !r.s);
}
// The animal going away ends a pounce.
{
  const r = rig(20);
  r.down(7); r.step(); r.up(); r.step(); r.gap = undefined;
  const o = r.step();
  check('a pounce whose animal is gone is over', o.pounce === -1 && !r.s);
}
// The right button: letting go of aim on an animal pounces, on nothing it simply ends.
{
  const r = rig(20);
  r.letGoOfAim(7);
  check('letting go of aim on an animal pounces at it', r.step().pounce === 7);
  const q = rig(20);
  q.letGoOfAim(-1);
  const o = q.step();
  check('...and on nothing, nothing happens', o.pounce === -1 && !o.dash && !q.s);
}
// Nothing happens without a press.
{
  const r = rig(4);
  const o = r.run(1);
  check('no press, no strike', !o.dash && !o.bite && o.pounce === -1 && !o.steer && !r.s);
}
finish('PASS: a click attacks what it is on, a double-click at once, a hold or a drag steers, and letting go of aim pounces');
