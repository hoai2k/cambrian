#!/usr/bin/env node
/** Bounded, resumable generation only. Inputs come from batch-plan.ts after human review.
 * node run-batch.mjs PLAN.json --budget 655 --submit
 * TRIPO_API_KEY is inherited; never persisted here. Raw task state remains under local/.
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const plan = JSON.parse(readFileSync(args[0], 'utf8'));
const budgetArg = args.indexOf('--budget');
const budget = budgetArg < 0 ? 0 : Number(args[budgetArg + 1]);
if (!Number.isFinite(budget) || budget <= 0) throw new Error('Explicit positive --budget required');
const cap = Math.floor(budget / plan.estimatedCreditsPerSubmission);
const journalDir = resolve('local/triassic-authoring/batch');
mkdirSync(journalDir, { recursive: true });
const manifest = JSON.parse(readFileSync('docs/triassic/canonical/manifest.json', 'utf8'));
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const rows = plan.ready.slice(0, cap);
for (const r of rows) {
  if (manifest.subjects[r.id]?.canonical !== 'greenlit') throw new Error(`${r.id}: approval changed`);
  if (hash(r.input) !== r.inputSha256) throw new Error(`${r.id}: input changed`);
}
console.log(`${rows.length} jobs within ${budget} credits (${cap} maximum submissions), playable first.`);
if (!args.includes('--submit')) process.exit(0);
if (!process.env.TRIPO_API_KEY) throw new Error('TRIPO_API_KEY required');
// Serial spending makes each submission and failure explicit; the service itself builds in parallel internally.
// Re-running resumes saved task IDs. Failed jobs stop the batch and are never silently resubmitted.
for (const r of rows) {
  const out = resolve(`local/triassic-authoring/${r.id}/tripo`);
  const meta = resolve(out, 'metadata.json');
  if (existsSync(meta) && existsSync(resolve(out, `${r.id}.raw.glb`))) {
    const saved = JSON.parse(readFileSync(meta, 'utf8'));
    if (saved.image.sha256 !== r.inputSha256) throw new Error(`${r.id}: saved output uses a different input`);
    if (hash(resolve(out, `${r.id}.raw.glb`)) !== saved.artifact.sha256) throw new Error(`${r.id}: saved output hash mismatch`);
    console.log(`${r.id}: already downloaded; no new charge`); continue;
  }
  const logPath = resolve(journalDir, `${r.id}.log`);
  const fd = openSync(logPath, 'a');
  console.log(`${r.id}: generating/resuming; ${logPath}`);
  const child = spawn(process.execPath, ['tools/triassic/tripo/run-image-to-model.mjs', '--name', r.id,
    '--image', r.input, '--out', out, '--poll-seconds', '20', '--timeout-seconds', '1800', '--submit'],
  { env: process.env, stdio: ['ignore', fd, fd] });
  const result = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
  closeSync(fd);
  writeFileSync(resolve(journalDir, 'progress.json'), JSON.stringify({ updatedAt: new Date().toISOString(), id: r.id, exitCode: result, logPath }, null, 2));
  if (result !== 0) throw new Error(`${r.id}: stopped; inspect log before resuming (no automatic paid retry)`);
  console.log(`${r.id}: downloaded`);
}
console.log('Requested generation batch finished. Review and process before publishing.');
