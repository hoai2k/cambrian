"""Shared Tripo-intake machinery for the Triassic marine reptiles.

Nothosaurus, Shonisaurus, Placodus, Dinocephalosaurus and Helicoprion each repeated the same
intake by hand: weld the seam vertices, keep the source albedo, measure a frame, measure the
centreline, tell a fin blade from a flank by shell thickness, resurface a voxel twin, cut the jaw
along a *measured* mouth line, line the cavity with one skinned tube, meshopt-neutral export with
the anchors reparented onto their bones. The four ichthyosauromorphs built on top of this module
(Cymbospondylus, Mixosaurus, Hupehsuchus, Cartorhynchus) are close enough in body plan that
repeating it four more times would have meant four chances to repeat one of the traps the two
worked examples record. So the machinery is here and the *animal* -- its frame, its rig, its
weights, its mouth, its performance -- is in each `<id>/build.py`.

This module writes nothing. Every file a delivery consists of is written by the species' own
`build.py`, which touches no shared registry and performs no git operation.

Frame convention, established by the bodies already shipped: a measured body is carried into raw
units where **the head is at -Y, up is +Z, and the body is 1.0 long along Y**. `tx()` in each
builder multiplies by the engine scale, and glTF's `export_yup` then puts the head at +Z, where
every shipped body in this repository keeps it.
"""
import bpy, bmesh, math, json, struct, hashlib, sys, os
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

TAU = 2 * math.pi


# **Blender exits 0 when a builder raises.** The traceback is printed, the process tears down
# cleanly, and the shell sees success -- so a build that stopped on its own assertion reports "BUILD
# OK" and leaves last run's artefacts sitting there looking fresh. Every one of the four builders
# imports this module before it does anything, so installing the hook here covers all of them.
def _die(exc_type, exc, tb):
    import traceback
    traceback.print_exception(exc_type, exc, tb)
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(1)


sys.excepthook = _die


def smooth(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------------------ intake ----
def load_raw(path, name):
    """Import the preserved raw generation, weld its texture-seam split vertices and drop any
    detached flake. The raw file itself is never modified."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    bpy.ops.import_scene.gltf(filepath=path)
    o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
    o.name = name
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new()
    bm.from_mesh(o.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.verts.ensure_lookup_table()
    seen, comps = set(), []
    for v in bm.verts:
        if v in seen:
            continue
        stack, part = [v], []
        seen.add(v)
        while stack:
            q = stack.pop()
            part.append(q)
            for e in q.link_edges:
                w = e.other_vert(q)
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        comps.append(part)
    sizes = sorted((len(c) for c in comps), reverse=True)
    removed = sum(len(c) for c in comps if len(c) < 8)
    for c in comps:
        if len(c) < 8:
            bmesh.ops.delete(bm, geom=c, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(o.data)
    bm.free()
    report = {'looseVertsBeforeWeld': before, 'vertsAfterWeld': len(o.data.vertices),
              'components': len(sizes), 'largestComponents': sizes[:5],
              'removedFlakeVertices': removed,
              'sourceTriangles': sum(len(p.vertices) - 2 for p in o.data.polygons),
              'sourceSha256': hashlib.sha256(open(path, 'rb').read()).hexdigest()}
    return o, report


def retain_albedo(o, material_name, roughness, normal_strength=.15):
    """The era's established material correction: keep the full original UV albedo, make COLOR_0
    white so a runtime tint does not multiply the texture by a baked copy of its own pigment, cut
    the generated normal map back to microrelief, and set roughness/metallic explicitly after
    disconnecting the linked ORM inputs. Returns a bilinear albedo sampler and the texture hash."""
    mat = o.data.materials[0]
    mat.name = material_name
    bs = mat.node_tree.nodes.get('Principled BSDF')
    node = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image
                and n.image.colorspace_settings.name == 'sRGB')
    im = node.image
    px = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
    layer = o.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for item in layer.data:
        item.color = (1, 1, 1, 1)
    for link in list(mat.node_tree.links):
        if link.to_node == bs and link.to_socket.name in ('Metallic', 'Roughness'):
            mat.node_tree.links.remove(link)
    bs.inputs['Metallic'].default_value = 0
    bs.inputs['Roughness'].default_value = roughness
    for n in mat.node_tree.nodes:
        if n.type == 'NORMAL_MAP':
            n.inputs['Strength'].default_value = normal_strength
    sha = hashlib.sha256(bytes(im.packed_file.data)).hexdigest() if im.packed_file else None

    def sample(u, v):
        h, w = px.shape[:2]
        x = (float(u) % 1) * w - .5
        y = (float(v) % 1) * h - .5
        x0, y0 = math.floor(x), math.floor(y)
        fx, fy = x - x0, y - y0
        rgb = (px[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy)
               + px[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
               + px[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy
               + px[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
        lin = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
        return (*[float(c) for c in lin], 1.)

    def luminance_at(u, v):
        h, w = px.shape[:2]
        x = int((float(u) % 1) * w) % w
        y = int((float(v) % 1) * h) % h
        r, g, b = px[y, x, :3]
        return float(.2126 * r + .7152 * g + .0722 * b)

    return sample, luminance_at, sha, mat


def vertex_uvs(o):
    """One UV per vertex, taken from the first loop that uses it. Good enough to read pigment
    from; it is never used to build geometry."""
    uvl = o.data.uv_layers.active
    out = {}
    for p in o.data.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            out.setdefault(vi, tuple(uvl.data[li].uv))
    return out


# ------------------------------------------------------------------- the measured frame ----
def measure_frame(o, head_is_positive_pca, luminance_at, harmonic_floor=.30):
    """Find the body's own long axis, its up, and the scale that makes it 1.0 long, and rewrite
    the mesh into that frame.

    `tools/triassic/preview-orientation.json` is an estimate read off fixed-world-axis renders and
    is wrong for at least one animal in the roster, so nothing here reads it. The long axis is the
    first principal component of the actual vertices; three of these four generations lie across
    the file's axes by 8 to 25 degrees, and one of them (Mixosaurus) has a fluke that spans further
    across the body than the tail is long, so a bounding box would not have found it either.

    The **roll** about that axis cannot come from geometry -- a roughly elliptical section is
    rotationally ambiguous and the second principal component of a body with big paired flippers
    points at the flippers, not at the sky. It comes from the animal's own countershading, exactly
    as Dinocephalosaurus' neck and head frames do: dark back, pale belly, and the first circular
    harmonic of darkness round each station points at dorsal. Returns the frame and the evidence.
    """
    co = np.array([v.co[:] for v in o.data.vertices])
    centre = co.mean(0)
    _u, _s, vt = np.linalg.svd(co - centre, full_matrices=False)
    along = vt[0] * (1. if head_is_positive_pca else -1.)   # +along points TAILWARD
    up = max([vt[1], vt[2]], key=lambda v: abs(v[2]))
    up = up * (1. if up[2] > 0 else -1.)
    # Right-handed, and it matters: side x along must be up, or the frame is a reflection, the
    # face winding inverts and every inward thickness ray leaves the body instead of crossing it.
    side = np.cross(along, up)
    side /= np.linalg.norm(side)
    up = np.cross(side, along)
    up /= np.linalg.norm(up)
    R = np.stack([side, along, up])
    assert np.linalg.det(R) > 0, 'the measured frame must be right-handed'
    P = (co - centre) @ R.T
    length = float(P[:, 1].max() - P[:, 1].min())

    # --- the roll, read off the countershading
    uvs = vertex_uvs(o)
    lum = np.array([luminance_at(*uvs.get(i, (0., 0.))) for i in range(len(co))])
    Q = P / length
    y0, y1 = Q[:, 1].min(), Q[:, 1].max()
    rows = []
    for y in np.linspace(y0 + .10, y1 - .10, 24):
        m = np.abs(Q[:, 1] - y) < .018
        if m.sum() < 24:
            continue
        q = Q[m]
        l = lum[m]
        c = np.array([np.median(q[:, 0]), np.median(q[:, 2])])
        d = q[:, [0, 2]] - c
        r = np.hypot(d[:, 0], d[:, 1])
        keep = r > np.quantile(r, .35)
        a = np.arctan2(d[keep, 1], d[keep, 0])
        dark = -(l[keep] - l[keep].mean())
        re, im = float((dark * np.cos(a)).sum()), float((dark * np.sin(a)).sum())
        denom = float(np.abs(dark).sum())
        if denom <= 0:
            continue
        rows.append({'y': float(y), 'strength': math.hypot(re, im) / denom,
                     'dorsalDegrees': math.degrees(math.atan2(im, re))})
    assert rows, 'the countershading could not be sampled at all'
    strength = float(np.mean([r['strength'] for r in rows]))
    assert strength > harmonic_floor, ('the countershading signal is too weak to read a roll from',
                                       strength)
    # A circular mean, so a station near +/-180 does not drag the average through zero.
    ang = np.radians([r['dorsalDegrees'] for r in rows])
    w = np.array([r['strength'] for r in rows])
    dorsal = math.atan2(float((w * np.sin(ang)).sum()), float((w * np.cos(ang)).sum()))
    roll = dorsal - math.pi / 2     # dorsal should read at +90 degrees, i.e. at +Z
    c, s = math.cos(-roll), math.sin(-roll)
    Rroll = np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
    P = (P @ Rroll.T) / length
    for i, v in enumerate(o.data.vertices):
        v.co = Vector((float(P[i, 0]), float(P[i, 1]), float(P[i, 2])))
    o.data.update()
    evidence = {'rawLengthAlongMeasuredAxis': length,
                'principalAxisInFile': along.tolist(),
                'boundingBoxWouldHaveSaid': 'xyz'[int(np.argmax(co.max(0) - co.min(0)))],
                'angleBetweenPrincipalAxisAndFileAxis':
                    float(math.degrees(math.acos(min(1., abs(float(along[int(np.argmax(np.abs(along)))])))))),
                'countershadingStations': len(rows),
                'countershadingMeanStrength': strength,
                'measuredDorsalDegrees': math.degrees(dorsal),
                'rollCorrectionDegrees': math.degrees(roll),
                'perStation': rows}
    return evidence


# ----------------------------------------------------------------- thickness and centreline ----
def shell_thickness(mesh, bvh):
    """How thick the shell is along each vertex's inward normal. A fin blade is thin and a trunk
    is not, so this separates a paddle from the flank it grows out of without guessing a boundary."""
    t = np.empty(len(mesh.vertices), dtype=np.float64)
    for i, v in enumerate(mesh.vertices):
        n = Vector(v.normal[:])
        hit = bvh.ray_cast(Vector(v.co[:]) - n * 2e-4, -n, .6)
        t[i] = hit[3] if hit[0] is not None else .6
    return t


def neighbourhood_minimum(mesh, values, rings=2):
    """The smallest value within `rings` edges. A vertex on a blade's rim has a normal lying almost
    in the plane of the blade, so its ray runs the length of the fin instead of across it and the
    rim measures as thick as the trunk; uncorrected, Helicoprion's pectoral rim was weighted to the
    chest while the blade around it followed the fin, and the Death roll tore it into spikes."""
    adj = [[] for _ in range(len(mesh.vertices))]
    for e in mesh.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    out = np.array(values, dtype=np.float64)
    for _ in range(rings):
        prev = out.copy()
        for i, nb in enumerate(adj):
            if nb:
                out[i] = min(prev[i], min(prev[j] for j in nb))
    return out


def measured_centreline(o, thin_mask, stations=61, band=.012, smoothing=5):
    """The trunk's own centreline, from the thick vertices only, so a flipper hanging below the
    flank and a median fin standing above it cannot drag the axis off the animal. Returns
    `cx(y)`, `cz(y)`, `half_width(y)`, `half_depth(y)` and the sampled table."""
    co = np.array([v.co[:] for v in o.data.vertices])
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), stations)
    cx, cz, hw, hd = [], [], [], []
    for y in ys:
        m = (np.abs(co[:, 1] - y) < band) & ~thin_mask
        if m.sum() < 6:
            m = np.abs(co[:, 1] - y) < band
        if m.sum() < 3:
            cx.append(cx[-1] if cx else 0.)
            cz.append(cz[-1] if cz else 0.)
            hw.append(hw[-1] if hw else 0.)
            hd.append(hd[-1] if hd else 0.)
            continue
        q = co[m]
        ax, az = float(np.median(q[:, 0])), float(np.median(q[:, 2]))
        cx.append(ax)
        cz.append(az)
        hw.append(float(np.quantile(np.abs(q[:, 0] - ax), .96)))
        hd.append(float(np.quantile(np.abs(q[:, 2] - az), .96)))
    k = np.ones(smoothing) / smoothing
    pad = smoothing // 2
    sm = lambda v: np.convolve(np.pad(np.array(v), pad, mode='edge'), k, mode='valid')
    cx, cz, hw, hd = sm(cx), sm(cz), sm(hw), sm(hd)
    table = [{'y': float(y), 'cx': float(a), 'cz': float(b), 'halfWidth': float(c),
              'halfDepth': float(d)} for y, a, b, c, d in zip(ys, cx, cz, hw, hd)]
    return ((lambda y: float(np.interp(y, ys, cx))), (lambda y: float(np.interp(y, ys, cz))),
            (lambda y: float(np.interp(y, ys, hw))), (lambda y: float(np.interp(y, ys, hd))), table)


# ----------------------------------------------------- broad appendages and the trunk axis ----
def appendage_excluded_centreline(o, drop_mask, stations=61, band=.014, smoothing=5,
                                  low_quantile=.04, high_quantile=.96, min_samples=8):
    """Measure a trunk axis after dropping known appendage vertices.

    `measured_centreline` is deliberately the simple, right default for a fish or a body with
    blade-thin fins.  It cannot identify a broad flipper or a sprawling leg: that flesh is thick
    enough to enter the section sample and can pull a median outside the trunk.  Archelon,
    Aphaneramma, Mystriosuchus and Mosasaurus each independently proved the same two-pass remedy:
    use the ordinary pass to find appendages, discard vertices nearer an appendage polyline than
    the rough axis, then take the middle of the retained section's robust range.

    This helper is opt-in.  Keeping existing builders on `measured_centreline` preserves their
    shipped output; a builder adopting it must record both passes and assert its final axis stays
    inside the trunk.
    """
    co = np.array([v.co[:] for v in o.data.vertices])
    if len(drop_mask) != len(co):
        raise ValueError('appendage exclusion mask must match the mesh vertex count')
    keep = ~np.asarray(drop_mask, dtype=bool)
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), stations)
    cxs, czs, hws, hds = [], [], [], []
    for y in ys:
        m = (np.abs(co[:, 1] - y) < band) & keep
        if m.sum() < min_samples:
            m = np.abs(co[:, 1] - y) < band
        if m.sum() < 3:
            cxs.append(cxs[-1] if cxs else 0.)
            czs.append(czs[-1] if czs else 0.)
            hws.append(hws[-1] if hws else 0.)
            hds.append(hds[-1] if hds else 0.)
            continue
        q = co[m]
        xa, xb = np.quantile(q[:, 0], low_quantile), np.quantile(q[:, 0], high_quantile)
        za, zb = np.quantile(q[:, 2], low_quantile), np.quantile(q[:, 2], high_quantile)
        cxs.append(float((xa + xb) / 2))
        czs.append(float((za + zb) / 2))
        hws.append(float((xb - xa) / 2))
        hds.append(float((zb - za) / 2))
    k = np.ones(smoothing) / smoothing
    pad = smoothing // 2
    smooth_values = lambda values: np.convolve(np.pad(np.array(values), pad, mode='edge'), k, mode='valid')
    cxs, czs, hws, hds = (smooth_values(cxs), smooth_values(czs),
                           smooth_values(hws), smooth_values(hds))
    table = [{'y': float(y), 'cx': float(x), 'cz': float(z), 'halfWidth': float(w),
              'halfDepth': float(d)} for y, x, z, w, d in zip(ys, cxs, czs, hws, hds)]
    return ((lambda y: float(np.interp(y, ys, cxs))), (lambda y: float(np.interp(y, ys, czs))),
            (lambda y: float(np.interp(y, ys, hws))), (lambda y: float(np.interp(y, ys, hds))), table)


def appendage_vertex_mask(o, appendages, axis_x, axis_z, stations=61, samples=(0., .34, .68, 1.)):
    """Return vertices closer to a rough appendage line than to the rough trunk axis.

    `appendages` are thin-cluster records with `seat` and `reach` points.  The mask is shared by
    the second axis pass and limb weighting, so the skinning decision and the measured trunk can
    never disagree about which tissue belongs to a limb.
    """
    co = np.array([v.co[:] for v in o.data.vertices])
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), stations)
    axis, axis_length = polyline([Vector((axis_x(float(y)), float(y), axis_z(float(y)))) for y in ys])
    lines = []
    for appendage in appendages:
        seat, reach = Vector(appendage['seat']), Vector(appendage['reach'])
        lines.append(polyline([seat + (reach - seat) * t for t in samples]))
    out = np.zeros(len(co), dtype=bool)
    for i, p in enumerate(co):
        point = Vector((float(p[0]), float(p[1]), float(p[2])))
        trunk_distance = project(axis, axis_length, point)[0]
        out[i] = any(project(line, length, point)[0] < trunk_distance for line, length in lines)
    return out


# ------------------------------------------------------------------------- the mouth ----
def mouth_cavity(o, front_fraction=.34, gap=.030):
    """Placodus' measurement: every head vertex casts its own outward normal back into the mesh,
    and a vertex that hits is looking across the mouth slit at the lip opposite. Returns the
    cavity points, or an empty array where the generation has no modelled mouth at all -- which is
    what happened to Dinocephalosaurus, whose snout is one closed tube with the mouth painted on.
    Try this first; fall back to the albedo, and say which was used."""
    co = np.array([v.co[:] for v in o.data.vertices])
    y0, y1 = co[:, 1].min(), co[:, 1].max()
    limit = y0 + front_fraction * (y1 - y0)
    bvh = BVHTree.FromPolygons([v.co for v in o.data.vertices],
                               [p.vertices[:] for p in o.data.polygons], all_triangles=False)
    pts = []
    for v in o.data.vertices:
        if v.co.y > limit:
            continue
        n = Vector(v.normal[:])
        hit = bvh.ray_cast(Vector(v.co[:]) + n * 3e-4, n, gap)
        if hit[0] is not None:
            pts.append(v.co[:])
    return np.array(pts) if pts else np.zeros((0, 3))


def cavity_profile(cav, lo, hi, step, half, blur_sigma=2.):
    """Per-station mid height, half width and half depth of a measured cavity. The mid height is
    the mouth seam: a curve, which is why a builder shears the head onto it rather than cutting a
    tilted plane through the teeth, as Placodus' first delivery did."""
    ys, mid, wide, tall = [], [], [], []
    for y in np.arange(lo, hi + 1e-9, step):
        m = (cav[:, 1] >= y - half) & (cav[:, 1] < y + half)
        if m.sum() < 4:
            continue
        q = cav[m]
        a, b = float(np.percentile(q[:, 2], 6)), float(np.percentile(q[:, 2], 94))
        ys.append(float(y))
        mid.append((a + b) / 2)
        tall.append((b - a) / 2)
        wide.append(float(np.percentile(np.abs(q[:, 0] - np.median(q[:, 0])), 92)))

    def blur(v):
        v = np.array(v)
        i = np.arange(len(v))
        return np.array([float((v * np.exp(-.5 * ((i - k) / blur_sigma) ** 2)).sum()
                               / np.exp(-.5 * ((i - k) / blur_sigma) ** 2).sum()) for k in i])
    return np.array(ys), blur(mid), blur(wide), blur(tall)


def blur1d(v, sigma=1.6):
    """A small Gaussian along a measured series. A lip line read station by station off a mottled
    flank is noisy, and a cut that follows the noise is worse than one that follows the line."""
    v = np.array(v, dtype=np.float64)
    i = np.arange(len(v))
    return np.array([float((v * np.exp(-.5 * ((i - k) / sigma) ** 2)).sum()
                           / np.exp(-.5 * ((i - k) / sigma) ** 2).sum()) for k in i])


def albedo_mouth_line(o, luminance_at, y_lo, y_hi, centre_z, half_depth, stations=24):
    """Dinocephalosaurus' fallback, for a generation with no modelled mouth: the lip is the
    light/dark boundary walked **outwards from the belly** on each flank, because a pale belly is
    one solid block with a sharp step off it where a dark back is mottled and crosses mid value
    several times. Returns per-station mouth heights and the flank-to-flank disagreement."""
    co = np.array([v.co[:] for v in o.data.vertices])
    uvs = vertex_uvs(o)
    lum = np.array([luminance_at(*uvs.get(i, (0., 0.))) for i in range(len(co))])
    rows = []
    for y in np.linspace(y_lo, y_hi, stations):
        m = np.abs(co[:, 1] - y) < .008
        if m.sum() < 12:
            continue
        cz = centre_z(y)
        hd = max(half_depth(y), 1e-4)
        per = []
        for sgn in (1, -1):
            f = m & (np.sign(co[:, 0] - np.median(co[m, 0])) == sgn)
            if f.sum() < 5:
                continue
            q = co[f]
            l = lum[f]
            order = np.argsort(q[:, 2])          # from the belly upwards
            q, l = q[order], l[order]
            mid = (l.max() + l.min()) / 2
            hit = None
            for i in range(len(l)):
                if l[i] < mid:
                    hit = float(q[i, 2])
                    break
            if hit is not None:
                per.append(hit)
        if len(per) == 2:
            rows.append({'y': float(y), 'left': per[0], 'right': per[1],
                         'mid': float(np.mean(per)), 'disagreement': abs(per[0] - per[1]),
                         'asFractionOfLocalDepth': abs(per[0] - per[1]) / hd,
                         'centreZ': cz})
    return rows


def painted_line(o, luminance_at, centre_z, half_depth, y_lo, y_hi, u_lo=-.95, u_hi=.15,
                 stations=32, band=.010, jump=1.2, filter_width=(.12, .35)):
    """Read a painted mouth line as one **continuous curve** rather than station by station.

    `albedo_mouth_line` walks up from the belly and takes the first row below mid luminance, and
    that is the right reading on a cleanly countershaded animal. It is not a reading at all on a
    *blotched* one: Rhaeticosaurus' jaw is white with black speckles on it, and the walk stops at
    the first speckle, so the two flanks disagreed by a third of the head's radius and the line
    wandered by 0.13 of a radius between neighbouring stations. Keichousaurus records a third case
    in the same family -- the method finding the countershading boundary instead of the lip -- and
    the cure there was to say which *feature* was wanted. This says the same thing geometrically.

    What a generation paints is a **thin dark line with lighter skin immediately above and below
    it**, running the length of the head, so:

    * each station's flank is resampled onto a normalised height ``u = (z - cz) / halfDepth``;
    * a matched filter scores exactly that shape -- the mean luminance of the bands
      `filter_width` of a radius above and below, less twice the luminance at u. A broad blotch
      scores nothing, because it darkens the comparison bands as well as the centre;
    * and the answer is the best-scoring **path** along the head under a penalty on how far it may
      move between neighbouring stations, so one bad station cannot take the line with it.

    `u_lo`/`u_hi` bound the search, and the bound is load-bearing rather than tidy: the eye and the
    countershading boundary both lie above the lip and both outscore it, and an unbounded read on
    Rhaeticosaurus climbed off the jaw corner and followed the countershading back along the neck.

    Returns a row per station with each flank's height, their mean, and their disagreement over the
    local radius -- which is the number that says whether the reading can be trusted.
    """
    co = np.array([v.co[:] for v in o.data.vertices])
    uvs = vertex_uvs(o)
    lum = np.array([luminance_at(*uvs.get(i, (0., 0.))) for i in range(len(co))])
    U = np.linspace(u_lo, u_hi, max(8, int(round((u_hi - u_lo) / .05)) + 1))
    profiles, keep = {1: [], -1: []}, []
    for y in np.linspace(y_lo, y_hi, stations):
        m = np.abs(co[:, 1] - y) < band
        if m.sum() < 14:
            continue
        midx = np.median(co[m, 0])
        got = {}
        for sgn in (1, -1):
            f = m & (np.sign(co[:, 0] - midx) == sgn)
            if f.sum() < 7:
                continue
            q, l = co[f], lum[f]
            u = (q[:, 2] - centre_z(y)) / max(half_depth(y), 1e-6)
            order = np.argsort(u)
            got[sgn] = np.interp(U, u[order], l[order])
        if len(got) == 2:
            keep.append(float(y))
            for s in (1, -1):
                profiles[s].append(got[s])
    if len(keep) < 6:
        return []
    du = U[1] - U[0]
    lo, hi = max(1, int(round(filter_width[0] / du))), max(2, int(round(filter_width[1] / du)))
    paths = {}
    for s in (1, -1):
        P = np.array(profiles[s])
        score = np.zeros_like(P)
        for k in range(P.shape[1]):
            above = P[:, min(k + lo, P.shape[1] - 1):min(k + hi, P.shape[1] - 1) + 1]
            below = P[:, max(k - hi, 0):max(k - lo, 0) + 1]
            score[:, k] = above.mean(1) + below.mean(1) - 2 * P[:, k]
        cost, back = score.copy(), np.zeros_like(score, dtype=int)
        for i in range(1, cost.shape[0]):
            for k in range(cost.shape[1]):
                prev = cost[i - 1] - jump * np.abs(np.arange(cost.shape[1]) - k) * du
                j = int(np.argmax(prev))
                back[i, k] = j
                cost[i, k] += prev[j]
        k = int(np.argmax(cost[-1]))
        idx = [k]
        for i in range(cost.shape[0] - 1, 0, -1):
            k = back[i, k]
            idx.append(k)
        paths[s] = [float(U[j]) for j in idx[::-1]]
    rows = []
    for i, y in enumerate(keep):
        a, b = paths[1][i], paths[-1][i]
        rows.append({'y': y, 'left': a, 'right': b, 'u': (a + b) / 2,
                     'z': float(centre_z(y)) + (a + b) / 2 * float(half_depth(y)),
                     'disagreementOverRadius': abs(a - b)})
    return rows


def bisect_on_curve(o, seam, y_back, y_front, margin=.03):
    """Take the mouth cut on the *curve* the mouth actually is. A curve cannot be a bisection
    plane, so the head is sheared vertically by -seam(y), which carries the curve exactly onto
    z = 0; the cut is taken there and the shear undone, so every vertex the cut adds lands on the
    seam and every vertex that was already there returns to where it was. Only head faces are
    offered to the seam pass, so the rest of the body keeps its topology."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for cy in (y_back, y_front):
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-7,
                               plane_co=(0, cy, 0), plane_no=(0, 1, 0),
                               clear_inner=False, clear_outer=False)
    for v in bm.verts:
        v.co.z -= seam(v.co.y)
    head = [f for f in bm.faces if f.calc_center_median().y < y_back + margin]
    verts, edges = set(), set()
    for f in head:
        verts.update(f.verts)
        edges.update(f.edges)
    bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + head, dist=1e-7,
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1),
                           clear_inner=False, clear_outer=False)
    for v in bm.verts:
        v.co.z += seam(v.co.y)
    bm.to_mesh(o.data)
    bm.free()


def split_part(o, label, test, store):
    """Cut `o` in two by a predicate on face centres, keeping both halves as real objects."""
    part = o.copy()
    part.data = o.data.copy()
    part.name = o.name + ' ' + label
    bpy.context.collection.objects.link(part)
    for target, keep in ((o, False), (part, True)):
        bm = bmesh.new()
        bm.from_mesh(target.data)
        discard = [f for f in bm.faces if test(f.calc_center_median()) != keep]
        bmesh.ops.delete(bm, geom=discard, context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(target.data)
        bm.free()
    store.setdefault(label, {})[o.name] = part
    return part


def protrusions(o, y_front, floor=.0034):
    """A tooth is a connected patch of snout standing proud of the same surface smoothed. Returns
    the vertex table, how proud each vertex is, and the patches, largest first."""
    sm = o.copy()
    sm.data = o.data.copy()
    bpy.context.collection.objects.link(sm)
    bpy.context.view_layer.objects.active = sm
    m = sm.modifiers.new('Snout detail reference', 'SMOOTH')
    m.factor = .6
    m.iterations = 8
    bpy.ops.object.modifier_apply(modifier=m.name)
    bv = BVHTree.FromPolygons([v.co for v in sm.data.vertices],
                              [p.vertices[:] for p in sm.data.polygons], all_triangles=False)
    co = np.array([v.co[:] for v in o.data.vertices])
    out = np.zeros(len(co))
    for i, v in enumerate(o.data.vertices):
        if v.co.y > y_front:
            continue
        loc, nor, _idx, dist = bv.find_nearest(v.co)
        out[i] = dist * (1 if (v.co - loc).dot(nor) > 0 else -1)
    bpy.data.objects.remove(sm)
    adj = [[] for _ in range(len(co))]
    for e in o.data.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    mask = (co[:, 1] < y_front) & (out > floor)
    seen = np.zeros(len(co), bool)
    groups = []
    for i in np.nonzero(mask)[0]:
        if seen[i]:
            continue
        stack, g = [int(i)], []
        seen[i] = True
        while stack:
            q = stack.pop()
            g.append(q)
            for w in adj[q]:
                if mask[w] and not seen[w]:
                    seen[w] = True
                    stack.append(int(w))
        if len(g) >= 6:
            groups.append(g)
    groups.sort(key=len, reverse=True)
    return co, out, groups


def mouth_room(bvh, at, side, up, limit=.25, fallback=.02, cap=None):
    """How much head there is round the mouth line at one station: half-width to the nearer side,
    height to the roof, depth to the floor, measured by ray cast from the mouth's own axis.

    This is what `oral_shells` sizes a palate and a floor against. Two things about how it is cast.

    It is a cast rather than a normal-sign probe: `T.depth_probe` answers about the nearest surface,
    and beside a modelled slit the nearest surface is the lumen's own wall rather than the skull.

    And it is cast **inwards, from outside the animal**, not outwards from the mouth. Cast outwards
    it answers about the lumen on every generation that models a real oral cavity -- the first thing
    a ray up from the mouth axis meets is the roof of the modelled cavity, a few thousandths away,
    and a palate sized to that is the tube all over again. Placodus is the case: 309 px of backdrop
    through the mandible that widening the shells did not move by one, because what they were being
    widened to was still the mouth. From outside, the first hit is the skin, which is the question.

    Measure it on the head **before** the jaw is cut off, or the rays at the seam leave through the
    cut.
    """
    def reach(d):
        hit = bvh.ray_cast(at + d * limit, -d, limit)
        return limit - (hit[0] - (at + d * limit)).length if hit[0] is not None else fallback
    out = (min(reach(side), reach(-side)), reach(up), reach(-up))
    # **A cast from outside meets the first surface on the line, and on a body whose flippers span
    # wider than its head that surface is a flipper.** Rhaeticosaurus' do span further than it is
    # long, and its palate came out through the top of its skull on a room measured through a
    # paddle; Archelon's stood 0.0066 outside the head's own section and its builder said so. So the
    # caller passes the head's own measured section as a `cap` and the cast may only ever narrow it.
    return out if cap is None else tuple(min(a, b) for a, b in zip(out, cap))


def _superellipse(th, power):
    c, sn = math.cos(th), math.sin(th)
    if power != 2.:
        e = 2. / power
        c = math.copysign(abs(c) ** e, c)
        sn = math.copysign(abs(sn) ** e, sn)
    return c, sn


def oral_shells(seam, section, u_back, u_front, rings=24, ring=14, centre=None, power=2.,
                fit=None, overlap=.16, throat=.18, swell=1.60, behind=0., axis='y',
                point=None, room=None, fill=.90, shell_power=5., buried=.78, u_front_floor=None):
    """The mouth as **two independently closed surfaces**: a palate on the skull, a floor on the jaw.

    This replaces one sac whose wall stretched between the two jaws. That sac was built to stop an
    open gape showing the backdrop through the head, and it did -- but the wall it stretched *is* a
    mouth webbed shut: on Cymbospondylus at `Heavy` it photographed as a flat pink triangle filling
    the whole gape from hinge to snout, and a reviewer reading four bodies called it gum. It is not
    anatomy. A mouth is a palate closing the skull's interior, a floor closing the mandible's, and
    open space between them; being able to see daylight between the jaws of a gharial-snouted animal
    is what an open mouth looks like, and `gape-solid.py` has always allowed it -- backdrop present
    in **both** of its passes is honest gape, and only backdrop the cull *opens* is a hole.

    So each half is closed on its own and nothing stretches anywhere:

    - the **palate** is a closed shell whose visible face is its underside, a shallow dome hanging
      just inside the upper lip, rigid on `skull`;
    - the **floor** is a closed shell whose visible face is its top, rigid on `jaw`;
    - they **overlap rather than join**. At the corner of the mouth the jaw's rotation is zero --
      that is what a hinge is -- so an overlap there survives any gape, and the separation the
      clips open grows forward of it exactly as the mouth does. `overlap` is that interpenetration
      as a fraction of the local half-height, and it is invisible: at rest both shells are inside a
      shut mouth, and where they part the near half hides the far one.
    - behind the hinge the palate swells past the mouth's own section and the floor shrinks
      inside it (`throat`, the fraction of the mouth's length over which that happens), so the
      throat is a closed wall rather than a line of sight into the neck, and the floor's rear cap
      is nested inside the palate rather than meeting it.

    Both shells are closed manifolds and their normals are recalculated **outwards** by bmesh, so a
    backface cull cannot take a face that is doing work: what a viewer sees of a closed solid is
    always its front. The old sac had to be wound inwards and that winding was load-bearing.

    `section` is the mouth's own measured half-width and half-height per station and is unchanged --
    it is still what decides that the lining is never narrower than the mouth. `fit`, where a builder
    supplies it, still corrects each vertex on its own.

    `room` is how much head there is at the mouth line, per station, and every shipped builder
    supplies one. `swell` is the fallback for a builder that does not: a guess at the head, opening
    the rear rings past the measured lumen. Where the room is known the guess is worse than the
    measurement and is not added to it.

    `seam` and `room` may each be a **pair** of callables, `(palate, floor)`, and that too is for
    the generations that arrived **gaping**. Built about the mouth line -- the mid-height of the
    modelled cavity -- both shells hang in the open gape on such a body: Saurichthys' palate sat
    0.011 below the underside of its own upper rostrum, in the water, because the room measured
    from mid-gape and held short of the skin never reached the jaw the shell belongs to. Each
    shell is built about *its own jaw's edge of the lumen*: the palate about the cavity's roof and
    the floor about the cavity's floor, each with a room measured from there. On a generation whose
    mouth is shut the two lines are the same line and one callable says so.

    `u_front_floor` is where the **floor** ends when that is not where the palate ends, and it is
    for the generations that arrived **gaping**. Both shells are built about the mouth line, and on
    a body whose mandible hangs open in the bind pose the front of that line has no mandible under
    it: the lower jaw's tip sits further back than the upper arch of the mouth. A floor carried to
    the palate's front there ends in open water ahead of the jaw it is rigid on -- Hybodus' front
    cap stood 0.002 of a body ahead of its mandible's tip, and no seating could pull it anywhere,
    because the mouth's own axis was outside the animal at that station. So a builder that has
    measured where its mandible actually ends passes that here; the palate keeps `u_front`.

    Returns `(raw, faces, n_palate)`: raw points in the builder's own coordinates, quad faces over
    the two shells, and how many of the points are the palate's.
    """
    # `rings` is the station count the one-sac callers pass, and it is **split** between the two
    # shells rather than paid twice: the mouth costs what it always did. A stretching wall needed
    # stations to bend smoothly between two bones; a rigid lid does not, and the twin has to stay
    # under two fifths of the authored triangles with the oral parts counted in both.
    rings = max(10, (rings + 1) // 2)
    cf = centre or (lambda _u: 0.)
    raw, faces = [], []
    # `point` is for the heads whose mouth is measured on a **curved** frame rather than on a
    # straight axis -- Keichousaurus' and Dinocephalosaurus' long necks, where the lumen follows the
    # head's own centreline and `z` means distance along the head's normal. Everything else about
    # the two shells is the same, which is the point of the hook.
    place = point or (lambda u, lat, z: Vector((lat, u, z)) if axis == 'y' else Vector((u, lat, z)))

    def half_heights(u):
        """A mouth may be measured with one half-height or with two: a shark's palate sits almost on
        the cut while its floor is the whole lumen deep, and forcing that into one number either
        buries the roof in the skull or leaves the floor a sliver."""
        m = section(u)
        return (m[0], m[1], m[1]) if len(m) == 2 else (m[0], m[1], m[2])

    def shell(is_floor):
        base = len(raw)
        seam_of = seam if callable(seam) else seam[1 if is_floor else 0]
        room_of = room if (room is None or callable(room)) else room[1 if is_floor else 0]
        # `behind` carries the palate back past the mouth, and it is **zero** by default. It was
        # written before the room was measured, when the only way to reach the throat was to keep
        # going; it never moved a gape count by one, and where the seam and the head's lateral axis
        # are extrapolations -- which is all they can be behind the last measured station -- the
        # room measured on them is nonsense and the palate comes out through the top of the skull.
        # Atopodentatus put a flat pink slab over its own braincase that way, and its own section
        # hull passed it, because a hull over sections is not the skin. What closes the throat is
        # the rear cap at `u_back` itself, which `room` fills across the whole head.
        lo = 0. if is_floor else -behind
        front = u_front_floor if (is_floor and u_front_floor is not None) else u_front
        for i in range(rings):
            q = lo + (1. - lo) * (i / (rings - 1))
            u = u_back + (front - u_back) * q
            w, hu, hd = half_heights(u)
            # **The throat blend is measured from the mouth's own back, not from wherever the
            # palate starts.** Dividing by the extended range dilutes it: with the palate carried
            # 0.30 of the mouth's length behind, the rear cap reached its full section 0.30 back and
            # was only a third of the way down to the head's floor *at the hinge*, which is where
            # the wedge between the two cut halves opens. `smooth` clamps, so this reads 1 behind
            # the mouth and tapers over `throat` in front of it.
            back = smooth((throat - q) / throat) if throat > 1e-9 else 0.
            # **Each shell fills its own jaw, not the lumen.** The measured cavity of a shut mouth
            # is much narrower than the head that holds it -- Placodus' is 0.042 half-wide in a head
            # more than twice that -- and two shells drawn to the lumen alone leave a gap either
            # side of them: a ray into the gape passes between palate and floor, misses both, and
            # hits the inside of the far cheek. 309 px of that, where the one stretching sac had 36,
            # because the sac's wall stood across exactly that line. `room` is how much head there
            # is at the mouth line, measured by the builder; the palate takes the roof half of it
            # and the floor the floor half, and between them they are the whole of the head's
            # interior. That is what the reviewer asked for in so many words: a palate on each of
            # the top and bottom jaws rather than a filling between them.
            rw = ru = rd = 0.
            if room is not None:
                rw, ru, rd = room_of(u)
                rw, ru, rd = rw * fill, ru * fill, rd * fill
            # The measured room is a **bound, not a factor**: it is where the skin is, so the swell
            # below may raise the lumen towards it and must never multiply it. Multiplying it sent
            # a pink tube out of the top of Placodus' head at 1.6 x the distance to its own scalp.
            if is_floor:
                # Shrunk at the throat so its rear cap is strictly inside the palate's, never
                # coincident with it: two surfaces in the same place fight rather than close.
                up, dn, wid = hd * overlap, max(hd, rd * buried), max(w, rw) * (1. - .10 * back)
            else:
                # **The throat is the head's, not the mouth's.** A palate that stops at the lumen's
                # own section leaves a lateral gap between its edge and the skin at the corner of
                # the mouth, and a line of sight into that corner goes past it and hits the inside
                # of the far cheek -- 18 px on Cymbospondylus, all of them in the dark wedge behind
                # the last tooth. `swell` opens the rear rings past the measured lumen so the
                # throat is a wall across the head rather than a tube down the middle of it; it is
                # the flange-behind-the-hole the cephalopod linings are built with, for the same
                # reason. Macrocnemus reached the same answer by hand before this was shared.
                # `swell` is what opens the rear rings **when the room has not been measured**: it
                # is a guess at the head, and where the head is known it is worse than the
                # measurement and must not be added to it. Applied on top of a measured room it put
                # a pink nub out through the top of Cymbospondylus' snout, because the lumen's own
                # floored half-depth times 1.6 is more head than there is.
                if room is not None:
                    # **The far side of each shell is held short of the skin.** A shell's outer
                    # half is buried: what has to reach the skin is its width, because that is what
                    # a line of sight into the gape passes beside, and its mouth-facing surface,
                    # because that is what the mouth is. The roof of a palate is seen by nothing,
                    # and drawn to the same fraction of the measured room as the width it came out
                    # through the top of Atopodentatus' braincase -- passed by that builder's own
                    # section hull, because a hull over sections is not the skin. Held at `buried`
                    # it moves no gape count on any body and cannot break a skull.
                    up, dn, wid = max(hu, ru * buried), \
                        max(hd * (overlap + (1. - overlap) * back), rd * back * buried), \
                        max(w, rw)
                else:
                    s = 1. + (swell - 1.) * back
                    up, dn, wid = hu * s, hd * (overlap + (1. - overlap) * back) * s, w * s
            for j in range(ring):
                th = j * TAU / ring
                # **The half that faces the mouth is a squircle, not an ellipse.** An ellipse
                # narrows towards its poles, so a little way off the mouth line the shell is a
                # fraction of the width it has at the lip and the inner wall of the jaw shows in
                # the band between them -- the same shape fault the one-sac form paid for at the
                # mandible's rim, and on Placodus the difference between 90 px of backdrop and 11.
                # The far half keeps the caller's exponent, because that half is hugging the head
                # and a squircle there would push its corners out through the cheek.
                # ...and it is the *shallow* half that may be a squircle. At the throat the palate
                # swells to fill the head's own section, and a squircle whose two semi-axes are both
                # the head's puts its diagonal corner 23 % outside the head -- which is what broke
                # Cymbospondylus' cheek. So the exponent runs back to the caller's own over the
                # throat blend: a lid beside the lip is square-sided, a plug inside the head is not.
                mouth_facing = (math.sin(th) >= 0) if is_floor else (math.sin(th) < 0)
                pw = shell_power + (power - shell_power) * back if mouth_facing else power
                c, sn = _superellipse(th, pw)
                p = place(u, cf(u) + wid * c, seam_of(u) + (up if sn >= 0 else dn) * sn)
                if fit is not None:
                    p = fit(p, u)
                raw.append(p)
        for i in range(rings - 1):
            for j in range(ring):
                a = base + i * ring + j
                b = base + i * ring + (j + 1) % ring
                faces.append((a, b, b + ring, a + ring))
        faces.append(tuple(range(base, base + ring)))
        faces.append(tuple(reversed(range(base + (rings - 1) * ring, base + rings * ring))))

    shell(False)
    n_palate = len(raw)
    shell(True)
    return raw, faces, n_palate


def oral_object(name, tx, raw, faces, n_palate, material=None, rig=None, measured_room=False):
    """One mesh object carrying both shells, each rigid on its own bone.

    They are one object and not two because everything downstream -- `oralparts`, the paired audit,
    the twin, the export -- counts oral parts, and because a palate and a floor that ship as one
    mesh cannot be separated by a later edit. Rigid, not blended: a palate that took a share of the
    jaw's rotation would be the stretching wall again in the weight field.
    """
    me = bpy.data.meshes.new(name)
    me.from_pydata([tx(p) for p in raw], [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = (0, 0, 0)
    # A flag the builders' seating checks read. `depth()` is a nearest-surface probe, and a palate
    # that fills the head out to the skin sits *outside the lumen's own wall* wherever a generation
    # models a real oral cavity, so the probe reads it as broken skin -- Cymbospondylus at -0.0134
    # against a -0.012 bound, unmoved by every correction to the shape, because it is not about the
    # shape. `CLAUDE.md`: where a mouth is modelled, record the probe and assert against the head's
    # own measured section instead. That section is `mouth_room`, and `oral_shells` holds every
    # vertex inside `fill` of it by construction.
    o['measuredRoom'] = bool(measured_room)
    if material is not None:
        o.data.materials.append(material)
    # Outward, by measurement rather than by winding convention: a closed solid shows its front
    # faces to everything outside it, so the cull shim `gape-solid.py` applies cannot open it.
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(o.data)
    bm.free()
    for n in ('skull', 'jaw'):
        o.vertex_groups.new(name=n)
    o.vertex_groups['skull'].add(list(range(n_palate)), 1., 'REPLACE')
    o.vertex_groups['jaw'].add(list(range(n_palate, len(raw))), 1., 'REPLACE')
    for p in o.data.polygons:
        p.use_smooth = True
    if rig is not None:
        mod = o.modifiers.new('Oral surfaces', 'ARMATURE')
        mod.object = rig
        o.parent = rig
    return o


def lining(name, rig, tx, seam, section, y_back, y_front, jaw_blend, material,
           rings=24, ring=14, centre_x=None, power=2., fit=None, overlap=.16, throat=.18,
           swell=1.60, behind=0., room=None, fill=.90, shell_power=5., buried=.78,
           y_front_floor=None):
    """A palate on the skull and a floor on the jaw -- see `oral_shells` for the whole argument.

    The signature is the one the twelve builders on this kit already call, so that the change is one
    implementation rather than twelve edits. `jaw_blend` is no longer read: which shell a point
    belongs to is which side of the mouth line it is on, and each shell is rigid on one bone, so
    there is no blend left to tune. The builders keep their blend functions because they are also
    what several of them measure the mouth with.
    """
    raw, faces, n_palate = oral_shells(seam, section, y_back, y_front, rings=rings, ring=ring,
                                       centre=centre_x, power=power, fit=fit,
                                       overlap=overlap, throat=throat, swell=swell,
                                       behind=behind, room=room, fill=fill,
                                       shell_power=shell_power, buried=buried, axis='y',
                                       u_front_floor=y_front_floor)
    return oral_object(name, tx, raw, faces, n_palate, material, rig,
                       measured_room=room is not None), raw


def crown_lining(name, rig, tx, rim, centre, axis, dn_axis, ds_axis, into_head,
                 skin_weights, material, rings=16, ring=14, seam_margin=.30, sew_rings=3):
    """One closed skinned lining for a **beak inside an arm crown**, sewn to the skin's own cut rim.

    `lining()` above is the jawed-head case: a tube on a measured seam that runs along the body's
    long axis, with its roof on the skull and its floor on the jaw. A cephalopod's mouth is not that
    shape and, more importantly, is not held by those bones. Two things go wrong if it is built like
    one, and both were measured on Ceratites before this existed:

    - **The opening is a curve on a dome, not a circle in a plane.** A flat front ring at a fixed
      distance along the mouth axis stands proud of the rim where the dome falls away and behind it
      where the dome bulges, so there is an annular gap round part of it from the first frame.
    - **The rim of the skin is not weighted to the jaw.** Round a peristome the skin belongs to the
      lips, the head and the arms standing over it, so a lining whose front ring rides the jaw
      swings away from a rim that stays put the moment the beak opens. `gape-solid.py` saw the
      backdrop through that gap at 168 px against a 12 px tolerance.

    So the front ring is placed **on the measured rim itself**, azimuth by azimuth, pulled inside
    along the axis by `seam_margin` of the local radius so it sits behind the skin rather than
    meeting it edge to edge; and its first `sew_rings` take the skin's own weights at that point
    (`skin_weights` is the builder's `weights()`, which is a pure function of position), fading into
    the jaw/skull blend deeper in. The lining then follows whatever the skin round the mouth
    follows, and only its throat rides the beak.

    `rim` is the cut rim's vertices in raw coordinates; `centre`, `axis`, `dn_axis`, `ds_axis` the
    mouth frame; `into_head` how far back the sac reaches. Returns the object and its raw points.
    """
    rim = np.asarray(rim, dtype=float)
    d = rim - np.asarray(centre, dtype=float)
    ra = d @ np.asarray(axis, dtype=float)
    rdn = d @ np.asarray(dn_axis, dtype=float)
    rds = d @ np.asarray(ds_axis, dtype=float)
    rrad = np.hypot(rdn, rds)
    rth = np.arctan2(rdn, rds)

    def rim_at(theta):
        """The rim's own distance out and distance along, at one azimuth: a weighted mean of the
        rim vertices near it, so a rim the cut left unevenly sampled still reads smoothly."""
        dth = np.abs((rth - theta + math.pi) % (2 * math.pi) - math.pi)
        w = np.exp(-(dth / .45) ** 2)
        if w.sum() < 1e-9:
            k = int(np.argmin(dth))
            return float(rrad[k]), float(ra[k])
        return float((rrad * w).sum() / w.sum()), float((ra * w).sum() / w.sum())

    thetas = [j * TAU / ring for j in range(ring)]
    edge = [rim_at(t) for t in thetas]
    mean_r = float(np.mean([r for r, _a in edge]))

    # The first two rings are a **flange wider than the hole**, set back behind the skin. A lining
    # that merely meets the rim is edge-on to a camera looking into the mouth, and the quads at that
    # seam are the ones a backface cull takes away: Ceratites leaked 40 px of backdrop in a scatter
    # right across the width of its own mouth, every one of them at the rim under an arm. A flange
    # puts squarely-facing geometry behind the seam, so a sliver opened at the rim looks onto the
    # lining instead of into the head.
    verts, raw, faces = [], [], []
    for i in range(rings):
        u = i / (rings - 1)
        flange = 1.16 if i == 0 else 1.10 if i == 1 else 1.0
        shrink = flange * (1.02 - .80 * smooth(max(0., (u - .30) / .70)))
        for j, th in enumerate(thetas):
            r0, a0 = edge[j]
            r = r0 * shrink
            a = a0 - seam_margin * mean_r - into_head * u
            p = Vector((np.asarray(centre, dtype=float)
                        + np.asarray(axis, dtype=float) * a
                        + np.asarray(dn_axis, dtype=float) * (r * math.sin(th))
                        + np.asarray(ds_axis, dtype=float) * (r * math.cos(th))).tolist())
            raw.append(np.array(p[:]))
            verts.append(tx(p))
    for i in range(rings - 1):
        for j in range(ring):
            x = i * ring + j
            y = i * ring + (j + 1) % ring
            faces.append((x, y, y + ring, x + ring))
    faces.append(tuple(reversed(range(ring))))
    faces.append(tuple(range((rings - 1) * ring, rings * ring)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)

    groups = {}
    per_vertex = []
    for idx, p in enumerate(raw):
        u = (idx // ring) / (rings - 1)
        dn = float((p - np.asarray(centre, dtype=float)) @ np.asarray(dn_axis, dtype=float))
        g = max(0., min(1., .5 + .5 * dn / max(mean_r, 1e-9)))
        oral = {'jaw': g, 'skull': 1 - g}
        # The sew: the first rings carry the skin's own weights, so the opening moves with the face
        # round it; the throat carries the beak.
        t = smooth(max(0., (u - (sew_rings - 1) / (rings - 1)) / max(1e-6, .45)))
        skin = skin_weights(p) if t < 1 else {}
        w = {}
        for n, v in skin.items():
            w[n] = w.get(n, 0.) + v * (1 - t)
        for n, v in oral.items():
            w[n] = w.get(n, 0.) + v * t
        total = sum(w.values()) or 1.
        w = {n: v / total for n, v in sorted(w.items(), key=lambda kv: -kv[1])[:4]}
        per_vertex.append(w)
        for n in w:
            groups.setdefault(n, o.vertex_groups.new(name=n))
    for idx, w in enumerate(per_vertex):
        total = sum(w.values()) or 1.
        for n, v in w.items():
            groups[n].add([idx], v / total, 'REPLACE')
    for q in o.data.polygons:
        q.use_smooth = True
    mod = o.modifiers.new('Oral membrane', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    return o, raw


def crown_beak(name, rig, bone_name, tx, centre, axis, dn_axis, ds_axis, radius, sign,
               material, sections=9, ring=10, hook=.55):
    """One mandible of a cephalopod beak: a curved, keeled wedge rigid on one bone.

    This is the one piece of geometry either cephalopod builder invents, and the era's rule is that
    what may be authored is decided by how *simple* the shape is. A beak is two curved wedges, which
    is far below the tooth-whorl bar that rule sets — but simple is not the same as crude. The first
    version was a four-sided box with flat shading and it read, looking straight into the crown, as
    a pair of grey lumps rather than as a beak. This is the same amount of invented shape, described
    properly: an elliptical section that flattens to a keel along the occlusal edge, a rostrum that
    curves in towards the axis over the last third, and smooth shading.

    `sign` is +1 for the lower mandible and -1 for the upper; the two are otherwise identical, as
    they nearly are in life. It carries the oral apparatus' own material rather than the skin's,
    exactly as every other Triassic mouth lining and tooth does: a beak is chitin, and painting it
    with the mantle's pigment would be the error that rule is about rather than the fix for it.
    """
    centre = np.asarray(centre, dtype=float)
    axis = np.asarray(axis, dtype=float)
    dn_axis = np.asarray(dn_axis, dtype=float)
    ds_axis = np.asarray(ds_axis, dtype=float)
    verts, faces = [], []
    for i in range(sections):
        u = i / (sections - 1)
        a = -radius * .58 + radius * .84 * u
        # The rostrum: straight for the first half, curving in towards the mouth axis over the rest.
        lift = sign * radius * (.30 - .34 * smooth(max(0., (u - .35) / .65)) - hook * .22 * u ** 3)
        w = radius * (.60 - .50 * u ** 1.3)
        h = radius * (.30 - .27 * u ** 1.1)
        for j in range(ring):
            th = j * TAU / ring
            # A keel: the occlusal side (towards the other mandible) is flattened, the outer side
            # is round, which is what makes a wedge read as a cutting edge rather than as a tube.
            keel = 1. if math.sin(th) * sign < 0 else .45
            p = (centre + axis * a + dn_axis * (lift + sign * h * math.sin(th) * keel)
                 + ds_axis * (w * math.cos(th)))
            verts.append(tx(Vector(p.tolist())))
        if i:
            base = i * ring
            for j in range(ring):
                k = (j + 1) % ring
                faces.append((base - ring + j, base - ring + k, base + k, base + j))
    faces.append(tuple(reversed(range(ring))))
    faces.append(tuple(range((sections - 1) * ring, sections * ring)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    g = o.vertex_groups.new(name=bone_name)
    g.add(list(range(len(o.data.vertices))), 1., 'REPLACE')
    for q in o.data.polygons:
        q.use_smooth = True
    mod = o.modifiers.new('Rigid mandible', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    return o


def cap_cut(obj, near, outward):
    """Close the cross-section a mouth cut leaves through the head, and nothing else.

    **A plane cut through a head leaves the head open across its whole section**, and where the
    mandible is then taken away that opening is the back wall of the mouth -- except that there is
    no wall. A line of sight into an open gape runs backwards through it, down the throat and out
    through the neck: one surface on the whole ray, backfacing, which is what `gape-solid.py` counts
    and what a ray cast through the failing pixels finds. Coelophysis' `SnapRight` showed 2,500
    pixels of it on polygons weighted `neck_04` and `neck_05`, and nothing done to the lining, the
    lumen, the cut rim or the hinge plug moved the number, because none of them is the back wall.

    A hinge plug is the usual answer and it is an ellipsoid, so it fills a section's middle and
    leaves its corners. This fills the section itself. The whole boundary of a cut half is **one**
    loop -- forward along the mouth line on one side, round the snout, back along the other, and
    across at the hinge -- so `holes_fill` over it would seal the mouth shut. `near` picks out the
    run of it that crosses at the hinge, and that run alone is fanned to its own centroid. `outward`
    is the direction the new faces should face, so a skull's cap faces into its mouth and a
    mandible's away from it.

    No new shape is invented: every vertex of the fan but its hub is one the cut already made, and
    the hub is their mean. `CLAUDE.md` is explicit that closing a hole is always fair game.

    And the cap wears the skin it closes: a new vertex in bmesh starts every layer at zero, so a hub
    with no UV and a black vertex colour drew Placodus' mandible cap as a black slab at the front of
    every open mouth. The hub copies its vertex layers from the rim and takes the mean of the rim's
    UVs, and each fan loop keeps its own rim vertex's UV, so the fill is the skin's own albedo
    across the section rather than a hole with a different colour.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    sel = [e for e in bm.edges
           if len(e.link_faces) == 1 and near(e.verts[0].co) and near(e.verts[1].co)]
    if len(sel) < 3:
        bm.free()
        return 0
    verts = []
    for e in sel:
        for v in e.verts:
            if v not in verts:
                verts.append(v)
    uv_layer = bm.loops.layers.uv.active
    rim_uv = {}
    if uv_layer is not None:
        for v in verts:
            loops = [l for l in v.link_loops]
            if loops:
                rim_uv[v] = sum((l[uv_layer].uv for l in loops), Vector((0., 0.))) / len(loops)
    hub = bm.verts.new(sum((v.co for v in verts), Vector()) / len(verts))
    for layers in (bm.verts.layers.float_color, bm.verts.layers.color):
        for layer in layers.values():
            hub[layer] = verts[0][layer]
    hub_uv = (sum(rim_uv.values(), Vector((0., 0.))) / len(rim_uv)) if rim_uv else None
    made = []
    for e in sel:
        try:
            f = bm.faces.new((e.verts[0], e.verts[1], hub))
        except ValueError:
            continue
        made.append(f)
        if uv_layer is not None:
            for l in f.loops:
                l[uv_layer].uv = hub_uv if l.vert is hub else rim_uv.get(l.vert, hub_uv)
    # The run is an arc, not a loop: its two ends are the corners of the mouth, and the fan leaves
    # one triangle between them. Those are the vertices the run touches only once.
    ends = [v for v in verts if sum(1 for e in sel if v in e.verts) == 1]
    if len(ends) == 2:
        try:
            f = bm.faces.new((ends[0], ends[1], hub))
            made.append(f)
            if uv_layer is not None:
                for l in f.loops:
                    l[uv_layer].uv = hub_uv if l.vert is hub else rim_uv.get(l.vert, hub_uv)
        except ValueError:
            pass
    for f in made:
        f.normal_update()
        if f.normal.dot(outward) < 0:
            f.normal_flip()
    bm.normal_update()
    bm.to_mesh(obj.data)
    obj.data.update()
    bm.free()
    return len(made)


def cut_rim(obj, within, seam=None, axis=1):
    """What a jaw cut actually left open in one half of a head, measured rather than assumed.

    **The first question about a mouth is whether the cut is earning its place**, and it is a
    question about the *generation*, not about the builder. Three answers turn up on this roster:

    - a head that arrived **shut** -- the commonest, and Dinocephalosaurus is the extreme, where
      the lip is painted on a closed snout. Rotating the jaw bone there opens nothing, because
      there is no aperture; the cut is what makes one, and something has to close behind it.
    - a head with a **slit or a shallow cavity** modelled, where the cut runs partly through
      surface that was already there.
    - a head that arrived **gaping**, with a real lumen: a roof, a floor and a commissure, all
      modelled. There the aperture already exists and so do its walls, and a cut through it makes
      a boundary where the surface was continuous.

    This reports the boundary each half is left with, inside `within`, as loops: how many, how long
    each is, the box it occupies, and -- where a `seam` is given -- how much of each loop is
    actually *on* the cut (a vertex the bisection put there) rather than pre-existing rim. A cut
    through a closed head leaves exactly one loop, every vertex of it on the seam or on one of the
    transverse cross-sections at the ends. Anything else is the generation talking.

    The tell for a gaping generation is short: the loop does not reach the snout. Cymbospondylus'
    measures 112 vertices spanning 0.042 of a body behind the hinge on a mouth 0.14 long, because
    forward of its commissure the upper and lower jaws are already separate sheets and the seam
    plane passes between them without touching either -- so nothing there was cut, and nothing
    there needs capping.

    `within(p)` bounds the region asked about (the head); `axis` is which component of a position
    is along the body, for the reach figure.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    border = [e for e in bm.edges if len(e.link_faces) == 1
              and within(e.verts[0].co) and within(e.verts[1].co)]
    elsewhere = sum(1 for e in bm.edges if len(e.link_faces) == 1) - len(border)
    adj = {}
    for e in border:
        adj.setdefault(e.verts[0], []).append(e)
        adj.setdefault(e.verts[1], []).append(e)
    seen, groups = set(), []
    for v in adj:
        if v in seen:
            continue
        stack, part = [v], []
        seen.add(v)
        while stack:
            q = stack.pop()
            part.append(q)
            for e in adj[q]:
                w = e.other_vert(q)
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        groups.append(part)
    groups.sort(key=len, reverse=True)
    out = {'boundaryEdgesInRegion': len(border), 'boundaryEdgesElsewhere': elsewhere,
           'loops': []}
    for p in groups[:8]:
        co = [v.co for v in p]
        row = {'vertices': len(p), 'closed': all(len(adj[v]) == 2 for v in p),
               'box': [[round(min(c[i] for c in co), 5), round(max(c[i] for c in co), 5)]
                       for i in range(3)],
               'reach': round(max(c[axis] for c in co) - min(c[axis] for c in co), 5)}
        if seam is not None:
            on = sum(1 for c in co if abs(c[2] - seam(c[axis])) < 1e-5)
            row['verticesOnTheSeam'] = on
        out['loops'].append(row)
    bm.free()
    return out


def _rim_cycles(edges):
    """Order a set of boundary edges into vertex cycles, or say why they are not cycles.

    A cap that is claimed to close by construction has to know it is spanning a *closed* curve.
    Every vertex of a set of disjoint cycles has exactly two of the set's edges on it; anything
    else -- a run that stops, a T where three edges meet -- means the selector has picked up
    something that is not one rim, and the honest answer is to refuse rather than to fill.
    """
    adj = {}
    for e in edges:
        a, b = e.verts
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    bad = [v for v, n in adj.items() if len(n) != 2]
    if bad:
        return None, {'verticesWithoutTwoRimEdges': len(bad), 'rimVertices': len(adj),
                      'bad': bad[:6]}
    cycles, seen = [], set()
    for start in adj:
        if start in seen:
            continue
        cyc, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = next((w for w in adj[cur] if w is not prev), None)
            if nxt is None or nxt is start:
                break
            cyc.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
        cycles.append(cyc)
    return cycles, {'rimVertices': len(adj), 'cycles': [len(c) for c in cycles]}


def cap_mouth(obj, rim, facing, dome=.30, rounds=2, limit=None, eps=1e-9):
    """Close the opening the jaw cut left in one half of a head **with the cut's own rim**, and
    dome it into that half, so the space between the two caps is the mouth.

    This is the owner's construction and it replaces a shell placed in the lumen. A mouth cut takes
    a closed head and separates it into a skull part and a jaw part, and each is left with an open
    boundary along the cut. Span that boundary and the part is a closed solid again -- and the
    surface that spans it *is* the roof or the floor of the mouth, following the cut exactly,
    because the cut rim is what bounds it. Four things follow, and they are why this is worth the
    change rather than a second way of doing the same thing:

    - **It closes by construction.** A surface spanning a closed curve leaves no hole. A shell
      placed inside the lumen has to be *rendered* against a backdrop to find out whether it
      covers the opening, which is how Cartorhynchus shipped leaking 51 px at its commissure with
      nobody knowing. `gape-solid.py` stays the proof, because a cap can still face the wrong way
      or miss a run of rim -- but it is checking a claim the geometry already makes.
    - **The geometry is the body's own.** Every vertex of the cap is a convex combination of rim
      vertices the generation made: the fill uses no new points at all, and the points the dome
      needs are face centroids of that fill. `CLAUDE.md`'s bar for authoring on a Tripo body is how
      much shape is being invented, and this invents none -- it follows a fitted or curved cut for
      free, with no per-body sizing of a shell inside a lumen.
    - **It wears the skin it closes.** UVs and vertex colours come from the rim, inverse-distance
      weighted, so the palate is the head's own albedo rather than a flat-shaded island.
    - **Each cap is part of its own half**, so it is rigid to that half's bone *by construction*,
      through the same weight field as the skin around it. There is no second surface to keep
      coincident with the first -- which is the failure that cost Mosasaurus four rebuilds, where
      anything riding the jaw at weight 1 arrived exactly where the palate already was.

    **The lip run is what must not be filled.** A cut half's whole boundary is one loop -- forward
    along the mouth line on one flank, across the head at the far end of the cut, back along the
    other flank, and across again -- and a fill over all of it in one go is a flat plate whose twin
    on the other half is coincident with it: a mouth with no volume, which is the "sealed shut"
    `cap_cut` warns about. The answer is *not* to separate the lip from the rest, which cannot be
    done robustly on a curved cut. It is to fill the whole loop on **each half separately** and
    then dome each fill into its own half: the two plates part, and what is between them is the
    cavity. The lip is then the one curve where the two caps still meet, which is what a lip is.

    So the order a builder uses is: `cap_cut` over each transverse run first -- the cross-sections
    at the ends of the cut, which dip out of the mouth's own plane and would fold under a planar
    fill -- and then this, over what is left, which is the two lip runs and the short chords
    `cap_cut` closed the ends with. That residual loop lies in the mouth's own surface, which is
    why `triangle_fill` can project it along `facing` and triangulate it in the plane.

    **The dome's depth is measured, not chosen.** Each cap vertex is pushed into its half by
    `dome` times *its own distance from the nearest rim vertex*. That is one rule with three
    properties worth having: it is exactly zero on the rim, so the cap meets the skin without a
    step; it is deepest along the middle of the mouth and shallow at the lips, at the snout and in
    the corners, which is the shape a palate has; and it scales with the local mouth size by
    construction, because the distance from a point on the midline to the rim *is* the half-width
    there. `limit(p)` is an optional ceiling -- a builder that has measured how much head there is
    above the mouth line passes it, and the cap then cannot reach the skin whatever `dome` says.

    `rim(p)` selects the mouth's own boundary vertices; `facing` is the direction the cap's faces
    should point, which is into the mouth, so a skull's cap faces down and a mandible's up, and the
    dome runs the other way. `rounds` is how many times the fill is poked to give the dome interior
    vertices to use: one round triples the triangle count of the fill, two multiply it by nine.

    Returns a report, and raises where the rim is not one closed curve or the fill left the half
    open -- both of which are the construction failing to be a construction.
    """
    facing = Vector(facing).normalized()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    border = [e for e in bm.edges
              if len(e.link_faces) == 1 and rim(e.verts[0].co) and rim(e.verts[1].co)]
    if len(border) < 3:
        bm.free()
        return {'rimEdges': len(border), 'capped': False, 'why': 'no rim'}
    cycles, shape = _rim_cycles(border)
    if cycles is None:
        # What a dangling end means is that the selector let go of the rim, so say what is actually
        # there: every boundary edge on the offending vertex and whether `rim` took it.
        sel = set(border)
        detail = []
        for w in shape.pop('bad', []):
            detail.append({'at': [round(c, 5) for c in w.co],
                           'boundary': [{'to': [round(c, 5) for c in (e.other_vert(w).co)],
                                         'selected': e in sel,
                                         'rimEnds': [bool(rim(e.verts[0].co)), bool(rim(e.verts[1].co))]}
                                        for e in w.link_edges if len(e.link_faces) == 1]})
        shape['detail'] = detail
        bm.free()
        raise AssertionError(('the mouth rim is not a closed curve, so nothing here closes by '
                              'construction', obj.name, shape))
    uv_layer = bm.loops.layers.uv.active
    colour_layers = [l for layers in (bm.verts.layers.float_color, bm.verts.layers.color)
                     for l in layers.values()]
    rim_verts = []
    for e in border:
        for v in e.verts:
            if v not in rim_verts:
                rim_verts.append(v)
    rim_uv = {}
    if uv_layer is not None:
        for v in rim_verts:
            loops = list(v.link_loops)
            if loops:
                rim_uv[v] = sum((l[uv_layer].uv for l in loops), Vector((0., 0.))) / len(loops)
    rim_co = [v.co.copy() for v in rim_verts]
    rim_set = set(rim_verts)

    made = [g for g in bmesh.ops.triangle_fill(bm, edges=border, use_beauty=True,
                                               use_dissolve=False, normal=facing)['geom']
            if isinstance(g, bmesh.types.BMFace)]
    if not made:
        bm.free()
        raise AssertionError(('the mouth rim could not be filled', obj.name, shape))
    for _ in range(max(0, rounds)):
        made = bmesh.ops.poke(bm, faces=made)['faces']

    # The dome. Every vertex the fill and the pokes added is inside the rim; the rim itself does
    # not move, which is what keeps the cap and the skin one surface.
    pushed, deepest = 0, 0.
    for f in made:
        for v in f.verts:
            if v in rim_set or v.tag:
                continue
            v.tag = True
            d = min((v.co - p).length for p in rim_co)
            push = dome * d
            if limit is not None:
                push = min(push, max(0., limit(v.co)))
            if push > eps:
                v.co = v.co - facing * push
                pushed += 1
                deepest = max(deepest, push)
    for v in bm.verts:
        v.tag = False

    # The skin the cap closes. A bmesh vertex starts every layer at zero, so a fill with no UVs
    # draws as a black slab -- Placodus' mandible cap did exactly that before `cap_cut` learned to
    # carry the rim's. Inverse distance over the rim rather than the nearest rim vertex, so the
    # albedo runs across the cap instead of stepping between the vertices it was taken from.
    def blend_uv(co):
        num, den = Vector((0., 0.)), 0.
        for v in rim_verts:
            w = 1. / max((co - v.co).length, 1e-6) ** 2
            num += rim_uv.get(v, Vector((0., 0.))) * w
            den += w
        return num / den if den else Vector((0., 0.))

    def nearest_rim(co):
        return min(rim_verts, key=lambda v: (co - v.co).length)

    new_uv = {}
    for f in made:
        f.smooth = True
        for l in f.loops:
            v = l.vert
            if uv_layer is not None:
                if v in rim_uv:
                    l[uv_layer].uv = rim_uv[v]
                else:
                    if v not in new_uv:
                        new_uv[v] = blend_uv(v.co)
                    l[uv_layer].uv = new_uv[v]
            if v not in rim_set:
                for layer in colour_layers:
                    v[layer] = nearest_rim(v.co)[layer]
    for f in made:
        f.normal_update()
        if f.normal.dot(facing) < 0:
            f.normal_flip()
    bm.normal_update()
    left = [e for e in bm.edges
            if len(e.link_faces) == 1 and rim(e.verts[0].co) and rim(e.verts[1].co)]
    if left:
        bm.free()
        raise AssertionError(('the mouth cap left the half open', obj.name, len(left)))
    report = {'rimEdges': len(border), 'capped': True, 'faces': len(made),
              'domedVertices': pushed, 'deepestRaw': round(deepest, 6),
              'dome': dome, 'rounds': rounds, **shape}
    bm.to_mesh(obj.data)
    obj.data.update()
    bm.free()
    return report


def rim_flange(obj, axis_of, amount, select=None):
    """Fold the open rim of a cut mouth inwards, so the lip is not one polygon thick.

    **A rim with no thickness is a hole to anything looking along it.** Where the mouth is cut, both
    halves end in a boundary edge, and at a grazing angle that edge *is* the silhouette: the quad
    the eye meets there is nearly edge-on, and whether its geometry is wound towards the camera or
    away is decided by a rounding error in the pose. A single-sided pass then drops it and shows the
    world through the lip. That was the whole of Macrocnemus' residual gape leak — 19 pixels at the
    mandible's rear rim which four corrections to the lining, two to the hinge plug and a reduction
    of the gape itself did not move by one, because none of them was about the rim.

    The fold is `extrude_edge_only` along the boundary, with the new ring drawn towards the mouth's
    own axis. Blender keeps the extrusion's winding consistent with the faces it grew from, so the
    lip's outer side is the skin's outer side folded inwards, which is what a lip is. It is the
    "closing a hole is simple and is always fair game" case in `CLAUDE.md`, not a shape invented for
    the animal: every vertex of it comes from the generation's own rim.

    `select(a, b)`, given a boundary edge's two vertex positions, says whether that edge is the
    mouth's. A generation is not always closed everywhere else: Hybodus and Saurichthys carry
    open opercular seams and fin-base seams (some 3,800 boundary edges on each authored body), and
    folded without a selector every one of them grew a flap pointed at the mouth. Where a builder
    knows its cut is the only boundary it may leave this out.

    Returns the number of vertices added.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    border = [e for e in bm.edges if len(e.link_faces) == 1
              and (select is None or select(e.verts[0].co, e.verts[1].co))]
    if not border:
        bm.free()
        return 0
    grown = bmesh.ops.extrude_edge_only(bm, edges=border)['geom']
    added = [g for g in grown if isinstance(g, bmesh.types.BMVert)]
    for v in added:
        a = amount(v.co) if callable(amount) else amount
        d = Vector(axis_of(v.co)) - v.co
        if a > 0 and d.length > 1e-9:
            v.co = v.co + d.normalized() * a
    bm.normal_update()
    bm.to_mesh(obj.data)
    obj.data.update()
    bm.free()
    return len(added)


def seal_seams(obj, is_mouth, within, max_span):
    """Close the generation's own open seams -- not the mouth's rim -- with their own vertices.

    A generation is not always a closed shell: Hybodus and Saurichthys each carry some 3,800
    boundary edges besides the mouth cut, and on both the ones behind the corner of the mouth are
    the opercular seams, open slits into a hollow head. Under a single-sided pass a line of sight
    through one meets a single back-facing skin surface and the backdrop beyond it, which is what
    `gape-solid.py` counts, and it was the whole of what was left on both fish once the mouth was
    closed: 371 px on Saurichthys with the sac and 371 with the shells, in the same places. Folding
    every boundary edge as a lip (`rim_flange` with no selector) half-closed them by accident and
    hid the fact.

    So they are filled: `holes_fill` over every boundary edge that is not the mouth's, each new
    face taking its vertices' own UVs so the strip wears the skin either side of it. Only seams
    `within` (a predicate on a position -- the head, for these two) and no wider than `max_span`
    are kept, so a fin-base seam or the mouth cannot be sealed by mistake. Closing a hole with the
    vertices the generation already has is the case `CLAUDE.md` calls always fair game.

    Returns `(faces_made, loops_sealed, faces_refused)`.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv_layer = bm.loops.layers.uv.active
    sel = [e for e in bm.edges if len(e.link_faces) == 1 and not is_mouth(e.verts[0].co, e.verts[1].co)
           and within(e.verts[0].co) and within(e.verts[1].co)]
    if not sel:
        bm.free()
        return 0, 0, 0
    rim_uv = {}
    if uv_layer is not None:
        for e in sel:
            for v in e.verts:
                if v not in rim_uv and v.link_loops:
                    rim_uv[v] = sum((l[uv_layer].uv for l in v.link_loops), Vector((0., 0.))) / len(v.link_loops)
    made = bmesh.ops.holes_fill(bm, edges=sel, sides=0)['faces']
    kept, refused = [], []
    for fc in made:
        co = [v.co for v in fc.verts]
        span = max(max(c[i] for c in co) - min(c[i] for c in co) for i in range(3))
        (kept if span <= max_span else refused).append(fc)
    if refused:
        bmesh.ops.delete(bm, geom=refused, context='FACES_ONLY')
    if uv_layer is not None:
        for fc in kept:
            for l in fc.loops:
                if l.vert in rim_uv:
                    l[uv_layer].uv = rim_uv[l.vert]
    for fc in kept:
        fc.smooth = True
    bm.normal_update()
    bm.to_mesh(obj.data)
    obj.data.update()
    bm.free()
    return len(kept), len(set(id(fc) for fc in kept)), len(refused)


def inward_material(name, colour, roughness=.62):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = colour
    bs.inputs['Roughness'].default_value = roughness
    m.diffuse_color = colour
    return m


def opaque_material(name, colour, roughness=.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = colour
    bs.inputs['Roughness'].default_value = roughness
    m.diffuse_color = colour
    return m


# --------------------------------------------------------------- the procedural twin ----
def build_twin(auth, thickness, name, voxel, triangle_target, sample_albedo, blade_dilation=.005,
               thin=.030, band=.020, roughness=.68):
    """A procedural **volume resurfacing** of the authored body, not a decimation of its faces: no
    source vertex or face survives it. The blades are dilated along their normals before the field
    is sampled and held back from the relaxation afterwards, because a voxel field cannot hold a
    knife edge and two passes of unmasked smoothing simply eat a fin two voxels thick."""
    puppet = auth.copy()
    puppet.data = auth.data.copy()
    bpy.context.collection.objects.link(puppet)
    puppet.name = name
    bpy.context.view_layer.objects.active = puppet
    for v in puppet.data.vertices:
        n = Vector(v.normal[:])
        w = 1. - max(0., min(1., (float(thickness[v.index]) - thin) / band))
        v.co = Vector(v.co[:]) + n * (blade_dilation * smooth(w))
    puppet.data.remesh_voxel_size = voxel
    puppet.data.remesh_voxel_adaptivity = 0
    puppet.data.use_remesh_preserve_volume = True
    bpy.ops.object.voxel_remesh()
    remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)

    bvh_vox = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                   [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
    group = puppet.vertex_groups.new(name='Trunk relaxation mask')
    vox_thick = neighbourhood_minimum(puppet.data, shell_thickness(puppet.data, bvh_vox))
    masked = 0
    for v in puppet.data.vertices:
        w = smooth((float(vox_thick[v.index]) - thin) / band)
        group.add([v.index], w, 'REPLACE')
        if w < .5:
            masked += 1
    mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH')
    mod.factor = .45
    mod.iterations = 2
    group_name = group.name  # modifier_apply may invalidate the RNA group handle in Blender 5.2.0
    mod.vertex_group = group_name
    bpy.ops.object.modifier_apply(modifier=mod.name)
    puppet.vertex_groups.remove(puppet.vertex_groups[group_name])
    mod = puppet.modifiers.new('Twin topology budget', 'DECIMATE')
    mod.ratio = min(1., triangle_target / max(1, remesh_triangles))
    ratio = mod.ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)

    # Pigment through the nearest source triangle's own interpolated UV, never by averaging
    # unrelated atlas islands at a welded seam vertex.
    bvh_auth = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                    [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
    uv = auth.data.uv_layers.active
    if puppet.data.color_attributes.get('Color'):
        puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
    pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for v in puppet.data.vertices:
        hit = bvh_auth.find_nearest(v.co)
        poly = auth.data.polygons[hit[2]]
        p3 = [auth.data.vertices[j].co for j in poly.vertices[:3]]
        q3 = [Vector((*uv.data[j].uv, 0)) for j in poly.loop_indices[:3]]
        s = barycentric_transform(hit[0], p3[0], p3[1], p3[2], q3[0], q3[1], q3[2])
        pl.data[v.index].color = sample_albedo(s.x, s.y)
    pmat = bpy.data.materials.new(name + ' surface')
    pmat.use_nodes = True
    pbs = pmat.node_tree.nodes.get('Principled BSDF')
    pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor')
    pvc.layer_name = 'Color'
    pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
    pbs.inputs['Roughness'].default_value = roughness
    puppet.data.materials.clear()
    puppet.data.materials.append(pmat)
    for p in puppet.data.polygons:
        p.material_index = 0

    bvh_pup = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                   [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
    pup_thick = neighbourhood_minimum(puppet.data, shell_thickness(puppet.data, bvh_pup))
    # Voxel resurfacing cannot make a blade thinner than its own voxel, so the twin's fins are
    # measured against the twin's own floor rather than the authored body's.
    pup_thick = np.maximum(0., pup_thick - (voxel * 2 - .004))
    report = {'twinRemeshTriangles': remesh_triangles, 'twinDecimateRatio': ratio,
              'twinVerticesHeldBackFromRelaxation': masked, 'voxel': voxel,
              'bladeDilation': blade_dilation}
    return puppet, pup_thick, report, bvh_auth


# ------------------------------------------------------------------------- measurement ----
def merged_geometry(group):
    verts, polys = [], []
    for o in group:
        base = len(verts)
        verts.extend(v.co.copy() for v in o.data.vertices)
        polys.extend(tuple(base + j for j in q.vertices) for q in o.data.polygons)
    return verts, polys


def section_envelope(verts, polys, y):
    """The exact plane intersection of a group of meshes at station y (engine units, head at -Y
    before export). Edges are taken from the polygons so the two bodies are measured identically."""
    pts = []
    for poly in polys:
        for a, b in zip(poly, poly[1:] + poly[:1]):
            p, q = verts[a], verts[b]
            if (p.y - y) * (q.y - y) <= 0 and abs(p.y - q.y) > 1e-9:
                pts.append(p + (q - p) * ((y - p.y) / (q.y - p.y)))
    if not pts:
        return None
    arr = np.array([p[:] for p in pts])
    return {'min': arr.min(0).tolist(), 'max': arr.max(0).tolist()}


def paired_profile(auth_group, twin_group, y_lo, y_hi, tolerance, stations=21):
    av, ap = merged_geometry(auth_group)
    tv, tp = merged_geometry(twin_group)
    rows, worst = [], 0.
    for y in np.linspace(y_lo, y_hi, stations):
        row = {'stationY': float(y),
               'authored': section_envelope(av, ap, float(y)),
               'twin': section_envelope(tv, tp, float(y))}
        if row['authored'] and row['twin']:
            row['maximumEnvelopeDifference'] = max(
                abs(a - b) for k in ('min', 'max')
                for a, b in zip(row['authored'][k], row['twin'][k]))
            worst = max(worst, row['maximumEnvelopeDifference'])
            assert row['maximumEnvelopeDifference'] < tolerance, row
        rows.append(row)
    return rows, worst


# ---------------------------------------------------------------------------- export ----
EXPORT_KWARGS = dict(export_format='GLB', use_selection=True, export_animations=True,
                     export_animation_mode='ACTIONS', export_force_sampling=True,
                     export_frame_range=False, export_skins=True, export_normals=True,
                     export_texcoords=True, export_materials='EXPORT', export_vertex_color='NAME',
                     export_vertex_color_name='Color', export_yup=True, export_extras=True)


def patch_glb(path, anchors):
    """Reparent the anchor nodes onto their bones in the bone's own frame, and drop the channels
    no shipped body carries: root motion and scale."""
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    nodes = g['nodes']
    parents = {c: i for i, no in enumerate(nodes) for c in no.get('children', [])}

    def world(i):
        no = nodes[i]
        q = no.get('rotation', [0, 0, 0, 1])
        m = (Matrix(np.array(no['matrix']).reshape(4, 4).T.tolist()) if 'matrix' in no
             else Matrix.LocRotScale(Vector(no.get('translation', [0, 0, 0])),
                                     Quaternion((q[3], q[0], q[1], q[2])),
                                     Vector(no.get('scale', [1, 1, 1]))))
        return world(parents[i]) @ m if i in parents else m

    for a in anchors:
        i = next(k for k, no in enumerate(nodes) if no.get('name') == a['name'])
        b = next(k for k, no in enumerate(nodes) if no.get('name') == a['bone'])
        pt = a['point']
        pt = Vector((pt[0], pt[2], -pt[1]))
        local = world(b).inverted() @ pt
        if i in parents:
            nodes[parents[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local),
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'],
                                                  'parentBone': a['bone']}}}
    for a in g['animations']:
        a['channels'] = [c for c in a['channels']
                         if c['target']['path'] != 'scale'
                         and nodes[c['target']['node']].get('name') != 'root']
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


def make_sockets(rig, anchors):
    out = []
    for a in anchors:
        o = bpy.data.objects.new(a['name'], None)
        bpy.context.collection.objects.link(o)
        o.parent = rig
        o.parent_type = 'BONE'
        o.parent_bone = a['bone']
        o.matrix_world.translation = Vector(a['point'])
        o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}
        out.append(o)
    return out


# --------------------------------------------------------- skinning by arc length ----
def polyline(pts):
    """A polyline and its cumulative arc length. Skinning is parameterised by arc length along a
    measured polyline rather than by a body axis, so a curved tail keeps square weight bands and a
    limb's bands stay square to the limb."""
    P = [Vector(p) for p in pts]
    cum = [0.]
    for i in range(1, len(P)):
        cum.append(cum[-1] + (P[i] - P[i - 1]).length)
    return P, cum


def project(P, cum, q):
    """Nearest distance from q to the polyline, and the arc length at that point."""
    best = (1e9, 0.)
    for i in range(len(P) - 1):
        a = P[i]
        d = P[i + 1] - a
        L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a).dot(d) / L2))
        c = a + d * t
        dist = (q - c).length
        if dist < best[0]:
            best = (dist, cum[i] + t * d.length)
    return best


def station_weights(stations, s):
    """Blend between the two named stations bracketing arc length s."""
    if s <= stations[0][1]:
        return {stations[0][0]: 1.}
    if s >= stations[-1][1]:
        return {stations[-1][0]: 1.}
    for i in range(len(stations) - 1):
        a, b = stations[i], stations[i + 1]
        if a[1] <= s <= b[1]:
            t = (s - a[1]) / (b[1] - a[1])
            return {a[0]: 1 - t, b[0]: t}
    return {stations[-1][0]: 1.}


def limb_chain(names, cum, s, blend=.022):
    """Which bone of a limb chain owns arc length s, blended over `blend` either side of a joint."""
    out = {}
    edges = [smooth((s - (cum[i] - blend)) / (2 * blend)) for i in range(1, len(names))]
    remaining = 1.
    for i, n in enumerate(names):
        take = remaining * (edges[i] if i < len(edges) else 0.)
        out[n] = remaining - take
        remaining = take
    return out


def relax_weights(o, per_vertex, passes=3, keep=4, hold=.45):
    """Smooth the skin weights over the mesh's own edge graph, then trim back to four influences.

    **This is what stops a fin tearing.** Every gate a builder writes -- a thickness threshold that
    separates a blade from a flank, a radius round a limb's polyline, a height off the axis -- is a
    decision taken per vertex, and two vertices a hundredth of a body apart can fall on opposite
    sides of one. Cymbospondylus' first build had vertices out on the right forefin weighted 1.00 to
    `fore_tip_R` sitting against neighbours weighted 0.95 to `chest`, because the neighbour measured
    a hundredth thicker than the blade threshold; `tools/triassic/skin-tears.mjs` read that as an
    edge going from 0.018 to 0.409, a 23x stretch, and at gameplay scale it is a spike of skin
    pulled off the flipper. No amount of tuning the gate fixes the class of fault -- a gate always
    has an edge -- but a diffusion over the surface does, because a weight field that is smooth on
    the mesh cannot tear it.

    `hold` is how much of its own weight a vertex keeps each pass; the rest is the neighbourhood
    mean. Three passes at 0.45 spread an influence about two rings, which is enough to turn any
    step into a ramp and not enough to pull a limb's weights out onto the trunk.

    The neighbourhood is weighted by **1/length**, and that is the half that matters on a Tripo
    surface. A generation is not a clean quad grid: it carries sliver triangles whose shortest edge
    is a tenth of the median, and linear-blend skinning turns a weight *difference* into a distance
    whatever the edge under it is. Cartorhynchus had two vertices 0.0011 apart -- a thirteenth of
    its own median edge -- differing by 0.076 on `hind_mid_L`, and on a rowing forelimb that is
    0.045 units of separation, a 40x stretch and a visible pinhole in the paddle. A plain mean
    could not close it: both vertices sit in rings far enough apart that six more passes moved the
    figure by nothing. Coupling by inverse length makes a sliver edge the dominant term for both of
    its ends, so the pair converges in a pass or two while a normal edge diffuses exactly as before.
    """
    adj = [[] for _ in range(len(o.data.vertices))]
    co = [v.co for v in o.data.vertices]
    for e in o.data.edges:
        a, b = e.vertices
        c = 1. / max((co[a] - co[b]).length, 1e-6)
        adj[a].append((b, c))
        adj[b].append((a, c))
    def trim(w):
        items = sorted(((n, v) for n, v in w.items() if v > 1e-6), key=lambda kv: -kv[1])[:keep]
        total = sum(v for _, v in items) or 1.
        return {n: v / total for n, v in items}

    cur = [dict(w) for w in per_vertex]
    for _ in range(passes):
        nxt = []
        for i, w in enumerate(cur):
            acc = {n: v * hold for n, v in w.items()}
            nb = adj[i]
            if nb:
                total = sum(c for _, c in nb)
                for j, c in nb:
                    share = (1. - hold) * c / total
                    for n, v in cur[j].items():
                        acc[n] = acc.get(n, 0.) + v * share
            # **Trim to four inside the loop, not only at the end.** Diffusion grows a long tail of
            # tiny influences -- after thirty passes a vertex on a paddle carried eight bones at a
            # thousandth each -- and a top-four cut taken once at the end then picks a *different*
            # four on neighbouring vertices, which is a worse discontinuity than the gate it was
            # sent to fix. Cartorhynchus' paddles came apart into radiating spikes at the extreme
            # of the stroke from exactly this, on both the authored body and its twin, while the
            # tear sweep read 6x and passed it. Trimming every pass keeps the field a four-influence
            # field the whole way, so the neighbours a vertex is averaging with carry the bones it
            # carries.
            nxt.append(trim(acc))
        cur = nxt
    # Diffusion narrows a sliver pair; it does not close one, and a pair that survives is still a
    # pinhole. So the last step is exact: any run of vertices joined by edges shorter than a quarter
    # of the median is one *cluster* and is given one weight set, the cluster mean. Two vertices
    # that close together are the same point on the animal as far as the skin is concerned -- the
    # generation drew them apart by a rounding error, not by anatomy -- and giving them one answer
    # makes the stretch between them exactly zero however hard the bone under them swings.
    lengths = sorted((co[e.vertices[0]] - co[e.vertices[1]]).length for e in o.data.edges)
    weld = (lengths[len(lengths) // 2] if lengths else 0.) * .25
    parent = list(range(len(cur)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for e in o.data.edges:
        a, b = e.vertices
        if (co[a] - co[b]).length < weld:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb
    clusters = {}
    for i in range(len(cur)):
        clusters.setdefault(find(i), []).append(i)
    for members in clusters.values():
        if len(members) < 2:
            continue
        acc = {}
        for i in members:
            for n, v in cur[i].items():
                acc[n] = acc.get(n, 0.) + v / len(members)
        for i in members:
            cur[i] = dict(acc)
    out = [trim(w) for w in cur]
    return out


def jaw_junction(body, shell, body_weights, hinge, rear, upper_jaw, axis, down=(0., 0., -1.),
                 band=.015, back=.06, dz=None, reach_margin=.5, throat=1.):
    """Skin the mandible shell *into* the head it was cut from, so the jaw's swing is a blend and
    not a slot.

    **A rigid shell against a skull-weighted throat opens a gap the size of the gape.** Every jawed
    Triassic body cuts its mandible off the head as a separate object, and every one of them then
    weighted that shell to `jaw` at 1 and the body it came from to whatever `weights()` said -- the
    skull, or the skull with a throat share. The two share a rim: the cut duplicates each vertex
    along it, one copy on each part. When the jaw swings, the shell's copy of a rim point turns
    about the hinge by its depth below the hinge times the gape and the body's copy stays where it
    was, and the junction opens by exactly that -- 6 % of a body on Hybodus at `Heavy`, 3.5 % on
    Saurichthys, 2.2 % on Nothosaurus, a slot under the corner of the mouth on all of them
    (`tools/triassic/lag.mjs` measures it, because no edge crosses the seam and `skin-tears.mjs`
    cannot). The hinge tissue plug used to hide it and is hidden in play.

    The repair is **one weight field over both parts**, evaluated on position, so the two copies
    of a rim point cannot disagree. Its jaw share is:

    - on the body, ``throat`` below the hinge line and falling off with distance from the cut
      rim (``back``, along the body and round it) and with transverse distance from the hinge past
      the rim's own reach (``reach_margin`` of it) -- the throat follows the jaw, bounded radially
      about the hinge as well as along the body -- and zero on the upper jaw;
    - on the shell, the greater of that and a ramp from the cut rim to full jaw over ``band``: the
      mandible is rigid on its bone from ``band`` forward of the cut and full at the mouth line,
      and blends to the body's own field at the rim, where both copies take the same value.

    The remainder of every vertex is the body's relaxed field at the nearest body vertex, which at
    a rim vertex is its own twin. ``below`` ramps from the hinge's height to ``dz`` under it (a
    third of the rim's depth unless given), so the cheek behind the corner of the mouth stays with
    the skull and the throat under the hinge goes with the jaw, which is what a throat does.

    **``band`` is short on purpose.** The mandible is bone and has to read as bone: at 0.05 of a
    body Mixosaurus' jaw bowed, its dorsal-rear corner held by the skull while its chin dropped,
    and a mouth that opens by bending its lower jaw is worse than one with a slot behind it. The
    shell only needs to agree with the body *at the rim*, and the rim's own motion is small where
    the two fields differ -- the upper part of the cut, within ``dz`` of the hinge's height, where a
    point turns about the hinge on a short radius -- so a band of 0.015 confines the shear to a
    strip that barely moves and leaves the rest of the mandible rigid. The throat under the hinge
    is the part that stretches, and it stretches on the body's side, over ``back``.

    The rim is found, not assumed: every shell vertex coincident with a body vertex is a shared
    point, and ``rear`` says which of those are the junction -- the cut at the hinge. The others
    are the mouth line and, where a builder cuts the mandible's front off an overhanging snout,
    the front cut, and both part by design: Mixosaurus' mandible tip was glued to the snout's
    own tip at 7.6x the moment the front cut was taken for the junction, because a rim is a rim to
    a coincidence test. Taking the rear as a predicate is also what lets a cut whose rear edge runs
    along the generation's own edges rather than a plane (Hybodus' labelled mandible) take the
    same repair as a plane cut.

    Both objects must still be in raw coordinates. Returns (body field, shell field, report), each
    field a list of {bone: weight} dicts trimmed to four influences.
    """
    import re
    from mathutils.kdtree import KDTree
    LIMB = re.compile(r'fore|hind|pec|pelvic|paddle|foot|hand|fin_|flipper', re.I)
    H = Vector(hinge)
    axis = Vector(axis).normalized()
    down = Vector(down).normalized()
    bco = [v.co.copy() for v in body.data.vertices]
    sco = [v.co.copy() for v in shell.data.vertices]
    kd = KDTree(len(bco))
    for i, c in enumerate(bco):
        kd.insert(c, i)
    kd.balance()
    twin = [kd.find(c) for c in sco]                     # (co, index, dist) of the nearest body vertex
    rim = [i for i, (_, _, d) in enumerate(twin) if d < 1e-6 and rear(sco[i])]
    lip = sum(1 for i, (_, _, d) in enumerate(twin) if d < 1e-6 and not rear(sco[i]))
    assert len(rim) >= 3, ('the mandible shares no cut rim with the body', len(rim), lip)
    rk = KDTree(len(rim))
    for k, i in enumerate(rim):
        rk.insert(sco[i], k)
    rk.balance()

    def transverse(p):
        d = Vector(p) - H
        return (d - axis * d.dot(axis)).length
    rim_reach = max(transverse(sco[i]) for i in rim)
    rim_depth = max((Vector(sco[i]) - H).dot(down) for i in rim)
    if dz is None:
        dz = max(rim_depth / 3., 1e-4)
    margin = max(rim_reach * reach_margin, 1e-4)

    def base(p):
        p = Vector(p)
        b = smooth((p - H).dot(down) / dz)
        d_rim = rk.find(p)[2]
        along = 1. - smooth(d_rim / back)
        radial = 1. - smooth((transverse(p) - rim_reach) / margin)
        return throat * b * along * radial

    def trim(w):
        items = sorted(((n, v) for n, v in w.items() if v > 1e-6), key=lambda kv: -kv[1])[:4]
        total = sum(v for _, v in items) or 1.
        return {n: v / total for n, v in items}

    def mix(w, j):
        out = {n: v * (1. - j) for n, v in w.items()}
        out['jaw'] = out.get('jaw', 0.) + j
        return trim(out)

    # **A limb is never throat.** Aphaneramma's and Mystriosuchus' generations stand with the right
    # forelimb tucked under the snout, inside `back` of the rim and below the hinge, and the field
    # handed half of that arm to the jaw: a 4.6x tear on the body at Ability, between a vertex the
    # jaw now carried and its neighbour the forelimb still did. So the throat's share of a vertex
    # is scaled by whatever of it is *not* a limb's, read off the body's own field -- the same
    # answer the builders' own throat terms give (`throat_jaw_share(q) * (1 - alpha)`).
    def axial(w):
        return 1. - sum(v for n, v in w.items() if LIMB.search(n))

    body_out, body_throat = [], 0
    for i, c in enumerate(bco):
        j = 0. if upper_jaw(c) else base(c) * axial(body_weights[i])
        if j > .05:
            body_throat += 1
        body_out.append(mix(body_weights[i], j) if j > 0 else trim(body_weights[i]))
    shell_out, full = [], 0
    for i, c in enumerate(sco):
        w = body_weights[twin[i][1]]
        j = max(0. if upper_jaw(c) else base(c) * axial(w), smooth(rk.find(c)[2] / band))
        if j > .99:
            full += 1
        shell_out.append(mix(w, j))
    # The two copies of every rim point must be the same weights, to the last influence: this is
    # the property the whole thing exists for, and it is asserted rather than trusted.
    for i in rim:
        a, b = shell_out[i], body_out[twin[i][1]]
        assert a.keys() == b.keys() and all(abs(a[n] - b[n]) < 1e-9 for n in a), (i, a, b)
    report = {'cutRimPairs': len(rim), 'lipPairs': lip, 'rimReach': float(rim_reach), 'rimDepth': float(rim_depth),
              'dz': float(dz), 'band': band, 'back': back, 'throat': throat,
              'shellVertices': len(sco), 'shellFullJaw': full, 'bodyThroatVertices': body_throat}
    return body_out, shell_out, report


def depth_probe(o):
    """How far inside the closed intake surface a point is: positive inside, negative outside.
    Every appendage root and the jaw hinge has to clear a margin, or a fin reads as floating
    beside the flank rather than growing out of it."""
    bvh = BVHTree.FromPolygons([v.co for v in o.data.vertices],
                               [p.vertices[:] for p in o.data.polygons], all_triangles=False)

    def depth(p):
        loc, nor, _idx, dist = bvh.find_nearest(Vector(p))
        return dist * (-1 if (Vector(p) - loc).dot(nor) > 0 else 1)
    return depth, bvh


def seat(p, centre, depth, margin=.018, steps=40):
    """Pull a measured root radially in towards the body's own centreline until it is `margin`
    inside the skin. Cheirolepis' builder is the pattern and every builder in this repository is
    required to check it."""
    p = Vector(p)
    c = Vector(centre)
    for i in range(steps + 1):
        q = c + (p - c) * (1. - i / steps)
        if depth(q) >= margin:
            return q
    return c


def thin_clusters(o, thin_mask, centre_x, centre_z, min_size=120):
    """Connected patches of blade-thin surface, each with its seat (the point nearest the trunk's
    own centreline) and its reach (the point furthest from it). This is how a builder finds the
    paired paddles, the median fins and the caudal without anyone typing a station: a Tripo
    generation poses its limbs, and on three of these four bodies the left and right of a pair sit
    at different stations and hang at different angles."""
    co = np.array([v.co[:] for v in o.data.vertices])
    adj = [[] for _ in range(len(co))]
    for e in o.data.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    seen, groups = set(), []
    for i in np.nonzero(thin_mask)[0]:
        i = int(i)
        if i in seen:
            continue
        stack, part = [i], []
        seen.add(i)
        while stack:
            q = stack.pop()
            part.append(q)
            for j in adj[q]:
                if thin_mask[j] and j not in seen:
                    seen.add(int(j))
                    stack.append(int(j))
        if len(part) >= min_size:
            groups.append(part)
    out = []
    for g in sorted(groups, key=len, reverse=True):
        q = co[g]
        cx = np.array([centre_x(float(y)) for y in q[:, 1]])
        cz = np.array([centre_z(float(y)) for y in q[:, 1]])
        r = np.hypot(q[:, 0] - cx, q[:, 2] - cz)
        seat_i, tip_i = int(np.argmin(r)), int(np.argmax(r))
        out.append({'indices': g, 'count': len(g),
                    'yRange': [float(q[:, 1].min()), float(q[:, 1].max())],
                    'xRange': [float(q[:, 0].min()), float(q[:, 0].max())],
                    'zRange': [float(q[:, 2].min()), float(q[:, 2].max())],
                    'centroid': [float(v) for v in q.mean(0)],
                    'seat': [float(v) for v in q[seat_i]], 'seatRadius': float(r[seat_i]),
                    'reach': [float(v) for v in q[tip_i]], 'reachRadius': float(r[tip_i])})
    return out


def pigment_sampler(o, sample_albedo):
    """Snapshot the intake surface and its UVs, and return `pigment(p)`: the source albedo at the
    point of the generation nearest p.

    Anything a builder authors has to **wear the creature's own texture** rather than a flat
    material -- a smooth untextured island in a pored hide reads as built by hand from across the
    room. The snapshot is taken before any cut, so the sampler keeps working after the mandible has
    been split off and the mesh has been scaled into engine units."""
    pos = [v.co.copy() for v in o.data.vertices]
    polys = [tuple(p.vertices[:3]) for p in o.data.polygons]
    uvl = o.data.uv_layers.active
    uvs = [tuple(Vector((*uvl.data[li].uv, 0)) for li in p.loop_indices[:3]) for p in o.data.polygons]
    bvh = BVHTree.FromPolygons(pos, [list(p) for p in polys], all_triangles=True)

    def pigment(p):
        loc, _nor, idx, _dist = bvh.find_nearest(Vector(p))
        if loc is None:
            return (1., 1., 1., 1.)
        a, b, c = (pos[i] for i in polys[idx])
        ua, ub, uc = uvs[idx]
        s = barycentric_transform(loc, a, b, c, ua, ub, uc)
        return sample_albedo(s.x, s.y)
    return pigment


def vertex_colour_material(name, roughness=.66, backface_cull=False):
    """A material that reads the mesh's own `Color` attribute, which is how an authored patch
    carries the source pigment sampled onto its vertices."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = backface_cull
    bs = m.node_tree.nodes.get('Principled BSDF')
    vc = m.node_tree.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    m.node_tree.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = 0
    return m


def paint_from_source(o, pigment, scale):
    """Give an authored part a `Color` attribute sampled off the generation's own albedo. `scale`
    converts the part's coordinates back into the raw frame the sampler was built in."""
    if o.data.color_attributes.get('Color'):
        o.data.color_attributes.remove(o.data.color_attributes['Color'])
    layer = o.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for v in o.data.vertices:
        layer.data[v.index].color = pigment(Vector(v.co[:]) / scale)


# ------------------------------------------------------ how posed is the generation? ----
def curvature_over_section(points, section_radius):
    """How far a run of the body's own axis is from straight, in units of its own thickness.

    A follow-up pass re-bases every clip on a `Neutral` pose -- straight spine, mirrored limbs,
    jaw shut -- and this ratio is what decides whether a body's curve can be straightened by the
    rig or has to be unbent in the mesh before binding. Dinocephalosaurus is the calibration: its
    tail comes out around 9 and straightened on the rig, its neck at 2.8 mean and 1.51 tightest
    and had to be carried section by section onto a new axis first.

    The curvature radius at each interior station is the circumradius of it and its neighbours;
    the section radius is the body's own half-thickness there. A straight run reports infinity,
    which is dropped from the mean rather than counted as a very large number.
    """
    ratios = []
    for i in range(1, len(points) - 1):
        a, b, c = Vector(points[i - 1]), Vector(points[i]), Vector(points[i + 1])
        ab, bc, ca = (b - a).length, (c - b).length, (a - c).length
        area = ((b - a).cross(c - a)).length / 2
        R = (ab * bc * ca) / (4 * area) if area > 1e-12 else float('inf')
        ratios.append(R / max(float(section_radius(b.y)), 1e-6))
    finite = [x for x in ratios if math.isfinite(x)]
    return {'stations': len(ratios),
            'straightStations': len(ratios) - len(finite),
            'meanCurvatureRadiusOverSection': (float(np.mean(finite)) if finite else None),
            'tightestCurvatureRadiusOverSection': (float(min(finite)) if finite else None),
            'perStation': [(round(float(x), 3) if math.isfinite(x) else None) for x in ratios]}


def limb_asymmetry(limb_points, centre_x, body_length=1.):
    """How far a paired limb is from being its partner mirrored, joint by joint, over body length.

    A Tripo generation poses its limbs, and on three of these four bodies the left and right of a
    pair sit at different stations and hang at different angles. The rig is built to each limb's
    own measured axis so they deform correctly; they simply do not match each other at rest, and
    this is the number that says by how much."""
    pairs = {}
    for key, pts in limb_points.items():
        pairs.setdefault(key[:-1], {})[key[-1]] = [Vector(p) for p in pts]
    out = {}
    for base, sides in pairs.items():
        if set(sides) != {'L', 'R'}:
            continue
        L, R = sides['L'], sides['R']
        n = min(len(L), len(R))
        d = []
        for i in range(n):
            mirrored = Vector((2 * float(centre_x(R[i].y)) - R[i].x, R[i].y, R[i].z))
            d.append((L[i] - mirrored).length)
        out[base] = {'joints': n,
                     'meanMirrorDistance': float(np.mean(d)),
                     'meanMirrorDistanceOverBodyLength': float(np.mean(d)) / body_length,
                     'maxMirrorDistanceOverBodyLength': float(max(d)) / body_length,
                     'perJoint': [round(float(x), 4) for x in d]}
    if out:
        out['allPairs'] = {
            'meanMirrorDistanceOverBodyLength':
                float(np.mean([v['meanMirrorDistanceOverBodyLength'] for v in out.values()])),
            'maxMirrorDistanceOverBodyLength':
                float(max(v['maxMirrorDistanceOverBodyLength'] for v in out.values()))}
    return out
