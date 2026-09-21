/**
 * Bend mode, driven in a real browser. Run against a served build:
 *   npm run build && npx vite preview --port 4173 &  QA_BASE_URL=http://127.0.0.1:4173 node tools/bend-browser.mjs [out dir]
 *
 * Two animals, because the mode now opens on two different kinds of body.
 *
 * **Askeptosaurus** is the animal the mode was built for: its head stood 67.7° off its trunk, the
 * diagnosis went wrong three times, and three defensible readings of "the trunk" sat up to 43°
 * apart (T3D-25/T3D-26). A bend is aimed on a body no builder has moved, and this animal's shipped
 * rest already carries that whole correction — so bend mode **opens on its original pose**, from
 * the Bend button and from a `?mode=bend` deep link alike, both of which go through `opening()`.
 * That is the first thing checked here.
 *
 * It is not a **cage**, though: the mode opens on the unbent body, and its panel carries its own
 * Model control so a reviewer can go back to the built one — where the bone chain's answer, the
 * per-joint table and the corrected-body warning live. The drive takes that control both ways, and
 * uses it as the regression guard for the one-commit mode-and-model swap that used to leave the
 * panel showing one body's numbers over another body's name.
 *
 * On Askeptosaurus it then checks what a headless test cannot:
 *   - the panel says which body the numbers describe, and that it is the untouched generation;
 *   - the handles are really on the stage: the pointer finds one by hover, a drag on it moves the
 *     span or aims a plane, and the drag is one undo step;
 *   - **the headline**: the two planes seated on the body, aimed the same way, and the run between
 *     them measured straight over the warped mesh — measured after the edit, never predicted;
 *   - the trace's own residual is flagged rather than reported at the defaults, and Window and
 *     Reach bring it under the bar;
 *   - the export carries the hash of the file on stage, measured in the page and equal to the hash
 *     of that file on disk, and `npm run triassic:bend` accepts it;
 *   - the bend survives a trip through view mode and is forgotten on reload.
 *
 * **Mixosaurus** publishes no original pose and no generation, so bend mode opens straight on its
 * built body — the other way into the rigged half, and the one that needs no swap. It carries the
 * per-joint table `carry_rest` consumes and an export that says `built`, accepted by the consumer
 * and refused when it is stale or written against the turn rates the two planes replaced.
 *
 * And on both: **the pointer scheme**. Left-drag on a handle moves that handle and leaves the
 * camera exactly where it was, left-drag on empty canvas orbits about a fixed target, right-drag
 * pans — which is the button bend mode had no binding for at all until now.
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
/**
 * The rigged half of the mode has to be driven on an animal bend mode still opens on its built
 * body — one that publishes neither an original pose nor a raw generation, since `opening()`
 * prefers either of those. Mixosaurus is such a body, and its rest was never moved.
 */
const rigKey = 'triassic:mixosaurus';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await silenceCounter(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', muted: true, music: false })));
const loaded = (k = key) => page.waitForFunction((want) => document.querySelector('.clips')?.getAttribute('data-loaded-specimen') === want, k, { timeout: 90000 });
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
/** Both ends of the span, typed rather than dragged, where what is being checked is the numbers. */
const typeSpan = async (span) => {
  for (const end of ['base', 'tip']) for (const i of [0, 1, 2]) {
    const f = field(`${end === 'base' ? 'Base' : 'Tip'} ${'XYZ'[i]}`);
    await f.fill(String(span[end][i]));
    await f.press('Enter');
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
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
/**
 * Where the camera is and what it is looking at. An **orbit** swings the position about a target
 * that stays put; a **pan** carries the two together. Neither number is drawn anywhere, so the
 * scene hands them over on `window.__viewerScene`, the way the game does on `__cambrian`.
 */
const cam = () => page.evaluate(() => window.__viewerScene.cameraState());
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** A spot on the canvas with none of the editor's handles under it — where a press is the camera's. */
const emptySpot = () => page.evaluate(() => {
  const canvas = document.querySelector('.viewer-canvas');
  const r = canvas.getBoundingClientRect();
  for (const [fx, fy] of [[.14, .18], [.86, .18], [.14, .82], [.86, .82], [.5, .1]]) {
    const x = r.width * fx, y = r.height * fy;
    if (!window.__viewerScene.bendPick(x, y)) return { x: r.left + x, y: r.top + y };
  }
  return null;
});
/**
 * The pointer scheme, driven on whatever body is on stage. Run **last** in a pass: an orbit and a
 * pan leave OrbitControls' damping unwinding for many frames, and under the software renderer that
 * is several seconds, so anything measured afterwards would be measured on a moving camera.
 */
const drivePointerScheme = async (name) => {
  const empty = await emptySpot();
  assert.ok(empty, `${name}: there is a spot on the canvas with no handle under it`);
  await page.mouse.move(empty.x, empty.y); await page.waitForTimeout(250);
  const rest = await cam();
  assert.equal(rest.scheme, 'view', `${name}: bend mode runs on the view scheme — left orbits, right pans`);
  assert.equal(rest.orbit, true, 'and the orbit is live where the pointer is not on a handle');
  await page.mouse.down();
  await page.mouse.move(empty.x + 150, empty.y + 50, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const orbited = await cam();
  assert.ok(apart(orbited.position, rest.position) > 0.05,
    `${name}: a left-drag on empty canvas orbits (the camera moved ${apart(orbited.position, rest.position).toFixed(3)})`);
  assert.ok(apart(orbited.target, rest.target) < 0.02, 'about a target that stays where it is — which is what makes it an orbit and not a pan');

  await page.mouse.move(empty.x, empty.y); await page.waitForTimeout(250);
  const beforePan = await cam();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(empty.x + 120, empty.y - 60, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(400);
  const panned = await cam();
  assert.ok(apart(panned.target, beforePan.target) > 0.05,
    `${name}: a right-drag pans — the camera's target moved ${apart(panned.target, beforePan.target).toFixed(3)}`);
  return { orbit: apart(orbited.position, rest.position), pan: apart(panned.target, beforePan.target) };
};
const check = (f) => spawnSync('npm', ['run', '--silent', 'triassic:bend', '--', f], { encoding: 'utf8' });

try {
  // ============================================================================================
  // Askeptosaurus — the body a bend is aimed on
  // ============================================================================================
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /askeptosaurus\.glb$/, 'the specimen opens on its built body');

  // ---- the Bend button puts the original pose on stage, because that is what a bend is aimed on ----
  await page.getByRole('button', { name: 'Bend', exact: true }).click();
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  // The button changes the body as well as the mode, and the panel measures whatever is on stage —
  // so wait for the swap to land rather than for a number of milliseconds.
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForTimeout(2500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'bend', 'bend mode is in the URL');
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /askeptosaurus\.origpose\.glb$/,
    'the Bend button swaps the stage to the untouched generation — the shipped rest already carries T3D-26\'s correction');
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-applies-to'), 'origpose', 'and the panel knows which body it is on');
  assert.match(await page.locator('.bend-body-note').textContent(), /before the builder moved anything/i, 'and says so plainly');
  assert.equal(await page.locator('.bend-reading[data-reading="bone-chain"]').count(), 0, 'a body with no rig has only the geometry\'s answer');
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-opened.png') });

  // ---- and a deep link lands on the same body, because both go through `opening()` ----
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(key)}&mode=bend`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded();
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForTimeout(2500);
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /askeptosaurus\.origpose\.glb$/,
    'a ?mode=bend deep link opens on the original pose too');
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-applies-to'), 'origpose', 'and says the same thing about it');
  const framed = await page.locator('.bend-frame-note').textContent();
  assert.ok(framed.trim().length > 0, `the panel says where the frame came from (${framed.replace(/\s+/g, ' ').trim().slice(0, 60)}…)`);
  // **And where it has not earned which end is the head, it says so.** This is the body it went
  // wrong on: the published original pose carries no rig and so no mouth socket, and there is no
  // authored yaw for it, so the box is all there is — and the box picks the axis and never the end.
  assert.equal(await page.locator('.bend-frame-note').getAttribute('data-forward-earned'), 'no',
    'the box has not earned which end is the head on this body');
  assert.match(await page.locator('.bend-frame-unearned').textContent(), /fallback and not a reading/,
    'and the panel asks about the head end rather than stating it');

  // ---- the handles are on the stage: find one by hover, drag it, undo it ----
  const handle = await findHandle();
  assert.ok(handle, 'the pointer finds a handle on the stage by hover');
  await page.mouse.move(handle.x, handle.y); await page.waitForTimeout(400);
  const which = (await page.locator('.bend-legend li.hover').getAttribute('class'))?.split(' ')[0] ?? '';
  assert.ok(['base', 'tip', 'baseAim', 'tipAim'].includes(which), `and the legend says which (${which})`);
  // The camera as the handle drag starts. Nothing has orbited yet, so it is at rest from framing
  // and any difference afterwards is the drag's and nobody else's.
  const stillCam = await cam();
  assert.equal(stillCam.orbit, false, 'the orbit is suspended while the pointer sits on a handle');
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
  // ---- and the drag was a drag on a handle, not on the view ----
  const afterHandle = await cam();
  assert.ok(apart(afterHandle.position, stillCam.position) < 1e-3,
    `dragging a handle across the screen left the camera where it was (moved ${apart(afterHandle.position, stillCam.position).toExponential(2)})`);
  assert.ok(apart(afterHandle.target, stillCam.target) < 1e-3, 'and looking at the same place');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(400);
  const undone = aiming ? await planeValue(label) : await Promise.all([0, 1, 2].map((i) => field(`${label} ${'XYZ'[i]}`).inputValue().then(Number)));
  assert.ok(undone.every((v, i) => Math.abs(v - before[i]) < 1e-6), 'Ctrl+Z takes the whole drag back');

  // ---- the headline: the unbent body, and two planes aimed the same way ----
  //
  // The shipped body's rest already carries T3D-26's correction (`carry` in its validation.json:
  // the head reads 4.17° off the trunk's run at rest where the generation had it at 67.68°), so
  // the correction cannot be aimed on it. This is the generation before any of that, republished
  // by `tools/triassic/base-poses.mjs`. It carries no rig — a table of bone rotations needs bones,
  // which is what the Mixosaurus pass below is for — and it is the geometry the correction was
  // measured from.
  //
  // The span on the generation's own neck: two points measured off this file.
  const rawNeck = { base: [0.1011, -0.0066, 0.2627], tip: [0.3465, -0.0815, 0.4222] };
  await typeSpan(rawNeck);
  assert.ok(Math.abs(Number(await field('Base X').inputValue()) - rawNeck.base[0]) < 1e-3, 'the span fields put an end exactly where they are typed');
  // At the default window and reach the traces wander on this curled generation and the panel says
  // so in orange. That warning is the tool working: widen the window and narrow the reach until
  // both residuals come under the bar, and only then believe the angle.
  const wandered = await page.locator('.bend-residual').first().textContent();
  assert.match(wandered, /wandered/, `the default reading on this curled generation is flagged rather than reported (${wandered.trim()})`);
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-origpose.png') });
  for (const [label2, value] of [['Window', '26'], ['Reach', '2']]) {
    const f = field(label2);
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

  // ---- the hand-off: the hash is measured here and is the file's own ----
  await page.locator('.mark-note textarea').fill('browser drive: both planes aimed the same way on the untouched generation');
  const origposeHash = await measuredHash();
  const origposeModel = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(origposeHash, hashOnDisk(origposeModel), 'the generation’s own hash is measured in the page');
  const basePoses = JSON.parse(fs.readFileSync('src/content/triassic/base-poses.json', 'utf8'));
  assert.equal(origposeHash, basePoses.find((b) => b.id === 'askeptosaurus')?.sha256, 'and agrees with the manifest that publishes this file');
  const origDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export bend/ }).click();
  const origFile = path.join(out, 'askeptosaurus-origpose-bend.json');
  await (await origDownload).saveAs(origFile);
  const origJson = JSON.parse(fs.readFileSync(origFile, 'utf8'));
  assert.equal(origJson.schema, 'bend-span/2');
  assert.equal(origJson.id, 'askeptosaurus');
  assert.equal(origJson.appliesTo, 'origpose', 'the export says which body it was measured on');
  assert.equal(origJson.use, 'builder-measurement', 'and that it is a measurement for the builder, not an edit to a published copy');
  assert.equal(origJson.creature.rigged, false, 'on a body with no rig');
  assert.ok(origJson.planes.apartDegrees < 0.05, 'with the two planes aimed the same way');
  assert.ok(Math.abs(Math.hypot(...origJson.axis.vector) - 1) < 1e-4, 'the axle is a unit vector');
  assert.ok(origJson.axis.vectorBlenderZUp, 'and is given in the builders\' own frame as well');
  const origAccepted = check(origFile);
  assert.equal(origAccepted.status, 0, `and npm run triassic:bend accepts it:\n${origAccepted.stdout}${origAccepted.stderr}`);
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-origpose-check.txt'), origAccepted.stdout);

  // ---- through view mode and back, then a reload ----
  await page.getByRole('button', { name: /Done/ }).click(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('mode'), null, 'view mode drops the URL flag');
  await page.getByRole('button', { name: 'Bend', exact: true }).click(); await page.waitForTimeout(1500);
  assert.ok(Math.abs((await planes()).apart - byButton.apart) < 0.02, 'the bend survives a trip through view mode');
  await page.reload({ waitUntil: 'networkidle' }); await loaded();
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'bend', 'a reload keeps the mode');
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(1500);
  // "No bend" is the *turn* at zero, not the two planes at zero: a freshly seated pair on a curled
  // animal is as far apart as that animal's own curve, which is the measurement rather than an edit.
  const fresh = await planes();
  assert.ok(fresh.turn < 0.02, `and starts again from no bend at all (turn ${fresh.turn}°, planes ${fresh.apart}° apart — the body's own curve)`);

  // ---- the pointer scheme on this body ----
  // Before the model swap below rather than after it: everything the swap checks is a number off
  // the panel, and nothing measured in screen pixels follows a pan.
  const rawPointer = await drivePointerScheme('origpose');
  await page.screenshot({ path: path.join(out, 'askeptosaurus-bend-panned.png') });
  await page.evaluate(() => window.__viewerScene.resetCamera());
  await page.waitForTimeout(400);

  // ---- and the mode is not a cage: its own Model control goes back to the built body ----
  //
  // `opening()` sends a reviewer here to the original pose, which is right — that is where a
  // correction is aimed. But the mode's headline is the two readings *side by side*, and the bone
  // chain, the per-joint table and the corrected-body warning all need a rig, so the built body
  // has to stay reachable. The info card carries the Model control and an editing mode replaces
  // it, so the bend panel carries its own.
  const bendModel = page.locator('.bend-model-pick select');
  assert.equal(await bendModel.count(), 1, 'the bend panel carries its own Model control');
  await bendModel.selectOption('full');
  // The editor is unmounted while the new body loads — `ready` means the body on stage IS the body
  // the panel describes — so wait for the file and then for the panel to come back on it.
  await page.waitForFunction(() => /askeptosaurus\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForSelector('.bend-panel', { timeout: 60000 });
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-applies-to'), 'built', 'the swap takes the panel to the shipped body');
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-corrected'), 'yes', 'and it says this body\'s rest was moved before binding');
  const warned = await page.locator('.bend-body-note').textContent();
  assert.match(warned, /already carries one/i, 'so the warning built to say exactly that is shown to the person it is about');
  assert.match(warned, /Original pose/i, 'and points back at the untouched generation by name');
  // **The regression guard.** A bone-chain reading is impossible on an unrigged body and
  // unavoidable on a rigged one, so its appearance here is proof the panel re-measured on the body
  // that is now on stage rather than keeping the numbers it had. This is the fault the one-commit
  // mode-and-model swap caused, and the swap path added here is the obvious place for it to return.
  assert.equal(await page.locator('.bend-reading[data-reading="bone-chain"]').count(), 1,
    'and the bone chain\'s answer is back beside the geometry\'s, which an unrigged body cannot show');
  const chainFrom0 = await pick('Chain starts at').inputValue();
  const chainTo0 = await pick('Chain ends at').inputValue();
  assert.ok(chainFrom0 && chainTo0, `the span guessed a chain through the rig (${chainFrom0} → ${chainTo0})`);

  // ---- the worked case, on the animal it came from: three defensible readings of one trunk ----
  //
  // This is the argument the mode was built out of (T3D-25/T3D-26). The span is the neck T3D-26
  // corrected, measured on *this* body rather than carried over from the generation, and the
  // reading is taken three times against three chords a person could reasonably call "the trunk".
  // Nothing here asserts a number — what it asserts is that they *differ*, which is the finding.
  const neck = { base: [-0.1182, 0.0659, -1.2490], tip: [-0.5114, 0.1603, -0.5430] };
  await typeSpan(neck);
  const refPickA = (side, end) => page.locator('.bend-refs label', { hasText: `${side} reference ${end}` }).locator('select');
  const trunkRows = [];
  for (const [from, to] of [['body', 'chest'], ['tail_00', 'chest'], ['chest', 'neck_00']]) {
    await refPickA('Base', 'from').selectOption(from);
    await refPickA('Base', 'to').selectOption(to);
    await page.waitForTimeout(600);
    const r = await reading('bone-chain');
    const text = await page.locator('.bend-reading[data-reading="bone-chain"] .bend-reading-value').textContent();
    trunkRows.push({ base: `${from} → ${to}`, inPlane: r.before, total: r.beforeTotal, text: text.replace(/\s+/g, ' ').trim() });
    await page.locator('.bend-panel').evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `askeptosaurus-bend-trunk-${from}.png`) });
  }
  // Compared on the *total* angle rather than the in-plane one: how far apart two definitions are
  // is a question about directions, not about the plane a bend happens to be being read in.
  const trunkSpread = Math.max(...trunkRows.map((r) => r.total)) - Math.min(...trunkRows.map((r) => r.total));
  assert.ok(trunkSpread > 20, `three defensible readings of this animal's trunk disagree by ${trunkSpread.toFixed(1)}°, which is the finding this mode exists for`);
  const builtGeom = await reading('geometry');
  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-readings.txt'),
    ['Askeptosaurus, the shipped body (askeptosaurus.glb) — reached from bend mode\'s own Model',
      'control, because the mode opens on the original pose and must not be a cage: the bone',
      'chain\'s answer, the per-joint table and the corrected-body warning all need this rig.',
      '',
      `span ${JSON.stringify(neck)}`,
      ...trunkRows.map((r) => `bone   ${r.base.padEnd(20)} ${r.text}`),
      `geometry  ${builtGeom.before}° in plane, ${builtGeom.beforeTotal}° in all`,
      `spread across the three trunk readings: ${trunkSpread.toFixed(1)}°`].join('\n') + '\n');

  // ---- and back again, which is the other half of the guard ----
  await page.locator('.bend-model-pick select').selectOption('origpose');
  await page.waitForFunction(() => /origpose\.glb$/.test(document.querySelector('.clips')?.getAttribute('data-loaded-model') ?? ''), null, { timeout: 90000 });
  await page.waitForSelector('.bend-panel', { timeout: 60000 });
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('.bend-body-note').getAttribute('data-applies-to'), 'origpose', 'the control goes both ways');
  assert.equal(await page.locator('.bend-reading[data-reading="bone-chain"]').count(), 0,
    'and the rig\'s answer goes away with the rig — the panel re-measures on whichever body it lands on');

  fs.writeFileSync(path.join(out, 'askeptosaurus-bend-straightening.txt'),
    ['Askeptosaurus, the untouched original pose (askeptosaurus.origpose.glb) — the generation',
      'before T3D-26 carried the head\'s aim into the bind, which is the geometry that correction',
      'was measured from and the body the shipped one no longer is. Bend mode opens on this file',
      'for that reason, from the Bend button and from a ?mode=bend link alike.',
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

  // ============================================================================================
  // Mixosaurus — the rigged half, on a body bend mode still opens on its built model
  // ============================================================================================
  await page.goto(`${base}/viewer/?specimen=${encodeURIComponent(rigKey)}&mode=bend`, { waitUntil: 'networkidle', timeout: 120000 });
  await loaded(rigKey);
  await page.waitForSelector('.bend-panel', { timeout: 20000 });
  await page.waitForTimeout(2500);
  assert.match(await page.locator('.clips').getAttribute('data-loaded-model'), /mixosaurus\.glb$/,
    'an animal that publishes no original pose and no generation opens on its built body');
  const rigNote = page.locator('.bend-body-note');
  assert.equal(await rigNote.getAttribute('data-applies-to'), 'built', 'the panel knows it is on the shipped body');
  assert.equal(await rigNote.getAttribute('data-corrected'), 'no', 'and that this body\'s rest was never moved before binding');
  assert.match(await page.locator('.bend-frame-note').textContent(), /mouth socket/i, 'a body with a mouth socket is framed from it, not from its box');
  // The other side of the pair: a socket *does* earn the head end, so no question is asked here.
  assert.equal(await page.locator('.bend-frame-note').getAttribute('data-forward-earned'), 'yes',
    'and that socket earns which end the head is at');
  assert.equal(await page.locator('.bend-frame-unearned').count(), 0, 'so the panel asks nothing about it');

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
  await page.screenshot({ path: path.join(out, 'mixosaurus-bend-opened.png') });

  // ---- which two chords the reading is between is the question, and it changes the answer ----
  const refPick = (side, end) => page.locator('.bend-refs label', { hasText: `${side} reference ${end}` }).locator('select');
  const firstRef = { from: await refPick('Base', 'from').inputValue(), to: await refPick('Base', 'to').inputValue() };
  const asOpened = await reading('bone-chain');
  await refPick('Base', 'from').selectOption('tail_00');
  await refPick('Base', 'to').selectOption('chest');
  await page.waitForTimeout(600);
  const hipToShoulder = await reading('bone-chain');
  assert.notEqual(hipToShoulder.before, asOpened.before,
    `reading the same span against a different idea of "the trunk" gives a different angle (${firstRef.from} → ${firstRef.to}: ${asOpened.before}°, tail_00 → chest: ${hipToShoulder.before}°)`);
  await page.screenshot({ path: path.join(out, 'mixosaurus-bend-references.png') });

  // The three-trunk-readings finding is driven on Askeptosaurus above, which is the animal it came
  // from. Here the same question is asked once, because it is what the references are for.
  await refPick('Base', 'from').selectOption('chest');
  await refPick('Base', 'to').selectOption('neck');
  await page.waitForTimeout(600);

  // ---- aiming the tip plane bends the body, and the readings are measured rather than predicted ----
  await aimPlane('Tip', [0, 1, 0]);
  const aimed = await planes();
  assert.ok(aimed.apart > 5, `the two planes are now aimed ${aimed.apart}° apart`);
  const turnedGeom = await reading('geometry');
  assert.notEqual(turnedGeom.after, turnedGeom.before, 'the geometry reading moves with the bend');
  const bonesTurned = await reading('bone-chain');
  assert.notEqual(bonesTurned.after, bonesTurned.before, 'and so does the bone reading');
  await page.screenshot({ path: path.join(out, 'mixosaurus-bend-turned.png') });

  // ---- the per-joint table: the shape `carry_rest` consumes ----
  const joints = await page.locator('.bend-joints li').evaluateAll((els) => els
    .filter((el) => el.querySelector('code'))
    .map((el) => ({ bone: el.querySelector('code').textContent, local: el.querySelector('b').textContent, accumulated: el.querySelector('small').textContent })));
  assert.ok(joints.length >= 2, `the per-joint table has the joints the turn is spread over (${joints.map((j) => j.bone).join(', ')})`);
  const localSum = joints.reduce((s, j) => s + Number(j.local.replace('°', '')), 0);
  assert.ok(joints.every((j) => Number.isFinite(Number(j.local.replace('°', '')))), 'every row carries a real local rotation');
  assert.ok(joints.some((j) => Number(j.local.replace('°', '')) !== 0), `and the turn is actually spread over them (${localSum.toFixed(1)}° in all)`);
  // Deliberately *not* asserted here: that the local steps add back up to the whole turn. They do
  // where the chain carries the whole span and nowhere else — the turn is spread along the span,
  // so any part of it with no joint under it is a share the bone table cannot account for. On this
  // body the span's front reaches ahead of `chest` and four joints carry 54.4° of an 82.7° turn,
  // which is the table being honest rather than wrong. Askeptosaurus' hand-placed neck span used
  // to close that loop exactly, and bend mode no longer opens on that animal's rigged body.
  const total = (await planes()).turn;
  fs.writeFileSync(path.join(out, 'mixosaurus-bend-joints.txt'),
    ['the per-joint table, in chain order — a bone name and a local rotation, which is what',
      '`uncurl` returns and `carry_rest` consumes in a Triassic builder',
      '', ...joints.map((j) => `  ${j.bone.padEnd(12)} ${j.local.padStart(8)}   ${j.accumulated}`),
      '', `  local steps carry ${localSum.toFixed(2)}° of a whole turn of ${total}° — the rest of the span`,
      '  reaches past the first joint in the chain, which the table cannot account for and does not'].join('\n') + '\n');

  // ---- the hand-off on a rigged body, and the consumer's refusals ----
  await page.locator('.mark-note textarea').fill('browser drive: the tip plane aimed off the body’s own heading, measured both ways');
  const hash = await measuredHash();
  assert.match(hash, /^[0-9a-f]{64}$/, 'the page hashed the file on stage');
  const model = await page.locator('.clips').getAttribute('data-loaded-model');
  assert.equal(hash, hashOnDisk(model), 'and the hash is the file\'s own, as sha256 on disk reads it');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export bend/ }).click();
  const file = path.join(out, 'mixosaurus-bend.json');
  await (await download).saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.schema, 'bend-span/2');
  assert.equal(json.id, 'mixosaurus');
  assert.equal(json.appliesTo, 'built', 'the export says it was placed on the built body');
  assert.equal(json.use, 'builder-measurement', 'and that a rigged body is a measurement rather than an edit');
  assert.equal(json.sha256, hash);
  assert.equal(json.sha256Source, 'measured');
  assert.equal(json.creature.rigged, true);
  assert.ok(Math.abs(json.planes.apartDegrees - aimed.apart) < 0.02, `the two planes the panel showed are in the file (${json.planes.apartDegrees} vs ${aimed.apart})`);
  assert.ok(Math.abs(Math.hypot(...json.planes.tipNormal) - 1) < 1e-4, 'each as the unit direction it is');
  assert.ok(json.planes.tipRest, 'with the body’s own heading there beside the aim');
  assert.equal(typeof json.axis.twistDegrees, 'number', 'with how much of the aim is a twist rather than a bend');
  assert.ok(json.reading.geometry.before && json.reading.geometry.after, 'both geometry readings are in it');
  assert.ok(json.reading.bones.before && json.reading.bones.after, 'and both bone readings');
  assert.equal(json.reading.bones.baseReference, 'chest → neck', 'named by the references they were taken between');
  assert.ok(json.joints.length >= 2, 'the per-joint table is in it');
  assert.deepEqual(json.joints.map((j) => j.bone), joints.map((j) => j.bone), 'the same bones the panel showed, in the same chain order');
  assert.ok(json.joints.every((j, i) => Math.abs(j.localDegrees - Number(joints[i].local.replace('°', ''))) < 0.05),
    'carrying the same local rotations the panel showed');
  assert.ok(Number.isFinite(json.turn.totalDegrees), 'beside the whole turn they are a share of');
  assert.match(json.note, /^browser drive/);

  const accepted = check(file);
  assert.equal(accepted.status, 0, `npm run triassic:bend accepts the file it was measured on:\n${accepted.stdout}${accepted.stderr}`);
  assert.match(accepted.stdout, /re-measuring it here gives the readings it recorded/, 'and re-measures the same readings over the actual mesh and rig');
  fs.writeFileSync(path.join(out, 'mixosaurus-bend-check.txt'), accepted.stdout);
  const tampered = path.join(out, 'mixosaurus-bend-stale.json');
  fs.writeFileSync(tampered, JSON.stringify({ ...json, sha256: 'f'.repeat(64) }, null, 2));
  const refused = check(tampered);
  assert.notEqual(refused.status, 0, 'and refuses one whose hash no longer matches the body');
  assert.match(refused.stderr, /has changed since the span was placed/, 'saying why');
  // A file written against the turn rates the planes replaced is refused outright, by name.
  const old = path.join(out, 'mixosaurus-bend-v1.json');
  fs.writeFileSync(old, JSON.stringify({ ...json, schema: 'bend-span/1' }, null, 2));
  const rates = check(old);
  assert.notEqual(rates.status, 0, 'and one from before the two planes');
  assert.match(rates.stderr, /written before the two planes/, 'saying that too');

  // ---- the pointer scheme on a rigged body too, last again ----
  const builtPointer = await drivePointerScheme('built');

  if (errors.length) console.error(`page errors:\n${errors.join('\n---\n')}`);
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: bend mode — the Bend button and a ?mode=bend link both open Askeptosaurus on its');
  console.log('      original pose, which is the body a bend is aimed on; a handle found, dragged and undone');
  console.log(`      with the camera untouched; a neck ${curved.before.toFixed(1)}° off its trunk, two planes aimed the same`);
  console.log(`      way, and the run between them measured ${buttonGeom.after}° in plane over the warped mesh;`);
  console.log(`      the panel's own Model control back to the built body and out again, where three trunk`);
  console.log(`      readings sit ${trunkSpread.toFixed(1)}° apart and the corrected-body warning is shown to the person it`);
  console.log(`      is about; on Mixosaurus, a per-joint table in chain order carrying ${localSum.toFixed(1)}° of an ${total}° turn,`);
  console.log('      and an export hashed in the page, accepted by the consumer and refused stale or v1;');
  console.log(`      and the pointer scheme on both bodies — left-drag orbits (${rawPointer.orbit.toFixed(2)}, ${builtPointer.orbit.toFixed(2)}),`);
  console.log(`      right-drag pans (${rawPointer.pan.toFixed(2)}, ${builtPointer.pan.toFixed(2)})`);
} finally {
  await browser.close();
}
