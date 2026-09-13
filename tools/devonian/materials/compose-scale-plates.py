"""Two calibrated actual-model comparison plates; small detail inset is explicitly 5x."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,math,sys
ROOT=Path(__file__).resolve().parents[3];LOCAL=ROOT.parent/'devonian-authoring/scale-reference';INPUT=LOCAL/'renders';PREVIEW='--preview'in sys.argv;OUT=LOCAL/'plates-preview'if PREVIEW else ROOT/'public/assets/devonian/reference/scale';OUT.mkdir(parents=True,exist_ok=True)
PPM=600;WIDTH=4200;LEFT=100;LABEL=760;START=900;INK='#ecf0e8';MUTED='#b7c9c6';BG='#183137';LINE='#355057';ACCENT='#dbbf87';DETAIL_PPM=3000
FISH=['titanichthys','dunkleosteus','cladoselache','onychodus','stethacanthus','rhinodipterus','bothriolepis','coccosteus','gemuendina','cheirolepis','doryaspis']
OTHER=['tiktaalik','jaekelopterus','acanthostega','palaeoisopus','michelinoceras','manticoceras','nahecaris','furcaster','eldredgeops','walliserops']
SMALL=['manticoceras','furcaster','nahecaris','eldredgeops','walliserops'];FONT=Path('/System/Library/Fonts/Supplemental')
def font(n,bold=False,italic=False):return ImageFont.truetype(str(FONT/('Arial Bold.ttf'if bold else'Arial Italic.ttf'if italic else'Arial.ttf')),n)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def measure(text,f):return f.getlength(text)
def wrap(draw,text,x,y,width,f,fill=MUTED,line=42):
 words=text.split();lines=[];s=''
 for word in words:
  test=(s+' '+word).strip()
  if s and measure(test,f)>width:lines.append(s);s=word
  else:s=test
 if s:lines.append(s)
 for s in lines:draw.text((x,y),s,font=f,fill=fill);y+=line
 return y
DATA={};missing=[]
for ident in FISH+OTHER:
 p=INPUT/(ident+'.json');ip=INPUT/(ident+'.png')
 if not p.exists()or not ip.exists():missing.append(ident);continue
 r=json.loads(p.read_text());assert r.get('pose')=='bind pose; all imported animation cleared',ident;assert r['imageSHA256']==sha(ip),ident
 assert r['sourcePublicSHA256']==sha(ROOT/r['sourcePublicModel']),ident+' stale public model';assert r['metadataSHA256']==sha(ROOT/'public/assets/devonian/creatures'/(ident+'.json')),ident+' stale size'
 assert abs(r['lodToMetadataLengthRatio']-1)<.005,(ident,'unexpected LOD/model size mismatch')
 image=Image.open(ip).convert('RGBA');assert image.size==(r['renderWidth'],r['renderHeight']);mask=image.getchannel('A').point(lambda a:255 if a>8 else 0);box=mask.getbbox();assert box and box[0]>2 and box[1]>2 and box[2]<image.width-2 and box[3]<image.height-2,(ident,'clipped render',box)
 r['alphaCropPixels']=list(box);r['renderJSONSHA256']=sha(p);r['image']=image.crop(box);DATA[ident]=r
if missing and not PREVIEW:raise RuntimeError('Need final calibrated renders before publishing: '+', '.join(missing))
def size_text(r):
 m=r['representativeLengthMeters'];return f'{m:g} m'if m>=1 else f'{m*100:g} cm'
def view_text(r):return 'top view'if r['view']=='dorsal'else'side view'
def target_size(r,ppm):
 scale=r['horizontalMetersPerPixel']*ppm;im=r['image'];return max(1,round(im.width*scale)),max(1,round(im.height*scale))
def ruler(draw,x,y,length_m,ppm,step_m,labelsuffix='m',font_size=28):
 end=x+round(length_m*ppm);draw.line((x,y,end,y),fill=ACCENT,width=3)
 n=round(length_m/step_m)
 for i in range(n+1):
  pos=x+round(i*step_m*ppm);draw.line((pos,y-13,pos,y+17),fill=ACCENT,width=3);value=i*step_m*(100 if labelsuffix=='cm'else 1);label=f'{value:g}';draw.text((pos,y-51),label,font=font(font_size),fill=ACCENT,anchor='mt')
 draw.text((end+22,y-42),labelsuffix,font=font(font_size),fill=ACCENT)
def place(canvas,r,x,y,ppm,context):
 w,h=target_size(r,ppm);im=r['image'].resize((w,h),Image.Resampling.LANCZOS);canvas.alpha_composite(im,(round(x),round(y)));return {'id':r['id'],'context':context,'pixelsPerMeter':ppm,'rectPixels':[round(x),round(y),w,h],'sourceCropPixels':r['alphaCropPixels'],'sourceHorizontalMetersPerPixel':r['horizontalMetersPerPixel'],'resampling':'uniform Lanczos; no independent length/height normalization','expectedWidthPixels':r['image'].width*r['horizontalMetersPerPixel']*ppm,'roundingErrorPixels':w-r['image'].width*r['horizontalMetersPerPixel']*ppm}
plates=[]
for plateid,title,ids in [('fishes','Fishes',FISH),('invertebrates-tetrapods','Invertebrates & tetrapod relatives',OTHER)]:
 ids=[i for i in ids if i in DATA];ids.sort(key=lambda i:-DATA[i]['representativeLengthMeters']);top=520;rows=[];y=top
 for ident in ids:
  r=DATA[ident];w,h=target_size(r,PPM);height=max(160,h+75);rows.append((ident,y,height,w,h));y+=height
 mainBottom=y
 detailRows=[];detailBottom=0
 if plateid!='fishes':
  dy=830
  for ident in SMALL:
   if ident not in DATA:continue
   r=DATA[ident];w,h=target_size(r,DETAIL_PPM);height=max(200,h+115);detailRows.append((ident,dy,height,w,h));dy+=height
  detailBottom=dy+65
 height=round(max(mainBottom,detailBottom)+445);canvas=Image.new('RGBA',(WIDTH,height),BG);d=ImageDraw.Draw(canvas);placements=[]
 d.text((LEFT,75),'DEVONIAN  /  MODEL SCALE REFERENCE',font=font(32,True),fill=ACCENT);d.text((LEFT,137),title,font=font(80,True),fill=INK)
 d.text((LEFT,248),'Representative reconstructed individuals • actual orthographic model projections',font=font(36),fill=MUTED)
 d.text((LEFT,305),'Mixed ages and localities — this is not a community or co-occurrence reconstruction.',font=font(33),fill=MUTED)
 d.text((LEFT,421),'MAIN COMPARISON',font=font(28,True),fill=ACCENT);ruler(d,START,467,5 if plateid=='fishes'else 2,PPM,.5,labelsuffix='m')
 # Both plates share the exact same native600px/m calibration and canvas width.
 d.text((WIDTH-LEFT,78),'ONE SHARED MAIN SCALE',font=font(26,True),fill=ACCENT,anchor='ra');d.text((WIDTH-LEFT,115),'same main scale on both plates',font=font(25),fill=MUTED,anchor='ra')
 for ident,y,rh,w,h in rows:
  r=DATA[ident];center=y+rh/2;d.line((LEFT,y,2260 if plateid!='fishes'else WIDTH-LEFT,y),fill=LINE,width=2)
  d.text((LEFT,center-52),r['name'],font=font(40,True),fill=INK);d.text((LEFT,center+2),size_text(r)+'  ·  '+view_text(r),font=font(31),fill=ACCENT)
  if ident in ['furcaster','palaeoisopus']:note='reconstructed appendage extent'
  elif ident in ['jaekelopterus','walliserops']:note='model extent includes long appendages'
  elif ident=='manticoceras':note='overall model; shell reference 11 cm'
  elif ident=='michelinoceras':note='working size; incomplete shell reference'
  else:note='representative model length'
  d.text((LEFT,center+46),note,font=font(24),fill=MUTED)
  placements.append(place(canvas,r,START,center-h/2,PPM,'main'))
  # Baseline shows the projected reconstructed extent without inflating small taxa.
  by=center+h/2+19;d.line((START,by,START+w,by),fill=LINE,width=2);d.line((START,by-5,START,by+5),fill=LINE,width=2);d.line((START+w,by-5,START+w,by+5),fill=LINE,width=2)
 if detailRows:
  box=(2420,427,WIDTH-LEFT,detailBottom);d.rounded_rectangle(box,radius=24,fill='#203d43',outline='#536b6c',width=3)
  d.text((2490,481),'SMALLER SUBJECTS  /  5× DETAIL',font=font(34,True),fill=ACCENT)
  wrap(d,'A separate magnified scale. These are the same models shown at their true relative sizes in the main comparison.',2490,539,1420,font(28),line=38)
  ruler(d,2490,759,.30,DETAIL_PPM,.05,labelsuffix='cm',font_size=25)
  for ident,dy,rh,w,h in detailRows:
   r=DATA[ident];d.text((2490,dy),r['name']+'  ·  '+size_text(r),font=font(30,True),fill=INK);placements.append(place(canvas,r,2500,dy+60,DETAIL_PPM,'5x detail inset'))
 footer=height-335;d.line((LEFT,footer-40,WIDTH-LEFT,footer-40),fill=LINE,width=2)
 wrap(d,'SIZE IS A RECONSTRUCTION CHOICE, NOT A SPECIES MAXIMUM. Labels combine estimates and working asset choices from the published model metadata. The same metres-per-model-unit scalar applies to every dimension; specimens are never resized to equal thumbnails.',LEFT,footer,WIDTH-2*LEFT,font(31),fill=INK,line=44)
 wrap(d,'Long appendages and radial arm spreads retain each model’s documented extent convention. This preview model set will evolve; soft tissues and some body proportions remain uncertain. Clay materials simplify comparison; they do not reconstruct fossil pigmentation.',LEFT,footer+107,WIDTH-2*LEFT,font(29),line=41)
 d.text((LEFT,height-78),'Main scale is shared across both plates. The boxed 5× inset, where present, has its own ruler.',font=font(27),fill=MUTED)
 d.text((WIDTH-LEFT,height-78),'CAMBRIAN / DEVONIAN ASSET LIBRARY',font=font(23,True),fill=ACCENT,anchor='ra')
 output=OUT/(plateid+'.png');canvas.convert('RGB').save(output,optimize=True);assert all(abs(p['roundingErrorPixels'])<=.5+1e-6 for p in placements)
 plates.append({'id':plateid,'path':str(output.relative_to(ROOT))if not PREVIEW else str(output),'sha256':sha(output),'dimensions':[WIDTH,height],'mainPixelsPerMeter':PPM,'placements':placements})
records={ident:{k:v for k,v in r.items()if k!='image'}for ident,r in DATA.items()};report={'stage':'preview reference plates','missing':missing,'uniformMainScalePixelsPerMeter':PPM,'canvasWidthPixels':WIDTH,'detailInset':{'magnification':5,'pixelsPerMeter':DETAIL_PPM,'explicitlySeparateScale':True},'compositionSHA256':sha(Path(__file__)),'normalization':'render horizontalMetersPerPixel × fixed pixelsPerMeter, identical scalar on width/height; alpha crop only removes empty margin','pose':'actual published LOD in bind pose, helper meshes excluded','sizeScope':'representative model metadata; not maxima; different localities/ages, not co-occurrence','plates':plates,'subjects':records}
(OUT/'scale-plates.json').write_text(json.dumps(report,indent=2)+'\n');(LOCAL/'WORKING_STATE.md').write_text('# Scale-reference checkpoint\n\n'+('Preview only; missing '+', '.join(missing)if missing else'Both complete scale plates composed; final visual review/handoff pending.')+'\n\nTwo plates share600px/m and4200px width. The second has a clearly boxed5× inset with its own cm ruler for the five smallest models; main figures remain unchanged. Corrected explicit dorsal camera roll, importer Icosphere exclusion, cleared animation/bind-pose evaluation and hash-bound cache. Normalization uses metadata lengthMeters/modelLength uniformly in all axes, not crop width. Source decoded/render records and final tracked scale-plates.json preserve calibration and hashes.\n\nOutputs: '+str(OUT)+'\n')
print(json.dumps({'plates':[(p['id'],p['dimensions'])for p in plates],'subjects':len(DATA),'missing':missing},indent=2))
