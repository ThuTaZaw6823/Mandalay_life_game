import * as THREE from 'three'
import {nearestDriveableRoad,validRoadRoutes} from './road-graph.js'

const colors=['#9c4f36','#537e8d','#e5d4b2','#3b5f4c','#7e6d83','#bb9d67']
const dark=new THREE.MeshStandardMaterial({color:'#1b2730',roughness:.74})
const glass=new THREE.MeshStandardMaterial({color:'#81afbc',roughness:.28,metalness:.18})
const metal=new THREE.MeshStandardMaterial({color:'#c9c8be',roughness:.53,metalness:.3})

function createCar(color) {
  const root=new THREE.Group()
  const paint=new THREE.MeshStandardMaterial({color,roughness:.56,metalness:.18})
  const mesh=(geometry,mat,x,y,z)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=false;root.add(m);return m}
  mesh(new THREE.BoxGeometry(2.12,.62,4.4),paint,0,.9,0)
  mesh(new THREE.BoxGeometry(1.65,.65,2.34),glass,0,1.47,.07)
  mesh(new THREE.BoxGeometry(1.75,.09,2.4),paint,0,1.83,.07)
  mesh(new THREE.BoxGeometry(1.62,.12,.15),metal,0,.75,-2.2)
  mesh(new THREE.BoxGeometry(1.62,.11,.15),metal,0,.75,2.2)
  for(const sx of [-1,1]) for(const sz of [-1.38,1.4]) {
    const wheel=mesh(new THREE.CylinderGeometry(.45,.45,.25,10),dark,sx*1.13,.48,sz)
    wheel.rotation.z=Math.PI/2
  }
  for(const x of [-.72,.72]) {
    mesh(new THREE.BoxGeometry(.34,.2,.08),metal,x,1.02,-2.21)
    mesh(new THREE.BoxGeometry(.32,.18,.07),new THREE.MeshBasicMaterial({color:'#c94a39'}),x,1.01,2.21)
  }
  root.userData.radius=2.4
  return root
}

function getPose(path,pointIndex,t) {
  const a=path[pointIndex],b=path[Math.min(path.length-1,pointIndex+1)]
  return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,
    heading:Math.atan2(b[0]-a[0],-(b[1]-a[1]))}
}

export class VehicleSystem {
  constructor(scene,data,city,spawn,mobile=false) {
    this.scene=scene;this.city=city;this.data=data;this.mobile=mobile
    this.driving=false;this.speed=0
    this.car=createCar('#b65d43')
    this.car.name='Player drivable car — E near vehicle'
    const tryPositions=[[spawn[0]+15,spawn[1]],[spawn[0]-16,spawn[1]],
      [spawn[0],spawn[1]+16],[spawn[0],spawn[1]-16],[spawn[0]+35,spawn[1]+20]]
    let parking=null
    for(const [x,z] of tryPositions){
      const road=nearestDriveableRoad(data,x,z)
      if(!city.isBlocked(road.x,road.z,2.1)){parking=road;break}
    }
    parking ||= nearestDriveableRoad(data,...spawn)
    this.car.position.set(parking.x,0.16,parking.z)
    this.heading=parking.heading
    this.car.rotation.y=-this.heading
    scene.add(this.car)
    this.traffic=[]
    const routes=validRoadRoutes(data).filter(r=>r.path.length>=3)
    routes.sort((a,b)=>{
      const dist=r=>Math.min(...r.path.map(p=>(p[0]-spawn[0])**2+(p[1]-spawn[1])**2))
      return dist(a)-dist(b)
    })
    const max=mobile?11:24
    // Deterministic traffic sampling from the actual OSM roads; traffic is arcade animation.
    for(let i=0;i<max&&routes.length;i++){
      const route=routes[i%routes.length]
      const vehicle=createCar(colors[i%colors.length])
      vehicle.scale.setScalar(i%7===0?1.15:.93)
      const index=(i*3)%(route.path.length-1)
      const actor={root:vehicle,path:route.path,index,t:(i%8)/9,speed:7+(i%5)*2,reverse:!!(i%2)}
      this.traffic.push(actor)
      scene.add(vehicle)
    }
  }
  toggleDrive(hero) {
    if(this.driving){
      const side=2.9
      let x=this.car.position.x+Math.cos(this.heading)*side
      let z=this.car.position.z+Math.sin(this.heading)*side
      if(this.city.isBlocked(x,z,.75)){
        x=this.car.position.x-Math.cos(this.heading)*side
        z=this.car.position.z-Math.sin(this.heading)*side
      }
      if(this.city.isBlocked(x,z,.75))return false
      hero.position.set(x,0,z)
      hero.visible=true
      this.driving=false;this.speed=0
      return false
    }
    if(Math.hypot(hero.position.x-this.car.position.x,hero.position.z-this.car.position.z)>8)return false
    this.driving=true;hero.visible=false;this.speed=0
    return true
  }
  update(dt, input, hero, bounds) {
    if(this.driving){
      const gas=Number(input.has('forward'))-Number(input.has('back'))
      const steer=Number(input.has('left'))-Number(input.has('right'))
      const maxSpeed=input.has('run')?32:22
      this.speed += gas * 18 * dt
      this.speed *= Math.exp(-1.3*dt)
      this.speed=THREE.MathUtils.clamp(this.speed,-10,maxSpeed)
      if(Math.abs(this.speed)>.3)this.heading+=steer*dt*1.26*Math.sign(this.speed)*Math.min(1,Math.abs(this.speed)/7)
      const dx=Math.sin(this.heading)*this.speed*dt,dz=-Math.cos(this.heading)*this.speed*dt
      const nextX=THREE.MathUtils.clamp(this.car.position.x+dx,-bounds.width/2+4,bounds.width/2-4)
      const nextZ=THREE.MathUtils.clamp(this.car.position.z+dz,-bounds.height/2+4,bounds.height/2-4)
      if(!this.city.isBlocked(nextX,nextZ,1.45))this.car.position.set(nextX,.16,nextZ)
      else this.speed=0
      this.car.rotation.y=-this.heading
      hero.position.set(this.car.position.x,0,this.car.position.z)
    }
    this.updateTraffic(dt)
  }
  updateTraffic(dt) {
    for(const actor of this.traffic){
      let remaining=actor.speed*dt
      let guard=0
      while(remaining>0&&guard++<10){
        const a=actor.path[actor.index],b=actor.path[actor.index+1]
        if(!a||!b)break
        const len=Math.hypot(b[0]-a[0],b[1]-a[1])
        if(len<.1){actor.index=Math.min(actor.index+1,actor.path.length-2);continue}
        const left=(actor.reverse?actor.t:1-actor.t)*len
        if(remaining<left){actor.t+=(actor.reverse?-1:1)*remaining/len;remaining=0}
        else{
          remaining-=left
          actor.t=actor.reverse?0:1
          if(actor.reverse&&actor.index===0)actor.reverse=false
          else if(!actor.reverse&&actor.index>=actor.path.length-2)actor.reverse=true
          else {actor.index+=actor.reverse?-1:1;actor.t=actor.reverse?1:0}
        }
      }
      const p=getPose(actor.path,actor.index,actor.t)
      actor.root.position.set(p.x,.16,p.z)
      actor.root.rotation.y=-p.heading+(actor.reverse?Math.PI:0)
    }
  }
  getSpeedText(){return `${Math.round(Math.abs(this.speed)*3.6)} km/h`}
}
