import * as THREE from 'three'
import { FLIGHT_RULES, syncLandingGear, smoothPlaneVelocity, planeTargetSpeedMph, advancePlaneTouchdown } from './v106-flight-rules.js' // ML_V106_FLIGHT_RULES // ML_V1061_SMOOTH_FLIGHT // ML_V1062_PLANE_SPEED // ML_V1063_ROLLING_LANDING
import { C, mat, piece, group } from './visual.js'
import {
  distance2,
  forward,
  turnYaw,
  clamp,
  sweptMove,
  vehicleBounds
} from './physics.js'
import { MOORINGS, makeRiverBoat } from './riverboats.js'
import { RIVER, MAP_HALF } from './world.js'
import { createTrainerAircraft, createChinookAircraft, createMAIAirbus } from './aircraft-models.js'

function stick (parent, a, b, radius, color) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b),
    delta = vb.clone().sub(va)
  const mesh = piece(
    parent,
    'cylinder',
    color,
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    [radius, delta.length(), radius],
    { cast: true }
  )
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize()
  )
  return mesh
}

function latheBody (
  parent,
  points,
  color,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rot = [-Math.PI / 2, 0, 0],
  segments = 24
) {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y))
  const geo = new THREE.LatheGeometry(vecs, segments)
  const mesh = new THREE.Mesh(
    geo,
    typeof color === 'number' ? mat(color) : color
  )
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.rotation.set(...rot)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function sweptWing (
  parent,
  span,
  rootChord,
  tipChord,
  sweepBack,
  thickness,
  color,
  y = 1.4,
  z = 0,
  dihedral = 0.04
) {
  const shape = new THREE.Shape()
  shape.moveTo(0, rootChord * 0.5)
  shape.lineTo(span, rootChord * 0.5 - sweepBack)
  shape.lineTo(span, rootChord * 0.5 - sweepBack - tipChord)
  shape.lineTo(0, -rootChord * 0.5)
  shape.closePath()

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.35,
    bevelSize: 0.08,
    bevelSegments: 2
  })
  extrude.rotateX(-Math.PI / 2)

  const m =
    typeof color === 'number'
      ? mat(color, { roughness: 0.45, metalness: 0.15 })
      : color
  const rightWing = new THREE.Mesh(extrude, m)
  rightWing.position.set(0, y, z)
  rightWing.rotation.z = dihedral
  rightWing.castShadow = true
  rightWing.receiveShadow = true
  parent.add(rightWing)

  const leftWing = rightWing.clone()
  leftWing.scale.x = -1
  leftWing.rotation.z = -dihedral
  parent.add(leftWing)
  return { rightWing, leftWing }
}

function alloyWheel (
  parent,
  pos,
  rad = 0.52,
  width = 0.26,
  spokes = 5,
  rimColor = 0xd6dde0
) {
  const g = group(parent, ...pos)
  const tire = piece(
    g,
    'cylinder',
    0x1a1d20,
    [0, 0, 0],
    [rad * 2, width, rad * 2],
    { cast: true }
  )
  tire.rotation.z = Math.PI / 2
  const rim = piece(
    g,
    'cylinder',
    rimColor,
    [0, 0, 0],
    [rad * 1.42, width * 1.04, rad * 1.42]
  )
  rim.rotation.z = Math.PI / 2
  const hub = piece(
    g,
    'cylinder',
    0x262c32,
    [0, 0, 0],
    [rad * 0.48, width * 1.12, rad * 0.48]
  )
  hub.rotation.z = Math.PI / 2
  for (let i = 0; i < spokes; i++) {
    const a = (i * Math.PI * 2) / spokes
    const spoke = piece(
      g,
      'box',
      0x2f373e,
      [0, Math.cos(a) * rad * 0.35, Math.sin(a) * rad * 0.35],
      [width * 1.08, rad * 0.65, rad * 0.09]
    )
    spoke.rotation.x = a
  }
  return g
}

function spokedBikeWheel (parent, pos, rad = 0.72, width = 0.12) {
  const g = group(parent, ...pos)
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(rad - width * 0.4, width * 0.55, 10, 28),
    mat(0x22252a, { roughness: 0.85 })
  )
  tire.rotation.y = Math.PI / 2
  tire.castShadow = true
  g.add(tire)

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rad - width * 0.9, width * 0.25, 8, 28),
    mat(0x475569, { metalness: 0.6, roughness: 0.3 })
  )
  rim.rotation.y = Math.PI / 2
  g.add(rim)

  const disc = piece(
    g,
    'cylinder',
    0xcbd5e1,
    [width * 0.55, 0, 0],
    [rad * 0.58, 0.02, rad * 0.58]
  )
  disc.rotation.z = Math.PI / 2
  const hub = piece(
    g,
    'cylinder',
    0x1e293b,
    [0, 0, 0],
    [0.16, width * 1.3, 0.16]
  )
  hub.rotation.z = Math.PI / 2

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 8
    const spoke = piece(
      g,
      'box',
      0x94a3b8,
      [0, 0, 0],
      [0.02, (rad - width) * 1.9, 0.02]
    )
    spoke.rotation.x = a
  }
  return g
}

export function carVisual (parent, body = 0xf8fafc, bus = false) {
  const g = group(parent)
  const steerPivots = [],
    spinners = []

  if (bus) {
    const w = 2.68
    const yellow = mat(0xf6b918, { roughness: 0.35, metalness: 0.18 })
    const black = mat(0x1b1f23, { roughness: 0.65 })
    const chrome = mat(0xd8e0e6, { roughness: 0.2, metalness: 0.8 })
    const glass = mat(0x1f2f38, { roughness: 0.15, metalness: 0.65 })

    piece(g, 'box', yellow, [0, 1.88, 0.95], [w, 2.15, 7.1], { cast: true })
    piece(g, 'sphere', yellow, [0, 2.95, 0.95], [w * 0.98, 0.42, 7.05], {
      cast: true
    })
    piece(g, 'box', yellow, [0, 1.32, -3.55], [w * 0.86, 1.15, 2.15], {
      cast: true
    })
    piece(g, 'sphere', yellow, [0, 1.88, -3.55], [w * 0.84, 0.3, 2.1])
    piece(g, 'box', black, [0, 1.35, -4.64], [1.45, 0.95, 0.12])
    for (let gx = -0.5; gx <= 0.5; gx += 0.25) {
      piece(g, 'box', chrome, [gx, 1.35, -4.69], [0.05, 0.88, 0.06])
    }
    piece(g, 'box', black, [0, 0.64, -4.68], [w * 1.02, 0.42, 0.34], {
      cast: true
    })
    piece(g, 'box', black, [0, 0.64, 4.56], [w * 1.02, 0.42, 0.3], {
      cast: true
    })
    for (const side of [-1, 1]) {
      piece(
        g,
        'cylinder',
        yellow,
        [side * (w * 0.46), 0.95, -3.35],
        [1.45, 0.42, 1.45],
        { rot: [0, 0, Math.PI / 2], cast: true }
      )
      stick(
        g,
        [side * (w * 0.42), 1.85, -4.45],
        [side * (w * 0.54), 2.15, -4.65],
        0.04,
        chrome
      )
      piece(
        g,
        'sphere',
        black,
        [side * (w * 0.55), 2.18, -4.68],
        [0.18, 0.22, 0.14]
      )
      stick(
        g,
        [side * (w * 0.51), 2.55, -2.55],
        [side * (w * 0.64), 2.55, -2.65],
        0.04,
        chrome
      )
      stick(
        g,
        [side * (w * 0.51), 1.75, -2.55],
        [side * (w * 0.64), 1.75, -2.65],
        0.04,
        chrome
      )
      piece(
        g,
        'box',
        black,
        [side * (w * 0.64), 2.15, -2.65],
        [0.08, 0.85, 0.22]
      )
      for (const ry of [1.05, 1.55, 2.02]) {
        piece(
          g,
          'box',
          black,
          [side * (w * 0.505), ry, 0.95],
          [0.06, 0.11, 7.0]
        )
      }
      for (let wz = -1.6; wz <= 3.8; wz += 0.92) {
        piece(
          g,
          'box',
          glass,
          [side * (w * 0.502), 2.38, wz],
          [0.06, 0.68, 0.74]
        )
      }
      const hl = piece(
        g,
        'cylinder',
        0xffffff,
        [side * 0.96, 1.15, -4.62],
        [0.3, 0.12, 0.3],
        { rot: [Math.PI / 2, 0, 0] }
      )
      hl.material = mat(0xffffff, {
        emissive: 0xfef08a,
        emissiveIntensity: 0.9
      })
      piece(g, 'box', 0xf97316, [side * 0.96, 1.42, -4.6], [0.34, 0.16, 0.1])
    }
    piece(g, 'box', glass, [0, 2.32, -2.61], [w * 0.88, 0.85, 0.1])
    piece(g, 'box', black, [0, 2.92, -2.62], [1.75, 0.32, 0.12])
    piece(
      g,
      'cylinder',
      0xdc2626,
      [-w * 0.53, 1.85, -1.75],
      [0.46, 0.06, 0.46],
      { rot: [0, 0, Math.PI / 2] }
    )

    for (const side of [-1, 1]) {
      const steer = group(g, side * (w * 0.48), 0.65, -3.35)
      spinners.push(alloyWheel(steer, [0, 0, 0], 0.65, 0.32, 6, 0x262b30))
      steerPivots.push(steer)

      const rearOuter = alloyWheel(
        g,
        [side * (w * 0.5), 0.65, 2.75],
        0.65,
        0.28,
        6,
        0x262b30
      )
      const rearInner = alloyWheel(
        g,
        [side * (w * 0.36), 0.65, 2.75],
        0.65,
        0.28,
        6,
        0x262b30
      )
      spinners.push(rearOuter, rearInner)
    }
    return { g, steerPivots, spinners }
  }

  const w = 2.32,
    l = 4.95
  const pearlWhite = mat(body, { roughness: 0.26, metalness: 0.22 })
  const glass = mat(0x1e293b, { roughness: 0.12, metalness: 0.72 })
  const chrome = mat(0xe2e8f0, { roughness: 0.2, metalness: 0.85 })
  const blackTrim = mat(0x181b20, { roughness: 0.65 })

  piece(g, 'box', blackTrim, [0, 0.42, 0], [w * 0.96, 0.22, l * 0.96], {
    cast: true
  })
  piece(g, 'box', pearlWhite, [0, 0.92, 0.05], [w, 0.86, l * 0.98], {
    cast: true
  })
  piece(g, 'box', pearlWhite, [0, 1.32, -1.65], [w * 0.96, 0.36, 1.55], {
    cast: true
  })
  piece(g, 'box', pearlWhite, [0, 1.72, 0.55], [w * 0.88, 0.88, 3.35], {
    cast: true
  })

  piece(g, 'box', blackTrim, [0, 0.92, -2.46], [1.56, 0.78, 0.12])
  for (let gy = 0.64; gy <= 1.18; gy += 0.13) {
    piece(g, 'box', chrome, [0, gy, -2.51], [1.46, 0.055, 0.08])
  }
  piece(g, 'box', blackTrim, [0, 0.48, -2.47], [0.76, 0.2, 0.06])

  piece(g, 'box', glass, [0, 1.72, -1.08], [w * 0.8, 0.74, 0.75], {
    rot: [-0.46, 0, 0]
  })
  piece(g, 'box', glass, [0, 1.72, 2.22], [w * 0.78, 0.72, 0.45], {
    rot: [0.35, 0, 0]
  })
  for (const side of [-1, 1]) {
    piece(g, 'box', glass, [side * (w * 0.445), 1.72, 0.58], [0.06, 0.66, 2.85])
    piece(
      g,
      'box',
      blackTrim,
      [side * (w * 0.38), 2.22, 0.55],
      [0.08, 0.12, 2.9]
    )
    piece(g, 'box', chrome, [side * (w * 0.51), 0.48, 0.05], [0.16, 0.08, 2.4])
    piece(
      g,
      'sphere',
      pearlWhite,
      [side * (w * 0.54), 1.45, -0.78],
      [0.22, 0.18, 0.26]
    )

    const hl = piece(
      g,
      'box',
      0xffffff,
      [side * (w * 0.38), 1.16, -2.46],
      [0.46, 0.16, 0.12]
    )
    hl.material = mat(0xffffff, { emissive: 0xe0f2fe, emissiveIntensity: 1.0 })
    const tl = piece(
      g,
      'box',
      0xdc2626,
      [side * (w * 0.38), 1.25, 2.48],
      [0.44, 0.24, 0.1]
    )
    tl.material = mat(0xdc2626, { emissive: 0xef4444, emissiveIntensity: 0.7 })

    for (const z of [-1.52, 1.55]) {
      const steer = group(g, side * (w / 2 + 0.02), 0.56, z)
      const wh = alloyWheel(steer, [0, 0, 0], 0.56, 0.28, 6, 0xdbeafe)
      spinners.push(wh)
      if (z < 0) steerPivots.push(steer)
    }
  }
  return { g, steerPivots, spinners }
}

export function bicycleVisual (parent, motor = false, color = 0x38bdf8) {
  const g = group(parent)
  const steerPivots = [],
    spinners = []

  if (motor) {
    const frameBlack = mat(0x1c2024, { roughness: 0.5, metalness: 0.4 })
    const tankWhite = mat(0xf1f5f9, { roughness: 0.25, metalness: 0.2 })
    const goldFork = mat(0xd4af37, { roughness: 0.3, metalness: 0.75 })
    const chrome = mat(0x94a3b8, { roughness: 0.25, metalness: 0.85 })

    spinners.push(alloyWheel(g, [0, 0.56, 1.18], 0.56, 0.34, 6, 0x181b1e))
    const forkPivot = group(g, 0, 1.25, -0.78)
    forkPivot.rotation.x = 0.36
    for (const side of [-1, 1]) {
      piece(
        forkPivot,
        'cylinder',
        goldFork,
        [side * 0.19, -0.35, 0],
        [0.11, 0.95, 0.11],
        { cast: true }
      )
      piece(
        forkPivot,
        'cylinder',
        frameBlack,
        [side * 0.19, -0.05, 0],
        [0.14, 0.35, 0.14]
      )
    }
    piece(
      forkPivot,
      'cylinder',
      frameBlack,
      [0, -0.05, -0.14],
      [0.22, 0.26, 0.22],
      { rot: [Math.PI / 2, 0, 0] }
    )
    piece(
      forkPivot,
      'cylinder',
      frameBlack,
      [0, -0.28, -0.14],
      [0.22, 0.26, 0.22],
      { rot: [Math.PI / 2, 0, 0] }
    )
    const l1 = piece(
      forkPivot,
      'sphere',
      0xffffff,
      [0, -0.05, -0.26],
      [0.16, 0.16, 0.08]
    )
    const l2 = piece(
      forkPivot,
      'sphere',
      0xffffff,
      [0, -0.28, -0.26],
      [0.16, 0.16, 0.08]
    )
    l1.material = l2.material = mat(0xffffff, {
      emissive: 0xe0f2fe,
      emissiveIntensity: 1.2
    })

    stick(forkPivot, [-0.52, 0.16, 0.08], [0.52, 0.16, 0.08], 0.055, frameBlack)
    spinners.push(alloyWheel(forkPivot, [0, -0.76, 0], 0.54, 0.26, 6, 0x181b1e))
    steerPivots.push(forkPivot)

    piece(g, 'sphere', tankWhite, [0, 1.32, -0.28], [0.76, 0.56, 1.25], {
      cast: true
    })
    piece(g, 'box', frameBlack, [0, 0.85, 0.05], [0.64, 0.68, 1.25], {
      cast: true
    })
    piece(g, 'sphere', 0x27272a, [0, 1.06, 0.58], [0.58, 0.34, 0.88], {
      cast: true
    })
    piece(g, 'sphere', tankWhite, [0, 1.15, 1.02], [0.56, 0.38, 0.65])
    for (const side of [-1, 1]) {
      stick(
        g,
        [side * 0.28, 0.82, -0.25],
        [side * 0.34, 0.52, 0.35],
        0.08,
        frameBlack
      )
      piece(
        g,
        'cylinder',
        chrome,
        [side * 0.34, 0.52, 0.78],
        [0.16, 1.05, 0.16],
        { rot: [Math.PI / 2, 0, 0] }
      )
    }
    return { g, steerPivots, spinners }
  }

  const frameMat = mat(color, { roughness: 0.35, metalness: 0.3 })
  const forkMat = mat(0x1e293b, { roughness: 0.45, metalness: 0.5 })

  spinners.push(spokedBikeWheel(g, [0, 0.72, 1.08], 0.72, 0.11))
  stick(g, [0, 0.72, 1.08], [0, 1.36, 0.28], 0.045, frameMat)
  stick(g, [0, 0.72, 1.08], [0, 0.74, 0.14], 0.05, frameMat)
  stick(g, [0, 0.74, 0.14], [0, 1.44, 0.3], 0.065, frameMat)
  stick(g, [0, 0.74, 0.14], [0, 1.42, -0.66], 0.075, frameMat)
  stick(g, [0, 1.38, 0.28], [0, 1.5, -0.66], 0.065, frameMat)

  const crank = piece(
    g,
    'cylinder',
    0x334155,
    [0.09, 0.74, 0.14],
    [0.34, 0.04, 0.34],
    { rot: [0, 0, Math.PI / 2] }
  )
  spinners.push(crank)

  stick(g, [0, 1.44, 0.3], [0, 1.66, 0.34], 0.04, 0x334155)
  piece(g, 'box', 0x1e293b, [0, 1.7, 0.36], [0.24, 0.09, 0.52], {
    rot: [0.08, 0, 0]
  })

  const forkPivot = group(g, 0, 1.46, -0.66)
  forkPivot.rotation.x = 0.26
  for (const side of [-1, 1]) {
    stick(
      forkPivot,
      [side * 0.11, -0.05, 0],
      [side * 0.11, -0.78, 0],
      0.045,
      forkMat
    )
  }
  stick(forkPivot, [-0.46, 0.14, -0.04], [0.46, 0.14, -0.04], 0.042, 0x1e293b)
  spinners.push(spokedBikeWheel(forkPivot, [0, -0.78, 0], 0.72, 0.11))
  steerPivots.push(forkPivot)

  return { g, steerPivots, spinners }
}

export function planeVisual (parent) {
  const g = group(parent)
  const bodyWhite = mat(0xf4f5f7, { roughness: 0.4, metalness: 0.15 })
  const stripeRed = mat(0x9e2a2b, { roughness: 0.45 })
  const glass = mat(0x1e2f38, { roughness: 0.15, metalness: 0.7 })

  latheBody(
    g,
    [
      [0.01, -4.1],
      [0.38, -3.9],
      [0.62, -3.2],
      [0.76, -2.0],
      [0.78, -0.5],
      [0.68, 1.2],
      [0.44, 2.8],
      [0.22, 4.1],
      [0.02, 4.3]
    ],
    bodyWhite,
    [0, 1.32, 0],
    [1.0, 1.0, 1.12]
  )

  piece(g, 'box', stripeRed, [0, 1.26, 0.4], [1.58, 0.14, 5.8])
  sweptWing(g, 6.2, 1.65, 1.25, 0.25, 0.16, bodyWhite, 2.02, -0.45, 0.03)
  for (const side of [-1, 1]) {
    stick(
      g,
      [side * 0.68, 0.95, -0.55],
      [side * 2.85, 1.98, -0.55],
      0.06,
      0x64748b
    )
  }
  piece(g, 'box', glass, [0, 1.72, -1.62], [1.18, 0.62, 0.85], {
    rot: [-0.62, 0, 0]
  })
  for (const side of [-1, 1]) {
    piece(g, 'box', glass, [side * 0.75, 1.66, -0.55], [0.06, 0.46, 1.55])
  }
  sweptWing(g, 2.2, 0.95, 0.65, 0.35, 0.1, stripeRed, 1.48, 3.65, 0)
  piece(g, 'box', bodyWhite, [0, 2.25, 3.68], [0.14, 1.65, 1.15], {
    cast: true,
    rot: [-0.22, 0, 0]
  })
  piece(g, 'box', stripeRed, [0, 2.95, 3.82], [0.16, 0.32, 1.05], {
    rot: [-0.22, 0, 0]
  })

  const spinners = []
  for (const side of [-1, 1]) {
    stick(
      g,
      [side * 0.55, 0.88, -0.35],
      [side * 1.18, 0.36, -0.35],
      0.08,
      0x475569
    )
    piece(
      g,
      'sphere',
      stripeRed,
      [side * 1.22, 0.36, -0.35],
      [0.28, 0.34, 0.85]
    )
    spinners.push(alloyWheel(g, [side * 1.22, 0.25, -0.35], 0.25, 0.16, 5))
  }
  stick(g, [0, 0.88, -2.85], [0, 0.3, -2.95], 0.07, 0x475569)
  piece(g, 'sphere', stripeRed, [0, 0.3, -2.95], [0.24, 0.28, 0.72])
  spinners.push(alloyWheel(g, [0, 0.21, -2.95], 0.21, 0.14, 5))

  const prop = group(g, 0, 1.32, -4.55)
  piece(prop, 'cone', stripeRed, [0, 0, -0.18], [0.34, 0.45, 0.34], {
    rot: [-Math.PI / 2, 0, 0]
  })
  piece(prop, 'box', 0x27272a, [0, 0, 0], [0.14, 2.35, 0.06])
  piece(prop, 'box', 0xfacc15, [0, 1.08, 0], [0.15, 0.18, 0.07])
  piece(prop, 'box', 0xfacc15, [0, -1.08, 0], [0.15, 0.18, 0.07])
  return { g, prop, spinners }
}

export function planeVariant (parent, style) {
  const g = group(parent)
  const jet = style === 'jet',
    twin = style === 'twin'
  const propellers = [],
    spinners = []

  if (twin) {
    const crimson = mat(0x9e2b25, { roughness: 0.42, metalness: 0.18 })
    const gold = mat(0xd9a74a, { roughness: 0.38, metalness: 0.35 })
    const glass = mat(0x1b2c36, { roughness: 0.15, metalness: 0.75 })

    latheBody(
      g,
      [
        [0.01, -4.4],
        [0.42, -4.15],
        [0.74, -3.4],
        [0.92, -2.2],
        [0.95, -0.3],
        [0.84, 1.6],
        [0.54, 3.2],
        [0.26, 4.4],
        [0.02, 4.6]
      ],
      crimson,
      [0, 1.45, 0],
      [1.05, 1.0, 1.05]
    )

    piece(g, 'sphere', gold, [0, 1.42, -4.25], [0.88, 0.78, 0.85])
    piece(g, 'box', gold, [0, 1.32, 0.2], [1.96, 0.18, 6.8])
    piece(g, 'box', glass, [0, 1.92, -2.25], [1.42, 0.64, 0.95], {
      rot: [-0.55, 0, 0]
    })
    for (const side of [-1, 1]) {
      piece(g, 'box', glass, [side * 0.92, 1.82, -1.0], [0.08, 0.48, 2.2])
    }
    sweptWing(g, 7.8, 2.15, 1.45, 0.45, 0.2, crimson, 2.24, -0.35, 0.03)
    for (const side of [-1, 1]) {
      piece(g, 'box', gold, [side * 7.55, 2.46, -0.58], [0.55, 0.22, 1.45])
      const nx = side * 3.1
      latheBody(
        g,
        [
          [0.44, -1.35],
          [0.56, -1.15],
          [0.58, 0.2],
          [0.45, 1.15],
          [0.15, 1.55]
        ],
        gold,
        [nx, 2.02, -0.65],
        [1, 1, 1]
      )
      piece(g, 'cylinder', 0x1e242b, [nx, 2.02, -1.85], [0.92, 0.25, 0.92], {
        rot: [Math.PI / 2, 0, 0]
      })

      const spin = group(g, nx, 2.02, -2.08)
      piece(spin, 'cone', 0x334155, [0, 0, -0.18], [0.36, 0.46, 0.36], {
        rot: [-Math.PI / 2, 0, 0]
      })
      for (let b = 0; b < 3; b++) {
        const blade = piece(
          spin,
          'box',
          0x1e293b,
          [0, 0, 0],
          [0.16, 2.45, 0.06]
        )
        blade.rotation.z = (b * Math.PI) / 3
      }
      propellers.push(spin)
    }
    sweptWing(g, 2.8, 1.15, 0.72, 0.4, 0.12, crimson, 1.62, 3.9, 0)
    piece(g, 'box', crimson, [0, 2.55, 3.85], [0.18, 2.1, 1.45], {
      cast: true,
      rot: [-0.25, 0, 0]
    })
    piece(g, 'box', gold, [0, 3.48, 4.05], [0.2, 0.35, 1.25], {
      rot: [-0.25, 0, 0]
    })

    for (const side of [-1, 1]) {
      stick(
        g,
        [side * 0.7, 1.0, -0.3],
        [side * 1.35, 0.38, -0.3],
        0.09,
        0x334155
      )
      spinners.push(alloyWheel(g, [side * 1.38, 0.34, -0.3], 0.34, 0.22, 5))
    }
    stick(g, [0, 0.95, -3.1], [0, 0.3, -3.2], 0.08, 0x334155)
    spinners.push(alloyWheel(g, [0, 0.28, -3.2], 0.28, 0.18, 5))
    return { g, propellers, spinners }
  }

  if (jet) {
    const white = mat(0xf8fafc, { roughness: 0.25, metalness: 0.22 })
    const bellyGrey = mat(0xdbe2ea, { roughness: 0.35, metalness: 0.25 })
    const redWinglet = mat(0xdc2626, { roughness: 0.35 })
    const glass = mat(0x0f172a, { roughness: 0.1, metalness: 0.85 })

    latheBody(
      g,
      [
        [0.01, -5.8],
        [0.45, -5.45],
        [0.88, -4.7],
        [1.14, -3.5],
        [1.18, 1.5],
        [0.96, 3.6],
        [0.56, 5.2],
        [0.22, 6.2],
        [0.02, 6.4]
      ],
      white,
      [0, 1.65, 0],
      [0.98, 1.0, 1.05]
    )

    piece(g, 'sphere', bellyGrey, [0, 0.92, -0.2], [2.25, 0.95, 4.6], {
      cast: true
    })
    piece(g, 'sphere', glass, [0, 2.02, -4.35], [1.62, 0.72, 1.55])
    for (const side of [-1, 1]) {
      for (let wz = -2.8; wz <= 3.0; wz += 0.52) {
        piece(g, 'box', glass, [side * 1.13, 1.85, wz], [0.06, 0.28, 0.22])
      }
    }

    sweptWing(g, 9.4, 2.75, 1.05, 2.25, 0.2, white, 1.18, -0.45, 0.06)
    for (const side of [-1, 1]) {
      const wl = piece(
        g,
        'box',
        redWinglet,
        [side * 9.45, 2.22, -2.25],
        [0.12, 1.25, 0.65],
        { rot: [-0.35, 0, side * -0.22] }
      )
      wl.castShadow = true

      const ex = side * 3.25
      stick(g, [ex, 1.35, -1.2], [ex, 0.95, -1.65], 0.16, bellyGrey)
      latheBody(
        g,
        [
          [0.52, -1.15],
          [0.64, -0.95],
          [0.64, 0.35],
          [0.46, 0.98]
        ],
        white,
        [ex, 0.88, -1.75],
        [1, 1, 1]
      )
      piece(g, 'cylinder', 0x1e293b, [ex, 0.88, -2.72], [1.14, 0.22, 1.14], {
        rot: [Math.PI / 2, 0, 0]
      })
      piece(g, 'cone', 0x94a3b8, [ex, 0.88, -2.85], [0.35, 0.35, 0.35], {
        rot: [-Math.PI / 2, 0, 0]
      })
    }

    piece(g, 'box', white, [0, 3.35, 5.15], [0.2, 3.15, 2.05], {
      cast: true,
      rot: [-0.42, 0, 0]
    })
    sweptWing(g, 3.3, 1.25, 0.62, 0.95, 0.12, white, 1.85, 5.25, 0.04)

    for (const side of [-1, 1]) {
      stick(
        g,
        [side * 1.45, 1.1, 0.1],
        [side * 1.45, 0.32, 0.1],
        0.09,
        0x334155
      )
      spinners.push(alloyWheel(g, [side * 1.32, 0.3, 0.1], 0.3, 0.18, 5))
      spinners.push(alloyWheel(g, [side * 1.58, 0.3, 0.1], 0.3, 0.18, 5))
    }
    stick(g, [0, 1.0, -4.35], [0, 0.24, -4.45], 0.08, 0x334155)
    spinners.push(alloyWheel(g, [-0.11, 0.24, -4.45], 0.24, 0.14, 5))
    spinners.push(alloyWheel(g, [0.11, 0.24, -4.45], 0.24, 0.14, 5))
    return { g, propellers, spinners }
  }

  const grey = mat(0x88929b, { roughness: 0.58, metalness: 0.22 })
  const darkGrey = mat(0x525b64, { roughness: 0.65 })
  const glass = mat(0x18222b, { roughness: 0.15, metalness: 0.75 })

  latheBody(
    g,
    [
      [0.01, -5.6],
      [0.55, -5.3],
      [1.05, -4.5],
      [1.45, -3.2],
      [1.56, -1.2],
      [1.56, 1.8],
      [1.22, 3.8],
      [0.65, 5.2],
      [0.12, 5.8]
    ],
    grey,
    [0, 1.88, 0],
    [1.04, 1.02, 1.08]
  )

  piece(g, 'sphere', glass, [0, 2.48, -3.95], [1.85, 0.78, 1.65])
  sweptWing(g, 10.6, 3.2, 1.45, 2.4, 0.28, grey, 3.05, -0.85, -0.03)
  for (const side of [-1, 1]) {
    piece(g, 'box', grey, [side * 10.65, 3.25, -2.55], [0.14, 1.25, 0.75], {
      rot: [-0.35, 0, side * -0.2]
    })
    for (const [ex, ey, ez] of [
      [3.6, 2.35, -1.65],
      [6.6, 2.22, -2.25]
    ]) {
      stick(
        g,
        [side * ex, 2.95, ez + 0.45],
        [side * ex, ey + 0.35, ez + 0.2],
        0.18,
        darkGrey
      )
      latheBody(
        g,
        [
          [0.48, -1.15],
          [0.62, -0.95],
          [0.64, 0.35],
          [0.46, 1.05]
        ],
        grey,
        [side * ex, ey, ez],
        [1, 1, 1]
      )
      piece(
        g,
        'cylinder',
        0x1e293b,
        [side * ex, ey, ez - 1.02],
        [1.12, 0.22, 1.12],
        { rot: [Math.PI / 2, 0, 0] }
      )
    }
    piece(g, 'box', grey, [side * 1.48, 0.92, 0.45], [0.68, 0.85, 3.4], {
      cast: true
    })
    for (const gz of [-0.55, 0.45, 1.45]) {
      spinners.push(alloyWheel(g, [side * 1.55, 0.38, gz], 0.38, 0.28, 6))
    }
  }
  spinners.push(alloyWheel(g, [0, 0.32, -4.15], 0.32, 0.24, 5))

  piece(g, 'box', grey, [0, 4.15, 4.65], [0.26, 3.65, 2.25], {
    cast: true,
    rot: [-0.38, 0, 0]
  })
  sweptWing(g, 3.8, 1.35, 0.75, 0.95, 0.16, grey, 5.65, 5.35, 0)
  return { g, propellers, spinners }
}

export function helicopterVisual (parent) {
  const g = group(parent)
  const darkSlate = mat(0x273038, { roughness: 0.32, metalness: 0.35 })
  const upperIvory = mat(0xe6e1d3, { roughness: 0.35, metalness: 0.2 })
  const silverStripe = mat(0x94a3b8, { roughness: 0.3, metalness: 0.5 })
  const glass = mat(0x0f172a, { roughness: 0.1, metalness: 0.85 })

  latheBody(
    g,
    [
      [0.01, -3.8],
      [0.35, -3.55],
      [0.72, -2.9],
      [0.98, -1.9],
      [1.08, -0.6],
      [1.04, 0.8],
      [0.76, 1.9],
      [0.42, 2.7],
      [0.24, 3.2]
    ],
    darkSlate,
    [0, 1.38, -0.1],
    [0.95, 1.05, 1.0]
  )

  piece(g, 'sphere', upperIvory, [0, 2.15, -0.15], [1.45, 0.92, 3.1], {
    cast: true
  })
  piece(g, 'cylinder', upperIvory, [0, 2.22, 0.45], [1.32, 2.2, 1.32], {
    rot: [Math.PI / 2, 0, 0],
    cast: true
  })
  for (const side of [-1, 1]) {
    piece(
      g,
      'cylinder',
      0x1e293b,
      [side * 0.42, 2.22, 1.58],
      [0.32, 0.35, 0.32],
      { rot: [Math.PI / 2, 0, 0] }
    )
    piece(g, 'box', silverStripe, [side * 0.98, 1.18, -0.1], [0.06, 0.14, 3.6])
    piece(g, 'box', glass, [side * 0.96, 1.56, -0.95], [0.08, 0.68, 0.88])
    piece(g, 'box', glass, [side * 0.96, 1.56, 0.05], [0.08, 0.68, 0.92])
  }
  piece(g, 'sphere', glass, [0, 1.58, -2.22], [1.48, 0.98, 1.85])

  piece(g, 'cylinder', darkSlate, [0, 1.52, 3.85], [0.36, 3.8, 0.48], {
    rot: [Math.PI / 2, 0, 0],
    cast: true
  })
  piece(g, 'box', upperIvory, [0, 2.25, 5.55], [0.16, 2.1, 1.05], {
    cast: true,
    rot: [-0.32, 0, 0]
  })
  piece(g, 'box', darkSlate, [0, 1.52, 4.95], [2.8, 0.12, 0.58], { cast: true })

  const fenestronRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.12, 10, 24),
    upperIvory
  )
  fenestronRing.rotation.y = Math.PI / 2
  fenestronRing.position.set(0, 1.55, 5.52)
  g.add(fenestronRing)

  const tail = group(g, 0, 1.55, 5.52)
  for (let b = 0; b < 5; b++) {
    const blade = piece(tail, 'box', 0x1e293b, [0, 0, 0], [0.04, 0.95, 0.1])
    blade.rotation.x = (b * Math.PI) / 5
  }

  const spinners = []
  stick(g, [0, 0.72, -2.25], [0, 0.22, -2.35], 0.06, 0x334155)
  spinners.push(alloyWheel(g, [0, 0.2, -2.35], 0.2, 0.14, 5))
  for (const side of [-1, 1]) {
    piece(g, 'sphere', darkSlate, [side * 0.85, 0.75, 0.45], [0.38, 0.32, 1.15])
    stick(
      g,
      [side * 0.88, 0.65, 0.45],
      [side * 1.12, 0.24, 0.45],
      0.07,
      0x334155
    )
    spinners.push(alloyWheel(g, [side * 1.15, 0.24, 0.45], 0.24, 0.16, 5))
  }

  piece(g, 'cylinder', 0x1e293b, [0, 2.75, -0.15], [0.24, 0.45, 0.24])
  piece(g, 'sphere', darkSlate, [0, 2.98, -0.15], [0.68, 0.26, 0.68])
  const rotor = group(g, 0, 2.98, -0.15)
  for (let i = 0; i < 5; i++) {
    const arm = group(rotor)
    arm.rotation.y = (i * Math.PI * 2) / 5
    piece(arm, 'box', 0x475569, [3.1, 0, 0], [5.8, 0.05, 0.26], { cast: true })
    piece(arm, 'box', 0xfacc15, [5.85, 0, 0], [0.35, 0.055, 0.26])
  }
  const disc = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 6.0, 36),
    new THREE.MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  disc.rotation.x = Math.PI / 2
  rotor.add(disc)

  return { g, rotor, tail, spinners }
}

export class Vehicles {
  constructor (scene) {
    this.vehicles = [
      {
        kind: 'bicycle',
        name: 'Mountain Bike',
        icon: '🚲',
        x: 19,
        z: 26,
        yaw: Math.PI / 2,
        speed: 12,
        turn: 2.5,
        r: 1.2
      },
      {
        kind: 'motorbike',
        name: 'Cruiser Motorbike',
        icon: '🏍',
        x: -12,
        z: 14,
        yaw: 0,
        speed: 22,
        turn: 2.0,
        r: 1.45
      },
      {
        kind: 'car',
        name: 'Land Cruiser 300 SUV',
        icon: '🚙',
        x: -9,
        z: -41,
        yaw: Math.PI / 2,
        speed: 27,
        turn: 1.55,
        r: 2.7
      },
      {
        kind: 'bus',
        name: 'School Bus',
        icon: '🚌',
        x: 47,
        z: 12,
        yaw: 0,
        speed: 19,
        turn: 1.04,
        r: 4.8
      },
      ...MOORINGS.map(b => ({
        ...b,
        kind: 'boat',
        icon: '🚢',
        speed: b.variant === 'cargo' ? 12 : 17,
        turn: b.variant === 'fishing' ? 1.4 : 0.9
      })),
      {
        kind: 'plane',
        name: 'Orange-Gray Propeller Trainer',
        icon: '✈',
        x: 402,
        z: -322,
        yaw: Math.PI,
        speed: 42,
        turn: 0.73,
        r: 4,
        alt: 0
      },
      {
        kind: 'plane',
        name: 'Royal Mandalay Twin-Prop',
        icon: '✈',
        variant: 'twin',
        x: 363,
        z: -284,
        yaw: Math.PI,
        speed: 44,
        turn: 0.68,
        r: 5,
        alt: 0
      },
      {
        kind: 'plane',
        name: 'MAI Airbus A320 Airliner',
        icon: '✈',
        variant: 'jet',
        x: 364,
        z: -178,
        yaw: Math.PI,
        speed: 62,
        turn: 0.56,
        r: 5.5,
        alt: 0
      },
      {
        kind: 'plane',
        name: 'Heavy Cargo Jet',
        icon: '✈',
        variant: 'cargo',
        x: 364,
        z: -105,
        yaw: Math.PI,
        speed: 38,
        turn: 0.51,
        r: 6,
        alt: 0
      },
      {
        kind: 'helicopter',
        name: 'CH-47 Chinook Transport Helicopter',
        icon: '🚁',
        x: 368,
        z: -42,
        yaw: Math.PI,
        speed: 28,
        turn: 1.18,
        r: 3.1,
        alt: 0
      }
    ]

    for (const v of this.vehicles) {
      v.root = group(scene, v.x, 0, v.z)
      v.modelHolder = group(v.root)
      v.velocity = 0
      v.wheelSpinners = []
      v.frontSteerPivots = []
      v.turnAngle = 0
      v.pitchAngle = 0
      v.rollAngle = 0
      v.rotorSpeed = 6
      v.assetLoaded = true

      if (v.kind === 'bicycle' || v.kind === 'motorbike') {
        const res = bicycleVisual(
          v.modelHolder,
          v.kind === 'motorbike',
          v.kind === 'bicycle' ? 0x38bdf8 : 0x1e293b
        )
        v.frontSteerPivots = res.steerPivots
        v.wheelSpinners = res.spinners
      } else if (v.kind === 'car' || v.kind === 'bus') {
        const res = carVisual(
          v.modelHolder,
          v.kind === 'car' ? 0xf8fafc : 0xf6b918,
          v.kind === 'bus'
        )
        v.frontSteerPivots = res.steerPivots
        v.wheelSpinners = res.spinners
      } else if (v.kind === 'boat') {
        makeRiverBoat(v.modelHolder, v.variant)
      } else if (v.kind === 'plane' && !v.variant) {
        const res = createTrainerAircraft(v.modelHolder)
        v.prop = res.prop
        v.wheelSpinners = res.spinners
      } else if (v.kind === 'plane' && v.variant) {
        const res = v.variant === 'jet'
          ? createMAIAirbus(v.modelHolder)
          : planeVariant(v.modelHolder, v.variant)
        v.extraPropellers = res.propellers
        v.wheelSpinners = res.spinners
      } else if (v.kind === 'helicopter') {
        const res = createChinookAircraft(v.modelHolder)
        v.rotor = res.rotor
        v.tailRotor = res.tail ?? null
        v.secondaryRotor = res.secondaryRotor ?? null
        v.wheelSpinners = res.spinners
      }
      this.addHeadlights(v)
      this.positionVisual(v)
    }
  }

  addHeadlights (v) {
    const xSpread =
      v.kind === 'bus'
        ? 0.96
        : v.kind === 'car'
        ? 0.88
        : v.kind === 'plane'
        ? 2.4
        : v.kind === 'helicopter'
        ? 0.45
        : 0
    const dist =
      v.kind === 'bus'
        ? 4.65
        : v.kind === 'car'
        ? 2.48
        : v.kind === 'plane'
        ? 2.85
        : v.kind === 'helicopter'
        ? 3.55
        : v.kind === 'boat'
        ? 4.5
        : 1.05
    const y =
      v.kind === 'bus'
        ? 1.15
        : v.kind === 'car'
        ? 1.16
        : v.kind === 'plane'
        ? 1.32
        : v.kind === 'helicopter'
        ? 1.12
        : 1.22
    const material = new THREE.MeshStandardMaterial({
      color: 0xffefbd,
      emissive: 0xffeea7,
      emissiveIntensity: 0
    })
    v.lampMaterial = material
    v.lamps = group(v.modelHolder)
    if (!v.v10 && !v.modelType && v.kind !== 'car' && v.kind !== 'bus') {
      for (const x of xSpread ? [-xSpread, xSpread] : [0]) {
        piece(v.lamps, 'sphere', material, [x, y, -dist], [0.24, 0.16, 0.14])
      }
    }
    v.spot = new THREE.SpotLight(0xfff3cc, 0, 82, 0.36, 0.48, 1.4)
    v.spot.position.set(0, y + 0.18, -dist)
    v.spot.target.position.set(0, 0.1, -dist - 22)
    v.modelHolder.add(v.spot)
    v.modelHolder.add(v.spot.target)
  }

  setNightMode (strength, active) {
    for (const v of this.vehicles) {
      v.lampMaterial.emissiveIntensity = strength > 0.3 ? strength * 3.5 : 0
      v.spot.intensity = v === active && strength > 0.35 ? strength * 90 : 0
    }
  }

  positionVisual (v) {
    v.root.position.set(
      v.x,
      v.kind === 'plane' || v.kind === 'helicopter' ? v.alt : 0,
      v.z
    )
    v.root.rotation.y = -v.yaw
  }

  setVisible (on) {
    for (const v of this.vehicles) v.root.visible = on
  }

  nearest (pos, max = 4.5) {
    let found = null,
      md = Infinity
    for (const v of this.vehicles) {
      const vy = v.kind === 'plane' || v.kind === 'helicopter' ? v.alt || 0 : 0
      if (Number.isFinite(pos.y) && Math.abs(vy - pos.y) > 3.5) continue
      const d = distance2(v, pos)
      const limit =
        v.kind === 'boat' && pos.x < RIVER.maxX + 16 ? Math.max(max, 25) : max
      if (d < limit && d < md) {
        md = d
        found = v
      }
    }
    return found
  }

  obstaclesExcept (active) {
    return this.vehicles
      .filter(
        v =>
          v !== active &&
          v.kind !== 'plane' &&
          v.kind !== 'boat' &&
          v.kind !== 'helicopter'
      )
      .map(v => vehicleBounds(v))
  }

  update (v, input, dt, world) {
    const move = (input.forward ? 1 : 0) - (input.back ? 1 : 0)
    const turning = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    v.yaw = turnYaw(v.yaw, turning, v.turn, dt)

    // V10.6.3: 50 mph takeoff, 200 mph max; smooth throttle and rolling landing.
    const isPlane = v.kind === 'plane'
    const landingApproach = isPlane && v.alt > 0.3 && input.fast && !input.jump
    if (isPlane) {
      const target = planeTargetSpeedMph(v, input) * 0.44704
      // After touchdown, releasing W coasts gradually; S brakes deliberately.
      const rate = landingApproach
        ? FLIGHT_RULES.planeLandingDecelMphPerSecond
        : input.back ? FLIGHT_RULES.planeBrakeMphPerSecond
          : v.alt <= 0.3 && !input.forward
            ? FLIGHT_RULES.planeGroundCoastMphPerSecond : null
      v.velocity = smoothPlaneVelocity(v.velocity, target, dt, rate)
      if (v.velocity < 0.07 && target === 0) v.velocity = 0
    } else {
      const max = v.speed * (input.fast ? 1.2 : 1)
      const target = move >= 0 ? move * max : move * max * 0.5
      v.velocity += (target - v.velocity) * Math.min(1, dt * 4)
      if (Math.abs(v.velocity) < 0.07) v.velocity = 0
    }

    let climbInput = 0
    let floor = 0
    if (v.kind === 'plane' || v.kind === 'helicopter') {
      const pad = v.kind === 'helicopter' ? world.landingPadAt(v.x, v.z) : null
      const padSurfaceY = pad ? pad.y + 0.34 : 0
      const roofFloorY = world.getRoofCeilingAt(v.x, v.z, v.r)
      floor = Math.max(
        pad && v.alt >= padSurfaceY - 1.5 ? padSurfaceY : 0,
        roofFloorY
      )

      climbInput = (input.jump ? 1 : 0) - (input.fast ? 1 : 0)
      // V10.6.3: Space only lifts fixed-wing planes at >=50 mph.
      // Floating-point tolerance allows exactly 50.0 mph.
      if (v.kind === 'plane' && climbInput > 0 &&
          v.alt <= floor + 0.2 &&
          Math.abs(v.velocity) + 1e-6 < FLIGHT_RULES.takeoffSpeed) {
        climbInput = 0
      }
      let climbRate = v.kind === 'helicopter' ? 13 : 20
      if (climbInput < 0 && v.alt - floor < 4.5) {
        climbRate *= Math.max(0.22, (v.alt - floor) / 4.5)
      }
      // No fixed-wing touchdown above 25 mph: hold slightly above the ground
      // until landing approach slows the plane. Other aircraft are unchanged.
      let nextAltitude = clamp(v.alt + climbInput * climbRate * dt, floor, FLIGHT_RULES.maxAltitude)
      if (v.kind === 'plane' && climbInput < 0 &&
          v.alt > floor + 0.25 &&
          v.velocity > FLIGHT_RULES.planeLandingSpeed + 0.0001) {
        nextAltitude = Math.max(nextAltitude, Math.min(v.alt, floor + 0.7))
      }
      // REAR_GEAR -> NOSE_GEAR -> ROLLOUT; preserve forward momentum.
      if (v.kind === 'plane') {
        nextAltitude = advancePlaneTouchdown(v, nextAltitude, floor, climbInput, dt)
      }
      v.alt = nextAltitude
      if (v.kind === 'plane') {
        v.flightPhase = v.touchdownStage === 'REAR_GEAR' ? 'REAR GEAR'
          : v.touchdownStage === 'NOSE_GEAR' ? 'NOSE GEAR'
          : v.touchdownStage === 'ROLLOUT' ? 'ROLLOUT'
          : v.alt <= floor + 0.3 ? 'GROUND'
          : landingApproach ? 'LANDING'
          : v.velocity < FLIGHT_RULES.planeMinAirborneMph * 0.44704 - 0.01
            ? 'TAKEOFF' : 'FLIGHT'
      }
      v.onPad =
        v.kind === 'helicopter' && pad && Math.abs(v.alt - padSurfaceY) < 0.22
          ? { ...pad, y: padSurfaceY }
          : null
    }

    // Helicopters must lift off before W/S can move them horizontally.
    if (v.kind === 'helicopter' &&
        (v.alt <= floor + FLIGHT_RULES.heliHorizontalClearance || v.onPad)) {
      v.velocity = 0
    }
    // Gear UP at 0.50 game km (50 units); DOWN on descent below 0.50 km.
    // Never force the plane's velocity to 30 mph in a single frame.
    if (v.kind === 'plane') syncLandingGear(v)

    const direction = forward(v.yaw),
      dx = direction.x * v.velocity * dt,
      dz = direction.z * v.velocity * dt
    if (v.kind === 'boat') {
      const nx = clamp(v.x + dx, RIVER.minX + 9, RIVER.maxX - 9),
        nz = clamp(v.z + dz, -MAP_HALF + 18, MAP_HALF - 18)
      const otherBoat = this.vehicles.find(
        other =>
          other !== v &&
          other.kind === 'boat' &&
          Math.hypot(nx - other.x, nz - other.z) < v.r + other.r + 1
      )
      if (!otherBoat) {
        v.x = nx
        v.z = nz
      } else v.velocity = 0
      v.modelHolder.position.y =
        Math.sin(performance.now() * 0.0025 + v.x) * 0.08
      v.modelHolder.rotation.z = THREE.MathUtils.lerp(
        v.modelHolder.rotation.z,
        -turning * 0.06,
        Math.min(1, dt * 4)
      )
    } else if (v.kind === 'plane' || v.kind === 'helicopter') {
      const heightObstacles = world.getAircraftCollisionBoxes(v.alt)
      const result = sweptMove(v, dx, dz, v.r, heightObstacles)
      v.x = result.x
      v.z = result.z
      if (result.blocked) v.velocity *= 0.15

      if (v.alt <= 0.2) {
        const body = vehicleBounds({ ...v, x: v.x, z: v.z }, 0)
        const water =
          world.waterBlocked(body.minX, body.minZ) ||
          world.waterBlocked(body.maxX, body.minZ) ||
          world.waterBlocked(body.minX, body.maxZ) ||
          world.waterBlocked(body.maxX, body.maxZ)
        if (water) v.velocity = 0
      }
    } else {
      const obstacles = world
        .getCollisionBoxes(false)
        .concat(this.obstaclesExcept(v))
      const result = sweptMove(v, dx, dz, v.r, obstacles)
      const body = vehicleBounds({ ...v, x: result.x, z: result.z }, 0)
      const water =
        world.waterBlocked(body.minX, body.minZ) ||
        world.waterBlocked(body.maxX, body.minZ) ||
        world.waterBlocked(body.minX, body.maxZ) ||
        world.waterBlocked(body.maxX, body.maxZ)
      if (water) v.velocity = 0
      else {
        v.x = result.x
        v.z = result.z
        if (result.blocked) v.velocity = 0
      }
    }

    if (v.kind === 'plane') {
      const touchdownActive = v.touchdownStage === 'REAR_GEAR' ||
        v.touchdownStage === 'NOSE_GEAR'
      const flare = !touchdownActive && climbInput < 0 &&
        v.alt > floor + 0.2 && v.alt < floor + 3 &&
        v.velocity <= FLIGHT_RULES.planeLandingSpeed + 0.001
      // Positive X pitch raises the nose (aircraft points along -Z).
      // Rear/main wheels touch while the nose is raised; front wheel lowers later.
      const targetPitch = touchdownActive ? v.touchdownPitch
        : flare ? FLIGHT_RULES.touchdownNoseUpRadians
          : v.alt > 0.2 ? climbInput * 0.22 : 0
      const targetRoll = v.alt > 0.5 ? -turning * 0.34 : 0
      v.pitchAngle = THREE.MathUtils.lerp(
        v.pitchAngle,
        targetPitch,
        Math.min(1, dt * (touchdownActive || flare ? 14 : 5))
      )
      v.rollAngle = THREE.MathUtils.lerp(
        v.rollAngle,
        targetRoll,
        Math.min(1, dt * 5)
      )
      v.modelHolder.rotation.x = v.pitchAngle
      v.modelHolder.rotation.z =
        v.rollAngle +
        Math.sin(performance.now() * 0.003) *
          Math.min(0.03, Math.abs(v.velocity) / 700)
    } else if (v.kind === 'helicopter') {
      const airborne = v.alt > floor + 0.15 && !v.onPad
      const targetPitch = airborne ? -(v.velocity / v.speed) * 0.16 : 0
      const targetRoll = airborne ? -turning * 0.2 : 0
      v.pitchAngle = THREE.MathUtils.lerp(
        v.pitchAngle,
        targetPitch,
        Math.min(1, dt * 5)
      )
      v.rollAngle = THREE.MathUtils.lerp(
        v.rollAngle,
        targetRoll,
        Math.min(1, dt * 5)
      )
      v.modelHolder.rotation.x = v.pitchAngle
      v.modelHolder.rotation.z = v.rollAngle
    } else if (v.kind === 'bicycle' || v.kind === 'motorbike') {
      const lean = -turning * Math.min(1, Math.abs(v.velocity) / 10) * 0.24
      v.rollAngle = THREE.MathUtils.lerp(v.rollAngle, lean, Math.min(1, dt * 8))
      v.modelHolder.rotation.z = v.rollAngle
    }

    const propSpin =
      dt * (12 + Math.abs(v.velocity) * 0.65 + (v.alt > 0.2 ? 16 : 0))
    if (v.prop) v.prop.rotation.z += propSpin
    if (v.extraPropellers)
      for (const p of v.extraPropellers) p.rotation.z += propSpin * 1.1
    if (v.rotor) {
      const targetRotor =
        v.alt > floor + 0.08 || Math.abs(v.velocity) > 0.2 || input.jump
          ? 28
          : 10
      v.rotorSpeed = THREE.MathUtils.lerp(
        v.rotorSpeed,
        targetRotor,
        Math.min(1, dt * 3)
      )
      v.rotor.rotation.y += dt * v.rotorSpeed
      if (v.secondaryRotor) v.secondaryRotor.rotation.y -= dt * v.rotorSpeed
    }
    if (v.tailRotor) v.tailRotor.rotation.x += dt * (v.rotorSpeed * 1.35)

    const wheelRadius = v.kind === 'bus' ? 0.65 : v.kind === 'car' ? 0.56 : 0.7
    if (v.wheelSpinners) {
      for (const spinner of v.wheelSpinners)
        spinner.rotation.x -= (v.velocity * dt) / wheelRadius
    }
    v.turnAngle = THREE.MathUtils.lerp(
      v.turnAngle || 0,
      -turning * (v.kind === 'bus' ? 0.32 : 0.52),
      Math.min(1, dt * 8)
    )
    if (v.frontSteerPivots) {
      for (const pivot of v.frontSteerPivots) pivot.rotation.y = v.turnAngle
    }

    this.positionVisual(v)
    return Math.hypot(dx, dz)
  }
}
