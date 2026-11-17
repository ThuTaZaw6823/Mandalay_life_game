"""Build an editable .blend scene from the imported real OSM building footprints.

Run at the PROJECT ROOT (requires Blender installed):
    blender --background --python blender/build_osm_city.py -- --max-buildings 1500
    blender --background --python blender/build_osm_city.py -- --max-buildings 0

--max-buildings 0 means ALL 9,663 footprints (can be slow in Blender).

This is a modeling/editing scene, NOT needed for the Three.js runtime: the
browser already renders OSM roads/buildings directly. Levels/heights marked
'estimated' in the snapshot are not measured real-world elevations.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--max-buildings', type=int, default=1500)
parser.add_argument('--export-glb', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
data = json.loads((ROOT / 'public/data/mandalay.json').read_text(encoding='utf8'))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def mat(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    return m

building_mat = mat('OSM estimated building walls', (0.66, 0.60, 0.49))
road_mat = mat('OSM street asphalt', (0.22, 0.27, 0.30))
grass_mat = mat('Ground', (0.45, 0.57, 0.41))

# Blender Z-up -> glTF Y-up: use (x, -world_z, height).
width = data['sizeMeters']['width']
height = data['sizeMeters']['height']
verts = [(-width/2-150,-height/2-150,-.12), (width/2+150,-height/2-150,-.12),
         (width/2+150,height/2+150,-.12),(-width/2-150,height/2+150,-.12)]
mesh = bpy.data.meshes.new('Terrain surface')
mesh.from_pydata(verts, [], [(0,1,2,3)])
mesh.materials.append(grass_mat)
obj = bpy.data.objects.new('Ground (flat approximation)', mesh)
bpy.context.collection.objects.link(obj)

# One road mesh: faster to work with than thousands of separate road objects.
road_verts, road_faces = [], []
road_width = {'primary':12, 'secondary':10, 'tertiary':8, 'residential':6.4, 'unclassified':6.4,'service':4}
from math import hypot
for r in data['roads']:
    road_w = road_width.get(r['kind'], 2.5)
    for a,b in zip(r['path'], r['path'][1:]):
        dx, dz = b[0]-a[0],b[1]-a[1]
        d = hypot(dx,dz)
        if d < .1 or d > 750: continue
        ox, oz = -dz/d*road_w/2, dx/d*road_w/2
        start=len(road_verts)
        road_verts += [(a[0]+ox,-a[1]-oz,.01),(a[0]-ox,-a[1]+oz,.01),
                       (b[0]-ox,-b[1]+oz,.01),(b[0]+ox,-b[1]-oz,.01)]
        road_faces.append((start,start+1,start+2,start+3))
road_mesh = bpy.data.meshes.new('OSM road ribbons')
road_mesh.from_pydata(road_verts,[],road_faces)
road_mesh.materials.append(road_mat)
road_obj = bpy.data.objects.new('OSM roads',road_mesh)
bpy.context.collection.objects.link(road_obj)

# Build separate editable buildings with their real OSM footprint vertices.
# Multipolygon courtyards are left roofless in this Blender editing scene;
# the browser renderer preserves their holes.
for idx, item in enumerate(data['buildings']):
    if args.max_buildings > 0 and idx >= args.max_buildings:
        break
    ring = item['ring']
    if len(ring) < 3: continue
    h = float(item['height'])
    cx = sum(p[0] for p in ring)/len(ring)
    cz = sum(p[1] for p in ring)/len(ring)
    n=len(ring)
    v = [(x-cx,-(z-cz),0) for x,z in ring] + [(x-cx,-(z-cz),h) for x,z in ring]
    f = [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    if not item.get('holes'):
        f.append(tuple(range(n,2*n)))
    mesh=bpy.data.meshes.new('Building OSM ' + str(item['id']))
    mesh.from_pydata(v, [], f)
    mesh.materials.append(building_mat)
    obj=bpy.data.objects.new('OSM Building ' + str(item['id']), mesh)
    obj.location=(cx,-cz,0)
    obj['osm_id'] = str(item['id'])
    obj['height_source'] = item.get('heightSource', 'estimated')
    bpy.context.collection.objects.link(obj)

out = ROOT/'blender'/'out'/'Mandalay_OSM_City.blend'
out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out))
print('Saved editable Blender project to',out)
if args.export_glb:
    target=ROOT/'blender'/'out'/'Mandalay_OSM_City.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_apply=True)
    print('Saved optional full-scene GLB to',target)
