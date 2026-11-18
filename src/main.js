import { installV102AirportProtection, finalizeV102AirportProtection } from './v102-airport-protection.js'
import { installV11GtaCity } from './v11-gta-city.js'
import { installV92Environment } from './v92-environment.js'
import { installMandalayRemaster } from './v80-city-remaster.js'
import * as THREE from 'three'
import { World, MAP_HALF, ROADS_X, ROADS_Z, RIVER } from './world.js'
import { PALACE, BRIDGES } from './v5layout.js'
import { CityLife } from './citylife.js'
import { TrafficV9 } from './v9-traffic.js'
import { TimeCycle } from './timecycle.js'
import { formatClock } from './gameclock.js'
import { WeatherSystem, nextWeather } from './weather.js'
import { Character } from './character.js'
import { isVehicleStopped, vehicleSpeedMph, gameAltitudeKm, FLIGHT_RULES } from './v106-flight-rules.js' // ML_V106_FLIGHT_RULES // ML_V1061_SMOOTH_FLIGHT
import { Vehicles } from './vehicles.js'
import { installAircraftV10 } from './aircraft-v10.js'
import { TouchControls } from './touchcontrols.js'
import {
  forward,
  turnYaw,
  sweptMove,
  integrateJump,
  distance2,
  clamp,
  worldBounds
} from './physics.js'
import { installMandalayMap } from './mandalay-map.js'
import './style.css'

const $ = id => document.getElementById(id)
const canvas = $('viewport')
const touch = new TouchControls()
const isMobile = window.matchMedia('(pointer: coarse)').matches

let renderer

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    powerPreference: 'high-performance'
  })
} catch (error) {
  const fatal = document.createElement('div')
  fatal.style.cssText =
    'position:fixed;inset:0;z-index:100;background:#102a38;color:white;display:grid;place-items:center;padding:24px;text-align:center'
  fatal.textContent =
    'Unable to start 3D. Please enable WebGL or update your browser and graphics drivers.'
  document.body.appendChild(fatal)
  throw error
}

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 2)
)
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.33
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xb4dce9)
scene.fog = new THREE.FogExp2(0xb4dce9, 0.0014)

const hemi = new THREE.HemisphereLight(0xe6f6ff, 0x81956c, 2)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xffe5b2, 2.35)
sun.position.set(-70, 125, 65)
sun.castShadow = true
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048)
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
  0.65,
  2800
)
camera.position.set(5, 10, 18)

installMandalayRemaster(World, { mobile: isMobile, fencesPresent: true, farmsPresent: true })
installV92Environment(World)
installV11GtaCity(World, { mobile: isMobile })
installV102AirportProtection(World)
const world = new World(scene)
finalizeV102AirportProtection(world)

const cityLife = new CityLife(world)
const character = new Character(scene)
const fleet = new Vehicles(scene)
const aircraftV10 = installAircraftV10({ scene, world, fleet })
const trafficV9 = new TrafficV9(world, cityLife, fleet)
const dayNight = new TimeCycle(scene, renderer, sun, hemi)
const weather = new WeatherSystem(scene)

const LEGACY_SAVE = 'mandalay-life-v4-alpha'
const V7_SAVE = 'mandalay-life-v7-progress'

function readSave (key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {}
  } catch {
    return {}
  }
}

const legacy = readSave(LEGACY_SAVE)
const previous = readSave(V7_SAVE)

const data = {
  coins: Number.isFinite(legacy.coins) ? legacy.coins : 160,
  jobs: Number.isFinite(legacy.jobs) ? legacy.jobs : 0,
  ownPlot: !!legacy.ownPlot,
  house: !!legacy.house,
  trees: clamp(Number(legacy.trees) || 0, 0, 12)
}

function saveWallet () {
  try {
    localStorage.setItem(LEGACY_SAVE, JSON.stringify(data))
  } catch {}
}

world.updatePlot(data)

const spawn = previous.player || {}
const validCoord = v => Number.isFinite(v) && Math.abs(v) < MAP_HALF - 25

const player = {
  x: validCoord(spawn.x) ? spawn.x : 0,
  y: 0,
  z: validCoord(spawn.z) ? spawn.z : 16,
  yaw: Number.isFinite(spawn.yaw) ? spawn.yaw : 0,
  vy: 0,
  grounded: true,
  ride: null,
  inside: false,
  fromDoor: null,
  roofPad: null
}

/* MANDALAY_V82_SAFE_START */
// V8 city infill can cover previously saved player positions.
// Resume at the nearest CLEAR road instead of inside newly generated walls.
function v82FindSafeStreet (fromX, fromZ) {
  const blockers = world.getCollisionBoxes(false).concat(cityLife.getCollisionBoxes(), trafficV9.getCollisionBoxes())
  const palace = world.palace
  const roadOffsets = [[0, 17], [0, -17], [17, 0], [-17, 0], [0, 0]]
  let best = null
  let bestD2 = Infinity
  for (const x of ROADS_X) {
    for (const z of ROADS_Z) {
      for (const [dx, dz] of roadOffsets) {
        const px = x + dx
        const pz = z + dz
        const d2 = (px - fromX) ** 2 + (pz - fromZ) ** 2
        if (d2 >= bestD2) continue
        if (Math.abs(px) > MAP_HALF - 28 || Math.abs(pz) > MAP_HALF - 28) continue
        // The airfield, palace and moat are not public street spawn areas.
        if (px > 255 && px < 635 && pz > -655 && pz < 255) continue
        if (palace && Math.abs(px - palace.x) < palace.outerHalf + 13 &&
            Math.abs(pz - palace.z) < palace.outerHalf + 13) continue
        if (world.waterBlocked(px, pz)) continue
        const radius = 2.7
        const blocked = blockers.some(b => {
          const bx = Math.max(b.minX, Math.min(px, b.maxX))
          const bz = Math.max(b.minZ, Math.min(pz, b.maxZ))
          return (px - bx) ** 2 + (pz - bz) ** 2 < radius ** 2
        })
        if (blocked) continue
        bestD2 = d2
        best = { x: px, z: pz }
      }
    }
  }
  return best
}

// Force a clear street spawn for V8/V8.1 only; preserve everything else.
if (world.__v80) {
  const v82Start = v82FindSafeStreet(player.x, player.z)
  if (v82Start) {
    player.x = v82Start.x
    player.z = v82Start.z
  }
}

// Emergency escape while playing: press P. Existing game controls untouched.
function v82RescuePlayer () {
  if (player.ride) {
    notice('Exit the vehicle with E before using P to escape.')
    return
  }
  const safe = v82FindSafeStreet(player.x, player.z)
  if (!safe) {
    notice('No clear road found. Try restarting the game.')
    return
  }
  if (player.inside) {
    player.inside = false
    world.switchInterior(false)
    fleet.setVisible(true)
  }
  player.roofPad = null
  player.fromDoor = null
  player.x = safe.x
  player.z = safe.z
  player.y = 0
  player.vy = 0
  player.grounded = true
  character.setVisible(true)
  character.setPosition(player.x, 0, player.z, player.yaw)
  camera.position.set(player.x, 7, player.z + 10)
  saveProgress()
  notice('Moved to a clear street. Press P anytime you get stuck.')
}
/* END_MANDALAY_V82_SAFE_START */

let orbit = 0
let zoom = isMobile ? 15 : 12
let verticalAngle = 0
let playing = false
let paused = true
let clock = 0
let earnDistance = 0
let mission = null
let missionId = Number.isInteger(previous.missionId) ? previous.missionId : 0
let lastTime = performance.now()
let toastTime = 0
let mouseDown = false
let lastX = 0
let lastY = 0
let frames = 0
let autosaveTimer = 0
let previousTouchJump = false

const pressed = new Set()

// Creative Mandalay city atlas: full map, waypoints, landmarks and mobile MAP button.
let mapWasPaused = true
const royalCityMap = installMandalayMap({
  scene,
  world,
  player,
  getMission: () => mission,
  isReady: () => playing && !paused &&
    document.getElementById('helpOverlay')?.classList.contains('hidden'),
  onPauseChange: opened => {
    if (opened) {
      mapWasPaused = paused
      paused = true
      pressed.clear()
    } else {
      paused = mapWasPaused
    }
  }
})


if (Number.isInteger(previous.avatar) && previous.avatar >= 0) {
  character.loadAvatar(previous.avatar)
}

if (typeof previous.weather === 'string') {
  weather.setMode(previous.weather)
}

if (previous.mission && Number.isInteger(previous.mission.destinationIndex)) {
  const destination = world.destinations[previous.mission.destinationIndex]

  if (destination) {
    mission = {
      destination,
      reward: previous.mission.reward || 90
    }
  }
}

function saveProgress () {
  saveWallet()

  const destinationIndex = mission
    ? world.destinations.indexOf(mission.destination)
    : -1

  const progress = {
    player: {
      x: player.x,
      z: player.z,
      yaw: player.yaw
    },
    avatar: character.avatarIndex,
    weather: weather.mode,
    missionId,
    mission:
      destinationIndex >= 0
        ? { destinationIndex, reward: mission.reward }
        : null
  }

  try {
    localStorage.setItem(V7_SAVE, JSON.stringify(progress))
  } catch {}
}

function notice (message) {
  const node = $('toast')
  if (!node) return

  node.textContent = message
  node.classList.add('show')
  toastTime = 3.3
}

function afford (amount) {
  if (data.coins < amount) {
    notice(`Need ${amount - data.coins} more coins.`)
    return false
  }

  data.coins -= amount
  saveWallet()
  return true
}

const nearPlot = () =>
  !player.inside && !player.roofPad && distance2(player, world.plot) < 22

const nearPoint = (p, r = 8) =>
  !player.inside && !player.roofPad && distance2(player, p) < r

function interact () {
  if (player.inside) {
    if (world.nearStairs(player)) {
      if (world.interiorFloor < world.maxInteriorFloors - 1) {
        world.setInteriorFloor(world.interiorFloor + 1)
        player.y = world.insideBaseY
        player.vy = 0
        player.grounded = true

        notice(
          `Floor ${world.interiorFloor + 1}/${
            world.maxInteriorFloors
          }. Q to descend.`
        )
      } else {
        notice('Top floor. Press Q near the stairs to go down.')
      }
      return
    }

    if (world.getNearDoor(player, true)) {
      player.inside = false
      world.switchInterior(false)
      fleet.setVisible(true)

      player.x = player.fromDoor?.x ?? 0
      player.z = (player.fromDoor?.z ?? 0) + 1.1
      player.y = 0
      player.vy = 0
      player.grounded = true

      camera.position.set(player.x, 6, player.z + 9)
      notice('Back outside.')
    } else {
      notice('Use the entrance to exit, or E / Q near the stairs.')
    }

    saveProgress()
    return
  }

  if (player.ride) {
    const v = player.ride

    // V10.6: no one can disembark from ANY moving vehicle, including boats.
    if (!isVehicleStopped(v)) {
      notice(`Stop ${v.name} completely before exiting (${vehicleSpeedMph(v).toFixed(1)} mph).`)
      return
    }

    if (
      (v.kind === 'plane' || v.kind === 'helicopter') &&
      v.alt > 1 &&
      !v.onPad
    ) {
      notice('Land your aircraft first!')
      return
    }

    if (v.kind === 'boat' && v.x < RIVER.maxX - 13) {
      notice('Return near the eastern riverbank to disembark.')
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

      notice('Rooftop helipad. E to board, R to return to street.')
    } else if (v.kind === 'boat') {
      player.x = RIVER.maxX + 8
      player.z = v.z
      player.y = 0
      notice(`Disembarked ${v.name}.`)
    } else {
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

      const v10Exit = v.v10 ? aircraftV10.safeExit(v, world) : null
      player.x = v10Exit?.x ?? pos?.[0] ?? v.x
      player.z = v10Exit?.z ?? pos?.[1] ?? v.z + 6
      player.y = 0

      notice(`Exited ${v.name}`)
    }

    if (v.claimedFromTraffic) trafficV9.onLeaveVehicle(v)
    saveProgress()
    return
  }

  if (!player.roofPad) {
    // V9: E boards the nearest moving or stopped road vehicle immediately.
    const passingCar = trafficV9.nearest(player, 8.5)
    if (passingCar) {
      const claimed = trafficV9.claim(passingCar)
      if (claimed) {
        player.ride = claimed
        player.x = claimed.x
        player.z = claimed.z
        player.y = 0
        player.yaw = claimed.yaw
        player.roofPad = null
        character.setVisible(false)
        orbit = 0
        notice(`Driving ${claimed.name}. WASD steer, Shift fast, E exit.`)
        return
      }
    }
    const door = world.getNearDoor(player)

    if (door) {
      player.fromDoor = {
        x: door.x,
        z: door.z
      }

      player.inside = true
      world.switchInterior(true, door)
      fleet.setVisible(false)

      player.x = 0
      player.z = 4.7
      player.y = 0
      player.yaw = 0
      orbit = 0

      camera.position.set(0, 5.8, 9)
      notice(`Entered ${door.name}.`)
      return
    }
  }

  const vehicle = aircraftV10.nearestBoardable(player, fleet.nearest(player, player.roofPad ? 9 : 6.5))

  if (vehicle) {
    if (player.roofPad) {
      if (
        vehicle.kind !== 'helicopter' ||
        vehicle.onPad?.id !== player.roofPad.id
      ) {
        notice('Only the helicopter on this rooftop can be boarded.')
        return
      }
    } else if (
      (vehicle.kind === 'plane' || vehicle.kind === 'helicopter') &&
      vehicle.alt > 1.3
    ) {
      notice('Wait for the aircraft to land before boarding.')
      return
    }

    player.ride = vehicle
    player.roofPad = null
    player.x = vehicle.x
    player.z = vehicle.z
    player.yaw = vehicle.yaw

    character.setVisible(
      vehicle.kind === 'bicycle' || vehicle.kind === 'motorbike'
    )

    orbit = 0

    notice(
      `${vehicle.name}: move/steer, E to exit${
        vehicle.kind === 'plane' || vehicle.kind === 'helicopter'
          ? ', Jump to climb'
          : ''
      }`
    )
    return
  }

  notice('Move near a vehicle or entrance, then press E / INTERACT.')
}

function delivery () {
  if (player.inside || player.roofPad) {
    notice('Return to street level to do a delivery.')
    return
  }

  if (!mission) {
    if (!nearPoint(world.depot, 14)) {
      notice('Find the Delivery Depot on the map first.')
      return
    }

    const destination =
      world.destinations[missionId++ % world.destinations.length]

    mission = {
      destination,
      reward: 65 + (missionId % 3) * 25
    }

    notice(`Parcel collected! Deliver to ${destination.name}.`)
  } else if (!nearPoint(mission.destination, 14)) {
    notice(`Go to ${mission.destination.name}.`)
    return
  } else {
    data.jobs += 1
    data.coins += mission.reward

    notice(`Delivery complete! +${mission.reward} coins`)

    mission = null
  }

  saveProgress()
}

function buy () {
  if (!nearPlot()) {
    return notice('Go to the highlighted property to buy land.')
  }

  if (data.ownPlot) {
    return notice('This land is already yours!')
  }

  if (afford(world.plot.price)) {
    data.ownPlot = true
    world.updatePlot(data)
    notice('You own your first property!')
    saveProgress()
  }
}

function build () {
  if (!nearPlot()) {
    return notice('Go to your property to build.')
  }

  if (!data.ownPlot) {
    return notice('Buy land first (B).')
  }

  if (data.house) {
    return notice('Your house is already built.')
  }

  if (afford(world.plot.housePrice)) {
    data.house = true
    world.updatePlot(data)
    notice('House completed! Enter through its front door.')
    saveProgress()
  }
}

function plant () {
  if (!nearPlot() || !data.ownPlot) {
    return notice('Buy land and stand nearby to plant.')
  }

  if (data.trees >= 12) {
    return notice('Your garden is full.')
  }

  if (afford(world.plot.treePrice)) {
    data.trees += 1
    world.updatePlot(data)
    notice('Tree planted!')
    saveProgress()
  }
}

function changeAvatar () {
  notice(`Character: ${character.changeOutfit()}`)
  saveProgress()
}

function changeWeather () {
  weather.setMode(nextWeather(weather.mode))
  weather.unlockAudio()
  notice(`Weather: ${weather.label}`)
  saveProgress()
}

function stairsDown () {
  if (!player.inside || !world.nearStairs(player)) {
    return notice('Find indoor stairs first.')
  }

  if (world.interiorFloor === 0) {
    return notice('Already on the ground floor.')
  }

  world.setInteriorFloor(world.interiorFloor - 1)
  player.y = world.insideBaseY
  player.vy = 0
  player.grounded = true

  notice(`Floor ${world.interiorFloor + 1}/${world.maxInteriorFloors}.`)
}

function exitRoof () {
  if (!player.roofPad || player.ride) {
    return notice('You must be on a rooftop helipad.')
  }

  const pad = player.roofPad
  player.roofPad = null

  player.x = pad.x
  player.z = pad.z + 14.5
  player.y = 0
  player.vy = 0
  player.grounded = true

  notice('Returned to street level.')
  saveProgress()
}

const action = {
  KeyP: v82RescuePlayer,
  KeyE: interact,
  KeyF: delivery,
  KeyB: buy,
  KeyH: build,
  KeyT: plant,
  KeyC: changeAvatar,
  KeyV: changeWeather,
  KeyQ: stairsDown,
  KeyR: exitRoof
}

function jumpOnFoot () {
  if (!player.ride && player.grounded) {
    player.vy = 9.4
    player.grounded = false
  }
}

window.addEventListener('keydown', event => {
  if (
    ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
      event.code
    )
  ) {
    event.preventDefault()
  }

  pressed.add(event.code)

  if (event.code === 'Escape' && playing && !event.repeat) {
    paused = !paused

    $('helpOverlay')?.classList.toggle('hidden', !paused)

    pressed.clear()
    return
  }

  if (!event.repeat && playing && !paused) {
    action[event.code]?.()

    if (event.code === 'Space') {
      jumpOnFoot()
    }
  }
})

window.addEventListener('keyup', event => pressed.delete(event.code))

window.addEventListener('blur', () => {
  pressed.clear()
  if (playing) saveProgress()
})

window.addEventListener('pagehide', saveProgress)

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pressed.clear()
    if (playing) saveProgress()
  }
})

canvas.addEventListener('pointerdown', event => {
  mouseDown = true
  lastX = event.clientX
  lastY = event.clientY
  canvas.setPointerCapture(event.pointerId)
})

canvas.addEventListener('pointerup', () => {
  mouseDown = false
})

canvas.addEventListener('pointercancel', () => {
  mouseDown = false
})

canvas.addEventListener('pointermove', event => {
  if (!mouseDown) return

  orbit = clamp(orbit + (event.clientX - lastX) * 0.006, -2.1, 2.1)

  verticalAngle = clamp(
    verticalAngle + (event.clientY - lastY) * 0.004,
    -0.5,
    0.8
  )

  lastX = event.clientX
  lastY = event.clientY
})

canvas.addEventListener(
  'wheel',
  event => {
    event.preventDefault()

    zoom = clamp(zoom + event.deltaY * 0.014, 6.5, 30)
  },
  { passive: false }
)

function resume () {
  playing = true
  paused = false

  $('startOverlay')?.classList.add('hidden')
  $('helpOverlay')?.classList.add('hidden')

  pressed.clear()
}

$('startButton')?.addEventListener('click', () => {
  weather.unlockAudio()
  resume()
  notice('Welcome to Mandalay Life V7.0!')
})

$('resumeButton')?.addEventListener('click', resume)

$('closeHelp')?.addEventListener('click', resume)

$('helpButton')?.addEventListener('click', () => {
  if (!playing) return

  paused = true
  pressed.clear()

  $('helpOverlay')?.classList.remove('hidden')
})

$('weatherToggle')?.addEventListener('click', changeWeather)

// Additional mobile actions
function addMobileExtraActions () {
  const buttons = document.querySelector('.mobileButtons')

  if (!buttons) return

  const more = document.createElement('button')
  more.type = 'button'
  more.className = 'mobileBtn'
  more.textContent = 'MORE'
  buttons.appendChild(more)

  const panel = document.createElement('div')

  panel.style.cssText =
    'display:none;position:fixed;right:12px;bottom:calc(240px + env(safe-area-inset-bottom,0px));z-index:18;padding:10px;border-radius:16px;background:#142635ed;border:1px solid #ffffff33;grid-template-columns:repeat(2,70px);gap:8px;max-height:48vh;overflow:auto'

  for (const [label, fn] of [
    ['BUY', buy],
    ['HOUSE', build],
    ['TREE', plant],
    ['DOWN', stairsDown],
    ['ROOF', exitRoof]
  ]) {
    const button = document.createElement('button')

    button.type = 'button'
    button.className = 'mobileBtn'
    button.textContent = label

    button.addEventListener('click', () => {
      if (playing && !paused) fn()
      panel.style.display = 'none'
    })

    panel.appendChild(button)
  }

  document.body.appendChild(panel)

  more.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'grid' ? 'none' : 'grid'
  })
}

addMobileExtraActions()
aircraftV10.enableTravel({
  player,
  character,
  notice,
  saveProgress,
  isReady: () => playing && !paused && !royalCityMap.isOpen()
})

function input () {
  const m = touch.getMoveState()

  return {
    forward: pressed.has('KeyW') || pressed.has('ArrowUp') || m.forward,

    back: pressed.has('KeyS') || pressed.has('ArrowDown') || m.back,

    left: pressed.has('KeyA') || pressed.has('ArrowLeft') || m.left,

    right: pressed.has('KeyD') || pressed.has('ArrowRight') || m.right,

    fast: pressed.has('ShiftLeft') || pressed.has('ShiftRight') || m.fast,

    jump: pressed.has('Space') || m.jump
  }
}

function processTouch () {
  const delta = touch.consumeCameraDelta()

  orbit = clamp(orbit + delta.x * 0.008, -2.1, 2.1)

  verticalAngle = clamp(verticalAngle + delta.y * 0.005, -0.5, 0.8)

  const clicks = touch.consumeClicks()

  if (clicks.interact) interact()
  if (clicks.delivery) delivery()
  if (clicks.weather) changeWeather()
  if (clicks.avatar) changeAvatar()

  const jumping = touch.buttons.jump

  if (jumping && !previousTouchJump) {
    jumpOnFoot()
  }

  previousTouchJump = jumping
}

function simulate (dt) {
  processTouch()

  const i = input()
  aircraftV10.update(dt, player.ride)
  clock += dt

  dayNight.update(dt, player)
  weather.update(dt, player, dayNight)
  world.setWeather(weather.kind)
  cityLife.update(dt, dayNight.night, player.ride)

  trafficV9.update(dt, player.ride, player)
  world.liveCollisionBoxes = cityLife.getCollisionBoxes().concat(trafficV9.getCollisionBoxes())

  if (player.ride) {
    const v = player.ride
    const beforeX = v.x
    const beforeZ = v.z

    fleet.update(v, i, dt, world)

    player.x = v.x
    player.z = v.z

    player.y = v.kind === 'plane' || v.kind === 'helicopter' ? v.alt : 0

    player.yaw = v.yaw

    if (v.kind === 'bicycle' || v.kind === 'motorbike') {
      const f = forward(v.yaw)

      const rearOffset = v.kind === 'motorbike' ? -0.55 : -0.36

      const seatOffsetY = v.kind === 'motorbike' ? 0.02 : 0.61

      character.setVisible(true)

      character.setPosition(
        player.x + f.x * rearOffset,
        seatOffsetY,
        player.z + f.z * rearOffset,
        player.yaw
      )

      character.animateRiding(dt, v.kind, Math.abs(v.velocity))
    }

    const actualDistance = Math.hypot(v.x - beforeX, v.z - beforeZ)

    earnDistance += actualDistance

    if (earnDistance >= 110) {
      const rewardCount = Math.floor(earnDistance / 110)

      earnDistance -= rewardCount * 110

      data.coins += rewardCount * 6
      saveWallet()

      notice(`+${rewardCount * 6} coins for exploring!`)
    }
  } else {
    const speed = i.fast ? 14.1 : 7.9

    const turn = Number(i.right) - Number(i.left)

    player.yaw = turnYaw(player.yaw, turn, 2.65, dt)

    const f = forward(player.yaw)

    const move = Number(i.forward) - Number(i.back)

    const d = move * speed * dt

    const bounds = player.inside
      ? {
          minX: -7,
          maxX: 7,
          minZ: -5.9,
          maxZ: 5.9
        }
      : worldBounds

    const r = player.inside ? 0.45 : 0.65

    if (player.roofPad) {
      const pad = player.roofPad

      const nx = player.x + f.x * d
      const nz = player.z + f.z * d

      if (Math.abs(nx - pad.x) < 10.2 && Math.abs(nz - pad.z) < 11.2) {
        player.x = nx
        player.z = nz
      }

      integrateJump(player, dt, -25, pad.y)
    } else {
      const nx = player.x + f.x * d
      const nz = player.z + f.z * d

      const stairY = player.inside
        ? world.insideBaseY
        : world.groundHeightAt(nx, nz, player.y)

      if (!player.inside && stairY > 0.3 && world.watchtower) {
        const wt = world.watchtower

        const radius = Math.hypot(nx - wt.x, nz - wt.z)

        const onDeck =
          player.y >= wt.topY - 1.5 && radius <= wt.outerRadius + 0.1

        const onRamp =
          radius >= wt.coreRadius - 0.1 && radius <= wt.outerRadius + 0.2

        if (onDeck || onRamp) {
          player.x = nx
          player.z = nz
        }
      } else {
        const result = sweptMove(
          player,
          f.x * d,
          f.z * d,
          r,
          world.getCollisionBoxes(player.inside),
          bounds
        )

        if (player.inside || !world.waterBlocked(result.x, result.z)) {
          player.x = result.x
          player.z = result.z
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

  autosaveTimer += dt

  if (autosaveTimer > 10) {
    autosaveTimer = 0

    if (!player.inside && !player.roofPad) {
      saveProgress()
    }
  }
}

function renderCamera (dt) {
  const a = player.yaw + orbit

  const focusHeight = player.ride?.batch1 ? Math.max(2.6, player.ride.length * .14) : 1.85
  const focus = new THREE.Vector3(player.x, player.y + focusHeight, player.z)

  const range = player.inside ? Math.min(zoom, 8) : player.ride?.batch1 ? Math.max(zoom, player.ride.length * .88) : zoom

  const altitude = Math.max(2.5, range * (0.52 + verticalAngle))

  const desired = new THREE.Vector3(
    player.x - Math.sin(a) * range,
    player.y + altitude,
    player.z + Math.cos(a) * range
  )

  camera.position.lerp(desired, Math.min(1, dt * 8))

  camera.lookAt(focus)
}

const map = $('minimap')
const ctx = map.getContext('2d')

function drawMap () {
  const w = map.width
  const h = map.height
  const extent = MAP_HALF

  const X = x => ((x + extent) / (2 * extent)) * w

  const Z = z => ((z + extent) / (2 * extent)) * h

  ctx.fillStyle = '#9eb78b'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#5195af'

  ctx.fillRect(X(RIVER.minX), 0, X(RIVER.maxX) - X(RIVER.minX), h)

  ctx.strokeStyle = '#526670'
  ctx.lineWidth = 3

  for (const x of ROADS_X) {
    ctx.beginPath()
    ctx.moveTo(X(x), Z(-extent + 20))
    ctx.lineTo(X(x), Z(extent - 20))
    ctx.stroke()
  }

  for (const z of ROADS_Z) {
    ctx.beginPath()
    ctx.moveTo(X(-832), Z(z))
    ctx.lineTo(X(extent - 20), Z(z))
    ctx.stroke()
  }

  const dx = PALACE.x - PALACE.outerHalf

  const dz = PALACE.z - PALACE.outerHalf

  ctx.fillStyle = '#428ca9'

  ctx.fillRect(
    X(dx),
    Z(dz),
    (PALACE.outerHalf / extent) * w,
    (PALACE.outerHalf / extent) * h
  )

  ctx.fillStyle = '#9fb58a'

  ctx.fillRect(
    X(PALACE.x - PALACE.innerHalf),
    Z(PALACE.z - PALACE.innerHalf),
    (PALACE.innerHalf / extent) * w,
    (PALACE.innerHalf / extent) * h
  )

  ctx.strokeStyle = '#a05243'
  ctx.lineWidth = 1.7

  ctx.strokeRect(
    X(PALACE.x - PALACE.wallHalf),
    Z(PALACE.z - PALACE.wallHalf),
    (PALACE.wallHalf / extent) * w,
    (PALACE.wallHalf / extent) * h
  )

  for (const bridge of BRIDGES) {
    const len = bridge.axis === 'z' ? 14 : 42

    const dep = bridge.axis === 'z' ? 42 : 14

    ctx.fillStyle = '#efe0b8'

    ctx.fillRect(
      X(bridge.x - len / 2),
      Z(bridge.z - dep / 2),
      (len / (2 * extent)) * w,
      (dep / (2 * extent)) * h
    )
  }

  const airport = world.airport
  ctx.fillStyle = '#374951'

  ctx.fillRect(
    X(airport.x - airport.runwayWidth / 2),
    Z(airport.z - airport.runwayLength / 2),
    (airport.runwayWidth / (2 * extent)) * w,
    (airport.runwayLength / (2 * extent)) * h
  )

  ctx.fillStyle = data.ownPlot ? '#50bc91' : '#f7d875'

  ctx.fillRect(
    X(world.plot.x - 14),
    Z(world.plot.z - 15),
    (28 / (2 * extent)) * w,
    (30 / (2 * extent)) * h
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
  const destination = mission ? mission.destination : world.depot

  const meters = Math.round(distance2(player, destination))

  $('coins').textContent = Math.floor(data.coins).toLocaleString()

  $('jobs').textContent = data.jobs

  $('objective').textContent = mission
    ? `Deliver to ${destination.name}`
    : 'Pick up a delivery'

  $('objectiveDetail').textContent = player.inside
    ? 'Head outside to continue your mission'
    : `${destination.name} · ${meters}m away${
        mission ? ` · +${mission.reward} coins` : ''
      }`

  $('meters').textContent = `${meters}m`

  $('questProgress').style.width = `${clamp(100 - meters / 3, 6, 100)}%`

  $('stateLabel').textContent = player.inside
    ? 'INSIDE BUILDING'
    : player.ride
    ? player.ride.name.toUpperCase()
    : 'EXPLORING'

  $('stateDetail').textContent = player.inside
    ? world.getInteriorLabel()
    : player.ride
    ? (player.ride.kind === 'plane'
        ? `${vehicleSpeedMph(player.ride).toFixed(1)} mph · ALT ${gameAltitudeKm(player.ride.alt).toFixed(2)} km · GEAR ${(player.ride.alt || 0) >= FLIGHT_RULES.gearAltitude ? 'UP' : 'DOWN'} · ${player.ride.flightPhase || 'GROUND'}` // ML_V1062_PLANE_SPEED
        : player.ride.kind === 'helicopter'
        ? `${vehicleSpeedMph(player.ride).toFixed(1)} mph · ALT ${gameAltitudeKm(player.ride.alt).toFixed(2)} km · ${player.ride.onPad || (player.ride.alt || 0) <= 0.3 ? 'LANDED' : 'FLIGHT'}`
        : `${vehicleSpeedMph(player.ride).toFixed(1)} mph · STOP TO EXIT`)
    : `WALK · RUN · JUMP · ${character.avatarName.toUpperCase()}`

  $('location').textContent = player.inside
    ? world.getInteriorLabel()
    : player.x < RIVER.maxX + 30
    ? 'IRRAWADDY RIVERSIDE'
    : Math.abs(player.x - PALACE.x) < 215 && Math.abs(player.z - PALACE.z) < 215
    ? 'MANDALAY ROYAL PALACE'
    : player.x > 255 && player.x < 635 && player.z > -655 && player.z < 255
    ? 'MANDALAY INTERNATIONAL AIRFIELD'
    : Math.abs(player.x) > 220 || Math.abs(player.z) > 220
    ? 'MANDALAY · OUTER DISTRICT'
    : 'MANDALAY · DOWNTOWN DISTRICT'

  $('gameTime').textContent = formatClock(dayNight.time)

  $('gamePhase').textContent = dayNight.phase

  $('weatherStatus').textContent = weather.label

  let hint = 'Find a vehicle or doorway · E / INTERACT'

  if (player.roofPad) {
    hint = 'E re-board helicopter · R return to street'
  } else if (player.inside) {
    hint = world.nearStairs(player)
      ? `E up · Q down · Floor ${world.interiorFloor + 1}/${
          world.maxInteriorFloors
        }`
      : 'Find the door to exit / stairs to change floors'
  } else if (player.ride) {
    hint = (player.ride.kind === 'plane' || player.ride.kind === 'helicopter') &&
      player.ride.alt > 1 &&
      !player.ride.onPad
      ? 'Land aircraft before exiting (Shift to descend)'
      : isVehicleStopped(player.ride)
      ? 'E / INTERACT to exit vehicle'
      : `Moving ${vehicleSpeedMph(player.ride).toFixed(1)} mph · STOP before exit`
  } else if (trafficV9.nearest(player, 8.5)) {
    hint = `E to drive ${trafficV9.nearest(player, 8.5).name}`
  } else if (world.getNearDoor(player)) {
    hint = `E to enter ${world.getNearDoor(player).name}`
  } else {
    const nearBoardable = aircraftV10.nearestBoardable(player, fleet.nearest(player, 6.5))
    if (nearBoardable) {
      hint = `E to ride ${nearBoardable.name}`
    }
  }

  if (nearPlot()) {
    hint = data.ownPlot
      ? data.house
        ? 'T plant tree (house already built)'
        : 'H build house for 220 coins'
      : 'B buy land for 120 coins'
  }

  if (!mission && nearPoint(world.depot, 14)) {
    hint = 'F / DELIVERY to pick up parcel'
  }

  if (mission && nearPoint(mission.destination, 14)) {
    hint = 'F / DELIVERY to complete job'
  }

  $('interaction').textContent = hint
  drawMap()
}

function frame (now) {
  requestAnimationFrame(frame)

  const dt = clamp((now - lastTime) / 1000 || 1 / 60, 0.001, 0.045)

  lastTime = now

  if (playing && !paused) {
    simulate(dt)
  } else {
    clock += dt * 0.12
  }

  renderCamera(dt)
  renderer.render(scene, camera)

  if (++frames % 8 === 0) {
    hud()
  }

  if (toastTime > 0) {
    toastTime -= dt

    if (toastTime <= 0) {
      $('toast')?.classList.remove('show')
    }
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
