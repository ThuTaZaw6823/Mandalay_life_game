import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const base=new URL('../', import.meta.url).pathname;
const read=(f)=>readFileSync(join(base,f),'utf8');
test('v5 world extends to 1020 units radius without western river road crossings',()=>{
 const world=read('src/world.js'),physics=read('src/physics.js');
 assert.match(world,/MAP_HALF=WORLD_LIMIT/);assert.match(physics,/maxX:1010/);
 assert.match(world,/RIVER=\{minX:-1008,maxX:-900/);
 assert.doesNotMatch(world,/Three crossings over the riverside strip/);
 assert.match(world,/makeOuterDistricts/);assert.match(world,/runwayWidth:52,runwayLength:356/);
});
test('rider visible and character riding pose connected',()=>{
 const main=read('src/main.js');const character=read('src/character.js');
 assert.match(main,/character\.setVisible\(v\.kind==='bicycle'\|\|v\.kind==='motorbike'\)/);
 assert.match(main,/character\.animateRiding/);
 assert.match(character,/animateRiding\(/);
});
test('three additional aircraft variants are present',()=>{
 const vehicles=read('src/vehicles.js');
 for(const v of ['twin','jet','cargo'])assert.match(vehicles,new RegExp(`variant:'${v}'`));
});
test('street traffic, pedestrian movement and timed signals exist',()=>{
 const city=read('src/citylife.js');
 assert.match(city,/makeTraffic/);assert.match(city,/makePedestrians/);assert.match(city,/makeSignals/);
 assert.match(city,/emissiveIntensity=night>/);
});
test('stars moon animals nighttime and 24 hour HUD are hooked up',()=>{
 const sky=read('src/timecycle.js'),main=read('src/main.js'),world=read('src/world.js'),html=read('index.html');
 assert.match(sky,/this\.stars=/);assert.match(sky,/this\.moon=/);
 assert.match(world,/this\.cats/);assert.match(world,/a\.root\.visible=visible/);
 assert.match(main,/world\.setTimeOfDay/);assert.match(main,/formatClock\(dayNight\.time\)/);
 assert.match(html,/id="gameTime"/);
});
