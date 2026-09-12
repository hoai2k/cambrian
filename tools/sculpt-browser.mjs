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
  // Features: the eyes slide along the flank on the side view and keep their seat; the mouth widens on the top view.
  await page.getByRole('button', { name: /^Eyes/ }).click();
  const eyeMark = page.locator('.sculpt-side [data-kind="eye"]').first();
  const eb = await eyeMark.boundingBox();
  assert.ok(eb, 'the eye marker is drawn on the side view');
  await page.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2); await page.mouse.down();
  await page.mouse.move(eb.x + eb.width / 2 - 30, eb.y + eb.height / 2, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  assert.ok(await page.locator('.sculpt-features .clip', { hasText: 'Eyes' }).locator('.sculpt-dot').count() === 1, 'the eyes are marked edited');
  const sizeHandle = page.locator('.sculpt-side [data-kind="eyeSize"]').first();
  const sb = await sizeHandle.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2 + 12, sb.y + sb.height / 2, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Mouth/ }).click();
  const corner = page.locator('.sculpt-top [data-kind="mouthCorner"]').first();
  const mb = await corner.boundingBox();
  assert.ok(mb, 'the mouth corner is drawn on the top view');
  const mouthMark = await page.locator('.sculpt-top [data-kind="mouth"]').boundingBox();
  // Drag the corner back along the body (away from the nose) and outward: the jaw opens further round.
  const back = Math.sign(mouthMark.x - mb.x) || -1;
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); await page.mouse.down();
  await page.mouse.move(mb.x + mb.width / 2 + back * 30, mb.y + mb.height / 2 + (mb.y > mouthMark.y ? 20 : -20), { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.sculpt-features .clip', { hasText: 'Mouth' }).locator('.sculpt-dot').count() === 1, 'the mouth is marked edited');
  await page.screenshot({ path: path.join(out, 'sculpt-features.png') });
  // The preview toggle shows the shipped body and comes back.
  const toggle = page.getByRole('button', { name: 'Original', exact: true });
  assert.ok(await toggle.isEnabled(), 'the Original toggle is enabled once there is an edit');
  await toggle.click(); await page.waitForTimeout(300);
  assert.match(await page.locator('.sculpt-main .sculpt-label').textContent(), /original/i, 'preview shows the original');
  await page.keyboard.press('o'); await page.waitForTimeout(300);
  assert.match(await page.locator('.sculpt-main .sculpt-label').textContent(), /edited/i, 'O toggles the preview back');
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
  assert.ok(json.features.eyes?.changed && json.features.eyes.delta.axis !== 0 && json.features.eyes.scale > 1, `the export carries the eye move and size: ${JSON.stringify(json.features.eyes)}`);
  assert.ok(json.features.mouth?.changed && json.features.mouth.gape.edit !== json.features.mouth.gape.base, 'the export carries the jaw gape');
  fs.writeFileSync(path.join(out, 'cheirolepis-sculpt.json'), JSON.stringify(json, null, 2));
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(600);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  assert.match(await page.getByRole('button', { name: /^Edit sculpt/ }).textContent(), /edited/, 'the edit follows the model into view mode');
  await page.screenshot({ path: path.join(out, 'sculpt-view-after.png') });
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(await page.getByRole('button', { name: /^Edit sculpt/ }).textContent(), 'Edit sculpt', 'a reload forgets the sculpt');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), key, 'a reload keeps the specimen');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: sculpt mode — URL state, regions and points, drag edit, keyboard undo/redo, eyes moved and resized, jaw opened, original/edited toggle, export, edit kept in view mode, reload resets');
} finally { await browser.close(); }
