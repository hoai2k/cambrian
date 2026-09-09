/**
 * Turn delivered brand PNGs in `intake/` into the WebP assets the game loads.
 * Run: npm run brand
 *
 * Two jobs, because the two logos are different kinds of picture:
 *
 * - The **wordmark** arrives as artwork on a white page and has to end up as letters on nothing:
 *   it sits over the sea on the pick screen, so any white left behind reads as a box around the
 *   title. White is removed by how *colourless* a bright pixel is rather than by how bright it is,
 *   because the gold has highlights as bright as the paper — brightness alone eats them. Edge
 *   pixels come out part transparent, and their colour is then un-blended from the white they were
 *   drawn against (`unmix`), or the cutout keeps a pale fringe that only shows once it is over
 *   dark water.
 * - The **illustrated plate** is a full rectangle — the title screen's background and the loading
 *   screen's logo — so it only changes format.
 *
 * Originals stay in `intake/` in git history; this writes derived files and never edits in place.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const sharp = createRequire(path.join(process.cwd(), 'package.json'))('sharp');

/** Bright *and* colourless is paper; bright and saturated is gold. Ramps, so edges stay smooth. */
const LO = 205, HI = 248;          // luminance ramp: below LO never paper, above HI fully bright
const SAT_LO = 0.04, SAT_HI = 0.16; // saturation ramp: above SAT_HI never paper
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Tone match for the illustrated plate — see the plate job for the measurements behind it. */
const PLATE_BRIGHTNESS = 0.90;

/**
 * Lift artwork off a white page.
 *
 * Returns straight (un-premultiplied) RGBA: a half-covered edge pixel keeps the artwork's own
 * colour at half alpha rather than that colour already mixed with white, which is what stops the
 * fringe.
 */
async function knockOutWhite(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const bright = clamp01((mx - LO) / (HI - LO));
    const colourless = clamp01((SAT_HI - sat) / (SAT_HI - SAT_LO));
    const alpha = clamp01(1 - bright * colourless);
    if (alpha <= 0.002) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
    // c = a·src + (1-a)·white  ⇒  src = (c - 255(1-a)) / a
    const unmix = (c) => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - alpha)) / alpha)));
    out[o] = unmix(r); out[o + 1] = unmix(g); out[o + 2] = unmix(b);
    out[o + 3] = Math.round(alpha * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
const report = async (label, file) => {
  const m = await sharp(file).metadata();
  console.log(`  ${label.padEnd(12)} ${file}  ${m.width}×${m.height}  alpha=${m.hasAlpha}  ${kb(file)}`);
};

const JOBS = [
  {
    label: 'wordmark', from: 'intake/cambrian-logo-engraved.png', to: 'public/assets/brand/logo-engraved.webp',
    // Wide enough to stay crisp on a dense display; it is only ever drawn small.
    async run(from, to) {
      const lifted = await knockOutWhite(from);
      // Trim the transparent margin the page left, then a little breathing room back so no serif
      // touches the edge, then down to the width the game ships.
      // Encoded, not raw: a raw buffer carries no size, so the second pipeline cannot read it.
      const trimmed = await lifted.trim({ threshold: 1 }).png().toBuffer();
      await sharp(trimmed).resize({ width: 1536, withoutEnlargement: true })
        .extend({ top: 12, bottom: 12, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(to);
    },
  },
  {
    label: 'plate', from: 'intake/cambrian-logo-illustrated.png', to: 'public/assets/brand/logo-illustrated.webp',
    async run(from, to) {
      // Toned to sit where the plate it replaces sat. Measured against that one: it read a whole-
      // image mean luminance of 95 and 18% of the pixels under the title text brighter than
      // mid-grey; this delivery came in at 106 and 32%, which is bright enough that white text over
      // it starts to disappear. 0.90 puts the mean back on 95 and the bright fraction on 20% —
      // matched by measurement rather than by eye, and gentle enough to leave the artwork alone.
      await sharp(from).modulate({ brightness: PLATE_BRIGHTNESS }).webp({ quality: 88, effort: 6 }).toFile(to);
    },
  },
];

let done = 0;
for (const job of JOBS) {
  if (!fs.existsSync(job.from)) { console.log(`  ${job.label.padEnd(12)} skipped — no ${job.from}`); continue; }
  fs.mkdirSync(path.dirname(job.to), { recursive: true });
  await job.run(job.from, job.to);
  await report(job.label, job.to);
  done++;
}
console.log(`brand intake: ${done} asset(s) written`);
