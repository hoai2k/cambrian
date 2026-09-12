import { chromium } from 'playwright-core';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('public/assets/creatures/schemes/manifest.json'));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});
const embed=p=>'data:image/png;base64,'+fs.readFileSync(p).toString('base64');
await page.setContent('<style>body{background:#07202a;color:#eefaf6;font:14px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;background:#15343e}img{width:50%;height:160px;object-fit:contain}figcaption{padding:8px}</style>'+Object.entries(manifest).map(([id,m])=>`<figure><img src="${embed(`public/assets/creatures/defaults/${id}.select.png`)}"><img src="${embed('public/'+m.files.select)}"><figcaption>${id} · default → ${m.scheme}</figcaption></figure>`).join(''));
await page.evaluate(async()=>await Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:'/tmp/cambrian-palette-review.png',fullPage:true});await browser.close();
