// Headless look at the trilogy page: both versions, desktop and phone, with the three links
// followed. Usage: node tools/ancientseas-smoke.mjs <outdir>
// Requires `npm run build && npx vite preview --port 4173` in another shell.
import { chromium } from 'playwright-core';
const S = process.argv[2] ?? '.';
// The three game links boot the real engine, so this needs the software renderer the other
// browser smokes use; without it the sea never starts and the boot never finishes.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
let failed = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(52)} ${d}`); if (!ok) failed++; };
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  for (const version of [1, 2]) {
    const page = await browser.newPage({ viewport });
    const errors = [], missing = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://localhost:4173/ancientseas/?version=${version}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${S}/ancientseas-v${version}-${name}.png`, fullPage: true });
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    const games = links.filter((h) => /^(\.\.\/|\.\.\/devonian\/|\.\.\/triassic\/)$/.test(h));
    check(`v${version} ${name}: three game links`, games.length === 3, games.join(' '));
    const broken = await page.$$eval('img', (im) => im.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    check(`v${version} ${name}: every image drew`, broken.length === 0, broken.join(' '));
    check(`v${version} ${name}: nothing asked for a missing file`, missing.length === 0, missing.join(' '));
    check(`v${version} ${name}: no console errors`, errors.length === 0, errors.join(' | '));
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(`v${version} ${name}: no horizontal scroll`, !wide);
    if (version === 2) {
      const kinds = await page.$$eval('.as-slot', (s) => s.map((e) => e.className.match(/as-src-(delivered|stand-in|placeholder)/)?.[1]));
      console.log(`      slots: ${kinds.filter((k) => k === 'delivered').length} delivered, ${kinds.filter((k) => k === 'stand-in').length} stand-in, ${kinds.filter((k) => k === 'placeholder').length} placeholder`);
    }
    await page.close();
  }
}
// The links go somewhere: each game's title screen, and it is the first thing drawn. The game
// starts its engine before the creatures have streamed in, so a title screen that waits for them
// shows the player the sea for a moment and then cuts to the title — which reads as landing in
// the wrong place. Checked at the first frame the app has mounted anything at all.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const covering = () => page.waitForFunction(() => {
  const root = document.getElementById('root');
  if (!root || !root.firstElementChild) return false;
  return {
    title: !!document.querySelector('section.title'),
    boot: !!document.querySelector('section.loading-illustrated'),
    press: document.querySelector('.press-start')?.textContent ?? '',
    bar: !!document.querySelector('.title-progress .loading-bar'),
  };
}, null, { timeout: 20000 }).then((h) => h.jsonValue());

for (const [href, url, title] of [['../', 'http://localhost:4173/', 'Cambrian Conquest'], ['../devonian/', 'http://localhost:4173/devonian/', 'Devonian Domination'], ['../triassic/', 'http://localhost:4173/triassic/', 'Triassic Triumph']]) {
  await page.goto('http://localhost:4173/ancientseas/', { waitUntil: 'load' });
  await Promise.all([page.waitForURL(url, { timeout: 20000 }), page.click(`a[href="${href}"]`)]);
  check(`link ${href} opens ${title}`, (await page.title()) === title, await page.title());
  const seen = await covering().catch((e) => ({ error: String(e).slice(0, 80) }));
  check(`${title}: a screen of its own, not the sea`, !!(seen.title || seen.boot), JSON.stringify(seen));
}

// The boot bar under the loading line is not checked here. Its window is bounded at both ends —
// it opens 700 ms after the app mounts and closes when the engine gives up waiting for the first
// card, 4 s after it starts — and on this machine, with the sea running on a software renderer,
// the mount alone can eat most of that. A check that has to hit a window that narrow reports the
// harness rather than the page, so what is asserted about the bar is its wiring, in
// `npm run ancientseas`, and what is checked here is what the player actually complained about:
// that the sea is never on screen on its own.

await browser.close();
console.log(failed ? `${failed} FAILED` : 'ancientseas smoke: all passed');
process.exit(failed ? 1 : 0);
