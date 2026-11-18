/**
 * Mandalay Life V7.2 - procedural city graphics.
 * Only decorative meshes and optional infill buildings: no player, wallet,
 * mission, vehicle, save, HUD or keyboard logic is changed.
 */
import * as THREE from 'three'
import { piece, group, mat } from './visual.js'
import { inPalaceSquare, ROOFTOPS } from './v5layout.js'

const CROWN_GEOMETRY = new THREE.IcosahedronGeometry(1, 1)
const BLOCK_GEOMETRY = new THREE.BoxGeometry(1, 1, 1)
const THIN = new THREE.Quaternion()
const colorGrass = [0x86a76e, 0x9ab580, 0x759c66, 0x9eaf75]
const farmTones = [0x93af60, 0x7c9f4f, 0xb5c67b, 0x91aa61, 0x9ba663]

function rnd (seed) {
  let n = seed >>> 0
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0
    return n / 4294967296
  }
}

function mobileMode () {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)')?.matches === true
}

function addInstances (root, boxes, material, shadows = false) {
  if (!boxes.length) return null
  const mesh = new THREE.InstancedMesh(BLOCK_GEOMETRY, material, boxes.length)
  const transform = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  for (let i = 0; i < boxes.length; i++) {
    const [x, y, z, w, h, d] = boxes[i]
    transform.compose(position.set(x, y, z), THIN, scale.set(w, h, d))
    mesh.setMatrixAt(i, transform)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = shadows
  mesh.receiveShadow = true
  root.add(mesh)
  return mesh
}

// Many foliage lobes drawn in a SINGLE batch per tree, not 7 unique meshes.
export function upgradeTreeCrown (crown, size, fruit = false, variation = 0) {
  const lobes = [
    [0, 0.5, 0, 2.15, 1.7, 2.05],
    [-1.55, 0.08, 0.25, 1.65, 1.4, 1.5],
    [1.55, 0.03, -0.3, 1.65, 1.45, 1.6],
    [0.15, 1.48, 0.1, 1.55, 1.5, 1.55],
    [0.0, 0.3, 1.5, 1.5, 1.3, 1.65],
    [-0.25, 0.18, -1.5, 1.45, 1.3, 1.45],
    [0.8, 1.13, 0.96, 1.35, 1.2, 1.2]
  ]
  const mesh = new THREE.InstancedMesh(CROWN_GEOMETRY, mat(0xffffff), lobes.length)
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  const shade = [0x609a61, 0x83ad74, 0x76a86b, 0x91b778]
  const fruitShade = [0x6b9860, 0x89a96b, 0x729e58, 0x91ab70]
  for (let i = 0; i < lobes.length; i++) {
    const [x, y, z, sx, sy, sz] = lobes[i]
    matrix.compose(position.set(x * size, y * size, z * size), THIN,
      scale.set(sx * size, sy * size, sz * size))
    mesh.setMatrixAt(i, matrix)
    mesh.setColorAt(i, new THREE.Color((fruit ? fruitShade : shade)[(i + variation) % 4]))
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  crown.add(mesh)
}

// Open front gate is deliberately aligned to the existing enterable door.
// Fences are visual-only to preserve the game's existing collision/door system.
export function addHouseFence (root, width, depth) {
  const halfX = width / 2 + 1.6
  const halfZ = depth / 2 + 1.85
  const gate = 2.7
  const height = 1.35
  const wall = mat(0xd6c6aa)
  const cap = mat(0xbca58a)
  const halfSide = (halfX - gate) / 2
  for (const dir of [-1, 1]) {
    piece(root, 'box', wall, [dir * halfX, height / 2, 0], [0.27, height, halfZ * 2])
    piece(root, 'box', wall,
      [dir * (gate + halfSide), height / 2, halfZ],
      [halfX - gate, height, 0.27])
    piece(root, 'box', cap, [dir * gate, 0.88, halfZ], [0.43, 1.76, 0.43])
    piece(root, 'box', cap, [dir * halfX, 0.88, halfZ], [0.43, 1.76, 0.43])
  }
  piece(root, 'box', wall, [0, height / 2, -halfZ], [halfX * 2, height, 0.27])
}

// Small rooftop features and facade accents; skip helicopter landing sites.
export function upgradeBuildingTrim (root, w, d, h, style, isHelipad = false) {
  if (h < 15) return
  const material = [0xb9b6a6, 0x7e968d, 0xc4ad90, 0x8b9fa2][style % 4]
  piece(root, 'box', material, [0, h - 1.25, d / 2 + 0.08], [w + 0.25, 0.24, 0.24])
  piece(root, 'box', material, [0, h - 1.25, -d / 2 - 0.08], [w + 0.25, 0.24, 0.24])
  if (isHelipad) return
  if (h > 22) {
    piece(root, 'box', 0x6f8081, [-w * 0.28, h + 1.05, -d * 0.22],
      [Math.min(w * 0.35, 5), 2.1, Math.min(d * 0.29, 4)])
    piece(root, 'box', 0x52768b, [w * 0.19, h + 0.25, -d * 0.18],
      [Math.min(w * 0.35, 5), 0.25, Math.min(d * 0.34, 5)])
    if (style % 3 === 0)
      piece(root, 'cylinder', 0x667b81, [w * 0.28, h + 2.25, d * 0.3],
        [0.12, 4.5, 0.12])
  }
}

function isAirport (x, z, pad = 0) {
  return x > 255 - pad && x < 632 + pad && z > -655 - pad && z < 255 + pad
}

function available (world, x, z, w, d, padding = 2.5) {
  if (isAirport(x, z, padding) || inPalaceSquare(x, z, padding + 25)) return false
  if (ROOFTOPS.some(p => Math.hypot(x - p.x, z - p.z) < 48)) return false
  if (Math.hypot(x - world.plot.x, z - world.plot.z) < 41) return false
  if (Math.hypot(x - world.depot.x, z - world.depot.z) < 32) return false
  if (Math.hypot(x - world.plaza.x, z - world.plaza.z) < 44) return false
  if (world.destinations.some(p => Math.hypot(x - p.x, z - p.z) < 24)) return false
  return !world.obstacles.some(b =>
    x + w / 2 + padding > b.minX && x - w / 2 - padding < b.maxX &&
    z + d / 2 + padding > b.minZ && z - d / 2 - padding < b.maxZ)
}

// Designed for the existing 66-unit grid: no mesh crosses a road or sidewalk.
export function upgradeCityGraphics (world, roadsX, roadsZ) {
  const rng = rnd(0x707207)
  const root = group(world.city)
  const blocks = [[], [], [], []]
  const turf = [[], [], []]
  const centersX = roadsX.slice(0, -1).map(x => x + 33)
  const centersZ = roadsZ.slice(0, -1).map(z => z + 33)
  for (const x of centersX) {
    for (const z of centersZ) {
      if (x < -850 || x > 915 || z < -965 || z > 970) continue
      if (isAirport(x, z, 34) || inPalaceSquare(x, z, 33)) continue
      const q = rng()
      // Subtle variation in grass/surface is BELOW houses and ABOVE plain terrain.
      if (q > 0.17) blocks[Math.floor(rng() * 4)].push([x, 0.012, z, 41, 0.02, 41])
      if (rng() > 0.50 && Math.abs(x) < 820 && Math.abs(z) < 800) {
        for (let j = 0; j < 3; j++) {
          const bx = x + (rng() - 0.5) * 36
          const bz = z + (rng() - 0.5) * 36
          turf[j].push([bx, 0.04, bz, 1.7, 0.1, 1.2])
        }
      }
    }
  }
  for (let i = 0; i < blocks.length; i++)
    addInstances(root, blocks[i], mat(colorGrass[i]))
  for (let i = 0; i < turf.length; i++)
    addInstances(root, turf[i], mat([0x658d55, 0x80a95e, 0xb0bc77][i]))

  // Add COLLIDABLE buildings through the game's original world.building method:
  // their doors, indoor interaction, and roof/collision data keep working.
  const limit = mobileMode() ? 36 : 88
  let created = 0
  for (const x of centersX) {
    for (const z of centersZ) {
      if (created >= limit) break
      if (x < -685 || x > 720 || z < -580 || z > 735) continue
      if (rng() < 0.57) continue
      const w = 12.5 + rng() * 3.9
      const d = 12.5 + rng() * 3.9
      const bx = x + (rng() - 0.5) * 12
      const bz = z + (rng() - 0.5) * 12
      if (!available(world, bx, bz, w, d)) continue
      const cityCenter = Math.abs(bx) < 335 && bz > 100 && bz < 520
      const highrise = cityCenter && rng() > 0.62
      const suburban = Math.abs(bx) > 440 || Math.abs(bz) > 530
      const h = highrise ? 29 + Math.floor(rng() * 6) * 6
        : suburban ? 6.3 + rng() * 1.5
          : 10 + Math.floor(rng() * 6) * 3.5
      world.building(bx, bz, w, d, h, Math.floor(rng() * 6))
      created++
      if (rng() > 0.62 && available(world, x + 20, z + 19, 1.8, 1.8, 0.1))
        world.makeTree(x + 20, z + 19, 0.75 + rng() * 0.32)
    }
  }
}

// Broad rice fields beyond the original city road grid, with irrigation channels.
export function upgradeFarmland (world, alreadyHasV71 = false) {
  const root = group(world.city)
  const rng = rnd(0xfaa77)
  const paddy = [[], [], [], [], []]
  const water = []
  const rice = [[], [], []]
  const banks = []
  const plots = []
  for (let x = 984; x <= 1215; x += 112)
    for (let z = -1160; z <= 895; z += 160) plots.push([x, z, 103, 148])
  for (let x = -750; x <= 865; x += 116)
    for (let z = 1054; z <= 1182; z += 122) plots.push([x, z, 106, 110])

  for (const [x, z, w, d] of plots) {
    if (!alreadyHasV71) {
      paddy[Math.floor(rng() * 5)].push([x, 0.055, z, w, 0.11, d])
      banks.push([x - w / 2, 0.13, z, 0.75, 0.18, d])
    }
    // Thin strips create a planted texture without thousands of geometry objects.
    for (let j = 0; j < 10; j++) {
      const xx = x - w / 2 + (j + 0.5) * w / 10
      rice[j % 3].push([xx, alreadyHasV71 ? 0.34 : 0.23,
        z, 1.5 + rng() * 0.7, 0.12, d - 9])
    }
    water.push([x + w / 2 + 1.5, 0.07, z, 1.65, 0.035, d - 1])
  }
  for (let i = 0; i < paddy.length; i++) addInstances(root, paddy[i], mat(farmTones[i]))
  addInstances(root, banks, mat(0x786c4b))
  addInstances(root, water, mat(0x73b1b6, { roughness: 0.24, metalness: 0.06 }))
  const riceColors = [0x427d3b, 0x57914a, 0x7ba854]
  for (let i = 0; i < 3; i++) addInstances(root, rice[i], mat(riceColors[i]))
}
