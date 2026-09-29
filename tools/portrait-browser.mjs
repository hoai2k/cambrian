/**
 * A phone held upright plays the game. Portrait used to be gated behind "turn your phone sideways";
 * it is not any more — the title, the choice screen and the match all run upright, and turning the
 * phone either way mid-match carries on. Run against a preview build on QA_BASE_URL.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { silenceCounter } from './qa-counter.mjs';

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await silenceCounter(page);
  await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
  await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4181/') + 'cambrian/', { waitUntil: 'networkidle', timeout: 120000 });
  const time = () => page.evaluate(() => window.__cambrian.game?.time ?? 0);

  await page.locator('.press-start:not(.waiting)').waitFor({ timeout: 90000 });
  await page.locator('.title').click({ position: { x: 190, y: 200 } });
  await page.locator('.select').waitFor({ timeout: 60000 });
  // One player on a phone: the card's button dives, and there is no second step.
  await page.locator(".carousel-slide.current .ready-button, .select:not(:has(.carousel-slide)) .ready-button").first().click();
  if (await page.locator('.select .start-button').count()) await page.locator('.select .start-button').click();
  await page.locator('.hud').first().waitFor({ timeout: 90000 });
  assert.equal(await page.getByText(/turn your phone/i).count(), 0, 'no phone is asked to turn round');
  const t0 = await time();
  await page.waitForFunction((t) => (window.__cambrian.game?.time ?? 0) > t + 0.2, t0, { timeout: 60000 });
  assert.ok(await page.locator('.touch-swim').isVisible(), 'the swim pad is on screen upright');

  // Turning the phone either way mid-match carries on.
  await page.setViewportSize({ width: 844, height: 390 });
  const t1 = await time();
  await page.waitForFunction((t) => (window.__cambrian.game?.time ?? 0) > t + 0.2, t1, { timeout: 60000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const t2 = await time();
  await page.waitForFunction((t) => (window.__cambrian.game?.time ?? 0) > t + 0.2, t2, { timeout: 60000 });
  console.log('PASS: a phone held upright plays, and turning it either way carries on');
} finally {
  await browser.close();
}
