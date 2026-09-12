/**
 * Sculpt mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/sculpt-browser.mjs [out dir]
 *
 * Opens the viewer on Cheirolepis by URL, enters sculpt mode, drags a head-region dorsal point,
 * checks the edit is undoable and redoable from the keyboard, exports the sculpt file and reads
 * the change back out of it, returns to view mode with the edit still on the model, and reloads
 * to confirm the specimen is kept by the URL while the sculpt is not.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || '../expansion-authoring/review';
fs.mkdirSync(out, { recursive: true });
const key = 'devonian:creature:cheirolepis';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = () => page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 90000 });
try {
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();
  await page.getByRole('button', { name: /^Edit sculpt/ }).click();
  await page.waitForSelector('.sculpt-panel', { timeout: 20000 });
  await page.waitForTimeout(1200);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'sculpt', 'sculpt mode is in the URL');
  assert.deepEqual(await page.locator('.sculpt-regions .clip').allTextContents(), ['Head', 'Fore body', 'Mid body', 'Hind body', 'Tail']);
  assert.ok((await page.locator('.sculpt-side .sculpt-point').count()) > 0, 'the selected region shows its points');
  await page.screenshot({ path: path.join(out, 'sculpt-mode.png') });
  const pt = page.locator('.sculpt-side .sculpt-point.dorsal').nth(1);
  const bb = await pt.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - 20, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'a drag is an undo step');
  await page.screenshot({ path: path.join(out, 'sculpt-edited.png') });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  assert.ok(!(await page.getByRole('button', { name: 'Undo' }).isEnabled()) && await page.getByRole('button', { name: 'Redo' }).isEnabled(), 'Ctrl+Z undoes');
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(200);
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'Ctrl+Shift+Z redoes');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export sculpt/ }).click();
  const file = await (await download).path();
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.format, 'cambrian-sculpt');
  assert.equal(json.creature.id, 'cheirolepis');
  assert.equal(json.changed, true);
  assert.equal(json.stations.length, 20);
  const moved = json.stations.filter((s) => s.dorsal.edit !== s.dorsal.base);
  assert.equal(moved.length, 1, 'one station changed');
  assert.ok(moved[0].dorsal.edit > moved[0].dorsal.base, 'the dorsal line rose');
  fs.writeFileSync(path.join(out, 'cheirolepis-sculpt.json'), JSON.stringify(json, null, 2));
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(600);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  assert.match(await page.getByRole('button', { name: /^Edit sculpt/ }).textContent(), /edited/, 'the edit follows the model into view mode');
  await page.screenshot({ path: path.join(out, 'sculpt-view-after.png') });
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(await page.getByRole('button', { name: /^Edit sculpt/ }).textContent(), 'Edit sculpt', 'a reload forgets the sculpt');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), key, 'a reload keeps the specimen');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: sculpt mode — URL state, regions and points, drag edit, keyboard undo/redo, export, edit kept in view mode, reload resets');
} finally { await browser.close(); }
