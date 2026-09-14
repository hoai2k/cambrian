/**
 * The seabed audit: what every scenery prop is drawn as, against what it collides as.
 *
 * Three things have to hold for a prop, and each of them was broken for something before the
 * footprints landed:
 *  - the table the simulation collides against is the meshes as they are now (`npm run shapes`);
 *  - the collider contains the mesh, so nothing can be swum through — the Devonian's boulder
 *    used to put its corners a third of the way outside its ellipse;
 *  - the collider is not much bigger than the mesh, so there is no invisible wall — a driftwood
 *    log used to block a disc as wide as the log is long.
 */
import assert from 'node:assert/strict';
// @ts-expect-error - the generator is plain JS, shared so the test measures exactly what it writes.
import { measure, propFiles, shapes as measureAll, BINS, BANDS } from './prop-shapes.mjs';
import table from '../src/content/prop-shapes.json';
import { fpRadius, fpRadiusAt } from '../src/sim/footprint';
import { FLORA_PHYS } from '../src/sim/flora';
import { unionShape } from '../src/content/prop-shapes';
import { DEVONIAN_SCENERY } from '../src/content/devonian/scenery';
import { TRIASSIC_SCENERY } from '../src/content/triassic/scenery';
import { existsSync } from 'node:fs';

let checks = 0, failures = 0;
const ok = (pass: boolean, name: string, detail = '') => {
  checks++; if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${detail}`);
};

// ---- the checked-in table is the meshes as they are now ----
const fresh = await measureAll();
ok(JSON.stringify(fresh) === JSON.stringify(table),
  'the collider table matches the props on disk',
  `${Object.keys(fresh).length} props; run npm run shapes if this fails`);

// ---- the collider contains the mesh, and is not much wider than it ----
const files: Record<string, string> = propFiles();
const worst: { id: string; saved: number }[] = [];
for (const id of Object.keys(files).sort()) {
  const shape = (table as Record<string, typeof table['devonian-log']>)[id];
  const m = await measure(files[id]);
  assert.equal(m.bands.length, BANDS);
  assert.equal(m.r.length, BINS);
  const h = Math.max(m.y1 - m.y0, 1e-6);

  // Coverage: sample the surface again and check every point is inside the footprint for its band
  // (and inside the whole-silhouette footprint the rocks use).
  let outside = 0, outsideBand = 0, points = 0, deepest = 0;
  const grids = Array.from({ length: BANDS }, () => new Set());
  const CELL = m.rmax / 24;
  for (let b = 0; b < BANDS; b++) {
    for (let bin = 0; bin < BINS; bin++) {
      // The measured band radius is the mesh; walk it and confirm the collider reaches at least there.
      const ang = (bin / BINS) * Math.PI * 2;
      const rMesh = m.bands[b][bin], x = Math.sin(ang) * rMesh, z = Math.cos(ang) * rMesh;
      points++;
      const fr = (b + 0.5) / BANDS;
      if (Math.hypot(x, z) > fpRadius(shape.r, ang) * 1.0001) outside++;
      const rc = fpRadiusAt(shape.bands, fr, ang);
      if (Math.hypot(x, z) > rc * 1.0001) { outsideBand++; deepest = Math.max(deepest, rMesh / rc); }
      grids[b].add(`${Math.round(x / CELL)},${Math.round(z / CELL)}`);
    }
  }
  ok(outside === 0, `${id}: the silhouette collider contains the mesh`, `${points} rim points`);
  ok(outsideBand === 0, `${id}: ...and so does the collider at every height`, deepest ? `worst ${(deepest * 100 - 100).toFixed(0)}% out` : '');

  // Tightness: how much bigger the collider is than the circle-free area the mesh actually fills,
  // measured against the disc the old collider used.
  const area = (radii: number[]) => { let a = 0; for (let i = 0; i < BINS; i++) { const r0 = radii[i], r1 = radii[(i + 1) % BINS]; a += 0.5 * r0 * r1 * Math.sin(Math.PI * 2 / BINS); } return a; };
  const disc = Math.PI * m.rmax * m.rmax;
  const saved = 1 - area(shape.r) / disc;
  worst.push({ id, saved });
}

// ---- the props that were the complaint: long, flat things are no longer discs ----
for (const [id, least] of [['devonian-log', 0.35], ['glass-fan', 0.5], ['devonian-bryozoan', 0.5], ['talus-shard', 0.15], ['devonian-algal-clump', 0.5]] as [string, number][]) {
  const w = worst.find((x) => x.id === id);
  ok(w && w.saved > least, `${id} blocks its own shape, not a disc around it`, `${((w?.saved ?? 0) * 100).toFixed(0)}% of the disc is open water again`);
}

// ---- every prop an era can ask for is a file that exists ----
// A scenery pack that does not name a prop falls back to the bare id under *that era's* props
// folder, so an era with an empty folder quietly asks the network for a GLB that was never there —
// which is what the Triassic did for its three rock variants, on every seabed, with no error
// anywhere but the network tab. A mapping is a promise that a file is behind it.
for (const [era, scenery] of [['Devonian', DEVONIAN_SCENERY], ['Triassic', TRIASSIC_SCENERY]] as const) {
  const declared = Object.entries(scenery.props);
  for (const [id, prop] of declared)
    ok(existsSync(`public/${prop.path}`), `${era} ${id}: the mesh behind the mapping exists`, prop.path);
  const named = new Set(declared.map(([id]) => id));
  const used = [
    ...Object.values(scenery.flora).flatMap((v) => (typeof v === 'string' ? [v] : [...(v ?? [])])),
    ...Object.values(scenery.rocks ?? {}),
  ].filter((v): v is string => !!v);
  for (const id of new Set(used))
    ok(named.has(id), `${era} ${id}: is declared in the pack rather than resolved by fallback`,
      named.has(id) ? '' : 'unnamed ids resolve under the era folder and 404 when it is empty');
}

// ---- a plant's collider is as tall as the mesh it is drawn from ----
// Every era's mapping, not just the era this process happens to have selected: a kind is drawn by
// whichever pack owns it, and a kind the Cambrian never places is still one the Triassic collides
// with. A family of variants is checked against the union envelope the simulation actually uses,
// so adding a taller variant to a family fails here rather than reaching the water as a dome the
// player's belly passes through.
const MAPPINGS: [string, Readonly<Partial<Record<string, string | readonly string[]>>>][] = [
  ['Cambrian', { cushion: 'cushion-sponge', lettuce: 'lettuce-tuft', spine: 'spine-sponge', glass: 'glass-fan' }],
  ['Devonian', DEVONIAN_SCENERY.flora],
  ['Triassic', TRIASSIC_SCENERY.flora],
];
for (const [era, flora] of MAPPINGS)
  for (const kind of Object.keys(FLORA_PHYS) as (keyof typeof FLORA_PHYS)[]) {
    const named = flora[kind];
    if (named === undefined) continue;
    const ids = typeof named === 'string' ? [named] : named;
    for (const id of ids) assert((table as Record<string, unknown>)[id], `${kind} is drawn with ${id}, which has no measured shape`);
    const shape = unionShape(ids)!;
    const drawn = shape.y1 - shape.y0;
    ok(Math.abs(FLORA_PHYS[kind].h - drawn) < 0.02,
      `${era} ${kind}: the collider is as tall as ${ids.join(' + ')}`,
      `${FLORA_PHYS[kind].h} vs ${drawn.toFixed(3)}`);
  }

console.log(`\n${checks} checks, ${failures} failure(s)`);
console.log(worst.map((w) => `${w.id}: ${(w.saved * 100).toFixed(0)}% tighter than a disc`).join('\n'));
if (failures) process.exit(1);
