import * as THREE from 'three'
import {validRoadRoutes} from './road-graph.js'

/** Deterministic lightweight pedestrians following the supplied real road segments. */
export class CityLife {
  constructor(scene,data,city,mobile=false) {
    this.scene=scene;this.city=city
    const routes=validRoadRoutes(data)
    this.people=[]
    const count=mobile?38:95
    for(let i=0;i<count;i++){
      if(!routes.length)break
      const r=routes[(i*37+11)%routes.length]
      const seg=(i*5+3)%(r.path.length-1)
      const a=r.path[seg],b=r.path[seg+1]
      const d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<6||d>400)continue
      const nx=-(b[1]-a[1])/d,nz=(b[0]-a[0])/d
      const offset=(i%2?1:-1)*(r.kind==='primary'?9:6)
      const mx=(a[0]+b[0])/2+nx*offset,mz=(a[1]+b[1])/2+nz*offset
      if(city.isBlocked(mx,mz,.75))continue
      this.people.push({a,b,offset,nx,nz,t:.2+(i%7)*.095,reverse:i%3===0,speed:.7+(i%5)*.18})
    }
    const skin=new THREE.MeshStandardMaterial({color:'#bd9779',roughness:.9})
    const cloth=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1})
    this.bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.31,.8,3,6),cloth,this.people.length)
    this.heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.26,1),skin,this.people.length)
    this.bodies.frustumCulled=false;this.heads.frustumCulled=false
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.tmp=new THREE.Object3D()
    this.people.forEach((p,i)=>this.bodies.setColorAt(i,new THREE.Color(['#936e53','#53747b','#a05c3f','#83946d','#b7a27c'][i%5])))
    if(this.bodies.instanceColor)this.bodies.instanceColor.needsUpdate=true
    scene.add(this.bodies,this.heads)
    this.tick=0
  }
  update(dt) {
    this.tick+=dt
    const o=this.tmp
    for(let i=0;i<this.people.length;i++){
      const p=this.people[i],a=p.a,b=p.b
      const d=Math.hypot(b[0]-a[0],b[1]-a[1])
      if(d<.01)continue
      p.t+=(p.reverse?-1:1)*p.speed*dt/d
      if(p.t>=1){p.t=1;p.reverse=true}
      if(p.t<=0){p.t=0;p.reverse=false}
      const x=a[0]+(b[0]-a[0])*p.t+p.nx*p.offset
      const z=a[1]+(b[1]-a[1])*p.t+p.nz*p.offset
      const bob=.035*Math.sin(this.tick*6+i)
      o.position.set(x,1.24+bob,z);o.rotation.set(0,Math.atan2(b[0]-a[0],-(b[1]-a[1])),0);o.scale.set(1,1,1);o.updateMatrix();this.bodies.setMatrixAt(i,o.matrix)
      o.position.y=2.37+bob;o.updateMatrix();this.heads.setMatrixAt(i,o.matrix)
    }
    this.bodies.instanceMatrix.needsUpdate=true;this.heads.instanceMatrix.needsUpdate=true
  }
}
