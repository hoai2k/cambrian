// Headless smoke test for the audio workbench: enables audio, plays a sound by event kind and a
// raw file, checks the distance falloff reports a quieter sound further out, drives the
// soundtrack through one track hand-over, measures every sample, and reports any sample the
// catalogue lists that is missing or too quiet to read on a small speaker.
// Usage: node tools/workbench-smoke.mjs <outdir>
// Requires `npm run build && npx vite preview --port 4173` in another shell.
import { chromium } from 'playwright-core';
const S = process.argv[2] ?? '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_CONNECTION/.test(m.text())) errors.push(`[error] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
const readout = () => page.textContent('.readout span');
const setSlider = (nth, value) => page.$eval(`.controls .slider:nth-child(${nth}) input`, (el, v) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, String(value));

await page.goto('http://localhost:4173/workbench/?edit=audio', { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.click('.primary');                       // enable audio
await page.waitForTimeout(2500);                    // let the library preload

await page.click('.sounds .row:nth-child(1) .name');            // play by event kind
await page.waitForTimeout(300);
console.log('kind:', await readout());
await page.click('.sounds .row:nth-child(1) button.chip');      // play one file
await page.waitForTimeout(800);
console.log('file:', await readout());

await setSlider(3, 40);                             // distance: the same event, far away
await page.waitForTimeout(200);
await page.click('.sounds .row:nth-child(1) .name');
await page.waitForTimeout(300);
console.log('far: ', await readout());

// The soundtrack: the opening track hands over to a different one near its end.
await page.click('.row.soundtrack .name');
await page.waitForTimeout(3000);
const opening = await page.textContent('.row.soundtrack .name small');
await page.click('.row.soundtrack button.chip >> nth=1');       // seek to just before the end
let handover = null;
for (let i = 0; i < 20 && !handover; i++) {
  await page.waitForTimeout(1000);
  const now = await page.textContent('.row.soundtrack .name small');
  if (now !== opening) handover = now;
}
console.log('music:', opening, '->', handover ?? 'NO HANDOVER');

const hoverRow = page.locator('.sounds .row').nth(2);
const hoverBox = await hoverRow.boundingBox();
await hoverRow.hover({ position: { x: hoverBox.width - 4, y: hoverBox.height / 2 } });
await page.waitForTimeout(800);
await page.screenshot({ path: `${S}/workbench-audio.png`, fullPage: false, timeout: 120000 });

// Measure the library: anything too quiet above 150 Hz will not read on a laptop speaker.
await page.click('.controls .readout button.chip');
await page.waitForFunction(() => !/measuring/.test(document.querySelector('.controls .readout button.chip').textContent), null, { timeout: 120000 });
console.log('levels:', (await page.textContent('.controls .readout span')).trim());
console.log('too quiet:', await page.$$eval('.chip.quiet', (n) => n.map((x) => x.textContent.trim())));

console.log('missing files:', await page.$$eval('.chip.missing', (n) => n.map((x) => x.textContent)));
console.log('undocumented kinds:', await page.$$eval('.group.warn .blurb', (n) => n.map((x) => x.textContent.trim())));
console.log('errors:', errors.length); for (const e of [...new Set(errors)].slice(0, 10)) console.log(e);
await browser.close();
