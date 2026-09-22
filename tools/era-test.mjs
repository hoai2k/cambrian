import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  stdin: { contents: "export * from './src/content'; export * from './src/content/era'; export * from './src/content/asset-paths'; export { CAMBRIAN } from './src/content/cambrian'; export { DEVONIAN } from './src/content/devonian'; export { TRIASSIC } from './src/content/triassic'; export { SHARED_STRINGS, mergeStrings } from './src/content/strings'; export { CAMBRIAN_PENDING } from './src/content/cambrian/model-status'; export { default as DEVONIAN_PENDING } from './src/content/devonian/pending-refinements.json'; export { default as TRIASSIC_PENDING } from './src/content/triassic/pending-refinements.json'; export { SPECIMENS } from './src/viewer/catalogue';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { ACTIVE_ERA: era, defineEra, createAssetPaths, SHARED_STRINGS, mergeStrings, CAMBRIAN, DEVONIAN, TRIASSIC, CAMBRIAN_PENDING, DEVONIAN_PENDING, TRIASSIC_PENDING, SPECIMENS } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
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
// A pack may borrow another era's delivered body until its own lands: '<era>/<id>' resolves into
// that era's creature folder (the Triassic does this for its whole roster today).
const borrowing = createAssetPaths({ ...era, assets: { ...era.assets, creatures: 'assets/triassic/creatures/', standIns: { pikaia: 'devonian/cladoselache' } } });
assert.equal(borrowing.model('pikaia'), 'assets/devonian/creatures/cladoselache.glb');
assert.equal(borrowing.model('pikaia', 1), 'assets/devonian/creatures/cladoselache.lod1.glb');
assert.equal(borrowing.model('opabinia'), 'assets/triassic/creatures/opabinia.glb');
assert.equal(TRIASSIC.id, 'triassic');
assert.ok(TRIASSIC.assets.standInsPlayable, 'the Triassic plays its borrowed bodies');

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
  { name: 'Triassic', era: TRIASSIC, pending: TRIASSIC_PENDING },
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

console.log('PASS: era validation, all 21 model/portrait paths and byte sizes, group labels, model/animation badge split with reasons for all three eras, cross-era stand-ins, and independent future asset namespaces');

/**
 * The text tables: `src/content/strings.ts` shared, `src/content/<era>/strings.ts` per game, joined
 * by `mergeStrings` (which `src/shared/text.ts` does at runtime). Three things are worth holding.
 *
 * An era may only *override* — a key it invents is a key nothing reads, which is how a renamed
 * string quietly stops being shown. Every leaf of the merged table has to be a string, a function
 * or a list of strings, or something the UI draws comes out `undefined`. And the loading lines have
 * to be that era's own: one shared list is how all three games came to be loading to Cambrian
 * trivia about Hallucigenia.
 */
const leaves = (o, path = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, `${path}${k}.`) : [[`${path}${k}`, v]]);
const SHARED_KEYS = new Set(leaves(SHARED_STRINGS).map(([k]) => k));
for (const [name, e] of [['cambrian', CAMBRIAN], ['devonian', DEVONIAN], ['triassic', TRIASSIC]]) {
  assert.ok(e.strings, `${name}: no strings table`);
  for (const [key] of leaves(e.strings)) {
    assert.ok(SHARED_KEYS.has(key), `${name}: strings.${key} is not a key the shared table has, so nothing reads it`);
  }
  const merged = mergeStrings(SHARED_STRINGS, e.strings);
  for (const [key, value] of leaves(merged)) {
    const ok = typeof value === 'string' || typeof value === 'function'
      || (Array.isArray(value) && value.every((x) => typeof x === 'string'));
    assert.ok(ok, `${name}: strings.${key} is neither a string, a function nor a list of strings`);
  }
  assert.ok(merged.loading.facts.length >= 4, `${name}: the boot screen needs its own loading lines`);
  assert.ok(merged.sim.ladder.rungs.length === SHARED_STRINGS.sim.ladder.rungs.length,
    `${name}: the ladder must name every rung`);
}
// Each era's loading lines are its own, not another game's.
const FACTS = [CAMBRIAN, DEVONIAN, TRIASSIC].map((e) => mergeStrings(SHARED_STRINGS, e.strings).loading.facts);
for (let i = 0; i < FACTS.length; i++) for (let j = i + 1; j < FACTS.length; j++) {
  assert.ok(!FACTS[i].some((f) => FACTS[j].includes(f)), 'two eras are showing the same loading line');
}
console.log('PASS: the shared and per-era text tables, with every era override landing on a key the shared table has');

// ---- what each game offers, and what it only keeps ----
// Three words on a creature's card keep it off a pick screen, and each says something different:
// `shore` stands on the beach and strikes into the water, `npc` is an ordinary animal the sea
// holds and does not offer, and `shelved` is not in that game at all and is kept so the specimen
// viewer can still show the body that was built for it. Counted rather than listed, because the
// point is the shape of the pick screen: eighteen in each game, which is three rows of six.
const STANDING = (c) => (c.shelved ? 'SHELVED' : c.shore ? 'SHORE ANIMAL' : c.npc ? 'NPC' : undefined);
for (const [name, e] of [['Cambrian', CAMBRIAN], ['Devonian', DEVONIAN], ['Triassic', TRIASSIC]]) {
  const offered = e.creatures.filter((c) => !STANDING(c) && (e.assets.standInsPlayable || !e.assets.standIns?.[c.id]));
  assert.equal(offered.length, 18, `${name}: the pick screen offers 18 animals, which is three rows of six (got ${offered.length})`);
  // A shelved animal is out of the sea as well as off the screen, which is the whole of what
  // separates it from an NPC and what lets its roster entry stay without putting it in the water.
  for (const c of e.creatures.filter((x) => x.shelved)) {
    assert.ok(!c.shore && !c.npc, `${name}: ${c.id} is shelved, so it needs no second word for being kept back`);
  }
  // The preload lists are what a player is most likely to reach for, so every id on them has to be
  // something they can actually reach for: a full body and two portraits fetched ahead of time for
  // an animal that is not on the pick screen is bandwidth spent on a tile nobody will see. The
  // Devonian's boot list named Bothriolepis the day it became an NPC.
  const offers = new Set(offered.map((c) => c.id));
  for (const id of [e.defaults.player, ...e.defaults.boot, ...e.defaults.title]) {
    assert.ok(offers.has(id), `${name}: ${id} is preloaded for the pick screen but is not offered on it`);
  }
}
// The viewer lists every body a game has, so "can I play this?" has to be answered there: the ones
// a player cannot pick sort to the end of their collection and carry the word in their role line.
for (const c of new Set(SPECIMENS.map((r) => r.collection))) {
  const rows = SPECIMENS.filter((r) => r.collection === c);
  const first = rows.findIndex((r) => r.notPlayable);
  if (first < 0) continue;
  assert.ok(first > 0, `${c}: a collection cannot be nothing but animals a player is not offered`);
  assert.ok(rows.slice(first).every((r) => r.notPlayable), `${c}: an animal a player can pick sits after one they cannot`);
  assert.ok(rows.slice(first).every((r) => r.role.includes(r.notPlayable)),
    `${c}: a kept-back animal's role line does not say which kind it is`);
}
console.log('PASS: three pick screens of eighteen, and the viewer keeps what it does not offer at the end of each list');
