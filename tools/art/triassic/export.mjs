/** Export delivered masters; never redraw a procedural stand-in over approved artwork. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.join(root, 'public/assets/triassic/brand');
const source = name => path.join(here, 'sources', name);
const assets = [];
async function record(name, data) {
  await fs.writeFile(path.join(out, name), data);
  const meta = await sharp(data).metadata().catch(() => ({}));
  assets.push({path: `assets/triassic/brand/${name}`, width: meta.width, height: meta.height,
    bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')});
}
for (const name of ['title', 'title-mobile']) {
  const input = source(`${name}.png`);
  await record(`${name}.webp`, await sharp(input).webp({quality:88, effort:6}).toBuffer());
  // Compatibility wrappers embed the final composition; they do not draw a second wordmark.
  const meta = await sharp(input).metadata();
  const data = await fs.readFile(path.join(out, `${name}.webp`));
  await record(`${name}.svg`, Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${meta.width} ${meta.height}" role="img" aria-label="Triassic Triumph"><image width="${meta.width}" height="${meta.height}" href="data:image/webp;base64,${data.toString('base64')}"/></svg>\n`));
}
const emblem = source('emblem.png');
const logo = source('logo-engraved.png');
const logoMeta = await sharp(logo).metadata();
const logoStats = await sharp(logo).stats();
if (!logoMeta.hasAlpha || logoStats.channels[3].min !== 0 || logoStats.channels[3].max !== 255)
  throw new Error('Wordmark master must have real transparency');
await record('logo-engraved.webp', await sharp(logo).resize({width:1536}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer());
for (const name of ['logo-triassic','logo-triassic-compact','logo']) {
  const width = name.endsWith('compact') ? 720 : 1536;
  const data = await sharp(logo).resize({width}).png().toBuffer();
  await record(`${name}.png`,data);
  const m = await sharp(data).metadata();
  await record(`${name}.svg`,Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width} ${m.height}" role="img" aria-label="Triassic Triumph"><image width="${m.width}" height="${m.height}" href="data:image/png;base64,${data.toString('base64')}"/></svg>\n`));
}
const meta = await sharp(emblem).metadata();
const stats = await sharp(emblem).stats();
if (!meta.hasAlpha || stats.channels[3].min !== 0 || stats.channels[3].max !== 255)
  throw new Error('Emblem master must have real transparency');
await record('emblem.webp', await sharp(emblem).resize(512,512).webp({quality:90, alphaQuality:100, effort:6}).toBuffer());
for (const size of [16,32,192,512])
  await record(`favicon-${size}.png`, await sharp(emblem).resize(size,size).png().toBuffer());
await record('apple-touch-icon.png', await sharp(emblem).resize(180,180).png().toBuffer());
const icoSizes = [16,32,48];
const pngs = await Promise.all(icoSizes.map(s => sharp(emblem).resize(s,s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(1,2); header.writeUInt16LE(pngs.length,4);
let offset = header.length;
pngs.forEach((png,i) => {
  const at = 6 + 16*i;
  header[at] = header[at+1] = icoSizes[i];
  header.writeUInt16LE(1,at+4); header.writeUInt16LE(32,at+6);
  header.writeUInt32LE(png.length,at+8); header.writeUInt32LE(offset,at+12);
  offset += png.length;
});
await record('favicon.ico', Buffer.concat([header,...pngs]));
await fs.writeFile(path.join(out,'manifest.json'), JSON.stringify({era:'triassic', title:'Triassic Triumph',
  status:'ready; Devonian-style engraved title, wordmark and full-body four-flipper plesiosaur emblem',
  provenance:'docs/triassic-brand-assets.md', assets,
  pending:[],
  svgNote:'Compatibility wrappers embed the illustrated raster master; they are not vector redraws.',
  supplementary:['keyart.png','keyart.webp','keyart-mobile.png','keyart-mobile.webp']},null,2)+'\n');
console.log(assets.map(a => `${a.path}: ${a.bytes} bytes`).join('\n'));
