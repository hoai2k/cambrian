import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1400,height:1600},deviceScaleFactor:1});
const files=['public/assets/brand/logo.svg','public/favicon.svg','public/assets/brand/keyart.webp','public/assets/brand/keyart-mobile.webp',...fs.readdirSync('public/assets/ui').map(n=>'public/assets/ui/'+n),...fs.readdirSync('public/assets/creatures').filter(n=>n.endsWith('.select.png')).map(n=>'public/assets/creatures/'+n)];
await page.setContent('<style>body{background:#07202a;color:#eefaf6;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0;background:#12343f}img{width:100%;height:180px;object-fit:contain}figcaption{padding:4px}</style>'+files.map(p=>`<figure><img src="data:image/${p.endsWith('.svg')?'svg+xml':p.endsWith('.png')?'png':'webp'};base64,${fs.readFileSync(p).toString('base64')}"><figcaption>${p.split('/').at(-1)}</figcaption></figure>`).join(''));
await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()))});
await page.screenshot({path:'/tmp/cambrian-art-review.png',fullPage:true});await browser.close();
