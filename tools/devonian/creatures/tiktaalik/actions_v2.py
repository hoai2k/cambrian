"""Tiktaalik-specific aquatic sculling, neck/cheek feeding and submerged propping."""
import numpy as np
from math import sin,cos,pi

def animate(bpy,scene,rig,obj,CLIPS,LOOPS,reset):
 seams={};bounds={};metrics={}
 def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
 def pulse(u,a,b,c):return ease((u-a)/(b-a))*(1-ease((u-b)/(c-b)))if a<u<c else 0
 for clip,duration in CLIPS.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;last=round(duration*30);states=[]
  for f in range(last+1):
   reset();u=f/last;p=2*pi*u;loop=clip in LOOPS;env=1 if loop else sin(pi*u)**2;pb=rig.pose.bones;body=pb['body'];wind=pulse(u,0,.20,.40);peak=pulse(u,.20,.42,.67);recover=pulse(u,.53,.72,1);e=sin(pi*u)**2;dead=ease(u/.78)if clip=='Death'else 0
   amp={'Idle':.22,'Swim':.90,'TurnLeft':.65,'TurnRight':.65,'Dive':.48,'Rise':.43,'Attack':.7,'Bite':.18,'Heavy':.78,'Hit':.3,'Death':.15,'Guard':.16,'Parry':.48,'Dodge':1.25,'Eat':.13,'Stagger':.50,'Ability':.25,'Growth':.16}[clip]
   phase=p+(0.20*sin(p)if clip=='Swim'else 0);wave=lambda lag:sin(phase-lag)*env*(1-dead)
   jaw=.012*(1-cos(2*p))if loop else 0;aim=0
   if clip=='Eat':jaw=.12*(1-cos(p))+.065*(1-cos(2*p));aim=-.035*(1-cos(p))
   if clip=='Bite':jaw=.31*pulse(u,.02,.28,.60)+.025*pulse(u,.62,.79,.98)
   if clip=='Attack':jaw=.34*pulse(u,.035,.28,.60);aim=.045*wind-.09*peak
   if clip=='Heavy':jaw=.40*pulse(u,.03,.30,.64);aim=.065*wind-.12*peak
   if clip=='Growth':jaw=.115*pulse(u,.15,.48,.86);aim=-.045*e
   if clip=='Ability':jaw=.13*pulse(u,.30,.57,.90);aim=-.10*e
   if clip in ['Hit','Stagger']:jaw=.065*e
   jaw+=.065*dead;pb['jaw'].rotation_euler.x=jaw;pb['skull'].rotation_euler.x=aim;pb['neck'].rotation_euler.x=aim*.36;pb['neck'].rotation_euler.z=.025*wave(.2)*amp
   pb['throat'].rotation_euler.x=jaw*.20+.022*(1-cos(2*p-.4))*env*(1-dead)
   for side in [-1,1]:pb['cheek'+('L'if side>0 else'R')].rotation_euler.z=side*(jaw*.14+.008*(1-cos(2*p-.6))*env*(1-dead))
   body.rotation_euler.z=.018*amp*wave(.25);body.rotation_euler.x=.010*amp*wave(.6);body.rotation_euler.y=.022*amp*wave(1);body.location.z=.013*amp*wave(.6)
   turn=(-1 if clip=='TurnLeft'else 1)if clip in ['TurnLeft','TurnRight']else 0
   if turn:body.rotation_euler.z+=turn*.20*e;body.rotation_euler.y+=turn*.055*e;pb['neck'].rotation_euler.z+=turn*.15*e;pb['skull'].rotation_euler.z+=turn*.075*e
   if clip in ['Dive','Rise']:
    sg=1 if clip=='Dive'else-1;body.rotation_euler.x=sg*.16*e;body.location.z=-sg*.10*e;pb['neck'].rotation_euler.x=sg*.075*e
   if clip in ['Attack','Heavy']:
    heavy=clip=='Heavy';body.location.y=(.12 if heavy else .07)*wind-(.25 if heavy else .18)*peak+.035*recover;body.rotation_euler.z=(-.07*wind+.105*peak-.035*recover)if heavy else .025*e
   if clip=='Guard':body.location.z=.022*(1-cos(p));pb['neck'].rotation_euler.x=-.040*(1-cos(p))
   if clip=='Parry':body.location.x=.06*e;pb['neck'].rotation_euler.z=.18*pulse(u,0,.32,1);body.rotation_euler.z=.11*pulse(u,.04,.43,1)
   if clip=='Dodge':body.location.x=.22*pulse(u,.03,.40,1);body.rotation_euler.z=-.22*pulse(u,0,.34,1);body.rotation_euler.y=.13*e;pb['neck'].rotation_euler.z=-.12*e
   if clip=='Hit':body.rotation_euler.z=.14*pulse(u,0,.24,.96);body.rotation_euler.y=-.14*pulse(u,0,.30,.96);pb['neck'].rotation_euler.x=.08*e
   if clip=='Stagger':body.rotation_euler.y=.13*sin(p*2+.4)*e;body.rotation_euler.z=.12*sin(p*2)*e;body.location.z=-.055*e;pb['neck'].rotation_euler.z=.10*sin(p*2-.7)*e
   if clip=='Ability':body.location.z=.085*pulse(u,.05,.40,.97);body.rotation_euler.x=-.045*e;pb['neck'].rotation_euler.z=.07*sin(p)*e
   if clip=='Growth':body.location.z=.045*e;body.rotation_euler.x=-.028*e
   body.rotation_euler.y+=.63*dead;body.rotation_euler.x+=.03*dead;body.location.z-=.11*dead
   for i in range(6):
    q=pb['tail%d'%i];q.rotation_euler.z=(.035+i*.033)*amp*wave(.55+i*.80)+turn*(.04+i*.013)*e+.07*dead*sin(i*.65+.5);q.rotation_euler.x=.009*amp*wave(1+i*.7)
    if clip=='Dodge':q.rotation_euler.z+=.17*e*sin(.6+i*.65)
    if clip in ['Attack','Heavy']:q.rotation_euler.z+=.06*wind-.055*peak
    if clip=='Stagger':q.rotation_euler.z+=.06*sin(2*p-i*.8)*e
   for side in [-1,1]:
    ss='L'if side>0 else'R';stroke=phase+side*.55;scull=sin(stroke)*env*(1-dead);back=cos(stroke)*env*(1-dead);swim=.20 if clip=='Swim'else .035*amp;support=.22*pulse(u,.05,.38,.96)if clip=='Ability'else .08*(1-cos(p))if clip=='Guard'else 0
    q=pb['pectoral'+ss];el=pb['elbow'+ss];dist=pb['distal'+ss];web=pb['web'+ss]
    q.rotation_euler.y=side*(swim*scull+support+.09*dead);q.rotation_euler.z=side*(.14*back if clip=='Swim'else .03*amp*wave(.5))
    el.rotation_euler.y=side*(-.55*support+.11*amp*wave(1.1+side*.55)+.07*dead);el.rotation_euler.z=side*.065*amp*wave(.85+side*.55)
    dist.rotation_euler.y=side*(-.65*support+.14*amp*wave(1.9+side*.55)+.12*dead);dist.rotation_euler.z=side*.055*amp*wave(1.4+side*.55)
    web.rotation_euler.y=side*(.14*amp*wave(2.5+side*.55)-.15*support+.10*dead);web.rotation_euler.z=side*.035*amp*wave(2+side*.55)
    if turn:q.rotation_euler.y+=side*(.17 if side==turn else-.09)*e;el.rotation_euler.z+=side*(.15 if side==turn else-.05)*e;web.rotation_euler.y+=side*.09*e
    if clip in ['Dive','Rise']:q.rotation_euler.y+=side*(.16 if clip=='Dive'else-.14)*e;dist.rotation_euler.y-=side*.075*e
    if clip in ['Attack','Heavy']:q.rotation_euler.z+=side*(.10*wind-.15*peak+.055*recover);el.rotation_euler.y+=side*(.12*wind-.11*peak);dist.rotation_euler.y+=side*.10*recover
    if clip=='Dodge':q.rotation_euler.y+=side*(.24 if side==1 else-.13)*e;el.rotation_euler.z+=side*(.19 if side==1 else-.09)*e;web.rotation_euler.y+=side*.12*recover
    if clip=='Parry':q.rotation_euler.y+=side*(.17 if side==1 else-.075)*e;dist.rotation_euler.y+=side*.11*e
    if clip=='Growth':q.rotation_euler.z-=side*.12*e;el.rotation_euler.y-=side*.13*e;dist.rotation_euler.y-=side*.10*pulse(u,.14,.55,.98)
    hip=pb['pelvic'+ss];hd=pb['pelvicDistal'+ss];hw=pb['pelvicWeb'+ss];hip.rotation_euler.y=side*(.09*amp*wave(2.25+side*.55)+support*.5+.085*dead);hip.rotation_euler.z=side*.07*amp*wave(1.6+side*.55);hd.rotation_euler.y=side*(.10*amp*wave(2.8+side*.55)-support*.4+.10*dead);hw.rotation_euler.y=side*(.11*amp*wave(3.5+side*.55)-support*.25+.09*dead)
   state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb]);states.append(state)
   if f==last:seams[clip]=float(abs(state-states[0]).max())
   for q in pb:
    if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  points=[]
  for f in range(last+1):
   scene.frame_set(f);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',co);co=co.reshape(-1,3);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
  bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()];metrics[clip]={'maxPoseDelta':float(np.ptp(np.array(states),axis=0).max()),'sampledFrames':last+1,'deathHoldDelta':float(np.max(np.abs(np.array(states)[int(last*.84):]-states[-1])))if clip=='Death'else None};rig.animation_data.action=None
 for name in CLIPS:
  if name!='Death':assert seams[name]<1e-6,(name,seams[name])
 assert metrics['Death']['deathHoldDelta']<1e-8
 return seams,bounds,metrics
