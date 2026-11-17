"""Blender background export of a stylized Mandalay-inspired palace gate.

Run from this project's root:
    blender --background --python blender/create_palace_gate.py

This creates public/models/palace-gate.glb. It is a CONCEPT model, not an
accurate heritage reconstruction. Replace it with researched custom Blender
artwork when available.
"""
from pathlib import Path
from math import radians
import bpy

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, rgb, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1.0)
    m.use_nodes = True
    principled = m.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*rgb, 1.0)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = 0.78
    return m


brick = material("Lacquered terracotta", (0.46, 0.085, 0.065))
gold = material("Warm gold trim", (0.85, 0.51, 0.13), 0.22)
cream = material("Plaster", (0.79, 0.65, 0.43))
wood = material("Teak", (0.23, 0.11, 0.05))


def cube(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def roof(name, location, width, depth, height, mat):
    # Four-sided pyramid roof. Blender Z-up is converted to glTF Y-up.
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1, radius2=0, depth=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler.z = radians(45)
    obj.scale = (width / 2, depth / 2, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


# Walk-through opening between two square towers; ground plane is at Z=0.
for side in (-1, 1):
    cx = side * 8.0
    cube("Tower stonework", (cx, 0, 4.0), (5.4, 5.8, 8), brick)
    cube("Tower cream cornice", (cx, 0, 8.2), (6.2, 6.5, 0.55), cream)
    cube("Tower gold band", (cx, 0, 9.1), (6.8, 7.2, 0.55), gold)
    roof("Tower red tier roof", (cx, 0, 11.8), 7.7, 7.7, 5, brick)
    roof("Tower golden finial", (cx, 0, 14.7), 1.6, 1.6, 2.2, gold)
    for y in (-2.8, 2.8):
        cube("Teak vertical accent", (cx, y, 4.8), (0.48, 0.2, 5.3), wood)

cube("Upper beam across gate", (0, 0, 8.2), (18, 5.8, 1.9), brick)
cube("Long gold eave", (0, 0, 9.5), (20.8, 7.0, 0.5), gold)
roof("Central roof", (0, 0, 12.1), 20.0, 7.9, 4.9, brick)
roof("Golden peak", (0, 0, 15.3), 2.2, 2.2, 2.5, gold)

out = Path(__file__).resolve().parents[1] / "public" / "models" / "palace-gate.glb"
out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", export_apply=True)
print(f"Wrote Blender glTF asset: {out}")
