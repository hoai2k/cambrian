"""Build Askeptosaurus from the regenerated skin, a voxel twin, and the preserved posed backup.

The pair shares exact rest skeleton, animations and anchors. The backup keeps its own curved
surface and pose-matched rest skeleton; it shares public action names and anatomical semantics.
All source GLBs are immutable. Blender 5.2; run this file, audit.mjs --package --decode, render.py.
"""
import bpy,bmesh,sys,json,math,shutil,hashlib,heapq
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
sys.path.insert(0,str(HERE.parent/'_pipeline'))
import tripo as T
sys.path.insert(0,str(HERE.parent))
import shorekit as K
ID='askeptosaurus';NAME='Askeptosaurus';SCALE=6.
OUT=ROOT/'public/assets/triassic/creatures';LOCAL=ROOT/'local/triassic-authoring'/ID
LOCAL.mkdir(parents=True,exist_ok=True)
CLIPS={'Idle':2.8,'Swim':1.7,'Sprint':1.05,'TurnLeft':1.2,'TurnRight':1.2,'Dive':1.3,'Rise':1.3,
'Attack':.85,'Bite':.45,'Heavy':1.15,'Hit':.55,'Death':1.7,'Guard':1.2,'Parry':.4,'Dodge':.55,
'Eat':1.6,'Stagger':1.2,'Ability':1.1,'Grab':1.1,'Breath':2.4,'Growth':1.5,
'TailWhip':1.25,'Coil':1.3,'Dash':.65}
LOOPS=['Idle','Swim','Sprint','Guard','Eat','Grab']
TAIL=['tail_%02d'%i for i in range(12)]
NECK=['neck_%02d'%i for i in range(4)]

def at(P,cum,s):
 s=max(0,min(cum[-1],s));i=min(len(P)-2,max(0,int(np.searchsorted(cum,s))-1));t=(s-cum[i])/max(cum[i+1]-cum[i],1e-8)
 return P[i].lerp(P[i+1],t)

def smoothpulse(t,a,b,c,d):
 return T.smooth((t-a)/(b-a))*(1-T.smooth((t-c)/(d-c)))

# The resting shape (T3D-24). T3D-01 regenerated this animal **straight** so that its
# over-curved tail could be rigged at all, and that straight bind pose stays: it is what every
# clip is authored from, what the roster matrix proves, and what `lag.mjs` measures the jaw cut
# against. What was missing is that nothing ever put the animal's *shape* back, so the body read
# as a needle -- in every clip and, because portraits are shot at the bind, on the roster card.
# The shape belongs in the **clips**, never in the bind: every clip here re-specifies each joint
# on every frame, so a warped bind pose would show at rest and then flail.
#
# A gentle dorsal arch through the shoulders and neck, the head levelled again at the skull, a
# tail that falls away and bows instead of standing out straight behind, and paddles held off the
# flank rather than flush with it. The magnitudes are what a thalattosaur would hold in water,
# not the pose the generation was drawn in -- `review/backup.jpg` bends 1.81x along itself.
#
# The preserved backup gets none of this and none of the raised amplitudes: its own geometry is
# still the curved generation, its skeleton is pose-matched to that curve, and its performance is
# a preserved artefact, and `askeptosaurus.backup.glb` did not move for this change.
REST_CHEST=.050                     # shoulders lift, the head end swings down
REST_NECK=.038                      # per cervical control, four of them
REST_SKULL=-.088                    # and the skull levels off again, so the snout is not diving
REST_TAIL_FALL=.040                 # per tail control: the tail hangs away instead of standing out
REST_TAIL_BOW=.042                  # a standing lateral bow, easing out again at the tip
REST_LEAN=.045                      # a lateral lean, per trunk and cervical control
# The wave's phase step is the lever the amplitude is not. Each tail control lags the one in front
# of it by `WAVE_STEP`, so twelve of them carry `12*WAVE_STEP` radians of wave: at the .62 a first
# pass reached for, that is more than a whole wavelength on the tail and the joints' contributions
# to the tip **cancel** -- the same amplitude that reads as a swimming animal at .40 moves the tail
# tip 1.1 % of a body at .62. Tune this against `motion` in `validation.json`, never by eye.
WAVE_STEP=.40
WAVE_VERT=.26                       # the dorsoventral share of the lateral wave, a quarter beat behind
REST_FORE=(-.18,.12)                # paddles: (swept back along the flank, blade held off the body)
REST_HIND=(-.14,.09)

# **Every clip is posed for what that clip is doing.** One resting curve stamped under all
# twenty-four as a constant offset is the same mistake as no curve at all, one step along: an
# idling animal holds itself differently from one turning, diving, rising, feeding, bracing or
# dead, and on a body that is two thirds tail that difference has to run through the whole length
# rather than being a tail waggle on a straight trunk. So a clip names a **held shape** and the
# wave rides on that.
#
# The numbers are multipliers on the resting constants above, so `Idle` is the shape everything
# else is a departure from and each row reads as what it changes:
#   arch   the dorsal arch through the chest and the four cervicals
#   head   the skull's own levelling (negative lifts the snout out of the neck's dip)
#   fall   how far the tail hangs away behind
#   bow    the standing lateral bow through the middle of the tail; negative bows the other way
#   lean   a lateral lean through trunk, neck and tail -- a turn is one long C, signed
#   pitch  the body's attitude in the water, radians, nose-down positive
#   sweep  the paddles along the flank; **negative brings them forward**, which is a brace
#   lift   the blades off the body
BASE=dict(arch=1.,head=1.,fall=1.,bow=1.,lean=0.,pitch=0.,sweep=1.,lift=1.)
HOLD={
 'Idle':{},                                                          # the hold everything is measured from
 'Swim':dict(arch=.80,fall=.80,bow=.50,sweep=1.30,lift=.70),         # travelling: straighter, paddles laid back
 'Sprint':dict(arch=.55,fall=.60,bow=.20,sweep=1.55,lift=.50,pitch=-.02),
 'Guard':dict(arch=1.50,head=1.40,fall=1.30,bow=1.30,sweep=-.60,lift=1.55),   # gathered over a humped shoulder
 'Eat':dict(arch=.45,head=1.90,fall=1.25,bow=.80,pitch=.10,sweep=.40,lift=1.20),  # reaching down over the food
 'Grab':dict(arch=1.20,head=1.55,fall=1.15,bow=.60,sweep=-.30,lift=1.35),     # braced, neck level, tail stiff
 'TurnLeft':dict(lean=1.,arch=.90,bow=1.60,fall=.85),                # one long C through the whole animal
 'TurnRight':dict(lean=-1.,arch=.90,bow=-1.60,fall=.85),
 'Dive':dict(arch=1.35,head=1.70,fall=.30,pitch=.10,lift=1.30),      # nose down, tail carried high behind
 'Rise':dict(arch=.30,head=-.70,fall=1.50,pitch=-.10,lift=.70),      # and its mirror
 'Breath':dict(arch=.40,head=-.40,fall=1.30,pitch=-.06,lift=.80),
 'Growth':dict(arch=.50,head=.40,fall=.70,bow=.40,pitch=-.03),       # the body lengthening out
}
# Shapes a clip passes *through*. An attack is the body gathering and then extending -- a strike
# that moves the head on a still trunk is the fault this file was opened for, one clip along.
GATHER=dict(arch=1.60,head=1.40,fall=1.40,bow=1.50,sweep=-.80,lift=1.50)
EXTEND=dict(arch=.35,head=.50,fall=.45,bow=.25,sweep=1.60,lift=.60,pitch=.02)
BRACE=dict(arch=1.40,fall=1.25,bow=1.40,sweep=-.50,lift=1.40)        # set against the tail's own swing
RECOIL=dict(arch=1.70,head=.30,fall=1.60,bow=1.50,sweep=-1.00,lift=1.55,pitch=-.05)
STREAK=dict(arch=.35,head=.50,fall=.35,bow=.10,sweep=1.60,lift=.40)  # everything laid in along the axis
SLACK=dict(arch=.15,head=.20,fall=2.20,bow=.60,sweep=-.40,lift=.20,pitch=.06)

def mix(a,b,u):
 """Toward the named shape by `u`. `b` names only what it changes; the rest of `a` stands."""
 return {k:a[k]+(b.get(k,a[k])-a[k])*u for k in a}

def holdfor(clip,t,e,strike,whip,coil,relax):
 """The held shape this clip is in at this phase. Static for the loops, moving for the acts."""
 h=dict(BASE);h.update(HOLD.get(clip,{}))
 if clip in ('Attack','Bite'):
  h=mix(h,GATHER,smoothpulse(t,0,.14,.18,.34));h=mix(h,EXTEND,strike)
 if clip in ('Heavy','TailWhip'):h=mix(h,BRACE,e);h['lean']-=1.1*whip
 if clip in ('Ability','Coil'):h=mix(h,GATHER,coil);h['lean']+=.9*coil
 if clip in ('Hit','Stagger'):h=mix(h,RECOIL,e)
 if clip in ('Dodge','Dash'):h=mix(h,STREAK,e)
 if clip=='Parry':h=mix(h,GATHER,e)
 if clip=='Death':h=mix(h,SLACK,relax)
 return h

def restpose(pb,h):
 """Lay the held shape on the rig. Applied after `reset()` on every frame of every clip."""
 pb['body'].rotation_euler.x=h['pitch']
 pb['chest'].rotation_euler.x=REST_CHEST*h['arch'];pb['chest'].rotation_euler.z=REST_LEAN*h['lean']
 for n in NECK:
  pb[n].rotation_euler.x=REST_NECK*h['arch'];pb[n].rotation_euler.z=REST_LEAN*h['lean']*.70
 pb['skull'].rotation_euler.x=REST_SKULL*h['head']
 for i,n in enumerate(TAIL):
  u=i/11.
  pb[n].rotation_euler.x=-REST_TAIL_FALL*(.45+.55*u)*h['fall']
  pb[n].rotation_euler.z=REST_TAIL_BOW*math.sin(math.pi*min(1.,u*1.15))*h['bow']+REST_LEAN*h['lean']*.55
 for kind,(sweep,lift) in (('fore',REST_FORE),('hind',REST_HIND)):
  for side,sg in (('L',-1),('R',1)):
   pb[kind+'_upper_'+side].rotation_euler.z=sg*sweep*h['sweep']
   pb[kind+'_upper_'+side].rotation_euler.y=sg*lift*h['lift']
   pb[kind+'_mid_'+side].rotation_euler.z=sg*sweep*h['sweep']*.45
   pb[kind+'_tip_'+side].rotation_euler.z=sg*sweep*h['sweep']*.30

def heldshape(h):
 """The held shape as the absolute radians a reviewer can read, beside the multipliers."""
 return {**{k:round(v,4) for k,v in h.items()},
 'trunkArchTotalRadians':round(REST_CHEST*h['arch']+REST_NECK*len(NECK)*h['arch']+REST_SKULL*h['head'],4),
 'tailFallTotalRadians':round(sum(-REST_TAIL_FALL*(.45+.55*i/11.)*h['fall'] for i in range(12)),4),
 'trunkLeanTotalRadians':round(REST_LEAN*h['lean']*(1+.70*len(NECK))+REST_LEAN*h['lean']*.55*12,4),
 'forePaddleSweepRadians':round(REST_FORE[0]*h['sweep'],4)}

def animate(rig,backup=False):
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();seams={};holds={}
 for p in rig.pose.bones:p.rotation_mode='XYZ'
 def reset():
  for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
 for clip,duration in CLIPS.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action
  end=round(duration*30);first=None;shapes={}
  for f in range(end+1):
   t=f/end;p=math.tau*t;reset();pb=rig.pose.bones;e=math.sin(math.pi*t)**2
   strike=smoothpulse(t,.10,.30,.42,.80);relax=T.smooth(t/.8)
   whip=-.18*smoothpulse(t,.05,.22,.27,.43)+.30*smoothpulse(t,.28,.42,.50,.80)
   coil=smoothpulse(t,.03,.32,.54,.96)
   if not backup:
    h=holdfor(clip,t,e,strike,whip,coil,relax);restpose(pb,h)
    if f in (0,end//2,end):shapes[{0:'start',end//2:'mid',end:'end'}[f]]=heldshape(h)
   # One traveling wave down the long tail. The head counter-steers, keeping the jaw steady.
   # An anguilliform body's travel grows toward the tip rather than rising linearly from a third
   # of it, and the tail does not stay in one plane: a smaller dorsoventral component a quarter
   # beat behind the lateral one carries the tip round a flattened ellipse. Lateral is what a
   # thalattosaur swims with and stays the larger of the two by about four to one.
   if backup:
    amp=.7*{'Idle':.008,'Swim':.075,'Sprint':.12,'Guard':.016,'Eat':.022,'Grab':.022}.get(clip,.035*e)
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z=amp*(.30+.70*i/11)*math.sin(p-i*.50)
   else:
    # `Idle` used to carry .008 rad here -- a quarter of a degree -- so an idling animal in water
    # was a rigid rod. Nothing on this list is below a degree of travel at the tail root now.
    amp={'Idle':.030,'Swim':.097,'Sprint':.142,'Guard':.027,'Eat':.036,'Grab':.034}.get(clip,.050*e)
    for i,n in enumerate(TAIL):
     grow=.45+.55*(i/11.)**1.2
     pb[n].rotation_euler.z+=amp*grow*math.sin(p-i*WAVE_STEP)
     pb[n].rotation_euler.x+=WAVE_VERT*amp*grow*math.sin(p-i*WAVE_STEP-1.15)
    for i,n in enumerate(NECK):pb[n].rotation_euler.z+=-amp*.12*math.sin(p+.9)
    if clip=='Idle':
     # A hovering animal is never still: it tips and rolls slowly in the water around the beat.
     pb['body'].rotation_euler.x+=.016*math.sin(p)
     pb['body'].rotation_euler.y+=.026*math.sin(p+2.1)
   pb['body'].rotation_euler.z+=amp*.08*math.sin(p+.8)
   pb['chest'].rotation_euler.z+=-amp*.08*math.sin(p+.8)
   jaw=0.
   if clip in ('Attack','Bite'):
    jaw=(.26 if clip=='Bite' else .29)*smoothpulse(t,.08,.28,.36,.62)
    pb['body'].location.y=SCALE*(.012*smoothpulse(t,0,.15,.20,.36)-(.036 if clip=='Attack' else .010)*strike)
    for i,n in enumerate(NECK):pb[n].rotation_euler.x+=-.022*strike
   if clip in ('Heavy','TailWhip'):
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=whip*(.50+.50*i/11)
    pb['body'].rotation_euler.z+=-.22*whip;pb['chest'].rotation_euler.z+=.16*whip
   if clip in ('Ability','Coil'):
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=.20*coil
    for n in NECK:pb[n].rotation_euler.z+=-.065*coil
    pb['body'].rotation_euler.z+=.38*coil;pb['chest'].rotation_euler.z+=-.18*coil
   if clip in ('TurnLeft','TurnRight'):
    sg=1 if clip=='TurnLeft' else -1
    pb['body'].rotation_euler.z+=sg*.15*e;pb['body'].rotation_euler.y+=sg*.10*e
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=sg*.035*e
    for n in NECK:pb[n].rotation_euler.z-=sg*.035*e
   if clip in ('Dive','Rise','Breath'):
    sg=1 if clip=='Dive' else -1
    pb['body'].rotation_euler.x+=sg*(.12 if clip!='Breath' else .08)*e
    for n in NECK:pb[n].rotation_euler.x+=sg*.025*e
   if clip in ('Dodge','Dash'):
    pb['body'].location.y=-SCALE*.055*strike
    pb['body'].rotation_euler.y+=(.30 if clip=='Dodge' else .025)*e
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=.10*e*math.sin(p*2-i*.55)
   if clip in ('Hit','Stagger'):
    pb['body'].rotation_euler.z+=(.16 if clip=='Hit' else .26)*e*math.sin(p*2)
    pb['body'].rotation_euler.x+=.12*e*math.sin(p*3)
   if clip=='Death':
    pb['body'].rotation_euler.y+=1.15*relax;pb['body'].rotation_euler.x+=.1*relax;jaw=.10*relax
    for n in TAIL:pb[n].rotation_euler.z+=.04*relax
   if clip=='Parry':pb['body'].rotation_euler.z+=.17*e;pb['chest'].rotation_euler.z+=-.13*e
   if clip=='Eat':jaw=.13*(.5-.5*math.cos(p*2));pb['chest'].rotation_euler.x+=.015*math.sin(p)
   if clip=='Grab':
    jaw=.12+.018*math.sin(p);pb['chest'].rotation_euler.x+=.025*math.sin(p)
    for n in NECK:pb[n].rotation_euler.x+=.014*math.sin(p)
   if clip=='Growth':
    pb['body'].rotation_euler.x+=-.05*e
    for n in NECK:pb[n].rotation_euler.x+=-.03*e
   pb['jaw'].rotation_euler.x=jaw
   for kind in ('fore','hind'):
    for side,sg in [('L',-1),('R',1)]:
     n=kind+'_upper_'+side;gain=.6 if kind=='hind' else 1
     row=(.16 if clip=='Swim' else .26 if clip=='Sprint' else .05)*gain
     if clip in LOOPS:stroke=row*math.sin(p-(.7 if kind=='hind' else 0))
     else:stroke=.08*e
     if clip in ('Dash','Dodge','Attack'):stroke+=.38*strike
     if clip in ('Heavy','TailWhip','Coil','Ability'):stroke+=.18*e
     if clip=='Parry':stroke+=.28*e
     if clip=='Growth':stroke-=.16*e
     if clip=='Death':stroke=.23*T.smooth(t/.8)
     pb[n].rotation_euler.z+=sg*stroke
     pb[n].rotation_euler.y+=sg*.18*stroke
     pb[kind+'_mid_'+side].rotation_euler.z+=sg*.24*stroke
     pb[kind+'_tip_'+side].rotation_euler.y+=sg*.30*stroke
   # The curled backup has less safe bend range than the new straight body.
   if backup and clip in ('Heavy','TailWhip','Ability','Coil'):
    for q in pb:q.rotation_euler=tuple(v*.28 for v in q.rotation_euler)
   state=np.array([tuple(q.rotation_euler)+tuple(q.location) for q in pb])
   if f==0:first=state.copy()
   if f==end:seams[clip]=float(abs(state-first).max())
   for q in pb:
    if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  holds[clip]=shapes
  rig.animation_data.action=None
 for name in LOOPS:assert seams[name]<1e-6,(name,seams[name])
 if not backup:
  # The held shapes must actually differ, clip by clip -- that is the whole point of the table.
  key=lambda c:json.dumps(holds[c]['start'],sort_keys=True)
  named=['Idle','Swim','Sprint','Guard','Eat','Grab','TurnLeft','TurnRight','Dive','Rise']
  assert len({key(c) for c in named})==len(named),[c for c in named]
  for c in ('Attack','Bite','Heavy','Ability','Hit','Dodge','Death','Parry'):
   assert holds[c]['start']!=holds[c]['mid'],(c,'an act must move through its shape')
 reset();scene.frame_set(0)
 return seams,holds

def measure(rig,backup=False):
 """"It moves" as a number, read back off the keyed actions rather than off the formulas.

 The swept angle is a joint's own peak-to-peak rotation over the clip -- the same figure the
 limbed swimmers record at their limb roots -- and the travel is how far a point at the far end
 of a joint actually gets, in body lengths. `Idle` at .008 rad of yaw was the fault this file was
 opened for, so the floors below are asserted rather than reported.
 """
 scene=bpy.context.scene;out={};tips=('tail_11','skull','fore_upper_L')
 for clip in CLIPS:
  action=bpy.data.actions[clip];rig.animation_data.action=action
  if getattr(action,'slots',None):rig.animation_data.action_slot=action.slots[0]
  end=round(CLIPS[clip]*30);rot={};pos={n:[] for n in tips}
  for f in range(end+1):
   scene.frame_set(f);bpy.context.view_layer.update()
   for q in rig.pose.bones:rot.setdefault(q.name,[]).append(tuple(q.rotation_euler))
   for n in tips:pos[n].append(np.array(rig.pose.bones[n].tail[:]))
  swept=lambda n:[float(max(r[k] for r in rot[n])-min(r[k] for r in rot[n])) for k in range(3)]
  travel=lambda n:float(max(np.linalg.norm(a-b) for a in pos[n] for b in pos[n]))/SCALE
  out[clip]={'tailChainYawSweptRadians':float(sum(swept(n)[2] for n in TAIL)),
  'tailChainPitchSweptRadians':float(sum(swept(n)[0] for n in TAIL)),
  'tailRootSweptRadians':swept('tail_00'),'tailTipSweptRadians':swept('tail_11'),
  'neckYawSweptRadians':float(sum(swept(n)[2] for n in NECK)),
  'foreLimbSweptRadians':swept('fore_upper_L'),'hindLimbSweptRadians':swept('hind_upper_L'),
  'jawSweptRadians':swept('jaw')[0],
  'tailTipTravel':travel('tail_11'),'skullTravel':travel('skull'),'forePaddleTravel':travel('fore_upper_L')}
 # Clearing the action does **not** clear the pose, and the rig has just been stepped through
 # twenty-four clips: left posed, the mesh the exporter evaluates for normals is the posed one
 # and the split-vertex count comes out different from an untouched build. Put it back at rest.
 rig.animation_data.action=None
 for q in rig.pose.bones:q.rotation_euler=(0,0,0);q.location=(0,0,0);q.scale=(1,1,1)
 scene.frame_set(0);bpy.context.view_layer.update()
 if not backup:
  for clip,row in out.items():
   assert row['tailTipTravel']>.04,(clip,row['tailTipTravel'])
   assert row['tailChainYawSweptRadians']>.12,(clip,row['tailChainYawSweptRadians'])
  assert out['Idle']['tailTipTravel']>.04,out['Idle']['tailTipTravel']
  assert out['Swim']['tailTipTravel']>.12,out['Swim']['tailTipTravel']
  assert out['Sprint']['tailTipTravel']>out['Swim']['tailTipTravel'],'Sprint must out-travel Swim'
 return out

def backup_axis(o):
 # The old source's geometric double sweep ends on a forepaddle, not its snout. The true snout
 # is this visually identified source landmark in its normalized frame. Use that explicit seed.
 tip=Vector((.2459563613,-.2180387229,.1798989326))
 hinge0=Vector((.15813,-.226,.13047))
 along=(hinge0-tip).normalized();side=along.cross(Vector((0,0,1))).normalized();up=side.cross(along).normalized()
 for v in o.data.vertices:
  q=v.co-tip;v.co=Vector((q.dot(side),q.dot(along),q.dot(up)))
 o.data.update()
 P=np.array([v.co[:] for v in o.data.vertices]);seed=int(np.argmin(np.linalg.norm(P,axis=1)))
 adj=[[] for _ in P]
 for e in o.data.edges:
  a,b=e.vertices;d=float(np.linalg.norm(P[a]-P[b]));adj[a].append((b,d));adj[b].append((a,d))
 D=np.full(len(P),1e9);D[seed]=0.;queue=[(0.,seed)]
 while queue:
  d,i=heapq.heappop(queue)
  if d>D[i]+1e-12:continue
  for j,l in adj[i]:
   if d+l<D[j]-1e-12:D[j]=d+l;heapq.heappush(queue,(d+l,j))
 end=int(np.argmax(np.where(D<1e8,D,-1)));length=D[end];points=[Vector(P[seed])]
 for u in np.linspace(.015,.985,70):
  mask=(D>length*(u-.009))&(D<length*(u+.009))
  if mask.sum()>2:points.append(Vector(np.median(P[mask],axis=0)))
 points.append(Vector(P[end]));return T.polyline(points)

def build(backup=False):
 raw=HERE/'askeptosaurus.preview.glb' if backup else HERE/'tripo-regenerated-2026-09-19/askeptosaurus.raw.glb'
 auth,intake=T.load_raw(str(raw),NAME+(' backup body' if backup else ' authored body'))
 albedo,lum,albedo_sha,skin=T.retain_albedo(auth,NAME+(' backup pigmentation' if backup else ' body pigmentation'),.7)
 skin.use_backface_culling=False
 frame=T.measure_frame(auth,True,lum)
 if backup:AP,AC=backup_axis(auth)
 P=np.array([v.co[:] for v in auth.data.vertices]);Y0,Y1=float(P[:,1].min()),float(P[:,1].max())
 bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons]);th=T.neighbourhood_minimum(auth.data,T.shell_thickness(auth.data,bvh))
 cx,cz,hw,hd,centre=T.measured_centreline(auth,th<(.025 if backup else .012),band=.009,smoothing=3)
 if backup:
  geo=AC[-1]
  # The mouth uses its own head frame, independent of the curled torso and tail.
  HY=np.linspace(-.005,.10,36);rows=[]
  for y in HY:
   q=P[(abs(P[:,1]-y)<.008)&(abs(P[:,0])<.055)&(abs(P[:,2])<.045)]
   rows.append([float(np.median(q[:,0])),float(np.median(q[:,2])),float((q[:,0].max()-q[:,0].min())/2),float((q[:,2].max()-q[:,2].min())/2)] if len(q)>3 else [0,0,.005,.005])
  H=np.array(rows)
  cx=lambda y:float(np.interp(y,HY,H[:,0]));cz=lambda y:float(np.interp(y,HY,H[:,1]));hw=lambda y:float(np.interp(y,HY,H[:,2]));hd=lambda y:float(np.interp(y,HY,H[:,3]))
 else:
  # Mild generated lateral drift is carried to a neutral centerline by axial translation only.
  # There is no overlap; unlike the rejected backup unbending this map is continuous everywhere.
  for v in auth.data.vertices:v.co.x-=cx(v.co.y);v.co.z-=cz(v.co.y)
  P=np.array([v.co[:] for v in auth.data.vertices]);cx,cz,hw,hd,centre=T.measured_centreline(auth,th<.012,band=.009,smoothing=3)
  AP,AC=T.polyline([Vector((0,Y0,0)),Vector((0,Y1,0))]);geo=AC[-1]
 clusters=T.thin_clusters(auth,th<(.025 if backup else .016),cx,cz,min_size=100)
 limb_candidates=[]
 for c in clusters:
  distances=[T.project(AP,AC,Vector(P[i])) for i in c['indices']]
  k=int(np.argmax([d[0] for d in distances]));root=int(np.argmin([d[0] for d in distances]))
  reach=distances[k][0]
  if reach<.10:continue
  c['tip']=P[c['indices'][k]].tolist();c['root']=P[c['indices'][root]].tolist();c['arc']=distances[root][1]
  limb_candidates.append(c)
 limb_candidates=sorted(limb_candidates,key=lambda c:c['count'],reverse=True)[:4]
 assert len(limb_candidates)==4,[(c['count'],c['arc']) for c in limb_candidates]
 limb_candidates.sort(key=lambda c:c['arc']);fore=limb_candidates[:2];hind=limb_candidates[2:]
 shoulder=float(np.mean([c['arc'] for c in fore]));hip=float(np.mean([c['arc'] for c in hind]))
 # Use fixed measured rostrum bounds, held well forward of the flexible neck.
 hinge=.072 if backup else Y0+.065;front=.001 if backup else Y0+.002
 lip_source=auth
 if backup:
  lip_source=auth.copy();lip_source.data=auth.data.copy()
  bm=bmesh.new();bm.from_mesh(lip_source.data)
  drop=[v for v in bm.verts if abs(v.co.x)>.055 or abs(v.co.z)>.055 or not -.02<v.co.y<.11]
  bmesh.ops.delete(bm,geom=drop,context='VERTS');bm.to_mesh(lip_source.data);bm.free()
 lip=T.albedo_mouth_line(lip_source,lum,front,hinge,cz,hd,stations=20)
 if backup:bpy.data.objects.remove(lip_source)
 assert len(lip)>8,len(lip)
 ly=np.array([r['y'] for r in lip]);lz=T.blur1d(np.array([r['mid'] for r in lip]),1.)
 def seam(y):return float(np.interp(y,ly,lz))
 skull_arc=T.project(AP,AC,Vector((cx(hinge),hinge,cz(hinge))))[1]
 B={};bone=lambda n,p,parent:B.update({n:(Vector(p),parent)})
 bone('root',(0,0,0),None);bone('body',at(AP,AC,(shoulder+hip)/2),'root');bone('chest',at(AP,AC,shoulder),'body')
 for i,n in enumerate(NECK):bone(n,at(AP,AC,shoulder-(shoulder-skull_arc)*(i+1)/5),'chest' if i==0 else NECK[i-1])
 bone('skull',at(AP,AC,skull_arc),NECK[-1]);bone('jaw',(cx(hinge),hinge,seam(hinge)),'skull')
 tailstations=np.linspace(hip,AC[-1]-.008,13)
 for i,n in enumerate(TAIL):bone(n,at(AP,AC,float(tailstations[i])),'body' if i==0 else TAIL[i-1])
 limb_defs={}
 for kind,cs in [('fore',fore),('hind',hind)]:
  # Signs are relative to the local body's tangent, essential for the curled backup.
  tangent=(at(AP,AC,cs[0]['arc']+.02)-at(AP,AC,cs[0]['arc']-.02)).normalized();side_axis=tangent.cross(Vector((0,0,1))).normalized()
  cs.sort(key=lambda c:(Vector(c['tip'])-at(AP,AC,c['arc'])).dot(side_axis))
  for side,c in zip(('L','R'),cs):
   centrept=at(AP,AC,c['arc']);root=centrept.lerp(Vector(c['root']),.65);tip=Vector(c['tip'])
   pts=[root,root.lerp(tip,.46),root.lerp(tip,.78),tip];names=[kind+'_'+part+'_'+side for part in ('upper','mid','tip')]
   for i,n in enumerate(names):bone(n,pts[i],('chest' if kind=='fore' else 'tail_00') if i==0 else names[i-1])
   PP,CC=T.polyline(pts);ds=[T.project(PP,CC,Vector(P[j]))[0] for j in c['indices']]
   limb_defs[kind+side]={'P':PP,'cum':CC,'names':names,'radius':float(np.quantile(ds,.995))+.003,'arc':c['arc']}
 tx=lambda p:Vector(p)*SCALE
 rig=K.build_armature(B,tx,NAME+' shared skeleton',NAME+'_Rig')
 stations=[('skull',skull_arc)]+[(n,T.project(AP,AC,B[n][0])[1]) for n in reversed(NECK)]+[('chest',shoulder),('body',(shoulder+hip)/2)]+[(n,float((tailstations[i]+tailstations[i+1])/2)) for i,n in enumerate(TAIL)]
 stations.sort(key=lambda kv:kv[1])
 def weights(p):
  d,s=T.project(AP,AC,p);w=dict(T.station_weights(stations,s))
  if front-.02<p.y<hinge+.003 and (not backup or (abs(p.x)<.07 and abs(p.z)<.06)):w={'skull':1.}
  best=0;chosen=None
  for item in limb_defs.values():
   dist,u=T.project(item['P'],item['cum'],p);radius=item['radius'];reach=item['cum'][-1]
   alpha=T.smooth((radius+.018-dist)/.018)*T.smooth(u/max(.025,reach*.20))
   if alpha>best:best=alpha;chosen=(item,u)
  if chosen and best>0:
   item,u=chosen;chain=T.limb_chain(item['names'],item['cum'],u,blend=.015)
   w={n:v*(1-best) for n,v in w.items()}
   for n,v in chain.items():w[n]=w.get(n,0)+v*best
  items=sorted(((n,v) for n,v in w.items() if v>1e-7),key=lambda nv:-nv[1])[:4];total=sum(v for n,v in items)
  return {n:v/total for n,v in items}
 objects=[auth];twin_report={}
 if not backup:
  twin,_,twin_report,_=T.build_twin(auth,th,NAME+' procedural volume twin',.0026,5500,albedo,blade_dilation=.001,thin=.016,band=.01)
  objects.append(twin)
 head_bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons])
 def room(y):
  return T.mouth_room(head_bvh,Vector((cx(y),y,seam(y))),Vector((1,0,0)),Vector((0,0,1)),limit=.08,fallback=.003)
 def section(y):
  w,up,down=room(y);return max(.0005,w*.84),max(.0005,up*.32),max(.0005,down*.32)
 oralmat=T.inward_material(NAME+' mouth interior',(.20,.075,.055,1))
 lining,lining_raw=T.lining('Oral cavity lining',rig,tx,seam,section,hinge-.0003,front+.001,lambda p:0,oralmat,centre_x=cx,room=room,fill=.86,rings=24,ring=12)
 parts={};groups=[];caps={}
 for o in objects:
  T.bisect_on_curve(o,seam,hinge,front-.004,margin=.012)
  T.split_part(o,'lower jaw',lambda c:front-.015<c.y<hinge and c.z<seam(c.y)-1e-7 and (not backup or (abs(c.x)<.055 and abs(c.z)<.055)),parts)
  jaw=parts['lower jaw'][o.name]
  assert len(jaw.data.polygons)>12,(o.name,len(jaw.data.polygons))
  caps[o.name]=T.cap_cut(o,lambda p:abs(p.y-hinge)<.00001,Vector((0,-1,0)))
  caps[jaw.name]=T.cap_cut(jaw,lambda p:abs(p.y-hinge)<.00001,Vector((0,1,0)))
  # A narrow rigid inner floor/roof occupies each jaw's own volume. The throat section itself
  # is capped above; there is no rubber membrane pulling from skull to jaw across the gape.
  influences=[];K.bind(o,rig,B,weights,tx,influences,passes=24)
  def jaw_weights(p):
   a=T.smooth((hinge-p.y)/.014)
   return {'skull':1-a,'jaw':a} if 0<a<1 else {'jaw' if a>=1 else 'skull':1.}
  K.bind(jaw,rig,B,jaw_weights,tx,influences,passes=0)
  # Duplicate posterior cut vertices must follow precisely the same bone weights in both
  # meshes. A cap alone blocks see-through but cannot keep a separately rigid jaw attached.
  tree=KDTree(len(o.data.vertices))
  for v in o.data.vertices:tree.insert(v.co,v.index)
  tree.balance()
  for v in jaw.data.vertices:
   if abs(v.co.y-hinge*SCALE)>1e-5:continue
   loc,idx,dist=tree.find(v.co)
   if dist>1e-5:continue
   for group in jaw.vertex_groups:group.remove([v.index])
   for weight in o.data.vertices[idx].groups:
    name=o.vertex_groups[weight.group].name
    jaw.vertex_groups[name].add([v.index],weight.weight,'REPLACE')
  groups.append([o,jaw,lining])
 anchorpts={'anchor_mouth':('jaw',(cx(front+.008),front+.008,seam(front+.008)-.002),'mouth'),
 'anchor_mouth_inside':('skull',(cx(hinge-.015),hinge-.015,seam(hinge-.015)),'swallow'),
 'anchor_attack_primary':('skull',(cx(front+.002),front+.002,seam(front+.002)),'attack')}
 anchors=[{'name':n,'bone':b,'point':list(tx(p)),'role':r} for n,(b,p,r) in anchorpts.items()]
 seams,holds=animate(rig,backup);motion=measure(rig,backup);sockets=T.make_sockets(rig,anchors)
 tri=lambda o:sum(len(p.vertices)-2 for p in o.data.polygons)
 reports=[]
 for idx,group in enumerate(groups):
  suffix='.backup' if backup else '' if idx==0 else '.puppet'
  bpy.ops.object.select_all(action='DESELECT')
  for o in group+[rig]+sockets:o.select_set(True)
  bpy.context.view_layer.objects.active=rig;path=OUT/(ID+suffix+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),**T.EXPORT_KWARGS);T.patch_glb(str(path),anchors)
  reports.append({'suffix':suffix,'triangles':sum(tri(o) for o in group)})
 report={'id':ID,'backup':backup,'intake':intake,'sourceAlbedoSha256':albedo_sha,'frame':frame,'bones':len(B),'boneNames':list(B),
 'limbs':{k:{'points':[list(p) for p in v['P']],'radius':v['radius']} for k,v in limb_defs.items()},
 'hipFraction':hip/AC[-1],'tailFraction':1-hip/AC[-1],'mouth':{'hingeY':hinge,'lip':lip,'throatCaps':caps,'maxGapeRadians':.29},
 'models':reports,'clips':CLIPS,'looping':LOOPS,'loopSeams':seams,'motion':motion,'heldShape':holds,'restingShape':({} if backup else {'appliesTo':'clips only; the bind pose is unchanged','note':'unit values; every clip scales them by its own row in heldShape','chestArchRadians':REST_CHEST,'neckArchRadiansPerJoint':REST_NECK,'neckJoints':len(NECK),'skullLevellingRadians':REST_SKULL,'tailFallRadiansPerJoint':REST_TAIL_FALL,'tailBowRadians':REST_TAIL_BOW,'leanRadiansPerJoint':REST_LEAN,'foreLimbSetRadians':list(REST_FORE),'hindLimbSetRadians':list(REST_HIND),'waveStep':WAVE_STEP,'waveVerticalShare':WAVE_VERT}),'anchors':anchors,'maxInfluences':4,'rootStable':True,'noScaleChannels':True,**twin_report}
 if not backup:
  shutil.copyfile(OUT/(ID+'.puppet.glb'),OUT/(ID+'.lod1.glb'))
  profile,worst=T.paired_profile(groups[0],groups[1],(Y0+.01)*SCALE,(Y1-.01)*SCALE,.04*SCALE)
  dist=K.surface_distances(groups[0],groups[1]);assert max(dist)<.04*SCALE,max(dist)
  report['envelope']={'maximumEnvelopeDifference':worst,'surfaceDistanceMax':max(dist),'surfaceDistanceP95':float(np.quantile(dist,.95)),'envelopeTolerance':.04*SCALE}
  (HERE/(ID+'-profile.json')).write_text(json.dumps({'bodyLength':SCALE,'stations':profile,**report['envelope']},indent=2)+'\n')
  meta={'id':ID,'name':NAME,'species':'Askeptosaurus italicus','provenance':'Middle Triassic · Monte San Giorgio','description':'Slender thalattosaur with a long lateral swimming tail. Authored body and volume twin share one rig; original posed generation retained as an animated backup.','modelLength':SCALE,'lengthMeters':2.5,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':list(anchorpts),'puppet':ID+'.puppet.glb','sources':[str(raw.relative_to(ROOT)),'docs/triassic/canonical/askeptosaurus.png'],'notes':['The preserved backup has a pose-matched rest skeleton and the same public clip names.','Heavy and TailWhip strike with the long tail; Ability and Coil curl and recover. World turning is simulation-owned.','Living colours, soft tissues and movements are artistic reconstruction.']}
  (OUT/(ID+'.json')).write_text(json.dumps(meta,indent=2)+'\n');(HERE/'anchors.json').write_text(json.dumps({ID:anchors},indent=2)+'\n')
 (HERE/('backup-validation.json' if backup else 'validation.json')).write_text(json.dumps(report,indent=2)+'\n')
 bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/(ID+('-backup' if backup else '-paired')+'.blend')))
 print('ASKEPTOSAURUS_BUILD_OK',json.dumps({'backup':backup,'models':reports,'bones':len(B),'tailFraction':report['tailFraction']}))

build('--backup' in sys.argv)
