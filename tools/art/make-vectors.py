"""Create outlined wordmark and native SVG interface marks. Requires fonttools."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
ROOT=Path(__file__).resolve().parents[2]; brand=ROOT/'public/assets/brand';ui=ROOT/'public/assets/ui'
def svg(body,box='0 0 64 64',size=64): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="{box}">{body}</svg>\n'
burst='M32 2 39 18 54 9 48 26 63 32 48 39 55 55 39 48 32 63 25 48 9 55 16 39 1 32 17 25 10 9 25 17Z'
emblem=f'<path d="{burst}" fill="#ff5b6e"/><path d="M14 32Q32 10 50 32Q32 54 14 32Z" fill="#eefaf6"/><circle cx="32" cy="32" r="9" fill="#07202a"/><path d="m32 24 5 3v6l-5 3-5-3v-6z" fill="#61f2d5"/>'
(ROOT/'public/favicon.svg').write_text(svg(emblem))
(brand/'emblem-tile.svg').write_text(svg('<rect width="64" height="64" rx="14" fill="#07202a"/><g transform="translate(7 7) scale(.78)">'+emblem+'</g>'))
font=TTFont('/System/Library/Fonts/Supplemental/Arial Black.ttf');glyphs=font.getGlyphSet();cmap=font.getBestCmap()
def word(text,y,width,fill):
 x=0;parts=[]
 for c in text:
  name=cmap[ord(c)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen)
  parts.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>');x+=glyphs[name].width+12
 return f'<g fill="{fill}" transform="translate(155 {y}) skewX(-8) scale({width/x} -.19)">'+''.join(parts)+'</g>'
logo='<defs><linearGradient id="heat"><stop stop-color="#ffb36b"/><stop offset=".55" stop-color="#ff5b6e"/><stop offset="1" stop-color="#ff9ac2"/></linearGradient></defs>'
logo+=word('CAMBRIAN',375,2010,'#eefaf6')+word('EXPLOSION',745,2110,'url(#heat)')
logo+='<g fill="#ff9ac2"><path d="m2220 440 100-80-42 112z"/><path d="m2270 515 117-15-100 70z"/><path d="m2288 620 90 50-105 5z"/></g>'
(brand/'logo.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="900" viewBox="0 0 2400 900" role="img" aria-label="Cambrian Explosion">{logo}</svg>\n')
for n in range(1,6):
 body='<ellipse cx="32" cy="37" rx="9" ry="13"/>' if n==1 else f'<ellipse cx="32" cy="36" rx="{10+n*2}" ry="{14+n}"/>'
 if n>=2:
  for y in ([33,43] if n==2 else [28,37,46]): body+=f'<path d="M20 {y} 9 {y-6} 15 {y+5}h34l6-11-11 6Z"/>'
 if n>=4: body+='<path d="m16 22-5-14 15 12h12L53 8l-5 14z"/>'
 if n==5: body+='<path d="m23 16-5-12 10 6 4-10 4 10 10-6-5 12z"/>'
 body+='<circle cx="27" cy="30" r="2" fill="#000" fill-opacity="0"/>' if False else ''
 (ui/f'tier-{n}.svg').write_text(svg('<g fill="currentColor">'+body+'</g>'))
bands={'snack':'<ellipse cx="12" cy="12" rx="6" ry="4"/><circle cx="5" cy="6" r="2"/><circle cx="18" cy="5" r="1.5"/>','prey':'<path d="M5 12Q12 2 19 10l4-4v12l-4-4Q12 22 5 12ZM1 7h6v2H1zm0 8h6v2H1z"/>','rival':'<path d="m3 2 8 6-2 3 13 9-3 3L6 12 3 13 1 6l4 2zm18 0-8 6 2 3L2 20l3 3 13-11 3 1 2-7-4 2z"/>','threat':'<path d="M4 2h16c0 10-4 17-13 21 5-7 6-13 5-16L8 5 6 12Z"/>','giant':'<path fill-rule="evenodd" d="M12 1C-1 1-1 18 6 19v4h4v-4h4v4h4v-4C25 18 25 1 12 1ZM4 10l6 2-2 4-4-2zm16 0v4l-4 2-2-4z"/>'}
for name,body in bands.items(): (ui/f'band-{name}.svg').write_text(svg('<g fill="currentColor">'+body+'</g>','0 0 24 24',24))
(ui/'loading.svg').write_text(svg('<style>@media(prefers-reduced-motion:no-preference){g{transform-origin:32px 32px;animation:spin 8s linear infinite}}@keyframes spin{to{transform:rotate(360deg)}}</style><g>'+emblem+'</g>'))
