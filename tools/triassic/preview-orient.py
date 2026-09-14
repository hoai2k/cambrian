"""Fixed-world-axis renders of the raw generated Triassic bodies, for judging orientation.

Every other renderer in the tree frames off the bounding box, which is exactly what hides the
question being asked here: these meshes come out of Tripo pointing in whatever direction the
generation happened to use, and a camera that re-frames each one makes them all look fine. This
one plants the camera on the world axes and never moves it, so a body that lies along x and one
that lies along z are visibly different pictures.

    /opt/blender/blender --background --factory-startup --python tools/triassic/preview-orient.py \
        -- OUTDIR [id ...]

Writes OUTDIR/<id>-top.png (looking down, +x right, +z down-screen) and <id>-side.png (looking
along -x, +z right, +y up). Cycles on the CPU at a handful of samples: this is a geometry question, not a lighting one.
"""
import bpy, sys, os, json, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
IDS = args[1:]
W = H = 420

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
rows = json.load(open(os.path.join(root, 'src/content/triassic/preview-bodies.json')))
if IDS:
    rows = [r for r in rows if r['id'] in IDS]
os.makedirs(OUT, exist_ok=True)


def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    # Cycles on the CPU: Workbench is a viewport engine and wants EGL, which a headless container
    # has no business providing. Few samples — this is a silhouette question.
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 8
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.11, .13, .16, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.4
    for name, energy, loc in (('key', 600, (-5, -4, 6)), ('fill', 220, (6, 3, 2))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        sc.collection.objects.link(light)
        light.data.energy = energy; light.data.size = 8; light.location = loc
    return sc


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
    return lo, hi


def shoot(sc, objs, name, location, rotation):
    lo, hi = bounds(objs)
    mid = (lo + hi) / 2
    span = max(hi[i] - lo[i] for i in range(3)) * 1.25
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = span
    cam = bpy.data.objects.new(name, cam_data)
    sc.collection.objects.link(cam)
    cam.location = mid + Vector(location) * span
    cam.rotation_euler = rotation
    sc.camera = cam
    sc.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


for r in rows:
    sc = setup()
    # Blender's glTF importer converts glTF Y-up into Blender Z-up, so a body the file stores
    # along glTF z arrives along Blender -y. The renders are labelled in glTF axes below.
    bpy.ops.import_scene.gltf(filepath=os.path.join(root, 'public', r['model']))
    objs = [o for o in sc.objects if o.type == 'MESH']
    if not objs:
        print(f'{r["id"]}: no mesh'); continue
    # Looking straight down (glTF top-down): +x to the right, +z down the screen.
    shoot(sc, objs, f'{r["id"]}-top', (0, 0, 1), (0, 0, 0))
    # Looking along glTF -x (a side view): glTF +z to the right, +y up.
    shoot(sc, objs, f'{r["id"]}-side', (-1, 0, 0), (math.pi / 2, 0, -math.pi / 2))
    print(f'{r["id"]}: rendered')
