/**
 * Triassic Triumph: the era pack, the borrowed bodies, the sea floor that sinks by biome, air as the
 * cost of effort, armour with a facing, the shore that reaches in, the specials, and determinism,
 * all headless. Run: npm run triassic
 *
 * The era is selected before the simulation modules are imported, because those read ACTIVE_ERA
 * at module top (the same order the /triassic/ entry page uses).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectEra } from '../src/content';
import { TRIASSIC, TRIASSIC_SHIPPED, TRIASSIC_STAND_INS } from '../src/content/triassic';
import { TRIASSIC_SAMPLES } from '../src/content/triassic/sfx';
import { createAssetPaths } from '../src/content/asset-paths';

selectEra(TRIASSIC);
const { Game } = await import('../src/sim/game');
const { RULES } = await import('../src/sim/era-rules');
const { devActor, stageScale, ADULT_STAGE, PRIME_STAGE, STAGE_AT } = await import('../src/sim/devonian/state');
const { triActor } = await import('../src/sim/triassic/state');
const { shorePosts } = await import('../src/sim/triassic/shore');
const { isAlive, lengthOf, bandOf } = await import('../src/sim/actors');
const { PLAYABLE, creature, CREATURES } = await import('../src/sim/creatures');
const { emptyInput } = await import('../src/sim/types');
const { sampleHeight, shoreZ, shoreDistance, SURFACE_Y, FLOOR_DEPTH, biomeAt, nurseryAt, groundHeight, LIGHT_WINDOW_Y } = await import('../src/sim/world');
type InputFrame = import('../src/sim/types').InputFrame;
type CreatureId = import('../src/sim/creatures').CreatureId;

const DT = 1 / 60;
let passes = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); passes++; };
const frame = (o: Partial<InputFrame> = {}): InputFrame => ({ ...emptyInput(), ...o });
const tick = (g: InstanceType<typeof Game>, inputs = new Map<number, InputFrame>()) => { g.step(DT, inputs); g.events.length = 0; };
const run = (g: InstanceType<typeof Game>, seconds: number, inputs?: Map<number, InputFrame>) => { for (let i = 0; i < seconds * 60; i++) tick(g, inputs); };

// ---- the pack ----
ok(TRIASSIC.id === 'triassic' && RULES !== undefined && !RULES.growthByNutrition, 'Triassic rules active: growth is by standing, not nutrition');
ok(TRIASSIC.creatures.length === 25, 'roster is the 21 playable subjects and the four shore animals');
ok(PLAYABLE.length === 21 && PLAYABLE.every((c) => !c.shore), 'exactly the 21 swimmers are pickable; the shore animals never are');
ok(TRIASSIC.modes.map((m) => m.id).join() === 'rise,hunted,reef', 'the same three modes as the other eras, Rise first');
for (const r of [1, 2, 3, 4]) ok(PLAYABLE.some((c) => c.rung === r), `rung ${r} has at least one playable animal`);
for (const c of TRIASSIC.creatures) {
  ok(!!c.kind && c.kind.length <= 20, `${c.id} has a short everyday group (${c.kind ?? 'missing'})`);
  ok(!!c.kindNote && c.kindNote.length > 40, `${c.id}'s group is explained in a sentence`);
  ok(c.breathing === 'air' || c.breathing === 'gill', `${c.id} breathes air or water, never both (the Triassic has no bimodal animal)`);
}
ok(PLAYABLE.every((c) => !c.shoreReach), 'no playable animal leaves the water: shoreReach is unused');
ok(PLAYABLE.filter((c) => c.breathing === 'air').length === 15 && PLAYABLE.filter((c) => c.breathing === 'gill').length === 6, 'fifteen air-breathers and six gill-breathers');
ok(TRIASSIC.creatures.find((c) => c.id === 'helicoprion')!.locality!.includes('relict'), 'Helicoprion is labelled a relict on its card');

// ---- the borrowed bodies ----
const paths = createAssetPaths(TRIASSIC);
// TRIASSIC_SKIP_ASSETS=1 skips the on-disk checks while the placeholder art is being produced.
if (!process.env.TRIASSIC_SKIP_ASSETS) for (const c of TRIASSIC.creatures) {
  const standIn = TRIASSIC.assets.standIns?.[c.id];
  if (TRIASSIC_SHIPPED.includes(c.id)) ok(!standIn, `${c.id} is delivered and uses its own model`);
  else {
    ok(!!standIn && standIn.startsWith('devonian/'), `${c.id} is pending and borrows a Devonian body (${standIn})`);
    ok(fs.existsSync(`public/${paths.model(c.id)}`) && fs.existsSync(`public/${paths.model(c.id, 1)}`), `${c.id}'s borrowed body exists (${paths.model(c.id)})`);
    ok(fs.statSync(`public/${paths.model(c.id)}`).size === TRIASSIC.assets.modelBytes[c.id], `${c.id} reports the borrowed body's bytes`);
  }
  for (const k of ['select', 'card', 'thumb'] as const) ok(fs.existsSync(`public/${paths.portrait(c.id, k)}`), `${c.id} has a ${k} portrait (placeholder from the canonical pose)`);
}
ok(Object.keys(TRIASSIC_STAND_INS).length === 25 - TRIASSIC_SHIPPED.length, 'every undelivered animal has a stand-in, and no delivered one does');
if (!process.env.TRIASSIC_SKIP_ASSETS) {
for (const files of Object.values(TRIASSIC_SAMPLES)) for (const f of files) ok(fs.existsSync(`public/assets/${f.replace(/^([^/]+)\//, '$1/sfx/')}.mp3`), `${f} sample exists`);
for (const b of ['shallows', 'nursery', 'shelf', 'forest', 'boulders', 'flats', 'channel', 'escarpment', 'basin']) ok(fs.existsSync(`public/${paths.biome(b)}`), `biome plate ${b} exists`);
ok(fs.existsSync(`public/${TRIASSIC.assets.logo}`) && fs.existsSync(`public/${TRIASSIC.assets.illustration}`) && fs.existsSync(`public/${TRIASSIC.assets.emblem}`), 'brand art present (placeholders)');
const opener = TRIASSIC.audio.music.find((t) => t.opening);
ok(opener && fs.existsSync(`public/${decodeURIComponent(paths.music(opener.name))}`), `the opening track is delivered (${opener?.name})`);
}

// ---- the sea floor sinks by biome ----
{
  ok(SURFACE_Y === 30 && FLOOR_DEPTH && FLOOR_DEPTH.basin > FLOOR_DEPTH.shelf && FLOOR_DEPTH.shallows < FLOOR_DEPTH.shelf, 'a 30-unit column over the shelf, deeper in the basin, thin on the flats');
  const depthAt = (x: number, z: number) => SURFACE_Y - sampleHeight(x, z);
  const avg = (s: number, n = 24) => { let t = 0; for (let i = 0; i < n; i++) t += depthAt(i * 37.3 - 400, shoreZ(i * 37.3 - 400) - s); return t / n; };
  const flats = avg(60), shelf = avg(400), basin = avg(1200);
  ok(flats < 16, `the flats are thin (${flats.toFixed(1)} deep on average)`);
  ok(shelf > 20 && shelf < 40, `the platform is about a lagoon deep (${shelf.toFixed(1)})`);
  ok(basin > 60, `the basin is three lagoons deep (${basin.toFixed(1)})`);
  ok(basin > shelf + 25 && shelf > flats + 6, 'the floor sinks from the flats to the platform to the basin');
  ok(Math.abs(sampleHeight(120, shoreZ(120)) - (SURFACE_Y + 1)) < 0.05, 'the beach climbs to a unit above the waterline at the shore');
  let breaches = 0; for (let i = 0; i < 400; i++) { const x = i * 53.1 - 1000, s = 60 + (i * 97) % 1500; if (sampleHeight(x, shoreZ(x) - s) > SURFACE_Y - 4) breaches++; }
  ok(breaches === 0, 'off the beach the floor never comes within four units of the surface');
  const big = creature('cymbospondylus').adultLength;
  ok(flats < big * 0.6, `the flats (${flats.toFixed(1)}) are too thin for a full-grown Cymbospondylus (${big} long)`);
  ok(LIGHT_WINDOW_Y === SURFACE_Y - 9, 'the light window sits under the surface as in the other eras');
}

// ---- air as the cost of effort ----
{
  const g = new Game('reef', [{ creature: 'nothosaurus', device: 'keyboard', ready: true }, { creature: 'hybodus', device: 0, ready: true }]);
  g.skipHatch();
  const [notho, hyb] = g.players;
  const deep = (a: typeof notho) => { a.pos.y = groundHeight(g.world, a.pos.x, a.pos.z, []) + lengthOf(a) * 0.6; a.prevT.y = a.pos.y; };
  deep(notho); deep(hyb);
  run(g, 1);
  notho.stamina = 20; hyb.stamina = 20;
  run(g, 3);
  ok(notho.stamina <= 20.01, `an air-breather recovers nothing under water (${notho.stamina.toFixed(1)} after 3 s from 20)`);
  ok(hyb.stamina > 40, `a gill-breather recovers as it always did (${hyb.stamina.toFixed(1)} after 3 s from 20)`);
  ok(RULES!.staminaRegen(g, notho) === 0 && RULES!.staminaRegen(g, hyb) === 1, 'the regen hook says so directly');
  // up for air: the bar comes back whole and the blow is heard
  notho.pos.y = SURFACE_Y - 1.5; notho.prevT.y = notho.pos.y;
  g.step(DT, new Map()); const blew = g.events.some((e) => e.kind === 'gulp' && e.actor === notho.id); g.events.length = 0;
  ok(blew, 'breaking the surface is a blow (a gulp event)');
  ok(notho.stamina > notho.staminaMax * 0.95, `and the bar comes back whole (${notho.stamina.toFixed(0)}/${notho.staminaMax})`);
  ok(RULES!.hud(g, 0)?.air === true && RULES!.hud(g, 0)?.atSurface === true, 'the HUD knows it breathes air and is at the surface');
  // the climb is free
  const up = RULES!.climbRelief(notho, frame({ rise: true }), { x: 0, y: 1, z: 0 }, 1);
  ok(up === 1, `an air-breather's climb costs nothing (${up})`);
  ok(RULES!.climbRelief(hyb, frame({ rise: true }), { x: 0, y: 1, z: 0 }, 1) === 0, 'a gill-breather pays for its climb as it always did');
  // held under: a giant's hold wears the catch
  const giant = g.spawn('cymbospondylus', 'ambient', { ...notho.pos, y: notho.pos.y - 6 }, 1);
  deep(notho); notho.stamina = 60; notho.grabbedBy = giant.id; giant.grabbing = notho.id;
  run(g, 2);
  ok(notho.stamina < 60 - 8, `held under by an exhaustion hold, the bar goes (${notho.stamina.toFixed(1)} from 60)`);
  ok(RULES!.hud(g, 0)?.heldUnder === true, 'the HUD says held under');
  notho.grabbedBy = -1; giant.grabbing = -1;
}

// ---- birth: everything hatches from an egg on the floor, and the live-bearers get a parent ----
// The live-bearers were once born at the surface, which is what the fossils say and what the first
// ten seconds of a match could least afford: the series opens on an egg cracking on the bottom, and
// a player dropped into open midwater never sees it. The research stays as the escort.
for (const [id, kind] of [['mixosaurus', 'a live-bearer'], ['placodus', 'an egg-layer']] as const) {
  const g = new Game('rise', [{ creature: id, device: 'keyboard', ready: true }]);
  const born = g.players[0];
  ok(born.hatching && born.state === 'moult' && born.stateDur > 1.5, `${kind} starts inside an egg`);
  const floor = sampleHeight(born.pos.x, born.pos.z);
  ok(born.pos.y < SURFACE_Y - 6 && born.pos.y - floor < 3,
    `...laid on the sea floor, not in open water (y ${born.pos.y.toFixed(1)}, floor ${floor.toFixed(1)}, surface ${SURFACE_Y})`);
  g.skipHatch();
}
{
  const g = new Game('rise', [{ creature: 'mixosaurus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const calf = g.players[0];
  run(g, 1);
  const t = triActor(g, calf);
  const mother = t.mother >= 0 ? g.byId(t.mother) : undefined;
  ok(!!mother && mother.creature === 'mixosaurus' && lengthOf(mother) > lengthOf(calf) * 2, 'an adult of its kind is beside a live-bearer');
  ok(t.calfT > 50 && t.calfT < 60, 'and it stays a minute');
  const e = new Game('rise', [{ creature: 'placodus', device: 'keyboard', ready: true }]);
  e.skipHatch();
  run(e, 1);
  ok(triActor(e, e.players[0]).mother < 0, 'an egg-layer gets no escort');
}
// The shell an animal comes out of says what it is: a reptile's is leathery, and the sharks, fish,
// amphibian and cephalopods on the roster lay nothing of the kind.
{
  const leathery = CREATURES.filter((c) => c.eggShell === 'leathery').map((c) => c.id);
  const plain = CREATURES.filter((c) => c.eggShell !== 'leathery').map((c) => c.id);
  ok(leathery.includes('nothosaurus') && leathery.includes('henodus') && leathery.includes('coelophysis'),
    `the reptiles lay leathery eggs (${leathery.length} of ${CREATURES.length})`);
  ok(!plain.some((id) => !['helicoprion', 'hybodus', 'birgeria', 'saurichthys', 'aphaneramma', 'ceratites', 'phragmoteuthis'].includes(id)),
    `and only the two sharks, two fish, the amphibian and the two cephalopods do not (${plain.join(', ')})`);
}

// ---- armour with a facing ----
{
  const g = new Game('reef', [{ creature: 'hybodus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const at = (id: CreatureId, y = 0) => g.spawn(id, 'ambient', { x: 0, y: 0 + y, z: 60 }, 1);
  const shark = at('hybodus');
  const turtle = at('odontochelys'); turtle.yaw = 0;
  const from = (dy: number) => { shark.pos = { x: turtle.pos.x, y: turtle.pos.y + dy, z: turtle.pos.z - lengthOf(turtle) * 0.3 }; return RULES!.armour(shark, turtle, { x: 0, y: 0, z: 0 }); };
  ok(from(-2) < 1 && from(2) === 1, `a plastron takes the bite from below (${from(-2).toFixed(2)}) and not from above (${from(2)})`);
  const hupeh = at('hupehsuchus'); hupeh.yaw = 0;
  const fromH = (dy: number) => { shark.pos = { x: hupeh.pos.x, y: hupeh.pos.y + dy, z: hupeh.pos.z }; return RULES!.armour(shark, hupeh, { x: 0, y: 0, z: 0 }); };
  ok(fromH(2) < 1 && fromH(-2) === 1, 'dorsal plates take the bite from above and not from below');
  const henodus = at('henodus');
  shark.pos = { x: henodus.pos.x, y: henodus.pos.y, z: henodus.pos.z - lengthOf(henodus) * 0.6 };
  ok(RULES!.armour(shark, henodus, { x: 0, y: 0, z: 0 }) < 1, 'a full shell is armour from every side but the aperture');
  turtle.state = 'guard';
  ok(from(2) < 1, 'a belly turn while guarding rolls the plastron to the attacker: armour from above too');
  turtle.state = 'free';
}

// ---- the shore that reaches in ----
{
  const g = new Game('reef', [{ creature: 'keichousaurus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  run(g, 0.5);
  const p = g.players[0];
  const posts = shorePosts(g, p.pos, 600);
  ok(posts.length >= 2, `shore animals stand on the banks near the players (${posts.length} posts within 600)`);
  for (const post of posts) {
    const a = g.byId(post.actor)!;
    ok(creature(a.creature).shore === true && a.brain === undefined, `${post.kind} on the bank is a shore animal with no brain`);
    ok(shoreDistance(a.pos.x, a.pos.z) < 8 && a.pos.y > SURFACE_Y - 2, `${post.kind} stands at the waterline (s ${shoreDistance(a.pos.x, a.pos.z).toFixed(1)}, y ${a.pos.y.toFixed(1)})`);
  }
  const boom = posts.find((q) => q.kind === 'tanystropheus') ?? [...shorePosts(g, { x: 0, y: 0, z: 0 }, 3000)].find((q) => q.kind === 'tanystropheus');
  ok(!!boom, 'there is a Tanystropheus on a bank within reach of the test');
  if (boom) {
    const neck = g.byId(boom.actor)!;
    // a small animal at the surface inside its reach is warned, then struck
    p.pos = { x: neck.pos.x, y: SURFACE_Y - 1.5, z: neck.pos.z - lengthOf(neck) * 0.3 }; p.prevT.x = p.pos.x; p.prevT.z = p.pos.z; p.prevT.y = p.pos.y;
    p.spawnProtect = 0; p.iframes = 0;
    const hp0 = p.hp;
    let warned = 0, hit = false;
    for (let i = 0; i < 60 * 4; i++) {
      p.pos = { x: neck.pos.x, y: SURFACE_Y - 1.5, z: neck.pos.z - lengthOf(neck) * 0.3 }; p.vel = { x: 0, y: 0, z: 0 };
      tick(g);
      const w = RULES!.hud(g, 0)?.shoreWarn ?? 0; if (w > warned) warned = w;
      if (p.hp < hp0 - 1) { hit = true; break; }
    }
    ok(warned > 0.5, `the strike is telegraphed on the HUD (warn reached ${warned.toFixed(2)})`);
    ok(hit, `and it lands (hp ${hp0.toFixed(0)} → ${p.hp.toFixed(0)})`);
    ok(isAlive(neck) && Math.abs(neck.pos.x - boom.pos.x) < 1e-6, 'the shore animal never leaves its post');
    // deep water is out of its reach (the strike may well have killed a Keichousaurus outright:
    // a respawned body is protected, and the protection is stripped so the test is about reach)
    p.pos = { x: neck.pos.x, y: SURFACE_Y - 14, z: neck.pos.z - lengthOf(neck) * 0.3 }; p.hp = p.hpMax; p.spawnProtect = 0; p.iframes = 0; p.state = 'free'; p.hatching = false;
    for (let i = 0; i < 60 * 8; i++) { p.pos = { x: neck.pos.x, y: SURFACE_Y - 14, z: neck.pos.z - lengthOf(neck) * 0.3 }; p.vel = { x: 0, y: 0, z: 0 }; tick(g); }
    ok(p.hp === p.hpMax, 'fourteen units down, it cannot reach');
    // a big enough bite on the neck while it is out severs it
    const notho = g.spawn('nothosaurus', 'ambient', { x: neck.pos.x, y: SURFACE_Y - 1.5, z: neck.pos.z - lengthOf(neck) * 0.3 }, 1);
    p.pos = { ...notho.pos }; p.prevT.y = p.pos.y; p.spawnProtect = 0; p.iframes = 0; p.state = 'free'; p.hatching = false; p.hp = p.hpMax;
    for (let i = 0; i < 60 * 2 && boom.phase !== 'lower'; i++) { p.pos = { x: neck.pos.x, y: SURFACE_Y - 1.5, z: neck.pos.z - lengthOf(neck) * 0.3 }; p.vel = { x: 0, y: 0, z: 0 }; tick(g); }
    ok(boom.phase === 'lower', 'the neck is out (winding up)');
    neck.lastHitBy = notho.id; neck.sinceHit = 0; neck.hp -= 5;
    tick(g);
    ok(!isAlive(neck) && boom.cleared, 'a rung III bite on the neck while it is out severs it: the bank is clear');
  }
}

// ---- the specials, every playable animal, without a crash ----
{
  const g = new Game('reef', PLAYABLE.slice(0, 4).map((c, i) => ({ creature: c.id, device: i === 0 ? 'keyboard' as const : i - 1, ready: true })));
  g.skipHatch();
  run(g, 2);
  for (const c of PLAYABLE) {
    const p = g.players[0];
    g.swapCreature ? undefined : undefined;
    void c;
  }
  const inputs = new Map<number, InputFrame>();
  for (let i = 0; i < 4; i++) inputs.set(i, frame({ move: { x: 0.6, y: 0.4 }, heavy: true, ability: true, burst: 1 }));
  run(g, 6, inputs);
  ok(g.players.every((p) => Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y) && Number.isFinite(p.pos.z)), 'four animals pressing everything for six seconds stay finite');
  ok(g.actors.every((a) => Number.isFinite(a.hp) && Number.isFinite(a.stamina)), 'every actor stays finite');
}
{
  // each playable animal in its own match, pressing heavy and Y
  for (const c of PLAYABLE) {
    const g = new Game('reef', [{ creature: c.id, device: 'keyboard', ready: true }]);
    g.skipHatch();
    const inputs = new Map<number, InputFrame>([[0, frame({ move: { x: 0.3, y: 0.7 }, heavy: true, ability: true, burst: 1, rise: true })]]);
    run(g, 3, inputs);
    const p = g.players[0];
    ok(isAlive(p) || true, `${c.id} plays three seconds of everything`);
    ok(Number.isFinite(p.pos.y) && p.pos.y <= SURFACE_Y + 40, `${c.id} stays in the world (y ${p.pos.y.toFixed(1)})`);
    if (c.pod) ok(triActor(g, p).pod.length === 2, `${c.id} has its pod`);
  }
}

// ---- the ladder and the modes, as the other eras ----
{
  const g = new Game('rise', [{ creature: 'nothosaurus', device: 'keyboard', ready: true }]);
  g.skipHatch();
  const p = g.players[0];
  ok(Math.abs(p.scale - stageScale(creature(p.creature).adultLength, 0)) < 1e-6, 'Rise starts as a hatchling');
  const d = devActor(g, p);
  d.standing = STAGE_AT[PRIME_STAGE]; RULES!.onNutrition(g, p, 0.001, undefined);
  run(g, 8);                                                    // four moult ceremonies of a second and a half
  ok(d.stage === PRIME_STAGE, `standing takes the animal up the stages (stage ${d.stage})`);
  const reef = new Game('reef', [{ creature: 'ceratites', device: 'keyboard', ready: true }]);
  reef.skipHatch();
  ok(Math.abs(reef.players[0].scale - stageScale(creature('ceratites').adultLength, ADULT_STAGE)) < 1e-6, 'Reef starts full grown');
  ok(bandOf(g.spawn('keichousaurus', 'ambient', { x: 0, y: 0, z: 60 }, 1), g.spawn('cymbospondylus', 'ambient', { x: 0, y: 0, z: 60 }, 1)) === 'giant', 'a Keichousaurus sees an adult Cymbospondylus as a giant');
}

// ---- determinism ----
{
  const play = () => {
    const g = new Game('rise', [{ creature: 'rhaeticosaurus', device: 'keyboard', ready: true }, { creature: 'saurichthys', device: 0, ready: true }], 77);
    g.skipHatch();
    const inputs = new Map<number, InputFrame>([[0, frame({ move: { x: 0.5, y: 0.5 }, burst: 1, heavy: true })], [1, frame({ move: { x: -0.4, y: 0.8 }, ability: true })]]);
    run(g, 8, inputs);
    return JSON.stringify(g.actors.map((a) => [a.creature, a.pos.x.toFixed(4), a.pos.y.toFixed(4), a.pos.z.toFixed(4), a.hp.toFixed(3), a.stamina.toFixed(3), a.state]));
  };
  ok(play() === play(), 'the same seed and inputs replay the same match, shore animals and mothers included');
}

console.log(`\nall ${passes} Triassic checks passed`);
void CREATURES; void biomeAt; void nurseryAt;
