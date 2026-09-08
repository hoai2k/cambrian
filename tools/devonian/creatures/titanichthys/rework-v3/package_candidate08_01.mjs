/** Lossless local candidate08 package. No image processing or public writes. */
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../../../..');
const LOCAL=path.resolve(ROOT,'../devonian-authoring/titanichthys/rework-v3');
const SRC=path.join(LOCAL,'release-candidate08'),OUT=path.join(SRC,'packaged');
const HASHES={'titanichthys.glb':'e14f5ea5ac52e7d0b8c894ba31231099c341da85e6d0f463d4f1c22054122c62',
 'titanichthys.lod1.glb':'17837f5f66e08c7d34e9788faac38cd9b0578256cc2bade21b33483f3b7a5b98'};
const CLIPS=['Idle','Swim','TurnLeft','TurnRight','Dive','Rise','Attack','Bite','Heavy','Hit','Death','Guard','Parry','Dodge','Eat','Stagger','Ability','Growth'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sorted=xs=>[...xs].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const [name,digest]of Object.entries(HASHES))assert.equal(hash(await readFile(path.join(SRC,name))),digest,'Changed raw candidate');
try {await access(OUT);throw new Error('Preserve existing packaging study');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(OUT);
const report={scope:'Lossless candidate08 packaging only; accepted composed images are preserved as-is. No texture processing, public writes or animation stripping.',
 inputs:HASHES,sourceSha256:hash(await readFile(fileURLToPath(import.meta.url))),outputs:[]};
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

for(const [name,digest]of Object.entries(HASHES)) {
 const input=await readFile(path.join(SRC,name));const doc=await io.readBinary(new Uint8Array(input));
 const before=counts(doc);assert.equal(before.clips.length,18);assert.deepEqual(before.clips.map(a=>a.name).sort(),[...CLIPS].sort());
 const expected=snapshot(doc);
 await doc.transform(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.TEXTURE],keepUniqueNames:true}));
 assertSnapshot(snapshot(doc),expected,name+': resource dedup changed semantics');
 // Same lossless encoder-only path as the established packager. Never call
 // functions.meshopt(), quantize(), simplify(), stripLod() or animation filters.
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const bytes=preserveNodeTransforms(await io.writeBinary(doc),doc);const decoded=await io.readBinary(bytes);
 assertSnapshot(snapshot(decoded),expected,name+': decoded scene/numeric/image/animation state changed');
 const after=counts(decoded);assert.deepEqual(after.clips,before.clips);assert.equal(after.clips.length,18);
 const jsonLength=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(12,true);
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)));
 assert(json.extensionsRequired?.includes('EXT_meshopt_compression'));assert(!json.images?.some(image=>image.uri));
 if(name.includes('.lod1'))assert.equal(after.textures,0);
 const target=path.join(OUT,name);await writeFile(target,bytes);
 assert.equal(hash(await readFile(path.join(SRC,name))),digest,'Raw input changed');
 report.outputs.push({file:target,bytes:bytes.length,sha256:hash(bytes),beforeBytes:input.length,before,after,
  under25MiB:bytes.length<25*1024*1024,validation:{decodedNumbersExact:true,orientedTrianglesExact:true,nodeTransformsExact:true,
   materialImagesExact:true,skinAndAnchorsExact:true,all18AnimationsExact:true}});
 await writeFile(path.join(OUT,'package-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('TITANICHTHYS_LOSSLESS_PACKAGE_FILE',name,input.length,'->',bytes.length,'18 clips exact');
}
report.measurementComplete=true;report.allUnder25MiB=report.outputs.every(r=>r.under25MiB);
await writeFile(path.join(OUT,'package-report.json'),JSON.stringify(report,null,2)+'\n');
assert(report.allUnder25MiB,'Lossless package exceeds25MiB; preserve study and return to Astra. No lossy fallback or clip stripping.');
console.log('TITANICHTHYS_LOSSLESS_PACKAGE_OK',path.join(OUT,'package-report.json'));
