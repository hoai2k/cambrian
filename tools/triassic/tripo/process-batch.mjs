#!/usr/bin/env node
/** Preserve and review completed Tripo batch results. Never submits, rigs, or publishes. */
import { createHash, randomUUID } from 'node:crypto';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DEFAULT_PLAN = 'local/triassic-authoring/batch-plan.json';
const DEFAULT_BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';
const REVIEW_SCRIPT = 'tools/triassic/tripo/review.py';
const RENDERS = ['side.png', 'top.png', 'three-quarter.png'];

function usage() {
  console.log(`Usage:
  node tools/triassic/tripo/process-batch.mjs [PLAN.json]
  node tools/triassic/tripo/process-batch.mjs [PLAN.json] --process [--blender PATH]

Dry-run is the default. --process preserves completed raw GLBs and sanitized metadata, then runs
the existing two-thread Blender static review. This script never submits Tripo jobs.`);
}

function parseArgs(argv) {
  const args = { plan: DEFAULT_PLAN, blender: DEFAULT_BLENDER, process: false };
  let planSeen = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--process') args.process = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--blender') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('--blender requires a path');
      args.blender = value;
    } else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else if (planSeen) throw new Error('only one plan path may be supplied');
    else { args.plan = arg; planSeen = true; }
  }
  return args;
}

function repoPath(path) {
  const rel = relative(ROOT, resolve(ROOT, path));
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`path is outside repository: ${path}`);
  return rel.split(sep).join('/');
}

async function readJson(path) { return JSON.parse(await readFile(resolve(ROOT, path), 'utf8')); }
async function sha256(path) { return createHash('sha256').update(await readFile(path)).digest('hex'); }
async function record(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size === 0) throw new Error(`missing or empty file: ${repoPath(path)}`);
  return { bytes: info.size, sha256: await sha256(path) };
}
function assertHash(actual, expected, message) {
  if (!/^[a-f0-9]{64}$/.test(expected || '') || actual !== expected) throw new Error(`${message}: expected ${expected || '<missing>'}, got ${actual}`);
}

function redact(value, key = '') {
  if (/token|signature|authorization/i.test(key)) return undefined;
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return '<redacted download URL>';
  if (Array.isArray(value)) return value.map(item => redact(item)).filter(item => item !== undefined);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([childKey, child]) => [childKey, redact(child, childKey)]).filter(([, child]) => child !== undefined));
  return value;
}

function sanitizedTask(task = {}) {
  const safe = {};
  for (const key of ['type', 'status', 'progress', 'task_id', 'created_at', 'completed_at', 'credits_consumed'])
    if (task[key] !== undefined) safe[key] = task[key];
  if (task.output && typeof task.output === 'object') safe.output = redact(task.output);
  return safe;
}

function sanitizedRequest(request = {}) {
  const safe = redact(request) || {};
  if (request.file) safe.file = { file_token: '<uploaded at runtime>' };
  return safe;
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  await rename(temp, path);
}

async function copyNewOrMatching(source, destination, expectedHash, label) {
  if (existsSync(destination)) {
    const current = await sha256(destination);
    if (current !== expectedHash) throw new Error(`${label}: refusing to overwrite inconsistent ${repoPath(destination)} (${current})`);
    return false;
  }
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  assertHash(await sha256(destination), expectedHash, `${label}: copied file hash mismatch`);
  return true;
}

async function runBlender(command, argv, logPath) {
  await mkdir(dirname(logPath), { recursive: true });
  const chunks = [];
  const child = spawn(command, argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => chunks.push(chunk));
  child.stderr.on('data', chunk => chunks.push(chunk));
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
  await writeFile(logPath, Buffer.concat(chunks));
  if (code !== 0) throw new Error(`Blender review failed with exit ${code}; inspect ${repoPath(logPath)}`);
}

async function inspect(row) {
  if (!row || !/^[a-z0-9][a-z0-9_-]*$/.test(row.id || '')) throw new Error(`unsafe or missing plan id: ${row?.id}`);
  const { id } = row;
  const expectedInput = `docs/triassic/canonical/model-inputs/${id}/input.png`;
  if (repoPath(row.input) !== expectedInput) throw new Error(`${id}: plan input must be ${expectedInput}`);
  const input = await record(resolve(ROOT, row.input));
  assertHash(input.sha256, row.inputSha256, `${id}: current plan input changed`);

  const localDir = resolve(ROOT, `local/triassic-authoring/${id}/tripo`);
  const sourceRaw = resolve(localDir, `${id}.raw.glb`);
  const sourceMetadataPath = resolve(localDir, 'metadata.json');
  if (!existsSync(sourceRaw) && !existsSync(sourceMetadataPath)) return { id, state: 'not-downloaded' };
  if (!existsSync(sourceRaw) || !existsSync(sourceMetadataPath)) throw new Error(`${id}: incomplete local output; raw GLB and metadata.json must both exist`);
  const sourceMetadata = await readJson(repoPath(sourceMetadataPath));
  if (sourceMetadata.name !== id) throw new Error(`${id}: local metadata names ${sourceMetadata.name || '<missing>'}`);
  if (sourceMetadata.task?.status !== 'success') throw new Error(`${id}: local task status is ${sourceMetadata.task?.status || '<missing>'}, not success`);
  assertHash(input.sha256, sourceMetadata.image?.sha256, `${id}: local metadata image mismatch`);
  const raw = await record(sourceRaw);
  assertHash(raw.sha256, sourceMetadata.artifact?.sha256, `${id}: local artifact mismatch`);
  if ((await readFile(sourceRaw)).subarray(0, 4).toString('ascii') !== 'glTF') throw new Error(`${id}: local artifact is not a binary GLB`);

  const rawDir = resolve(ROOT, `tools/triassic/creatures/${id}/tripo-raw`);
  const destinationRaw = resolve(rawDir, `${id}.raw.glb`);
  const destinationMetadata = resolve(rawDir, 'metadata.json');
  const sourceReviewDir = resolve(rawDir, 'review');
  const sourceAudit = resolve(sourceReviewDir, 'audit.json');
  const preview = resolve(ROOT, `tools/triassic/creatures/${id}/${id}.preview.glb`);
  const localReviewDir = resolve(ROOT, `local/triassic-authoring/${id}/tripo-review`);
  if (existsSync(destinationRaw)) assertHash(await sha256(destinationRaw), raw.sha256, `${id}: preserved raw body is inconsistent`);
  if (existsSync(destinationMetadata)) {
    const previous = await readJson(repoPath(destinationMetadata));
    assertHash(previous.image?.sha256, input.sha256, `${id}: preserved metadata uses another image`);
    assertHash(previous.artifact?.sha256, raw.sha256, `${id}: preserved metadata uses another body`);
  }
  let audit = null;
  if (existsSync(sourceAudit)) {
    audit = await readJson(repoPath(sourceAudit));
    assertHash(audit.input?.sha256, raw.sha256, `${id}: preserved review uses another body`);
  }
  if (existsSync(preview) && !audit) throw new Error(`${id}: preview exists without a matching preserved audit; refusing to overwrite it`);
  const complete = Boolean(audit && existsSync(preview) && RENDERS.every(file => existsSync(resolve(sourceReviewDir, file)))
    && audit.preview?.sha256 === await sha256(preview));
  return { id, state: complete ? 'complete' : 'ready', row, input, raw, sourceRaw, sourceMetadata,
    rawDir, destinationRaw, destinationMetadata, sourceReviewDir, sourceAudit, preview, localReviewDir };
}

function sanitizeAuditPaths(audit, job) {
  audit.input.path = repoPath(job.destinationRaw);
  if (audit.preview) audit.preview.path = repoPath(job.preview);
  audit.renders = Object.fromEntries(Object.entries(audit.renders || {})
    .map(([view, path]) => [view, `${repoPath(job.sourceReviewDir)}/${basename(path)}`]));
  return audit;
}

async function processJob(job, blender) {
  const copied = await copyNewOrMatching(job.sourceRaw, job.destinationRaw, job.raw.sha256, job.id);
  const metadata = {
    schema_version: 1, name: job.id, task: sanitizedTask(job.sourceMetadata.task),
    request: sanitizedRequest(job.sourceMetadata.request),
    image: { path: repoPath(job.row.input), sha256: job.input.sha256, bytes: job.input.bytes },
    artifact: { path: repoPath(job.destinationRaw), bytes: job.raw.bytes, sha256: job.raw.sha256,
      source_output_field: job.sourceMetadata.artifact?.source_output_field },
    downloaded_at: job.sourceMetadata.downloaded_at,
  };
  await atomicJson(job.destinationMetadata, metadata);
  if (job.state === 'complete') {
    const audit = sanitizeAuditPaths(await readJson(repoPath(job.sourceAudit)), job);
    await atomicJson(job.sourceAudit, audit);
    console.log(`${job.id}: already processed; raw hash matches`);
    return;
  }

  await runBlender(resolve(ROOT, blender), ['--background', '--factory-startup', '-t', '2', '--python-exit-code', '1',
    '--python', resolve(ROOT, REVIEW_SCRIPT), '--', '--input', job.destinationRaw, '--out', job.localReviewDir,
    '--preview', job.preview], resolve(job.localReviewDir, 'review.log'));
  const audit = await readJson(repoPath(resolve(job.localReviewDir, 'audit.json')));
  assertHash(audit.input?.sha256, job.raw.sha256, `${job.id}: review audited another body`);
  assertHash(await sha256(job.preview), audit.preview?.sha256, `${job.id}: preview hash mismatch`);
  sanitizeAuditPaths(audit, job);
  await mkdir(job.sourceReviewDir, { recursive: true });
  for (const file of RENDERS) {
    const source = resolve(job.localReviewDir, file);
    const image = await record(source);
    await copyNewOrMatching(source, resolve(job.sourceReviewDir, file), image.sha256, `${job.id} ${file}`);
  }
  await atomicJson(job.sourceAudit, audit);
  console.log(`${job.id}: ${copied ? 'preserved raw; ' : ''}reviewed and packaged audit/renders`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  const plan = await readJson(args.plan);
  if (!Array.isArray(plan.ready)) throw new Error('plan.ready must be an array');
  const ids = new Set();
  for (const row of plan.ready) {
    if (ids.has(row.id)) throw new Error(`duplicate plan id: ${row.id}`);
    ids.add(row.id);
  }
  const jobs = [];
  for (const row of plan.ready) jobs.push(await inspect(row));
  const downloaded = jobs.filter(job => job.state !== 'not-downloaded');
  const ready = downloaded.filter(job => job.state === 'ready');
  const complete = downloaded.filter(job => job.state === 'complete');
  console.log(`${plan.ready.length} planned; ${downloaded.length} downloaded; ${ready.length} ready; ${complete.length} already processed`);
  if (!args.process) {
    for (const job of ready) console.log(`${job.id}: would preserve ${repoPath(job.destinationRaw)} and run static review`);
    console.log('dry-run only; pass --process to copy and review completed downloads');
    return;
  }
  for (const job of downloaded) await processJob(job, args.blender);
  console.log('Completed raw batch processing. No shipped, registry, approval, or rigging state was changed.');
}

main().catch(error => { console.error(`tripo process: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
