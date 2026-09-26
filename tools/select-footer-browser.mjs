/** The picker action and icon toolbar share one bottom row across screen sizes. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
try {
  for (const [width, height, mobile] of [[1280, 800, false], [780, 360, true], [390, 844, true], [320, 700, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
    await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
    await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4181/') + 'cambrian/?screen=select', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('.select-footer .start-button').waitFor();
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height };
      };
      const roster = document.querySelector('.roster-grid');
      return { dive: rect('.select-footer .start-button'), icons: rect('.toolbar'),
        roster: rect('.roster-grid'), rosterScroll: roster.scrollHeight, rosterClient: roster.clientHeight };
    });
    const { dive, icons } = layout;
    const gap = icons.x - (dive.x + dive.width);
    const centres = Math.abs((dive.y + dive.height / 2) - (icons.y + icons.height / 2));
    assert.ok(gap >= 4 && gap <= 24, `${width}x${height}: Dive In should be beside the icons (gap ${gap})`);
    assert.ok(centres <= 6, `${width}x${height}: controls should share a line (offset ${centres})`);
    assert.ok(dive.x >= 0 && icons.x + icons.width <= width, `${width}x${height}: controls should stay on screen`);
    if (height <= 399) assert.ok(layout.rosterScroll <= layout.rosterClient + 2,
      `${width}x${height}: the full roster should fit (${layout.rosterClient}/${layout.rosterScroll}px)`);
    console.log(`${width}x${height}: gap ${gap.toFixed(1)}px, centre offset ${centres.toFixed(1)}px, roster ${layout.rosterClient}/${layout.rosterScroll}px`);
    if (process.env.QA_SHOTS) await page.screenshot({ path: `${process.env.QA_SHOTS}/select-${width}x${height}.png` });
    await page.close();
  }
  console.log('PASS: Dive In and icon toolbar share one bottom row');
} finally {
  await browser.close();
}
