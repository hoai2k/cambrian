#!/usr/bin/env node
/**
 * The headless test runner: every `tools/*-test.*` suite in one table, run in parallel.
 *
 *   node tools/test.mjs <suite|group|suite:era>... [-j N] [--list]
 *   npm test                  everything headless (the `all` group)
 *   npm run sim:gate          the cheap half of the simulation suites, which the deploy runs
 *   npm run world             one suite, output streamed as it runs
 *   node tools/test.mjs beach:triassic   one era of a suite that runs per era
 *   node tools/test.mjs audio -- 30      arguments after `--` go to the suite itself
 *
 * Why it exists. Every suite used to be its own `package.json` line spelling out the same esbuild
 * invocation, eight of them chaining three eras with `&&`, and `npm run sim` ran twenty-nine of them
 * one after another on one core for over twenty minutes. Here a suite is a row: the file, the eras
 * it runs in, and any plain `node` checks that go with it. Each era is its own job, every job's
 * bundle is built up front in one pass, and the jobs share the machine's cores. What a job prints is
 * held until it finishes and shown only if it failed (or if it is the only job asked for), so a
 * parallel run still reads as one report.
 *
 * Adding a suite: a row in SUITES, and its name in `gate` if it is cheap enough to run on every
 * deploy. `npm run <name>` for it is optional — `node tools/test.mjs <name>` always works.
 *
 * One suite is timed against the wall clock: `flora`'s step-cost guard. It is marked `alone` and
 * runs by itself before anything else starts, so a busy machine cannot fail it.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const ERAS = ['cambrian', 'devonian', 'triassic'];
const CACHE = 'node_modules/.cache';

/**
 * name → { file?, runs?, args?, node?, also?, alone?, slow? }
 *   file   a TypeScript entry under tools/, bundled for node and run
 *   runs   run the bundle once per entry, the entry as its arguments — usually the three eras
 *          (default: once, no argument). Each run is its own job, named `suite:entry`, and
 *          `suite:<first word>` asks for every entry that starts with that word (so
 *          `beach:triassic` is all of the Triassic's shards).
 *   args   extra arguments for every run of the bundle
 *   node   plain node commands that belong to the suite, each its own job
 *   also   other suites that asking for this one runs too
 *   alone  run by itself, before the parallel batch (wall-clock guards)
 *   slow   roughly how many minutes a job takes, so the long ones are started first
 */
const SUITES = {
  // ---- the simulation ----
  world: { file: 'world-test.ts', slow: 1 },
  swim: { file: 'swim-test.ts', slow: 1 },
  flora: { file: 'flora-test.ts', alone: true },
  locomotion: { file: 'locomotion-test.ts' },
  reactions: { file: 'reaction-test.ts', slow: 3 },
  grab: { file: 'grab-test.ts', slow: 1 },
  fight: { file: 'fight-test.ts' },
  feast: { file: 'feast-test.ts' },
  paddle: { file: 'paddle-test.ts', slow: 1 },
  pursuit: { file: 'pursuit-test.ts' },
  hunt: { file: 'hunt-test.ts' },
  survival: { file: 'survival-test.ts', also: ['survival-eras'] },
  'survival-eras': { file: 'survival-eras-test.ts', runs: ['devonian', 'triassic'] },
  views: { file: 'view-pick-test.ts' },
  sight: { file: 'sight-test.ts' },
  governor: { file: 'governor-test.ts' },
  respawn: { file: 'respawn-test.ts' },
  ecology: { file: 'ecology-test.ts', also: ['appetite'] },
  appetite: { file: 'appetite-test.ts', runs: ['reef', 'giants'], slow: 5 },
  environment: { file: 'environment-test.ts' },
  corpse: { file: 'corpse-test.ts' },
  modes: { file: 'modes-test.ts' },
  controls: { file: 'controls-test.ts' },
  motion: { file: 'motion-test.ts' },
  hiding: { file: 'hiding-test.ts' },
  sand: { file: 'sand-test.ts' },
  tracks: { file: 'tracks-test.ts' },
  sizing: { file: 'sizing-test.ts' },
  spatial: { file: 'spatial-test.ts' },
  record: { file: 'record-test.ts' },
  expansion: { file: 'expansion-test.ts' },
  // The walkers are most of the beach's minutes, so the two eras that have them split them over
  // processes (`--shard` in the test).
  beach: {
    file: 'beach-test.ts',
    runs: ['cambrian', 'devonian --shard=0/2', 'devonian --shard=1/2', 'triassic --shard=0/3', 'triassic --shard=1/3', 'triassic --shard=2/3'],
    slow: 3,
  },
  touch: { file: 'touch-test.ts' },
  breakpoints: { file: 'breakpoints-test.ts' },
  lineup: { file: 'lineup-test.ts' },
  bindings: { file: 'menu-bindings-test.ts' },
  audio: { file: 'audio-mix-test.ts' },
  // Not a test: prints the simulation's fingerprint, to compare before and after a refactor.
  'replay-hash': { file: 'replay-hash.ts', runs: ERAS },
  // ---- per era: the ladder, the record, and what crosses between the games ----
  progress: { file: 'progress-test.ts', runs: ERAS },
  codex: { file: 'codex-test.ts', runs: ERAS },
  results: { file: 'results-test.tsx', runs: ERAS },
  visitors: { file: 'visitors-test.ts', runs: ERAS },
  seats: { file: 'seat-scheme-test.ts', runs: ERAS },
  devonian: { file: 'devonian-test.ts', slow: 3 },
  triassic: {
    file: 'triassic-test.ts',
    slow: 3,
    node: [
      ['tools/triassic/review-bodies.mjs', '--check'],
      ['tools/triassic/publish-portraits.mjs', '--check'],
      ['tools/triassic/base-poses.mjs', '--check'],
      ['tools/triassic/idle-bones.mjs', '--all'],
      ['tools/triassic/lag.mjs', '--all', { slow: 2 }],
      ['tools/triassic/hidden-parts.mjs', '--check'],
      ['tools/triassic/clip-contract.mjs', '--check'],
    ],
  },
  // ---- the shell, the menus and the input ----
  roster: { file: 'roster-grid-test.ts' },
  depth: { file: 'depth-layout-test.ts' },
  menus: { file: 'menu-cursor-test.ts' },
  focus: { file: 'focus-test.ts' },
  fullscreen: { file: 'fullscreen-test.ts' },
  cursors: { file: 'cursors-test.ts' },
  'mouse:strike': { file: 'mouse-strike-test.ts' },
  edges: { file: 'edges-test.ts' },
  swap: { file: 'swap-test.ts' },
  immersive: { file: 'immersive-test.ts' },
  music: { file: 'music-test.ts' },
  stats: { file: 'stats-test.ts' },
  debug: { file: 'debug-test.ts' },
  ancientseas: { file: 'ancientseas-test.ts', node: [['tools/ancientseas/delivered.mjs', '--check']] },
  'mobile:memory': { file: 'mobile-memory-test.ts' },
  // ---- the content and the assets ----
  assets: { file: 'assets-test.ts' },
  props: { file: 'prop-collider-test.ts' },
  recolor: { file: 'recolor-texture-test.ts' },
  eras: { node: [['tools/era-test.mjs'], ['tools/cambrian/sizes.mjs', '--check']] },
  palettes: { node: [['tools/palette-test.mjs']] },
  portraits: { node: [['tools/portrait-test.mjs']] },
  merge: { node: [['--experimental-transform-types', 'tools/merge-test.mjs']], slow: 2 },
  conform: { node: [['--experimental-transform-types', 'tools/conform-test.mjs']] },
  rigs: {
    node: [
      ['--experimental-transform-types', 'tools/anchors-test.mjs', { slow: 1 }],
      ['tools/feeding-test.mjs'],
      ['tools/hallucigenia-test.mjs'],
      ['tools/creature-locomotion-test.mjs'],
    ],
  },
  // ---- the viewer's editors and the pane beside them ----
  sculpt: { file: 'sculpt-test.ts' },
  stretch: { file: 'stretch-test.ts' },
  bend: { file: 'bend-test.ts' },
  mouth: { file: 'mouth-test.ts' },
  mark: { file: 'mark-test.ts' },
  playback: { file: 'playback-test.ts' },
};

/**
 * `sim` is every simulation suite; `gate` is the part of it cheap enough for every deploy (the
 * deploy workflow runs `ci`, which is `gate` plus the rest of the fast checks); `all` is everything.
 */
const SIM = ['world', 'swim', 'flora', 'locomotion', 'reactions', 'grab', 'fight', 'feast', 'paddle', 'pursuit', 'hunt',
  'survival', 'survival-eras', 'views', 'sight', 'respawn', 'ecology', 'appetite', 'environment', 'corpse', 'modes', 'controls', 'motion',
  'hiding', 'sand', 'tracks', 'sizing', 'spatial', 'record', 'expansion', 'beach', 'touch', 'bindings'];
const GATE = ['flora', 'locomotion', 'fight', 'feast', 'pursuit', 'respawn', 'corpse', 'environment', 'hunt', 'survival',
  'survival-eras', 'views', 'sight', 'motion', 'hiding', 'sand', 'tracks', 'sizing', 'spatial', 'record', 'expansion', 'touch',
  'bindings', 'modes', 'controls', 'beach'];
/** Everything that is not a simulation suite and takes seconds, not minutes. */
const FAST = ['codex', 'results', 'visitors', 'seats', 'roster', 'depth', 'menus', 'focus', 'fullscreen', 'cursors', 'mouse:strike', 'edges',
  'swap', 'immersive', 'music', 'stats', 'debug', 'ancientseas', 'mobile:memory', 'assets', 'props', 'recolor', 'eras',
  'palettes', 'portraits', 'conform', 'rigs', 'sculpt', 'stretch', 'bend', 'mouth', 'mark', 'playback', 'breakpoints', 'lineup', 'governor'];
const GROUPS = {
  sim: SIM,
  gate: GATE,
  fast: FAST,
  ci: [...GATE, ...FAST, 'triassic'],
  all: Object.keys(SUITES).filter((n) => n !== 'replay-hash'),
};

// ---- arguments ----
const argv = process.argv.slice(2);
let jobsN = Math.max(1, os.availableParallelism?.() ?? os.cpus().length);
const names = [];
/** Everything after `--` is handed to every bundled suite asked for: `node tools/test.mjs audio -- 30`. */
const dash = argv.indexOf('--');
const extra = dash >= 0 ? argv.splice(dash).slice(1) : [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-j' || a === '--jobs') jobsN = Math.max(1, Number(argv[++i]) || 1);
  else if (a.startsWith('-j')) jobsN = Math.max(1, Number(a.slice(2)) || 1);
  else if (a === '--list') {
    for (const [g, list] of Object.entries(GROUPS)) console.log(`${g.padEnd(6)} ${list.join(' ')}`);
    process.exit(0);
  } else names.push(a);
}
if (!names.length) { console.error('usage: node tools/test.mjs <suite|group|suite:era>... [-j N] [--list]'); process.exit(2); }

// ---- the jobs ----
/** @type {{ label: string, suite: string, file?: string, bundle?: string, cmd: string[], alone?: boolean, slow?: number }[]} */
const jobs = [];
const seen = new Set();
const add = (job) => { if (!seen.has(job.label)) { seen.add(job.label); jobs.push(job); } };
const outOf = (file) => path.join(CACHE, file.replace(/\.tsx?$/, '.mjs'));
function expand(name) {
  if (GROUPS[name]) { for (const n of GROUPS[name]) expand(n); return; }
  const [suiteName, only] = name.includes(':') && !SUITES[name] ? name.split(':') : [name, undefined];
  const s = SUITES[suiteName];
  if (!s) { console.error(`unknown suite or group: ${name} (see --list)`); process.exit(2); }
  const runs = s.runs ?? [undefined];
  const key = (run) => run?.split(' ')[0];
  if (only && !runs.some((r) => key(r) === only)) { console.error(`${suiteName} has no run called ${only}`); process.exit(2); }
  if (s.file) {
    for (const era of runs) {
      if (only && key(era) !== only) continue;
      const bundle = outOf(s.file);
      add({ label: era ? `${suiteName}:${era}` : suiteName, suite: suiteName, file: `tools/${s.file}`, bundle, cmd: [bundle, ...(era ? era.split(' ') : []), ...(s.args ?? []), ...extra], alone: s.alone, slow: s.slow });
    }
  }
  if (!only) for (const row of s.node ?? []) {
    const opts = typeof row.at(-1) === 'object' ? row.at(-1) : {};
    const cmd = row.filter((c) => typeof c === 'string');
    const script = cmd.find((c) => !c.startsWith('-'));
    add({ label: `${suiteName}:${path.basename(script)}`, suite: suiteName, cmd, alone: s.alone, slow: opts.slow ?? s.slow });
  }
  if (!only) for (const other of s.also ?? []) expand(other);
}
for (const n of names) expand(n);

// ---- bundle every entry up front ----
const entries = [...new Map(jobs.filter((j) => j.file).map((j) => [j.file, j.bundle])).entries()];
const t0 = Date.now();
await Promise.all(entries.map(([file, outfile]) => build({
  entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  ...(file.endsWith('.tsx') ? { jsx: 'automatic', external: ['react', 'react-dom'] } : {}),
}))).catch(() => process.exit(1));

// ---- run ----
const single = jobs.length === 1;
const results = [];
const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;
function runJob(job) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, job.cmd, { stdio: single ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
    let out = '';
    if (!single) { child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; }); }
    child.on('close', (code, signal) => {
      const r = { job, code: code ?? 1, signal, ms: Date.now() - start, out };
      results.push(r);
      if (!single) {
        const mark = r.code === 0 ? 'pass' : 'FAIL';
        console.log(`${mark}  ${job.label.padEnd(34)} ${fmt(r.ms).padStart(7)}`);
        if (r.code !== 0) console.log(`\n----- ${job.label} -----\n${out.trimEnd()}\n----- end ${job.label} -----\n`);
      }
      resolve(r);
    });
  });
}
async function pool(list, n) {
  let next = 0;
  const worker = async () => { while (next < list.length) await runJob(list[next++]); };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, worker));
}
// Longest first, so the slow suites start while the short ones fill in around them.
const alone = jobs.filter((j) => j.alone), rest = jobs.filter((j) => !j.alone).sort((a, b) => (b.slow ?? 0) - (a.slow ?? 0));
if (!single) console.log(`${jobs.length} jobs on ${jobsN} workers (bundled in ${fmt(Date.now() - t0)})`);
for (const j of alone) await runJob(j);
await pool(rest, jobsN);

const failed = results.filter((r) => r.code !== 0);
if (!single) {
  const slow = [...results].sort((a, b) => b.ms - a.ms).slice(0, 8).map((r) => `${r.job.label} ${fmt(r.ms)}`).join(', ');
  console.log(`\n${results.length - failed.length}/${results.length} passed in ${fmt(Date.now() - t0)} — slowest: ${slow}`);
  if (failed.length) console.log(`FAILED: ${failed.map((r) => r.job.label).join(', ')}`);
}
process.exit(failed.length ? 1 : 0);
