/**
 * Leanchoilia — articulated attack and feeding pass.
 *
 * The animal fights and feeds with its two great appendages: a stout two-joint arm
 * (great_base → great_hand) carrying three claws (claw_s_j_00/01), each trailing a long
 * sensory flagellum (flagellum_s_j_00..06). The arm leads, the claws follow, the whips lag:
 * every strike travels proximal → distal, and the flagella are passive, so they bend against
 * the direction of motion and ring down afterwards. Food is taken to the ventral mouth under
 * the head (anchor_mouth), which is behind and below the appendage bases, so a carry is the
 * arm folding back and inward, not a reach.
 *
 * Frame: +Z forward, +Y up, +X the animal's left; side s = 1 is left, -1 right.
 */
import { ss, arc, hold, lag, ring, UP, DOWN, FWD, BACK, side } from '../lib.mjs';

const SIDES = [1, -1];
const CLAWS = [0, 1, 2];
const FLAG = [0, 1, 2, 3, 4, 5, 6];

/** Low-amplitude locomotor ripple so the trunk never freezes behind a one-shot. */
function ripple(P, u, t, env, amp = 0.16, loopU) {
  const ph = loopU === undefined ? 2 * Math.PI * t / 1.2 : 2 * Math.PI * loopU;
  for (let i = 0; i < 11; i++) {
    const seg = `segment_${String(i).padStart(2, '0')}`;
    P.bend(seg, [1, 0, 0], .009 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - i * .39)).bend(seg, UP, .008 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - i * .32));
    for (const s of SIDES) {
      const phase = ph - i * .75 + (s < 0 ? Math.PI : 0);
      for (let k = 0; k < 3; k++) {
        const b = `leg_${s}_${String(i).padStart(2, '0')}_${k}`;
        P.bend(b, FWD, (k === 0 ? .05 : .025) * amp * env * Math.sin(phase)).bend(b, DOWN, .035 * amp * env * Math.cos(phase + .5 * k));
      }
      P.bend(`paddle_${s}_${String(i).padStart(2, '0')}`, FWD, .06 * amp * env * Math.sin(phase + .4));
    }
  }
  P.bend('tail', UP, .05 * amp * env * Math.sin((loopU === undefined ? ph / 2 : ph) - 4.4));
}

function eyes(P, k) { for (const s of SIDES) for (const j of [0, 1]) P.bend(`eye_${s}_${j}`, FWD, .06 * k); }

/**
 * One great appendage. Angles are anatomical: `base` moves the whole arm at the shoulder,
 * `hand` the elbow, `claw` curls all three claws (the middle one a little harder), `open`
 * splays them, `whip` is the passive flagellum bend (positive = trailing up and out).
 */
function arm(P, s, a) {
  const d = side(s);
  const base = `great_base_${s}`, hand = `great_hand_${s}`;
  P.bend(base, FWD, a.baseFwd ?? 0).bend(base, DOWN, a.baseDown ?? 0).bend(base, d.in, a.baseIn ?? 0);
  P.bend(hand, FWD, a.handFwd ?? 0).bend(hand, d.in, a.handIn ?? 0).bend(hand, DOWN, a.handDown ?? 0);
  for (const j of CLAWS) {
    const w = j === 1 ? 1.15 : .9;
    const c0 = `claw_${s}_${j}_00`, c1 = `claw_${s}_${j}_01`;
    // Open = splay outward and up, unequal per claw so the three read separately.
    const spread = (a.open ?? 0) * (j === 0 ? 1.1 : j === 2 ? .8 : 1);
    P.bend(c0, d.out, spread * .7).bend(c0, j === 2 ? DOWN : UP, spread * .45 * (j === 2 ? 1 : .6));
    // Curl = fold in toward the midline and down toward the feeding groove, distal joint harder.
    P.bend(c0, d.in, (a.claw ?? 0) * w * .55).bend(c0, DOWN, (a.claw ?? 0) * w * .2);
    P.bend(c1, d.in, (a.claw ?? 0) * w * .85).bend(c1, DOWN, (a.claw ?? 0) * w * .3);
    for (const k of FLAG) {
      const f = `flagellum_${s}_${j}_${String(k).padStart(2, '0')}`;
      const wk = (a.whip?.(k, j) ?? 0) * (a.settle ?? 1); // whips lag, so they are damped to nothing before a one-shot ends
      P.bend(f, UP, wk * .7).bend(f, d.out, wk * .45 + (a.whipOut?.(k) ?? 0));
      if (a.undulate) P.bend(f, UP, a.undulate * Math.sin(a.undulateT - k * .9 - j * .7)).bend(f, d.out, a.undulate * .6 * Math.cos(a.undulateT - k * .9 - j * 1.1));
    }
  }
}

function body(P, a) {
  // The body bone runs head → tail, so bending its tip up pitches the nose down.
  P.bend('body', UP, a.noseDown ?? 0);
  if (a.fwd) P.shift('body', [0, 0, a.fwd]);
  if (a.roll) P.twist('body', a.roll);
}

export const clips = [
  {
    name: 'Bite', duration: 0.5, loop: false,
    // Light attack, retimed by the engine to ~0.43 s; the engine's hit window sits at u ≈ .33–.7.
    pose(u, P, t) {
      const A = arc(0, .3, u);                              // cock: lift and open
      const S = hold(.16, .38, .44, .9, u);                 // pinch: fast in, slower out
      const whipEnv = (x) => hold(.16, .38, .44, .9, x);
      for (const s of SIDES) arm(P, s, {
        baseFwd: .28 * S, baseIn: .12 * S, baseDown: .05 * S,
        handFwd: .12 * A, handIn: .3 * S,
        open: .3 * A * (1 - S), claw: .5 * S,
        whip: (k) => .35 * (1 - k / 9) * lag(whipEnv, u, .022 * k) + .06 * ring(.5, u, 3, 5) * (k / 6), settle: 1 - ss(.88, 1, u),
      });
      body(P, { noseDown: .04 * S, fwd: .025 * S });
      eyes(P, S);
      ripple(P, u, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Heavy', duration: 1.1, loop: false,
    // Whiplash sweep: a long readable wind-up back and up, then the arms come over and
    // through in a wide arc, claws snapping shut at contact (u ≈ .5), flagella cracking after.
    pose(u, P, t) {
      const W = hold(0, .3, .34, .5, u);                    // wind-up
      const S = hold(.34, .5, .58, .95, u);                 // sweep through
      const C = hold(.44, .52, .62, .9, u);                 // claws shut at contact
      const sweepEnv = (x) => hold(.34, .5, .58, .95, x);
      const windEnv = (x) => hold(0, .3, .34, .5, x);
      for (const s of SIDES) arm(P, s, {
        baseFwd: -.45 * W + .45 * S, baseDown: -.25 * W + .3 * S, baseIn: -.55 * W + .75 * S,
        handFwd: -.25 * W + .15 * S, handIn: -.2 * W + .55 * hold(.38, .52, .6, .95, u),
        open: .4 * W + .1 * S * (1 - C), claw: .65 * C,
        whip: (k) => .55 * (1 - k / 10) * (lag(sweepEnv, u, .03 * k + .02, .08) - .4 * lag(windEnv, u, .03 * k, .08)) + .1 * ring(.6, u, 2.5, 4) * (k / 6), settle: 1 - ss(.88, 1, u),
      });
      body(P, { noseDown: -.05 * W + .07 * S, fwd: -.04 * W + .07 * S, roll: .03 * (S - W) });
      eyes(P, W + S);
      ripple(P, u, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Attack', duration: 1.1, loop: false,
    // The general strike the engine falls back on: reach out with both arms, close, and
    // draw the catch back toward the mouth before letting go.
    pose(u, P, t) {
      const R = hold(.05, .32, .55, .9, u);                 // reach
      const O = hold(.05, .25, .3, .42, u);                 // claws open on the way out
      const C = hold(.32, .42, .62, .9, u);                 // close
      const D = hold(.4, .56, .64, .9, u);                  // draw in
      const reachEnv = (x) => hold(.05, .32, .55, .9, x);
      for (const s of SIDES) arm(P, s, {
        baseFwd: .42 * R - .35 * D, baseDown: .12 * R + .2 * D, baseIn: .08 * R + .3 * D,
        handFwd: .25 * R, handIn: .35 * D, handDown: .15 * D,
        open: .32 * O, claw: .55 * C,
        whip: (k) => .4 * (1 - k / 9) * lag(reachEnv, u, .025 * k, .07) + .08 * ring(.62, u, 2.5, 4) * (k / 6), settle: 1 - ss(.88, 1, u),
      });
      body(P, { noseDown: .05 * R, fwd: .04 * R - .02 * D });
      eyes(P, R);
      ripple(P, u, t, Math.sin(Math.PI * u) ** 2);
    },
  },
  {
    name: 'Eat', duration: 1.0, loop: true,
    // Scrubbed by consumption progress in the game (pickup 0–.22, carry .22–.78, swallow .78–1):
    // reach forward and down, close on the food, fold the arms back under the head to the
    // ventral mouth, work it there, then let go and return so the clip also loops cleanly.
    pose(u, P, t) {
      const rel = 1 - ss(.9, 1, u);                         // release and return at the end
      const R = ss(0, .18, u) * rel;                        // reach
      const O = hold(0, .12, .16, .26, u) * rel;            // open on the way down
      const G = ss(.17, .27, u) * rel;                      // grasp and hold
      // Carry: the hand first swings inward across the front, then folds back (about the lateral
      // axis an inward-pointing hand barely rises about), and only then does the shoulder draw
      // the arm back and out beside the head. The claws end up under the head just ahead of the
      // mouth (solved against the rig: grasp socket ≈ 0.4 ahead of anchor_mouth, 0.3 below);
      // the game's grasp solver closes the rest. This keeps the whole path below eye level.
      const swing = ss(.22, .42, u) * rel, fold = ss(.34, .6, u) * rel, draw = ss(.46, .74, u) * rel, Cy = draw;
      const chew = hold(.66, .74, .86, .94, u) * rel;
      const pulse = Math.sin(2 * Math.PI * 4 * (u - .66));
      for (const s of SIDES) arm(P, s, {
        baseFwd: .4 * R - 1.15 * draw, baseDown: .3 * R - .3 * draw, baseIn: .05 * R - .86 * draw,
        handFwd: .25 * R - 2.2 * fold, handIn: .85 * swing + .06 * chew * pulse, handDown: .05 * fold,
        open: .3 * O, claw: .55 * G + .1 * fold + .1 * chew * pulse,
        whip: (k) => .25 * (1 - k / 9) * lag((x) => ss(0, .18, x), u, .03 * k, .08),
        whipOut: (k) => fold * (.1 + .02 * k) * (1 - k / 12),
        undulate: .04 * rel * Cy, undulateT: 2 * Math.PI * t / 1.4, settle: rel,
      });
      body(P, { noseDown: .06 * Cy + .015 * chew * pulse, fwd: .02 * R - .03 * Cy });
      eyes(P, R * (1 - Cy) * .5);
      ripple(P, u, t, 1, .12, u);
    },
  },
  {
    name: 'Grab', duration: 1.2, loop: true,
    // The hold: claws closed on the catch under the head, arms folded as at the end of the
    // carry, flagella trailing; breathes but never opens.
    pose(u, P, t) {
      const ph = 2 * Math.PI * u;
      for (const s of SIDES) arm(P, s, {
        baseFwd: -.9, baseDown: -.25, baseIn: -.7, handFwd: -1.9, handIn: .7 + .05 * Math.sin(ph), handDown: .05,
        claw: .7 + .06 * Math.sin(ph - .7), whipOut: (k) => (.1 + .02 * k) * (1 - k / 12),
        undulate: .03, undulateT: ph, settle: 1,
      });
      body(P, { noseDown: .05 + .008 * Math.sin(ph) });
      ripple(P, u, u * 1.2, 1, .12, u);
    },
  },
];
