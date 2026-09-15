"""Assemble paired review sheets from Blender's actual exported-GLB pose renders."""
from PIL import Image,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];base=ROOT/'local/triassic-authoring/nothosaurus';dest=Path(__file__).resolve().parent
sets={
'paired-deformation-sheet':['Idle-0','Swim-0','Swim-0.612','Swim-1.224','Swim-1.512','TurnLeft-0.8','TurnRight-0.8','Attack-0.14','Attack-0.4','Attack-0.7','Bite-0.25','Heavy-0.45','Dodge-0.25'],
'paired-actions-sheet':['Sprint-0','Sprint-0.408','Sprint-0.816','Sprint-1.008','Dive-0.7','Rise-0.7','Hit-0.3','Stagger-0.6','Guard-0.5','Parry-0.2','Eat-0.4','Death-1.6','Ability-0.5','Grab-0.6','Breath-1.2','Growth-0.75'],
'paired-gait-sheet':['Swim-0-top','Swim-0.612-top','Swim-1.224-top','Swim-1.512-top','Sprint-0-top','Sprint-0.408-top','Sprint-0.816-top','Sprint-1.008-top'],
'paired-volume-sheet':['side','top','mouth-Bite']}
for sheet,names in sets.items():
 w,h=360,280;cols=2 if len(names)<4 else 4;rows=(len(names) +cols-1)//cols
 img=Image.new('RGB',(w*cols,h*rows),(28,34,40));d=ImageDraw.Draw(img)
 for i,n in enumerate(names):
  for j,kind in enumerate(['authored']):
   p=base/(kind+'-review')/(n+'.png');assert p.exists(),p
   src=Image.open(p).convert('RGBA');src.thumbnail((w,h-26));index = i;x=(index%cols)*w;y=(index//cols)*h
   img.paste(src,(x+(w-src.width)//2,y+24),src);d.text((x+8,y+7),kind+' / '+n,fill='white')
 img.save(dest/(sheet+'.jpg'),quality=92)

# The webbing is judged against a saturated ground, where a gap between two toes is unmistakable
# rather than a dark patch. Authored body only: the twin has no digits to web, it resurfaces the
# paddle the webbing made. Only built while `--feet-only` has been run.
feet=[('%s-%s'%(n,v)) for n in ['foreL','foreR','hindL','hindR'] for v in ['top','under','out']]
if all((base/'authored-review'/('feet-'+n+'.png')).exists() for n in feet):
 w,h=400,400;cols=6;rows=(len(feet)+cols-1)//cols
 img=Image.new('RGB',(w*cols,h*rows),(28,34,40));d=ImageDraw.Draw(img)
 for i,n in enumerate(feet):
  src=Image.open(base/'authored-review'/('feet-'+n+'.png')).convert('RGB');src.thumbnail((w,h-26))
  x=(i%cols)*w;y=(i//cols)*h
  img.paste(src,(x+(w-src.width)//2,y+24));d.text((x+8,y+7),n,fill='white')
 img.save(dest/'webbed-feet-sheet.jpg',quality=90)
 print('wrote webbed-feet-sheet.jpg',img.size)
