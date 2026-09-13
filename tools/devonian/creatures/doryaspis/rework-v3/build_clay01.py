"""Astra-authored Doryaspis clay01; execute once by Terra, CPU and two threads.

World coordinates remain Y-up/+Z-forward inside Blender as well as rendering.
No source import, textures, rig, actions, exports, LOD or public mutation.
"""
import bpy
import bmesh
import json
import sys
import hashlib
from pathlib import Path
from math import isfinite
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
ROOT=REPO.parent/'devonian-authoring/doryaspis/rework-v3'
OUT=ROOT/'clay01'
sys.path.insert(0,str(HERE))
import geometry_clay01 as design


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


assert not OUT.exists(),'STOP: clay01 already exists; preserve candidate and return to author'
OUT.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=2


def material(name,color,rough=.64):
    m=bpy.data.materials.new(name);m.use_nodes=True
    m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Specular IOR Level'].default_value=.23
    return m


CLAY=material('Neutral warm sculpt clay',(.43,.405,.37))
ORAL=material('Same clay cavity wall',(.36,.338,.31))
EYE=material('Clay embedded eye placeholder',(.29,.282,.265),.45)
all_objects=[]


def mesh(name,vertices,faces,mat=CLAY):
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    me.materials.append(mat)
    for f in me.polygons:f.use_smooth=True
    all_objects.append(ob)
    return ob


def boolean(target,tool,operation,label):
    bpy.context.view_layer.objects.active=target
    md=target.modifiers.new(label,'BOOLEAN');md.operation=operation
    md.solver='EXACT';md.object=tool
    bpy.ops.object.modifier_apply(modifier=md.name)
    all_objects.remove(tool);bpy.data.objects.remove(tool,do_unlink=True)


g=design.all_base_geometry()
body=mesh('Doryaspis_continuous_shield_posterior',*g['body'])
body['anatomyRole']='continuous_rigid_shield_and_flexible_posterior_clay'
for name in ('cornual_left','cornual_right','pseudorostrum','caudal_membrane'):
    ob=mesh(name,*g[name])
    boolean(body,ob,'UNION','Continuous attachment '+name)

# Carve real oral wall into the shield and pseudorostral root, rather than a
# dark disk, floating tube, face-mounted ring, tooth row or hidden solid cap.
body.data.materials.append(ORAL)
tool=mesh('Oral_negative_volume',*g['oral_cutter'])
tool.data.materials.append(ORAL)
for f in tool.data.polygons:f.material_index=1
boolean(body,tool,'DIFFERENCE','Compact anterior upward oral recess')


def ellipsoid(name,center,axes,mat):
    n,m=48,24;v=[];f=[]
    from math import sin,cos,pi
    c=Vector(center);a,b,d=[Vector(q) for q in axes]
    v.append(tuple(c+d))
    for j in range(1,m):
        t=pi*j/m
        for k in range(n):
            s=2*pi*k/n
            v.append(tuple(c+a*(sin(t)*cos(s))+b*(sin(t)*sin(s))+d*cos(t)))
    end=len(v);v.append(tuple(c-d))
    f.extend((0,1+k,1+(k+1)%n) for k in range(n))
    for j in range(m-2):
        f.extend((1+j*n+k,1+(j+1)*n+k,1+(j+1)*n+(k+1)%n,1+j*n+(k+1)%n)
                 for k in range(n))
    f.extend((end,1+(m-2)*n+(k+1)%n,1+(m-2)*n+k) for k in range(n))
    return mesh(name,v,f,mat)


# Single small branchial outlets are real shallow recesses underneath the
# rear flank armour, independent of the mouth and never animated as joints.
for side in (-1,1):
    tree=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices for p in body.data.polygons])
    surf,norm,idx,dist=tree.find_nearest(Vector((side*.53,-.23,-.57)))
    tangent=Vector((0,0,1));tangent=(tangent-norm*tangent.dot(norm)).normalized()
    vertical=norm.cross(tangent).normalized()
    tool=ellipsoid('Branchial_negative_volume',surf-norm*.018,
                   (tangent*.063,vertical*.019,norm*.047),CLAY)
    tool.data.materials.append(ORAL)
    for f in tool.data.polygons:f.material_index=1
    boolean(body,tool,'DIFFERENCE','Single branchial outlet '+str(side))

# Small embedded clay placeholders provide scale in the face. Their final
# anatomical/eye audit is deliberately deferred until the new sculpt is frozen.
tree=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices for p in body.data.polygons])
eye_positions=[]
for side in (-1,1):
    surf,norm,idx,dist=tree.find_nearest(Vector((side*.287,.18,.624)))
    assert norm.y>0,'STOP: eye placeholder selected an underside surface'
    tangent=Vector((0,0,1));tangent=(tangent-norm*tangent.dot(norm)).normalized()
    across=tangent.cross(norm).normalized()
    center=surf-norm*.014
    ob=ellipsoid('Clay_eye_L' if side>0 else 'Clay_eye_R',center,
                  (across*.028,tangent*.034,norm*.022),EYE)
    ob['anatomyRole']='embedded_eye_placeholder_not_final_audit'
    eye_positions.append({'name':ob.name,'center':list(center),'surface':list(surf),'normal':list(norm)})


def construction_check(ob):
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table()
    unseen=set(bm.verts);parts=[]
    while unseen:
        todo=[unseen.pop()];count=0
        while todo:
            ve=todo.pop();count+=1
            for edge in ve.link_edges:
                other=edge.other_vert(ve)
                if other in unseen:unseen.remove(other);todo.append(other)
        parts.append(count)
    result={'name':ob.name,'vertices':len(bm.verts),'faces':len(bm.faces),
            'components':parts,'nonmanifoldEdges':sum(not e.is_manifold for e in bm.edges),
            'degenerateFaces':sum(f.calc_area()<1e-12 for f in bm.faces),
            'finite':all(isfinite(c) for v in bm.verts for c in v.co),
            'volume':bm.calc_volume(signed=True)}
    bm.to_mesh(ob.data);bm.free()
    result['ok']=(result['finite'] and result['volume']>0 and result['nonmanifoldEdges']==0
                  and result['degenerateFaces']==0 and len(parts)==1)
    return result


checks=[construction_check(ob) for ob in all_objects]
report={'stage':'unreviewed clay01','coordinates':'world Y-up, +Z-forward',
        'oralDecision':'small anterior/upward recess above ventral pseudorostrum, under roof; literal below-pseudorostrum request unresolved',
        'geometry':checks,'eyePlaceholders':eye_positions,
        'inputHashes':{str(HERE/n):sha(HERE/n) for n in ('geometry_clay01.py','build_clay01.py','render_clay01.py')},
        'passed':all(c['ok'] for c in checks)}
(OUT/'construction.json').write_text(json.dumps(report,indent=2)+'\n')
assert report['passed'],'STOP: construction check failed; preserve construction.json and return to author'
scene['authoringPhase']='Doryaspis rework V3 clay01, awaiting actual six-view review'
scene['worldConvention']='X lateral, Y up, Z forward'
scene['oralAnatomy']='Jawless aperture above fixed ventral pseudorostrum, under shield roof'
scene['noPublicMutation']=True
scene['sourceGeometry']=str(HERE/'geometry_clay01.py')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'doryaspis-clay01.blend'))
report['blend']={'path':str(OUT/'doryaspis-clay01.blend'),
                 'bytes':(OUT/'doryaspis-clay01.blend').stat().st_size,
                 'sha256':sha(OUT/'doryaspis-clay01.blend')}
(OUT/'construction.json').write_text(json.dumps(report,indent=2)+'\n')
print('DORYASPIS_CLAY01_BUILD_OK',json.dumps(report['blend']))
