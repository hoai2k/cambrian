import * as THREE from 'three';

const parsed = new Map<string, THREE.Color>();

/**
 * A CSS colour string as a `THREE.Color`, parsed once. `Color.set(string)` runs a regular
 * expression and a colour-space conversion every call, and palettes, highlights and the water's
 * biome colours were being set that way for every view in every viewport on every frame. The
 * returned colour is shared: copy it, never write to it.
 */
export function colorOf(css: string): THREE.Color {
  let c = parsed.get(css);
  if (!c) parsed.set(css, (c = new THREE.Color(css)));
  return c;
}
