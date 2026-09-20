/**
 * Does a body walking on the beach actually leave prints on screen?
 *
 * `npm run tracks` holds the decisions — which body leaves which mark, when a contact marks, what
 * ground takes one, how long it lasts — because those are pure. This is the half that cannot be
 * held headless: the engine finding a rig's contacts in its *drawn* pose frame by frame, the sand
 * under each one, and marks reaching the instanced buffer — none of which exists without a real
 * rig, a real seabed and a real frame.
 *
 * Run it against a preview build:
 *   npm run build && npx vite preview --port 4181 --strictPort &
 *   node tools/tracks-browser.mjs
 *
 * **Everything here waits on the game's own state and frames, never on the clock.** Under the
 * software renderer this page draws about a frame a second and the engine clamps `dt` to 0.08 s,
 * so a wall-clock minute is about five seconds of walking. The body is put on the beach by hand
 * rather than swum there for that reason, and every watcher is armed before the thing it watches.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4181/devonian/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**gc.zgo.at/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.addInitScript(() => localStorage.setItem('devonian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('.title').waitFor({ timeout: 180000 });
  await page.locator('.title').click({ force: true });
  await page.locator('.select').waitFor({ timeout: 180000 });
  // Tiktaalik: legs and lungs, so it walks up the beach and prints rather than flopping.
  // Forced clicks: this page draws about a frame a second, so the menu's own animations never
  // settle inside Playwright's stability check and an ordinary click times out waiting for them.
  await page.getByRole('option', { name: /Tiktaalik/ }).first().click({ force: true });
  await page.locator('.ready-button').first().click({ force: true });
  await page.locator('.start-button:not([disabled])').last().click({ force: true, timeout: 180000 });
  await page.locator('.hud').first().waitFor({ timeout: 180000 });
  await page.waitForFunction(() => !document.body.textContent.includes('taking shape'), null, { timeout: 180000 });
  await page.evaluate(() => {
    const g = window.__cambrian.game, a = g.players[0];
    g.skipHatch?.();
    a.spawnProtect = 999; a.state = 'free'; a.stamina = a.staminaMax;
    g.actors.forEach((o) => { if (o !== a) o.brain = undefined; });
  });

  const read = () => page.evaluate(() => {
    const e = window.__cambrian, a = e.game.players[0];
    return { prints: e.tracks.count, wade: a.wade, ashore: a.ashore, z: a.pos.z, y: a.pos.y };
  });
  const afloat = await read();
  assert.equal(afloat.prints, 0, 'a body still in the water has printed nothing');
  assert.equal(afloat.wade, 0, 'and it is nowhere near the beach yet');
  console.log('afloat:', afloat);

  // Up the beach by hand, and *stopped* the moment the sand has it: swimming there would take the
  // best part of an hour of wall clock at a frame a second, and the walk up is `npm run beach`'s
  // business in any case — what is being asked here is what the renderer does once a body is
  // standing on sand. Inland is +z, in small steps near the water so it stops on the beach rather
  // than somewhere out on the flat land behind it, where no body can go and no print belongs.
  await page.waitForFunction(() => {
    const a = window.__cambrian.game.players[0];
    if (a.ashore) return true;
    a.pos.z += a.wade > 0 ? 0.4 : 2;
    a.prevT.z = a.pos.z;
    return false;
  }, null, { timeout: 300000, polling: 120 });
  // And then back off to the water's edge. The wade crosses its whole range inside a couple of
  // units of a small body, so a step in lands on the flat top of the beach every time — and the
  // top is flat in all three eras, which would leave the one thing only a real beach can show
  // (that a mark lies along the ramp rather than standing out of it) untested. In eighths of a
  // unit, because a quarter of one is most of this body's whole wade and overshoots the beach
  // back into the sea.
  await page.waitForFunction(() => {
    const a = window.__cambrian.game.players[0];
    a.vel.x = 0; a.vel.y = 0; a.vel.z = 0;          // or what is left of the shove carries it on
    const nudge = a.wade > 0.75 ? -0.06 : a.wade < 0.5 ? 0.06 : 0;
    if (nudge) { a.pos.z += nudge; a.prevT.z = a.pos.z; window.__trackSteady = 0; return false; }
    // Held in the band for a few frames rather than caught crossing it, because the body goes on
    // drifting between two of this page's frames and a single reading is not where it settles.
    window.__trackSteady = (window.__trackSteady ?? 0) + 1;
    return window.__trackSteady >= 3;
  }, null, { timeout: 300000, polling: 120 });
  const arrived = await read();
  console.log('on the sand:', arrived);
  assert.ok(arrived.ashore, 'the body is on the beach at the water\'s edge');

  // The first contact to come down prints where it lands, so the marks arrive within a frame.
  await page.waitForFunction(() => window.__cambrian.tracks.count > 0, null, { timeout: 180000, polling: 120 });
  const first = await read();
  console.log('landed:', first, '— the feet printed where they came down');

  // And walking lays more: every contact that travels a spacing marks again, and every foot that
  // comes down again prints where it lands. Held for a long time because a wall-clock second is
  // about a twelfth of a second of walking under this renderer.
  //
  // **X, not W.** The keys are relative to the camera and the camera sits behind the body, which
  // spawned facing out to sea — so forward walks it back into the water, off the sand and out of
  // the subject. Back walks it up the beach, which is the direction a print belongs in.
  await page.evaluate(() => document.activeElement?.blur());
  const walked = page.waitForFunction((n) => window.__cambrian.tracks.count >= n, first.prints + 3, { timeout: 240000, polling: 200 });
  await page.keyboard.down('x');
  try { await walked; } finally { await page.keyboard.up('x'); }
  const after = await read();
  console.log('walked:', after, `— ${after.prints} prints behind it`);
  assert.ok(after.prints > first.prints, 'walking leaves more prints than standing');
  assert.ok(after.wade > 0, 'and it is still on the beach');

  // Every mark lies in the beach rather than standing out of it, and every one is near the body
  // that made it rather than at the origin, which is where an unwritten instance would sit.
  const seated = await page.evaluate(() => {
    const e = window.__cambrian, m = e.tracks.mesh, a = e.game.players[0];
    const fade = m.geometry.getAttribute('aFade').array, el = m.instanceMatrix.array;
    let n = 0, tilt = 0, far = 0;
    for (let i = 0; i < fade.length; i++) {
      if (fade[i] <= 0) continue;
      n++;
      const b = i * 16;
      // Column 1 of the instance matrix is the mark's up axis: it must point at the sky rather
      // than at the horizon, because a print lies in the sand.
      const ux = el[b + 4], uy = el[b + 5], uz = el[b + 6];
      tilt = Math.max(tilt, 1 - uy / Math.hypot(ux, uy, uz));
      far = Math.max(far, Math.hypot(el[b + 12] - a.pos.x, el[b + 14] - a.pos.z));
    }
    return { n, tilt, far };
  });
  console.log('seated:', seated);
  assert.ok(seated.n > 0, 'the prints are live instances');
  assert.ok(seated.tilt < 0.5, `every print lies in the sand (worst ${seated.tilt.toFixed(2)} off level)`);
  assert.ok(seated.far < 40, `and every one is on the beach the body walked (worst ${seated.far.toFixed(1)} units away)`);
  // The beach is a ramp near the water and a flat plateau above it, so a body standing on the ramp
  // proves the marks follow the ground's own slope and one on the plateau proves nothing either
  // way. Which of the two this run got is reported rather than asserted.
  console.log(seated.tilt > 0.01 ? `lying along the ramp, ${seated.tilt.toFixed(3)} off level`
    : 'standing on the flat top of the beach, so the slope is not what this run exercised');

  assert.deepEqual(errors, []);
  console.log(`PASS browser: nothing printed afloat, prints where the feet came down, and ${after.prints} of them behind a walk`);
} finally { await browser.close(); }
