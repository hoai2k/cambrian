/** Bake the viewer's linear-space recolour into temporary GLBs; shipped models stay untouched. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { NodeIO, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Color } from 'three';
await build({stdin:{contents:"export * from './src/shared/palettes'; export * from './src/shared/creature-schemes'; export * from './src/shared/portrait-match';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'/tmp/cambrian-palette-data.mjs'});
const {creatureScheme,slotFor,PORTRAIT_RECOLOR_VERSION,CREATURE_SCHEMES,paletteSignature}=await import('/tmp/cambrian-palette-data.mjs?'+Date.now());
const source=JSON.parse(fs.readFileSync(process.env.CAMBRIAN_SCHEME_MAPPING || 'docs/art/colour-schemes-2026-09-06.json','utf8')).creatures;
const dir='/tmp/cambrian-palette-models';fs.mkdirSync(dir,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
await MeshoptDecoder.ready;
const manifest={};
for(const id of Object.keys(CREATURE_SCHEMES)) {
 const selected=creatureScheme(id);
 if(paletteSignature(selected)!==paletteSignature({id:source[id].scheme,colors:source[id].colors}))throw Error(`${id}: current palette differs from supplied mapping`);
 if(!selected.colors)continue;
 const path=`public/assets/creatures/${id}.glb`;const doc=await io.read(path);
 for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()) {
  const attr=primitive.getAttribute('COLOR_0');if(!attr)continue;
  const mat=primitive.getMaterial();const factor=mat.getBaseColorFactor();
  const tint=new Color(selected.colors[slotFor(mat.getName())]);
  const count=attr.getCount(),size=attr.getElementSize(),value=[];let sum=0;
  for(let i=0;i<count;i++){attr.getElement(i,value);sum+=.2126*value[0]+.7152*value[1]+.0722*value[2];}
  const mean=Math.max(sum/Math.max(1,count),1e-4);const array=new Float32Array(count*size);
  for(let i=0;i<count;i++){
   attr.getElement(i,value);
   const gain=Math.min((.2126*value[0]*factor[0]+.7152*value[1]*factor[1]+.0722*value[2]*factor[2])/mean,4);
   array[i*size]=tint.r*gain;array[i*size+1]=tint.g*gain;array[i*size+2]=tint.b*gain;
   if(size===4)array[i*size+3]=value[3];
  }
  const colors=doc.createAccessor().setType(size===4?Accessor.Type.VEC4:Accessor.Type.VEC3).setArray(array).setBuffer(attr.getBuffer());
  primitive.setAttribute('COLOR_0',colors);
  // RGB base factors were included above; preserve material alpha.
 }
 for(const mat of doc.getRoot().listMaterials()){const f=mat.getBaseColorFactor();mat.setBaseColorFactor([1,1,1,f[3]]);}
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 await io.write(`${dir}/${id}.glb`,doc);
 const revision=crypto.createHash('sha256').update(paletteSignature(selected)+':'+PORTRAIT_RECOLOR_VERSION).digest('hex').slice(0,12);
 manifest[id]={scheme:selected.id,colors:selected.colors,recolorVersion:PORTRAIT_RECOLOR_VERSION,sourceGlbSha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),files:Object.fromEntries(['select','card','thumb'].map(kind=>[kind,`assets/creatures/schemes/${id}.${selected.id}.${revision}.${kind}.png`]))};
 console.log(id,selected.id);
}
fs.writeFileSync(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
