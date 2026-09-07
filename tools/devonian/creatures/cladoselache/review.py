"""Compose existing Blender review renders into a contact sheet; no model/image generation."""
from pathlib import Path
from PIL import Image, ImageDraw
import os
here=Path(__file__).resolve().parent
root=here.parents[3]
local=Path(os.environ.get('DEVONIAN_AUTHORING',str(root.parent/'devonian-authoring/cladoselache')))
items=[('Idle','side'),('Swim','side'),('Eat','front'),('Bite','side'),('Heavy','threequarter'),('Ability','front'),('Guard','threequarter'),('Dodge','side'),('Death','threequarter')]
page=Image.new('RGB',(1350,1101),(15,24,27));draw=ImageDraw.Draw(page)
for i,(clip,view) in enumerate(items):
 image=Image.open(local/f'{clip}-{view}.png').convert('RGB').resize((450,337),Image.Resampling.LANCZOS)
 x,y=(i%3)*450,(i//3)*367
 page.paste(image,(x,y+30));draw.text((x+15,y+10),f'{clip} / {view}',fill=(218,221,203))
page.save(here/'action-review.jpg',quality=89)
print(here/'action-review.jpg')
