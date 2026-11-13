import * as THREE from 'three'
import { C, mat, piece, group, sign } from './visual.js'
import { box, clamp } from './physics.js'
import {
  WORLD_LIMIT,
  PALACE,
  BRIDGES,
  ROOFTOPS,
  HELIPADS,
  inPalaceSquare,
  moatBlocks,
  padAt,
  onPalaceRoad
} from './v5layout.js'

export { onPalaceRoad }

function seeded (seed = 34) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const MAP_HALF = WORLD_LIMIT
export const RIVER = { minX: -1008, maxX: -900, centerX: -954 }
export const ROADS_X = Array.from({ length: 27 }, (_, i) => -810 + i * 66)
export const ROADS_Z = Array.from({ length: 30 }, (_, i) => -966 + i * 66)

const INTERIOR_MATERIALS = {
  officeWindow: mat(0xbcdde9, { emissive: 0x5f9ba9, emissiveIntensity: 0.65 }),
  bedroomWindow: mat(0xffe0a2, { emissive: 0xffc57a, emissiveIntensity: 0.65 }),
  ceilingLamp: mat(0xffedbf, { emissive: 0xffdc91, emissiveIntensity: 0.65 })
}

const P = {
  grass: mat(C.grass),
  pavement: mat(C.sidewalk),
  dark: mat(C.dark),
  road: mat(C.road),
  wood: mat(C.wood),
  brick: mat(C.brick),
  leaves: mat(C.leaf, { roughness: 1 }),
  white: mat(C.white),
  window: mat(C.window, {
    metalness: 0.12,
    roughness: 0.3,
    emissive: 0xffc78f,
    emissiveIntensity: 0
  })
}

export function buildModernVilla (parent, variant = 0) {
  const root = group(parent)
  const stucco = mat(0xf8fafc, { roughness: 0.55 })
  const charcoal = mat(0x2d3339, { roughness: 0.5 })
  const warmCream = mat(0xede3d2, { roughness: 0.65 })
  const cedarWood = mat(0x9a623c, { roughness: 0.65 })
  const slateRoof = mat(0x334155, { roughness: 0.6 })
  const glass = mat(0x7dd3fc, {
    roughness: 0.15,
    metalness: 0.5,
    emissive: 0xffe4a3,
    emissiveIntensity: 0.35
  })

  if (variant === 0) {
    piece(root, 'box', charcoal, [-2.4, 3.3, -0.4], [4.6, 6.6, 7.6], {
      cast: true
    })
    piece(root, 'box', stucco, [2.1, 1.7, -0.4], [4.4, 3.4, 7.6], {
      cast: true
    })
    piece(root, 'box', stucco, [2.1, 3.55, 0.2], [4.6, 0.32, 8.2], {
      cast: true
    })
    piece(root, 'box', stucco, [2.1, 6.45, 0.2], [4.6, 0.32, 8.2], {
      cast: true
    })
    piece(root, 'box', stucco, [4.2, 5.0, 0.2], [0.35, 2.9, 8.2], {
      cast: true
    })
    piece(root, 'box', stucco, [0.1, 5.0, 3.9], [0.35, 2.9, 0.35], {
      cast: true
    })
    piece(root, 'box', glass, [2.1, 4.1, 4.1], [4.0, 0.95, 0.08])
    piece(root, 'cylinder', 0x1e293b, [2.1, 6.1, 1.8], [1.6, 0.06, 1.6])
    for (const wy of [1.7, 4.9]) {
      piece(root, 'box', glass, [-2.4, wy, 3.43], [3.2, 2.5, 0.12])
    }
    piece(root, 'box', glass, [2.1, 1.6, 3.43], [3.2, 2.6, 0.12])
    piece(root, 'box', 0xe2e8f0, [1.8, 0.15, 4.1], [5.4, 0.25, 1.4])
  } else if (variant === 1) {
    piece(root, 'box', stucco, [0, 2.2, -0.5], [10.4, 4.4, 7.6], { cast: true })
    piece(root, 'box', slateRoof, [-2.6, 4.9, -0.5], [6.2, 0.35, 8.4], {
      rot: [0, 0, 0.34],
      cast: true
    })
    piece(root, 'box', slateRoof, [2.6, 4.9, -0.5], [6.2, 0.35, 8.4], {
      rot: [0, 0, -0.34],
      cast: true
    })
    piece(root, 'box', 0xcbd5e1, [1.8, 0.16, 3.4], [5.6, 0.28, 2.4])
    piece(root, 'box', stucco, [4.3, 2.2, 4.3], [0.35, 4.2, 0.35], {
      cast: true
    })
    piece(root, 'box', 0x854d0e, [-0.2, 1.45, 3.32], [1.3, 2.5, 0.12])
    piece(root, 'box', glass, [-3.1, 2.1, 3.32], [2.4, 1.8, 0.12])
    piece(root, 'box', glass, [2.4, 2.1, 3.32], [2.2, 1.8, 0.12])
    piece(root, 'box', cedarWood, [2.4, 0.85, 3.6], [1.4, 0.1, 0.9])
  } else if (variant === 2) {
    piece(root, 'box', warmCream, [0, 2.3, -0.5], [11.2, 4.6, 8.0], {
      cast: true
    })
    piece(root, 'box', 0x9ca3af, [0, 0.65, -0.5], [11.4, 1.3, 8.2])
    piece(root, 'box', slateRoof, [0, 5.2, -0.5], [12.2, 1.4, 9.0], {
      cast: true
    })
    piece(root, 'box', slateRoof, [0, 4.6, 3.8], [4.6, 1.1, 2.6], {
      cast: true
    })
    for (const px of [-1.8, 1.8]) {
      piece(root, 'box', 0x9ca3af, [px, 0.9, 4.7], [0.65, 1.8, 0.65])
      piece(root, 'box', warmCream, [px, 2.8, 4.7], [0.45, 2.2, 0.45])
    }
    piece(root, 'box', 0x713f12, [0, 1.55, 3.52], [1.8, 2.7, 0.14])
    for (const wx of [-3.6, 3.6]) {
      piece(root, 'box', glass, [wx, 2.3, 3.52], [2.4, 1.8, 0.12])
    }
    piece(root, 'box', 0xd6c7b2, [0, 0.08, 5.2], [2.4, 0.12, 3.2])
  } else {
    piece(root, 'box', cedarWood, [-3.6, 2.2, -0.4], [5.4, 4.4, 6.4], {
      rot: [0, 0.28, 0],
      cast: true
    })
    piece(root, 'box', cedarWood, [3.6, 2.2, -0.4], [5.4, 4.4, 6.4], {
      rot: [0, -0.28, 0],
      cast: true
    })
    piece(root, 'box', slateRoof, [-3.6, 4.8, -0.4], [5.8, 0.9, 6.8], {
      rot: [0, 0.28, 0],
      cast: true
    })
    piece(root, 'box', slateRoof, [3.6, 4.8, -0.4], [5.8, 0.9, 6.8], {
      rot: [0, -0.28, 0],
      cast: true
    })
    piece(root, 'cylinder', 0x92400e, [0, 0.2, 1.4], [5.2, 0.35, 5.2])
    piece(root, 'cone', 0x64748b, [0, 4.9, 1.4], [6.2, 1.6, 6.2], {
      cast: true
    })
    for (const px of [-2.1, 2.1]) {
      piece(root, 'cylinder', cedarWood, [px, 2.2, 3.2], [0.28, 4.2, 0.28])
    }
    piece(root, 'box', glass, [0, 2.1, 0.6], [3.6, 2.4, 0.14])
  }
  return root
}

export class World {
  constructor (scene) {
    this.city = group(scene)
    this.inside = group(scene)
    this.inside.visible = false
    this.obstacles = []
    this.tallObstacles = []
    this.doors = []
    this.sway = []
    this.dogs = []
    this.cats = []
    this.birds = []
    this.properties = []
    this.streetLights = []
    this.palaceLights = []
    this.daylight = 1
    this.clouds = []
    this.windowData = { frame: [], glass: [], mullion: [] }
    this.interiorFloor = 0
    this.activeDoor = null
    this.maxInteriorFloors = 1
    this.roofPads = HELIPADS
    this.parkActors = []
    this.palace = PALACE
    this.plaza = { x: 15, z: -9 }
    this.watchtower = null
    this.houseCollision = null
    this.liveCollisionBoxes = []
    this.interiorBoxes = []
    this.interiorKind = 'APARTMENT'
    this.insideBaseY = 0
    this.plot = {
      x: 81,
      z: 57,
      w: 29,
      d: 30,
      price: 120,
      housePrice: 220,
      treePrice: 25
    }
    this.depot = { x: -51, z: 80, name: 'Delivery Depot' }
    this.destinations = [
      { x: 82, z: -132, name: 'Sunset Junction' },
      { x: 146, z: 126, name: 'East Market' },
      { x: 15, z: 125, name: 'Tea Shop Lane' },
      { x: -116, z: -74, name: 'Riverside Road' },
      { x: 146, z: -75, name: 'Clock Tower' },
      { x: 13, z: -75, name: 'Palace Entrance' }
    ]
    this.rng = seeded(11928)
    this.makeTerrain()
    this.makeDistricts()
    this.makeOuterDistricts()
    this.makeRoofTowers()
    this.makePalace()
    this.finalizeWindows()
    this.makePlot()
    this.makeInterior()
    this.makeWildlife()
    this.switchInterior(false)
  }

  addObstacle (x, z, w, d, pad = 0, height = 10) {
    const b = box(x, z, w, d, pad)
    b.height = height
    this.obstacles.push(b)
    this.tallObstacles.push(b)
    return b
  }

  getAircraftCollisionBoxes (alt) {
    const list = this.houseCollision
      ? this.tallObstacles.concat([this.houseCollision])
      : this.tallObstacles
    return list.filter(b => alt < (b.height || 10) - 0.35)
  }

  getRoofCeilingAt (x, z, r = 2.5) {
    let maxRoof = 0
    const all = this.houseCollision
      ? this.tallObstacles.concat([this.houseCollision])
      : this.tallObstacles
    for (const b of all) {
      if (
        x + r > b.minX &&
        x - r < b.maxX &&
        z + r > b.minZ &&
        z - r < b.maxZ
      ) {
        if ((b.height || 0) > maxRoof) maxRoof = b.height
      }
    }
    return maxRoof
  }

  addWindow (kind, x, y, z, w, h, d) {
    this.windowData[kind].push([x, y, z, w, h, d])
  }

  finalizeWindows () {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const quaternion = new THREE.Quaternion()
    const matrix = new THREE.Matrix4()
    const surfaces = {
      frame: mat(0xe7dbc3),
      glass: P.window,
      mullion: mat(0x7c918c)
    }
    for (const [kind, items] of Object.entries(this.windowData)) {
      if (!items.length) continue
      const mesh = new THREE.InstancedMesh(
        geometry,
        surfaces[kind],
        items.length
      )
      for (let i = 0; i < items.length; i++) {
        const [x, y, z, w, h, d] = items[i]
        matrix.compose(
          new THREE.Vector3(x, y, z),
          quaternion,
          new THREE.Vector3(w, h, d)
        )
        mesh.setMatrixAt(i, matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.receiveShadow = true
      this.city.add(mesh)
    }
    this.windowData = { frame: [], glass: [], mullion: [] }
  }

  makeTerrain () {
    const city = this.city
    piece(
      city,
      'box',
      0x83a873,
      [0, -0.46, 0],
      [MAP_HALF * 2 - 0.5, 0.9, MAP_HALF * 2 - 0.5]
    )
    const water = mat(C.water, { metalness: 0.18, roughness: 0.23 })
    piece(
      city,
      'box',
      water,
      [RIVER.centerX, -0.12, 0],
      [RIVER.maxX - RIVER.minX, 0.17, MAP_HALF * 2 - 20]
    )
    piece(
      city,
      'box',
      0xc7b18e,
      [RIVER.maxX + 1.4, 0.11, 0],
      [3, 0.2, MAP_HALF * 2 - 20]
    )
    piece(
      city,
      'box',
      0xd5b987,
      [RIVER.minX + 0.8, 0.08, 0],
      [1.4, 0.16, MAP_HALF * 2 - 20]
    )

    const roadMarks = []
    const end = MAP_HALF - 22
    const palaceNorth = PALACE.z - PALACE.outerHalf
    const palaceSouth = PALACE.z + PALACE.outerHalf

    for (const x of ROADS_X) {
      const sections =
        Math.abs(x - PALACE.x) < PALACE.outerHalf + 5
          ? [
              [-end, palaceNorth],
              [palaceSouth, end]
            ]
          : [[-end, end]]
      for (const [a, b] of sections) {
        if (b <= a) continue
        piece(city, 'box', P.road, [x, 0.032, (a + b) / 2], [13, 0.06, b - a])
        for (const dx of [-7.7, 7.7]) {
          piece(
            city,
            'box',
            P.pavement,
            [x + dx, 0.12, (a + b) / 2],
            [2.7, 0.18, b - a]
          )
        }
      }
      for (let z = -end; z <= end; z += 15) {
        if (!inPalaceSquare(x, z, 4))
          roadMarks.push([x, 0.071, z, 0.22, 0.015, 5])
      }
    }

    for (const z of ROADS_Z) {
      const sections =
        Math.abs(z - PALACE.z) < PALACE.outerHalf + 5
          ? [
              [-830, PALACE.x - PALACE.outerHalf],
              [PALACE.x + PALACE.outerHalf, end]
            ]
          : [[-830, end]]
      for (const [a, b] of sections) {
        if (b <= a) continue
        piece(city, 'box', P.road, [(a + b) / 2, 0.037, z], [b - a, 0.08, 13])
        for (const dz of [-7.7, 7.7]) {
          piece(
            city,
            'box',
            P.pavement,
            [(a + b) / 2, 0.12, z + dz],
            [b - a, 0.18, 2.7]
          )
        }
      }
      for (let x = -826; x <= end; x += 15) {
        if (!inPalaceSquare(x, z, 4))
          roadMarks.push([x, 0.083, z, 5, 0.015, 0.22])
      }
    }

    const laneGeometry = new THREE.BoxGeometry(1, 1, 1)
    const lanes = new THREE.InstancedMesh(
      laneGeometry,
      mat(0xe5d9b6),
      roadMarks.length
    )
    const matrix = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < roadMarks.length; i++) {
      const [x, y, z, sx, sy, sz] = roadMarks[i]
      matrix.compose(
        new THREE.Vector3(x, y, z),
        q,
        new THREE.Vector3(sx, sy, sz)
      )
      lanes.setMatrixAt(i, matrix)
    }
    lanes.instanceMatrix.needsUpdate = true
    lanes.receiveShadow = true
    city.add(lanes)

    piece(
      city,
      'box',
      0xc7bc9e,
      [RIVER.maxX + 6, 0.15, 0],
      [3, 0.2, MAP_HALF * 2 - 46]
    )
    for (const z of [-460, 30, 515]) {
      piece(city, 'box', 0x8e745b, [RIVER.maxX + 1.0, 0.2, z], [7, 0.26, 19])
      piece(
        city,
        'box',
        0xf4d7a1,
        [RIVER.maxX + 5.0, 1.3, z + 10],
        [0.3, 2.6, 0.3]
      )
    }

    // Modern Mandalay International Airport Complex
    this.airport = { x: 399, z: -199, runwayWidth: 52, runwayLength: 380 }
    piece(city, 'box', 0x7a9660, [425, 0.06, -198], [185, 0.12, 430])
    const fieldColors = [0x6b8e4e, 0x8ea868, 0x9c8b68, 0x5d7c47]
    for (let fi = 0; fi < 10; fi++) {
      const fx = 535 + (fi % 2) * 42
      const fz = -380 + Math.floor(fi / 2) * 85
      piece(city, 'box', fieldColors[fi % 4], [fx, 0.05, fz], [38, 0.08, 78])
    }
    piece(city, 'box', 0x38444f, [402, 0.15, -198], [52, 0.12, 380])
    for (let z = -372; z <= -25; z += 23)
      piece(city, 'box', 0xf7e9cb, [402, 0.228, z], [0.7, 0.045, 11])
    for (const dx of [-23.5, 23.5])
      piece(city, 'box', 0xffffff, [402 + dx, 0.24, -198], [0.42, 0.042, 368])
    for (const z of [-370, -28])
      for (let dx = -17; dx <= 17; dx += 8)
        piece(city, 'box', 0xffffff, [402 + dx, 0.239, z], [4, 0.05, 7])

    piece(city, 'box', 0x64748b, [362, 0.16, -198], [16, 0.12, 356])
    piece(city, 'box', 0x64748b, [442, 0.16, -198], [14, 0.12, 340])
    for (const tz of [-350, -285, -220, -155, -90, -45]) {
      piece(city, 'box', 0x64748b, [382, 0.16, tz], [26, 0.12, 11])
      piece(city, 'box', 0x64748b, [422, 0.16, tz], [24, 0.12, 10])
    }
    piece(city, 'box', 0x94a3b8, [468, 0.18, -198], [54, 0.14, 210])
    piece(city, 'box', 0xe7dcc8, [488, 5.5, -198], [26, 11, 115], {
      cast: true
    })
    piece(city, 'box', 0xd6b88d, [488, 11.4, -198], [29, 0.9, 118])
    piece(city, 'box', 0x65a30d, [488, 11.9, -198], [14, 0.3, 46])
    for (let gz = -245; gz <= -150; gz += 24) {
      piece(city, 'box', 0xf8fafc, [470, 3.8, gz], [14, 2.2, 2.6])
      piece(city, 'cylinder', 0x475569, [465, 1.9, gz], [0.4, 3.8, 0.4])
    }
    piece(city, 'box', 0x334155, [516, 0.14, -198], [24, 0.1, 95])
    this.addObstacle(488, -198, 26, 115, 0, 12.5)

    this.cloudMaterial = mat(0xf1f2ef, { roughness: 1 })
    for (let i = 0; i < 54; i++) {
      const x = -810 + this.rng() * 1700
      const z = -900 + this.rng() * 1850
      const cloud = group(city, x, 70 + this.rng() * 34, z)
      for (let k = 0; k < 4; k++)
        piece(
          cloud,
          'sphere',
          this.cloudMaterial,
          [k * 4.6 - 6, (k % 2) * 1.1, 0],
          [12, 4.7, 6.4]
        )
      this.clouds.push({ root: cloud, x, phase: this.rng() * 6 })
    }
  }

  makeTree (x, z, s = 1, fruit = false) {
    if (ROADS_X.some(v => Math.abs(x - v) < 7.8) && !inPalaceSquare(x, z))
      return
    if (ROADS_Z.some(v => Math.abs(z - v) < 7.8) && !inPalaceSquare(x, z))
      return
    const g = group(this.city, x, 0, z)
    piece(
      g,
      'cylinder',
      0x85644d,
      [0, 1.25 * s, 0],
      [0.42 * s, 2.5 * s, 0.42 * s],
      { cast: true }
    )
    const crown = group(g, 0, 2.9 * s, 0)
    for (const [px, py, pz, r] of [
      [0, 0.18, 0, 2.7],
      [-1.05, -0.18, 0.18, 2.1],
      [0.85, -0.15, -0.56, 1.9],
      [0.3, 0.78, 0.5, 1.75]
    ]) {
      piece(
        crown,
        'sphere',
        fruit ? 0x82a56a : C.leaf2,
        [px * s, py * s, pz * s],
        [r * s, r * 0.84 * s, r * s]
      )
    }
    if (fruit) {
      for (const [px, py, pz] of [
        [-0.65, 0, 1],
        [1.1, -0.3, 0.6]
      ]) {
        piece(
          crown,
          'sphere',
          C.orange,
          [px * s, py * s, pz * s],
          [0.28 * s, 0.28 * s, 0.28 * s]
        )
      }
    }
    this.sway.push({ node: crown, x, z, phase: this.rng() * 6, s })
    this.addObstacle(x, z, 0.48 * s, 0.48 * s, 0, 5.5 * s)
  }

  makeLamp (x, z) {
    if (
      ROADS_X.some(v => Math.abs(x - v) < 8.1) ||
      ROADS_Z.some(v => Math.abs(z - v) < 8.1)
    )
      return
    const g = group(this.city, x, 0, z)
    piece(g, 'cylinder', 0x536266, [0, 2.9, 0], [0.21, 5.8, 0.21])
    piece(g, 'box', 0x536266, [0.6, 5.7, 0], [1.2, 0.16, 0.16])
    const shade = piece(
      g,
      'sphere',
      0xffe6aa,
      [1.17, 5.58, 0],
      [0.58, 0.3, 0.58]
    )
    shade.material = mat(0xffda8e, { emissive: 0xb37c38, emissiveIntensity: 0 })
    this.streetLights.push(shade)
  }

  makePalaceLantern (x, z, y = 0) {
    const g = group(this.city, x, y, z)
    piece(g, 'cylinder', 0x451a03, [0, 1.8, 0], [0.22, 3.6, 0.22])
    piece(g, 'box', 0xd97706, [0, 3.7, 0], [0.85, 0.16, 0.85])
    const globe = piece(g, 'sphere', 0xfef08a, [0, 4.15, 0], [0.68, 0.78, 0.68])
    globe.material = mat(0xfef08a, { emissive: 0xffb703, emissiveIntensity: 0 })
    piece(g, 'cone', 0x991b1b, [0, 4.75, 0], [1.1, 0.55, 1.1])
    this.palaceLights.push({ globe, light: null })
  }

  building (x, z, w, d, h, style, enterable = false, name = 'Home') {
    const city = this.city
    const root = group(city, x, 0, z)
    if (!enterable && h <= 8.5) {
      const variant = style % 4
      const villa = buildModernVilla(root, variant)
      villa.scale.set(w / 11, 1, d / 9)
      this.addObstacle(x, z, w, d, 0.15, h + 1)
      const floors = variant === 0 ? 2 : 1
      this.doors.push({
        x,
        z: z + d / 2 + 1.35,
        name: 'Modern Residence',
        kind: 'building',
        houseStyle: variant,
        floors,
        mixed: false
      })
      return root
    }

    const win = (kind, xx, yy, zz, ww, hh, dd) =>
      this.addWindow(kind, x + xx, yy, z + zz, ww, hh, dd)
    const walls = [0xd9b69a, 0xc5d1bf, 0xe1c7a2, 0xddd6bd, 0xd8a28b, 0x9eb9ac]
    const wall = walls[style % walls.length]
    const accent = [0xc27963, 0x8b958e, 0x8f7067, 0x5d8e87][style % 4]
    piece(root, 'box', wall, [0, h / 2, 0], [w, h, d], { cast: true })
    piece(root, 'box', accent, [0, h + 0.3, 0], [w + 0.8, 0.6, d + 0.8], {
      cast: true
    })
    piece(
      root,
      'box',
      0xe8d3b8,
      [0, 0.47, d / 2 + 0.15],
      [w + 0.35, 0.95, 0.45]
    )
    const rows = Math.max(1, Math.floor((h - 2) / 3.2))
    for (let j = 0; j < rows; j++) {
      for (const ix of [-0.29, 0, 0.29]) {
        const xx = ix * w
        const yy = 2.6 + j * 3.05
        win('frame', xx, yy, d / 2 + 0.08, 1.38, 1.8, 0.24)
        win('glass', xx, yy, d / 2 + 0.22, 1.1, 1.55, 0.1)
        win('mullion', xx, yy, d / 2 + 0.29, 0.1, 1.55, 0.12)
        win('mullion', xx, yy, d / 2 + 0.29, 1.14, 0.1, 0.12)
      }
    }
    for (let j = 0; j < rows; j++) {
      const yy = 2.6 + j * 3.05
      for (const ix of [-0.29, 0, 0.29]) {
        win('frame', ix * w, yy, -d / 2 - 0.07, 1.26, 1.7, 0.14)
        win('glass', ix * w, yy, -d / 2 - 0.16, 1.02, 1.42, 0.08)
      }
      for (const side of [-1, 1]) {
        for (const zz of [-0.26, 0.26]) {
          win('frame', side * (w / 2 + 0.07), yy, zz * d, 0.14, 1.7, 1.25)
          win('glass', side * (w / 2 + 0.16), yy, zz * d, 0.09, 1.42, 1.0)
        }
      }
    }
    piece(root, 'box', 0x654b3d, [0, 1.39, d / 2 + 0.18], [2.35, 2.77, 0.12])
    piece(
      root,
      'sphere',
      C.gold,
      [0.78, 1.35, d / 2 + 0.29],
      [0.13, 0.13, 0.13]
    )
    if (style % 3 === 1) {
      piece(
        root,
        'box',
        0xe6a765,
        [0, 2.9, d / 2 + 1.2],
        [Math.min(w + 1, 12), 0.3, 2.5]
      )
      piece(
        root,
        'box',
        0xf4e6c5,
        [0, 3.07, d / 2 + 2.4],
        [Math.min(w + 1, 12), 0.3, 0.48]
      )
    }
    this.addObstacle(x, z, w, d, 0.12, h + 1)
    if (enterable)
      sign(
        root,
        name.toUpperCase(),
        [0, h + 0.98, d / 2 + 0.22],
        [Math.min(w - 1, 9), 1.08]
      )
    const floors = Math.min(6, Math.max(1, Math.floor(h / 3.6)))
    const mixed = floors >= 3
    this.doors.push({
      x,
      z: z + d / 2 + 1.35,
      name: enterable ? name : mixed ? 'Mixed-Use Building' : 'Residence',
      kind: 'building',
      floors,
      mixed
    })
    return root
  }

  makeDistricts () {
    const r = this.rng
    const xs = [-117, -51, 15, 81, 147]
    const zs = [-141, -75, -9, 57, 123]
    for (let a = 0; a < xs.length; a++) {
      for (let b = 0; b < zs.length; b++) {
        const x = xs[a]
        const z = zs[b]
        const id = `${a}:${b}`
        if (id === '3:3' || id === '1:3' || id === '2:2' || id === '3:1')
          continue
        if (id === '4:0') continue
        if ((a + b) % 5 === 0) {
          this.makePark(x, z)
          continue
        }
        const n = 2 + Math.floor(r() * 2)
        for (let k = 0; k < n; k++) {
          const bx = x + (k === 0 ? -11 : k === 1 ? 10 : 0)
          const bz = z + (k === 2 ? 9 : 0)
          const w = 12 + r() * 3
          const d = 12 + r() * 3
          const enterable =
            (a === 2 && b === 3 && k === 0) ||
            (a === 1 && b === 2 && k === 0) ||
            (a === 4 && b === 3 && k === 0)
          const name =
            a === 2 ? 'Tea House' : a === 1 ? 'Book Shop' : 'Corner Store'
          const h = 8 + Math.floor(r() * 5) * 2.8
          this.building(bx, bz, w, d, h, Math.floor(r() * 6), enterable, name)
        }
        if (r() > 0.2) this.makeTree(x + 28, z + 28, 0.82)
      }
    }
    const d = group(this.city, -51, 0, 57)
    piece(d, 'box', 0xd9ac81, [0, 2.9, -1], [18, 5.8, 16], { cast: true })
    piece(d, 'box', 0x577883, [0, 6.0, -1], [19, 0.55, 17])
    piece(d, 'box', 0x355460, [0, 1.65, 7.2], [6, 3.1, 0.15])
    sign(d, 'DELIVERY DEPOT', [0, 4.6, 7.4], [12, 1.4], ['#374d55', '#f4d5a0'])
    this.addObstacle(-51, 56, 18, 16, 0.2, 6.5)

    for (let z = -190; z <= 208; z += 35)
      this.makeTree(-857, z, 0.75, z % 3 === 0)
    for (let z = -200; z <= 196; z += 48) {
      this.makeLamp(-840, z)
      this.makeLamp(167, z)
    }
    for (let x = -145; x <= 153; x += 52) this.makeLamp(x, -187)
    this.makeMarket(15, -9)
  }

  makeOuterDistricts () {
    const rng = this.rng
    const centers = ROADS_X.slice(0, -1).map(x => x + 33)
    const rows = ROADS_Z.slice(0, -1).map(z => z + 33)
    for (const x of centers) {
      for (const z of rows) {
        if (x >= -117 && x <= 147 && z >= -141 && z <= 123) continue
        if (x > 290 && z < -2 && z > -399) continue
        if (inPalaceSquare(x, z, 17)) continue
        if (ROOFTOPS.some(p => Math.hypot(x - p.x, z - p.z) < 41)) continue
        if (Math.abs(x) > 590 || Math.abs(z) > 590) {
          if (rng() < 0.74) continue
        }
        if (rng() < 0.17) {
          piece(this.city, 'box', 0x9dbf86, [x, 0.075, z], [38, 0.14, 38])
          for (let j = 0; j < 3; j++)
            this.makeTree(x - 13 + j * 13, z + 11, 0.68)
        } else if (rng() < 0.81) {
          const suburban = rng() < 0.6
          if (suburban) {
            for (const dx of [-11, 11]) {
              const w = 11.2 + rng() * 1.1
              const d = 12 + rng() * 1.5
              const h = 6.2 + rng() * 1.0
              this.building(
                x + dx,
                z + (rng() - 0.5) * 6,
                w,
                d,
                h,
                Math.floor(rng() * 6),
                false,
                'Home'
              )
            }
          } else {
            const w = 13 + rng() * 5
            const d = 12 + rng() * 5
            const h = 9 + Math.floor(rng() * 6) * 2.6
            this.building(
              x + (rng() - 0.5) * 9,
              z + (rng() - 0.5) * 9,
              w,
              d,
              h,
              Math.floor(rng() * 6)
            )
          }
          if (rng() > 0.48) this.makeTree(x + 18, z + 17, 0.65)
        } else {
          this.makeTree(x - 12, z - 12, 0.86)
          this.makeTree(x + 11, z + 10, 0.8)
        }
      }
    }
    for (let z = -415; z <= 425; z += 55) {
      this.makeLamp(-330, z)
      this.makeLamp(277, z)
    }
    for (let x = -320; x <= 290; x += 60) this.makeLamp(x, 276)
  }

  makePark (x, z) {
    piece(this.city, 'box', 0xa7bf83, [x, 0.08, z], [52, 0.15, 50])
    piece(this.city, 'box', 0xdacda9, [x, 0.16, z], [3, 0.1, 47])
    piece(this.city, 'box', 0xdacda9, [x, 0.17, z], [49, 0.1, 3])
    for (let i = 0; i < 6; i++) {
      const px = x - 19 + (i % 3) * 19
      const pz = z - 16 + Math.floor(i / 3) * 33
      this.makeTree(px, pz, 1.0)
    }
    const fountain = group(this.city, x, 0, z)
    piece(fountain, 'cylinder', 0xd8d3be, [0, 0.45, 0], [7, 0.68, 7])
    piece(fountain, 'cylinder', C.water, [0, 0.82, 0], [6.3, 0.2, 6.3])
    piece(fountain, 'cylinder', 0xf0e9d1, [0, 1.42, 0], [0.55, 1.4, 0.55])
    this.addObstacle(x, z, 5, 5, 0, 3)
    for (const [dx, dz, rotation] of [
      [-11, -9, 0],
      [11, -9, Math.PI],
      [-11, 10, 0],
      [11, 10, Math.PI]
    ]) {
      const b = group(this.city, x + dx, 0, z + dz)
      b.rotation.y = rotation
      piece(b, 'box', 0x896449, [0, 0.62, 0], [3.5, 0.23, 0.72])
      piece(b, 'box', 0x896449, [0, 1.16, 0.29], [3.5, 0.87, 0.18])
      for (const xx of [-1.36, 1.36])
        piece(b, 'box', 0x424b46, [xx, 0.29, 0], [0.13, 0.57, 0.62])
    }
    if (this.parkActors.length < 24) {
      const relatives = [
        [-14, 1, 'family', 0.87],
        [14, -1, 'family', 0.9],
        [-16, 10, 'child', 0.65],
        [15, 12, 'child', 0.65],
        [0, -16, 'couple', 0.87]
      ]
      for (const [dx, dz, role, scale] of relatives) {
        const g = group(this.city, x + dx, 0, z + dz)
        const outfit =
          role === 'child' ? 0xd58464 : role === 'couple' ? 0x9675a6 : 0x558f85
        const body = group(g)
        body.scale.setScalar(scale)
        piece(body, 'sphere', 0xc58f6f, [0, 1.86, 0], [0.48, 0.49, 0.45], {
          cast: true
        })
        piece(body, 'sphere', outfit, [0, 1.13, 0], [0.68, 1.05, 0.48], {
          cast: true
        })
        const legs = []
        for (const side of [-1, 1]) {
          const l = group(body, side * 0.19, 0.75, 0)
          piece(l, 'box', 0x48536d, [0, -0.32, 0], [0.23, 0.66, 0.26])
          legs.push(l)
          piece(body, 'box', outfit, [side * 0.44, 1.14, 0], [0.2, 0.75, 0.25])
        }
        this.parkActors.push({
          root: g,
          legs,
          x: x + dx,
          z: z + dz,
          prevX: x + dx,
          prevZ: z + dz,
          role,
          phase: this.rng() * Math.PI * 2
        })
      }
    }
  }

  makeMarket (x, z) {
    const root = group(this.city, x, 0, z)
    piece(root, 'box', 0xdcc9a6, [0, 0.11, 0], [56, 0.2, 52])
    piece(root, 'box', 0xe8dbc0, [0, 6.5, -8], [46, 13, 22], { cast: true })
    piece(root, 'box', 0x9b483b, [0, 13.5, -8], [49, 1.2, 25], { cast: true })
    piece(root, 'box', 0x7dd3fc, [0, 14.8, -8], [32, 1.8, 16])
    for (const px of [-14, 14]) {
      piece(root, 'box', 0x9b483b, [px, 15.2, -8], [11, 1.4, 11], {
        cast: true
      })
      piece(root, 'box', 0xe5b95e, [px, 16.0, -8], [11.6, 0.22, 11.6])
      piece(root, 'cone', 0xd8b05f, [px, 18.2, -8], [7.5, 3.8, 7.5])
    }
    for (let i = -4; i <= 4; i++) {
      const wx = i * 4.6
      piece(root, 'box', 0x7da6af, [wx, 6.2, 3.2], [2.7, 6.2, 0.17])
      piece(root, 'box', 0xe7d9bc, [wx, 6.2, 3.36], [0.14, 6.2, 0.18])
    }
    piece(root, 'box', 0x355b65, [0, 1.65, 3.6], [5.8, 3.3, 0.24])
    piece(root, 'box', 0xcab47f, [0, 3.9, 4], [7.8, 0.48, 1.4])
    sign(
      root,
      'ZAY CHO PLAZA',
      [0, 11.6, 3.55],
      [22, 2.1],
      ['#563f42', '#ffe9b4']
    )
    this.addObstacle(x, z - 8, 46, 22, 0.15, 19)
    this.doors.push({
      x,
      z: z + 5.9,
      name: 'Zay Cho Plaza · Ground Floor',
      kind: 'market',
      floors: 1,
      mixed: false
    })

    const tower = group(root, 17, 0, 7)
    piece(tower, 'box', 0xe5d7ae, [0, 11.5, 0], [7.6, 23, 7.6], { cast: true })
    for (const h of [6, 13, 19.5])
      piece(tower, 'box', 0xa97254, [0, h, 0], [8.3, 0.6, 8.3])
    piece(tower, 'box', 0x9d483b, [0, 24.2, 0], [10.4, 2.2, 10.4])
    piece(tower, 'box', 0xe5b95e, [0, 25.4, 0], [10.8, 0.25, 10.8])
    piece(tower, 'cone', 0xd8b05f, [0, 27.8, 0], [10, 5.5, 10])
    piece(tower, 'cone', 0xe6bf6e, [0, 32.2, 0], [3.5, 4.5, 3.5])
    for (const [px, pz, rot] of [
      [0, 3.88, 0],
      [0, -3.88, Math.PI],
      [3.88, 0, Math.PI / 2],
      [-3.88, 0, -Math.PI / 2]
    ]) {
      const face = group(tower, px, 16.2, pz)
      face.rotation.y = rot
      piece(face, 'cylinder', 0xf6e9cd, [0, 0, 0], [3.7, 0.22, 3.7], {
        rot: [Math.PI / 2, 0, 0]
      })
      piece(face, 'box', 0x3f372e, [0, 0.48, 0.17], [0.16, 1.06, 0.12])
      piece(face, 'box', 0x3f372e, [0.35, 0, 0.17], [0.82, 0.14, 0.12])
    }
    this.addObstacle(x + 17, z + 7, 8.4, 8.4, 0, 34)

    const umbrellaColors = [
      0xef4444, 0xeab308, 0x3b82f6, 0x10b981, 0xa855f7, 0xf97316
    ]
    for (let i = 0; i < 6; i++) {
      const xx = -18 + (i % 3) * 12
      const zz = 14 + Math.floor(i / 3) * 7
      if (i === 2) continue
      piece(root, 'box', 0x9b795c, [xx, 0.72, zz], [6.6, 1.3, 3.8])
      piece(
        root,
        'cone',
        umbrellaColors[i % umbrellaColors.length],
        [xx - 1.5, 2.5, zz],
        [3.6, 1.1, 3.6]
      )
      piece(
        root,
        'cone',
        umbrellaColors[(i + 2) % umbrellaColors.length],
        [xx + 1.5, 2.5, zz],
        [3.6, 1.1, 3.6]
      )
      piece(root, 'sphere', 0xc99672, [xx, 2.02, zz - 1.1], [0.42, 0.46, 0.42])
      piece(
        root,
        'sphere',
        umbrellaColors[(i + 1) % umbrellaColors.length],
        [xx, 1.42, zz - 1.1],
        [0.58, 0.82, 0.42]
      )
      this.addObstacle(x + xx, z + zz, 6.6, 3.8, 0.2, 3.5)
    }
  }

  makeHelipad (x, z, height = 0, r = 8.7) {
    const root = group(this.city, x, height, z)
    piece(root, 'cylinder', 0x455e60, [0, 0.15, 0], [r * 2, 0.32, r * 2])
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.83, 0.29, 7, 48),
      mat(0xf9d991, { emissive: 0xd7a044, emissiveIntensity: 0.4 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.36
    root.add(ring)
    for (const xx of [-2.05, 2.05])
      piece(root, 'box', 0xffffff, [xx, 0.35, 0], [0.74, 0.12, 5.0])
    piece(root, 'box', 0xffffff, [0, 0.35, 0], [4.4, 0.12, 0.85])
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      const lamp = piece(
        root,
        'sphere',
        0xffdc82,
        [Math.cos(a) * r * 0.94, 0.62, Math.sin(a) * r * 0.94],
        [0.5, 0.35, 0.5]
      )
      lamp.material = mat(0xffdb8d, {
        emissive: 0xffbb56,
        emissiveIntensity: 1.8
      })
    }
  }

  makeRoofTowers () {
    for (const tower of ROOFTOPS) {
      const t = this.building(
        tower.x,
        tower.z,
        22,
        24,
        tower.h,
        2,
        true,
        'Rooftop Business Tower'
      )
      piece(t, 'box', 0x647c75, [0, tower.h + 0.56, 0], [22.5, 0.65, 24.5])
      piece(t, 'box', 0xd6cfc0, [7.5, tower.h + 2.3, 8.2], [4.2, 3.0, 4.6])
      piece(t, 'box', 0x455a64, [7.5, tower.h + 2.1, 5.85], [1.6, 2.4, 0.16])
      this.makeHelipad(tower.x, tower.z, tower.h + 1.0, 8.7)
    }
  }

  makePalaceHall (
    px,
    pz,
    name,
    w = 21,
    d = 17,
    levels = 1,
    subtype = 'pavilion'
  ) {
    const root = group(this.city, px, 0, pz)
    const isGrand = levels > 1
    const height = isGrand ? 9.5 : 5.8

    piece(root, 'box', 0xf4ede0, [0, 0.45, 0], [w + 3.2, 0.9, d + 3.2], {
      receive: true
    })
    piece(root, 'box', 0xe6dcc8, [0, 0.25, d / 2 + 2.2], [5.4, 0.5, 1.8])
    piece(root, 'box', 0xf4ede0, [0, 0.65, d / 2 + 1.5], [4.8, 0.5, 1.4])

    const wallColor = isGrand ? 0xe5b94c : 0xb43e32
    piece(root, 'box', wallColor, [0, height / 2 + 0.9, 0], [w, height, d], {
      cast: true
    })

    const cols = Math.max(3, Math.floor(w / 4.5))
    for (let i = 0; i <= cols; i++) {
      const cx = -w / 2 + 0.6 + (i * (w - 1.2)) / cols
      piece(
        root,
        'cylinder',
        0xf6cf65,
        [cx, height / 2 + 0.9, d / 2 + 0.12],
        [0.36, height, 0.36]
      )
      piece(
        root,
        'cylinder',
        0xf6cf65,
        [cx, height / 2 + 0.9, -d / 2 - 0.12],
        [0.36, height, 0.36]
      )
    }

    const tiers = isGrand ? 7 : 3
    const roofColor = isGrand ? 0xd9a136 : 0xa32f29
    const trimColor = 0xf8d26a
    for (let layer = 0; layer < tiers; layer++) {
      const s = 1 - layer * (isGrand ? 0.125 : 0.24)
      const yBase = height + 1.25 + layer * 1.18
      piece(
        root,
        'box',
        roofColor,
        [0, yBase, 0],
        [w * s + 2.4, 0.92, d * s + 2.4],
        { cast: true }
      )
      piece(
        root,
        'box',
        trimColor,
        [0, yBase + 0.48, 0],
        [w * s + 2.9, 0.18, d * s + 2.9]
      )
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          piece(
            root,
            'cone',
            trimColor,
            [
              sx * (w * s * 0.5 + 1.25),
              yBase + 0.72,
              sz * (d * s * 0.5 + 1.25)
            ],
            [0.55, 0.75, 0.55]
          )
        }
      }
    }

    const topY = height + 1.25 + tiers * 1.18
    piece(
      root,
      'cone',
      trimColor,
      [0, topY + (isGrand ? 3.2 : 2.1), 0],
      [isGrand ? 3.6 : 2.6, isGrand ? 6.8 : 4.4, isGrand ? 3.6 : 2.6],
      { cast: true }
    )

    piece(root, 'box', 0x3b231e, [0, 2.3, d / 2 + 0.15], [3.4, 3.2, 0.25])
    piece(root, 'cone', trimColor, [0, 4.7, d / 2 + 0.25], [4.6, 2.2, 0.6])

    this.makePalaceLantern(px - 3.6, pz + d / 2 + 2.6, 0)
    this.makePalaceLantern(px + 3.6, pz + d / 2 + 2.6, 0)

    this.doors.push({
      x: px,
      z: pz + d / 2 + 2.2,
      name,
      kind: 'palace',
      subtype,
      floors: levels,
      mixed: false
    })
    this.addObstacle(px, pz, w, d, 0.15, topY + 5)
  }

  makePalace () {
    const { x, z, outerHalf, innerHalf, wallHalf } = PALACE
    const r = this.city

    piece(
      r,
      'box',
      0xd8c8aa,
      [x, 0.08, z],
      [outerHalf * 2 + 1.2, 0.16, outerHalf * 2 + 1.2]
    )
    piece(r, 'box', 0x7da45c, [x, 0.2, z], [innerHalf * 2, 0.26, innerHalf * 2])

    const moat = mat(0x4b9ec2, { metalness: 0.25, roughness: 0.18 })
    const band = outerHalf - innerHalf
    for (const s of [-1, 1]) {
      piece(
        r,
        'box',
        moat,
        [x, 0.22, z + s * (innerHalf + band / 2)],
        [outerHalf * 2, 0.18, band]
      )
      piece(
        r,
        'box',
        moat,
        [x + s * (innerHalf + band / 2), 0.22, z],
        [band, 0.18, innerHalf * 2]
      )
    }

    const brickMat = mat(0xb24739, { roughness: 0.72 })
    const trimGold = mat(0xefc258, { roughness: 0.35, metalness: 0.35 })
    const darkRoof = mat(0x962d26, { roughness: 0.55 })

    for (const side of [-1, 1]) {
      for (const half of [-1, 1]) {
        const seg = wallHalf - 11
        const pos = half * (11 + seg / 2)

        piece(
          r,
          'box',
          brickMat,
          [x + pos, 4.8, z + side * wallHalf],
          [seg, 9.6, 3.6],
          { cast: true }
        )
        this.addObstacle(x + pos, z + side * wallHalf, seg, 3.6, 0, 12)

        piece(
          r,
          'box',
          brickMat,
          [x + side * wallHalf, 4.8, z + pos],
          [3.6, 9.6, seg],
          { cast: true }
        )
        this.addObstacle(x + side * wallHalf, z + pos, 3.6, seg, 0, 12)

        for (let b = -seg / 2 + 2; b <= seg / 2 - 2; b += 3.6) {
          piece(
            r,
            'box',
            brickMat,
            [x + pos + b, 10.1, z + side * (wallHalf + 1.1)],
            [1.8, 1.1, 0.8]
          )
          piece(
            r,
            'box',
            brickMat,
            [x + side * (wallHalf + 1.1), 10.1, z + pos + b],
            [0.8, 1.1, 1.8]
          )
        }

        const bx = x + half * (wallHalf * 0.52)
        const bz = z + half * (wallHalf * 0.52)
        piece(
          r,
          'box',
          brickMat,
          [bx, 5.4, z + side * (wallHalf + 1.6)],
          [9.5, 10.8, 6.2],
          { cast: true }
        )
        piece(
          r,
          'box',
          brickMat,
          [x + side * (wallHalf + 1.6), 5.4, bz],
          [6.2, 10.8, 9.5],
          { cast: true }
        )
      }

      const gates = [
        { gx: x, gz: z + side * wallHalf, rot: 0 },
        { gx: x + side * wallHalf, gz: z, rot: Math.PI / 2 }
      ]
      for (const { gx, gz, rot } of gates) {
        const gate = group(r, gx, 0, gz)
        gate.rotation.y = rot
        for (const px of [-9.5, 9.5]) {
          piece(gate, 'box', brickMat, [px, 5.6, 0], [6.5, 11.2, 7.2], {
            cast: true
          })
        }
        piece(gate, 'box', brickMat, [0, 9.4, 0], [25.5, 3.8, 7.2], {
          cast: true
        })
        for (let t = 0; t < 3; t++) {
          const s = 1 - t * 0.24
          piece(
            gate,
            'box',
            darkRoof,
            [0, 12.0 + t * 1.35, 0],
            [26 * s, 1.1, 9.5 * s],
            { cast: true }
          )
          piece(
            gate,
            'box',
            trimGold,
            [0, 12.6 + t * 1.35, 0],
            [26.6 * s, 0.2, 10.1 * s]
          )
        }
        piece(gate, 'cone', trimGold, [0, 17.6, 0], [4.2, 5.2, 4.2])
        this.makePalaceLantern(gx - 9.5, gz + 6.5, 0)
        this.makePalaceLantern(gx + 9.5, gz - 6.5, 0)
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tx = x + sx * wallHalf
        const tz = z + sz * wallHalf
        piece(r, 'box', brickMat, [tx, 6.2, tz], [13.5, 12.4, 13.5], {
          cast: true
        })
        for (let t = 0; t < 3; t++) {
          const s = 1 - t * 0.25
          piece(
            r,
            'box',
            darkRoof,
            [tx, 13.2 + t * 1.4, tz],
            [15.5 * s, 1.15, 15.5 * s],
            { cast: true }
          )
          piece(
            r,
            'box',
            trimGold,
            [tx, 13.8 + t * 1.4, tz],
            [16.1 * s, 0.22, 16.1 * s]
          )
        }
        piece(r, 'cone', trimGold, [tx, 19.2, tz], [4.5, 5.6, 4.5])
      }
    }

    const tx = x - 34
    const tz = z + 68
    const nanMyint = group(r, tx, 0, tz)
    piece(nanMyint, 'box', 0xf3e8d2, [0, 0.35, 0], [15, 0.7, 15], {
      receive: true
    })
    piece(nanMyint, 'cylinder', 0xb23b2e, [0, 10.5, 0], [9.6, 20.5, 9.6], {
      cast: true
    })
    piece(nanMyint, 'cylinder', 0xf4ede0, [0, 20.8, 0], [13.2, 0.45, 13.2], {
      cast: true,
      receive: true
    })
    const railRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.14, 8, 32),
      trimGold
    )
    railRing.rotation.x = Math.PI / 2
    railRing.position.y = 21.8
    nanMyint.add(railRing)
    piece(nanMyint, 'cone', trimGold, [0, 25.4, 0], [7.8, 6.2, 7.8], {
      cast: true
    })

    const stepCount = 64
    const stairRadius = 5.75
    for (let s = 0; s <= stepCount; s++) {
      const frac = s / stepCount
      const angle = frac * Math.PI * 4.5
      const sy = 0.4 + frac * 20.4
      const sx = Math.cos(angle) * stairRadius
      const sz = Math.sin(angle) * stairRadius
      const step = piece(
        nanMyint,
        'box',
        0xeadbc3,
        [sx, sy, sz],
        [2.1, 0.25, 1.15],
        { cast: true, receive: true }
      )
      step.rotation.y = -angle
      if (s % 2 === 0) {
        const rx = Math.cos(angle) * (stairRadius + 0.85)
        const rz = Math.sin(angle) * (stairRadius + 0.85)
        piece(
          nanMyint,
          'cylinder',
          trimGold,
          [rx, sy + 0.55, rz],
          [0.08, 1.1, 0.08]
        )
      }
    }
    this.watchtower = {
      x: tx,
      z: tz,
      coreRadius: 4.85,
      outerRadius: 6.85,
      topY: 21.05
    }
    this.addObstacle(tx, tz, 9.4, 9.4, 0, 28)

    for (const bridge of BRIDGES) {
      const alongZ = bridge.axis === 'z'
      const bGroup = group(r, bridge.x, 0, bridge.z)
      if (!alongZ) bGroup.rotation.y = Math.PI / 2

      piece(bGroup, 'box', 0xd8ccb4, [0, 0.42, 0], [13.2, 0.45, 42], {
        cast: true,
        receive: true
      })
      for (const pz of [-15, -5, 5, 15]) {
        piece(bGroup, 'box', 0xc4b59b, [0, 0.22, pz], [13.0, 0.55, 2.8])
      }
      for (const side of [-1, 1]) {
        piece(
          bGroup,
          'box',
          0xf4eee1,
          [side * 6.3, 0.95, 0],
          [0.55, 0.75, 42],
          { cast: true }
        )
        for (let lz = -18; lz <= 18; lz += 9) {
          piece(
            bGroup,
            'box',
            0xe5d8be,
            [side * 6.3, 1.25, lz],
            [0.85, 1.25, 0.85]
          )
        }
        const wx = alongZ ? bridge.x + side * 6.3 : bridge.x
        const wz = alongZ ? bridge.z : bridge.z + side * 6.3
        this.makePalaceLantern(wx, wz, 0.9)
      }
    }

    piece(r, 'box', 0xdcd3c0, [x, 0.34, z], [13.2, 0.14, 306], {
      receive: true
    })
    piece(r, 'box', 0xdcd3c0, [x, 0.35, z], [306, 0.14, 13.2], {
      receive: true
    })
    for (const s of [-1, 1]) {
      piece(r, 'box', 0xe8e0cf, [x + s * 68, 0.32, z], [4.5, 0.1, 210])
      piece(r, 'box', 0xe8e0cf, [x, 0.32, z + s * 68], [210, 0.1, 4.5])
      for (const dist of [-90, -45, 45, 90]) {
        this.makePalaceLantern(x + s * 8.2, z + dist, 0.3)
        this.makePalaceLantern(x + dist, z + s * 8.2, 0.3)
      }
    }

    this.makePalaceHall(
      x,
      z - 14,
      'Mya Nan San Kyaw Royal Throne Hall',
      46,
      34,
      2,
      'throne'
    )
    const halls = [
      [-76, -78, 'Royal Museum', 'museum'],
      [76, -78, 'Royal Gallery', 'museum'],
      [-82, -16, 'Historical Hall', 'museum'],
      [82, -16, 'Royal Archives', 'archives'],
      [-78, 56, 'Southwest Royal Pavilion', 'pavilion'],
      [74, 52, 'Southeast Royal Pavilion', 'pavilion'],
      [-38, -98, 'North Royal Pavilion', 'pavilion'],
      [38, -98, 'Northeast Royal Pavilion', 'pavilion'],
      [-38, 94, 'Southern Audience Hall', 'throne'],
      [38, 94, 'South Royal Hall', 'pavilion'],
      [-110, -96, 'West Guard Post', 'guard'],
      [110, -96, 'East Guard Post', 'guard']
    ]
    for (const [ox, oz, name, subtype] of halls) {
      this.makePalaceHall(
        x + ox,
        z + oz,
        name,
        subtype === 'guard' ? 11 : 20,
        subtype === 'guard' ? 10 : 15,
        1,
        subtype
      )
    }

    for (const [lx, lz] of [
      [x, z + 18],
      [x - 65, z - 45],
      [x + 65, z - 45],
      [x, z - 85]
    ]) {
      const pl = new THREE.PointLight(0xffb703, 0, 120, 1.5)
      pl.position.set(lx, 12, lz)
      r.add(pl)
      this.palaceLights.push({ globe: null, light: pl })
    }

    for (const ox of [-118, -102, 102, 118]) {
      for (const oz of [-58, 20, 96]) {
        if (Math.abs(ox) < 18 || Math.abs(oz) < 10) continue
        if (halls.some(([hx, hz]) => Math.hypot(hx - ox, hz - oz) < 15))
          continue
        if (Math.hypot(ox - 98, oz - 99) < 18) continue
        this.makeTree(x + ox, z + oz, 0.78)
      }
    }
    this.makeHelipad(x + 98, z + 99, 0.36, 9.5)

    const hill = group(r, x + 285, 0, z - 255)
    piece(hill, 'cone', 0x6f964e, [0, 26, 0], [145, 52, 135], { receive: true })
    piece(hill, 'cone', 0x7da359, [-36, 18, 22], [95, 36, 90], {
      receive: true
    })
    for (const [px, py, pz, s] of [
      [0, 52, 0, 1.3],
      [-24, 38, 16, 0.9],
      [28, 34, -12, 0.85]
    ]) {
      piece(hill, 'box', 0xf8fafc, [px, py, pz], [12 * s, 4 * s, 12 * s])
      piece(
        hill,
        'cone',
        0xf6c954,
        [px, py + 6.5 * s, pz],
        [7 * s, 11 * s, 7 * s]
      )
    }
  }

  makePlot () {
    const p = this.plot
    const r = group(this.city, p.x, 0, p.z)
    this.plotGroup = r
    piece(r, 'box', 0x8eb16d, [0, 0.07, 0], [p.w, 0.16, p.d])
    const edging = mat(0xe6d8a9)
    for (const dz of [-p.d / 2, p.d / 2])
      piece(r, 'box', edging, [0, 0.25, dz], [p.w, 0.34, 0.4])
    for (const dx of [-p.w / 2, p.w / 2])
      piece(r, 'box', edging, [dx, 0.25, 0], [0.4, 0.34, p.d])
    this.plotSign = sign(
      r,
      'LAND · 120 COINS',
      [-0.5, 2.8, p.d / 2 + 0.4],
      [9, 1.7],
      ['#3b615c', '#fff1d0']
    )
    piece(
      r,
      'cylinder',
      0x80634c,
      [-0.5, 1.35, p.d / 2 + 0.2],
      [0.25, 2.7, 0.25]
    )
    this.houseGroup = group(r)
    this.gardenGroup = group(r)
  }

  updatePlot (save) {
    if (this.plotSign?.material?.map) {
      const tx = this.plotSign.material.map
      tx.dispose()
      this.plotSign.material.map = null
    }
    if (this.plotSign) {
      this.plotGroup.remove(this.plotSign)
      this.plotSign.material.dispose()
      this.plotSign.geometry.dispose()
    }
    this.plotSign = sign(
      this.plotGroup,
      save.ownPlot ? 'YOUR PROPERTY' : 'LAND · 120 COINS',
      [-0.5, 2.8, this.plot.d / 2 + 0.4],
      [9, 1.7],
      ['#3b615c', '#fff1d0']
    )
    while (this.houseGroup.children.length)
      this.houseGroup.remove(this.houseGroup.children[0])
    while (this.gardenGroup.children.length)
      this.gardenGroup.remove(this.gardenGroup.children[0])
    this.houseCollision = save.house
      ? box(this.plot.x, this.plot.z - 2, 14, 11, 0.2)
      : null
    if (this.houseCollision) this.houseCollision.height = 8.5
    if (save.house) {
      const villa = buildModernVilla(this.houseGroup, 0)
      villa.position.set(0, 0, -2)
      villa.scale.set(1.25, 1.1, 1.25)
      this.doors = this.doors.filter(a => a.kind !== 'home')
      this.doors.push({
        x: this.plot.x,
        z: this.plot.z - 2 + 11 / 2 + 0.97,
        name: 'Your Modern Villa',
        kind: 'home',
        houseStyle: 0,
        floors: 2,
        mixed: false
      })
    } else {
      this.doors = this.doors.filter(a => a.kind !== 'home')
    }

    for (let i = 0; i < save.trees; i++) {
      const gx = -11 + (i % 4) * 6.3
      const gz = -11 + Math.floor(i / 4) * 7.5
      const g = group(this.gardenGroup, gx, 0, gz)
      piece(g, 'cylinder', C.wood, [0, 0.66, 0], [0.25, 1.32, 0.25])
      piece(g, 'sphere', C.leaf2, [0, 1.65, 0], [1.6, 1.7, 1.6])
    }
  }

  makeInterior (entry = null, level = 0) {
    const r = this.inside
    r.clear()
    this.activeDoor = entry || {
      name: 'Sample Apartment',
      floors: 1,
      mixed: false
    }
    this.maxInteriorFloors = Math.max(1, this.activeDoor.floors || 1)
    this.interiorFloor = clamp(level, 0, this.maxInteriorFloors - 1)
    const baseY = this.interiorFloor * 3.6
    const floor = group(r, 0, baseY, 0)
    const mixed = !!this.activeDoor.mixed
    const isMarket = this.activeDoor.kind === 'market'
    const isPalace = this.activeDoor.kind === 'palace'
    const subtype = this.activeDoor.subtype || 'pavilion'
    const houseStyle = this.activeDoor.houseStyle ?? -1
    const isOffice =
      mixed && (this.interiorFloor === 0 || this.interiorFloor % 2 === 0)

    const wallColor = isPalace
      ? subtype === 'throne'
        ? 0xe5b94c
        : subtype === 'guard'
        ? 0xb4533c
        : 0xd6ad7c
      : isMarket
      ? 0xe9d0a4
      : isOffice
      ? 0xdce4dc
      : 0xf4efe6
    const carpet = isPalace
      ? subtype === 'throne'
        ? 0x991b1b
        : subtype === 'archives'
        ? 0x475569
        : 0x9d5142
      : isMarket
      ? 0xc9b38b
      : isOffice
      ? 0xa9bfc0
      : houseStyle === 2 || houseStyle === 3
      ? 0xb08968
      : 0xe2e8f0

    piece(floor, 'box', carpet, [0, -0.12, 0], [16, 0.24, 14])
    piece(floor, 'box', wallColor, [0, 2.0, -7], [16, 4, 0.23])
    piece(floor, 'box', wallColor, [-8, 2.0, 0], [0.23, 4, 14])
    piece(floor, 'box', wallColor, [8, 2.0, 0], [0.23, 4, 14])
    piece(floor, 'box', wallColor, [-5.0, 2.0, 6.95], [6, 4, 0.23])
    piece(floor, 'box', wallColor, [5.0, 2.0, 6.95], [6, 4, 0.23])

    const lit = isOffice
      ? INTERIOR_MATERIALS.officeWindow
      : INTERIOR_MATERIALS.bedroomWindow
    for (const px of [-5, 0, 5]) {
      piece(floor, 'box', 0xfaf3e3, [px, 2.2, -6.83], [2.6, 1.75, 0.15])
      piece(floor, 'box', lit, [px, 2.2, -6.72], [2.3, 1.46, 0.07])
    }

    if (isMarket) {
      const colors = [0xb06f53, 0x69968e, 0xd5aa68, 0x7b92ba, 0xb87b82]
      for (let i = 0; i < 5; i++) {
        const xx = i % 2 === 0 ? -5.4 : 2.4
        const zz = -4.5 + Math.floor(i / 2) * 3.6
        piece(floor, 'box', 0x8a684f, [xx, 0.65, zz], [2.7, 1.3, 1.3])
        piece(floor, 'box', colors[i], [xx, 1.54, zz - 0.53], [3.2, 0.22, 1.55])
        for (let j = -1; j <= 1; j++) {
          piece(
            floor,
            'sphere',
            [0xdbc286, 0xcf795a, 0x70a088][i % 3],
            [xx + j * 0.6, 1.39, zz],
            [0.36, 0.42, 0.38]
          )
        }
      }
      sign(floor, 'FOOD · CLOTHES · TEA', [0, 2.8, -6.63], [11, 1.35])
      this.interiorBoxes = [box(-5.4, -4.5, 2.7, 1.3), box(2.4, -4.5, 2.7, 1.3)]
    } else if (isPalace && subtype === 'throne') {
      piece(floor, 'box', 0xdc2626, [0, 0.03, 0.5], [3.2, 0.04, 12])
      piece(floor, 'box', 0xf59e0b, [0, 0.65, -4.6], [4.4, 1.3, 2.6])
      piece(floor, 'box', 0xfbbf24, [0, 2.1, -5.2], [2.6, 2.4, 1.4])
      piece(floor, 'cone', 0xfde047, [0, 3.8, -5.2], [2.2, 2.2, 2.2])
      for (const side of [-1, 1]) {
        piece(
          floor,
          'cylinder',
          0xd97706,
          [side * 3.8, 1.9, -2.5],
          [0.55, 3.8, 0.55]
        )
        piece(
          floor,
          'cylinder',
          0xd97706,
          [side * 3.8, 1.9, 2.0],
          [0.55, 3.8, 0.55]
        )
      }
      sign(floor, 'ROYAL THRONE HALL', [0, 3.25, -6.62], [12.5, 1.1])
      this.interiorBoxes = [box(0, -4.6, 4.4, 2.6)]
    } else if (isPalace && subtype === 'museum') {
      for (const [gx, gz] of [
        [-4.5, -3.2],
        [0, -3.2],
        [4.5, -3.2],
        [-3.5, 1.8],
        [3.5, 1.8]
      ]) {
        piece(floor, 'box', 0x573d2e, [gx, 0.6, gz], [2.0, 1.2, 1.6])
        piece(floor, 'sphere', 0xfacc15, [gx, 1.45, gz], [0.75, 0.65, 0.75])
      }
      sign(floor, 'ROYAL ARTIFACTS MUSEUM', [0, 3.25, -6.62], [11.5, 1.1])
      this.interiorBoxes = [
        box(-4.5, -3.2, 2.0, 1.6),
        box(0, -3.2, 2.0, 1.6),
        box(4.5, -3.2, 2.0, 1.6)
      ]
    } else if (isPalace && subtype === 'archives') {
      for (const bx of [-6.8, 6.8])
        piece(floor, 'box', 0x451a03, [bx, 1.7, -1.5], [1.2, 3.4, 8.5])
      for (const tz of [-3.2, 1.2]) {
        piece(floor, 'box', 0x78350f, [-1.2, 0.75, tz], [5.2, 0.25, 1.8])
        piece(floor, 'box', 0xfef3c7, [-1.2, 0.95, tz], [1.8, 0.14, 0.9])
      }
      sign(floor, 'ROYAL ARCHIVES & LIBRARY', [0, 3.25, -6.62], [11.5, 1.1])
      this.interiorBoxes = [
        box(-6.8, -1.5, 1.2, 8.5),
        box(-1.2, -3.2, 5.2, 1.8)
      ]
    } else if (isPalace && subtype === 'guard') {
      for (const wx of [-5.2, 3.2]) {
        piece(floor, 'box', 0x3f2e21, [wx, 1.4, -5.5], [3.4, 2.8, 0.8])
        for (let s = -1; s <= 1; s++)
          piece(
            floor,
            'cylinder',
            0xd4af37,
            [wx + s * 0.9, 1.6, -5.0],
            [0.08, 2.8, 0.08]
          )
      }
      piece(floor, 'box', 0x78350f, [-2.2, 0.7, 0.5], [3.6, 0.25, 1.8])
      sign(floor, 'ROYAL PALACE GUARD POST', [0, 3.25, -6.62], [11.5, 1.1])
      this.interiorBoxes = [box(-2.2, 0.5, 3.6, 1.8)]
    } else if (isPalace) {
      piece(floor, 'box', 0x991b1b, [-2.2, 0.45, -3.5], [5.8, 0.55, 3.2])
      piece(floor, 'box', 0xfbbf24, [-2.2, 0.85, -4.5], [5.2, 0.45, 0.8])
      piece(floor, 'box', 0x78350f, [-2.2, 0.42, 0.4], [3.2, 0.45, 1.6])
      sign(floor, 'ROYAL LIVING PAVILION', [0, 3.25, -6.62], [11.5, 1.1])
      this.interiorBoxes = [box(-2.2, -3.5, 5.8, 3.2), box(-2.2, 0.4, 3.2, 1.6)]
    } else if (houseStyle === 0) {
      if (this.interiorFloor === 0) {
        piece(floor, 'box', wallColor, [-1.6, 1.65, -0.5], [0.22, 3.3, 12.2])
        piece(floor, 'box', 0x78350f, [-5.2, 0.45, 2.8], [3.2, 0.5, 2.8])
        piece(floor, 'box', 0xf8fafc, [-5.2, 0.78, 2.8], [3.0, 0.28, 2.6])
        piece(floor, 'box', 0x94a3b8, [-5.2, 0.5, -3.8], [2.4, 0.9, 1.8])
        piece(floor, 'box', 0x334155, [3.2, 0.55, -5.8], [5.6, 1.1, 1.2])
        piece(floor, 'box', 0x92400e, [2.6, 0.55, -1.6], [3.0, 0.18, 1.6])
        piece(floor, 'box', 0x1e293b, [4.8, 0.55, 2.6], [1.4, 0.9, 3.4])
        this.interiorBoxes = [
          box(-1.6, -0.5, 0.22, 12.2),
          box(-5.2, 2.8, 3.2, 2.8),
          box(2.6, -1.6, 3.0, 1.6)
        ]
      } else {
        piece(floor, 'box', wallColor, [0, 1.65, -0.2], [15.6, 3.3, 0.22])
        piece(floor, 'box', 0x78350f, [3.6, 0.45, -3.8], [3.2, 0.5, 2.8])
        piece(floor, 'box', 0xfef08a, [3.6, 0.78, -3.8], [3.0, 0.28, 2.6])
        piece(floor, 'box', 0xcbd5e1, [3.2, 0.05, 3.2], [7.2, 0.12, 6.2])
        piece(floor, 'box', 0x7dd3fc, [3.2, 0.7, 6.2], [7.2, 1.1, 0.12])
        this.interiorBoxes = [box(3.6, -3.8, 3.2, 2.8)]
      }
    } else if (houseStyle === 1) {
      piece(floor, 'box', wallColor, [-1.5, 1.65, -1.2], [0.22, 3.3, 10.6])
      piece(floor, 'box', wallColor, [-4.8, 1.65, -0.4], [6.4, 3.3, 0.22])
      piece(floor, 'box', 0x65a30d, [-5.0, 0.65, -4.0], [2.8, 0.6, 3.2])
      piece(floor, 'box', 0x64748b, [-5.0, 0.65, 2.8], [2.8, 0.6, 3.2])
      piece(floor, 'box', 0xe2e8f0, [3.8, 0.55, -5.8], [5.8, 1.1, 1.2])
      piece(floor, 'box', 0xd97706, [3.4, 0.55, -2.6], [2.2, 0.16, 2.2])
      piece(floor, 'box', 0x475569, [5.4, 0.55, 2.6], [1.4, 0.85, 4.4])
      piece(floor, 'box', 0x475569, [3.2, 0.55, 4.2], [3.6, 0.85, 1.3])
      this.interiorBoxes = [
        box(-1.5, -1.2, 0.22, 10.6),
        box(-4.8, -0.4, 6.4, 0.22),
        box(3.4, -2.6, 2.2, 2.2),
        box(5.4, 2.6, 1.4, 4.4)
      ]
    } else if (houseStyle === 2) {
      piece(floor, 'box', wallColor, [2.2, 1.65, -1.0], [0.22, 3.3, 11.0])
      piece(floor, 'box', 0xd6c7b2, [-3.6, 0.55, 0.4], [3.4, 0.85, 1.3])
      piece(floor, 'box', 0x92400e, [-1.2, 0.55, -4.2], [3.2, 0.18, 1.6])
      piece(floor, 'box', 0x78350f, [-1.2, 0.55, -1.2], [1.4, 1.0, 3.2])
      piece(floor, 'box', 0xf8fafc, [5.0, 0.65, -3.6], [2.8, 0.6, 2.8])
      piece(floor, 'box', 0xe2e8f0, [5.0, 0.65, 2.8], [2.6, 0.6, 2.4])
      this.interiorBoxes = [
        box(2.2, -1.0, 0.22, 11.0),
        box(-1.2, -1.2, 1.4, 3.2),
        box(-3.6, 0.4, 3.4, 1.3)
      ]
    } else if (houseStyle === 3) {
      piece(floor, 'box', wallColor, [-3.4, 1.65, -0.5], [0.22, 3.3, 11.5])
      piece(floor, 'box', wallColor, [3.4, 1.65, -0.5], [0.22, 3.3, 11.5])
      const lounge = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.45, 8, 24, Math.PI * 1.4),
        mat(0xe7e0d2)
      )
      lounge.rotation.x = Math.PI / 2
      lounge.position.set(0, 0.45, 1.2)
      floor.add(lounge)
      piece(floor, 'cylinder', 0x78350f, [0, 0.4, 1.2], [1.6, 0.35, 1.6])
      piece(floor, 'box', 0xf8fafc, [0, 0.55, -5.2], [4.6, 1.0, 1.3])
      piece(floor, 'box', 0x9a623c, [-5.6, 0.65, -2.5], [2.6, 0.6, 3.0])
      piece(floor, 'box', 0x9a623c, [5.6, 0.65, -2.5], [2.6, 0.6, 3.0])
      this.interiorBoxes = [
        box(-3.4, -0.5, 0.22, 11.5),
        box(3.4, -0.5, 0.22, 11.5),
        box(0, 1.2, 3.6, 3.6)
      ]
    } else if (isOffice) {
      piece(floor, 'box', wallColor, [-1.7, 1.65, -3.05], [0.2, 3.3, 5.65])
      piece(floor, 'box', wallColor, [-5.15, 1.65, -0.26], [6.6, 3.3, 0.2])
      for (const [xx, zz] of [
        [-5, -3.5],
        [1.0, -3.5],
        [-4, 3.2]
      ]) {
        piece(floor, 'box', 0x9b765c, [xx, 0.88, zz], [2.8, 0.22, 1.4])
        for (const leg of [-1, 1])
          piece(
            floor,
            'box',
            0x776555,
            [xx + leg * 1.05, 0.44, zz],
            [0.16, 0.88, 0.16]
          )
        piece(floor, 'box', 0x354f5b, [xx, 1.45, zz - 0.3], [1.06, 0.71, 0.09])
        piece(floor, 'box', 0x34474a, [xx, 1.25, zz - 0.07], [0.3, 0.15, 0.35])
        piece(floor, 'box', 0x658d89, [xx, 1.0, zz + 1.35], [0.92, 0.85, 0.73])
      }
      piece(floor, 'box', 0xcab785, [-5.2, 2.48, -6.71], [3.6, 0.68, 0.12])
      this.interiorBoxes = [
        box(-1.7, -3.05, 0.22, 5.65),
        box(-5.15, -0.26, 6.6, 0.22),
        box(-5, -3.5, 2.6, 2),
        box(-4, 3.2, 2, 1.2)
      ]
    } else {
      piece(floor, 'box', wallColor, [-1.7, 1.65, -3.05], [0.2, 3.3, 5.65])
      piece(floor, 'box', wallColor, [-5.15, 1.65, -0.26], [6.6, 3.3, 0.2])
      for (const [xx, zz] of [
        [-5.4, -3.7],
        [0.75, -3.7]
      ]) {
        piece(floor, 'box', 0x8e654f, [xx, 0.55, zz], [2.75, 0.48, 3.55])
        piece(floor, 'box', 0xeadbc7, [xx, 0.94, zz], [2.55, 0.32, 3.05])
        piece(floor, 'box', 0xe9b6a8, [xx, 1.12, zz + 1.0], [2.45, 0.22, 0.92])
        piece(floor, 'box', 0xf9f4de, [xx, 1.12, zz - 1.0], [1.85, 0.24, 0.75])
        piece(
          floor,
          'box',
          0xae8965,
          [xx + 1.9, 0.65, zz - 1.1],
          [0.86, 1.05, 0.68]
        )
        piece(
          floor,
          'sphere',
          0xffe9aa,
          [xx + 1.9, 1.32, zz - 1.1],
          [0.42, 0.3, 0.42]
        )
      }
      piece(floor, 'box', 0x779f91, [1.15, 0.75, 2.65], [3.0, 1.4, 1.1])
      piece(floor, 'box', 0x779f91, [1.15, 1.56, 3.06], [3, 0.95, 0.39])
      piece(floor, 'box', 0xa48561, [-3.4, 0.65, 3.0], [2.2, 0.34, 1.15])
      this.interiorBoxes = [
        box(-1.7, -3.05, 0.22, 5.65),
        box(-5.15, -0.26, 6.6, 0.22),
        box(-5, -3.5, 2.6, 2),
        box(-4, 3.2, 2, 1.2)
      ]
    }

    if (this.maxInteriorFloors > 1) {
      const stairs = group(floor, 5.4, 0, -3.3)
      for (let i = 0; i < 9; i++) {
        piece(
          stairs,
          'box',
          0xad9272,
          [0, (i + 0.5) * 0.35, -3.0 + i * 0.75],
          [2.5, 0.21, 0.79]
        )
      }
      for (const sx of [-1.35, 1.35]) {
        piece(stairs, 'box', 0x6a645b, [sx, 1.8, 0], [0.12, 3.5, 0.12])
        piece(stairs, 'box', 0xa38564, [sx, 2.85, 0.05], [0.16, 0.15, 6.9], {
          rot: [-0.36, 0, 0]
        })
      }
    }

    const ceil = piece(
      floor,
      'box',
      0xffebc2,
      [-0.7, 3.41, 0],
      [2.2, 0.12, 1.1]
    )
    ceil.material = INTERIOR_MATERIALS.ceilingLamp
    const point = new THREE.PointLight(0xffdfaa, isOffice ? 22 : 17, 26, 2)
    point.position.set(0, baseY + 3.15, 0)
    r.add(point)

    this.interiorKind = isPalace
      ? subtype.toUpperCase()
      : isMarket
      ? 'MARKET HALL'
      : isOffice
      ? 'OFFICE'
      : houseStyle >= 0
      ? `VILLA PLAN 0${houseStyle + 1}`
      : 'APARTMENT'
    this.insideBaseY = baseY
  }

  setInteriorFloor (level) {
    this.makeInterior(this.activeDoor, level)
    return this.interiorFloor
  }

  switchInterior (on, entry = null) {
    if (on) this.makeInterior(entry, 0)
    this.city.visible = !on
    this.inside.visible = on
  }

  nearStairs (pos) {
    return (
      this.maxInteriorFloors > 1 && Math.hypot(pos.x - 5.4, pos.z + 3.3) < 3.8
    )
  }

  getInteriorLabel () {
    return `${this.interiorKind} · FLOOR ${this.interiorFloor + 1}/${
      this.maxInteriorFloors
    }`
  }

  makeWildlife () {
    for (let i = 0; i < 4; i++) {
      const root = group(this.city, -4 + i * 28, 0, 37 + i * 18)
      const body = group(root)
      piece(
        body,
        'sphere',
        i % 2 ? 0xc8a77c : 0xdfc49b,
        [0, 0.55, 0],
        [1.45, 0.7, 0.7]
      )
      piece(
        body,
        'sphere',
        i % 2 ? 0xc8a77c : 0xdfc49b,
        [0, 1.02, -0.68],
        [0.75, 0.72, 0.68]
      )
      for (const px of [-0.45, 0.45])
        for (const pz of [-0.4, 0.5])
          piece(body, 'cylinder', 0x705541, [px, 0.26, pz], [0.19, 0.53, 0.2])
      piece(body, 'cone', 0x835a42, [-0.34, 1.53, -0.73], [0.31, 0.6, 0.31])
      piece(body, 'cone', 0x835a42, [0.34, 1.53, -0.73], [0.31, 0.6, 0.31])
      const tail = group(body, 0, 0.83, 0.7)
      piece(tail, 'cylinder', 0xc8a77c, [0, 0.32, 0.25], [0.2, 0.76, 0.2], {
        rot: [0.64, 0, 0]
      })
      this.dogs.push({
        root,
        tail,
        origin: { x: root.position.x, z: root.position.z },
        phase: i * 2.4
      })
    }
    for (let i = 0; i < 5; i++) {
      const root = group(this.city, -94 + i * 47, 0, -19 + i * 13)
      const color = i % 2 ? 0xc9a78a : 0x6b6761
      piece(root, 'sphere', color, [0, 0.38, 0], [1.03, 0.56, 0.43])
      piece(root, 'sphere', color, [0, 0.75, -0.47], [0.53, 0.51, 0.47])
      for (const xx of [-0.27, 0.27])
        piece(root, 'cone', color, [xx, 1.12, -0.51], [0.21, 0.38, 0.2])
      for (const xx of [-0.3, 0.3])
        for (const zz of [-0.37, 0.36])
          piece(root, 'cylinder', color, [xx, 0.17, zz], [0.13, 0.32, 0.12])
      const tail = group(root, 0, 0.45, 0.53)
      piece(tail, 'cylinder', color, [0, 0.3, 0.05], [0.12, 0.64, 0.12], {
        rot: [0.5, 0, 0]
      })
      this.cats.push({
        root,
        tail,
        origin: { x: root.position.x, z: root.position.z },
        phase: i * 1.31
      })
    }
    for (let i = 0; i < 10; i++) {
      const root = group(this.city, 0, 15, 0)
      piece(root, 'sphere', 0xf6ead1, [0, 0, 0], [0.65, 0.45, 1.05])
      const left = group(root, -0.42, 0.1, 0)
      const right = group(root, 0.42, 0.1, 0)
      piece(left, 'box', 0xf6ead1, [-0.52, 0, 0], [1.1, 0.12, 0.54])
      piece(right, 'box', 0xf6ead1, [0.52, 0, 0], [1.1, 0.12, 0.54])
      this.birds.push({
        root,
        left,
        right,
        phase: i * 2.1,
        rad: 15 + i * 2.2,
        cx: -55 + i * 12,
        cz: -35 + (i % 4) * 42
      })
    }
  }

  update (t) {
    for (const a of this.parkActors) {
      const freq = a.role === 'child' ? 2.2 : 0.47
      const nx =
        a.x + Math.sin(t * freq + a.phase) * (a.role === 'child' ? 1.3 : 2.4)
      const nz =
        a.z + Math.cos(t * 0.52 + a.phase) * (a.role === 'child' ? 1.5 : 1.0)
      const vx = nx - a.prevX
      const vz = nz - a.prevZ
      if (Math.hypot(vx, vz) > 0.0005) {
        a.root.rotation.y = Math.atan2(-vx, -vz)
      }
      a.root.position.x = nx
      a.root.position.z = nz
      a.prevX = nx
      a.prevZ = nz
      const stride =
        Math.sin(t * (a.role === 'child' ? 9 : 4.5) + a.phase) * 0.34
      a.legs[0].rotation.x = stride
      a.legs[1].rotation.x = -stride
    }
    for (const cloud of this.clouds) {
      cloud.root.position.x = cloud.x + Math.sin(t * 0.013 + cloud.phase) * 18
    }
    for (const s of this.sway) {
      s.node.rotation.z = Math.sin(t * 0.7 + s.phase) * 0.04
      s.node.rotation.x = Math.cos(t * 0.5 + s.phase) * 0.022
    }
    for (const d of this.dogs) {
      const u = t * 0.35 + d.phase
      d.root.position.x = d.origin.x + Math.sin(u) * 3.1
      d.root.position.z = d.origin.z + Math.cos(u) * 3.1
      d.root.rotation.y = u + Math.PI / 2
      d.tail.rotation.z = Math.sin(t * 7 + d.phase) * 0.6
    }
    for (const c of this.cats) {
      const u = t * 0.18 + c.phase
      c.root.position.x = c.origin.x + Math.sin(u) * 1.8
      c.root.position.z = c.origin.z + Math.cos(u) * 1.8
      c.root.rotation.y = u
      c.tail.rotation.z = Math.sin(t * 2.6 + c.phase) * 0.2
    }
    for (const b of this.birds) {
      const u = t * 0.24 + b.phase
      b.root.position.set(
        b.cx + Math.cos(u) * b.rad,
        17 + Math.sin(t * 1.2 + b.phase) * 1.9,
        b.cz + Math.sin(u) * b.rad
      )
      b.root.rotation.y = -u + 0.6
      b.left.rotation.z = Math.sin(t * 9 + b.phase) * 0.42
      b.right.rotation.z = -Math.sin(t * 9 + b.phase) * 0.42
    }
  }

  setWeather (kind) {
    const tone =
      kind === 'storm'
        ? 0x8f9fa8
        : kind === 'rain'
        ? 0xaebbc0
        : kind === 'snow'
        ? 0xf4f6f8
        : 0xf1f2ef
    this.cloudMaterial.color.setHex(tone)
  }

  setTimeOfDay (hours, nightStrength) {
    P.window.emissiveIntensity = nightStrength * 1.08
    const visible = hours >= 5.5 && hours < 19
    for (const a of [...this.dogs, ...this.cats, ...this.birds])
      a.root.visible = visible
    for (const lamp of this.streetLights)
      lamp.material.emissiveIntensity = nightStrength * 2.6

    const palaceOn = nightStrength > 0.25
    for (const item of this.palaceLights) {
      if (item.globe) {
        item.globe.material.emissiveIntensity = palaceOn
          ? nightStrength * 3.2
          : 0
      }
      if (item.light) {
        item.light.intensity = palaceOn ? nightStrength * 48 : 0
      }
    }
  }

  getCollisionBoxes (inside = false) {
    return inside
      ? this.interiorBoxes
      : this.obstacles.concat(
          this.houseCollision ? [this.houseCollision] : [],
          this.liveCollisionBoxes || []
        )
  }

  getNearDoor (pos, inside = false) {
    if (inside)
      return this.interiorFloor === 0 && Math.hypot(pos.x, pos.z - 4.8) < 3.3
        ? { name: 'Outside', kind: 'exit' }
        : null
    let chosen = null
    let d = 3.2
    for (const entry of this.doors) {
      const nd = Math.hypot(pos.x - entry.x, pos.z - entry.z)
      if (nd < d) {
        chosen = entry
        d = nd
      }
    }
    return chosen
  }

  waterBlocked (x, z) {
    return x < RIVER.maxX + 2 || moatBlocks(x, z)
  }

  landingPadAt (x, z) {
    return padAt(x, z)
  }

  groundHeightAt (x, z, currentY = 0) {
    if (this.watchtower) {
      const wt = this.watchtower
      const dist = Math.hypot(x - wt.x, z - wt.z)
      if (dist >= wt.coreRadius - 0.3 && dist <= wt.outerRadius + 0.3) {
        const rawAngle = Math.atan2(z - wt.z, x - wt.x)
        const norm = (rawAngle + Math.PI * 2) % (Math.PI * 2)
        let bestY = 0
        let bestDiff = Infinity
        for (let turn = 0; turn < 3; turn++) {
          const totalAngle = norm + turn * Math.PI * 2
          if (totalAngle > Math.PI * 4.55) continue
          const candidateY = 0.4 + (totalAngle / (Math.PI * 4.5)) * 20.4
          const diff = Math.abs(candidateY - currentY)
          if (diff < 2.2 && diff < bestDiff) {
            bestDiff = diff
            bestY = candidateY
          }
        }
        if (bestDiff < 2.2) return bestY
      }
      if (dist <= wt.outerRadius && currentY >= wt.topY - 1.5) return wt.topY
    }
    const pad = padAt(x, z, -0.7)
    return pad && currentY > pad.y - 1.5 ? pad.y + 0.34 : 0
  }
}
