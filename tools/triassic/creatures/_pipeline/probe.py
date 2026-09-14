"""Measure a raw generation through the shared intake, and print what a builder needs to know:
the frame, the centreline, the blade clusters, and whether the mouth is modelled at all.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/_pipeline/probe.py -- <id>
"""
import bpy, json, os, sys
import numpy as np
from mathutils.bvhtree import BVHTree
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tripo as T                                                        # noqa: E402

ID = sys.argv[-1]
ROOT = HERE.parents[3]
RAW = ROOT / 'tools/triassic/creatures' / ID / 'tripo-raw' / (ID + '.raw.glb')

auth, intake = T.load_raw(str(RAW), ID)
sample, lum, sha, mat = T.retain_albedo(auth, ID + ' skin', roughness=.66)
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=lum)
co = np.array([v.co[:] for v in auth.data.vertices])
bvh = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                           [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh))
thin = thickness < .030
cx, cz, hw, hd, table = T.measured_centreline(auth, thin)
clusters = T.thin_clusters(auth, thin, cx, cz)
cav = T.mouth_cavity(auth, front_fraction=.34, gap=.030)
Y0, Y1 = float(co[:, 1].min()), float(co[:, 1].max())
out = {
    'id': ID, 'intake': intake, 'bounds': [co.min(0).tolist(), co.max(0).tolist()],
    'frame': {k: v for k, v in frame.items() if k != 'perStation'},
    'mouthCavityVertices': int(len(cav)),
    'mouthCavityBounds': ([cav.min(0).tolist(), cav.max(0).tolist()] if len(cav) else None),
    'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters],
    'centreline': [{k: round(v, 4) for k, v in r.items()} for r in table[::4]],
    'yRange': [Y0, Y1],
}
print('PROBE ' + json.dumps(out))
