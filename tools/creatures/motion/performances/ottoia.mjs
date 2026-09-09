/**
 * Ottoia — the Grab loop the hold needs.
 *
 * A priapulid worm: sixteen trunk rings (body_00..15) behind a four-jointed introvert
 * (introvert_00..03) that carries the mouth at its tip. It has nothing to grip with but the
 * everted, hooked introvert, so the hold is the introvert curled down over the catch and the
 * front rings compressed behind it, pulsing as the worm works to swallow. A held pose that never
 * opens, because the game starts it when the grip closes and loops it while clinging.
 */
import { DOWN, UP } from '../lib.mjs';
import { chain, range, pad } from '../common.mjs';

const INTRO = range(4).map((i) => `introvert_${pad(i)}`);
const RINGS = range(16).map((i) => `body_${pad(i)}`);

export const clips = [
  {
    name: 'Grab', duration: 1.2, loop: true,
    pose(u, P) {
      const ph = 2 * Math.PI * u;
      chain(P, INTRO, DOWN, .3 + .03 * Math.sin(ph), (i) => .6 + .4 * i / 3);
      P.shift('body_00', [0, 0, -.04 - .02 * Math.sin(ph)]);
      RINGS.slice(0, 6).forEach((b, i) => P.bend(b, UP, .02 * Math.sin(ph - i * .7)));
      RINGS.slice(6).forEach((b, i) => P.bend(b, UP, .008 * Math.sin(ph - i * .4 - 3)));
    },
  },
];
