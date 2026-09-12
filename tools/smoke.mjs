// Headless smoke test: title → select → play, plus a giant-scale run. Usage: node tools/smoke.mjs <outdir>
import { chromium } from 'playwright-core';
const S = process.argv[2] ?? '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', lookSpeed: 1, invertY: false, volume: 0.8, muted: true })));
const shot = (name) => page.screenshot({ path: `${S}/shot-${name}.png`, timeout: 120000 });
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(9000);
await shot('title');
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
await page.keyboard.press('Space'); await page.waitForTimeout(400);
await shot('select');
await page.keyboard.press('Enter'); await page.waitForTimeout(3500);
await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(2500); await page.keyboard.up('ShiftLeft');
await shot('play-larva');
await page.keyboard.up('KeyW');
console.log('hud larva:', await page.evaluate(() => document.querySelector('.hud')?.textContent));
// Hunted mode: player one is a giant → large magnification
/**
 * Open the pause menu.
 *
 * The engine polls the keyboard once a frame, and a frame under swiftshader can take seconds — so
 * a tap, which Playwright sends as a keydown and keyup in the same tick, usually falls between two
 * samples and is never seen at all. Holding the key spans a frame, and re-pressing covers the case
 * where even that lands in a gap. This was a coin flip before, not a broken pause.
 */
const pause = async () => {
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('Escape'); await page.waitForTimeout(300); await page.keyboard.up('Escape');
    try { await page.waitForSelector('.overlay .menu-buttons', { timeout: 4000 }); return; } catch { /* frame gap: press again */ }
  }
  throw new Error('pause menu never opened');
};
await pause();
// Leave the match. Scoped to the menu rather than matched on the label anywhere on the page: the
// in-game menus are steered now and their wording has changed once already, so a bare `text=`
// match here failed as a silent thirty-second timeout.
await page.click('.overlay .menu-buttons button:has-text("Quit")'); await page.waitForTimeout(800);
await page.click('text=Hunter & Hunted'); await page.waitForTimeout(300);
await page.keyboard.press('Space'); await page.waitForTimeout(300);
await page.keyboard.press('Enter'); await page.waitForTimeout(3500);
await page.keyboard.down('KeyW'); await page.waitForTimeout(2500);
await shot('play-giant');
await page.keyboard.up('KeyW');
console.log('hud giant:', await page.evaluate(() => document.querySelector('.hud')?.textContent));
console.log('errors:', errors.length); for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
await browser.close();
