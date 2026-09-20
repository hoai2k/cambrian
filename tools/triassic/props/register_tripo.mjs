#!/usr/bin/env node
/** Refresh manifest records for the seven reviewed Tripo-derived Triassic props. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });

const ROOT = path.resolve(process.cwd());
const DIR = path.join(ROOT, 'public/assets/triassic/props-instanced');
const FILE = path.join(DIR, 'manifest.json');
const specs = [
  ['encrinus-litter', 'encrinus-litter', 3000],
  ['daonella-bed', 'daonella-bed', 3500],
  ['brachiopod-cluster', 'brachiopod-cluster', 3500],
  ['cidaris', 'cidaris', 5000],
  ['neocalamites', 'neocalamites', 6000],
  ['pleuromeia', 'pleuromeia', 6000],
  ['bjuvia', 'bjuvia', 6000],
];
const loader = new GLTFLoader();
const manifest = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const ids = new Set(specs.map(([id]) => `triassic-${id}`));
manifest.assets = manifest.assets.filter((row) => !ids.has(row.id));
manifest.stage = 'shipped instanced scenery library; canonical-reviewed Tripo sources are reduced and baked to vertex pigment';

for (const [name, family, limit] of specs) {
  const id = `triassic-${name}`;
  const full = path.join(DIR, `${id}.glb`);
  const bytes = fs.readFileSync(full);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const triangles = meshes.reduce((n, mesh) => n + (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.getAttribute('position').count) / 3, 0);
  const dimensions = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).toArray().map((n) => +n.toFixed(6));
  manifest.assets.push({
    id, family, variant: 1, status: 'final',
    path: `assets/triassic/props-instanced/${id}.glb`,
    portrait: `assets/triassic/props-instanced/${id}.png`,
    source: `tools/triassic/props/sources/${id}.blend`,
    rawSource: `tools/triassic/props/tripo-raw/${name}/${name}.raw.glb`,
    triangles, triangleLimit: limit, dimensionsXYZ: dimensions,
    pivot: 'base centre', static: true, meshCount: meshes.length,
    materialCount: 1, vertexColours: true, textureBakedToVertexColours: true,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
  });
}
fs.writeFileSync(FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Registered ${specs.length} Tripo-derived props in ${path.relative(ROOT, FILE)}.`);
