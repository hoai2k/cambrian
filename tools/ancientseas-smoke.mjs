// Headless look at the trilogy page — the site root — in both versions, desktop and phone, with
// the three game links followed. Usage: node tools/ancientseas-smoke.mjs <outdir>
// Requires `npm run build && npx vite preview --port 4173` in another shell.
import { chromium } from 'playwright-core';
import { silenceCounter } from './qa-counter.mjs';
const S = process.argv[2] ?? '.';
// The three game links boot the real engine, so this needs the software renderer the other
// browser smokes use; without it the sea never starts and the boot never finishes.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
let failed = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(52)} ${d}`); if (!ok) failed++; };
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  for (const version of [1, 2]) {
    const page = await browser.newPage({ viewport });
    await silenceCounter(page);
    const errors = [], missing = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://localhost:4173/?version=${version}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${S}/ancientseas-v${version}-${name}.png`, fullPage: true });
    // What each game is drawn as, read off the page rather than from a list here: a game that is
    // not out yet is marked, badged and not a link, and one that is open is a link and is not
    // marked. Written this way, opening the third game is one line in page.ts and nothing here.
    const state = await page.evaluate(() => ['cambrian', 'devonian', 'triassic'].map((id) => {
      const el = document.querySelector(`[data-slot="${id}"]`) ?? document.querySelector(`.as-game-${id}`);
      const caption = el?.querySelector('.as-caption small')?.textContent ?? '';
      return {
        id, drawn: !!el,
        soon: !!el?.classList.contains('as-soon'),
        link: el?.tagName === 'A' && !!el.getAttribute('href'),
        badge: !!el?.querySelector('.as-badge') || /coming soon/i.test(caption),
      };
    }));
    check(`v${version} ${name}: all three games are on the plate`, state.every((g) => g.drawn), state.map((g) => `${g.id}${g.drawn ? '' : ' MISSING'}`).join(' '));
    check(`v${version} ${name}: a game not out yet is badged and is not a link`, state.filter((g) => g.soon).every((g) => g.badge && !g.link), state.filter((g) => g.soon).map((g) => `${g.id} badge:${g.badge} link:${g.link}`).join(' ') || 'none');
    check(`v${version} ${name}: a game that is open is a link and is not badged`, state.filter((g) => !g.soon).every((g) => g.link && !g.badge), state.filter((g) => !g.soon).map((g) => `${g.id} badge:${g.badge} link:${g.link}`).join(' '));
    const links = await page.$$eval('a[href]', (as) => as.map((a) => ({ href: a.getAttribute('href'), tab: a.tabIndex >= 0 })));
    const games = links.filter((l) => /^\.\/(cambrian|devonian|triassic)\/$/.test(l.href ?? ''));
    const where = [...new Set(games.map((l) => l.href))];
    const opens = state.filter((g) => !g.soon);
    // Each open game once for the keyboard, whichever half of it the pointer takes.
    check(`v${version} ${name}: the open games, once each`, where.length === opens.length && games.filter((l) => l.tab).length === opens.length, `${where.join(' ')} · ${games.length} links, ${games.filter((l) => l.tab).length} tabbable`);
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
await silenceCounter(page);
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

// The Triassic has no link on the plate, so it is opened by its address: its page is still there
// and still works, and what changed is what the trilogy page offers.
for (const [href, url, title] of [['./cambrian/', 'http://localhost:4173/cambrian/', 'Cambrian Conquest'], ['./devonian/', 'http://localhost:4173/devonian/', 'Devonian Domination'], [null, 'http://localhost:4173/triassic/', 'Triassic Triumph']]) {
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  if (href) await Promise.all([page.waitForURL(url, { timeout: 20000 }), page.click(`a[href="${href}"]`)]);
  else await page.goto(url, { waitUntil: 'load' });
  check(`${href ? `link ${href} opens` : 'its own address still opens'} ${title}`, (await page.title()) === title, await page.title());
  const seen = await covering().catch((e) => ({ error: String(e).slice(0, 80) }));
  check(`${title}: a screen of its own, not the sea`, !!(seen.title || seen.boot), JSON.stringify(seen));
  // And one way off that screen that is not press start: back to the page these links came from.
  const back = await page.$$eval('.era-switch', (as) => as.map((a) => `${a.getAttribute('href')} ${a.textContent}`));
  check(`${title}: one link back to the trilogy`, back.length === 1 && back[0].startsWith('../') && /Ancient Seas Trilogy/.test(back[0]), back.join(' | '));
}

// A controller walks the three games and opens one. Playwright cannot plug a pad in, so the page
// is given one to read: the same object shape `navigator.getGamepads()` returns, driven by hand.
{
  // Its own browser, without the software renderer the game pages need: under swiftshader this
  // page — which draws no WebGL at all — gets almost no animation frames, and the pad is read on
  // the frame clock. Nothing about the page differs; only how often it is allowed to look.
  const plain = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await plain.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    const pad = { index: 0, id: 'Smoke Pad (STANDARD GAMEPAD)', connected: true, mapping: 'standard',
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const page = await ctx.newPage();
  await silenceCounter(page);
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => dispatchEvent(new Event('gamepadconnected')));
  const lit = () => page.$$eval('.as-lit', (n) => n.map((e) => e.getAttribute('data-slot')).join(' '));
  /** Hold the button for a few frames, let go, and give the page a moment to answer. */
  const press = async (button) => {
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, button);
    await page.waitForTimeout(150);
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, button);
    await page.waitForTimeout(250);
  };
  const after = async (button, want) => {
    await press(button);
    for (let i = 0; i < 10 && (await lit()) !== want; i++) await page.waitForTimeout(100);
    return lit();
  };
  check('a pad lights nothing until it is used', (await lit()) === '');
  // The games it should walk, in the order they stand on the plate, read off the page: a game that
  // is not out yet is not one of them, and opening it later changes this run without touching it.
  const open = await page.$$eval('a[data-slot]', (as) => as
    .filter((a) => a.querySelector('img')?.getAttribute('alt'))
    .map((a) => a.getAttribute('data-slot')));
  const litTitle = async () => (await lit()).split(' ')[0] ?? '';
  const stepTo = async (button, want) => {
    await press(button);
    for (let i = 0; i < 12 && (await litTitle()) !== want; i++) await page.waitForTimeout(100);
    return litTitle();
  };
  let walked = true, saw = [];
  // One step further than there are games, to prove it wraps rather than stopping or stepping onto
  // one that is not a way in.
  for (let i = 0; i <= open.length; i++) {
    const want = open[i % open.length];
    const got = await stepTo(15, want);
    saw.push(got);
    if (got !== want) walked = false;
  }
  check(`the pad walks the ${open.length} open game(s) and wraps`, walked, `wanted ${open.join(' ')} + wrap · saw ${saw.join(' ')}`);
  check('and never lights a game that is not a way in', (await page.$$eval('.as-soon.as-lit', (n) => n.length)) === 0);
  await press(0); // A
  const opened = await page.waitForURL(`**/${open[0]}/`, { timeout: 10000 }).then(() => true).catch(() => false);
  check('A opens what is lit', opened, page.url());
  await ctx.close(); await plain.close();
}

// Fullscreen across a change of game. The browser drops it when a document is replaced and the
// next one cannot ask for it back on its own, so the preference rides along and the page puts
// itself back on the player's first click or key — which on a title screen is press start. Done
// in its own browser again, for the frame clock: the game boots a sea here.
{
  const plain = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await plain.newPage({ viewport: { width: 1280, height: 800 } });
  await silenceCounter(page);
  const fs = () => page.evaluate(() => !!document.fullscreenElement);

  // On the roster, where a stray click starts nothing, so what is seen is the restore alone and
  // not the fullscreen the game has always asked for when a match begins.
  await page.goto('http://localhost:4173/cambrian/?screen=select', { waitUntil: 'load' });
  await page.waitForSelector('.brand-title', { timeout: 40000 });
  await page.mouse.click(1200, 700);
  await page.waitForTimeout(700);
  check('a player who never asked keeps their window', !(await fs()));

  // A player who was in fullscreen in the game they came from.
  await page.evaluate(() => sessionStorage.setItem('fullscreen', '1'));
  await page.goto('http://localhost:4173/devonian/?screen=select', { waitUntil: 'load' });
  await page.waitForSelector('.brand-title', { timeout: 40000 });
  check('the next game starts windowed, as the browser leaves it', !(await fs()));
  await page.mouse.click(1200, 700);
  await page.waitForTimeout(800);
  check('and puts itself back on the first click there', await fs());

  // The press that starts a match must not toggle a player who is already fullscreen back out.
  await page.evaluate(() => sessionStorage.setItem('fullscreen', '1'));
  await page.goto('http://localhost:4173/devonian/', { waitUntil: 'load' });
  await page.waitForSelector('.title', { timeout: 40000 });
  await page.mouse.click(640, 300);
  await page.waitForTimeout(900);
  check('press start arrives fullscreen and stays there', await fs());
  await page.close(); await plain.close();
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
