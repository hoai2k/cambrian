"""Package source albedos and author reproducible periodic microrelief data.

Use the bundled Python with Pillow and NumPy. This does not infer scientific
surface geometry from imagegen. Numerical relief is explicitly artistic.
"""
from pathlib import Path
import hashlib, json, sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
LOCAL = ROOT.parent / 'devonian-authoring/environment-materials'
OUT = ROOT / 'public/assets/devonian/materials'
OUT.mkdir(parents=True, exist_ok=True)
N = 1024
y, x = np.mgrid[0:N, 0:N] / (N - 1)
TAU = np.pi * 2
SPECS = {
 'pale-carbonate': (.5, .0006, .81, 41),
 'dark-carbonate': (.5, .0008, .83, 52),
 'marine-mud': (.25, .00015, .93, 63),
 'freshwater-sediment': (.25, .00025, .91, 74),
 'ripple-sand': (1., .018, .87, 85),
 'microbial-film': (.3, .0002, .74, 97),
 'submerged-wood': (.4, .002, .79, 108),
 'rooted-bank': (1., .006, .94, 119),
}

def field(seed, direction=None):
    rng = np.random.default_rng(seed)
    out = np.zeros((N, N), dtype=np.float32)
    for octave, count in [(2, 5), (7, 8), (24, 8), (70, 6)]:
        for _ in range(count):
            a, b = rng.integers(1, octave + 1, size=2)
            if direction == 'wood': b = max(1, b // 12)
            if direction == 'bank': a = max(1, a // 12)
            out += np.sin(TAU * (a*x + b*y) + rng.uniform(0, TAU)) / (octave**.5 * count)
    return out

def norm(a):
    return (a - a.min()) / max(float(a.max()-a.min()), 1e-9)

def png(a, dest):
    Image.fromarray(np.uint8(np.clip(a, 0, 1)*255+.5)).save(dest)

manifest = []
NORMALS_ONLY = '--normals-only' in sys.argv
existing = {p['id']: p for p in json.loads((OUT/'surface-materials.json').read_text())} if NORMALS_ONLY else {}
prompts = json.loads((ROOT / 'tools/devonian/material-image-prompts.json').read_text())
for p in prompts:
    ident = p['id']; span, amplitude, base_rough, seed = SPECS[ident]
    folder = OUT / ident; folder.mkdir(exist_ok=True)
    source = LOCAL / (ident + '-source.png')
    # File-format/size conversion only. Seamless appearance remains a preview
    # review item; do not silently replace the authored source with painted data.
    if not NORMALS_ONLY:
        Image.open(source).convert('RGB').resize((N, N), Image.Resampling.LANCZOS).save(folder/'albedo.webp', quality=94)
    h = field(seed, 'wood' if ident == 'submerged-wood' else 'bank' if ident == 'rooted-bank' else None)
    if ident == 'ripple-sand':
        h = np.sin(TAU*(8*y + .13*np.sin(TAU*x))) + .08*h
    if ident == 'marine-mud': h *= .3
    if ident == 'submerged-wood': h += .5*np.sin(TAU*(37*x + .04*np.sin(TAU*3*y)))
    h = norm(h)
    # Image rows increase downward, while conventional texture V increases upward.
    # Thus OpenGL tangent Y is +d(height)/d(image-row), X is -d(height)/d(column).
    dx = (np.roll(h,-1,1)-np.roll(h,1,1)) * amplitude / (2*span/N)
    dy = (np.roll(h,-1,0)-np.roll(h,1,0)) * amplitude / (2*span/N)
    normals = np.stack([-dx, dy, np.ones_like(dx)],axis=-1)
    normals /= np.linalg.norm(normals,axis=-1,keepdims=True)
    png(normals*.5+.5, folder/'normal.png')
    if NORMALS_ONLY:
        record = existing[ident]
        normal = folder/'normal.png'
        record['maps']['normal'] = {'path':normal.relative_to(ROOT/'public').as_posix(),'bytes':normal.stat().st_size,'sha256':hashlib.sha256(normal.read_bytes()).hexdigest()}
        record['normalConvention'] = 'tangent-space OpenGL +Y (UV up, image rows down); linear data'
        manifest.append(record)
        continue
    Image.fromarray(np.uint16(h*65535+.5)).save(folder/'height.png')
    png(base_rough + .06*(norm(field(seed+1000))-.5), folder/'roughness.png')
    record = {'code':p['code'],'id':ident,'modelStatus':'preview','tileWidthMeters':span,
      'heightAmplitudeMeters':amplitude,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
      'normalConvention':'tangent-space OpenGL +Y (UV up, image rows down); linear data',
      'heightEncoding':'16-bit unsigned grayscale; zero to heightAmplitudeMeters',
      'provenance':'Original imagegen albedo plus seeded numerically authored microrelief; not a scan or fossil-validated tissue.',
      'refinement':'Review albedo edge seams, perceptual scale, wetness and relief alignment in context.',
      'maps':{}}
    if ident == 'microbial-film':
        coverage = norm(field(seed+2000))
        for label, threshold in [('sparse',.7),('patchy',.52),('broad',.3)]:
            png(np.clip((coverage-threshold)*7,0,1),folder/('coverage-'+label+'.png'))
        # Pigment variants are material factors, not different asserted taxa.
        record['pigmentVariants']={'olive':[.46,.50,.30],'umber':[.45,.32,.20],'grey':[.43,.46,.42]}
    if ident == 'marine-mud':
        png(norm(field(seed+3000)),folder/'disturbance-mask.png')
        record['variants']={'smooth':{'normalScale':.25},'slightly-disturbed':{'normalScale':1,'mask':'disturbance-mask.png'}}
    if ident == 'submerged-wood':
        png(norm(field(seed+4000)),folder/'sediment-mask.png')
        record['variants']={'clean':{'sedimentCoverage':0},'softened-silty':{'sedimentCoverage':.35,'mask':'sediment-mask.png'}}
        record['brokenEndSource']='assets/devonian/props/submerged-log.glb'
    for f in sorted(folder.iterdir()):
        if f.suffix in {'.png','.webp'}:
            record['maps'][f.stem]={'path':f.relative_to(ROOT/'public').as_posix(),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
    manifest.append(record)
(OUT/'surface-materials.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Authored',len(manifest),'material sets; numerical seeds and source hashes preserved.')
