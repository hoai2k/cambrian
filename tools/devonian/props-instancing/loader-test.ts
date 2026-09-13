/** Regression checks for source ownership, legacy pivots and transformed multi-mesh imports. */
import assert from 'node:assert/strict';
import {BufferGeometry,Float32BufferAttribute,Uint8BufferAttribute,Mesh,MeshStandardMaterial,Texture,Group} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {loadPropGeometry} from '../../../src/render/props';
const triangle=()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.setAttribute('color',new Uint8BufferAttribute([255,128,0,255,128,0,255,128,0],3,true));return g;};
let source:Group,url='';
const original=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(path){url=path;assert(this.meshoptDecoder,'Meshopt decoder is installed');return {scene:source,scenes:[source],animations:[],cameras:[],asset:{},parser:{},userData:{}} as never;};
let geometryDisposals=0,materialDisposals=0,textureDisposals=0;
const fixture=()=>{source=new Group();const g=triangle(),m=new MeshStandardMaterial(),t=new Texture();m.map=t;g.addEventListener('dispose',()=>geometryDisposals++);m.addEventListener('dispose',()=>materialDisposals++);t.addEventListener('dispose',()=>textureDisposals++);const mesh=new Mesh(g,m);source.add(mesh);return mesh;};
try{
 const legacy=fixture();legacy.position.set(9,3,2);const saved=Array.from(legacy.geometry.getAttribute('position').array);const g=await loadPropGeometry('glass-fan','/prefix/');assert.equal(url,'/prefix/assets/props/glass-fan.glb');assert.deepEqual(Array.from(g.getAttribute('position').array),saved,'Legacy coordinates must ignore source transforms as before');assert.notEqual(g,legacy.geometry);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);assert.equal(textureDisposals,1);g.dispose();
 const one=fixture();one.position.set(2,0,0);const two=new Mesh(triangle(),one.material);two.position.set(0,3,0);two.scale.setScalar(2);source.add(two);const merged=await loadPropGeometry('new','/prefix/',{props:{new:{path:'special.glb',material:'rock'}},flora:{}});assert.equal(url,'/prefix/special.glb');assert.deepEqual(merged.boundingBox!.min.toArray(),[0,0,0]);assert.deepEqual(merged.boundingBox!.max.toArray(),[3,5,0]);assert.equal(merged.index!.count,6);assert.equal(merged.getAttribute('color').itemSize,3);assert(Math.abs(merged.getAttribute('color').getY(0)-128/255)<1e-7);assert.equal(merged.getAttribute('normal').count,6);assert.equal(materialDisposals,2,'Shared material disposed only once per source');assert.equal(textureDisposals,2);merged.dispose();
 const broken=fixture();broken.geometry.deleteAttribute('color');await assert.rejects(loadPropGeometry('broken','/',{props:{broken:{path:'bad.glb',material:'rock'}},flora:{}}),/Missing vertex pigment/);assert.equal(materialDisposals,3);assert.equal(textureDisposals,3);assert.equal(geometryDisposals,3);
 console.log('PASS: legacy paths and numeric pivots, detached geometry ownership, normalized multi-mesh transforms/colours/normals, Meshopt decoder wiring, shared resources disposed once, failure cleanup');
}finally{GLTFLoader.prototype.loadAsync=original;}
