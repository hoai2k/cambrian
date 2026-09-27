/**
 * Screenshots of the choice screen as the game really draws it: each era's title and pick screen on
 * a desktop, two players on one screen, and a phone. For looking at a restyle end to end rather than
 * for asserting anything — it fails only on a page error.
 *
 * Run: node tools/select-shots.mjs <outdir> [eras...]   (with a preview server on QA_BASE_URL)
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'select-shots';
const ERAS = process.argv.slice(3).length ? process.argv.slice(3) : ['cambrian', 'devonian', 'triassic'];
const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4181/';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const errors = [];

async function open(era, viewport, { pad = false, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  await ctx.addInitScript((withPad) => {
    try { localStorage.clear(); localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })); } catch { /* */ }
    if (withPad) {
      const pad = { index: 0, id: 'Shots Pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard', timestamp: 0,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      window.__pad = pad;
      navigator.getGamepads = () => [pad, null, null, null];
    }
  }, pad);
  const page = await ctx.newPage();
  await silenceCounter(page);
  page.on('pageerror', (e) => errors.push(`${era}: ${e.message}`));
  await page.goto(`${BASE}${era}/`, { waitUntil: 'networkidle', timeout: 120000 });
  return { ctx, page };
}
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 400)))));
// Every portrait on screen has arrived, so a shot is not of half-loaded tiles.
const imagesIn = (page) => page.waitForFunction(() => [...document.querySelectorAll('.select img')].every((i) => i.complete), null, { timeout: 60000 }).catch(() => {});

for (const era of ERAS) {
  const { ctx, page } = await open(era, { width: 1440, height: 900 });
  await page.locator('.title').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('.title .loading-line'), null, { timeout: 90000 }).catch(() => {});
  await settle(page);
  await page.screenshot({ path: `${OUT}/${era}-title.png`, timeout: 180000 });
  await page.keyboard.press('Enter');
  await page.locator('.roster-grid').waitFor({ timeout: 60000 });
  await imagesIn(page); await settle(page);
  await page.screenshot({ path: `${OUT}/${era}-select.png`, timeout: 180000 });
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await imagesIn(page); await settle(page);
  await page.screenshot({ path: `${OUT}/${era}-select-locked.png`, timeout: 180000 });
  console.log(`shot ${era}`);
  await ctx.close();
}

// Two players: the keyboard and a pad on one screen.
{
  const era = ERAS[0];
  const { ctx, page } = await open(era, { width: 1440, height: 900 }, { pad: true });
  await page.evaluate(() => dispatchEvent(new Event('gamepadconnected')));
  await page.locator('.title').waitFor({ timeout: 60000 });
  await page.keyboard.press('Enter');
  await page.locator('.roster-grid').waitFor({ timeout: 60000 });
  const press = async (b) => {
    await page.evaluate((k) => { const p = window.__pad; p.buttons[k].pressed = true; p.buttons[k].value = 1; p.timestamp++; }, b);
    await page.waitForFunction(() => true); await settle(page);
    await page.evaluate((k) => { const p = window.__pad; p.buttons[k].pressed = false; p.buttons[k].value = 0; p.timestamp++; }, b);
    await settle(page);
  };
  await press(0);
  await page.waitForFunction(() => document.querySelectorAll('.crew-card').length >= 2, null, { timeout: 30000 }).catch(() => {});
  for (let k = 0; k < 4; k++) await press(15); // D-pad right, to a different animal
  await press(0);
  await imagesIn(page); await settle(page);
  await page.screenshot({ path: `${OUT}/${era}-two-players.png`, timeout: 180000 });
  console.log('shot two players');
  await ctx.close();
}

// A phone, both ways up.
for (const [w, h] of [[390, 844], [844, 390]]) {
  const era = ERAS[0];
  const { ctx, page } = await open(era, { width: w, height: h }, { mobile: true });
  const cdp = await ctx.newCDPSession(page);
  await page.locator('.title').waitFor({ timeout: 60000 });
  await Promise.all([['touchStart', [{ x: w / 2, y: h / 2, id: 1 }]], ['touchEnd', []]].map(([type, touchPoints]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })));
  await page.locator('.select').waitFor({ timeout: 60000 });
  await imagesIn(page); await settle(page);
  await page.screenshot({ path: `${OUT}/${era}-phone-${w}x${h}.png`, timeout: 180000 });
  console.log(`shot phone ${w}x${h}`);
  await ctx.close();
}

await browser.close();
if (errors.length) { console.log(`page errors:\n${errors.join('\n')}`); process.exit(1); }
