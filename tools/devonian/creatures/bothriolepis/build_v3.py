"""Bothriolepis V3 production stage: rig, 18 clips, anchors, full + LOD export.

Input: the accepted MATERIAL05b appearance blend from the rework-v3 chain
(../devonian-authoring/bothriolepis/rework-v3/material05b/), whose mesh is one
closed 55,802-vertex manifold -- shield, oral annulus and cavity, both pectoral
appendages and the posterior in a single surface -- plus the two inset eye
globes.  V2's builder assembled a dozen separate primitives instead, so the rig
and skinning here are written against the V3 tags rather than copied, but the
bone NAMES, the eighteen clip names and durations, the loop set, the three
anchor roles and the export/LOD pattern are V2's exactly, because intake, the
runtime and the catalogue address those by name.

Writes only ../devonian-authoring/bothriolepis/v3-candidate/ (and a v3-bake/
sibling for the baked normal maps).  Never touches public/ or the V2 candidate.

Run:  blender -b --threads N --python build_v3.py [-- --skip-renders]
Then: finalize_v3.py, package.mjs, export_audit_v3.mjs, eye-audit.py, portraits_v3.py
"""
import bpy,bmesh,math,json,sys,struct,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from math import sin,cos,pi
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[3]
LOCAL=REPO.parent/'devonian-authoring/bothriolepis'
REWORK=HERE/'rework-v3';sys.path.insert(0,str(REWORK))
SOURCE=LOCAL/'rework-v3/material05b/bothriolepis-material05b.blend'
CAND=LOCAL/'v3-candidate';CAND.mkdir(parents=True,exist_ok=True)
BAKE=LOCAL/'v3-bake';BAKE.mkdir(parents=True,exist_ok=True)
from geometry_clay02 import build_body
import material_fields05 as fields
from material_fields05 import shield as shield_field,pectoral as pectoral_field,posterior as posterior_field,linear_to_srgb
from material_fields03 import noise as noise2d

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene;scene.render.fps=30
body=next(o for o in scene.objects if o.name.startswith('Bothriolepis V3 MATERIAL05'))
eyes=[o for o in scene.objects if o.name.startswith('Closed inset eye')]
assert len(eyes)==2
for o in list(scene.objects):
 if o not in [body]+eyes:bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
me=body.data
raw=build_body();assert len(raw.v)==len(me.vertices)==55802
tuning=json.loads(body['appearance_tuning'])
provenance={k:body[k] for k in body.keys() if k.endswith('_sha256') or k in ('appearance_variant','appearance_tuning')}
# The oral study key was a source-stage motion probe; production motion is the
# `oral` bone.  Basis and mesh agree to float32 roundoff, so clearing is safe.
basis=np.array([p.co[:] for p in me.shape_keys.key_blocks['Basis'].data])
live=np.array([v.co[:] for v in me.vertices])
assert float(np.abs(basis-live).max())<2e-7
bpy.context.view_layer.objects.active=body;bpy.ops.object.shape_key_remove(all=True)
pigment=np.array([tuple(c.color)[:3] for c in me.color_attributes['AnatomicalPigmentM05'].data])
uvmap=me.uv_layers['AnatomicalUVM05'];uvmap.name='UVMap'
for g in list(body.vertex_groups):body.vertex_groups.remove(g)
body.name='bothriolepis_cuirass_v3';me.name='bothriolepis_cuirass_v3'
for o in eyes:o.data.name=o.name

# ---------------------------------------------------------------------------
# Rig: V2's twelve joint names on V3's own landmarks.
# ---------------------------------------------------------------------------
arm=bpy.data.armatures.new('Bothriolepis V3 anatomical skeleton')
rig=bpy.data.objects.new('Bothriolepis',arm);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.33,.06),'root'),('oral',(0,-1.31,-.20),'body'),
      ('tail_base',(0,.24,.045),'body'),('tail_mid',(0,1.05,-.020),'tail_base'),
      ('tail_tip',(0,1.85,-.030),'tail_mid'),('caudal',(0,2.55,-.120),'tail_tip'),
      ('dorsal',(0,1.25,.110),'tail_mid')]
for s in [-1,1]:
 side='L' if s>0 else 'R'
 spec.extend([(f'pectoral_{side}',(s*.520,-1.030,-.175),'body'),
              (f'pectoral_tip_{side}',(s*.980,-.175,-.306),f'pectoral_{side}')])
for name,p,parent in spec:
 b=arm.edit_bones.new(name);b.head=p
 b.tail=Vector(p)+Vector((0,0,.16) if name=='root' else (0,.16,0))
 b.use_deform=name!='root'
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)

def smoothstep(t):t=max(0.,min(1.,t));return t*t*(3-2*t)
TAIL_CENTRES=[(.18,'body'),(.50,'tail_base'),(1.20,'tail_mid'),(2.00,'tail_tip'),(2.70,'caudal')]
def tailweight(y):
 if y<=TAIL_CENTRES[0][0]:return {'body':1.}
 if y>=TAIL_CENTRES[-1][0]:return {'caudal':1.}
 for (a,an),(b,bn) in zip(TAIL_CENTRES,TAIL_CENTRES[1:]):
  if a<=y<=b:
   t=smoothstep((y-a)/(b-a));return {an:1-t,bn:t}
 return {'body':1.}
DORSAL_LO,DORSAL_HI=1.105,1.50
def weights_for(i,p):
 x,y,z=p;tag=raw.tags[i];oral=raw.oral_weight[i]
 if tag in ('oral_rim','oral_cavity','throat'):
  w={'oral':oral} if oral>0 else {}
  w['body']=1-oral;return w
 side='L' if x>0 else 'R'
 if tag.startswith('pectoral_root'):
  t=smoothstep((abs(x)-.50)/.13);return {'body':1-t,'pectoral_'+side:t}
 if tag.startswith('pectoral_proximal'):
  t=smoothstep((abs(x)-.90)/.10)
  base=smoothstep((abs(x)-.50)/.13)
  return {'body':1-base,'pectoral_'+side:base*(1-t),'pectoral_tip_'+side:base*t}
 if tag.startswith('pectoral_distal'):return {'pectoral_tip_'+side:1.}
 if y<=.18:return {'body':1.}
 w=dict(tailweight(y))
 if DORSAL_LO<y<DORSAL_HI:
  # The rayless dorsal is a swelling of the trunk, so the dorsal bone takes
  # only its crest, blended out of the travelling tail curvature beneath it.
  lift=smoothstep((z-.24)/.16)*smoothstep((y-DORSAL_LO)/.05)*(1-smoothstep((y-(DORSAL_HI-.05))/.05))
  if lift>0:
   for k in list(w):w[k]*=1-lift
   w['dorsal']=w.get('dorsal',0)+lift
 return w
groups={name:body.vertex_groups.new(name=name) for name,_,_ in spec if name!='root'}
for i,v in enumerate(me.vertices):
 w=weights_for(i,tuple(v.co))
 total=sum(w.values());assert total>0
 for key,val in w.items():
  if val>0:groups[key].add([i],val/total,'REPLACE')
mod=body.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;body.parent=rig
for o in eyes:
 o.vertex_groups.new(name='body').add(list(range(len(o.data.vertices))),1,'REPLACE')
 m=o.modifiers.new('Anatomical skin','ARMATURE');m.object=rig
 world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world

# ---------------------------------------------------------------------------
# Export materials.  The source blend shades through a NormalMap -> Bump chain
# that glTF cannot carry, so the rest-space pore field is baked into the atlas
# normal maps here (build_material05 recorded that dependency explicitly) and
# the NormalMap node is wired straight to the BSDF.
# ---------------------------------------------------------------------------
N,H=1536,1024
vtex,uu=np.mgrid[0:H,0:N].astype(np.float32);uu=(uu+.5)/N;vtex=(vtex+.5)/H
vphysical=(vtex+.5)%1
source=bpy.data.images.load(str(REWORK/'material01-inputs/dermal-source-material01.png'),check_existing=True)
sw,sh=source.size;px=np.array(source.pixels[:],dtype=np.float32).reshape(sh,sw,4)
lum=px[:,:,:3].mean(2);lum=(lum-lum.mean())/(lum.std()+1e-6)
wx=.012*noise2d(uu*9.3+1.7,vtex*7.1+3.3)+.006*noise2d(uu*23.1+5.5,vtex*19.7+8.8)
wy=.012*noise2d(uu*8.1+6.2,vtex*9.9+1.9)+.006*noise2d(uu*21.3+2.2,vtex*17.1+4.4)
ix=np.clip(((.08+.84*uu+wx)*(sw-1)).astype(int),0,sw-1)
iy=np.clip(((.08+.84*vtex+wy)*(sh-1)).astype(int),0,sh-1)
detail=np.clip(lum[iy,ix],-2,2)/2*np.sin(np.pi*vtex)**2
fields.MICRO_HEIGHT=tuning['micro_height'];fields.MICRO_CONTRAST=tuning['micro_contrast']
PORE_AMPLITUDE=tuning['bump']*.0013   # Blender Bump: Strength * Distance
PORE_CELL=1/110.
def pore(width,circum):
 # The same physical feature size the shader's Object-space Noise carried,
 # expressed in this atlas's own units so it survives export.
 x=uu*width/PORE_CELL;y=vphysical*circum/PORE_CELL
 return PORE_AMPLITUDE*(noise2d(x,y)*.72+noise2d(x*2.1+3.7,y*2.1+1.3)*.28)
def normal_png(name,height,width,circum,periodic):
 h=height+pore(width,circum)
 dx=np.gradient(h.astype(np.float32),axis=1)*N/width
 dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*.5*H/circum if periodic else np.gradient(h.astype(np.float32),axis=0)*H/circum
 v=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);v/=np.linalg.norm(v,axis=2,keepdims=True)
 rgba=np.ones((H,N,4),np.float32);rgba[:,:,:3]=v*.5+.5
 im=bpy.data.images.new(name,width=N,height=H,alpha=False)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(BAKE/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 im.colorspace_settings.name='Non-Color'
 return im
shield_height=shield_field(uu,vphysical,detail)[1]
pectoral_height=pectoral_field(uu,vtex,detail)[1]
posterior_height=posterior_field(uu,vphysical,detail)[1]
NORMALS={'shield':normal_png('bothriolepis-v3-shield-normal',shield_height,1.775,3.,True),
         'pectoral':normal_png('bothriolepis-v3-pectoral-normal',pectoral_height,1.294,.24,False),
         'posterior':normal_png('bothriolepis-v3-posterior-normal',posterior_height,3.20,.80,True)}
def packed(prefix,kind):return bpy.data.images['%s-material05b-%s.png'%(prefix,kind)]
ATLAS={k:{'basecolor':packed(k,'basecolor'),'roughness':packed(k,'roughness'),'normal':NORMALS[k]} for k in NORMALS}
SLOT_ATLAS={0:'shield',1:'pectoral',2:'posterior',4:'shield'}
ORAL_COLOR=(.049,.035,.022)
def export_material(index,name):
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Roughness'].default_value=.60;bs.inputs['Coat Weight'].default_value=0.
 if index in SLOT_ATLAS:
  maps=ATLAS[SLOT_ATLAS[index]]
  bs.inputs['Base Color'].default_value=(1,1,1,1)
  for kind,socket in [('basecolor','Base Color'),('roughness','Roughness')]:
   tex=nodes.new('ShaderNodeTexImage');tex.image=maps[kind];links.new(tex.outputs['Color'],bs.inputs[socket])
  tex=nodes.new('ShaderNodeTexImage');tex.image=maps['normal']
  nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=tuning['normal_strength']
  links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 elif index==3:
  bs.inputs['Base Color'].default_value=(*ORAL_COLOR,1);bs.inputs['Roughness'].default_value=.60
 else:
  bs.inputs['Base Color'].default_value=(1,1,1,1)
  vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
  bs.inputs['Roughness'].default_value=.58
 return m
EXPORT_NAMES=['bothriolepis shield armour','bothriolepis dermal pectorals','bothriolepis scaleless posterior',
              'bothriolepis oral mucosa','bothriolepis oral rim armour','bothriolepis pectoral roots',
              'bothriolepis dermal articulation','bothriolepis rostral cap']
source_slots=[m.name for m in me.materials]
slot_index=[p.material_index for p in me.polygons]   # materials.clear() resets these
me.materials.clear()
for i,name in enumerate(EXPORT_NAMES):me.materials.append(export_material(i,name))
for poly,idx in zip(me.polygons,slot_index):poly.material_index=idx
assert sorted(set(slot_index))==list(range(8)),sorted(set(slot_index))
TEXTURED=set(SLOT_ATLAS)|{3}
def write_corner_colors(values_for_slot):
 for layer in list(me.color_attributes):me.color_attributes.remove(layer)
 attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for poly in me.polygons:
  slot=poly.material_index
  for loop in poly.loop_indices:
   attr.data[loop].color=values_for_slot(slot,me.loops[loop].vertex_index)
def full_color(slot,vertex):
 # Textured and constant-colour slots take white, so glTF's COLOR_0 multiply
 # does not square the pigment that the atlas already carries.
 if slot in TEXTURED:return (1,1,1,1)
 return (*pigment[vertex],1)
write_corner_colors(full_color)

# ---------------------------------------------------------------------------
# Anchors on the new oral geometry
# ---------------------------------------------------------------------------
mouth=np.array([raw.v[i] for i in raw.mouth_ids]);mouth_centre=mouth.mean(0)
throat=np.array([raw.v[i] for i,t in enumerate(raw.tags) if t=='throat'])
inside=(mouth_centre*.45+throat.mean(0)*.55)
anchors=[('anchor_mouth','oral',(0.,float(mouth_centre[1]),float(mouth_centre[2])),'mouth'),
         ('anchor_mouth_inside','oral',(0.,float(inside[1]),float(inside[2])),'swallow'),
         ('anchor_attack_primary','body',(0.,-1.545,-.155),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o)
 o.parent=rig;o.parent_type='BONE';o.parent_bone=bone
 o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}

# ---------------------------------------------------------------------------
# Eighteen clips: V2's names, durations, loop set and performances.
# ---------------------------------------------------------------------------
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1,'Bite':.5,
       'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,
       'Ability':1.8,'Growth':1.5}
loops=['Idle','Swim','Guard','Eat']
def smooth(t):return max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
def pulse(t,start,peak,end):
 if t<start or t>end:return 0
 return smooth((t-start)/(peak-start)) if t<peak else 1-smooth((t-peak)/(end-peak))
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 frames=round(duration*30)
 for frame in range(frames+1):
  t=frame/frames;phase=2*pi*t;env=sin(pi*t)**2
  for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def move(x=0,y=0,z=0):rig.pose.bones['body'].location=(x,y,z)
  def tail(amp,frequency=1,offset=0):
   for i,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):
    rot(b,z=amp*(.35+.25*i)*sin(frequency*phase-.66*i+offset),x=.02*amp*sin(frequency*phase-.5*i))
  def fins(amount,phaseoffset=0):
   for side,sign in [('L',1),('R',-1)]:
    rot('pectoral_'+side,x=.025*amount*sin(phase+phaseoffset),y=sign*.040*amount*sin(phase+.5),z=sign*.07*amount*(1-cos(phase))/2)
    rot('pectoral_tip_'+side,z=sign*.040*amount*sin(phase-.55))
  if name=='Idle':
   tail(.043);fins(.28);rot('oral',x=.03*(1-cos(phase*2)));rot('dorsal',z=.026*sin(phase-.7));rot('body',y=.008*sin(phase));move(z=.007*sin(phase))
  elif name=='Swim':
   tail(.25,2);fins(.9);rot('body',y=.032*sin(phase*2+.5),z=-.018*sin(phase*2));move(z=.014*sin(phase*4+.7));rot('dorsal',z=.05*sin(phase*2-1));rot('oral',x=.014*(1-cos(phase*2)))
  elif name=='Eat':
   tail(.039);rot('body',x=.035*(1-cos(phase)));move(z=-.015*(1-cos(phase)));fins(.45)
   gape=.17*pulse(t,.02,.15,.31)+.23*pulse(t,.43,.60,.82);rot('oral',x=gape);rot('dorsal',z=.018*sin(phase));rot('tail_tip',z=.065*sin(phase-.9))
  elif name=='Guard':
   tail(.032);rot('body',x=.025*(1-cos(phase)),y=.014*sin(phase));rot('pectoral_L',z=.11+.018*sin(phase),x=.025*sin(phase));rot('pectoral_R',z=-.11-.018*sin(phase),x=.025*sin(phase));rot('dorsal',z=.018*sin(phase+.6));rot('oral',x=.022*(1-cos(phase)))
  elif name=='Death':
   fall=smooth((t-.10)/.7);settle=smooth((t-.55)/.4);tail(.13*(1-smooth(t/.55)),2)
   rot('body',y=.72*fall,z=.09*settle,x=.035*fall);move(z=-.14*fall,y=.02*settle)
   for i,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=(.10+.035*i)*fall+.08*sin(phase*3-i*.7)*max(0,1-t/.65)**2)
   rot('pectoral_L',x=.06*fall,z=.07*fall);rot('pectoral_R',x=-.07*fall,z=-.13*fall);rot('pectoral_tip_R',z=-.065*fall);rot('oral',x=.08*fall);rot('dorsal',z=-.14*settle)
  else:
   tail(.07*env);fins(.5*env);rot('dorsal',z=.027*sin(phase-.5)*env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft' else -1;load=pulse(t,0,.18,.42);arc=pulse(t,.11,.52,.96);late=pulse(t,.30,.67,1)
    rot('body',z=s*(.40*arc-.045*load),y=s*.15*arc);move(x=s*.13*arc,z=.022*arc)
    rot('tail_base',z=-s*.25*arc);rot('tail_mid',z=-s*.22*late);rot('tail_tip',z=s*.16*late);rot('caudal',z=s*.19*pulse(t,.48,.76,1))
    rot('pectoral_L',z=.06*arc+s*.07*arc,x=.045*arc);rot('pectoral_R',z=-.06*arc+s*.07*arc,x=-.035*arc)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive' else -1;load=pulse(t,0,.18,.4);pitch=pulse(t,.08,.55,.98);late=pulse(t,.32,.70,1)
    rot('body',x=s*(.24*pitch-.035*load),y=.03*sin(phase)*env);move(z=-s*.12*pitch)
    rot('pectoral_L',x=s*.07*pitch,z=.08*pitch);rot('pectoral_R',x=s*.07*pitch,z=-.08*pitch);rot('tail_base',x=-s*.065*late);rot('caudal',x=-s*.055*late,z=.14*sin(phase*2)*env)
   elif name in ['Attack','Heavy']:
    heavy=name=='Heavy';load=pulse(t,0,.25,.45);drive=pulse(t,.26,.52,.86);recover=pulse(t,.58,.80,1)
    move(y=(.10 if heavy else .065)*load-(.23 if heavy else .16)*drive,z=.015*load-.035*drive)
    rot('body',x=.06*load-.085*drive,y=(.10 if heavy else .045)*drive,z=-.045*recover)
    rot('tail_base',z=.14*load-.23*drive);rot('tail_mid',z=-.11*load+.31*drive);rot('tail_tip',z=.33*pulse(t,.4,.63,.94));rot('caudal',z=-.32*pulse(t,.5,.70,1))
    rot('pectoral_L',z=.12*load-.035*drive,x=.045*load);rot('pectoral_R',z=-.12*load+.035*drive,x=.045*load);rot('oral',x=.07*drive);rot('dorsal',z=.08*drive-.03*recover)
   elif name=='Bite':
    opening=pulse(t,.04,.35,.70);close=pulse(t,.43,.67,.92);rot('oral',x=.28*opening);rot('body',x=.037*opening-.03*close);move(y=-.035*close,z=-.015*opening);rot('tail_mid',z=.055*pulse(t,.25,.7,1))
   elif name=='Ability':
    deploy=pulse(t,.02,.29,.64);asym=pulse(t,.38,.60,.86);relax=pulse(t,.62,.84,1)
    rot('body',y=.065*asym,z=.055*asym-.04*relax);move(z=.034*deploy)
    rot('pectoral_L',z=.19*deploy-.045*asym,y=.12*deploy,x=.055*deploy);rot('pectoral_R',z=-.19*deploy-.03*asym,y=-.12*deploy,x=.055*deploy)
    rot('pectoral_tip_L',z=.075*pulse(t,.10,.39,.79));rot('pectoral_tip_R',z=-.065*pulse(t,.15,.43,.82));tail(.16*env,2);rot('dorsal',z=.09*sin(phase*2)*env);rot('oral',x=.10*relax)
   elif name=='Hit':
    impact=pulse(t,0,.14,.45);recoil=pulse(t,.2,.52,.90);rot('body',y=.18*impact-.05*recoil,z=-.12*impact+.055*recoil);move(x=.055*impact,z=-.025*impact);rot('tail_base',z=.16*impact);rot('tail_tip',z=-.19*recoil);rot('oral',x=.095*impact);rot('pectoral_L',x=.05*impact);rot('pectoral_R',z=-.13*impact)
   elif name=='Stagger':
    a=pulse(t,0,.17,.43);b=pulse(t,.27,.46,.73);c=pulse(t,.62,.78,1);rot('body',y=.16*a-.10*b+.04*c,z=-.12*a+.085*b);move(x=.07*a-.04*b,z=-.025*(a+b));rot('tail_base',z=.17*a-.21*b);rot('tail_tip',z=-.20*a+.24*b-.08*c);rot('oral',x=.08*b);rot('pectoral_L',z=.12*a);rot('pectoral_R',z=-.09*b)
   elif name=='Parry':
    a=pulse(t,0,.33,.73);b=pulse(t,.4,.68,1);rot('body',y=.19*a,z=-.15*a+.025*b);move(x=.07*a);rot('tail_base',z=.21*a);rot('tail_tip',z=-.26*b);rot('pectoral_R',z=-.15*a);rot('pectoral_L',x=.06*a)
   elif name=='Dodge':
    coil=pulse(t,0,.23,.46);escape=pulse(t,.17,.56,.91);whip=pulse(t,.42,.75,1);rot('body',y=-.22*escape,z=.26*escape-.04*coil);move(x=.21*escape,z=.045*escape)
    rot('tail_base',z=.19*coil-.29*escape);rot('tail_mid',z=-.20*coil+.31*escape);rot('tail_tip',z=-.37*whip);rot('caudal',z=.28*whip);rot('pectoral_L',z=.13*coil-.04*escape);rot('pectoral_R',x=.065*escape);rot('dorsal',z=.11*whip)
   elif name=='Growth':
    stretch=pulse(t,0,.46,1);rot('body',x=-.04*stretch);move(z=.018*stretch);rot('pectoral_L',z=.13*stretch,y=.07*stretch);rot('pectoral_R',z=-.13*stretch,y=-.07*stretch);rot('oral',x=.12*pulse(t,.15,.40,.8));rot('dorsal',z=.07*pulse(t,.27,.60,1));rot('tail_tip',z=.12*sin(phase)*env)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update()
(CAND/'anchors.json').write_text(json.dumps({'bothriolepis':[{'name':n,'bone':b,'point':list(p),'role':r} for n,b,p,r in anchors]},indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/'bothriolepis-v3.blend'))

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
def export(path):
 bpy.ops.object.select_all(action='DESELECT')
 rig.select_set(True);body.select_set(True)
 for o in eyes:o.select_set(True)
 for name,_,_,_ in anchors:bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,
  export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,
  export_normals=True,export_texcoords=True,export_materials='EXPORT',export_morph=False,
  export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True,
  export_optimize_animation_keep_anim_armature=False)
export(CAND/'bothriolepis.glb')
full=sum(len(p.vertices)-2 for o in [body]+eyes for p in o.data.polygons)

# LOD: bake pigment, drop every texture, then physically reduce.
oral_tags={'oral_cavity','throat'}
for layer in list(me.color_attributes):me.color_attributes.remove(layer)
attr=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i in range(len(me.vertices)):
 attr.data[i].color=(*ORAL_COLOR,1) if raw.tags[i] in oral_tags else (*pigment[i],1)
for i,mat in enumerate(me.materials):
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 for l in list(links):
  if l.to_node==bs:links.remove(l)
 for n in list(nodes):
  if n.bl_idname in ('ShaderNodeTexImage','ShaderNodeNormalMap'):nodes.remove(n)
 bs.inputs['Base Color'].default_value=(1,1,1,1)
 vc=next((n for n in nodes if n.bl_idname=='ShaderNodeVertexColor'),None) or nodes.new('ShaderNodeVertexColor')
 vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for o in [body]+eyes:
 if len(o.data.polygons)>40:
  bpy.context.view_layer.objects.active=o
  dec=o.modifiers.new('Physical silhouette LOD','DECIMATE');dec.ratio=.28
  bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(CAND/'bothriolepis.lod1.glb')
lod=sum(len(p.vertices)-2 for o in [body]+eyes for p in o.data.polygons)

meta={'id':'bothriolepis','name':'Bothriolepis','species':'Bothriolepis canadensis','artVersion':3,
 'provenance':'Late Devonian (Frasnian), Escuminac Formation, Miguasha, Quebec, Canada',
 'description':'Angular armoured antiarch with a steep immobile head, inset dorsal eyes, a posterior median crest and long jointed dermal pectoral appendages. A long flexible posterior carries a small square rayless dorsal and an asymmetrical tail.',
 'lengthMeters':.40,'modelLength':5.0,'locomotion':'Swim','clips':list(clips),'looping':loops,
 'anchors':[a[0] for a in anchors],
 'eyes':{'meshes':[o.name for o in eyes],'headMesh':body.name,
   'evidence':'tools/devonian/eye-audit.py on export_audit_v3.mjs output; the globes are inset into the continuous cuirass and were carried unchanged through the whole rework-v3 chain (eye mesh hash asserted at every stage).'},
 'sources':['https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis','https://doi.org/10.26879/417'],
 'notes':['V3 is a complete re-author, not a revision of V2: one closed 55,802-vertex cuirass with the oral annulus, cavity, both pectoral appendages and the posterior in a single manifold.',
  'Surface relief is one resolved field. The V3 material chain (rework-v3) replaced MATERIAL04 stacked relief whose features were narrower than the mesh row pitch; longitudinal geometric-normal step excess over the smooth section form fell from 82.2 to 7.4 degrees.',
  'Dermal microrelief is halved against MATERIAL04 (bump .18 -> .08, rostral-band normal-map slope .165 -> .079) and its lattice is isotropic, domain-warped and circumferentially periodic, so it no longer organises into rows.',
  'The rostral cap carries the shared rest-space dermal field rather than a stretched chart; its mirrored disc chart is present in the UV layer but the cap is closed by a flat fan, which remains the reason it reads as a separate facet under raking light.',
  'The shader carried a rest-space pore Bump that glTF cannot express; it is baked into the exported atlas normal maps. The root, articulation and rostral-cap slots ship vertex pigment only and do not carry that bake.',
  'Pectoral segments have limited articulation, no ball joints, no head hinge and no terrestrial walking or rowing claim. Action labels are asset compatibility gestures, not Devonian gameplay definitions.']}
(CAND/'bothriolepis.json').write_text(json.dumps(meta,indent=2)+'\n')
(LOCAL/'build-stats-v3.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,
 'clips':clips,'source':str(SOURCE),'appearance_provenance':provenance,'materials':source_slots},indent=2)+'\n')
print('BOTHRIOLEPIS_V3_CANDIDATE_COMPLETE',full,lod,str(CAND),flush=True)
