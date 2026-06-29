import json
import os
import math

import bpy
from mathutils import Vector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUT_DIR = os.path.join(REPO_ROOT, "outputs", "apex-operator-direction", "meshy")
GLB_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-textured.glb")
BLEND_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-textured.blend")
RENDER_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-preview.png")
REPORT_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-import-report.json")
APP_READY_GLB_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-app-ready.glb")
APP_READY_BLEND_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-app-ready.blend")
APP_READY_RENDER_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-app-ready-preview.png")
APP_READY_REPORT_PATH = os.path.join(OUT_DIR, "apex-operator-meshy-app-ready-report.json")
APP_READY_TARGET_TRIANGLES = 120000


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for item in list(block):
            block.remove(item)


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def scene_bounds(objects):
    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    min_corner = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    max_corner = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return min_corner, max_corner


def center_model(objects):
    min_corner, max_corner = scene_bounds(objects)
    center = (min_corner + max_corner) * 0.5
    height = max(max_corner.z - min_corner.z, 0.001)

    root = bpy.data.objects.new("ApexOperatorMeshyRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = height * 0.1
    bpy.context.collection.objects.link(root)

    for obj in objects:
        if obj.parent is None:
            obj.parent = root

    root.location = (-center.x, -center.y, -min_corner.z)
    bpy.context.view_layer.update()
    return root


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_camera_and_lights(objects):
    min_corner, max_corner = scene_bounds(objects)
    center = (min_corner + max_corner) * 0.5
    size = max(max_corner.x - min_corner.x, max_corner.y - min_corner.y, max_corner.z - min_corner.z, 0.001)

    bpy.ops.object.light_add(type="AREA", location=(center.x - size * 1.7, center.y - size * 2.2, center.z + size * 1.9))
    key = bpy.context.object
    key.name = "ApexPreviewKeyLight"
    key.data.energy = 550
    key.data.size = size * 1.8

    bpy.ops.object.light_add(type="POINT", location=(center.x + size * 1.2, center.y + size * 1.4, center.z + size * 0.6))
    rim = bpy.context.object
    rim.name = "ApexPreviewCyanRim"
    rim.data.energy = 90
    rim.data.color = (0.22, 0.92, 1.0)

    bpy.ops.object.camera_add(location=(center.x + size * 0.25, center.y - size * 2.8, center.z + size * 0.42))
    camera = bpy.context.object
    camera.name = "ApexPreviewCamera"
    camera.data.lens = 70
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = size * 2.75
    camera.data.dof.aperture_fstop = 5.6
    aim_at(camera, center + Vector((0, 0, size * 0.03)))
    bpy.context.scene.camera = camera


def configure_render():
    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1400
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = RENDER_PATH
    scene.world = scene.world or bpy.data.worlds.new("ApexPreviewWorld")
    scene.world.color = (0.012, 0.014, 0.018)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 64


def collect_report(objects):
    materials = {mat.name for obj in objects for mat in obj.data.materials if mat}
    image_textures = []
    for image in bpy.data.images:
        image_textures.append(
            {
                "name": image.name,
                "size": list(image.size) if image.size else [0, 0],
                "packed": bool(image.packed_file),
                "filepath": image.filepath,
            }
        )

    vertices = sum(len(obj.data.vertices) for obj in objects)
    faces = sum(len(obj.data.polygons) for obj in objects)
    triangles = sum(max(len(poly.vertices) - 2, 1) for obj in objects for poly in obj.data.polygons)
    min_corner, max_corner = scene_bounds(objects)

    return {
        "source_glb": GLB_PATH,
        "blend": BLEND_PATH,
        "preview": RENDER_PATH,
        "mesh_object_count": len(objects),
        "material_count": len(materials),
        "image_texture_count": len(image_textures),
        "vertices": vertices,
        "faces": faces,
        "triangles_estimate": triangles,
        "bounds": {
            "min": [round(value, 4) for value in min_corner],
            "max": [round(value, 4) for value in max_corner],
        },
        "materials": sorted(materials),
        "images": image_textures,
    }


def estimated_triangles(objects):
    return sum(max(len(poly.vertices) - 2, 1) for obj in objects for poly in obj.data.polygons)


def optimize_for_app(objects):
    current_triangles = max(estimated_triangles(objects), 1)
    ratio = min(1.0, max(0.05, APP_READY_TARGET_TRIANGLES / current_triangles))

    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        decimate = obj.modifiers.new("ApexAppReadyDecimate", "DECIMATE")
        decimate.ratio = ratio
        decimate.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=decimate.name)

        normals = obj.modifiers.new("ApexAppReadyWeightedNormals", "WEIGHTED_NORMAL")
        normals.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normals.name)

    bpy.context.view_layer.update()
    return ratio


def main():
    if not os.path.exists(GLB_PATH):
        raise FileNotFoundError(GLB_PATH)

    os.makedirs(OUT_DIR, exist_ok=True)
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
    objects = mesh_objects()
    if not objects:
        raise RuntimeError("No mesh objects were imported from the GLB.")

    center_model(objects)
    setup_camera_and_lights(objects)
    configure_render()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.ops.render.render(write_still=True)

    report = collect_report(objects)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    ratio = optimize_for_app(objects)
    bpy.context.scene.render.filepath = APP_READY_RENDER_PATH
    bpy.ops.wm.save_as_mainfile(filepath=APP_READY_BLEND_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=APP_READY_GLB_PATH, export_format="GLB")

    app_ready_report = collect_report(objects)
    app_ready_report["source_glb"] = APP_READY_GLB_PATH
    app_ready_report["blend"] = APP_READY_BLEND_PATH
    app_ready_report["preview"] = APP_READY_RENDER_PATH
    app_ready_report["optimization"] = {
        "source_triangles_estimate": report["triangles_estimate"],
        "target_triangles": APP_READY_TARGET_TRIANGLES,
        "decimate_ratio": round(ratio, 4),
    }
    with open(APP_READY_REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(app_ready_report, handle, indent=2)

    report["app_ready"] = {
        "glb": APP_READY_GLB_PATH,
        "blend": APP_READY_BLEND_PATH,
        "preview": APP_READY_RENDER_PATH,
        "report": APP_READY_REPORT_PATH,
        "triangles_estimate": app_ready_report["triangles_estimate"],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
