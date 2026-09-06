import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base=process.env.ART_CHECK_URL || 'http://127.0.0.1:5176';
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
await page.goto(base+'/');await page.locator('.title').waitFor({timeout:60000});await page.locator('.title').click();await page.locator('.select').waitFor();
await page.evaluate(async()=>await Promise.all([...document.querySelectorAll('.select img')].map(i=>i.decode())));
assert.equal(await page.locator('.roster-grid img[src*="/schemes/"]').count(),12);
assert.equal(await page.locator('.roster-grid img[src*="/defaults/"]').count(),9);
assert.match(await page.locator('.hero img').getAttribute('src'),/schemes\/anomalocaris/);
await page.screenshot({path:'/tmp/cambrian-palette-select.png',animations:'disabled'});
// Actual failed fetches for both thumbnail and hero must recover to default, without loops.
const broken=await browser.newPage({viewport:{width:1440,height:1000}});let rejected=0;
await broken.route('**/assets/creatures/schemes/anomalocaris.*.png',route=>{rejected++;return route.abort();});
await broken.goto(base+'/');await broken.locator('.title').waitFor({timeout:60000});await broken.locator('.title').click();
await broken.waitForFunction(()=>document.querySelector('.hero img')?.getAttribute('src')?.includes('/defaults/anomalocaris.select.png'));
await broken.locator('.hero img').evaluate(i=>i.decode());
assert.equal(await broken.locator('.roster-grid img[src*="defaults/anomalocaris.thumb.png"]').count(),1);assert(rejected<=3,'failed images must not retry forever');
// The viewer must switch to default for an unrendered palette and restore the matching render.
await page.goto(base+'/viewer/');await page.locator('.scheme-pick select').waitFor();
assert.equal(await page.locator('.scheme-pick select').inputValue(),'coral-flare');
const thumb=page.locator('.specimen.active img');assert.match(await thumb.getAttribute('src'),/schemes\/anomalocaris/);
await page.locator('.scheme-pick select').selectOption('kelp-olive');assert.match(await thumb.getAttribute('src'),/defaults\/anomalocaris.thumb.png/);
await page.locator('.scheme-pick select').selectOption('default');assert.match(await thumb.getAttribute('src'),/defaults\/anomalocaris.thumb.png/);
await page.locator('.scheme-pick select').selectOption('coral-flare');assert.match(await thumb.getAttribute('src'),/schemes\/anomalocaris/);
await page.locator('.status').waitFor({state:'hidden',timeout:60000});
await page.screenshot({path:'/tmp/cambrian-palette-viewer.png',animations:'disabled'});
console.log(JSON.stringify({passed:['12 rendered + 9 default roster thumbnails','matching hero','failed-fetch hero and thumbnail fallback','unrendered and default palette fallback','matching palette restored'],pageErrors:errors},null,2));
await browser.close();assert.equal(errors.length,0,'unexpected browser errors');
