/** Mandalay Life V10 — 10 independent GLB aircraft, extended airport parking.
 *  Safe to install over the earlier 5-plane preview integration.
 *  Keeps the game's Vehicles.update controller (E / WASD / SPACE / SHIFT).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Runway center: (402, -198), 760 game units long, separated from parking.
// The five west bays are for fixed-wing aircraft; five east pads for rotorcraft.
export const AIRCRAFT_V10 = Object.freeze([
  {
    id: 'A1',
    file: '01_mandalay_skyline_airliner.glb',
    name: 'Mandalay Skyline Airliner',
    kind: 'plane',
    x: 319,
    z: -520,
    scale: 0.68,
    r: 11.8,
    speed: 58,
    turn: 0.62,
    length: 30,
    width: 25
  },
  {
    id: 'A2',
    file: '02_executive_business_jet.glb',
    name: 'Mandalay Executive Business Jet',
    kind: 'plane',
    x: 319,
    z: -380,
    scale: 0.85,
    r: 8.8,
    speed: 65,
    turn: 0.75,
    length: 23,
    width: 19
  },
  {
    id: 'A3',
    file: '03_regional_turboprop.glb',
    name: 'Mandalay Regional Turboprop',
    kind: 'plane',
    x: 319,
    z: -246,
    scale: 0.74,
    r: 11.5,
    speed: 46,
    turn: 0.7,
    length: 24,
    width: 23
  },
  {
    id: 'A4',
    file: '04_heavy_cargo.glb',
    name: 'Irrawaddy Heavy Cargo',
    kind: 'plane',
    x: 319,
    z: -108,
    scale: 0.65,
    r: 15.9,
    speed: 43,
    turn: 0.52,
    length: 30,
    width: 34
  },
  {
    id: 'A5',
    file: '05_light_trainer.glb',
    name: 'Mandalay Light Trainer',
    kind: 'plane',
    x: 319,
    z: 117,
    scale: 1.0,
    r: 4.9,
    speed: 35,
    turn: 1.0,
    length: 12,
    width: 14
  },
  {
    id: 'H1',
    file: '06_electric_evtol.glb',
    name: 'Mandalay Electric eVTOL',
    kind: 'helicopter',
    x: 493,
    z: -530,
    scale: 1.18,
    r: 6.7,
    speed: 28,
    turn: 1.55,
    length: 15,
    width: 13
  },
  {
    id: 'H2',
    file: '07_mandalay_rescue.glb',
    name: 'Mandalay Rescue Helicopter',
    kind: 'helicopter',
    x: 493,
    z: -421,
    scale: 1.1,
    r: 6.5,
    speed: 31,
    turn: 1.3,
    length: 17,
    width: 14
  },
  {
    id: 'H3',
    file: '08_city_patrol_police.glb',
    name: 'Mandalay Police Helicopter',
    kind: 'helicopter',
    x: 493,
    z: -323,
    scale: 1.1,
    r: 6.5,
    speed: 32,
    turn: 1.36,
    length: 17,
    width: 14
  },
  {
    id: 'H4',
    file: '09_utility_transport.glb',
    name: 'Royal Utility Transport Helicopter',
    kind: 'helicopter',
    x: 493,
    z: 35,
    scale: 1.02,
    r: 9.5,
    speed: 30,
    turn: 1.03,
    length: 26,
    width: 17
  },
  {
    id: 'H5',
    file: '10_executive_vip.glb',
    name: 'Mandalay Executive Helicopter',
    kind: 'helicopter',
    x: 493,
    z: 134,
    scale: 1.1,
    r: 7.0,
    speed: 36,
    turn: 1.45,
    length: 18,
    width: 15
  }
])

const BASE =
  (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/') +
  'aircraft-v10/models/'
const asphalt = new THREE.MeshStandardMaterial({
  color: 0x43515f,
  roughness: 0.92
})
const concrete = new THREE.MeshStandardMaterial({
  color: 0x758491,
  roughness: 0.95
})
const paint = new THREE.MeshBasicMaterial({
  color: 0xf2d98b,
  side: THREE.DoubleSide
})
const white = new THREE.MeshBasicMaterial({
  color: 0xf5f5ed,
  side: THREE.DoubleSide
})
function rect (root, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.receiveShadow = true
  root.add(mesh)
  return mesh
}
function parking (world) {
  const root = new THREE.Group()
  root.name = 'V10 AIRPORT APRONS 10 PARKING BAYS'
  world.city.add(root)
  // Parking is outside the runway x=376..428. Main airport building remains at x=488,z=-198.
  rect(root, 321, 0.162, -200, 79, 0.12, 798, concrete)
  rect(root, 321, 0.227, -200, 73, 0.014, 792, asphalt)
  // Taxiway west of runway; short spurs connect to the new runway.
  for (const z of [-520, -380, -246, -108, 117]) {
    rect(root, 367, 0.178, z, 36, 0.11, 13, concrete)
    rect(root, 368, 0.238, z, 34, 0.012, 0.22, paint)
  }
  for (const s of AIRCRAFT_V10) {
    if (s.kind === 'helicopter') {
      // Isolated helicopter pad; skip the terminal zone rather than paving over it.
      rect(root, s.x, 0.165, s.z, 43, 0.12, 44, concrete)
      rect(root, s.x, 0.24, s.z, 41, 0.014, 42, asphalt)
      const ring = new THREE.Mesh(new THREE.RingGeometry(13, 13.5, 48), paint)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(s.x, 0.253, s.z)
      root.add(ring)
      rect(root, s.x, 0.255, s.z, 6, 0.01, 0.55, white)
      rect(root, s.x, 0.255, s.z, 0.55, 0.01, 6, white)
    } else {
      const r = Math.min(16.2, Math.max(8, s.r * 0.95))
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.28, 64),
        paint
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(s.x, 0.248, s.z)
      root.add(ring)
      rect(root, s.x, 0.252, s.z - 16, 1, 0.012, 7, white)
    }
    // Above-ground stand labels (A1..A5, H1..H5), drawn without external assets.
    const can = document.createElement('canvas')
    can.width = 128
    can.height = 64
    const ctx = can.getContext('2d')
    ctx.fillStyle = '#F8E1A0'
    ctx.fillRect(0, 0, 128, 64)
    ctx.fillStyle = '#253542'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 43px system-ui'
    ctx.fillText(s.id, 64, 33)
    const tex = new THREE.CanvasTexture(can)
    tex.colorSpace = THREE.SRGBColorSpace
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.1),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    )
    label.rotation.x = -Math.PI / 2
    label.position.set(s.x + (s.kind === 'plane' ? 24 : 17), 0.265, s.z)
    root.add(label)
  }
  return root
}
function freshVehicle (scene, s) {
  const root = new THREE.Group()
  root.name = `V10_${s.id}_${s.name.replace(/\s+/g, '_')}`
  scene.add(root)
  const modelHolder = new THREE.Group()
  root.add(modelHolder)
  return {
    kind: s.kind,
    name: s.name,
    icon: s.kind === 'plane' ? '✈' : '🚁',
    x: s.x,
    z: s.z,
    yaw: Math.PI,
    alt: 0,
    speed: s.speed,
    turn: s.turn,
    r: s.r,
    root,
    modelHolder,
    velocity: 0,
    turnAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    rotorSpeed: 6,
    wheelSpinners: [],
    frontSteerPivots: [],
    extraPropellers: [],
    v10: true,
    batch1: true,
    width: s.width,
    length: s.length,
    assetLoaded: true
  }
}
function createUI () {
  const status = document.createElement('div')
  status.id = 'mandalay-aircraft-v10-status'
  status.style.cssText =
    'position:fixed;bottom:84px;right:18px;z-index:25;border-radius:8px;padding:6px 9px;background:#173346df;color:#ffe0a1;font:600 11px system-ui;pointer-events:none'
  status.textContent = 'Loading aircraft 0/10…'
  document.body.appendChild(status)
  const btn = document.createElement('button')
  btn.id = 'mandalay-aircraft-v10'
  btn.style.cssText =
    'position:fixed;bottom:111px;right:18px;z-index:26;border:1px solid #e0bf77;border-radius:9px;padding:7px 10px;background:#183448ee;color:#ffdf9f;font:700 12px system-ui;cursor:pointer'
  btn.textContent = '✈ Airport (J)'
  btn.type = 'button'
  document.body.appendChild(btn)
  return { btn, status }
}
function addV102AircraftLights (model, spec) {
  const bb = new THREE.Box3().setFromObject(model)
  if (bb.isEmpty()) return
  // Box3 reflects the root GLTF scale. Convert back to local coordinates,
  // because these light meshes become children of that scaled root.
  const inverse = 1 / (model.scale.x || 1)
  bb.min.multiplyScalar(inverse)
  bb.max.multiplyScalar(inverse)
  const span = bb.max.x - bb.min.x,
    depth = bb.max.z - bb.min.z,
    height = bb.max.y - bb.min.y
  const lamp = (x, y, z, r, color) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      new THREE.MeshBasicMaterial({ color, toneMapped: false })
    )
    m.position.set(x, y, z)
    m.name = 'V102_nav_light'
    model.add(m)
  }
  const y = bb.min.y + height * (spec.kind === 'plane' ? 0.43 : 0.42)
  if (spec.kind === 'plane') {
    lamp(bb.min.x + 0.3, y, bb.min.z + depth * 0.5, 0.16, 0xff3535)
    lamp(bb.max.x - 0.3, y, bb.min.z + depth * 0.5, 0.16, 0x38ff75)
    lamp(0, bb.max.y - 0.05, bb.min.z + depth * 0.49, 0.21, 0xfff2db)
    lamp(0, bb.min.y + height * 0.31, bb.min.z + depth * 0.06, 0.18, 0xfff8da)
  } else {
    lamp(bb.min.x + span * 0.2, y, bb.min.z + depth * 0.55, 0.16, 0xff4444)
    lamp(bb.max.x - span * 0.2, y, bb.min.z + depth * 0.55, 0.16, 0x57ff7d)
    lamp(0, bb.min.y + height * 0.36, bb.min.z + depth * 0.08, 0.19, 0xfff1cc)
  }
}

function skin (v, s, gltf, fleet) {
  // Only replace the legacy model AFTER the new GLB has loaded successfully.
  v.modelHolder.clear()
  const model = gltf.scene
  model.name = 'Mandalay_V10_GLTF_' + s.id
  model.scale.setScalar(s.scale)
  model.traverse(ch => {
    if (ch.isMesh) {
      ch.castShadow = true
      ch.receiveShadow = true
    }
  })
  addV102AircraftLights(model, s)
  v.modelHolder.add(model)
  v.modelHolder.position.y = 0.22
  v.root.visible = fleet.vehicles[0]?.root.visible ?? true
  Object.assign(v, {
    kind: s.kind,
    name: s.name,
    icon: s.kind === 'plane' ? '✈' : '🚁',
    x: s.x,
    z: s.z,
    yaw: Math.PI,
    alt: 0,
    velocity: 0,
    speed: s.speed,
    turn: s.turn,
    r: s.r,
    width: s.width,
    length: s.length,
    turnAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    rotorSpeed: 6,
    v10: true,
    batch1: true,
    assetLoaded: true,
    prop: null,
    extraPropellers: [],
    rotor: null,
    secondaryRotor: null,
    tailRotor: null,
    wheelSpinners: [],
    frontSteerPivots: [],
    fanSpinners: []
  })
  const rotors = []
  model.traverse(obj => {
    if (obj.name?.startsWith('propeller_')) v.extraPropellers.push(obj)
    if (obj.name === 'rotor_main' || obj.name === 'rotor_main_front')
      v.rotor = obj
    if (obj.name === 'rotor_secondary_rear') v.secondaryRotor = obj
    if (obj.name === 'rotor_tail') v.tailRotor = obj
    if (obj.name?.startsWith('fan_')) v.fanSpinners.push(obj)
  })
  // Existing Vehicles.update rotates v.rotor, v.secondaryRotor and propellers.
  // Extra visual fans are handled in manager.update below.
  fleet.addHeadlights(v)
  fleet.positionVisual(v)
}
export function installAircraftV10 ({ scene, world, fleet }) {
  if (fleet.__aircraftV10) return fleet.__aircraftV10
  const oldPlanes = fleet.vehicles.filter(v => v.kind === 'plane')
  const oldHelis = fleet.vehicles.filter(v => v.kind === 'helicopter')
  const ui = createUI()
  parking(world)
  const ready = [],
    errors = []
  let travelEnabled = false
  const manager = {
    ready,
    errors,
    specs: AIRCRAFT_V10,
    enableTravel,
    update,
    nearestBoardable,
    safeExit
  }
  fleet.__aircraftV10 = manager
  // Guard against parked-aircraft intersections during ground taxiing.
  const baseUpdate = fleet.update.bind(fleet)
  fleet.update = function (v, input, dt, w) {
    const prevX = v.x,
      prevZ = v.z
    const result = baseUpdate(v, input, dt, w)
    if ((v.kind === 'plane' || v.kind === 'helicopter') && v.alt < 5) {
      const other = fleet.vehicles.find(
        o =>
          o !== v &&
          (o.kind === 'plane' || o.kind === 'helicopter') &&
          o.alt < 5 &&
          Math.hypot(v.x - o.x, v.z - o.z) < (v.r || 4) + (o.r || 4) + 1.2
      )
      if (other) {
        v.x = prevX
        v.z = prevZ
        v.velocity = 0
        fleet.positionVisual(v)
        return 0
      }
    }
    return result
  }
  const loader = new GLTFLoader()
  AIRCRAFT_V10.forEach((s, index) => {
    loader.load(
      BASE + s.file,
      gltf => {
        try {
          const v =
            index < 4
              ? oldPlanes[index]
              : index === 8
              ? oldHelis[0]
              : freshVehicle(scene, s)
          if (!v)
            throw Error('Legacy aircraft unavailable; game content differs')
          skin(v, s, gltf, fleet)
          if (!fleet.vehicles.includes(v)) fleet.vehicles.push(v)
          ready.push(v)
          report()
        } catch (e) {
          errors.push(s.id + ': ' + e.message)
          console.error('[Mandalay V10]', e)
          report()
        }
      },
      undefined,
      e => {
        errors.push(s.id + ': GLB load failed')
        console.error('[Mandalay V10] Asset', s.file, e)
        report()
      }
    )
  })
  function report () {
    ui.status.textContent =
      `V10 Aircraft: ${ready.length}/10 ready` +
      (errors.length ? ` · ${errors.length} error(s)` : '')
    if (ready.length === 10)
      ui.status.textContent = '✓ 10 aircraft ready at the expanded airport'
  }
  function update (dt, activeVehicle) {
    for (const v of ready) {
      const spin = Math.min(dt, 0.045)
      for (const f of v.fanSpinners || [])
        f.rotation.y += spin * (v === activeVehicle ? 19 : 4)
      if (v !== activeVehicle) {
        for (const p of v.extraPropellers || []) p.rotation.z += spin * 2
        if (v.rotor) v.rotor.rotation.y += spin * 4
        if (v.secondaryRotor) v.secondaryRotor.rotation.y -= spin * 4
        if (v.tailRotor) v.tailRotor.rotation.x += spin * 5
      }
    }
  }
  function doorAt (v, side = 1) {
    // Root yaw = -v.yaw. Side access near the aircraft's forward cabin door.
    const lateral = v.kind === 'plane' ? 4.0 : 3.4
    const nose = v.kind === 'plane' ? -(v.length || 20) * 0.29 : -1.4
    const theta = -v.yaw
    const x = side * lateral,
      z = nose
    return {
      x: v.x + x * Math.cos(theta) + z * Math.sin(theta),
      z: v.z - x * Math.sin(theta) + z * Math.cos(theta)
    }
  }
  function nearestBoardable (player, fallback = null) {
    if (fallback && fallback.v10) return fallback
    let best = null,
      dist = 5.0
    for (const v of ready) {
      if (Math.abs((v.alt || 0) - (player.y || 0)) > 2.5) continue
      for (const side of [-1, 1]) {
        const d = doorAt(v, side)
        const n = Math.hypot(player.x - d.x, player.z - d.z)
        if (n < dist) {
          best = v
          dist = n
        }
      }
    }
    return best || fallback
  }
  function safeExit (v, w) {
    for (const side of [1, -1]) {
      const pos = doorAt(v, side)
      if (
        !w.waterBlocked(pos.x, pos.z) &&
        !w
          .getCollisionBoxes()
          .some(
            b =>
              pos.x > b.minX - 1 &&
              pos.x < b.maxX + 1 &&
              pos.z > b.minZ - 1 &&
              pos.z < b.maxZ + 1
          )
      )
        return pos
    }
    return { x: v.x + 7, z: v.z + 7 }
  }
  function enableTravel ({ player, character, notice, saveProgress, isReady }) {
    if (travelEnabled) return
    travelEnabled = true
    function teleport () {
      if (typeof isReady === 'function' && !isReady()) return
      if (!ready.length) {
        notice('Airport aircraft models still loading.')
        return
      }
      if (player.ride || player.inside || player.roofPad) {
        notice('Exit vehicle / building before airport travel.')
        return
      }
      const target =
        ready.find(v => v.name === AIRCRAFT_V10[0].name) || ready[0]
      const d = doorAt(target, 1)
      const candidates = [
        [d.x, d.z],
        [doorAt(target, -1).x, doorAt(target, -1).z]
      ]
      const p =
        candidates.find(
          ([x, z]) =>
            !world.waterBlocked(x, z) &&
            !world
              .getCollisionBoxes()
              .some(
                b =>
                  x > b.minX - 1 &&
                  x < b.maxX + 1 &&
                  z > b.minZ - 1 &&
                  z < b.maxZ + 1
              )
        ) || candidates[0]
      Object.assign(player, {
        x: p[0],
        z: p[1],
        y: 0,
        yaw: Math.PI,
        vy: 0,
        grounded: true
      })
      character.setPosition(player.x, 0, player.z, player.yaw)
      notice('Expanded Airport. A1–A5 / H1–H5. Press E to board.')
      saveProgress()
    }
    ui.btn.addEventListener('click', teleport)
    window.addEventListener('keydown', evt => {
      if (
        evt.code !== 'KeyJ' ||
        evt.repeat ||
        evt.ctrlKey ||
        evt.metaKey ||
        evt.altKey
      )
        return
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName))
        return
      teleport()
    })
  }
  return manager
}
