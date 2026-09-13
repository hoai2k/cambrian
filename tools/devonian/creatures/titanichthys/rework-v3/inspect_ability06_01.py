"""Four diagnostic views of candidate06 maximum gape; no geometry/source save.
Flat material identities distinguish intersecting outer tissue from PBR highlights.
"""
from pathlib import Path
import bpy,sys,json,hashlib
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3';SRC=LOCAL/'candidate-06';OUT=LOCAL/'oral-probe-candidate06-01'
BLEND=SRC/'titanichthys-production-06.blend';LOD=SRC/'titanichthys.lod1.glb'
EXPECTED={'blend':'0965e540499f333fd6af34c196c9d3d1f90a0f59658cbb64b56d85e669eb3d82','lod':'27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(BLEND)==EXPECTED['blend']and sha(LOD)==EXPECTED['lod']
assert not OUT.exists(),'Preserve existing oral probe';OUT.mkdir()
bpy.ops.wm.open_mainfile(filepath=str(BLEND));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=2.8
scene.camera.location=(0,-8,-.16);scene.camera.rotation_euler=(Vector((0,-1.65,-.16))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
rig=bpy.data.objects['titanichthys_rig'];manifest={'inputs':EXPECTED,'script_sha256':sha(__file__),
    'legend':{'body':'cyan','underside':'yellow','oral accent':'magenta','other meshes':'dark grey'},
    'purpose':'Investigate two pale floor/lip patches seen only at Ability .5. Diagnostic shaders only; no geometry/weight/action changes.','renders':[]}
def material(role,neutral=False):
    mat=bpy.data.materials.new('Diagnostic '+role+(' neutral'if neutral else''));mat.use_nodes=True
    nodes=mat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial')
    if neutral:
        bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(.32,.32,.32,1);bs.inputs['Roughness'].default_value=.8
        mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
    else:
        emit=nodes.new('ShaderNodeEmission');emit.inputs['Color'].default_value={'body':(0,1,1,1),'underside':(1,1,0,1),'oral':(1,0,1,1)}.get(role,(.03,.03,.03,1))
        emit.inputs['Strength'].default_value=1.;mat.node_tree.links.new(emit.outputs['Emission'],out.inputs['Surface'])
    return mat
saved_roles={}
def assign(neutral=False):
    for ob in bpy.data.objects:
        if ob.type!='MESH':continue
        if ob.name not in saved_roles:
            saved_roles[ob.name]=['oral'if 'oral accent'in m.name.lower()else'underside'if 'underside'in m.name.lower()else'body'if 'titanichthys body'in m.name.lower()else'other'for m in ob.data.materials]
        indices=[p.material_index for p in ob.data.polygons];roles=saved_roles[ob.name]
        ob.data.materials.clear()
        for role in roles:ob.data.materials.append(material(role,neutral))
        for p,mi in zip(ob.data.polygons,indices):p.material_index=mi

def render(name,clip,phase,mode):
    path=OUT/(name+'.png');scene.render.filepath=str(path);bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    manifest['renders'].append({'path':str(path),'sha256':sha(path),'clip':clip,'phase':phase,'mode':mode})
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('TITANICHTHYS_ORAL_PROBE_VIEW '+name,flush=True)
assign();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);render('01-full-idle-role-id','Idle',0.,'flat role identity')
rig.animation_data.action=bpy.data.actions['Ability'];scene.frame_set(36);render('02-full-ability-role-id','Ability',.5,'flat role identity')
assign(True);render('03-full-ability-neutral','Ability',.5,'uniform neutral geometry')
for ob in list(bpy.data.objects):
    if ob.type in ('MESH','ARMATURE')or ob.name.startswith('anchor_'):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(LOD));rigs=[o for o in bpy.data.objects if o.type=='ARMATURE'];assert len(rigs)==1
rig=rigs[0];tracks=rig.animation_data.nla_tracks
for t in tracks:t.mute=True
track=next(t for t in tracks if t.name=='Ability');assert len(track.strips)==1
strip=track.strips[0];rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
scene.frame_set(36);saved_roles={};assign();render('04-lod-ability-role-id','Ability',.5,'actual imported LOD flat role identity')
assert sha(BLEND)==EXPECTED['blend']and sha(LOD)==EXPECTED['lod']
print('TITANICHTHYS_ORAL_PROBE_OK '+str(OUT/'manifest.json'),flush=True)
