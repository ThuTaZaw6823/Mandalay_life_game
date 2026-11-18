/**
 * Mandalay Life V8.1 - DENSE PASTEL CITY ART REMASTER (Three.js)
 * Works with the existing World class, without replacing game logic.
 * Installed BEFORE new World(scene), so original city builders still create
 * their doors, collision boxes, traffic sites, palace, airport, missions, etc.
 *
 * Draw calls are limited using globally batched InstancedMesh geometries.
 */
import * as THREE from 'three'
import { ROADS_X, ROADS_Z, RIVER, MAP_HALF } from './world.js'
import { PALACE, ROOFTOPS, inPalaceSquare } from './v5layout.js'
import { sign } from './visual.js'

const BUILDING_PALETTE = [
  0x94bfce, 0xf1b39a, 0xe5c58a, 0xc6b6dc, 0xa5cbb5,
  0xe3abac, 0xc5c7b8, 0xa9b9d5, 0xd5b8a1, 0xf3d4a4
]
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CROWN = new THREE.IcosahedronGeometry(1, 1)
const TRUNK = new THREE.CylinderGeometry(0.5, 0.62, 1, 7)
const Q = new THREE.Quaternion()
const MATRIX = new THREE.Matrix4()
const VECTOR = new THREE.Vector3()
const SIZE = new THREE.Vector3()
const asphalt = new THREE.MeshStandardMaterial({ color: 0x414a50, roughness: 0.95 })
const pavement = new THREE.MeshStandardMaterial({ color: 0xd8d7ce, roughness: 0.94 })
const paint = new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.9 })
const darkWindow = new THREE.MeshStandardMaterial({ color: 0x5a9fb0, roughness: 0.22, metalness: 0.08 })

function rng (seed) {
  let x = seed >>> 0
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296)
}
function airport (x, z, margin = 0) {
  return x > 255 - margin && x < 632 + margin && z > -655 - margin && z < 255 + margin
}
function noBuild (world, x, z, pad = 0) {
  if (airport(x, z, pad) || inPalaceSquare(x, z, pad + 15)) return true
  if (Math.hypot(x - world.plot.x, z - world.plot.z) < 31 + pad) return true
  if (Math.hypot(x - world.depot.x, z - world.depot.z) < 23 + pad) return true
  if (Math.hypot(x - world.plaza.x, z - world.plaza.z) < 25 + pad) return true
  if (ROOFTOPS.some(p => Math.hypot(x - p.x, z - p.z) < 36 + pad)) return true
  if (world.destinations.some(p => Math.hypot(x - p.x, z - p.z) < 14 + pad)) return true
  return false
}
function boxesClear (world, x, z, w, d, margin = 3) {
  return !world.obstacles.some(o =>
    x + w / 2 + margin > o.minX && x - w / 2 - margin < o.maxX &&
    z + d / 2 + margin > o.minZ && z - d / 2 - margin < o.maxZ)
}

class CityBatch {
  constructor (sceneRoot) {
    this.root = new THREE.Group()
    this.root.name = 'V8 STYLIZED CITY - INSTANCED DETAIL'
    sceneRoot.add(this.root)
    this.entries = new Map()
    this.glassMaterials = []
    this.roadMaterials = []
    this.finished = false
  }
  shape (kind, hex, x, y, z, w, h, d) {
    if (this.finished || w <= 0 || h <= 0 || d <= 0) return
    const key = `${kind}:${hex}`
    if (!this.entries.has(key)) this.entries.set(key, { kind, hex, values: [] })
    this.entries.get(key).values.push([x, y, z, w, h, d])
  }
  box (hex, x, y, z, w, h, d) { this.shape('box', hex, x, y, z, w, h, d) }
  shrub (x, y, z, s, col = 0x78ad75) { this.shape('crown', col, x, y, z, s, s, s) }
  tree (x, z, s = 1, shade = 0) {
    // Leaf shape is an actual faceted polyhedron rather than a flat 2D sprite.
    this.shape('trunk', 0x8a6248, x, 1.45 * s, z, .6*s, 2.9*s, .6*s)
    const colors = [0x75b77b, 0x91c88a, 0x64a976, 0xa1ca91]
    this.shrub(x, 4.15*s, z, 4.55*s, colors[shade % colors.length])
    this.shrub(x - 1.15*s, 3.75*s, z + .6*s, 3.2*s, colors[(shade + 1) % colors.length])
    this.shrub(x + 1.15*s, 3.8*s, z - .5*s, 3.15*s, colors[(shade + 2) % colors.length])
  }
  flush () {
    if (this.finished) return
    this.finished = true
    for (const [key, item] of this.entries) {
      if (!item.values.length) continue
      const geometry = item.kind === 'box' ? BOX : item.kind === 'crown' ? CROWN : TRUNK
      const isGlass = item.kind === 'box' &&
        (item.hex === 0x83bccc || item.hex === 0x79afbf || item.hex === 0x94c5c6)
      const isRoad = item.kind === 'box' && item.hex === 0x414a50
      const material = isGlass
        ? new THREE.MeshStandardMaterial({
            color: item.hex,
            roughness: 0.18,
            metalness: 0.52,
            emissive: new THREE.Color(item.hex === 0x83bccc ? 0xffe2a8 : 0x9ee8ff),
            emissiveIntensity: 0
          })
        : new THREE.MeshStandardMaterial({
            color: item.hex,
            roughness: isRoad ? 0.92 : 0.86,
            metalness: isRoad ? 0.04 : 0.01
          })
      if (isGlass) this.glassMaterials.push(material)
      if (isRoad) this.roadMaterials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, item.values.length)
      mesh.name = `V8 ${key}`
      mesh.castShadow = false
      mesh.receiveShadow = true
      mesh.frustumCulled = false // large instance batches can cover many city blocks
      item.values.forEach(([x,y,z,w,h,d], index) => {
        MATRIX.compose(VECTOR.set(x,y,z), Q, SIZE.set(w,h,d))
        mesh.setMatrixAt(index, MATRIX)
      })
      mesh.instanceMatrix.needsUpdate = true
      this.root.add(mesh)
    }
    this.entries.clear()
  }
}

function subtract (segments, start, end) {
  const out = []
  for (const [a,b] of segments) {
    if (start >= b || end <= a) out.push([a,b])
    else {
      if (start - a > .4) out.push([a,start])
      if (b - end > .4) out.push([end,b])
    }
  }
  return out
}
function inSections (sections, point, gap = 0) {
  return sections.some(([a,b]) => point >= a + gap && point <= b - gap)
}

function makeRoadGrid (world, b) {
  // Replaces the actual road geometry created by V7 / V7.1. Curbs are cut
  // around every real junction, including the side streets, so vehicles
  // do not see a sidewalk blocking the middle of the intersection.
  const ns = new Map()
  const ew = new Map()
  const north = -Math.min(1260, MAP_HALF - 26)
  const south = Math.min(969, MAP_HALF - 28)
  const west = -830
  const east = Math.min(935, MAP_HALF - 28)
  const palaceN = PALACE.z - PALACE.outerHalf - 4
  const palaceS = PALACE.z + PALACE.outerHalf + 4
  const palaceW = PALACE.x - PALACE.outerHalf - 4
  const palaceE = PALACE.x + PALACE.outerHalf + 4
  for (const x of ROADS_X) {
    let segs = [[north,south]]
    if (Math.abs(x - PALACE.x) < PALACE.outerHalf + 7)
      segs = subtract(segs, palaceN, palaceS)
    if (x > 255 && x < 632) segs = subtract(segs,-655,255)
    ns.set(x,segs)
  }
  for (const z of ROADS_Z) {
    let segs = [[west,east]]
    if (Math.abs(z - PALACE.z) < PALACE.outerHalf + 7)
      segs = subtract(segs,palaceW,palaceE)
    if (z > -655 && z < 255) segs = subtract(segs,255,632)
    ew.set(z,segs)
  }
  const crossings = []
  for (const x of ROADS_X) for (const z of ROADS_Z) {
    if (inSections(ns.get(x), z, 10) && inSections(ew.get(z), x, 10) &&
        !airport(x,z,12) && !inPalaceSquare(x,z,8)) crossings.push({x,z})
  }

  for (const [x,segs] of ns) for (const [a,z] of segs) {
    b.box(0x414a50,x,.042,(a+z)/2,13,.084,z-a)
    for (const dx of [-7.7,7.7]) {
      let curbs = [[a,z]]
      for (const crossing of crossings) if (crossing.x === x)
        curbs = subtract(curbs,crossing.z - 10.6,crossing.z + 10.6)
      for (const [c,d] of curbs) {
        b.box(0xd8d7ce,x+dx,.125,(c+d)/2,2.7,.19,d-c)
        b.box(0xf0ebe0,x+dx*.82,.231,(c+d)/2,.3,.045,d-c)
      }
    }
    for(let zz=a+12;zz<z-12;zz+=21) {
      if(!crossings.some(c=>c.x===x&&Math.abs(c.z-zz)<13))
        b.box(0xf5f2e8,x,.094,zz,.22,.014,7)
    }
  }
  for (const [z,segs] of ew) for (const [a,x] of segs) {
    b.box(0x414a50,(a+x)/2,.016,z,x-a,.084,13)
    for (const dz of [-7.7,7.7]) {
      let curbs = [[a,x]]
      for (const crossing of crossings) if (crossing.z === z)
        curbs = subtract(curbs,crossing.x - 10.6,crossing.x + 10.6)
      for (const [c,d] of curbs) {
        b.box(0xd8d7ce,(c+d)/2,.125,z+dz,d-c,.19,2.7)
        b.box(0xf0ebe0,(c+d)/2,.231,z+dz*.82,d-c,.045,.3)
      }
    }
    for(let xx=a+12;xx<x-12;xx+=21) {
      if(!crossings.some(c=>c.z===z&&Math.abs(c.x-xx)<13))
        b.box(0xf5f2e8,xx,.095,z,7,.014,.22)
    }
  }
  // Continuous dark square covers road overlaps without z fighting.
  // Zebra strips remain below the pavement and clear of vehicle center lanes.
  for (const {x,z} of crossings) {
    b.box(0x414a50,x,.086,z,20.8,.04,20.8)
    const downtown = Math.abs(x)<355 && Math.abs(z)<390
    const busy = downtown || ((Math.abs(x)+Math.abs(z))/66|0)%3===0
    if (!busy) continue
    for (let k=-3;k<=3;k++) {
      for (const dir of [-1,1]) {
        b.box(0xf5f2e8,x+k*1.45,.117,z+dir*9.0,.82,.017,3.2)
        b.box(0xf5f2e8,x+dir*9.0,.117,z+k*1.45,3.2,.017,.82)
      }
    }
    // Stop lines just outside the pedestrian crossing.
    for (const dir of [-1,1]) {
      b.box(0xf5f2e8,x,.115,z+dir*12.6,10,.012,.22)
      b.box(0xf5f2e8,x+dir*12.6,.115,z,.22,.012,10)
    }
  }
  world.__v80.intersectionPoints=crossings
  return crossings.length
}

// V8.1: detailed street-facing architecture, generated from batched 3D geometry.
function decorateBuilding (world, args, root, batch, noFence) {
  const [x, z, w, d, h, style = 0, enterable = false, name = 'Home'] = args
  if (!root || !Number.isFinite(h) || airport(x, z, 6) || inPalaceSquare(x, z, 6)) return
  const id = Math.abs(Math.floor(x * 13 + z * 17 + style * 23)) % BUILDING_PALETTE.length
  const wall = BUILDING_PALETTE[id]
  const edge = [0xf8ecd9,0xf2e0c7,0xdbe4df,0xf2d5cb][id % 4]
  const glass = [0x83bccc,0x79afbf,0x94c5c6][id % 3]
  const rail = [0x466b62,0x557e7a,0x6f8d86][id % 3]
  const flat = h > 8.5
  // Keep all original collision boxes, interior doors and gameplay data.
  // Only change the existing wall/roof appearance and add architectural geometry.
  if (flat) {
    const originalWall = root.children.find(c => c.isMesh && c.material?.isMeshStandardMaterial)
    if (originalWall) {
      originalWall.material = originalWall.material.clone()
      originalWall.material.color.setHex(wall)
      originalWall.material.roughness = 0.88
    }
    const roof = root.children.find(c => c.isMesh && c !== originalWall && c.position.y > h - .5)
    if (roof?.material?.isMeshStandardMaterial) {
      roof.material = roof.material.clone()
      roof.material.color.setHex([0xc39876,0x7b9a99,0xd7a183,0xb4b5a4][id%4])
    }
  }
  const front = z + d / 2, back = z - d / 2
  if (!flat) {
    // Preserve the original modeled villas, but give each its own clean garden,
    // paved entrance and low wall with a real gap for the front door.
    batch.box(0xe4d6c2, x, .11, front + 1.6, 2.5, .12, 3.2)
    const halfW = w/2+2.2
    if (!noFence) {
      for (const sx of [-1,1]) {
        batch.box(0xd8bca4,x + sx*halfW,.58,z,.24,1.15,d + 4.4)
        batch.box(0xf0d3bd,x + sx*halfW,1.19,z,.33,.12,d + 4.4)
      }
      batch.box(0xd8bca4,x,.58,back - 2.2,w + 4.4,1.15,.24)
      for (const sx of [-1,1]) {
        const pieceW=(halfW-2.1)
        batch.box(0xd8bca4,x+sx*(2.1 + pieceW/2),.58,front+2.2,pieceW,1.15,.24)
      }
    }
    batch.box(0xf0d3bd,x,.12,front + 2.2,4.0,.14,2.4)
    batch.shrub(x-halfW+.55,.82,z-d*.24,1.45,0x79af70)
    batch.shrub(x+halfW-.55,.82,z-d*.22,1.35,0x93c58b)
    return
  }
  // Flat-roof midrise, three-dimensional window frames on the two street facades.
  // Replaces the old tiny repetitive window pattern rather than overlaying it.
  batch.box(edge,x,h-.28,front+.13,w+.46,.34,.33)
  batch.box(edge,x,h-.28,back-.13,w+.46,.34,.33)
  batch.box(edge,x-w/2+.1,h*.50,front+.09,.22,h-.6,.28)
  batch.box(edge,x+w/2-.1,h*.50,front+.09,.22,h-.6,.28)
  const nCols = w < 11 ? 2 : w < 17 ? 3 : 4
  const nFloors = Math.min(19, Math.max(2, Math.floor((h - 1) / 3.13)))
  const colSep = w / (nCols + .65)
  for (let floor = 1; floor <= nFloors; floor++) {
    const y = 1.18 + floor * 3.05
    if (y+1.10 > h-.5) break
    for (let col = 0; col < nCols; col++) {
      const xx = x + (col - (nCols-1)/2) * colSep
      for (const side of [-1,1]) {
        const face = side === 1 ? front : back
        batch.box(edge,xx,y,face+side*.31,1.72,2.03,.26)
        batch.box(glass,xx,y,face+side*.46,1.38,1.75,.09)
        batch.box(0xd2e1da,xx,y,face+side*.52,.058,1.72,.04)
        batch.box(edge,xx,y-1.06,face+side*.49,1.94,.15,.38)
      }
      // Alternate selected balconies for recognizable silhouette at street level.
      if (floor%2===0 && (col+id)%2===0) {
        batch.box(edge,xx,y-1.03,front+1.03,Math.min(colSep*.91,3.4),.23,2.0)
        batch.box(rail,xx,y-.35,front+1.97,Math.min(colSep*.91,3.4),.14,.18)
        for (const off of [-.83,0,.83])
          batch.box(rail,xx+off,y-.66,front+1.96,.10,.65,.14)
      }
    }
  }
  // Side windows keep the larger buildings believable while moving around them.
  if (d > 10) for (let floor=1; floor < nFloors; floor+=2) {
    const y=1.18+floor*3.05
    if(y+1.1>h-.5)break
    for(const side of [-1,1])for(const zz of [-.23,.23]) {
      const face=x+side*(w/2+.22)
      batch.box(edge,face,y,z+zz*d,.25,2.0,1.75)
      batch.box(glass,face+side*.14,y,z+zz*d,.08,1.66,1.40)
    }
  }
  // Shopfront: wide windows, doors, canopy, signage and street planters.
  const downtown = Math.abs(x)<440 && z > -430 && z < 600
  const shop = (downtown && ((id+Math.floor(x/34)+Math.floor(z/40))%3!==0)) || enterable
  if (shop) {
    const dark=0x365962
    batch.box(edge,x,1.48,front+.23,w+.12,2.85,.18)
    batch.box(dark,x-w*.29,1.45,front+.37,w*.35,2.28,.08)
    batch.box(dark,x+w*.29,1.45,front+.37,w*.35,2.28,.08)
    batch.box(glass,x-w*.29,1.47,front+.44,w*.32,2.09,.07)
    batch.box(glass,x+w*.29,1.47,front+.44,w*.32,2.09,.07)
    batch.box(0x795b48,x,1.34,front+.43,1.45,2.54,.12)
    const canopy=[0x437e79,0xd79e76,0xb07f90,0xd6b776][id%4]
    batch.box(canopy,x,3.05,front+.92,w*.92,.24,1.85)
    batch.box(edge,x,2.9,front+1.79,w*.92,.19,.16)
    if (world.__v80.signs < (world.__v80.mobile ? 38 : 110)) {
      const titles=['BAKERY','CAFE','MARKET','FLOWERS','MINI MART','TEA SHOP','BOOK SHOP','FASHION']
      const title=enterable ? String(name).slice(0,17).toUpperCase() : titles[id%titles.length]
      sign(root,title,[0,3.58,d/2+.31],[Math.min(w*.77,10),.66],['#2c5559','#ffefd7'])
      world.__v80.signs++
    }
    if ((id+Math.floor(x))%3===0) for(const dx of [-w*.38,w*.38]) {
      batch.box(0xb9957e,x+dx,.43,front+1.05,.9,.85,.8)
      batch.shrub(x+dx,.97,front+1.05,1.12,0x8abf85)
    }
  } else {
    batch.box(edge,x,.26,front+.2,w+.14,.45,.3)
    batch.box(rail,x,3.0,front+.95,Math.min(w*.7,8),.18,1.65)
  }
  // Parapet and rooftop tanks/vents are visible from the helicopter camera.
  const rooftopHelipad = ROOFTOPS.some(p=>Math.hypot(x-p.x,z-p.z)<22)
  if (!rooftopHelipad) {
    const trim=[0xf5e8d8,0xeedac0,0xd6e1d9][id%3]
    for (const zz of [front-.13,back+.13])batch.box(trim,x,h+.35,zz,w+.3,.82,.25)
    for (const xx of [x-w/2+.13,x+w/2-.13])batch.box(trim,xx,h+.35,z,.25,.82,d)
    batch.box(0x8c9fa0,x-w*.25,h+.78,z-d*.18,2.8,1.45,2.5)
    batch.box(0x526b6b,x-w*.25,h+1.56,z-d*.18,3.0,.15,2.7)
    if(h>17)batch.box(0xc8d8cf,x+w*.28,h+.58,z+d*.18,1.8,1.14,1.65)
  }
  if (h>15 && id%3===0) {
    batch.box(0xd5dedb,x+w*.34,6.15,front+.58,1.48,1.0,.75)
    for(const dy of [-.21,0,.21])batch.box(0x6c8b91,x+w*.34,6.15+dy,front+.99,1.2,.055,.035)
  }
}

/* MANDALAY_V82_PROTECT_SPAWN */
// Never construct V8 infill houses on the default or saved player spawn.
function v82ProtectSpawnLot (bx, bz, width, depth) {
  const spots = [{ x: 0, z: 16 }]
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('mandalay-life-v7-progress') || '{}')
      const p = saved && saved.player
      if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) spots.push(p)
    }
  } catch (_) { /* private browsing or corrupt save: protect default spawn */ }
  return spots.some(p =>
    Math.abs(bx - p.x) < width / 2 + 11 &&
    Math.abs(bz - p.z) < depth / 2 + 11
  )
}
/* END_MANDALAY_V82_PROTECT_SPAWN */

// V9.2: strict footprint checks include a 3m facade/fence margin.
function v92LotClearOfRoad (x,z,w,d) {
  const edgeX=w/2+12.0, edgeZ=d/2+12.0
  if(ROADS_X.some(p=>Math.abs(x-p)<edgeX))return false
  if(ROADS_Z.some(p=>Math.abs(z-p)<edgeZ))return false
  return true
}

function infillCity (world, mobile = false) {
  // Make coherent rows of pastel facades along existing roads instead of
  // dropping one isolated building in the middle of a giant empty green plot.
  const rand=rng(81026)
  let total=0
  const cap=mobile?200:500
  const xx=ROADS_X.slice(0,-1).map(x=>x+33)
  const zz=ROADS_Z.slice(0,-1).map(z=>z+33)
  const lots=[[0,0],[-14,-14],[14,14],[-14,14],[14,-14],[0,15],[0,-15]]
  for(const x of xx) for(const z of zz) {
    if (x < -820 || x > 875 || z < -540 || z > 835)continue
    const dense = Math.abs(x)<540 && z > -325 && z < 630
    if (noBuild(world,x,z,4))continue
    const planned=dense ? 3:2
    let used=0
    for(const [ox,oz] of lots) {
      if (used>=planned || total>=cap) break
      if (rand() < (dense ? .16 : .43))continue
      const bx=x+ox+(rand()-.5)*3, bz=z+oz+(rand()-.5)*3
      const w=10.2+rand()*3.5,d=9.7+rand()*3.7
      if (v82ProtectSpawnLot(bx,bz,w,d)) continue
      if (noBuild(world,bx,bz,10) || !v92LotClearOfRoad(bx,bz,w,d) || !boxesClear(world,bx,bz,w,d,2.5))continue
      const center=Math.abs(x)<345 && z>-250 && z<450
      const h=center && rand()>.76 ? 24+rand()*21 : dense ? 11+Math.floor(rand()*5)*3.12 : 6.5+rand()*10
      world.building(bx,bz,w,d,h,Math.floor(rand()*8),false,'Residence')
      used++;total++
    }
    if(total>=cap)return total
  }
  return total
}

function naturalStreets (world) {
  const b=world.__v80.batch,random=rng(98774)
  let added=0
  for (let x=-780;x<890;x+=66) for(let z=-900;z<880;z+=66) {
    if(airport(x,z,24)||inPalaceSquare(x,z,25)||random()<.24)continue
    // Edge of each block, at least 11m from road center, never on an intersection.
    const positions=[[x+17,z+17],[x+47,z+47],[x+18,z+47],[x+47,z+18]]
    for(const [tx,tz] of positions) {
      if(random()<.56 || noBuild(world,tx,tz,2) || !boxesClear(world,tx,tz,4,4,1.7))continue
      b.tree(tx,tz,.68+random()*.54,Math.floor(random()*4))
      added++
    }
  }
  return added
}

// V9.2: no fake static red/green heads; CityLife has timed signals.
function trafficProps (world) {
  return 0
}

function farmland (world) {
  const b=world.__v80.batch
  const shades=[0x8da857,0x9db663,0xb8c578,0x85a95b,0xc4bb79,0x6e9d52]
  let fields=0
  for(let x=1005;x<1245;x+=104)for(let z=-1195;z<930;z+=140) {
    const w=95,d=126,col=shades[fields%shades.length]
    b.box(col,x,.029,z,w,.075,d)
    for(let c=-3;c<=3;c++) b.box(0x558244,x+c*11,.104,z,2.1,.08,d-8)
    b.box(0x987f55,x+w/2+.8,.096,z,1.25,.10,d)
    fields++
  }
  for(let z=1030;z<1220;z+=104) for(let x=-765;x<900;x+=115) {
    const w=105,d=93,col=shades[fields%shades.length]
    b.box(col,x,.029,z,w,.075,d)
    for(let c=-3;c<=3;c++) b.box(0x52864b,x+c*12,.106,z,2.2,.09,d-6)
    b.box(0x948361,x,.09,z+d/2+.7,w,.10,1.3)
    fields++
  }
  return fields
}

function extendClouds (world, mobile) {
  // Respect the cloud sprites already installed by V7.1.
  const target=mobile?65:95
  const initial=world.clouds.length
  for (const item of world.clouds) item.root.scale.multiplyScalar(initial >= 100 ? 1.1 : 1.45)
  if(initial>=target || initial===0) return 0
  const random=rng(98158)
  for(let i=initial;i<target;i++) {
    const base=world.clouds[i%initial]
    const cloned=base.root.clone(true)
    const x=-1200+random()*2380
    cloned.position.set(x,105+random()*70,-1150+random()*2350)
    cloned.scale.setScalar(1.25+random()*.25)
    world.city.add(cloned)
    world.clouds.push({root:cloned,x,phase:random()*6})
  }
  return target-initial
}

/** Install once before `const world = new World(scene)` in src/main.js. */
export function installMandalayRemaster (World, opts={}) {
  if(World.prototype.__v80Remastered) return
  World.prototype.__v80Remastered = true
  const proto=World.prototype
  const originalTerrain=proto.makeTerrain
  const originalBuilding=proto.building
  const originalOuter=proto.makeOuterDistricts
  const originalWindows=proto.finalizeWindows

  proto.makeTerrain=function (...args) {
    this.__v80={batch:new CityBatch(this.city),signs:0,roadsRemoved:0,buildingsAdded:0,mobile:Boolean(opts.mobile)}
    const before=this.city.children.length
    const result=originalTerrain.apply(this,args)
    // Remove only road and sidewalk meshes created by makeTerrain.
    // Airport, river, terrain, palace, rooftops and house geometry stay intact.
    const targets=new Set([0x435662,0xd4c9ae,0xe5d9b6])
    for(const child of this.city.children.slice(before)) {
      const mat=child.material
      if(!child.isMesh || Array.isArray(mat) || !mat?.color)continue
      if(targets.has(mat.color.getHex())) {
        this.city.remove(child)
        this.__v80.roadsRemoved++
      }
    }
    this.__v80.intersections=makeRoadGrid(this,this.__v80.batch)
    if (!opts.farmsPresent) this.__v80.farmland=farmland(this)
    extendClouds(this,Boolean(opts.mobile))
    return result
  }
  proto.building=function (...args) {
    const before = this.windowData ? Object.fromEntries(Object.entries(this.windowData).map(([k,v]) => [k,v.length])) : null
    const root=originalBuilding.apply(this,args)
    if (before && args[4] > 8.5 && this.windowData) {
      for (const [kind,length] of Object.entries(before)) if (this.windowData[kind]) this.windowData[kind].length=length
    }
    decorateBuilding(this,args,root,this.__v80.batch,Boolean(opts.fencesPresent))
    return root
  }
  proto.makeOuterDistricts=function (...args) {
    const result=originalOuter.apply(this,args)
    this.__v80.buildingsAdded=infillCity(this, Boolean(opts.mobile))
    this.__v80.treesAdded=naturalStreets(this)
    this.__v80.trafficLights=trafficProps(this)
    return result
  }
  proto.finalizeWindows=function (...args) {
    const result=originalWindows.apply(this,args)
    this.__v80.batch.flush()
    return result
  }
}
