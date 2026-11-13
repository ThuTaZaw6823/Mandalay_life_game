import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/models');
const avatarNames=['hoodie_male','blazer_female','jacket_senior','rainbow_female','sport_male','olive_female'];
const vehicleNames=['car','motorbike','bicycle','bus','plane','boat'];
function readGlb(name){
 const file=fs.readFileSync(path.join(root,name+'.glb'));
 assert.equal(file.toString('ascii',0,4),'glTF','Valid GLB magic header');
 assert.equal(file.readUInt32LE(4),2,'GLB v2');
 assert.equal(file.readUInt32LE(8),file.length,'Correct binary length');
 assert.equal(file.toString('ascii',16,20),'JSON','Valid first chunk');
 const len=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+len).toString('utf8'));
 assert.ok(json.meshes?.length>10,'Model has mesh parts');
 assert.ok(json.materials?.length>1,'Model has multiple materials');
 return json;
}
for(const name of avatarNames){test('Avatar GLB: '+name,()=>{
 const data=readGlb(name),nodes=data.nodes.map(n=>n.name||'');
 assert.ok(nodes.some(n=>n.startsWith('LA_')),'Left arm is independently animatable');
 assert.ok(nodes.some(n=>n.startsWith('RA_')),'Right arm is independently animatable');
 assert.ok(nodes.some(n=>n.startsWith('LL_')),'Left leg is independently animatable');
 assert.ok(nodes.some(n=>n.startsWith('RL_')),'Right leg is independently animatable');
});}
for(const name of vehicleNames){test('Vehicle GLB: '+name,()=>{
 const data=readGlb(name),nodes=data.nodes.map(n=>n.name||'');
 if(name!=='boat')assert.ok(nodes.some(n=>n.startsWith('Wheel_')),'Wheel geometry included');
 if(name==='plane')assert.ok(nodes.some(n=>n.startsWith('Propeller_Blades')),'Propeller mesh included');
});}
