/**
 * The pick screen's Size view: the roster laid out as a slice of sea, drawn at size, and walked by
 * position. Run: npm run depth
 *
 * Checked on all three games' real rosters (their creature files import nothing but types, so all
 * three can be read in one process) at the sizes a desktop gives the roster, and on synthetic ones
 * for the edges: an empty band, a single animal, a box too small to be generous with.
 */
import { depthLayout, depthStep, habitatBand, MIN_W, type DepthItem, type DepthLayout, type DepthSlot } from '../src/app/depth-layout';
import { CAMBRIAN_CREATURES } from '../src/content/cambrian/creatures';
import { DEVONIAN_CREATURES } from '../src/content/devonian/creatures';
import { TRIASSIC_CREATURES } from '../src/content/triassic/creatures';

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(66)} ${d}`); if (!ok) failed++; };
const overlap = (a: DepthLayout['spots'][number], b: DepthLayout['spots'][number]) =>
  a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const key = (s: DepthSlot) => `${s.kind}:${s.id}`;

const rosters = {
  cambrian: CAMBRIAN_CREATURES, devonian: DEVONIAN_CREATURES, triassic: TRIASSIC_CREATURES,
};
const itemsOf = (defs: typeof CAMBRIAN_CREATURES): DepthItem[] => defs
  .filter((d) => !d.npc && !d.shelved && !d.shore)
  .map((d) => ({ id: d.id, band: habitatBand(d), length: d.adultLength }));

function sound(name: string, items: DepthItem[], extras: string[], box: { w: number; h: number }) {
  const L = depthLayout(items, extras, box);
  const creatures = L.spots.filter((s) => s.slot.kind === 'creature');
  check(`${name}: every animal drawn once`, creatures.length === items.length && new Set(creatures.map((s) => s.slot.id)).size === items.length);
  check(`${name}: every extra drawn`, L.spots.filter((s) => s.slot.kind === 'extra').length === extras.length);
  const outside = L.spots.filter((s) => s.x < -0.5 || s.y < -0.5 || s.x + s.w > box.w + 0.5 || s.y + s.h > box.h + 0.5);
  check(`${name}: nothing leaves the box`, outside.length === 0, outside.map((s) => key(s.slot)).join(' '));
  let hits = 0;
  for (let i = 0; i < L.spots.length; i++) for (let j = i + 1; j < L.spots.length; j++) if (overlap(L.spots[i], L.spots[j])) hits++;
  check(`${name}: nothing overlaps`, hits === 0, `${hits} overlapping pairs`);
  // A longer animal is never drawn smaller than a shorter one.
  const byLen = new Map(items.map((i) => [i.id, i.length]));
  const inverted = creatures.filter((a) => creatures.some((b) => byLen.get(a.slot.id)! > byLen.get(b.slot.id)! && a.w < b.w - 0.01));
  check(`${name}: size follows length`, inverted.length === 0, inverted.map((s) => s.slot.id).join(' '));
  check(`${name}: nothing below the pointable minimum`, creatures.every((s) => s.w >= MIN_W - 1e-6));
  // The bands are stacked as the sea is: surface over open water over floor.
  const mid = (b: string) => creatures.filter((s) => s.band === b).map((s) => s.y + s.h / 2);
  const [sf, wa, fl] = [mid('surface'), mid('water'), mid('floor')];
  const below = (a: number[], b: number[]) => !a.length || !b.length || Math.max(...a) < Math.min(...b);
  check(`${name}: drifters over swimmers over the floor`, below(sf, wa) && below(wa, fl) && below(sf, fl));
  const floorOk = L.spots.filter((s) => s.band === 'floor').every((s) => s.y + s.h <= L.floorY + 0.5);
  check(`${name}: the floor's animals stand on it`, floorOk && L.spots.filter((s) => s.band === 'floor').some((s) => Math.abs(s.y + s.h - L.floorY) < 0.5) === (fl.length > 0));
  // Every spot reaches every direction to something, and the whole roster is reachable by walking.
  const seen = new Set<string>([key(L.spots[0].slot)]);
  const queue = [L.spots[0].slot];
  while (queue.length) {
    const from = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const to = depthStep(L, from, dx, dy);
      if (!seen.has(key(to))) { seen.add(key(to)); queue.push(to); }
    }
  }
  check(`${name}: every spot reachable by the stick`, seen.size === L.spots.length, `${seen.size}/${L.spots.length}`);
  return L;
}

for (const [era, defs] of Object.entries(rosters)) {
  const items = itemsOf(defs);
  for (const box of [{ w: 880, h: 640 }, { w: 1180, h: 760 }, { w: 620, h: 470 }]) {
    sound(`${era} ${box.w}x${box.h}`, items, era === 'triassic' ? ['random', 'visitors'] : ['random'], box);
  }
}

// The stick goes where the eye does.
{
  const items: DepthItem[] = [
    { id: 'jelly', band: 'surface', length: 20 }, { id: 'big', band: 'water', length: 40 },
    { id: 'small', band: 'water', length: 2 }, { id: 'crab', band: 'floor', length: 5 }, { id: 'worm', band: 'floor', length: 3 },
  ];
  const L = sound('synthetic', items, ['random'], { w: 900, h: 600 });
  const at = (id: string) => L.spots.find((s) => s.slot.id === id)!;
  const down = depthStep(L, { kind: 'creature', id: 'jelly' }, 0, 1);
  check('down from the surface goes into the water', at(down.id).band === 'water', down.id);
  const up = depthStep(L, { kind: 'creature', id: 'crab' }, 0, -1);
  check('up from the floor goes into the water', at(up.id).band === 'water', up.id);
  const right = depthStep(L, { kind: 'creature', id: 'worm' }, 1, 0);
  check('right along the floor stays on the floor', at(right.id).band === 'floor', right.id);
}
// A sea with no drifters still has a surface, and one animal is simply drawn.
{
  sound('no surface band', [{ id: 'a', band: 'water', length: 10 }, { id: 'b', band: 'floor', length: 4 }], [], { w: 700, h: 500 });
  sound('one animal', [{ id: 'solo', band: 'water', length: 10 }], [], { w: 700, h: 500 });
}
// Where an animal lives comes off the traits the simulation already moves it by.
check('a ground animal lives on the floor', habitatBand({ ground: true }) === 'floor');
check('a medusa lives at the surface', habitatBand({ ground: false, swimStyle: 'pulse' }) === 'surface');
check('a drifter lives at the surface', habitatBand({ ground: false, drift: true }) === 'surface');
check('a swimmer lives in open water', habitatBand({ ground: false }) === 'water');

console.log(failed ? `${failed} failure(s)` : 'PASS: the Size view draws every animal at its size where it lives, and the stick reaches all of it');
process.exit(failed ? 1 : 0);
