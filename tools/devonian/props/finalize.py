"""Refresh portable provenance metadata and produce original model-reference boards."""
import ast,json,hashlib,textwrap,struct,sys
from validate import read_glb,accessor
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'public/assets/devonian/props';LOCAL=ROOT.parent/'devonian-authoring/props'
requested=sys.argv[1:]
def selected(id):return not requested or any(id==q or id.startswith(q+'-v') for q in requested)
tree=ast.parse((Path(__file__).parent/'build.py').read_text())
def constant(name):
 for node in tree.body:
  if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in node.targets):return ast.literal_eval(node.value)
families=constant('FAMILIES');refs=constant('REFS');records={x[1]:x for x in families}
reef='https://onlinelibrary.wiley.com/doi/full/10.1111/j.1475-4983.2011.01037.x';forest='https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/'
refs.update({'G01':[reef],'G02':[reef],'G03':[reef],'G04':[forest],'G05':[forest],'G06':[forest],'G07':[forest],'G08':refs['B09'],'G09':refs['B08'],'G10':refs['P04'],'G11':refs['P04']})
uncertainties={
'B01':'Growth morphology and surface mamelons are comparative; this is not a scanned Clathrodictyon specimen.',
'B02':'Colony branching combines fragmentary Amphipora evidence; the complete living architecture is inferred.',
'B03':'Conforming thin growth is supported; the precise patch perimeter and soft pigmentation are artistic.',
'B04':'Favosites-type hexagonal architecture is supported; this is not a species-level diagnostic model.',
'B05':'Branching/aperture arrangement follows the comparative Striatopora record; colony proportions are interpretive.',
'B06':'Exposed skeletal calyx/septa, with living tissue deliberately absent; ridges are not species-diagnostic detail.',
'B07':'Comparative rugose colony architecture; reconstructed calices are not a fossil specimen section.',
'B08':'Generalized pinnulate camerate anatomy; do not identify as Taxocrinus or a Hunsrück species. Soft colours and arm pose are inferred.',
'B09':'Winged spiriferid and rounded atrypide form studies; attachment and tissue are not depicted.',
'B10':'Generalized fenestrate colony. Fine zooid structure is simplified, and no species/locality assignment is implied.',
'B11':'Comparative shell architecture only; the chosen low and high spires are not species diagnoses. No soft parts reconstructed.',
'B12':'Modiomorphid comparative outline with offset umbo and concentric growth. No unsupported soft tissue.',
'P01':'Sporophyte axes and sporangia only; gametophytes are not combined into one invented life stage.',
'P02':'Three distinct axis types follow the 2021 reconstruction. Fine cellular/root-tip anatomy is below model resolution.',
'P03':'Gilboa architectural reconstruction, not a preserved complete individual; no true leaves, flowers or modern palm crown.',
'P04':'Branching/foliage/root architecture reconstructed comparatively; size is one art specimen and not a maximum.',
'P05':'Waterloo Farm thallus morphology informs these forms. Attachment, full lengths and three-dimensional posture remain inferred.',
'G08':'Broken shells reuse B09/B12 vertex-generating anatomy, not unrelated stock shells.',
'G09':'Columnals and stem pieces reuse B08 geometry and preserve their lumen.',
'G10':'Woody anatomy uses the P04 branching/bark family; no claim of species-identifiable fossil wood.',
'G11':'P04-type branching roots, not mangrove pneumatophores. Place only in a researched wooded setting.',
'G12':'Directly extracted interpreted armour from the reviewed Dunkleosteus terrelli model. This is an artistic disarticulation, not a scanned fossil assemblage.',
}
def clean_constant_tracks(path):
 doc,binary=read_glb(path)
 if 'EXT_meshopt_compression' in doc.get('extensionsUsed',[]):return # already finalized and losslessly packaged
 for animation in doc.get('animations',[]):
  retained=[]
  for channel in animation['channels']:
   sampler=animation['samplers'][channel['sampler']];values=accessor(doc,binary,sampler['output']);delta=max(abs(a-b) for v in values for a,b in zip(values[0],v));target=channel['target'];name=doc['nodes'][target['node']].get('name','')
   if target['path']=='scale' or name=='root':
    assert delta<1e-6,(path.name,'unexpected root/scale motion');continue
   if delta>1e-6:retained.append(channel)
  used=sorted(set(c['sampler'] for c in retained));remap={old:new for new,old in enumerate(used)}
  animation['samplers']=[animation['samplers'][old] for old in used]
  for channel in retained:channel['sampler']=remap[channel['sampler']]
  animation['channels']=retained
  assert retained,(path.name,'empty animated clip')
 raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);binary+=b'\0'*((-len(binary))%4)
 total=12+8+len(raw)+8+len(binary);path.write_bytes(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary)
for model in OUT.glob('*.glb'):
 if selected(model.name.removesuffix('.glb').removesuffix('.lod1')):clean_constant_tracks(model)
props=[]
for p in OUT.glob('*.json'):
 if p.name=='manifest.json':continue
 item=json.loads(p.read_text())
 if 'model' not in item:continue
 id=item['id']
 if not selected(id):props.append(item);continue
 primary=id.rsplit('-v',1)[0] if '-v' in id else id
 code,_,name,taxon,category,prov,desc,count=records[primary]
 item.update(taxon=taxon,description=desc,provenance=prov,sources=refs.get(code,[]),sourceBlend='../devonian-authoring/props/'+id+'/'+id+'.blend',uncertainty=uncertainties.get(code,'Generic geological form; exact regional lithology, hydrodynamics and burial history require scene-specific review.'))
 if code=='G12' and 'derivedFrom' not in item:
  # Never relabel an older extracted mesh with the current creature's hash.
  provenance=LOCAL/'remains-source.provenance.json'
  if not provenance.exists():raise ValueError('Run decode-source.mjs and rebuild organic-remains before assigning source provenance')
  item['derivedFrom']=json.loads(provenance.read_text())
 p.write_text(json.dumps(item,indent=2)+'\n');props.append(item)
props.sort(key=lambda x:({'B':0,'P':1,'G':2}[x['family'][0]],x['family'],x['id']))
(OUT/'manifest.json').write_text(json.dumps({'schemaVersion':1,'era':'devonian','units':'metres','props':props},indent=2)+'\n')
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',24);small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20);title=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',37)
except:font=small=title=ImageFont.load_default()
for item in props:
 id=item['id']
 if not selected(id):continue
 im=Image.new('RGB',(1800,1300),(23,31,34));draw=ImageDraw.Draw(im);draw.text((45,30),item['family']+'  '+item['name'],font=title,fill=(236,229,211));draw.text((45,84),item['taxon'],font=font,fill=(159,192,177))
 for n,fp in enumerate([OUT/(id+'.png'),LOCAL/id/'lateral.png']):
  src=Image.open(fp);src.thumbnail((840,650));im.paste(src,(30+n*880+(840-src.width)//2,145),src)
 y=812
 for label,paragraph in [('FORM',item['description']),('PROVENANCE',item['provenance']),('UNCERTAINTY',item['uncertainty'])]:
  draw.text((45,y),label,font=small,fill=(136,175,159));y+=28
  for line in textwrap.wrap(paragraph,140):draw.text((45,y),line,font=small,fill=(230,228,217));y+=27
  y+=9
 draw.text((45,1140),'Metric model dimensions: '+', '.join(k+' %.3f m'%v for k,v in item['dimensionsMeters'].items()),font=small,fill=(230,228,217))
 draw.text((45,1175),'Original model renders. Sources are linked in the adjacent metadata; these are not reference photographs.',font=small,fill=(166,189,178))
 im.save(LOCAL/id/'reference-board.jpg',quality=95)
print('Finalized',len(props),'variants in',len(set(x['family'] for x in props)),'families.')
