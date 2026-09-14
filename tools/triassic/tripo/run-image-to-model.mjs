#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import process from 'node:process';

const BASE_URL = 'https://openapi.tripo3d.ai/v3';
const FINAL = new Set(['success', 'failed', 'banned', 'expired', 'cancelled', 'unknown']);
const TYPES = new Map([
  ['.png', ['png', 'image/png']],
  ['.jpg', ['jpeg', 'image/jpeg']],
  ['.jpeg', ['jpeg', 'image/jpeg']],
  ['.webp', ['webp', 'image/webp']],
]);

function fail(message) {
  console.error(`tripo: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = { model: 'v3.1-20260211', faceLimit: 20000, pollSeconds: 5, timeoutSeconds: 900 };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--submit') args.submit = true;
    else if (key === '--help' || key === '-h') args.help = true;
    else {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`missing value for ${key}`);
      if (key === '--name') args.name = value;
      else if (key === '--image') args.image = value;
      else if (key === '--out') args.out = value;
      else if (key === '--model') args.model = value;
      else if (key === '--face-limit') args.faceLimit = Number(value);
      else if (key === '--poll-seconds') args.pollSeconds = Number(value);
      else if (key === '--timeout-seconds') args.timeoutSeconds = Number(value);
      else throw new Error(`unknown option ${key}`);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node tools/triassic/tripo/run-image-to-model.mjs --name NAME --image IMAGE --out DIR
  TRIPO_API_KEY=... node tools/triassic/tripo/run-image-to-model.mjs --name NAME --image IMAGE --out DIR --submit

Without --submit this only validates and prints the request summary. With --submit it uploads,
creates one image-to-model task, polls for at most --timeout-seconds, and downloads NAME.raw.glb.
An existing DIR/state.json is resumed and never submitted again.`);
}

async function atomicJson(path, value) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, path);
}

async function request(path, { apiKey, method = 'GET', body, headers = {}, timeout = 60_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`HTTP ${response.status} returned non-JSON`); }
    if (!response.ok || (typeof json.code === 'number' && json.code !== 0)) {
      const detail = json.message || json.error || json.suggestion || 'request rejected';
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }
    return json.data ?? json;
  } finally {
    clearTimeout(timer);
  }
}

function safeTask(task) {
  const copy = structuredClone(task);
  if (copy.output && typeof copy.output === 'object') {
    for (const [key, value] of Object.entries(copy.output)) {
      if (typeof value === 'string' && /^https?:\/\//.test(value)) copy.output[key] = '<redacted download URL>';
      if (Array.isArray(value)) copy.output[key] = value.map((item) => typeof item === 'string' && /^https?:\/\//.test(item) ? '<redacted download URL>' : item);
    }
  }
  return copy;
}

async function downloadCompletedTask(initialTask, taskId, apiKey) {
  let task = initialTask;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    // Refresh the completed task before a retry so an expired signed URL can be replaced. This is
    // an idempotent GET; generation POSTs remain guarded by the persisted task_id above.
    if (attempt > 1) task = await request(`/tasks/${encodeURIComponent(taskId)}`, { apiKey });
    const output = task.output || {};
    const candidates = ['pbr_model_url', 'model_url', 'pbr_model', 'model'];
    const selected = candidates.find((key) => typeof output[key] === 'string' && /^https?:\/\//.test(output[key]));
    if (!selected) throw new Error('successful task did not expose a model download URL');
    try {
      const response = await fetch(output[selected], { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 12 || Buffer.from(bytes.subarray(0, 4)).toString('ascii') !== 'glTF')
        throw new Error('response was not a binary GLB');
      return { bytes, selected, task };
    } catch (error) {
      lastError = error;
      const detail = error?.cause?.code || error?.cause?.name || error?.name || error?.message || 'network error';
      if (attempt < 4) {
        console.warn(`Model download attempt ${attempt} failed (${detail}); refreshing the completed task and retrying.`);
        await new Promise((done) => setTimeout(done, attempt * 2_000));
      }
    }
  }
  const detail = lastError?.cause?.code || lastError?.cause?.name || lastError?.name || lastError?.message || 'network error';
  throw new Error(`model download failed after 4 idempotent attempts (${detail}); rerun to resume the same task`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (!args.name || !/^[a-z0-9][a-z0-9_-]*$/i.test(args.name)) throw new Error('--name is required and must be filename-safe');
  if (!args.image || !args.out) throw new Error('--image and --out are required');
  if (!Number.isInteger(args.faceLimit) || args.faceLimit < 48 || args.faceLimit > 20000) throw new Error('--face-limit must be an integer from 48 to 20000');
  if (!(args.pollSeconds >= 1 && args.pollSeconds <= 60)) throw new Error('--poll-seconds must be from 1 to 60');
  if (!(args.timeoutSeconds >= 1 && args.timeoutSeconds <= 3600)) throw new Error('--timeout-seconds must be from 1 to 3600');

  const imagePath = resolve(args.image);
  const outDir = resolve(args.out);
  const [format, contentType] = TYPES.get(extname(imagePath).toLowerCase()) || [];
  if (!format) throw new Error('image must be PNG, JPEG, or WebP');
  const imageStat = await stat(imagePath);
  if (!imageStat.isFile() || imageStat.size === 0) throw new Error('image is missing or empty');
  if (imageStat.size > 20 * 1024 * 1024) throw new Error('image exceeds the 20 MB API limit');
  const imageBytes = await readFile(imagePath);
  const imageSha256 = createHash('sha256').update(imageBytes).digest('hex');
  const requestTemplate = { file: { file_token: '<uploaded at runtime>' }, model: args.model, face_limit: args.faceLimit, texture: true, pbr: true };
  const fingerprint = createHash('sha256').update(JSON.stringify({ imageSha256, ...requestTemplate, file: undefined })).digest('hex');
  const statePath = `${outDir}/state.json`;
  const modelPath = `${outDir}/${args.name}.raw.glb`;
  const metadataPath = `${outDir}/metadata.json`;

  let state = null;
  try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (state && state.request_fingerprint !== fingerprint) throw new Error(`existing ${statePath} belongs to a different image or request; choose another --out directory`);

  if (!args.submit) {
    console.log(JSON.stringify({ dry_run: true, name: args.name, image: imagePath, image_bytes: imageStat.size, image_sha256: imageSha256, out: outDir, request: requestTemplate, resume_task_id: state?.task_id ?? null }, null, 2));
    return;
  }
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) throw new Error('TRIPO_API_KEY is required with --submit');
  await mkdir(outDir, { recursive: true });

  state ||= { schema_version: 1, name: args.name, image: imagePath, image_sha256: imageSha256, request_fingerprint: fingerprint, request: requestTemplate, created_at: new Date().toISOString() };
  if (!state.file_token) {
    const form = new FormData();
    form.append('file', new Blob([imageBytes], { type: contentType }), basename(imagePath));
    const upload = await request('/files', { apiKey, method: 'POST', body: form });
    state.file_token = upload.file_token || upload.image_token;
    if (!state.file_token) throw new Error('upload response did not contain file_token');
    state.uploaded_at = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log('Uploaded input; state saved.');
  }
  if (!state.task_id) {
    const payload = { ...requestTemplate, file: { file_token: state.file_token } };
    const created = await request('/generation/image-to-model', { apiKey, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    state.task_id = created.task_id;
    if (!state.task_id) throw new Error('generation response did not contain task_id');
    state.submitted_at = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log(`Submitted task ${state.task_id}; state saved.`);
  } else {
    console.log(`Resuming task ${state.task_id}.`);
  }

  const deadline = Date.now() + args.timeoutSeconds * 1000;
  let task;
  while (true) {
    task = await request(`/tasks/${encodeURIComponent(state.task_id)}`, { apiKey });
    state.status = task.status;
    state.progress = task.progress;
    state.last_polled_at = new Date().toISOString();
    await atomicJson(statePath, state);
    console.log(`${task.status}${Number.isFinite(task.progress) ? ` ${task.progress}%` : ''}`);
    if (FINAL.has(task.status)) break;
    if (Date.now() >= deadline) throw new Error(`poll timeout; rerun the same command to resume task ${state.task_id}`);
    await new Promise((done) => setTimeout(done, args.pollSeconds * 1000));
  }
  if (task.status !== 'success') throw new Error(`task ${state.task_id} ended with status ${task.status}`);

  const downloaded = await downloadCompletedTask(task, state.task_id, apiKey);
  task = downloaded.task;
  const { bytes, selected } = downloaded;
  const tempModel = `${modelPath}.${process.pid}.tmp`;
  await writeFile(tempModel, bytes);
  await rename(tempModel, modelPath);
  const metadata = { schema_version: 1, name: args.name, task: safeTask(task), request: requestTemplate, image: { path: imagePath, sha256: imageSha256, bytes: imageStat.size }, artifact: { path: modelPath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), source_output_field: selected }, downloaded_at: new Date().toISOString() };
  await atomicJson(metadataPath, metadata);
  state.downloaded_at = metadata.downloaded_at;
  state.artifact = metadata.artifact;
  await atomicJson(statePath, state);
  console.log(`Downloaded ${modelPath} (${bytes.length} bytes); metadata saved.`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
