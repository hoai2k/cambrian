"""Read-only dedicated eye/oral audit of actual local V4 full/LOD GLBs.
Run after export_02.py in a separate Blender CPU2 process. Writes reports only.
The audit reports failures for review instead of changing geometry or hiding contacts.
"""
import bpy,bmesh,hashlib,json,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

H=Path(__file__).resolve().parent;R=H.parents[4]
Q=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate02/exports'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
manifest=json.loads((Q/'export-evidence.json').read_text())
DIRECTIONS=[Vector(d).normalized() for d in [(1,.371,.127),(-.237,1,.413),(.193,-.271,1)]]


def parity(tree,p,direction):
    p=Vector(p);hits=0
    for _ in range(80):
        hit,normal,index,distance=tree.ray_cast(p,direction)
        if hit is None:return bool(hits%2)
        hits+=1;p=hit+direction*2e-6
    raise RuntimeError('Excess intersections in parity ray')


def wilson(k,n):
    z=1.96;p=k/n;den=1+z*z/n;c=(p+z*z/(2*n))/den
    half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [c-half,c+half]


def geometry(obj):
    dep=bpy.context.evaluated_depsgraph_get();eo=obj.evaluated_get(dep)
    me=eo.to_mesh();bm=bmesh.new();bm.from_mesh(me)
    # Weld export UV/normal seam duplicates only. No hole caps are fabricated.
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    verts=[eo.matrix_world@v.co for v in bm.verts]
    faces=[tuple(v.index for v in f.verts) for f in bm.faces]
    topology={'boundaryEdges':sum(e.is_boundary for e in bm.edges),
              'nonmanifoldEdges':sum(not e.is_manifold for e in bm.edges),
              'triangles':len(faces)}
    bm.free();eo.to_mesh_clear()
    return {'verts':verts,'faces':faces,'topology':topology,'tree':BVHTree.FromPolygons(verts,faces,all_triangles=True)}


def rigid_bone(obj):
    names={g.index:g.name for g in obj.vertex_groups}
    used=set()
    for v in obj.data.vertices:
        groups=[(names[g.group],g.weight) for g in v.groups if g.weight>1e-5]
        assert len(groups)==1 and abs(groups[0][1]-1)<1e-4,(obj.name,'not rigidly weighted')
        used.add(groups[0][0])
    assert len(used)==1
    return next(iter(used))


def eye_volume(eye,head,seed):
    rng=random.Random(seed);vs=eye['verts']
    lo=[min(v[k] for v in vs) for k in range(3)];hi=[max(v[k] for v in vs) for k in range(3)]
    accepted=inside_lower=inside_upper=disagreements=0
    for _ in range(30000):
        p=Vector([rng.uniform(lo[k],hi[k]) for k in range(3)])
        ev=[parity(eye['tree'],p,d) for d in DIRECTIONS]
        if not all(ev):continue
        accepted+=1
        hv=[parity(head['tree'],p,d) for d in DIRECTIONS]
        inside_lower+=all(hv);inside_upper+=any(hv);disagreements+=len(set(hv))>1
    assert accepted>10000
    lower=wilson(inside_lower,accepted)[0]
    return {'boundingBoxSamples':30000,'actualEyeVolumeSamples':accepted,
            'insideLowerFraction':inside_lower/accepted,'insideUpperFraction':inside_upper/accepted,
            'conservative95LowerFraction':lower,'headRayDisagreements':disagreements,
            'criterionHalfGlobe':lower>=.5,'eyeTopology':eye['topology'],'headTopology':head['topology']}


def penetration(points,tree,threshold):
    count=0;deepest=0.;worst=None
    for p in points:
        q,n,index,d=tree.find_nearest(p)
        if q is None or d<=threshold:continue
        # Closed correctly oriented mesh nearest sign is cheap; parity confirms
        # any detected interior sample, reducing costly rays to actual suspects.
        if (p-q).dot(n)<0 and parity(tree,p,DIRECTIONS[0]):
            count+=1
            if d>deepest:deepest=d;worst=list(p)
    return {'verticesInsideBeyondTolerance':count,'maxDepthMeters':deepest,'worstPointInTargetRest':worst}


reports=[]
for model in manifest['models']:
    p=Path(model['path']);assert sha(p)==model['sha256']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(p))
    scene=bpy.context.scene;scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.fps=30
    rig=next(o for o in scene.objects if o.type=='ARMATURE')
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=True
    for b in rig.pose.bones:
        b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
    scene.frame_set(1);bpy.context.view_layer.update()
    head=bpy.data.objects['head_envelope_closed'];jaw=bpy.data.objects['lower_jaw_envelope_closed']
    eyes=[bpy.data.objects[n] for n in ('eye_globe_L','eye_globe_R')]
    teeth=[o for o in scene.objects if o.type=='MESH' and 'gnathal' in o.name]
    assert len(teeth)==6
    objects=[head,jaw,*eyes,*teeth]
    rest={o.name:geometry(o) for o in objects}
    for o in objects:assert rest[o.name]['topology']['nonmanifoldEdges']==0,(o.name,rest[o.name]['topology'])
    bones={o.name:rigid_bone(o) for o in objects}
    assert bones[head.name]=='head' and bones[jaw.name]=='jaw'
    eye_report={e.name:eye_volume(rest[e.name],rest[head.name],93+i) for i,e in enumerate(eyes)}
    assert all(bones[e.name]=='head' for e in eyes)
    rest_bone={n:rig.matrix_world@rig.pose.bones[n].matrix.copy() for n in ('head','jaw')}
    anchor_names=['anchor_mouth','anchor_mouth_inside','anchor_attack_primary']
    expected=[(0,-1.445,-.055),(0,-.91,-.16),(0,-1.478,-.065)]
    anchors={}
    for n,point in zip(anchor_names,expected):
        o=bpy.data.objects[n];pos=o.matrix_world.translation.copy()
        anchors[n]={'bindPositionBlender':list(pos),'expected':point,'bindErrorMeters':(pos-Vector(point)).length}
        assert anchors[n]['bindErrorMeters']<1e-4,(n,anchors[n])
    actions={a.name.split('|')[-1]:a for a in bpy.data.actions}
    assert len(actions)==18
    poses=[]
    for name in ['Attack','Bite','Heavy','Eat','Ability']:
        rig.animation_data.action=actions[name]
        start,end=actions[name].frame_range
        for frame in range(math.ceil(start),math.floor(end)+1):
            scene.frame_set(frame);bpy.context.view_layer.update()
            delta={n:(rig.matrix_world@rig.pose.bones[n].matrix)@rest_bone[n].inverted() for n in ('head','jaw')}
            row={'clip':name,'frame':frame,'opposingShell':[],'opposingGnathals':[],
                 'anchorPositions':{n:list(bpy.data.objects[n].matrix_world.translation) for n in anchor_names}}
            for tooth in teeth:
                source_bone=bones[tooth.name];target_bone='head' if source_bone=='jaw' else 'jaw'
                shell=head if target_bone=='head' else jaw
                trans=delta[target_bone].inverted()@delta[source_bone]
                points=[trans@v for v in rest[tooth.name]['verts']]
                result=penetration(points,rest[shell.name]['tree'],.0015)
                row['opposingShell'].append({'source':tooth.name,'target':shell.name,**result})
                if source_bone=='jaw':
                    for upper in teeth:
                        if bones[upper.name]!='head':continue
                        result=penetration(points,rest[upper.name]['tree'],.0005)
                        # Both directions detect containment of either thin cutting edge.
                        inverse=trans.inverted()
                        reverse=penetration([inverse@v for v in rest[upper.name]['verts']],rest[tooth.name]['tree'],.0005)
                        row['opposingGnathals'].append({'lower':tooth.name,'upper':upper.name,'lowerInUpper':result,'upperInLower':reverse})
            poses.append(row)
    shell_fail=[{'clip':r['clip'],'frame':r['frame'],**c} for r in poses for c in r['opposingShell'] if c['verticesInsideBeyondTolerance']]
    tooth_fail=[{'clip':r['clip'],'frame':r['frame'],**c} for r in poses for c in r['opposingGnathals'] if c['lowerInUpper']['verticesInsideBeyondTolerance'] or c['upperInLower']['verticesInsideBeyondTolerance']]
    report={'asset':str(p),'assetSHA256':sha(p),'scriptSHA256':sha(__file__),
            'method':'Actual GLB-imported closed meshes; seeded actual-eye volume parity with three ray directions; rigid bone deltas and per-frame opposing-shell/gnathal penetration samples.',
            'limits':'Vertex penetration tests can miss edge-only intersections. Visual contact review and exported playback remain necessary. Own root/support intersections intentionally excluded.',
            'eyes':eye_report,'eyesShareHeadRigidTransform':True,'anchors':anchors,
            'oralPoseCount':len(poses),'opposingShellFailureCount':len(shell_fail),'opposingGnathalFailureCount':len(tooth_fail),
            'opposingShellFailures':shell_fail,'opposingGnathalFailures':tooth_fail,'poses':poses,
            'status':'requires review' if shell_fail or tooth_fail or not all(e['criterionHalfGlobe'] for e in eye_report.values()) else 'sampled checks pass; visual/export playback still pending'}
    file=Q/(p.stem+'-eye-oral-audit.json');file.write_text(json.dumps(report,indent=2)+'\n')
    reports.append({'asset':p.name,'report':str(file),'reportSHA256':sha(file),
                    'eyesPass':all(e['criterionHalfGlobe'] for e in eye_report.values()),'oralPoseCount':len(poses),
                    'opposingShellFailures':len(shell_fail),'opposingGnathalFailures':len(tooth_fail),'status':report['status']})
    print('DUNK_FACE_EXPORT_AUDIT_ONE',json.dumps(reports[-1]),flush=True)
(Q/'eye-oral-audit-summary.json').write_text(json.dumps(reports,indent=2)+'\n')
print('DUNK_FACE_EXPORT_AUDIT_COMPLETE',json.dumps(reports))
