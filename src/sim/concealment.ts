import { floorColor, floraColor, rockColor } from '../shared/environment-colors';
import { ACTIVE_ERA } from '../content';
const authored = ACTIVE_ERA.presentation.authoredColors;
import { clamp, dist } from '../shared/math';
import { scheme, schemeForCreature, type Slot } from '../shared/palettes';
import { creature, type CreatureId } from './creatures';
import { bodyRadius, clearanceOf, isAlive } from './actors';
import { sampleHeight, type WorldData } from './world';
import type { Actor } from './types';

export const BURROWERS = new Set<CreatureId>(['marrella', 'ottoia']);
export const HEAVY_SPECIALS = new Set(['snatch', 'tentacleSeize', 'basketRake', 'shellCrush', 'spineIntercept', 'collectorWake', 'pharyngealPump', 'planktonComb']);
export const DEFENSIVE_SPECIALS = new Set(['anchor', 'bristleFlare', 'shellUp', 'enroll', 'bellCorral', 'adhesiveGlide']);
export const CAMOUFLAGE_DRAIN = 3.5;
export type CamoColors = Record<Slot, string>;
function environmentColors(color: string): CamoColors {
 return {body:color, eyes:'#080c0a', fins:color, legs:color, accent:color, underside:color};
}
export interface CamouflageMatch { colors:CamoColors; scheme:string; label:string; actor:number; distance:number; }
/** Compare distances to surfaces, rather than choosing a distant object's centre over the floor. */
export function camouflageMatch(a: Actor, world: WorldData, actors: Actor[]): CamouflageMatch {
 const floor=sampleHeight(a.pos.x,a.pos.z);
 let best:CamouflageMatch={colors:environmentColors(floorColor(a.pos.x,a.pos.z)),scheme:'environment',label:'Seafloor',actor:-1,distance:Math.max(0,a.pos.y-floor-clearanceOf(a))};
 const take=(distance:number,colors:CamoColors,label:string,id=-1,palette='environment')=>{if(distance<=best.distance)best={distance,colors,label,actor:id,scheme:palette};};
 for(const f of world.floraHash.query(a.pos.x,a.pos.z,best.distance+world.floraReach,[])){
  const y=clamp(a.pos.y,f.pos.y,f.pos.y+f.H), t=clamp((y-f.pos.y)/f.H,0,1);
  const d=Math.max(0,dist(a.pos,{x:f.pos.x+f.bx*t,y,z:f.pos.z+f.bz*t})-f.R-bodyRadius(a));
  take(d,environmentColors(floraColor(f)),`${f.kind} plant`);
 }
 for(const b of world.boulderHash.query(a.pos.x,a.pos.z,best.distance+8,[])){
  const y=clamp(a.pos.y,b.pos.y,b.pos.y+b.height);const d=Math.max(0,dist(a.pos,{x:b.pos.x,y,z:b.pos.z})-b.radius-bodyRadius(a));
  take(d,environmentColors(rockColor(b)),b.variant??'Rock');
 }
 for(const o of actors){
  if(o.id===a.id||!isAlive(o))continue;
  const d=Math.max(0,dist(a.pos,o.pos)-bodyRadius(o)-bodyRadius(a));
  const palette=scheme(schemeForCreature(o.creature));
  const colors=palette.colors??authored.creatures[o.creature]!;
  take(d,o.hideMode==='camouflage'&&o.camoColors?{...o.camoColors}:{...colors},creature(o.creature).name,o.id,palette.id);
 }
 return best;
}
export function stopHiding(a:Actor) {
 a.hideMode='none';a.hideT=0;a.hideCd=2;
}
export function clearPursuit(a:Actor,actors:Actor[]) {
 for(const o of actors){
  const b=o.brain;if(!b)continue;
  const factor=a.camoSource === o.id ? .2 : .35;
  b.detection.set(a.id,(b.detection.get(a.id)??0)*factor);
  if(b.target===a.id&&(b.detection.get(a.id)??0)<1){b.target=-1;b.goal='search';b.goalT=0;}
  if(o.lockTarget===a.id)o.lockTarget=-1;
 }
}
export function hideLabel(id:CreatureId){return BURROWERS.has(id)?'Burrow':'Camouflage';}
export function hideDescription(id:CreatureId){return BURROWERS.has(id)?'Y: descend and bury in sediment without stamina drain. Y or heavy exits with a free emergence strike.':'Y: copy the nearest creature, plant, rock or seafloor colour. Uses stamina; idle creatures slowly sink. Move to counter sinking; attack, block or sprint reveals you.';}
