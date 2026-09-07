/**
 * Every file an era asks for exists, and no era asks for another's.
 *
 * The two eras share one build and one public/ tree, so a path built from the wrong pack resolves
 * to something that is merely *a* file rather than to nothing, and the mistake shows up as a
 * missing sound or a blank tile rather than as an error. This walks each era's own tables — its
 * roster, its sound library, its modes — resolves them exactly as the runtime does, and checks the
 * result against the filesystem.
 */
import { existsSync } from 'node:fs';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { DEVONIAN_SAMPLES } from '../src/content/devonian/sfx';
import { createAssetPaths } from '../src/content/asset-paths';
import { SAMPLES } from '../src/audio/audio';
import type { EraDefinition } from '../src/content/era';

let failed = 0, warned = 0;
const strict = process.argv.includes('--strict');
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };
/**
 * Art that has not been delivered yet. The UI degrades on its own where these are missing, so a
 * gap is a request outstanding rather than a broken build — see docs/image-requests.md. `--strict`
 * promotes them, for the day the list is meant to be empty.
 */
const warn = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'WARN'}  ${n.padEnd(58)} ${d}`); if (!ok) { warned++; if (strict) failed++; } };
const pub = (p: string) => `public/${p}`;

/** The runtime's own rule: a sample name carrying a directory lives in that era's own sfx folder. */
const sfxPath = (era: EraDefinition, name: string) =>
  name.includes('/') ? `assets/${name.replace(/^([^/]+)\//, '$1/sfx/')}.mp3` : createAssetPaths(era).sfx(name);

/** Cambrian is the shared/default library; the Devonian adds its own on top. */
const CAMBRIAN_SAMPLES = { ...SAMPLES };

for (const [era, extra] of [[CAMBRIAN, {}], [DEVONIAN, DEVONIAN_SAMPLES]] as const) {
  console.log(`\n--- ${era.id} ---`);
  const paths = createAssetPaths(era);
  const standIns = era.assets.standIns ?? {};
  const ids = era.creatures.map((c) => c.id);

  // models: every creature resolves to a file, borrowed bodies included
  const missingModels = ids.filter((id) => !existsSync(pub(paths.model(id))));
  check('every creature has a model to load', missingModels.length === 0, missingModels.join(',') || `${ids.length} creatures`);
  const missingLods = ids.filter((id) => !existsSync(pub(paths.model(id, 1))));
  check('...and a reduced copy', missingLods.length === 0, missingLods.join(','));

  // portraits: required for creatures with art of their own, absent by design for stand-ins
  const own = ids.filter((id) => !(id in standIns));
  for (const kind of ['thumb', 'select'] as const) {
    const missing = own.filter((id) => !existsSync(pub(paths.portrait(id, kind))));
    check(`every delivered creature has a ${kind}`, missing.length === 0, missing.join(',') || `${own.length} creatures`);
  }

  // sounds: the era's real library, resolved the way the audio module resolves it
  const names = [...new Set(Object.values({ ...CAMBRIAN_SAMPLES, ...extra }).flat())];
  const missingSfx = names.filter((n) => !existsSync(pub(sfxPath(era, n))));
  check('every sound in the library exists', missingSfx.length === 0, missingSfx.slice(0, 6).join(',') || `${names.length} samples`);
  // and the era's own sounds are in its own folder, not the shared one
  const ownSfx = Object.values(extra).flat();
  check('an era keeps its sounds in its own folder', ownSfx.every((n) => n.includes('/')), ownSfx.filter((n) => !n.includes('/')).slice(0, 4).join(',') || `${ownSfx.length} of its own`);

  // the pick screen's mode panels
  const missingModes = era.modes.filter((m) => !existsSync(pub(paths.ui(`mode-${m.id}.webp`))));
  warn('every mode it offers has a panel', missingModes.length === 0, missingModes.map((m) => m.id).join(',') || `${era.modes.length} modes`);

  // brand art the title and loading screens name
  check('title art exists', existsSync(pub(era.assets.illustration)), era.assets.illustration);
  if (era.copy.mobileIllustration) check('portrait title art exists', existsSync(pub(era.copy.mobileIllustration)), era.copy.mobileIllustration);

  // nothing points into the other era's tree
  const otherDir = era.id === 'cambrian' ? 'assets/devonian/' : null;
  if (otherDir) {
    const strays = [paths.model(ids[0]), paths.portrait(own[0], 'thumb'), paths.biome('shelf'), paths.ui('mode-rise.webp')].filter((p) => p.includes(otherDir));
    check('no path reaches into the other era', strays.length === 0, strays.join(','));
  }
}

// --- the pick grid: no press may ever be a no-op, whatever size the roster is ---
{
  console.log('\n--- pick grid ---');
  // Mirrors gridColumns in src/app/Select.tsx and moveCursor in src/app/App.tsx.
  const gridColumns = (n: number) => Math.max(4, Math.ceil(n / 3));
  const move = (n: number, i: number, dx: number, dy: number) => {
    const cols = gridColumns(n), rows = Math.ceil(n / cols);
    let j = i;
    if (dx) j = (i + dx + n) % n;
    if (dy) { const r = (Math.floor(j / cols) + dy + rows) % rows; const len = Math.min(cols, n - r * cols); j = r * cols + Math.min(j % cols, len - 1); }
    return (j === i || j < 0 || j >= n) ? i : j;
  };
  // Ragged rosters are the interesting ones: an era whose models arrive in batches has a short
  // bottom row, and a cursor parked on it used to have nowhere to go.
  const sizes = [4, 5, 8, 9, 12, 13, 20, 21, 22, CAMBRIAN.creatures.length, DEVONIAN.creatures.filter((c) => !DEVONIAN.assets.standIns?.[c.id]).length];
  let stuck = 0, outOfRange = 0;
  for (const n of new Set(sizes)) {
    const rows = Math.ceil(n / gridColumns(n));
    for (let i = 0; i < n; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = move(n, i, dx, dy);
      if (j < 0 || j >= n) outOfRange++;
      // On a single-row grid up and down have nowhere to go; everything else must move.
      else if (j === i && !(rows === 1 && dy !== 0)) stuck++;
    }
  }
  check('the cursor always lands inside the roster', outOfRange === 0, `${outOfRange} out of range`);
  check('every press moves it, on every roster size', stuck === 0, `${stuck} presses did nothing`);
  const dev = DEVONIAN.creatures.filter((c) => !DEVONIAN.assets.standIns?.[c.id]).map((c) => c.id);
  const at = dev.indexOf(DEVONIAN.defaults.player);
  check("...including from the Devonian's default pick", at < 0 || move(dev.length, at, 1, 0) !== at, `'${DEVONIAN.defaults.player}' is ${at} of ${dev.length}`);
}

console.log(failed ? `\n${failed} FAILED${warned ? `, ${warned} undelivered` : ''}`
  : warned ? `\nall asset paths resolve · ${warned} undelivered (see docs/image-requests.md)`
  : '\nall asset paths resolve');
process.exit(failed ? 1 : 0);
