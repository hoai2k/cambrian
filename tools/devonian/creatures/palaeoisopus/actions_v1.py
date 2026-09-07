"""Aquatic arthropod actions: paddle strokes, chela grasp, proboscis probing, abdomen follow-through."""
import numpy as np
from math import sin,cos,pi

def animate(bpy,scene,rig,obj,CLIPS,LOOPS,reset):
 seams={};bounds={};metrics={}
 def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
 def pulse(u,a,b,c):return ease((u-a)/(b-a))*(1-ease((u-b)/(c-b)))if a<u<c else 0
 for clip,duration in CLIPS.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;last=round(duration*30);states=[]
  for f in range(last+1):
   reset();u=f/last;p=2*pi*u;env=1 if clip in LOOPS else sin(pi*u)**2;pb=rig.pose.bones;e=sin(pi*u)**2;dead=ease(u/.78)if clip=='Death'else 0;wind=pulse(u,0,.22,.44);peak=pulse(u,.18,.43,.69);rec=pulse(u,.5,.72,1);amp={'Idle':.14,'Swim':1.,'TurnLeft':.65,'TurnRight':.65,'Dive':.48,'Rise':.5,'Attack':.6,'Bite':.3,'Heavy':.7,'Hit':.35,'Death':.1,'Guard':.2,'Parry':.65,'Dodge':1.2,'Eat':.15,'Stagger':.6,'Ability':.6,'Moult':.25,'Grab':.32}[clip];phase=p+.16*sin(p)if clip=='Swim'else p
   wave=lambda lag:sin(phase-lag)*env*(1-dead);turn=-1 if clip=='TurnLeft'else 1 if clip=='TurnRight'else 0
   b=pb['body'];b.rotation_euler.x=.023*amp*wave(.7);b.rotation_euler.y=.035*amp*wave(.2);b.rotation_euler.z=.022*amp*wave(1);b.location.z=.023*amp*wave(.4)
   b.rotation_euler.z+=turn*.25*e;b.rotation_euler.y+=turn*.09*e
   if clip in ['Dive','Rise']:s=1 if clip=='Dive'else-1;b.rotation_euler.x+=s*.18*e;b.location.z-=s*.11*e
   if clip in ['Attack','Heavy']:b.location.y+=(.12 if clip=='Heavy'else .08)*wind-(.22 if clip=='Heavy'else .15)*peak;b.rotation_euler.z+=.10*wind-.12*peak+.035*rec
   if clip=='Dodge':b.location.x=.27*peak;b.rotation_euler.z=-.25*peak;b.rotation_euler.y=.18*e
   if clip=='Parry':b.rotation_euler.z=.18*peak;b.location.x=.07*e
   if clip=='Hit':b.rotation_euler.y=.20*pulse(u,0,.24,.98);b.location.y=.10*pulse(u,0,.24,.98)
   if clip=='Stagger':b.rotation_euler.y=.16*sin(2*p+.2)*e;b.rotation_euler.z=.12*sin(2*p)*e;b.location.z=-.07*e
   if clip=='Moult':b.location.z=.09*e;b.rotation_euler.x=-.065*e
   if clip=='Ability':b.location.z=.075*e;b.rotation_euler.z=.10*sin(p)*e
   b.rotation_euler.y+=.72*dead;b.location.z-=.11*dead
   for k in range(1,4):pb['trunk'+str(k)].rotation_euler.x=.007*amp*wave(k*.6);pb['trunk'+str(k)].rotation_euler.z=.009*amp*wave(k*.5)
   for k in range(5):
    q=pb['abdomen'+str(k)];q.rotation_euler.x=.055*amp*wave(.8+k*.65)+.06*dead+(.08*e if clip=='Moult'else 0);q.rotation_euler.z=.035*amp*wave(1.2+k*.8)+turn*.06*e
    if clip=='Dodge':q.rotation_euler.z+=.08*e
   for pair in range(4):
    for side in [-1,1]:
     tag='WL'+str(pair+1)+('L'if side>0 else'R');num=9 if pair==0 else 10;lag=pair*.9+(.65 if side<0 else 0);stroke=wave(lag);recovery=wave(lag+.8);brace=.07*(1-cos(p))if clip=='Guard'else .10*e if clip=='Ability'else 0
     for j in range(num):
      q=pb[tag+'_'+str(j)];m=.11 if j==0 else .07 if j<4 else .075 if j<num-1 else .035
      q.rotation_euler.z=side*m*amp*wave(lag+j*.33);q.rotation_euler.x=m*.75*amp*wave(lag+.8+j*.35)
      if j==0:q.rotation_euler.z+=side*(brace+turn*(.09 if side==turn else-.06)*e);q.rotation_euler.x+=.09*dead
      if 4<=j<num-1:q.rotation_euler.y=.09*amp*wave(lag+j*.37)+.11*dead
      if j==3:q.rotation_euler.x+=.13*dead
      if clip in ['Attack','Heavy']and pair==0:q.rotation_euler.z+=side*(.055*wind-.08*peak+.022*rec);q.rotation_euler.x+=.035*wind-.055*peak
      if clip=='Parry'and pair==0:q.rotation_euler.z+=side*.075*peak
      if clip=='Dodge'and j<2:q.rotation_euler.z+=side*(.11 if side>0 else-.055)*e
      if clip=='Moult':q.rotation_euler.z-=side*.033*e;q.rotation_euler.x-=.022*e
   grasp=0;probe=.025*(1-cos(2*p))*env*(1-dead)
   if clip=='Eat':grasp=.23*(1-cos(p));probe=.30*(1-cos(p))
   if clip=='Grab':grasp=.58*pulse(u,.03,.35,.93);probe=.16*pulse(u,.17,.58,.96)
   if clip=='Bite':grasp=.45*pulse(u,.02,.40,.80);probe=.20*peak
   if clip=='Attack':grasp=.50*peak;probe=.35*peak
   if clip=='Heavy':grasp=.65*peak;probe=.50*peak
   if clip=='Ability':grasp=.17*e;probe=.88*pulse(u,.10,.54,.95)
   if clip=='Guard':grasp=.065*(1-cos(p))
   pb['proboscis'].rotation_euler.x=-probe;pb['oralTip'].rotation_euler.x=.055*(1-cos(2*p))*env*(1-dead)
   for side in [-1,1]:
    s='L'if side>0 else'R';pb['scape1'+s].rotation_euler.z=side*(.065*amp*wave(side*.4)+.12*wind if clip in ['Attack','Heavy']else .045*amp*wave(side*.4));pb['scape2'+s].rotation_euler.z=side*(-.07*grasp+.04*wave(1+side*.3)*amp);pb['chela'+s].rotation_euler.z=-side*.12*grasp;pb['finger'+s].rotation_euler.z=side*(grasp+.065*dead)
    for ov in [False,True]:
     tag=('oviger'if ov else'palp')+s
     for j in range(11 if ov else 9):
      q=pb[tag+str(j)];q.rotation_euler.z=side*(.025*wave(j*.35+side*.6)*amp+.018*grasp);q.rotation_euler.x=.025*wave(j*.45+.4)*amp+(.03*probe if ov else 0)+.025*dead
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
