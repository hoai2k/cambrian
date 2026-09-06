import fs from 'node:fs';
const dir='public/assets/creatures';
const sizes=Object.fromEntries(fs.readdirSync(dir).filter(f=>f.endsWith('.glb')&&!f.includes('.lod')).sort().map(f=>[f.slice(0,-4),fs.statSync(`${dir}/${f}`).size]));
fs.writeFileSync('src/render/asset-sizes.json',JSON.stringify(sizes,null,2)+'\n');
console.log('Recorded final GLB sizes for',Object.keys(sizes).length,'creatures');
