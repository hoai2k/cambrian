"""Five-arm coordination. All movement is local to disc/arm joints; root never moves."""
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def pulse(t,a,b,c):return ease((t-a)/(b-a))if t<=b else 1-ease((t-b)/(c-b))
for clip,F in CLIPS.items():
 act=bpy.data.actions.new(clip);act.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=act
 for fr in range(F+1):
  t=fr/F;ph=2*pi*t;en=sin(pi*t)**2;walk=0;feed=0;brace=0;curl=0;flick=0;asym=0;phase=ph;lift=0;die=0
  for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
  body=rig.pose.bones['body']
  if clip=='Idle':flick=.06;body.location.z=.004*(1-cos(ph))
  elif clip=='Crawl':walk=1;phase=ph*2+.16*sin(ph*2);body.location.z=.014*(1-cos(ph*4));body.rotation_euler.z=.018*sin(ph*2);flick=.12
  elif clip=='Swim':walk=.66;phase=ph*2+.25*sin(ph*2);lift=.35;flick=.23;body.rotation_euler.x=.025*sin(ph);body.location.z=.022*(1-cos(ph*2))
  elif clip in ['TurnLeft','TurnRight']:
   q=pulse(t,0,.4,1);asym=1 if clip=='TurnLeft'else-1;body.rotation_euler.z=asym*.27*q;walk=.85*en;phase=ph*2;flick=.18*en;asym*=q
  elif clip in ['Dive','Rise']:
   q=pulse(t,0,.46,1);sg=1 if clip=='Dive'else-1;body.location.z=-sg*.085*q;lift=sg*.35*q;curl=.12*q;flick=.14*en
  elif clip=='Attack':
   rec=pulse(t,0,.19,.43);contact=pulse(t,.20,.47,.93);body.location.y=.05*rec-.10*contact;brace=.55*rec;flick=.30*en;curl=.26*contact;feed=.45*contact
  elif clip=='Bite':feed=pulse(t,.02,.31,.82);brace=.22*en;curl=.10*en
  elif clip=='Heavy':
   rec=pulse(t,0,.22,.49);contact=pulse(t,.25,.52,.97);body.location.z=.026*rec-.035*contact;body.location.y=.075*rec-.13*contact;brace=.72*rec+.2*contact;curl=.52*contact;flick=.30*en;feed=.4*contact
  elif clip=='Eat':feed=(.5-.5*cos(ph*3))**1.2;curl=.18*(.5-.5*cos(ph));flick=.10;body.location.z=-.012*(1-cos(ph))
  elif clip=='Guard':brace=.42*(.5-.5*cos(ph));curl=.25*(.5-.5*cos(ph));flick=.07
  elif clip=='Parry':q=pulse(t,0,.25,1);brace=.65*q;asym=.8*q;flick=.32*en;body.rotation_euler.z=-.09*q
  elif clip=='Dodge':q=pulse(t,0,.3,1);walk=1.25*en;phase=ph*2.4;asym=-.9*q;body.location.x=.16*q;body.rotation_euler.z=-.14*q;flick=.33*en
  elif clip=='Hit':q=pulse(t,0,.20,.86);body.location.y=.09*q;body.rotation_euler.x=.05*sin(ph*2)*en;curl=.27*q;flick=.25*en
  elif clip=='Stagger':walk=.5*en;phase=ph*2.7;asym=.8*sin(ph)*en;body.rotation_euler.z=.1*sin(ph*2)*en;body.location.z=-.025*en;flick=.3*en
  elif clip=='Ability':q=pulse(t,.03,.45,.98);curl=.55*q;lift=.17*q;brace=.25*q;flick=.16*en;body.location.z=.025*q
  elif clip=='Growth':q=pulse(t,0,.45,1);curl=-.12*q;lift=-.10*q;flick=.14*en;body.location.z=.025*q
  elif clip=='Death':die=ease(t/.85);curl=.62*die;lift=.18*die;flick=.24*en*(1-die);body.location.z=-.055*die;body.rotation_euler.x=.13*die
  for a in range(5):
   # Arm0 leads; anterior lateral pair1/4 supplies power; posterior2/3 stabilizes with delayed recovery.
   side=1 if a in [1,2]else-1;lead=.26 if a==0 else 1 if a in [1,4]else .72;offset=0 if a in [1,4]else pi*.65 if a in [2,3]else pi
   for j in range(NSEG):
    u=j/(NSEG-1);pb=rig.pose.bones[f'arm_{a}_{j:02d}'];wave=phase-u*3.7+offset;eff=walk*lead*(1+side*asym*.30)
    lateral=side*.070*sin(wave)*eff*(.65+.35*u)
    if j==0:lateral+=side*.16*sin(phase+offset)*eff
    lateral+=side*curl*.073*(.38+.62*sin(pi*u))
    lateral+=flick*.018*sin(ph*2-u*6+a*.9)*u*u
    # Feeding gathers leading tips; other arms brace independently.
    if a in [0,1,4]:lateral+=side*feed*.026*u
    pb.rotation_euler.z=lateral
    pb.rotation_euler.x=.021*max(0,sin(wave))*eff*(1-u)+lift*.034*sin(pi*u)+brace*.028*(1-u)
    if j==0:pb.rotation_euler.x-=lift*.20+brace*.07
    if clip=='Swim':pb.rotation_euler.x+=.030*sin(phase-u*4+a*1.07)*sin(pi*u)
    if die:pb.rotation_euler.z+=.035*die*sin(a*1.2+u*4);pb.rotation_euler.x+=.008*die*sin(u*pi)
  for a in range(5):
   pb=rig.pose.bones[f'oral_angle_{a}'];pb.rotation_euler.z=.07*feed*sin(ph*3+a*.7);pb.rotation_euler.x=.08*feed
  rig.pose.bones['oral_pump'].location.z=.006*feed
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=fr+1,group=pb.name)
   if pb.name in ['body','oral_pump']:pb.keyframe_insert(data_path='location',frame=fr+1,group=pb.name)
