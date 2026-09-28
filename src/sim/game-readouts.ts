/**
 * What the HUD and the menus read off the match: the scoreboard, the radar and its food contacts,
 * the grip panel, the notices and the onboarding hint, the teleport and change-creature menus.
 * Split out of src/sim/game.ts; every function takes the Game.
 */
import { ACTIVE_ERA } from '../content';
import { RULES } from './era-rules';
import { clamp, distXZ } from '../shared/math';
import { bandOf, isAlive, isHidden, lengthOf } from './actors';
import { creature, PLAYABLE_IDS, type CreatureId } from './creatures';
import { APEX_HOLD_SECONDS, ladderMark, ladderName, ladderRung, LADDER_TOP } from './ladder';
import { TIER_NAMES, TIER_NEED, type Actor } from './types';
import { BIOME_NAMES, biomeAt, shoreZ, type Biome } from './world';
import { amphibious, breathesAir } from './beach';
import { TEXT } from '../shared/text';
import { type KeptBody, type RadarBlip, type ScoreHeader, type ScoreRow, type SwapOption, type TeleportOption, type Game } from './game';
import { nutritionValue } from './game-feeding';

/** Everything the simulation says out loud; the words are in `src/content/strings.ts`. */
const SAY = TEXT.sim;

/**
 * The scoreboard for one viewport (hold View). Sorted by the thing the mode is about, so the
 * top line is whoever is furthest up the ladder.
 */
export function scoreboard(game: Game, viewer: number): { header: ScoreHeader; rows: ScoreRow[] } {
  const me = game.players[viewer];
  const contenders = game.actors.filter((a) => a.controller === 'player');
  const rows: ScoreRow[] = contenders.map((a) => {
    const era = RULES.scoreLine?.(game, a);
    return {
      player: a.player, creature: a.creature, name: creature(a.creature).name,
      rank: era?.rank ?? TIER_NAMES[a.tier], tier: ladderRung(game, a),
      progress: era?.progress ?? (a.tier >= 4 ? 1 : clamp(a.nutrition / TIER_NEED[a.tier], 0, 1)),
      kills: a.kills, eats: a.eats, escapes: a.escapes,
      deaths: a.player >= 0 ? (game.progress[a.player]?.deaths ?? 0) : 0,
      alive: isAlive(a),
      biome: BIOME_NAMES[biomeAt(a.pos.x, a.pos.z)],
      distance: me && a !== me ? distXZ(me.pos, a.pos) : 0,
    };
  });
  rows.sort((x, y) => (y.tier + y.progress) - (x.tier + x.progress));
  return { header: scoreHeader(game), rows };
}

export function scoreHeader(game: Game): ScoreHeader {
  switch (game.mode) {
    case 'survival': {
      const chasing = game.players.filter((p) => !p.carriedTop);
      if (game.endless || !chasing.length) return { title: SAY.board.survivalTitle, detail: SAY.board.reefWon };
      const held = Math.max(0, ...game.players.map((p, i) => (p.carriedTop ? 0 : game.progress[i].apexT)));
      return { title: SAY.board.survivalTitle, detail: held > 0 ? SAY.board.apexHeld(Math.floor(held), APEX_HOLD_SECONDS) : SAY.board.survivalGoal };
    }
    case 'rise': {
      // Nobody left with a clock running — everyone here carried a finished run in — reads the
      // same as carrying on after a win, because that is exactly what it is.
      const chasing = game.players.filter((p) => !p.carriedTop);
      if (game.endless || !chasing.length) return { title: SAY.board.riseTitle, detail: SAY.board.reefWon };
      const held = Math.max(0, ...game.players.map((p, i) => (p.carriedTop ? 0 : game.progress[i].apexT)));
      return { title: SAY.board.riseTitle, detail: held > 0 ? SAY.board.apexHeld(Math.floor(held), APEX_HOLD_SECONDS) : SAY.board.riseGoal };
    }
    case 'reef': return { title: SAY.board.reefTitle, detail: SAY.board.reefFree };
    default: return { title: ACTIVE_ERA.modes.find((m) => m.id === game.mode)?.name ?? game.mode, detail: '' };
  }
}

/**
 * Radar contacts for a player: the other players wherever they are, the nearest predator big
 * enough to be dangerous, anything actually hunting them however big it is, the nearest patch
 * worth eating, plus home, the shore and landmarks as bearings.
 *
 * The dial deliberately does not show every animal in reach. A reef holds dozens, and a small
 * creature is outsized by most of them, so listing them all turned the radar into noise exactly
 * when it mattered most — a hatchling's read as a solid ring of threats. One predator arrow and
 * one food patch is a decision; twenty of each is wallpaper. Same-size rivals (the `rival` band)
 * never show at all unless they are already coming for you.
 */
export function radarFor(game: Game, i: number, range: number): RadarBlip[] {
  const p = game.players[i]; if (!p) return [];
  const out: RadarBlip[] = [];
  // Only the other players carry off the edge of the dial: they are who you are trying to find.
  // Everything alive is a contact or nothing — a creature outside the reach is simply not there.
  game.players.forEach((o, j) => { if (j !== i) out.push({ kind: 'player', dx: o.pos.x - p.pos.x, dy: o.pos.y - p.pos.y, dz: o.pos.z - p.pos.z, distance: distXZ(o.pos, p.pos), id: j, hunting: false }); });
  // Anything on your tail is always shown; of the rest, only the closest one that could eat you.
  let nearest: RadarBlip | undefined;
  for (const a of game.actors) {
    if (a.controller === 'player' || !isAlive(a) || isHidden(a)) continue;
    const d = distXZ(a.pos, p.pos);
    if (d > range) continue;
    const hunting = !!a.brain && a.brain.target === p.id && (a.brain.goal === 'hunt' || a.brain.goal === 'notice');
    const band = bandOf(p, a);
    const dangerous = band === 'threat' || band === 'giant';
    if (!dangerous && !hunting) continue;
    const blip: RadarBlip = { kind: band === 'giant' ? 'giant' : 'threat', dx: a.pos.x - p.pos.x, dy: a.pos.y - p.pos.y, dz: a.pos.z - p.pos.z, distance: d, id: a.id, hunting };
    if (hunting) out.push(blip);
    else if (!nearest || d < nearest.distance) nearest = blip;
  }
  if (nearest) out.push(nearest);
  for (const f of foodClusters(game, p, range)) out.push(f);
  // The era's own contacts: the Triassic's occupied shore posts, each with its reach as the ring.
  if (RULES.radar) for (const b of RULES.radar(game, p, range)) out.push(b);
  // Landmarks are the other thing the radar is for in an endless sea: with the shore and your
  // nursery they are the only fixed points in it. Only within reach — a bearing, not a map.
  for (const m of game.world.landmarks) {
    const d = distXZ(m.pos, p.pos);
    if (d < range * 1.4) out.push({ kind: 'landmark', dx: m.pos.x - p.pos.x, dy: 0, dz: m.pos.z - p.pos.z, distance: d, id: m.id, hunting: false });
  }
  // Held ground, as an area rather than a contact. Only patches big enough to matter to this
  // player and close enough to walk into: the point is to let them decide before they are in it.
  for (const o of game.nearby(p.pos, range * 1.6)) {
    const b = o.brain;
    if (!b?.territory || b.territoryR <= 0 || !isAlive(o) || o.id === p.id) continue;
    if (lengthOf(o) < lengthOf(p) * 0.55) continue;                    // nothing you could not simply eat
    const d = distXZ(b.territory, p.pos);
    if (d > range * 1.6 + b.territoryR) continue;
    out.push({ kind: 'territory', dx: b.territory.x - p.pos.x, dy: 0, dz: b.territory.z - p.pos.z, distance: d, id: o.id, hunting: false, radius: b.territoryR });
  }
  out.push({ kind: 'home', dx: p.home.x - p.pos.x, dy: 0, dz: p.home.z - p.pos.z, distance: distXZ(p.home, p.pos), id: -1, hunting: false });
  const sz = shoreZ(p.pos.x);
  out.push({ kind: 'shore', dx: 0, dy: 0, dz: sz - p.pos.z, distance: Math.abs(sz - p.pos.z), id: -1, hunting: false });
  return out;
}

/**
 * The nearest shoal worth eating, as an area rather than a contact: wild snack and prey band
 * creatures within reach, bucketed into cells so a school reads as one patch of food instead of
 * a dozen dots, and only the closest patch is offered. Other players never appear here — hunting
 * one is a decision, not a suggestion.
 */
export function foodClusters(game: Game, p: Actor, range: number, max = 1): RadarBlip[] {
  const CELL = 14;
  const cells = new Map<string, { dx: number; dy: number; dz: number; n: number; food: number; r: number }>();
  for (const a of game.nearby(p.pos, range)) {
    if (a.id === p.id || !isAlive(a) || isHidden(a)) continue;
    if (a.controller === 'player') continue;
    const band = bandOf(p, a);
    if (band !== 'snack' && band !== 'prey') continue;
    const dx = a.pos.x - p.pos.x, dy = a.pos.y - p.pos.y, dz = a.pos.z - p.pos.z;
    // Reach is a sphere, not a column: a shoal a long way overhead is not food within reach of a
    // body on the floor, and showing it as a mark on the sand is how you send someone nowhere.
    if (Math.hypot(dx, dy, dz) > range) continue;
    const key = `${Math.floor(a.pos.x / CELL)},${Math.floor(a.pos.z / CELL)}`;
    const c = cells.get(key) ?? { dx: 0, dy: 0, dz: 0, n: 0, food: 0, r: 0 };
    c.dx += dx; c.dy += dy; c.dz += dz; c.n++; c.food += nutritionValue(game, p, a);
    cells.set(key, c);
  }
  const out: RadarBlip[] = [];
  for (const c of cells.values()) {
    c.dx /= c.n; c.dy /= c.n; c.dz /= c.n;
    // One lone snack is not a meal worth steering for; one prey-sized body is.
    if (c.n < 2 && c.food < 6) continue;
    c.r = Math.min(CELL, 3 + Math.sqrt(c.n) * 2.2);
    out.push({ kind: 'food', dx: c.dx, dy: c.dy, dz: c.dz, distance: Math.hypot(c.dx, c.dz), id: -1, hunting: false, radius: c.r, strength: c.food });
  }
  // Nearest by the swim it actually takes to get there, which includes the climb or the dive.
  return out.sort((a, b) => Math.hypot(a.distance, a.dy) - Math.hypot(b.distance, b.dy)).slice(0, max);
}

/** The dominant biome under a player, for the HUD banner. */
export function biomeOf(game: Game, i: number): Biome | undefined { const p = game.players[i]; return p ? biomeAt(p.pos.x, p.pos.z) : undefined; }

/** The line to show this player right now, if any. Prompts expire; the newest wins. */
export function noticeFor(game: Game, i: number): string | undefined {
  const pr = game.progress[i];
  return pr && pr.prompts.length ? pr.prompts[pr.prompts.length - 1].text : undefined;
}

/**
 * Onboarding: returns the current hint for a player, if any.
 *
 * Hints name actions, not buttons: `{heavy}`, `{dash}`, `{sense}`. The simulation has no idea
 * what anyone is holding and must not — the HUD fills them in for that player's own device
 * (`fillControls` in `src/shared/controls.ts`).
 */
export function hintFor(game: Game, i: number): string | undefined {
  const p = game.players[i]; const pr = game.progress[i];
  if (!p || !pr || game.mode === 'reef') return undefined;
  // The shore is every era's, so its hint comes before the era's own.
  if (p.ashore && isAlive(p)) {
    return !breathesAir(p.creature) ? SAY.hints.strandedGills
      : amphibious(p.creature) ? SAY.hints.ashoreAmphibious
      : SAY.hints.ashoreLungs;
  }
  return RULES.hint(game, i);
}

/** Where this player could teleport right now. */
export function teleportOptions(game: Game, i: number): TeleportOption[] {
  const p = game.players[i]; if (!p) return [];
  const out: TeleportOption[] = [{ dest: 'home', label: SAY.nursery, detail: SAY.nurseryDetail, distance: distXZ(p.pos, p.home) }];
  game.players.forEach((o, j) => {
    if (j === i) return;
    out.push({ dest: j, label: SAY.teleportPlayer(j + 1, creature(o.creature).name), detail: isAlive(o) ? ladderName(ladderRung(game, o)) : SAY.respawning, distance: distXZ(p.pos, o.pos) });
  });
  return out;
}

/**
 * Every creature this player could change into, in roster order, starting on the one they are.
 *
 * A creature they have worn before comes back at the mark it was left on; anything new starts at
 * whichever end of the ladder they asked for. Nothing is filtered out — the point is to be able
 * to raise the whole roster in one session if that is what you want to do.
 */
export function swapOptions(game: Game, i: number, grown: boolean): SwapOption[] {
  const p = game.players[i]; if (!p) return [];
  const mine = game.kept[i] ?? new Map<CreatureId, KeptBody>();
  const order = [...PLAYABLE_IDS];
  const at = order.indexOf(p.creature);
  // Start the cycle on the body they are in, so left and right walk away from where they are.
  const cycle = at >= 0 ? [...order.slice(at), ...order.slice(0, at)] : order;
  return cycle.map((id) => {
    const current = id === p.creature;
    const kept = mine.get(id);
    const mark = current ? ladderMark(game, p) : kept ? kept.mark : grown ? LADDER_TOP : 0;
    return { id, name: creature(id).name, mark, kept: current || !!kept, current };
  });
}
