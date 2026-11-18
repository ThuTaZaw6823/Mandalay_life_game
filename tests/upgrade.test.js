import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const base = new URL('../', import.meta.url).pathname
const read = f => readFileSync(join(base, f), 'utf8')

test('v5 world extends to 1320 units radius without western river road crossings', () => {
  const world = read('src/world.js')
  const physics = read('src/physics.js')
  assert.match(world, /MAP_HALF\s*=\s*WORLD_LIMIT/)
  assert.match(physics, /maxX:\s*1300/)
  assert.match(world, /RIVER\s*=\s*\{\s*minX:\s*-1008,\s*maxX:\s*-900/)
  assert.doesNotMatch(world, /Three crossings over the riverside strip/)
  assert.match(world, /makeOuterDistricts/)
  assert.match(world, /runwayWidth:\s*52,\s*runwayLength:\s*760/)
})

test('rider visible and character riding pose connected', () => {
  const main = read('src/main.js')
  const character = read('src/character.js')
  assert.match(
    main,
    /character\.setVisible\(\s*vehicle\.kind\s*===\s*'bicycle'\s*\|\|\s*vehicle\.kind\s*===\s*'motorbike'\s*\)/
  )
  assert.match(main, /character\.animateRiding/)
  assert.match(character, /animateRiding\s*\(/)
})

test('three additional aircraft variants are present', () => {
  const vehicles = read('src/vehicles.js')
  for (const v of ['twin', 'jet', 'cargo']) {
    assert.match(vehicles, new RegExp(`variant:\\s*'${v}'`))
  }
})

test('street traffic, pedestrian movement and timed signals exist', () => {
  const city = read('src/citylife.js')
  assert.match(city, /makeTraffic/)
  assert.match(city, /makePedestrians/)
  assert.match(city, /makeSignals/)
  assert.match(city, /emissiveIntensity\s*=\s*night\s*>/)
})

test('stars moon animals nighttime and 24 hour HUD are hooked up', () => {
  const sky = read('src/timecycle.js')
  const main = read('src/main.js')
  const world = read('src/world.js')
  const html = read('index.html')
  assert.match(sky, /this\.stars\s*=/)
  assert.match(sky, /this\.moon\s*=/)
  assert.match(world, /this\.cats/)
  assert.match(world, /a\.root\.visible\s*=\s*visible/)
  assert.match(main, /world\.setTimeOfDay/)
  assert.match(main, /formatClock\(dayNight\.time\)/)
  assert.match(html, /id="gameTime"/)
})
