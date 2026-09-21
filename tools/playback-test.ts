/**
 * The specimen viewer's sticky playback selection. Run: npm run playback
 *
 * The pane is for comparing one motion across bodies, so picking an animal must not also pick the
 * animation again: the clip, the position in it, the pause and the Base pose all cross from one
 * creature to the next. What this guards is the distinction the whole feature rests on — the
 * *intent* (what was asked for) is not *what is playing* (what this body could give) — because the
 * naive version, which stores what is playing, loses the intent at the first animal lacking the
 * clip and can never get it back.
 *
 * Three creatures stand in for the roster the browser drive uses: two that carry `Crawl` at
 * different lengths (Hallucigenia 2.0 s, Ottoia 1.4 s) and one that has none at all (Anomalocaris),
 * which is what the Cambrian actually ships.
 */
import assert from 'node:assert/strict';
import {
  clampTime, intentMissing, resolveSelection, restingClip, tracksIntent,
  type ClipIntent, type ClipInfo,
} from '../src/viewer/playback/selection';

/** Clip tables as `scene.show` builds them: names in the pane's order, with their durations. */
const hallucigenia: ClipInfo[] = [
  { name: 'Idle', duration: 2.0 }, { name: 'Crawl', duration: 2.0 },
  { name: 'Heavy', duration: 1.083 }, { name: 'Ability', duration: 1.0 },
];
const ottoia: ClipInfo[] = [
  { name: 'Idle', duration: 2.6 }, { name: 'Crawl', duration: 1.4 }, { name: 'Heavy', duration: 1.1 },
];
const anomalocaris: ClipInfo[] = [
  { name: 'Idle', duration: 2.4 }, { name: 'Heavy', duration: 1.1 }, { name: 'Ability', duration: 0.6 },
];
/** A prop, or a raw Tripo generation: a surface with no rig on it at all. */
const stromatolite: ClipInfo[] = [];

// ---- where a body goes when nothing has been chosen ----
assert.equal(restingClip(['Idle', 'Crawl', 'Heavy']), 'Idle');
assert.equal(restingClip(['Swim', 'Fish', 'Peer']), 'Swim', 'no Idle: the first clip in pane order');
assert.equal(restingClip([]), '', 'nothing to rest on');
const fresh = resolveSelection(undefined, hallucigenia);
assert.deepEqual(fresh, { clip: 'Idle', time: 0, paused: false, fellBack: false },
  'a page with no selection yet opens each body on its own Idle, from the top, playing');

// ---- the clip carries over ----
const crawling: ClipIntent = { clip: 'Crawl', time: 1.8, paused: true };
const onHallucigenia = resolveSelection(crawling, hallucigenia);
assert.deepEqual(onHallucigenia, { clip: 'Crawl', time: 1.8, paused: true, fellBack: false },
  'a body that has the chosen clip plays it, at the position that was chosen');

// ---- the clip is absent: Idle, and the intent is untouched ----
const onAnomalocaris = resolveSelection(crawling, anomalocaris);
assert.equal(onAnomalocaris.clip, 'Idle', 'a body without Crawl falls back to its resting clip');
assert.equal(onAnomalocaris.time, 0, 'and starts at the top: 1.8 s of a Crawl means nothing in an Idle');
assert.equal(onAnomalocaris.paused, true, 'the pause survives the fall-back');
assert.equal(onAnomalocaris.fellBack, true, 'and the pane is told it is standing in for something');
// The one thing that must not happen: the resolver has no way to write the intent down, so the
// caller's copy is still Crawl at 1.8 s. This is the whole point of the module.
assert.deepEqual(crawling, { clip: 'Crawl', time: 1.8, paused: true }, 'resolving does not rewrite the intent');
assert.ok(intentMissing(crawling, anomalocaris.map((c) => c.name)), 'the pane can say which clip is missing');
assert.ok(!intentMissing(crawling, hallucigenia.map((c) => c.name)));
assert.ok(!intentMissing(undefined, anomalocaris.map((c) => c.name)), 'no selection is not a missing one');

// ---- a third creature that has it: it comes back, at the position asked for ----
const backAgain = resolveSelection(crawling, ottoia);
assert.equal(backAgain.clip, 'Crawl', 'the third animal along plays what was chosen two animals ago');
assert.equal(backAgain.fellBack, false);
assert.equal(backAgain.paused, true);

// ---- position: clamped to the shorter clip, and the clamp is not written back ----
assert.equal(backAgain.time, 1.4, "Ottoia's Crawl is 1.4 s, so 1.8 s clamps to its end rather than wrapping to 0.4");
assert.equal(crawling.time, 1.8, 'the clamp lands on what plays, never on the intent');
assert.equal(resolveSelection(crawling, hallucigenia).time, 1.8,
  'so a body whose clip is long enough gets the full position back after a short one');
assert.equal(clampTime(1.8, 1.4), 1.4);
assert.equal(clampTime(-3, 1.4), 0, 'a scrub past the start is the start');
assert.equal(clampTime(Number.NaN, 1.4), 0, 'a number that is not one is the start');
assert.equal(clampTime(0.5, 0), 0, 'a zero-length clip has one position');

// ---- pause persists through every one of those ----
for (const [what, clips] of [['carried', hallucigenia], ['fallen back', anomalocaris], ['clamped', ottoia],
  ['static', stromatolite]] as const) {
  assert.equal(resolveSelection({ clip: 'Crawl', time: 1.8, paused: true }, clips).paused, true,
    `a paused selection stays paused on a ${what} body`);
  assert.equal(resolveSelection({ clip: 'Crawl', time: 1.8, paused: false }, clips).paused, false,
    `and a running one stays running on a ${what} body`);
}

// ---- a creature with no clips at all ----
const onProp = resolveSelection(crawling, stromatolite);
assert.deepEqual(onProp, { clip: null, time: 0, paused: true, fellBack: true },
  'nothing to play and nothing to fall back to, and the pane is told the choice is not being met');
assert.deepEqual(resolveSelection(undefined, stromatolite), { clip: null, time: 0, paused: false, fellBack: false },
  'a static specimen with nothing chosen is not a fall-back, it is just static');
assert.deepEqual(crawling, { clip: 'Crawl', time: 1.8, paused: true },
  'and a pass through a prop does not cost the selection either');

// ---- the base pose ----
const resting: ClipIntent = { clip: null, time: 0, paused: false };
for (const [name, clips] of [['Hallucigenia', hallucigenia], ['Anomalocaris', anomalocaris]] as const) {
  const pick = resolveSelection(resting, clips);
  assert.deepEqual(pick, { clip: null, time: 0, paused: false, fellBack: false },
    `the base pose is a selection like a clip is, and every rigged body has one (${name})`);
}
assert.equal(resolveSelection({ clip: null, time: 0, paused: true }, ottoia).paused, true,
  'a paused base pose stays paused across bodies');
// `''` is how the scene spells "no clip"; a selection that arrives spelled that way is the base
// pose and not a clip named after the empty string.
assert.deepEqual(resolveSelection({ clip: '', time: 0, paused: false }, hallucigenia),
  { clip: null, time: 0, paused: false, fellBack: false }, "the scene's own spelling of rest is understood");

// ---- a model swap holds what it was showing where the intent cannot be met ----
// The same specimen's twin, loaded without clearing the stage: the promise there is that the view
// and the frame are held so the difference between the two bodies reads as movement.
const swap = resolveSelection(crawling, anomalocaris, { name: 'Heavy', time: 0.4, paused: true });
assert.deepEqual(swap, { clip: 'Heavy', time: 0.4, paused: true, fellBack: true },
  'a swap keeps the frame it was standing at rather than cutting back to Idle');
assert.deepEqual(resolveSelection(crawling, hallucigenia, { name: 'Heavy', time: 0.4, paused: true }),
  { clip: 'Crawl', time: 1.8, paused: true, fellBack: false }, 'but the intent still wins where it can be met');
assert.deepEqual(resolveSelection(undefined, hallucigenia, { name: 'Crawl', time: 1.1, paused: false }),
  { clip: 'Crawl', time: 1.1, paused: false, fellBack: false }, 'with nothing chosen, a swap holds its clip and frame');
assert.deepEqual(resolveSelection(undefined, hallucigenia, { name: '', time: 0, paused: false }),
  { clip: null, time: 0, paused: false, fellBack: false }, 'a swap made at the base pose stays at the base pose');
assert.equal(resolveSelection(undefined, ottoia, { name: 'Crawl', time: 1.9, paused: true }).time, 1.4,
  'a swap onto a shorter clip clamps like everything else');
assert.equal(resolveSelection(undefined, anomalocaris, { name: 'Crawl', time: 1.1, paused: false }).clip, 'Idle',
  'a swap whose clip the new body has not got, with nothing chosen, is the resting clip');

// ---- which clock may be written back onto the intent ----
assert.ok(tracksIntent(crawling, 'Crawl'), 'a running Crawl is the chosen clip and carries the position');
assert.ok(!tracksIntent(crawling, 'Idle'), "a fall-back's clock belongs to a clip nobody chose");
assert.ok(!tracksIntent(crawling, ''), 'nor does the base pose');
assert.ok(!tracksIntent(resting, ''), 'the base pose has no position to track');
assert.ok(!tracksIntent(undefined, 'Crawl'));

// ---- the whole trip, as the browser drive walks it ----
// Hallucigenia paused two thirds through its Crawl → Anomalocaris (no Crawl) → Ottoia (a short
// one) → Hallucigenia again. Nothing but the pane's own writers touches the intent, so here it is
// carried by hand the way the viewer carries it: untouched by any fall-back or clamp.
let intent: ClipIntent = { clip: 'Crawl', time: 1.8, paused: true };
const trip = [hallucigenia, anomalocaris, ottoia, hallucigenia].map((clips) => resolveSelection(intent, clips));
assert.deepEqual(trip.map((s) => s.clip), ['Crawl', 'Idle', 'Crawl', 'Crawl']);
assert.deepEqual(trip.map((s) => s.time), [1.8, 0, 1.4, 1.8]);
assert.deepEqual(trip.map((s) => s.paused), [true, true, true, true]);
assert.deepEqual(trip.map((s) => s.fellBack), [false, true, false, false]);
// And resuming on the last of them is the one thing that does move it: what is playing is now what
// was chosen, so its clock is the reviewer's position.
intent = { ...intent, paused: false };
if (tracksIntent(intent, 'Crawl')) intent = { ...intent, time: 0.25 };
assert.deepEqual(resolveSelection(intent, ottoia), { clip: 'Crawl', time: 0.25, paused: false, fellBack: false });

console.log('PASS: viewer playback — clip, position and pause sticky across bodies; intent kept apart from what plays; '
  + 'fall-back to Idle without losing the choice; position clamped to a shorter clip but not written back; '
  + 'base pose sticky; static specimens; model swaps hold their frame');
