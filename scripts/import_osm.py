#!/usr/bin/env python3
"""Offline OSM XML -> optimized, georeferenced Mandalay Life v8 JSON.

Requires Python 3 standard library only. No Overpass server or API keys.
Usage: python3 scripts/import_osm.py source/map.osm public/data/mandalay.json
"""
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'source' / 'map.osm'
TARGET = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'public' / 'data' / 'mandalay.json'
BORDER_METERS = 40  # keep only building footprints in/near the exported bounding box


def tags_of(element):
    return {tag.attrib['k']: tag.attrib['v'] for tag in element.findall('tag')}


def parse_number(value):
    match = re.search(r'\d+(?:\.\d+)?', value or '')
    return float(match.group(0)) if match else None


def main():
    print(f'Loading local OpenStreetMap XML: {SOURCE}')
    root = ET.parse(SOURCE).getroot()
    if root.tag != 'osm':
        raise ValueError('Expected an OpenStreetMap .osm XML document')
    bounds_el = root.find('bounds')
    if bounds_el is None:
        raise ValueError('Missing <bounds>. Export a bounded area from OpenStreetMap.')
    b = {k: float(bounds_el.attrib[k]) for k in ('minlat', 'minlon', 'maxlat', 'maxlon')}
    center = {'lat': (b['minlat'] + b['maxlat']) / 2, 'lon': (b['minlon'] + b['maxlon']) / 2}
    latitude_scale = 111320.0
    longitude_scale = latitude_scale * math.cos(math.radians(center['lat']))
    half_w = (b['maxlon'] - b['minlon']) * longitude_scale / 2
    half_h = (b['maxlat'] - b['minlat']) * latitude_scale / 2

    def project(lon, lat):
        return [round((lon - center['lon']) * longitude_scale, 2),
                round((center['lat'] - lat) * latitude_scale, 2)]

    def inside(pt, margin=0):
        return -half_w - margin <= pt[0] <= half_w + margin and -half_h - margin <= pt[1] <= half_h + margin

    nodes = {}
    point_pois = []
    for n in root.findall('node'):
        lat, lon = float(n.attrib['lat']), float(n.attrib['lon'])
        pt = project(lon, lat)
        nodes[n.attrib['id']] = pt
        tags = tags_of(n)
        if inside(pt) and (tags.get('name:en') or tags.get('name')) and any(k in tags for k in ('amenity', 'tourism', 'historic', 'shop', 'leisure')):
            typ = next((tags[k] for k in ('amenity', 'tourism', 'historic', 'shop', 'leisure') if k in tags), 'place')
            point_pois.append({'id': 'n' + n.attrib['id'], 'name': tags.get('name:en', tags.get('name')),
                               'type': typ, 'at': pt})

    ways = {}
    for w in root.findall('way'):
        ids = [nd.attrib['ref'] for nd in w.findall('nd')]
        geometry = [nodes[i] for i in ids if i in nodes]
        ways[w.attrib['id']] = {'points': geometry, 'tags': tags_of(w)}

    def closed_ring(points):
        if len(points) < 4:
            return None
        ring = [p for p in points if len(p) == 2]
        if not ring or ring[0] != ring[-1]:
            return None
        ring = ring[:-1]
        if len(ring) < 3:
            return None
        cleaned = []
        for p in ring:
            if not cleaned or p != cleaned[-1]:
                cleaned.append(p)
        return cleaned if len(cleaned) >= 3 else None

    def centroid(points):
        return [round(sum(p[0] for p in points) / len(points), 2),
                round(sum(p[1] for p in points) / len(points), 2)]

    def building_height(tags, id_value):
        h = parse_number(tags.get('height'))
        if h and h > 1: return round(max(2, min(100, h)), 1), 'mapped'
        levels = parse_number(tags.get('building:levels'))
        if levels and levels > 0: return round(max(3, min(100, levels * 3.2)), 1), 'levels'
        return 4.6 + (int(id_value) % 9) * 0.95, 'estimated'

    roads, buildings, areas, waterways, walls, named_pois = [], [], [], [], [], []
    seen_pois = set()
    def add_way_poi(prefix, wid, tags, pts):
        name = tags.get('name:en', tags.get('name'))
        if not name or not pts or not any(k in tags for k in ('amenity', 'tourism', 'historic', 'leisure', 'shop')):
            return
        at = centroid(pts)
        if not inside(at):
            return
        typ = next((tags[k] for k in ('amenity', 'tourism', 'historic', 'leisure', 'shop') if k in tags), 'place')
        key = (name, round(at[0]/25), round(at[1]/25))
        if key not in seen_pois:
            named_pois.append({'id': prefix + wid, 'name': name, 'type': typ, 'at': at})
            seen_pois.add(key)

    for wid, obj in ways.items():
        tags, pts = obj['tags'], obj['points']
        if len(pts) < 2:
            continue
        overlap = any(inside(p, BORDER_METERS) for p in pts)
        if not overlap:
            continue
        if tags.get('highway'):
            roads.append({'id': wid, 'kind': tags['highway'], 'name': tags.get('name:en', tags.get('name', '')),
                          'bridge': tags.get('bridge') == 'yes', 'path': pts})
        ring = closed_ring(pts)
        if tags.get('building') and ring and inside(centroid(ring), BORDER_METERS):
            height, height_source = building_height(tags, wid)
            buildings.append({'id': wid, 'type': tags['building'], 'name': tags.get('name:en', tags.get('name', '')),
                              'height': height, 'heightSource': height_source, 'ring': ring})
        if ring and (tags.get('landuse') in ('grass', 'forest', 'meadow', 'cemetery', 'recreation_ground')
                     or tags.get('leisure') in ('park', 'garden', 'pitch', 'playground', 'stadium')
                     or tags.get('natural') in ('water', 'wood', 'grassland')):
            kind = tags.get('natural') or tags.get('leisure') or tags.get('landuse')
            areas.append({'id': wid, 'kind': kind, 'ring': ring, 'holes': []})
        if tags.get('waterway'):
            waterways.append({'id': wid, 'kind': tags['waterway'], 'path': pts})
        if tags.get('barrier') == 'wall' and (tags.get('historic') or tags.get('name')):
            walls.append({'id': wid, 'kind': tags.get('historic', 'wall'), 'name': tags.get('name:en', tags.get('name', '')),
                          'path': pts})
        add_way_poi('w', wid, tags, ring or pts)

    # OSM relations can describe polygonal water and complex buildings with holes.
    relation_buildings = 0
    relation_water = 0
    for rel in root.findall('relation'):
        rtags = tags_of(rel)
        if rtags.get('type') != 'multipolygon':
            continue
        outer, inner = [], []
        for member in rel.findall('member'):
            if member.get('type') != 'way':
                continue
            way = ways.get(member.get('ref'))
            if not way:
                continue
            ring = closed_ring(way['points'])
            if ring:
                (inner if member.get('role') == 'inner' else outer).append(ring)
        for ring in outer:
            if not any(inside(p, BORDER_METERS) for p in ring):
                continue
            # This file's relevant multipolygons are closed outer+inner ways.
            holes = [h for h in inner if inside(centroid(h), max(half_w, half_h) * 2)]
            if rtags.get('natural') == 'water':
                areas.append({'id': 'r' + rel.attrib['id'], 'kind': 'water', 'ring': ring, 'holes': holes})
                relation_water += 1
            elif rtags.get('building'):
                height, height_source = building_height(rtags, rel.attrib['id'])
                if inside(centroid(ring), BORDER_METERS):
                    buildings.append({'id': 'r' + rel.attrib['id'], 'type': rtags['building'],
                                      'name': rtags.get('name:en', rtags.get('name', '')),
                                      'height': height, 'heightSource': height_source, 'ring': ring,
                                      'holes': holes})
                    relation_buildings += 1

    poi = named_pois + point_pois
    # Do not export personal OSM editor identifiers, timestamps or users.
    counts = {'sourceNodes': len(nodes), 'sourceWays': len(ways), 'roads': len(roads),
              'buildings': len(buildings), 'areas': len(areas), 'waterways': len(waterways),
              'walls': len(walls), 'pois': len(poi), 'relationBuildings': relation_buildings,
              'relationWater': relation_water,
              'estimatedBuildingHeights': sum(b['heightSource'] == 'estimated' for b in buildings)}
    snapshot = {
        'format': 'mandalay-life-offline-osm-v1',
        'source': 'OpenStreetMap contributors',
        'license': 'ODbL 1.0',
        'attribution': 'https://www.openstreetmap.org/copyright',
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'center': center,
        'bbox': b,
        'sizeMeters': {'width': round(2*half_w, 1), 'height': round(2*half_h, 1)},
        'counts': counts,
        'roads': roads, 'buildings': buildings, 'areas': areas, 'waterways': waterways, 'walls': walls,
        'pois': poi
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f"Imported {counts['roads']} roads, {counts['buildings']} buildings, {counts['areas']} areas, "
          f"{counts['waterways']} waterways, {counts['pois']} named POIs")
    print(f'Map spans {snapshot["sizeMeters"]["width"]}m × {snapshot["sizeMeters"]["height"]}m')
    print(f'Wrote {TARGET} ({TARGET.stat().st_size / 1024 / 1024:.2f} MiB)')

if __name__ == '__main__':
    main()
