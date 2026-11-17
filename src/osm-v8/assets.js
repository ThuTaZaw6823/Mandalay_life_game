import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {lonLatToWorld} from './geo.js'

/** Place opt-in GLB assets without inventing heritage building coordinates. */
export async function loadBlenderAssets(scene, data, city, spawn, base=import.meta.env.BASE_URL) {
  const response=await fetch(`${base}data/model-placements.json`)
  if(!response.ok)return {loaded:0,errors:[`placements.json HTTP ${response.status}`]}
  const placements=await response.json()
  if(!Array.isArray(placements))throw new Error('model-placements.json must be an array')
  const loader=new GLTFLoader()
  let loaded=0
  const errors=[]
  for(const asset of placements){
    if(!/^models\/[a-z0-9._/-]+\.glb$/i.test(asset.file||'')||asset.file.includes('..'))continue
    let pos
    if(asset.anchor==='spawn'){
      const [dx,dy,dz]=asset.offset||[10,0,10]
      pos={x:spawn[0]+dx,y:dy,z:spawn[1]+dz}
      if(city.isBlocked(pos.x,pos.z,1.9)){
        let found=false
        for(const dist of [12,17,24,30,38]){
          for(let k=0;k<12;k++){
            const theta=k*Math.PI/6
            const x=spawn[0]+Math.cos(theta)*dist,z=spawn[1]+Math.sin(theta)*dist
            if(!city.isBlocked(x,z,2)){pos.x=x;pos.z=z;found=true;break}
          }
          if(found)break
        }
        if(!found)continue
      }
    } else if(Number.isFinite(asset.lon)&&Number.isFinite(asset.lat)) {
      const projected=lonLatToWorld(asset.lon,asset.lat,data.center)
      pos={...projected,y:0}
    } else continue
    try {
      const gltf=await loader.loadAsync(`${base}${asset.file}`)
      gltf.scene.position.set(pos.x,pos.y||0,pos.z)
      gltf.scene.rotation.y=Number(asset.rotationY)||0
      const scale=Math.max(.05,Math.min(35,Number(asset.scale)||1))
      gltf.scene.scale.setScalar(scale)
      gltf.scene.traverse(obj=>{if(obj.isMesh){obj.castShadow=false;obj.receiveShadow=true}})
      gltf.scene.name=`Blender / glTF: ${asset.file}`
      scene.add(gltf.scene);loaded++
    }catch(error){errors.push(`${asset.file}: ${error.message}`)}
  }
  return {loaded,errors}
}
