"""Validate the actual delivered GLBs and produce annotated local visual review boards."""
import json, struct, math, hashlib, sys
RAW_AUTHORING="--raw-authoring" in sys.argv
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/devonian/props';LOCAL=ROOT.parent/'devonian-authoring/props'
TYPES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};FORMATS={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
def read_glb(path):
 raw=path.read_bytes();assert raw[:4]==b'glTF' and struct.unpack_from('<I',raw,4)[0]==2
 size,kind=struct.unpack_from('<II',raw,12);doc=json.loads(raw[20:20+size]);off=20+size;binary=b''
 if off<len(raw):length,kind=struct.unpack_from('<II',raw,off);binary=raw[off+8:off+8+length]
 return doc,binary
def accessor(doc,buf,idx):
 a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']];fmt,width=FORMATS[a['componentType']];n=TYPES[a['type']];stride=v.get('byteStride',n*width);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+fmt*n,buf,offset+i*stride) for i in range(a['count'])]
def audit():
 manifest=json.loads((OUT/'manifest.json').read_text());report=[];families=set()
 for item in manifest['props']:
  id=item['id'];families.add(item['family']);triangles=[];bones=[]
  for suffix in ['', '.lod1']:
   path=OUT/(id+suffix+'.glb');assert 1000<path.stat().st_size<(100_000_000 if RAW_AUTHORING else 25_000_000),(id,'size');d,b=read_glb(path);tri=0;assert len(d.get('meshes',[]))>0
   names=[n.get('name','') for n in d['nodes']];bones.append(names)
   for mesh in d['meshes']:
    for p in mesh['primitives']:
     pos=accessor(d,b,p['attributes']['POSITION']);assert all(all(math.isfinite(x) for x in q) for q in pos)
     assert 'COLOR_0' in p['attributes'],(id,'missing pigmentation')
     color_index=p['attributes']['COLOR_0'];colors=accessor(d,b,color_index);color_accessor=d['accessors'][color_index]
     color_scale=65535 if color_accessor['componentType']==5123 else 255 if color_accessor['componentType']==5121 else 1
     assert all(all(math.isfinite(x) for x in c) for c in colors),(id,'nonfinite pigmentation')
     assert any(min(c[:3])/color_scale<.98 for c in colors),(id,'lost material pigmentation',p.get('material'))
     if 'indices' in p:tri+=d['accessors'][p['indices']]['count']//3
     else:tri+=len(pos)//3
     if 'WEIGHTS_0' in p['attributes']:
      weights=accessor(d,b,p['attributes']['WEIGHTS_0']);a=d['accessors'][p['attributes']['WEIGHTS_0']];scale=65535 if a['componentType']==5123 else 255 if a['componentType']==5121 else 1
      assert all(abs(sum(w)/scale-1)<.003 for w in weights),(id,'bad skin weights')
   triangles.append(tri)
   clips=[x['name'] for x in d.get('animations',[])];assert clips==item['clips'],(id,clips,item['clips'])
   for anim in d.get('animations',[]):
    duration=0
    for sam in anim['samplers']:
     times=accessor(d,b,sam['input']);duration=max(duration,times[-1][0]);v=accessor(d,b,sam['output']);assert all(all(math.isfinite(x) for x in q) for q in v)
     assert max(abs(a-c) for a,c in zip(v[0],v[-1]))<1e-5,(id,'nonseamless loop')
     assert max(abs(a-c) for frame in v for a,c in zip(v[0],frame))>.0001,(id,'static animation sampler')
    assert duration>0
    for channel in anim['channels']:
     assert channel['target']['path']!='scale';assert names[channel['target']['node']]!='root'
   assert any(m.get('normalTexture') for m in d['materials']),(id,'missing material normal')
  assert triangles[1]/triangles[0]<.41,(id,'LOD ratio',triangles)
  assert set(bones[0])==set(bones[1]),(id,'LOD skeleton differs')
  img=Image.open(OUT/(id+'.png'));assert img.mode=='RGBA';alpha=img.getchannel('A');assert alpha.getextrema()==(0,255);bbox=alpha.getbbox();assert bbox[0]>4 and bbox[1]>4 and bbox[2]<img.width-4 and bbox[3]<img.height-4,(id,'portrait clipping',bbox)
  report.append({'id':id,'fullTriangles':triangles[0],'lodTriangles':triangles[1],'lodRatio':triangles[1]/triangles[0],'clips':item['clips'],'alphaBounds':bbox,'sha256':hashlib.sha256((OUT/(id+'.glb')).read_bytes()).hexdigest()})
 (LOCAL/'validation.json').write_text(json.dumps({'families':len(families),'variants':len(report),'results':report},indent=2)+'\n')
 print(json.dumps({'families':len(families),'variants':len(report),'result':'PASS','rawAuthoring':RAW_AUTHORING},indent=2));return manifest['props']
def boards(items):
 try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17)
 except:font=ImageFont.load_default()
 for page in range((len(items)+11)//12):
  group=items[page*12:(page+1)*12];im=Image.new('RGB',(1600,1200),(23,31,34));draw=ImageDraw.Draw(im)
  for n,item in enumerate(group):
   x=(n%4)*400;y=(n//4)*400;src=Image.open(OUT/(item['id']+'.png'));src.thumbnail((390,325));im.paste(src,(x+(400-src.width)//2,y),src);draw.text((x+10,y+329),item['name'][:37],fill=(231,225,206),font=font);draw.text((x+10,y+353),item['family']+' • %.3f m'%item['lengthMeters'],fill=(145,170,160),font=font)
  im.save(LOCAL/('review-%02d.jpg'%(page+1)),quality=94)
if __name__=='__main__':boards(audit())
