"""Explicit atlas-to-linear-colour sampling and exact export-colour transfer.
Blender image decoder is checked against independently decoded baked PNG pixels.
No geometry, weights, animation or atlas pixels are changed by this utility.
"""
import bpy,json,struct,hashlib,zlib
import numpy as np
from pathlib import Path
HERE=Path(__file__).resolve().parent
CACHE={}
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def bilinear(pixels,uv):
    h,w,_=pixels.shape;uv=np.asarray(uv,dtype=float)
    x=np.clip(uv[:,0]*w-.5,0,w-1);y=np.clip(uv[:,1]*h-.5,0,h-1)
    ix=np.floor(x).astype(int);iy=np.floor(y).astype(int);jx=np.minimum(ix+1,w-1);jy=np.minimum(iy+1,h-1)
    fx=(x-ix)[:,None];fy=(y-iy)[:,None]
    return (pixels[iy,ix]*(1-fx)+pixels[iy,jx]*fx)*(1-fy)+(pixels[jy,ix]*(1-fx)+pixels[jy,jx]*fx)*fy

def png_pixels(path):
    """Independent PNG decoding of baked 8-bit RGB/RGBA; no Blender colour state."""
    raw=Path(path).read_bytes();assert raw[:8]==b'\x89PNG\r\n\x1a\n'
    at=8;compressed=b''
    while at<len(raw):
        length=struct.unpack_from('>I',raw,at)[0];kind=raw[at+4:at+8];data=raw[at+8:at+8+length];at+=12+length
        if kind==b'IHDR':w,h,depth,colour,compression,filter_method,interlace=struct.unpack('>IIBBBBB',data)
        if kind==b'IDAT':compressed+=data
    assert depth==8 and colour in (2,6) and interlace==0, 'Unexpected baked PNG encoding'
    channels=3 if colour==2 else 4;stride=w*channels;data=zlib.decompress(compressed)
    assert len(data)==h*(stride+1)
    rows=np.zeros((h,stride),np.uint8)
    for y in range(h):
        mode=data[y*(stride+1)];row=np.frombuffer(data,dtype=np.uint8,count=stride,offset=y*(stride+1)+1).copy()
        previous=rows[y-1]if y else np.zeros(stride,np.uint8)
        if mode==1:
            # Bytewise recurrence is an independent PNG reconstruction, once per atlas.
            for x in range(channels,stride):row[x]=(int(row[x])+int(row[x-channels]))&255
        elif mode==2:row=(row.astype(np.uint16)+previous.astype(np.uint16)).astype(np.uint8)
        elif mode in (3,4):
            for x in range(stride):
                left=int(row[x-channels])if x>=channels else 0;up=int(previous[x]);ul=int(previous[x-channels])if x>=channels else 0
                if mode==3:value=(left+up)//2
                else:
                    p=left+up-ul;aa,bb,cc=abs(p-left),abs(p-up),abs(p-ul)
                    value=left if aa<=bb and aa<=cc else up if bb<=cc else ul
                row[x]=(int(row[x])+value)&255
        else:assert mode==0, 'Unsupported PNG filter'
        rows[y]=row
    return rows.reshape(h,w,channels)[::-1,:,:3].astype(np.float32)/255

def raw_atlas(path):
    key=(str(Path(path).resolve()),sha(path))
    if key in CACHE:return CACHE[key]
    pixels=png_pixels(path)
    # Compare a deterministic grid against a separately loaded raw Blender image.
    image=bpy.data.images.load(str(path),check_existing=False);image.colorspace_settings.name='Non-Color'
    w,h=image.size;flat=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(flat)
    decoded=flat.reshape(h,w,4)[:,:,:3];uv=[(.017+.137*x,.023+.131*y)for x in range(7)for y in range(7)]
    error=float(np.max(np.abs(bilinear(decoded,uv)-bilinear(pixels,uv))))
    bpy.data.images.remove(image)
    if error>2e-6:raise RuntimeError('Independent PNG/Blender orientation-colour check failed '+str(error))
    CACHE[key]=pixels;return pixels

def stats(colors):
    a=np.asarray(colors)[:,:3]
    return {'count':len(a),'min':a.min(0).tolist(),'max':a.max(0).tolist(),'mean':a.mean(0).tolist(),
            'max_white_distance':float(np.max(np.abs(a-1.))), 'range':float(a.max()-a.min()),
            'rgba_min':np.asarray(colors).min(0).tolist(),'rgba_max':np.asarray(colors).max(0).tolist(),
            'negative_count':int(np.sum(np.asarray(colors)<0)),'above_one_count':int(np.sum(np.asarray(colors)>1.00001))}
def assert_pigment(colors,label):
    a=np.asarray(colors)
    if not np.isfinite(a).all()or np.min(a)<0 or np.max(a)>1.00001:raise RuntimeError('Invalid linear pigment '+label+' '+str(stats(a)))
    if a[:,:3].max()>=.75 or a[:,:3].max()-a[:,:3].min()<=.005:raise RuntimeError('Missing or invalid authored pigment '+label+' '+str(stats(a)))

def sample_object(ob,footprint=0.):
    mesh=ob.data;uv=np.array([l.uv[:]for l in mesh.uv_layers.active.data]);colors=np.ones((len(mesh.loops),4),dtype=np.float32)
    for mi,mat in enumerate(mesh.materials):
        bs=mat.node_tree.nodes.get('Principled BSDF');links=bs.inputs['Base Color'].links
        if len(links)!=1 or links[0].from_node.type!='TEX_IMAGE':raise RuntimeError('Expected direct mapped albedo '+mat.name)
        tex=links[0].from_node
        if tex.inputs['Vector'].is_linked:raise RuntimeError('Unexpected alternate texture coordinates '+mat.name)
        ids=np.array([li for p in mesh.polygons if p.material_index==mi for li in p.loop_indices],dtype=int)
        raw=raw_atlas(tex.image.filepath)
        linear_pixels=np.where(raw<=.04045,raw/12.92,((raw+.055)/1.055)**2.4)
        if footprint:
            # Positive 3x3 kernel in LINEAR light at final LOD UVs. No colour
            # interpolation is entrusted to the geometry decimator.
            linear=np.zeros((len(ids),3),np.float32)
            for dx,wx in [(-1,.25),(0,.5),(1,.25)]:
                for dy,wy in [(-1,.25),(0,.5),(1,.25)]:
                    linear+=wx*wy*bilinear(linear_pixels,uv[ids]+np.array([dx,dy])*footprint)
        else:linear=bilinear(linear_pixels,uv[ids])
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

    Match exported POSITION + TEXCOORD_0 against the frozen source loops after
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
    for mesh in g['meshes']:
        ob=by_name[mesh['name']];me=ob.data;uv=me.uv_layers.active.data;attr=me.color_attributes['Color']
        lookup={}
        for loop in me.loops:
            co=me.vertices[loop.vertex_index].co;u,v=uv[loop.index].uv
            key=tuple(round(float(x),6)for x in (co.x,co.z,-co.y))
            lookup.setdefault(key,[]).append((np.array((co.x,co.z,-co.y,u,1-v)),np.array(attr.data[loop.index].color)))
        for pi,primitive in enumerate(mesh['primitives']):
            attrs=primitive['attributes'];positions,_=rows(attrs['POSITION']);uvs,_=rows(attrs['TEXCOORD_0']);previous,description=rows(attrs['COLOR_0'])
            accessor,fmt,off,stride,count=description
            if count!=4 or fmt not in ('H','B','f')or 'min'in accessor or 'max'in accessor:raise RuntimeError('Unexpected colour encoding')
            if fmt!='f'and not accessor.get('normalized'):raise RuntimeError('Integer colour is not normalized')
            expected=[]
            for q in np.concatenate([positions,uvs],axis=1):
                key=tuple(round(float(v),6)for v in q[:3]);candidates=lookup.get(key,[])
                if not candidates:raise RuntimeError('Export colour correspondence missing '+mesh['name']+' '+str(q))
                distance,color=min(((float(np.max(np.abs(q-p))),c)for p,c in candidates),key=lambda v:v[0])
                if distance>2e-6:raise RuntimeError('Export colour correspondence exceeds tolerance')
                close=[c for p,c in candidates if np.max(np.abs(q-p))<=2e-6]
                if any(np.max(np.abs(c-color))>5e-5 for c in close):raise RuntimeError('Ambiguous corner pigment correspondence')
                expected.append(color)
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
                            'after':stats(decoded),'quantization_max_error':float(np.max(np.abs(decoded-expected)))})
    if not np.array_equal(np.frombuffer(original,dtype=np.uint8)[~allowed],np.frombuffer(raw,dtype=np.uint8)[~allowed]):raise RuntimeError('Export repair changed non-colour bytes')
    Path(path).write_bytes(raw)
    return {'scope':'Existing COLOR_0 accessor bytes only; geometry, UV, weights, joints, animations, graph, materials untouched',
            'before_sha256':before,'after_sha256':sha(path),'primitives':records}
