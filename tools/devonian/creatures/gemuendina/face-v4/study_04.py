"""Focused leading-face study on accepted Gemuendina material03, never public.

User-directed living reconstruction: front-facing aperture and closely adjacent
anterior eyes. Retains original topology, UVs, material networks and posterior.
This sculpt study is not the rigged production replacement or final eye audit.
"""
import bpy, bmesh, sys, math, json, hashlib
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SOURCE = ROOT.parent/'devonian-authoring/gemuendina/rework-v3/material-03/gemuendina-material-03.blend'
EXPECTED = '810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada'
OUT = ROOT.parent/'devonian-authoring/gemuendina/face-v4/study-04'
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE.parent/'rework-v3'))
sys.path.insert(0, str(HERE))
from sculpt_spec_02 import skin, make_mesh, smooth

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if sha(SOURCE) != EXPECTED: raise RuntimeError('Accepted material source changed')
if OUT.exists(): raise RuntimeError('Preserve previous study; choose a new version')
OUT.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
body = bpy.data.objects['Gemuendina_NEW_clay_envelope']
vertices, faces, materials, regions, oral = make_mesh()
if len(vertices) != len(body.data.vertices): raise RuntimeError('Sculpt correspondence changed')

from shape_04 import deform

before=[v.co.copy() for v in body.data.vertices]
changed=0
for v,region in zip(body.data.vertices,regions):
    q=deform(v.co,region)
    changed += (q-v.co).length > 1e-8
    v.co=q
body.data.update()
bm=bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
nonmanifold=sum(not e.is_manifold for e in bm.edges)
volume=bm.calc_volume(signed=True)
if nonmanifold or volume<=0: raise RuntimeError('Invalid sculpt envelope')
bm.to_mesh(body.data); bm.free()
assert all((v.co-before[v.index]).length==0 for v in body.data.vertices if before[v.index].y>=-1.04)

eyes=[]
for side,sign in [('L',1),('R',-1)]:
    obj=bpy.data.objects['Dorsal_eye_'+side]
    x,y=sign*.14,-1.625
    p=deform((x,y,skin(x,y)))
    eps=.0005
    px=deform((x+eps,y,skin(x+eps,y)))
    py=deform((x,y+eps,skin(x,y+eps)))
    normal=(px-p).cross(py-p).normalized()
    if normal.z<0: normal=-normal
    # Globe centre inside the true skin, with the corneal pole aligned to it.
    obj.location=p-normal*.025
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(normal)
    obj.scale=(.69,.69,.69)
    for mat in obj.data.materials:
        if mat.use_nodes:
            bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if bs:
                for link in list(bs.inputs['Roughness'].links): mat.node_tree.links.remove(link)
                bs.inputs['Roughness'].default_value=.34
                bs.inputs['Coat Weight'].default_value=0
    eyes.append({'side':side,'center':list(obj.location),'surface':list(p),'normal':list(normal),
                 'centerInset':.025,'finalContainmentAudit':'pending after shape approval'})

scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=32
scene.render.threads_mode='FIXED'; scene.render.threads=2
scene.render.resolution_x=1100; scene.render.resolution_y=850; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
views=[('front',(0,-5,.15),(0,-1.80,.07),1.9),
       ('face-oblique',(2.1,-3.9,1.55),(0,-1.51,.18),2.5),
       ('side',(6,-1.65,.10),(0,-1.65,.10),1.9),
       ('dorsal',(0,-.70,7),(0,-.70,.10),3.7),
       ('whole',(7,-7.8,6.4),(0,.70,.10),7.0),
       ('oral-low',(1,-4,-.05),(0,-1.78,.04),1.6)]
report={'source':str(SOURCE),'sourceSha256':EXPECTED,'scriptSha256':sha(__file__),
        'scope':'terminal snout study after user rejected V4 set-back opening; no production acceptance',
        'changedVertices':changed,'posteriorPreservedFromY':-1.04,'nonmanifoldEdges':nonmanifold,
        'volume':volume,'eyes':eyes,'renders':[]}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gemuendina-face-study-04.blend'))
report['blendSha256']=sha(OUT/'gemuendina-face-study-04.blend')
for name,pos,target,scale in views:
    scene.camera.location=pos
    scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera.data.ortho_scale=scale
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    report['renders'].append({'name':name,'sha256':sha(scene.render.filepath)})
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('GEMUENDINA_FACE_STUDY_VIEW_OK '+name,flush=True)
print('GEMUENDINA_FACE_STUDY_04_COMPLETE',flush=True)
