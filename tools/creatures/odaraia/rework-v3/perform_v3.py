"""Odaraia V3 motion language: every clip as a pure function of normalized time.

Poses are returned as bone-local XYZ Euler triples so `rig_v3.py` (pose
evidence) and `actions_v3.py` (action baking) drive exactly the same performance.
Authoring frame per limb: local +Y is the rest chord, local +Z points medially
(toward the filtering basket), local +X is their cross product. Anatomical
controls are `flex` (about X, same sign on both sides), `swing` and `twist`
(about Z and Y, mirrored by the -side factor) so left and right are anatomical
mirrors rather than a reused Euler sign.

No wall clock, no unseeded randomness: `PAIR_JITTER` / `PAIR_GAIN` are drawn once
in the library from a fixed seed.
"""
from math import sin, cos, pi

from mathutils import Vector

from odaraia_v3_lib import (
    LIMBS, PAIRS, SEGMENTS, PADDLE_SEGMENTS, PAIR_GAIN, PAIR_JITTER, PAIR_LAG, SIDE_OFFSET,
    limb_bone, paddle_bone, limb_phase, smooth,
)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def s01(x, a, b):
    return smooth((x - a) / (b - a)) if b > a else (1.0 if x >= b else 0.0)


def bump(x, a, b):
    if x <= a or x >= b:
        return 0.0
    return sin(pi * (x - a) / (b - a)) ** 2


class Pose(dict):
    def add(self, bone, flex=0.0, twist=0.0, swing=0.0):
        v = self.setdefault(bone, [0.0, 0.0, 0.0])
        v[0] += flex
        v[1] += twist
        v[2] += swing

    def limb(self, l, seg, flex=0.0, twist=0.0, swing=0.0):
        # -side mirrors the two axes whose local sense flips across the midline.
        self.add(limb_bone(l.number, l.label, seg), flex, -l.side * twist, -l.side * swing)

    def paddle(self, l, seg, flex=0.0, twist=0.0, swing=0.0):
        self.add(paddle_bone(l.number, l.label, seg), flex, -l.side * twist, -l.side * swing)


# --------------------------------------------------------------------------
# Base metachronal gait. Authoring amplitudes from the production plan.
# --------------------------------------------------------------------------

SWEEP_PROX = .175        # 10.0 deg
FLEX_MID = .262          # 15.0 deg
FLEX_DIST = .323         # 18.5 deg
CURL_TIP = .192          # 11.0 deg
PITCH_PADDLE = .227      # 13.0 deg
CAMBER_TIP = .087        # 5.0 deg
SEG_LAG = (0.0, .45, .90, 1.30)
PADDLE_PHASE_LAG = (1.75, 2.25)


def gait(pose, u, gain=1.0, pairs=None):
    """The rolling power/recovery beat every clip starts from."""
    for l in LIMBS:
        if pairs is not None and l.number not in pairs:
            continue
        si = 0 if l.side < 0 else 1
        g = gain * PAIR_GAIN[l.index][si]
        p = limb_phase(u, l.index, si)
        pose.limb(l, 'prox', flex=g * SWEEP_PROX * .55 * sin(p - SEG_LAG[0]),
                  swing=g * SWEEP_PROX * sin(p - SEG_LAG[0] + .4))
        pose.limb(l, 'mid', flex=g * FLEX_MID * sin(p - SEG_LAG[1]))
        pose.limb(l, 'dist', flex=g * FLEX_DIST * sin(p - SEG_LAG[2]))
        pose.limb(l, 'tip', flex=g * CURL_TIP * sin(p - SEG_LAG[3]))
        pose.paddle(l, 'base', flex=g * PITCH_PADDLE * sin(p - PADDLE_PHASE_LAG[0]),
                    swing=g * PITCH_PADDLE * .35 * cos(p - PADDLE_PHASE_LAG[0]))
        pose.paddle(l, 'tip', flex=g * CAMBER_TIP * sin(p - PADDLE_PHASE_LAG[1]))


def tail_beat(pose, u, gain=1.0, lag=0.0):
    p = 2 * pi * (u - lag)
    for prefix, sign in (('tail_L', 1), ('tail_R', -1), ('tail_dorsal', 0)):
        pose.add(f'{prefix}_01', flex=gain * .085 * sin(p), swing=gain * .05 * sin(p + .3) * (1 if sign == 0 else sign))
        pose.add(f'{prefix}_02', flex=gain * .13 * sin(p - .55), swing=gain * .07 * sin(p - .2) * (1 if sign == 0 else sign))
    pose.add('tail_terminal', flex=gain * .045 * sin(p - .25))
    for i in range(3):
        pose.add(f'trunk_free_{i + 1:02d}', flex=gain * .028 * sin(p - .2 * (i + 1)))


def brush(pose, u, gain=1.0):
    """Small mouthpart trim present in every clip that is not a hard one-shot."""
    p = 2 * pi * u
    pose.add('labrum', flex=gain * .035 * sin(p * 2))
    for label, s in (('L', -1), ('R', 1)):
        pose.add(f'mandible_{label}', flex=gain * .05 * sin(p * 2 + .4), swing=-s * gain * .04 * sin(p * 2))
        pose.add(f'maxilla_{label}_base', flex=gain * .07 * sin(p * 2 - .5), swing=-s * gain * .05 * cos(p * 2))
        pose.add(f'maxilla_{label}_tip', flex=gain * .10 * sin(p * 2 - .9))


def eyes(pose, u, gain=1.0):
    p = 2 * pi * u
    for label, s in (('L', -1), ('R', 1)):
        pose.add(f'eye_{label}', flex=gain * .035 * sin(p + (0 if s < 0 else 1.1)),
                 swing=-s * gain * .03 * cos(p))


# --------------------------------------------------------------------------
# Attack family.
# --------------------------------------------------------------------------

def pair_offset(l):
    """Successive leading pairs start .019 of progress later than the one in
    front; the opposite side a further .031. The remaining progress is rescaled
    so a late pair still completes its recovery inside the clip - a staggered
    re-entry rather than a hard reset, and no contact outside the active window."""
    return .019 * min(l.index, 11) + (.031 if l.side > 0 else 0.0)


def pair_progress(u, l):
    off = pair_offset(l)
    return clamp((u - off) / (1 - off))


def attack_limb(pose, x, l, scale=1.0):
    """One leading limb's staged reach. `x` is that limb's own offset progress."""
    load = s01(x, 0, .18) - s01(x, .30, .58)
    extend = s01(x, .18, .44) - s01(x, .60, .84)
    sweep = bump(x, .42, .62)
    recover = s01(x, .58, .76) - s01(x, .88, 1.0)
    k = scale
    # +swing carries the tip forward and down the channel; +flex draws it in
    # toward the median filtering side. Contact is both at once.
    pose.limb(l, 'prox', flex=k * (-.20 * load + .46 * extend + .10 * sweep),
              swing=k * (.30 * sweep + .10 * load))
    pose.limb(l, 'mid', flex=k * (-.34 * load + .58 * (s01(x, .22, .48) - s01(x, .62, .86)) + .16 * sweep),
              swing=k * (.18 * sweep))
    pose.limb(l, 'dist', flex=k * (.52 * load - .46 * (s01(x, .26, .52) - s01(x, .60, .80)) + .30 * recover + .20 * sweep),
              swing=k * (.14 * sweep))
    pose.limb(l, 'tip', flex=k * (.74 * load - .58 * (s01(x, .30, .54) - s01(x, .58, .78)) + .46 * recover + .24 * sweep))
    pose.paddle(l, 'base', flex=k * (.16 * load + .12 * sweep))


def attack_pose(u, clip='Attack'):
    pose = Pose()
    heavy = clip == 'Heavy'
    if heavy:
        # Longer loaded withdrawal and a stronger cupping sweep; its own curve.
        def remap(x):
            return (x / .30) * .18 if x < .30 else .18 + (x - .30) / .22 * .24 if x < .52 else \
                .42 + (x - .52) / .12 * .22 if x < .64 else .64 + (x - .64) / .36 * .36
    else:
        def remap(x):
            return x
    gait(pose, u, gain=.34)
    for l in LIMBS:
        x = pair_progress(u, l)
        if l.number <= 6:
            attack_limb(pose, remap(x), l, scale=1.20 if heavy else 1.0)
        elif l.number <= 12:
            attack_limb(pose, remap(x), l, scale=.50 if heavy else .46)
    tail_beat(pose, u, gain=.55)
    brush(pose, u, gain=.5)
    eyes(pose, u, gain=.6)
    lead = bump(u, .30, .74)
    brace = s01(u, 0, .20) - s01(u, .80, 1.0)
    pose.add('body_core', flex=-.055 * brace + .085 * lead)
    pose.add('head', flex=.03 * lead)
    for i in range(3):
        pose.add(f'trunk_free_{i + 1:02d}', flex=.05 * brace - .04 * lead)
    return pose


def bite_pose(u):
    pose = Pose()
    gait(pose, u, gain=.40)
    pulse = bump(u, .10, .78)
    for l in LIMBS:
        if l.number <= 2:
            pose.limb(l, 'mid', flex=.22 * pulse)
            pose.limb(l, 'dist', flex=.30 * pulse)
            pose.limb(l, 'tip', flex=.34 * pulse, swing=-.10 * pulse)
        elif l.number <= 4:
            pose.limb(l, 'dist', flex=.14 * pulse)
    pose.add('labrum', flex=-.26 * pulse)
    for label, s in (('L', -1), ('R', 1)):
        pose.add(f'mandible_{label}', flex=.34 * pulse, swing=-s * .30 * pulse)
        pose.add(f'maxilla_{label}_base', flex=.20 * pulse)
        pose.add(f'maxilla_{label}_tip', flex=.30 * pulse)
    pose.add('body_core', flex=.030 * pulse)
    pose.add('head', flex=.045 * pulse)
    tail_beat(pose, u, gain=.4)
    eyes(pose, u, gain=.5)
    return pose


# --------------------------------------------------------------------------
# Eat. Progress-driven; the leading pairs are solved onto the food path.
# --------------------------------------------------------------------------

#: Authored food-centre path, in M02 authoring coordinates. The final descent is
#: at z = 1.69, behind the labrum plate (which ends at z = 1.80), never through it.
FOOD_PATH = (
    (0.00, (0.0, 1.080, 2.000)),
    (0.22, (0.0, 1.055, 1.988)),
    (0.36, (0.0, 0.985, 1.968)),
    (0.52, (0.0, 0.700, 1.920)),
    (0.67, (0.0, 0.470, 1.690)),
    (0.78, (0.0, 0.400, 1.690)),
    (0.88, (0.0, 0.360, 1.690)),
    (1.00, (0.0, 0.345, 1.690)),
)


def food_at(p):
    """Smooth monotone interpolation of the authored carry path."""
    p = clamp(p)
    for i in range(len(FOOD_PATH) - 1):
        a, pa = FOOD_PATH[i]
        b, pb = FOOD_PATH[i + 1]
        if p <= b or i == len(FOOD_PATH) - 2:
            f = smooth((p - a) / (b - a)) if b > a else 0.0
            return Vector(pa).lerp(Vector(pb), f)
    return Vector(FOOD_PATH[-1][1])


#: Leading pairs and their role during Eat.
EAT_CARRIER = (1, 'L')
EAT_SUPPORT = (1, 'R')
EAT_STEADY = (2, 3)
EAT_LANE = (4, 5, 6)


def eat_pose(u):
    """The non-solved part of Eat. `rig_v3`/`actions_v3` then solve pairs 1-3
    onto the food path and open the clearance lane on pairs 4-6."""
    pose = Pose()
    gait(pose, u, gain=.30)
    open_lane = s01(u, .10, .34) - s01(u, .84, 1.0)
    present = bump(u, .60, .95)
    settle = bump(u, .86, 1.0)
    for l in LIMBS:
        if l.number in EAT_LANE:
            pose.limb(l, 'prox', flex=-.20 * open_lane, swing=.16 * open_lane)
            pose.limb(l, 'mid', flex=-.24 * open_lane)
            pose.limb(l, 'dist', flex=.18 * open_lane)
            pose.limb(l, 'tip', flex=.26 * open_lane)
        elif 7 <= l.number <= 12:
            pose.limb(l, 'mid', flex=.10 * open_lane)
            pose.limb(l, 'dist', flex=.12 * open_lane)
    pose.add('labrum', flex=-.22 * present + .06 * settle)
    for label, s in (('L', -1), ('R', 1)):
        pose.add(f'mandible_{label}', flex=.30 * present, swing=-s * .26 * present)
        pose.add(f'maxilla_{label}_base', flex=.26 * present, swing=-s * .14 * present)
        pose.add(f'maxilla_{label}_tip', flex=.36 * present)
    pose.add('body_core', flex=-.045 * (s01(u, .05, .40) - s01(u, .84, 1.0)) + .030 * present)
    pose.add('head', flex=.035 * present)
    tail_beat(pose, u, gain=.45, lag=.15)
    eyes(pose, u, gain=.55)
    return pose


# --------------------------------------------------------------------------
# The remaining clips.
# --------------------------------------------------------------------------

def clip_pose(clip, u):
    """Every clip except the solved part of Eat/Attack contact, which the
    caller layers on top."""
    if clip == 'Attack' or clip == 'Heavy':
        return attack_pose(u, clip)
    if clip == 'Bite':
        return bite_pose(u)
    if clip == 'Eat':
        return eat_pose(u)
    pose = Pose()
    env = sin(pi * u) ** 2
    if clip == 'Idle':
        gait(pose, u, gain=.42)
        tail_beat(pose, u, gain=.35, lag=.2)
        brush(pose, u, gain=.9)
        eyes(pose, u, gain=1.0)
        pose.add('body_core', flex=.014 * sin(2 * pi * u))
    elif clip == 'Swim':
        gait(pose, u, gain=1.0)
        tail_beat(pose, u, gain=.8, lag=.12)
        brush(pose, u, gain=.4)
        eyes(pose, u, gain=.5)
        pose.add('body_core', flex=.020 * sin(2 * pi * u))
    elif clip in ('TurnLeft', 'TurnRight'):
        d = -1 if clip == 'TurnLeft' else 1
        gait(pose, u, gain=.8)
        tail_beat(pose, u, gain=.7, lag=.1)
        brush(pose, u, gain=.35)
        eyes(pose, u, gain=.5)
        hold = .5 + .5 * sin(2 * pi * u - pi / 2)
        for l in LIMBS:
            inner = (l.side < 0) == (d < 0)
            k = (-.26 if inner else .30) * hold
            pose.limb(l, 'prox', swing=k * .7)
            pose.limb(l, 'mid', flex=(-.16 if inner else .20) * hold)
            pose.limb(l, 'dist', flex=(-.10 if inner else .16) * hold)
            pose.paddle(l, 'base', flex=(.22 if inner else -.14) * hold)
        pose.add('body_core', twist=d * .12 * hold, swing=d * .14 * hold)
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', swing=d * .09 * hold)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', swing=d * .16 * hold)
            pose.add(f'{prefix}_02', swing=d * .20 * hold)
    elif clip in ('Rise', 'Dive'):
        d = 1 if clip == 'Rise' else -1
        gait(pose, u, gain=.9)
        tail_beat(pose, u, gain=.75, lag=.18)
        eyes(pose, u, gain=.5)
        hold = .5 + .5 * sin(2 * pi * u - pi / 2)
        for l in LIMBS:
            pose.limb(l, 'prox', flex=d * .10 * hold)
            pose.limb(l, 'dist', flex=d * .14 * hold)
            pose.paddle(l, 'base', flex=-d * .26 * hold, swing=d * .10 * hold)
            pose.paddle(l, 'tip', flex=-d * .12 * hold)
        # Never inverted to legs-down: a bounded whole-body incidence only.
        pose.add('body_core', flex=d * .11 * hold)
        pose.add('head', flex=d * .04 * hold)
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', flex=-d * .05 * hold)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', flex=-d * .17 * hold)
            pose.add(f'{prefix}_02', flex=-d * .13 * hold)
    elif clip == 'Dodge':
        gait(pose, u, gain=.55)
        withdraw = bump(u, 0, .48)
        release = s01(u, .34, .62) - s01(u, .78, 1.0)
        for l in LIMBS:
            side = 1 if l.side > 0 else -1
            pose.limb(l, 'mid', flex=.30 * withdraw)
            pose.limb(l, 'dist', flex=.38 * withdraw)
            pose.limb(l, 'tip', flex=.42 * withdraw, swing=side * .26 * release)
            pose.limb(l, 'prox', swing=side * .22 * release)
            pose.paddle(l, 'base', flex=.18 * withdraw - .20 * release)
        pose.add('body_core', twist=.20 * release, swing=.16 * release)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', swing=.30 * release, flex=.12 * withdraw)
            pose.add(f'{prefix}_02', swing=.24 * release - .18 * env)
    elif clip == 'Guard':
        gait(pose, u, gain=.30)
        basket = .5 + .5 * sin(2 * pi * u - pi / 2)
        for l in LIMBS:
            if l.number <= 8:
                k = 1.0 - .07 * (l.number - 1)
                pose.limb(l, 'prox', flex=k * (.30 + .03 * basket), swing=k * -.16)
                pose.limb(l, 'mid', flex=k * (.42 + .04 * basket))
                pose.limb(l, 'dist', flex=k * (.46 + .05 * basket))
                pose.limb(l, 'tip', flex=k * (.40 + .05 * basket))
                pose.paddle(l, 'base', flex=k * .16)
        tail_beat(pose, u, gain=.4, lag=.3)
        brush(pose, u, gain=.6)
        eyes(pose, u, gain=.4)
        pose.add('body_core', flex=-.035)
    elif clip == 'Parry':
        gait(pose, u, gain=.45)
        strike = bump(u, 0, .55)
        pull = s01(u, .40, .70) - s01(u, .85, 1.0)
        for l in LIMBS:
            if l.number <= 6 and l.side < 0:
                pose.limb(l, 'prox', flex=.34 * strike, swing=-.30 * strike)
                pose.limb(l, 'mid', flex=.40 * strike)
                pose.limb(l, 'dist', flex=.30 * strike + .34 * pull)
                pose.limb(l, 'tip', flex=.22 * strike + .48 * pull)
            elif l.number <= 6:
                pose.limb(l, 'prox', flex=.16 * strike, swing=.18 * strike)
                pose.limb(l, 'mid', flex=.22 * strike)
        pose.add('body_core', twist=-.10 * strike)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', swing=-.22 * strike)
            pose.add(f'{prefix}_02', swing=-.16 * strike)
        eyes(pose, u, gain=.4)
    elif clip == 'Ability':
        gait(pose, u, gain=.55)
        for l in LIMBS:
            # Anterior to posterior expansion, then a rolling refold.
            start = .02 * l.index
            back = .50 + .10 * (l.index / (PAIRS - 1))
            lead = clamp((u - start) / (1 - start))
            fold = clamp((u - back) / (1 - back))
            k = smooth(lead) - smooth(fold)
            pose.limb(l, 'prox', flex=.22 * k, swing=-.14 * k)
            pose.limb(l, 'mid', flex=.30 * k)
            pose.limb(l, 'dist', flex=.26 * k)
            pose.limb(l, 'tip', flex=.20 * k)
            pose.paddle(l, 'base', flex=.20 * k, swing=.08 * k)
            pose.paddle(l, 'tip', flex=.12 * k)
        brace = bump(u, .10, .90)
        pose.add('body_core', flex=.030 * brace)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', flex=-.20 * brace)
            pose.add(f'{prefix}_02', flex=-.15 * brace)
        tail_beat(pose, u, gain=.5, lag=.25)
        brush(pose, u, gain=1.0)
        eyes(pose, u, gain=.7)
    elif clip == 'Hit':
        gait(pose, u, gain=.5 * (1 - .5 * env))
        for l in LIMBS:
            # The recoil travels front to tail; limb curl lags the body.
            d = clamp((u - .04 * (l.index / (PAIRS - 1)) * 5) / .8)
            e = sin(pi * clamp(d)) ** 2
            pose.limb(l, 'mid', flex=.20 * e)
            pose.limb(l, 'dist', flex=.30 * e)
            pose.limb(l, 'tip', flex=.36 * e)
        pose.add('body_core', flex=-.10 * env, twist=.07 * env)
        pose.add('head', flex=-.06 * env)
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', flex=.06 * sin(pi * clamp((u - .12 - .06 * i) / .7)) ** 2)
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', flex=.20 * sin(pi * clamp((u - .28) / .7)) ** 2)
            pose.add(f'{prefix}_02', flex=.26 * sin(pi * clamp((u - .36) / .64)) ** 2)
    elif clip == 'Stagger':
        gait(pose, u, gain=.6 * (1 - .45 * sin(pi * u)))
        broken = sin(pi * u) ** 2
        for l in LIMBS:
            si = 0 if l.side < 0 else 1
            stutter = sin(2 * pi * u * 2.5 - l.index * .5 + (0 if si == 0 else 1.7))
            pose.limb(l, 'mid', flex=.16 * broken * stutter)
            pose.limb(l, 'dist', flex=.22 * broken * stutter)
            pose.limb(l, 'tip', flex=.20 * broken * (1 - stutter * .4))
        pose.add('body_core', twist=.20 * broken * sin(2 * pi * u * 1.5), swing=.12 * broken * sin(2 * pi * u))
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', swing=.10 * broken * sin(2 * pi * u * 1.5 - .4 * i))
        for prefix in ('tail_L', 'tail_R', 'tail_dorsal'):
            pose.add(f'{prefix}_01', swing=.20 * broken * sin(2 * pi * u * 1.5 - .8))
            pose.add(f'{prefix}_02', swing=.24 * broken * sin(2 * pi * u * 1.5 - 1.2))
        eyes(pose, u, gain=.8)
    elif clip == 'Moult':
        gait(pose, u, gain=.30)
        tension = s01(u, .05, .40) - s01(u, .70, 1.0)
        for l in LIMBS:
            travel = sin(2 * pi * (u * 2 - l.index / PAIRS))
            release = s01(u, .30 + .012 * l.index, .55 + .012 * l.index) - s01(u, .80, 1.0)
            pose.limb(l, 'prox', flex=.10 * tension + .05 * travel * tension)
            pose.limb(l, 'mid', flex=.16 * tension)
            pose.limb(l, 'dist', flex=.20 * tension - .26 * release)
            pose.limb(l, 'tip', flex=.24 * tension - .34 * release)
            pose.paddle(l, 'base', flex=.12 * tension * travel)
        pose.add('body_core', flex=.035 * tension * sin(2 * pi * u * 3))
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', flex=.07 * tension * sin(2 * pi * u * 3 - .6 * i),
                     swing=.05 * tension * sin(2 * pi * u * 2 - .4 * i))
        tail_beat(pose, u, gain=.5 * (1 + tension))
        brush(pose, u, gain=1.2)
        eyes(pose, u, gain=.5)
    elif clip == 'Death':
        # Progressively arrested beats, unequal curl, then a held settled pose.
        from odaraia_v3_lib import DEATH_HOLD
        v = min(u, DEATH_HOLD) / DEATH_HOLD
        fade = (1 - v) ** 1.6
        gait(pose, u * (1 - .45 * v), gain=.8 * fade)
        for l in LIMBS:
            si = 0 if l.side < 0 else 1
            slack = smooth(clamp((v - .10 - .012 * l.index - .05 * si) / .55))
            pose.limb(l, 'prox', flex=-.12 * slack * PAIR_GAIN[l.index][si])
            pose.limb(l, 'mid', flex=.30 * slack * PAIR_GAIN[l.index][si])
            pose.limb(l, 'dist', flex=.46 * slack)
            pose.limb(l, 'tip', flex=.62 * slack * PAIR_GAIN[l.index][si])
            pose.paddle(l, 'base', flex=-.24 * slack)
            pose.paddle(l, 'tip', flex=-.14 * slack)
        settle = smooth(clamp((v - .12) / .70))
        pose.add('body_core', twist=.34 * settle, flex=.06 * settle)
        pose.add('head', flex=-.05 * settle)
        for i in range(3):
            pose.add(f'trunk_free_{i + 1:02d}', flex=.10 * settle, swing=.06 * settle)
        for prefix, sgn in (('tail_L', 1), ('tail_R', -1), ('tail_dorsal', 0)):
            pose.add(f'{prefix}_01', flex=.16 * settle, swing=.10 * settle * (1 if sgn == 0 else sgn))
            pose.add(f'{prefix}_02', flex=.22 * settle, swing=.14 * settle * (1 if sgn == 0 else sgn))
        eyes(pose, u, gain=.6 * fade)
    else:
        raise KeyError(clip)
    return pose
