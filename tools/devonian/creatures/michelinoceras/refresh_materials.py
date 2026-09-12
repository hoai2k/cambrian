"""Refresh seam-corrected maps in saved original geometry and re-export, no geometry rebuild."""
import bpy,json,os,numpy as np
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/michelinoceras/v1';O=L/'candidate'
bpy.ops.wm.open_mainfile(filepath=str(L/'michelinoceras.blend'));S=bpy.context.scene;rig=bpy.data.objects['Michelinoceras'];objects=[o for o in S.objects if o.type=='MESH'];M={m.name.removeprefix('Michelinoceras_'):m for m in bpy.data.materials if m.name.startswith('Michelinoceras_')}
for im in bpy.data.images:
 path=H/Path(im.filepath).name
 if path.exists():
  if im.packed_file:im.unpack(method='REMOVE')
  im.filepath=str(path);im.reload();im.pack()
for o in objects:
 for attr in list(o.data.color_attributes):o.data.color_attributes.remove(attr)
anchors=[(a['name'],a['bone'],tuple(a['point']),a['role'])for a in json.loads((H/'anchors.json').read_text())['michelinoceras']]
from math import sin,cos,pi,exp
NSEG=16;ARMS=[(None,None,None)for _ in range(10)]
for act in list(bpy.data.actions):bpy.data.actions.remove(act)
exec(compile((H/'animations.py').read_text(),str(H/'animations.py'),'exec'))
exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
