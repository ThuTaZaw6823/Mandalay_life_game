/** Mandalay Life V9 — ten distinctive drivable, procedural city vehicles.
 * Uses existing Three.js, world, fleet and control systems. No external assets.
 */
import * as THREE from 'three'
import { createV91Model } from './v91-car-models.js'
import { group, piece, wheel, mat } from './visual.js'
import { ROADS_X, ROADS_Z, RIVER } from './world.js'
import { inPalaceSquare } from './v5layout.js'
import { vehicleBounds, boxesOverlap } from './physics.js'
import { signalAllows } from './citylife.js'

export const V9_MODELS = Object.freeze([
  {id:'suv',      name:'Mandalay SUV',             color:0xf3efe7, roof:0x293a48, width:2.75,length:5.4, height:1.98, max:26, turn:1.48, cruise:12.8},
  {id:'luxury',   name:'Mandalay Luxury Sedan',    color:0x292f3c, roof:0x1d2934, width:2.55,length:5.45,height:1.62, max:29, turn:1.54, cruise:13.5},
  {id:'sport',    name:'Mandalay Sports Car',      color:0xd72b35, roof:0x171a24, width:2.55,length:5.15,height:1.35, max:38, turn:1.85, cruise:15.0},
  {id:'taxi',     name:'Mandalay City Taxi',       color:0xf6bc35, roof:0xf6bc35, width:2.35,length:4.8, height:1.69, max:27, turn:1.55, cruise:12.4},
  {id:'pickup',   name:'Mandalay Pickup Truck',    color:0x6c866a, roof:0x566f58, width:2.68,length:5.85,height:1.98, max:26, turn:1.35, cruise:11.7},
  {id:'minivan',  name:'Mandalay Passenger Van',   color:0x87accc, roof:0xf3f1e9, width:2.63,length:5.65,height:2.26, max:24, turn:1.35, cruise:11.7},
  {id:'bus',      name:'Mandalay City Bus',        color:0x5b9abd, roof:0xf2f0df, width:3.15,length:10.0,height:3.16,max:19, turn:0.90, cruise:8.8},
  {id:'delivery', name:'Mandalay Delivery Truck',  color:0xe9e8e3, roof:0xffffff, width:2.75,length:6.85,height:2.84, max:22, turn:1.13, cruise:9.9},
  {id:'jeep',     name:'Mandalay Off-road Jeep',   color:0xee8b2c, roof:0x1b2831, width:2.60,length:4.95,height:2.12, max:27, turn:1.55, cruise:11.8},
  {id:'compact',  name:'Mandalay Compact Car',     color:0x87b8de, roof:0x243a4a, width:2.18,length:4.25,height:1.67, max:27, turn:1.75, cruise:13.0}
])

const glass = mat(0x506c7c,{roughness:0.22,metalness:0.12})
const glassDark = mat(0x263e4d,{roughness:0.27,metalness:0.12})
const trim = mat(0x242b33,{roughness:0.78})
const metal = mat(0xcbd2d2,{metalness:0.65,roughness:0.3})
const headlight = mat(0xfaf3db,{emissive:0xfbd891,emissiveIntensity:0.35})
const taillight = mat(0xcd3f44,{emissive:0xdb4141,emissiveIntensity:0.45})
const grille = mat(0x1b2831,{roughness:0.55,metalness:0.1})
const amber = mat(0xffc35d,{emissive:0xe7a835,emissiveIntensity:0.35})

function block(root, color, pos, size, cast=true) {
  return piece(root,'box',color,pos,size,{cast})
}
function dot(root, color, pos, size) {
  return piece(root,'sphere',color,pos,size,{cast:true})
}
function wings(root, spec, z, y, w, wheelY, wheelR, wheels, darkWheels=false) {
  for (const x of [-w / 2 + .12,w / 2 - .12]) {
    const p = wheel(root,[x,wheelY,z],wheelR,darkWheels ? .24 : .26)
    wheels.push(p)
  }
}
function stripes(root, length, width, z, count=4) {
  for(let i=0;i<count;i++) {
    const x=(i-(count-1)/2)*width/(count+.45)
    block(root,0x9eaeb2,[x,0.95,z],[.12,.22,.035],false)
  }
}

// V9.2 shaped mesh with separate front-wheel steering and rolling wheel groups.
export function createV9Model(parent,spec,lowDetail=false) {
  return createV91Model(parent,spec,lowDetail)
}

function clearance(a, b, pad=.55) {
  return boxesOverlap(vehicleBounds(a,pad),vehicleBounds(b,pad))
}
function footprintIntersectsBox(actor, b, pad=1.3) {
  const a=vehicleBounds(actor,pad)
  return a.minX<b.maxX && a.maxX>b.minX && a.minZ<b.maxZ && a.maxZ>b.minZ
}
function isAirport(x,z) { return x>270 && x<615 && z>-635 && z<235 }
function validRoad(x,z) {
  return x>-830 && x<1250 && z>-1250 && z<1250 && x>RIVER.maxX+20 &&
    !isAirport(x,z) && !inPalaceSquare(x,z,18)
}
function laneDirection(axis,sign) {
  return axis==='x' ? sign>0 ? Math.PI/2 : -Math.PI/2 : sign>0 ? Math.PI : 0
}
function stableRandom(seed) { let s=seed>>>0;return () => ((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296) }

export class TrafficV9 {
  constructor(world, cityLife, fleet) {
    this.world=world;this.cityLife=cityLife;this.fleet=fleet
    this.root=group(world.city)
    this.actors=[];this.elapsed=0;this.random=stableRandom(912483)
    this.claimedParked=[]
    this.lowDetail=typeof window!=='undefined' && window.matchMedia?.('(pointer:coarse)').matches
    // Remove old moving fleet meshes, keeping traffic lights and pedestrians.
    for(const v of cityLife.traffic) v.root.removeFromParent()
    cityLife.traffic.length=0
    this.replaceParkedVehicleModels()
    this.spawnInitial(this.lowDetail ? 12 : 24)
  }
  replaceParkedVehicleModels() {
    for(const v of this.fleet.vehicles) {
      if(v.kind!=='car' && v.kind!=='bus') continue
      const spec=V9_MODELS[v.kind==='bus'?6:0]
      // Replace original parked SUV/Bus visuals without changing their controls.
      v.modelHolder.clear()
      const render=createV9Model(v.modelHolder,spec,this.lowDetail)
      v.wheelSpinners=render.wheelSpinners
      v.frontSteerPivots=render.frontSteerPivots
      v.width=spec.width;v.length=spec.length
      v.r=v.kind==='bus'?2.55:1.8
      v.name=spec.name
      this.fleet.addHeadlights(v)
      this.fleet.positionVisual(v)
    }
  }
  safeAt(actor, others=[], useWorld=true) {
    if(!validRoad(actor.x,actor.z))return false
    // Keep spawned/parked vehicles clear of the intersection entry box.
    const axisPoints=actor.axis==='x'?ROADS_X:ROADS_Z
    const longitudinal=actor.axis==='x'?actor.x:actor.z
    if(axisPoints.some(p=>Math.abs(p-longitudinal)<12+(actor.length||5)/2))return false
    if(useWorld && this.world.obstacles.some(b=>footprintIntersectsBox(actor,b,.8)))return false
    for(const v of others) if(v!==actor && clearance(actor,v,1.2)) return false
    for(const v of this.fleet.vehicles) {
      if(v.kind==='plane'||v.kind==='helicopter'||v.kind==='boat') continue
      if(clearance(actor,v,.65)) return false
    }
    // Never start a traffic vehicle over the player or their saved location.
    const protectedPositions=[{x:0,z:16}]
    try {
      const saved=JSON.parse(localStorage.getItem('mandalay-life-v7-progress')||'{}')
      if(Number.isFinite(saved?.player?.x) && Number.isFinite(saved?.player?.z))
        protectedPositions.push(saved.player)
    } catch (_) {}
    if(protectedPositions.some(p=>Math.hypot(actor.x-p.x,actor.z-p.z)<12)) return false
    return true
  }
  makeActor(i, spec, axis, sign, road, longitudinal) {
    const offset=sign>0?-2.45:2.45
    const x=axis==='z'?road+offset:longitudinal
    const z=axis==='x'?road+offset:longitudinal
    const yaw=laneDirection(axis,sign)
    const v={id:`v9-${i}`,name:spec.name,modelType:spec.id,spec,kind:spec.id==='bus'?'bus':'car',
      axis,sign,road,x,z,yaw,heading:yaw,width:spec.width,length:spec.length,
      speed:spec.cruise, cruise:spec.cruise,turn:spec.turn,r:spec.width*.65,
      velocity:0,wheels:[],frontSteerPivots:[],turnAngle:0,alt:0}
    return v
  }
  spawnInitial(count) {
    const vertical=ROADS_X.filter(x=>x>-520 && x<285)
    const horizontal=ROADS_Z.filter(z=>z>-420 && z<510)
    for(let i=0;i<count;i++) {
      const spec=V9_MODELS[i%V9_MODELS.length]
      let chosen=null
      for(let attempt=0;attempt<110;attempt++) {
        const axis=(i+attempt)%2?'x':'z'
        const sign=((i+Math.floor(attempt/2))%4<2)?1:-1
        const list=axis==='z'?vertical:horizontal
        const road=list[Math.floor(this.random()*list.length)]
        const longitude=axis==='z' ? -390+this.random()*850 : -500+this.random()*750
        const v=this.makeActor(i,spec,axis,sign,road,longitude)
        if(this.safeAt(v,this.actors)) {chosen=v;break}
      }
      if(!chosen) continue
      chosen.root=group(this.root,chosen.x,0,chosen.z)
      chosen.modelHolder=group(chosen.root)
      const render=createV9Model(chosen.modelHolder,spec,this.lowDetail)
      chosen.wheelSpinners=render.wheelSpinners
      chosen.frontSteerPivots=render.frontSteerPivots
      chosen.root.rotation.y=-chosen.yaw
      this.actors.push(chosen)
    }
  }
  nearest(pos, max=7.5) {
    let best=null,bestDistance=Infinity
    for(const v of this.actors) {
      const dist=Math.hypot(pos.x-v.x,pos.z-v.z)
      const limit=max+(v.kind==='bus'?2.0:0)
      if(dist<limit&&dist<bestDistance){best=v;bestDistance=dist}
    }
    return best
  }
  // Claim a moving car immediately: it leaves AI management and becomes a real
  // Vehicles object. Existing WASD/Shift/E controls then work without conversion.
  claim(v) {
    const index=this.actors.indexOf(v)
    if(index<0)return null
    this.actors.splice(index,1)
    this.root.remove(v.root)
    this.world.city.add(v.root)
    v.velocity=0
    v.speed=v.spec.max
    v.turn=v.spec.turn
    v.claimedFromTraffic=true
    v.isParked=false
    v.wheelSpinners=v.wheelSpinners||[]
    v.frontSteerPivots=v.frontSteerPivots||[]
    this.fleet.addHeadlights(v)
    this.fleet.vehicles.push(v)
    this.fleet.positionVisual(v)
    return v
  }
  onLeaveVehicle(v) {
    if(!v?.claimedFromTraffic)return
    // Move the car clear of the driving lane if a legal-looking shoulder exists.
    // This keeps stopped claimed cars from becoming a permanent traffic jam.
    const nearVertical=ROADS_X.reduce((a,b)=>Math.abs(a-v.x)<Math.abs(b-v.x)?a:b)
    const nearHorizontal=ROADS_Z.reduce((a,b)=>Math.abs(a-v.z)<Math.abs(b-v.z)?a:b)
    const candidates=[]
    for (const side of [-1,1]) {
      if(ROADS_Z.every(z=>Math.abs(v.z-z)>12))
        candidates.push({x:nearVertical+side*14.5,z:v.z,yaw:0})
      if(ROADS_X.every(x=>Math.abs(v.x-x)>12))
        candidates.push({x:v.x,z:nearHorizontal+side*14.5,yaw:Math.PI/2})
    }
    for (const pos of candidates) {
      const possible={...v,...pos}
      if(!this.safeAt(possible,this.actors)) continue
      v.x=pos.x;v.z=pos.z;v.yaw=pos.yaw;v.velocity=0
      this.fleet.positionVisual(v)
      v.isParked=true
      return
    }
    // On a crossing with no safe shoulder: retain the car briefly to allow
    // reboarding, then despawn when the player has moved clear.
    v.parkedCleanupAt=this.elapsed+15
    this.claimedParked.push(v)
  }
  cleanAbandoned(player,activeVehicle) {
    if(!this.claimedParked.length)return
    for(let i=this.claimedParked.length-1;i>=0;i--) {
      const v=this.claimedParked[i]
      if(v===activeVehicle) {this.claimedParked.splice(i,1);continue}
      if(this.elapsed<v.parkedCleanupAt)continue
      if(player && Math.hypot(v.x-player.x,v.z-player.z)<9) continue
      v.root.removeFromParent()
      const j=this.fleet.vehicles.indexOf(v)
      if(j>=0)this.fleet.vehicles.splice(j,1)
      this.claimedParked.splice(i,1)
    }
  }
  intersectionAhead(v) {
    const transverse=v.axis==='z'?ROADS_Z:ROADS_X
    const now=v.axis==='z'?v.z:v.x
    const nearest=transverse.map(p=>({p,d:(p-now)*v.sign})).filter(s=>s.d>0 && s.d<27)
      .sort((a,b)=>a.d-b.d)[0]
    if(!nearest)return null
    const x=v.axis==='z'?v.road:nearest.p
    const z=v.axis==='x'?v.road:nearest.p
    return {...nearest,x,z}
  }
  isRed(v, crossing) {
    // Only actual signalized intersections can be red. No invisible lights.
    const signal=this.cityLife.signals.find(s=>s.axis===v.axis &&
      Math.abs(s.x-crossing.x)<1 && Math.abs(s.z-crossing.z)<1)
    return signal ? !signalAllows(v.axis,this.cityLife.seconds,signal.offset) : false
  }
  aheadGap(v) {
    let best=Infinity
    const all=this.actors.concat(this.fleet.vehicles.filter(a=>a.kind==='car'||a.kind==='bus'||a.kind==='motorbike'))
    for(const other of all) {
      if(other===v)continue
      const along=v.axis==='x'?(other.x-v.x)*v.sign:(other.z-v.z)*v.sign
      const lateral=v.axis==='x'?Math.abs(other.z-v.z):Math.abs(other.x-v.x)
      if(along<0||lateral>3.25)continue
      const gap=along-(v.length+ (other.length||5))/2
      if(gap<best) best=gap
    }
    return best
  }
  blockedCrossing(v,c) {
    for(const other of this.actors) {
      if(other===v || other.axis===v.axis)continue
      if(Math.abs(other.x-c.x)<Math.max(7,other.length/2+3) &&
         Math.abs(other.z-c.z)<Math.max(7,other.length/2+3))return true
    }
    // Player-driven car also owns the intersection while it is crossing.
    for(const other of this.fleet.vehicles) {
      if(other.kind==='boat'||other.kind==='plane'||other.kind==='helicopter')continue
      if(Math.abs(other.x-c.x)<6 && Math.abs(other.z-c.z)<6)return true
    }
    return false
  }
  blockedNext(v,x,z) {
    const after={...v,x,z}
    if(!validRoad(x,z)) return true
    for(const other of this.actors) if(other!==v && clearance(after,other,.6)) return true
    for(const other of this.fleet.vehicles) {
      if(other.kind==='plane'||other.kind==='boat'||other.kind==='helicopter')continue
      if(clearance(after,other,.55))return true
    }
    return this.world.obstacles.some(b=>footprintIntersectsBox(after,b,.25))
  }
  reposition(v) {
    const range=v.axis==='x'?[-505,290]:[-400,485]
    const dir=v.sign
    const past=(v.axis==='x'?v.x:v.z)
    if((dir>0&&past<range[1])||(dir<0&&past>range[0]))return
    const back=dir>0?range[0]+v.length:range[1]-v.length
    const candidate={...v,x:v.axis==='x'?back:v.x,z:v.axis==='z'?back:v.z}
    if(this.safeAt(candidate,this.actors.filter(a=>a!==v))) {
      v.x=candidate.x;v.z=candidate.z;v.velocity=0
    } else { v.velocity=0 }
  }
  update(dt,activeVehicle,player=null) {
    this.elapsed+=dt
    this.cleanAbandoned(player,activeVehicle)
    // AI cars never brake for a red light after crossing the stop line.
    for(const v of this.actors) {
      let wanted=v.cruise
      const gap=this.aheadGap(v)
      if(gap<v.cruise*2+3) wanted=Math.min(wanted,Math.max(0,(gap-3)*1.8))
      const c=this.intersectionAhead(v)
      // Intersection has 13m driving surfaces. Halt full body before its edge.
      const stopDistance=10.65+v.length/2+1.3
      const mustYield=!!c && (this.isRed(v,c) || this.blockedCrossing(v,c))
      if(mustYield && c.d>=stopDistance && c.d<stopDistance+32)
        wanted=Math.min(wanted,Math.max(0,(c.d-stopDistance)*1.7))
      v.velocity+=(wanted-v.velocity)*Math.min(1,dt*(wanted<v.velocity?7.5:2.1))
      let stride=Math.max(0,v.velocity)*dt
      if(mustYield && c.d>=stopDistance) stride=Math.min(stride,Math.max(0,c.d-stopDistance))
      let nx=v.x+(v.axis==='x'?v.sign*stride:0)
      let nz=v.z+(v.axis==='z'?v.sign*stride:0)
      let tries=0
      // Reserve each moving footprint so AI traffic cannot stack.
      while(stride>.015 && this.blockedNext(v,nx,nz) && tries++<8) {
        stride*=.5
        nx=v.x+(v.axis==='x'?v.sign*stride:0)
        nz=v.z+(v.axis==='z'?v.sign*stride:0)
      }
      if(this.blockedNext(v,nx,nz)){stride=0;v.velocity=0}
      else {v.x=nx;v.z=nz}
      for(const wheel of v.wheelSpinners) wheel.rotation.x-=stride/.57
      this.reposition(v)
      v.root.position.set(v.x,0,v.z)
      v.root.rotation.y=-v.yaw
    }
  }
  getCollisionBoxes(){return this.actors.map(v=>vehicleBounds(v,.28))}
}
