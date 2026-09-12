/**
 * Plant collision: bodies slide around stiff sponges, fold soft algae over, and plants spring back.
 *
 * What a plant does to a body, and a body to a plant, is graded by size — `give` in
 * `src/sim/flora.ts` is the actor's size against the plant's rigidity — so the cases here ask for
 * that gradient rather than for one animal's numbers. Two absolute thresholds used to be tuned to
 * the adult Anomalocaris of the flat roster, and both went stale within a percent of their limits
 * the day the Cambrian went to its natural lengths and that animal grew by half.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { bodyRadius, lengthOf } from '../src/sim/actors';
import { FLORA_PHYS } from '../src/sim/flora';
import { sampleHeight, type Flora, type FloraKind } from '../src/sim/world';
import type { Actor } from '../src/sim/types';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(52)} ${d}`); if (!ok) failed++; };
const S = process.argv[2] === 'verbose';

/** The flattest 20-unit stretch on the shelf near the origin nursery: the swimmer is held at plant height, so the seabed must not get in the way. */
function flatSpot() {
  let best = { x: -10, z: -100 }, bestVar = Infinity;
  for (let x = -200; x <= 200; x += 9) for (let z = -60; z >= -160; z -= 9) {
    const h0 = sampleHeight(x, z);
    let v = 0;
    for (let d = -10; d <= 10; d += 2.5) v = Math.max(v, Math.abs(sampleHeight(x + d, z) - h0), Math.abs(sampleHeight(x, z + d) - h0));
    if (v < bestVar) { bestVar = v; best = { x, z }; }
  }
  return best;
}

/** Fresh game with the flora replaced by a single plant at the origin of an empty patch. */
function scene(kind: FloraKind, scale: number, creatureId: 'anomalocaris' | 'waptia', actorScale: number, offset: number) {
  const g = new Game('reef', [{ creature: creatureId, device: 'keyboard', ready: true }], 11);
  const p = g.players[0];
  // clear the world of plants and put one down on flat ground away from boulders
  const { x: x0, z: z0 } = flatSpot();
  const y = sampleHeight(x0, z0) - 0.03;
  const P = FLORA_PHYS[kind];
  const plant: Flora = { pos: { x: x0, y, z: z0 }, kind, scale, sy: scale, rot: 0.3, shade: 0.8, H: P.h * scale, R: P.r * scale, maxB: P.maxLean * P.h * scale, bx: 0, bz: 0, bvx: 0, bvz: 0, active: false };
  g.world.frozen = true;                       // hand-built scenery must not be streamed away
  g.world.flora.length = 0; g.world.flora.push(plant);
  g.world.floraHash.rebuild(g.world.flora);
  g.world.floraReach = plant.R + plant.maxB;
  g.world.boulders.length = 0; g.world.boulderHash.rebuild([]);
  g.world.activeFlora.length = 0;
  // nobody else nearby
  for (const a of [...g.actors]) if (a !== p) { (g as any).remove(a); }
  p.scale = actorScale; (p as any).tier = 2;
  p.spawnProtect = 0;
  p.pos = { x: x0 - 6, y: y + plant.H * 0.6, z: z0 + offset };
  p.vel = { x: 0, y: 0, z: 0 }; p.yaw = Math.PI / 2;
  return { g, p, plant, x0, z0 };
}

const swim = (g: Game, p: Actor, seconds: number, on?: (t: number) => void, holdY?: number) => {
  const f: InputFrame = { ...emptyInput(), worldMove: { x: 1, y: 0, z: 0 } };
  const m = new Map([[0, f]]);
  for (let i = 0; i < seconds * 60; i++) {
    // hold the swimmer at plant height (the seabed undulates more than a tuft is tall)
    if (holdY !== undefined) { p.pos.y = holdY; p.vel.y = 0; }
    g.step(1 / 60, m); g.events.length = 0; on?.((i + 1) / 60);
  }
};
const settle = (g: Game, seconds: number) => { const m = new Map([[0, emptyInput()]]); for (let i = 0; i < seconds * 60; i++) { g.step(1 / 60, m); g.events.length = 0; } };

// --- adult vs stiff sponge, slightly off-centre: slides around, sponge barely moves ---
{
  const { g, p, plant, x0, z0 } = scene('vauxia', 1.3, 'anomalocaris', 1, 0.25);
  let maxBend = 0, minSpeed = Infinity, maxDev = 0;
  swim(g, p, 6, (t) => { maxBend = Math.max(maxBend, Math.hypot(plant.bx, plant.bz)); if (t > 0.6) minSpeed = Math.min(minSpeed, Math.hypot(p.vel.x, p.vel.z)); maxDev = Math.max(maxDev, Math.abs(p.pos.z - z0)); });
  if (S) console.log(p.pos, plant);
  check('adult gets past a sponge', p.pos.x > x0 + 4, `x=${p.pos.x.toFixed(1)} (plant at ${x0})`);
  check('adult was deflected sideways around it', maxDev > plant.R * 0.8 + bodyRadius(p) * 0.5, `dev=${maxDev.toFixed(2)} R=${plant.R.toFixed(2)} ra=${bodyRadius(p).toFixed(2)}`);
  // Measured against the sponge's own lean limit, not against a fraction of its height. The claim
  // is "only giants push it over", and an adult leaving it half-bent is that claim holding — the
  // giant case below pins it at the limit. As a fraction of height this read 12%, which was tuned
  // when the roster was flat and every adult was about the size of the sponge; at its natural
  // length an Anomalocaris is twice the sponge's height and of course shoulders it further over.
  check('an adult does not push a sponge over', maxBend < plant.maxB * 0.8, `maxBend=${maxBend.toFixed(3)} of limit ${plant.maxB.toFixed(2)}`);
  check('adult keeps moving (slides, no dead stop)', minSpeed > 1.0, `minSpeed=${minSpeed.toFixed(2)}`);
}
// --- adult straight through soft algae: bends over, slows a little, springs back ---
{
  const { g, p, plant, x0 } = scene('thalli', 1.2, 'anomalocaris', 1, 0.05);
  let maxBend = 0, minSpeed = Infinity, freeSpeed = 0, bendDirX = 0;
  swim(g, p, 6, (t) => { const sp = Math.hypot(p.vel.x, p.vel.z); freeSpeed = Math.max(freeSpeed, sp); if (t > 0.6) minSpeed = Math.min(minSpeed, sp); const b = Math.hypot(plant.bx, plant.bz); if (b > maxBend) { maxBend = b; bendDirX = plant.bx; } });
  check('adult swims through algae', p.pos.x > x0 + 4, `x=${p.pos.x.toFixed(1)}`);
  check('algae folds over substantially', maxBend > plant.H * 0.35, `maxBend=${maxBend.toFixed(2)} H=${plant.H.toFixed(2)}`);
  check('algae bends away from the swimmer (+x)', bendDirX > 0, `bx at max=${bendDirX.toFixed(2)}`);
  // At its worst instant, pushing through the middle of a frond. How much of an animal's speed that
  // costs is a matter of how big the animal is — see the gradient below, which is the claim worth
  // testing — so what is asked here is only that the plant is felt and is not a wall.
  check('algae slows the swimmer without stopping it', minSpeed < freeSpeed * 0.97 && minSpeed > freeSpeed * 0.35, `min=${minSpeed.toFixed(2)} free=${freeSpeed.toFixed(2)}`);
  const active0 = g.world.activeFlora.length;
  settle(g, 6);
  check('algae springs back to rest and deactivates', !plant.active && Math.hypot(plant.bx, plant.bz) < 1e-3 && g.world.activeFlora.length === 0, `active ${active0} -> ${g.world.activeFlora.length} bend=${Math.hypot(plant.bx, plant.bz).toExponential(1)}`);
}
// --- larva vs sponge: nudged around, sponge does not care ---
{
  const { g, p, plant, x0, z0 } = scene('vauxia', 1.3, 'waptia', 0.25, 0.1);
  p.pos.y = plant.pos.y + plant.H * 0.5;
  let maxBend = 0, maxDev = 0;
  swim(g, p, 8, () => { maxBend = Math.max(maxBend, Math.hypot(plant.bx, plant.bz)); maxDev = Math.max(maxDev, Math.abs(p.pos.z - z0)); });
  check('larva slides around a sponge', p.pos.x > x0 + 2 && maxDev > plant.R * 0.5, `x=${p.pos.x.toFixed(1)} dev=${maxDev.toFixed(2)}`);
  check('larva cannot bend a sponge', maxBend < 0.02, `maxBend=${maxBend.toFixed(4)}`);
}
// --- giant vs sponge: pushes it right over and ploughs through ---
{
  const { g, p, plant, x0 } = scene('vauxia', 1.3, 'anomalocaris', 3.0, 0.0);
  let maxBend = 0;
  swim(g, p, 5, () => { maxBend = Math.max(maxBend, Math.hypot(plant.bx, plant.bz)); });
  check('giant ploughs through a sponge', p.pos.x > x0 + 4, `x=${p.pos.x.toFixed(1)}`);
  check('sponge is pushed over to its limit', maxBend > plant.H * FLORA_PHYS.vauxia.maxLean * 0.85, `maxBend=${maxBend.toFixed(2)} limit=${(plant.H * FLORA_PHYS.vauxia.maxLean).toFixed(2)}`);
}
// --- small swimmer brushing a tuft: tuft folds, swimmer barely notices ---
{
  const { g, p, plant, x0 } = scene('tuft', 0.6, 'waptia', 0.25, 0.0);
  p.pos.y = plant.pos.y + plant.H * 0.7;
  let maxBend = 0, minSpeed = Infinity, freeSpeed = 0;
  swim(g, p, 6, (t) => { const sp = Math.hypot(p.vel.x, p.vel.z); freeSpeed = Math.max(freeSpeed, sp); if (t > 0.6) minSpeed = Math.min(minSpeed, sp); maxBend = Math.max(maxBend, Math.hypot(plant.bx, plant.bz)); }, plant.pos.y + plant.H * 0.7);
  check('larva passes a tuft', p.pos.x > x0 + 2, `x=${p.pos.x.toFixed(1)}`);
  check('tuft folds', maxBend > plant.H * 0.3, `maxBend=${maxBend.toFixed(2)} H=${plant.H.toFixed(2)}`);
  check('tuft only mildly slows a larva', minSpeed > freeSpeed * 0.5, `min=${minSpeed.toFixed(2)} free=${freeSpeed.toFixed(2)}`);
}
// --- what a plant costs you depends on how big you are ---
// The two numbers above are one animal's place on a curve, and the curve is the actual contract: a
// soft frond is a thicket to a larva and a nuisance to an adult, and a stiff sponge is immovable to
// a larva and gets shouldered flat by anything big. Stated as a gradient it holds whatever lengths
// the roster is playing at — which is why the absolute thresholds these replace went stale the day
// the Cambrian went to its natural sizes.
{
  const scales = [0.25, 0.5, 1, 1.5];
  const through = scales.map((sc) => {
    const { g, p } = scene('thalli', 1.2, 'anomalocaris', sc, 0.05);
    let min = Infinity, free = 0;
    swim(g, p, 6, (t) => { const sp = Math.hypot(p.vel.x, p.vel.z); free = Math.max(free, sp); if (t > 0.6) min = Math.min(min, sp); });
    return min / free;
  });
  check('a bigger body keeps more of its speed through an alga', through.every((v, i) => i === 0 || v > through[i - 1]),
    scales.map((sc, i) => `${sc}x:${(through[i] * 100).toFixed(0)}%`).join(' '));
  check('...and an alga is felt by all of them', through.every((v) => v < 0.9) && through[0] < through[through.length - 1] * 0.7,
    `${(through[0] * 100).toFixed(0)}% for a larva against ${(through[through.length - 1] * 100).toFixed(0)}% for a big one`);
  const bend = scales.map((sc) => {
    const { g, p, plant } = scene('vauxia', 1.3, 'anomalocaris', sc, 0.25);
    let b = 0;
    swim(g, p, 6, () => { b = Math.max(b, Math.hypot(plant.bx, plant.bz)); });
    return b / plant.maxB;
  });
  check('a bigger body bends a stiff sponge further', bend.every((v, i) => i === 0 || v >= bend[i - 1]),
    scales.map((sc, i) => `${sc}x:${(bend[i] * 100).toFixed(0)}%`).join(' '));
  check('...and only the big end of the roster lays it flat', bend[0] < 0.05 && bend[bend.length - 1] > 0.95,
    `${(bend[0] * 100).toFixed(0)}% for a larva, ${(bend[bend.length - 1] * 100).toFixed(0)}% for a big one`);
}

// --- full world: cost of the plant pass ---
{
  const g = new Game('rise', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 5052026);
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 120; i++) { g.step(1 / 60, m); g.events.length = 0; }
  const t0 = performance.now(); const N = 600;
  let maxActive = 0;
  for (let i = 0; i < N; i++) { g.step(1 / 60, m); g.events.length = 0; maxActive = Math.max(maxActive, g.world.activeFlora.length); }
  const ms = (performance.now() - t0) / N;
  console.log(`full world: ${g.actors.length} actors, ${g.world.flora.length} plants, step ${ms.toFixed(2)} ms, up to ${maxActive} plants bent at once`);
  check('step stays cheap', ms < 8, `${ms.toFixed(2)} ms/step`);
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
