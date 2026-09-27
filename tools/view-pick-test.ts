/**
 * Which bodies get a mesh: the far field reaches as far as the water lets you see, and nothing
 * sitting on a threshold is drawn and dropped on alternate frames. Run: npm run views
 */
import { drawable, drawDistance, FOG_GONE, SIZE_FLOOR, viewRank } from '../src/render/view-pick';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(64)} ${d}`); if (!ok) failed++; };
const NEAR = 30;

// The fog as the sea sets it for a big animal (density 0.0125 × 0.62) and for a hatchling (× 1.15).
const bigFog = 0.0125 * 0.62, smallFog = 0.0125 * 1.15;
const seeBig = drawDistance(bigFog, 1), seeSmall = drawDistance(smallFog, 1);
const haze = (density: number, d: number) => 1 - Math.exp(-((density * d) ** 2));
check('a big animal sees further than a hatchling', seeBig > seeSmall, `${seeBig.toFixed(0)} against ${seeSmall.toFixed(0)} units`);
check('...and the limit is where the fog has taken 95 %', Math.abs(haze(bigFog, seeBig) - 0.95) < 0.005, `${(haze(bigFog, seeBig) * 100).toFixed(1)} %`);
check('a 17-unit giant at 135 units is drawn (it used to be cut at 130)', drawable(135, 17 / 135, seeBig, NEAR, false, false),
  `${(haze(bigFog, 135) * 100).toFixed(0)} % hazed`);
check('...but not one the fog has swallowed', !drawable(seeBig * 1.5, 17 / (seeBig * 1.5), seeBig, NEAR, false, false));
check('three or four players still draw nearer, as before', drawDistance(bigFog, 4) < seeBig);
check('the constant is the 95 % point', Math.abs(1 - Math.exp(-(FOG_GONE ** 2)) - 0.95) < 1e-9);

// A body sitting on a threshold, wobbling across it every frame as it swims.
const wobble = (thresholdDist: number, size: (d: number) => number, see: number) => {
  let shown = false, changes = 0;
  for (let f = 0; f < 240; f++) {
    const d = thresholdDist * (1 + 0.04 * Math.sin(f * 0.9));
    const now = drawable(d, size(d), see, NEAR, shown, false);
    if (now !== shown) changes++;
    shown = now;
  }
  return changes;
};
// A school fish exactly on the size floor.
const fishLen = 0.6, onFloor = fishLen / SIZE_FLOOR;
check('a fish wobbling on the size floor is not drawn and dropped every frame', wobble(onFloor, (d) => fishLen / d, 400) <= 1,
  `${wobble(onFloor, (d) => fishLen / d, 400)} changes in 240 frames`);
// A giant exactly on the edge of the fog.
check('...nor a giant wobbling on the edge of the fog', wobble(seeBig, (d) => 17 / d, seeBig) <= 1,
  `${wobble(seeBig, (d) => 17 / d, seeBig)} changes in 240 frames`);
// Two bodies of the same size near the cap: the one already drawn stays ahead.
check('a body already drawn outranks a new one its own size', viewRank(0.05, 60, NEAR, true) > viewRank(0.05, 60, NEAR, false));
check('...but a clearly bigger newcomer still takes its place', viewRank(0.1, 60, NEAR, false) > viewRank(0.05, 60, NEAR, true));
check('what is in front of you is always drawn', drawable(5, 0.001, seeBig, NEAR, false, false));

console.log(failed ? `\n${failed} FAILED` : '\nall view tests passed');
process.exit(failed ? 1 : 0);
