import json,struct,numpy as np,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
root=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local');q=root/'devonian-authoring/dunkleosteus/face-v4/candidate02/exports';p=q/'dunkleosteus.glb';raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];w={'VEC3':3,'SCALAR':1}[a['type']];item=np.dtype(dt).itemsize;return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*item),item)).copy()
def tris(name):
 node=next(n for n in g['nodes']if n.get('name')==name);out=[]
 for prim in g['meshes'][node['mesh']]['primitives']:
  a=acc(prim['attributes']['POSITION']);a=a[:,[0,2,1]];a[:,1]*=-1;out.append(a[acc(prim['indices']).ravel().reshape(-1,3)])
 return np.concatenate(out)
objects={'head':('head_envelope_closed','#668acb'),'jaw':('lower_jaw_envelope_closed','#548967'),'upper':('anterior_supragnathal_cusp_1','#e59032'),'lower':('inferognathal_cutting_blade_1','#ce4260')}
t={k:tris(v[0])for k,v in objects.items()};out=q/'diagnostic-sections';out.mkdir(exist_ok=True)
for label,axis,value,u,v,ur,vr in [('upper-jaw-x016',0,.16,1,2,(-1.51,-1.25),(-.22,.21)),('lower-head-x024',0,.24,1,2,(-1.51,-1.20),(-.25,.23)),('gnathal-overlap-z0027',2,-.027,1,0,(-1.51,-1.25),(.06,.28))]:
 im=Image.new('RGB',(1100,850),'white');d=ImageDraw.Draw(im)
 def xy(a):return (65+(a[u]-ur[0])/(ur[1]-ur[0])*970,765-(a[v]-vr[0])/(vr[1]-vr[0])*670)
 d.text((30,18),'Actual exported candidate02, Attack frame 1 (neutral). Section '+label,fill='black')
 for j,(k,(name,col))in enumerate(objects.items()):d.line((35+j*240,48,70+j*240,48),fill=col,width=4);d.text((77+j*240,41),k,fill='black')
 for k,triangles in t.items():
  col=objects[k][1];mask=(triangles[:,:,axis].min(1)<=value)&(triangles[:,:,axis].max(1)>=value)
  for tri in triangles[mask]:
   points=[]
   for a,b in zip(tri,np.roll(tri,-1,axis=0)):
    if (a[axis]-value)*(b[axis]-value)<0:
     points.append(a+(b-a)*(value-a[axis])/(b[axis]-a[axis]))
   if len(points)==2:d.line((*xy(points[0]),*xy(points[1])),fill=col,width=3)
 for z in np.linspace(vr[0],vr[1],7):
  yy=765-(z-vr[0])/(vr[1]-vr[0])*670;d.text((5,yy-6),f'{z:.3f}',fill='black')
 for y in np.linspace(ur[0],ur[1],6):
  xx=65+(y-ur[0])/(ur[1]-ur[0])*970;d.text((xx-20,780),f'{y:.3f}',fill='black')
 d.text((30,820),'Metres, Blender axes; lines are triangle/plane intersections. No inferred fossil dimensions.',fill='black');im.save(out/(label+'.png'))
summary={'assetSHA256':hashlib.sha256(raw).hexdigest(),'pose':'Attack frame 1; neutral geometry, identity gnathal-to-head/jaw delta in actual audit','sections':[x.name for x in out.glob('*.png')], 'finding':'Closed exported contour sections directly show upper tip within jaw shell and lower anterior blade within head cheek, plus upper/lower volume overlap. Depths are centimetres, well above unchanged millimetre audit tolerances.'};(out/'section-evidence.json').write_text(json.dumps(summary,indent=2)+'\n')
print(out)
