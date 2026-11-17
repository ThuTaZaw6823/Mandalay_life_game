import * as THREE from 'three'
import {noiseTexture} from './textures.js'
import {findMappedJunctions} from './road-junctions.js'

// Source geometry comes exclusively from public/data/mandalay.json,
// imported from the user's local map.osm. Decorative shading is procedural.

// Layer materials to reduce depth fighting where OSM road centerlines overlap.
const asphaltNoise = noiseTexture([235,235,235])
const baseRoadMaterial = kind => new THREE.MeshStandardMaterial({
  map: asphaltNoise,
  color: ['primary','trunk','motorway'].includes(kind) ? '#454e57'
    : ['secondary','tertiary','primary_link','secondary_link'].includes(kind) ? '#58636a'
      : ['footway','path','pedestrian','track'].includes(kind) ? '#baa889' : '#657279',
  roughness: .97, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
})
const edgeMaterial = new THREE.MeshStandardMaterial({color:'#b7b6a5',roughness:1,side:THREE.DoubleSide})
// v8.2 Step 3A: all extra geometry below is VISUAL ONLY. Roads remain OSM-sourced.
const sidewalkMaterial = new THREE.MeshStandardMaterial({
  map: noiseTexture([237, 235, 229]), color: '#dedbd0', roughness: 1,
  side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
})
const curbMaterial = new THREE.MeshStandardMaterial({color: '#e1dfd6', roughness: 1, side: THREE.DoubleSide})
const crossingMaterial = new THREE.MeshBasicMaterial({
  color: '#edece3', side: THREE.DoubleSide, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
})
const stripeMaterial = new THREE.MeshBasicMaterial({color:'#e5c787',side:THREE.DoubleSide,depthWrite:false})
const colorOf = new Map()
const buildingMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide })
const palette = {
  yes: ['#d8c2a0', '#ccb8a2', '#e5d3b8', '#bfaea0', '#d5cab4', '#c8baa8'],
  school: ['#c9b59e'], hospital: ['#bfcbd0'], temple: ['#dfb971'],
  hotel: ['#c9c7b8'], dormitory: ['#c6b79c'], retail: ['#c6b19b']
}
const waterMat = new THREE.MeshStandardMaterial({ color: '#397fa5', roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.97, side: THREE.DoubleSide, depthWrite: true })
const pitchMat = new THREE.MeshStandardMaterial({ color: '#779a71', roughness: 1, side: THREE.DoubleSide })

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])
const getColor = hex => {
  if (!colorOf.has(hex)) colorOf.set(hex, new THREE.Color(hex))
  return colorOf.get(hex)
}
const majorRoad = k => ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(k)
export function roadWidth(kind) {
  if (['motorway', 'trunk'].includes(kind)) return 16
  if (kind === 'primary') return 12
  if (kind === 'secondary') return 10
  if (kind === 'tertiary') return 8
  if (['residential', 'unclassified'].includes(kind)) return 6.4
  if (['service', 'living_street'].includes(kind)) return 4
  return 2.5
}

function pushStrip(bag, a, b, width, y) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const length = Math.hypot(dx, dz)
  if (length < 0.06 || length > 750) return
  const ox = -dz / length * width / 2
  const oz = dx / length * width / 2
  const x1 = a[0] + ox, z1 = a[1] + oz
  const x2 = a[0] - ox, z2 = a[1] - oz
  const x3 = b[0] + ox, z3 = b[1] + oz
  const x4 = b[0] - ox, z4 = b[1] - oz
  bag.push(x1, y, z1, x2, y, z2, x3, y, z3, x3, y, z3, x2, y, z2, x4, y, z4)
}

function meshFromVertices(positions, material, parent, name) {
  if (!positions.length) return
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  // World-space UVs stop noise visibly stretching along different street lengths.
  const uv=[]
  for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/10,positions[i+2]/10)
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.receiveShadow = true
  mesh.frustumCulled = false // road covers many independent map segments
  parent.add(mesh)
  return mesh
}

/** Shift a rectangle sideways from a mapped road segment, without changing its OSM geometry. */
function pushOffsetStrip(bag, a, b, offset, width, y) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const d = Math.hypot(dx, dz)
  if (d < .06 || d > 750) return
  const nx = -dz / d, nz = dx / d
  pushStrip(bag,
    [a[0] + nx * offset, a[1] + nz * offset],
    [b[0] + nx * offset, b[1] + nz * offset], width, y)
}

/** Sparse, illustrative zebra stripes: NOT verified OSM crosswalk features. */
function pushZebraCrossing(vertices, center, toward, width) {
  const length = distance(center,toward)
  if (length < 17) return
  const dx = (toward[0] - center[0]) / length
  const dz = (toward[1] - center[1]) / length
  const nx = -dz, nz = dx
  // Crosswalk on one approach, outside the actual central junction.
  const mx = center[0] + dx * 9, mz = center[1] + dz * 9
  const spacing = 1.35, stripeLength = .76
  for (let offset = -width * .5 + 1.0; offset < width * .5 - .5; offset += spacing) {
    const ax = mx + nx * (offset - stripeLength * .5)
    const az = mz + nz * (offset - stripeLength * .5)
    const bx = mx + nx * (offset + stripeLength * .5)
    const bz = mz + nz * (offset + stripeLength * .5)
    // pushStrip width runs along traffic, perpendicular to the stripe's length.
    pushStrip(vertices, [ax,az], [bx,bz], 1.75, .218)
  }
}

function drawRoads(group, data) {
  const buckets = new Map()
  const shoulders=[],stripes=[],sidewalks=[],curbs=[],crossings=[]
  const seen=new Set()
  const noSidewalk = new Set(['footway','path','pedestrian','track','steps'])
  const layer = kind => ['primary','trunk','motorway'].includes(kind) ? .027
    : ['secondary','tertiary'].includes(kind) ? .019
      : ['residential','unclassified'].includes(kind) ? .012 : .006
  const priority = kind => ['primary','trunk','motorway'].includes(kind) ? 4 : ['secondary','tertiary'].includes(kind) ? 3 : 1
  for(const road of [...data.roads].sort((a,b)=>priority(a.kind)-priority(b.kind))) {
    const kind=road.kind||'residential',width=roadWidth(kind)
    if(!buckets.has(kind))buckets.set(kind,[])
    const target=buckets.get(kind)
    let dashAt=0
    for(let i=1;i<road.path.length;i++){
      const a=road.path[i-1],b=road.path[i],d=distance(a,b)
      if(d<.06||d>750)continue
      const canonical=[a,b].map(p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`).sort().join('|')
      // Even if another OSM way repeats this segment, only render it once.
      if(seen.has(canonical)){dashAt+=d;continue}
      seen.add(canonical)
      pushStrip(shoulders,a,b,width+2.8,.082)
      pushStrip(target,a,b,width,.127+layer(kind))
      if(!noSidewalk.has(kind) && width>=4){
        // Walkways intentionally offset OUTSIDE the mapped carriageway.
        // Wider streets receive more pavement; tiny service lanes receive less.
        const pavingWidth=majorRoad(kind)?2.25:kind==='service'?1.1:1.7
        for(const side of [-1,1]){
          pushOffsetStrip(sidewalks,a,b,side*(width/2+pavingWidth/2+.21),pavingWidth,.195)
          pushOffsetStrip(curbs,a,b,side*(width/2+.17),.34,.208)
        }
      }
      if(majorRoad(kind)){
        const dx=(b[0]-a[0])/d,dz=(b[1]-a[1])/d
        // Keep dashed centerlines continuous across several OSM way-points.
        const phase=((dashAt%22)+22)%22
        for(let at=4-phase;at<d-1;at+=22){
          const begin=Math.max(.7,at),end=Math.min(d-.7,at+5)
          if(end-begin<1.3)continue
          pushStrip(stripes,[a[0]+dx*begin,a[1]+dz*begin],
            [a[0]+dx*end,a[1]+dz*end],.19,.194)
        }
      }
      dashAt+=d
    }
  }
  // Only a sparse subset of real OSM graph intersections receives art crosses.
  // These markings are decorative approximations, not claims of surveyed crossings.
  const occupied=new Set()
  let rendered=0
  for(const junction of findMappedJunctions(data.roads)) {
    if(rendered>=88)break
    const {point,approaches}=junction
    if(Math.abs(point[0])>data.sizeMeters.width/2-15 ||
       Math.abs(point[1])>data.sizeMeters.height/2-15)continue
    const candidate=approaches.find(a=>['primary','secondary','tertiary'].includes(a.kind) && distance(point,a.other)>18)
    if(!candidate)continue
    const key=`${Math.floor(point[0]/60)},${Math.floor(point[1]/60)}`
    if(occupied.has(key))continue
    occupied.add(key)
    pushZebraCrossing(crossings,point,candidate.other,roadWidth(candidate.kind))
    rendered++
  }
  meshFromVertices(shoulders,edgeMaterial,group,'OSM carriageway foundations')
  meshFromVertices(sidewalks,sidewalkMaterial,group,'v8.2 sidewalks (illustrative)')
  meshFromVertices(curbs,curbMaterial,group,'v8.2 raised concrete curbs')
  for(const [kind,verts] of buckets)meshFromVertices(verts,baseRoadMaterial(kind),group,`OSM road: ${kind}`)
  meshFromVertices(stripes,stripeMaterial,group,'v8.2 continuous mapped-road markings')
  meshFromVertices(crossings,crossingMaterial,group,'v8.2 illustrative zebra crossings')
}

function makeShape(ring, holes = []) {
  if (!ring || ring.length < 3) return null
  const shape = new THREE.Shape()
  shape.moveTo(ring[0][0], -ring[0][1])
  for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], -ring[i][1])
  shape.closePath()
  for (const hole of holes) {
    if (hole.length < 3) continue
    const path = new THREE.Path()
    path.moveTo(hole[0][0], -hole[0][1])
    for (let i = 1; i < hole.length; i++) path.lineTo(hole[i][0], -hole[i][1])
    path.closePath()
    shape.holes.push(path)
  }
  return shape
}

function drawAreas(group, data) {
  for (const area of data.areas) {
    const shape = makeShape(area.ring, area.holes)
    if (!shape) continue
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, area.kind === 'water' ? 0.035 : 0.018, 0)
    const mesh = new THREE.Mesh(geometry, area.kind === 'water' ? waterMat : pitchMat)
    mesh.name = `Mapped ${area.kind} ${area.id}`
    mesh.receiveShadow = true
    group.add(mesh)
  }
  const waterways = []
  for (const water of data.waterways) {
    const width = water.kind === 'canal' ? 5 : 1.3
    for (let i = 1; i < water.path.length; i++) pushStrip(waterways, water.path[i - 1], water.path[i], width, 0.055)
  }
  meshFromVertices(waterways, waterMat, group, 'Mapped waterways')
}

function drawCastleWalls(group, data) {
  const walls = []
  for (const feature of data.walls) {
    for (let i = 1; i < feature.path.length; i++) {
      const a = feature.path[i - 1], b = feature.path[i]
      const d = distance(a, b)
      if (d < 0.3 || d > 750) continue
      const dx = (b[0]-a[0]) / d, dz = (b[1]-a[1]) / d, h = 5.2
      const ox = -dz * 1.5, oz = dx * 1.5
      const v = [[a[0]+ox,0,a[1]+oz],[b[0]+ox,0,b[1]+oz],[b[0]+ox,h,b[1]+oz],
        [a[0]+ox,h,a[1]+oz],[a[0]-ox,0,a[1]-oz],[b[0]-ox,0,b[1]-oz],
        [b[0]-ox,h,b[1]-oz],[a[0]-ox,h,a[1]-oz]]
      // Box walls + top, each comprised of triangles
      for (const inds of [[0,2,1,0,3,2],[4,5,6,4,6,7],[3,7,6,3,6,2]])
        for (const index of inds) walls.push(...v[index])
    }
  }
  meshFromVertices(walls, new THREE.MeshStandardMaterial({ color: '#ad7154', roughness: 0.94, side: THREE.DoubleSide }), group, 'Mapped Palace wall (OSM)')
}

function area2D(ring) {
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length]
    area += a[0] * b[1] - b[0] * a[1]
  }
  return area * 0.5
}

function newBucket() { return { positions: [], colors: [], count: 0 } }
function addTriangle(bucket, a, b, c, color) {
  bucket.positions.push(...a, ...b, ...c)
  for (let i = 0; i < 3; i++) bucket.colors.push(color.r, color.g, color.b)
}

function buildBuildingMesh(bag, item) {
  const ring = item.ring
  if (!Array.isArray(ring) || ring.length < 3 || ring.length > 300) return
  const height = Math.max(2, Math.min(100, Number(item.height) || 6))
  const row = palette[item.type] || palette.yes
  const baseHex = row[Number.parseInt(item.id.replace(/\D/g, ''), 10) % row.length]
  const wallColor = getColor(baseHex)
  const roofColor = getColor(item.type === 'temple' ? '#a85b42' : Number.parseInt(item.id.replace(/\D/g, ''),10) % 3 === 0 ? '#9c8570' : '#b3a48c')
  const holes = item.holes || []
  // Handle roof concavity and the occasional OSM multipolygon courtyard using earcut.
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, -z))
  const holeContours = holes.map(h => h.map(([x,z]) => new THREE.Vector2(x,-z)))
  const flattened = [...contour, ...holeContours.flat()]
  const polygonTriangles = THREE.ShapeUtils.triangulateShape(contour, holeContours)
  for (const tri of polygonTriangles) {
    const a = flattened[tri[0]], b = flattened[tri[1]], c = flattened[tri[2]]
    if (!a || !b || !c) continue
    const aa = [a.x, height, -a.y], bb = [b.x, height, -b.y], cc = [c.x, height, -c.y]
    const orientation = (bb[0]-aa[0])*(cc[2]-aa[2]) - (bb[2]-aa[2])*(cc[0]-aa[0])
    if (Math.abs(orientation) < 0.001) continue
    // Up-facing Y normal is the reverse of XZ signed area.
    if (orientation < 0) addTriangle(bag, aa, bb, cc, roofColor)
    else addTriangle(bag, aa, cc, bb, roofColor)
  }
  for (const [loop, isHole] of [[ring, false], ...holes.map(h=>[h,true])]) {
    const positive = area2D(loop) > 0
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i+1) % loop.length]
      if (distance(a, b) < 0.05) continue
      const p0 = [a[0], 0.09, a[1]], p1 = [b[0],0.09,b[1]]
      const p2 = [b[0],height,b[1]], p3 = [a[0],height,a[1]]
      if (positive !== isHole) {
        addTriangle(bag, p0, p2, p1, wallColor)
        addTriangle(bag, p0, p3, p2, wallColor)
      } else {
        addTriangle(bag, p0, p1, p2, wallColor)
        addTriangle(bag, p0, p2, p3, wallColor)
      }
    }
  }
  bag.count++
}

export function pointInPolygon(x, z, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1]
    if (((zi > z) !== (zj > z)) && (x < (xj-xi)*(z-zi)/(zj-zi) + xi)) inside = !inside
  }
  return inside
}

export class OSMCity {
  constructor(scene, data, mobile = false) {
    this.data = data
    this.mobile = mobile
    this.root = new THREE.Group()
    this.root.name = 'Real Mandalay map from local map.osm'
    scene.add(this.root)
    this.chunks = []
    this.bldIndex = new Map()
    this.cell = 45
    this.stats = data.counts
    drawAreas(this.root, data)
    drawRoads(this.root, data)
    drawCastleWalls(this.root, data)
    this.makeBuildings()
  }

  makeBuildings() {
    const buckets = new Map()
    for (const b of this.data.buildings) {
      const ring = b.ring
      if (!ring || ring.length < 3) continue
      const cx = ring.reduce((a, p) => a+p[0], 0) / ring.length
      const cz = ring.reduce((a, p) => a+p[1], 0) / ring.length
      const gx = Math.floor(cx / 240), gz = Math.floor(cz / 240)
      const key = `${gx},${gz}`
      if (!buckets.has(key)) buckets.set(key, { x: gx * 240 + 120, z: gz * 240 + 120, bag: newBucket() })
      buildBuildingMesh(buckets.get(key).bag, b)
      const minX = Math.min(...ring.map(p=>p[0])), maxX = Math.max(...ring.map(p=>p[0]))
      const minZ = Math.min(...ring.map(p=>p[1])), maxZ = Math.max(...ring.map(p=>p[1]))
      // 45m collision grid; avoid checking all ~9.6k buildings on each movement.
      for (let ix = Math.floor(minX/this.cell); ix <= Math.floor(maxX/this.cell); ix++) {
        for (let iz = Math.floor(minZ/this.cell); iz <= Math.floor(maxZ/this.cell); iz++) {
          const cellKey = `${ix},${iz}`
          if (!this.bldIndex.has(cellKey)) this.bldIndex.set(cellKey, [])
          this.bldIndex.get(cellKey).push(b)
        }
      }
    }
    for (const chunk of buckets.values()) {
      const {positions, colors} = chunk.bag
      if (!positions.length) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
      const mesh = new THREE.Mesh(geometry, buildingMaterial)
      mesh.receiveShadow = true
      mesh.castShadow = false // mobile-friendly; sun shading handled by normals
      mesh.name = `${chunk.bag.count} real building footprints`
      this.root.add(mesh)
      this.chunks.push({ mesh, x: chunk.x, z: chunk.z })
    }
  }

  isBlocked(x, z, radius = 0.6) {
    for (const [px, pz] of [[x,z],[x+radius,z],[x-radius,z],[x,z+radius],[x,z-radius]]) {
      const nearby = this.bldIndex.get(`${Math.floor(px/this.cell)},${Math.floor(pz/this.cell)}`) || []
      for (const b of nearby) {
        if (pointInPolygon(px, pz, b.ring) && !(b.holes||[]).some(h => pointInPolygon(px,pz,h))) return true
      }
    }
    return false
  }

  update(x, z, aerial = false) {
    const maxDist = aerial ? Infinity : this.mobile ? 525 : 930
    const maxSq = maxDist * maxDist
    for (const chunk of this.chunks) {
      const dx = chunk.x - x, dz = chunk.z - z
      chunk.mesh.visible = dx*dx + dz*dz < maxSq
    }
  }
}
