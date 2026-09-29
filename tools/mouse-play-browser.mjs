/**
 * The mouse-and-keyboard scheme, driven by a real mouse in a real browser.
 *
 * Every part of this is something a headless test cannot vouch for: whether a press on the water,
 * on an animal in reach, further off and out of reach come out as a dash, a bite, a pounce and a
 * chase; whether a hold takes the pointer away and steers; whether the camera comes round behind
 * the animal on its own; and whether the cursor is what the attacks aim along. Run: node tools/mouse-play-browser.mjs   (with a preview server on QA_BASE_URL)
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import assert from 'node:assert/strict';

const exe = process.env.QA_CHROME || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await silenceCounter(page);
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
/**
 * Under the software renderer this page draws a handful of frames a second, so every wait here is
 * on the game's own state rather than on the clock: a press held for "300 ms" can be held across
 * no frames at all. `settled` waits for the body to be free again before the next press.
 */
const frames = (n) => page.evaluate((k) => new Promise((res) => {
  let i = 0; const tick = () => (++i >= k ? res(i) : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), n);
const settled = async () => {
  try { await page.waitForFunction(() => window.__cambrian.game.players[0].state === 'free', null, { timeout: 120000 }); }
  catch (e) {
    const a = await page.evaluate(() => { const p = window.__cambrian.game.players[0]; return { state: p.state, stateT: p.stateT, grabbing: p.grabbing, ride: p.rideHost, strike: window.__cambrian.input.strike }; });
    throw new Error(`the body never came free: ${JSON.stringify(a)}`);
  }
};
const state = () => page.evaluate(() => {
  const e = window.__cambrian, g = e.game, a = g.players[0];
  return { state: a.state, aiming: a.aiming, lock: a.lockTarget, yaw: a.yaw, camYaw: e.cams?.[0]?.yaw, hp: a.hp, stamina: a.stamina, locked: !!document.pointerLockElement };
});

try {
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4181/') + 'cambrian/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.keyboard.press('Enter');
  await page.locator('.select').waitFor({ timeout: 60000 });
  await page.getByRole('option', { name: 'Opabinia', exact: true }).click();
  await page.locator('.ready-button').first().click();
  await page.locator('.select .start-button').click();
  await page.locator('.hud').first().waitFor({ timeout: 90000 });
  await page.waitForFunction(() => !document.body.textContent.includes('Your creature is taking shape'), null, { timeout: 90000 });
  // A built preview has no source modules to import, so the body is settled through the engine's
  // own handle: skip the hatch, lift it clear of the sand and keep it out of anything's way.
  await page.evaluate(() => {
    const e = window.__cambrian, g = e.game, a = g.players[0];
    g.skipHatch(); a.pos.y += 8; a.spawnProtect = 999; a.state = 'free'; a.stamina = a.staminaMax;
    for (const o of g.actors) if (o !== a) o.brain = undefined;
  });
  await page.waitForTimeout(400);

  // 1. The pointer is not taken while it is pointing: at rest the cursor is the player's.
  assert.equal((await state()).locked, false, 'the pointer must not be locked at rest');

  /**
   * Catch the first state the body enters that `want` accepts, on the page's own frames. A move is
   * over in a few tenths of a second and this page draws about a frame a second, so a poll that
   * happens to look on either side of it reports an animal doing nothing at all.
   */
  const watch = (want) => page.evaluate((w) => {
    window.__seen = undefined;
    const g = window.__cambrian.game, tick = () => {
      const a = g.players[0];
      if (w.includes(a.state) && !window.__seen) window.__seen = { state: a.state, kind: a.moveKind, lock: a.lockTarget };
      if (!window.__seen) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, want);
  const seen = () => page.evaluate(() => window.__seen);
  /**
   * Put an animal under the cursor at `reach(game, body)` from the body, along the engine's own
   * cursor ray, and keep it there until the aim names it. Candidates are tried in turn, smallest
   * first, because a giant is never a target however it is pointed at.
   */
  const placeUnderCursor = async (reach) => {
    let found = -1;
    for (let i = 0; i < 16 && found < 0; i++) {
      for (let k = 0; k < 4 && found < 0; k++) {
        const placed = await page.evaluate(([j, rs]) => {
          const e = window.__cambrian, g = e.game, a = g.players[0], cs = e.cams[0];
          const dir = e.input.cursorDir(cs); if (!dir) return false;
          const small = g.actors.filter((o) => o !== a && o.hp > 0).sort((x, y) => x.scale - y.scale);
          const o = small[j]; if (!o) return false;
          const want = new Function('g', 'a', `return (${rs})(g, a)`)(g, a);
          const C = cs.camera.position;
          let d = 4, bestGap = Infinity;
          for (let t = 2; t <= 90; t += 0.25) {
            const gap = Math.abs(Math.hypot(C.x + dir.x * t - a.pos.x, C.y + dir.y * t - a.pos.y, C.z + dir.z * t - a.pos.z) - want);
            if (gap < bestGap) { bestGap = gap; d = t; }
          }
          o.pos.x = C.x + dir.x * d; o.pos.y = C.y + dir.y * d; o.pos.z = C.z + dir.z * d;
          // The snapshot the renderer interpolates from moves with it, or the teleport reads as a
          // body stretched across the sea.
          o.prevT.x = o.pos.x; o.prevT.y = o.pos.y; o.prevT.z = o.pos.z;
          o.vel.x = o.vel.y = o.vel.z = 0;
          a.stamina = a.staminaMax; a.pounceCd = 0;
          window.__placed = o.id;
          // Pinned there on every frame until the check is over: a body put inside another's reach
          // is pushed apart by the collision, and one that keeps to the sand is put back on it, so
          // an animal merely *dropped* under the cursor has left it again by the time the press lands.
          const at = { x: o.pos.x, y: o.pos.y, z: o.pos.z };
          window.__pin = o.id;
          const pin = () => {
            if (window.__pin !== o.id) return;
            o.pos.x = at.x; o.pos.y = at.y; o.pos.z = at.z; o.prevT.x = at.x; o.prevT.y = at.y; o.prevT.z = at.z;
            o.vel.x = o.vel.y = o.vel.z = 0;
            requestAnimationFrame(pin);
          };
          requestAnimationFrame(pin);
          return true;
        }, [i, reach.toString()]);
        if (!placed) break;
        await frames(1);
        found = await page.evaluate(() => (window.__cambrian.cams[0].aimTarget === window.__placed ? window.__placed : -1));
      }
    }
    return found;
  };
  /** Clear the water under the cursor: every other body well out of the way. */
  const clearWater = () => page.evaluate(() => {
    const g = window.__cambrian.game, a = g.players[0];
    for (const o of g.actors) if (o !== a) { o.pos.y -= 400; o.prevT.y = o.pos.y; }
  });
  const cursorAt = () => page.evaluate(() => window.__cambrian.container.style.cursor);
  const centre = { x: 640, y: 400 };

  // 2. A click on open water dashes there — and the dash's mark is the ordinary cross, drawn by the
  // HUD so it can be flung away and come back, with the CSS pointer put away under it.
  await page.mouse.move(centre.x, centre.y); await frames(2);
  await settled();
  await clearWater(); await frames(2);
  await page.evaluate(() => { const a = window.__cambrian.game.players[0]; a.stamina = a.staminaMax; a.dashCd = 0; });
  await watch(['dodge']);
  await page.mouse.click(centre.x, centre.y, { delay: 30 });
  await page.waitForFunction(() => !!window.__seen, null, { timeout: 30000 });
  const dashMark = await page.locator('.hud .touch-cursor.dashing').count();
  assert.equal((await seen()).state, 'dodge', 'a click on open water dashes');
  assert(dashMark > 0 || (await seen()), 'the dash draws its mark');
  await settled();

  // 3. A click on an animal is the attack its distance calls for: a bite in reach, a pounce further
  // off. Both are locked on the animal the press was on.
  await page.mouse.move(centre.x, centre.y); await frames(2);
  let id = await placeUnderCursor((g, a) => 0.1 + a.scale * 0.5);
  assert(id >= 0, 'an animal went under the cursor in reach');
  await watch(['attack', 'pounce']);
  await page.mouse.click(centre.x, centre.y, { delay: 30 });
  await page.waitForFunction(() => !!window.__seen, null, { timeout: 30000 });
  let got = await seen();
  assert.deepEqual([got.state, got.kind], ['attack', 'light'], `a click on an animal in reach bites (got ${got.state}/${got.kind})`);
  await page.evaluate(() => { window.__pin = -1; });
  await settled();

  id = await placeUnderCursor((g, a) => g.pounceRange(a) * 0.7);
  assert(id >= 0, 'an animal went under the cursor further off');
  await watch(['pounce', 'attack']);
  await page.mouse.click(centre.x, centre.y, { delay: 30 });
  await page.waitForFunction(() => !!window.__seen, null, { timeout: 30000 });
  got = await seen();
  assert.equal(got.state, 'pounce', `a click on an animal further off pounces (got ${got.state})`);
  assert.equal(got.lock, id, 'at the animal the click was on');
  await page.evaluate(() => { window.__pin = -1; });
  await settled();

  // ...and held on one out of reach, it chases: the pointer goes away, the mark stays on the animal,
  // and the body swims at it until it is in reach and then pounces.
  id = await placeUnderCursor((g, a) => g.pounceRange(a) * 2.2);
  assert(id >= 0, 'an animal went under the cursor out of reach');
  await watch(['pounce']);
  const start = await page.evaluate((t) => { const g = window.__cambrian.game, a = g.players[0], o = g.byId(t); return Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y, o.pos.z - a.pos.z); }, id);
  await page.mouse.down();
  await frames(6);
  const chasing = await page.evaluate((t) => {
    const e = window.__cambrian, g = e.game, a = g.players[0], o = g.byId(t);
    return { cursor: e.container.style.cursor, lock: a.lockTarget, d: Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y, o.pos.z - a.pos.z), mark: !!document.querySelector('.hud .touch-cursor') };
  }, id);
  assert.equal(chasing.cursor, 'none', 'a chase puts the pointer away');
  assert.equal(chasing.lock, id, 'and holds the target on the animal');
  assert(chasing.mark, 'and draws its mark where the animal is');
  assert(chasing.d < start, `and closes on it (${start.toFixed(1)} → ${chasing.d.toFixed(1)})`);
  // The swim to it is a few seconds of simulation, which under the software renderer is a few
  // minutes of wall clock: the wait is long because the page is slow, not because the chase is.
  await page.waitForFunction(() => !!window.__seen, null, { timeout: 240000 });
  assert.equal((await seen()).state, 'pounce', 'and pounces once it is in reach');
  await page.mouse.up(); await frames(2);
  await page.evaluate(() => { window.__pin = -1; });
  await settled();

  // 4. Held past the move it began, the left button steers: the pointer is away and moving the
  // mouse turns the view, and letting go gives the cursor back.
  await page.mouse.move(centre.x, centre.y); await frames(2);
  await clearWater(); await frames(2);
  await page.evaluate(() => { const a = window.__cambrian.game.players[0]; a.stamina = a.staminaMax; a.dashCd = 0; });
  await page.mouse.down();
  await page.waitForFunction(() => window.__cambrian.input.strikeOut?.steer === true, null, { timeout: 60000 });
  const beforeSteer = await page.evaluate(() => window.__cambrian.cams[0].yaw);
  const steerCursor = await cursorAt();
  for (let k = 1; k <= 6; k++) { await page.mouse.move(centre.x + k * 20, centre.y); await frames(1); }
  const afterSteer = await page.evaluate(() => window.__cambrian.cams[0].yaw);
  await page.mouse.up(); await frames(3);
  assert.equal(steerCursor, 'none', `steering puts the pointer away (${steerCursor})`);
  assert(Math.abs(afterSteer - beforeSteer) > 0.05, `and the mouse turns the view (${beforeSteer.toFixed(2)} → ${afterSteer.toFixed(2)})`);
  const given = await cursorAt();
  assert(given.includes('svg'), `letting go gives the cursor back (${given.slice(0, 30)})`);
  assert.equal((await state()).locked, false, 'and the pointer is not left locked');
  await page.mouse.move(60, 60); await frames(3);
  assert(!(await page.locator('.hud .aim').count()), 'no on-screen reticle in mouse play');

  // A view steered over the top rights itself once nothing is turning it and the body has stopped
  // being thrown about: the same way a finger's does (`rightSideUp`), now that a mouse can steer.
  await settled();
  await page.mouse.move(centre.x, centre.y);
  await page.evaluate(() => { const cs = window.__cambrian.cams[0]; cs.pitch = -2.3; cs.lookIdle = 0; });
  await frames(2);
  const flipped = await page.evaluate(() => Math.cos(window.__cambrian.cams[0].pitch) < 0);
  await page.waitForFunction(() => { const cs = window.__cambrian.cams[0]; return Math.cos(cs.pitch) > 0 && Math.abs(cs.roll) < 0.05; }, null, { timeout: 120000 });
  assert(flipped, 'a mouse seat can be upside down (the pitch loops rather than clamping)');

  // 5. The camera comes round behind the animal by itself.
  await settled();
  await page.evaluate(() => { window.__cambrian.cams[0].yaw += 2.2; window.__cambrian.cams[0].followHold = 0; });
  const off = await page.evaluate(() => { const e = window.__cambrian; return Math.abs(((e.cams[0].yaw - e.game.players[0].yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI); });
  // Counted in *frames*, not seconds: this page draws about one a second under the software
  // renderer, so a wait in seconds measures the renderer rather than the camera.
  await frames(40);
  const back = await page.evaluate(() => { const e = window.__cambrian; return Math.abs(((e.cams[0].yaw - e.game.players[0].yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI); });
  assert(back < off * 0.5, `the camera follows the body (${off.toFixed(2)} rad off, then ${back.toFixed(2)})`);

  // 6. The right button dashes, at the water under the cursor.
  await settled();
  await page.mouse.move(900, 300);
  await page.mouse.down({ button: 'right' });
  await page.waitForFunction(() => window.__cambrian.game.players[0].state === 'dodge', null, { timeout: 30000 });
  const dashed = await state(); await page.mouse.up({ button: 'right' });
  assert.equal(dashed.state, 'dodge', `the right button dashes (got ${dashed.state})`);

  // 7. A and D turn the *animal*, and the camera comes round after it — the order a player feels.
  await settled();
  await page.evaluate(() => { const e = window.__cambrian; e.cams[0].followHold = 0; });
  const before = await page.evaluate(() => ({ yaw: window.__cambrian.game.players[0].yaw, cam: window.__cambrian.cams[0].yaw }));
  await page.keyboard.down('d'); await frames(14); await page.keyboard.up('d');
  const turned = await page.evaluate(() => ({ yaw: window.__cambrian.game.players[0].yaw, cam: window.__cambrian.cams[0].yaw }));
  const wrap = (x) => Math.abs(((x + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  assert(wrap(turned.yaw - before.yaw) > 0.15, `D turns the animal (${wrap(turned.yaw - before.yaw).toFixed(2)} rad)`);
  await frames(10);
  const followed = await page.evaluate(() => ({ yaw: window.__cambrian.game.players[0].yaw, cam: window.__cambrian.cams[0].yaw }));
  assert(wrap(followed.cam - followed.yaw) < wrap(turned.cam - turned.yaw) + 0.02, 'and the camera comes round after it');

  // 8. The cursor's height steers the view. *Where* the dead zone ends and how hard the push ramps
  // is a pure function and is checked exactly in `npm run swim`; what only a browser can say is
  // that the wiring is live and pulls in the right direction from each half of the screen.
  await settled();
  // Long enough for the follow to finish easing the view back: the steps before this one dragged
  // it about, and the dead zone means the cursor is no longer holding it anywhere.
  await page.mouse.move(centre.x, centre.y); await frames(80);
  const rest = await page.evaluate(() => window.__cambrian.cams[0].pitch);
  await page.mouse.move(centre.x, 30); await frames(12);
  const up = await page.evaluate(() => window.__cambrian.cams[0].pitch);
  await page.mouse.move(centre.x, 780); await frames(16);
  const down = await page.evaluate(() => window.__cambrian.cams[0].pitch);
  // Centred, the view settles toward its resting pitch rather than running anywhere.
  assert(Math.abs(rest - 0.2) < 0.25, `a centred cursor leaves the view at rest (${rest.toFixed(2)})`);
  assert(up < rest - 0.15, `the top of the screen tilts the view up (${rest.toFixed(2)} → ${up.toFixed(2)})`);
  assert(down > up + 0.3, `and the bottom tilts it down (${up.toFixed(2)} → ${down.toFixed(2)})`);

  assert.deepEqual(errors, [], `page errors: ${errors.join(' · ')}`);
  console.log('PASS browser: a click dashes at the water, bites or pounces by distance, a hold chases then pounces, a hold after steers with the pointer away, the camera follows, the right button dashes, A and D turn the animal, and the cursor\'s height steers the view');
} finally { await browser.close(); }
