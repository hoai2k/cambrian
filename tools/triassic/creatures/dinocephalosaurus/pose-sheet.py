"""Assemble the pose study into one sheet: the generated pose, the unbend, and the rejected loft."""
from PIL import Image, ImageDraw
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring/dinocephalosaurus/pose-study'
dest = Path(__file__).resolve().parent
rows = [('posed', 'the generation, untouched'), ('transport', 'the rigid-section unbend, which ships'),
        ('resample', 'the rebuilt loft, measured and not used')]
w, h = 520, 380
img = Image.new('RGB', (w * 2, h * len(rows)), (28, 34, 40))
d = ImageDraw.Draw(img)
for i, (name, label) in enumerate(rows):
    for j, view in enumerate(['side', 'top']):
        p = base / ('%s-%s.png' % (name, view))
        assert p.exists(), p
        src = Image.open(p).convert('RGB')
        src.thumbnail((w, h - 26))
        img.paste(src, (j * w + (w - src.width) // 2, i * h + 24))
        d.text((j * w + 8, i * h + 7), '%s / %s - %s' % (name, view, label), fill='white')
img.save(dest / 'pose-study-sheet.jpg', quality=92)
print('wrote pose-study-sheet')
