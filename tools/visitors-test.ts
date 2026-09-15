/**
 * Visitors: animals earned in one game turning up in another. Run: npm run visitors
 *
 * Take a creature to the top of its own game and it appears in the other two, at the size it
 * finishes at — a Dunkleosteus in the Cambrian is larger than anything that sea has held, which is
 * the point rather than a bug. The one rule they get is that they must fit: a body placed in water
 * shallower than it is long is stuck, not impressive.
 */
import assert from 'node:assert/strict';
import { selectEra } from '../src/content';
import { CAMBRIAN } from '../src/content/cambrian';
import { DEVONIAN } from '../src/content/devonian';
import { TRIASSIC } from '../src/content/triassic';

const which = process.argv[2] === 'devonian' ? 'devonian' : process.argv[2] === 'triassic' ? 'triassic' : 'cambrian';
const era = which === 'devonian' ? DEVONIAN : which === 'triassic' ? TRIASSIC : CAMBRIAN;
selectEra(era);

let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(62)} ${d}`); if (!ok) failed++; };

const { APEX_SCALE, ERA_IDS, earnedVisitors, standingVisitors, visitorsHere, visitorsFrom } = await import('../src/content/visitors');
const { TRIASSIC_GUESTS } = await import('../src/content/triassic/guests');
const TRIASSIC_BYTES = (await import('../src/content/triassic/asset-sizes.json')).default as Record<string, number>;
type EraId = import('../src/content/visitors').EraId;
const { registerVisitorAssets, assetPaths, createAssetPaths } = await import('../src/content/asset-paths');
const { admitVisitors, creature, isVisitor, PLAYABLE_IDS, CREATURE_IDS } = await import('../src/sim/creatures');
const { Game } = await import('../src/sim/game');
const { emptyInput } = await import('../src/sim/types');
const { isAlive, lengthOf } = await import('../src/sim/actors');
const { groundHeight, SURFACE_Y } = await import('../src/sim/world');
const { TIER_SCALE } = await import('../src/sim/types');
const { PRIME_SCALE } = await import('../src/sim/devonian/state');
const { LADDER_TOP, ladderScale } = await import('../src/sim/ladder');

const playing = era.id as EraId;
const other: EraId[] = ERA_IDS.filter((e) => e !== playing);

// ---- the numbers written into src/content must match the ladders they stand for ----
{
  check('the Cambrian apex scale matches its top tier', APEX_SCALE.cambrian === TIER_SCALE[TIER_SCALE.length - 1], `${APEX_SCALE.cambrian} vs ${TIER_SCALE[TIER_SCALE.length - 1]}`);
  check('the other two match Prime', APEX_SCALE.devonian === PRIME_SCALE && APEX_SCALE.triassic === PRIME_SCALE, `${APEX_SCALE.devonian}`);
  // ...and the era we are in agrees, through the shared ladder.
  const own = ladderScale(PLAYABLE_IDS[0], LADDER_TOP);
  check('...and the active era\'s own top rung agrees', Math.abs(own - APEX_SCALE[playing]) < 1e-9, `${own} at ${playing}`);
}

// ---- asset folders are the real ones, not a guess ----
{
  for (const e of ERA_IDS) {
    const real = (e === 'cambrian' ? CAMBRIAN : e === 'devonian' ? DEVONIAN : TRIASSIC);
    registerVisitorAssets([{ id: '__probe', era: e }]);
    const model = assetPaths.model('__probe');
    const portrait = assetPaths.portrait('__probe', 'thumb');
    check(`${e}: a visitor's model resolves to that game's folder`, model === `${real.assets.creatures}__probe.glb`, model);
    check(`${e}: ...and its portrait does too`, portrait === `${real.assets.defaultPortraits}__probe.thumb.png`, portrait);
  }
  // A lod1 still names the same folder.
  registerVisitorAssets([{ id: '__probe', era: 'devonian' }]);
  check('a visitor has a reduced model too', assetPaths.model('__probe', 1).endsWith('.lod1.glb'), assetPaths.model('__probe', 1));
  void createAssetPaths;
}

// ---- reading the other games' records ----
{
  const store = new Map<string, string>();
  const read = (k: string) => store.get(k) ?? null;
  check('nothing earned anywhere means no visitors', earnedVisitors(playing, read).length === 0);
  // A record from this era is never a visitor to itself.
  store.set(`${era.copy.settingsKey}-codex`, JSON.stringify({ apex: [PLAYABLE_IDS[0]] }));
  check('your own game never sends you visitors', earnedVisitors(playing, read).length === 0, `${playing} apex ignored`);
  // One from each of the others.
  const picks = other.map((e) => ({ era: e, id: visitorsFrom(e)[0].id }));
  for (const p of picks) {
    const key = p.era === 'cambrian' ? 'cambrian-settings' : p.era === 'devonian' ? 'devonian-settings' : 'triassic-settings';
    store.set(`${key}-codex`, JSON.stringify({ apex: [p.id, 'not-a-creature', p.id] }));
  }
  const got = earnedVisitors(playing, read);
  check('an apex in another game becomes a visitor here', got.length === picks.length, got.map((v) => `${v.id}(${v.era})`).join(', '));
  check('...ids no game has are ignored, and duplicates collapse', new Set(got.map((v) => v.id)).size === got.length);
  check('...biggest first', got.every((v, i) => i === 0 || got[i - 1].length >= v.length), got.map((v) => v.length.toFixed(1)).join(' >= '));
  check('...each at the size it finishes its own game at', got.every((v) => Math.abs(v.scale - APEX_SCALE[v.era]) < 1e-9));
  // A corrupt or absent record is an empty list, never a throw.
  store.set(`${other[0] === 'cambrian' ? 'cambrian' : other[0]}-settings-codex`, '{{{');
  check('a corrupt record is simply no visitors from there', Array.isArray(earnedVisitors(playing, read)));
}

// ---- the standing guests: admitted to every game, earned in none ----
{
  // Archelon and Mosasaurus are Late Cretaceous and on no roster at all (see
  // src/content/triassic/expansion.json). There is no game to take them to the top of, so they are
  // admitted unconditionally; the one thing they are gated on is the body existing.
  const standing = standingVisitors(playing);
  const shippedGuests = TRIASSIC_GUESTS.filter((g) => TRIASSIC_BYTES[g.id]);
  check('every shipped guest is a standing visitor here', standing.length === shippedGuests.length,
    `${standing.map((v) => v.id).join(', ') || 'none'} of ${TRIASSIC_GUESTS.length} guests`);
  check('...and none of them is on this game\'s roster',
    standing.every((v) => !PLAYABLE_IDS.includes(v.id as never) && !CREATURE_IDS.includes(v.id as never)));
  // The gate, stated the other way round: a guest with no shipped model must not appear.
  check('...a guest with no shipped body is not offered at all',
    TRIASSIC_GUESTS.every((g) => !!TRIASSIC_BYTES[g.id] === standing.some((v) => v.id === g.id)),
    TRIASSIC_GUESTS.map((g) => `${g.id}:${TRIASSIC_BYTES[g.id] ? 'shipped' : 'not built'}`).join(', '));
  // `era` is where the files are; `origin` is where the animal is from. Saying 'Triassic' on a
  // Cretaceous animal's crew card is the lie this split exists to prevent.
  check('...filed under the era whose folder holds its files', standing.every((v) => v.era === 'triassic'));
  check('...but saying where it is really from', standing.every((v) => v.origin === 'Late Cretaceous'),
    standing.map((v) => `${v.id}: ${v.origin}`).join(', '));
  check('...and marked as standing rather than earned', standing.every((v) => v.standing === true));
  for (const v of standing) {
    registerVisitorAssets([{ id: v.id, era: v.era }]);
    check(`...${v.id}'s model resolves into the Triassic's folder`,
      assetPaths.model(v.id) === `assets/triassic/creatures/${v.id}.glb`, assetPaths.model(v.id));
  }
  // The combined list is what the shell reads, and a guest is not a second class of thing in it.
  const store = new Map<string, string>();
  const both = visitorsHere(playing, (k) => store.get(k) ?? null);
  check('a game with nothing earned still has its guests', both.length === standing.length);
  check('...biggest first, guests sorted in with the rest',
    both.every((v, i) => i === 0 || both[i - 1].length >= v.length), both.map((v) => v.length.toFixed(1)).join(' >= '));
  const other0 = other[0];
  const key = other0 === 'cambrian' ? 'cambrian-settings' : other0 === 'devonian' ? 'devonian-settings' : 'triassic-settings';
  store.set(`${key}-codex`, JSON.stringify({ apex: [visitorsFrom(other0)[0].id] }));
  const mixed = visitorsHere(playing, (k) => store.get(k) ?? null);
  check('...and an earned one joins them rather than replacing them', mixed.length === standing.length + 1,
    mixed.map((v) => `${v.id}(${v.standing ? 'standing' : 'earned'})`).join(', '));
}

// ---- a standing guest plays ----
{
  const standing = standingVisitors(playing);
  if (standing.length) {
    const big = standing.reduce((a, b) => (b.length > a.length ? b : a));
    admitVisitors(standing.map((v) => v.def));
    registerVisitorAssets(standing.map((v) => ({ id: v.id, era: v.era })));
    check('a guest resolves as a creature', !!creature(big.id as never), `${big.id} → ${creature(big.id as never)?.name}`);
    check('...and says it is a visitor', isVisitor(big.id));
    const g = new Game('reef', [{ creature: big.id as never, device: 'keyboard', ready: true, visitorScale: big.scale }], 11);
    const p = g.players[0];
    check('...and can start a match', !!p && isAlive(p), `${big.id} at ${lengthOf(p).toFixed(1)} units`);
    check('...full grown, in water deep enough to hold it',
      SURFACE_Y - groundHeight(g.world, p.pos.x, p.pos.z, []) > lengthOf(p),
      `${(SURFACE_Y - groundHeight(g.world, p.pos.x, p.pos.z, [])).toFixed(1)} units of water`);
    check('...and not in an egg', !p.hatching);
    const m = new Map([[0, { ...emptyInput(), worldMove: { x: 0, y: 0, z: 1 } }]]);
    for (let i = 0; i < 60 * 3; i++) { g.step(1 / 60, m); g.events.length = 0; }
    check('...and swims', isAlive(p) && Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y), `y ${p.pos.y.toFixed(1)}`);
  } else {
    check('no guest body has shipped yet, so there is nothing to play', true);
  }
}

// ---- a visitor is not part of this game's roster ----
{
  const v = visitorsFrom(other[0])[0];
  admitVisitors([v.def]);
  check('a visitor resolves as a creature', !!creature(v.id as never), `${v.id} → ${creature(v.id as never)?.name}`);
  check('...and says it is one', isVisitor(v.id), v.era);
  check('...but is not on the pick roster', !PLAYABLE_IDS.includes(v.id as never), `${PLAYABLE_IDS.length} playable`);
  check('...nor in the sea\'s own list', !CREATURE_IDS.includes(v.id as never), `${CREATURE_IDS.length} in the roster`);
  check('...and a local animal is not a visitor', !isVisitor(PLAYABLE_IDS[0]));
}

// ---- a match runs with one, and it fits in the water ----
{
  const all = other.flatMap((e) => visitorsFrom(e));
  admitVisitors(all.map((x) => x.def));
  registerVisitorAssets(all.map((x) => ({ id: x.id, era: x.era })));
  const biggest = all.reduce((a, b) => (b.length > a.length ? b : a));
  const g = new Game('reef', [{ creature: biggest.id as never, device: 'keyboard', ready: true, visitorScale: biggest.scale }], 9);
  const p = g.players[0];
  check('a visitor can start a match', !!p && isAlive(p), `${biggest.id} from the ${biggest.era}`);
  check('...at the size it finishes its own game at', Math.abs(lengthOf(p) - biggest.length) < 0.01, `${lengthOf(p).toFixed(1)} units`);
  // Not "bigger than anything here" — that is only true of the seas that happen to be small. The
  // Triassic's own Cymbospondylus is longer than any visitor it can receive, and a visitor is
  // still a visitor. What is always true is that it arrives *grown*, at a size this game would
  // make it earn, without having earned it here.
  const localAdult = Math.max(...PLAYABLE_IDS.map((id) => creature(id).adultLength));
  check('...arriving full-grown rather than as a hatchling', lengthOf(p) > localAdult * 0.5, `${lengthOf(p).toFixed(1)} against this roster's largest adult ${localAdult.toFixed(1)}`);
  if (playing === 'cambrian') check('...and in the Cambrian, larger than anything the sea holds', lengthOf(p) > localAdult, `${lengthOf(p).toFixed(1)} vs ${localAdult.toFixed(1)}`);
  // The one rule: it has to fit. A body in water shallower than itself is stuck, not impressive.
  const floor = groundHeight(g.world, p.pos.x, p.pos.z, []);
  const column = SURFACE_Y - floor;
  check('...in water deep enough to hold it', column > lengthOf(p), `${column.toFixed(1)} units of water for a ${lengthOf(p).toFixed(1)} body`);
  check('...sitting off the floor and under the surface', p.pos.y > floor && p.pos.y < SURFACE_Y, `y ${p.pos.y.toFixed(1)} between ${floor.toFixed(1)} and ${SURFACE_Y}`);
  check('...and not in an egg, having grown up elsewhere', !p.hatching);

  // It swims: a hundred steps of ordinary play with nothing going wrong.
  const m = new Map([[0, { ...emptyInput(), worldMove: { x: 0, y: 0, z: 1 } }]]);
  for (let i = 0; i < 60 * 5; i++) { g.step(1 / 60, m); g.events.length = 0; }
  check('...and swims without the sea falling over', isAlive(p) && Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y), `y ${p.pos.y.toFixed(1)}`);
  check('...with every other animal still finite', g.actors.every((a) => Number.isFinite(a.hp) && Number.isFinite(a.pos.y)), `${g.actors.length} actors`);
}

console.log(failed ? `FAILED (${failed})` : `all passed (${playing})`);
process.exit(failed ? 1 : 0);
