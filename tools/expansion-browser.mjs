import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const base=(process.env.QA_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/,'');
const viewerOnly=Boolean(process.env.QA_VIEWER_ONLY);
const auditOnly=Boolean(process.env.QA_AUDIT_ONLY);
const out=process.env.CAMBRIAN_QA_DIR || '../expansion-authoring/review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.stack || e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.addInitScript(()=>localStorage.setItem('cambrian-settings',JSON.stringify({quality:'low',muted:true,music:false})));
try {
if (!process.env.QA_ONLY_UI) {
await page.goto(`${base}/viewer/`,{waitUntil:'networkidle',timeout:120000});
if(!viewerOnly){
const audit=await page.evaluate(async()=>{const m=await import('/tools/asset-audit.ts');return m.auditAssets()});
fs.writeFileSync(path.join(out,'runtime-asset-audit.json'),JSON.stringify(audit,null,2));
console.log('PASS: runtime loading, textures, skinning, all clips, loops and LOD reduction for',audit.length,'new creatures');
}
const viewerReport=[];
if(!auditOnly && await page.locator('.specimen').count()!==21)throw Error('Viewer roster incomplete');
if(!auditOnly)for(const id of ['pikaia','nectocaris','burgessomedusa','odaraia','ottoia','cambroraster','sidneyia','leanchoilia','isoxys','odontogriphus','ctenorhabdotus','vetulicola','tamisiocaris']) {
 const name=id[0].toUpperCase()+id.slice(1);
 await page.getByRole('button',{name:new RegExp('^'+name+' ')}).click();
 await page.locator('.status').waitFor({state:'hidden',timeout:30000});
 const clips=await page.locator('.clip-grid .clip').allTextContents();
 if((await page.locator('.info h2').textContent())!==name||clips.length<18)throw Error(`Viewer did not load ${id}'s model/animations`);
 viewerReport.push({id,clips});
 await page.getByRole('button',{name:'Ability',exact:true}).click();await page.waitForTimeout(450);
 await page.screenshot({path:path.join(out,`viewer-${id}.png`)});
}
if(!auditOnly){fs.writeFileSync(path.join(out,'viewer-verification.json'),JSON.stringify({base,creatures:viewerReport},null,2));console.log('PASS: all',viewerReport.length,'new specimens loaded with full action controls in the viewer');}
}
if(!viewerOnly&&!auditOnly){
await page.goto(`${base}/`,{waitUntil:'networkidle',timeout:120000});
await page.keyboard.press('Enter');await page.locator('.select').waitFor();
await page.getByRole('option',{name:'Burgessomedusa',exact:true}).click();
await page.screenshot({path:path.join(out,'selection.png')});
await page.getByRole('button',{name:'Add a keyboard player'}).click();
await page.evaluate(()=>{
  window.qaPads=[0,1].map(index=>({id:'QA standard controller',index,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));
  Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPads,configurable:true});
});
await page.waitForTimeout(300);
for(let i=0;i<2;i++){
  await page.evaluate(i=>{window.qaPads[i].buttons[0]={pressed:true,touched:true,value:1}},i);
  await page.waitForTimeout(700);
  await page.evaluate(i=>{window.qaPads[i].buttons[0]={pressed:false,touched:false,value:0}},i);
  await page.waitForTimeout(400);
  if(await page.locator('.crew-card').count()<3+i){
    await page.evaluate(i=>{window.qaPads[i].buttons[0]={pressed:true,touched:true,value:1}},i);
    await page.waitForTimeout(700);
    await page.evaluate(i=>{window.qaPads[i].buttons[0]={pressed:false,touched:false,value:0}},i);
    await page.waitForTimeout(400);
  }
}
await page.screenshot({path:path.join(out,'selection-four.png')});
if(await page.locator('.crew-card').count()!==4) throw Error('Four-player selector failed');
await page.setViewportSize({width:960,height:540});await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'selection-small.png')});
const lastCard=page.locator('.crew-card').last();
await lastCard.scrollIntoViewIfNeeded();
if((await lastCard.boundingBox()).height<150)throw Error('Small-screen player cards collapsed');
await page.screenshot({path:path.join(out,'selection-small-players.png')});
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('tab',{name:/^Reef/}).click();
await page.locator('.ready-button').nth(0).click();
await page.getByRole('option',{name:'Nectocaris',exact:true}).click();
for(let i=1;i<4;i++)await page.locator('.ready-button').nth(i).click();
await page.getByRole('button',{name:'DIVE IN  ·  A',exact:true}).click();
await page.locator('.hud').nth(3).waitFor({timeout:60000});
await page.waitForFunction(()=>!document.body.textContent.includes('Your creature is taking shape'),null,{timeout:60000});
await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
await page.keyboard.press('q');await page.keyboard.press('e');
await page.waitForTimeout(1500);
await page.screenshot({path:path.join(out,'gameplay-four.png')});
console.log('PASS: 21-cell roster, four-player join, scrollable short-screen cards, and four-viewport Reef gameplay');
}
console.log('Browser errors:',JSON.stringify(errors));
fs.writeFileSync(path.join(out,'browser-errors.json'),JSON.stringify(errors,null,2));
if(errors.length)process.exitCode=1;
} finally {await browser.close();}
