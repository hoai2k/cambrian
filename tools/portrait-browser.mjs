/** Phone portrait blocks the engine; a portrait tablet and landscape phone can play. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4181/') + 'cambrian/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.rotate-gate').waitFor();
  const before = await page.evaluate(() => window.__cambrian.time);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await page.evaluate(() => window.__cambrian.time);
  assert.equal(after, before, 'portrait phone must not advance the game');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.rotate-gate').waitFor({ state: 'hidden' });
  await page.waitForFunction((t) => window.__cambrian.time > t, before, { timeout: 30000 });

  await page.setViewportSize({ width: 800, height: 1200 });
  await page.locator('.rotate-gate').waitFor({ state: 'hidden' });
  console.log('PASS: phone portrait freezes play; landscape and portrait tablet run');
} finally {
  await browser.close();
}
