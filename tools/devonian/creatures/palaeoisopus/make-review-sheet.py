from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[4];local=root.parent/'devonian-authoring/palaeoisopus';out=local/'viewer-v1';names=['Idle','Swim','TurnLeft','TurnRight','Dive','Rise','Attack','Bite','Heavy','Hit','Death','Guard','Parry','Dodge','Eat','Stagger','Ability','Moult','Grab']
canvas=Image.new('RGB',(1500,1200),'#132022');d=ImageDraw.Draw(canvas)
for i,name in enumerate(names):
 im=Image.open(out/(name+'.png')).convert('RGB');im.thumbnail((250,190));x=(i%6)*250;y=(i//6)*300;canvas.paste(im,(x,y+25));d.text((x+10,y+8),name,fill='white')
 for j,phase in enumerate(['0.2','0.75']):
  if not (out/(name+'-phase-'+phase+'.png')).exists():continue
  im=Image.open(out/(name+'-phase-'+phase+'.png')).convert('RGB');im.thumbnail((125,94));canvas.paste(im,(x+j*125,y+205))
canvas.save(local/'all-action-review.jpg',quality=94)
