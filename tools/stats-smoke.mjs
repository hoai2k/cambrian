// Headless look at /stats/ and the counter, in both states.
// Usage: node tools/stats-smoke.mjs [outdir]
// Requires `npm run build && npx vite preview --port 4173` in another shell.
//
// `npm run stats` checks the wiring from the source; this checks the two states as a browser
// actually resolves them — because the interesting failure is a page that renders an empty
// dashboard for a site that was never counting, which looks exactly like a trilogy nobody played.
// Nothing here is allowed out to gc.zgo.at: count.js is intercepted and answered with an empty
// body, so a smoke run never puts a pageview in anyone's dashboard.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const S = process.argv[2] ?? '.';
const BASE = process.env.STATS_BASE ?? 'http://localhost:4173';
const CONFIG = 'src/shared/config-stats.ts';
const DECL = /export const GOATCOUNTER_SITE = '[^']*';/;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
let failed = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(52)} ${d}`); if (!ok) failed++; };

// The preview server serves what was built, so a state change means a rebuild. The original file
// is put back in a `finally` including on a throw: a smoke run that left a fake code committed
// would send real visits to a subdomain we do not own, which is worse than any bug it could catch.
const original = readFileSync(CONFIG, 'utf8');
if (!DECL.test(original)) throw new Error(`could not find GOATCOUNTER_SITE in ${CONFIG}`);
const { execSync } = await import('node:child_process');
async function withSite(code, body) {
  writeFileSync(CONFIG, original.replace(DECL, `export const GOATCOUNTER_SITE = '${code}';`));
  try {
    execSync('npm run build', { stdio: 'ignore' });
    await body();
  } finally {
    writeFileSync(CONFIG, original);
  }
}

// Off: /stats/ must say so in words and frame nothing. An empty dashboard here would be a claim
// about history that was never recorded.
await withSite('', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/stats/`, { waitUntil: 'networkidle' });
  const got = await page.evaluate(() => ({
    text: document.body.textContent ?? '',
    frames: document.querySelectorAll('iframe').length,
  }));
  check('off: /stats/ says it is not switched on', /not switched on|switched on/i.test(got.text));
  check('off: /stats/ gives the setup steps', /goatcounter\.com\/signup/i.test(got.text));
  check('off: no dashboard frame', got.frames === 0, `${got.frames} frame(s)`);
  await page.screenshot({ path: `${S}/stats-off.png`, fullPage: true });

  // And a game page counts nothing at all.
  const game = await browser.newPage();
  let asked = 0;
  await game.route('**gc.zgo.at/**', (r) => { asked++; r.abort(); });
  await game.goto(`${BASE}/triassic/`, { waitUntil: 'domcontentloaded' });
  await game.waitForTimeout(1500);
  check('off: the game asks for no counter', asked === 0, `${asked} request(s)`);
  await game.close();
  await page.close();
});

// On: the frame and the per-view links point at that code's dashboard with the right filter, and
// a game page addresses count.js at that code's endpoint.
await withSite('smoketest', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/stats/`, { waitUntil: 'networkidle' });
  const frame = () => page.$eval('iframe', (f) => f.getAttribute('src') ?? '');
  const first = await frame();
  check('on: the frame is the dashboard', first.startsWith('https://smoketest.goatcounter.com'), first);
  const chips = await page.$$('[data-view]');
  check('on: a chip per view', chips.length >= 4, `${chips.length} chips`);
  await page.screenshot({ path: `${S}/stats-on.png`, fullPage: true });

  // Drilling in is the whole request: a chip must change what the frame is showing.
  const tri = await page.$('[data-view="triassic"]');
  await tri?.click();
  await page.waitForTimeout(200);
  const after = await frame();
  check('on: a chip filters the frame', after.includes(encodeURIComponent('/cambrian/triassic/')) || after.includes('/cambrian/triassic/'), after);
  check('on: and it is a different view', after !== first);
  const link = await page.$$eval('a[href]', (as) => as.map((a) => a.href).find((h) => h.includes('smoketest.goatcounter.com')) ?? '');
  check('on: a direct link out to GoatCounter', link.startsWith('https://smoketest.goatcounter.com'), link);
  await page.close();

  // Every counted page asks for the counter once, against the configured endpoint.
  for (const path of ['/', '/cambrian/', '/devonian/', '/triassic/']) {
    const game = await browser.newPage();
    const asked = [];
    await game.route('**gc.zgo.at/**', (r) => {
      asked.push(r.request().url());
      r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await game.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await game.waitForTimeout(1500);
    const endpoint = await game.evaluate(() =>
      document.querySelector('script[data-goatcounter]')?.dataset.goatcounter ?? '');
    check(`on: ${path} counts once`, asked.length === 1, `${asked.length} request(s)`);
    check(`on: ${path} points at the configured endpoint`,
      endpoint === 'https://smoketest.goatcounter.com/count', endpoint);
    await game.close();
  }

  // And the secondary pages ask for nothing at all. This is the half that the source test cannot
  // prove: a page counts if anything it imports calls installStats, so the only honest check is to
  // open it and watch whether gc.zgo.at is asked for.
  for (const path of ['/viewer/', '/workbench/', '/stats/']) {
    const page = await browser.newPage();
    const asked = [];
    await page.route('**gc.zgo.at/**', (r) => {
      asked.push(r.request().url());
      r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    check(`on: ${path} is not counted`, asked.length === 0, `${asked.length} request(s)`);
    await page.close();
  }
});

await browser.close();
console.log(failed ? `\n${failed} failed` : '\nall good');
process.exit(failed ? 1 : 0);
