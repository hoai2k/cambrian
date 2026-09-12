/**
 * Measure a GLB the way the viewer's sculpt mode does, and compare it with a sculpt file.
 *
 *   npm run sculpt:measure -- <model.glb> [sculpt.json] [--json]
 *
 * With only a model it prints the station table (axis, dorsal, ventral, width). With a sculpt
 * file it also evaluates that file's *edited* curves at the model's stations and prints how far
 * the model is from the target — which is how a builder port is checked: rebuild, measure, and
 * the deviations should be near zero where the sculpt changed something and near the shipped
 * model's own values everywhere else. `--json` prints the comparison as JSON for scripts.
 *
 * Positions are gathered in the root frame from every mesh (skinned meshes at their bind pose,
 * which is the node's own transform for these exporters) and the mouth socket names the head end,
 * exactly as `src/viewer/scene.ts` does before calling `measure`.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { measure, type CurveName, type SculptDoc, type Station } from '../src/viewer/sculpt/profile';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const asJson = process.argv.includes('--json');
const [modelPath, sculptPath] = args;
if (!modelPath) { console.error('usage: sculpt-measure <model.glb> [sculpt.json] [--json]'); process.exit(2); }

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(modelPath);
const root = doc.getRoot();

// World matrices from the scene graph; the whole graph is the root frame.
const chunks: Float32Array[] = [];
let mouth: [number, number, number] | undefined;
const seen = new Set<object>();
const mat = (n: Node) => n.getWorldMatrix();
for (const scene of root.listScenes()) scene.traverse((node) => {
  const m = mat(node) as unknown as number[];
  if (node.getName() === 'anchor_mouth') mouth = [m[12], m[13], m[14]];
  const mesh = node.getMesh();
  if (!mesh) return;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos || seen.has(pos)) continue;
    seen.add(pos);
    const n = pos.getCount();
    const out = new Float32Array(n * 3);
    const v = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      pos.getElement(i, v);
      const [x, y, z] = v;
      out[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    chunks.push(out);
  }
});

const id = path.basename(modelPath).replace(/\.(lod1\.)?glb$/, '');
const measured = measure({ chunks, mouth }, { key: id, id, collection: 'measured', model: modelPath });

// ---- the sculpt file's edited curves as a target ----
interface ExportedStation { axis: number; editedAxis: number; shift: number; headFraction: number; dorsal: { base: number; edit: number }; ventral: { base: number; edit: number }; width: { base: number; edit: number } }
interface Exported { format: string; creature: { id: string }; frame: SculptDoc['frame']; stations: ExportedStation[] }

function targetStations(exported: Exported): Station[] {
  // Edited values sit at their edited axial positions; the curves through them are what the port
  // is asked to reproduce.
  return exported.stations.map((s) => ({
    axis: s.editedAxis, headFraction: s.headFraction, shift: 0, tangent: {},
    base: { dorsal: s.dorsal.edit, ventral: s.ventral.edit, width: s.width.edit },
    edit: { dorsal: s.dorsal.edit, ventral: s.ventral.edit, width: s.width.edit },
  })).sort((a, b) => a.axis - b.axis);
}
function evalAt(stations: Station[], curve: CurveName, a: number): number {
  const n = stations.length;
  if (a <= stations[0].axis) return stations[0].base[curve];
  if (a >= stations[n - 1].axis) return stations[n - 1].base[curve];
  let i = 0;
  while (i < n - 2 && stations[i + 1].axis <= a) i++;
  const s0 = stations[i], s1 = stations[i + 1];
  const t = (a - s0.axis) / (s1.axis - s0.axis);
  return s0.base[curve] + (s1.base[curve] - s0.base[curve]) * t;
}

const fmt = (v: number) => (v >= 0 ? ' ' : '') + v.toFixed(3);
const pct = (m: number, t: number) => (Math.abs(t) < 1e-4 ? '   —  ' : `${((m / t - 1) * 100).toFixed(1).padStart(6)}%`);

if (!sculptPath) {
  if (asJson) { console.log(JSON.stringify({ id, frame: measured.frame, bounds: measured.bounds, stations: measured.stations.map((s) => ({ axis: s.axis, headFraction: s.headFraction, ...s.base })) }, null, 2)); }
  else {
    console.log(`${id}: axis ${measured.frame.axis}, head at the ${measured.frame.forward === 1 ? 'high' : 'low'} end, length ${measured.bounds.length.toFixed(3)}, height ${measured.bounds.height.toFixed(3)}, width ${measured.bounds.width.toFixed(3)}`);
    console.log(' i   nose%    axis   dorsal  ventral   width');
    measured.stations.forEach((s, i) => console.log(`${String(i).padStart(2)}   ${(s.headFraction * 100).toFixed(0).padStart(3)}%  ${fmt(s.axis)}  ${fmt(s.base.dorsal)}  ${fmt(s.base.ventral)}  ${fmt(s.base.width)}`));
  }
} else {
  const exported = JSON.parse(await readFile(sculptPath, 'utf8')) as Exported;
  if (exported.format !== 'cambrian-sculpt') throw new Error(`${sculptPath}: not a cambrian-sculpt file`);
  if (exported.frame.axis !== measured.frame.axis) console.warn(`warning: sculpt axis ${exported.frame.axis} but the model runs along ${measured.frame.axis}`);
  const target = targetStations(exported);
  const shipped = exported.stations.map((s) => ({ axis: s.axis, headFraction: s.headFraction, shift: 0, tangent: {}, base: { dorsal: s.dorsal.base, ventral: s.ventral.base, width: s.width.base }, edit: { dorsal: s.dorsal.base, ventral: s.ventral.base, width: s.width.base } })).sort((a, b) => a.axis - b.axis);
  const rows = measured.stations.map((s, i) => {
    const row: Record<string, unknown> = { index: i, axis: s.axis, headFraction: s.headFraction };
    for (const c of ['dorsal', 'ventral', 'width'] as const) {
      const model = s.base[c], t = evalAt(target, c, s.axis), b = evalAt(shipped, c, s.axis);
      row[c] = { model, target: t, shipped: b, deviation: Math.abs(t) > 1e-4 ? (model / t - 1) * 100 : null, asked: Math.abs(b) > 1e-4 ? (t / b - 1) * 100 : null };
    }
    return row;
  });
  const worst = Math.max(...rows.flatMap((r) => (['dorsal', 'ventral', 'width'] as const).map((c) => Math.abs((r[c] as { deviation: number | null }).deviation ?? 0))));
  if (asJson) console.log(JSON.stringify({ id, sculpt: exported.creature.id, worstDeviationPercent: worst, rows }, null, 2));
  else {
    console.log(`${id} against ${path.basename(sculptPath)} — model vs the sculpt's edited curves (the target), with what the sculpt asked for relative to what shipped`);
    console.log(' i  nose%   axis  | dorsal  target   dev   asked | ventral target   dev   asked | width   target   dev   asked');
    for (const r of rows) {
      const cell = (c: CurveName) => { const v = r[c] as { model: number; target: number; deviation: number | null; asked: number | null }; return `${fmt(v.model)} ${fmt(v.target)} ${v.deviation == null ? '   —  ' : pct(v.model, v.target)} ${v.asked == null ? '   —  ' : `${v.asked.toFixed(1).padStart(6)}%`}`; };
      console.log(`${String(r.index).padStart(2)}  ${((r.headFraction as number) * 100).toFixed(0).padStart(3)}%  ${fmt(r.axis as number)} | ${cell('dorsal')} | ${cell('ventral')} | ${cell('width')}`);
    }
    console.log(`worst deviation from target: ${worst.toFixed(1)}%`);
  }
}
