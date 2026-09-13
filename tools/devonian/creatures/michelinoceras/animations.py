"""Shell-relative arm pursuit, retraction and funnel pulse actions; no shell deformation."""
CLIPS={'Idle':72,'Swim':72,'TurnLeft':48,'TurnRight':48,'Dive':48,'Rise':48,'Attack':30,'Bite':15,'Heavy':33,'Hit':18,'Death':48,'Guard':30,'Parry':12,'Dodge':12,'Eat':42,'Stagger':36,'Ability':72,'Growth':45,'Grab':42}
LOOPS=['Idle','Swim','Guard','Eat']
def bump(t,c,w):return exp(-((t-c)/w)**2)
def envelope(t):return sin(pi*t)**2
for name,F in CLIPS.items():
 act=bpy.data.actions.new(name);act.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=act
 for b in rig.pose.bones:b.rotation_mode='XYZ'
 for fr in range(1,F+2):
  t=(fr-1)/F;E=envelope(t);w=2*pi*t
  for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
  body=rig.pose.bones['body'];head=rig.pose.bones['head'];funnel=rig.pose.bones['funnel'];curl=0;wave=.007;freq=1;spread=0;swirl=0;jaw=0;retract=0
  if name=='Idle':wave=.010;body.rotation_euler.x=.015*sin(w);head.rotation_euler.x=.008*sin(w);funnel.rotation_euler.x=.055*sin(w);retract=.008*(1-cos(w))
  elif name=='Swim':wave=.021;freq=3;curl=.012*(1-cos(3*w));body.location.y=.032*sin(3*w);body.rotation_euler.x=.028*sin(w);funnel.rotation_euler.x=.15*sin(3*w);retract=.022*(1-cos(3*w));head.rotation_euler.x=.02*sin(3*w+.15)*sin(pi*t)
  elif name in ['TurnLeft','TurnRight']:sg=1 if name=='TurnLeft'else-1;body.rotation_euler.z=sg*.17*E;head.rotation_euler.z=sg*.055*E;funnel.rotation_euler.z=-sg*.22*E;swirl=sg*.028*E;wave=.018*E;retract=.017*E
  elif name in ['Dive','Rise']:sg=1 if name=='Rise'else-1;body.rotation_euler.x=sg*.20*E;body.location.z=sg*.055*E;funnel.rotation_euler.x=-sg*.25*E;curl=.018*E;wave=.015*E
  elif name=='Attack':peak=E*(1.4*bump(t,.48,.17)-.48*bump(t,.19,.12));spread=.028*E;curl=-.057*peak;retract=-.032*peak;body.location.y=.085*peak;head.rotation_euler.x=.03*peak;jaw=.23*E*bump(t,.46,.20);wave=.012*E
  elif name=='Bite':jaw=.38*E*bump(t,.38,.30);curl=-.018*E;retract=.018*E;wave=.005*E
  elif name=='Heavy':peak=E*(1.5*bump(t,.53,.18)-.55*bump(t,.17,.13));curl=-.081*peak;spread=.024*E;retract=-.045*peak;body.location.y=.10*peak;body.rotation_euler.x=-.08*peak;jaw=.43*E*bump(t,.51,.20);wave=.015*E
  elif name=='Hit':body.rotation_euler.z=.095*E;body.location.x=.05*E;curl=.029*E;wave=.025*E;retract=.046*E
  elif name=='Death':d=t*t*(3-2*t);body.rotation_euler.z=.24*d;body.rotation_euler.x=-.22*d;head.rotation_euler.x=.095*d;curl=.045*d;swirl=.032*d;retract=.075*d;wave=.015*sin(pi*t);funnel.rotation_euler.x=.22*d;jaw=.1*d
  elif name=='Guard':curl=.015*(1-cos(w));retract=.030*(1-cos(w));wave=.012;funnel.rotation_euler.x=.05*sin(w)
  elif name=='Parry':curl=.053*E;spread=.027*E;body.rotation_euler.z=-.11*E;head.rotation_euler.z=.06*E;retract=.04*E;wave=.01*E
  elif name=='Dodge':peak=E*(1.35*bump(t,.55,.25)-.3*bump(t,.13,.1));body.location.z=.13*peak;body.rotation_euler.x=-.13*peak;curl=.045*E;retract=.06*E;funnel.rotation_euler.x=-.29*peak;wave=.035*E
  elif name=='Eat':jaw=.22*(.5-.5*cos(3*w));curl=-.014*(1-cos(w));retract=.012*(1-cos(2*w));wave=.009;freq=2;swirl=.006*sin(w)
  elif name=='Stagger':body.rotation_euler.z=.105*E*sin(3*w);body.rotation_euler.x=.066*E*sin(2*w);retract=.035*E;curl=.025*E;wave=.023*E;freq=3
  elif name=='Ability':pulse=E*(sin(3*w)**4);funnel.rotation_euler.x=.27*pulse;body.location.z=.105*E;body.rotation_euler.x=-.23*E;retract=.055*pulse;curl=.038*E;wave=.022*E;freq=3
  elif name=='Growth':spread=.035*E;head.rotation_euler.x=.03*E;retract=-.027*E;wave=.017*E;curl=.014*E
  elif name=='Grab':peak=E*(1.35*bump(t,.53,.26)-.40*bump(t,.12,.10));curl=-.09*peak;spread=.025*E;retract=-.020*peak;jaw=.12*E*bump(t,.63,.15);wave=.009*E;swirl=.013*E
  head.location.y=-retract
  for a,(rad,side,pts)in enumerate(ARMS):
   for j in range(NSEG):
    b=rig.pose.bones[f'arm_{a}_{j:02d}'];u=j/(NSEG-1);phase=a*.61-u*3.6;osc=wave*(sin(freq*w+phase)-sin(phase))
    if name not in LOOPS:osc*=E if name!='Death'else sin(pi*t)
    b.rotation_euler.x=(curl*(.35+.8*u)+spread*(1-u)+osc*(.45+.65*u))*(1+.09*cos(a*1.7));b.rotation_euler.z=swirl*(.3+u)+osc*.34*sin(a*1.3)
  rig.pose.bones['beak_upper'].rotation_euler.x=-jaw;rig.pose.bones['beak_lower'].rotation_euler.x=jaw
  for b in rig.pose.bones:
   if b.name=='root':continue
   b.keyframe_insert(data_path='rotation_euler',frame=fr,group=b.name);b.keyframe_insert(data_path='location',frame=fr,group=b.name)
 for fc in act.fcurves if hasattr(act,'fcurves')else[]:
  for p in fc.keyframe_points:p.interpolation='LINEAR'
rig.animation_data.action=bpy.data.actions['Idle'];S.frame_set(1)
