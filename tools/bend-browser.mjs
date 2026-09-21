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
 *   - the panel says **which body the numbers describe**, and warns where that body's rest already
 *     carries its builder's own correction — which on this animal is the whole 67.7°;
 *   - the handles are really on the stage: the pointer finds one by hover, a drag on it moves the
 *     span or aims a plane, and the drag is one undo step;
 *   - the numeric fields set the same numbers, and aiming the tip plane moves the readings —
 *     *measured* after the edit rather than predicted;
 *   - changing which bone chord the reading is between changes the answer, which is the whole
 *     point of the tool and the thing that went wrong on this animal;
 *   - the per-joint table is the shape `carry_rest` consumes: bones in chain order whose local
 *     steps add back up to the whole turn;
 *   - **the headline**, on the untouched original pose: the two planes seated on the body, aimed
 *     the same way, and the run between them measured straight over the warped mesh;
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
/** How far apart the two planes are aimed, and how far apart the body's own curve had them. */
const planes = async () => {
  const el = page.locator('.bend-readout[data-apart]');
  return {
    apart: Number(await el.getAttribute('data-apart')),
    before: Number(await el.getAttribute('data-apart-before')),
    turn: Number(await el.getAttribute('data-turn')),
  };
};
/**
 * Type a direction into one plane's three fields.
 *
 * Three passes, because a plane *is* a direction and the document keeps it as a unit vector: each
 * field sets one component of the direction and the other two are re-normalised with it, so one
 * sweep of three fields lands near the asked-for aim rather than on it. It converges immediately —
 * the asked-for direction is the fixed point — and the pointer, which drags the whole direction at
 * once, has no such problem.
 */
const aimPlane = async (which, v, passes = 5) => {
  for (let pass = 0; pass < passes; pass++) for (const i of [0, 1, 2]) {
    const f = field(`${which} plane ${'XYZ'[i]}`);
    await f.fill(String(v[i]));
    await f.press('Enter');
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
};
const planeValue = async (which) => {
  const v = [];
  for (const i of [0, 1, 2]) v.push(Number(await field(`${which} plane ${'XYZ'[i]}`).inputValue()));
  return v;
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

  // ---- which body the numbers describe, and the warning this animal needs ----
  const bodyNote = page.locator('.bend-body-note');
  assert.equal(await bodyNote.getAttribute('data-applies-to'), 'built', 'the panel knows it is on the shipped body');
  assert.equal(await bodyNote.getAttribute('data-corrected'), 'yes', 'and that this body\'s rest was moved before binding');
  const warned = await bodyNote.textContent();
  assert.match(warned, /already carries one/i, 'so it says a correction aimed here is aimed on a body that already carries one');
  assert.match(warned, /Original pose/i, 'and points at the untouched generation by the name the Model control gives it');

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
  assert.ok(['base', 'tip', 'baseAim', 'tipAim'].includes(which), `and the legend says which (${which})`);
  const aiming = which === 'baseAim' || which === 'tipAim';
  const label = which === 'base' || which === 'baseAim' ? 'Base' : 'Tip';
  const before = aiming ? await planeValue(label) : [0, 1, 2].map(() => 0);
  if (!aiming) for (const i of [0, 1, 2]) before[i] = Number(await field(`${label} ${'XYZ'[i]}`).inputValue());
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 34, handle.y - 26, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = aiming ? await planeValue(label) : await Promise.all([0, 1, 2].map((i) => field(`${label} ${'XYZ'[i]}`).inputValue().then(Number)));
  assert.ok(after.some((v, i) => v !== before[i]),
    aiming ? `dragging the ${which} handle aims that plane` : `dragging the ${which} handle moves that end of the span`);
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isEnabled(), 'and the drag is one undo step');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(400);
  const undone = aiming ? await planeValue(label) : await Promise.all([0, 1, 2].map((i) => field(`${label} ${'XYZ'[i]}`).inputValue().then(Number)));
  assert.ok(undone.every((v, i) => Math.abs(v - before[i]) < 1e-6), 'Ctrl+Z takes the whole drag back');

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

  // ---- aiming the tip plane bends the body, and the readings are measured rather than predicted ----
  const rest = await planeValue('Base');
  await aimPlane('Tip', [0, 1, 0]);
  const aimed = await planes();
  assert.ok(aimed.apart > 5, `the two planes are now aimed ${aimed.apart}° apart`);
  const turnedGeom = await reading('geometry');
  assert.notEqual(turnedGeom.after, turnedGeom.before, 'the geometry reading moves with the bend');
  const bonesTurned = await reading('bone-chain');
  assert.notEqual(bonesTurned.after, bonesTurned.before, 'and so does the bone reading');
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-turned.png') });

  // ---- the per-joint table: the shape `carry_rest` consumes ----
  const joints = await page.locator('.bend-joints li').evaluateAll((els) => els
    .filter((el) => el.querySelector('code'))
    .map((el) => ({ bone: el.querySelector('code').textContent, local: el.querySelector('b').textContent, accumulated: el.querySelector('small').textContent })));
  assert.ok(joints.length >= 2, `the per-joint table has the joints the turn is spread over (${joints.map((j) => j.bone).join(', ')})`);
  const localSum = joints.reduce((s, j) => s + Number(j.local.replace('°', '')), 0);
  // Against the *turn*, which is the angle between the tip plane's rest and its aim — not against
  // how far apart the two planes are aimed, which is the straightening target and a different number.
  const total = (await planes()).turn;
  assert.ok(Math.abs(localSum - total) < 0.3, `and the local steps add back up to the whole turn (${localSum.toFixed(1)}° against ${total}°)`);
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-joints.txt'),
    ['the per-joint table, in chain order — a bone name and a local rotation, which is what',
      '`uncurl` returns and `carry_rest` consumes in tools/triassic/creatures/askeptosaurus/build.py',
      '', ...joints.map((j) => `  ${j.bone.padEnd(12)} ${j.local.padStart(8)}   ${j.accumulated}`),
      '', `  local steps sum to ${localSum.toFixed(2)}° against a whole turn of ${total}°`].join('\n') + '\n');

  // ---- the hand-off: the hash is measured here and is the file's own ----
  await page.locator('.mark-note textarea').fill('browser drive: the tip plane aimed off the body’s own heading, measured both ways');
  const hash = await measuredHash();
  assert.match(hash, /^[0-9a-f]{64}$/, 'the page hashed the file on stage');
  const model = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(hash, hashOnDisk(model), 'and the hash is the file\'s own, as sha256 on disk reads it');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export bend/ }).click();
  const file = path.join(out, 'askeptosaurus-bend.json');
  await (await download).saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.schema, 'bend-span/2');
  assert.equal(json.id, 'askeptosaurus');
  assert.equal(json.appliesTo, 'built', 'the export says it was placed on the built body');
  assert.equal(json.use, 'builder-measurement', 'and that a rigged body is a measurement rather than an edit');
  assert.equal(json.sha256, hash);
  assert.equal(json.sha256Source, 'measured');
  assert.equal(json.creature.rigged, true);
  assert.ok(Math.abs(json.planes.apartDegrees - aimed.apart) < 0.02, `the two planes the panel showed are in the file (${json.planes.apartDegrees} vs ${aimed.apart}; base ${JSON.stringify(json.planes.baseNormal)} tip ${JSON.stringify(json.planes.tipNormal)})`);
  assert.ok(Math.abs(Math.hypot(...json.planes.tipNormal) - 1) < 1e-4, 'each as the unit direction it is');
  assert.ok(json.planes.tipRest, 'with the body’s own heading there beside the aim');
  assert.ok(Math.abs(Math.hypot(...json.axis.vector) - 1) < 1e-4, 'the axle is a unit vector');
  assert.ok(json.axis.vectorBlenderZUp, 'and is given in the builders\' own frame as well');
  assert.equal(typeof json.axis.twistDegrees, 'number', 'with how much of the aim is a twist rather than a bend');
  assert.ok(json.reading.geometry.before && json.reading.geometry.after, 'both geometry readings are in it');
  assert.ok(json.reading.bones.before && json.reading.bones.after, 'and both bone readings');
  assert.equal(json.reading.bones.baseReference, 'tail_00 → chest', 'named by the references they were taken between');
  assert.ok(json.joints.length >= 2, 'the per-joint table is in it');
  assert.ok(Math.abs(json.joints.reduce((s, j) => s + j.localDegrees, 0) - json.turn.totalDegrees) < 1e-2, 'and adds up to the whole turn');
  assert.match(json.note, /^browser drive/);

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
  // A file written against the turn rates the planes replaced is refused outright, by name.
  const old = path.join(out, 'askeptosaurus-bend-v1.json');
  fs.writeFileSync(old, JSON.stringify({ ...json, schema: 'bend-span/1' }, null, 2));
  const rates = check(old);
  assert.notEqual(rates.status, 0, 'and one from before the two planes');
  assert.match(rates.stderr, /written before the two planes/, 'saying that too');

  // ---- through view mode and back, then a reload ----
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  await page.getByRole('button', { name: 'Bend', exact: true }).click(); await page.waitForTimeout(1500);
  assert.ok(Math.abs((await planes()).apart - aimed.apart) < 0.02, 'the bend survives a trip through view mode');
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'bend', 'a reload keeps the mode');
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(1500);
  // "No bend" is the *turn* at zero, not the two planes at zero: a freshly seated pair on a curled
  // animal is as far apart as that animal's own curve, which is the measurement rather than an edit.
  const fresh = await planes();
  assert.ok(fresh.turn < 0.02, `and starts again from no bend at all (turn ${fresh.turn}°, planes ${fresh.apart}° apart — the body's own curve)`);
  void rest;

  // ---- the worked case, captured: three defensible readings of one animal's trunk ----
  //
  // This is the argument the mode was built out of. The span is the neck T3D-26 corrected; the
  // reading is taken three times against three chords a person could reasonably call "the trunk".
  // Nothing here asserts a number — what it asserts is that they *differ*, which is the finding —
  // and the numbers are written out for `docs/triassic/verification/`.
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
  // is a question about directions, not about the plane a bend happens to be being read in.
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

  // ---- the headline: the unbent body, and two planes aimed the same way ----
  //
  // The shipped body's rest already carries T3D-26's correction (`carry` in its validation.json:
  // the head reads 4.17° off the trunk's run at rest where the generation had it at 67.68°), so
  // the correction cannot be aimed on it. The original pose is the generation before any of that,
  // republished by `tools/triassic/base-poses.mjs` and offered by the Model control. It carries no
  // rig — the per-joint table above is the rigged body's, because a table of bone rotations needs
  // bones — and it is the geometry the correction was measured from.
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(400);
  await page.getByLabel('Which model').selectOption('origpose');
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.getByRole('button', { name: 'Bend', exact: true }).click();
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-applies-to'), 'origpose', 'the panel knows it is on the untouched generation');
  assert.match(await page.locator('.bend-body-note').textContent(), /before the builder moved anything/i, 'and says so plainly');
  assert.equal(await page.locator('.bend-reading[data-reading="bone-chain"]').count(), 0, 'a body with no rig has only the geometry\'s answer');

  // The span on the generation's own neck: two points measured off this file rather than carried
  // across from the shipped body, because the two bodies are not in the same shape or frame.
  const rawNeck = { base: [0.1011, -0.0066, 0.2627], tip: [0.3465, -0.0815, 0.4222] };
  for (const end of ['base', 'tip']) for (const i of [0, 1, 2]) {
    const f = field(`${end === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`);
    await f.fill(String(rawNeck[end][i]));
    await f.press('Enter');
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(900);
  // At the default window and reach the traces wander on this curled generation and the panel says
  // so in orange. That warning is the tool working: widen the window and narrow the reach until
  // both residuals come under the bar, and only then believe the angle.
  const wandered = await page.locator('.bend-residual').first().textContent();
  assert.match(wandered, /wandered/, `the default reading on this curled generation is flagged rather than reported (${wandered.trim()})`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-origpose.png') });
  for (const [label, value] of [['Window', '26'], ['Reach', '2']]) {
    const f = field(label);
    await f.fill(value);
    await f.press('Enter');
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Seat the planes on the body', exact: true }).click();
  await page.waitForTimeout(1200);
  const settled = await page.locator('.bend-residual').first().textContent();
  assert.ok(!/wandered/.test(settled), `and at 26% window and 2% reach both traces come under the bar (${settled.trim()})`);
  const curved = await planes();
  const curvedGeom = await reading('geometry');
  assert.ok(curved.before > 30, `the two planes, seated on the body, are ${curved.before}° apart — the animal's own curve across this span`);
  assert.ok(Math.abs(curvedGeom.before - curved.before) < 1.5,
    `and say the same thing the geometry reading does (${curvedGeom.before}°), because they are seated on the same two traced runs`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-origpose-seated.png') });

  // Aim both planes the same way by hand, by typing the base plane's own direction into the tip
  // plane's fields. This is the owner's sentence carried out literally.
  const baseAim = await planeValue('Base');
  await aimPlane('Tip', baseAim);
  const straightened = await planes();
  assert.ok(straightened.apart < 0.5, `aiming both planes the same way by hand leaves them ${straightened.apart}° apart`);
  const straightGeom = await reading('geometry');
  assert.ok(Math.abs(straightGeom.after) < 5,
    `and the run between them comes straight, measured over the warped mesh (${straightGeom.before}° → ${straightGeom.after}°)`);

  // The button is the same act in one press, and it lands exactly rather than nearly: the fields
  // set one component of a direction at a time and the other two are re-normalised with them.
  await page.getByRole('button', { name: 'No bend', exact: true }).click(); await page.waitForTimeout(700);
  const undoneBend = await planes();
  assert.ok(undoneBend.turn < 0.02, `No bend puts the tip plane back on the body's own heading (turn ${undoneBend.turn}°)`);
  assert.ok(undoneBend.apart > 30, 'and the planes are the animal\'s own curve apart again');
  await page.getByRole('button', { name: 'Straighten it', exact: true }).click(); await page.waitForTimeout(1200);
  const byButton = await planes();
  assert.ok(byButton.apart < 0.05, `Straighten it aims the tip plane at the base plane in one press (${byButton.apart}° apart)`);
  const buttonGeom = await reading('geometry');
  assert.ok(Math.abs(buttonGeom.after) < 5,
    `and the run between them is measured straight over the warped mesh (${buttonGeom.before}° → ${buttonGeom.after}°)`);
  assert.ok(Math.abs(byButton.turn - curved.before) < 1.5,
    `the turn that gets there is the curve the body had (${byButton.turn}° against ${curved.before}°)`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-straightened.png') });

  const origposeHash = await measuredHash();
  const origposeModel = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(origposeHash, hashOnDisk(origposeModel), 'the generation’s own hash is measured in the page too');
  const basePoses = JSON.parse(fs.readFileSync('src/content/triassic/base-poses.json', 'utf8'));
  assert.equal(origposeHash, basePoses.find((b) => b.id === 'askeptosaurus')?.sha256, 'and agrees with the manifest that publishes this file');
  const origDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export bend/ }).click();
  const origFile = path.join(out, 'askeptosaurus-origpose-bend.json');
  await (await origDownload).saveAs(origFile);
  const origJson = JSON.parse(fs.readFileSync(origFile, 'utf8'));
  assert.equal(origJson.appliesTo, 'origpose', 'the export says which body it was measured on');
  assert.equal(origJson.use, 'builder-measurement', 'and that it is a measurement for the builder, not an edit to a published copy');
  assert.equal(origJson.creature.rigged, false, 'on a body with no rig');
  assert.ok(origJson.planes.apartDegrees < 0.05, 'with the two planes aimed the same way');
  const origAccepted = check(origFile);
  assert.equal(origAccepted.status, 0, `and npm run triassic:bend accepts it:\n${origAccepted.stdout}${origAccepted.stderr}`);
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-origpose-check.txt'), origAccepted.stdout);

  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-straightening.txt'),
    ['Askeptosaurus, the untouched original pose (askeptosaurus.origpose.glb) — the generation',
      'before T3D-26 carried the head\'s aim into the bind, which is the geometry that correction',
      'was measured from and the body the shipped one no longer is.',
      '',
      `  span                  ${JSON.stringify(rawNeck.base)} → ${JSON.stringify(rawNeck.tip)}`,
      '  reading               window 26% of the body, reach 2% — at the defaults both traces wandered',
      '                        on this curled generation and the panel said so in orange',
      `  planes as seated      ${curved.before.toFixed(2)}° apart — the animal's own curve across this span`,
      `  geometry, as seated   ${curvedGeom.before}° in plane, ${curvedGeom.beforeTotal}° in all`,
      `  planes aimed by hand  ${straightened.apart.toFixed(2)}° apart, geometry ${straightGeom.after}° in plane`,
      `  the Straighten button ${byButton.apart.toFixed(2)}° apart, turn ${byButton.turn.toFixed(2)}°,`,
      `                        geometry ${buttonGeom.before}° → ${buttonGeom.after}° in plane, measured over the warped mesh`,
      '',
      'Aiming both planes the same way is the whole act: the bend is the rotation carrying the tip',
      'end\'s own heading onto the tip plane\'s aim, so with the two aimed alike the head\'s heading is',
      'turned onto the trunk\'s and the run between them comes straight. Nothing at the base cut',
      'moves, whatever the planes are aimed at, because the rotation there is identity by construction.'].join('\n') + '\n');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: bend mode — the panel names the body and warns that the shipped rest already');
  console.log('      carries its builder\'s correction; a handle found and dragged and undone; a span');
  console.log(`      on the neck with three trunk readings ${spread.toFixed(1)}° apart; a per-joint table in chain`);
  console.log('      order summing to the turn; the export hashed in the page, accepted by the consumer');
  console.log('      and refused stale or written against the old rates; and on the untouched original');
  console.log(`      pose, a neck ${curved.before.toFixed(1)}° off its trunk, two planes aimed the same way, and the`);
  console.log(`      run between them measured ${buttonGeom.after}° in plane over the warped mesh`);
} finally {
  await browser.close();
}
