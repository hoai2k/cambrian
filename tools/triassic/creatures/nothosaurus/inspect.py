import bpy, json, numpy as np
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
HERE=Path(__file__).resolve().parent
bpy.ops.import_scene.gltf(filepath=str(HERE/'tripo-raw/nothosaurus.raw.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH');a=np.array([o.matrix_world@v.co for v in o.data.vertices]);print('OBJECT',o.matrix_world); print('bounds',a.min(0),a.max(0))
for x in np.linspace(-.48,.48,25):
 p=a[np.abs(a[:,0]-x)<.012];print('STATION',round(x,3),np.round(np.quantile(p,[0,.1,.5,.9,1],axis=0),4).tolist())
np.save('local/triassic-authoring/nothosaurus/raw-points.npy',a)
