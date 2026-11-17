import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findMappedJunctions } from '../../src/osm-v8/road-junctions.js'

test('road geometry: split ways sharing a node make a real junction', () => {
  const roads = [
    {kind:'residential',path:[[0,0],[10,0]]},
    {kind:'residential',path:[[10,0],[20,0]]},
    {kind:'secondary',path:[[10,0],[10,20]]}
  ]
  const junctions = findMappedJunctions(roads)
  assert.equal(junctions.length,1)
  assert.deepEqual(junctions[0].point,[10,0])
  assert.equal(junctions[0].neighbors.size,3)
})

test('a bend without a crossing is not a junction', () => {
  const roads=[{kind:'primary',path:[[0,0],[10,0],[15,5]]}]
  assert.equal(findMappedJunctions(roads).length,0)
})

test('footpaths do not create artificial road intersections',()=>{
  const roads=[
    {kind:'primary',path:[[0,0],[10,0],[20,0]]},
    {kind:'footway',path:[[10,-10],[10,0],[10,10]]}
  ]
  assert.equal(findMappedJunctions(roads).length,0)
})

test('original local OSM network retains many real intersections',()=>{
  const data=JSON.parse(readFileSync(new URL('../../public/data/mandalay.json',import.meta.url)))
  const junctions=findMappedJunctions(data.roads)
  assert.ok(junctions.length>=500)
  assert.ok(junctions.every(n=>n.neighbors.size>=3))
})
