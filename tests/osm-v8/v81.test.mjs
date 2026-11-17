import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {closestPointOnSegment,nearestDriveableRoad,validRoadRoutes,hashNumber} from '../../src/osm-v8/road-graph.js'
const data=JSON.parse(readFileSync(new URL('../../public/data/mandalay.json',import.meta.url)))

test('segment projection and bounded t are correct',()=>{
  assert.deepEqual(closestPointOnSegment(5,4,[0,0],[10,0]),{x:5,z:0,t:.5,distance2:16})
  assert.equal(closestPointOnSegment(-9,5,[0,0],[10,0]).t,0)
})
test('nearest driving road is a mapped non-footpath highway',()=>{
  const p=nearestDriveableRoad(data,0,0)
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z))
  assert.ok(Number.isFinite(p.heading))
  assert.ok(!['footway','path','steps'].includes(p.road.kind))
})
test('traffic routes have at least two contiguous mapped points inside the game region',()=>{
  const routes=validRoadRoutes(data)
  assert.ok(routes.length>100)
  const w=data.sizeMeters.width/2,h=data.sizeMeters.height/2
  for(const road of routes) for(const p of road.path){assert.ok(Math.abs(p[0])<w&&Math.abs(p[1])<h)}
  for(const road of routes)for(let i=1;i<road.path.length;i++)assert.ok(Math.hypot(road.path[i][0]-road.path[i-1][0],road.path[i][1]-road.path[i-1][1])<=475)
})
test('decorative GLB asset is bundled and has a valid binary glTF header',()=>{
  const glb=readFileSync(new URL('../../public/models/mandalay-kiosk.glb',import.meta.url))
  assert.equal(glb.subarray(0,4).toString(),'glTF')
  assert.equal(glb.readUInt32LE(4),2)
  assert.equal(glb.readUInt32LE(8),glb.length)
  const place=JSON.parse(readFileSync(new URL('../../public/data/model-placements.json',import.meta.url)))
  assert.equal(place[0].anchor,'spawn')
  assert.match(place[0].file,/^models\//)
})
test('hash-based visual variants are deterministic',()=>{
  assert.equal(hashNumber('337237721'),hashNumber('337237721'))
  assert.notEqual(hashNumber('337237721'),hashNumber('337237722'))
})

test('every HUD element requested by the v8.1 engine exists',()=>{
  const main=readFileSync(new URL('../../src/osm-v8/main.js',import.meta.url),'utf8')
  const html=readFileSync(new URL('../../osm-preview.html',import.meta.url),'utf8')
  const ids=new Set([...main.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m=>m[1]))
  for(const id of ids)assert.ok(html.includes(`id="${id}"`),`missing #${id}`)
})
