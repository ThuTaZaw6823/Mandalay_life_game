import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const vehicles=readFileSync(new URL('../../src/osm-v8/vehicles.js',import.meta.url),'utf8')
const main=readFileSync(new URL('../../src/osm-v8/main.js',import.meta.url),'utf8')

test('OSM cars reuse original v5 car GLB without changing driving interface',()=>{
  assert.match(vehicles,/GLTFLoader/)
  assert.match(vehicles,/models\/car\.glb/)
  assert.match(vehicles,/useOriginalCarModels/)
  assert.match(vehicles,/toggleDrive\(hero\)/)
  assert.match(vehicles,/updateTraffic\(dt\)/)
})

test('original car GLB exists in project and is binary glTF',()=>{
  const bytes=readFileSync(new URL('../../public/models/car.glb',import.meta.url))
  assert.equal(bytes.subarray(0,4).toString(),'glTF')
  assert.equal(bytes.readUInt32LE(4),2)
  assert.equal(bytes.readUInt32LE(8),bytes.length)
})

test('OSM game initializes GLB cars and keeps fallback',()=>{
  assert.match(main,/fleet\.useOriginalCarModels\(\)/)
  assert.match(main,/Fallback procedural cars/)
  assert.match(vehicles,/return \{loaded:false/)
})
