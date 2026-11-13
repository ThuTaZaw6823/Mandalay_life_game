import * as THREE from 'three'
import { World, MAP_HALF, ROADS_X, ROADS_Z, RIVER } from './world.js'
import { PALACE, BRIDGES } from './v5layout.js'
import { CityLife } from './citylife.js'
import { TimeCycle } from './timecycle.js'
import { formatClock } from './gameclock.js'
import { WeatherSystem, nextWeather } from './weather.js'
import { Character } from './character.js'
import { Vehicles } from './vehicles.js'
import {
  forward,
  turnYaw,
  sweptMove,
  integrateJump,
  distance2,
  clamp,
  worldBounds
} from './physics.js'
import './style.css'

const $ = id => document.getElementById(id)
const canvas = $('viewport')
let renderer
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  })
} catch (e) {
  $('fatal').classList.remove('hidden')
  throw e
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.33
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xb4dce9)
scene.fog = new THREE.FogExp2(0xb4dce9, 0.0014)

const hemi = new THREE.HemisphereLight(0xe6f6ff, 0x81956c, 2.0)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xffe5b2, 2.35)
sun.position.set(-70, 125, 65)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -185
sun.shadow.camera.right = 185
sun.shadow.camera.top = 185
sun.shadow.camera.bottom = -185
sun.shadow.camera.near = 1
sun.shadow.camera.far = 520
sun.shadow.bias = -0.00025
sun.shadow.camera.updateProjectionMatrix()
scene.add(sun)

const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  0.1,
  2800
)
camera.position.set(5, 10, 18)

const world = new World(scene)
const cityLife = new CityLife(world)
const character = new Character(scene)
const fleet = new Vehicles(scene)
const dayNight = new TimeCycle(scene, renderer, sun, hemi)
const weather = new WeatherSystem(scene)

const SAVE = 'mandalay-life-v4-alpha'
let saved = {}
try {
  saved = JSON.parse(localStorage.getItem(SAVE) || '{}') || {}
} catch {}
const data = {
  coins: 160,
  jobs: 0,
  ownPlot: false,
  house: false,
  trees: 0,
  ...saved
}
const save = () => {
  try {
    localStorage.setItem(SAVE, JSON.stringify(data))
  } catch {}
}
world.updatePlot(data)

const player = {
  x: 0,
  y: 0,
  z: 16,
  yaw: 0,
  vy: 0,
  grounded: true,
  ride: null,
  inside: false,
  fromDoor: null,
  roofPad: null
}
let orbit = 0,
  zoom = 12,
  playing = false,
  paused = true,
  clock = 0,
  earnDistance = 0,
  mission = null,
  missionId = 0,
  lastTime = performance.now(),
  toastTime = 0,
  mouseDown = false,
  lastX = 0
const pressed = new Set()

function notice (msg) {
  $('toast').textContent = msg
  $('toast').classList.add('show')
  toastTime = 3.3
}

function afford (amount) {
  if (data.coins < amount) {
    notice(`Need ${amount - data.coins} more coins.`)
    return false
  }
  data.coins -= amount
  save()
  return true
}

function nearPlot () {
  return !player.inside && distance2(player, world.plot) < 22
}
function nearPoint (p, r = 8) {
  return !player.inside && distance2(player, p) < r
}

function interact () {
  if (player.inside) {
    if (world.nearStairs(player)) {
      if (world.interiorFloor < world.maxInteriorFloors - 1) {
        world.setInteriorFloor(world.interiorFloor + 1)
        player.y = world.insideBaseY
        player.vy = 0
        player.grounded = true
        notice(
          `Climbed to floor ${world.interiorFloor + 1}/${
            world.maxInteriorFloors
          }. Press Q to descend.`
        )
      } else {
        notice('Top floor. Press Q near the stairs to go down.')
      }
      return
    }
    const d = world.getNearDoor(player, true)
    if (d) {
      player.inside = false
      world.switchInterior(false)
      fleet.setVisible(true)
      player.x = player.fromDoor.x
      player.z = player.fromDoor.z + 1.1
      player.y = 0
      player.vy = 0
      player.grounded = true
      camera.position.set(player.x, 6, player.z + 9)
      notice('Back outside.')
    } else if (world.interiorFloor > 0) {
      notice('Take the stairs down to Floor 1 (Q) before exiting.')
    } else {
      notice(
        world.maxInteriorFloors > 1
          ? 'Walk to the front entrance to exit, or the staircase to climb.'
          : 'Walk to the front entrance (E) to exit.'
      )
    }
    return
  }

  if (player.ride) {
    const v = player.ride
    if (
      (v.kind === 'plane' || v.kind === 'helicopter') &&
      v.alt > 1 &&
      !v.onPad
    ) {
      notice('Land your aircraft first!')
      return
    }
    if (v.kind === 'boat' && v.x < RIVER.maxX - 13) {
      notice('Return close to the eastern riverbank to disembark.')
      return
    }
    player.ride = null
    character.setVisible(true)
    character.resetRiding()
    if (v.kind === 'helicopter' && v.onPad && v.onPad.y > 3) {
      player.roofPad = v.onPad
      player.x = v.onPad.x + 5.1
      player.z = v.onPad.z
      player.y = v.onPad.y
      player.vy = 0
      player.grounded = true
      notice(
        'Landed on rooftop helipad. E re-board · R rooftop stairwell exit.'
      )
      return
    }
    if (v.kind === 'boat') {
      player.x = RIVER.maxX + 8
      player.z = v.z
      player.y = 0
      notice(`Disembarked ${v.name} on the riverbank.`)
      return
    }
    const f = forward(v.yaw)
    const exits = [
      [v.x + f.z * 5, v.z - f.x * 5],
      [v.x - f.z * 5, v.z + f.x * 5],
      [v.x - f.x * 5, v.z - f.z * 5]
    ]
    const pos = exits.find(
      ([x, z]) =>
        !world.waterBlocked(x, z) &&
        !world
          .getCollisionBoxes()
          .some(
            b =>
              x >= b.minX - 0.8 &&
              x <= b.maxX + 0.8 &&
              z >= b.minZ - 0.8 &&
              z <= b.maxZ + 0.8
          )
    )
    if (pos) {
      player.x = pos[0]
      player.z = pos[1]
    } else {
      player.x = v.x
      player.z = v.z + 6
    }
    notice(`Exited ${v.name}`)
    return
  }

  const door = world.getNearDoor(player)
  if (door && !player.roofPad) {
    player.fromDoor = { x: door.x, z: door.z }
    player.inside = true
    world.switchInterior(true, door)
    fleet.setVisible(false)
    player.x = 0
    player.z = 4.7
    player.y = 0
    player.yaw = 0
    orbit = 0
    camera.position.set(0, 5.8, 9)
    const stairHint =
      world.maxInteriorFloors > 1
        ? ` ${world.maxInteriorFloors} floor(s) · stairs on the right.`
        : ''
    notice(`Entered ${door.name}.${stairHint}`)
    return
  }

  const v = fleet.nearest(player, 6.5)
  if (v) {
    player.ride = v
    player.roofPad = null
    player.x = v.x
    player.z = v.z
    player.yaw = v.yaw
    character.setVisible(v.kind === 'bicycle' || v.kind === 'motorbike')
    orbit = 0
    notice(
      `${v.name}: W/S drive • A/D steer${
        v.kind === 'plane' || v.kind === 'helicopter' ? ' • SPACE ascend' : ''
      }`
    )
    return
  }
  notice('Walk near a vehicle or an entrance, then press E.')
}

function delivery () {
  if (player.inside) {
    notice('Head outside to start a delivery.')
    return
  }
  if (!mission) {
    if (!nearPoint(world.depot, 14)) {
      notice('Find the DELIVERY DEPOT on the map first.')
      return
    }
    mission = {
      destination: world.destinations[missionId++ % world.destinations.length],
      reward: 65 + (missionId % 3) * 25
    }
    notice(`Parcel collected! Head to ${mission.destination.name}.`)
    return
  }
  if (!nearPoint(mission.destination, 14)) {
    notice(`Go to ${mission.destination.name}.`)
    return
  }
  data.jobs++
  data.coins += mission.reward
  notice(`Delivery complete! +${mission.reward} coins`)
  mission = null
  save()
}

function buy () {
  if (!nearPlot()) {
    notice('Go to the highlighted property to buy land.')
    return
  }
  if (data.ownPlot) {
    notice('This land is already yours!')
    return
  }
  if (afford(world.plot.price)) {
    data.ownPlot = true
    world.updatePlot(data)
    notice('You own your first property!')
  }
}

function build () {
  if (!nearPlot()) {
    notice('Go to your property to build.')
    return
  }
  if (!data.ownPlot) {
    notice('Buy land first (B).')
    return
  }
  if (data.house) {
    notice('Your home is already built. Press E by its door.')
    return
  }
  if (afford(world.plot.housePrice)) {
    data.house = true
    world.updatePlot(data)
    notice('A new home is ready! Enter through the front door.')
  }
}

function plant () {
  if (!nearPlot() || !data.ownPlot) {
    notice('Own the land and stand nearby to plant.')
    return
  }
  if (data.trees >= 12) {
    notice('Your garden is full.')
    return
  }
  if (afford(world.plot.treePrice)) {
    data.trees++
    world.updatePlot(data)
    notice('Tree planted!')
  }
}

const action = {
  KeyE: interact,
  KeyF: delivery,
  KeyB: buy,
  KeyH: build,
  KeyT: plant,
  KeyC: () => {
    notice(`Character: ${character.changeOutfit()} · 3D model`)
  },
  KeyQ: () => {
    if (player.inside && world.nearStairs(player)) {
      if (world.interiorFloor > 0) {
        world.setInteriorFloor(world.interiorFloor - 1)
        player.y = world.insideBaseY
        player.vy = 0
        player.grounded = true
        notice(
          `Descended to floor ${world.interiorFloor + 1}/${
            world.maxInteriorFloors
          }.`
        )
      } else notice('Already on the ground floor.')
    }
  },
  KeyV: () => {
    weather.setMode(nextWeather(weather.mode))
    notice(`Weather: ${weather.label}`)
    weather.unlockAudio()
  },
  KeyR: () => {
    if (!player.roofPad || player.ride) return
    const pad = player.roofPad
    player.roofPad = null
    player.x = pad.x
    player.z = pad.z + 14.5
    player.y = 0
    player.vy = 0
    player.grounded = true
    notice('Rooftop stairwell: back on the street.')
  }
}

window.addEventListener('keydown', e => {
  if (
    ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
      e.code
    )
  )
    e.preventDefault()
  pressed.add(e.code)
  if (!e.repeat && playing && !paused) {
    if (action[e.code]) action[e.code]()
    if (e.code === 'Space' && !player.ride && player.grounded) {
      player.vy = 9.4
      player.grounded = false
    }
  }
  if (e.code === 'Escape' && playing) {
    paused = !paused
    $('helpOverlay').classList.toggle('hidden', !paused)
  }
})

window.addEventListener('keyup', e => pressed.delete(e.code))
window.addEventListener('blur', () => pressed.clear())
canvas.addEventListener('pointerdown', e => {
  mouseDown = true
  lastX = e.clientX
  canvas.setPointerCapture(e.pointerId)
})
canvas.addEventListener('pointerup', () => (mouseDown = false))
canvas.addEventListener('pointercancel', () => (mouseDown = false))
canvas.addEventListener('pointermove', e => {
  if (!mouseDown) return
  orbit = clamp(orbit + (e.clientX - lastX) * 0.006, -2.1, 2.1)
  lastX = e.clientX
})
canvas.addEventListener(
  'wheel',
  e => {
    e.preventDefault()
    zoom = clamp(zoom + e.deltaY * 0.014, 6.5, 23)
  },
  { passive: false }
)

function resume () {
  playing = true
  paused = false
  $('startOverlay').classList.add('hidden')
  $('helpOverlay').classList.add('hidden')
}
$('startButton').onclick = () => {
  weather.unlockAudio()
  resume()
  notice('Welcome to Mandalay Life v5.1 · Royal City!')
}
$('helpButton').onclick = () => {
  paused = true
  $('helpOverlay').classList.remove('hidden')
}
$('closeHelp').onclick = $('resumeButton').onclick = resume
$('weatherToggle').onclick = () => {
  weather.setMode(nextWeather(weather.mode))
  weather.unlockAudio()
  notice('Weather: ' + weather.label)
}

function input () {
  return {
    forward: pressed.has('KeyW') || pressed.has('ArrowUp'),
    back: pressed.has('KeyS') || pressed.has('ArrowDown'),
    left: pressed.has('KeyA') || pressed.has('ArrowLeft'),
    right: pressed.has('KeyD') || pressed.has('ArrowRight'),
    fast: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
    jump: pressed.has('Space')
  }
}

function simulate (dt) {
  const i = input()
  clock += dt
  dayNight.update(dt, player)
  weather.update(dt, player, dayNight)
  world.setWeather(weather.kind)
  cityLife.update(dt, dayNight.night, player.ride)
  world.liveCollisionBoxes = cityLife.getCollisionBoxes()

  if (player.ride) {
    const d = fleet.update(player.ride, i, dt, world)
    player.x = player.ride.x
    player.z = player.ride.z
    player.y =
      player.ride.kind === 'plane' || player.ride.kind === 'helicopter'
        ? player.ride.alt
        : 0
    player.yaw = player.ride.yaw
    if (player.ride.kind === 'bicycle' || player.ride.kind === 'motorbike') {
      const f = forward(player.ride.yaw)
      character.setVisible(true)
      character.setPosition(
        player.x + f.x * 0.2,
        player.ride.kind === 'bicycle' ? 0.6 : 0.72,
        player.z + f.z * 0.2,
        player.yaw
      )
      character.animateRiding(
        dt,
        player.ride.kind,
        Math.abs(player.ride.velocity)
      )
    }
    if (d > 0) {
      earnDistance += d
      if (earnDistance >= 110) {
        earnDistance -= 110
        data.coins += 6
        save()
        notice('+6 coins for exploring!')
      }
    }
  } else {
    const speed = i.fast ? 14.1 : 7.9
    const h = (i.right ? 1 : 0) - (i.left ? 1 : 0)
    player.yaw = turnYaw(player.yaw, h, 2.65, dt)
    const f = forward(player.yaw)
    const move = (i.forward ? 1 : 0) - (i.back ? 1 : 0),
      d = move * speed * dt
    const bounds = player.inside
      ? { minX: -7.0, maxX: 7.0, minZ: -5.9, maxZ: 5.9 }
      : worldBounds
    const r = player.inside ? 0.45 : 0.65

    if (player.roofPad) {
      const pad = player.roofPad,
        nx = player.x + f.x * d,
        nz = player.z + f.z * d
      if (Math.abs(nx - pad.x) < 10.2 && Math.abs(nz - pad.z) < 11.2) {
        player.x = nx
        player.z = nz
      }
      integrateJump(player, dt, -25, pad.y)
    } else {
      const nx = player.x + f.x * d,
        nz = player.z + f.z * d
      const stairY = player.inside
        ? world.insideBaseY
        : world.groundHeightAt(nx, nz, player.y)

      // Watchtower spiral staircase & top observation deck movement
      if (!player.inside && stairY > 0.3 && world.watchtower) {
        const wt = world.watchtower
        const distFromCore = Math.hypot(nx - wt.x, nz - wt.z)
        const onTopDeck =
          player.y >= wt.topY - 1.5 && distFromCore <= wt.outerRadius + 0.1
        const onSpiralRamp =
          distFromCore >= wt.coreRadius - 0.1 &&
          distFromCore <= wt.outerRadius + 0.2
        if (onTopDeck || onSpiralRamp) {
          player.x = nx
          player.z = nz
        }
      } else {
        const newPos = sweptMove(
          player,
          f.x * d,
          f.z * d,
          r,
          world.getCollisionBoxes(player.inside),
          bounds
        )
        if (player.inside || !world.waterBlocked(newPos.x, newPos.z)) {
          player.x = newPos.x
          player.z = newPos.z
        }
      }
      const floorY = player.inside
        ? world.insideBaseY
        : world.groundHeightAt(player.x, player.z, player.y)
      integrateJump(player, dt, -25, floorY)
    }
    character.setPosition(player.x, player.y, player.z, player.yaw)
    character.animate(
      dt,
      Math.abs(move) * (i.fast ? 1 : 0.53),
      player.grounded,
      clock
    )
  }
  if (player.inside) {
    weather.rain.points.visible = false
    weather.snow.points.visible = false
  }
  world.setTimeOfDay(dayNight.hour, dayNight.night)
  fleet.setNightMode(dayNight.night, player.ride)
  world.update(clock, dt)
}

function renderCamera (dt) {
  const a = player.yaw + orbit
  const focus = new THREE.Vector3(player.x, player.y + 1.85, player.z),
    range = player.inside ? Math.min(zoom, 8) : zoom
  const desired = new THREE.Vector3(
    player.x - Math.sin(a) * range,
    player.y + Math.max(3.2, range * 0.52),
    player.z + Math.cos(a) * range
  )
  camera.position.lerp(desired, Math.min(1, dt * 8))
  camera.lookAt(focus)
}

const map = $('minimap'),
  ctx = map.getContext('2d')
function drawMap () {
  const w = map.width,
    h = map.height,
    extent = MAP_HALF
  const X = x => ((x + extent) / (extent * 2)) * w,
    Z = z => ((z + extent) / (extent * 2)) * h
  ctx.fillStyle = '#9eb78b'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#5195af'
  ctx.fillRect(X(RIVER.minX), 0, X(RIVER.maxX) - X(RIVER.minX), h)
  ctx.strokeStyle = '#526670'
  ctx.lineWidth = 3.0
  for (const x of ROADS_X) {
    ctx.beginPath()
    ctx.moveTo(X(x), Z(-MAP_HALF + 20))
    ctx.lineTo(X(x), Z(MAP_HALF - 20))
    ctx.stroke()
  }
  for (const z of ROADS_Z) {
    ctx.beginPath()
    ctx.moveTo(X(-832), Z(z))
    ctx.lineTo(X(MAP_HALF - 20), Z(z))
    ctx.stroke()
  }
  const dx = PALACE.x - PALACE.outerHalf,
    dz = PALACE.z - PALACE.outerHalf
  ctx.fillStyle = '#428ca9'
  ctx.fillRect(
    X(dx),
    Z(dz),
    ((PALACE.outerHalf * 2) / (extent * 2)) * w,
    ((PALACE.outerHalf * 2) / (extent * 2)) * h
  )
  ctx.fillStyle = '#9fb58a'
  ctx.fillRect(
    X(PALACE.x - PALACE.innerHalf),
    Z(PALACE.z - PALACE.innerHalf),
    ((PALACE.innerHalf * 2) / (extent * 2)) * w,
    ((PALACE.innerHalf * 2) / (extent * 2)) * h
  )
  ctx.strokeStyle = '#a05243'
  ctx.lineWidth = 1.7
  ctx.strokeRect(
    X(PALACE.x - PALACE.wallHalf),
    Z(PALACE.z - PALACE.wallHalf),
    ((PALACE.wallHalf * 2) / (extent * 2)) * w,
    ((PALACE.wallHalf * 2) / (extent * 2)) * h
  )
  for (const bridge of BRIDGES) {
    ctx.fillStyle = '#efe0b8'
    const len = bridge.axis === 'z' ? 14 : 42,
      dep = bridge.axis === 'z' ? 42 : 14
    ctx.fillRect(
      X(bridge.x - len / 2),
      Z(bridge.z - dep / 2),
      (len / (extent * 2)) * w,
      (dep / (extent * 2)) * h
    )
  }
  const airport = world.airport
  ctx.fillStyle = '#374951'
  ctx.fillRect(
    X(airport.x - airport.runwayWidth / 2),
    Z(airport.z - airport.runwayLength / 2),
    (airport.runwayWidth / (extent * 2)) * w,
    (airport.runwayLength / (extent * 2)) * h
  )
  ctx.fillStyle = data.ownPlot ? '#50bc91' : '#f7d875'
  ctx.fillRect(
    X(world.plot.x - 14),
    Z(world.plot.z - 15),
    (28 / (extent * 2)) * w,
    (30 / (extent * 2)) * h
  )
  const dest = mission ? mission.destination : world.depot
  ctx.fillStyle = '#ffa955'
  ctx.save()
  ctx.translate(X(dest.x), Z(dest.z))
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-4, -4, 8, 8)
  ctx.restore()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(X(player.x), Z(player.z), 4.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#234b55'
  ctx.beginPath()
  ctx.arc(X(player.x), Z(player.z), 2.7, 0, Math.PI * 2)
  ctx.fill()
}

function hud () {
  const d = mission ? mission.destination : world.depot,
    distance = Math.round(distance2(player, d))
  $('coins').textContent = Math.floor(data.coins).toLocaleString()
  $('jobs').textContent = data.jobs
  $('objective').textContent = mission
    ? `Deliver to ${d.name}`
    : 'Pick up a delivery'
  $('objectiveDetail').textContent = player.inside
    ? 'Head outside to continue your mission'
    : `${d.name} · ${distance}m away${
        mission ? ` · +${mission.reward} coins` : ''
      }`
  $('meters').textContent = distance + 'm'
  $('questProgress').style.width = clamp(100 - distance / 3, 6, 100) + '%'
  $('stateLabel').textContent = player.inside
    ? 'INSIDE BUILDING'
    : player.ride
    ? player.ride.name.toUpperCase()
    : 'EXPLORING'
  $('stateDetail').textContent = player.inside
    ? world.getInteriorLabel()
    : player.ride
    ? 'DRIVE · EXPLORE · E TO EXIT'
    : `WALK · RUN · JUMP · ${character.avatarName.toUpperCase()}`
  $('location').textContent = player.inside
    ? world.getInteriorLabel()
    : player.x < RIVER.maxX + 30
    ? 'IRRAWADDY RIVERSIDE'
    : Math.abs(player.x - PALACE.x) < 215 && Math.abs(player.z - PALACE.z) < 215
    ? 'MANDALAY ROYAL PALACE'
    : player.x > 310 && player.z < 0
    ? 'MANDALAY INTERNATIONAL AIRFIELD'
    : Math.abs(player.x) > 220 || Math.abs(player.z) > 220
    ? 'MANDALAY · OUTER DISTRICT'
    : 'MANDALAY · DOWNTOWN DISTRICT'
  $('gameTime').textContent = formatClock(dayNight.time)
  $('gamePhase').textContent = dayNight.phase
  $('weatherStatus').textContent = weather.label

  let hint = 'Find a vehicle or a doorway · E to interact'
  if (player.roofPad) hint = 'E — Re-board helicopter · R — Stairwell to street'
  if (player.inside) {
    if (world.maxInteriorFloors === 1) {
      hint = 'Walk to the front entrance (E) to exit'
    } else {
      hint = world.nearStairs(player)
        ? `E — Upstairs · Q — Downstairs · Floor ${world.interiorFloor + 1}/${
            world.maxInteriorFloors
          }`
        : world.interiorFloor === 0
        ? 'Find the entrance (E) or staircase (E)'
        : 'Find the staircase (Q down / E up)'
    }
  } else if (player.ride) {
    hint = 'E to exit vehicle'
  } else if (!player.roofPad && world.getNearDoor(player)) {
    hint = 'E — Enter ' + world.getNearDoor(player).name
  } else if (fleet.nearest(player, 6.5)) {
    hint = 'E — Drive ' + fleet.nearest(player, 6.5).name
  }

  if (!player.inside && !player.roofPad && nearPlot()) {
    hint = data.ownPlot
      ? data.house
        ? 'H = already built · T = plant tree'
        : 'H — Build a home for 220 coins'
      : 'B — Buy land for 120 coins'
  }
  if (!mission && nearPoint(world.depot, 14)) hint = 'F — Pick up parcel'
  if (mission && nearPoint(mission.destination, 14))
    hint = 'F — Complete delivery'
  $('interaction').textContent = hint
  drawMap()
}

let frames = 0
function frame (now) {
  requestAnimationFrame(frame)
  const dt = clamp((now - lastTime) / 1000 || 1 / 60, 0.001, 0.045)
  lastTime = now
  if (playing && !paused) simulate(dt)
  else clock += dt * 0.12
  renderCamera(dt)
  renderer.render(scene, camera)
  if (++frames % 8 === 0) hud()
  if (toastTime > 0) {
    toastTime -= dt
    if (toastTime <= 0) $('toast').classList.remove('show')
  }
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

character.setPosition(player.x, 0, player.z, player.yaw)
world.setTimeOfDay(dayNight.hour, dayNight.night)
fleet.setNightMode(dayNight.night, null)
hud()
requestAnimationFrame(frame)
