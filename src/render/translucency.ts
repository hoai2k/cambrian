import * as THREE from 'three';

/**
 * Authored translucency, settled.
 *
 * The jellies (Burgessomedusa's bell, Ctenorhabdotus' comb rows) are the only creatures with
 * blended materials: cuticle at alpha 0.88, membrane at 0.92, both double sided. glTF's BLEND
 * mode arrives from the loader with `depthWrite` off, which means the body has no depth of its
 * own: nothing in it can occlude anything else in it, so what you see is decided purely by the
 * order the meshes happen to be drawn in. A tentacle swinging in front of the bell is painted
 * over by the bell; the same tentacle behind the bell looks identical. The body reads solid
 * from one side and half-erased from another, and it changes as the creature turns.
 *
 * The fix is the standard one for a translucent body: a depth pre-pass. Each translucent mesh
 * gets a colourless twin drawn in the opaque pass that writes only depth, so by the time the
 * blended pass runs, the depth buffer already holds the nearest surface of the creature. The
 * blend then keeps `depthWrite` off and the default `LessEqual` test, so exactly one layer —
 * the nearest one — is composited over the water, from every direction. Translucency is
 * unchanged: the authored alpha still lets the background through.
 *
 * A body that is only partly translucent — a shell over a solid animal — needs one more thing:
 * the pre-pass twin must draw after the body's opaque parts, or the shell's depth hides what it
 * is meant to show through. See the note where the twin is made.
 *
 * Nothing here alters the authored colours, alpha or geometry.
 */

/** Creature bodies draw first among transparent things, ahead of effects like the guard shield. */
const BODY_ORDER = 1;

/** Materials created here, so the caller can dispose them with the rest of the model. */
export function settleTranslucency(root: THREE.Object3D): THREE.Material[] {
  const made: THREE.Material[] = [];
  const pending: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.userData.depthPrepass) return;
    const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
    // Alpha can be authored per vertex (a four-component colour attribute — Odaraia's carapace
    // carries its coverage that way, with the material's own opacity at 1) or in an alpha map.
    const vertexAlpha = o.geometry.getAttribute('color')?.itemSize === 4;
    let translucent = false;
    for (const m of mats) {
      if (!m?.transparent) continue;
      const alphaMapped = 'alphaMap' in m && !!(m as THREE.Material & { alphaMap?: THREE.Texture | null }).alphaMap;
      // Blended but fully opaque: cheaper and steadier drawn as what it is.
      if (m.opacity >= 0.999 && !vertexAlpha && !alphaMapped) { m.transparent = false; m.depthWrite = true; continue; }
      m.depthWrite = false;
      m.blending = THREE.NormalBlending;
      translucent = true;
    }
    if (translucent) { o.renderOrder = BODY_ORDER; pending.push(o); }
  });
  // Added after the traversal: a pre-pass twin is a child of the mesh it shadows.
  for (const mesh of pending) {
    const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    made.push(depthMat);
    const twin = mesh instanceof THREE.SkinnedMesh
      ? new THREE.SkinnedMesh(mesh.geometry, depthMat)
      : new THREE.Mesh(mesh.geometry, depthMat);
    if (twin instanceof THREE.SkinnedMesh && mesh instanceof THREE.SkinnedMesh) {
      twin.bindMode = mesh.bindMode;
      twin.bind(mesh.skeleton, mesh.bindMatrix);
    }
    twin.userData.depthPrepass = true;
    // The twin is opaque, so it sorts among the opaque draws, and there it must come *after* the
    // rest of the body: a translucent shell with solid parts inside it (Odaraia's carapace over
    // its trunk and limbs) would otherwise write its near surface first and the interior, farther
    // away, would then fail the depth test and vanish. Drawn last among the opaques, the twin
    // only settles the shell's own layers — the interior has already been painted and stays
    // under the blend. Bodies that are translucent throughout (the jellies) have no opaque part
    // for this to order against, so nothing changes for them.
    twin.renderOrder = BODY_ORDER;
    twin.frustumCulled = mesh.frustumCulled;
    twin.castShadow = false; twin.receiveShadow = false;
    mesh.add(twin);
  }
  return made;
}
