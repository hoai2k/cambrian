"""Blender 5.2: six lightweight mineral/substrate props. Z-up source, Y-up GLB."""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=ROOT/'public/assets/triassic/props-instanced'
SOURCES=HERE/'sources'
OUT.mkdir(parents=True,exist_ok=True); SOURCES.mkdir(exist_ok=True)
TAU=math.tau

def pigment(family,p,variant):
    x,y,z=p
    grain=math.sin(x*41+y*37+z*29)*math.sin(y*61-x*17)*.025
    if family=='stromatolite':
        wave=math.sin(z*100+1.4*math.sin(x*9)+.8*math.cos(y*11))
        base=(.085,.09,.038) if wave<.05 else (.25,.23,.12)
        top=min(1,z/.35)*.025
        return tuple(max(.015,c+grain+top) for c in base)+(1,)
    if family=='salt-crust':
        base=(.73,.69,.57); streak=.035*math.sin(x*22+y*11)
        return tuple(min(.9,max(.1,c+grain+streak)) for c in base)+(1,)
    band=abs(z-(.07 if variant==1 else .095))<.019
    base=(.27,.285,.27) if band else (.055,.066,.068)
    return tuple(max(.01,c+grain*.32) for c in base)+(1,)

def mesh_obj(name,verts,faces,family,variant):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    assert all(e.is_manifold for e in bm.edges),name+' open/non-manifold edge'
    assert all(f.calc_area()>1e-10 for f in bm.faces),name+' zero-area face'
    bm.to_mesh(mesh);bm.free()
    low=min(v.co.z for v in mesh.vertices)
    for v in mesh.vertices:v.co.z-=low
    # Axis-aligned bounding-box centre at base, identity object transform.
    for axis in (0,1):
        center=(min(v.co[axis] for v in mesh.vertices)+max(v.co[axis] for v in mesh.vertices))/2
        for v in mesh.vertices:v.co[axis]-=center
    col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for v in mesh.vertices:col.data[v.index].color=pigment(family,v.co,variant)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    material=bpy.data.materials.new(name+' pigment');material.use_nodes=True
    nodes=material.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='Color';material.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    mesh.materials.append(material)
    # Smooth the microbial form, preserve geological plate facets.
    for f in mesh.polygons:f.use_smooth=family in ('stromatolite','mud-ripple')
    return obj

def dome(variant):
    n=32;rings=10;verts=[];faces=[]
    # Continuous microbial laminae: alternating slightly undercut shelf edges.
    for j in range(rings):
        t=j/(rings-1);r=.35*math.cos(t*1.38)*(1+.022*((-1)**j))
        z=.015+.29*math.sin(t*1.38)
        for k in range(n):
            a=TAU*k/n;ir=1+.06*math.sin(3*a+variant)+.025*math.cos(7*a)
            verts.append((r*math.cos(a)*ir,r*math.sin(a)*(.87 if variant==1 else 1.03),z+.012*math.sin(2*a+variant)*(1-t)))
    for j in range(rings-1):
        for k in range(n):
            a=j*n+k;b=j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
    verts.extend([(0,0,0),(0,0,.314)]);bottom=len(verts)-2;top=bottom+1
    for k in range(n):
        faces.append((bottom,(k+1)%n,k));faces.append((top,(rings-1)*n+k,(rings-1)*n+(k+1)%n))
    return verts,faces

def mud_grid(variant):
    nx=21;ny=9;verts=[];faces=[]
    for j in range(ny):
        for i in range(nx):
            x=-1+2*i/(nx-1);y=-.85+1.7*j/(ny-1)
            x*=1-.05*abs(y)**4
            z=.15+.034*math.sin(x*13+.3*math.sin(y*4)+variant)
            verts.append((x,y,z))
    for j in range(ny-1):
        for i in range(nx-1):
            a=j*nx+i;faces.append((a,a+1,a+nx+1,a+nx))
    edge=list(range(nx))+[j*nx+nx-1 for j in range(1,ny)]+list(range(ny*nx-2,(ny-1)*nx-1,-1))+[j*nx for j in range(ny-2,0,-1)]
    last=edge
    for h in [.095,.068,0]:
        curr=[]
        for k in edge:
            x,y,z=verts[k];curr.append(len(verts));verts.append((x,y,h))
        for k in range(len(edge)):faces.append((last[k],curr[k],curr[(k+1)%len(edge)],last[(k+1)%len(edge)]))
        last=curr
    center=len(verts);verts.append((0,0,0))
    for k in range(len(edge)):faces.append((center,last[(k+1)%len(edge)],last[k]))
    return verts,faces

def plate(variant,family):
    n=20;nr=5;verts=[];faces=[]
    size=.5 if family=='salt-crust' else 1
    def surface(r,a):
        x=size*r*math.cos(a);y=size*r*math.sin(a)*(.81 if variant==1 else .96)
        if family=='salt-crust':
            z=.022+.07*r**4*(.55+.45*math.sin(a*3+variant))+.015*math.sin(x*12+y*10)*(1-r)
            thickness=.016
        else:
            z=.13+.025*math.sin(x*17+y*3+variant)+.009*math.sin(y*12+x*5)
            thickness=z # bottom flat, top wavy
        return x,y,z,thickness
    # Centre plus four rings: no stacked coplanar overlays, closed solid underside.
    x,y,z,th=surface(0,0);verts.append((x,y,z))
    for j in range(1,nr+1):
        r=j/nr
        for k in range(n):
            a=TAU*k/n
            irregular=1+.06*math.sin(5*a+variant)+.035*math.sin(9*a)
            x,y,z,th=surface(r,a);verts.append((x*irregular,y*irregular,z))
    for k in range(n):faces.append((0,1+k,1+(k+1)%n))
    for j in range(nr-1):
        for k in range(n):
            a=1+j*n+k;b=1+j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
    rim=1+(nr-1)*n;lower=len(verts)
    # Sediment slab edge includes a real thin ash horizon, with vertex pigment.
    levels=[.0,.055,.077] if family=='mud-ripple' else [None]
    if family=='mud-ripple' and variant==2:levels=[.0,.081,.10]
    last=[rim+k for k in range(n)]
    for h in reversed(levels):
        current=[]
        for k in range(n):
            x,y,z=verts[rim+k];current.append(len(verts));verts.append((x,y,h if h is not None else z-.016))
        for k in range(n):faces.append((last[k],current[k],current[(k+1)%n],last[(k+1)%n]))
        last=current
    center=len(verts);verts.append((0,0,0 if family=='mud-ripple' else -.005))
    for k in range(n):faces.append((center,last[(k+1)%n],last[k]))
    return verts,faces

def camera_at(target,location,scale):
    bpy.ops.object.camera_add(location=location);cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=scale;bpy.context.scene.camera=cam

def render(obj,name):
    extent=max(obj.dimensions);h=obj.dimensions.z
    camera_at((0,0,h*.45),(extent*1.4,-extent*1.8,extent*1.35),extent*1.65)
    for loc,power,size in [((1,-2,3),450,3),((-2,-1,1),180,2)]:
        bpy.ops.object.light_add(type='AREA',location=tuple(v*extent for v in loc));light=bpy.context.object
        light.data.energy=power*extent*extent;light.data.shape='DISK';light.data.size=size*extent
        light.rotation_euler=(Vector((0,0,h*.5))-light.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.world.color=(.22,.22,.22)
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)

records=[]
for family in ['stromatolite','salt-crust','mud-ripple']:
    for variant in [1,2]:
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.world=bpy.data.worlds.new('Studio')
        name='triassic-'+family+'-'+str(variant)
        verts,faces=dome(variant) if family=='stromatolite' else mud_grid(variant) if family=='mud-ripple' else plate(variant,family)
        obj=mesh_obj(name,verts,faces,family,variant)
        if family=='stromatolite' and variant==2:
            for v in obj.data.vertices:v.co.z*=.78
        bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.context.view_layer.update()
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES/(name+'.blend')))
        target=OUT/(name+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,
            export_animations=False,export_skins=False,export_texcoords=False,export_normals=True,
            export_vertex_color='NAME',export_vertex_color_name='Color',export_materials='EXPORT',export_yup=True)
        triangles=len(obj.data.polygons);assert triangles<=800
        records.append({'id':name,'family':family,'variant':variant,'status':'preview',
            'path':'assets/triassic/props-instanced/'+name+'.glb','portrait':'assets/triassic/props-instanced/'+name+'.png',
            'source':'tools/triassic/props/sources/'+name+'.blend','triangles':triangles,
            'dimensionsXYZ':[round(obj.dimensions.x,6),round(obj.dimensions.z,6),round(obj.dimensions.y,6)],
            'pivot':'base centre','static':True,'meshCount':1,'materialCount':1,'vertexColours':True,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size})
        render(obj,name)
(OUT/'manifest.json').write_text(json.dumps({'stage':'initial Blender-authored scenery library; not placed in runtime',
 'units':'game units, authored at requested scale-1 proportions','assets':records},indent=2)+'\n')
print('DELIVERED',len(records),'models',sum(r['triangles'] for r in records),'triangles',flush=True)
