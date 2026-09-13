import sharp from 'sharp';
import fs from 'node:fs/promises';
const r='local/triassic-authoring/shonisaurus/review',o='public/assets/triassic/creatures',h='tools/triassic/creatures/shonisaurus';
await fs.copyFile(`${r}/portrait.png`,`${o}/shonisaurus.select.png`);
await fs.copyFile(`${r}/studio.png`,`${o}/shonisaurus.png`);
await fs.copyFile(`${r}/puppet-portrait.png`,`${o}/shonisaurus.puppet.png`);
await sharp(`${r}/portrait.png`).resize(1000,750).png().toFile(`${o}/shonisaurus.card.png`);
await sharp(`${r}/portrait.png`).resize(256,192).png().toFile(`${o}/shonisaurus.thumb.png`);
const label=(txt,w=700,h=36)=>Buffer.from(`<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#15232c"/><text x="14" y="25" font-family="sans-serif" font-size="20" fill="#eff6f8">${txt}</text></svg>`);
const rows=[];let y=0;
for(const clip of ['Swim','Sprint','Heavy','Dodge','Death'])for(const kind of ['full','puppet']){
 rows.push({input:label(`${clip} · ${kind}`,2100,36),left:0,top:y});y+=36;
 for(const [i,t]of[.25,.5,.75].entries())rows.push({input:`${r}/${kind}-${clip}-${t}.png`,left:i*700,top:y});y+=450;
}
const sheet=await sharp({create:{width:2100,height:y,channels:3,background:'#15232c'}}).composite(rows).png().toBuffer();await sharp(sheet).resize(1400).jpeg({quality:85}).toFile(`${h}/action-review.jpg`);
const compare=[];
for(const [j,view]of['side','top','hero'].entries())for(const [i,kind]of['full','puppet'].entries()){
 compare.push({input:label(`${kind} · ${view}`,900,36),left:i*900,top:j*636});const input=view==='top'?await sharp(`${r}/${kind}-export-Idle-0.png`).resize(900,600).png().toBuffer():`${r}/${kind}-${view}.png`;compare.push({input,left:i*900,top:j*636+36});
}
await sharp({create:{width:1800,height:1908,channels:3,background:'#15232c'}}).composite(compare).jpeg({quality:88}).toFile(`${h}/volume-review.jpg`);
console.log('Shonisaurus portraits and paired review sheets written');

const erows=[];let ey=0;for(const clip of ['Swim','Sprint','TurnLeft','Dodge','Heavy'])for(const kind of ['full','puppet']){erows.push({input:label(`${clip} · delivered ${kind} · top view`,2100,36),left:0,top:ey});ey+=36;for(const [i,t]of[.25,.5,.75].entries())erows.push({input:`${r}/${kind}-export-${clip}-${t}.png`,left:i*700,top:ey});ey+=450;}const exported=await sharp({create:{width:2100,height:ey,channels:3,background:'#15232c'}}).composite(erows).png().toBuffer();await sharp(exported).resize(1400).jpeg({quality:85}).toFile(`${h}/exported-motion-review.jpg`);
