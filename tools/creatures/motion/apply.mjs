/**
 * Replace a creature's queued clips with the articulated performance authored in
 * performances/<id>.mjs, keeping the old clips for comparison.
 *
 *   node tools/creatures/motion/apply.mjs <id> [--out <dir>] [--review]
 *
 * The clip that is replaced is renamed `replaced/<Name>` (the viewer lists those in their
 * own section; the game only ever asks for the canonical name, so it plays the new one).
 * Re-running on an already-processed file keeps the original `replaced/<Name>` and only
 * swaps the new clip, so the tool can be replayed on top of whatever else has landed in
 * the GLB since — the same reason it edits the shipped file rather than a Blender source.
 *
 * Everything but the animations round-trips exactly: meshes, skins, bind poses, sockets,
 * materials and embedded textures are re-encoded losslessly (same settings as
 * package-expansion.mjs) and verified against the input before the file is written.
 * --review additionally writes an uncompressed copy to the out dir for Blender.
 */
import { PropertyType } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune } from '@gltf-transform/functions';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import { makeIO, loadRig, sampleClip, Rig } from './rig.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const review = args.includes('--review');
assert(id, 'usage: apply.mjs <id> [--out dir] [--review]');
const PASS = 'attack-feeding';
const authoredOn = new Date().toISOString().slice(0, 10);

const io = await makeIO();
// Both eras: a Cambrian id lives in creatures/, a Devonian one in devonian/creatures/.
const { existsSync } = await import('node:fs');
const assetDir = existsSync(`public/assets/creatures/${id}.glb`) ? 'public/assets/creatures' : 'public/assets/devonian/creatures';
const file = `${assetDir}/${id}.glb`;
const before = await readFile(file);
const rig = await loadRig(io, file);
const doc = rig.doc, root = doc.getRoot();
const { clips } = await import(`./performances/${id}.mjs`);

const hash = (b) => createHash('sha256').update(b).digest('hex');
const digest = (a) => a ? hash(new Uint8Array(new Float64Array(a.getArray()).buffer)) + ':' + a.getType() + ':' + a.getNormalized() : null;
/**
 * A triangle list's indices, with each triangle rotated to start at its lowest index. The meshopt
 * index codec canonicalizes triangles that way, so a file whose indices were not already in that
 * form (the original eight were packaged by an earlier tool) comes back rotated: the same
 * triangles wound the same way, in the same order, written differently. Everything else about the
 * index buffer — a changed vertex, a reordered or dropped triangle, a flipped winding — still
 * fails the comparison, because rotation is the only thing normalized away.
 */
function indexDigest(prim) {
  const a = prim.getIndices();
  if (!a || prim.getMode() !== 4) return digest(a);
  const src = a.getArray(), out = new Float64Array(src.length);
  for (let i = 0; i + 2 < src.length; i += 3) {
    const t = [src[i], src[i + 1], src[i + 2]];
    const m = t[0] <= t[1] && t[0] <= t[2] ? 0 : t[1] <= t[2] ? 1 : 2;
    out[i] = t[m]; out[i + 1] = t[(m + 1) % 3]; out[i + 2] = t[(m + 2) % 3];
  }
  return hash(new Uint8Array(out.buffer)) + ':' + a.getType() + ':' + a.getNormalized() + ':rot';
}
/** Everything that is not an animation, as a comparable snapshot. */
function snapshot(d) {
  const r = d.getRoot();
  return {
    nodes: r.listNodes().map((n) => [n.getName(), n.getTranslation(), n.getRotation(), n.getScale(), n.listChildren().map((c) => c.getName()), n.getExtras()]),
    skins: r.listSkins().map((s) => [s.listJoints().map((j) => j.getName()), s.getSkeleton()?.getName(), digest(s.getInverseBindMatrices())]),
    meshes: r.listMeshes().map((m) => [m.getName(), m.listPrimitives().map((p) => [p.listSemantics(), p.listSemantics().map((s) => digest(p.getAttribute(s))), indexDigest(p), p.getMaterial()?.getName(), p.getMode()])]),
    materials: r.listMaterials().map((m) => [m.getName(), JSON.stringify(m.toJSON?.() ?? {}), m.getBaseColorFactor(), m.getBaseColorTexture()?.getName(), m.getNormalTexture()?.getName(), m.getMetallicRoughnessTexture()?.getName(), m.getAlphaMode(), m.getDoubleSided()]),
    textures: r.listTextures().map((t) => [t.getName(), t.getMimeType(), hash(t.getImage())]),
    kept: r.listAnimations().filter((a) => !clips.some((c) => c.name === a.getName())).map((a) => [a.getName(), a.listChannels().map((c) => [c.getTargetNode().getName(), c.getTargetPath(), digest(c.getSampler().getInput()), digest(c.getSampler().getOutput()), c.getSampler().getInterpolation()])]),
  };
}
const expected = snapshot(doc);

// Swap the clips. The first run keeps the shipped clip as replaced/<Name>; later runs keep that.
const byName = new Map(root.listAnimations().map((a) => [a.getName(), a]));
const log = [];
const added = new Set();
const ours = (a) => a?.getExtras()?.cambrianClip?.pass === PASS;
const drop = (a) => { for (const ch of a.listChannels()) ch.dispose(); for (const sm of a.listSamplers()) sm.dispose(); a.dispose(); };
for (const def of clips) {
  let old = byName.get(def.name), kept = byName.get(`replaced/${def.name}`);
  // A clip this tool authored is never the shipped one: an earlier run's output is dropped, and
  // an earlier run's output that a later run mistook for shipped (renamed to replaced/) likewise.
  if (kept && ours(kept)) { drop(kept); kept = undefined; log.push(`${def.name}: dropped a replaced/ copy that was this tool's own output`); }
  if (old && ours(old)) { drop(old); old = undefined; log.push(`${def.name}: previous ${PASS} clip dropped`); }
  if (!old && !kept) added.add(def.name);        // a clip the model never had: nothing to keep beside it
  if (old && !kept) {
    old.setName(`replaced/${def.name}`);
    old.setExtras({ ...old.getExtras(), cambrianClip: { ...(old.getExtras()?.cambrianClip ?? {}), version: 1, replaced: def.name, replacedOn: authoredOn, by: PASS } });
    log.push(`${def.name}: shipped clip kept as replaced/${def.name}`);
  } else if (old) {
    drop(old);
    log.push(`${def.name}: shipped clip dropped (replaced/${def.name} already kept)`);
  } else log.push(`${def.name}: ${kept ? 'new clip beside the kept original' : 'new clip'}`);
  const { frames } = sampleClip(rig, def, { authoredOn, pass: PASS });
  log.push(`${def.name}: ${frames} frames, ${def.duration}s, ${def.loop ? 'loop' : 'one-shot'}`);
}
// Fresh Rig over the same doc so the kept-animation snapshot sees the renamed clips.
expected.kept = snapshot(new Rig(doc).doc).kept.filter(([n]) => !clips.some((c) => c.name === n));

await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE], keepUniqueNames: true }));
// A dropped clip leaves its samplers' accessors behind; without this every re-run grows the file.
await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.BUFFER], keepLeaves: true, keepAttributes: true, keepExtras: true, keepSolidTextures: true }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
let bytes = preserveNodeTransforms(await io.writeBinary(doc), doc);

// Verify by reading the written bytes back.
const check = await io.readBinary(bytes);
const actual = snapshot(check);
actual.kept = actual.kept.filter(([n]) => !clips.some((c) => c.name === n));
assert.deepEqual(actual, expected, 'round trip changed something other than the replaced clips');
const names = check.getRoot().listAnimations().map((a) => a.getName());
for (const def of clips) {
  assert(names.includes(def.name), def.name);
  // A clip that is new to the model has no shipped version to keep; everything else must keep one.
  if (!added.has(def.name)) assert(names.includes(`replaced/${def.name}`), `replaced/${def.name}`);
}
assert.equal(new Set(names).size, names.length, 'duplicate clip names');

const dest = outDir ?? assetDir;
await mkdir(dest, { recursive: true });
const out = path.join(dest, `${id}.glb`);
await writeFile(out, bytes);
if (review) {
  for (const ext of check.getRoot().listExtensionsUsed()) if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
  await writeFile(path.join(dest, `${id}.review.glb`), await io.writeBinary(check));
}
console.log(`${id}: ${before.length.toLocaleString()} -> ${bytes.length.toLocaleString()} bytes -> ${out}`);
for (const l of log) console.log('  ' + l);
console.log('  clips now: ' + names.join(', '));

function preserveNodeTransforms(bytes, d) {
  // NodeIO omits transforms within an epsilon of identity; restore every authored TRS exactly.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  const nodes = d.getRoot().listNodes();
  assert.equal(json.nodes.length, nodes.length, 'writer changed node count');
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i], dest = json.nodes[i];
    assert.equal(dest.name ?? '', source.getName(), 'writer changed node order');
    delete dest.matrix;
    dest.translation = source.getTranslation(); dest.rotation = source.getRotation(); dest.scale = source.getScale();
  }
  const payload = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(payload.length / 4) * 4, 0x20);
  payload.copy(padded);
  const rest = bytes.subarray(20 + length);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + rest.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded, Buffer.from(rest)]);
}
