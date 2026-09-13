/**
 * The visitor counter and the page that reads it.
 * Run: npm run stats
 *
 * This corner has a failure mode the rest of the codebase does not: it can be broken and look
 * fine. A counter that was never wired in and a trilogy nobody has played produce exactly the
 * same empty dashboard, so the thing worth asserting is not a number — only the live site has
 * those — but that the two states stay *distinguishable*: an unconfigured site sends nothing and
 * says so, a configured one points at the right endpoint, and every page a stranger can land on
 * installs the counter rather than quietly sitting the count out.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GOATCOUNTER_SITE, STATS_VIEWS, countEndpoint, dashboardUrl, isValidSite,
} from '../src/shared/config-stats';

let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
// Bundled to node_modules/.cache before it runs, so import.meta.url is not the repository —
// the npm script's working directory is.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

// ---------------------------------------------------------------- the site code

// A code GoatCounter would have issued.
for (const code of ['ancientseas', 'a', 'ancient-seas', 'seas2', '0seas']) {
  ok(isValidSite(code), `"${code}" is a site code`);
  ok(countEndpoint(code) === `https://${code}.goatcounter.com/count`, `...and counts to its own subdomain`);
  ok(dashboardUrl(code) === `https://${code}.goatcounter.com`, '...and has a dashboard there');
}

// Everything else is a paste accident. The whole-URL case is the one that matters: glued to
// "/count" it would 404 once per pageview with nothing on screen to say why, so it must be
// refused outright rather than sent. Each refusal explains itself on the console, which is the
// point of it — here it is only in the way, so it is caught and counted instead.
const said: string[] = [];
const realError = console.error;
console.error = (...args: unknown[]) => { said.push(args.join(' ')); };
for (const bad of [
  'https://ancientseas.goatcounter.com', 'https://ancientseas.goatcounter.com/count',
  'ancientseas.goatcounter.com', 'Ancient Seas', 'AncientSeas', 'ancient_seas', '-seas', 'seas/',
  'a'.repeat(51), ' ancientseas', 'ancientseas ',
]) {
  ok(!isValidSite(bad), `"${bad}" is not a site code`);
  ok(countEndpoint(bad) === null, '...and nothing is sent for it');
  ok(dashboardUrl(bad) === null, '...and it names no dashboard');
  ok(said.pop()?.includes('not a GoatCounter code'), '...and it says why on the console');
}
console.error = realError;

// Unconfigured is a state, not an error: silent, and null all the way through so every caller has
// to decide what to show rather than framing an empty dashboard.
ok(!isValidSite(''), 'an empty code is not a site code');
ok(countEndpoint('') === null, 'unconfigured sends nothing');
ok(dashboardUrl('') === null, 'unconfigured frames nothing');

// Whatever is committed must be one of those two things. A half-edited code would count into
// somebody else's dashboard, or into none, depending on who owns the subdomain.
ok(GOATCOUNTER_SITE === '' || isValidSite(GOATCOUNTER_SITE),
  `the committed GOATCOUNTER_SITE ("${GOATCOUNTER_SITE}") is empty or a valid code`);

// ---------------------------------------------------------------- the views

ok(STATS_VIEWS.length >= 4, 'there are views to drill into');
ok(STATS_VIEWS[0]!.id === 'all' && STATS_VIEWS[0]!.path === '',
  'the first view is everything, unfiltered');
ok(new Set(STATS_VIEWS.map(v => v.id)).size === STATS_VIEWS.length, 'view ids are unique');
ok(new Set(STATS_VIEWS.map(v => v.path)).size === STATS_VIEWS.length, 'view filters are unique');
for (const v of STATS_VIEWS) {
  ok(v.name.trim() !== '' && v.blurb.trim() !== '', `${v.id} is named and described`);
  if (v.path === '') continue;
  // The site is published one directory down, so a filter that forgets the prefix silently
  // matches nothing and reads as "nobody played the Devonian".
  ok(v.path.startsWith('/cambrian/') && v.path.endsWith('/'),
    `${v.id} filters on the published path ("${v.path}")`);
}

// Each game the trilogy ships is drillable by name.
for (const era of ['cambrian', 'devonian', 'triassic']) {
  const view = STATS_VIEWS.find(v => v.id === era);
  ok(view?.path === `/cambrian/${era}/`, `${era} has its own view`);
}

// The trilogy page is deliberately absent: it sits at the root the games are nested under, so any
// filter naming it would sweep them in too. If someone adds it, this says why not.
ok(!STATS_VIEWS.some(v => v.path === '/cambrian/'),
  'the trilogy page has no filter of its own (it would catch the games under it)');

// ---------------------------------------------------------------- the wiring

// Every page a link from outside can land on. The workbench is a dev bench and /stats/ is ours,
// so neither counts — but a game that forgets to call this is the whole failure mode above.
const ENTRIES = [
  'src/ancientseas/main.tsx', 'src/cambrian/main.tsx', 'src/devonian/main.tsx',
  'src/triassic/main.tsx', 'src/viewer/main.tsx',
];
for (const entry of ENTRIES) {
  const src = read(entry);
  ok(/\binstallStats\(\)/.test(src), `${entry} installs the counter`);
  ok(/from '\.\.?\/shared\/stats'/.test(src), `${entry} imports it from the one module`);
}
for (const entry of ['src/workbench/main.tsx']) {
  ok(!/installStats/.test(read(entry)), `${entry} is a bench and is not counted`);
}

// The three game pages choose an era before anything else runs, and the counter is called inside
// that discipline rather than beside it.
for (const entry of ['src/cambrian/main.tsx', 'src/devonian/main.tsx', 'src/triassic/main.tsx']) {
  const src = read(entry);
  ok(src.indexOf('selectEra(') < src.indexOf('installStats()'),
    `${entry} counts after the era is chosen`);
}

// The counter itself: one script, async, addressed by the config and by nothing else.
const stats = read('src/shared/stats.ts');
ok(/countEndpoint/.test(stats), 'the counter takes its endpoint from the config');
ok(/tag\.async = true/.test(stats), 'the script is async, so a slow counter costs no frame');
ok(/script\[data-goatcounter\]/.test(stats), 'installing twice attaches one counter');
ok(/typeof document === 'undefined'/.test(stats), 'and a headless harness is survivable');
ok(!/localStorage|sessionStorage|document\.cookie/.test(stats),
  'nothing of our own is stored on the visitor');

// The page is built, and is not something a search engine should index.
const page = read('stats/index.html');
ok(/name="robots"[^>]*noindex/.test(page), '/stats/ is noindex');
ok(/config-stats/.test(page), '/stats/ reads the same config as the counter');
ok(/goatcounter\.com\/signup/.test(page), '/stats/ carries the setup steps for the off state');
const vite = read('vite.config.ts');
ok(/stats\/index\.html/.test(vite), '/stats/ is a page in the build');

console.log(`${passes} stats assertions passed`);
