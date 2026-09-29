/**
 * The choice screen's carousel, in a real browser at phone sizes in all three games.
 *
 * `npm run touch` decides *when* the screen changes (`gridFits`, `carouselView`) with no browser
 * anywhere near it. What only a browser can say is whether the page actually made the same decision
 * off the real measured picker, whether a swipe and the arrows walk the roster, whether the arrow
 * keys do too, and whether Lock In and Dive In still get a player into the sea.
 *
 * Run: node tools/carousel-browser.mjs [outdir]   (with a preview server on QA_BASE_URL)
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import assert from 'node:assert/strict';

const OUT = process.argv[2];
const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4181/';
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const failures = [];
// Held upright the arrows give way to the neighbouring cards peeking in; on its side the arrows stay.
const stepper = async (page, side) => ((await page.locator(`.carousel-step.${side}`).isVisible()) ? page.locator(`.carousel-step.${side}`) : page.locator(`.carousel-slide.${side}`));
// The track at rest: no slide under way. A press during a slide is ignored by design (the slide
// finishes first), so a walk that presses again before it lands would press nothing.
const rest = (page) => page.waitForFunction(() => !document.querySelector('.carousel-track')?.dataset.moving, null, { timeout: 20000 });
const title = (page) => page.evaluate(() => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent ?? '');
// Every wait says which step it was, so a timeout names the part of the journey that stopped.
let stepName = '';
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 }).catch((e) => { throw new Error(`${stepName}: ${e.message.split('\n')[0]}`); });

async function drive(era, w, h, full) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await silenceCounter(page);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })); } catch { /* */ } });
  const name = `${era}-${w}x${h}`;
  try {
    await page.goto(`${BASE}${era}/`, { waitUntil: 'networkidle', timeout: 120000 });
    const cdp = await page.context().newCDPSession(page);
    // One queued batch, or a blocked frame lands between the two and the tap is read as a hold.
    const touch = (...steps) => Promise.all(steps.map(([type, pts]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts })));
    await touch(['touchStart', [{ x: w / 2, y: h / 2, id: 1 }]], ['touchEnd', []]);
    await page.locator('.select').waitFor({ timeout: 60000 });
    await page.locator('.carousel').waitFor({ timeout: 20000 });
    assert.equal(await page.locator('.roster-grid').count(), 0, 'the grid must not be drawn under the carousel');
    if (h > w) {
      assert.ok(await page.locator('.carousel-slide.next').isVisible() && !(await page.locator('.carousel-step.next').isVisible()), 'upright, the neighbouring cards peek in where the arrows were');
      const card = await page.locator('.carousel-slide.current .crew-card').boundingBox();
      assert.ok(card.width >= w * 0.78, `upright, the card takes most of the width (${Math.round(card.width)} of ${w})`);
    }
    const name0 = await title(page);

    stepName = 'arrows';
    // The arrows walk it.
    await (await stepper(page, 'next')).click();
    await until(page, (n) => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent !== n, name0);
    const name1 = await title(page);
    await (await stepper(page, 'prev')).click();
    await until(page, (n) => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent === n, name0);

    stepName = 'drag';
    // The card follows the finger: part-way through a drag the track has moved with it, and a drag
    // too short to commit springs back to the card it started on.
    {
      const box = await page.locator('.carousel-stage').boundingBox();
      const y0 = box.y + box.height * 0.3, x0 = box.x + box.width * 0.7;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 5 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - 20, y: y0, id: 5 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - 40, y: y0, id: 5 }] });
      await until(page, () => { const m = getComputedStyle(document.querySelector('.carousel-track')).transform; return m !== 'none' && new DOMMatrix(m).m41 < -15; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - 30, y: y0, id: 5 }] });
      await page.waitForTimeout(400); // slow enough that it is not a flick
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await until(page, () => new DOMMatrix(getComputedStyle(document.querySelector('.carousel-track')).transform).m41 === 0);
      assert.equal(await title(page), name0, 'a short drag springs back to the same card');
    }
    stepName = 'swipe';
    // A swipe walks it, leftward to the next card, off real touches.
    const stage = await page.locator('.carousel-stage').boundingBox();
    const y = stage.y + stage.height * 0.3;
    await touch(
      ['touchStart', [{ x: stage.x + stage.width * 0.8, y, id: 2 }]],
      ['touchMove', [{ x: stage.x + stage.width * 0.5, y, id: 2 }]],
      ['touchMove', [{ x: stage.x + stage.width * 0.2, y, id: 2 }]],
      ['touchEnd', []],
    );
    await until(page, (n) => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent === n, name1);

    stepName = 'keys';
    // The arrow keys walk it too — down included, since a list of one card has no rows.
    await page.keyboard.press('ArrowDown');
    await until(page, (n) => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent !== n, name1);
    await page.keyboard.press('ArrowUp');
    await until(page, (n) => document.querySelector('.carousel-slide.current .crew-card h2')?.textContent === n, name1);

    // Everything it takes to choose is on screen.
    const vis = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect();
      const b = r('.carousel-slide.current .ready-button'), c = r('.carousel-slide.current .crew-card'), d = r('.start-button');
      // With no pad the card's own button is the dive (one step), and the footer has none.
      const oneStep = !!document.querySelector('.carousel-slide.current .ready-button.dive-now');
      return { btn: !!b && b.bottom <= innerHeight && b.top >= 0, card: !!c && c.bottom <= innerHeight + 1, dive: oneStep ? !d : !!d && d.bottom <= innerHeight };
    });
    assert.ok(vis.btn && vis.card && vis.dive, `the card, its Lock In and Dive In must all be on screen (${JSON.stringify(vis)})`);
    if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` });

    stepName = 'extras';
    // The Random/Visitors stops, at the far end of the roster: walk back from the first card.
    if (await page.locator('.carousel-dots i.extra').count()) {
      for (let k = 0; k < 40 && !(await page.locator('.carousel-slide.current .carousel-extra').count()); k++) { await (await stepper(page, 'prev')).click(); await rest(page); }
      assert.equal(await page.locator('.carousel-slide.current .carousel-extra').count(), 1, 'an extra should show its own card');
      if (OUT) await page.screenshot({ path: `${OUT}/${name}-extra.png` });
      for (let k = 0; k < 40 && (await page.locator('.carousel-slide.current .carousel-extra').count()); k++) { await (await stepper(page, 'next')).click(); await rest(page); }
    }

    stepName = 'dive';
    if (full) {
      // Lock In and Dive In still reach the sea.
      await rest(page);
      const oneStep = await page.locator('.carousel-slide.current .ready-button.dive-now').count();
      await page.locator('.carousel-slide.current .ready-button').click();
      if (!oneStep) {
        await until(page, () => document.querySelector('.carousel-slide.current .ready-button')?.getAttribute('aria-pressed') === 'true');
        await page.locator('.start-button').click();
      }
      await page.locator('.hud').first().waitFor({ timeout: 90000 });
    }
    assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`);
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures.push(name); console.log(`FAIL  ${name}: ${e.message.split('\n')[0]}`);
    if (OUT) await page.screenshot({ path: `${OUT}/${name}-fail.png` }).catch(() => {});
  }
  await page.close();
}

// Whether the grid is replaced depends on the space, so a roomy window must keep it.
async function keepsGrid(era, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await silenceCounter(page);
  try {
    await page.goto(`${BASE}${era}/`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.keyboard.press('Enter');
    await page.locator('.roster-grid').waitFor({ timeout: 60000 });
    assert.equal(await page.locator('.carousel').count(), 0, 'a roomy window keeps the grid');
    console.log(`PASS  ${era}-${w}x${h} keeps the grid`);
  } catch (e) { failures.push(`${era}-${w}x${h}`); console.log(`FAIL  ${era}-${w}x${h}: ${e.message.split('\n')[0]}`); }
  await page.close();
}

const ONLY = process.env.ONLY;
for (const era of ['cambrian', 'devonian', 'triassic']) {
  if (ONLY && ONLY !== era) continue;
  // The dive is driven both ways up now that a phone plays upright, on the Cambrian where it is cheapest.
  await drive(era, 390, 844, era === 'cambrian');
  await drive(era, 780, 360, era === 'cambrian');
}
await keepsGrid('cambrian', 1280, 800);
await keepsGrid('triassic', 1180, 820);
await browser.close();
console.log(failures.length ? `FAILED: ${failures.join(', ')}` : 'PASS: the carousel replaces a grid that will not fit, walks by arrow, swipe and key, and still dives in');
process.exit(failures.length ? 1 : 0);
