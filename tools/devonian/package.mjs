/** Lossless packaging for individually authored Devonian specimens. */
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readFile, writeFile, readdir, mkdir, copyFile, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const props = process.argv.includes('--props');
const ASSETS = path.join(ROOT, 'public/assets/devonian', props ? 'props' : 'creatures');
const CAMBRIAN_ASSETS = path.join(ROOT, 'public/assets/creatures');
const LOCAL = process.env.DEVONIAN_PACKAGING || path.resolve(ROOT, '../devonian-authoring/packaging');
const STATS = path.join(LOCAL, props ? 'packaging-props.json' : 'packaging.json');
const IDS = props ? JSON.parse(await readFile(path.join(ASSETS, 'manifest.json'), 'utf8')).props.map(p => p.id) : JSON.parse(await readFile(path.join(ROOT, 'tools/devonian/roster.json'), 'utf8'));
const KEEP_LOD = new Set(['Idle', 'Swim', 'Crawl', 'Death']);
const args = process.argv.slice(2).filter(s => s !== '--props');
const ids = args.length ? [...new Set(args)] : IDS;
for (const id of ids) assert(IDS.includes(id), `Refusing non-Devonian ID: ${id}`);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
await mkdir(LOCAL, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sorted = (xs) => [...xs].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

async function originalHashes() {
  const names = (await readdir(CAMBRIAN_ASSETS)).filter(n => /\.(glb|png)$/.test(n)).sort();
  const result = {};
  for (const name of names) result[name] = hash(await readFile(path.join(CAMBRIAN_ASSETS, name)));
  assert(names.length >= 42, 'Missing original assets: cannot certify original roster');
  return result;
}

// Hash numeric values as Float64 so harmless accessor storage-width changes do
// not look like changes. No tolerance: every decoded number must remain exact.
function numericDigest(values) {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    assert(Number.isFinite(values[i]), 'Nonfinite accessor value');
    out[i] = values[i];
  }
  return hash(new Uint8Array(out.buffer));
}
function accessor(a) {
  return a ? { type: a.getType(), normalized: a.getNormalized(), count: a.getCount(), values: numericDigest(a.getArray()) } : null;
}
function orientedIndices(p) {
  const indices = p.getIndices()?.getArray();
  if (!indices) return null;
  // Meshopt triangle encoding may cyclically rotate a triangle's three indices.
  // Preserve oriented topology and triangle order, allowing that exact rotation.
  const out = new Uint32Array(indices.length);
  if (p.getMode() === 4) {
    for (let i = 0; i < indices.length; i += 3) {
      const tri = [indices[i], indices[i + 1], indices[i + 2]];
      let k = 0;
      if (tri[1] < tri[k]) k = 1;
      if (tri[2] < tri[k]) k = 2;
      for (let j = 0; j < 3; j++) out[i + j] = tri[(k + j) % 3];
    }
  } else out.set(indices);
  return numericDigest(out);
}
function texture(t) {
  return t ? { mime: t.getMimeType(), image: hash(t.getImage()), extras: t.getExtras() } : null;
}
function snapshot(doc) {
  const root = doc.getRoot();
  const nodes = root.listNodes();
  const key = (n) => n ? `${nodes.indexOf(n)}:${n.getName()}` : null;
  const matKey = (m) => m?.getName() ?? null;
  const materialState = (m) => ({
    name: m.getName(), extras: m.getExtras(), color: m.getBaseColorFactor(), metallic: m.getMetallicFactor(), roughness: m.getRoughnessFactor(),
    emissive: m.getEmissiveFactor(), alpha: m.getAlphaMode(), cutoff: m.getAlphaCutoff(), doubleSided: m.getDoubleSided(),
    normalScale: m.getNormalTexture() ? m.getNormalScale() : null, occlusionStrength: m.getOcclusionTexture() ? m.getOcclusionStrength() : null,
    textures: ['BaseColor', 'Normal', 'MetallicRoughness', 'Occlusion', 'Emissive'].map((slot) => texture(m[`get${slot}Texture`]())),
    extensions: m.listExtensions().map((e) => ({ name: e.extensionName, property: e.propertyType })),
  });
  return {
    scenes: root.listScenes().map((s) => ({ name: s.getName(), children: s.listChildren().map(key), extras: s.getExtras() })),
    nodes: nodes.map((n) => ({ name: n.getName(), children: n.listChildren().map(key), t: n.getTranslation(), r: n.getRotation(), s: n.getScale(), mesh: n.getMesh()?.getName() ?? null, skin: n.getSkin()?.getName() ?? null, weights: n.getWeights(), extras: n.getExtras() })),
    skins: root.listSkins().map((s) => ({ name: s.getName(), joints: s.listJoints().map(key), skeleton: key(s.getSkeleton()), inverseBind: accessor(s.getInverseBindMatrices()), extras: s.getExtras() })),
    meshes: root.listMeshes().map((m) => ({ name: m.getName(), weights: m.getWeights(), extras: m.getExtras(), primitives: m.listPrimitives().map((p) => ({
      mode: p.getMode(), material: matKey(p.getMaterial()), indices: orientedIndices(p),
      attrs: sorted(p.listSemantics()).map((s) => [s, accessor(p.getAttribute(s))]),
      morphs: p.listTargets().map((t) => sorted(t.listSemantics()).map((s) => [s, accessor(t.getAttribute(s))])), extras: p.getExtras(),
    })) })),
    materials: root.listMaterials().map(materialState),
    animations: root.listAnimations().map((a) => ({ name: a.getName(), extras: a.getExtras(), channels: a.listChannels().map((c) => ({
      node: key(c.getTargetNode()), path: c.getTargetPath(), interpolation: c.getSampler().getInterpolation(), input: accessor(c.getSampler().getInput()), output: accessor(c.getSampler().getOutput()),
    })) })),
  };
}

function assertSnapshot(actual, expected, label) {
  function difference(a, b, at = '') {
    if (JSON.stringify(a) === JSON.stringify(b)) return null;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const found = difference(a[k], b[k], `${at}.${k}`);
        if (found) return found;
      }
    }
    return `${at}: ${JSON.stringify(b)} -> ${JSON.stringify(a)}`;
  }
  const diff = difference(actual, expected);
  if (diff) throw new Error(`${label}: ${diff}`);
}
function preserveNodeTransforms(bytes, doc) {
  // NodeIO omits transforms within an epsilon of identity. Explicitly restore
  // every authored local TRS so bind poses also round-trip with exact numbers.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  const nodes = doc.getRoot().listNodes();
  assert.equal(json.nodes.length, nodes.length, 'Writer changed node count');
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i], dest = json.nodes[i];
    assert.equal(dest.name ?? '', source.getName(), 'Writer changed node order');
    delete dest.matrix;
    dest.translation = source.getTranslation();
    dest.rotation = source.getRotation();
    dest.scale = source.getScale();
  }
  const payload = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(payload.length / 4) * 4, 0x20);
  payload.copy(padded);
  const rest = bytes.subarray(20 + length);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + rest.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return new Uint8Array(Buffer.concat([header, padded, rest]));
}

function counts(doc) {
  const root = doc.getRoot();
  return {
    nodes: root.listNodes().length,
    skins: root.listSkins().length,
    joints: root.listSkins().reduce((n, s) => n + s.listJoints().length, 0),
    meshes: root.listMeshes().length,
    triangles: root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getMode() === 4 ? (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3 : 0), 0),
    clips: root.listAnimations().map((a) => ({ name: a.getName(), duration: Math.max(0, ...a.listSamplers().map((s) => { const v = s.getInput().getArray(); return v[v.length - 1] ?? 0; })) })),
    textures: root.listTextures().length,
  };
}
function stripLod(doc) {
  const root = doc.getRoot();
  for (const a of root.listAnimations()) {
    if (KEEP_LOD.has(a.getName())) continue;
    for (const channel of a.listChannels()) channel.dispose();
    for (const sampler of a.listSamplers()) sampler.dispose();
    a.dispose();
  }
  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
  }
  // dispose() also clears texture references on material extension properties.
  for (const tex of root.listTextures()) tex.dispose();
}

const originalsBefore = await originalHashes();
let stats = { schema: 1, runs: [], assets: [] };
try { stats = JSON.parse(await readFile(STATS, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const rows = [];
for (const id of ids) {
  for (const suffix of ['', '.lod1']) {
    const name = `${id}${suffix}.glb`;
    const file = path.join(ASSETS, name);
    const beforeBytes = await readFile(file);
    // An existing backup is immutable. Re-runs remain safe and preserve the
    // first input even when the working asset is already meshopt-compressed.
    try { await copyFile(file, path.join(LOCAL, `${id}${suffix}.before-packaging.glb`), constants.COPYFILE_EXCL); }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    const doc = await io.readBinary(new Uint8Array(beforeBytes));
    const before = counts(doc);
    if (suffix) stripLod(doc);
    const expected = snapshot(doc);
    // Constrain dedup/prune to resources; never merge meshes or skins, remove
    // nodes, discard attributes, resample animation, simplify or quantize.
    await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE], keepUniqueNames: true }));
    if (suffix) await doc.transform(prune({
      propertyTypes: [PropertyType.ACCESSOR, PropertyType.BUFFER, PropertyType.TEXTURE],
      keepLeaves: true, keepAttributes: true, keepExtras: true, keepSolidTextures: true,
    }));
    assertSnapshot(snapshot(doc), expected, `${name}: resource cleanup changed scene semantics`);
    // This encoder option disables lossy meshopt filters. Deliberately do not
    // call functions.meshopt(), which also quantizes/reorders vertex data.
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const bytes = preserveNodeTransforms(await io.writeBinary(doc), doc);
    const decoded = await io.readBinary(bytes);
    assertSnapshot(snapshot(decoded), expected, `${name}: compression round-trip changed decoded values`);
    const jsonLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
    assert(json.extensionsRequired?.includes('EXT_meshopt_compression'), `${name}: meshopt extension absent`);
    assert(!json.images?.some((i) => i.uri), `${name}: external texture reference`);
    const after = counts(decoded);
    assert.equal(after.joints, before.joints);
    assert.equal(after.triangles, before.triangles);
    if (suffix) {
      assert.equal(after.textures, 0);
      assert(after.clips.every((a) => KEEP_LOD.has(a.name)));
    } else assert.deepEqual(after.clips, before.clips);
    const temp = path.join(LOCAL, `${name}.pending`);
    await writeFile(temp, bytes);
    await rename(temp, file);
    const row = { id, file: name, lod: Boolean(suffix), beforeBytes: beforeBytes.length, bytes: bytes.length, sha256: hash(bytes), before, after, validation: { decodedNumbersExact: true, orientedTrianglesExact: true, sceneGraphExact: true, skinJointsExact: true, animationsExact: true, originalRosterUntouched: true } };
    rows.push(row);
    stats.assets = [...stats.assets.filter((r) => r.file !== name), row];
    await writeFile(STATS, `${JSON.stringify(stats, null, 2)}\n`);
    console.log(`${name}: ${beforeBytes.length.toLocaleString()} -> ${bytes.length.toLocaleString()} bytes; ${after.triangles} tris; ${after.clips.length} clips; exact round-trip PASS`);
  }
}
const originalsAfter = await originalHashes();
assert.deepEqual(originalsAfter, originalsBefore, 'Original roster asset bytes changed');
stats.runs.push({ at: new Date().toISOString(), ids, originalAssetCount: Object.keys(originalsBefore).length, originalSha256: originalsBefore, status: 'PASS' });
await writeFile(STATS, `${JSON.stringify(stats, null, 2)}\n`);
console.log(`Original roster: ${Object.keys(originalsBefore).length} files byte-identical. Stats: ${STATS}`);
