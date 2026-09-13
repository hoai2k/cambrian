// Validate the Blender-authored Triassic prop library.
// Run from the repository root: node tools/triassic/props/validate.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { measure } from '../../../tools/prop-shapes.mjs';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });

const ROOT = path.resolve(process.cwd());
const ASSET_DIR = path.join(ROOT, 'public/assets/triassic/props-instanced');
const MANIFEST_PATH = path.join(ASSET_DIR, 'manifest.json');
const REPORT_PATH = path.join(ROOT, 'tools/triassic/props/validation.json');
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const EPS = 1e-5;

function glbJson(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2)
    throw new Error('not a glTF 2.0 binary');
  const jsonLength = bytes.readUInt32LE(12);
  const type = bytes.readUInt32LE(16);
  if (type !== 0x4e4f534a) throw new Error('missing JSON chunk');
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim());
}

function finiteArray(attribute) {
  for (let i = 0; i < attribute.count * attribute.itemSize; i++)
    if (!Number.isFinite(attribute.array[i])) return false;
  return true;
}

function identityTransform(node) {
  if (node.translation && node.translation.some((n, i) => Math.abs(n - (i === 1 ? 0 : 0)) > EPS)) return false;
  if (node.rotation && (Math.abs(node.rotation[0]) > EPS || Math.abs(node.rotation[1]) > EPS || Math.abs(node.rotation[2]) > EPS || Math.abs(node.rotation[3] - 1) > EPS)) return false;
  if (node.scale && node.scale.some((n) => Math.abs(n - 1) > EPS)) return false;
  if (node.matrix) {
    const id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    if (node.matrix.some((n, i) => Math.abs(n - id[i]) > EPS)) return false;
  }
  return true;
}

async function validateAsset(entry) {
  const file = path.join(ROOT, 'public', entry.path);
  const checks = {};
  let json, gltf, shape;
  const errors = [];
  try {
    const bytes = fs.readFileSync(file);
    checks.file = true;
    checks.bytes = bytes.length === entry.bytes;
    checks.sha256 = crypto.createHash('sha256').update(bytes).digest('hex') === entry.sha256;
    json = glbJson(bytes);
    checks.noExternalDependencies = (json.buffers ?? []).every((b) => !b.uri) && !(json.images?.length) && !(json.textures?.length);
    checks.noSkins = !(json.skins?.length);
    checks.noAnimations = !(json.animations?.length);
    checks.identityTransforms = (json.nodes ?? []).every(identityTransform);
    checks.meshCount = (json.meshes ?? []).length === 1;
    checks.nodeMeshCount = (json.nodes ?? []).filter((n) => n.mesh !== undefined).length === 1;
    checks.primitiveCount = (json.meshes?.[0]?.primitives ?? []).length === 1;
    checks.materialCount = (json.materials ?? []).length === 1;
    checks.bufferCount = (json.buffers ?? []).length === 1 && json.buffers[0].uri === undefined;
    gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    const meshes = [];
    gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const mesh = meshes[0];
    const geometry = mesh?.geometry;
    const pos = geometry?.getAttribute('position');
    const color = geometry?.getAttribute('color');
    checks.positionsFinite = !!pos && finiteArray(pos);
    checks.vertexColours = !!color && finiteArray(color);
    // GLTFLoader preserves normalized integer colour attributes in their source range.
    // Compare in display range so Uint16 [0, 65535] and float [0, 1] behave alike.
    const colourScale = color?.array instanceof Uint8Array || color?.array instanceof Uint16Array ? (color.array instanceof Uint8Array ? 255 : 65535) : 1;
    checks.vertexColoursNonwhite = !!color && [...color.array].some((v, i) => i % color.itemSize < 3 && v / colourScale < 0.999);
    checks.triangles = meshes.length === 1 && !!geometry && (geometry.index ? geometry.index.count : pos.count) % 3 === 0;
    const triCount = geometry ? (geometry.index ? geometry.index.count : pos.count) / 3 : 0;
    checks.triangleLimit = triCount > 0 && triCount <= 800;
    let degenerate = 0;
    if (geometry && pos) {
      const idx = geometry.index?.array;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < triCount * 3; i += 3) {
        const ia = idx ? idx[i] : i, ib = idx ? idx[i + 1] : i + 1, ic = idx ? idx[i + 2] : i + 2;
        a.fromBufferAttribute(pos, ia); b.fromBufferAttribute(pos, ib); c.fromBufferAttribute(pos, ic);
        if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() <= EPS * EPS) degenerate++;
      }
    }
    checks.nonDegenerateTriangles = degenerate === 0;
    shape = await measure(file);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const dimensions = box.getSize(new THREE.Vector3());
    checks.baseY = Math.abs(box.min.y) <= EPS;
    checks.positiveDimensions = dimensions.x > EPS && dimensions.y > EPS && dimensions.z > EPS;
    checks.manifestDimensions = dimensions.toArray().every((n, i) => Math.abs(n - entry.dimensionsXYZ[i]) <= 1e-5);
    checks.manifestTriangles = triCount === entry.triangles;
    return { id: entry.id, file: entry.path, passed: Object.values(checks).every(Boolean), checks, triangles: triCount, dimensions: dimensions.toArray().map((n) => +n.toFixed(6)), bounds: { min: box.min.toArray().map((n) => +n.toFixed(6)), max: box.max.toArray().map((n) => +n.toFixed(6)) }, measure: shape, errors };
  } catch (error) {
    errors.push(error.message);
    return { id: entry.id, file: entry.path, passed: false, checks, errors };
  }
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const expected = new Set(manifest.assets.map((a) => `${a.id}.glb`));
const actual = fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.glb')).sort();
const results = [];
for (const entry of manifest.assets) results.push(await validateAsset(entry));
const report = { generatedAt: new Date().toISOString(), source: 'public/assets/triassic/props-instanced/manifest.json', assetCount: results.length, allPassed: results.every((r) => r.passed) && actual.length === expected.size && actual.every((f) => expected.has(f)), unexpectedGlbFiles: actual.filter((f) => !expected.has(f)), results };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.id}${result.errors.length ? `: ${result.errors.join('; ')}` : ''}`);
console.log(`Report → ${path.relative(ROOT, REPORT_PATH)}`);
if (!report.allPassed) process.exitCode = 1;
