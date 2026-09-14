"""Measure a creature GLB's proportions along its own long axis.

The Nothosaurus neck finding (tools/triassic/creatures/nothosaurus/README.md, "The neck") was
established by measurement rather than by looking: two independent landmarks located the head, and
axial cross-sections of the body meshes located the end of the shoulder mass and the start of the
narrow run behind it. This script is that method generalised, so every Triassic body can be held to
the same standard — see docs/triassic/proportion-audit.md for what it found.

    /opt/blender/blender --background --factory-startup --python tools/triassic/proportions.py \
        -- OUTDIR MODEL.glb [MODEL.glb ...] [--axis x|y|z] [--flip] [--no-render]

Writes OUTDIR/<stem>.json (the numbers) and OUTDIR/<stem>-side.png / -top.png (silhouettes with
decile ticks under the body, so a landmark seen in the picture can be named as a fraction of the
body and then read out of the slice table). Several models may be measured in one invocation; the
flags then apply to all of them, so a body that needs its axis forcing is re-run on its own.

Everything is reported in **glTF** coordinates: +z forward, +y up, +x lateral. Blender's glTF
importer maps glTF +z to Blender -y and glTF +y to Blender +z, so the conversion back is
(gx, gy, gz) = (bx, bz, -by). Reporting in glTF coordinates is what lets these numbers be compared
with the figures already recorded for Nothosaurus.

The long axis is not assumed. A raw Tripo preview carries no rig, no anchors and only an estimated
yaw in tools/triassic/preview-orientation.json, so the axis is taken from the geometry: by default
the cardinal glTF axis the body is longest along, with the vertex cloud's own principal component
reported beside it as a cross-check and available with `--axis`. The two disagree whenever a body
is *posed* — Nothosaurus is delivered with its tail swung and its flippers held out, which tilts the
principal component about 19 degrees off the axis the animal was actually built along — so the axis
used is part of the output, and fractions measured along a guessed axis would be nonsense.

Widths come in two kinds, because a slice through the shoulders also cuts the flippers. `halfWidth`
is the farthest vertex from the midline in that slice and `coreHalfWidth` stops at the first gap in
the sorted distances, which is where a limb has separated from the trunk. Reporting only the first
would make every paddled animal look barrel-chested.

Only meshes the glTF scene graph actually names are measured. Blender's importer leaves a stray
unparented 42-vertex `Icosphere` of radius 1 behind when it reads the packaged (meshopt-compressed)
files, which is in neither file's node list and would otherwise set the height of any animal
thinner than two units.
"""
import bpy, sys, os, json, struct
import numpy as np
from mathutils import Vector, Matrix

SLICES = 40
W = 900


def gltf_node_meshes(path):
    """Names of the nodes that carry a mesh, read from the GLB's own JSON chunk."""
    with open(path, 'rb') as f:
        data = f.read(4096 * 64)
    length = struct.unpack('<I', data[12:16])[0]
    with open(path, 'rb') as f:
        f.seek(20)
        doc = json.loads(f.read(length))
    return {n.get('name') for n in doc.get('nodes', []) if 'mesh' in n}


def to_gltf(p):
    """Blender world coordinates to glTF coordinates."""
    return np.stack([p[:, 0], p[:, 2], -p[:, 1]], axis=-1)


def to_blender(vec):
    """A glTF vector or point as Blender coordinates."""
    return Vector((float(vec[0]), float(-vec[2]), float(vec[1])))


def world_verts(o):
    n = len(o.data.vertices)
    a = np.empty(n * 3, dtype=np.float64)
    o.data.vertices.foreach_get('co', a)
    a = a.reshape(n, 3)
    m = np.array(o.matrix_world)
    return to_gltf(a @ m[:3, :3].T + m[:3, 3])


def core_half_width(ww, mid_w):
    """Half-width up to the first gap in the sorted distances from the midline.

    A slice through the shoulders also cuts the flippers, so the farthest vertex in it belongs to a
    limb rather than to the trunk. Sorted distances from the body's own midline are dense through
    solid tissue and jump across the water between a flank and a paddle, so the first jump wider
    than a tenth of the slice is where the trunk stops. With no gap the two measures agree.
    """
    d = np.sort(np.abs(ww - mid_w))
    if len(d) < 8:
        return float(d[-1]) if len(d) else 0.0
    gaps = np.diff(d)
    big = np.nonzero(gaps > 0.1 * max(d[-1], 1e-9))[0]
    big = big[big >= len(d) // 4]
    return float(d[big[0]]) if len(big) else float(d[-1])


def measure(out_dir, src, force_axis=None, flip=False, render=True):
    stem = os.path.basename(src).replace('.glb', '')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    sc = bpy.context.scene

    named = gltf_node_meshes(src)
    meshes = [o for o in sc.objects
              if o.type == 'MESH' and len(o.data.vertices) and (o.name in named or not named)]
    stray = [o.name for o in sc.objects
             if o.type == 'MESH' and len(o.data.vertices) and o not in meshes]
    per_object = {o.name: world_verts(o) for o in meshes}
    allv = np.concatenate(list(per_object.values()), axis=0)

    # --- the long axis ---------------------------------------------------------------------
    centre = allv.mean(axis=0)
    evals, evecs = np.linalg.eigh(np.cov((allv - centre).T))
    pca = evecs[:, np.argsort(evals)[::-1][0]]
    span = allv.max(axis=0) - allv.min(axis=0)
    cardinal = {'x': np.array([1., 0, 0]), 'y': np.array([0, 1., 0]), 'z': np.array([0, 0, 1.])}
    axis = cardinal[force_axis] if force_axis else cardinal['xyz'[int(np.argmax(span))]]
    # Point the axis at whichever end of the bounding box lies further from the centroid along it,
    # so the reported direction is stable between runs rather than flipping with the solver's sign.
    if np.dot(allv.max(axis=0) - centre, axis) < np.dot(centre - allv.min(axis=0), axis):
        axis = -axis
    if flip:
        axis = -axis

    up = np.array([0., 1., 0.]) - axis * axis[1]
    if np.linalg.norm(up) < 1e-6:
        up = np.array([0., 0., 1.]) - axis * axis[2]
    up /= np.linalg.norm(up)
    lat = np.cross(axis, up)

    s, v, w = allv @ axis, allv @ up, allv @ lat
    lo, hi = float(s.min()), float(s.max())
    length = hi - lo

    # --- cross-sections --------------------------------------------------------------------
    edges = np.linspace(lo, hi, SLICES + 1)
    idx = np.clip(np.digitize(s, edges) - 1, 0, SLICES - 1)
    mid_w = float(np.median(w))
    table = []
    for k in range(SLICES):
        m = idx == k
        row = {'frac': round((k + .5) / SLICES, 4), 's': round(float((edges[k] + edges[k + 1]) / 2), 4),
               'n': int(m.sum()), 'halfWidth': 0.0, 'coreHalfWidth': 0.0, 'localHalfWidth': 0.0,
               'height': 0.0, 'top': 0.0, 'bottom': 0.0}
        if m.any():
            ww, vv = w[m], v[m]
            # Width comes two ways. `halfWidth` is measured from the body's own midline, which is
            # what a bilateral animal posed straight is symmetric about; `localHalfWidth` is
            # measured from this slice's own centre, which is the only honest one where the body
            # has been posed into a curve — there the first is mostly the curve's displacement and
            # says a thread-thin tail is the widest part of the animal.
            row.update(halfWidth=round(float(np.abs(ww - mid_w).max()), 4),
                       coreHalfWidth=round(core_half_width(ww, mid_w), 4),
                       localHalfWidth=round(float(np.abs(ww - float(ww.mean())).max()), 4),
                       height=round(float(vv.max() - vv.min()), 4),
                       top=round(float(vv.max()), 4), bottom=round(float(vv.min()), 4))
        table.append(row)

    objects = {}
    for name, p in per_object.items():
        ps = p @ axis
        objects[name] = {
            'verts': int(len(p)),
            'axial': [round(float(ps.min()), 4), round(float(ps.max()), 4)],
            'axialFrac': [round(float((ps.min() - lo) / length), 4),
                          round(float((ps.max() - lo) / length), 4)],
            'bboxGltf': [[round(float(x), 4) for x in p.min(axis=0)],
                         [round(float(x), 4) for x in p.max(axis=0)]],
        }

    bones = {}
    for arm in [o for o in sc.objects if o.type == 'ARMATURE']:
        for b in arm.data.bones:
            g = to_gltf(np.stack([np.array(arm.matrix_world @ b.head_local),
                                  np.array(arm.matrix_world @ b.tail_local)]))
            bones[b.name] = {
                'headGltf': [round(float(x), 4) for x in g[0]],
                'tailGltf': [round(float(x), 4) for x in g[1]],
                'headFrac': round(float((g[0] @ axis - lo) / length), 4),
                'tailFrac': round(float((g[1] @ axis - lo) / length), 4),
            }

    # --- the bent centreline, for bodies that are not posed straight --------------------------
    # Axial fractions are only honest about a body modelled straight along its axis. Several Tripo
    # previews are posed with a swung tail or a curled neck, and a straight axis then charges that
    # curve's length to the wrong station. The centroid of each axial slice traces where the body
    # actually goes, and the polyline through those centroids is its length along itself: a swung
    # tail shows up as an arc longer than the bounding box, and as a centroid that walks off the
    # axis at the stations it is swung through. It gives up only where a body doubles back through
    # more than a right angle, and the arc-to-straight ratio says when to distrust it.
    filled = [k for k in range(SLICES) if (idx == k).any()]
    pts_c = np.array([allv[idx == k].mean(axis=0) for k in filled])
    # Smooth before measuring: a slice that cuts the flippers has its centroid dragged about by
    # them, and the raw polyline then reports a body a fifth longer than it is purely from jitter.
    for _ in range(4):
        pts_c[1:-1] = 0.25 * pts_c[:-2] + 0.5 * pts_c[1:-1] + 0.25 * pts_c[2:]
    arc = float(np.linalg.norm(np.diff(pts_c, axis=0), axis=1).sum())
    offs = [{'frac': table[k]['frac'],
             'centroidGltf': [round(float(x), 4) for x in pts_c[i]],
             'offUp': round(float(pts_c[i] @ up - v.mean()), 4),
             'offLat': round(float(pts_c[i] @ lat - mid_w), 4)}
            for i, k in enumerate(filled)]

    anchors = {}
    for o in sc.objects:
        if o.type == 'EMPTY' and o.name.lower().startswith('anchor'):
            g = to_gltf(np.array([list(o.matrix_world.translation)]))[0]
            anchors[o.name] = {'gltf': [round(float(x), 4) for x in g],
                               'frac': round(float((g @ axis - lo) / length), 4)}

    report = {
        'model': src,
        'lengthUnits': round(length, 4),
        'axisGltf': [round(float(x), 4) for x in axis],
        'pcaAxisGltf': [round(float(x), 4) for x in (pca if np.dot(pca, axis) > 0 else -pca)],
        'pcaTiltDegrees': round(float(np.degrees(np.arccos(min(1.0, abs(float(np.dot(pca, axis))))))), 2),
        'aabbSpanGltf': [round(float(x), 4) for x in span],
        'ignoredMeshes': stray,
        'bboxGltf': [[round(float(x), 4) for x in allv.min(axis=0)],
                     [round(float(x), 4) for x in allv.max(axis=0)]],
        'extentsAlongFrame': {
            'length': round(length, 4),
            'height': round(float(v.max() - v.min()), 4),
            'width': round(float(w.max() - w.min()), 4),
            'depthFrac': round(float((v.max() - v.min()) / length), 4),
            'widthFrac': round(float((w.max() - w.min()) / length), 4),
        },
        'maxHalfWidth': max(t['halfWidth'] for t in table),
        'maxHalfWidthAtFrac': max(table, key=lambda t: t['halfWidth'])['frac'],
        'maxCoreHalfWidth': max(t['coreHalfWidth'] for t in table),
        'maxCoreHalfWidthAtFrac': max(table, key=lambda t: t['coreHalfWidth'])['frac'],
        'maxHeight': max(t['height'] for t in table),
        'maxHeightAtFrac': max(table, key=lambda t: t['height'])['frac'],
        'arcLength': round(arc, 4),
        'arcOverStraight': round(arc / length, 4),
        'centroids': offs,
        'slices': table,
        'objects': objects,
        'bones': bones,
        'anchors': anchors,
    }
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, stem + '.json'), 'w') as f:
        json.dump(report, f, indent=1)

    print(f'== {stem}: length {length:.3f} along glTF axis {axis.round(3).tolist()}, '
          f"PCA off by {report['pcaTiltDegrees']}deg, ignored {stray}")
    print(f'   height {v.max() - v.min():.3f} ({(v.max() - v.min()) / length:.3f} L)  '
          f'width {w.max() - w.min():.3f} ({(w.max() - w.min()) / length:.3f} L)')
    print('   frac      s    halfW    core   local   height     top  bottom')
    for t in table:
        bar = '#' * int(t['coreHalfWidth'] / max(1e-9, report['maxHalfWidth']) * 24)
        bar += '.' * max(0, int(t['halfWidth'] / max(1e-9, report['maxHalfWidth']) * 24) - len(bar))
        print(f"   {t['frac']:.3f} {t['s']:7.3f} {t['halfWidth']:7.3f} {t['coreHalfWidth']:7.3f} "
              f"{t['localHalfWidth']:7.3f} {t['height']:7.3f} {t['top']:7.3f} {t['bottom']:7.3f}  {bar}")
    print(f'   centroid path: arc {arc:.3f} = {arc / length:.3f} x the straight axis')
    print('   frac    offUp  offLat')
    for t in offs:
        print(f"   {t['frac']:.3f} {t['offUp']:7.3f} {t['offLat']:7.3f}")
    for name, o in objects.items():
        print(f"   object {name!r}: {o['verts']} v, axial {o['axial']} = {o['axialFrac']}")
    for name, b in bones.items():
        print(f"   bone {name!r}: head {b['headGltf']} ({b['headFrac']:.3f}) "
              f"tail {b['tailGltf']} ({b['tailFrac']:.3f})")
    for name, a in anchors.items():
        print(f"   anchor {name!r}: {a['gltf']} ({a['frac']:.3f})")

    # --- silhouettes -------------------------------------------------------------------------
    # Decile ticks stand under the body along the measured axis, so a landmark that can be seen in
    # the picture can be named as a fraction and then looked up in the slice table. Without them a
    # silhouette is only an impression, which is the thing this audit is not allowed to report.
    if not render:
        return report

    # Cycles on the CPU with every material replaced by black emission: a flat silhouette on white,
    # which is what a proportion is read from. Workbench and EEVEE both want a GPU a headless box
    # does not have (libEGL), and a lit render would only hide the outline in its own shading.
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 4
    sc.cycles.use_denoising = False
    ink = bpy.data.materials.new('ink')
    ink.use_nodes = True
    ink.node_tree.nodes.clear()
    out_node = ink.node_tree.nodes.new('ShaderNodeOutputMaterial')
    emit = ink.node_tree.nodes.new('ShaderNodeEmission')
    emit.inputs[0].default_value = (0, 0, 0, 1)
    ink.node_tree.links.new(emit.outputs[0], out_node.inputs[0])
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    sc.render.resolution_x, sc.render.resolution_y = W, int(W * 0.62)

    for o in list(stray):
        bpy.data.objects.remove(bpy.data.objects[o], do_unlink=True)
    rad = length * 0.004
    for k in range(11):
        h = length * (0.05 if k % 5 == 0 else 0.025)
        pos = axis * (lo + length * k / 10) + up * (v.min() - length * 0.05 - h / 2)
        bpy.ops.mesh.primitive_cube_add(size=1)
        c = bpy.context.object
        c.scale = (rad, rad, h / 2)
        c.location = to_blender(pos)
    for o in sc.objects:
        if o.type == 'MESH':
            o.data.materials.clear()
            o.data.materials.append(ink)

    def shoot(name, view_dir, upv):
        cam_data = bpy.data.cameras.new(name)
        cam_data.type = 'ORTHO'
        cam_data.ortho_scale = length * 1.25
        cam = bpy.data.objects.new(name, cam_data)
        sc.collection.objects.link(cam)
        mid = (allv.min(axis=0) + allv.max(axis=0)) / 2
        d = Vector(view_dir).normalized()
        cam.location = to_blender(mid) - d * length * 3
        rot = d.to_track_quat('-Z', 'Y').to_matrix()
        # Roll the camera so `upv` points up in the frame: a side view whose up vector is the
        # body's own up is what makes a dorsal fin read as dorsal.
        cur = rot @ Vector((0, 1, 0))
        want = (Vector(upv) - d * Vector(upv).dot(d)).normalized()
        ang = cur.angle(want)
        if d.dot(cur.cross(want)) < 0:
            ang = -ang
        cam.rotation_euler = (Matrix.Rotation(ang, 4, d) @ rot.to_4x4()).to_euler()
        sc.camera = cam
        sc.render.filepath = os.path.join(out_dir, f'{stem}-{name}')
        bpy.ops.render.render(write_still=True)

    # Both views keep the long axis across the frame: a top view rolled to put the body up the
    # frame is cropped by the aspect ratio, which is how the first pass lost half of Tanystropheus.
    shoot('side', to_blender(lat), to_blender(up))
    shoot('top', -to_blender(up), to_blender(lat))
    return report


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]
    out_dir = argv[0]
    force_axis = None
    do_render = True
    do_flip = False
    models = []
    it = iter(argv[1:])
    for a in it:
        if a == '--axis':
            force_axis = next(it)
        elif a == '--no-render':
            do_render = False
        elif a == '--flip':
            do_flip = True
        else:
            models.append(a)
    for m in models:
        measure(out_dir, m, force_axis, do_flip, do_render)
