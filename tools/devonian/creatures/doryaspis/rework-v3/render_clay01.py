"""Six whole-sculpt views and one oral close view, with projected-bound fitting.

Neutral clay only. World Y-up/+Z-forward; no assumed Blender Z-up camera.
"""
import bpy
import json
import hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
OUT=REPO.parent/'devonian-authoring/doryaspis/rework-v3/clay01'
RENDERS=OUT/'renders'


def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()


assert not RENDERS.exists(),'STOP: clay01 render folder already exists'
construction=json.loads((OUT/'construction.json').read_text())
assert construction['passed'],'STOP: construction not passed'
assert sha(OUT/'doryaspis-clay01.blend')==construction['blend']['sha256'],'STOP: blend changed'
for path,expected in construction['inputHashes'].items():
    assert sha(path)==expected,'STOP: source changed '+path
assert Path(bpy.data.filepath).resolve()==(OUT/'doryaspis-clay01.blend').resolve(),'STOP: wrong blend input'
RENDERS.mkdir()
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU'
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=1080
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('Neutral clay studio')
scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value=(.14,.155,.175,1);bg.inputs[1].default_value=.65

subjects=[ob for ob in scene.objects if ob.type=='MESH']
points=[ob.matrix_world@v.co for ob in subjects for v in ob.data.vertices]


def orientation(back,up):
    back=Vector(back).normalized();up=Vector(up)
    right=up.cross(back).normalized();up=back.cross(right).normalized()
    return Matrix((right,up,back)).transposed().to_4x4()


for name,loc,energy,color,size in [
    ('Broad warm key',(3.5,5.5,4.0),850,(1.,.94,.86),5.0),
    ('Soft cool fill',(-4.0,2.2,1.0),550,(.82,.90,1.),5.0),
    ('Rear contour light',(1.0,3.5,-5.0),950,(.94,.97,1.),4.0),
    ('Ventral bounce',(-1.0,-4.0,1.0),240,(.91,.92,.96),4.5),
]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc
    direction=Vector((0,-.02,-.7))-ob.location
    ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

data=bpy.data.cameras.new('Projected bounds review camera');data.type='ORTHO'
data.clip_start=.01;data.clip_end=100
cam=bpy.data.objects.new('Projected bounds review camera',data);scene.collection.objects.link(cam);scene.camera=cam


def fit(viewpoints,back,up,margin=.10):
    rot=orientation(back,up);basis=rot.to_3x3();inverse=basis.transposed()
    q=[inverse@p for p in viewpoints]
    lo=Vector(tuple(min(p[i] for p in q) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in q) for i in range(3)))
    center=basis@((lo+hi)*.5)
    cam.matrix_world=rot;cam.location=center+Vector(back).normalized()*12
    data.ortho_scale=1
    bpy.context.view_layer.update()
    uv=[world_to_camera_view(scene,cam,p) for p in viewpoints]
    span=max(max(p.x for p in uv)-min(p.x for p in uv),
             max(p.y for p in uv)-min(p.y for p in uv))
    data.ortho_scale=span/(1-2*margin)
    bpy.context.view_layer.update()
    uv=[world_to_camera_view(scene,cam,p) for p in viewpoints]
    bounds={'left':min(p.x for p in uv),'right':max(p.x for p in uv),
            'bottom':min(p.y for p in uv),'top':max(p.y for p in uv)}
    assert min(bounds['left'],bounds['bottom'])>=margin-.002,'STOP: projected view clips low boundary'
    assert max(bounds['right'],bounds['top'])<=1-margin+.002,'STOP: projected view clips high boundary'
    assert min(p.z for p in uv)>data.clip_start,'STOP: subject behind camera'
    return {'boundsNDC':bounds,'position':list(cam.location),
            'cameraMatrix':[list(row) for row in cam.matrix_world],'orthoScale':data.ortho_scale,
            'back':back,'upHint':up,'pointCount':len(viewpoints),'margin':margin}


views=[
    ('01-three-quarter',(3.0,2.25,4.0),(0,1,0)),
    ('02-side',(1,0,0),(0,1,0)),
    ('03-front',(0,.08,1),(0,1,0)),
    ('04-dorsal',(0,1,0),(0,0,1)),
    ('05-ventral',(0,-1,0),(0,0,1)),
    ('06-posterior-quarter',(-3.0,1.4,-4.0),(0,1,0)),
]
records=[]
for name,back,up in views:
    record={'view':name,'wholeSpecimen':True,**fit(points,back,up)}
    file=RENDERS/(name+'.png');scene.render.filepath=str(file)
    bpy.ops.render.render(write_still=True)
    record.update(path=str(file),bytes=file.stat().st_size,sha256=sha(file))
    records.append(record);print('DORYASPIS_CLAY01_VIEW_OK',name,flush=True)

# A fixed anatomical region encloses the full rostral/anterior-face complex.
# Fit this box exactly; the rest of the body may leave a deliberate close-up.
oral_box=[Vector((x,y,z)) for x in (-.30,.30) for y in (-.115,.255) for z in (.64,1.12)]
record={'view':'07-oral-front-oblique','wholeSpecimen':False,
        **fit(oral_box,(.32,.30,1),(0,1,0),.12)}
file=RENDERS/'07-oral-front-oblique.png';scene.render.filepath=str(file)
bpy.ops.render.render(write_still=True)
record.update(path=str(file),bytes=file.stat().st_size,sha256=sha(file));records.append(record)
print('DORYASPIS_CLAY01_VIEW_OK','07-oral-front-oblique',flush=True)
manifest={'blend':construction['blend'],'inputHashes':construction['inputHashes'],
          'coordinates':'world Y-up/+Z-forward','render':'Cycles CPU, two threads, 40 samples, AgX',
          'resolution':[1440,1080],'views':records,'status':'review-needed, not visual approval'}
(OUT/'render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('DORYASPIS_CLAY01_RENDER_OK',str(OUT/'render-manifest.json'),flush=True)
