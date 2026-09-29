/**
 * The frame governor (src/render/frame-governor.ts): nothing given up while frames are fine,
 * rungs given up one at a time under sustained slowness and taken back under sustained speed,
 * antialiasing given up on low quality only and never given back in a session, and hitches ignored.
 * Run: node tools/test.mjs governor
 */
import { freshGovernor, governFrame, planFor, HITCH_MS, RESOLUTION, STEP_DOWN_AFTER, STEP_UP_AFTER, TOP, type GovernorState } from '../src/render/frame-governor';
import { checker, finish } from './lib/test';

const check = checker(62);
const run = (s: GovernorState, ms: number, seconds: number, low: boolean, active = true) => {
  for (let t = 0; t < seconds * 1000; t += ms) s = governFrame(s, ms, active, low);
  return s;
};

for (const low of [false, true]) {
  const q = low ? 'low' : 'high';
  let s = run(freshGovernor(), 1000 / 60, 60, low);
  check(`${q}: a minute at 60 fps gives nothing up`, s.level === 0 && planFor(s, low).antialias && planFor(s, low).resolution === 1 && planFor(s, low).shadowEvery === 1);
  s = run(freshGovernor(), 18, 60, low);
  check(`${q}: 55 fps is fine too`, s.level === 0);
  s = run(freshGovernor(), 40, STEP_DOWN_AFTER + 2, low);
  check(`${q}: a few seconds at 25 fps gives up one rung`, s.level === 1, `level ${s.level}`);
  check(`${q}: ...the cheapest one first`, low ? !planFor(s, low).antialias && planFor(s, low).resolution === 1 : planFor(s, low).shadowEvery === 2 && planFor(s, low).resolution === 1);
  s = run(s, 40, 60, low);
  check(`${q}: it bottoms out at the last rung`, s.level === TOP && planFor(s, low).resolution === RESOLUTION[TOP]);
  check(`${q}: high keeps its antialiasing whatever happens`, low || planFor(s, low).antialias);
  s = run(s, 10, STEP_UP_AFTER * (TOP + 2), low);
  check(`${q}: fast frames take every rung back`, s.level === 0 && planFor(s, low).resolution === 1);
  check(`${q}: ...but antialiasing, once gone, stays gone`, low ? !planFor(s, low).antialias : planFor(s, low).antialias);
  s = run(freshGovernor(), 40, 60, low, false);
  check(`${q}: slow frames while paused or on a menu count for nothing`, s.level === 0);
  s = run(freshGovernor(), HITCH_MS + 50, 20, low);
  check(`${q}: hitches are not slowness`, s.level === 0);
  // Hovering on the line: a step must not flap every few seconds.
  let changes = 0, prev = 0; s = freshGovernor();
  for (let i = 0; i < 60 * 60; i++) { s = governFrame(s, i % 2 ? 22 : 12, true, low); if (s.level !== prev) { changes++; prev = s.level; } }
  check(`${q}: frames on the line do not flap`, changes <= 2, `${changes} changes in a minute`);
}

finish('all governor checks passed');
