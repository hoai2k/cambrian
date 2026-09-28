/**
 * The bend editor's overlay: the span's two cut planes, the axle, the traces, the handles and the
 * run of body the turn carries, lit where the bend has put it. Part of the viewer's scene
 * (`createViewerScene`), over the context every editor's overlay shares.
 */
import * as THREE from 'three';
import { rootFramePositions, type BendHandle, type BendSpan, type SculptMesh, type WarpFn } from '../scene';
import type { OverlayContext, OverlayKit } from './context';

export function createBendOverlay(ctx: OverlayContext, { helperMat, handleGeo }: OverlayKit) {
  const { scene, canvas, camera, raycaster, G, M } = ctx;
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
    baseAim: new THREE.Mesh(handleGeo, helperMat('#ffd9a8', 0.95)),
    tipAim: new THREE.Mesh(handleGeo, helperMat('#ff2fa8', 0.95)),
  };
  // Each plane's own normal, drawn from the plane out to its knob, so what a handle is aiming is
  // visible as a line and not only as a floating sphere.
  const aimLine = (color: string) => new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)])), traceMat(color));
  const bendAims = { base: aimLine('#ffd9a8'), tip: aimLine('#ff2fa8'), carried: aimLine('#61f2d5') };
  for (const [name, h] of Object.entries(bendHandles)) { h.name = `bend-${name}`; h.renderOrder = 5; }
  for (const o of [bendAxle, spanLine, bendTraces.base, bendTraces.tip, bendAims.base, bendAims.tip, bendAims.carried]) o.renderOrder = 5;
  bendGroup.add(bendPlanes.base, bendPlanes.tip, bendAxle, spanLine, bendTraces.base, bendTraces.tip,
    bendAims.base, bendAims.tip, bendAims.carried,
    bendHandles.base, bendHandles.tip, bendHandles.baseAim, bendHandles.tipAim);
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

  function showBend(span: BendSpan | null, inSpan: ((x: number, y: number, z: number) => boolean) | null, warp?: WarpFn | null) {
    const model = ctx.model();
    const sculptTarget = ctx.sculptTarget();
    if (!span || !inSpan || !model || !sculptTarget) { bendGroup.visible = false; bendPoints.visible = false; return; }
    model.updateMatrixWorld();
    bendGroup.matrix.copy(model.matrixWorld);
    bendGroup.matrixWorldNeedsUpdate = true;
    const f = new THREE.Vector3(...span.forward), a = new THREE.Vector3(...span.axis);
    const bn = new THREE.Vector3(...span.baseNormal).normalize();
    const tn = new THREE.Vector3(...span.tipNormal).normalize();
    const tc = new THREE.Vector3(...span.tipCarried).normalize();
    const base = new THREE.Vector3(...span.base), tip = new THREE.Vector3(...span.tip);
    const wide = span.reach * 2;
    const X = new THREE.Vector3(1, 0, 0);
    // The plane geometry is rotated onto the y–z face, so its own x is its normal: a plane is
    // placed by turning that x onto the normal it is square to. Each end gets its own, because the
    // two planes are two separate statements about where the creature's axis line runs.
    const placePlane = (o: THREE.Object3D, at: THREE.Vector3, normal: THREE.Vector3) => {
      o.position.copy(at);
      o.quaternion.setFromUnitVectors(X, normal);
      o.scale.set(1, wide, wide);
    };
    placePlane(bendPlanes.base, base, bn);
    // The *carried* direction, not the aimed one: this plane is the front of the span as the bend
    // has left it, and watching it swing onto the base plane is what the straighten slider is for.
    placePlane(bendPlanes.tip, tip, tc);
    // The axle is a line along its own x, so it is aimed at the axis directly: its length is all
    // that is left to give it.
    bendAxle.position.copy(base);
    bendAxle.quaternion.setFromUnitVectors(X, a);
    bendAxle.scale.setScalar(span.reach * 1.4);
    for (const [end, normal, at] of [['base', bn, base], ['tip', tn, tip], ['carried', tc, tip]] as const) {
      const line = bendAims[end];
      line.position.copy(at);
      line.quaternion.setFromUnitVectors(X, normal);
      line.scale.setScalar(span.reach * 1.4);
    }
    // Where the two coincide there is nothing to say and two lines drawn over each other read as
    // one thicker one, so the carried line only appears once the slider has actually moved it.
    bendAims.carried.visible = tc.angleTo(tn) > 1e-3;
    spanLine.position.copy(base);
    spanLine.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), f);
    spanLine.scale.setScalar(base.distanceTo(tip));
    setPolyline(bendTraces.base, span.baseTrace);
    setPolyline(bendTraces.tip, span.tipTrace);
    const r = span.reach * 0.14;
    const rs = new THREE.Vector3(r, r, r);
    const put = (o: THREE.Object3D, at: THREE.Vector3) => { o.position.copy(at); o.quaternion.identity(); o.scale.copy(rs); };
    put(bendHandles.base, base);
    put(bendHandles.tip, tip);
    put(bendHandles.baseAim, base.clone().addScaledVector(bn, span.reach * 1.4));
    put(bendHandles.tipAim, tip.clone().addScaledVector(tn, span.reach * 1.4));
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
    // Which vertices the span carries is asked of where they *are* — the shipped positions — and
    // each one is then drawn where the bend has *put* it. Lighting the unwarped positions instead
    // leaves the overlay standing where the body was while the body swings out from under it, and
    // a render of a straightened run then shows the mesh beside its own marks.
    const moved: [number, number, number] = [0, 0, 0];
    let w = 0;
    for (const { root } of bendRootCache) for (let i = 0; i < root.length; i += 3) {
      if (!inSpan(root[i], root[i + 1], root[i + 2])) continue;
      if (warp) { warp(root[i], root[i + 1], root[i + 2], moved); v.set(moved[0], moved[1], moved[2]); }
      else v.set(root[i], root[i + 1], root[i + 2]);
      v.applyMatrix4(model.matrixWorld);
      dst[w++] = v.x; dst[w++] = v.y; dst[w++] = v.z;
    }
    (bendGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    bendGeo.setDrawRange(0, n);
    bendPoints.visible = n > 0;
  }

  function bendLitCentroid(): [number, number, number, number] | null {
    if (!bendPoints.visible) return null;
    const attr = bendGeo.getAttribute('position') as THREE.BufferAttribute;
    const n = Math.min(bendGeo.drawRange.count, attr.count);
    if (!Number.isFinite(n) || n <= 0) return null;
    const a = attr.array as Float32Array;
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < n; i++) { x += a[i * 3]; y += a[i * 3 + 1]; z += a[i * 3 + 2]; }
    return [x / n, y / n, z / n, n];
  }

  function bendPick(x: number, y: number): BendHandle | undefined {
    if (!bendGroup.visible) return undefined;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(Object.values(bendHandles), false)[0];
    if (!hit) return undefined;
    return (Object.entries(bendHandles).find(([, m]) => m === hit.object)?.[0] as BendHandle | undefined);
  }

  /** The body is going away, and its cache and its drawing with it. */
  function reset() { bendRootCache = undefined; bendGroup.visible = false; bendPoints.visible = false; }
  return { showBend, bendPick, bendLitCentroid, reset };
}
