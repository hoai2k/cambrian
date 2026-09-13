"""Static padding-policy/recovery check, no Blender import or execution."""
import ast,hashlib,json,math
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
OUT=ROOT/'bake-03-static-report.json';assert not OUT.exists()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
prior=json.loads((HERE/'frozen-candidate-03.json').read_text())
for row in prior['inputs']:assert sha(row['path'])==row['sha256']
source=(HERE/'bake_03.py').read_text();ast.parse(source)
assert "from body_uv_02 import assign as assign_body_uv, check_coverage, RECTANGLES"in source
assert sha(HERE/'body_uv_02.py')=='4aa2214001f2ddd286770c9da07ec3da9d3eb77819683a335c50d4a4a792d4c7'
assert source.index("image.save();image.pack();maps[channel]=image")<source.index('coverage.append(check_coverage(image,channel))')
assert "BAKE=ROOT/'baked-03'"in source and '01-body-albedo-before-extend.png'in source
bounds=[]
for size in [2048,4096]:
    # A pole triangle's base spans its entire column. Any pixel in the checked
    # fan half-cell/border lies within this conservative distance of that base.
    # Account for pixel-center sampling and the exact gate's ceil/floor border.
    height=max(.72/284,.20/96)*size
    radius=math.hypot(height+4,4)
    assert radius<32
    assert .04*size>2*32+8, 'Padding may cross exterior/oral gap'
    assert .02*size>32+4, 'Padding may reach texture wrap boundary'
    bounds.append({'size':size,'polePlusBorderConservativeRadius':radius,'chosenExtendMargin':32,'stripGapPixels':.04*size})
partials=[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted((ROOT/'baked-02').iterdir())]
assert len(partials)==3 and all('00-fins-'in row['path']for row in partials)
assert not (ROOT/'baked-03').exists() and not (ROOT/'candidate-03').exists()
result={'status':'SOURCE_ONLY_PASS; exact failed pixels and runtime correction still require paired bake',
        'originalFrozenInputsVerified':len(prior['inputs']),'coverageHelperUnchanged':True,
        'source_sha256':{'bake_03.py':sha(HERE/'bake_03.py'),'body_uv_02.py':sha(HERE/'body_uv_02.py')},
        'paddingBounds':bounds,'preservedPartialBaked02':partials,
        'limitations':'No Blender. Old scalar min0 alone cannot distinguish boundary-padding gaps from interior raster coverage; baseline map/probe will locate them.'}
OUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));print('COCCOSTEUS_BAKE_SOURCE_03_COMPLETE')
