import * as THREE from 'three'
import { group, piece, mat, wheel } from './visual.js'
import { ROADS_X, ROADS_Z } from './world.js'
import { vehicleBounds, boxesOverlap } from './physics.js'

function rng (seed = 9152) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
const random = rng()
const signalX = [-150, -18, 114, 246],
  signalZ = [-174, -42, 90, 222]

export function signalAllows (axis, seconds, offset = 0) {
  const phase = (((seconds + offset) % 26) + 26) % 26
  return axis === 'z' ? phase < 12 : phase >= 13 && phase < 25
}

function axisDirection (axis, sign) {
  return axis === 'z'
    ? sign > 0
      ? Math.PI
      : 0
    : sign > 0
    ? Math.PI / 2
    : -Math.PI / 2
}

export class CityLife {
  constructor (world) {
    this.world = world
    this.root = group(world.city)
    this.signals = []
    this.traffic = []
    this.pedestrians = []
    this.seconds = 0
    this.makeSignals()
    this.makeTraffic()
    this.makePedestrians()
  }

  makeSignals () {
    let index = 0
    for (const x of signalX) {
      for (const z of signalZ) {
        if (index++ % 3 === 2) continue
        const offset = (index % 4) * 6
        for (const axis of ['x', 'z']) {
          const g = group(
            this.root,
            x + (axis === 'z' ? 8.6 : -8.6),
            0,
            z + (axis === 'z' ? 8.6 : -8.6)
          )
          if (axis === 'x') g.rotation.y = Math.PI / 2
          piece(g, 'cylinder', 0x526368, [0, 2.7, 0], [0.22, 5.4, 0.22])
          piece(g, 'box', 0x26353e, [0, 5.4, 0], [0.98, 2.08, 0.64])
          const red = piece(
            g,
            'sphere',
            0xff2722,
            [0, 5.92, -0.36],
            [0.45, 0.45, 0.22]
          )
          const green = piece(
            g,
            'sphere',
            0x44e585,
            [0, 4.94, -0.36],
            [0.45, 0.45, 0.22]
          )
          red.material = mat(0x8b1719, {
            emissive: 0xff231c,
            emissiveIntensity: 0.16
          })
          green.material = mat(0x147c45, {
            emissive: 0x21ea6d,
            emissiveIntensity: 1.3
          })
          this.signals.push({ x, z, red, green, offset, axis })
        }
      }
    }
  }

  makeVehicle (i, kind) {
    const axis = i % 2 ? 'x' : 'z',
      sign = i % 4 < 2 ? 1 : -1
    const roads = axis === 'x' ? ROADS_Z : ROADS_X
    const road = roads[1 + Math.floor(random() * (roads.length - 3))]
    const v = {
      kind,
      axis,
      sign,
      road,
      heading: axisDirection(axis, sign),
      speed: (kind === 'car' || kind === 'police' ? 9 : 12) + random() * 5
    }
    v.x = axis === 'x' ? -340 + random() * 640 : road + (sign > 0 ? 2.4 : -2.4)
    v.z = axis === 'z' ? -340 + random() * 640 : road + (sign > 0 ? 2.4 : -2.4)
    if (v.x > 270 && v.x < 615 && v.z < 235 && v.z > -635) {
      if (axis === 'x') v.x = -240
      else v.z = 260
    }
    const color =
      kind === 'police'
        ? 0xf1f3ea
        : [0xd36f5e, 0x9ac3b5, 0xebba67, 0x5d90be, 0x83a575, 0xc8a0aa][i % 6]
    const r = group(this.root, v.x, 0, v.z)
    r.rotation.y = -v.heading
    v.root = r
    v.wheels = []
    if (kind === 'car' || kind === 'police') {
      piece(r, 'box', color, [0, 0.85, 0], [2.12, 1.08, 4.2], { cast: true })
      piece(r, 'box', color, [0, 1.55, 0.2], [1.9, 0.8, 2.5])
      for (const z of [-1.23, 1.3]) {
        for (const x of [-1.13, 1.13]) {
          v.wheels.push({
            node: wheel(r, [x, 0.55, z], 0.52, 0.25),
            front: z < 0
          })
        }
      }
      if (kind === 'police') {
        piece(r, 'box', 0x27394f, [0, 0.94, 0], [2.17, 0.38, 4.25])
        piece(r, 'box', 0xeeeeea, [0, 1.63, 0.1], [1.9, 0.18, 2.5])
        const blueBar = piece(
          r,
          'box',
          0x244c7e,
          [-0.38, 2.03, -0.1],
          [0.69, 0.19, 0.48]
        )
        const redBar = piece(
          r,
          'box',
          0xc94e4e,
          [0.38, 2.03, -0.1],
          [0.69, 0.19, 0.48]
        )
        blueBar.material = mat(0x244c7e, {
          emissive: 0x3b82f6,
          emissiveIntensity: 0.8
        })
        redBar.material = mat(0xc94e4e, {
          emissive: 0xef4444,
          emissiveIntensity: 0.8
        })
        v.sirenBars = [blueBar, redBar]
        piece(r, 'box', 0x244c7e, [0, 1.0, -1.85], [1.55, 0.25, 0.22])
      }
      for (const x of [-0.75, 0.75]) {
        piece(r, 'box', 0x99bdca, [0, 1.61, -0.97], [1.72, 0.62, 0.11])
        piece(r, 'box', 0x94b2c1, [x * 1.34, 1.55, 0.2], [0.09, 0.64, 1.4])
      }
    } else {
      for (const z of [-0.95, 0.95])
        v.wheels.push({
          node: wheel(r, [0, 0.61, z], 0.64, 0.19),
          front: z < 0
        })
      piece(r, 'sphere', color, [0, 1.18, 0], [0.72, 0.56, 1.46], {
        cast: true
      })
      piece(r, 'box', 0x303538, [0, 1.46, 0.28], [0.61, 0.18, 0.76])
      piece(r, 'box', 0x78878a, [0, 1.82, -0.72], [1.05, 0.12, 0.14])
      piece(r, 'sphere', 0xd4a985, [0, 2.51, 0.22], [0.42, 0.5, 0.43])
      piece(r, 'sphere', 0x445b5a, [0, 2.06, 0.28], [0.63, 0.76, 0.4])
    }
    v.heads = []
    for (const x of kind === 'car' || kind === 'police' ? [-0.72, 0.72] : [0]) {
      const light = piece(
        r,
        'box',
        0xe6e4d5,
        [
          x,
          kind === 'car' || kind === 'police' ? 0.91 : 1.15,
          kind === 'car' || kind === 'police' ? -2.15 : -1.24
        ],
        [0.36, 0.28, 0.12]
      )
      light.material = mat(0xe7e0c5, {
        emissive: 0xfff3b0,
        emissiveIntensity: 0
      })
      v.heads.push(light)
      piece(
        r,
        'box',
        0xb4473c,
        [
          x,
          kind === 'car' ? 0.91 : 1.06,
          kind === 'car' || kind === 'police' ? 2.15 : 1.1
        ],
        [0.33, 0.22, 0.08]
      )
    }
    for (let attempts = 0; attempts < 28; attempts++) {
      if (
        !this.traffic.some(other =>
          boxesOverlap(vehicleBounds(v, 0.8), vehicleBounds(other, 0.8))
        )
      )
        break
      if (axis === 'x') v.x += 12
      else v.z += 12
      if (v.x > 440) v.x = -340
      if (v.z > 430) v.z = -330
    }
    v.root.position.set(v.x, 0, v.z)
    this.traffic.push(v)
  }

  makeTraffic () {
    for (let i = 0; i < 28; i++)
      this.makeVehicle(
        i,
        i % 3 === 0 ? 'motorbike' : i % 7 === 0 ? 'police' : 'car'
      )
  }

  makePedestrians () {
    const tops = [-150, -84, -18, 48, 114, 180, 246, 312],
      zRoad = [-174, -108, -42, 24, 90, 156, 222, 288]
    const colors = [0x637ea1, 0x9e6e86, 0x3c9f85, 0xd1a45f, 0x829d63, 0xd17e66]
    for (let i = 0; i < 32; i++) {
      const axis = i % 2 ? 'x' : 'z'
      const road = (axis === 'z' ? tops : zRoad)[i % 8],
        side = i % 3 === 0 ? -1 : 1
      const p = {
        axis,
        sign: i % 4 < 2 ? 1 : -1,
        speed: 1.3 + (i % 5) * 0.17,
        phase: i * 1.3
      }
      p.x = axis === 'z' ? road + side * 8.3 : -290 + random() * 590
      p.z = axis === 'x' ? road + side * 8.3 : -300 + random() * 600
      if (p.x > 270 && p.x < 615 && p.z < 235 && p.z > -635) p.z = 260
      const root = group(this.root, p.x, 0, p.z)
      const clothes = colors[i % colors.length]
      piece(root, 'sphere', 0xc69775, [0, 2.08, 0], [0.44, 0.51, 0.43], {
        cast: true
      })
      piece(root, 'sphere', clothes, [0, 1.38, 0], [0.58, 0.94, 0.44], {
        cast: true
      })
      const leftLeg = group(root, -0.17, 0.98, 0),
        rightLeg = group(root, 0.17, 0.98, 0)
      piece(leftLeg, 'box', 0x3c4a54, [0, -0.47, 0], [0.21, 0.87, 0.27])
      piece(rightLeg, 'box', 0x3c4a54, [0, -0.47, 0], [0.21, 0.87, 0.27])
      const leftArm = group(root, -0.43, 1.72, 0),
        rightArm = group(root, 0.43, 1.72, 0)
      piece(leftArm, 'box', clothes, [0, -0.32, 0], [0.2, 0.72, 0.26])
      piece(rightArm, 'box', clothes, [0, -0.32, 0], [0.2, 0.72, 0.26])
      p.root = root
      p.legs = [leftLeg, rightLeg]
      p.arms = [leftArm, rightArm]
      this.pedestrians.push(p)
    }
  }

  isRedAhead (v) {
    for (const s of this.signals) {
      const intersection = v.axis === 'z' ? s.z : s.x
      const lateral = v.axis === 'z' ? Math.abs(v.x - s.x) : Math.abs(v.z - s.z)
      if (lateral > 5) continue
      const longitudinal =
        (intersection - (v.axis === 'z' ? v.z : v.x)) * v.sign
      if (
        longitudinal > 0 &&
        longitudinal < 10 &&
        !signalAllows(v.axis, this.seconds, s.offset)
      )
        return true
    }
    return false
  }

  update (dt, night, activeVehicle = null) {
    this.seconds += dt
    for (const s of this.signals) {
      const go = signalAllows(s.axis, this.seconds, s.offset)
      s.red.material.emissiveIntensity = go ? 0.08 : 2.4
      s.green.material.emissiveIntensity = go ? 2.4 : 0.08
    }
    for (const v of this.traffic) {
      const stop = this.isRedAhead(v)
      const ds = stop ? 0 : v.speed * dt * v.sign
      const next = {
        ...v,
        x: v.x + (v.axis === 'x' ? ds : 0),
        z: v.z + (v.axis === 'z' ? ds : 0),
        yaw: v.heading
      }
      const test = vehicleBounds(next, 0.8)
      const blocker = this.traffic.some(
        other =>
          other !== v &&
          boxesOverlap(
            test,
            vehicleBounds({ ...other, yaw: other.heading }, 0.65)
          )
      )
      const userBlock =
        activeVehicle &&
        activeVehicle.kind !== 'plane' &&
        activeVehicle.kind !== 'boat' &&
        activeVehicle.kind !== 'helicopter' &&
        boxesOverlap(test, vehicleBounds(activeVehicle, 1))
      const moved = !blocker && !userBlock
      if (moved) {
        v.x = next.x
        v.z = next.z
      }
      for (const w of v.wheels) {
        if (moved)
          w.node.rotation.x -=
            Math.abs(ds) / (v.kind === 'motorbike' ? 0.64 : 0.52)
        if (w.front) w.node.rotation.y = 0
      }
      if (v.sirenBars) {
        const pulse = Math.sin(this.seconds * 8) > 0
        v.sirenBars[0].material.emissiveIntensity = pulse ? 1.8 : 0.2
        v.sirenBars[1].material.emissiveIntensity = pulse ? 0.2 : 1.8
      }
      if (v.x > 452) v.x = -350
      else if (v.x < -358) v.x = 440
      if (v.z > 450) v.z = -360
      else if (v.z < -380) v.z = 442
      if (v.x > 270 && v.x < 615 && v.z < 235 && v.z > -635) {
        if (v.axis === 'x') v.x = -240
        else v.z = 90
      }
      v.root.position.set(v.x, 0, v.z)
      v.root.rotation.y = -v.heading
      for (const l of v.heads)
        l.material.emissiveIntensity = night > 0.35 ? 2.9 * night : 0
    }
    for (const p of this.pedestrians) {
      if (p.axis === 'x') p.x += p.sign * p.speed * dt
      else p.z += p.sign * p.speed * dt
      if (p.x > 325) p.x = -325
      else if (p.x < -325) p.x = 325
      if (p.z > 335) p.z = -335
      else if (p.z < -335) p.z = 335
      if (p.x > 270 && p.x < 615 && p.z < 235 && p.z > -635) p.z = 260
      p.root.position.set(p.x, 0, p.z)
      // Fixed: match vehicle -yaw convention so pedestrians face forward along -Z local
      p.root.rotation.y = -axisDirection(p.axis, p.sign)
      const a = Math.sin(this.seconds * 7 + p.phase) * 0.42
      p.legs[0].rotation.x = a
      p.legs[1].rotation.x = -a
      p.arms[0].rotation.x = -a * 0.75
      p.arms[1].rotation.x = a * 0.75
    }
  }

  getCollisionBoxes () {
    return this.traffic.map(v => vehicleBounds({ ...v, yaw: v.heading }, 0.24))
  }
}
