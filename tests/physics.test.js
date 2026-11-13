import test from 'node:test';
import assert from 'node:assert/strict';
import {forward,turnYaw,box,collides,sweptMove,integrateJump} from '../src/physics.js';
test('D turns toward screen-right for north-facing character',()=>{
  const right=forward(turnYaw(0,1,2,0.5));
  const left=forward(turnYaw(0,-1,2,0.5));
  assert.ok(right.x>0);assert.ok(left.x<0);
});
test('collision blocks penetration and substeps prevent tunneling',()=>{
  const building=[box(0,-10,8,8)];
  assert.equal(collides(0,-10,1,building),true);
  const moved=sweptMove({x:0,z:8},0,-38,1,building);
  assert.ok(moved.z>-5,'fast character must stop before northern building');
});
test('horizontal slide works along building edge',()=>{
  const building=[box(0,0,8,8)];
  const p=sweptMove({x:-6,z:0},8,8,1,building);
  assert.ok(p.z>0);assert.equal(collides(p.x,p.z,1,building),false);
});
test('jump rises, falls and lands',()=>{
  const p={y:0,vy:10,grounded:false};
  let peak=0;
  for(let i=0;i<100;i++){integrateJump(p,1/60);peak=Math.max(peak,p.y);}
  assert.ok(peak>1);assert.equal(p.y,0);assert.equal(p.grounded,true);
});
