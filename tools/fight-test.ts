/** Fight balance: peers take a couple of hits, giants take three to kill you, you can rout a giant, and being killed by a giant swallows you. */
import { CORPSE_WINDOW, Game } from '../src/sim/game';
import { emptyInput, type InputFrame } from '../src/sim/types';
import { isAlive, lengthOf, bandOf } from '../src/sim/actors';
import { makeBrain } from '../src/sim/ai';
let failed = 0;
const check = (n: string, ok: boolean, d: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(46)} ${d}`); if (!ok) failed++; };
const run = (g: Game, f: InputFrame, steps: number, extra?: (i: number) => void) => { const m = new Map([[0, f]]); for (let i = 0; i < steps; i++) { extra?.(i); g.step(1 / 60, m); g.events.length = 0; } };
const fresh = (seed = 5) => { const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }], seed); const p = g.players[0]; p.pos = { x: 60, y: 6, z: -30 }; p.spawnProtect = 0; p.yaw = 0; return { g, p }; };

// --- giant bites needed to kill an adult ---
{
  const { g, p } = fresh();
  const giant = g.spawn('anomalocaris', 'giant', { x: 60, y: 6, z: -27 }, 3.5); giant.brain = makeBrain('giant', giant.pos, g.rng);
  let bites = 0; const hp0 = p.hp;
  const m = new Map([[0, emptyInput()]]);
  for (let i = 0; i < 60 * 30 && isAlive(p); i++) {
    giant.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z - lengthOf(giant) * 0.5 }; giant.yaw = 0; giant.brain!.goal = 'hunt'; giant.brain!.target = p.id; giant.brain!.detection.set(p.id, 3); giant.brain!.hunger = 999; giant.brain!.courage = 1;
    g.step(1 / 60, m);
    for (const e of g.events) if (e.kind === 'hit' && e.actor === giant.id && e.other === p.id) bites++;
    g.events.length = 0;
  }
  check('giant kills an adult in about 3 bites', bites >= 2 && bites <= 4, `bites=${bites} hp0=${hp0} hpMax=${p.hpMax} state=${p.state}`);
  check('killed by a giant = swallowed, not a plain corpse', p.state === 'swallowed' || (p.state === 'dead' && p.eaten >= 1) || p.hatching, `state=${p.state}`);
  run(g, emptyInput(), 60 * (CORPSE_WINDOW + 2));
  check('...and the player respawns afterwards', isAlive(p) && g.actors.includes(p), `state=${p.state}`);
}
// --- peer prey: a couple of hits ---
{
  const { g, p } = fresh(8);
  const prey = g.spawn('waptia', 'ambient', { x: 60, y: 6, z: -30 + lengthOf(p) * 0.5 }, 0.8);   // ~0.55 of an adult anomalocaris: prey band
  prey.brain = makeBrain('needs', prey.pos, g.rng);
  console.log(`   prey band=${bandOf(p, prey)} preyHp=${prey.hpMax}`);
  let bites = 0;
  for (let i = 0; i < 60 * 12 && isAlive(prey); i++) {
    prey.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.45 }; prey.vel = { x: 0, y: 0, z: 0 };
    const f = { ...emptyInput(), light: i % 20 < 2 };
    g.step(1 / 60, new Map([[0, f]]));
    for (const e of g.events) if (e.kind === 'hit' && e.actor === p.id) bites++;
    g.events.length = 0;
  }
  check('slightly smaller prey dies in 1-3 bites', !isAlive(prey) && bites >= 1 && bites <= 3, `bites=${bites} alive=${isAlive(prey)}`);
}
// --- routing a giant: bite it enough and it runs ---
{
  const { g, p } = fresh(11);
  const giant = g.spawn('anomalocaris', 'giant', { x: 60, y: 6, z: -30 + lengthOf(p) * 0.5 }, 3.5); giant.brain = makeBrain('giant', giant.pos, g.rng); giant.brain!.goal = 'notice';
  let bites = 0, routedAt = -1;
  for (let i = 0; i < 60 * 25; i++) {
    if (giant.brain!.goal !== 'flee') { giant.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.5 }; giant.vel = { x: 0, y: 0, z: 0 }; giant.brain!.goal = 'notice'; }
    p.hp = p.hpMax;
    const f = { ...emptyInput(), light: i % 20 < 2 };
    g.step(1 / 60, new Map([[0, f]]));
    for (const e of g.events) { if (e.kind === 'hit' && e.actor === p.id) bites++; if (e.kind === 'routed' && routedAt < 0) routedAt = bites; }
    g.events.length = 0;
    if (giant.brain!.goal === 'flee') break;
  }
  check('a giant breaks off after 4-10 bites', giant.brain!.goal === 'flee' && routedAt >= 4 && routedAt <= 10, `routed after ${routedAt} bites, goal=${giant.brain!.goal}, giant hp ${Math.round(giant.hp)}/${giant.hpMax}`);
}
// --- animals answer for themselves ---
{
  /**
   * Bite something and it fights you or it runs; what it must never do is neither. Two ways that
   * used to happen: an animal struck by something much smaller picked `fight`, failed the fight
   * case's "is this a peer" test on the next tick and wandered off; and the courage rule, which
   * costs a fixed fraction of health however small the thing biting you is, routed a big animal
   * in three bites from a minnow — and a routed animal never answers at all.
   */
  const bite = (npcScale: number, playerScale: number, seconds: number) => {
    const { g, p } = fresh(17);
    p.scale = playerScale; p.stamina = p.staminaMax;
    const npc = g.spawn('anomalocaris', 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + lengthOf(p) * 0.45 }, npcScale);
    npc.brain = makeBrain('needs', { ...npc.pos }, g.rng);
    let bitBack = 0, swung = 0, fought = 0, frames = 0;
    let wasAttacking = false;
    for (let i = 0; i < 60 * seconds && isAlive(npc); i++) {
      p.pos = { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z - lengthOf(p) * 0.45 };
      p.vel = { x: 0, y: 0, z: 0 }; p.yaw = 0; p.hp = p.hpMax; p.stamina = p.staminaMax;
      npc.hp = Math.max(npc.hp, npc.hpMax * 0.6);      // keep it on its feet: what it *decides* is the test
      g.step(1 / 60, new Map([[0, { ...emptyInput(), light: i % 40 < 2 }]]));
      for (const e of g.events) if (e.kind === 'hit' && e.actor === npc.id && e.other === p.id) bitBack++;
      g.events.length = 0;
      // Whether the bite connects depends on where the rig pins the player; whether the animal
      // swings at all is the behaviour under test.
      const attacking = npc.state === 'attack' || npc.state === 'pounce';
      if (attacking && !wasAttacking) swung++;
      wasAttacking = attacking;
      frames++; if (npc.brain!.goal === 'fight') fought++;
    }
    return { bitBack, swung, fight: fought / Math.max(1, frames), band: bandOf(npc, p) };
  };
  const tiny = bite(3.5, 0.5, 12);
  check('something far smaller biting you is answered, not ignored', tiny.band === 'snack' && tiny.fight > 0.4 && tiny.swung > 0, `player reads as ${tiny.band}; fighting ${(tiny.fight * 100).toFixed(0)}% of the time, swung ${tiny.swung}×`);
  const peer = bite(1, 1, 12);
  check('...and so is a peer', peer.fight > 0.4 && peer.swung > 0 && peer.bitBack > 0, `fighting ${(peer.fight * 100).toFixed(0)}% of the time, swung ${peer.swung}×, bit back ${peer.bitBack}×`);
}

// --- regen ---
{
  const { g, p } = fresh(2);
  p.hp = p.hpMax * 0.3; p.sinceHit = 0;
  run(g, emptyInput(), 60 * 5); const at5 = p.hp;
  run(g, emptyInput(), 60 * 15); const at20 = p.hp;
  check('health regenerates after 6 s out of the fight', at5 <= p.hpMax * 0.31 && at20 > p.hpMax * 0.6, `5s=${Math.round(at5)} 20s=${Math.round(at20)} / ${p.hpMax}`);
}
// --- the pounce lands without aiming ---
{
  // Not holding LT is the common case, and the pounce has to pick and keep its own target: it
  // homes on `lockTarget`, so a press that found prey itself used to enter the state, find nothing
  // to home on, and drop straight back out having spent the stamina and the cooldown on nothing.
  const { g, p } = fresh(24);
  p.scale = 1; p.stamina = p.staminaMax; p.yaw = 0;
  const prey = g.spawn('waptia', 'ambient', { x: p.pos.x, y: p.pos.y, z: p.pos.z + 5 }, 0.5);
  prey.hp = prey.hpMax = 400;
  const before = prey.hp;
  run(g, { ...emptyInput(), heavy: true }, 1, () => { prey.vel = { x: 0, y: 0, z: 0 }; });
  check('RT without aiming starts a pounce at what is ahead', p.state === 'pounce' && p.lockTarget === prey.id, `state=${p.state} lock=${p.lockTarget}`);
  run(g, emptyInput(), 40, () => { prey.vel = { x: 0, y: 0, z: 0 }; });
  check('...and the pounce reaches it and lands', prey.hp < before, `prey ${before} -> ${Math.round(prey.hp)}`);
}

// --- the charge: RT while sprinting or mid-dash, aimed along the line of travel ---
{
  // Something off the nose but square on the line the body is travelling: a standing pounce, which
  // measures a cone off the heading, will not take it; a charge should.
  const setup = () => {
    const { g, p } = fresh(21);
    p.scale = 1; p.stamina = p.staminaMax; p.pounceCd = 0; p.exhausted = 0;
    p.yaw = 0;                                     // nose on +z
    p.vel = { x: 9, y: 0, z: 2 };                  // but travelling almost straight along +x
    const prey = g.spawn('waptia', 'ambient', { x: p.pos.x + 5, y: p.pos.y, z: p.pos.z + 1.1 }, 0.5);
    prey.hp = prey.hpMax = 400;
    return { g, p, prey };
  };
  {
    const { g, p, prey } = setup();
    const before = p.stamina;
    run(g, { ...emptyInput(), heavy: true }, 1);
    check('a standing press ignores what is off the nose', p.lockTarget !== prey.id, `state=${p.state} lock=${p.lockTarget} prey=${prey.id}`);
    const standing = before - p.stamina;
    const { g: g2, p: p2, prey: prey2 } = setup();
    const before2 = p2.stamina;
    run(g2, { ...emptyInput(), heavy: true, burst: 1 }, 1);
    check('sprinting, RT charges what is on the line of travel', p2.state === 'pounce' && p2.lockTarget === prey2.id, `state=${p2.state} lock=${p2.lockTarget} prey=${prey2.id}`);
    check('...and costs more stamina than the same press standing', before2 - p2.stamina > standing, `${(before2 - p2.stamina).toFixed(0)} vs ${standing.toFixed(0)}`);
  }
  {
    // Mid-dash, RT cancels the dash into the same move and gives up the invulnerability.
    const { g, p, prey } = setup();
    run(g, { ...emptyInput(), dash: true, mx: -1 }, 1);   // right is -x at yaw 0, so this dashes toward the prey
    check('LB dashes', p.state === 'dodge' && p.iframes > 0, `state=${p.state} iframes=${p.iframes.toFixed(2)}`);
    run(g, { ...emptyInput(), heavy: true }, 1);
    check('...and RT out of it charges what is on the line', p.state === 'pounce' && p.lockTarget === prey.id, `state=${p.state} lock=${p.lockTarget} prey=${prey.id}`);
    check('...giving up what was left of the invulnerability', p.iframes === 0, `iframes=${p.iframes.toFixed(2)}`);
  }
  {
    // Exhausted, a charge is simply not affordable, and the dash runs its course.
    const { g, p } = setup();
    run(g, { ...emptyInput(), dash: true, mx: -1 }, 1);
    p.stamina = 2;
    run(g, { ...emptyInput(), heavy: true }, 1);
    check('a charge nobody can pay for leaves the dash alone', p.state === 'dodge' && p.iframes > 0, `state=${p.state}`);
  }
}

// --- close attacks turn onto what they are nearly pointing at, a little ---
{
  const off = (yawTo: number) => {
    const { g, p } = fresh(22);
    p.yaw = 0; p.vel = { x: 0, y: 0, z: 0 }; p.stamina = p.staminaMax;
    const d = lengthOf(p) * 1.2;
    const prey = g.spawn('waptia', 'ambient', { x: p.pos.x + Math.sin(yawTo) * d, y: p.pos.y, z: p.pos.z + Math.cos(yawTo) * d }, 1);
    prey.hp = prey.hpMax = 400; prey.vel = { x: 0, y: 0, z: 0 };
    run(g, { ...emptyInput(), light: true }, 1);
    return { g, p, prey };
  };
  const small = off(0.25);
  check('a bite turns onto prey a few degrees off', small.p.yaw > 0.1, `yaw=${small.p.yaw.toFixed(2)} (target 0.25)`);
  check('...without overshooting it', small.p.yaw <= 0.25 + 1e-6, `yaw=${small.p.yaw.toFixed(2)}`);
  const wide = off(0.6);
  check('the turn is a nudge, not a swing', wide.p.yaw <= 0.4 + 1e-6 && wide.p.yaw > 0.3, `yaw=${wide.p.yaw.toFixed(2)} (target 0.6, cap 0.4)`);
  const behind = off(1.4);
  check('and it never reaches for what is off to the side', Math.abs(behind.p.yaw) < 0.02, `yaw=${behind.p.yaw.toFixed(3)} (target 1.4, cone 63\u00b0)`);
  {
    // Never onto another player: who you attack stays your decision.
    const g = new Game('reef', [{ creature: 'anomalocaris', device: 'keyboard', ready: true }, { creature: 'waptia', device: 'keyboard2', ready: true }], 23);
    const [p, other] = g.players;
    p.pos = { x: 60, y: 6, z: -30 }; p.yaw = 0; p.vel = { x: 0, y: 0, z: 0 }; p.spawnProtect = 0; p.stamina = p.staminaMax;
    const d = lengthOf(p) * 1.2;
    other.pos = { x: p.pos.x + Math.sin(0.3) * d, y: p.pos.y, z: p.pos.z + Math.cos(0.3) * d }; other.vel = { x: 0, y: 0, z: 0 };
    const m = new Map([[0, { ...emptyInput(), light: true }], [1, emptyInput()]]);
    g.step(1 / 60, m);
    check('a bite never turns onto another player', Math.abs(p.yaw) < 0.02, `yaw=${p.yaw.toFixed(3)}`);
  }
  // --- and it aims up and down, not only round ---
  // The nudge only ever moved yaw, so a bite lined up perfectly in the horizontal was still off
  // by the whole elevation: prey a body length above sat 45° off the aim after the nudge had run.
  const upDown = (elev: number) => {
    const { g, p } = fresh(24);
    p.yaw = 0; p.pitch = 0; p.vel = { x: 0, y: 0, z: 0 }; p.stamina = p.staminaMax;
    const d = lengthOf(p) * 1.2, yawTo = 0.18;
    const prey = g.spawn('waptia', 'ambient', {
      x: p.pos.x + Math.sin(yawTo) * d * Math.cos(elev),
      y: p.pos.y + d * Math.sin(elev),
      z: p.pos.z + Math.cos(yawTo) * d * Math.cos(elev),
    }, 1);
    prey.hp = prey.hpMax = 400; prey.vel = { x: 0, y: 0, z: 0 };
    g.hash.rebuild(g.actors);
    run(g, { ...emptyInput(), light: true }, 1);
    // How far off the body's own aim the prey ended up.
    const cp = Math.cos(p.pitch);
    const aim = { x: Math.sin(p.yaw) * cp, y: -Math.sin(p.pitch), z: Math.cos(p.yaw) * cp };
    const to = { x: prey.pos.x - p.pos.x, y: prey.pos.y - p.pos.y, z: prey.pos.z - p.pos.z };
    const tl = Math.hypot(to.x, to.y, to.z);
    return Math.acos(Math.max(-1, Math.min(1, (aim.x * to.x + aim.y * to.y + aim.z * to.z) / tl)));
  };
  const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0);
  for (const e of [-0.8, -0.5, 0.5]) {
    const err = upDown(e);
    check(`a bite aims at prey ${deg(-e)}\u00b0 above it`, err < 0.2, `${deg(err)}\u00b0 off the aim (was ${deg(Math.abs(e))}\u00b0)`);
  }
  {
    // Capped like the yaw is: it will not fold the animal in half to reach something overhead.
    const steep = upDown(-1.5);
    check('...but the nose only goes so far up', steep > 0.2, `${deg(steep)}\u00b0 off the aim at 86\u00b0 overhead`);
  }
}

console.log(failed ? `\n${failed} FAILED` : '\nall fight tests passed'); process.exit(failed ? 1 : 0);
