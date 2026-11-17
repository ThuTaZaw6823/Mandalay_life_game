import * as THREE from 'three'
import {roadWidth} from './osm-world.js'

/** Fictional street furniture along mapped roads — locations are NOT from OSM tags. */
export function createStreetFurniture(scene, data, city, mobile=false) {
  const placements=[]
  const limit=mobile?90:220
  for(const r of data.roads) {
    if(!['primary','secondary','tertiary','residential'].includes(r.kind))continue
    for(let i=1;i<r.path.length;i++){
      const a=r.path[i-1],b=r.path[i],dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz)
      if(d<20||d>475)continue
      const nx=-dz/d,nz=dx/d
      for(let t=23;t<d;t+=65){
        const sign=placements.length%2?1:-1
        const x=a[0]+dx*t/d+nx*(roadWidth(r.kind)*.5+4.6)*sign
        const z=a[1]+dz*t/d+nz*(roadWidth(r.kind)*.5+4.6)*sign
        if(Math.abs(x)>data.sizeMeters.width/2||Math.abs(z)>data.sizeMeters.height/2)continue
        if(!city.isBlocked(x,z,1.1))placements.push({x,z})
        if(placements.length>=limit)break
      }
      if(placements.length>=limit)break
    }
    if(placements.length>=limit)break
  }
  const poleMat=new THREE.MeshStandardMaterial({color:'#636d64',metalness:.35,roughness:.58})
  const lightMat=new THREE.MeshStandardMaterial({color:'#ffe1a7',emissive:'#ffc46f',emissiveIntensity:1.4,roughness:.3})
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.17,5.7,6),poleMat,placements.length)
  const lamps=new THREE.InstancedMesh(new THREE.BoxGeometry(1.05,.18,.38),lightMat,placements.length)
  const tmp=new THREE.Object3D()
  for(let i=0;i<placements.length;i++){
    const {x,z}=placements[i]
    tmp.position.set(x,2.85,z);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();poles.setMatrixAt(i,tmp.matrix)
    tmp.position.set(x+.45,5.55,z);tmp.updateMatrix();lamps.setMatrixAt(i,tmp.matrix)
  }
  poles.instanceMatrix.needsUpdate=true;lamps.instanceMatrix.needsUpdate=true
  poles.frustumCulled=false;lamps.frustumCulled=false
  poles.name='Fictional streetlights — decorative';lamps.name='Emissive LED streetlight heads'
  scene.add(poles,lamps)
  return {count:placements.length,poles,lamps}
}
