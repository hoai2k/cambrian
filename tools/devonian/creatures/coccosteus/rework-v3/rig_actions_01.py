"""Bespoke compact Coccosteus rig and 18 actions; pure authoring specification.
The shared oral lumen uses precisely the proven skull/jaw/body ownership.
"""
from math import sin, cos, pi, radians
CLIPS={'Idle':2.0,'Swim':1.6,'TurnLeft':1.2,'TurnRight':1.2,'Dive':1.4,'Rise':1.4,
       'Attack':.8,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.8,'Guard':1.8,
       'Parry':.4,'Dodge':.5,'Eat':1.8,'Stagger':1.2,'Ability':1.4,'Growth':1.5}
LOOPS=('Idle','Swim','Guard','Eat')
HINGE=(0,-.99,-.224);NECK=(0,-.865,.245)
TAIL_Y=(.18,.53,.90,1.25,1.60,1.99)
TAIL_Z=(.020,.044,.095,.145,.245,.410)
def smooth(v,a=0.,b=1.):
    t=min(1.,max(0.,(v-a)/(b-a)));return t*t*(3-2*t)
def pulse(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0.
def hold(t,a,b,c,d):return smooth(t,a,b)*(1-smooth(t,c,d))
def normalize(w):
    out={n:q for n,q in w.items()if q>1e-8};total=sum(out.values())
    if not total or len(out)>4:raise ValueError('Invalid anatomical weights')
    return {n:q/total for n,q in out.items()}
def fin_spine(kind,u,s):
    if kind=='pectoral':return (s*(.25+.51*u),-.48+.40*u,-.26-.27*u**1.25)
    return (s*(.14+.30*u),.42+.17*u,-.165-.12*u**1.25)
def bones():
    out={}
    def add(n,p,parent):out[n]={'head':p,'tail':(p[0],p[1]+.18,p[2]),'parent':parent}
    add('root',(0,0,0),None);add('body',(0,-.40,0),'root')
    add('skull',NECK,'body');add('jaw',HINGE,'body')
    for k,(y,z)in enumerate(zip(TAIL_Y,TAIL_Z)):add('tail'+str(k),(0,y,z),'body'if k==0 else'tail'+str(k-1))
    add('caudal',(0,2.365,.616),'tail5');add('dorsal',(0,.53,.334),'tail1')
    for side,s in [('L',1),('R',-1)]:
        for kind,parent in [('pectoral','body'),('pelvic','tail1')]:
            for k,u in enumerate((0.,.58)):
                add(kind+str(k)+side,fin_spine(kind,u,s),parent if k==0 else kind+'0'+side)
    return out

def axial(y):
    if y<=.12:return {'body':1.}
    if y<TAIL_Y[0]:
        q=smooth(y,.12,TAIL_Y[0]);return normalize({'body':1-q,'tail0':q})
    for k in range(len(TAIL_Y)-1):
        if y<TAIL_Y[k+1]:
            q=smooth(y,TAIL_Y[k],TAIL_Y[k+1]);return normalize({'tail'+str(k):1-q,'tail'+str(k+1):q})
    q=smooth(y,1.99,2.365);return normalize({'tail5':1-q,'caudal':q})

def pose(clip,t):
    if clip not in CLIPS:raise ValueError(clip)
    state={n:{'rotation':[0.,0.,0.],'location':[0.,0.,0.]}for n in bones()}
    def r(n,k,v):state[n]['rotation'][k]+=v
    def l(n,k,v):state[n]['location'][k]+=v
    cycle=2*pi*t;loop=clip in LOOPS;env=1. if loop else sin(pi*t)**2
    dead=smooth(t,.10,.82)if clip=='Death'else 0.;alive=1-dead
    def wave(lag=0.,freq=1.):return sin(cycle*freq-lag)*env*alive
    load=pulse(t,.015,.34);contact=pulse(t,.25,.56);recovery=pulse(t,.55,.98)
    effort={'Idle':.15,'Swim':1.,'Guard':.10,'Eat':.18,'Ability':.8,'Growth':.2}.get(clip,.42)
    gape=0.
    if clip in ('Idle','Swim','Guard'):gape=.035*(.5-.5*cos(2*cycle))
    if clip=='Eat':gape=.65*(.5-.5*cos(2*cycle))**.8
    if clip=='Bite':gape=.88*hold(t,.02,.29,.38,.73)
    if clip=='Attack':gape=.90*hold(t,.12,.29,.37,.63)
    if clip=='Heavy':gape=hold(t,.17,.38,.49,.77)
    if clip=='Ability':gape=.94*hold(t,.09,.27,.39,.62)
    if clip=='Hit':gape=.18*pulse(t,.08,.63)
    if clip=='Growth':gape=.12*pulse(t,.24,.87)
    gape=gape*alive+.28*dead
    # Real bones reproduce the accepted clay04/material04 LBS endpoints exactly.
    r('jaw',0,.34*gape);r('skull',0,-.041*gape)
    r('body',2,.010*effort*wave(.15));r('body',1,.008*effort*wave(.8));l('body',2,.004*effort*wave(.7))
    direction=1 if clip=='TurnLeft'else -1 if clip=='TurnRight'else 0
    turn=hold(t,.04,.31,.59,.97)
    if direction:
        r('body',2,direction*(.27*turn-.032*load));r('body',1,-direction*.13*turn);l('body',0,direction*.07*turn)
    if clip in ('Dive','Rise'):
        sign=1 if clip=='Dive'else -1;r('body',0,sign*.23*hold(t,.06,.32,.62,.97));l('body',2,-sign*.095*env)
    if clip in ('Attack','Heavy'):
        power=1. if clip=='Attack'else 1.35
        l('body',1,power*(.045*load-.19*contact+.021*recovery))
        r('body',0,power*(.037*load-.059*contact+.015*recovery))
    if clip=='Hit':l('body',1,.075*pulse(t,.01,.70));r('body',2,-.13*pulse(t,.025,.59)+.025*recovery);r('body',1,.08*env)
    if clip=='Guard':r('body',0,.043);l('body',2,-.025+.003*cos(cycle))
    if clip=='Parry':r('body',2,.22*pulse(t,.02,.91));r('body',1,-.13*env);l('body',0,.06*env)
    if clip=='Dodge':r('body',2,-.25*pulse(t,.01,.84));r('body',1,.18*env);l('body',0,-.20*env)
    if clip=='Stagger':r('body',2,.21*env*sin(2*cycle+.3)*(1-.55*t));r('body',1,.11*env*sin(cycle+.4));l('body',2,-.065*env)
    if clip=='Ability':
        # Short ambush surge: body crouch, tail load, mouth contact and checked recovery.
        l('body',1,.055*load-.24*contact+.030*recovery);r('body',0,.045*load-.055*contact);l('body',2,-.018*load)
    if clip=='Growth':r('body',0,-.05*env);l('body',2,.040*env)
    r('body',1,.90*dead);r('body',0,.075*dead);l('body',2,-.135*dead)
    for k in range(6):
        yaw=(.035+.024*k)*effort*wave(.61*k+.10)
        yaw+=direction*(.045+.013*k)*turn
        if clip in ('Attack','Heavy','Ability'):yaw+=(-.105*load+.070*recovery)*sin(.60*k+.45)
        if clip=='Dodge':yaw+=.135*pulse(t,.06,.88)*sin(.65*k+.25)
        if clip=='Parry':yaw-=.050*env*sin(.6*k+.3)
        yaw+=.07*dead*sin(.65*k+.5)
        r('tail'+str(k),2,yaw);r('tail'+str(k),0,.008*effort*wave(.65*k+.95))
    r('caudal',2,.14*effort*wave(3.85)+.052*dead)
    r('dorsal',2,.025*effort*wave(1.6));r('dorsal',0,.03*dead)
    for s,side in [(1,'L'),(-1,'R')]:
        for k in range(2):
            trim=.028*effort*wave(.80*k+.8)
            if direction:trim+=(.105 if s==direction else -.042)*turn
            if clip in ('Dive','Rise'):trim+=(1 if clip=='Dive'else -1)*.085*env
            if clip in ('Attack','Heavy','Ability'):trim+=.095*load-.078*contact+.046*recovery
            if clip=='Guard':trim+=.075+.012*cos(cycle+.8*k)
            if clip=='Dodge':trim+=(.14 if s<0 else -.05)*pulse(t,.03,.94)
            if clip=='Parry':trim+=(.10 if s>0 else -.035)*env
            if clip=='Growth':trim-=.05*env
            trim=trim*alive+(.10 if s>0 else .055)*dead
            r('pectoral'+str(k)+side,1,s*trim*(1-.25*k));r('pectoral'+str(k)+side,2,s*.018*effort*wave(.7*k+1.8))
            r('pelvic'+str(k)+side,1,s*(.030*effort*wave(1.7+.6*k)+.065*dead));r('pelvic'+str(k)+side,2,direction*.035*turn)
    return state

ANCHORS=[
 {'name':'anchor_mouth','bone':'jaw','point':(0,-1.825,-.086),'role':'mouth'},
 {'name':'anchor_mouth_inside','bone':'jaw','point':(0,-1.56,-.190),'role':'swallow'},
 {'name':'anchor_attack_primary','bone':'skull','point':(0,-1.835,-.077),'role':'attack'},
]
