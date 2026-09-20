import { dist, distXZ, type Vec3 } from '../../shared/math';
import { bandOf, bodyRadius, clearanceOf, isAlive, isInvulnerable, lengthOf, speedFactor } from '../actors';
import type { Band } from '../types';
import { applyHit, kill, startSwallow, type HitContext } from '../combat';
import { creature, type CreatureId } from '../creatures';
import type { Game, RadarBlip } from '../game';
import type { Actor } from '../types';
import { sampleHeight, shoreZ, SURFACE_Y } from '../world';
import { triActor } from './state';

/**
 * The shore animals (docs/triassic/06-shore-visitors.md, built from
 * docs/triassic/01-triassic-design.md · The shore animals). Placed on the beach by the world like
 * landmarks — pure in the place, the seed and the *time*, so a bank has the same animal on it at
 * the same minute when a match is replayed — non-playable, brainless (the shared AI never runs
 * them), and with one job: to make the last stretch of water near the shore, and the sand itself,
 * a place an animal that *lingers* pays for.
 *
 * Lingering is the whole of it. A swimmer passing a bank at its own pace is never touched; one
 * that has been still within a post's reach for `STILL_TIME` — hovering, hiding, guarding, or
 * lying stranded on the sand between flops — is what the shore takes. Stillness is judged against
 * the animal's own cruise, so a hatchling drifting and an adult hovering are the same offence.
 *
 * Three kinds of animal, two shapes of behaviour:
 *
 * - **The lurkers** — Tanystropheus (the boom) and Mystriosuchus (the phytosaur) — stand at a post
 *   at the water's edge. `watch` (the boom's neck out over the water, the phytosaur's crest at the
 *   surface) → `lower` (the telegraph, 1.5 s, the HUD warns) → `strike` → `rest` → `watch`. The
 *   boom takes a snack whole — one gulp, no escape window, the camera following it up the beach —
 *   bites and shoves prey, and does not lower at all for anything bigger, because reaching for
 *   something that bites back is how the neck gets severed. The sever is unchanged: a rung III
 *   bite on the neck while it is out kills it where it stands and clears the bank for the match.
 * - **The runners** — Macrocnemus and Coelophysis — are not at the edge at all until they are.
 *   `away` is a timer on the post with no body behind it; when it runs out the body appears
 *   `INLAND_OFF` up the beach and runs down (`approach`), stands at the edge looking in (`peer`,
 *   for a window of `PEER_MIN..PEER_MAX`), and if something is still there for `STILL_TIME_RUNNER`
 *   it commits to a straight dash at where the victim *was* (`charge`, never homing — a runner that
 *   tracked would be unescapable), resolves the bite at the end of it (`snatch`: a snack is taken
 *   whole and eaten at the inland spot, prey or a rival is bitten), and runs back (`retreat`), up
 *   the sand and out of the world. It is in the water for well under two seconds and can be bitten
 *   there like anything else; a runner killed in the water dies there as a corpse.
 *
 * And they come and go: `occupied(k, seed, t)` is a pure schedule in windows of
 * `OCCUPANCY_WINDOW` seconds with a per-post phase offset, so a bank that had one may be empty
 * later and an empty bank may gain one. A lurker arriving walks down from `INLAND_OFF`; one
 * leaving finishes its cycle and walks back up. Nothing here teleports (every move is a straight
 * line at a walking or running pace, which `tools/motion-test.ts` would otherwise flag) and
 * nothing here calls Math.random.
 *
 * The cycle is also a performance, and `shoreClip` below is where the two meet. The simulation
 * decides the phase; the renderer asks what the body should be doing and plays it, timed to the
 * phase so the two are one clock. A model that lacks a clip simply keeps the shared state
 * machine's Idle or Crawl.
 */
/**
 * Whether shore animals are placed at all.
 *
 * **Off by default**, and a *Settings* toggle in the Triassic turns them on
 * (`Settings → Shore animals`). It is **live**: turned on mid-match the banks fill from the next
 * step (`ensurePosts` builds a post the first time it is asked for one, so there is nothing to
 * catch up on), and turned off `clearShore` takes every body off the beach and forgets every post,
 * so the beach is empty again rather than holding whatever was standing there.
 *
 * That is a setting reaching into a running simulation, which the determinism rule would otherwise
 * forbid — but it changes the world the same way in the same place whenever it is flipped, and the
 * schedule behind it (`occupied`) is pure in the post and the clock rather than in the history, so
 * a bank that comes back comes back on the same cycle it would have been on.
 */
let SHORE_ANIMALS = false;
export function setShoreAnimals(on: boolean) { SHORE_ANIMALS = on; }
export const shoreAnimalsOn = () => SHORE_ANIMALS;
/** For the tests only: hold every bank occupied (or empty) so a cycle can be watched without the schedule ending it. A game never sets this. */
let FORCE_OCCUPIED: boolean | undefined;
export function forceOccupancy(on: boolean | undefined) { FORCE_OCCUPIED = on; }

const POST_SPACING = 170, POST_REACH = 260;
export const TELEGRAPH = 1.5, COOLDOWN = 6, SURFACE_BAND = 4;
/** How long the recovery off a strike reads for; the rest of the cooldown is the watch again. */
const RECOVER = 0.9;
/** The severed-neck death, which runs once and then holds its last frame as the carcass. */
const SEVERED = 2.2;
/** The strike window: the snap clips' own length. */
const STRIKE = 0.6;
/** The boom's gulp: the neck coming up with the snack in the jaws, the Drag clip's own length. */
export const DRAG = 1.6;
/**
 * How long a body has to be still within reach before a lurker lowers or a runner charges, and how
 * slow "still" is as a fraction of that body's own cruise. Camouflage, guarding, aiming and the
 * drift of a body that has let go of the stick all fall under it — on purpose: hiding beside the
 * shore is the wrong place to hide, and a stranded animal lying between flops is exactly what a
 * runner comes down the beach for.
 */
export const STILL_TIME_LURKER = 3.0, STILL_TIME_RUNNER = 2.2, STILL_SPEED = 0.15;
/** A runner at the edge is a window, not a post: it looks in for this long and gives up. */
export const PEER_MIN = 8, PEER_MAX = 14;
/** The dash into the water: how long, how far (body lengths, per kind), and never deeper than this under the surface. */
export const CHARGE_TIME = 0.7, CHARGE_DEPTH = 1.5;
const CHARGE_REACH: Partial<Record<CreatureId, number>> = { macrocnemus: 3, coelophysis: 2 };
/** Between a runner's excursions, seconds, hashed per post and per excursion. */
export const RUNNER_REST_MIN = 20, RUNNER_REST_MAX = 40;
/** Where a body appears for its approach and vanishes after its retreat: up the beach, below every submerged sightline. */
export const INLAND_OFF = 14;
/** A runner eating its catch at the inland spot before it leaves. */
const EAT = 1.6;
/** The schedule: windows this long, in which a post is occupied with its kind's probability. */
export const OCCUPANCY_WINDOW = 150;
const PRESENCE_P: Partial<Record<CreatureId, number>> = { tanystropheus: 0.7, mystriosuchus: 0.6, macrocnemus: 0.5, coelophysis: 0.5 };
/** Walking and running paces, in body lengths a second: arrivals walk, runners run everywhere they go. */
const WALK_PACE = 0.35, RUN_PACE = 1.2;

type Phase = 'away' | 'arrive' | 'watch' | 'lower' | 'strike' | 'rest' | 'leave' | 'approach' | 'peer' | 'charge' | 'retreat' | 'eat';
interface Post {
  k: number; kind: CreatureId;
  /** The body at the post, or -1 while there is none: an unoccupied bank, or a runner between excursions. */
  actor: number;
  /** The post at the water's edge, and the inland spot bodies appear at and vanish from. */
  pos: Vec3; inland: Vec3;
  phase: Phase; t: number; target: number; cleared: boolean; side: 1 | -1; severed: boolean;
  /** How long each body within reach has been still, by actor id; pruned to what is in reach. */
  still: Map<number, number>;
  /** A charge's committed line, and how long the current straight-line move takes. */
  from: Vec3; to: Vec3; moveT: number;
  /** A runner: when its next excursion may begin, and how long this peer lasts. */
  nextT: number; peerFor: number;
  /** The body taken whole this cycle, or -1. */
  carrying: number;
  /** How many excursions this runner has made, which salts its hashes. */
  trips: number;
}
interface ShoreState { posts: Map<number, Post>; }
/**
 * The post a shore animal is standing at, keyed by the body itself. The renderer asks what a body
 * should be doing and has no Game to ask with, and an Actor belongs to exactly one match, so this
 * is unambiguous across games and needs no cleanup.
 */
const postOf = new WeakMap<Actor, Post>();
const states = new WeakMap<Game, ShoreState>();
const stateFor = (g: Game) => { let s = states.get(g); if (!s) { s = { posts: new Map() }; states.set(g, s); } return s; };

/** A small deterministic hash of the post index and the world seed. */
function hash(k: number, seed: number, salt: number) {
  let h = (Math.imul(k, 73856093) ^ Math.imul(seed + salt, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function kindAt(k: number, seed: number): CreatureId | undefined {
  const r = hash(k, seed, 1);
  if (r < 0.22) return undefined;                   // an empty bank now and then
  if (r < 0.58) return 'tanystropheus';
  if (r < 0.82) return 'mystriosuchus';
  if (r < 0.94) return 'macrocnemus';
  return 'coelophysis';
}
const worldSeed = (g: Game) => (g.world as unknown as { seed?: number }).seed ?? 0;
export const isRunner = (kind: CreatureId) => kind === 'macrocnemus' || kind === 'coelophysis';

/**
 * Whether post `k` is occupied at time `t`: a pure function of the post, the seed and the window
 * the time falls in, offset per post so the banks do not all change over on one beat.
 */
export function occupied(k: number, seed: number, t: number): boolean {
  const kind = kindAt(k, seed);
  if (!kind) return false;
  if (FORCE_OCCUPIED !== undefined) return FORCE_OCCUPIED;
  const offset = hash(k, seed, 3) * OCCUPANCY_WINDOW;
  const window = Math.floor((t + offset) / OCCUPANCY_WINDOW);
  return hash(k, seed, 100 + window) < (PRESENCE_P[kind] ?? 0);
}

/** Reach of the strike in world units. */
function reachOf(a: Actor): number {
  const def = creature(a.creature), L = lengthOf(a);
  if (def.id === 'tanystropheus') return L * ((def.neckReach ?? 0.5) + 0.12);
  if (def.id === 'mystriosuchus') return L * 1.5;
  return L * (CHARGE_REACH[def.id] ?? 0.6);
}
/** How long to be still before this kind commits. */
const stillTime = (kind: CreatureId) => isRunner(kind) ? STILL_TIME_RUNNER : STILL_TIME_LURKER;
/** Which bands this kind goes for: the boom will not reach for what could bite its neck off; a runner is a hit-and-run. */
function wanted(kind: CreatureId, band: Band): boolean {
  if (kind === 'tanystropheus') return band === 'snack' || band === 'prey';
  return band === 'snack' || band === 'prey' || band === 'rival';
}

/**
 * Which side of itself a body is on: +1 to the animal's left, -1 to its right.
 *
 * This is taken from the animal's own facing and not from a bare comparison of world x. A shore
 * animal is pinned at `yaw = PI`, and the renderer's own rule is that increasing yaw turns a
 * creature to its left, so its right is `(-cos yaw, 0, sin yaw)` — which at yaw = PI is *+x*. The
 * first version of this read "larger x is to its left" and so named the snap that swings the head
 * away from what it is striking at. Asking the facing keeps it right if the pin ever changes.
 */
function sideOf(a: Actor, from: Vec3, to: Vec3): 1 | -1 {
  const rx = -Math.cos(a.yaw), rz = Math.sin(a.yaw);
  return (to.x - from.x) * rx + (to.z - from.z) * rz > 0 ? -1 : 1;
}

/** Hold a body exactly here, facing `yaw` (PI faces the sea, which lies at smaller z). Never touches `prevT`: the step snapshot is the renderer's interpolation. */
function hold(a: Actor, pos: Vec3, yaw = Math.PI) {
  a.pos.x = pos.x; a.pos.y = pos.y; a.pos.z = pos.z;
  a.vel.x = a.vel.y = a.vel.z = 0;
  a.yaw = yaw; a.pitch = 0; a.bank = 0;
  a.hunted = 0; a.lockTarget = -1; a.airborne = false; a.hopVel = 0; a.grounded = true;
}
/** Where a body of this kind stands on the sand at (x, z): on the beach, a little above the waterline where the sand dips under it. */
function standAt(a: Actor, x: number, z: number): Vec3 {
  return { x, y: Math.max(sampleHeight(x, z), SURFACE_Y - 0.5) + clearanceOf(a) * 0.6, z };
}
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
/** The yaw that faces from `a` toward `b` (heading(yaw) = (sin, 0, cos)). */
const yawToward = (a: Vec3, b: Vec3) => Math.atan2(b.x - a.x, b.z - a.z);

function ensurePosts(g: Game) {
  if (!SHORE_ANIMALS) return;
  const s = stateFor(g), seed = worldSeed(g);
  for (const an of g.anchors()) {
    const k0 = Math.round((an.x - POST_REACH) / POST_SPACING), k1 = Math.round((an.x + POST_REACH) / POST_SPACING);
    for (let k = k0; k <= k1; k++) {
      if (s.posts.has(k)) continue;
      const kind = kindAt(k, seed);
      const x = k * POST_SPACING + (hash(k, seed, 2) - 0.5) * 70;
      const post: Post = {
        k, kind: kind ?? 'macrocnemus', actor: -1, pos: { x, y: SURFACE_Y, z: shoreZ(x) }, inland: { x, y: SURFACE_Y + 1, z: shoreZ(x) + INLAND_OFF },
        phase: 'away', t: 0, target: -1, cleared: !kind, side: 1, severed: false, still: new Map(),
        from: { x, y: 0, z: 0 }, to: { x, y: 0, z: 0 }, moveT: 1, nextT: hash(k, seed, 4) * RUNNER_REST_MAX, peerFor: PEER_MIN, carrying: -1, trips: 0,
      };
      s.posts.set(k, post);
    }
  }
}

/** Put a body of the post's kind at its inland spot, ready to come down. */
function appear(g: Game, post: Post): Actor {
  const a = g.spawn(post.kind, 'ambient', { ...post.inland }, 1);
  // The post proper: just above the waterline, its front over the water, a little way up the ramp.
  const x = post.pos.x;
  post.pos = standAt(a, x, shoreZ(x) - (3 + bodyRadius(a) * 0.5));
  post.inland = standAt(a, x, shoreZ(x) + INLAND_OFF);
  hold(a, post.inland);
  a.prevT.x = a.pos.x; a.prevT.y = a.pos.y; a.prevT.z = a.pos.z; a.prevT.yaw = a.yaw;
  post.actor = a.id; postOf.set(a, post);
  return a;
}
/** The body leaves the world: it is up the beach, where nothing can see it. */
function vanish(g: Game, post: Post, a: Actor) {
  g.despawn(a);
  post.actor = -1; post.still.clear(); post.target = -1; post.carrying = -1;
}
/** Start a straight-line move for the body at the post, at `pace` body lengths a second. */
function startMove(post: Post, a: Actor, from: Vec3, to: Vec3, pace: number) {
  post.from = { ...from }; post.to = { ...to };
  post.moveT = Math.max(0.05, dist(from, to) / (lengthOf(a) * pace));
  post.t = 0;
}
/** Carry the move on: returns true when it has arrived. */
function move(post: Post, a: Actor): boolean {
  const u = Math.min(1, post.t / post.moveT);
  hold(a, lerp3(post.from, post.to, u), yawToward(post.from, post.to));
  return u >= 1;
}

/**
 * The stillness detector. Every player or bot within reach — at the surface, or on the sand — has
 * its clock run while it is under `STILL_SPEED` of its own cruise and reset the moment it is not;
 * bodies out of reach are forgotten. Returns the one that has been still longest past the post's
 * threshold and is a band this kind goes for, or nothing.
 */
function stillest(g: Game, post: Post, a: Actor, dt: number): Actor | undefined {
  const reach = reachOf(a), need = stillTime(post.kind);
  const seen = new Set<number>();
  let best: Actor | undefined, bestT = 0;
  for (const o of g.nearby(post.pos, reach + 4)) {
    if (o.id === a.id || (o.controller !== 'player' && o.controller !== 'bot') || !isAlive(o) || isInvulnerable(o) || o.state === 'swallowed') continue;
    if (!inReach(post, a, o, reach)) continue;
    seen.add(o.id);
    const cruise = creature(o.creature).speed * speedFactor(o.scale);
    const moved = Math.hypot(o.pos.x - o.prevT.x, o.pos.z - o.prevT.z) / Math.max(dt, 1e-4);
    const t = moved < STILL_SPEED * cruise ? (post.still.get(o.id) ?? 0) + dt : 0;
    post.still.set(o.id, t);
    // The player is told it is being watched from halfway in, before anything is committed.
    if (t > need * 0.5 && o.controller === 'player') triActor(g, o).shoreWatch = Math.max(triActor(g, o).shoreWatch, Math.min(1, t / need));
    if (t >= need && wanted(post.kind, bandOf(a, o)) && t > bestT) { bestT = t; best = o; }
  }
  for (const id of [...post.still.keys()]) if (!seen.has(id)) post.still.delete(id);
  return best;
}
/** In the water at the top of the column, or out of it on the sand, and within the post's horizontal reach. */
function inReach(post: Post, a: Actor, o: Actor, reach = reachOf(a)): boolean {
  if (!o.ashore && o.pos.y < SURFACE_Y - SURFACE_BAND - lengthOf(o) * 0.3) return false;
  return distXZ(o.pos, post.pos) - bodyRadius(o) <= reach;
}

/** The blow, shared by the boom, the phytosaur and a runner's snatch: a snack is taken whole, anything else is bitten and shoved seaward. */
function bite(g: Game, ctx: HitContext, post: Post, a: Actor, target: Actor) {
  const def = creature(a.creature);
  if (bandOf(a, target) === 'snack' && target.state !== 'grabbed' && target.rideHost < 0) {
    startSwallow(ctx, a, target);
    post.carrying = target.id;
  } else {
    applyHit(ctx, a, target, { ...def.heavy, lunge: 0 }, 0.6);
    target.vel.z -= 4; target.vel.y += 1.5;                   // shoved off the bank, out to sea
  }
  g.events.push({ kind: 'shoreStrike', pos: { ...a.pos }, actor: a.id, other: target.id, player: target.player, strength: lengthOf(a) });
}

/**
 * Take the shore back off the beach. Every body standing at a post leaves the world the way it
 * would at the end of its own excursion, and the posts are forgotten — so turning the setting back
 * on rebuilds them from the schedule rather than resuming a half-finished strike.
 */
function clearShore(g: Game) {
  const s = states.get(g);
  if (!s || !s.posts.size) return;
  for (const post of s.posts.values()) {
    const a = post.actor >= 0 ? g.byId(post.actor) : undefined;
    if (a) vanish(g, post, a);
  }
  s.posts.clear();
}

export function stepShore(g: Game, ctx: HitContext, dt: number) {
  if (!SHORE_ANIMALS) { clearShore(g); return; }
  ensurePosts(g);
  const s = stateFor(g), seed = worldSeed(g);
  for (const post of s.posts.values()) {
    if (post.cleared) continue;
    const a = post.actor >= 0 ? g.byId(post.actor) : undefined;
    if (post.actor >= 0 && (!a || !isAlive(a))) {
      // A lurker killed at its post is a carcass on the bank and the bank is clear; a runner killed
      // in the water is a corpse that drifts, and the post waits for the next window.
      if (isRunner(post.kind)) { post.actor = -1; post.phase = 'away'; post.nextT = g.time + RUNNER_REST_MAX; post.still.clear(); }
      else post.cleared = true;
      continue;
    }
    post.t += dt;
    if (isRunner(post.kind)) stepRunner(g, ctx, post, a, dt, seed);
    else stepLurker(g, ctx, post, a, dt);
  }
}

function stepLurker(g: Game, ctx: HitContext, post: Post, a: Actor | undefined, dt: number) {
  const occ = occupied(post.k, worldSeed(g), g.time);
  if (!a) {
    if (occ && post.phase === 'away') { const b = appear(g, post); post.phase = 'arrive'; startMove(post, b, post.inland, post.pos, WALK_PACE); }
    return;
  }
  const def = creature(a.creature);
  // A bite on the neck while it is out: severed, and the bank is clear. Coelophysis and the
  // runner have no neck to lose and the phytosaur is armoured; only the boom pays this price.
  if (def.id === 'tanystropheus' && (post.phase === 'lower' || post.phase === 'strike') && a.sinceHit < dt * 2 && a.lastHitBy >= 0) {
    const attacker = g.byId(a.lastHitBy);
    if (attacker && (creature(attacker.creature).rung ?? 1) >= 3) {
      // The bank is clear, but the body is still on it for as long as a corpse lasts, and the
      // sever is the one death this animal has a clip for. `cleared` stops the step loop; the
      // flag is what `shoreClip` reads, so the neck goes down the way it was authored to.
      kill(ctx, a, attacker); post.cleared = true; post.severed = true; return;
    }
  }
  a.hp = Math.min(a.hpMax, a.hp + 2 * dt);                   // it heals on the bank; nothing keeps it hurt but a sever
  const target = post.target >= 0 ? g.byId(post.target) : undefined;
  switch (post.phase) {
    case 'arrive':
      if (move(post, a)) { post.phase = 'watch'; post.t = 0; hold(a, post.pos); }
      break;
    case 'watch': {
      hold(a, post.pos);
      const o = stillest(g, post, a, dt);
      if (o) { post.phase = 'lower'; post.t = 0; post.target = o.id; post.side = sideOf(a, post.pos, o.pos); }
      else if (!occ) { post.phase = 'leave'; startMove(post, a, post.pos, post.inland, WALK_PACE); post.still.clear(); }
      break;
    }
    case 'lower': {
      hold(a, post.pos);
      // Stillness is not re-checked here — it was still long enough to be chosen — but a target
      // that bolts out of reach on the warning is let go, which is what the warning is for.
      const there = target && isAlive(target) && !isInvulnerable(target) && inReach(post, a, target);
      if (!there) { post.phase = 'watch'; post.t = 0; post.target = -1; break; }
      triActor(g, target).shoreWarn = Math.min(1, post.t / TELEGRAPH);
      if (post.t >= TELEGRAPH) { post.phase = 'strike'; post.t = 0; bite(g, ctx, post, a, target); }
      break;
    }
    case 'strike':
      hold(a, post.pos);
      if (target) triActor(g, target).shoreWarn = 0;
      if (post.t > STRIKE) { post.phase = 'rest'; post.t = 0; post.target = -1; }
      break;
    case 'rest':
      hold(a, post.pos);
      if (post.t > COOLDOWN) { post.carrying = -1; post.phase = 'watch'; post.t = 0; }
      break;
    case 'leave':
      if (move(post, a)) { vanish(g, post, a); post.phase = 'away'; post.t = 0; }
      break;
    default:
      hold(a, post.pos);
  }
}

function stepRunner(g: Game, ctx: HitContext, post: Post, a: Actor | undefined, dt: number, seed: number) {
  const occ = occupied(post.k, seed, g.time);
  if (!a) {
    if (occ && post.phase === 'away' && g.time >= post.nextT) {
      const b = appear(g, post);
      post.trips++;
      post.phase = 'approach'; startMove(post, b, post.inland, post.pos, RUN_PACE);
    }
    return;
  }
  const L = lengthOf(a);
  const target = post.target >= 0 ? g.byId(post.target) : undefined;
  switch (post.phase) {
    case 'approach':
      if (move(post, a)) { post.phase = 'peer'; post.t = 0; post.peerFor = PEER_MIN + hash(post.k, seed, 200 + post.trips) * (PEER_MAX - PEER_MIN); hold(a, post.pos); }
      break;
    case 'peer': {
      hold(a, post.pos);
      const o = stillest(g, post, a, dt);
      if (o) {
        // Committed: a straight line at where the victim is now, as far in as this kind goes.
        const reach = reachOf(a);
        const dx = o.pos.x - post.pos.x, dz = o.pos.z - post.pos.z, d = Math.hypot(dx, dz);
        const run = Math.min(d, reach);
        const to = { x: post.pos.x + (dx / Math.max(d, 1e-6)) * run, y: 0, z: post.pos.z + (dz / Math.max(d, 1e-6)) * run };
        to.y = Math.max(sampleHeight(to.x, to.z) + clearanceOf(a) * 0.6, SURFACE_Y - CHARGE_DEPTH);
        post.from = { ...post.pos }; post.to = to; post.moveT = CHARGE_TIME; post.t = 0;
        post.phase = 'charge'; post.target = o.id; post.side = sideOf(a, post.pos, o.pos);
        triActor(g, o).shoreWarn = 1;
      } else if (post.t > post.peerFor) { post.phase = 'retreat'; startMove(post, a, post.pos, post.inland, RUN_PACE); post.still.clear(); }
      break;
    }
    case 'charge': {
      const done = move(post, a);
      if (target) triActor(g, target).shoreWarn = 1;
      if (done) {
        // One frame of resolution at the end of the dash: the head against the victim, or a miss.
        const head = { x: a.pos.x + Math.sin(a.yaw) * L * 0.4, y: a.pos.y, z: a.pos.z + Math.cos(a.yaw) * L * 0.4 };
        if (target && isAlive(target) && !isInvulnerable(target) && distXZ(target.pos, head) <= bodyRadius(a) + bodyRadius(target) + 0.6) bite(g, ctx, post, a, target);
        if (target) triActor(g, target).shoreWarn = 0;
        post.phase = 'retreat'; post.target = -1;
        startMove(post, a, a.pos, post.inland, RUN_PACE);
        // A snack in the jaws is eaten as the runner reaches the sand: the swallow is one clock with the run.
        const meal = post.carrying >= 0 ? g.byId(post.carrying) : undefined;
        if (meal && meal.state === 'swallowed') meal.stateDur = post.moveT + EAT * 0.6;
      }
      break;
    }
    case 'retreat':
      if (move(post, a)) {
        if (post.carrying >= 0 && g.byId(post.carrying)?.state === 'swallowed') { post.phase = 'eat'; post.t = 0; hold(a, post.inland, 0); }
        else { vanish(g, post, a); post.phase = 'away'; post.t = 0; post.nextT = g.time + RUNNER_REST_MIN + hash(post.k, seed, 300 + post.trips) * (RUNNER_REST_MAX - RUNNER_REST_MIN); }
      }
      break;
    case 'eat':
      hold(a, post.inland, 0);
      if (post.t > EAT) { vanish(g, post, a); post.phase = 'away'; post.t = 0; post.nextT = g.time + RUNNER_REST_MIN + hash(post.k, seed, 300 + post.trips) * (RUNNER_REST_MAX - RUNNER_REST_MIN); }
      break;
    default:
      hold(a, post.pos);
  }
}

/** For the HUD and the tests: the posts near a point, occupied or not, that have not been cleared. */
export function shorePosts(g: Game, near: Vec3, r: number) {
  return [...stateFor(g).posts.values()].filter((p) => !p.cleared && dist(p.pos, near) < r);
}
/** The posts with a body at the water's edge right now, as radar contacts: the reach is the ring. */
export function shoreRadar(g: Game, p: Actor, range: number): RadarBlip[] {
  const out: RadarBlip[] = [];
  for (const post of stateFor(g).posts.values()) {
    if (post.cleared || post.actor < 0) continue;
    const a = g.byId(post.actor); if (!a || !isAlive(a)) continue;
    if (post.phase === 'arrive' || post.phase === 'leave' || post.phase === 'approach' || post.phase === 'eat') continue;
    const d = distXZ(post.pos, p.pos);
    const reach = reachOf(a);
    if (d > range * 1.6 + reach) continue;
    out.push({ kind: 'territory', dx: post.pos.x - p.pos.x, dy: 0, dz: post.pos.z - p.pos.z, distance: d, id: a.id, hunting: post.target === p.id, radius: reach });
  }
  return out;
}

/**
 * What a shore animal's body should be doing, for the renderer (`EraRules.clip`). Presentation
 * only — it reads the phase the step above already decided and writes nothing.
 *
 * The clip names and their durations are the ones the built bodies carry
 * (`tools/triassic/creatures/<id>/`): Lower runs exactly TELEGRAPH, SnapLeft/SnapRight exactly the
 * strike window, Retract the first RECOVER of the cooldown, Drag the gulp, Charge the dash, and the
 * walks and runs loop for as long as the move takes, so the performance and the mechanic are the
 * same clock rather than two clocks that happen to agree. A body that has not landed yet — or one
 * that borrows a Devonian stand-in — simply does not have these clips, and the renderer falls back
 * to the shared state machine.
 */
export function shoreClip(a: Actor): { name: string; dur: number; loop?: boolean } | undefined {
  const post = postOf.get(a);
  if (!post) return undefined;
  if (post.severed) return { name: 'Severed', dur: SEVERED };
  if (post.cleared || post.actor !== a.id) return undefined;
  const runner = isRunner(post.kind);
  switch (post.phase) {
    case 'arrive': case 'leave': return { name: 'Crawl', dur: post.moveT, loop: true };
    case 'approach': return { name: 'Run', dur: post.moveT, loop: true };
    case 'watch': return post.kind === 'tanystropheus' ? { name: 'Fish', dur: 4, loop: true } : { name: 'Breathe', dur: 3, loop: true };
    case 'peer': return post.kind === 'macrocnemus' ? { name: 'Peer', dur: 4, loop: true } : { name: 'Lower', dur: TELEGRAPH };
    case 'lower': return { name: 'Lower', dur: TELEGRAPH };
    case 'charge': return { name: 'Charge', dur: CHARGE_TIME };
    case 'strike': return { name: post.side > 0 ? 'SnapLeft' : 'SnapRight', dur: STRIKE };
    case 'rest':
      if (post.carrying >= 0 && post.t < DRAG) return { name: 'Drag', dur: DRAG };
      return post.t < RECOVER ? { name: 'Retract', dur: RECOVER } : undefined;
    case 'retreat':
      if (runner) return post.t < 1.2 ? { name: post.carrying >= 0 && post.kind === 'macrocnemus' ? 'Snatch' : 'Retreat', dur: 1.2 } : { name: 'Run', dur: post.moveT, loop: true };
      return undefined;
    case 'eat': return { name: 'Eat', dur: EAT };
    default: return undefined;
  }
}
