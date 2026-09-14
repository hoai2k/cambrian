"""What is actually wrong with the raw Tripo preview bodies, component by component.

A reviewer looking at these in the viewer sees extra fins, spare tails, a floating feather beside
one animal and a lump next to another's neck. Those are two completely different problems and only
one of them can be fixed here:

  * **Detached debris** — a separate connected component floating beside the body. Tripo leaves
    these behind routinely. Removing one is safe and loses nothing, because nothing else touches it.
  * **Welded growth** — an extra fin or a second tail that shares vertices with the body. Cutting
    one out means deciding where the body ends, which is sculpting, and a script guessing at that
    would do more damage than the fin does. These are recorded for regeneration instead.

So this measures rather than assumes: it splits every preview into connected components, reports
each one's size and where it sits on the body, and marks which are separable.

    /opt/blender/blender --background --factory-startup --python tools/triassic/preview-debris.py \
        -- OUT.json [id ...]

Writes a JSON report. With --strip it also writes a cleaned copy of each body whose debris is
genuinely detached, to OUTDIR/<id>.clean.glb, leaving the original alone.
"""
import bpy, sys, os, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
STRIP = '--strip' in args
IDS = [a for a in args[1:] if not a.startswith('-')]

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
rows = json.load(open(os.path.join(root, 'src/content/triassic/preview-bodies.json')))
if IDS:
    rows = [r for r in rows if r['id'] in IDS]

# A component smaller than this share of the body's own volume is not anatomy. Tripo's leftovers are
# typically a fraction of a percent; a real fin welded to the body is not a separate component at
# all, so this threshold never has to adjudicate one.
DEBRIS_SHARE = 0.02
# Vertices this close together are the same point either side of a patch seam, at the scale these
# bodies arrive in (roughly one unit long).
WELD = 0.0005


def weld(obj):
    """Stitch the surface before asking what is connected to what.

    A raw Tripo body is not one welded mesh: it arrives as dozens of unstitched surface patches, so
    counting connected components on it measures the generator's triangulation rather than the
    animal. The first pass of this script did exactly that and reported 117 "components" on
    Atopodentatus with the largest at 5% of the mesh, which is a soup, not a body with debris.
    Placodus' builder welds 11,515 vertices to 9,578 for the same reason.
    """
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=WELD)
    bpy.ops.object.mode_set(mode='OBJECT')


def components(obj):
    """Split a mesh into connected components by walking edges, returning vertex index sets."""
    mesh = obj.data
    adj = {i: set() for i in range(len(mesh.vertices))}
    for e in mesh.edges:
        a, b = e.vertices
        adj[a].add(b); adj[b].add(a)
    seen = set(); out = []
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack = [start]; group = set()
        while stack:
            v = stack.pop()
            if v in group:
                continue
            group.add(v); seen.add(v)
            stack.extend(adj[v] - group)
        out.append(group)
    return out


def box(obj, idx):
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for i in idx:
        p = obj.matrix_world @ obj.data.vertices[i].co
        for k in range(3):
            lo[k] = min(lo[k], p[k]); hi[k] = max(hi[k], p[k])
    return lo, hi


report = []
for r in rows:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(root, 'public', r['model']))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # Blender's importer leaves a 42-vertex Icosphere behind on meshopt-compressed files; it is an
    # artefact of the decode, not of the generation, so it is not somebody's floating feather.
    meshes = [o for o in meshes if not (o.name.startswith('Icosphere') and len(o.data.vertices) == 42)]
    entry = {'id': r['id'], 'objects': len(meshes), 'components': [], 'separable': 0, 'welded': 1}
    parts = []
    for o in meshes:
        before = len(o.data.vertices)
        weld(o)
        entry.setdefault('weld', []).append([o.name, before, len(o.data.vertices)])
        for idx in components(o):
            lo, hi = box(o, idx)
            parts.append({'object': o.name, 'verts': len(idx),
                          'size': [round(hi[k] - lo[k], 4) for k in range(3)],
                          'centre': [round((hi[k] + lo[k]) / 2, 4) for k in range(3)],
                          'idx': idx})
    if not parts:
        entry['note'] = 'no mesh'
        report.append(entry); continue
    parts.sort(key=lambda p: -p['verts'])
    total = sum(p['verts'] for p in parts)
    body = parts[0]
    for p in parts:
        share = p['verts'] / total
        p['share'] = round(share, 5)
        p['isBody'] = p is body
        p['separable'] = (not p['isBody']) and share < DEBRIS_SHARE
        entry['components'].append({k: v for k, v in p.items() if k != 'idx'})
    entry['separable'] = sum(1 for p in parts if p['separable'])
    entry['welded'] = 1 if len(parts) == 1 else 0
    entry['totalVerts'] = total
    report.append(entry)
    print(f"{r['id']:20s} {len(parts):3d} component(s), {entry['separable']} separable")

    if STRIP and entry['separable']:
        for o in meshes:
            drop = set()
            for p in parts:
                if p['separable'] and p['object'] == o.name:
                    drop |= p['idx']
            if not drop:
                continue
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
            bpy.ops.object.mode_set(mode='OBJECT')
            for i in drop:
                o.data.vertices[i].select = True
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT')
            bpy.ops.object.mode_set(mode='OBJECT')
        dest = os.path.join(os.path.dirname(OUT), f"{r['id']}.clean.glb")
        bpy.ops.export_scene.gltf(filepath=dest, export_format='GLB', export_yup=True)
        print(f"  stripped -> {dest}")

json.dump(report, open(OUT, 'w'), indent=1)
print('wrote', OUT)
