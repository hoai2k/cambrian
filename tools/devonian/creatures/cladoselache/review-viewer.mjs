/** Actual exported GLB review through Three.js; writes only Cladoselache local review outputs. */
import {chromium} from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('../devonian-authoring/cladoselache/viewer-v2');fs.mkdirSync(out,{recursive:true});for(const name of fs.readdirSync(out))if(name.endsWith('.png'))fs.unlinkSync(path.join(out,name));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:750}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const saveCanvas=async name=>{const url=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));};
try{
 await page.route('**/assets/devonian/creatures/cladoselache*.glb*',async route=>{const file=new URL(route.request().url()).pathname.split('/').pop();await route.fulfill({body:fs.readFileSync(path.resolve('../devonian-authoring/cladoselache/v2-candidate',file)),contentType:'model/gltf-binary'});});
 await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:5173')+'/viewer/',{waitUntil:'networkidle'});
 const report=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {auditDevonian}=await import('/tools/devonian/runtime-audit.ts');const audit=await auditDevonian(['cladoselache']);
  const gltf=await new GLTFLoader().loadAsync('/assets/devonian/creatures/cladoselache.glb?review=v2');document.body.replaceChildren();document.body.style.margin='0';
  const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1000,750);r.setPixelRatio(1);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;document.body.appendChild(r.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#132022');scene.add(gltf.scene);scene.add(new T.HemisphereLight(0xd8e8e8,0x283128,2.2));
  for(const [pos,color,power]of [[[4,7,5],0xffead2,3],[[-4,3,0],0x91c4df,2],[[0,5,-6],0xc5e5ef,3]]){const l=new T.DirectionalLight(color,power);l.position.set(...pos);scene.add(l);}
  const cam=new T.PerspectiveCamera(35,4/3,.01,100);const mixer=new T.AnimationMixer(gltf.scene);let action;
  window.reviewPose=(clip,phase,view)=>{mixer.stopAllAction();action=mixer.clipAction(gltf.animations.find(a=>a.name===clip));action.reset().play();mixer.update(0);action.time=action.getClip().duration*phase;mixer.update(0);gltf.scene.updateMatrixWorld(true);
   const views={threequarter:[[6,4.4,6.7],[0,0,-.55]],side:[[9,.4,0],[0,.05,-.6]],front:[[0,1.25,8],[0,0,0]],dorsal:[[0,10,-.5],[0,0,-.5]],eye:[[1.45,.65,2.35],[.28,.12,1.70]],mouth:[[.80,.40,3.2],[0,-.09,1.85]]};const[p,t]=views[view];cam.position.set(...p);cam.lookAt(...t);r.render(scene,cam);return {clip,phase,view};};
  window.reviewLod=async()=>{mixer.stopAllAction();scene.remove(gltf.scene);const low=await new GLTFLoader().loadAsync('/assets/devonian/creatures/cladoselache.lod1.glb?review=v2');scene.add(low.scene);const lm=new T.AnimationMixer(low.scene);lm.clipAction(low.animations.find(a=>a.name==='Idle')).play();lm.update(0);cam.position.set(6,4.4,6.7);cam.lookAt(0,0,-.55);r.render(scene,cam);};
  window.reviewClips=gltf.animations.map(a=>({name:a.name,duration:a.duration}));return {audit,clips:window.reviewClips};
 });
 for(const clip of report.clips){await page.evaluate(({name})=>window.reviewPose(name,name==='Death'?1:.5,name==='Eat'||name==='Ability'?'front':'threequarter'),clip);await saveCanvas(clip.name+'.png');}
 for(const view of ['front','side','dorsal','eye','mouth']){await page.evaluate(v=>window.reviewPose(v==='mouth'?'Heavy':'Idle',v==='mouth'?.30:0,v),view);await saveCanvas('neutral-'+view+'.png');}
 for(const name of report.clips.map(c=>c.name))for(const phase of [.2,.75]){await page.evaluate(({name,phase})=>window.reviewPose(name,phase,name==='Bite'||name==='Ability'?'mouth':'threequarter'),{name,phase});await saveCanvas(name+'-phase-'+phase+'.png');}
 if(!process.env.CLADOSELACHE_QA_QUICK){const movie=await page.evaluate(async()=>{
  const canvas=document.querySelector('canvas');const stream=canvas.captureStream(24);const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3000000});const finished=new Promise(resolve=>rec.onstop=async()=>{const data=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));resolve(btoa(binary));});rec.ondataavailable=e=>chunks.push(e.data);rec.start();
  for(const c of window.reviewClips){const start=performance.now();await new Promise(resolve=>{function step(now){const u=Math.min(1,(now-start)/(c.duration*1000));window.reviewPose(c.name,u,'threequarter');if(u<1)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});}
  rec.stop();stream.getTracks().forEach(t=>t.stop());return finished;
 });fs.writeFileSync(path.join(out,'all-actions.webm'),Buffer.from(movie,'base64'));}
 await page.evaluate(()=>window.reviewLod());await saveCanvas('LOD-Idle.png');
 report.errors=errors;fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({clips:report.clips.length,out,audit:'passed',errors}));
}finally{await browser.close();}
