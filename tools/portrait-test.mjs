/** Scheme safety regression tests and immutable default/variant delivery checks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { PNG } from 'pngjs';
import { fingerprint } from './creature-fingerprint.mjs';
await build({stdin:{contents:"export * from './src/shared/palettes'; export * from './src/shared/portrait-match'; export * from './src/shared/creature-images';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'/tmp/cambrian-portrait-test.mjs'});
const {scheme,schemeForCreature,creaturePortrait,resolvePortrait,portraitMatches,paletteSignature,CREATURE_SCHEMES}=await import('/tmp/cambrian-portrait-test.mjs?'+Date.now());
const manifest=JSON.parse(fs.readFileSync('public/assets/creatures/schemes/manifest.json'));
const defaults=JSON.parse(fs.readFileSync('public/assets/creatures/defaults/manifest.json'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const record=manifest.anomalocaris,coral={...scheme('coral-flare'),id:record.scheme,colors:record.colors};
assert(portraitMatches(coral,record));
assert(!portraitMatches({...coral,colors:{...coral.colors,body:'#010203'}},record),'same name with edited colours must fall back');
assert(!portraitMatches({...coral,id:'renamed'},record),'changed scheme must fall back');
assert(!portraitMatches(coral,{...record,recolorVersion:0}),'old recolouring formula must fall back');
assert(!portraitMatches(coral,undefined));
assert(!portraitMatches(scheme('default'),record));
assert.equal(creaturePortrait('anomalocaris','select','unknown-scheme').src,'assets/creatures/defaults/anomalocaris.select.png');
assert.equal(creaturePortrait('anomalocaris','select','kelp-olive').src,'assets/creatures/defaults/anomalocaris.select.png');
assert.equal(resolvePortrait('anomalocaris','thumb',coral,undefined).src,'assets/creatures/defaults/anomalocaris.thumb.png');
assert.equal(paletteSignature(coral),paletteSignature({...coral,colors:Object.fromEntries(Object.entries(coral.colors).reverse().map(([k,v])=>[k,v.toUpperCase()]))}));
// The appearance fingerprint has to survive a GLB being re-saved, or every clip delivery breaks
// the deploy: the re-authoring pass reopens these files and writes them out its own way. Rebuild
// one the three ways a glTF writer legitimately differs — keys in another order, identical
// textures collapsed to one entry with the materials renumbered, sampler defaults spelled out —
// and the hash must not move. This is what caught Opabinia's trunk work, which changed nothing
// anyone could see.
{
 const path='public/assets/creatures/opabinia.glb';
 const buf=fs.readFileSync(path),jsonLen=buf.readUInt32LE(12);
 const j=JSON.parse(buf.subarray(20,20+jsonLen).toString('utf8'));
 const before=fingerprint(path).appearanceSha256;
 // 1. reverse every object's keys  2. give each material its own copy of the texture it uses
 // 3. drop the sampler defaults the writer had spelled out
 const flip=(v)=>Array.isArray(v)?v.map(flip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,flip(x)])):v;
 const j2=flip(JSON.parse(JSON.stringify(j)));
 j2.textures=[];
 const dupe=(node,key='')=>{
  if(Array.isArray(node))return node.map(n=>dupe(n,key));
  if(!node||typeof node!=='object')return node;
  if(/Texture$/.test(key)&&typeof node.index==='number'){const t=j.textures[node.index];j2.textures.push({...t});return {...node,index:j2.textures.length-1};}
  return Object.fromEntries(Object.entries(node).map(([k,v])=>[k,dupe(v,k)]));
 };
 j2.materials=(j2.materials??[]).map(m=>dupe(m));
 j2.samplers=(j2.samplers??[]).map(({wrapS,wrapT,...rest})=>rest);
 const enc=new TextEncoder().encode(JSON.stringify(j2));
 const pad=(4-(enc.length%4))%4;
 const json=Buffer.concat([Buffer.from(enc),Buffer.alloc(pad,0x20)]);
 const rest=buf.subarray(20+jsonLen);
 const out=Buffer.concat([buf.subarray(0,12),Buffer.alloc(8),json,rest]);
 out.writeUInt32LE(json.length,12);out.write('JSON',16);out.writeUInt32LE(out.length,8);
 const tmp='/tmp/cambrian-reserialised.glb';fs.writeFileSync(tmp,out);
 assert.equal(fingerprint(tmp).appearanceSha256,before,'appearance fingerprint moved when the file was merely re-saved');
 assert.notEqual(fingerprint(tmp).glbSha256,fingerprint(path).glbSha256,'the re-serialised file should differ byte for byte, or this proves nothing');
}

let variants=0;
for(const id of Object.keys(defaults)) {
 for(const kind of ['select','card','thumb']) {
  const d=defaults[id][kind];assert.equal(sha('public/'+d.path),d.sha256,`${id} ${kind}: default mutated`);
  assert.equal(sha(`public/assets/creatures/${id}.${kind}.png`),d.sha256,`${id} ${kind}: original alias changed`);
  const resolved=creaturePortrait(id,kind);assert(fs.existsSync('public/'+resolved.src));
  if(manifest[id]){
   const m=manifest[id];assert.equal(resolved.src,portraitMatches(scheme(schemeForCreature(id)),m)?m.files[kind]:d.path);
   const file='public/'+m.files[kind];assert.equal(sha(file),m.sha256[kind]);assert(fs.statSync(file).size<600000);
   const png=PNG.sync.read(fs.readFileSync(file));const size={select:[1600,1200],card:[1200,900],thumb:[256,192]}[kind];
   assert.deepEqual([png.width,png.height],size);
   const alpha=png.data.filter((_,i)=>i%4===3);assert(alpha.includes(0)&&alpha.some(a=>a>=250),`${id} ${kind}: missing transparent background or solid subject`);
   variants++;
  }else assert.equal(resolved.src,d.path);
 }
 // What matters is whether the model still *looks* the way the images were rendered from, not
 // whether the file is byte-identical: animation clips are added over a creature's life and never
 // replaced (see CLAUDE.md), and each delivery changes the GLB without touching a single pixel of
 // the render. Asserting the whole file made every animation batch a deploy failure. The
 // appearance fingerprint is materials, textures and material assignments — the same measure
 // `tools/check-creature-assets.mjs` uses to tell "re-render this" from "clips changed, images
 // still valid". `sourceGlbSha256` stays in the manifest as a record of the exact build the
 // renders came from; it is provenance, not a gate.
 if(manifest[id]){
  const m=manifest[id];
  assert(m.sourceAppearanceSha256,`${id}: manifest has no sourceAppearanceSha256 (run: node tools/art/prepare-palette-renders.mjs)`);
  assert.equal(fingerprint(`public/assets/creatures/${id}.glb`).appearanceSha256,m.sourceAppearanceSha256,`${id}: model appearance changed since its scheme images were rendered`);
 }
}
console.log(`21 preserved default sets; ${variants} scheme images; mismatch, changed-colour, missing-record, unknown-scheme and render-integrity checks passed.`);
