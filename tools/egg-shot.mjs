// The hatch, frame by frame: starts a Rise run and shoots the egg at eight points across the five
// seconds (src/render/eggs.ts). Needs `npx vite preview --port 4173` running.
// Usage: node tools/egg-shot.mjs   → /tmp/claude-0/shots/egg-*.png
import { chromium } from 'playwright-core';
const S = '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type()==='error') console.log('[err]', m.text().slice(0,200)); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', lookSpeed: 1, invertY: false, volume: 0, muted: true })));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(9000);
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
await page.keyboard.press('Space'); await page.waitForTimeout(500);
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
const stateT = () => page.evaluate(() => window.__cambrian?.game?.players?.[0]?.stateT ?? 99);
for (const mark of [0.2, 1.2, 2.2, 2.9, 3.4, 3.9, 4.4, 4.9]) {
  for (let i = 0; i < 120 && (await stateT()) < mark; i++) await page.waitForTimeout(250);
  await page.screenshot({ path: `${S}/egg-${mark}.png`, timeout: 120000 });
  console.log(mark, await page.evaluate(() => { const p = window.__cambrian?.game?.players?.[0]; return p ? `${p.state} t=${p.stateT.toFixed(2)} scale=${p.scale.toFixed(3)}` : 'none'; }));
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${S}/egg-after.png`, timeout: 120000 });
await browser.close();
