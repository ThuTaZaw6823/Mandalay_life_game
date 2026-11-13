import * as THREE from 'three'

export const C = {
  cream: 0xe8ddbc,
  ivory: 0xfff4d3,
  sand: 0xc9b18a,
  road: 0x435662,
  sidewalk: 0xd4c9ae,
  brick: 0xb96957,
  brick2: 0xdda179,
  wood: 0x795844,
  dark: 0x273c42,
  grass: 0x80a86d,
  green: 0x538d66,
  leaf: 0x619568,
  leaf2: 0x8db77b,
  water: 0x4897b5,
  blue: 0x5c91b7,
  teal: 0x317d82,
  gold: 0xe7b353,
  orange: 0xe0a064,
  red: 0xcd6f63,
  white: 0xf5f2e8,
  window: 0x8fb6c0
}

const materialCache = new Map()
export function mat (color, extra = {}) {
  if (!Object.keys(extra).length) {
    if (!materialCache.has(color)) {
      materialCache.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.82,
          metalness: 0.04
        })
      )
    }
    return materialCache.get(color)
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.04,
    ...extra
  })
}

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  torus: new THREE.TorusGeometry(0.5, 0.13, 8, 20)
}

export function piece (parent, shape, color, position, scale, opts = {}) {
  const mesh = new THREE.Mesh(
    geo[shape] || geo.box,
    typeof color === 'number' ? mat(color) : color
  )
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.castShadow = !!opts.cast
  mesh.receiveShadow = opts.receive !== false
  if (opts.rot) mesh.rotation.set(...opts.rot)
  parent.add(mesh)
  return mesh
}

export function group (parent, x = 0, y = 0, z = 0) {
  const obj = new THREE.Group()
  obj.position.set(x, y, z)
  parent.add(obj)
  return obj
}

export function labelTexture (text, bg = '#253b45', fg = '#fff2d3') {
  const cvs = document.createElement('canvas')
  cvs.width = 512
  cvs.height = 128
  const ctx = cvs.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = fg + '55'
  ctx.lineWidth = 6
  ctx.strokeRect(6, 6, 500, 116)
  ctx.fillStyle = fg
  ctx.font = 'bold 48px Arial,sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 66, 476)
  const tex = new THREE.CanvasTexture(cvs)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function sign (parent, text, position, dimensions = [5, 1.2], colors) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(...dimensions),
    new THREE.MeshBasicMaterial({
      map: labelTexture(text, ...(colors || [])),
      transparent: false,
      side: THREE.DoubleSide
    })
  )
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

export function wheel (parent, pos, rad = 0.52, width = 0.24) {
  const g = group(parent, ...pos)
  const tire = piece(
    g,
    'cylinder',
    0x252a2d,
    [0, 0, 0],
    [rad * 2, width, rad * 2],
    { cast: true }
  )
  tire.rotation.z = Math.PI / 2
  const hub = piece(
    g,
    'cylinder',
    0xc5d2cd,
    [0, 0, 0],
    [rad * 0.9, width * 1.08, rad * 0.9]
  )
  hub.rotation.z = Math.PI / 2
  // Spoke bar so wheel spin is clearly visible even on fallback meshes
  const spoke = piece(
    g,
    'box',
    0x3b484d,
    [0, 0, 0],
    [width * 1.12, rad * 1.4, rad * 0.22]
  )
  return g
}
