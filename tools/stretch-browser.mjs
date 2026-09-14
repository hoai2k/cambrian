/**
 * Stretch mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/stretch-browser.mjs [out dir]
 *
 * Opens the viewer on a Triassic animal that is still waiting for its own body, switches to the
 * raw generated mesh, enters stretch mode, and checks the three things the editor has to get right
 * and cannot be checked for headlessly:
 *
 *   - the cuts are drawn on both views, and dragging one moves it along the body;
 *   - angling a cut in one view turns *both* cuts, there and in the other view, because they share
 *     one direction — the property the whole tool is built on;
 *   - what the panel reports, what the drawing shows and what the exported file says are the same
 *     edit, and undo takes it back.
 *
 * It also checks the split with sculpt from the outside: a generated body offers Stretch and not
 * Edit sculpt, because a sculpt exported off a body with no rig would name a model nobody ships.
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || '.';
fs.mkdirSync(out, { recursive: true });
const key = 'triassic:dinocephalosaurus';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await silenceCounter(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = () => page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 90000 });
const angleOf = async (view, which) => page.locator(`.${view} .stretch-cut.${which} .stretch-line`).evaluate((el) => {
  const x1 = +el.getAttribute('x1'), y1 = +el.getAttribute('y1'), x2 = +el.getAttribute('x2'), y2 = +el.getAttribute('y2');
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
});
const field = (label) => page.locator('.sculpt-station label', { hasText: label }).locator('input');

try {
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();

  // A borrowed body offers the sculpt; the generated one offers the stretch instead.
  assert.equal(await page.getByRole('button', { name: /^Stretch/ }).count(), 1, 'a generated body offers Stretch');
  assert.equal(await page.getByRole('button', { name: /^Edit sculpt/ }).count(), 0, 'and not the sculpt, which needs a shipped body');

  await page.getByRole('button', { name: /^Stretch/ }).click();
  await page.waitForSelector('.stretch-panel', { timeout: 30000 });
  await page.waitForTimeout(1500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'stretch', 'stretch mode is in the URL');
  assert.equal(await page.locator('.sculpt-side .stretch-line').count(), 2, 'two cuts on the side view');
  assert.equal(await page.locator('.sculpt-top .stretch-line').count(), 2, 'two cuts on the top view');
  assert.equal(await page.locator('.stretch-handle').count(), 8, 'two handles on each cut, in each view');
  await page.screenshot({ path: path.join(out, 'stretch-mode.png') });

  // ---- dragging a cut moves it along the body, and only along it ----
  const to = page.locator('.sculpt-side .stretch-cut.to .stretch-grab');
  const before = Number(await field('To · head side').inputValue());
  const tb = await to.boundingBox();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width / 2 + 60, tb.y + tb.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = Number(await field('To · head side').inputValue());
  assert.notEqual(after, before, 'dragging a cut moves it along the body');
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'and is one undo step');

  // ---- one direction, both cuts: angle it in the side view ----
  const angles0 = { sideFrom: await angleOf('sculpt-side', 'from'), sideTo: await angleOf('sculpt-side', 'to'), topTo: await angleOf('sculpt-top', 'to') };
  const handle = page.locator('.sculpt-side .stretch-cut.to .stretch-handle').first();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 45, hb.y + hb.height / 2 + 35, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const angles1 = { sideFrom: await angleOf('sculpt-side', 'from'), sideTo: await angleOf('sculpt-side', 'to'), topTo: await angleOf('sculpt-top', 'to') };
  assert.ok(Math.abs(angles1.sideTo - angles0.sideTo) > 2, 'a handle drag angles the cut it is on');
  assert.ok(Math.abs(angles1.sideTo - angles1.sideFrom) < 0.5, 'and the other cut turns with it — they share one direction');
  assert.ok(Math.abs(angles1.topTo - angles0.topTo) < 0.5, 'the top view is left alone: each view sets its own angle');
  await page.screenshot({ path: path.join(out, 'stretch-angled.png') });

  // ---- the slider, the readout and the drawing ----
  await page.getByRole('button', { name: '2×', exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.stretch-moved').count(), 2, 'where the far cut is going is drawn, on both views');
  assert.equal(await page.locator('.stretch-arrow').count(), 2, 'with an arrow saying which way');
  const readout = await page.locator('.stretch-readout').textContent();
  assert.match(readout, /→/, 'the panel says what the region measures and what it will');
  await page.screenshot({ path: path.join(out, 'stretch-doubled.png') });

  // The preview toggle puts the generated mesh back and O brings the stretch again.
  const generated = page.getByRole('button', { name: 'Generated', exact: true });
  assert.ok(await generated.isEnabled(), 'the Generated toggle is enabled once there is a stretch');
  await generated.click(); await page.waitForTimeout(300);
  assert.match(await page.locator('.sculpt-main .sculpt-label').textContent(), /generated/i, 'preview shows the mesh as generated');
  await page.keyboard.press('o'); await page.waitForTimeout(300);
  assert.match(await page.locator('.sculpt-main .sculpt-label').textContent(), /stretched/i, 'O toggles back to the stretch');

  // ---- the hand-off ----
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export stretch/ }).click();
  const file = path.join(out, 'stretch-export.json');
  await (await download).saveAs(file);
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(payload.format, 'cambrian-stretch', 'the export says what it is');
  assert.equal(payload.creature.id, 'dinocephalosaurus', 'and which animal');
  assert.equal(payload.region.factor, 2, 'and the factor the panel showed');
  assert.ok(payload.changed, 'and that it changes something');
  assert.ok(Math.abs(payload.direction.tiltSideDegrees) > 1, 'and the angle it was aimed at');
  assert.equal(payload.direction.tiltTopDegrees, 0, 'and that the other view was left square');
  assert.ok(payload.creature.vertices > 1000, 'and the mesh it was measured on');

  // ---- undo, and back ----
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  assert.match(await page.locator('.stretch-slider output').textContent(), /^1\.00/, 'Ctrl+Z takes the stretch back off');
  await page.getByRole('button', { name: 'Back to view' }).click();
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'leaving stretch mode clears it from the URL');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), key, 'the specimen stays');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: stretch mode — two cuts on both views, one shared direction, the slider, the export and undo');
} finally {
  await browser.close();
}
