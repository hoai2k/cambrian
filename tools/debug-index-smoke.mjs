// Headless look at the debug index (`?debug` on the trilogy page), and — the part worth having —
// every link on it followed. An index whose rows 404 is worse than no index, and the rows are the
// one thing a headless unit test cannot fully vouch for: it can see the file on disk, but not that
// the built site serves it at the address the page prints.
// Usage: node tools/debug-index-smoke.mjs <outdir>
// Requires `npm run build && npx vite preview --port 4173` in another shell.
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
const S = process.argv[2] ?? '.';
const ROOT = 'http://localhost:4173/';
// The game parameters open the real engine, so this needs the software renderer the other browser
// smokes use; without it a game page never boots and its console fills with WebGL errors.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
let failed = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(58)} ${d}`); if (!ok) failed++; };

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await silenceCounter(page);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ROOT}?debug`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${S}/debug-index-${name}.png`, fullPage: true });

  const seen = await page.evaluate(() => ({
    heading: document.querySelector('h1')?.textContent ?? '',
    sections: [...document.querySelectorAll('.dbg-section h2')].map((h) => h.textContent),
    // Every row must carry a sentence, not just a name: that is the whole point of the page.
    rows: [...document.querySelectorAll('.dbg-row')].map((r) => ({
      name: r.querySelector('b')?.textContent ?? '',
      blurb: (r.querySelector('.dbg-blurb')?.textContent ?? '').length,
    })),
    hrefs: [...document.querySelectorAll('.dbg-name[href], .dbg-mode, .dbg-game')].map((a) => a.getAttribute('href')),
    // Nothing on this page should be drawing the plate's art.
    images: document.querySelectorAll('img').length,
    scrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));

  check(`${name}: the index opens`, seen.heading === 'Debug index', seen.heading);
  check(`${name}: all three sections`, seen.sections.length === 3, seen.sections.join(' · '));
  check(`${name}: every row is described`, seen.rows.length > 0 && seen.rows.every((r) => r.blurb > 60), `${seen.rows.length} rows`);
  check(`${name}: draws no pictures`, seen.images === 0, `${seen.images} img`);
  check(`${name}: no sideways scroll`, !seen.scrollsSideways);
  check(`${name}: no console errors`, errors.length === 0, errors[0] ?? '');

  if (name === 'desktop') {
    // Follow every link the page actually drew. A HEAD is enough: what is being asked is whether
    // the built site serves that address, not whether the app behind it boots.
    const hrefs = [...new Set(seen.hrefs)];
    check('desktop: the page drew links', hrefs.length >= 15, `${hrefs.length} links`);
    const bad = [];
    for (const href of hrefs) {
      const target = new URL(href, `${ROOT}?debug`).toString();
      const res = await page.request.get(target);
      if (!res.ok()) bad.push(`${res.status()} ${href}`);
    }
    check('desktop: every link resolves', bad.length === 0, bad.join(', '));
  }
  await page.close();
}

// And the page itself is still the page: a visitor never sees any of this.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await silenceCounter(page);
  await page.goto(ROOT, { waitUntil: 'networkidle' });
  const plain = await page.evaluate(() => ({
    index: !!document.querySelector('.dbg'),
    plate: !!document.querySelector('.as'),
    linksToDebug: [...document.querySelectorAll('a[href]')].some((a) => (a.getAttribute('href') ?? '').includes('debug')),
  }));
  check('an ordinary visit gets the plate', plain.plate && !plain.index);
  check('and nothing on it links to the index', !plain.linksToDebug);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
