/**
 * Bend mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/bend-browser.mjs [out dir]
 *
 * Opens the viewer on **Askeptosaurus**, which is the animal the mode was built for: its head stood
 * 67.7° off its trunk, the diagnosis went wrong three times, and three defensible readings of "the
 * trunk" sat up to 43° apart (T3D-25/T3D-26). It checks what a headless test cannot:
 *
 *   - the mode opens on a rigged body, seats a span on it, guesses a chain through the rig rather
 *     than down a limb, and puts both readings on screen with the references they are between;
 *   - the handles are really on the stage: the pointer finds one by hover, a drag on it moves the
 *     span, and the drag is one undo step;
 *   - the numeric fields set the same numbers, and turning the span moves the readings — *measured*
 *     after the edit rather than predicted;
 *   - changing which bone chord the reading is between changes the answer, which is the whole
 *     point of the tool and the thing that went wrong on this animal;
 *   - the export carries the hash of the file on stage, measured in the page and equal to the hash
 *     of that file on disk, and `npm run triassic:bend` accepts it and refuses a tampered copy;
 *   - the bend survives a trip through view mode and is forgotten on reload.
 *
 * It also screenshots the span on the animal for `docs/triassic/verification/`.
 */
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = process.argv[2] || process.env.CAMBRIAN_QA_DIR || '.';
fs.mkdirSync(out, { recursive: true });
const key = 'triassic:askeptosaurus';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await silenceCounter(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = () => page.waitForFunction((k) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === k, key, { timeout: 90000 });
const field = (label) => page.locator('.bend-fields label', { hasText: label }).locator('input');
const pick = (label) => page.locator('.bend-fields label', { hasText: label }).locator('select');
/** A reading, as the panel published it: the in-plane degrees before and after the edit. */
const reading = async (which) => {
  const el = page.locator(`.bend-reading[data-reading="${which}"]`);
  return {
    before: Number(await el.getAttribute('data-before')),
    after: Number(await el.getAttribute('data-after')),
    beforeTotal: Number(await el.getAttribute('data-before-total')),
    afterTotal: Number(await el.getAttribute('data-after-total')),
  };
};
const hashOnDisk = (rel) => createHash('sha256').update(fs.readFileSync(path.join('public', rel))).digest('hex');
const measuredHash = async () => {
  await page.waitForSelector('.bend-hash[data-hash-source="measured"]', { timeout: 30000 });
  return page.locator('.bend-hash').getAttribute('data-hash');
};
/**
 * Finds a handle on the stage by hover: the editor sets the canvas cursor to `grab` over one, so a
 * sweep of synthetic pointer moves across the canvas finds where the spheres are drawn without the
 * test knowing anything about the camera. Which handle it is, the legend says once a real pointer
 * has rested there, because React renders the hover on its own clock rather than inside the sweep.
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
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /askeptosaurus\.glb$/, 'the built body is on stage');

  await page.getByRole('button', { name: 'Bend', exact: true }).click();
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(2000);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'bend', 'bend mode is in the URL');
  assert.match(await page.locator('.bend-frame-note').textContent(), /mouth socket/i, 'a body with a mouth socket is framed from it, not from its box');

  // ---- both readings are on screen, each with the references it is between ----
  const geometry = await page.locator('.bend-reading[data-reading="geometry"]').textContent();
  assert.match(geometry, /in the bend plane/, 'the geometry reading is a measured angle');
  assert.match(geometry, /traced centre/, 'and says what it is between');
  assert.match(geometry, /trace residual/, 'with its own opinion of how straight the run it followed was');
  const bonesText = await page.locator('.bend-reading[data-reading="bone-chain"]').textContent();
  assert.match(bonesText, /→/, 'the bone reading names the two chords it is between');
  const chainFrom = await pick('Chain starts at').inputValue();
  const chainTo = await pick('Chain ends at').inputValue();
  assert.ok(chainFrom && chainTo, `the span guessed a chain through the rig (${chainFrom} → ${chainTo})`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-opened.png') });

  // ---- the handles are on the stage: find one by hover, drag it, undo it ----
  const handle = await findHandle();
  assert.ok(handle, 'the pointer finds a handle on the stage by hover');
  await page.mouse.move(handle.x, handle.y); await page.waitForTimeout(400);
  const which = (await page.locator('.bend-legend li.hover').getAttribute('class'))?.split(' ')[0] ?? '';
  assert.ok(['base', 'tip', 'axis'].includes(which), `and the legend says which (${which})`);
  const spanBefore = [0, 1, 2].map(() => 0);
  for (const i of [0, 1, 2]) spanBefore[i] = Number(await field(`${which === 'axis' ? 'Base' : which === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`).inputValue());
  const rollBefore = Number(await field('Bend plane').inputValue());
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 34, handle.y - 26, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  if (which === 'axis') {
    assert.notEqual(Number(await field('Bend plane').inputValue()), rollBefore, 'dragging the axle turns the bend plane');
  } else {
    const spanAfter = [0, 1, 2].map(() => 0);
    for (const i of [0, 1, 2]) spanAfter[i] = Number(await field(`${which === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`).inputValue());
    assert.ok(spanAfter.some((v, i) => v !== spanBefore[i]), `dragging the ${which} handle moves that end of the span`);
    assert.equal(Number(await field('Bend plane').inputValue()), rollBefore, 'and leaves the bend plane alone');
  }
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'and the drag is one undo step');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(400);
  if (which === 'axis') assert.equal(Number(await field('Bend plane').inputValue()), rollBefore, 'Ctrl+Z takes the whole drag back');
  else assert.equal(Number(await field(`${which === 'base' ? 'Base' : 'Tip'} X`).inputValue()), spanBefore[0], 'Ctrl+Z takes the whole drag back');

  // ---- put the span on the neck, by the numbers, the way a reviewer reads them off the rig ----
  // chest and skull: the two ends of the run T3D-26 corrected. Typed rather than dragged, because
  // what is being checked here is that the fields and the readings agree, not the pointer.
  const neck = { base: [-0.1182, 0.0659, -1.2490], tip: [-0.5114, 0.1603, -0.5430] };
  for (const end of ['base', 'tip']) for (const i of [0, 1, 2]) {
    const f = field(`${end === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`);
    await f.fill(String(neck[end][i]));
    await f.press('Enter');
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  assert.ok(Math.abs(Number(await field('Base X').inputValue()) - neck.base[0]) < 1e-3, 'the span fields put an end exactly where they are typed');
  const onNeck = await reading('bone-chain');
  assert.ok(Number.isFinite(onNeck.before), `the bone reading has a number on the neck span (${onNeck.before}°)`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-neck.png') });

  // ---- which two chords the reading is between is the question, and it changes the answer ----
  const refPick = (side, end) => page.locator('.bend-refs label', { hasText: `${side} reference ${end}` }).locator('select');
  const firstRef = { from: await refPick('Base', 'from').inputValue(), to: await refPick('Base', 'to').inputValue() };
  await refPick('Base', 'from').selectOption('tail_00');
  await refPick('Base', 'to').selectOption('chest');
  await page.waitForTimeout(600);
  const hipToShoulder = await reading('bone-chain');
  assert.notEqual(hipToShoulder.before, onNeck.before,
    `reading the same span against a different idea of "the trunk" gives a different angle (${firstRef.from} → ${firstRef.to}: ${onNeck.before}°, tail_00 → chest: ${hipToShoulder.before}°)`);
  assert.ok(Math.abs(hipToShoulder.before - onNeck.before) > 5,
    'and by more than rounding — which is the whole reason this tool exists');
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-references.png') });

  // ---- turning the span moves the readings, and they are measured rather than predicted ----
  await field('At the base').fill('20'); await field('At the base').press('Enter'); await page.waitForTimeout(300);
  await field('At the tip').fill('20'); await field('At the tip').press('Enter'); await page.waitForTimeout(800);
  assert.match(await page.locator('.bend-readout b').first().textContent(), /^20/, 'two rates of 20° are a 20° turn across the span');
  const turned = await reading('geometry');
  assert.ok(Math.abs((turned.after - turned.before) - 20) < 1.5,
    `a 20° turn moves the geometry reading by 20° (${turned.before}° → ${turned.after}°), because both windows lie outside the span`);
  const bonesTurned = await reading('bone-chain');
  assert.notEqual(bonesTurned.after, bonesTurned.before, 'and the bone reading moves too');
  assert.equal((await page.locator('.bend-joints li').count() > 0), true, 'the per-joint table has the joints the turn is spread over');
  const joints = await page.locator('.bend-joints li code').allTextContents();
  assert.ok(joints.length >= 2, `and names them (${joints.join(', ')})`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-turned.png') });

  // ---- the hand-off: the hash is measured here and is the file's own ----
  await page.locator('.mark-note textarea').fill('browser drive: the neck turned twenty degrees, measured both ways');
  const hash = await measuredHash();
  assert.match(hash, /^[0-9a-f]{64}$/, 'the page hashed the file on stage');
  const model = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(hash, hashOnDisk(model), 'and the hash is the file\'s own, as sha256 on disk reads it');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export bend/ }).click();
  const file = path.join(out, 'askeptosaurus-bend.json');
  await (await download).saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.schema, 'bend-span/1');
  assert.equal(json.id, 'askeptosaurus');
  assert.equal(json.appliesTo, 'built', 'the export says it was placed on the built body');
  assert.equal(json.use, 'builder-measurement', 'and that a rigged body is a measurement rather than an edit');
  assert.equal(json.sha256, hash);
  assert.equal(json.sha256Source, 'measured');
  assert.equal(json.creature.rigged, true);
  assert.ok(Math.abs(json.turn.totalDegrees - 20) < 1e-3, 'the turn the panel showed is in the file');
  assert.ok(Math.abs(Math.hypot(...json.axis.vector) - 1) < 1e-4, 'the axle is a unit vector');
  assert.ok(json.axis.vectorBlenderZUp, 'and is given in the builders\' own frame as well');
  assert.ok(json.reading.geometry.before && json.reading.geometry.after, 'both geometry readings are in it');
  assert.ok(json.reading.bones.before && json.reading.bones.after, 'and both bone readings');
  assert.equal(json.reading.bones.baseReference, 'tail_00 → chest', 'named by the references they were taken between');
  assert.ok(json.joints.length >= 2, 'the per-joint table is in it');
  assert.ok(Math.abs(json.joints.reduce((s, j) => s + j.localDegrees, 0) - 20) < 1e-2, 'and adds up to the whole turn');
  assert.equal(json.note, 'browser drive: the neck turned twenty degrees, measured both ways');

  // ---- the consumer: accepts the file on this body, refuses a tampered one ----
  const check = (f) => spawnSync('npm', ['run', '--silent', 'triassic:bend', '--', f], { encoding: 'utf8' });
  const accepted = check(file);
  assert.equal(accepted.status, 0, `npm run triassic:bend accepts the file it was measured on:\n${accepted.stdout}${accepted.stderr}`);
  assert.match(accepted.stdout, /re-measuring it here gives the readings it recorded/, 'and re-measures the same readings over the actual mesh and rig');
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-check.txt'), accepted.stdout);
  const tampered = path.join(out, 'askeptosaurus-bend-stale.json');
  fs.writeFileSync(tampered, JSON.stringify({ ...json, sha256: 'f'.repeat(64) }, null, 2));
  const refused = check(tampered);
  assert.notEqual(refused.status, 0, 'and refuses one whose hash no longer matches the body');
  assert.match(refused.stderr, /has changed since the span was placed/, 'saying why');

  // ---- through view mode and back, then a reload ----
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  await page.getByRole('button', { name: 'Bend', exact: true }).click(); await page.waitForTimeout(1500);
  assert.equal(Number(await field('At the base').inputValue()), 20, 'the bend survives a trip through view mode');
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'bend', 'a reload keeps the mode');
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(1500);
  assert.equal(Number(await field('At the base').inputValue()), 0, 'and starts again from no turn at all');

  // ---- the worked case, captured: three defensible readings of one animal's trunk ----
  //
  // This is the argument the mode was built out of. The span is the neck T3D-26 corrected; the
  // reading is taken three times against three chords a person could reasonably call "the trunk",
  // and once more against the head's own axis, which is what that ticket's own figure was taken
  // between. Nothing here asserts a number — what it asserts is that they *differ*, which is the
  // finding — and the numbers are written out for `docs/triassic/verification/`.
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(500);
  for (const end of ['base', 'tip']) for (const i of [0, 1, 2]) {
    const f = field(`${end === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`);
    await f.fill(String(neck[end][i]));
    await f.press('Enter');
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  const rows = [];
  for (const [from, to] of [['body', 'chest'], ['tail_00', 'chest'], ['chest', 'neck_00']]) {
    await refPick('Base', 'from').selectOption(from);
    await refPick('Base', 'to').selectOption(to);
    await page.waitForTimeout(600);
    const r = await reading('bone-chain');
    const text = await page.locator('.bend-reading[data-reading="bone-chain"] .bend-reading-value').textContent();
    rows.push({ base: `${from} → ${to}`, tip: await refPick('Tip', 'from').inputValue() + ' → ' + await refPick('Tip', 'to').inputValue(), inPlane: r.before, total: r.beforeTotal, text: text.trim() });
    await page.locator('.bend-panel').evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `askeptosaurus-bend-trunk-${from}.png`) });
  }
  // Compared on the *total* angle rather than the in-plane one: how far apart two definitions are
  // is a question about directions, not about the plane a bend happens to be being edited in.
  const spread = Math.max(...rows.map((r) => r.total)) - Math.min(...rows.map((r) => r.total));
  assert.ok(spread > 20, `three defensible readings of this animal's trunk disagree by ${spread.toFixed(1)}°, which is the finding this mode exists for`);
  const geom = await reading('geometry');
  const geomText = await page.locator('.bend-reading[data-reading="geometry"]').textContent();
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-readings.txt'),
    [`span ${JSON.stringify(neck)}`,
      ...rows.map((r) => `bone   ${r.base.padEnd(20)} vs ${r.tip.padEnd(20)} ${r.text}`),
      `geometry  ${geom.before}° in plane, ${geom.beforeTotal}° in all`,
      geomText.replace(/\s+/g, ' ').trim(),
      `spread across the three trunk readings: ${spread.toFixed(1)}°`].join('\n') + '\n');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: bend mode — a span placed on the neck, both readings named and measured, the');
  console.log('      references swapped and the answer with them, a 20° turn read back as 20°, the');
  console.log('      export hashed in the page, the consumer accepting it and refusing a stale copy,');
  console.log(`      and three defensible readings of this animal's trunk ${spread.toFixed(1)}° apart on one span`);
} finally {
  await browser.close();
}
