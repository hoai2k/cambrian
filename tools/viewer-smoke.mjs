// Headless smoke test for the /viewer page: loads a specimen, switches creature, fires a one-shot
// clip and checks it settles back into Idle. Usage: node tools/viewer-smoke.mjs <outdir>
// Requires `npm run build && npx vite preview --port 4173` in another shell.
import { chromium } from 'playwright-core';
const S = process.argv[2] ?? '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[error] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
const clips = (sel) => page.$$eval(sel, (b) => b.map((x) => x.textContent).join(','));

await page.goto('http://localhost:4173/viewer/', { waitUntil: 'load' });
await page.waitForTimeout(12000);
await page.screenshot({ path: `${S}/viewer-idle.png`, timeout: 120000 });
console.log('clips:', await clips('.clip'));
console.log('playing:', await clips('.clip.active'));

await page.click('text=Olenoides');
await page.waitForTimeout(9000);
console.log('clips (olenoides):', await clips('.clip'));
await page.click('.clip:has-text("Heavy")');
await page.waitForTimeout(500);
console.log('playing:', await clips('.clip.active'));
await page.screenshot({ path: `${S}/viewer-heavy.png`, timeout: 120000 });
await page.waitForTimeout(3000);
console.log('after one-shot:', await clips('.clip.active'));

// orbit + zoom
await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(880, 340, { steps: 12 }); await page.mouse.up();
await page.mouse.wheel(0, -400);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${S}/viewer-orbit.png`, timeout: 120000 });

console.log('errors:', errors.length); for (const e of [...new Set(errors)].slice(0, 10)) console.log(e);
await browser.close();
