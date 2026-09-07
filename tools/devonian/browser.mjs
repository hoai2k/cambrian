import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = (process.env.QA_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const out = '../devonian-authoring/review';
const ids = process.argv.slice(2);
const specimens = JSON.parse(fs.readFileSync('src/content/devonian/specimens.json'));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const report = [];
try {
  await page.goto(`${base}/viewer/`, { waitUntil: 'networkidle', timeout: 120000 });
  assert.equal(await page.locator('.specimen').count(), 21, 'Cambrian default roster changed');
  if (!process.env.QA_ONLY_UI) {
    const audit = await page.evaluate(async ids => {
      const { auditDevonian } = await import('/tools/devonian/runtime-audit.ts');
      const selection = ids.length ? ids : undefined;
      return { creatures: await auditDevonian(selection), props: await auditDevonian(selection, 'prop') };
    }, ids);
    fs.writeFileSync(`${out}/runtime-${ids.join('-') || 'all'}.json`, JSON.stringify(audit, null, 2));
    console.log(`PASS runtime: ${audit.creatures.length} creatures and ${audit.props.length} props; full/LOD skinning, every clip, independent sockets and CCD`);
  }
  for (const category of ['creature', 'prop']) {
    const all = specimens.filter(s => s.category === category);
    if (!all.length || !all.some(s => !ids.length || ids.includes(s.id))) continue;
    await page.getByLabel('Specimen collection', { exact: true }).selectOption(category === 'creature' ? 'devonian' : 'devonian-props');
    assert.equal(await page.locator('.specimen').count(), all.length);
    for (const s of all.filter(s => !ids.length || ids.includes(s.id))) {
      const button = page.locator('.specimen').filter({ has: page.locator('b', { hasText: new RegExp(`^${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });
      await button.click();
      await page.locator(`.clips[data-loaded-specimen="devonian:${category}:${s.id}"]`).waitFor({ timeout: 60000 });
      await page.locator('.status').waitFor({ state: 'hidden', timeout: 60000 });
      assert.equal(await page.locator('.info h2').textContent(), s.name);
      const clips = await page.locator('.clip-grid .clip').allTextContents();
      if (category === 'creature') assert(clips.length >= 18);
      for (const name of category === 'creature' ? ['Idle', 'Bite', 'Ability', 'Death'] : clips.slice(0, 1)) {
        await page.getByRole('button', { name, exact: true }).click();
        await page.waitForTimeout(name === 'Death' ? 1800 : 450);
        if (['Idle', 'Ability', 'Death'].includes(name)) assert.equal(await page.locator('.clip.active').textContent(), name, `${s.id}: fading previous action interrupted ${name}`);
        await page.screenshot({ path: `${out}/viewer-${s.id}-${name}.png` });
      }
      if (!clips.length) await page.screenshot({ path: `${out}/viewer-${s.id}.png` });
      report.push({ id: s.id, category, clips });
    }
  }
  for (const [width, height] of [[960, 540], [800, 700], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    const stage = await page.locator('.viewer-canvas').boundingBox();
    const actions = await page.locator('.clips').boundingBox();
    assert(stage.width >= 100 && stage.height >= 100, 'No usable model stage');
    assert(stage.y + stage.height <= actions.y + 1, 'Actions obscure the model stage');
    await page.screenshot({ path: `${out}/viewer-${width}x${height}.png` });
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(`${out}/viewer-${ids.join('-') || 'all'}.json`, JSON.stringify({ base, report, errors }, null, 2));
  console.log(`PASS viewer: ${report.length} Devonian specimens; Cambrian default remains 21`);
} finally { await browser.close(); }
