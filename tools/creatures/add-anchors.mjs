/**
 * Append anatomical sockets without touching mesh/animation binary data.
 * Pipeline: build -> package-expansion.mjs -> add-anchors.mjs -> update sizes.
 * Usage: node tools/creatures/add-anchors.mjs [--check] [expansion IDs...]
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, mkdir, copyFile, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Vector3, Quaternion } from 'three';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS = path.join(ROOT, 'public/assets/creatures');
const LOCAL = process.env.CAMBRIAN_PACKAGING || path.resolve(ROOT, '../expansion-authoring/packaging');
const IDS = ['pikaia', 'nectocaris', 'burgessomedusa', 'odaraia', 'ottoia', 'cambroraster', 'sidneyia', 'leanchoilia', 'isoxys', 'odontogriphus', 'ctenorhabdotus', 'vetulicola', 'tamisiocaris'];
const ORIGINALS = ['anomalocaris', 'opabinia', 'waptia', 'canadia', 'hallucigenia', 'wiwaxia', 'marrella', 'olenoides'];
const REQUIRED = { anchor_mouth: 'mouth', anchor_mouth_inside: 'swallow', anchor_attack_primary: 'attack' };
const hash = (data) => createHash('sha256').update(data).digest('hex');

function parseGLB(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'Not a GLB');
  assert.equal(bytes.readUInt32LE(4), 2, 'Unsupported GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB length mismatch');
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'First chunk is not JSON');
  const length = bytes.readUInt32LE(12);
  assert(length % 4 === 0 && 20 + length <= bytes.length, 'Invalid JSON chunk');
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  const trailing = bytes.subarray(20 + length);
  let offset = 0, bin = null;
  while (offset < trailing.length) {
    assert(offset + 8 <= trailing.length, 'Truncated chunk header');
    const size = trailing.readUInt32LE(offset), type = trailing.readUInt32LE(offset + 4);
    assert(size % 4 === 0 && offset + 8 + size <= trailing.length, 'Invalid trailing chunk');
    if (type === 0x004e4942) { assert.equal(bin, null, 'Multiple BIN chunks'); bin = trailing.subarray(offset + 8, offset + 8 + size); }
    offset += 8 + size;
  }
  assert(bin, 'Missing BIN chunk');
  return { json, trailing, bin };
}
function writeGLB(json, trailing) {
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20); text.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + trailing.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded, trailing]);
}
function hierarchy(nodes) {
  const parent = new Map();
  for (let i = 0; i < nodes.length; i++) for (const child of nodes[i].children ?? []) {
    assert(child >= 0 && child < nodes.length, 'Invalid child node');
    assert(!parent.has(child), 'Node has more than one parent'); parent.set(child, i);
  }
  const cache = new Map(), visiting = new Set();
  function world(i) {
    if (cache.has(i)) return cache.get(i);
    assert(!visiting.has(i), 'Cyclic node hierarchy'); visiting.add(i);
    const n = nodes[i];
    const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
      new Vector3().fromArray(n.translation ?? [0, 0, 0]), new Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(n.scale ?? [1, 1, 1]),
    );
    const result = parent.has(i) ? world(parent.get(i)).clone().multiply(local) : local;
    assert(result.elements.every(Number.isFinite), 'Nonfinite node transform');
    visiting.delete(i); cache.set(i, result); return result;
  }
  return { parent, world };
}
function cleanRecord(record) {
  const role = record.role === 'mouth_inside' ? 'swallow' : record.role;
  assert(['mouth', 'swallow', 'attack', 'grasp'].includes(role), `${record.name}: invalid role`);
  assert(record.name.startsWith('anchor_'), 'Socket name must start anchor_');
  assert(typeof record.bone === 'string' && record.bone, 'Missing socket parent bone');
  assert(record.point?.length === 3 && record.point.every(Number.isFinite), 'Invalid source point');
  return { ...record, role };
}

/** Pure append operation, exported for fixture tests; never writes a file. */
export function appendAnchors(input, sourceRecords) {
  const source = parseGLB(input);
  const json = structuredClone(source.json), nodes = json.nodes;
  assert(Array.isArray(nodes), 'No node graph');
  const oldCount = nodes.length;
  const records = sourceRecords.map(cleanRecord);
  assert.equal(new Set(records.map((a) => a.name)).size, records.length, 'Duplicate source anchor');
  for (const [name, role] of Object.entries(REQUIRED)) assert(records.some((a) => a.name === name && a.role === role), `Missing required ${name}/${role}`);
  const { parent, world } = hierarchy(nodes);
  function named(name) {
    const matches = nodes.map((node, i) => node.name === name ? i : -1).filter((i) => i >= 0);
    assert.equal(matches.length, 1, `Expected one node named ${name}, found ${matches.length}`);
    return matches[0];
  }
  const rows = []; let added = 0;
  for (const a of records) {
    const parentIndex = named(a.bone), parentWorld = world(parentIndex);
    assert(Math.abs(parentWorld.determinant()) > 1e-12, `${a.name}: noninvertible parent transform`);
    const expectedWorld = new Vector3(a.point[0], a.point[2], -a.point[1]);
    const local = expectedWorld.clone().applyMatrix4(parentWorld.clone().invert());
    const extras = { version: 1, role: a.role, parentBone: a.bone };
    if (a.chain?.length) {
      assert.equal(a.solver, 'CCD', `${a.name}: unsupported solver`);
      assert.equal(new Set(a.chain).size, a.chain.length, `${a.name}: duplicate chain bone`);
      for (const bone of a.chain) assert(bone !== 'root' && bone !== 'body' && !bone.startsWith('segment_'), `${a.name}: locomotor bone in feeding chain`);
      const chainIndices = a.chain.map(named);
      for (let j = 1; j < chainIndices.length; j++) assert.equal(parent.get(chainIndices[j]), chainIndices[j - 1], `${a.name}: chain is not ordered direct ancestry`);
      assert.equal(a.effectorBone, a.chain.at(-1), `${a.name}: chain does not end at effector`);
      assert.equal(a.bone, a.effectorBone, `${a.name}: socket must follow effector bone`);
      assert(local.length() > 1e-8, `${a.name}: zero-reach CCD contact`);
      extras.chain = [...a.chain]; extras.effectorBone = a.effectorBone; extras.solver = 'CCD';
    } else assert(!a.solver && !a.effectorBone, `${a.name}: solver without meaningful chain`);
    const expected = { name: a.name, translation: local.toArray(), extras: { cambrianAnchor: extras } };
    const existing = nodes.map((n, i) => n.name === a.name ? i : -1).filter((i) => i >= 0);
    let anchorIndex;
    if (existing.length) {
      assert.equal(existing.length, 1, `${a.name}: duplicate existing socket`);
      anchorIndex = existing[0];
      assert.equal(parent.get(anchorIndex), parentIndex, `${a.name}: existing socket has another parent`);
      assert.deepEqual(nodes[anchorIndex].extras?.cambrianAnchor, extras, `${a.name}: existing metadata differs`);
      assert(!nodes[anchorIndex].matrix && !nodes[anchorIndex].rotation && !nodes[anchorIndex].scale, `${a.name}: existing nontranslation socket`);
      assert(new Vector3().fromArray(nodes[anchorIndex].translation ?? [0, 0, 0]).distanceTo(local) < 1e-9, `${a.name}: existing point differs`);
    } else {
      anchorIndex = nodes.length; nodes.push(expected);
      nodes[parentIndex].children = [...(nodes[parentIndex].children ?? []), anchorIndex];
      added++;
    }
    const reconstructed = new Vector3().fromArray(nodes[anchorIndex].translation).applyMatrix4(parentWorld);
    const worldError = reconstructed.distanceTo(expectedWorld);
    assert(worldError < 1e-8, `${a.name}: world point reconstruction failed`);
    rows.push({ name: a.name, role: a.role, parentBone: a.bone, world: expectedWorld.toArray(), local: local.toArray(), chain: extras.chain ?? [], worldError });
  }
  // Existing node indices and every field except appended child references stay
  // exact. All other JSON sections (skins, animations, buffers...) stay exact.
  for (let i = 0; i < oldCount; i++) {
    const before = source.json.nodes[i], after = nodes[i];
    const { children: oldChildren, ...oldRest } = before;
    const { children: newChildren, ...newRest } = after;
    assert.deepEqual(newRest, oldRest, `Existing node ${i} changed`);
    assert.deepEqual((newChildren ?? []).slice(0, (oldChildren ?? []).length), oldChildren ?? [], `Existing child references changed on node ${i}`);
    assert((newChildren ?? []).slice((oldChildren ?? []).length).every((index) => index >= oldCount), 'Nonappend child mutation');
  }
  const { nodes: oldNodes, ...oldJson } = source.json;
  const { nodes: newNodes, ...newJson } = json;
  assert.deepEqual(newJson, oldJson, 'Non-node GLB JSON changed');
  const bytes = added ? writeGLB(json, source.trailing) : input;
  const output = parseGLB(bytes);
  assert(output.bin.equals(source.bin), 'BIN payload changed');
  assert(output.trailing.equals(source.trailing), 'Trailing chunks changed');
  return { bytes, added, rows, beforeNodes: oldCount, afterNodes: nodes.length, binSha256: hash(source.bin) };
}

async function originalHashes() {
  const names = (await readdir(ASSETS)).filter((n) => ORIGINALS.some((id) => n.startsWith(`${id}.`))).sort();
  assert(names.length >= 32, 'Original-roster files missing');
  const result = {};
  for (const name of names) result[name] = hash(await readFile(path.join(ASSETS, name)));
  return result;
}
async function main() {
  const args = process.argv.slice(2), checkOnly = args.includes('--check');
  const chosen = args.filter((a) => a !== '--check');
  const ids = chosen.length ? [...new Set(chosen)] : IDS;
  for (const id of ids) assert(IDS.includes(id), `Refusing non-expansion ID: ${id}`);
  const sources = {};
  for (const group of ['soft', 'jellies', 'arthropods']) {
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'tools/creatures', group, 'anchors.json'), 'utf8'));
    for (const [id, records] of Object.entries(manifest)) { assert(!sources[id], `Duplicate source ID ${id}`); sources[id] = records; }
  }
  for (const id of IDS) assert(sources[id]?.length, `Missing ${id} source manifest`);
  const originalBefore = await originalHashes(), pending = [];
  // Prepare and verify the entire requested batch before writing any asset.
  for (const id of ids) for (const suffix of ['', '.lod1']) {
    const name = `${id}${suffix}.glb`, file = path.join(ASSETS, name);
    const input = await readFile(file), result = appendAnchors(input, sources[id]);
    // A second application must produce byte-identical output, not just the
    // same graph. This also verifies every newly appended socket's parent.
    const repeat = appendAnchors(result.bytes, sources[id]);
    assert.equal(repeat.added, 0, `${name}: non-idempotent append`);
    assert(repeat.bytes.equals(result.bytes), `${name}: non-idempotent bytes`);
    pending.push({ id, name, file, input, ...result });
  }
  if (!checkOnly) {
    await mkdir(LOCAL, { recursive: true });
    for (const item of pending) if (item.added) {
      try { await copyFile(item.file, path.join(LOCAL, `${item.name}.before-anchors.glb`), constants.COPYFILE_EXCL); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      const temp = path.join(LOCAL, `${item.name}.anchors-pending`);
      await writeFile(temp, item.bytes); await rename(temp, item.file);
    }
  }
  const originalAfter = await originalHashes(); assert.deepEqual(originalAfter, originalBefore, 'Original roster changed');
  const report = { at: new Date().toISOString(), checkOnly, originalAssetCount: Object.keys(originalBefore).length, originalSha256: originalBefore, originalsByteIdentical: true, assets: pending.map((p) => ({
    id: p.id, file: p.name, bytes: p.bytes.length, sha256: hash(p.bytes), added: p.added, totalAnchors: p.rows.length, beforeNodes: p.beforeNodes, afterNodes: p.afterNodes,
    binSha256: p.binSha256, binByteIdentical: true, priorNodesPreserved: true, appendOnly: true, idempotent: true, anchors: p.rows,
  })) };
  if (!checkOnly) await writeFile(path.join(LOCAL, 'anchor-validation.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const row of report.assets) console.log(`${row.file}: ${row.totalAnchors} anchors, ${row.added} appended, ${row.bytes} bytes; BIN exact / graph append-only / idempotence PASS`);
  console.log(`${checkOnly ? 'CHECK ONLY; no files written. ' : ''}Original roster: ${report.originalAssetCount} files byte-identical.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
