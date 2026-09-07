/** Scheme safety regression tests and immutable default/variant delivery checks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { PNG } from 'pngjs';
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
 if(manifest[id])assert.equal(sha(`public/assets/creatures/${id}.glb`),manifest[id].sourceGlbSha256,`${id}: render source changed`);
}
console.log(`21 preserved default sets; ${variants} scheme images; mismatch, changed-colour, missing-record, unknown-scheme and render-integrity checks passed.`);
