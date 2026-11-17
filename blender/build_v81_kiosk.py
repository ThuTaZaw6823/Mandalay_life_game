"""Create an editable v8.1 decorative street-kiosk GLB in Blender.

Run in project root:
    /Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_v81_kiosk.py

Only a GAME PROP. This is NOT the measured footprint or exact location of a
real kiosk. It replaces the bundled GLB demo with a genuine Blender export.
"""
from pathlib import Path
import bpy

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1.0)
    mat.use_nodes=True
    node=mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value=(*color,1.0)
    node.inputs['Roughness'].default_value=.66
    node.inputs['Metallic'].default_value=metallic
    return mat

walls=material('Cream plaster',(.75,.67,.48))
roof=material('Brick red roof',(.55,.20,.13))
wood=material('Teak wood',(.3,.18,.08))
trim=material('Gold trim',(.75,.51,.16),.15)
glass=material('Tinted glass',(.18,.39,.42))

def block(name, pos, dims, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj=bpy.context.object;obj.name=name
    obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    return obj

# Blender is Z-up. glTF exporter converts exported geometry for Three.js Y-up.
block('Foundation', (0,0,.1), (4.2,3.1,.2),trim)
block('Kiosk body', (0,0,1.5), (4,2.9,2.7),walls)
block('Serving opening', (0,-1.48,1.65), (2.65,.075,1.28),glass)
block('Serving counter', (0,-1.75,.99), (3.1,.57,.18),wood)
block('Upper awning red', (0,-.14,3.05), (5.3,4.0,.40),roof)
block('Gold sign fascia', (0,-1.95,2.8), (3.9,.20,.25),trim)
for x in (-1.72,1.72):
    block('Wooden trim', (x,-1.54,1.42), (.17,.13,2.5),wood)
block('Roof cap', (0,0,3.38), (3.9,2.7,.18),trim)

out=Path(__file__).resolve().parents[1] / 'public' / 'models' / 'mandalay-kiosk.glb'
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_apply=True)
print('Wrote Blender asset:',out)
