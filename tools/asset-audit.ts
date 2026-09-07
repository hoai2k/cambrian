/** Browser-side audit using the same loader, skinning, mixer and anchor API as the game. */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ensureLoaded } from '../src/render/creature';
import { CreatureAnchors, type AnchorInfo } from '../src/render/anchors';
import { EXPANSION_CREATURES } from '../src/sim/expansion';

type LoadedAsset = Awaited<ReturnType<typeof ensureLoaded>>;
type AnchorMetadata = AnchorInfo & { solver?: string; contactType?: string };
const REQUIRED_ANCHORS = { anchor_mouth: 'mouth', anchor_mouth_inside: 'swallow', anchor_attack_primary: 'attack' };
const LOCOMOTOR_BONE = /^(?:root|body|segment|spine|tail|swim(?:mer)?|fin|flap|paddle|comb|ctene|gill|bell|foot|mantle|lobe)(?:_|$)/i;
const isBone = (o: THREE.Object3D | undefined): o is THREE.Bone => !!o && (o as THREE.Bone).isBone;
const finite = (p: THREE.Vector3) => p.toArray().every(Number.isFinite);
const localPose = (o: THREE.Object3D) => [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()];
/** SkinnedMesh.boundingBox is cached; sockets must be compared with current skin. */
function currentBounds(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3(), point = new THREE.Vector3();
  model.traverse(o => {
    if (!(o as THREE.Mesh).isMesh) return;
    const mesh = o as THREE.Mesh;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) (mesh as THREE.SkinnedMesh).skeleton.update();
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point); mesh.localToWorld(point);
      if (!finite(point)) throw Error(`Nonfinite current skin while bounding ${mesh.name}`);
      bounds.expandByPoint(point);
    }
  });
  return bounds;
}
const boundsDiagnostic = (point: THREE.Vector3, bounds: THREE.Box3) =>
  `position=${JSON.stringify(point.toArray())}, bounds=${JSON.stringify([bounds.min.toArray(), bounds.max.toArray()])}`;
const difference = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
function ancestorOf(ancestor: THREE.Object3D, node: THREE.Object3D) {
  for (let p: THREE.Object3D | null = node; p; p = p.parent) if (p === ancestor) return true;
  return false;
}
function metadataSignature(anchors: CreatureAnchors) {
  return JSON.stringify([...anchors.sockets].sort(([a], [b]) => a.localeCompare(b)).map(([name, node]) =>
    [name, Object.fromEntries(Object.entries(node.userData.cambrianAnchor).sort(([a], [b]) => a.localeCompare(b)))]));
}

/** Exercise sockets on independent, translated/rotated/scaled instance clones. */
export function auditAnchors(label: string, loaded: LoadedAsset) {
  const template = loaded.gltf.scene;
  const a = SkeletonUtils.clone(template), b = SkeletonUtils.clone(template);
  const anchors = new CreatureAnchors(a), other = new CreatureAnchors(b), original = new CreatureAnchors(template);
  const extent = Math.max(loaded.size.x, loaded.size.y, loaded.size.z, .001);
  const tolerance = Math.max(1e-7, extent * 1e-6);
  const names = new Map<string, THREE.Object3D>();
  a.traverse(o => {
    if (o.userData.cambrianAnchor) {
      if (names.has(o.name)) throw Error(`${label}: duplicate socket ${o.name}`);
      names.set(o.name, o);
    }
    if (isBone(o)) {
      const sibling = b.getObjectByName(o.name), source = template.getObjectByName(o.name);
      if (!isBone(sibling) || !isBone(source) || o === sibling || o === source || sibling === source)
        throw Error(`${label}: bone ${o.name} is not independently cloned`);
    }
  });
  for (const [name, role] of Object.entries(REQUIRED_ANCHORS)) {
    const node = anchors.sockets.get(name);
    if (!node) throw Error(`${label}: missing ${name}`);
    if (node.userData.cambrianAnchor.role !== role) throw Error(`${label}: ${name} must have role ${role}`);
  }
  if (metadataSignature(anchors) !== metadataSignature(other) || metadataSignature(anchors) !== metadataSignature(original))
    throw Error(`${label}: clone changed anchor metadata`);

  // Every cloned skinned mesh must reference cloned bones, not the loader cache.
  const clonedBones = new Set<THREE.Object3D>(); a.traverse(o => { if (isBone(o)) clonedBones.add(o); });
  a.traverse(o => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) for (const bone of (o as THREE.SkinnedMesh).skeleton.bones)
      if (!clonedBones.has(bone)) throw Error(`${label}: cloned skeleton retains a foreign bone`);
  });
  const localBounds = currentBounds(a).expandByScalar(extent * .12);
  for (const [name, socket] of anchors.sockets) {
    const data = socket.userData.cambrianAnchor as AnchorMetadata;
    if (data.version !== 1 || typeof data.role !== 'string' || !data.role || typeof data.parentBone !== 'string')
      throw Error(`${label}: invalid v1 metadata on ${name}`);
    const parent = a.getObjectByName(data.parentBone);
    if (!isBone(parent) || socket.parent !== parent) throw Error(`${label}: ${name} parent mismatch (${data.parentBone})`);
    const position = new THREE.Vector3();
    if (!anchors.world(name, position) || !finite(position) || !localBounds.containsPoint(position))
      throw Error(`${label}: ${name} world position is nonfinite or outside current model bounds: ${boundsDiagnostic(position, localBounds)}`);
    if (data.chain !== undefined) {
      if (!Array.isArray(data.chain) || !data.chain.length || new Set(data.chain).size !== data.chain.length || data.solver !== 'CCD')
        throw Error(`${label}: ${name} has invalid CCD chain metadata`);
      let previous: THREE.Object3D | undefined;
      for (const boneName of data.chain) {
        const bone = a.getObjectByName(boneName);
        // Sidneyia's first leg pair carries feeding gnathobases; all other leg
        // pairs are locomotor. Other body/fin/tail locomotion controls are banned.
        const walkingLeg = /^leg_/.test(boneName) && !/^leg_-?1_00_\d+$/.test(boneName);
        if (!isBone(bone) || LOCOMOTOR_BONE.test(boneName) || walkingLeg)
          throw Error(`${label}: ${name} chain contains missing/locomotor bone ${boneName}`);
        if (previous && !ancestorOf(previous, bone)) throw Error(`${label}: ${name} chain is not proximal-to-distal`);
        if (!ancestorOf(bone, socket)) throw Error(`${label}: ${name} chain bone ${boneName} cannot move its socket`);
        previous = bone;
      }
      const effector = data.effectorBone ? a.getObjectByName(data.effectorBone) : undefined;
      if (!isBone(effector) || data.effectorBone !== data.chain[data.chain.length - 1] || !ancestorOf(effector, socket))
        throw Error(`${label}: ${name} effector does not match its terminal chain bone`);
    } else if (data.solver === 'CCD' || data.effectorBone !== undefined) {
      throw Error(`${label}: ${name} advertises an effector/CCD solver without a chain`);
    }
    const sibling = other.sockets.get(name), source = original.sockets.get(name);
    if (!sibling || !source || sibling === socket || source === socket || sibling === source)
      throw Error(`${label}: shared socket object ${name}`);
    const siblingPose = localPose(sibling), sourcePose = localPose(source), saved = socket.position.clone();
    socket.position.x += extent * .013;
    if (difference(siblingPose, localPose(sibling)) > tolerance || difference(sourcePose, localPose(source)) > tolerance)
      throw Error(`${label}: mutating ${name} leaks to another instance`);
    socket.position.copy(saved);
  }

  a.position.add(new THREE.Vector3(extent * .21, -extent * .13, extent * .17));
  a.rotateY(.37); a.rotateX(-.16); a.scale.multiplyScalar(1.17); a.updateMatrixWorld(true);
  const transformedBounds = currentBounds(a).expandByScalar(extent * .15);
  for (const name of anchors.sockets.keys()) {
    const viaAPI = new THREE.Vector3(), direct = new THREE.Vector3();
    anchors.world(name, viaAPI); anchors.sockets.get(name)!.getWorldPosition(direct);
    if (!finite(viaAPI) || viaAPI.distanceTo(direct) > tolerance || !transformedBounds.containsPoint(viaAPI))
      throw Error(`${label}: transformed world(${name}) is incorrect: ${boundsDiagnostic(viaAPI, transformedBounds)}, direct=${JSON.stringify(direct.toArray())}`);
  }

  const solutions: { name: string; initialDistance: number; finalDistance: number; fixedPivot: boolean }[] = [];
  for (const [name, node] of anchors.sockets) {
    const data = node.userData.cambrianAnchor as AnchorMetadata;
    if (data.solver !== 'CCD') continue; // Fixed mouth/body sockets must never enter the solver.
    const chain = data.chain!.map(n => a.getObjectByName(n)!);
    const baseline = new Map<THREE.Object3D, number[]>(); a.traverse(o => baseline.set(o, localPose(o)));
    const otherBaseline = new Map<THREE.Object3D, number[]>(); b.traverse(o => otherBaseline.set(o, localPose(o)));
    const sourceBaseline = new Map<THREE.Object3D, number[]>(); template.traverse(o => sourceBaseline.set(o, localPose(o)));
    const start = new THREE.Vector3(); anchors.world(name, start);
    let target: THREE.Vector3 | undefined, initialDistance = 0;
    // Generate a nearby *reachable* target by perturbing an actual feeding joint,
    // then restore it. This avoids testing straight chains against impossible
    // outward extension targets. A socket exactly at every joint pivot can be fixed.
    for (const joint of [...chain].reverse()) {
      const saved = joint.quaternion.clone();
      for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
        joint.quaternion.copy(saved).multiply(new THREE.Quaternion().setFromAxisAngle(axis, .10));
        a.updateMatrixWorld(true); const candidate = new THREE.Vector3(); anchors.world(name, candidate);
        joint.quaternion.copy(saved); a.updateMatrixWorld(true);
        const distance = start.distanceTo(candidate);
        if (distance > Math.max(extent * 1e-5, 1e-6)) { target = candidate; initialDistance = distance; break; }
      }
      if (target) break;
    }
    if (!target) {
      solutions.push({ name, initialDistance: 0, finalDistance: 0, fixedPivot: true });
      continue;
    }
    const returned = anchors.solveAnchor(name, target, 1, 32), end = new THREE.Vector3(); anchors.world(name, end);
    const finalDistance = end.distanceTo(target);
    if (!Number.isFinite(returned) || !finite(end) || Math.abs(returned - finalDistance) > tolerance)
      throw Error(`${label}: ${name} solveAnchor returned invalid distance`);
    if (finalDistance > initialDistance * .65 && finalDistance > Math.max(extent * 1e-5, 1e-6))
      throw Error(`${label}: ${name} CCD did not materially improve reach (${initialDistance} -> ${finalDistance})`);
    const allowed = new Set(chain);
    for (const [o, pose] of baseline) {
      const now = localPose(o);
      if ((!allowed.has(o) && difference(pose, now) > 1e-8) ||
          difference(pose.slice(0, 3), now.slice(0, 3)) > 1e-8 || difference(pose.slice(7), now.slice(7)) > 1e-8)
        throw Error(`${label}: solving ${name} changed unrelated/root/body transforms on ${o.name}`);
    }
    for (const [o, pose] of [...otherBaseline, ...sourceBaseline])
      if (difference(pose, localPose(o)) > 1e-8) throw Error(`${label}: solving ${name} mutated another clone or the loader cache`);
    solutions.push({ name, initialDistance, finalDistance, fixedPivot: false });
    for (const [o, pose] of baseline) {
      o.position.fromArray(pose, 0); o.quaternion.fromArray(pose, 3); o.scale.fromArray(pose, 7);
    }
    a.updateMatrixWorld(true);
  }
  return { sockets: anchors.sockets.size, metadata: metadataSignature(anchors), independentClones: true, transformedWorldPositions: true, solutions };
}

export function auditClips(label: string, loaded: LoadedAsset, isLod = false, looping = ['Idle', 'Swim', 'Crawl', 'Guard', 'Eat', 'Ability', 'Moult']) {
  // Exercise a disposable instance, never mutate the loader cache used by socket
  // tests/game instances. Calling pose() on every mesh is not a valid reset for
  // GLBs with shared bones and per-mesh inverse binds (notably Tamisiocaris).
  const model = SkeletonUtils.clone(loaded.gltf.scene), animations = loaded.gltf.animations;
  const meshes: THREE.SkinnedMesh[] = []; model.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
  if (!meshes.length) throw Error(`${label} not skinned`);
  if (new Set(animations.map(c => c.name)).size !== animations.length) throw Error(`${label} duplicate clips`);
  const mixer = new THREE.AnimationMixer(model), p = new THREE.Vector3();
  const extent = Math.max(loaded.size.x, loaded.size.y, loaded.size.z);
  const clips = [];
  for (const clip of animations) {
    let maxRadius = 0, animatedTracks = 0, maxSeam = 0;
    const loop = looping.includes(clip.name);
    for (const track of clip.tracks) {
      const n = track.getValueSize(), v = track.values;
      let varied = false;
      for (let k = n; k < v.length; k++) if (Math.abs(v[k] - v[k % n]) > 1e-6) { varied = true; break; }
      if (varied) animatedTracks++;
      if (track.name.endsWith('.scale') && varied) throw Error(`${label} ${clip.name}: changing scale`);
      if (loop) for (let k = 0; k < n; k++) maxSeam = Math.max(maxSeam, Math.abs(v[k] - v[v.length - n + k]));
    }
    if (!animatedTracks) throw Error(`${label} ${clip.name} is frozen`);
    if (maxSeam > .002) throw Error(`${label} ${clip.name} seam ${maxSeam}`);
    mixer.stopAllAction(); const action = mixer.clipAction(clip); action.reset().setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    for (let phase = 0; phase <= 8; phase++) {
      mixer.setTime(clip.duration * phase / 8); model.updateMatrixWorld(true);
      for (const mesh of meshes) {
        mesh.skeleton.update(); const count = mesh.geometry.attributes.position.count; const stride = Math.max(1, Math.floor(count / 700));
        for (let i = 0; i < count; i += stride) {
          mesh.getVertexPosition(i, p); mesh.localToWorld(p);
          if (!finite(p)) throw Error(`${label} ${clip.name} nonfinite skin`);
          maxRadius = Math.max(maxRadius, p.distanceTo(loaded.center));
        }
      }
    }
    if (maxRadius > extent * 3) throw Error(`${label} ${clip.name} exploding skin ${maxRadius}/${extent}`);
    clips.push({ name: clip.name, duration: clip.duration, animatedTracks, maxSeam, maxRadius });
  }
  mixer.stopAllAction(); model.updateMatrixWorld(true);
  const textures = new Set<string>();
  let vertexColoredMeshes = 0;
  for (const mesh of meshes) {
    const color = mesh.geometry.attributes.color;
    if (color) vertexColoredMeshes++;
    // The distant LOD deliberately drops texture maps. Its visible pigmentation
    // must remain in a valid COLOR_0 attribute and be enabled by every material.
    if (isLod) {
      if (!color || color.count !== mesh.geometry.attributes.position.count || color.itemSize < 3)
        throw Error(`${label}: ${mesh.name} has no usable vertex pigmentation`);
      for (let i = 0; i < color.count; i++) {
        const values = [color.getX(i), color.getY(i), color.getZ(i)];
        if (color.itemSize === 4) values.push(color.getW(i));
        if (!values.every(v => Number.isFinite(v) && v >= -1e-5 && v <= 1 + 1e-5))
          throw Error(`${label}: ${mesh.name} has nonfinite/out-of-range vertex colors`);
      }
    }
    for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
      if (mat.map) textures.add(mat.map.uuid); if (mat.normalMap) textures.add(mat.normalMap.uuid);
      if (![...mat.color.toArray(), ...mat.emissive.toArray(), mat.roughness, mat.metalness, mat.opacity].every(Number.isFinite))
        throw Error(`${label}: ${mat.name} has nonfinite material values`);
      if (isLod && !mat.vertexColors) throw Error(`${label}: ${mat.name} does not use its vertex pigmentation`);
    }
  }
  if (!isLod && !textures.size) throw Error(`${label} no textures`);
  return { bones: new Set(meshes.flatMap(m => m.skeleton.bones)).size, textures: textures.size, vertexColoredMeshes, clips };
}

export async function auditAssets() {
  const reports = [];
  for (const def of EXPANSION_CREATURES) {
    const loaded = await ensureLoaded(def.id), lod = await ensureLoaded(def.id, undefined, 1);
    const required = ['Idle', def.ground ? 'Crawl' : 'Swim', 'Attack', 'Hit', 'Death', 'TurnLeft', 'TurnRight', 'Dive', 'Rise', 'Bite', 'Heavy', 'Guard', 'Parry', 'Dodge', 'Eat', 'Stagger', 'Ability', 'Moult'];
    if (def.id === 'nectocaris') required.push('Grab');
    for (const name of required) if (!loaded.gltf.animations.some(c => c.name === name)) throw Error(`${def.id} missing ${name}`);
    // Distant LODs deliberately retain only locomotion/death, not the combat set.
    for (const name of ['Idle', def.ground ? 'Crawl' : 'Swim', 'Death'])
      if (!lod.gltf.animations.some(c => c.name === name)) throw Error(`${def.id}.lod1 missing ${name}`);
    const tris = (scene: THREE.Object3D) => {
      let n = 0; scene.traverse(o => { if ((o as THREE.Mesh).isMesh) { const g = (o as THREE.Mesh).geometry; n += (g.index?.count ?? g.attributes.position.count) / 3; } }); return n;
    };
    const fullTris = tris(loaded.gltf.scene), lodTris = tris(lod.gltf.scene);
    if (!(lodTris < fullTris * .9 && lodTris > 100)) throw Error(`${def.id} LOD not simplified`);
    const full = auditClips(def.id, loaded), low = auditClips(`${def.id}.lod1`, lod, true);
    const fullAnchors = auditAnchors(def.id, loaded), lodAnchors = auditAnchors(`${def.id}.lod1`, lod);
    if (fullAnchors.metadata !== lodAnchors.metadata) throw Error(`${def.id}: full/LOD socket names or metadata differ`);
    reports.push({ id: def.id, fullTris, lodTris, ...full, lod: low, anchors: { full: fullAnchors, lod: lodAnchors } });
  }
  return reports;
}
