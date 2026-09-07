"""Create the four portrait derivatives from the reviewed final Blender render.
Candidate-only by default, matching build_v2.py. No invented or painted anatomy.
"""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import os,shutil
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/doryaspis/v2';O=(R/'public/assets/devonian/creatures')if os.environ.get('DORY_PUBLISH')=='1'else L/'candidate';O.mkdir(exist_ok=True,parents=True)
p=Image.open(L/'review/selection.png').convert('RGBA');assert p.size==(1600,1200)
p.save(O/'doryaspis.select.png');p.resize((256,192),Image.Resampling.LANCZOS).save(O/'doryaspis.thumb.png')
bg=Image.new('RGBA',p.size,(15,28,30,255));bg.alpha_composite(p);bg.convert('RGB').save(O/'doryaspis.png');bg.resize((800,600),Image.Resampling.LANCZOS).convert('RGB').save(O/'doryaspis.card.png')
clips=['Idle','Swim','TurnLeft','TurnRight','Dive','Rise','Attack','Bite','Heavy','Hit','Death','Guard','Parry','Dodge','Eat','Stagger','Ability','Growth'];sheet=Image.new('RGB',(1400,1050),(22,30,32));draw=ImageDraw.Draw(sheet)
for i,c in enumerate(clips):
 im=Image.open(L/'review'/('action-'+c+'.png')).convert('RGBA');im.thumbnail((350,235));x=(i%4)*350;y=(i//4)*210;tile=Image.new('RGBA',(350,200),(22,30,32,255));tile.alpha_composite(im,((350-im.width)//2,(200-im.height)//2));sheet.paste(tile.convert('RGB'),(x,y));draw.text((x+9,y+192),c,fill=(225,230,222))
sheet.save(H/'action-review.jpg',quality=92)
print('DORYASPIS_CANDIDATE_PORTRAITS_READY',O)
