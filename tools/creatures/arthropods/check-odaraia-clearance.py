"""Check every authored frame against Odaraia's rigid elliptical carapace."""
import bpy, numpy as np, json, os, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
LOCAL=Path(os.environ.get('CAMBRIAN_AUTHORING',ROOT.parent/'expansion-authoring/arthropods'))
bpy.ops.wm.open_mainfile(filepath=str(LOCAL/'odaraia.blend'))
rig=bpy.data.objects['odaraia_rig'];obj=bpy.data.objects['odaraia'];scene=bpy.context.scene
# The diagnostic uses actual skinned mesh points, transformed back from body
# pose into the rigid shell's bind space. Open front/rear apertures are excluded.
indices=[]
for v in obj.data.vertices:
 if any(obj.vertex_groups[g.group].name.startswith('filter_') and g.weight>.99 for g in v.groups):indices.append(v.index)
reports={}
for action in bpy.data.actions:
 rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 last=round(action.frame_range[1]);max_ratio=0;worst_frame=0;worst_point=None;max_rigid_rotation=0
 for frame in range(last+1):
  scene.frame_set(frame);bpy.context.view_layer.update()
  for i in range(11):max_rigid_rotation=max(max_rigid_rotation,max(abs(x) for x in rig.pose.bones[f'segment_{i:02d}'].rotation_euler))
  transform=rig.pose.bones['body'].matrix @ rig.data.bones['body'].matrix_local.inverted();inverse=np.array(transform.inverted())
  ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();coords=np.array([tuple(me.vertices[i].co) for i in indices]);ev.to_mesh_clear()
  coords=coords@inverse[:3,:3].T+inverse[:3,3]
  mask=(coords[:,1]>-1.495)&(coords[:,1]<1.245);inside=coords[mask]
  t=(inside[:,1]+1.5)/2.75;shape=.8+.2*np.sin(np.pi*t)
  radius=(inside[:,0]/(.55*shape))**2+((inside[:,2]-.04)/(.51*shape))**2
  j=int(radius.argmax());peak=float(radius[j])
  if peak>max_ratio:max_ratio=peak;worst_frame=frame;worst_point=inside[j].tolist()
 reports[action.name]={'framesChecked':last+1,'maxEllipticalRadiusSquared':max_ratio,'worstFrame':worst_frame,'worstPointBodySpace':worst_point,'maxEnclosedSegmentRotation':max_rigid_rotation,'pass':max_ratio<=1.0 and max_rigid_rotation<1e-6}
 print(action.name,reports[action.name],flush=True)
(LOCAL/'odaraia-shell-clearance.json').write_text(json.dumps(reports,indent=2))
assert all(r['pass'] for r in reports.values()),'Filter geometry crosses rigid carapace'
