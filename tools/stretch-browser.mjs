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
 *
 * It also takes the mode's **own Model control** both ways — the info card's is off the screen
 * while any editor is open, and `opening()` sends a stretch to the raw generation, so without one
 * the documented rigged-body workflow (the rig held at rest, the export a measurement for the
 * builder) could not be reached at all. What has to hold across the swap is that the panel keeps
 * telling the truth about which body it is describing, since a stretch exported off the wrong one
 * would name a model nobody ships.
 *
 * Then a second pass on a *built* body, which is a different contract: the drawings must be framed
 * from the body's own mouth socket rather than from its bounding box, and the export must say it
 * is a measurement for a builder rather than something the bake can apply.
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

  // ---- undo ----
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  assert.match(await page.locator('.stretch-slider output').textContent(), /^1\.00/, 'Ctrl+Z takes the stretch back off');

  // ---- the mode is not a cage: its own Model control, and the panel follows the body ----
  //
  // `opening()` sends a stretch to the raw generation where the animal has one, which is right —
  // that is the body the bake applies to. But the stretcher means something else on a rigged body,
  // and that something is documented: the rig is held at rest and the export is a *measurement*
  // for the builder, because a warped bind pose shows at rest and then flails once a clip plays.
  // Unreachable, that is a workflow nobody can use. The info card carries the Model control and an
  // editing mode replaces it, so the mode carries its own.
  //
  // Driven both ways, because the thing that has to hold is that **the panel keeps telling the
  // truth about which body it is describing**: `rigged` is measured off the body on stage, and a
  // stretch exported against the wrong one would name a model nobody ships.
  const stretchModel = page.locator('.stretch-model-pick select');
  assert.equal(await stretchModel.count(), 1, 'the stretch panel carries its own Model control');
  const footNote = () => page.locator('.sculpt-foot .hint').last().textContent();
  assert.match(await footNote(), /measurement to take to the builder/i, 'on the built body the panel says the export is a measurement');
  await stretchModel.selectOption('origpose');
  // The editor is unmounted while the new body loads — `ready` means the body on stage IS the body
  // the panel describes — so wait for the file and then for the panel to come back on it.
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForSelector('.stretch-panel', { timeout: 60000 });
  await page.waitForTimeout(1500);
  assert.match(await footNote(), /baked into the GLB/i, 'the swap re-measures: on a body with no rig the export is something the bake can apply');
  const rawDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export stretch/ }).click();
  const rawFile = path.join(out, 'stretch-export-origpose.json');
  await (await rawDownload).saveAs(rawFile);
  const rawPayload = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(rawPayload.creature.rigged, false, 'and the file says which body it was measured on');
  assert.match(rawPayload.creature.model, /origpose\.glb$/, 'by name');
  assert.notEqual(rawPayload.appliesTo, 'builder', 'with what it applies to following the body rather than the animal');
  // Back again, which is the other half of the guard: the numbers must follow the body in both
  // directions, not merely change once.
  await page.locator('.stretch-model-pick select').selectOption('full');
  await page.waitForFunction(() => /dinocephalosaurus\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForSelector('.stretch-panel', { timeout: 60000 });
  await page.waitForTimeout(1500);
  assert.match(await footNote(), /measurement to take to the builder/i, 'and the control goes both ways');

  // ---- and back to the view ----
  await page.getByRole('button', { name: 'Back to view' }).click();
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'leaving stretch mode clears it from the URL');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), key, 'the specimen stays');

  // ---- a built body: framed from its own landmark, and a measurement rather than a bake ----
  const built = 'triassic:nothosaurus';
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(built)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, built, { timeout: 90000 });
  await page.getByRole('button', { name: /^Stretch/ }).click();
  await page.waitForSelector('.stretch-panel', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const orientation = await page.locator('.stretch-panel .hint').filter({ hasText: /Taken from|Guessed|Set by hand/ }).first().textContent();
  assert.match(orientation, /mouth socket/i, 'a body with a mouth socket is framed from it, not from its box');
  assert.equal(await page.locator('.stretch-panel button[aria-pressed="true"]').filter({ hasText: /^Body along/ }).count(), 1,
    'and the axis it chose is shown, and can be changed');
  // The axis control re-frames rather than pretending: the cuts start again on the new axis.
  const along = await page.locator('.stretch-panel button', { hasText: 'Body along X' });
  const beforeAxis = Number(await field('From · body side').inputValue());
  await along.click(); await page.waitForTimeout(400);
  assert.notEqual(Number(await field('From · body side').inputValue()), beforeAxis, 'changing the axis puts the cuts back on it');
  await page.getByRole('button', { name: 'Body along Z', exact: true }).click(); await page.waitForTimeout(400);

  await page.getByRole('button', { name: '2×', exact: true }).click();
  await page.waitForTimeout(400);
  const builtDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export stretch/ }).click();
  const builtFile = path.join(out, 'stretch-export-built.json');
  await (await builtDownload).saveAs(builtFile);
  const built2 = JSON.parse(fs.readFileSync(builtFile, 'utf8'));
  assert.equal(built2.creature.rigged, true, 'the export knows the body is rigged');
  assert.equal(built2.appliesTo, 'builder', 'and that it is a measurement, not something to bake');
  // The axis was set by hand above, and the file says so — a frame a human chose must not read as
  // one the tool worked out, or a reviewer cannot tell a correction from a guess.
  assert.equal(built2.frame.source, 'manual', 'and that the frame was set by hand rather than found');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: stretch mode — two cuts on both views, one shared direction, the slider, the export and undo;');
  console.log('      the panel\'s own Model control taken both ways, with what the export applies to following the body;');
  console.log('      a built body framed from its mouth socket, re-framed by hand, exported as a builder measurement');
} finally {
  await browser.close();
}
