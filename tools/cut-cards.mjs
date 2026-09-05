// Turns the studio renders (flat dark backdrop) into transparent cutouts for the select screen.
import fs from 'node:fs';
import { PNG } from 'pngjs';
const dir = 'public/assets/creatures';
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png') && !x.endsWith('.card.png'))) {
  const png = PNG.sync.read(fs.readFileSync(`${dir}/${f}`));
  const { width: w, height: h, data } = png;
  const bg = [data[0], data[1], data[2]];
  const key = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const d = key(i * 4); alpha[i] = Math.min(1, Math.max(0, (d - 10) / 26)); }
  // soften: min over 3x3 to kill fringe, then write
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let a = alpha[i];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) a = Math.min(a, Math.max(alpha[yy * w + xx], alpha[i] * 0.85)); }
    out.data[i * 4] = data[i * 4]; out.data[i * 4 + 1] = data[i * 4 + 1]; out.data[i * 4 + 2] = data[i * 4 + 2]; out.data[i * 4 + 3] = Math.round(a * 255);
  }
  fs.writeFileSync(`${dir}/${f.replace('.png', '.card.png')}`, PNG.sync.write(out));
  console.log('cut', f, `bg=${bg}`);
}
