import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { appendAnchors } from '../creatures/add-anchors.mjs';
const ids = process.argv.slice(2);
assert(ids.length, 'Pass the completed Devonian creature IDs explicitly');
const roster = JSON.parse(await fs.readFile('tools/devonian/roster.json', 'utf8'));
for (const id of ids) {
  assert(roster.includes(id), id);
  const source = JSON.parse(await fs.readFile(`tools/devonian/creatures/${id}/anchors.json`, 'utf8'));
  const records = Array.isArray(source) ? source : source[id];
  assert(records?.length, `${id}: no anatomical anchors`);
  for (const suffix of ['', '.lod1']) {
    const file = `public/assets/devonian/creatures/${id}${suffix}.glb`;
    const raw = await fs.readFile(file), out = appendAnchors(raw, records);
    assert(appendAnchors(out.bytes, records).bytes.equals(out.bytes), 'Anchor pass not idempotent');
    if (out.added) await fs.writeFile(file, out.bytes);
    console.log(`${id}${suffix}: ${out.rows.length} sockets, ${out.added} appended; exact BIN preserved`);
  }
}
