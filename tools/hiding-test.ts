import assert from 'node:assert/strict';
import {Game} from '../src/sim/game';
import {emptyInput, type Actor, type InputFrame} from '../src/sim/types';
import {applyScaleStats, clearanceOf, isHidden, isInvulnerable} from '../src/sim/actors';
import {camouflageMatch} from '../src/sim/concealment';
import {creature, type CreatureId} from '../src/sim/creatures';
import {sampleHeight, type Flora, type Boulder} from '../src/sim/world';
import {floorColor, floraColor, rockColor} from '../src/shared/environment-colors';
import {applyHit} from '../src/sim/combat';
import {updateDetection, makeBrain} from '../src/sim/ai';
function setup(id:CreatureId){
 const g=new Game('reef',[{creature:id,device:'keyboard',ready:true}],19);
 const a=g.players[0];g.actors.splice(0,g.actors.length,a);
 a.scale=1;applyScaleStats(a,false);a.stamina=a.staminaMax;a.state='free';a.spawnProtect=0;
 a.pos={x:0,y:sampleHeight(0,0)+12,z:0};a.grounded=false;a.vel={x:0,y:0,z:0};a.yaw=0;
 g.world.boulders.length=0;g.world.flora.length=0;g.world.boulderHash.rebuild([]);g.world.floraHash.rebuild([]);
 return {g,a};
}
function tick(g:Game,a:Actor,input:Partial<InputFrame>={},n=1){const f={...emptyInput(),...input};for(let i=0;i<n;i++)(g as any).updateActor(a,f,1/60);}
{
 const {g,a}=setup('opabinia');a.tier=0;const start=a.stamina;
 tick(g,a,{ability:true});assert.equal(a.hideMode,'camouflage');
 tick(g,a,{},120);assert(a.camoStrength>.99);assert(a.stamina<start-8);assert(a.pos.y<sampleHeight(0,0)+11.8);
 assert(!isInvulnerable(a));
 const before=a.pos.y;tick(g,a,{rise:true},60);assert(a.pos.y>before,'explicit rise counters sinking');
 tick(g,a,{ability:true});assert.equal(a.hideMode,'none');tick(g,a,{},180);assert(a.camoStrength<.001);
 tick(g,a,{ability:true});a.stamina=.01;tick(g,a);assert.equal(a.hideMode,'none','exhaustion ends disguise');
 console.log('PASS camouflage unlock, morph, drain, sinking, steering, exit, exhaustion');
}
for(const id of ['marrella','ottoia'] as const){
 const {g,a}=setup(id);a.stamina=50;tick(g,a,{ability:true});assert.equal(a.hideMode,'descending');tick(g,a,{},360);
 assert.equal(a.hideMode,'burrowed');assert(isHidden(a));assert(!isInvulnerable(a));const energy=a.stamina;tick(g,a,{},600);assert(a.stamina>=energy,'burrowing never drains energy');
 tick(g,a,{ability:true});assert.equal(a.hideMode,'none');assert.equal(a.state,'attack');assert.equal(a.move?.name,'Emergence strike');assert.equal(a.move?.stamina,0);
 console.log('PASS',id,'descend, free indefinite burial, vulnerable if revealed, free emergence heavy');
}
for(const id of ['opabinia','nectocaris','cambroraster','sidneyia','isoxys'] as const){
 const {g,a}=setup(id);tick(g,a,{heavy:true});assert.equal(a.state,'ability');assert(a.abilityActive);assert(a.stamina<a.staminaMax-15);assert.equal(a.hideMode,'none');
 console.log('PASS',id,'heavy dispatches signature');
}
{
 const {g,a}=setup('hallucigenia');tick(g,a,{guard:true});assert.equal(a.state,'parry');assert(a.abilityActive);
 const o=g.spawn('waptia','ambient',{...a.pos,x:a.pos.x+1},1);o.spawnProtect=0;const hp=o.hp;
 assert.equal(applyHit((g as any).hitCtx,o,a,creature('waptia').light,0),'parried');assert(o.hp<hp,'anchor parry counters');
 tick(g,a,{guard:true},25);assert.equal(a.state,'guard');assert(!isInvulnerable(a));
 console.log('PASS Hallucigenia timed counter and sustained non-invulnerable block');
}
{
 const {g,a}=setup('opabinia');const o=g.spawn('waptia','ambient',{...a.pos,x:1},1);o.spawnProtect=0;
 const match=camouflageMatch(a,g.world,[a,o]);assert.equal(match.actor,o.id);assert.equal(match.scheme,'sandflat-tan');
 tick(g,a,{ability:true});tick(g,a,{},90);assert(a.camoStrength>.9);
 applyHit((g as any).hitCtx,o,a,creature('waptia').light,0);assert.equal(a.hideMode,'none','hit breaks camouflage');
 console.log('PASS nearest creature palette copying and hit reveal');
}
{
 const {g,a}=setup('waptia');a.pos={x:220,y:sampleHeight(220,-220)+2,z:-220};a.vel={x:0,y:0,z:0};
 const hunter=g.spawn('anomalocaris','ambient',{...a.pos,z:a.pos.z-3},1.1);hunter.yaw=0;
 const b=makeBrain('needs',hunter.pos,g.rng);hunter.brain=b;
 a.cover=0;a.noise=.5;a.hideMode='none';updateDetection({...g, nearby:()=>[a]} as any,hunter,b,1);const visible=b.detection.get(a.id)??0;
 b.detection.clear();a.hideMode='camouflage';a.camoStrength=1;updateDetection({...g, nearby:()=>[a]} as any,hunter,b,1);assert((b.detection.get(a.id)??0)<visible,'camouflage reduces visual detection');
 console.log('PASS camouflage reduces AI detection');
}

{
 const hidden=setup('opabinia'), visible=setup('opabinia');
 hidden.a.hideMode='camouflage';
 tick(hidden.g,hidden.a,{mx:1},60);tick(visible.g,visible.a,{mx:1},60);
 assert.equal(hidden.a.pos.y,visible.a.pos.y,'horizontal steering cancels the extra camouflage sink');
 console.log('PASS horizontal movement cancels extra sinking');
}
{
 const {g,a}=setup('opabinia');
 assert.equal(camouflageMatch(a,g.world,[]).colors.body,floorColor(a.pos.x,a.pos.z));
 const f:Flora={pos:{...a.pos},kind:'vauxia',scale:1,sy:1,rot:0,shade:.5,H:3,R:1,maxB:0,bx:0,bz:0,bvx:0,bvz:0,active:false};
 g.world.floraHash.rebuild([f]);assert.equal(camouflageMatch(a,g.world,[]).colors.body,floraColor(f));
 g.world.floraHash.rebuild([]);
 const b:Boulder={pos:{...a.pos},radius:1,height:2,sx:1,sy:1,sz:1,rot:0,shade:.5,variant:'talus-shard'};
 g.world.boulderHash.rebuild([b]);assert.equal(camouflageMatch(a,g.world,[]).colors.body,rockColor(b));
 console.log('PASS nearest floor, plant and prop use shared rendered colors');
}
{
 const {g,a}=setup('marrella');a.hideMode='burrowed';a.pos.y=sampleHeight(a.pos.x,a.pos.z)+clearanceOf(a);a.stamina=0;
 tick(g,a,{heavy:true});assert.equal(a.move?.name,'Emergence strike');assert.equal(a.move?.stamina,0);
 const other=setup('marrella');other.a.hideMode='burrowed';tick(other.g,other.a,{guard:true});assert.equal(other.a.emergenceHeavy,false,'defensive exit cannot bank a free heavy');
 console.log('PASS zero-energy attack emergence and no banked free-heavy exploit');
}

for (const id of ['waptia','pikaia'] as const) {
 const {g,a}=setup(id);tick(g,a,{guard:true});assert.equal(a.state,creature(id).canGuard?'parry':'dodge');assert(g.silt.length>0,'B evade incorporates the escape special');
}
console.log('All hiding/combat input checks passed');
