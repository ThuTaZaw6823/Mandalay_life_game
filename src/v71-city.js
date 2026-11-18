/** Mandalay Life V7.1: residential walls, denser neighborhoods, outer rice fields. */
import * as THREE from 'three'
import { piece, group } from './visual.js'
import { PALACE, ROOFTOPS, inPalaceSquare } from './v5layout.js'

const chanceAt = (x, z) => {
  let seed = (Math.imul(x | 0, 73856093) ^ Math.imul(z | 0, 19349663) ^ 0x5c17) >>> 0
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

// Visually enclosed houses. The front fence has a walk-in entrance.
export function decorateResidence (root, width, depth) {
  const hx = width / 2 + 1.55
  const hz = depth / 2 + 1.8
  const wall = 0xd5c4a3
  const pillar = 0xb3a28c
  const height = 1.42
  const gateHalf = 2.6
  const len = Math.max(0.3, hx - gateHalf)
  for (const side of [-1, 1]) {
    piece(root, 'box', wall, [side * hx, height / 2, 0], [0.3, height, 2 * hz])
    piece(root, 'box', wall, [side * (gateHalf + len / 2), height / 2, hz],
      [len, height, 0.3])
    piece(root, 'box', pillar, [side * gateHalf, 0.87, hz], [0.47, 1.74, 0.47])
    piece(root, 'box', pillar, [side * hx, 0.87, hz], [0.49, 1.74, 0.49])
  }
  piece(root, 'box', wall, [0, height / 2, -hz], [2 * hx, height, 0.3])
}

const clearLot = (world, x, z, w, d) =>
  !world.obstacles.some(o =>
    x + w / 2 + 2 > o.minX && x - w / 2 - 2 < o.maxX &&
    z + d / 2 + 2 > o.minZ && z - d / 2 - 2 < o.maxZ
  )

export function populateEmptyBlocks (world, roadsX, roadsZ) {
  const xs = roadsX.slice(0, -1).map(x => x + 33)
  const zs = roadsZ.slice(0, -1).map(z => z + 33)
  let added = 0
  for (const x of xs) {
    for (const z of zs) {
      if (Math.abs(x) > 605 || z < -555 || z > 675) continue
      if (inPalaceSquare(x, z, 42)) continue
      if (x > 260 && x < 655 && z > -635 && z < 235) continue
      if (ROOFTOPS.some(p => Math.hypot(x - p.x, z - p.z) < 47)) continue
      if (Math.hypot(x - world.plot.x, z - world.plot.z) < 35) continue
      if (Math.hypot(x - world.depot.x, z - world.depot.z) < 30) continue
      if (Math.hypot(x - world.plaza.x, z - world.plaza.z) < 35) continue
      if (world.destinations.some(p => Math.hypot(x - p.x, z - p.z) < 23)) continue
      const rand = chanceAt(x, z)
      if (rand() < 0.35) continue
      const bx = x + (rand() - 0.5) * 12
      const bz = z + (rand() - 0.5) * 12
      const width = 12 + rand() * 5
      const depth = 12 + rand() * 5
      if (!clearLot(world, bx, bz, width, depth)) continue
      const business = Math.abs(x) < 490 && z > 155 && z < 600
      const tower = business && rand() > 0.70
      const suburb = Math.abs(x) > 355 || Math.abs(z) > 495
      const height = tower ? 38 + Math.floor(rand() * 7) * 4.2
        : suburb ? 6.6 + rand() * 1.1 : 11 + Math.floor(rand() * 7) * 3.2
      world.building(bx, bz, width, depth, height, Math.floor(rand() * 6))
      if (rand() > 0.67) world.makeTree(x + 20, z - 19, 0.68)
      if (++added >= 125) return
    }
  }
}

export function addFarmland (world) {
  const fields = group(world.city)
  const colors = [0x8fa956, 0x6e9846, 0xabc16e, 0x89ab60, 0xb5a669]
  const fieldList = []
  // East of the last city street: large cultivated bands, not new roads.
  for (let x = 984; x <= 1215; x += 112)
    for (let z = -1160; z <= 895; z += 160)
      fieldList.push({ x, z, w: 103, d: 148 })
  // South of the main city: additional open farmland.
  for (let x = -750; x <= 865; x += 116)
    for (let z = 1054; z <= 1182; z += 122)
      fieldList.push({ x, z, w: 106, d: 110 })

  const cropSegments = []
  for (let i = 0; i < fieldList.length; i++) {
    const f = fieldList[i]
    piece(fields, 'box', colors[i % colors.length],
      [f.x, 0.055, f.z], [f.w, 0.105, f.d])
    // Raised irrigation banks between adjacent plots.
    piece(fields, 'box', 0x746a48,
      [f.x - f.w / 2, 0.13, f.z], [0.65, 0.19, f.d])
    const rows = 8
    for (let k = 0; k < rows; k++) {
      const xx = f.x - f.w / 2 + (k + 0.5) * f.w / rows
      cropSegments.push([xx, 0.18, f.z, 2.25, 0.19, f.d - 7])
    }
  }
  if (cropSegments.length) {
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4d813e, roughness: 0.95 }),
      cropSegments.length
    )
    const matrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    for (let i = 0; i < cropSegments.length; i++) {
      const [x, y, z, w, h, d] = cropSegments[i]
      matrix.compose(new THREE.Vector3(x, y, z), rotation, new THREE.Vector3(w, h, d))
      inst.setMatrixAt(i, matrix)
    }
    inst.instanceMatrix.needsUpdate = true
    inst.receiveShadow = true
    fields.add(inst)
  }
}
