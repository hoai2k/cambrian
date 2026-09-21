/**
 * Mouth mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/mouth-browser.mjs [out dir]
 *
 * Opens the viewer on Placodus — a built body with a jaw bone and both mouth sockets, so the first
 * guess has something to read — enters mouth mode, and checks what a headless test cannot:
 *
 *   - the hinge is seated on the rig and the panel says so, with the mandible side counted;
 *   - the handles are really on the stage: the pointer finds one by hover, a drag on it changes
 *     the numbers, and the drag is one undo step;
 *   - the numeric fields set the same numbers, the count follows, and Square levels the angles;
 *   - the gape really moves the body: the jaw swings on the stage (measured as pixels changed in
 *     the rendered frame, not inferred from the control), holding the slider clears the editor's
 *     furniture off the screen and letting go brings it back with the jaw still open, shutting it
 *     again restores the frame, and none of it reaches the document or the exported file;
 *   - the export carries the hash of the file on stage, *measured* in the page and equal to the
 *     hash of that file on disk, and `npm run triassic:mouth` accepts it and refuses a tampered copy;
 *   - the cut survives a trip through view mode and is forgotten on reload.
 *
 * Then a second pass on the same animal's *original pose* — the untouched generation, no rig —
 * which is the body the editor is most wanted on: framed from the box, seated by a guess, and
 * exported as a cut on a generation rather than a built body.
 */
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { silenceCounter } from './qa-counter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || '.';
fs.mkdirSync(out, { recursive: true });
const key = 'triassic:placodus';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await silenceCounter(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = () => page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 90000 });
const mandible = async () => Number(await page.locator('.mouth-count').getAttribute('data-mandible'));
const field = (label) => page.locator('.mouth-fields label', { hasText: label }).locator('input');
const hashOnDisk = (rel) => createHash('sha256').update(fs.readFileSync(path.join('public', rel))).digest('hex');
/** Waits for the page to have hashed the file on stage, and returns the hash. */
const measuredHash = async () => {
  await page.waitForSelector('.mouth-hash[data-hash-source="measured"]', { timeout: 30000 });
  return page.locator('.mouth-hash').getAttribute('data-hash');
};
/**
 * Finds a handle on the stage by hover: the editor sets the canvas cursor to `grab` over one, so
 * a sweep of synthetic pointer moves across the canvas finds where the spheres are drawn without
 * the test knowing anything about the camera. Returns the first hit; which handle it is, the
 * legend says once a real pointer has rested there, because React renders the hover on its own
 * clock rather than inside the sweep.
 */
const findHandle = () => page.evaluate(() => {
  const canvas = document.querySelector('.viewer-canvas');
  const r = canvas.getBoundingClientRect();
  for (let y = 4; y < r.height - 4; y += 3) for (let x = 4; x < r.width - 4; x += 3) {
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    if (canvas.style.cursor === 'grab') return { x: r.left + x, y: r.top + y };
  }
  return null;
});

try {
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /placodus\.glb$/, 'the built body is on stage');

  await page.getByRole('button', { name: 'Mouth', exact: true }).click();
  await page.waitForSelector('.mouth-panel', { timeout: 20000 });
  await page.waitForTimeout(1500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'mouth', 'mouth mode is in the URL');
  const seated = await page.locator('.mouth-seat-note').textContent();
  assert.match(seated, /jaw bone/i, 'a rigged body seats the hinge on its jaw bone, and the panel says so');
  const frame = await page.locator('.mouth-frame-note').textContent();
  assert.match(frame, /mouth socket/i, 'and frames the body from its mouth socket');
  const first = await mandible();
  assert.ok(first > 0, `the rig's own hinge already takes vertices onto the mandible (${first})`);
  const depth0 = Number(await field('Depth').inputValue());
  assert.ok(depth0 > 0, 'the depth is the jaw bone\'s');
  await page.screenshot({ path: path.join(out, 'mouth-seated.png') });

  // ---- the handles are on the stage: find one by hover, drag it, undo it ----
  const handle = await findHandle();
  assert.ok(handle, 'the pointer finds a handle on the stage by hover');
  await page.mouse.move(handle.x, handle.y); await page.waitForTimeout(300);
  handle.which = (await page.locator('.mouth-legend li.hover').getAttribute('class'))?.split(' ')[0] ?? '';
  assert.ok(['hinge', 'front', 'side'].includes(handle.which), `and the legend says which (${handle.which})`);
  const before = { depth: Number(await field('Depth').inputValue()), height: Number(await field('Height').inputValue()), pitch: Number(await field('Pitch').inputValue()), yaw: Number(await field('Yaw').inputValue()), roll: Number(await field('Roll').inputValue()) };
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 30, handle.y - 24, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = { depth: Number(await field('Depth').inputValue()), height: Number(await field('Height').inputValue()), pitch: Number(await field('Pitch').inputValue()), yaw: Number(await field('Yaw').inputValue()), roll: Number(await field('Roll').inputValue()) };
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]);
  assert.ok(changed.length > 0, `dragging the ${handle.which} handle changed something (${changed.join(', ')})`);
  if (handle.which === 'hinge') assert.ok(changed.every((k) => k === 'depth' || k === 'height'), 'the hinge handle moves the cut and leaves the angles alone');
  if (handle.which === 'front') assert.ok(changed.every((k) => k === 'pitch' || k === 'yaw'), 'the front handle aims the line and leaves the hinge alone');
  if (handle.which === 'side') assert.deepEqual(changed, ['roll'], 'the side handle tips the plane and nothing else');
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'and the drag is an undo step');
  await page.screenshot({ path: path.join(out, 'mouth-dragged.png') });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  assert.equal(Number(await field('Depth').inputValue()), before.depth, 'Ctrl+Z takes the whole drag back');
  assert.equal(Number(await field('Pitch').inputValue()), before.pitch, 'angles included');

  // ---- the numeric fields: Square levels the line, and a deeper level hinge takes more of the head ----
  // Level first: the plane passes through the hinge, so on a line pitched down towards the nose
  // (which is what the jaw bone and the socket give this body) pulling the hinge back also lowers
  // the plane at the snout, and the count can go either way. Level, deeper is more.
  const square = page.getByRole('button', { name: 'Square', exact: true });
  if (Number(await field('Pitch').inputValue()) !== 0) {
    await square.click(); await page.waitForTimeout(300);
    assert.equal(Number(await field('Pitch').inputValue()), 0, 'Square levels the line');
  }
  assert.ok(await square.isDisabled(), 'and is then nothing to press');
  const levelCount = await mandible();
  const deeper = depth0 * 1.6;
  await field('Depth').fill(String(deeper));
  await field('Depth').press('Enter');
  await page.waitForTimeout(400);
  assert.ok(Math.abs(Number(await field('Depth').inputValue()) - deeper) < 1e-3, 'the depth field sets the depth');
  const deepCount = await mandible();
  assert.ok(deepCount > levelCount, `a deeper level hinge takes more onto the mandible (${levelCount} → ${deepCount})`);
  assert.equal(await page.locator('.mouth-seat-note').getAttribute('data-seat'), 'manual', 'and the seat is now the human\'s');
  await field('Pitch').fill('-8'); await field('Pitch').press('Enter'); await page.waitForTimeout(300);
  assert.equal(Number(await field('Pitch').inputValue()), -8, 'the pitch field sets the pitch');
  await field('Roll').fill('95'); await field('Roll').press('Enter'); await page.waitForTimeout(300);
  assert.equal(Number(await field('Roll').inputValue()), 60, 'an angle past the limit is held at it');
  await field('Roll').fill('0'); await field('Roll').press('Enter'); await page.waitForTimeout(300);
  await page.locator('.mark-note textarea').fill('browser drive: the hinge a little further back');
  await page.screenshot({ path: path.join(out, 'mouth-mode.png') });

  // ---- the gape: the preview really swings the jaw, and holding it clears the screen ----
  // The proof is the rendered frame rather than the control: a slider that moved a number while
  // the body stood still is exactly the failure this is here to catch. Shots are of the canvas,
  // decoded and compared pixel by pixel.
  const shot = async (name) => {
    await page.waitForTimeout(1600);   // the software renderer draws about a frame a second
    const buf = await page.locator('.viewer-canvas').screenshot({ path: name ? path.join(out, name) : undefined });
    return PNG.sync.read(buf);
  };
  /** How many pixels differ between two shots by more than a hair, which antialiasing alone will not. */
  const moved = (a, b) => {
    let n = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
    }
    return n;
  };
  const gapeSlider = page.getByRole('slider', { name: 'Gape' });
  const gapeDeg = async () => Number(await page.locator('.mouth-panel').getAttribute('data-gape'));
  const countShut = await mandible();
  const shut = await shot('mouth-gape-shut.png');
  assert.equal(await gapeDeg(), 0, 'the jaw starts shut');

  await page.getByRole('button', { name: 'Open the jaw' }).click();
  const open = await shot('mouth-gape-open.png');
  const opened = await gapeDeg();
  assert.ok(opened > 0, `the button opens the jaw (${opened}°)`);
  const swung = moved(shut, open);
  assert.ok(swung > 400, `and the body on stage actually moves with it (${swung} pixels changed)`);
  assert.equal(await mandible(), countShut, 'the preview says nothing about the document: the count is unchanged');
  assert.equal(await page.locator('.mouth-panel').getAttribute('data-previewing'), 'no', 'and pressing the button is not a hold, so the panel stays up');

  // Holding the slider clears the screen; letting go brings it back with the jaw still open.
  const box = await gapeSlider.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, box.y + box.height / 2, { steps: 6 });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.viewer').getAttribute('data-previewing'), 'yes', 'holding the slider raises the preview');
  assert.equal(await page.locator('.mouth-panel').evaluate((el) => getComputedStyle(el).opacity), '0', 'and the panel is off the screen');
  assert.equal(await page.locator('.specimens').evaluate((el) => getComputedStyle(el).opacity), '0', 'and so is the specimen list');
  const held = await shot('mouth-gape-held.png');
  assert.ok(moved(open, held) > 200, 'the jaw is still moving while it is held');
  await page.mouse.up();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.viewer').getAttribute('data-previewing'), 'no', 'letting go puts the furniture back');
  assert.equal(await page.locator('.mouth-panel').evaluate((el) => getComputedStyle(el).opacity), '1', 'panel and all');
  const wide = await gapeDeg();
  assert.ok(wide > opened, `and the jaw stays where the drag left it, open, so the cut can be aimed on it (${wide}°)`);

  // Shutting it again puts the body back exactly: a preview that left the mesh warped would be
  // worse than no preview, because everything measured afterwards would be measured on it.
  await page.getByRole('button', { name: 'Shut the jaw' }).click();
  const reshut = await shot();
  assert.equal(await gapeDeg(), 0, 'the jaw shuts again');
  assert.ok(moved(shut, reshut) < swung / 8, `and the body is back where it started (${moved(shut, reshut)} pixels differ, against ${swung} open)`);

  // ---- the hand-off: the hash is measured here and is the file's own ----
  const hash = await measuredHash();
  assert.match(hash, /^[0-9a-f]{64}$/, 'the page hashed the file on stage');
  const model = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(hash, hashOnDisk(model), 'and the hash is the file\'s own, as sha256 on disk reads it');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export mouth/ }).click();
  const file = path.join(out, 'placodus-mouth.json');
  await (await download).saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.schema, 'mouth-cut/1');
  assert.equal(json.id, 'placodus');
  assert.equal(json.appliesTo, 'built', 'the export says it was aimed on the built body');
  assert.equal(json.sha256, hash, 'and carries the measured hash');
  assert.equal(json.sha256Source, 'measured');
  assert.equal(json.creature.rigged, true);
  assert.equal(json.seat.source, 'manual');
  assert.equal(json.note, 'browser drive: the hinge a little further back');
  assert.equal(json.sides.mandible, await mandible(), 'the file carries the count the panel showed');
  assert.equal(json.sides.total, json.creature.vertices, 'over the whole body');
  assert.ok(Math.abs(Math.hypot(...json.plane.normal) - 1) < 1e-4, 'the plane normal is unit');
  assert.ok(Math.abs(json.plane.pitchDegrees + 8) < 1e-3, 'and the angle the field showed is in it');
  assert.ok(json.mouth && Number.isFinite(json.mouth.depth), 'and the document itself, for a consumer to rebuild the test');
  assert.ok(!JSON.stringify(json).includes('gape'), 'and nothing about the preview: the gape is a way of looking, not part of the cut');

  // ---- the consumer: accepts the file on this body, refuses a tampered one ----
  const check = (f) => spawnSync('npm', ['run', '--silent', 'triassic:mouth', '--', f], { encoding: 'utf8' });
  const accepted = check(file);
  assert.equal(accepted.status, 0, `npm run triassic:mouth accepts the file it was aimed on:\n${accepted.stdout}${accepted.stderr}`);
  assert.match(accepted.stdout, /OK: the file describes this body/, 'and says so');
  assert.match(accepted.stdout, new RegExp(`mandible\\s+${json.sides.mandible} of ${json.sides.total}`), 'and re-counts the same mandible over the actual mesh');
  const tampered = path.join(out, 'placodus-mouth-stale.json');
  fs.writeFileSync(tampered, JSON.stringify({ ...json, sha256: 'f'.repeat(64) }, null, 2));
  const refused = check(tampered);
  assert.notEqual(refused.status, 0, 'and refuses one whose hash no longer matches the body');
  assert.match(refused.stderr, /has changed since the cut was aimed/, 'saying why');

  // ---- through view mode and back, then a reload ----
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(400);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  await page.getByRole('button', { name: 'Mouth', exact: true }).click(); await page.waitForTimeout(800);
  assert.equal(await mandible(), json.sides.mandible, 'the cut survives a trip through view mode');
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'mouth', 'a reload keeps the mode');
  await page.waitForSelector('.mouth-panel', { timeout: 20000 });
  await page.waitForTimeout(1200);
  assert.equal(await mandible(), first, 'and starts again from the body\'s own guess');

  // ---- the original pose: no rig, framed from the box, seated by a guess ----
  // The Model control is on the info card, which the mode replaces with its panel, so the body is
  // swapped from view mode and the mode entered again on it.
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(400);
  await page.getByLabel('Which model').selectOption('origpose');
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.getByRole('button', { name: 'Mouth', exact: true }).click();
  await page.waitForSelector('.mouth-panel', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const guessed = await page.locator('.mouth-seat-note').textContent();
  assert.match(guessed, /Guessed/i, 'a body with no rig gets a guessed seat, and the panel says so');
  const boxed = await page.locator('.mouth-frame-note').textContent();
  assert.match(boxed, /bounding box/i, 'and is framed from its box, which the panel flags');
  assert.ok(await mandible() > 0, 'the guess still takes something onto the mandible');
  await page.screenshot({ path: path.join(out, 'mouth-generation.png') });
  const rawHash = await measuredHash();
  const rawModel = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(rawHash, hashOnDisk(rawModel), 'the generation\'s hash is measured too');
  const basePoses = JSON.parse(fs.readFileSync('src/content/triassic/base-poses.json', 'utf8'));
  assert.equal(rawHash, basePoses.find((b) => b.id === 'placodus')?.sha256, 'and agrees with the manifest that knows this file');
  const rawDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export mouth/ }).click();
  const rawFile = path.join(out, 'placodus-generation-mouth.json');
  await (await rawDownload).saveAs(rawFile);
  const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(raw.appliesTo, 'generation', 'the export says it was aimed on the raw generation');
  assert.equal(raw.creature.rigged, false);
  assert.equal(raw.seat.source, 'guess');
  assert.equal(raw.frame.source, 'bounds');
  assert.equal(check(rawFile).status, 0, 'and the consumer accepts it against that file');

  if (errors.length) console.error(`page errors:\n${errors.join('\n---\n')}`);
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`PASS: mouth mode — seated on the jaw bone (${first} mandible vertices), a ${handle.which} handle found and dragged, undone, deepened to ${deepCount},`);
  console.log(`      the gape swung the jaw on stage (${swung} pixels) and hid the furniture while held, then shut and put the body back;`);
  console.log(`      exported with the measured hash ${hash.slice(0, 12)}…, accepted and refused by npm run triassic:mouth, kept through view mode, forgotten on reload;`);
  console.log('      the original pose framed from its box and seated by a guess, exported as a cut on the generation');
} finally {
  await browser.close();
}
