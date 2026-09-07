"""Assemble review contact sheets from actual GLB Blender and Three renders."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/coccosteus'
def sheet(entries,path,cols=3,w=480,h=360):
 canvas=Image.new('RGB',(cols*w,((len(entries)+cols-1)//cols)*(h+30)),(23,32,38));draw=ImageDraw.Draw(canvas)
 for i,(label,p)in enumerate(entries):
  im=Image.open(p).convert('RGBA');im.thumbnail((w,h));x=(i%cols)*w+(w-im.width)//2;y=(i//cols)*(h+30);canvas.paste(im,(x,y),im);draw.text(((i%cols)*w+12,y+h+6),label,fill=(235,237,224))
 canvas.save(path,quality=93)
names=['Idle','Swim','TurnLeft','TurnRight','Dive','Rise','Attack','Bite','Heavy','Hit','Guard','Parry','Dodge','Eat','Stagger','Ability','Growth','Death']
sheet([(n,L/('webgl-'+n+'-v2.png'))for n in names],H/'playback-review-v2.jpg')
poses=['Idle','Swim','Bite','Eat','Heavy','Ability','Guard','Dodge','Death','TurnLeft']
if all((L/(n+'-v2.png')).exists()for n in poses):sheet([(n,L/(n+'-v2.png'))for n in poses],H/'action-review-v2.jpg')
angles=['front','side','dorsal','threequarter'];sheet([(n,L/('eyes-'+n+'-v2.png'))for n in angles],H/'eye-review-v2.jpg',2,700,525)
angles=['gape','closing','rest','eat','gape-oblique','closing-oblique'];sheet([(n,L/('mouth-'+n+'-v2.png'))for n in angles],H/'mouth-review-v2.jpg',2,700,525)
