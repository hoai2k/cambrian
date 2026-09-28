import * as THREE from 'three';
import type { SculptTarget } from '../scene';

/**
 * What an editor's overlay needs from the viewer's scene: where to draw, the orbit camera and the
 * canvas a pointer is measured against, the scene's disposal registries (`G` and `M` record a
 * geometry or a material so `dispose()` frees it), and the body on stage — asked for each time,
 * because a load or a clear replaces it.
 */
export interface OverlayContext {
  scene: THREE.Scene;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  G<T extends THREE.BufferGeometry>(g: T): T;
  M<T extends THREE.Material>(m: T): T;
  /** Where the stage centres a body, for a target measured off nothing. */
  focus: THREE.Vector3;
  model(): THREE.Object3D | undefined;
  sculptTarget(): SculptTarget | undefined;
}

/** What the mouth and bend overlays share: one handle sphere, and the helper material they draw in. */
export function overlayKit(ctx: OverlayContext) {
  const helperMat = (color: string, opacity: number) => ctx.M(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  const handleGeo = ctx.G(new THREE.SphereGeometry(1, 14, 10));
  return { helperMat, handleGeo };
}
export type OverlayKit = ReturnType<typeof overlayKit>;

/** Aim the context's raycaster from the orbit camera through a point on the canvas, in CSS pixels. */
export function rayFrom(ctx: OverlayContext, x: number, y: number) {
  const w = ctx.canvas.clientWidth || 1, h = ctx.canvas.clientHeight || 1;
  ctx.raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), ctx.camera);
  return ctx.raycaster;
}
