import test from 'node:test';
import assert from 'node:assert/strict';
import {gameSeconds,formatClock,daylightPhase,nightBlend,GAME_SECONDS_PER_REAL_SECOND,DAY_SECONDS} from '../src/gameclock.js';
test('20 real seconds represent exactly one in-game hour',()=>{
  assert.equal(GAME_SECONDS_PER_REAL_SECOND,180);
  assert.equal(gameSeconds(20,7*3600),8*3600);
  assert.equal(gameSeconds(40,7*3600),9*3600);
});
test('24 hour clock uses HH:mm and wraps at 24:00',()=>{
  assert.equal(formatClock(0),'00:00');
  assert.equal(formatClock(19*3600+4*60),'19:04');
  assert.equal(formatClock(gameSeconds(20,23*3600)),'00:00');
  assert.equal(gameSeconds(480,0),0);
});
test('morning noon sunset night and light strength',()=>{
  assert.equal(daylightPhase(6),'MORNING');
  assert.equal(daylightPhase(12),'DAYTIME');
  assert.equal(daylightPhase(18),'SUNSET');
  assert.equal(daylightPhase(22),'NIGHT');
  assert.equal(nightBlend(23),1);assert.equal(nightBlend(12),0);
  assert.equal(nightBlend(18),0);assert.equal(nightBlend(19.5),1);
});
