#!/usr/bin/env node
/**
 * Procedural stand-in biome plates for the Triassic era.
 *
 * Adapted from tools/devonian/biome-plates.mjs — see that file for the full rationale. Writes nine
 * 1024×576 .webp banners to public/assets/triassic/biomes/<biome>.webp, one per shared biome slot,
 * until painted plates land. Same recipe: a vertical water gradient in the biome's fog colour,
 * low-frequency value-noise mottling, faint light shafts, a hazy seabed band, and a few large
 * blurred silhouettes that say what the biome is (stromatolite domes, conifers and horsetails,
 * algal tufts, sea-lily crowns, coral bushes, shells, channel walls, a far ichthyosaur, a floating
 * log with hanging crinoid stems…). Nothing sharp, no text.
 *
 * Deterministic: one seeded PRNG per plate, no Math.random.
 *
 *   node tools/triassic/biome-plates.mjs        # npm run triassic:plates
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'triassic', 'biomes');
// The painted plates were delivered under the biomes' names (src/content/triassic/environment.ts BIOME_PLATES);
// while every one of those exists this tool has nothing to stand in for and stops.
const PAINTED = ['gypsum-flats', 'conifer-shore', 'dasyclad-lagoon', 'sea-lily-garden', 'sponge-coral-reef', 'shell-pavement', 'margin-channels', 'reef-front', 'black-basin'];
if (!process.argv.includes('--overwrite-painted') && PAINTED.every((n) => (await import('node:fs')).existsSync(path.join(OUT_DIR, `${n}.webp`)))) {
  console.log('Painted Triassic plates are installed; nothing to stand in for. Use --overwrite-painted to write procedural slot plates anyway.');
  process.exit(0);
}
if (process.argv.includes('--overwrite-painted')) {
  console.warn('Explicitly regenerating procedural biome plates over the painted set.');
} else if ((await import('node:fs')).existsSync(path.join(OUT_DIR, 'manifest.json'))) {
  console.log('Painted biome plates are installed; kept them. Use --overwrite-painted for a deliberate fallback rebuild.');
  process.exit(0);
}
const W = 1024;
const H = 576;

/** Fog and sand colours copied from src/content/triassic/environment.ts (ATMOS); keep in sync. */
const ATMOS = {
  shallows: { fog: '#5fbfb0', sand: '#e9e2cf', sky: 2.6 },
  nursery: { fog: '#6a7f55', sand: '#a8785a', sky: 1.5 },
  shelf: { fog: '#3aa39a', sand: '#dcd3b3', sky: 2.2 },
  forest: { fog: '#2d8a86', sand: '#c9bfa2', sky: 1.9 },
  boulders: { fog: '#2b7f8e', sand: '#cfc4a8', sky: 2.0 },
  flats: { fog: '#46a8a0', sand: '#e0d9c0', sky: 2.3 },
  channel: { fog: '#124a5a', sand: '#8b8f86', sky: 1.3 },
  escarpment: { fog: '#0d3b4c', sand: '#6f7570', sky: 1.1 },
  basin: { fog: '#04121c', sand: '#2b3136', sky: 0.6 },
};
/** Triassic names of the shared slots, from the same file; the silhouettes follow these, not the slot ids. */
const NAMES = {
  shallows: 'Gypsum Flats', nursery: 'Conifer Shore', shelf: 'Dasyclad Lagoon', forest: 'Sea-Lily Garden',
  boulders: 'Sponge-Coral Reef', flats: 'Shell Pavement', channel: 'Margin Channels', escarpment: 'Reef Front',
  basin: 'Black Basin',
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
/** The bright counterpart to `ink`, for pale things sitting on the bed (a salt-white floor). */
function bright(biome, depth) {
  const fogC = hex(ATMOS[biome].fog);
  return mix(fogC, [255, 255, 255], clamp01(lerp(0.55, 0.9, depth)));
}

// Shape builders return SVG fragments in plate coordinates. `x` is the base position and `s` a scale.
const shapes = {
  /** A crinoid / sea lily: curved stalk, a crown of arms fanning up and out. */
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
  /** A low laminated dome: a stromatolite mound, or a sponge/coral mound reef-side. */
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
  /** Pale cracked salt-pan tiles lying flat on the bed — drawn with `bright`, not `ink`. */
  saltPan(rng, x, base, s) {
    let d = '';
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const cx = x + (i - n / 2) * 60 * s + (rng() - 0.5) * 20;
      const w = lerp(40, 84, rng()) * s;
      const h = lerp(8, 16, rng()) * s;
      const pts = 5 + Math.floor(rng() * 2);
      let path = '';
      for (let k = 0; k < pts; k++) {
        const ang = (k / pts) * Math.PI * 2;
        const rx = (w / 2) * (0.75 + rng() * 0.35);
        const ry = (h / 2) * (0.75 + rng() * 0.35);
        const px = cx + Math.cos(ang) * rx;
        const py = base + Math.sin(ang) * ry;
        path += (k === 0 ? 'M' : 'L') + `${px},${py}`;
      }
      d += `<path d="${path} Z"/>`;
    }
    return d;
  },
  /** A tiered conifer: a sliver trunk under three tapering skirts, seen from the shore. */
  conifer(rng, x, base, s) {
    const h = lerp(220, 340, rng()) * s;
    const w = lerp(70, 110, rng()) * s;
    let d = `<path d="M${x - w * 0.05},${base} L${x - w * 0.05},${base - h * 0.12} L${x + w * 0.05},${base - h * 0.12} L${x + w * 0.05},${base} Z"/>`;
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers;
      const t1 = (i + 0.85) / tiers;
      const y0 = base - h * 0.1 - h * 0.85 * t0;
      const y1 = base - h * 0.1 - h * 0.85 * t1;
      const ww = lerp(w, w * 0.15, t0);
      d += `<path d="M${x - ww / 2},${y0} L${x},${y1} L${x + ww / 2},${y0} Z"/>`;
    }
    return d;
  },
  /** Reed stems (horsetails): tall, slightly bowed, in a small clump. */
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
  /** A small clump of frilly algal tuft, low on the bed. */
  tuft(rng, x, base, s) {
    let d = '';
    const n = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const bx = x + (rng() - 0.5) * 44 * s;
      const h = lerp(28, 68, rng()) * s;
      const bow = lerp(-22, 22, rng()) * s;
      d += `<path d="M${bx},${base} Q${bx + bow * 0.5},${base - h * 0.6} ${bx + bow},${base - h}" stroke-width="${lerp(3, 6, rng()) * s}" fill="none" stroke-linecap="round"/>`;
    }
    return d;
  },
  /** A branching coral bush: a few base stems forking twice into short twigs. */
  coral(rng, x, base, s) {
    let d = '';
    const branch = (bx, by, ang, len, depth) => {
      const ex = bx + Math.sin(ang) * len;
      const ey = by - Math.cos(ang) * len;
      d += `<path d="M${bx},${by} L${ex},${ey}" stroke-width="${lerp(4, 9, depth === 0 ? 1 : 0.4) * s}" fill="none" stroke-linecap="round"/>`;
      if (depth < 2) {
        branch(ex, ey, ang - lerp(0.3, 0.6, rng()), len * 0.68, depth + 1);
        branch(ex, ey, ang + lerp(0.3, 0.6, rng()), len * 0.68, depth + 1);
      }
    };
    const stems = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < stems; i++) {
      const bx = x + (i - stems / 2) * 22 * s;
      branch(bx, base, (rng() - 0.5) * 0.5, lerp(50, 90, rng()) * s, 0);
    }
    return d;
  },
  /** A flat scalloped shell lying on the pavement, seen from above. */
  shell(rng, x, base, s) {
    const w = lerp(46, 86, rng()) * s;
    const h = w * 0.5;
    const seg = 6;
    let d = `<path d="M${x - w / 2},${base}`;
    for (let i = 1; i <= seg; i++) {
      const t0 = (i - 1) / seg;
      const t1 = i / seg;
      const cx = x - w / 2 + (w * (t0 + t1)) / 2;
      const cy = base - h * (0.75 + 0.25 * Math.sin(i * 1.7));
      const px = x - w / 2 + w * t1;
      d += ` Q${cx},${cy} ${px},${base - h * 0.15}`;
    }
    d += ` L${x + w / 2},${base} Z"/>`;
    return d;
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
    return `<path d="M${x - (dir * w) / 2},${base + 80} L${pts.join(' L')} L${x + (dir * w) / 2},${base + 80} Z"/>`;
  },
  /** Ripple lines: long low sine-ish strokes across the bed. */
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
  /** Crinoid stems hanging *down* from something floating above, crowns pointing to the depths. */
  hangingStems(rng, x, top, s) {
    let d = '';
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const bx = x + (i - n / 2) * 26 * s + (rng() - 0.5) * 10;
      const len = lerp(120, 220, rng()) * s;
      const sway = lerp(-30, 30, rng()) * s;
      const ex = bx + sway;
      const ey = top + len;
      d += `<path d="M${bx},${top} Q${bx + sway * 0.4},${top + len * 0.6} ${ex},${ey}" stroke-width="${lerp(2.5, 4.5, rng()) * s}" fill="none" stroke-linecap="round"/>`;
      const arms = 4 + Math.floor(rng() * 3);
      for (let k = 0; k < arms; k++) {
        const ang = lerp(-1.1, 1.1, k / (arms - 1)) + (rng() - 0.5) * 0.2;
        const alen = lerp(16, 28, rng()) * s;
        const aex = ex + Math.sin(ang) * alen;
        const aey = ey + Math.cos(ang) * alen;
        d += `<path d="M${ex},${ey} L${aex},${aey}" stroke-width="${2 * s}" fill="none" stroke-linecap="round"/>`;
      }
    }
    return d;
  },
  /** A large ichthyosaur seen far off: a long tapering body, a small dorsal fin, a lunate tail. */
  ichthyosaur(rng, x, y, s) {
    const len = 420 * s;
    const h = 70 * s;
    const dir = rng() < 0.5 ? -1 : 1;
    const body =
      `M0,0 C${len * 0.08},${-h * 0.5} ${len * 0.3},${-h * 0.55} ${len * 0.55},${-h * 0.22} ` +
      `C${len * 0.7},${-h * 0.05} ${len * 0.82},${-h * 0.02} ${len * 0.86},${-h * 0.28} ` +
      `L${len * 0.9},${-h * 0.02} L${len},0 L${len * 0.9},${h * 0.02} L${len * 0.86},${h * 0.28} ` +
      `C${len * 0.82},${h * 0.02} ${len * 0.7},${h * 0.05} ${len * 0.55},${h * 0.22} ` +
      `C${len * 0.3},${h * 0.55} ${len * 0.08},${h * 0.5} 0,0 Z`;
    const dorsal = `M${len * 0.42},${-h * 0.2} L${len * 0.5},${-h * 0.62} L${len * 0.58},${-h * 0.24} Z`;
    return `<g transform="translate(${x},${y}) scale(${dir},1)"><path d="${body}"/><path d="${dorsal}"/></g>`;
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
  const far = (draw, light = false) => layers.push({ depth: 0.15, alpha: 0.12, blur: 5, draw, light });
  const midl = (draw, light = false) => layers.push({ depth: 0.5, alpha: 0.18, blur: 3, draw, light });
  const near = (draw, light = false) => layers.push({ depth: 0.9, alpha: 0.25, blur: 1.8, draw, light });
  switch (NAMES[biome]) {
    case 'Gypsum Flats':
      far(() => spread(3, 80, W - 80).map((x) => shapes.dome(rng, x, bedTop - 15, 0.5)).join(''));
      midl(() => spread(4, 60, W - 60).map((x) => shapes.dome(rng, x, bedTop + 35, 0.75)).join(''));
      near(() => spread(5, 50, W - 50).map((x) => shapes.saltPan(rng, x, H - 40 + rng() * 30, 1.0)).join(''), true);
      break;
    case 'Conifer Shore':
      far(() => spread(3, 100, W - 100).map((x) => shapes.conifer(rng, x, bedTop - 20, 0.8)).join(''));
      midl(() => spread(4, 60, W - 60).map((x) => shapes.reeds(rng, x, bedTop + 30, 0.85)).join(''));
      near(() => spread(2, 90, W - 90).map((x) => shapes.reeds(rng, x, H - 10, 1.2)).join(''));
      break;
    case 'Dasyclad Lagoon':
      far(() => spread(6, 50, W - 50).map((x) => shapes.tuft(rng, x, bedTop + 10, 0.7)).join(''));
      midl(() => spread(5, 60, W - 60).map((x) => shapes.tuft(rng, x, bedTop + 55, 1.0)).join(''));
      near(() => spread(3, 100, W - 100).map((x) => shapes.tuft(rng, x, H - 20, 1.3)).join(''));
      break;
    case 'Sea-Lily Garden':
      far(() => spread(7, 40, W - 40).map((x) => shapes.crinoid(rng, x, bedTop + 10, 0.7)).join(''));
      midl(() => spread(5, 60, W - 60).map((x) => shapes.crinoid(rng, x, bedTop + 60, 1.0)).join(''));
      near(() => spread(3, 120, W - 120).map((x) => shapes.crinoid(rng, x, H - 10, 1.3)).join(''));
      break;
    case 'Sponge-Coral Reef':
      far(() => spread(4, 60, W - 60).map((x) => shapes.dome(rng, x, bedTop - 10, 0.7)).join(''));
      midl(() => spread(3, 100, W - 100).map((x) => shapes.coral(rng, x, bedTop + 40, 1.0)).join(''));
      near(() => spread(2, 120, W - 120).map((x) => shapes.coral(rng, x, H - 20, 1.3)).join(''));
      break;
    case 'Shell Pavement':
      far(() => spread(5, 60, W - 60).map((x) => shapes.shell(rng, x, bedTop - 5, 0.8)).join(''));
      midl(() => spread(5, 50, W - 50).map((x) => shapes.shell(rng, x, bedTop + 40, 1.1)).join(''));
      near(() => spread(4, 60, W - 60).map((x) => shapes.shell(rng, x, H - 25, 1.4)).join(''));
      break;
    case 'Margin Channels':
      far(() => shapes.wall(rng, W * (0.2 + rng() * 0.2), bedTop - 30, 0.9));
      midl(() => shapes.wall(rng, W * (0.65 + rng() * 0.2), bedTop + 10, 1.0));
      near(() => spread(3, 100, W - 100).map((x) => shapes.ripples(rng, x, H - 80 + rng() * 30, 1.2)).join(''));
      break;
    case 'Reef Front':
      far(() => shapes.wall(rng, W * (0.3 + rng() * 0.4), bedTop - 30, 1.0));
      midl(() => shapes.ichthyosaur(rng, W * (0.2 + rng() * 0.25), H * (0.3 + rng() * 0.15), 1.3));
      near(() => spread(2, 120, W - 120).map((x) => shapes.coral(rng, x, H - 20, 1.0)).join(''));
      break;
    case 'Black Basin':
      midl(() => shapes.log(rng, W * (0.35 + rng() * 0.3), H * (0.22 + rng() * 0.08), 1.0));
      midl(() => shapes.hangingStems(rng, W * (0.4 + rng() * 0.2), H * 0.26, 0.9));
      break;
    default:
      break;
  }
  return layers;
}

// ---------------------------------------------------------------------------------------------

async function renderPlate(biome) {
  const rng = mulberry32(hashSeed(`triassic-plate:${biome}`));
  const base = renderBase(biome, rng);
  const composites = [];
  const shafts = lightShafts(biome, rng);
  if (shafts) composites.push({ input: shafts, blend: 'screen' });
  for (const layer of plan(biome, rng)) {
    const c = layer.light ? bright(biome, layer.depth) : ink(biome, layer.depth);
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
