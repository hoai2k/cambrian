// Regenerates src/ancientseas/delivered.json from what is actually in public/assets/ancientseas/.
// Run: npm run ancientseas:delivered — after dropping delivered art in. The page draws a
// stand-in for anything not listed, so it never asks the network for a file that is not there.
// `--check` fails instead of writing when the manifest is behind the folder.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const dir = 'assets/ancientseas/';
const manifest = resolve(root, 'src/ancientseas/delivered.json');
const files = readdirSync(resolve(root, 'public', dir)).filter((f) => /\.(webp|png|svg)$/.test(f)).sort().map((f) => `${dir}${f}`);
const next = JSON.stringify({ files }, null, 2) + '\n';
const current = readFileSync(manifest, 'utf8');
if (process.argv.includes('--check')) {
  if (current !== next) { console.error(`delivered.json is behind public/${dir}; run npm run ancientseas:delivered`); process.exit(1); }
  console.log(`delivered.json matches public/${dir} (${files.length} file${files.length === 1 ? '' : 's'})`);
} else {
  writeFileSync(manifest, next);
  console.log(`wrote ${files.length} delivered file${files.length === 1 ? '' : 's'} to src/ancientseas/delivered.json`);
}
