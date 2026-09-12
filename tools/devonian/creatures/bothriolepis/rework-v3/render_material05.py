"""Render the MATERIAL05 blend: the matched close-up set and the nine views.

Read-only on the blend (never saved back).  Resumable: any image already on
disk is skipped, so a run can be split.  Usage:
  blender -b --python render_material05.py -- <stage> [outdir]
with stage one of `closeups`, `views`, `all`.

The close-up cameras are exactly diagnostic_m04_closeup.py's two regions and
three angles, in its `material` pass, so M05 can be put beside the M04
diagnostic sheet frame for frame; the open-mouth close-up and the nine views
are build_material04.py's own cameras and framing rule.
"""
import bpy,sys,json,math
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4];sys.path.insert(0,str(HERE))
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
stage=argv[0] if argv else 'all'
OUT=REPO.parent/'devonian-authoring/bothriolepis/rework-v3'/(argv[1] if len(argv)>1 else 'material05')
BLEND=OUT/('bothriolepis-%s.blend'%OUT.name)
bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene=bpy.context.scene
body=next(o for o in scene.objects if o.name.startswith('Bothriolepis V3 MATERIAL05'))
me=body.data
oral_key=me.shape_keys.key_blocks['Oral opening study only'];oral_key.value=0
scene.render.engine='CYCLES';scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.image_settings.file_format='PNG'
cam=scene.camera;cam_data=cam.data
def point(at):cam.rotation_euler=(Vector(at)-cam.location).to_track_quat('-Z','Y').to_euler()
written=[]
def render(name):
 path=OUT/(name+'.png')
 if path.exists():print('SKIP',name);written.append(name);return
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);written.append(name)

if stage in ('closeups','all'):
 scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
 scene.cycles.samples=32;cam_data.type='ORTHO'
 REGIONS={'nuchal-seam':{'target':(0.,.02,.56),'ortho_scale':.62},
          'rostral-cap':{'target':(0.,-1.58,-.05),'ortho_scale':.45}}
 ANGLES={'front':lambda t,s:Vector(t)+Vector((0,-2.4*s,.10*s)),
         'oblique':lambda t,s:Vector(t)+Vector((1.7*s,-1.9*s,1.1*s)),
         'side':lambda t,s:Vector(t)+Vector((2.5*s,0,.10*s))}
 for rname,region in REGIONS.items():
  cam_data.ortho_scale=region['ortho_scale']
  for aname,fn in ANGLES.items():
   cam.location=fn(region['target'],region['ortho_scale']);point(region['target'])
   render('closeup-%s_%s'%(rname,aname))
 oral_key.value=1
 cam_data.ortho_scale=.46;cam.location=Vector((0,-1.93,-1.28));point((0,-1.44,-.27))
 render('closeup-mouth-open')
 oral_key.value=0

if stage in ('views','all'):
 scene.render.resolution_x=1100;scene.render.resolution_y=880;scene.render.resolution_percentage=100
 scene.cycles.samples=32;cam_data.type='ORTHO'
 views=[('01-front',(0,-8,.80),(0,-.40,.04),'full',False),
        ('02-side',(8,.78,.14),(0,.78,.04),'full',False),
        ('03-dorsal',(0,.88,9),(0,.88,0),'full',False),
        ('04-oblique',(5.6,-6.2,4.2),(0,.67,.02),'full',False),
        ('05-underside',(0,.8,-9),(0,.8,0),'full',False),
        ('06-mouth-open',(0,-2.10,-4.0),(0,-1.40,-.25),'oral',True),
        ('07-mouth-depth-oblique',(.82,-1.90,-1.3),(0,-1.455,-.27),'oral',True),
        ('08-armour-detail',(3.8,-4.3,3.4),(0,-.72,.12),'armour',False),
        ('09-forehead-continuity',(0,-4,.95),(0,-1.30,.18),'cephalic',False)]
 framing=[]
 def fit(view):
  name,pos,target,scope,opened=view;oral_key.value=1 if opened else 0
  cam.location=pos;point(target)
  r=cam.rotation_euler.to_quaternion();right=r@Vector((1,0,0));up=r@Vector((0,1,0))
  pts=[v.co.copy() for v in me.vertices if scope=='full' or (scope=='armour' and v.co.y<.20)
       or (scope=='cephalic' and v.co.y<-1.05)
       or (scope=='oral' and abs(v.co.x)<.36 and v.co.y<-1.15 and v.co.z<-.10)]
  origin=Vector(target);xs=[(p-origin).dot(right) for p in pts];ys=[(p-origin).dot(up) for p in pts]
  width=max(xs)-min(xs);height=max(ys)-min(ys)
  aspect=scene.render.resolution_x/scene.render.resolution_y
  cam_data.ortho_scale=1.16*max(width,height*aspect)
  shift=right*((min(xs)+max(xs))/2)+up*((min(ys)+max(ys))/2)
  cam.location=Vector(pos)+shift;point(origin+shift)
  margin=min((1-width/cam_data.ortho_scale)/2,(1-height/(cam_data.ortho_scale/aspect))/2)
  assert margin>.065,(name,margin)
  framing.append({'view':name,'scope':scope,'minimum_fractional_margin':margin})
 for view in views:
  fit(view);render(view[0])
 oral_key.value=0
 (OUT/'camera-framing.json').write_text(json.dumps(framing,indent=2)+'\n')
print('BOTHRIOLEPIS_MATERIAL05_RENDER_DONE',stage,json.dumps(written))
