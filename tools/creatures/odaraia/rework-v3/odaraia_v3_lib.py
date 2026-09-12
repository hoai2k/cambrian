"""Odaraia V3 production rig — shared, deterministic authoring library.

Recovers the accepted material02 (M02) limb curves, interval provenance and
landmark coordinates from `build_clay02.py`'s formulas **without executing its
scene creation**, and supplies the bone table, controlled skin weights, the
metachronal motion language and the clip timing table used by `rig_v3.py`,
`actions_v3.py`, `lod_v3.py` and `export_v3.py`.

Coordinates are the M02 authoring convention, unchanged: +Y up / anatomical
ventral (the animal swims inverted), +Z forward, X lateral.

Nothing here reads the wall clock or `random` without an explicit seed.
"""
from math import sin, cos, pi, exp, atan2, hypot
import random

from mathutils import Vector

# --------------------------------------------------------------------------
# Recovered M02 formulas. Verified against the loaded mesh by rig_v3.py.
# --------------------------------------------------------------------------

PAIRS = 32
INTERVALS = 20
#: Visible endopod interval boundaries, exactly as authored.
BOUNDS = [(q / INTERVALS) ** 1.22 for q in range(INTERVALS + 1)]
#: The four serial endopod deform regions, at q = 0 -> 6 -> 13 -> 17 -> 20.
STATION_Q = (0, 6, 13, 17, 20)
STATION_U = tuple(BOUNDS[q] for q in STATION_Q)
SEGMENTS = ('prox', 'mid', 'dist', 'tip')
#: Exopod (paddle) stations u = 0 -> .55 -> 1.
PADDLE_U = (0.0, 0.55, 1.0)
PADDLE_SEGMENTS = ('base', 'tip')
SIDES = ((-1, 'L'), (1, 'R'))


def bezier(a, b, c, d, t):
    return (1 - t) ** 3 * Vector(a) + 3 * t * (1 - t) ** 2 * Vector(b) + 3 * t * t * (1 - t) * Vector(c) + t ** 3 * Vector(d)


class Limb:
    """One authored biramous limb: its endopod curve, paddle curve and provenance."""

    def __init__(self, i, s, label):
        self.index = i                      # 0-based segment index
        self.number = i + 1                 # 01..32 as used in names
        self.side = s                       # -1 left, +1 right
        self.label = label
        t = i / (PAIRS - 1)
        self.t = t
        self.z = 1.40 - 3.47 * t
        self.body_r = .24 * (1 - .59 * t) + .025 * sin(pi * t)
        self.base_reach = (1.10 - .44 * t) * (1.07 if i < 5 else 1)
        self.wave = sin(i * .63 + (0 if s < 0 else .85))
        self.reach = self.base_reach * (1 + .105 * self.wave)
        self.sweep = .13 * sin(i * .63 + .55 + (0 if s < 0 else .85))
        self.root = Vector((s * self.body_r * .79, .105 - .075 * t, self.z))
        self.knee = Vector((s * (.335 - .07 * t), self.reach * .75, self.z - .09 + self.sweep * .28))
        self.dist = Vector((s * (.275 - .035 * t), self.reach * .94, self.z + .32 + self.sweep))

    # -- endopod -----------------------------------------------------------
    def endopod_at(self, u):
        a, knee, d, s, reach = self.root, self.knee, self.dist, self.side, self.reach
        if u < .58:
            return bezier(a, a + Vector((s * .085, reach * .29, -.025)),
                          knee - Vector((s * .018, reach * .17, .055)), knee, u / .58)
        return bezier(knee, knee + Vector((-s * .015, reach * .24, .025)),
                      d + Vector((s * .028, reach * .055, -.10)), d, (u - .58) / .42)

    def endopod_radius(self, u, collar=1.0):
        return (.033 * (1 - .63 * u)) * (1 - .27 * self.t) * collar

    #: The exact ordered loft points M02 used for the endopod shaft.
    def endopod_loft(self):
        pts, rads = [], []
        for q in range(INTERVALS):
            for frac in (0, .30, .70):
                u = BOUNDS[q] * (1 - frac) + BOUNDS[q + 1] * frac
                pts.append(self.endopod_at(u))
                rads.append(self.endopod_radius(u, .80 if frac == 0 else 1.0))
        pts.append(Vector(self.dist))
        rads.append(.008 * (1 - .25 * self.t))
        return pts, rads

    #: u of each loft ring, in mesh vertex order.
    def endopod_loft_u(self):
        us = []
        for q in range(INTERVALS):
            for frac in (0, .30, .70):
                us.append(BOUNDS[q] * (1 - frac) + BOUNDS[q + 1] * frac)
        us.append(1.0)
        return us

    # -- exopod / paddle ---------------------------------------------------
    def paddle_at(self, u):
        s, t, z, sweep, wave, br = self.side, self.t, self.z, self.sweep, self.wave, self.base_reach
        return bezier(self.root, self.root + Vector((s * .12, br * .24, -.11)),
                      (s * (.45 - .10 * t), br * .62, z - .31 + sweep * .35),
                      (s * (.48 - .12 * t), br * (.78 + .065 * wave), z - .40 + sweep * .55), u)

    def paddle_width(self, u):
        return .007 + (.040 - .012 * self.t) * sin(pi * u) ** .78

    def paddle_thick(self, u):
        return .004 + (.008 - .003 * self.t) * sin(pi * u)

    # -- endites -----------------------------------------------------------
    #: The 16 endite stations M02 resolves, q = 4..19, at interval centres.
    ENDITE_Q = tuple(range(4, INTERVALS))

    def endite_u(self, q):
        return (BOUNDS[q] + BOUNDS[q + 1]) * .5


def limbs():
    out = []
    for i in range(PAIRS):
        for s, label in SIDES:
            out.append(Limb(i, s, label))
    return out


LIMBS = limbs()


def limb_of(number, label):
    for l in LIMBS:
        if l.number == number and l.label == label:
            return l
    raise KeyError((number, label))


# --------------------------------------------------------------------------
# Other recovered landmarks (trunk, shell, head, mouth, tail, eyes).
# --------------------------------------------------------------------------

TRUNK_RINGS = 32 * 8 + 1
TRUNK_NS = 32
TRUNK_Z0, TRUNK_Z1 = 1.52, 1.52 - 3.67          # 1.52 -> -2.15


def trunk_z(k):
    return 1.52 - 3.67 * (k / (TRUNK_RINGS - 1))


def trunk_profile(t):
    r = .24 * (1 - .59 * t) + .025 * sin(pi * t)
    ridge = 1 + .075 * cos(2 * pi * 32 * t) - .025 * cos(4 * pi * 32 * t)
    cy = .015 + .025 * sin(pi * t) - .065 * t * t
    return r, ridge, cy


#: Free (uncovered) trunk begins at the shell's posterior aperture.
SHELL_REAR_Z = -1.39
SHELL_FRONT_Z = 1.80
TRUNK_FREE_Z = (-1.39, -1.64, -1.89, -2.12)     # three serial controls
TAIL_TERMINAL_Z = (-2.12, -2.62)
HEAD_CENTRE = Vector((0, .005, 1.78))
HEAD_SCALE = Vector((.345, .27, .43))
EYE_CENTRE = {'L': Vector((-.50, -.035, 2.205)), 'R': Vector((.50, -.035, 2.205))}
LABRUM_BASE = Vector((0, .216, 2.075))
LABRUM_TIP = Vector((0, .25, 1.80))
MANDIBLE_CENTRE = {'L': Vector((-.14, .25, 1.68)), 'R': Vector((.14, .25, 1.68))}
CENTRAL_TOOTH = Vector((0, .27, 1.68))
LOBE_CENTRE = {'L': Vector((-.094, .208, 1.49)), 'R': Vector((.094, .208, 1.49))}


def maxilla_curve(s, u):
    """The authored maxillary brush shaft, u in [0,1]."""
    return bezier((s * .21, .15, 1.52), (s * .36, .27, 1.53), (s * .30, .39, 1.72), (s * .19, .35, 1.82), u)


TAIL_BLADES = {
    'L': ((-.04, -.08, -2.48), (-.38, -.11, -2.62), (-.79, -.09, -2.76), (-.94, -.08, -3.05)),
    'R': ((.04, -.08, -2.48), (.38, -.11, -2.62), (.79, -.09, -2.76), (.94, -.08, -3.05)),
    'dorsal': ((0, -.07, -2.49), (0, -.36, -2.62), (0, -.76, -2.65), (0, -.98, -2.99)),
}


def tail_blade_at(key, u):
    a, b, c, d = TAIL_BLADES[key]
    return bezier(a, b, c, d, u)


# --------------------------------------------------------------------------
# The rigid U-shaped valve, recovered exactly from the authored loft so that
# clearance is measured against the shell the animal actually has: closed
# dorsally and laterally, open along the ventral channel the limbs pass through
# and open at both end apertures.
# --------------------------------------------------------------------------

def shell_probe(p):
    """(t, theta, limit, w, h, thick, radiusRatio) for a point in shell bind space."""
    x, y, z = p[0], p[1], p[2]
    t = (z + 1.39) / (1.88 + 1.39)
    theta = 0.0
    w = h = limit = edge = 0.0
    for _ in range(5):
        t = min(1.0, max(0.0, t))
        w = .38 + .50 * sin(pi * t) ** .78 + .15 * t
        h = .43 + .19 * sin(pi * t) + .08 * t
        limit = 2.12 + .19 * sin(pi * t) - .09 * t
        theta = atan2(x / w, -(y + .025) / h)
        edge = min(1.0, abs(theta) / limit)
        front = 1.80 + .24 * edge ** 2 + .08 * cos(theta)
        rear = -1.39 + .43 * edge ** 2
        t = (z - rear) / (front - rear)
    thick = .021 + .016 * edge ** 8 + .008 * (sin(pi * t) ** 2)
    r = hypot(x / max(1e-6, w - thick), (y + .025) / max(1e-6, h - thick))
    return t, theta, limit, w, h, thick, r


def shell_rim_points(samples=96):
    """Both free ventral margins and both wall layers, for margin clearance."""
    out = []
    for k in range(samples + 1):
        t = k / samples
        w = .38 + .50 * sin(pi * t) ** .78 + .15 * t
        h = .43 + .19 * sin(pi * t) + .08 * t
        limit = 2.12 + .19 * sin(pi * t) - .09 * t
        for sign in (-1, 1):
            theta = sign * limit
            edge = 1.0
            front = 1.80 + .24 + .08 * cos(theta)
            rear = -1.39 + .43
            z = rear * (1 - t) + front * t
            thick = .021 + .016 + .008 * (sin(pi * t) ** 2)
            for inset in (0.0, thick):
                out.append((( w + .015 - inset) * sin(theta), -.025 - (h + .015 - inset) * cos(theta), z))
    return out


SHELL_RIM = shell_rim_points()


def shell_gap(p):
    """Signed clearance for one point against the rigid valve.

    Inside the enclosed band the value is how far the point still is from the
    inner wall (negative means it has pushed through). In the open ventral
    channel and at the two apertures there is no wall to cross, so the value is
    the distance to the nearest free margin instead, which is what actually
    limits a limb passing out of the valve. Returns (gap, region)."""
    t, theta, limit, w, h, thick, r = shell_probe(p)
    if t < .02 or t > .98:
        region = 'aperture'
    elif abs(theta) < limit * .96:
        return (1 - r) * min(w, h), 'enclosed'
    else:
        region = 'channel'
    best = 1e9
    for q in SHELL_RIM:
        d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
        if d < best:
            best = d
    return best ** .5, region


# --------------------------------------------------------------------------
# Bone table. 406 bones exactly, named as the production plan's table.
# --------------------------------------------------------------------------

def limb_bone(number, label, seg):
    return f'limb_{number:02d}_{label}_{seg}'


def paddle_bone(number, label, seg):
    return f'paddle_{number:02d}_{label}_{seg}'


def trunk_parent_for(z):
    """Which trunk control owns tissue at station z."""
    if z >= TRUNK_FREE_Z[0]:
        return 'body_core'
    for i in range(3):
        if z >= TRUNK_FREE_Z[i + 1] or i == 2:
            return f'trunk_free_{i + 1:02d}'
    return 'trunk_free_03'


def build_bone_table():
    """(name -> (head, tail, parent, roll_reference)) in authored order."""
    B = {}

    def add(name, head, tail, parent, roll=None):
        assert name not in B, name
        B[name] = (Vector(head), Vector(tail), parent, None if roll is None else Vector(roll))
        return name

    add('root', (0, 0, 0), (0, 0, .40), None)
    add('body_core', (0, .015, 1.40), (0, -.02, -1.39), 'root')
    add('head', (0, .010, 1.52), (0, .010, 2.10), 'body_core')
    prev = 'body_core'
    for i in range(3):
        prev = add(f'trunk_free_{i + 1:02d}', (0, -.045 - .01 * i, TRUNK_FREE_Z[i]),
                   (0, -.045 - .01 * (i + 1), TRUNK_FREE_Z[i + 1]), prev)
    add('tail_terminal', (0, -.072, TAIL_TERMINAL_Z[0]), (0, -.080, TAIL_TERMINAL_Z[1]), 'trunk_free_03')
    for key, prefix in (('L', 'tail_L'), ('R', 'tail_R'), ('dorsal', 'tail_dorsal')):
        a, b, c = tail_blade_at(key, 0), tail_blade_at(key, .5), tail_blade_at(key, 1)
        add(f'{prefix}_01', a, b, 'tail_terminal')
        add(f'{prefix}_02', b, c, f'{prefix}_01')
    for s, label in SIDES:
        c = EYE_CENTRE[label]
        axis = Vector((s * .65, 0, .76)).normalized()
        add(f'eye_{label}', c - axis * .21, c + axis * .16, 'head')
    add('labrum', LABRUM_BASE, LABRUM_TIP, 'head')
    for s, label in SIDES:
        add(f'mandible_{label}', MANDIBLE_CENTRE[label] + Vector((s * .10, -.02, -.02)),
            MANDIBLE_CENTRE[label] + Vector((-s * .06, .04, .01)), 'head')
        a, b, c = maxilla_curve(s, 0), maxilla_curve(s, .55), maxilla_curve(s, 1)
        add(f'maxilla_{label}_base', a, b, 'head')
        add(f'maxilla_{label}_tip', b, c, f'maxilla_{label}_base')
    for l in LIMBS:
        parent = trunk_parent_for(l.z)
        prev = parent
        pts = [l.endopod_at(u) for u in STATION_U]
        for k, seg in enumerate(SEGMENTS):
            medial = Vector((-l.side, 0, 0))
            prev = add(limb_bone(l.number, l.label, seg), pts[k], pts[k + 1], prev, medial)
        ppts = [l.paddle_at(u) for u in PADDLE_U]
        prev = parent
        for k, seg in enumerate(PADDLE_SEGMENTS):
            prev = add(paddle_bone(l.number, l.label, seg), ppts[k], ppts[k + 1], prev, Vector((-l.side, 0, 0)))
    return B


BONE_TABLE = build_bone_table()
assert len(BONE_TABLE) == 406, len(BONE_TABLE)


# --------------------------------------------------------------------------
# Controlled skin weights.
# --------------------------------------------------------------------------

#: Collar half width, expressed in interval units (q), so blends sit on the
#: modeled collar rings and never on an endite root (which lies at q + .5).
COLLAR_Q = .45
PADDLE_COLLAR_U = .085


def q_of_u(u):
    u = max(0.0, min(1.0, u))
    return INTERVALS * (u ** (1 / 1.22))


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def endopod_weights(l, u):
    """Two-bone controlled blend across the three authored boundaries."""
    q = q_of_u(u)
    names = [limb_bone(l.number, l.label, seg) for seg in SEGMENTS]
    for k, qb in enumerate(STATION_Q[1:4]):
        if qb - COLLAR_Q < q < qb + COLLAR_Q:
            f = smooth((q - (qb - COLLAR_Q)) / (2 * COLLAR_Q))
            return {names[k]: 1 - f, names[k + 1]: f}
    if q <= STATION_Q[1]:
        return {names[0]: 1.0}
    if q <= STATION_Q[2]:
        return {names[1]: 1.0}
    if q <= STATION_Q[3]:
        return {names[2]: 1.0}
    return {names[3]: 1.0}


def endite_weights(l, q):
    """An endite is owned outright by the shaft segment it grows from."""
    return endopod_weights(l, l.endite_u(q))


def paddle_weights(l, u):
    base = paddle_bone(l.number, l.label, 'base')
    tip = paddle_bone(l.number, l.label, 'tip')
    a, b = PADDLE_U[1] - PADDLE_COLLAR_U, PADDLE_U[1] + PADDLE_COLLAR_U
    if u <= a:
        return {base: 1.0}
    if u >= b:
        return {tip: 1.0}
    f = smooth((u - a) / (b - a))
    return {base: 1 - f, tip: f}


def trunk_weights(z):
    """Covered trunk is rigid with the shell; exposed trunk blends along its
    three controls and into the terminal segment."""
    stops = [(TRUNK_FREE_Z[0] + .16, 'body_core'), (TRUNK_FREE_Z[1], 'trunk_free_01'),
             (TRUNK_FREE_Z[2], 'trunk_free_02'), (TRUNK_FREE_Z[3], 'trunk_free_03'),
             (TAIL_TERMINAL_Z[1], 'tail_terminal')]
    if z >= stops[0][0]:
        return {'body_core': 1.0}
    for i in range(len(stops) - 1):
        hi, lo = stops[i][0], stops[i + 1][0]
        if z >= lo:
            f = smooth((hi - z) / (hi - lo))
            # A wide, locally smooth junction: two controls at a time only.
            return {stops[i][1]: 1 - f, stops[i + 1][1]: f}
    return {'tail_terminal': 1.0}


def head_weights(z):
    """Head is its own frame; a narrow collar ties it to the rigid core at the
    anterior shell aperture."""
    a, b = 1.44, 1.62
    if z >= b:
        return {'head': 1.0}
    if z <= a:
        return {'body_core': 1.0}
    f = smooth((z - a) / (b - a))
    return {'body_core': 1 - f, 'head': f}


def tail_blade_weights(key, u):
    prefix = {'L': 'tail_L', 'R': 'tail_R', 'dorsal': 'tail_dorsal'}[key]
    a, b = .40, .62
    if u <= a:
        return {f'{prefix}_01': 1.0}
    if u >= b:
        return {f'{prefix}_02': 1.0}
    f = smooth((u - a) / (b - a))
    return {f'{prefix}_01': 1 - f, f'{prefix}_02': f}


def terminal_weights(z):
    a, b = TAIL_TERMINAL_Z[0], TAIL_TERMINAL_Z[0] - .14
    if z <= b:
        return {'tail_terminal': 1.0}
    if z >= a:
        return {'trunk_free_03': 1.0}
    f = smooth((a - z) / (a - b))
    return {'trunk_free_03': 1 - f, 'tail_terminal': f}


def normalise(w, limit=4):
    """<= `limit` weights per vertex, positive and summing to one."""
    items = sorted(((v, k) for k, v in w.items() if v > 1e-5), reverse=True)[:limit]
    total = sum(v for v, _ in items)
    assert total > 1e-9, w
    return {k: v / total for v, k in items}


# --------------------------------------------------------------------------
# Motion language.
# --------------------------------------------------------------------------

CLIPS = {
    'Idle': 2.4, 'Swim': 1.4, 'TurnLeft': 1.2, 'TurnRight': 1.2, 'Rise': 1.3, 'Dive': 1.3,
    'Dodge': .8, 'Guard': 1.6, 'Parry': .85, 'Attack': 1.3, 'Bite': .70, 'Heavy': 1.8,
    'Ability': 2.0, 'Eat': 3.0, 'Hit': .65, 'Stagger': 1.4, 'Moult': 3.2, 'Death': 2.8,
    'Grab': .9,
}
LOOPS = {'Idle', 'Swim', 'Guard', 'Eat', 'Ability', 'Moult', 'TurnLeft', 'TurnRight', 'Rise', 'Dive',
         'Grab'}
#: Grab holds Eat's secured carry (between the .36 "secured" and .52 "elevated carry" stations)
#: as a loop: the runtime plays it while a mouthful or a ride is held and as the one-shot on the
#: grab itself (src/render/creature.ts), and every roster model carries it.
GRAB_STATION = .40
FPS = 24
#: Attack / Eat evidence stations required by the production plan.
ATTACK_STATIONS = (0.0, .18, .42, .50, .60, .83, 1.0)
EAT_STATIONS = (0.0, .22, .36, .52, .67, .78, .88, 1.0)
DEATH_HOLD = .75

#: Traveling limb phase constants.
PAIR_LAG = .58
SIDE_OFFSET = 1.05
DISTAL_LAG = .42
PADDLE_LAG = .78

_rng = random.Random(20260912)
#: Small fixed per-pair asymmetry, drawn once, never at runtime.
PAIR_JITTER = [[_rng.uniform(-.085, .085) for _ in range(2)] for _ in range(PAIRS)]
PAIR_GAIN = [[1 + _rng.uniform(-.10, .10) for _ in range(2)] for _ in range(PAIRS)]
del _rng


def limb_phase(u, i, side_index, lag=0.0):
    """The traveling metachronal phase for pair `i` (0-based), in radians."""
    return 2 * pi * (u - lag) - PAIR_LAG * i + (SIDE_OFFSET if side_index else 0) + PAIR_JITTER[i][side_index]
