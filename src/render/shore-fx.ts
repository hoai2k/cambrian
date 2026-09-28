/**
 * What a body does to the shore and the seabed, drawn: sand thrown by a burrow and prints left in
 * the beach. Presentation only — both read the simulation's own state (`hideMode`, `wade`, the drawn
 * pose) and neither writes to it, so `src/sim` keeps its determinism and gains no event.
 */
import * as THREE from 'three';
import { SAND_COLORS } from '../shared/environment-colors';
import { floorClearance, isAlive, lengthOf } from '../sim/actors';
import { amphibious, breathesAir } from '../sim/beach';
import type { Game } from '../sim/game';
import { biomeAt, groundHeight, LAND_REACH, sampleHeight, shoreDistance, SURFACE_Y, type Biome, type Boulder } from '../sim/world';
import type { CreatureView } from './creature';
import { laysMark, printableSand, sandThrow, trackGait, type BurrowPhase, type Sand, type Tracks } from './fx';

/**
 * How far from the camera a burrow still throws sand. Past this the grains are a pixel inside the
 * fog, so the work of emitting them buys nothing.
 */
const SAND_RANGE = 70;
/** How far a print is lifted off the sand it is pressed into, so it draws rather than z-fights. */
const TRACK_LIFT = 0.02;
/** The step the sand's own gradient is measured over, to lie a print along the beach's slope. */
const TRACK_SLOPE = 0.35;
const SAND_SWATCH = new THREE.Color();
const SAND_CACHE = new Map<Biome, THREE.Color>();
/**
 * The floor's own colour where a body is digging. A burrow in the shelf mosaic and one in the
 * black basin must not shower the same beige, and the biome under the animal is what decides.
 */
function sandColorAt(x: number, z: number): THREE.Color {
  const b = biomeAt(x, z);
  let c = SAND_CACHE.get(b);
  if (!c) { c = new THREE.Color(SAND_COLORS[b]); SAND_CACHE.set(b, c); }
  return SAND_SWATCH.copy(c);
}

/**
 * Sand around a body going into the seabed, and again as it comes back out.
 *
 * The simulation already leaves a silt cloud at the moment a burrower is covered — that is the
 * haze that hides it, and it is part of the rules. This is the other half, and it is purely a
 * look: the grains the animal actually displaces. A steady shower while it works itself down,
 * one throw as the floor closes over it, and a harder one thrown clear when it surfaces, so
 * both ends of the act are seen rather than only the disappearing.
 *
 * Renderer-side, off the actors' own `hideMode`, because nothing here is a rule: `src/sim` keeps
 * its determinism and gains no event. What it costs is one map of the bodies that are currently
 * in the floor, which on any roster is a handful.
 */
export class BurrowSand {
  update(game: Game, dt: number, focus: THREE.Vector3, sand: Sand) {
    for (const a of game.actors) {
      const was = this.burrowing.get(a.id) ?? 'none';
      const now = a.hideMode === 'descending' || a.hideMode === 'burrowed' ? a.hideMode : 'none';
      if (was === 'none' && now === 'none') continue;
      if (now === 'none') { this.burrowing.delete(a.id); this.sandOwed.delete(a.id); }
      else this.burrowing.set(a.id, now);
      // Only what somebody could be looking at: a shower behind the fog is frames spent on nothing.
      const dx = a.pos.x - focus.x, dz = a.pos.z - focus.z;
      if (dx * dx + dz * dz > SAND_RANGE * SAND_RANGE) continue;
      const L = lengthOf(a);
      // The floor is where the sand is, so the shower is seated there rather than on a body that
      // has already sunk half its length past it.
      const at = { x: a.pos.x, y: Math.min(a.pos.y + L * 0.1, sampleHeight(a.pos.x, a.pos.z) + L * 0.3), z: a.pos.z };
      const col = sandColorAt(a.pos.x, a.pos.z);
      const th = sandThrow(was, now, L);
      if (!th) continue;
      if (th.perSecond === 0) { sand.emit(at, col, th.grains, th.spread, th.speed, th.up, th.size, th.life); this.sandOwed.delete(a.id); continue; }
      // A rate rather than a count per frame, so the shower is the same shower at any frame rate
      // and a slow frame does not round it away.
      const owed = (this.sandOwed.get(a.id) ?? 0) + th.perSecond * dt;
      const n = Math.floor(owed);
      this.sandOwed.set(a.id, owed - n);
      if (n > 0) sand.emit(at, col, n, th.spread, th.speed, th.up, th.size, th.life);
    }
    // Bodies that left the sea while in the floor: the map is only ever a few entries deep.
    for (const id of this.burrowing.keys()) if (!game.byId(id)) { this.burrowing.delete(id); this.sandOwed.delete(id); }
  }
  /** Which bodies are in the seabed, so both the going in and the coming up are seen. */
  private burrowing = new Map<number, Exclude<BurrowPhase, 'none'>>();
  /** Fractional grains carried between frames, so a trickle is a rate and not a per-frame count. */
  private sandOwed = new Map<number, number>();

}

/**
 * Prints in the sand, wherever a player's body actually touches the shore.
 *
 * **The contacts are measured, never named.** A rig's bones are whatever its builder called them
 * — three eras, a dozen kits and no agreement on `fore_foot_L` — so asking for the feet by name
 * would work on one animal and silently do nothing on the next. What a print is, is the part of
 * the body that is *on the sand*, so that is what is asked: the lowest few bones of the rig, and
 * whether each is within `touch` of the ground under it. On a walker standing on the beach the
 * lowest bones are its feet, and when one lifts it stops being down; on a body lying in the sand
 * they are its belly, and the belly never lifts. The same test gives footprints for the one and
 * a drag for the other with nothing in it that knows which animal it is looking at.
 *
 * `laysMark` then decides, and one rule covers both: a contact marks when it comes down, and
 * again every `spacing` it travels while it stays down. A planted foot does not travel, so it
 * prints once; a belly does nothing else, so it draws a groove.
 *
 * Presentation only. Nothing here is a rule and `src/sim` gains no event — it is read off `wade`
 * and the drawn pose, like the burrow's sand above it. Players only, because these are the marks
 * the player is being shown that they made.
 */
export class ShoreTracks {
  update(game: Game, views: ReadonlyMap<number, CreatureView>, tracks: Tracks, scratchBoulders: Boulder[]) {
    for (const a of game.players) {
      const gait = isAlive(a) ? trackGait({
        legs: amphibious(a.creature), lungs: breathesAir(a.creature),
        wade: a.wade, length: lengthOf(a), clearance: floorClearance(a),
      }) : null;
      const view = gait ? views.get(a.id) : undefined;
      if (!gait || !view) { this.printed.delete(a.id); continue; }
      const bones = view.anchors.bones;
      if (!bones.length) continue;
      // The lowest `contacts` bones, by world height. Their matrices are last frame's until the
      // renderer walks the scene, and a print has to land where the foot is *now*.
      const n = Math.min(gait.contacts, this.lowY.length);
      let have = 0;
      for (const b of bones) {
        b.updateWorldMatrix(true, false);
        const e = b.matrixWorld.elements, y = e[13];
        if (have === n && y >= this.lowY[have - 1]) continue;
        let i = have < n ? have++ : n - 1;
        for (; i > 0 && this.lowY[i - 1] > y; i--) {
          this.lowY[i] = this.lowY[i - 1]; this.lowX[i] = this.lowX[i - 1]; this.lowZ[i] = this.lowZ[i - 1]; this.lowName[i] = this.lowName[i - 1];
        }
        this.lowY[i] = y; this.lowX[i] = e[12]; this.lowZ[i] = e[14]; this.lowName[i] = b.name || `bone${b.id}`;
      }
      let st = this.printed.get(a.id);
      if (!st) { st = new Map(); this.printed.set(a.id, st); }
      this.printSeen.clear();
      for (let i = 0; i < have; i++) {
        const x = this.lowX[i], y = this.lowY[i], z = this.lowZ[i], name = this.lowName[i];
        this.printSeen.add(name);
        const sand = sampleHeight(x, z);
        let c = st.get(name);
        if (!c) { c = { down: false, mx: x, mz: z }; st.set(name, c); }
        if (y - sand > gait.touch) { c.down = false; continue; }   // this part is off the sand
        const lay = laysMark(gait, c.down, Math.hypot(x - c.mx, z - c.mz));
        c.down = true;
        if (!lay) continue;
        c.mx = x; c.mz = z;
        // Sand only, and the shore only. A boulder stands proud of the seabed it sits on and
        // presses into nothing, out past the strand the sand is under the sea, and past
        // `LAND_REACH` is not the shore; `printableSand` answers all three.
        if (!printableSand({
          sand, ground: groundHeight(game.world, x, z, scratchBoulders), surfaceY: SURFACE_Y,
          inland: -shoreDistance(x, z), reach: LAND_REACH,
        })) continue;
        const h = TRACK_SLOPE;
        const dhdx = (sampleHeight(x + h, z) - sampleHeight(x - h, z)) / (2 * h);
        const dhdz = (sampleHeight(x, z + h) - sampleHeight(x, z - h)) / (2 * h);
        tracks.lay(x, sand + TRACK_LIFT, z, dhdx, dhdz, a.yaw, gait);
      }
      // A rig whose lowest bones have changed leaves the old ones behind; the map is a handful.
      for (const name of st.keys()) if (!this.printSeen.has(name)) st.delete(name);
    }
    for (const id of this.printed.keys()) if (!game.byId(id)) this.printed.delete(id);
  }
  /** Per player, per contact: was it down last frame, and where did it last leave a mark. */
  private printed = new Map<number, Map<string, { down: boolean; mx: number; mz: number }>>();
  private printSeen = new Set<string>();
  /** The lowest bones of one rig this frame, kept as plain numbers so a frame allocates nothing. */
  private lowX = new Float64Array(6); private lowY = new Float64Array(6); private lowZ = new Float64Array(6);
  private lowName: string[] = new Array(6).fill('');
  clear() { this.printed.clear(); }
}
