/** Compare Python sampler results with the installed actual Three GLTFLoader. */
import fs from 'node:fs';import path from 'node:path';import {createHash}from'node:crypto';
import {GLTFLoader}from'three/examples/jsm/loaders/GLTFLoader.js';
const out=path.resolve('../devonian-authoring/gemuendina/rework-v3/interpolation-check-03');
const cases=JSON.parse(fs.readFileSync(path.join(out,'fixtures.json'),'utf8'));
if(fs.existsSync(path.join(out,'three-comparison.json')))throw Error('Preserve previous comparison');
const chunks=[],views=[],accessors=[],channels=[],samplers=[],nodes=[];let offset=0;
function accessor(rows,k){const flat=rows.flat(),buf=Buffer.alloc(flat.length*4);flat.forEach((v,i)=>buf.writeFloatLE(v,i*4));const index=accessors.length;views.push({buffer:0,byteOffset:offset,byteLength:buf.length});offset+=buf.length;chunks.push(buf);accessors.push({bufferView:views.length-1,componentType:5126,count:flat.length/k,type:k===1?'SCALAR':k===3?'VEC3':'VEC4',...(k===1?{min:[Math.min(...flat)],max:[Math.max(...flat)]}:{})});return index;}
for(const [i,c]of cases.entries()){nodes.push({name:'case_'+i});samplers.push({input:accessor(c.times,1),output:accessor(c.values,c.path==='rotation'?4:3),interpolation:c.mode});channels.push({sampler:i,target:{node:i,path:c.path}});}
const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,buffers:[{byteLength:offset}],bufferViews:views,accessors,animations:[{name:'fixture-curves',channels,samplers}]};
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,json,bh,bin]);
const loaded=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
let maximum=0,queries=0;const failures=[];
for(const track of loaded.animations[0].tracks){const i=Number(track.name.split('.')[0].slice(5)),c=cases[i],interpolant=track.createInterpolant();
 for(const [j,t]of c.queries.entries()){const actual=Array.from(interpolant.evaluate(t)),expected=c.expected[j];let error=Math.max(...actual.map((v,k)=>Math.abs(v-expected[k])));if(c.path==='rotation')error=Math.min(error,Math.max(...actual.map((v,k)=>Math.abs(v+expected[k]))));maximum=Math.max(maximum,error);queries++;if(error>4e-6)failures.push({origin:c.origin,t,error,actual,expected});}}
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report={cases:cases.length,queries,maximum_component_error:maximum,tolerance:4e-6,failures,pass:failures.length===0,three_loader_sha256:hash('node_modules/three/examples/jsm/loaders/GLTFLoader.js'),fixture_sha256:hash(path.join(out,'fixtures.json')),comparison_source_sha256:hash(import.meta.filename)};
fs.writeFileSync(path.join(out,'three-comparison.json'),JSON.stringify(report,null,2)+'\n');if(failures.length)throw Error(JSON.stringify(failures.slice(0,3)));console.log('GEMUENDINA_INTERPOLATION_THREE_PASS',queries,maximum);
