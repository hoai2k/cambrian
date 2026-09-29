import * as THREE from 'three';

/**
 * The parent every creature view hangs from, which leaves a frozen view's subtree alone.
 *
 * three walks the whole scene graph on every `render()` and recomputes every world matrix it finds
 * — hidden objects included, because `visible` only decides what is drawn, not what is updated —
 * and a creature view is a skeleton of dozens of bones. With a hundred views kept, most of them
 * behind the camera, that walk was a tenth of the frame. A view nobody can see this frame is
 * marked `frozen` by the engine and skipped here; it is thawed, and caught up, the frame it comes
 * back into view.
 */
export class ViewRoot extends THREE.Group {
  override updateMatrixWorld(force?: boolean) {
    if (this.matrixAutoUpdate) this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.parent === null) this.matrixWorld.copy(this.matrix);
      else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    const children = this.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.userData.frozen) continue;
      child.updateMatrixWorld(force);
    }
  }
}
