/** Fingerprints of a creature GLB: the whole file, and just the appearance (materials + textures). */
import fs from 'node:fs';
import crypto from 'node:crypto';
export function fingerprint(glbPath) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  // appearance = materials, textures, images (by byte length + mime) and mesh material assignments
  const appearance = {
    materials: j.materials ?? [], textures: j.textures ?? [], samplers: j.samplers ?? [],
    images: (j.images ?? []).map((im) => ({ mime: im.mimeType, len: im.bufferView != null ? j.bufferViews[im.bufferView].byteLength : null })),
    meshMaterials: (j.meshes ?? []).map((m) => m.primitives.map((p) => p.material)),
  };
  return { glbSha256: sha(buf), appearanceSha256: sha(JSON.stringify(appearance)), clips: (j.animations ?? []).map((a) => a.name) };
}
