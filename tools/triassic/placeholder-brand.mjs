#!/usr/bin/env node
/**
 * Placeholder brand assets for the Triassic era, until delivered art lands
 * (docs/triassic/03-image-and-model-requests.md). Writes to public/assets/triassic/brand/:
 *
 *   logo.svg               hand-written wordmark, "TRIASSIC" / "TIDE" on two lines
 *   title.webp             2560×1440 painterly key-art placeholder
 *   title-mobile.webp      1080×1920 portrait crop of the same recipe
 *   emblem.webp            512×512 rounded-square mark (a blowhole ring)
 *   favicon-16/32/192/512.png, apple-touch-icon.png   the emblem, resized
 *   favicon.ico            a real ICO (16 + 32 px PNG payloads), not a renamed PNG
 *
 * Text note: sharp (via librsvg) rasterises SVG <text> in this container even with no game fonts
 * installed — it falls back to a serif face rather than tofu boxes (checked with a throwaway
 * <text> SVG before writing this). `font-family: 'Cinzel', Georgia, serif` is therefore used
 * as real <text>, per the brief; an <img> of this SVG elsewhere will fall back to a plain serif
 * too, which is fine for a placeholder.
 *
 * Deterministic: one seeded PRNG for the painted key art, no Math.random.
 *
 *   node tools/triassic/placeholder-brand.mjs        # npm run triassic:brand
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'triassic', 'brand');

// ---------------------------------------------------------------------------------------------
// Small deterministic helpers (same recipe as tools/devonian/biome-plates.mjs).

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, alpha) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

/** Tileable-enough value noise on a lattice, summed over octaves. Returns [0,1]. */
function makeNoise(rng, octaves = 4) {
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    const n = 8 << o;
    const grid = new Float32Array((n + 1) * (n + 1));
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    layers.push({ n, grid });
  }
  return (u, v) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (const { n, grid } of layers) {
      const x = u * n;
      const y = v * n;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = smooth(x - x0);
      const fy = smooth(y - y0);
      const i = (yy, xx) => grid[Math.min(yy, n) * (n + 1) + Math.min(xx, n)];
      const a = lerp(i(y0, x0), i(y0, x0 + 1), fx);
      const b = lerp(i(y0 + 1, x0), i(y0 + 1, x0 + 1), fx);
      sum += lerp(a, b, fy) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

// ---------------------------------------------------------------------------------------------
// 1. logo.svg — a hand-written wordmark. Pure vector, written straight to disk.

const FOAM = '#eefaf6';
const EMBER = '#ffb36b';
const CORAL = '#ff5b6e';
const ABYSS = '#07202a';

function buildLogoSvg() {
  const W = 2400;
  const H = 900;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><linearGradient id="tide" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${EMBER}"/><stop offset="1" stop-color="${CORAL}"/>` +
    `</linearGradient></defs>` +
    `<text x="${W / 2}" y="380" text-anchor="middle" font-family="'Cinzel', Georgia, serif" ` +
    `font-weight="700" font-size="230" letter-spacing="14" fill="${FOAM}">TRIASSIC</text>` +
    `<text x="${W / 2}" y="760" text-anchor="middle" font-family="'Cinzel', Georgia, serif" ` +
    `font-weight="700" font-size="280" letter-spacing="24" fill="url(#tide)">TIDE</text>` +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------------------------
// 2. title.webp / title-mobile.webp — a painterly key-art placeholder.
//
// Vertical recipe: a thin hazy pale-red sky band at the very top, sliding into milk-turquoise
// water, darkening to near-black at the bottom. A few soft light shafts and a large blurred
// ichthyosaur silhouette sit in the upper third, off to one side — the upper-centre third (where
// the logo lands over this plate) stays otherwise quiet.

const SKY_RED = hex('#c98a6a');
const SKY_PALE = hex('#e9e2cf');
const WATER = hex('#5fbfb0');
const NEAR_BLACK = hex('#04121c');

/** Colour at a given vertical fraction v∈[0,1] of the title plate. */
function titleColorAt(v) {
  // Stops: [fraction, colour]. Interpolated with smoothstep between consecutive stops.
  const stops = [
    [0, SKY_RED],
    [0.045, SKY_PALE], // the thin pale band the red sky slides into
    [0.16, WATER], // where the water itself begins
    [0.55, mix(WATER, NEAR_BLACK, 0.35)],
    [1, NEAR_BLACK],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [f0, c0] = stops[i];
    const [f1, c1] = stops[i + 1];
    if (v <= f1 || i === stops.length - 2) {
      const t = f1 > f0 ? smooth(clamp01((v - f0) / (f1 - f0))) : 1;
      return mix(c0, c1, t);
    }
  }
  return NEAR_BLACK;
}

function renderTitleBase(w, h, rng) {
  const noise = makeNoise(rng, 4);
  const buf = Buffer.alloc(w * h * 3);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    const base = titleColorAt(v);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      // Faint painterly mottling, strongest in the water column, quiet in the sky band.
      const m = (noise(u * 1.1, v * 0.7) - 0.5) * (v < 0.16 ? 0.05 : 0.12);
      const c = mix(base, m > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(m));
      buf[p++] = clamp01(c[0] / 255) * 255;
      buf[p++] = clamp01(c[1] / 255) * 255;
      buf[p++] = clamp01(c[2] / 255) * 255;
    }
  }
  return buf;
}

function svgLayer(w, h, inner, blur) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs><filter id="b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
      `<g filter="url(#b)">${inner}</g></svg>`,
  );
}

/** A few soft light shafts, kept out of the upper-centre third where the wordmark lands. */
function titleLightShafts(w, h, rng) {
  const count = 3;
  let g = '';
  const sides = [
    [0.06, 0.3], // near the left edge
    [0.72, 0.96], // near the right edge
    [0.06, 0.3],
  ];
  for (let i = 0; i < count; i++) {
    const [lo, hi] = sides[i % sides.length];
    const x = lerp(lo, hi, rng()) * w;
    const width = lerp(0.05, 0.11, rng()) * w;
    const lean = lerp(-0.12, 0.12, rng()) * w;
    const a = lerp(0.05, 0.1, rng());
    g += `<polygon points="${x - width / 2},-40 ${x + width / 2},-40 ${x + width * 1.6 + lean},${h * 0.85} ${x - width * 1.6 + lean},${h * 0.85}" fill="rgba(255,255,255,${a})"/>`;
  }
  return svgLayer(w, h, g, w * 0.02);
}

/** A large soft silhouette: an ellipse body and a tapering tail, off-centre in the upper third.
 *  `dir` points the tail away from the plate's centre, so the shape reads as passing through the
 *  quiet upper-centre third rather than sitting in it. */
function ichthyosaurSilhouette(w, h, rng, cx, cy, scale, dir) {
  const bodyRx = 0.13 * w * scale;
  const bodyRy = 0.038 * w * scale;
  const tailLen = 0.18 * w * scale;
  const tailTipY = (rng() - 0.5) * bodyRy * 0.6;
  const g =
    `<g transform="translate(${cx},${cy}) scale(${dir},1)">` +
    `<ellipse cx="0" cy="0" rx="${bodyRx}" ry="${bodyRy}" fill="rgba(2,10,14,0.4)"/>` +
    `<path d="M${bodyRx * 0.7},${-bodyRy * 0.5} Q${bodyRx + tailLen * 0.6},${tailTipY - bodyRy * 1.4} ${bodyRx + tailLen},${tailTipY} ` +
    `Q${bodyRx + tailLen * 0.55},${-bodyRy * 0.1} ${bodyRx * 0.68},${bodyRy * 0.55} Z" fill="rgba(2,10,14,0.4)"/>` +
    `</g>`;
  return svgLayer(w, h, g, w * 0.018);
}

async function renderTitle(w, h, seedTag) {
  const rng = mulberry32(hashSeed(seedTag));
  const base = renderTitleBase(w, h, rng);
  const composites = [];
  composites.push({ input: titleLightShafts(w, h, rng), blend: 'screen' });
  // Off to one side, sitting in the upper third, tail pointing further off toward the edge — the
  // upper-centre third (where the wordmark lands) stays quiet.
  const onRight = rng() < 0.5;
  const cx = w * (onRight ? lerp(0.78, 0.9, rng()) : lerp(0.1, 0.22, rng()));
  const cy = h * lerp(0.2, 0.27, rng());
  composites.push({ input: ichthyosaurSilhouette(w, h, rng, cx, cy, 1, onRight ? 1 : -1) });
  return sharp(base, { raw: { width: w, height: h, channels: 3 } })
    .composite(composites)
    .webp({ quality: 82 })
    .toBuffer();
}

// ---------------------------------------------------------------------------------------------
// 3. emblem.webp — a rounded-square mark: an abyss background, a foam ring with a small gap.

function buildEmblemSvg() {
  const S = 512;
  const r = 150;
  const cx = S / 2;
  const cy = S / 2;
  const circumference = 2 * Math.PI * r;
  const gap = circumference * 0.09; // a small gap — "the blow"
  const visible = circumference - gap;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<rect x="0" y="0" width="${S}" height="${S}" rx="96" ry="96" fill="${ABYSS}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${FOAM}" stroke-width="30" ` +
    `stroke-linecap="round" stroke-dasharray="${visible} ${gap}" stroke-dashoffset="${gap / 2}"/>` +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------------------------
// 4. Favicons — the emblem, resized. favicon.ico is a real ICO (16 + 32 px PNG payloads).

/** A minimal ICO container: header + one directory entry per image, each carrying a PNG payload. */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let offset = 6 + dirSize;
  const dirEntries = [];
  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(png.width >= 256 ? 0 : png.width, 0);
    entry.writeUInt8(png.height >= 256 ? 0 : png.height, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += png.data.length;
  }
  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.data)]);
}

// ---------------------------------------------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const written = [];
  const write = async (name, buf) => {
    const out = path.join(OUT_DIR, name);
    await writeFile(out, buf);
    written.push(out);
  };

  // 1. Wordmark.
  await write('logo.svg', Buffer.from(buildLogoSvg()));

  // 2. Key art.
  await write('title.webp', await renderTitle(2560, 1440, 'triassic-title:desktop'));
  await write('title-mobile.webp', await renderTitle(1080, 1920, 'triassic-title:mobile'));

  // 3. Emblem.
  const emblemSvg = Buffer.from(buildEmblemSvg());
  const emblemPng = await sharp(emblemSvg).resize(512, 512).png().toBuffer();
  await write('emblem.webp', await sharp(emblemPng).webp({ quality: 92 }).toBuffer());

  // 4. Favicons, derived from the emblem master.
  const sizes = [16, 32, 192, 512];
  const pngs = {};
  for (const size of sizes) {
    pngs[size] = await sharp(emblemPng).resize(size, size).png().toBuffer();
    await write(`favicon-${size}.png`, pngs[size]);
  }
  await write('apple-touch-icon.png', await sharp(emblemPng).resize(180, 180).png().toBuffer());
  const ico = buildIco([
    { width: 16, height: 16, data: pngs[16] },
    { width: 32, height: 32, data: pngs[32] },
  ]);
  await write('favicon.ico', ico);

  console.log('Triassic placeholder brand assets:');
  for (const file of written) {
    const meta = await sharp(file).metadata().catch(() => null);
    const { size } = await import('node:fs').then((fs) => fs.promises.stat(file));
    const dims = meta && meta.width ? `${meta.width}×${meta.height}` : file.endsWith('.ico') ? '16/32 ico' : '';
    console.log(`  ${path.relative(ROOT, file).padEnd(48)} ${String(dims).padEnd(10)} ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
