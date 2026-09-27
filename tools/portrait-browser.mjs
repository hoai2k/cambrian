/** Phone portrait gates active play, while menus and a portrait tablet remain usable. */
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
  const time = () => page.evaluate(() => window.__cambrian.time);
  const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const gate = page.locator('.rotate-gate');

  await page.locator('.title').waitFor();
  assert.equal(await gate.count(), 0, 'title must be available in portrait');
  const titleTime = await time();
  await frames();
  assert.ok(await time() > titleTime, 'title scene must continue in portrait');

  await page.locator('.press-start:not(.waiting)').waitFor({ timeout: 90000 });
  await page.locator('.title').click({ position: { x: 190, y: 200 } });
  await page.locator('.select').waitFor({ timeout: 60000 });
  assert.equal(await gate.count(), 0, 'creature selection must be available in portrait');
  await page.getByRole('option', { name: 'Opabinia', exact: true }).click();
  await page.locator('.ready-button').first().click();
  await page.locator('.select .start-button').click();
  await gate.waitFor({ timeout: 90000 });
  const blockedTime = await time();
  await frames();
  assert.equal(await time(), blockedTime, 'active play must stop in portrait');

  await gate.getByRole('button', { name: /pause/i }).click();
  await page.locator('.pause-panel').waitFor();
  await gate.waitFor({ state: 'hidden' });
  const pausedTime = await time();
  await frames();
  assert.equal(await time(), pausedTime, 'pause menu must not resume play');

  await page.locator('.pause-panel').getByRole('menuitem', { name: /resume/i }).click();
  await gate.waitFor();
  await frames();
  assert.equal(await time(), pausedTime, 'resuming in portrait must keep play stopped');

  await page.setViewportSize({ width: 844, height: 390 });
  await gate.waitFor({ state: 'hidden' });
  await page.waitForFunction((t) => window.__cambrian.time > t, pausedTime, { timeout: 30000 });
  await page.locator('.touch-pause').click();
  await page.locator('.pause-panel').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await gate.count(), 0, 'pause menu must remain available after rotating to portrait');

  await page.locator('.pause-panel').getByRole('menuitem', { name: /quit/i }).click();
  await page.locator('.select').waitFor();
  assert.equal(await gate.count(), 0, 'selection must remain available after a match');

  await page.setViewportSize({ width: 800, height: 1200 });
  assert.equal(await gate.count(), 0, 'portrait tablet must never show the phone gate');
  await page.locator('.ready-button').first().click();
  await page.locator('.select .start-button').click();
  await page.locator('.hud').first().waitFor({ timeout: 90000 });
  assert.equal(await gate.count(), 0, 'active play on a portrait tablet must be allowed');
  const tabletTime = await time();
  await page.waitForFunction((t) => window.__cambrian.time > t, tabletTime, { timeout: 30000 });
  console.log('PASS: phone portrait gates only active play; pause and menus support portrait');
} finally {
  await browser.close();
}
