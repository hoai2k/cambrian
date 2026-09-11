import * as THREE from 'three';
import { lengthOf } from '../sim/actors';
import type { Actor } from '../sim/types';

/**
 * The egg a hatchling comes out of.
 *
 * The simulation says only that a body is `hatching` and how far through its state clock it is
 * (`HATCH_TIME` in src/sim/game.ts, five seconds on the bottom rung), and where it laid the egg:
 * settled into the sand against a rock or a plant (`layEgg`). Everything here is the show: a small,
 * mostly opaque capsule lying on its side that the animal fills, taking a poke from within that
 * pushes a bulge out through the wall, swelling as the body starts to uncurl, then splitting down
 * its length and falling open to either side, the two halves left lying on the floor.
 *
 * The split is a *vertical* plane through the long axis, hinged along the bottom where the halves
 * meet the sand — an egg comes apart like a shell opening, not like a lid coming off a pot, and a
 * horizontal cut reads as the top half floating away.
 *
 * Nothing in here feeds back into the sim, so it may use `Math.random` — a hatch that shimmers
 * differently on two machines is not a match that replayed differently.
 *
 * The phases, as fractions of the hatch:
 *   0.00–0.30  whole, breathing, the animal shifting inside
 *   0.30–0.48  pokes: a limb or a snout pushes a travelling bulge across the shell
 *   0.48–0.78  the seam gives and the halves swing open to either side
 *   0.78–1.00  the body wriggles clear, the halves lie back on the sand and fade
 */

const SEGMENTS = 28, RINGS = 20;
/** How far each half swings away from the seam, in radians, once the shell is fully open. */
const OPEN_ANGLE = 1.55;

interface Poke { dir: THREE.Vector3; t: number; dur: number; power: number }

class Egg {
  readonly group = new THREE.Group();
  /** The two halves, and the hinges they swing on — one at each side of the seam's floor. */
  private halves: THREE.Mesh[] = [];
  private hinges: THREE.Group[] = [];
  private base: Float32Array[] = [];
  private pokes: Poke[] = [];
  private nextPoke = 0.35;
  private tmp = new THREE.Vector3();
  private spin = Math.random() * Math.PI * 2;

  constructor(readonly actorId: number, at: THREE.Vector3, private radius: number, private yaw: number) {
    // Two halves of one ovoid, cut by the vertical plane that holds the long axis: three.js sweeps
    // phi around Y from +Z, so half a turn from 0 is everything on one side of that plane and half
    // a turn from π is the other.
    const shell = (phiStart: number) => {
      const g = new THREE.SphereGeometry(1, SEGMENTS, RINGS, phiStart, Math.PI);
      g.scale(0.82, 1, 0.82);
      return g;
    };
    const mat = () => new THREE.MeshStandardMaterial({
      color: 0xe6dcc4, emissive: 0x6a5a3a, emissiveIntensity: 0.12,
      roughness: 0.55, metalness: 0, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    });
    for (const phi of [0, Math.PI]) {
      const m = new THREE.Mesh(shell(phi), mat());
      m.frustumCulled = false;
      // The hinge sits at the bottom of the seam, so a half tips outward onto the sand instead of
      // pivoting about the middle of the egg and swinging its own rim through the floor.
      const hinge = new THREE.Group();
      hinge.position.y = -1; m.position.y = 1;
      hinge.add(m); this.group.add(hinge);
      this.base.push(new Float32Array((m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array));
      (m.geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      this.halves.push(m); this.hinges.push(hinge);
    }
    this.group.position.copy(at);
    // An egg is longer than it is wide, and this one lies on its side along the body inside it.
    this.group.scale.set(radius, radius, radius * 1.45);
    this.group.name = 'egg';
  }

  /** `t` is the hatch, 0..1. */
  update(t: number, dt: number, at: THREE.Vector3) {
    // The shell sits where it was laid; the animal is what leaves it.
    if (t < 0.5) this.group.position.lerp(at, 1 - Math.exp(-dt * 2));
    this.spin += dt * 0.35;
    this.group.rotation.set(Math.sin(this.spin * 1.3) * 0.015, this.yaw, Math.cos(this.spin * 0.9) * 0.015);

    // Pokes from inside. They come faster as the animal runs out of room, and the last of them is
    // what opens the shell.
    if (t > 0.18 && t < 0.62) {
      this.nextPoke -= dt;
      if (this.nextPoke <= 0) {
        this.nextPoke = 0.75 - t * 0.7 + Math.random() * 0.25;
        const a = Math.random() * Math.PI * 2, h = 0.15 + Math.random() * 0.9;
        const r = Math.sqrt(Math.max(0, 1 - h * h));
        this.pokes.push({ dir: new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), t: 0, dur: 0.45 + Math.random() * 0.3, power: 0.18 + t * 0.5 });
      }
    }
    for (let i = this.pokes.length - 1; i >= 0; i--) {
      this.pokes[i].t += dt;
      if (this.pokes[i].t > this.pokes[i].dur) this.pokes.splice(i, 1);
    }

    // Breathing, the swell as the body inside starts to uncurl, and every live poke, written
    // straight into the vertices.
    const swell = Math.min(1, Math.max(0, (t - 0.38) / 0.2));
    const breath = 1 + Math.sin(t * 26) * 0.01 + swell * 0.14;
    for (let m = 0; m < this.halves.length; m++) {
      const mesh = this.halves[m];
      const attr = mesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array, base = this.base[m];
      for (let i = 0; i < arr.length; i += 3) {
        this.tmp.set(base[i], base[i + 1], base[i + 2]);
        let push = breath;
        for (const p of this.pokes) {
          const f = Math.sin((p.t / p.dur) * Math.PI);
          const d = this.tmp.dot(p.dir) / Math.max(this.tmp.length(), 1e-4);
          push += p.power * f * Math.pow(Math.max(0, d), 14);
        }
        arr[i] = base[i] * push; arr[i + 1] = base[i + 1] * push; arr[i + 2] = base[i + 2] * push;
      }
      attr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }

    // The seam gives — pushed open by the body growing into it, on the sim's own growth curve — and
    // the halves fall away to either side and lie there.
    const open = t <= 0.48 ? 0 : Math.min(1, (t - 0.48) / 0.3);
    const swing = open * open * (3 - 2 * open) * OPEN_ANGLE;
    this.hinges[0].rotation.z = -swing;
    this.hinges[1].rotation.z = swing;
    const gone = t <= 0.86 ? 0 : Math.min(1, (t - 0.86) / 0.14);
    for (const m of this.halves) (m.material as THREE.MeshStandardMaterial).opacity = 0.9 * (1 - gone);
    this.group.visible = gone < 1;
  }

  dispose() {
    for (const m of this.halves) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  }
}

/**
 * Every egg in the sea at once. One per hatching player, made when the hatch starts and thrown
 * away when the animal is out — nothing is pooled, because there is at most one per player and at
 * most one hatch each per life.
 */
export class Eggs {
  readonly group = new THREE.Group();
  private live = new Map<number, Egg>();
  private at = new THREE.Vector3();

  constructor() { this.group.name = 'eggs'; }

  /** `hatchLength` is what the animal will measure when it is out, so the shell fits it. */
  update(actors: readonly Actor[], dt: number) {
    const seen = new Set<number>();
    for (const a of actors) {
      if (!a.hatching || a.state !== 'moult' || a.stateDur < 2) continue;
      seen.add(a.id);
      const t = Math.min(1, a.stateT / a.stateDur);
      this.at.set(a.pos.x, a.pos.y, a.pos.z);
      let egg = this.live.get(a.id);
      if (!egg) {
        // Sized to the body as it is inside, curled: the animal fills the egg, it does not float
        // in it. The sim keeps it at 62% of hatched length until it starts to come out.
        egg = new Egg(a.id, this.at, Math.max(0.12, lengthOf(a) * 0.36), a.yaw);
        this.live.set(a.id, egg);
        this.group.add(egg.group);
      }
      egg.update(t, dt, this.at);
    }
    for (const [id, egg] of this.live) {
      if (seen.has(id)) continue;
      this.group.remove(egg.group); egg.dispose(); this.live.delete(id);
    }
  }

  dispose() {
    for (const egg of this.live.values()) { this.group.remove(egg.group); egg.dispose(); }
    this.live.clear();
  }
}
