"""Frozen four-view material inspection. Saved material blend remains immutable."""
from pathlib import Path
import bpy
import hashlib
import json
import math
from mathutils import Vector,Matrix

HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
OUT=REPO.parent/'devonian-authoring/titanichthys/rework-v3/material-01'
SOURCE=OUT/'titanichthys-material-01.blend'
REPORT=OUT/'material-report.json'
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
if Path(bpy.data.filepath).resolve()!=SOURCE.resolve():raise RuntimeError('Wrong material source blend')
report=json.loads(REPORT.read_text())
if report['source_blend_sha256']!='69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec':
    raise RuntimeError('Wrong coarse-form provenance')
if sha(SOURCE)!=report['blend_sha256']:raise RuntimeError('Material blend changed since build')
if sha(HERE/'materials_01.py')!=report['material_script_sha256']:raise RuntimeError('Material authoring script changed')
if report['geometry_topology_shape_keys_transforms_unchanged'] is not True:raise RuntimeError('Geometry-preservation check did not pass')
if len(report['textures'])!=18:raise RuntimeError('Expected eighteen PBR maps')
for texture in report['textures']:
    if sha(texture['path'])!=texture['sha256']:raise RuntimeError('Baked texture changed: '+texture['path'])
RENDERS=OUT/'renders'
if RENDERS.exists():raise RuntimeError('Material renders already exist; preserve them and return to Astra')
RENDERS.mkdir()
scene=bpy.context.scene;camera=scene.camera
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.exposure=-.35
camera.data.type='ORTHO'
gape_keys=[ob.data.shape_keys.key_blocks['Gape study 24 degrees'] for ob in bpy.data.objects
           if ob.type=='MESH' and ob.data.shape_keys and 'Gape study 24 degrees' in ob.data.shape_keys.key_blocks]
followers=[(ob,ob.matrix_world.copy()) for ob in bpy.data.objects if ob.get('gape_skull_follow')]
if len(gape_keys)!=1 or len(followers)!=2:raise RuntimeError('Unexpected temporary gape structure')
neck=Vector((0,-1.40,.72))
oral_key=bpy.data.objects['Oral inspection fill']
original_oral_matrix=oral_key.matrix_world.copy();original_size=oral_key.data.size
fill_data=bpy.data.lights.new('Temporary material oral fill','AREA');fill_data.energy=0
fill_data.shape='DISK';fill_data.size=.50;fill_data.color=(.90,.95,1.)
oral_fill=bpy.data.objects.new('Temporary material oral fill',fill_data);bpy.context.collection.objects.link(oral_fill)
oral_fill.location=(.55,-4.20,-.10)
oral_fill.rotation_euler=(Vector((0,-1.50,-.18))-oral_fill.location).to_track_quat('-Z','Y').to_euler()
# name, camera, target, scale, existing gape value, oral inspection lighting
views=[
    ('01-material-side',(11,.55,.08),(0,.55,.08),9.4,0.,False),
    ('02-material-oblique',(8.4,-9.4,4.7),(0,.10,.08),9.4,0.,False),
    ('03-armour-close',(5,-6,3.3),(0,-1.64,.24),4.5,0.,False),
    ('04-oral-open',(0,-8,-.16),(0,-1.65,-.16),2.8,1.,True),
]
outputs=[]
for name,position,target,scale,value,oral in views:
    camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale
    for key in gape_keys:key.value=value
    for ob,original_matrix in followers:
        rotation=Matrix.Translation(neck)@Matrix.Rotation(math.radians(-2)*value*ob['gape_skull_weight'],4,'X')@Matrix.Translation(-neck)
        ob.matrix_world=rotation@original_matrix
    if oral:
        oral_key.location=(-.40,-4.30,-.17)
        oral_key.rotation_euler=(Vector((0,-1.50,-.18))-oral_key.location).to_track_quat('-Z','Y').to_euler()
        oral_key.data.energy=200;oral_key.data.size=.70;oral_fill.data.energy=70
    else:
        oral_key.matrix_world=original_oral_matrix;oral_key.data.energy=0;oral_key.data.size=original_size;oral_fill.data.energy=0
    scene.render.filepath=str(RENDERS/(name+'.png'))
    bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    path=RENDERS/(name+'.png')
    outputs.append({'view':name,'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path),
                    'camera':position,'target':target,'ortho_scale':scale,'gape':value,'oral_inspection_lighting':oral})
    print('TITANICHTHYS_MATERIAL_VIEW_OK '+name,flush=True)
if sha(SOURCE)!=report['blend_sha256']:raise RuntimeError('Material blend was changed during rendering')
manifest={'status':'UNREVIEWED MATERIAL STUDY','material_blend_sha256':report['blend_sha256'],
          'coarse_form_blend_sha256':report['source_blend_sha256'],'material_report_sha256':sha(REPORT),
          'material_script_sha256':report['material_script_sha256'],'renderer_sha256':sha(Path(__file__)),
          'resolution':[1600,1200],'samples':48,'threads':2,'device':'CPU','views':outputs,
          'warning':'No saved blend mutation, final anatomy/eye audit, rig or export approval'}
(RENDERS/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('TITANICHTHYS_MATERIAL_RENDER_OK '+str(RENDERS/'manifest.json'))
