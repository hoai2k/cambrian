"""Is a long neck's sideways sweep the strike, or is it a recoil? Decide it from the arc.

  /opt/blender/blender -b --factory-startup --python tools/triassic/attack-arc.py -- \
      <id> <neckBaseBone> [clips...]

**The question this answers, and why the obvious reading of it is wrong.** T3D-23's rule is that a
long neck, a tail or a pair of tentacles is what an animal attacks *with*, and a clip that leaves it
hanging has not used the animal. Phragmoteuthis' dart is the worked example and it is measured as
*forward* travel of `anchor_attack_primary` over body length -- +14 % against the 3-4 % it shipped
with. Read the same way, Dinocephalosaurus and Tanystropheus look like failures: their strike clips
move that anchor 39-46 % of a body **sideways**, 11-47 % **back**, and never as much as 2 % forward.

That reading is a category error, and the geometry says so. A point on an arm of length R swung
through an angle theta about its base moves `R sin(theta)` sideways and `R (1 - cos(theta))`
**back**. On a neck half a body long swung through sixty degrees, "back" is a quarter of a body
before the animal has retreated by anything at all: it is the chord of the arc. And a neck that is
already straight out at rest has spent its protraction -- its tip is *at* its maximum distance along
the body axis -- so there is no forward reach left to measure and the sweep is the reach.

So this reports, per clip and at the frame of greatest lateral travel: how far the anchor has gone
sideways and back over body length, the angle that sweep corresponds to on the animal's own neck
(with the dip, because a swing that dips is still an arc), what the arc alone predicts for the back
component, and the **excess** of one over the other. A strike shows an excess near zero or negative
-- negative meaning the neck extended as it swung. It also reports the worst **pure withdrawal** in
the clip, the frame with the most back travel and the least lateral: that is what an actual recoil
would look like, and on a strike it is nothing.

`neckBaseBone` is where the neck leaves the body (`neck_00` on both of these animals), which is what
sets R. The frame is the body's own: forward is the model's long axis towards the head at rest, up
is the glTF up the importer brings back as Blender +Z, and sideways is their cross product.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
ID, BASE = argv[0], argv[1]
WANT = argv[2:]
ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / 'local/triassic-authoring' / ID / (ID + '.unpacked.glb')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(GLB))
s = bpy.context.scene
s.render.fps = 30
rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
rig.animation_data.action = None
s.frame_set(0)
bpy.context.view_layer.update()

P = np.array([(o.matrix_world @ v.co)[:] for o in s.objects if o.type == 'MESH' for v in o.data.vertices])
extent = P.max(0) - P.min(0)
LONG = int(np.argmax(extent))
L = float(extent[LONG])
anchor = next(o for o in s.objects if o.name == 'anchor_attack_primary')
rest = anchor.matrix_world.translation.copy()
centre = Vector(P.mean(0).tolist())
fwd = Vector([0., 0., 0.])
fwd[LONG] = 1. if rest[LONG] > centre[LONG] else -1.
up = Vector((0., 0., 1.))
side = fwd.cross(up).normalized()
base = (rig.matrix_world @ rig.pose.bones[BASE].head).copy()
R = (rest - base).length

out = {'id': ID, 'bodyLength': round(L, 4), 'neckBase': BASE,
       'armLengthOverL': round(R / L, 4), 'clips': {}}
for a in bpy.data.actions:
    name = a.name.split('|')[-1].split('_')[-1]
    if WANT and name not in WANT:
        continue
    rig.animation_data.action = a
    if a.slots:
        rig.animation_data.action_slot = a.slots[0]
    lo, hi = a.frame_range
    rows = []
    f = lo
    while f <= hi + 1e-6:
        s.frame_set(int(round(f)))
        bpy.context.view_layer.update()
        d = anchor.matrix_world.translation - rest
        rows.append({'u': round(f / 30., 3), 'fwd': d.dot(fwd) / L,
                     'lat': d.dot(side) / L, 'up': d.dot(up) / L})
        f += 1
    rig.animation_data.action = None
    peak = max(rows, key=lambda r: abs(r['lat']))
    th = math.asin(min(1., abs(peak['lat']) * L / R))
    # the same for the out-of-plane part: the head also drops, and a swing that dips is still an arc
    swept = math.asin(min(1., math.hypot(peak['lat'], peak['up']) * L / R))
    pure = min(rows, key=lambda r: r['fwd'] + 3. * abs(r['lat']))
    out['clips'][name] = {
        'atLateralPeak': {'u': peak['u'], 'lateralOverL': round(abs(peak['lat']), 4),
                          'backOverL': round(-peak['fwd'], 4), 'riseOverL': round(peak['up'], 4),
                          'sweptDeg': round(math.degrees(th), 1),
                          'sweptWithDipDeg': round(math.degrees(swept), 1),
                          'arcPredictsBackOverL': round(R / L * (1 - math.cos(swept)), 4),
                          'backBeyondTheArcOverL': round(-peak['fwd'] - R / L * (1 - math.cos(swept)), 4)},
        'worstPureWithdrawal': {'u': pure['u'], 'backOverL': round(-pure['fwd'], 4),
                                'lateralThereOverL': round(abs(pure['lat']), 4)},
        'trace': [[r['u'], round(r['fwd'], 3), round(r['lat'], 3), round(r['up'], 3)]
                  for r in rows[::max(1, len(rows) // 10)]],
    }
print('NECK2', json.dumps(out))
