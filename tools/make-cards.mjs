/**
 * Creature image intake. From each studio render (public/assets/creatures/<id>.png) produces:
 *   <id>.card.png   hero cutout (transparent background) for the select screen and results
 *   <id>.thumb.png  256x192 thumbnail for the picker grid
 * and records, in images.json, a fingerprint of the GLB the images were made from — plus a
 * hash of the transparent select render (<id>.select.png) if one is present — so
 * tools/check-creature-assets.mjs can flag images that need regenerating after a model,
 * colour or texture change.
 *
 * Usage: node tools/make-cards.mjs [id ...]      (no ids = every creature with a render)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { fingerprint } from './creature-fingerprint.mjs';

const dir = 'public/assets/creatures';
const only = new Set(process.argv.slice(2));
const manifestPath = `${dir}/images.json`;
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

const ids = fs.readdirSync(dir).filter((f) => /^[a-z]+\.png$/.test(f)).map((f) => f.replace('.png', '')).filter((id) => !only.size || only.has(id));
for (const id of ids) {
  const png = PNG.sync.read(fs.readFileSync(`${dir}/${id}.png`));
  const { width: w, height: h, data } = png;
  // Preserve authored transparent renders, including dark eyes and translucent tissue.
  // Opaque studio renders still use their sampled backdrop.
  const hasAlpha = data.some((v, i) => i % 4 === 3 && v < 255);
  // Key out a flat studio backdrop only when no authored alpha exists.
  const bg = [data[0], data[1], data[2]];
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const d = Math.hypot(data[i * 4] - bg[0], data[i * 4 + 1] - bg[1], data[i * 4 + 2] - bg[2]); alpha[i] = hasAlpha ? data[i * 4 + 3] / 255 : Math.min(1, Math.max(0, (d - 10) / 26)); }
  const card = new PNG({ width: w, height: h });
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let a = alpha[i];
    if (!hasAlpha) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) a = Math.min(a, Math.max(alpha[yy * w + xx], alpha[i] * 0.85)); }
    card.data[i * 4] = data[i * 4]; card.data[i * 4 + 1] = data[i * 4 + 1]; card.data[i * 4 + 2] = data[i * 4 + 2]; card.data[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.2) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  fs.writeFileSync(`${dir}/${id}.card.png`, PNG.sync.write(card));

  // thumbnail: crop to the subject with padding, fit into 256x192, box-filtered
  const TW = 256, TH = 192;
  const pad = 0.08;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const cx = minX - bw * pad, cy = minY - bh * pad, cw = bw * (1 + 2 * pad), ch = bh * (1 + 2 * pad);
  const scale = Math.max(cw / TW, ch / TH);
  const sw = TW * scale, sh = TH * scale, sx = cx + (cw - sw) / 2, sy = cy + (ch - sh) / 2;
  const thumb = new PNG({ width: TW, height: TH });
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const x0 = Math.floor(sx + tx * scale), x1 = Math.max(x0 + 1, Math.floor(sx + (tx + 1) * scale));
    const y0 = Math.floor(sy + ty * scale), y1 = Math.max(y0 + 1, Math.floor(sy + (ty + 1) * scale));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) { n++; continue; }
      const i = (y * w + x) * 4; const al = card.data[i + 3] / 255;
      r += card.data[i] * al; g += card.data[i + 1] * al; b += card.data[i + 2] * al; a += al; n++;
    }
    const o = (ty * TW + tx) * 4;
    if (a > 0) { thumb.data[o] = r / a; thumb.data[o + 1] = g / a; thumb.data[o + 2] = b / a; thumb.data[o + 3] = Math.round((a / n) * 255); }
  }
  fs.writeFileSync(`${dir}/${id}.thumb.png`, PNG.sync.write(thumb));

  const glbPath = `${dir}/${id}.glb`;
  const selectPath = `${dir}/${id}.select.png`;
  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  manifest[id] = {
    ...(fs.existsSync(glbPath) ? fingerprint(glbPath) : {}),
    renderSha256: sha(`${dir}/${id}.png`),
    ...(fs.existsSync(selectPath) ? { selectSha256: sha(selectPath) } : {}),
    generatedAt: new Date().toISOString(),
  };
  console.log(`${id.padEnd(14)} card ${w}x${h}  thumb ${TW}x${TH}  subject ${bw}x${bh}${fs.existsSync(selectPath) ? '  select ok' : '  NO select render'}`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', manifestPath);
