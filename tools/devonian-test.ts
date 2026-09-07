/**
 * Devonian Domination: the era pack, its rung bands, standing, air, dead water, shore reach,
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
const { stateFor, devActor, STAGE_SCALE } = await import('../src/sim/devonian/state');
const { bandOf, isAlive, lengthOf } = await import('../src/sim/actors');
const { creature } = await import('../src/sim/creatures');
const { emptyInput } = await import('../src/sim/types');
const { shoreZ, shoreDistance, SURFACE_Y } = await import('../src/sim/world');
type InputFrame = import('../src/sim/types').InputFrame;
type Mode = import('../src/sim/types').Mode;
type CreatureId = import('../src/sim/creatures').CreatureId;

const DT = 1 / 60;
/** Step and drain the event queue as the renderer would. */
const tick = (g: InstanceType<typeof Game>, inputs: Map<number, InputFrame>) => { g.step(DT, inputs); g.events.length = 0; };
let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };

// ---- the pack ----
ok(DEVONIAN.creatures.length === 21, 'roster is the 21 subjects of the brief');
ok(DEVONIAN.modes.map((m) => m.id).join() === 'domination,foodchain,hunted,reef', 'modes in selection order');
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
for (const c of DEVONIAN.creatures) {
  const standIn = DEVONIAN.assets.standIns?.[c.id];
  if (DEVONIAN_SHIPPED.includes(c.id)) ok(!standIn, `${c.id} is delivered and uses its own model`);
  else ok(!!standIn && DEVONIAN_SHIPPED.includes(standIn) && fs.existsSync(`public/${paths.model(c.id)}`) && fs.existsSync(`public/${paths.model(c.id, 1)}`), `${c.id} is pending and stands in as ${standIn}`);
}
const opener = DEVONIAN.audio.music.find((t) => t.opening);
ok(opener && fs.existsSync(`public/${paths.music(opener.name)}`.replace('%20', ' ')), `the opening track is delivered (${opener?.name})`);
ok(RULES !== undefined && !RULES.growthByNutrition, 'Devonian rules active: growth is by standing, not nutrition');

// ---- rung bands: same rung fights, one apart hunts, two apart is a snack ----
{
  const g = new Game('reef', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  const at = (id: CreatureId) => g.spawn(id, 'ambient', { x: 0, y: -10, z: 60 }, 1.0);
  const pairs: [CreatureId, CreatureId, string[]][] = [
    ['coccosteus', 'cheirolepis', ['rival', 'prey', 'threat']],      // II vs II
    ['cladoselache', 'coccosteus', ['prey', 'threat']],             // III vs II: hunter and hunted
    ['dunkleosteus', 'cladoselache', ['prey', 'threat']],           // IV vs III
    ['dunkleosteus', 'eldredgeops', ['snack']],                     // IV vs I: beneath notice
    ['eldredgeops', 'walliserops', ['rival', 'prey', 'threat']],    // I vs I
  ];
  for (const [a, b, allowed] of pairs) {
    const band = bandOf(at(a), at(b));
    ok(allowed.includes(band), `${a} sees ${b} as ${band} (allowed: ${allowed.join('/')})`);
  }
  ok(bandOf(at('eldredgeops'), at('dunkleosteus')) === 'giant', 'a trilobite sees Dunkleosteus as a giant');
  ok(bandOf(at('coccosteus'), at('titanichthys')) === 'giant', 'Titanichthys reads as a giant to the shoal');
}

// ---- start scales and modes ----
{
  const dom = new Game('domination', [{ creature: 'eldredgeops', device: 'keyboard', ready: true }, { creature: 'dunkleosteus', device: 0, ready: true }]);
  for (const p of dom.players) ok(Math.abs(p.scale - STAGE_SCALE[0]) < 1e-6, `${p.creature} starts Young in Domination`);
  ok(Math.abs(lengthOf(dom.players[1]) / lengthOf(dom.players[0]) - 9.5 / 0.85) < 1e-3, 'rungs keep their size ratio at the same stage');
  const bots = dom.actors.filter((a) => a.controller === 'bot');
  ok(bots.length === 2, 'Domination fills to four with bots');
  const reef = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }]);
  ok(Math.abs(reef.players[0].scale - STAGE_SCALE[1]) < 1e-6 && devActor(reef, reef.players[0]).standing === 50, 'Reef starts Adult at half standing');
  const fc = new Game('foodchain', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  const rungs = fc.actors.filter((a) => a.controller === 'player' || a.controller === 'bot').map((a) => creature(a.creature).rung);
  ok(new Set(rungs).size === rungs.length, `Food Chain bots take rungs nobody holds (${rungs.join(',')})`);
}

// ---- standing, staging and no tier growth ----
{
  const g = new Game('domination', [{ creature: 'coccosteus', device: 'keyboard', ready: true }]);
  const p = g.players[0]; const d = devActor(g, p);
  const tier0 = p.tier;
  // feed it by hand: 40 nutrition worth of shoal
  for (let i = 0; i < 20; i++) RULES!.onNutrition(g, p, 2, undefined);
  ok(d.standing > 0, `feeding raises standing (${d.standing.toFixed(1)})`);
  ok(d.recent.includes('feed'), 'the ticker records the source');
  // idle at the nursery a rung II still scores: nobody of its rung stands above it, so it holds range
  const idleBefore = d.standing;
  for (let i = 0; i < 600; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(d.standing > idleBefore && d.recent.includes('range'), `holding range scores (${idleBefore.toFixed(1)} → ${d.standing.toFixed(1)}; ${d.recent.join(',')})`);
  ok(p.tier === tier0, 'nutrition never changes the tier in the Devonian');
  // out on the sand nothing scores, and a standing nobody works for slips
  const g2 = new Game('domination', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }]);
  const t = g2.players[0], d2 = devActor(g2, t);
  t.pos.z = shoreZ(t.pos.x); t.prevT.z = t.pos.z; d2.standing = 40; d2.sinceGain = 30;
  for (let i = 0; i < 600; i++) tick(g2, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(d2.beached, 'Tiktaalik on the sand is beached');
  ok(d2.standing < 40 && d2.standing > 30, `standing decays when nothing is done for it (40 → ${d2.standing.toFixed(1)})`);
  // straight to Prime: the stage changes with the moult ceremony, the rung never does
  // one stage per moult ceremony: standing can run ahead, the body catches up after each moult
  for (let i = 0; i < 80; i++) RULES!.onNutrition(g, p, 10, undefined);
  ok(d.stage === 1 && p.state === 'moult', `the first ceremony takes it to Adult (stage ${d.stage}, ${p.state})`);
  for (let i = 0; i < 60 * 3; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  RULES!.onNutrition(g, p, 1, undefined);
  ok(d.stage === 2 && p.state === 'moult', `standing 60+ reaches Prime after the next ceremony (stage ${d.stage}, ${p.state})`);
  for (let i = 0; i < 60 * 3; i++) tick(g, new Map<number, InputFrame>([[0, emptyInput()]]));
  ok(Math.abs(p.scale - STAGE_SCALE[2]) < 1e-6, 'Prime is the largest the body gets');
  ok(creature(p.creature).rung === 2, 'still rung II');
  const hud = RULES!.hud(g, 0)!;
  ok(hud.rung === 2 && hud.rungName === 'Shoal' && hud.standing === d.standing, 'HUD reports rung, name and standing');
  ok(RULES!.hint(g, 0) === undefined || typeof RULES!.hint(g, 0) === 'string', 'hint is optional text');
}

// ---- air: lungs need the surface ----
{
  const g = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }, { creature: 'coccosteus', device: 0, ready: true }]);
  const [tik, coc] = g.players;
  const dt = devActor(g, tik), dc = devActor(g, coc);
  tik.pos.y = SURFACE_Y - 20; coc.pos.y = SURFACE_Y - 20;
  const inputs = new Map<number, InputFrame>([[0, { ...emptyInput(), sink: true }], [1, { ...emptyInput(), sink: true }]]);
  for (let i = 0; i < 60 * 20; i++) tick(g, inputs);
  ok(dt.air < 0.75 && dt.air > 0.5, `Tiktaalik spends air under water (${dt.air.toFixed(2)} after 20 s)`);
  ok(dc.air === 1 && RULES!.hud(g, 1)!.air === undefined, 'gill breathers have no air meter');
  ok(RULES!.hud(g, 0)!.air === dt.air, 'the air meter is on the HUD');
  const rise = new Map<number, InputFrame>([[0, { ...emptyInput(), rise: true }], [1, emptyInput()]]);
  for (let i = 0; i < 60 * 30 && dt.air < 0.999; i++) tick(g, rise);
  ok(dt.air > 0.99, `surfacing refills the lungs (${dt.air.toFixed(2)})`);
}

// ---- dead water: gills suffer, lungs do not, leaving scores ----
{
  const g = new Game('domination', [{ creature: 'coccosteus', device: 'keyboard', ready: true }, { creature: 'tiktaalik', device: 0, ready: true }]);
  const [coc, tik] = g.players;
  tik.pos.x = coc.pos.x + 8; tik.pos.z = coc.pos.z; tik.pos.y = coc.pos.y; tik.prevT.x = tik.pos.x; tik.prevT.z = tik.pos.z;
  const s = stateFor(g);
  s.deadZones.push({ pos: { x: coc.pos.x, y: coc.pos.y, z: coc.pos.z }, r: 40, age: 30, life: 120, drift: { x: 0, y: 0, z: 0 } });
  const hp0 = coc.hp, hpT = tik.hp;
  const still = new Map<number, InputFrame>([[0, emptyInput()], [1, emptyInput()]]);
  for (let i = 0; i < 60 * 8; i++) tick(g, still);
  const dc = devActor(g, coc), dt = devActor(g, tik);
  ok(dc.deadZoneIn && dt.deadZoneIn, 'both are inside the zone');
  ok(coc.hp < hp0 && coc.stamina < coc.staminaMax * 0.5, `dead water drains a gill breather (hp ${hp0.toFixed(0)} → ${coc.hp.toFixed(0)}, stamina ${coc.stamina.toFixed(0)})`);
  ok(tik.hp >= hpT - 1e-6 && devActor(g, tik).deadT === 0, `an air breather is untouched by anoxia (hp ${hpT.toFixed(1)} → ${tik.hp.toFixed(1)}, deadT ${devActor(g, tik).deadT})`);
  ok(RULES!.hud(g, 0)!.deadZones.length === 1 && RULES!.hud(g, 0)!.inDeadZone, 'the HUD carries the zone for the radar');
  const before = dc.standing;
  s.deadZones.length = 0;
  tick(g, still);
  ok(dc.standing > before, `surviving dead water scores (${before.toFixed(1)} → ${dc.standing.toFixed(1)})`);
}

// ---- shore reach: limbs get past the wall, fins do not ----
{
  const g = new Game('reef', [{ creature: 'tiktaalik', device: 'keyboard', ready: true }, { creature: 'coccosteus', device: 0, ready: true }]);
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

// ---- a full match step is deterministic and stays alive ----
{
  const run = (seed: number) => {
    const g = new Game('domination', [{ creature: 'coccosteus', device: 'keyboard', ready: true }], seed);
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
  const g = new Game('domination', [{ creature: 'dunkleosteus', device: 'keyboard', ready: true }]);
  const d = devActor(g, g.players[0]);
  d.standing = 100; d.dominantT = 89.99;
  tick(g, new Map([[0, emptyInput()]]));
  ok(g.state.status === 'won' && g.state.winner === 0, `holding Dominant wins (${g.state.message})`);
  const modes: Mode[] = ['domination', 'foodchain', 'hunted', 'reef'];
  for (const m of modes) { const gm = new Game(m, [{ creature: 'coccosteus', device: 'keyboard', ready: true }, { creature: 'cladoselache', device: 0, ready: true }]); for (let i = 0; i < 120; i++) tick(gm, new Map([[0, emptyInput()], [1, emptyInput()]])); ok(gm.state.status === 'playing', `${m} runs`); }
}

console.log(`PASS: ${passes} Devonian checks`);
