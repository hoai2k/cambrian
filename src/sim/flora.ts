import { clamp } from '../shared/math';
import { floraPropId, propShape } from '../content/prop-shapes';
import { fpMax, fpReachAt, FOOTPRINT_BANDS, ROUND, type Footprint, type Reach } from './footprint';
import { bodyRadius } from './actors';
import { creature } from './creatures';
import type { Actor } from './types';
import type { Flora, FloraKind, WorldData } from './world';

/**
 * Plant physics. Every plant is a column anchored to the seabed whose top can be displaced
 * sideways (`bx`, `bz`, world units) by things swimming into it; a damped spring drifts it back.
 *
 * A plant blocks the shape it is drawn with. Where the era draws a kind with an authored prop, the
 * footprint and the height profile are that prop's own (`src/content/prop-shapes.json`), so a
 * driftwood log is a long low obstacle you swim past the ends of rather than a disc as wide as the
 * log is long, and a bryozoan fan is a sheet rather than a pillar. `FloraPhys` keeps the numbers
 * for the procedural stand-ins, which are round.
 *
 * When a body overlaps a plant, the penetration is split: the plant bends by its share and the
 * body is nudged out by the rest. How the split falls depends on how rigid the plant is (a
 * branching sponge resists, a tuft folds) against how big the body is, and on how high up the
 * plant the contact is: the base is rigid, the top gives. A plant that has been bent as far as it
 * will go stops resisting, so big things plough through what small things must slide around.
 */
export interface FloraPhys {
  /** Geometry height and radius at scale 1. */
  h: number; r: number;
  /** Radius profile along the height fraction. */
  profile: (f: number) => number;
  /** How hard the plant resists being bent, per unit of scale². */
  rigidity: number;
  /** Max top displacement as a fraction of height. */
  maxLean: number;
  /** Spring stiffness and damping. Under-damped so plants wobble back. */
  k: number; c: number;
  /** Drag on bodies moving through the plant (per second at full overlap). */
  drag: number;
}

export const FLORA_PHYS: Record<FloraKind, FloraPhys> = {
  cushion: { h: .6, r: .462, profile: () => .9, rigidity: 2.4, maxLean: .15, k: 38, c: 6.5, drag: .7 },
  lettuce: { h: .45, r: .275, profile: f => .15 + .85 * f, rigidity: .15, maxLean: .85, k: 24, c: 3.2, drag: 2.6 },
  spine: { h: 2.6, r: .428, profile: f => 1 - .35 * f, rigidity: 4, maxLean: .12, k: 42, c: 7, drag: .9 },
  glass: { h: 1.4, r: .801, profile: f => .1 + .9 * f, rigidity: .5, maxLean: .22, k: 25, c: 5, drag: 1.2 },
  // Tall branching sponge. Stiff: bodies slide around it; only giants push it over.
  vauxia: { h: 1.9, r: 0.36, profile: (f) => 0.35 + 0.65 * f, rigidity: 3.2, maxLean: 0.28, k: 42, c: 7, drag: 0.9 },
  // Sac sponge. Firm bulb; nudges most things aside.
  sac: { h: 1.13, r: 0.35, profile: (f) => 0.55 + 0.45 * Math.sin(Math.min(1, f) * Math.PI), rigidity: 2.4, maxLean: 0.22, k: 38, c: 6.5, drag: 0.7 },
  // Low spiny disc. You mostly swim over it; brushing it flexes the spines.
  choia: { h: 0.3, r: 0.65, profile: () => 1, rigidity: 0.5, maxLean: 0.6, k: 30, c: 5, drag: 0.5 },
  // Branching alga. Soft: bends right over and drifts back.
  thalli: { h: 1.4, r: 0.4, profile: (f) => 0.3 + 0.7 * f, rigidity: 0.3, maxLean: 0.8, k: 15, c: 2.0, drag: 2.2 },
  // Grass tuft. Folds under almost anything, slows small swimmers a little.
  tuft: { h: 0.55, r: 0.32, profile: (f) => 0.3 + 0.7 * f, rigidity: 0.1, maxLean: 0.95, k: 24, c: 3.2, drag: 2.6 },
  // ---- Devonian stand-ins ----
  // Crinoid: a thin stalk with a cup and a feathery crown at the top. Soft; sways slowly and wide.
  crinoid: { h: 2.2, r: 0.36, profile: (f) => 0.12 + 0.88 * f, rigidity: 0.6, maxLean: 0.5, k: 18, c: 2.6, drag: 1.4 },
  // Giant sea lily: a stem several body lengths tall with a crown at the top. Stiff at the base, the
  // crown sways; a fish swims between the stems rather than through them.
  lilyColumn: { h: 9.5, r: 0.5, profile: (f) => 0.08 + 0.92 * f, rigidity: 1.4, maxLean: 0.3, k: 12, c: 3.2, drag: 0.7 },
  // Algal frond tower: soft fronds all the way up. Parts around a body and closes behind it.
  frondTower: { h: 5.5, r: 0.7, profile: (f) => 0.3 + 0.7 * f, rigidity: 0.25, maxLean: 0.7, k: 12, c: 2.2, drag: 1.5 },
  // Stromatoporoid: a calcareous mound. Rigid like a boulder; nothing leans it.
  stromatoporoid: { h: 0.7, r: 0.65, profile: (f) => Math.sqrt(Math.max(0, 1 - f * f * 0.9)), rigidity: 14, maxLean: 0.03, k: 60, c: 10, drag: 0.3 },
  // Tabulate coral: a low flat shelf. Rigid; you swim over it.
  tabulate: { h: 0.3, r: 0.6, profile: () => 1, rigidity: 9, maxLean: 0.04, k: 50, c: 9, drag: 0.3 },
  // Rugose: a clump of horn corals. Firm; brushing it does little.
  rugose: { h: 0.55, r: 0.45, profile: (f) => 0.6 + 0.4 * f, rigidity: 5, maxLean: 0.08, k: 45, c: 8, drag: 0.5 },
  // Bryozoan: a flat net fan. Flexes a little at the top and springs back.
  bryozoan: { h: 0.9, r: 0.45, profile: (f) => 0.15 + 0.85 * f, rigidity: 0.8, maxLean: 0.3, k: 28, c: 4.5, drag: 1.0 },
  // Reed: tall thin stems for the river mouth and shallows. Folds right over and sways a lot.
  reed: { h: 1.8, r: 0.25, profile: (f) => 0.25 + 0.75 * f, rigidity: 0.12, maxLean: 0.9, k: 14, c: 2.0, drag: 1.5 },
  // Log: a trunk lying on the sand. Rigid; `r` is half its length, so it reads as a low round obstacle.
  log: { h: 0.5, r: 1.3, profile: () => 1, rigidity: 30, maxLean: 0.02, k: 80, c: 12, drag: 0.2 },
};

/**
 * The footprint and height profile each kind actually blocks with. A kind the era draws with an
 * authored prop takes that prop's measured silhouette; the rest are the round stand-ins `FLORA_PHYS`
 * describes. `unit` is what one point of `scale` is worth: a prop's radii are already in its own
 * units, a round kind's come from `P.r`.
 */
interface KindShape { bands: readonly Footprint[]; unit: number; widest: number }
const KIND_SHAPE = Object.fromEntries((Object.keys(FLORA_PHYS) as FloraKind[]).map((kind) => {
  const shape = propShape(floraPropId(kind));
  const P = FLORA_PHYS[kind];
  // A round stand-in is one band of unit circle, scaled by its own radius and tapered by `profile`.
  const bands: readonly Footprint[] = shape
    ? shape.bands
    : Array.from({ length: FOOTPRINT_BANDS }, (_, i) =>
      ROUND.map((r) => r * P.profile((i + 0.5) / FOOTPRINT_BANDS)));
  return [kind, { bands, unit: shape ? 1 : P.r, widest: Math.max(...bands.map((b) => fpMax(b))) }] as const;
})) as Record<FloraKind, KindShape>;

/** The widest a kind gets, per point of scale. */
export const floraReachOf = (kind: FloraKind) => KIND_SHAPE[kind].widest * KIND_SHAPE[kind].unit;

const BEND_EXP = 1.3;
const EPS = 1e-3;
const floraReachScratch: Reach = { d: 0, reach: 0, nx: 0, nz: 1 };

const activate = (world: WorldData, f: Flora) => { if (!f.active) { f.active = true; world.activeFlora.push(f); } };

/** What a body ran into among the plants, for the caller that decides whether to climb. */
export interface FloraContact {
  /** A plant resisted this body's way through. */
  blocked: boolean;
  /**
   * ...and it was walked straight into rather than clipped on the way past. A plant is a thin thing
   * you go around, so only a body aimed at the middle of one is asking to go over it.
   */
  headOn: boolean;
  /** The height to reach to be over the top of it. */
  top: number;
}
/** Within this much of dead-on (about 25°) counts as going at a plant rather than past it. */
const HEAD_ON = 0.9;

/** Resolve one body against the plants around it. Call after static collision. */
export function resolveFlora(world: WorldData, a: Actor, dt: number, scratch: Flora[], out?: FloraContact) {
  const def = creature(a.creature);
  const ra = bodyRadius(a);
  const pos = a.pos, vel = a.vel;
  // Presence in the water, area-ish: bigger bodies win against stiffer plants.
  const actorS = Math.pow(a.scale, 2.2) * (def.ground ? 1.3 : 1);
  const vlen = Math.hypot(vel.x, vel.z);
  if (out) { out.blocked = false; out.headOn = false; out.top = -Infinity; }
  for (const f of world.floraHash.query(pos.x, pos.z, ra + world.floraReach, scratch)) {
    // Cheap rejects first: most candidates are nowhere near.
    const dx0 = pos.x - f.pos.x, dz0 = pos.z - f.pos.z;
    const reach = f.R + ra + (f.active ? f.maxB : 0);
    if (dx0 * dx0 + dz0 * dz0 > reach * reach) continue;
    const H = f.H;
    if (pos.y - ra * 0.6 > f.pos.y + H || pos.y + ra * 0.6 < f.pos.y) continue;
    const P = FLORA_PHYS[f.kind];
    const fr = clamp((pos.y - f.pos.y) / H, 0.08, 1);
    const lean = Math.pow(fr, BEND_EXP);
    const cx = f.pos.x + f.bx * lean, cz = f.pos.z + f.bz * lean;
    // The plant's own silhouette at this height, turned the way it is drawn.
    const S = KIND_SHAPE[f.kind];
    const u = f.scale * S.unit;
    const rr = fpReachAt(S.bands, fr, cx, cz, f.rot, u, u, pos.x, pos.z, floraReachScratch);
    const rp = rr.reach;
    const d = rr.d;
    const pen = rp + ra - d;
    if (pen <= 0) continue;
    const nx = d > EPS ? rr.nx : Math.sin(f.rot), nz = d > EPS ? rr.nz : Math.cos(f.rot);

    const plantS = P.rigidity * f.scale * f.scale;
    const give = actorS / (actorS + plantS * 0.55);
    const maxB = f.maxB;

    // Bend the plant away from the body by its share. Near the base a small bend moves the contact
    // point very little, so the plant reads as rigid down there.
    const want = Math.min(pen * give / lean, maxB * 0.5);
    const bx = f.bx - nx * want, bz = f.bz - nz * want;
    const bl = Math.hypot(bx, bz);
    if (bl > maxB) { f.bx = bx * maxB / bl; f.bz = bz * maxB / bl; } else { f.bx = bx; f.bz = bz; }
    // Momentum: shove the top along with the body so it visibly gets knocked sideways.
    const shove = give * lean * 0.45;
    f.bvx += vel.x * shove; f.bvz += vel.z * shove;
    activate(world, f);

    // Nudge the body out by the rest. A plant that is flat on the floor stops resisting.
    const bendFrac = Math.min(1, Math.hypot(f.bx, f.bz) / maxB);
    const resist = (1 - give) * (1 - bendFrac * bendFrac);
    const push = pen * resist;
    pos.x += nx * push; pos.z += nz * push;
    // Record it for the climb: a plant is something to go round, unless the body is driving at the
    // middle of it, in which case going over is what was meant.
    if (out && push > 1e-3) {
      out.blocked = true;
      if (vlen > 0.05 && -(vel.x * nx + vel.z * nz) / vlen > HEAD_ON) {
        out.headOn = true;
        out.top = Math.max(out.top, f.pos.y + H + ra * 0.6);
      }
    }
    // Kill the inward velocity component by the same fraction so you slide rather than judder, and
    // turn part of it sideways, toward whichever side of the stem you are already on, so a near
    // head-on contact steers you around the plant instead of parking you against it.
    const vn = vel.x * nx + vel.z * nz;
    if (vn < 0) {
      vel.x -= nx * vn * resist; vel.z -= nz * vn * resist;
      if (vlen > 0.05) {
        const px = -vel.z / vlen, pz = vel.x / vlen;
        let side = nx * px + nz * pz;
        if (Math.abs(side) < 0.02) side = Math.sin(f.rot * 7.3 + a.id);
        const s = side >= 0 ? 1 : -1;
        const slide = -vn * resist * 0.6;
        vel.x += px * s * slide; vel.z += pz * s * slide;
      }
    }
    // Fronds drag on you, more the deeper in you are and the softer the plant.
    const overlap = clamp(pen / (rp + ra), 0, 1);
    const drag = Math.exp(-P.drag * overlap * give * dt);
    vel.x *= drag; vel.y *= drag; vel.z *= drag;
  }
}

/** Advance every disturbed plant's spring; drop those that have settled. */
export function stepFlora(world: WorldData, dt: number) {
  const list = world.activeFlora;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    const P = FLORA_PHYS[f.kind];
    // Stiffness scales with height so short tufts flick back and tall algae sway slowly.
    const k = P.k / Math.max(0.5, Math.sqrt(f.H)), c = P.c;
    f.bvx += (-k * f.bx - c * f.bvx) * dt;
    f.bvz += (-k * f.bz - c * f.bvz) * dt;
    f.bx += f.bvx * dt; f.bz += f.bvz * dt;
    const maxB = f.maxB;
    const bl = Math.hypot(f.bx, f.bz);
    if (bl > maxB) {
      f.bx *= maxB / bl; f.bz *= maxB / bl;
      // Bleed off velocity pointing further out.
      const ox = f.bx / bl, oz = f.bz / bl;
      const vo = f.bvx * ox + f.bvz * oz;
      if (vo > 0) { f.bvx -= ox * vo; f.bvz -= oz * vo; }
    }
    if (bl < EPS && Math.abs(f.bvx) < EPS && Math.abs(f.bvz) < EPS) {
      f.bx = f.bz = f.bvx = f.bvz = 0; f.active = false;
      list[i] = list[list.length - 1]; list.pop();
    }
  }
}

/** Static world-space size of a plant, from its kind and scale. */
export function floraSize(kind: FloraKind, scale: number, sy: number) {
  const P = FLORA_PHYS[kind];
  const H = P.h * sy;
  return { H, R: floraReachOf(kind) * scale, maxB: P.maxLean * H };
}

