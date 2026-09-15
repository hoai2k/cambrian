/**
 * The trilogy's favicon family, from the imagegen-isolated central scallop.
 *
 * On transparency: an icon with its own black rounded square painted in is a black square in
 * every place that already draws its own background — a browser tab, a bookmark bar, a phone's
 * light home screen — and the shell is gold, which reads on all of them. All illustrated pixels
 * are the generated shell's; nothing is drawn here but the scaling.
 *
 * Run: node tools/art/ancientseas/titles/favicons.mjs
 *
 * It draws in a headless browser rather than through sharp, which is not a dependency of this
 * repository: playwright-core is, and the canvas does the same two jobs (trim to the drawing, then
 * scale) with the same result at these sizes.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const base = 'tools/art/ancientseas/titles';
const out = 'public/assets/ancientseas';
const SIZES = [['favicon-16.png', 16], ['favicon-32.png', 32], ['favicon-192.png', 192], ['apple-touch-icon.png', 180]];
/** The master is 512 with the shell at 420, so the mark keeps a margin of its own at every size. */
const MASTER = 512, SHELL = 420;

const shell = await fs.readFile(`${base}/sources/favicon-shell.png`);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const files = await page.evaluate(async ({ src, MASTER, SHELL, SIZES }) => {
  const img = new Image(); img.src = src; await img.decode();
  const read = document.createElement('canvas');
  read.width = img.naturalWidth; read.height = img.naturalHeight;
  read.getContext('2d').drawImage(img, 0, 0);
  const d = read.getContext('2d').getImageData(0, 0, read.width, read.height).data;
  // Trim to what is actually drawn: the source is a shell on transparency with room around it.
  let x0 = read.width, y0 = read.height, x1 = 0, y1 = 0;
  for (let y = 0; y < read.height; y++) for (let x = 0; x < read.width; x++) {
    if (d[(y * read.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = SHELL / Math.max(w, h);
  const master = document.createElement('canvas'); master.width = MASTER; master.height = MASTER;
  const g = master.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(read, x0, y0, w, h, (MASTER - w * k) / 2, (MASTER - h * k) / 2, w * k, h * k);
  // Halve down to each size rather than jumping straight there: a 32-pixel icon drawn in one step
  // from 512 loses the thin ribs between the shell's flutes.
  const shrink = (size) => {
    let cur = master;
    while (cur.width > size * 2) {
      const half = document.createElement('canvas'); half.width = cur.width / 2; half.height = cur.height / 2;
      const hg = half.getContext('2d'); hg.imageSmoothingEnabled = true; hg.imageSmoothingQuality = 'high';
      hg.drawImage(cur, 0, 0, half.width, half.height);
      cur = half;
    }
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const cg = c.getContext('2d'); cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
    cg.drawImage(cur, 0, 0, size, size);
    return c.toDataURL('image/png');
  };
  return { master: master.toDataURL('image/png'), sizes: SIZES.map(([file, size]) => [file, shrink(size)]) };
}, { src: `data:image/png;base64,${shell.toString('base64')}`, MASTER, SHELL, SIZES });
await browser.close();

const png = (uri) => Buffer.from(uri.split(',')[1], 'base64');
await fs.writeFile(`${base}/favicon-master.png`, png(files.master));
for (const [file, uri] of files.sizes) await fs.writeFile(`${out}/${file}`, png(uri));
console.log(`wrote ${files.sizes.length} icons on transparency to ${out}/ and the master beside the source`);
