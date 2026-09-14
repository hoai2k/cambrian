"""Cut the geometry a human marked in the specimen viewer out of the mesh they marked it on.

The raw Tripo preview bodies carry extra fins and spare tails, and after welding nineteen of the
twenty-one are a single connected surface — so nothing can separate the unwanted fin from the
wanted one by rule, and only a reviewer knows which is which (docs/triassic/preview-mesh-defects.md).
Mark mode in the viewer (`/viewer/?specimen=<key>&mode=mark`) is where they point; this is what
acts on the pointing. It does exactly what the region file says and nothing else: no welding, no
decimation, no cleverness about what "looks like" a fin.

    /opt/blender/blender --background --factory-startup --python tools/triassic/cut-region.py \
        -- REGION.json [--out DIR] [--renders DIR] [--no-fill] [--no-stitch] [--no-render] [--unhashed]

Refusals, all of them deliberate — a region applied to the wrong mesh deletes arbitrary geometry:

  * the model's sha256 must match the one the region was marked on (`--unhashed` accepts a region
    whose body the manifest knows no hash for, and even then the file's own hash is printed);
  * the mesh must still have the vertex count it had when it was marked;
  * the marked vertices must still occupy the box the region file says they did.

The hole left behind is closed where a plain fill can close it. On a raw generated body the rim is
usually a set of arcs rather than a loop — every patch seam crossing it holds two copies of the same
point — so the rim alone is welded and filled again (`--no-stitch` to keep to the plain fill,
`--no-fill` to leave the hole open). Nothing beyond that is attempted: reconstructing what the fin
was attached to is sculpting, and a clean cut with an honest report beats a clever guess.

Writes <id>.cut.glb into local/triassic/cuts/ (or --out) and renders the body in side and top view
before and after, plus a close-up of the region itself, so the cut can be looked at rather than
taken on trust. It never writes over the source, and deliberately not *beside* it either: anything
under public/ is published with the site, and `tools/triassic/review-bodies.mjs` reads every .glb in
the creature folder that is not a preview, puppet or LOD as an animal's own body awaiting review —
so a cut dropped there would announce itself as a delivered model and fail `npm run triassic`. The
workbench is where a cut nobody has judged yet belongs (local/ is gitignored); installing one is a
separate human decision and a deliberate move.

The indices are indices into the glTF file's own vertex order. Blender's importer keeps that order
(verified against the accessor for every preview body), which is why nothing here may weld or
otherwise re-index the mesh before the delete.
"""
import bpy, bmesh, sys, os, json, math, hashlib
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
positional = [a for a in args if not a.startswith('--')]
if not positional:
    raise SystemExit('usage: ... --python tools/triassic/cut-region.py -- REGION.json [--out DIR] [--renders DIR] [--no-fill] [--no-stitch] [--no-render] [--unhashed]')
REGION = os.path.abspath(positional[0])


def flag(name, default=None):
    """`--name VALUE` (or `--name=VALUE`); with no default it is a boolean switch."""
    for i, a in enumerate(args):
        if a == name:
            return True if default is None else (args[i + 1] if i + 1 < len(args) else default)
        if a.startswith(name + '='):
            return a.split('=', 1)[1]
    return False if default is None else default


FILL = not flag('--no-fill')
# Welding the rim of the cut (and only the rim) before filling it again: the one thing that turns
# an arc-bounded hole in an unstitched body into something a fill can close. Off with --no-stitch.
STITCH = not flag('--no-stitch')
RENDER = not flag('--no-render')
UNHASHED = flag('--unhashed')
OUT_DIR = flag('--out', '')
RENDER_DIR = flag('--renders', '')

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
region = json.load(open(REGION))
if region.get('schema') != 'mesh-region/1':
    raise SystemExit(f"not a region file: schema {region.get('schema')!r}")

model = region['model']
path = model if os.path.isabs(model) else os.path.join(root, 'public', model)
if not os.path.exists(path):
    raise SystemExit(f'model not found: {path}')

digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()
print(f"region  {os.path.basename(REGION)}")
print(f"model   {model}")
print(f"        sha256 {digest}")
if region.get('sha256'):
    if region['sha256'] != digest:
        raise SystemExit(f"REFUSED: the region was marked on sha256 {region['sha256']}, this file is {digest}.\n"
                         '         The mesh has changed underneath the region; mark it again.')
    print('        hash matches the region')
elif not UNHASHED:
    raise SystemExit('REFUSED: the region carries no sha256, so nothing says it was marked on this file.\n'
                     '         Re-export from a body preview-bodies.json knows, or pass --unhashed.')
else:
    print('        region carries no hash — accepted on --unhashed')
if region.get('note'):
    print(f"note    {region['note']}")

# ---------------------------------------------------------------------------------------------
# the mesh
# ---------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
# Blender's importer leaves a 42-vertex Icosphere behind on meshopt-compressed files; it is an
# artefact of the decode, not of the generation (tools/triassic/preview-debris.py found the same).
meshes = [o for o in bpy.context.scene.objects
          if o.type == 'MESH' and not (o.name.startswith('Icosphere') and len(o.data.vertices) == 42)]
if not meshes:
    raise SystemExit('no mesh in the model')


def pieces(obj, weld):
    """How many connected pieces the surface is, counted on a welded *copy*.

    Counting components on a raw Tripo body measures the generator's triangulation, not the animal:
    it arrives as dozens of unstitched patches, which is why preview-debris.py welds before it
    counts, and why 19 of the 21 previews turn out to be one surface. The weld happens on a bmesh
    that is thrown away — the mesh being cut keeps the file's own vertex order, because the region's
    indices are indices into that order. Returns (welded pieces, raw patches).
    """
    def walk(neighbours, n):
        seen, groups = set(), 0
        for start in range(n):
            if start in seen:
                continue
            groups += 1
            stack = [start]
            while stack:
                v = stack.pop()
                if v in seen:
                    continue
                seen.add(v)
                stack.extend(neighbours(v) - seen)
        return groups

    raw_adj = {i: set() for i in range(len(obj.data.vertices))}
    for e in obj.data.edges:
        a, b = e.vertices
        raw_adj[a].add(b); raw_adj[b].add(a)
    raw = walk(lambda v: raw_adj[v], len(obj.data.vertices))

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    bm.verts.ensure_lookup_table()
    index = {v: i for i, v in enumerate(bm.verts)}
    adj = {i: set() for i in range(len(bm.verts))}
    for e in bm.edges:
        a, b = index[e.verts[0]], index[e.verts[1]]
        adj[a].add(b); adj[b].add(a)
    welded = walk(lambda v: adj[v], len(bm.verts))
    bm.free()
    return welded, raw


def triangles(obj):
    return sum(max(0, len(p.vertices) - 2) for p in obj.data.polygons)


def bounds(objs):
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
    return lo, hi


# glTF is Y-up and Blender Z-up, and the importer bakes the swap into the vertex data: a glTF
# (x, y, z) arrives at (x, -z, y). A region file quotes its bounds in the file's own axes, so they
# have to be turned the same way before they can be compared with anything here.
def to_blender(p):
    return Vector((p[0], -p[2], p[1]))


# The region addresses meshes by their place in load order. That is unambiguous for every Tripo
# preview (one mesh), and where a body has several the vertex count and the bounds below are what
# actually decides whether this is the right one — a name survives neither exporter nor importer.
entries = region.get('meshes')
if not entries:
    if not region.get('vertices'):
        raise SystemExit('the region marks nothing')
    entries = [{'index': 0, 'name': meshes[0].name, 'vertexCount': len(meshes[0].data.vertices),
                'vertices': region['vertices'], 'bounds': None}]

before_lo, before_hi = bounds(meshes)
span = max(before_hi[i] - before_lo[i] for i in range(3))
total_before = sum(len(o.data.vertices) for o in meshes)
tris_before = sum(triangles(o) for o in meshes)
# Two vertices this close together are the same point either side of a patch seam, at whatever
# scale this body arrives in (a preview is about a unit long; a shipped body is metres).
WELD = span * 0.0005
# Stitching the rim needs a coarser tolerance than that, and the difference is not a fudge: the
# seam-weld above only has to decide whether two points are the same point, while a rim has to come
# out of the stitch as a clean loop with no patch-seam boundary edges still hanging off its
# vertices — with those attached, a fill cannot tell which way round the hole goes and does nothing.
# Half a percent of the body is about a third of an edge on these meshes.
STITCH_WELD = span * 0.005

plan = []   # (object, sorted vertex indices)
for entry in entries:
    idx = entry.get('index', 0)
    if idx >= len(meshes):
        raise SystemExit(f"REFUSED: the region names mesh {idx}, the model has {len(meshes)}")
    obj = meshes[idx]
    have = len(obj.data.vertices)
    if entry.get('vertexCount') is not None and entry['vertexCount'] != have:
        # One last chance before refusing: a body with several meshes whose order differs between
        # two importers is still identifiable if exactly one mesh has the count the region expects.
        same = [o for o in meshes if len(o.data.vertices) == entry['vertexCount']]
        if len(same) != 1:
            raise SystemExit(f"REFUSED: mesh {idx} has {have} vertices, the region was marked on {entry['vertexCount']}")
        obj = same[0]
        print(f"        mesh {idx} matched by vertex count to {obj.name}")
    verts = sorted(set(entry['vertices']))
    if verts and (verts[0] < 0 or verts[-1] >= len(obj.data.vertices)):
        raise SystemExit(f"REFUSED: the region names vertex {verts[-1]} of a mesh with {len(obj.data.vertices)}")
    # Where the marked vertices actually are, against where the region says they were. This is the
    # check that catches indices meaning something else in this file: a mismatched mesh would have
    # them scattered over the body rather than in the box the reviewer painted.
    if entry.get('bounds'):
        lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
        for v in verts:
            p = obj.data.vertices[v].co
            for k in range(3):
                lo[k] = min(lo[k], p[k]); hi[k] = max(hi[k], p[k])
        want_a, want_b = to_blender(entry['bounds']['min']), to_blender(entry['bounds']['max'])
        want_lo = Vector((min(want_a[k], want_b[k]) for k in range(3)))
        want_hi = Vector((max(want_a[k], want_b[k]) for k in range(3)))
        tol = max(span * 0.01, 1e-4)
        drift = max(max(abs(lo[k] - want_lo[k]), abs(hi[k] - want_hi[k])) for k in range(3))
        if drift > tol:
            raise SystemExit(f"REFUSED: the marked vertices sit {drift:.4f} from where the region says they do "
                             f"(tolerance {tol:.4f}). The indices do not mean the same thing in this file.")
        print(f'        marked region is where it was marked (drift {drift:.5f} of {tol:.5f} allowed)')
    plan.append((obj, verts))

marked = sum(len(v) for _, v in plan)
pieces_before = [pieces(o, WELD) for o in meshes]
print(f"before  {total_before} vertices, {tris_before} triangles, "
      f"{sum(p[0] for p in pieces_before)} piece(s) welded ({sum(p[1] for p in pieces_before)} raw patches)")
print(f"cut     {marked} vertices ({marked / max(total_before, 1) * 100:.2f}% of the body)")

# ---------------------------------------------------------------------------------------------
# renders, before
# ---------------------------------------------------------------------------------------------
W = H = 520
out_dir = os.path.abspath(OUT_DIR) if OUT_DIR else os.path.join(root, 'local', 'triassic', 'cuts')
os.makedirs(out_dir, exist_ok=True)
shots_dir = os.path.abspath(RENDER_DIR) if RENDER_DIR else out_dir
os.makedirs(shots_dir, exist_ok=True)


def lights_and_film():
    """Cycles on the CPU at a handful of samples: Workbench is a viewport engine and wants EGL,
    which a headless container has no business providing, and this is a silhouette question."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 8
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.film_transparent = False
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.11, .13, .16, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.4
    for name, energy, loc in (('key', 600, (-5, -4, 6)), ('fill', 220, (6, 3, 2))):
        if name in bpy.data.objects:
            continue
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        sc.collection.objects.link(light)
        light.data.energy = energy; light.data.size = 8; light.location = loc
    return sc


def shoot(name, view):
    """One orthographic render, framed on the body *before* the cut so the pair can be compared."""
    sc = lights_and_film()
    mid = (before_lo + before_hi) / 2
    scale = span * 1.25
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = scale
    cam = bpy.data.objects.new(name, cam_data)
    sc.collection.objects.link(cam)
    # Straight down for the top view; across the body for the side one. Across *this* body: a raw
    # generated mesh points wherever its generation pointed it, so a camera planted on a fixed axis
    # (which is right for preview-orient.py, where the orientation is the question) would show some
    # of these animals nose-on, and a cut on the flank has to be visible in the picture that is
    # meant to show it.
    along_x = (before_hi[0] - before_lo[0]) >= (before_hi[1] - before_lo[1])
    cam.location = mid + Vector((0, 0, 1) if view == 'top' else (0, -1, 0) if along_x else (-1, 0, 0)) * scale
    cam.rotation_euler = (0, 0, 0) if view == 'top' else (math.pi / 2, 0, 0) if along_x else (math.pi / 2, 0, -math.pi / 2)
    sc.camera = cam
    sc.render.filepath = os.path.join(shots_dir, name)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


def shoot_region(name):
    """A close-up of the marked region, seen from the side the reviewer painted from.

    Side and top views of a whole animal are how the body is judged, but a cut a few hundred
    vertices across can sit on the far flank and be invisible in both — which makes the pair of
    renders a reassurance rather than a check. This one looks straight in at the region from
    outside the body, which is the direction the brush reached it from.
    """
    sc = lights_and_film()
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = region_scale
    cam = bpy.data.objects.new(name, cam_data)
    sc.collection.objects.link(cam)
    outward = (region_mid - (before_lo + before_hi) / 2)
    outward = outward.normalized() if outward.length > 1e-6 else Vector((0, -1, 0))
    cam.location = region_mid + outward * span
    cam.rotation_euler = (-outward).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = os.path.join(shots_dir, name)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


# Where the marked region is, measured while it is still there.
region_pts = [obj.matrix_world @ obj.data.vertices[v].co for obj, verts in plan for v in verts]
region_mid = sum(region_pts, Vector((0, 0, 0))) / max(len(region_pts), 1)
region_scale = max(
    max(max(p[k] for p in region_pts) - min(p[k] for p in region_pts) for k in range(3)) * 2.5,
    span * 0.15)

ident = region.get('id') or os.path.splitext(os.path.basename(path))[0]
if RENDER:
    for view in ('side', 'top'):
        shoot(f'{ident}-cut-before-{view}', view)
    shoot_region(f'{ident}-cut-before-region')


# ---------------------------------------------------------------------------------------------
# the cut
# ---------------------------------------------------------------------------------------------
# All of it in bmesh: the vertices to delete are named by index, and after the delete the rim of
# the hole is still the same bmesh vertices rather than whatever the indices have shuffled into.
report = []
for obj, verts in plan:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    kill = [bm.verts[i] for i in verts]
    killed = set(kill)
    # The rim: vertices that survive but share an edge with one that does not.
    rim = {v for k in kill for e in k.link_edges for v in e.verts if v not in killed}
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    rim = {v for v in rim if v.is_valid}

    def rim_edges(rim):
        """The open edges of this cut's rim — the only boundary count that means anything here.

        A raw generated body arrives as unstitched patches and already has thousands of boundary
        edges, so a hole cannot be seen in a count over the whole mesh.
        """
        return [e for v in rim for e in v.link_edges if e.is_boundary and all(x in rim for x in e.verts)]

    rim_cut = len(set(rim_edges(rim)))
    added = 0
    rim_open = rim_cut
    filled = stitched = False
    if FILL and rim:
        # A simple hole fill and nothing more, and only over this cut's rim: filling every boundary
        # on the mesh would close the seams a raw Tripo body arrives with.
        added += len(bmesh.ops.holes_fill(bm, edges=list(set(rim_edges(rim))), sides=0).get('faces', []))
        filled = True
        rim = {v for v in rim if v.is_valid}
        rim_open = len(set(rim_edges(rim)))
        if rim_open and STITCH:
            # The rim of a hole in an unwelded body is a set of arcs rather than a loop: every patch
            # seam crossing it holds two copies of the same point, and a fill has nothing to go
            # round. So weld *the rim and nothing else* and fill again — a local stitch, not a pass
            # over the body, and safe here because the delete has already consumed the indices the
            # region was written in. `--no-stitch` keeps to the plain fill.
            bmesh.ops.remove_doubles(bm, verts=[v for v in rim if v.is_valid], dist=STITCH_WELD)
            rim = {v for v in rim if v.is_valid}
            added += len(bmesh.ops.holes_fill(bm, edges=list(set(rim_edges(rim))), sides=0).get('faces', []))
            stitched = True
            rim = {v for v in rim if v.is_valid}
            rim_open = len(set(rim_edges(rim)))
    if filled:
        print(f"fill    {len(rim)} rim vertices{' (stitched)' if stitched else ''}, {added} face(s) added; "
              f"open edges on the rim {rim_cut} -> {rim_open}")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    report.append((obj, added, rim_cut, rim_open, filled, stitched))

# The lights are for the renders, not for the file. They go before the export so the cut body is
# the body and nothing else.
for name in ('key', 'fill'):
    light = bpy.data.objects.get(name)
    if light:
        bpy.data.objects.remove(light, do_unlink=True)

dest = os.path.join(out_dir, f'{ident}.cut.glb')
if os.path.abspath(dest) == os.path.abspath(path):
    raise SystemExit('REFUSED: that would write over the source model')
bpy.ops.export_scene.gltf(filepath=dest, export_format='GLB', export_yup=True)

# ---------------------------------------------------------------------------------------------
# what happened
# ---------------------------------------------------------------------------------------------
total_after = sum(len(o.data.vertices) for o in meshes)
tris_after = sum(triangles(o) for o in meshes)
pieces_after = [pieces(o, WELD) for o in meshes]
welded_before, welded_after = sum(p[0] for p in pieces_before), sum(p[0] for p in pieces_after)
print(f"after   {total_after} vertices, {tris_after} triangles, "
      f"{welded_after} piece(s) welded ({sum(p[1] for p in pieces_after)} raw patches)")
print(f"        -{total_before - total_after} vertices, -{tris_before - tris_after} triangles")
for obj, added, cut_open, still_open, was_filled, was_stitched in report:
    how = 'filled' if not was_stitched else 'filled after stitching the rim'
    if not was_filled:
        print(f"        {obj.name}: hole left open on purpose ({cut_open} edges on the rim)")
    elif still_open == 0:
        print(f"        {obj.name}: the cut is closed - {added} face(s) {how}")
    elif added == 0:
        print(f"        {obj.name}: the cut is LEFT OPEN ({still_open} edges on the rim); nothing could be filled. "
              'Check the renders.')
    else:
        print(f"        {obj.name}: partly closed - {added} face(s) {how}, {still_open} edges on the rim "
              'still open. Check the renders.')
if welded_after > welded_before:
    print(f'        the cut broke the surface into {welded_after} pieces where it was {welded_before}: '
          'something is floating free now, which is usually a cut that went through a limb rather than round it')
print(f"wrote   {dest}")

if RENDER:
    for view in ('side', 'top'):
        shoot(f'{ident}-cut-after-{view}', view)
    shoot_region(f'{ident}-cut-after-region')
    print(f"renders {shots_dir}/{ident}-cut-{{before,after}}-{{side,top,region}}.png")
