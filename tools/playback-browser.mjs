/**
 * The Animations pane's sticky selection, driven in a real browser.
 *
 * `npm run playback` holds the decision, because that is pure. This is the half it cannot vouch
 * for: that the pane's buttons, the scrubber and the Pause button actually write the selection
 * down, that `scene.show` asks it what to play on every load, and that a body arriving on stage
 * really does come up on the clip and at the frame the last one was left at.
 *
 * The journey is the one the feature exists for, walked on the Cambrian roster:
 *
 *  1. Hallucigenia, `Crawl`, paused two thirds of the way through it.
 *  2. Anomalocaris, which has no `Crawl` at all: `Idle`, still paused, and the *choice still
 *     stands* — the pane says so and the page carries it.
 *  3. Wiwaxia, which does have one: `Crawl` again, at the same frame, still paused.
 *  4. `Attack` is 1.333 s on Hallucigenia and 1.100 s on Anomalocaris, so the end of the long one
 *     clamps to the end of the short one — and coming back gives the 1.333 s back, which is the
 *     proof that the clamp landed on what was playing and not on what was chosen.
 *  5. A model swap — the same specimen's reduced body — holds the clip and the frame too.
 *  6. The Base pose crosses bodies like a clip does, and a reload forgets the lot: this is a
 *     session's selection, not a saved one.
 *
 * Run it against a preview build:
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   QA_BASE_URL=http://127.0.0.1:4173 node tools/playback-browser.mjs [out dir]
 *
 * Everything here waits on the page's own state attributes — `data-loaded-specimen`,
 * `data-clip-playing`, `data-clip-intent` — and on the readout's text, never on the clock: under
 * the software renderer this page draws about a frame a second, so a wait in seconds would be
 * measuring the renderer.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { silenceCounter } from './qa-counter.mjs';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || 'local/qa/playback';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
const offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', (r) => (r.url().startsWith(base) ? errors : offsite).push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
await silenceCounter(page);
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));

const pane = () => page.locator('.clips');
const loaded = (id) => page.waitForFunction(
  (k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, `cambrian:${id}`, { timeout: 120000 });
/** What the pane says it is playing, and what it says was asked for. */
const playing = () => pane().getAttribute('data-clip-playing');
const intent = () => pane().getAttribute('data-clip-intent');
/** The timeline's own readout, which is the position as the page itself states it. */
const readout = () => page.locator('.timeline output').textContent();
const paused = async () => (await page.locator('.timeline button').textContent()) === 'Resume';
/** Waits for the readout rather than reading it once: a scrub is a state change, not a clock tick. */
const atTime = (text) => page.waitForFunction(
  (t) => document.querySelector('.timeline output')?.textContent?.startsWith(t), text, { timeout: 30000 });
/**
 * A clip button by name. Not `getByRole('button', { name })`: a clip queued for rework carries a
 * badge inside its own button, so its accessible name is `Grab⚠` rather than `Grab`, and which
 * clips are badged is a fact about the roster's outstanding art rather than about this drive.
 */
const clip = (name) => page.locator('.clip-grid button').filter({ hasText: new RegExp(`^${name}\\u26a0?$`) }).first();
/** Switches creature by the roster button, and waits for the new body to be the one on stage. */
async function open(id, name) {
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  await loaded(id);
}

try {
  await page.goto(`${base}/viewer/?specimen=cambrian%3Ahallucigenia`, { waitUntil: 'networkidle', timeout: 180000 });
  await loaded('hallucigenia');

  // Nothing has been chosen yet, so each body opens on its own Idle and plays.
  assert.equal(await intent(), '', 'a fresh page has no standing selection');
  assert.equal(await playing(), 'Idle', 'and opens on the resting clip');
  assert.equal(await paused(), false, 'and is running');

  // ---- 1. choose a clip, pause it, and park two thirds of the way through ----
  await clip('Crawl').click();
  assert.equal(await playing(), 'Crawl');
  assert.equal(await intent(), 'Crawl', 'picking a clip is the selection');
  await page.locator('.timeline button').click();          // Pause
  assert.equal(await paused(), true);
  // End, then six frames back off the end: 2.000 s − 6/30 = 1.80 s of a two-second Crawl. Each
  // press is waited for, because the next one is computed from the position the page reports.
  await page.locator('.timeline input[type=range]').focus();
  await page.keyboard.press('End');
  await atTime('2.00');
  for (const t of ['1.97', '1.93', '1.90', '1.87', '1.83', '1.80']) {
    await page.keyboard.press('ArrowLeft');
    await atTime(t);
  }
  assert.match(await readout(), /^1\.80 \/ 2\.00 s$/, 'parked at 1.80 s of a 2.00 s Crawl');
  await page.screenshot({ path: path.join(out, 'playback-1-chosen.png') });

  // ---- 2. an animal with no Crawl: Idle, still paused, and the choice still standing ----
  await open('anomalocaris', 'Anomalocaris');
  assert.equal(await playing(), 'Idle', 'a body without the chosen clip falls back to its resting clip');
  assert.equal(await intent(), 'Crawl', 'and the choice is not overwritten by the fall-back');
  assert.equal(await paused(), true, 'and the pause persists across the switch');
  assert.match(await readout(), /^0\.00 \//, 'a fall-back starts at the top: 1.80 s of a Crawl means nothing in an Idle');
  assert.ok(await page.locator('.clip-fallback').isVisible(), 'and the pane says out loud what it is standing in for');
  assert.match(await page.locator('.clip-fallback').textContent(), /Crawl/);
  await page.screenshot({ path: path.join(out, 'playback-2-fallback.png') });

  // ---- 3. the next animal that has it plays it again, where it was left off ----
  await open('wiwaxia', 'Wiwaxia');
  assert.equal(await playing(), 'Crawl', 'the choice survived an animal that could not meet it');
  assert.equal(await intent(), 'Crawl');
  assert.equal(await paused(), true);
  assert.match(await readout(), /^1\.80 \/ 2\.00 s$/, 'and comes back at the frame it was left at');
  assert.equal(await page.locator('.clip-fallback').count(), 0, 'nothing is standing in here');
  await page.screenshot({ path: path.join(out, 'playback-3-returned.png') });

  // ---- and it survives a change of *model* too, which is a load of its own ----
  const model = page.locator('select[aria-label="Which model"]');
  const full = await pane().getAttribute('data-loaded-model');
  await model.selectOption({ label: 'Reduced model' });
  await page.waitForFunction((was) => {
    const el = document.querySelector('.clips');
    return el?.getAttribute('data-loaded-model') && el.getAttribute('data-loaded-model') !== was;
  }, full, { timeout: 60000 });
  assert.equal(await playing(), 'Crawl', 'swapping the model on stage holds the clip');
  assert.equal(await intent(), 'Crawl');
  assert.equal(await paused(), true);
  assert.match(await readout(), /^1\.80 \/ 2\.00 s$/, 'and the frame, which is what makes the two comparable');
  await model.selectOption({ label: 'Full model' });
  await page.waitForFunction((was) => document.querySelector('.clips')?.getAttribute('data-loaded-model') === was,
    full, { timeout: 60000 });

  // ---- 4. a shorter clip clamps, and the clamp is not written back ----
  await open('hallucigenia', 'Hallucigenia');
  await clip('Attack').click();
  await page.locator('.timeline input[type=range]').focus();
  await page.keyboard.press('End');
  await atTime('1.33');
  assert.match(await readout(), /^1\.33 \/ 1\.33 s$/, "the end of Hallucigenia's 1.333 s Attack");
  assert.equal(await paused(), true, 'a scrub parks the body, so it is paused from here on');
  await open('anomalocaris', 'Anomalocaris');
  assert.equal(await playing(), 'Attack');
  assert.match(await readout(), /^1\.10 \/ 1\.10 s$/, "clamped to the end of Anomalocaris' 1.100 s Attack, not wrapped into it");
  await open('hallucigenia', 'Hallucigenia');
  assert.match(await readout(), /^1\.33 \/ 1\.33 s$/, 'and the 1.333 s comes back: the clamp landed on what played, not on what was chosen');
  await page.screenshot({ path: path.join(out, 'playback-4-clamped.png') });

  // ---- 5. the base pose is a selection like a clip is ----
  await clip('Base pose').click();
  assert.equal(await playing(), 'base');
  assert.equal(await intent(), 'base');
  await open('waptia', 'Waptia');
  assert.equal(await playing(), 'base', 'the base pose crosses bodies with the rest of the selection');
  assert.equal(await intent(), 'base');
  assert.equal(await page.locator('.clip-fallback').count(), 0, 'every rigged body has one, so it never falls back');
  await page.screenshot({ path: path.join(out, 'playback-5-base-pose.png') });

  // ---- and it is the session's, not a saved decision ----
  await page.reload({ waitUntil: 'networkidle' });
  await loaded('waptia');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), 'cambrian:waptia', 'the URL still keeps the specimen');
  assert.equal(await intent(), '', 'a reload starts with nothing chosen');
  assert.equal(await playing(), 'Idle', 'and each body back on its own Idle');
  assert.equal(await paused(), false, 'running');

  assert.deepEqual(errors, [], 'no page errors');
  if (offsite.length) console.log(`note: ${offsite.length} off-site request(s) failed (no route out of the container): ${offsite.join(', ')}`);
  console.log('PASS: viewer playback in a browser — Crawl at 1.80 s paused carried to Wiwaxia through an Anomalocaris that has '
    + 'no Crawl, held across a model swap, Attack clamped 1.33 → 1.10 and back to 1.33, base pose sticky, '
    + 'pause held throughout, reload forgets it. '
    + `Screenshots in ${out}`);
} finally { await browser.close(); }
