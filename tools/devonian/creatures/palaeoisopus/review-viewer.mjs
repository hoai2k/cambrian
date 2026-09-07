/** Actual exported GLB review through Three.js; writes only Palaeoisopus local review outputs. */
import {chromium} from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('../devonian-authoring/palaeoisopus/viewer-v1');fs.mkdirSync(out,{recursive:true});for(const name of fs.readdirSync(out))if(name.endsWith('.png'))fs.unlinkSync(path.join(out,name));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:750}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const saveCanvas=async name=>{const url=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));};
try{
 await page.route('**/assets/devonian/creatures/palaeoisopus*.glb*',async route=>{const file=new URL(route.request().url()).pathname.split('/').pop();await route.fulfill({body:fs.readFileSync(path.resolve('../devonian-authoring/palaeoisopus/v1-candidate',file)),contentType:'model/gltf-binary'});});
 await page.route('**/palaeoisopus-qa.html',route=>route.fulfill({body:'<!doctype html><html><body></body></html>',contentType:'text/html'}));
 await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:5173')+'/palaeoisopus-qa.html',{waitUntil:'domcontentloaded',timeout:60000});
 const report=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const audit={status:'not-applicable',reason:'Preview is not registered in shared catalogue yet; independent raw GLB checks are in export-review-v1.json.'};
  const gltf=await new GLTFLoader().loadAsync('/assets/devonian/creatures/palaeoisopus.glb?review=v1');document.body.replaceChildren();document.body.style.margin='0';
  const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1000,750);r.setPixelRatio(1);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;document.body.appendChild(r.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#132022');scene.add(gltf.scene);scene.add(new T.HemisphereLight(0xd8e8e8,0x283128,2.2));
  for(const [pos,color,power]of [[[4,7,5],0xffead2,3],[[-4,3,0],0x91c4df,2],[[0,5,-6],0xc5e5ef,3]]){const l=new T.DirectionalLight(color,power);l.position.set(...pos);scene.add(l);}
  const oralFill=new T.PointLight(0xffe0cc,2.8,8,2);oralFill.position.set(0,-1.3,-.6);oralFill.visible=false;scene.add(oralFill);
  const cam=new T.PerspectiveCamera(35,4/3,.01,100);const mixer=new T.AnimationMixer(gltf.scene);let action;
  window.reviewPose=(clip,phase,view)=>{mixer.stopAllAction();action=mixer.clipAction(gltf.animations.find(a=>a.name===clip));action.reset().play();mixer.update(0);action.time=action.getClip().duration*phase;mixer.update(0);gltf.scene.updateMatrixWorld(true);
   oralFill.visible=['mouth','mouthleft','palate'].includes(view);
   const views={threequarter:[[8,7,10],[0,0,-.3]],side:[[12,1,0],[0,0,-.3]],front:[[0,4,12],[0,0,-.3]],dorsal:[[0,15,-.3],[0,0,-.3]],eye:[[1.6,1.8,2.5],[0,.05,.48]],mouth:[[1.1,-2.5,-.3],[0,-.40,-.12]],mouthleft:[[-1.1,-2.5,-.3],[0,-.40,-.12]],palate:[[0,-2.2,-1.3],[0,-.4,-.18]],eyedorsal:[[0,2.9,.6],[0,0,.4]]};const[p,t]=views[view];cam.zoom=['eye','mouth','mouthleft','palate','eyedorsal'].includes(view)?1.0:1.12;cam.updateProjectionMatrix();cam.position.set(...p);cam.lookAt(...t);r.render(scene,cam);return {clip,phase,view};};
  window.reviewLod=async()=>{oralFill.visible=false;mixer.stopAllAction();scene.remove(gltf.scene);const low=await new GLTFLoader().loadAsync('/assets/devonian/creatures/palaeoisopus.lod1.glb?review=v1');scene.add(low.scene);cam.zoom=1.12;cam.updateProjectionMatrix();const lm=new T.AnimationMixer(low.scene);lm.clipAction(low.animations.find(a=>a.name==='Idle')).play();lm.update(0);cam.position.set(8,6.2,9);cam.lookAt(0,0,-.3);r.render(scene,cam);};
  window.reviewClips=gltf.animations.map(a=>({name:a.name,duration:a.duration}));return {audit,clips:window.reviewClips};
 });
 for(const clip of report.clips){await page.evaluate(({name})=>window.reviewPose(name,name==='Death'?1:.5,name==='Eat'||name==='Ability'?'threequarter':'threequarter'),clip);await saveCanvas(clip.name+'.png');}
 for(const view of ['front','side','dorsal','eye','eyedorsal','mouth','mouthleft','palate']){await page.evaluate(v=>window.reviewPose(['mouth','mouthleft','palate'].includes(v)?'Heavy':'Idle',['mouth','mouthleft','palate'].includes(v)?.30:0,v),view);await saveCanvas('neutral-'+({eye:'cephalon',eyedorsal:'cephalon-dorsal',palate:'proboscis-lumen',mouth:'oral-ventral',mouthleft:'oral-ventral-left'}[view]||view)+'.png');}
 for(const name of report.clips.map(c=>c.name))for(const phase of [.2,.75]){await page.evaluate(({name,phase})=>window.reviewPose(name,phase,name==='Bite'||name==='Ability'?'mouth':'threequarter'),{name,phase});await saveCanvas(name+'-phase-'+phase+'.png');}
 if(!process.env.PALAEOISOPUS_QA_QUICK){const movie=await page.evaluate(async()=>{
  const canvas=document.querySelector('canvas');const stream=canvas.captureStream(24);const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3000000});const finished=new Promise(resolve=>rec.onstop=async()=>{const data=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));resolve(btoa(binary));});rec.ondataavailable=e=>chunks.push(e.data);rec.start();
  for(const c of window.reviewClips){const start=performance.now();await new Promise(resolve=>{function step(now){const u=Math.min(1,(now-start)/(c.duration*1000));window.reviewPose(c.name,u,'threequarter');if(u<1)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});}
  rec.stop();stream.getTracks().forEach(t=>t.stop());return finished;
 });fs.writeFileSync(path.join(out,'all-actions.webm'),Buffer.from(movie,'base64'));}
 await page.evaluate(()=>window.reviewLod());await saveCanvas('LOD-Idle.png');
 report.errors=errors;fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({clips:report.clips.length,out,audit:'local preview GLB review',errors}));
}finally{await browser.close();}
