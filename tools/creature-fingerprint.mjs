/**
 * Fingerprints of a creature GLB: the whole file, and just the appearance.
 *
 * The appearance one answers a single question — *would this model render differently?* — so that
 * `check-creature-assets.mjs` and `portrait-test.mjs` can tell "re-render the images" apart from
 * "clips were added, the pictures are still right". Animation clips land on these models
 * constantly and never touch a pixel, so the whole-file hash cannot be the gate.
 *
 * It has to be invariant to how the file was *written*, not just to what changed in it. Any tool
 * that opens a GLB and saves it again — the clip re-authoring pass does exactly this — rewrites
 * the JSON its own way: keys come back in a different order, identical textures are collapsed into
 * one entry and every material's index renumbered, and defaults that were omitted get written out
 * explicitly. None of that alters a render, and all of it used to change the hash. So:
 *
 *  - every object is emitted with its keys sorted, so ordering cannot matter;
 *  - texture references are resolved through to the image bytes and the sampler they end at, so
 *    de-duplicating or renumbering the texture table is invisible;
 *  - sampler defaults are filled in, so an omitted default and a written one agree;
 *  - the texture, sampler and image tables are not hashed on their own, only as materials reach
 *    them: an entry nothing points at cannot change how the model looks.
 *
 * What remains is the materials as they are actually resolved, and which material each primitive
 * uses. That is the render.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

/** glTF sampler defaults, written out so a file that omits them hashes like one that does not. */
const SAMPLER_DEFAULTS = { wrapS: 10497, wrapT: 10497 };

/** Deep key-sorted copy: two objects that differ only in key order come out identical. */
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
  : v;

/** A texture reference resolved to what it actually draws: the image bytes and the sampler. */
function resolveTexture(j, ref) {
  const { index, ...rest } = ref;
  const tex = j.textures?.[index] ?? {};
  const img = j.images?.[tex.source] ?? {};
  return {
    ...rest,
    image: { mime: img.mimeType ?? null, len: img.bufferView != null ? j.bufferViews[img.bufferView].byteLength : null },
    sampler: { ...SAMPLER_DEFAULTS, ...(j.samplers?.[tex.sampler] ?? {}) },
  };
}

/** Walk a material, swapping every `...Texture: { index }` for what that index resolves to. */
function resolveMaterial(j, node, key = '') {
  if (Array.isArray(node)) return node.map((v) => resolveMaterial(j, v, key));
  if (!node || typeof node !== 'object') return node;
  if (/Texture$/.test(key) && typeof node.index === 'number') return resolveTexture(j, node);
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolveMaterial(j, v, k)]));
}

export function fingerprint(glbPath) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const appearance = canon({
    materials: (j.materials ?? []).map((m) => resolveMaterial(j, m)),
    meshMaterials: (j.meshes ?? []).map((m) => m.primitives.map((p) => p.material)),
  });
  return { glbSha256: sha(buf), appearanceSha256: sha(JSON.stringify(appearance)), clips: (j.animations ?? []).map((a) => a.name) };
}
