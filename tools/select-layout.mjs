/**
 * Select-screen layout guard, both eras. The roster grid used to be centred in its track, so on a
 * wide, short window (1920x760, 2560x800) three rows of tiles grew taller than the space for them
 * and spilled *upwards* over the mode blurb. This drives the real page and fails if any tile
 * overlaps the header, the blurb, the crew card or the footer, or falls off the bottom.
 *
 * Usage: npm run build && npx vite preview --port 4173, then: node tools/select-layout.mjs [outdir]
 */
import { chromium } from 'playwright-core';

const OUT = process.argv[2];
const WIDTHS = [1024, 1280, 1440, 1512, 1728, 1920, 2560];
const HEIGHTS = [620, 700, 760, 800, 900, 1080];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

let failures = 0;
for (const era of ['cambrian', 'devonian']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', lookSpeed: 1, invertY: false, volume: 0.8, muted: true })));
  await page.goto(`http://localhost:4173/${era === 'devonian' ? 'devonian/' : ''}`, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  for (let i = 0; i < 8 && !(await page.$('.select')); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(2000); }
  if (!(await page.$('.select'))) { console.log(`FAIL  ${era}: the select screen never opened`); failures++; await page.close(); continue; }

  for (const w of WIDTHS) for (const h of HEIGHTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const rect = (s) => document.querySelector(s)?.getBoundingClientRect();
      const hits = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      // A tile scrolled out of the roster's own scroll box is clipped, not overlapping: clamp
      // every tile to the visible part of its container before testing anything.
      const box = rect('.pick-layout');
      const clip = (c) => {
        if (!box) return c;
        const top = Math.max(c.top, box.top), bottom = Math.min(c.bottom, box.bottom);
        return bottom - top < 2 ? null : { left: c.left, right: c.right, top, bottom };
      };
      const cells = [...document.querySelectorAll('.cell')].map((el) => clip(el.getBoundingClientRect())).filter(Boolean);
      const header = rect('.select-header'), blurb = rect('.mode-blurb'), card = rect('.crew-card'), footer = rect('.select-footer');
      return {
        header: cells.filter((c) => hits(c, header)).length,
        blurb: cells.filter((c) => hits(c, blurb)).length,
        card: cells.filter((c) => hits(c, card)).length,
        offscreen: cells.filter((c) => c.bottom > innerHeight + 1).length,
        // A short window is allowed to scroll: only count the footer when the page does not.
        footer: document.documentElement.scrollHeight <= innerHeight + 1 ? cells.filter((c) => hits(c, footer)).length : 0,
      };
    });
    const bad = Object.entries(r).filter(([, n]) => n > 0);
    if (bad.length) { console.log(`FAIL  ${era} ${w}x${h}  tiles overlapping: ${bad.map(([k, n]) => `${k}=${n}`).join(' ')}`); failures++; if (OUT) await page.screenshot({ path: `${OUT}/select-${era}-${w}x${h}.png`, timeout: 60000 }); }
  }
  console.log(`${era}: ${WIDTHS.length * HEIGHTS.length} viewports checked`);
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nselect screen lays out cleanly at every size');
process.exit(failures ? 1 : 0);
