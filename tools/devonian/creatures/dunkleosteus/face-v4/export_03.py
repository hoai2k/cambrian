"""Export frozen candidate03 full/LOD locally. Never writes public or source Blend.
Run Blender --background --threads 2 --python this-file.
"""
import bpy, hashlib, json, struct
from pathlib import Path
import numpy as np

H=Path(__file__).resolve().parent; R=H.parents[4]
Q=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate03'
P=Q/'dunkleosteus-face-v4-candidate03.blend'
STUDY=json.loads((Q/'study-evidence.json').read_text())
assert STUDY['scriptSHA256']=='1551013eed8e9f25de55f6b1697cd80c77c28ebdad752e53d1624d782fda3360'
assert STUDY['inputSHA256']=='9a686211386b44ca42b264b1f8c5c17bdf04d7b2b81d14ca2d6e702f87d78c83'
EXPECTED=STUDY['outputBlendSHA256']
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(P)==EXPECTED,'Candidate03 input mismatch'
OUT=Q/'exports'
assert not OUT.exists() or not any(OUT.iterdir()), 'Refuse to reuse populated exports directory'
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(P))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update()
original_actions=sorted(a.name for a in bpy.data.actions)
assert len(original_actions)==18
meta=json.loads((R.parent/'devonian-authoring/backups/dunkleosteus-final-pre-face-refinement-2026-09-08/public/dunkleosteus.json').read_text())
meta['artVersion']=4;meta['artCandidate']='face-v4-candidate03'
meta['status']='preview, awaiting dedicated export/eye/oral review'
meta['notes'].append('Focused V4 face: sculpted cranial support and gnathals. Local candidate only; V2 final audits are historical.')
meta['clips']=original_actions


def accessor(g, binary, i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
    dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    item=np.dtype(dt).itemsize
    return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*item),item)).copy()


def patch_and_check(p):
    raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n])
    start=20+n;size=struct.unpack_from('<I',raw,start)[0];binary=raw[start+8:start+8+size]
    removed=0
    for a in g['animations']:
        a['name']=a['name'].split('|')[-1]
        keep=[]
        for c in a['channels']:
            target=c['target'];v=accessor(g,binary,a['samplers'][c['sampler']]['output'])
            assert np.isfinite(v).all()
            if target['path']=='scale':
                assert np.allclose(v,1,atol=1e-5);removed+=1
            elif g['nodes'][target['node']].get('name')=='root':
                assert np.allclose(v,v[0],atol=1e-5);removed+=1
            else:keep.append(c)
        a['channels']=keep
    assert sorted(a['name'] for a in g['animations'])==original_actions
    parent={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
    anchors=[]
    for i,node in enumerate(g['nodes']):
        if node.get('name','').startswith('anchor_'):
            ex=node['extras']['cambrianAnchor']
            assert ex['version']==1 and g['nodes'][parent[i]]['name']==ex['parentBone']
            anchors.append(node['name'])
    assert sorted(anchors)==sorted(['anchor_mouth','anchor_mouth_inside','anchor_attack_primary'])
    tris=0
    for m in g['meshes']:
        for prim in m['primitives']:
            assert np.isfinite(accessor(g,binary,prim['attributes']['POSITION'])).all()
            a=accessor(g,binary,prim['attributes']['WEIGHTS_0'])
            assert np.allclose(a.sum(1),1,atol=2e-4)
            tris+=g['accessors'][prim['indices']]['count']//3
    js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
    p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
    return {'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'triangles':tris,
            'actions':[a['name'] for a in g['animations']],'anchors':anchors,'removedIdentityChannels':removed}


def export(p):
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        if o.type in ('MESH','ARMATURE') or o.name.startswith('anchor_'):o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,
        export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
        export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,
        export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',
        export_extras=True,export_yup=True)
    return patch_and_check(p)


full=export(OUT/'dunkleosteus.glb')
for o in list(scene.objects):
    if o.type!='MESH':continue
    ca=o.data.color_attributes.get('Color');ba=o.data.color_attributes.get('BakedPigment')
    assert ca and ba
    for i in range(len(ca.data)):ca.data[i].color=ba.data[i].color
    if len(o.data.polygons)>150 and not o.name.startswith('eye_globe'):
        d=o.modifiers.new('V4 reduced geometry','DECIMATE')
        d.ratio=.12 if o.name=='head_envelope_closed' else .65 if 'gnathal' in o.name else .25
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
for m in bpy.data.materials:
    if not m.use_nodes:continue
    bs=m.node_tree.nodes.get('Principled BSDF')
    if not bs:continue
    for l in list(m.node_tree.links):
        if l.to_node==bs:m.node_tree.links.remove(l)
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
    m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
# Keep all 18 actions in the local LOD so the new oral geometry can be audited in
# the same feeding poses; integration owner may later apply a stricter runtime subset.
lod=export(OUT/'dunkleosteus.lod1.glb')
assert lod['triangles']/full['triangles']<.4
(OUT/'dunkleosteus.json').write_text(json.dumps(meta,indent=2)+'\n')
report={'status':'local export; dedicated geometry/eye/oral and playback checks pending',
        'inputSHA256':sha(P),'scriptSHA256':sha(__file__),'models':[full,lod],
        'lodTriangleRatio':lod['triangles']/full['triangles'],'sourceUnchanged':sha(P)==EXPECTED}
(OUT/'export-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print('DUNK_FACE_V4_EXPORT_COMPLETE',json.dumps(report))
