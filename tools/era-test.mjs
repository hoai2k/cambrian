import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  stdin: { contents: "export * from './src/content'; export * from './src/content/era'; export * from './src/content/asset-paths'; export { CAMBRIAN } from './src/content/cambrian'; export { DEVONIAN } from './src/content/devonian'; export { CAMBRIAN_PENDING } from './src/content/cambrian/model-status'; export { default as DEVONIAN_PENDING } from './src/content/devonian/pending-refinements.json';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { ACTIVE_ERA: era, defineEra, createAssetPaths, CAMBRIAN, DEVONIAN, CAMBRIAN_PENDING, DEVONIAN_PENDING } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
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
// A badge has to say what it is waiting for, and has to be the right badge. Both eras derive
// everything below from one pending-refinements queue, so this checks the derivation held.
//
// The split matters: the creature's preview badge means the *3D model* is unfinished. A finished
// body whose animation clips are queued carries no badge at all — the warning goes on those clips.
// Flagging the whole animal for pending motion work is what made Anomalocaris and Opabinia look
// unfinished when their models were done.
for (const { name, era: e, pending } of [
  { name: 'Cambrian', era: CAMBRIAN, pending: CAMBRIAN_PENDING },
  { name: 'Devonian', era: DEVONIAN, pending: DEVONIAN_PENDING },
]) {
  const status = e.assets.modelStatus ?? {};
  const notes = e.assets.modelNotes ?? {};
  const clipNotes = e.assets.clipNotes ?? {};
  const roster = new Set(e.creatures.map((c) => c.id));

  assert.equal(new Set(pending.map((p) => p.id)).size, pending.length, `${name}: duplicate queue entry`);
  for (const p of pending) {
    assert.ok(roster.has(p.id), `${name}/${p.id} is queued but not on the roster`);
    assert.ok(p.model || p.clips?.length, `${name}/${p.id} is queued with neither model nor animation work`);
    if (p.model) assert.ok(p.reason?.length > 60, `${name}/${p.id}: model work needs a reason for its badge`);
    if (p.clips?.length) assert.ok(p.clipReason?.length > 60, `${name}/${p.id}: queued clips need a reason for their badge`);
  }

  const previews = Object.entries(status).filter(([, v]) => v === 'preview').map(([id]) => id);
  // An era with nothing queued is the finished state, not a broken table: the Cambrian reached it
  // when Odaraia shipped. What must hold either way is that the derived table and the queue agree
  // in both directions, so a badge can never appear without outstanding work or go missing while
  // work remains.
  for (const p of pending.filter((p) => p.model)) {
    assert.equal(status[p.id], 'preview', `${name}/${p.id} has queued model work but shows no preview badge`);
  }
  for (const id of previews) {
    assert.ok(notes[id]?.length > 60, `${name}/${id} is a preview model with no note saying what remains`);
    assert.ok(pending.some((p) => p.id === id && p.model), `${name}/${id} shows a preview badge with no outstanding model work`);
  }
  for (const id of Object.keys(notes)) {
    assert.equal(status[id], 'preview', `${name}/${id} has a "what remains" note but is not a preview`);
    assert.ok(roster.has(id), `${name}/${id} has a note but is not on the roster`);
  }
  // Animation work never shows the creature's badge on its own.
  for (const p of pending.filter((p) => !p.model)) {
    assert.ok(!status[p.id], `${name}/${p.id} has only animation work queued, so it must not be flagged as a preview model`);
    assert.ok(clipNotes[p.id], `${name}/${p.id} has queued clips but no note for their buttons`);
  }
  for (const [id, clips] of Object.entries(clipNotes)) {
    assert.ok(roster.has(id), `${name}/${id} has clip notes but is not on the roster`);
    const queued = pending.find((p) => p.id === id)?.clips ?? [];
    assert.deepEqual(Object.keys(clips).sort(), [...queued].sort(), `${name}/${id}: clip notes disagree with the queue`);
  }
}

console.log('PASS: era validation, all 21 model/portrait paths and byte sizes, group labels, model/animation badge split with reasons, and independent future asset namespaces');
