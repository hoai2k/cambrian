"""Frozen local face study revision 02; patch preserved V2, never rebuild or publish the family.

Run Blender --background --threads 2 --python this-file. CPU only.
DUNK_FACE_RENDER=0 builds only; DUNK_FACE_MODE=baseline renders preserved V2.
Each mode writes an independent local directory. No public output is touched.
"""
import bpy, bmesh, hashlib, json, math, os, struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
LOCAL = REPO.parent / 'devonian-authoring'
INPUT = LOCAL / 'backups/dunkleosteus-final-pre-face-refinement-2026-09-08/blend/dunkleosteus-v2.blend'
EXPECTED_INPUT = '2b636757ef5bca51fe206e38fefaf8fe525aafd22f2fdbb5816d3556ced87ff3'
MODE = os.environ.get('DUNK_FACE_MODE', 'candidate02')
assert MODE in ('candidate02', 'baseline')
OUT = LOCAL / 'dunkleosteus/face-v4' / MODE
OUT.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(INPUT) == EXPECTED_INPUT, 'Frozen source hash mismatch; stop, do not silently substitute.'
bpy.ops.wm.open_mainfile(filepath=str(INPUT))
scene = bpy.context.scene
rig = bpy.data.objects['Dunkleosteus']
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)
scene.frame_set(1)
bpy.context.view_layer.update()


def fingerprint(obj):
    h = hashlib.sha256()
    def add(values):
        h.update(repr(values).encode())
    add(tuple(v for row in obj.matrix_local for v in row))
    add((obj.parent.name if obj.parent else None, obj.parent_type, obj.parent_bone))
    if obj.type == 'MESH':
        me = obj.data
        for v in me.vertices:
            h.update(struct.pack('<3f', *v.co))
            add(tuple((g.group, g.weight) for g in v.groups))
        for p in me.polygons:
            add((tuple(p.vertices), p.material_index, p.use_smooth))
        for uv in me.uv_layers:
            for v in uv.data:
                h.update(struct.pack('<2f', *v.uv))
        for ca in me.color_attributes:
            add((ca.name, ca.domain, ca.data_type))
            for v in ca.data:
                h.update(struct.pack('<4f', *v.color))
        add(tuple(m.name for m in me.materials))
        add(tuple((m.name, m.type) for m in obj.modifiers))
    if obj.type == 'ARMATURE':
        for b in obj.data.bones:
            add((b.name, tuple(b.head_local), tuple(b.tail_local), b.parent.name if b.parent else None))
    return h.hexdigest()


def animation_hash():
    h = hashlib.sha256()
    for action in sorted(bpy.data.actions, key=lambda a: a.name):
        h.update(action.name.encode())
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        h.update(repr((fc.data_path, fc.array_index)).encode())
                        for p in fc.keyframe_points:
                            h.update(repr((tuple(p.co), tuple(p.handle_left), tuple(p.handle_right), p.interpolation)).encode())
    return h.hexdigest()


before = {o.name: fingerprint(o) for o in scene.objects if o.type in ('MESH', 'ARMATURE', 'EMPTY')}
animation_before = animation_hash()
images_before = {im.name: hashlib.sha256(bytes(im.packed_file.data)).hexdigest()
                 for im in bpy.data.images if im.packed_file}
head = bpy.data.objects['head_envelope_closed']
gnathal_prefixes = ('inferognathal_cutting_blade_', 'anterior_supragnathal_cusp_', 'posterior_supragnathal_blade_')
modified_names = [head.name] + [n for n in before if n.startswith(gnathal_prefixes)]


def smooth(a, b, x):
    t = max(0., min(1., (x-a)/(b-a)))
    return t*t*(3.-2.*t)


def segment_distance(y, z, a, b):
    dy, dz = b[0]-a[0], b[1]-a[1]
    t = max(0., min(1., ((y-a[0])*dy+(z-a[1])*dz)/(dy*dy+dz*dz)))
    return math.hypot(y-a[0]-t*dy, z-a[1]-t*dz)


def signed_polygon_distance(y, z, poly):
    inside = False
    for a, b in zip(poly, poly[1:]+poly[:1]):
        if (a[1] > z) != (b[1] > z) and y < (b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            inside = not inside
    d = min(segment_distance(y, z, a, b) for a, b in zip(poly, poly[1:]+poly[:1]))
    return d if inside else -d


def sculpt_face():
    # Shape the existing closed envelope, including the actual orbital support.
    # Surface-normal masks exclude inward-facing palate and mucosal cheek walls.
    cheek = [(-1.405,.016), (-1.327,.080), (-1.220,.108), (-1.089,.209),
             (-.885,.290), (-.698,.221), (-.639,.040), (-.661,-.222),
             (-.782,-.291), (-.980,-.228), (-1.153,-.095)]
    brow = [(-1.404,.113), (-1.328,.190), (-1.255,.225), (-1.177,.221), (-1.110,.176)]
    # More evenly sampled support for narrow relief; all original input data remains in V2.
    refine=head.modifiers.new('Face study 02 continuous support','SUBSURF'); refine.levels=1
    bpy.context.view_layer.objects.active=head
    bpy.ops.object.modifier_move_up(modifier=refine.name)
    bpy.ops.object.modifier_apply(modifier=refine.name)
    head.data.update()
    frozen=[(v.co.copy(),v.normal.copy()) for v in head.data.vertices]
    for v, (original, normal) in zip(head.data.vertices, frozen):
        p = v.co
        x, y, z = original[:]
        s = 1 if x >= 0 else -1
        outside = smooth(.08, .60, normal.x*s)
        outside *= smooth(.12, .22, abs(x))
        d = signed_polygon_distance(y, z, cheek)
        # Broad plateau, narrow sloping rim, then a modest recessed boundary.
        raised = .043 * smooth(-.012, .054, d)
        seam = -.0035 * math.exp(-(d/.016)**2)
        browdist = min(segment_distance(y, z, a, b) for a, b in zip(brow, brow[1:]))
        supraorbital = .032 * math.exp(-(browdist/.040)**2)
        p.x += s * outside * (raised + seam + supraorbital)
        p.z += outside * supraorbital * .30
        # Blunt raised front and a defined sagittal slope, with no projecting shark rostrum.
        roof = smooth(.25, .75, normal.z)
        p.z += roof * .017 * math.exp(-((y+1.39)/.135)**2) * (1.-.38*smooth(.12,.25,abs(x)))
    head.data.update()


def support_tree(name):
    obj=bpy.data.objects[name]
    return BVHTree.FromPolygons([v.co for v in obj.data.vertices],[p.vertices for p in obj.data.polygons])


def fitted_root(tree, x, y, lower):
    # Actual rigid envelope intersection; roots sink 6 mm into the supporting shell.
    # Terminal upper leading cross-section extrapolates at most 20 mm from its root.
    direction=Vector((0,0,-1 if lower else 1))
    for attempt in range(32):
        xx=math.copysign(max(.015,abs(x)-.002*attempt),x)
        p,n,idx,d=tree.ray_cast(Vector((xx,max(y,-1.468) if not lower else y,1 if lower else -1)),direction,3)
        if p is not None:
            return xx, p.z+(-.006 if lower else .006)
    raise RuntimeError('No gnathal root support at '+repr((x,y,lower)))


def blade(name, rows, bone, s):
    # Each explicit row is y, lateral centre, broad buried root z, cutting edge z,
    # root half-width, edge half-width. Six-sided chisel section is never a cone.
    # Linear parameter interpolation creates straight sharp profile landmarks without
    # unnecessary zero-slope steps; five sections support smooth root interpolation.
    sections = []
    for a, b in zip(rows, rows[1:]):
        for j in range(5):
            t = j/5
            q = t
            sections.append([a[k]*(1-q)+b[k]*q for k in range(6)])
    sections.append(rows[-1])
    verts, uvs = [], []
    lower=bone=='jaw'
    tree=support_tree('lower_jaw_envelope_closed' if lower else 'head_envelope_closed')
    for i, (y, x, zr, ze, w, edge) in enumerate(sections):
        xo,zo=fitted_root(tree,s*(x+w),y,lower)
        xi,zi=fitted_root(tree,s*(x-w*.66),y,lower)
        _,zc=fitted_root(tree,s*x,y,lower)
        ze=max(ze,zc+.018) if lower else min(ze,zc-.018)
        cross=[(xo,zo,.04), (xo*.45+s*(x+w*.70)*.55,zo*.58+ze*.42,.38),
               (s*(x+edge),ze,.94),(s*(x-edge),ze,.94),
               (xi*.45+s*(x-w*.48)*.55,zi*.58+ze*.42,.38),(xi,zi,.04)]
        for xx, zz, vv in cross:
            verts.append((xx,y,zz))
            uvs.append((.04+.90*i/(len(sections)-1),vv))
    faces = [(i*6+k,i*6+(k+1)%6,(i+1)*6+(k+1)%6,(i+1)*6+k)
             for i in range(len(sections)-1) for k in range(6)]
    faces.extend([tuple(range(5,-1,-1)), tuple((len(sections)-1)*6+k for k in range(6))])
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for face in me.polygons: face.use_smooth=True
    bm=bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(me); bm.free()
    obj=bpy.data.objects.new(name, me)
    scene.collection.objects.link(obj)
    obj.parent=rig
    me.materials.append(bpy.data.materials['gnathal_bone'])
    uv=me.uv_layers.new(name='UVMap')
    for loop in me.loops:
        uv.data[loop.index].uv = uvs[loop.vertex_index]
    vc=me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    bc=me.color_attributes.new(name='BakedPigment', type='FLOAT_COLOR', domain='POINT')
    tex=next(im for im in bpy.data.images if im.name.startswith('gnathal-albedo'))
    pixels=list(tex.pixels)
    w,h=tex.size
    for i in range(len(verts)):
        vc.data[i].color=(1,1,1,1)
        u,v=uvs[i]; at=4*(int(v*(h-1))*w+int(u*(w-1)))
        bc.data[i].color=tuple(pixels[at:at+4])
    obj.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
    # Tiny bevel catches light on a worn edge while keeping a visibly sharp silhouette.
    bevel=obj.modifiers.new('Worn chisel edge 1 mm','BEVEL')
    bevel.width=.001; bevel.segments=2
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)
    deform=obj.modifiers.new('Anatomical deformation','ARMATURE'); deform.object=rig
    obj['faceStudy']='V4 candidate02, sculpted gnathal, awaiting contact and eye QA'
    return obj


if MODE == 'candidate02':
    sculpt_face()
    for obj in list(scene.objects):
        if obj.name.startswith(gnathal_prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)
    for s in (-1,1):
        # Broad short fang: paired terminal supragnathal, not a cylindrical canine.
        blade('anterior_supragnathal_cusp_'+str(s), [
            (-1.488,.143,.045,.011,.013,.0020),
            (-1.477,.147,.057,-.082,.029,.0017),
            (-1.456,.151,.063,-.142,.038,.0011),
            (-1.428,.168,.066,-.116,.043,.0018),
            (-1.393,.190,.066,-.043,.036,.0022),
            (-1.364,.208,.056,.013,.015,.0020)], 'head',s)
        # Tall anterior cusp flows into a continuous long lower shearing blade.
        blade('inferognathal_cutting_blade_'+str(s), [
            (-1.445,.177,-.145,-.081,.018,.0018),
            (-1.410,.202,-.157,-.035,.024,.0017),
            (-1.373,.219,-.173,.006,.025,.0013),
            (-1.349,.230,-.183,.012,.025,.0010),
            (-1.319,.240,-.195,-.029,.029,.0017),
            (-1.271,.253,-.218,-.102,.027,.0020),
            (-1.211,.260,-.241,-.136,.018,.0017),
            (-1.044,.279,-.281,-.171,.015,.0016),
            (-.883,.278,-.285,-.180,.012,.0017)], 'jaw',s)
        # Upper posterior blade has its buried root ABOVE its downward-facing edge.
        blade('posterior_supragnathal_blade_'+str(s), [
            (-1.323,.207,.046,-.038,.011,.0014),
            (-1.272,.220,.058,-.083,.017,.0012),
            (-1.206,.233,.052,-.100,.019,.0015),
            (-1.117,.244,.020,-.125,.019,.0015),
            (-1.000,.252,-.014,-.155,.017,.0015),
            (-.874,.255,-.060,-.177,.012,.0018)], 'head',s)

after = {o.name: fingerprint(o) for o in scene.objects if o.type in ('MESH','ARMATURE','EMPTY')}
preserved = [n for n in before if MODE=='baseline' or n not in modified_names]
assert all(before[n]==after[n] for n in preserved), 'Unexpected preserved-object change'
assert animation_before==animation_hash(), 'Animation curves changed'
assert images_before=={im.name:hashlib.sha256(bytes(im.packed_file.data)).hexdigest() for im in bpy.data.images if im.packed_file}
report = {'status':'sculpt study, not final QA', 'mode':MODE,'input':str(INPUT),
          'inputSHA256':sha(INPUT),'scriptSHA256':sha(__file__), 'preservedObjectHashes':{n:after[n] for n in preserved},
          'changedObjects':[n for n in before if before[n]!=after.get(n)],'animationSHA256':animation_before,
          'packedImageSHA256':images_before,'pending':['Gnathal root/support and motion contacts','Eye volume containment after brow edit','Full/LOD exports and actual anchor action checks','Final portraits and intake']}
blend=OUT/('dunkleosteus-face-v4-'+MODE+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
report['outputBlendSHA256']=sha(blend)
(OUT/'study-evidence.json').write_text(json.dumps(report,indent=2)+'\n')

if os.environ.get('DUNK_FACE_RENDER','1') == '0':
    print('DUNK_FACE_STUDY_BUILT',str(OUT)); raise SystemExit

# Fixed comparative studio views. This is source sculpt review, not exported-asset approval.
for o in list(scene.objects):
    if o.type in ('LIGHT','CAMERA'): bpy.data.objects.remove(o,do_unlink=True)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=2
scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.15,.17,.19,1);bg.inputs[1].default_value=.45
for n,p,e,col,size in [('Key',(2,-3,4),600,(1,.95,.88),3.5),('Fill',(-3,-2,1),440,(.8,.89,1),4),('Rim',(1,3,3),700,(.8,.9,1),3),('Oral fill',(0,-3,-.25),80,(1,.94,.89),1.5)]:
    bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name='V4 '+n
    o.data.energy=e;o.data.color=col;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,-.8,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'

views=[('rest-side','Idle',1,(4,-1.0,.13),(0,-1.03,.025),1.42),
       ('rest-oblique','Idle',1,(2,-3,.58),(0,-1.02,.025),1.52),
       ('rest-front','Idle',1,(0,-4,.1),(0,-1.03,.025),1.42),
       ('max-oblique','Heavy',15,(2,-3,.2),(0,-.96,-.17),1.80),
       ('max-front','Heavy',15,(0,-4,.04),(0,-.96,-.17),1.80),
       ('mid-bite-side','Bite',6,(4,-1.0,.1),(0,-.97,-.10),1.70),
       ('eat-oblique','Eat',19,(2,-3,.2),(0,-.96,-.12),1.75),
       ('recovery-oblique','Heavy',28,(2,-3,.2),(0,-.96,-.12),1.70)]
for label,clip,frame,loc,target,scale in views:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=scale;scene.render.filepath=str(OUT/(label+'.png'))
    bpy.ops.render.render(write_still=True)
print('DUNK_FACE_STUDY_RENDERED',str(OUT))
