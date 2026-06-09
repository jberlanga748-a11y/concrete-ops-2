import math
import os

import bpy


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
GLB_PATH = os.path.join(REPO_ROOT, "public", "assets", "apex-avatar", "apex-assistant.glb")
BLEND_PATH = os.path.join(REPO_ROOT, "outputs", "apex-avatar-source", "apex-assistant.blend")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.actions):
        for item in list(block):
            block.remove(item)


def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return


def create_material(name, color, metallic=0.0, roughness=0.35, alpha=1.0, emission=None, emission_strength=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (color[0], color[1], color[2], alpha)
    material.use_nodes = True
    material.blend_method = "BLEND" if alpha < 1 else "OPAQUE"
    material.use_screen_refraction = alpha < 1
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        set_input(bsdf, ["Base Color"], (color[0], color[1], color[2], alpha))
        set_input(bsdf, ["Alpha"], alpha)
        set_input(bsdf, ["Metallic"], metallic)
        set_input(bsdf, ["Roughness"], roughness)
        if emission:
            set_input(bsdf, ["Emission Color", "Emission"], (emission[0], emission[1], emission[2], 1))
            set_input(bsdf, ["Emission Strength"], emission_strength)
    return material


def create_empty(name, parent=None, location=(0, 0, 0)):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.25
    empty.location = location
    bpy.context.collection.objects.link(empty)
    if parent:
        empty.parent = parent
    return empty


def assign_material(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def create_box(name, size, material, location, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    obj.dimensions = size
    if parent:
        obj.parent = parent
    assign_material(obj, material)
    return obj


def create_tapered_box(name, top, bottom, height, top_depth, bottom_depth, material, location=(0, 0, 0), rotation=(0, 0, 0), parent=None):
    tx = top / 2
    bx = bottom / 2
    tyd = top_depth / 2
    byd = bottom_depth / 2
    zt = height / 2
    zb = -height / 2
    vertices = [
        (-bx, -byd, zb),
        (bx, -byd, zb),
        (bx, byd, zb),
        (-bx, byd, zb),
        (-tx, -tyd, zt),
        (tx, -tyd, zt),
        (tx, tyd, zt),
        (-tx, tyd, zt),
    ]
    faces = [
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
        (4, 5, 6, 7),
        (3, 2, 1, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    assign_material(obj, material)
    return obj


def create_cylinder(name, radius, depth, vertices, material, location, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    if parent:
        obj.parent = parent
    assign_material(obj, material)
    return obj


def create_torus(name, major_radius, minor_radius, material, location, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=72,
        minor_segments=8,
        location=location,
        major_radius=major_radius,
        minor_radius=minor_radius,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    if parent:
        obj.parent = parent
    assign_material(obj, material)
    return obj


def create_mouth(material, parent):
    width = 0.62
    height = 0.085
    vertices = [
        (-width / 2, 0, height / 2),
        (width / 2, 0, height / 2),
        (-width / 2, 0, -height / 2),
        (width / 2, 0, -height / 2),
    ]
    faces = [(0, 2, 3, 1)]
    mesh = bpy.data.meshes.new("MouthMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Mouth", mesh)
    obj.location = (0, -0.335, -0.17)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    assign_material(obj, material)

    obj.shape_key_add(name="Basis")
    mouth_open = obj.shape_key_add(name="mouthOpen")
    jaw_open = obj.shape_key_add(name="jawOpen")
    for key in (mouth_open, jaw_open):
        key.value = 0
    for index in (2, 3):
        mouth_open.data[index].co.z -= 0.14
        mouth_open.data[index].co.y -= 0.02
        jaw_open.data[index].co.z -= 0.22
        jaw_open.data[index].co.y -= 0.025
    return obj


def create_action(owner, clip_name, channels):
    action_name = f"{clip_name}_{getattr(owner, 'name', 'ShapeKeys')}"
    max_frame = 1
    owner.animation_data_create()
    owner.animation_data.action = bpy.data.actions.new(action_name)
    for data_path, index, keyframes in channels:
        for frame, value in keyframes:
            if data_path in {"location", "scale"}:
                getattr(owner, data_path)[index] = value
            elif data_path.startswith('key_blocks["'):
                key_name = data_path.split('"')[1]
                owner.key_blocks[key_name].value = value
            if data_path.startswith('key_blocks["'):
                owner.keyframe_insert(data_path=data_path, frame=frame)
            else:
                owner.keyframe_insert(data_path=data_path, index=index, frame=frame)
            max_frame = max(max_frame, frame)
    action = owner.animation_data.action
    track = owner.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, 1, action)
    strip.frame_start = 1
    strip.frame_end = max_frame
    owner.animation_data.action = None
    return action


def add_vector_action(owner, clip_name, data_path, keyframes):
    channels = []
    for axis in range(3):
        channels.append((data_path, axis, [(frame, values[axis]) for frame, values in keyframes]))
    create_action(owner, clip_name, channels)


def build_model():
    clear_scene()
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 120
    bpy.context.scene.render.fps = 24

    graphite = create_material("GraphiteArmor", (0.067, 0.094, 0.145), metallic=0.72, roughness=0.32)
    deep_graphite = create_material("DeepGraphiteUnderstructure", (0.018, 0.035, 0.055), metallic=0.82, roughness=0.38)
    cyan = create_material(
        "CyanHologramGlass",
        (0.4, 0.91, 0.98),
        metallic=0.12,
        roughness=0.18,
        alpha=0.56,
        emission=(0.05, 0.64, 0.91),
        emission_strength=1.7,
    )
    orange = create_material(
        "ApexOrangeCore",
        (0.98, 0.48, 0.13),
        metallic=0.2,
        roughness=0.22,
        emission=(0.95, 0.25, 0.05),
        emission_strength=2.2,
    )
    blue_line = create_material(
        "BlueSignalLines",
        (0.22, 0.74, 0.97),
        alpha=0.72,
        emission=(0.02, 0.45, 0.78),
        emission_strength=1.9,
    )
    holo_panel = create_material(
        "TransparentHoloPanels",
        (0.49, 0.83, 0.99),
        alpha=0.24,
        emission=(0.22, 0.74, 0.97),
        emission_strength=1.1,
    )

    rig = create_empty("ApexAssistantRig")
    torso_group = create_empty("Torso", rig)
    shoulders = create_empty("Shoulders", rig)
    arms = create_empty("Arms", rig)
    head = create_empty("Head", rig, (0, 0, 1.67))
    chest_core = create_empty("ChestCore", torso_group, (0, -0.32, 0.72))
    holo_panels = create_empty("HoloPanels", rig)
    energy_rings = create_empty("EnergyRings", rig)

    create_tapered_box("TorsoArmor", 1.04, 0.72, 1.18, 0.46, 0.34, graphite, (0, 0, 0.62), parent=torso_group)
    create_box("SternumSignalColumn", (0.16, 0.05, 1.0), blue_line, (0, -0.25, 0.64), parent=torso_group)
    create_box("LeftRibArmor", (0.34, 0.08, 0.08), deep_graphite, (-0.32, -0.28, 0.75), (0, 0, -0.18), torso_group)
    create_box("RightRibArmor", (0.34, 0.08, 0.08), deep_graphite, (0.32, -0.28, 0.75), (0, 0, 0.18), torso_group)

    create_cylinder("ChestCoreLens", 0.19, 0.07, 8, orange, (0, 0, 0), (math.pi / 2, 0, 0), chest_core)
    create_torus("ChestCoreHalo", 0.28, 0.012, cyan, (0, 0, 0), (math.pi / 2, 0, 0), chest_core)

    create_tapered_box("LeftShoulderBlade", 0.5, 0.72, 0.22, 0.3, 0.44, graphite, (-0.82, 0, 1.13), (0, 0, -0.24), shoulders)
    create_tapered_box("RightShoulderBlade", 0.5, 0.72, 0.22, 0.3, 0.44, graphite, (0.82, 0, 1.13), (0, 0, 0.24), shoulders)

    create_box("LeftUpperArm", (0.16, 0.18, 0.58), deep_graphite, (-1.02, 0, 0.67), (0, 0, -0.2), arms)
    create_box("RightUpperArm", (0.16, 0.18, 0.58), deep_graphite, (1.02, 0, 0.67), (0, 0, 0.2), arms)
    create_box("LeftForearm", (0.14, 0.16, 0.52), graphite, (-1.08, -0.02, 0.1), (0, 0, 0.08), arms)
    create_box("RightForearm", (0.14, 0.16, 0.52), graphite, (1.08, -0.02, 0.1), (0, 0, -0.08), arms)

    create_box("NeckCore", (0.28, 0.22, 0.22), deep_graphite, (0, 0, 1.24), parent=rig)
    create_tapered_box("FacetedHelmet", 0.62, 0.78, 0.62, 0.42, 0.5, graphite, parent=head)
    create_box("BrowArmor", (0.74, 0.08, 0.08), deep_graphite, (0, -0.29, 0.12), parent=head)
    visor = create_box("Visor", (0.58, 0.025, 0.16), cyan, (0, -0.32, 0.02), parent=head)
    mouth = create_mouth(orange, head)
    jaw = create_box("Jaw", (0.48, 0.12, 0.13), deep_graphite, (0, -0.22, -0.34), parent=head)
    create_box("LeftTempleFin", (0.08, 0.2, 0.34), blue_line, (-0.45, 0, 0.02), (0, 0, 0.18), head)
    create_box("RightTempleFin", (0.08, 0.2, 0.34), blue_line, (0.45, 0, 0.02), (0, 0, -0.18), head)

    left_panel = create_box("LeftHoloPanel", (0.38, 0.018, 0.52), holo_panel, (-1.38, -0.12, 1.0), (0.04, 0.5, -0.08), holo_panels)
    right_panel = create_box("RightHoloPanel", (0.38, 0.018, 0.52), holo_panel, (1.38, -0.12, 0.96), (-0.04, -0.5, 0.08), holo_panels)
    create_box("CrownHoloPanel", (0.5, 0.018, 0.16), holo_panel, (0, 0.02, 2.24), (0.4, 0, 0), holo_panels)

    upper_ring = create_torus("EnergyRingUpper", 0.82, 0.011, cyan, (0, 0, 1.36), (math.pi / 2.65, 0, 0), energy_rings)
    lower_ring = create_torus("EnergyRingLower", 0.96, 0.012, orange, (0, 0, 0.62), (math.pi / 2.8, 0, 0.42), energy_rings)
    boot_halo = create_torus("BootHalo", 1.16, 0.009, blue_line, (0, 0, -0.22), (math.pi / 2, 0, 0), rig)

    add_vector_action(rig, "Idle", "location", [(1, (0, 0, 0)), (60, (0, 0, 0.04)), (120, (0, 0, 0))])
    add_vector_action(head, "Idle", "location", [(1, (0, 0, 1.67)), (60, (0, 0.02, 1.7)), (120, (0, 0, 1.67))])
    add_vector_action(chest_core, "Idle", "scale", [(1, (1, 1, 1)), (36, (1.08, 1.08, 1.08)), (72, (0.96, 0.96, 0.96)), (120, (1, 1, 1))])
    add_vector_action(upper_ring, "Idle", "scale", [(1, (1, 1, 1)), (60, (1.04, 1.04, 1.04)), (120, (1, 1, 1))])
    add_vector_action(lower_ring, "Idle", "scale", [(1, (1, 1, 1)), (60, (0.96, 0.96, 0.96)), (120, (1, 1, 1))])

    add_vector_action(visor, "Listening", "scale", [(1, (1, 1, 1)), (38, (1.1, 1, 1.18)), (78, (1, 1, 1))])
    add_vector_action(left_panel, "Listening", "location", [(1, (-1.38, -0.12, 1.0)), (38, (-1.46, -0.14, 1.03)), (78, (-1.38, -0.12, 1.0))])
    add_vector_action(right_panel, "Listening", "location", [(1, (1.38, -0.12, 0.96)), (38, (1.46, -0.14, 0.99)), (78, (1.38, -0.12, 0.96))])

    add_vector_action(left_panel, "Thinking", "scale", [(1, (1, 1, 1)), (20, (1.04, 1, 1.16)), (40, (0.96, 1, 1.08)), (58, (1, 1, 1))])
    add_vector_action(right_panel, "Thinking", "scale", [(1, (1, 1, 1)), (20, (0.96, 1, 1.08)), (40, (1.04, 1, 1.16)), (58, (1, 1, 1))])
    add_vector_action(boot_halo, "Thinking", "scale", [(1, (1, 1, 1)), (30, (1.12, 1.12, 1.12)), (58, (1, 1, 1))])

    shape_keys = mouth.data.shape_keys
    create_action(
        shape_keys,
        "Speaking",
        [
            ('key_blocks["mouthOpen"].value', 0, [(1, 0), (5, 0.86), (9, 0.18), (14, 1), (18, 0.22), (25, 0.74), (30, 0)]),
            ('key_blocks["jawOpen"].value', 0, [(1, 0), (7, 0.52), (15, 0.1), (22, 0.42), (30, 0)]),
        ],
    )
    add_vector_action(visor, "Speaking", "scale", [(1, (1, 1, 1)), (10, (1.16, 1, 1.08)), (20, (1.08, 1, 1.18)), (30, (1, 1, 1))])
    add_vector_action(jaw, "Speaking", "location", [(1, (0, -0.22, -0.34)), (12, (0, -0.23, -0.39)), (20, (0, -0.22, -0.35)), (30, (0, -0.22, -0.34))])

    add_vector_action(visor, "Blocked", "scale", [(1, (1, 1, 1)), (8, (1.22, 1, 0.72)), (16, (0.96, 1, 0.9)), (34, (1.12, 1, 0.8)), (52, (1, 1, 1))])
    add_vector_action(chest_core, "Blocked", "scale", [(1, (1, 1, 1)), (8, (0.82, 0.82, 0.82)), (16, (1.08, 1.08, 1.08)), (52, (1, 1, 1))])

    add_vector_action(rig, "Boot", "scale", [(1, (0.18, 0.18, 0.18)), (10, (0.72, 0.72, 1.08)), (28, (1.03, 1.03, 1.03)), (48, (1, 1, 1))])
    add_vector_action(boot_halo, "Boot", "scale", [(1, (0.2, 0.2, 0.2)), (14, (1.35, 1.35, 1.35)), (30, (0.92, 0.92, 0.92)), (48, (1, 1, 1))])

    bpy.ops.object.light_add(type="AREA", location=(0, -4, 4))
    bpy.context.object.name = "ApexAssistantPreviewLight"
    bpy.context.object.data.energy = 350
    bpy.context.object.data.size = 4

    return {
        "rig": rig,
        "mouth": mouth,
        "animations": ["Idle", "Listening", "Thinking", "Speaking", "Blocked", "Boot"],
    }


def export_assets():
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    build_model()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_morph=True,
        export_morph_animation=True,
        export_materials="EXPORT",
        export_lights=False,
        export_cameras=False,
        export_apply=False,
    )
    print(f"Wrote {GLB_PATH}")
    print(f"Saved source {BLEND_PATH}")


if __name__ == "__main__":
    export_assets()
