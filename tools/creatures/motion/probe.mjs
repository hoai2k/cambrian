/** Rig summary for authoring: chains under each joint, rest positions and directions, sockets.
 *  node tools/creatures/motion/probe.mjs <glb> [bone ...]   (bones: extra names to print in full) */
import { makeIO, loadRig } from './rig.mjs';
const [file, ...extra] = process.argv.slice(2);
const io = await makeIO(); const rig = await loadRig(io, file);
const f = (v) => '[' + v.toArray().map((x) => (x >= 0 ? ' ' : '') + x.toFixed(2)).join(',') + ']';
const line = (n, d = 0) => `${' '.repeat(d)}${n.getName().padEnd(24 - d)} p${f(rig.restWorldPos(n))} d${f(rig.restDir(n))}`;
// Collapse runs of siblings that only differ by a trailing index into one row per family.
const fam = (n) => n.replace(/[-\d]+(?=(_|$))/g, '#');
function walk(n, d, seen) {
  const kids = n.listChildren().filter((c) => rig.byName.has(c.getName()));
  const groups = new Map();
  for (const c of kids) { const k = fam(c.getName()); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  for (const [k, cs] of groups) {
    const c = cs[0];
    const depth = (x) => { let m = 0; for (const y of x.listChildren()) if (rig.byName.has(y.getName())) m = Math.max(m, 1 + depth(y)); return m; };
    console.log(line(c, d) + (cs.length > 1 ? `  ×${cs.length} (${cs.map((x) => x.getName()).slice(0, 3).join(',')}${cs.length > 3 ? '…' : ''})` : '') + `  chain↓${depth(c)}`);
    walk(c, d + 1, seen);
  }
}
console.log(`# ${file}  joints=${rig.joints.length}`);
console.log(line(rig.joints[0]));
walk(rig.joints[0], 1, new Set());
console.log('# sockets');
for (const [k, n] of rig.anchors) { const a = n.getExtras().cambrianAnchor; console.log(`${k.padEnd(28)} p${f(rig.restWorldPos(n))} parent=${rig.parentOf.get(n).getName()}${a.chain ? ' chain=' + a.chain.join('>') : ''}`); }
for (const b of extra) if (rig.byName.has(b)) console.log(line(rig.byName.get(b)));
