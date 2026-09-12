/** Sample the actual authored vertex colours for camouflage of default-painted creatures and props. */
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import { loadContent } from './load-content.mjs';
const { slotFor } = await loadContent();
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
const result={creatures:{},props:{}};
for(const [kind,folder] of [['creatures','creatures'],['props','props']])for(const f of fs.readdirSync(`public/assets/${folder}`).filter(f=>f.endsWith('.glb')&&!f.includes('.lod'))){
 const b=fs.readFileSync(`public/assets/${folder}/${f}`);const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const sums={};
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const m=Array.isArray(o.material)?o.material[0]:o.material;const slot=kind==='props'?'body':slotFor(m.name);const a=o.geometry.getAttribute('color');if(!a)return;const row=sums[slot]??=[0,0,0,0];for(let i=0;i<a.count;i++){row[0]+=a.getX(i)*m.color.r;row[1]+=a.getY(i)*m.color.g;row[2]+=a.getZ(i)*m.color.b;row[3]++;}});
 const colors=Object.fromEntries(Object.entries(sums).map(([slot,v])=>[slot,'#'+new THREE.Color(v[0]/v[3],v[1]/v[3],v[2]/v[3]).getHexString()]));
 result[kind][f.slice(0,-4)]=kind==='props'?colors.body:Object.fromEntries(['body','eyes','fins','legs','accent','underside'].map(slot=>[slot,colors[slot]??(slot==='eyes'?'#080c0a':colors.body)]));
}
fs.writeFileSync('src/shared/authored-colors.json',JSON.stringify(result,null,2)+'\n');
