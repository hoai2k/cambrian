"""Cladoselache locomotor choreography: tail-led swimming, supported fins and cladodont jaws."""
import math,numpy as np
from math import sin,cos,pi

def animate(bpy,scene,rig,obj,CLIPS,LOOPS,reset):
 seams={};bounds={};metrics={}
 def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
 def pulse(u,a,b,c):return ease((u-a)/(b-a))*(1-ease((u-b)/(c-b))) if a<u<c else 0
 for clip,duration in CLIPS.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;last=round(duration*30);first=None;states=[]
  for f in range(last+1):
   reset();u=f/last;p=2*pi*u;loop=clip in LOOPS;env=1 if loop else sin(pi*u)**2;pb=rig.pose.bones
   wind=pulse(u,0,.19,.40);contact=pulse(u,.23,.43,.65);recoil=pulse(u,.51,.66,.92);e=sin(pi*u)**2;dead=ease(u/.80)if clip=='Death'else 0
   amp={'Idle':.26,'Swim':1.05,'Guard':.15,'Eat':.20,'Attack':.60,'Heavy':.84,'Dodge':1.34,'Ability':1.38,'Growth':.20,'Hit':.19,'Stagger':.40}.get(clip,.42)
   freq=2 if clip in ['Swim','Ability','Stagger']else 1
   if clip in ['Attack','Heavy']:amp*=.30+1.15*contact+.45*recoil
   if clip=='Death':amp*=1-dead
   wave=lambda lag=0:sin(p*freq-lag)*env
   opening=.018*(1+sin(p*2))if loop else 0
   if clip=='Eat':opening=.10*(1-cos(p*2))+.035*(1-cos(p))
   if clip=='Bite':opening=.43*pulse(u,.03,.30,.57)+.028*pulse(u,.60,.74,.96)
   if clip=='Attack':opening=.38*pulse(u,.04,.28,.56)
   if clip=='Heavy':opening=.48*pulse(u,.03,.30,.60)
   if clip=='Ability':opening=.18*pulse(u,.08,.34,.65)+.08*pulse(u,.68,.80,.98)
   if clip=='Guard':opening=.028*(1-cos(p))
   if clip=='Growth':opening=.10*pulse(u,.13,.46,.82)
   if clip in ['Hit','Stagger']:opening=.07*e
   opening+=.11*dead
   pb['jaw'].rotation_euler.x=opening;pb['skull'].rotation_euler.x=-opening*.12
   pb['throat'].rotation_euler.x=opening*.18+.030*(1+sin(p*2-.7))*env*(1-dead)
   body=pb['body'];body.rotation_euler.z=.020*amp*wave(.15);body.rotation_euler.y=.025*amp*wave(.8);body.rotation_euler.x=.010*amp*wave(.1)
   body.location.z=.012*amp*wave(.6)
   turn=(-1 if clip=='TurnLeft'else 1)if clip in ['TurnLeft','TurnRight']else 0
   if turn:body.rotation_euler.z+=turn*(.30*e-.045*recoil);body.rotation_euler.y+=turn*.15*e
   if clip in ['Dive','Rise']:
    sg=1 if clip=='Dive'else-1;body.rotation_euler.x=sg*.23*e;body.location.z=-sg*.10*e
   if clip=='Attack':body.location.y=.095*wind-.29*contact+.040*recoil;body.rotation_euler.x=.048*wind-.048*contact
   if clip=='Heavy':body.location.y=.11*wind-.34*contact+.06*recoil;body.rotation_euler.z=-.095*wind+.16*contact-.035*recoil;body.rotation_euler.x=.06*wind-.085*contact
   if clip=='Guard':body.rotation_euler.x=.03*(1-cos(p));body.location.y=.016*(1-cos(p))
   if clip=='Parry':body.rotation_euler.z=.20*pulse(u,0,.35,1);body.rotation_euler.y=-.19*pulse(u,.02,.46,1);body.location.x=.08*e
   if clip=='Dodge':body.rotation_euler.z=-.27*pulse(u,0,.35,1);body.rotation_euler.y=.35*pulse(u,0,.48,1);body.location.x=.29*pulse(u,0,.48,1)
   if clip=='Hit':body.rotation_euler.z=.18*pulse(u,0,.24,.93);body.rotation_euler.y=-.18*pulse(u,0,.34,.92);body.location.y=.075*e
   if clip=='Stagger':body.rotation_euler.z=.16*sin(p*2)*e;body.rotation_euler.y=.21*sin(p+.6)*e;body.location.z=-.09*e
   if clip=='Ability':body.rotation_euler.y=.19*sin(p)*e;body.rotation_euler.z=.15*sin(p+.2)*e;body.location.y=-.20*pulse(u,.14,.47,.88)
   if clip=='Growth':body.rotation_euler.x=-.045*e;body.location.z=.04*e
   body.rotation_euler.y+=.85*dead;body.rotation_euler.x+=.05*dead;body.location.z-=.12*dead
   for i in range(6):
    q=pb['tail%d'%i];q.rotation_euler.z=(.06+i*.024)*amp*wave(i*.73+.2)+turn*(.055+i*.008)*e+.085*dead*sin(i*.6+.7)
    q.rotation_euler.x=.014*amp*wave(i*.73+1.2)
    if clip=='Dodge':q.rotation_euler.z+=.18*e*sin(i*.55+.6)
    if clip=='Heavy':q.rotation_euler.z+=.07*wind-.075*contact
    if clip=='Stagger':q.rotation_euler.z+=.075*e*sin(p*2-i*.8)
   pb['caudal'].rotation_euler.z=.18*amp*wave(4.7)+.065*dead;pb['caudal'].rotation_euler.y=.025*amp*wave(5.1)
   pb['dorsal'].rotation_euler.y=.022*amp*wave(1.1);pb['dorsalRear'].rotation_euler.y=.041*amp*wave(3.1)
   for side in [-1,1]:
    ss='L'if side==1 else'R';q=pb['pectoral'+ss];tip=pb['pectoralTip'+ss]
    q.rotation_euler.y=side*(.032*amp*wave(.8+side*.10)+.10*dead);q.rotation_euler.z=side*.02*amp*wave(.4)
    tip.rotation_euler.y=side*(.063*amp*wave(1.5+side*.10)+.15*dead);tip.rotation_euler.z=side*.028*amp*wave(1.1)
    if turn:q.rotation_euler.y+=side*(.17 if side==turn else-.065)*e;tip.rotation_euler.y+=side*(.10 if side==turn else-.03)*e
    if clip in ['Dive','Rise']:q.rotation_euler.y+=side*(.14 if clip=='Dive'else-.13)*e;tip.rotation_euler.y+=side*.075*e
    if clip in ['Attack','Heavy']:q.rotation_euler.y+=side*(.095*wind-.18*contact+.07*recoil);tip.rotation_euler.y+=side*(.16*wind-.11*contact+.08*recoil)
    if clip=='Guard':q.rotation_euler.y-=side*.10*(1-cos(p));tip.rotation_euler.y-=side*.085*(1-cos(p))
    if clip=='Dodge':q.rotation_euler.y+=side*(.25 if side==1 else-.11)*e;tip.rotation_euler.y+=side*(.20 if side==1 else-.08)*e
    if clip=='Parry':q.rotation_euler.y+=side*(.19 if side==1 else-.08)*e
    if clip=='Ability':q.rotation_euler.y+=side*.10*sin(p+side*.5)*e;tip.rotation_euler.y+=side*.14*sin(p-.6+side*.5)*e
    if clip=='Growth':q.rotation_euler.y-=side*.20*e;tip.rotation_euler.y-=side*.13*pulse(u,.15,.55,.97)
    pb['pelvic'+ss].rotation_euler.y=side*(.055*amp*wave(2.3)+.10*dead+.035*opening)
    pb['gill'+ss].rotation_euler.z=side*(.025*opening+.013*(1+sin(p*2-.4+side*.14))*env*(1-dead))
   state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb]);states.append(state)
   if f==0:first=state.copy()
   if f==last:seams[clip]=float(abs(state-first).max())
   for q in pb:
    if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  points=[]
  for f in range(last+1):
   scene.frame_set(f);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
  bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()];metrics[clip]={'maxPoseDelta':float(np.ptp(np.array(states),axis=0).max()),'sampledFrames':last+1,'deathHoldDelta':float(np.max(np.abs(np.array(states)[int(last*.84):]-states[-1])))if clip=='Death'else None};rig.animation_data.action=None
 for name in CLIPS:
  if name!='Death':assert seams[name]<1e-6,(name,seams[name])
 return seams,bounds,metrics
