// Exact shared intake snapshot, changing only input/output directories for candidate-only ownership.
/** Intake of finished Devonian assets, independent of the active Cambrian game roster. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { PNG } from 'pngjs';
const root = '../devonian-authoring/jaekelopterus/intake-layout';
const roster = JSON.parse(fs.readFileSync('tools/devonian/roster.json', 'utf8'));
const args = process.argv.slice(2), partial = args.includes('--partial');
const chosen = args.filter(s => !s.startsWith('--'));
const released = JSON.parse(fs.readFileSync('tools/devonian/shipped.json')).creatures;
const ids = chosen.length ? chosen : args.includes('--shipped') ? released : partial ? roster.filter(id => fs.existsSync(`${root}/creatures/${id}.json`)) : roster;
for (const id of ids) assert(roster.includes(id), `Unknown Devonian ID ${id}`);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const required = ['Idle','Attack','Hit','Death','TurnLeft','TurnRight','Dive','Rise','Bite','Heavy','Guard','Parry','Dodge','Eat','Stagger','Ability'];
const arthropods = new Set(['eldredgeops','walliserops','jaekelopterus','nahecaris','palaeoisopus']);
const hash = x => createHash('sha256').update(x).digest('hex');
const results = [];
function finite(a, label) { for (const v of a) assert(Number.isFinite(v), label); }
function triangles(doc) {return doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount())/3,0),0);}
function validateClips(doc, names, looping, label) {
  const clips = doc.getRoot().listAnimations(), byName = new Map(clips.map(c=>[c.getName(),c]));
  assert.equal(clips.length, byName.size, `${label}: duplicate clip names`);
  for (const n of names) assert(byName.has(n), `${label}: missing ${n}`);
  const signatures = new Map();
  for (const clip of clips) {
    let duration=0, dynamic=false;
    const signature=[];
    for (const c of clip.listChannels()) {
      const node=c.getTargetNode(), path=c.getTargetPath(), sampler=c.getSampler();
      const times=sampler.getInput().getArray(), output=sampler.getOutput(), values=output.getArray(), size=output.getElementSize();
      finite(times, `${label} ${clip.getName()}: nonfinite time`); finite(values, `${label}: nonfinite pose`);
      assert(times.length>1 && times.at(-1)>0, `${label}: zero-duration channel`);
      for(let i=1;i<times.length;i++) assert(times[i]>times[i-1], `${label}: unordered keys`);
      duration=Math.max(duration,times.at(-1));
      assert.notEqual(path,'scale',`${label} ${clip.getName()}: animated scale`);
      const cubic=sampler.getInterpolation()==='CUBICSPLINE', first=cubic?size:0, last=values.length-(cubic?2*size:size);
      for(let i=first;i<values.length;i++) if(Math.abs(values[i]-values[first+(i-first)%size])>1e-6) dynamic=true;
      if(node.getName()==='root') {
        for(let i=first;i<values.length;i++) assert(Math.abs(values[i]-values[first+(i-first)%size])<1e-6,`${label}: root motion`);
      }
      if(looping.includes(clip.getName())) {
        let direct=0, negated=0;
        for(let k=0;k<size;k++){direct=Math.max(direct,Math.abs(values[first+k]-values[last+k]));negated=Math.max(negated,Math.abs(values[first+k]+values[last+k]));}
        assert(Math.min(direct,path==='rotation'?negated:Infinity)<1e-4,`${label}: loop seam ${clip.getName()} ${node.getName()}`);
      }
      signature.push([node.getName(),path,hash(Buffer.from(values.buffer,values.byteOffset,values.byteLength))]);
    }
    assert(dynamic,`${label}: static action ${clip.getName()}`);
    const sig=hash(JSON.stringify(signature));
    assert(!signatures.has(sig),`${label}: ${clip.getName()} duplicates ${signatures.get(sig)}`);
    signatures.set(sig,clip.getName());
    assert(duration>0,`${label}: empty clip`);
  }
  return [...byName.keys()];
}
function validateSkin(doc,label) {
  const joints=doc.getRoot().listSkins().flatMap(s=>s.listJoints().map(n=>n.getName()));
  assert(joints.length>=3,`${label}: missing articulated skin`);
  for(const mesh of doc.getRoot().listMeshes()) for(const p of mesh.listPrimitives()) {
    const weights=p.getAttribute('WEIGHTS_0'); if(!weights) continue;
    for(let i=0;i<weights.getCount();i++) {const a=weights.getElement(i,[]);assert(Math.abs(a.reduce((s,v)=>s+v,0)-1)<.02,`${label}: unnormalized weights`);}
    for(const a of p.listAttributes()) finite(a.getArray(),`${label}: nonfinite mesh`);
  }
  return [...new Set(joints)].sort();
}
function anchors(doc,label) {
  const nodes=doc.getRoot().listNodes(), records=[];
  for(const n of nodes) if(n.getName().startsWith('anchor_')) {
    const a=n.getExtras().cambrianAnchor;
    assert(a && a.version===1 && a.role && a.parentBone,`${label}: invalid ${n.getName()} metadata`);
    const parent=n.getParentNode();assert.equal(parent?.getName(),a.parentBone,`${label}: socket parent mismatch`);
    if(a.chain){assert(a.chain.length && a.chain.at(-1)===a.effectorBone && a.effectorBone===a.parentBone,`${label}: invalid CCD effector`);assert(!a.chain.some(x=>/^(root|body|spine|segment)/.test(x)),`${label}: CCD uses locomotor bone`);}
    finite(n.getWorldTranslation(),`${label}: nonfinite socket`);
    records.push({name:n.getName(),...a});
  }
  for(const [name,role] of [['anchor_mouth','mouth'],['anchor_mouth_inside','swallow'],['anchor_attack_primary','attack']]) assert.equal(records.find(a=>a.name===name)?.role,role,`${label}: missing ${name}`);
  assert.equal(new Set(records.map(a=>a.name)).size,records.length,`${label}: duplicate sockets`);
  return records.sort((a,b)=>a.name.localeCompare(b.name));
}
for(const id of ids) {
  const meta=JSON.parse(fs.readFileSync(`${root}/creatures/${id}.json`));
  const fullFile=`${root}/creatures/${id}.glb`, lodFile=`${root}/creatures/${id}.lod1.glb`;
  const full=await io.read(fullFile), lod=await io.read(lodFile);
  for(const file of [fullFile,lodFile])assert(fs.statSync(file).size<25*1024*1024,`${file}: exceeds25MB`);
  const clips=validateClips(full,[...required,arthropods.has(id)?'Moult':'Growth'],meta.looping??[],id);
  assert(clips.includes('Swim')||clips.includes('Crawl'),`${id}: no locomotion`);
  if(!arthropods.has(id))assert(!clips.includes('Moult'),`${id}: non-arthropod moulting`);
  const joints=validateSkin(full,id);assert.deepEqual(validateSkin(lod,id+' LOD'),joints,`${id}: LOD skeleton mismatch`);
  const sockets=anchors(full,id);assert.deepEqual(anchors(lod,id+' LOD'),sockets,`${id}: LOD socket metadata differs`);
  const fullTris=triangles(full),lodTris=triangles(lod);assert(lodTris<fullTris*.5,`${id}: LOD not sufficiently reduced (${lodTris}/${fullTris})`);
  validateClips(lod,['Idle','Death',clips.includes('Swim')?'Swim':'Crawl'],meta.looping??[],id+' LOD');
  const files={};
  for(const suffix of ['glb','lod1.glb','png','select.png','card.png','thumb.png']) {
    const file=`${root}/creatures/${id}.${suffix}`,bytes=fs.readFileSync(file);files[suffix]={bytes:bytes.length,sha256:hash(bytes)};
    if(suffix.endsWith('png')) {const png=PNG.sync.read(bytes);if(suffix==='select.png'){assert.equal(png.width,1600);assert.equal(png.height,1200);let opaque=0,transparent=0;for(let i=3;i<png.data.length;i+=4){if(png.data[i]>200)opaque++;if(png.data[i]===0)transparent++;}assert(opaque>1000&&transparent>1000,`${id}: invalid cutout`);}if(suffix==='thumb.png'){assert.equal(png.width,256);assert.equal(png.height,192);}}
  }
  results.push({id,fullTriangles:fullTris,lodTriangles:lodTris,joints:joints.length,clips,sockets:sockets.length,files});
  console.log(`PASS ${id}: ${fullTris}/${lodTris} triangles, ${clips.length} clips, ${sockets.length} sockets`);
}
if(!partial && !chosen.length && !args.includes('--shipped')) assert.equal(results.length,21);
fs.mkdirSync('../devonian-authoring/jaekelopterus/intake-review',{recursive:true});
fs.writeFileSync('../devonian-authoring/jaekelopterus/intake-review/intake.json',JSON.stringify(results,null,2)+'\n');
console.log(`${results.length} Devonian specimens passed structural intake`);
