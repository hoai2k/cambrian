/**
 * Records the reference images a reviewer threw out, so the next collection is better than the
 * last one.
 *
 *   node tools/research/apply-rejections.mjs <era> <export.json>
 *   node tools/research/apply-rejections.mjs <era> <export.json> --dry-run
 *
 * The first sweep of Wikimedia is never the right set. For the plants and the invertebrates it
 * comes back mostly fossils, and for anything whose genus is shared with a living animal it comes
 * back with the wrong animal entirely. A reviewer can see that in a second and had no way to say
 * it: rejecting a picture in the viewer hid it until the tab was closed and the next fetch offered
 * it straight back.
 *
 * This is the other half. The viewer's export carries the rejections, this writes them into the
 * era's `rejected.json`, and `fetch-images.mjs` then treats those titles as if Commons did not
 * hold them — so the slot they were taking goes to the next candidate down, and the board
 * improves each round instead of churning.
 *
 * Nothing is deleted anywhere: a rejection is a note about a Wikimedia file, and the file is
 * Wikimedia's. Un-rejecting in the viewer and applying again removes the note.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eraFromArgv } from './eras.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const era = eraFromArgv(args, 'tools/research/apply-rejections.mjs');
const file = args.filter((a) => !a.startsWith('-')).find((a) => a !== era.id);
if (!file) {
  console.error(`usage: node tools/research/apply-rejections.mjs ${era.id} <export.json> [--dry-run]`);
  process.exit(2);
}

const exported = JSON.parse(await readFile(file, 'utf8'));
if (exported.schema !== 'canonical-selections/1') {
  console.error(`${file} is not a viewer selection export (schema: ${exported.schema ?? 'none'})`);
  process.exit(1);
}
// An export knows which era it came from; applying a Devonian board's rejections to the Triassic
// would quietly poison a roster that has nothing to do with it.
if (exported.era && exported.era !== era.id) {
  console.error(`${file} is a ${exported.era} export; this run is for the ${era.id}`);
  process.exit(1);
}

const OUT = join(ROOT, era.data, 'rejected.json');
const before = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : {};

// The export is authoritative for the subjects it mentions and silent about the rest: a reviewer
// who worked through six animals has not thereby un-rejected everything else. Un-rejecting is
// mentioning a subject with fewer titles than it had, which is why this replaces per subject
// rather than merging into it.
const after = { ...before };
let added = 0, removed = 0, touched = 0;
for (const { id, titles } of exported.rejected ?? []) {
  const was = new Set(before[id] ?? []);
  const now = [...new Set(titles)].sort();
  for (const t of now) if (!was.has(t)) added++;
  for (const t of was) if (!now.includes(t)) removed++;
  if (now.length) after[id] = now; else delete after[id];
  touched++;
}
// A subject the reviewer cleared entirely arrives as an empty list and is deleted above; one they
// never opened does not arrive at all, and keeps what it had.

const output = `${JSON.stringify(Object.fromEntries(Object.entries(after).sort()), null, 2)}\n`;
if (dryRun) {
  console.log(`--dry-run: ${touched} subject(s) in the export, ${added} newly rejected, ${removed} put back. Nothing written.`);
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, output);
  const total = Object.values(after).reduce((n, list) => n + list.length, 0);
  console.log(`${era.name}: ${added} newly rejected, ${removed} put back — ${total} rejected reference(s) across ${Object.keys(after).length} subject(s)`);
  console.log(`  written to ${era.data}/rejected.json; run the fetcher to fill the gaps: node tools/research/fetch-images.mjs ${era.id}`);
}
