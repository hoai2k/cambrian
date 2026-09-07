"""Assemble labelled sequential pose reviews and sampled playback GIFs from renders."""
from pathlib import Path
from PIL import Image,ImageDraw
H=Path(__file__).resolve().parent;Q=H.parents[3].parent/'devonian-authoring/stethacanthus/v2/renders'
for clip,step in [('Swim',4),('TurnLeft',3),('Heavy',2),('Dodge',1),('Eat',3),('Death',3),('Ability',4)]:
 paths=sorted(Q.glob(clip+'-[0-9][0-9][0-9].png'));assert paths,clip;frames=[];sheet=Image.new('RGB',(1200,((len(paths)+3)//4)*245),(18,28,30));draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(paths):
  raw=Image.open(p).convert('RGBA');bg=Image.new('RGBA',raw.size,(18,28,30,255));bg.alpha_composite(raw);rgb=bg.convert('RGB');frames.append(rgb);im=rgb.resize((300,225),Image.Resampling.LANCZOS);x=(i%4)*300;y=(i//4)*245;sheet.paste(im,(x,y));draw.text((x+8,y+227),clip+'  frame '+p.stem.rsplit('-',1)[1],fill=(232,231,218))
 sheet.save(Q/('sequence-'+clip+'.jpg'),quality=90);frames[0].save(Q/('playback-'+clip+'.gif'),save_all=True,append_images=frames[1:],duration=round(1000*step/30),loop=0,disposal=2)
print('STETHACANTHUS_SEQUENCES_ASSEMBLED')
