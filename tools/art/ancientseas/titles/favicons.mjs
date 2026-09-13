// Derive the requested favicon family from the imagegen-isolated central scallop.
import sharp from 'sharp';
import fs from 'node:fs/promises';
const base='tools/art/ancientseas/titles';
const shell=await sharp(base+'/sources/favicon-shell.png').trim({threshold:1})
  .resize(420,420,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
// Rounded-square backing only; all illustrated pixels are from the generated shell.
const background=Buffer.from('<svg width="512" height="512"><rect width="512" height="512" rx="94" fill="#070402"/></svg>');
const master=await sharp(background).composite([{input:shell,left:46,top:46}]).png().toBuffer();
await fs.writeFile(base+'/favicon-master.png',master);
for(const [file,size] of [['favicon-16.png',16],['favicon-32.png',32],['favicon-192.png',192],['apple-touch-icon.png',180]]) {
  await sharp(master).resize(size,size).png().toFile('public/assets/ancientseas/'+file);
}
