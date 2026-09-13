/** Package imagegen animal cutouts. White extraction is the existing tools/brand-intake.mjs recipe. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const base = path.dirname(new URL(import.meta.url).pathname);
const destination = path.resolve(base, '../../../../public/assets/ancientseas');
const assets = JSON.parse(fs.readFileSync(path.join(base, 'prompts.json'))).assets;
const clamp = value => Math.max(0, Math.min(1, value));
const report = [];
for (const { id } of assets) {
  const source = path.join(base, `${id}-source.png`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // The brand key is designed for lettering. Painted animal shadows need a darker
  // inferred foreground colour: otherwise a pale opaque halo survives over parchment.
  // Identify the bright background and its contiguous pale shadows without crossing
  // dark ink outlines; preserve the animal's enclosed coloured surfaces.
  const pale = new Uint8Array(info.width * info.height);
  const queue = new Int32Array(pale.length);
  let head = 0, tail = 0;
  const visit = pixel => {
    if (pale[pixel]) return;
    const j = pixel * 4, mx = Math.max(data[j], data[j + 1], data[j + 2]);
    const mn = Math.min(data[j], data[j + 1], data[j + 2]);
    if (mx < 165 || (mx - mn) / mx > 0.28) return;
    pale[pixel] = 1; queue[tail++] = pixel;
  };
  for (let pixel = 0; pixel < pale.length; pixel++) {
    const j = pixel * 4;
    if (Math.min(data[j], data[j + 1], data[j + 2]) >= 248) visit(pixel);
  }
  while (head < tail) {
    const pixel = queue[head++], x = pixel % info.width;
    if (x > 0) visit(pixel - 1);
    if (x + 1 < info.width) visit(pixel + 1);
    if (pixel >= info.width) visit(pixel - info.width);
    if (pixel + info.width < pale.length) visit(pixel + info.width);
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const alpha = pale[i / 4]
      ? clamp(Math.max((248 - r) / 168, (248 - g) / 188, (248 - b) / 208))
      : clamp(1 - clamp((mx - 205) / 43) * clamp((0.16 - sat) / 0.12));
    if (alpha <= 0.002) { data.fill(0, i, i + 4); continue; }
    const unmix = c => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - alpha)) / alpha)));
    data[i] = unmix(r); data[i + 1] = unmix(g); data[i + 2] = unmix(b); data[i + 3] = Math.round(alpha * 255);
  }
  const file = path.join(destination, `animal-${id}.webp`);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(1024, 768, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(file);
  const meta = await sharp(file).metadata();
  const bytes = fs.statSync(file).size;
  if (bytes >= 600000 || meta.width !== 1024 || meta.height !== 768 || !meta.hasAlpha) throw new Error(`Invalid output ${id}`);
  report.push({ id, file: path.relative(process.cwd(), file), width: meta.width, height: meta.height, bytes, alpha: true });
}
fs.writeFileSync(path.join(base, 'packaging-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report);
