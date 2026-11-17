import test from 'node:test'
import assert from 'node:assert/strict'
import { lonLatToWorld, worldToLonLat } from '../../src/osm-v8/geo.js'
const center = { lat: 21.9756, lon: 96.10505 }
test('origin projects to zero', () => {
  assert.deepEqual(lonLatToWorld(center.lon, center.lat, center), { x: 0, z: 0 })
})
test('east increases x; north decreases z', () => {
  assert.ok(lonLatToWorld(center.lon + 0.001, center.lat, center).x > 0)
  assert.ok(lonLatToWorld(center.lon, center.lat + 0.001, center).z < 0)
})
test('projection round trips', () => {
  const original = { lon: 96.1112, lat: 21.9804 }
  const world = lonLatToWorld(original.lon, original.lat, center)
  const inverse = worldToLonLat(world.x, world.z, center)
  assert.ok(Math.abs(inverse.lon-original.lon) < 1e-9)
  assert.ok(Math.abs(inverse.lat-original.lat) < 1e-9)
})
test('invalid coordinates are rejected', () => {
  assert.throws(() => lonLatToWorld(NaN, 21.9, center), TypeError)
})
