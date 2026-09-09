"""Gemuendina-specific rest skeleton, continuous weights and authored actions.

Tail-driven reconstruction with restrained pectoral trim; angles in radians.
Pure Python specification; executable Blender export lives in candidate_01.py.
"""
from math import sin, cos, pi, exp
from sculpt_spec_02 import axis, skin, profile, CORE, WIDTH, APERTURE_Y
CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,
       'Attack':1.0,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,
       'Parry':10/30,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=('Idle','Swim','Guard','Eat')
TAIL_Y=(.70,1.20,1.73,2.28,2.85,3.40,3.86)

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def pulse(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0.
def bones():
    result={}
    def add(name,head,parent,tail=None):
        result[name]={'head':head,'tail':tail or (head[0],head[1]+.30,head[2]),'parent':parent}
    add('root',(0,0,0),None);add('body',(0,-.05,.12),'root')
    add('skull',(0,-.58,.28),'body');add('jaw',(0,-1.51,.22),'skull')
    add('throat',(0,-1.39,.11),'skull')
    for k,y in enumerate(TAIL_Y):
        yy=TAIL_Y[k+1] if k<len(TAIL_Y)-1 else 4.09
        add('tail'+str(k),(axis(y)[0],y,axis(y)[1]),'body' if k==0 else 'tail'+str(k-1),
            (axis(yy)[0],yy,axis(yy)[1]))
    for s in (-1,1):
        side='L' if s>0 else 'R'
        for k,y in enumerate((-.60,.02,.66)):
            x=profile(y,CORE)*.87
            add('pectoral'+str(k)+side,(s*x,y,.10),'body')
            add('margin'+str(k)+side,(s*(x+.57),y,.09),'pectoral'+str(k)+side)
        add('pelvic'+side,(s*.22,1.29,.035),'tail1')
        add('branchial'+side,(s*.83,-.66,.31),'skull')
    return result

def normalize(weights):
    result=sorted(((n,w)for n,w in weights.items()if w>1e-7),key=lambda a:-a[1])[:4]
    total=sum(w for _,w in result)
    if not total:raise ValueError('Empty anatomical weights')
    return {n:w/total for n,w in result}
def axial_weights(y):
    if y<-.85:return {'skull':1.}
    if y<-.36:
        t=smooth(-.85,-.36,y);return {'skull':1-t,'body':t}
    if y<.43:return {'body':1.}
    if y<TAIL_Y[0]:
        t=smooth(.43,TAIL_Y[0],y);return {'body':1-t,'tail0':t}
    for k in range(len(TAIL_Y)-1):
        if y<=TAIL_Y[k+1]:
            t=smooth(TAIL_Y[k],TAIL_Y[k+1],y)
            return {'tail'+str(k):1-t,'tail'+str(k+1):t}
    return {'tail6':1.}
def weights(point,oral=False):
    x,y,z=point;ax=abs(x-axis(y)[0]);side='L'if x>0 else'R'
    w=axial_weights(y)
    # Shared outside/inside lip weights carry the welded anterior jaw arc.
    jaw=.93*smooth(-1.61,-1.795,y)*exp(-(ax/.49)**6)
    if oral:jaw*=.50+.50*smooth(.025,.18,z)
    if jaw:
        w={k:v*(1-jaw)for k,v in w.items()};w['jaw']=jaw
    if oral:
        throat=.52*smooth(-1.75,-1.60,y)*(1-smooth(.07,.19,z))
        w={k:v*(1-throat)for k,v in w.items()};w['throat']=throat
    else:
        core=profile(y,CORE);outer=smooth(core*.87,core+.62,ax)
        # Pectorals carry only the lateral mantle, not the core or cranium.
        fin=outer*smooth(-1.03,-.66,y)*(1-smooth(.88,1.16,y))
        if fin>0:
            w={k:v*(1-fin)for k,v in w.items()}
            q=max(0,min(2,(y+.60)/.63));i=min(1,int(q));f=q-i
            margin=smooth(core+.37,max(core+.65,profile(y,WIDTH)-.06),ax)
            for k,amount in ((i,1-f),(i+1,f)):
                for n,a in [('pectoral'+str(k)+side,1-margin),('margin'+str(k)+side,margin)]:
                    w[n]=w.get(n,0)+fin*amount*a
        pelvic=smooth(1.17,1.32,y)*(1-smooth(1.60,1.83,y))*smooth(.21,.43,ax)
        if pelvic:
            w={k:v*(1-pelvic)for k,v in w.items()};w['pelvic'+side]=pelvic
        # Small distributed branchial flex remains welded to the cranial bed.
        branch=.24*exp(-((ax-.89)/.16)**4-((y+.68)/.22)**4)*smooth(.18,.34,z)
        if branch:
            w={k:v*(1-branch)for k,v in w.items()};w['branchial'+side]=branch
    return normalize(w)

def pose(clip,t):
    if clip not in CLIPS:raise ValueError(clip)
    p=2*pi*t;loop=clip in LOOPS;envelope=1 if loop else sin(pi*t)**2
    state={n:{'rotation':[0.,0.,0.],'location':[0.,0.,0.]}for n in bones()}
    def rot(n,a,v):state[n]['rotation'][a]+=v
    def loc(n,a,v):state[n]['location'][a]+=v
    def wave(lag=0,freq=1):return sin(p*freq-lag)*envelope
    wind=pulse(t,.02,.31);strike=pulse(t,.25,.65);settle=pulse(t,.61,.97)
    dead=smooth(.12,1,t) if clip=='Death' else 0
    tail_amp={'Idle':.18,'Swim':1.,'Guard':.10,'Eat':.20,'Dodge':.75,
              'Ability':.30,'Growth':.24}.get(clip,.32)*(1-dead)
    opening=0.
    if clip in ('Idle','Swim','Guard'):opening=.010*(1-cos(p*2))
    if clip=='Eat':opening=.23*(.5-.5*cos(p*2))
    if clip=='Bite':opening=.31*pulse(t,.04,.89)
    if clip=='Attack':opening=.36*strike
    if clip=='Heavy':opening=.45*strike+.065*wind
    if clip=='Ability':opening=.29*pulse(t,.09,.95)
    if clip=='Growth':opening=.06*envelope
    opening+=.12*dead
    rot('jaw',0,opening)
    rot('throat',0,.10*opening+.008*wave(.5,2))
    loc('throat',2,.006*opening+.0025*wave(.7,2))
    # Head carried steadily; oral reach is subordinate to body pitching.
    rot('skull',0,-.035*opening)
    rot('body',2,.014*tail_amp*wave(.35))
    rot('body',1,.008*tail_amp*wave(.15))
    loc('body',2,.008*tail_amp*wave(.50))
    turn=(-1 if clip=='TurnLeft' else 1) if clip in ('TurnLeft','TurnRight') else 0
    if turn:
        rot('body',2,turn*(.23*envelope-.035*wind));rot('body',1,turn*.085*envelope)
        loc('body',0,turn*.035*envelope)
    if clip in ('Dive','Rise'):
        direction=1 if clip=='Dive'else -1
        rot('body',0,direction*.21*pulse(t,.03,.97));loc('body',2,-direction*.105*envelope)
    if clip=='Attack':
        loc('body',2,-.027*wind+.115*strike-.010*settle)
        loc('body',1,.027*wind-.080*strike);rot('body',0,.026*wind-.105*strike+.012*settle)
    if clip=='Heavy':
        loc('body',2,-.046*wind+.18*strike-.022*settle)
        loc('body',1,.035*wind-.125*strike);rot('body',0,.040*wind-.155*strike+.025*settle)
    if clip=='Parry':
        rot('body',2,.16*envelope);rot('body',1,-.19*envelope);loc('body',0,.05*envelope)
    if clip=='Dodge':
        rot('body',2,-.24*envelope);rot('body',1,.22*envelope);loc('body',0,.20*envelope)
    if clip=='Guard':loc('body',2,-.025+.004*cos(p));rot('body',0,.016)
    if clip=='Hit':
        rot('body',2,.15*envelope*sin(p+.30));rot('body',1,.10*envelope);loc('body',2,-.035*envelope)
    if clip=='Stagger':
        rot('body',2,.19*envelope*sin(p*2.0)*(.95-.45*t));rot('body',1,.13*envelope*sin(p+.4));loc('body',2,-.055*envelope)
    if clip=='Ability':loc('body',2,.11*envelope);rot('body',0,-.10*envelope)
    if clip=='Growth':loc('body',2,.03*envelope);rot('body',0,-.025*envelope)
    rot('body',1,.86*dead);rot('body',0,.055*dead);loc('body',2,-.11*dead)
    for k in range(7):
        # Swimming power comes from a continuous travelling axial wave.
        amp=(.083+.018*k)*tail_amp
        value=amp*wave(.60*k+.18)
        value+=turn*(.060+.015*k)*envelope
        if clip=='Dodge':value+=.13*envelope*sin(k*.55+.7)
        if clip in ('Attack','Heavy'):value+=(-.026*wind+.022*settle)*sin(k*.7+.4)
        value+=.07*dead*sin(k*.6+.3)
        rot('tail'+str(k),2,value)
        rot('tail'+str(k),0,.014*tail_amp*wave(.65*k+1.0))
        if clip in ('Dive','Rise'):rot('tail'+str(k),0,(-1 if clip=='Dive'else 1)*.019*envelope*(1+k*.07))
    for s in (-1,1):
        side='L'if s>0 else'R'
        for k in range(3):
            proximal=s*.023*tail_amp*wave(k*.75+.8)
            margin=s*.053*tail_amp*wave(k*.75+1.4)
            if turn:
                bank=.075 if (s<0)==(turn<0) else -.028
                proximal+=s*bank*envelope;margin+=s*.045*envelope
            if clip in ('Dive','Rise'):
                trim=(1 if clip=='Dive'else -1)*(.050-.018*k)*envelope
                proximal+=s*trim;margin+=s*trim*.65
            if clip in ('Attack','Heavy'):
                proximal+=s*(.045*wind-.075*strike+.025*settle)
                margin+=s*(.035*wind-.055*strike+.033*settle)
            if clip=='Guard':proximal+=s*.055;margin+=s*(.045+.007*cos(p))
            if clip=='Dodge':proximal+=s*(.09 if s>0 else -.025)*envelope;margin+=s*.08*envelope
            if clip=='Parry':proximal+=s*(.06 if s<0 else -.045)*envelope
            if clip=='Ability':proximal-=s*.055*envelope;margin-=s*.045*envelope
            if clip=='Growth':proximal-=s*.042*envelope;margin-=s*.055*envelope
            proximal+=s*(.085 if s>0 else .035)*dead;margin+=s*.115*dead
            rot('pectoral'+str(k)+side,1,proximal);rot('margin'+str(k)+side,1,margin)
            rot('margin'+str(k)+side,2,s*.011*tail_amp*wave(k*.8+2.0))
        rot('pelvic'+side,1,s*(.018*tail_amp*wave(1.7)+.045*dead))
        if turn:rot('pelvic'+side,2,turn*.045*envelope)
        rot('branchial'+side,2,s*(.016*opening+.009*wave(.4,2)))
        loc('branchial'+side,2,.003*opening+.0013*wave(.4,2))
    return state

ANCHORS=[
    {'name':'anchor_mouth','bone':'jaw','point':(0,-1.778,.245),'role':'mouth'},
    {'name':'anchor_mouth_inside','bone':'throat','point':(0,-1.62,.070),'role':'swallow'},
    {'name':'anchor_attack_primary','bone':'jaw','point':(0,-1.790,.255),'role':'attack'},
]
