"""Species-specific appendage-led actions. Executed inside the Eldredgeops builder."""
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def pulse(t,a,b,c):return ease((t-a)/(b-a))if t<=b else 1-ease((t-b)/(c-b))
for clip,F in CLIPS.items():
 act=bpy.data.actions.new(clip);act.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=act
 for fr in range(F+1):
  t=fr/F;ph=2*pi*t;en=sin(pi*t)**2;curl=0;feed=0;walk=0;phase=ph*2;lift=0;brace=0;asym=0;antenna=0;bodyz=0;death=0
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  body=rig.pose.bones['body'];headb=rig.pose.bones['cephalon']
  if clip=='Idle':antenna=.065;body.rotation_euler.x=.008*sin(ph);feed=.07*(.5-.5*cos(ph*2))
  elif clip=='Crawl':walk=1;antenna=.14;phase=ph*2+.12*sin(ph*2);bodyz=.012*(1-cos(ph*4));body.rotation_euler.y=.012*sin(ph*2)
  elif clip=='Swim':walk=.82;antenna=.09;phase=ph*3+.30*sin(ph*3);lift=.26;body.rotation_euler.x=.045*sin(ph);bodyz=.018*(1-cos(ph*2))
  elif clip=='Eat':feed=(.5-.5*cos(ph*3))**1.4;antenna=.08;headb.rotation_euler.x=.035*(1-cos(ph));brace=.14*(1-cos(ph))
  elif clip=='Guard':curl=.40*(.5-.5*cos(ph))**.55;brace=.5*curl;antenna=.045*(1-curl)
  elif clip=='Ability':
   curl=ease((t-.08)/.25)*(1-ease((t-.65)/.30));brace=.9*pulse(t,0,.16,.96);antenna=.11*en;bodyz=-.055*curl;body.rotation_euler.x=-.12*curl
  elif clip=='Attack':
   recoil=pulse(t,0,.22,.48);reach=pulse(t,.23,.45,.94);body.location.y=.08*recoil-.20*reach;body.rotation_euler.x=.07*recoil-.05*reach;walk=.8*en;phase=ph*2.2;feed=.65*pulse(t,.25,.48,.76);brace=.35*recoil;antenna=.15*en
  elif clip=='Bite':feed=pulse(t,.02,.33,.78);headb.rotation_euler.x=.045*pulse(t,0,.30,.92);brace=.22*en;antenna=.08*en
  elif clip=='Heavy':
   recoil=pulse(t,.01,.24,.50);press=pulse(t,.27,.52,.98);body.location.y=.11*recoil-.24*press;body.rotation_euler.x=.11*recoil-.10*press;headb.rotation_euler.x=.10*recoil-.045*press;brace=.7*recoil+.3*press;walk=.65*en;phase=ph*2;feed=.8*pulse(t,.31,.56,.82);antenna=.19*en
  elif clip in ['TurnLeft','TurnRight']:
   sign=1 if clip=='TurnLeft'else-1;q=pulse(t,.03,.43,.99);body.rotation_euler.z=sign*.34*q;body.rotation_euler.y=sign*.045*q;asym=sign*.65*q;walk=.9*en;phase=ph*2;antenna=.17*en
  elif clip in ['Dive','Rise']:
   q=pulse(t,.02,.43,.99);sg=1 if clip=='Dive'else-1;bodyz=-sg*.12*q;lift=sg*.24*q;headb.rotation_euler.x=sg*.08*q;brace=.2*q;antenna=.10*en
  elif clip=='Parry':q=pulse(t,0,.25,1);body.rotation_euler.y=-.18*q;headb.rotation_euler.x=.10*q;brace=.9*q;asym=.8*q;antenna=.12*en;body.location.x=-.08*q
  elif clip=='Dodge':q=pulse(t,0,.31,1);body.location.x=.24*q;body.rotation_euler.y=.13*q;body.rotation_euler.z=-.13*q;walk=1.1*en;phase=ph*2.5;asym=-.6*q;antenna=.23*en;bodyz=.035*q
  elif clip=='Hit':q=sin(3*pi*t)*en;body.rotation_euler.x=.10*q;body.rotation_euler.y=.07*en;body.location.y=.075*q;brace=.7*en;antenna=.16*en;headb.rotation_euler.x=.09*pulse(t,0,.2,.8)
  elif clip=='Stagger':q=sin(5*pi*t)*en;body.rotation_euler.y=.15*q;body.rotation_euler.z=.10*sin(ph)*en;bodyz=-.055*en;walk=.62*en;phase=ph*2.8;asym=.8*sin(ph)*en;antenna=.24*en
  elif clip=='Growth':q=pulse(t,.02,.47,.99);bodyz=.045*q;headb.rotation_euler.x=-.075*q;antenna=.13*en;brace=-.15*q;lift=-.12*q
  elif clip=='Moult':q=pulse(t,.02,.50,.99);headb.rotation_euler.x=.16*q;body.rotation_euler.x=-.05*q;bodyz=-.025*q;walk=.55*en;phase=ph*3;antenna=.24*en;brace=.18*q
  elif clip=='Death':
   death=ease(t/.87);curl=.20*death;bodyz=-.24*death;body.rotation_euler.y=.32*death;body.rotation_euler.z=.06*death;walk=.5*en*(1-ease((t-.5)/.25));phase=ph*2.7;lift=.65*death;antenna=.13*en*(1-death)
  body.location.z+=bodyz
  # Head flexion plus compensating first joint lets the thoracic arc and pygidium meet the head margin.
  headb.rotation_euler.x+=curl*.52
  for i in range(11):
   pb=rig.pose.bones[f'thorax_{i+1:02d}'];pb.rotation_euler.x=-curl*(.295+(.52 if i==0 else 0))
   if clip=='Moult':pb.rotation_euler.x+=.019*sin(ph*2-i*.52)*en
  rig.pose.bones['pygidium'].rotation_euler.x=-curl*.02
  for j,side,base,pts,size,pa in limbs:
   phasej=phase-j*.72+(0 if side>0 else pi);swing=max(0,sin(phasej));stance=cos(phasej);effort=walk*(1+side*asym*.35);fold=curl
   for k in range(7):
    pb=rig.pose.bones[base+f'_{k}'];pb.rotation_euler.y=side*(fold*[.15,.25,.90,.60,.45,.10,0][k]+lift*[.32,.20,.40,.13,.22,.07,0][k]+brace*[.06,.02,.14,.09,.11,0,0][k])
    if k==0:pb.rotation_euler.z=side*.24*stance*effort;pb.rotation_euler.y-=side*.24*swing*effort
    if k in [2,4]:pb.rotation_euler.y+=side*(.27 if k==2 else .30)*swing*effort
    if j<3:
     # Coxal inward processing alternates anterior feeding pairs and never moves the hypostome as a jaw.
     fp=feed*(.75+.25*cos(ph*3-j*.95));pb.rotation_euler.z+=side*fp*[.16,.05,0,0,0,0,0][k];pb.rotation_euler.y+=side*fp*[.09,.15,.19,0,0,0,0][k]
    if death:pb.rotation_euler.y+=side*death*[.18,.12,.25,.14,.10,.07,0][k]
   gb=rig.pose.bones[base+'_gill'];gb.rotation_euler.x=.075*sin(ph*2-j*.58)*(1-curl)*(1-death);gb.rotation_euler.y=side*(.28*curl+.06*sin(ph*2-j*.58)*(1-curl)*(1-death))
  for side in [-1,1]:
   ss='L'if side>0 else'R'
   for k in range(4):
    pb=rig.pose.bones[f'antenna_{ss}_{k}'];pb.rotation_euler.x=curl*[2.30,.45,.15,-.40][k]+antenna*sin(ph*2-k*.65+side*.4)+death*.24;pb.rotation_euler.z=-side*.18*curl+side*antenna*.7*sin(ph-k*.76+side*.6)
  rig.pose.bones['oral_pump'].rotation_euler.x=.055*feed
  rig.pose.bones['hypostome'].rotation_euler.x=.012*feed
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=fr+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=fr+1,group=pb.name)
