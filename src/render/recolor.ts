import * as THREE from 'three';
import { scheme, slotFor, SLOTS, type Slot } from '../shared/palettes';

/**
 * Runtime recolouring for creatures, with no new art.
 *
 * The original roster uses vertex pigment; newer specimens also use UV albedo maps. For
 * each material we take the vertex colour the model would have drawn, reduce it to a luminance,
 * and rebuild it as `slot colour × (luminance / the material's mean luminance)`. Mottling,
 * gradients and baked shading all survive because they live in that ratio; only the hue is
 * replaced. The mean is measured from the geometry at load, so it needs no baked table and a
 * new creature works the moment it is added.
 *
 * The hook is installed once, with the strength uniform at 0, and every material keeps its own
 * uniforms. Switching schemes therefore only writes uniform values — no shader recompiles, and
 * no stalls when the dropdown changes.
 */

/** Kept modest: without it, the brightest vertex of a near-black material (eyes) blows out. */
const MAX_GAIN = 4;

const FRAGMENT_HOOK = /* glsl */`
#include <color_fragment>
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	{
		float schemeLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
		vec3 schemeRgb = uSchemeTint * min( schemeLum / max( uSchemeLumRef, 1e-4 ), ${MAX_GAIN.toFixed(1)} );
		diffuseColor.rgb = mix( diffuseColor.rgb, schemeRgb, uSchemeAmount );
	}
#endif
`;

const UNIFORM_DECLS = /* glsl */`
uniform vec3 uSchemeTint;
uniform float uSchemeAmount;
uniform float uSchemeLumRef;
`;

/** Mean luminance is a property of the geometry, so it is measured once per colour attribute. */
const lumCache = new WeakMap<THREE.BufferAttribute | THREE.InterleavedBufferAttribute, number>();

function meanLuminance(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const hit = lumCache.get(attr);
  if (hit !== undefined) return hit;
  let sum = 0;
  for (let i = 0; i < attr.count; i++) sum += 0.2126 * attr.getX(i) + 0.7152 * attr.getY(i) + 0.0722 * attr.getZ(i);
  const mean = attr.count > 0 ? sum / attr.count : 1;
  lumCache.set(attr, mean);
  return mean;
}

/** Texture pixels are shared by cloned materials and decoded once, never on a palette change. */
const pigmentPixels = new WeakMap<THREE.Texture, { data: Float32Array; width: number; height: number }>();
function texturePigment(map: THREE.Texture) {
  const cached = pigmentPixels.get(map);
  if (cached) return cached;
  const source = map.image as (CanvasImageSource & { width: number; height: number; data?: Uint8Array | Uint8ClampedArray }) | undefined;
  if (!source?.width || !source?.height) return undefined;
  let bytes: Uint8ClampedArray | Uint8Array;
  let width = source.width, height = source.height;
  if (source.data instanceof Uint8Array || source.data instanceof Uint8ClampedArray) {
    bytes = source.data;
  } else {
    const canvas = document.createElement('canvas');
    // A small cached image retains regional pigment while keeping model setup inexpensive.
    const scale = Math.min(1, 256 / Math.max(width, height));
    width = canvas.width = Math.max(1, Math.round(width * scale));
    height = canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(source, 0, 0, width, height);
    bytes = context.getImageData(0, 0, width, height).data;
  }
  const data = new Float32Array(width * height * 3);
  const linear = (v: number) => map.colorSpace === THREE.SRGBColorSpace
    ? (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) : v;
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) data[i * 3 + c] = linear(bytes[i * 4 + c] / 255);
  }
  const result = { data, width, height };
  pigmentPixels.set(map, result);
  return result;
}

/** Match the pigment reaching color_fragment: UV albedo × vertex colour × material factor. */
export function texturedMeanLuminance(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial) {
  const colors = geometry.getAttribute('color');
  const map = material.map;
  const uv = geometry.getAttribute(map?.channel ? `uv${map.channel}` : 'uv');
  const pixels = map && texturePigment(map);
  if (!colors || !map || !uv || !pixels) return colors ? meanLuminance(colors) : 1;
  map.updateMatrix();
  const point = new THREE.Vector2();
  const count = Math.min(colors.count, 4096);
  let sum = 0;
  for (let sample = 0; sample < count; sample++) {
    const i = Math.floor(sample * colors.count / count);
    point.set(uv.getX(i), uv.getY(i));
    map.transformUv(point);
    const x = Math.max(0, Math.min(pixels.width - 1, Math.floor(point.x * pixels.width)));
    const y = Math.max(0, Math.min(pixels.height - 1, Math.floor(point.y * pixels.height)));
    const p = (y * pixels.width + x) * 3;
    sum += .2126 * pixels.data[p] * colors.getX(i) * material.color.r
      + .7152 * pixels.data[p + 1] * colors.getY(i) * material.color.g
      + .0722 * pixels.data[p + 2] * colors.getZ(i) * material.color.b;
  }
  return count ? sum / count : 1;
}

/**
 * Gives every mesh under `root` its own materials. Three's SkeletonUtils.clone shares materials
 * with the source GLTF, so this is what makes a per-instance palette safe. The clones are
 * returned so the caller can dispose them with the model.
 */
export function cloneMaterials(root: THREE.Object3D): THREE.Material[] {
  const made: THREE.Material[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const cloned = mats.map((m: THREE.Material) => m.clone());
    o.material = Array.isArray(o.material) ? cloned : cloned[0];
    made.push(...cloned);
  });
  return made;
}

interface Target {
  slot: Slot;
  tint: { value: THREE.Color };
  amount: { value: number };
}

export interface Recolor {
  /** Applies a scheme by id. Unknown ids fall back to the authored colours. */
  setScheme(id: string): void;
  blend(baseId: string, colors: Record<Slot, string> | undefined, amount: number): void;
  /** The slots this particular creature actually uses, in palette order. */
  readonly slots: readonly Slot[];
}

/**
 * Installs the recolour hook on every material under `root`. The materials must already belong
 * to this instance alone — call cloneMaterials first for anything cloned from a cached GLTF.
 */
export function makeRecolor(root: THREE.Object3D): Recolor {
  const targets: Target[] = [];
  const used = new Set<Slot>();

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const colorAttr = o.geometry.getAttribute('color');
    if (!colorAttr) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!(m instanceof THREE.MeshStandardMaterial)) continue;
      const lumRef = m.map ? texturedMeanLuminance(o.geometry, m) : meanLuminance(colorAttr);
      const slot = slotFor(m.name);
      const target: Target = { slot, tint: { value: new THREE.Color(1, 1, 1) }, amount: { value: 0 } };
      targets.push(target);
      used.add(slot);
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uSchemeTint = target.tint;
        shader.uniforms.uSchemeAmount = target.amount;
        shader.uniforms.uSchemeLumRef = { value: lumRef };
        shader.fragmentShader = UNIFORM_DECLS + shader.fragmentShader.replace('#include <color_fragment>', FRAGMENT_HOOK);
      };
      // Without this, Three's program cache can hand these materials a program compiled for an
      // untouched MeshStandardMaterial with the same defines (the sea plants are exactly that).
      m.customProgramCacheKey = () => 'cambrian-recolor';
      m.needsUpdate = true;
    }
  });

  return {
    // Palette order, not the order the meshes happen to be traversed in.
    slots: SLOTS.filter((s) => used.has(s)),
    blend(baseId, colors, amount) {
      const base = scheme(baseId).colors;
      const k = THREE.MathUtils.clamp(amount, 0, 1);
      for (const t of targets) {
        t.amount.value = colors ? (base ? 1 : k) : (base ? 1 : 0);
        if (colors) {
          t.tint.value.set(colors[t.slot]);
          if (base) t.tint.value.lerp(new THREE.Color(base[t.slot]), 1-k);
        } else if (base) t.tint.value.set(base[t.slot]);
      }
    },
    setScheme(id) {
      const colors = scheme(id).colors;
      for (const t of targets) {
        t.amount.value = colors ? 1 : 0;
        // THREE.Color parses sRGB hex into the linear working space, which is what the shader wants.
        if (colors) t.tint.value.set(colors[t.slot]);
      }
    },
  };
}
