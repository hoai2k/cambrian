/**
 * Devonian Domination: the era pack, its rung bands, standing, breathing, dead water, shore reach,
 * armour and determinism, all headless. Run: npm run devonian
 *
 * The era is selected before the simulation modules are imported, because those read ACTIVE_ERA
 * at module top (the same order the /devonian/ entry page uses).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectEra } from '../src/content';
import { DEVONIAN, DEVONIAN_SHIPPED } from '../src/content/devonian';
import { DEVONIAN_SAMPLES } from '../src/content/devonian/sfx';
import { createAssetPaths } from '../src/content/asset-paths';

selectEra(DEVONIAN);
const { Game } = await import('../src/sim/game');
const { RULES } = await import('../src/sim/era-rules');
const { stateFor, devActor, stageScale, ADULT_STAGE, PRIME_STAGE, STAGE_AT, HOLD_TO_WIN } = await import('../src/sim/devonian/state');
const { coverAt } = await import('../src/sim/world');
const { applyScaleStats, bandOf, isAlive, lengthOf } = await import('../src/sim/actors');
const { PLAYABLE } = await import('../src/sim/creatures');
const { creature } = await import('../src/sim/creatures');
const { emptyInput } = await import('../src/sim/types');
const { shoreZ, shoreDistance, SURFACE_Y, generateChunk, biomeAt, nurseryAt, chunkCoord, LOG_SHORE_RANGE, groundHeight } = await import('../src/sim/world');
type FloraKind = import('../src/sim/world').FloraKind;
type Biome = import('../src/sim/world').Biome;
type InputFrame = import('../src/sim/types').InputFrame;
type Mode = import('../src/sim/types').Mode;
import { heading } from '../src/shared/math';
import { wrapAngle } from '../src/shared/math';
import { isCoop } from '../src/sim/types';
type CreatureId = import('../src/sim/creatures').CreatureId;

const DT = 1 / 60;
/** Step and drain the event queue as the renderer would. */
const tick = (g: InstanceType<typeof Game>, inputs: Map<number, InputFrame>) => { g.step(DT, inputs); g.events.length = 0; };
let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };

// ---- the pack ----
ok(DEVONIAN.creatures.length === 21, 'roster is the 21 subjects of the brief');
ok(DEVONIAN.modes.map((m) => m.id).join() === 'rise,hunted,reef', 'the same three modes as the Cambrian, Rise first');
for (const r of [1, 2, 3, 4]) ok(DEVONIAN.creatures.some((c) => c.rung === r), `rung ${r} has at least one animal`);
const paths = createAssetPaths(DEVONIAN);
for (const id of DEVONIAN_SHIPPED) {
  for (const p of [paths.model(id), paths.model(id, 1), paths.portrait(id, 'select'), paths.portrait(id, 'thumb'), paths.portrait(id, 'card')]) ok(fs.existsSync(`public/${p}`), `${p} delivered`);
  ok(fs.statSync(`public/${paths.model(id)}`).size === DEVONIAN.assets.modelBytes[id as CreatureId], `${id} model bytes match the pack`);
}
for (const files of Object.values(DEVONIAN_SAMPLES)) for (const f of files) ok(fs.existsSync(`public/assets/${f.replace(/^devonian\//, 'devonian/sfx/')}.mp3`), `${f} sample exists`);
ok(fs.existsSync(`public/${DEVONIAN.assets.illustration}`) && fs.existsSync(`public/${DEVONIAN.assets.emblem}`), 'brand art present');
const shipped = JSON.parse(fs.readFileSync('tools/devonian/shipped.json', 'utf8')).creatures as string[];
ok(shipped.every((id) => DEVONIAN_SHIPPED.includes(id)) && DEVONIAN_SHIPPED.length === shipped.length, `asset-sizes.json covers every shipped specimen (${shipped.length}); regenerate it when a delivery lands`);
// Every animal carries the everyday group it belongs to, plus the sentence that explains the
// group — that is what the HUD, the select card and the viewer show beside an unfamiliar genus.
// See docs/research/devonian-classification.md.
for (const c of DEVONIAN.creatures) {
  ok(!!c.kind && c.kind.length <= 20, `${c.id} has a short everyday group (${c.kind ?? 'missing'})`);
  ok(!!c.kindNote && c.kindNote.length > 40, `${c.id}'s group is explained in a sentence`);
}
for (const c of DEVONIAN.creatures) {
  const standIn = DEVONIAN.assets.standIns?.[c.id];
  if (DEVONIAN_SHIPPED.includes(c.id)) ok(!standIn, `${c.id} is delivered and uses its own model`);
  else ok(!!standIn && DEVONIAN_SHIPPED.includes(standIn) && fs.existsSync(`public/${paths.model(c.id)}`) && fs.existsSync(`public/${paths.model(c.id, 1)}`), `${c.id} is pending and stands in as ${standIn}`);
}
const opener = DEVONIAN.audio.music.find((t) => t.opening);
ok(opener && fs.existsSync(`public/${paths.music(opener.name)}`.replace('%20', ' ')), `the opening track is delivered (${opener?.name})`);
ok(RULES !== undefined && !RULES.growthByNutrition, 'Devonian rules active: growth is by standing, not nutrition');

// ---- the animals that take hold, and the clips their grip is owed ----
{
  const graspers = DEVONIAN.creatures.filter((c) => c.grasp).map((c) => c.id as string);
  const named = ['jaekelopterus', 'walliserops', 'furcaster', 'manticoceras', 'michelinoceras', 'palaeoisopus'];
  ok(named.every((id) => graspers.includes(id)) && graspers.length === named.length,
    `the Devonian graspers are the six the design names (${graspers.join(', ')})`);
  const queue = JSON.parse(fs.readFileSync('tools/attack-feeding-refinements.json', 'utf8')) as { id: string; reviewClips: string[]; grip?: string }[];
  for (const id of graspers) {
    const glb = `public/assets/devonian/creatures/${id}.glb`;
    if (!fs.existsSync(glb)) continue;                        // borrows a body: no clips of its own to owe
    const buf = fs.readFileSync(glb);
    const clips = (JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')).animations ?? []).map((a: { name: string }) => a.name) as string[];
    const q = queue.find((e) => e.id === id);
    ok(clips.includes('Grab') || (!!q && q.reviewClips.includes('Grab') && !!q.grip),
      `${id} either grabs on screen or is queued for the clip with its brief`);
  }
}

// ---- scenery: the coast is dressed with Devonian stand-ins, not Cambrian sponges ----
{
  const CAMBRIAN: FloraKind[] = ['vauxia', 'sac', 'choia', 'thalli', 'tuft', 'cushion', 'lettuce', 'spine', 'glass'];
  const DEVONIAN_KINDS: FloraKind[] = ['crinoid', 'stromatoporoid', 'tabulate', 'rugose', 'bryozoan', 'reed', 'log', 'lilyColumn', 'frondTower'];
  const seen: Partial<Record<FloraKind, number>> = {}, byBiome: Partial<Record<Biome, Set<FloraKind>>> = {}, biomes = new Set<Biome>();
  let plants = 0, logsFar = 0, cambrian = 0, crinoidCover = 0, moundCover = 0;
  const perBiome: Partial<Record<Biome, { chunks: number; plants: number }>> = {};
  const n0 = nurseryAt(0);
  // a band of chunks from the river mouth out to the open sea, and the nursery chunk itself
  const cells: [number, number][] = [[chunkCoord(n0.x), chunkCoord(n0.z)]];
  for (let cx = -6; cx <= 6; cx += 3) for (let cz = chunkCoord(shoreZ(0)); cz >= chunkCoord(shoreZ(0)) - 22; cz -= 2) cells.push([cx, cz]);
  for (const [cx, cz] of cells) {
    const c = generateChunk(5052026, cx, cz);
    biomes.add(c.biome);
    const pb = (perBiome[c.biome] ??= { chunks: 0, plants: 0 }); pb.chunks++; pb.plants += c.flora.length;
    for (const v of c.cover) { if (v.strength === 0.65) crinoidCover++; if (v.strength === 0.45 && v.maxLength < 1.2) moundCover++; }
    for (const f of c.flora) {
      plants++;
      seen[f.kind] = (seen[f.kind] ?? 0) + 1;
      const b = biomeAt(f.pos.x, f.pos.z);
      (byBiome[b] ??= new Set()).add(f.kind);
      if (CAMBRIAN.includes(f.kind)) cambrian++;
      if (f.kind === 'log' && shoreDistance(f.pos.x, f.pos.z) >= LOG_SHORE_RANGE) logsFar++;
      assert.ok(f.H > 0 && f.R > 0 && f.maxB > 0, `${f.kind} has a size`);
    }
  }
  ok(plants > 500, `the band of chunks places plants (${plants})`);
  ok(biomes.size >= 5, `the band crosses several biomes (${[...biomes].join(',')})`);
  ok(cambrian === 0, 'no Cambrian kind is placed in the Devonian');
  for (const k of DEVONIAN_KINDS) ok((seen[k] ?? 0) > 0, `${k} appears (${seen[k] ?? 0})`);
  ok(logsFar === 0, `driftwood stays within ${LOG_SHORE_RANGE} of the shore`);
  ok(byBiome.nursery?.has('reed') && byBiome.nursery?.has('log'), 'the river mouth has reeds and driftwood');
  ok(byBiome.forest?.has('crinoid'), 'the crinoid meadow has crinoids');
  const avg = (b: Biome) => (perBiome[b]?.plants ?? 0) / Math.max(1, perBiome[b]?.chunks ?? 0);
  // chunk centres never fall inside the 24-unit nursery disc, so the river mouth's own density is judged by the shallows around it
  const densest = Math.max(...(Object.keys(perBiome) as Biome[]).map(avg));
  ok(perBiome.basin && avg('basin') < densest / 10, `the open sea is near-empty (${avg('basin').toFixed(0)} plants a chunk against ${densest.toFixed(0)} at the coast)`);
  ok(avg('forest') > avg('shelf') * 2, `the crinoid meadow is thick against the mud shelf (${avg('forest').toFixed(0)} vs ${avg('shelf').toFixed(0)})`);
  const a = generateChunk(5052026, 1, chunkCoord(shoreZ(0)) - 4);
  generateChunk(99, -7, -30);
  const b = generateChunk(5052026, 1, chunkCoord(shoreZ(0)) - 4);
  ok(a.flora.length === b.flora.length && a.flora.every((f, i) => f.kind === b.flora[i].kind && f.pos.x === b.flora[i].pos.x && f.pos.z === b.flora[i].pos.z && f.scale === b.flora[i].scale), `chunk generation is deterministic (${a.flora.length} plants)`);
  console.log('devonian scenery per chunk:', Object.fromEntries(Object.entries(perBiome).map(([b, v]) => [b, `${(v.plants / v.chunks).toFixed(0)} (${v.chunks} chunks)`])), seen);
  ok(crinoidCover > 0 && moundCover > 0, `crinoids and stromatoporoids give cover (${crinoidCover}, ${moundCover})`);
}

// ---- rung bands: same rung fights, one apart hunts, two apart is a snack ----
{
  const g = new Game('reef', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const at = (id: CreatureId) => g.spawn(id, 'ambient', { x: 0, y: -10, z: 60 }, 1.0);
  const pairs: [CreatureId, CreatureId, string[]][] = [
    ['coccosteus', 'cheirolepis', ['rival', 'prey', 'threat']],      // II vs II
    ['cladoselache', 'coccosteus', ['prey', 'snack']],              // III vs II: the hunter sees food
    ['dunkleosteus', 'cladoselache', ['prey', 'threat']],           // IV vs III
    ['dunkleosteus', 'eldredgeops', ['snack']],                     // IV vs I: beneath notice
    ['eldredgeops', 'walliserops', ['rival', 'prey', 'threat']],    // I vs I
  ];
  for (const [a, b, allowed] of pairs) {
    const band = bandOf(at(a), at(b));
    ok(allowed.includes(band), `${a} sees ${b} as ${band} (allowed: ${allowed.join('/')})`);
  }
  ok(bandOf(at('eldredgeops'), at('dunkleosteus')) === 'giant', 'a trilobite sees an adult Dunkleosteus as a giant');
  ok(bandOf(at('coccosteus'), at('titanichthys')) === 'giant', 'Titanichthys reads as a giant to the shoal');
  // Everything starts tiny, and what you can eat is decided by size, never by rung: a newborn
  // apex predator is a meal for a grown trilobite.
  const hatchling = (id: CreatureId) => g.spawn(id, 'ambient', { x: 0, y: -10, z: 60 }, stageScale(creature(id).adultLength, 0));
  const adult = (id: CreatureId) => g.spawn(id, 'ambient', { x: 0, y: -10, z: 60 }, stageScale(creature(id).adultLength, ADULT_STAGE));
  const babyDunk = hatchling('dunkleosteus'), grownTrilobite = adult('eldredgeops');
  const seen = bandOf(grownTrilobite, babyDunk);
  ok(['snack', 'prey', 'rival'].includes(seen),
    `an adult trilobite (${lengthOf(grownTrilobite).toFixed(2)}) sees a newborn Dunkleosteus (${lengthOf(babyDunk).toFixed(2)}) as ${seen}, not a giant`);
  ok(bandOf(babyDunk, grownTrilobite) !== 'snack', 'and the newborn does not read it as a snack');
}

// ---- start scales and modes ----
{
  const dom = new Game('rise', [{ creature: 'eldredgeops', device: 'keyboard', ready: true }, { creature: 'dunkleosteus', device: 0, ready: true }]);
  dom.skipHatch();
  for (const p of dom.players) ok(Math.abs(p.scale - stageScale(creature(p.creature).adultLength, 0)) < 1e-6, `${p.creature} starts as a hatchling in Rise`);
  ok(lengthOf(dom.players[1]) < creature('coccosteus').adultLength, `a hatchling Dunkleosteus (${lengthOf(dom.players[1]).toFixed(2)}) is shorter than an adult Coccosteus`);
  ok(lengthOf(dom.players[0]) >= 0.6 - 1e-6, `the smallest hatchling is still a playable body (${lengthOf(dom.players[0]).toFixed(2)})`);
  // growth is geometric: every moult multiplies the body by the same factor, up to adult, then Prime
  const L = creature('dunkleosteus').adultLength, steps = [0, 1, 2, 3].map((i) => stageScale(L, i + 1) / stageScale(L, i));
  ok(steps.slice(0, 3).every((r) => Math.abs(r - steps[0]) < 1e-6) && steps[0] > 1.5, `Dunkleosteus grows ×${steps[0].toFixed(2)} at each of its first three moults`);
  ok(Math.abs(stageScale(L, ADULT_STAGE) - 1) < 1e-9 && stageScale(L, PRIME_STAGE) > 1.3, 'adult is full size and Prime is bigger again');
  // every hatchling hatches inside plant cover, never in open water
  for (const p of dom.players) ok(coverAt(dom.world, p.pos, lengthOf(p), []) > 0.2, `${p.creature} hatches hidden in the plants (cover ${coverAt(dom.world, p.pos, lengthOf(p), []).toFixed(2)})`);
  ok(dom.actors.every((a) => a.controller !== 'bot'), 'Rise is whoever turned up: no bots fill the seats');
  const hunt = new Game('hunted', [{ creature: 'eldredgeops', device: 'keyboard', ready: true }]);
  hunt.skipHatch();
  ok(hunt.actors.filter((a) => a.controller === 'bot').length === 3, 'Hunter & Hunted still fills to four with bots');
  const reef = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }]);
  reef.skipHatch();
  ok(Math.abs(reef.players[0].scale - stageScale(creature('tiktaalik').adultLength, ADULT_STAGE)) < 1e-6 && devActor(reef, reef.players[0]).standing > STAGE_AT[ADULT_STAGE], 'Reef starts Adult');
}

// ---- standing, staging and no tier growth ----
{
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0]; const d = devActor(g, p);
  p.spawnProtect = 1e6;                                       // the bots are quick now; this one is idling on purpose
  const tier0 = p.tier;
  // feed it by hand: 40 nutrition worth of shoal
  for (let i = 0; i < 20; i++) RULES!.onNutrition(g, p, 2, undefined);
  ok(d.standing > 0, `feeding raises the growth meter (${d.standing.toFixed(1)})`);
  ok(p.tier === tier0, 'nutrition never changes the tier in the Devonian');
  // Growth is what you eat and nothing else: idling, holding ground, driving rivals off — none of
  // it moves the meter now that Domination is gone.
  const idleBefore = d.standing;
  for (let i = 0; i < 600; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(Math.abs(d.standing - idleBefore) < 1e-6, `idling neither grows nor decays it (${idleBefore.toFixed(1)} → ${d.standing.toFixed(1)})`);
  const g2 = new Game('rise', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }]);
  g2.skipHatch();
  const t = g2.players[0], d2 = devActor(g2, t);
  t.pos.z = shoreZ(t.pos.x); t.prevT.z = t.pos.z; d2.standing = 40;
  for (let i = 0; i < 600; i++) tick(g2, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(d2.beached, 'Tiktaalik on the sand is beached');
  ok(Math.abs(d2.standing - 40) < 1e-6, `and keeps what it has eaten (${d2.standing.toFixed(1)})`);
  // straight to Prime: the stage changes with the moult ceremony, the rung never does
  // one stage per moult ceremony: standing can run ahead, the body catches up after each moult
  const stage0 = d.stage;
  for (let i = 0; i < 80; i++) RULES!.onNutrition(g, p, 10, undefined);
  ok(d.stage === stage0 + 1 && p.state === 'moult', `a ceremony takes it up exactly one stage (${stage0} → ${d.stage}, ${p.state})`);
  const scales = [p.scale];
  for (let m = 0; m < 4; m++) { for (let i = 0; i < 60 * 3; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]])); RULES!.onNutrition(g, p, 1, undefined); scales.push(p.scale); }
  for (let i = 0; i < 60 * 3; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(d.stage === PRIME_STAGE, `a ceremony per moult all the way to Prime (stage ${d.stage})`);
  const grew = scales.filter((s, i) => i > 0 && s > scales[i - 1] + 1e-9).length;
  ok(scales.every((s, i) => i === 0 || s >= scales[i - 1] - 1e-9) && grew >= 2, `each moult makes the body bigger until Prime (${scales.map((s) => s.toFixed(2)).join(' → ')})`);
  ok(Math.abs(p.scale - stageScale(creature(p.creature).adultLength, PRIME_STAGE)) < 1e-6, 'Prime is the largest the body gets');
  ok(creature(p.creature).rung === 2, 'still rung II');
  const hud = RULES!.hud(g, 0)!;
  ok(hud.rung === 2 && hud.rungName === 'Shoal' && hud.standing === d.standing, 'HUD reports rung, name and standing');
  // The ring is the same instrument in both eras: it fills toward the next moult, not across the
  // whole of growth, so a full ring means the body is about to change and nothing else.
  ok(hud.stageProgress === 1, `at Prime the ring is full (${hud.stageProgress})`);
  {
    const fresh = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
    fresh.skipHatch();
    const q = fresh.players[0]; q.spawnProtect = 1e6;
    const dq = devActor(fresh, q);
    const seen: number[] = [];
    let moults = 0, wasFull = 0;
    for (let i = 0; i < 400 && dq.stage < PRIME_STAGE; i++) {
      const before = dq.stage;
      RULES!.onNutrition(fresh, q, 1, undefined);
      const ring = RULES!.hud(fresh, 0)!.stageProgress;
      seen.push(ring);
      if (dq.stage > before) { moults++; if (seen[seen.length - 2] > 0.9) wasFull++; }
      for (let k = 0; k < 4; k++) tick(fresh, new Map<number, InputFrame>([[0, emptyInput()]]));
    }
    ok(moults >= 3 && wasFull === moults, `every moult arrived with the ring full (${wasFull}/${moults})`);
    ok(seen.every((v) => v >= 0 && v <= 1), 'the ring never leaves 0..1');
    ok(seen.some((v) => v < 0.5), 'and it starts again after a moult rather than sitting near full');
  }
  ok(RULES!.hint(g, 0) === undefined || typeof RULES!.hint(g, 0) === 'string', 'hint is optional text');
}

// ---- breathing both ways: a stamina economy, not a countdown ----
/**
 * Nothing on this roster is lung-only, so nothing here can drown and nothing carries a meter that
 * runs out (see `breathing` in src/content/creature-types.ts). What lungs buy is a place to go: a
 * quarter of the usual stamina recovery under water, and the whole bar back on touching the surface.
 */
{
  const g = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }, { creature: 'coccosteus', device: 0, ready: true }]);
  g.skipHatch();
  const [tik, coc] = g.players;
  for (const p of [tik, coc]) { p.hatching = false; p.state = 'free'; p.stateT = 0; p.stateDur = 0; p.spawnProtect = 0; p.pos.y = 20; p.prevT.y = 20; p.stamina = 0; }
  ok(RULES!.hud(g, 0)!.bimodal && !RULES!.hud(g, 1)!.bimodal, 'the HUD knows which bodies breathe both ways');
  const sink = new Map<number, InputFrame>([[0, { ...emptyInput(), sink: true }], [1, { ...emptyInput(), sink: true }]]);
  for (let i = 0; i < 60 * 5; i++) { tik.pos.y = 20; coc.pos.y = 20; tick(g, sink); }
  const lung = tik.stamina / tik.staminaMax, gill = coc.stamina / coc.staminaMax;
  ok(gill > 0.5, `gills recover at the shared rate (${(gill * 100).toFixed(0)}% in 5 s)`);
  ok(lung > 0 && lung < gill * 0.4, `lungs recover far slower under water (${(lung * 100).toFixed(0)}% against ${(gill * 100).toFixed(0)}%)`);
  // ...and the whole bar is waiting at the surface.
  let gulps = 0;
  tik.pos.y = SURFACE_Y - 2; tik.prevT.y = tik.pos.y;
  g.step(1 / 60, new Map([[0, emptyInput()], [1, emptyInput()]]));
  for (const e of g.events) if (e.kind === 'gulp') gulps++;
  g.events.length = 0;
  ok(tik.stamina === tik.staminaMax && gulps === 1, `one touch of the surface hands the whole bar back (${gulps} gulp)`);
}

/**
 * The climb is free, and free enough that an empty bar cannot strand anything down there: a sprint
 * or a dash upward costs nothing, still fires on nothing, and on nothing drives only the climb.
 */
{
  const climb = (id: CreatureId, up: boolean, stamina: number) => {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const p = g.players[0];
    p.hatching = false; p.state = 'free'; p.stateT = 0; p.stateDur = 0; p.spawnProtect = 0;
    p.pos.y = 20; p.prevT.y = 20; p.stamina = stamina; p.exhausted = 0;
    const y0 = p.pos.y, x0 = p.pos.x, z0 = p.pos.z;
    const f: InputFrame = up
      ? { ...emptyInput(), my: 1, camPitch: -0.7, camYaw: p.yaw, burst: 1, rise: true }
      : { ...emptyInput(), my: 1, camPitch: 0, camYaw: p.yaw, burst: 1 };
    for (let i = 0; i < 60 * 3; i++) tick(g, new Map([[0, f]]));
    return { spent: stamina - p.stamina, climbed: p.pos.y - y0, along: Math.hypot(p.pos.x - x0, p.pos.z - z0) };
  };
  const upFull = climb('tiktaalik', true, 100), alongFull = climb('tiktaalik', false, 100);
  ok(upFull.spent < 1, `sprinting upward costs a lung nothing (${upFull.spent.toFixed(1)} stamina in 3 s)`);
  ok(alongFull.spent > 15, `sprinting along still costs it (${alongFull.spent.toFixed(1)} stamina)`);
  ok(climb('cheirolepis', true, 100).spent > 15, 'gills pay for the climb like everything else');
  const empty = climb('tiktaalik', true, 0), emptyAlong = climb('tiktaalik', false, 0);
  ok(empty.climbed > 8, `an empty bar still climbs (${empty.climbed.toFixed(1)} units in 3 s)`);
  ok(emptyAlong.along < alongFull.along * 0.8, `but an empty sprint buys no ground (${emptyAlong.along.toFixed(1)} against ${alongFull.along.toFixed(1)} units)`);
}

/**
 * Out of the water, at any size. The breach gate compared vertical speed against a flat 3.2 u/s
 * and only let a body through from `free`, so a hatchling met a hard invisible wall a body's length
 * under the surface however it came at it, and a dash — the hardest a body can drive at anything —
 * was excluded from the one move most likely to launch it. Both are relative to the body now: a
 * lung leaves the water on rise alone because that is what its body is for, and everything else
 * still has to drive at the surface, at every size rather than only when grown.
 */
{
  const leaves = (id: CreatureId, scale: number, how: 'rise' | 'swim') => {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const p = g.players[0];
    p.hatching = false; p.state = 'free'; p.stateT = 0; p.stateDur = 0; p.spawnProtect = 0;
    p.pos.y = SURFACE_Y - 14; p.prevT.y = p.pos.y;
    for (let i = 0; i < 60 * 10; i++) {
      p.scale = scale; applyScaleStats(p, false);
      const f: InputFrame = how === 'rise'
        ? { ...emptyInput(), rise: true }
        : { ...emptyInput(), my: 1, camPitch: -0.7, camYaw: p.yaw, burst: 1 };
      tick(g, new Map([[0, f]]));
      if (p.airborne) return true;
    }
    return false;
  };
  for (const scale of [0.13, 0.3, 1]) {
    ok(leaves('tiktaalik', scale, 'rise'), `a Tiktaalik at scale ${scale} rises clear of the water — no invisible ceiling`);
    ok(leaves('cheirolepis', scale, 'swim'), `a Cheirolepis at scale ${scale} breaches when it drives at the surface`);
  }
  ok(!leaves('cheirolepis', 1, 'rise'), 'gills still do not step out of the sea on the rise button alone');
  ok(!leaves('michelinoceras', 1, 'swim'), 'and a shell never leaves the water at all');
}

/** The winded heartbeat: a nudge toward the surface while the bar is low, and silence once it is not. */
{
  const g = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0];
  p.hatching = false; p.state = 'free'; p.stateT = 0; p.stateDur = 0; p.spawnProtect = 0;
  const count = (stamina: number, seconds: number, y: number) => {
    let n = 0;
    for (let i = 0; i < 60 * seconds; i++) {
      p.stamina = stamina * p.staminaMax; p.pos.y = y; p.prevT.y = y;
      g.step(1 / 60, new Map([[0, { ...emptyInput(), sink: true }]]));
      for (const e of g.events) if (e.kind === 'winded') n++;
      g.events.length = 0;
    }
    return n;
  };
  const low = count(0.2, 12, 20), spent = count(0.0, 12, 20);
  ok(low > 0 && spent > low, `the winded pulse quickens as the bar empties (${low} beats then ${spent} over 12 s)`);
  ok(count(0.3, 12, 20) === 0, 'and nothing above a quarter bar, which is where it starts');
  ok(count(1, 12, 20) === 0, 'nor on a full bar');
  ok(count(0, 6, SURFACE_Y - 2) === 0, 'nor at the surface, where the bar is already back');
}

// ---- dead water: gills suffer, lungs do not, leaving scores ----
{
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }, { creature: 'tiktaalik', device: 0, ready: true }]);
  g.skipHatch();
  const [coc, tik] = g.players;
  coc.spawnProtect = tik.spawnProtect = 1e6;                 // nothing but the dead water may touch them here
  tik.pos.x = coc.pos.x + 8; tik.pos.z = coc.pos.z; tik.pos.y = coc.pos.y; tik.prevT.x = tik.pos.x; tik.prevT.z = tik.pos.z;
  const s = stateFor(g);
  s.deadZones.push({ pos: { x: coc.pos.x, y: coc.pos.y, z: coc.pos.z }, r: 40, age: 30, life: 120, drift: { x: 0, y: 0, z: 0 } });
  const hp0 = coc.hp, hpT = tik.hp;
  const still = new Map<number, InputFrame>([[0, emptyInput()], [1, emptyInput()]]);
  for (let i = 0; i < 60 * 8; i++) tick(g, still);
  const dc = devActor(g, coc), dt = devActor(g, tik);
  ok(dc.deadZoneIn && dt.deadZoneIn, 'both are inside the zone');
  ok(coc.hp < hp0 && coc.stamina < coc.staminaMax * 0.5, `dead water drains a gill breather (hp ${hp0.toFixed(0)} → ${coc.hp.toFixed(0)}, stamina ${coc.stamina.toFixed(0)})`);
  ok(tik.hp >= hpT - 1e-6 && devActor(g, tik).deadT === 0, `a bimodal breather is untouched by anoxia (hp ${hpT.toFixed(1)} → ${tik.hp.toFixed(1)}, deadT ${devActor(g, tik).deadT})`);
  ok(RULES!.hud(g, 0)!.deadZones.length === 1 && RULES!.hud(g, 0)!.inDeadZone, 'the HUD carries the zone for the radar');
  const before = dc.standing;
  s.deadZones.length = 0;
  tick(g, still);
  ok(Math.abs(dc.standing - before) < 1e-6, `leaving dead water costs and pays nothing (${dc.standing.toFixed(1)})`);
}

// ---- shore reach: limbs get past the wall, fins do not ----
{
  const g = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }, { creature: 'coccosteus', device: 0, ready: true }]);
  g.skipHatch();
  const [tik, coc] = g.players;
  // start side by side in open water, then push both straight at the shore (+z) for a while
  tik.pos.x = coc.pos.x + 6; tik.pos.z = coc.pos.z; tik.pos.y = coc.pos.y = 20; tik.prevT.x = tik.pos.x; tik.prevT.z = tik.pos.z; tik.prevT.y = coc.prevT.y = 20;
  const toShore = (i: number) => { const f = { ...emptyInput(), my: 1, camYaw: 0, camPitch: 0, burst: 1 } as InputFrame; return [i, f] as [number, InputFrame]; };
  const inputs = new Map<number, InputFrame>([toShore(0), toShore(1)]);
  for (let i = 0; i < 60 * 40; i++) tick(g, inputs);
  const sT = shoreDistance(tik.pos.x, tik.pos.z), sC = shoreDistance(coc.pos.x, coc.pos.z);
  ok(sT < sC, `Tiktaalik gets closer to the shore than Coccosteus (${sT.toFixed(1)} vs ${sC.toFixed(1)} from shoreZ ${shoreZ(tik.pos.x).toFixed(0)})`);
  ok(devActor(g, tik).beached, 'and counts as beached there');
  ok(!devActor(g, coc).beached, 'the fish never beaches');
}

// ---- armour ----
{
  const g = new Game('reef', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const mk = (id: CreatureId) => g.spawn(id, 'ambient', { x: 0, y: -10, z: 80 }, 1);
  const dir = { x: 0, y: 0, z: 1 };
  const shark = mk('cladoselache'), dunk = mk('dunkleosteus'), tusk = mk('onychodus'), plate = mk('bothriolepis'), soft = mk('cheirolepis');
  const kSharkPlate = RULES!.armour(shark, plate, dir), kSharkSoft = RULES!.armour(shark, soft, dir);
  const kDunkPlate = RULES!.armour(dunk, plate, dir), kTuskPlate = RULES!.armour(tusk, plate, dir);
  ok(kSharkSoft === 1, 'no armour, no reduction');
  ok(kSharkPlate < 0.6, `plates blunt a shark (${kSharkPlate.toFixed(2)})`);
  ok(kDunkPlate === 1, 'Dunkleosteus cuts straight through armour');
  ok(kTuskPlate > kSharkPlate && kTuskPlate < kDunkPlate, `Onychodus gets part way through (${kTuskPlate.toFixed(2)})`);
  ok(RULES!.jet(mk('manticoceras')) && !RULES!.jet(shark), 'only shells jet');
}

// ---- a shell goes where the stick points, and swims both ways round ----
// The stick is the direction of travel for every body in the sea: swimming, sprinting and dashing
// all go where they are aimed. A shell's heading is the one thing the funnel changes, and a
// nautiloid jets either side of its shell — it leads with whichever end it is already pointing and
// turns through the shorter arc, so travel that is more behind it than ahead leaves it going
// shell-first, head trailing, instead of spinning round to chase its own heading.
{
  /** `astern` is how far the body points against its own travel: 1 is shell-first, -1 is head-first. */
  const astern = (p: { yaw: number; vel: { x: number; z: number } }) => {
    const h = heading(p.yaw), v = Math.hypot(p.vel.x, p.vel.z);
    return v > 0.35 ? -(h.x * p.vel.x + h.z * p.vel.z) / v : 0;
  };
  const run = (id: CreatureId, gear: 'swim' | 'sprint' | 'dash', stick: 1 | -1 = 1, reverseAfter = false) => {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const p = g.players[0];
    p.pos = { x: 0, y: -14, z: 0 }; p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0; p.spawnProtect = 999;
    const push = (my: number): InputFrame => ({ ...emptyInput(), my, burst: gear === 'sprint' ? 1 : 0, dash: gear === 'dash' });
    for (let i = 0; i < 90; i++) { tick(g, new Map<number, InputFrame>([[0, push(stick)]])); p.spawnProtect = 999; }
    const turned = { z: p.pos.z, astern: astern(p), yaw: p.yaw };
    if (!reverseAfter) return turned;
    // Same camera, stick pulled the other way: the shell should back off the way it came without
    // turning round, because half a turn is further than no turn at all.
    const wasZ = p.pos.z, wasYaw = p.yaw;
    for (let i = 0; i < 150; i++) { tick(g, new Map<number, InputFrame>([[0, push(-stick)]])); p.spawnProtect = 999; }
    return { z: p.pos.z - wasZ, astern: astern(p), yaw: Math.abs(wrapAngle(p.yaw - wasYaw)) };
  };
  for (const id of ['michelinoceras', 'manticoceras'] as CreatureId[]) {
    const swim = run(id, 'swim'), sprint = run(id, 'sprint'), dash = run(id, 'dash'), back = run(id, 'swim', -1);
    ok(swim.z > 1, `${id} swims where the stick points (z ${swim.z.toFixed(1)})`);
    ok(sprint.z > swim.z, `...sprints further the same way, never backward out of it (z ${sprint.z.toFixed(1)})`);
    ok(dash.z > 1, `...and dashes the same way too (z ${dash.z.toFixed(1)})`);
    ok(back.z < -1, `...and pulling the stick back takes it back (z ${back.z.toFixed(1)})`);
    ok(swim.astern < -0.8, `...leading with its head when that is the way it set off (${swim.astern.toFixed(2)}, -1 is head-first)`);
    ok(sprint.astern < -0.8, `...and a sprint does not turn it round (${sprint.astern.toFixed(2)})`);
    const rev = run(id, 'swim', 1, true);
    ok(rev.z < -1, `...reversing carries it back the way it came (z ${rev.z.toFixed(1)})`);
    ok(rev.astern > 0.8, `...shell-first, head trailing (${rev.astern.toFixed(2)}, 1 is astern)`);
    ok(rev.yaw < 0.4, `...without turning round to do it (${rev.yaw.toFixed(2)} rad of turn)`);
    ok(dash.astern < -0.8, `...and an aimed dash does not turn it round either (${dash.astern.toFixed(2)})`);
  }
  const fish = run('cladoselache', 'sprint');
  ok(fish.z > 1 && fish.astern < -0.8, `a finned body sprints forward, facing forward (z ${fish.z.toFixed(1)}, ${fish.astern.toFixed(2)})`);
  const fishBack = run('cladoselache', 'swim', 1, true);
  ok(fishBack.yaw > 1.2 && fishBack.astern < -0.5, `a finned body turns round to swim the other way (${fishBack.yaw.toFixed(2)} rad, astern ${fishBack.astern.toFixed(2)})`);

  // A neutral stick has no direction to give, so the dash takes the body's own axis: ahead of a
  // finned body, and out behind a shell, which is the way it is already pointing to jet.
  const neutral = (id: CreatureId) => {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const p = g.players[0];
    p.pos = { x: 0, y: -14, z: 0 }; p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0; p.spawnProtect = 999;
    const step = (f: Partial<InputFrame> = {}) => { tick(g, new Map<number, InputFrame>([[0, { ...emptyInput(), ...f } as InputFrame]])); p.spawnProtect = 999; };
    for (let i = 0; i < 20; i++) step();
    const from = { ...p.pos }, fromYaw = p.yaw;
    step({ dash: true });
    for (let i = 0; i < 20; i++) step();
    const h = heading(p.yaw), dx = p.pos.x - from.x, dz = p.pos.z - from.z;
    return { moved: Math.hypot(dx, dz), alongAxis: (h.x * dx + h.z * dz) / Math.max(Math.hypot(dx, dz), 1e-6), turned: Math.atan2(Math.sin(p.yaw - fromYaw), Math.cos(p.yaw - fromYaw)) };
  };
  const shell = neutral('michelinoceras'), finned = neutral('cladoselache');
  ok(finned.moved > 1 && finned.alongAxis > 0.9, `a neutral-stick dash sends a fish the way it faces (${finned.moved.toFixed(1)} units, ${finned.alongAxis.toFixed(2)})`);
  ok(shell.moved > 1 && shell.alongAxis < -0.9, `...and a shell out behind itself, shell-first (${shell.moved.toFixed(1)} units, ${shell.alongAxis.toFixed(2)})`);
  // ...and it comes out of that still pointing where it started. Holding the heading is what makes
  // a dash *backward*: following the velocity round would spin the animal, and the camera with it,
  // through 180° at the one moment it wants its eyes on the thing it is escaping. A dash that goes
  // where the body already points has nothing to hold, so this is the shell's rule, not the fish's.
  ok(Math.abs(shell.turned) < 0.2, `a backward dash leaves the shell facing where it was (turned ${shell.turned.toFixed(2)} rad)`);
}

// ---- changing creature keeps the era's own growth in step ----
// The Devonian keeps the life stage in a side table rather than deriving it per step, so a body
// that changed species has to be told (`onSwap`). Without it the new animal would keep the old
// one's stage and the meter would be filled against the wrong thresholds.
{
  const { ladderMark, rungOf } = await import('../src/sim/ladder');
  const { devActor, stageForScale } = await import('../src/sim/devonian/state');
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0];
  for (let i = 0; i < 30; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  p.spawnProtect = 0; p.teleportCd = 0; p.state = 'free';
  const target: CreatureId = 'dunkleosteus';
  ok(g.changeCreature(0, target, true), 'a Devonian player can change creature');
  ok(p.creature === target, `...and is the new animal (${p.creature})`);
  const d = devActor(g, p);
  ok(d.stage === stageForScale(creature(target).adultLength, p.scale), `...with the era's stage resynced to the new body (stage ${d.stage})`);
  ok(rungOf(ladderMark(g, p)) === 4, `...arriving fully grown when asked (rung ${rungOf(ladderMark(g, p))})`);
  p.teleportCd = 0;
  ok(g.changeCreature(0, 'coccosteus', false) && rungOf(ladderMark(g, p)) === 0, 'and the body it left is handed back where it was');
}

// ---- the era's own ways of getting about (docs/research/locomotion-ideas.md) ----
{
  const solo = (id: CreatureId, at?: { x: number; z: number }) => {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }], 17);
    g.skipHatch();
    const p = g.players[0];
    const x = at?.x ?? 20, z = at?.z ?? -140;
    p.pos = { x, y: groundHeight(g.world, x, z, []) + 8, z };
    p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0; p.spawnProtect = 999;
    const step = (f: Partial<InputFrame> = {}) => { tick(g, new Map<number, InputFrame>([[0, { ...emptyInput(), ...f } as InputFrame]])); p.spawnProtect = 999; };
    return { g, p, step };
  };

  // A punt needs the floor to push off: out in the water the same button barely moves the animal.
  // Acanthostega is the one that shows it — a swimmer that shoves off the bottom, not a walker
  // that never leaves it.
  const punt = (down: boolean) => {
    const { g, p, step } = solo('acanthostega');
    const floor = groundHeight(g.world, p.pos.x, p.pos.z, []);
    p.pos.y = down ? floor + lengthOf(p) * 0.2 : floor + 14;
    for (let i = 0; i < 20; i++) step();
    const from = { ...p.pos };
    step({ my: 1, dash: true });
    for (let i = 0; i < 24; i++) step();
    return Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
  };
  const onFloor = punt(true), inWater = punt(false);
  ok(onFloor > inWater * 1.8, `a punt has its legs with the bottom in reach (${onFloor.toFixed(1)} units against ${inWater.toFixed(1)} up in the water)`);

  // Two gaits, told apart by the water. Out in the channel, where the flow is real, a eurypterid
  // that has lifted off its legs and is rowing goes where the water goes; the same animal walking
  // on the bottom barely feels it.
  const carried = (rowing: boolean) => {
    const { p, step } = solo('jaekelopterus', { x: 50, z: -350 });
    for (let i = 0; i < 60; i++) step(rowing ? { rise: true } : {});
    const from = { ...p.pos };
    for (let i = 0; i < 420; i++) step(rowing ? { rise: true } : {});
    return { moved: Math.hypot(p.pos.x - from.x, p.pos.z - from.z), grounded: p.grounded };
  };
  const walking = carried(false), rowing = carried(true);
  ok(!rowing.grounded && walking.grounded, `the paddles take it off the floor and the legs keep it on (rowing grounded=${rowing.grounded}, walking grounded=${walking.grounded})`);
  ok(walking.moved < rowing.moved * 0.6, `walking holds station where rowing drifts (${walking.moved.toFixed(1)} against ${rowing.moved.toFixed(1)} units in the channel)`);

  // A rigid shield with no paired fins behind it cannot tip quickly.
  const pitchIn = (id: CreatureId) => {
    const { p, step } = solo(id);
    for (let i = 0; i < 30; i++) step({ my: 1 });
    const from = p.pitch;
    let fastest = 0;
    for (let i = 0; i < 45; i++) { const was = p.pitch; step({ my: 1, sink: true }); fastest = Math.max(fastest, Math.abs(p.pitch - was) * 60); }
    return { turned: Math.abs(p.pitch - from), fastest };
  };
  const rigid = pitchIn('doryaspis'), finned = pitchIn('cheirolepis');
  ok(rigid.fastest <= creature('doryaspis').pitchRate! + 1e-6, `a rigid body cannot tip faster than its shield allows (${rigid.fastest.toFixed(2)} of ${creature('doryaspis').pitchRate} rad/s)`);
  ok(finned.fastest > rigid.fastest * 1.5, `...where a finned body tips as fast as it likes (${finned.fastest.toFixed(2)} rad/s)`);
  ok(rigid.turned < finned.turned, `...so it takes longer to commit to a dive (${rigid.turned.toFixed(2)} rad against ${finned.turned.toFixed(2)})`);

  // The era's own tail-flip and its one body with no front.
  const flip = (() => {
    const { p, step } = solo('nahecaris');
    for (let i = 0; i < 20; i++) step();
    const from = { ...p.pos }, h = heading(p.yaw);
    step({ my: 1, dash: true });
    for (let i = 0; i < 24; i++) step({ my: 1 });
    return h.x * (p.pos.x - from.x) + h.z * (p.pos.z - from.z);
  })();
  ok(flip < -2, `Nahecaris flips away from what touched it (${flip.toFixed(1)} units astern)`);
  const star = (() => {
    const { p, step } = solo('furcaster');
    for (let i = 0; i < 10; i++) step();
    const yaw0 = p.yaw;
    for (let i = 0; i < 90; i++) step({ mx: 1 });
    return Math.abs(wrapAngle(p.yaw - yaw0));
  })();
  ok(star < 0.2, `a brittle star rows sideways without turning its disc (${star.toFixed(2)} rad)`);

  // Titanichthys strains what it swims through, and nothing at all while it is stopped.
  ok(!!creature('titanichthys').ramFeed && creature('titanichthys').diet === 'filter', 'the gentle giant is a ram feeder');
}

// ---- every sound the era asks for exists (the shared library is NOT under assets/devonian/) ----
{
  const { SAMPLES, loops, sfxUrl, registerSamples } = await import('../src/audio/audio');
  registerSamples(DEVONIAN_SAMPLES);
  // The preloader takes its list from the library itself, so this is the same set it warms.
  const { sfxFiles } = await import('../src/render/assets');
  const names = new Set<string>([...Object.values(SAMPLES).flat(), ...Object.values(loops()), ...sfxFiles()]);
  const missing = [...names].filter((n) => !fs.existsSync(`public/${sfxUrl(n).replace(/^\.\//, '')}`));
  ok(missing.length === 0, `every registered sample resolves to a file (missing: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ` +${missing.length - 6}` : ''})`);
  // The beds are the heaviest sounds and the longest missed — nothing stands in for them now — so
  // the queue has to warm them like anything else. They used to be the one thing it never asked for.
  const queued = new Set(sfxFiles());
  const coldLoops = Object.values(loops()).filter((l) => !queued.has(l));
  ok(coldLoops.length === 0, `the ambient and drone loops are in the preload queue (cold: ${coldLoops.join(', ') || 'none'})`);
  ok(sfxUrl('bite-1').includes('assets/sfx/'), `shared samples come from the shared library (${sfxUrl('bite-1')})`);
  ok(sfxUrl('devonian/jaw-shear').includes('assets/devonian/sfx/'), `this era's own samples come from its own folder (${sfxUrl('devonian/jaw-shear')})`);
  const { openingTrack, music } = await import('../src/audio/music');
  ok(openingTrack().name === 'Devonian Shells', `the session opens on this era's track, not the other era's (${openingTrack().name})`);
  ok(music().length === DEVONIAN.audio.music.length, 'the soundtrack in play is this era\'s');
  const noFile = DEVONIAN.audio.music.filter((t) => !fs.existsSync(`public/${paths.music(t.name).replace(/%20/g, ' ')}`));
  ok(noFile.length === 0, `every track in the soundtrack has a file (missing: ${noFile.map((t) => t.name).join(', ')})`);
}

// ---- only delivered creatures can be picked, and they all have portraits ----
{
  const { PLAYABLE, PLAYABLE_IDS, CREATURE_IDS } = await import('../src/sim/creatures');
  ok(PLAYABLE.length === DEVONIAN_SHIPPED.length, `the selection screen offers the ${DEVONIAN_SHIPPED.length} delivered specimens, not all ${CREATURE_IDS.length}`);
  for (const id of PLAYABLE_IDS) {
    ok(DEVONIAN_SHIPPED.includes(id), `${id} is pickable and has its own model`);
    for (const kind of ['select', 'card', 'thumb'] as const) ok(fs.existsSync(`public/${paths.portrait(id, kind)}`), `${id} has a ${kind} portrait for the roster`);
  }
  for (const id of [DEVONIAN.defaults.player, ...DEVONIAN.defaults.boot, ...DEVONIAN.defaults.title]) ok(PLAYABLE_IDS.includes(id), `${id} is preloaded and pickable`);
  const bots = new Game('hunted', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]).actors.filter((a) => a.controller === 'bot');
  ok(bots.length > 0 && bots.every((b) => PLAYABLE_IDS.includes(b.creature)), 'bots are animals the player could have picked');
}

// ---- movement reads at the same speed as the Cambrian, whatever the body's size ----
{
  // The follow camera sits magnificationDistance(L) back, so what the player feels is
  // speed / that distance: screens per second. The Cambrian band at full size is 0.61–1.30.
  const mag = (L: number) => L * 1.45 + 1.15 + Math.max(0, 0.8 - L) * 0.9;
  const { PLAYABLE } = await import('../src/sim/creatures');
  const research = JSON.parse(fs.readFileSync('docs/research/devonian-swimming.json', 'utf8')) as { id: string; lengthM: number; burstBLs: number; cruiseBLs: number }[];
  for (const c of DEVONIAN.creatures) {
    const adult = c.speed / mag(c.adultLength), sprint = adult * c.burst;
    const yl = c.adultLength * 0.6, young = (c.speed * Math.pow(0.6, 0.45)) / mag(yl);
    ok(adult >= 0.45 && adult <= 1.6, `${c.id} cruises at a readable speed grown (${adult.toFixed(2)} screens/s)`);
    ok(young >= 0.4, `${c.id} is not sluggish at its starting size (${young.toFixed(2)} screens/s)`);
    ok(sprint >= adult * 1.5 && sprint <= 2.6, `${c.id} sprints hard but stays steerable (${sprint.toFixed(2)} screens/s)`);
    ok(c.turnRate >= 1.2, `${c.id} can turn (${c.turnRate} rad/s)`);
    ok(c.agility >= 2.0, `${c.id} accelerates (${c.agility})`);
    // the sizes are the real animals', compressed: same order, near proportion
    const r = research.find((x) => x.id === c.id)!;
    ok(Math.abs(c.adultLength - 4.6 * Math.pow(r.lengthM, 0.6)) < 0.02, `${c.id} is sized from its ${r.lengthM} m (${c.adultLength})`);
  }
  const byLen = [...DEVONIAN.creatures].sort((a, b) => a.adultLength - b.adultLength).map((c) => c.id);
  const byReal = [...research].sort((a, b) => a.lengthM - b.lengthM).map((r) => r.id);
  ok(byLen.every((id, i) => research.find((r) => r.id === id)!.lengthM === research.find((r) => r.id === byReal[i])!.lengthM), 'the roster keeps the real animals\' size order');
  const shark = DEVONIAN.creatures.find((c) => c.id === 'cladoselache')!;
  ok(shark.burst >= 3, `a shark's sprint is several times its cruise, as the fast-start literature has it (${shark.burst}×)`);
  ok(DEVONIAN.creatures.find((c) => c.id === 'rhinodipterus')!.rung === 2, 'a 0.4 m lungfish sits in rung II by size');
  const dunk = PLAYABLE.find((c) => c.id === 'dunkleosteus')!;
  const titan = DEVONIAN.creatures.find((c) => c.id === 'titanichthys')!;
  ok(dunk.speed / mag(dunk.adultLength) > titan.speed / mag(titan.adultLength), 'the hunter still outruns the filter feeder');
}

// ---- per-creature specials ----
{
  const { HEAVY_SPECIALS, BURROWERS } = await import('../src/sim/concealment');
  const g = new Game('reef', [
    { creature: 'onychodus', device: 'keyboard', ready: true }, { creature: 'cheirolepis', device: 0, ready: true },
    { creature: 'stethacanthus', device: 1, ready: true }, { creature: 'gemuendina', device: 2, ready: true },
  ]);
  g.skipHatch();
  ok(HEAVY_SPECIALS.has('tuskLunge') && HEAVY_SPECIALS.has('jawShear') && BURROWERS.has('gemuendina'), 'Devonian specials are installed with the game');
  // A heavy special replaces the heavy bite rather than adding to it, so it must never hit softer
  // than the bite it displaced. Every one of them was, before the floor in `specialHit`: the jaw
  // shear did 40 against Dunkleosteus' own heavy of 70.
  {
    const { specialHit } = await import('../src/sim/expansion-abilities');
    for (const def of DEVONIAN.creatures.filter((c) => HEAVY_SPECIALS.has(c.ability))) {
      const floored = specialHit(def, { damage: 0, poise: 0 });
      ok(floored.damage >= def.heavy.damage, `${def.id}: ${def.abilityName} hits at least as hard as its own heavy (${floored.damage} vs ${def.heavy.damage})`);
      ok(floored.poise >= def.heavy.poise, `${def.id}: ${def.abilityName} staggers at least as much as its own heavy`);
    }
  }
  const [ony, chei, steth, gem] = g.players;
  const idle = () => new Map<number, InputFrame>(g.players.map((_, i) => [i, emptyInput()]));
  const press = (i: number, key: 'heavy' | 'ability' | 'guard') => { const m = idle(); m.set(i, { ...emptyInput(), [key]: true }); return m; };
  for (let i = 0; i < 90; i++) tick(g, idle());               // through the hatch-in
  // Y specials: the everyman's dart, the burrower's sand ambush
  const st0 = chei.stamina;
  tick(g, press(1, 'ability'));
  ok(chei.burstT > 0 && chei.hideMode === 'none' && chei.stamina < st0, `shoal dart is a cheap burst, not a hide (burst ${chei.burstT.toFixed(1)})`);
  tick(g, press(3, 'ability'));
  ok(gem.hideMode === 'descending' || gem.hideMode === 'burrowed', `Gemuendina buries for its sand ambush (${gem.hideMode})`);
  // a heavy special: the tusk lunge lands on an armoured rival ahead of it
  const plate = g.spawn('bothriolepis', 'ambient', { x: ony.pos.x + Math.sin(ony.yaw) * lengthOf(ony) * 0.9, y: ony.pos.y, z: ony.pos.z + Math.cos(ony.yaw) * lengthOf(ony) * 0.9 }, 1.0);
  plate.yaw = ony.yaw; plate.spawnProtect = 0; ony.spawnProtect = 0;
  const hp0 = plate.hp;
  tick(g, press(0, 'heavy'));
  ok(ony.state === 'ability' && creature(ony.creature).ability === 'tuskLunge', `heavy starts the tusk lunge (${ony.state})`);
  for (let i = 0; i < 60; i++) { plate.pos.x = ony.pos.x + Math.sin(ony.yaw) * lengthOf(ony) * 0.8; plate.pos.y = ony.pos.y; plate.pos.z = ony.pos.z + Math.cos(ony.yaw) * lengthOf(ony) * 0.8; plate.vel.x = plate.vel.y = plate.vel.z = 0; tick(g, idle()); }
  ok(plate.hp < hp0, `the lunge lands through part of the armour (hp ${hp0.toFixed(0)} → ${plate.hp.toFixed(0)})`);
  // the brush display bluffs an AI rival off
  // away from the other players, so the rival has only the stethacanthus to square up to
  steth.pos.x += 80; steth.prevT.x = steth.pos.x;
  const bot = g.spawn('cladoselache', 'bot', { x: steth.pos.x + 6, y: steth.pos.y, z: steth.pos.z }, 1.0);
  const { makeBrain } = await import('../src/sim/ai');
  bot.brain = makeBrain('needs', { ...steth.pos }, g.rng, { aggression: 1, reaction: 0.1, parrySkill: 0 });
  bot.brain.goal = 'hunt'; bot.brain.target = steth.id;
  const hold = new Map<number, InputFrame>(g.players.map((_, i) => [i, i === 2 ? { ...emptyInput(), guard: true } : emptyInput()]));
  let routed = false;
  for (let i = 0; i < 30; i++) { g.step(DT, hold); if (g.events.some((e) => e.kind === 'routed' && e.actor === bot.id)) routed = true; g.events.length = 0; }
  ok(steth.state === 'guard' && bot.brain.goal === 'flee' && routed, `the brush display routs a hunting rival (${bot.brain.goal})`);
  ok(RULES!.camoDrain(g.spawn('furcaster', 'ambient', { x: 0, y: -10, z: 90 }, 1)) === 0.25 && RULES!.camoDrain(ony) === 1, 'camouflage is nearly free for the benthos');
}

// ---- a heavy special is a committed strike that travels and lands ----
{
  for (const [id, target] of [['dunkleosteus', 'cladoselache'], ['cladoselache', 'coccosteus'], ['coccosteus', 'doryaspis']] as const) {
    const g = new Game('reef', [{ creature: id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const a = g.players[0];
    const idle = () => new Map<number, InputFrame>([[0, emptyInput()]]);
    for (let i = 0; i < 90; i++) tick(g, idle());
    a.spawnProtect = 0;
    const L = lengthOf(a);
    const prey = g.spawn(target, 'ambient', { x: a.pos.x + Math.sin(a.yaw) * L * 1.8, y: a.pos.y, z: a.pos.z + Math.cos(a.yaw) * L * 1.8 }, 1.0);
    prey.spawnProtect = 0;
    const hp0 = prey.hp, at = { ...prey.pos }, from = { ...a.pos };
    tick(g, new Map([[0, { ...emptyInput(), heavy: true }]]));
    ok(a.state === 'ability', `${id}: the heavy button starts its special (${a.state})`);
    for (let i = 0; i < 90; i++) { prey.pos.x = at.x; prey.pos.y = at.y; prey.pos.z = at.z; prey.vel.x = prey.vel.y = prey.vel.z = 0; tick(g, idle()); }
    const travelled = Math.hypot(a.pos.x - from.x, a.pos.z - from.z);
    ok(travelled > L * 0.8, `${id}: the strike carries the body forward (${(travelled / L).toFixed(2)} body lengths)`);
    ok(prey.hp < hp0, `${id}: and lands on what it was aimed at (${hp0.toFixed(0)} -> ${prey.hp.toFixed(0)})`);
  }
}

// ---- crush bite cracks shells; floor sweep feeds standing ----
{
  const g = new Game('rise', [{ creature: 'rhinodipterus', device: 'keyboard', ready: true }, { creature: 'doryaspis', device: 0, ready: true }]);
  g.skipHatch();
  const [lung, dory] = g.players;
  const idle = () => new Map<number, InputFrame>([[0, emptyInput()], [1, emptyInput()]]);
  for (let i = 0; i < 90; i++) tick(g, idle());     // through the hatch-in, still protected
  for (const p of g.players) p.spawnProtect = 0;
  ok(lung.state === 'free', `the lungfish is ready to act (${lung.state})`);
  const shell = g.spawn('manticoceras', 'ambient', { x: lung.pos.x + Math.sin(lung.yaw) * lengthOf(lung) * 1.2, y: lung.pos.y, z: lung.pos.z + Math.cos(lung.yaw) * lengthOf(lung) * 1.2 }, 1.0);
  shell.spawnProtect = 0;
  const hp0 = shell.hp, at = { ...shell.pos };
  tick(g, new Map([[0, { ...emptyInput(), heavy: true }], [1, emptyInput()]]));
  let crushed = false;
  for (let i = 0; i < 60; i++) { shell.pos.x = at.x; shell.pos.y = at.y; shell.pos.z = at.z; shell.vel.x = shell.vel.z = 0; g.step(DT, idle()); if (g.events.some((e) => e.kind === 'shellCrush')) crushed = true; g.events.length = 0; }
  ok(crushed && shell.hp < hp0, `the crush bite cracks a shell (hp ${hp0.toFixed(0)} → ${shell.hp.toFixed(0)})`);
  const d = devActor(g, dory); const s0 = d.standing;
  dory.pos.y = groundHeight(g.world, dory.pos.x, dory.pos.z) + lengthOf(dory) * 0.3; dory.prevT.y = dory.pos.y;   // down on the sediment
  tick(g, new Map([[0, emptyInput()], [1, { ...emptyInput(), ability: true }]]));
  ok(dory.state === 'ability' && dory.hideMode === 'none', 'floor sweep is a timed sweep, not a hide');
  for (let i = 0; i < 60 * 2; i++) tick(g, idle());
  ok(d.standing > s0, `sweeping the floor feeds growth (${s0.toFixed(1)} → ${d.standing.toFixed(1)})`);
}

// ---- a pelagic sea: a deep column, tall scenery in it, bodies that live mid-water ----
{
  const { FLORA_PHYS } = await import('../src/sim/flora');
  ok(SURFACE_Y >= 60, `the Devonian water column is deep (surface at ${SURFACE_Y}, the Cambrian's is 40)`);
  ok(FLORA_PHYS.lilyColumn.h >= 8 && FLORA_PHYS.frondTower.h >= 5, `tall kinds reach into the column (lily ${FLORA_PHYS.lilyColumn.h}, frond tower ${FLORA_PHYS.frondTower.h})`);
  const g = new Game('rise', [{ creature: 'cladoselache', device: 'keyboard', ready: true }, { creature: 'bothriolepis', device: 0, ready: true }]);
  g.skipHatch();
  const [shark, plate] = g.players;
  const floorS = groundHeight(g.world, shark.pos.x, shark.pos.z), floorP = groundHeight(g.world, plate.pos.x, plate.pos.z);
  ok(coverAt(g.world, shark.pos, lengthOf(shark), []) > 0.2 && shark.pos.y > floorS + 0.3, `a swimmer hatches hidden in the plants, off the floor (cover ${coverAt(g.world, shark.pos, lengthOf(shark), []).toFixed(2)}, ${(shark.pos.y - floorS).toFixed(1)} up, ${(SURFACE_Y - floorS).toFixed(0)} of water)`);
  ok(plate.pos.y - floorP < 2, 'a crawler hatches on the floor');
  // lily crowns give cover high up, where a fish would use it
  const c = g.world.cover.find((cv) => cv.pos.y > floorS + 6);
  ok(!!c, 'there is cover well above the floor');
}

// ---- how a fish moves: slow astern, sharp when slow, a fast-start, and a leap ----
// A grown fish: everything hatches tiny now, and a leap is a body's own momentum against gravity,
// so the hatchling of this shark clears the surface by less than its own length.
{
  const g = new Game('reef', [{ creature: 'cladoselache', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const a = g.players[0];
  const step = (f: Partial<InputFrame> = {}) => { g.step(DT, new Map([[0, { ...emptyInput(), ...f } as InputFrame]])); const k = g.events.map((e) => e.kind); g.events.length = 0; return k; };
  for (let i = 0; i < 120; i++) step();
  // Left alone for the whole run: this measures how a fish swims, not what finds it while it does.
  const undisturbed = () => { a.spawnProtect = 999; a.hitStop = 0; };
  undisturbed();
  for (let i = 0; i < 150; i++) { step({ my: 1, camYaw: a.yaw }); undisturbed(); }
  const fwd = Math.hypot(a.vel.x, a.vel.z), yaw0 = a.yaw;
  let slowest = Infinity;
  for (let i = 0; i < 40; i++) { step({ my: -1, camYaw: yaw0 }); undisturbed(); slowest = Math.min(slowest, Math.hypot(a.vel.x, a.vel.z)); }
  ok(slowest < fwd * 0.2, `backing up is slow (forward ${fwd.toFixed(1)}, astern bottoms at ${slowest.toFixed(1)})`);
  ok(Math.abs(a.yaw - yaw0) > 0.8, `and the body turns sharply to face the new way (${Math.abs(a.yaw - yaw0).toFixed(2)} rad in two thirds of a second)`);
  for (let i = 0; i < 200; i++) { step(); undisturbed(); }
  const rest = Math.hypot(a.vel.x, a.vel.z);
  step({ my: 1, camYaw: a.yaw, burst: 1 });
  const dart = Math.hypot(a.vel.x, a.vel.z);
  ok(rest < fwd * 0.35 && dart > fwd * 0.8, `the first press of sprint from rest is a fast-start (${rest.toFixed(2)} -> ${dart.toFixed(1)} in one step)`);
  // the leap: drive at the surface and go through it, then splash back in
  a.pos.y = SURFACE_Y - 6; a.prevT.y = a.pos.y;
  let breached = 0, splashed = 0, peak = 0;
  for (let i = 0; i < 200; i++) { const k = step({ my: 1, camYaw: a.yaw, camPitch: -0.9, burst: 1, rise: true }); breached += k.filter((x) => x === 'breach').length; splashed += k.filter((x) => x === 'splash').length; peak = Math.max(peak, a.pos.y); }
  ok(breached > 0 && splashed > 0, `a fish driving at the surface leaves the water and comes back (${breached} leaps, ${splashed} splashes)`);
  ok(peak > SURFACE_Y + 1, `the leap clears the surface (peak ${(peak - SURFACE_Y).toFixed(1)} above it)`);
  ok(!a.airborne || a.pos.y > SURFACE_Y - 2, 'it is never airborne under water');
  // a crawler never does
  const g2 = new Game('rise', [{ creature: 'bothriolepis', device: 'keyboard', ready: true }]);
  g2.skipHatch();
  const b = g2.players[0];
  for (let i = 0; i < 120; i++) { g2.step(DT, new Map([[0, emptyInput()]])); g2.events.length = 0; }
  b.pos.y = SURFACE_Y - 3; b.prevT.y = b.pos.y; b.spawnProtect = 0;
  let crawlerBreach = false;
  for (let i = 0; i < 120; i++) { g2.step(DT, new Map([[0, { ...emptyInput(), my: 1, camYaw: b.yaw, burst: 1, rise: true }]])); if (g2.events.some((e) => e.kind === 'breach')) crawlerBreach = true; g2.events.length = 0; }
  ok(!crawlerBreach && b.pos.y <= SURFACE_Y, 'a crawler stays in the water');
}

// ---- nurseries are sanctuaries: quiet at the start, and the young are left alone in them ----
{
  const { nurseryAt } = await import('../src/sim/world');
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0];
  const bots = g.actors.filter((a) => a.controller === 'bot');
  ok(bots.every((b) => Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) > 120), `bots hatch in other nurseries (nearest ${Math.min(...bots.map((b) => Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))).toFixed(0)} away)`);
  ok(p.spawnProtect >= 8 - 1e-6, `a hatchling is protected for eight seconds (${p.spawnProtect})`);
  // a shark bot put right beside the hatchling in the nursery will not take it
  const { makeBrain } = await import('../src/sim/ai');
  const shark = g.spawn('cladoselache', 'bot', { x: p.pos.x + 5, y: p.pos.y, z: p.pos.z }, 1.0);
  shark.brain = makeBrain('needs', { ...nurseryAt(0) }, g.rng, { aggression: 1, reaction: 0.1, parrySkill: 0 });
  shark.brain.hunger = 10; shark.spawnProtect = 0; p.spawnProtect = 0;
  let targeted = false;
  for (let i = 0; i < 60 * 8; i++) { g.step(DT, new Map([[0, emptyInput()]])); g.events.length = 0; if ((shark.brain.goal === 'hunt' || shark.brain.goal === 'fight') && shark.brain.target === p.id) targeted = true; }
  ok(!targeted && isAlive(p) && p.hp === p.hpMax, `an unprovoked shark leaves the hatchling alone in the nursery (goal ${shark.brain.goal}, hp ${p.hp}/${p.hpMax})`);
  // outside a nursery, in open water, the same shark is a shark
  const g2 = new Game('reef', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g2.skipHatch();
  const q = g2.players[0];
  q.pos.x = 120; q.pos.z -= 420; q.prevT.x = q.pos.x; q.prevT.z = q.pos.z; g2.world.loadAround(q.pos); q.spawnProtect = 0;
  for (let i = 0; i < 60; i++) { g2.step(DT, new Map([[0, emptyInput()]])); g2.events.length = 0; }
  const shark2 = g2.spawn('cladoselache', 'bot', { x: q.pos.x + 6, y: q.pos.y, z: q.pos.z }, 1.0);
  shark2.brain = makeBrain('needs', { ...q.pos }, g2.rng, { aggression: 1, reaction: 0.1, parrySkill: 0 });
  shark2.brain.hunger = 10; shark2.spawnProtect = 0;
  let hunted = false;
  for (let i = 0; i < 60 * 6; i++) { g2.step(DT, new Map([[0, emptyInput()]])); g2.events.length = 0; if (shark2.brain.target === q.id) hunted = true; }
  ok(hunted, `in open water the shark hunts it (goal ${shark2.brain.goal})`);
}

// ---- bot respawn uses the non-player (-1) index inside nursery cover ----
{
  const { spawnInCover } = await import('../src/sim/devonian/swim');
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }], 77);
  g.skipHatch();
  g.rng = () => 0; // selects the first shelter; used to produce a negative array index for bots
  for (const id of ['eldredgeops', 'coccosteus'] as const) {
    const p = spawnInCover(g, nurseryAt(0), id, 0.3, -1);
    ok(p != null && [p.x, p.y, p.z].every(Number.isFinite), `${id} bot respawns at finite coordinates in cover`);
  }
}

// ---- a full match step is deterministic and stays alive ----
{
  const run = (seed: number) => {
    const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }], seed);
    g.skipHatch();
    const inputs = new Map<number, InputFrame>([[0, { ...emptyInput(), my: 1, burst: 1 }]]);
    for (let i = 0; i < 60 * 60; i++) tick(g, inputs);
    const p = g.players[0];
    return { x: p.pos.x, z: p.pos.z, standing: devActor(g, p).standing, actors: g.actors.length, alive: isAlive(p) || p.state === 'dead', status: g.state.status };
  };
  const a = run(77), b = run(77);
  ok(a.x === b.x && a.z === b.z && a.standing === b.standing && a.actors === b.actors, 'the same seed replays exactly');
  ok(a.status === 'playing', 'a minute in, nobody has won yet');
}

// ---- modes end ----
{
  const g = new Game('rise', [{ creature: 'dunkleosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const d = devActor(g, g.players[0]);
  d.standing = 100; d.stage = PRIME_STAGE; d.primeT = HOLD_TO_WIN - 0.01;
  tick(g, new Map([[0, emptyInput()]]));
  ok(g.state.status === 'won' && g.state.winner === 0, `holding Prime wins (${g.state.message})`);
  const modes: Mode[] = ['rise', 'hunted', 'reef'];
  for (const m of modes) { const gm = new Game(m, [{ creature: 'coccosteus', device: 'keyboard', ready: true }, { creature: 'cladoselache', device: 0, ready: true }]); gm.skipHatch(); for (let i = 0; i < 120; i++) tick(gm, new Map([[0, emptyInput()], [1, emptyInput()]])); ok(gm.state.status === 'playing', `${m} runs`); }

  // Rise is co-op, so its result is a milestone: the sea can be carried on into.
  ok(g.continueMatch() && g.state.status === 'playing' && g.endless, 'Rise carries on after it is won');
  ok(devActor(g, g.players[0]).primeT === 0, '...with the hold timer cleared');
  for (let i = 0; i < 60 * 100; i++) tick(g, new Map([[0, emptyInput()]]));
  ok(g.state.status === 'playing', '...and it does not win itself again');
}
{
  // Reef is co-op too; Hunter & Hunted is a contest between players and stays decided.
  ok(isCoop('rise') && isCoop('reef') && !isCoop('hunted'), 'rise and reef are co-op, hunted is versus');
  const hh = new Game('hunted', [{ creature: 'coccosteus', device: 'keyboard', ready: true }, { creature: 'cladoselache', device: 0, ready: true }]);
  hh.skipHatch();
  hh.state = { status: 'won', winner: 0, message: 'done' };
  ok(!hh.continueMatch() && hh.state.status === 'won', 'a versus verdict is final');
}

// ---- rise ----
// The era's first mode, the Cambrian's Rise: hatch small, moult up the five stages on what you
// eat, hold Prime. The shared `rise`
// case wins on tier, which the Devonian never advances, so the era hook decides it.
{
  const g = new Game('rise', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0];
  ok(devActor(g, p).stage === 0, 'Rise starts at Hatchling');
  ok(lengthOf(p) >= 0.6 - 1e-6, `a hatchling is no shorter than 0.6 units (${lengthOf(p).toFixed(2)})`);
  for (let s = 1; s <= PRIME_STAGE; s++) { devActor(g, p).standing = STAGE_AT[s]; for (let i = 0; i < 180; i++) tick(g, new Map([[0, emptyInput()]])); }
  ok(devActor(g, p).stage === PRIME_STAGE, 'feeding moults it all the way to Prime');
  ok(g.state.status === 'playing', 'reaching Prime is not the win on its own');
  for (let i = 0; i < HOLD_TO_WIN * 60 + 120; i++) tick(g, new Map([[0, emptyInput()]]));
  ok(g.state.status === 'won' && g.state.winner === 0, `holding Prime wins Rise (${g.state.message})`);
}

// ---- what the game draws is what the card shows ----
// Every Devonian portrait is a studio render of the model's own authored colours. Assigning a
// creature a palette in play would repaint it into something the player never picked, which is
// how Dunkleosteus ended up near-black in a match and pale grey-green on its card. The proposals
// stay in the viewer's dropdown; none of them is the default until the palette renders exist.
{
  const { CREATURE_SCHEMES, SCHEME_PROPOSALS, SCHEMES } = await import('../src/content/devonian/palettes');
  ok(Object.keys(CREATURE_SCHEMES).length === 0, `nothing is repainted in play (${Object.keys(CREATURE_SCHEMES).join(',') || 'none'})`);
  const ids = new Set(DEVONIAN.creatures.map((c) => c.id as string));
  const schemeIds = new Set(SCHEMES.map((s) => s.id));
  for (const [id, scheme] of Object.entries(SCHEME_PROPOSALS)) {
    ok(ids.has(id), `${id} is on the roster`);
    ok(schemeIds.has(scheme), `${id}'s proposed scheme ${scheme} exists`);
  }
  ok(Object.keys(SCHEME_PROPOSALS).length >= DEVONIAN.creatures.length - 1, `the research is kept as proposals (${Object.keys(SCHEME_PROPOSALS).length})`);
}

// ---- colour slots ----
// Every surface of a creature collapsing onto one slot paints it a single flat colour. That is
// how the roster shipped black: the Devonian art names materials for the slot ("titanichthys
// fins", "cheirolepis accent") and slotFor only knew the Cambrian convention, so all of it read
// as `body` — and Dunkleosteus's body is #383a3b.
{
  const { slotFor } = await import('../src/shared/palettes');
  const { SCHEMES: DEV_SCHEMES, CREATURE_SCHEMES: DEV_DEFAULTS } = await import('../src/content/devonian/palettes');
  const dir = 'public/assets/devonian/creatures';
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.glb') && !n.includes('.lod'))) {
    const id = f.replace('.glb', '');
    const buf = fs.readFileSync(`${dir}/${f}`);
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString());
    const names: string[] = (json.materials ?? []).map((m: { name?: string }) => m.name ?? '');
    if (names.length < 2) continue;
    const slots = new Set(names.map(slotFor));
    ok(slots.size > 1, `${id} paints from more than one colour slot (${[...slots].join(', ')})`);
    const sch = DEV_SCHEMES.find((s) => s.id === DEV_DEFAULTS[id]);
    if (sch?.colors) {
      // Reflectance of the darkest slot it actually uses, in linear light.
      const lin = (hex: string) => { const n = parseInt(hex.slice(1), 16);
        const c = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * c((n >> 16) & 255) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255); };
      const used = [...slots].filter((s) => s !== 'eyes');
      const mean = used.reduce((a, s) => a + lin(sch.colors![s]), 0) / used.length;
      ok(mean > 0.06, `${id} is not a silhouette in ${sch.name} (mean albedo ${mean.toFixed(3)})`);
    }
  }
}

console.log(`PASS: ${passes} Devonian checks`);
