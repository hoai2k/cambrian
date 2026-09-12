"""Eye-volume audit for the sculpt-port candidate, at bind pose, full and LOD.

tools/devonian/eye-audit.py's ray-marching `inside()` caps at 64 hops per ray and raises on this
creature's body (its recessed oral funnel is enclosed at rest, not an open aperture, and passing
rays cross the folded interior surface more than 64 times) -- exactly why the original production
used its own float64 projected-triangle classifier for titanichthys instead
(audit_release08_eye_01.py, reused here) rather than the shared tool's ray marcher. This script is
that same method against the candidate GLBs: harvest eye-audit.py's `components`/`close_envelope`/
`wilson`/DIRECTIONS by letting it run against an empty directory (no risk: nothing it does depends
on public assets), then classify with `ProjectedParity` exactly as audit_release08_eye_01.py did.

    python3 tools/devonian/creatures/titanichthys/sculpt-port/eye_audit_candidate.py \
        /home/user/devonian-authoring/titanichthys/sculpt-candidate

No Blender needed -- everything here is pure Python/numpy.
"""
import sys
import json
import runpy
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
REWORK = HERE.parent / 'rework-v3'
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REWORK))
from gltf_evaluate_01 import read_glb
from projected_parity_01 import ProjectedParity

_args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
CANDIDATE = Path(_args[0]) if _args else Path('/home/user/devonian-authoring/titanichthys/sculpt-candidate')
EMPTY = HERE / '.empty-eye-audit-dir'
EMPTY.mkdir(exist_ok=True)
argv = sys.argv[:]
sys.argv = ['eye-audit.py', '--', str(EMPTY)]
core = runpy.run_path(str(Path('/home/user/cambrian/tools/devonian/eye-audit.py')))
sys.argv = argv

report = {'method': 'projected-triangle parity (ProjectedParity), as audit_release08_eye_01.py used for this creature', 'records': []}
passes = []
for name in ('titanichthys.glb', 'titanichthys.lod1.glb'):
    g, evaluate = read_glb(CANDIDATE / name)
    meshes, anchors = evaluate(None, 0.)
    bodies = core['components'](meshes['Titanichthys_new_continuous_sculpt_export'])
    assert len(bodies) == 1, f'{name}: body component count {len(bodies)}'
    head = bodies[0]
    hp, hf, topology = core['close_envelope'](head)
    record = {'asset': name, 'body_topology': {k: v for k, v in topology.items() if k != 'cappedBoundaryLoops'} | {'cappedBoundaryLoopCount': len(topology.get('cappedBoundaryLoops', []))}, 'eyes': []}
    report['records'].append(record)
    assert topology['valid'], f'{name}: head envelope not closed: {topology}'
    trees = [ProjectedParity(hp, hf, d) for d in core['DIRECTIONS']]
    for side in ('L', 'R'):
        eyes = core['components'](meshes['Recessed socket eye ' + side + '_export'])
        assert len(eyes) == 1, f'{name} {side}: eye component count {len(eyes)}'
        eye = eyes[0]
        ep, ef, et = core['close_envelope'](eye)
        assert et['valid'] and not et['cappedBoundaryLoops'], f'{name} {side}: eye globe not closed {et}'
        eye_tree = ProjectedParity(ep, ef, core['DIRECTIONS'][0])
        a = np.array(ep)
        lo, hi = a.min(0), a.max(0)
        rng = np.random.default_rng(719061 + (side == 'R'))
        nbox = 120000
        points = rng.uniform(lo, hi, (nbox, 3))
        eye_class = eye_tree.classify(points)
        assert not np.any(eye_class < 0), 'Uncertain eye rejection samples: report instead of biased denominator'
        accepted = points[eye_class == 1]
        classes = np.array([tree.classify(accepted) for tree in trees]).T
        votes = (classes == 1).sum(1)
        possible = (classes != 0).sum(1)
        n = len(votes)
        assert n > 1000, f'{name} {side}: too few accepted samples ({n})'
        lower = core['wilson'](int((votes == 3).sum()), n)[0]
        upper = core['wilson'](int((possible > 0).sum()), n)[1]
        passed = lower >= 50
        er = {'side': side, 'volume_samples': n, 'inside_percent': 100 * float((votes >= 2).mean()),
              'conservative95_percent': [lower, upper], 'ray_disagreement_count': int(((votes > 0) & (votes < 3)).sum()),
              'minimum50_pass': passed, 'target65': lower >= 65}
        record['eyes'].append(er)
        passes.append(passed)
        print('TITANICHTHYS_CANDIDATE_EYE_VOLUME', name, side, er, flush=True)

report['all_minimum50_pass'] = all(passes)
(CANDIDATE / 'eye-volume.json').write_text(json.dumps(report, indent=2) + '\n')
print('TITANICHTHYS_CANDIDATE_EYE_AUDIT_' + ('OK' if all(passes) else 'FAIL'), str(CANDIDATE / 'eye-volume.json'))
