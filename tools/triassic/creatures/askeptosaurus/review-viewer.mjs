/** Real-browser verification; start Vite on 4179 or set VIEWER_URL. CHROME_PATH overrides Chrome. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const baseURL=process.env.VIEWER_URL??'http://127.0.0.1:4179';
const out='local/triassic-authoring/askeptosaurus/viewer-review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/opt/pw-browsers/chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${baseURL}/viewer/?specimen=triassic:askeptosaurus`);
await page.waitForFunction(()=>document.querySelector('.clips')?.getAttribute('data-loaded-model')?.endsWith('/askeptosaurus.glb'),{timeout:60000});
assert.equal(await page.getByText('Preview model', {exact:true}).count(),0);
const select=page.getByLabel('Which model');
// The viewer's clip row carries a **Base pose** button beside the actions, so the count to check
// is the actions themselves. Counting every `.clip` read 24 when this was written and 25 once the
// base poses landed, which is a check about the viewer's furniture rather than about this body.
const actions=async()=>(await page.locator('.clip').allTextContents()).filter(n=>n!=='Base pose');
const choices=await select.locator('option').allTextContents();assert(choices.includes('Backup Model'));assert.equal((await actions()).length,24);
await page.screenshot({path:out+'/viewer-full.png'});
await select.selectOption('backup');
await page.waitForFunction(()=>document.querySelector('.clips')?.getAttribute('data-loaded-model')?.endsWith('/askeptosaurus.backup.glb'));
assert.equal((await actions()).length,24);
await page.locator('.clip').filter({hasText:/^Swim$/}).click();
await page.waitForTimeout(350);assert.equal(await page.locator('.clip.active').textContent(),'Swim');
await page.screenshot({path:out+'/viewer-backup.png'});
await select.selectOption('twin');
await page.waitForFunction(()=>document.querySelector('.clips')?.getAttribute('data-loaded-model')?.endsWith('/askeptosaurus.puppet.glb'));
assert.equal((await actions()).length,24);
await page.screenshot({path:out+'/viewer-twin.png'});
assert.equal(errors.length,0);fs.writeFileSync('tools/triassic/creatures/askeptosaurus/viewer-review.json',JSON.stringify({specimen:'triassic:askeptosaurus',choices,modelsLoaded:['askeptosaurus.glb','askeptosaurus.backup.glb','askeptosaurus.puppet.glb'],clipsPerModel:24,backupSwimPlayed:true,previewBadgeCleared:true,pageErrors:errors},null,2)+'\n');
await browser.close();console.log('Viewer full / Backup Model / twin: 24 clips each, successful playback, no page errors');
