"""Distinct in-place eurypterid gestures; rigid podomeres with delayed distal response."""
clips={'Idle':2.4,'Swim':2.4,'Crawl':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.2,'Rise':1.2,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Moult':1.5,'Grab':1.2};loops=['Idle','Swim','Crawl','Guard','Eat']
def smooth(q):q=np.clip(q,0,1);return q*q*(3-2*q)
def pulse(t,a,b,c):return float(smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b))))
def pose(name,t):
 out={n:np.zeros(3)for n,_,_ in spec};loc=np.zeros(3);w=2*pi*t
 def rot(b,x=0,y=0,z=0):out[b]+=np.array([x,y,z])
 effort=pulse(t,.14,.40,.90);anticipate=pulse(t,0,.15,.33);after=pulse(t,.39,.59,1)
 if name in ['Idle','Swim','Crawl','Guard','Eat']:
  swim=1 if name=='Swim'else .10;rot('body',.012*sin(w),.009*sin(w),.014*sin(w));loc[2]=(.018 if name=='Swim'else .008)*sin(w)
  for i in range(12):rot('segment%02d'%i,.012*swim*sin(w-i*.28),0,.024*swim*sin(w-i*.25))
  for sign,q in [(1,'L'),(-1,'R')]:
   lag=.13*sign;ph=w+lag
   for j in range(4):
    phase=w+pi*(j%2)+(0 if sign==1 else pi);strength=.19 if name=='Crawl'else .025
    rot('leg'+q+str(j)+'_0',.012*sin(phase),.018*sin(phase),sign*strength*sin(phase));rot('leg'+q+str(j)+'_1',.02*sin(phase),sign*strength*.70*sin(phase-.6));rot('leg'+q+str(j)+'_2',-.04*max(0,sin(phase)),sign*strength*.50*sin(phase-1))
   for j in range(3):rot('paddle'+q+str(j),.04*swim*sin(ph-j*.3),sign*.14*swim*sin(ph-j*.3),sign*(.26 if j==0 else .18)*swim*sin(ph-j*.42))
   rot('chelicera'+q+'0',.01*sin(ph),0,sign*.016*sin(ph));rot('chelicera'+q+'1',0,.012*sin(ph-.3),sign*.012*sin(ph-.4));rot('finger'+q,0,0,sign*.018*sin(ph-.7))
   if name=='Guard':rot('chelicera'+q+'0',-.05,0,sign*.075);rot('chelicera'+q+'1',-.04,0,-sign*.06);rot('finger'+q,0,0,-sign*(.08+.025*sin(w)))
   if name=='Eat':
    rot('chelicera'+q+'0',-.12,0,-sign*.045);rot('chelicera'+q+'1',.08,0,sign*.10);rot('finger'+q,0,0,sign*.035*sin(w*2+sign*.4));rot('gnathobase'+q,0,.045*sin(w*3+sign*.7),sign*.08*sin(w*3+sign*.7))
 elif name in ['TurnLeft','TurnRight']:
  sign=1 if name=='TurnLeft'else-1;rot('body',-.025*effort,.04*sign*effort,-.10*sign*effort)
  for i in range(12):rot('segment%02d'%i,.012*effort,0,sign*.036*pulse(t,.12+i*.014,.45+i*.012,.94))
  rot('paddleL0',0,.08*effort,-.30*sign*effort);rot('paddleR0',0,-.08*effort,-.30*sign*effort);rot('telson',0,.10*sign*effort,.15*sign*after)
 elif name in ['Dive','Rise']:
  sign=1 if name=='Rise'else-1;rot('body',sign*.105*effort);loc[2]=sign*.035*effort
  for q,sig in [('L',1),('R',-1)]:rot('paddle'+q+'0',-.15*sign*effort,0,sig*.22*after);rot('paddle'+q+'2',.18*sign*effort)
  for i in range(12):rot('segment%02d'%i,-sign*.014*after)
 elif name in ['Attack','Heavy','Grab','Bite','Ability']:
  power={'Attack':1,'Heavy':1.35,'Grab':.8,'Bite':.38,'Ability':.85}[name];peak=.33 if name=='Bite'else .43;effort=pulse(t,.19,peak,.84);after=pulse(t,peak,.66,1)
  rot('body',-.035*power*anticipate+.045*power*effort,0,.025*effort if name=='Attack'else 0);loc[1]=-.065*power*effort
  for sig,q in [(1,'L'),(-1,'R')]:
   delay=.035 if q=='R'else 0;e=pulse(t,.18+delay,peak+delay,.87);a=pulse(t,.03,.18,.38)
   rot('chelicera'+q+'0',-.065*power*a+.055*power*e,0,sig*(.06*power*a-.025*e));rot('chelicera'+q+'1',.045*e,0,sig*(-.06*power*a+.075*e));rot('chelicera'+q+'2',-.025*after,0,sig*.03*e)
   rot('finger'+q,0,0,sig*(-.19*a+.065*e-.025*after));rot('gnathobase'+q,0,sig*.022*after,sig*.075*after)
   rot('paddle'+q+'0',.07*power*after,0,sig*.14*power*effort);rot('paddle'+q+'2',-.11*after)
   for j in range(4):rot('leg'+q+str(j)+'_0',0,sig*.03*effort,sig*(.04*j-.06)*effort);rot('leg'+q+str(j)+'_2',.035*effort)
  for i in range(12):rot('segment%02d'%i,-.009*power*after,0,.006*sin(i*.5)*after)
  if name=='Ability':
   for sig,q in [(1,'L'),(-1,'R')]:rot('chelicera'+q+'0',-.10*effort,0,sig*.15*effort);rot('finger'+q,0,0,-sig*.18*effort)
 elif name in ['Hit','Stagger','Parry','Dodge']:
  e=pulse(t,.02,.24,.86);recoil=sin(pi*t*4)*(1-t)**2
  rot('body',-.065*e,.08*e,.07*e if name!='Dodge'else -.10*e);loc[0]=.07*e if name=='Dodge'else 0
  for i in range(12):rot('segment%02d'%i,.009*recoil,0,-.018*e)
  for sig,q in [(1,'L'),(-1,'R')]:
   rot('chelicera'+q+'0',-.05*e,0,sig*.11*e);rot('chelicera'+q+'1',.06*e,0,-sig*.04*e);rot('finger'+q,0,0,-sig*.08*e);rot('paddle'+q+'0',0,sig*.12*e,sig*.24*e)
   for j in range(4):rot('leg'+q+str(j)+'_0',.02*recoil,0,sig*.08*e);rot('leg'+q+str(j)+'_2',0,sig*.06*e)
  if name=='Parry':rot('cheliceraL0',-.10*e,0,.12*e)
  if name=='Stagger':rot('body',.05*recoil,0,.03*recoil)
 elif name=='Moult':
  e=pulse(t,.05,.42,.94);rot('body',-.025*e)
  for i in range(12):rot('segment%02d'%i,.022*pulse(t,.05+i*.016,.39+i*.015,.96))
  for sig,q in [(1,'L'),(-1,'R')]:
   rot('chelicera'+q+'0',-.07*e,0,sig*.05*e)
   for j in range(4):rot('leg'+q+str(j)+'_0',0,sig*.08*e,sig*.06*e);rot('leg'+q+str(j)+'_2',-.06*e)
 elif name=='Death':
  e=float(smooth(t/.74));rot('body',.018*e,.23*e,-.025*e);loc[2]=-.11*e
  for i in range(12):rot('segment%02d'%i,.015*e,0,.020*e)
  for sig,q in [(1,'L'),(-1,'R')]:
   rot('chelicera'+q+'0',.08*e,0,-sig*.045*e);rot('finger'+q,0,0,-sig*.16*e);rot('paddle'+q+'0',0,sig*.14*e,sig*.11*e)
   for j in range(4):rot('leg'+q+str(j)+'_1',.025*e,sig*.18*e);rot('leg'+q+str(j)+'_2',.04*e,sig*.22*e)
 return out,loc
rig.animation_data_create()
for name,dur in clips.items():
 a=bpy.data.actions.new(name);rig.animation_data.action=a;N=round(dur*30)
 for frame in range(N+1):
  out,loc=pose(name,frame/N)
  for b in rig.pose.bones:
   b.rotation_mode='XYZ';b.rotation_euler=out[b.name];b.location=loc if b.name=='body'else(0,0,0)
   if b.name!='root':b.keyframe_insert('rotation_euler',frame=frame)
   if b.name=='body':b.keyframe_insert('location',frame=frame)
 for fc in a.fcurves if hasattr(a,'fcurves')else []:
  for kp in fc.keyframe_points:kp.interpolation='LINEAR'
rig.animation_data.action=bpy.data.actions['Idle'];s.frame_set(0)
