/**
 * Mandalay Life V11 — GTA-Style 3D City & Night Neon Remaster.
 * Adds downtown glass skyscrapers with night-lit window grids and rooftop beacons,
 * glowing neon billboards, overhead avenue gantries, covered bus stops,
 * double-yellow avenue lines, sidewalk street furniture, and wet-road rain reflections.
 *
 * Install AFTER installV92Environment(World) and BEFORE installV102AirportProtection(World).
 */
import * as THREE from 'three'
import { ROADS_X, ROADS_Z } from './world.js'
import { ROOFTOPS, inPalaceSquare } from './v5layout.js'

const AIRPORT_BOX = { minX: 255, maxX: 635, minZ: -655, maxZ: 255 }

const BOX_GEO = new THREE.BoxGeometry(1, 1, 1)
const CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
const SPHERE_GEO = new THREE.SphereGeometry(0.5, 10, 8)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const TMP_MAT = new THREE.Matrix4()
const TMP_POS = new THREE.Vector3()
const TMP_QUAT = new THREE.Quaternion()
const TMP_SCALE = new THREE.Vector3()

function seeded (seed = 0x563131) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function inAirport (x, z, pad = 0) {
  return (
    x > AIRPORT_BOX.minX - pad &&
    x < AIRPORT_BOX.maxX + pad &&
    z > AIRPORT_BOX.minZ - pad &&
    z < AIRPORT_BOX.maxZ + pad
  )
}

function lotClearOfRoads (x, z, w, d, margin = 12) {
  const ex = w / 2 + margin
  const ez = d / 2 + margin
  if (ROADS_X.some(rx => Math.abs(x - rx) < ex)) return false
  if (ROADS_Z.some(rz => Math.abs(z - rz) < ez)) return false
  return true
}

function nearProtectedPoints (world, x, z, pad = 0) {
  if (inAirport(x, z, pad) || inPalaceSquare(x, z, pad + 20)) return true
  if (ROOFTOPS.some(p => Math.hypot(x - p.x, z - p.z) < 48 + pad)) return true
  if (Math.hypot(x - world.plot.x, z - world.plot.z) < 38 + pad) return true
  if (Math.hypot(x - world.depot.x, z - world.depot.z) < 32 + pad) return true
  if (Math.hypot(x - world.plaza.x, z - world.plaza.z) < 42 + pad) return true
  if (world.destinations.some(p => Math.hypot(x - p.x, z - p.z) < 22 + pad)) return true
  if (world.doors?.some(d => Math.hypot(x - d.x, z - d.z) < 12 + pad)) return true
  return false
}

function protectSpawn (x, z, w, d) {
  const spots = [{ x: 0, z: 16 }]
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('mandalay-life-v7-progress') || '{}')
      const p = saved?.player
      if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) spots.push(p)
    }
  } catch {}
  return spots.some(
    p => Math.abs(x - p.x) < w / 2 + 12 && Math.abs(z - p.z) < d / 2 + 12
  )
}

function boxesClear (world, x, z, w, d, pad = 3) {
  return !world.obstacles.some(
    o =>
      x + w / 2 + pad > o.minX &&
      x - w / 2 - pad < o.maxX &&
      z + d / 2 + pad > o.minZ &&
      z - d / 2 - pad < o.maxZ
  )
}

function createFacadeTextures (palette) {
  if (typeof document === 'undefined') {
    return {
      map: null,
      emissiveMap: null
    }
  }
  const size = 256
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = size
  colorCanvas.height = size
  const cctx = colorCanvas.getContext('2d')

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = size
  glowCanvas.height = size
  const gctx = glowCanvas.getContext('2d')

  cctx.fillStyle = palette.frame
  cctx.fillRect(0, 0, size, size)
  gctx.fillStyle = '#000000'
  gctx.fillRect(0, 0, size, size)

  const cols = 8
  const rows = 12
  const cw = size / cols
  const rh = size / rows
  const rng = seeded(palette.seed)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 3
      const y = r * rh + 3
      const w = cw - 6
      const h = rh - 6
      const lit = rng() > 0.34
      cctx.fillStyle = lit ? palette.glassLit : palette.glassDark
      cctx.fillRect(x, y, w, h)

      // Vertical window highlight sheen
      cctx.fillStyle = 'rgba(255,255,255,0.12)'
      cctx.fillRect(x + 2, y + 2, 4, h - 4)

      if (lit) {
        gctx.fillStyle = rng() > 0.7 ? palette.glowAlt : palette.glowMain
        gctx.fillRect(x + 1, y + 1, w - 2, h - 2)
      }
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping

  const emissiveMap = new THREE.CanvasTexture(glowCanvas)
  emissiveMap.colorSpace = THREE.SRGBColorSpace
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping

  return { map, emissiveMap }
}

function createSignTexture (title, subtitle, accentHex, bgTop, bgBot) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 512, 192)
  grad.addColorStop(0, bgTop)
  grad.addColorStop(1, bgBot)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 192)

  // Subtle scanline / grid aesthetic
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let y = 0; y < 192; y += 12) ctx.fillRect(0, y, 512, 2)

  // Glowing frame
  ctx.strokeStyle = accentHex
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 492, 172)

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 36px system-ui, Arial, sans-serif'
  ctx.fillText(title, 256, 76, 460)

  ctx.fillStyle = accentHex
  ctx.font = '800 22px system-ui, Arial, sans-serif'
  ctx.fillText(subtitle, 256, 128, 460)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createGantryTexture (topText, bottomText) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f4c3a'
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = '#e8f5ee'
  ctx.lineWidth = 6
  ctx.strokeRect(8, 8, 496, 112)

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '800 28px system-ui, Arial, sans-serif'
  ctx.fillText(topText, 256, 45, 470)

  ctx.fillStyle = '#ffd166'
  ctx.font = '800 24px system-ui, Arial, sans-serif'
  ctx.fillText(bottomText, 256, 89, 470)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function addMesh (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, cast = false) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = cast
  m.receiveShadow = true
  parent.add(m)
  return m
}

function createGtaSkyscrapers (world, state) {
  const root = new THREE.Group()
  root.name = 'V11_GTA_SKYSCRAPERS'
  world.city.add(root)

  const palettes = [
    {
      name: 'Mandalay Skyline Plaza',
      frame: '#1d2936',
      glassLit: '#79b8cf',
      glassDark: '#233b4d',
      glowMain: '#ffe7ad',
      glowAlt: '#80e5ff',
      neon: 0x00f0ff,
      seed: 101
    },
    {
      name: 'Royal Apex Tower',
      frame: '#23202b',
      glassLit: '#8aa4c8',
      glassDark: '#2a2e42',
      glowMain: '#ffd48a',
      glowAlt: '#ff8cc8',
      neon: 0xff2a85,
      seed: 202
    },
    {
      name: 'Golden Gate Exchange',
      frame: '#222b29',
      glassLit: '#86c5b8',
      glassDark: '#243c39',
      glowMain: '#ffe099',
      glowAlt: '#9fffe0',
      neon: 0xffb800,
      seed: 303
    },
    {
      name: 'Irrawaddy Finance Center',
      frame: '#1c2432',
      glassLit: '#83b7df',
      glassDark: '#1f324a',
      glowMain: '#d9f2ff',
      glowAlt: '#ffe3a8',
      neon: 0x38bdf8,
      seed: 404
    }
  ]

  const facadeMaterials = palettes.map(p => {
    const { map, emissiveMap } = createFacadeTextures(p)
    if (map) {
      map.repeat.set(2, 4)
      emissiveMap.repeat.set(2, 4)
    }
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      emissive: new THREE.Color(0xffffff),
      emissiveMap,
      emissiveIntensity: 0.05,
      roughness: 0.18,
      metalness: 0.58
    })
    state.windowMaterials.push(mat)
    return mat
  })

  const steelDark = new THREE.MeshStandardMaterial({ color: 0x202730, roughness: 0.5, metalness: 0.55 })
  const steelTrim = new THREE.MeshStandardMaterial({ color: 0x6c7c8c, roughness: 0.35, metalness: 0.65 })
  const lobbyGlow = new THREE.MeshStandardMaterial({
    color: 0x9fd3e0,
    emissive: 0xffd794,
    emissiveIntensity: 0.25,
    roughness: 0.2,
    metalness: 0.4
  })
  state.windowMaterials.push(lobbyGlow)

  const neonMats = palettes.map(p => {
    const m = new THREE.MeshStandardMaterial({
      color: p.neon,
      emissive: p.neon,
      emissiveIntensity: 0.45,
      roughness: 0.25
    })
    state.neonMaterials.push(m)
    return m
  })

  // Candidate blocks in downtown/midtown rings around the central core
  const rng = seeded(0x711001)
  const xx = ROADS_X.slice(0, -1).map(x => x + 33)
  const zz = ROADS_Z.slice(0, -1).map(z => z + 33)
  const candidates = []
  for (const x of xx) {
    for (const z of zz) {
      if (Math.abs(x) > 650 || z < -550 || z > 700) continue
      const ringDist = Math.hypot(x - 15, z - 120)
      if (ringDist < 90) continue
      candidates.push({ x, z, score: Math.abs(ringDist - 280) + rng() * 80 })
    }
  }
  candidates.sort((a, b) => a.score - b.score)

  const placed = []
  const maxTowers = state.mobile ? 8 : 13
  const subOffsets = [
    [0, 0], [-11, -11], [11, 11], [-11, 11], [11, -11],
    [0, 11], [0, -11], [11, 0], [-11, 0]
  ]

  for (const cand of candidates) {
    if (placed.length >= maxTowers) break
    for (const [ox, oz] of subOffsets) {
      const tx = cand.x + ox
      const tz = cand.z + oz
      const w = 15 + Math.floor(rng() * 4)
      const d = 15 + Math.floor(rng() * 4)
      if (placed.some(p => Math.hypot(p.x - tx, p.z - tz) < 70)) continue
      if (nearProtectedPoints(world, tx, tz, w / 2 + 6)) continue
      if (!lotClearOfRoads(tx, tz, w, d, 10)) continue
      if (protectSpawn(tx, tz, w, d)) continue
      if (!boxesClear(world, tx, tz, w, d, 2.2)) continue

      const idx = placed.length % palettes.length
      const spec = palettes[idx]
      const h = 44 + Math.floor(rng() * 7) * 4.5
      const podiumH = 5.4
      const upperH = h * 0.24
      const midH = h - podiumH - upperH

      const g = new THREE.Group()
      g.position.set(tx, 0, tz)
      root.add(g)

      // Podium & illuminated commercial lobby
      addMesh(g, BOX_GEO, steelDark, 0, podiumH / 2, 0, w + 1.2, podiumH, d + 1.2, true)
      addMesh(g, BOX_GEO, lobbyGlow, 0, podiumH * 0.45, d / 2 + 0.65, w * 0.78, podiumH * 0.65, 0.2)
      addMesh(g, BOX_GEO, lobbyGlow, 0, podiumH * 0.45, -d / 2 - 0.65, w * 0.78, podiumH * 0.65, 0.2)
      addMesh(g, BOX_GEO, steelTrim, 0, 3.4, d / 2 + 1.35, 6.4, 0.32, 1.8)
      addMesh(g, BOX_GEO, steelDark, 0, 1.55, d / 2 + 0.72, 2.8, 3.1, 0.22)

      // Main glass curtain-wall shaft
      addMesh(g, BOX_GEO, facadeMaterials[idx], 0, podiumH + midH / 2, 0, w, midH, d, true)

      // Setback upper tier
      const uw = w * 0.78
      const ud = d * 0.78
      addMesh(g, BOX_GEO, steelTrim, 0, podiumH + midH + 0.3, 0, w + 0.5, 0.6, d + 0.5)
      addMesh(g, BOX_GEO, facadeMaterials[idx], 0, podiumH + midH + upperH / 2, 0, uw, upperH, ud, true)

      // Vertical GTA neon accent strips on tower corners
      const neonMat = neonMats[idx]
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addMesh(
            g,
            BOX_GEO,
            neonMat,
            sx * (w / 2 + 0.08),
            podiumH + midH / 2,
            sz * (d / 2 + 0.08),
            0.26,
            midH,
            0.26
          )
        }
      }
      // Crown neon halo ring
      addMesh(g, BOX_GEO, neonMat, 0, h - 0.3, ud / 2 + 0.14, uw + 0.2, 0.42, 0.18)
      addMesh(g, BOX_GEO, neonMat, 0, h - 0.3, -ud / 2 - 0.14, uw + 0.2, 0.42, 0.18)
      addMesh(g, BOX_GEO, neonMat, uw / 2 + 0.14, h - 0.3, 0, 0.18, 0.42, ud + 0.2)
      addMesh(g, BOX_GEO, neonMat, -uw / 2 - 0.14, h - 0.3, 0, 0.18, 0.42, ud + 0.2)

      // Rooftop mechanical penthouse + spire + aviation warning beacon
      addMesh(g, BOX_GEO, steelDark, 0, h + 1.3, 0, uw * 0.5, 2.6, ud * 0.5)
      addMesh(g, CYL_GEO, steelTrim, 0, h + 5.6, 0, 0.36, 6.2, 0.36)
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false })
      const beacon = addMesh(g, SPHERE_GEO, beaconMat, 0, h + 8.9, 0, 0.72, 0.72, 0.72)
      state.beacons.push({ mesh: beacon, mat: beaconMat, phase: placed.length * 1.17 })

      world.addObstacle(tx, tz, w + 1.2, d + 1.2, 0.2, h + 4)
      world.doors.push({
        x: tx,
        z: tz + d / 2 + 1.6,
        name: spec.name,
        kind: 'building',
        floors: 6,
        mixed: true
      })
      placed.push({ x: tx, z: tz, w, d, h })
      break
    }
  }
  return placed.length
}

function createNeonBillboardsAndGantries (world, state) {
  const root = new THREE.Group()
  root.name = 'V11_NEON_BILLBOARDS_AND_GANTRIES'
  world.city.add(root)

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x26313b, roughness: 0.55, metalness: 0.5 })
  const billboardSpecs = [
    { title: 'MANDALAY AIRWAYS', sub: 'FLY THE NEW V10 JET FLEET', accent: '#00f0ff', nhex: 0x00f0ff, t: '#0f2238', b: '#134e6f' },
    { title: 'IRRAWADDY MOTORS', sub: 'V11 TURBO EDITION · TEST DRIVE', accent: '#ff3b8d', nhex: 0xff2a85, t: '#260d26', b: '#5c1444' },
    { title: 'ROYAL SKYLINE TOWER', sub: 'DOWNTOWN LUXURY PENTHOUSES', accent: '#ffd166', nhex: 0xffb800, t: '#261b0c', b: '#523815' },
    { title: 'ZAY CHO MEGA MALL', sub: 'OPEN 24H · NIGHT MARKET & TECH', accent: '#4ade80', nhex: 0x4ade80, t: '#0b291d', b: '#144d38' },
    { title: 'GOLDEN PALACE CLUB', sub: 'MANDALAY NIGHTLIFE DISTRICT', accent: '#ff8fab', nhex: 0xff4d8d, t: '#20102b', b: '#4c1854' },
    { title: 'MANDALAY DIGITAL', sub: 'CITY FIBER · 5G EVERYWHERE', accent: '#38bdf8', nhex: 0x38bdf8, t: '#0b1d33', b: '#163b63' }
  ]

  // 1. Rooftop neon billboards on existing mid-rise downtown buildings
  const roofCandidates = world.tallObstacles.filter(b => {
    const cx = (b.minX + b.maxX) / 2
    const cz = (b.minZ + b.maxZ) / 2
    const w = b.maxX - b.minX
    const d = b.maxZ - b.minZ
    return (
      b.height >= 14 &&
      b.height <= 30 &&
      w >= 10 &&
      d >= 10 &&
      Math.abs(cx) < 420 &&
      cz > -340 &&
      cz < 520 &&
      !inAirport(cx, cz, 12) &&
      !inPalaceSquare(cx, cz, 15) &&
      !ROOFTOPS.some(p => Math.hypot(cx - p.x, cz - p.z) < 35)
    )
  })

  const placedBillboards = []
  const maxRooftopBoards = state.mobile ? 5 : 8
  for (let i = 0; i < roofCandidates.length && placedBillboards.length < maxRooftopBoards; i += 3) {
    const b = roofCandidates[i]
    const cx = (b.minX + b.maxX) / 2
    const cz = (b.minZ + b.maxZ) / 2
    if (placedBillboards.some(p => Math.hypot(p.x - cx, p.z - cz) < 85)) continue

    const spec = billboardSpecs[placedBillboards.length % billboardSpecs.length]
    const tex = createSignTexture(spec.title, spec.sub, spec.accent, spec.t, spec.b)
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.25,
      roughness: 0.35
    })
    const frameMat = new THREE.MeshStandardMaterial({
      color: spec.nhex,
      emissive: spec.nhex,
      emissiveIntensity: 0.55,
      roughness: 0.2
    })
    state.billboardMaterials.push(faceMat)
    state.neonMaterials.push(frameMat)

    const bg = new THREE.Group()
    bg.position.set(cx, b.height - 0.9, cz)
    if (placedBillboards.length % 2 === 1) bg.rotation.y = Math.PI / 2
    root.add(bg)

    addMesh(bg, CYL_GEO, steelMat, -4.2, 2.1, 0, 0.28, 4.2, 0.28)
    addMesh(bg, CYL_GEO, steelMat, 4.2, 2.1, 0, 0.28, 4.2, 0.28)
    addMesh(bg, BOX_GEO, steelMat, 0, 4.4, 0, 12.6, 5.2, 0.4)
    addMesh(bg, BOX_GEO, frameMat, 0, 4.4, 0, 13.0, 5.6, 0.28)
    addMesh(bg, BOX_GEO, faceMat, 0, 4.4, 0.23, 12.1, 4.6, 0.06)
    addMesh(bg, BOX_GEO, faceMat, 0, 4.4, -0.23, 12.1, 4.6, 0.06)

    placedBillboards.push({ x: cx, z: cz })
  }

  // 2. High-clearance overhead avenue gantries across major roads
  const gantrySpecs = [
    { axis: 'z', x: -18, z: -207, top: '▲ ROYAL PALACE  •  NORTH CITY', bot: '← IRRAWADDY RIVER   |   AIRFIELD →' },
    { axis: 'z', x: -18, z: 57, top: '▲ ZAY CHO PLAZA  •  DOWNTOWN', bot: '← WEST MARKET   |   DELIVERY DEPOT →' },
    { axis: 'z', x: 246, z: -273, top: '▲ AIRPORT TERMINAL  •  A1–A5', bot: 'HELIPADS H1–H5   |   EXIT RIGHT →' },
    { axis: 'z', x: 246, z: 189, top: '▲ DOWNTOWN SKYLINE', bot: '← ZAY CHO   |   RUNWAY SOUTH →' },
    { axis: 'x', x: -117, z: 90, top: '← IRRAWADDY RIVERSIDE', bot: '▲ CITY CENTER   |   AIRPORT EAST →' },
    { axis: 'x', x: 147, z: -174, top: '← ROYAL PALACE  •  MOAT', bot: 'EAST EXPRESSWAY   •   AIRFIELD →' }
  ]

  for (const gs of gantrySpecs) {
    if (inAirport(gs.x, gs.z, 4) || inPalaceSquare(gs.x, gs.z, 10)) continue
    const gg = new THREE.Group()
    gg.position.set(gs.x, 0, gs.z)
    if (gs.axis === 'x') gg.rotation.y = Math.PI / 2
    root.add(gg)

    // Pillars stand on sidewalk edges (±10.1m), safely outside the 13m driving lanes
    for (const sx of [-10.1, 10.1]) {
      addMesh(gg, CYL_GEO, steelMat, sx, 4.4, 0, 0.42, 8.8, 0.42, true)
    }
    addMesh(gg, BOX_GEO, steelMat, 0, 8.5, 0, 20.6, 0.48, 0.56, true)

    const gTex = createGantryTexture(gs.top, gs.bot)
    const gMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gTex,
      emissive: 0xffffff,
      emissiveMap: gTex,
      emissiveIntensity: 0.16,
      roughness: 0.4
    })
    state.billboardMaterials.push(gMat)

    addMesh(gg, BOX_GEO, steelMat, 0, 8.6, 0, 11.4, 2.7, 0.34)
    addMesh(gg, BOX_GEO, gMat, 0, 8.6, 0.2, 11.0, 2.35, 0.06)
    addMesh(gg, BOX_GEO, gMat, 0, 8.6, -0.2, 11.0, 2.35, 0.06)
  }
}

function addInstancedPropBatch (parent, geo, mat, entries, cast = false) {
  if (!entries.length) return null
  const mesh = new THREE.InstancedMesh(geo, mat, entries.length)
  mesh.frustumCulled = false
  mesh.castShadow = cast
  mesh.receiveShadow = true
  for (let i = 0; i < entries.length; i++) {
    const [x, y, z, sx, sy, sz, rotY = 0] = entries[i]
    TMP_QUAT.setFromAxisAngle(Y_AXIS, rotY)
    TMP_POS.set(x, y, z)
    TMP_SCALE.set(sx, sy, sz)
    TMP_MAT.compose(TMP_POS, TMP_QUAT, TMP_SCALE)
    mesh.setMatrixAt(i, TMP_MAT)
  }
  mesh.instanceMatrix.needsUpdate = true
  parent.add(mesh)
  return mesh
}

function createStreetPropsAndMarkings (world, state) {
  const root = new THREE.Group()
  root.name = 'V11_STREET_PROPS_AND_MARKINGS'
  world.city.add(root)

  const mainX = ROADS_X.filter((x, i) => i % 4 === 0 && x > -490 && x < 610)
  const mainZ = ROADS_Z.filter((z, i) => i % 4 === 0 && z > -480 && z < 610)
  const nearRoad = (v, list) => list.some(p => Math.abs(v - p) < 14)

  const canPlaceSidewalkProp = (x, z, r = 1.2) => {
    if (inAirport(x, z, 2) || inPalaceSquare(x, z, 15)) return false
    if (Math.abs(x) > 820 || Math.abs(z) > 870) return false
    if (nearRoad(x, ROADS_X) && nearRoad(z, ROADS_Z)) return false
    if (world.doors?.some(d => Math.hypot(x - d.x, z - d.z) < 4.5)) return false
    return !world.obstacles.some(
      b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
    )
  }

  // 1. Double-yellow center lines on main avenues (clear of junctions, palace & airfield)
  const yellowLines = []
  const spanClear = (x1, z1, x2, z2) =>
    !inAirport(x1, z1, 6) &&
    !inAirport(x2, z2, 6) &&
    !inPalaceSquare(x1, z1, 8) &&
    !inPalaceSquare(x2, z2, 8)

  for (const x of mainX) {
    for (let i = 0; i < ROADS_Z.length - 1; i++) {
      const a = ROADS_Z[i]
      const b = ROADS_Z[i + 1]
      if (b - a !== 66) continue
      const midZ = (a + b) / 2
      if (!spanClear(x, a + 12, x, b - 12) || inAirport(x, midZ, 6) || inPalaceSquare(x, midZ, 8)) continue
      if (Math.abs(x) > 820 || Math.abs(midZ) > 880) continue
      for (const ox of [-0.26, 0.26]) {
        yellowLines.push([x + ox, 0.098, midZ, 0.18, 0.014, 39])
      }
    }
  }
  for (const z of mainZ) {
    for (let i = 0; i < ROADS_X.length - 1; i++) {
      const a = ROADS_X[i]
      const b = ROADS_X[i + 1]
      if (b - a !== 66) continue
      const midX = (a + b) / 2
      if (!spanClear(a + 12, z, b - 12, z) || inAirport(midX, z, 6) || inPalaceSquare(midX, z, 8)) continue
      if (Math.abs(midX) > 820 || Math.abs(z) > 880) continue
      for (const oz of [-0.26, 0.26]) {
        yellowLines.push([midX, 0.098, z + oz, 39, 0.014, 0.18])
      }
    }
  }
  addInstancedPropBatch(
    root,
    BOX_GEO,
    new THREE.MeshStandardMaterial({ color: 0xf4b932, roughness: 0.85 }),
    yellowLines
  )

  // 2. Covered bus stops, fire hydrants, trash bins, bollards & neon kiosks
  const shelterPosts = []
  const shelterRoofs = []
  const shelterGlass = []
  const shelterBenches = []
  const shelterAds = []

  const hydrants = []
  const hydrantCaps = []
  const bins = []
  const bollards = []
  const kioskBodies = []
  const kioskScreens = []

  const addBusStop = (x, z, rotY) => {
    const dx = Math.cos(rotY)
    const dz = -Math.sin(rotY)
    const nx = Math.sin(rotY)
    const nz = Math.cos(rotY)
    shelterRoofs.push([x, 2.72, z, 4.6, 0.18, 1.9, rotY])
    shelterPosts.push([x - dx * 2.1 - nx * 0.75, 1.35, z - dz * 2.1 - nz * 0.75, 0.12, 2.7, 0.12, rotY])
    shelterPosts.push([x + dx * 2.1 - nx * 0.75, 1.35, z + dz * 2.1 - nz * 0.75, 0.12, 2.7, 0.12, rotY])
    shelterGlass.push([x - nx * 0.78, 1.4, z - nz * 0.78, 4.1, 2.3, 0.08, rotY])
    shelterBenches.push([x - nx * 0.25, 0.52, z - nz * 0.25, 2.8, 0.14, 0.62, rotY])
    shelterAds.push([x + dx * 2.15, 1.45, z + dz * 2.15, 0.22, 2.2, 1.5, rotY])
  }

  const maxBusStops = state.mobile ? 10 : 18
  let busStopCount = 0

  for (const x of mainX) {
    for (let i = 0; i < ROADS_Z.length - 1; i++) {
      const a = ROADS_Z[i]
      if (ROADS_Z[i + 1] - a !== 66) continue
      // Place bus stop at step=24 (clear of V92 streetlights at 14, 33, 52)
      const side = i % 2 === 0 ? -1 : 1
      const bx = x + side * 10.4
      const bz = a + 24
      if (busStopCount < maxBusStops && i % 2 === 0 && canPlaceSidewalkProp(bx, bz, 2.5)) {
        addBusStop(bx, bz, side > 0 ? -Math.PI / 2 : Math.PI / 2)
        busStopCount++
      }

      // Fire hydrant near block corner + trash bin mid-block
      const hx = x - side * 9.5
      const hz = a + 12
      if (canPlaceSidewalkProp(hx, hz, 0.8)) {
        hydrants.push([hx, 0.42, hz, 0.28, 0.84, 0.28])
        hydrantCaps.push([hx, 0.88, hz, 0.34, 0.14, 0.34])
      }
      const kx = x + side * 9.8
      const kz = a + 43
      if (Math.abs(x) < 350 && Math.abs(kz) < 420 && canPlaceSidewalkProp(kx, kz, 1.2)) {
        if ((i + Math.abs(x)) % 3 === 0) {
          kioskBodies.push([kx, 1.05, kz, 1.15, 2.1, 0.9])
          kioskScreens.push([kx - side * 0.47, 1.2, kz, 0.06, 1.1, 0.72])
        } else {
          bins.push([kx, 0.48, kz, 0.56, 0.96, 0.56])
        }
      }
      if (Math.abs(x) < 350 && Math.abs(a) < 420) {
        const bolX = x + side * 9.2
        for (const step of [19, 47]) {
          if (canPlaceSidewalkProp(bolX, a + step, 0.5)) {
            bollards.push([bolX, 0.42, a + step, 0.16, 0.84, 0.16])
          }
        }
      }
    }
  }

  for (const z of mainZ) {
    for (let i = 0; i < ROADS_X.length - 1; i++) {
      const a = ROADS_X[i]
      if (ROADS_X[i + 1] - a !== 66) continue
      const side = i % 2 === 0 ? -1 : 1
      const bx = a + 42
      const bz = z + side * 10.4
      if (busStopCount < maxBusStops && i % 3 === 0 && canPlaceSidewalkProp(bx, bz, 2.5)) {
        addBusStop(bx, bz, side > 0 ? Math.PI : 0)
        busStopCount++
      }
    }
  }

  const shelterPostMat = new THREE.MeshStandardMaterial({ color: 0x26343d, roughness: 0.45, metalness: 0.6 })
  const shelterGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.62
  })
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xb67a44, roughness: 0.75 })
  const adMat = new THREE.MeshStandardMaterial({
    color: 0xe6fbff,
    emissive: 0x00e1ff,
    emissiveIntensity: 0.3,
    roughness: 0.25
  })
  const kioskScreenMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c2,
    emissive: 0xffa62b,
    emissiveIntensity: 0.35,
    roughness: 0.25
  })
  state.neonMaterials.push(adMat, kioskScreenMat)

  addInstancedPropBatch(root, BOX_GEO, shelterPostMat, shelterPosts, true)
  addInstancedPropBatch(root, BOX_GEO, shelterPostMat, shelterRoofs, true)
  addInstancedPropBatch(root, BOX_GEO, shelterGlassMat, shelterGlass)
  addInstancedPropBatch(root, BOX_GEO, benchMat, shelterBenches)
  addInstancedPropBatch(root, BOX_GEO, adMat, shelterAds)

  addInstancedPropBatch(
    root,
    CYL_GEO,
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }),
    hydrants,
    true
  )
  addInstancedPropBatch(
    root,
    CYL_GEO,
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.7 }),
    hydrantCaps
  )
  addInstancedPropBatch(
    root,
    CYL_GEO,
    new THREE.MeshStandardMaterial({ color: 0x2a4f46, roughness: 0.65 }),
    bins
  )
  addInstancedPropBatch(
    root,
    CYL_GEO,
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.65 }),
    bollards
  )
  addInstancedPropBatch(
    root,
    BOX_GEO,
    new THREE.MeshStandardMaterial({ color: 0x1e2b37, roughness: 0.45, metalness: 0.4 }),
    kioskBodies,
    true
  )
  addInstancedPropBatch(root, BOX_GEO, kioskScreenMat, kioskScreens)
}

export function installV11GtaCity (World, opts = {}) {
  if (World.prototype.__v11GtaCityInstalled) return
  World.prototype.__v11GtaCityInstalled = true

  const originalOuter = World.prototype.makeOuterDistricts
  const originalClock = World.prototype.setTimeOfDay
  const originalWeather = World.prototype.setWeather
  const originalUpdate = World.prototype.update

  World.prototype.makeOuterDistricts = function (...args) {
    const out = originalOuter.apply(this, args)
    const state = {
      mobile: Boolean(opts.mobile),
      windowMaterials: [],
      neonMaterials: [],
      billboardMaterials: [],
      beacons: [],
      skyscrapers: 0
    }
    this.__v11Gta = state
    state.skyscrapers = createGtaSkyscrapers(this, state)
    createNeonBillboardsAndGantries(this, state)
    createStreetPropsAndMarkings(this, state)
    return out
  }

  World.prototype.setTimeOfDay = function (hours, nightStrength) {
    originalClock.call(this, hours, nightStrength)
    const state = this.__v11Gta
    if (state) {
      const duskOrNight = hours >= 17.5 || hours < 6.2
      const winGlow = nightStrength > 0.15 ? 0.28 + nightStrength * 0.95 : 0.05
      const neonGlow = duskOrNight ? Math.max(0.45, nightStrength) * 1.45 : nightStrength * 0.25
      const boardGlow = duskOrNight ? Math.max(0.4, nightStrength) * 0.95 : 0.16

      for (const m of state.windowMaterials) m.emissiveIntensity = winGlow
      for (const m of state.neonMaterials) m.emissiveIntensity = neonGlow
      for (const m of state.billboardMaterials) m.emissiveIntensity = boardGlow
    }
    const batchGlass = this.__v80?.batch?.glassMaterials
    if (batchGlass) {
      const intensity = nightStrength > 0.2 ? 0.35 + nightStrength * 0.75 : 0
      for (const m of batchGlass) m.emissiveIntensity = intensity
    }
  }

  World.prototype.setWeather = function (kind) {
    originalWeather.call(this, kind)
    const wet = kind === 'rain' || kind === 'storm'
    const batchRoads = this.__v80?.batch?.roadMaterials
    if (batchRoads) {
      for (const m of batchRoads) {
        m.roughness = wet ? 0.24 : 0.92
        m.metalness = wet ? 0.32 : 0.04
      }
    }
  }

  World.prototype.update = function (t, dt) {
    originalUpdate.call(this, t, dt)
    const beacons = this.__v11Gta?.beacons
    if (beacons) {
      for (const b of beacons) {
        const pulse = Math.sin(t * 3.8 + b.phase) > 0.15
        b.mat.color.setHex(pulse ? 0xff3b3b : 0x451212)
        b.mesh.scale.setScalar(pulse ? 0.82 : 0.48)
      }
    }
  }
}
