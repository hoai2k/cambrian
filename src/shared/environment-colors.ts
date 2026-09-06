import {biomeWeights, BIOMES, shoreDistance, type Biome, type BiomeWeights, type Flora, type Boulder} from '../sim/world';
import {clamp, noise2, smoothstep} from './math';
import authored from './authored-colors.json';
export const SAND_COLORS:Record<Biome,string>={shallows:'#c8c3a0',nursery:'#a3a682',shelf:'#a3a682',forest:'#8d8f6c',boulders:'#9a9a86',flats:'#8fa07a',channel:'#7f8878',escarpment:'#7c8078',basin:'#5e6a70'};
export const FLORA_BASE:Record<string,string>={vauxia:'#c9a468',sac:'#c9a468',choia:'#b8a97c',thalli:'#7a6040',tuft:'#5d7a43'};
const props:Record<string,keyof typeof authored.props>={cushion:'cushion-sponge',lettuce:'lettuce-tuft',spine:'spine-sponge',glass:'glass-fan'};
export function linear(hex:string):number[]{return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});}
export function hex(rgb:number[]){return '#'+rgb.map(c=>Math.round(clamp(c<=.0031308?c*12.92:1.055*c**(1/2.4)-.055,0,1)*255).toString(16).padStart(2,'0')).join('');}
function hsl(h:number,s:number,l:number):number[]{const f=(n:number)=>{const k=(n+h*12)%12;return l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));};return [f(0),f(8),f(4)];}
export function floraTint(f:Flora):number[]{if(props[f.kind])return [f.shade,f.shade,f.shade];const n=noise2(f.pos.x+.7,f.pos.z+.3);return hsl(.095+n*.05,.14+n*.12,f.shade*.72);}
export function rockTint(b:Boulder):number[]{const n=noise2(b.pos.x+.7,b.pos.z+.3);return hsl(.1+n*.05,.1+n*.1,b.shade*.55);}
export function floraColor(f:Flora){const base=linear(props[f.kind]?authored.props[props[f.kind]]:FLORA_BASE[f.kind]);return hex(base.map((c,i)=>c*floraTint(f)[i]));}
export function rockColor(b:Boulder){if(b.variant)return authored.props[b.variant];return hex(linear('#75837a').map((c,i)=>c*rockTint(b)[i]));}
export function floorColor(x:number,z:number){const weights=biomeWeights(x,z,{} as BiomeWeights),rgb=[0,0,0];for(const b of BIOMES){const c=linear(SAND_COLORS[b]);for(let i=0;i<3;i++)rgb[i]+=c[i]*weights[b];}const k=1-smoothstep(8,40,shoreDistance(x,z)),beach=linear('#d9cfa4');return hex(rgb.map((c,i)=>c+(beach[i]-c)*k));}
