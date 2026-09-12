import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SEA_GLSL } from '../render/sea';
import { sampleCurrent, SURFACE_Y } from '../sim/world';
import { TAU } from '../shared/math';
import type { ViewerSpecimen } from './catalogue';
import { cloneMaterials, makeRecolor, type Recolor } from '../render/recolor';
import { settleTranslucency } from '../render/translucency';
import { DEFAULT_SCHEME, type Slot } from '../shared/palettes';
import { appBase } from '../shared/base';

/**
 * The viewer page lives one directory below the app, so `BASE_URL` ('./' in a built bundle)
 * would resolve creature assets to /viewer/assets/. Step back up a level instead; in dev
 * BASE_URL is an absolute '/' and can be used as-is.
 */
const base = appBase();
export const ASSET_BASE = base.startsWith('/') ? base : '../';

/** Buttons are grouped in this order; anything unlisted is appended alphabetically. */
const CLIP_ORDER = [
  'Idle', 'Swim', 'Crawl', 'TurnLeft', 'TurnRight', 'Dive', 'Rise',
  'Bite', 'Heavy', 'Attack', 'Grab', 'Ability',
  'Guard', 'Parry', 'Dodge', 'Hit', 'Stagger', 'Death',
  'Eat', 'Moult', 'Growth',
];

/** A clip kept for comparison after being re-authored: `replaced/<Name>` (tools/creatures/motion). */
export const REPLACED_PREFIX = 'replaced/';
export const isReplaced = (name: string) => name.startsWith(REPLACED_PREFIX);
/** The name a replaced clip had, and that its replacement now carries. */
export const replacedName = (name: string) => (isReplaced(name) ? name.slice(REPLACED_PREFIX.length) : name);
export const orderClips = (names: string[]) =>
  [...names].sort((a, b) => {
    const ia = CLIP_ORDER.indexOf(replacedName(a)), ib = CLIP_ORDER.indexOf(replacedName(b));
    if (ia !== ib) return (ia < 0 ? 1e3 : ia) - (ib < 0 ? 1e3 : ib);
    return a.localeCompare(b);
  });

export interface PlaybackState { time: number; duration: number; paused: boolean }

/** A rectangle on the canvas in CSS pixels, y down from the top edge. */
export interface Rect { x: number; y: number; width: number; height: number }

/** One mesh of the specimen for sculpting: its base positions and the transform into the root frame. */
export interface SculptMesh {
  geometry: THREE.BufferGeometry;
  base: Float32Array;
  toRoot: THREE.Matrix4;
  fromRoot: THREE.Matrix4;
  /** Eye geometry: a mesh, material or parent bone named for the eye. */
  eye: boolean;
  name: string;
}
export interface SculptTarget {
  meshes: SculptMesh[];
  /** The mouth socket in the root frame, when the model has one. */
  mouth?: [number, number, number];
}
export type WarpFn = (x: number, y: number, z: number, out: [number, number, number], eye?: boolean) => void;
export interface OrthoView {
  rect: Rect;
  /** The root-frame point at the centre of the view: [along the axis, up (side) or lateral (top)]. */
  centre: [number, number];
  /** Root-frame units per CSS pixel. */
  unitsPerPixel: number;
  axis: 'x' | 'z';
}

export interface ViewerScene {
  /** Loads a creature and returns its clip names in button order. */
  show(specimen: ViewerSpecimen, options?: { preserveView?: boolean }): Promise<string[]>;
  /**
   * Takes the stage down now. Loading the next specimen takes a moment, and the one standing
   * there must not spend it being recoloured into the next one's palette.
   */
  clear(): void;
  /** Plays a clip. One-shots fade back to the resting loop unless `loop` forces a repeat. */
  play(name: string, loop: boolean): void;
  setSpeed(s: number): void;
  setPaused(paused: boolean): void;
  /** Isolate and freeze the active clip at a chosen time for deformation inspection. */
  seek(seconds: number): void;
  onPlayback(cb: (state: PlaybackState) => void): void;
  /** Applies a colour scheme to the specimen on stage, and to any loaded after it. */
  setScheme(id: string): void;
  /** Which palette slots the specimen on stage actually has materials for. */
  activeSlots(): readonly Slot[];
  /** The clip currently driving the rig, so the button grid can follow auto-returns. */
  onClip(cb: (name: string) => void): void;
  resetCamera(): void;
  /** The specimen's geometry in its root frame, for the sculpt editor to measure and warp. */
  sculptTarget(): SculptTarget | undefined;
  /** Writes warped positions into every geometry (null restores the shipped ones); `finalize` recomputes normals. */
  applySculpt(fn: WarpFn | null, finalize: boolean): void;
  /** Sculpt layout renders the orbit view into `main` and two orthographic views; single is the whole stage. */
  setLayout(layout: 'single' | 'sculpt', main?: Rect): void;
  setOrthoView(view: 'side' | 'top', v: OrthoView): void;
  /** Stops the clips and puts the rig in its bind pose, or hands it back to the resting clip. */
  setRestPose(on: boolean): void;
  dispose(): void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function loadCreature(specimen: ViewerSpecimen) {
  return loader.loadAsync(`${ASSET_BASE}${specimen.model}`)
    .catch((e) => { throw new Error(`Could not load ${specimen.name}: ${e?.message ?? e}`); });
}

/** Keep only the displayed asset in GPU memory; browser HTTP caching handles revisits. */
function disposeAsset(gltf: GLTF) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  gltf.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
  });
  for (const m of materials) for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); });
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

  // Balanced inspection light retains the ocean setting while keeping surface colour readable.
  scene.add(new THREE.HemisphereLight('#e1eeed', '#53534b', 2.0));
  const sun = new THREE.DirectionalLight('#ffe9c4', 3.0);
  sun.position.set(FOCUS.x - 40, 70, FOCUS.z + 20);
  sun.target.position.copy(FOCUS);
  scene.add(sun, sun.target);
  // A distant point light contributed almost nothing at the specimen. A soft
  // camera-side fill lets an orbit reveal the jaw interior and shaded textures.
  const fill = new THREE.DirectionalLight('#e2eaf2', 3.5);
  fill.target.position.copy(FOCUS);
  scene.add(fill, fill.target);

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
  let source: GLTF | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  let actions = new Map<string, THREE.AnimationAction>();
  let current: THREE.AnimationAction | undefined;
  let currentName = '';
  let restingClip = 'Idle';
  let modelMaterials: THREE.Material[] = [];
  let recolor: Recolor | undefined;
  let schemeId = DEFAULT_SCHEME;
  let looping: readonly string[] = [];
  let speed = 1;
  let paused = false;
  let frameRadius = 3;
  const frameSize = new THREE.Vector3(4, 2, 4);
  let token = 0;
  let clipCb: (name: string) => void = () => {};
  let playbackCb: (state: PlaybackState) => void = () => {};
  let lastPlaybackUpdate = 0;
  let sculptTarget: SculptTarget | undefined;
  let layout: 'single' | 'sculpt' = 'single';
  let mainRect: Rect | undefined;
  const orthoViews: Partial<Record<'side' | 'top', OrthoView>> = {};
  const orthoCameras = { side: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000), top: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000) };
  let modelCenter = new THREE.Vector3();
  let modelUnit = 1;
  let restPose = false;

  function reportPlayback() {
    playbackCb({ time: current?.time ?? 0, duration: current?.getClip().duration ?? 0,
      paused: paused || !!current?.paused });
  }

  const setClip = (name: string) => { currentName = name; clipCb(name); };

  // The displayed clone owns its materials/skeletons; its source owns geometry/textures.
  function clearModel() {
    mixer?.stopAllAction();
    if (model) {
      stage.remove(model);
      const skeletons = new Set<THREE.Skeleton>();
      model.traverse(o => { if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton); });
      skeletons.forEach(s => s.dispose());
    }
    modelMaterials.forEach((m) => m.dispose());
    modelMaterials = []; recolor = undefined;
    if (source) disposeAsset(source);
    source = undefined;
    model = undefined; mixer = undefined; current = undefined;
    sculptTarget = undefined;
    actions = new Map();
    paused = false;
    setClip('');
    reportPlayback();
  }

  function frame() {
    // Fit projected bounds to the actual canvas, including narrow screens.
    // A sphere-distance approximation makes long fish needlessly tiny.
    const direction = new THREE.Vector3(.85, .28, .72).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 0;
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const corner = frameSize.clone().multiply(new THREE.Vector3(x, y, z)).multiplyScalar(.5);
      distance = Math.max(distance, corner.dot(direction) + Math.max(
        Math.abs(corner.dot(right)) / (tangent * camera.aspect), Math.abs(corner.dot(up)) / tangent));
    }
    camera.position.copy(FOCUS).addScaledVector(direction, distance * 1.2);
    controls.target.copy(FOCUS);
    controls.minDistance = frameRadius * 0.4;
    controls.maxDistance = frameRadius * 18;
    controls.update();
  }

  async function show(specimen: ViewerSpecimen, options: { preserveView?: boolean } = {}) {
    const mine = ++token;
    const gltf = await loadCreature(specimen);
    if (mine !== token || disposed) { disposeAsset(gltf); return []; }
    // Detail swaps retain the orbit and authored pose for direct full/LOD comparison.
    // A different specimen is cleared by the caller and starts with its own framing.
    const retained = options.preserveView && model ? {
      name: currentName, time: current?.time ?? 0,
      paused: paused || !!current?.paused, loop: current?.loop === THREE.LoopRepeat,
    } : undefined;
    clearModel();
    source = gltf;
    looping = specimen.looping;

    // Keep the established Cambrian display scale. Devonian is a specimen collection with
    // consistent framing; its researched real-world size is labelled separately.
    const src = SkeletonUtils.clone(gltf.scene);
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const unit = specimen.displayLength / Math.max(size.x, size.y, size.z, 0.01);
    src.scale.setScalar(unit);
    src.position.copy(center).multiplyScalar(-unit);
    src.traverse((o) => { if (o instanceof THREE.Mesh) o.frustumCulled = false; });
    // Use the enclosing sphere, not only the longest half-axis. Tall/radial
    // bodies need room for their full silhouette in the elevated camera view.
    frameRadius = size.length() * unit * 0.5;
    frameSize.copy(size).multiplyScalar(unit);

    // Own the materials before recolouring the clone.
    modelMaterials = [...cloneMaterials(src), ...settleTranslucency(src)];
    recolor = makeRecolor(src);
    recolor.setScheme(schemeId);

    model = src;
    stage.add(model);
    modelCenter = center.clone(); modelUnit = unit;
    sculptTarget = buildSculptTarget(src);
    mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    mixer.addEventListener('finished', (event) => {
      // Fading-out actions may finish after a new clip starts. Only the active action
      // can return to rest; Death retains its authored terminal pose for inspection.
      if (event.action === current && currentName !== 'Death' && actions.has(restingClip)) play(restingClip, false);
    });

    const names = orderClips([...actions.keys()]);
    restingClip = actions.has('Idle') ? 'Idle' : names[0] ?? '';
    current = undefined; currentName = '';
    if (retained && actions.has(retained.name)) {
      play(retained.name, retained.loop);
      seek(retained.time);
      paused = retained.paused;
      reportPlayback();
    } else if (restingClip) {
      paused = retained?.paused ?? false;
      play(restingClip, false);
    }
    if (!retained) frame();
    else {
      controls.minDistance = frameRadius * 0.4;
      controls.maxDistance = frameRadius * 18;
    }
    return names;
  }

  function play(name: string, loop: boolean) {
    const act = actions.get(name);
    if (!act) return;
    const repeat = loop || looping.includes(replacedName(name));
    const prev = current;
    act.reset();
    act.setLoop(repeat ? THREE.LoopRepeat : THREE.LoopOnce, repeat ? Infinity : 1);
    act.clampWhenFinished = !repeat;
    act.setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (paused) {
      for (const other of actions.values()) if (other !== act) other.stop();
      act.stopFading().stopWarping();
      mixer?.update(0);
    } else if (prev && prev !== act) prev.crossFadeTo(act, 0.22, false);
    else if (prev === act) prev.setEffectiveWeight(1);
    current = act;
    setClip(name);
    reportPlayback();
  }

  function seek(seconds: number) {
    if (!current || !mixer || !Number.isFinite(seconds)) return;
    // Remove cross-fades before sampling so a jaw pose is the authored pose,
    // independent of whichever action happened to precede it.
    for (const action of actions.values()) if (action !== current) action.stop();
    current.stopFading().stopWarping().setEffectiveWeight(1);
    current.enabled = true;
    current.paused = false;
    current.time = THREE.MathUtils.clamp(seconds, 0, current.getClip().duration);
    paused = true;
    mixer.update(0);
    reportPlayback();
  }

  // ---- sculpting ----
  // Geometry positions are in each mesh's own space; the sculpt document works in the model's
  // root frame, so each mesh carries the transform between the two. A skinned mesh's geometry is
  // its bind pose, which is what the exporters place at the node's own transform, so the same
  // matrix serves it. Meshes sharing a geometry (a depth pre-pass twin) count once.
  function buildSculptTarget(root: THREE.Object3D): SculptTarget {
    root.updateMatrixWorld(true);
    const rootInverse = root.matrixWorld.clone().invert();
    const seen = new Set<THREE.BufferGeometry>();
    const meshes: SculptMesh[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.depthPrepass) return;
      const position = o.geometry.getAttribute('position');
      if (!position || seen.has(o.geometry)) return;
      seen.add(o.geometry);
      const toRoot = rootInverse.clone().multiply(o.matrixWorld);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const names = [o.name, ...mats.map((m) => m?.name ?? '')];
      let parent: THREE.Object3D | null = o.parent;
      while (parent && parent !== root) { names.push(parent.name); parent = parent.parent; }
      const eye = names.some((n) => /eye|ocul|orbit/i.test(n) && !/eyelid|socket/i.test(n));
      meshes.push({ geometry: o.geometry, base: Float32Array.from(position.array as ArrayLike<number>), toRoot, fromRoot: toRoot.clone().invert(), eye, name: o.name });
    });
    let mouth: [number, number, number] | undefined;
    const socket = root.getObjectByName('anchor_mouth');
    if (socket) {
      const p = socket.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
      mouth = [p.x, p.y, p.z];
    }
    return { meshes, mouth };
  }

  function applySculpt(fn: WarpFn | null, finalize: boolean) {
    if (!sculptTarget) return;
    const v = new THREE.Vector3();
    const out: [number, number, number] = [0, 0, 0];
    for (const m of sculptTarget.meshes) {
      const attr = m.geometry.getAttribute('position') as THREE.BufferAttribute;
      const dst = attr.array as Float32Array;
      if (!fn) dst.set(m.base);
      else for (let i = 0; i < m.base.length; i += 3) {
        v.set(m.base[i], m.base[i + 1], m.base[i + 2]).applyMatrix4(m.toRoot);
        fn(v.x, v.y, v.z, out, m.eye);
        v.set(out[0], out[1], out[2]).applyMatrix4(m.fromRoot);
        dst[i] = v.x; dst[i + 1] = v.y; dst[i + 2] = v.z;
      }
      attr.needsUpdate = true;
      if (finalize) { m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); m.geometry.computeBoundingBox(); }
    }
  }

  function setRestPose(on: boolean) {
    restPose = on;
    if (!model) return;
    if (on) {
      mixer?.stopAllAction();
      mixer?.update(0);
      model.traverse((o) => { if (o instanceof THREE.SkinnedMesh) o.skeleton.pose(); });
      current = undefined; setClip('');
    } else if (restingClip && actions.has(restingClip)) {
      paused = false;
      play(restingClip, false);
    }
  }

  /** A root-frame point as the scene shows it: the model is centred on FOCUS and scaled to its display length. */
  const rootToWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).sub(modelCenter).multiplyScalar(modelUnit).add(FOCUS);

  function placeOrtho(view: 'side' | 'top') {
    const v = orthoViews[view];
    if (!v) return;
    const cam = orthoCameras[view];
    const halfW = v.rect.width / 2 * v.unitsPerPixel * modelUnit, halfH = v.rect.height / 2 * v.unitsPerPixel * modelUnit;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH;
    cam.updateProjectionMatrix();
    const axisZ = v.axis === 'z';
    // Screen-right is always +axis. Side: look across the body with +y up. Top: look down, with an
    // up vector that keeps +axis on the right (that fixes the lateral sign the editor mirrors).
    const c = axisZ ? new THREE.Vector3(modelCenter.x, 0, v.centre[0]) : new THREE.Vector3(v.centre[0], 0, modelCenter.z);
    if (view === 'side') {
      c.y = v.centre[1];
      const target = rootToWorld(c.x, c.y, c.z);
      const away = axisZ ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, 1);
      cam.up.set(0, 1, 0);
      cam.position.copy(target).addScaledVector(away, 500);
      cam.lookAt(target);
    } else {
      c.y = modelCenter.y;
      if (axisZ) c.x = v.centre[1]; else c.z = -v.centre[1];
      const target = rootToWorld(c.x, c.y, c.z);
      cam.up.set(axisZ ? 1 : 0, 0, axisZ ? 0 : -1);
      cam.position.copy(target).add(new THREE.Vector3(0, 500, 0));
      cam.lookAt(target);
    }
  }

  // ---- loop ----
  const clock = new THREE.Clock();
  let time = 0, raf = 0, disposed = false;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    const r = layout === 'sculpt' && mainRect ? mainRect : { width: w, height: h };
    camera.aspect = Math.max(r.width, 1) / Math.max(r.height, 1);
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
    mixer?.update(paused ? 0 : dt * speed);
    if (time - lastPlaybackUpdate >= 0.1) {
      lastPlaybackUpdate = time;
      reportPlayback();
    }

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
    fill.position.copy(camera.position);
    fill.position.y += frameRadius * .4;
    if (layout !== 'sculpt' || !mainRect) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, canvas.clientWidth || 1, canvas.clientHeight || 1);
      renderer.render(scene, camera);
      return;
    }
    const H = canvas.clientHeight || 1;
    const viewport = (r: Rect) => {
      renderer.setViewport(r.x, H - r.y - r.height, r.width, r.height);
      renderer.setScissor(r.x, H - r.y - r.height, r.width, r.height);
    };
    renderer.setScissorTest(true);
    viewport(mainRect);
    renderer.render(scene, camera);
    // The two drawings: no water, no fog, no snow — a flat ground so the silhouette reads.
    const savedBg = scene.background, savedFog = scene.fog;
    scene.background = ORTHO_BG; scene.fog = null;
    surface.visible = false; shafts.visible = false; particles.visible = false;
    for (const view of ['side', 'top'] as const) {
      const v = orthoViews[view];
      if (!v || v.rect.width < 2 || v.rect.height < 2) continue;
      placeOrtho(view);
      viewport(v.rect);
      renderer.render(scene, orthoCameras[view]);
    }
    surface.visible = true; shafts.visible = true; particles.visible = true;
    scene.background = savedBg; scene.fog = savedFog;
  }
  const ORTHO_BG = new THREE.Color('#0a2f38');
  tick();

  return {
    show,
    // Bumping the token first drops anything already in flight; `show` takes a fresh one.
    clear() { token++; clearModel(); },
    play,
    setSpeed(s) { speed = s; },
    setPaused(value) {
      paused = value;
      if (!value && current) {
        if (current.time >= current.getClip().duration) current.time = 0;
        current.paused = false;
      }
      reportPlayback();
    },
    seek,
    onPlayback(cb) { playbackCb = cb; reportPlayback(); },
    setScheme(id) { schemeId = id; recolor?.setScheme(id); },
    activeSlots() { return recolor?.slots ?? []; },
    onClip(cb) { clipCb = cb; cb(currentName); },
    resetCamera: frame,
    sculptTarget() { return sculptTarget; },
    applySculpt,
    // A new viewport shape needs the specimen framed again for it.
    setLayout(next, main) { const changed = next !== layout; layout = next; mainRect = main; resize(); if (changed) frame(); },
    setOrthoView(view, v) { orthoViews[view] = v; },
    setRestPose,
    dispose() {
      if (disposed) return;
      disposed = true;
      token++;
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
