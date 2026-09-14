"""Can the Nothosaurus neck be lengthened after the fact, and does it hold up?

The research is explicit that *Nothosaurus* has a long neck — 19 cervicals in *N. mirabilis* — and
the shipped body does not: the visible neck, measured as the narrow run between the shoulder mass
and the skull, is about a tenth of body length where a nothosaur skeletal puts it near a fifth.
The body is not at fault for that. It reproduces its greenlit canonical pose faithfully, and the
pose is what draws the head almost on the shoulders.

So this is a study, not a fix. It stretches the neck band of the decoded mesh along the body axis
and renders the result beside the original, to answer one question: does a body with this neck
still read as the same animal, or does the surgery show? A stretch cannot invent cervical detail,
and if the answer is that it looks stretched, the honest route is a new canonical pose and a fresh
generation, which is what the pipeline's own rule already says.

    /opt/blender/blender --background --factory-startup --python tools/triassic/creatures/nothosaurus/neck-study.py \
        -- OUTDIR DECODED.glb [factor ...]

Writes OUTDIR/neck-<factor>.png, a fixed-camera side view per factor so the silhouettes compare.
"""
import bpy, sys, os, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT, SRC = args[0], args[1]
FACTORS = [float(a) for a in args[2:]] or [1.0, 3.0, 6.0]
os.makedirs(OUT, exist_ok=True)

# The neck band, in glTF z, measured off the file rather than guessed. Two independent landmarks
# agree on where the head starts: the `skull` bone's head sits at z+1.775 and the lower-jaw mesh
# begins at z+1.775. Behind it the body's own cross-sections put the last of the shoulder mass at
# z+1.55 (half-width 1.40, flippers out) and the first narrow slice at z+1.625 (half-width 0.40).
#
# So the visible neck is the run from about 1.55 to 1.72 — 0.17 of a 5.00 body, a thirtieth of the
# animal. A first pass at this study guessed the band at 1.62-2.18 and stretched the skull instead,
# which is its own answer about how much neck is actually there to work with.
NECK_START, NECK_END = 1.52, 1.74
W = H = 640


def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.11, .13, .16, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.3
    for name, energy, loc in (('key', 700, (-5, -4, 6)), ('fill', 250, (6, 3, 2))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        sc.collection.objects.link(light)
        light.data.energy = energy; light.data.size = 8; light.location = loc
    bpy.ops.import_scene.gltf(filepath=SRC)
    return sc, [o for o in sc.objects if o.type == 'MESH']


def stretch(objs, factor):
    """Lengthen the neck band along the body axis and carry the head forward with it.

    A piecewise axial remap, the same shape the viewer's sculpt mode uses for a station shift:
    behind the band nothing moves, inside it the coordinate scales about the band's start, and in
    front of it everything translates by the whole gain. Vertices move; nothing is added, which is
    exactly the limitation this study is meant to expose.
    """
    gain = (NECK_END - NECK_START) * (factor - 1.0)
    for o in objs:
        # Blender's importer maps glTF +z to Blender -y, so the body axis here is -y.
        for v in o.data.vertices:
            z = -v.co.y
            if z <= NECK_START:
                continue
            z = NECK_START + (z - NECK_START) * factor if z < NECK_END else z + gain
            v.co.y = -z
        o.data.update()
    return gain


def shoot(sc, objs, name, frame):
    """Render with a camera that does not move between factors.

    Framing each render off its own bounding box is what makes a set of renders like this useless:
    every animal fills the frame, so a body that grew by a fifth looks exactly like one that did
    not. `frame` is (mid, span), computed once from the unstretched body and widened by the largest
    gain any factor will add, so the pictures are comparable and a longer neck looks longer.
    """
    mid, span = frame
    cam_data = bpy.data.cameras.new(name); cam_data.type = 'ORTHO'; cam_data.ortho_scale = span
    cam = bpy.data.objects.new(name, cam_data)
    sc.collection.objects.link(cam)
    # Looking along glTF -x: a straight side view, +z to the right and +y up.
    cam.location = mid + Vector((-1, 0, 0)) * span
    cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    sc.camera = cam
    sc.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)


def measure(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
    return lo, hi


# One camera for the whole set, from the unstretched body, widened by the most any factor adds.
sc, objs = load()
lo, hi = measure(objs)
widest = (NECK_END - NECK_START) * (max(FACTORS) - 1.0)
FRAME = ((lo + hi) / 2, (max(hi[i] - lo[i] for i in range(3)) + widest) * 1.12)

for factor in FACTORS:
    sc, objs = load()
    gain = stretch(objs, factor)
    shoot(sc, objs, f'neck-{factor:g}', FRAME)
    print(f'factor {factor:g}: neck band {NECK_START}–{NECK_END} stretched, body {gain:+.3f} longer')
