/**
 * The camera pulls back to show what is hunting you, and only as far as it has to.
 * Run: npm run threat-frame
 */
import { framingHunt, HUNT_OFF, HUNT_ON, THREAT_ZOOM_HOLD, THREAT_ZOOM_MAX, threatZoom } from '../src/render/threat-frame';
import { checker, finish } from './lib/test';

const check = checker(64);
const FOV = 60 * Math.PI / 180, ASPECT = 16 / 9;
// A body at the origin, the view looking along +z and a little down, the arm 6 units long.
const look = { x: 0, y: 0, z: 0 }, yaw = 0, pitch = 0.2, dist = 6;
const at = (x: number, y: number, z: number, r = 1) => threatZoom(look, yaw, pitch, dist, { x, y, z }, r, FOV, ASPECT);

check('a hunter already in the picture needs no zoom', at(0, 0, 12) === 1, `${at(0, 0, 12).toFixed(2)}`);
const beside = at(9, 0, 0);
check('one level with you off to the side pulls the camera back', beside > 1.2 && beside <= THREAT_ZOOM_MAX, `${beside.toFixed(2)}x`);
const behind = at(0, 1, -8);
check('one close behind you is brought in by backing past it', behind > 1 && behind <= THREAT_ZOOM_MAX, `${behind.toFixed(2)}x`);
check('...and a closer one needs less than a further one', at(6, 0, 0) < beside, `${at(6, 0, 0).toFixed(2)}x against ${beside.toFixed(2)}x`);
check('one too far behind for a reasonable zoom is left to the arrow', at(0, 0, -40) === 1);
check('a longer reach lets a hunter at the edge stay framed',
  threatZoom(look, yaw, pitch, dist, { x: 0, y: 0, z: -12 }, 1, FOV, ASPECT, THREAT_ZOOM_HOLD) > THREAT_ZOOM_MAX
  && threatZoom(look, yaw, pitch, dist, { x: 0, y: 0, z: -12 }, 1, FOV, ASPECT) === 1);
// The zoom it picks really does frame the body: project it and look.
{
  const m = beside, d = dist * m;
  const cam = { x: 0, y: Math.sin(pitch) * d, z: -Math.cos(pitch) * d };
  const toH = { x: 9 - cam.x, y: -cam.y, z: -cam.z };
  const fz = toH.z * Math.cos(pitch) - toH.y * Math.sin(pitch);
  check('...and at that zoom the hunter is inside the view', Math.abs(toH.x) / fz < Math.tan(FOV / 2) * ASPECT, `${(Math.atan(Math.abs(toH.x) / fz) * 180 / Math.PI).toFixed(0)}° off centre`);
}
check('framing starts at the hunting line', !framingHunt(false, HUNT_ON - 0.01) && framingHunt(false, HUNT_ON));
check('...and holds until well under it', framingHunt(true, (HUNT_ON + HUNT_OFF) / 2) && !framingHunt(true, HUNT_OFF - 0.01));
finish('all threat-frame tests passed');
