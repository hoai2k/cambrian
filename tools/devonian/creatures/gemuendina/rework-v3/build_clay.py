"""Build ONLY the new local clay candidate. Does not read/modify a V2 asset."""
import bpy, bmesh, sys, json, hashlib
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/gemuendina/rework-v3/clay-01'
sys.dont_write_bytecode=True
sys.path.insert(0,str(HERE))
from sculpt_spec import make_mesh, eye_specs, VERSION, VIEWS

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
if OUT.exists() and any(OUT.iterdir()):
    raise RuntimeError('Candidate directory already contains evidence; Astra must select a new candidate. '+str(OUT))
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=.30/6.06

def material(name,color,roughness):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=roughness
    return mat
clay=material('Clay_warm_neutral',(.39,.355,.29),.69)
oral=material('Clay_oral_recess',(.16,.137,.105),.78)
eye=material('Eye_clay_landmark',(.039,.043,.036),.26)

verts,faces,mats,regions,oral_data=make_mesh()
mesh=bpy.data.meshes.new('Gemuendina_new_continuous_envelope')
mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('Gemuendina_NEW_clay_envelope',mesh);scene.collection.objects.link(body)
body.data.materials.append(clay);body.data.materials.append(oral)
for poly,mat in zip(mesh.polygons,mats): poly.material_index=mat;poly.use_smooth=True
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
nonmanifold=sum(not e.is_manifold for e in bm.edges)
loose=sum(not v.link_faces for v in bm.verts)
volume=bm.calc_volume(signed=True)
if nonmanifold or loose or volume<=0:
    raise RuntimeError(f'Invalid NEW clay envelope: nonmanifold={nonmanifold}, loose={loose}, volume={volume}')
bm.to_mesh(mesh);bm.free()
body['reconstruction_version']=VERSION
body['phase']='clay review; no art/export approval'
body['anatomy']='rhenanid; dorsal mouth and eyes; continuous cambered pectorals; finless tail'
body['authoring_forward']='-Y'
body['living_thickness']='artistic inference from fossil body plan and user art direction'
for name in ('dorsal','ventral','oral'):
    group=body.vertex_groups.new(name='region_'+name)
    ids=[i for i,region in enumerate(regions) if region==name]
    if ids:group.add(ids,1.0,'REPLACE')
# Retain continuous closed skin for later independent eye assessment.
for spec in eye_specs():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=spec['center'])
    obj=bpy.context.object;obj.name='Dorsal_eye_'+spec['side'];obj.scale=spec['radii']
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(eye)
    for p in obj.data.polygons:p.use_smooth=True
    obj['phase']='landmark globe; final eye material/containment audit follows frozen sculpt'

# One shallow dorsal exit each side, following the observed branchial orientation.
# Recess indication is a thin partial curve embedded against the continuous vault;
# it is deferred to final tissue geometry once the principal mass is approved.
from sculpt_spec import skin
for s in (-1,1):
    cu=bpy.data.curves.new('Branchial_exit_crease','CURVE');cu.dimensions='3D';cu.resolution_u=2
    cu.bevel_depth=.005;cu.bevel_resolution=2
    spline=cu.splines.new('POLY');spline.points.add(31)
    for i,p in enumerate(spline.points):
        t=i/31;x=s*(.76+.09*t);y=-.82+.30*t
        p.co=(x,y,skin(x,y)+.001,1)
    obj=bpy.data.objects.new('Dorsal_branchial_landmark_'+str(s),cu);scene.collection.objects.link(obj)
    obj.data.materials.append(oral)

# Orthographic, neutral studio; no ground plane hides the ventral contour.
world=bpy.data.worlds.new('Clay_review_world');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.075,.082,.09,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene.world=world
def area(name,position,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector((0,.30,.05))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Key_softbox',(-4,-5,7),1050,5.0,(1,.93,.83))
area('Fill_softbox',(4,0,4),600,4.0,(.85,.92,1))
area('Rear_rim',(-2,5,5),850,3.8,(1,.96,.88))
area('Ventral_fill',(1,-1,-5),450,4.0,(.86,.92,1))
data=bpy.data.cameras.new('Fixed_review_camera');camera=bpy.data.objects.new('Fixed_review_camera',data)
scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.lens=55
name,pos,target,scale=VIEWS[0];camera.location=pos
camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.filepath=str(OUT/'threequarter.png')
report={
    'version':VERSION,'phase':'clay review only','source_sha256':{p.name:sha(p) for p in [HERE/'sculpt_spec.py',HERE/'build_clay.py',HERE/'render_clay.py']},
    'vertices':len(mesh.vertices),'polygons':len(mesh.polygons),
    'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'closed_envelope':True,
    'nonmanifold_edges':nonmanifold,'loose_vertices':loose,'signed_volume':volume,
    'eyes':eye_specs(),'views':[{'name':n,'camera':p,'target':t,'ortho_scale':s}for n,p,t,s in VIEWS],
    'bounds':{'min':[min(v[k] for v in verts) for k in range(3)],'max':[max(v[k] for v in verts) for k in range(3)]},
    'deferred':['final mapped olive mosaic materials','jaw/throat tissues and denticles','rig/actions','GLB and LOD','eye/socket/general audits'],
}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gemuendina-clay-01.blend'))
report['blend_sha256']=sha(OUT/'gemuendina-clay-01.blend')
(OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('GEMUENDINA_CLAY_BUILD_OK '+json.dumps({'output':str(OUT),'blend_sha256':report['blend_sha256'],'triangles':report['triangles']}))
