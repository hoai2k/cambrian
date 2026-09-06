/**
 * Camera-relative movement test. The screen-right direction for a camera looking along
 * heading(camYaw) = (sin, 0, cos) is right = forward x up = (-cos, 0, sin); this was verified
 * independently by projecting that vector through a real THREE.PerspectiveCamera.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import type { CreatureId } from '../src/sim/creatures';

function drive(creature: CreatureId, camYaw: number, mx: number, my: number, seconds = 1.5) {
  const g = new Game('reef', [{ creature, device: 'keyboard', ready: true }], 42);
  const p = g.players[0];
  p.pos = { x: 10, y: 8, z: 10 };           // open water, away from the seabed and boulders
  p.vel = { x: 0, y: 0, z: 0 };
  const start = { ...p.pos };
  const f: InputFrame = { ...emptyInput(), mx, my, camYaw, camPitch: 0 };
  const inputs = new Map<number, InputFrame>([[0, f]]);
  for (let i = 0; i < seconds * 60; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
  const d = { x: p.pos.x - start.x, z: p.pos.z - start.z };
  const right = { x: -Math.cos(camYaw), z: Math.sin(camYaw) };
  const fwd = { x: Math.sin(camYaw), z: Math.cos(camYaw) };
  return { onRight: d.x * right.x + d.z * right.z, onFwd: d.x * fwd.x + d.z * fwd.z, dist: Math.hypot(d.x, d.z) };
}

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(38)} ${detail}`); if (!ok) failed++; };

for (const camYaw of [0, 0.7, 2.4, -1.9]) {
  const r = drive('waptia', camYaw, 1, 0);
  check(`camYaw ${camYaw.toFixed(1)}: stick right -> screen right`, r.onRight > 1 && r.onRight > Math.abs(r.onFwd), `right=${r.onRight.toFixed(2)} fwd=${r.onFwd.toFixed(2)}`);
  const l = drive('waptia', camYaw, -1, 0);
  check(`camYaw ${camYaw.toFixed(1)}: stick left -> screen left`, l.onRight < -1 && Math.abs(l.onRight) > Math.abs(l.onFwd), `right=${l.onRight.toFixed(2)} fwd=${l.onFwd.toFixed(2)}`);
  const f = drive('waptia', camYaw, 0, 1);
  check(`camYaw ${camYaw.toFixed(1)}: stick up -> away from camera`, f.onFwd > 1 && f.onFwd > Math.abs(f.onRight), `right=${f.onRight.toFixed(2)} fwd=${f.onFwd.toFixed(2)}`);
  const b = drive('waptia', camYaw, 0, -1);
  check(`camYaw ${camYaw.toFixed(1)}: stick down -> toward camera`, b.onFwd < -1, `fwd=${b.onFwd.toFixed(2)}`);
}
// crawlers use the same basis, flattened
const c = drive('olenoides', 1.1, 1, 0, 2);
check('crawler: stick right -> screen right', c.onRight > 0.5 && c.onRight > Math.abs(c.onFwd), `right=${c.onRight.toFixed(2)} fwd=${c.onFwd.toFixed(2)}`);

console.log(failed ? `\n${failed} FAILED` : '\nall control-direction tests passed');
process.exit(failed ? 1 : 0);
