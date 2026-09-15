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


def lining(name, rig, tx, seam, section, y_back, y_front, jaw_blend, material,
           rings=24, ring=14, centre_x=None, power=2., fit=None):
    """One **skinned** lining on the mouth's own measured section, wound inwards.

    Both worked examples shipped two separate closed tubes -- a palate rigid on the skull and a
    floor rigid on the jaw -- and they part the moment the jaw swings, leaving a wedge at the back
    of the mouth. The source material culls its backfaces, which is right for a closed shell and
    wrong for one cut in half, so what showed through that wedge was the far side of the head. Here
    the roof follows the skull, the floor follows the jaw and the wall between them stretches, so
    no opening the clips reach can part it.

    `power` is the section's superellipse exponent, 2 for a plain ellipse. **A mouth's section is
    not an ellipse**, and on a deep head the difference is a hole: an ellipse narrows towards its
    poles, so at the height the mandible's rim reaches at full gape the lining is a fraction of the
    width the mouth is, and the gape shows background down both sides of the jaw. Rhaeticosaurus
    needed one -- an ellipse narrows towards its floor -- and the bodies built before this option
    existed keep the ellipse they were measured with.

    `fit`, where a builder supplies it, corrects each ring vertex **on its own**: given the point
    and its station it returns the point pulled back inside the skin. Shrinking a whole ring by one
    factor instead couples its two axes, and on a deep head that is a hole -- a floor set deep
    enough to sit inside the mandible rather than stipple against it took Rhaeticosaurus' *width*
    down to 0.68 of the mouth's own, the far wall then stopped short of the mandible's rim, and the
    gape showed background down the jaw line. A per-vertex fit gives the mouth's own section rather
    than the largest ellipse that fits inside it.
    """
    raw, verts, faces = [], [], []
    # The lining rides the body's **measured** centreline, not the file's x = 0. Three of these
    # four generations are posed, and on the narrowest of them the axis is further off the file's
    # midline than the rostrum is wide -- a lining built on zero came out entirely outside the
    # snout it was meant to be inside.
    cxf = centre_x or (lambda _y: 0.)
    for i in range(rings):
        y = y_back + (y_front - y_back) * (i / (rings - 1))
        w, h = section(y)
        for j in range(ring):
            th = j * TAU / ring
            c, sn = math.cos(th), math.sin(th)
            if power != 2.:
                e = 2. / power
                c = math.copysign(abs(c) ** e, c)
                sn = math.copysign(abs(sn) ** e, sn)
            p = Vector((cxf(y) + w * c, y, seam(y) + h * sn))
            if fit is not None:
                p = fit(p, y)
            raw.append(p)
            verts.append(tx(p))
    for i in range(rings - 1):
        for j in range(ring):
            a = i * ring + j
            b = i * ring + (j + 1) % ring
            faces.append((a, b, b + ring, a + ring))
    faces.append(tuple(reversed(range(ring))))
    faces.append(tuple(range((rings - 1) * ring, rings * ring)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = (0, 0, 0)
    o.data.materials.append(material)
    for n in ('skull', 'jaw'):
        o.vertex_groups.new(name=n)
    for idx, p in enumerate(raw):
        g = jaw_blend(p)
        o.vertex_groups['jaw'].add([idx], g, 'REPLACE')
        o.vertex_groups['skull'].add([idx], 1 - g, 'REPLACE')
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Oral membrane', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    return o, raw


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
    mod.vertex_group = group.name
    bpy.ops.object.modifier_apply(modifier=mod.name)
    puppet.vertex_groups.remove(puppet.vertex_groups[group.name])
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
