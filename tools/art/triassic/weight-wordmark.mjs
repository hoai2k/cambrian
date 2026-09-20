#!/usr/bin/env node
/**
 * Optically strengthen the delivered Triassic wordmark without redrawing its letterforms.
 *
 * The original engraved raster is retained as logo-engraved-source.webp.  The interface brief asks
 * for the same two-line lettering with heavier stems and tighter spacing, so this reproducible pass
 * condenses it slightly on the x axis and composites a small neighbourhood of the same pixels.  The
 * latter expands the existing engraved strokes rather than inventing a new font or treatment.
 *
 * Run this before `npm run logos`.
 */
import sharp from 'sharp';

const source = 'public/assets/triassic/brand/logo-engraved-source.webp';
const output = 'public/assets/triassic/brand/logo-engraved.webp';
const canvas = { width: 1536, height: 640 };
const condensedWidth = 1400;
const radius = 2;

const condensed = await sharp(source)
  .resize(condensedWidth, canvas.height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

const left = Math.round((canvas.width - condensedWidth) / 2);
const layers = [];
for (let y = -radius; y <= radius; y += 1) {
  for (let x = -radius; x <= radius; x += 1) {
    if (x * x + y * y > radius * radius) continue;
    layers.push({ input: condensed, left: left + x, top: y, blend: 'over' });
  }
}

await sharp({
  create: { width: canvas.width, height: canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(layers)
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(output);

const metadata = await sharp(output).metadata();
console.log(`${output}: ${metadata.width}x${metadata.height}, x ${(condensedWidth / canvas.width).toFixed(3)}, stroke radius ${radius}px`);
