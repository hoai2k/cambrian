/**
 * Prints in the sand: which body leaves which mark, when a contact leaves one, what ground will
 * take one, and how long it lasts.
 *
 * Pure, because the decision is (`trackGait`, `laysMark`, `printableSand` and `trackFade` in
 * src/render/fx.ts) — the renderer keeps only the rig's lowest bones and the instanced quad, and
 * everything worth being wrong about is here. Era-free too: a beach is a beach in all three games,
 * so this asks about *bodies* rather than about rosters and runs in one process.
 */
import assert from 'node:assert/strict';
import { laysMark, printableSand, trackFade, trackGait, TRACK_LIFE, TRACK_ROCK, TRACK_WET, type TrackGait } from '../src/render/fx';

let checks = 0;
const check = (what: string, ok: boolean, detail = '') => {
  assert.ok(ok, `FAIL  ${what} ${detail}`);
  checks++;
  console.log(`PASS  ${what}${detail ? `  ${detail}` : ''}`);
};

/** A body of `length` units with a clearance a fifth of it, which is about what a swimmer has. */
const body = (o: { legs: boolean; lungs: boolean; wade?: number; length?: number }) => ({
  legs: o.legs, lungs: o.lungs, wade: o.wade ?? 1, length: o.length ?? 3, clearance: (o.length ?? 3) * 0.2,
});
const gaitFor = (o: { legs: boolean; lungs: boolean; wade?: number; length?: number }): TrackGait => {
  const g = trackGait(body(o));
  assert.ok(g, `expected a gait for ${JSON.stringify(o)}`);
  return g;
};

// ---- afloat is not ashore ----
check('a body still afloat leaves nothing', trackGait(body({ legs: true, lungs: true, wade: 0 })) === null,
  'no sand under it to print in');
check('...and the first of the wade is enough to start', trackGait(body({ legs: true, lungs: true, wade: 0.01 })) !== null);

// ---- three bodies, three marks ----
const foot = gaitFor({ legs: true, lungs: true });
const drag = gaitFor({ legs: false, lungs: true });
const slap = gaitFor({ legs: false, lungs: false });
check('legs and lungs walk, so they leave footprints', foot.kind === 'foot');
check('lungs and no legs haul themselves, so they leave a drag', drag.kind === 'drag');
check('no lungs at all is stranded, and a flop leaves a slap', slap.kind === 'slap');

// A foot puts a whole animal onto a patch of sand the size of a foot; a flank spreads it out.
check('a footprint is the smallest mark and the deepest', foot.width < drag.width && foot.depth > drag.depth,
  `foot ${foot.width.toFixed(2)} wide at ${foot.depth}, drag ${drag.width.toFixed(2)} at ${drag.depth}`);
check('a slap is the broadest and the shallowest of the three', slap.width > drag.width && slap.depth < foot.depth,
  `slap ${slap.width.toFixed(2)} wide at ${slap.depth}`);
check('a drag is drawn as a groove and a footprint as a pad', drag.groove === 1 && foot.groove === 0,
  `slap sits between them at ${slap.groove}`);

// ---- everything scales with the animal ----
const small = gaitFor({ legs: true, lungs: true, length: 1 });
const big = gaitFor({ legs: true, lungs: true, length: 12 });
check('a bigger animal leaves a bigger print', big.width > small.width * 8 && big.length > small.length * 8,
  `${small.width.toFixed(2)} → ${big.width.toFixed(2)} across`);
check('...and spaces them further apart', big.spacing > small.spacing * 8,
  `${small.spacing.toFixed(2)} → ${big.spacing.toFixed(2)}`);

// The band a contact counts as touching in is the body's own seat over the ground, not its length:
// a foot has to be nearly on the sand, a flank lying in it is a body's thickness up from the test.
check("a foot's touch band is tighter than a belly's", foot.touch < drag.touch && foot.touch < slap.touch,
  `foot ${foot.touch.toFixed(2)}, drag ${drag.touch.toFixed(2)}, slap ${slap.touch.toFixed(2)}`);
const thick = trackGait({ legs: true, lungs: true, wade: 1, length: 3, clearance: 1.2 })!;
check('...and it follows the clearance the body is seated at', thick.touch > foot.touch && thick.width === foot.width,
  `clearance 0.6 → ${foot.touch.toFixed(2)}, clearance 1.2 → ${thick.touch.toFixed(2)}, both ${foot.width.toFixed(2)} across`);

// ---- when a contact marks ----
check('a contact coming down marks where it lands', laysMark(foot, false, 0));
check('...and a foot planted there marks nothing more', !laysMark(foot, true, 0),
  'one print per plant, which is what a print is');
check('...and neither does one that has barely moved', !laysMark(foot, true, foot.spacing * 0.9));
check('a contact that keeps travelling marks again every spacing', laysMark(drag, true, drag.spacing),
  `a belly never lifts, so its groove is drawn every ${drag.spacing.toFixed(2)} units`);
check('the groove is drawn closer together than it is long', drag.spacing < drag.length,
  'so a chain of marks reads as one mark');

// ---- what ground takes a print ----
const surface = 40, reach = 36;
const beach = (o: Partial<{ sand: number; ground: number; inland: number }> = {}) => ({
  sand: o.sand ?? surface + 0.6, ground: o.ground ?? o.sand ?? surface + 0.6,
  surfaceY: surface, inland: o.inland ?? 10, reach,
});
check('dry sand up the beach takes a print', printableSand(beach()));
check('the wet strand at the water takes one too', printableSand(beach({ sand: surface - TRACK_WET * 0.5, inland: -2 })),
  'the first and last steps of a walk out of the sea');
check('sand out under the sea does not', !printableSand(beach({ sand: surface - 4, inland: -20 })));
check('and a rock takes none however far up the beach it is',
  !printableSand(beach({ ground: surface + 0.6 + TRACK_ROCK * 2 })),
  'rock stands proud of the sand it sits on and presses into nothing');
check('...while a pebble under the sand does not stop one', printableSand(beach({ ground: surface + 0.6 + TRACK_ROCK * 0.5 })));
check('the last of the shore still takes one', printableSand(beach({ inland: reach })));
check('...and the flat land past it does not', !printableSand(beach({ inland: reach + 1 })),
  'the land inland is a plateau at the height the beach tops out at, so only the distance tells them apart');

// ---- and how long one lasts ----
check('a print is at its deepest the moment it is made', trackFade(0) === 1);
check('it lasts about a minute', TRACK_LIFE === 60, `${TRACK_LIFE} s`);
check('...is more than half there at half a minute', trackFade(30) > 0.5, `${trackFade(30).toFixed(2)} of it`);
check('...and is gone at the end of it', trackFade(TRACK_LIFE) === 0 && trackFade(TRACK_LIFE * 2) === 0,
  'so nothing lingers as an instance nobody can see');
let last = 1, monotone = true;
for (let t = 0; t <= TRACK_LIFE; t += 0.5) { const f = trackFade(t); if (f > last + 1e-9) monotone = false; last = f; }
check('a print only ever fills in, never deepens', monotone);

console.log(`tracks: ${checks} checks passed (a print lasts ${TRACK_LIFE} s, rock is ${TRACK_ROCK} proud, the strand reaches ${TRACK_WET} under)`);
