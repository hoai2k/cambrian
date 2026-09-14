// Run from the repository root: node tools/art/ancientseas/titles/package.mjs
// Deterministic delivery conversion. White extraction follows tools/brand-intake.mjs.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const base = 'tools/art/ancientseas/titles';
const output = 'public/assets/ancientseas';
const records = JSON.parse(await fs.readFile(path.join(base, 'sources.json'), 'utf8'));
const clamp01 = v => Math.max(0, Math.min(1, v));
async function knockOutWhite(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
    const sat = mx ? (mx-mn)/mx : 0;
    const bright = clamp01((mx-205)/(248-205));
    const colourless = clamp01((0.16-sat)/(0.16-0.04));
    const alpha = clamp01(1-bright*colourless);
    if (alpha <= 0.002) continue;
    const unmix = c => Math.max(0,Math.min(255,Math.round((c-255*(1-alpha))/alpha)));
    out[o]=unmix(r);out[o+1]=unmix(g);out[o+2]=unmix(b);out[o+3]=Math.round(alpha*255);
  }
  return sharp(out,{raw:{width:info.width,height:info.height,channels:4}});
}
await fs.mkdir(output,{recursive:true});
const reports = [];
for (const r of records) {
  const source = path.join(base,'sources',r.source);
  const [width,height] = r.size;
  let im;
  if (r.file === 'ground-parchment.webp') {
    im = sharp(source).resize(width,height,{fit:'fill'});
  } else {
    const sourceImage = r.keyWhite ? await knockOutWhite(source) : sharp(source);
    const trimmed = await sourceImage.trim({threshold:1}).png().toBuffer();
    const padding = r.file === 'ground-seabed.webp' ? 0 : Math.round(width*0.015);
    const content = await sharp(trimmed).resize(width-padding*2,height-padding*2,{
      fit:'contain',background:{r:0,g:0,b:0,alpha:0},
    }).png().toBuffer();
    im=sharp(content).extend({top:padding,bottom:padding,left:padding,right:padding,background:{r:0,g:0,b:0,alpha:0}});
  }
  const raw = await im.png().toBuffer();
  let quality=92, encoded;
  do { encoded=await sharp(raw).webp({quality,alphaQuality:100,effort:6}).toBuffer();quality-=5; }
  while(encoded.length>=600000 && quality>=62);
  if (encoded.length>=600000) throw new Error(r.file+' exceeds 600 KB');
  await fs.writeFile(path.join(output,r.file),encoded);
  const meta=await sharp(encoded).metadata();
  if(meta.width!==width || meta.height!==height) throw new Error('Wrong dimensions: '+r.file);
  reports.push({file:r.file,width,height,bytes:encoded.length,alpha:meta.hasAlpha,whiteKeyed:!!r.keyWhite});
}
await fs.writeFile(path.join(base,'verification.json'),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
