/**
 * The viewer roster's section headings, driven in a real browser. `npm run eras` holds the pure
 * decision — which specimen falls in which section, alphabetised, in the right order — and this is
 * the half it cannot vouch for: that the headings actually render in the list, in the right places,
 * that they carry no button a click or a tab stop could land on, and that a creature filed under
 * one still opens on a click like any other.
 *
 * Run it against a preview build:
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   QA_BASE_URL=http://127.0.0.1:4173 node tools/viewer-sections-browser.mjs [out dir]
 *
 * The Triassic collection is the one with all four sections — the roster, *Visitors* (the standing
 * guests), *NPCs* (Cartorhynchus and the four shore animals) and *Unfinished* (the two shelved
 * bodies) — which is the case CLAUDE.md spells out and the one worth watching in a screenshot.
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || 'local/qa/viewer-sections';
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

const loaded = (key) => page.waitForFunction(
  (k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 120000 });

/** The roster list's own children, in DOM order: a heading's text, or the button that follows it. */
const listItems = () => page.locator('.specimens ul > li').evaluateAll((lis) =>
  lis.map((li) => {
    const heading = li.querySelector('h3');
    if (heading) return { kind: 'heading', text: heading.textContent };
    const b = li.querySelector('button.specimen b');
    return { kind: 'specimen', text: b?.textContent ?? '' };
  }));

try {
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent('triassic:aphaneramma')}`, { waitUntil: 'networkidle', timeout: 180000 });
  await loaded('triassic:aphaneramma');
  assert.equal(await page.locator('.collection-pick select').inputValue(), 'triassic', 'opened straight on the Triassic collection');

  const items = await listItems();
  const headings = items.filter((i) => i.kind === 'heading').map((i) => i.text);
  assert.deepEqual(headings, ['Visitors', 'NPCs', 'Unfinished'],
    `the three subtitles appear in order (got: ${headings.join(', ')})`);

  // No heading is a button: nothing a click or a tab stop can land on.
  const headingButtons = await page.locator('.specimens ul > li.specimen-heading button').count();
  assert.equal(headingButtons, 0, 'a section heading carries no button');
  // Tabbing through the list only ever lands on a `.specimen` button, never a heading.
  const tabStops = await page.locator('.specimens ul li').evaluateAll(
    (lis) => lis.map((li) => li.querySelector('button')?.className ?? null).filter(Boolean));
  assert.ok(tabStops.every((c) => c.includes('specimen')), 'every focusable row in the list is a specimen button');

  // Where each subtitle sits relative to the animals CLAUDE.md names.
  const nameAt = (name) => items.findIndex((i) => i.kind === 'specimen' && i.text === name);
  const headingAt = (title) => items.findIndex((i) => i.kind === 'heading' && i.text === title);
  assert.ok(nameAt('Mosasaurus') < headingAt('NPCs'), 'Mosasaurus sits before the NPCs heading');
  assert.ok(headingAt('Visitors') < nameAt('Archelon'), 'Visitors heads its section, before Archelon');
  assert.ok(headingAt('Visitors') < nameAt('Mosasaurus'), 'and before Mosasaurus too');
  assert.ok(nameAt('Cartorhynchus') > headingAt('NPCs') && nameAt('Cartorhynchus') < headingAt('Unfinished'),
    'Cartorhynchus sits under NPCs');
  for (const shore of ['Coelophysis', 'Macrocnemus', 'Mystriosuchus', 'Tanystropheus']) {
    assert.ok(nameAt(shore) > headingAt('NPCs') && nameAt(shore) < headingAt('Unfinished'), `${shore} sits under NPCs`);
  }
  for (const shelved of ['Askeptosaurus', 'Hybodus']) {
    assert.ok(nameAt(shelved) > headingAt('Unfinished'), `${shelved} sits under Unfinished`);
  }
  await page.screenshot({ path: path.join(out, 'sections-triassic.png') });

  // Picking a creature filed under a subtitle still opens it: the click reaches the button, not
  // the heading text sitting a few pixels above it in the same list.
  await page.getByRole('button', { name: /^Hybodus/ }).first().click();
  await loaded('triassic:hybodus');
  assert.equal(new URL(page.url()).searchParams.get('specimen'), 'triassic:hybodus', 'the URL followed the click');
  assert.equal(await page.locator('.info h2').textContent(), 'Hybodus');
  assert.match(await page.locator('.info .role').textContent(), /SHELVED/, "Hybodus' role line says it is shelved");

  await page.getByRole('button', { name: /^Archelon/ }).first().click();
  await loaded('triassic:archelon');
  assert.equal(await page.locator('.info h2').textContent(), 'Archelon');

  // A props collection has none of these flags, so it is one section and carries no subtitle.
  await page.locator('.collection-pick select').selectOption({ label: 'Triassic plants & props' });
  await page.waitForFunction(() => document.querySelector('.collection-pick select')?.value === 'triassic-props', { timeout: 30000 });
  const propItems = await listItems();
  assert.equal(propItems.filter((i) => i.kind === 'heading').length, 0, 'a props collection carries no subtitle at all');
  assert.ok(propItems.length > 0 && propItems.every((i) => i.kind === 'specimen'), 'every row is a specimen');

  assert.deepEqual(errors, [], 'no page errors');
  if (offsite.length) console.log(`note: ${offsite.length} off-site request(s) failed (no route out of the container): ${offsite.join(', ')}`);
  console.log('PASS: viewer roster sections in a browser — Visitors/NPCs/Unfinished appear in order in the Triassic list, '
    + 'no heading is focusable or clickable, Mosasaurus/Archelon/Cartorhynchus/the shore animals/the shelved pair all sit '
    + 'under the right one, a creature filed under a heading still opens on a click, and a props collection carries none. '
    + `Screenshot in ${out}`);
} finally { await browser.close(); }
