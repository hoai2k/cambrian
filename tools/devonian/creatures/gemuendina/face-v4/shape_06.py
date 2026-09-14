"""Sculpt port: lower the head dome and thin/shift the nose per
`docs/viewer-sculpt.md` and `/home/user/devonian-authoring/sculpts/gemuendina-sculpt.json`.

This is a THIRD deform pass, stacked on top of `shape_05.deform` + `shape_05.apply_oral`
exactly the way shape_05 itself was stacked on shape_02/shape_04 — never edits shape_05.py.
It runs on the already-produced study-05 body (dorsal/ventral skin + oral cavity already
built), so unlike shape_05 it does not need to re-derive the surface from
`sculpt_spec_02.skin()`; it scales/shifts the vertices that are already there.

Ground truth is what `npm run sculpt:measure` actually samples, not a hand read of the
sculpt JSON's per-station `percent` field: the measure tool's 20 stations are 20 EVENLY
SPACED windows across the model's own bounding box, each reporting whichever vertex is
tallest/lowest/widest inside it — not "the vertex sculpt_spec_02 nominally calls station
15". Because `shape_05`'s own deform already warps this region a great deal (a vertex
that started around GLB axis 1.79 ends up out at the nose tip, axis 2.10), the vertex
that actually lands in each station's window sits at a different pre-existing Blender y
than the station's nominal axis. The control points below use each control's *actual*
post-shape_05 y (found by sampling `sculpt_spec_02.make_mesh()` + `shape_05.deform` and
locating the argmax/argmin/argwidth vertex per window — see the session's diagnostic,
not re-derivable from this file alone), not the station's nominal `-axis`. The target
ratios themselves are the sculpt-measure tool's own "asked" column (model vs the sculpt's
edited curves, run against the shipped GLB) — station 15 dorsal -14.5%, 16 -14.6%, 18
-8.4%, 19 dorsal -17%/ventral +12%/width +21%, nose shifted forward +0.08 — which is what
the ticket's prose describes; the JSON's raw per-station `percent` fields read differently
because a piecewise-linear target curve sampled at a shifted axial grid is not the same
question as "how far this station's value moved".

Two stations (16 and 17) carry a *pulled tangent* in the sculpt export. sculpt_spec_02's
own `profile()` is a fixed monotone Catmull-Rom/Fritsch-Carlson spline with no per-point
tangent parameter — there is nothing in this builder's profile-table machinery for a tangent
override to bind to. Per the intake rule ("if the builder cannot express something, say so
rather than faking it") those two tangents are NOT implemented; the value changes at those
stations are, using the builder's own automatic slope through the control points below.
"""
from mathutils import Vector
from sculpt_spec_02 import profile

# Control points are (Blender y, factor) or (Blender y, delta), ascending in y (nose first,
# most negative). `profile()` clamps outside its first/last point. y's are the ACTUAL
# post-shape_05 position of the vertex the measure tool samples for that station (see
# module docstring), not the station's nominal axis.
DORSAL_FACTOR = [
    (-2.20, 0.677),    # plateau covering the axis-max tip vertex (y=-2.105): station 19
    (-2.027, 0.677),   # station 19's dorsal-argmax vertex
    (-1.652, 0.981),   # station 18's dorsal-argmax vertex
    (-1.340, 1.000),   # station 17's dorsal-argmax vertex: unchanged (tangent pull not expressible)
    (-1.068, 0.841),   # station 16's dorsal-argmax vertex: -14.6%
    (-0.780, 0.821),   # station 15's dorsal-argmax vertex: -14.5%
    (-0.635, 1.000),   # station 14's dorsal-argmax vertex: unchanged — anchors the fade-back
]
WIDTH_FACTOR = [
    (-2.20, 1.186),    # covers the tip
    (-1.944, 1.186),   # station 19's width-argmax vertex: +16%
    (-1.627, 1.000),   # station 18's width-argmax vertex: unchanged
    (-1.312, 1.000),   # station 17's width-argmax vertex: unchanged
]
# Ventral is 0% at every station in this sculpt (see docs/viewer-sculpt.md export above) —
# no ventral factor is applied; the `deform()` below never scales the ventral region.
# Nose shifted forward (GLB +z, i.e. Blender -y). Localised to the tip: the plateau covers
# both the vertex that actually sets the model's axis-max (y=-2.105) and station 19's
# dorsal-argmax vertex (y=-2.027), fading to zero by station 18's argmax (y=-1.652) so
# nothing behind the nose itself moves.
NOSE_SHIFT_Y = -0.08
SHIFT_DELTA = [
    (-2.30, NOSE_SHIFT_Y),
    (-2.11, NOSE_SHIFT_Y),
    (-1.652, 0.0),
]

def deform(p, region='dorsal'):
    x, y, z = p
    wf = profile(y, WIDTH_FACTOR)
    x *= wf
    if region == 'dorsal':
        z *= profile(y, DORSAL_FACTOR)
    dy = profile(y, SHIFT_DELTA)
    return Vector((x, y + dy, z))

# The mouth/attack anchors sit right at the current nose tip (see rig_spec_05.ANCHORS);
# they must move with it. anchor_mouth_inside (the swallow point, y=-1.61) sits well
# behind the affected band and is left alone.
ANCHOR_SHIFT_Y = NOSE_SHIFT_Y
