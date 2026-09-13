"""Build only the structured LOD07, reusing accepted candidate04 rig/actions.
No full bake, full export, decimation, pigment clamp or geometry redesign.
"""
import bpy,sys,json,shutil
from pathlib import Path
import numpy as np
from mathutils import Matrix
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from lod_common_07 import *
from rig_actions_01 import CLIPS,bones
from atlas_pigment_01 import assert_pigment,stats,transfer_export_colors
from export_patch_02 import patch_export
from lip_basis_07 import repair_file
verify();assert not OUT.exists(),'Preserve existing candidate07'
plan=json.loads((PLAN/'plan-report.json').read_text());archive=np.load(PLAN/'mesh-plan.npz',allow_pickle=False)
assert sha(plan['archive']['path'])==plan['archive']['sha256']
assert sha(PREVIOUS/'coccosteus.glb')==plan['sourceGlb']['sha256']
OUT.mkdir();bpy.ops.wm.open_mainfile(filepath=str(PREVIOUS/'coccosteus-production-04.blend'));scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.device='CPU';scene.render.fps=30
rig=next(o for o in scene.objects if o.type=='ARMATURE');assert set(rig.data.bones.keys())==set(plan['bones'])==set(bones())
assert max(abs(rig.matrix_world[i][j]-Matrix.Identity(4)[i][j])for i in range(4)for j in range(4))<1e-8
assert set(a.name for a in bpy.data.actions)==set(CLIPS)
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
scene.frame_set(0)
for ob in list(scene.objects):
    if ob.type=='MESH':bpy.data.objects.remove(ob,do_unlink=True)
sockets=[o for o in scene.objects if o.name.startswith('anchor_')];assert len(sockets)==3
materials=[]
for name in plan['materials']:
    mat=bpy.data.materials.new(name+' LOD structured07');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.18 if 'eyes'in name else .55
    color=mat.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color';mat.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color']);materials.append(mat)
def zup(a):return np.column_stack([a[:,0],-a[:,2],a[:,1]])
parts=[];stages={};uv_repairs={}
for row in plan['meshes']:
    prefix='m'+str(row['index'])+'_';a={k:archive[prefix+k]for k in ['positions','faces','normals','uv','colors','joints','weights','materials']}
    pos=zup(a['positions']);faces=a['faces'];mesh=bpy.data.meshes.new(row['name']+' structured07');mesh.from_pydata(pos.tolist(),[],faces.tolist());mesh.update()
    assert len(mesh.polygons)==row['triangles'] and len(mesh.vertices)==row['vertices']
    local=sorted(set(a['materials'].tolist()));mapping={v:i for i,v in enumerate(local)}
    for i in local:mesh.materials.append(materials[i])
    for poly,mat in zip(mesh.polygons,a['materials']):poly.material_index=mapping[int(mat)];poly.use_smooth=True
    corner_uv=a['uv'].copy()
    if row['name'].startswith('Continuous'):
        crossing=np.ptp(corner_uv[:,:,0],axis=1)>.5
        corrected=crossing[:,None]&(corner_uv[:,:,0]<.03)
        corner_uv[:,:,0][corrected]=.98
        assert np.ptp(corner_uv[:,:,0],axis=1).max()<.2
        uv_repairs[row['name']]=int(corrected.sum())
    uv=corner_uv.reshape(-1,2);uv[:,1]=1-uv[:,1];layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',uv.ravel())
    rgba=np.column_stack([a['colors'].reshape(-1,3),np.ones(len(mesh.loops))]);assert_pigment(rgba,row['name'])
    color=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');color.data.foreach_set('color',rgba.ravel());mesh.color_attributes.active_color=color;mesh.color_attributes.render_color_index=0
    mesh.normals_split_custom_set(zup(a['normals'].reshape(-1,3)).tolist());mesh.update()
    ob=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(ob);ob.parent=rig
    assert max(abs(ob.matrix_world[i][j]-Matrix.Identity(4)[i][j])for i in range(4)for j in range(4))<1e-8
    groups=[ob.vertex_groups.new(name=name)for name in plan['bones']]
    for vi,(joints,weights)in enumerate(zip(a['joints'],a['weights'])):
        assert abs(weights.sum()-1)<1e-6 and weights.min()>=0
        for j,w in zip(joints,weights):
            if w>0:groups[int(j)].add([vi],float(w),'REPLACE')
    mod=ob.modifiers.new('Accepted Coccosteus armature','ARMATURE');mod.object=rig
    parts.append(ob);stages[ob.name]=stats(rgba)
assert sum(len(o.data.polygons)for o in parts)==plan['triangles']
bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
for ob in parts+sockets+[rig]:ob.select_set(True)
bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
    export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',
    export_vertex_color='NAME',export_vertex_color_name='Color',export_all_vertex_colors=False,export_yup=True,export_extras=True,export_morph=False)
path=OUT/'coccosteus.lod1.glb';bpy.ops.export_scene.gltf(filepath=str(path),**kwargs)
transfer=transfer_export_colors(path,parts);patch_export(path,True)
basis=repair_file(PREVIOUS/'coccosteus.glb',path)
for name in ['coccosteus.glb','coccosteus.json']:
    shutil.copyfile(PREVIOUS/name,OUT/name);assert sha(PREVIOUS/name)==sha(OUT/name)
report={'phase':'LOD07 source built; actual matched art review pending','source_sha256':sources(),
    'fullCopiedByteExactlyFrom':record(PREVIOUS/'coccosteus.glb'),'rigSource':record(PREVIOUS/'coccosteus-production-04.blend'),
    'plan':record(PLAN/'plan-report.json'),'full_triangles':plan['fullTriangles'],'lod_triangles':plan['triangles'],'lod_ratio':plan['ratio'],
    'pigment_stages':stages,'pigment_transfer':transfer,'ventral_seam_uv_corners_corrected':uv_repairs,'lip_basis_repair':basis,
    'files':[record(OUT/name)for name in ['coccosteus.glb','coccosteus.lod1.glb','coccosteus.json']]}
(OUT/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n');verify();print('COCCOSTEUS_LOD_07_COMPLETE',flush=True)
