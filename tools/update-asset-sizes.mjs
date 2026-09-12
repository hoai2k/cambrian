import fs from 'node:fs';
const dir='public/assets/creatures';
const sizes=Object.fromEntries(fs.readdirSync(dir).filter(f=>f.endsWith('.glb')&&!f.includes('.lod')).sort().map(f=>[f.slice(0,-4),fs.statSync(`${dir}/${f}`).size]));
fs.writeFileSync('src/render/asset-sizes.json',JSON.stringify(sizes,null,2)+'\n');
console.log('Recorded final GLB sizes for',Object.keys(sizes).length,'creatures');

// The Devonian pack records only its delivered specimens (tools/devonian/shipped.json).
const shipped=JSON.parse(fs.readFileSync('tools/devonian/shipped.json','utf8')).creatures;
const devSizes=Object.fromEntries(shipped.map(id=>[id,fs.statSync(`public/assets/devonian/creatures/${id}.glb`).size]));
fs.writeFileSync('src/content/devonian/asset-sizes.json',JSON.stringify(devSizes,null,2)+'\n');
console.log('Recorded Devonian GLB sizes for',shipped.length,'shipped specimens');

// Keep the shared anchor registry complete without rewriting the original eight records.
const anchorPath='docs/creature-anchors-manifest.json';
const sourceFiles=['soft','arthropods','jellies'].map(group=>`tools/creatures/${group}/anchors.json`);
const sources=sourceFiles.flatMap(file=>Object.entries(JSON.parse(fs.readFileSync(file,'utf8'))).map(([id])=>({id,file})));
const expansionIds=new Set(sources.map(s=>s.id));
const registry=JSON.parse(fs.readFileSync(anchorPath,'utf8')).filter(r=>!expansionIds.has(r.file.split('.')[0]));
const {createHash}=await import('node:crypto');
for(const {id,file:source} of sources)for(const suffix of ['', '.lod1']){
  const file=`${id}${suffix}.glb`,buf=fs.readFileSync(`${dir}/${file}`);
  const json=JSON.parse(buf.subarray(20,20+buf.readUInt32LE(12)).toString('utf8'));
  const anchors=json.nodes.filter(n=>n.extras?.cambrianAnchor).map(n=>{const {parentBone,...info}=n.extras.cambrianAnchor;return {name:n.name,bone:parentBone,...info};});
  if(anchors.length<3)throw Error(`${file}: run add-anchors before finalizing manifests`);
  registry.push({file,source,newSpecimen:true,updatedSHA256:createHash('sha256').update(buf).digest('hex'),bytes:buf.length,changedClips:[],anchors});
}
fs.writeFileSync(anchorPath,JSON.stringify(registry,null,2)+'\n');
console.log('Recorded anchors for',registry.length,'full/LOD specimens');
