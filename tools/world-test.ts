/** The endless sea: shore, biome bands, deterministic streaming, teleport and radar. */
import { Game, radarRange } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf } from '../src/sim/actors';
import { distXZ } from '../src/shared/math';
import { BIOMES, biomeAt, biomeWeights, CHUNK, chunkCoord, generateChunk, landmarkAt, landmarkCell, LANDMARK_CELL, nurseryAt, resolveStatic, sampleHeight, shoreDistance, shoreZ, SIM_RADIUS, SURFACE_Y, type Biome, type Boulder, type LandmarkKind } from '../src/sim/world';

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
  // Sprint straight out to sea for a long way. Held invulnerable: this is a test of streaming, and
  // a player eaten by a giant halfway would respawn at the nursery and measure nothing.
  const z0 = p.pos.z;
  const forward = new Map([[0, { ...emptyInput(), my: 1, burst: 1, camYaw: Math.PI }]]);
  for (let i = 0; i < 60 * 90; i++) { p.spawnProtect = 1; g.step(1 / 60, forward); g.events.length = 0; }
  p.spawnProtect = 0;
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
  // The dial carries one predator and one food patch, not the census: only a body already hunting
  // this player earns a second contact.
  check('at most one predator that is not hunting you', threats.filter((r) => !r.hunting).length <= 1, `${threats.filter((r) => !r.hunting).length}`);
  check('at most one food patch', blips.filter((r) => r.kind === 'food').length <= 1, `${blips.filter((r) => r.kind === 'food').length}`);
  check('the predator shown is the nearest one', threats.filter((r) => !r.hunting).every((r) => {
    const shown = r.distance;
    return !g.actors.some((o) => o.controller !== 'player' && o.id !== r.id && distXZ(o.pos, a.pos) < shown
      && distXZ(o.pos, a.pos) <= 60 && lengthOf(o) / lengthOf(a) >= 1.4 && o.state !== 'dead');
  }), '');
}

// --- radar reach follows the body: a small animal reads a small patch of sea ---
{
  const g = new Game('reef', [{ creature: 'waptia', device: 'keyboard', ready: true }], 5);
  const a = g.players[0];
  const before = a.scale;
  a.scale = 0.25; const small = radarRange(a);
  a.scale = 2.6; const big = radarRange(a);
  a.scale = before;
  check('reach grows with the creature', big > small * 2.5, `${small.toFixed(0)} m -> ${big.toFixed(0)} m`);
  check('a hatchling still sees its own neighbourhood', small > 20 && small < 45, `${small.toFixed(0)} m`);
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


// --- landmarks: seeded, sparse, owned by one chunk, and built as structures ---
{
  const seed = 33;
  const kinds = new Map<LandmarkKind, number>();
  let cells = 0, placed = 0;
  for (let lx = -14; lx <= 14; lx++) for (let lz = -14; lz <= 1; lz++) {
    cells++;
    const m = landmarkAt(seed, lx, lz);
    if (!m) continue;
    placed++;
    kinds.set(m.kind, (kinds.get(m.kind) ?? 0) + 1);
  }
  check('landmarks are sparse, not everywhere', placed > cells * 0.2 && placed < cells * 0.6, `${placed}/${cells} cells`);
  check('all three kinds occur', kinds.size === 3, [...kinds].map(([k, n]) => `${k}:${n}`).join(' '));

  // the same cell always yields the same landmark, whatever order it is asked for in
  const one = landmarkAt(seed, 3, -9), two = landmarkAt(seed, 3, -9);
  check('landmark placement is deterministic', JSON.stringify(one) === JSON.stringify(two), one ? one.kind : 'empty cell');
  check('a different seed moves them', JSON.stringify(landmarkAt(seed + 1, 3, -9)) !== JSON.stringify(one), '');

  // find one and check the chunk that contains it is the only one that builds it
  let found: ReturnType<typeof landmarkAt>;
  for (let lz = -14; lz < 0 && !found; lz++) for (let lx = -14; lx <= 14 && !found; lx++) { const m = landmarkAt(seed, lx, lz); if (m && m.kind === 'arch') found = m; }
  check('the sea has an arch in it somewhere', !!found, found ? `at (${found.pos.x.toFixed(0)},${found.pos.z.toFixed(0)})` : 'none found');
  if (found) {
    const cx = chunkCoord(found.pos.x), cz = chunkCoord(found.pos.z);
    const own = generateChunk(seed, cx, cz);
    check('one chunk owns it', own.landmarks.length === 1 && own.landmarks[0].kind === 'arch', `${own.landmarks.length} here`);
    let neighbours = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) neighbours += generateChunk(seed, cx + dx, cz + dz).landmarks.length;
    check('...and no neighbour builds it again', neighbours === 0, `${neighbours} duplicates`);
    check('the far view keeps its silhouette', generateChunk(seed, cx, cz, 'far').landmarks.length === 1, '');
    const raised = own.boulders.filter((b) => b.floor !== undefined);
    check('the arch has a span you can pass under', raised.length >= 3, `${raised.length} raised pieces`);
    // the span must not block a creature swimming through at seabed level
    const scratch: Boulder[] = [];
    const world = { boulderHash: { query: (_x: number, _z: number, _r: number, out: Boulder[]) => { out.length = 0; for (const b of own.boulders) out.push(b); return out; } } };
    const at = { x: found.pos.x, y: sampleHeight(found.pos.x, found.pos.z) + 1, z: found.pos.z };
    const before = { ...at };
    resolveStatic(world as never, at, 0.4, scratch);
    check('...and the gap is actually open at the floor', Math.hypot(at.x - before.x, at.z - before.z) < 1e-6, `pushed ${Math.hypot(at.x - before.x, at.z - before.z).toFixed(2)}`);
  }

  // landmark cells are coarser than chunks, so a landmark is a landmark and not scenery
  check('landmarks are spread on their own coarse grid', LANDMARK_CELL >= CHUNK * 4 && landmarkCell(LANDMARK_CELL * 2 + 1) === 2, `cell=${LANDMARK_CELL}`);
}

// --- the bones: a feast that runs out, and shows up on the radar ---
{
  const seed = 33;
  let bones: ReturnType<typeof landmarkAt>;
  for (let lz = -14; lz < 0 && !bones; lz++) for (let lx = -14; lx <= 14 && !bones; lx++) { const m = landmarkAt(seed, lx, lz); if (m && m.kind === 'bones') bones = m; }
  if (!bones) { check('the deep has a bones in it', false, 'none found'); }
  else {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], seed);
    const a = g.players[0];
    a.pos = { x: bones.pos.x, y: sampleHeight(bones.pos.x, bones.pos.z) + 2, z: bones.pos.z };
    g.world.loadAround(a.pos);
    check('the bones is in the loaded world', g.world.landmarks.some((m) => m.kind === 'bones'), `${g.world.landmarks.length} landmarks loaded`);
    check('...and on the radar as a landmark', g.radarFor(0, 200).some((r) => r.kind === 'landmark'), '');
    const before = a.nutrition + a.tier * 1000;
    run(g, emptyInput(), 60 * 3);
    const after = g.players[0].nutrition + g.players[0].tier * 1000;
    check('feeding at a bones grows you', after > before, `+${(after - before).toFixed(0)}`);
    check('...and strips it', g.bonesLeft(bones.id) < 0.9, `${(g.bonesLeft(bones.id) * 100).toFixed(0)}% left`);
    check('the visit is recorded', g.discovery.landmarks.has('bones'), [...g.discovery.landmarks].join(','));
  }
}

// --- co-op revive: a team-mate close enough gets you up; alone, you respawn ---
{
  const mk = () => {
    const g = new Game('rise', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'marrella', device: 'keyboard2', ready: true }], 7);
    const [a, b] = g.players;
    b.spawnProtect = 99; a.spawnProtect = 0;
    return { g, a, b };
  };
  // team-mate in reach but not yet there: the window opens and holds them past the usual three
  // seconds; then the team-mate arrives and the touch brings them back with their tier intact
  {
    const { g, a, b } = mk();
    a.tier = 2; a.hp = 0; a.state = 'dead'; a.deathY = a.pos.y; a.vel = { x: 0, y: 0, z: 0 };
    b.pos = { x: a.pos.x + 40, y: a.pos.y, z: a.pos.z };
    const down = { ...a.pos };
    run(g, emptyInput(), 6);
    check('a downed team-mate is revivable', g.reviveWindow(a) > 0, `${g.reviveWindow(a).toFixed(1)} s left`);
    run(g, emptyInput(), 60 * 4);
    check('...and is still down after the normal respawn would have fired', !isAlive(a) && a.respawnT > 3, `t=${a.respawnT.toFixed(1)} state=${a.state}`);
    // The body must still be where it fell: a corpse drifts up with the current, and a downed
    // player who did that would float out of reach of the ally swimming down to them.
    check('...and has not drifted away while waiting', distXZ(a.pos, down) < 3 && Math.abs(a.pos.y - down.y) < 3, `drift=${distXZ(a.pos, down).toFixed(2)} dy=${(a.pos.y - down.y).toFixed(2)}`);
    b.pos = { ...down };
    run(g, emptyInput(), 2);
    check('...and the rescue is a dwell, not an instant touch', !isAlive(a) && g.reviveProgress(a) > 0, `progress=${g.reviveProgress(a).toFixed(2)}`);
    run(g, emptyInput(), 60);
    check('...and holding station gets them up', isAlive(a), `state=${a.state}`);
    check('...keeping the tier they had', a.tier === 2, `tier=${a.tier}`);
    check('...with the death timer cleared', a.respawnT === 0, `t=${a.respawnT.toFixed(2)}`);
  }
  // nobody near: no window, and the ordinary three-second respawn with its tier loss
  {
    const { g, a, b } = mk();
    a.tier = 2; a.hp = 0; a.state = 'dead'; a.deathY = a.pos.y;
    b.pos = { x: a.pos.x + 600, y: a.pos.y, z: a.pos.z };
    run(g, emptyInput(), 6);
    check('nobody in reach means no revive window', g.reviveWindow(a) === 0, '');
    run(g, emptyInput(), 60 * 4);
    check('...so they respawn as usual', isAlive(a), `state=${a.state}`);
    check('...and pay a tier for it', a.tier === 1, `tier=${a.tier}`);
  }
  // biting the body instead of waiting beside it feeds you: the button decides which you get
  {
    const { g, a, b } = mk();
    a.tier = 2; a.hp = 0; a.state = 'dead'; a.deathY = a.pos.y; a.vel = { x: 0, y: 0, z: 0 };
    const bite: InputFrame = { ...emptyInput(), light: true };
    const m = new Map([[1, bite]]);
    let ate = false;
    // held right on the body, the way a player nosing into it would be
    for (let i = 0; i < 180 && !ate && !isAlive(a); i++) { b.pos = { ...a.pos }; g.step(1 / 60, m); g.events.length = 0; if (a.eaten > 0) ate = true; }
    check('a team-mate who bites the body eats it instead', ate && !isAlive(a), `eaten=${a.eaten.toFixed(2)} state=${a.state}`);
  }

  // versus never opens the window
  {
    const g = new Game('frenzy', [{ creature: 'waptia', device: 'keyboard', ready: true }, { creature: 'marrella', device: 'keyboard2', ready: true }], 7);
    const [a, b] = g.players;
    a.hp = 0; a.state = 'dead'; a.deathY = a.pos.y; a.spawnProtect = 0;
    b.pos = { x: a.pos.x + 1.5, y: a.pos.y, z: a.pos.z }; b.spawnProtect = 99;
    run(g, emptyInput(), 6);
    check('versus has no revive', g.reviveWindow(a) === 0, `mode=${g.mode}`);
  }
}

// --- discovery: biomes and Apex species are recorded as they happen ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 5);
  const a = g.players[0];
  run(g, emptyInput(), 4);
  check('the starting biome is recorded', g.discovery.biomes.size > 0, [...g.discovery.biomes].join(','));
  const deepZ = shoreZ(0) - 1200;
  a.pos = { x: 0, y: 4, z: deepZ }; g.world.loadAround(a.pos);
  run(g, emptyInput(), 4);
  check('...and so is a biome swum to later', g.discovery.biomes.has(biomeAt(0, deepZ)), [...g.discovery.biomes].join(','));
  check('nothing is at Apex yet', g.discovery.apex.size === 0, '');
  a.tier = 4;
  run(g, emptyInput(), 4);
  check('reaching Apex records the species', g.discovery.apex.has('anomalocaris'), [...g.discovery.apex].join(','));
}

console.log(failed ? `\n${failed} FAILED` : '\nall world tests passed');
process.exit(failed ? 1 : 0);
