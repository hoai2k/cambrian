"""Doryaspis V3 appearance: deterministic procedural pigment and microrelief.

Pure numpy, no Blender, no image inputs, so the same numbers come out on any
machine and the study stage and the production build share one source of truth.

Two halves, deliberately separated:

* **Pigment** is per-vertex and ships as `COLOR_0` in both the full model and
  the reduced one.  Olive-brown armour, paler ventral, the plate sutures
  reinforced by darker pigment in their own troughs -- computed from the same
  suture distance field the geometry is cut with, so pigment and relief can
  never disagree -- quiet mottling, and the saw and cornual plates in the
  body's colour family, paling toward their worn tips.
* **Microrelief** is one small tileable dermal-granulation set (normal and
  roughness).  It is authored in UV space rather than in vertex space, so its
  features cannot organise into rows along the mesh's own rings, and it is
  isotropic and domain-warped.  Peak slope is 0.08, matching the restrained
  bump the rest of the Devonian V3 family settled on.  The reduced model drops
  it, as the LOD carries no textures at all.
"""
import numpy as np

BUMP_SLOPE = .08          # peak |grad h| of the microrelief height field
MICRO_SIZE = 512          # tileable dermal granulation, one channel set
MICRO_TILES = 7.0         # repeats across the UV unit square


def _hash3(ix, iy, iz):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647).astype(np.int64)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xffffff) / float(0xffffff)


def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def value_noise3(p, frequency):
    """Deterministic tri-linear value noise in [0,1]; p is (n,3) in world units."""
    q = np.asarray(p, dtype=np.float64) * frequency
    i = np.floor(q).astype(np.int64)
    f = _fade(q - i)
    out = 0.
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                w = ((f[:, 0] if dx else 1 - f[:, 0])
                     * (f[:, 1] if dy else 1 - f[:, 1])
                     * (f[:, 2] if dz else 1 - f[:, 2]))
                out = out + w * _hash3(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz)
    return out


def fbm3(p, frequency, octaves=3, gain=.5, lacunarity=2.17):
    total, amp, norm, f = 0., 1., 0., frequency
    for _ in range(octaves):
        total = total + amp * value_noise3(p, f)
        norm += amp
        amp *= gain
        f *= lacunarity
    return total / norm


# sRGB pigment anchors; converted to linear once, at the end.
ARMOUR_ROOF = (.252, .248, .146)      # olive-brown dorsal armour
ARMOUR_FLANK = (.362, .346, .224)     # warmer mid-flank
ARMOUR_BELLY = (.606, .586, .500)     # pale grey-buff ventral
SUTURE_PIGMENT = (.128, .112, .066)   # the sutures' own dark line
BONE_TIP = (.560, .540, .452)         # worn saw and cornual tips
POSTERIOR_ROOF = (.216, .212, .130)
POSTERIOR_BELLY = (.562, .545, .468)
ORAL_TISSUE = (.360, .262, .242)
EYE_PIGMENT = (.092, .086, .098)


def _mix(a, b, t):
    t = np.clip(np.asarray(t, dtype=np.float64), 0, 1)[:, None]
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    if a.ndim == 1:
        a = a[None, :]
    if b.ndim == 1:
        b = b[None, :]
    return a * (1 - t) + b * t


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)


def pigment(points, kind, dorsal=None, suture_distance=None, tip_fraction=None,
            roof=None, belly=None):
    """Linear RGB per point.

    `points` is (n,3) in clay coordinates and `dorsal` is how upward-facing the
    surface is there, 0 at the keel and 1 on the roof.  Counter-shading is read
    off the surface itself rather than off an absolute height, because the saw,
    the cornual plates and the tail all sit low in the animal's own y range and
    an absolute ramp painted every one of them belly-pale.
    """
    p = np.asarray(points, dtype=np.float64)
    n = len(p)
    if kind == 'oral':
        base = np.tile(ORAL_TISSUE, (n, 1))
        deep = np.clip((1.47 - p[:, 2]) / .45, 0, 1)
        rgb = base * (1 - .40 * deep)[:, None]
        return srgb_to_linear(rgb)
    if kind == 'eye':
        return srgb_to_linear(np.tile(EYE_PIGMENT, (n, 1)))

    roof = np.asarray(roof if roof is not None else
                      (ARMOUR_ROOF if kind == 'armour' else POSTERIOR_ROOF))
    belly = np.asarray(belly if belly is not None else
                       (ARMOUR_BELLY if kind == 'armour' else POSTERIOR_BELLY))
    # Vertical position within this station's own section: 1 at the roof,
    # 0 at the keel.  Read off the point, not off a bone, so the saw and the
    # cornual plates grade the same way the shield does.
    height = np.clip(np.asarray(dorsal, dtype=np.float64), 0, 1) if dorsal is not None \
        else np.clip((p[:, 1] + .30) / .66, 0, 1)
    mid = np.asarray(ARMOUR_FLANK) if kind == 'armour' else (belly + roof) / 2
    rgb = _mix(_mix(belly, mid, height / .55), roof, (height - .55) / .45)

    # Quiet mottling: two scales, low contrast, never a pattern.
    mottle = fbm3(p, 2.9, octaves=3) - .5
    islands = np.clip(fbm3(p * (1, .55, 1), 1.35, octaves=2) - .56, 0, 1) * 2.4
    rgb = rgb * (1 + .30 * mottle)[:, None]
    rgb = rgb * (1 - .40 * islands * np.clip(height, .15, 1))[:, None]

    # The sutures carry their own pigment, strongest in the trough.
    if suture_distance is not None:
        w = np.exp(-(np.asarray(suture_distance) / .020) ** 2) * np.clip(height * 1.9, 0, 1)
        rgb = _mix(rgb, SUTURE_PIGMENT, w * .88)

    # Worn tips on the saw and the cornual plates, in the body's own family.
    if tip_fraction is not None:
        rgb = _mix(rgb, BONE_TIP, np.clip(tip_fraction, 0, 1) * .46)
    return srgb_to_linear(np.clip(rgb, 0, 1))


def _periodic_noise(size, cells, seed):
    """Tileable value noise on a `cells`x`cells` lattice, sampled at `size`."""
    g = np.arange(size) / size * cells
    i = np.floor(g).astype(np.int64)
    f = _fade(g - i)
    rng = np.random.default_rng(seed)
    lattice = rng.random((cells, cells))
    i0, i1 = i % cells, (i + 1) % cells
    a = lattice[np.ix_(i0, i0)] * (1 - f)[None, :] + lattice[np.ix_(i0, i1)] * f[None, :]
    b = lattice[np.ix_(i1, i0)] * (1 - f)[None, :] + lattice[np.ix_(i1, i1)] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]


def microrelief(size=MICRO_SIZE):
    """Tileable isotropic, domain-warped dermal granulation.

    Returns (normal_rgb, roughness) as float arrays in [0,1].  The height field
    is normalised so its peak gradient is exactly BUMP_SLOPE, which is what
    keeps the relief restrained; the warp is what keeps it from organising.
    """
    warp_u = (_periodic_noise(size, 8, 11) - .5) * .06
    warp_v = (_periodic_noise(size, 8, 12) - .5) * .06
    h = np.zeros((size, size))
    for cells, amp, seed in ((12, 1.0, 21), (26, .46, 22), (54, .21, 23)):
        base = _periodic_noise(size, cells, seed)
        shift_u = np.rint(warp_u * size).astype(int)
        shift_v = np.rint(warp_v * size).astype(int)
        rows = (np.arange(size)[:, None] + shift_u) % size
        cols = (np.arange(size)[None, :] + shift_v) % size
        h += amp * base[rows, cols]
    h -= h.mean()
    gu = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5
    gv = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5
    peak = max(float(np.abs(gu).max()), float(np.abs(gv).max()))
    gu, gv = gu / peak * BUMP_SLOPE, gv / peak * BUMP_SLOPE
    nz = 1. / np.sqrt(gu * gu + gv * gv + 1)
    normal = np.stack([(-gv * nz) * .5 + .5, (-gu * nz) * .5 + .5, nz * .5 + .5], axis=-1)
    hn = (h - h.min()) / max(1e-9, float(h.max() - h.min()))
    rough = .66 + .12 * hn
    return normal, rough
