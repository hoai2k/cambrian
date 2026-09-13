"""Michelinoceras motion-v3 creative inputs. Blender-independent timing functions.

Angles are radians in the existing radial-roll arm frames. Positive X flares
outward; negative X curls inward. Every section has its own delayed signal.
These soft-part gestures are an artistic comparative interpretation, not a
claim of preserved Michelinoceras behaviour. No new limbs or suckers are added.
"""
from math import sin, cos, pi, exp

CLIPS = {'Attack': 30, 'Bite': 15, 'Heavy': 33, 'Eat': 42}
LOD_CLIPS = ['Idle', 'Swim', 'Death', *CLIPS]
ARM_COUNT = 10
SEGMENTS = 16
CONTACT_SECTION = 12


def smooth(t, a, b):
    x = max(0.0, min(1.0, (t-a)/(b-a)))
    return x*x*(3-2*x)


def pulse(t, center, width):
    return exp(-((t-center)/width)**2)


def section_pose(clip, t, arm, section):
    """Separate proximal flare, travelling whip, distal hook and late recoil."""
    u = section/(SEGMENTS-1)
    phase = arm*0.71
    lag = .036*sin(phase)+.015*cos(arm*1.9)
    envelope = sin(pi*t)**2
    proximal = (1-u)**1.8
    distal = smooth(u, .25, .92)
    if clip in ('Attack', 'Heavy'):
        heavy = clip == 'Heavy'
        strength = 1.36 if heavy else 1.0
        flare = pulse(t, .19+lag+u*.055, .12)
        # The curvature crest travels along the arm; tips do not peak with roots.
        whip = pulse(t, .32+u*.28+lag, .12 if heavy else .105)
        hook = pulse(t, .57+lag+u*.055, .16)
        recoil = pulse(t, .76+u*.09+lag, .14)
        radial = strength*envelope*(
            (.155*proximal+.021)*flare
            -(.072+.110*u)*whip
            -.096*distal*hook
            +(.033+.065*u)*recoil)
        lateral = strength*envelope*(
            .031*sin(phase+u*2.5)*flare
            +.044*sin(phase+u*3.0)*whip
            -.025*sin(phase+u*3.0)*recoil)
        twist = .010*envelope*sin(phase+u*2.0)*whip
        return radial, twist, lateral
    if clip == 'Bite':
        gather = envelope*pulse(t, .42+lag+u*.10, .26)
        return (-.016-.043*distal)*gather, 0, .009*sin(phase+u)*gather
    # Non-looping progress performance: open -> contact at .22 -> carry to
    # the real mouth by .78 -> held oral transfer until consumption completes.
    pickup = smooth(t, 0, .22)
    carry = smooth(t, .22, .78)
    flare = pulse(t, .11+lag, .09)*sin(pi*min(1, t/.30))**2 if t < .30 else 0
    # A generous proximal arc and returned distal arc seed distributed contact
    # solving. This keeps surplus arm length in a forward-facing curved basket.
    radial = .08*proximal*flare + pickup*(
        (.065+.12*carry)*proximal - (.085+.19*carry)*distal)
    wave = .023*pickup*(1-.72*carry)*sin(phase-u*4.8+t*5*pi)
    lateral = .018*pickup*sin(phase+u*2.8)*(1-.5*carry)+wave*u
    return radial, .006*pickup*sin(phase+u), lateral


def soft_pose(clip, t):
    """Small head reach/jaw closure supports arms; no body/shell displacement."""
    e = sin(pi*t)**2
    if clip == 'Eat':
        pickup, carry = smooth(t, 0, .22), smooth(t, .22, .78)
        jaw = .16*pickup*(1-carry)+.27*carry*(.45+.55*sin(5*pi*t)**2)
        return -.010*pickup*(1-carry), jaw, .026*pickup*(1-carry)
    jaw_amp = {'Attack': .32, 'Heavy': .43, 'Bite': .46}[clip]
    jaw = jaw_amp*e*pulse(t, .37 if clip == 'Bite' else .46, .24)
    return -.015*e*pulse(t, .46, .20), jaw, .032*e


def carry_center(t):
    """Blender coordinates relative to original head; axis points out of mouth."""
    c = smooth(t, .22, .78)
    return (0, -2.43+(.51*c), -.035*(1-c)-.11*sin(pi*c))
