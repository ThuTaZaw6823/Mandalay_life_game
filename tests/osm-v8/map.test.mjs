import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const d = JSON.parse(readFileSync(new URL('../../public/data/mandalay.json', import.meta.url)))
test('provided OSM XML imported to real local snapshot', () => {
  assert.equal(d.format, 'mandalay-life-offline-osm-v1')
  assert.equal(d.license, 'ODbL 1.0')
  assert.ok(d.counts.roads >= 900)
  assert.ok(d.counts.buildings >= 9500)
  assert.ok(d.counts.pois > 200)
})
test('all road line strings use world coordinates', () => {
  for (const road of d.roads) {
    assert.ok(road.path.length >= 2)
    for (const p of road.path) assert.ok(p.length === 2 && p.every(Number.isFinite))
  }
})
test('building footprints have >= 3 vertices and estimated height where OSM lacks it', () => {
  for (const b of d.buildings) {
    assert.ok(b.ring.length >= 3)
    assert.ok(b.height >= 2)
    assert.ok(['mapped', 'levels', 'estimated'].includes(b.heightSource))
  }
})
