#!/usr/bin/env node
/**
 * Procedural stand-in biome plates for the Devonian era.
 *
 * Writes nine 1024×576 .webp banners to public/assets/devonian/biomes/<biome>.webp, one per
 * shared biome slot, until the painted plates in docs/image-requests.md land. The HUD shows a
 * plate at ~28% opacity behind large text when a player enters the biome, so everything here is
 * soft: a vertical water gradient in the biome's fog colour, low-frequency value-noise mottling,
 * faint light shafts, a hazy seabed band, and a few large blurred silhouettes that say what the
 * biome is (crinoid crowns, stromatoporoid domes, a distant placoderm…). Nothing sharp, no text.
 *
 * Deterministic: one seeded PRNG per plate, no Math.random.
 *
 *   node tools/devonian/biome-plates.mjs        # npm run devonian:plates
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'devonian', 'biomes');
if (process.argv.includes('--overwrite-painted')) {
  console.warn('Explicitly regenerating procedural biome plates over the painted set.');
} else if ((await import('node:fs')).existsSync(path.join(OUT_DIR, 'manifest.json'))) {
  console.log('Painted biome plates are installed; kept them. Use --overwrite-painted for a deliberate fallback rebuild.');
  process.exit(0);
}
const W = 1024;
const H = 576;

/** Fog and sand colours copied from src/content/devonian/environment.ts (ATMOS / SAND_COLORS); keep in sync. */
const ATMOS = {
  shallows: { fog: '#2a8a86', sand: '#cfc2a0', sky: 2.1 },
  nursery: { fog: '#4f6a4a', sand: '#8a7a5c', sky: 1.6 },
  shelf: { fog: '#1d5a63', sand: '#8e8b74', sky: 1.7 },
  forest: { fog: '#1a5a5c', sand: '#8b8f78', sky: 1.6 },
  boulders: { fog: '#1e6068', sand: '#b9b39c', sky: 1.8 },
  flats: { fog: '#237078', sand: '#c9c3ae', sky: 1.9 },
  channel: { fog: '#0d3f4d', sand: '#6f766c', sky: 1.4 },
  escarpment: { fog: '#0b3646', sand: '#727a74', sky: 1.3 },
  basin: { fog: '#071a2a', sand: '#4d5a62', sky: 0.85 },
};
/** Devonian names of the shared slots, from the same file; the silhouettes follow these, not the slot ids. */
const NAMES = {
  shallows: 'Sandy Shallows', nursery: 'River Mouth', shelf: 'Mud Shelf', forest: 'Crinoid Meadow',
  boulders: 'Stromatoporoid Reef', flats: 'Carbonate Pavement', channel: 'Tidal Channels',
  escarpment: 'Reef Front', basin: 'Open Sea',
};
const BIOMES = Object.keys(ATMOS);

// ---------------------------------------------------------------------------------------------
// Small deterministic helpers.

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
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
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
// Base: gradient + mottling + seabed, rendered straight into an RGB buffer.

function renderBase(biome, rng) {
  const { fog, sand, sky } = ATMOS[biome];
  const fogC = hex(fog);
  const sandC = hex(sand);
  // The surface is the fog colour lifted toward a pale sky; the depths are the fog crushed darker.
  const skyLift = clamp01(0.22 + sky * 0.16);
  const glare = mix(fogC, [235, 242, 232], clamp01(skyLift + 0.2));
  const top = mix(fogC, [225, 235, 225], skyLift);
  const mid = mix(fogC, [0, 0, 0], 0.12);
  const deep = mix(fogC, [0, 0, 0], 0.4);
  // Underwater sand reads as sand tinted by the water around it, but still lighter than the depths.
  const bed = mix(sandC, fogC, 0.5);
  const bedFar = mix(sandC, fogC, 0.74);

  const noise = makeNoise(rng, 4);
  const shaftNoise = makeNoise(rng, 2);
  const bedNoise = makeNoise(rng, 3);
  const bedY = 0.72 + (rng() - 0.5) * 0.06; // where the seabed haze begins, as a fraction of height
  const buf = Buffer.alloc(W * H * 3);
  let p = 0;
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      // Water column.
      let c =
        v < 0.12 ? mix(glare, top, smooth(v / 0.12)) :
        v < 0.5 ? mix(top, mid, smooth((v - 0.12) / 0.38)) :
        mix(mid, deep, smooth((v - 0.5) / 0.5));
      // Large soft mottling, stronger up near the surface where caustic light plays.
      const m = (noise(u * 1.0, v * 0.6) - 0.5) * (0.3 - v * 0.18);
      c = mix(c, m > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(m));
      // Broad vertical bands of brighter water: the light shafts' underlay.
      const s = clamp01(shaftNoise(u * 2.2 + v * 0.35, 0.3) - 0.5) * (1 - v) * (1 - v) * 0.7 * skyLift;
      c = mix(c, top, s);
      // Seabed: a hazy band rising from the bottom, with its own gentle undulation.
      const bedEdge = bedY + (bedNoise(u * 1.2, 0.5) - 0.5) * 0.08;
      if (v > bedEdge - 0.14) {
        const t = smooth(clamp01((v - (bedEdge - 0.14)) / 0.3));
        const bc = mix(bedFar, bed, smooth(clamp01((v - bedEdge) / (1 - bedEdge))));
        const grain = (bedNoise(u * 3, v * 3) - 0.5) * 0.12;
        c = mix(c, mix(bc, grain > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(grain)), t * 0.85);
      }
      buf[p++] = clamp01(c[0] / 255) * 255;
      buf[p++] = clamp01(c[1] / 255) * 255;
      buf[p++] = clamp01(c[2] / 255) * 255;
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------------------------
// SVG layers: light shafts and the biome's silhouettes. Each layer is blurred so nothing is crisp.

function svgDoc(inner, blur) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
      `<g filter="url(#b)">${inner}</g></svg>`,
  );
}

function lightShafts(biome, rng) {
  const { sky } = ATMOS[biome];
  const strength = clamp01(sky * 0.06);
  if (strength < 0.02) return null;
  const count = 3 + Math.floor(rng() * 3);
  let g = '';
  for (let i = 0; i < count; i++) {
    const x = lerp(120, W - 120, rng());
    const w = lerp(50, 140, rng());
    const lean = lerp(-140, 140, rng());
    const a = strength * lerp(0.5, 1, rng());
    g += `<polygon points="${x - w / 2},-40 ${x + w / 2},-40 ${x + w + lean},${H * 0.62} ${x - w * 1.6 + lean},${H * 0.62}" fill="url(#s${i})"/>`;
  }
  let defs = '<defs>';
  for (let i = 0; i < count; i++) {
    defs += `<linearGradient id="s${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${strength}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
  }
  defs += '</defs>';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${defs}` +
      `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>` +
      `<g filter="url(#b)">${g}</g></svg>`,
  );
}

/** Silhouette ink: darker than the water; far layers lighter and bluer than near ones. */
function ink(biome, depth) {
  const fogC = hex(ATMOS[biome].fog);
  // Dark offshore fogs leave no room below them; push the ink harder toward black there so a
  // shape still separates from the water at the same low alpha.
  const lum = (fogC[0] * 0.3 + fogC[1] * 0.59 + fogC[2] * 0.11) / 255;
  const boost = clamp01((0.35 - lum) / 0.35) * 0.4;
  return mix(fogC, [0, 0, 0], clamp01(lerp(0.3, 0.65, depth) + boost));
}

// Shape builders return SVG fragments in plate coordinates. `x` is the base position and `s` a scale.
const shapes = {
  /** A crinoid: curved stalk, a crown of arms fanning up and out. */
  crinoid(rng, x, base, s) {
    const h = 230 * s;
    const sway = lerp(-50, 50, rng()) * s;
    const topX = x + sway;
    const topY = base - h;
    let d = `<path d="M${x},${base} Q${x + sway * 0.3},${base - h * 0.55} ${topX},${topY}" stroke-width="${5 * s}" fill="none" stroke-linecap="round"/>`;
    const arms = 7 + Math.floor(rng() * 4);
    for (let i = 0; i < arms; i++) {
      const ang = lerp(-1.25, 1.25, i / (arms - 1)) + (rng() - 0.5) * 0.2;
      const len = lerp(60, 95, rng()) * s;
      const ex = topX + Math.sin(ang) * len;
      const ey = topY - Math.cos(ang) * len;
      const cx = topX + Math.sin(ang * 0.6) * len * 0.5;
      const cy = topY - Math.cos(ang * 0.6) * len * 0.5 - 8 * s;
      d += `<path d="M${topX},${topY} Q${cx},${cy} ${ex},${ey}" stroke-width="${3.2 * s}" fill="none" stroke-linecap="round"/>`;
    }
    d += `<ellipse cx="${topX}" cy="${topY}" rx="${9 * s}" ry="${11 * s}"/>`;
    return d;
  },
  /** Stromatoporoid: a low laminated dome, sometimes with a smaller dome piggybacking. */
  dome(rng, x, base, s) {
    const w = lerp(180, 300, rng()) * s;
    const h = lerp(60, 110, rng()) * s;
    let d = `<path d="M${x - w / 2},${base} C${x - w / 2},${base - h * 1.3} ${x + w / 2},${base - h * 1.3} ${x + w / 2},${base} Z"/>`;
    if (rng() < 0.6) {
      const ox = x + (rng() - 0.5) * w * 0.4;
      const w2 = w * 0.45;
      const h2 = h * 0.5;
      d += `<path d="M${ox - w2 / 2},${base - h * 0.75} C${ox - w2 / 2},${base - h * 0.75 - h2 * 1.3} ${ox + w2 / 2},${base - h * 0.75 - h2 * 1.3} ${ox + w2 / 2},${base - h * 0.75} Z"/>`;
    }
    return d;
  },
  /** A flat slab of pavement: a shallow trapezoid lying on the bed. */
  slab(rng, x, base, s) {
    const w = lerp(220, 380, rng()) * s;
    const h = lerp(14, 30, rng()) * s;
    const skew = lerp(-30, 30, rng()) * s;
    return `<path d="M${x - w / 2},${base} L${x - w / 2 + skew + 20 * s},${base - h} L${x + w / 2 + skew - 20 * s},${base - h} L${x + w / 2},${base} Z"/>`;
  },
  /** Driftwood: a tapering log with a stub branch, lying at a slight angle. */
  log(rng, x, base, s) {
    const len = lerp(260, 420, rng()) * s;
    const th = lerp(22, 36, rng()) * s;
    const tilt = lerp(-0.12, 0.12, rng());
    const x0 = x - len / 2;
    const x1 = x + len / 2;
    const y0 = base - Math.tan(tilt) * len * 0.5;
    const y1 = base + Math.tan(tilt) * len * 0.5;
    let d = `<path d="M${x0},${y0 - th * 0.3} Q${x},${(y0 + y1) / 2 - th} ${x1},${y1 - th * 0.55} L${x1},${y1 + th * 0.35} Q${x},${(y0 + y1) / 2 + th * 0.3} ${x0},${y0 + th * 0.4} Z"/>`;
    const bx = lerp(x0 + len * 0.25, x1 - len * 0.2, rng());
    d += `<path d="M${bx},${(y0 + y1) / 2 - th * 0.4} Q${bx + 25 * s},${(y0 + y1) / 2 - 60 * s} ${bx + 55 * s},${(y0 + y1) / 2 - 95 * s}" stroke-width="${8 * s}" fill="none" stroke-linecap="round"/>`;
    return d;
  },
  /** Reed stems: tall, slightly bowed, in a small clump. */
  reeds(rng, x, base, s) {
    let d = '';
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const bx = x + (i - n / 2) * 18 * s + (rng() - 0.5) * 10;
      const h = lerp(200, 330, rng()) * s;
      const bow = lerp(-45, 45, rng()) * s;
      d += `<path d="M${bx},${base} Q${bx + bow * 0.4},${base - h * 0.6} ${bx + bow},${base - h}" stroke-width="${lerp(3, 6, rng()) * s}" fill="none" stroke-linecap="round"/>`;
    }
    return d;
  },
  /** A placoderm seen from the side, far off: heavy head shield, tapering body, a lunate tail. */
  fish(rng, x, y, s) {
    const len = 360 * s;
    const h = 95 * s;
    const dir = rng() < 0.5 ? -1 : 1;
    const body =
      `M0,0 C${len * 0.12},${-h * 0.55} ${len * 0.35},${-h * 0.6} ${len * 0.55},${-h * 0.32} ` +
      `C${len * 0.7},${-h * 0.2} ${len * 0.82},${-h * 0.1} ${len * 0.9},${-h * 0.35} ` +
      `L${len},${-h * 0.42} L${len * 0.95},0 L${len},${h * 0.4} L${len * 0.9},${h * 0.3} ` +
      `C${len * 0.82},${h * 0.1} ${len * 0.7},${h * 0.2} ${len * 0.55},${h * 0.32} ` +
      `C${len * 0.35},${h * 0.62} ${len * 0.12},${h * 0.55} 0,0 Z`;
    const fin = `M${len * 0.36},${h * 0.2} L${len * 0.5},${h * 0.62} L${len * 0.56},${h * 0.28} Z`;
    return `<g transform="translate(${x},${y}) scale(${dir},1)"><path d="${body}"/><path d="${fin}"/></g>`;
  },
  /** Ripple lines: long low sine-ish strokes across the bed, sand ridges in a tidal channel. */
  ripples(rng, x, y, s) {
    let d = '';
    const n = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const yy = y + i * 24 * s;
      const w = lerp(260, 420, rng()) * s;
      const amp = lerp(6, 12, rng()) * s;
      const x0 = x - w / 2 + (rng() - 0.5) * 60;
      let path = `M${x0},${yy}`;
      const segs = 5;
      for (let k = 1; k <= segs; k++) {
        const px = x0 + (w / segs) * k;
        const cx = x0 + (w / segs) * (k - 0.5);
        path += ` Q${cx},${yy + (k % 2 ? -amp : amp)} ${px},${yy}`;
      }
      d += `<path d="${path}" stroke-width="${lerp(3, 5, rng()) * s}" fill="none" stroke-linecap="round"/>`;
    }
    return d;
  },
  /** A soft mud hummock or drowned bank: a broad low lump. */
  hummock(rng, x, base, s) {
    const w = lerp(260, 460, rng()) * s;
    const h = lerp(30, 70, rng()) * s;
    return `<path d="M${x - w / 2},${base} Q${x - w * 0.2},${base - h} ${x + w * 0.1},${base - h * 0.8} Q${x + w * 0.35},${base - h * 0.6} ${x + w / 2},${base} Z"/>`;
  },
  /** A reef wall dropping away: a jagged upper edge falling to the right or left. */
  wall(rng, x, base, s) {
    const w = 520 * s;
    const h = lerp(180, 260, rng()) * s;
    const dir = rng() < 0.5 ? 1 : -1;
    const pts = [];
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x + dir * (t * w - w / 2);
      const py = base - h * (1 - smooth(t)) + (rng() - 0.5) * 24 * s;
      pts.push(`${px},${py}`);
    }
    return `<path d="M${x - dir * w / 2},${base + 80} L${pts.join(' L')} L${x + dir * w / 2},${base + 80} Z"/>`;
  },
  /** Small fish: a lozenge with a forked tail, for schools in mid-water. */
  minnow(rng, x, y, s) {
    const len = 42 * s;
    const h = 12 * s;
    const dir = rng() < 0.5 ? -1 : 1;
    return `<g transform="translate(${x},${y}) scale(${dir},1)"><path d="M0,0 Q${len * 0.4},${-h} ${len * 0.8},0 Q${len * 0.4},${h} 0,0 Z M${len * 0.78},0 L${len},${-h * 0.7} L${len * 0.93},0 L${len},${h * 0.7} Z"/></g>`;
  },
};

/**
 * Per-biome silhouette plans. Each entry is a layer: far layers are drawn first, lighter and
 * blurrier; near layers last, darker and a touch crisper. `place` returns SVG for that layer.
 */
function plan(biome, rng) {
  const bedTop = H * 0.74;
  const spread = (n, lo, hi) => Array.from({ length: n }, (_, i) => lerp(lo, hi, (i + 0.5 + (rng() - 0.5) * 0.7) / n));
  const layers = [];
  const far = (draw) => layers.push({ depth: 0.15, alpha: 0.12, blur: 5, draw });
  const midl = (draw) => layers.push({ depth: 0.5, alpha: 0.18, blur: 3, draw });
  const near = (draw) => layers.push({ depth: 0.9, alpha: 0.25, blur: 1.8, draw });
  switch (NAMES[biome]) {
    case 'Sandy Shallows':
      far(() => spread(3, 80, W - 80).map((x) => shapes.hummock(rng, x, bedTop - 20, 0.7)).join(''));
      midl(() => spread(5, 60, W - 60).map((x) => shapes.ripples(rng, x, bedTop + 20 + rng() * 40, 0.8)).join(''));
      near(() => spread(6, 100, W - 100).map((x) => shapes.minnow(rng, x, lerp(H * 0.3, H * 0.55, rng()), 1)).join(''));
      break;
    case 'River Mouth':
      far(() => spread(3, 120, W - 120).map((x) => shapes.reeds(rng, x, bedTop - 10, 0.75)).join(''));
      midl(() => spread(2, 200, W - 200).map((x) => shapes.log(rng, x, bedTop + 30, 0.9)).join(''));
      near(() => spread(2, 80, W - 80).map((x) => shapes.reeds(rng, x, H - 10, 1.15)).join(''));
      break;
    case 'Mud Shelf':
      far(() => spread(3, 100, W - 100).map((x) => shapes.hummock(rng, x, bedTop - 30, 0.9)).join(''));
      midl(() => spread(2, 200, W - 200).map((x) => shapes.hummock(rng, x, bedTop + 30, 1.2)).join(''));
      near(() => spread(4, 100, W - 100).map((x) => shapes.crinoid(rng, x, H - 30, 0.6)).join(''));
      break;
    case 'Crinoid Meadow':
      far(() => spread(7, 40, W - 40).map((x) => shapes.crinoid(rng, x, bedTop + 10, 0.7)).join(''));
      midl(() => spread(5, 60, W - 60).map((x) => shapes.crinoid(rng, x, bedTop + 60, 1.0)).join(''));
      near(() => spread(3, 120, W - 120).map((x) => shapes.crinoid(rng, x, H - 10, 1.3)).join(''));
      break;
    case 'Stromatoporoid Reef':
      far(() => spread(4, 60, W - 60).map((x) => shapes.dome(rng, x, bedTop - 10, 0.8)).join(''));
      midl(() => spread(3, 120, W - 120).map((x) => shapes.dome(rng, x, bedTop + 50, 1.15)).join(''));
      near(() => spread(2, 150, W - 150).map((x) => shapes.dome(rng, x, H - 25, 1.4)).join(''));
      break;
    case 'Carbonate Pavement':
      far(() => spread(4, 80, W - 80).map((x) => shapes.slab(rng, x, bedTop - 5, 0.8)).join(''));
      midl(() => spread(4, 60, W - 60).map((x) => shapes.slab(rng, x, bedTop + 45, 1.1)).join(''));
      near(() => spread(3, 100, W - 100).map((x) => shapes.slab(rng, x, H - 20, 1.4)).join(''));
      break;
    case 'Tidal Channels':
      far(() => spread(2, 150, W - 150).map((x) => shapes.hummock(rng, x, bedTop - 25, 1.1)).join(''));
      midl(() => spread(4, 80, W - 80).map((x) => shapes.ripples(rng, x, bedTop + 10 + rng() * 30, 1.0)).join(''));
      near(() => spread(3, 100, W - 100).map((x) => shapes.ripples(rng, x, H - 90 + rng() * 40, 1.3)).join(''));
      break;
    case 'Reef Front':
      far(() => shapes.wall(rng, W * (0.3 + rng() * 0.4), bedTop - 40, 1.0));
      midl(() => spread(3, 80, W - 80).map((x) => shapes.dome(rng, x, bedTop + 30, 0.9)).join(''));
      near(() => spread(3, 100, W - 100).map((x) => shapes.crinoid(rng, x, H - 20, 1.0)).join(''));
      break;
    case 'Open Sea':
      far(() => spread(8, 60, W - 60).map((x) => shapes.minnow(rng, x, lerp(H * 0.45, H * 0.7, rng()), 0.9)).join(''));
      midl(() => shapes.fish(rng, W * (0.2 + rng() * 0.25), H * (0.32 + rng() * 0.15), 1.5));
      near(() => shapes.hummock(rng, W * (0.3 + rng() * 0.4), H - 10, 1.2));
      break;
    default:
      break;
  }
  return layers;
}

// ---------------------------------------------------------------------------------------------

async function renderPlate(biome) {
  const rng = mulberry32(hashSeed(`devonian-plate:${biome}`));
  const base = renderBase(biome, rng);
  const composites = [];
  const shafts = lightShafts(biome, rng);
  if (shafts) composites.push({ input: shafts, blend: 'screen' });
  for (const layer of plan(biome, rng)) {
    const c = ink(biome, layer.depth);
    const inner = `<g fill="${rgb(c, layer.alpha)}" stroke="${rgb(c, layer.alpha)}">${layer.draw()}</g>`;
    composites.push({ input: svgDoc(inner, layer.blur) });
  }
  // A final breath of haze over everything, so the silhouettes sit *in* the water rather than on it.
  const fogC = hex(ATMOS[biome].fog);
  composites.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${rgb(scale(fogC, 1.15), 0.06)}"/><stop offset="0.55" stop-color="${rgb(fogC, 0.02)}"/>` +
        `<stop offset="1" stop-color="${rgb(scale(fogC, 0.7), 0.05)}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#h)"/></svg>`,
    ),
  });
  return sharp(base, { raw: { width: W, height: H, channels: 3 } })
    .composite(composites)
    .webp({ quality: 80 })
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const biome of BIOMES) {
    const out = path.join(OUT_DIR, `${biome}.webp`);
    await writeFile(out, await renderPlate(biome));
    console.log(`wrote ${path.relative(ROOT, out)}  (${NAMES[biome]})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
