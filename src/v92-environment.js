/**
 * Mandalay Life V9.2 — safer streetlights and exactly timed on/off lighting.
 * Called AFTER V8's World prototype remaster installer, BEFORE new World(scene).
 * It leaves game save, weather, mission and vehicle systems intact.
 */
import * as THREE from 'three'
import { ROADS_X, ROADS_Z } from './world.js'
import { inPalaceSquare } from './v5layout.js'

const STEPS = [14, 33, 52] // exactly three curbside poles per eligible main-road block
const AIRPORT = (x, z) => x > 255 && x < 632 && z > -655 && z < 255
const near = (v, list) => list.some(p => Math.abs(v-p)<12)
const poleGeometry = new THREE.CylinderGeometry(.13,.19,5.8,7)
const armGeometry = new THREE.BoxGeometry(1,1,1)
const lampGeometry = new THREE.SphereGeometry(1,8,6)
const poolGeometry = new THREE.CircleGeometry(1,18)
const identity = new THREE.Quaternion()
const tmpMatrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const scale = new THREE.Vector3()
const flatQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2)

function makeInstances(geometry, material, points) {
  const m=new THREE.InstancedMesh(geometry,material,points.length)
  m.frustumCulled=false
  m.castShadow=false
  m.receiveShadow=false
  return m
}
function compose(mesh,i,x,y,z,sx,sy,sz,quat=identity) {
  tmpMatrix.compose(position.set(x,y,z),quat,scale.set(sx,sy,sz))
  mesh.setMatrixAt(i,tmpMatrix)
}
function createStreetlights(world) {
  const posts=[]
  // The primary roads are picked from the existing V7/V8 grid. Three poles per
  // eligible 66-unit street block, on just one sidewalk side, never in lanes.
  const mainX = ROADS_X.filter((x,i)=>i%4===0 && x>-490 && x<610)
  const mainZ = ROADS_Z.filter((z,i)=>i%4===0 && z>-480 && z<610)
  const canPlace=(x,z) => {
    if(AIRPORT(x,z) || inPalaceSquare(x,z,15) || Math.abs(x)>820 || Math.abs(z)>870)return false
    // Bases are off the 13-unit driving surface AND 2.7-unit curb strip.
    if(near(x,ROADS_X) && near(z,ROADS_Z))return false // no poles at intersections
    return !world.obstacles.some(b=>x>b.minX-.8&&x<b.maxX+.8&&z>b.minZ-.8&&z<b.maxZ+.8)
  }
  for(const x of mainX) for(let i=0;i<ROADS_Z.length-1;i++) {
    const a=ROADS_Z[i],end=ROADS_Z[i+1]
    if(end-a!==66) continue
    const side=(i%2===0)?1:-1
    for(const step of STEPS){
      const z=a+step,px=x+side*10.2,pz=z
      if(canPlace(px,pz)) posts.push({x:px,z:pz,hx:px-side*2.0,hz:z})
    }
  }
  for(const z of mainZ) for(let i=0;i<ROADS_X.length-1;i++) {
    const a=ROADS_X[i],end=ROADS_X[i+1]
    if(end-a!==66) continue
    const side=(i%2===0)?1:-1
    for(const step of STEPS){
      const x=a+step,px=x,pz=z+side*10.2
      if(canPlace(px,pz)) posts.push({x:px,z:pz,hx:x,hz:pz-side*2.0})
    }
  }
  if(!posts.length) return
  const poleMat=new THREE.MeshStandardMaterial({color:0x58676a,roughness:.8})
  const shadeMat=new THREE.MeshStandardMaterial({color:0xd0ccbb,roughness:.7})
  const bulbMat=new THREE.MeshStandardMaterial({color:0x7f7560,emissive:0xffdda0,emissiveIntensity:0,roughness:.7})
  const poolMat=new THREE.MeshBasicMaterial({color:0xffd895,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})
  const pole=makeInstances(poleGeometry,poleMat,posts)
  const arm=makeInstances(armGeometry,poleMat,posts)
  const shade=makeInstances(armGeometry,shadeMat,posts)
  const bulb=makeInstances(lampGeometry,bulbMat,posts)
  const pools=makeInstances(poolGeometry,poolMat,posts)
  for(let i=0;i<posts.length;i++) {
    const p=posts[i]
    compose(pole,i,p.x,2.90,p.z,1,1,1)
    compose(arm,i,(p.x+p.hx)/2,5.72,(p.z+p.hz)/2,
      Math.abs(p.x-p.hx)>.1?2.15:.14,.14,Math.abs(p.z-p.hz)>.1?2.15:.14)
    compose(shade,i,p.hx,5.61,p.hz,.88,.15,.88)
    compose(bulb,i,p.hx,5.51,p.hz,.30,.12,.30)
    compose(pools,i,p.hx,.236,p.hz,3.4,3.4,3.4,flatQuat)
  }
  for(const m of [pole,arm,shade,bulb,pools]){
    m.instanceMatrix.needsUpdate=true
    world.city.add(m)
  }
  world.__v92Streetlights={bulbMat,poolMat,poles:posts.length,isOn:null}
}

export function installV92Environment(World) {
  if (World.prototype.__v92EnvironmentInstalled)return
  World.prototype.__v92EnvironmentInstalled=true
  const originalOuter=World.prototype.makeOuterDistricts
  const originalClock=World.prototype.setTimeOfDay
  World.prototype.makeOuterDistricts=function (...args) {
    const output=originalOuter.apply(this,args)
    createStreetlights(this)
    return output
  }
  World.prototype.setTimeOfDay=function(hours,nightStrength) {
    originalClock.call(this,hours,nightStrength)
    const lamps=this.__v92Streetlights
    const on = hours>=18 || hours<6
    if(lamps && lamps.isOn!==on) {
      lamps.isOn=on
      lamps.bulbMat.emissiveIntensity=on?2.7:0
      lamps.bulbMat.color.setHex(on?0xffedbd:0x7f7560)
      lamps.poolMat.opacity=on?.17:0
      lamps.bulbMat.needsUpdate=true
      lamps.poolMat.needsUpdate=true
    }
    // Align legacy V7 lamp posts to the same 18:00—06:00 schedule.
    if(this.streetLights)for(const m of this.streetLights)
      if(m.material?.emissive)m.material.emissiveIntensity=on?2.4:0
  }
}
