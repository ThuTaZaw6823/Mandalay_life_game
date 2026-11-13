import { group, piece, mat } from './visual.js'

export function makeRiverBoat (parent, style) {
  const vessel = group(parent)
  const whiteHull = mat(0xf8fafc, { roughness: 0.25, metalness: 0.15 })
  const darkKeel = mat(0x1e293b, { roughness: 0.5 })
  const teakDeck = mat(0xb47b44, { roughness: 0.65 })
  const glass = mat(0x0f172a, { roughness: 0.1, metalness: 0.85 })
  const chrome = mat(0xe2e8f0, { roughness: 0.2, metalness: 0.8 })

  if (style === 'ferry') {
    const length = 22,
      beam = 6.2
    piece(vessel, 'box', whiteHull, [0, 0.9, 1.2], [beam, 1.8, length * 0.78], {
      cast: true
    })
    piece(
      vessel,
      'cone',
      whiteHull,
      [0, 0.9, -length * 0.48],
      [beam * 0.88, 4.8, beam * 0.88],
      { rot: [-Math.PI / 2, 0, 0], cast: true }
    )
    piece(
      vessel,
      'box',
      darkKeel,
      [0, 0.05, 0.5],
      [beam * 0.96, 0.25, length * 0.92]
    )
    piece(
      vessel,
      'box',
      teakDeck,
      [0, 1.82, -1.5],
      [beam * 0.92, 0.12, length * 0.65]
    )
    piece(vessel, 'cylinder', teakDeck, [0, 1.92, -6.5], [4.2, 0.22, 4.2])
    piece(vessel, 'cylinder', glass, [0, 2.75, -1.5], [5.4, 1.65, 9.5], {
      cast: true
    })
    piece(vessel, 'cylinder', whiteHull, [0, 3.68, -1.2], [6.2, 0.28, 11.2], {
      cast: true
    })
    piece(vessel, 'cylinder', glass, [0, 4.35, -1.0], [3.6, 1.15, 4.8])
    piece(vessel, 'cylinder', whiteHull, [0, 5.02, -0.8], [4.2, 0.24, 5.6], {
      cast: true
    })
    piece(vessel, 'cylinder', chrome, [0, 6.2, -1.2], [0.14, 2.2, 0.14])
    piece(vessel, 'box', chrome, [0, 6.6, -1.2], [1.4, 0.1, 0.1])
    for (const side of [-1, 1]) {
      for (let z = -3.5; z <= 6.5; z += 2.0) {
        piece(
          vessel,
          'box',
          glass,
          [side * (beam * 0.502), 1.05, z],
          [0.08, 0.55, 1.1]
        )
      }
    }
    return vessel
  }

  if (style === 'cargo') {
    const silverHull = mat(0xcbd5e1, { roughness: 0.35, metalness: 0.45 })
    const tealTrim = mat(0x134e4a, { roughness: 0.4 })
    const redBow = mat(0xea580c, { roughness: 0.35 })
    const sailCream = mat(0xfef9c3, { roughness: 0.6, side: 2 })
    const sailNavy = mat(0x1e293b, { roughness: 0.6, side: 2 })

    piece(vessel, 'box', silverHull, [0, 1.0, 0.5], [3.2, 2.0, 18.0], {
      cast: true
    })
    piece(vessel, 'cone', tealTrim, [0, 1.0, -9.8], [3.2, 3.6, 3.2], {
      rot: [-Math.PI / 2, 0, 0]
    })
    for (const side of [-1, 1]) {
      piece(
        vessel,
        'box',
        silverHull,
        [side * 3.8, 0.85, 1.0],
        [1.1, 1.6, 17.5],
        { cast: true }
      )
      piece(vessel, 'cone', redBow, [side * 3.8, 0.85, -9.2], [1.1, 3.2, 1.1], {
        rot: [-Math.PI / 2, 0, 0]
      })
      piece(vessel, 'box', tealTrim, [side * 3.8, 0.9, 8.2], [1.16, 1.65, 3.2])
    }
    piece(vessel, 'box', 0xe2e8f0, [0, 1.92, 1.2], [8.6, 0.25, 15.5], {
      cast: true,
      receive: true
    })
    piece(vessel, 'box', tealTrim, [0, 2.55, -2.2], [4.2, 1.1, 3.2], {
      cast: true
    })
    piece(vessel, 'box', glass, [0, 2.65, -3.75], [3.8, 0.55, 0.2])

    for (const [mz, h, sMat] of [
      [-2.0, 16.5, sailCream],
      [5.5, 15.0, sailNavy]
    ]) {
      piece(
        vessel,
        'cylinder',
        0x1e293b,
        [0, 2.0 + h / 2, mz],
        [0.22, h, 0.22],
        { cast: true }
      )
      const mainSail = piece(
        vessel,
        'cone',
        sMat,
        [0.3, 2.5 + h * 0.48, mz + 2.2],
        [0.15, h * 0.85, 4.8],
        { rot: [0, 0, -0.05] }
      )
      mainSail.castShadow = true
      const jibSail = piece(
        vessel,
        'cone',
        sailCream,
        [-0.2, 2.2 + h * 0.42, mz - 2.4],
        [0.12, h * 0.75, 3.8]
      )
      jibSail.castShadow = true
    }
    return vessel
  }

  const length = 14.5,
    beam = 4.6
  piece(vessel, 'box', whiteHull, [0, 0.75, 1.0], [beam, 1.5, length * 0.76], {
    cast: true
  })
  piece(
    vessel,
    'cone',
    whiteHull,
    [0, 0.75, -length * 0.45],
    [beam * 0.86, 4.0, beam * 0.86],
    { rot: [-Math.PI / 2, 0, 0], cast: true }
  )
  piece(
    vessel,
    'box',
    darkKeel,
    [0, 0.05, 0.4],
    [beam * 0.94, 0.2, length * 0.88]
  )
  piece(
    vessel,
    'box',
    teakDeck,
    [0, 1.52, -1.2],
    [beam * 0.88, 0.1, length * 0.65]
  )
  piece(vessel, 'box', whiteHull, [0, 2.15, 0.8], [beam * 0.78, 1.25, 6.2], {
    cast: true
  })
  piece(vessel, 'box', glass, [0, 2.25, -2.15], [beam * 0.74, 0.95, 1.4], {
    rot: [-0.48, 0, 0]
  })
  piece(vessel, 'box', whiteHull, [0, 2.85, 1.2], [beam * 0.68, 0.22, 4.8], {
    cast: true
  })
  piece(vessel, 'box', whiteHull, [0, 4.15, 1.5], [beam * 0.64, 0.18, 3.8], {
    cast: true
  })
  for (const side of [-1, 1]) {
    piece(
      vessel,
      'box',
      whiteHull,
      [side * (beam * 0.28), 3.5, 2.8],
      [0.22, 1.3, 0.8]
    )
    piece(
      vessel,
      'box',
      glass,
      [side * (beam * 0.395), 2.15, 0.8],
      [0.06, 0.65, 4.2]
    )
  }
  piece(vessel, 'sphere', whiteHull, [0, 4.55, 1.2], [0.65, 0.65, 0.65])
  return vessel
}

export const MOORINGS = [
  {
    variant: 'ferry',
    name: 'AMANE Cruise Ship',
    x: -912,
    z: -325,
    yaw: 0,
    r: 6.5
  },
  {
    variant: 'cargo',
    name: 'VELA Cargo Trimaran',
    x: -915,
    z: 15,
    yaw: Math.PI,
    r: 7.8
  },
  {
    variant: 'fishing',
    name: 'Flybridge Motor Yacht',
    x: -913,
    z: 350,
    yaw: Math.PI / 2,
    r: 4.5
  }
]
