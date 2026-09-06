import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRng, TAU } from '../shared/math';
import { FLORA_PHYS } from '../sim/flora';
import { LIGHT_WINDOW_Y, sampleCurrent, sampleHeight, SURFACE_Y, WORLD_RADIUS, type Flora, type WorldData } from '../sim/world';

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
  /** Applies the magnification tier for one viewport and returns the fog density it chose. */
  setViewLength(L: number, camX?: number, camZ?: number): number;
  update(time: number, dt: number, focus: THREE.Vector3): void;
  dispose(): void;
  sun: THREE.DirectionalLight;
}

type SeaKind = 'sediment' | 'rock' | 'sponge' | 'algae';

export function createSea(scene: THREE.Scene, world: WorldData, quality: Quality): SeaEnvironment {
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

  const sedimentMat = seaMaterial('#a3a682', 'sediment');
  const rockMat = seaMaterial('#75837a', 'rock');
  const spongeMat = seaMaterial('#c9a468', 'sponge', false, true);
  const spongeMat2 = seaMaterial('#b8a97c', 'sponge', false, true);
  const algaeMat = seaMaterial('#7a6040', 'algae', true, true);
  const tuftMat = seaMaterial('#5d7a43', 'algae', true, true);
  // Micro-tufts share the tuft look but are static scatter with no sim state.
  const microMat = seaMaterial('#5d7a43', 'algae', true);

  // Terrain
  const size = WORLD_RADIUS * 2 + 40;
  const segs = high ? 220 : 130;
  const terrainGeo = G(new THREE.PlaneGeometry(size, size, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i++) tp.setY(i, sampleHeight(tp.getX(i), tp.getZ(i)));
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, sedimentMat);
  terrain.name = 'seabed'; terrain.receiveShadow = true;
  group.add(terrain);

  // Instanced scenery is bucketed into cells so each bucket has a real bounding sphere and can be
  // frustum-culled per viewport. One giant InstancedMesh can never be culled: it is always "on screen".
  const CELL = 64;
  /** Every chunk carries the range past which it is not worth drawing, and the magnification it stops mattering at. */
  const chunks: { mesh: THREE.InstancedMesh; cx: number; cz: number; range: number; maxLength: number }[] = [];
  const chunked = <T extends { pos: { x: number; y: number; z: number } }>(
    name: string, geo: THREE.BufferGeometry, mat: THREE.Material, items: T[],
    place: (item: T, d: THREE.Object3D) => void,
    opts: { castShadow?: boolean; color?: (item: T) => THREE.Color; range?: number; maxLength?: number; bend?: (item: T, attr: THREE.InstancedBufferAttribute, index: number) => void } = {},
  ) => {
    const cells = new Map<number, T[]>();
    for (const it of items) {
      const k = (Math.floor(it.pos.x / CELL) + 64) * 256 + (Math.floor(it.pos.z / CELL) + 64);
      let arr = cells.get(k); if (!arr) cells.set(k, (arr = []));
      arr.push(it);
    }
    const meshes: THREE.InstancedMesh[] = [];
    for (const [key, arr] of cells) {
      // Per-instance attributes live on the geometry, so a bendable chunk needs its own copy.
      let cg = geo, bendAttr: THREE.InstancedBufferAttribute | undefined;
      if (opts.bend) {
        cg = G(geo.clone());
        bendAttr = new THREE.InstancedBufferAttribute(new Float32Array(arr.length * 2), 2);
        bendAttr.setUsage(THREE.DynamicDrawUsage);
        cg.setAttribute('aBend', bendAttr);
      }
      const im = new THREE.InstancedMesh(cg, mat, arr.length);
      im.name = name; im.castShadow = !!opts.castShadow && high; im.receiveShadow = true;
      arr.forEach((it, i) => {
        place(it, dummy); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        if (opts.color) im.setColorAt(i, opts.color(it));
        if (bendAttr) opts.bend!(it, bendAttr, i);
      });
      im.computeBoundingSphere();
      group.add(im); meshes.push(im);
      chunks.push({
        mesh: im, cx: (Math.floor(key / 256) - 64) * CELL + CELL / 2, cz: ((key % 256) - 64) * CELL + CELL / 2,
        range: opts.range ?? 1e6, maxLength: opts.maxLength ?? Infinity,
      });
    }
    return meshes;
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
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  chunked('boulders', rockGeo(high ? 2 : 1), rockMat, world.boulders,
    (b, d) => { d.position.set(b.pos.x, b.pos.y, b.pos.z); d.rotation.set(0, b.rot, 0); d.scale.set(b.sx, b.sy, b.sz); },
    { castShadow: true, range: 240, color: (b) => color.setHSL(0.1 + rng() * 0.05, 0.1 + rng() * 0.1, b.shade * 0.55) });

  // Rock fragments scattered
  const fragItems: { pos: { x: number; y: number; z: number }; s: number; a: number }[] = [];
  for (let i = 0; i < (high ? 1400 : 500); i++) {
    const a = rng() * TAU, d = Math.sqrt(rng()) * (WORLD_RADIUS - 8);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    fragItems.push({ pos: { x, y: sampleHeight(x, z) + 0.02, z }, s: 0.05 + rng() * 0.22, a });
  }
  chunked('frags', rockGeo(1), rockMat, fragItems,
    (f, d) => { d.position.set(f.pos.x, f.pos.y, f.pos.z); d.rotation.set(0, f.a, 0); d.scale.set(f.s * 1.5, f.s * 0.35, f.s); },
    { range: 45, maxLength: 4.5, color: () => color.setHSL(0.1, 0.12, 0.42 + rng() * 0.2) });

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

  const floraSlots = new Map<Flora, { attr: THREE.InstancedBufferAttribute; i: number }>();
  const floraSets: Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material; items: typeof world.flora }> = {
    vauxia: { geo: vauxiaGeo, mat: spongeMat, items: [] }, sac: { geo: sacGeo, mat: spongeMat, items: [] },
    choia: { geo: choiaGeo, mat: spongeMat2, items: [] }, thalli: { geo: thalliGeo, mat: algaeMat, items: [] }, tuft: { geo: tuftGeo, mat: tuftMat, items: [] },
  };
  for (const f of world.flora) floraSets[f.kind].items.push(f);
  for (const [kind, set] of Object.entries(floraSets)) {
    if (!set.items.length) continue;
    // Sponges do not cast shadows: the sun is high and diffuse down here, and shadow-casting flora
    // was by far the most expensive thing in the frame (it is re-rendered for every viewport).
    const range = kind === 'tuft' ? 58 : kind === 'choia' ? 88 : kind === 'sac' ? 100 : 125;
    chunked(`flora-${kind}`, set.geo, set.mat, set.items,
      (f, d) => { d.position.set(f.pos.x, f.pos.y, f.pos.z); d.rotation.set(0, f.rot, 0); d.scale.set(f.scale, f.sy, f.scale); },
      { range, maxLength: kind === 'tuft' ? 7 : Infinity, color: (f) => color.setHSL(0.095 + rng() * 0.05, 0.14 + rng() * 0.12, f.shade * 0.72),
        bend: (f, attr, i) => floraSlots.set(f, { attr, i }) });
  }
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
  const bentSlots = new Set<Flora>();

  // Water surface / light window
  const surfaceMat = M(new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    uniforms: { uSeaTime: seaTime },
    vertexShader: `uniform float uSeaTime;varying vec3 vP;void main(){vec3 p=position;p.z+=sin(p.x*.3+uSeaTime*.63)*.18+sin(p.y*.39-uSeaTime*.47)*.12+sin((p.x+p.y)*.17+uSeaTime*.32)*.2;vP=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`,
    fragmentShader: `uniform float uSeaTime;varying vec3 vP;${SEA_GLSL}
    void main(){vec3 V=normalize(cameraPosition-vP);vec2 q=vP.xz;vec3 N=normalize(vec3(cos(q.x*.3+uSeaTime*.63)*.11+cos((q.x+q.y)*.17+uSeaTime*.32)*.035,-1.,cos(q.y*.39-uSeaTime*.47)*.1));
    float facing=max(.0,dot(N,V));float fresnel=pow(1.-facing,3.);float window=smoothstep(.55,.84,facing);float glow=pow(max(0.,dot(-V,normalize(vec3(-.32,1.,.16)))),40.);float ripple=ec(q*.28,uSeaTime)*.18+ef(q*.55+uSeaTime*.018)*.09;
    vec3 c=mix(vec3(.08,.32,.36),vec3(.42,.78,.76),window);c+=vec3(.7,.75,.5)*glow+c*ripple;c=mix(c,vec3(.08,.3,.33),fresnel*.6);gl_FragColor=vec4(c,.96);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  }));
  const surface = new THREE.Mesh(G(new THREE.PlaneGeometry(size + 100, size + 100, high ? 120 : 60, high ? 120 : 60)), surfaceMat);
  surface.rotation.x = -Math.PI / 2; surface.position.y = SURFACE_Y; surface.renderOrder = 1; surface.name = 'surface';
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

  // Plankton blooms: glowing point clouds in the light window
  const bloomPts: number[] = [];
  for (const b of world.blooms) for (let i = 0; i < (high ? 220 : 90); i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * b.radius; bloomPts.push(b.pos.x + Math.cos(a) * r, b.pos.y + (rng() - 0.5) * b.radius * 0.5, b.pos.z + Math.sin(a) * r); }
  const bloomGeo = G(new THREE.BufferGeometry());
  bloomGeo.setAttribute('position', new THREE.Float32BufferAttribute(bloomPts, 3));
  const blooms = new THREE.Points(bloomGeo, M(new THREE.PointsMaterial({ color: '#bdf7c8', size: 0.14, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true })));
  blooms.name = 'plankton'; group.add(blooms);

  // Micro layer: fine filament "grass" that only matters when you are small.
  const microCount = high ? 9000 : 3500;
  const microGeo = G(new THREE.ConeGeometry(0.012, 0.22, 3, 1, true));
  microGeo.translate(0, 0.11, 0);
  const microItems: { pos: { x: number; y: number; z: number }; s: number; a: number; rx: number; rz: number; sy: number }[] = [];
  for (let i = 0; i < microCount; i++) {
    // cluster around flora so the nursery floor reads as undergrowth
    const anchor = world.flora[Math.floor(rng() * world.flora.length)];
    const a = rng() * TAU, d = Math.sqrt(rng()) * 2.4;
    const x = anchor.pos.x + Math.cos(a) * d, z = anchor.pos.z + Math.sin(a) * d;
    const s = 0.6 + rng() * 1.4;
    microItems.push({ pos: { x, y: sampleHeight(x, z) - 0.02, z }, s, a, rx: (rng() - 0.5) * 0.5, rz: (rng() - 0.5) * 0.5, sy: s * (0.8 + rng() * 0.8) });
  }
  chunked('micro-tufts', microGeo, microMat, microItems,
    (m, d) => { d.position.set(m.pos.x, m.pos.y, m.pos.z); d.rotation.set(m.rx, m.a, m.rz); d.scale.set(m.s, m.sy, m.s); },
    { range: 32, maxLength: 2.2, color: () => color.setHSL(0.22 + rng() * 0.08, 0.3, 0.3 + rng() * 0.2) });

  const baseFog = high ? 0.0105 : 0.0125;
  const cur = { x: 0, y: 0, z: 0 };
  const shaftDummy = new THREE.Object3D();
  let disposed = false;
  let pOrigin = new THREE.Vector3();

  return {
    group, sun,
    /**
     * Per-viewport magnification: small creatures live in a denser, closer world with fine detail;
     * big ones see far. Returns the fog density so the camera's far plane can be pulled in to match,
     * which is what actually lets distant scenery chunks be frustum-culled instead of drawn into fog.
     */
    setViewLength(L: number, camX = 0, camZ = 0) {
      const fog = scene.fog as THREE.FogExp2;
      fog.density = baseFog * THREE.MathUtils.clamp(2.2 / (L + 1.5), 0.62, 1.15);
      // Distance-cull scenery chunks: small detail is a few pixels and heavily fogged long before
      // the far plane, so drawing it is pure cost. Bigger creatures see proportionally further.
      const reach = THREE.MathUtils.clamp(0.75 + L * 0.14, 0.85, 1.9);
      for (const c of chunks) {
        const d = Math.hypot(camX - c.cx, camZ - c.cz) - CELL * 0.75;
        c.mesh.visible = L < c.maxLength && d < c.range * reach;
      }
      (particles.material as THREE.ShaderMaterial).opacity = 1;
      particles.scale.setScalar(THREE.MathUtils.clamp(L * 0.6, 0.6, 3));
      return fog.density;
    },
    update(time, dt, focus) {
      if (disposed) return;
      seaTime.value = time;
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
      (blooms.material as THREE.PointsMaterial).opacity = 0.65 + 0.25 * Math.sin(time * 1.3);
    },
    dispose() {
      if (disposed) return; disposed = true;
      group.removeFromParent();
      group.traverse((o) => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      sun.shadow.map?.dispose();
    },
  };
}

export { LIGHT_WINDOW_Y };
