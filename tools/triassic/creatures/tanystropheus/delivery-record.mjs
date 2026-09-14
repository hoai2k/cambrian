/** Record every delivered file for this species with its size, hash and pixel dimensions. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const DIR='public/assets/triassic/creatures';
const files=fs.readdirSync(DIR).filter(f=>f.startsWith('tanystropheus.')&&!f.includes('.preview.')).sort();
const out={};
for(const f of files){
 const bytes=fs.readFileSync(`${DIR}/${f}`);
 const row={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 if(f.endsWith('.png')&&bytes.readUInt32BE(0)===0x89504e47)row.dimensions=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 out[f]=row;
}
fs.writeFileSync('tools/triassic/creatures/tanystropheus/delivery-files.json',JSON.stringify(out,null,2)+'\n');
console.log(Object.keys(out).length+' delivered files recorded');
