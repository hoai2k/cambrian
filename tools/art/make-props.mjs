/** Deterministic, editable sources for the seven static Cambrian biome props. */
import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { mkdir, writeFile, stat } from 'node:fs/promises';
const out = new URL('../../public/assets/props/', import.meta.url);
await mkdir(out,{recursive:true});
const V=(x,y,z)=>new T.Vector3(x,y,z), TAU=Math.PI*2;
function paint(g,hex,shade=()=>1) {
 g.deleteAttribute('uv'); const p=g.attributes.position, colors=[]; const base=new T.Color(hex);
 for(let i=0;i<p.count;i++){const c=base.clone().multiplyScalar(shade(p.getX(i),p.getY(i),p.getZ(i)));colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3)); return g.index?g.toNonIndexed():g;
}
function rod(a,b,r,hex,sides=4,taper=.7){
 const g=new T.CylinderGeometry(r*taper,r,a.distanceTo(b),sides,1,false);
 g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize()));
 g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());return paint(g,hex);
}
const records=[];
async function save(id,parts,width,height,limit,biomes,movement){
 const g=mergeGeometries(parts,false); g.computeBoundingBox(); const b=g.boundingBox;
 const sx=width/(b.max.x-b.min.x), sy=height/(b.max.y-b.min.y);
 g.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);g.scale(sx,sy,sx);g.computeBoundingBox();
 const tris=g.attributes.position.count/3;if(tris>limit)throw Error(`${id}: ${tris} > ${limit}`);
 const doc=new Document(),buf=doc.createBuffer(); const primitive=doc.createPrimitive();
 for(const [name,semantic] of [['position','POSITION'],['normal','NORMAL'],['color','COLOR_0']]){
  primitive.setAttribute(semantic,doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes[name].array)).setBuffer(buf));
 }
 primitive.setMaterial(doc.createMaterial(id).setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.88).setMetallicFactor(0).setDoubleSided(id==='lettuce-tuft'));
 const node=doc.createNode(id).setMesh(doc.createMesh(id).addPrimitive(primitive));
 doc.createScene(id).addChild(node); await new NodeIO().write(new URL(id+'.glb',out).pathname,doc);
 const rec={id,file:`assets/props/${id}.glb`,triangles:tris,triangleLimit:limit,width,height,depth:+(g.boundingBox.max.z-g.boundingBox.min.z).toFixed(4),bytes:(await stat(new URL(id+'.glb',out))).size,biomes,rigging:false,movement};
 records.push(rec);console.log(rec);
}
// Rounded fused bulbs with inset, genuinely open oscula and dark inner walls.
{
 const parts=[];
 const bulbs=[[-.22,0,0,.23,.43],[.19,0,.03,.25,.47],[0,.02,-.19,.24,.6],[.04,0,.23,.22,.38]];
 for(const [x,y,z,r,h] of bulbs){
  const profile=[[.5,0],[.92,.19],[1,.48],[.84,.77],[.43,.92],[.28,.91],[.25,.64]].map(([a,b])=>new T.Vector2(a*r,b*h));
  const g=new T.LatheGeometry(profile,10);g.translate(x,y,z);
  const colored=paint(g,'#e5b48a',(px,py,pz)=>.83+.17*py/.6);
  // Last three profile rings are the lip and shaded throat.
  const colors=colored.attributes.color, positions=colored.attributes.position;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>y+h*.60&&Math.hypot(positions.getX(i)-x,positions.getZ(i)-z)<r*.3){colors.setXYZ(i,.22,.13,.07);}
  parts.push(colored);
 }
 await save('cushion-sponge',parts,.9,.6,500,['shallows','nursery'],'Small shader bend only; no bones or clips.');
}
// Seven rounded, curled frond surfaces. Opaque two-sided sheets spend the budget
// on the leaf contour and curvature; there are no alpha textures or bones.
{
 const parts=[];
 for(let k=0;k<7;k++){
  const a=k/7*TAU,g=new T.BufferGeometry(),verts=[],idx=[];
  for(let j=0;j<7;j++)for(let i=0;i<5;i++){
   const t=j/6,u=(i-2)/2,w=[.003,.035,.072,.095,.095,.073,.028][j],lateral=u*w;
   const r=.012+t*.26+(j===6?.04*(1-u*u):0);
   const y=Math.sin(t*Math.PI*.88)*(.36+(k%3)*.018)+u*u*.016*Math.sin(Math.PI*t);
   verts.push(Math.cos(a)*r-Math.sin(a)*lateral,y,Math.sin(a)*r+Math.cos(a)*lateral);
  }
  for(let j=0;j<6;j++)for(let i=0;i<4;i++){const n=j*5+i;idx.push(n,n+1,n+5,n+1,n+6,n+5);}
  g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
  parts.push(paint(g,k%2?'#9eaf64':'#b7ba72',(x,y)=>.7+.3*y/.45));
 }
 await save('lettuce-tuft',parts,.5,.45,400,['shallows'],'Soft shader sway and contact bend from the base; opaque green-gold two-sided fronds.');
}

{
 const parts=[];
 for(let k=0;k<7;k++){
  const a=k*2.39996,r=k===0?0:.12+(.015*k),size=.075+(k%3)*.011;
  const g=new T.SphereGeometry(1,7,4);g.scale(size,.04+(k%3)*.012,size*.76);g.rotateY(a);g.translate(Math.cos(a)*r,.035,Math.sin(a)*r);
  parts.push(paint(g,['#c4c5be','#d1b7b0','#afb8b8'][k%3]));
 }
 await save('pebble-cluster',parts,.6,.15,300,['shallows','nursery'],'Static.');
}
{
 const pts=[];
 for(const [y,rx,rz,lean] of [[0,.43,.3,0],[.5,.55,.24,-.07],[2.5,.37,.13,.1],[3.65,.14,.065,.22]])for(let i=0;i<5;i++){const a=i*TAU/5;pts.push(V(Math.cos(a)*rx+lean,y+(i%2)*.09,Math.sin(a)*rz));}
 pts.push(V(.29,4,0));const g=new ConvexGeometry(pts);
 await save('blade-spire',[paint(g,'#344955',(x,y,z)=>.78+.3*y/4+.24*(z>0?1:0))],1.2,4,600,['channel','escarpment','basin'],'Static.');
}
{
 const g=new ConvexGeometry([V(-.7,0,-.35),V(.65,0,-.4),V(.7,0,.4),V(-.6,0,.4),V(-.5,.44,-.3),V(.42,.8,-.28),V(.58,.31,.25),V(-.5,.36,.35)]);
 await save('talus-shard',[paint(g,'#465968',(x,y,z)=>.78+y*.25+(z>0?.2:0))],1.5,.8,300,['escarpment','basin'],'Static.');
}
{
 const parts=[rod(V(0,0,0),V(.04,2.6,0),.082,'#82908d',7,.22)];
 for(let ring=0;ring<8;ring++)for(let k=0;k<7;k++){
  const a=k/7*TAU+ring*.37,y=.25+ring*.27,r=.36*(1-ring*.055);
  parts.push(rod(V(.04*y/2.6,y,0),V(Math.cos(a)*r+.04*y/2.6,y+.32,Math.sin(a)*r),.027,ring<2?'#859594':'#d5d8c9',4,0));
 }
 await save('spine-sponge',parts,.8,2.6,800,['escarpment','basin'],'Stiff shader contact bend only; no bones or clips.');
}
{
 const parts=[rod(V(0,0,0),V(0,.36,0),.038,'#839d9f',4,.65)];
 const rows=[];
 for(let j=0;j<7;j++){
  const n=j<4?j+2:7, w=[.13,.28,.43,.58,.71,.8,.75][j],y=.3+j*.17;
  const row=[];for(let i=0;i<n;i++)row.push(V((i/(n-1)*2-1)*w,y+((j===6&&i%2===0)?.08:0),Math.sin(i*.8)*.016));rows.push(row);
 }
 for(let j=0;j<rows.length;j++){
  const row=rows[j];for(let i=0;i<row.length-1;i++)parts.push(rod(row[i],row[i+1],.009,'#b3d2d7',3,1));
  if(j)for(let i=0;i<row.length;i++){
   const prev=rows[j-1],t=i/(row.length-1)*(prev.length-1);
   for(const k of new Set([Math.floor(t),Math.ceil(t)]))parts.push(rod(prev[k],row[i],.009,'#c5dfe3',3,.8));
  }
 }
 for(const side of [-1,1])parts.push(rod(V(0,.25,0),V(side*.75,1.4,0),.018,'#a3c1c9',4,.3));
 await save('glass-fan',parts,1.6,1.4,900,['basin'],'Gentle shader sway/contact bend at the stalk; lattice is solid geometry, no alpha.');
}
await writeFile(new URL('manifest.json',out),JSON.stringify({version:1,units:'metres / world units',up:'+Y',pivot:'base centre',meshContract:'One mesh, one opaque vertex-colour material, one primitive, no textures, skins or animations.',props:records},null,2)+'\n');
