// Prints bones, meshes and animation clips of each creature GLB (JSON chunk only, no decoding).
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const buf = fs.readFileSync(f);
  const jsonLen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const skin = j.skins?.[0];
  const bones = (skin?.joints ?? []).map((i) => j.nodes[i].name);
  const groups = {};
  for (const b of bones) { const k = b.replace(/[_.]?\d+.*$/, ''); groups[k] = (groups[k] ?? 0) + 1; }
  const clips = (j.animations ?? []).map((a) => { const maxT = Math.max(...a.samplers.map((s) => { const acc = j.accessors[s.input]; return acc.max?.[0] ?? 0; })); return `${a.name}(${maxT.toFixed(2)}s, ${a.channels.length}ch)`; });
  console.log(`\n## ${f.split('/').pop()}\nbones=${bones.length} groups=${JSON.stringify(groups)}\nroot=${j.nodes[skin?.skeleton ?? skin?.joints?.[0]]?.name}\nclips=${clips.join(', ')}\nmeshes=${(j.meshes ?? []).map((m) => m.name).join(', ')}`);
  console.log('sample bones:', bones.slice(0, 12).join(', '), bones.length > 12 ? '…' : '');
}
