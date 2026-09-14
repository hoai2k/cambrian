"""Rebuild Helicoprion: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. Geometry coordinates are raw Tripo units (body length 1.0, head at -Y, up +Z)
until `tx()` applies the final 5x engine transform; `export_yup` then puts the head at glTF +Z.

The animal is an obligate-swimming eugeneodont, so nothing here rows, walks or surfaces: the
performance is body-caudal undulation with the paired fins as control surfaces, and the one
species-defining feature the canonical pose is greenlit on -- the single tooth whorl seated in
the lower-jaw symphysis -- rides the `jaw` bone.

Writes only this species' asset family. Touches no shared registry and performs no git operations.
"""
import bpy, bmesh, math, json, os, struct, hashlib, shutil, sys
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
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


# ------------------------------------------------------------- dentition ----
# The whorl is the one feature this subject was greenlit on, and the generated one was not it: a
# lumpy rosette rather than a legible spiral. Measured against a spiral fitted to its own
# material, 21 radial peaks stood at spacings from 10 to 35 degrees (coefficient of variation
# 0.46) and their radii rose in only 10 of 20 steps, which is a coin flip rather than growth;
# 13 of 72 angular sectors held fewer than three vertices, which is what "holes" means when it is
# counted; and the whole structure was described by 382 vertices, under three per crown for an
# animal that carried about 130. There is nothing there to repair. It is generated here instead,
# which also lets the dentition the animal never had simply not exist: Helicoprion had no upper
# teeth at all and none along the mandible outside the symphysis, because the whorl bit against a
# cartilage pad (Tapanila & Pruitt 2013).
#
# Placement is not re-litigated. The coil is fitted into the space the generated whorl already
# occupied, under the measured roof of the mouth, so it stays seated in the symphysis with only
# its front arc exposed, exactly as `whorl-audit.py` found the generated one to be.
HEAD_BAND = (-.472, -.300)
HEAD_HALF_WIDTH = .085
DOWNV, UPV = Vector((0, 0, -1)), Vector((0, 0, 1))


def build_bvh(mesh):
    return BVHTree.FromPolygons([v.co for v in mesh.vertices],
                                [p.vertices[:] for p in mesh.polygons], all_triangles=False)


def adjacency(mesh):
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


def ring_mean(P, ptr, idx):
    return np.add.reduceat(P[idx], ptr[:-1], axis=0) / np.diff(ptr).reshape(-1, 1)


def dilate(sel, ptr, idx, rings, mask):
    sel = sel.copy()
    for _ in range(rings):
        sel = (sel | (np.add.reduceat(sel[idx].astype(np.int32), ptr[:-1]) > 0)) & mask
    return sel


def feather(sel, ptr, idx, mask, ramp=(1., 1., .75, .45, .20)):
    """A relaxation weight that fades out over a few rings. A binary region leaves a ridge at its
    own boundary — the pinned ring ends up standing proud of everything that moved away from it —
    which is a new defect in place of the old one."""
    w = np.where(sel, ramp[0], 0.)
    grown = sel.copy()
    for step in range(1, len(ramp)):
        grown = dilate(grown, ptr, idx, 1, mask)
        w = np.maximum(w, np.where(grown & (w == 0.), ramp[step], 0.))
    return w


def taubin(P, ptr, idx, w, iters, lam=.55, mu=-.58):
    """Volume-preserving smoothing. A plain Laplacian run long enough to take a generated fang off
    the lip also takes the lip, because every pass shrinks what it touches; Taubin alternates a
    positive and a slightly larger negative step, which removes the high frequency — the teeth —
    and puts the low frequency — the jaw — back where it was."""
    Q = P.copy()
    w = w.reshape(-1, 1)
    for i in range(iters):
        k = lam if i % 2 == 0 else mu
        Q = Q + (ring_mean(Q, ptr, idx) - Q) * (k * w)
    return Q


def relax(P, ptr, idx, w, iters, cap):
    """Weighted Laplacian smoothing, bounded twice over: a fixed number of passes rather than a
    solve to convergence, and a hard ceiling on how far any one vertex may end up from where it
    started. Run to convergence this is a harmonic solve, which flattens whatever region it is
    given — a tooth if the region is a tooth, and the chin if the region has crept onto the chin."""
    Q = P.copy()
    w = w.reshape(-1, 1)
    for _ in range(iters):
        Q = Q * (1 - w) + ring_mean(Q, ptr, idx) * w
    d = Q - P
    n = np.linalg.norm(d, axis=1).reshape(-1, 1)
    return P + d * np.minimum(1., cap / np.maximum(n, 1e-12))


def protrusion(P, N, ptr, idx, rings=4):
    """How far a vertex stands out of its own neighbourhood along its normal: a tooth tip is a
    large positive number and smooth lining is near zero. This is the measure the dentition is
    found and then checked with."""
    M = P.copy()
    for _ in range(rings):
        M = ring_mean(M, ptr, idx)
    return ((P - M) * N).sum(1)


def write_back(mesh, P):
    for v in mesh.vertices:
        v.co = Vector(P[v.index])
    mesh.update()


class Head:
    """Four measured surfaces of the head, sampled on a grid of vertical columns: the outer skin
    above and below, the underside of the upper jaw and the top of the lower jaw. Everything the
    dentition work needs to know about where it is, it asks this rather than a constant."""

    def __init__(self, bvh, dx=.0085, dy=.0025):
        self.xs = np.arange(-HEAD_HALF_WIDTH, HEAD_HALF_WIDTH + 1e-9, dx)
        self.ys = np.arange(HEAD_BAND[0], HEAD_BAND[1] + 1e-9, dy)
        shape = (len(self.xs), len(self.ys))
        self.top = np.full(shape, np.nan)
        self.bottom = np.full(shape, np.nan)
        self.roof = np.full(shape, np.nan)
        self.floor = np.full(shape, np.nan)
        self.slab = np.full(shape, np.nan)
        self.count = np.full(shape, np.nan)
        for i, x in enumerate(self.xs):
            for j, y in enumerate(self.ys):
                down, z = [], .40
                for _ in range(12):
                    h = bvh.ray_cast(Vector((x, y, z)), DOWNV, z + .40)
                    if h[0] is None:
                        break
                    z = h[0].z - 2e-5
                    down.append(float(h[0].z))
                if not down:
                    continue
                self.top[i, j], self.bottom[i, j] = down[0], down[-1]
                self.count[i, j] = len(down)
                if len(down) >= 2:
                    self.roof[i, j] = down[1]
                up, z = [], -.40
                for _ in range(12):
                    h = bvh.ray_cast(Vector((x, y, z)), UPV, .40 - z)
                    if h[0] is None:
                        break
                    z = h[0].z + 2e-5
                    up.append(float(h[0].z))
                if len(up) >= 2:
                    self.floor[i, j] = up[1]
                    self.slab[i, j] = up[1] - up[0]

    def _at(self, field, x, y):
        i = int(np.clip(np.searchsorted(self.xs, x) - 1, 0, len(self.xs) - 1))
        j = int(np.clip(np.searchsorted(self.ys, y) - 1, 0, len(self.ys) - 1))
        return float(field[i, j])

    def outer_top(self, x, y):
        return self._at(self.top, x, y)

    def outer_bottom(self, x, y):
        return self._at(self.bottom, x, y)

    def upper_jaw_underside(self, x, y):
        return self._at(self.roof, x, y)

    def lower_jaw_top(self, x, y, thinnest=.010):
        """Only a slab of real thickness counts as the lower jaw. At a column where the whorl
        hangs below the mandible, or past the chin where there is no mandible at all, the first
        interior surface from underneath is whorl and saying so is the point."""
        return np.nan if self._at(self.slab, x, y) < thinnest else self._at(self.floor, x, y)

    def lowest_slab(self, x, y):
        """How thick the lowest solid the column passes through is. The chin is a slab; a tooth
        hanging into open water is not."""
        return self._at(self.slab, x, y)

    def column_hits(self, x, y):
        return self._at(self.top, x, y), self._at(self.bottom, x, y), self._at(self.count, x, y)

    def midline_roof(self):
        i = int(np.argmin(np.abs(self.xs)))
        keep = ~np.isnan(self.roof[i])
        return self.ys[keep], self.roof[i][keep]


# The mouth's own neighbourhood, measured off the generation: forward of the throat, inside the
# head's own half width, and below the eye, whose lowest vertex is at z +0.031.
TOOTH_ZONE_Y = (-.474, -.352)
TOOTH_ZONE_X = .095
TOOTH_ZONE_Z = .012


def oral_mask(mesh, bvh, head, reach=.12, skin=.004, chin_front=-.4375, chin_slab=.012):
    """Every vertex the dentition could be on, and no vertex of the outer skin, which is what this
    has to get right: a region that creeps onto the chin and is then smoothed takes the chin with
    it. Three tests. A vertex whose own outward normal runs straight back into the mesh is in a
    pocket — the palate faces the floor and the floor faces the palate. A vertex that is clear of
    both ends of its own vertical column is inside the head rather than on it. And in front of the
    chin, where the lower jaw has run out and a tooth on the snout *is* the ventral silhouette,
    everything under the snout counts."""
    out = np.zeros(len(mesh.vertices), dtype=bool)
    for v in mesh.vertices:
        x, y, z = v.co
        if not (HEAD_BAND[0] < y < HEAD_BAND[1]) or abs(x) > HEAD_HALF_WIDTH:
            continue
        n = Vector(v.normal[:])
        if bvh.ray_cast(Vector(v.co[:]) + n * 3e-4, n, reach)[0] is not None:
            out[v.index] = True
            continue
        t, b, hits = head.column_hits(x, y)
        if np.isnan(t) or np.isnan(b):
            continue
        if hits >= 4 and b + skin < z < t - skin:
            out[v.index] = True
        elif hits < 4 and y < chin_front and z < (t + b) / 2:
            out[v.index] = True
        elif z < b + skin and head.lowest_slab(x, y) < chin_slab:
            out[v.index] = True
    return out


def strip_dentition(mesh, bvh, head, threshold=.0018, rings=2, iterations=90, cap=.030):
    """Flatten the generated dentition back into the lining it grew out of. Positions move;
    topology, UVs and the watertight shell do not."""
    ptr, idx = adjacency(mesh)
    P = np.array([v.co[:] for v in mesh.vertices])
    N = np.array([v.normal[:] for v in mesh.vertices])
    oral = oral_mask(mesh, bvh, head)
    # A tooth is a tooth wherever it stands, and this generation put a row of them on the *outside*
    # of the chin and around the lips, where every inside-the-mouth test protects them as skin. So
    # the sweep also covers a measured zone around the mouth itself: the front of the head below
    # the eye, which is where a tooth can be and the brow, the nostril and the gill slits cannot.
    zone = ((P[:, 1] > TOOTH_ZONE_Y[0]) & (P[:, 1] < TOOTH_ZONE_Y[1])
            & (np.abs(P[:, 0]) < TOOTH_ZONE_X) & (P[:, 2] < TOOTH_ZONE_Z))
    oral = oral | zone
    d = protrusion(P, N, ptr, idx)
    seed = oral & (d > threshold)
    # Strictly inside the lining and nowhere else. The relaxation is at full strength over the
    # interior and ramps down across the last two rings to the margin, so the lip is not a step,
    # and it can reach no vertex the mask does not hold: a version that dilated past the mask
    # took the snout and the eye with it.
    interior = oral & ~dilate(~oral, ptr, idx, rings, np.ones(len(P), dtype=bool))
    # Anything that actually protrudes is taken at full strength wherever it is, including the
    # tooth rows that sit right on the margin of the lining and so fall outside the interior.
    sel = interior | dilate(seed, ptr, idx, rings, oral)
    w = feather(sel, ptr, idx, oral)
    Q = taubin(P, ptr, idx, w, iterations)
    d2 = Q - P
    n2 = np.linalg.norm(d2, axis=1).reshape(-1, 1)
    Q = P + d2 * np.minimum(1., cap / np.maximum(n2, 1e-12))
    moved = np.linalg.norm(Q - P, axis=1)
    write_back(mesh, Q)
    after = protrusion(np.array([v.co[:] for v in mesh.vertices]),
                       np.array([v.normal[:] for v in mesh.vertices]), ptr, idx)
    return {'oralVertices': int(oral.sum()), 'seedVertices': int(seed.sum()),
            'flattenedVertices': int(sel.sum()), 'protrusionThreshold': threshold,
            'maxProtrusionBefore': float(d[oral].max()),
            'maxProtrusionAfter': float(after[oral].max()),
            'protrudingBefore': int((d[oral] > threshold).sum()),
            'protrudingAfter': int((after[oral] > threshold).sum()),
            'displacementCap': cap, 'maxVertexMovement': float(moved.max())}


def strip_whorl(mesh, bvh, head, band=(-.470, -.352), half_width=.052,
                roof_clear=.0035, floor_clear=.0030, open_floor=-.082, skin=.0035,
                chin_slab=.012, rings=3, iterations=120, cap=.030):
    """Take the generated whorl mass out of the symphysis, so the coil replaces it rather than
    standing in front of it.

    The seed is the classification this directory's own audit validated — tooth material facing up
    into the mouth with the palate roofing it, which is 382 vertices of whorl and no chin — unioned
    with whatever floats in the free space between the two jaws. Growth from the seed is fenced off
    the ventral skin at every column that has a real chin under a real cavity: the first version of
    this fence was the measured floor of the mouth alone, and the floor of the mouth is exactly
    what cannot be measured where the whorl hangs below the mandible, so it took the front of the
    lower jaw with it."""
    ptr, idx = adjacency(mesh)
    P = np.array([v.co[:] for v in mesh.vertices])
    N = np.array([v.normal[:] for v in mesh.vertices])
    near = (np.abs(P[:, 0]) < half_width) & (P[:, 1] > band[0]) & (P[:, 1] < band[1])
    box = np.zeros(len(P), dtype=bool)
    sel = np.zeros(len(P), dtype=bool)
    for i in np.nonzero(near)[0]:
        x, y, z = P[i]
        roof = head.upper_jaw_underside(x, y)
        if np.isnan(roof) or z > roof - roof_clear:
            continue
        bottom, hits = head.outer_bottom(x, y), head.column_hits(x, y)[2]
        slab = head.lowest_slab(x, y)
        # Where a real cavity has a real chin under it, the chin is not the whorl and is fenced
        # off. Thickness is what says "chin": a tooth hanging into open water is also the bottom
        # of its own column, and a fence that only asked about position protected the spikes.
        if hits >= 4 and slab >= chin_slab and not np.isnan(bottom) and z < bottom + skin:
            continue
        box[i] = True
        floor = head.lower_jaw_top(x, y)
        floor = open_floor if np.isnan(floor) else floor + floor_clear
        roofed = bvh.ray_cast(Vector((x, y, z)) + UPV * 3e-4, UPV, .6)[0] is not None
        sel[i] = (floor < z) or (roofed and N[i][2] > .15)
    seed = int(sel.sum())
    sel = dilate(sel, ptr, idx, rings, box)
    Q = relax(P, ptr, idx, feather(sel, ptr, idx, box), iterations, cap)
    moved = np.linalg.norm(Q - P, axis=1)
    write_back(mesh, Q)
    return {'inTheAnteriorOralBox': int(box.sum()), 'whorlSeedVertices': seed,
            'whorlVerticesRelaxed': int(sel.sum()), 'displacementCap': cap,
            'maxVertexMovement': float(moved.max())}


def pale_uv(mesh, pixels):
    """The palest UV the body's own albedo carries. The enamel is then this animal's own white
    rather than an invented material, and the coil needs no second material to draw it."""
    uv = mesh.uv_layers.active.data
    h, w = pixels.shape[:2]
    best, coord = -1., (0., 0.)
    for p in mesh.polygons:
        for li in p.loop_indices:
            u, v = uv[li].uv
            rgb = pixels[int((v % 1) * h) % h, int((u % 1) * w) % w, :3]
            lum = float(.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2])
            if lum > best:
                best, coord = lum, (float(u), float(v))
    return coord, best


def place_coil(head, clearance=.0050, front=-.4550, back=-.3740, floor=-.0720,
               rmin=.018, rmax=.038, step=.0005):
    """The largest coil that clears the measured roof of the mouth along its whole length and
    still sits inside the space the generated whorl occupied. Searched, not guessed. The
    clearance is wider than the 0.0002 the generated whorl kept, so the separation surface the
    jaw hinge is weighted across has somewhere to run and the twin's voxel field does not weld
    the whorl to the palate."""
    yy, rr = head.midline_roof()
    ceiling = lambda y: float(np.interp(y, yy, rr))
    for R in np.arange(rmax, rmin, -step):
        best = None
        for cy in np.arange(front + R, back - R + 1e-9, .0005):
            cz = min(ceiling(cy + R * t) - clearance - R * math.sqrt(max(0., 1 - t * t))
                     for t in np.linspace(-1, 1, 81))
            if cz - R >= floor and (best is None or cz > best[1]):
                best = (float(cy), float(cz))
        if best:
            return best[0], best[1], float(R)
    raise AssertionError('no coil fits the measured cavity')


# The whorl is one logarithmic spiral of crowns in the lower-jaw symphysis: a single continuous
# series, evenly spaced in angle, growing outward, tightly enough packed that the exposed arc is
# a saw edge rather than scattered spikes (Tapanila & Pruitt 2013 and the CT behind it).
WHORL_H = .38          # crown height as a fraction of the base spiral's radius at that crown
WHORL_E = 1.32         # radial expansion per volution: less than 1 + H, so volutions overlap
WHORL_NT = 22          # crowns per volution
WHORL_RMIN = .0038     # innermost base radius worth meshing at this body size
WHORL_NPHI, WHORL_NRAD = 96, 8
WHORL_PLATE_A = .0016  # the filled coil plate is thin, and thickens with the coil:
WHORL_PLATE_B = .10    # half-thickness = A + B * radius, as a real whorl's does
WHORL_PHI = 1.05       # where the outer end of the spiral sits: up and back, inside the jaw


def coil_geometry(cy, cz, R_tip):
    K = math.log(WHORL_E) / (2 * pi)
    r_end = R_tip / (1 + WHORL_H)
    r = lambda th: r_end * math.exp(K * th)
    turns = math.log(r_end / WHORL_RMIN) / math.log(WHORL_E)
    n = int(turns * WHORL_NT)
    dth = 2 * pi / WHORL_NT
    verts, faces = [], []

    def place(rho, ang, tx):
        return (tx, cy + rho * cos(ang + WHORL_PHI), cz + rho * sin(ang + WHORL_PHI))

    # The plate. Everything inside the outermost volution's base spiral is filled, so the coil is
    # a solid disc carrying the spiral rather than a ribbon with holes between its turns.
    centre_plus = len(verts); verts.append(place(0., 0., WHORL_PLATE_A))
    centre_minus = len(verts); verts.append(place(0., 0., -WHORL_PLATE_A))
    grid = []
    for j in range(WHORL_NPHI):
        th = -2 * pi * j / WHORL_NPHI
        Rc = r(th)
        col = []
        for k in range(1, WHORL_NRAD + 1):
            u = k / WHORL_NRAD
            rho = Rc * u
            t = (WHORL_PLATE_A + WHORL_PLATE_B * rho) * (1 - u ** 4) ** .25
            if k == WHORL_NRAD:
                i = len(verts); verts.append(place(rho, th, 0.)); col.append((i, i))
            else:
                a = len(verts); verts.append(place(rho, th, t))
                b = len(verts); verts.append(place(rho, th, -t))
                col.append((a, b))
        grid.append(col)
    for j in range(WHORL_NPHI):
        j2 = (j + 1) % WHORL_NPHI
        faces.append((centre_plus, grid[j2][0][0], grid[j][0][0]))
        faces.append((centre_minus, grid[j][0][1], grid[j2][0][1]))
        for k in range(WHORL_NRAD - 1):
            faces.append((grid[j][k][0], grid[j][k + 1][0], grid[j2][k + 1][0], grid[j2][k][0]))
            faces.append((grid[j2][k][1], grid[j2][k + 1][1], grid[j][k + 1][1], grid[j][k][1]))

    # The crowns. Even angular spacing along the curve, radii growing monotonically outward, each
    # seated on the spiral's own local frame so they lean alike, and each thicker than the plate
    # so the whole series stands proud of it and reads as one spiral rather than a rim of spikes.
    flat_from = len(verts)
    crowns = []
    for i in range(n):
        th = -i * dth
        rb = r(th)
        tb = WHORL_PLATE_A + WHORL_PLATE_B * rb + .0009 + .06 * rb
        rings = [(.88 * rb, .0, .50 * dth, tb),
                 (rb * (1 + .34 * WHORL_H), -.08 * dth, .40 * dth, .78 * tb),
                 (rb * (1 + WHORL_H), -.30 * dth, .07 * dth, .22 * tb)]
        ids = []
        for rho, lean, w, t in rings:
            ids.append([len(verts) + q for q in range(4)])
            for dphi, tx in [(w, t), (-w, t), (-w, -t), (w, -t)]:
                verts.append(place(rho, th + lean + dphi, tx))
        for a, b in [(0, 1), (1, 2)]:
            for q in range(4):
                q2 = (q + 1) % 4
                faces.append((ids[a][q], ids[a][q2], ids[b][q2], ids[b][q]))
        faces.append((ids[0][3], ids[0][2], ids[0][1], ids[0][0]))
        faces.append((ids[2][0], ids[2][1], ids[2][2], ids[2][3]))
        crowns.append({'index': i, 'thetaDegrees': -i * dth * 180 / pi, 'baseRadius': rb,
                       'tipRadius': rb * (1 + WHORL_H), 'crownHeight': WHORL_H * rb,
                       'crownBaseWidth': dth * rb})
    stats = {'crowns': n, 'volutions': turns, 'crownsPerVolution': WHORL_NT,
             'angularSpacingDegrees': 360. / WHORL_NT, 'expansionPerVolution': WHORL_E,
             'crownHeightOverBaseRadius': WHORL_H, 'innerBaseRadius': r(-(n - 1) * dth),
             'outerBaseRadius': r_end, 'tipRadius': R_tip, 'plateHalfThicknessAtTheRim': WHORL_PLATE_A + WHORL_PLATE_B * r_end,
             'centreYZ': [cy, cz]}
    return verts, faces, flat_from, crowns, stats


def add_coil(obj, cy, cz, R_tip, uv, material):
    verts, faces, flat_from, crowns, stats = coil_geometry(cy, cz, R_tip)
    coil = bpy.data.meshes.new('Helicoprion tooth whorl')
    coil.from_pydata([Vector(v) for v in verts], [], list(faces))
    coil.validate()
    coil.uv_layers.new(name=obj.data.uv_layers.active.name)
    for loop in coil.uv_layers.active.data:
        loop.uv = uv
    layer = coil.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for item in layer.data:
        item.color = (1, 1, 1, 1)
    coil.materials.append(material)
    for p in coil.polygons:
        p.use_smooth = min(p.vertices) < flat_from
    o = bpy.data.objects.new('Helicoprion tooth whorl', coil)
    bpy.context.collection.objects.link(o)
    bm = bmesh.new()
    bm.from_mesh(coil)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    # The generated body is triangles throughout and the twin's pigment sampling relies on it.
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.to_mesh(coil)
    bm.free()
    base = len(obj.data.vertices)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    stats['vertices'] = len(verts)
    stats['triangles'] = sum(len(f) - 2 for f in faces)
    stats['firstVertexIndex'] = base
    stats['firstCrownVertexIndex'] = base + flat_from
    return stats, base, base + flat_from, crowns


# The trunk's own shape is taken from the generation before any of this moves a vertex: the
# centreline and the half-width are the animal, and nothing inside its mouth may move a bone.
trunk_snapshot = np.array([v.co[:] for v in auth.data.vertices])
# The protrusion sweep runs on the generation as it arrived, where a tooth is still a tooth and
# reads as one; the whorl mass comes out after it, seeded by the audit's own classification.
dentition_report = strip_dentition(auth.data, build_bvh(auth.data), Head(build_bvh(auth.data)))
_bvh_stripped = build_bvh(auth.data)
whorl_strip_report = strip_whorl(auth.data, _bvh_stripped, Head(_bvh_stripped))
# The sweep is bounded per pass, so it is run again until nothing in the mouth stands proud: a
# generated fang is longer than one pass may move a vertex, by design.
dentition_passes = []
for _ in range(2):
    _bvh_stripped = build_bvh(auth.data)
    dentition_passes.append(strip_dentition(auth.data, _bvh_stripped, Head(_bvh_stripped)))
dentition_report_second = dentition_passes[-1]
head = Head(build_bvh(auth.data))
WHORL_CY, WHORL_CZ, WHORL_R = place_coil(head)
_roof_y, _roof_z = head.midline_roof()
WHORL_ROOF = lambda y: float(np.interp(y, _roof_y, _roof_z))


# --------------------------------------------------- measured trunk shape ----
raw_co = trunk_snapshot

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


# The coil is seated now, after the trunk has been measured off a body that does not carry it, so
# the centreline and the trunk half-width are the animal's and not the whorl's. From here on the
# whorl is part of the authored mesh: the shell thickness, the skin weights and the shading each
# treat it as what it is.
ENAMEL_UV, ENAMEL_LUMINANCE = pale_uv(auth.data, pixels)
whorl_report, WHORL_FIRST, WHORL_CROWN_FIRST, whorl_crowns = add_coil(
    auth, WHORL_CY, WHORL_CZ, WHORL_R, ENAMEL_UV, mat)
WHORL_FLAT_POLYGONS = {p.index for p in auth.data.polygons
                       if min(p.vertices) >= WHORL_CROWN_FIRST}
whorl_coordinates = np.array([v.co[:] for v in auth.data.vertices[WHORL_FIRST:]])
# The join replaces the mesh datablock, so the UV layer has to be taken again: the reference held
# from the material section is to a layer that is no longer the body's.
auth_uv = auth.data.uv_layers.active

# The three things the reviewer asked for are the three things asserted here: one continuous
# series, evenly spaced along the curve, growing monotonically outward. The crowns are generated
# outermost first, so the radii run down.
_radii = [c['tipRadius'] for c in whorl_crowns]
assert len(whorl_crowns) >= 100, ('too few crowns for a legible spiral', len(whorl_crowns))
assert all(_radii[i] > _radii[i + 1] for i in range(len(_radii) - 1)), 'crowns must grow outward'
assert abs(_radii[0] / _radii[WHORL_NT] - WHORL_E) < 1e-9, 'one volution is one expansion'
# and it has to stay under the roof of the mouth it was fitted to
_clearance = min(WHORL_ROOF(float(p[1])) - float(p[2]) for p in whorl_coordinates
                 if _roof_y.min() <= p[1] <= _roof_y.max())
assert _clearance > 0, ('the whorl breaks the roof of the mouth', _clearance)
assert float(np.abs(whorl_coordinates[:, 0]).max()) < .030, 'the whorl must stay in the symphysis'
assert min(min(c.color[:3]) for c in auth.data.color_attributes['Color'].data) > .999
whorl_report.update({
    'enamelUV': list(ENAMEL_UV), 'enamelLuminance': ENAMEL_LUMINANCE,
    'roofClearance': float(_clearance), 'halfWidth': float(np.abs(whorl_coordinates[:, 0]).max()),
    'extentY': [float(whorl_coordinates[:, 1].min()), float(whorl_coordinates[:, 1].max())],
    'extentZ': [float(whorl_coordinates[:, 2].min()), float(whorl_coordinates[:, 2].max())],
    'crownHeightRange': [whorl_crowns[-1]['crownHeight'], whorl_crowns[0]['crownHeight']],
    'strippedDentition': dentition_report, 'strippedGeneratedWhorl': whorl_strip_report,
    'strippedDentitionLaterPasses': dentition_passes})


def in_whorl(p):
    """The coil's own volume. Both bodies weight it to the jaw by this rather than by vertex
    index, because the whorl *is* the mandibular symphysis and the twin, being resurfaced from an
    occupancy field, shares no vertex with the authored body to be named by."""
    x, y, z = p
    if abs(x) > .034 or (y - WHORL_CY) ** 2 + (z - WHORL_CZ) ** 2 > (WHORL_R * 1.02) ** 2:
        return False
    return z < WHORL_ROOF(y) - .0018


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
PECTORAL = {}
PELVIC = {}
for side in (-1, 1):
    s = 'L' if side > 0 else 'R'
    pts = [(side * .075, -.245, -.072), (side * .155, -.205, -.135), (side * .215, -.165, -.185)]
    names = ['pec_upper_' + s, 'pec_mid_' + s, 'pec_tip_' + s]
    PECTORAL[s] = (side, pts, names)
    for i, n in enumerate(names):
        bone(n, pts[i], 'chest' if i == 0 else names[i - 1])
    PELVIC[s] = (side, ['pelvic_' + s])
    bone('pelvic_' + s, (side * .030, .075, -.090), 'tail_01')

# The pectoral root must sit inside the trunk's own cross-section, as every builder in this
# repository is required to check, or the fin reads as floating beside the flank.
for s, (side, pts, _names) in PECTORAL.items():
    x, y, z = pts[0]
    c, w = centre(y), half_width(y)
    depth = raw_co[(np.abs(raw_co[:, 1] - y) < .012)]
    floor = float(np.quantile(depth[:, 2], .02))
    assert abs(x) < .85 * w and z > floor + .012, ('pectoral root outside the trunk', s, x, w, z, floor)
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
    if -.300 < y < -.100 and abs(x) > .055 and z < c - .010:
        s = 'L' if x > 0 else 'R'
        _side, _pts, names = PECTORAL[s]
        d = abs(x)
        span = smooth((d - .085) / .075)
        if d < .145:
            chain = {names[0]: 1.}
        elif d < .190:
            t = (d - .145) / .045
            chain = {names[0]: 1 - t, names[1]: t}
        else:
            t = min(1., (d - .190) / .045)
            chain = {names[1]: 1 - t, names[2]: t}
        return chain, blade * span
    if .020 < y < .165 and z < c - .050 and abs(x) > .006:
        s = 'L' if x > 0 else 'R'
        return {'pelvic_' + s: 1.}, blade * smooth((c - z - .065) / .030)
    if -.210 < y < .010 and z > c + .070:
        return {'dorsal': 1.}, blade * smooth((z - c - .085) / .035)
    if y > .320:
        lobe = 'caudal_upper' if z > c else 'caudal_lower'
        return {lobe: 1.}, blade * smooth((abs(z - c) - .030) / .050) * smooth((y - .325) / .035)
    return None


def weights(p, thin):
    x, y, z = p
    w = dict(axial(y))
    fin = fin_weights(p, thin)
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
    # The whorl is not a fin. Its plate and crowns are authored thick enough to survive the field
    # already, and dilating them would close the clearance it keeps under the palate and weld the
    # two together in the twin.
    if v.index >= WHORL_FIRST:
        continue
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
    q3 = [Vector((*auth_uv.data[j].uv, 0)) for j in poly.loop_indices]
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
for o, thin in [(auth, thickness), (puppet, puppet_thickness)]:
    for n in B:
        o.vertex_groups.new(name=n)
    influences, owners = [], {}
    for v in o.data.vertices:
        # The whorl is one rigid structure set in the symphysis: it rides the jaw and nothing else.
        w = ({'jaw': 1.} if (o is auth and v.index >= WHORL_FIRST) or in_whorl(v.co)
             else weights(v.co, float(thin[v.index])))
        influences.append(len(w))
        for n, value in w.items():
            o.vertex_groups[n].add([v.index], value, 'REPLACE')
            owners[n] = owners.get(n, 0) + 1
    for v in o.data.vertices:
        v.co = tx(v.co)
    for p in o.data.polygons:
        # Flat on the crowns, so a tooth has edges; smooth everywhere else, the plate included.
        p.use_smooth = o is not auth or p.index not in WHORL_FLAT_POLYGONS
    mod = o.modifiers.new('Shared articulated skeleton', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    weight_report[o.name] = {'maxInfluences': max(influences), 'vertices': len(influences),
                             'verticesPerBone': owners}

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
# The swallow point is measured onto the floor of the throat rather than held at a constant. It
# used to sit in mid-cavity and land on tooth material; with the generated dentition gone there is
# nothing there, and an anchor must be on the surface it names.
_SWALLOW_Y = -.362
_SWALLOW_Z = head.lower_jaw_top(0., _SWALLOW_Y) + .004
assert not np.isnan(_SWALLOW_Z), 'no measurable throat floor under the swallow anchor'
ANCHOR_POINTS = {'anchor_mouth': ('jaw', (0, -.428, -.022), 'mouth'),
                 'anchor_mouth_inside': ('skull', (0, _SWALLOW_Y, _SWALLOW_Z), 'swallow'),
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
        if clip == 'Death':
            amp *= 1 - dead

        # --- the whorl. The jaw only ever opens: the tooth spiral all but touches the palate in
        # the bind pose, which is where a eugeneodont's occlusion actually is.
        opening = .012 * (1 - cos(p)) if loop else 0.
        if clip == 'Eat':
            opening = .20 * (1 - cos(p * 2))
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
            pb['skull'].rotation_euler.z += .10 * sin(p * 2)
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
        'a modelled oral cavity, and the whorl sits at occlusion under the palate, so the mouth '
        'only ever opens.',
        'Original albedo retained with white COLOR_0, normal relief 0.15, explicitly nonmetallic '
        'skin at roughness 0.62. Twin pigment samples triangle-local UVs to avoid seam bleed.',
        'Breath is gill ventilation held in place, not a surface breath: this animal has gills and '
        'never goes up.',
        'The tooth whorl is generated here rather than inherited: one logarithmic spiral of 149 '
        'crowns at a constant 16.36 degrees of spacing, growing monotonically outward on a filled '
        'plate, seated in the space the generation put its own whorl in. 99.0 % of it is inside '
        'the lower jaw with only its front arc exposed, as the canonical pose draws it. The '
        'generated whorl it replaces was a rosette of 382 vertices whose crown radii rose in ten '
        'steps of twenty; the dentition the animal never had -- upper jaw, and the mandible '
        'outside the symphysis -- is smoothed back into the lining. See the README.',
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
    'bones': len(B), 'boneNames': list(B),
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report,
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
print('HELICOPRION_WHORL', json.dumps({k: whorl_report[k] for k in
      ('crowns', 'volutions', 'crownsPerVolution', 'angularSpacingDegrees', 'expansionPerVolution',
       'innerBaseRadius', 'outerBaseRadius', 'tipRadius', 'roofClearance', 'vertices')}))
print('HELICOPRION_STRIP', json.dumps(whorl_report['strippedDentition']))
print('HELICOPRION_STRIP2', json.dumps(whorl_report['strippedDentitionLaterPasses'][-1]))
print('HELICOPRION_WHORLSTRIP', json.dumps(whorl_report['strippedGeneratedWhorl']))
print('HELICOPRION_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
