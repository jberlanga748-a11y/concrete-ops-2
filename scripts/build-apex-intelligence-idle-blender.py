import json
import math
import os

import bpy
import numpy as np
from mathutils import Vector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUT_DIR = os.path.join(REPO_ROOT, "outputs", "apex-operator-direction", "apex-intelligence")
SOURCE_GLB_PATH = os.path.join(OUT_DIR, "apex-intelligence-meshy-source.glb")
SOURCE_BLEND_PATH = os.path.join(OUT_DIR, "apex-intelligence-meshy-source.blend")
SOURCE_RENDER_PATH = os.path.join(OUT_DIR, "apex-intelligence-meshy-source-preview.png")
SOURCE_REPORT_PATH = os.path.join(OUT_DIR, "apex-intelligence-meshy-source-report.json")
APP_READY_GLB_PATH = os.path.join(OUT_DIR, "apex-intelligence-idle-app-ready.glb")
APP_READY_BLEND_PATH = os.path.join(OUT_DIR, "apex-intelligence-idle-app-ready.blend")
APP_READY_RENDER_PATH = os.path.join(OUT_DIR, "apex-intelligence-idle-app-ready-preview.png")
APP_READY_REPORT_PATH = os.path.join(OUT_DIR, "apex-intelligence-idle-app-ready-report.json")
APP_READY_TARGET_TRIANGLES = 150000


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for item in list(block):
            block.remove(item)


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def top_level_objects():
    return [obj for obj in bpy.context.scene.objects if obj.parent is None]


def scene_bounds(objects):
    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    min_corner = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    max_corner = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return min_corner, max_corner


def estimated_triangles(objects):
    return sum(max(len(poly.vertices) - 2, 1) for obj in objects for poly in obj.data.polygons)


def create_empty(name, parent=None):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.22
    bpy.context.collection.objects.link(empty)
    if parent:
        empty.parent = parent
    return empty


def center_imported_model(objects):
    min_corner, max_corner = scene_bounds(objects)
    center = (min_corner + max_corner) * 0.5
    height = max(max_corner.z - min_corner.z, 0.001)

    rig = create_empty("ApexIntelligenceIdleRig")
    model_root = create_empty("ApexIntelligenceModelRoot", rig)
    rig.empty_display_size = height * 0.08
    model_root.empty_display_size = height * 0.06

    for obj in top_level_objects():
        if obj == rig:
            continue
        obj.parent = model_root

    model_root.location = (-center.x, -center.y, -min_corner.z)
    bpy.context.view_layer.update()
    return rig, model_root


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_camera_and_lights(objects, render_path):
    min_corner, max_corner = scene_bounds(objects)
    center = (min_corner + max_corner) * 0.5
    size = max(max_corner.x - min_corner.x, max_corner.y - min_corner.y, max_corner.z - min_corner.z, 0.001)

    bpy.ops.object.light_add(type="AREA", location=(center.x - size * 1.4, center.y - size * 2.0, center.z + size * 1.65))
    key = bpy.context.object
    key.name = "ApexIntelligencePreviewKey"
    key.data.energy = 700
    key.data.size = size * 1.7

    bpy.ops.object.light_add(type="POINT", location=(center.x + size * 1.2, center.y + size * 1.1, center.z + size * 0.7))
    rim = bpy.context.object
    rim.name = "ApexIntelligencePreviewCyanRim"
    rim.data.energy = 150
    rim.data.color = (0.22, 0.92, 1.0)

    bpy.ops.object.camera_add(location=(center.x + size * 0.18, center.y - size * 2.55, center.z + size * 0.34))
    camera = bpy.context.object
    camera.name = "ApexIntelligencePreviewCamera"
    camera.data.lens = 76
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = size * 2.45
    camera.data.dof.aperture_fstop = 6.3
    aim_at(camera, center + Vector((0, 0, size * 0.05)))
    bpy.context.scene.camera = camera

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
    scene.render.filepath = render_path
    scene.world = scene.world or bpy.data.worlds.new("ApexIntelligencePreviewWorld")
    scene.world.color = (0.012, 0.014, 0.018)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 64


def set_keyframe(owner, frame, location=None, rotation=None, scale=None):
    if location is not None:
        owner.location = location
        owner.keyframe_insert(data_path="location", frame=frame)
    if rotation is not None:
        owner.rotation_euler = rotation
        owner.keyframe_insert(data_path="rotation_euler", frame=frame)
    if scale is not None:
        owner.scale = scale
        owner.keyframe_insert(data_path="scale", frame=frame)


def smooth_action_keyframes(action):
    for fcurve in getattr(action, "fcurves", []) or []:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "BEZIER"


def create_transform_action(owner, action_name, keyframes):
    owner.animation_data_create()
    action = bpy.data.actions.new(action_name)
    owner.animation_data.action = action
    for keyframe in keyframes:
        set_keyframe(
            owner,
            keyframe["frame"],
            location=keyframe.get("location"),
            rotation=keyframe.get("rotation"),
            scale=keyframe.get("scale"),
        )
    smooth_action_keyframes(action)
    owner.animation_data.action = None
    return action


def add_nla_clip(owner, clip_name, action, start_frame, duration):
    owner.animation_data_create()
    track = owner.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, start_frame, action)
    strip.frame_start = start_frame
    strip.frame_end = start_frame + duration - 1
    strip.blend_type = "REPLACE"
    strip.use_sync_length = True
    return strip


def speaking_keyframes(duration, hover, target="rig"):
    frames = [1, 10, 20, 30, 40, 50, 60, 72, 84, duration]
    keyframes = []
    for index, frame in enumerate(frames):
        phase = ((index % 2) * 2) - 1
        pulse = 0.5 + math.sin(index * 1.7) * 0.5
        if target == "rig":
            keyframes.append(
                {
                    "frame": frame,
                    "location": (0, 0, hover * (0.34 + pulse * 1.18)),
                    "rotation": (math.radians(phase * (0.16 + pulse * 0.22)), 0, math.radians(phase * (0.32 + pulse * 0.38))),
                    "scale": (1 + pulse * 0.012, 1 + pulse * 0.012, 1 + pulse * 0.012),
                }
            )
        else:
            keyframes.append(
                {
                    "frame": frame,
                    "rotation": (math.radians(phase * (0.34 + pulse * 0.28)), math.radians(-phase * 0.18), 0),
                    "scale": (1 + pulse * 0.008, 1 + pulse * 0.008, 1 + pulse * 0.014),
                }
            )
    keyframes[0]["location"] = (0, 0, 0) if target == "rig" else keyframes[0].get("location")
    keyframes[-1]["location"] = (0, 0, 0) if target == "rig" else keyframes[-1].get("location")
    keyframes[0]["scale"] = (1, 1, 1)
    keyframes[-1]["scale"] = (1, 1, 1)
    return keyframes


def create_state_animations(rig, model_root, objects):
    min_corner, max_corner = scene_bounds(objects)
    height = max(max_corner.z - min_corner.z, 0.001)
    hover = min(max(height * 0.014, 0.018), 0.038)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.render.fps = 24

    for owner in (rig, model_root):
        if owner.animation_data:
            owner.animation_data_clear()

    clips = [
        {
            "name": "Idle",
            "start": 1,
            "duration": 144,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-1.1)), "scale": (1, 1, 1)},
                {"frame": 36, "location": (0, 0, hover), "rotation": (0, 0, math.radians(0.35)), "scale": (1.004, 1.004, 1.004)},
                {"frame": 72, "location": (0, 0, 0), "rotation": (0, 0, math.radians(1.1)), "scale": (1.008, 1.008, 1.008)},
                {"frame": 108, "location": (0, 0, -hover * 0.28), "rotation": (0, 0, math.radians(-0.35)), "scale": (0.998, 0.998, 0.998)},
                {"frame": 144, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-1.1)), "scale": (1, 1, 1)},
            ],
            "model": [
                {"frame": 1, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
                {"frame": 48, "rotation": (math.radians(0.28), 0, 0), "scale": (1.003, 1.003, 1.006)},
                {"frame": 96, "rotation": (math.radians(-0.22), 0, 0), "scale": (0.999, 0.999, 0.998)},
                {"frame": 144, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
            ],
            "intent": "calm hover and breath",
        },
        {
            "name": "Listening",
            "start": 160,
            "duration": 120,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (math.radians(-0.18), 0, math.radians(-0.65)), "scale": (1, 1, 1)},
                {"frame": 30, "location": (0, 0, hover * 0.68), "rotation": (math.radians(0.1), 0, math.radians(0.28)), "scale": (1.003, 1.003, 1.003)},
                {"frame": 60, "location": (0, 0, hover * 0.25), "rotation": (math.radians(0.22), 0, math.radians(0.82)), "scale": (1.006, 1.006, 1.006)},
                {"frame": 90, "location": (0, 0, hover * 0.5), "rotation": (math.radians(-0.1), 0, math.radians(-0.12)), "scale": (1.002, 1.002, 1.002)},
                {"frame": 120, "location": (0, 0, 0), "rotation": (math.radians(-0.18), 0, math.radians(-0.65)), "scale": (1, 1, 1)},
            ],
            "model": [
                {"frame": 1, "rotation": (0, math.radians(-0.36), 0), "scale": (1, 1, 1)},
                {"frame": 40, "rotation": (math.radians(0.18), math.radians(0.28), 0), "scale": (1.002, 1.002, 1.004)},
                {"frame": 80, "rotation": (math.radians(-0.14), math.radians(0.48), 0), "scale": (1.001, 1.001, 1.002)},
                {"frame": 120, "rotation": (0, math.radians(-0.36), 0), "scale": (1, 1, 1)},
            ],
            "intent": "quiet awareness scan",
        },
        {
            "name": "Hearing",
            "start": 300,
            "duration": 72,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-0.2)), "scale": (1, 1, 1)},
                {"frame": 10, "location": (0, 0, hover * 1.25), "rotation": (math.radians(0.28), 0, math.radians(0.34)), "scale": (1.011, 1.011, 1.011)},
                {"frame": 22, "location": (0, 0, hover * 0.3), "rotation": (math.radians(-0.34), 0, math.radians(-0.42)), "scale": (1.003, 1.003, 1.003)},
                {"frame": 36, "location": (0, 0, hover * 1.05), "rotation": (math.radians(0.18), 0, math.radians(0.5)), "scale": (1.014, 1.014, 1.014)},
                {"frame": 54, "location": (0, 0, -hover * 0.2), "rotation": (math.radians(-0.16), 0, math.radians(-0.22)), "scale": (0.998, 0.998, 0.998)},
                {"frame": 72, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-0.2)), "scale": (1, 1, 1)},
            ],
            "model": [
                {"frame": 1, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
                {"frame": 18, "rotation": (math.radians(0.32), math.radians(-0.16), 0), "scale": (1.004, 1.004, 1.01)},
                {"frame": 36, "rotation": (math.radians(-0.24), math.radians(0.18), 0), "scale": (1.007, 1.007, 1.014)},
                {"frame": 72, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
            ],
            "intent": "responsive input pulse",
        },
        {
            "name": "Thinking",
            "start": 392,
            "duration": 144,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (math.radians(0.08), 0, math.radians(-1.45)), "scale": (1, 1, 1)},
                {"frame": 36, "location": (0, 0, hover * 0.42), "rotation": (math.radians(0.32), 0, math.radians(-0.18)), "scale": (1.003, 1.003, 1.003)},
                {"frame": 72, "location": (0, 0, hover * 0.72), "rotation": (math.radians(-0.12), 0, math.radians(1.45)), "scale": (1.006, 1.006, 1.006)},
                {"frame": 108, "location": (0, 0, hover * 0.28), "rotation": (math.radians(-0.3), 0, math.radians(0.12)), "scale": (1.002, 1.002, 1.002)},
                {"frame": 144, "location": (0, 0, 0), "rotation": (math.radians(0.08), 0, math.radians(-1.45)), "scale": (1, 1, 1)},
            ],
            "model": [
                {"frame": 1, "rotation": (0, math.radians(-0.18), 0), "scale": (1, 1, 1)},
                {"frame": 48, "rotation": (math.radians(0.26), math.radians(0.24), math.radians(0.08)), "scale": (1.002, 1.002, 1.006)},
                {"frame": 96, "rotation": (math.radians(-0.2), math.radians(0.38), math.radians(-0.08)), "scale": (1.004, 1.004, 1.002)},
                {"frame": 144, "rotation": (0, math.radians(-0.18), 0), "scale": (1, 1, 1)},
            ],
            "intent": "deep processing orbit",
        },
        {
            "name": "Speaking",
            "start": 560,
            "duration": 96,
            "rig": speaking_keyframes(96, hover, "rig"),
            "model": speaking_keyframes(96, hover, "model"),
            "intent": "voice-driven chest and head pulse",
        },
        {
            "name": "Blocked",
            "start": 680,
            "duration": 96,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (math.radians(-0.14), 0, math.radians(-0.18)), "scale": (0.998, 0.998, 0.998)},
                {"frame": 24, "location": (0, 0, -hover * 0.24), "rotation": (math.radians(-0.38), 0, math.radians(0.18)), "scale": (0.994, 0.994, 0.994)},
                {"frame": 48, "location": (0, 0, -hover * 0.12), "rotation": (math.radians(-0.22), 0, math.radians(-0.26)), "scale": (0.996, 0.996, 0.996)},
                {"frame": 72, "location": (0, 0, -hover * 0.24), "rotation": (math.radians(-0.32), 0, math.radians(0.16)), "scale": (0.994, 0.994, 0.994)},
                {"frame": 96, "location": (0, 0, 0), "rotation": (math.radians(-0.14), 0, math.radians(-0.18)), "scale": (0.998, 0.998, 0.998)},
            ],
            "model": [
                {"frame": 1, "rotation": (math.radians(-0.12), 0, 0), "scale": (1, 1, 1)},
                {"frame": 48, "rotation": (math.radians(-0.28), 0, 0), "scale": (0.998, 0.998, 0.998)},
                {"frame": 96, "rotation": (math.radians(-0.12), 0, 0), "scale": (1, 1, 1)},
            ],
            "intent": "contained safety lock",
        },
        {
            "name": "Alert",
            "start": 800,
            "duration": 72,
            "rig": [
                {"frame": 1, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-0.9)), "scale": (1, 1, 1)},
                {"frame": 9, "location": (0, 0, hover * 1.45), "rotation": (math.radians(0.34), 0, math.radians(0.78)), "scale": (1.016, 1.016, 1.016)},
                {"frame": 18, "location": (0, 0, hover * 0.18), "rotation": (math.radians(-0.28), 0, math.radians(-0.74)), "scale": (1.002, 1.002, 1.002)},
                {"frame": 36, "location": (0, 0, hover * 1.1), "rotation": (math.radians(0.22), 0, math.radians(0.92)), "scale": (1.012, 1.012, 1.012)},
                {"frame": 54, "location": (0, 0, -hover * 0.08), "rotation": (math.radians(-0.14), 0, math.radians(-0.34)), "scale": (0.998, 0.998, 0.998)},
                {"frame": 72, "location": (0, 0, 0), "rotation": (0, 0, math.radians(-0.9)), "scale": (1, 1, 1)},
            ],
            "model": [
                {"frame": 1, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
                {"frame": 18, "rotation": (math.radians(0.42), math.radians(-0.22), 0), "scale": (1.006, 1.006, 1.012)},
                {"frame": 36, "rotation": (math.radians(-0.36), math.radians(0.2), 0), "scale": (1.004, 1.004, 1.008)},
                {"frame": 72, "rotation": (0, 0, 0), "scale": (1, 1, 1)},
            ],
            "intent": "operator attention pulse",
        },
    ]

    exported = []
    for clip in clips:
        rig_action = create_transform_action(rig, f"ApexIntelligence{clip['name']}Transform", clip["rig"])
        model_action = create_transform_action(model_root, f"ApexIntelligence{clip['name']}Breath", clip["model"])
        add_nla_clip(rig, clip["name"], rig_action, clip["start"], clip["duration"])
        add_nla_clip(model_root, clip["name"], model_action, clip["start"], clip["duration"])
        exported.append(
            {
                "clip": clip["name"],
                "intent": clip["intent"],
                "start_frame": clip["start"],
                "end_frame": clip["start"] + clip["duration"] - 1,
                "duration_seconds": round(clip["duration"] / scene.render.fps, 2),
            }
        )

    scene.frame_end = max(item["end_frame"] for item in exported)
    scene.frame_set(1)

    return {
        "clips": exported,
        "fps": scene.render.fps,
        "hover_amplitude": round(hover, 5),
    }


def optimize_for_app(objects):
    source_triangles = max(estimated_triangles(objects), 1)
    ratio = min(1.0, max(0.05, APP_READY_TARGET_TRIANGLES / source_triangles))

    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        decimate = obj.modifiers.new("ApexIntelligenceAppReadyDecimate", "DECIMATE")
        decimate.ratio = ratio
        if hasattr(decimate, "use_collapse_triangulate"):
            decimate.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=decimate.name)

        normals = obj.modifiers.new("ApexIntelligenceWeightedNormals", "WEIGHTED_NORMAL")
        normals.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normals.name)

    bpy.context.view_layer.update()
    return ratio


def clean_baked_white_artifacts():
    cleanup = []
    for image in bpy.data.images:
        is_base_color = "BaseColor" in image.name
        is_emit = "Emit" in image.name or "Emission" in image.name
        if not is_base_color and not is_emit:
            continue
        width, height = image.size
        if width <= 0 or height <= 0:
            continue

        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        rgba = pixels.reshape((-1, 4))
        rgb = rgba[:, :3]
        max_channel = rgb.max(axis=1)
        min_channel = rgb.min(axis=1)
        brightness_floor = 0.58 if is_base_color else 0.28
        neutral_band = 0.24 if is_base_color else 0.2
        bright_neutral = (max_channel > brightness_floor) & ((max_channel - min_channel) < neutral_band)
        cool_signal = (rgb[:, 2] > rgb[:, 0] * 1.18) & (rgb[:, 1] > rgb[:, 0] * 1.05)
        amber_signal = (rgb[:, 0] > rgb[:, 2] * 1.35) & (rgb[:, 1] > rgb[:, 2] * 0.85)
        cleanup_mask = bright_neutral & ~cool_signal & ~amber_signal
        changed = int(cleanup_mask.sum())
        if not changed:
            continue

        if is_emit:
            rgba[cleanup_mask, 0] = 0.0
            rgba[cleanup_mask, 1] = 0.0
            rgba[cleanup_mask, 2] = 0.0
        else:
            rgba[cleanup_mask, 0] = 0.025
            rgba[cleanup_mask, 1] = 0.038
            rgba[cleanup_mask, 2] = 0.045
        image.pixels.foreach_set(pixels)
        image.update()
        image.pack()
        cleanup.append(
            {
                "image": image.name,
                "pixels_changed": changed,
                "total_pixels": width * height,
            }
        )
    return cleanup


def collect_report(objects, source_path, blend_path, preview_path):
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
    triangles = estimated_triangles(objects)
    min_corner, max_corner = scene_bounds(objects)

    return {
        "source_glb": source_path,
        "blend": blend_path,
        "preview": preview_path,
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
        "animations": [action.name for action in bpy.data.actions],
    }


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def main():
    if not os.path.exists(SOURCE_GLB_PATH):
        raise FileNotFoundError(SOURCE_GLB_PATH)

    os.makedirs(OUT_DIR, exist_ok=True)
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=SOURCE_GLB_PATH)
    objects = mesh_objects()
    if not objects:
        raise RuntimeError("No mesh objects were imported from the GLB.")

    rig, model_root = center_imported_model(objects)
    setup_camera_and_lights(objects, SOURCE_RENDER_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND_PATH)
    bpy.ops.render.render(write_still=True)
    source_report = collect_report(objects, SOURCE_GLB_PATH, SOURCE_BLEND_PATH, SOURCE_RENDER_PATH)
    write_json(SOURCE_REPORT_PATH, source_report)

    texture_cleanup = clean_baked_white_artifacts()
    ratio = optimize_for_app(objects)
    state_animation_report = create_state_animations(rig, model_root, objects)
    bpy.context.scene.render.filepath = APP_READY_RENDER_PATH
    bpy.ops.wm.save_as_mainfile(filepath=APP_READY_BLEND_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(
        filepath=APP_READY_GLB_PATH,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_materials="EXPORT",
        export_lights=False,
        export_cameras=False,
        export_apply=False,
    )

    app_ready_report = collect_report(objects, APP_READY_GLB_PATH, APP_READY_BLEND_PATH, APP_READY_RENDER_PATH)
    app_ready_report["optimization"] = {
        "source_triangles_estimate": source_report["triangles_estimate"],
        "target_triangles": APP_READY_TARGET_TRIANGLES,
        "decimate_ratio": round(ratio, 4),
    }
    app_ready_report["texture_cleanup"] = texture_cleanup
    app_ready_report["state_animations"] = state_animation_report
    app_ready_report["idle_animation"] = next(
        (clip for clip in state_animation_report["clips"] if clip["clip"] == "Idle"),
        None,
    )
    write_json(APP_READY_REPORT_PATH, app_ready_report)

    source_report["app_ready"] = {
        "glb": APP_READY_GLB_PATH,
        "blend": APP_READY_BLEND_PATH,
        "preview": APP_READY_RENDER_PATH,
        "report": APP_READY_REPORT_PATH,
        "triangles_estimate": app_ready_report["triangles_estimate"],
        "animations": app_ready_report["animations"],
    }
    print(json.dumps(source_report, indent=2))


if __name__ == "__main__":
    main()
