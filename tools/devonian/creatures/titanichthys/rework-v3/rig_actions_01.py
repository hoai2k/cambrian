"""Bespoke Titanichthys skeleton, semantic weights and 18 deliberate actions.
Pure specification; no Blender imports, geometry creation or external assets.
"""
from math import sin,cos,pi,exp,radians
CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.8,'TurnRight':1.8,'Dive':1.6,'Rise':1.6,
       'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,
       'Parry':10/30,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=('Idle','Swim','Guard','Eat')
TAIL_Y=(.30,.86,1.43,2.03,2.60,3.15)
TAIL_Z=(.06,.06,.06,.05,.07,.28)
HINGE=(0,-1.90,-.080);NECK=(0,-1.40,.72)
def clamp(v):return min(1.,max(0.,v))
def smooth(v,a=0.,b=1.):
    t=clamp((v-a)/(b-a));return t*t*t*(t*(6*t-15)+10)
def pulse(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0.
def hold(t,a,b,c,d):return smooth(t,a,b)*(1-smooth(t,c,d))
def cubic(points,t):
    return tuple((1-t)**3*points[0][k]+3*(1-t)**2*t*points[1][k]+3*(1-t)*t*t*points[2][k]+t**3*points[3][k]for k in range(3))
def fin_spine(kind,s,side):
    if kind=='pectoral':
        leading=[(1.005,-1.13,-.45),(1.90,-.90,-.42),(3.04,.75,-.62),(3.38,1.70,-.45)]
        trailing=[(1.00,-.02,-.54),(1.65,.65,-.69),(2.69,1.68,-.67),(3.38,1.70,-.45)];th=.070
    else:
        leading=[(.38,1.20,-.34),(.74,1.33,-.41),(1.01,1.77,-.53),(1.08,2.17,-.47)]
        trailing=[(.34,1.78,-.35),(.55,2.04,-.51),(.90,2.23,-.57),(1.08,2.17,-.47)];th=.033
    a,b=cubic(leading,s),cubic(trailing,s)
    return (side*((a[0]+b[0])*.5-1.7*th*(1-s)**3),(a[1]+b[1])*.5,(a[2]+b[2])*.5-.22*s)
def bones():
    b={}
    def add(n,p,parent):b[n]={'head':p,'tail':(p[0],p[1]+.24,p[2]),'parent':parent}
    # All rest local axes parallel world axes, preserving authored pitch/yaw signs.
    add('root',(0,0,0),None);add('body',(0,-.40,.07),'root')
    add('skull',NECK,'body');add('jaw',HINGE,'body');add('oral_floor',HINGE,'body')
    for side,s in [('L',1),('R',-1)]:add('commissure'+side,(s*.91,-1.90,-.08),'body')
    for k,(y,z)in enumerate(zip(TAIL_Y,TAIL_Z)):add('tail'+str(k),(0,y,z),'body'if k==0 else'tail'+str(k-1))
    add('caudal',(0,3.16,.28),'tail5');add('dorsal',(0,.55,.70),'tail0')
    for side,s in [('L',1),('R',-1)]:
        for k,span in enumerate((0.,.38,.73)):
            add('pectoral'+str(k)+side,fin_spine('pectoral',span,s),'body'if k==0 else'pectoral'+str(k-1)+side)
        for k,span in enumerate((0.,.58)):
            add('pelvic'+str(k)+side,fin_spine('pelvic',span,s),'tail2'if k==0 else'pelvic0'+side)
    return b

def normalize(weights):
    rows=sorted(((n,w)for n,w in weights.items()if w>1e-8),key=lambda q:-q[1])[:4]
    total=sum(w for n,w in rows)
    if not total:raise ValueError('Empty weights')
    return {n:w/total for n,w in rows}
def axial(y):
    if y<.12:return {'body':1.}
    if y<TAIL_Y[0]:
        t=smooth(y,.12,TAIL_Y[0]);return normalize({'body':1-t,'tail0':t})
    for k in range(len(TAIL_Y)-1):
        if y<TAIL_Y[k+1]:
            t=smooth(y,TAIL_Y[k],TAIL_Y[k+1]);return normalize({'tail'+str(k):1-t,'tail'+str(k+1):t})
    t=smooth(y,3.15,3.60);return normalize({'tail5':1-t,'caudal':t})
def head_fields(t,a):
    ss=sin(a)
    return (smooth(-ss/.22)*(1-smooth((t-.065)/.32)),
            smooth((ss+.09)/.25)*(1-smooth((t-.64)/.36)),
            sin(pi*clamp((t-.07)/.48))**2*smooth((-ss-.05)/.40))
def head_weights(t,a):
    jaw,skull,floor=head_fields(t,a);rem=max(0.,1-jaw-skull)
    # A restrained floor control uses only the unclaimed soft-tissue fraction.
    fw=rem*.66*floor;rem-=fw
    # The commissures share exact exterior/interior parameters. Their motion
    # decays into the cheek; they never pull the rigid crown or jaw tip.
    corner=rem*.34*exp(-(sin(a)/.19)**2)*(1-smooth(t,.11,.45))
    side='L'if cos(a)>=0 else'R'
    return normalize({'jaw':jaw,'skull':skull,'oral_floor':fw,'commissure'+side:corner,'body':rem-corner})
def body_semantics():
    rows=[];windows=[(34,42,13,19),(34,42,77,83)]
    for i in range(113):
        for j in range(192):
            if any(a<i<b and c<j<d for a,b,c,d in windows):continue
            rows.append(('head',i/112,2*pi*j/192))
    for i in range(1,179):
        for j in range(192):rows.append(('posterior',-1.08+4.80*i/178,2*pi*j/192))
    rows.append(('tailcap',0,0))
    for i in range(1,113):
        for j in range(192):rows.append(('oral',i/112,2*pi*j/192))
    for i in range(66*192+1):rows.append(('throat',0,0))
    for a,b,c,d in windows:
        tc=(a+b)/224;ac=(c+d)*pi/192
        rows.extend([('socket',tc,ac)]*(8*(2*(b-a)+2*(d-c))+1))
    assert len(rows)==90430
    return rows

def pose(clip,t):
    if clip not in CLIPS:raise ValueError(clip)
    b=bones();state={n:{'rotation':[0.,0.,0.],'location':[0.,0.,0.]}for n in b}
    def r(n,k,v):state[n]['rotation'][k]+=v
    def l(n,k,v):state[n]['location'][k]+=v
    cycle=2*pi*t;loop=clip in LOOPS;env=1. if loop else sin(pi*t)**2
    dead=smooth(t,.12,.84)if clip=='Death'else 0.
    alive=1-dead
    def wave(lag=0.,freq=1.):return sin(cycle*freq-lag)*env*alive
    # Explicit effort phases: loading, a faster contact, then damped recovery.
    load=pulse(t,.015,.34);hit=pulse(t,.28,.64);recover=pulse(t,.59,.98)
    swimming={'Idle':.13,'Swim':1.,'Eat':.23,'Guard':.10,'Ability':.34,'Growth':.23}.get(clip,.38)
    opening=0.
    if clip in ('Idle','Swim','Guard'):opening=radians(.65)*(1-cos(2*cycle))
    if clip=='Eat':opening=radians(17)*(.5-.5*cos(cycle))**.72
    if clip=='Bite':opening=radians(18)*hold(t,.03,.34,.40,.86)
    if clip=='Attack':opening=radians(8)*hit
    if clip=='Heavy':opening=radians(11)*hold(t,.24,.39,.58,.85)
    if clip=='Ability':opening=radians(24)*hold(t,.10,.31,.69,.94)
    if clip=='Growth':opening=radians(4)*pulse(t,.20,.88)
    if clip=='Hit':opening=radians(5)*pulse(t,.14,.66)
    opening=opening*alive+radians(9)*dead
    r('jaw',0,opening);r('skull',0,-opening/12)
    r('oral_floor',0,.17*opening);l('oral_floor',2,-.078*opening)
    for s,side in [(1,'L'),(-1,'R')]:
        r('commissure'+side,0,.13*opening);l('commissure'+side,2,-.008*opening)
    r('body',2,.008*swimming*wave(.3));r('body',1,.005*swimming*wave(.9))
    l('body',2,.009*swimming*wave(.5))
    direction=(1 if clip=='TurnLeft'else -1)if clip in ('TurnLeft','TurnRight')else 0
    if direction:
        bank=hold(t,.05,.40,.63,.98)
        r('body',2,direction*(.21*bank-.026*load));r('body',1,-direction*.085*bank)
        l('body',0,direction*.10*bank)
    if clip in ('Dive','Rise'):
        sign=1 if clip=='Dive'else -1
        r('body',0,sign*.20*hold(t,.05,.35,.62,.97));l('body',2,-sign*.13*env)
    if clip in ('Attack','Heavy'):
        power=1. if clip=='Attack'else 1.6
        l('body',1,power*(.075*load-.24*hit+.025*recover))
        r('body',0,power*(.025*load-.065*hit+.022*recover))
    if clip=='Hit':
        l('body',1,.11*pulse(t,.02,.69));r('body',2,-.10*pulse(t,.02,.65)+.038*recover)
        r('body',1,.065*pulse(t,.09,.80))
    if clip=='Guard':r('body',0,.035);l('body',2,-.025+.004*cos(cycle))
    if clip=='Parry':
        r('body',2,.17*pulse(t,.02,.93));r('body',1,-.10*pulse(t,.08,.96));l('body',0,.07*env)
    if clip=='Dodge':
        r('body',2,-.19*pulse(t,.01,.83));r('body',1,.15*pulse(t,.10,.97));l('body',0,-.24*env)
    if clip=='Stagger':
        r('body',2,.17*env*sin(2*cycle+.2)*(1-.55*t));r('body',1,.10*env*sin(cycle+.6));l('body',2,-.10*env)
    if clip=='Ability':
        l('body',1,-.15*hold(t,.12,.38,.70,.98));r('body',0,-.05*env)
    if clip=='Growth':r('body',0,-.045*env);l('body',2,.055*env)
    r('body',1,.82*dead);r('body',0,.06*dead);l('body',2,-.18*dead)
    for k in range(6):
        amp=(.036+.019*k)*swimming
        yaw=amp*wave(.61*k+.12)
        yaw+=direction*(.033+.012*k)*hold(t,.07,.37,.65,.98)
        if clip in ('Attack','Heavy'):yaw+=(-.052*load+.039*recover)*sin(.62*k+.5)
        if clip=='Dodge':yaw+=.12*pulse(t,.07,.91)*sin(.60*k+.3)
        if clip=='Parry':yaw-=.045*env*sin(.58*k+.2)
        yaw+=.062*dead*sin(.65*k+.4)
        r('tail'+str(k),2,yaw);r('tail'+str(k),0,.009*swimming*wave(.68*k+.9))
    r('caudal',2,.11*swimming*wave(3.85)+.045*dead)
    r('dorsal',2,.018*swimming*wave(1.4));r('dorsal',0,.023*dead)
    for s,side in [(1,'L'),(-1,'R')]:
        for k in range(3):
            trim=.018*swimming*wave(.70*k+.9)
            if direction:trim+=(.052 if s==direction else -.024)*hold(t,.04,.35,.68,.97)
            if clip in ('Dive','Rise'):trim+=(1 if clip=='Dive'else -1)*.055*env
            if clip in ('Attack','Heavy'):trim+=.065*load-.046*hit+.037*recover
            if clip=='Guard':trim+=.060+.008*cos(cycle+.6*k)
            if clip=='Dodge':trim+=(.12 if s<0 else -.045)*pulse(t,.02,.94)
            if clip=='Parry':trim+=(.075 if s>0 else -.030)*env
            if clip=='Ability':trim+=.032*hold(t,.12,.34,.73,.96)
            if clip=='Growth':trim-=.046*env
            trim=trim*alive+(.09 if s>0 else .05)*dead
            r('pectoral'+str(k)+side,1,s*trim*(1-.20*k))
            r('pectoral'+str(k)+side,0,.009*swimming*wave(.7*k+1.2))
            r('pectoral'+str(k)+side,2,s*.008*swimming*wave(.7*k+1.7))
        for k in range(2):
            r('pelvic'+str(k)+side,1,s*(.022*swimming*wave(1.7+.55*k)+.075*dead))
            r('pelvic'+str(k)+side,2,direction*.025*env)
    return state

ANCHORS=[
 {'name':'anchor_mouth','bone':'jaw','point':(0,-2.60,-.158),'role':'mouth'},
 {'name':'anchor_mouth_inside','bone':'oral_floor','point':(0,-2.20,-.205),'role':'swallow'},
 {'name':'anchor_attack_primary','bone':'skull','point':(0,-2.78,.32),'role':'attack'},
 {'name':'anchor_support_left','bone':'pectoral0L','point':fin_spine('pectoral',.05,1),'role':'support'},
 {'name':'anchor_support_right','bone':'pectoral0R','point':fin_spine('pectoral',.05,-1),'role':'support'},
]
