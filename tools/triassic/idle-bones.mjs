/**
 * Bones that own no skin: joints an animation moves while no vertex follows them.
 *
 *   node tools/triassic/idle-bones.mjs <glb> [minShare]
 *
 * This is a silent defect, and worse than silent — it makes other measurements lie. Hybodus'
 * `caudal_upper` and Saurichthys' `pelvic_L`, `pelvic_R` and `caudal_lower` each owned **zero**
 * vertices, so their clips were swinging joints that moved no skin at all, and the per-limb swept
 * angles recorded in those builders' `validation.json` were measurements of nothing. Nothing caught
 * it: the paired audits check parity, `skin-tears.mjs` checks edges that exist, and a joint with no
 * weight simply never appears in either.
 *
 * The causes are anatomical rather than sloppy, which is why a human reading a weight table would
 * not have spotted them either — a heterocercal tail's long lobe carries the vertebral column and
 * reads as trunk, and a pelvic bone placed at 0.63 of the body cannot claim a blade sitting at
 * 0.50-0.60. So this reports rather than judges: it names every joint whose share of total skin
 * weight falls below `minShare` (default 0.0005, i.e. a twentieth of a percent), and exits non-zero
 * only for joints owning literally nothing, which is never right.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

await MeshoptDecoder.ready;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 2048, height: 2048, close() {} });

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const rest = args.filter((a) => !a.startsWith('--'));
const MIN_SHARE = Number(rest[1] || 0.0005);
if (!ALL && !rest[0]) { console.error('usage: node tools/triassic/idle-bones.mjs <glb>|--all [minShare]'); process.exit(2); }

/** Every delivered Triassic body: the authored one only, since a twin and a LOD share its rig. */
const DIR = 'public/assets/triassic/creatures';
const files = ALL
  ? fs.readdirSync(DIR).filter((f) => f.endsWith('.glb') && !/\.(puppet|lod1|preview)\.glb$/.test(f)).sort()
      .map((f) => `${DIR}/${f}`)
  : [rest[0]];
let failed = 0;
for (const file of files) {

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(fs.readFileSync(file).buffer.slice(0), '');

/** Total skin weight each joint carries, summed over every skinned mesh in the file. */
const weight = new Map();
const seen = new Set();
let vertices = 0;
gltf.scene.traverse((o) => {
  if (!o.isSkinnedMesh || seen.has(o.uuid)) return;
  seen.add(o.uuid);
  const bones = o.skeleton.bones;
  for (const b of bones) if (!weight.has(b.name)) weight.set(b.name, 0);
  const ji = o.geometry.getAttribute('skinIndex');
  const jw = o.geometry.getAttribute('skinWeight');
  if (!ji || !jw) return;
  vertices += ji.count;
  for (let v = 0; v < ji.count; v++) {
    for (let k = 0; k < 4; k++) {
      const w = jw.getComponent(v, k);
      if (w <= 0) continue;
      const b = bones[ji.getComponent(v, k)];
      if (b) weight.set(b.name, (weight.get(b.name) ?? 0) + w);
    }
  }
});

// The rig's root carries the body rather than any skin, and the clip contract forbids it moving at
// all, so it owns nothing by design on every body in every era. Counting it would fail all of them.
const ROOT = /^(root|armature|skeleton)$/i;
const total = [...weight.values()].reduce((a, b) => a + b, 0);
const rows = [...weight.entries()].filter(([name]) => !ROOT.test(name))
  .map(([name, w]) => ({ name, w, share: total ? w / total : 0 }))
  .sort((a, b) => a.share - b.share);
const dead = rows.filter((r) => r.w === 0);
const thin = rows.filter((r) => r.w > 0 && r.share < MIN_SHARE);

console.log(`${file}`);
console.log(`  ${weight.size} joints · ${vertices} skinned vertices · total weight ${total.toFixed(1)}`);
if (dead.length) {
  console.log(`  OWNS NOTHING (${dead.length}): ${dead.map((r) => r.name).join(', ')}`);
  console.log('    A clip moving one of these moves no skin, and any swept angle recorded for it is about nothing.');
}
if (thin.length) console.log(`  thin, under ${(MIN_SHARE * 100).toFixed(3)}% (${thin.length}): ` +
  thin.map((r) => `${r.name} ${(r.share * 100).toFixed(4)}%`).join(', '));
if (!dead.length && !thin.length) console.log('  every joint owns skin');
if (dead.length) failed++;
}
if (ALL) console.log(failed ? `${failed} body/bodies have a joint that owns no skin` : `${files.length} Triassic bodies: every joint owns skin`);
process.exit(failed ? 1 : 0);
