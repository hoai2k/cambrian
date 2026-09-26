/**
 * The touchscreen scheme, driven by real touches in a real browser.
 *
 * `npm run touch` drives the whole state machine and cannot vouch for any of this: whether the
 * browser reports itself as a touch device at all, whether the page hands the local seat to the
 * glass because of it, whether a `touchstart` on a pad reaches the scheme rather than scrolling the
 * document, whether a tap on the sea is a bite and a tap on a menu button is still that button's.
 * Those are the parts that need a browser, and they are the parts that are here.
 *
 * Run: node tools/touch-browser.mjs   (with a preview server on QA_BASE_URL)
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import assert from 'node:assert/strict';

const exe = process.env.QA_CHROME || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
/**
 * A landscape phone, emulated as one. `hasTouch` is what makes `TouchEvent` exist and
 * `Touch.identifier` mean anything; `isMobile` is what makes the browser answer
 * `(pointer: coarse)` and `(hover: none)`, which is what `touchFirst` actually asks — so both are
 * needed, and the first assertion below is that they worked, because everything after it is
 * meaningless if the page thinks it is on a desktop.
 */
const page = await browser.newPage({ viewport: { width: 780, height: 360 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await silenceCounter(page);
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));

/**
 * Every wait here is on the game's own state or on its frames, never on the clock. Under the
 * software renderer this page draws about a frame a second, so a "300 ms" press can be held across
 * no frames at all and a `waitForTimeout` measures the renderer rather than the game.
 */
const frames = (n) => page.evaluate((k) => new Promise((res) => {
  let i = 0; const tick = () => (++i >= k ? res(i) : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), n);
const settled = () => page.waitForFunction(() => window.__cambrian.game.players[0].state === 'free', null, { timeout: 30000 });

/**
 * Touches, dispatched as real `TouchEvent`s through CDP.
 *
 * `page.touchscreen.tap()` exists and is no use here: it is one finger, down and up, and the whole
 * point of this scheme is several fingers at once with different jobs. So the touch points are
 * driven directly, which is also the only way to hold one pad while swiping with another finger.
 */
const cdp = await page.context().newCDPSession(page);
const send = (type, points) => cdp.send('Input.dispatchTouchEvent', {
  type,
  touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 12, radiusY: 12, force: 1 })),
});
/**
 * A gesture is sent as one **batch**, and this is the single most important line in the file.
 *
 * Chromium stamps a touch event when it *processes* it, and under the software renderer the main
 * thread is busy drawing for the best part of a second at a time. So awaiting the round-trip of
 * `touchStart` before sending `touchEnd` puts a whole frame between them and the scheme — correctly —
 * reads a two-and-a-half-second hold rather than a tap, which is not a tap at all. Queued together
 * they are processed back to back and arrive 1 ms apart, which is what a tap is.
 *
 * This is exactly the trap this repository's other browser harnesses warn about, seen from the other
 * side: there the risk is a press held across *no* frames, here it is a press held across *too many*.
 * Anything with a time threshold in it — a tap, a double-tap — goes through here. A swipe and a pinch
 * do not need to: they are measured in pixels, not seconds, so their moves may be awaited one at a
 * time, and it is better that they are, because then a frame runs between them.
 */
const gesture = (...steps) => Promise.all(steps.map(([type, points]) => send(type, points)));
const tap = (x, y, id) => gesture(['touchStart', [{ x, y, id }]], ['touchEnd', []]);
/** A double-tap whose second finger stays down: the dash, and the pounce. */
const doubleTapDown = (x, y, a, b) => gesture(
  ['touchStart', [{ x, y, id: a }]],
  ['touchEnd', []],
  ['touchStart', [{ x: x + 2, y: y + 1, id: b }]],
);
const touch = send;

/** The state worth asserting about, read straight off the engine. */
const state = () => page.evaluate(() => {
  const e = window.__cambrian, g = e.game, a = g.players[0];
  return {
    state: a.state, moveKind: a.moveKind, aiming: a.aiming, lock: a.lockTarget,
    yaw: a.yaw, camYaw: e.cams?.[0]?.yaw, camPitch: e.cams?.[0]?.pitch, zoom: e.cams?.[0]?.zoom,
    hp: a.hp, stamina: a.stamina, senseMode: a.senseMode, hideMode: a.hideMode,
    usingTouch: e.usingTouch, usingMouse: e.usingMouse,
  };
});

/** Watch the body for one frame-accurate move: an attack is over in a few tenths of a second. */
const watchMove = () => page.evaluate(() => {
  window.__move = undefined;
  const g = window.__cambrian.game, tick = () => {
    const a = g.players[0];
    if (a.state === 'attack' && !window.__move) window.__move = a.moveKind;
    if (!window.__move) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

try {
  // 0. The browser has to *be* a touch device, or nothing below means anything.
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4181/') + 'cambrian/', { waitUntil: 'networkidle', timeout: 120000 });
  const env = await page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,
    hover: matchMedia('(hover: hover)').matches,
    touchEvents: 'ontouchstart' in window,
  }));
  assert.ok(env.coarse, 'the emulated device must report a coarse pointer');
  assert.ok(!env.hover, 'the emulated device must report that it cannot hover');
  assert.ok(env.touchEvents, 'the emulated device must have touch events');

  // 1. The page knows. The shell says so in its own class names, which is what the compact
  //    stylesheet keys on — and 780x360 is compact on its *height*, which is the case the width
  //    threshold deliberately does not catch.
  const shell = await page.locator('main.shell').getAttribute('class');
  assert.match(shell, /is-touch/, `the shell should know it is on glass (got "${shell}")`);
  assert.match(shell, /layout-compact/, `a landscape phone is a compact window (got "${shell}")`);

  // 2. A tap starts the game. A touch player has no Enter key, so if this does not work there is no
  //    way in at all — which is exactly the failure that would never show up in a headless test.
  await tap(390, 200, 1);
  await page.locator('.select').waitFor({ timeout: 60000 });

  // 3. Picking an animal by tapping it seats the *touch* device, not the keyboard: choosing is how
  //    the local seat joins, and which device it joins on is what decides the whole scheme.
  await page.getByRole('option', { name: 'Opabinia', exact: true }).click();
  const device = await page.evaluate(() => document.querySelector('.crew-card') ? true : false);
  assert.ok(device, 'tapping a creature should open a seat');
  await page.locator('.ready-button').first().click();
  await page.getByRole('button', { name: /DIVE IN/ }).click();
  await page.locator('.hud').first().waitFor({ timeout: 90000 });
  await page.waitForFunction(() => !document.body.textContent.includes('Your creature is taking shape'), null, { timeout: 90000 });

  // A built preview has no source modules to import, so the body is settled through the engine's own
  // handle: skip the hatch, lift it clear of the sand and keep it out of anything's way.
  await page.evaluate(() => {
    const e = window.__cambrian, g = e.game, a = g.players[0];
    g.skipHatch(); a.pos.y += 8; a.spawnProtect = 999; a.state = 'free'; a.stamina = a.staminaMax;
    for (const o of g.actors) if (o !== a) o.brain = undefined;
  });
  await frames(3);

  const live = await state();
  assert.equal(live.usingTouch, true, 'the match should be a touch match');
  assert.equal(live.usingMouse, false, 'and the mouse should not also be playing it');

  // 4. The pads are on screen, and they are big enough to hit with a thumb.
  const pads = await page.evaluate(() => Array.from(document.querySelectorAll('[data-touch-zone]')).map((el) => {
    const r = el.getBoundingClientRect();
    return { zone: el.getAttribute('data-touch-zone'), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }));
  const swim = pads.find((p) => p.zone === 'swim');
  const secondary = pads.find((p) => p.zone === 'secondary');
  assert.ok(swim, 'there should be a swim pad');
  assert.ok(secondary, 'there should be a secondary pad');
  for (const p of [swim, secondary]) assert.ok(Math.min(p.w, p.h) >= 44, `${p.zone} is ${p.w}x${p.h}, too small for a thumb`);
  // They are in the bottom left, where the brief put them and where a left thumb rests.
  assert.ok(swim.x < 390 && swim.y > 180, `the swim pad should be bottom-left (at ${swim.x},${swim.y})`);

  // 5. Holding the swim pad swims.
  //
  //    Measured as a *difference* against the same stretch of time with nothing held, because a body
  //    left alone does not hold still — it sinks, it drifts, and a bare "it moved" would pass with the
  //    pad doing nothing at all. What is being checked is that the fingers reach the simulation.
  const travelled = async (hold) => {
    await settled();
    await page.evaluate(() => {
      const a = window.__cambrian.game.players[0];
      a.vel.x = a.vel.y = a.vel.z = 0; a.stamina = a.staminaMax;
    });
    const from = await page.evaluate(() => { const a = window.__cambrian.game.players[0]; return { x: a.pos.x, y: a.pos.y, z: a.pos.z }; });
    if (hold) await touch('touchStart', [{ x: swim.x, y: swim.y, id: 30 }]);
    await frames(12);
    const d = await page.evaluate((b) => {
      const a = window.__cambrian.game.players[0];
      return Math.hypot(a.pos.x - b.x, a.pos.y - b.y, a.pos.z - b.z);
    }, from);
    if (hold) { await touch('touchEnd', []); await frames(2); }
    return d;
  };
  const idle = await travelled(false);
  const held = await travelled(true);
  // The *ratio* is the evidence, with a small absolute floor under it so a run where both came out
  // near zero cannot pass on noise. Not a distance target: how far a body gets in twelve frames
  // depends on the animal, on how many sim steps each frame afforded and on accelerating from rest,
  // and a figure tuned to one machine's frame rate is a figure that fails on the next.
  assert.ok(held > idle * 3 + 0.3, `holding the swim pad should carry the body (${held.toFixed(2)} held against ${idle.toFixed(2)} idle)`);

  // 6. A swipe over the water turns the camera.
  //
  //    Both ways, and that is the point: the follow camera eases the view round behind the body all by
  //    itself, so a single swipe that happened to agree with it would pass whatever the fingers did.
  //    A swipe left and a swipe right have to move the yaw in *opposite* directions, which nothing but
  //    the swipe can do.
  const swipeYaw = async (from, to, id) => {
    await settled();
    const s0 = await state(); const y0 = s0.camYaw, b0 = s0.yaw;
    await touch('touchStart', [{ x: from, y: 180, id }]);
    const step = from < to ? 20 : -20;
    for (let x = from; step > 0 ? x <= to : x >= to; x += step) await touch('touchMove', [{ x, y: 180, id }]);
    await frames(2);
    const s1 = await state(); const y1 = s1.camYaw, b1 = s1.yaw;
    await touch('touchEnd', []);
    await frames(2);
    // Shortest way round, so a swipe across the ±π seam is not read as a swipe most of the way back.
    const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
    swipes.push({ cam: wrap(y1 - y0), body: wrap(b1 - b0) });
    return wrap(y1 - y0);
  };
  const swipes = [];
  const leftward = await swipeYaw(560, 300, 2);
  const rightward = await swipeYaw(220, 480, 3);
  assert.ok(Math.abs(leftward) > 0.15, `a swipe should turn the camera (moved ${leftward.toFixed(3)})`);
  assert.ok(Math.abs(rightward) > 0.15, `and so should one the other way (moved ${rightward.toFixed(3)})`);
  assert.ok(leftward * rightward < 0, `opposite swipes must turn the view opposite ways (${leftward.toFixed(3)} and ${rightward.toFixed(3)})`);
  // ...and the **animal turns with it**, the same way by the same angle. Left to the follow camera the
  // view went round, the body stayed, and the camera then swung back behind it — which read as the
  // creature turning the opposite way from the finger. A body a frame behind its camera is allowed a
  // little slack; one turning the other way, or not at all, is the bug.
  for (const { cam, body } of swipes) {
    assert.ok(cam * body > 0, `the body must turn the same way as the camera (camera ${cam.toFixed(3)}, body ${body.toFixed(3)})`);
    assert.ok(Math.abs(body - cam) < Math.max(0.08, Math.abs(cam) * 0.15), `the body must turn by the camera's angle (camera ${cam.toFixed(3)}, body ${body.toFixed(3)})`);
  }
  assert.equal((await state()).state, 'free', 'a swipe must not attack');

  // 7. A tap on the water is a bite — wherever it lands. Biting at the water ahead of you is a real
  //    move and is how a player attacks something they have not pointed at.
  await settled();
  let bit;
  for (let i = 0; i < 6 && !bit; i++) {
    await watchMove();
    await tap(390, 170, 4);
    await frames(20);
    bit = await page.evaluate(() => window.__move);
    await settled();
  }
  assert.equal(bit, 'light', `a tap bites (got ${bit})`);

  // 8. A double-tap on open water is the dash, and it is the *second* finger that does it — so this
  //    also proves the pair is being recognised as a pair rather than as two taps.
  await settled();
  let dashed = false;
  for (let i = 0; i < 6 && !dashed; i++) {
    await page.evaluate(() => {
      window.__dodge = false;
      const g = window.__cambrian.game, tick = () => {
        if (g.players[0].state === 'dodge') window.__dodge = true;
        if (!window.__dodge) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await doubleTapDown(390, 150, 5, 6);
    await frames(6);
    dashed = await page.evaluate(() => window.__dodge);
    await touch('touchEnd', []);
    await frames(6);
    if (!dashed) await settled();
  }
  assert.ok(dashed, 'a double-tap on open water should dash');

  // 9. The secondary pad. Held on aim it aims; swiped, it becomes something else and *stays* that,
  //    across a release — the choice is meant to outlive the press that made it.
  await settled();
  await touch('touchStart', [{ x: secondary.x, y: secondary.y, id: 6 }]);
  await frames(6);
  assert.equal((await state()).aiming, true, 'the pad set to aim should aim');
  await touch('touchEnd', []);
  await frames(2);

  const labelOf = () => page.locator('.touch-secondary span').innerText();
  const wasLabel = await labelOf();
  await touch('touchStart', [{ x: secondary.x, y: secondary.y, id: 7 }]);
  for (let d = 8; d <= 64; d += 8) await touch('touchMove', [{ x: secondary.x + d, y: secondary.y, id: 7 }]);
  await touch('touchEnd', []);
  await page.waitForFunction((was) => document.querySelector('.touch-secondary span')?.textContent !== was, wasLabel, { timeout: 15000 });
  const nowLabel = await labelOf();
  assert.notEqual(nowLabel, wasLabel, 'swiping the pad should change what it holds');
  assert.equal(nowLabel, 'GUARD', `the ring's next stop after aim is guard (got "${nowLabel}")`);

  // ...and holding it now guards rather than aiming, which is the thing the swap is for.
  await settled();
  await touch('touchStart', [{ x: secondary.x, y: secondary.y, id: 8 }]);
  await frames(10);
  const guarding = await page.evaluate(() => window.__cambrian.game.players[0].state);
  await touch('touchEnd', []);
  assert.equal(guarding, 'guard', `the swapped pad should guard (got "${guarding}")`);

  // 10. Both pads at once plus a swipe with a third finger: the whole reason a touch's job is settled
  //     at its down. This is the multi-touch promise and nothing short of a real browser can check it.
  await settled();
  await page.evaluate(() => { window.__cambrian.game.players[0].stamina = window.__cambrian.game.players[0].staminaMax; });
  const yaw2 = (await state()).camYaw;
  const pos2 = await page.evaluate(() => { const a = window.__cambrian.game.players[0]; return { x: a.pos.x, y: a.pos.y, z: a.pos.z }; });
  await touch('touchStart', [{ x: swim.x, y: swim.y, id: 10 }]);
  await touch('touchStart', [
    { x: swim.x, y: swim.y, id: 10 },
    { x: secondary.x, y: secondary.y, id: 11 },
  ]);
  await touch('touchStart', [
    { x: swim.x, y: swim.y, id: 10 },
    { x: secondary.x, y: secondary.y, id: 11 },
    { x: 560, y: 150, id: 12 },
  ]);
  for (let x = 560; x <= 720; x += 20) {
    await touch('touchMove', [
      { x: swim.x, y: swim.y, id: 10 },
      { x: secondary.x, y: secondary.y, id: 11 },
      { x, y: 150, id: 12 },
    ]);
  }
  await frames(14);
  const together = await page.evaluate((b) => {
    const e = window.__cambrian, a = e.game.players[0];
    return { travel: Math.hypot(a.pos.x - b.x, a.pos.y - b.y, a.pos.z - b.z), state: a.state, camYaw: e.cams[0].yaw };
  }, pos2);
  await touch('touchEnd', []);
  assert.ok(together.travel > 0.5, `the swim pad should still carry the body with three fingers down (moved ${together.travel.toFixed(2)})`);
  assert.ok(Math.abs(together.camYaw - yaw2) > 0.15, 'the third finger should still turn the camera');

  // 11. A pinch zooms, and it zooms the *camera* rather than the page — the page cannot zoom, which is
  //     what `user-scalable=no` on the game entry is for.
  await settled();
  const zoom0 = (await state()).zoom;
  await touch('touchStart', [{ x: 330, y: 180, id: 20 }]);
  await touch('touchStart', [{ x: 330, y: 180, id: 20 }, { x: 450, y: 180, id: 21 }]);
  for (let d = 0; d <= 120; d += 20) {
    await touch('touchMove', [{ x: 330 - d, y: 180, id: 20 }, { x: 450 + d, y: 180, id: 21 }]);
  }
  await frames(4);
  const zoom1 = (await state()).zoom;
  await touch('touchEnd', []);
  assert.ok(Math.abs(zoom1 - zoom0) > 0.02, `a pinch should zoom the camera (${zoom0?.toFixed(3)} → ${zoom1?.toFixed(3)})`);
  assert.ok(zoom1 < zoom0, 'spreading the fingers should zoom in, which is a shorter camera arm');
  assert.equal(await page.evaluate(() => visualViewport?.scale ?? 1), 1, 'the page itself must not zoom');

  // 12. The pause button works, which is the one control that has to: a match a touch player cannot
  //     leave is a trap, and there is no Escape key on a phone.
  await page.locator('.touch-pause').click();
  await page.locator('.panel').waitFor({ timeout: 15000 });
  // ...and the pads stand down while it is up, so a tap aimed at a menu button is that button's.
  assert.equal(await page.locator('.touch-pads').count(), 0, 'the pads should not be drawn over the pause menu');
  // A tap on a real menu button is still that button's: the scheme must never swallow the way out.
  // The pause choices carry `role="menuitem"`, not `button` — which is also worth asserting, because
  // it is what a screen reader walks.
  await page.getByRole('menuitem', { name: 'Resume' }).first().click();
  await page.locator('.hud').first().waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.touch-pads').count(), 1, 'and they come back when the game does');

  assert.deepEqual(errors, [], `the page logged errors: ${errors.join(' · ')}`);
  console.log('PASS: a finger starts the game, swims, looks, bites, dashes, swaps its pad, holds two at once, pinches and pauses');
} catch (e) {
  console.error('FAIL:', e.message);
  console.error(e.stack?.split('\n').slice(0, 6).join('\n'));
  if (errors.length) console.error('page errors:', errors.join(' · '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
