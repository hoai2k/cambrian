"""Phyllocarid feeding basket, antenna-supported substrate gestures and pleopod strokes."""
clips={'Idle':2.4,'Swim':2.4,'Crawl':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.2,'Rise':1.2,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Moult':1.5};loops=['Idle','Swim','Crawl','Guard','Eat']
def smooth(t):t=np.clip(t,0,1);return t*t*(3-2*t)
def pulse(t,a,b,c):return float(smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b))))
def pose(name,t):
 out={n:np.zeros(3)for n,_,_ in spec};loc=np.zeros(3);w=2*pi*t
 def rot(b,x=0,y=0,z=0):out[b]+=np.array([x,y,z])
 effort=pulse(t,.13,.4,.94);anticipation=pulse(t,0,.15,.34);recovery=pulse(t,.38,.63,1)
 if name in loops:
  strength={'Idle':.18,'Swim':.62,'Crawl':.40,'Guard':.12,'Eat':.75}[name];rot('body',.012*sin(w),.008*sin(w),.009*sin(w));loc[2]=.009*sin(w)
  for j in range(7):rot('abdomen'+str(j),.020*strength*sin(w-j*.35),0,.035*strength*sin(w-j*.28))
  for sign,q in [(1,'L'),(-1,'R')]:
   ph=w+.28*sign;rot('antenna0'+q,.035*sin(ph),0,sign*.045*sin(ph));rot('antennaTip0'+q,.04*sin(ph-.5),0,sign*.045*sin(ph-.6));rot('antenna1'+q,.025*sin(ph),0,sign*.025*sin(ph));rot('antennaTip1'+q,.03*sin(ph-.4),0,sign*.025*sin(ph-.7))
   if name=='Crawl':rot('antenna1'+q,.12*sin(w+sign*.5),0,sign*.12*sin(w));rot('antennaTip1'+q,-.13*sin(w-.65+sign*.5));loc[1]=.025*sin(w)
   for j in range(8):
    phase=w*2-j*.48+sign*.16;rot('thoracopod'+q+str(j),.08*strength*sin(phase),sign*.04*strength*sin(phase),0);rot('endopod'+q+str(j),.12*strength*sin(phase-.55),sign*.12*strength*sin(phase-.35));rot('exopod'+q+str(j),.22*strength*sin(phase-.32),sign*.10*strength*sin(phase-.60))
   for j in range(5):rot('pleopod'+q+str(j),(.24 if name=='Swim'else .05)*sin(w*2-j*.53),0,sign*.06*strength*sin(w*2-j*.53-.35))
   rot('furca'+q,.015*sin(ph-.8),0,sign*.035*strength*sin(ph-.4))
   if name=='Eat':rot('mandible'+q,0,.02*sin(w*3+sign*.45),sign*.14*sin(w*3+sign*.45));rot('valve'+q,0,-sign*.02*(1-cos(w)))
   if name=='Guard':rot('antenna1'+q,-.045,0,-sign*.08);rot('valve'+q,0,sign*.017)
 elif name in ['Attack','Bite','Heavy','Ability']:
  strength={'Attack':.8,'Bite':.45,'Heavy':1.15,'Ability':1}[name];rot('body',-.065*anticipation+.045*strength*effort);loc[1]=-.06*strength*effort;loc[2]=-.024*effort
  for sign,q in [(1,'L'),(-1,'R')]:
   rot('antenna1'+q,-.07*anticipation+.10*effort,0,sign*.11*anticipation);rot('antennaTip1'+q,-.15*effort+.07*recovery,0,-sign*.06*effort);rot('antenna0'+q,-.07*effort,0,sign*.085*effort);rot('mandible'+q,0,sign*.035*recovery,sign*(-.11*anticipation+.19*effort-.04*recovery));rot('valve'+q,0,-sign*.026*effort)
   for j in range(8):
    lag=j*.015;e=pulse(t,.13+lag,.38+lag,.93);rot('thoracopod'+q+str(j),.085*strength*e);rot('endopod'+q+str(j),-.16*strength*e,sign*.12*e);rot('exopod'+q+str(j),.20*strength*e,sign*.10*recovery)
   for j in range(5):rot('pleopod'+q+str(j),-.06*recovery)
  if name=='Ability':
   for sign,q in [(1,'L'),(-1,'R')]:
    for j in range(8):rot('exopod'+q+str(j),.16*sin(w*3-j*.38)*sin(pi*t)**2)
  for j in range(7):rot('abdomen'+str(j),-.013*strength*recovery)
 elif name in ['TurnLeft','TurnRight']:
  sig=1 if name=='TurnLeft'else-1;rot('body',-.018*effort,sig*.035*effort,-sig*.07*effort)
  for j in range(7):rot('abdomen'+str(j),0,0,sig*.055*pulse(t,.11+j*.02,.41+j*.018,.98))
  for sign,q in [(1,'L'),(-1,'R')]:
   rot('antenna0'+q,0,0,-sig*.20*effort);rot('antennaTip0'+q,0,0,-sig*.10*recovery);rot('antenna1'+q,.045*effort,0,-sig*.12*effort)
   for j in range(5):rot('pleopod'+q+str(j),(.18 if sign==sig else-.055)*effort,0,sig*.10*recovery)
   rot('furca'+q,0,0,sig*.11*recovery)
 elif name in ['Dive','Rise']:
  sign=1 if name=='Rise'else-1;rot('body',sign*.13*effort);loc[2]=sign*.035*effort
  for j in range(7):rot('abdomen'+str(j),-sign*.018*recovery)
  for sig,q in [(1,'L'),(-1,'R')]:
   rot('antenna0'+q,sign*.11*effort);rot('antennaTip0'+q,-sign*.06*recovery)
   for j in range(5):rot('pleopod'+q+str(j),-.17*sign*effort)
 elif name in ['Hit','Stagger','Dodge','Parry']:
  e=pulse(t,.01,.23,.93);wave=sin(t*pi*4)*(1-t)**2;rot('body',-.07*e,.06*e,.04*e);loc[0]=.075*e if name=='Dodge'else 0;loc[1]=.04*e
  for j in range(7):rot('abdomen'+str(j),.045*e,0,-.025*e)
  for sign,q in [(1,'L'),(-1,'R')]:
   rot('antenna0'+q,-.14*e,0,-sign*.1*e);rot('antennaTip0'+q,-.08*e);rot('antenna1'+q,-.08*e,0,-sign*.08*e);rot('valve'+q,0,sign*.025*e)
   for j in range(8):rot('endopod'+q+str(j),-.09*e,sign*.12*e);rot('exopod'+q+str(j),-.10*e)
  if name=='Stagger':rot('body',.06*wave,0,.04*wave)
  if name=='Parry':rot('antenna1L',-.15*e,0,.13*e)
 elif name=='Moult':
  e=pulse(t,.05,.45,.96);rot('body',-.03*e)
  for j in range(7):rot('abdomen'+str(j),.035*pulse(t,.05+j*.022,.40+j*.024,.99))
  for sign,q in [(1,'L'),(-1,'R')]:
   rot('valve'+q,0,-sign*.040*e);rot('antenna1'+q,-.08*e,0,sign*.10*e)
   for j in range(8):rot('endopod'+q+str(j),.09*e,-sign*.065*e)
 elif name=='Death':
  e=float(smooth(t/.77));rot('body',.035*e,.27*e,-.04*e);loc[2]=-.10*e
  for j in range(7):rot('abdomen'+str(j),.065*e,0,.026*e)
  for sign,q in [(1,'L'),(-1,'R')]:
   rot('antenna0'+q,-.12*e,0,sign*.05*e);rot('antennaTip0'+q,-.16*e);rot('antenna1'+q,.08*e);rot('antennaTip1'+q,-.12*e);rot('valve'+q,0,-sign*.025*e)
   for j in range(8):rot('endopod'+q+str(j),-.12*e,sign*.09*e);rot('exopod'+q+str(j),-.08*e)
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
rig.animation_data.action=bpy.data.actions['Idle'];s.frame_set(0)
