"""Audit and render a raw Tripo GLB without modifying it.

Run with Blender:
  blender --background --factory-startup --python review.py -- \
    --input creature.raw.glb --out review [--preview creature.preview.glb]
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Raw input GLB")
    parser.add_argument("--out", required=True, type=Path, help="Review output directory")
    parser.add_argument("--preview", type=Path, help="Optional decimated preview GLB")
    parser.add_argument("--preview-triangles", type=int, default=40_000)
    parser.add_argument("--resolution", type=int, default=768)
    args = parser.parse_args(argv)
    if not args.input.is_file():
        parser.error(f"input does not exist: {args.input}")
    if not 1_000 <= args.preview_triangles <= 40_000:
        parser.error("--preview-triangles must be from 1000 to 40000")
    if not 256 <= args.resolution <= 2048:
        parser.error("--resolution must be from 256 to 2048")
    return args


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def component_count(mesh):
    """Count connected vertex islands, including isolated vertices."""
    if not mesh.vertices:
        return 0
    adjacency = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].append(b)
        adjacency[b].append(a)
    unseen = set(range(len(mesh.vertices)))
    count = 0
    while unseen:
        count += 1
        stack = [unseen.pop()]
        while stack:
            for neighbor in adjacency[stack.pop()]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
    return count


def world_corners(objects):
    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    return corners


def world_vertices(objects):
    return [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]


def bounds_record(corners):
    low = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (low + high) * 0.5
    size = high - low
    return low, high, center, size


def audit(input_path, objects):
    mesh_rows = []
    for obj in objects:
        mesh = obj.data
        mesh_rows.append(
            {
                "object": obj.name,
                "mesh": mesh.name,
                "vertices": len(mesh.vertices),
                "edges": len(mesh.edges),
                "faces": len(mesh.polygons),
                "triangles": triangle_count(mesh),
                "connected_components": component_count(mesh),
                "material_slots": [slot.material.name if slot.material else None for slot in obj.material_slots],
            }
        )
    low, high, center, size = bounds_record(world_corners(objects))
    materials = []
    for material in sorted({slot.material for obj in objects for slot in obj.material_slots if slot.material}, key=lambda item: item.name):
        images = set()
        if material.use_nodes and material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    images.add(node.image.name)
        materials.append({"name": material.name, "image_textures": sorted(images)})
    textures = []
    used_names = {name for row in materials for name in row["image_textures"]}
    for image in sorted((item for item in bpy.data.images if item.name in used_names), key=lambda item: item.name):
        textures.append(
            {
                "name": image.name,
                "width": int(image.size[0]),
                "height": int(image.size[1]),
                "channels": int(image.channels),
                "packed": image.packed_file is not None,
                "source": image.source,
                "colorspace": image.colorspace_settings.name,
            }
        )
    return {
        "schema_version": 1,
        "input": {
            "path": str(input_path.resolve()),
            "bytes": input_path.stat().st_size,
            "sha256": sha256(input_path),
        },
        "summary": {
            "mesh_objects": len(objects),
            "vertices": sum(row["vertices"] for row in mesh_rows),
            "faces": sum(row["faces"] for row in mesh_rows),
            "triangles": sum(row["triangles"] for row in mesh_rows),
            "connected_components": sum(row["connected_components"] for row in mesh_rows),
            "materials": len(materials),
            "textures": len(textures),
        },
        "bounds": {
            "min_xyz": [round(value, 6) for value in low],
            "max_xyz": [round(value, 6) for value in high],
            "center_xyz": [round(value, 6) for value in center],
            "size_xyz": [round(value, 6) for value in size],
        },
        "meshes": mesh_rows,
        "materials": materials,
        "textures": textures,
    }


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_studio(corners, center, size, resolution):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -1.0
    world = bpy.data.worlds.new("Tripo review world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.045, 0.06, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12
    scene.world = world

    span = max(size.length, 0.01)
    for name, direction, energy, area in (
        ("Key", Vector((1.2, -1.4, 1.8)), 180.0, 2.5),
        ("Fill", Vector((-1.4, -0.5, 0.8)), 70.0, 2.0),
        ("Rim", Vector((0.4, 1.5, 1.2)), 110.0, 1.8),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy * max(span * span, 0.1)
        data.shape = "DISK"
        data.size = area * span
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = center + direction.normalized() * span * 2.2
        point_at(light, center)

    camera_data = bpy.data.cameras.new("Review camera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("Review camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    return camera


def place_camera(camera, direction, center, corners):
    direction = direction.normalized()
    distance = max((point - center).length for point in corners) * 3.0 + 0.1
    camera.location = center + direction * distance
    point_at(camera, center)
    inverse_rotation = camera.rotation_euler.to_matrix().inverted()
    projected = [inverse_rotation @ (point - center) for point in corners]
    min_x, max_x = min(point.x for point in projected), max(point.x for point in projected)
    min_y, max_y = min(point.y for point in projected), max(point.y for point in projected)
    width = max_x - min_x
    height = max_y - min_y
    # Keep the optical axis parallel but center asymmetric silhouettes in camera space.
    camera_axes = camera.rotation_euler.to_matrix()
    camera.location += camera_axes @ Vector(((min_x + max_x) * 0.5, (min_y + max_y) * 0.5, 0.0))
    camera.data.ortho_scale = max(width, height, 0.01) * 1.12
    camera.data.clip_start = max(distance / 1000.0, 0.001)
    camera.data.clip_end = distance * 3.0


def render_views(out_dir, objects, resolution):
    corners = world_corners(objects)
    framing_points = world_vertices(objects)
    _, _, center, size = bounds_record(corners)
    camera = add_studio(corners, center, size, resolution)
    # Imported glTF is Z-up in Blender. Use the wider horizontal dimension as body length.
    length_axis = Vector((1, 0, 0)) if size.x >= size.y else Vector((0, 1, 0))
    side_axis = Vector((0, 1, 0)) if size.x >= size.y else Vector((1, 0, 0))
    views = {
        "side": side_axis * -1.0,
        "top": Vector((0, 0, 1)),
        "three-quarter": (side_axis * -1.4 + length_axis * 0.65 + Vector((0, 0, 0.8))).normalized(),
    }
    rendered = {}
    for name, direction in views.items():
        place_camera(camera, direction, center, framing_points)
        target = out_dir / f"{name}.png"
        bpy.context.scene.render.filepath = str(target)
        bpy.ops.render.render(write_still=True)
        rendered[name] = str(target.resolve())
    return rendered


def selected_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_render = False
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def export_preview(path, source_objects, triangle_limit):
    clones = []
    for source in source_objects:
        clone = source.copy()
        clone.data = source.data.copy()
        clone.animation_data_clear()
        clone.parent = None
        clone.matrix_world = source.matrix_world.copy()
        bpy.context.collection.objects.link(clone)
        clones.append(clone)
    before = sum(triangle_count(obj.data) for obj in clones)
    if before > triangle_limit:
        ratio = min(1.0, triangle_limit / before * 0.985)
        for obj in clones:
            selected_only([obj])
            triangulate = obj.modifiers.new("Preview triangulate", "TRIANGULATE")
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=triangulate.name)
            decimate = obj.modifiers.new("Preview decimate", "DECIMATE")
            decimate.decimate_type = "COLLAPSE"
            decimate.ratio = ratio
            decimate.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=decimate.name)
    after = sum(triangle_count(obj.data) for obj in clones)
    if after > triangle_limit:
        raise RuntimeError(f"decimation produced {after} triangles, above limit {triangle_limit}")
    path.parent.mkdir(parents=True, exist_ok=True)
    selected_only(clones)
    bpy.ops.export_scene.gltf(
        filepath=str(path.resolve()),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=False,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_yup=True,
    )
    record = {
        "path": str(path.resolve()),
        "triangle_limit": triangle_limit,
        "triangles_before": before,
        "triangles_after": after,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }
    for obj in clones:
        bpy.data.objects.remove(obj, do_unlink=True)
    return record


def main():
    args = arguments()
    args.out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        raise RuntimeError("GLB contains no mesh objects")

    report = audit(args.input, objects)
    report["renders"] = render_views(args.out, objects, args.resolution)
    if args.preview:
        report["preview"] = export_preview(args.preview, objects, args.preview_triangles)
    report_path = args.out / "audit.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary = report["summary"]
    print(
        "TRIPO REVIEW",
        f"meshes={summary['mesh_objects']}",
        f"tris={summary['triangles']}",
        f"materials={summary['materials']}",
        f"textures={summary['textures']}",
        f"components={summary['connected_components']}",
        f"report={report_path.resolve()}",
        flush=True,
    )


if __name__ == "__main__":
    main()
