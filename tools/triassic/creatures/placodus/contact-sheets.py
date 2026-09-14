"""Assemble the paired review sheets from the actual exported-GLB pose renders."""
from PIL import Image,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];base=ROOT/'local/triassic-authoring/placodus';dest=Path(__file__).resolve().parent
sets={
'paired-volume-sheet':['side','top','front','belly','mouth-closed','mouth-Bite'],
'paired-deformation-sheet':['Idle-0','Swim-0','Swim-0.45','Swim-0.9','Swim-1.35','TurnLeft-0.8','TurnRight-0.8',
 'Attack-0.14','Attack-0.4','Attack-0.7','Bite-0.25','Heavy-0.45','Dodge-0.25'],
'paired-actions-sheet':['Sprint-0','Sprint-0.3','Sprint-0.6','Sprint-0.9','Dive-0.7','Rise-0.7','Hit-0.3','Stagger-0.6',
 'Guard-0.5','Parry-0.2','Eat-0.4','Death-1.6','Ability-0.45','Grab-0.6','Breath-1.2','Growth-0.75'],
'paired-era-clips-sheet':['Crawl-0.1','Crawl-0.5','Crawl-1.0','Crawl-1.5','Pry-0.4','Pry-1.0','Pry-1.9',
 'CrushBite-0.2','CrushBite-0.8','CrushBite-1.25','Breathe-0.9','Breathe-2.1','mouth-CrushBite'],
'paired-gait-sheet':['Crawl-0.0-gside','Crawl-0.25-gside','Crawl-0.5-gside','Crawl-0.75-gside',
 'Crawl-1.0-gside','Crawl-1.25-gside','Crawl-1.5-gside','Crawl-1.75-gside',
 'Crawl-0.0-gtop','Crawl-0.5-gtop','Crawl-1.0-gtop','Crawl-1.5-gtop']}
for sheet,names in sets.items():
 w,h=360,280;cols=2 if len(names)<4 else 4;rows=(len(names)*2+cols-1)//cols
 img=Image.new('RGB',(w*cols,h*rows),(28,34,40));d=ImageDraw.Draw(img)
 for i,n in enumerate(names):
  for j,kind in enumerate(['authored','puppet']):
   p=base/(kind+'-review')/(n+'.png');assert p.exists(),p
   src=Image.open(p).convert('RGBA');src.thumbnail((w,h-26));index=i*2+j;x=(index%cols)*w;y=(index//cols)*h
   img.paste(src,(x+(w-src.width)//2,y+24),src);d.text((x+8,y+7),kind+' / '+n,fill='white')
 img.save(dest/(sheet+'.jpg'),quality=92)
 print('wrote',sheet)
