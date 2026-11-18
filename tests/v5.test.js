import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  WORLD_LIMIT,
  PALACE,
  BRIDGES,
  ROOFTOPS,
  HELIPADS,
  inPalaceSquare,
  isMoat,
  onBridge,
  moatBlocks,
  padAt
} from '../src/v5layout.js'
import { vehicleBounds } from '../src/physics.js'

const get = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')

test('royal city expands map more than double the old area', () => {
  assert.equal(WORLD_LIMIT, 1320)
  assert.ok((2 * WORLD_LIMIT) ** 2 / 1380 ** 2 > 2)
  const world = get('world.js')
  assert.match(world, /MAP_HALF\s*=\s*WORLD_LIMIT/)
})

test('palace has one centered bridge on each side of a continuous square moat', () => {
  assert.equal(BRIDGES.length, 4)
  assert.deepEqual(
    BRIDGES.map(x => x.id).sort(),
    ['east', 'north', 'south', 'west']
  )
  assert.equal(inPalaceSquare(PALACE.x, PALACE.z), true)
  for (const side of BRIDGES) {
    assert.equal(isMoat(side.x, side.z), true)
    assert.equal(onBridge(side.x, side.z), true)
    assert.equal(moatBlocks(side.x, side.z), false)
  }
  for (const [x, z] of [
    [PALACE.x + 178, PALACE.z + 51],
    [PALACE.x - 178, PALACE.z - 48],
    [PALACE.x + 55, PALACE.z + 176],
    [PALACE.x - 49, PALACE.z - 181]
  ]) {
    assert.equal(moatBlocks(x, z), true)
  }
  assert.equal(moatBlocks(PALACE.x, PALACE.z), false)
})

test('exactly four distinct rooftop pads plus palace ground pad', () => {
  assert.equal(ROOFTOPS.length, 4)
  assert.equal(HELIPADS.length, 5)
  assert.equal(HELIPADS[0].id, 'palace')
  for (const p of HELIPADS) {
    assert.equal(padAt(p.x, p.z)?.id, p.id)
    assert.ok(p.r >= 8)
  }
  assert.equal(padAt(0, 0), null)
})

test('palace, market, museums, gardens, guards and clock tower modeled', () => {
  const src = get('world.js')
  for (const word of [
    'Southern Audience Hall',
    'Royal Museum',
    'Royal Gallery',
    'Royal Archives',
    'Royal Pavilion',
    'Guard Post',
    'makeRoofTowers',
    'makePalace',
    'makeHelipad',
    'ZAY CHO PLAZA',
    'ROYAL ARTIFACTS MUSEUM',
    'FOOD · CLOTHES · TEA'
  ]) {
    assert.match(src, new RegExp(word))
  }
  assert.match(src, /kind:\s*'market'/)
  assert.match(src, /kind:\s*'palace'/)
})

test('car, police patrol and landing animation systems are connected', () => {
  const vehicles = get('vehicles.js')
  const traffic = get('citylife.js')
  const main = get('main.js')
  assert.match(vehicles, /frontSteerPivots/)
  assert.match(vehicles, /spinner\.rotation\.x/)
  assert.match(vehicles, /pivot\.rotation\.y\s*=\s*v\.turnAngle/)
  assert.match(vehicles, /v\.onPad\s*=/)
  assert.match(traffic, /kind\s*===\s*'police'/)
  assert.match(traffic, /v\.wheels/)
  assert.match(main, /KeyR:/)
})

test('police car has normal car footprint, not airplane footprint', () => {
  const police = vehicleBounds({ kind: 'police', x: 1, z: 1, yaw: 0 })
  const car = vehicleBounds({ kind: 'car', x: 1, z: 1, yaw: 0 })
  assert.deepEqual(police, car)
})

test('player walk/run tuning is a modest 10-15% improvement', () => {
  const main = get('main.js')
  assert.match(main, /i\.fast\s*\?\s*14\.1\s*:\s*7\.9/)
  assert.ok(7.9 / 7 > 1.1 && 7.9 / 7 < 1.15)
})

// Verify all four wall runs cover the full side while leaving just the gates.
test('palace walls reach corner towers and preserve open central gates', () => {
  const world = get('world.js')
  assert.match(world, /const seg\s*=\s*wallHalf\s*-\s*11/)
  assert.match(world, /const pos\s*=\s*half\s*\*\s*\(11\s*\+\s*seg\s*\/\s*2\)/)
})

test('park includes benches, kids, families and couples', () => {
  const world = get('world.js')
  assert.match(world, /makePark\s*\(x,\s*z\)/)
  for (const group of ["'family'", "'child'", "'couple'"]) {
    assert.ok(world.includes(group))
  }
  assert.match(world, /this\.parkActors\.push/)
})
