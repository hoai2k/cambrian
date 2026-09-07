/** Refresh the asset-only catalogue from delivered, validated metadata. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const roster = JSON.parse(fs.readFileSync('tools/devonian/roster.json', 'utf8'));
const shipped = JSON.parse(fs.readFileSync('tools/devonian/shipped.json'));
assert.equal(new Set(shipped.creatures).size, shipped.creatures.length);
assert.equal(new Set(shipped.props).size, shipped.props.length);
for (const id of shipped.creatures) assert(roster.includes(id), `Unknown released creature ${id}`);
const status = JSON.parse(fs.readFileSync('src/content/devonian/model-status.json'));
for (const id of roster) assert(['preview', 'final'].includes(status[id]), `${id}: missing model production status`);
const root = 'public/assets/devonian';
const all = [];
for (const id of roster.filter(id => shipped.creatures.includes(id))) {
  const file = `${root}/creatures/${id}.json`;
  assert(fs.existsSync(file), `Released creature ${id} has no metadata`);
  const c = JSON.parse(fs.readFileSync(file));
  assert.equal(c.id, id);
  for (const k of ['name', 'species', 'provenance', 'description']) assert(typeof c[k] === 'string' && c[k], `${id}: missing ${k}`);
  for (const k of ['lengthMeters', 'modelLength']) assert(Number.isFinite(c[k]) && c[k] > 0, `${id}: missing ${k}`);
  for (const ext of ['glb', 'lod1.glb', 'png', 'card.png', 'select.png', 'thumb.png']) assert(fs.existsSync(`${root}/creatures/${id}.${ext}`), `${id}: ${ext}`);
  all.push({ id, name: c.name, species: c.species, category: 'creature', modelStatus: status[id], provenance: c.provenance,
    description: c.description, model: `assets/devonian/creatures/${id}.glb`, lod: `assets/devonian/creatures/${id}.lod1.glb`,
    image: `assets/devonian/creatures/${id}.thumb.png`, lengthMeters: c.lengthMeters,
    looping: c.looping ?? [], sources: c.sources ?? [], notes: c.notes ?? [],
  });
}
if (shipped.props.length) {
  const manifest = JSON.parse(fs.readFileSync(`${root}/props/manifest.json`));
  for (const id of shipped.props) {
    const p = manifest.props.find(p => p.id === id);
    assert(p, `Released prop ${id} missing from manifest`);
    for (const field of ['model', 'lod', 'image']) assert(fs.existsSync(`public/${p[field]}`), `${p.id}: ${field}`);
    all.push({ id:p.id, name:p.name, species:p.category ?? 'Scenery', category:'prop', modelStatus: p.modelStatus ?? 'preview', provenance:p.provenance,
      description:p.description, model:p.model, lod:p.lod, image:p.image, lengthMeters:p.lengthMeters,
      looping:p.looping ?? [], sources:p.sources ?? [], notes:p.notes ?? [],
    });
  }
}
const output = JSON.stringify(all, null, 2)+'\n';
if (process.argv.includes('--check')) assert.equal(fs.readFileSync('src/content/devonian/specimens.json', 'utf8'), output, 'Devonian catalogue is stale: run npm run devonian:catalogue');
else fs.writeFileSync('src/content/devonian/specimens.json', output);
console.log(`Catalogue: ${all.filter(x=>x.category==='creature').length}/21 creatures, ${all.filter(x=>x.category==='prop').length} props`);
