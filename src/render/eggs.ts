import * as THREE from 'three';
import { lengthOf } from '../sim/actors';
import type { Actor } from '../sim/types';

/**
 * The egg a hatchling comes out of.
 *
 * The simulation says only that a body is `hatching` and how far through its state clock it is
 * (`HATCH_TIME` in src/sim/game.ts, five seconds on the bottom rung), and where it laid the egg:
 * on the sand against a rock or a plant (`layEgg`). Everything here is the show: a small, mostly
 * opaque capsule lying on its side that the animal fills, taking a poke from within that pushes a
 * bulge out through the wall, swelling as the body starts to uncurl, then splitting along the top
 * as it pushes out and leaving the two halves of the shell on the floor.
 *
 * Nothing in here feeds back into the sim, so it may use `Math.random` — a hatch that shimmers
 * differently on two machines is not a match that replayed differently.
 *
 * The phases, as fractions of the hatch:
 *   0.00–0.30  whole, breathing, the animal shifting inside
 *   0.30–0.55  pokes: a limb or a snout pushes a travelling bulge across the shell
 *   0.55–0.75  the top splits and hinges back, the head comes through
 *   0.75–1.00  the body wriggles clear, the halves fall away and fade
 */

const SEGMENTS = 28, RINGS = 20;
/** Where the shell parts: a fraction of the way down from the top. */
const LID = 0.42;

interface Poke { dir: THREE.Vector3; t: number; dur: number; power: number }

class Egg {
  readonly group = new THREE.Group();
  private lid: THREE.Mesh; private cup: THREE.Mesh;
  private base: Float32Array[] = [];
  private pokes: Poke[] = [];
  private nextPoke = 0.35;
  private tmp = new THREE.Vector3();
  private spin = Math.random() * Math.PI * 2;

  constructor(readonly actorId: number, at: THREE.Vector3, private radius: number, private yaw: number) {
    // Two caps of one ovoid: the lid hinges off the cup once the shell splits.
    const cut = Math.acos(1 - 2 * LID);
    const shell = (from: number, to: number) => {
      const g = new THREE.SphereGeometry(1, SEGMENTS, RINGS, 0, Math.PI * 2, from, to - from);
      g.scale(0.82, 1, 0.82);
      return g;
    };
    const mat = () => new THREE.MeshStandardMaterial({
      color: 0xe6dcc4, emissive: 0x6a5a3a, emissiveIntensity: 0.12,
      roughness: 0.55, metalness: 0, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    });
    this.lid = new THREE.Mesh(shell(0, cut), mat());
    this.cup = new THREE.Mesh(shell(cut, Math.PI), mat());
    for (const m of [this.lid, this.cup]) {
      m.frustumCulled = false;
      this.base.push(new Float32Array((m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array));
      (m.geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      this.group.add(m);
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
    for (let m = 0; m < 2; m++) {
      const mesh = m === 0 ? this.lid : this.cup;
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

    // The split — pushed open by the body growing into it, on the sim's own growth curve — and
    // then the halves left on the sand.
    const open = t <= 0.48 ? 0 : Math.min(1, (t - 0.48) / 0.3);
    this.lid.position.y = open * 0.25;
    this.lid.rotation.z = open * 1.7;
    this.lid.position.x = open * 0.7;
    const gone = t <= 0.86 ? 0 : Math.min(1, (t - 0.86) / 0.14);
    for (const m of [this.lid, this.cup]) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.9 * (1 - gone);
    }
    this.group.visible = gone < 1;
  }

  dispose() {
    for (const m of [this.lid, this.cup]) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
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
