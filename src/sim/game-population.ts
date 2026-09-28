/**
 * Who is in the sea: the opening population, the giants, the schools, the ambient animals drawn
 * from each place's own ages, the food kept within a player's reach, the refill as players move,
 * and the giants' bones. Split out of src/sim/game.ts; every function takes the Game.
 */
import { ACTIVE_ERA } from '../content';
import { RULES } from './era-rules';
import { clamp, distXZ, TAU, v3, type Vec3 } from '../shared/math';
import { bandOf, isAlive, lengthOf } from './actors';
import { makeBrain } from './ai';
import { creature, WILD_IDS, type CreatureId } from './creatures';
import { ladderRung, ladderScale } from './ladder';
import { type Actor, type BrainState } from './types';
import { biomeWeights, groundHeight, LIGHT_WINDOW_Y, type Landmark, nearestNursery, nurseryAt, nurseryFactor, sampleHeight, shoreDistance, SURFACE_Y } from './world';
import { areaProfile, bandScale, drawBand, headroom, PASSER_BY, SMALLEST_BAND } from './population';
import { columnHolds, columnY, DIP_CHANCE } from './locomotion';
import { GIANTS, SNACK_SCHOOLS, type Game } from './game';
import { gainNutrition } from './game-feeding';

/** Initial ecosystem. */
export function populate(game: Game) {
  // Snack schools
  SNACK_SCHOOLS.forEach((s, i) => spawnSchool(game, s.creature, s.scale, s.count, i));
  // Ambient adults
  for (let i = 0; i < 26; i++) spawnAmbient(game, true);
  // Giants: one of each kind lives in the region around the players and moves with them.
  for (const c of GIANTS) placeGiant(game, game.spawn(c.creature, 'giant', { ...nurseryAt(0) }, c.scale));
  const shadow = game.spawn(ACTIVE_ERA.ecology.shadow.creature, 'shadow', { ...nurseryAt(0) }, ACTIVE_ERA.ecology.shadow.scale);
  placeGiant(game, shadow);
}

/**
 * Give a giant a home and patrol loop 130–210 units from a player, in the biome it belongs to
 * (channels and deep water for Anomalocaris, boulders for Olenoides, sponge forest for
 * Opabinia), never in a nursery and never on the beach. Used at start and whenever a giant has
 * been left far behind by every player.
 */
export function placeGiant(game: Game, g: Actor) {
  // Not while somebody is holding on to it: moving it to a new lair would take the rider with it,
  // across the sea, in one step.
  if (g.riddenBy >= 0) return;
  const def = GIANTS.find((c) => c.creature === g.creature) ?? GIANTS[0];
  const shadow = g.controller === 'shadow';
  const anchor = game.randomAnchor();
  let best: Vec3 = { x: anchor.x, y: 0, z: anchor.z - 160 }, bestScore = -Infinity;
  for (let i = 0; i < 14; i++) {
    const ang = game.rng() * TAU, d = shadow ? 60 + game.rng() * 40 : 130 + game.rng() * 80;
    const x = anchor.x + Math.cos(ang) * d, z = anchor.z + Math.sin(ang) * d;
    if (shoreDistance(x, z) < 45 || nurseryFactor(x, z) > 0.1) continue;
    const w = biomeWeights(x, z);
    let score = game.rng() * 0.3;
    for (const b of def.biomes) score += w[b];
    if (score > bestScore) { bestScore = score; best = { x, y: 0, z }; }
  }
  const r = shadow ? 70 : 35 + game.rng() * 15;
  const y = shadow ? SURFACE_Y - 3 : def.ground ? 0 : 22;
  const n = shadow ? 10 : 6;
  const route = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const x = best.x + Math.cos(a) * r, z = best.z + Math.sin(a) * r;
    return { x, y: def.ground ? sampleHeight(x, z) + 1.5 : y + Math.abs(Math.sin(i * 1.7)) * 5, z };
  });
  g.pos = { ...route[0] };
  g.vel = v3();
  g.brain = makeBrain('giant', route[0], game.rng, { patrol: route });
}

/**
 * A school sized to be prey for this player, spawned just out of sight. A crawler is fed on
 * its own level: seafloor species by preference, and anything else planted just above the
 * sediment rather than left drifting overhead where it cannot be reached.
 */
export function spawnPreyFor(game: Game, p: Actor) {
  const L = lengthOf(p);
  const def = creature(p.creature);
  const crawlers = WILD_IDS.filter((id) => creature(id).ground);
  // Never a school of an animal somebody is playing. Nothing hunts its own kind as its staple, and
  // the pool is a handful of species, so a player met shoals of themselves about one time in
  // three. A kind is only held back while there is something else to draw.
  const played = playedKinds(game);
  const others = (ids: CreatureId[]) => { const o = ids.filter((id) => !played.has(id)); return o.length ? o : ids; };
  const pool = others(def.ground
    ? (game.rng() < 0.8 && crawlers.length ? crawlers : WILD_IDS.slice())
    : WILD_IDS.filter((id) => !creature(id).ground));
  const c = pool[Math.floor(game.rng() * pool.length)];
  const cd = creature(c);
  const ratio = 0.28 + game.rng() * 0.32;            // snack to small prey relative to the player
  const s = clamp((L * ratio) / cd.adultLength, 0.06, 2.2);
  const count = (s < 0.2 ? 12 : s < 0.6 ? 8 : 5) + (def.ground ? 4 : 0);
  const ang = game.rng() * TAU, d = 24 + game.rng() * 18 + L * 2;
  const home = offshore(game, { x: p.pos.x + Math.cos(ang) * d, y: 0, z: p.pos.z + Math.sin(ang) * d });
  const g = sampleHeight(home.x, home.z);
  const onFloor = cd.ground || def.ground;
  home.y = onFloor ? g : clamp(p.pos.y + (game.rng() - 0.5) * 6, g + 1.5, SURFACE_Y - 3);
  const schoolId = game.schoolCount++;
  for (let k = 0; k < count; k++) {
    const pos = { x: home.x + (game.rng() - 0.5) * 5, y: home.y + (game.rng() - 0.5) * 2, z: home.z + (game.rng() - 0.5) * 5 };
    if (onFloor) pos.y = groundHeight(game.world, pos.x, pos.z, game.scratchBoulders) + (cd.ground ? cd.adultLength * s * 0.13 : 0.6 + game.rng() * 1.2);
    const a = game.spawn(c, 'swarm', pos, s);
    a.brain = makeBrain('swarm', home, game.rng, { schoolId });
  }
}

/** Keep a point in swimmable water: at least 20 units off the beach. */
export function offshore(game: Game, p: Vec3): Vec3 {
  const s = shoreDistance(p.x, p.z);
  if (s < 20) p.z -= 20 - s;
  return p;
}

/** The kinds the players are, so the sea does not fill their water with shoals of themselves. */
export function playedKinds(game: Game): Set<CreatureId> {
  return new Set(game.players.map((p) => p.creature));
}

export function spawnSchool(game: Game, c: CreatureId, s: number, count: number, i: number) {
  // The era's snack schools cover most of its roster, and the first eight are laid round the
  // nurseries a player hatches in — so a hatchling came out of its egg into a shoal of its own
  // species about half the time. A school of a played kind gives its place to one that is not.
  const played = playedKinds(game);
  if (played.has(c)) {
    const alt = SNACK_SCHOOLS.filter((o) => !played.has(o.creature));
    if (alt.length) { const o = alt[i % alt.length]; c = o.creature; s = o.scale; count = o.count; }
  }
  const def = creature(c);
  const anchor = game.randomAnchor();
  let home: Vec3;
  if (i < 8) { const n = nearestNursery(anchor.x, anchor.z).pos; const a = i * 0.8; home = { x: n.x + Math.cos(a) * 8, y: 0, z: n.z + Math.sin(a) * 8 }; }
  else {
    const a = game.rng() * TAU, d = 30 + Math.sqrt(game.rng()) * 90;
    home = offshore(game, { x: anchor.x + Math.cos(a) * d, y: 0, z: anchor.z + Math.sin(a) * d });
  }
  const g = sampleHeight(home.x, home.z);
  home.y = def.ground ? g : (i % 4 === 1 ? LIGHT_WINDOW_Y : g + 2.5 + game.rng() * 5);
  const schoolId = game.schoolCount++;
  for (let k = 0; k < count; k++) {
    const p = { x: home.x + (game.rng() - 0.5) * 6, y: home.y + (game.rng() - 0.5) * 2, z: home.z + (game.rng() - 0.5) * 6 };
    if (def.ground) p.y = groundHeight(game.world, p.x, p.z, game.scratchBoulders) + 0.1;
    const a = game.spawn(c, 'swarm', p, s);
    a.brain = makeBrain('swarm', home, game.rng, { schoolId });
  }
}

/** The highest rung any player stands on, in the era's own ladder (never the Cambrian's `tier`). */
export function maxPlayerRung(game: Game): number {
  let t = 0;
  for (const p of game.players) t = Math.max(t, ladderRung(game, p));
  return t;
}

export function spawnAmbient(game: Game, initial = false, near?: Vec3) {
  let c = WILD_IDS[Math.floor(game.rng() * WILD_IDS.length)];
  let def = creature(c);
  const anchor = near ?? game.randomAnchor();
  // One spawn in five is simply something big going past, up in the water and regardless of what
  // the seabed under it holds: swimming up is always a way to find a larger animal, whatever
  // shelf of fingerlings you happen to be over.
  const passing = !initial && !def.ground && game.rng() < PASSER_BY;
  let pos: Vec3 | undefined;
  let s = 0.5;
  for (let tries = 0; tries < 20 && !pos; tries++) {
    const a = game.rng() * TAU, d = initial ? 20 + Math.sqrt(game.rng()) * 110 : 60 + Math.sqrt(game.rng()) * 90;
    const x = anchor.x + Math.cos(a) * d, z = anchor.z + Math.sin(a) * d;
    if (shoreDistance(x, z) < 20) continue;
    if (!initial && game.players.some((p) => distXZ(p.pos, { x, y: 0, z }) < 55)) continue;
    // Nothing here turns big animals away from the nurseries any more: they are safe because
    // nothing in one picks a fight (`peaceful` in ai.ts), not because only small things fit.
    const g = groundHeight(game.world, x, z, game.scratchBoulders);
    // What lives *here*: the area's own character rather than one distribution for the whole
    // sea (`src/sim/population.ts`). A shelf of fingerlings and a channel of grown animals are
    // both places you can end up in, which is what makes moving on worth doing.
    let band = passing && headroom(g) > 0.35 ? 'large' : drawBand(game.rng, areaProfile(x, z, game.world.seed));
    // A grown animal needs water over it. In the shallows there is nowhere for one to be except
    // lying on the sand, which is exactly what a big fish does not do, so the area's adults are
    // out where the bottom drops away and what is inshore is half grown at most.
    if (band === 'large' && headroom(g) < 0.45) band = 'mid';
    s = bandScale(game.rng, band);
    // ...and then the column decides, because a band is a fraction of each species' *own* adult
    // length and so says nothing about how long the animal actually is. A Shonisaurus drawn mid
    // is still eight units of ichthyosaur and one drawn large is seventeen, and `headroom`'s
    // fixed 13.5 units of water let either of them stand on a Triassic shelf with thirteen —
    // which is what a player meets as a giant appearing in the shallows. The water has to hold
    // the body, so the animal is drawn down to what fits.
    const room = columnHolds(g, SURFACE_Y);
    if (def.adultLength * SMALLEST_BAND > room) {
      // Water too shallow for *this* species is not water with nothing in it: the shallows are
      // not empty, they are small. Redraw from the kinds that do fit — the same sort of body, so
      // a crawler is still a crawler and a passer-by is still a swimmer — rather than giving up
      // the spawn and thinning the inshore sea.
      const pool = WILD_IDS.filter((id) => !!creature(id).ground === !!def.ground && creature(id).adultLength * SMALLEST_BAND <= room);
      if (!pool.length) continue;
      c = pool[Math.floor(game.rng() * pool.length)];
      def = creature(c);
    }
    s = Math.min(s, room / def.adultLength);
    // A crawler goes on the sand. A swimmer goes where a body its size belongs: small animals
    // anywhere in the column including the bottom, a big one up in the water where it can be
    // seen passing (`columnY`), with the occasional pass down over the floor.
    const bodyL = def.adultLength * s;
    pos = { x, y: RULES.spawnY?.(g, bodyL, !!def.ground)
      ?? (def.ground ? g + bodyL * 0.13
      : columnY(g, SURFACE_Y, bodyL, game.rng, !passing && bodyL > 2.5 && game.rng() < DIP_CHANCE)), z };
  }
  if (!pos) return;
  const a = game.spawn(c, 'ambient', pos, s);
  a.brain = makeBrain('needs', pos, game.rng, temperament(game, a, pos));
}

/**
 * What kind of neighbour this animal is.
 *
 * Most of the reef is indifferent: it feeds when it is hungry and otherwise leaves you alone.
 * On top of that two dispositions are dealt out, because a sea where the only question is
 * "can it eat me" runs out of questions:
 *
 * - **Grumpy** ones have a personal space and see off anything their own size that enters it,
 *   whatever the hour. They are the reason you do not swim straight through a crowd.
 * - **Territorial** ones hold a patch and drive intruders out of it, then go home. They never
 *   follow past the edge, so they are a decision rather than a threat: the ground they are
 *   sitting on is often worth crossing, and you can always choose not to.
 *
 * Bigger, better-armed animals hold ground more often — a larva has nothing to hold — and
 * grazers and filter feeders mostly do not, having somewhere to be rather than something to
 * defend.
 */
export function temperament(game: Game, a: Actor, pos: Vec3): Partial<BrainState> {
  const def = creature(a.creature);
  const grown = a.scale >= ladderScale(a.creature, 2) * 0.8;
  // Filter feeders, grazers and deposit feeders have somewhere to be rather than something to
  // defend. A scavenger sitting on a body very much has something to defend.
  const settled = (!def.diet || def.diet === 'scavenger') && grown;
  const roll = game.rng();
  // A third of the grown, armed animals hold a patch; a fifth of everything grown is just grumpy.
  if (settled && roll < 0.34) {
    const L = lengthOf(a);
    return { temper: 0.35 + game.rng() * 0.4, territory: { ...pos }, territoryR: 26 + L * 4 + game.rng() * 18 };
  }
  if (grown && roll < 0.55) return { temper: 0.4 + game.rng() * 0.5 };
  return {};
}

export function updatePopulation(game: Game, dt: number) {
  game.ambientTimer -= dt;
  if (game.ambientTimer > 0) return;
  game.ambientTimer = 2.2;
  let ambient = 0, swarm = 0;
  const schools = new Map<number, number>();
  for (const a of game.actors) {
    if (!isAlive(a)) continue;
    if (a.controller === 'ambient') ambient++;
    if (a.controller === 'swarm') { swarm++; if (a.brain?.schoolId != null) schools.set(a.brain.schoolId, (schools.get(a.brain.schoolId) ?? 0) + 1); }
  }
  // The ecosystem lives around the players. Wild things left far behind are dropped, and every
  // player keeps a local population of adults, prey and something big enough to fear.
  const anchors = game.anchors();
  for (const a of game.actors) {
    if (a.controller !== 'ambient' && a.controller !== 'swarm') continue;
    let d = Infinity;
    for (const p of anchors) d = Math.min(d, distXZ(a.pos, p));
    if (d > (a.controller === 'swarm' ? 240 : 290)) game.remove(a);
  }
  // How many wild animals an area carries is the area's own business (`areaProfile`): a rich
  // shelf holds half again what a thin one does, and the thin one is never empty. Refilling is
  // deliberately unhurried — a stretch you have eaten through stays eaten through for a while,
  // which is what makes swimming somewhere else the answer rather than waiting where you are.
  for (const p of anchors) {
    let local = 0;
    for (const a of game.nearby(p, 170)) if (a.controller === 'ambient' && isAlive(a)) local++;
    const want = clamp(Math.round((15 + maxPlayerRung(game) * 2) * areaProfile(p.x, p.z, game.world.seed).density), 9, 34);
    if (local >= want) continue;
    // One at a time when it is nearly full, a few at once when a whole area is bare — arriving
    // one animal every two seconds forever reads as a trickle following the player about.
    for (let k = 0; k < (local < want * 0.5 ? 3 : 1); k++) spawnAmbient(game, false, p);
    break;
  }
  void ambient;
  // Every player, at every size, should have plenty of things smaller than them within reach.
  // For a crawler "within reach" means near the seabed: food hanging in open water above it
  // does not count, so the seafloor keeps being restocked.
  for (const p of game.players) {
    if (!isAlive(p)) continue;
    const L = lengthOf(p);
    const crawler = creature(p.creature).ground;
    const reachY = 3 + L * 1.5;
    let small = 0;
    for (const o of game.nearby(p.pos, 45 + L * 4)) {
      if (o.id === p.id || !isAlive(o)) continue;
      if (crawler && o.pos.y - p.pos.y > reachY) continue;
      const b = bandOf(p, o); if (b === 'snack' || b === 'prey') small++;
    }
    if (small < (crawler ? 18 : 14)) spawnPreyFor(game, p);
  }
  if (swarm < 200) {
    const i = Math.floor(game.rng() * SNACK_SCHOOLS.length);
    const s = SNACK_SCHOOLS[i];
    spawnSchool(game, s.creature, s.scale, s.count, i + Math.floor(game.time));
  }
  // Giants follow the players across the sea: one left far behind is moved to a new lair ahead
  // of them (out of sight), and one that somehow died is replaced.
  for (const c of GIANTS) {
    const g = game.actors.find((a) => a.controller === 'giant' && a.creature === c.creature);
    if (!g) { placeGiant(game, game.spawn(c.creature, 'giant', { ...anchors[0] }, c.scale)); continue; }
    if (isAlive(g) && g.brain?.goal !== 'hunt' && game.anchorDistance(g.pos) > 420) placeGiant(game, g);
  }
  const shadow = game.actors.find((a) => a.controller === 'shadow');
  if (shadow && isAlive(shadow) && shadow.brain?.goal !== 'hunt' && game.anchorDistance(shadow.pos) > 300) placeGiant(game, shadow);
}

/**
 * The `bones` landmark whose ribcage `pos` is inside, if any. Cheap: there is at most one
 * landmark per 320-unit cell and only loaded chunks are in the list.
 */
export function bonesNear(game: Game, pos: Vec3, range = 0): Landmark | undefined {
  let best: Landmark | undefined, bd = Infinity;
  for (const m of game.world.landmarks) {
    if (m.kind !== 'bones') continue;
    const d = distXZ(pos, m.pos);
    if (d < m.radius + range && d < bd) { bd = d; best = m; }
  }
  return best;
}

/** How much of a skeleton is left to strip, 0..1. Unvisited ones are whole. */
export function bonesLeft(game: Game, id: number) { return game.bonesMeat.get(id) ?? 1; }

/**
 * Eating at a dead giant's bones. Anything that can reach the body gets fed — this is
 * scavenging, not a kill — at a rate that scales with the eater, so it is a real meal at every
 * tier rather than a trickle for a giant and a banquet for a larva. It depletes as it is eaten.
 */
export function feedOnBones(game: Game, a: Actor, L: number, dt: number) {
  if (a.controller === 'swarm' || a.pos.y > sampleHeight(a.pos.x, a.pos.z) + L * 2.5 + 4) return;
  const m = bonesNear(game, a.pos);
  if (!m) return;
  const left = bonesLeft(game, m.id);
  if (left <= 0.02) return;
  // A whole giant is worth roughly a tier to an adult; the eater's own mass sets the rate.
  const food = Math.min(left, dt * 0.055) * 240 * Math.pow(a.scale, 1.2) * m.scale;
  game.bonesMeat.set(m.id, Math.max(0, left - dt * 0.055));
  gainNutrition(game, a, undefined, food);
  if (a.controller === 'player' && game.rng() < dt * 3) game.events.push({ kind: 'eat', pos: { ...a.pos }, actor: a.id, strength: 0.35, player: a.player });
}

/** Bones restock slowly, so a stripped one is worth coming back to rather than dead forever. */
export function restockBones(game: Game, dt: number) {
  for (const [id, left] of game.bonesMeat) if (left < 1) game.bonesMeat.set(id, Math.min(1, left + dt / 210));
}
