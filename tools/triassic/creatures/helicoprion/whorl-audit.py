"""What the tooth whorl actually is, measured on the generated source and on the shipped body.

Two questions, and they have different answers.

**Where does it sit?** That one was settled by this script's first version and nothing here
changes it. The proportion audit had concluded that the whorl was modelled as a toothed disc
hanging outside and below the chin — the "pizza cutter" reconstruction Tapanila & Pruitt 2013
overturned. The test is a ray, not an opinion. For every vertex in the head band, cast straight up
and straight down:

  * something above it and something below it  -> the vertex is inside the mouth cavity
  * something above it and nothing below it    -> the vertex is on the ventral silhouette
  * nothing above it                           -> the vertex is outer skin (back, flanks, snout)

A whorl seated in the symphysis is almost entirely the first case, and the generated one was:
374 of 382 vertices. What the audit had measured was the dropped mandible of an open-mouthed
generation. The whorl was in the right place.

**What shape is it?** A reviewer looking at the shipped body said: holes, and inconsistent shape.
This version measures the shape too, so the complaint is numbers before it is a fix. A whorl is one
logarithmic spiral of crowns, so:

  * fit a centre in the sagittal plane and take every vertex's angle and radius about it;
  * count the angular sectors that hold almost nothing — that is what "holes" means;
  * find the radial peaks, which are the crowns, and measure how evenly they are spaced and
    whether their radii actually grow outward, which is what a spiral means.

**And ask the same question of the surface rather than of the vertices.** The whorl is described by
382 vertices, under three per crown for an animal that carried about 130, so a gap between one
piece of whorl material and the next along a ray is mostly a gap between *vertices*. Sampling the
same faces over their area instead — `radialGapsOverTheSurface` beside `radialGapsOverTheVertices`,
both restricted to the symphyseal coil and both about one fitted centre — halves the mean gap and
takes the rays crossing a gap over 1 % of the body from 43 of 65 to 9 of 72. The surface is solid;
what reads as holes in a render is the generated albedo. See the README.

And it counts the dentition the animal never had. *Helicoprion* had no upper teeth at all — the
whorl bit against a cartilage pad — and none along the mandible outside the symphysis. Teeth are
found as protrusions: how far a vertex stands out of its own two-ring neighbourhood along its
normal. Smooth lining is near zero; a crown is not.

    node tools/triassic/creatures/helicoprion/audit.mjs --decode     # writes the unpacked body
    /opt/blender/blender -b --factory-startup --python \
        tools/triassic/creatures/helicoprion/whorl-audit.py
"""
import bpy, bmesh, json, os, sys
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(HERE, 'tripo-raw/helicoprion.raw.glb')
BUILT = os.path.join(ROOT, 'local/triassic-authoring/helicoprion/helicoprion.unpacked.glb')
SCALE = 5.

# The surface that separates palate from mandible down the head, measured in `build.py` from the
# palate above and the whorl/mouth floor below; used here only to tell upper teeth from lower.
_ZSEP = [(-.50, -.030), (-.46, -.030), (-.44, -.026), (-.43, -.013), (-.42, -.009), (-.41, -.004),
         (-.40, -.003), (-.39, -.004), (-.38, -.008), (-.37, -.009), (-.36, -.012), (-.35, -.022),
         (-.34, -.030), (-.32, -.040), (-.30, -.050)]
UPPER_JAW_FLOOR = lambda y: float(np.interp(y, [a for a, _ in _ZSEP], [b for _, b in _ZSEP]))
UP, DOWN = Vector((0, 0, 1)), Vector((0, 0, -1))
PROTRUSION = .0018      # a vertex standing this far out of its neighbourhood is a crown, not gum


def load(path, scale):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=path)
    o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.to_mesh(o.data)
    bm.free()
    if scale != 1.:
        for v in o.data.vertices:
            v.co = v.co / scale
        o.data.update()
    return o


def adjacency(me):
    n = len(me.vertices)
    ev = np.array([e.vertices[:] for e in me.edges], dtype=np.int64)
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


def protrusions(me, ptr, idx, rings=2):
    P = np.array([v.co[:] for v in me.vertices])
    N = np.array([v.normal[:] for v in me.vertices])
    M = P.copy()
    for _ in range(rings):
        M = np.add.reduceat(M[idx], ptr[:-1], axis=0) / np.diff(ptr).reshape(-1, 1)
    return ((P - M) * N).sum(1)


def islands(me, ptr, idx):
    """Which connected component each vertex belongs to, largest first. On the shipped body the
    whorl is its own set of islands, so it needs no threshold to be found."""
    label = np.full(len(me.vertices), -1, dtype=np.int64)
    order = []
    for start in range(len(me.vertices)):
        if label[start] >= 0:
            continue
        stack, members = [start], []
        label[start] = len(order)
        while stack:
            q = stack.pop()
            members.append(q)
            for j in idx[ptr[q]:ptr[q + 1]]:
                if label[j] < 0:
                    label[j] = len(order)
                    stack.append(int(j))
        order.append(members)
    biggest = int(np.argmax([len(m) for m in order]))
    return label, biggest, sorted((len(m) for m in order), reverse=True)


def radial_gaps(V, C, nb=72):
    """Walking out from the fitted centre along each of `nb` rays, how big is the largest gap
    between one piece of whorl material and the next? Run over the classified *vertices* this is
    the figure the first audit reported; run over points sampled across the same *faces* it is a
    statement about the surface instead, and the difference between the two is how much of the
    original complaint was vertex density rather than holes."""
    d = V[:, 1:3] - C
    TH, R = np.arctan2(d[:, 1], d[:, 0]), np.hypot(d[:, 0], d[:, 1])
    bins = ((TH + np.pi) / (2 * np.pi) * nb).astype(int) % nb
    g = []
    for b in range(nb):
        rs = np.sort(R[bins == b])
        if len(rs) < 2:
            continue
        g.append((b * 360. / nb, float(max(rs[0], float(np.diff(rs).max())))))
    if not g:
        return None
    v = [x for _, x in g]
    return {'rays': len(g), 'max': max(v), 'mean': float(np.mean(v)),
            'raysWithAGapOverOnePercentOfBodyLength': int(sum(1 for x in v if x > .01)),
            'worstRaysDegreesAndGap': [[a, round(x, 5)] for a, x in
                                       sorted(g, key=lambda t: -t[1])[:6]]}


def sample_faces(me, index, per_area=1.5e-7, cap=400, seed=7):
    """Points spread over the area of every face that touches the whorl, so the gap measure can
    be asked about the surface rather than about where its vertices happen to be."""
    rng = np.random.default_rng(seed)
    P = np.array([v.co[:] for v in me.vertices])
    out = []
    for p in me.polygons:
        vs = p.vertices[:]
        if not any(v in index for v in vs):
            continue
        tri = P[list(vs[:3])]
        area = float(np.linalg.norm(np.cross(tri[1] - tri[0], tri[2] - tri[0])) / 2)
        n = int(min(cap, max(6, area / per_area)))
        u = rng.random((n, 2))
        flip = u.sum(1) > 1
        u[flip] = 1 - u[flip]
        out.append(tri[0] + u[:, :1] * (tri[1] - tri[0]) + u[:, 1:] * (tri[2] - tri[0]))
    return np.vstack(out) if out else np.zeros((0, 3))


def spiral(W):
    """Fit a centre in the sagittal plane and describe the material about it: where the holes are,
    how many crowns there are, how evenly they are spaced and whether they grow outward."""
    def spread(c):
        d = W[:, 1:3] - c
        r = np.hypot(d[:, 0], d[:, 1])
        b = ((np.arctan2(d[:, 1], d[:, 0]) + np.pi) / (2 * np.pi) * 48).astype(int) % 48
        tot, n = 0., 0
        for k in range(48):
            s = r[b == k]
            if len(s) >= 4:
                tot += float(np.percentile(s, 90) - np.percentile(s, 10)); n += 1
        return tot / max(1, n), n

    lo, hi = W[:, 1:3].min(0), W[:, 1:3].max(0)
    best = None
    for gy in np.linspace(lo[0], hi[0], 41):
        for gz in np.linspace(lo[1], hi[1], 41):
            s, n = spread(np.array([gy, gz]))
            if n >= 36 and (best is None or s < best[0]):
                best = (s, gy, gz)
    C = np.array(best[1:])
    d = W[:, 1:3] - C
    TH, R = np.arctan2(d[:, 1], d[:, 0]), np.hypot(d[:, 0], d[:, 1])
    NB = 72
    bins = ((TH + np.pi) / (2 * np.pi) * NB).astype(int) % NB
    occ = [int((bins == b).sum()) for b in range(NB)]
    rmax = np.array([float(R[bins == b].max()) if (bins == b).any() else np.nan for b in range(NB)])
    peaks = []
    for b in range(NB):
        if np.isnan(rmax[b]):
            continue
        l, r2 = rmax[(b - 1) % NB], rmax[(b + 1) % NB]
        if (np.isnan(l) or rmax[b] >= l) and (np.isnan(r2) or rmax[b] > r2):
            peaks.append((b, float(rmax[b])))
    # "Holes" made into a number that means the same thing on both bodies: walking out from the
    # fitted centre along each of 72 rays, how big is the largest gap between one piece of whorl
    # material and the next before the outermost one? A filled coil closes every gap; a rosette of
    # separate spikes does not, and that gap is what a reviewer reads as a hole.
    gaps = []
    for b in range(NB):
        rs = np.sort(R[bins == b])
        if len(rs) < 2:
            continue
        gaps.append(float(max(rs[0], float(np.diff(rs).max()))))
    out = {
        'fittedCentreYZ': [float(C[0]), float(C[1])],
        'largestRadialGapPerRay': {
            'rays': len(gaps), 'max': max(gaps) if gaps else None,
            'mean': float(np.mean(gaps)) if gaps else None,
            'raysWithAGapOverOnePercentOfBodyLength': int(sum(1 for g in gaps if g > .01))},
        'medianRadialSpreadInSevenPointFiveDegreeBins': float(best[0]),
        'meanRadius': float(R.mean()),
        'radialSpreadOverMeanRadius': float(best[0] / R.mean()),
        'angularBins': NB,
        'emptyAngularBins': int(sum(1 for c in occ if c == 0)),
        'angularBinsWithFewerThanThreeVertices': int(sum(1 for c in occ if c < 3)),
        'occupancy': occ,
        'radialMaxPerBin': [None if np.isnan(v) else float(v) for v in rmax],
        'radialPeakCount': len(peaks),
        'radialPeaks': [{'binDegrees': b * 360 // NB, 'radius': v} for b, v in peaks],
    }
    if len(peaks) > 1:
        order = sorted(peaks)
        gaps = [((order[(i + 1) % len(order)][0] - order[i][0]) % NB) * 360 / NB
                for i in range(len(order))]
        rs = [v for _, v in order]
        mono = sum(1 for i in range(len(rs) - 1) if rs[i + 1] > rs[i])
        out['peakAngularSpacingDegrees'] = {
            'min': min(gaps), 'max': max(gaps), 'mean': float(np.mean(gaps)),
            'coefficientOfVariation': float(np.std(gaps) / np.mean(gaps))}
        out['peakRadii'] = {'min': min(rs), 'max': max(rs), 'ratioMaxOverMin': max(rs) / min(rs)}
        out['peakRadiusRisesInStepsOf'] = [mono, len(rs) - 1]
    return out


def audit(o, whorl_by_island):
    me = o.data
    co = np.array([v.co[:] for v in me.vertices])
    nr = np.array([v.normal[:] for v in me.vertices])
    length = float(co[:, 1].max() - co[:, 1].min())
    snout = float(co[:, 1].min())
    bvh = BVHTree.FromPolygons([v.co for v in me.vertices],
                               [p.vertices[:] for p in me.polygons], all_triangles=False)
    ptr, idx = adjacency(me)
    prot = protrusions(me, ptr, idx)
    label, biggest, sizes = islands(me, ptr, idx)

    rows = []
    for i, p in enumerate(co):
        if not (-.47 < p[1] < -.33):
            continue
        s = Vector(p)
        above = bvh.ray_cast(s + UP * 3e-4, UP, .6)
        below = bvh.ray_cast(s + DOWN * 3e-4, DOWN, .6)
        rows.append({'i': i, 'frac': (p[1] - snout) / length, 'x': float(p[0]), 'y': float(p[1]),
                     'z': float(p[2]), 'nz': float(nr[i][2]),
                     'above': None if above[0] is None else float(above[3]),
                     'below': None if below[0] is None else float(below[3])})

    if whorl_by_island:
        # The shipped whorl is generated as its own islands, so it names itself.
        whorl = [r for r in rows if label[r['i']] != biggest]
        whorl_index = set(int(i) for i in np.nonzero(label != biggest)[0])
    else:
        whorl = [r for r in rows if r['above'] is not None and r['nz'] > .15 and r['y'] < -.36]
        whorl_index = set(r['i'] for r in whorl)
    enclosed = [r for r in whorl if r['below'] is not None]
    exposed = [r for r in whorl if r['below'] is None]

    ventral = {}
    for r in rows:
        if r['below'] is None and r['above'] is not None:
            key = round(r['y'], 3)
            ventral[key] = min(ventral.get(key, 1.), r['z'])

    # Dentition the animal did not have, found as protrusion rather than by pointing at a row.
    upper = [r for r in rows if r['i'] not in whorl_index and r['above'] is not None
             and r['below'] is not None and r['nz'] < -.15 and r['y'] < -.35
             and r['z'] > UPPER_JAW_FLOOR(r['y']) - .40 * abs(r['x'])]
    lower = [r for r in rows if r['i'] not in whorl_index and r['above'] is not None
             and r['nz'] > .15 and r['y'] < -.35 and abs(r['x']) >= .030
             and r['z'] < UPPER_JAW_FLOOR(r['y']) - .40 * abs(r['x'])]
    report = {
        'bodyLength': length, 'snoutY': snout,
        'vertices': len(me.vertices), 'connectedComponents': len(sizes),
        'largestComponents': sizes[:4],
        'whorlVertices': len(whorl),
        'whorlEnclosedByTheChin': len(enclosed),
        'whorlOnTheVentralSilhouette': len(exposed),
        'whorlEnclosedFraction': len(enclosed) / max(1, len(whorl)),
        'whorlExtentFractionOfBodyLength': [min(r['frac'] for r in whorl),
                                            max(r['frac'] for r in whorl)],
        'exposedArcFractionOfBodyLength': ([min(r['frac'] for r in exposed),
                                            max(r['frac'] for r in exposed)] if exposed else None),
        'clearanceAboveTheChin': {
            'method': 'for each enclosed whorl vertex, the gap to the chin skin straight below it',
            'min': min((r['below'] for r in enclosed), default=None),
            'median': float(np.median([r['below'] for r in enclosed])) if enclosed else None,
            'max': max((r['below'] for r in enclosed), default=None)},
        'whorlLateralHalfWidth': max(abs(r['x']) for r in whorl),
        'symphysealMassWithinThreeHundredthsOfTheMidline':
            sum(1 for r in whorl if abs(r['x']) < .030) / max(1, len(whorl)),
        'upperJawSurfaceVertices': len(upper),
        'upperJawToothMaterial': sum(1 for r in upper if prot[r['i']] > PROTRUSION),
        'upperJawMaximumProtrusion': max((float(prot[r['i']]) for r in upper), default=None),
        'lowerJawSurfaceVerticesOutsideTheSymphysis': len(lower),
        'lowerJawToothMaterialOutsideTheSymphysis':
            sum(1 for r in lower if prot[r['i']] > PROTRUSION),
        'lowerJawMaximumProtrusionOutsideTheSymphysis':
            max((float(prot[r['i']]) for r in lower), default=None),
        'protrusionThreshold': PROTRUSION,
        'spiral': spiral(np.array([[r['x'], r['y'], r['z']] for r in whorl])),
    }
    # The same rays, over the area of the same faces. The symphyseal restriction is what makes
    # the two comparable with the coil the animal actually carries rather than with the rows of
    # generated lip teeth the vertex classifier also picks up.
    symph = set(r['i'] for r in whorl if abs(r['x']) < .032)
    C = np.array(report['spiral']['fittedCentreYZ'])
    Wv = np.array([[r['x'], r['y'], r['z']] for r in whorl if r['i'] in symph])
    report['spiral']['symphysealVertices'] = len(Wv)
    report['spiral']['radialGapsOverTheVertices'] = radial_gaps(Wv, C) if len(Wv) else None
    S = sample_faces(me, symph)
    report['spiral']['surfaceSamples'] = int(len(S))
    report['spiral']['radialGapsOverTheSurface'] = radial_gaps(S, C) if len(S) else None
    stations = []
    for y in np.arange(-.47, -.325, .01):
        band = [r for r in whorl if abs(r['y'] - y) < .005]
        chin = [z for k, z in ventral.items() if abs(k - y) < .005]
        low = min((r['z'] for r in band), default=None)
        floor = min(chin) if chin else None
        stations.append({
            'y': float(y), 'frac': float((y - snout) / length),
            'whorlVertices': len(band), 'whorlLowestZ': low, 'ventralSilhouetteZ': floor,
            'whorlAboveTheSilhouetteBy': None if low is None or floor is None else low - floor})
    report['stations'] = stations
    return report


out = {
    'method': 'vertical ray casts up and down from every vertex in the head band; a vertex with '
              'mesh above it and mesh below it is inside the mouth, one with mesh above and '
              'nothing below is on the ventral silhouette. Shape is measured about a centre '
              'fitted in the sagittal plane; dentition is found as protrusion out of a vertex\'s '
              'own two-ring neighbourhood along its normal.',
    'source': {'file': 'tools/triassic/creatures/helicoprion/tripo-raw/helicoprion.raw.glb',
               'note': 'the generation, before the builder touches it'},
    'built': {'file': 'local/triassic-authoring/helicoprion/helicoprion.unpacked.glb',
              'note': 'the shipped authored body, decoded by audit.mjs --decode; coordinates '
                      'divided by the builder\'s 5x so both bodies are measured in one space'},
}
out['source'].update(audit(load(RAW, 1.), whorl_by_island=False))
if os.path.exists(BUILT):
    out['built'].update(audit(load(BUILT, SCALE), whorl_by_island=False))
else:
    out['built']['error'] = 'not found: run audit.mjs --decode first'
open(os.path.join(HERE, 'whorl-audit.json'), 'w').write(json.dumps(out, indent=2) + '\n')

brief = ['whorlVertices', 'whorlEnclosedFraction', 'whorlOnTheVentralSilhouette',
         'upperJawToothMaterial', 'lowerJawToothMaterialOutsideTheSymphysis']
for side in ('source', 'built'):
    if 'whorlVertices' not in out[side]:
        print(side, out[side].get('error'))
        continue
    s = out[side]
    print(side, json.dumps({k: s[k] for k in brief}))
    print(' ', json.dumps({k: s['spiral'][k] for k in
                           ('angularBinsWithFewerThanThreeVertices', 'radialPeakCount',
                            'radialSpreadOverMeanRadius', 'peakRadiusRisesInStepsOf',
                            'largestRadialGapPerRay', 'radialGapsOverTheVertices',
                            'radialGapsOverTheSurface')
                           if k in s['spiral']}))
