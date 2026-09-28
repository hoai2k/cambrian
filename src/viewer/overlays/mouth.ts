/**
 * The mouth editor's overlay: the cut plane, the hinge wall, their handles, and the mandible side
 * lit over the body. Part of the viewer's scene (`createViewerScene`), over the context every
 * editor's overlay shares.
 */
import * as THREE from 'three';
import { rootFramePositions, type MouthCut, type MouthHandle, type SculptMesh } from '../scene';
import type { OverlayContext, OverlayKit } from './context';

export function createMouthOverlay(ctx: OverlayContext, { helperMat, handleGeo }: OverlayKit) {
  const { scene, canvas, camera, raycaster, G, M } = ctx;
  // Everything the mouth editor draws lives in one group whose matrix is the model's own, so its
  // children are placed in the root frame — the frame the document is measured in — and a raw
  // generation's preview turn (`previewYaw`) is applied to the helpers exactly as it is to the
  // body. The plane and the two lines are drawn without a depth test, because a cut through a
  // head is inside the head, and a helper the head hides is a helper nobody can aim.
  const mouthGroup = new THREE.Group();
  mouthGroup.matrixAutoUpdate = false;
  mouthGroup.visible = false;
  scene.add(mouthGroup);
  // The cut plane, from the hinge to the nose: unit square with its near edge on the hinge line.
  const mouthPlane = new THREE.Mesh(G(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0)), helperMat('#61f2d5', 0.22));
  // The hinge plane, square to it: the wall behind which nothing is mandible.
  const hingePlane = new THREE.Mesh(G(new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2)), helperMat('#ffb36b', 0.12));
  const lineMat = M(new THREE.LineBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
  const hingeLine = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)])), lineMat);
  const mouthLine = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)])), M(new THREE.LineBasicMaterial({ color: '#61f2d5', transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })));
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
    const model = ctx.model();
    const sculptTarget = ctx.sculptTarget();
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

  /** The body is going away, and its cache and its drawing with it. */
  function reset() { mouthRootCache = undefined; mouthGroup.visible = false; mouthPoints.visible = false; }
  return { showMouthCut, mouthPick, reset };
}
