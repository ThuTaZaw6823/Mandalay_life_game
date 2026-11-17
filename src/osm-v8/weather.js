import * as THREE from 'three'

/** Small local particle rain effect; it is a visual effect, not live weather. */
export class WeatherSystem {
  constructor(scene,mobile=false) {
    this.enabled=false
    this.count=mobile?240:820
    const positions=new Float32Array(this.count*3)
    this.seed=[]
    for(let i=0;i<this.count;i++){
      const x=Math.sin(i*96.3)*42,z=Math.cos(i*53.7)*42,y=1+(i*7.9%32)
      positions.set([x,y,z],i*3)
      this.seed.push((i%5+1)*.32)
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
    this.points=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#9bc9e2',transparent:true,opacity:.75,size:.19,depthWrite:false}))
    this.points.visible=false;this.points.frustumCulled=false
    scene.add(this.points)
  }
  toggle(){this.enabled=!this.enabled;this.points.visible=this.enabled;return this.enabled}
  update(dt,x,z) {
    if(!this.enabled)return
    this.points.position.set(x,0,z)
    const p=this.points.geometry.attributes.position
    for(let i=0;i<this.count;i++){
      let y=p.getY(i)-dt*(16+this.seed[i]*9)
      if(y<.5)y+=32
      p.setY(i,y)
    }
    p.needsUpdate=true
  }
}
