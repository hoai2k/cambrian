import * as THREE from 'three';
import type { SiltCloud } from '../sim/types';

/** Pooled bubbles / debris particles. */
export class Bubbles {
  readonly points: THREE.Points;
  private pos: Float32Array; private vel: Float32Array; private life: Float32Array; private size: Float32Array;
  private geo: THREE.BufferGeometry; private cursor = 0;
  constructor(private max = 900, color = [0.8, 0.95, 0.95], private rise = 0.6) {
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.size = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aLife;attribute float aSize;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*380./max(1.,-mv.z),0.,18.)*step(0.001,aLife);vA=clamp(aLife,0.,1.);}`,
      uniforms: { uColor: { value: new THREE.Color(color[0], color[1], color[2]) } },
      fragmentShader: `uniform vec3 uColor;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float ring=smoothstep(1.,.55,r)*(.35+.65*smoothstep(.2,.7,r));gl_FragColor=vec4(uColor,ring*vA*.8);}`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false; this.points.name = 'bubbles';
  }
  emit(p: { x: number; y: number; z: number }, n: number, spread: number, speed: number, size = 0.08, life = 1.2) {
    for (let i = 0; i < n; i++) {
      const k = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * 6.283, b = Math.random() * 3.14;
      this.pos[k * 3] = p.x + (Math.random() - 0.5) * spread; this.pos[k * 3 + 1] = p.y + (Math.random() - 0.5) * spread; this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      this.vel[k * 3] = Math.cos(a) * Math.sin(b) * speed; this.vel[k * 3 + 1] = Math.abs(Math.cos(b)) * speed * 0.6 + this.rise; this.vel[k * 3 + 2] = Math.sin(a) * Math.sin(b) * speed;
      this.life[k] = life * (0.6 + Math.random() * 0.6); this.size[k] = size * (0.6 + Math.random() * 0.8);
    }
  }
  update(dt: number) {
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.vel[k * 3] *= 0.96; this.vel[k * 3 + 2] *= 0.96; this.vel[k * 3 + 1] += 1.5 * dt;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
  dispose() { this.geo.dispose(); (this.points.material as THREE.Material).dispose(); }
}

/** Expanding impact rings. */
export class Impacts {
  readonly group = new THREE.Group();
  private pool: { mesh: THREE.Mesh; t: number; dur: number; size: number }[] = [];
  private geo = new THREE.RingGeometry(0.6, 1, 32);
  constructor() { this.group.name = 'impacts'; }
  spawn(p: { x: number; y: number; z: number }, color: string, size = 1, dur = 0.35) {
    let it = this.pool.find((x) => x.t >= x.dur);
    if (!it) {
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      it = { mesh, t: 0, dur, size }; this.pool.push(it); this.group.add(mesh);
    }
    (it.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    it.mesh.position.set(p.x, p.y, p.z); it.mesh.visible = true; it.t = 0; it.dur = dur; it.size = size;
  }
  update(dt: number, camPos: THREE.Vector3) {
    for (const it of this.pool) {
      if (it.t >= it.dur) { it.mesh.visible = false; continue; }
      it.t += dt;
      const k = it.t / it.dur;
      it.mesh.scale.setScalar(it.size * (0.3 + k * 1.4));
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      it.mesh.lookAt(camPos);
    }
  }
  dispose() { this.geo.dispose(); this.pool.forEach((p) => (p.mesh.material as THREE.Material).dispose()); this.group.removeFromParent(); }
}

/** Silt clouds mirrored from the sim. */
export class Silt {
  readonly group = new THREE.Group();
  private meshes = new Map<SiltCloud, THREE.Mesh>();
  private geo = new THREE.SphereGeometry(1, 16, 12);
  constructor() { this.group.name = 'silt'; }
  sync(clouds: SiltCloud[], time: number) {
    const live = new Set(clouds);
    for (const [c, m] of this.meshes) if (!live.has(c)) { (m.material as THREE.Material).dispose(); m.removeFromParent(); this.meshes.delete(c); }
    for (const c of clouds) {
      let m = this.meshes.get(c);
      if (!m) {
        m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: '#a9b59a', transparent: true, opacity: 0.55, depthWrite: false, fog: true }));
        m.position.set(c.pos.x, c.pos.y, c.pos.z); this.group.add(m); this.meshes.set(c, m);
      }
      const age = 4.5 - c.t;
      const s = c.radius * (0.5 + Math.min(1, age * 1.6) * 0.5) * (1 + 0.04 * Math.sin(time * 3));
      m.scale.set(s, s * 0.75, s);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.6, c.t * 0.35) * 0.9;
    }
  }
  dispose() { this.geo.dispose(); this.meshes.forEach((m) => (m.material as THREE.Material).dispose()); this.group.removeFromParent(); }
}


/**
 * Water thrown into the air: droplets that fly up and fall back under gravity, and foam rings that
 * spread on the surface. Used when a body leaves the water (a sheet of spray dragged up with it)
 * and when it comes back in (a crown of droplets and a wide ring). Droplets die as they fall back
 * through the surface, where the underwater bubbles take over.
 */
export class Splash {
  readonly group = new THREE.Group();
  private points: THREE.Points;
  private pos: Float32Array; private vel: Float32Array; private life: Float32Array; private size: Float32Array;
  private geo: THREE.BufferGeometry; private cursor = 0;
  private rings: { mesh: THREE.Mesh; t: number; dur: number; r: number }[] = [];
  private ringGeo = new THREE.RingGeometry(0.75, 1, 40);
  constructor(private surfaceY: number, private max = 700) {
    this.group.name = 'splash';
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.size = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `attribute float aLife;attribute float aSize;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*420./max(1.,-mv.z),0.,22.)*step(0.001,aLife);vA=clamp(aLife*1.6,0.,1.);}`,
      fragmentShader: `varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float d=smoothstep(1.,.35,r);gl_FragColor=vec4(vec3(.93,.98,1.),d*vA*.9);}`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false; this.points.name = 'splash-drops';
    this.group.add(this.points);
  }
  /** `out`: the body is leaving the water (spray dragged up). `in`: it is landing (a crown and a ring). */
  burst(p: { x: number; y: number; z: number }, strength: number, kind: 'out' | 'in', bodyLength = 1) {
    const s = Math.max(0.3, strength), radius = Math.max(0.4, bodyLength * 0.35);
    const n = Math.round((kind === 'in' ? 110 : 60) * s);
    for (let i = 0; i < n; i++) {
      const k = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * radius;
      this.pos[k * 3] = p.x + Math.cos(a) * rr; this.pos[k * 3 + 1] = this.surfaceY + 0.05; this.pos[k * 3 + 2] = p.z + Math.sin(a) * rr;
      const up = kind === 'in' ? 4 + Math.random() * 7 * s : 5 + Math.random() * 9 * s;
      const out = kind === 'in' ? 2.5 + Math.random() * 4 * s : 0.8 + Math.random() * 2.2 * s;
      this.vel[k * 3] = Math.cos(a) * out; this.vel[k * 3 + 1] = up; this.vel[k * 3 + 2] = Math.sin(a) * out;
      this.life[k] = 0.9 + Math.random() * 1.2; this.size[k] = (0.05 + Math.random() * 0.09) * (0.7 + s * 0.5);
    }
    const ring = (r: number, dur: number, alpha: number) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xeaf7ff, transparent: true, opacity: alpha, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(p.x, this.surfaceY + 0.06, p.z); mesh.scale.setScalar(0.01);
      this.group.add(mesh); this.rings.push({ mesh, t: 0, dur, r });
    };
    ring(radius * (kind === 'in' ? 5.5 : 3) * Math.sqrt(s), kind === 'in' ? 1.6 : 1.0, 0.75);
    if (kind === 'in') ring(radius * 3 * Math.sqrt(s), 1.0, 0.9);
  }
  update(dt: number) {
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      this.vel[k * 3 + 1] -= 16 * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      if (this.pos[k * 3 + 1] < this.surfaceY - 0.2 && this.vel[k * 3 + 1] < 0) this.life[k] = 0;   // back in the sea
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt;
      const f = Math.min(1, r.t / r.dur);
      r.mesh.scale.setScalar(0.05 + r.r * Math.sqrt(f));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - f) * (1 - f) * 0.85;
      if (f >= 1) { this.group.remove(r.mesh); (r.mesh.material as THREE.Material).dispose(); this.rings.splice(i, 1); }
    }
  }
  dispose() { this.geo.dispose(); (this.points.material as THREE.Material).dispose(); this.ringGeo.dispose(); for (const r of this.rings) (r.mesh.material as THREE.Material).dispose(); }
}



/**
 * Which of the three states a body is in with respect to the seabed. A renderer reads this off the
 * actor's own `hideMode`; nothing in `src/sim` knows this module exists.
 */
export type BurrowPhase = 'none' | 'descending' | 'burrowed';

/** One shower of sand: either a count thrown at once, or a rate for as long as the state lasts. */
export interface SandThrow {
  /** Grains thrown in one go. Zero on a continuous shower. */
  readonly grains: number;
  /** Grains per second while the state holds. Zero on a one-off. */
  readonly perSecond: number;
  readonly spread: number;
  readonly speed: number;
  readonly up: number;
  readonly size: number;
  readonly life: number;
}

/**
 * What a body owes the sand for moving between two hiding states, given its length.
 *
 * Three moments are worth drawing and the rest are not:
 *
 *  - **going down** (`descending`) is a *rate* — the animal is working itself under and throwing
 *    sand the whole time, so a shower runs for as long as that lasts;
 *  - **covered** (`descending` → `burrowed`) is one throw, the floor closing over it;
 *  - **coming up** (out of either) is one harder throw, because the sand that settled has to be
 *    pushed out of the way, and because the surfacing is the half a player most needs to see.
 *
 * Staying buried owes nothing: a still animal under the sand is not moving any.
 *
 * Pure, so `npm run sand` can hold the mapping without a WebGL context — the renderer keeps only
 * the accumulator that turns `perSecond` into whole grains.
 */
export function sandThrow(was: BurrowPhase, now: BurrowPhase, L: number): SandThrow | null {
  const body = Math.max(0.3, L);
  if (now === 'none') {
    if (was === 'none') return null;
    return { grains: Math.round(55 + body * 18), perSecond: 0, spread: body * 0.6, speed: body * 1.4 + 1.6, up: body * 1.3 + 1.4, size: 0.045 + body * 0.03, life: 1.5 };
  }
  if (now === 'burrowed') {
    if (was === 'burrowed') return null;                       // settled under the sand: nothing moves
    return { grains: Math.round(40 + body * 14), perSecond: 0, spread: body * 0.7, speed: body * 1.1 + 1.2, up: body * 0.8 + 0.8, size: 0.04 + body * 0.025, life: 1.3 };
  }
  return { grains: 0, perSecond: 55, spread: body * 0.55, speed: body * 0.5 + 0.5, up: body * 0.35 + 0.35, size: 0.03 + body * 0.02, life: 0.9 };
}

/**
 * Sand kicked up by a body working its way into the seabed, and thrown clear again when it comes
 * back out. Coarser and heavier than the silt cloud the simulation already leaves behind: silt is
 * the haze that hangs there and hides the animal, this is the grains — they fly, lose their speed
 * to the water within a few tenths of a second, and fall back to the floor.
 *
 * Presentation only, and per-grain coloured, because the sand is the biome's: a burrow in the
 * shelf mosaic and one in the black basin must not shower the same beige. The colour is taken at
 * the moment a grain is emitted rather than held as a uniform, so two animals digging in two
 * biomes in one frame each throw their own floor.
 */
export class Sand {
  readonly points: THREE.Points;
  private pos: Float32Array; private vel: Float32Array; private life: Float32Array; private size: Float32Array;
  private col: Float32Array; private span: Float32Array;
  private geo: THREE.BufferGeometry; private cursor = 0;
  constructor(private max = 700) {
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.size = new Float32Array(max); this.span = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSpan', new THREE.BufferAttribute(this.span, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      // Normal blending, not additive: a grain of sand is an opaque speck that hides the water
      // behind it, where a bubble is a highlight. Additive sand reads as sparks. No fog chunk —
      // the shower only ever draws within `SAND_RANGE`, which is well inside it.
      transparent: true, depthWrite: false,
      vertexShader: `attribute float aLife;attribute float aSize;attribute float aSpan;attribute vec3 aColor;varying float vA;varying vec3 vC;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*360./max(1.,-mv.z),0.,14.)*step(0.001,aLife);vC=aColor;vA=clamp(aLife/max(0.001,aSpan),0.,1.);}`,
      fragmentShader: `varying float vA;varying vec3 vC;void main(){float r=length(gl_PointCoord-.5)*2.;float d=smoothstep(1.,.25,r);gl_FragColor=vec4(vC,d*vA*.85);}`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false; this.points.name = 'sand';
  }
  /**
   * `n` grains around `p`, thrown outward at `speed` with `up` of lift on top of it. `spread` is
   * the ball they start in — a body length or so, so the shower surrounds the animal rather than
   * coming out of a point.
   */
  emit(p: { x: number; y: number; z: number }, color: { r: number; g: number; b: number }, n: number, spread: number, speed: number, up: number, size = 0.07, life = 1.1) {
    for (let i = 0; i < n; i++) {
      const k = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * spread;
      this.pos[k * 3] = p.x + Math.cos(a) * rr; this.pos[k * 3 + 1] = p.y + (Math.random() - 0.3) * spread * 0.5; this.pos[k * 3 + 2] = p.z + Math.sin(a) * rr;
      const out = speed * (0.4 + Math.random() * 0.8);
      this.vel[k * 3] = Math.cos(a) * out; this.vel[k * 3 + 1] = up * (0.3 + Math.random()); this.vel[k * 3 + 2] = Math.sin(a) * out;
      // A grain's shade wanders either side of the floor's, so a shower is grains and not a decal.
      const t = 0.8 + Math.random() * 0.4;
      this.col[k * 3] = Math.min(1, color.r * t); this.col[k * 3 + 1] = Math.min(1, color.g * t); this.col[k * 3 + 2] = Math.min(1, color.b * t);
      const l = life * (0.6 + Math.random() * 0.7);
      this.life[k] = l; this.span[k] = l; this.size[k] = size * (0.5 + Math.random());
    }
  }
  update(dt: number) {
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      // Water takes the throw out of a grain quickly, and then it falls at its own slow rate.
      const drag = Math.exp(-3.4 * dt);
      this.vel[k * 3] *= drag; this.vel[k * 3 + 2] *= drag;
      this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * drag - 1.6 * dt;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSpan as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
  dispose() { this.geo.dispose(); (this.points.material as THREE.Material).dispose(); }
}
