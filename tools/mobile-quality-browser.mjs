/** Check the actual app defaults and reduced-motion styles in a mobile browser. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4181/';

async function visit(era, memoryGB, logicalCores, saved, reducedMotion = 'no-preference') {
  const page = await browser.newPage({
    viewport: { width: 780, height: 360 }, hasTouch: true, isMobile: true, reducedMotion,
  });
  await page.addInitScript(({ era, memoryGB, logicalCores, saved }) => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: memoryGB });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: logicalCores });
    localStorage.setItem(`${era}-settings`, JSON.stringify({ muted: true, music: false, ...saved }));
  }, { era, memoryGB, logicalCores, saved });
  await page.goto(base + era + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__cambrian, null, { timeout: 60000 });
  return page;
}

try {
  const limited = await visit('triassic', 4, 8, {}, 'reduce');
  const errors = [];
  limited.on('pageerror', (e) => errors.push(e.message));
  limited.on('crash', () => errors.push('renderer crashed'));
  assert.deepEqual(await limited.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory, e.assets.conserveMemory];
  }), ['low', true, true], 'limited Triassic touch hardware should choose low and conserve models');
  await limited.locator('.press-start:not(.waiting)').waitFor({ timeout: 60000 });
  assert.equal(await limited.locator('.press-start').evaluate((el) => getComputedStyle(el).animationName), 'none', 'reduced motion must not make the start prompt strobe');
  await limited.locator('.title').click();
  await limited.locator('.hero img').first().waitFor({ timeout: 60000 });
  assert.equal(await limited.locator('.hero img').first().evaluate((el) => getComputedStyle(el).animationName), 'none', 'reduced motion must not vibrate the creature portrait');
  await limited.evaluate(() => window.__cambrian.setQuality('high'));
  assert.deepEqual(await limited.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory, e.assets.conserveMemory];
  }), ['high', false, false], 'switching to High must lift the model limit immediately');
  await limited.evaluate(() => window.__cambrian.setQuality('low'));
  await limited.locator('.ready-button').first().click();
  await limited.locator('.start-button').click();
  await limited.waitForFunction(() => {
    const e = window.__cambrian;
    return !e.isAttract && e.game?.players?.length > 0 && e.game.time > 0.3;
  }, null, { timeout: 90000 });
  const fullModels = await limited.evaluate(() => [...window.__cambrian.assets.items.values()]
    .filter((item) => item.kind === 'glb' && item.status === 'done').length);
  assert.ok(fullModels <= 4, `limited Triassic play should not preload the full roster (${fullModels} models)`);
  assert.deepEqual(errors, [], `Triassic mobile game errors: ${errors.join(' · ')}`);
  await limited.close();

  const powerful = await visit('triassic', 8, 8, {});
  assert.deepEqual(await powerful.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory];
  }), ['high', false], 'capable touch hardware should keep High');
  await powerful.close();

  const override = await visit('triassic', 4, 8, { quality: 'high', qualityExplicit: true });
  assert.deepEqual(await override.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory];
  }), ['high', false], 'explicit High must override the limited-device default');
  await override.close();

  const devonian = await visit('devonian', 4, 8, {});
  assert.deepEqual(await devonian.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory];
  }), ['low', true], 'Devonian should retain the memory-saving path on limited touch hardware');
  await devonian.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    localStorage.setItem('triassic-settings', JSON.stringify({ muted: true, music: false }));
  });
  await desktop.goto(base + 'triassic/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await desktop.waitForFunction(() => !!window.__cambrian, null, { timeout: 60000 });
  assert.deepEqual(await desktop.evaluate(() => {
    const e = window.__cambrian;
    return [e.quality, e.conserveMemory];
  }), ['high', false], 'desktop should stay High even with modest CPU and memory hints');
  await desktop.close();
  console.log('PASS: mobile quality defaults, override, live switch, Triassic play, reduced motion, desktop');
} finally {
  await browser.close();
}
