import math
import os

import bpy
from mathutils import Vector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
VERSION = "v4"
OUT_DIR = os.path.join(REPO_ROOT, "outputs", "apex-operator-direction", f"silhouette-{VERSION}")
BLEND_PATH = os.path.join(OUT_DIR, f"apex-operator-silhouette-{VERSION}.blend")
RENDER_PATH = os.path.join(OUT_DIR, f"apex-operator-silhouette-{VERSION}.png")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.actions):
        for item in list(collection):
            collection.remove(item)


def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return


def make_material(name, color, metallic=0.0, roughness=0.35, alpha=1.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (color[0], color[1], color[2], alpha)
    mat.use_nodes = True
    mat.blend_method = "BLEND" if alpha < 1 else "OPAQUE"
    mat.use_screen_refraction = alpha < 1
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        set_input(bsdf, ["Base Color"], (color[0], color[1], color[2], alpha))
        set_input(bsdf, ["Metallic"], metallic)
        set_input(bsdf, ["Roughness"], roughness)
        set_input(bsdf, ["Alpha"], alpha)
        if emission:
            set_input(bsdf, ["Emission Color", "Emission"], (emission[0], emission[1], emission[2], 1.0))
            set_input(bsdf, ["Emission Strength"], emission_strength)
    return mat


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_bevel(obj, amount=0.035, segments=1):
    bevel = obj.modifiers.new("SilhouetteBevel", "BEVEL")
    bevel.width = amount
    bevel.segments = segments
    bevel.affect = "EDGES"
    obj.modifiers.new("WeightedNormals", "WEIGHTED_NORMAL")
    return obj


def cube(name, location, scale, material, rotation=(0, 0, 0), bevel=0.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    if bevel:
        add_bevel(obj, bevel)
    return obj


def tapered_box(name, top_width, bottom_width, height, top_depth, bottom_depth, material, location=(0, 0, 0), rotation=(0, 0, 0), parent=None, bevel=0.02):
    tx = top_width / 2
    bx = bottom_width / 2
    ty = top_depth / 2
    by = bottom_depth / 2
    zt = height / 2
    zb = -height / 2
    verts = [
        (-bx, -by, zb),
        (bx, -by, zb),
        (bx, by, zb),
        (-bx, by, zb),
        (-tx, -ty, zt),
        (tx, -ty, zt),
        (tx, ty, zt),
        (-tx, ty, zt),
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
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    if bevel:
        add_bevel(obj, bevel)
    return obj


def cylinder(name, location, radius, depth, material, vertices=32, rotation=(0, 0, 0), parent=None, bevel=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    if bevel:
        add_bevel(obj, 0.012)
    return obj


def torus(name, location, major, minor, material, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=96,
        minor_segments=10,
        major_radius=major,
        minor_radius=minor,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}Mesh"
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    return obj


def hex_panel(name, points, material, location=(0, 0, 0), rotation=(0, 0, 0), parent=None):
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    verts = [(x, 0, z) for x, z in points]
    faces = [tuple(range(len(verts)))]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    return obj


def extruded_panel(name, points, depth, material, location=(0, 0, 0), rotation=(0, 0, 0), parent=None, bevel=0.018):
    front_y = -depth / 2
    back_y = depth / 2
    verts = [(x, front_y, z) for x, z in points] + [(x, back_y, z) for x, z in points]
    count = len(points)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, next_index + count, index + count))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if parent:
        obj.parent = parent
    if bevel:
        add_bevel(obj, bevel)
    return obj


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.25
    obj.location = location
    bpy.context.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def build_operator():
    clear_scene()
    os.makedirs(OUT_DIR, exist_ok=True)

    graphite = make_material("Graphite armor", (0.026, 0.035, 0.048), metallic=0.62, roughness=0.26)
    graphite_2 = make_material("Deep understructure", (0.006, 0.011, 0.018), metallic=0.85, roughness=0.32)
    cyan_glass = make_material(
        "Cyan hologram shell",
        (0.28, 0.9, 1.0),
        metallic=0.0,
        roughness=0.12,
        alpha=0.22,
        emission=(0.1, 0.8, 1.0),
        emission_strength=1.7,
    )
    cyan_line = make_material(
        "Cyan signal edge",
        (0.5, 0.96, 1.0),
        alpha=0.58,
        emission=(0.15, 0.85, 1.0),
        emission_strength=2.25,
    )
    cyan_dim = make_material(
        "Dim cyan seam light",
        (0.18, 0.78, 0.88),
        alpha=0.44,
        emission=(0.07, 0.46, 0.58),
        emission_strength=1.1,
    )
    orange = make_material(
        "Apex orange core",
        (1.0, 0.46, 0.08),
        metallic=0.12,
        roughness=0.2,
        emission=(1.0, 0.34, 0.05),
        emission_strength=3.2,
    )
    orange_dim = make_material(
        "Dim orange data light",
        (1.0, 0.54, 0.16),
        alpha=0.72,
        emission=(1.0, 0.26, 0.04),
        emission_strength=1.4,
    )
    visor_glow = make_material(
        "Apex visor glow",
        (0.34, 0.95, 1.0),
        alpha=0.52,
        emission=(0.16, 0.86, 1.0),
        emission_strength=2.9,
    )
    panel_mat = make_material(
        "Floating command panels",
        (0.32, 0.86, 1.0),
        alpha=0.1,
        emission=(0.16, 0.65, 1.0),
        emission_strength=0.9,
    )
    graphite_edge = make_material("Carbon bevel highlights", (0.042, 0.061, 0.078), metallic=0.7, roughness=0.22)
    smoked_glass = make_material("Smoked glass bevels", (0.035, 0.09, 0.11), metallic=0.05, roughness=0.16, alpha=0.3, emission=(0.02, 0.13, 0.16), emission_strength=0.35)

    root = empty(f"Apex Operator Silhouette {VERSION.upper()}")
    body = empty("Operator Body", parent=root)
    panels = empty("Floating command panel layer", parent=root)
    rings = empty("Hologram rings", parent=root)
    face_animation = empty("Animation targets - face visor mouth", parent=body)
    core_animation = empty("Animation targets - chest reactor", parent=body)

    # Main body silhouette: sharp head/shoulders/torso first, details second.
    tapered_box("Command torso shell", 1.18, 0.68, 1.48, 0.5, 0.36, graphite, (0, 0, 1.18), parent=body, bevel=0.04)
    tapered_box("Inner dark torso core", 0.68, 0.44, 1.0, 0.32, 0.24, graphite_2, (0, -0.28, 1.08), parent=body, bevel=0.026)
    tapered_box("Left torso side bevel", 0.14, 0.24, 1.02, 0.08, 0.1, graphite_2, (-0.49, -0.32, 1.14), rotation=(0, 0, -0.08), parent=body, bevel=0.016)
    tapered_box("Right torso side bevel", 0.14, 0.24, 1.02, 0.08, 0.1, graphite_2, (0.49, -0.32, 1.14), rotation=(0, 0, 0.08), parent=body, bevel=0.016)
    cube("Segmented orange command spine upper", (0, -0.49, 1.36), (0.1, 0.055, 0.42), orange, parent=body, bevel=0.014)
    cube("Segmented orange command spine lower", (0, -0.49, 0.86), (0.1, 0.055, 0.48), orange, parent=body, bevel=0.014)
    cube("Left cyan torso conduit", (-0.24, -0.5, 1.08), (0.025, 0.035, 0.72), cyan_line, rotation=(0, 0, -0.06), parent=body, bevel=0.006)
    cube("Right cyan torso conduit", (0.24, -0.5, 1.08), (0.025, 0.035, 0.72), cyan_line, rotation=(0, 0, 0.06), parent=body, bevel=0.006)
    cube("Upper chest armor bar", (0, -0.5, 1.58), (0.95, 0.075, 0.12), graphite_2, parent=body, bevel=0.022)
    left_breast_points = [(-0.42, -0.22), (-0.14, -0.2), (-0.08, 0.14), (-0.22, 0.26), (-0.5, 0.16), (-0.54, -0.08)]
    right_breast_points = [(0.42, -0.22), (0.14, -0.2), (0.08, 0.14), (0.22, 0.26), (0.5, 0.16), (0.54, -0.08)]
    extruded_panel("Left layered breast armor", left_breast_points, 0.06, graphite_edge, (0, -0.52, 1.32), parent=body, bevel=0.014)
    extruded_panel("Right layered breast armor", right_breast_points, 0.06, graphite_edge, (0, -0.52, 1.32), parent=body, bevel=0.014)
    center_plate_points = [(-0.16, -0.44), (0.16, -0.44), (0.24, -0.12), (0.16, 0.24), (-0.16, 0.24), (-0.24, -0.12)]
    extruded_panel("Recessed center reactor plate", center_plate_points, 0.065, graphite_2, (0, -0.585, 1.18), parent=body, bevel=0.016)

    cylinder("Dark core socket", (0, -0.575, 1.31), 0.27, 0.075, graphite_2, vertices=12, rotation=(math.pi / 2, 0, 0), parent=core_animation, bevel=True)
    cylinder("Chest core lens", (0, -0.61, 1.31), 0.15, 0.055, orange, vertices=12, rotation=(math.pi / 2, 0, 0), parent=core_animation, bevel=True)
    torus("Chest core outer ring", (0, -0.62, 1.31), 0.26, 0.009, cyan_line, rotation=(math.pi / 2, 0, 0), parent=core_animation)
    torus("Chest core inner pulse", (0, -0.625, 1.31), 0.17, 0.005, visor_glow, rotation=(math.pi / 2, 0, 0), parent=core_animation)
    torus("Chest core glass trace", (0, -0.628, 1.31), 0.305, 0.004, cyan_dim, rotation=(math.pi / 2, 0, 0), parent=core_animation)
    cube("Left chest seam upper", (-0.33, -0.625, 1.49), (0.25, 0.012, 0.014), cyan_dim, rotation=(0, 0, -0.08), parent=body, bevel=0.004)
    cube("Right chest seam upper", (0.33, -0.625, 1.49), (0.25, 0.012, 0.014), cyan_dim, rotation=(0, 0, 0.08), parent=body, bevel=0.004)
    cube("Left reactor bracket", (-0.35, -0.63, 1.29), (0.055, 0.014, 0.25), graphite_edge, parent=body, bevel=0.006)
    cube("Right reactor bracket", (0.35, -0.63, 1.29), (0.055, 0.014, 0.25), graphite_edge, parent=body, bevel=0.006)
    cube("Lower reactor data tick", (0, -0.635, 1.0), (0.2, 0.012, 0.018), orange_dim, parent=core_animation, bevel=0.004)

    # Head, visor, jaw.
    tapered_box("Faceted helmet", 0.64, 0.9, 0.66, 0.42, 0.52, graphite, (0, -0.05, 2.38), parent=body, bevel=0.04)
    crown_points = [(-0.3, -0.06), (0.3, -0.06), (0.4, 0.1), (0.16, 0.22), (-0.16, 0.22), (-0.4, 0.1)]
    extruded_panel("Crown armor crest", crown_points, 0.065, graphite_edge, (0, -0.45, 2.57), parent=body, bevel=0.014)
    cube("Heavy brow plate", (0, -0.54, 2.48), (0.76, 0.08, 0.1), graphite_2, parent=body, bevel=0.018)
    visor_points = [(-0.42, -0.09), (0.42, -0.09), (0.52, 0.02), (0.36, 0.14), (-0.36, 0.14), (-0.52, 0.02)]
    extruded_panel("Dark angular visor mask", visor_points, 0.06, graphite_2, (0, -0.61, 2.39), parent=face_animation, bevel=0.012)
    cube("Left optic slit", (-0.18, -0.65, 2.415), (0.24, 0.014, 0.026), visor_glow, parent=face_animation, bevel=0.004)
    cube("Right optic slit", (0.18, -0.65, 2.415), (0.24, 0.014, 0.026), visor_glow, parent=face_animation, bevel=0.004)
    cube("Left optic lower echo", (-0.18, -0.652, 2.372), (0.16, 0.01, 0.01), cyan_dim, parent=face_animation, bevel=0.003)
    cube("Right optic lower echo", (0.18, -0.652, 2.372), (0.16, 0.01, 0.01), cyan_dim, parent=face_animation, bevel=0.003)
    cube("Visor center bridge", (0, -0.655, 2.405), (0.035, 0.016, 0.1), graphite, parent=face_animation, bevel=0.004)
    cube("Left brow micro seam", (-0.28, -0.645, 2.485), (0.18, 0.01, 0.012), cyan_dim, rotation=(0, 0, -0.03), parent=face_animation, bevel=0.003)
    cube("Right brow micro seam", (0.28, -0.645, 2.485), (0.18, 0.01, 0.012), cyan_dim, rotation=(0, 0, 0.03), parent=face_animation, bevel=0.003)
    cube("Speaking mouth left segment", (-0.11, -0.61, 2.2), (0.08, 0.02, 0.026), orange, parent=face_animation, bevel=0.005)
    cube("Speaking mouth center segment", (0, -0.612, 2.2), (0.075, 0.018, 0.022), orange_dim, parent=face_animation, bevel=0.004)
    cube("Speaking mouth right segment", (0.11, -0.61, 2.2), (0.08, 0.02, 0.026), orange, parent=face_animation, bevel=0.005)
    tapered_box("Angular jaw guard", 0.38, 0.58, 0.22, 0.2, 0.26, graphite_2, (0, -0.43, 2.08), parent=body, bevel=0.024)
    cube("Left cheek armor", (-0.34, -0.49, 2.2), (0.08, 0.05, 0.28), graphite_2, rotation=(0, 0, 0.16), parent=body, bevel=0.012)
    cube("Right cheek armor", (0.34, -0.49, 2.2), (0.08, 0.05, 0.28), graphite_2, rotation=(0, 0, -0.16), parent=body, bevel=0.012)
    cube("Left temple fin", (-0.52, -0.08, 2.36), (0.045, 0.16, 0.42), cyan_dim, rotation=(0, 0, 0.22), parent=face_animation, bevel=0.008)
    cube("Right temple fin", (0.52, -0.08, 2.36), (0.045, 0.16, 0.42), cyan_dim, rotation=(0, 0, -0.22), parent=face_animation, bevel=0.008)

    # Shoulders and arms: wider, more commander-like, not toy-like.
    tapered_box("Left shoulder blade", 0.74, 1.22, 0.24, 0.25, 0.36, graphite, (-1.03, -0.04, 1.82), rotation=(0.0, 0.16, -0.34), parent=body, bevel=0.034)
    tapered_box("Right shoulder blade", 0.74, 1.22, 0.24, 0.25, 0.36, graphite, (1.03, -0.04, 1.82), rotation=(0.0, -0.16, 0.34), parent=body, bevel=0.034)
    left_shoulder_points = [(-0.36, -0.06), (0.08, -0.12), (0.44, -0.03), (0.34, 0.12), (-0.02, 0.2), (-0.44, 0.06)]
    right_shoulder_points = [(0.36, -0.06), (-0.08, -0.12), (-0.44, -0.03), (-0.34, 0.12), (0.02, 0.2), (0.44, 0.06)]
    extruded_panel("Left faceted shoulder cap", left_shoulder_points, 0.065, graphite_edge, (-1.03, -0.43, 1.9), rotation=(0.02, 0.1, -0.3), parent=body, bevel=0.014)
    extruded_panel("Right faceted shoulder cap", right_shoulder_points, 0.065, graphite_edge, (1.03, -0.43, 1.9), rotation=(0.02, -0.1, 0.3), parent=body, bevel=0.014)
    cube("Left shoulder underside", (-0.92, -0.38, 1.72), (0.72, 0.055, 0.08), graphite_2, rotation=(0, 0, -0.34), parent=body, bevel=0.012)
    cube("Right shoulder underside", (0.92, -0.38, 1.72), (0.72, 0.055, 0.08), graphite_2, rotation=(0, 0, 0.34), parent=body, bevel=0.012)
    cube("Left shoulder signal", (-1.05, -0.43, 1.86), (0.52, 0.028, 0.04), cyan_dim, rotation=(0, 0, -0.34), parent=body, bevel=0.006)
    cube("Right shoulder signal", (1.05, -0.43, 1.86), (0.52, 0.028, 0.04), cyan_dim, rotation=(0, 0, 0.34), parent=body, bevel=0.006)
    cube("Left shoulder graphite seam", (-1.0, -0.50, 1.74), (0.44, 0.012, 0.018), graphite_edge, rotation=(0, 0, -0.34), parent=body, bevel=0.004)
    cube("Right shoulder graphite seam", (1.0, -0.50, 1.74), (0.44, 0.012, 0.018), graphite_edge, rotation=(0, 0, 0.34), parent=body, bevel=0.004)
    cube("Left shoulder orange status pin", (-0.78, -0.52, 1.79), (0.055, 0.012, 0.035), orange_dim, rotation=(0, 0, -0.34), parent=body, bevel=0.004)
    cube("Right shoulder orange status pin", (0.78, -0.52, 1.79), (0.055, 0.012, 0.035), orange_dim, rotation=(0, 0, 0.34), parent=body, bevel=0.004)
    cube("Left upper arm", (-1.28, -0.04, 1.08), (0.14, 0.2, 0.64), graphite_2, rotation=(0, 0, -0.08), parent=body, bevel=0.022)
    cube("Right upper arm", (1.28, -0.04, 1.08), (0.14, 0.2, 0.64), graphite_2, rotation=(0, 0, 0.08), parent=body, bevel=0.022)
    cube("Left forearm light column", (-1.34, -0.44, 0.72), (0.08, 0.045, 0.52), orange, parent=body, bevel=0.012)
    cube("Right forearm light column", (1.34, -0.44, 0.72), (0.08, 0.045, 0.52), orange, parent=body, bevel=0.012)

    # Floating panels inspired by the selected direction-board right side, but kept as support shapes.
    left_points = [(-0.45, -0.42), (0.02, -0.28), (0.46, 0.18), (0.36, 0.54), (-0.34, 0.46), (-0.6, 0.02)]
    right_points = [(0.45, -0.42), (-0.02, -0.28), (-0.46, 0.18), (-0.36, 0.54), (0.34, 0.46), (0.6, 0.02)]
    hex_panel("Left floating shoulder panel", left_points, panel_mat, (-1.78, 0.34, 1.58), rotation=(0.02, 0.28, -0.08), parent=panels)
    hex_panel("Right floating shoulder panel", right_points, panel_mat, (1.78, 0.34, 1.58), rotation=(0.02, -0.28, 0.08), parent=panels)
    hex_panel("Left smoked panel depth", [(-0.36, -0.32), (0.04, -0.2), (0.34, 0.14), (0.28, 0.36), (-0.24, 0.32), (-0.43, 0.02)], smoked_glass, (-1.72, 0.28, 1.58), rotation=(0.02, 0.28, -0.08), parent=panels)
    hex_panel("Right smoked panel depth", [(0.36, -0.32), (-0.04, -0.2), (-0.34, 0.14), (-0.28, 0.36), (0.24, 0.32), (0.43, 0.02)], smoked_glass, (1.72, 0.28, 1.58), rotation=(0.02, -0.28, 0.08), parent=panels)
    cube("Left panel scan line", (-1.76, -0.46, 1.66), (0.34, 0.012, 0.014), cyan_dim, rotation=(0, 0, -0.14), parent=panels, bevel=0.003)
    cube("Right panel scan line", (1.76, -0.46, 1.66), (0.34, 0.012, 0.014), cyan_dim, rotation=(0, 0, 0.14), parent=panels, bevel=0.003)
    cube("Left small command tab", (-1.16, -0.56, 1.56), (0.25, 0.028, 0.09), orange, rotation=(0, 0, -0.28), parent=panels, bevel=0.008)
    cube("Right small command tab", (1.16, -0.56, 1.56), (0.25, 0.028, 0.09), orange, rotation=(0, 0, 0.28), parent=panels, bevel=0.008)

    torus("Main operator halo", (0, -0.08, 1.58), 1.48, 0.0065, cyan_line, rotation=(math.pi / 2, 0, 0), parent=rings)
    torus("Tilted orange data orbit", (0, -0.04, 1.26), 1.28, 0.005, orange_dim, rotation=(math.pi / 2.28, 0.0, 0.28), parent=rings)
    torus("Lower cyan scan orbit", (0, -0.02, 0.9), 1.04, 0.0045, cyan_glass, rotation=(math.pi / 2.78, 0.0, -0.2), parent=rings)
    cube("Halo top tick", (0, -0.64, 2.98), (0.16, 0.012, 0.026), cyan_dim, parent=rings, bevel=0.004)
    cube("Halo lower right tick", (1.08, -0.64, 0.88), (0.13, 0.012, 0.026), orange_dim, rotation=(0, 0, -0.25), parent=rings, bevel=0.004)
    cube("Halo lower left tick", (-1.08, -0.64, 0.88), (0.13, 0.012, 0.026), orange_dim, rotation=(0, 0, 0.25), parent=rings, bevel=0.004)

    # Ground/base glow gives scale without becoming the body.
    torus("Low base scan ring", (0, 0, 0.2), 1.32, 0.005, cyan_glass, rotation=(0, 0, 0), parent=rings)
    cube("Dark command pedestal shadow", (0, 0.24, 0.38), (1.0, 0.13, 0.06), graphite_2, parent=body, bevel=0.016)

    # Background reference board planes, deliberately behind the operator.
    cube("Rear dark panel", (0, 0.96, 1.35), (2.15, 0.03, 2.35), graphite_2, rotation=(0, 0, 0.04), parent=root, bevel=0)
    cube("Rear cyan edge light", (-1.12, 0.93, 1.45), (0.02, 0.04, 2.08), cyan_line, rotation=(0, 0, -0.04), parent=root, bevel=0)
    cube("Rear orange edge light", (1.12, 0.93, 1.45), (0.02, 0.04, 2.08), orange, rotation=(0, 0, -0.04), parent=root, bevel=0)

    # Lighting and camera.
    bpy.ops.object.light_add(type="AREA", location=(0, -4.2, 4.8), rotation=(math.radians(62), 0, 0))
    key = bpy.context.object
    key.name = "Large cool key light"
    key.data.energy = 620
    key.data.size = 5

    bpy.ops.object.light_add(type="POINT", location=(-2.4, -2.1, 2.4))
    cyan_light = bpy.context.object
    cyan_light.name = "Cyan rim light"
    cyan_light.data.color = (0.3, 0.9, 1.0)
    cyan_light.data.energy = 300

    bpy.ops.object.light_add(type="POINT", location=(2.3, -2.0, 1.8))
    orange_light = bpy.context.object
    orange_light.name = "Orange core bounce"
    orange_light.data.color = (1.0, 0.43, 0.08)
    orange_light.data.energy = 170

    bpy.ops.object.camera_add(location=(3.4, -6.3, 2.65))
    camera = bpy.context.object
    camera.name = "Silhouette approval camera"
    aim_at(camera, (0, -0.05, 1.42))
    bpy.context.scene.camera = camera
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 4.1

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    if hasattr(bpy.context.scene, "eevee"):
        bpy.context.scene.eevee.taa_render_samples = 64
    bpy.context.scene.world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world.color = (0.004, 0.008, 0.017)
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 1600
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    bpy.context.scene.view_settings.exposure = -0.1
    bpy.context.scene.view_settings.gamma = 1

    # Leave a simple internal note in the file so the checkpoint intent survives.
    text = bpy.data.curves.new("SilhouetteCheckpointNote", "FONT")
    text.body = f"Apex Operator silhouette {VERSION} - John private operator direction"
    text.align_x = "CENTER"
    text.size = 0.055
    text_obj = bpy.data.objects.new("Silhouette checkpoint note", text)
    text_obj.location = (0, -0.9, 0.05)
    text_obj.rotation_euler = (math.radians(80), 0, 0)
    text_obj.hide_render = True
    bpy.context.collection.objects.link(text_obj)
    assign_material(text_obj, cyan_line)


def save_and_render():
    build_operator()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.context.scene.render.filepath = RENDER_PATH
    bpy.ops.render.render(write_still=True)
    print(f"Saved {BLEND_PATH}")
    print(f"Rendered {RENDER_PATH}")


if __name__ == "__main__":
    save_and_render()
