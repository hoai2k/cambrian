import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  stdin: { contents: "export * from './src/content'; export * from './src/content/era'; export * from './src/content/asset-paths';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { ACTIVE_ERA: era, defineEra, createAssetPaths } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
assert.equal(era.id, 'cambrian');
assert.equal(era.creatures.length, 21);
assert.equal(era.defaults.player, 'anomalocaris');
assert.throws(() => defineEra({ ...era, creatures: [] }), /empty or duplicate/);
assert.throws(() => defineEra({ ...era, creatures: [...era.creatures, era.creatures[0]] }), /empty or duplicate/);
assert.throws(() => defineEra({ ...era, defaults: { ...era.defaults, player: 'missing' } }), /outside the roster/);
assert.throws(() => defineEra({ ...era, assets: { ...era.assets, modelBytes: {} } }), /missing model size/);
assert.throws(() => defineEra({ ...era, ecology: { ...era.ecology, giants: [] } }), /giant habitat/);
const paths = createAssetPaths(era);
for (const c of era.creatures) {
  for (const path of [paths.model(c.id), paths.model(c.id, 1), ...['card', 'select', 'thumb'].map(k => paths.portrait(c.id, k))]) {
    assert.ok(fs.existsSync(`public/${path}`), path);
  }
  assert.equal(fs.statSync(`public/${paths.model(c.id)}`).size, era.assets.modelBytes[c.id]);
}
// A future pack can use an independent asset namespace with no shared-loader edits.
const alternative = createAssetPaths({ ...era, assets: { ...era.assets,
  creatures: 'assets/devonian/creatures/', defaultPortraits: 'assets/devonian/portraits/', music: 'assets/devonian/music/',
} });
assert.equal(alternative.model('example'), 'assets/devonian/creatures/example.glb');
assert.equal(alternative.model('example', 1), 'assets/devonian/creatures/example.lod1.glb');
assert.equal(alternative.portrait('example', 'select'), 'assets/devonian/portraits/example.select.png');
assert.equal(alternative.music('Test Track'), 'assets/devonian/music/Test%20Track.mp3');
assert.equal(paths.model('pikaia'), 'assets/creatures/pikaia.glb');

// Every animal shows the everyday group it belongs to beside its genus — unless the group name is
// the less familiar of the two, or is still unsettled, in which case it shows nothing. That is a
// judgement per animal, so the omissions are listed here and a new animal has to join one side.
// See docs/research/cambrian-classification.md.
const UNLABELLED = ['anomalocaris', 'opabinia', 'nectocaris', 'vetulicola'];
for (const c of era.creatures) {
  if (UNLABELLED.includes(c.id)) {
    assert.ok(!c.kind && !c.kindNote, `${c.id} is deliberately unlabelled; drop it from UNLABELLED to give it a group`);
    continue;
  }
  assert.ok(c.kind && c.kind.length <= 18, `${c.id} needs a short everyday group (got ${c.kind ?? 'none'})`);
  assert.ok(c.kindNote && c.kindNote.length > 40, `${c.id}'s group needs a sentence explaining it`);
}
console.log('PASS: era validation, all 21 model/portrait paths and byte sizes, group labels, and independent future asset namespaces');
