import * as THREE from 'three'
import { mat, piece, group } from './visual.js'

const AVATARS = [
  {
    id: 'shirt_male',
    label: 'Classic Collared Shirt',
    shirt: 0xe2e8f0,
    pants: 0x334155,
    skin: 0xd9a077,
    hair: 0x1e293b,
    shoes: 0x475569
  },
  {
    id: 'blazer_female',
    label: 'Royal Blazer',
    shirt: 0x9e2b25,
    pants: 0x1e293b,
    skin: 0xe5b28e,
    hair: 0x291d18,
    shoes: 0x1e1b18
  },
  {
    id: 'jacket_senior',
    label: 'Olive Field Jacket',
    shirt: 0x4d6b53,
    pants: 0x3f3f46,
    skin: 0xc98e65,
    hair: 0x94a3b8,
    shoes: 0x27272a
  },
  {
    id: 'rainbow_female',
    label: 'Saffron & Teal Outfit',
    shirt: 0xeab308,
    pants: 0x0f766e,
    skin: 0xdba57e,
    hair: 0x1c1917,
    shoes: 0xf8fafc
  },
  {
    id: 'sport_male',
    label: 'Cobalt Sport Kit',
    shirt: 0x2563eb,
    pants: 0x1e293b,
    skin: 0xd2976e,
    hair: 0x0f172a,
    shoes: 0xef4444
  },
  {
    id: 'olive_female',
    label: 'Emerald Tunic',
    shirt: 0x059669,
    pants: 0x374151,
    skin: 0xe2ae88,
    hair: 0x3b2316,
    shoes: 0x78350f
  }
]

export function buildHumanAvatar (parent, preset) {
  const root = group(parent)
  const skinMat = mat(preset.skin, { roughness: 0.65 })
  const shirtMat = mat(preset.shirt, { roughness: 0.55 })
  const pantsMat = mat(preset.pants, { roughness: 0.65 })
  const hairMat = mat(preset.hair, { roughness: 0.7 })
  const shoeMat = mat(preset.shoes, { roughness: 0.5 })

  // Pelvis & Belt
  piece(root, 'sphere', pantsMat, [0, 1.02, 0], [0.42, 0.24, 0.28], {
    cast: true
  })
  piece(root, 'cylinder', 0x1e293b, [0, 1.1, 0], [0.4, 0.06, 0.27])

  // Sculpted Torso, Chest, Collar & Shirt Pocket
  piece(root, 'cylinder', shirtMat, [0, 1.38, 0], [0.44, 0.54, 0.28], {
    cast: true
  })
  piece(root, 'sphere', shirtMat, [0, 1.56, 0], [0.48, 0.26, 0.3], {
    cast: true
  })
  piece(root, 'box', shirtMat, [0.11, 1.48, -0.145], [0.1, 0.11, 0.02]) // breast pocket
  piece(root, 'cylinder', skinMat, [0, 1.71, 0], [0.14, 0.16, 0.14]) // neck
  piece(root, 'torus', shirtMat, [0, 1.66, 0], [0.22, 0.22, 0.18], {
    rot: [Math.PI / 2 + 0.15, 0, 0]
  }) // collar

  // Head, Hair, Eyes & Ears
  const head = group(root, 0, 1.9, 0)
  piece(head, 'sphere', skinMat, [0, 0, 0], [0.25, 0.3, 0.27], { cast: true })
  piece(head, 'sphere', hairMat, [0, 0.04, 0.02], [0.265, 0.28, 0.28])
  for (const side of [-1, 1]) {
    piece(
      head,
      'sphere',
      0x0f172a,
      [side * 0.055, 0.02, -0.125],
      [0.028, 0.028, 0.02]
    )
    piece(head, 'sphere', skinMat, [side * 0.125, 0, 0.01], [0.03, 0.06, 0.04])
  }

  // Articulated Arms (Shoulder -> Upper Arm -> Forearm -> Hand)
  function makeArm (side) {
    const shoulder = group(root, side * 0.27, 1.58, 0)
    piece(shoulder, 'sphere', shirtMat, [0, 0, 0], [0.14, 0.14, 0.14], {
      cast: true
    })
    piece(
      shoulder,
      'cylinder',
      shirtMat,
      [side * 0.02, -0.16, 0],
      [0.11, 0.3, 0.11],
      { cast: true }
    )
    piece(
      shoulder,
      'cylinder',
      shirtMat,
      [side * 0.03, -0.38, 0],
      [0.095, 0.26, 0.095],
      { cast: true }
    )
    piece(
      shoulder,
      'sphere',
      skinMat,
      [side * 0.03, -0.54, 0],
      [0.085, 0.11, 0.065]
    )
    return shoulder
  }

  // Articulated Legs (Hip -> Thigh -> Calf -> Shoe)
  function makeLeg (side) {
    const hip = group(root, side * 0.11, 0.98, 0)
    piece(hip, 'cylinder', pantsMat, [0, -0.24, 0], [0.16, 0.46, 0.17], {
      cast: true
    })
    piece(hip, 'cylinder', pantsMat, [0, -0.66, 0], [0.13, 0.44, 0.14], {
      cast: true
    })
    piece(hip, 'box', shoeMat, [0, -0.92, -0.05], [0.14, 0.1, 0.28], {
      cast: true
    })
    return hip
  }

  return {
    root,
    rig: {
      armLeft: makeArm(-1),
      armRight: makeArm(1),
      legLeft: makeLeg(-1),
      legRight: makeLeg(1)
    }
  }
}

export class Character {
  constructor (scene) {
    this.root = group(scene)
    this.model = group(this.root)
    this.phase = 0
    this.avatarIndex = 0
    this.loaded = true
    this.rig = null
    this.loadAvatar(0)
  }

  loadAvatar (index) {
    this.avatarIndex = index % AVATARS.length
    this.model.clear()
    const built = buildHumanAvatar(this.model, AVATARS[this.avatarIndex])
    this.rig = built.rig
    this.loaded = true
  }

  setPosition (x, y, z, yaw) {
    this.root.position.set(x, y, z)
    this.root.rotation.y = -yaw
  }

  setVisible (v) {
    this.root.visible = v
  }

  changeOutfit () {
    this.loadAvatar((this.avatarIndex + 1) % AVATARS.length)
    return this.avatarName
  }

  get avatarName () {
    return AVATARS[this.avatarIndex].label
  }

  animateRiding (dt, kind, speed) {
    if (!this.rig || !this.loaded) return
    const { armLeft, armRight, legLeft, legRight } = this.rig
    const lerp = (n, target) => {
      n.rotation.x = THREE.MathUtils.lerp(
        n.rotation.x,
        target,
        Math.min(1, dt * 10)
      )
    }
    lerp(armLeft, -0.78)
    lerp(armRight, -0.78)
    const cycle =
      kind === 'bicycle'
        ? Math.sin(performance.now() * 0.008 * Math.max(0.2, speed / 11)) * 0.22
        : 0
    lerp(legLeft, 0.68 + cycle)
    lerp(legRight, 0.68 - cycle)
    this.model.rotation.x = 0.14
    this.model.position.y = 0
  }

  resetRiding () {
    this.model.rotation.x = 0
  }

  animate (dt, speedRatio, onGround, t) {
    if (!this.rig || !this.loaded) return
    const p = THREE.MathUtils.clamp(speedRatio, 0, 1)
    this.phase += dt * (p > 0.6 ? 12 : 8) * Math.max(p, 0.1)
    const swing = Math.sin(this.phase) * p * 0.68
    const { armLeft, armRight, legLeft, legRight } = this.rig
    const blend = Math.min(1, dt * 12)
    const pose = onGround
      ? { al: -swing * 0.72, ar: swing * 0.72, ll: swing, lr: -swing }
      : { al: -0.75, ar: -0.75, ll: -0.28, lr: 0.26 }
    armLeft.rotation.x = THREE.MathUtils.lerp(
      armLeft.rotation.x,
      pose.al,
      blend
    )
    armRight.rotation.x = THREE.MathUtils.lerp(
      armRight.rotation.x,
      pose.ar,
      blend
    )
    legLeft.rotation.x = THREE.MathUtils.lerp(
      legLeft.rotation.x,
      pose.ll,
      blend
    )
    legRight.rotation.x = THREE.MathUtils.lerp(
      legRight.rotation.x,
      pose.lr,
      blend
    )
    this.model.position.y =
      (onGround ? Math.abs(Math.sin(this.phase * 2)) * 0.04 * p : 0) +
      Math.sin(t * 1.8) * 0.011
    this.model.rotation.z = onGround ? -Math.sin(this.phase) * 0.015 * p : 0
  }
}

export { AVATARS }
