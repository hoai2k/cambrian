import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('cambrian-settings',JSON.stringify({quality:'low',muted:true,music:false})));
try {
 await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:4181/',{waitUntil:'networkidle',timeout:120000});
 await page.keyboard.press('Enter');await page.locator('.select').waitFor();
 await page.getByRole('option',{name:'Opabinia',exact:true}).click();
 await page.locator('.ready-button').first().click();
 await page.getByRole('button',{name:'DIVE IN  ·  A',exact:true}).click();
 await page.locator('.hud').first().waitFor({timeout:60000});
 await page.waitForFunction(()=>!document.body.textContent.includes('Your creature is taking shape'),null,{timeout:60000});
 await page.evaluate(async()=>{const e=window.__cambrian,g=e.game,a=g.players[0];const {sampleHeight}=await import('/src/sim/world.ts');a.pos.y=sampleHeight(a.pos.x,a.pos.z)+8;a.spawnProtect=999;a.state='free';a.stamina=a.staminaMax;g.actors.forEach(o=>{if(o!==a)o.brain=undefined;});});
 await page.screenshot({path:'../hiding-work/before.png'});
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('r');await page.waitForTimeout(700);await page.keyboard.up('r');
 await page.waitForFunction(()=>window.__cambrian.game.players[0].camoStrength>.95);
 const camo=await page.evaluate(()=>{const a=window.__cambrian.game.players[0];return {mode:a.hideMode,strength:a.camoStrength,label:a.camoLabel,y:a.pos.y}});
 assert.equal(camo.mode,'camouflage');assert((await page.locator('.hud').first().textContent()).includes('Camo:'));
 await page.screenshot({path:'../hiding-work/camouflage.png'});
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('r');await page.waitForTimeout(700);await page.keyboard.up('r');await page.waitForFunction(()=>window.__cambrian.game.players[0].hideMode==='none');
 await page.keyboard.down('g');await page.waitForFunction(()=>window.__cambrian.game.players[0].state==='ability');
 const heavy=await page.evaluate(()=>{const a=window.__cambrian.game.players[0];return {state:a.state,active:a.abilityActive}});await page.keyboard.up('g');
 assert.equal(heavy.state,'ability');assert(heavy.active);assert.deepEqual(errors,[]);
 console.log('PASS browser: actual keyboard hide toggle, smooth rendered camouflage, HUD target, native heavy, no page errors',camo);
} finally {await browser.close();}
