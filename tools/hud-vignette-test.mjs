/** Real CSS-animation regression: run with CHROME_PATH set to a Chromium executable. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
await build({stdin:{contents:`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Hud} from './src/app/Hud'; export const render=(players)=>renderToStaticMarkup(React.createElement(Hud,{snapshot:{players,rects:players.map((_,i)=>({x:i*400,y:0,w:400,h:500}))}}));`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'node_modules/.cache/hud-vignette.cjs',define:{'import.meta.env.BASE_URL':JSON.stringify('/')}});
const {render}=createRequire(import.meta.url)('../node_modules/.cache/hud-vignette.cjs');
const player={creature:'anomalocaris',hp:100,hpMax:100,alive:true,hunted:0,hunterState:'none',bandMarkers:[],progress:0,tier:0,tierName:'Larva',stamina:100,staminaMax:100,senseReady:1,abilityReady:1,color:'#fff',fade:0,modelReady:true};
const cases=[{name:'healthy and hunted',hp:100,hunted:1,hunterState:'hunting',want:0},{name:'threshold',hp:30,want:0},{name:'low health, no predator',hp:15,want:.5},{name:'critical',hp:3,want:.9},{name:'dead',hp:0,alive:false,want:0},{name:'invalid maximum',hpMax:0,want:0},{name:'higher max HP',hp:60,hpMax:400,want:.5}];
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try {
 const page=await browser.newPage({viewport:{width:1200,height:700}});
 await page.setContent(`<style>${fs.readFileSync('src/app/styles.css','utf8')}</style>${render(cases.map(c=>({...player,...c})))}`);
 const overlays=page.locator('.health-vignette');assert.equal(await overlays.count(),cases.length);
 // Seek all actual CSS animations across a full cycle; a pulse must never override health opacity.
 for(const ms of [0,250,500,750,1000]) {
  await page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t;}),ms);
  for(let i=0;i<cases.length;i++)assert(Math.abs(await overlays.nth(i).evaluate(e=>Number(getComputedStyle(e).opacity))-cases[i].want)<1e-6,`${cases[i].name} at ${ms}ms`);
 }
 assert.match(await page.locator('.threat.hunting').textContent(),/IS HUNTING YOU/);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await overlays.nth(2).evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
 console.log('Passed: health threshold, severity, healthy-under-threat, dead, invalid HP maximum, per-player scaling, chase text, pulse isolation and reduced motion.');
} finally { await browser.close(); }
