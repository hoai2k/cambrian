"""Material-04: focused pigment/roughness splice into frozen material-03.
Retain every existing shader node, all anatomy, suture maps and normal signals.
Only two existing links change: plate colour and roughness before suture response.
"""
import argparse, hashlib, importlib.util, json, struct, sys
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4].parent / 'devonian-authoring/coccosteus/rework-v3'
SCRIPT = Path(__file__).resolve()
HELPER = HERE / 'materials-03.py'
VIEWS = HERE / 'material-views-04.json'
SOURCE = ROOT / 'material-03/coccosteus-material-03.blend'
SOURCE_REPORT = ROOT / 'material-03/material-report.json'
OUT = ROOT / 'material-04'
BLEND = OUT / 'coccosteus-material-04.blend'
FROZEN = {
    HELPER: '43a7045aa0e880615a413335ff99eea04f04f13cb3ecb7deaad4408eda846896',
    VIEWS: '6899a98892eac311e79cab2c991ae3a22f6d5e59e6c571015e5e2d09b29303da',
    SOURCE: 'e936eaf3284147d8906c9319652670138f9646436d10b229807e0e9251682a00',
    SOURCE_REPORT: '894dc335cb2c7d50fdf8a5ca661a5e0bdc5e0fd1f9ab69235a403c7e45ec76ca',
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify_inputs():
    for path, digest in FROZEN.items():
        if sha(path) != digest:
            raise RuntimeError('Frozen input mismatch: ' + str(path))

verify_inputs()
spec = importlib.util.spec_from_file_location('frozen_coccosteus_material03', HELPER)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

def plate_attribute_digest(body):
    h = hashlib.sha256()
    for name in ['PlateStrength', 'PlateHead', 'PlateUV']:
        attr = body.data.attributes[name]
        h.update(name.encode())
        for entry in attr.data:
            if attr.data_type == 'FLOAT':
                h.update(struct.pack('<f', entry.value))
            else:
                h.update(struct.pack('<4f', *entry.color))
    return h.hexdigest()

def link_key(link):
    return (link.from_node.name, link.from_socket.identifier,
            link.to_node.name, link.to_socket.identifier)

def upstream(socket):
    assert len(socket.links) == 1, 'Unexpected frozen shader topology'
    return socket.links[0].from_node

def close_color(socket, expected):
    return not socket.is_linked and all(abs(a-b) < 1e-6 for a,b in zip(socket.default_value, (*expected,1)))

def add_dermal_finish(material):
    """Add subdued asymmetric noise; preserve actual material03 node graph otherwise."""
    n = material.node_tree.nodes
    l = material.node_tree.links
    original_nodes = set(n.keys())
    original_links = {link_key(link) for link in l}
    bs = n.get('Principled BSDF')
    colour_final = upstream(bs.inputs['Base Color'])
    colour_edge = upstream(colour_final.inputs[2])
    colour_seam = upstream(colour_edge.inputs[1])
    rough_final = upstream(bs.inputs['Roughness'])
    rough_edge = upstream(rough_final.inputs[2])
    rough_seam = upstream(rough_edge.inputs[1])
    assert all(node.bl_idname == 'ShaderNodeMixRGB' and node.blend_type == 'MIX'
               for node in [colour_final, colour_edge, colour_seam, rough_final, rough_edge, rough_seam])
    assert close_color(colour_seam.inputs[2], (.052,.037,.020))
    assert close_color(colour_edge.inputs[2], (.253,.184,.086))
    assert close_color(rough_seam.inputs[2], (.79,.79,.79))
    assert close_color(rough_edge.inputs[2], (.52,.52,.52))
    colour_socket = colour_seam.inputs[1]
    rough_socket = rough_seam.inputs[1]
    previous_colour = colour_socket.links[0].from_socket
    previous_rough = rough_socket.links[0].from_socket
    replaced = {link_key(colour_socket.links[0]), link_key(rough_socket.links[0])}
    # The original seam value and exclusion attribute remain the anatomical authority.
    seam_gain = upstream(colour_seam.inputs[0])
    assert seam_gain.operation == 'MULTIPLY' and abs(seam_gain.inputs[1].default_value-.72)<1e-6
    seam = seam_gain.inputs[0].links[0].from_socket
    strength_node = next(node for node in n if node.bl_idname == 'ShaderNodeAttribute'
                         and node.attribute_name == 'PlateStrength')
    strength = strength_node.outputs['Fac']
    math = lambda op,a,b: base.math_node(material,op,a,b)
    # 22% residual grain on smoother snout/orbit margins; exact oral/eye materials unchanged.
    region = math('ADD', .22, math('MULTIPLY', strength, .78))
    interior = math('MULTIPLY', region, math('SUBTRACT', 1, math('MULTIPLY', seam, .94)))
    tex = next(node for node in n if node.bl_idname == 'ShaderNodeTexCoord')

    def noise(name, scale, detail, roughness):
        node = n.new('ShaderNodeTexNoise')
        node.name = name
        node.inputs['Scale'].default_value = scale
        node.inputs['Detail'].default_value = detail
        node.inputs['Roughness'].default_value = roughness
        l.new(tex.outputs['Object'], node.inputs['Vector'])
        return node

    # Domain warp changes the shape/density of fine pigment only. No broad colour cloud.
    warp = noise('M04 fine pigment domain warp', 47, 2.1, .67)
    warp_scale = n.new('ShaderNodeVectorMath'); warp_scale.operation = 'SCALE'
    warp_scale.inputs['Scale'].default_value = .019
    l.new(warp.outputs['Color'], warp_scale.inputs[0])
    warp_add = n.new('ShaderNodeVectorMath'); warp_add.operation = 'ADD'
    l.new(tex.outputs['Object'], warp_add.inputs[0]); l.new(warp_scale.outputs['Vector'], warp_add.inputs[1])
    grain = noise('M04 irregular fine umber pigment', 110, 2.6, .73)
    l.new(warp_add.outputs['Vector'], grain.inputs['Vector'])
    pigment = base.ramp(material, grain.outputs['Fac'], [
        (.30,(.63,.66,.69)), (.43,(.78,.80,.82)),
        (.50,(1.04,1.025,1.01)), (.68,(.98,.98,.97))])
    fine = noise('M04 secondary pigment breakup', 235, 1.6, .68)
    fine_colour = base.ramp(material, fine.outputs['Fac'], [
        (.34,(.87,.88,.89)), (.66,(1.02,1.01,1.00))])
    colour = base.mix_rgb(material, math('MULTIPLY', interior, .70), previous_colour, pigment, 'MULTIPLY')
    colour = base.mix_rgb(material, math('MULTIPLY', interior, .45), colour, fine_colour, 'MULTIPLY')
    l.new(colour, colour_socket)
    # Independently sampled roughness; neither diffuse colour nor image luminance drives normal.
    rough_noise = noise('M04 independent fine roughness', 178, 2.3, .61)
    rough_delta = math('MULTIPLY', math('SUBTRACT', rough_noise.outputs['Fac'], .5), .16)
    roughness = math('ADD', previous_rough, math('MULTIPLY', interior, rough_delta))
    l.new(roughness, rough_socket)
    final_links = {link_key(link) for link in l}
    assert original_links - final_links == replaced, 'An unrelated shader link changed'
    assert original_nodes.issubset(set(n.keys())), 'An accepted node was removed'
    # Added connections may enter old nodes at exactly these two selected inputs.
    old_targets = {(link.to_node.name, link.to_socket.identifier) for link in l
                   if link_key(link) not in original_links and link.to_node.name in original_nodes}
    assert old_targets == {(colour_seam.name, colour_socket.identifier), (rough_seam.name, rough_socket.identifier)}
    return {'oldNodeCount': len(original_nodes), 'addedNodeCount': len(n)-len(original_nodes),
            'replacedLinks': sorted(replaced), 'normalBranchUnchanged': True,
            'posteriorBranchUnchanged': True, 'existingSutureResponseUnchanged': True}

def prepare():
    report03 = json.loads(SOURCE_REPORT.read_text())
    assert report03['blendSha256'] == FROZEN[SOURCE]
    OUT.mkdir(parents=True, exist_ok=True)
    base.fresh(BLEND); base.fresh(OUT/'material-report.json')
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    body = next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    image_names = report03['retainedSurface']['originalImages'] + report03['newPlateMaps']
    before = base.specimen_digest(); oral_before,_ = base.oral_digest(body)
    surface_before = base.retained_surface_digest(body,image_names)
    plate_before = plate_attribute_digest(body)
    material = body.data.materials[0].copy()
    material.name = 'Coccosteus M04 | fine living dermal finish'
    patch = add_dermal_finish(material)
    body.data.materials[0] = material
    after = base.specimen_digest(); oral_after,_ = base.oral_digest(body)
    surface_after = base.retained_surface_digest(body,image_names)
    plate_after = plate_attribute_digest(body)
    assert before == after == report03['geometry']['after'], 'Accepted specimen changed'
    assert oral_before == oral_after == report03['geometry']['oralAfter'], 'Accepted oral ownership changed'
    assert surface_before == surface_after, 'Existing images or pigment/material assignments changed'
    assert plate_before == plate_after, 'Accepted plate attributes changed'
    s = bpy.context.scene
    s['candidate'] = 'Coccosteus material-04 PREVIEW; fine pigment/roughness, original plate hierarchy'
    s['source_sha256'] = sha(SCRIPT); s['material03_source_sha256'] = FROZEN[SOURCE]
    s.render.engine='CYCLES'; s.cycles.device='CPU'; s.render.threads_mode='FIXED'; s.render.threads=2
    s.cycles.seed=71204; s.cycles.use_animated_seed=False; s.cycles.samples=48
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report = {'stage':'material-only-study','notApproved':True,'sourceBlend':str(SOURCE),
        'sourceBlendSha256':sha(SOURCE),'sourceReportSha256':sha(SOURCE_REPORT),
        'scriptSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),'helperSha256':sha(HELPER),
        'blend':str(BLEND),'blendSha256':sha(BLEND),
        'geometry':{'before':before,'after':after,'oralBefore':oral_before,'oralAfter':oral_after,'unchanged':before==after},
        'retainedSurface':{'before':surface_before,'after':surface_after,'originalImages':image_names},
        'plateAttributes':{'before':plate_before,'after':plate_after},'shaderPatch':patch,
        'note':'Two-link pigment/roughness splice. All prior nodes/maps, geometry and normal signals retained. Material not approved; no rig.'}
    (OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_04_PREPARE_COMPLETE',flush=True)

def render():
    r=json.loads((OUT/'material-report.json').read_text())
    for key,path in [('scriptSha256',SCRIPT),('viewsSha256',VIEWS),('helperSha256',HELPER),('blendSha256',BLEND)]:
        if r[key]!=sha(path): raise RuntimeError('Frozen material input mismatch '+str(path))
    cfg=json.loads(VIEWS.read_text()); manifest=OUT/'render-manifest.json'; base.fresh(manifest)
    for view in cfg['views']: base.fresh(OUT/(view['name']+'.png'))
    bpy.ops.wm.open_mainfile(filepath=str(BLEND)); s=bpy.context.scene
    s.render.resolution_x,s.render.resolution_y=cfg['resolution']; s.render.resolution_percentage=100; s.cycles.samples=cfg['samples']
    s.render.engine='CYCLES'; s.cycles.device='CPU'; s.render.threads_mode='FIXED'; s.render.threads=2
    body=next(o for o in s.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    material=body.data.materials[0]; clay,_=base.make_mat('Relief inspection same neutral clay',(.40,.385,.355),.66)
    records=[]
    for view in cfg['views']:
        for o in s.objects:
            if o.type=='MESH' and o.data.shape_keys: o.data.shape_keys.key_blocks['GapeStudy'].value=view.get('gape',0)
        body.data.materials[0]=clay if view.get('mode')=='clay' else material
        cam=s.camera; cam.location=view['camera']; cam.rotation_euler=(Vector(view['target'])-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=view['scale']
        path=OUT/(view['name']+'.png'); s.render.filepath=str(path); bpy.context.view_layer.update(); bpy.ops.render.render(write_still=True)
        records.append({'file':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'view':view})
        manifest.write_text(json.dumps({'source':str(BLEND),'sourceSha256':sha(BLEND),'scriptSha256':sha(SCRIPT),
            'viewsSha256':sha(VIEWS),'complete':len(records)==len(cfg['views']),'CPU':True,'threads':2,'renders':records},indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_04_RENDER_COMPLETE',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--stage',required=True,choices=['prepare','render'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    prepare() if args.stage=='prepare' else render()
