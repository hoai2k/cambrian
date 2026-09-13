import { dist, distXZ, type Vec3 } from '../../shared/math';
import { bandOf, bodyRadius, clearanceOf, isAlive, isInvulnerable, lengthOf } from '../actors';
import { applyHit, kill, type HitContext } from '../combat';
import { creature, type CreatureId } from '../creatures';
import type { Game } from '../game';
import type { Actor } from '../types';
import { sampleHeight, shoreZ, SURFACE_Y } from '../world';
import { triActor } from './state';

/**
 * The shore animals (docs/triassic/01-triassic-design.md · The shore animals). Placed on the beach
 * by the world like landmarks — pure in the place and the seed, so a bank has the same animal on
 * it when you come back — non-playable, brainless (the shared AI never runs them), and with one
 * job: to make the last stretch of water near the shore a place a small animal enters at a cost.
 *
 * Each stands at a post just above the waterline with its head over the water. Anything alive in
 * the top few units of water within its reach is watched, then warned (the head lowers, the neck
 * stiffens, the HUD says so for a second and a half), then struck: a heavy's blow and a shove
 * toward the beach, a second bite for anything it could swallow. It cannot follow into deep water,
 * and Tanystropheus' neck is its weak point: a hit from a rung III or IV animal while the neck is
 * out severs it — the animal dies where it stands, the carcass is carrion, and the bank is clear
 * for the rest of the match.
 *
 * Presentation is the borrowed body until the real rigs land; the strike is a hit and an event,
 * not yet a clip, so nothing here depends on an animation that does not exist.
 */
const POST_SPACING = 170, POST_REACH = 260;
const TELEGRAPH = 1.5, COOLDOWN = 6, SURFACE_BAND = 4;

interface Post { k: number; actor: number; kind: CreatureId; pos: Vec3; phase: 'watch' | 'lower' | 'strike' | 'rest'; t: number; target: number; cleared: boolean; }
interface ShoreState { posts: Map<number, Post>; }
const states = new WeakMap<Game, ShoreState>();
const stateFor = (g: Game) => { let s = states.get(g); if (!s) { s = { posts: new Map() }; states.set(g, s); } return s; };

/** A small deterministic hash of the post index and the world seed. */
function hash(k: number, seed: number, salt: number) {
  let h = (Math.imul(k, 73856093) ^ Math.imul(seed + salt, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function kindAt(k: number, seed: number): CreatureId | undefined {
  const r = hash(k, seed, 1);
  if (r < 0.22) return undefined;                   // an empty bank now and then
  if (r < 0.58) return 'tanystropheus';
  if (r < 0.82) return 'mystriosuchus';
  if (r < 0.94) return 'macrocnemus';
  return 'coelophysis';
}
const worldSeed = (g: Game) => (g.world as unknown as { seed?: number }).seed ?? 0;

/** Reach of the strike in world units, and whether this kind strikes at all. */
function reachOf(a: Actor): number {
  const def = creature(a.creature), L = lengthOf(a);
  if (def.id === 'tanystropheus') return L * ((def.neckReach ?? 0.5) + 0.12);
  if (def.id === 'mystriosuchus') return L * 1.5;
  if (def.id === 'coelophysis') return L * 0.6;
  return 0;
}

function pin(a: Actor, pos: Vec3) {
  a.pos.x = pos.x; a.pos.y = pos.y; a.pos.z = pos.z;
  a.prevT.x = pos.x; a.prevT.y = pos.y; a.prevT.z = pos.z;
  a.vel.x = a.vel.y = a.vel.z = 0;
  a.yaw = Math.PI; a.prevT.yaw = a.yaw;             // facing the sea, which lies at smaller z
  a.hunted = 0; a.lockTarget = -1; a.airborne = false;
}

function ensurePosts(g: Game) {
  const s = stateFor(g), seed = worldSeed(g);
  for (const an of g.anchors()) {
    const k0 = Math.round((an.x - POST_REACH) / POST_SPACING), k1 = Math.round((an.x + POST_REACH) / POST_SPACING);
    for (let k = k0; k <= k1; k++) {
      if (s.posts.has(k)) continue;
      const kind = kindAt(k, seed);
      if (!kind) { s.posts.set(k, { k, actor: -1, kind: 'macrocnemus', pos: { x: 0, y: 0, z: 0 }, phase: 'rest', t: 0, target: -1, cleared: true }); continue; }
      const x = k * POST_SPACING + (hash(k, seed, 2) - 0.5) * 70;
      const a = g.spawn(kind, 'ambient', { x, y: SURFACE_Y, z: shoreZ(x) }, 1);
      // just above the waterline, its front over the water: the post sits a little way up the ramp
      const z = shoreZ(x) - (3 + bodyRadius(a) * 0.5);
      const y = Math.max(sampleHeight(x, z), SURFACE_Y - 0.5) + clearanceOf(a) * 0.6;
      const pos = { x, y, z };
      pin(a, pos);
      s.posts.set(k, { k, actor: a.id, kind, pos, phase: 'watch', t: 0, target: -1, cleared: false });
    }
  }
}

/** The players and bots a shore animal can reach: alive, in the water, and up near the surface. */
function reachable(g: Game, post: Post, a: Actor): Actor | undefined {
  const reach = reachOf(a);
  if (reach <= 0) return undefined;
  let best: Actor | undefined, bestD = Infinity;
  for (const o of g.nearby(post.pos, reach + 4)) {
    if (o.id === a.id || (o.controller !== 'player' && o.controller !== 'bot') || !isAlive(o) || isInvulnerable(o)) continue;
    if (o.pos.y < SURFACE_Y - SURFACE_BAND - lengthOf(o) * 0.3) continue;
    const d = distXZ(o.pos, post.pos) - bodyRadius(o);
    if (d <= reach && d < bestD) { bestD = d; best = o; }
  }
  return best;
}

export function stepShore(g: Game, ctx: HitContext, dt: number) {
  ensurePosts(g);
  const s = stateFor(g);
  for (const post of s.posts.values()) {
    if (post.cleared) continue;
    const a = g.byId(post.actor);
    if (!a) { post.cleared = true; continue; }
    if (!isAlive(a)) { post.cleared = true; continue; }
    const def = creature(a.creature);
    // A bite on the neck while it is out: severed, and the bank is clear. Coelophysis and the
    // runner have no neck to lose and the phytosaur is armoured; only the boom pays this price.
    if (def.id === 'tanystropheus' && post.phase !== 'watch' && post.phase !== 'rest' && a.sinceHit < dt * 2 && a.lastHitBy >= 0) {
      const attacker = g.byId(a.lastHitBy);
      if (attacker && (creature(attacker.creature).rung ?? 1) >= 3) { kill(ctx, a, attacker); post.cleared = true; continue; }
    }
    pin(a, post.pos);
    a.hp = Math.min(a.hpMax, a.hp + 2 * dt);                   // it heals on the bank; nothing keeps it hurt but a sever
    post.t += dt;
    const target = post.target >= 0 ? g.byId(post.target) : undefined;
    switch (post.phase) {
      case 'watch': {
        const o = reachable(g, post, a);
        if (o) { post.phase = 'lower'; post.t = 0; post.target = o.id; }
        break;
      }
      case 'lower': {
        const still = target && isAlive(target) && reachable(g, post, a)?.id === target.id;
        if (!still) { post.phase = 'watch'; post.t = 0; post.target = -1; break; }
        triActor(g, target).shoreWarn = Math.min(1, post.t / TELEGRAPH);
        if (post.t >= TELEGRAPH) {
          post.phase = 'strike'; post.t = 0;
          const move = { ...def.heavy, lunge: 0 };
          applyHit(ctx, a, target, move, 0.6);
          // the shove toward the beach, and a second bite for anything small enough to carry
          target.vel.z += 6; target.vel.y += 1.5;
          if (bandOf(a, target) === 'snack' && isAlive(target)) applyHit(ctx, a, target, { ...def.light, lunge: 0 }, 0);
          g.events.push({ kind: 'pounce', pos: { ...a.pos }, actor: a.id, other: target.id, player: target.player, strength: lengthOf(a) });
        }
        break;
      }
      case 'strike':
        if (target) triActor(g, target).shoreWarn = 0;
        if (post.t > 0.6) { post.phase = 'rest'; post.t = 0; post.target = -1; }
        break;
      case 'rest':
        if (post.t > COOLDOWN) { post.phase = 'watch'; post.t = 0; }
        break;
    }
  }
}

/** For the HUD and the tests: the posts near a point. */
export function shorePosts(g: Game, near: Vec3, r: number) {
  return [...stateFor(g).posts.values()].filter((p) => !p.cleared && dist(p.pos, near) < r);
}
