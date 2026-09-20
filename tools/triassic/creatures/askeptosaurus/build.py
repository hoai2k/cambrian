"""Build Askeptosaurus twice: the posed generation and the straight regeneration, one in front.

Two **bodies**, not a body and a position. Each keeps its own rigging and animation map -- its own
axis, its own centreline thresholds, its own mouth frame, its own jaw cut, its own resting
constants -- and `FRONT` alone says which of them ships as `askeptosaurus.glb` and which as
`askeptosaurus.backup.glb`. Swapping them is that one line; nothing else in this file names a
position. The body in front is the one that gets a procedural volume twin (which is also its LOD1,
byte for byte) and the public metadata; the other is packaged on its own.

All source GLBs are immutable. Blender 5.2; run this file for each body, then audit.mjs
--package --decode, then render.py.
"""
import bpy,bmesh,sys,json,math,shutil,hashlib,heapq
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
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
# The chain the head rides, root first. It starts at the **shoulder**, not at the first cervical:
# the angle the front leaves the trunk at is a property of the chest joint as much as of the neck,
# and a correction that six joints share is a correction no one joint has to tear its skin over.
NECKCHAIN=['chest']+NECK+['skull']

# ---------------------------------------------------------------- the two bodies, and the swap ---
POSED='posed'          # the preserved generation: curved, organic, and shipped since T3D-25
STRAIGHT='straight'    # the 19 September 2026 regeneration, drawn and generated straight
FRONT=POSED            # <-- the swap is this one line. The other body becomes the backup.
BACK=STRAIGHT if FRONT==POSED else POSED

def at(P,cum,s):
 s=max(0,min(cum[-1],s));i=min(len(P)-2,max(0,int(np.searchsorted(cum,s))-1));t=(s-cum[i])/max(cum[i+1]-cum[i],1e-8)
 return P[i].lerp(P[i+1],t)

def smoothpulse(t,a,b,c,d):
 return T.smooth((t-a)/(b-a))*(1-T.smooth((t-c)/(d-c)))

# The resting shape. A clip is not only a movement, it is a **shape the animal is holding while it
# moves**, and on a body that is two thirds tail that shape has to run through the whole length.
# The shape belongs in the clips and never in the bind: every clip here re-specifies each joint on
# every frame, so a warped bind pose would show at rest and then flail, and the roster matrix's
# identity rest jaw and `lag.mjs`' jaw cut are both measured against the bind.
#
# The two bodies need the *opposite* correction and so keep separate constants. The straight
# regeneration was drawn as a needle and has its curvature added back (T3D-24). The posed
# generation arrives with more curvature than an animal swims with -- its tail carries 159 degrees
# of turn over twelve controls and hooks back under the belly -- so its resting shape is mostly a
# matter of **opening that curve out again**, which `uncurl` and `carry_rest` below do on the rig
# rather than in the mesh.
REST={
 STRAIGHT:dict(
  chest=.050,      # shoulders lift, the head end swings down
  neck=.038,       # per cervical control, four of them
  skull=-.088,     # and the skull levels off again, so the snout is not diving
  fall=.040,       # per tail control: the tail hangs away instead of standing out
  bow=.042,        # a standing lateral bow, easing out again at the tip
  lean=.045,       # a lateral lean, per trunk and cervical control
  fore=(-.18,.12), # paddles: (swept back along the flank, blade held off the body)
  hind=(-.14,.09),
  uncurl=0.,       # nothing to open out: this body was generated straight
  level=0.,carry=0.,
  aim=0.,fcarry=(0.,0.),  # and nothing to aim: its front already leaves the trunk along the trunk
  step=.40,        # the wave's phase step -- see below
  vert=.26,        # the dorsoventral share of the lateral wave, a quarter beat behind
  amp={'Idle':.030,'Swim':.097,'Sprint':.142,'Guard':.027,'Eat':.036,'Grab':.034},act=.050),
 POSED:dict(
  # The generation already arches through the shoulders and already falls away behind, so these
  # are the *adjustments* on top of a shape the mesh is carrying, not the shape itself.
  chest=.022,neck=.016,skull=-.042,fall=.014,bow=.016,lean=.045,
  fore=(-.14,.10),hind=(-.11,.08),
  uncurl=1.,       # the tail chain is straightened on the rig by `open` of its own measured turn
  level=1.,        # and the cervical chain by `level` of its own
  # How much of that straightening is carried into the **bind** rather than left to the clips.
  # The renderer sizes a body by its bind box (`carry_rest`), so the rest has to be the pose the
  # animal is usually in. Measured over five phases of every clip at .70, .82 and .92, .70 is the
  # one that centres the straight-line clips on the bind: `Idle` 0.94-0.96, `Swim` 1.00-1.05,
  # `Sprint` 1.03-1.06, `Dive` 1.01-1.02, `Rise` 0.96-0.98, against 1.38-1.56 with the whole
  # straightening left in the clips. `Idle` sitting just under 1 is right -- a resting animal
  # holds more of its curve than a swimming one, which is the character this body was promoted
  # for -- and further carries only push every clip under the bind instead of centring them.
  carry=.70,
  # **The front is aimed as well as opened, and the two are not the same dial** (T3D-26). Opening
  # the cervical chain removes its own internal bend and leaves it pointing wherever the
  # generation pointed it -- 54.7 degrees off the trunk's own run, which is the right angle the
  # head and the shoulder with the right pectoral on it read at from above. `aim` is that
  # correction, shared out over `NECKCHAIN`'s six joints by `uncurl`, and it is a **fact about the
  # body rather than a performance**: an animal looks where it swims in every clip, so it is held
  # at 1 everywhere and carried whole into the bind (`fcarry`'s second element), and only the
  # opening -- `level` in the held-shape table -- is left for the clips to play with. Carry the aim
  # at anything less than 1 and the clips have to hold the difference, which puts the fault back in
  # the bind the renderer sizes by and in every portrait shot at rest.
  aim=1.,
  # (level, aim) carried into the bind. The level is carried a little straighter than `Idle` asks
  # for, exactly as the tail's .70 is, so the clips centre on the bind instead of all straightening
  # away from it.
  fcarry=(.70,1.),
  step=.40,vert=.26,
  amp={'Idle':.030,'Swim':.097,'Sprint':.142,'Guard':.027,'Eat':.036,'Grab':.034},act=.050),
}
# The wave's phase step is the lever the amplitude is not. Each tail control lags the one in front
# of it by `step`, so twelve of them carry `12*step` radians of wave: at the .62 a first pass
# reached for, that is more than a whole wavelength on the tail and the joints' contributions to
# the tip **cancel** -- the same amplitude that reads as a swimming animal at .40 moves the tail
# tip 1.1 % of a body at .62. Tune it against `motion` in `validation.json`, never by eye.

# **Every clip is posed for what that clip is doing.** One resting curve stamped under all
# twenty-four as a constant offset is the same mistake as no curve at all, one step along: an
# idling animal holds itself differently from one turning, diving, rising, feeding, bracing or
# dead. So a clip names a **held shape** and the wave rides on that. The table is the performance
# and is shared by both bodies; the magnitudes it multiplies are each body's own.
#   arch   the dorsal arch through the chest and the four cervicals
#   head   the skull's own levelling (negative lifts the snout out of the neck's dip)
#   fall   how far the tail hangs away behind
#   bow    the standing lateral bow through the middle of the tail; negative bows the other way
#   lean   a lateral lean through trunk, neck and tail -- a turn is one long C, signed
#   pitch  the body's attitude in the water, radians, nose-down positive
#   sweep  the paddles along the flank; **negative brings them forward**, which is a brace
#   lift   the blades off the body
#   open   how far the tail's own measured curve is straightened out: 0 is the generation's
#          hook, 1 is a ruler. This is where the posed body's character lives -- it holds a
#          curve at rest, lays itself out to sprint, and coils back into its own shape.
#   level  the same for the cervical chain, so the head comes level when the animal is going
#          somewhere and drops back into the generation's own carriage when it is not.
BASE=dict(arch=1.,head=1.,fall=1.,bow=1.,lean=0.,pitch=0.,sweep=1.,lift=1.,open=.55,level=.55)
HOLD={
 'Idle':{},                                                          # the hold everything is measured from
 'Swim':dict(arch=.80,fall=.80,bow=.50,sweep=1.30,lift=.70,open=.78,level=.80),
 'Sprint':dict(arch=.55,fall=.60,bow=.20,sweep=1.55,lift=.50,pitch=-.02,open=.96,level=.95),
 'Guard':dict(arch=1.50,head=1.40,fall=1.30,bow=1.30,sweep=-.60,lift=1.55,open=.30,level=.35),
 'Eat':dict(arch=.45,head=1.90,fall=1.25,bow=.80,pitch=.10,sweep=.40,lift=1.20,open=.50,level=.25),
 'Grab':dict(arch=1.20,head=1.55,fall=1.15,bow=.60,sweep=-.30,lift=1.35,open=.62,level=.70),
 'TurnLeft':dict(lean=1.,arch=.90,bow=1.60,fall=.85,open=.60,level=.62),
 'TurnRight':dict(lean=-1.,arch=.90,bow=-1.60,fall=.85,open=.60,level=.62),
 'Dive':dict(arch=1.35,head=1.70,fall=.30,pitch=.10,lift=1.30,open=.72,level=.80),
 'Rise':dict(arch=.30,head=-.70,fall=1.50,pitch=-.10,lift=.70,open=.58,level=.50),
 'Breath':dict(arch=.40,head=-.40,fall=1.30,pitch=-.06,lift=.80,open=.60,level=.50),
 'Growth':dict(arch=.50,head=.40,fall=.70,bow=.40,pitch=-.03,open=.70,level=.70),
}
# Shapes a clip passes *through*. An attack is the body gathering and then extending -- a strike
# that moves the head on a still trunk is the fault this file was opened for, one clip along.
GATHER=dict(arch=1.60,head=1.40,fall=1.40,bow=1.50,sweep=-.80,lift=1.50,open=.26,level=.30)
EXTEND=dict(arch=.35,head=.50,fall=.45,bow=.25,sweep=1.60,lift=.60,pitch=.02,open=.96,level=.94)
BRACE=dict(arch=1.40,fall=1.25,bow=1.40,sweep=-.50,lift=1.40,open=.80,level=.72)  # set against the tail's own swing
RECOIL=dict(arch=1.70,head=.30,fall=1.60,bow=1.50,sweep=-1.00,lift=1.55,pitch=-.05,open=.34,level=.30)
STREAK=dict(arch=.35,head=.50,fall=.35,bow=.10,sweep=1.60,lift=.40,open=1.,level=.98)  # laid in along the axis
SLACK=dict(arch=.15,head=.20,fall=2.20,bow=.60,sweep=-.40,lift=.20,pitch=.06,open=.40,level=.22)

def mix(a,b,u):
 """Toward the named shape by `u`. `b` names only what it changes; the rest of `a` stands."""
 return {k:a[k]+(b.get(k,a[k])-a[k])*u for k in a}

def holdfor(clip,t,e,strike,whip,coil,relax,hook=1.):
 """The held shape this clip is in at this phase. Static for the loops, moving for the acts.

 `hook` is which way this body's own tail curves, and it signs everything a tail strike and a
 coil do. A coil has no handedness of its own -- unlike a turn, which must go where it says --
 so on a body with a resting curve it should close **into** that curve. Against it, the two
 cancel: at `Coil`'s peak the posed generation's residual bend and the clip's own swing left the
 tail measuring 1.10 arc over chord, which is a straighter tail than `Idle`'s 1.12, so the
 animal's one curling move was the move that uncurled it.
 """
 h=dict(BASE);h.update(HOLD.get(clip,{}))
 if clip in ('Attack','Bite'):
  h=mix(h,GATHER,smoothpulse(t,0,.14,.18,.34));h=mix(h,EXTEND,strike)
 if clip in ('Heavy','TailWhip'):h=mix(h,BRACE,e);h['lean']-=1.1*whip*hook
 if clip in ('Ability','Coil'):h=mix(h,GATHER,coil);h['lean']+=.9*coil*hook
 if clip in ('Hit','Stagger'):h=mix(h,RECOIL,e)
 if clip in ('Dodge','Dash'):h=mix(h,STREAK,e)
 if clip=='Parry':h=mix(h,GATHER,e)
 if clip=='Death':h=mix(h,SLACK,relax)
 return h

def uncurl(dirs,target,u,u0=0.,share=None,a=0.,a0=0.):
 """Local rotations that open a measured chain out by `u` and aim it at `target` by `a`.

 This is the whole of the promoted body's straightening, and it is **pose, not mesh**. The verdict
 measured this tail at 8.84 mean curvature over section -- Dinocephalosaurus' tail, which
 straightened on the rig -- while the trunk reads 0.41 tightest, which is a bend radius *smaller
 than the section*, and carrying sections onto a straight axis through a bend like that is exactly
 the overlap that shredded the abandoned build. So nothing here touches a vertex.

 `build_armature` gives every bone the same rest orientation (head at its own point, tail at
 head + Y, roll 0), so a pose bone's local frame is the armature's and the accumulated rotation
 down a chain is the product of the locals. Asking segment `i` to point at `t_i` therefore makes
 the accumulated rotation the minimal arc `A_i` from `d_i` to `t_i`, and the local one
 `M_(i-1)^-1 @ A_i`. No angle here is typed: the chain is the measurement.

 **The two halves of `t_i` are different questions and are kept apart.** A measured chain carries
 an *internal curve* -- how much it bends along its own length -- and a *takeoff*, which is the
 angle it leaves the body at. `u` opens the first: `d_i` slerped toward the chain's **own first
 segment**, so at `u` = 1 the chain is a straight line lying in the direction the generation
 pointed it, and the rotation at the root is identity at every `u`. `a` corrects the second, and
 the way it corrects it is the whole of T3D-26: the arc `A` from the chain's own first segment
 onto `target` is applied as `A^(share_i * a)`, a **share of it per joint**, so the chain turns
 onto the target over its whole length instead of being swung there at its root.

 That distinction is not stylistic. Aiming the base segment straight at the trunk makes the first
 local rotation the entire arc -- 54.7 degrees at this front's root -- and T3D-25 measured that at
 **2.62x** on `skin-tears.mjs` against 1.51x for no aim at all. Spread linearly over the chest,
 four cervicals and the skull the same correction is about nine degrees a joint, and the head ends
 up on the trunk's line with the neck holding a gentle arc rather than a kink at the shoulder.
 `share` is cumulative and ends at 1, so the **last** segment reaches the target exactly; passing
 `share=None` (the tail, whose takeoff is its own and stays) leaves this half switched off and the
 call is then exactly what it always was.

 `u0`/`a0` are where the **rest** already stands, because part of the straightening is carried into
 the bind (see `carry_rest`) and the clips must not do it twice. `dirs` stays the generation's own
 chain whatever the rest is, so every `u` in the held-shape table keeps its one meaning -- how
 much of the generation's curve is out -- and a clip asking for less than `u0` curls back toward
 the generation rather than being unable to.
 """
 own=dirs[0].copy()
 A=own.rotation_difference(target)
 axis,angle=(A.axis,A.angle) if A.angle>1e-9 else (Vector((0,0,1)),0.)
 w=[0.]*len(dirs) if share is None else list(share)
 def aim(i,d,v,s):
  base=d.slerp(own,v).normalized() if v>1e-9 else d
  q=Quaternion(axis,angle*w[i]*s) if angle>1e-9 and abs(w[i]*s)>1e-9 else Quaternion()
  return d.rotation_difference((q@base).normalized())
 out=[];M=Quaternion()
 for i,d in enumerate(dirs):
  W=aim(i,d,u,a)@aim(i,d,u0,a0).inverted()
  out.append((M.inverted()@W).to_euler('XYZ'));M=W
 return out

def carry_rest(rig,objects,names,rots):
 """Carry the rest skeleton to a straighter rest and let the skin follow.

 **The renderer normalises a creature by its bind box**, not by anything the builder declares:
 `loadCreature` in `src/render/creature.ts` divides by the widest horizontal side of the bind and
 the actor's own length multiplies that back, so what is drawn is the animal's length times
 *posed extent over bind extent*. A body whose bind is the generation's own curl therefore grows
 whenever a clip straightens it: measured over five phases of every clip, this one ran 1.38 to
 1.56 of its bind with the whole straightening in the clips -- a swimming Askeptosaurus half as
 long again as the body the simulation collides with -- where the straight regeneration sits at
 0.92 to 0.99. The fix is not to straighten less; it is to move the **rest** to where the animal
 usually is, which is what this does.

 The skin follows through its own skinning and nothing else: the armature deforms it, the
 deformed positions are written back, and the bones are re-laid at the heads they were posed to
 with the same parallel rest orientation `build_armature` gives them, so the bind is identity
 again and every clip still composes as a product of world-frame rotations. No vertex is moved by
 anything but the weights that already held it -- there is no remesh, no smoothing, no resampling,
 and the generation's surface, UVs and albedo are untouched, which is the whole reason this body
 was promoted. Only the tail is carried, so the head, the mouth, its anchors, the jaw cut and both
 paddle pairs stay exactly where they were measured.
 """
 # `rotation_mode` is quaternion until `animate` sets it, and a pose bone in quaternion mode
 # ignores `rotation_euler` **without complaining**: the rest went nowhere, the mesh was rewritten
 # with the numbers it already had, and the clips then straightened from a baseline that had not
 # moved -- which reads as the carry making the animal *more* curled the further it is carried.
 for p in rig.pose.bones:p.rotation_mode='XYZ'
 for n,e in zip(names,rots):rig.pose.bones[n].rotation_euler=e
 bpy.context.view_layer.update()
 # **Whatever the carry moves, it moves the anchors with it.** The three anchors are points in the
 # *measured* frame attached to `skull` and `jaw`, and carrying the front moves both of those
 # bones, so a point left where it was measured would sit behind the animal's nose in the file
 # that ships. This is the affine map the skin itself is about to be baked through, per bone, and
 # applying it to a rest-space point is exactly what a weight-1 vertex on that bone does. With the
 # tail alone carried (the shipped build before T3D-26, and the `--backup` path) every map on the
 # front is the identity and nothing moves.
 carried_by={p.name:(p.matrix@rig.data.bones[p.name].matrix_local.inverted()) for p in rig.pose.bones}
 deps=bpy.context.evaluated_depsgraph_get()
 baked={}
 for o in objects:
  ev=o.evaluated_get(deps);baked[o.name]=[v.co.copy() for v in ev.data.vertices]
  assert len(baked[o.name])==len(o.data.vertices),(o.name,len(baked[o.name]),len(o.data.vertices))
 moved=0.
 for o in objects:
  for v,co in zip(o.data.vertices,baked[o.name]):
   moved=max(moved,(v.co-co).length);v.co=co
  o.data.update()
 assert moved>1e-4,('the carry moved no skin',moved)
 heads={p.name:p.head.copy() for p in rig.pose.bones}
 for p in rig.pose.bones:p.rotation_euler=(0,0,0)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.object.mode_set(mode='EDIT')
 for eb in rig.data.edit_bones:
  eb.head=heads[eb.name];eb.tail=eb.head+Vector((0,.16,0));eb.roll=0.
 bpy.ops.object.mode_set(mode='OBJECT')
 bpy.context.view_layer.update()
 # **Every bone must still be parallel.** The whole of `uncurl` and every `rotation_euler.z` in
 # `animate` rests on `build_armature`'s one property: all bones point +Y with roll 0, so a pose
 # bone's local frame is the armature's and the accumulated rotation down a chain is the product
 # of the locals. Re-laying a bone head-first leaves the roll Blender derived from the
 # intermediate vector unless it is set, and a rolled rest frame turns every later yaw into a
 # mixture -- silently, since the rig still animates.
 worst=max(max(abs(rig.data.bones[n].matrix_local.to_3x3()[i][j]-(1. if i==j else 0.))
  for i in range(3) for j in range(3)) for n in rig.data.bones.keys())
 assert worst<1e-5,('the carried rest is not parallel',worst)
 return carried_by,{'carriedSkinTravelMax':round(moved,5),'carriedRestFrameError':round(worst,9),
  'carriedBones':[n for n in names]}

def chain_dirs(pts):
 return [(pts[i+1]-pts[i]).normalized() for i in range(len(pts)-1)]

def chain_bend(dirs):
 """How much turning a measured chain carries, in degrees, and its arc over its own chord."""
 return round(sum(math.degrees(dirs[i].angle(dirs[i+1])) for i in range(len(dirs)-1)),2)

def restpose(pb,h,r,tailchain,neckchain):
 """Lay the held shape on the rig. Applied after `reset()` on every frame of every clip."""
 if r['uncurl']>0:
  for n,e in zip(TAIL,uncurl(tailchain[0],tailchain[1],r['uncurl']*h['open'],r['carry'])):
   pb[n].rotation_euler=e
 if r['level']>0:
  # `neckchain` is (directions, target, share). The aim is the same in every clip and is already
  # in the bind, so what varies here is only how far the chain's own bend is opened.
  lv0,am0=r['fcarry']
  for n,e in zip(NECKCHAIN,uncurl(neckchain[0],neckchain[1],r['level']*h['level'],lv0,
   neckchain[2],r['aim'],r['aim']*am0)):
   pb[n].rotation_euler=e
 pb['body'].rotation_euler.x=h['pitch']
 # `+=`, because the front chain above has just written this bone: the shoulder is the root joint
 # of the aim and an assignment here would throw its share away.
 pb['chest'].rotation_euler.x+=r['chest']*h['arch'];pb['chest'].rotation_euler.z+=r['lean']*h['lean']
 for n in NECK:
  pb[n].rotation_euler.x+=r['neck']*h['arch'];pb[n].rotation_euler.z+=r['lean']*h['lean']*.70
 pb['skull'].rotation_euler.x+=r['skull']*h['head']
 for i,n in enumerate(TAIL):
  u=i/11.
  pb[n].rotation_euler.x+=-r['fall']*(.45+.55*u)*h['fall']
  pb[n].rotation_euler.z+=r['bow']*math.sin(math.pi*min(1.,u*1.15))*h['bow']+r['lean']*h['lean']*.55
 for kind,key in (('fore','fore'),('hind','hind')):
  sweep,lift=r[key]
  for side,sg in (('L',-1),('R',1)):
   pb[kind+'_upper_'+side].rotation_euler.z=sg*sweep*h['sweep']
   pb[kind+'_upper_'+side].rotation_euler.y=sg*lift*h['lift']
   pb[kind+'_mid_'+side].rotation_euler.z=sg*sweep*h['sweep']*.45
   pb[kind+'_tip_'+side].rotation_euler.z=sg*sweep*h['sweep']*.30

def heldshape(h,r):
 """The held shape as the absolute radians a reviewer can read, beside the multipliers."""
 return {**{k:round(v,4) for k,v in h.items()},
 'trunkArchTotalRadians':round(r['chest']*h['arch']+r['neck']*len(NECK)*h['arch']+r['skull']*h['head'],4),
 'tailFallTotalRadians':round(sum(-r['fall']*(.45+.55*i/11.)*h['fall'] for i in range(12)),4),
 'trunkLeanTotalRadians':round(r['lean']*h['lean']*(1+.70*len(NECK))+r['lean']*h['lean']*.55*12,4),
 'tailStraightenedFraction':round(r['uncurl']*h['open'],4),
 'neckStraightenedFraction':round(r['level']*h['level'],4),
 'frontAimedFraction':round(r['aim'],4),
 'forePaddleSweepRadians':round(r['fore'][0]*h['sweep'],4)}

def animate(rig,body,front,tailchain,neckchain,hook):
 r=REST[body]
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
   h=holdfor(clip,t,e,strike,whip,coil,relax,hook);restpose(pb,h,r,tailchain,neckchain)
   if f in (0,end//2,end):shapes[{0:'start',end//2:'mid',end:'end'}[f]]=heldshape(h,r)
   # One traveling wave down the long tail. The head counter-steers, keeping the jaw steady.
   # An anguilliform body's travel grows toward the tip rather than rising linearly from a third
   # of it, and the tail does not stay in one plane: a smaller dorsoventral component a quarter
   # beat behind the lateral one carries the tip round a flattened ellipse. Lateral is what a
   # thalattosaur swims with and stays the larger of the two by about four to one.
   # `Idle` used to carry .008 rad here -- a quarter of a degree -- so an idling animal in water
   # was a rigid rod. Nothing on this list is below a degree of travel at the tail root now.
   amp=r['amp'].get(clip,r['act']*e)
   for i,n in enumerate(TAIL):
    grow=.45+.55*(i/11.)**1.2
    pb[n].rotation_euler.z+=amp*grow*math.sin(p-i*r['step'])
    pb[n].rotation_euler.x+=r['vert']*amp*grow*math.sin(p-i*r['step']-1.15)
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
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=hook*whip*(.50+.50*i/11)
    pb['body'].rotation_euler.z+=-hook*.22*whip;pb['chest'].rotation_euler.z+=hook*.16*whip
   if clip in ('Ability','Coil'):
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=hook*.20*coil
    for n in NECK:pb[n].rotation_euler.z+=-hook*.065*coil
    pb['body'].rotation_euler.z+=hook*.38*coil;pb['chest'].rotation_euler.z+=-hook*.18*coil
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
   state=np.array([tuple(q.rotation_euler)+tuple(q.location) for q in pb])
   if f==0:first=state.copy()
   if f==end:seams[clip]=float(abs(state-first).max())
   for q in pb:
    if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  holds[clip]=shapes
  rig.animation_data.action=None
 for name in LOOPS:assert seams[name]<1e-6,(name,seams[name])
 # The held shapes must actually differ, clip by clip -- that is the whole point of the table.
 key=lambda c:json.dumps(holds[c]['start'],sort_keys=True)
 named=['Idle','Swim','Sprint','Guard','Eat','Grab','TurnLeft','TurnRight','Dive','Rise']
 assert len({key(c) for c in named})==len(named),[c for c in named]
 for c in ('Attack','Bite','Heavy','Ability','Hit','Dodge','Death','Parry'):
  assert holds[c]['start']!=holds[c]['mid'],(c,'an act must move through its shape')
 reset();scene.frame_set(0)
 return seams,holds

def paddle_audit(rig,obj,limb_defs,phases=5):
 """The four paddles measured against each other, on the skin rather than on the bone table.

 The owner named the **right pectoral** by itself, and the three ways a blade can be wrong are
 different measurements: it can own too little skin (a root seated at the wrong depth, or a cut
 that put it on another bone's shell), it can stand outside the skin it drives, or it can simply
 be left behind -- its skin travelling a fraction of what its own joint travels, which is how
 Aphaneramma's tucked forelimb read at 0.45 against 1.04-1.11 on every other foot. Only the last
 of those is visible in motion, and neither `skin-tears.mjs` nor `idle-bones.mjs` can see it.

 Owned means "this bone holds the largest share of this vertex", which is what a viewer sees
 follow it. The travel ratio is the owned skin's centroid excursion over the excursion of the
 joint driving it, sampled at `phases` frames of every clip.
 """
 scene=bpy.context.scene
 owner={}
 for v in obj.data.vertices:
  g=max(v.groups,key=lambda w:w.weight,default=None)
  if g is not None:owner.setdefault(obj.vertex_groups[g.group].name,[]).append(v.index)
 out={}
 for key,item in limb_defs.items():
  names=item['names'];idx=[i for n in names for i in owner.get(n,[])]
  distal=[i for i in owner.get(names[-1],[])]
  co=np.array([obj.data.vertices[i].co[:] for i in idx]) if idx else np.zeros((0,3))
  root=Vector(rig.data.bones[names[0]].head_local[:])
  out[key]={'bones':names,'ownedVertices':len(idx),'ownedDistalVertices':len(distal),
   'rootToNearestOwnedSkin':round(float(np.linalg.norm(co-np.array(root[:]),axis=1).min())/SCALE,5) if len(co) else None,
   'rootToMeanOwnedSkin':round(float(np.linalg.norm(co-np.array(root[:]),axis=1).mean())/SCALE,5) if len(co) else None,
   'polylineLength':round(item['cum'][-1],5),'radius':round(item['radius'],5)}
  ratios={}
  for clip in CLIPS:
   action=bpy.data.actions[clip];rig.animation_data.action=action
   if getattr(action,'slots',None):rig.animation_data.action_slot=action.slots[0]
   end=round(CLIPS[clip]*30);cents=[];joints=[]
   for f in [round(end*k/(phases-1)) for k in range(phases)]:
    scene.frame_set(f);bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(deps)
    P=np.array([ev.data.vertices[i].co[:] for i in distal])
    cents.append(P.mean(axis=0));joints.append(np.array(rig.pose.bones[names[-1]].head[:]))
   sk=max(float(np.linalg.norm(a-b)) for a in cents for b in cents)
   jt=max(float(np.linalg.norm(a-b)) for a in joints for b in joints)
   ratios[clip]=round(sk/jt,4) if jt>1e-4 else None
  moving={c:r for c,r in ratios.items() if r is not None}
  out[key]['travelRatioPerClip']=ratios
  out[key]['travelRatioWorst']=round(min(moving.values()),4)
  out[key]['travelRatioMedian']=round(float(np.median(list(moving.values()))),4)
 rig.animation_data.action=None
 for q in rig.pose.bones:q.rotation_euler=(0,0,0);q.location=(0,0,0);q.scale=(1,1,1)
 scene.frame_set(0);bpy.context.view_layer.update()
 return out

def measure(rig,body,front,shape,headref):
 """"It moves" as a number, read back off the keyed actions rather than off the formulas.

 The swept angle is a joint's own peak-to-peak rotation over the clip -- the same figure the
 limbed swimmers record at their limb roots -- and the travel is how far a point at the far end
 of a joint actually gets, in body lengths. `Idle` at .008 rad of yaw was the fault this file was
 opened for, so the floors below are asserted rather than reported.

 `tailArcOverChord` is the promoted body's own question, asked of the pose the clip actually
 produces: how folded the tail is at each frame, measured off the twelve controls' own world
 positions. The generation's rest chain reads about 1.66; a ruler is 1.00.

 `posedExtentOverBind` is the other half of the same question and is about what the player sees.
 `loadCreature` sizes a body by the widest horizontal side of its **bind** box and the actor's own
 length multiplies that back, so what is drawn is the animal's length times *its posed span over
 that bind side*. The posed span is the animal's own longest straight line -- a double sweep over
 the real skin, snout to tail tip whichever way the body is lying -- rather than another
 axis-aligned box, because a tail sweeping sideways grows a box without making the animal any
 longer. Five phases of every clip; the locomotion clips are held within a tenth, while a coil, a
 brace or a death roll is honestly shorter than the animal it belongs to.

 It is also what the travel figures below are divided by. `SCALE` is the raw-to-engine factor and
 on a body whose generation is curled it is *not* the animal's length: the same 6 gives the
 straight regeneration a 6.00 bind box and this one an 8.4, so a travel over `SCALE` would read
 forty per cent high here and could not be compared with any other body on the roster.
 """
 scene=bpy.context.scene;out={};tips=('tail_11','skull','fore_upper_L')
 def skin():
  deps=bpy.context.evaluated_depsgraph_get()
  return np.concatenate([np.array([v.co[:] for v in o.evaluated_get(deps).data.vertices]) for o in shape])
 def span():
  Q=skin();a=Q[int(np.argmax(np.linalg.norm(Q-Q[0],axis=1)))]
  return float(np.linalg.norm(Q-a,axis=1).max())
 Q=skin();bind=float(max(Q[:,0].max()-Q[:,0].min(),Q[:,1].max()-Q[:,1].min()))
 for clip in CLIPS:
  action=bpy.data.actions[clip];rig.animation_data.action=action
  if getattr(action,'slots',None):rig.animation_data.action_slot=action.slots[0]
  end=round(CLIPS[clip]*30);rot={};pos={n:[] for n in tips};folds=[];spans=[];aims=[]
  for f in range(end+1):
   scene.frame_set(f);bpy.context.view_layer.update()
   for q in rig.pose.bones:rot.setdefault(q.name,[]).append(tuple(q.rotation_euler))
   for n in tips:pos[n].append(np.array(rig.pose.bones[n].tail[:]))
   if f%max(1,end//4)==0 or f==end:spans.append(span())
   # Where the head is pointing against the trunk's own run, every frame. This is the number
   # T3D-26 exists for, and it is asked of the pose the clip actually produces rather than of the
   # table that produced it: the aim is in the bind, but `lean`, the coil's neck yaw and the
   # turns' counter-steer all move the head on top of it, and a clip that quietly put the right
   # angle back would be invisible in `heldShape`.
   sk=Vector(rig.pose.bones['skull'].head[:])
   hd=((rig.pose.bones['skull'].matrix@rig.data.bones['skull'].matrix_local.inverted()@headref)-sk)
   tr=Vector(rig.pose.bones['chest'].head[:])-Vector(rig.pose.bones['tail_00'].head[:])
   aims.append(math.degrees(hd.angle(tr)) if hd.length>1e-6 and tr.length>1e-6 else 0.)
   chain=[Vector(rig.pose.bones[n].head[:]) for n in TAIL]+[Vector(rig.pose.bones['tail_11'].head[:])+
    (Vector(rig.pose.bones['tail_11'].head[:])-Vector(rig.pose.bones['tail_10'].head[:]))]
   arc=sum((chain[i+1]-chain[i]).length for i in range(len(chain)-1))
   folds.append(arc/max(1e-6,(chain[-1]-chain[0]).length))
  swept=lambda n:[float(max(r[k] for r in rot[n])-min(r[k] for r in rot[n])) for k in range(3)]
  travel=lambda n:float(max(np.linalg.norm(a-b) for a in pos[n] for b in pos[n]))/bind
  out[clip]={'tailChainYawSweptRadians':float(sum(swept(n)[2] for n in TAIL)),
  'tailChainPitchSweptRadians':float(sum(swept(n)[0] for n in TAIL)),
  'tailRootSweptRadians':swept('tail_00'),'tailTipSweptRadians':swept('tail_11'),
  'neckYawSweptRadians':float(sum(swept(n)[2] for n in NECK)),
  'foreLimbSweptRadians':swept('fore_upper_L'),'hindLimbSweptRadians':swept('hind_upper_L'),
  'jawSweptRadians':swept('jaw')[0],
  'tailArcOverChord':[round(float(min(folds)),4),round(float(max(folds)),4)],
  'headVsTrunkRunDegrees':[round(float(min(aims)),2),round(float(max(aims)),2)],
  'posedExtentOverBind':[round(min(spans)/bind,4),round(max(spans)/bind,4)],
  'tailTipTravel':travel('tail_11'),'skullTravel':travel('skull'),'forePaddleTravel':travel('fore_upper_L')}
 out['bindBoxMax']=round(bind,4)
 # Clearing the action does **not** clear the pose, and the rig has just been stepped through
 # twenty-four clips: left posed, the mesh the exporter evaluates for normals is the posed one
 # and the split-vertex count comes out different from an untouched build. Put it back at rest.
 rig.animation_data.action=None
 for q in rig.pose.bones:q.rotation_euler=(0,0,0);q.location=(0,0,0);q.scale=(1,1,1)
 scene.frame_set(0);bpy.context.view_layer.update()
 if front:
  for clip,row in out.items():
   if not isinstance(row,dict):continue
   assert row['tailTipTravel']>.04,(clip,row['tailTipTravel'])
   assert row['tailChainYawSweptRadians']>.12,(clip,row['tailChainYawSweptRadians'])
  assert out['Idle']['tailTipTravel']>.04,out['Idle']['tailTipTravel']
  assert out['Swim']['tailTipTravel']>.12,out['Swim']['tailTipTravel']
  assert out['Sprint']['tailTipTravel']>out['Swim']['tailTipTravel'],'Sprint must out-travel Swim'
  # The straight-line clips only. A turn bends the animal into a C and is honestly shorter --
  # `TurnRight`, into the generation's own hook, reads 0.84 -- and a coil shorter still.
  for c in ('Idle','Swim','Sprint','Dive','Rise','Grab'):
   lo,hi=out[c]['posedExtentOverBind']
   assert .90<lo and hi<1.10,(c,'drawn length departs from the bind the renderer sizes by',lo,hi)
  if REST[body]['aim']>0:
   # **The fault T3D-26 answers must not be able to come back in a clip.** The animal looks where
   # it swims: the locomotion clips hold the head within a gentle lean of the trunk's own run, and
   # the whole set -- the coil, which deliberately pulls the neck round, included -- stays far
   # inside the 67.7 degrees the uncorrected body stood at and the right angle it read as.
   for c in ('Idle','Swim','Sprint','Dive','Rise','Grab','Breath','Growth','TurnLeft','TurnRight'):
    assert out[c]['headVsTrunkRunDegrees'][1]<22.,(c,out[c]['headVsTrunkRunDegrees'])
   worst=max((out[c]['headVsTrunkRunDegrees'][1],c) for c in CLIPS)
   assert worst[0]<40.,worst
   # And it has to still be an animal rather than a ruler: the head is never nailed to the axis.
   assert out['Idle']['headVsTrunkRunDegrees'][1]>1.5,out['Idle']['headVsTrunkRunDegrees']
  if REST[body]['uncurl']>0:
   # The point of the promotion, as numbers. The generation's own tail chain measures 1.66 arc
   # over chord and 180 degrees of turn: `Sprint` has to lay that out nearly flat, `Idle` has to
   # keep some of it -- the animal was promoted for how it reads, and a ruler would throw that
   # away -- and `Coil` has to close it further than the generation ever was. A tail that
   # measures the same in `Sprint` as in `Coil` is a tail nothing is doing anything with, which
   # is what this body shipped as: every act clamped to 28 % of its range.
   assert out['Sprint']['tailArcOverChord'][1]<1.10,out['Sprint']['tailArcOverChord']
   assert out['Idle']['tailArcOverChord'][1]>1.04,out['Idle']['tailArcOverChord']
   assert out['Coil']['tailArcOverChord'][1]>2.5,out['Coil']['tailArcOverChord']
   for c in ('Heavy','TailWhip','Ability','Coil'):
    assert out[c]['tailChainYawSweptRadians']>2.5,(c,out[c]['tailChainYawSweptRadians'])
 return out

def posed_frame(o):
 """The posed generation's own frame. Its geometric double sweep ends on a forepaddle, not its
 snout, so the true snout is this visually identified source landmark."""
 tip=Vector((.2459563613,-.2180387229,.1798989326))
 hinge0=Vector((.15813,-.226,.13047))
 along=(hinge0-tip).normalized();side=along.cross(Vector((0,0,1))).normalized();up=side.cross(along).normalized()
 for v in o.data.vertices:
  q=v.co-tip;v.co=Vector((q.dot(side),q.dot(along),q.dot(up)))
 o.data.update()

def geodesic_bands(o,exclude=(),smoothing=0):
 """Band the surface by geodesic distance from the snout and take each band's median.

 **The four paddles have to come out of the bands or the axis is not the animal.** A paddle sits
 at much the same geodesic distance from the snout as the flank it grows from, so its vertices
 join that band and drag the median out sideways; the polyline then zig-zags, and as it zig-zags
 it gets longer. Measured both ways on this body the difference is not subtle: 2.025 long with
 the paddles in against 1.714 with them out and 1.612 after one smoothing pass, where the
 verdict's own geodesic measurement of the surface is 1.578. The shipped backup was rigged on the
 2.025 axis, which is why its first three tail controls doubled back on each other -- 68.9 and
 89.9 degrees of turn at the root against 3 to 20 along the rest of the tail.
 """
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
 end=int(np.argmax(np.where(D<1e8,D,-1)));length=D[end]
 keep=np.ones(len(P),bool)
 if len(exclude):keep[list(exclude)]=False
 rows=[]
 for u in np.linspace(.015,.985,70):
  mask=(D>length*(u-.009))&(D<length*(u+.009))&keep
  if mask.sum()>2:rows.append(np.median(P[mask],axis=0))
 S=np.array(rows)
 for _ in range(smoothing):S[1:-1]=(S[:-2]+2*S[1:-1]+S[2:])/4.
 points=[Vector(P[seed])]+[Vector(s) for s in S]+[Vector(P[end])]
 return T.polyline(points),float(length)

def build(body):
 front=body==FRONT;posed=body==POSED
 raw=HERE/'askeptosaurus.preview.glb' if posed else HERE/'tripo-regenerated-2026-09-19/askeptosaurus.raw.glb'
 tag=' posed body' if posed else ' straight body'
 auth,intake=T.load_raw(str(raw),NAME+tag)
 albedo,lum,albedo_sha,skin=T.retain_albedo(auth,NAME+(' posed' if posed else ' straight')+' pigmentation',.7)
 skin.use_backface_culling=False
 frame=T.measure_frame(auth,True,lum)
 axis_report={}
 if posed:posed_frame(auth)
 P=np.array([v.co[:] for v in auth.data.vertices]);Y0,Y1=float(P[:,1].min()),float(P[:,1].max())
 bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons]);th=T.neighbourhood_minimum(auth.data,T.shell_thickness(auth.data,bvh))
 cx,cz,hw,hd,centre=T.measured_centreline(auth,th<(.025 if posed else .012),band=.009,smoothing=3)
 if posed:
  # Two passes, because which vertices are a paddle is a question about an axis: band once with
  # everything in, find the four paddles against that, then band again with them out.
  (AP0,AC0),glen=geodesic_bands(auth)
  clusters=T.thin_clusters(auth,th<.025,cx,cz,min_size=100)
  rough=[]
  for c in clusters:
   reach=max(T.project(AP0,AC0,Vector(P[i]))[0] for i in c['indices'])
   if reach>=.10:rough.append(c)
  rough=sorted(rough,key=lambda c:c['count'],reverse=True)[:4]
  assert len(rough)==4,[c['count'] for c in rough]
  drop=set()
  for c in rough:drop.update(c['indices'])
  (AP,AC),glen=geodesic_bands(auth,exclude=drop,smoothing=1)
  geo=AC[-1]
  axis_report={'axisSeeding':'geodesic bands from the measured snout landmark, four paddle clusters excluded, one smoothing pass',
   'surfaceGeodesicLength':round(glen,5),'axisWithPaddlesIn':round(AC0[-1],5),'axisWithPaddlesOut':round(AC[-1],5),
   'paddleVerticesExcluded':len(drop)}
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
  clusters=T.thin_clusters(auth,th<.016,cx,cz,min_size=100)
  axis_report={'axisSeeding':'straight neutral axis after lateral drift correction'}
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
 hinge=.072 if posed else Y0+.065;front_y=.001 if posed else Y0+.002
 lip_source=auth
 if posed:
  lip_source=auth.copy();lip_source.data=auth.data.copy()
  bm=bmesh.new();bm.from_mesh(lip_source.data)
  drop=[v for v in bm.verts if abs(v.co.x)>.055 or abs(v.co.z)>.055 or not -.02<v.co.y<.11]
  bmesh.ops.delete(bm,geom=drop,context='VERTS');bm.to_mesh(lip_source.data);bm.free()
 lip=T.albedo_mouth_line(lip_source,lum,front_y,hinge,cz,hd,stations=20)
 if posed:bpy.data.objects.remove(lip_source)
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
 # The two chains the resting shape opens out, measured off the bone table itself. "Straight" is
 # this animal's own line in both of them and never a world axis.
 snout=at(AP,AC,0.)
 tailpts=[B[n][0] for n in TAIL]+[at(AP,AC,float(tailstations[12]))]
 neckpts=[B['chest'][0]]+[B[n][0] for n in NECK]+[B['skull'][0],snout]
 tail_d=chain_dirs(tailpts);neck_d=chain_dirs(neckpts)
 # **A chain's own bend is opened onto its own first segment, and its takeoff is a separate
 # question with a separate answer.** Straightening a chain onto the trunk's direction makes the
 # first rotation a rigid swing of the whole of it, because the local rotation at the root is
 # exactly the arc from the root's own direction to the target: 24.7 degrees on this tail and
 # 54.7 on this front. Applied at one joint the animal does not uncurl, it throws its tail
 # sideways and swings its head, and T3D-25 measured that at **2.62x** on `skin-tears.mjs`
 # against 1.51x for opening each chain onto its own first segment and leaving the takeoff alone.
 #
 # Leaving it alone is what T3D-26 is about, because on the front it is the larger half and it is
 # the fault: opened onto its own first segment the head still left the trunk at 54.7 degrees and
 # finished 67.7 degrees off it, which from above is the right angle the owner saw, with the
 # shoulder and the right pectoral carried round on the same swing. So the front's takeoff **is**
 # corrected, and it is corrected by `uncurl`'s `share` -- a sixth of the arc at each of the
 # chest, the four cervicals and the skull -- so the chain turns onto the trunk over its own
 # length. The tail passes no share and so keeps the takeoff the generation gave it, which is
 # character rather than fault: a thalattosaur's tail sweeps.
 tailchain=(tail_d,tail_d[0].copy())
 # The trunk's own run, hip to shoulder. This body bends twice, and that chord is the long
 # straight stretch between the two bends -- what "in line with the body" can only mean here. The
 # two other readings available disagree with it and with each other, so both are recorded rather
 # than one of them being picked silently: `body`->`chest` is a chord across the curled front half
 # of the trunk and lies 17.1 degrees off, and the measured axis' own tangent at the shoulder is
 # one station of a line that wanders three times this animal's girth and lies 42.8 degrees off.
 trunk=(B['chest'][0]-B['tail_00'][0]).normalized()
 # A share per joint, equal and cumulative, ending at 1 so the last segment reaches the target
 # exactly. Equal per *joint* rather than per unit length because a skin is asked to fold at a
 # joint: weighting by segment length instead hands the skull 0.34 of the arc, since the head is
 # two and a half cervicals long, and measures a larger residual at the snout besides.
 neck_share=[(i+1)/len(neck_d) for i in range(len(neck_d))]
 neckchain=(neck_d,trunk,neck_share)
 # Which way this body's own tail curls, as the signed total of its joint turns about the rig's
 # dorsoventral axis. It signs the coil and the tail strike (see `holdfor`). A body generated
 # straight has no answer and takes +1, which is the direction those clips have always gone.
 signed=sum(math.copysign(tail_d[i].angle(tail_d[i+1]),tail_d[i].cross(tail_d[i+1]).z) for i in range(len(tail_d)-1))
 hook=1. if math.degrees(abs(signed))<5. else math.copysign(1.,signed)
 deg=lambda a,b:round(math.degrees(a.angle(b)),2)
 bodychest=(B['chest'][0]-B['body'][0]).normalized()
 axistan=(at(AP,AC,max(0.,shoulder-.03))-at(AP,AC,shoulder+.03)).normalized()
 cerv=chain_dirs([B[n][0] for n in NECK]+[B['skull'][0],snout])   # the cervicals alone, as T3D-25 read them
 aimarc=neck_d[0].rotation_difference(trunk)
 axis_report.update({'tailRestTurnDegrees':chain_bend(tail_d),'neckRestTurnDegrees':chain_bend(cerv),
  'tailHookSignedDegrees':round(math.degrees(signed),2),'tailHookSign':hook,
  'tailTakeoffVsTrunkDegrees':round(math.degrees(tail_d[0].angle((B['tail_00'][0]-B['body'][0]).normalized())),2),
  'neckTakeoffVsTrunkDegrees':deg(cerv[0],bodychest),
  'tailRestArcOverChord':round(sum((tailpts[i+1]-tailpts[i]).length for i in range(12))/(tailpts[-1]-tailpts[0]).length,4),
  'tailRestTurnPerJointDegrees':[round(math.degrees(tail_d[i].angle(tail_d[i+1])),2) for i in range(11)],
  # T3D-26. The cervical readings above are kept exactly as T3D-25 recorded them so the two are
  # comparable; everything below is the chain that is actually corrected, measured against the
  # trunk's own run rather than against a chord across a curled trunk.
  'front':{'bones':NECKCHAIN,
   'trunkRunHipToShoulder':[round(v,5) for v in trunk],
   'trunkRunVsBodyToChestDegrees':deg(trunk,bodychest),
   'trunkRunVsAxisTangentDegrees':deg(trunk,axistan),
   'restTurnDegrees':chain_bend(neck_d),
   'restTurnPerJointDegrees':[deg(neck_d[i],neck_d[i+1]) for i in range(len(neck_d)-1)],
   'restTurnSignedAboutZDegrees':round(sum(math.copysign(math.degrees(neck_d[i].angle(neck_d[i+1])),
    neck_d[i].cross(neck_d[i+1]).z) for i in range(len(neck_d)-1)),2),
   'takeoffVsTrunkRunDegrees':deg(neck_d[0],trunk),
   'headVsTrunkRunDegreesUncorrected':deg(neck_d[-1],trunk),
   'aimShare':[round(s,4) for s in neck_share],
   'aimPerJointDegrees':round(math.degrees(aimarc.angle)/len(neck_d),2)}})
 limb_defs={}
 for kind,cs in [('fore',fore),('hind',hind)]:
  # Signs are relative to the local body's tangent, essential for the curled posed body.
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
  if front_y-.02<p.y<hinge+.003 and (not posed or (abs(p.x)<.07 and abs(p.z)<.06)):w={'skull':1.}
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
 if front:
  # A voxel resurfacing welds two surfaces that pass within a voxel of each other, and on a body
  # whose tail hooks back under itself that is the thing to check before choosing a voxel: a weld
  # is a web no paired audit can see, because the bridge lies inside both envelopes and well
  # inside the surface-distance tolerance. Asked of this body -- nearest neighbour for every
  # vertex among the vertices more than a tenth of the animal away from it *over its own surface*,
  # which is the only separation a fold cannot fake -- the closest approach anywhere is 0.098
  # raw, thirty-eight voxels. The generation's hook is wide. So the shared .0026 stands. (An
  # earlier reading of 0.0023 was the *polyline projection* folding, not the animal: two adjacent
  # surface points either side of the axis's own kink were handed arc positions a seventh of the
  # body apart. A separation measured over the surface cannot be fooled that way.)
  twin,_,twin_report,_=T.build_twin(auth,th,NAME+' procedural volume twin',.0026,5500,albedo,blade_dilation=.001,thin=.016,band=.01)
  objects.append(twin)
 head_bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons])
 def room(y):
  return T.mouth_room(head_bvh,Vector((cx(y),y,seam(y))),Vector((1,0,0)),Vector((0,0,1)),limit=.08,fallback=.003)
 def section(y):
  w,up,down=room(y);return max(.0005,w*.84),max(.0005,up*.32),max(.0005,down*.32)
 oralmat=T.inward_material(NAME+' mouth interior',(.20,.075,.055,1))
 lining,lining_raw=T.lining('Oral cavity lining',rig,tx,seam,section,hinge-.0003,front_y+.001,lambda p:0,oralmat,centre_x=cx,room=room,fill=.86,rings=24,ring=12)
 parts={};groups=[];caps={}
 for o in objects:
  T.bisect_on_curve(o,seam,hinge,front_y-.004,margin=.012)
  T.split_part(o,'lower jaw',lambda c:front_y-.015<c.y<hinge and c.z<seam(c.y)-1e-7 and (not posed or (abs(c.x)<.055 and abs(c.z)<.055)),parts)
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
 # Carry the rest before the clips are authored, so every clip is measured from the bind that
 # ships and `measure` reads the arc over chord the renderer will actually size the body by.
 carry_report={};carried_by={};headref=tx(snout)
 if REST[body]['carry']>0 or REST[body]['aim']>0:
  carried=list({o.name:o for g in groups for o in g}.values())
  names=list(TAIL);rots=list(uncurl(tail_d,tailchain[1],REST[body]['carry']))
  if REST[body]['aim']>0:
   # The aim is carried whole and the opening is carried to `fcarry[0]`, so the bind pose is the
   # animal looking where it swims. Nothing about that is a performance for a clip to hold.
   lv0,am0=REST[body]['fcarry']
   frontrots=uncurl(neck_d,trunk,lv0,0.,neck_share,REST[body]['aim']*am0,0.)
   names+=NECKCHAIN;rots+=list(frontrots)
  carried_by,carry_report=carry_rest(rig,carried,names,rots)
  carry_report['carriedFraction']=REST[body]['carry']
  P2=np.array([v.co[:] for o in groups[0] for v in o.data.vertices])/SCALE
  Y0,Y1=float(P2[:,1].min()),float(P2[:,1].max())
  cd=chain_dirs([Vector(rig.pose.bones[n].head[:]) for n in TAIL]+
   [Vector(rig.pose.bones['tail_11'].head[:])*2-Vector(rig.pose.bones['tail_10'].head[:])])
  carry_report['restTurnDegreesAfterCarry']=chain_bend(cd)
  if REST[body]['aim']>0:
   headref=carried_by['skull']@tx(snout)
   hd=(headref-Vector(rig.pose.bones['skull'].head[:])).normalized()
   tr=(Vector(rig.pose.bones['chest'].head[:])-Vector(rig.pose.bones['tail_00'].head[:])).normalized()
   perjoint=[round(math.degrees(e.to_quaternion().angle),2) for e in frontrots]
   carry_report.update({'carriedAimFraction':REST[body]['aim']*REST[body]['fcarry'][1],
    'carriedLevelFraction':REST[body]['fcarry'][0],
    'frontCarryPerJointDegrees':dict(zip(NECKCHAIN,perjoint)),
    'restHeadVsTrunkRunDegrees':round(math.degrees(hd.angle(tr)),2)})
   # **The correction is distributed or it is not a correction.** A rigid swing at the neck root
   # is the fix T3D-25 measured at 2.62x skin and rejected, and it would show here as one joint
   # holding most of the arc. Nothing may exceed a quarter turn.
   assert max(perjoint)<25.,('the front carry is concentrated at one joint',carry_report['frontCarryPerJointDegrees'])
   # And the head has to end up on the trunk's line. Not *on* it -- some residual is the animal --
   # but nowhere near the right angle it left it at.
   assert carry_report['restHeadVsTrunkRunDegrees']<12.,carry_report['restHeadVsTrunkRunDegrees']
 # **The posterior cut is no longer square to the file's axes, because the bind has moved since
 # the jaw was cut.** The carry rotates the whole head, so the plane `bisect_on_curve` cut on --
 # raw y = hinge -- arrives in the shipped file tilted, and `auditCutAttachment`'s axis test
 # selects nothing at all rather than failing. The builder is the only thing that knows where that
 # plane went, so it says: the same rigid map the rim's own skin was baked through, applied to the
 # plane. With nothing carried (the straight body) this is the identity and the plane is the axis
 # test it always was.
 cutp=Vector((0,hinge*SCALE,0));cutn=Vector((0,1,0))
 if 'skull' in carried_by:
  cutp=carried_by['skull']@cutp;cutn=(carried_by['skull'].to_3x3()@cutn).normalized()
 gltf=lambda v:[round(v.x,6),round(v.z,6),round(-v.y,6)]
 cut_plane={'point':gltf(cutp),'normal':gltf(cutn),'tolerance':.01,'frame':'glTF, +Y up'}
 place=lambda b,p:list((carried_by[b]@tx(p)) if b in carried_by else tx(p))
 anchorpts={'anchor_mouth':('jaw',(cx(front_y+.008),front_y+.008,seam(front_y+.008)-.002),'mouth'),
 'anchor_mouth_inside':('skull',(cx(hinge-.015),hinge-.015,seam(hinge-.015)),'swallow'),
 'anchor_attack_primary':('skull',(cx(front_y+.002),front_y+.002,seam(front_y+.002)),'attack')}
 anchors=[{'name':n,'bone':b,'point':place(b,p),'role':r} for n,(b,p,r) in anchorpts.items()]
 seams,holds=animate(rig,body,front,tailchain,neckchain,hook)
 motion=measure(rig,body,front,groups[0],headref);sockets=T.make_sockets(rig,anchors)
 paddles=paddle_audit(rig,groups[0][0],limb_defs)
 if front:
  # The owner named the **right** pectoral, so the pair is measured rather than assumed: the skin
  # each blade owns, how far its own joint stands inside that skin, and how far that skin travels
  # over the joint's own travel in every clip. A blade left behind reads as a low travel ratio on
  # one side (Aphaneramma's tucked forelimb measured 0.45 against 1.04-1.11 elsewhere).
  for k in ('foreL','foreR','hindL','hindR'):
   assert paddles[k]['ownedVertices']>120,(k,paddles[k]['ownedVertices'])
   assert .75<paddles[k]['travelRatioWorst'],(k,paddles[k]['travelRatioWorst'])
  ratio=paddles['foreR']['travelRatioMedian']/paddles['foreL']['travelRatioMedian']
  assert .80<ratio<1.25,('the two pectorals do not follow their own joints alike',ratio)
 tri=lambda o:sum(len(p.vertices)-2 for p in o.data.polygons)
 reports=[]
 for idx,group in enumerate(groups):
  suffix='' if (front and idx==0) else '.puppet' if front else '.backup'
  bpy.ops.object.select_all(action='DESELECT')
  for o in group+[rig]+sockets:o.select_set(True)
  bpy.context.view_layer.objects.active=rig;path=OUT/(ID+suffix+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),**T.EXPORT_KWARGS);T.patch_glb(str(path),anchors)
  reports.append({'suffix':suffix,'triangles':sum(tri(o) for o in group)})
 report={'id':ID,'body':body,'shipsAs':'askeptosaurus.glb' if front else 'askeptosaurus.backup.glb',
 'inFront':front,'backup':not front,'intake':intake,'sourceAlbedoSha256':albedo_sha,'frame':frame,
 'axis':axis_report,'bones':len(B),'boneNames':list(B),
 'limbs':{k:{'points':[list(p) for p in v['P']],'radius':v['radius']} for k,v in limb_defs.items()},
 'hipFraction':hip/AC[-1],'tailFraction':1-hip/AC[-1],'mouth':{'hingeY':hinge,'cutPlane':cut_plane,'lip':lip,'throatCaps':caps,'maxGapeRadians':.29},
 'models':reports,'clips':CLIPS,'looping':LOOPS,'loopSeams':seams,'motion':motion,'heldShape':holds,
 'pectorals':paddles,
 'restingShape':{'appliesTo':'clips only; the bind pose is unchanged',
  'note':'unit values; every clip scales them by its own row in heldShape',
  'chestArchRadians':REST[body]['chest'],'neckArchRadiansPerJoint':REST[body]['neck'],'neckJoints':len(NECK),
  'skullLevellingRadians':REST[body]['skull'],'tailFallRadiansPerJoint':REST[body]['fall'],
  'tailBowRadians':REST[body]['bow'],'leanRadiansPerJoint':REST[body]['lean'],
  'foreLimbSetRadians':list(REST[body]['fore']),'hindLimbSetRadians':list(REST[body]['hind']),
  'tailUncurlAvailable':REST[body]['uncurl'],'neckUncurlAvailable':REST[body]['level'],
  'frontAimAvailable':REST[body]['aim'],'frontCarried':list(REST[body]['fcarry']),
  'waveStep':REST[body]['step'],'waveVerticalShare':REST[body]['vert'],
  'clipAmplitudes':REST[body]['amp'],'actAmplitude':REST[body]['act'],
  'bendRangeLimit':1.},
 'anchors':anchors,'maxInfluences':4,'rootStable':True,'noScaleChannels':True,'carry':carry_report,**twin_report}
 if front:
  shutil.copyfile(OUT/(ID+'.puppet.glb'),OUT/(ID+'.lod1.glb'))
  profile,worst=T.paired_profile(groups[0],groups[1],(Y0+.01)*SCALE,(Y1-.01)*SCALE,.04*SCALE)
  dist=K.surface_distances(groups[0],groups[1]);assert max(dist)<.04*SCALE,max(dist)
  report['envelope']={'maximumEnvelopeDifference':worst,'surfaceDistanceMax':max(dist),'surfaceDistanceP95':float(np.quantile(dist,.95)),'envelopeTolerance':.04*SCALE}
  (HERE/(ID+'-profile.json')).write_text(json.dumps({'bodyLength':SCALE,'stations':profile,**report['envelope']},indent=2)+'\n')
  meta={'id':ID,'name':NAME,'species':'Askeptosaurus italicus','provenance':'Middle Triassic · Monte San Giorgio','description':'Slender thalattosaur with a long lateral swimming tail. Authored body and volume twin share one rig; the straight regeneration is retained as an animated backup.','modelLength':round(motion['bindBoxMax'],3),'lengthMeters':2.5,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':list(anchorpts),'puppet':ID+'.puppet.glb','sources':[str(raw.relative_to(ROOT)),'docs/triassic/canonical/askeptosaurus.png'],'notes':['The retained backup body has its own rest skeleton and the same public clip names.','Heavy and TailWhip strike with the long tail; Ability and Coil curl and recover. World turning is simulation-owned.','Living colours, soft tissues and movements are artistic reconstruction.']}
  (OUT/(ID+'.json')).write_text(json.dumps(meta,indent=2)+'\n');(HERE/'anchors.json').write_text(json.dumps({ID:anchors},indent=2)+'\n')
 (HERE/('validation.json' if front else 'backup-validation.json')).write_text(json.dumps(report,indent=2)+'\n')
 bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/(ID+'-'+body+'.blend')))
 print('ASKEPTOSAURUS_BUILD_OK',json.dumps({'body':body,'inFront':front,'models':reports,'bones':len(B),'tailFraction':report['tailFraction'],'axis':axis_report}))

build(BACK if '--backup' in sys.argv else FRONT)
