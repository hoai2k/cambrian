/**
 * Mark mode's overlay: the body's meshes as a region file addresses them, the brush's pick and
 * projection, and the marked vertices drawn over the body. Part of the viewer's scene
 * (`createViewerScene`), over the context every editor's overlay shares.
 */
import * as THREE from 'three';
import type { MarkMesh, MarkTarget, Projection } from '../scene';
import type { OverlayContext } from './context';

export function createMarkOverlay(ctx: OverlayContext) {
  const { scene, canvas, camera, raycaster, G, M } = ctx;
  let markTargetCache: MarkTarget | undefined;
  /** Which mesh of the mark target a hit geometry is, so a pick can name the mesh it landed on. */
  let markIndexOf = new Map<THREE.BufferGeometry, number>();

  // Marking asks different questions of the same meshes than sculpting does, so it walks them
  // itself rather than bending SculptTarget to fit: it keeps the eyes (an unwanted fin is no more
  // anatomy than an eye is, and a reviewer may need to mark either), it numbers the meshes in load
  // order because that number is what the exported file addresses them by, and it carries world
  // positions because a brush is a sphere the reviewer sees on screen.
  function buildMarkTarget(root: THREE.Object3D): MarkTarget {
    const sculptTarget = ctx.sculptTarget();
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
    const centre = box.isEmpty() ? ctx.focus.clone() : box.getCenter(new THREE.Vector3());
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

  function markTarget(): MarkTarget | undefined {
    const model = ctx.model();
    if (!model) return undefined;
    if (!markTargetCache) markTargetCache = buildMarkTarget(model);
    return markTargetCache;
  }

  function markPick(x: number, y: number) {
    const model = ctx.model();
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

  /** The body is going away: its target is the next body's to build. */
  function reset() { markTargetCache = undefined; markIndexOf = new Map(); markPoints.visible = false; }
  return {
    markTarget, markPick, markProject, showMarks,
    /** The brush overlay comes down with the paint scheme that drew it. */
    hide() { markPoints.visible = false; },
    reset,
  };
}
