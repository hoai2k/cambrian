"""Turn one reviewed raw Tripo prop into a base-pivoted instanced game GLB.

The immutable raw generation remains outside this script. This pass only joins the imported mesh,
reduces it to the requested triangle budget, normalizes it to the design-table scale, packs its
textures, saves the editable Blender source, exports one static GLB, and renders its viewer image.

Run with Blender:
  blender --background --factory-startup --python process_tripo.py -- \
    --id daonella-bed --input daonella-bed.raw.glb --output daonella-bed.glb \
    --blend daonella-bed.blend --portrait daonella-bed.png --size 1.2 --axis width --triangles 3000
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


def args():
    tail = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--id", required=True)
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--blend", required=True, type=Path)
    p.add_argument("--portrait", required=True, type=Path)
    p.add_argument("--size", required=True, type=float)
    p.add_argument("--axis", choices=("width", "height"), required=True)
    p.add_argument("--triangles", required=True, type=int)
    p.add_argument("--resolution", type=int, default=768)
    a = p.parse_args(tail)
    if not a.input.is_file(): p.error(f"missing input: {a.input}")
    if a.size <= 0 or a.triangles < 500: p.error("size must be positive and triangles >= 500")
    return a


def mesh_bounds(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
    return lo, hi


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def bake_base_colour(obj):
    """Sample the generated albedo into a glTF COLOR_0 corner attribute.

    The sea renderer deliberately shares one shader material across every instance and only keeps
    position/normal/colour from a prop GLB. Baking here preserves the authored Tripo pigment while
    avoiding one texture sample and material clone for every dense scenery family.
    """
    mesh = obj.data
    uv_layer = mesh.uv_layers.active
    material = obj.active_material
    image = None
    if material and material.use_nodes and material.node_tree:
        principled = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if principled:
            socket = principled.inputs.get("Base Color")
            if socket and socket.is_linked:
                node = socket.links[0].from_node
                if node.type == "TEX_IMAGE": image = node.image
        if image is None:
            image = next((n.image for n in material.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
    if uv_layer is None or image is None or image.size[0] < 1 or image.size[1] < 1:
        raise RuntimeError("generated prop has no UV-linked base-colour image to bake")
    width, height = int(image.size[0]), int(image.size[1])
    pixels = list(image.pixels[:])
    colours = mesh.color_attributes.get("Color") or mesh.color_attributes.new(
        name="Color", type="BYTE_COLOR", domain="CORNER")
    for loop in mesh.loops:
        uv = uv_layer.data[loop.index].uv
        x = min(width - 1, max(0, int((uv.x % 1.0) * (width - 1) + 0.5)))
        y = min(height - 1, max(0, int((uv.y % 1.0) * (height - 1) + 0.5)))
        i = (y * width + x) * 4
        colours.data[loop.index].color = (pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
    mesh.color_attributes.active_color = colours
    mesh.color_attributes.render_color_index = mesh.color_attributes.find(colours.name)
    mesh.uv_layers.remove(uv_layer)
    mesh.materials.clear()
    baked = bpy.data.materials.new(f"{obj.name}-vertex-colour")
    baked.use_nodes = True
    principled = next(n for n in baked.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    vertex = baked.node_tree.nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = colours.name
    baked.node_tree.links.new(vertex.outputs["Color"], principled.inputs["Base Color"])
    baked.node_tree.links.new(vertex.outputs["Alpha"], principled.inputs["Alpha"])
    principled.inputs["Roughness"].default_value = 0.72
    mesh.materials.append(baked)


def look_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_portrait(obj, target_path, resolution):
    lo, hi = mesh_bounds(obj)
    center = (lo + hi) * 0.5
    size = hi - lo
    span = max(size.length, 0.01)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.65

    world = bpy.data.worlds.new("Triassic prop portrait")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.035, 0.045, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18
    scene.world = world

    camera_data = bpy.data.cameras.new("Portrait camera")
    camera = bpy.data.objects.new("Portrait camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(size.x, size.y, size.z) * 1.32
    camera.location = center + Vector((span * 1.05, -span * 1.35, span * 0.82))
    look_at(camera, center + Vector((0, 0, size.z * 0.04)))
    scene.camera = camera

    for name, direction, energy, radius in (
        ("Key", Vector((-1.5, -2.0, 2.7)), 1050, span * 1.6),
        ("Fill", Vector((2.0, -0.3, 1.3)), 650, span * 1.3),
        ("Rim", Vector((0.2, 2.0, 2.0)), 900, span * 1.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = max(radius, 0.5)
        lamp = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(lamp)
        lamp.location = center + direction.normalized() * span * 1.5
        look_at(lamp, center)

    target_path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(target_path)
    bpy.ops.render.render(write_still=True)


def main():
    a = args()
    # `--factory-startup` still opens Blender's camera/light/cube scene. Remove it before import;
    # otherwise the cube would be joined into the generated prop and set a false one-unit height.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(a.input.resolve()), import_shading="NORMALS")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes: raise RuntimeError("Tripo GLB contains no mesh")
    for o in meshes:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    if len(meshes) > 1: bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = a.id
    obj.data.name = f"{a.id}-mesh"

    # Bake the importer transform first. The reviewed Tripo outputs arrive centred at the origin,
    # but applying it here keeps the exported node transform simple and makes pivot validation exact.
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    before = triangles(obj)
    if before > a.triangles:
        dec = obj.modifiers.new("Instancing triangle budget", "DECIMATE")
        dec.ratio = a.triangles / before
        dec.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=dec.name)

    lo, hi = mesh_bounds(obj)
    extent = max(hi.x - lo.x, hi.y - lo.y) if a.axis == "width" else hi.z - lo.z
    if extent <= 1e-8: raise RuntimeError("degenerate generated bounds")
    scale = a.size / extent
    obj.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Validate in final game units. Tiny collapse remnants are invisible but become zero-area
    # triangles after a 0.3-unit prop is scaled down, so remove them before colour baking/export.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1e-5)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    tiny = [face for face in bm.faces if face.calc_area() <= 5e-6]
    if tiny: bmesh.ops.delete(bm, geom=tiny, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()

    bake_base_colour(obj)

    lo, hi = mesh_bounds(obj)
    obj.location += Vector((-(lo.x + hi.x) * 0.5, -(lo.y + hi.y) * 0.5, -lo.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    # The renderer loads one instanced mesh. Keeping one material preserves the generated UV/PBR
    # surface while avoiding a hierarchy or per-instance object traversal.
    for image in bpy.data.images:
        if image.source == "FILE" and image.filepath:
            try: image.pack()
            except RuntimeError: pass

    a.blend.parent.mkdir(parents=True, exist_ok=True)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(a.blend.resolve()))
    render_portrait(obj, a.portrait.resolve(), a.resolution)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(a.output.resolve()), export_format="GLB", use_selection=True,
        export_apply=True, export_animations=False, export_texcoords=False,
        export_normals=True, export_materials="EXPORT", export_image_format="AUTO",
        export_jpeg_quality=88,
    )
    lo, hi = mesh_bounds(obj)
    print(f"PROP {a.id} tris={triangles(obj)} bounds={[round(v, 5) for v in (*lo, *hi)]}")


main()
