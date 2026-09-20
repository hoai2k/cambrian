/**
 * What the game hides on every shipped Triassic body, and whether any of it is anatomy.
 *
 *   node tools/triassic/hidden-parts.mjs            # list, per body, every mesh the runtime hides
 *   node tools/triassic/hidden-parts.mjs --check    # fail if a hidden mesh is named as anatomy
 *   node tools/triassic/hidden-parts.mjs --check <file.glb> ...   # the same question of particular files
 *
 * `src/shared/oral-geometry.ts` is the one classifier the game and the viewer read: a mesh whose own
 * name, or any of whose materials' names, matches it is oral *fill* — a palate, a floor, a lining, a
 * hinge plug — and is not drawn. That is matched on words, and a word can be anatomy as well as fill:
 * Placodus shipped its upper crushing plates as `Palate crushing teeth`, `palate` matched, and the
 * game drew the lower teeth and not the upper ones. Teeth are the animal, not the mouth's filling.
 *
 * This lists every hit so the choice is on the record rather than in a network tab, and refuses a
 * hidden mesh whose *own* name says it is anatomy (teeth, fangs, eyes, a whorl, skin, a fin, armour).
 * The materials are not judged that way on purpose: the shore kit's hinge plugs wear the body's
 * pigmentation material and are still fill.
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { ORAL_GEOMETRY, isOralGeometryNamed } from '../../src/shared/oral-geometry.ts';

const check = process.argv.includes('--check');
const DIR = 'public/assets/triassic/creatures';
const ANATOMY = /teeth|tooth|fang|tusk|eye|whorl|skin|body|fin\b|paddle|flipper|armour|carapace|plastron|tail/i;

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const given = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids = given.length ? given : JSON.parse(fs.readFileSync('tools/triassic/shipped.json', 'utf8')).creatures;
const failures = [];
let hidden = 0;
for (const id of ids) {
  for (const suffix of given.length ? [''] : ['', '.puppet', '.lod1']) {
    const file = given.length ? id : `${DIR}/${id}${suffix}.glb`;
    if (!fs.existsSync(file)) continue;
    const doc = await io.read(file);
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const mats = mesh.listPrimitives().map((p) => p.getMaterial()?.getName());
      const byNode = ORAL_GEOMETRY.test(node.getName()) || ORAL_GEOMETRY.test(mesh.getName());
      if (!byNode && !isOralGeometryNamed(mesh.getName(), mats)) continue;
      hidden++;
      const verts = mesh.listPrimitives().reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0);
      const why = byNode ? 'name' : 'material';
      if (!check) console.log(`${(id + suffix).padEnd(26)} hides ${node.getName()} [${mats.join(' | ')}] (${verts} v, by ${why})`);
      const own = `${node.getName()} ${mesh.getName()}`;
      if (ANATOMY.test(own) && !/hinge|lining|interior/i.test(own)) failures.push(`${id}${suffix}: "${node.getName()}" is hidden by the oral classifier but is named as anatomy`);
    }
  }
}
console.log(`${hidden} hidden meshes across ${ids.length} bodies (authored, twin and LOD)`);
if (failures.length) {
  for (const f of failures) console.error('FAIL ' + f);
  process.exit(1);
}
console.log('nothing the game hides is named as anatomy');
