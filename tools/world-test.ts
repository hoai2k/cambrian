/** The endless sea: shore, biome bands, deterministic streaming, teleport and radar. */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { distXZ } from '../src/shared/math';
import { BIOMES, biomeAt, biomeWeights, CHUNK, chunkCoord, generateChunk, nurseryAt, sampleHeight, shoreDistance, shoreZ, SIM_RADIUS, SURFACE_Y, type Biome } from '../src/sim/world';

let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { g.step(1 / 60, m); g.events.length = 0; } };

// --- the shore is a wall the seabed climbs over; the sea beyond it is open ---
{
  const z0 = shoreZ(0);
  check('nursery 0 sits at the origin, off the shore', Math.abs(nurseryAt(0).x) < 1e-6 && Math.abs(shoreDistance(0, nurseryAt(0).z) - 88) < 1e-6, `nursery=(${nurseryAt(0).x.toFixed(1)},${nurseryAt(0).z.toFixed(1)}) shore z=${z0.toFixed(1)}`);
  check('seabed reaches the surface at the waterline', sampleHeight(0, z0) >= SURFACE_Y - 3, `h=${sampleHeight(0, z0).toFixed(1)} surface=${SURFACE_Y}`);
  check('seabed is swimmable 30 units out', sampleHeight(0, z0 - 30) < SURFACE_Y - 8, `h=${sampleHeight(0, z0 - 30).toFixed(1)}`);
  check('the basin is deep', sampleHeight(0, z0 - 1000) < -8, `h=${sampleHeight(0, z0 - 1000).toFixed(1)}`);
  let wander = 0;
  for (let x = -3000; x <= 3000; x += 50) wander = Math.max(wander, Math.abs(shoreZ(x) - 88));
  check('the coast wanders but stays a coast', wander > 15 && wander < 70, `max offset ${wander.toFixed(1)}`);
  const weights = biomeWeights(120, -300);
  let sum = 0; for (const b of BIOMES) sum += weights[b];
  check('biome weights sum to one', Math.abs(sum - 1) < 1e-6, `sum=${sum.toFixed(6)}`);
}

// --- every biome exists, and the bands follow distance from the shore ---
{
  const counts = Object.fromEntries(BIOMES.map((b) => [b, 0])) as Record<Biome, number>;
  const byBand: Record<string, Record<Biome, number>> = {};
  let n = 0;
  for (let x = -2600; x <= 2600; x += 40) for (let s = 10; s <= 1900; s += 30) {
    const z = shoreZ(x) - s;
    const b = biomeAt(x, z); counts[b]++; n++;
    const band = s < 105 ? 'near' : s < 660 ? 'shelf' : s < 800 ? 'edge' : 'deep';
    (byBand[band] ??= Object.fromEntries(BIOMES.map((k) => [k, 0])) as Record<Biome, number>)[b]++;
  }
  const pct = (b: Biome) => (counts[b] / n * 100).toFixed(1) + '%';
  console.log('  biome mix:', BIOMES.map((b) => `${b} ${pct(b)}`).join(' · '));
  check('all nine biomes occur', BIOMES.every((b) => counts[b] > 0), BIOMES.filter((b) => counts[b] === 0).join(',') || 'none missing');
  check('no biome dominates the sea', BIOMES.every((b) => counts[b] / n < 0.5), `max ${Math.max(...BIOMES.map((b) => counts[b] / n * 100)).toFixed(0)}%`);
  const near = byBand.near, shelf = byBand.shelf, deep = byBand.deep;
  const tot = (r: Record<Biome, number>) => Object.values(r).reduce((a, b) => a + b, 0);
  check('near the shore it is shallows and nurseries', (near.shallows + near.nursery) / tot(near) > 0.85, `${((near.shallows + near.nursery) / tot(near) * 100).toFixed(0)}%`);
  check('the shelf band is the mosaic', (shelf.shelf + shelf.forest + shelf.boulders + shelf.flats + shelf.channel) / tot(shelf) > 0.9, `${((shelf.shelf + shelf.forest + shelf.boulders + shelf.flats + shelf.channel) / tot(shelf) * 100).toFixed(0)}%`);
  check('the escarpment runs between shelf and basin', byBand.edge.escarpment / tot(byBand.edge) > 0.2, `${(byBand.edge.escarpment / tot(byBand.edge) * 100).toFixed(0)}% of the 660–800 band`);
  check('the deep is mostly basin', deep.basin / tot(deep) > 0.5, `${(deep.basin / tot(deep) * 100).toFixed(0)}%`);
  check('deep sponge gardens and mounds break the basin up', (deep.forest + deep.boulders) / tot(deep) > 0.05, `${((deep.forest + deep.boulders) / tot(deep) * 100).toFixed(0)}%`);
}

// --- chunks are deterministic and stream with the player ---
{
  const a = generateChunk(77, 3, -5), b = generateChunk(77, 3, -5);
  check('a chunk is the same every time it is generated', a.flora.length === b.flora.length && a.boulders.length === b.boulders.length && a.flora.every((f, i) => f.pos.x === b.flora[i].pos.x && f.kind === b.flora[i].kind), `${a.flora.length} plants, ${a.boulders.length} rocks`);
  const c = generateChunk(78, 3, -5);
  check('a different seed gives a different chunk', c.flora.length !== a.flora.length || c.flora.some((f, i) => f.pos.x !== a.flora[i]?.pos.x), `${c.flora.length} vs ${a.flora.length} plants`);
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
  const p = g.players[0];
  const startChunks = g.world.chunks.size;
  const inRange = [...g.world.chunks.values()].every((ch) => Math.hypot(ch.x - p.pos.x, ch.z - p.pos.z) < SIM_RADIUS + CHUNK);
  check('the match starts with the nursery region loaded', startChunks >= 20 && inRange, `${startChunks} chunks, all within ${SIM_RADIUS + CHUNK}`);
  // sprint straight out to sea for a long way
  p.spawnProtect = 0;
  const z0 = p.pos.z;
  run(g, { ...emptyInput(), my: 1, burst: 1, camYaw: Math.PI }, 60 * 90);
  const travelled = z0 - p.pos.z;
  check('the player can swim far beyond the old arena', travelled > 300, `${travelled.toFixed(0)} units in 90 s`);
  const nearNow = [...g.world.chunks.values()].filter((ch) => Math.hypot(ch.x - p.pos.x, ch.z - p.pos.z) < SIM_RADIUS).length;
  const want = Math.PI * SIM_RADIUS * SIM_RADIUS / (CHUNK * CHUNK);
  check('chunks around the player are loaded', nearNow > want * 0.8, `${nearNow} loaded near, ~${want.toFixed(0)} expected`);
  const stale = [...g.world.chunks.values()].filter((ch) => Math.hypot(ch.x - p.pos.x, ch.z - p.pos.z) > SIM_RADIUS + CHUNK * 3).length;
  check('chunks left behind are released', stale === 0, `${stale} stale of ${g.world.chunks.size}`);
  check('the player chunk itself is loaded', g.world.has(chunkCoord(p.pos.x), chunkCoord(p.pos.z)), `at (${p.pos.x.toFixed(0)}, ${p.pos.z.toFixed(0)})`);
  const alive = g.actors.filter(isAlive);
  const near = alive.filter((a) => a !== p && distXZ(a.pos, p.pos) < 200).length;
  check('the ecosystem followed the player', near > 25, `${near} creatures within 200 of a player ${travelled.toFixed(0)} units from home (${alive.length} alive in all)`);
  const giants = alive.filter((a) => a.controller === 'giant' || a.controller === 'shadow');
  check('the giants came too', giants.length === 4 && giants.every((gg) => distXZ(gg.pos, p.pos) < 600), giants.map((gg) => `${gg.creature}@${distXZ(gg.pos, p.pos).toFixed(0)}`).join(' '));
  const far = alive.filter((a) => (a.controller === 'ambient' || a.controller === 'swarm') && distXZ(a.pos, p.pos) > 320).length;
  check('wild creatures left far behind were dropped', far === 0, `${far} far wild creatures`);
}

// --- the shore stops you; nothing climbs the beach ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 5);
  const p = g.players[0]; p.spawnProtect = 0;
  run(g, { ...emptyInput(), my: 1, burst: 1, camYaw: 0 }, 60 * 40);   // camYaw 0 → forward is +z, toward the shore
  const s = shoreDistance(p.pos.x, p.pos.z);
  check('the shore is a wall', s > 4 && s < 12, `stopped ${s.toFixed(1)} from the waterline, y=${p.pos.y.toFixed(1)}`);
  check('still under water at the wall', p.pos.y < SURFACE_Y, `y=${p.pos.y.toFixed(1)}`);
}

// --- teleport: home, to another player, cooldown, not while dead ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }, { creature: 'waptia', device: 'keyboard2', ready: true }], 8);
  const [a, b] = g.players;
  a.spawnProtect = 0; b.spawnProtect = 0;
  b.pos = { x: 400, y: 8, z: -900 }; b.vel = { x: 0, y: 0, z: 0 };
  run(g, emptyInput(), 5);
  const opts = g.teleportOptions(0);
  check('teleport offers home and the other player', opts.length === 2 && opts[0].dest === 'home' && opts[1].dest === 1, opts.map((o) => o.label).join(' | '));
  const ok = g.teleport(0, 1);
  check('teleport to a player lands beside them', ok && distXZ(a.pos, b.pos) < lengthOf(b) * 2 + 5, `d=${distXZ(a.pos, b.pos).toFixed(1)} ok=${ok}`);
  check('arrival is protected and loaded', a.spawnProtect > 0 && g.world.has(chunkCoord(a.pos.x), chunkCoord(a.pos.z)), `protect=${a.spawnProtect.toFixed(1)}`);
  check('teleport has a cooldown', !g.teleport(0, 'home') && a.teleportCd > 0, `cd=${a.teleportCd.toFixed(0)}`);
  a.teleportCd = 0;
  check('teleport home returns to the nursery', g.teleport(0, 'home') && distXZ(a.pos, a.home) < 12, `d=${distXZ(a.pos, a.home).toFixed(1)}`);
  a.teleportCd = 0; a.state = 'dead';
  check('no teleport while dead', !g.teleport(0, 1), `state=${a.state}`);
}

// --- radar: players anywhere, threats within reach, home and shore bearings ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'anomalocaris', device: 'keyboard2', ready: true }], 12);
  const [a, b] = g.players;
  b.pos = { x: a.pos.x + 2000, y: 8, z: a.pos.z - 3000 };
  run(g, emptyInput(), 2);
  const blips = g.radarFor(0, 60);
  const player = blips.find((r) => r.kind === 'player');
  check('another player shows however far away', !!player && player.distance > 3000, `d=${player?.distance.toFixed(0)}`);
  check('home and shore bearings are present', blips.some((r) => r.kind === 'home') && blips.some((r) => r.kind === 'shore'), blips.map((r) => r.kind).join(','));
  const threats = blips.filter((r) => r.kind === 'threat' || r.kind === 'giant');
  check('only bigger things show as contacts', threats.every((r) => { const o = g.byId(r.id)!; return lengthOf(o) > lengthOf(a) * 1.2 || r.hunting; }), `${threats.length} contacts`);
  check('nothing tiny is on the radar', !blips.some((r) => (r.kind === 'threat' || r.kind === 'giant') && lengthOf(g.byId(r.id)!) < lengthOf(a)), '');
}

// --- respawn: near another player, in a nursery ---
{
  const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'marrella', device: 'keyboard2', ready: true }], 33);
  const [a, b] = g.players;
  b.pos = { x: 1560, y: 6, z: shoreZ(1560) - 200 }; b.vel = { x: 0, y: 0, z: 0 }; b.spawnProtect = 99;
  g.world.loadAround(b.pos);
  a.pos = { x: -900, y: 6, z: shoreZ(-900) - 300 }; a.spawnProtect = 0; a.hp = 0; a.state = 'dead'; a.deathY = 6;
  run(g, emptyInput(), 60 * 4);
  check('a dead player respawns', isAlive(a), `state=${a.state}`);
  check('...in a nursery near the other player', distXZ(a.pos, b.pos) < 400 && distXZ(a.pos, a.home) < 12, `d(other)=${distXZ(a.pos, b.pos).toFixed(0)} d(home)=${distXZ(a.pos, a.home).toFixed(1)} home=(${a.home.x.toFixed(0)},${a.home.z.toFixed(0)})`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall world tests passed');
process.exit(failed ? 1 : 0);
