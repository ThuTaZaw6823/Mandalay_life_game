import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  helicopterVisual,
  carVisual,
  bicycleVisual,
  planeVisual,
  planeVariant
} from './vehicles.js'
import { buildHumanAvatar, AVATARS } from './character.js'
import { buildModernVilla } from './world.js'
import { makeRiverBoat } from './riverboats.js'

const catalog = [
  ['car', '01 · Red Sports Coupe'],
  ['bus', '02 · Yellow School Bus'],
  ['motorbike', '03 · Custom Cruiser Motorbike'],
  ['bicycle', '04 · Mountain Bike (MTB)'],
  ['trainer', '05 · High-Wing Trainer Plane'],
  ['twin', '06 · Royal Mandalay Twin-Prop'],
  ['jet', '07 · Pilatus PC-24 Executive Jet'],
  ['cargo', '08 · Heavy Cargo Jet (C-17)'],
  ['helicopter', '09 · City Helicopter'],
  ['ferry', '10 · River Passenger Ferry'],
  ['cargo_boat', '11 · River Cargo Barge'],
  ['fishing', '12 · Fishing Boat'],
  ['villa_0', '13 · Modern Green-Roof Villa'],
  ['villa_1', '14 · Luxury Terracotta Villa'],
  ['villa_2', '15 · Contemporary Balcony Villa'],
  ...AVATARS.map((a, i) => [
    `avatar_${i}`,
    `${String(16 + i).padStart(2, '0')} · ${a.label}`
  ])
]

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.45
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x243847)

const camera = new THREE.PerspectiveCamera(
  46,
  innerWidth / innerHeight,
  0.05,
  300
)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.autoRotate = true
controls.autoRotateSpeed = 1.4

scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x45554b, 2.2))
const light = new THREE.DirectionalLight(0xffe9ca, 3.4)
light.position.set(-6, 13, 10)
light.castShadow = true
light.shadow.mapSize.set(1024, 1024)
light.shadow.camera.left = -16
light.shadow.camera.right = 16
light.shadow.camera.top = 16
light.shadow.camera.bottom = -16
scene.add(light)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(20, 64),
  new THREE.MeshStandardMaterial({ color: 0x344e55, roughness: 0.9 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.035
floor.receiveShadow = true
scene.add(floor)

const selector = document.getElementById('modelSelect')
for (let i = 0; i < catalog.length; i++) {
  const op = document.createElement('option')
  op.value = i
  op.textContent = catalog[i][1]
  selector.append(op)
}

let current = null,
  rotor = null,
  tailRotor = null,
  props = [],
  index = 0

function fitCameraTo (obj) {
  const box = new THREE.Box3().setFromObject(obj)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const radius = Math.max(size.x, size.y, size.z)
  const target = new THREE.Vector3(center.x, Math.max(0.2, center.y), center.z)
  controls.target.copy(target)
  camera.position.set(
    target.x + radius * 0.9,
    target.y + radius * 0.46,
    target.z - radius * 1.42
  )
  camera.near = 0.03
  camera.far = 300
  camera.updateProjectionMatrix()
  controls.minDistance = Math.max(0.9, radius * 0.7)
  controls.maxDistance = Math.max(12, radius * 7)
  controls.update()
}

function show (n) {
  index = (n + catalog.length) % catalog.length
  selector.value = index
  const [id, label] = catalog[index]
  document.getElementById('error').style.display = 'none'
  rotor = null
  tailRotor = null
  props = []

  if (current) scene.remove(current)
  const holder = new THREE.Group()
  scene.add(holder)

  if (id === 'car') carVisual(holder, 0xe63935, false)
  else if (id === 'bus') carVisual(holder, 0xf6b918, true)
  else if (id === 'motorbike') bicycleVisual(holder, true, 0x1e293b)
  else if (id === 'bicycle') bicycleVisual(holder, false, 0x38bdf8)
  else if (id === 'trainer') props.push(planeVisual(holder).prop)
  else if (id === 'twin' || id === 'jet' || id === 'cargo')
    props.push(...planeVariant(holder, id).propellers)
  else if (id === 'helicopter') {
    const res = helicopterVisual(holder)
    rotor = res.rotor
    tailRotor = res.tail
  } else if (id.startsWith('villa_')) {
    buildModernVilla(holder, Number(id.split('_')[1]))
  } else if (id.startsWith('avatar_')) {
    buildHumanAvatar(holder, AVATARS[Number(id.split('_')[1])])
  } else {
    makeRiverBoat(holder, id === 'cargo_boat' ? 'cargo' : id)
  }

  current = holder
  fitCameraTo(current)
  document.getElementById('modelName').textContent =
    label + ' · Mandalay Life v5.0 3D Asset'
}

document.getElementById('prev').onclick = () => show(index - 1)
document.getElementById('next').onclick = () => show(index + 1)
selector.onchange = () => show(Number(selector.value))
controls.addEventListener('start', () => {
  controls.autoRotate = false
})
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') show(index - 1)
  if (e.key === 'ArrowRight') show(index + 1)
})
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

let last = performance.now()
function frame (now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (rotor) rotor.rotation.y += dt * 14
  if (tailRotor) tailRotor.rotation.x += dt * 20
  for (const p of props) p.rotation.z += dt * 18
  controls.update()
  renderer.render(scene, camera)
}
show(0)
frame(last)
