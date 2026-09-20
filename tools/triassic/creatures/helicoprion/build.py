"""Rebuild Helicoprion: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. Geometry coordinates are raw Tripo units (body length 1.0, head at -Y, up +Z)
until `tx()` applies the final 5x engine transform; `export_yup` then puts the head at glTF +Z.

The animal is an obligate-swimming eugeneodont, so nothing here rows, walks or surfaces: the
performance is body-caudal undulation with the paired fins as control surfaces, and the one
species-defining feature the canonical pose is greenlit on -- the single tooth whorl seated in
the lower-jaw symphysis -- rides the `jaw` bone.

Writes only this species' asset family. Touches no shared registry and performs no git operations.
"""
import bpy, bmesh, math, json, os, struct, hashlib, shutil, sys, heapq
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402
LOCAL = os.path.join(ROOT, 'local/triassic-authoring/helicoprion')
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/helicoprion.raw.glb')
ID = 'helicoprion'
SCALE = 5                     # raw 1.0 body -> 5.00 engine authoring units
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = 0.04 * BODY_LENGTH   # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = 0.02 * BODY_LENGTH     # 2 % of body length

CLIPS = {'Idle': 2.4, 'Swim': 1.6, 'Sprint': 1.0, 'TurnLeft': 1.6, 'TurnRight': 1.6,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.1, 'Hit': .6,
         'Death': 1.6, 'Guard': 1.0, 'Parry': .4, 'Dodge': .5, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 1.0, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab']
PUPPET_TRIANGLE_TARGET = 7100   # under 40 % of the authored body, which is what an LOD is allowed
BLADE_DILATION = .005           # how far the thin fin blades are pushed out before voxelisation

# ---------------------------------------------------------------- intake ----
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW)
auth = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
auth.name = 'Helicoprion authored body'
bpy.context.view_layer.objects.active = auth

# Weld the texture-seam split vertices for topology analysis, retaining the loop UVs, then drop
# any tiny detached flake. This body has none: it welds to a single closed component.
bm = bmesh.new()
bm.from_mesh(auth.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bm.verts.ensure_lookup_table()
seen, components = set(), []
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
    components.append(part)
component_sizes = sorted((len(c) for c in components), reverse=True)
removed = sum(len(c) for c in components if len(c) < 8)
for c in components:
    if len(c) < 8:
        bmesh.ops.delete(bm, geom=c, context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(auth.data)
bm.free()
source_triangles = sum(len(p.vertices) - 2 for p in auth.data.polygons)

# ------------------------------------------------------------- material ----
# Same correction the era's first two bodies established: keep the full original 2K albedo and
# its UVs, make COLOR_0 white so runtime recolouring does not multiply the texture by a baked
# copy of its own pigment, cut the generated normal map back to restrained microrelief, and set
# skin roughness/metallic explicitly after disconnecting the linked ORM inputs.
mat = auth.data.materials[0]
mat.name = 'Helicoprion body pigmentation'
bs = mat.node_tree.nodes.get('Principled BSDF')
colnode = next(n for n in mat.node_tree.nodes
               if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'sRGB')
im = colnode.image
pixels = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
uv = auth.data.uv_layers.active
layer = auth.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item in layer.data:
    item.color = (1, 1, 1, 1)
for link in list(mat.node_tree.links):
    if link.to_node == bs and link.to_socket.name in ['Metallic', 'Roughness']:
        mat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value = 0
bs.inputs['Roughness'].default_value = .62      # wet cartilaginous skin, a shade glossier than a nothosaur's
for n in mat.node_tree.nodes:
    if n.type == 'NORMAL_MAP':
        n.inputs['Strength'].default_value = .15
albedo_sha = hashlib.sha256(bytes(im.packed_file.data)).hexdigest() if im.packed_file else None


def sample_albedo(u, v):
    """Bilinear lookup in the encoded sRGB byte image, converted to linear exactly once."""
    h, w = pixels.shape[:2]
    x = (float(u) % 1) * w - .5
    y = (float(v) % 1) * h - .5
    x0, y0 = math.floor(x), math.floor(y)
    fx, fy = x - x0, y - y0
    rgb = (pixels[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy)
           + pixels[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
           + pixels[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy
           + pixels[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    return (*[float(c) for c in linear], 1.)


# ------------------------------------------------------------ the whorl ----
# The whorl is the generation's own, kept and filled rather than re-modelled. A first delivery
# shipped it as it arrived; a second replaced it with an authored logarithmic coil, which a
# reviewer rejected on sight for being a machined part in an organic mouth. So the generated
# whorl is back, and what is done to it here is only what "fill it in" can mean without
# inventing shape: the walls of its own narrow gaps are pushed together until the gap shuts.
# No vertex is added, no face is added, no UV moves, and the crowns are not touched — a gap has
# to be narrower than SLOT to be closed at all, and the notches between crowns are wider.
#
# How much there was to fill is measured rather than asserted, and the answer is: very little.
# `whorl-audit.py` reports the largest radial gap along each of 72 rays out from a fitted centre,
# and on the delivered body 43 of 65 rays crossed a gap wider than 1 % of the body. That number
# is mostly a statement about *vertex density*: the whorl is described by 382 vertices, so the
# rays are measuring the spaces between them. Sampling the same faces over their area instead
# takes the mean gap from 0.0154 to 0.0079 and the rays over 1 % from 43 of 65 to 16 of 72, and
# restricted to the symphyseal coil the three worst of those nine sit in one 15-degree sector at
# the coil's lower rear, where the coil ends and the mouth begins. The surface is solid. What
# reads as holes in a render is the albedo: Tripo painted dark ragged blotches over the coil,
# and the same geometry under a flat material reads as a clean spiral saw. See the README.
WHORL_SLOT = .0035          # a gap this narrow between two whorl surfaces is a hole to be shut
WHORL_HALF_WIDTH = .032     # the symphysis: the coil is a median structure
WHORL_BAND = (-.460, -.352)
DOWNV, UPV = Vector((0, 0, -1)), Vector((0, 0, 1))


def _adjacency(mesh):
    n = len(mesh.vertices)
    ev = np.array([e.vertices[:] for e in mesh.edges], dtype=np.int64)
    counts = np.zeros(n, dtype=np.int64)
    np.add.at(counts, ev[:, 0], 1)
    np.add.at(counts, ev[:, 1], 1)
    ptr = np.zeros(n + 1, dtype=np.int64)
    ptr[1:] = np.cumsum(counts)
    idx = np.zeros(int(ptr[-1]), dtype=np.int64)
    fill = ptr[:-1].copy()
    for a, b in ev:
        idx[fill[a]] = b; fill[a] += 1
        idx[fill[b]] = a; fill[b] += 1
    return ptr, idx


def _whorl_surface(mesh, face_in, seed=11):
    """Points spread over the area of the whorl's own faces. The audit's radial-gap measure asked
    of the vertices is mostly a measure of how few of them there are; asked of the surface it is
    a measure of holes, which is what it was meant to be."""
    rng = np.random.default_rng(seed)
    P = np.array([v.co[:] for v in mesh.vertices])
    out = []
    for p in mesh.polygons:
        if not face_in[p.index]:
            continue
        tri = P[list(p.vertices[:3])]
        n = int(min(400, max(6, np.linalg.norm(np.cross(tri[1] - tri[0], tri[2] - tri[0])) / 3e-7)))
        u = rng.random((n, 2))
        flip = u.sum(1) > 1
        u[flip] = 1 - u[flip]
        out.append(tri[0] + u[:, :1] * (tri[1] - tri[0]) + u[:, 1:] * (tri[2] - tri[0]))
    return np.vstack(out) if out else np.zeros((0, 3))


def _radial_gaps(V, cy, cz, nb=72):
    d = V[:, 1:3] - np.array([cy, cz])
    th, r = np.arctan2(d[:, 1], d[:, 0]), np.hypot(d[:, 0], d[:, 1])
    bins = ((th + math.pi) / (2 * math.pi) * nb).astype(int) % nb
    g = []
    for b in range(nb):
        rs = np.sort(r[bins == b])
        if len(rs) >= 2:
            g.append(float(max(rs[0], float(np.diff(rs).max()))))
    return {'rays': len(g), 'max': max(g), 'mean': float(np.mean(g)),
            'raysOverOnePercentOfBodyLength': int(sum(1 for v in g if v > .01))}


def fill_whorl(mesh):
    """Shut the whorl's own narrow gaps by moving its own surface. Positions only."""
    P = np.array([v.co[:] for v in mesh.vertices])
    N = np.array([v.normal[:] for v in mesh.vertices])
    bvh = BVHTree.FromPolygons([v.co for v in mesh.vertices],
                               [p.vertices[:] for p in mesh.polygons], all_triangles=False)
    # The coil is the material in the symphysis that stands clear of the mandible: a vertex with
    # mesh above it *and* mesh below it is inside the mouth, which is the same test the audit
    # settled the whorl's placement with.
    band = ((np.abs(P[:, 0]) < WHORL_HALF_WIDTH) & (P[:, 1] > WHORL_BAND[0])
            & (P[:, 1] < WHORL_BAND[1]))
    inside = np.zeros(len(P), dtype=bool)
    for i in np.nonzero(band)[0]:
        s = Vector(P[i])
        if (bvh.ray_cast(s + UPV * 3e-4, UPV, .6)[0] is not None
                and bvh.ray_cast(s + DOWNV * 3e-4, DOWNV, .6)[0] is not None):
            inside[i] = True
    S = P[inside]
    cy, cz = float(np.median(S[:, 1])), float(np.median(S[:, 2]))
    R = float(np.percentile(np.hypot(S[:, 1] - cy, S[:, 2] - cz), 97)) * 1.08
    region = band & (np.hypot(P[:, 1] - cy, P[:, 2] - cz) < R)
    face_in = np.array([all(region[v] for v in p.vertices) for p in mesh.polygons])
    # A vertex looking straight at another piece of the coil, close enough to be a slot rather
    # than a valley, and at a wall that faces back at it: the two walls each come half way.
    push = np.zeros(len(P))
    walls = 0
    for i in np.nonzero(region)[0]:
        h = bvh.ray_cast(Vector(P[i]) + Vector(N[i]) * 2e-4, Vector(N[i]), WHORL_SLOT)
        if h[0] is None or not face_in[h[2]] or Vector(h[1]).dot(Vector(N[i])) > -.35:
            continue
        push[i] = h[3] * .5
        walls += 1
    ptr, idx = _adjacency(mesh)
    for _ in range(2):      # feather, so a closed slot does not leave a step at its own rim
        push = np.where(region, np.maximum(push, np.maximum.reduceat(push[idx], ptr[:-1]) * .6),
                        push)
    before = _radial_gaps(_whorl_surface(mesh, face_in), cy, cz)
    for v in mesh.vertices:
        v.co = Vector(P[v.index] + N[v.index] * push[v.index])
    mesh.update()
    after = _radial_gaps(_whorl_surface(mesh, face_in), cy, cz)
    vertex_gaps = _radial_gaps(P[region], cy, cz)
    return {'insideTheMouth': int(inside.sum()), 'coilCentreYZ': [cy, cz], 'coilRadius': R,
            'regionVertices': int(region.sum()), 'regionFaces': int(face_in.sum()),
            'slot': WHORL_SLOT, 'narrowGapWalls': walls,
            'verticesMoved': int((push > 0).sum()), 'maximumMovement': float(push.max()),
            'radialGapsOverTheVerticesAsDelivered': vertex_gaps,
            'radialGapsOverTheSurfaceBefore': before,
            'radialGapsOverTheSurfaceAfter': after}


whorl_report = fill_whorl(auth.data)
print('HELICOPRION_WHORL', json.dumps(whorl_report))

# --------------------------------------------------- measured trunk shape ----
raw_co = np.array([v.co[:] for v in auth.data.vertices])
raw_no = np.array([v.normal[:] for v in auth.data.vertices])

# The centreline is measured rather than guessed: at each station take the flank band (the
# vertices at roughly half width, where no median fin and no paired fin ever reaches) and use
# the midpoint of what the trunk skin spans there.
STATION_Y = np.linspace(-.5, .5, 51)


def _flank_centre(y, halfband=.012):
    s = raw_co[np.abs(raw_co[:, 1] - y) < halfband]
    if len(s) < 8:
        return None
    w = np.quantile(np.abs(s[:, 0]), .92)
    flank = s[(np.abs(s[:, 0]) > .45 * w) & (np.abs(s[:, 0]) < .95 * w)]
    if len(flank) < 4:
        flank = s
    return float((np.quantile(flank[:, 2], .04) + np.quantile(flank[:, 2], .96)) / 2)


_centres = [(float(y), _flank_centre(y)) for y in STATION_Y]
_centres = [(y, z) for y, z in _centres if z is not None]
# A light three-point smoothing: the open gape and the fin roots make single stations noisy.
_cy = np.array([y for y, _ in _centres])
_cz = np.array([z for _, z in _centres])
_cz = np.convolve(np.pad(_cz, 2, mode='edge'), np.ones(5) / 5, mode='valid')


def centre(y):
    """Trunk centreline height at station y (raw units)."""
    return float(np.interp(y, _cy, _cz))


def trunk_half_width(y):
    """Half width of the trunk at y, measured from the band near the centreline only, so the
    pectoral and pelvic fins (which hang below it) and the median fins (which stand above and
    below it) cannot inflate it."""
    c = centre(y)
    s = raw_co[(np.abs(raw_co[:, 1] - y) < .012) & (np.abs(raw_co[:, 2] - c) < .035)]
    return float(np.quantile(np.abs(s[:, 0]), .98)) if len(s) >= 6 else 0.


_wy = np.array([float(y) for y in STATION_Y])
_ww = np.array([trunk_half_width(float(y)) for y in STATION_Y])
_ww = np.convolve(np.pad(_ww, 1, mode='edge'), np.ones(3) / 3, mode='valid')


def half_width(y):
    return float(np.interp(y, _wy, _ww))


# Shell thickness along the inward normal. A fin blade is thin; the trunk is not, so this is the
# separator that tells a pectoral fin from the flank it grows out of without guessing a boundary.
def shell_thickness(mesh, bvh):
    t = np.empty(len(mesh.vertices), dtype=np.float64)
    for i, v in enumerate(mesh.vertices):
        n = Vector(v.normal[:])
        hit = bvh.ray_cast(Vector(v.co[:]) - n * 2e-4, -n, .6)
        t[i] = hit[3] if hit[0] is not None else .6
    return t


def neighbourhood_minimum(mesh, values, rings=2):
    # The smallest thickness within `rings` edges. A vertex right on a fin's rim has a normal
    # lying almost in the plane of the blade, so the ray it casts runs the length of the fin
    # instead of across it and the rim measures as thick as the trunk. Uncorrected that is not a
    # cosmetic error: the rim of the left pectoral came out weighted to body/chest while the
    # blade around it was weighted to pec_tip_L, and the Death roll tore a fan of spikes out of
    # the fin. A rim vertex is always an edge or two from real blade, so take the neighbourhood
    # minimum and the rim goes with its own fin.
    adjacency = [[] for _ in range(len(mesh.vertices))]
    for e in mesh.edges:
        a, b = e.vertices
        adjacency[a].append(b)
        adjacency[b].append(a)
    out = values.copy()
    for _ in range(rings):
        previous = out.copy()
        for i, neighbours in enumerate(adjacency):
            if neighbours:
                out[i] = min(previous[i], min(previous[j] for j in neighbours))
    return out


_bvh_auth = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = neighbourhood_minimum(auth.data, shell_thickness(auth.data, _bvh_auth))

# ------------------------------------------------------------------ rig ----
def tx(p):
    """Raw Tripo units -> Blender authoring units. The head stays on -Y, which `export_yup`
    turns into glTF +Z, where every shipped body in this repository keeps it."""
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


def on_axis(y, dz=0.):
    return (0., y, centre(y) + dz)


bone('root', (0, 0, 0), None)
bone('body', on_axis(-.06), 'root')
bone('chest', on_axis(-.235), 'body')
bone('skull', on_axis(-.335, .005), 'chest')
bone('jaw', (0, -.352, -.030), 'skull')                 # the hinge, inside the head below the palate
TAIL_Y = [.020, .090, .155, .215, .270, .325, .380]
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))
bone('caudal_upper', (0, .400, centre(.400) + .035), 'tail_06')
bone('caudal_lower', (0, .400, centre(.400) - .035), 'tail_06')
bone('dorsal', (0, -.100, centre(-.100) + .100), 'body')
# ------------------------------------------------- the pectoral fins, measured ----
# **The pectoral chain is measured off the fin, not typed.** The first three deliveries placed the
# three joints of each pectoral by hand and weighted the blade by a radial |x| ramp gated on shell
# thickness, and the roster verification (T3D-17) read the result off the packaged file: the right
# chain owned 1,123 vertices to the left's 890, the mid joint sat 0.026 off the blade it drove, and
# the gate -- a per-vertex thickness step next to a per-vertex |x| step -- tore the fin's root at
# 11.68x in `Parry` and 14.33x in the shore gait `Flop`, on an edge 0.0024 of a body long whose two
# ends fell on opposite sides of it. What tears is never the clip, it is a weight field that is not
# smooth on the mesh; and a chain that is not on the blade lets the two fins own different skin.
#
# So each fin is found as the connected patch of blade-thin surface under the flank (a flood over
# the mesh's own edges, bounded by the shell thickness that separates a 0.005-0.026 blade from a
# 0.13 flank), stationed by **geodesic distance from its tip** -- the one point both sides agree on
# to 0.001, where the seat (nearest the axis) is a noisy minimum that landed 0.037 apart on the two
# sides -- and the two measured centrelines are checked against each other's mirror and averaged,
# so the rig is symmetric by measurement rather than by typing. The root is the base station pulled
# radially into the trunk until ray parity against the closed skin says it is inside and the nearest
# surface is a margin away; the mid and tip joints sit *on* the measured centreline.
PEC_BANDS = 8
PEC_ROOT_MARGIN = .020          # how far inside the flank skin the root is seated
PEC_RADIUS_MARGIN = .018        # the radial ramp outside the blade's own measured section
PEC_MIRROR_TOLERANCE = .025     # the two fins' stationed centrelines must agree, mirrored, to this
_adj_ptr, _adj_idx = _adjacency(auth.data)
_cz_all = np.array([centre(float(y)) for y in raw_co[:, 1]])


def _pectoral_cluster(side):
    """The largest connected blade-thin patch under the flank on one side."""
    m = ((thickness < THIN_PEC) & (raw_co[:, 1] > -.33) & (raw_co[:, 1] < -.05)
         & (raw_co[:, 2] < _cz_all - .005) & (raw_co[:, 0] * side > .03))
    seen, best = set(), []
    for i in np.nonzero(m)[0]:
        i = int(i)
        if i in seen:
            continue
        stack, part = [i], []
        seen.add(i)
        while stack:
            q = stack.pop()
            part.append(q)
            for j in _adj_idx[_adj_ptr[q]:_adj_ptr[q + 1]]:
                j = int(j)
                if m[j] and j not in seen:
                    seen.add(j)
                    stack.append(j)
        if len(part) > len(best):
            best = part
    return best


def _geodesic(seed, members):
    """Distance over the patch's own edges from one vertex to every other."""
    inside = set(members)
    dist = {seed: 0.}
    heap = [(0., seed)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist.get(v, 1e9):
            continue
        for w in _adj_idx[_adj_ptr[v]:_adj_ptr[v + 1]]:
            w = int(w)
            if w not in inside:
                continue
            nd = d + float(np.linalg.norm(raw_co[w] - raw_co[v]))
            if nd < dist.get(w, 1e9):
                dist[w] = nd
                heapq.heappush(heap, (nd, w))
    return dist


def _inside_by_parity(p):
    """A point inside a closed surface crosses it an odd number of times on the way out. No normals
    and no table, which is what makes it exact beside a thin blade whose nearest face may be either
    of its two sides."""
    n, z = 0, float(p[2])
    for _ in range(24):
        hit = _bvh_auth.ray_cast(Vector((float(p[0]), float(p[1]), z)), Vector((0, 0, 1)), 1.)
        if hit[0] is None:
            break
        n += 1
        z = hit[0][2] + 1e-5
    return n % 2 == 1


THIN_PEC = .042                 # THIN + THIN_BAND, the blade gate's own outer edge
PEC_MEASURED = {}
for side, s in ((1, 'L'), (-1, 'R')):
    cluster = _pectoral_cluster(side)
    assert len(cluster) >= 300, ('the pectoral fin did not measure', s, len(cluster))
    q = raw_co[cluster]
    r = np.hypot(q[:, 0], q[:, 2] - _cz_all[cluster])
    tip = cluster[int(np.argmax(r))]
    geo = _geodesic(tip, cluster)
    reach = max(geo.values())
    stations = []
    for k in range(PEC_BANDS):
        lo, hi = reach * k / PEC_BANDS, reach * (k + 1) / PEC_BANDS
        band = [v for v in cluster if lo <= geo.get(v, 1e9) <= hi + 1e-9]
        assert len(band) >= 6, ('an empty station on the pectoral fin', s, k, len(band))
        stations.append(raw_co[band].mean(0))
    stations = stations[::-1]                      # base first, tip last
    PEC_MEASURED[s] = {'cluster': cluster, 'vertices': len(cluster), 'tip': raw_co[tip].tolist(),
                       'geodesicReach': float(reach), 'stations': stations,
                       'box': [q.min(0).tolist(), q.max(0).tolist()]}
_L = np.array(PEC_MEASURED['L']['stations'])
_R = np.array(PEC_MEASURED['R']['stations']) * np.array([-1., 1., 1.])
_mirror_gap = float(np.linalg.norm(_L - _R, axis=1).max())
assert _mirror_gap < PEC_MIRROR_TOLERANCE, ('the two pectoral fins do not mirror', _mirror_gap)
PEC_STATIONS = (_L + _R) / 2                     # the left fin's centreline; the right is its mirror


def _seat_root(base):
    """Pull the fin's base station radially into the trunk until it is inside the closed skin by
    parity and a margin from the nearest surface -- which past the flank is the flank."""
    base = np.asarray(base, float)
    axis = np.array([0., base[1], centre(float(base[1]))])
    d = axis - base
    d /= np.linalg.norm(d)
    for t in np.arange(0., .15, .002):
        p = base + d * t
        if _inside_by_parity(p) and _bvh_auth.find_nearest(Vector(p.tolist()))[3] >= PEC_ROOT_MARGIN:
            return p, float(t)
    raise AssertionError(('the pectoral root found no trunk to seat in', base.tolist()))


_root_L, _root_pull = _seat_root(PEC_STATIONS[0])
_poly_L = [_root_L] + [np.asarray(p, float) for p in PEC_STATIONS]
_P_L, _cum_L = T.polyline([Vector(p.tolist()) for p in _poly_L])
PEC_ARC = _cum_L[-1]
PEC_MID_T, PEC_TIP_T = .42, .78


def _along(P, cum, s):
    for i in range(len(P) - 1):
        if cum[i] <= s <= cum[i + 1]:
            t = (s - cum[i]) / max(cum[i + 1] - cum[i], 1e-9)
            return P[i] + (P[i + 1] - P[i]) * t
    return P[-1]


PECTORAL = {}
PELVIC = {}
PEC_CHAIN = {}
for side in (-1, 1):
    s = 'L' if side > 0 else 'R'
    mirror = Vector((side, 1, 1))
    joints = [_root_L, _along(_P_L, _cum_L, PEC_ARC * PEC_MID_T), _along(_P_L, _cum_L, PEC_ARC * PEC_TIP_T)]
    pts = [tuple(Vector([float(c) for c in j]) * mirror) for j in joints]
    names = ['pec_upper_' + s, 'pec_mid_' + s, 'pec_tip_' + s]
    PECTORAL[s] = (side, pts, names)
    for i, n in enumerate(names):
        bone(n, pts[i], 'chest' if i == 0 else names[i - 1])
    PEC_CHAIN[s] = T.polyline([Vector([float(c) for c in p]) * mirror for p in _poly_L])
    PELVIC[s] = (side, ['pelvic_' + s])
    bone('pelvic_' + s, (side * .030, .075, -.090), 'tail_01')

# The blade's own section at each station, measured as the 97th percentile of the fin's distance
# from its centreline in that band, is the radius inside which a vertex is wholly the fin's; the
# ramp outside it is a fixed margin. Read off the left fin and its mirrored right together, so the
# two chains claim the same radius.
_pec_radius_rows = []
for s, mirror in (('L', np.array([1., 1., 1.])), ('R', np.array([-1., 1., 1.]))):
    P, cum = PEC_CHAIN['L']
    q = raw_co[PEC_MEASURED[s]['cluster']] * mirror
    for row in q:
        dist, arc = T.project(P, cum, Vector(row.tolist()))
        _pec_radius_rows.append((arc / PEC_ARC, dist))
_pec_radius_rows = np.array(_pec_radius_rows)
PEC_RADIUS = []
for k in range(PEC_BANDS):
    lo, hi = k / PEC_BANDS, (k + 1) / PEC_BANDS
    m = (_pec_radius_rows[:, 0] >= lo) & (_pec_radius_rows[:, 0] < (hi if k + 1 < PEC_BANDS else 1.01))
    if m.sum() >= 12:
        PEC_RADIUS.append(((lo + hi) / 2, float(np.quantile(_pec_radius_rows[m, 1], .97))))
assert len(PEC_RADIUS) >= 5, ('the pectoral radius did not measure', PEC_RADIUS)
PEC_SEAT_ARC = max(_cum_L[1] * .9, .010)       # the root's blend runs the length of the pull
PEC_JOINT_ARC = [0., PEC_ARC * PEC_MID_T, PEC_ARC * PEC_TIP_T]
# The blend at a joint is a fraction of the segments it joins, never a number (see CLAUDE.md).
PEC_BLEND = max(.35 * min(PEC_ARC * PEC_MID_T, PEC_ARC * (PEC_TIP_T - PEC_MID_T)), 1e-4)


def pec_radius(t):
    ts = [r[0] for r in PEC_RADIUS]
    rin = float(np.interp(t, ts, [r[1] for r in PEC_RADIUS]))
    return rin, rin + PEC_RADIUS_MARGIN


# The pectoral root must sit inside the trunk's own cross-section, as every builder in this
# repository is required to check, or the fin reads as floating beside the flank.
for s, (side, pts, _names) in PECTORAL.items():
    x, y, z = pts[0]
    c, w = centre(y), half_width(y)
    depth = raw_co[(np.abs(raw_co[:, 1] - y) < .012)]
    floor = float(np.quantile(depth[:, 2], .02))
    assert abs(x) < .85 * w and z > floor + .012, ('pectoral root outside the trunk', s, x, w, z, floor)
    assert _inside_by_parity(np.array([x, y, z])), ('pectoral root outside the closed skin', s)
print('HELICOPRION_PECTORAL', json.dumps({
    'clusterVertices': {s: PEC_MEASURED[s]['vertices'] for s in PEC_MEASURED},
    'tips': {s: [round(v, 4) for v in PEC_MEASURED[s]['tip']] for s in PEC_MEASURED},
    'mirrorGap': round(_mirror_gap, 4), 'rootPull': round(_root_pull, 4),
    'joints': {s: [[round(v, 4) for v in p] for p in PECTORAL[s][1]] for s in PECTORAL},
    'arc': round(PEC_ARC, 4), 'radius': [[round(a, 3), round(b, 4)] for a, b in PEC_RADIUS]}))
for s, (side, _names) in PELVIC.items():
    x, y, z = B['pelvic_' + s][0]
    assert abs(x) < .85 * half_width(y), ('pelvic root outside the trunk', s)

# -------------------------------------------------------------- weights ----
# The lower jaw is not cut out of this body. Every Tripo shell the era has rigged so far arrived
# closed, with no oral cavity, so a rigid jaw had to be cut free and an interior modelled behind
# it or a membrane stretched across the gape. This generation already carries a modelled open
# mouth: palate, tooth rows, a floor and a throat. There is therefore no membrane to cut, and the
# whorl's front touches the palate, so no separating surface exists that does not slice one of
# them. The jaw is a skinned hinge instead: a measured separation surface between palate and
# whorl decides the weight, and the shell stays watertight, which a cut here would not.
ZSEP = [(-.50, -.030), (-.46, -.030), (-.44, -.026), (-.43, -.013), (-.42, -.009), (-.41, -.004),
        (-.40, -.003), (-.39, -.004), (-.38, -.008), (-.37, -.009), (-.36, -.012), (-.35, -.022),
        (-.34, -.030), (-.32, -.040), (-.30, -.050)]
ZSEP_X = .40      # the palate is arched: the separation drops this much per unit of half-width
ZSEP_BAND = .006


def smooth(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


def jaw_weight(p):
    x, y, z = p
    if y > -.30:
        return 0.
    sep = float(np.interp(y, [a for a, _ in ZSEP], [b for _, b in ZSEP])) - ZSEP_X * abs(x)
    below = smooth((sep - z) / ZSEP_BAND + .5)
    behind = smooth((-.305 - y) / .050)      # 1 forward of the hinge, 0 well behind it
    return below * behind


AXIAL = [('skull', -.360), ('chest', -.235), ('body', -.060), ('tail_00', .020), ('tail_01', .090),
         ('tail_02', .155), ('tail_03', .215), ('tail_04', .270), ('tail_05', .325), ('tail_06', .380)]


def axial(y):
    ys = [v for _, v in AXIAL]
    if y <= ys[0]:
        return {AXIAL[0][0]: 1.}
    if y >= ys[-1]:
        return {AXIAL[-1][0]: 1.}
    i = int(np.searchsorted(ys, y)) - 1
    t = (y - ys[i]) / (ys[i + 1] - ys[i])
    return {AXIAL[i][0]: 1 - t, AXIAL[i + 1][0]: t}


THIN = .030          # a blade this thin at these stations is a fin, not a flank
THIN_BAND = .012


def fin_weights(p, thin):
    """A fin's own chain and how strongly it owns this point. The root blend is radial and runs
    from inside the trunk outward, so a seated root follows the flank when the body bends."""
    x, y, z = p
    c = centre(y)
    blade = smooth((THIN + THIN_BAND - thin) / THIN_BAND)
    if blade <= 0:
        return None
    if .020 < y < .165 and z < c - .050 and abs(x) > .006:
        s = 'L' if x > 0 else 'R'
        return {'pelvic_' + s: 1.}, blade * smooth((c - z - .065) / .030)
    if -.210 < y < .010 and z > c + .070:
        return {'dorsal': 1.}, blade * smooth((z - c - .085) / .035)
    if y > .320:
        lobe = 'caudal_upper' if z > c else 'caudal_lower'
        return {lobe: 1.}, blade * smooth((abs(z - c) - .030) / .050) * smooth((y - .325) / .035)
    return None


def pectoral_weights(p):
    """The pectoral chain and how strongly it owns this point: radially by the blade's own measured
    section at the point's station along the fin, by arc length along the chain for which joint,
    and faded in over the root's pull so a seated root blends onto the chest under it. No |x| step
    and no thickness step: the field is continuous over the surface, which is what a skin needs."""
    if not (-.34 < p[1] < -.06):
        return None
    q = Vector(p)
    best = None
    for s, (P, cum) in PEC_CHAIN.items():
        dist, arc = T.project(P, cum, q)
        rin, rout = pec_radius(arc / PEC_ARC)
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / (rout - rin))) * smooth(arc / PEC_SEAT_ARC)
        if alpha > 1e-4 and (best is None or alpha > best[1]):
            best = (T.limb_chain(PECTORAL[s][2], PEC_JOINT_ARC, arc, PEC_BLEND), alpha)
    return best


def weights(p, thin):
    x, y, z = p
    w = dict(axial(y))
    fin = pectoral_weights(p) or fin_weights(p, thin)
    if fin:
        chain, blend = fin
        if blend > 0:
            w = {n: v * (1 - blend) for n, v in w.items()}
            for n, v in chain.items():
                w[n] = w.get(n, 0.) + v * blend
    j = jaw_weight(p)
    if j > 0:
        w = {n: v * (1 - j) for n, v in w.items()}
        w['jaw'] = w.get('jaw', 0.) + j
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(v for _, v in items)
    return {n: v / total for n, v in items}


# ------------------------------------------------- procedural twin (LOD) ----
# Regenerated topology from the authored body's own occupancy field: no source vertex or face
# survives it, so this is a measured rebuild of the volume rather than a decimation of the skin.
puppet = auth.copy()
puppet.data = auth.data.copy()
bpy.context.collection.objects.link(puppet)
puppet.name = 'Helicoprion procedural volume twin'
bpy.context.view_layer.objects.active = puppet

# A voxel field cannot hold a knife edge. Every fin on this animal tapers to nothing, and an
# occupancy field sampled at 0.0052 stops about two and a half voxels short of the trailing tip:
# the first build lost the last 0.014 of the anal fin, which the station at +1.225 fell straight
# into and reported as 0.318 units of envelope error. So the blades - and only the blades, by
# their own measured shell thickness - are dilated along their normals before the field is
# sampled, which carries the rim out as well as thickening the plate. The twin's fins come back
# about five thousandths of a body plumper than the authored ones and reach the same tips; the
# authored body itself is never touched by this.
for v in puppet.data.vertices:
    n = Vector(v.normal[:])
    w = 1. - max(0., min(1., (float(thickness[v.index]) - .030) / .020))
    v.co = Vector(v.co[:]) + n * (BLADE_DILATION * w * w * (3 - 2 * w))
puppet.data.remesh_voxel_size = .0052
puppet.data.remesh_voxel_adaptivity = 0
puppet.data.use_remesh_preserve_volume = True
bpy.ops.object.voxel_remesh()
remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)

# Relaxation takes the voxel staircase off the trunk, and it must not touch the fins: a blade
# five to fifteen thousandths of a body long is two voxels thick, and two passes of unrestricted
# smoothing simply eat it. The first build of this twin lost the anal fin entirely that way
# (0.317 units of envelope error at station +1.225, against a 0.2 tolerance). So the relaxation
# is masked by the twin's own measured shell thickness.
_bvh_vox = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
relax_group = puppet.vertex_groups.new(name='Trunk relaxation mask')
relax_masked = 0
_vox_thickness = neighbourhood_minimum(puppet.data, shell_thickness(puppet.data, _bvh_vox))
for v in puppet.data.vertices:
    w = max(0., min(1., (float(_vox_thickness[v.index]) - .030) / .020))
    w = w * w * (3 - 2 * w)
    relax_group.add([v.index], w, 'REPLACE')
    if w < .5:
        relax_masked += 1
mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH')
mod.factor = .45
mod.iterations = 2
mod.vertex_group = relax_group.name
bpy.ops.object.modifier_apply(modifier=mod.name)
puppet.vertex_groups.remove(puppet.vertex_groups[relax_group.name])
mod = puppet.modifiers.new('Twin topology budget', 'DECIMATE')
mod.ratio = min(1., PUPPET_TRIANGLE_TARGET / max(1, remesh_triangles))
decimate_ratio = mod.ratio
bpy.ops.object.modifier_apply(modifier=mod.name)

# Pigment comes through the nearest source triangle's own interpolated UV, never by averaging
# unrelated atlas islands at a welded seam vertex and never by copying a nearest vertex colour.
if puppet.data.color_attributes.get('Color'):
    puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for v in puppet.data.vertices:
    hit = _bvh_auth.find_nearest(v.co)
    poly = auth.data.polygons[hit[2]]
    assert len(poly.vertices) == 3
    p3 = [auth.data.vertices[j].co for j in poly.vertices]
    q3 = [Vector((*uv.data[j].uv, 0)) for j in poly.loop_indices]
    sample = barycentric_transform(hit[0], p3[0], p3[1], p3[2], q3[0], q3[1], q3[2])
    pl.data[v.index].color = sample_albedo(sample.x, sample.y)
pmat = bpy.data.materials.new('Helicoprion twin body')
pmat.use_nodes = True
pbs = pmat.node_tree.nodes.get('Principled BSDF')
pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor')
pvc.layer_name = 'Color'
pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
pbs.inputs['Roughness'].default_value = .68
puppet.data.materials.clear()
puppet.data.materials.append(pmat)
for p in puppet.data.polygons:
    p.material_index = 0

# The twin's own shell thickness, so the same fin rule reads the same way on both bodies.
_bvh_pup = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
puppet_thickness = neighbourhood_minimum(puppet.data, shell_thickness(puppet.data, _bvh_pup))
# Voxel resurfacing cannot make a blade thinner than its own voxel, so measure the twin's fins
# against the twin's own floor rather than the authored body's.
puppet_thickness = np.maximum(0., puppet_thickness - (.0052 * 2 - .004))

# -------------------------------------------------------------- armature ----
arm = bpy.data.armatures.new('Helicoprion shared skeleton')
rig = bpy.data.objects.new('Helicoprion_Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n, (p, parent) in B.items():
    eb = arm.edit_bones.new(n)
    eb.head = tx(p)
    eb.tail = eb.head + Vector((0, .16, 0))
    if parent:
        eb.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

weight_report = {}
HEAD_HOLD_Y = -.30              # forward of this the jaw's skinned hinge stands exactly as measured
per_vertex_weights = {}
for o, thin in [(auth, thickness), (puppet, puppet_thickness)]:
    for n in B:
        o.vertex_groups.new(name=n)
    gated = [weights(v.co, float(thin[v.index])) for v in o.data.vertices]
    # **The relaxation is what stops a fin tearing** (see `T.relax_weights`): every gate above is a
    # per-vertex decision and two vertices a thousandth of a body apart can fall either side of it.
    # Diffusion over the mesh's own edge graph, coupled by inverse edge length and trimmed to four
    # influences every pass, turns each step into a ramp, and its sliver weld gives two vertices a
    # rounding error apart one answer. The head is held out of it: the jaw is a skinned hinge whose
    # weight is a measured separation surface between palate and whorl, `JAW_CLOSE` is swept from
    # that same function, and the whorl's fit under the palate is judged on it -- so forward of
    # `HEAD_HOLD_Y` every vertex keeps the weight it measured, byte for byte, and the mouth is
    # exactly the mouth the closing rotation was measured for.
    relaxed = T.relax_weights(o, gated, passes=3, keep=4, hold=.45)
    held = 0
    for v in o.data.vertices:
        if v.co.y < HEAD_HOLD_Y:
            relaxed[v.index] = gated[v.index]
            held += 1
    per_vertex_weights[o.name] = relaxed
    influences, owners = [], {}
    for v in o.data.vertices:
        w = relaxed[v.index]
        influences.append(len(w))
        for n, value in w.items():
            o.vertex_groups[n].add([v.index], value, 'REPLACE')
            owners[n] = owners.get(n, 0) + 1
    for v in o.data.vertices:
        v.co = tx(v.co)
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Shared articulated skeleton', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    weight_report[o.name] = {'maxInfluences': max(influences), 'vertices': len(influences),
                             'verticesPerBone': owners, 'headVerticesHeldFromRelaxation': held}

# ------------------------------------------- do the two fins own the same skin? ----
# Read off the weights the body ships with, on the raw surface: what each chain dominates by count
# and by *area* (the right blade is meshed a quarter denser than the left, 646 thin vertices to 515
# over the same box, so a count compares the generator's tessellation and an area compares the fin),
# and how far each joint sits from the skin it drives. Left and right have to agree within a fifth.
_area = np.zeros(len(raw_co))
for p in auth.data.polygons:
    tri = raw_co[list(p.vertices[:3])]
    a = float(np.linalg.norm(np.cross(tri[1] - tri[0], tri[2] - tri[0]))) / 2
    for i in p.vertices:
        _area[i] += a / len(p.vertices)
_w_auth = per_vertex_weights[auth.name]
_dom = [max(w, key=w.get) for w in _w_auth]
PEC_PARITY = {}
for s in ('L', 'R'):
    names = PECTORAL[s][2]
    owned = [i for i, d in enumerate(_dom) if d in names]
    cluster = set(PEC_MEASURED[s]['cluster'])
    joints = {}
    for k, n in enumerate(names):
        mine = np.array([i for i, d in enumerate(_dom) if d == n])
        jp = np.array(PECTORAL[s][1][k])
        joints[n] = {'dominates': int(len(mine)),
                     'toNearestOwnedSkin': round(float(np.linalg.norm(raw_co[mine] - jp, axis=1).min()), 4) if len(mine) else None,
                     'meanToOwnedSkin': round(float(np.linalg.norm(raw_co[mine] - jp, axis=1).mean()), 4) if len(mine) else None,
                     'toNearestSkin': round(float(np.linalg.norm(raw_co - jp, axis=1).min()), 4)}
    PEC_PARITY[s] = {'dominatedVertices': int(len(owned)),
                     'dominatedArea': round(float(_area[owned].sum()), 5),
                     'weightedArea': round(float(sum(_area[i] * sum(v for n, v in _w_auth[i].items() if n in names)
                                                     for i in range(len(raw_co)))), 5),
                     'finClusterVertices': len(cluster),
                     'finClusterDominatedByItsChain': round(float(sum(1 for i in owned if i in cluster) / len(cluster)), 4),
                     'joints': joints}


def _ratio(a, b):
    return abs(a - b) / max(a, b, 1e-9)


# The root is seated inside the trunk on purpose and is judged by how deep it sits. The mid and tip
# joints are on the blade, and there the question is the one Saurichthys failed (3.6 % of a body
# from its skin on one side, 1.7 % on the other): is the chain on the fin it drives, and equally so
# on both sides. The instrument is the joint's *mean* distance to the skin it dominates -- the
# nearest single vertex is the blade's own half-thickness at that station (0.0096 against 0.0053 on
# the first build, on a blade 0.005-0.010 thick), a number about the tessellation and not the seat.
PEC_PARITY['ratios'] = {
    'dominatedVertices': round(_ratio(PEC_PARITY['L']['dominatedVertices'], PEC_PARITY['R']['dominatedVertices']), 4),
    'finClusterDominatedByItsChain': round(_ratio(PEC_PARITY['L']['finClusterDominatedByItsChain'],
                                                  PEC_PARITY['R']['finClusterDominatedByItsChain']), 4),
    'weightedArea': round(_ratio(PEC_PARITY['L']['weightedArea'], PEC_PARITY['R']['weightedArea']), 4),
    'bladeJointsToOwnedSkin': round(max(_ratio(PEC_PARITY['L']['joints']['pec_%s_L' % j]['meanToOwnedSkin'],
                                               PEC_PARITY['R']['joints']['pec_%s_R' % j]['meanToOwnedSkin'])
                                        for j in ('mid', 'tip')), 4),
    'bladeJointsToNearestOwnedSkin': round(max(_ratio(PEC_PARITY['L']['joints']['pec_%s_L' % j]['toNearestOwnedSkin'],
                                                      PEC_PARITY['R']['joints']['pec_%s_R' % j]['toNearestOwnedSkin'])
                                               for j in ('mid', 'tip')), 4),
    'rootToSkin': round(_ratio(PEC_PARITY['L']['joints']['pec_upper_L']['toNearestSkin'],
                               PEC_PARITY['R']['joints']['pec_upper_R']['toNearestSkin']), 4),
    'meshDensityOfTheTwoBlades': round(_ratio(PEC_MEASURED['L']['vertices'], PEC_MEASURED['R']['vertices']), 4)}
print('HELICOPRION_PEC_PARITY', json.dumps(PEC_PARITY))
assert PEC_PARITY['ratios']['weightedArea'] < .20, ('the two pectoral chains own different skin', PEC_PARITY['ratios'])
assert PEC_PARITY['ratios']['finClusterDominatedByItsChain'] < .20, ('the two chains own different shares of their blades', PEC_PARITY['ratios'])
assert PEC_PARITY['ratios']['bladeJointsToOwnedSkin'] < .20, ('a pectoral joint sits off its skin', PEC_PARITY['ratios'])
assert PEC_PARITY['ratios']['rootToSkin'] < .20, ('the two roots are seated at different depths', PEC_PARITY['ratios'])
for s in ('L', 'R'):
    assert PEC_PARITY[s]['finClusterDominatedByItsChain'] > .85, ('a pectoral chain does not own its blade', s, PEC_PARITY[s])

# ------------------------------------------------ measured paired profile ----
def section(o, y):
    points = []
    for e in o.data.edges:
        a, b = [o.data.vertices[j].co for j in e.vertices]
        if (a.y - y) * (b.y - y) <= 0 and abs(a.y - b.y) > 1e-8:
            points.append(a + (b - a) * ((y - a.y) / (b.y - a.y)))
    if not points:
        return None
    arr = np.array(points)
    return {'min': arr.min(0).tolist(), 'max': arr.max(0).tolist()}


profile, worst = [], 0.
for y in np.linspace(-2.45, 2.45, 21):
    row = {'stationY': float(y)}
    for label, o in [('authored', auth), ('twin', puppet)]:
        row[label] = section(o, y)
    if row['authored'] and row['twin']:
        row['maximumEnvelopeDifference'] = max(abs(a - b) for k in ['min', 'max']
                                               for a, b in zip(row['authored'][k], row['twin'][k]))
        worst = max(worst, row['maximumEnvelopeDifference'])
        assert row['maximumEnvelopeDifference'] < ENVELOPE_TOLERANCE, row
    profile.append(row)

pv = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                          [p.vertices[:] for p in puppet.data.polygons])
distances = [pv.find_nearest(v.co)[3] for v in auth.data.vertices]
assert max(distances) < ENVELOPE_TOLERANCE

# ------------------------------------------------------------ anchors ----
# Raw-space landmarks, measured off the head: the whorl's exposed edge is the bite point, so
# `anchor_attack_primary` sits on it rather than on a notional tooth row.
ANCHOR_POINTS = {'anchor_mouth': ('jaw', (0, -.428, -.022), 'mouth'),
                 'anchor_mouth_inside': ('skull', (0, -.362, -.024), 'swallow'),
                 'anchor_attack_primary': ('skull', (0, -.437, -.014), 'attack')}
anchors = [{'name': name, 'bone': b, 'point': list(tx(p)), 'role': role}
           for name, (b, p, role) in ANCHOR_POINTS.items()]
# Every anchor must land on the surface it names, not in the air beside it.
anchor_checks = {}
for name, (b, p, role) in ANCHOR_POINTS.items():
    hit = _bvh_auth.find_nearest(Vector(p))
    anchor_checks[name] = {'nearestSurfaceRaw': float(hit[3]),
                           'nearestSurfaceUnits': float(hit[3] * SCALE),
                           'fractionOfBodyLength': float(hit[3] * SCALE / BODY_LENGTH)}
    assert hit[3] * SCALE < ANCHOR_TOLERANCE, (name, hit[3])

# ------------------------------------------------- how far open it arrived ----
# **This generation was authored gaping, and the bind pose carries that gape.** The clips were built
# on the rule that the jaw only ever opens from the bind pose, which is right for a body that
# arrived shut and wrong for this one: it left the animal holding its mouth open in every clip it
# has, Idle included, which is what a review of the shipped body picked up. So the closing rotation
# is measured here and `JAW_SHUT` is a real pose the resting clips can sit in.
#
# The gape is read off the **crossings of a vertical line**, and *which* void on that line is the
# gape is the thing this head gets to correct. The era's standing rule is to take the largest empty
# interval, because the first one from below is usually the sliver between a mandible and a modelled
# tongue. Here the tooth whorl stands up through the middle of the lumen and divides it in two, and
# the larger half is as often the space *under* the whorl as the space above it: measured that way
# the "roof" came back as the whorl's own underside at four stations out of thirteen, 0.03 low, and
# the closing rotation it implied was nonsense. What is wanted is the void whose roof is the palate,
# which is the **topmost** one -- crossings of a closed shell alternate in and out, so the voids are
# the intervals starting on an odd crossing and the last of those is the one under the palate. Its
# floor is then whatever is highest in the lower jaw at that station, whorl crown or mandible, which
# is exactly the thing that has to come up to meet the palate.
MOUTH_HINGE_Y, MOUTH_HINGE_Z = -.352, -.030
GAPE_STATIONS = [y for y in np.linspace(-.470, -.362, 19)]


def _crossings(y, x=0.):
    """Every surface crossing on the vertical line through (x, y), bottom to top."""
    out, z = [], centre(y) - .28
    for _ in range(24):
        hit = _bvh_auth.ray_cast(Vector((x, y, z)), Vector((0, 0, 1)), .56)
        if hit[0] is None:
            break
        z = hit[0][2] + 2e-5
        out.append(float(hit[0][2]))
    return out


def _lumen(y, x=0.):
    """(floor, roof) of the topmost void inside the head on the line at (x, y), or None."""
    c = _crossings(y, x)
    if len(c) < 4 or len(c) % 2:
        return None
    return (c[-3], c[-2])


_gape = []
for _y in GAPE_STATIONS:
    # **On the midline, because the mouth has no lateral section to measure.** The flanks were tried
    # first, on the reasoning that the whorl fills the middle of the lumen and a line down the centre
    # therefore measures the sliver between the whorl's crown and the palate rather than the gape.
    # They are the wrong place on this body: the jaw here is a *skinned hinge* in a watertight shell,
    # so the open mouth is a forward-facing aperture modelled into continuous skin and not a notch
    # cut through the cheek -- a vertical line at 0.05 off the midline passes through solid head at
    # every station from the snout to the hinge, two crossings and no void. What the midline does
    # measure is real and is the thing that bounds the closing: how far the whorl's crown is from
    # the palate it has to come up to meet.
    _mid = _lumen(_y, 0.)
    if _mid is None or _mid[1] - _mid[0] < 1e-4:
        continue
    _gape.append({'y': round(float(_y), 4), 'floor': round(_mid[0], 5), 'roof': round(_mid[1], 5),
                  'gap': round(_mid[1] - _mid[0], 5),
                  'closingRadians': round((_mid[1] - _mid[0]) / abs(_y - MOUTH_HINGE_Y), 4)})
if os.environ.get('GAPE_PROBE'):
    for _y in np.linspace(-.470, -.360, 12):
        _hw = half_width(float(_y))
        row = ['y %.3f hw %.4f' % (_y, _hw)]
        for _x in (0., .02, .035, .05, .065, .08):
            row.append('x%.3f:%s' % (_x, [round(v, 4) for v in _crossings(float(_y), _x)]))
        print('GAPE_PROBE', ' | '.join(row))
if os.environ.get('JAW_PROBE'):
    _jw = np.array([jaw_weight(tuple(q)) for q in raw_co])
    _head = raw_co[:, 1] < -.30
    print('JAW_PROBE jaw-owned vertices %d of %d head vertices (%.1f%% of the whole body)'
          % (int((_jw > .5).sum()), int(_head.sum()), 100. * (_jw > .5).mean()))
    for _y in (-.46, -.44, -.42, -.40, -.38, -.36):
        _m = np.abs(raw_co[:, 1] - _y) < .006
        _sec = raw_co[_m]
        _w = _jw[_m]
        if len(_sec) < 4:
            continue
        print('JAW_PROBE y %.3f  section %d verts, jaw %d, jaw |x| max %.4f, skull |x| max %.4f, '
              'jaw z range %.4f..%.4f, skull z min %.4f'
              % (_y, len(_sec), int((_w > .5).sum()),
                 float(np.abs(_sec[_w > .5][:, 0]).max()) if (_w > .5).any() else -1,
                 float(np.abs(_sec[_w <= .5][:, 0]).max()) if (_w <= .5).any() else -1,
                 float(_sec[_w > .5][:, 2].min()) if (_w > .5).any() else 0,
                 float(_sec[_w > .5][:, 2].max()) if (_w > .5).any() else 0,
                 float(_sec[_w <= .5][:, 2].min()) if (_w <= .5).any() else 0))
assert len(_gape) >= 8, ('no modelled gape found along the head', len(_gape))
# One rigid rotation cannot close a gape that is not proportional to the distance from the hinge, so
# the median is taken and the spread is recorded rather than smoothed away. Only the stations with a
# real lever under them count: within 0.04 of the hinge the gap is divided by almost nothing and the
# rotation it asks for runs to several radians, which is a measurement about the hinge and not about
# the mouth. The front of the mouth is also what a viewer reads as shut or not shut.
_front = [r for r in _gape if abs(r['y'] - MOUTH_HINGE_Y) > .040]
assert len(_front) >= 6, ('the gape did not measure forward of the hinge', len(_front))
GAPE_MEDIAN = float(np.median([r['closingRadians'] for r in _front]))


def _roof_at(y):
    ys = [r['y'] for r in _gape]
    return float(np.interp(y, ys, [r['roof'] for r in _gape]))


# **What bounds the closing is the whorl, not the gape.** The rotation the midline gape asks for
# brings the whorl's crown onto the palate and leaves the *aperture* -- a forward-facing opening
# modelled into continuous skin, with no lateral section a vertical line can measure -- still plainly
# parted in a front view. The mouth has to travel further than that to read as shut, and the thing
# that says how much further is the coil: rotate until the whorl starts pushing through the palate,
# and stop just before. So the fit is swept rather than evaluated once and `JAW_CLOSE` is the largest
# rotation that keeps `WHORL_FIT_FLOOR` of the whorl under the palate -- which is also the number the
# review asked for, "the whorl should mostly fit inside when he does that", measured rather than
# judged.
_wh = raw_co[(np.abs(raw_co[:, 0]) < WHORL_HALF_WIDTH)
             & (raw_co[:, 1] > WHORL_BAND[0]) & (raw_co[:, 1] < WHORL_BAND[1])]
_wh = np.array([p for p in _wh if jaw_weight(tuple(p)) > .5])
assert len(_wh) >= 40, ('the whorl did not measure', len(_wh))
WHORL_FIT_FLOOR = .95


def _whorl_above_palate(close):
    """Every whorl vertex's height above the palate after closing by `close` radians."""
    ca, sa = cos(-close), sin(-close)
    wy = MOUTH_HINGE_Y + (_wh[:, 1] - MOUTH_HINGE_Y) * ca - (_wh[:, 2] - MOUTH_HINGE_Z) * sa
    wz = MOUTH_HINGE_Z + (_wh[:, 1] - MOUTH_HINGE_Y) * sa + (_wh[:, 2] - MOUTH_HINGE_Z) * ca
    return np.array([wz[i] - _roof_at(float(wy[i])) for i in range(len(_wh))])


_sweep = []
for _c in np.linspace(.10, 1.00, 91):
    _a = _whorl_above_palate(float(_c))
    _sweep.append({'closingRadians': round(float(_c), 3),
                   'fractionUnderThePalate': round(float((_a <= 0).mean()), 4),
                   'worstProtrusionRaw': round(float(_a.max()), 5)})
_ok = [r for r in _sweep if r['fractionUnderThePalate'] >= WHORL_FIT_FLOOR]
assert _ok, ('the whorl never fits under the palate at any closing rotation', _sweep[0])
JAW_CLOSE = float(max(r['closingRadians'] for r in _ok))
JAW_SHUT = -JAW_CLOSE                     # the jaw channel's own units: positive opens
_above = _whorl_above_palate(JAW_CLOSE)
_inside = float((_above <= 0).mean())
WHORL_FIT = {
    'closingSweep': _sweep[::5],
    'fitFloor': WHORL_FIT_FLOOR,
    'method': 'every whorl vertex carried through the closing rotation about the jaw hinge and '
              'measured against the palate\'s own ventral surface, which is the roof of the '
              'topmost void on the vertical line at that station',
    'whorlVerticesMeasured': int(len(_wh)),
    'fractionUnderThePalate': round(_inside, 4),
    'worstProtrusionRaw': round(float(_above.max()), 5),
    'worstProtrusionOverBodyLength': round(float(_above.max()) * SCALE / BODY_LENGTH, 5),
    'meanProtrusionOfTheVerticesThatDo': round(float(_above[_above > 0].mean()) if (_above > 0).any() else 0., 5),
}
RESTING_GAPE = {
    'closingRotationDegrees': round(math.degrees(JAW_CLOSE), 2),
    'closingRotationRadians': round(JAW_CLOSE, 4),
    'chosenBy': 'the largest rotation that keeps %g of the whorl under the palate' % WHORL_FIT_FLOOR,
    'whatTheMidlineGapeAloneWouldAskFor': round(GAPE_MEDIAN, 4),
    'stations': len(_gape),
    'gapPerStation': _gape,
    'stationsWithALeverUnderThem': len(_front),
    'closingRadiansSpread': [round(min(r['closingRadians'] for r in _front), 4),
                             round(max(r['closingRadians'] for r in _front), 4)],
    'verdict': 'the generation arrived GAPING: the bind pose carries that gape, so Idle sits at '
               'JAW_SHUT and Eat closes through it to swallow. Swim keeps the open mouth, which is '
               'what a ram-feeding eugeneodont is doing anyway.',
    'whorl': WHORL_FIT,
}
print('HELICOPRION_GAPE', json.dumps(RESTING_GAPE))

# ---------------------------------------------------------- performance ----
scene = bpy.context.scene
scene.render.fps = 30
rig.animation_data_create()
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'


def reset():
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


# Body-caudal undulation: one travelling wave down the axial chain whose amplitude grows toward
# the tail and whose anterior third barely moves. That is the whole of a eugeneodont's
# locomotion; nothing here rows, punts or walks.
TAIL_GAIN = [.22, .34, .50, .68, .86, 1.0, 1.0]
TAIL_LAG = [.45, .80, 1.15, 1.50, 1.85, 2.20, 2.50]

seams, bounds = {}, {}
for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    first = None
    loop = clip in LOOPS
    for f in range(last + 1):
        reset()
        u = f / last
        p = 2 * pi * u
        e = sin(pi * u) ** 2                      # one-shot envelope: starts and ends at rest
        env = 1 if loop else e
        pb = rig.pose.bones

        def wave(lag=0., freq=1.):
            return (sin(p * freq - lag) - sin(-lag)) * env

        amp = {'Idle': .30, 'Swim': 1.0, 'Sprint': 1.55, 'Eat': .30, 'Guard': .22, 'Dodge': 1.1,
               'Ability': .35, 'Grab': .30, 'Breath': .40, 'Growth': .25}.get(clip, .30)
        beat = 2. if clip in ('Swim', 'Sprint', 'Dodge') else 1.
        peak = sin(pi * (u - .24) / .4) ** 2 if .24 < u < .64 else 0.
        wind = sin(pi * u / .28) ** 2 if u < .28 else 0.
        dead = u * u * (3 - 2 * u) if clip == 'Death' else 0.
        saw = max(0., sin(p * 3)) ** 2 if clip in ('Ability', 'Grab') else 0.
        # The gulp, a beat behind the jaw shutting: Eat is one bite taken and put away.
        swallow = (sin(pi * (u - .46) / .44) ** 2 if .46 < u < .90 else 0.) if clip == 'Eat' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the whorl and the jaw it rides. **The bind pose is a gape, not an occlusion**, so
        # `JAW_SHUT` (measured above) is where the mouth is actually closed and the clips that are
        # not about swimming sit there. A eugeneodont cruising with its mouth open is what a ram
        # feeder does and is left alone; a eugeneodont holding station with its mouth open is the
        # animal forgetting to shut it, which is what a review of the shipped body picked up.
        opening = .012 * (1 - cos(p)) if loop else 0.
        if clip in ('Idle', 'Guard'):
            opening = JAW_SHUT + .010 * (1 - cos(p))
        if clip == 'Eat':
            # Open off the shut pose, take the mouthful, and shut through the bind pose and past it
            # -- that closing *is* the swallow, and the throat follows it back a beat later.
            opening = JAW_SHUT + (.62 - JAW_SHUT) * (sin(pi * u / .52) ** 2 if u < .52 else 0.)
        if clip == 'Bite':
            opening = .50 * sin(pi * u) ** 2
        if clip == 'Attack':
            opening = .42 * wind + .16 * peak
        if clip == 'Heavy':
            opening = .54 * wind + .10 * peak
        if clip == 'Ability':
            opening = .30 * wind + .20 * e + .06 * saw
        if clip == 'Grab':
            opening = .22 * env + .05 * saw
        if clip == 'Breath':
            opening = .06 * (1 - cos(p))          # gill ventilation, not a breath: see the README
        opening += .16 * dead
        pb['jaw'].rotation_euler.x = opening
        pb['skull'].rotation_euler.x = -.06 * opening

        # --- trunk
        body = pb['body']
        # The node of a thunniform wave is at the head, not at the middle of the fish. `body`
        # is the pivot, so its own sway has to be taken back out by the two bones in front of it
        # or the snout swings further than the tail does: the chest counter-yaws by the ratio of
        # the two lever arms (body->skull 1.375 units against chest->skull 0.5), which holds the
        # braincase on the line of travel and leaves the snout a little sway of its own.
        sway = .012 * amp * wave(0., beat)
        body.rotation_euler.z = sway
        body.rotation_euler.y = .05 * amp * wave(.4, beat)          # a little roll with the beat
        body.location.z = .010 * amp * wave(.3, beat)
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        body.rotation_euler.z += .20 * turn
        body.rotation_euler.y += .34 * turn                          # a shark banks into its turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .26 * e
        if clip == 'Attack':
            body.location.y = .10 * wind - .34 * peak
            body.rotation_euler.x = .07 * wind - .05 * peak
        if clip == 'Heavy':
            body.rotation_euler.y = -.16 * wind + .30 * peak
            body.location.y = .16 * wind - .30 * peak
        if clip == 'Parry':
            body.rotation_euler.y = -.32 * e
            body.rotation_euler.z = .18 * e
        if clip == 'Guard':
            body.rotation_euler.x = .05 * (1 - cos(p))
            body.rotation_euler.y = .04 * sin(p)
        if clip == 'Dodge':
            body.rotation_euler.y = .55 * e
            body.rotation_euler.z = -.40 * e
            body.location.x = .30 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .20 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .26 * e
            body.location.y = .12 * e
        if clip == 'Breath':
            body.rotation_euler.x = -.10 * e
            body.location.z = .06 * e
        if clip == 'Ability':
            body.location.y = -.26 * e - .05 * saw
            body.rotation_euler.y = .22 * e * sin(p * 3)             # the saw: a rolling drag
        if clip == 'Grab':
            body.location.y = -.12 * env - .04 * saw
            body.rotation_euler.y = .10 * env * sin(p * 3)
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .05 * e
        # A dead shark rolls over and goes down. The roll is the read.
        body.rotation_euler.y += 2.55 * dead
        body.rotation_euler.x += .14 * dead
        body.location.z -= .22 * dead

        pb['chest'].rotation_euler.z = -2.75 * sway + .09 * turn
        pb['chest'].rotation_euler.y = .10 * turn
        pb['skull'].rotation_euler.z = .9 * sway + .13 * turn
        if clip in ('Attack', 'Heavy'):
            pb['skull'].rotation_euler.x += -.05 * wind + .10 * peak
        if clip == 'Eat':
            # The mouthful worked to the back of the mouth while it is open, and then the swallow:
            # the shut jaw, a lift of the head and a wave that runs back down the throat behind it.
            pb['skull'].rotation_euler.z += .07 * sin(p * 2) * (1 - swallow)
            pb['skull'].rotation_euler.x += -.09 * swallow
            pb['chest'].rotation_euler.x += .05 * swallow
            body.rotation_euler.x += -.04 * swallow
        if clip in ('Ability', 'Grab'):
            pb['skull'].rotation_euler.z += .06 * saw * (1 if clip == 'Ability' else .6)

        for i in range(7):
            q = pb['tail_%02d' % i]
            q.rotation_euler.z = (.14 * TAIL_GAIN[i] * amp * wave(TAIL_LAG[i], beat)
                                  + turn * (.020 + i * .010)
                                  + .050 * dead * sin(i * .7))
            if clip == 'Dodge':
                q.rotation_euler.z += .16 * e * sin(i * .6 + .5)
            if clip == 'Heavy':
                q.rotation_euler.z -= .09 * peak
            if clip in ('Attack',):
                q.rotation_euler.z += .06 * wind * TAIL_GAIN[i]
        # The caudal lobes lag the peduncle, which is what makes a lunate tail read as a fin
        # rather than as a paddle rigidly bolted to the tail's last joint.
        for lobe, sign in (('caudal_upper', 1.), ('caudal_lower', -1.)):
            q = pb[lobe]
            q.rotation_euler.z = .22 * amp * wave(TAIL_LAG[6] + 1.25, beat) + .020 * turn
            q.rotation_euler.x = sign * .07 * amp * wave(TAIL_LAG[6] + 1.55, beat)
            q.rotation_euler.z += .07 * dead * sign

        pb['dorsal'].rotation_euler.z = .05 * amp * wave(1.0, beat) + .08 * turn
        pb['dorsal'].rotation_euler.y = -.10 * turn

        # The paired fins are control surfaces, not paddles: they set pitch and roll and they
        # brace, and they never take a stroke.
        for s, (side, _pts, names) in PECTORAL.items():
            up = pb[names[0]]
            sweep = .035 * amp * wave(.9, beat)
            up.rotation_euler.x = sweep
            up.rotation_euler.z = side * .04 * amp * wave(1.2, beat)
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .34 * e
            if clip in ('TurnLeft', 'TurnRight'):
                # The inside fin drops and the outside fin lifts: the bank is flown, not steered.
                up.rotation_euler.x += side * (-1 if clip == 'TurnLeft' else 1) * .40 * e
            if clip == 'Guard':
                up.rotation_euler.x -= .26 * (1 - cos(p)) / 2
                up.rotation_euler.z += side * .16 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += side * .34 * e
            if clip == 'Dodge':
                up.rotation_euler.x += (.42 if side > 0 else -.16) * e
            if clip in ('Attack', 'Heavy', 'Bite'):
                up.rotation_euler.x += .22 * wind - .30 * peak
            if clip in ('Ability', 'Grab'):
                up.rotation_euler.x += .24 * e + .08 * saw
                up.rotation_euler.z += side * .12 * e
            if clip == 'Stagger':
                up.rotation_euler.z += side * .30 * e * sin(p)
            if clip == 'Growth':
                up.rotation_euler.z += side * .26 * e
            if clip == 'Breath':
                up.rotation_euler.x += .16 * e
            up.rotation_euler.x += .30 * dead
            up.rotation_euler.z += side * .34 * dead
            pb[names[1]].rotation_euler.x = .55 * up.rotation_euler.x + .03 * amp * wave(1.5, beat)
            pb[names[2]].rotation_euler.x = .35 * up.rotation_euler.x + .05 * amp * wave(1.9, beat)
            pb[names[2]].rotation_euler.z = side * .04 * amp * wave(2.1, beat)
        for s, (side, names) in PELVIC.items():
            q = pb[names[0]]
            q.rotation_euler.x = .05 * amp * wave(1.6, beat) + .18 * dead
            q.rotation_euler.z = side * (.05 * amp * wave(1.8, beat) + .10 * turn + .22 * dead)

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
        for q in pb:
            if q.name != 'root':
                q.keyframe_insert('rotation_euler', frame=f)
            if q.name == 'body':
                q.keyframe_insert('location', frame=f)
    points = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f))
        dg = bpy.context.evaluated_depsgraph_get()
        for o in (auth, puppet):
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            co = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(co).all()
            points.extend([co.min(0), co.max(0)])
            ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]
    rig.animation_data.action = None

for c in LOOPS:
    assert seams[c] < 1e-6, (c, seams[c])
reset()
scene.frame_set(0)

# ------------------------------------------------------------- sockets ----
sockets = []
for a in anchors:
    o = bpy.data.objects.new(a['name'], None)
    bpy.context.collection.objects.link(o)
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = a['bone']
    o.matrix_world.translation = Vector(a['point'])
    o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}
    sockets.append(o)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2) + '\n')

# -------------------------------------------------------------- export ----
kwargs = dict(export_format='GLB', use_selection=True, export_animations=True,
              export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_range=False,
              export_skins=True, export_normals=True, export_texcoords=True, export_materials='EXPORT',
              export_vertex_color='NAME', export_vertex_color_name='Color', export_yup=True,
              export_extras=True)


def patch(path):
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
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for a in g['animations']:
        a['channels'] = [c for c in a['channels']
                         if c['target']['path'] != 'scale' and nodes[c['target']['node']].get('name') != 'root']
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


for o, suffix in [(auth, ''), (puppet, '.puppet')]:
    bpy.ops.object.select_all(action='DESELECT')
    for part in [o, rig] + sockets:
        part.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ID + suffix + '.glb'), **kwargs)
    patch(os.path.join(OUT, ID + suffix + '.glb'))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

meta = {
    'id': ID, 'name': 'Helicoprion', 'species': 'Helicoprion davisii',
    'provenance': 'Early Permian · Phosphoria Formation, Idaho — on this roster as a labelled relict',
    'description': 'Fusiform eugeneodont with the single tooth whorl seated in the lower-jaw '
                   'symphysis. Authored Tripo body and measured procedural volume twin share one '
                   'armature, one set of inverse binds, one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 5, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/helicoprion.png',
                'tools/triassic/creatures/helicoprion/tripo-raw/helicoprion.raw.glb'],
    'notes': [
        'An obligate swimmer: the performance is body-caudal undulation with the paired fins as '
        'control surfaces. Nothing rows, walks, hauls out or surfaces.',
        'The twin resurfaces a 0.0052-unit voxel occupancy field of the authored body, relaxes it '
        'and reduces the new topology. It reuses no source vertex or face.',
        'The lower jaw is a skinned hinge rather than a cut shell: this generation already carries '
        'a modelled oral cavity, and the whorl touches the palate, so no separating surface exists '
        'that does not slice one of them.',
        'Original albedo retained with white COLOR_0, normal relief 0.15, explicitly nonmetallic '
        'skin at roughness 0.62. Twin pigment samples triangle-local UVs to avoid seam bleed.',
        'Breath is gill ventilation held in place, not a surface breath: this animal has gills and '
        'never goes up.',
        'This generation was authored gaping, so the bind pose is a gape and not an occlusion. '
        '`restingGape` measures the closing rotation and Idle and Guard sit at it, Eat opens off it '
        'and shuts back through the bind pose to swallow, and Swim and Sprint keep the open mouth, '
        'which is what a ram-feeding eugeneodont is doing anyway. The rotation is bounded by the '
        'whorl rather than by the gape: it is the largest one that keeps 95 % of the coil under the '
        'palate, 23.5 degrees against the 18.5 the midline gape alone would ask for.',
        'What that rotation CANNOT do, and it is a defect in the generation rather than in the rig: '
        'the modelled gape is a notch cut into the front of the head, and the rim of that notch is '
        'the skull almost everywhere off the midline. At the mouth stations the jaw owns skin only '
        'within 0.018 to 0.039 of the centre line while the skull reaches 0.071 to 0.082 and its own '
        'ventral surface sits above the mandible -- there is no mandibular flank in the mesh to '
        'raise. So the jaw and the whorl come up and shut the mouth in profile, which is the view '
        'this animal is seen in, and a straight-on front view still shows an aperture that no jaw '
        'rotation can close. Fixing that is a regeneration with the mouth shut, which is what this '
        'era asks its generations for and did not get here. `JAW_PROBE=1` on this builder prints '
        'the section-by-section evidence and `GAPE_PROBE=1` the vertical crossings behind it.',
        'The whorl is the generated surface, measured and kept rather than re-modelled: 97.9 % of '
        'it is seated inside the lower jaw with only its front arc exposed, as the canonical pose '
        'draws it. Its own narrow gaps are shut here by moving its own walls together; no coil is '
        'authored. Measured on the surface rather than on its 382 vertices it is already a solid '
        'spiral saw, and what reads as holes in a render is the generated albedo. The generation '
        'also gave the animal upper-jaw teeth it did not have. See the README.',
        'The pectoral chains are measured off the fins rather than typed: each blade is found as a '
        'connected blade-thin patch, stationed by geodesic distance from its tip, mirror-checked '
        'against the other, and the joints seated on that centreline with the root pulled inside '
        'the trunk by ray parity. The blade is weighted by its own measured section and by arc '
        'length, and the skin is relaxed over the mesh graph with the head held out of it, so the '
        'jaw hinge and the whorl are exactly as measured. `validation.json` `pectoral` records the '
        'left/right parity in owned area and joint-to-skin distance.',
        'Living colours, soft tissue and movement are artistic reconstruction. Whorl-saw grip, '
        'travel and capture rules remain engine-owned.'],
}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2) + '\n')

profile_report = {
    'method': '21 exact plane-intersection envelopes of both actual meshes; 0.0052 raw-space voxel '
              'occupancy resurfacing, relaxed and reduced',
    'bodyLength': BODY_LENGTH,
    'envelopeTolerance': ENVELOPE_TOLERANCE,
    'envelopeToleranceFractionOfBodyLength': .04,
    'maximumEnvelopeDifference': worst,
    'maximumEnvelopeDifferenceFractionOfBodyLength': worst / BODY_LENGTH,
    'surfaceDistanceMax': float(max(distances)),
    'surfaceDistanceMaxFractionOfBodyLength': float(max(distances)) / BODY_LENGTH,
    'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP95FractionOfBodyLength': float(np.quantile(distances, .95)) / BODY_LENGTH,
    'anchorTolerance': ANCHOR_TOLERANCE,
    'anchorSurfaceDistances': anchor_checks,
    'stations': profile,
}
open(os.path.join(HERE, ID + '-profile.json'), 'w').write(json.dumps(profile_report, indent=2) + '\n')

report = {
    'sourceSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(),
    'sourceAlbedoSha256': albedo_sha,
    'sourceTriangles': source_triangles,
    'weldedComponents': len(component_sizes),
    'largestComponents': component_sizes[:5],
    'removedFlakeVertices': removed,
    'authoredTriangles': sum(len(p.vertices) - 2 for p in auth.data.polygons),
    'twinTriangles': sum(len(p.vertices) - 2 for p in puppet.data.polygons),
    'twinRemeshTriangles': remesh_triangles,
    'twinDecimateRatio': decimate_ratio,
    'twinVerticesHeldBackFromRelaxation': relax_masked,
    'bladeDilation': BLADE_DILATION,
    'whorl': whorl_report,
    'restingGape': RESTING_GAPE,
    'bones': len(B), 'boneNames': list(B),
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report,
    'pectoral': {
        'method': 'each fin is the largest connected blade-thin patch under the flank (a flood over '
                  'the mesh\'s own edges, thickness under %g), stationed in %d bands of geodesic '
                  'distance from its tip; the two centrelines are mirror-averaged; the root is the '
                  'base station pulled radially into the trunk until ray parity says inside and the '
                  'nearest skin is %g away; mid and tip joints sit on the centreline at %g and %g of '
                  'its arc; a vertex is the fin\'s by the blade\'s own 97th-percentile section at '
                  'its station (+%g ramp) and by arc length for the joint, and the head is held out '
                  'of the relaxation' % (THIN_PEC, PEC_BANDS, PEC_ROOT_MARGIN, PEC_MID_T, PEC_TIP_T,
                                         PEC_RADIUS_MARGIN),
        'clusterVertices': {s: PEC_MEASURED[s]['vertices'] for s in PEC_MEASURED},
        'clusterBox': {s: PEC_MEASURED[s]['box'] for s in PEC_MEASURED},
        'tip': {s: PEC_MEASURED[s]['tip'] for s in PEC_MEASURED},
        'geodesicReach': {s: round(PEC_MEASURED[s]['geodesicReach'], 4) for s in PEC_MEASURED},
        'mirrorGapRaw': round(_mirror_gap, 4), 'mirrorTolerance': PEC_MIRROR_TOLERANCE,
        'centreline': [[round(float(v), 4) for v in p] for p in _poly_L],
        'rootPullRaw': round(_root_pull, 4), 'arcRaw': round(PEC_ARC, 4),
        'joints': {s: [[round(float(v), 4) for v in p] for p in PECTORAL[s][1]] for s in PECTORAL},
        'radiusByArcFraction': [[round(a, 3), round(b, 4)] for a, b in PEC_RADIUS],
        'seatArcRaw': round(PEC_SEAT_ARC, 4), 'jointBlendRaw': round(PEC_BLEND, 4),
        'parity': PEC_PARITY,
        'relaxation': {'passes': 3, 'keep': 4, 'hold': .45, 'headHeldForwardOf': HEAD_HOLD_Y},
    },
    'envelope': {k: profile_report[k] for k in
                 ('maximumEnvelopeDifference', 'maximumEnvelopeDifferenceFractionOfBodyLength',
                  'surfaceDistanceMax', 'surfaceDistanceP95', 'envelopeTolerance')},
    'anchors': anchor_checks,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, 'helicoprion-paired.blend'))
print('HELICOPRION_REPORT', json.dumps({k: report[k] for k in
      ('sourceTriangles', 'authoredTriangles', 'twinTriangles', 'bones', 'weldedComponents')}))
print('HELICOPRION_ENVELOPE', json.dumps(report['envelope']))
print('HELICOPRION_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
