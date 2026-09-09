/**
 * Palaeoisopus — articulated attack and feeding pass (Devonian sea spider).
 *
 * A pair of chelifores (scape1 → scape2 → chela + finger, L at +X) ahead of the head, a pair of
 * nine-jointed palps beside them, a pair of eleven-jointed ovigers folded back under the body,
 * and four pairs of long many-jointed walking legs (WL1..4, L/R). The proboscis hangs under the
 * body pointing down and back, with the mouth at its tip. So a strike is the chelifores folding
 * at the scape joints, reaching and the finger closing, then recovering, while the front legs
 * fold and brace; feeding is the chelifores bringing the catch down and back under the head as
 * the proboscis swings forward to meet it, the palps steadying, the ovigers working. Insect and
 * spider timing is only the analogy — nothing is added that the model does not have.
 */
import { ss, arc, hold, UP, DOWN, FWD, BACK } from '../lib.mjs';
import { chain, wave, range } from '../common.mjs';

const SIDES = [['L', 1], ['R', -1]];
const inward = (sx) => [-sx, 0, 0], outward = (sx) => [sx, 0, 0];
const legNames = (rig, n, s) => rig.names(new RegExp(`^WL${n}${s}_\\d+$`));

function legs(P, t, env, { brace = 0, amp = .16, loopU } = {}) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (const [s, sx] of SIDES) for (let n = 1; n <= 4; n++) {
    const L = legNames(P.rig, n, s), phase = ph - n * .8 + (sx < 0 ? Math.PI : 0);
    L.forEach((b, i) => { P.bend(b, FWD, (i < 2 ? .05 : .015) * amp * env * Math.sin(phase)); if (i > 1 && i < 6) P.bend(b, DOWN, .06 * brace); });
  }
  for (let i = 1; i <= 3; i++) P.bend(`trunk${i}`, UP, .01 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - i * .5));
  for (let i = 0; i < 5; i++) if (P.rig.has(`abdomen_${i}`)) P.bend(`abdomen_${i}`, UP, .015 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - 2 - i * .4));
}
/** A chelifore: `cock` folds it up and back at the scape, `reach` extends it forward and in, `open`/`close` work the finger, `fold` brings the chela down and back under the head. */
function chelifore(P, s, sx, a) {
  const s1 = `scape1${s}`, s2 = `scape2${s}`, c = `chela${s}`, f = `finger${s}`;
  P.bend(s1, UP, (a.cock ?? 0) * .35).bend(s1, BACK, (a.cock ?? 0) * .2).bend(s2, UP, (a.cock ?? 0) * .4);
  P.bend(s1, FWD, (a.reach ?? 0) * .3).bend(s1, inward(sx), (a.reach ?? 0) * .1).bend(s2, DOWN, (a.reach ?? 0) * .25).bend(c, inward(sx), (a.reach ?? 0) * .1);
  P.bend(f, outward(sx), (a.open ?? 0) * .6).bend(f, inward(sx), (a.close ?? 0) * .5).bend(c, inward(sx), (a.close ?? 0) * .15);
  P.bend(s1, DOWN, (a.fold ?? 0) * .5).bend(s1, BACK, (a.fold ?? 0) * .35).bend(s2, DOWN, (a.fold ?? 0) * .45).bend(s2, inward(sx), (a.fold ?? 0) * .25);
}
function palps(P, k, ph) {
  for (const [s, sx] of SIDES) range(9).forEach((i) => P.bend(`palp${s}${i}`, inward(sx), .05 * k * Math.sin(ph - i * .4 + (sx < 0 ? Math.PI : 0))).bend(`palp${s}${i}`, DOWN, .03 * k * Math.sin(ph - i * .5 - 1)));
}
function ovigers(P, work, ph) {
  for (const [s, sx] of SIDES) range(11).forEach((i) => P.bend(`oviger${s}${i}`, inward(sx), .04 * work * Math.sin(ph - i * .5 + (sx < 0 ? Math.PI : 0))));
}
/** The proboscis hangs down and back; swinging it forward brings the mouth under the chelae. */
const proboscis = (P, fwd, pump = 0) => { P.bend('proboscis', FWD, .9 * fwd); P.bend('oralTip', FWD, .3 * fwd + .1 * pump); };
const body = (P, { noseDown = 0, fwd = 0, down = 0 }) => { P.spin('body', [1, 0, 0], noseDown); if (fwd || down) P.shift('body', [0, -down, fwd]); };

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // The chelifores flick forward and the fingers snap; the front legs brace.
    pose(u, P, t) {
      const A = arc(0, .26, u), S = hold(.14, .3, .42, .86, u), C = hold(.2, .3, .46, .86, u);
      for (const [s, sx] of SIDES) chelifore(P, s, sx, { cock: .5 * A * (1 - S), open: .9 * A * (1 - C), reach: .9 * S, close: 1.0 * C });
      body(P, { noseDown: .03 * S, fwd: .02 * S });
      palps(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      legs(P, t, Math.sin(Math.PI * u) ** 2, { brace: .5 * S });
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Deliberate: the chelifores fold up and back and the fingers open over the wind-up as the
    // front legs plant, then a directed reach with both, fingers closing at contact, recoil.
    pose(u, P, t) {
      const W = hold(0, .3, .36, .5, u), S = hold(.36, .46, .64, .95, u), C = hold(.44, .52, .7, .95, u);
      for (const [s, sx] of SIDES) chelifore(P, s, sx, { cock: 1.3 * W, open: 1.2 * W + .5 * S * (1 - C), reach: 1.4 * S, close: 1.2 * C });
      body(P, { noseDown: -.03 * W + .07 * S, fwd: -.04 * W + .08 * S, down: -.02 * W + .03 * S });
      palps(P, Math.sin(Math.PI * u) ** 2 * .6, 2 * Math.PI * u * 3);
      legs(P, t, Math.sin(Math.PI * u) ** 2, { brace: .9 * W + .5 * S });
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // Reach, close, and draw the catch back under the head, the proboscis coming forward to it.
    pose(u, P, t) {
      const R = hold(.05, .3, .55, .9, u), O = hold(.05, .22, .3, .42, u), C = hold(.3, .4, .66, .9, u), D = hold(.42, .58, .7, .92, u);
      for (const [s, sx] of SIDES) chelifore(P, s, sx, { open: .9 * O, reach: 1.0 * R, close: 1.1 * C, fold: .8 * D });
      proboscis(P, .6 * D);
      body(P, { noseDown: .04 * R });
      palps(P, Math.sin(Math.PI * u) ** 2, 2 * Math.PI * u * 2);
      legs(P, t, Math.sin(Math.PI * u) ** 2, { brace: .4 * C });
    },
  },
  {
    name: 'Eat', duration: 1.2, loop: true,
    // Chelifores reach down, close, fold the catch back under the head while the proboscis
    // swings forward to meet it; the palps steady and the ovigers work; release at the end.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);
      const R = ss(0, .18, u) * rel, O = hold(0, .1, .14, .24, u) * rel, G = ss(.16, .26, u) * rel, Cy = ss(.26, .62, u) * rel;
      const chew = hold(.55, .65, .86, .94, u) * rel, pulse = Math.sin(2 * Math.PI * 4 * u);
      for (const [s, sx] of SIDES) chelifore(P, s, sx, { open: .8 * O, reach: 1.0 * R * (1 - .6 * Cy), close: 1.0 * G + .1 * chew * pulse, fold: 1.2 * Cy });
      proboscis(P, 1.0 * Cy, chew * pulse);
      body(P, { noseDown: .05 * Cy + .01 * chew * pulse, down: .02 * Cy });
      palps(P, .6, 2 * Math.PI * u);
      ovigers(P, .8 * chew, 2 * Math.PI * u * 2);
      legs(P, t, 1, { amp: .12, loopU: u });
    },
  },
];
