/**
 * Measure every instanced scenery prop and write `src/content/prop-shapes.json`.
 *
 * The simulation collides against props it cannot load: `src/sim` is pure and deterministic and
 * never touches a GLB. So the shape of each authored prop is measured here, once, and checked in —
 * the footprint the collider uses is the silhouette the renderer actually draws.
 *
 * For each prop, in its own local space at scale 1:
 *  - `y0`/`y1`: the vertical span, so a rock's dome and a plant's height come from the mesh.
 *  - `r`: sixteen footprint radii around the compass, starting at +z and turning toward +x, so a
 *    log is long and thin rather than a disc as wide as it is long. This is the whole silhouette,
 *    which is what a rock's dome collides with.
 *  - `bands`: the same sixteen radii measured again in each of five height bands, so a crinoid is a
 *    thin stalk under a wide crown and a bryozoan fan stays a sheet all the way down. A plant reads
 *    the band at the height it is touched.
 *
 * Run: npm run shapes    Checked by: npm run flora
 */
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });

export const BINS = 16;
export const BANDS = 5;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Every prop the two eras draw scenery with, by the id the content layer names it. */
export function propFiles() {
  const files = {};
  for (const f of fs.readdirSync('public/assets/props').filter((f) => f.endsWith('.glb')))
    files[f.replace(/\.glb$/, '')] = `public/assets/props/${f}`;
  const dir = 'public/assets/devonian/props-instanced';
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb')))
    files[f.replace(/\.glb$/, '')] = `${dir}/${f}`;
  return files;
}

export async function measure(path) {
  const bytes = fs.readFileSync(path);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
  let y0 = Infinity, y1 = -Infinity;
  const tris = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, pos = g.getAttribute('position');
    const idx = g.index ? g.index.array : null;
    const count = idx ? idx.length : pos.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const ia = idx ? idx[i] : i, ib = idx ? idx[i + 1] : i + 1, ic = idx ? idx[i + 2] : i + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
      tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      for (const p of [a, b, c]) { if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    }
  });
  if (!tris.length) throw new Error(`No geometry in ${path}`);
  const h = Math.max(y1 - y0, 1e-6);
  const bands = Array.from({ length: BANDS }, () => new Array(BINS).fill(0));
  // Sample across each face, not just at its corners: a five-sided cone has too few vertices to
  // land in every spoke, and an unsampled spoke would be a notch the collider lets you through.
  const N = 8;
  const add = (x, y, z) => {
    const d = Math.hypot(x, z);
    if (d <= 0) return;
    const band = bands[Math.min(BANDS - 1, Math.max(0, Math.floor(((y - y0) / h) * BANDS)))];
    const bin = Math.round(((Math.atan2(x, z) / (Math.PI * 2)) * BINS + BINS)) % BINS;
    if (d > band[bin]) band[bin] = d;
  };
  for (let t = 0; t < tris.length; t += 9) {
    for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) {
      const u = i / N, w = j / N, k = 1 - u - w;
      add(tris[t] * k + tris[t + 3] * u + tris[t + 6] * w,
          tris[t + 1] * k + tris[t + 4] * u + tris[t + 7] * w,
          tris[t + 2] * k + tris[t + 5] * u + tris[t + 8] * w);
    }
  }
  // The collider reads the radii back by interpolating between spokes, which cuts the corner off a
  // convex edge. Widen every spoke by that chord so the footprint contains the silhouette.
  const chord = 1 / Math.cos(Math.PI / BINS);
  for (const band of bands) for (let i = 0; i < BINS; i++) band[i] *= chord;
  // A spoke with nothing on it at all (a hollow, a notch, a band the mesh does not reach into)
  // takes its neighbours rather than zero, so the footprint has no gaps to slip through.
  const fill = (band, floor) => {
    for (let pass = 0; pass < BINS; pass++) {
      let done = true;
      for (let i = 0; i < BINS; i++) if (band[i] === 0) {
        const n = Math.max(band[(i + 1) % BINS], band[(i + BINS - 1) % BINS]);
        if (n > 0) band[i] = n * 0.85; else done = false;
      }
      if (done) break;
    }
    for (let i = 0; i < BINS; i++) if (band[i] === 0) band[i] = floor;
  };
  // Fill the bands first: the silhouette is the widest of them, so it must see the filled values.
  let floor = Infinity;
  for (const band of bands) for (const v of band) if (v > 0) floor = Math.min(floor, v);
  for (const band of bands) fill(band, Number.isFinite(floor) ? floor * 0.05 : 1e-3);
  const r = new Array(BINS).fill(0);
  for (const band of bands) for (let i = 0; i < BINS; i++) r[i] = Math.max(r[i], band[i]);
  const rmax = Math.max(...r);
  const round = (n) => +n.toFixed(4);
  return {
    y0: round(y0), y1: round(y1), rmax: round(rmax),
    r: r.map(round),
    bands: bands.map((b) => b.map(round)),
  };
}

export async function shapes() {
  const files = propFiles(), out = {};
  for (const id of Object.keys(files).sort()) out[id] = await measure(files[id]);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await shapes();
  const path = 'src/content/prop-shapes.json';
  fs.writeFileSync(path, JSON.stringify(out, null, 1) + '\n');
  for (const [id, s] of Object.entries(out))
    console.log(`${id.padEnd(24)} y ${s.y0.toFixed(2)}..${s.y1.toFixed(2)}  rmax ${s.rmax.toFixed(3)}  r ${Math.min(...s.r).toFixed(2)}–${Math.max(...s.r).toFixed(2)}  by height ${s.bands.map((b) => Math.max(...b).toFixed(2)).join(' ')}`);
  console.log(`\n${Object.keys(out).length} props → ${path}`);
}
