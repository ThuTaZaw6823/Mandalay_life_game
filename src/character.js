import * as THREE from 'three'
import { decorateMandalayHero } from './v104-character-visuals.js' // ML_V104_CHARACTER_VISUALS

// V7 articulated character system
const AVATARS = [
  {
    id: 'shirt_male',
    label: 'Mandalay Streetwear — Male',
    shirt: 0x292d37,
    pants: 0x373a42,
    skin: 0xd6a080,
    hair: 0x171922,
    shoes: 0xf2f2f3
  },
  {
    id: 'blazer_female',
    label: 'Mandalay Streetwear — Female',
    shirt: 0xd4c8d4,
    pants: 0x45404b,
    skin: 0xe1af90,
    hair: 0x252029,
    shoes: 0xf4f1ec
  },
  {
    id: 'jacket_senior',
    label: 'Olive Field Jacket',
    shirt: 0x63785c,
    pants: 0x434b4f,
    skin: 0xc89169,
    hair: 0x858e90,
    shoes: 0x343433
  },
  {
    id: 'rainbow_female',
    label: 'Saffron & Teal Outfit',
    shirt: 0xe5b237,
    pants: 0x167971,
    skin: 0xd8a47d,
    hair: 0x262020,
    shoes: 0xf0eee6
  },
  {
    id: 'sport_male',
    label: 'Cobalt Sport Kit',
    shirt: 0x3274d8,
    pants: 0x243e53,
    skin: 0xd29a76,
    hair: 0x20252b,
    shoes: 0xb84245
  },
  {
    id: 'olive_female',
    label: 'Emerald Tunic',
    shirt: 0x27866f,
    pants: 0x434653,
    skin: 0xe0ad89,
    hair: 0x35261f,
    shoes: 0x754c30
  }
]

const UP = new THREE.Vector3(0, 1, 0)
const V = (x, y, z) => new THREE.Vector3(x, y, z)

function material (color, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness
  })
}

function mesh (parent, geometry, mat, pos, scale) {
  const m = new THREE.Mesh(geometry, mat)
  m.position.set(...pos)
  if (scale) m.scale.set(...scale)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

function ellipsoid (parent, mat, p, s) {
  return mesh(parent, new THREE.SphereGeometry(1, 14, 10), mat, p, s)
}

function joint (parent, mat, radius = 0.11) {
  return ellipsoid(parent, mat, [0, 0, 0], [radius, radius, radius])
}

function section (parent, mat, radiusTop, radiusBottom) {
  return mesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 10),
    mat,
    [0, 0, 0]
  )
}

function setSection (obj, a, b) {
  const delta = b.clone().sub(a)

  obj.position.copy(a).add(b).multiplyScalar(0.5)
  obj.quaternion.setFromUnitVectors(UP, delta.clone().normalize())
  obj.scale.set(1, delta.length(), 1)
}

function createLimb (
  parent,
  mainMat,
  endMat,
  upperSize,
  lowerSize,
  isLeg = false
) {
  const upper = section(parent, mainMat, upperSize, upperSize * 0.88)

  const lower = section(parent, mainMat, lowerSize, lowerSize * 0.85)

  const middle = joint(parent, mainMat, lowerSize * 1.1)

  const end = isLeg
    ? mesh(parent, new THREE.BoxGeometry(0.19, 0.12, 0.34), endMat, [0, 0, 0])
    : ellipsoid(parent, endMat, [0, 0, 0], [0.095, 0.13, 0.075])

  return {
    upper,
    lower,
    middle,
    end,
    a: V(0, 0, 0),
    b: V(0, 0, 0),
    c: V(0, 0, 0),
    initialized: false,
    isLeg
  }
}

function moveLimb (limb, a, b, c, dt = 1) {
  const t = limb.initialized ? Math.min(1, dt * 14) : 1

  limb.a.lerp(a, t)
  limb.b.lerp(b, t)
  limb.c.lerp(c, t)
  limb.initialized = true

  setSection(limb.upper, limb.a, limb.b)
  setSection(limb.lower, limb.b, limb.c)

  limb.middle.position.copy(limb.b)
  limb.end.position.copy(limb.c)

  if (limb.isLeg) limb.end.position.z -= 0.1
}

export function buildHumanAvatar (parent, preset) {
  const root = new THREE.Group()
  parent.add(root)

  const skin = material(preset.skin)
  const shirt = material(preset.shirt)
  const pants = material(preset.pants)
  const hair = material(preset.hair)
  const shoes = material(preset.shoes)
  const dark = material(0x303439)
  const white = material(0xf4f1e9)

  // Pelvis
  ellipsoid(root, pants, [0, 1.02, 0], [0.31, 0.22, 0.22])

  // Connected torso that leans from the hips
  const torso = new THREE.Group()
  torso.position.y = 1.02
  root.add(torso)

  mesh(
    torso,
    new THREE.CylinderGeometry(0.31, 0.24, 0.68, 12),
    shirt,
    [0, 0.37, 0],
    [1.1, 1, 0.85]
  )

  ellipsoid(torso, shirt, [0, 0.61, 0], [0.37, 0.2, 0.25])

  mesh(
    torso,
    new THREE.CylinderGeometry(0.11, 0.13, 0.2, 10),
    skin,
    [0, 0.78, 0]
  )

  for (const side of [-1, 1]) {
    ellipsoid(torso, shirt, [side * 0.31, 0.63, 0], [0.12, 0.13, 0.15])
  }

  // Face and hair
  const head = new THREE.Group()
  head.position.set(0, 0.96, -0.015)
  torso.add(head)

  ellipsoid(head, skin, [0, 0, 0], [0.245, 0.302, 0.25])

  ellipsoid(head, hair, [0, 0.18, 0.028], [0.254, 0.16, 0.25])

  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.24, 0.005, 0], [0.04, 0.072, 0.058])

    ellipsoid(head, white, [side * 0.086, 0.02, -0.226], [0.052, 0.035, 0.014])

    ellipsoid(head, dark, [side * 0.086, 0.017, -0.241], [0.021, 0.024, 0.012])

    mesh(head, new THREE.BoxGeometry(0.095, 0.016, 0.017), hair, [
      side * 0.087,
      0.1,
      -0.234
    ])
  }

  ellipsoid(head, skin, [0, -0.072, -0.245], [0.052, 0.085, 0.043])

  mesh(head, new THREE.BoxGeometry(0.1, 0.016, 0.015), dark, [0, -0.16, -0.23])

  const arms = [
    createLimb(root, shirt, skin, 0.12, 0.095),
    createLimb(root, shirt, skin, 0.12, 0.095)
  ]

  const legs = [
    createLimb(root, pants, shoes, 0.16, 0.125, true),
    createLimb(root, pants, shoes, 0.16, 0.125, true)
  ]

  const rig = {
    torso,
    head,
    arms,
    legs,
    root
  }

  poseRig(rig, 'standing', 0, 0, 1)

  // V10.4: Keep the same limb rig and animation functions.
  if (preset.id === 'shirt_male' || preset.id === 'blazer_female') {
    decorateMandalayHero(
      rig,
      preset,
      preset.id === 'blazer_female' ? 'female' : 'male'
    )
  }

  return { root, rig }
}

function poseRig (rig, mode, phase, speed, dt) {
  const bike = mode === 'bicycle'
  const motor = mode === 'motorbike'
  const riding = bike || motor

  const pedal = bike ? Math.sin(phase) * 0.15 : 0

  const swing = riding ? 0 : Math.sin(phase) * speed * 0.25

  // Negative torso X leans the upper body FORWARD.
  const targetLean = motor ? -0.24 : bike ? -0.37 : speed > 0.1 ? -0.06 : 0

  const blend = Math.min(1, dt * 9)

  rig.torso.rotation.x = THREE.MathUtils.lerp(
    rig.torso.rotation.x,
    targetLean,
    blend
  )

  rig.head.rotation.x = THREE.MathUtils.lerp(
    rig.head.rotation.x,
    riding ? 0.1 : 0,
    blend
  )

  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1

    const shoulderY = 1.02 + 0.63 * Math.cos(rig.torso.rotation.x)

    const shoulderZ = 0.63 * Math.sin(rig.torso.rotation.x)

    const shoulder = V(side * 0.34, shoulderY, shoulderZ)

    let elbow, wrist

    // Motorbike: reach forward to the handlebar.
    if (motor) {
      elbow = V(side * 0.43, 1.32, -0.62)
      wrist = V(side * 0.52, 1.1, -1.18)
    }
    // Bicycle: lean forward and lower the hands.
    else if (bike) {
      elbow = V(side * 0.41, 1.31, -0.64)
      wrist = V(side * 0.45, 1.0, -1.01)
    }
    // Walking / standing
    else {
      elbow = V(side * 0.39, 1.29, side * swing)
      wrist = V(side * 0.42, 1.03, side * swing * 1.55)
    }

    moveLimb(rig.arms[i], shoulder, elbow, wrist, dt)

    const hip = V(side * 0.18, 1.01, 0)
    let knee, ankle

    if (motor) {
      knee = V(side * 0.26, 0.57, -0.27)
      ankle = V(side * 0.32, 0.24, -0.22)
    } else if (bike) {
      knee = V(side * 0.21, 0.55 + side * pedal, -0.36)
      ankle = V(side * 0.22, 0.16 + side * pedal, -0.21)
    } else {
      knee = V(side * 0.18, 0.55, -side * swing * 0.85)
      ankle = V(side * 0.18, 0.12, -side * swing * 1.7)
    }

    moveLimb(rig.legs[i], hip, knee, ankle, dt)
  }
}

export class Character {
  constructor (scene) {
    this.root = new THREE.Group()
    scene.add(this.root)

    this.model = new THREE.Group()
    this.root.add(this.model)

    this.phase = 0
    this.avatarIndex = 0
    this.loaded = false
    this.rig = null

    this.loadAvatar(0)
  }

  loadAvatar (index) {
    const geometries = new Set()
    const materials = new Set()

    this.model.traverse(obj => {
      if (obj.isMesh) {
        geometries.add(obj.geometry)

        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => materials.add(m))
        } else {
          materials.add(obj.material)
        }
      }
    })

    this.model.clear()

    geometries.forEach(g => g.dispose())
    materials.forEach(m => m.dispose())

    this.avatarIndex =
      ((index % AVATARS.length) + AVATARS.length) % AVATARS.length

    this.rig = buildHumanAvatar(this.model, AVATARS[this.avatarIndex]).rig

    this.loaded = true
  }

  setPosition (x, y, z, yaw) {
    this.root.position.set(x, y, z)
    this.root.rotation.y = -yaw
  }

  setVisible (value) {
    this.root.visible = value
  }

  changeOutfit () {
    this.loadAvatar(this.avatarIndex + 1)
    return this.avatarName
  }

  get avatarName () {
    return AVATARS[this.avatarIndex].label
  }

  animateRiding (dt, kind, speed) {
    if (!this.loaded) return

    this.phase += dt * Math.max(1, speed * (kind === 'bicycle' ? 0.8 : 0.2))

    poseRig(this.rig, kind, this.phase, 0, dt)

    this.model.position.y = THREE.MathUtils.lerp(
      this.model.position.y,
      kind === 'motorbike' ? 0.24 : 0,
      Math.min(1, dt * 10)
    )
  }

  resetRiding () {
    this.model.position.y = 0

    if (this.rig) {
      poseRig(this.rig, 'standing', this.phase, 0, 1)
    }
  }

  animate (dt, speedRatio, grounded, time) {
    if (!this.loaded) return

    const s = THREE.MathUtils.clamp(speedRatio, 0, 1)

    this.phase += dt * (s > 0.6 ? 11 : 7) * Math.max(s, 0.1)

    poseRig(this.rig, 'standing', this.phase, grounded ? s : 0.12, dt)

    const bob = grounded ? Math.abs(Math.sin(this.phase * 2)) * 0.028 * s : 0

    this.model.position.y = bob + Math.sin(time * 1.8) * 0.008
  }
}

export { AVATARS }
