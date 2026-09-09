import fs from 'node:fs';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { PNG } from 'pngjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const shipped = process.argv.includes('--shipped') ? JSON.parse(fs.readFileSync('tools/devonian/shipped.json')).props : null;
if (shipped && !shipped.length) { console.log('No scenery released yet'); process.exit(0); }
const manifest = JSON.parse(fs.readFileSync('public/assets/devonian/props/manifest.json'));
if (shipped) { for (const id of shipped) assert(manifest.props.some(p => p.id === id), `Missing released prop ${id}`); manifest.props = manifest.props.filter(p => shipped.includes(p.id)); }
const expected = [...Array.from({ length: 12 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 5 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 12 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`)];
assert.equal(new Set(manifest.props.map(p => p.id)).size, manifest.props.length, 'Duplicate prop IDs');
if (!shipped) for (const family of expected) assert(manifest.props.some(p => p.family === family), `Missing scenery family ${family}`);
const results = [];
for (const prop of manifest.props) {
  assert(expected.includes(prop.family));
  for (const k of ['name', 'description', 'provenance']) assert(prop[k], `${prop.id}: missing ${k}`);
  assert(Number.isFinite(prop.lengthMeters) && prop.lengthMeters > 0);
  const png = PNG.sync.read(fs.readFileSync(`public/${prop.image}`));
  assert(png.width >= 256 && png.height >= 192, `${prop.id}: missing portrait`);
  const models = [];
  for (const [level, asset] of [prop.model, prop.lod].entries()) {
    const bytes = fs.readFileSync(`public/${asset}`);
    assert(bytes.length < 25 * 1024 * 1024, `${prop.id}: model exceeds 25 MB`);
    const doc = await io.readBinary(bytes), root = doc.getRoot();
    const bounds = getBounds(root.listScenes()[0]);
    const dimensions = bounds.max.map((v, i) => v - bounds.min[i]);
    assert(dimensions.every(v => Number.isFinite(v) && v >= 0));
    assert(Math.abs(Math.max(...dimensions) - prop.lengthMeters) < prop.lengthMeters * .08, `${prop.id}: metadata disagrees with real geometry scale`);
    let triangles = 0;
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
      const position = p.getAttribute('POSITION');
      triangles += (p.getIndices()?.getCount() ?? position.getCount()) / 3;
      for (const a of p.listAttributes()) for (const v of a.getArray()) assert(Number.isFinite(v), `${prop.id}: nonfinite vertex`);
      assert(p.getAttribute('COLOR_0'), `${prop.id}: missing LOD-ready pigmentation`);
    }
    assert(triangles > 10);
    const clips = root.listAnimations();
    assert.deepEqual(clips.map(c => c.getName()).sort(), [...prop.clips].sort());
    const joints = root.listSkins().flatMap(s => s.listJoints().map(n => n.getName())).sort();
    for (const c of clips) {
      assert(prop.looping.includes(c.getName()), `${prop.id}: scenery animation must be an ambient loop`);
      let animated = false;
      for (const channel of c.listChannels()) {
        assert.notEqual(channel.getTargetPath(), 'scale', `${prop.id}: scaling ambient prop`);
        const sampler = channel.getSampler(), times = sampler.getInput().getArray(), output = sampler.getOutput(), values = output.getArray(), n = output.getElementSize();
        assert(times.at(-1) > 0 && times.length > 1);
        for (let i = 1; i < times.length; i++) assert(times[i] > times[i - 1]);
        for (let i = 0; i < values.length; i++) { assert(Number.isFinite(values[i])); if (Math.abs(values[i] - values[i % n]) > 1e-6) animated = true; }
        for (let i = 0; i < n; i++) assert(Math.abs(values[i] - values[values.length - n + i]) < 1e-4, `${prop.id}: ambient loop seam`);
      }
      assert(animated, `${prop.id}: frozen ambient clip`);
    }
    models.push({ level, bytes: bytes.length, triangles, dimensions, joints, clips: clips.map(c => c.getName()) });
  }
  assert(models[1].triangles < models[0].triangles * .5, `${prop.id}: ineffective LOD`);
  assert.deepEqual(models[0].joints, models[1].joints, `${prop.id}: LOD rig mismatch`);
  results.push({ id: prop.id, family: prop.family, models });
  console.log(`PASS ${prop.id}: ${models[0].triangles}/${models[1].triangles} triangles`);
}
fs.mkdirSync('../devonian-authoring/review', { recursive: true });
fs.writeFileSync('../devonian-authoring/review/scenery-intake.json', JSON.stringify(results, null, 2) + '\n');
console.log(`PASS ${results.length} props across ${new Set(results.map(p => p.family)).size} families`);
