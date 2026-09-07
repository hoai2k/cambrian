"""Restrained dipnoan feeding and buoyant, lobed-fin motion; no gameplay claims."""
for sign,side in [(1,'L'),(-1,'R')]:
 g=head.vertex_groups.new(name='gill'+side)
 for i,v in enumerate(head.data.vertices):
  if sign*v.co.x<=0:continue
  w=.40*np.clip((v.co.y+1.01)/.28,0,1)*np.clip(abs(v.co.x)/.38,0,1)**4
  if w>0:g.add([i],float(w),'REPLACE');head.vertex_groups['skull'].add([i],1-float(w),'REPLACE')
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.7,'TurnRight':1.7,'Dive':1.6,'Rise':1.6,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5};loops=['Idle','Swim','Guard','Eat']
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def pulse(t,a,b,c):return smooth((t-a)/(b-a))if t<=b else 1-smooth((t-b)/(c-b))
for name,duration in clips.items():
 a=bpy.data.actions.new(name);a.use_fake_user=True;rig.animation_data.action=a;frames=round(duration*30)
 for frame in range(frames+1):
  t=frame/frames;phase=2*pi*t;env=sin(pi*t)**2
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def move(x=0,y=0,z=0):rig.pose.bones['body'].location=(x,y,z)
  def wave(amount,cycles=1):
   for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=amount*(.32+.15*i)*sin(phase*cycles-.57*i),x=.017*amount*sin(phase*cycles-.9*i))
   rot('dorsal',z=.14*amount*sin(phase*cycles-.85));rot('dorsal2',z=.20*amount*sin(phase*cycles-1.52));rot('anal',z=-.17*amount*sin(phase*cycles-1.83))
  def fins(amount,cycles=1):
   for side,sg in [('L',1),('R',-1)]:
    p=phase*cycles+.35*sg
    rot('pectoral'+side,x=.05*amount*sin(p),y=sg*.13*amount*sin(p),z=sg*.09*amount*sin(p-.25))
    rot('pectoralTip'+side,y=sg*.11*amount*sin(p-.70),z=sg*.07*amount*sin(p-.95))
    rot('pelvic'+side,x=.025*amount*sin(p-1.05),y=sg*.07*amount*sin(p-1.2),z=sg*.045*amount*sin(p-1.5))
  def oral(gape,pump=0,grind=0):
   # 0.26rad (14.9deg) jaw rotation respects the ~16deg osteological estimate.
   rot('jaw',x=min(.26,max(0,gape)),z=.012*grind);rot('throat',x=.065*pump)
   rig.pose.bones['throat'].location.z=-.012*pump
   rot('gillL',z=.045*pump);rot('gillR',z=-.045*pump)
  if name=='Idle':
   wave(.04);fins(.28);oral(.011*(1-cos(phase*2)),.20*(1-cos(phase*2)));rot('body',y=.006*sin(phase));move(z=.010*sin(phase))
  elif name=='Swim':
   wave(.215,2);fins(.80,2);oral(.012*(1-cos(phase*2)),.17*(1-cos(phase*2)));rot('body',z=-.023*sin(phase*2+.3),y=.02*sin(phase*2-.3));move(z=.012*sin(phase*4))
  elif name=='Guard':
   wave(.058);fins(.35);oral(.024*(1-cos(phase)),.23*(1-cos(phase)))
   for side,sg in [('L',1),('R',-1)]:rot('pectoral'+side,y=sg*(.18+.023*sin(phase)),z=sg*.12);rot('pectoralTip'+side,y=-sg*.08+.035*sin(phase-.7))
   rot('body',x=-.028,y=.009*sin(phase));move(z=.006*sin(phase))
  elif name=='Eat':
   wave(.035);fins(.22);first=pulse(t,.03,.17,.37);second=pulse(t,.48,.63,.86);grind=sin(phase*4)*pulse(t,.18,.49,.84)
   oral(.12*first+.085*second,.55*pulse(t,.20,.37,.52)+.42*pulse(t,.65,.79,.96),grind);rot('body',x=.021*(1-cos(phase)));move(z=-.006*(1-cos(phase)))
  elif name=='Death':
   settle=smooth((t-.08)/.71);late=smooth((t-.50)/.38);wave(.17*max(0,1-t/.62)**2,3)
   rot('body',y=-1.06*settle,x=.025*settle,z=-.065*late);move(z=-.16*settle);oral(.095*settle)
   for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=-.055*(i+1)*settle+.17*sin(phase*3-i*.7)*max(0,1-t/.61)**2)
   rot('pectoralL',y=.24*settle,z=.14*settle);rot('pectoralR',y=-.055*settle,z=-.13*settle);rot('pectoralTipL',y=.12*late);rot('pelvicL',y=.13*late);rot('dorsal',z=.13*late);rot('dorsal2',z=.19*late)
  else:
   wave(.09*env,2);fins(.45*env,2)
   if name in ['TurnLeft','TurnRight']:
    sg=1 if name=='TurnLeft'else -1;prepare=pulse(t,0,.16,.36);bank=pulse(t,.12,.47,.91);recover=pulse(t,.38,.74,1)
    rot('body',z=sg*(.32*bank-.04*prepare),y=sg*.20*bank);move(x=sg*.09*bank)
    for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=-sg*(.13+.025*i)*pulse(t,.09+i*.04,.34+i*.07,.73+i*.055))
    for side,sgn in [('L',1),('R',-1)]:rot('pectoral'+side,y=sgn*.14*bank,z=sgn*.08*bank+sg*.13*bank);rot('pectoralTip'+side,y=sg*.10*recover);rot('pelvic'+side,y=-sg*.07*recover)
   elif name in ['Dive','Rise']:
    sg=1 if name=='Dive'else-1;load=pulse(t,0,.18,.4);pitch=pulse(t,.15,.53,.94);late=pulse(t,.36,.76,1);rot('body',x=sg*(.25*pitch-.04*load));move(z=-sg*.10*pitch)
    for side,sgn in [('L',1),('R',-1)]:rot('pectoral'+side,x=sg*.14*pitch,y=sgn*.12*load);rot('pectoralTip'+side,x=sg*.10*late);rot('pelvic'+side,x=-sg*.065*late)
    rot('tail0',x=-sg*.065*late);rot('caudal',x=sg*.07*late)
   elif name in ['Attack','Bite','Heavy']:
    load=pulse(t,0,.20,.42);approach=pulse(t,.24,.50,.79);gape=pulse(t,.12,.36,.64);process=pulse(t,.52,.73,.95);short=name=='Bite';heavy=name=='Heavy'
    oral((.24 if heavy else .18 if short else .22)*gape,.65*process,.60*sin(phase*3)*process if heavy else .18*process)
    move(y=(.025 if short else .06)*load-(.035 if short else .14)*approach,z=-.018*approach);rot('body',x=-.026*load+.035*approach,y=.028*process)
    wave(.16*approach,2)
    for side,sg in [('L',1),('R',-1)]:rot('pectoral'+side,y=sg*.18*load,z=sg*(.11*load-.055*approach));rot('pectoralTip'+side,y=-sg*.12*process);rot('pelvic'+side,y=sg*.08*process)
   elif name=='Hit':
    shock=pulse(t,0,.14,.43);balance=pulse(t,.19,.54,.95);rot('body',y=-.20*shock+.055*balance,z=.14*shock-.045*balance);move(x=-.045*shock,z=-.027*shock);oral(.09*shock);rot('tail0',z=-.20*shock);rot('tail2',z=.25*balance);rot('pectoralL',y=.26*shock);rot('pectoralTipL',y=-.17*balance)
   elif name=='Stagger':
    a=pulse(t,0,.16,.44);b=pulse(t,.26,.49,.79);c=pulse(t,.62,.82,1);rot('body',y=-.23*a+.15*b-.04*c,z=.12*a-.08*b);move(x=-.05*a+.025*b,z=-.03*(a+b));oral(.08*b);rot('tail0',z=-.23*a+.20*b);rot('tail2',z=.27*a-.30*b+.10*c);rot('pectoralL',y=.22*a);rot('pectoralR',y=-.20*b)
   elif name=='Dodge':
    load=pulse(t,0,.20,.4);drive=pulse(t,.18,.50,.83);follow=pulse(t,.4,.72,1);rot('body',z=-.29*drive+.065*load,y=.26*drive);move(x=-.19*drive,z=.025*drive);rot('tail0',z=-.30*load+.28*drive);rot('tail1',z=-.26*load+.32*drive);rot('tail2',z=.24*load-.34*follow);rot('tail3',z=-.29*follow);rot('caudal',z=.27*follow);rot('pectoralL',y=.18*drive,z=.11*drive);rot('pectoralTipL',y=-.16*follow);rot('pectoralR',z=-.16*load)
   elif name=='Parry':
    a=pulse(t,0,.28,.68);b=pulse(t,.34,.70,1);rot('body',y=-.25*a,z=.16*a-.045*b);move(x=-.065*a);rot('tail0',z=-.20*a);rot('tail2',z=.25*b);rot('pectoralL',y=.24*a,z=.17*a);rot('pectoralTipL',y=-.16*b)
   elif name=='Ability':
    rise=pulse(t,.02,.30,.71);gulp=pulse(t,.29,.46,.62);pump=pulse(t,.43,.61,.79);recover=pulse(t,.67,.83,1);rot('body',x=-.15*rise+.02*recover);move(z=.07*rise);oral(.25*gulp,pump);wave(.085*env,2)
    for side,sg in [('L',1),('R',-1)]:rot('pectoral'+side,y=sg*.24*rise,z=sg*.14*rise,x=-.08*rise);rot('pectoralTip'+side,y=-sg*.12*pump);rot('pelvic'+side,y=sg*.12*pump)
   elif name=='Growth':
    stretch=pulse(t,0,.43,1);later=pulse(t,.23,.62,1);rot('body',x=-.038*stretch);move(z=.018*stretch);oral(.12*pulse(t,.12,.41,.78),.5*later)
    for side,sg in [('L',1),('R',-1)]:rot('pectoral'+side,y=sg*.25*stretch,z=sg*.13*stretch);rot('pectoralTip'+side,y=sg*.13*later);rot('pelvic'+side,y=sg*.17*later)
    rot('dorsal',z=.065*later);rot('dorsal2',z=-.07*later)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert('rotation_euler',frame=frame+1,group=pb.name)
   if pb.name in ['body','throat']:pb.keyframe_insert('location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
s.frame_set(1);bpy.context.view_layer.update()
