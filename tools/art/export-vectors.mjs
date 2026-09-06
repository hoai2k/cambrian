import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
for(const [source,target,w,h] of [['public/assets/brand/logo.svg','public/assets/brand/logo.png',2400,900],...[[192,'favicon-192.png'],[512,'favicon-512.png'],[180,'apple-touch-icon.png']].map(([s,n])=>['public/assets/brand/emblem-tile.svg',`public/${n}`,s,s])]) {
 const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
 await page.setContent(`<style>*{margin:0}svg{width:100vw;height:100vh;display:block}</style>${fs.readFileSync(source,'utf8')}`);
 await page.screenshot({path:target,omitBackground:true});await page.close();
}
await browser.close();
