"""Lay the rendered Odaraia V3 frames out as one review sheet.

    /tmp/bpyenv/bin/python compose_sheet_v3.py [frames-dir]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
DEFAULT = Path('/tmp/claude-0/-home-user-cambrian/343f5125-052a-5056-8c64-4d5c3d45b1ce/scratchpad/odar')
TILE = (300, 225)
GAP = 8
MARGIN = 26
COLUMNS = 8
BG = (13, 18, 24)
INK = (226, 232, 238)
DIM = (140, 156, 170)
RULE = (44, 56, 68)


def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}', size)


def rows(base):
    attack = [(f'sheet-attack-{int(round(u * 100)):03d}-full.png', f'Attack {u:.2f}') for u in
              (0, .18, .42, .50, .60, .83, 1.0)]
    eat = [(f'sheet-eat-{int(round(u * 100)):03d}-full.png', f'Eat {u:.2f}') for u in
           (0, .22, .36, .52, .67, .78, .88, 1.0)]
    rest = [(f'sheet-rest-{v}.png', f'Rest — {v}') for v in ('lateral', 'dorsal', 'front', 'quarter')]
    decisive = []
    for clip, u, note in (('attack', .50, 'Attack .50 contact'), ('eat', .36, 'Eat .36 secured'),
                          ('eat', .78, 'Eat .78 presented'), ('swim', .50, 'Swim mid-cycle')):
        for kind in ('full', 'lod'):
            decisive.append((f'sheet-decisive-{clip}-{int(round(u * 100)):03d}-{kind}.png',
                             f'{note} — {"full" if kind == "full" else "LOD"}'))
    return [
        ('Rest, shell intact — 130 184 triangles, 406 bones, 18 clips', rest),
        ('Attack: withdraw → serial extension → offset inward contact → elevated withdrawal → staggered re-entry', attack),
        ('Eat: progress-driven reach, secure, elevated carry, oral presentation, release', eat),
        ('Decisive contact and carry poses, full against LOD (49 878 triangles)', decisive),
    ]


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    layout = rows(base)
    title_h, section_h, label_h = 74, 34, 22
    height = MARGIN * 2 + title_h + sum(section_h + TILE[1] + label_h + 18 for _, _ in layout)
    width = MARGIN * 2 + COLUMNS * TILE[0] + (COLUMNS - 1) * GAP
    sheet = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((MARGIN, MARGIN), 'Odaraia alata — V3 production candidate', font=font(30, True), fill=INK)
    draw.text((MARGIN, MARGIN + 38),
              '406-bone deform rig on the accepted material02 geometry · 32 pairs, 20 endopod intervals, '
              '3 tail blades · all eighteen clips on full and LOD · +Y up/ventral, +Z forward',
              font=font(15), fill=DIM)
    y = MARGIN + title_h
    for heading, tiles in layout:
        draw.line([(MARGIN, y + 6), (width - MARGIN, y + 6)], fill=RULE, width=1)
        draw.text((MARGIN, y + 12), heading, font=font(17, True), fill=INK)
        y += section_h
        x = MARGIN
        for name, label in tiles:
            path = base / name
            if path.exists():
                sheet.paste(Image.open(path).convert('RGB').resize(TILE, Image.LANCZOS), (x, y))
            else:
                draw.rectangle([x, y, x + TILE[0], y + TILE[1]], outline=RULE)
                draw.text((x + 10, y + 10), 'missing', font=font(14), fill=DIM)
            draw.text((x + 2, y + TILE[1] + 4), label, font=font(14), fill=DIM)
            x += TILE[0] + GAP
        y += TILE[1] + label_h + 18
    out = base / 'odaraia-v3-sheet.png'
    sheet.save(out)
    print(out, sheet.size)


if __name__ == '__main__':
    main()
