import * as THREE from 'three'
import { hashNumber } from './road-graph.js'

/** Dynamic facade instancing. OSM has footprints, NOT surveyed window/door placement. */
export class FacadeSystem {
  constructor(scene, buildings, mobile=false) {
    this.mobile=mobile
    this.quality=mobile?'low':'balanced'
    this.grid=new Map()
    this.cell=120
    for(const b of buildings){
      const ring=b.ring||[]
      if(ring.length<3)continue
      const cx=ring.reduce((t,p)=>t+p[0],0)/ring.length
      const cz=ring.reduce((t,p)=>t+p[1],0)/ring.length
      const key=this.key(cx,cz)
      if(!this.grid.has(key))this.grid.set(key,[])
      this.grid.get(key).push({b,cx,cz})
    }
    const windowMat=new THREE.MeshStandardMaterial({color:'#bfd1d2',emissive:'#35506a',emissiveIntensity:.23,roughness:.33,metalness:.18,side:THREE.DoubleSide})
    const doorMat=new THREE.MeshStandardMaterial({color:'#7c5141',roughness:.76,side:THREE.DoubleSide})
    this.windows=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,.06),windowMat,3800)
    this.doors=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,.09),doorMat,440)
    this.windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.doors.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.windows.frustumCulled=false; this.doors.frustumCulled=false
    this.windows.count=0;this.doors.count=0
    this.windows.name='Instanced approximate windows';this.doors.name='Instanced approximate doorways'
    scene.add(this.windows,this.doors)
    this.tmp=new THREE.Object3D()
    this.windowColors=['#92b2bd','#b8c6bb','#d1ba8c','#536f7a','#b8d0d1'].map(x=>new THREE.Color(x))
    this.lastX=Infinity;this.lastZ=Infinity;this.lastQuality='';this.lastAt=0
  }
  key(x,z){return `${Math.floor(x/this.cell)},${Math.floor(z/this.cell)}`}
  setQuality(q){this.quality=q;this.lastX=Infinity}
  addInstance(inst,x,y,z,w,h,yaw,color=null) {
    if(inst.count>=inst.instanceMatrix.count)return
    const i=inst.count++
    const tmp=this.tmp
    tmp.position.set(x,y,z);tmp.rotation.set(0,yaw,0);tmp.scale.set(w,h,1);tmp.updateMatrix()
    inst.setMatrixAt(i,tmp.matrix)
    if(color && inst===this.windows)inst.setColorAt(i,color)
  }
  update(x,z,now) {
    if(Math.hypot(this.lastX-x,this.lastZ-z)<22 && now-this.lastAt<1400 && this.lastQuality===this.quality)return
    this.lastAt=now;this.lastX=x;this.lastZ=z;this.lastQuality=this.quality
    this.windows.count=0;this.doors.count=0
    const radius=this.quality==='high'?190:this.quality==='low'?95:145
    const budget=this.quality==='high'?3400:this.quality==='low'?650:2000
    const doorBudget=this.quality==='high'?390:this.quality==='low'?90:250
    const distanceCells=Math.ceil(radius/this.cell)
    const cx=Math.floor(x/this.cell),cz=Math.floor(z/this.cell)
    for(let dx=-distanceCells;dx<=distanceCells;dx++)for(let dz=-distanceCells;dz<=distanceCells;dz++){
      for(const item of this.grid.get(`${cx+dx},${cz+dz}`)||[]){
        if(this.windows.count>=budget && this.doors.count>=doorBudget)break
        const {b}=item
        if((item.cx-x)**2+(item.cz-z)**2>radius*radius)continue
        const height=Number(b.height)||7
        const ring=b.ring
        if(height<2.6||ring.length>70)continue
        const edges=[]
        for(let i=0;i<ring.length;i++){
          const a=ring[i],c=ring[(i+1)%ring.length],len=Math.hypot(c[0]-a[0],c[1]-a[1])
          if(len>3.1 && len<160)edges.push({a,c,len})
        }
        edges.sort((a,b)=>b.len-a.len)
        if(!edges.length)continue
        const hash=hashNumber(b.id)
        const floors=Math.min(5,Math.max(1,Math.floor((height-1)/3)))
        for(const [ei,edge] of edges.slice(0, this.quality==='low'?1:3).entries()){
          if(this.windows.count>=budget)break
          const dx=edge.c[0]-edge.a[0],dz=edge.c[1]-edge.a[1]
          let nx=dz/edge.len,nz=-dx/edge.len
          const midx=(edge.a[0]+edge.c[0])/2,midz=(edge.a[1]+edge.c[1])/2
          if((midx-item.cx)*nx+(midz-item.cz)*nz<0){nx=-nx;nz=-nz}
          const yaw=Math.atan2(nx,nz)
          const cols=Math.min(8,Math.max(1,Math.floor(edge.len/3.3)))
          for(let floor=0;floor<floors;floor++){
            for(let k=0;k<cols;k++){
              if(this.windows.count>=budget)break
              if((hash+floor*7+k*11+ei*3)%13===0)continue
              const t=(k+.5)/cols
              this.addInstance(this.windows,edge.a[0]+dx*t+nx*.075,
                Math.min(height-.7,2.2+floor*3.0),edge.a[1]+dz*t+nz*.075,
                Math.min(1.22,edge.len/cols*.55),1.22,yaw,this.windowColors[(hash+floor+k)%this.windowColors.length])
            }
          }
        }
        if(this.doors.count<doorBudget){
          const e=edges[0],dx=e.c[0]-e.a[0],dz=e.c[1]-e.a[1]
          let nx=dz/e.len,nz=-dx/e.len
          if(((e.a[0]+e.c[0])/2-item.cx)*nx+((e.a[1]+e.c[1])/2-item.cz)*nz<0){nx=-nx;nz=-nz}
          this.addInstance(this.doors,(e.a[0]+e.c[0])/2+nx*.09,1.15,(e.a[1]+e.c[1])/2+nz*.09,1.32,2.25,Math.atan2(nx,nz))
        }
      }
    }
    this.windows.instanceMatrix.needsUpdate=true;this.doors.instanceMatrix.needsUpdate=true
    if(this.windows.instanceColor)this.windows.instanceColor.needsUpdate=true
  }
}
