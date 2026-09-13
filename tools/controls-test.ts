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

// Forward follows the camera up. A follow camera rests 11-25° *below* the horizon and never above
// it, so the slice that has to be ignored to stop every body drifting at the seabed is a downward
// one only; looking up is always deliberate and is taken at close to its face value. At the end of
// the camera's own travel, either way, the body swims at exactly the angle being looked along.
{
  const { swimPitch, PITCH_UP, PITCH_DOWN } = await import('../src/render/engine');
  const deg = (d: number) => (d * Math.PI) / 180;
  for (const d of [0, 11, 20, 25]) check(`camera ${d}° down: forward stays level`, swimPitch(deg(d)) === 0, `pitch=${swimPitch(deg(d)).toFixed(3)}`);
  check('camera 40° down: forward tilts, but less than the camera', swimPitch(deg(40)) > 0 && swimPitch(deg(40)) < deg(40), `pitch=${swimPitch(deg(40)).toFixed(3)}`);
  // Aiming up used to buy almost nothing: 26° of camera gave 0° of swim and 34° gave 6°, so
  // pointing at prey overhead and swimming went nowhere near it.
  check('camera 26° up: forward goes up with it', swimPitch(deg(-26)) < -deg(18), `pitch=${swimPitch(deg(-26)).toFixed(3)}`);
  check('camera 40° up: within a few degrees of the camera', Math.abs(swimPitch(deg(-40)) + deg(40)) < deg(6), `pitch=${swimPitch(deg(-40)).toFixed(3)} against ${(-deg(40)).toFixed(3)}`);
  // The end of the camera's travel is the whole angle, both ways: the clamp used to stop at 40°,
  // so the steepest climb and the steepest dive the camera could ask for were both unreachable.
  check('the top of the camera travel swims at that angle', Math.abs(swimPitch(PITCH_UP) - PITCH_UP) < 1e-9, `pitch=${swimPitch(PITCH_UP).toFixed(3)} against ${PITCH_UP}`);
  check('...and so does the bottom of it', Math.abs(swimPitch(PITCH_DOWN) - PITCH_DOWN) < 1e-9, `pitch=${swimPitch(PITCH_DOWN).toFixed(3)} against ${PITCH_DOWN}`);
  check('the flat slice is downward only', swimPitch(deg(-20)) < 0 && swimPitch(deg(20)) === 0, `up=${swimPitch(deg(-20)).toFixed(3)} down=${swimPitch(deg(20)).toFixed(3)}`);
  check('nothing exceeds the camera it came from', [-89, -54, -20, 0, 20, 54, 89].every((d) => Math.abs(swimPitch(deg(d))) <= Math.abs(deg(d)) + 1e-9), 'monotone and bounded by the look angle');
}

// --- a dash goes where the camera is pointed, in all three directions ------------------------
// The vertical of a dash used to be cut to seven tenths, which tipped every aimed dash about ten
// degrees flatter than it was aimed and made lining one up on prey above or below harder than
// lining it up on prey alongside.
{
  const { swimPitch } = await import('../src/render/engine');
  const deg = (r: number) => (r * 180) / Math.PI;
  for (const camPitch of [-0.95, -0.6, -0.3, 0]) {
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 21);
    const p = g.players[0]; p.spawnProtect = 0; p.pos = { ...p.pos, y: p.pos.y + 25 };
    const base: InputFrame = { ...emptyInput(), my: 1, camYaw: Math.PI, camPitch: swimPitch(camPitch) };
    const inputs = new Map<number, InputFrame>([[0, base]]);
    for (let i = 0; i < 30; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
    inputs.set(0, { ...base, dash: true });
    g.step(1 / 60, inputs); g.events.length = 0;
    const v = p.vel, sp = Math.hypot(v.x, v.y, v.z);
    const look = { x: Math.sin(Math.PI) * Math.cos(camPitch), y: -Math.sin(camPitch), z: Math.cos(Math.PI) * Math.cos(camPitch) };
    const off = Math.acos(Math.min(1, (v.x * look.x + v.y * look.y + v.z * look.z) / sp));
    check(`dash aimed ${deg(-camPitch).toFixed(0)}° up goes there`, deg(off) < 6 && sp > 40, `${deg(off).toFixed(0)}° off the camera at ${sp.toFixed(0)} u/s`);
  }
}

// --- Sense is a mode, not a pulse: on by default, toggled by the button, and it never runs out ---
{
  const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], 42);
  const p = g.players[0];
  const hold = (sense: boolean, steps: number) => {
    const inputs = new Map<number, InputFrame>([[0, { ...emptyInput(), sense }]]);
    for (let i = 0; i < steps; i++) { g.step(1 / 60, inputs); g.events.length = 0; }
  };
  check('sense starts on', p.senseMode, `senseMode=${p.senseMode}`);
  hold(true, 2); hold(false, 2);
  check('...the button turns it off', !p.senseMode, `senseMode=${p.senseMode}`);
  hold(true, 120); hold(false, 2);
  check('...holding it does not toggle again, and it is not on a timer', p.senseMode, `senseMode=${p.senseMode}`);
  hold(true, 2); hold(false, 600);
  check('...and off stays off however long you swim', !p.senseMode, `after 10 s: senseMode=${p.senseMode}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall control-direction tests passed');
process.exit(failed ? 1 : 0);
