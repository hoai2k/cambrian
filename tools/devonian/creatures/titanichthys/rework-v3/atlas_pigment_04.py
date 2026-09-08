"""Explicit atlas-to-linear-colour sampling and exact export-colour transfer.
Blender image decoder is checked against frozen independent PNG sample values.
No geometry, weights, animation or atlas pixels are changed by this utility.
"""
import bpy,json,struct,hashlib
import numpy as np
from pathlib import Path
HERE=Path(__file__).resolve().parent
GOLDEN=json.loads((HERE/'atlas_samples_02.json').read_text())
CACHE={}
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def bilinear(pixels,uv):
    h,w,_=pixels.shape;uv=np.asarray(uv,dtype=float)
    x=np.clip(uv[:,0]*w-.5,0,w-1);y=np.clip(uv[:,1]*h-.5,0,h-1)
    ix=np.floor(x).astype(int);iy=np.floor(y).astype(int);jx=np.minimum(ix+1,w-1);jy=np.minimum(iy+1,h-1)
    fx=(x-ix)[:,None];fy=(y-iy)[:,None]
    return (pixels[iy,ix]*(1-fx)+pixels[iy,jx]*fx)*(1-fy)+(pixels[jy,ix]*(1-fx)+pixels[jy,jx]*fx)*fy

def raw_atlas(path):
    name=Path(path).name
    if name in CACHE:return CACHE[name]
    gold=GOLDEN[name]
    if sha(path)!=gold['sha256']:raise RuntimeError('Albedo pixels/file differ from frozen sampling input '+name)
    image=bpy.data.images.load(str(path),check_existing=False)
    image.colorspace_settings.name='Non-Color' # raw normalized sRGB code values
    w,h=image.size;flat=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(flat)
    pixels=flat.reshape(h,w,4)[:,:,:3].copy();bpy.data.images.remove(image)
    values=bilinear(pixels,[s['uv']for s in gold['samples']]);expected=np.array([s['raw_rgb']for s in gold['samples']])
    error=float(np.max(np.abs(values-expected)))
    if error>2e-6:raise RuntimeError('Decoder/UV orientation/colour-space control sample failed '+name+' '+str(error))
    CACHE[name]=pixels;return pixels

def stats(colors):
    a=np.asarray(colors)[:,:3]
    return {'count':len(a),'min':a.min(0).tolist(),'max':a.max(0).tolist(),'mean':a.mean(0).tolist(),
            'max_white_distance':float(np.max(np.abs(a-1.))), 'range':float(a.max()-a.min())}
def assert_pigment(colors,label):
    a=np.asarray(colors)
    if not np.isfinite(a).all()or np.min(a)<0 or np.max(a)>1.00001:raise RuntimeError('Invalid linear pigment '+label)
    if a[:,:3].max()>=.75 or a[:,:3].max()-a[:,:3].min()<=.005:raise RuntimeError('Missing or invalid authored pigment '+label+' '+str(stats(a)))

def sample_object(ob):
    mesh=ob.data;uv=np.array([l.uv[:]for l in mesh.uv_layers.active.data]);colors=np.ones((len(mesh.loops),4),dtype=np.float32)
    for mi,mat in enumerate(mesh.materials):
        bs=mat.node_tree.nodes.get('Principled BSDF');links=bs.inputs['Base Color'].links
        if len(links)!=1 or links[0].from_node.type!='TEX_IMAGE':raise RuntimeError('Expected direct mapped albedo '+mat.name)
        tex=links[0].from_node
        if tex.inputs['Vector'].is_linked:raise RuntimeError('Unexpected alternate texture coordinates '+mat.name)
        ids=np.array([li for p in mesh.polygons if p.material_index==mi for li in p.loop_indices],dtype=int)
        raw=bilinear(raw_atlas(tex.image.filepath),uv[ids])
        linear=np.where(raw<=.04045,raw/12.92,((raw+.055)/1.055)**2.4)
        colors[ids,:3]=linear
    assert_pigment(colors,ob.name)
    old=mesh.color_attributes.get('Color')
    if old:mesh.color_attributes.remove(old)
    attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');attr.data.foreach_set('color',colors.ravel())
    mesh.color_attributes.active_color=attr;mesh.color_attributes.render_color_index=list(mesh.color_attributes).index(attr)
    mesh.update();ob.update_tag(refresh={'DATA'});bpy.context.view_layer.update()
    return colors

def transfer_export_colors(path,objects):
    """Recover exact intended corner colours despite exporter material masking.

    Match exported skinned world-space POSITION + TEXCOORD_0 against source loops after
    decimation. Rewrite only existing COLOR_0 bytes; all other GLB data are kept.
    """
    raw=bytearray(Path(path).read_bytes());n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);base=28+n
    by_name={o.data.name:o for o in objects};records=[];original=bytes(raw);allowed=np.zeros(len(raw),dtype=bool)
    def rows(ai):
        a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']];count={'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        fmt={5126:'f',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt);off=base+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',count*size)
        values=np.array([struct.unpack_from('<'+fmt*count,raw,off+i*stride)for i in range(a['count'])])
        if a.get('normalized'):values=values/(65535 if fmt=='H'else 255)
        return values,(a,fmt,off,stride,count)
    before=sha(path)
    for mesh_index,mesh in enumerate(g['meshes']):
        ob=by_name[mesh['name']];me=ob.data;uv=me.uv_layers.active.data;attr=me.color_attributes['Color']
        users=[node for node in g['nodes']if node.get('mesh')==mesh_index]
        if not users or any('skin'not in node for node in users):raise RuntimeError('Expected skinned export coordinate convention '+mesh['name'])
        # Blender5.2's skinned primitive extractor applies object.matrix_world
        # then stores float32 before Z-up to Y-up conversion. The two-eye actual
        # diagnostic proves local co is wrong; replicate that measured pathway.
        local=np.array([v.co[:]for v in me.vertices],dtype=np.float32)
        matrix=np.array(ob.matrix_world,dtype=float)
        world=(local@matrix[:3,:3].T+matrix[:3,3]).astype(np.float32)
        # A glTF primitive owns one material. Coincident source corners may
        # legitimately carry different pigment on adjacent palette regions.
        material_names=[mat.name for mat in me.materials]
        if len(set(material_names))!=len(material_names):raise RuntimeError('Ambiguous source material identity')
        loop_material=np.full(len(me.loops),-1,dtype=int)
        for poly in me.polygons:loop_material[list(poly.loop_indices)]=poly.material_index
        if np.any(loop_material<0):raise RuntimeError('Missing source corner material')
        lookup={}
        for loop in me.loops:
            co=world[loop.vertex_index];u,v=uv[loop.index].uv
            key=(material_names[loop_material[loop.index]],)+tuple(round(float(x),6)for x in (co[0],co[2],-co[1]))
            lookup.setdefault(key,[]).append((np.array((co[0],co[2],-co[1],u,1-v)),np.array(attr.data[loop.index].color)))
        for pi,primitive in enumerate(mesh['primitives']):
            material_name=g['materials'][primitive['material']]['name']
            if material_name not in material_names:raise RuntimeError('Export/source material identity mismatch '+material_name)
            attrs=primitive['attributes'];positions,_=rows(attrs['POSITION']);uvs,_=rows(attrs['TEXCOORD_0']);previous,description=rows(attrs['COLOR_0'])
            accessor,fmt,off,stride,count=description
            if count!=4 or fmt not in ('H','B','f')or 'min'in accessor or 'max'in accessor:raise RuntimeError('Unexpected colour encoding')
            if fmt!='f'and not accessor.get('normalized'):raise RuntimeError('Integer colour is not normalized')
            expected=[];coordinate_errors=[]
            for q in np.concatenate([positions,uvs],axis=1):
                key=(material_name,)+tuple(round(float(v),6)for v in q[:3]);candidates=lookup.get(key,[])
                if not candidates:raise RuntimeError('Export colour correspondence missing '+mesh['name']+' '+str(q))
                distance,color=min(((float(np.max(np.abs(q-p))),c)for p,c in candidates),key=lambda v:v[0])
                if distance>2e-6:raise RuntimeError('Export colour correspondence exceeds tolerance')
                close=[c for p,c in candidates if np.max(np.abs(q-p))<=2e-6]
                if any(np.max(np.abs(c-color))>5e-5 for c in close):raise RuntimeError('Ambiguous corner pigment correspondence')
                expected.append(color);coordinate_errors.append(distance)
            expected=np.array(expected);assert_pigment(expected,mesh['name']+' primitive '+str(pi))
            maximum=65535 if fmt=='H'else 255 if fmt=='B'else None
            encoded=np.rint(np.clip(expected,0,1)*maximum).astype(int)if maximum else expected.astype(np.float32)
            for i,row in enumerate(encoded):
                struct.pack_into('<'+fmt*count,raw,off+i*stride,*row)
                allowed[off+i*stride:off+i*stride+struct.calcsize(fmt)*count]=True
            decoded=encoded/maximum if maximum else encoded
            actual,_=rows(attrs['COLOR_0'])
            if np.max(np.abs(actual-decoded))>1e-8:raise RuntimeError('Written export colour does not match intended quantization')
            records.append({'mesh':mesh['name'],'primitive':pi,'before':stats(previous),'expected':stats(expected),
                            'after':stats(decoded),'quantization_max_error':float(np.max(np.abs(decoded-expected))),
                            'coordinate_uv_max_error':max(coordinate_errors),'source_material':material_name,'coordinate_convention':'matrix_world then float32 then glTF Y-up; exact primitive material plus original round6/2e-6/5e-5 checks retained'})
    if not np.array_equal(np.frombuffer(original,dtype=np.uint8)[~allowed],np.frombuffer(raw,dtype=np.uint8)[~allowed]):raise RuntimeError('Export repair changed non-colour bytes')
    Path(path).write_bytes(raw)
    return {'scope':'Existing COLOR_0 accessor bytes only; geometry, UV, weights, joints, animations, graph, materials untouched',
            'before_sha256':before,'after_sha256':sha(path),'primitives':records}
