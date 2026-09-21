/**
 * The mouse-and-keyboard scheme, driven by a real mouse in a real browser.
 *
 * Every part of this is something a headless test cannot vouch for: whether the pointer is taken,
 * whether a click and a hold on the same button come out as two different attacks, whether the
 * camera comes round behind the animal on its own, and whether the cursor is what the attacks aim
 * along. Run: node tools/mouse-play-browser.mjs   (with a preview server on QA_BASE_URL)
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
const settled = () => page.waitForFunction(() => window.__cambrian.game.players[0].state === 'free', null, { timeout: 30000 });
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
  await page.getByRole('button', { name: /DIVE IN/ }).click();
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

  // 1. The pointer is never taken: the cursor stays the player's.
  assert.equal((await state()).locked, false, 'the pointer must not be locked');

  // 2. A click is a bite — wherever it lands. Biting at the water ahead of you is a real move.
  const centre = { x: 640, y: 400 };
  await page.mouse.move(centre.x, centre.y);
  // The attack is caught by a watcher on the page's own frames rather than by polling for it: a
  // bite is over in a few tenths of a second, and a poll that happens to look on either side of it
  // reports an animal doing nothing at all. The click itself is repeated for the same reason —
  // whatever else the body is in the middle of when the first one lands, it is free by the next.
  await settled();
  let bit;
  for (let i = 0; i < 5 && !bit; i++) {
    await page.evaluate(() => {
      window.__bite = undefined;
      const g = window.__cambrian.game, tick = () => {
        const a = g.players[0];
        if (a.state === 'attack' && !window.__bite) window.__bite = a.moveKind;
        if (!window.__bite) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.click(centre.x, centre.y, { delay: 40 });
    await frames(20);
    bit = await page.evaluate(() => window.__bite);
    await settled();
  }
  assert.equal(bit, 'light', `a click bites (got ${bit})`);

  // ...and a hold is the heavy — but **only over something**, because a hold over open water is the
  // camera and nothing else. Any animal will do: what is being checked is that the same button,
  // held on something rather than clicked, reaches the heavy branch instead of the bite.
  // An animal is *put* under the cursor rather than hunted for by sweeping the screen: the cursor
  // now steers the view outside its dead zone, so a search that wandered up the screen would be
  // tilting the camera while it looked and would never settle. The engine's own cursor ray is what
  // decides a target, so the body goes on that ray — and candidates are tried in turn because a
  // giant is never a target whatever it is pointed at.
  await page.mouse.move(centre.x, centre.y);
  await frames(2);
  let found = false;
  for (let i = 0; i < 16 && !found; i++) {
    // Each candidate is *held* on the ray for a few frames rather than dropped there once: a body
    // the sim puts back where it belongs (anything that keeps to the sand, say) would otherwise
    // have left before the aim was read, and an animal too big to be a target is never one however
    // well it is placed — so the next one is tried.
    for (let k = 0; k < 4 && !found; k++) {
      const placed = await page.evaluate((j) => {
        const e = window.__cambrian, g = e.game, a = g.players[0], cs = e.cams[0];
        const dir = e.cursorDir(cs); if (!dir) return false;
        const small = g.actors.filter((o) => o !== a && o.hp > 0).sort((x, y) => x.scale - y.scale);
        const o = small[j]; if (!o) return false;
        // Far enough along the ray to be in front of the animal and near enough to be *pounceable*:
        // the aim cone reaches well past the pounce, so a body placed at the edge of what the cursor
        // can name is a target the heavy would refuse.
        const want = g.pounceRange(a) * 0.6;
        const C = cs.camera.position;
        let d = 4, bestGap = Infinity;
        for (let t = 2; t <= 44; t += 0.5) {
          const gap = Math.abs(Math.hypot(C.x + dir.x * t - a.pos.x, C.y + dir.y * t - a.pos.y, C.z + dir.z * t - a.pos.z) - want);
          if (gap < bestGap) { bestGap = gap; d = t; }
        }
        o.pos.x = C.x + dir.x * d; o.pos.y = C.y + dir.y * d; o.pos.z = C.z + dir.z * d;
        // The snapshot the renderer interpolates from moves with it: a teleport that left it behind
        // reads as a body stretched across the sea, and clearing it outright breaks the frame.
        o.prevT.x = o.pos.x; o.prevT.y = o.pos.y; o.prevT.z = o.pos.z;
        o.vel.x = o.vel.y = o.vel.z = 0;
        a.stamina = a.staminaMax;
        return true;
      }, i);
      if (!placed) break;
      await frames(1);
      found = await page.evaluate(() => window.__cambrian.cams[0].aimTarget >= 0);
    }
  }
  assert(found, 'the cursor found an animal to hold on');
  await page.mouse.down();
  // Whatever *this* animal's heavy is: a pounce, a lunge, or its own special.
  await page.waitForFunction(() => ['pounce', 'ability'].includes(window.__cambrian.game.players[0].state)
    || (window.__cambrian.game.players[0].state === 'attack' && window.__cambrian.game.players[0].moveKind === 'heavy'), null, { timeout: 30000 });
  const held = await state(); await page.mouse.up();
  assert(['attack', 'pounce', 'ability'].includes(held.state), `a hold on a target is the heavy (got ${held.state})`);
  await settled();

  // 3. The cursor is the crosshair, and the on-screen reticle is gone with it: two crosshairs on
  // one screen, one of them nailed to the middle, is worse than either alone. *Which* drawing goes
  // with which state is a pure mapping and is checked properly in `npm run cursors`; what only a
  // browser can say is that the page is actually wearing one.
  const cursorAt = () => page.evaluate(() => window.__cambrian.container.style.cursor);
  await page.mouse.move(60, 60); await frames(3);
  const idle = await cursorAt();
  assert(idle.includes('svg'), `the cursor is drawn for the match (${idle.slice(0, 40)})`);
  assert(!(await page.locator('.hud .aim').count()), 'no on-screen reticle in mouse play');

  // 4. A press over nothing turns the camera from the first pixel, and is not an attack. This is
  // the rule that makes one button unambiguous: what it does is decided by what you pointed it at.
  await settled();
  const beforeLook = await page.evaluate(() => window.__cambrian.cams[0].yaw);
  await page.mouse.down(); await page.mouse.move(130, 60); await frames(2);
  const looking = await cursorAt();
  await page.mouse.up(); await frames(2);
  const afterLook = await page.evaluate(() => ({ yaw: window.__cambrian.cams[0].yaw, state: window.__cambrian.game.players[0].state }));
  assert.equal(looking, 'grabbing', `a press over nothing looks around (${looking})`);
  assert(Math.abs(afterLook.yaw - beforeLook) > 0.02, 'and it turns the camera from the first pixel');
  assert.equal(afterLook.state, 'free', 'and it is not an attack');

  // 3. The camera comes round behind the animal by itself.
  await settled();
  await page.evaluate(() => { window.__cambrian.cams[0].yaw += 2.2; window.__cambrian.cams[0].followHold = 0; });
  const off = await page.evaluate(() => { const e = window.__cambrian; return Math.abs(((e.cams[0].yaw - e.game.players[0].yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI); });
  // Counted in *frames*, not seconds: this page draws about one a second under the software
  // renderer, so a wait in seconds measures the renderer rather than the camera.
  await frames(40);
  const back = await page.evaluate(() => { const e = window.__cambrian; return Math.abs(((e.cams[0].yaw - e.game.players[0].yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI); });
  assert(back < off * 0.5, `the camera follows the body (${off.toFixed(2)} rad off, then ${back.toFixed(2)})`);

  // 5. The right button dashes, at the water under the cursor.
  await settled();
  await page.mouse.move(900, 300);
  await page.mouse.down({ button: 'right' });
  await page.waitForFunction(() => window.__cambrian.game.players[0].state === 'dodge', null, { timeout: 30000 });
  const dashed = await state(); await page.mouse.up({ button: 'right' });
  assert.equal(dashed.state, 'dodge', `the right button dashes (got ${dashed.state})`);

  // 6. A and D turn the *animal*, and the camera comes round after it — the order a player feels.
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

  // 7. The cursor's height steers the view. *Where* the dead zone ends and how hard the push ramps
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
  console.log('PASS browser: no pointer lock, click bites, hold is the heavy, the camera follows, a press over nothing looks, the right button dashes, the cursor is the crosshair, A and D turn the animal, and its height steers the view');
} finally { await browser.close(); }
