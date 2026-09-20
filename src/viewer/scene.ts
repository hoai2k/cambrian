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
import { resolveSelection, restingClip as restingClipOf, type ClipIntent } from './playback/selection';

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
import { isOralGeometryNamed } from '../shared/oral-geometry';

/** Whether a loaded mesh is authored mouth geometry (see `src/shared/oral-geometry.ts`). */
export const isOralGeometry = (o: THREE.Mesh) =>
  isOralGeometryNamed(o.name, (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m?.name));

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
  /** The swallow socket (`anchor_mouth_inside`) and the `jaw` bone's head, root frame, when the rig has them. */
  mouthInside?: [number, number, number];
  jaw?: [number, number, number];
  /** Whether anything on stage is skinned — a built body is, a raw generation is not. */
  skinned: boolean;
  /**
   * Every bone of the rig at its bind pose, root frame, with its parent's name: what the bend
   * editor reads a chain off. Empty on a body with no rig. Taken at load, before any clip has
   * played, which is when the nodes stand at the transforms the file authored — the bind.
   */
  bones: { name: string; parent: string | null; head: [number, number, number] }[];
}

/** Which handle of the mouth cut the pointer is on. */
export type MouthHandle = 'hinge' | 'front' | 'side';
/**
 * The mouth cut as the stage draws it, in the model's root frame: the three directions, the point
 * they meet at, and how far the helpers reach — to the nose along `forward`, half the head across
 * `hinge`, the head's height along `normal`.
 */
export interface MouthCut {
  centre: [number, number, number];
  forward: [number, number, number];
  hinge: [number, number, number];
  normal: [number, number, number];
  reach: number;
  halfWidth: number;
  height: number;
}
/** Which handle of the bend span the pointer is on. */
export type BendHandle = 'base' | 'tip' | 'axis';
/**
 * The bend span as the stage draws it, in the model's root frame: the two ends, the three
 * directions of the bend, how wide to draw the cut planes, and the two traced centrelines — which
 * are drawn because the geometry reading is only as good as the run it followed, and a reviewer who
 * cannot see the trace cannot see it set off down a flipper.
 */
export interface BendSpan {
  base: [number, number, number];
  tip: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
  axis: [number, number, number];
  /** Half the width the cut planes and the axle are drawn at. */
  reach: number;
  baseTrace: readonly (readonly [number, number, number])[];
  tipTrace: readonly (readonly [number, number, number])[];
}
export type WarpFn = (x: number, y: number, z: number, out: [number, number, number], eye?: boolean) => void;

/**
 * One mesh of the specimen for region marking. Two coordinate systems, both needed: `world` is
 * where the pointer's ray lands, so it is what a brush radius is measured in; `local` is what the
 * file stores, so it is what a region file's bounds are quoted in and what a cutting script can
 * check the indices against. `index` is the mesh's place in load order, which is the address a
 * region file uses — names survive neither exporters nor Blender's own uniquifying.
 */
export interface MarkMesh {
  index: number;
  name: string;
  count: number;
  world: Float32Array;
  local: Float32Array;
}
export interface MarkTarget {
  meshes: MarkMesh[];
  /** The body's radius and centre in world units, so a brush can be sized against the animal. */
  radius: number;
  centre: [number, number, number];
}
/** Where a world point lands on the canvas, in CSS pixels, and how many of them a world unit spans there. */
export interface Projection { x: number; y: number; scale: number }

/**
 * A mesh's shipped positions in the model's root frame, which is the frame both editors measure
 * and warp in. Here rather than in either of them because it is about the shape of what
 * `sculptTarget()` hands out.
 */
export function rootFramePositions(base: Float32Array, toRoot: THREE.Matrix4): Float32Array {
  const e = toRoot.elements;
  const out = new Float32Array(base.length);
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2];
    out[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return out;
}
export interface OrthoView {
  rect: Rect;
  /** The root-frame point at the centre of the view: [along the axis, up (side) or lateral (top)]. */
  centre: [number, number];
  /** Root-frame units per CSS pixel. */
  unitsPerPixel: number;
  axis: 'x' | 'z';
}

export interface ViewerScene {
  /**
   * Loads a creature and returns its clip names in button order.
   *
   * `intent` is the reviewer's standing selection — the clip, the position and the pause — which
   * crosses from one animal to the next (`./playback/selection`). What this body can actually give
   * it is decided there and reported back through `onClip`/`onPlayback`; the intent itself is the
   * caller's and is never written to from in here.
   */
  show(specimen: ViewerSpecimen, options?: { preserveView?: boolean; intent?: ClipIntent; loop?: boolean }): Promise<string[]>;
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
  /**
   * The mouth preview's swing, laid *over* whatever `applySculpt` has on the body rather than in
   * place of it — a Triassic body can be stretched and have its mouth aimed in the same session,
   * and a preview that reset the geometry would quietly drop the stretch. Null closes the jaw.
   */
  setMouthGape(fn: WarpFn | null): void;
  /** The split layout renders the orbit view into `main` and two orthographic views; single is the whole stage. */
  setLayout(layout: 'single' | 'split', main?: Rect): void;
  setOrthoView(view: 'side' | 'top', v: OrthoView): void;
  /** Stops the clips and puts the rig in its bind pose, or hands it back to the resting clip. */
  setRestPose(on: boolean): void;
  /** Show or hide the authored mouth geometry, so the generation's own mouth can be seen plain. */
  setOralGeometry(on: boolean): void;
  /** Whether the specimen on stage has any authored mouth geometry to hide. */
  hasOralGeometry(): boolean;
  /** The specimen's vertices for region marking, in world and in the file's own coordinates. */
  markTarget(): MarkTarget | undefined;
  /** What the pointer is over, in world space: canvas CSS pixels in, the surface point out. */
  markPick(x: number, y: number): { point: [number, number, number]; mesh: number } | undefined;
  /** Where a world point is on the canvas, for drawing the brush where the reviewer is pointing. */
  markProject(point: readonly [number, number, number]): Projection | undefined;
  /** Lights the marked vertices (null clears the overlay). One mask per mesh, a byte per vertex. */
  showMarks(marks: readonly Uint8Array[] | null): void;
  /**
   * Hands the left button to the brush and orbiting to the right, or gives the orbit its usual
   * buttons back. The scene owns it because OrbitControls owns the canvas's pointer events.
   */
  setMarkInteraction(on: boolean): void;
  /**
   * Draws the mouth cut — the plane, the hinge line, the three handles — and lights every vertex
   * on the mandible side of it (null takes it all down). The test is the document's own, handed in
   * as a closure so the scene knows nothing about how a mouth is aimed.
   */
  showMouthCut(
    cut: MouthCut | null,
    mandible: ((x: number, y: number, z: number) => boolean) | null,
    /** Where to draw a lit vertex, when the preview has swung the jaw away from where it rests. */
    moveVertex?: ((x: number, y: number, z: number, out: [number, number, number]) => void) | null,
  ): void;
  /** Which of the mouth cut's handles is under the pointer, if any: canvas CSS pixels in. */
  mouthPick(x: number, y: number): MouthHandle | undefined;
  /**
   * Draws the bend span — the two cut planes, the axle it turns about, the two traced centrelines
   * and the three handles — and lights every vertex inside the span (null takes it all down). The
   * "inside" test is the document's own, handed in as a closure so the scene knows nothing about
   * how a bend is aimed.
   */
  showBend(span: BendSpan | null, inSpan: ((x: number, y: number, z: number) => boolean) | null): void;
  /** Which of the bend span's handles is under the pointer, if any: canvas CSS pixels in. */
  bendPick(x: number, y: number): BendHandle | undefined;
  /**
   * Where the pointer's ray crosses the camera-facing plane through a root-frame anchor, in the
   * root frame — how a drag on a handle in the orbit view becomes a point a document can use. The
   * mouth editor and the bend editor both drag handles this way, so there is one of it.
   */
  dragPoint(x: number, y: number, anchor: readonly [number, number, number]): [number, number, number] | undefined;
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
  /** Survives a change of specimen, because a reviewer comparing mouths is comparing across them. */
  let oralGeometry = false;
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
  let markTargetCache: MarkTarget | undefined;
  /** Which mesh of the mark target a hit geometry is, so a pick can name the mesh it landed on. */
  let markIndexOf = new Map<THREE.BufferGeometry, number>();
  let layout: 'single' | 'split' = 'single';
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
    markTargetCache = undefined; markIndexOf = new Map(); markPoints.visible = false;
    mouthRootCache = undefined; mouthGroup.visible = false; mouthPoints.visible = false;
    // Both warps belong to the body that is going away: the next one gets its own geometry.
    baseWarp = null; gapeWarp = null; shippedNormals.clear();
    bendRootCache = undefined; bendGroup.visible = false; bendPoints.visible = false;
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

  async function show(specimen: ViewerSpecimen, options: { preserveView?: boolean; intent?: ClipIntent; loop?: boolean } = {}) {
    const mine = ++token;
    const gltf = await loadCreature(specimen);
    if (mine !== token || disposed) { disposeAsset(gltf); return []; }
    // Detail swaps retain the orbit and authored pose for direct full/LOD comparison.
    // A different specimen is cleared by the caller and starts with its own framing.
    const retained = options.preserveView && model ? {
      name: currentName, time: current?.time ?? 0,
      paused: paused || !!current?.paused, loop: current?.loop === THREE.LoopRepeat,
    } : undefined;
    const wasLooping = retained?.loop ?? false;
    clearModel();
    source = gltf;
    looping = specimen.looping;

    // Keep the established Cambrian display scale. Devonian is a specimen collection with
    // consistent framing; its researched real-world size is labelled separately.
    const src = SkeletonUtils.clone(gltf.scene);
    // A raw generated body points wherever its generation pointed it. Turning it before the box is
    // measured means the framing, the radius and the centring all describe the body as shown, and
    // nothing downstream has to know the mesh was estimated rather than built.
    if (specimen.previewYaw) src.rotation.y = THREE.MathUtils.degToRad(specimen.previewYaw);
    src.updateMatrixWorld(true);
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
    applyOralGeometry();
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
    restingClip = restingClipOf(names);
    current = undefined; currentName = '';
    // One decision covers both ways a body arrives here: a change of specimen (the stage was
    // cleared, so there is nothing playing and only the standing intent to go on) and a model swap
    // (the stage was held, and what it was showing keeps the twin comparison honest where the
    // intent cannot be met). `pick.clip === null` is the base pose, or a specimen with no rig.
    const pick = resolveSelection(options.intent, names.map((n) => (
      { name: n, duration: actions.get(n)!.getClip().duration })), retained);
    if (pick.clip) {
      play(pick.clip, options.loop ?? wasLooping);
      // `seek` pauses, which is why the pause the reviewer actually asked for is set after it.
      if (pick.time > 0) seek(pick.time);
      restPose = false;
      paused = pick.paused;
      reportPlayback();
    } else if (names.length) {
      // The base pose is a selection like a clip is, and it crosses bodies with the rest of them.
      setRestPose(true);
      paused = pick.paused;
      reportPlayback();
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
    // The rig's own statements about its mouth, root frame: the socket at the lips, the swallow
    // socket behind it, and the jaw bone — whose head is the hinge the clips swing it about.
    const landmark = (name: string): [number, number, number] | undefined => {
      const node = root.getObjectByName(name);
      if (!node) return undefined;
      const p = node.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
      return [p.x, p.y, p.z];
    };
    const mouth = landmark('anchor_mouth');
    const mouthInside = landmark('anchor_mouth_inside');
    const jaw = landmark('jaw');
    let skinned = false;
    root.traverse((o) => { if (o instanceof THREE.SkinnedMesh) skinned = true; });
    // The whole rig, in the frame the editors measure in. A bone's parent is named only when it is
    // itself a bone, so the armature's own container does not become a joint of the chain.
    const bones: SculptTarget['bones'] = [];
    const boneNames = new Set<string>();
    root.traverse((o) => { if (o instanceof THREE.Bone) boneNames.add(o.name); });
    root.traverse((o) => {
      if (!(o instanceof THREE.Bone)) return;
      const p = o.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
      const parentName = o.parent && o.parent instanceof THREE.Bone && boneNames.has(o.parent.name) ? o.parent.name : null;
      bones.push({ name: o.name, parent: parentName, head: [p.x, p.y, p.z] });
    });
    return { meshes, mouth, mouthInside, jaw, skinned, bones };
  }

  // What is currently written into the geometry, kept as its two halves. The sculpt or stretch a
  // session has on the body is one thing and the mouth preview's swing is another, and either may
  // be set or cleared without disturbing the other, so the composition lives here rather than in
  // whichever editor happens to be open.
  let baseWarp: WarpFn | null = null;
  let gapeWarp: WarpFn | null = null;

  /** The gape runs first: it is aimed on the shipped positions, which is the frame it was measured in. */
  function composedWarp(): WarpFn | null {
    const base = baseWarp, gape = gapeWarp;
    if (!gape) return base;
    if (!base) return gape;
    return (x, y, z, out, eye) => { gape(x, y, z, out, eye); base(out[0], out[1], out[2], out, eye); };
  }

  function applySculpt(fn: WarpFn | null, finalize: boolean) {
    baseWarp = fn;
    writeWarp(composedWarp(), finalize);
  }

  /**
   * The mouth preview's swing. Always finalized: the point of it is to *look* at the open mouth,
   * and a jaw swung without its normals recomputed is lit as though it were still shut.
   */
  function setMouthGape(fn: WarpFn | null) {
    if (!gapeWarp && !fn) return;
    gapeWarp = fn;
    writeWarp(composedWarp(), true);
  }

  /**
   * The shipped normals, kept the first time a warp is written over a geometry.
   *
   * `computeVertexNormals` builds a smooth-shaded set from the faces, which is not what a
   * delivered body carries — split edges, authored creases — so recomputing and then clearing the
   * warp left the *positions* back where they started and the *shading* subtly changed for the
   * rest of the session. That is a real cost on a preview a reviewer takes on and off to compare:
   * every look after the first would be at a slightly differently lit animal. So the originals go
   * in here, and clearing the warp puts them back rather than recomputing again.
   */
  const shippedNormals = new Map<THREE.BufferGeometry, Float32Array>();

  function writeWarp(fn: WarpFn | null, finalize: boolean) {
    if (!sculptTarget) return;
    const v = new THREE.Vector3();
    const out: [number, number, number] = [0, 0, 0];
    for (const m of sculptTarget.meshes) {
      const attr = m.geometry.getAttribute('position') as THREE.BufferAttribute;
      const dst = attr.array as Float32Array;
      const normals = m.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
      if (fn && normals && !shippedNormals.has(m.geometry)) shippedNormals.set(m.geometry, Float32Array.from(normals.array as ArrayLike<number>));
      if (!fn) dst.set(m.base);
      else for (let i = 0; i < m.base.length; i += 3) {
        v.set(m.base[i], m.base[i + 1], m.base[i + 2]).applyMatrix4(m.toRoot);
        fn(v.x, v.y, v.z, out, m.eye);
        v.set(out[0], out[1], out[2]).applyMatrix4(m.fromRoot);
        dst[i] = v.x; dst[i + 1] = v.y; dst[i + 2] = v.z;
      }
      attr.needsUpdate = true;
      const restored = !fn && normals && shippedNormals.get(m.geometry);
      if (restored) { (normals.array as Float32Array).set(restored); normals.needsUpdate = true; }
      if (finalize) {
        if (!restored) m.geometry.computeVertexNormals();
        m.geometry.computeBoundingSphere(); m.geometry.computeBoundingBox();
      }
    }
  }

  // ---- region marking ----
  // Marking asks different questions of the same meshes than sculpting does, so it walks them
  // itself rather than bending SculptTarget to fit: it keeps the eyes (an unwanted fin is no more
  // anatomy than an eye is, and a reviewer may need to mark either), it numbers the meshes in load
  // order because that number is what the exported file addresses them by, and it carries world
  // positions because a brush is a sphere the reviewer sees on screen.
  function buildMarkTarget(root: THREE.Object3D): MarkTarget {
    root.updateMatrixWorld(true);
    const seen = new Set<THREE.BufferGeometry>();
    const meshes: MarkMesh[] = [];
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.depthPrepass) return;
      const position = o.geometry.getAttribute('position');
      if (!position || seen.has(o.geometry)) return;
      seen.add(o.geometry);
      // The shipped positions, not whatever a sculpt has warped them to: a region file's bounds
      // have to describe the mesh as the cutting script will find it in the file.
      const sculpted = sculptTarget?.meshes.find((m) => m.geometry === o.geometry);
      const local = sculpted ? sculpted.base : Float32Array.from(position.array as ArrayLike<number>);
      const count = local.length / 3;
      const world = new Float32Array(local.length);
      for (let i = 0; i < local.length; i += 3) {
        v.set(local[i], local[i + 1], local[i + 2]).applyMatrix4(o.matrixWorld);
        world[i] = v.x; world[i + 1] = v.y; world[i + 2] = v.z;
        box.expandByPoint(v);
      }
      markIndexOf.set(o.geometry, meshes.length);
      meshes.push({ index: meshes.length, name: o.name || o.geometry.name || `mesh ${meshes.length}`, count, world, local });
    });
    const centre = box.isEmpty() ? FOCUS.clone() : box.getCenter(new THREE.Vector3());
    const radius = box.isEmpty() ? 1 : box.getSize(new THREE.Vector3()).length() * 0.5;
    return { meshes, radius, centre: [centre.x, centre.y, centre.z] };
  }

  // The marks themselves: one point per marked vertex, in world space, drawn over the body. The
  // depth nudge in the vertex shader is what keeps them visible — a point sitting exactly on the
  // surface it was picked off loses the depth test to it on half the frames — while leaving them
  // properly hidden by anything genuinely in front, so a mark on the far flank stays on the far
  // flank when the reviewer orbits.
  const markGeo = G(new THREE.BufferGeometry());
  markGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(THREE.DynamicDrawUsage));
  const markPoints = new THREE.Points(markGeo, M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_Position.z-=.0016*gl_Position.w;gl_PointSize=clamp(520./max(1.,-mv.z),3.,9.);}`,
    fragmentShader: `void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.18,.62,.92-.25*r);}`,
  })));
  markPoints.frustumCulled = false;
  markPoints.visible = false;
  markPoints.renderOrder = 3;
  scene.add(markPoints);
  const raycaster = new THREE.Raycaster();

  function markTarget(): MarkTarget | undefined {
    if (!model) return undefined;
    if (!markTargetCache) markTargetCache = buildMarkTarget(model);
    return markTargetCache;
  }

  function markPick(x: number, y: number) {
    if (!model) return undefined;
    // Mark mode runs in the single layout, so the whole canvas is the orbit camera's viewport.
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
    const hits = raycaster.intersectObject(model, true);
    const hit = hits.find((i) => i.object instanceof THREE.Mesh && !i.object.userData.depthPrepass);
    if (!hit) return undefined;
    markTarget();   // the pick names a mesh, so the target (and its index map) has to exist
    const index = markIndexOf.get((hit.object as THREE.Mesh).geometry) ?? 0;
    return { point: [hit.point.x, hit.point.y, hit.point.z] as [number, number, number], mesh: index };
  }

  function markProject(point: readonly [number, number, number]): Projection | undefined {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const p = new THREE.Vector3(point[0], point[1], point[2]);
    const depth = p.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
    p.project(camera);
    // One world unit at that depth, in CSS pixels: the perspective camera's half-height at the
    // depth the point sits at is what a metre of brush radius has to be divided by.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(depth, 1e-3);
    return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, scale: (h / 2) / Math.max(halfHeight, 1e-6) };
  }

  function showMarks(marks: readonly Uint8Array[] | null) {
    const target = markTargetCache;
    if (!marks || !target) { markPoints.visible = false; return; }
    let n = 0;
    for (const mask of marks) for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
    const attr = markGeo.getAttribute('position') as THREE.BufferAttribute;
    if (attr.count < Math.max(n, 1)) {
      markGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(n, 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    const dst = (markGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let w = 0;
    for (let m = 0; m < marks.length; m++) {
      const mask = marks[m], mesh = target.meshes[m];
      if (!mesh) continue;
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        dst[w++] = mesh.world[i * 3]; dst[w++] = mesh.world[i * 3 + 1]; dst[w++] = mesh.world[i * 3 + 2];
      }
    }
    (markGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    markGeo.setDrawRange(0, n);
    markPoints.visible = n > 0;
  }

  function setMarkInteraction(on: boolean) {
    controls.mouseButtons = on
      // Left paints, so the orbit must not have it. Right orbits (and, with a modifier, pans,
      // which OrbitControls already does for whichever button it turns), middle dollies.
      ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    if (!on) { markPoints.visible = false; }
  }

  // ---- the mouth cut ----
  // Everything the mouth editor draws lives in one group whose matrix is the model's own, so its
  // children are placed in the root frame — the frame the document is measured in — and a raw
  // generation's preview turn (`previewYaw`) is applied to the helpers exactly as it is to the
  // body. The plane and the two lines are drawn without a depth test, because a cut through a
  // head is inside the head, and a helper the head hides is a helper nobody can aim.
  const mouthGroup = new THREE.Group();
  mouthGroup.matrixAutoUpdate = false;
  mouthGroup.visible = false;
  scene.add(mouthGroup);
  const helperMat = (color: string, opacity: number) => M(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  // The cut plane, from the hinge to the nose: unit square with its near edge on the hinge line.
  const mouthPlane = new THREE.Mesh(G(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0)), helperMat('#61f2d5', 0.22));
  // The hinge plane, square to it: the wall behind which nothing is mandible.
  const hingePlane = new THREE.Mesh(G(new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2)), helperMat('#ffb36b', 0.12));
  const lineMat = M(new THREE.LineBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
  const hingeLine = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)])), lineMat);
  const mouthLine = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)])), M(new THREE.LineBasicMaterial({ color: '#61f2d5', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })));
  const handleGeo = G(new THREE.SphereGeometry(1, 14, 10));
  const mouthHandles: Record<MouthHandle, THREE.Mesh> = {
    hinge: new THREE.Mesh(handleGeo, helperMat('#ffb36b', 0.95)),
    front: new THREE.Mesh(handleGeo, helperMat('#61f2d5', 0.95)),
    side: new THREE.Mesh(handleGeo, helperMat('#ff2fa8', 0.95)),
  };
  for (const [name, h] of Object.entries(mouthHandles)) { h.name = `mouth-${name}`; h.renderOrder = 5; }
  mouthPlane.renderOrder = 4; hingePlane.renderOrder = 4; hingeLine.renderOrder = 5; mouthLine.renderOrder = 5;
  mouthGroup.add(mouthPlane, hingePlane, hingeLine, mouthLine, mouthHandles.hinge, mouthHandles.front, mouthHandles.side);
  // The mandible side, lit point by point over the surface — the same overlay mark mode uses,
  // in the hinge's colour, and for the same reason: it touches no material and comes off whole.
  // A vertex-colour tint would have been the obvious alternative, and would have broken the
  // recolour hook, which reads the body's own COLOR_0 as the mask for what a scheme repaints.
  const mouthGeo = G(new THREE.BufferGeometry());
  mouthGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(THREE.DynamicDrawUsage));
  const mouthPoints = new THREE.Points(mouthGeo, M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_Position.z-=.0016*gl_Position.w;gl_PointSize=clamp(420./max(1.,-mv.z),2.5,7.);}`,
    fragmentShader: `void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.7,.42,.9-.3*r);}`,
  })));
  mouthPoints.frustumCulled = false;
  mouthPoints.visible = false;
  mouthPoints.renderOrder = 3;
  scene.add(mouthPoints);
  /** Every sculptable mesh's shipped positions in the root frame, once per body, for the test to run over. */
  let mouthRootCache: { mesh: SculptMesh; root: Float32Array }[] | undefined;

  function showMouthCut(
    cut: MouthCut | null,
    mandible: ((x: number, y: number, z: number) => boolean) | null,
    moveVertex?: ((x: number, y: number, z: number, out: [number, number, number]) => void) | null,
  ) {
    if (!cut || !mandible || !model || !sculptTarget) { mouthGroup.visible = false; mouthPoints.visible = false; return; }
    model.updateMatrixWorld();
    mouthGroup.matrix.copy(model.matrixWorld);
    mouthGroup.matrixWorldNeedsUpdate = true;
    // The basis as a rotation: columns are forward, hinge, normal — the plane geometry's own x, y, z.
    const f = new THREE.Vector3(...cut.forward), h = new THREE.Vector3(...cut.hinge), n = new THREE.Vector3(...cut.normal);
    const rot = new THREE.Matrix4().makeBasis(f, h, n);
    const q = new THREE.Quaternion().setFromRotationMatrix(rot);
    const c = new THREE.Vector3(...cut.centre);
    const wide = cut.halfWidth * 1.3;
    const place = (o: THREE.Object3D, at: THREE.Vector3, scale: THREE.Vector3) => { o.position.copy(at); o.quaternion.copy(q); o.scale.copy(scale); };
    place(mouthPlane, c, new THREE.Vector3(cut.reach, wide * 2, 1));
    place(hingePlane, c, new THREE.Vector3(1, wide * 2, cut.height));
    place(hingeLine, c, new THREE.Vector3(1, wide, 1));
    place(mouthLine, c, new THREE.Vector3(cut.reach, 1, 1));
    // Handles are sized to the head, so a hatchling's and a shonisaur's are equally grabbable.
    const r = Math.max(cut.height, cut.halfWidth) * 0.07;
    const rs = new THREE.Vector3(r, r, r);
    place(mouthHandles.hinge, c, rs);
    place(mouthHandles.front, c.clone().addScaledVector(f, cut.reach), rs);
    place(mouthHandles.side, c.clone().addScaledVector(h, wide), rs);
    mouthGroup.visible = true;

    if (!mouthRootCache) mouthRootCache = sculptTarget.meshes.map((mesh) => ({ mesh, root: rootFramePositions(mesh.base, mesh.toRoot) }));
    let n2 = 0;
    for (const { root } of mouthRootCache) for (let i = 0; i < root.length; i += 3) if (mandible(root[i], root[i + 1], root[i + 2])) n2++;
    const attr = mouthGeo.getAttribute('position') as THREE.BufferAttribute;
    if (attr.count < Math.max(n2, 1)) {
      mouthGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(n2, 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    const dst = (mouthGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const v = new THREE.Vector3();
    const moved: [number, number, number] = [0, 0, 0];
    let w = 0;
    for (const { root } of mouthRootCache) for (let i = 0; i < root.length; i += 3) {
      if (!mandible(root[i], root[i + 1], root[i + 2])) continue;
      // The overlay is drawn on the body as it stands, so a jaw the preview has swung open takes
      // its lit vertices with it; otherwise the marks would stay behind in the shut mouth.
      if (moveVertex) moveVertex(root[i], root[i + 1], root[i + 2], moved);
      else { moved[0] = root[i]; moved[1] = root[i + 1]; moved[2] = root[i + 2]; }
      v.set(moved[0], moved[1], moved[2]).applyMatrix4(model.matrixWorld);
      dst[w++] = v.x; dst[w++] = v.y; dst[w++] = v.z;
    }
    (mouthGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    mouthGeo.setDrawRange(0, n2);
    mouthPoints.visible = n2 > 0;
  }

  function mouthPick(x: number, y: number): MouthHandle | undefined {
    if (!mouthGroup.visible) return undefined;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(Object.values(mouthHandles), false)[0];
    if (!hit) return undefined;
    return (Object.entries(mouthHandles).find(([, m]) => m === hit.object)?.[0] as MouthHandle | undefined);
  }

  function dragPoint(x: number, y: number, anchor: readonly [number, number, number]): [number, number, number] | undefined {
    if (!model) return undefined;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
    const a = rootToWorld(anchor[0], anchor[1], anchor[2]);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), a);
    const p = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!p) return undefined;
    p.applyMatrix4(model.matrixWorld.clone().invert());
    return [p.x, p.y, p.z];
  }

  // ---- the bend span ----
  // Drawn in the model's own frame like the mouth cut, and for the same reason: the document is
  // measured there, and a raw generation's preview turn has to reach the helpers exactly as it
  // reaches the body. Without a depth test, because a span through a neck is inside the neck.
  const bendGroup = new THREE.Group();
  bendGroup.matrixAutoUpdate = false;
  bendGroup.visible = false;
  scene.add(bendGroup);
  const bendCut = (color: string) => {
    const m = new THREE.Mesh(G(new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2)), helperMat(color, 0.16));
    m.renderOrder = 4;
    return m;
  };
  const bendPlanes = { base: bendCut('#ffb36b'), tip: bendCut('#61f2d5') };
  const axleMat = M(new THREE.LineBasicMaterial({ color: '#ff2fa8', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
  const bendAxle = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)])), axleMat);
  const spanLine = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)])), M(new THREE.LineBasicMaterial({ color: '#eefaf6', transparent: true, opacity: 0.8, depthTest: false, depthWrite: false })));
  const traceMat = (color: string) => M(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
  const bendTraces = {
    base: new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])), traceMat('#ffb36b')),
    tip: new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])), traceMat('#61f2d5')),
  };
  const bendHandles: Record<BendHandle, THREE.Mesh> = {
    base: new THREE.Mesh(handleGeo, helperMat('#ffb36b', 0.95)),
    tip: new THREE.Mesh(handleGeo, helperMat('#61f2d5', 0.95)),
    axis: new THREE.Mesh(handleGeo, helperMat('#ff2fa8', 0.95)),
  };
  for (const [name, h] of Object.entries(bendHandles)) { h.name = `bend-${name}`; h.renderOrder = 5; }
  for (const o of [bendAxle, spanLine, bendTraces.base, bendTraces.tip]) o.renderOrder = 5;
  bendGroup.add(bendPlanes.base, bendPlanes.tip, bendAxle, spanLine, bendTraces.base, bendTraces.tip,
    bendHandles.base, bendHandles.tip, bendHandles.axis);
  // The span's own vertices, lit point by point — the same overlay mark mode and the mouth editor
  // use, so what the turn will actually carry is seen rather than inferred.
  const bendGeo = G(new THREE.BufferGeometry());
  bendGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(THREE.DynamicDrawUsage));
  const bendPoints = new THREE.Points(bendGeo, M(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_Position.z-=.0016*gl_Position.w;gl_PointSize=clamp(420./max(1.,-mv.z),2.5,7.);}`,
    fragmentShader: `void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.38,.95,.84,.85-.3*r);}`,
  })));
  bendPoints.frustumCulled = false;
  bendPoints.visible = false;
  bendPoints.renderOrder = 3;
  scene.add(bendPoints);
  /** Every sculptable mesh's shipped positions in the root frame, once per body, for the test to run over. */
  let bendRootCache: { mesh: SculptMesh; root: Float32Array }[] | undefined;

  /** A polyline redrawn in place; an empty run hides it. */
  function setPolyline(line: THREE.Line, pts: readonly (readonly [number, number, number])[]) {
    if (pts.length < 2) { line.visible = false; return; }
    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attr || attr.count < pts.length) {
      line.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.length * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    const dst = (line.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < pts.length; i++) { dst[i * 3] = pts[i][0]; dst[i * 3 + 1] = pts[i][1]; dst[i * 3 + 2] = pts[i][2]; }
    (line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    line.geometry.setDrawRange(0, pts.length);
    line.visible = true;
  }

  function showBend(span: BendSpan | null, inSpan: ((x: number, y: number, z: number) => boolean) | null) {
    if (!span || !inSpan || !model || !sculptTarget) { bendGroup.visible = false; bendPoints.visible = false; return; }
    model.updateMatrixWorld();
    bendGroup.matrix.copy(model.matrixWorld);
    bendGroup.matrixWorldNeedsUpdate = true;
    const f = new THREE.Vector3(...span.forward), u = new THREE.Vector3(...span.up), a = new THREE.Vector3(...span.axis);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, u, a));
    const base = new THREE.Vector3(...span.base), tip = new THREE.Vector3(...span.tip);
    const wide = span.reach * 2;
    const place = (o: THREE.Object3D, at: THREE.Vector3, scale: THREE.Vector3) => { o.position.copy(at); o.quaternion.copy(q); o.scale.copy(scale); };
    // The plane geometry is rotated onto the y–z face, so its x is the basis' forward: a cut square
    // to the span is that face scaled across up and axis.
    place(bendPlanes.base, base, new THREE.Vector3(1, wide, wide));
    place(bendPlanes.tip, tip, new THREE.Vector3(1, wide, wide));
    // The axle is a line along its own x, so it is aimed at the axis directly rather than through
    // the span's basis: its length is the only thing the basis would have given it.
    bendAxle.position.copy(base);
    bendAxle.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), a);
    bendAxle.scale.setScalar(span.reach * 1.4);
    spanLine.position.copy(base);
    spanLine.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), f);
    spanLine.scale.setScalar(base.distanceTo(tip));
    setPolyline(bendTraces.base, span.baseTrace);
    setPolyline(bendTraces.tip, span.tipTrace);
    const r = span.reach * 0.14;
    const rs = new THREE.Vector3(r, r, r);
    place(bendHandles.base, base, rs);
    place(bendHandles.tip, tip, rs);
    place(bendHandles.axis, base.clone().addScaledVector(a, span.reach * 1.4), rs);
    bendGroup.visible = true;

    if (!bendRootCache) bendRootCache = sculptTarget.meshes.map((mesh) => ({ mesh, root: rootFramePositions(mesh.base, mesh.toRoot) }));
    let n = 0;
    for (const { root } of bendRootCache) for (let i = 0; i < root.length; i += 3) if (inSpan(root[i], root[i + 1], root[i + 2])) n++;
    const attr = bendGeo.getAttribute('position') as THREE.BufferAttribute;
    if (attr.count < Math.max(n, 1)) {
      bendGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(n, 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    const dst = (bendGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const v = new THREE.Vector3();
    let w = 0;
    for (const { root } of bendRootCache) for (let i = 0; i < root.length; i += 3) {
      if (!inSpan(root[i], root[i + 1], root[i + 2])) continue;
      v.set(root[i], root[i + 1], root[i + 2]).applyMatrix4(model.matrixWorld);
      dst[w++] = v.x; dst[w++] = v.y; dst[w++] = v.z;
    }
    (bendGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    bendGeo.setDrawRange(0, n);
    bendPoints.visible = n > 0;
  }

  function bendPick(x: number, y: number): BendHandle | undefined {
    if (!bendGroup.visible) return undefined;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(Object.values(bendHandles), false)[0];
    if (!hit) return undefined;
    return (Object.entries(bendHandles).find(([, m]) => m === hit.object)?.[0] as BendHandle | undefined);
  }

  /** Applies the current oral-geometry setting to whatever is on stage. Re-applied on every load. */
  function applyOralGeometry() {
    model?.traverse((o) => { if (o instanceof THREE.Mesh && isOralGeometry(o)) o.visible = oralGeometry; });
  }
  function setOralGeometry(on: boolean) { oralGeometry = on; applyOralGeometry(); }
  function hasOralGeometry() {
    let found = false;
    model?.traverse((o) => { if (o instanceof THREE.Mesh && isOralGeometry(o)) found = true; });
    return found;
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
/**
 * A root-frame point as the scene shows it.
 *
 * Through the model's own world matrix rather than by hand, because a raw generated body is
 * *turned* before it is framed (`previewYaw`) and the editors measure it in the frame the file is
 * in, which is the one before that turn. Centring and scaling it by hand was right while those two
 * frames were the same and silently wrong the moment one of them was rotated: the drawings would
 * show a body lying one way and place the cuts as though it lay another.
 */
  const rootToWorld = (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z);
    if (model) { model.updateMatrixWorld(); return p.applyMatrix4(model.matrixWorld); }
    return p.sub(modelCenter).multiplyScalar(modelUnit).add(FOCUS);
  };
  /** The model's own turn, for the orthographic cameras: they frame root axes, not world ones. */
  const rootTurn = () => (model ? model.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion());

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
      const away = (axisZ ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, 1)).applyQuaternion(rootTurn());
      cam.up.set(0, 1, 0).applyQuaternion(rootTurn());
      cam.position.copy(target).addScaledVector(away, 500);
      cam.lookAt(target);
    } else {
      c.y = modelCenter.y;
      if (axisZ) c.x = v.centre[1]; else c.z = -v.centre[1];
      const target = rootToWorld(c.x, c.y, c.z);
      cam.up.set(axisZ ? 1 : 0, 0, axisZ ? 0 : -1).applyQuaternion(rootTurn());
      cam.position.copy(target).add(new THREE.Vector3(0, 500, 0).applyQuaternion(rootTurn()));
      cam.lookAt(target);
    }
  }

  // ---- loop ----
  const clock = new THREE.Clock();
  let time = 0, raf = 0, disposed = false;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    const r = layout === 'split' && mainRect ? mainRect : { width: w, height: h };
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
    if (layout !== 'split' || !mainRect) {
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
    setMouthGape,
    // A new viewport shape needs the specimen framed again for it.
    setLayout(next, main) { const changed = next !== layout; layout = next; mainRect = main; resize(); if (changed) frame(); },
    setOrthoView(view, v) { orthoViews[view] = v; },
    setRestPose,
    setOralGeometry,
    hasOralGeometry,
    markTarget,
    markPick,
    markProject,
    showMarks,
    setMarkInteraction,
    showMouthCut,
    mouthPick,
    showBend,
    bendPick,
    dragPoint,
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
