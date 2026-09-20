/**
 * Does a burrowing animal actually throw sand on screen?
 *
 * `npm run sand` holds the mapping — which moment owes what — because that is pure. This is the
 * half that cannot be held headless: the engine reading `hideMode` off the live actors frame by
 * frame, the grains reaching the pool, and the shower running out once the body has settled under
 * the floor rather than being topped up forever.
 *
 * Run it against a preview build:
 *   npm run build && npx vite preview --port 4181 --strictPort &
 *   node tools/sand-browser.mjs
 *
 * **Everything here waits on the game's own state and frames, never on the clock**, and this page
 * is where that rule bites hardest. Under the software renderer it draws about a frame a second,
 * and the engine clamps `dt` to 0.08 s, so a wall-clock second is about a twelfth of a second of
 * particle life — a 1.3-second shower survives ten real seconds. Worse, a keypress held for a
 * fraction of a second can fall entirely *between* two frames and never be sampled at all, which
 * is why every press here is held for several seconds and why the watchers that look for grains
 * are armed before the press rather than read after it.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4181/cambrian/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**gc.zgo.at/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('.title').waitFor({ timeout: 180000 });
  await page.locator('.title').click();
  await page.locator('.select').waitFor({ timeout: 180000 });
  await page.getByRole('option', { name: /Marrella/ }).first().click();
  await page.locator('.ready-button').first().click();
  await page.locator('.start-button:not([disabled])').last().click();
  await page.locator('.hud').first().waitFor({ timeout: 180000 });
  await page.waitForFunction(() => !document.body.textContent.includes('taking shape'), null, { timeout: 180000 });
  // Skip the hatch and stand the body on the floor with nothing hunting it.
  await page.evaluate(() => {
    const g = window.__cambrian.game, a = g.players[0];
    g.skipHatch?.();
    a.spawnProtect = 999; a.state = 'free'; a.stamina = a.staminaMax;
    g.actors.forEach((o) => { if (o !== a) o.brain = undefined; });
  });
  const live = () => page.evaluate(() => {
    const sand = window.__cambrian.sand;
    const life = sand.points.geometry.getAttribute('aLife').array;
    let n = 0; for (const v of life) if (v > 0) n++;
    return { n, mode: window.__cambrian.game.players[0].hideMode };
  });
  const before = await live();
  assert.equal(before.n, 0, 'no sand before anything burrows');

  // Under the software renderer this page draws about a frame a second, so a shower can be born
  // and die between two reads: the watcher is armed *before* the press and polls on its own clock.
  const anySand = () => page.waitForFunction(() => {
    const life = window.__cambrian.sand.points.geometry.getAttribute('aLife').array;
    for (const v of life) if (v > 0) return true;
    return false;
  }, null, { timeout: 180000, polling: 100 });

  await page.evaluate(() => document.activeElement?.blur());
  const goingUnder = anySand();
  await page.keyboard.down('z'); await page.waitForTimeout(4000); await page.keyboard.up('z');
  await goingUnder;
  console.log('going under: sand thrown, mode is now', (await live()).mode);

  await page.waitForFunction(() => window.__cambrian.game.players[0].hideMode === 'burrowed', null, { timeout: 180000 });
  console.log('covered:', await live());

  // Settled under the sand throws none, so the shower it arrived with runs out and nothing tops it
  // up. Waited out in *frames* rather than seconds: the engine clamps dt to 0.08 s, so under the
  // software renderer a second of wall clock is a twelfth of a second of grain life.
  await page.waitForFunction(() => {
    const life = window.__cambrian.sand.points.geometry.getAttribute('aLife').array;
    for (const v of life) if (v > 0) return false;
    return window.__cambrian.game.players[0].hideMode === 'burrowed';
  }, null, { timeout: 300000, polling: 200 });
  console.log('settled:', await live(), '— the shower ran out and nothing topped it up');

  const comingUp = anySand();
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down('z'); await page.waitForTimeout(4000); await page.keyboard.up('z');
  await comingUp;
  await page.waitForFunction(() => window.__cambrian.game.players[0].hideMode === 'none', null, { timeout: 180000 });
  console.log('coming up: sand thrown, and the body is back in the water');
  assert.deepEqual(errors, []);
  console.log('PASS browser: sand while digging in, as the floor closes, nothing while buried, and again on the way out');
} finally { await browser.close(); }
