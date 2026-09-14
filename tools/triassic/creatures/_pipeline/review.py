"""Review rendering shared by the four ichthyosauromorph deliveries.

Headless Blender has no GL context, so this is CYCLES on the CPU; Workbench needs EGL and fails.
Every sheet in these deliveries is rendered from the **decoded packaged** GLB rather than from the
authoring scene, so what is looked at is what shipped.

CYCLES ignores `use_backface_culling`, so the see-through measurement emulates it: a backfacing
shading point is made transparent. Without that, a review shot shows the near wall of the mouth
lining that the runtime throws away, and cannot be used to judge either fault.
"""
import bpy, os, sys
from mathutils import Vector
from pathlib import Path


def load(source):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    s = bpy.context.scene
    s.render.fps = 30
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    # Ten samples with denoising. These sheets are looked at for silhouette, deformation and gape,
    # not for material noise, and the machine that renders them is shared: at 24 a full paired set
    # for one animal is most of an hour.
    s.cycles.samples = 10
    s.cycles.use_denoising = True
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.film_transparent = True
    s.view_settings.view_transform = 'AgX'
    s.world.use_nodes = True
    s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
    rig = next(o for o in s.objects if o.type == 'ARMATURE')
    if rig.animation_data:
        for tr in rig.animation_data.nla_tracks:
            tr.mute = True
    # About half the energy the era's first builders used. Those were tuned on a five-unit body
    # seen whole; a close camera on a pale flank blew the source markings out to white, and the
    # pipeline is explicit that a review render must not hide them.
    for loc, power in (((3, -5, 5), 460), ((-3, -1, 3), 280), ((0, 4, 4), 500), ((0, -5, -2), 120)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        o = bpy.context.object
        o.data.energy = power
        o.data.size = 5
        o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    s.camera = cam
    cam.data.type = 'ORTHO'
    return s, rig, cam


def emulate_backface_cull():
    """Make every material that culls in the runtime actually cull here, and make every material
    that does not, not. CYCLES has no such switch, so a Geometry > Backfacing input drives a
    transparent mix."""
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.use_backface_culling:
            continue
        nt = mat.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out or not out.inputs['Surface'].links:
            continue
        shader = out.inputs['Surface'].links[0].from_node
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(shader.outputs[0], mix.inputs[1])
        nt.links.new(tr.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])


def subject_bounds():
    """The union box of every mesh in the scene, in world space. Review cameras are framed off it
    rather than off the origin: these bodies are measured into a frame whose origin is the
    generation's own centroid, not the middle of the animal, so a camera aimed at (0,0,0) crops
    the tail on three of the four."""
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            p = o.matrix_world @ Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], p[i])
                hi[i] = max(hi[i], p[i])
    centre = [(a + b) / 2 for a, b in zip(lo, hi)]
    size = [b - a for a, b in zip(lo, hi)]
    return centre, size


def poser(scene, rig):
    def pose(clip, t):
        a = next(a for a in bpy.data.actions
                 if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
        rig.animation_data.action = a
        if a.slots:
            rig.animation_data.action_slot = a.slots[0]
        scene.frame_set(round(t * 30))
    return pose


def renderer(scene, cam):
    def render(file, w=700, h=525, loc=(7, -5, 4.2), target=(0, 0, 0), scale=6.4):
        cam.location = loc
        cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = scale
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        scene.render.filepath = str(file)
        bpy.ops.render.render(write_still=True)
    return render
