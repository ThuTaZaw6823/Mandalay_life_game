import * as THREE from 'three'
import {nearestDriveableRoad} from './road-graph.js'

const SAVE='mandalay-life-v8.1-preview'
export class DeliveryMission {
  constructor(scene,data,spawn) {
    this.data=data
    this.origin=spawn
    let saved={}
    try{saved=JSON.parse(localStorage.getItem(SAVE)||'{}')}catch{}
    this.coins=Number.isFinite(saved.coins)?saved.coins:100
    this.delivered=Number.isFinite(saved.delivered)?saved.delivered:0
    this.phase='pickup'
    this.pickup=nearestDriveableRoad(data,spawn[0]+85,spawn[1]-60)
    this.drop=nearestDriveableRoad(data,spawn[0]-100,spawn[1]+115)
    this.pickupMarker=this.marker('#e9b75d')
    this.dropMarker=this.marker('#65b3a7')
    scene.add(this.pickupMarker,this.dropMarker)
    this.updateMarkers()
  }
  marker(color){
    const group=new THREE.Group()
    const m=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false})
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.17,6,20),m)
    ring.rotation.x=Math.PI/2;ring.position.y=.35;group.add(ring)
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.65,1.3,7),m)
    arrow.position.y=3.9;arrow.rotation.x=Math.PI;group.add(arrow)
    return group
  }
  updateMarkers(){
    this.pickupMarker.position.set(this.pickup.x,0,this.pickup.z)
    this.dropMarker.position.set(this.drop.x,0,this.drop.z)
    this.pickupMarker.visible=this.phase==='pickup'
    this.dropMarker.visible=this.phase==='dropoff'
  }
  action(x,z){
    const goal=this.phase==='pickup'?this.pickup:this.drop
    if(Math.hypot(x-goal.x,z-goal.z)>13)return false
    if(this.phase==='pickup')this.phase='dropoff'
    else{
      this.coins+=35;this.delivered++;this.phase='pickup'
      this.drop=nearestDriveableRoad(this.data,x+(-1)**this.delivered*130,z+75)
      this.pickup=nearestDriveableRoad(this.data,x+(-1)**this.delivered*95,z-105)
      try{localStorage.setItem(SAVE,JSON.stringify({coins:this.coins,delivered:this.delivered}))}catch{}
    }
    this.updateMarkers()
    return true
  }
  update(t){
    this.pickupMarker.position.y=.22+Math.sin(t*.003)*.23
    this.dropMarker.position.y=.22+Math.sin(t*.003)*.23
  }
  text(x,z){
    const goal=this.phase==='pickup'?this.pickup:this.drop
    const dist=Math.round(Math.hypot(goal.x-x,goal.z-z))
    return `${this.phase==='pickup'?'Collect parcel':'Deliver parcel'} · ${dist}m · ${this.coins} coins`
  }
}
