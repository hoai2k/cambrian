"""One in-place Shonisaurus performance, applied identically to both meshes.
Deep trunk inertia, caudally increasing lateral wave, restrained flipper trim.
Attack gestures use load / contact / follow-through / recovery, never root motion.
"""
from math import sin,cos,pi
CLIPS={'Idle':3.2,'Swim':1.8,'Sprint':1.1,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.8,'Rise':1.8,'Attack':1.0,'Bite':.6,'Heavy':1.35,'Hit':.65,'Death':2.4,'Guard':2.6,'Parry':.65,'Dodge':.9,'Eat':2.4,'Stagger':1.5,'Ability':2.1,'Grab':1.2,'Breath':2.4,'Growth':2.2}
LOOPS=['Idle','Swim','Sprint','Guard','Eat','Grab']
def smooth(v,a=0,b=1):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
def hold(t,a,b,c,d):return smooth(t,a,b)*(1-smooth(t,c,d))
def pulse(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0

def pose(clip,t,bones):
 p={n:{'rotation':[0.,0.,0.],'location':[0.,0.,0.]}for n in bones}
 def r(n,k,v):p[n]['rotation'][k]+=v
 def l(n,k,v):p[n]['location'][k]+=v
 cycle=2*pi*t;env=1 if clip in LOOPS else sin(pi*t)**2;dead=smooth(t,.13,.86)if clip=='Death'else 0;alive=1-dead
 effort={'Idle':.12,'Swim':1,'Sprint':1.55,'Guard':.10,'Eat':.14,'Ability':.17,'Grab':.18,'Breath':.12,'Growth':.15}.get(clip,.38)
 load=pulse(t,.02,.30);contact=pulse(t,.26,.53);follow=pulse(t,.46,.72);recovery=pulse(t,.68,.98)
 direction=1 if clip=='TurnLeft'else-1 if clip=='TurnRight'else 0;turn=hold(t,.04,.30,.61,.97)
 # The thorax leads the locomotor wave at only a fraction of tail amplitude.
 r('body',2,.018*effort*sin(cycle)*env*alive);r('chest',2,-.009*effort*sin(cycle+.3)*env*alive)
 if direction:r('body',2,direction*.19*turn);r('chest',2,direction*.085*turn);r('skull',2,direction*.045*turn);r('body',1,-direction*.09*turn)
 if clip in ['Dive','Rise']:
  sign=1 if clip=='Dive'else-1;r('body',0,sign*.18*turn);r('chest',0,sign*.04*turn)
 attack=clip in ['Attack','Heavy','Bite'];power={'Attack':1,'Heavy':1.45,'Bite':.3}.get(clip,0)
 if attack:
  l('body',1,power*(.065*load-.26*contact-.085*follow+.015*recovery));r('chest',0,power*(.028*load-.025*contact));r('skull',2,power*(-.018*load+.015*follow))
 gape=0.
 if attack:gape={'Bite':.32,'Attack':.40,'Heavy':.45}[clip]*hold(t,.01,.23,.30,.51)
 if clip=='Eat':gape=.24*(.5-.5*cos(2*cycle));r('skull',0,.015*sin(2*cycle))
 if clip=='Ability':r('chest',0,-.075*hold(t,.04,.30,.64,.96));r('skull',0,-.035*env)
 # A hold is a braced, closed-jaw restraint rather than a fifth bite.  It loops cleanly while
 # the game owns translation.  Breath is a separate in-place surface gesture, not locomotion.
 if clip=='Grab':r('chest',0,-.018*sin(cycle));r('skull',0,.008*sin(cycle));r('body',1,-.018*sin(cycle))
 if clip=='Breath':r('chest',0,-.055*pulse(t,.08,.46)+.028*pulse(t,.55,.94));r('skull',0,-.022*pulse(t,.08,.46));l('body',2,.035*pulse(t,.08,.46))
 if clip=='Hit':r('chest',2,-.09*pulse(t,.01,.55)+.018*recovery);r('skull',1,.045*env);l('body',1,.09*pulse(t,.02,.70))
 if clip=='Guard':r('chest',0,.025);r('skull',0,-.022)
 if clip=='Parry':r('chest',2,.13*pulse(t,.02,.60));r('skull',2,.04*env);r('body',1,-.07*env)
 if clip=='Dodge':r('body',2,-.16*hold(t,.02,.27,.56,.95));r('chest',2,-.075*env);l('body',0,-.38*pulse(t,.10,.92));r('body',1,.13*env)
 if clip=='Stagger':r('body',1,.12*sin(2*cycle+.2)*env*(1-.45*t));r('chest',2,.085*sin(2*cycle)*env);l('body',2,-.07*env)
 if clip=='Growth':r('chest',0,-.045*env)
 r('jaw',0,gape*alive);r('skull',0,-.06*gape*alive)
 r('body',1,.93*dead);r('body',0,.09*dead);l('body',2,-.22*dead)
 for k in range(6):
  wave=(.031+.021*k)*effort*sin(cycle-.54*k-.48)*env*alive
  wave+=direction*(.055+.008*k)*turn
  if attack:wave+=power*(-.050*load+.070*contact-.04*follow)*sin(.5*k+.3)
  if clip=='Dodge':wave+=.17*pulse(t,.02,.7)*sin(.58*k+.4)
  if clip=='Parry':wave-=.03*env*sin(.5*k)
  wave+=.04*dead*sin(.65*k)
  r('spine'+str(k),2,wave)
 r('caudal',2,.17*effort*sin(cycle-3.8)*env*alive+.07*dead)
 r('dorsal',2,.02*effort*sin(cycle-1.5)*env*alive)
 for sign,side in [(1,'L'),(-1,'R')]:
  trim=.025*effort*sin(cycle-.8)*env*alive
  if direction:trim+=(.09 if sign==direction else-.025)*turn
  if clip in ['Dive','Rise']:trim+=(.10 if clip=='Dive'else-.10)*turn
  if attack:trim+=power*(.08*load-.055*contact+.07*follow)
  if clip=='Guard':trim+=.065+.006*cos(cycle)
  if clip=='Parry':trim+=(.12 if sign>0 else-.02)*env
  if clip=='Dodge':trim+=(.16 if sign<0 else-.05)*env
  if clip=='Ability':trim-=.025*env
  trim=trim*alive+(.10 if sign>0 else .05)*dead
  for k in range(2):
   r('pectoral'+str(k)+side,1,sign*trim*(1-.45*k));r('pectoral'+str(k)+side,2,sign*.016*effort*sin(cycle-1.2-k*.2)*env*alive)
   r('pelvic'+str(k)+side,1,sign*(trim*.4+.012*effort*sin(cycle-2-k*.2)*env*alive));r('pelvic'+str(k)+side,2,direction*.025*turn)
 return p
