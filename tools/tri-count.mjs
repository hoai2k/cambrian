import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const buf = fs.readFileSync(f);
  const j = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  let tris = 0, verts = 0;
  for (const m of j.meshes ?? []) for (const p of m.primitives) {
    const pos = j.accessors[p.attributes.POSITION].count;
    verts += pos;
    tris += (p.indices != null ? j.accessors[p.indices].count : pos) / 3;
  }
  console.log(`${f.split('/').pop().padEnd(20)} tris=${Math.round(tris).toString().padStart(7)} verts=${verts.toString().padStart(7)}`);
}
