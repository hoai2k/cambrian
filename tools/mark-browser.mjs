/**
 * Mark mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/mark-browser.mjs [out dir]
 *
 * Opens the viewer on Atopodentatus — whose generated mesh carries three ventral fins that should
 * not be there, which is the case mark mode exists for — checks the raw mesh is what is on stage,
 * enters mark mode, paints a stroke across the body and watches the marked count rise, erases part
 * of it, undoes and redoes the stroke, exports the region file and reads the indices back out of
 * it. The file it writes is the input to `tools/triassic/cut-region.py`.
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || '../expansion-authoring/review';
fs.mkdirSync(out, { recursive: true });
const key = 'triassic:atopodentatus';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await silenceCounter(page);
const errors = [];
// The stats script is fetched from gc.zgo.at, which a headless container has no route to. That is
// not this page failing, so a request that never reached our own origin is reported separately
// rather than failing the drive.
const offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', (r) => (r.url().startsWith(base) ? errors : offsite).push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = () => page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 90000 });
const marked = async () => Number(await page.locator('.mark-count').getAttribute('data-marked'));
/**
 * Where the camera is and what it is looking at. An **orbit** swings the position about a target
 * that stays put; a **pan** carries the two together. Neither number is drawn anywhere, so the
 * scene hands them over on `window.__viewerScene`, the way the game does on `__cambrian`.
 */
const cam = () => page.evaluate(() => window.__viewerScene.cameraState());
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

try {
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();
  // The animal opens on its own generated mesh, which is the body the region is about.
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /atopodentatus(\.preview)?\.glb$/,
    'the generated mesh is the body on stage');

  await page.getByRole('button', { name: 'Mark region' }).click();
  await page.waitForSelector('.mark-panel', { timeout: 20000 });
  await page.waitForTimeout(1200);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'mark', 'mark mode is in the URL');
  assert.equal(await marked(), 0, 'a fresh body has nothing marked');

  // Paint: a drag across the middle of the stage, which is where the specimen stands.
  const stage = await page.locator('.viewer-canvas').boundingBox();
  const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
  await page.mouse.move(cx - 60, cy);
  await page.mouse.down();
  for (let i = -60; i <= 60; i += 10) await page.mouse.move(cx + i, cy, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const painted = await marked();
  assert.ok(painted > 0, `the stroke marked vertices (got ${painted})`);
  await page.screenshot({ path: path.join(out, 'mark-painted.png') });

  // Undo and redo the whole stroke: one pointer-down to pointer-up is one step.
  await page.keyboard.press('Control+z'); await page.waitForTimeout(250);
  assert.equal(await marked(), 0, 'Ctrl+Z takes the whole stroke back');
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(250);
  assert.equal(await marked(), painted, 'Ctrl+Shift+Z puts it back');

  // Erase: the same brush the other way round, on part of what was just painted.
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 12, cy, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const erased = await marked();
  assert.ok(erased > 0 && erased < painted, `erasing unmarked some but not all (${painted} → ${erased})`);
  await page.getByRole('button', { name: 'Mark', exact: true }).click();

  // The note goes into the file, so the file says what it is.
  await page.locator('.mark-note textarea').fill('browser drive: a stroke across the flank');
  await page.screenshot({ path: path.join(out, 'mark-mode.png') });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export region/ }).click();
  const file = await (await download).path();
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.schema, 'mesh-region/1');
  assert.equal(json.id, 'atopodentatus');
  assert.match(json.model, /atopodentatus(\.preview)?\.glb$/);
  assert.match(json.sha256, /^[0-9a-f]{64}$/, 'the export names the hash of the file it was marked on');
  assert.equal(json.note, 'browser drive: a stroke across the flank');
  assert.equal(json.markedCount, erased, 'the file carries what the panel said was marked');
  assert.equal(json.meshes.length, 1, 'one stroke across the flank lands on one mesh');
  // A raw generation is one mesh and answers at the top level too; a shipped body carries its
  // oral shells and eyes as meshes of their own, and there the per-mesh addressing is the only
  // honest answer. Which case this is, the file itself says.
  const singleMesh = json.meshes[0].vertexCount === json.vertexCount;
  if (singleMesh) assert.deepEqual(json.vertices, json.meshes[0].vertices, 'a single-mesh body also answers at the top level');
  else assert.equal(json.vertices, undefined, 'a multi-mesh body leaves the top-level shortcut out');
  const indices = json.meshes[0].vertices;
  assert.ok(indices.every((v, i) => Number.isInteger(v) && v >= 0 && v < json.meshes[0].vertexCount && (i === 0 || v > indices[i - 1])),
    'the indices are real indices into the mesh, in order and without repeats');
  const b = json.meshes[0].bounds;
  assert.ok(b && b.min.every((v, i) => v <= b.max[i]), 'the marked region carries the box it occupies');
  const dest = path.join(out, 'atopodentatus-region.json');
  fs.writeFileSync(dest, JSON.stringify(json, null, 2));

  // Back to view mode: the marks are the session's, so the mode remembers them.
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(400);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  await page.getByRole('button', { name: 'Mark region' }).click(); await page.waitForTimeout(800);
  assert.equal(await marked(), erased, 'the marks survive a trip through view mode');
  // A reload comes back into mark mode — the URL says so — on a body with nothing marked on it.
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(new URL(page.url()).searchParams.get('specimen'), key, 'a reload keeps the specimen');
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'mark', 'and keeps the mode');
  await page.waitForSelector('.mark-panel', { timeout: 20000 });
  await page.waitForTimeout(1000);
  assert.equal(await marked(), 0, 'a reload starts clean');

  // ---- the camera: what is left of the buttons once the brush has the left one ----
  // Mark mode is the one mode that cannot orbit on the left, so it runs on the `paint` scheme: the
  // orbit moves to the right button and the pan to the middle one, the wheel still zooming. Before
  // this it had no pan on any button at all, and a zoomed-in fin could not be brought into view.
  // Last in the drive, because an orbit and a pan leave the damping unwinding for many frames.
  const scene = await cam();
  assert.equal(scene.scheme, 'paint', 'mark mode runs on the paint scheme');
  const box = await page.locator('.viewer-canvas').boundingBox();
  const px = box.x + box.width * 0.18, py = box.y + box.height * 0.2;
  await page.mouse.move(px, py);
  const beforeOrbit = await cam();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(px + 150, py + 50, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(400);
  const orbited = await cam();
  assert.ok(apart(orbited.position, beforeOrbit.position) > 0.05,
    `a right-drag orbits (the camera moved ${apart(orbited.position, beforeOrbit.position).toFixed(3)})`);
  assert.ok(apart(orbited.target, beforeOrbit.target) < 0.02, 'about a target that stays where it is');
  assert.equal(await marked(), 0, 'and the right button paints nothing');

  await page.mouse.move(px, py); await page.waitForTimeout(200);
  const beforePan = await cam();
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(px + 120, py - 60, { steps: 10 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(400);
  const panned = await cam();
  assert.ok(apart(panned.target, beforePan.target) > 0.05,
    `a middle-drag pans: the camera's target moved ${apart(panned.target, beforePan.target).toFixed(3)}`);
  assert.equal(await marked(), 0, 'and paints nothing either');
  await page.screenshot({ path: path.join(out, 'mark-panned.png') });

  assert.deepEqual(errors, [], 'no page errors');
  if (offsite.length) console.log(`note: ${offsite.length} off-site request(s) failed (no route out of the container): ${offsite.join(', ')}`);
  console.log(`PASS: mark mode — generated mesh on stage, brush paints ${painted} vertices, undo/redo, erase, export (${dest}), marks kept through view mode and forgotten on reload, right-drag orbits and middle-drag pans`);
} finally { await browser.close(); }
