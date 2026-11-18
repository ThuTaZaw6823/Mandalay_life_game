import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {nextWeather,scheduledWeather,effectiveWeather,weatherLabel} from '../src/weatherstate.js';
import {vehicleBounds,boxesOverlap,integrateJump,sweptMove,worldBounds} from '../src/physics.js';
const base=new URL('../',import.meta.url).pathname;
const read=f=>readFileSync(join(base,f),'utf8');

test('weather modes cycle from auto through clear rain storm snow',()=>{
  let mode='auto';for(const expect of ['clear','rain','storm','snow','auto']){mode=nextWeather(mode);assert.equal(mode,expect);}
  assert.equal(weatherLabel('storm'),'THUNDERSTORM');
});
test('automatic weather forecast includes rain lightning and snow',()=>{
  assert.equal(scheduledWeather(0),'clear');
  assert.equal(scheduledWeather(200),'rain');
  assert.equal(scheduledWeather(300),'storm');
  assert.equal(scheduledWeather(495),'snow');
  assert.equal(effectiveWeather('snow',20),'snow');
});
test('rotated footprint accounts for large bus body',()=>{
  const car=vehicleBounds({x:0,z:0,yaw:0,kind:'car'});
  const bus=vehicleBounds({x:0,z:0,yaw:0,kind:'bus'});
  assert.ok(bus.maxZ-bus.minZ>car.maxZ-car.minZ);
  assert.ok(bus.maxX-bus.minX>car.maxX-car.minX);
  const rotated=vehicleBounds({x:0,z:0,yaw:Math.PI/2,kind:'bus'});
  assert.ok(rotated.maxX-rotated.minX>bus.maxX-bus.minX);
  assert.ok(boxesOverlap(car,bus));
  assert.equal(boxesOverlap(bus,vehicleBounds({x:50,z:50,kind:'bus'})),false);
});
test('upper floor jump lands back on the upper storey, not the ground',()=>{
  const body={y:7.2,vy:10,grounded:false};
  for(let i=0;i<150;i++)integrateJump(body,1/60,-25,7.2);
  assert.equal(body.grounded,true);assert.equal(body.y,7.2);
});
test('vehicle cannot tunnel through a wall via swept move',()=>{
  const wall=[{minX:12,maxX:14,minZ:-3,maxZ:3}];
  const result=sweptMove({x:0,z:0},30,0,2.1,wall,worldBounds);
  assert.ok(result.x<10);assert.equal(result.blocked,true);
});
test('three distinct river boats occupy separated mooring positions', () => {
  const boats = read('src/riverboats.js')
  for (const name of ['ferry', 'cargo', 'fishing']) {
    assert.match(boats, new RegExp(`variant:\\s*'${name}'`))
  }
  for (const z of ['-325', '15', '350']) {
    assert.match(boats, new RegExp(`z:\\s*${z}\\b`))
  }
  const vehicles = read('src/vehicles.js')
  assert.match(vehicles, /\.\.\.MOORINGS\.map/)
})

test('every regular building has a door; mixed floors switch offices and apartments', () => {
  const world = read('src/world.js')
  const main = read('src/main.js')
  assert.match(world, /this\.doors\.push\(\{\s*x,\s*z:\s*z\s*\+\s*d\s*\/\s*2\s*\+\s*1\.35/)
  assert.match(world, /this\.interiorKind\s*=\s*isPalace/)
  assert.match(world, /setInteriorFloor\s*\(level\)/)
  assert.match(main, /KeyQ:/)
  assert.match(main, /nearStairs\(player\)/)
})

test('airport complex is clear of obstacles and the river has no over-water roads', () => {
  const world = read('src/world.js')
  assert.match(
    world,
    /this\.airport\s*=\s*\{\s*x:\s*402,\s*z:\s*-198,\s*runwayWidth:\s*52,\s*runwayLength:\s*760\s*\}/
  )
  assert.match(world, /RIVER\.centerX/)
  assert.doesNotMatch(world, /Three crossings over the riverside strip/)
})

test('weather UI and indoor rain suppression are present', () => {
  const html = read('index.html')
  const game = read('src/main.js')
  const weather = read('src/weather.js')
  assert.match(html, /id="weatherToggle"/)
  assert.match(game, /weather\.rain\.points\.visible\s*=\s*false/)
  assert.match(weather, /this\.thunder\(\)/)
  assert.match(weather, /this\.lightningLight/)
})
