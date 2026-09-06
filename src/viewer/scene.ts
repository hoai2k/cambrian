import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SEA_GLSL } from '../render/sea';
import { sampleCurrent, SURFACE_Y } from '../sim/world';
import { TAU } from '../shared/math';
import { creature, type CreatureId } from '../sim/creatures';

/**
 * The viewer page lives one directory below the app, so `BASE_URL` ('./' in a built bundle)
 * would resolve creature assets to /viewer/assets/. Step back up a level instead; in dev
 * BASE_URL is an absolute '/' and can be used as-is.
 */
const base = import.meta.env.BASE_URL;
export const ASSET_BASE = base.startsWith('/') ? base : '../';

/** Clips that read as a continuous state rather than a single beat. */
const LOOPING = new Set(['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', 'Moult']);
/** Buttons are grouped in this order; anything unlisted is appended alphabetically. */
const CLIP_ORDER = [
  'Idle', 'Swim', 'Crawl', 'TurnLeft', 'TurnRight', 'Dive', 'Rise',
  'Bite', 'Heavy', 'Attack', 'Grab', 'Ability',
  'Guard', 'Parry', 'Dodge', 'Hit', 'Stagger', 'Death',
  'Eat', 'Moult',
];

export const orderClips = (names: string[]) =>
  [...names].sort((a, b) => {
    const ia = CLIP_ORDER.indexOf(a), ib = CLIP_ORDER.indexOf(b);
    if (ia !== ib) return (ia < 0 ? 1e3 : ia) - (ib < 0 ? 1e3 : ib);
    return a.localeCompare(b);
  });

export interface ViewerScene {
  /** Loads a creature and returns its clip names in button order. */
  show(id: CreatureId): Promise<string[]>;
  /** Plays a clip. One-shots fade back to the resting loop unless `loop` forces a repeat. */
  play(name: string, loop: boolean): void;
  setSpeed(s: number): void;
  /** The clip currently driving the rig, so the button grid can follow auto-returns. */
  onClip(cb: (name: string) => void): void;
  resetCamera(): void;
  dispose(): void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<CreatureId, Promise<GLTF>>();

function loadCreature(id: CreatureId) {
  let p = cache.get(id);
  if (!p) {
    p = new Promise<GLTF>((res, rej) => loader.load(`${ASSET_BASE}assets/creatures/${id}.glb`, res, undefined, rej))
      .catch((e) => { cache.delete(id); throw new Error(`Could not load ${creature(id).name}: ${e?.message ?? e}`); });
    cache.set(id, p);
  }
  return p;
}

/** Creature stands here: well clear of the (absent) seabed and under the light window. */
const FOCUS = new THREE.Vector3(0, 12, 0);

export function createViewerScene(canvas: HTMLCanvasElement): ViewerScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  const bg = new THREE.Color('#0d5563');
  scene.background = bg;
  // Thinner than in-game: nothing here is meant to fade out, the fog is only for depth.
  scene.fog = new THREE.FogExp2(bg.getHex(), 0.008);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(FOCUS);
  controls.minDistance = 0.4;
  controls.maxDistance = 60;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const G = <T extends THREE.BufferGeometry>(g: T) => (geometries.add(g), g);
  const M = <T extends THREE.Material>(m: T) => (materials.add(m), m);
  const seaTime = { value: 0 };

  // ---- lighting: the same three lights the game sea uses, minus shadows (there is no floor) ----
  scene.add(new THREE.HemisphereLight('#bff2ee', '#243f3b', 1.7));
  const sun = new THREE.DirectionalLight('#ffe9c4', 3.0);
  sun.position.set(FOCUS.x - 40, 70, FOCUS.z + 20);
  sun.target.position.copy(FOCUS);
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight('#4fc6d2', 1.2, 120, 1.2);
  fill.position.set(20, 8, -18);
  scene.add(fill);

  // ---- water surface ----
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
  const surface = new THREE.Mesh(G(new THREE.PlaneGeometry(420, 420, 100, 100)), surfaceMat);
  surface.rotation.x = -Math.PI / 2; surface.position.y = SURFACE_Y; surface.renderOrder = 1;
  scene.add(surface);

  // ---- light shafts ----
  const shaftMat = M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uSeaTime: seaTime },
    vertexShader: `varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vWorld;uniform float uSeaTime;void main(){float edge=pow(sin(vUv.x*3.14159265),4.);float fade=sin(vUv.y*3.14159265);float alpha=edge*fade*.028*(.85+.15*sin(uSeaTime*.3+vWorld.x));gl_FragColor=vec4(.45,.8,.7,alpha);}`,
  }));
  const shaftCount = 9;
  const shafts = new THREE.InstancedMesh(G(new THREE.CylinderGeometry(0.4, 3.2, SURFACE_Y + 4, 12, 1, true)), shaftMat, shaftCount);
  shafts.renderOrder = 2; shafts.frustumCulled = false;
  scene.add(shafts);
  const shaftDummy = new THREE.Object3D();

  // ---- drifting marine snow ----
  const pCount = 1400, pRange = 70;
  const pPos = new Float32Array(pCount * 3), pSize = new Float32Array(pCount), pFade = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * pRange * 2;
    pPos[i * 3 + 1] = -2 + Math.random() * (SURFACE_Y + 1);
    pPos[i * 3 + 2] = (Math.random() - 0.5) * pRange * 2;
    pSize[i] = 0.025 + Math.random() * 0.05;
    pFade[i] = 0.12 + Math.random() * 0.26;
  }
  const pGeo = G(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aFade', new THREE.BufferAttribute(pFade, 1));
  const particles = new THREE.Points(pGeo, M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aSize;attribute float aFade;varying float vFade;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*420./max(1.,-mv.z),1.,5.);vFade=aFade*exp(-max(0.,-mv.z)*.03);}`,
    fragmentShader: `varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*vFade;gl_FragColor=vec4(.75,.86,.75,a);}`,
  })));
  particles.frustumCulled = false;
  scene.add(particles);
  const cur = { x: 0, y: 0, z: 0 };

  // ---- the specimen ----
  const stage = new THREE.Group();
  stage.position.copy(FOCUS);
  scene.add(stage);

  let model: THREE.Object3D | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  let actions = new Map<string, THREE.AnimationAction>();
  let current: THREE.AnimationAction | undefined;
  let currentName = '';
  let restingClip = 'Idle';
  let abilityLoops = false;
  let speed = 1;
  let frameRadius = 3;
  let token = 0;
  let clipCb: (name: string) => void = () => {};

  const setClip = (name: string) => { currentName = name; clipCb(name); };

  // Geometry and materials belong to the cached GLTF and are shared with every clone, so the
  // model is only detached here, never disposed.
  function clearModel() {
    mixer?.stopAllAction();
    if (model) stage.remove(model);
    model = undefined; mixer = undefined; current = undefined;
    actions = new Map();
  }

  function frame() {
    const d = frameRadius * 3.1;
    // Aim a little below the specimen so it sits above the animation panel rather than behind it.
    const target = FOCUS.clone().setY(FOCUS.y - frameRadius * 0.45);
    camera.position.set(FOCUS.x + d * 0.62, FOCUS.y + d * 0.38, FOCUS.z + d * 0.78);
    controls.target.copy(target);
    controls.minDistance = frameRadius * 0.4;
    controls.maxDistance = frameRadius * 18;
    controls.update();
  }

  async function show(id: CreatureId) {
    const mine = ++token;
    const gltf = await loadCreature(id);
    if (mine !== token) return orderClips(gltf.animations.map((c) => c.name));
    clearModel();
    abilityLoops = !!creature(id).abilityLoop;

    // The GLBs are authored at arbitrary scale; normalise, then blow back up to the creature's
    // gameplay adult length so relative sizes match the game.
    const src = SkeletonUtils.clone(gltf.scene);
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const unit = creature(id).adultLength / Math.max(size.x, size.y, size.z, 0.01);
    src.scale.setScalar(unit);
    src.position.copy(center).multiplyScalar(-unit);
    src.traverse((o) => { if (o instanceof THREE.Mesh) o.frustumCulled = false; });
    // Use the enclosing sphere, not only the longest half-axis. Tall/radial
    // bodies need room for their full silhouette in the elevated camera view.
    frameRadius = size.length() * unit * 0.5;

    model = src;
    stage.add(model);
    mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    mixer.addEventListener('finished', () => {
      // A one-shot has run its course: settle back into the resting loop.
      if (actions.has(restingClip)) play(restingClip, false);
    });

    const names = orderClips([...actions.keys()]);
    restingClip = actions.has('Idle') ? 'Idle' : names[0] ?? '';
    current = undefined; currentName = '';
    if (restingClip) play(restingClip, false);
    frame();
    return names;
  }

  function play(name: string, loop: boolean) {
    const act = actions.get(name);
    if (!act) return;
    const repeat = loop || LOOPING.has(name) || (name === 'Ability' && abilityLoops);
    const prev = current;
    act.reset();
    act.setLoop(repeat ? THREE.LoopRepeat : THREE.LoopOnce, repeat ? Infinity : 1);
    act.clampWhenFinished = !repeat;
    act.setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (prev && prev !== act) prev.crossFadeTo(act, 0.22, false);
    else if (prev === act) prev.setEffectiveWeight(1);
    current = act;
    setClip(name);
  }

  // ---- loop ----
  const clock = new THREE.Clock();
  let time = 0, raf = 0, disposed = false;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  frame();

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    seaTime.value = time;
    mixer?.update(dt * speed);

    for (let i = 0; i < shaftCount; i++) {
      const a = (i / shaftCount) * TAU + time * 0.01;
      shaftDummy.position.set(FOCUS.x + Math.cos(a) * (14 + i * 4), SURFACE_Y / 2 - 1, FOCUS.z + Math.sin(a) * (14 + i * 4));
      shaftDummy.rotation.set(0.14, 0, -0.24);
      shaftDummy.updateMatrix();
      shafts.setMatrixAt(i, shaftDummy.matrix);
    }
    shafts.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < pCount; i++) {
      const r = i * 3;
      sampleCurrent(cur, pPos[r], pPos[r + 1], pPos[r + 2], time);
      pPos[r] += cur.x * dt; pPos[r + 1] += (cur.y - 0.02) * dt; pPos[r + 2] += cur.z * dt;
      if (pPos[r] > pRange) pPos[r] -= pRange * 2; else if (pPos[r] < -pRange) pPos[r] += pRange * 2;
      if (pPos[r + 2] > pRange) pPos[r + 2] -= pRange * 2; else if (pPos[r + 2] < -pRange) pPos[r + 2] += pRange * 2;
      if (pPos[r + 1] < -6) pPos[r + 1] = SURFACE_Y - 0.5; else if (pPos[r + 1] > SURFACE_Y) pPos[r + 1] = -4;
    }
    (pGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  return {
    show,
    play,
    setSpeed(s) { speed = s; },
    onClip(cb) { clipCb = cb; cb(currentName); },
    resetCamera: frame,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      clearModel();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
