/**
 * What the headless suites share. Each suite is bundled and run as its own process, so the
 * failure count here is that suite's alone.
 *
 * Nothing in this file may import the simulation's values: a suite that tests the Devonian selects
 * its era and then imports the sim, and a static import from here would load the Cambrian first.
 */
import type { InputFrame } from '../../src/sim/types';

let failed = 0;

/** A `check(name, pass, detail)` that prints one aligned PASS/FAIL line and counts failures. */
export function checker(pad = 56) {
  return (name: string, pass: boolean, detail = '') => {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name.padEnd(pad)} ${detail}`);
    if (!pass) failed++;
  };
}

/** Count a failure found some other way than through `check`. */
export function fail() { failed++; }

export function failures() { return failed; }

/** The suite's last line: the summary, and an exit code the runner reads. */
export function finish(passed: string): never {
  console.log(failed ? `\n${failed} FAILED` : `\n${passed}`);
  process.exit(failed ? 1 : 0);
}

/** The part of `Game` stepping needs, so this file never imports the class itself. */
interface Steppable { step(dt: number, inputs: Map<number, InputFrame>): void; events: unknown[] }

/** Step `steps` fixed frames with player 0 holding `f`, dropping the events as they come. */
export function stepN(g: Steppable, steps: number, f: InputFrame) {
  const m = new Map([[0, f]]);
  for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; }
}

/**
 * Read a body afresh. TypeScript keeps a property narrowed across a call that mutates it, so after
 * `p.state = 'free'` and a `g.step()`, `p.state === 'dodge'` reads as a comparison that can never
 * hold. `live(p).state` is the state the step left behind.
 */
export const live = <T>(o: T): T => o;
