import { ACTIVE_ERA } from '../content';
import { FLORA_BASE, SAND_COLORS, floraTint, rockTint } from '../shared/environment-colors';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, makeRng, TAU } from '../shared/math';
import { loadPropGeometry, type PropId } from './props';
import { FLORA_PHYS } from '../sim/flora';
import { BIOMES, biomeAt, biomeWeights, CHUNK, chunkCoord, chunkKey, chunkSeed, generateChunk, LIGHT_WINDOW_Y, sampleCurrent, sampleHeight, shoreDistance, SURFACE_Y, type Biome, type BiomeWeights, type Chunk, type Flora, type WorldData } from '../sim/world';

export type Quality = 'high' | 'low';

export const SEA_GLSL = /* glsl */`
float eh(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float en(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(eh(i),eh(i+vec2(1,0)),f.x),mix(eh(i+vec2(0,1)),eh(i+vec2(1,1)),f.x),f.y); }
float ef(vec2 p) { return en(p)*.55+en(p*2.03)*.27+en(p*4.1)*.13+en(p*8.3)*.05; }
float ec(vec2 p,float t) {
  p+=vec2(sin(p.y*.7+t*.42),cos(p.x*.63-t*.31))*.4;
  float a=sin(p.x*2.8+p.y*.3+t*.7)+sin(p.y*2.9-p.x*.4-t*.57);
  float b=sin(p.x*2.05-p.y*1.3-t*.33)+sin(p.y*2.2+p.x*.7+t*.43);
  return pow(max(0.,1.-abs(a)*.75),10.)*.6+pow(max(0.,1.-abs(b)*.8),13.)*.4;
}`;

export interface SeaEnvironment {
  group: THREE.Group;
  /** Applies the magnification tier and the local biome's atmosphere for one viewport and returns the fog density it chose. */
  setViewLength(L: number, camX?: number, camZ?: number): number;
  /** `cams` are every viewport's camera positions: scenery streams in around all of them. */
  update(time: number, dt: number, focus: THREE.Vector3, cams?: readonly THREE.Vector3[]): void;
  dispose(): void;
  sun: THREE.DirectionalLight;
  /** Build the coarse tiles around a point up front, so a new view is never a hole. */
  prime(x: number, z: number, radius?: number): void;
  /** Streaming counters for the profiler. */
  stats(): { chunks: number; far: number; pending: number };
}

/** Coarse terrain and big rocks are drawn out to here around every camera (the fog limit is 300). */
const FAR_RADIUS = 340;

/**
 * Atmosphere per biome: fog colour, fog density multiplier, sky and sun intensity. Blended by the
 * biome weights under the camera so travelling between biomes is a slow morph, never a cut.
 */
const ATMOS = ACTIVE_ERA.environment.atmosphere;

type SeaKind = 'sediment' | 'rock' | 'sponge' | 'algae';

export function createSea(scene: THREE.Scene, world: WorldData, quality: Quality): SeaEnvironment {
  let disposed = false;
  const high = quality === 'high';
  const rng = makeRng(world.seed + 7);
  const group = new THREE.Group();
  group.name = 'sea';
  scene.add(group);
  const seaTime = { value: 0 };
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const G = <T extends THREE.BufferGeometry>(g: T) => (geometries.add(g), g);
  const M = <T extends THREE.Material>(m: T) => (materials.add(m), m);

  // Atmosphere: brighter, warmer turquoise than the old build. Energetic, still deep.
  const bg = new THREE.Color('#0d5563');
  scene.fog = new THREE.FogExp2(bg.getHex(), high ? 0.0105 : 0.0125);
  scene.background = bg;

  group.add(new THREE.HemisphereLight('#bff2ee', '#243f3b', 1.7));
  const sun = new THREE.DirectionalLight('#ffe9c4', 3.0);
  sun.position.set(-40, 70, 20);
  sun.castShadow = high;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 5, far: 140 });
  sun.shadow.bias = -4e-4; sun.shadow.normalBias = 0.04;
  group.add(sun, sun.target);
  const fill = new THREE.PointLight('#4fc6d2', 1.2, 120, 1.2);
  fill.position.set(20, 8, -18);
  group.add(fill);

  function seaMaterial(color: string, kind: SeaKind, sway = false, bend = false) {
    const m = M(new THREE.MeshStandardMaterial({ color, roughness: kind === 'algae' ? 0.66 : 0.92, metalness: 0 }));
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSeaTime = seaTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uSeaTime;\nvarying vec3 vSeaWorld;${bend ? '\nattribute vec2 aBend;' : ''}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${bend ? `// Sim-driven lean: aBend is the top displacement in local units, pre-divided by height^1.3.
        float bendF = pow(max(position.y, 0.), 1.3);
        vec2 bendD = aBend * bendF;
        transformed.xz += bendD;
        transformed.y -= dot(bendD, bendD) * .5 / max(position.y, .15);` : ''}
        ${sway ? `vec3 origin = vec3(0.);
        #ifdef USE_INSTANCING
        origin = instanceMatrix[3].xyz;
        #endif
        float currentX = .13+.16*sin(origin.z*.11+uSeaTime*.085)+.08*cos(origin.y*.3);
        float currentZ = .1+.2*cos(origin.x*.13-uSeaTime*.07);
        float heightFactor=pow(max(position.y,0.),1.3);
        transformed.x += heightFactor*(currentX*.25+.02*sin(uSeaTime*1.1+origin.z*.11+position.y*2.));
        transformed.z += heightFactor*currentZ*.22;` : ''}`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 seaP = vec4(transformed,1.);
        #ifdef USE_INSTANCING
        seaP = instanceMatrix * seaP;
        #endif
        vSeaWorld = (modelMatrix * seaP).xyz;`);
      const detail = kind === 'sediment' ? `
        float grain=ef(vSeaWorld.xz*11.);
        float ripple=sin(vSeaWorld.z*9.+sin(vSeaWorld.x*.8)*2.+en(vSeaWorld.xz*.8)*2.);
        float microbialPatch=smoothstep(.46,.72,ef(vSeaWorld.xz*.05+9.));
        float deep=smoothstep(2.,-6.,vSeaWorld.y);
        diffuseColor.rgb*=.78+grain*.4+ripple*.05;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.55,.78,.46),microbialPatch*.8);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.55,.62,.7),deep*.6);`
        : kind === 'rock' ? `float layer=sin(vSeaWorld.y*23.+en(vSeaWorld.xz*1.3)*2.);diffuseColor.rgb*=.72+ef(vSeaWorld.xz*3.+vSeaWorld.yy)*.45+layer*.06;`
        : kind === 'sponge' ? `float pores=smoothstep(.64,.78,en(vSeaWorld.xy*43.)*en(vSeaWorld.zy*31.)+en(vSeaWorld.xz*49.)*.35);diffuseColor.rgb*=.92+ef(vSeaWorld.xz*12.+vSeaWorld.yy*4.)*.22-pores*.45;`
        : `diffuseColor.rgb*=.83+ef(vSeaWorld.xz*13.+vSeaWorld.yy*7.)*.3;`;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uSeaTime;\nvarying vec3 vSeaWorld;\n` + SEA_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>\n` + detail)
        .replace('#include <opaque_fragment>', `
        float caustic=ec(vSeaWorld.xz*.55,uSeaTime);
        outgoingLight += diffuseColor.rgb*vec3(.34,.5,.42)*caustic*exp(-max(0.,${SURFACE_Y.toFixed(1)}-vSeaWorld.y)*.03);
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => `cambrian-sea-${kind}-${sway}-${bend}`;
    return m;
  }

  const sedimentMat = seaMaterial('#ffffff', 'sediment');
  sedimentMat.vertexColors = true;                       // biome tint is painted per vertex on each tile
  const rockMat = seaMaterial('#75837a', 'rock');
  const spongeMat = seaMaterial('#c9a468', 'sponge', false, true);
  const spongeMat2 = seaMaterial('#b8a97c', 'sponge', false, true);
  const algaeMat = seaMaterial('#7a6040', 'algae', true, true);
  const tuftMat = seaMaterial('#5d7a43', 'algae', true, true);
  // Micro-tufts share the tuft look but are static scatter with no sim state.
  const microMat = seaMaterial('#5d7a43', 'algae', true);

  // Devonian stand-in materials, coloured from the era's flora table (the Cambrian ones above are its literal colours).
  const fb = (kind: string, fallback: string) => FLORA_BASE[kind] ?? fallback;
  const crinoidMat = seaMaterial(fb('crinoid', '#8c9078'), 'algae', true, true);
  const reedMat = seaMaterial(fb('reed', '#5e8a40'), 'algae', true, true);
  const fanMat = seaMaterial(fb('bryozoan', '#d4cdb6'), 'sponge', true, true); fanMat.side = THREE.DoubleSide;
  const coralMat = seaMaterial(fb('rugose', '#9c5c3b'), 'sponge', false, true);
  const plateMat = seaMaterial(fb('tabulate', '#7d8f7c'), 'rock');
  const moundMat = seaMaterial(fb('stromatoporoid', '#cbb994'), 'rock');
  const logMat = seaMaterial(fb('log', '#6a4a2e'), 'rock');

  const propMat = (kind: SeaKind, sway = false, bend = false) => {
    const m = seaMaterial('#ffffff', kind, sway, bend); m.vertexColors = true; return m;
  };
  const propMaterials: Record<PropId, THREE.Material> = {
    'cushion-sponge': propMat('sponge', false, true), 'lettuce-tuft': propMat('algae', true, true),
    'spine-sponge': propMat('sponge', false, true), 'glass-fan': propMat('sponge', true, true),
    'blade-spire': propMat('rock'), 'talus-shard': propMat('rock'), 'pebble-cluster': propMat('rock'),
  };
  (propMaterials['lettuce-tuft'] as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  // One load per prop per sea, shared by all streamed cells. Failed loads retain their fallback.
  const propLoads = new Map<PropId, Promise<THREE.BufferGeometry | undefined>>();
  function useProp(id: PropId, mesh: THREE.InstancedMesh, view: ChunkView) {
    let pending = propLoads.get(id);
    if (!pending) {
      pending = loadPropGeometry(id).then(g => { if (disposed) { g.dispose(); return; } return G(g); })
        .catch(e => { console.warn(`Keeping scenery fallback for ${id}`, e); return undefined; });
      propLoads.set(id, pending);
    }
    void pending.then(geo => {
      if (!geo || disposed || views.get(view.key) !== view) return;
      const bend = mesh.geometry.getAttribute('aBend');
      const next = bend ? geo.clone() : geo;
      if (bend) { next.setAttribute('aBend', bend); view.own.push(next); }
      mesh.geometry = next; mesh.material = propMaterials[id]; mesh.computeBoundingSphere();
    });
  }

  /**
   * Scenery is built per 64-unit chunk, mirroring the simulation's streaming: a full view (terrain
   * tile, rocks, every plant, undergrowth) for the chunks the sim has loaded, and a far view
   * (coarse tile, big rocks) for the ring out to the fog limit. Each instanced mesh has a real
   * bounding sphere, so it is frustum-culled per viewport; each carries the range past which it is
   * not worth drawing and the magnification it stops mattering at.
   */
  interface CulledMesh { mesh: THREE.Object3D; range: number; maxLength: number; }
  interface ChunkView { key: number; x: number; z: number; detail: 'full' | 'far'; meshes: CulledMesh[]; own: THREE.BufferGeometry[]; flora: Flora[]; }
  const views = new Map<number, ChunkView>();
  const pending: { cx: number; cz: number; d: number; detail: 'full' | 'far' }[] = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const instanced = <T extends { pos: { x: number; y: number; z: number } }>(
    view: ChunkView, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, arr: T[],
    place: (item: T, d: THREE.Object3D) => void,
    opts: { prop?: PropId; include?: (item: T) => boolean; castShadow?: boolean; color?: (item: T) => THREE.Color; range?: number; maxLength?: number; bend?: (item: T, attr: THREE.InstancedBufferAttribute, index: number) => void } = {},
  ) => {
    const count = opts.include ? arr.filter(opts.include).length : arr.length;
    // Consume the original tint RNG even for replaced objects, preserving the reef's detail.
    if (!count) { if (opts.color) arr.forEach(opts.color); return; }
    // Per-instance attributes live on the geometry, so a bendable chunk needs its own copy.
    let cg = geo, bendAttr: THREE.InstancedBufferAttribute | undefined;
    if (opts.bend) {
      cg = geo.clone(); view.own.push(cg);
      bendAttr = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
      bendAttr.setUsage(THREE.DynamicDrawUsage);
      cg.setAttribute('aBend', bendAttr);
    }
    const im = new THREE.InstancedMesh(cg, mat, count);
    im.name = name; im.castShadow = !!opts.castShadow && high; im.receiveShadow = true;
    let instance = 0;
    arr.forEach(it => {
      const tint = opts.color?.(it);
      if (opts.include && !opts.include(it)) return;
      const i = instance++;
      place(it, dummy); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      if (tint) im.setColorAt(i, tint);
      if (bendAttr) opts.bend!(it, bendAttr, i);
    });
    im.computeBoundingSphere();
    group.add(im);
    view.meshes.push({ mesh: im, range: opts.range ?? 1e6, maxLength: opts.maxLength ?? Infinity });
    if (opts.prop) useProp(opts.prop, im, view);
  };

  /**
   * One seabed tile. Heights come straight from the sim's field; normals from a one-vertex apron
   * so tile edges shade seamlessly; the vertex colour is the blended biome tint, with pale sand
   * where the beach climbs out of the water.
   */
  const tileW: BiomeWeights = { shallows: 0, nursery: 0, shelf: 0, forest: 0, boulders: 0, flats: 0, channel: 0, escarpment: 0, basin: 0 };
  const sandColors = Object.fromEntries(BIOMES.map((b) => [b, new THREE.Color(SAND_COLORS[b])])) as Record<Biome, THREE.Color>;
  const beach = new THREE.Color('#d9cfa4');
  const terrainTile = (view: ChunkView, segs: number) => {
    const x0 = view.x - CHUNK / 2, z0 = view.z - CHUNK / 2, step = CHUNK / segs;
    const n = segs + 1, ap = n + 2;
    const hs = new Float32Array(ap * ap);
    for (let j = 0; j < ap; j++) for (let i = 0; i < ap; i++) hs[j * ap + i] = sampleHeight(x0 + (i - 1) * step, z0 + (j - 1) * step);
    const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
    const idx: number[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = j * n + i, h = (j + 1) * ap + (i + 1);
      const x = x0 + i * step, z = z0 + j * step;
      pos[v * 3] = x; pos[v * 3 + 1] = hs[h]; pos[v * 3 + 2] = z;
      const dx = (hs[h + 1] - hs[h - 1]) / (2 * step), dz = (hs[h + ap] - hs[h - ap]) / (2 * step);
      const l = Math.hypot(dx, 1, dz);
      nor[v * 3] = -dx / l; nor[v * 3 + 1] = 1 / l; nor[v * 3 + 2] = -dz / l;
      uv[v * 2] = i / segs; uv[v * 2 + 1] = j / segs;
      biomeWeights(x, z, tileW);
      color.setRGB(0, 0, 0);
      for (const b of BIOMES) { const w = tileW[b]; if (w > 0.001) { const c = sandColors[b]; color.r += c.r * w; color.g += c.g * w; color.b += c.b * w; } }
      color.lerp(beach, 1 - THREE.MathUtils.smoothstep(shoreDistance(x, z), 8, 40));
      col[v * 3] = color.r; col[v * 3 + 1] = color.g; col[v * 3 + 2] = color.b;
      if (i < segs && j < segs) idx.push(v, v + n, v + 1, v + 1, v + n, v + n + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    view.own.push(g);
    const m = new THREE.Mesh(g, sedimentMat);
    m.name = 'seabed'; m.receiveShadow = true;
    group.add(m);
    view.meshes.push({ mesh: m, range: 1e6, maxLength: Infinity });
  };

  // Boulders
  const rockGeo = (detail: number) => {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 0.96 + 0.05 * Math.sin(x * 3.5 + z * 2.1) * Math.cos(y * 3.8 - x) + 0.02 * Math.sin(z * 6.3 + y * 4.1) * Math.cos(x * 5.7);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    return G(g);
  };
  const boulderGeo = rockGeo(high ? 2 : 1), fragGeo = rockGeo(1);

  // Flora geometries (same reconstructions as the old build)
  const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number, taper = 0.8) => {
    const g = new THREE.CylinderGeometry(r * taper, r, a.distanceTo(b), 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  };
  const merged = (parts: THREE.BufferGeometry[]) => { const m = mergeGeometries(parts, false)!; parts.forEach((p) => p.dispose()); return G(m); };
  const vauxiaParts: THREE.BufferGeometry[] = [];
  const branch = (o: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const end = o.clone().addScaledVector(dir, len);
    vauxiaParts.push(tube(o, end, r));
    if (depth > 0) for (const s of [-1, 1]) branch(end, dir.clone().add(new THREE.Vector3(s * 0.48, 0.1, (rng() - 0.5) * 0.4)).normalize(), len * 0.72, r * 0.67, depth - 1);
    else { const t = new THREE.TorusGeometry(r * 0.77, r * 0.16, 3, 5); t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)); t.translate(end.x, end.y, end.z); vauxiaParts.push(t); }
  };
  branch(new THREE.Vector3(), new THREE.Vector3(0.04, 1, 0).normalize(), 0.7, 0.115, high ? 3 : 2);
  const vauxiaGeo = merged(vauxiaParts);
  const sacGeo = G(new THREE.LatheGeometry([[0.08, 0], [0.14, 0.15], [0.26, 0.35], [0.35, 0.76], [0.32, 1.07], [0.29, 1.13], [0.245, 1.1], [0.25, 0.91], [0.19, 0.55], [0.09, 0.25]].map(([x, y]) => new THREE.Vector2(x, y)), 8));
  const choiaParts: THREE.BufferGeometry[] = [];
  { const c = new THREE.SphereGeometry(0.42, 9, 4); c.scale(1, 0.21, 1); c.translate(0, 0.11, 0); choiaParts.push(c);
    for (let i = 0; i < 16; i++) { const t = (i / 16) * TAU, n = 0.6 + rng() * 0.25; choiaParts.push(tube(new THREE.Vector3(Math.cos(t) * 0.22, 0.13, Math.sin(t) * 0.22), new THREE.Vector3(Math.cos(t) * n, 0.02, Math.sin(t) * n), 0.012, 0.15)); } }
  const choiaGeo = merged(choiaParts);
  const curveTube = (pts: number[][], r: number, seg = 5, rad = 4) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), seg, r, rad, false);
  const thalliParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * TAU, n = Math.cos(t), r = Math.sin(t);
    thalliParts.push(curveTube([[0, 0, 0], [n * 0.12, 0.35, r * 0.12], [n * 0.22, 0.8, r * 0.25], [n * 0.18, 1.35, r * 0.32]], 0.045, 6, 4));
    for (const s of [-1, 1]) {
      thalliParts.push(curveTube([[n * 0.1, 0.4, r * 0.12], [n * 0.25 + s * 0.2, 0.65, r * 0.2], [n * 0.35 + s * 0.33, 0.95, r * 0.35]], 0.032, 4, 3));
      thalliParts.push(curveTube([[n * 0.2, 0.8, r * 0.25], [n * 0.4 + s * 0.13, 1, r * 0.3], [n * 0.4 + s * 0.2, 1.28, r * 0.4]], 0.024, 3, 3));
    }
  }
  const thalliGeo = merged(thalliParts);
  const tuftParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < (high ? 9 : 6); i++) { const a = rng() * TAU, t = 0.13 + rng() * 0.22, n = 0.2 + rng() * 0.4; tuftParts.push(curveTube([[0, 0, 0], [Math.cos(a) * t * 0.4, n * 0.4, Math.sin(a) * t * 0.4], [Math.cos(a) * t, n * 0.8, Math.sin(a) * t], [Math.cos(a + 0.2) * t * 1.2, n, Math.sin(a + 0.2) * t * 1.2]], 0.008, 4, 3)); }
  const tuftGeo = merged(tuftParts);

  // Devonian stand-ins, each sized to FLORA_PHYS (h, r) at scale 1.
  // Crinoid: curved stalk, a small cup, and a crown of arms spreading up and out.
  const crinoidParts: THREE.BufferGeometry[] = [];
  { const lean = 0.1;
    crinoidParts.push(curveTube([[0, 0, 0], [lean * 0.4, 0.6, 0.02], [lean, 1.2, -0.03], [lean * 1.3, 1.65, 0]], 0.035, 6, 5));
    const cup = new THREE.LatheGeometry([[0.03, 0], [0.09, 0.08], [0.11, 0.18], [0.08, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 6);
    cup.translate(lean * 1.3, 1.62, 0); crinoidParts.push(cup);
    const arms = high ? 10 : 8;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * TAU + rng() * 0.3, sp = 0.3 + rng() * 0.08, h = 0.5 + rng() * 0.08;
      const cx = Math.cos(a), cz = Math.sin(a);
      crinoidParts.push(curveTube([[lean * 1.3 + cx * 0.06, 1.8, cz * 0.06], [lean * 1.3 + cx * sp * 0.6, 1.8 + h * 0.6, cz * sp * 0.6], [lean * 1.3 + cx * sp, 1.8 + h * 0.85, cz * sp], [lean * 1.3 + cx * sp * 1.15, 1.75 + h, cz * sp * 1.15]], 0.018, 4, 3));
    } }
  const crinoidGeo = merged(crinoidParts);
  // Stromatoporoid: a lumpy dome with faint growth ridges.
  const stromGeo = G(new THREE.SphereGeometry(0.65, 12, 6, 0, TAU, 0, Math.PI / 2));
  { const p = stromGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.06 * Math.sin(x * 9 + z * 7) * Math.cos(y * 11) + 0.03 * Math.sin(y * 21);
      p.setXYZ(i, x * k, y * k * (0.7 / 0.65), z * k * 0.92);
    }
    stromGeo.computeVertexNormals(); }
  // Tabulate: two stacked plates on a short stem.
  const tabulateParts: THREE.BufferGeometry[] = [];
  { const stem = new THREE.CylinderGeometry(0.16, 0.22, 0.14, 6); stem.translate(0, 0.07, 0); tabulateParts.push(stem);
    const lower = new THREE.CylinderGeometry(0.6, 0.5, 0.08, 10); lower.translate(0, 0.16, 0); tabulateParts.push(lower);
    const upper = new THREE.CylinderGeometry(0.36, 0.28, 0.07, 8); upper.translate(0.1, 0.265, -0.06); tabulateParts.push(upper); }
  const tabulateGeo = merged(tabulateParts);
  // Rugose: a clump of horn corals, wide calice up, narrow base down, leaning apart.
  const rugoseParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rng() * 0.5, d = i === 0 ? 0 : 0.14 + rng() * 0.12, len = 0.38 + rng() * 0.17;
    const g = new THREE.CylinderGeometry(0.11 + rng() * 0.03, 0.025, len, 6);
    g.translate(0, len / 2, 0);
    g.rotateX((rng() - 0.5) * 0.5); g.rotateZ((i === 0 ? 0 : 0.35 + rng() * 0.25) * (Math.cos(a) >= 0 ? -1 : 1));
    g.translate(Math.cos(a) * d, 0, Math.sin(a) * d);
    rugoseParts.push(g);
  }
  const rugoseGeo = merged(rugoseParts);
  // Bryozoan: a flat fan in local XY: a thin sector with radial ribs and two cross arcs over it.
  const bryoParts: THREE.BufferGeometry[] = [];
  { const a0 = Math.PI * 0.32, a1 = Math.PI * 0.68;
    const sector = new THREE.CircleGeometry(0.88, 7, a0, a1 - a0); sector.translate(0, 0.05, 0); bryoParts.push(sector);
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (a1 - a0) * (i / 4), n = 0.86 + rng() * 0.06;
      bryoParts.push(curveTube([[0, 0.02, 0], [Math.cos(a) * n * 0.5, 0.05 + Math.sin(a) * n * 0.5, 0.005], [Math.cos(a) * n, 0.05 + Math.sin(a) * n, 0]], 0.012, 3, 3));
    }
    for (const r of [0.45, 0.78]) {
      const pts: number[][] = [];
      for (let i = 0; i <= 5; i++) { const a = a0 + (a1 - a0) * (i / 5); pts.push([Math.cos(a) * r, 0.05 + Math.sin(a) * r, 0.006]); }
      bryoParts.push(curveTube(pts, 0.009, 6, 3));
    } }
  const bryozoanGeo = merged(bryoParts);
  // Reed: three stems, each with a few short fronds off the upper half.
  const reedParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + rng() * 0.6, b = 0.05 + rng() * 0.05, h = 1.5 + rng() * 0.3, lx = Math.cos(a), lz = Math.sin(a);
    reedParts.push(curveTube([[lx * b, 0, lz * b], [lx * b * 2, h * 0.45, lz * b * 2], [lx * 0.14, h * 0.85, lz * 0.14], [lx * 0.2, h, lz * 0.2]], 0.02, 6, 3));
    for (let j = 0; j < (high ? 3 : 2); j++) {
      const f = 0.5 + j * 0.18, fa = a + 1.2 + j * 1.9, fl = 0.22 + rng() * 0.08;
      const x0 = lx * (b * 2 + (0.14 - b * 2) * ((f - 0.45) / 0.4)), z0 = lz * (b * 2 + (0.14 - b * 2) * ((f - 0.45) / 0.4));
      reedParts.push(curveTube([[x0, h * f, z0], [x0 + Math.cos(fa) * fl * 0.6, h * f + 0.1, z0 + Math.sin(fa) * fl * 0.6], [x0 + Math.cos(fa) * fl, h * f + 0.07, z0 + Math.sin(fa) * fl]], 0.011, 3, 3));
    }
  }
  const reedGeo = merged(reedParts);
  // Log: a trunk lying along local x with a couple of broken branch stubs.
  const logParts: THREE.BufferGeometry[] = [];
  { const trunk = new THREE.CylinderGeometry(0.2, 0.27, 2.6, 7); trunk.rotateZ(Math.PI / 2); trunk.translate(0, 0.24, 0);
    const p = trunk.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + 0.05 * Math.sin(x * 6.1 + y * 9) * Math.cos(z * 7.3); p.setXYZ(i, x, 0.24 + (y - 0.24) * k, z * k); }
    trunk.computeVertexNormals(); logParts.push(trunk);
    for (const [sx, rz, ry] of [[-0.7, 0.9, 0.3], [0.55, -1.1, -0.5]]) {
      const stub = new THREE.CylinderGeometry(0.05, 0.09, 0.42, 5); stub.translate(0, 0.2, 0); stub.rotateZ(rz); stub.rotateY(ry); stub.translate(sx, 0.3, 0); logParts.push(stub);
    } }
  const logGeo = merged(logParts);

  const cushionFallback = G(sacGeo.clone()); cushionFallback.scale(1.28, .6 / 1.13, 1.28);
  const lettuceFallback = G(tuftGeo.clone()); lettuceFallback.scale(.8, .45 / .55, .8);
  const spineFallback = G(sacGeo.clone()); spineFallback.scale(1.14, 2.6 / 1.13, 1.14);
  const glassFallback = G(thalliGeo.clone()); glassFallback.scale(2, 1, .25);
  const bladeFallback = G(new THREE.ConeGeometry(.6, 4, 5)); bladeFallback.translate(0, 2, 0);
  const talusFallback = G(new THREE.BoxGeometry(1.5, .8, .85)); talusFallback.translate(0, .4, 0);
  const pebbleFallback = G(new THREE.SphereGeometry(.3, 8, 4)); pebbleFallback.scale(1, .25, 1); pebbleFallback.translate(0, .075, 0);
  const floraProps: Partial<Record<Flora['kind'], PropId>> = { cushion: 'cushion-sponge', lettuce: 'lettuce-tuft', spine: 'spine-sponge', glass: 'glass-fan' };
  const floraSlots = new Map<Flora, { attr: THREE.InstancedBufferAttribute; i: number }>();
  const floraSets: Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material }> = {
    cushion: { geo: cushionFallback, mat: spongeMat }, lettuce: { geo: lettuceFallback, mat: tuftMat },
    spine: { geo: spineFallback, mat: spongeMat }, glass: { geo: glassFallback, mat: spongeMat },
    vauxia: { geo: vauxiaGeo, mat: spongeMat }, sac: { geo: sacGeo, mat: spongeMat },
    choia: { geo: choiaGeo, mat: spongeMat2 }, thalli: { geo: thalliGeo, mat: algaeMat }, tuft: { geo: tuftGeo, mat: tuftMat },
    crinoid: { geo: crinoidGeo, mat: crinoidMat }, stromatoporoid: { geo: stromGeo, mat: moundMat }, tabulate: { geo: tabulateGeo, mat: plateMat },
    rugose: { geo: rugoseGeo, mat: coralMat }, bryozoan: { geo: bryozoanGeo, mat: fanMat }, reed: { geo: reedGeo, mat: reedMat }, log: { geo: logGeo, mat: logMat },
  };
  const microGeo = G(new THREE.ConeGeometry(0.012, 0.22, 3, 1, true));
  microGeo.translate(0, 0.11, 0);

  /** Build the scenery for one chunk. `chunk` is the sim's for full views; far views generate their own coarse copy. */
  const buildView = (cx: number, cz: number, detail: 'full' | 'far') => {
    const key = chunkKey(cx, cz);
    const old = views.get(key); if (old) disposeView(old);
    const chunk: Chunk = detail === 'full' ? (world.chunks.get(key) ?? generateChunk(world.seed, cx, cz)) : generateChunk(world.seed, cx, cz, 'far');
    const view: ChunkView = { key, x: chunk.x, z: chunk.z, detail, meshes: [], own: [], flora: chunk.flora };
    const crng = makeRng(chunkSeed(world.seed + 7, cx, cz, 3));
    terrainTile(view, detail === 'full' ? (high ? 32 : 20) : 8);
    instanced(view, 'boulders', boulderGeo, rockMat, chunk.boulders,
      (b, d) => { d.position.set(b.pos.x, b.pos.y, b.pos.z); d.rotation.set(0, b.rot, 0); d.scale.set(b.sx, b.sy, b.sz); },
      { include: b => !b.variant, castShadow: detail === 'full', range: 400, color: (b) => color.fromArray(rockTint(b)) });
    for (const id of ['blade-spire', 'talus-shard'] as const) {
      instanced(view, id, id === 'blade-spire' ? bladeFallback : talusFallback, rockMat, chunk.boulders.filter(b => b.variant === id),
        (b, d) => { d.position.set(b.pos.x, b.pos.y, b.pos.z); d.rotation.set(0, b.rot, 0); d.scale.set(b.sx, b.sy, b.sz); },
        { prop: id, castShadow: detail === 'full', range: 400 });
    }
    if (detail === 'far') { views.set(key, view); return view; }

    // Rock fragments scattered
    const fragItems: { pos: { x: number; y: number; z: number }; s: number; a: number }[] = [];
    for (let i = 0; i < (high ? 50 : 18); i++) {
      const x = chunk.x - CHUNK / 2 + crng() * CHUNK, z = chunk.z - CHUNK / 2 + crng() * CHUNK;
      if (shoreDistance(x, z) < 6) continue;
      fragItems.push({ pos: { x, y: sampleHeight(x, z) + 0.02, z }, s: 0.05 + crng() * 0.22, a: crng() * TAU });
    }
    instanced(view, 'frags', fragGeo, rockMat, fragItems,
      (f, d) => { d.position.set(f.pos.x, f.pos.y, f.pos.z); d.rotation.set(0, f.a, 0); d.scale.set(f.s * 1.5, f.s * 0.35, f.s); },
      { include: f => !['shallows', 'nursery'].includes(biomeAt(f.pos.x, f.pos.z)), range: 45, maxLength: 4.5, color: () => color.setHSL(0.1, 0.12, 0.42 + crng() * 0.2) });

    instanced(view, 'pebble-cluster', pebbleFallback, rockMat, fragItems.filter(f => ['shallows', 'nursery'].includes(biomeAt(f.pos.x, f.pos.z))),
      (f, d) => { d.position.set(f.pos.x, f.pos.y, f.pos.z); d.rotation.set(0, f.a, 0); d.scale.setScalar(f.s * 4); },
      { prop: 'pebble-cluster', range: 45, maxLength: 4.5 });

    // Flora. Sponges do not cast shadows: the sun is high and diffuse down here, and shadow-casting
    // flora was by far the most expensive thing in the frame (it is re-rendered for every viewport).
    for (const [kind, set] of Object.entries(floraSets)) {
      const items = chunk.flora.filter((f) => f.kind === kind);
      const range = kind === 'tuft' ? 58 : kind === 'choia' ? 88 : kind === 'sac' ? 100 : kind === 'thalli' ? 100
        : kind === 'reed' ? 70 : kind === 'rugose' ? 80 : kind === 'tabulate' || kind === 'bryozoan' ? 90 : 125;
      instanced(view, `flora-${kind}`, set.geo, set.mat, items,
        (f, d) => { d.position.set(f.pos.x, f.pos.y, f.pos.z); d.rotation.set(0, f.rot, 0); d.scale.set(f.scale, f.sy, f.scale); },
        { prop: floraProps[kind as Flora['kind']], range, maxLength: kind === 'tuft' || kind === 'lettuce' ? 7 : kind === 'reed' ? 9 : Infinity, color: (f) => color.fromArray(floraTint(f)),
          bend: (f, attr, i) => floraSlots.set(f, { attr, i }) });
    }

    // Micro layer: fine filament "grass" clustered around the plants; only matters when you are small.
    if (chunk.flora.length) {
      const microCount = Math.min(high ? 700 : 260, Math.round(chunk.flora.length * (high ? 0.7 : 0.3)));
      const microItems: { pos: { x: number; y: number; z: number }; s: number; a: number; rx: number; rz: number; sy: number }[] = [];
      for (let i = 0; i < microCount; i++) {
        const anchor = chunk.flora[Math.floor(crng() * chunk.flora.length)];
        const a = crng() * TAU, d = Math.sqrt(crng()) * 2.4;
        const x = anchor.pos.x + Math.cos(a) * d, z = anchor.pos.z + Math.sin(a) * d;
        const s = 0.6 + crng() * 1.4;
        microItems.push({ pos: { x, y: sampleHeight(x, z) - 0.02, z }, s, a, rx: (crng() - 0.5) * 0.5, rz: (crng() - 0.5) * 0.5, sy: s * (0.8 + crng() * 0.8) });
      }
      instanced(view, 'micro-tufts', microGeo, microMat, microItems,
        (m, d) => { d.position.set(m.pos.x, m.pos.y, m.pos.z); d.rotation.set(m.rx, m.a, m.rz); d.scale.set(m.s, m.sy, m.s); },
        { range: 32, maxLength: 2.2, color: () => color.setHSL(0.22 + crng() * 0.08, 0.3, 0.3 + crng() * 0.2) });
    }

    // Plankton blooms: glowing point clouds in the light window
    if (chunk.blooms.length) {
      const pts: number[] = [];
      for (const b of chunk.blooms) for (let i = 0; i < (high ? 220 : 90); i++) { const a = crng() * TAU, r = Math.sqrt(crng()) * b.radius; pts.push(b.pos.x + Math.cos(a) * r, b.pos.y + (crng() - 0.5) * b.radius * 0.5, b.pos.z + Math.sin(a) * r); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); bg.computeBoundingSphere();
      view.own.push(bg);
      const pl = new THREE.Points(bg, bloomMat); pl.name = 'plankton'; group.add(pl);
      view.meshes.push({ mesh: pl, range: 200, maxLength: Infinity });
    }
    views.set(key, view);
    return view;
  };
  const disposeView = (v: ChunkView) => {
    for (const m of v.meshes) { group.remove(m.mesh); if (m.mesh instanceof THREE.InstancedMesh) m.mesh.dispose(); }
    for (const g of v.own) g.dispose();
    for (const f of v.flora) { floraSlots.delete(f); bentSlots.delete(f); }
    views.delete(v.key);
  };

  /**
   * Keep the views in step with the sim's chunks and the cameras: full views for loaded chunks,
   * far views out to the fog limit, a couple of builds per frame so streaming never hitches.
   */
  const scratchKeys = new Set<number>();
  const syncViews = (cams: readonly THREE.Vector3[]) => {
    pending.length = 0;
    scratchKeys.clear();
    for (const c of world.chunks.values()) {
      scratchKeys.add(c.key);
      const v = views.get(c.key);
      if (v?.detail === 'full') continue;
      let d = Infinity; for (const cam of cams) d = Math.min(d, Math.hypot(cam.x - c.x, cam.z - c.z));
      // A chunk with no view at all draws nothing, which is a hole in the seabed. Lay the cheap
      // coarse tile down first for cover, then upgrade it to full detail.
      if (!v) pending.push({ cx: c.cx, cz: c.cz, d, detail: 'far' });
      pending.push({ cx: c.cx, cz: c.cz, d, detail: 'full' });
    }
    const span = Math.ceil(FAR_RADIUS / CHUNK) + 1;
    for (const cam of cams) {
      const acx = chunkCoord(cam.x), acz = chunkCoord(cam.z);
      for (let cx = acx - span; cx <= acx + span; cx++) for (let cz = acz - span; cz <= acz + span; cz++) {
        const k = chunkKey(cx, cz);
        if (scratchKeys.has(k)) continue;
        const d = Math.hypot(cam.x - (cx + 0.5) * CHUNK, cam.z - (cz + 0.5) * CHUNK);
        if (d > FAR_RADIUS) continue;
        scratchKeys.add(k);
        if (!views.has(k)) pending.push({ cx, cz, d, detail: 'far' });
      }
    }
    // drop views nobody needs: full views the sim released fall back to far on the next pass
    for (const v of [...views.values()]) {
      if (!scratchKeys.has(v.key)) { disposeView(v); continue; }
      if (v.detail === 'full' && !world.chunks.has(v.key)) disposeView(v);
    }
    if (pending.length) {
      // Cover the ground before detailing it: anything with no view yet gets its cheap coarse tile
      // first, nearest to a camera first, and only then are near chunks upgraded to full detail.
      pending.sort((a, b) => {
        const ac = a.detail === 'far' && !views.has(chunkKey(a.cx, a.cz)) ? 0 : a.detail === 'full' ? 1 : 2;
        const bc = b.detail === 'far' && !views.has(chunkKey(b.cx, b.cz)) ? 0 : b.detail === 'full' ? 1 : 2;
        return ac === bc ? a.d - b.d : ac - bc;
      });
      // A time budget per frame, so a slow machine streams more slowly rather than stuttering. At
      // least one view is always built, and the budget opens up when a lot is outstanding (match
      // start, a teleport) so the ground fills in fast.
      const budget = pending.length > 60 ? 14 : pending.length > 20 ? 9 : 6;
      const t0 = performance.now();
      for (const p of pending) {
        if (p.detail === 'full' && views.get(chunkKey(p.cx, p.cz))?.detail === 'full') continue;
        buildView(p.cx, p.cz, p.detail);
        if (performance.now() - t0 > budget) break;
      }
    }
  };
  /** Write a plant's sim bend into its instance attribute, in local geometry units. */
  const writeBend = (f: Flora, slot: { attr: THREE.InstancedBufferAttribute; i: number }) => {
    // World top displacement -> undo the instance yaw, divide by the xz scale, then by h^1.3 so the
    // shader's pow(y,1.3) ramp lands exactly on it at the top of the geometry.
    const k = 1 / (Math.max(f.scale, 1e-3) * Math.pow(FLORA_PHYS[f.kind].h, 1.3));
    const c = Math.cos(f.rot), sn = Math.sin(f.rot);
    // rotation.y = rot maps local (x,z) to world (x c + z sn, -x sn + z c); this is the inverse.
    const lx = (f.bx * c - f.bz * sn) * k, lz = (f.bx * sn + f.bz * c) * k;
    const a = slot.attr.array as Float32Array;
    a[slot.i * 2] = lx; a[slot.i * 2 + 1] = lz;
    slot.attr.needsUpdate = true;
  };

  // Water surface / light window
  const surfaceMat = M(new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    uniforms: { uSeaTime: seaTime },
    // waves in world space so the plane can follow the camera without the pattern sliding
    vertexShader: `uniform float uSeaTime;varying vec3 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);w.y+=sin(w.x*.3+uSeaTime*.63)*.18+sin(w.z*.39-uSeaTime*.47)*.12+sin((w.x+w.z)*.17+uSeaTime*.32)*.2;vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uSeaTime;varying vec3 vP;${SEA_GLSL}
    void main(){vec3 V=normalize(cameraPosition-vP);vec2 q=vP.xz;vec3 N=normalize(vec3(cos(q.x*.3+uSeaTime*.63)*.11+cos((q.x+q.y)*.17+uSeaTime*.32)*.035,-1.,cos(q.y*.39-uSeaTime*.47)*.1));
    float facing=max(.0,dot(N,V));float fresnel=pow(1.-facing,3.);float window=smoothstep(.55,.84,facing);float glow=pow(max(0.,dot(-V,normalize(vec3(-.32,1.,.16)))),40.);float ripple=ec(q*.28,uSeaTime)*.18+ef(q*.55+uSeaTime*.018)*.09;
    vec3 c=mix(vec3(.08,.32,.36),vec3(.42,.78,.76),window);c+=vec3(.7,.75,.5)*glow+c*ripple;c=mix(c,vec3(.08,.3,.33),fresnel*.6);gl_FragColor=vec4(c,.96);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  }));
  const surfaceSize = FAR_RADIUS * 2 + 80;
  const surface = new THREE.Mesh(G(new THREE.PlaneGeometry(surfaceSize, surfaceSize, high ? 120 : 60, high ? 120 : 60)), surfaceMat);
  surface.rotation.x = -Math.PI / 2; surface.position.y = SURFACE_Y; surface.renderOrder = 1; surface.name = 'surface';
  surface.frustumCulled = false;
  group.add(surface);

  // Light shafts (follow the focus point)
  const shaftMat = M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uSeaTime: seaTime },
    vertexShader: `varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vWorld;uniform float uSeaTime;void main(){float edge=pow(sin(vUv.x*3.14159265),4.);float fade=sin(vUv.y*3.14159265);float alpha=edge*fade*.028*(.85+.15*sin(uSeaTime*.3+vWorld.x));gl_FragColor=vec4(.45,.8,.7,alpha);}`,
  }));
  const shaftCount = high ? 9 : 4;
  const shafts = new THREE.InstancedMesh(G(new THREE.CylinderGeometry(0.4, 3.2, SURFACE_Y + 4, 12, 1, true)), shaftMat, shaftCount);
  shafts.castShadow = false; shafts.receiveShadow = false; shafts.renderOrder = 2; shafts.frustumCulled = false;
  group.add(shafts);

  // Drifting particles around the focus
  const pCount = high ? 1600 : 600;
  const pPos = new Float32Array(pCount * 3), pSize = new Float32Array(pCount), pFade = new Float32Array(pCount);
  const pRange = 70;
  for (let i = 0; i < pCount; i++) { pPos[i * 3] = (rng() - 0.5) * pRange * 2; pPos[i * 3 + 1] = -2 + rng() * (SURFACE_Y + 1); pPos[i * 3 + 2] = (rng() - 0.5) * pRange * 2; pSize[i] = 0.025 + rng() * 0.05; pFade[i] = 0.12 + rng() * 0.26; }
  const pGeo = G(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aFade', new THREE.BufferAttribute(pFade, 1));
  const particles = new THREE.Points(pGeo, M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aSize;attribute float aFade;varying float vFade;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*420./max(1.,-mv.z),1.,5.);vFade=aFade*exp(-max(0.,-mv.z)*.03);}`,
    fragmentShader: `varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*vFade;gl_FragColor=vec4(.75,.86,.75,a);}`,
  })));
  particles.frustumCulled = false; particles.name = 'particles';
  group.add(particles);

  const bloomMat = M(new THREE.PointsMaterial({ color: '#bdf7c8', size: 0.14, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));

  const baseFog = high ? 0.0105 : 0.0125;
  const cur = { x: 0, y: 0, z: 0 };
  const shaftDummy = new THREE.Object3D();
  let pOrigin = new THREE.Vector3();
  const hemi = group.children.find((o): o is THREE.HemisphereLight => o instanceof THREE.HemisphereLight)!;
  const atmosW: BiomeWeights = { ...tileW };
  const fogColor = new THREE.Color(), tmpColor = new THREE.Color();
  const bentSlots = new Set<Flora>();
  void rng;

  return {
    group, sun,
    /**
     * Per-viewport magnification: small creatures live in a denser, closer world with fine detail;
     * big ones see far. Returns the fog density so the camera's far plane can be pulled in to match,
     * which is what actually lets distant scenery chunks be frustum-culled instead of drawn into fog.
     */
    setViewLength(L: number, camX = 0, camZ = 0) {
      const fog = scene.fog as THREE.FogExp2;
      // The biome under the camera colours the water: bright and green over the shallows, near
      // black in the basin. Weights blend, so crossing a boundary is a slow change of light.
      biomeWeights(camX, camZ, atmosW);
      fogColor.setRGB(0, 0, 0);
      let density = 0, sky = 0, sunI = 0;
      for (const b of BIOMES) {
        const w = atmosW[b]; if (w <= 0.001) continue;
        const a = ATMOS[b];
        tmpColor.set(a.fog); fogColor.r += tmpColor.r * w; fogColor.g += tmpColor.g * w; fogColor.b += tmpColor.b * w;
        density += a.density * w; sky += a.sky * w; sunI += a.sun * w;
      }
      fog.color.copy(fogColor); (scene.background as THREE.Color).copy(fogColor);
      hemi.intensity = sky; sun.intensity = sunI;
      fog.density = baseFog * density * THREE.MathUtils.clamp(2.2 / (L + 1.5), 0.62, 1.15);
      // The surface plane rides with this viewport's camera; its waves are in world space.
      surface.position.x = camX; surface.position.z = camZ;
      // Distance-cull scenery chunks: small detail is a few pixels and heavily fogged long before
      // the far plane, so drawing it is pure cost. Bigger creatures see proportionally further.
      const reach = THREE.MathUtils.clamp(0.75 + L * 0.14, 0.85, 1.9);
      for (const v of views.values()) {
        const d = Math.hypot(camX - v.x, camZ - v.z) - CHUNK * 0.75;
        for (const c of v.meshes) c.mesh.visible = L < c.maxLength && d < c.range * reach;
      }
      (particles.material as THREE.ShaderMaterial).opacity = 1;
      particles.scale.setScalar(THREE.MathUtils.clamp(L * 0.6, 0.6, 3));
      return fog.density;
    },
    update(time, dt, focus, cams = [focus]) {
      if (disposed) return;
      seaTime.value = time;
      syncViews(cams);
      // Plants the sim has disturbed lean in the shader; ones that settled get written back to rest once.
      for (const f of world.activeFlora) { const slot = floraSlots.get(f); if (slot) { writeBend(f, slot); bentSlots.add(f); } }
      for (const f of bentSlots) if (!f.active) { const slot = floraSlots.get(f); if (slot) writeBend(f, slot); bentSlots.delete(f); }
      sun.position.set(focus.x - 40, 70, focus.z + 20); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
      // shafts orbit slowly around the focus
      for (let i = 0; i < shaftCount; i++) {
        const a = (i / shaftCount) * TAU + time * 0.01;
        shaftDummy.position.set(focus.x + Math.cos(a) * (14 + i * 4), SURFACE_Y / 2 - 1, focus.z + Math.sin(a) * (14 + i * 4));
        shaftDummy.rotation.set(0.14, 0, -0.24); shaftDummy.updateMatrix(); shafts.setMatrixAt(i, shaftDummy.matrix);
      }
      shafts.instanceMatrix.needsUpdate = true;
      // particles: wrap around the focus
      const n = Math.min(dt, 0.05);
      const shift = focus.clone().sub(pOrigin);
      pOrigin.copy(focus);
      for (let i = 0; i < pCount; i++) {
        const r = i * 3;
        sampleCurrent(cur, pPos[r] + pOrigin.x, pPos[r + 1], pPos[r + 2] + pOrigin.z, time);
        pPos[r] += cur.x * n - shift.x; pPos[r + 1] += (cur.y - 0.02) * n; pPos[r + 2] += cur.z * n - shift.z;
        if (pPos[r] > pRange) pPos[r] -= pRange * 2; else if (pPos[r] < -pRange) pPos[r] += pRange * 2;
        if (pPos[r + 2] > pRange) pPos[r + 2] -= pRange * 2; else if (pPos[r + 2] < -pRange) pPos[r + 2] += pRange * 2;
        if (pPos[r + 1] < -6) pPos[r + 1] = SURFACE_Y - 0.5; else if (pPos[r + 1] > SURFACE_Y) pPos[r + 1] = -4;
      }
      particles.position.set(pOrigin.x, 0, pOrigin.z);
      (pGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      bloomMat.opacity = 0.65 + 0.25 * Math.sin(time * 1.3);
    },
    /**
     * Lay the coarse tiles down around a point before the first frame is drawn. Match start and a
     * teleport both drop the camera somewhere with no scenery built; without this the player sees
     * the seabed end in mid-water for the second or two the budgeted streaming takes to catch up.
     */
    prime(x: number, z: number, radius = FAR_RADIUS) {
      if (disposed) return;
      const span = Math.ceil(radius / CHUNK) + 1;
      const acx = chunkCoord(x), acz = chunkCoord(z);
      const want: { cx: number; cz: number; d: number }[] = [];
      for (let cx = acx - span; cx <= acx + span; cx++) for (let cz = acz - span; cz <= acz + span; cz++) {
        const d = Math.hypot(x - (cx + 0.5) * CHUNK, z - (cz + 0.5) * CHUNK);
        if (d <= radius && !views.has(chunkKey(cx, cz))) want.push({ cx, cz, d });
      }
      want.sort((a, b) => a.d - b.d);
      for (const w of want) buildView(w.cx, w.cz, 'far');
    },
    stats() { let far = 0; for (const v of views.values()) if (v.detail === 'far') far++; return { chunks: views.size - far, far, pending: pending.length }; },
    dispose() {
      if (disposed) return; disposed = true;
      group.removeFromParent();
      for (const v of [...views.values()]) disposeView(v);
      group.traverse((o) => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      sun.shadow.map?.dispose();
    },
  };
}

export { LIGHT_WINDOW_Y };
