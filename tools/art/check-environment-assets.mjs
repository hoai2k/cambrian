/** Validate the actual GLBs, independently of the authoring generator. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
const root=new URL('../../',import.meta.url),io=new NodeIO();
const manifest=JSON.parse(await fs.readFile(new URL('public/assets/props/manifest.json',root)));
assert.equal(manifest.props.length,7);
for(const p of manifest.props){
 const path=new URL('public/'+p.file,root),doc=await io.read(path.pathname),r=doc.getRoot();
 assert.equal(r.listMeshes().length,1,p.id); assert.equal(r.listNodes().length,1,p.id);
 assert.equal(r.listSkins().length,0); assert.equal(r.listAnimations().length,0); assert.equal(r.listTextures().length,0);
 const node=r.listNodes()[0];assert.deepEqual(node.getTranslation(),[0,0,0]);assert.deepEqual(node.getScale(),[1,1,1]);assert.equal(node.listChildren().length,0);
 const prims=r.listMeshes()[0].listPrimitives(); assert.equal(prims.length,1);
 const prim=prims[0];assert.equal(prim.getMode(),4);assert.equal(prim.getMaterial().getAlphaMode(),'OPAQUE');
 const pos=prim.getAttribute('POSITION'),norm=prim.getAttribute('NORMAL'),col=prim.getAttribute('COLOR_0');
 assert.ok(pos&&norm&&col);assert.equal(col.getCount(),pos.getCount());assert.equal(norm.getCount(),pos.getCount());
 const tris=(prim.getIndices()?.getCount()??pos.getCount())/3;assert.equal(tris,p.triangles);assert.ok(tris<=p.triangleLimit,p.id);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=[];
 for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);for(let a=0;a<3;a++){assert.ok(Number.isFinite(v[a]));min[a]=Math.min(min[a],v[a]);max[a]=Math.max(max[a],v[a]);} norm.getElement(i,v);assert.ok(Math.abs(Math.hypot(...v)-1)<.002,p.id+' normal');}
 assert.ok(Math.abs(min[1])<1e-6,p.id+' base');
 assert.ok(Math.abs(min[0]+max[0])<1e-6,p.id+' centred X');assert.ok(Math.abs(min[2]+max[2])<1e-6,p.id+' centred Z');
 assert.ok(Math.abs(max[0]-min[0]-p.width)<1e-5);assert.ok(Math.abs(max[1]-p.height)<1e-5);
 const bytes=(await fs.stat(path)).size;assert.equal(bytes,p.bytes);assert.ok(bytes<600000);
 console.log(`${p.id}: ${tris} tris, ${bytes} bytes, no rigging`);
}
for(const id of ['player','threat','giant','home','shore']){
 const svg=await fs.readFile(new URL(`public/assets/ui/radar-${id}.svg`,root),'utf8');
 assert.match(svg,/viewBox="0 0 24 24"/);assert.match(svg,/currentColor/);assert.doesNotMatch(svg,/<text|<image|#[a-f\d]{3}/i);
}
console.log('All environment model and glyph contracts pass.');
