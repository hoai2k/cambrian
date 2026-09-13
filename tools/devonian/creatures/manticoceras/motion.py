"""Species-specific rigid-shell jetting and lagged soft-arm motion, no scale/root motion."""
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.2,'Rise':1.2,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Growth':1.5,'Grab':1.2};loops=['Idle','Swim','Guard','Eat']
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def bump(t,a,b,c):return smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b)))
def burst(t,peak=.4):return bump(t,.03,peak,1.)-.22*bump(t,0,.10,.22)
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);rig.animation_data.action=action;frames=round(duration*30)
 for frame in range(frames+1):
  t=frame/frames;s.frame_set(frame)
  for bone in rig.pose.bones:bone.rotation_mode='XYZ';bone.rotation_euler=(0,0,0);bone.location=(0,0,0)
  loop=name in loops;travel=0;pitch=0;yaw=0;roll=0;curl=0;spread=0;beak=0;jet=0;retract=0;flutter=.008
  if name=='Idle':jet=.16*(.5-.5*cos(4*pi*t));flutter=.035
  elif name=='Swim':jet=(.5-.5*cos(4*pi*t))**3;pitch=.035*sin(4*pi*t-.4)-.035*sin(-.4);retract=.019*jet;curl=.10*jet;flutter=.035
  elif name in ['TurnLeft','TurnRight']:
   sign=1 if name=='TurnLeft'else-1;e=burst(t,.43);yaw=sign*.17*e;roll=sign*.045*e;jet=.6*bump(t,.13,.39,.80);spread=sign*.14*e;flutter=.022*bump(t,0,.5,1)
  elif name in ['Dive','Rise']:
   sign=-1 if name=='Dive'else 1;e=burst(t,.4);pitch=sign*.20*e;jet=.8*bump(t,.16,.40,.84);curl=.1*e;retract=.015*e
  elif name=='Attack':e=burst(t,.43);pitch=-.065*e;spread=.20*e;curl=-.20*e;beak=.16*bump(t,.32,.49,.70);jet=.5*bump(t,.16,.36,.65);retract=-.025*e
  elif name=='Bite':e=burst(t,.34);beak=.29*max(0,e);curl=.15*bump(t,.25,.48,.85);retract=-.012*e
  elif name=='Heavy':e=burst(t,.47);pitch=-.11*e;jet=bump(t,.17,.44,.80);curl=.32*e;beak=.23*bump(t,.40,.56,.80);retract=.035*e
  elif name=='Hit':e=burst(t,.20);roll=.12*e;pitch=.08*e;retract=.08*max(0,e);curl=.27*e
  elif name=='Death':
   e=smooth(t/.77);pitch=.26*e;roll=.16*e;retract=.045*e;curl=.33*e;beak=.045*e;flutter=.05*(1-e)
  elif name=='Guard':e=.92+.08*cos(2*pi*t);retract=.085*e;curl=.30*e;jet=.1*(1-cos(2*pi*t));flutter=.008
  elif name=='Parry':e=burst(t,.35);roll=-.09*e;retract=.06*e;curl=.39*e;jet=.24*max(0,e)
  elif name=='Dodge':e=burst(t,.31);yaw=-.12*e;roll=.10*e;jet=max(0,e);curl=.36*e;retract=.06*e
  elif name=='Eat':beak=.13*(.5-.5*cos(6*pi*t));curl=.11+.045*sin(2*pi*t);flutter=.025;jet=.1*(.5-.5*cos(2*pi*t))
  elif name=='Stagger':e=burst(t,.23);roll=.10*e+.04*sin(5*pi*t)*sin(pi*t)**2;pitch=-.06*e;curl=.16*e;retract=.05*e
  elif name=='Ability':e=burst(t,.47);jet=bump(t,.07,.25,.46)+.8*bump(t,.43,.62,.89);curl=.22*jet;retract=.045*jet;pitch=.055*e;flutter=.045*sin(pi*t)**2
  elif name=='Growth':e=bump(t,0,.47,1);spread=.22*e;curl=-.12*e;retract=-.025*e;jet=.18*e;flutter=.025*sin(pi*t)**2
  elif name=='Grab':e=burst(t,.51);spread=-.11*e;curl=.43*e;beak=.09*bump(t,.45,.65,.86);retract=-.018*e
  body=rig.pose.bones['body'];body.rotation_euler=(pitch,roll,yaw)
  head=rig.pose.bones['head'];head.location=(0,retract,-.22*retract)
  rig.pose.bones['funnel'].rotation_euler=(.07*jet,0,-yaw*.7)
  rig.pose.bones['funnelTip'].rotation_euler=(-.15*jet,0,-yaw*.45)
  for sign in [1,-1]:rig.pose.bones['mantle'+('L'if sign==1 else'R')].rotation_euler=(0,sign*.045*jet,sign*.020*jet)
  rig.pose.bones['beak_upper'].rotation_euler=(beak*.50,0,0);rig.pose.bones['beak_lower'].rotation_euler=(-beak,0,0)
  for j in range(10):
   a=2*pi*j/10+.12
   for k in range(4):
    bn=rig.pose.bones['arm'+str(j)+'_'+str(k)];phase=2*pi*t-(j*.42+k*.60);wave=flutter*sin(phase)
    if not loop:wave*=sin(pi*t)**2 if name!='Death'else sin(pi*min(1,t/.77))**2*(1-smooth(t/.77))
    # Independent chain lag, radial inward grasping, tentacle-tip recovery.
    e=curl*(.35+.23*k);out=spread*(1 if cos(a)>0 else-1)*(.40+.18*k)
    twist=.012*sin(phase+.5)*sin(pi*t)**2*(1-smooth(t/.77)if name=='Death'else 1)
    bn.rotation_euler=(sin(a)*e+wave, twist, cos(a)*e+out+wave*.65)
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_euler',frame=frame);b.keyframe_insert(data_path='location',frame=frame)
 for fc in action.fcurves if hasattr(action,'fcurves')else[]:
  for k in fc.keyframe_points:k.interpolation='LINEAR'
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
rig.animation_data.action=None;s.frame_set(0)
