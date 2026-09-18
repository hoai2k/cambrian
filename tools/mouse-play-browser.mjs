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
  await page.mouse.click(centre.x, centre.y, { delay: 40 });
  await page.waitForFunction(() => window.__cambrian.game.players[0].state === 'attack', null, { timeout: 30000 });
  const bit = await page.evaluate(() => window.__cambrian.game.players[0].moveKind);
  assert.equal(bit, 'light', `a click bites (got ${bit})`);
  await settled();

  // ...and a hold is the heavy — but **only over something**. The cursor is walked until the engine
  // says it has a target (any animal will do; what is being checked is that the same button, held
  // on something rather than clicked, reaches the heavy branch instead of the bite), because a hold
  // over open water is the camera and nothing else.
  let found = false;
  for (let i = 0; i < 48 && !found; i++) {
    await page.mouse.move(centre.x + ((i % 8) - 4) * 80, centre.y + (Math.floor(i / 8) - 3) * 60);
    await frames(1);
    found = await page.evaluate(() => window.__cambrian.cams[0].aimTarget >= 0);
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

  assert.deepEqual(errors, [], `page errors: ${errors.join(' · ')}`);
  console.log('PASS browser: no pointer lock, click bites, hold is the heavy, the camera follows, a press over nothing looks, the right button dashes, and the cursor is the crosshair');
} finally { await browser.close(); }
