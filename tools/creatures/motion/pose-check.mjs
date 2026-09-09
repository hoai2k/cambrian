/** Prints where the sockets are at chosen clip times, to tune a performance against the rig.
 *  node tools/creatures/motion/pose-check.mjs <id> <clip> [u ...] */
import { makeIO, loadRig, Pose } from './rig.mjs';
import { Vector3 } from 'three';
const [id, clipName, ...us] = process.argv.slice(2);
const io = await makeIO();
import { existsSync } from 'node:fs';
const rig = await loadRig(io, existsSync(`public/assets/creatures/${id}.glb`) ? `public/assets/creatures/${id}.glb` : `public/assets/devonian/creatures/${id}.glb`);
const { clips } = await import(`./performances/${id}.mjs`);
const def = clips.find((c) => c.name === clipName);
const f = (v) => '[' + v.toArray().map((x) => x.toFixed(2)).join(',') + ']';
const mouth = rig.restWorldPos(rig.anchors.get('anchor_mouth'));
for (const uu of (us.length ? us.map(Number) : [0, .25, .5, .75, 1])) {
  const P = new Pose(rig); def.pose(uu, P, uu * def.duration);
  const W = rig.worldOf(P);
  const row = [`u=${uu.toFixed(2)}`];
  const names = [...[...rig.anchors.keys()].filter((k) => /grasp|attack_primary/.test(k)).slice(0, 3), ...(process.env.BONES?.split(',') ?? [])];
  for (const name of names) {
    const n = rig.anchors.get(name) ?? rig.byName.get(name);
    if (!n) continue;
    const p = new Vector3().setFromMatrixPosition(W.get(n));
    row.push(`${name}=${f(p)}${name === 'anchor_grasp' ? ` d(mouth)=${p.distanceTo(mouth).toFixed(2)}` : ''}`);
  }
  console.log(row.join('  '));
}
console.log('mouth', f(mouth));
