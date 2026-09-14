"""Shrink a marked region to nothing and blend the skin over it, instead of cutting it out.

`cut-region.py` deletes the marked vertices, which is right for debris but wrong for an appendage
that is welded to the body: a raw Tripo body is a soup of unstitched patches, so the rim of a cut
is a set of arcs rather than a closed loop, a fill has nothing to span, and the animal is left with
a hole where the fin was. Rhaeticosaurus' spare tails cut cleanly and still left 34 open edges.

This does the other thing. Nothing is deleted and no topology changes, so no hole can appear. The
marked vertices are relaxed onto the surface their own base ring spans — a constrained Laplacian
solve, which is a soap film: pin the ring, average everything inside it, and an appendage sinks
into the body it grows from. Then the neighbourhood *around* the ring is relaxed too, with the
weight falling off over several rings, which is what stops the collapsed base reading as a bump.
The result runs from body to tail as one surface.

    /opt/blender/blender --background --factory-startup --python tools/triassic/smooth-region.py \\
        -- REGION.json [--out DIR] [--collapse N] [--band N] [--band-iters N] [--no-render]

Writes `<id>.smooth.glb` beside nothing — it never touches the source — plus before/after renders
in side, top and close-up.

Two things to know about what this costs. The texture over a collapsed appendage is that
appendage's own texture, squeezed: the UVs come along for the ride, so a large collapse leaves a
smear where the fin was. And a collapse conserves the surface it had, so a very large appendage
relaxed into a small ring can leave a slight fullness — the band smoothing is what takes that out,
and `--band` is the knob if it does not.
"""
import bpy, bmesh, sys, os, json, math, hashlib
from collections import defaultdict
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]


def opt(name, default):
    return type(default)(args[args.index(name) + 1]) if name in args else default


REGION = next(a for a in args if a.endswith('.json'))
OUT = opt('--out', os.path.join('local', 'triassic', 'smoothed'))
# Defaults chosen by running them. Laplacian smoothing is diffusion, so it converges slowly: at 60
# passes Rhaeticosaurus' spare tails were still stubs at 68% of their protrusion, and the answer
# only settles around 600 (21%, and unchanged at 3000). It costs nothing — a few hundred nodes and
# a few hundred passes is milliseconds — so the default is past convergence rather than short of it.
COLLAPSE = opt('--collapse', 600)     # Laplacian passes over the marked region, ring pinned
BAND = opt('--band', 6)               # how many rings beyond the marked region get relaxed
BAND_ITERS = opt('--band-iters', 60)  # passes over that band, weighted by distance from the region
# A reviewer paints from where they are standing, so a thin blade gets marked on the side facing
# them and not on the side facing away. Collapse only the near side and the far side holds the fin
# out: Askeptosaurus' belly fin barely moved until this existed. So the marked set is grown through
# the thickness first — any vertex within `--through` of a marked one joins it. These bodies arrive
# about a unit long and a fin is a few hundredths thick, so 0.01 reaches the far side of a blade
# without reaching across open water to the body. It is reported, and `--through 0` turns it off.
THROUGH = opt('--through', 0.01)
RENDER = '--no-render' not in args
WELD = 5e-4   # the scale at which two patch corners are the same point on these bodies

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
region = json.load(open(REGION))
if region.get('schema') != 'mesh-region/1':
    raise SystemExit(f'{REGION} is not a mesh region file (schema {region.get("schema")!r})')

src = os.path.join(root, 'public', region['model'])
blob = open(src, 'rb').read()
have = hashlib.sha256(blob).hexdigest()
if region.get('sha256') and region['sha256'] != have:
    raise SystemExit(
        f'{REGION} was marked on a different mesh.\n'
        f'  region wants {region["sha256"]}\n'
        f'  {region["model"]} is {have}\n'
        'Re-mark it in the viewer; vertex indices do not survive a change of mesh.')
os.makedirs(OUT, exist_ok=True)


def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    return [o for o in bpy.context.scene.objects
            if o.type == 'MESH' and not (o.name.startswith('Icosphere') and len(o.data.vertices) == 42)]


def render(objs, tag):
    """Side, top and a close-up on the region, so the change can be judged rather than asserted."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = 520, 400
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.42, .47, .53, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.5
    if not any(o.type == 'LIGHT' for o in sc.objects):
        for n, e, l in (('k', 900, (-5, -4, 6)), ('f', 320, (6, 3, 2))):
            o = bpy.data.objects.new(n, bpy.data.lights.new(n, 'AREA'))
            sc.collection.objects.link(o); o.data.energy = e; o.data.size = 8; o.location = l
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
    mid = (lo + hi) / 2; span = max(hi[i] - lo[i] for i in range(3)) * 1.15
    b = region['meshes'][0]['bounds']
    # The region's own box, in Blender axes: the file quotes glTF, and the importer sends +z to -y.
    rmid = Vector(((b['min'][0] + b['max'][0]) / 2, -(b['min'][2] + b['max'][2]) / 2,
                   (b['min'][1] + b['max'][1]) / 2))
    rspan = max(b['max'][i] - b['min'][i] for i in range(3)) * 3.2 + 0.05
    for name, focus, scale, loc, rot in (
            ('side', mid, span, (-1, 0, 0), (math.pi / 2, 0, -math.pi / 2)),
            ('top', mid, span, (0, 0, 1), (0, 0, 0)),
            ('region', rmid, rspan, (-0.55, -0.8, 0.25), None)):
        cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.ortho_scale = scale
        cam = bpy.data.objects.new(name, cd); bpy.context.scene.collection.objects.link(cam)
        cam.location = focus + Vector(loc).normalized() * scale
        cam.rotation_euler = rot if rot else (focus - cam.location).normalized().to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = os.path.join(OUT, f'{region["id"]}-smooth-{tag}-{name}')
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam, do_unlink=True)


objs = load()
if RENDER:
    render(objs, 'before')
    objs = load()

for entry in region['meshes']:
    o = objs[entry['index']] if entry['index'] < len(objs) else objs[0]
    me = o.data
    if len(me.vertices) != entry['vertexCount']:
        raise SystemExit(f'mesh {entry["index"]} has {len(me.vertices)} vertices, region expects {entry["vertexCount"]}')
    n = len(me.vertices)
    P = [v.co.copy() for v in me.vertices]

    # --- one graph over the patch soup -------------------------------------------------------
    # The mesh arrives unstitched, so edges alone leave every patch an island and a Laplacian pass
    # would smooth each one separately, tearing them apart at the seams. Vertices that share a
    # position are the same point on the animal, so they are welded into one node *for the solve*
    # and the answer is written back to every member — the file's own indexing, which the region
    # file addresses, is never disturbed.
    key = lambda p: (round(p.x / WELD), round(p.y / WELD), round(p.z / WELD))
    node_of = {}
    members = defaultdict(list)
    for i, p in enumerate(P):
        k = key(p)
        if k not in node_of:
            node_of[k] = len(members)
        node_of.setdefault(k, node_of[k])
        members[node_of[k]].append(i)
    nid = [node_of[key(P[i])] for i in range(n)]
    N = len(members)

    adj = defaultdict(set)
    for e in me.edges:
        a, b = nid[e.vertices[0]], nid[e.vertices[1]]
        if a != b:
            adj[a].add(b); adj[b].add(a)

    marked = set(entry['vertices'])
    if THROUGH > 0:
        from mathutils import kdtree
        tree = kdtree.KDTree(n)
        for i, p in enumerate(P):
            tree.insert(p, i)
        tree.balance()
        grown = set(marked)
        for i in list(marked):
            for _, j, _ in tree.find_range(P[i], THROUGH):
                grown.add(j)
        added = len(grown) - len(marked)
        print(f'  through {THROUGH}: {added} more vertex/vertices joined the region '
              f'({len(marked)} -> {len(grown)}), the far side of what was painted')
        if added > 3 * len(marked):
            print('  NOTE: that is a lot. If the collapse reaches onto the body, lower --through.')
        marked = grown
    marked_nodes = {nid[i] for i in marked}
    # --- the bands ---------------------------------------------------------------------------
    # `ring` is the first unmarked shell: it is what the collapse is pinned to, and what the
    # appendage sinks onto. Beyond it, successive shells get a decreasing say, so the surface eases
    # back to untouched rather than stopping at a crease.
    shells = []
    seen = set(marked_nodes)
    front = {b for a in marked_nodes for b in adj[a]} - seen
    for _ in range(max(BAND, 1)):
        if not front:
            break
        shells.append(front)
        seen |= front
        front = {b for a in front for b in adj[a]} - seen
    ring = shells[0] if shells else set()

    pos = {i: Vector(P[members[i][0]]) for i in range(N)}

    def relax(nodes, weight, iters):
        """Laplacian passes over `nodes`, everything else held. `weight` is per node, 0..1."""
        for _ in range(iters):
            new = {}
            for a in nodes:
                nb = adj[a]
                if not nb:
                    continue
                avg = Vector((0, 0, 0))
                for b in nb:
                    avg += pos[b]
                avg /= len(nb)
                w = weight(a)
                new[a] = pos[a] * (1 - w) + avg * w
            pos.update(new)

    # 1. The appendage sinks. Full-weight averaging with the ring pinned is a soap film spanning
    #    the ring, so whatever stood proud of the body settles into the body's own surface.
    relax(marked_nodes, lambda a: 1.0, COLLAPSE)
    # 2. The base stops being a bump. Each shell outward gets less, so the blend runs out smoothly.
    shell_w = {}
    for d, sh in enumerate(shells):
        for a in sh:
            shell_w[a] = 0.75 * (1 - d / max(len(shells), 1)) ** 1.5
    relax(set(shell_w), lambda a: shell_w[a], BAND_ITERS)
    # 3. The base itself lets go. Step 1 pins the ring, which is what makes the appendage sink into
    # it — but a pinned ring has to hold the surface somewhere, so what is left is a thin spike
    # standing on the old attachment. Askeptosaurus' belly fin collapsed to exactly that. Relaxing
    # the region *and* its base together, held only at the far edge of the blend band, lets the
    # attachment close over and the spike go with it.
    inner = marked_nodes | {a for sh in shells[:-1] for a in sh} if len(shells) > 1 else marked_nodes
    weight3 = lambda a: 1.0 if a in marked_nodes else shell_w.get(a, 0.0) + 0.25
    relax(inner, weight3, COLLAPSE)

    moved = 0
    for i in range(N):
        if i in marked_nodes or i in shell_w:
            for m in members[i]:
                if (me.vertices[m].co - pos[i]).length > 1e-9:
                    moved += 1
                me.vertices[m].co = pos[i]
    me.update()

    # How far the region stands proud of the skin it grows from — which is the question, and is
    # not the same as how wide the region is. The marked set includes its own base, and the base is
    # pinned, so a fully collapsed appendage still measures its base's width; protrusion measured
    # from the ring's own plane goes to nothing when the thing is gone.
    ring_pts = [pos[a] for a in ring] or [pos[a] for a in marked_nodes]
    centre = sum(ring_pts, Vector((0, 0, 0))) / len(ring_pts)
    # The ring's plane, as the least-significant axis of its spread (a crude PCA by power
    # iteration on the covariance — enough for a normal, and it avoids pulling in numpy).
    cov = [[sum((q - centre)[i] * (q - centre)[j] for q in ring_pts) for j in range(3)] for i in range(3)]
    nrm = Vector((0, 0, 1))
    for _ in range(64):   # smallest eigenvector, by inverse-ish iteration on (trace*I - cov)
        tr = cov[0][0] + cov[1][1] + cov[2][2]
        nrm = Vector([sum((tr if i == j else 0) - cov[i][j] for j, _ in enumerate(cov)) * 0 +
                      sum(((tr if i == j else 0) - cov[i][j]) * nrm[j] for j in range(3)) for i in range(3)])
        if nrm.length < 1e-12:
            nrm = Vector((0, 0, 1)); break
        nrm.normalize()
    proud = lambda pts: max(abs((q - centre).dot(nrm)) for q in pts)
    before_proud = proud([P[members[a][0]] for a in marked_nodes])  # grown set, the whole appendage
    after_proud = proud([pos[a] for a in marked_nodes])
    print(f'  mesh {entry["index"]}: {len(entry["vertices"])} marked over {len(marked_nodes)} welded node(s); '
          f'ring {len(ring)}, blend band {sum(len(s) for s in shells)} node(s) in {len(shells)} shell(s)')
    print(f'  stands proud of its own base {before_proud:.4f} -> {after_proud:.4f} '
          f'({after_proud / before_proud * 100:.1f}% of what it was)')
    print(f'  {moved} vertex position(s) rewritten; {len(me.polygons)} face(s), unchanged')

    bm = bmesh.new(); bm.from_mesh(me)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    me.update()

dest = os.path.join(OUT, f'{region["id"]}.smooth.glb')
bpy.ops.export_scene.gltf(filepath=dest, export_format='GLB', export_yup=True)
print('wrote  ', dest)
if RENDER:
    render(objs, 'after')
    print('renders', os.path.join(OUT, f'{region["id"]}-smooth-{{before,after}}-{{side,top,region}}.png'))
