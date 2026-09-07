/** Asset placement invariants across the calm, standard and extreme biome bands. */
import assert from 'node:assert/strict';
import { biomeAt, generateChunk, sampleHeight, type FloraKind } from '../src/sim/world';
const plants: Partial<Record<FloraKind, number>> = {};
const rocks: Record<string, number> = {};
let shallowTufts = 0, shallowLettuce = 0;
for (let cx = -8; cx <= 8; cx += 2) for (let cz = -20; cz <= 1; cz += 2) {
  const c = generateChunk(5052026, cx, cz);
  for (const f of c.flora) {
    const biome = biomeAt(f.pos.x, f.pos.z);
    plants[f.kind] = (plants[f.kind] ?? 0) + 1;
    if (f.kind === 'cushion') assert.ok(biome === 'shallows' || biome === 'nursery');
    if (f.kind === 'lettuce') { assert.equal(biome, 'shallows'); shallowLettuce++; }
    if (f.kind === 'spine') assert.ok(biome === 'escarpment' || biome === 'basin');
    if (f.kind === 'glass') assert.equal(biome, 'basin');
    if (f.kind === 'tuft' && biome === 'shallows') shallowTufts++;
    assert.ok(f.H > 0 && f.R > 0 && f.maxB > 0);
  }
  for (const b of c.boulders) if (b.variant) {
    rocks[b.variant] = (rocks[b.variant] ?? 0) + 1;
    assert.equal(b.pos.y, sampleHeight(b.pos.x, b.pos.z));
    assert.ok(Math.abs(b.height - b.pos.y - b.sy * (b.variant === 'blade-spire' ? 4 : .8)) < 1e-6);
    assert.ok(b.radius >= b.sx * (b.variant === 'blade-spire' ? .6236 : .8638));
  }
}
for (const kind of ['cushion', 'lettuce', 'spine', 'glass'] as const) assert.ok((plants[kind] ?? 0) > 0, kind);
assert.ok(rocks['blade-spire'] > 0 && rocks['talus-shard'] > 0);
const ratio = shallowLettuce / (shallowLettuce + shallowTufts);
assert.ok(ratio > .4 && ratio < .6, `Half the shallow tufts: ${ratio}`);
const before = generateChunk(5052026, 3, -12);
generateChunk(123, -42, -80);
assert.deepEqual(generateChunk(5052026, 3, -12), before, 'Chunk generation order must not change assets');
console.log({ plants, rocks, shallowLettuceFraction: ratio });
console.log('Environment biome placement and collision bounds passed.');
