/**
 * What nobody can see (src/sim/sight.ts): school fish out of every camera's reach skip collision
 * only a camera would notice. Run: node tools/test.mjs sight
 *
 * Every seat has a camera of its own, so the checks are made with two, three and four seats: a fish
 * one seat cannot see and another can is seen. The strongest check is the renderer's own rule
 * (`drawable`, src/render/view-pick.ts) asked from every place a seat's camera could be: nothing it
 * would draw may be marked unseen.
 */
import { Game } from '../src/sim/game';
import { emptyInput, type Actor, type PlayerSetup } from '../src/sim/types';
import { lengthOf } from '../src/sim/actors';
import { updateEyes, withinSight, type Eye } from '../src/sim/sight';
import { sampleHeight, shoreDistance } from '../src/sim/world';
import { drawable } from '../src/render/view-pick';
import { magnificationDistance, NEAR_MIN, nearAlwaysFor, ZOOM_MAX } from '../src/shared/view-reach';
import { makeRng } from '../src/shared/math';
import { checker, finish, stepN } from './lib/test';

const check = checker(62);
const seats = (n: number): PlayerSetup[] => Array.from({ length: n }, (_, i) => ({ creature: 'anomalocaris', device: i === 0 ? 'keyboard' : i - 1, ready: true }));
const eyesOf = (g: Game) => updateEyes(g.players, (id) => g.byId(id), 1 / 60, [] as Eye[]);
const fish = (g: Game) => g.actors.find((a) => a.controller === 'swarm')!;
const place = (a: Actor, x: number, z: number) => { a.pos = { x, y: sampleHeight(x, z) + 3, z }; };

// ---- nobody playing: nothing is spared ----
{
  const g = new Game('reef', seats(1), 3);
  const f = fish(g);
  check('with no seats everything counts as seen', withinSight([], [], f));
}

// ---- one seat far off, another beside it ----
for (const n of [2, 3, 4]) {
  const g = new Game('reef', seats(n), 5);
  g.skipHatch();
  const f = fish(g);
  g.players.forEach((p, i) => place(p, 2000 + i * 900, -400));
  place(f, -2000, -400);
  check(`${n} seats, all far: the fish is unseen`, !withinSight(g.players, eyesOf(g), f));
  const last = g.players[n - 1];
  place(f, last.pos.x + 12, last.pos.z);
  check(`${n} seats: beside the last seat only, the fish is seen`, withinSight(g.players, eyesOf(g), f));
}

// ---- the renderer's own rule, asked from every place a camera could be ----
{
  const rng = makeRng(11);
  let draws = 0, missed = 0;
  for (let trial = 0; trial < 60; trial++) {
    const n = 1 + (trial % 4);
    const g = new Game('reef', seats(n), 100 + trial);
    g.skipHatch();
    g.players.forEach((p) => { p.scale = 0.3 + rng() * 3; place(p, rng.range(-300, 300), rng.range(-600, -200)); });
    const eyes = eyesOf(g);
    let near = NEAR_MIN;
    for (const p of g.players) near = Math.max(near, nearAlwaysFor(lengthOf(p)));
    for (const f of g.actors.filter((a) => a.controller === 'swarm').slice(0, 20)) {
      const p = g.players[Math.floor(rng() * n)];
      const ang = rng() * Math.PI * 2, far = rng() * 140;
      f.pos = { x: p.pos.x + Math.cos(ang) * far, y: p.pos.y + rng.range(-10, 10), z: p.pos.z + Math.sin(ang) * far };
      // A camera anywhere on the sphere of its widest zoom about any seat.
      const seen = withinSight(g.players, eyes, f);
      for (const q of g.players) for (let k = 0; k < 6; k++) {
        const arm = magnificationDistance(lengthOf(q)) * ZOOM_MAX * rng();
        const a2 = rng() * Math.PI * 2, b2 = rng.range(-1, 1);
        const cx = q.pos.x + Math.cos(a2) * arm * Math.sqrt(1 - b2 * b2), cy = q.pos.y + arm * b2, cz = q.pos.z + Math.sin(a2) * arm * Math.sqrt(1 - b2 * b2);
        const d = Math.max(0.5, Math.hypot(f.pos.x - cx, f.pos.y - cy, f.pos.z - cz));
        if (drawable(d, lengthOf(f) / d, 400, near, true, false)) { draws++; if (!seen) missed++; }
      }
    }
  }
  check('nothing a camera could draw is marked unseen', missed === 0 && draws > 100, `${draws} drawable placements, ${missed} marked unseen`);
}

// ---- a swallowed seat's camera frames the predator ----
{
  const g = new Game('reef', seats(2), 9);
  g.skipHatch();
  const [p, q] = g.players;
  place(q, 3000, -500);
  const big = g.spawn('anomalocaris', 'ambient', { x: 0, y: 0, z: -500 }, 12);
  place(big, 0, -500); place(p, 0, -500);
  p.swallowedBy = big.id;
  const eyes = eyesOf(g);
  check('a swallowed seat sees from the predator\'s distance', eyes[0].arm >= magnificationDistance(lengthOf(big)) - 1e-9, `arm ${eyes[0].arm.toFixed(1)}`);
}

// ---- letting go of a host eases the arm back rather than snapping it ----
{
  const g = new Game('reef', seats(1), 13);
  g.skipHatch();
  const p = g.players[0];
  const host = g.spawn('anomalocaris', 'ambient', { x: 0, y: 0, z: -500 }, 12);
  place(host, 0, -500); place(p, 0, -500);
  const eyes: Eye[] = [];
  p.rideHost = host.id; updateEyes(g.players, (id) => g.byId(id), 1 / 60, eyes);
  const riding = eyes[0].arm;
  p.rideHost = -1; updateEyes(g.players, (id) => g.byId(id), 1 / 60, eyes);
  const after = eyes[0].arm;
  for (let i = 0; i < 180; i++) updateEyes(g.players, (id) => g.byId(id), 1 / 60, eyes);
  check('the arm eases off a host it let go of', after > riding * 0.9 && eyes[0].arm < riding * 0.2 + magnificationDistance(lengthOf(p)), `${riding.toFixed(1)} → ${after.toFixed(1)} → ${eyes[0].arm.toFixed(1)}`);
}

// ---- unseen fish still keep to the sea ----
{
  const g = new Game('reef', seats(1), 17);
  g.skipHatch();
  stepN(g, 60 * 20, { ...emptyInput() });
  const unseen = g.actors.filter((a) => a.unseen);
  const under = unseen.filter((a) => a.pos.y < sampleHeight(a.pos.x, a.pos.z) - 0.05);
  const beached = unseen.filter((a) => shoreDistance(a.pos.x, a.pos.z) < 0);
  check('some fish were out of sight', unseen.length > 0, `${unseen.length} of ${g.actors.length}`);
  check('...and none of them sank into the seabed', under.length === 0, `${under.length} below the floor`);
  check('...or swam up the beach', beached.length === 0, `${beached.length} ashore`);
}

finish('all sight checks passed');
