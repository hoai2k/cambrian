/**
 * The wordmark the interface uses, derived from each era's delivered engraved mark.
 *
 * The three were drawn by different hands at different times and do not read alike at 190 pixels
 * wide, which is the size the pick screen puts them at: the Cambrian's and the Devonian's letters
 * carry a broad gold face inside a bright rim, while the Triassic's are a thin rim around a black
 * face — mean ink luminance 55 against 107 and 98, with a fifth of its ink bright against two
 * fifths. On a dark interface that reads as a darker, thinner logo for one game out of three.
 *
 * This forces the three onto one palette and one tonal balance without redrawing any of them.
 * Every ink pixel keeps its *rank* — the stipple, the rim and the shading stay exactly where they
 * are, darkest to lightest — but the luminance that rank is worth is taken from the reference
 * mark's own distribution, and the result is coloured through one gold ramp. Matching the
 * distribution rather than stretching the range is what does the work: the Triassic's range was
 * already full (a bright rim and a black face), it was the share of the mark that is dark that
 * made it read heavy, and no stretch can move that. Afterwards the three have the same mean ink
 * luminance and the same share of bright ink by construction, and what still differs between them
 * is their lettering, which is theirs.
 *
 * The other half of reading alike is size. The delivered marks sit in their canvases differently —
 * the Cambrian's letters fill its height, the Devonian's leave a seventh of it empty top and
 * bottom, the Triassic's canvas is a squarer shape — so at one CSS box the three drew at three
 * different cap heights, the Triassic 168 pixels wide where the Cambrian was 190. Each is trimmed
 * to its own lettering and re-seated on one canvas at one height, so the interface can size them
 * all with a single rule. No letterform is redrawn or stretched: the trim is the alpha's own
 * bounding box and the scale is uniform.
 *
 * Run: npm run logos. Sources stay exactly as delivered; this writes `logo-header.webp` beside
 * each, which is what `assets.logo` points at.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const MARKS = [
  ['cambrian', 'public/assets/brand/logo-engraved.webp', 'public/assets/brand/logo-header.webp'],
  ['devonian', 'public/assets/devonian/brand/logo-engraved.webp', 'public/assets/devonian/brand/logo-header.webp'],
  ['triassic', 'public/assets/triassic/brand/logo-engraved.webp', 'public/assets/triassic/brand/logo-header.webp'],
];
/**
 * The ramp, from the shadow inside a letter to the lit top of its rim, sampled off the Cambrian
 * and Devonian marks — which is the look the Triassic is being brought into line with.
 */
const RAMP = [[0, 56, 40, 18], [0.35, 122, 92, 40], [0.62, 190, 152, 74], [0.82, 226, 190, 116], [1, 250, 232, 186]];
/** The mark whose tonal balance the other two are brought onto; it sits between them. */
const REFERENCE = 'devonian';
/** The shared canvas, and how much of its height the lettering is seated at. */
const CANVAS = { w: 1536, h: 560, fill: 0.9 };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();

/** Every ink luminance in a mark, sorted: the curve that says what a rank is worth. */
async function inkCurve(file) {
  const b64 = (await fs.readFile(file)).toString('base64');
  return page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const v = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) v.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    v.sort((a, b) => a - b);
    // 1001 samples is finer than the eye can follow and keeps this out of the page's memory.
    return Array.from({ length: 1001 }, (_, k) => v[Math.round((v.length - 1) * k / 1000)]);
  }, `data:image/webp;base64,${b64}`);
}

const reference = await inkCurve(MARKS.find(([era]) => era === REFERENCE)[1]);
const report = [];
for (const [era, src, out] of MARKS) {
  const b64 = (await fs.readFile(src)).toString('base64');
  const r = await page.evaluate(async ({ src, RAMP, reference, CANVAS }) => {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, W, H), d = im.data;
    const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

    const own = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) own.push(lum(i));
    own.sort((a, b) => a - b);
    /** Where this luminance stands among the mark's own ink, 0..1. */
    const rank = (v) => {
      let lo = 0, hi = own.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (own[m] < v) lo = m + 1; else hi = m; }
      return own.length > 1 ? lo / (own.length - 1) : 0;
    };
    const ramp = (t) => {
      for (let k = 1; k < RAMP.length; k++) {
        if (t <= RAMP[k][0]) {
          const [t0, r0, g0, b0] = RAMP[k - 1], [t1, r1, g1, b1] = RAMP[k];
          const u = (t - t0) / (t1 - t0 || 1);
          return [r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u];
        }
      }
      return RAMP[RAMP.length - 1].slice(1);
    };

    let before = 0, after = 0, brightBefore = 0, brightAfter = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const l = lum(i);
      // The mark's own rank, spent at the reference's prices.
      const target = reference[Math.round(rank(l) * 1000)];
      const [R, G, B] = ramp(Math.max(0, Math.min(1, target / 255)));
      const lit = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      if (d[i + 3] > 128) { before += l; after += lit; if (l > 140) brightBefore++; if (lit > 140) brightAfter++; n++; }
      d[i] = Math.round(R); d[i + 1] = Math.round(G); d[i + 2] = Math.round(B);
    }
    g.putImageData(im, 0, 0);

    // Trim to the lettering and re-seat it on the shared canvas at the shared height.
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const iw = x1 - x0 + 1, ih = y1 - y0 + 1;
    const out = document.createElement('canvas'); out.width = CANVAS.w; out.height = CANVAS.h;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
    const k = Math.min((CANVAS.h * CANVAS.fill) / ih, (CANVAS.w * CANVAS.fill) / iw);
    og.drawImage(c, x0, y0, iw, ih, (CANVAS.w - iw * k) / 2, (CANVAS.h - ih * k) / 2, iw * k, ih * k);

    return { W, H, before: Math.round(before / n), after: Math.round(after / n),
      goldBefore: +(brightBefore / n).toFixed(2), goldAfter: +(brightAfter / n).toFixed(2),
      capBefore: +(ih / H).toFixed(2), capAfter: +((ih * k) / CANVAS.h).toFixed(2),
      webp: out.toDataURL('image/webp', 0.92) };
  }, { src: `data:image/webp;base64,${b64}`, RAMP, reference, CANVAS });
  await fs.writeFile(out, Buffer.from(r.webp.split(',')[1], 'base64'));
  const bytes = (await fs.stat(out)).size;
  report.push({ era, out, ...r, webp: undefined, kb: +(bytes / 1024).toFixed(0) });
  console.log(`${era.padEnd(9)} ${r.W}×${r.H} → ${CANVAS.w}×${CANVAS.h}  ink luminance ${String(r.before).padStart(3)} → ${r.after}   bright ${r.goldBefore} → ${r.goldAfter}   lettering fills ${r.capBefore} → ${r.capAfter} of the height   ${(bytes / 1024).toFixed(0)} KB`);
}
await browser.close();

const spread = (k) => Math.max(...report.map((r) => r[k])) - Math.min(...report.map((r) => r[k]));
console.log(`\nthe three now sit within ${spread('after')} of one another in mean ink luminance (was ${spread('before')}), `
  + `${spread('goldAfter').toFixed(2)} in bright ink (was ${spread('goldBefore').toFixed(2)}) `
  + `and ${spread('capAfter').toFixed(2)} in how much of the canvas the lettering fills (was ${spread('capBefore').toFixed(2)})`);
