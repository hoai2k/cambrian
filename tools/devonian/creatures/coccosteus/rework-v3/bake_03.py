"""Bake the accepted procedural surface; immutable source, no anatomy edits."""
import bpy,sys,json,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from production_common_03 import *
from body_uv_02 import assign as assign_body_uv, check_coverage, RECTANGLES
# Versioned bake-only recovery. The original candidate03 dependencies stay frozen.
old_verify=verify
BAKE=ROOT/'baked-03'
def verify():
    old_verify()
    for row in json.loads((HERE/'frozen-bake-03.json').read_text())['inputs']:
        if sha(row['path'])!=row['sha256']:raise RuntimeError('Changed bake03 input '+row['path'])
def coverage_probe(image,channel):
    w,h=image.size;flat=np.empty(w*h*4,np.float32);image.pixels.foreach_get(flat)
    pixels=flat.reshape(h,w,4);result=[]
    for rectangle in RECTANGLES:
        u0,v0,u1,v1=rectangle
        x0=max(0,int(np.floor(u0*w-.5))-1);x1=min(w,int(np.ceil(u1*w-.5))+3)
        y0=max(0,int(np.floor(v0*h-.5))-1);y1=min(h,int(np.ceil(v1*h-.5))+3)
        field=pixels[y0:y1,x0:x1,:3]
        invalid=~np.isfinite(field).all(2)
        if channel=='albedo':invalid|=(field.min(2)<=.002)|(field.max(2)>=.75)
        elif channel=='roughness':invalid|=(field.min(2)<.30)|(field.max(2)>.85)
        coords=np.argwhere(invalid)
        result.append({'rectangle':rectangle,'pixelBounds':[x0,y0,x1,y1],'min':float(field.min()),'max':float(field.max()),
            'invalidPixelCount':len(coords),'firstInvalidPixels':[{'xyBottomUp':[int(x+x0),int(y+y0)],'rgb':field[y,x].tolist()}for y,x in coords[:64]]})
    return result
verify()
if BAKE.exists():raise RuntimeError('Preserve existing baked-03 evidence')
BAKE.mkdir();bpy.ops.wm.open_mainfile(filepath=str(SOURCE));s=bpy.context.scene
meshes=sorted([o for o in s.objects if o.type=='MESH'],key=lambda o:o.name)
assert len(meshes)==9
before={o.name:geo_hash(o)for o in meshes}
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=4;s.render.threads_mode='FIXED';s.render.threads=2
s.render.bake.target='IMAGE_TEXTURES';s.render.bake.margin=16;s.render.bake.use_clear=True;s.render.bake.use_selected_to_active=False
s.render.bake.normal_space='TANGENT';s.render.bake.normal_r='POS_X';s.render.bake.normal_g='POS_Y';s.render.bake.normal_b='POS_Z'
textures=[];material_records=[];body_uv=None;coverage=[]
inherited_margin_type=s.render.bake.margin_type
for oi,ob in enumerate(meshes):
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    if ob.data.shape_keys:
        ob.active_shape_key_index=0
        for key in ob.data.shape_keys.key_blocks:key.value=0
    if not ob.data.uv_layers:ob.data.uv_layers.new(name='UVMap')
    ob.data.uv_layers.active.name='UVMap'
    # Dedicated atlas; Object/attribute inputs continue sampling the accepted shader.
    if ob.name.startswith('Continuous'):
        body_uv=assign_body_uv(ob)
    elif 'orbital study' not in ob.name:
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.018,area_weight=.25,correct_aspect=True)
        bpy.ops.object.mode_set(mode='OBJECT')
    kind='body'if ob.name.startswith('Continuous')else'eyes'if 'orbital study'in ob.name else'fins'
    family=f'{oi:02d}-{kind}';sizes={'albedo':4096 if kind=='body'else 512 if kind=='eyes'else 1024,
                                  'normal':2048 if kind=='body'else 512,'roughness':2048 if kind=='body'else 512}
    # EXTEND dilates rendered texels into the strip border and pole-fan half-cells.
    # Keep it local to the body; prior fin/eye bake policy is unchanged.
    s.render.bake.margin_type='EXTEND' if kind=='body' else inherited_margin_type
    s.render.bake.margin=32 if kind=='body' else 16
    original_mats=list(ob.data.materials);copied=[]
    for i,mat in enumerate(original_mats):
        copied.append(mat.copy());ob.data.materials[i]=copied[-1]
    maps={}
    for channel,size in sizes.items():
        image=bpy.data.images.new('Coccosteus '+family+' '+channel,width=size,height=size,alpha=False,float_buffer=False)
        image.colorspace_settings.name='sRGB'if channel=='albedo'else'Non-Color'
        restored=[]
        for mat in copied:
            nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
            output=next(node for node in nodes if node.type=='OUTPUT_MATERIAL'and node.is_active_output)
            target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
            if channel!='normal':
                emission=nodes.new('ShaderNodeEmission');socket=bs.inputs['Base Color'if channel=='albedo'else'Roughness']
                if socket.is_linked:links.new(socket.links[0].from_socket,emission.inputs['Color'])
                elif channel=='roughness':emission.inputs['Color'].default_value=(*([socket.default_value]*3),1)
                else:emission.inputs['Color'].default_value=socket.default_value
                restored.append((mat,output,output.inputs['Surface'].links[0].from_socket,emission))
                links.new(emission.outputs[0],output.inputs['Surface'])
        if kind=='body' and channel=='albedo':
            # Preserve an exact paired reproduction before changing the padding policy.
            # The failed bake02 checked before saving, so its missing pixels are unknown.
            s.render.bake.margin_type=inherited_margin_type;s.render.bake.margin=16
            bpy.ops.object.bake(type='EMIT')
            baseline=BAKE/'01-body-albedo-before-extend.png'
            image.filepath_raw=str(baseline);image.file_format='PNG';image.save()
            baseline_probe={'image':record(baseline),'marginPixels':16,'marginType':inherited_margin_type,
                            'regions':coverage_probe(image,channel)}
            (BAKE/'body-albedo-before-extend-probe.json').write_text(json.dumps(baseline_probe,indent=2)+'\n')
            s.render.bake.margin_type='EXTEND';s.render.bake.margin=32
        bpy.ops.object.bake(type='NORMAL'if channel=='normal'else'EMIT')
        for mat,output,surface,emission in restored:
            mat.node_tree.links.new(surface,output.inputs['Surface']);mat.node_tree.nodes.remove(emission)
        image.filepath_raw=str(BAKE/(family+'-'+channel+'.png'));image.file_format='PNG';image.save();image.pack();maps[channel]=image
        if kind=='body':
            probe={'channel':channel,'image':record(Path(image.filepath_raw)),'marginPixels':s.render.bake.margin,
                   'marginType':s.render.bake.margin_type,'inheritedMarginType':inherited_margin_type,'regions':coverage_probe(image,channel)}
            (BAKE/('body-'+channel+'-coverage-probe.json')).write_text(json.dumps(probe,indent=2)+'\n')
            coverage.append(check_coverage(image,channel))
        pixels=np.empty(len(image.pixels),np.float32);image.pixels.foreach_get(pixels)
        assert np.isfinite(pixels).all() and pixels.max()>.001,'Empty/nonfinite bake'
        textures.append({**record(Path(image.filepath_raw)),'family':family,'kind':channel,'size':[size,size]})
        print('COCCOSTEUS_BAKE_OK',family,channel,flush=True)
    # Keep each original PBR specular/coat response while replacing only its fields by maps.
    mapped=[]
    for mi,old in enumerate(original_mats):
        role='oral accent'if kind=='body'and mi==1 else kind
        mat=bpy.data.materials.new('Coccosteus '+role+' '+family);mat.use_nodes=True
        bs=mat.node_tree.nodes.get('Principled BSDF');old_bs=old.node_tree.nodes.get('Principled BSDF')
        for prop in ('Metallic','Specular IOR Level','Coat Weight','Coat Roughness','IOR'):
            bs.inputs[prop].default_value=old_bs.inputs[prop].default_value
        bs.inputs['Metallic'].default_value=0
        for channel,image in maps.items():
            tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=image;tx.interpolation='Linear';tx.extension='EXTEND'
            if channel=='normal':
                normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=1
                mat.node_tree.links.new(tx.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
            else:mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color'if channel=='albedo'else'Roughness'])
        mapped.append(mat)
    for i,mat in enumerate(mapped):ob.data.materials[i]=mat
    if kind=='body':
        underside=mapped[0].copy();underside.name='Coccosteus underside';ob.data.materials.append(underside)
        for p in ob.data.polygons:
            if p.material_index==0 and p.normal.z<-.45 and p.center.z<0:p.material_index=2
    material_records.append({'object':ob.name,'family':family,'role':kind,'materials':[m.name for m in ob.data.materials]})
    if geo_hash(ob)!=before[ob.name]:raise RuntimeError('Bake altered accepted geometry '+ob.name)
# Explicit linear PNG sampling is a separate check from Blender bake success.
from atlas_pigment_01 import sample_object,stats
pigment={o.name:stats(sample_object(o))for o in meshes}
for ob in meshes:
    if geo_hash(ob)!=before[ob.name]:raise RuntimeError('Pigment stage altered accepted geometry')
s.cycles.samples=48
blend=BAKE/'coccosteus-baked-03.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
report={'phase':'bake candidate, exported appearance review pending','material_blend_sha256':SOURCE_SHA,
        'source_sha256':{**sources(),'bake_03.py':sha(Path(__file__))},'geometry_sha256':before,'accepted_rest_geometry_unchanged':True,
        'textures':textures,'materials':material_records,'linear_pigment':pigment,'body_uv':body_uv,'body_atlas_coverage':coverage,'body_bake_padding':{'marginPixels':32,'marginType':'EXTEND','inheritedMarginType':inherited_margin_type},
        'files':[record(blend),record(BAKE/'01-body-albedo-before-extend.png')]+[record(p)for p in sorted(BAKE.glob('*probe.json'))]}
(BAKE/'bake-report.json').write_text(json.dumps(report,indent=2)+'\n');verify()
print('COCCOSTEUS_BAKE_03_COMPLETE',flush=True)
